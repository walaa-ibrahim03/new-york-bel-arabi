/* eslint-disable @typescript-eslint/no-require-imports -- Offline fixtures only. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>load(path.resolve(path.dirname(file),id)+'.ts'),m,m.exports);return m.exports;}
test('quick entry validates public URLs and preserves fictional facts without fetching',()=>{
 const {quickEntryInput}=load('lib/quick-entry.ts'); const facts='Fictional school programme opens 20 places on 17 October.';
 for(const [host,name] of [['abc7ny.com','ABC7NY'],['www.nbcnewyork.com','NBC New York'],['brooklyn.news12.com','News 12'],['www.silive.com','SILive / Staten Island Advance']]){
  const out=quickEntryInput(`https://${host}/fictional`,facts);assert.equal(out.sourceName,name);assert.equal(out.facts,facts);
 }
 assert.equal(quickEntryInput('https://abc7ny.com.example.org/story',facts).sourceName,'abc7ny.com.example.org');
 for(const url of ['http://localhost/story','https://127.0.0.1/story','javascript:alert(1)','https://user:password@example.org/story'])assert.throws(()=>quickEntryInput(url,facts));
 assert.throws(()=>quickEntryInput('https://example.org/story','short'));
 assert.throws(()=>quickEntryInput('https://example.org/story','x'.repeat(2501)));
});
test('quick entry uses guarded existing assistant and save paths, retains original, and requires explicit publish confirmation',()=>{
 const s=fs.readFileSync('app/admin/quick/QuickEntry.tsx','utf8');assert.ok(s.includes('factsOnly: true'));assert.ok(s.includes('targetWords: 60'));assert.ok(s.includes('name="pendingOriginal"'));assert.ok(s.includes('window.confirm'));assert.ok(s.includes('useActionState(saveArticle'));assert.ok(s.includes('readOnly || locked.current'));assert.ok(!s.includes('fetch('));
 const page=fs.readFileSync('app/admin/quick/page.tsx','utf8');assert.ok(page.includes('session?.user?.email'));assert.ok(page.includes('isNewsReadOnly()'));
});
test('four local source cards expose honest manual paths, without automatic requests or government alternatives',()=>{
 const sources=load('lib/local-news-sources.ts');assert.equal(sources.localNewsSources.length,4);assert.equal(sources.selectedLocalSource('silive').name,'SILive');assert.equal(sources.selectedLocalSource('https://evil.example'),undefined);
 const s=fs.readFileSync('app/admin/LocalNewsSources.tsx','utf8');assert.ok(s.includes('/admin/quick?source='));assert.ok(s.includes('فتح أخبار المصدر'));assert.ok(s.includes('العناوين غير متاحة'));assert.ok(!s.includes('fetch('));assert.ok(!s.includes('disabled='));
 const dashboard=fs.readFileSync('app/admin/ArticlesDashboard.tsx','utf8');assert.ok(dashboard.indexOf('<QuickEntry')<dashboard.indexOf('<SourceDiscovery'));assert.match(dashboard,/<details[^>]*><summary[^>]*>خيارات إضافية/);
 const page=fs.readFileSync('app/admin/quick/page.tsx','utf8');assert.ok(page.includes('selectedLocalSource((await searchParams).source)'));
});
test('local source cards render four useful external links and four quick editor links in responsive layout',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const m={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync('app/admin/LocalNewsSources.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{
  if(id==='react/jsx-runtime')return require(id);if(id==='next/link')return{__esModule:true,default:'a'};if(id==='../../lib/local-news-sources')return load('lib/local-news-sources.ts');throw Error('Unexpected access');
 },m,m.exports);
 const html=renderToStaticMarkup(React.createElement(m.exports.default));assert.equal((html.match(/target="_blank"/g)||[]).length,4);assert.equal((html.match(/href="\/admin\/quick\?source=/g)||[]).length,4);assert.ok(html.includes('lg:grid-cols-3'));assert.ok(!html.includes('NASA'));assert.ok(!html.includes('disabled'));
});
test('headline discovery has independent technical readiness and access policy; reference text and translation grant do not activate it',()=>{
 const p=load('lib/news-sources.ts'),source=p.newsSources.find(s=>s.id==='the-city'),before=structuredClone(source);
 try{
  source.discovery.reference='';source.permission.reference='';source.permission.automaticImport=false;source.permission.translation=false;
  assert.equal(p.canDiscoverHeadlines(source),true);assert.equal(p.requireDiscoverySource(source.feedUrl),source);assert.equal(p.isSourceApproved(source),false);
  source.discovery.automatic=false;assert.equal(p.canDiscoverHeadlines(source),false);assert.throws(()=>p.requireDiscoverySource(source.feedUrl));
  source.discovery.automatic=true;source.headlineAccess='restricted';source.discovery.reference='A long documentary reference cannot grant access';assert.equal(p.canDiscoverHeadlines(source),false);assert.throws(()=>p.requireDiscoverySource(source.feedUrl));
 }finally{Object.assign(source,before);}
 for(const id of ['abc7ny','nbc','post','silive']){const s=p.newsSources.find(s=>s.id===id);assert.ok(s);assert.equal(s.discovery.automatic,true);assert.equal(s.headlineAccess,'restricted');assert.throws(()=>p.requireDiscoverySource(s.feedUrl));assert.equal(p.isSourceApproved(s),false);}
 assert.throws(()=>p.requireDiscoverySource('https://evil.example/feed'));
});
