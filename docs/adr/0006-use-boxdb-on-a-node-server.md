# Use BoxDB on a TypeScript Node.js server

Use TypeScript, Node.js, BoxDB and tRPC for the server and typed client/server transport, as confirmed by the user, who also maintains BoxDB and can add missing logical types. Server persistence and client offline storage are separate decisions: clients use platform adapters, and tRPC transports application-defined synchronisation rather than supplying it. This accepts BoxDB integration and version-compatibility work while retaining the requested server database.
