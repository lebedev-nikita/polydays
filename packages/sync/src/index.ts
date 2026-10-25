import {
  Document,
  WidgetProjection,
  decodeDocument,
  type Document as DomainDocument,
} from "@polydays/core";
import * as Schema from "effect/Schema";

export const Operation = Schema.Struct({
  id: Schema.NonEmptyString,
  entity: Document,
  base: Schema.NullOr(Document),
  at: Schema.Number,
});
export type Operation = typeof Operation.Type;
export const Versioned = Schema.Struct({ document: Document, revision: Schema.Int });
export type Versioned = typeof Versioned.Type;
export const Conflict = Schema.Struct({
  id: Schema.String,
  entityId: Schema.String,
  fields: Schema.Array(Schema.String),
  local: Document,
  remote: Schema.NullOr(Document),
});
export type Conflict = typeof Conflict.Type;
export const SyncRequest = Schema.Struct({
  accountId: Schema.optionalKey(Schema.NonEmptyString),
  operations: Schema.Array(Operation),
  cursor: Schema.Int,
});
export type SyncRequest = typeof SyncRequest.Type;
export const SyncResponse = Schema.Struct({
  acknowledged: Schema.Array(Schema.String),
  conflicts: Schema.Array(Conflict),
  changes: Schema.Array(Versioned),
  cursor: Schema.Int,
  hasMore: Schema.Boolean,
  widget: Schema.optionalKey(Schema.NullOr(WidgetProjection)),
});
export type SyncResponse = typeof SyncResponse.Type;
export const LocalState = Schema.Struct({
  accountId: Schema.String,
  records: Schema.Array(Versioned),
  pending: Schema.Array(Operation),
  conflicts: Schema.Array(Conflict),
  cursor: Schema.Int,
});
export type LocalState = typeof LocalState.Type;
export const decodeLocalState = Schema.decodeUnknownSync(LocalState);
export const decodeSyncResponse = Schema.decodeUnknownSync(SyncResponse);
export const decodeSyncRequest = Schema.decodeUnknownSync(SyncRequest);
export const emptyState = (accountId: string): LocalState => ({
  accountId,
  records: [],
  pending: [],
  conflicts: [],
  cursor: 0,
});
export const entityId = (document: DomainDocument): string =>
  `${document.kind}:${document.data.id}`;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export type MergeResult =
  | { readonly ok: true; readonly document: DomainDocument }
  | { readonly ok: false; readonly fields: ReadonlyArray<string> };

export function mergeOperation(remote: DomainDocument | null, operation: Operation): MergeResult {
  const local = operation.entity;
  const base = operation.base;
  if (base && entityId(base) !== entityId(local))
    throw new Error("Операция ссылается на другую задачу.");
  if (!remote) return { ok: true, document: local };
  if (entityId(remote) !== entityId(local))
    throw new Error("Операция ссылается на другой документ.");
  if (same(remote, local)) return { ok: true, document: remote };
  if (!base) return { ok: false, fields: ["creation"] };
  const old: Record<string, unknown> = { ...base.data };
  const desired: Record<string, unknown> = { ...local.data };
  const existing: Record<string, unknown> = { ...remote.data };
  const changed = Object.keys(desired).filter(
    (key) => key !== "id" && !same(desired[key], old[key]),
  );
  const remoteChanged = Object.keys(existing).filter(
    (key) => key !== "id" && !same(existing[key], old[key]),
  );
  if (local.kind === "calendar" && changed.length && remoteChanged.length)
    return { ok: false, fields: ["versions"] };
  if (
    (changed.includes("deleted") &&
      remoteChanged.length &&
      !same(desired.deleted, existing.deleted)) ||
    (remoteChanged.includes("deleted") &&
      changed.length &&
      !same(desired.deleted, existing.deleted))
  )
    return { ok: false, fields: ["deleted"] };
  const fields = changed.filter(
    (key) =>
      !same(existing[key], old[key]) &&
      !same(existing[key], desired[key]) &&
      !(key === "completedAt" && desired.completed === true && existing.completed === true),
  );
  if (fields.length) return { ok: false, fields };
  const merged = { ...existing };
  for (const key of changed) merged[key] = desired[key];
  if (
    desired.completed === true &&
    existing.completed === true &&
    typeof desired.completedAt === "number" &&
    typeof existing.completedAt === "number"
  )
    merged.completedAt = Math.min(desired.completedAt, existing.completedAt);
  return { ok: true, document: decodeDocument({ kind: local.kind, data: merged }) };
}

export function documents(state: LocalState): ReadonlyArray<DomainDocument> {
  const all = new Map(state.records.map((record) => [entityId(record.document), record.document]));
  for (const conflict of state.conflicts) all.set(conflict.entityId, conflict.local);
  for (const operation of state.pending) {
    const id = entityId(operation.entity);
    const existing = all.get(id);
    if (!existing || !operation.base) {
      all.set(id, operation.entity);
      continue;
    }
    const data: Record<string, unknown> = { ...existing.data };
    const before: Record<string, unknown> = { ...operation.base.data };
    for (const [key, value] of Object.entries(operation.entity.data))
      if (!same(value, before[key])) data[key] = value;
    all.set(id, decodeDocument({ kind: operation.entity.kind, data }));
  }
  return [...all.values()];
}

export function enqueue(
  state: LocalState,
  entity: DomainDocument,
  id: string,
  at: number,
): LocalState {
  const key = entityId(entity);
  if (state.conflicts.some((conflict) => conflict.entityId === key))
    throw new Error("Сначала разрешите конфликт изменений этой задачи.");
  const base = documents(state).find((item) => entityId(item) === key) ?? null;
  if (same(base, entity)) return state;
  return { ...state, pending: [...state.pending, { id, entity, base, at }] };
}

export function acceptResponse(state: LocalState, response: SyncResponse): LocalState {
  const acknowledged = new Set([
    ...response.acknowledged,
    ...response.conflicts.map((conflict) => conflict.id),
  ]);
  const records = new Map(state.records.map((record) => [entityId(record.document), record]));
  for (const change of response.changes) {
    const id = entityId(change.document);
    if ((records.get(id)?.revision ?? -1) < change.revision) records.set(id, change);
  }
  const conflicts = new Map(state.conflicts.map((conflict) => [conflict.id, conflict]));
  for (const conflict of response.conflicts) conflicts.set(conflict.id, conflict);
  return {
    ...state,
    records: [...records.values()],
    pending: state.pending.filter((operation) => !acknowledged.has(operation.id)),
    conflicts: [...conflicts.values()],
    cursor: Math.max(state.cursor, response.cursor),
  };
}

export function resolveConflict(
  state: LocalState,
  conflictId: string,
  choice: "local" | "remote",
  operationId: string,
  at: number,
): LocalState {
  const conflict = state.conflicts.find((item) => item.id === conflictId);
  if (!conflict) throw new Error("Конфликт уже разрешён.");
  const next = { ...state, conflicts: state.conflicts.filter((item) => item.id !== conflictId) };
  if (choice === "remote") return next;
  const operation: Operation = {
    id: operationId,
    entity: conflict.local,
    base: conflict.remote,
    at,
  };
  return { ...next, pending: [...next.pending, operation] };
}
