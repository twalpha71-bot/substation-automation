import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The browser store is also exercised in Node. Do not replace a real browser's storage.
if (!globalThis.localStorage?.getItem) {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear(),
  } });
}
const load = async entry => {
  const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
};
const { canVerifyRecovery, protocolFaultRoutes, useLabFaultRequest } = await load('src/simulation/labFaultTraining.ts');
for (let mask = 0; mask < 32; mask++) {
  const observed = !!(mask & 1), cleared = !!(mask & 2), active = !!(mask & 4), healthy = !!(mask & 8), reviewed = !!(mask & 16);
  const record = { injectedAt: 'test', before: 'baseline', observed: observed ? 'actual failure' : undefined, clearedAt: cleared ? 'test' : undefined };
  assert.equal(canVerifyRecovery(record, active, healthy, reviewed), observed && cleared && !active && healthy && reviewed);
}
assert.equal(canVerifyRecovery(undefined, false, true, true), false);
assert.equal(Object.keys(protocolFaultRoutes).length, 3);
for (const route of Object.values(protocolFaultRoutes)) {
  useLabFaultRequest.getState().request(route.lab, route.scenario);
  assert.deepEqual(useLabFaultRequest.getState().pending, route);
  useLabFaultRequest.getState().consume();
  assert.equal(useLabFaultRequest.getState().pending, undefined);
}
console.log('PASS: 33 recovery gate cases; all 3 route requests are consumed exactly once.');

const { useSubstationStore } = await load('src/simulation/useSubstationStore.ts');
const { buildIedFaultScenarios } = await load('src/simulation/signalChainFaults.ts');
const state = useSubstationStore.getState();
let count = 0;
for (const ied of state.ieds) {
  const scenarios = buildIedFaultScenarios(ied, state.signals, state.gooseControlBlocks);
  assert.ok(scenarios.length > 0 && scenarios.length <= 8, ied.id);
  assert.equal(new Set(scenarios.map(s => s.id)).size, scenarios.length, ied.id);
  for (const scenario of scenarios) {
    for (const id of [scenario.targetId, ...scenario.affectedIds].filter(Boolean)) {
      const point = state.signals.find(s => s.id === id);
      assert.ok(point, id);
      assert.equal(point.iedId, ied.id, `${scenario.id} must not target another IED`);
    }
    if (scenario.gooseBlockId) assert.ok(state.gooseControlBlocks.some(g => g.id === scenario.gooseBlockId));
    count++;
  }
}
console.log(`PASS: ${state.ieds.length} IEDs / ${count} supported fault scenarios; exact point anchors stay within their IED.`);

// Communications recovery must not silently close a breaker or clear a protection trip.
const bayId = 'BAY-33-F03';
state.triggerProtectionTrip(bayId, '50/51 guided recovery regression');
const protectedState = () => {
  const bay = useSubstationStore.getState().bays.find(b => b.id === bayId);
  return { breaker: bay.breakerState, trip: bay.protectionTripActive, functions: bay.activeTripFunctions };
};
const before = protectedState();
assert.equal(before.breaker, 'OPEN');
assert.equal(before.trip, true);
for (const id of ['FLT-04', 'FLT-11', 'FLT-12']) {
  useSubstationStore.getState().toggleFaultScenario(id);
  useSubstationStore.getState().toggleFaultScenario(id);
  assert.deepEqual(protectedState(), before, id);
}
console.log('PASS: GOOSE/PRP fault recovery preserves the existing protection trip and open breaker.');
