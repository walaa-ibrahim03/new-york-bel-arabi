/* eslint-disable @typescript-eslint/no-require-imports -- Offline integration tests with fictional in-memory articles only. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file,mocks={}){
 const filename=path.resolve(file),sandboxModule={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id.startsWith('.'))return load(path.resolve(path.dirname(filename),id+'.ts'),mocks);
  throw Error('External resource blocked');
 },sandboxModule,sandboxModule.exports);return sandboxModule.exports;
}
function fixture(t,{mode='read-write',email='admin@example.org',failure,cacheFailure=false,realGuard=false}={}){
 const keys=['NYBA_NEWS_MODE','ADMIN_EMAIL','DATABASE_URL','NYBA_DATABASE_PROFILE'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{NYBA_NEWS_MODE:mode,ADMIN_EMAIL:'admin@example.org',DATABASE_URL:'offline-disabled',NYBA_DATABASE_PROFILE:'production'});
 t.after(()=>{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
 const rows=new Map([[900001,{id:900001,title:'Fictional deletion test'}],[900002,{id:900002,title:'Fictional untouched control'}]]);
 const state={authCalls:0,deleteCalls:0,constructed:0,paths:[]};
 const mocks={
  '../../auth':{auth:async()=>{state.authCalls++;return email?{user:{email}}:null;}},
  'next/cache':{revalidatePath:p=>{if(cacheFailure)throw Error('Cache unavailable');state.paths.push(p);}},
  '../../lib/import-rss':{importRSS:()=>{throw Error('RSS forbidden');}},
  '../app/generated/prisma':{PrismaClient:class{constructor(){state.constructed++;throw Error('No real clients allowed');}}},
 };
 if(!realGuard)mocks['../../lib/prisma']={prisma:{article:{delete:async({where})=>{
  state.deleteCalls++;if(failure)throw failure;
  const row=rows.get(where.id);if(!row)throw Object.assign(new Error('Raw detail must remain private'),{code:'P2025'});
  rows.delete(where.id);return row;
 }}}};
 return {actions:load('app/admin/actions.ts',mocks),rows,state};
}
test('deletion removes only its fictional row and invalidates all public/admin paths',async t=>{
 const f=fixture(t);const result=await f.actions.deleteArticle(900001);
 assert.equal(result.ok,true);assert.equal(f.rows.has(900001),false);assert.equal(f.rows.has(900002),true);
 assert.equal(f.state.deleteCalls,1);assert.deepEqual(f.state.paths,['/admin','/admin/edit/900001','/news/900001','/','/sitemap.xml','/news-sitemap.xml']);
 assert.equal((await f.actions.deleteArticle(900001)).code,'NOT_FOUND');
});
test('read-only deletion reports its cause without touching auth or Prisma',async t=>{
 const f=fixture(t,{mode:'read-only'});const result=await f.actions.deleteArticle(900001);
 assert.equal(result.code,'READ_ONLY');assert.match(result.message,/القراءة فقط/);assert.equal(result.ok,false);
 assert.equal(f.state.authCalls,0);assert.equal(f.state.deleteCalls,0);assert.equal(f.rows.size,2);
});
test('missing/non-admin sessions and invalid IDs never delete',async t=>{
 for(const email of [null,'other@example.org']){const f=fixture(t,{email});assert.equal((await f.actions.deleteArticle(900001)).code,'UNAUTHORIZED');assert.equal(f.state.deleteCalls,0);}
 const f=fixture(t);for(const id of [0,-1,NaN,1.5,'900001'])assert.equal((await f.actions.deleteArticle(id)).code,'INVALID_ID');
 assert.equal(f.state.deleteCalls,0);
});
test('connection guard remains fail closed before constructing Prisma',async t=>{
 const f=fixture(t,{realGuard:true});const result=await f.actions.deleteArticle(900001);
 assert.equal(result.code,'CONNECTION_BLOCKED');assert.equal(result.ok,false);assert.equal(f.state.constructed,0);
 assert.equal(f.rows.size,2);assert.equal(result.message.includes('offline-disabled'),false);
});
test('database errors never expose raw details and cache failure never misreports deletion',async t=>{
 const f=fixture(t,{failure:Error('private host/password detail')});const result=await f.actions.deleteArticle(900001);
 assert.equal(result.code,'DATABASE_ERROR');assert.equal(result.message.includes('private'),false);assert.equal(f.rows.size,2);
 const g=fixture(t,{cacheFailure:true});assert.equal((await g.actions.deleteArticle(900001)).ok,true);assert.equal(g.rows.size,1);
});
function dashboardHarness(action,{readOnly=false,confirm=true}={}){
 const values=[],pending=[];let cursor=0,calls=0;
 const react={useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v;}];},useMemo:fn=>fn(),useTransition:()=>[false,fn=>pending.push(Promise.resolve(fn()))]};
 const actionMocks={deleteArticle:async id=>{calls++;return action(id);}};
 const Component=load('app/admin/ArticlesDashboard.tsx',{'react':react,'react/jsx-runtime':require('react/jsx-runtime'),'next/link':{__esModule:true,default:'a'},'./SourceDiscovery':{__esModule:true,default:()=>null},'./actions':actionMocks}).default;
 const article=id=>({id,title:'Fictional UI row '+id,summary:'Synthetic',category:'عام',borough:'نيويورك',status:'DRAFT',createdAt:'2026-01-01T00:00:00Z'});
 function render(){cursor=0;return Component({articles:[article(900001),article(900002)],readOnly});}
 function nodes(node){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(nodes);return[node,...nodes(node.props?.children)];}
 const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';
 async function clickDelete(){const previous=globalThis.window;globalThis.window={confirm:()=>confirm};try{nodes(render()).find(n=>n.type==='button'&&text(n)==='حذف نهائي').props.onClick();await Promise.all(pending);}finally{globalThis.window=previous;}}
 return{render,nodes,text,clickDelete,calls:()=>calls};
}
test('dashboard shows read-only banner, disables delete and preserves confirmation cancellation',async()=>{
 const h=dashboardHarness(()=>{throw Error('Must not run');},{readOnly:true});const tree=h.nodes(h.render());
 assert.ok(tree.some(n=>n.props?.role==='status'&&h.text(n).includes('القراءة فقط')));
 assert.ok(tree.filter(n=>n.type==='button'&&h.text(n)==='حذف نهائي').every(n=>n.props.disabled));
 await h.clickDelete();assert.equal(h.calls(),0);
 const c=dashboardHarness(()=>{throw Error('Cancelled');},{confirm:false});await c.clickDelete();assert.equal(c.calls(),0);
});
test('dashboard displays safe action/network failures beside the row and removes a confirmed success',async()=>{
 const f=dashboardHarness(async()=>({ok:false,message:'الحذف متوقف لأن النسخة تعمل بوضع القراءة فقط'}));await f.clickDelete();
 assert.ok(f.nodes(f.render()).some(n=>n.props?.role==='alert'&&f.text(n).includes('القراءة فقط')));
 assert.equal(f.nodes(f.render()).filter(n=>n.type==='article').length,2);
 const network=dashboardHarness(async()=>{throw Error('Sensitive detail');});await network.clickDelete();
 const alert=network.nodes(network.render()).find(n=>n.props?.role==='alert');assert.ok(alert);assert.equal(network.text(alert).includes('Sensitive'),false);
 const success=dashboardHarness(async()=>({ok:true,message:'تم حذف الخبر نهائيًا.'}));await success.clickDelete();
 assert.equal(success.nodes(success.render()).filter(n=>n.type==='article').length,1);
 assert.ok(success.nodes(success.render()).some(n=>n.props?.role==='status'&&success.text(n).includes('تم حذف')));
});
