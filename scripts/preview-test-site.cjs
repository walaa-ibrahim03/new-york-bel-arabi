/* eslint-disable @typescript-eslint/no-require-imports -- Isolated local Next.js launcher. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { parse } = require('dotenv');
const { validateTestEnv } = require('./check-test-env.cjs');
const root = path.resolve(__dirname, '..');
const required = ['TEST_ADMIN_EMAIL','TEST_AUTH_GOOGLE_ID','TEST_AUTH_GOOGLE_SECRET','TEST_AUTH_SECRET'];
function missingAuth(config) {
  return required.filter((key) => !config[key]?.trim() ||
    (key === 'TEST_ADMIN_EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config[key])) ||
    (key === 'TEST_AUTH_GOOGLE_ID' && !config[key].endsWith('.apps.googleusercontent.com')) ||
    (key === 'TEST_AUTH_SECRET' && config[key].length < 32));
}
function previewEnvironment(config, target, inherited) {
  const env = {};
  for (const key of ['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot']) if (inherited[key]) env[key] = inherited[key];
  return {
    ...env, NODE_ENV:'development', NEXT_TELEMETRY_DISABLED:'1',
    NYBA_TEST_DATABASE_URL:target.url, NYBA_TEST_DATABASE_HOST:target.host,
    NYBA_DATABASE_PROFILE:'isolated-test', NYBA_TEST_PROJECT_CONFIRMED:'true', NYBA_NEWS_MODE:'read-write',
    DATABASE_URL:target.url,
    AUTH_URL:'http://localhost:3100', AUTH_TRUST_HOST:'true',
    AUTH_SECRET:config.TEST_AUTH_SECRET, AUTH_GOOGLE_ID:config.TEST_AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET:config.TEST_AUTH_GOOGLE_SECRET,
    ADMIN_EMAIL:config.TEST_ADMIN_EMAIL?.trim().toLowerCase(),
    NEXT_PUBLIC_SITE_URL:'http://localhost:3100',
  };
}
async function compilePreviewCss(dir) {
  // The preview uses Webpack, so the production Turbopack rule never runs.
  // Compile the disposable copy with the installed Tailwind loader before Next starts.
  const filename = path.join(dir, 'app/globals.css');
  const input = fs.readFileSync(filename, 'utf8');
  const loader = require('@tailwindcss/turbopack');
  const css = await new Promise((resolve, reject) => {
    loader.call({
      resourcePath: filename, resource: filename,
      getOptions: () => ({ base: dir, optimize: false }),
      async: () => (error, output) => error ? reject(error) : resolve(output),
      addDependency: () => {}, addContextDependency: () => {},
    }, input);
  });
  if (typeof css !== 'string' || !css.includes('.grid {') || !css.includes('.rounded-3xl')) {
    throw new Error('Preview Tailwind utilities were not generated');
  }
  fs.writeFileSync(filename, css);
}
async function prepareSnapshot() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nyba-browser-test-'));
  try {
    for (const name of ['app','lib','data','public','auth.ts','next.config.ts','tsconfig.json','next-env.d.ts']) {
      const source=path.join(root,name);
      if (!fs.existsSync(source)) continue;
      fs.cpSync(source,path.join(dir,name),{recursive:true,filter:(entry)=>!path.basename(entry).startsWith('.env')});
    }
    const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'nyba-isolated-test-preview',private:true,dependencies:pkg.dependencies,devDependencies:pkg.devDependencies}));
    fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
    // Keep the actual guard and Prisma wrapper; the isolated test profile is
    // enabled only by this launcher and is rejected on Vercel/production.
    const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase-one.json'),'utf8'));
    // Replace the provider entirely in the disposable snapshot, never in production sources.
    fs.writeFileSync(path.join(dir,'lib/translate-news.ts'),`import "server-only";
export async function translateNewsToArabic(_title: string, _summary: string, _content: string) {
  void _title; void _summary; void _content;
  return ${JSON.stringify(fixture.translation)};
}
`);
    // RSS imports return an empty list; existing synthetic database articles remain available.
    fs.writeFileSync(path.join(dir,'lib/rss.ts'),`export async function fetchRSS(_feedUrl: string) {
  void _feedUrl;
  return [] as {title:string;link:string;publishedAt:string;summary:string}[];
}
`);
    // Avoid live font downloads; UI layout is otherwise unchanged in the snapshot.
    const layoutPath=path.join(dir,'app/layout.tsx');
    let layout=fs.readFileSync(layoutPath,'utf8');
    if(!layout.includes('const cairo = Cairo(')) throw new Error('Unexpected font setup');
    layout=layout.replace('import { Cairo } from "next/font/google";','').replace(/const cairo = Cairo\([\s\S]*?\);/,'const cairo = { className: "" };');
    fs.writeFileSync(layoutPath,layout);
    if (fs.readdirSync(dir).some(name=>name.startsWith('.env'))) throw new Error('Environment file copied');
    await compilePreviewCss(dir);
    return dir;
  } catch(error) {fs.rmSync(dir,{recursive:true,force:true});throw error;}
}
async function main() {
  const mode=process.argv[2];
  if(mode && mode!=='--check') throw new Error('Invalid mode');
  const config=parse(fs.readFileSync(path.join(root,'.env.test.local')));
  const target=validateTestEnv(config);
  const missing=missingAuth(config);
  if(mode==='--check') {
    const snapshot=await prepareSnapshot();
    fs.rmSync(snapshot,{recursive:true,force:true});
    console.log('PASS: isolated snapshot prepared and removed; test target validated locally. No server or database connection started.');
    console.log(missing.length?'Login not ready. Missing or invalid variables: '+missing.join(', '):'Test OAuth variables present; real login still requires browser verification.');
    return;
  }
  if(missing.length) {console.error('STOP: missing or invalid test OAuth variables: '+missing.join(', '));process.exitCode=1;return;}
  // Startup check is read-only; the browser can subsequently edit test articles.
  const { PrismaClient }=require('../app/generated/prisma');
  const check=new PrismaClient({datasources:{db:{url:target.url}},log:[]});
  try {
    const rows=await check.$transaction(async tx=>{
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return tx.$queryRaw`SELECT current_database() AS db`;
    });
    if(rows[0]?.db!=='nyba_test') throw new Error('Target identity mismatch');
  } finally {await check.$disconnect();}
  const fresh=validateTestEnv(parse(fs.readFileSync(path.join(root,'.env.test.local'))));
  if(fresh.url!==target.url || fresh.host!==target.host) throw new Error('Target changed');
  const snapshot=await prepareSnapshot();
  const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev',snapshot,'--webpack','--hostname','127.0.0.1','--port','3100'],{cwd:snapshot,env:previewEnvironment(config,target,process.env),stdio:['ignore','pipe','pipe']});
  // Suppress raw framework/OAuth logs; do not print database URLs, tokens or errors.
  child.stdout.resume();child.stderr.resume();
  console.log('Test preview starting: http://localhost:3100 — Google test login at /login.');
  console.log('Translation is Mock; RSS network imports disabled. Test database edits are real. Ctrl+C stops and removes snapshot.');
  const cleanup=()=>fs.rmSync(snapshot,{recursive:true,force:true});
  child.on('error',()=>{cleanup();console.error('Preview could not start; raw details suppressed.');process.exitCode=1;});
  child.on('exit',(code)=>{cleanup();console.log('Test preview stopped; snapshot removed.');process.exitCode=code??0;});
  process.once('SIGINT',()=>child.kill('SIGINT'));
  process.once('SIGTERM',()=>child.kill('SIGTERM'));
}
if(require.main===module) main().catch(()=>{console.error('STOP: test preview validation or startup failed. Connection details suppressed.');process.exitCode=1;});
module.exports={missingAuth,previewEnvironment,prepareSnapshot,compilePreviewCss};
