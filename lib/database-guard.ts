export type GuardEnvironment = Record<string, string | undefined>;
export type GuardStatus = "MATCH" | "MISMATCH" | "UNVERIFIABLE";

// Confirmed directly in Neon Console. b51 contains the digit 1.
const productionHost = "ep-little-hall-b51ufwbz.c-7.us-east-2.aws.neon.tech";
const allowedParameters = new Set([
  "sslmode", "channel_binding", "connect_timeout", "connection_limit",
  "pool_timeout", "pgbouncer", "statement_cache_size", "schema",
]);

export function inspectDatabaseTarget(env: GuardEnvironment): GuardStatus {
  const profile = env.NYBA_DATABASE_PROFILE ?? "production";
  if (!["production", "isolated-test"].includes(profile)) return "UNVERIFIABLE";
  const isolated = profile === "isolated-test";
  if (isolated && (env.NODE_ENV === "production" || env.VERCEL || env.VERCEL_ENV || env.VERCEL_PROJECT_ID)) return "MISMATCH";
  const value = isolated ? env.NYBA_TEST_DATABASE_URL : env.DATABASE_URL;
  if (!value) return "UNVERIFIABLE";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username || !url.password ||
        url.hash || (url.port && url.port !== "5432") ||
        !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) return "MISMATCH";
    const parameters = [...url.searchParams.keys()];
    if (new Set(parameters).size !== parameters.length || parameters.some(key => !allowedParameters.has(key)) ||
        (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public")) return "MISMATCH";
    const canonical = host.replace("-pooler.", ".");
    if (isolated) {
      if (!env.NYBA_TEST_DATABASE_HOST || env.NYBA_TEST_PROJECT_CONFIRMED !== "true") return "UNVERIFIABLE";
      return host === env.NYBA_TEST_DATABASE_HOST && canonical !== productionHost &&
        host.startsWith("ep-") && host.endsWith(".neon.tech") && url.pathname === "/nyba_test" ? "MATCH" : "MISMATCH";
    }
    return canonical === productionHost && url.pathname === "/neondb" ? "MATCH" : "MISMATCH";
  } catch {
    return "UNVERIFIABLE";
  }
}

export function requireDatabaseTarget(
  env: GuardEnvironment = process.env,
  report: (status: GuardStatus) => void = status => console.info(`[database-guard] ${status}`),
): string {
  const status = inspectDatabaseTarget(env);
  report(status);
  if (status !== "MATCH") throw new Error(`Database connection guard: ${status}`);
  return (env.NYBA_DATABASE_PROFILE === "isolated-test" ? env.NYBA_TEST_DATABASE_URL : env.DATABASE_URL)!;
}

export function isNewsReadOnly(env: GuardEnvironment = process.env): boolean {
  // Missing or invalid mode is deliberately read-only, including after promotion.
  return env.NYBA_NEWS_MODE !== "read-write";
}

export function assertNewsOperationAllowed(env: GuardEnvironment = process.env): void {
  if (isNewsReadOnly(env)) throw new Error("News operations are disabled in read-only mode.");
}
