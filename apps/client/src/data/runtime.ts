import { Context, Effect, Layer, ManagedRuntime, Schema } from "effect";
import { storage } from "./storage";
import type { PersistenceAdapter } from "./contract";

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}
export class Persistence extends Context.Service<
  Persistence,
  { readonly adapter: PersistenceAdapter }
>()("polydays/client/Persistence") {}
export const runtime = ManagedRuntime.make(Layer.succeed(Persistence, { adapter: storage }));
export const persist = Effect.fn("client.persist")(
  <A>(work: (adapter: PersistenceAdapter) => Promise<A>) =>
    Persistence.use(({ adapter }) =>
      Effect.tryPromise({
        try: () => work(adapter),
        catch: (cause) =>
          new StorageError({
            message:
              cause instanceof Error
                ? cause.message
                : "Не удалось сохранить изменения на устройстве.",
            cause,
          }),
      }),
    ),
);
