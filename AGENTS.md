# Project contracts

Read [CONTEXT.md](CONTEXT.md) for domain terms and [docs/product.md](docs/product.md) before changing scheduling or task behaviour. Client and server share domain logic in `packages/core`; native widgets consume prepared views and persist explicit commands.

Release Android and macOS together, using the same version and commit. Follow [release instructions](docs/deployment.md#application-releases); publish only when both platform artifacts are verified.

Keep every release candidate in GitHub Release draft status, including after uploading and verifying all platform artifacts.

# Learning more about Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
completely, and follow the links in the file when required.

If you need to learn more about particular Effect APIs and concepts that the
guide does not cover, search through the source code in `node_modules/effect/src`.
