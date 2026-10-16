/* eslint-disable @typescript-eslint/no-require-imports -- Offline integration checks; no database, storage, RSS or OpenAI traffic. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),sharp=require('sharp');
function load(file,mocks={}){
 const filename=path.resolve(file),sandboxModule={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id==='react/jsx-runtime'||id==='react')return require(id);
  if(id.startsWith('.')){const base=path.resolve(path.dirname(filename),id);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx',mocks);}
  throw Error('External access blocked: '+id);
 },sandboxModule,sandboxModule.exports);return sandboxModule.exports;
}
async function environment(values,work){
 const keys=['ADMIN_EMAIL','NYBA_NEWS_MODE','NYBA_DATABASE_PROFILE','DATABASE_URL','NYBA_IMAGE_UPLOADS_ENABLED','BLOB_READ_WRITE_TOKEN','NYBA_PUBLIC_BLOB_HOST'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{keys.forEach(k=>delete process.env[k]);Object.assign(process.env,values);return await work();}
 finally{keys.forEach(k=>{if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];});}
}
function form(intent='draft'){
 const data=new FormData();for(const[k,v]of Object.entries({title:'خبر خيالي للاختبار فقط',summary:'ملخص خيالي',content:'تفاصيل خيالية فقط',sourceName:'مصدر اختباري',category:'عام',borough:'نيويورك',sourceUrl:'https://example.org/synthetic',imageUrl:'',intent}))data.set(k,v);return data;
}
function editor({authorized=true,fail,redirect=()=>{},sourceUrl='https://example.org/synthetic',translate=()=>{throw Error('OpenAI forbidden');}}={}){
 const writes=[];
 const api=load('app/admin/editor-actions.ts',{
  '../../auth':{auth:async()=>authorized?{user:{email:'admin@example.org'}}:null},
  '../../lib/prisma':{prisma:{article:{create:async args=>{if(fail)throw fail;writes.push(args);return{id:10};},findUnique:async()=>({id:10,status:'DRAFT',category:'عام',originalTitle:'English original',originalSummary:'Original summary',originalContent:'Original content',sourceUrl}),updateMany:async args=>{writes.push(args);return{count:1};}}}},
  'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect,unstable_rethrow:error=>{if(error?.digest==='NEXT_REDIRECT')throw error;}},
  '../../lib/translate-news':{translateNewsToArabic:translate},
 });return{api,writes};
}
test('manual intake stores attribution and draft/review only; cannot request published state',async()=>environment({ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-write'},async()=>{
 const e=editor();await e.api.createArticle(form());assert.equal(e.writes[0].data.status,'DRAFT');assert.equal(e.writes[0].data.sourceName,'مصدر اختباري');
 await e.api.createArticle(form('review'));assert.equal(e.writes[1].data.status,'IN_REVIEW');assert.equal('approvedBy' in e.writes[1].data,false);
 await assert.rejects(e.api.createArticle(form('PUBLISHED')));assert.equal(e.writes.length,2);
 const missing=form();missing.delete('sourceName');await assert.rejects(e.api.createArticle(missing));assert.equal(e.writes.length,2);
}));
test('saving for review preserves original fields and clears approval with revision check',async()=>environment({ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-write'},async()=>{
 const e=editor(),data=form('review');data.set('id','10');data.set('revision','4');data.set('originalTitle','attempted overwrite');
 await e.api.updateArticle(data);const saved=e.writes[0];assert.deepEqual(saved.where,{id:10,revision:4});assert.equal(saved.data.status,'IN_REVIEW');assert.equal(saved.data.approvedAt,null);assert.equal(saved.data.approvedBy,null);assert.equal('originalTitle' in saved.data,false);
}));
test('form reports safe errors, keeps server authorization and preserves redirect control flow',async()=>{
 await environment({ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-write'},async()=>{
  const denied=editor({authorized:false});assert.ok((await denied.api.saveArticle({error:''},form())).error);assert.equal(denied.writes.length,0);
  const duplicate=editor({fail:Object.assign(Error('private raw detail'),{code:'P2002'})});const result=await duplicate.api.saveArticle({error:''},form());assert.match(result.error,/موجود/);assert.equal(result.error.includes('private'),false);
  const control=Object.assign(Error('framework redirect'),{digest:'NEXT_REDIRECT'});await assert.rejects(editor({redirect:()=>{throw control;}}).api.saveArticle({error:''},form()),error=>error===control);
 });
 await environment({ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-only'},async()=>{const e=editor();assert.match((await e.api.saveArticle({error:''},form())).error,/القراءة فقط/);assert.equal(e.writes.length,0);});
});
test('manual form has RTL, attribution, upload, preview and separate draft/review controls',()=>{
 const Form=load('app/admin/ArticleForm.tsx',{
  react:{...React,useActionState:()=>[{error:''},()=>{},false]},'next/link':{__esModule:true,default:'a'},
  './editor-actions':{saveArticle:()=>{},translateArticle:()=>{}},'./image-actions':{uploadArticleImage:()=>{}},
 }).default;
 const html=renderToStaticMarkup(React.createElement(Form));
 for(const value of ['dir="rtl"','إضافة خبر يدويًا','name="sourceName"','name="sourceUrl"','type="file"','معاينة قبل النشر','value="draft"','value="review"'])assert.ok(html.includes(value),value);
 assert.equal(html.includes('value="PUBLISHED"'),false);
});
test('dashboard exposes both intake paths and keeps unapproved source import disabled',()=>{
 const Dashboard=load('app/admin/ArticlesDashboard.tsx',{'next/link':{__esModule:true,default:'a'},'./actions':{}}).default;
 const html=renderToStaticMarkup(React.createElement(Dashboard,{articles:[],readOnly:false}));
 for(const value of ['إضافة خبر يدويًا','جلب الأخبار تلقائيًا','sm:grid-cols-2','href="/admin/new"','id="rss-import"','ينتظر توثيق إذن'])assert.ok(html.includes(value),value);
 assert.match(html,/<button[^>]*disabled=""[^>]*>جلب الأخبار من RSS كمسودات/);
});
test('known publisher translation is blocked when permission is missing; own synthetic original remains separate',async()=>environment({ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-write'},async()=>{
 let calls=0;const translate=async(title,summary,content)=>{calls++;assert.equal(title,'English original');assert.equal(summary,'Original summary');assert.equal(content,'Original content');return{title:'عنوان خيالي',summary:'ملخص',content:'محتوى'};};
 await assert.rejects(editor({sourceUrl:'https://gothamist.com/news/synthetic',translate}).api.translateArticle(10),/إذن/);assert.equal(calls,0);
 const own=editor({translate});assert.equal((await own.api.translateArticle(10)).title,'عنوان خيالي');assert.equal(calls,1);assert.equal(own.writes.length,0);
}));
test('preview escapes markup and rejects executable/private source and image URLs',()=>{
 const Preview=load('app/admin/ArticlePreview.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Preview,{article:{title:'<script>alert(1)</script>',summary:'<img src=x onerror=alert(1)>',content:'Synthetic\nbody',category:'عام',sourceName:'Test',sourceUrl:'javascript:alert(1)',imageUrl:'http://127.0.0.1/private'}}));
 assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.equal(html.includes('href="javascript:'),false);assert.equal(html.includes('<img'),false);assert.ok(html.includes('معاينة فقط'));
});
test('image processor decodes and re-encodes real PNG, removes EXIF and rejects spoofed files',async()=>{
 const prepare=load('lib/article-image.ts',{sharp:{__esModule:true,default:sharp}}).prepareArticleImage;
 const bytes=await sharp({create:{width:16,height:16,channels:3,background:'#ddaa00'}}).withMetadata({exif:{IFD0:{Artist:'Synthetic only'}}}).png().toBuffer();
 const result=await prepare(new File([bytes],'fixture.png',{type:'image/png'})),metadata=await sharp(result).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);
 for(const f of [new File(['<svg/>'],'bad.png',{type:'image/png'}),new File([bytes],'bad.jpg',{type:'image/jpeg'}),new File([bytes],'bad.svg',{type:'image/svg+xml'}),new File([new Uint8Array(2*1024*1024+1)],'large.png',{type:'image/png'})])await assert.rejects(prepare(f));
 const large=await sharp({create:{width:5000,height:4000,channels:3,background:'#ffffff'}}).png().toBuffer();await assert.rejects(prepare(new File([large],'pixels.png',{type:'image/png'})));
});
const storageEnv={ADMIN_EMAIL:'admin@example.org',NYBA_NEWS_MODE:'read-write',NYBA_DATABASE_PROFILE:'production',DATABASE_URL:'postgresql://'+'fictional:fictional@ep-little-hall-b51ufwbz.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require',NYBA_IMAGE_UPLOADS_ENABLED:'true',BLOB_READ_WRITE_TOKEN:'synthetic-test-token',NYBA_PUBLIC_BLOB_HOST:'fixture.public.blob.vercel-storage.com'};
function uploader(authorized=true){
 const calls={auth:0,prepare:0,put:0};
 const api=load('app/admin/image-actions.ts',{
  'node:crypto':{randomUUID:()=> 'synthetic-id'},'../../auth':{auth:async()=>{calls.auth++;return authorized?{user:{email:'admin@example.org'}}:null;}},
  '../../lib/article-image':{prepareArticleImage:async()=>{calls.prepare++;return Buffer.from('sanitized image');}},
  '@vercel/blob':{put:async(pathname,_image,options)=>{calls.put++;assert.match(pathname,/^news\/synthetic-id\.webp$/);assert.equal(options.access,'public');assert.equal(options.contentType,'image/webp');assert.equal(options.addRandomSuffix,true);return{url:'https://fixture.public.blob.vercel-storage.com/news/synthetic.webp'};}},
 });return{api,calls};
}
test('upload requires writable admin, verified guard and configured storage; isolated mode never uses production token',async()=>{
 const data=new FormData();data.set('image',new File(['fixture'],'x.png',{type:'image/png'}));
 for(const change of [{NYBA_NEWS_MODE:'read-only'},{NYBA_DATABASE_PROFILE:'isolated-test'},{BLOB_READ_WRITE_TOKEN:''},{DATABASE_URL:'invalid'}])await environment({...storageEnv,...change},async()=>{const u=uploader();assert.equal((await u.api.uploadArticleImage(data)).ok,false);assert.equal(u.calls.put,0);assert.equal(u.calls.prepare,0);});
 await environment(storageEnv,async()=>{const u=uploader(false);assert.equal((await u.api.uploadArticleImage(data)).ok,false);assert.equal(u.calls.put,0);});
 await environment(storageEnv,async()=>{const u=uploader();const result=await u.api.uploadArticleImage(data);assert.equal(result.ok,true);assert.equal(u.calls.put,1);assert.equal('token' in result,false);});
});
test('RSS permission gate denies known but unlicensed feeds before any network access',async()=>{
 const policy=load('lib/news-sources.ts');assert.ok(policy.newsSources.every(source=>!policy.isSourceApproved(source)));
 for(const source of policy.newsSources)assert.throws(()=>policy.requireApprovedSource(source.feedUrl));
 let touched=0;const importer=load('lib/import-rss.ts',{'./prisma':{prisma:{}},'./rss':{fetchRSS:async()=>{touched++;return[];}}});
 await assert.rejects(importer.importRSS({feedUrl:policy.newsSources[0].feedUrl}));assert.equal(touched,0);
});
test('RSS reuses classification, removes tracking duplicates, rejects cross-source links and stores attribution/original as draft',async()=>{
 const created=[],existing=[{sourceUrl:'https://example.org/old?utm_source=legacy#part'}];
 const item=(link,title='Immigration workshop — SYNTHETIC ONLY')=>({title,link,summary:'Fictional immigrant community information',publishedAt:''});
 const api=load('lib/import-rss.ts',{
  './news-sources':{requireApprovedSource:()=>({feedUrl:'https://example.org/feed',name:'Fixture publisher'})},
  './rss':{fetchRSS:async()=>[item('https://example.org/old?fbclid=test'),item('https://other.example/story'),item('https://example.org/new?utm_source=fixture#part'),item('https://example.org/new')]},
  './prisma':{prisma:{article:{findMany:async()=>existing,create:async args=>{created.push(args.data);return{id:20};}}}},
 });
 const result=await api.importRSS({feedUrl:'synthetic-feed',sourceName:'untrusted caller'});assert.equal(result.imported,1);assert.equal(result.skipped,3);
 assert.equal(created[0].sourceName,'Fixture publisher');assert.equal(created[0].sourceUrl,'https://example.org/new');assert.equal(created[0].status,'DRAFT');assert.equal(created[0].category,'الهجرة والإقامة');assert.equal(created[0].originalContent,'Fictional immigrant community information');assert.equal(existing.length,1);
});
test('source attribution migration is nullable/additive with no data mutation',()=>{
 const sql=fs.readFileSync('prisma/migrations/20261016160000_article_source_name/migration.sql','utf8').replace(/--[^\n]*/g,'').trim();
 assert.equal(sql,'ALTER TABLE "Article" ADD COLUMN "sourceName" TEXT;');
});
test('concurrent RSS unique conflict is skipped without modifying an existing article',async()=>{
 let attempts=0;const api=load('lib/import-rss.ts',{
  './news-sources':{requireApprovedSource:()=>({feedUrl:'https://example.org/feed',name:'Fixture'})},
  './rss':{fetchRSS:async()=>[{title:'Immigration fixture',summary:'Fictional workshop',link:'https://example.org/concurrent',publishedAt:''}]},
  './prisma':{prisma:{article:{findMany:async()=>[],create:async()=>{attempts++;throw{code:'P2002'};}}}},
 });
 const result=await api.importRSS({feedUrl:'synthetic'});assert.equal(result.imported,0);assert.equal(result.skipped,1);assert.equal(attempts,1);
});
