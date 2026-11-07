import { CCNA_PACKET_FLOWS, type CcnaTopologySpec } from '../data/ccnaAcademyData';

export interface VisualStep {
  title: string; detail: string; from: string; to: string;
  srcIp: string; dstIp: string; srcMac: string; dstMac: string; protocol: string;
}

export function directFlow(): VisualStep[] {
  const a = '02:00:00:00:01:10', b = '02:00:00:00:01:11';
  return [
    { title: 'ARP Request', detail: 'PC1 has no ARP cache entry for 192.168.1.11. It broadcasts “Who has 192.168.1.11?” on FastEthernet0. No gateway is needed.', from: 'PC1', to: 'PC2', srcIp: '192.168.1.10', dstIp: '192.168.1.11', srcMac: a, dstMac: 'FF:FF:FF:FF:FF:FF', protocol: 'ARP · opcode 1 · broadcast' },
    { title: 'ARP Reply', detail: 'PC2 recognizes its IPv4 address and replies directly to PC1. PC1 learns 192.168.1.11 → 02:00:00:00:01:11 in its ARP cache.', from: 'PC2', to: 'PC1', srcIp: '192.168.1.11', dstIp: '192.168.1.10', srcMac: b, dstMac: a, protocol: 'ARP · opcode 2 · unicast' },
    { title: 'ICMP Echo Request', detail: 'PC1 sends an IPv4 ICMP Echo Request to PC2 using the resolved destination MAC. TTL = 128; a direct Layer 2 link does not decrement it.', from: 'PC1', to: 'PC2', srcIp: '192.168.1.10', dstIp: '192.168.1.11', srcMac: a, dstMac: b, protocol: 'ICMP · type 8 / code 0 · seq 1' },
    { title: 'ICMP Echo Reply', detail: 'PC2 returns the ICMP Echo Reply to PC1. The source and destination IP and MAC addresses are reversed.', from: 'PC2', to: 'PC1', srcIp: '192.168.1.11', dstIp: '192.168.1.10', srcMac: b, dstMac: a, protocol: 'ICMP · type 0 / code 0 · seq 1' },
  ];
}

export function topologySteps(top: CcnaTopologySpec, scenarioId: string): VisualStep[] {
  if (top.number === 1) return directFlow();
  const scenario = CCNA_PACKET_FLOWS.find(f => f.id === scenarioId && f.topoId === top.id);
  if (scenario) return scenario.steps.map(s => ({title: s.pduType, detail: s.descEn, from: s.fromNode, to: s.toNode, srcIp: s.srcIp, dstIp: s.dstIp, srcMac: s.srcMac, dstMac: s.dstMac, protocol: `${s.l4Info} · TTL ${s.ttl} · ${s.vlanTag}`}));
  // Topologies without an authored protocol scenario expose physical links, not fabricated ping results.
  return top.links.map(l => ({title: `${l.fromId} ↔ ${l.toId}`, detail: `${l.fromId} ${l.fromIf} ↔ ${l.toId} ${l.toIf}. ${l.label}. This is a physical-link walkthrough; reachability depends on the configuration described in the topology summary.`, from: l.fromId, to: l.toId, srcIp: '—', dstIp: '—', srcMac: '—', dstMac: '—', protocol: `${l.cable} · link inspection`}));
}

/** Resolve authored endpoint names and trace real graph edges; never draw a shortcut across the canvas. */
export function packetEdges(top: CcnaTopologySpec, step?: VisualStep): { index: number; reverse: boolean }[] {
  if (!step) return [];
  const resolve = (text: string) => top.nodes.filter(n => new RegExp(`(^|[^A-Za-z0-9_-])${n.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_-]|$)`, 'i').test(text)).map(n => n.id);
  const sources = resolve(step.from), targets = resolve(step.to);
  const result: {index: number; reverse: boolean}[] = [];
  for (const source of sources) for (const target of targets) {
    const queue: { id: string; path: typeof result }[] = [{id: source, path: []}];
    const seen = new Set([source]);
    while (queue.length) {
      const item = queue.shift()!;
      if (item.id === target) { result.push(...item.path); break; }
      top.links.forEach((link, index) => {
        const next = link.fromId === item.id ? link.toId : link.toId === item.id ? link.fromId : '';
        if (next && !seen.has(next)) { seen.add(next); queue.push({id: next, path: [...item.path, {index, reverse: link.toId === item.id}]}); }
      });
    }
  }
  return result.filter((e, i, all) => all.findIndex(x => x.index === e.index && x.reverse === e.reverse) === i);
}

export function copperPinMap(crossover: boolean, gigabit = false, consoleCable = false) {
  return consoleCable ? [8,7,6,5,4,3,2,1] : crossover ? (gigabit ? [3,6,1,7,8,2,4,5] : [3,6,1,4,5,2,7,8]) : [1,2,3,4,5,6,7,8];
}
