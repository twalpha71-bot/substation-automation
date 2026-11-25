import { LabFaultWorkbench } from '../components/LabFaultWorkbench';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import type { BayEquipment, GooseControlBlock, IedDataset, NetworkLink } from '../types/substation';
import { getIedImageByModel } from '../data/iedImageRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileCode2,
  Layers,
  Network,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sliders,
  Zap,
} from 'lucide-react';

type GooseLabTab =
  | 'FAT_SAT'
  | 'PRP_DIAGNOSTICS'
  | 'TRIP_CIRCUIT'
  | 'SCL_EDITOR'
  | 'ENGINEERING'
  | 'NETWORK_TOPOLOGY'
  | 'LIVE_SIMULATION'
  | 'PACKET_ANALYZER'
  | 'DIAGNOSTICS'
  | 'TROUBLESHOOTING'
  | 'EVENT_TIMELINE';

interface SubscriberNodeConfig {
  iedId: string;
  iedName: string;
  shortModel: string;
  vendorModel: string;
  imgSrc: string;

}

interface GooseEventEntry {
  time: string;
  detail: string;
  severity: 'INFO' | 'WARN' | 'ERR';
}

const DEFAULT_TOPOLOGY_NODES: SubscriberNodeConfig[] = [
  {
    iedId: 'IED-132-BC',
    iedName: 'IED_132_BC',
    shortModel: 'MiCOM C264',
    vendorModel: 'Schneider MiCOM C264',
    imgSrc: 'assets/goose-lab/schneider-c264.png',

  },
  {
    iedId: 'IED-132-T1',
    iedName: 'IED_132_T1',
    shortModel: '7UT86',
    vendorModel: 'SIPROTEC 7UT86',
    imgSrc: 'assets/goose-lab/siemens-7ut86.png',

  },
  {
    iedId: 'IED-33-F03',
    iedName: 'IED_33_F03',
    shortModel: 'REF615',
    vendorModel: 'ABB REF615',
    imgSrc: 'assets/goose-lab/abb-ref615.png',

  },
  {
    iedId: 'IED-132-L2',
    iedName: 'IED_132_L2',
    shortModel: 'D60',
    vendorModel: 'GE D60',
    imgSrc: 'assets/goose-lab/ge-d60.png',

  },
];

function nowTimeMs(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

type Lan = 'A' | 'B';
type PayloadValue = boolean | string;
type ExtRef = GooseControlBlock['extRefs'][number];

function compactSwitchLayout(originalX: number) {
  const scale = 0.8;
  const width = 168 * scale;
  const height = 92 * scale;
  const x = originalX + (168 - width) / 2;
  const y = 56 + (92 - height) / 2;
  return {
    image: { x, y, width, height },
    ports: [54, 69, 91, 109, 141].map(offset => ({ x: x + offset * scale, y: y + 72 * scale })),
  };
}

const switchA = compactSwitchLayout(196);
const switchB = compactSwitchLayout(420);

function datasetMember(dataset: IedDataset | undefined, publisherName: string, ref: ExtRef) {
  const [device, signal, extra] = ref.srcRef.split('/');
  if (!signal || extra !== undefined || !ref.intAddr.trim()) return undefined;
  return dataset?.fcdas.find(member => {
    const base = `${member.lnClass}${member.lnInst}.${member.doName}`;
    return device === publisherName + member.ldInst && (member.daName
      ? signal === `${base}.${member.daName}`
      : signal === base || (member.fc === 'ST' && (
        /^(Pos|Loc|EnaCls)$/.test(member.doName) && signal === `${base}.stVal` ||
        /^(Str|Op|OpEx|Tr)$/.test(member.doName) && signal === `${base}.general`
      )));
  });
}

function memberKey(member: IedDataset['fcdas'][number]) {
  return `${member.lnClass}${member.lnInst}.${member.doName}`;
}

function isTripBinding({ key, ref }: { key: string; ref: ExtRef }) {
  return /^(PTRC\d+\.Tr|RBRF\d+\.OpEx|PDIF\d+\.Op)$/.test(key)
    && /PTRC\d+\./.test(ref.intAddr);
}

function nextCounter(value: number) {
  return value >= 0xffffffff ? 1 : value + 1;
}

interface LabFrame {
  appId: string;
  vlan: number;
  confRev: number;
  dataSet: string;
  ndsCom: boolean;
  simulation: boolean;
  entries: number;
  stNum: number;
  sqNum: number;
  t: string;
  tal: number;
  serial: number;
  prpSequence: number;
  payload: Record<string, PayloadValue>;
  context: string;
  decisions: Record<string, string>;
  txLans: Lan[];
  ingress: Lan[];
  arrivals: Record<string, Lan[]>;
}

interface LabReceiver {
  rxCount: number;
  acceptedCount: number;
  duplicates: number;
  lanCopies?: Record<Lan, number>;
  lanDuplicates?: Record<Lan, number>;
  first?: Lan;
  duplicate?: Lan;
  status: string;
  deadline?: number;
  lastAccepted?: LabFrame;
  circuitDue?: number;
  tripStage?: number;
  circuitFailure?: string;
  breakerOpen?: boolean;
  mappedTrip?: boolean;
  alarm?: boolean;
  tripFrame?: LabFrame;
  seen?: { source: string; sequence: number; serial: number };
}

interface LabRuntime {
  clockOrigin: number;
  soe: LabSoeEntry[];
  now: number;
  due: number;
  interval: number;
  stNum: number;
  prevStNum: number;
  sqNum: number;
  stateChangedAt: string;
  visualEvent?: LabFrame;
  sentCurrentState: boolean;
  payload: Record<string, PayloadValue>;
  serial: number;
  frame?: LabFrame;
  capture: LabFrame[];
  lanTx: Record<Lan, number>;
  lanIngress: Record<Lan, number>;
  receivers: Record<string, LabReceiver>;
  transportKey?: string;
}

interface TroubleshootingStep {
  title: string;
  status: 'PASS' | 'FAIL' | 'WAIT';
  evidence: string;
  action: string;
}

function receptionChecks(
  block: GooseControlBlock,
  frame: LabFrame | undefined,
  subscriber: { iedId: string; subscribed: boolean; accepted: boolean; rx?: LabReceiver },
  publisherStop?: string,
): TroubleshootingStep[] {
  const steps: TroubleshootingStep[] = [];
  const add = (title: string, status: TroubleshootingStep['status'], evidence: string, action: string) => {
    if (steps.some(step => step.status !== 'PASS')) {
      steps.push({ title, status: 'WAIT', evidence: 'Resolve the earlier step first.', action: '' });
      return;
    }
    steps.push({ title, status, evidence, action });
  };
  const copies = frame?.arrivals[subscriber.iedId] ?? [];
  const decision = frame?.decisions[subscriber.iedId];
  const rejectionAdvice: Record<string, string> = {
    'APPID Mismatch': 'Compare the transmitted APPID with the subscriber’s configured APPID.',
    'confRev Mismatch': 'Compare confRev and confirm the publisher and subscriber use the same engineering revision.',
    'DataSet Mismatch': 'Compare the DataSet reference and entry count with the configured publisher dataset.',
    'Needs Commissioning': 'Review the GoCB commissioning state and ndsCom indication.',
    'Simulated Frame Blocked': 'Check the frame simulation indicator and the subscriber’s configured acceptance policy.',
  };
  const frameRejected = !!decision && decision in rejectionAdvice;
  add('Check publisher transmission', publisherStop ? 'FAIL' : frame ? 'PASS' : 'WAIT',
    publisherStop ?? (frame ? `Latest publication: stNum ${frame.stNum}, sqNum ${frame.sqNum}.` : 'Waiting for a frame under the current scenario.'),
    'Confirm GoEna is ON and publishing is active. Look for sqNum advancement in Packet Analyzer. If paused, resume in Network Topology.');
  add('Check PRP links and switch ingress', frame?.ingress.length ? 'PASS' : 'FAIL',
    frame?.ingress.length ? `Switch ingress received VLAN ${frame.vlan} on ${frame.ingress.map(lan => `LAN ${lan}`).join(' and ')}.`
      : frame?.txLans.length ? `Switch rejected VLAN ${frame.vlan}; configured GOOSE VLAN is ${block.vlanId}.`
        : 'No active publisher LAN path carried the frame.',
    'Check the publisher ports and LAN A/B link states. If links are up, compare the VLAN tag against switch ingress membership.');
  add('Check arrival at the subscriber', copies.length ? 'PASS' : 'FAIL',
    copies.length ? `LAN ${copies[0]} arrived first.${copies[1] ? ` LAN ${copies[1]} duplicate discarded.` : ' One PRP copy received.'}`
      : 'The frame reached a switch but did not arrive at this subscriber.',
    'In Diagnostics, trace the switch port to this IED. Check link state and VLAN membership end to end.');
  add('Check the GOOSE subscription and frame filter', !subscriber.subscribed || frameRejected ? 'FAIL'
    : !decision || decision === 'Ignored' ? 'WAIT' : 'PASS',
    !subscriber.subscribed ? 'Subscription is disabled for this IED.'
      : `${frameRejected ? decision + '. ' : ''}APPID ${frame?.appId} (expected ${block.appId}); confRev ${frame?.confRev} (expected ${block.confRev}); DataSet ${frame?.dataSet} (${frame?.entries ?? 0} entries).`,
    !subscriber.subscribed ? 'Enable this subscriber in Network Topology if it is an intended receiver.'
      : frameRejected ? rejectionAdvice[decision!] : 'Use Packet Analyzer to compare the received fields with the GoCB configuration.');
  add('Check the ExtRef input mapping', decision === 'Accepted' ? 'PASS' : 'FAIL',
    decision === 'Accepted' ? 'The subscriber accepted the frame and matched a bound DataSet member.'
      : 'No valid ExtRef binding matched a member of this GoCB DataSet.',
    'In Diagnostics, verify that the ExtRef is bound and its source belongs to this GoCB DataSet.');
  add('Confirm recovery and supervision', subscriber.accepted ? 'PASS' : 'FAIL',
    subscriber.accepted ? `Subscriber data is valid. Accepted frames refresh TAL (${frame?.tal ?? block.timeAllowedToLiveMs} ms).`
      : 'The subscriber has no currently valid GOOSE data.',
    'After correcting the issue, confirm new frames are accepted and the data remains valid across retransmissions.');
  return steps;
}

function freshRuntime(block: GooseControlBlock, dataset: IedDataset | undefined, bay?: BayEquipment): LabRuntime {
  const values: Record<string, PayloadValue> = {
    'XCBR1.Pos': bay?.breakerState ?? 'UNKNOWN',
    'XSWI1.Pos': bay?.busDisconnectorState ?? 'UNKNOWN',
    'XSWI2.Pos': bay?.lineDisconnectorState ?? 'UNKNOWN',
    'CSWI1.Loc': bay?.localRemote ?? 'UNKNOWN',
    'CILO1.EnaCls': !!bay?.interlockPermissive,
    'PTRC1.Tr': !!bay?.protectionTripActive,
    'PTOC1.Str': false,
    'PTOC1.Op': false,
    'RBRF1.OpEx': false,
  };
  const stNum = Math.max(1, block.stNum);
  return {
    clockOrigin: Date.now(), soe: [], now: 0, due: 0, interval: block.minTimeMs, serial: 0,
    stNum, prevStNum: stNum, sqNum: 0, stateChangedAt: new Date().toISOString(), sentCurrentState: false,
    payload: Object.fromEntries((dataset?.fcdas ?? []).map(member => {
      const key = memberKey(member);
      return [key, values[key] ?? 'UNKNOWN'];
    })),
    capture: [], lanTx: { A: 0, B: 0 }, lanIngress: { A: 0, B: 0 }, receivers: {},
  };
}

function makeFrame(runtime: LabRuntime, block: GooseControlBlock, fault: GooseControlBlock['mismatchFault'],
  dataset: IedDataset | undefined, publisher: Partial<Record<Lan, NetworkLink>>, nodes: SubscriberNodeConfig[],
  linkFor: (id: string, lan: Lan) => NetworkLink | undefined, context: string): LabFrame {
  const wrongDataset = fault === 'DATASET_MISSING';
  const vlan = fault === 'VLAN_MISMATCH' ? 999 : block.vlanId;
  const order: Lan[] = runtime.serial % 2 === 0 ? ['A', 'B'] : ['B', 'A'];
  const txLans = order.filter(lan => publisher[lan] && publisher[lan]?.status !== 'DOWN');
  const ingress = txLans.filter(lan => publisher[lan]?.vlanList.includes(vlan));
  const arrivals = Object.fromEntries(nodes.map(node => [node.iedId, ingress.filter(lan => {
    const link = linkFor(node.iedId, lan);
    return link && link.status !== 'DOWN' && link.vlanList.includes(vlan) && link.targetId === publisher[lan]?.targetId;
  })]));
  return {
    appId: fault === 'APPID_MISMATCH' ? (block.appId.toLowerCase() === '0x3ffe' ? '0x3FFD' : '0x3FFE') : block.appId,
    vlan, confRev: fault === 'CONFREV_MISMATCH' ? nextCounter(block.confRev) : block.confRev,
    dataSet: wrongDataset ? block.datSet.replace(/[^$]+$/, 'dsMissing') : block.datSet,
    ndsCom: block.ndsCom, simulation: block.testMode, entries: wrongDataset ? 0 : dataset?.fcdas.length ?? 0,
    stNum: runtime.stNum, sqNum: runtime.sqNum, t: runtime.stateChangedAt,
    tal: block.timeAllowedToLiveMs, serial: runtime.serial, prpSequence: runtime.serial & 0xffff,
    payload: wrongDataset ? {} : runtime.payload, txLans, ingress, arrivals, context, decisions: {},
  };
}

const panelClass = 'space-y-3 rounded-xl border border-[#235B76] bg-[#071A2B] p-4';
const fieldClass = 'w-full min-w-0 rounded-md border border-[#326985] bg-[#0B253A] px-2 py-1.5 text-sm text-white';
const actionClass = 'rounded-md border border-[#326985] bg-[#0B253A] px-3 py-1.5 font-bold text-white hover:border-[#38BDF8] disabled:opacity-50';

function saveLabFile(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const sampleGooseScl = `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL">
  <IED name="Publisher"><AccessPoint name="AP1"><Server><LDevice inst="PROT">
    <LN0 lnClass="LLN0" inst="" lnType="ExampleLLN0">
      <DataSet name="Trip"><FCDA ldInst="PROT" lnClass="PTRC" lnInst="1" doName="Tr" daName="general" fc="ST"/></DataSet>
      <GSEControl name="TripGoose" datSet="Trip" confRev="1"/>
    </LN0>
  </LDevice></Server></AccessPoint></IED>
  <IED name="Subscriber"><AccessPoint name="AP1"><Server><LDevice inst="PROT">
    <LN0 lnClass="LLN0" inst="" lnType="ExampleLLN0"><Inputs>
      <ExtRef intAddr="TripInput" serviceType="GOOSE" iedName="Publisher" ldInst="PROT" lnClass="PTRC"
        lnInst="1" doName="Tr" daName="general" srcLDInst="PROT" srcLNClass="LLN0" srcCBName="TripGoose"/>
    </Inputs></LN0>
  </LDevice></Server></AccessPoint></IED>
</SCL>`;

const signalAttrs = ['ldInst', 'prefix', 'lnClass', 'lnInst', 'doName', 'daName'] as const;
const gseSourceAttrs = ['srcLDInst', 'srcPrefix', 'srcLNClass', 'srcLNInst', 'srcCBName'] as const;
const xmlAttr = (node: Element | null | undefined, name: string) => node?.getAttribute(name) ?? '';
const xmlElements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name));
const xmlParent = (node: Element, name: string) => {
  let parent = node.parentElement;
  while (parent && parent.localName !== name) parent = parent.parentElement;
  return parent;
};
const sclSignal = (node: Element) => `${xmlAttr(node, 'ldInst')}/${xmlAttr(node, 'prefix')}${xmlAttr(node, 'lnClass')}${xmlAttr(node, 'lnInst')}.${xmlAttr(node, 'doName')}${xmlAttr(node, 'daName') ? '.' + xmlAttr(node, 'daName') : ''}`;

function inspectGooseScl(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return { error: 'DTD and entity declarations are unsupported.' };
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.documentElement?.localName !== 'SCL' || xmlElements(doc, 'parsererror').length) {
    return { error: 'Enter well-formed SCL XML with an SCL root element.' };
  }
  const controls = xmlElements(doc, 'GSEControl').filter(control => xmlAttr(control, 'type') !== 'GSSE').map(control => {
    const ln = control.parentElement;
    const ld = xmlParent(control, 'LDevice');
    const ied = xmlAttr(xmlParent(control, 'IED'), 'name');
    const dataSet = Array.from(ln?.children ?? []).find(child =>
      child.localName === 'DataSet' && xmlAttr(child, 'name') === xmlAttr(control, 'datSet'));
    const source = [xmlAttr(ld, 'inst'), xmlAttr(ln, 'prefix'), xmlAttr(ln, 'lnClass') || (ln?.localName === 'LN0' ? 'LLN0' : ''), xmlAttr(ln, 'inst'), xmlAttr(control, 'name')];
    return { ied, source, label: `${ied}/${source[0]}/${source[4]}`, dataset: xmlAttr(control, 'datSet'),
      rev: xmlAttr(control, 'confRev'), members: dataSet ? xmlElements(dataSet, 'FCDA') : [] };
  });
  const refs = xmlElements(doc, 'ExtRef').filter(ref =>
    !xmlAttr(ref, 'serviceType') || xmlAttr(ref, 'serviceType') === 'GOOSE');
  const issues = controls.filter(control => !control.members.length).map(control =>
    `${control.label}: DataSet "${control.dataset}" is missing or empty.`);
  const mappings = refs.map(ref => {
    const ied = xmlAttr(xmlParent(ref, 'IED'), 'name');
    const candidates = controls.filter(control => control.ied && control.ied === xmlAttr(ref, 'iedName') &&
      gseSourceAttrs.every((key, index) => !xmlAttr(ref, key) || xmlAttr(ref, key) === control.source[index]) &&
      control.members.some(member => signalAttrs.every(key =>
        key === 'daName' && !xmlAttr(member, key) || xmlAttr(member, key) === xmlAttr(ref, key))));
    const status = !xmlAttr(ref, 'iedName') ? 'Unbound'
      : !xmlAttr(ref, 'doName') || !xmlAttr(ref, 'ldInst') || !xmlAttr(ref, 'lnClass') ? 'Incomplete source'
        : candidates.length > 1 ? 'Ambiguous source' : candidates.length === 1 ? 'Validated' : 'Source not found in document';
    return { ref, ied, status, label: `${ied}/${xmlAttr(xmlParent(ref, 'LDevice'), 'inst')}/${xmlAttr(ref, 'intAddr') || 'ExtRef'}` };
  });
  return { doc, controls, mappings, issues };
}

function SclEngineeringEditor() {
  const [xml, setXml] = useState(sampleGooseScl);
  const [fileName, setFileName] = useState('goose-training.scd');
  const [source, setSource] = useState('0');
  const [member, setMember] = useState('0');
  const [target, setTarget] = useState('0');
  const [notice, setNotice] = useState('');
  const loading = useRef(0);
  const model = useMemo(() => inspectGooseScl(xml), [xml]);
  const publisher = model.controls?.[Number(source)];
  const item = publisher?.members[Number(member)];
  const subscriber = model.mappings?.[Number(target)];
  const canBind = !!(item && subscriber && publisher?.ied && publisher.ied !== subscriber.ied);
  const editXml = (value: string) => {
    loading.current += 1;
    setXml(value);
    setNotice('');
  };
  return (
    <section className={panelClass}>
      <h3 className="text-base font-bold text-white">SCL Engineering Editor</h3>
      <p className="text-[#B6D4EA]">Inspect ICD, CID or SCD XML and bind a GOOSE DataSet member to an existing ExtRef. Checks cover the loaded document. Export the edited file as a lab draft.</p>
      <label className="block text-white">Import ICD, CID or SCD
        <input className={fieldClass} type="file" accept=".icd,.cid,.scd,.xml" onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const request = ++loading.current;
          if (file.size > 5_000_000) {
            setNotice('Choose an XML file up to 5 MB.');
            return;
          }
          try {
            const content = await file.text();
            if (request !== loading.current) return;
            editXml(content);
            setFileName(file.name);
            setSource('0'); setMember('0'); setTarget('0');
          } catch {
            if (request === loading.current) setNotice('The selected file could not be read.');
          }
        }} />
      </label>
      <label className="block text-white">SCL XML
        <textarea className={`${fieldClass} mt-1 font-mono`} rows={10} spellCheck={false} value={xml}
          onChange={event => editXml(event.target.value)} />
      </label>
      {model.error && <p role="alert" className="text-[#FECACA]">{model.error}</p>}
      {model.doc && <>
        <div className="grid gap-2 md:grid-cols-3">
          <label>Publisher GoCB<select className={fieldClass} value={source} onChange={event => { setSource(event.target.value); setMember('0'); }}>
            {model.controls.map((control, index) => <option key={index} value={index}>{control.label} · {control.dataset} · rev {control.rev || '—'}</option>)}
          </select></label>
          <label>DataSet member<select className={fieldClass} value={member} onChange={event => setMember(event.target.value)}>
            {publisher?.members.map((fcda, index) => <option key={index} value={index}>{sclSignal(fcda)}</option>)}
          </select></label>
          <label>Subscriber ExtRef<select className={fieldClass} value={target} onChange={event => setTarget(event.target.value)}>
            {model.mappings.map((mapping, index) => <option key={index} value={index}>{mapping.label} · {mapping.status}</option>)}
          </select></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={actionClass} disabled={!canBind} onClick={() => {
            if (!item || !subscriber || !publisher || !canBind) return;
            for (const key of signalAttrs) subscriber.ref.setAttribute(key, xmlAttr(item, key));
            gseSourceAttrs.forEach((key, index) => subscriber.ref.setAttribute(key, publisher.source[index]));
            subscriber.ref.setAttribute('serviceType', 'GOOSE');
            subscriber.ref.setAttribute('iedName', publisher.ied);
            editXml(new XMLSerializer().serializeToString(model.doc));
            setNotice('ExtRef binding written to the draft. Review the validation result below.');
          }}>Bind ExtRef</button>
          <button type="button" className={actionClass} onClick={() => saveLabFile(fileName, xml, 'application/xml')}>Export SCL draft</button>
        </div>
        <ul className="space-y-1 break-words">
          {model.issues.map((issue, index) => <li key={index} className="text-[#FECACA]">{issue}</li>)}
          {model.mappings.map((mapping, index) => <li key={index} className={mapping.status === 'Validated' ? 'text-[#86EFAC]' : 'text-[#FCD394]'}>
            {mapping.label} → {xmlAttr(mapping.ref, 'iedName') || '—'} · {sclSignal(mapping.ref)} · {mapping.status}
          </li>)}
        </ul>
        {!model.controls.length && <p className="text-[#FCD394]">No GOOSE control blocks in this document.</p>}
        {!model.mappings.length && <p className="text-[#FCD394]">No eligible subscriber ExtRef in this document.</p>}
      </>}
      <button type="button" className={actionClass} onClick={() => {
        editXml(sampleGooseScl); setFileName('goose-training.scd'); setSource('0'); setMember('0'); setTarget('0');
      }}>Load training example</button>
      {notice && <p role="status" className="text-[#B6D4EA]">{notice}</p>}
    </section>
  );
}

function PacketComparison({ history, block, sourceMac, goId, subscribers }: {
  history: LabFrame[];
  block: GooseControlBlock;
  sourceMac?: string;
  goId: string;
  subscribers: SubscriberNodeConfig[];
}) {
  const [selection, setSelection] = useState<LabFrame>();
  const [baseline, setBaseline] = useState<LabFrame>();
  const selected = selection ?? history[0];
  if (!selected) return null;
  const fields = (packet: LabFrame): [string, string | number][] => [
    ['Source MAC', sourceMac ?? 'Unknown'],
    ['Multicast destination', block.multicastMac],
    ['EtherType', '0x88B8'],
    ['VLAN ID / PCP', `${packet.vlan} / ${block.vlanPriority}`],
    ['APPID', packet.appId],
    ['GoCB reference', block.gocbRef],
    ['GoID', goId],
    ['DataSet', packet.dataSet],
    ['confRev', packet.confRev],
    ['stNum', packet.stNum],
    ['sqNum', packet.sqNum],
    ['State timestamp', packet.t],
    ['TAL (ms)', packet.tal],
    ['ndsCom', String(packet.ndsCom)],
    ['Simulation', String(packet.simulation)],
    ['DataSet count', packet.entries],
    ['DataSet values', JSON.stringify(packet.payload)],
    ['PRP sequence', packet.prpSequence],
    ['Publisher / ingress LAN', `${packet.txLans.join(', ') || 'None'} / ${packet.ingress.join(', ') || 'None'}`],
  ];
  const baselineFields = baseline && new Map(fields(baseline));
  return (
    <section className={panelClass}>
      <h3 className="text-base font-bold text-white">Wireshark-style Frame Decode &amp; Compare</h3>
      <p className="text-[#B6D4EA]">Simulated frame history. Pin a reference, then select another frame or follow the latest packet.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 max-w-full">Inspection frame
          <select className={fieldClass} value={selection?.serial ?? ''} onChange={event =>
            setSelection(history.find(packet => packet.serial === Number(event.target.value)))}>
            <option value="">Follow latest</option>
            {selection && !history.some(packet => packet.serial === selection.serial) &&
              <option value={selection.serial}>Pinned inspection #{selection.serial}</option>}
            {history.map(packet => <option key={packet.serial} value={packet.serial}>#{packet.serial} · stNum {packet.stNum} / sqNum {packet.sqNum}</option>)}
          </select>
        </label>
        <button type="button" className={actionClass} onClick={() => setBaseline(selected)}>Pin comparison frame</button>
        {baseline && <button type="button" className={actionClass} onClick={() => setBaseline(undefined)}>Clear comparison</button>}
      </div>
      <p className="text-[#A9C8DD]">Inspecting #{selected.serial}{baseline ? ` · reference #${baseline.serial}` : ''}</p>
      <dl className="divide-y divide-[#25445C]">
        {fields(selected).map(([label, value]) => {
          const previous = baselineFields?.get(label);
          const differs = baselineFields && previous !== value;
          return <div key={label} className="grid gap-1 py-1.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <dt className="text-[#B6D4EA]">{label}</dt>
            <dd className={`m-0 font-mono [overflow-wrap:anywhere] ${differs ? 'text-[#FCD394]' : 'text-white'}`}>
              {value}{differs && <span className="block text-[#B6D4EA]">Reference: {previous}</span>}
            </dd>
          </div>;
        })}
      </dl>
      <h4 className="font-bold text-white">Subscriber decisions</h4>
      <ul className="space-y-1">
        {subscribers.map(node => <li key={node.iedId} className="break-words text-[#D7EEFD]">
          <strong>{node.iedName}</strong> · {selected.decisions[node.iedId] ?? 'No decision'}
          {selected.decisions[node.iedId] === 'APPID Mismatch' && ` · expected ${block.appId}, received ${selected.appId}`}
          {selected.decisions[node.iedId] === 'confRev Mismatch' && ` · expected ${block.confRev}, received ${selected.confRev}`}
          {selected.decisions[node.iedId] === 'DataSet Mismatch' && ` · expected ${block.datSet}, received ${selected.dataSet}`}
          {selected.decisions[node.iedId] === 'ExtRef Unbound' && ' · DataSet source did not match a bound subscriber input'}
          {selected.decisions[node.iedId] === 'VLAN Drop' && ` · no ingress admitted VLAN ${selected.vlan}`}
        </li>)}
      </ul>
    </section>
  );
}

const circuitFaults = [
  { value: 'NONE', label: 'Healthy trip circuit' },
  { value: 'OUTPUT_BLOCK', label: 'Trip output inhibited by simulated logic' },
  { value: 'DC_LOSS', label: 'Trip circuit DC unavailable' },
  { value: 'COIL_OPEN', label: 'Trip coil open circuit' },
  { value: 'MECHANISM', label: 'Breaker mechanism did not open' },
  { value: 'FEEDBACK', label: '52a/52b feedback unavailable' },
] as const;
type CircuitFault = typeof circuitFaults[number]['value'];

const tripStages = ['GOOSE accepted', 'Trip input asserted', 'Output relay picked up', 'Trip coil energized', 'Breaker open', '52a/52b feedback', 'SCADA alarm'] as const;

function tripStageFault(stage: number, fault: CircuitFault): string | undefined {
  if (stage === 2 && fault === 'OUTPUT_BLOCK') return 'Protection logic: trip output inhibited';
  if (stage === 3 && fault === 'DC_LOSS') return 'Output relay picked up, but trip circuit DC is unavailable';
  if (stage === 3 && fault === 'COIL_OPEN') return 'Output relay picked up, but the trip coil circuit is open';
  if (stage === 4 && fault === 'MECHANISM') return 'Trip coil energized, but the breaker remains closed';
  if (stage === 5 && fault === 'FEEDBACK') return 'Breaker opened, but 52a/52b feedback is unavailable';
  return undefined;
}

const LAN_NAMES = ['A', 'B'] as const;

function duplicateCopy(seen: LabReceiver['seen'], source: string, frame: LabFrame) {
  return seen?.source === source && seen.sequence === frame.prpSequence && seen.serial === frame.serial;
}

function PrpDiagnostics({ runtime, lanAUp, lanBUp, nodes }: {
  runtime?: LabRuntime;
  lanAUp: boolean;
  lanBUp: boolean;
  nodes: SubscriberNodeConfig[];
}) {
  const signature = (packet: LabFrame) => [...packet.ingress].sort().join(' + ') || 'None';
  const captures = runtime?.capture ?? [];
  const transitions = captures.slice(0, -1).filter((packet, index) => signature(packet) !== signature(captures[index + 1]));
  return (
    <section className={panelClass}>
      <h3 className="text-base font-bold text-white">PRP LAN Diagnostics</h3>
      <p className="text-[#B6D4EA]">Counters are cumulative for the selected GoCB. Use Fault Scenario or the LAN buttons to exercise failover.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LAN_NAMES.map(lan => <div key={lan} className="rounded-md border border-[#25445C] bg-[#061522] p-3">
          <h4 className="font-bold text-white">LAN {lan} · {(lan === 'A' ? lanAUp : lanBUp) ? 'UP' : 'DOWN'}</h4>
          <p className="text-[#B6D4EA]">Sent {runtime?.lanTx[lan] ?? 0} · Ingress admitted {runtime?.lanIngress[lan] ?? 0}</p>
        </div>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left">
          <thead><tr>{['Subscriber', 'LAN A copies', 'LAN B copies', 'A/B duplicates', 'Unique Rx', 'Accepted', 'Latest first copy'].map(heading =>
            <th className="px-2 py-1" key={heading}>{heading}</th>)}</tr></thead>
          <tbody>{nodes.map(node => {
            const rx = runtime?.receivers[node.iedId];
            return <tr key={node.iedId} className="border-b border-[#25445C]">
              {[node.iedName, rx?.lanCopies?.A ?? 0, rx?.lanCopies?.B ?? 0,
                `${rx?.lanDuplicates?.A ?? 0} / ${rx?.lanDuplicates?.B ?? 0}`, rx?.rxCount ?? 0,
                rx?.acceptedCount ?? 0, rx?.first ?? '—'].map((value, index) =>
                <td key={index} className="px-2 py-1">{value}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <h4 className="font-bold text-white">Recent switch ingress changes</h4>
      {transitions.length ? <ul className="space-y-1">{transitions.map(packet => <li key={packet.serial}>
        Frame #{packet.serial} · PRP sequence {packet.prpSequence} · paths {signature(packet)}
      </li>)}</ul> : <p className="text-[#B6D4EA]">No ingress change in the retained frame history.</p>}
    </section>
  );
}

function subscriberDecision(packet: LabFrame, block: GooseControlBlock, subscribed: boolean, hasBinding: boolean) {
  if (!subscribed) return 'Ignored';
  if (packet.appId !== block.appId) return 'APPID Mismatch';
  if (packet.confRev !== block.confRev) return 'confRev Mismatch';
  if (packet.ndsCom) return 'Needs Commissioning';
  if (packet.simulation) return 'Simulated Frame Blocked';
  if (packet.dataSet !== block.datSet || !packet.entries) return 'DataSet Mismatch';
  return hasBinding ? 'Accepted' : 'ExtRef Unbound';
}

const isPublishing = (goEna: boolean, fault: GooseControlBlock['mismatchFault']) => goEna && fault !== 'TIMEOUT';
const talExpired = (deadline: number | undefined, now: number) => deadline !== undefined && now >= deadline;

interface FatSatCase {
  name: string;
  setup: string;
  expected: string;
  observe: () => string;
}

function buildFatSatCases(config: GooseControlBlock, dataset: IedDataset | undefined): FatSatCase[] {
  if (!dataset?.fcdas.length) return [];
  const block = { ...config, testMode: false, ndsCom: false };
  const runtime = freshRuntime(block, dataset);
  const node = { iedId: 'TestSubscriber', iedName: 'Test Subscriber', shortModel: '', vendorModel: '', imgSrc: '' };
  const link = (lan: Lan): NetworkLink => ({
    id: lan, sourceId: node.iedId, sourceName: node.iedName, sourcePort: lan,
    targetId: lan, targetName: lan, targetPort: '1', lanPlane: lan === 'A' ? 'LAN_A' : 'LAN_B',
    speedMbps: 100, mediaType: '100BASE-FX Multimode LC', vlanList: [block.vlanId], status: 'UP',
    trafficKbps: 0, gooseFramesPerSec: 0, mmsFramesPerSec: 0,
  });
  const send = (fault: GooseControlBlock['mismatchFault'] = 'NONE', a = true, b = true) =>
    makeFrame(runtime, block, fault, dataset, { A: a ? link('A') : undefined, B: b ? link('B') : undefined }, [node], (_, lan) => link(lan), 'FAT/SAT fixture');
  const paths = (packet: LabFrame) => packet.arrivals[node.iedId].join('+') || 'None';
  const inspect = (packet: LabFrame, subscribed = true, bound = true) => subscriberDecision(packet, block, subscribed, bound);
  const circuit = (fault: CircuitFault) => {
    for (let stage = 2; stage < tripStages.length; stage += 1) {
      const failure = tripStageFault(stage, fault);
      if (failure) return `Stopped before ${tripStages[stage]}`;
    }
    return 'Breaker open → 52a/52b feedback → SCADA alarm';
  };
  return [
    { name: 'Healthy receive', setup: 'Inject one valid frame with both paths healthy and a bound input.', expected: 'Accepted', observe: () => inspect(send()) },
    { name: 'VLAN ingress drop', setup: 'Inject a frame with a VLAN outside both switch ingress memberships.', expected: 'None', observe: () => paths(send('VLAN_MISMATCH')) },
    { name: 'APPID rejection', setup: 'Send a frame with an unexpected APPID.', expected: 'APPID Mismatch', observe: () => inspect(send('APPID_MISMATCH')) },
    { name: 'Revision rejection', setup: 'Send a frame with a different confRev.', expected: 'confRev Mismatch', observe: () => inspect(send('CONFREV_MISMATCH')) },
    { name: 'DataSet rejection', setup: 'Send a missing DataSet reference and empty member list.', expected: 'DataSet Mismatch', observe: () => inspect(send('DATASET_MISSING')) },
    { name: 'Unbound ExtRef', setup: 'Run the receive filter with no matching subscriber binding.', expected: 'ExtRef Unbound', observe: () => inspect(send(), true, false) },
    { name: 'Disabled subscriber', setup: 'Deliver a valid frame to a subscriber with the subscription disabled.', expected: 'Ignored', observe: () => inspect(send(), false) },
    { name: 'TAL expiry', setup: 'Advance the fixture clock to a received frame’s TAL deadline.', expected: 'Expired', observe: () => {
      const tal = send().tal;
      return talExpired(tal, tal) && !talExpired(tal, tal - 1) ? 'Expired' : 'Invalid timing';
    } },
    { name: 'GoEna OFF', setup: 'Disable the publisher independently of the LAN state.', expected: 'No new publication', observe: () => isPublishing(false, 'NONE') ? 'Publishing' : 'No new publication' },
    { name: 'LAN A failure', setup: 'Remove LAN A and send the next fixture frame.', expected: 'B', observe: () => paths(send('NONE', false, true)) },
    { name: 'LAN B failure', setup: 'Remove LAN B and send the next fixture frame.', expected: 'A', observe: () => paths(send('NONE', true, false)) },
    { name: 'Dual LAN outage and recovery', setup: 'Disable both LANs, then restore both and compare arrivals.', expected: 'None → A+B', observe: () => `${paths(send('NONE', false, false))} → ${paths(send())}` },
    { name: 'PRP duplicate suppression', setup: 'Compare two PRP copies from the same source and sequence in one publication.', expected: 'One unique delivery', observe: () => {
      const packet = send();
      let seen: LabReceiver['seen'];
      let unique = 0;
      for (const _ of packet.arrivals[node.iedId]) {
        if (!duplicateCopy(seen, block.publisherIedId, packet)) unique += 1;
        seen = { source: block.publisherIedId, sequence: packet.prpSequence, serial: packet.serial };
      }
      return unique === 1 && packet.arrivals[node.iedId].length === 2 ? 'One unique delivery' : `${unique} unique deliveries`;
    } },
    { name: 'Healthy breaker feedback', setup: 'Assert the fixture trip input and execute the normal circuit stage sequence.', expected: 'Breaker open → 52a/52b feedback → SCADA alarm', observe: () => circuit('NONE') },
    { name: 'Trip output inhibited', setup: 'Assert the input with the output inhibit active.', expected: 'Stopped before Output relay picked up', observe: () => circuit('OUTPUT_BLOCK') },
    { name: 'Missing trip circuit DC', setup: 'Run output relay pickup with trip circuit DC unavailable.', expected: 'Stopped before Trip coil energized', observe: () => circuit('DC_LOSS') },
    { name: 'Unsuccessful breaker operation', setup: 'Energize the simulated coil with a stuck breaker mechanism.', expected: 'Stopped before Breaker open', observe: () => circuit('MECHANISM') },
    { name: 'Missing auxiliary feedback', setup: 'Open the simulated breaker with its auxiliary feedback unavailable.', expected: 'Stopped before 52a/52b feedback', observe: () => circuit('FEEDBACK') },
  ];
}

function GooseFatSat({ block, dataset }: { block: GooseControlBlock; dataset?: IedDataset }) {
  const cases = useMemo(() => buildFatSatCases(block, dataset), [block, dataset]);
  const [selected, setSelected] = useState('0');
  const [evidence, setEvidence] = useState<Record<string, { name: string; expected: string; observed: string; result: string; recordedAt: string }>>({});
  const run = (tests: FatSatCase[]) => {
    const results = Object.fromEntries(tests.map(test => {
      const observed = test.observe();
      return [test.name, { name: test.name, expected: test.expected, observed,
        result: observed === test.expected ? 'PASS' : 'FAIL', recordedAt: new Date().toISOString() }];
    }));
    setEvidence(previous => ({ ...previous, ...results }));
  };
  const test = cases[Number(selected)];
  return (
    <section className={panelClass}>
      <h3 className="text-base font-bold text-white">GOOSE FAT/SAT Test Bench</h3>
      <p className="text-[#B6D4EA]">Repeatable simulator tests using an isolated fixture built from the selected GoCB and DataSet.</p>
      {test ? <>
        <label className="block">Test case<select className={fieldClass} value={selected} onChange={event => setSelected(event.target.value)}>
          {cases.map((item, index) => <option key={item.name} value={index}>{index + 1}. {item.name}</option>)}
        </select></label>
        <p className="text-[#D7EEFD]">{test.setup}</p>
        <p>Expected: {test.expected}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={actionClass} onClick={() => run([test])}>Run selected test</button>
          <button type="button" className={actionClass} onClick={() => run(cases)}>Run all {cases.length} tests</button>
          <button type="button" className={actionClass} disabled={!Object.keys(evidence).length} onClick={() =>
            saveLabFile('goose-fat-sat-evidence.json', JSON.stringify({ goCB: block.id, environment: 'simulation', results: Object.values(evidence) }, null, 2), 'application/json')
          }>Download evidence</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-left">
          <thead><tr>{['Test', 'Expected', 'Observed', 'Result'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
          <tbody>{cases.map(item => {
            const entry = evidence[item.name];
            return <tr key={item.name} className="border-b border-[#25445C]">
              <td className="p-2">{item.name}</td><td className="p-2">{item.expected}</td><td className="p-2">{entry?.observed ?? '—'}</td>
              <td className={`p-2 font-bold ${entry?.result === 'PASS' ? 'text-[#86EFAC]' : entry?.result === 'FAIL' ? 'text-[#FECACA]' : 'text-[#B6D4EA]'}`}>{entry?.result ?? 'Not run'}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </> : <p>Select a GoCB with a DataSet in Network Topology.</p>}
    </section>
  );
}

interface LabSoeEntry {
  at: number;
  stage: string;
  detail: string;
  stNum?: number;
}

function recordSoe(runtime: LabRuntime, stage: string, detail: string, stNum?: number) {
  runtime.soe = [...runtime.soe.slice(-149), { at: runtime.now, stage, detail, stNum }];
}

function TripSequence({ runtime }: { runtime?: LabRuntime }) {
  const entries = runtime?.soe ?? [];
  const absolute = (milliseconds: number) => new Date((runtime?.clockOrigin ?? 0) + milliseconds).toISOString();
  return (
    <section className={panelClass}>
      <h3 className="text-base font-bold text-white">Sequence of Events &amp; Trip Timeline</h3>
      <p className="text-[#B6D4EA]">Timestamps use the simulated clock for the selected GoCB. Pausing the lab pauses this clock.</p>
      {!!entries.length && <button type="button" className={actionClass} onClick={() =>
        saveLabFile('goose-sequence-of-events.json', JSON.stringify(entries.map(entry => ({
          ...entry, simulatedTimestamp: absolute(entry.at),
        })), null, 2), 'application/json')}>Download sequence</button>}
      {entries.length ? <div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[36rem] text-left">
        <thead><tr>{['Simulated UTC', 'Elapsed / Δ ms', 'stNum', 'Stage', 'Evidence'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{entries.map((entry, index) => <tr key={`${entry.at}:${index}`} className="border-b border-[#25445C]">
          <td className="whitespace-nowrap p-2 font-mono text-[#A5E6FF]">{absolute(entry.at)}</td>
          <td className="whitespace-nowrap p-2 font-mono">{entry.at.toFixed(1)} / {(index ? entry.at - entries[index - 1].at : 0).toFixed(1)}</td>
          <td className="p-2">{entry.stNum ?? '—'}</td>
          <td className="whitespace-nowrap p-2 font-bold">{entry.stage}</td>
          <td className="p-2">{entry.detail}</td>
        </tr>)}</tbody>
      </table></div> : <p className="text-[#B6D4EA]">Waiting for events from this GoCB.</p>}
    </section>
  );
}

export const GooseLabPage: React.FC = () => {
  const {
    gooseControlBlocks,
    ieds,
    bays,
    networkLinks,
  } = useSubstationStore();

  const [selectedGocbId, setSelectedGocbId] = useState<string>(
    gooseControlBlocks[0]?.id || 'GOCB-132-L1-TRIP'
  );
  const gocb = useMemo(
    () => gooseControlBlocks.find((g) => g.id === selectedGocbId) || gooseControlBlocks[0],
    [gooseControlBlocks, selectedGocbId]
  );

  const publisherBay = bays.find(bay => bay.iedId === gocb?.publisherIedId);
  const isStatusDataset = gocb?.datSet.endsWith('$dsStatus') ?? false;
  const topologyNodes = useMemo<SubscriberNodeConfig[]>(() => {
    const ids = gocb?.id === 'GOCB-132-L1-TRIP'
      ? [...new Set([...gocb.subscriberIedIds, ...DEFAULT_TOPOLOGY_NODES.map(node => node.iedId)])]
      : gocb?.subscriberIedIds ?? [];
    return ids.flatMap(id => {
      const ied = ieds.find(entry => entry.id === id);
      if (!ied) return [];
      const defaultImage = DEFAULT_TOPOLOGY_NODES.find(node => node.iedId === id && ied.model.includes(node.shortModel));
      return [{
        iedId: id,
        iedName: ied.name,
        shortModel: ied.model,
        vendorModel: `${ied.vendor} ${ied.model}`,
        imgSrc: defaultImage?.imgSrc ?? getIedImageByModel(ied.vendor, ied.model),

      }];
    });
  }, [gocb?.id, gocb?.subscriberIedIds, ieds]);

  const [activeTab, setActiveTab] = useState<GooseLabTab>('NETWORK_TOPOLOGY');
  const [circuitFault, setCircuitFault] = useState<CircuitFault>('NONE');
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<0.1 | 0.25 | 0.5 | 1 | 2 | 4>(0.1);
  const [disabledPublishers, setDisabledPublishers] = useState<Record<string, boolean>>({});
  const goEna = !!gocb && !disabledPublishers[gocb.id];
  const [lanAUp, setLanAUp] = useState<boolean>(true);
  const [lanBUp, setLanBUp] = useState<boolean>(true);
  const [testModeSub, setTestModeSub] = useState<boolean>(false);
  const [inspectedDeviceId, setInspectedDeviceId] = useState<string | null>(null);
  const [diagnosticIedId, setDiagnosticIedId] = useState<string | null>(null);

  // Overrides are scoped to one control block, even when publishers share an IED.
  const [subscriptions, setSubscriptions] = useState<Record<string, Record<string, boolean>>>({});
  const subEnabledMap = gocb ? subscriptions[gocb.id] : undefined;

  const [faults, setFaults] = useState<Record<string, GooseControlBlock['mismatchFault']>>({});
  const [events, setEvents] = useState<GooseEventEntry[]>(() => [
    { time: nowTimeMs(), detail: 'GOOSE Lab initialized — isolated PRP and protection simulation', severity: 'INFO' },
  ]);
  const [revision, refresh] = useState(0);
  const [snapshot, setSnapshot] = useState<{ id: string; runtime: LabRuntime }>();
  const runtimes = useRef(new Map<string, LabRuntime>());
  const svgRef = useRef<SVGSVGElement | null>(null);

  const anyLanUp = lanAUp || lanBUp;
  const prpDegraded = anyLanUp && !(lanAUp && lanBUp);
  const faultMode = gocb ? faults[gocb.id] ?? gocb.mismatchFault : 'NONE';
  const isFaultFree = faultMode === 'NONE';
  const publishingActive = isPublishing(goEna, faultMode);
  const transportKey = `${gocb?.id}:${goEna}:${faultMode}:${lanAUp}:${lanBUp}`;

  const publisherIed = useMemo(
    () => ieds.find((x) => x.id === gocb?.publisherIedId),
    [ieds, gocb?.publisherIedId]
  );

  const publisherImg = useMemo(() => {
    const m = (publisherIed?.model || '').toLowerCase();
    if (m.includes('7sa87') || !publisherIed) return 'assets/goose-lab/siemens-7sa87.png';
    if (m.includes('7ut86')) return 'assets/goose-lab/siemens-7ut86.png';
    if (m.includes('c264')) return 'assets/goose-lab/schneider-c264.png';
    if (m.includes('ref615')) return 'assets/goose-lab/abb-ref615.png';
    if (m.includes('d60')) return 'assets/goose-lab/ge-d60.png';
    return getIedImageByModel(publisherIed.vendor, publisherIed.model);
  }, [publisherIed]);

  const resolvePort = (iedId: string, plane: 'LAN_A' | 'LAN_B') => {
    const link = networkLinks.find((l) => l.sourceId === iedId && l.lanPlane === plane);
    return {
      iedPort: link?.sourcePort || 'Port not configured',
      swPort: link?.targetPort || 'Port not configured',
      swName: link?.targetId || (plane === 'LAN_A' ? 'SW-LAN-A1' : 'SW-LAN-B1'),
    };
  };

  const pubPortA = resolvePort(gocb?.publisherIedId || 'IED-132-L1', 'LAN_A');
  const pubPortB = resolvePort(gocb?.publisherIedId || 'IED-132-L1', 'LAN_B');

  const logEvent = (detail: string, severity: 'INFO' | 'WARN' | 'ERR' = 'INFO') => {
    setEvents((prev) => [{ time: nowTimeMs(), detail, severity }, ...prev].slice(0, 18));
  };

  const dataset = publisherIed?.datasets.find(item => item.name === gocb?.datSet.split('$').pop());
  const current = snapshot?.id === gocb?.id ? snapshot?.runtime : undefined;
  const frame = current?.frame;
  const membersFor = (iedId: string) => (gocb?.extRefs ?? []).flatMap(ref => {
    if (ref.subscriberIedId !== iedId || !ref.bound) return [];
    const member = datasetMember(dataset, publisherIed?.name ?? '', ref);
    return member ? [{ ref, key: memberKey(member) }] : [];
  });
  const stimulusKey = isStatusDataset ? 'XCBR1.Pos'
    : gocb?.id === 'GOCB-132-L1-TRIP' ? 'RBRF1.OpEx'
      : gocb?.id === 'GOCB-11-FASTBUS' ? 'PTOC1.Str' : 'PTRC1.Tr';

  // The protocol clock follows Pause, but is independent of the diagram's speed.
  useEffect(() => {
    if (!gocb || !playing) return;
    const block = gocb;
    const runtime = runtimes.current.get(block.id) ?? freshRuntime(block, dataset, publisherBay);
    runtimes.current.set(block.id, runtime);
    const started = performance.now() - runtime.now;
    let timer: number;
    const linkFor = (id: string, lan: Lan) => networkLinks.find(link => link.sourceId === id && link.lanPlane === `LAN_${lan}`);
    const pubLinks = {
      A: lanAUp ? linkFor(block.publisherIedId, 'A') : undefined,
      B: lanBUp ? linkFor(block.publisherIedId, 'B') : undefined,
    };
    if (runtime.transportKey !== transportKey) {
      runtime.due = runtime.now;
      recordSoe(runtime, 'Transport condition', `GoEna ${goEna ? 'ON' : 'OFF'} · LAN A ${lanAUp ? 'UP' : 'DOWN'} · LAN B ${lanBUp ? 'UP' : 'DOWN'} · ${faultMode}`);
    }
    runtime.transportKey = transportKey;

    function tick() {
      runtime.now = performance.now() - started;
      const receivers = { ...runtime.receivers };
      let changed = false;
      for (const node of topologyNodes) {
        const previous = receivers[node.iedId];
        if (!previous) continue;
        const rx = { ...previous };
        if (talExpired(rx.deadline, runtime.now)) {
          rx.deadline = undefined;
          recordSoe(runtime, 'TAL expired', `${node.iedName}: subscriber data invalid`, rx.lastAccepted?.stNum);
          logEvent(`${node.iedName}: TAL expired — subscriber data invalid`, 'WARN');
          changed = true;
        }
        if (rx.circuitDue !== undefined && runtime.now >= rx.circuitDue) {
          const nextStage = (rx.tripStage ?? 1) + 1;
          rx.circuitFailure = tripStageFault(nextStage, circuitFault);
          rx.circuitDue = undefined;
          if (rx.circuitFailure) {
            recordSoe(runtime, 'Trip circuit blocked', `${node.iedName}: ${rx.circuitFailure}`, rx.tripFrame?.stNum);
            logEvent(`${node.iedName}: ${rx.circuitFailure}`, 'ERR');
          } else {
            rx.tripStage = nextStage;
            if (nextStage === 4) rx.breakerOpen = true;
            if (nextStage === 6) rx.alarm = true;
            else rx.circuitDue = runtime.now + [0, 0, 10, 30, 5, 25][nextStage];
            recordSoe(runtime, tripStages[nextStage], nextStage === 5 ? `${node.iedName} · 52a=0 / 52b=1` : node.iedName, rx.tripFrame?.stNum);
            logEvent(`${node.iedName}: ${tripStages[nextStage]}${nextStage === 5 ? ' · 52a=0 / 52b=1' : ''}`, 'WARN');
          }
          changed = true;
        }
        receivers[node.iedId] = rx;
      }
      if (publishingActive && runtime.now >= runtime.due) {
        const firstForState = !runtime.sentCurrentState;
        runtime.sqNum = firstForState ? 0 : nextCounter(runtime.sqNum);
        runtime.serial += 1;
        const packet = makeFrame(runtime, block, faultMode, dataset, pubLinks, topologyNodes, linkFor, transportKey);
        runtime.frame = packet;
        runtime.lanTx = { ...runtime.lanTx };
        runtime.lanIngress = { ...runtime.lanIngress };
        for (const lan of packet.txLans) runtime.lanTx[lan] += 1;
        for (const lan of packet.ingress) runtime.lanIngress[lan] += 1;
        if (firstForState || runtime.capture[0]?.context !== packet.context) {
          recordSoe(runtime, 'GOOSE published',
            `sqNum ${packet.sqNum} · PRP sequence ${packet.prpSequence} · LAN ${packet.txLans.join('/') || 'none'}`, packet.stNum);
        }
        if (firstForState) runtime.visualEvent = packet;
        runtime.sentCurrentState = true;
        const max = Math.max(1, block.maxTimeMs);
        const min = Math.min(max, Math.max(1, block.minTimeMs));
        runtime.interval = firstForState ? min : Math.min(max, runtime.interval * 2);
        runtime.due = runtime.now + runtime.interval;
        changed = true;

        for (const node of topologyNodes) {
          const rx: LabReceiver = {
            rxCount: 0, acceptedCount: 0, duplicates: 0, ...receivers[node.iedId],
            first: undefined, duplicate: undefined,
          };
          const pathCopies = rx.lanCopies = { A: 0, B: 0, ...rx.lanCopies };
          const pathDuplicates = rx.lanDuplicates = { A: 0, B: 0, ...rx.lanDuplicates };
          const subscribed = subEnabledMap?.[node.iedId] ?? block.subscriberIedIds.includes(node.iedId);
          const bindings = membersFor(node.iedId);
          rx.status = !subscribed ? 'Ignored'
            : packet.txLans.length && !packet.ingress.length ? 'VLAN Drop' : 'No path';
          // Model ordered LAN arrivals for one source MAC and one RCT sequence.
          // The second copy never enters the GOOSE filter or refreshes the TAL.
          const source = publisherIed?.macAddress ?? block.publisherIedId;
          for (const lan of packet.arrivals[node.iedId] ?? []) {
            pathCopies[lan] += 1;
            if (duplicateCopy(rx.seen, source, packet)) {
              pathDuplicates[lan] += 1;
              rx.duplicates += 1;
              rx.duplicate = lan;
              continue;
            }
            rx.seen = { source, sequence: packet.prpSequence, serial: runtime.serial };
            rx.first = lan;
            rx.rxCount += 1;
            rx.status = subscriberDecision(packet, block, subscribed, bindings.length > 0);
            if (firstForState || runtime.capture[0]?.context !== packet.context ||
              receivers[node.iedId]?.status !== rx.status || (rx.status === 'Accepted' && rx.deadline === undefined)) {
              recordSoe(runtime, 'Subscriber decision', `${node.iedName} · LAN ${lan} · ${rx.status}`, packet.stNum);
            }
            if (rx.status !== 'Accepted') continue;
            rx.acceptedCount += 1;
            rx.lastAccepted = packet;
            rx.deadline = runtime.now + packet.tal;
            rx.mappedTrip = bindings.some(binding =>
              isTripBinding(binding) && packet.payload[binding.key] === true);
            if (rx.mappedTrip && !testModeSub && !rx.tripFrame) {
              rx.tripFrame = packet;
              rx.tripStage = 1;
              rx.circuitDue = runtime.now + 10;
              runtime.visualEvent = packet;
              recordSoe(runtime, 'Trip input asserted', node.iedName, packet.stNum);
              logEvent(`${node.iedName}: mapped trip asserted`, 'WARN');
            }
          }
          packet.decisions[node.iedId] = rx.status;
          receivers[node.iedId] = rx;
        }
      }
      if (runtime.frame && runtime.capture[0] !== runtime.frame) {
        runtime.capture = [runtime.frame, ...runtime.capture].slice(0, 80);
      }
      runtime.receivers = receivers;
      if (changed) setSnapshot({ id: block.id, runtime: { ...runtime } });
      const deadline = Math.min(...Object.values(receivers).flatMap(rx =>
        [rx.deadline ?? Infinity, rx.circuitDue ?? Infinity]));
      const next = Math.min(publishingActive ? runtime.due : Infinity, deadline);
      if (Number.isFinite(next)) timer = window.setTimeout(tick, Math.max(1, next - runtime.now));
    }
    setSnapshot({ id: block.id, runtime: { ...runtime } });
    tick();
    return () => {
      runtime.now = performance.now() - started;
      window.clearTimeout(timer);
    };
  }, [circuitFault, gocb?.id, gocb?.confRev, gocb?.ndsCom, gocb?.testMode, gocb?.appId, gocb?.vlanId,
    gocb?.datSet, gocb?.minTimeMs, gocb?.maxTimeMs, gocb?.timeAllowedToLiveMs,
    playing, goEna, publishingActive, faultMode, lanAUp, lanBUp, networkLinks, transportKey,
    topologyNodes, subEnabledMap, testModeSub, dataset, publisherIed?.name, publisherIed?.macAddress, revision]);

  const handlePublishState = () => {
    if (!gocb || !dataset?.fcdas.some(member => memberKey(member) === stimulusKey)) return;
    const runtime = runtimes.current.get(gocb.id) ?? freshRuntime(gocb, dataset, publisherBay);
    const next = isStatusDataset ? (runtime.payload[stimulusKey] === 'CLOSED' ? 'OPEN' : 'CLOSED')
      : runtime.payload[stimulusKey] !== true;
    runtime.payload = { ...runtime.payload, [stimulusKey]: next };
    runtime.prevStNum = runtime.stNum;
    runtime.stNum = nextCounter(runtime.stNum);
    runtime.sqNum = 0;
    runtime.stateChangedAt = new Date().toISOString();
    runtime.sentCurrentState = false;
    runtime.due = runtime.now;
    recordSoe(runtime, 'Publisher input changed', `${stimulusKey} → ${next}`, runtime.stNum);
    runtimes.current.set(gocb.id, runtime);
    setSnapshot({ id: gocb.id, runtime: { ...runtime } });
    refresh(value => value + 1);
    logEvent(`${stimulusKey} → ${next}; stNum=${runtime.stNum}, next publication sqNum=0`, 'WARN');
  };

  const handleReset = () => {
    setPlaying(true);
    setSpeed(0.1);
    setDisabledPublishers({});
    setLanAUp(true);
    setLanBUp(true);
    setTestModeSub(false);
    setCircuitFault('NONE');
    setSubscriptions({});
    setFaults(gocb ? { [gocb.id]: 'NONE' } : {});
    runtimes.current.clear();
    visual.current = { progress: 0 };
    visualEventSeen.current = undefined;
    setAnimation(visual.current);
    setSnapshot(undefined);
    refresh(value => value + 1);
    logEvent('GOOSE Lab simulation reset', 'INFO');
  };

  const toggleSubscriber = (node: SubscriberNodeConfig) => {
    if (!gocb) return;
    const nextVal = !(subEnabledMap?.[node.iedId] ?? gocb.subscriberIedIds.includes(node.iedId));
    setSubscriptions(previous => ({
      ...previous,
      [gocb.id]: { ...previous[gocb.id], [node.iedId]: nextVal },
    }));
    if (!nextVal) {
      const runtime = runtimes.current.get(gocb.id);
      const rx = runtime?.receivers[node.iedId];
      if (runtime && rx) runtime.receivers = {
        ...runtime.receivers, [node.iedId]: { ...rx, deadline: undefined, lastAccepted: undefined },
      };
    }
    logEvent(`${node.iedName}: subscription ${nextVal ? 'enabled' : 'disabled'}`);
  };

  const evaluatedNodes = topologyNodes.map(node => {
    const subscribed = subEnabledMap?.[node.iedId] ?? gocb?.subscriberIedIds.includes(node.iedId) ?? false;
    const rx = current?.receivers[node.iedId];
    const valid = subscribed && rx?.deadline !== undefined;
    const bindings = membersFor(node.iedId);
    const inputs = valid ? bindings.map(({ key }) => `${key}=${rx?.lastAccepted?.payload[key] ?? '—'}`) : [];
    const statusLabel = !subscribed ? 'Ignored'
      : valid ? (rx?.status === 'Accepted' && publishingActive && anyLanUp ? 'Accepted' : 'Valid · awaiting refresh')
        : rx?.lastAccepted ? 'TAL Timeout'
          : !bindings.length ? 'ExtRef Unbound'
            : !publishingActive ? 'No Tx' : !anyLanUp ? 'Link Down' : rx?.status ?? 'Waiting';
    return {
      ...node, rx, subscribed, accepted: valid, inputs, statusLabel,
      hasTripBinding: bindings.some(isTripBinding),
      rxCount: rx?.rxCount ?? 0,
      portA: resolvePort(node.iedId, 'LAN_A'),
      portB: resolvePort(node.iedId, 'LAN_B'),
    };
  });

  const diagnosticNode = evaluatedNodes.find(node => node.iedId === diagnosticIedId)
    ?? evaluatedNodes.find(node => node.subscribed) ?? evaluatedNodes[0];
  const publisherStop = !goEna ? 'GoEna is OFF for this publisher.'
    : faultMode === 'TIMEOUT' ? 'Publishing is suppressed by the TAL timeout scenario.' : undefined;
  const rxChecks = activeTab === 'TROUBLESHOOTING' && gocb && diagnosticNode
    ? receptionChecks(gocb, frame?.context === transportKey ? frame : undefined, diagnosticNode, publisherStop) : [];
  const circuitNode = diagnosticIedId ? diagnosticNode : evaluatedNodes.find(node => node.hasTripBinding) ?? diagnosticNode;
  const blockingStep = rxChecks.find(step => step.status !== 'PASS');

  const currentStNum = current?.stNum ?? gocb?.stNum ?? 1;
  const prevStNum = current?.prevStNum ?? currentStNum;
  const simSqNum = current?.sqNum ?? 0;
  const goIdStr = gocb?.gocbName === 'gcbLine1ProtTrip' ? 'Line1_Trip' : gocb?.gocbName || 'Line1_Trip';

  const protocolScenarios: { value: GooseControlBlock['mismatchFault']; label: string; effect: string }[] = [
    { value: 'NONE', label: 'Healthy', effect: 'Both PRP paths are enabled and protocol fault injection is cleared.' },
    { value: 'VLAN_MISMATCH', label: 'VLAN ID mismatch', effect: 'The switch drops the frame at ingress.' },
    { value: 'APPID_MISMATCH', label: 'APPID mismatch', effect: 'The subscriber rejects the unexpected APPID.' },
    { value: 'CONFREV_MISMATCH', label: 'confRev mismatch', effect: 'The subscriber rejects the unexpected configuration revision.' },
    { value: 'DATASET_MISSING', label: 'Missing DataSet', effect: 'The subscriber rejects the invalid dataset.' },
    { value: 'TIMEOUT', label: 'GOOSE TAL timeout', effect: 'Publishing stops. Previously accepted data becomes invalid when its TAL expires.' },
  ];

  const manualConditions = [
    [!lanAUp && !lanBUp, 'BOTH_LANS_DOWN'],
    [!lanAUp && lanBUp, 'LAN_A_DOWN'],
    [lanAUp && !lanBUp, 'LAN_B_DOWN'],
    [!goEna, 'PUBLISHER_OFF'],
    [testModeSub, 'TRIP_BLOCKED'],
    [!isFaultFree, faultMode],
  ] as const;
  const activeConditions = manualConditions.filter(([active]) => active);
  const activeScenario = activeConditions.length > 1 ? 'CUSTOM' : activeConditions[0]?.[1] ?? 'NONE';
  const additionalScenarios = [
    { value: 'LAN_A_DOWN', label: 'PRP LAN A failure', effect: 'LAN B continues carrying GOOSE traffic.' },
    { value: 'LAN_B_DOWN', label: 'PRP LAN B failure', effect: 'LAN A continues carrying GOOSE traffic.' },
    { value: 'BOTH_LANS_DOWN', label: 'Both PRP LANs down', effect: 'Neither path delivers frames. Previously accepted data expires at TAL.' },
    { value: 'PUBLISHER_OFF', label: 'Publisher GoEna OFF', effect: 'The selected publisher stops transmitting.' },
    { value: 'TRIP_BLOCKED', label: 'Subscriber test mode', effect: 'Valid GOOSE frames can still be received while the lab trip output is blocked.' },
  ];
  const activeEffect = [...protocolScenarios, ...additionalScenarios].find(option => option.value === activeScenario)?.effect
    ?? 'Multiple conditions are active. Select a scenario to apply it on its own.';

  const applyFaultScenario = (value: string) => {
    if (!gocb || value === 'CUSTOM') return;
    const protocolFault = protocolScenarios.find(option => option.value === value);
    const scenario = protocolFault ?? additionalScenarios.find(option => option.value === value);
    if (!scenario) return;
    setFaults(previous => ({ ...previous, [gocb.id]: protocolFault?.value ?? 'NONE' }));
    setDisabledPublishers(previous => ({ ...previous, [gocb.id]: value === 'PUBLISHER_OFF' }));
    setLanAUp(value !== 'LAN_A_DOWN' && value !== 'BOTH_LANS_DOWN');
    setLanBUp(value !== 'LAN_B_DOWN' && value !== 'BOTH_LANS_DOWN');
    setTestModeSub(value === 'TRIP_BLOCKED');
    logEvent(`GOOSE scenario: ${scenario.label}`, value === 'NONE' ? 'INFO' : 'WARN');
  };

  // Exact port-seated SVG coordinates anchored directly inside Hirschmann RSP35 RJ45/SFP cages & Rear IED Port Insets
  const PUB_A = { x: 116, y: 178 };
  const PUB_B = { x: 130, y: 178 };
  const SWA_PORTS = switchA.ports;
  const SWB_PORTS = switchB.ports;
  const SUB_ANCHORS = [
    { xA: 172, xB: 202, y: 266 }, // IED_132_BC Rear Port Inset
    { xA: 314, xB: 344, y: 266 }, // IED_132_T1 Rear Port Inset
    { xA: 456, xB: 486, y: 266 }, // IED_33_F03 Rear Port Inset
    { xA: 598, xB: 628, y: 266 }, // IED_132_L2 Rear Port Inset
  ];

  const pathPubA = `M ${PUB_A.x} ${PUB_A.y} L ${PUB_A.x} 200 Q ${PUB_A.x} 208 ${PUB_A.x + 8} 208 L ${SWA_PORTS[0].x - 8} 208 Q ${SWA_PORTS[0].x} 208 ${SWA_PORTS[0].x} 200 L ${SWA_PORTS[0].x} ${SWA_PORTS[0].y}`;
  const pathPubB = `M ${PUB_B.x} ${PUB_B.y} L ${PUB_B.x} 214 Q ${PUB_B.x} 222 ${PUB_B.x + 8} 222 L ${SWB_PORTS[0].x - 8} 222 Q ${SWB_PORTS[0].x} 222 ${SWB_PORTS[0].x} 214 L ${SWB_PORTS[0].x} ${SWB_PORTS[0].y}`;

  const [animation, setAnimation] = useState<{ progress: number; frame?: LabFrame }>({ progress: 0 });
  const visual = useRef(animation);
  const visualEventSeen = useRef<LabFrame>();
  useEffect(() => {
    visual.current = { progress: 0 };
    visualEventSeen.current = undefined;
    setAnimation(visual.current);
  }, [transportKey]);

  useEffect(() => {
    if (!playing || !publishingActive || !gocb || !['NETWORK_TOPOLOGY', 'LIVE_SIMULATION'].includes(activeTab)) return;
    const blockId = gocb.id;
    let request: number;
    let previous: number | undefined;
    let lastPaint = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const advance = (time: number) => {
      request = window.requestAnimationFrame(advance);
      if (time - lastPaint < 30 && !reducedMotion) return;
      lastPaint = time;
      const runtime = runtimes.current.get(blockId);
      const event = runtime?.visualEvent;
      const state = visual.current;
      if (!state.frame || state.progress >= 1) {
        // The sampled animation can lag behind a protocol burst. Prefer its state-change frame once.
        const sample = runtime?.frame;
        const nextFrame = event?.context === transportKey && event !== visualEventSeen.current
          ? event : sample?.context === transportKey ? sample : undefined;
        if (nextFrame && nextFrame !== state.frame) {
          if (nextFrame === event) visualEventSeen.current = event;
          visual.current = { frame: nextFrame, progress: reducedMotion ? 1 : 0 };
        }
      } else {
        const elapsed = previous === undefined ? 0 : time - previous;
        visual.current = { ...state, progress: Math.min(1, state.progress + elapsed * speed / 1250) };
      }
      if (visual.current !== state) setAnimation(visual.current);
      previous = time;
    };
    request = window.requestAnimationFrame(advance);
  return () => window.cancelAnimationFrame(request);
  }, [playing, publishingActive, gocb?.id, speed, activeTab, transportKey]);

  const visualFrame = publishingActive && animation.frame?.context === transportKey ? animation.frame : undefined;
  const progress = animation.progress;
  const drawPacket = (pathId: string, progressAlongPath: number, lan: Lan, label?: string) => {
    const path = svgRef.current?.querySelector<SVGPathElement>(`#${pathId}`);
    if (!path || progressAlongPath < 0 || progressAlongPath >= 1) return null;
    const point = path.getPointAtLength(path.getTotalLength() * progressAlongPath);
    const blue = lan === 'A';
    const color = blue ? '#38BDF8' : '#C084FC';
    const badgeY = blue ? -21 : 7;
    return (
      <g transform={`translate(${point.x} ${point.y})`} pointerEvents="none">
        <circle r="4" fill={color} stroke="#FFFFFF" filter="url(#gGlow)" />
        {label && <>
          <rect x="-36" y={badgeY} width="72" height="14" rx="7" fill="#061827" stroke={color} />
          <text x="0" y={badgeY + 10} textAnchor="middle" fill="#F0FAFF" fontSize="7" fontWeight="800" fontFamily="monospace">{label}</text>
        </>}
      </g>
    );
  };
  const arrivalProgress = (lan: Lan, idx: number, iedId: string) => {
    const order = visualFrame?.arrivals[iedId]?.indexOf(lan) ?? -1;
    if (order < 0) return null;
    return drawPacket(`gl-${lan.toLowerCase()}-${idx}`, (progress - 0.27) / (0.23 + order * 0.07), lan);
  };

  const guidedExercises = [...protocolScenarios, ...additionalScenarios].filter(item => item.value !== 'NONE').map(item => {
    const subscribers = evaluatedNodes.filter(node => node.subscribed && membersFor(node.iedId).length > 0);
    const received = subscribers.some(node => node.accepted);
    const acceptedCurrent = frame?.context === transportKey && subscribers.some(node => frame.decisions[node.iedId] === 'Accepted');
    const expired = subscribers.some(node => node.statusLabel === 'TAL Timeout');
    const expectedRejection: Record<string, string> = { VLAN_MISMATCH: 'VLAN Drop', APPID_MISMATCH: 'APPID Mismatch', CONFREV_MISMATCH: 'confRev Mismatch', DATASET_MISSING: 'DataSet Mismatch' };
    const rejected = frame?.context === transportKey && subscribers.some(node => frame.decisions[node.iedId] === expectedRejection[item.value]);
    const conditionObserved = item.value === 'LAN_A_DOWN' ? !lanAUp && lanBUp && acceptedCurrent
      : item.value === 'LAN_B_DOWN' ? lanAUp && !lanBUp && acceptedCurrent
      : item.value === 'TRIP_BLOCKED' ? testModeSub && received
      : ['TIMEOUT', 'BOTH_LANS_DOWN', 'PUBLISHER_OFF'].includes(item.value) ? expired
      : rejected;
    return { id: item.value, label: item.label, expected: item.effect,
      checks: ['Check publisher GoEna and the active LAN paths.', 'Compare VLAN, APPID, confRev, DataSet and ExtRef; inspect the actual subscriber rejection or TAL expiry.', 'Clear the condition and wait for a newly accepted frame before verification.'],
      active: activeConditions.some(([, id]) => id === item.value), observed: conditionObserved,
      busy: subscribers.length === 0,
      recovered: activeScenario === 'NONE' && received && frame?.context === transportKey && subscribers.every(node => node.accepted && frame.decisions[node.iedId] === 'Accepted'),
      evidence: `GoEna ${goEna}; LAN A ${lanAUp}; LAN B ${lanBUp}; stNum ${currentStNum}; sqNum ${simSqNum}. ${evaluatedNodes.filter(node => node.subscribed).map(node => `${node.iedId}: ${node.statusLabel} / ${node.rx?.status || 'No frame'}`).join('; ')}`,
      inject: () => { setPlaying(true); applyFaultScenario(item.value); }, clear: () => applyFaultScenario('NONE'),
    };
  });

  return (
    <div style={{ backgroundColor: '#020B16', color: '#E2F1FC' }} className="space-y-2.5 pb-4 text-xs select-none">
      {/* 1. TOP HEADER BAR MATCHING REFERENCE */}
      <div
        className="rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(90deg, #041628 0%, #07223B 55%, #041628 100%)',
          borderColor: '#0E6A94',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            GOOSE Lab V2 — Multi-Subscriber Communication
          </h2>
          <p className="text-[11px] text-[#8BBCE0] mt-0.5">
            IEC 61850-8-1 | Publisher → Multiple Subscribers | Selective Acceptance (Configured Subscribers Only)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold">
          <span
            className="px-3 py-1 rounded-lg border flex items-center gap-1.5"
            style={{
              backgroundColor: playing && isFaultFree && goEna ? '#062E20' : '#3B0D15',
              borderColor: playing && isFaultFree && goEna ? '#22C55E' : '#EF4444',
              color: playing && isFaultFree && goEna ? '#4ADE80' : '#FCA5A5',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${playing && isFaultFree ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'}`} />
            Simulation: {playing ? (!goEna ? 'DISABLED' : isFaultFree ? 'RUNNING' : 'FAULT') : 'PAUSED'}
          </span>

          <span
            className="px-3 py-1 rounded-lg border"
            style={{
              backgroundColor: !anyLanUp ? '#3B0D15' : prpDegraded ? '#332206' : '#06263A',
              borderColor: !anyLanUp ? '#EF4444' : prpDegraded ? '#F59E0B' : '#00DFFF',
              color: !anyLanUp ? '#FCA5A5' : prpDegraded ? '#FCD34D' : '#7DD3FC',
            }}
          >
            PRP: {!anyLanUp ? 'LOST' : prpDegraded ? 'DEGRADED' : 'REDUNDANT'}
          </span>

          <button
            type="button"
            onClick={() => {
              setLanAUp((v) => {
                logEvent(`PRP LAN A switch link ${!v ? 'RESTORED (UP)' : 'FAILED (DOWN)'}`, !v ? 'INFO' : 'ERR');
                return !v;
              });
            }}
            className="px-3 py-1 rounded-lg border transition hover:brightness-110"
            style={{
              backgroundColor: lanAUp ? '#082F49' : '#3B0D15',
              borderColor: lanAUp ? '#38BDF8' : '#EF4444',
              color: lanAUp ? '#7DD3FC' : '#FCA5A5',
            }}
            title="Click to simulate PRP LAN A Failure"
          >
            LAN A: {lanAUp ? 'UP' : 'DOWN'}
          </button>

          <button
            type="button"
            onClick={() => {
              setLanBUp((v) => {
                logEvent(`PRP LAN B switch link ${!v ? 'RESTORED (UP)' : 'FAILED (DOWN)'}`, !v ? 'INFO' : 'ERR');
                return !v;
              });
            }}
            className="px-3 py-1 rounded-lg border transition hover:brightness-110"
            style={{
              backgroundColor: lanBUp ? '#3B0764' : '#3B0D15',
              borderColor: lanBUp ? '#C084FC' : '#EF4444',
              color: lanBUp ? '#F0ABFC' : '#FCA5A5',
            }}
            title="Click to simulate PRP LAN B Failure"
          >
            LAN B: {lanBUp ? 'UP' : 'DOWN'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#235B76] bg-[#071A2B] px-4 py-2">
        <label className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="font-bold text-[#D9EFFC]">Fault Scenario</span>
          <select
            className="w-full min-w-0 rounded-md border border-[#326985] bg-[#0B253A] px-2 py-1.5 text-sm font-semibold text-white sm:w-60"
            disabled={!gocb}
            value={activeScenario}
            onChange={event => applyFaultScenario(event.target.value)}
            aria-describedby="goose-fault-effect"
          >
            {activeScenario === 'CUSTOM' && <option value="CUSTOM" disabled>Custom — multiple conditions</option>}
            <optgroup label="GOOSE protocol">
              {protocolScenarios.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
            <optgroup label="PRP and device controls">
              {additionalScenarios.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
          </select>
        </label>
        <span id="goose-fault-effect" className="text-[#D0E6F5]">{activeEffect}</span>
      </div>

      {/* 2. SIX SUB-NAVIGATION TABS ROW */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'SCL_EDITOR', label: 'SCL Editor', icon: <FileCode2 className="w-3.5 h-3.5" /> },
            { id: 'ENGINEERING', label: 'Engineering', icon: <Settings className="w-3.5 h-3.5" /> },
            { id: 'NETWORK_TOPOLOGY', label: 'Network Topology', icon: <Network className="w-3.5 h-3.5" /> },
            { id: 'LIVE_SIMULATION', label: 'Live Simulation', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'PACKET_ANALYZER', label: 'Packet Analyzer', icon: <FileCode2 className="w-3.5 h-3.5" /> },
            { id: 'TRIP_CIRCUIT', label: 'Trip Circuit', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'PRP_DIAGNOSTICS', label: 'PRP Diagnostics', icon: <Network className="w-3.5 h-3.5" /> },
            { id: 'FAT_SAT', label: 'GOOSE FAT/SAT', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { id: 'DIAGNOSTICS', label: 'Diagnostics', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: 'TROUBLESHOOTING', label: 'Troubleshooting', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
            { id: 'EVENT_TIMELINE', label: 'Event Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => {
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition"
              style={{
                background: isAct ? 'linear-gradient(180deg, #00E5FF 0%, #00A6D6 100%)' : '#06182B',
                color: isAct ? '#02101F' : '#CFE6F7',
                borderColor: isAct ? '#38F2FF' : '#184468',
                boxShadow: isAct ? '0 0 16px rgba(0, 229, 255, 0.45)' : 'none',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN 3-COLUMN WORKSPACE (Matches Reference Screenshot Layout) */}
      {(activeTab === 'NETWORK_TOPOLOGY' || activeTab === 'LIVE_SIMULATION') && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[265px_minmax(0,1fr)_275px] gap-2.5 items-stretch">
            {/* LEFT COLUMN: GOOSE Publisher + GOOSE Subscribers (Configured) */}
            <div className="flex flex-col gap-2.5">
              {/* GOOSE Publisher Panel */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#00DFFF]" />
                    GOOSE Publisher
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!gocb) return;
                      setDisabledPublishers(previous => ({ ...previous, [gocb.id]: goEna }));
                      logEvent(`Publisher GoEna set to ${goEna ? 'FALSE (Disabled)' : 'TRUE (Publishing)'}`, goEna ? 'WARN' : 'INFO');
                    }}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                      goEna
                        ? 'bg-[#062E20] border-[#22C55E] text-[#4ADE80]'
                        : 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]'
                    }`}
                  >
                    GoEna: {goEna ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-3 space-y-2.5">
                  <select
                    value={gocb?.id}
                    onChange={(e) => setSelectedGocbId(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#020E1B] border border-[#1B4B72] text-[10.5px] font-mono text-[#BAE6FD]"
                  >
                    {gooseControlBlocks.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.publisherIedId} · {g.gocbName} ({g.appId})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2.5">
                    <img
                      src={publisherImg}
                      alt={gocb?.publisherIedName}
                      className="w-16 h-24 object-contain rounded bg-[#020D19] border border-[#163D5E] p-1 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="font-extrabold text-white text-xs truncate">
                        {publisherIed?.name || 'IED_132_L1'}
                      </div>
                      <div className="text-[10px] text-[#9ED8F6] truncate">
                        ({publisherIed?.model || '7SA87'})
                      </div>
                      <div
                        className="text-[10.5px] font-extrabold"
                        style={{ color: publishingActive ? '#4ADE80' : '#F87171' }}
                      >
                        {publishingActive ? '+ PUBLISHING' : '✕ STOPPED'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 font-mono text-[10px] border-t border-[#123952] pt-2">
                    {[
                      ['GCB', gocb?.gocbName || 'gcbLine1ProtTrip'],
                      ['DataSet', gocb?.datSet.split('$').pop() || 'DS_Line1_Trip'],
                      ['APPID', gocb?.appId || '0x0001'],
                      ['VLAN ID', `${gocb?.vlanId ?? 101} (Prio: ${gocb?.vlanPriority ?? 4})`],
                      ['MAC', gocb?.multicastMac || '01-0C-CD-01-00-01'],
                      ['confRev', `${gocb?.confRev ?? 1} · ${gocb?.minTimeMs ?? 4}/${gocb?.maxTimeMs ?? 1000}ms`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 border-b border-[#0F2C45] pb-0.5 last:border-b-0">
                        <span className="text-[#8BB3D4]">{k}</span>
                        <span className="text-white font-bold truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GOOSE Subscribers (Configured) Panel */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg flex-1">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#00DFFF]" />
                    GOOSE Subscribers (Configured)
                  </span>
                </div>
                <div className="p-2.5 space-y-2">
                  {evaluatedNodes.map((node) => (
                    <div
                      key={node.iedId}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border transition"
                      style={{
                        backgroundColor: node.subscribed ? '#062033' : '#031220',
                        borderColor: node.subscribed ? '#19688E' : '#12314A',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={node.imgSrc}
                          alt={node.vendorModel}
                          className="w-7 h-8 object-contain shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-[10.5px] truncate">
                            {node.iedName}{' '}
                            <span className="text-[#8AD8FF] font-normal">({node.shortModel})</span>
                          </div>
                          <div
                            className="text-[9.5px] font-bold"
                            style={{ color: node.subscribed ? '#4ADE80' : '#94A3B8' }}
                          >
                            {node.subscribed ? 'Subscribed ✓' : 'Not Subscribed'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={node.subscribed}
                        onClick={() => toggleSubscriber(node)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors border shrink-0 ${
                          node.subscribed
                            ? 'bg-[#22C55E] border-[#86EFAC]'
                            : 'bg-[#1E293B] border-[#475569]'
                        }`}
                      >
                        <span
                          className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            node.subscribed ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: Station Bus – Real Device Topology (PRP) */}
            <div
              className="rounded-xl border overflow-hidden shadow-xl flex flex-col"
              style={{
                borderColor: '#00DFFF',
                background: 'linear-gradient(180deg, #061A2E 0%, #030F1D 100%)',
                boxShadow: '0 0 20px rgba(0, 223, 255, 0.14)',
              }}
            >
              <div className="px-4 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] via-[#052038] to-[#07304A] flex items-center justify-center gap-2">
                <Layers className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-xs sm:text-sm font-extrabold text-white">
                  Station Bus – Real Device Topology (PRP)
                </span>
              </div>

              <div className="flex flex-1 flex-col overflow-x-auto p-2">
                <div className="m-auto w-[88%] min-w-[590px] max-w-[920px] shrink-0">
                  <svg
                    ref={svgRef}
                    viewBox="0 0 740 479"
                    className="w-full h-auto block select-none"
                    role="img"
                    aria-label="Station Bus Real Device PRP Topology with Publisher, Hirschmann Switches, and 4 Bay IEDs"
                  >
                    <defs>
                      <linearGradient id="rackWall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0C1724" />
                        <stop offset="50%" stopColor="#122130" />
                        <stop offset="100%" stopColor="#0A141F" />
                      </linearGradient>
                      <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94A3B8" />
                        <stop offset="50%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1E293B" />
                      </linearGradient>
                      <filter id="gGlow" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="2.4" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Metallic Industrial Relay Cabinet Interior */}
                    <rect x="0.75" y="0.75" width="738.5" height="477.5" rx="8" fill="url(#rackWall)" stroke="#1E3A52" strokeWidth="1.5" />
                    {/* Left & Right Vertical Rack Rails */}
                    <rect x="6" y="8" width="14" height="414" fill="#334155" stroke="#64748B" strokeWidth="1" />
                    <rect x="720" y="8" width="14" height="414" fill="#334155" stroke="#64748B" strokeWidth="1" />
                    {/* Horizontal DIN Mounting Rail behind bottom 4 relays */}
                    <rect x="20" y="310" width="700" height="22" fill="url(#dinRail)" stroke="#94A3B8" strokeWidth="0.8" />

                    {/* TOP-LEFT: Publisher IED (Siemens SIPROTEC 5 7SA87) */}
                    <image href={publisherImg} x="26" y="24" width="92" height="154" preserveAspectRatio="xMidYMid meet" style={{ cursor: "pointer" }} onClick={() => setInspectedDeviceId(publisherIed?.id || "IED-132-L1")} />
                    <text x="78" y="196" textAnchor="middle" fill="#9ED8F6" fontSize="9.5" fontWeight="700">Publisher</text>
                    <text x="78" y="209" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="monospace">
                      {publisherIed?.name || 'IED_132_L1'}
                    </text>
                    <text x="78" y="221" textAnchor="middle" fill="#7DD3FC" fontSize="9">
                      ({publisherIed?.model || '7SA87'})
                    </text>
                    {/* Rear Port Inset Callout */}
                    <rect x="108" y="160" width="32" height="24" rx="3" fill="#041526" stroke="#38BDF8" strokeWidth="1" />
                    <text x="124" y="170" textAnchor="middle" fill="#38BDF8" fontSize="6.5" fontWeight="800" fontFamily="monospace">REAR</text>
                    <text x="124" y="179" textAnchor="middle" fill="#E879F9" fontSize="6.5" fontWeight="800" fontFamily="monospace">A | B</text>

                    {/* TOP-CENTER: Switch A (LAN A) & Switch B (LAN B) — Hirschmann RSP35 */}
                    <text x="276" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800">Switch A (LAN A)</text>
                    <text x="276" y="51" textAnchor="middle" fill="#7DD3FC" fontSize="9.5">Hirschmann RSP35</text>
                    <image
                      href="assets/goose-lab/hirschmann-rsp35.png"
                      {...switchA.image}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={lanAUp ? 1 : 0.45}
                    />
                    <text x="276" y="170" textAnchor="middle" fill={lanAUp ? '#38BDF8' : '#FCA5A5'} fontSize="7.5" fontFamily="monospace">
                      {pubPortA.swName} · {pubPortA.swPort}
                    </text>

                    <text x="498" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800">Switch B (LAN B)</text>
                    <text x="498" y="51" textAnchor="middle" fill="#E879F9" fontSize="9.5">Hirschmann RSP35</text>
                    <image
                      href="assets/goose-lab/hirschmann-rsp35.png"
                      {...switchB.image}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={lanBUp ? 1 : 0.45}
                    />
                    <text x="498" y="170" textAnchor="middle" fill={lanBUp ? '#E879F9' : '#FCA5A5'} fontSize="7.5" fontFamily="monospace">
                      {pubPortB.swName} · {pubPortB.swPort}
                    </text>

                    {/* TOP-RIGHT LEGEND BOX (Exact Reference Match) */}
                    <rect x="614" y="20" width="98" height="156" rx="7" fill="#041526" stroke="#1B4B72" strokeWidth="1.2" />
                    <text x="624" y="37" fill="#FFFFFF" fontSize="10" fontWeight="800">Legend</text>
                    <line x1="624" y1="53" x2="646" y2="53" stroke="#38BDF8" strokeWidth="3" />
                    <text x="652" y="56" fill="#DCEEFB" fontSize="8">LAN A (PRP)</text>
                    <line x1="624" y1="73" x2="646" y2="73" stroke="#C084FC" strokeWidth="3" />
                    <text x="652" y="76" fill="#DCEEFB" fontSize="8">LAN B (PRP)</text>
                    <text x="624" y="97" fill="#00E5FF" fontSize="10" fontWeight="900">»»»</text>
                    <text x="652" y="95" fill="#DCEEFB" fontSize="7.5">GOOSE Frame</text>
                    <text x="652" y="104" fill="#7DD3FC" fontSize="6.8">(Multicast 0x88B8)</text>
                    <rect x="624" y="116" width="22" height="14" rx="4" fill="#062E20" stroke="#22C55E" strokeWidth="1.2" />
                    <text x="652" y="125" fill="#4ADE80" fontSize="7.3" fontWeight="700">Subscribed</text>
                    <rect x="624" y="142" width="22" height="14" rx="4" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
                    <text x="652" y="151" fill="#94A3B8" fontSize="7.3">Not Subscribed</text>

                    {/* PHYSICAL PRP LAN A (BLUE) & LAN B (VIOLET) PATCH CABLES */}
                    {/* Publisher -> Switch A (Blue) & Switch B (Violet) */}
                    <path id="gl-pub-a" d={pathPubA} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="3.2" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="gl-pub-b" d={pathPubB} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="3.2" strokeDasharray={lanBUp ? undefined : '5 3'} />

                    {visualFrame?.txLans.map(lan => (
                      <React.Fragment key={lan}>
                        {drawPacket(`gl-pub-${lan.toLowerCase()}`, progress / 0.27, lan,
                          `${lan} · PRP ${visualFrame.prpSequence}`)}
                      </React.Fragment>
                    ))}

                    {/* Switch A & Switch B -> 4 Bay IEDs */}
                    {evaluatedNodes.map((node, idx) => {
                      const swA = SWA_PORTS[idx + 1] ?? SWA_PORTS[4];
                      const swB = SWB_PORTS[idx + 1] ?? SWB_PORTS[4];
                      const sub = SUB_ANCHORS[idx];
                      if (!sub) return null;
                      const laneAY = 236 + idx * 4;
                      const laneBY = 250 + idx * 4;

                      const pA = `M ${swA.x} ${swA.y} L ${swA.x} ${laneAY - 6} Q ${swA.x} ${laneAY} ${sub.xA < swA.x ? swA.x - 6 : swA.x + 6} ${laneAY} L ${sub.xA < swA.x ? sub.xA + 6 : sub.xA - 6} ${laneAY} Q ${sub.xA} ${laneAY} ${sub.xA} ${laneAY + 6} L ${sub.xA} ${sub.y}`;
                      const pB = `M ${swB.x} ${swB.y} L ${swB.x} ${laneBY - 6} Q ${swB.x} ${laneBY} ${sub.xB < swB.x ? swB.x - 6 : swB.x + 6} ${laneBY} L ${sub.xB < swB.x ? sub.xB + 6 : sub.xB - 6} ${laneBY} Q ${sub.xB} ${laneBY} ${sub.xB} ${laneBY + 6} L ${sub.xB} ${sub.y}`;

                      return (
                        <g key={node.iedId}>
                          <path
                            id={`gl-a-${idx}`}
                            d={pA}
                            fill="none"
                            stroke={lanAUp ? '#38BDF8' : '#EF4444'}
                            strokeWidth="2.8"
                            strokeDasharray={lanAUp ? undefined : '5 3'}
                            opacity={node.subscribed ? 1 : 0.72}
                          />
                          <path
                            id={`gl-b-${idx}`}
                            d={pB}
                            fill="none"
                            stroke={lanBUp ? '#C084FC' : '#EF4444'}
                            strokeWidth="2.8"
                            strokeDasharray={lanBUp ? undefined : '5 3'}
                            opacity={node.subscribed ? 1 : 0.72}
                          />

                          {arrivalProgress('A', idx, node.iedId)}
                          {arrivalProgress('B', idx, node.iedId)}
                        </g>
                      );
                    })}

                    {/* RJ45 / SFP Physical Plug Connectors Seated Directly in Switch A & Switch B Ports */}
                    {SWA_PORTS.map((pt, i) => (
                      <rect key={`plug-a-${i}`} x={pt.x - 3.5} y={pt.y - 4} width="7" height="8" rx="1.5" fill={lanAUp ? '#38BDF8' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                    ))}
                    {SWB_PORTS.map((pt, i) => (
                      <rect key={`plug-b-${i}`} x={pt.x - 3.5} y={pt.y - 4} width="7" height="8" rx="1.5" fill={lanBUp ? '#C084FC' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                    ))}

                    {/* BOTTOM ROW: 4 REALISTIC TRANSPARENT DIN-RAIL BAY IEDs WITH REAR PORT INSETS */}
                    {evaluatedNodes.map((node, idx) => {
                      const cx = 187 + idx * 142;
                      const x = cx - 54;
                      const sub = SUB_ANCHORS[idx];
                      if (!sub) return null;
                      const isAcc = node.accepted;
                      const isErr = node.subscribed && !node.accepted;
                      return (
                        <g key={`dev-${node.iedId}`} onClick={() => setInspectedDeviceId(node.iedId)} style={{ cursor: 'pointer' }}>
                          {/* Rear Ethernet Port Inset (PRP A & PRP B) cleanly above unobstructed front panel */}
                          <rect x={cx - 32} y="256" width="64" height="16" rx="3" fill="#041526" stroke="#1E4E74" strokeWidth="1" />
                          <circle cx={sub.xA} cy={sub.y} r="3.4" fill={lanAUp ? '#38BDF8' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                          <circle cx={sub.xB} cy={sub.y} r="3.4" fill={lanBUp ? '#C084FC' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                          <text x={cx} y="266.5" textAnchor="middle" fill="#9ED8F6" fontSize="6.5" fontWeight="800" fontFamily="monospace">PRP A | B</text>

                          {/* Unobstructed Transparent Front-Panel Hardware Image (Zero Black Box!) */}
                          <image
                            href={node.imgSrc}
                            x={x + 4}
                            y="274"
                            width="100"
                            height="88"
                            preserveAspectRatio="xMidYMid meet"
                          />
                          <text x={cx} y="375" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="monospace">
                            {node.iedName}
                          </text>
                          <text x={cx} y="387" textAnchor="middle" fill="#9ED8F6" fontSize="8.5">
                            ({node.shortModel})
                          </text>
                          <rect
                            x={x + 8}
                            y="393"
                            width="92"
                            height="18"
                            rx="5"
                            fill={isAcc ? '#063B23' : isErr ? '#3B0D15' : '#1E293B'}
                            stroke={isAcc ? '#22C55E' : isErr ? '#EF4444' : '#64748B'}
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y="405"
                            textAnchor="middle"
                            fill={isAcc ? '#4ADE80' : isErr ? '#FCA5A5' : '#CBD5E1'}
                            fontSize="8.6"
                            fontWeight="800"
                          >
                            {node.statusLabel === 'Accepted' ? 'ACCEPTED ✓' : isAcc ? 'VALID · HOLD' : node.statusLabel.toUpperCase()}
                          </text>
                          {visualFrame && progress >= 0.5 && (() => {
                            const [first, duplicate] = visualFrame.arrivals[node.iedId] ?? [];
                            return first && <text x={cx} y="424" textAnchor="middle" fill="#A5E6FF" fontSize="7" fontFamily="monospace">
                              {duplicate && progress >= 0.57 ? `${first} first · ${duplicate} DUP DISCARDED` : `LAN ${first} first copy`}
                            </text>;
                          })()}
                          {(node.rx?.tripFrame || (node.subscribed && node.hasTripBinding)) && (
                            <g role="group" aria-label={`${node.iedName} simulated protection`}>
                              <rect x={cx - 59} y="434" width="118" height="36" rx="5"
                                fill={node.rx?.tripFrame ? '#48151F' : '#10283C'}
                                stroke={node.rx?.tripFrame ? '#F87171' : '#477694'} />
                              <text x={cx} y="448" textAnchor="middle" fill={node.rx?.tripFrame ? '#FECACA' : '#DBEAFE'}
                                fontSize="8.2" fontWeight="800">
                                {node.rx?.tripFrame ? 'IED TRIPPED' : testModeSub ? 'TRIP OUTPUT BLOCKED' : 'TRIP READY'}
                              </text>
                              <text x={cx} y="462" textAnchor="middle" fill="#FFFFFF" fontSize="7.8" fontWeight="800">
                                {node.rx?.breakerOpen ? 'LAB BREAKER OPEN'
                                  : node.rx?.tripFrame ? 'LAB BREAKER OPENING' : 'LAB BREAKER CLOSED'}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Interactive Device & Port Inspection Panel (Opens when any device is clicked) */}
              {inspectedDeviceId && (() => {
                const isPub = inspectedDeviceId === (publisherIed?.id || 'IED-132-L1');
                const subNode = evaluatedNodes.find((n) => n.iedId === inspectedDeviceId);
                const matchedIed = ieds.find((x) => x.id === inspectedDeviceId);
                const pA = isPub ? pubPortA : subNode?.portA || resolvePort(inspectedDeviceId, 'LAN_A');
                const pB = isPub ? pubPortB : subNode?.portB || resolvePort(inspectedDeviceId, 'LAN_B');
                return (
                  <div className="border-t border-[#00DFFF] bg-[#020E1C] px-3 py-2.5 text-[10.5px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-[#00E5FF]">
                        Device &amp; Port Inspector — {matchedIed?.name || subNode?.iedName || inspectedDeviceId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectedDeviceId(null)}
                        className="px-2 py-0.5 rounded bg-[#07243D] text-[#7DD3FC] hover:text-white font-bold"
                      >
                        Close ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 font-mono text-[9.5px]">
                      {[
                        ['Manufacturer', matchedIed?.vendor || (subNode?.vendorModel.split(' ')[0] ?? 'Not available')],
                        ['Model', matchedIed?.model || subNode?.shortModel || 'Not available'],
                        ['IED ID', matchedIed?.name || subNode?.iedName || inspectedDeviceId],
                        ['Comm Interface', '100BASE-FX / Rear Ethernet'],
                        ['PRP Capability', matchedIed?.nodeType || 'DANP (Dual-Attached)'],
                        ['LAN A Port', `${pA.iedPort} → ${pA.swName}/${pA.swPort}`],
                        ['LAN B Port', `${pB.iedPort} → ${pB.swName}/${pB.swPort}`],
                        ['Role', isPub ? 'GOOSE Publisher' : subNode?.subscribed ? 'GOOSE Subscriber' : 'Station-Bus IED (Non-Sub)'],
                        ['Subscription', isPub ? 'Publishing (GoEna=' + (goEna ? 'ON' : 'OFF') + ')' : subNode?.subscribed ? 'Subscribed' : 'Not Subscribed'],
                        ['Last GOOSE Frame', `stNum=${currentStNum}, sqNum=${simSqNum}`],
                        ['Status', isPub ? (publishingActive ? 'ACTIVE' : 'STOPPED') : subNode?.statusLabel || 'Unknown'],
                      ].map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded bg-[#041628] border border-[#164463]">
                          <div className="text-[8.5px] text-[#8BB3D4] font-sans">{k}</div>
                          <div className="font-bold text-white truncate">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT COLUMN: GOOSE Message Details (Live) + Animation Control + Status Summary */}
            <div className="flex flex-col gap-2.5">
              {/* GOOSE Message Details (Live) */}
              <section
                aria-labelledby="goose-live-message-heading"
                className="rounded-xl border border-[#0E6A94] bg-[#071A2B] overflow-hidden shadow-lg"
                style={{ '--sas-surface-override': '#071A2B', '--sas-surface-blur': 'none' } as React.CSSProperties}
              >
                <div className="px-3 py-2.5 border-b border-[#236184] bg-[#0C2940]">
                  <h3 id="goose-live-message-heading" className="flex items-center gap-2 text-sm font-bold text-white">
                    <Radio className="w-4 h-4 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                    GOOSE Message Details (Live)
                  </h3>
                </div>
                <dl className="px-3 py-1 text-[13px] leading-5">
                  {[
                    ['goID', goIdStr],
                    ['gocbRef', gocb?.gocbName || 'gcbLine1ProtTrip'],
                    ['datSet', gocb?.datSet.split('$').pop() || 'DS_Line1_Trip'],
                    ['stNum', String(currentStNum)],
                    ['sqNum', String(simSqNum)],
                    ['confRev', String(gocb?.confRev ?? 1)],
                    ['TAL', `${gocb?.timeAllowedToLiveMs ?? 2000} ms`],
                    ['State time', current?.stateChangedAt ?? '—'],
                    ['Next interval', `${current?.interval ?? '—'} ms`],
                    ['Payload', `${frame?.entries ?? dataset?.fcdas.length ?? 0} DataSet entries`],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-2 border-b border-[#25445C] py-1.5 last:border-b-0">
                      <dt className="font-semibold text-[#BCD9EB]">{k}</dt>
                      <dd className="m-0 font-mono font-semibold text-white [overflow-wrap:anywhere]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Animation Control */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#00DFFF]" />
                    Animation Control
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <button
                    type="button"
                    onClick={handlePublishState}
                    className="w-full py-1.5 rounded-lg border border-[#F59E0B] bg-[#332005] text-[#FDE68A] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#FACC15]" />
                    {isStatusDataset ? 'Publish Simulated CB Status' : current?.payload[stimulusKey] === true
                      ? 'Publish Protection Reset' : stimulusKey === 'RBRF1.OpEx' ? 'Publish Breaker Failure (50BF)'
                        : stimulusKey === 'PTOC1.Str' ? 'Publish Protection Pickup' : 'Publish Trip'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      className="py-1.5 rounded-lg border border-[#1E5680] bg-[#072138] text-white font-bold flex items-center justify-center gap-1.5 hover:border-[#00DFFF]"
                    >
                      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {playing ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-1.5 rounded-lg border border-[#1E5680] bg-[#072138] text-white font-bold flex items-center justify-center gap-1.5 hover:border-[#00DFFF]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-[11px] text-[#9BC0DF] font-semibold">Speed :</span>
                    <div className="flex gap-1.5 flex-1 justify-end">
                      {([0.1, 0.25, 0.5, 1, 2, 4] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeed(s)}
                          className="px-3 py-1 rounded-md border text-[11px] font-extrabold transition"
                          style={{
                            backgroundColor: speed === s ? '#00DFFF' : '#061B2E',
                            color: speed === s ? '#02101F' : '#CFE6F7',
                            borderColor: speed === s ? '#38F2FF' : '#1E4E74',
                          }}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg flex-1">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Status Summary
                  </span>
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  {[
                    { label: 'GOOSE Publishing', ok: publishingActive, text: publishingActive ? 'Active' : 'Stopped' },
                    { label: 'Delivery (LAN A)', ok: lanAUp && publishingActive && !!frame?.ingress.includes('A'), text: !lanAUp ? 'DOWN' : !publishingActive ? 'NO TX' : frame?.ingress.includes('A') ? 'OK' : 'NO DELIVERY' },
                    { label: 'Delivery (LAN B)', ok: lanBUp && publishingActive && !!frame?.ingress.includes('B'), text: !lanBUp ? 'DOWN' : !publishingActive ? 'NO TX' : frame?.ingress.includes('B') ? 'OK' : 'NO DELIVERY' },
                    ...evaluatedNodes.map((n) => ({
                      label: n.iedName,
                      ok: n.accepted,
                      muted: !n.subscribed,
                      text: n.subscribed ? n.statusLabel : 'Not Subscribed',
                    })),
                      ...evaluatedNodes.filter(n => n.rx?.tripFrame).map(n => ({
                        label: `${n.iedName} lab breaker`,
                        ok: false,
                        text: n.rx?.breakerOpen ? 'OPEN' : 'OPENING',
                      })),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[#DCEEFB]">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: row.ok ? '#22C55E' : (row as { muted?: boolean }).muted ? '#38BDF8' : '#EF4444',
                          }}
                        />
                        {row.label}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          color: row.ok ? '#4ADE80' : (row as { muted?: boolean }).muted ? '#94A3B8' : '#F87171',
                        }}
                      >
                        {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <section aria-label="GOOSE badge flow" className="rounded-xl border border-[#0E6A94] bg-[#041626] p-3">
            <h3 className="font-extrabold text-white">Publisher → Network → Subscriber → Trip → Breaker → SCADA</h3>
            <p className="mt-1 text-[#9ED8F6]">Lab-only outputs. SCADA indication follows breaker feedback in the demonstration.</p>
            {evaluatedNodes.filter(node => node.subscribed).map(node => {
              const [first, duplicate] = visualFrame?.arrivals[node.iedId] ?? [];
              const visible = progress >= 0.57;
              const tripFrame = node.rx?.tripFrame;
              const tripPending = tripFrame && visualFrame && visualFrame.serial <= tripFrame.serial;
              const trip = tripFrame && node.rx?.mappedTrip && node.accepted && (!tripPending || progress >= 0.66);
              const tripText = testModeSub ? 'Output blocked'
                : trip ? 'Trip asserted' : tripFrame && !tripPending && node.accepted ? 'Trip input reset' : '—';
              const breaker = node.rx?.breakerOpen && (!tripPending || progress >= 0.77);
              const alarm = node.rx?.alarm && (!tripPending || progress >= 0.88);
              const steps = [
                ['Publisher', !goEna ? 'GoEna OFF' : !publishingActive ? 'TX paused by timeout fault' : visualFrame ? `st ${visualFrame.stNum} · sq ${visualFrame.sqNum}` : 'Waiting', !!visualFrame],
                ['Network', visible && first ? `LAN ${first} first${duplicate ? ` · ${duplicate} duplicate discarded` : ''}`
                  : visible && visualFrame?.txLans.length && !visualFrame.ingress.length ? 'VLAN drop'
                    : visible ? 'No delivery' : '—', visible && !!first],
                ['Subscriber', visible && visualFrame ? visualFrame.decisions[node.iedId] : node.statusLabel,
                  visible && visualFrame?.decisions[node.iedId] === 'Accepted'],
                ['Trip', tripText, !!trip && !testModeSub],
                ['Breaker', breaker ? 'OPEN · 52a=0 / 52b=1' : '—', !!breaker],
                ['SCADA', alarm ? 'Trip alarm · CB OPEN' : '—', !!alarm],
              ] as const;
              return (
                <div key={node.iedId} className="mt-2">
                  <div className="font-mono font-bold text-[#BAE6FD]">{node.iedName}</div>
                  <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
                    {steps.map(([label, value, active]) => (
                      <div key={label} className={`min-w-0 rounded-md border px-2 py-1 transition-colors motion-reduce:transition-none ${active ? 'border-[#38BDF8] bg-[#073451]' : 'border-[#153B57] bg-[#030F1D]'}`}>
                        <div className="font-bold text-[#8AD8FF]">{label}</div>
                        <div className="break-words text-white">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* 4. BOTTOM 2-COLUMN ROW: GOOSE Transmission Timeline + Subscriber Response Table */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.12fr] gap-2.5">
            {/* Bottom Left: GOOSE Transmission Timeline */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#00DFFF]" />
                  GOOSE Transmission Timeline
                </span>
                <span className="font-mono text-[10px] text-[#7DD3FC]">
                  MinTime: {gocb?.minTimeMs ?? 4}ms · MaxTime: {gocb?.maxTimeMs ?? 1000}ms
                </span>
              </div>

              <div className="p-3 space-y-2 font-mono text-[10px]">
                {/* stNum Row */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">stNum</span>
                  <div className="grid grid-cols-[26%_74%] gap-1">
                    <div className="rounded bg-[#0A2540] border border-[#1E5680] text-center py-1 text-[#BAE6FD] font-bold">
                      {prevStNum}
                    </div>
                    <div className="rounded bg-[#063A22] border border-[#22C55E] px-2.5 py-1 text-[#4ADE80] font-extrabold">
                      {currentStNum} ({isStatusDataset ? 'CB Status' : 'Trip'})
                    </div>
                  </div>
                </div>

                {/* sqNum Row */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">sqNum</span>
                  <div className="flex items-center justify-between gap-1 bg-[#031222] border border-[#123952] rounded px-2 py-1 overflow-x-auto">
                    <span className="text-[#4ADE80] font-extrabold">{simSqNum}</span>
                    <span className="text-[#BAE6FD]">
                      {current?.sentCurrentState ? `Next retransmission interval: ${current.interval} ms` : 'Next publication: sqNum 0'}
                    </span>
                  </div>
                </div>

                {/* GOOSE Tx Retransmission Pulse Line */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">GOOSE Tx</span>
                  <svg viewBox="0 0 500 26" className="w-full h-6">
                    <line x1="0" y1="13" x2="494" y2="13" stroke="#1E4E74" strokeWidth="1.5" />
                    <line x1="128" y1="0" x2="128" y2="26" stroke="#FACC15" strokeWidth="1.5" strokeDasharray="3 2" />
                    {[20, 48, 76, 104, 134, 146, 162, 184, 212, 248, 290, 340, 396, 456].map((x, idx) => (
                      <rect
                        key={x}
                        x={x}
                        y="5"
                        width="4"
                        height="16"
                        rx="1.5"
                        fill={idx >= 4 ? (publishingActive ? '#22C55E' : '#EF4444') : '#00DFFF'}
                      />
                    ))}
                  </svg>
                </div>

                {/* t (ms) Axis */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2 text-[9.5px] text-[#8BB3D4]">
                  <span>t (ms)</span>
                  <div className="flex justify-between">
                    {['-50', '0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'].map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Right: Subscriber Response (Current State) */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-[#00DFFF]" />
                  Subscriber Response (Current State)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                      <th className="py-1.5 px-3">IED</th>
                      <th className="py-1.5 px-2">Subscription</th>
                      <th className="py-1.5 px-2">Unique Rx / GOOSE Accepted / Duplicate</th>
                      <th className="py-1.5 px-2">Accept</th>
                      <th className="py-1.5 px-2">Mapped inputs</th>
                      <th className="py-1.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {evaluatedNodes.map((n) => (
                      <tr key={n.iedId} className="border-b border-[#123952] last:border-b-0 hover:bg-[#072035]">
                        <td className="py-2 px-3 font-bold text-white">{n.iedName}</td>
                        <td className="py-2 px-2">
                          <span className={n.subscribed ? 'text-[#4ADE80] font-bold' : 'text-[#F87171]'}>
                            {n.subscribed ? '✓ Yes' : '✕ No'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#BAE6FD]">{n.rxCount} / {n.rx?.acceptedCount ?? 0} / {n.rx?.duplicates ?? 0}</td>
                        <td className="py-2 px-2">
                          <span className={n.accepted ? 'text-[#38BDF8] font-bold' : 'text-[#94A3B8]'}>
                            {n.accepted ? '✓ Yes' : '— No'}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={n.accepted ? 'text-[#4ADE80] font-bold' : 'text-[#94A3B8]'}>
                            {n.inputs.join(' · ') || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className="font-extrabold"
                            style={{
                              color: n.accepted ? '#4ADE80' : n.subscribed ? '#F87171' : '#94A3B8',
                            }}
                          >
                            {n.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ENGINEERING & FAULT INJECTION TAB */}
      {(activeTab === 'ENGINEERING' || activeTab === 'DIAGNOSTICS') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              Fault Injection &amp; Diagnostics Controls
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#163D5E] bg-[#031220] cursor-pointer">
                <span>Subscriber Test Mode (block lab trip output)</span>
                <input
                  type="checkbox"
                  checked={testModeSub}
                  onChange={(e) => {
                    setTestModeSub(e.target.checked);
                    logEvent(`Subscriber Test Mode ${e.target.checked ? 'ENABLED' : 'DISABLED'}`, 'WARN');
                  }}
                  className="accent-[#00DFFF]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-2.5">
            <h3 className="text-sm font-extrabold text-white">Port-to-Port PRP Physical Mapping</h3>
            <div className="space-y-2 font-mono text-[10.5px]">
              {evaluatedNodes.map((n) => (
                <div key={n.iedId} className="p-2.5 rounded-lg bg-[#020E1B] border border-[#123952] space-y-1">
                  <div className="text-white font-bold">{n.iedName} ({n.vendorModel})</div>
                  <div className="text-[#38BDF8]">
                    LAN A: {publisherIed?.name}/{pubPortA.iedPort} → {pubPortA.swName}/{pubPortA.swPort} → {n.iedName}/{n.portA.iedPort}
                  </div>
                  <div className="text-[#E879F9]">
                    LAN B: {publisherIed?.name}/{pubPortB.iedPort} → {pubPortB.swName}/{pubPortB.swPort} → {n.iedName}/{n.portB.iedPort}
                  </div>
                  {gocb?.extRefs.filter(ref => ref.subscriberIedId === n.iedId).map(ref => {
                    const matches = datasetMember(dataset, publisherIed?.name ?? '', ref);
                    return <div key={`${ref.intAddr}:${ref.srcRef}`} className={ref.bound && matches ? 'break-all text-[#86EFAC]' : 'break-all text-[#FCA5A5]'}>
                      {ref.srcRef} → {ref.intAddr} · {ref.bound && matches ? 'Bound' : matches ? 'Disabled' : 'Source outside dataset'}
                    </div>;
                  })}
                  {n.subscribed && !gocb?.extRefs.some(ref => ref.subscriberIedId === n.iedId) &&
                    <div className="text-[#FCA5A5]">No ExtRef configured</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div hidden={activeTab !== 'SCL_EDITOR'}><SclEngineeringEditor /></div>

      {/* PACKET ANALYZER TAB */}
      {activeTab === 'PACKET_ANALYZER' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white">IEC 61850-8-1 GOOSE Layer-2 Frame &amp; ASN.1 BER Dissector</h3>
          <p className="text-[#9ED8F6]">Simulated frame fields. Latest transmission is retained during silence.</p>
          <pre className="p-3 rounded-lg bg-[#020C17] border border-[#164463] font-mono text-[11px] text-[#7DD3FC] overflow-x-auto leading-relaxed">
{!frame ? 'Waiting for the first simulated publication.' :
`TX: ${!goEna ? 'GoEna OFF' : !publishingActive ? 'Suppressed (timeout test)' : playing ? 'Publishing' : 'Paused'}
Ethernet II, Src: ${publisherIed?.macAddress ?? 'Unknown'}, Dst: ${gocb?.multicastMac} (GOOSE multicast)
802.1Q VLAN: ${frame.vlan} (configured ${gocb?.vlanId}), PCP: ${gocb?.vlanPriority}
Type: IEC 61850/GOOSE (0x88b8)
APPID: ${frame.appId} (configured ${gocb?.appId}) | Reserved1: ${frame.simulation ? '0x8000' : '0x0000'} | Reserved2: 0x0000
PRP sequence: ${frame.prpSequence} | TX LANs: ${frame.txLans.join(', ') || 'none'} | Switch ingress: ${frame.ingress.join(', ') || 'no delivery'}
goosePdu:
  gocbRef: ${gocb?.gocbRef}
  timeAllowedtoLive: ${frame.tal} ms
  datSet: ${frame.dataSet} (configured ${gocb?.datSet})
  goID: ${goIdStr}
  t: ${frame.t}
  stNum: ${frame.stNum} | sqNum: ${frame.sqNum} | simulation: ${frame.simulation} | confRev: ${frame.confRev} (configured ${gocb?.confRev}) | ndsCom: ${frame.ndsCom}
  numDatSetEntries: ${frame.entries}
  allData (simulated): ${JSON.stringify(frame.payload)}
Receiver filter:
${evaluatedNodes.filter(node => node.subscribed).map(node => {
  const rx = node.rx;
  return `  ${node.iedName}: ${rx?.first ? `LAN ${rx.first} first; ` : ''}${rx?.duplicate ? `LAN ${rx.duplicate} duplicate discarded; ` : ''}${rx?.status ?? 'No Rx'} · supervision: ${node.statusLabel}`;
}).join('\n')}`}
          </pre>
          {gocb && current && <PacketComparison key={gocb.id} history={current.capture} block={gocb}
            sourceMac={publisherIed?.macAddress} goId={goIdStr} subscribers={topologyNodes} />}
        </div>
      )}

      {activeTab === 'TROUBLESHOOTING' && (
        <section className="space-y-3 rounded-xl border border-[#235B76] bg-[#071A2B] p-4"
          style={{ '--sas-surface-override': '#071A2B' } as React.CSSProperties}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">GOOSE Receive Troubleshooting</h3>
              <p className="mt-1 text-[#A9C8DD]">Select a subscriber and follow the first step marked FAIL.</p>
            </div>
            {diagnosticNode && (
              <label className="grid w-full gap-1 font-semibold text-[#D7EEFD] sm:w-64">
                Subscriber IED
                <select className="w-full min-w-0 rounded-md border border-[#326985] px-2 py-1.5 text-sm"
                  value={diagnosticNode.iedId} onChange={event => setDiagnosticIedId(event.target.value)}>
                  {evaluatedNodes.map(node => (
                    <option key={node.iedId} value={node.iedId}>{node.iedName}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {diagnosticNode && rxChecks.length > 0 ? (
            <>
              <div className="rounded-md border border-[#326985] bg-[#0C2538] px-3 py-2 leading-5">
                <p className={blockingStep?.status === 'FAIL' ? 'font-bold text-[#FECACA]' : 'font-bold text-[#BFEADF]'}>
                  {blockingStep?.status === 'FAIL' ? `First failure: ${blockingStep.title}`
                    : blockingStep ? `Waiting: ${blockingStep.title}` : 'GOOSE reception confirmed'}
                </p>
                <p className="text-[#D7EEFD]">
                  Supervision: {diagnosticNode.statusLabel} · Unique Rx: {diagnosticNode.rxCount} · Accepted: {diagnosticNode.rx?.acceptedCount ?? 0}
                </p>
                <p className="text-[#A9C8DD]">Counters are cumulative for the selected publisher and subscriber.</p>
                {!blockingStep && (
                  <p className="text-[#D7EEFD]">
                    {testModeSub ? 'Subscriber Test Mode is active. Trip output is blocked.'
                      : diagnosticNode.hasTripBinding ? 'If the breaker does not operate, check the mapped trip input and lab breaker state in Network Topology.'
                        : 'This subscriber has no trip output mapped for this DataSet.'}
                  </p>
                )}
              </div>
              <ol className="space-y-2">
                {rxChecks.map((step, index) => (
                  <li key={step.title} className="rounded-md border border-[#25445C] bg-[#061522] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-white">{index + 1}. {step.title}</h4>
                      <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${
                        step.status === 'PASS' ? 'border-[#30654D] text-[#86EFAC]'
                          : step.status === 'FAIL' ? 'border-[#85424A] text-[#FECACA]' : 'border-[#40576C] text-[#B8CFE0]'
                      }`}>{step.status}</span>
                    </div>
                    <p className="mt-1 break-words leading-5 text-[#D7EEFD]">{step.evidence}</p>
                    {step.action && <p className="mt-1 leading-5 text-[#9ACBE8]">{step.action}</p>}
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="text-[#D7EEFD]">Select a GoCB with a subscriber in Network Topology.</p>}
        </section>
      )}

      {activeTab === 'TRIP_CIRCUIT' && (
        <section className={panelClass}>
          <h3 className="text-base font-bold text-white">GOOSE to Breaker Trip Circuit</h3>
          <p className="text-[#B6D4EA]">Simulated protection output, DC trip circuit and auxiliary contacts. Reset the lab to repeat a completed trip.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>Trip circuit subscriber<select className={fieldClass} value={circuitNode?.iedId ?? ''} onChange={event => setDiagnosticIedId(event.target.value)}>
              {evaluatedNodes.map(node => <option key={node.iedId} value={node.iedId}>{node.iedName}</option>)}
            </select></label>
            <label>Circuit condition<select className={fieldClass} value={circuitFault}
              onChange={event => setCircuitFault(event.target.value as CircuitFault)}>
              {circuitFaults.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={actionClass} disabled={!playing || !circuitNode?.hasTripBinding}
              onClick={handlePublishState}>{current?.payload[stimulusKey] === true ? 'Clear trip stimulus' : 'Publish trip stimulus'}</button>
            <button type="button" className={actionClass} onClick={handleReset}>Reset lab</button>
          </div>
          {circuitNode && <>
            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {tripStages.map((stage, index) => {
                const reached = index === 0 ? circuitNode.accepted || !!circuitNode.rx?.tripFrame : (circuitNode.rx?.tripStage ?? 0) >= index;
                const blocked = index === (circuitNode.rx?.tripStage ?? 0) + 1 && !!circuitNode.rx?.circuitFailure;
                return <li key={stage} style={{ animationDelay: `${index * 100}ms` }} className={`rounded-md border px-3 py-2 transition-colors duration-300 motion-reduce:transition-none ${reached && index > 0 ? 'motion-safe:animate-[pulse_0.7s_ease-out_1]' : ''} ${
                  blocked ? 'border-red-400 bg-[#401722] text-[#FECACA]' : reached ? 'border-emerald-400 bg-[#12362E] text-[#A7F3D0]' : 'border-[#25445C] bg-[#061522] text-[#D7EEFD]'
                }`}>
                  <span className="block font-bold">{index + 1}. {stage}</span>
                  <span>{blocked ? 'Blocked' : reached ? 'Reached' : 'Waiting'}</span>
                </li>;
              })}
            </ol>
            <p className="text-white">Lab breaker: {circuitNode.rx?.breakerOpen ? 'OPEN' : 'CLOSED'} · {
              circuitNode.rx?.breakerOpen ? (circuitNode.rx.tripStage ?? 0) >= 5 ? '52a=0 / 52b=1' : '52a/52b awaiting feedback'
                : '52a=1 / 52b=0'
            }</p>
            <p className="text-[#FCD394]">{circuitNode.rx?.circuitFailure
              ?? (testModeSub ? 'Subscriber Test Mode blocks trip output.'
                : !circuitNode.hasTripBinding ? 'No valid trip ExtRef for this subscriber.' : '')}</p>
          </>}
        </section>
      )}

      {activeTab === 'PRP_DIAGNOSTICS' && <PrpDiagnostics runtime={current} lanAUp={lanAUp} lanBUp={lanBUp} nodes={topologyNodes} />}

      <div hidden={activeTab !== 'FAT_SAT'}>{gocb && <GooseFatSat key={gocb.id} block={gocb} dataset={dataset} />}</div>

      {activeTab === 'EVENT_TIMELINE' && <TripSequence runtime={current} />}

      {/* EVENT TIMELINE TAB */}
      {activeTab === 'EVENT_TIMELINE' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-2">
          <h3 className="text-sm font-extrabold text-white">GOOSE Lab Real-Time Event Timeline</h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            {events.map((ev, i) => (
              <div key={i} className="flex gap-3 border-b border-[#123952] pb-1.5">
                <span className="text-[#7DD3FC] shrink-0">{ev.time}</span>
                <span className={ev.severity === 'ERR' ? 'text-[#FCA5A5]' : ev.severity === 'WARN' ? 'text-[#FDE68A]' : 'text-[#DCEEFB]'}>
                  {ev.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <LabFaultWorkbench key={gocb?.id} lab="GOOSE" target={`${gocb?.gocbRef || "No publisher"} - bound subscribers only; ${evaluatedNodes.filter(node => node.subscribed && membersFor(node.iedId).length === 0).length} unbound subscription(s) excluded from recovery`} exercises={guidedExercises} />
    </div>
  );
};
