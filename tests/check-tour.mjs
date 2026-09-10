// Run from anywhere: node tests/check-tour.mjs (no dependencies).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const [,href] of html.matchAll(/\bhref="([^"]+)"/g)) {
  if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `Broken bookmark: ${href}`);
  else if (!/^[a-z]+:/i.test(href)) assert(fs.existsSync(path.join(root,href.split('#')[0])), `Missing local link: ${href}`);
}
const worlds = [...html.matchAll(/data-world="(\d+)"/g)].map(m => Number(m[1]));
assert.deepEqual(worlds, [0,1,2,3,4,5,6], 'Tour must retain all seven ordered scenes');
assert.equal((html.match(/class="field-note"/g)||[]).length,10,'Retain all ten guide chapters');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
new vm.Script(script);
const fn = script.match(/function scenePosition\(y, offsets\) \{[\s\S]*?\n\}/)[0];
const scenePosition = vm.runInNewContext(`(${fn})`);
for (const [y, expected] of [[-5,0],[0,0],[50,.5],[100,1],[200,1.5],[300,2],[999,2]]) {
  assert.equal(scenePosition(y,[0,100,300]),expected,`Wrong scene position at ${y}`);
}
assert.equal(scenePosition(10,[0]),0);
assert.equal(scenePosition(10,[]),0);
assert.equal(scenePosition(100,[0,100,100]),2);
assert.match(html,/prefers-reduced-motion/);
assert.match(html,/webglcontextlost/);
assert.match(html,/separate transaction for each table/);
assert.match(html,/Once the workload is frozen in memory/);
console.log('PASS — scroll boundaries, 7 scenes, 10 guide chapters, unique bookmarks, local links, syntax, and documented corrections.');
