import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({entryPoints:['src/components/ccnaFlow.ts'],bundle:true,platform:'node',format:'esm',write:false});
const flow = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const dataBundle = await build({entryPoints:['src/data/ccnaAcademyData.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {CCNA_TOPOLOGIES: tops, CCNA_PACKET_FLOWS: scenarios} = await import(`data:text/javascript;base64,${Buffer.from(dataBundle.outputFiles[0].text).toString('base64')}`);
assert.equal(tops.length,20);
assert.equal(new Set(tops.map(t=>t.id)).size,20);
assert.equal(scenarios.length,11);
for (const top of tops) {
  const ids = new Set(top.nodes.map(n=>n.id));
  for(const link of top.links){assert.ok(ids.has(link.fromId));assert.ok(ids.has(link.toId));}
  assert.ok(top.ipTable.length>0);
  assert.ok(flow.topologySteps(top,'').length>0);
}
assert.deepEqual(flow.copperPinMap(true),[3,6,1,4,5,2,7,8]);
assert.deepEqual(flow.copperPinMap(true,true),[3,6,1,7,8,2,4,5]);
assert.deepEqual(flow.copperPinMap(false),[1,2,3,4,5,6,7,8]);
assert.deepEqual(flow.copperPinMap(false,false,true),[8,7,6,5,4,3,2,1]);
const direct = flow.directFlow();
assert.deepEqual(direct.map(s=>s.title),['ARP Request','ARP Reply','ICMP Echo Request','ICMP Echo Reply']);
assert.equal(direct[0].dstMac,'FF:FF:FF:FF:FF:FF');
assert.equal(direct[1].srcMac,direct[2].dstMac);
assert.equal(direct[2].srcIp,direct[3].dstIp);
assert.deepEqual(flow.packetEdges(tops[0],direct[0]),[{index:0,reverse:false}]);
assert.deepEqual(flow.packetEdges(tops[0],direct[1]),[{index:0,reverse:true}]);
const arp = flow.topologySteps(tops[2],scenarios[0].id);
assert.deepEqual(flow.packetEdges(tops[2],arp[1]).map(e=>e.index),[1,2]);
for(const scenario of scenarios) {
  const top=tops.find(t=>t.id===scenario.topoId);
  const steps=flow.topologySteps(top,scenario.id);
  assert.equal(steps.length,scenario.steps.length);
  steps.forEach((s,i)=>assert.equal(s.detail,scenario.steps[i].descEn));
}
assert.ok(flow.topologySteps(tops[6],'')[0].detail.includes('physical-link walkthrough'));
console.log('PASS: 20 topology graphs, 11 preserved protocol scenarios, ARP/ICMP ordering, direction, broadcast fan-out, and four cable pin mappings.');
