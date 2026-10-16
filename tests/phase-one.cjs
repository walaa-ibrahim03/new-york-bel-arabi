/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test/preload scripts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const sandboxModule = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id + '.ts'), mocks);
    throw new Error('External dependency blocked in offline tests: ' + id);
  }, sandboxModule, sandboxModule.exports);
  return sandboxModule.exports;
}
const policy = load('lib/article-policy.ts');
const categories = load('lib/categories.ts');
test('legacy categories normalize without discarding housing/economy', () => {
  assert.equal(categories.normalizeCategory('الهجرة'), 'الهجرة والإقامة');
  assert.equal(categories.normalizeCategory('سكن واقتصاد'), 'سكن واقتصاد');
  assert.equal(categories.normalizeCategory('تصنيف قديم'), 'تصنيف قديم');
});
test('unsafe source URLs and invalid article data rejected', () => {
  for (const url of ['javascript:alert(1)', 'http://localhost/a', 'http://127.0.0.1/a', 'http://[::1]/', 'https://u:p@example.org', 'http://2130706433']) assert.throws(() => policy.validateWebUrl(url));
  assert.equal(policy.validateWebUrl('https://example.org/news'), 'https://example.org/news');
  assert.throws(() => policy.validateEditorialArticle({title:'', summary:'x', content:'x', category:'عام', sourceUrl:'https://example.org'}));
});
test('server enforces review, approval, stale revision protection and auth', async () => {
  const article = { id: 1, revision: 0, title:'عنوان', summary:'ملخص', content:'محتوى', category:'عام', sourceUrl:'https://example.org', status:'DRAFT', approvedAt:null, approvedBy:null };
  let authorized = true, conflict = false;
  process.env.ADMIN_EMAIL = 'admin@example.org';
  const actions = load('app/admin/actions.ts', {
    '../../auth': { auth: async () => ({user:{email:authorized ? 'admin@example.org' : 'other@example.org'}}) },
    '../../lib/prisma': {prisma:{article:{findUnique:async () => ({...article}), updateMany:async ({where,data}) => {
      if(conflict || where.revision !== article.revision || where.status !== article.status) return {count:0};
      Object.assign(article, data, {revision:article.revision + 1}); return {count:1};
    }}}},
    'next/cache':{revalidatePath:()=>{}},
    '../../lib/import-rss':{importRSS:()=>{throw new Error('No imports allowed')}},
  });
  await assert.rejects(actions.publishArticle(1));
  await assert.rejects(actions.approveArticle(1));
  await actions.submitArticleForReview(1);
  assert.equal(article.status,'IN_REVIEW');
  await assert.rejects(actions.publishArticle(1));
  await actions.approveArticle(1);
  assert.equal(article.approvedBy,'admin@example.org');
  conflict=true;
  await assert.rejects(actions.publishArticle(1));
  conflict=false;
  await actions.publishArticle(1);
  assert.equal(article.status,'PUBLISHED');
  await actions.unpublishArticle(1);
  assert.equal(article.approvedAt,null);
  assert.equal(article.status,'DRAFT');
  authorized=false;
  await assert.rejects(actions.submitArticleForReview(1));
  await assert.rejects(actions.publishArticle(1));
});
test('RSS retains original text, skips invalid and duplicate entries, starts in draft', async () => {
  const stored=[];
  const { importRSS }=load('lib/import-rss.ts',{
    './prisma':{prisma:{article:{findMany:async()=>[],create:async ({data})=>{if(stored.length) throw {code:'P2002'}; stored.push(data);}}}},
    './news-sources':{requireApprovedSource:()=>({feedUrl:'https://example.org/feed',name:'Fictional source'})},
    './rss':{fetchRSS:async ()=>require('./fixtures/phase-one.json').rssItems},
  });
  const result=await importRSS({feedUrl:'unused'});
  assert.equal(result.imported,1); assert.equal(result.skipped,3);
  assert.equal(stored[0].originalTitle,require('./fixtures/phase-one.json').rssItems[0].title);
  assert.equal(stored[0].originalContent,require('./fixtures/phase-one.json').rssItems[0].summary);
  assert.equal(result.irrelevant,1);
  assert.equal(stored[0].status,'DRAFT');
});
test('editing preserves original fields and invalidates approval atomically', async () => {
  let saved;
  const editor=load('app/admin/editor-actions.ts',{
    '../../auth':{auth:async ()=>({user:{email:'admin@example.org'}})},
    '../../lib/prisma':{prisma:{article:{findUnique:async ()=>({category:'عام'}),updateMany:async (args)=>{saved=args;return {count:1};}}}},
    'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{}},
    '../../lib/translate-news':{translateNewsToArabic:()=>{throw new Error('No external calls')}},
  });
  const form=new FormData();
  for(const [key,value] of Object.entries({id:'1',revision:'2',title:'العنوان',summary:'الملخص',content:'النص',category:'عام',borough:'نيويورك',sourceUrl:'https://example.org',imageUrl:''})) form.set(key,value);
  form.set('originalTitle','malicious overwrite');
  await editor.updateArticle(form);
  assert.equal(saved.where.revision,2);
  assert.equal(saved.data.status,'DRAFT');
  assert.equal(saved.data.approvedAt,null);
  assert.equal(saved.data.approvedBy,null);
  assert.equal(saved.data.publishedAt,null);
  assert.equal('originalTitle' in saved.data,false);
});
