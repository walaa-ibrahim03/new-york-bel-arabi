/* eslint-disable @typescript-eslint/no-require-imports -- Explicit Node integration harness; no application bootstrap. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { parse } = require('dotenv');
const { validateTestEnv } = require('./check-test-env.cjs');
const root = path.resolve(__dirname, '..');
const fixture = require('../tests/fixtures/phase-one.json');

async function main() {
  const target = validateTestEnv(parse(fs.readFileSync(path.join(root, '.env.test.local'))));
  if (target.database !== 'nyba_test') throw new Error('TARGET_MISMATCH');
  // Neither production environment variables nor real translation credentials are used.
  for (const key of Object.keys(process.env)) {
    if (!['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot'].includes(key)) delete process.env[key];
  }
  process.env.DATABASE_URL = 'disabled-do-not-use';
  process.env.ADMIN_EMAIL = 'cycle-test@example.org';
  process.env.NYBA_NEWS_MODE = 'read-write';
  const { PrismaClient } = require('../app/generated/prisma');
  const client = new PrismaClient({ datasources:{db:{url:target.url}}, log:[] });
  const runId = crypto.randomUUID();
  const prefix = `https://example.org/test/news-cycle/${runId}/`;
  const ownedIds = new Set();
  let authorized = true;
  let translationCalls = 0;
  const results=[];
  const fingerprint = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  let before;
  try {
    const identity=await client.$queryRaw`SELECT current_database() AS db`;
    assert.equal(identity[0]?.db,'nyba_test');
    const history=await client.$queryRaw`SELECT migration_name, finished_at, rolled_back_at, checksum FROM "_prisma_migrations" ORDER BY started_at, id`;
    const expected=fs.readdirSync(path.join(root,'prisma/migrations')).filter(n=>fs.statSync(path.join(root,'prisma/migrations',n)).isDirectory()).sort();
    assert.equal(expected.length,4);
    assert.deepEqual(history.map(h=>h.migration_name),expected);
    for(const row of history) {
      assert.ok(row.finished_at && !row.rolled_back_at);
      assert.equal(row.checksum,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'prisma/migrations',row.migration_name,'migration.sql'))).digest('hex'));
    }
    before=await client.article.findMany({orderBy:{id:'asc'}});
    console.log('PASS: test target, migration history and schema access validated.');

    async function mutate(method,args) {
      const fresh=validateTestEnv(parse(fs.readFileSync(path.join(root,'.env.test.local'))));
      assert.equal(fresh.url,target.url);
      assert.equal(fresh.host,target.host);
      if (method==='create') assert.ok(args.data.sourceUrl.startsWith(prefix));
      else {
        assert.ok(Number.isSafeInteger(args.where?.id) && ownedIds.has(args.where.id));
      }
      const result=await client.$transaction(async(tx)=>{
        const check=await tx.$queryRaw`SELECT current_database() AS db`;
        assert.equal(check[0]?.db,'nyba_test');
        if(method!=='create') {
          const row=await tx.article.findUnique({where:{id:args.where.id}});
          assert.ok(row?.sourceUrl.startsWith(prefix));
        }
        return tx.article[method](args);
      },{maxWait:10000,timeout:15000});
      if(method==='create') ownedIds.add(result.id);
      return result;
    }
    const guardedArticle={
      findUnique:(args)=>client.article.findUnique(args),
      create:(args)=>mutate('create',args),
      updateMany:(args)=>mutate('updateMany',args),
      // Deliberately no delete API is exposed to the harness.
    };
    let feedItems=fixture.rssItems.map((item,index)=>({...item,link:index===2?item.link:prefix+(index===1?'rss-0':`rss-${index}`)}));
    const mocks={
      '../../auth':{auth:async()=>({user:{email:authorized?'cycle-test@example.org':'unauthorized@example.org'}})},
      '../../lib/prisma':{prisma:{article:guardedArticle}},
      './prisma':{prisma:{article:guardedArticle}},
      'next/cache':{revalidatePath:()=>{}},
      'next/navigation':{redirect:(location)=>assert.equal(location,'/admin')},
      './rss':{fetchRSS:async()=>feedItems},
      '../../lib/translate-news':{translateNewsToArabic:async(title,summary,content)=>{
        translationCalls++;
        assert.equal(title,fixture.rssItems[0].title);
        assert.equal(summary,fixture.rssItems[0].summary);
        assert.equal(content,fixture.rssItems[0].summary);
        return {...fixture.translation};
      }},
    };
    const cache=new Map();
    function load(filename) {
      const absolute=path.resolve(root,filename);
      if(cache.has(absolute)) return cache.get(absolute);
      if(!absolute.startsWith(root+path.sep)) throw new Error('BLOCKED_MODULE');
      const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
      const sandboxModule={exports:{}};
      new Function('require','module','exports',code)((id)=>{
        if(Object.hasOwn(mocks,id)) return mocks[id];
        if(id.startsWith('.')) return load(path.resolve(path.dirname(absolute),id+'.ts'));
        throw new Error('BLOCKED_EXTERNAL_MODULE');
      },sandboxModule,sandboxModule.exports);
      cache.set(absolute,sandboxModule.exports);
      return sandboxModule.exports;
    }
    const actions=load('app/admin/actions.ts');
    const editor=load('app/admin/editor-actions.ts');
    const importer=load('lib/import-rss.ts');
    const policy=load('lib/article-policy.ts');
    const categories=load('lib/categories.ts');
    const get=(id)=>client.article.findUniqueOrThrow({where:{id}});
    function form(article,changes={}) {
      const data=new FormData();
      for(const key of ['id','revision','title','summary','content','category','borough','sourceUrl','imageUrl']) {
        const value=Object.hasOwn(changes,key)?changes[key]:article[key];
        data.set(key,value==null?'':String(value));
      }
      return data;
    }
    async function check(name,work) {
      try {await work();results.push({test:name,result:'PASS'});console.log('PASS: '+name);}
      catch {results.push({test:name,result:'FAIL'});console.log('FAIL: '+name+' (details suppressed)');}
    }
    let imported;
    await check('rss_import_original_and_validation',async()=>{
      const result=await importer.importRSS({feedUrl:'mock-feed',sourceName:'Synthetic only',limit:5});
      assert.equal(result.imported,1); assert.equal(result.skipped,3); assert.equal(result.irrelevant,1);
      imported=await client.article.findUniqueOrThrow({where:{sourceUrl:prefix+'rss-0'}});
      assert.equal(imported.originalTitle,fixture.rssItems[0].title);
      assert.equal(imported.originalSummary,fixture.rssItems[0].summary);
      assert.equal(imported.originalContent,fixture.rssItems[0].summary);
      assert.equal(imported.status,'DRAFT');
      assert.equal(imported.category,'الهجرة والإقامة');
    });
    assert.ok(imported,'MAIN_FIXTURE_FAILED');
    const id=imported.id;
    await check('duplicate_import_is_skipped',async()=>{
      feedItems=[feedItems[0]];
      const result=await importer.importRSS({feedUrl:'mock-feed'});
      assert.equal(result.imported,0);assert.equal(result.skipped,1);
      assert.equal(await client.article.count({where:{sourceUrl:prefix+'rss-0'}}),1);
    });
    await check('server_rejects_direct_draft_publish',async()=>{
      await assert.rejects(actions.publishArticle(id));
      assert.equal((await get(id)).status,'DRAFT');
    });
    await check('mock_translation_only_reads_saved_original',async()=>{
      const snapshot=await get(id);
      const translation=await editor.translateArticle(id);
      assert.deepEqual(translation,fixture.translation);
      assert.equal(translationCalls,1);
      assert.deepEqual(await get(id),snapshot);
    });
    await check('arabic_save_preserves_original_fields',async()=>{
      const data=form(await get(id),fixture.translation);
      data.set('originalTitle','TEST: attempted overwrite');
      await editor.updateArticle(data);
      const row=await get(id);
      assert.equal(row.title,fixture.translation.title);
      assert.equal(row.content,fixture.translation.content);
      assert.equal(row.originalTitle,imported.originalTitle);
      assert.equal(row.originalSummary,imported.originalSummary);
      assert.equal(row.originalContent,imported.originalContent);
    });
    await check('draft_to_review_to_approved_to_published',async()=>{
      assert.equal((await get(id)).status,'DRAFT');
      await actions.submitArticleForReview(id);
      assert.equal((await get(id)).status,'IN_REVIEW');
      await assert.rejects(actions.publishArticle(id));
      await actions.approveArticle(id);
      const approved=await get(id);
      assert.equal(approved.status,'APPROVED');assert.ok(approved.approvedAt && approved.reviewedAt);
      assert.equal(approved.approvedBy,'cycle-test@example.org');
      await actions.publishArticle(id);
      const published=await get(id);
      assert.equal(published.status,'PUBLISHED');assert.ok(published.publishedAt);
      assert.equal(await client.article.count({where:{id,status:'PUBLISHED'}}),1);
    });
    await check('unpublish_and_approved_edit_invalidate_approval',async()=>{
      await actions.unpublishArticle(id);
      let row=await get(id);assert.equal(row.status,'DRAFT');assert.equal(row.publishedAt,null);assert.equal(row.approvedAt,null);
      await actions.submitArticleForReview(id);await actions.approveArticle(id);
      row=await get(id);
      await editor.updateArticle(form(row,{title:'للاختبار فقط: تعديل خبر معتمد'}));
      row=await get(id);
      assert.equal(row.status,'DRAFT');assert.equal(row.approvedAt,null);assert.equal(row.approvedBy,null);
      assert.equal(row.reviewedAt,null);assert.equal(row.reviewedBy,null);assert.equal(row.publishedAt,null);
      assert.equal(row.originalTitle,imported.originalTitle);
      await assert.rejects(actions.publishArticle(id));
    });
    await check('stale_revision_rejected',async()=>{
      const row=await get(id);
      await editor.updateArticle(form(row,{summary:'للاختبار فقط: نسخة حديثة'}));
      await assert.rejects(editor.updateArticle(form(row,{summary:'للاختبار فقط: نسخة قديمة'})));
      assert.equal((await get(id)).summary,'للاختبار فقط: نسخة حديثة');
    });
    await check('server_rejects_unsafe_links_and_unknown_categories',async()=>{
      const row=await get(id);
      for(const sourceUrl of ['javascript:alert(1)','http://127.0.0.1/a','https://user:pass@example.org']) {
        await assert.rejects(editor.updateArticle(form(row,{sourceUrl})));
      }
      await assert.rejects(editor.updateArticle(form(row,{category:'unknown-test-category'})));
      await assert.rejects(editor.updateArticle(form(row,{sourceUrl:prefix+'different-source'})));
      assert.deepEqual(await get(id),row);
      for(const url of ['javascript:void(0)','http://localhost/a','http://[::1]/']) assert.throws(()=>policy.validateWebUrl(url));
    });
    await check('unauthorized_server_actions_rejected',async()=>{
      authorized=false;
      try {
        await assert.rejects(actions.submitArticleForReview(id));
        await assert.rejects(actions.publishArticle(id));
        await assert.rejects(editor.updateArticle(form(await get(id))));
        await assert.rejects(editor.translateArticle(id));
      } finally {authorized=true;}
    });
    let legacy;
    await check('legacy_without_original_is_editable_and_publishable',async()=>{
      legacy=await guardedArticle.create({data:{...fixture.legacyArticles[0],sourceUrl:prefix+'legacy'}});
      assert.equal(legacy.originalTitle,null);assert.equal(legacy.originalSummary,null);assert.equal(legacy.originalContent,null);
      const calls=translationCalls;
      await assert.rejects(editor.translateArticle(legacy.id));assert.equal(translationCalls,calls);
      await editor.updateArticle(form(legacy,{title:'للاختبار فقط: تحرير خبر قديم'}));
      let row=await get(legacy.id);
      assert.equal(row.category,'الهجرة والإقامة');assert.equal(row.originalTitle,null);
      await actions.submitArticleForReview(legacy.id);await actions.approveArticle(legacy.id);await actions.publishArticle(legacy.id);
      row=await get(legacy.id);assert.equal(row.status,'PUBLISHED');assert.equal(row.originalTitle,null);
    });
    await check('legacy_unknown_category_preserved_until_review',async()=>{
      const row=await guardedArticle.create({data:{...fixture.legacyArticles[2],sourceUrl:prefix+'legacy-unknown'}});
      await editor.updateArticle(form(row,{summary:'للاختبار فقط: تعديل دون فقد التصنيف'}));
      let updated=await get(row.id);assert.equal(updated.category,fixture.legacyArticles[2].category);
      await assert.rejects(actions.submitArticleForReview(row.id));
      await editor.updateArticle(form(updated,{category:'عام'}));
      await actions.submitArticleForReview(row.id);
      updated=await get(row.id);assert.equal(updated.status,'IN_REVIEW');
      assert.equal(categories.normalizeCategory('سكن واقتصاد'),'سكن واقتصاد');
    });
    await check('legacy_published_article_without_approval_preserved',async()=>{
      const row=await guardedArticle.create({data:{...fixture.legacyArticles[1],publishedAt:new Date(fixture.legacyArticles[1].publishedAt),sourceUrl:prefix+'legacy-published'}});
      assert.equal(row.status,'PUBLISHED');assert.equal(row.approvedAt,null);assert.equal(row.originalTitle,null);
      assert.equal(row.category,'سكن واقتصاد');
      await editor.updateArticle(form(row,{summary:'للاختبار فقط: تحرير منشور قديم'}));
      const updated=await get(row.id);assert.equal(updated.status,'DRAFT');assert.equal(updated.publishedAt,null);
      await assert.rejects(actions.publishArticle(row.id));
    });
    await check('preexisting_rows_unchanged_and_only_owned_data_created',async()=>{
      const after=await client.article.findMany({orderBy:{id:'asc'}});
      assert.equal(fingerprint(after.filter(row=>!ownedIds.has(row.id))),fingerprint(before));
      assert.equal(after.length,before.length+ownedIds.size);
      for(const row of after.filter(row=>ownedIds.has(row.id))) assert.ok(row.sourceUrl.startsWith(prefix));
    });
    const summary={runId,database:'nyba_test',result:results.every(r=>r.result==='PASS')?'PASS':'FAIL',tests:results,passed:results.filter(r=>r.result==='PASS').length,failed:results.filter(r=>r.result==='FAIL').length,createdArticleIds:[...ownedIds],createdArticleCount:ownedIds.size,existingArticleCountBefore:before.length,translationMockCalls:translationCalls,realOpenAICalls:0,dataDeleted:false,fixturesRetained:true};
    fs.writeFileSync(path.join(root,'docs/news-cycle-result.json'),JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify(summary));
    if(summary.failed) process.exitCode=1;
  } finally {await client.$disconnect();}
}
main().catch(()=>{console.error('FAIL: integration run stopped. Connection details and raw errors suppressed; no cleanup or deletion attempted.');process.exitCode=1;});
