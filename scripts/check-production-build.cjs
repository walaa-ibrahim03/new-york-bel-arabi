/* eslint-disable @typescript-eslint/no-require-imports -- Launch the real production build without database credentials. */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const env = { DATABASE_URL:'database-build-disabled', NODE_ENV:'production', NEXT_TELEMETRY_DISABLED:'1', CHECKPOINT_DISABLE:'1', PRISMA_HIDE_UPDATE_MESSAGE:'1' };
for (const key of ['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot']) if (process.env[key]) env[key]=process.env[key];
env.NODE_OPTIONS=`--require=${JSON.stringify(path.join(__dirname,'build-without-database-guard.cjs'))}`;
const result=spawnSync('npm',['run','build'],{cwd:root,env,stdio:'inherit'});
if (result.status!==0 || result.error) process.exit(result.status??1);
// Verify the emitted production artifact, not the preview's precompiled copy.
try {
  const cssFiles=[];
  const walk=(dir)=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,item.name);
    if(item.isDirectory()) walk(file); else if(file.endsWith('.css')) cssFiles.push(file);
  }};
  walk(path.join(root,'.next/static'));
  assert.ok(cssFiles.length);
  const css=cssFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n');
  for(const selector of ['.grid{','.rounded-3xl{','.bg-slate-950{','.input-style{']) assert.ok(css.includes(selector),selector);
  assert.ok(css.includes('.lg\\:grid-cols-'));
  assert.ok(!css.includes('@tailwind utilities'));
  assert.ok(!css.includes('@theme'));
  console.log(`PASS: ${cssFiles.length} production CSS file(s); Tailwind layout, colors, rounded cards, responsive grid and form styles verified.`);
} catch {console.error('FAIL: emitted production CSS is missing required compiled styles.');process.exit(1);}
