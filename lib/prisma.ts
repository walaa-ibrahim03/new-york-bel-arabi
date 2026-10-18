import { PrismaClient } from "../app/generated/prisma";
import { requireDatabaseTarget, isNewsReadOnly } from "./database-guard";

const readOperations = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow",
  "findMany", "count", "aggregate", "groupBy",
]);
let verified: { url: string; client: PrismaClient } | undefined;

function safeError(error: unknown): Error {
  const sanitized = new Error("Database operation failed.");
  // Preserve only a Prisma error code needed for duplicate handling; never its raw message.
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code)) {
    Object.assign(sanitized, { code: error.code });
  }
  return sanitized;
}

function verifiedClient(): PrismaClient {
  const url = requireDatabaseTarget(process.env, status => {
    if (!verified || status !== "MATCH") console.info(`[database-guard] ${status}`);
  });
  if (!verified || verified.url !== url) {
    // No client (and no connection) is created until the guard has succeeded.
    try {
      verified = { url, client: new PrismaClient({ datasources: { db: { url } }, log: [] }) };
    } catch (error) { throw safeError(error); }
  }
  return verified.client;
}

// Lazy construction keeps database-free builds possible without bypassing runtime checks.
// In read-only mode only explicit model reads are exposed, inside a DB-enforced
// read-only transaction. Raw SQL and arbitrary transactions fail before reaching Prisma.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    if (typeof key !== "string") return undefined;
    if (key.startsWith("$")) {
      return async (...args: unknown[]) => {
        if (isNewsReadOnly()) throw new Error("Database operation disabled in read-only mode.");
        const client = verifiedClient();
        try {
          const method = Reflect.get(client, key);
          return await Reflect.apply(method, client, args);
        } catch (error) { throw safeError(error); }
      };
    }
    return new Proxy({}, {
      get(_delegate, operation) {
        return async (...args: unknown[]) => {
          if (typeof operation !== "string") throw new Error("Invalid database operation.");
          if (isNewsReadOnly() && !readOperations.has(operation)) throw new Error("Database write disabled in read-only mode.");
          const client = verifiedClient();
          try {
            if (isNewsReadOnly()) {
              return await client.$transaction(async tx => {
                await tx.$executeRaw`SET TRANSACTION READ ONLY`;
                const delegate = Reflect.get(tx, key);
                return await Reflect.apply(Reflect.get(delegate, operation), delegate, args);
              });
            }
            const delegate = Reflect.get(client, key);
            return await Reflect.apply(Reflect.get(delegate, operation), delegate, args);
          } catch (error) { throw safeError(error); }
        };
      },
    });
  },
});
