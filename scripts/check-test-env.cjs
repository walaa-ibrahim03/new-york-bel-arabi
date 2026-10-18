/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS validation script. */
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('dotenv');
const { validateTestDatabaseTarget } = require('./test-database-target.cjs');

function validateTestEnv(config) {
  if (config.TEST_DATABASE_NAME !== 'nyba_test' ||
      config.TEST_PROJECT_NAME !== 'new-york-bel-arabi-test' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.TEST_PROJECT_ID ?? '')) {
    throw new Error('Invalid test project metadata.');
  }
  // Production DATABASE_URL is never inherited or used as a fallback.
  return validateTestDatabaseTarget({
    TEST_DATABASE_URL: config.DATABASE_URL,
    TEST_DATABASE_HOST: config.TEST_DATABASE_HOST,
    TEST_DATABASE_NAME: config.TEST_DATABASE_NAME,
    TEST_PROJECT_APPROVED: config.TEST_PROJECT_APPROVED,
  });
}
if (require.main === module) {
  try {
    // Parse this single file into an object; do not load .env or mutate process.env.
    const config = parse(fs.readFileSync(path.resolve(__dirname, '../.env.test.local')));
    validateTestEnv(config);
    console.log('PASS: nyba_test target matches the manually confirmed test endpoint. No connection was made.');
    console.log('Project ownership must be confirmed in Neon Console; no remote verification was performed.');
  } catch {
    console.error('FAIL: complete and confirm the test-only settings in .env.test.local. No connection was made.');
    process.exitCode = 1;
  }
}
module.exports = { validateTestEnv };
