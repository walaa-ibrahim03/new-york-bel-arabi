/* eslint-disable @typescript-eslint/no-require-imports -- Offline source-level integration tests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
function load(file,mocks={}) {
  const filename=path.resolve(file);
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const sandbox={exports:{}};
  new Function('require','module','exports',code)((id)=>{
    if(Object.hasOwn(mocks,id))return mocks[id];
    if(id.startsWith('.'))return load(path.resolve(path.dirname(filename),id+'.ts'),mocks);
    throw new Error('External dependency blocked');
  },sandbox,sandbox.exports);
  return sandbox.exports;
}
const policy=load('lib/database-guard.ts');
const host='ep-little-hall-b51ufwbz.c-7.us-east-2.aws.neon.tech';
const fixtureUrl=(hostname=host,db='neondb')=>'postgresql://'+'fictional:fictional@'+hostname+'/'+db+'?sslmode=require';
async function withEnv(values,work){
  const keys=['DATABASE_URL','NYBA_DATABASE_PROFILE','NYBA_TEST_DATABASE_URL','NYBA_TEST_DATABASE_HOST','NYBA_TEST_PROJECT_CONFIRMED','NYBA_NEWS_MODE','NODE_ENV','VERCEL','VERCEL_ENV','VERCEL_PROJECT_ID'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{for(const k of keys)delete process.env[k];Object.assign(process.env,values);return await work();}
  finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
}
test('guard MATCH for exact direct/pooled production endpoint; no name-only matches',()=>{
  for(const h of [host,host.replace('b51ufwbz.','b51ufwbz-pooler.')]) assert.equal(policy.inspectDatabaseTarget({DATABASE_URL:fixtureUrl(h)}),'MATCH');
  for(const url of [fixtureUrl('ep-other.c-7.us-east-2.aws.neon.tech'),fixtureUrl(host,'nyba_test'),fixtureUrl(host.replace('b51','b5l')),fixtureUrl().replace('sslmode=require','sslmode=disable'),fixtureUrl()+'&host=other.example',fixtureUrl()+'&sslmode=disable',fixtureUrl()+'&schema=other']) assert.equal(policy.inspectDatabaseTarget({DATABASE_URL:url}),'MISMATCH');
});
test('guard fails closed on missing/malformed/unapproved profiles; logs status only',()=>{
  for(const env of [{},{DATABASE_URL:'not-a-url'},{DATABASE_URL:fixtureUrl(),NYBA_DATABASE_PROFILE:'unknown'}]) {
    const logs=[];
    assert.throws(()=>policy.requireDatabaseTarget(env,status=>logs.push(status)),/UNVERIFIABLE/);
    assert.deepEqual(logs,['UNVERIFIABLE']);
  }
  const logs=[];
  assert.throws(()=>policy.requireDatabaseTarget({DATABASE_URL:fixtureUrl('ep-other.neon.tech')},status=>logs.push(status)),/MISMATCH/);
  assert.equal(JSON.stringify(logs),'["MISMATCH"]');
});
test('isolated test profile works locally and is forbidden on Vercel/production',()=>{
  const env={NYBA_DATABASE_PROFILE:'isolated-test',NYBA_TEST_DATABASE_URL:fixtureUrl('ep-fixture.c-7.us-east-2.aws.neon.tech','nyba_test'),NYBA_TEST_DATABASE_HOST:'ep-fixture.c-7.us-east-2.aws.neon.tech',NYBA_TEST_PROJECT_CONFIRMED:'true',NODE_ENV:'development'};
  assert.equal(policy.inspectDatabaseTarget(env),'MATCH');
  for(const extra of [{VERCEL:'1'},{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'project'},{NODE_ENV:'production'},{NYBA_TEST_DATABASE_HOST:'other.neon.tech'},{NYBA_TEST_DATABASE_URL:fixtureUrl(host,'nyba_test'),NYBA_TEST_DATABASE_HOST:host}]) assert.equal(policy.inspectDatabaseTarget({...env,...extra}),'MISMATCH');
  assert.equal(policy.inspectDatabaseTarget({...env,NYBA_TEST_PROJECT_CONFIRMED:undefined}),'UNVERIFIABLE');
});
function stubClient(state) {
  return class {
    constructor(){state.constructed++;this.article={findMany:async()=>{state.reads++;if(state.failRead)throw Object.assign(new Error('unsafe connection detail'),{code:'P2021'});return [{id:1}];},create:async()=>{state.writes++;return{id:2};}};}
    async $transaction(callback){state.transactions++;return callback({...this,$executeRaw:async(strings)=>{assert.equal(strings[0],'SET TRANSACTION READ ONLY');state.readOnlyStatements++;}});}
  };
}
const state=()=>({constructed:0,reads:0,writes:0,transactions:0,readOnlyStatements:0});
test('Prisma is lazy; MISMATCH/UNVERIFIABLE never construct a client or leak URL',async()=>{
  for(const url of [undefined,'invalid',fixtureUrl('ep-other.neon.tech')]) await withEnv({...url?{DATABASE_URL:url}:{},NYBA_NEWS_MODE:'read-write'},async()=>{
    const s=state();const logs=[];const original=console.info;console.info=msg=>logs.push(msg);
    try{const {prisma}=load('lib/prisma.ts',{'../app/generated/prisma':{PrismaClient:stubClient(s)}});assert.equal(s.constructed,0);await assert.rejects(prisma.article.findMany(),/Database connection guard/);assert.equal(s.constructed,0);assert.ok(logs.every(line=>/^\[database-guard\] (MISMATCH|UNVERIFIABLE)$/.test(line)));}
    finally{console.info=original;}
  });
});
test('staged Prisma allows reads in READ ONLY transactions and blocks all writes/raw SQL',async()=>withEnv({DATABASE_URL:fixtureUrl()},async()=>{
  const s=state();const {prisma}=load('lib/prisma.ts',{'../app/generated/prisma':{PrismaClient:stubClient(s)}});
  await assert.rejects(prisma.article.create({data:{}}),/read-only/);
  await assert.rejects(prisma.article.updateMany({}),/read-only/);
  await assert.rejects(prisma.article.deleteMany({}),/read-only/);
  await assert.rejects(prisma.$executeRawUnsafe('anything'),/read-only/);
  await assert.rejects(prisma.$queryRawUnsafe('anything'),/read-only/);
  await assert.rejects(prisma.$transaction([]),/read-only/);
  assert.equal(s.constructed,0);
  assert.deepEqual(await prisma.article.findMany(),[{id:1}]);
  assert.equal(s.transactions,1);assert.equal(s.readOnlyStatements,1);assert.equal(s.writes,0);
  s.failRead=true;
  await assert.rejects(prisma.article.findMany(),error=>error.message==='Database operation failed.'&&error.code==='P2021');
}));
test('explicit writable mode and verified isolated profile preserve test CRUD',async()=>withEnv({NODE_ENV:'development',NYBA_DATABASE_PROFILE:'isolated-test',NYBA_TEST_DATABASE_URL:fixtureUrl('ep-fixture.neon.tech','nyba_test'),NYBA_TEST_DATABASE_HOST:'ep-fixture.neon.tech',NYBA_TEST_PROJECT_CONFIRMED:'true',NYBA_NEWS_MODE:'read-write'},async()=>{
 const s=state();const{prisma}=load('lib/prisma.ts',{'../app/generated/prisma':{PrismaClient:stubClient(s)}});
 assert.deepEqual(await prisma.article.create({data:{}}),{id:2});assert.equal(s.writes,1);
}));
test('staging blocks every news action and RSS/OpenAI before resources are touched',async()=>withEnv({NYBA_NEWS_MODE:'read-only'},async()=>{
 let touched=0;
 const unexpected=()=>{touched++;throw new Error('Resource should not be touched');};
 const mocks={
  '../../auth':{auth:unexpected},'../../lib/prisma':{prisma:{}},'./prisma':{prisma:{}},
  'next/cache':{revalidatePath:unexpected},'next/navigation':{redirect:unexpected},
  '../../lib/import-rss':{importRSS:unexpected},'../../lib/translate-news':{translateNewsToArabic:unexpected},
  './rss':{fetchRSS:unexpected},'server-only':{},openai:{__esModule:true,default:class{constructor(){unexpected();}}},
  'rss-parser':{__esModule:true,default:class{parseURL(){unexpected();}}},
 };
 const actions=load('app/admin/actions.ts',mocks);
 for(const action of Object.values(actions))await assert.rejects(action(1),/read-only/);
 const editor=load('app/admin/editor-actions.ts',mocks);
 for(const action of Object.values(editor))await assert.rejects(action(new FormData()),/read-only/);
 await assert.rejects(load('lib/import-rss.ts',mocks).importRSS({feedUrl:'unused'}),/read-only/);
 await assert.rejects(load('lib/rss.ts',mocks).fetchRSS('unused'),/read-only/);
 await assert.rejects(load('lib/translate-news.ts',mocks).translateNewsToArabic('title','summary','content'),/read-only/);
 assert.equal(touched,0);
 for(const mode of [undefined,'invalid','READ-WRITE'])assert.equal(policy.isNewsReadOnly({NYBA_NEWS_MODE:mode}),true);
}));

test('preview launcher passes a valid isolated target to the real guard',()=>{
 const {previewEnvironment}=require('../scripts/preview-test-site.cjs');
 const target={url:fixtureUrl('ep-fixture.neon.tech','nyba_test'),host:'ep-fixture.neon.tech'};
 const env=previewEnvironment({TEST_ADMIN_EMAIL:'test@example.org'},target,{});
 assert.equal(policy.inspectDatabaseTarget(env),'MATCH');
 assert.equal(policy.isNewsReadOnly(env),false);
});

test('constructor failures cannot leak raw credentials or hostname',async()=>withEnv({DATABASE_URL:fixtureUrl()},async()=>{
 const {prisma}=load('lib/prisma.ts',{'../app/generated/prisma':{PrismaClient:class{constructor(){throw new Error('unsafe connection detail');}}}});
 await assert.rejects(prisma.article.findMany(),error=>error.message==='Database operation failed.');
}));
