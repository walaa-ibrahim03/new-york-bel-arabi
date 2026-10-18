/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test/preload scripts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { validateTestDatabaseTarget } = require('../scripts/test-database-target.cjs');
const fixtures = require('./fixtures/phase-one.json');

test('new migration only adds the eight expected columns', () => {
  const sql = fs.readFileSync('prisma/migrations/20261015160000_original_text_and_review/migration.sql', 'utf8').replace(/--[^\n]*/g, '').trim();
  assert.match(sql, /^ALTER TABLE "Article"\s+/);
  assert.equal((sql.match(/;/g) ?? []).length, 1);
  assert.equal((sql.match(/ADD COLUMN/g) ?? []).length, 8);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|RENAME|ALTER COLUMN)\b/i);
  for (const column of ['originalTitle','originalSummary','originalContent','reviewedAt','reviewedBy','approvedAt','approvedBy']) {
    assert.match(sql, new RegExp(`ADD COLUMN "${column}" (TEXT|TIMESTAMP\\(3\\))\\s*[,;]`));
  }
  assert.match(sql, /ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;/);
});
test('offline runner masks database credentials and blocks network', () => {
  assert.equal(process.env.DATABASE_URL, 'offline-check-disabled');
  assert.equal(process.env.OPENAI_API_KEY, undefined);
  assert.throws(() => require('node:net').connect(5432, 'localhost'), /disabled/);
  assert.throws(() => fetch('https://example.org'), /disabled/);
});
test('future DB preflight requires separately approved test endpoint without fallback', () => {
  // Fictional credentials; this test only parses URLs, never connects.
  const env = {
    TEST_PROJECT_APPROVED:'true', TEST_DATABASE_HOST:'ep-fixture.us-east-2.aws.neon.tech',
    TEST_DATABASE_NAME:'nyba_test',
    TEST_DATABASE_URL: 'postgresql://' + 'fixture:fixture@' + 'ep-fixture.us-east-2.aws.neon.tech/nyba_test?sslmode=require',
  };
  assert.equal(validateTestDatabaseTarget(env).database, 'nyba_test');
  for (const change of [
    {TEST_PROJECT_APPROVED:''}, {TEST_DATABASE_URL:''}, {TEST_DATABASE_NAME:'production'},
    {TEST_DATABASE_HOST:'ep-other.us-east-2.aws.neon.tech'},
    {DATABASE_URL:env.TEST_DATABASE_URL.replace('ep-fixture.', 'ep-fixture-pooler.')},
    {TEST_DATABASE_URL:env.TEST_DATABASE_URL.replace('sslmode=require', 'sslmode=disable')},
    {TEST_DATABASE_URL:env.TEST_DATABASE_URL + '&host=production.invalid'},
  ]) assert.throws(() => validateTestDatabaseTarget({...env,...change}), /Test database target/);
});
test('synthetic fixtures include translation, duplicate, invalid imports and legacy cases', () => {
  assert.equal(fixtures.rssItems[0].link, fixtures.rssItems[1].link);
  assert.equal(fixtures.legacyArticles.length,3);
  assert.ok(fixtures.legacyArticles.every((article) => !('originalTitle' in article)));
  assert.ok(fixtures.translation.title.includes('للاختبار فقط'));
  assert.ok(fixtures.rssItems.every((item)=>item.title.startsWith('TEST ONLY')));
});

test('local env verifier requires exact test DB and confirmed project metadata', () => {
  const { validateTestEnv } = require('../scripts/check-test-env.cjs');
  const config = {
    DATABASE_URL: 'postgresql://' + 'fixture:fixture@' + 'ep-fixture.us-east-2.aws.neon.tech/nyba_test?sslmode=require',
    TEST_DATABASE_HOST: 'ep-fixture.us-east-2.aws.neon.tech',
    TEST_DATABASE_NAME: 'nyba_test', TEST_PROJECT_NAME: 'new-york-bel-arabi-test',
    TEST_PROJECT_ID: 'fictional-project-123', TEST_PROJECT_APPROVED: 'true',
  };
  assert.equal(validateTestEnv(config).database, 'nyba_test');
  for (const changes of [
    {DATABASE_URL: ''}, {TEST_DATABASE_NAME: 'other_test'},
    {TEST_PROJECT_NAME: 'production'}, {TEST_PROJECT_ID: ''},
    {TEST_PROJECT_APPROVED: 'false'}, {TEST_DATABASE_HOST: 'ep-other.us-east-2.aws.neon.tech'},
  ]) assert.throws(() => validateTestEnv({...config, ...changes}));
});

test('browser launcher excludes inherited secrets and requires separate test OAuth', () => {
  const {missingAuth,previewEnvironment}=require('../scripts/preview-test-site.cjs');
  assert.equal(missingAuth({}).length,4);
  const config={TEST_ADMIN_EMAIL:'preview@example.org',TEST_AUTH_GOOGLE_ID:'fictional.apps.googleusercontent.com',TEST_AUTH_GOOGLE_SECRET:'fictional-client-value',TEST_AUTH_SECRET:'fictional-session-value-for-tests-only'};
  assert.deepEqual(missingAuth(config),[]);
  const env=previewEnvironment(config,{url:'test-only-target',host:'test-only-host'},{PATH:'/example',DATABASE_URL:'must-not-inherit',OPENAI_API_KEY:'must-not-inherit',AUTH_SECRET:'must-not-inherit',NODE_OPTIONS:'must-not-inherit'});
  assert.equal(env.DATABASE_URL,'test-only-target');
  assert.equal(env.NYBA_TEST_DATABASE_URL,'test-only-target');
  assert.equal(env.AUTH_SECRET,config.TEST_AUTH_SECRET);
  assert.equal(env.AUTH_GOOGLE_ID,config.TEST_AUTH_GOOGLE_ID);
  assert.equal(env.ADMIN_EMAIL,'preview@example.org');
  assert.equal(env.AUTH_URL,'http://localhost:3100');
  assert.equal(env.OPENAI_API_KEY,undefined);
  assert.equal(env.NODE_OPTIONS,undefined);
});

test('isolated Webpack preview receives compiled Tailwind without changing source design', async () => {
  const path = require('node:path');
  const {prepareSnapshot} = require('../scripts/preview-test-site.cjs');
  const originals = new Map(['app/globals.css','app/page.tsx','next.config.ts'].map(name=>[name,fs.readFileSync(name,'utf8')]));
  const snapshot = await prepareSnapshot();
  try {
    const css=fs.readFileSync(path.join(snapshot,'app/globals.css'),'utf8');
    for(const selector of ['.grid {','.rounded-3xl','.bg-slate-950','.lg\\:grid-cols-','.input-style']) assert.ok(css.includes(selector),selector);
    assert.ok(!css.includes('@tailwind utilities'));
    assert.ok(!css.includes('@theme'));
    assert.equal(fs.readFileSync(path.join(snapshot,'app/page.tsx'),'utf8'),originals.get('app/page.tsx'));
    assert.equal(fs.readFileSync(path.join(snapshot,'next.config.ts'),'utf8'),originals.get('next.config.ts'));
    assert.ok(fs.readFileSync(path.join(snapshot,'app/layout.tsx'),'utf8').includes('import "./globals.css"'));
    assert.ok(!fs.readdirSync(snapshot).some(name=>name.startsWith('.env')));
    for(const [name,content] of originals) assert.equal(fs.readFileSync(name,'utf8'),content);
  } finally {fs.rmSync(snapshot,{recursive:true,force:true});}
});

test('production build preload blocks all environment-file reads', () => {
  const path=require('node:path');
  const os=require('node:os');
  const {spawnSync}=require('node:child_process');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'nyba-build-guard-'));
  const filename=path.join(folder,'.env.synthetic');
  fs.writeFileSync(filename,'DATABASE_URL=fictional-disabled-value\n');
  try {
    const code=`const fs=require('node:fs'); const assert=require('node:assert/strict');
      assert.equal(fs.existsSync(process.argv[1]),false);
      assert.throws(()=>fs.readFileSync(process.argv[1]),{code:'ENOENT'});
      fs.promises.readFile(process.argv[1]).then(()=>process.exit(1),error=>{assert.equal(error.code,'ENOENT');});`;
    const result=spawnSync(process.execPath,['--require',path.resolve('scripts/build-without-database-guard.cjs'),'-e',code,filename],{env:{NODE_ENV:'test'},encoding:'utf8'});
    assert.equal(result.status,0);
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
});
