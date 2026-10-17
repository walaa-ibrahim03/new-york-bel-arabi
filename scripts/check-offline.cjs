/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test/preload scripts. */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2] ?? 'test';
const commands = {
  test: ['--test', 'tests/phase-one.cjs', 'tests/preparation.cjs', 'tests/database-guard.cjs', 'tests/delete-article.cjs', 'tests/admin-intake.cjs', 'tests/news-launch.cjs', 'tests/editor-assistant.cjs'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit'],
};
if (!Object.hasOwn(commands, mode)) {
  console.error('Supported offline checks: test, typecheck.');
  process.exit(1);
}
// Deliberately do not inherit production secrets, NODE_OPTIONS or database URLs.
const env = {};
for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot']) {
  if (process.env[key]) env[key] = process.env[key];
}
env.DATABASE_URL = 'offline-check-disabled';
env.NODE_ENV = 'test';
env.NYBA_NEWS_MODE = 'read-write';
env.NODE_OPTIONS = `--require=${JSON.stringify(path.join(__dirname, 'offline-network-guard.cjs'))}`;
const result = spawnSync(process.execPath, commands[mode], { cwd: root, env, stdio: 'inherit' });
if (result.error) console.error('Offline check could not start.');
process.exit(result.status ?? 1);
