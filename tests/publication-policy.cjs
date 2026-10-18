/* eslint-disable @typescript-eslint/no-require-imports -- Fictional in-memory records; no DB, network or API calls. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file,mocks={}){const name=path.resolve(file),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>{if(Object.hasOwn(mocks,id))return mocks[id];if(id.startsWith('.'))return load(path.resolve(path.dirname(name),id)+'.ts',mocks);throw Error('External access forbidden: '+id);},m,m.exports);return m.exports;}
const summary=Array(8).fill('وقائع خيالية واضحة للاختبار فقط').join(' ');
test('publication policy blocks English and one-Arabic-letter bypass, accepts Arabic names and bounded summaries',()=>{
 const {validatePublication:v}=load('lib/publication-policy.ts');
 for(const title of ['English headline','English headline with one ا','ع'])assert.throws(()=>v({title,summary}));
 for(const text of ['English summary only','English summary plus ا',Array(41).fill('English ا').join(' ')])assert.throws(()=>v({title:'خبر محلي خيالي',summary:text}));
 assert.doesNotThrow(()=>v({title:'مدرسة خيالية في بروكلين تعلن برنامج SNAP',summary}));
 for(const n of [40,80])assert.doesNotThrow(()=>v({title:'خبر خيالي للاختبار',summary:Array(n).fill('تجريبي').join(' ')}));
 assert.throws(()=>v({title:'خبر خيالي للاختبار',summary:Array(81).fill('تجريبي').join(' ')}));
 const short='هذا خبر خيالي قصير للاختبار فقط دون تفاصيل إضافية';assert.throws(()=>v({title:'خبر خيالي للاختبار',summary:short}));assert.doesNotThrow(()=>v({title:'خبر خيالي للاختبار',summary:short},true));assert.throws(()=>v({title:'خبر خيالي للاختبار',summary:'ملخص قصير'},true));
});
function fixture(t){const old=process.env.ADMIN_EMAIL;process.env.ADMIN_EMAIL='admin@example.org';t.after(()=>old===undefined?delete process.env.ADMIN_EMAIL:process.env.ADMIN_EMAIL=old);const s={writes:[],article:{id:900001,revision:0,status:'APPROVED',title:'عنوان خيالي للاختبار',summary,content:summary,category:'عام',sourceUrl:'https://example.org/fictional',originalContent:'Fictional English original',approvedAt:new Date(),approvedBy:'admin@example.org'}};
 const mocks={'../../auth':{auth:async()=>({user:{email:'admin@example.org'}})},'../../lib/database-guard':{assertNewsOperationAllowed:()=>{},isNewsReadOnly:()=>false},'../../lib/prisma':{prisma:{article:{findUnique:async()=>({...s.article}),create:async q=>{s.writes.push(q);},updateMany:async q=>{s.writes.push(q);return{count:1};}}}},'../../lib/import-rss':{importRSS:()=>{throw Error('No RSS');}},'../../lib/translate-news':{translateNewsToArabic:()=>{throw Error('No AI');}},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{},unstable_rethrow:()=>{}}};return{s,editor:load('app/admin/editor-actions.ts',mocks),legacy:load('app/admin/actions.ts',mocks)};}
function form(){const f=new FormData();for(const[k,v]of Object.entries({title:'عنوان خيالي للاختبار',summary,format:'minute',category:'عام',borough:'نيويورك',sourceUrl:'https://example.org/fictional',sourceName:'Fictional source',imageUrl:'',intent:'publish',publicationConfirmed:'yes'}))f.set(k,v);return f;}
test('direct create/update server requests cannot publish English and drafts/originals remain permitted',async t=>{
 const {s,editor}=fixture(t),f=form();f.set('title','English only');await assert.rejects(editor.createArticle(f));assert.equal(s.writes.length,0);
 f.set('id','900001');f.set('revision','0');await assert.rejects(editor.updateArticle(f));assert.equal(s.writes.length,0);
 f.set('title','عنوان عربي واضح');f.set('summary','English summary');await assert.rejects(editor.updateArticle(f));assert.equal(s.writes.length,0);
 f.set('intent','draft');await editor.updateArticle(f);assert.equal(s.writes.length,1);assert.equal(s.writes[0].data.originalContent,undefined);assert.equal(s.article.originalContent,'Fictional English original');
});
test('legacy publish and review shortcut block English before any write; short exception is explicit',async t=>{
 const {s,legacy}=fixture(t);s.article.title='English title';await assert.rejects(legacy.publishArticle(900001));s.article.status='IN_REVIEW';await assert.rejects(legacy.approveAndPublishArticle(900001));assert.equal(s.writes.length,0);
 s.article.title='خبر خيالي واضح';s.article.status='APPROVED';s.article.summary='هذا خبر خيالي قصير للاختبار فقط دون تفاصيل إضافية';await assert.rejects(legacy.publishArticle(900001));assert.equal(s.writes.length,0);await legacy.publishArticle(900001,true);assert.equal(s.writes.length,1);
});
test('deletion audit logs only an ID, role, outcome and timestamp; sink failure is harmless',()=>{
 const {recordDeletionAudit}=load('lib/deletion-audit.ts'),old=console.info,rows=[];try{console.info=s=>rows.push(JSON.parse(s));recordDeletionAudit(900001,'attempt');recordDeletionAudit(900001,'deleted');assert.deepEqual(Object.keys(rows[0]).sort(),['event','articleId','actorRole','outcome','at'].sort());assert.equal(rows[1].outcome,'deleted');console.info=()=>{throw Error('sink unavailable');};assert.doesNotThrow(()=>recordDeletionAudit(900001,'failed'));}finally{console.info=old;}
});
