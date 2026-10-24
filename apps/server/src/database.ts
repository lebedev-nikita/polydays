import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { BoxDB, MigrationSet, type TransactionHandle } from "@boxdb/client";
import {
  buildWidgetProjection,
  decodeDocument,
  systemNow,
  validateCalendar,
  validateTask,
  validateSeries,
  type Document,
} from "@polydays/core";
import {
  Conflict,
  entityId,
  mergeOperation,
  type SyncRequest,
  type SyncResponse,
  type Versioned,
} from "@polydays/sync";
import { Context, Effect, Layer, Schema } from "effect";
import { prepareCommand, type AppCommand } from "./commands.ts";

export class DatabaseError extends Schema.TaggedError<DatabaseError>()("DatabaseError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}
const DocumentRow = Schema.Struct({ body: Schema.String, revision: Schema.BigInt });
const ChangeRow = Schema.Struct({ seq: Schema.BigInt, body: Schema.String });
const OperationRow = Schema.Struct({ result: Schema.String });
const OperationResult = Schema.Union([
  Schema.Struct({ accepted: Schema.Literal(true) }),
  Schema.Struct({ accepted: Schema.Literal(false), conflict: Conflict }),
]);
const parseResult = (text: string) => Schema.decodeUnknownSync(OperationResult)(JSON.parse(text));
const parseDocument = (text: string) => decodeDocument(JSON.parse(text));

export async function openDatabase(path: string): Promise<BoxDB> {
  if (path !== ":memory:") await mkdir(dirname(path), { recursive: true });
  const db = await BoxDB.open(path, { busyTimeoutMs: 5000, transactionTimeoutMs: 15000 });
  try {
    const migrations = await MigrationSet.read(
      new URL("../../../db/migrations", import.meta.url).pathname,
    );
    await migrations.up(db);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export class Database extends Context.Service<
  Database,
  {
    readonly client: BoxDB;
    exchange(userId: string, request: SyncRequest): Effect.Effect<SyncResponse, DatabaseError>;
    snapshot(userId: string): Effect.Effect<ReadonlyArray<Versioned>, DatabaseError>;
    command(userId: string, command: AppCommand): Effect.Effect<unknown, DatabaseError>;
  }
>()("polydays/server/Database") {
  static layer(path: string) {
    return Layer.effect(
      Database,
      Effect.gen(function* () {
        const db = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => openDatabase(path),
            catch: (cause) =>
              new DatabaseError({ message: "Не удалось открыть базу данных.", cause }),
          }),
          (client) => Effect.promise(() => client.close()),
        );
        const exchange = Effect.fn("Database.exchange")((userId: string, request: SyncRequest) =>
          Effect.tryPromise({
            try: () => exchangeDatabase(db, userId, request),
            catch: (cause) =>
              new DatabaseError({ message: "Не удалось синхронизировать данные.", cause }),
          }),
        );
        const snapshot = (userId: string) =>
          Effect.tryPromise({
            try: () => snapshotDatabase(db, userId),
            catch: (cause) => new DatabaseError({ message: "Не удалось прочитать данные.", cause }),
          });
        const command = (userId: string, command: AppCommand) =>
          Effect.tryPromise({
            try: () => commandDatabase(db, userId, command),
            catch: (cause) =>
              new DatabaseError({
                message: cause instanceof Error ? cause.message : "Не удалось сохранить команду.",
                cause,
              }),
          });
        return Database.of({ client: db, exchange, snapshot, command });
      }),
    );
  }
}

export async function exchangeDatabase(
  db: BoxDB,
  userId: string,
  request: SyncRequest,
): Promise<SyncResponse> {
  await using tx = await db.begin();
  const response = await exchangeTransaction(tx, userId, request);
  await tx.commit();
  return response;
}

async function exchangeTransaction(
  tx: TransactionHandle,
  userId: string,
  request: SyncRequest,
): Promise<SyncResponse> {
  if (request.operations.length > 100 || request.cursor < 0)
    throw new Error("Недопустимый размер запроса синхронизации.");
  const acknowledged: string[] = [];
  const conflicts: Array<typeof Conflict.Type> = [];
  let calendar: Extract<Document, { kind: "calendar" }>["data"] | null = null;
  const calendarRow =
    await tx.query`SELECT body, revision FROM polydays_documents WHERE user_id = ${userId} AND id = ${"calendar:calendar"}`.get();
  if (calendarRow) {
    const parsed = parseDocument(Schema.decodeUnknownSync(DocumentRow)(calendarRow).body);
    if (parsed.kind === "calendar") calendar = parsed.data;
  }
  for (const operation of request.operations) {
    const existingResult =
      await tx.query`SELECT result FROM polydays_operations WHERE user_id = ${userId} AND id = ${operation.id}`.get();
    if (existingResult) {
      const result = parseResult(Schema.decodeUnknownSync(OperationRow)(existingResult).result);
      if (result.accepted) acknowledged.push(operation.id);
      else conflicts.push(result.conflict);
      continue;
    }
    const id = entityId(operation.entity);
    const remoteRow =
      await tx.query`SELECT body, revision FROM polydays_documents WHERE user_id = ${userId} AND id = ${id}`.get();
    const remote = remoteRow
      ? parseDocument(Schema.decodeUnknownSync(DocumentRow)(remoteRow).body)
      : null;
    const result = mergeOperation(remote, operation);
    if (!result.ok) {
      const conflict = {
        id: operation.id,
        entityId: id,
        fields: result.fields,
        local: operation.entity,
        remote,
      };
      conflicts.push(conflict);
      await tx.query`INSERT INTO polydays_operations(user_id, id, result) VALUES(${userId}, ${operation.id}, ${JSON.stringify({ accepted: false, conflict })})`.run();
      continue;
    }
    const document = result.document;
    if (document.kind === "calendar") calendar = validateCalendar(document.data);
    if (document.kind === "task") {
      if (!calendar) throw new Error("Перед задачами необходимо сохранить расписание.");
      validateTask(document.data, calendar);
    }
    if (document.kind === "series") {
      if (!calendar) throw new Error("Перед сериями необходимо сохранить расписание.");
      validateSeries(document.data, calendar);
    }
    const body = JSON.stringify(document);
    const changed =
      await tx.query`INSERT INTO polydays_changes(user_id, entity_id, body) VALUES(${userId}, ${id}, ${body})`.run();
    await tx.query`INSERT INTO polydays_documents(user_id, id, kind, body, revision) VALUES(${userId}, ${id}, ${document.kind}, ${body}, ${changed.lastInsertRowid}) ON CONFLICT(user_id, id) DO UPDATE SET body=excluded.body, revision=excluded.revision`.run();
    if (document.kind === "calendar") {
      await tx.query`DELETE FROM polydays_schedule_slots WHERE user_id = ${userId}`.run();
      for (const version of document.data.versions)
        for (const slot of version.slots) {
          await tx.query`INSERT INTO polydays_schedule_slots(user_id, version_id, slot_id, effective_date, name, starts_at, ends_at, time_zone) VALUES(${userId}, ${version.id}, ${slot.id}, ${version.from}, ${slot.name}, ${slot.start + ":00"}, ${slot.end + ":00"}, ${version.timeZone})`.run();
        }
    }
    acknowledged.push(operation.id);
    await tx.query`INSERT INTO polydays_operations(user_id, id, result) VALUES(${userId}, ${operation.id}, ${JSON.stringify({ accepted: true })})`.run();
  }
  const rows = Schema.decodeUnknownSync(Schema.Array(ChangeRow))(
    await tx.query`SELECT seq, body FROM polydays_changes WHERE user_id = ${userId} AND seq > ${request.cursor} ORDER BY seq LIMIT ${501}`,
  );
  const page = rows.slice(0, 500);
  const snapshot = Schema.decodeUnknownSync(Schema.Array(Schema.Struct({ body: Schema.String })))(
    await tx.query`SELECT body FROM polydays_documents WHERE user_id = ${userId}`,
  );
  const response: SyncResponse = {
    acknowledged,
    conflicts,
    changes: page.map((row) => ({ document: parseDocument(row.body), revision: Number(row.seq) })),
    cursor: Number(page.at(-1)?.seq ?? BigInt(request.cursor)),
    hasMore: rows.length > 500,
    widget: buildWidgetProjection(
      snapshot.map((row) => parseDocument(row.body)),
      systemNow(),
    ),
  };
  return response;
}

export async function snapshotDatabase(
  db: BoxDB | TransactionHandle,
  userId: string,
): Promise<ReadonlyArray<Versioned>> {
  const rows = Schema.decodeUnknownSync(Schema.Array(DocumentRow))(
    await db.query`SELECT body, revision FROM polydays_documents WHERE user_id = ${userId}`,
  );
  return rows.map((row) => ({ document: parseDocument(row.body), revision: Number(row.revision) }));
}

export async function commandDatabase(
  db: BoxDB,
  userId: string,
  command: AppCommand,
): Promise<unknown> {
  await using tx = await db.begin();
  const input = JSON.stringify(command);
  const saved =
    await tx.query`SELECT input, result FROM polydays_commands WHERE user_id = ${userId} AND id = ${command.requestId}`.get();
  if (saved) {
    const row = Schema.decodeUnknownSync(
      Schema.Struct({ input: Schema.String, result: Schema.String }),
    )(saved);
    if (row.input !== input) throw new Error("Этот requestId уже использован для другой команды.");
    await tx.commit();
    return JSON.parse(row.result);
  }
  const records = await snapshotDatabase(tx, userId);
  const now = systemNow();
  const changes = prepareCommand(records, command, now);
  // A structural command may transfer more than one sync page of tasks.
  for (let offset = 0; offset < changes.length; offset += 100) {
    const response = await exchangeTransaction(tx, userId, {
      cursor: 0,
      operations: changes.slice(offset, offset + 100).map((entity, index) => ({
        id: `mcp:${command.requestId}:${offset + index}`,
        entity,
        base: records.find((row) => entityId(row.document) === entityId(entity))?.document ?? null,
        at: now,
      })),
    });
    if (response.conflicts.length)
      throw new Error(
        "Данные изменились. Прочитайте их снова и повторите команду с новым requestId.",
      );
  }
  const updated = await snapshotDatabase(tx, userId);
  const result = {
    requestId: command.requestId,
    changes: updated.filter((row) =>
      changes.some((entity) => entityId(entity) === entityId(row.document)),
    ),
  };
  await tx.query`INSERT INTO polydays_commands(user_id, id, input, result) VALUES(${userId}, ${command.requestId}, ${input}, ${JSON.stringify(result)})`.run();
  await tx.commit();
  return result;
}
