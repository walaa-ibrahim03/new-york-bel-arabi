/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node database administration script. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const { validateTestEnv } = require('./check-test-env.cjs');
const root = path.resolve(__dirname, '..');
const names = [
  '20261012183054_init_articles',
  '20261012184936_add_article_fields',
  '20261015135634_unique_article_source_url',
  '20261015160000_original_text_and_review',
];
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const oldColumns = ['id','title','content','sourceUrl','imageUrl','status','createdAt','publishedAt','borough','category','color','summary'];
const newColumns = ['originalTitle','originalSummary','originalContent','reviewedAt','reviewedBy','approvedAt','approvedBy','revision'];
async function main() {
  const mode = process.argv[2];
  if (!['inspect','apply'].includes(mode)) throw new Error('INVALID_MODE');
  const local = parse(fs.readFileSync(path.join(root, '.env.test.local')));
  const target = validateTestEnv(local);
  if (target.database !== 'nyba_test') throw new Error('TARGET_MISMATCH');
  const migrationRoot = path.join(root, 'prisma/migrations');
  const actual = fs.readdirSync(migrationRoot).filter((name) => fs.statSync(path.join(migrationRoot,name)).isDirectory()).sort();
  if (JSON.stringify(actual) !== JSON.stringify(names)) throw new Error('UNEXPECTED_LOCAL_MIGRATIONS');
  const sql = names.map((name) => fs.readFileSync(path.join(migrationRoot,name,'migration.sql')));
  const { PrismaClient } = require('../app/generated/prisma');
  const client = new PrismaClient({ datasources: { db: { url: target.url } }, log: [] });
  let isolated;
  try {
    async function inspect() {
      return client.$transaction(async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const identity = await tx.$queryRaw`SELECT current_database() AS db, current_setting('transaction_read_only') AS ro`;
        if (identity[0]?.db !== 'nyba_test' || identity[0]?.ro !== 'on') throw new Error('TARGET_MISMATCH');
        const tables = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
        if (tables.some((t) => !['Article','_prisma_migrations'].includes(t.tablename))) throw new Error('UNEXPECTED_TABLES');
        const hasArticle = tables.some((t) => t.tablename === 'Article');
        const history = tables.some((t) => t.tablename === '_prisma_migrations')
          ? await tx.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at, id`
          : [];
        if (history.length > names.length) throw new Error('UNEXPECTED_HISTORY');
        for (let i=0;i<history.length;i++) {
          const item=history[i];
          if (item.migration_name !== names[i] || item.checksum !== hash(sql[i]) || !item.finished_at || item.rolled_back_at || item.applied_steps_count < 1) throw new Error('UNEXPECTED_HISTORY');
        }
        if (hasArticle !== (history.length > 0)) throw new Error('UNTRACKED_SCHEMA');
        const columns = hasArticle ? await tx.$queryRaw`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Article' ORDER BY ordinal_position` : [];
        const expected = history.length === 0 ? [] : history.length === 1 ? oldColumns.slice(0,8) : history.length === 4 ? [...oldColumns,...newColumns] : oldColumns;
        if (JSON.stringify(columns.map(c=>c.column_name).sort()) !== JSON.stringify([...expected].sort())) throw new Error('UNEXPECTED_COLUMNS');
        let rows=[];
        if (hasArticle && history.length >= 2) rows = await tx.$queryRaw`SELECT "id", "title", "content", "sourceUrl", "imageUrl", "status", "createdAt", "publishedAt", "borough", "category", "color", "summary" FROM "Article" ORDER BY "id"`;
        else if (hasArticle) rows = await tx.$queryRaw`SELECT "id", "title", "content", "sourceUrl", "imageUrl", "status", "createdAt", "publishedAt" FROM "Article" ORDER BY "id"`;
        return { history: history.map(h=>h.migration_name), columns, count:rows.length, digest:hash(JSON.stringify(rows)) };
      }, {maxWait:10000,timeout:20000});
    }
    const before=await inspect();
    console.log('PASS: nyba_test identity, confirmed endpoint and migration checksums validated.');
    console.log(JSON.stringify({ applied: before.history, pending:names.slice(before.history.length), existingArticleCount:before.count }));
    if (mode === 'inspect') return;
    // Revalidate local target and server identity immediately before starting the writer.
    const confirmed = validateTestEnv(parse(fs.readFileSync(path.join(root,'.env.test.local'))));
    if (confirmed.url !== target.url || confirmed.host !== target.host) throw new Error('TARGET_CHANGED');
    const again=await inspect();
    if (JSON.stringify(again)!==JSON.stringify(before)) throw new Error('DATABASE_CHANGED');
    isolated=fs.mkdtempSync(path.join(os.tmpdir(),'nyba-test-migrations-'));
    fs.mkdirSync(path.join(isolated,'migrations'));
    for(let i=0;i<names.length;i++) {
      fs.mkdirSync(path.join(isolated,'migrations',names[i]));
      fs.writeFileSync(path.join(isolated,'migrations',names[i],'migration.sql'),sql[i]);
    }
    fs.copyFileSync(path.join(migrationRoot,'migration_lock.toml'),path.join(isolated,'migrations/migration_lock.toml'));
    const schema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8');
    if (!schema.includes('env("DATABASE_URL")') || /directUrl|shadowDatabaseUrl/.test(schema)) throw new Error('UNEXPECTED_DATASOURCE');
    fs.writeFileSync(path.join(isolated,'schema.prisma'),schema.replace('env("DATABASE_URL")','env("NYBA_TEST_DATABASE_URL")'));
    const configPath=path.join(isolated,'prisma.config.ts');
    fs.writeFileSync(configPath,`import { defineConfig, env } from ${JSON.stringify(require.resolve('prisma/config'))};\nexport default defineConfig({schema:"./schema.prisma",migrations:{path:"./migrations"},engine:"classic",datasource:{url:env("NYBA_TEST_DATABASE_URL")}});\n`);
    const env={ NYBA_TEST_DATABASE_URL:target.url, PRISMA_HIDE_UPDATE_MESSAGE:'1', CHECKPOINT_DISABLE:'1' };
    for(const key of ['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot']) if(process.env[key]) env[key]=process.env[key];
    // No inherited DATABASE_URL, dotenv loading, .env files, shell or application config.
    const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--config',configPath],{cwd:isolated,env,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});
    if(result.status!==0 || result.error) throw new Error('MIGRATE_DEPLOY_FAILED');
    const after=await inspect();
    if (after.history.length!==4 || before.count!==after.count || (before.history.length>=2 && before.digest!==after.digest)) throw new Error('POSTCHECK_FAILED');
    for (const name of newColumns) {
      const column=after.columns.find(c=>c.column_name===name);
      if(!column || (name==='revision' ? column.is_nullable!=='NO' || column.column_default!=='0' || column.data_type!=='integer' : column.is_nullable!=='YES' || column.data_type!==(name.endsWith('At')?'timestamp without time zone':'text'))) throw new Error('COLUMN_CHECK_FAILED');
    }
    const integrity=await client.$transaction(async(tx)=>{
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return tx.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='Article' AND indexname='Article_sourceUrl_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%') AS unique_source_index, NOT EXISTS (SELECT 1 FROM "Article" WHERE "revision" IS NULL) AS revisions_valid`;
    });
    if(!integrity[0]?.unique_source_index || !integrity[0]?.revisions_valid) throw new Error('INTEGRITY_FAILED');
    console.log(JSON.stringify({ result:'PASS',appliedNow:names.slice(before.history.length),totalApplied:after.history.length,newColumnsVerified:newColumns,articleCountBefore:before.count,articleCountAfter:after.count,uniqueSourceIndex:true,revisionDefault:0,originalFieldsNullable:true }));
  } finally {
    await client.$disconnect();
    if(isolated) fs.rmSync(isolated,{recursive:true,force:true});
  }
}
main().catch((error)=>{
  const allowed=['INVALID_MODE','TARGET_MISMATCH','UNEXPECTED_LOCAL_MIGRATIONS','UNEXPECTED_TABLES','UNEXPECTED_HISTORY','UNTRACKED_SCHEMA','UNEXPECTED_COLUMNS','TARGET_CHANGED','DATABASE_CHANGED','UNEXPECTED_DATASOURCE','MIGRATE_DEPLOY_FAILED','POSTCHECK_FAILED','COLUMN_CHECK_FAILED','INTEGRITY_FAILED'];
  const code=allowed.includes(error?.message)?error.message:'CONNECTION_OR_CONFIGURATION_FAILED';
  console.error(`FAIL: ${code}. Raw errors and connection details suppressed. Stop for review.`);
  process.exitCode=1;
});
