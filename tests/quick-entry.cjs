/* eslint-disable @typescript-eslint/no-require-imports -- Offline fixtures only. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file,mocks={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{
 if(Object.hasOwn(mocks,id))return mocks[id];if(id==='./image-actions')return{uploadArticleImage:()=>{throw Error('Storage forbidden in offline rendering');}};
 if(id==='react/jsx-runtime')return require(id);
 if(id.startsWith('.')){const base=path.resolve(path.dirname(file),id);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx',mocks);}
 throw Error('External access blocked: '+id);
},m,m.exports);return m.exports;}
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
test('headline discovery treats access policy as a flag; unknown and technically disabled sources still fail',()=>{
 const p=load('lib/news-sources.ts'),source=p.newsSources.find(s=>s.id==='the-city'),before=structuredClone(source);
 try{
  source.discovery.reference='';source.permission.reference='';source.permission.automaticImport=false;source.permission.translation=false;
  assert.equal(p.canDiscoverHeadlines(source),true);assert.equal(p.requireDiscoverySource(source.feedUrl),source);assert.equal(p.isSourceApproved(source),false);
  source.discovery.automatic=false;assert.equal(p.canDiscoverHeadlines(source),false);assert.throws(()=>p.requireDiscoverySource(source.feedUrl));
  source.discovery.automatic=true;source.headlineAccess='restricted';source.discovery.reference='A long documentary reference cannot grant access';assert.equal(p.canDiscoverHeadlines(source),true);assert.equal(p.requireDiscoverySource(source.feedUrl),source);assert.equal(source.headlineAccess,'restricted');assert.throws(()=>p.requireRssFactsSource(source.feedUrl));
 }finally{Object.assign(source,before);}
 for(const id of ['abc7ny','nbc','post','silive']){const s=p.newsSources.find(s=>s.id===id);assert.ok(s);assert.equal(s.discovery.automatic,true);assert.equal(s.headlineAccess,'restricted');assert.equal(p.requireDiscoverySource(s.feedUrl),s);assert.equal(p.canDiscoverHeadlines(s),true);assert.equal(p.isSourceApproved(s),false);assert.throws(()=>p.requireApprovedSource(s.feedUrl));}
 assert.throws(()=>p.requireDiscoverySource('https://evil.example/feed'));
});

function refreshFixture(t,{readOnly=true}={}) {
 const React=require('react'),slots=[],effects=[],timers=new Map(),tasks=[],calls=[];let cursor=0,now=1_000_000,nextTimer=0;
 const previousWindow=global.window,previousDocument=global.document,previousNow=Date.now;
 const page={visibilityState:'visible'};global.document=page;Date.now=()=>now;
 global.window={setInterval:(fn,period)=>{const id=++nextTimer;timers.set(id,{fn,period,due:now+period});return id;},clearInterval:id=>timers.delete(id)};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const hooks={...React,
  useState:initial=>{const i=cursor++;const s=slots[i]??(slots[i]={value:typeof initial==='function'?initial():initial});return[s.value,v=>{s.value=typeof v==='function'?v(s.value):v;}];},
  useRef:initial=>{const i=cursor++;return(slots[i]??(slots[i]={value:{current:initial}})).value;},
  useCallback:(fn,deps)=>{const i=cursor++,s=slots[i];if(!s||!same(s.deps,deps))slots[i]={value:fn,deps};return slots[i].value;},
  useEffect:(fn,deps)=>{const i=cursor++,s=slots[i];if(!s||!same(s.deps,deps)){effects.push(()=>{s?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
  useTransition:()=>{const i=cursor++;const s=slots[i]??(slots[i]={pending:false});s.start??=(fn)=>{s.pending=true;const promise=Promise.resolve(fn()).finally(()=>{s.pending=false;});tasks.push(promise);};return[s.pending,s.start];},
  useActionState:()=>{cursor++;return[{error:''},()=>{throw Error('No saves');},false];},
 };
 let assistantResponse=()=>{throw Error("No AI");};
 const prepareCalls=[];let prepareResponse=()=>{throw Error('No draft preparation');};
 let response=()=>({ok:true,items:[{title:'Fictional Brooklyn headline',source:'Fictional source',url:'https://abc7ny.com/fixture',date:'2030-01-01T00:00:00Z',token:'fictional-token'}]});
 const m={exports:{}},mocks={react:hooks,'react/jsx-runtime':require('react/jsx-runtime'),'next/link':{__esModule:true,default:'a'},'../assistant-actions':{prepareEditorText:async()=>assistantResponse()},'../editor-actions':{saveArticle:()=>{throw Error('No writes');}},'../quick-actions':{searchQuickNews:async(url,section)=>{calls.push({url,section});return response();},prepareQuickDraft:async token=>{prepareCalls.push(token);return prepareResponse(token);}},'../ArticleImageUpload':{__esModule:true,default:()=>null},'../SourceDiscovery':{QuickDraft:()=>null}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync('app/admin/quick/QuickEntry.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>Object.hasOwn(mocks,id)?mocks[id]:load(path.resolve('app/admin/quick',id)+'.ts'),m,m.exports);
 function all(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(all)];}
 function render(){cursor=0;const nodes=all(m.exports.default({readOnly,source:{name:'ABC7NY',url:'https://abc7ny.com/'}}));effects.splice(0).forEach(fn=>fn());return nodes;}
 function dispose(){slots.forEach(s=>s?.cleanup?.());}
 t.after(()=>{dispose();global.window=previousWindow;global.document=previousDocument;Date.now=previousNow;});
 return {calls,prepareCalls,page,render,dispose,timers,setAssistantResponse:fn=>{assistantResponse=fn;},setPrepareResponse:fn=>{prepareResponse=fn;},setResponse:fn=>{response=fn;},run:ms=>{now+=ms;for(const timer of [...timers.values()])if(now>=timer.due){timer.due=now+timer.period;timer.fn();}},flush:async()=>{while(tasks.length)await Promise.all(tasks.splice(0));}};
}
test('QuickEntry refreshes only selected-source metadata every ten minutes while visible; throttles manual requests and preserves selections',async t=>{
 const f=refreshFixture(t);let nodes=f.render();assert.equal(f.calls.length,0);f.run(599999);await f.flush();assert.equal(f.calls.length,0);f.run(1);await f.flush();nodes=f.render();assert.equal(f.calls.length,1);assert.equal(f.calls[0].url,'https://abc7ny.com/');
 f.page.visibilityState='hidden';f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,1);f.page.visibilityState='visible';f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,2);
 nodes.find(n=>n.type==='button'&&n.props.children==='جلب أحدث 5 عناوين').props.onClick();await f.flush();assert.equal(f.calls.length,2);f.run(60000);nodes=f.render();nodes.find(n=>n.type==='button'&&n.props.children==='جلب أحدث 5 عناوين').props.onClick();await f.flush();nodes=f.render();assert.equal(f.calls.length,3);
 nodes.find(n=>n.type==='select').props.onChange({target:{value:'nbc'}});nodes=f.render();f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,4);assert.equal(f.calls[3].url,'https://www.nbcnewyork.com/news/local/');
 nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});nodes=f.render();f.run(600000);await f.flush();assert.equal(f.calls.length,4);nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:false}});f.render();f.run(600000);await f.flush();assert.equal(f.calls.length,5);
 f.dispose();assert.equal(f.timers.size,0);f.run(600000);await f.flush();assert.equal(f.calls.length,5);
});
test('HTTP or redirect error stops automatic refresh per source until a successful explicit manual retry',async t=>{
 const f=refreshFixture(t);let nodes=f.render();f.setResponse(()=>({ok:false,errorKind:'http',message:'HTTP 403'}));f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,1);assert.equal(f.timers.size,0);f.run(1800000);await f.flush();assert.equal(f.calls.length,1);
 f.setResponse(()=>({ok:true,items:[]}));nodes.find(n=>n.type==='select').props.onChange({target:{value:'nbc'}});nodes=f.render();f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,2);nodes.find(n=>n.type==='select').props.onChange({target:{value:'abc7ny'}});nodes=f.render();f.run(600000);await f.flush();assert.equal(f.calls.length,2);
 nodes.find(n=>n.type==='button'&&n.props.children==='جلب أحدث 5 عناوين').props.onClick();await f.flush();f.render();assert.equal(f.calls.length,3);f.run(600000);await f.flush();nodes=f.render();assert.equal(f.calls.length,4);
 f.setResponse(()=>({ok:false,errorKind:'redirect',message:'تحويلات متكررة'}));f.run(600000);await f.flush();f.render();assert.equal(f.calls.length,5);f.run(1800000);await f.flush();assert.equal(f.calls.length,5);
});
test('refresh requests never overlap and cleanup ignores a late result after unmount',async t=>{
 const f=refreshFixture(t);let resolve;f.setResponse(()=>new Promise(done=>{resolve=done;}));f.render();f.run(600000);assert.equal(f.calls.length,1);f.render();f.run(600000);assert.equal(f.calls.length,1);f.dispose();resolve({ok:true,items:[]});await f.flush();assert.equal(f.timers.size,0);
});

test('quick route waits for request-time connection before auth and reads the current write mode',async t=>{
 const old=process.env.ADMIN_EMAIL;process.env.ADMIN_EMAIL='admin@example.org';t.after(()=>{if(old===undefined)delete process.env.ADMIN_EMAIL;else process.env.ADMIN_EMAIL=old;});
 let release,authCalls=0,readonly=false;const gate=new Promise(resolve=>{release=resolve;});
 const C=load('app/admin/quick/page.tsx',{'next/server':{connection:()=>gate},'../../../auth':{auth:async()=>{authCalls++;return{user:{email:'admin@example.org'}};}},'next/navigation':{redirect:()=>{throw Error('Redirect');}},'../../../lib/database-guard':{isNewsReadOnly:()=>readonly},'./QuickEntry':{__esModule:true,default:()=>null}}).default;
 const pending=C({searchParams:Promise.resolve({source:'abc7ny'})});assert.equal(authCalls,0);release();const writable=await pending;assert.equal(authCalls,1);assert.equal(writable.props.readOnly,false);assert.equal(writable.props.source.name,'ABC7NY');readonly=true;const protectedPage=await C({searchParams:Promise.resolve({})});assert.equal(protectedPage.props.readOnly,true);
});
test('selected preparation shows immediate progress, prevents overlap and renders the Arabic draft without publishing',async t=>{
 const f=refreshFixture(t,{readOnly:false});let nodes=f.render();f.run(600000);await f.flush();nodes=f.render();nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});nodes=f.render();let release;f.setPrepareResponse(()=>new Promise(resolve=>{release=resolve;}));
 nodes.find(n=>n.type==='button'&&n.props['aria-label']==='تجهيز المسودات المختارة').props.onClick();nodes=f.render();const button=nodes.find(n=>n.type==='button'&&n.props['aria-label']==='تجهيز المسودات المختارة');assert.equal(button.props['aria-busy'],true);assert.equal(button.props.disabled,true);assert.match(button.props.children,/جارٍ التجهيز/);assert.equal(f.prepareCalls.length,1);
 f.run(600000);assert.equal(f.calls.length,1);assert.equal(f.prepareCalls.length,1);
 release({ok:true,draft:{id:990001,revision:1,title:'خبر خيالي عربي واضح',summary:'ملخص خيالي للمراجعة فقط',category:'عام',sourceName:'ABC7NY',sourceUrl:'https://abc7ny.com/fixture'}});await f.flush();nodes=f.render();assert.equal(nodes.filter(n=>n.props?.initial?.id===990001).length,1);assert.ok(nodes.some(n=>n.props?.role==='status'&&String(n.props.children).includes('لم يُنشر شيء')));assert.equal(f.prepareCalls.length,1);
});
test('preparation failures are visible beside the selected action, preserve failed selections and link any saved original draft',async t=>{
 const f=refreshFixture(t,{readOnly:false});let nodes=f.render();f.run(600000);await f.flush();nodes=f.render();nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});nodes=f.render();f.setPrepareResponse(()=>({ok:false,id:990002,stop:true,message:'رفضت خدمة الذكاء الاصطناعي الطلب بسبب صلاحيات الوصول أو المصادقة.'}));
 nodes.find(n=>n.type==='button'&&n.props['aria-label']==='تجهيز المسودات المختارة').props.onClick();await f.flush();nodes=f.render();assert.ok(nodes.some(n=>n.props?.role==='alert'&&String(n.props.children).includes('صلاحيات الوصول')));assert.ok(nodes.some(n=>n.props?.href==='/admin/edit/990002'));assert.equal(nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.checked,true);assert.equal(nodes.find(n=>n.type==='button'&&n.props['aria-label']==='تجهيز المسودات المختارة').props['aria-busy'],false);
 f.setPrepareResponse(()=>{throw Error('Private server error');});nodes.find(n=>n.type==='button'&&n.props['aria-label']==='تجهيز المسودات المختارة').props.onClick();await f.flush();nodes=f.render();assert.ok(nodes.some(n=>n.props?.role==='alert'&&String(n.props.children).includes('تعذر الاتصال بالخادم')));assert.equal(JSON.stringify(nodes).includes('Private server error'),false);
});

test('manual minute form and extended editor use exactly the shared six section choices',()=>{
 const c=load('lib/categories.ts');assert.equal(c.navigationCategories.length,6);assert.equal(c.editorCategory('الهجرة'),'الهجرة والإقامة');assert.equal(c.editorCategory('تعليم'),'تعليم');assert.equal(c.editorCategory('صحة'),'صحة');
 for(const file of ['app/admin/quick/QuickEntry.tsx','app/admin/ArticleForm.tsx']){const s=fs.readFileSync(file,'utf8');assert.match(s,/name="category"/);assert.match(s,/navigationCategories\.map/);assert.ok(!/type="hidden" name="category"/.test(s));}
});

test('manual image upload appears before preparation and preserves the attachment/rights through edits, AI preview and draft save fields',async t=>{
 const f=refreshFixture(t,{readOnly:false});let nodes=f.render();const widget=ns=>ns.find(n=>typeof n.props?.onBusyChange==='function');const prepare=ns=>ns.find(n=>n.type==='button'&&n.props.children==='تجهيز بالعربية');
 assert.ok(widget(nodes),'image control visible before a draft exists');assert.equal(nodes.filter(n=>typeof n.props?.onBusyChange==='function').length,1);assert.ok(nodes.indexOf(widget(nodes))>nodes.findIndex(n=>n.type==='textarea'));assert.ok(nodes.indexOf(widget(nodes))<nodes.indexOf(prepare(nodes)));assert.equal(nodes.some(n=>n.type==='form'),false);
 const image='https://fixture.public.blob.vercel-storage.com/news/fixture.webp';widget(nodes).props.onChange(image);widget(nodes).props.onConfirmed(true);widget(nodes).props.onBusyChange(true);nodes=f.render();assert.equal(prepare(nodes).props.disabled,true);widget(nodes).props.onBusyChange(false);
 nodes=f.render();nodes.find(n=>n.type==='input'&&n.props.type==='url').props.onChange({target:{value:'https://abc7ny.com/fixture'}});nodes=f.render();nodes.find(n=>n.type==='textarea').props.onChange({target:{value:'Fictional school opens 20 places for a synthetic test only.'}});nodes=f.render();assert.equal(widget(nodes).props.imageUrl,image);assert.equal(widget(nodes).props.confirmed,true);
 f.setAssistantResponse(()=>({ok:true,draft:{title:'خبر خيالي للاختبار',summary:'ملخص عربي خيالي للاختبار فقط دون أي خبر حقيقي.'}}));prepare(nodes).props.onClick();await f.flush();nodes=f.render();assert.ok(nodes.some(n=>n.type==='form'));assert.equal(nodes.filter(n=>typeof n.props?.onBusyChange==='function').length,1);assert.equal(widget(nodes).props.imageUrl,image);assert.equal(widget(nodes).props.confirmed,true);assert.equal(nodes.find(n=>n.props?.name==='imageUrl').props.value,image);assert.equal(nodes.find(n=>n.props?.name==='imageRightsConfirmed').props.value,'yes');assert.equal(nodes.find(n=>n.props?.name==='uploadedImage').props.value,'yes');
});
