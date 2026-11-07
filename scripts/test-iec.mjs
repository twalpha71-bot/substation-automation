import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
async function load(entry) {
  const b = await build({ entryPoints:[entry], bundle:true, platform:'node', format:'esm', write:false });
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
}
const { IEC_EQUIPMENT_SCENES: scenes, IEC_ASSETS: assets } = await load('src/data/iecEquipmentDiagrams.ts');
const { ENGINEERING_DIAGRAM_LIBRARY: library, IEC61850_ACADEMY_CHAPTERS: chapters } = await load('src/data/iec61850AcademyData.ts');
assert.equal(scenes.length, 24);
assert.deepEqual(scenes.map(s=>s.number), library.map(s=>s.number));
for (const file of Object.values(assets)) assert.ok(fs.existsSync('public/' + file.slice(2)), file);
for (const s of scenes) {
  const nodes = new Map(s.nodes.map(n=>[n.id,n]));
  assert.equal(nodes.size,s.nodes.length);
  assert.equal(new Set(s.nodes.map(n=>n.slot)).size,s.nodes.length);
  assert.ok(s.nodes.some(n=>n.asset), `Scene ${s.number} needs hardware`);
  for(const l of s.links) { assert.ok(nodes.has(l.from)); assert.ok(nodes.has(l.to)); assert.notEqual(l.from,l.to); }
}
for(const c of chapters) assert.ok(library.some(d=>d.id===c.diagramId), `Chapter ${c.number} mapping`);
const prp = scenes[12];
assert.ok(!prp.links.some(l=>[l.from,l.to].sort().join(',')==='a,b'), 'PRP LAN A/B must remain separate');
for(const device of ['ied','srv','red']) for(const lan of ['a','b']) assert.ok(prp.links.some(l=>[l.from,l.to].includes(device)&&[l.from,l.to].includes(lan)));
const hsr = scenes[13].links.filter(l=>l.media==='fiber');
assert.equal(hsr.length,4);
for(const id of ['a','b','c','d']) assert.equal(hsr.filter(l=>l.from===id||l.to===id).length,2);
assert.ok(scenes[15].links.every(l=>l.media==='logical'), 'Data model links are not cables');
assert.ok(scenes[22].links.filter(l=>l.media==='wan').every(l=>!l.label.includes('GOOSE')));
assert.equal(scenes[18].links.find(l=>l.label.includes('SV')).media,'fiber');
assert.equal(scenes[18].links.find(l=>l.label.includes('MMS')).media,'ethernet');
console.log(`PASS: 24 distinct equipment scenes, ${chapters.length} chapter mappings, local assets, PRP isolation, HSR ring, logical links, and service/media distinctions.`);
