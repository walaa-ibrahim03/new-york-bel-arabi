/* eslint-disable @typescript-eslint/no-require-imports -- Explicit opt-in integration check against the approved test database only. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {validateTestEnv}=require('./check-test-env.cjs');
const {parse}=require('dotenv');
const ts=require('typescript');
function load(file,mocks={}){
 const filename=path.resolve(root,file),sandboxModule={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id.startsWith('.'))return load(path.resolve(path.dirname(filename),id+'.ts'),mocks);
  throw Error('Unexpected external dependency');
 },sandboxModule,sandboxModule.exports);return sandboxModule.exports;
}
async function run(){
 const config=parse(fs.readFileSync(path.join(root,'.env.test.local'))),target=validateTestEnv(config);
 if(!process.argv.includes('--isolated-child')){
  const env={NODE_ENV:'test',NYBA_DATABASE_PROFILE:'isolated-test',NYBA_TEST_DATABASE_URL:target.url,NYBA_TEST_DATABASE_HOST:target.host,NYBA_TEST_PROJECT_CONFIRMED:'true',NYBA_NEWS_MODE:'read-write',ADMIN_EMAIL:'test-admin@example.org'};
  for(const k of ['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot'])if(process.env[k])env[k]=process.env[k];
  const result=spawnSync(process.execPath,[__filename,'--isolated-child'],{cwd:root,env,encoding:'utf8',timeout:90000,maxBuffer:1024*1024});
  // Only this script's fixed summaries may reach the caller; suppress raw errors.
  if(result.status!==0||result.error)throw Error('Test check failed; raw diagnostics suppressed.');
  for(const line of result.stdout.split('\n'))if(line.startsWith('PASS:')||line.startsWith('[database-guard]'))console.log(line);
  return;
 }
 const guard=load('lib/database-guard.ts');
 if(process.env.NYBA_TEST_DATABASE_URL!==target.url||process.env.NYBA_TEST_DATABASE_HOST!==target.host||guard.inspectDatabaseTarget(process.env)!=='MATCH')throw Error('Test target mismatch');
 const {PrismaClient}=require('../app/generated/prisma');
 const check=new PrismaClient({datasources:{db:{url:target.url}},log:[]});
 let prisma,id;const sourceUrl='https://example.org/nyba-isolated-delete/'+crypto.randomUUID();
 const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 try{
  await check.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;const [identity]=await tx.$queryRaw`SELECT current_database() AS db, current_setting('transaction_read_only') AS ro`;if(identity.db!=='nyba_test'||identity.ro!=='on')throw Error('Server identity mismatch');});
  const fresh=validateTestEnv(parse(fs.readFileSync(path.join(root,'.env.test.local'))));
  if(fresh.url!==target.url||fresh.host!==target.host)throw Error('Test target changed');
  ({prisma}=load('lib/prisma.ts',{'../app/generated/prisma':{PrismaClient}}));
  const before=await prisma.article.findMany({orderBy:{id:'asc'}});
  const row=await prisma.article.create({data:{title:'FICTIONAL DELETE TEST ONLY',summary:'Synthetic temporary fixture',content:'Fictional isolated deletion check; not a real news report.',sourceUrl,status:'DRAFT'}});id=row.id;
  let authorized=true;
  const actions=load('app/admin/actions.ts',{'../../lib/prisma':{prisma},'../../auth':{auth:async()=>authorized?{user:{email:'test-admin@example.org'}}:null},'next/cache':{revalidatePath:()=>{}},'../../lib/import-rss':{importRSS:()=>{throw Error('RSS forbidden');}}});
  process.env.NYBA_NEWS_MODE='read-only';if((await actions.deleteArticle(id)).code!=='READ_ONLY')throw Error('Read-only check failed');
  process.env.NYBA_NEWS_MODE='read-write';authorized=false;if((await actions.deleteArticle(id)).code!=='UNAUTHORIZED')throw Error('Auth check failed');
  if(!await prisma.article.findUnique({where:{id}}))throw Error('Protected row missing');
  authorized=true;if(!(await actions.deleteArticle(id)).ok)throw Error('Deletion failed');
  if(await prisma.article.findUnique({where:{id}}))throw Error('Row still exists');
  const after=await prisma.article.findMany({orderBy:{id:'asc'}});
  if(before.length!==after.length||digest(before)!==digest(after))throw Error('Existing rows changed');
  id=undefined;
  console.log('PASS: nyba_test identity and isolated guard matched; only the newly created fictional article was deleted.');
  console.log('PASS: read-only and unauthorized deletion blocked; all pre-existing test articles unchanged; no production/OpenAI/RSS access.');
 }finally{
  if(id!==undefined){process.env.NYBA_NEWS_MODE='read-write';await check.article.deleteMany({where:{id,sourceUrl}});}
  if(prisma){process.env.NYBA_NEWS_MODE='read-write';await prisma.$disconnect();}
  await check.$disconnect();
 }
}
run().catch(()=>{console.error('FAIL: isolated deletion check stopped. Raw errors and connection details suppressed.');process.exitCode=1;});
