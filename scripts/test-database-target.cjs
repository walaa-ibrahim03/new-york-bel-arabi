// Pure preflight validation. Does not read .env, connect, migrate, seed or log URLs.
function validateTestDatabaseTarget(env) {
  const fail = () => { throw new Error('Test database target is missing, unapproved, or does not match the independent test endpoint.'); };
  if (env.TEST_PROJECT_APPROVED !== 'true' || !env.TEST_DATABASE_URL ||
      !env.TEST_DATABASE_HOST || !env.TEST_DATABASE_NAME?.endsWith('_test')) fail();
  let url;
  try { url = new URL(env.TEST_DATABASE_URL); } catch { fail(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password ||
      url.hostname !== env.TEST_DATABASE_HOST || !url.hostname.startsWith('ep-') ||
      !url.hostname.endsWith('.neon.tech') || url.hostname.includes('-pooler.') ||
      url.pathname !== `/${env.TEST_DATABASE_NAME}` || url.searchParams.get('sslmode') !== 'require' || url.hash) fail();
  // Reject options which could alter the server or database target.
  for (const key of url.searchParams.keys()) if (!['sslmode', 'channel_binding', 'connect_timeout'].includes(key)) fail();
  if (env.DATABASE_URL) {
    try {
      const production = new URL(env.DATABASE_URL);
      const endpoint = (host) => host.replace('-pooler.', '.');
      if (endpoint(production.hostname) === endpoint(url.hostname)) fail();
    } catch (error) {
      if (error?.message?.startsWith('Test database target')) throw error;
      // No valid production URL is needed; independently confirmed test host is mandatory.
    }
  }
  return { url: url.href, host: url.hostname, database: env.TEST_DATABASE_NAME };
}
module.exports = { validateTestDatabaseTarget };
