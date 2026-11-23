import { useState } from 'react';
import { ArrowDown, ArrowRight, Cable, CircuitBoard, Database, Files, GitBranch, Network, Radio, ShieldCheck } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { buildIec104TelecontrolTable, buildModbusRegistersForBay } from '../data/protocolRegistry';
import { useSubstationStore, type ActiveWorkspaceTab } from '../simulation/useSubstationStore';
import type { BayEquipment, BusbarSection, BreakerPosition, VoltageLevel } from '../types/substation';
import { SchemeDrawingSheets } from './SchemeDrawingSheets';
import './SchemePage.css';

const levels: VoltageLevel[] = [132, 33, 11];
const sections = [
  { id: 'drawings', label: 'Drawing set', icon: Files },
  { id: 'sld', label: 'Master SLD', icon: GitBranch },
  { id: 'protection', label: 'Protection & control', icon: ShieldCheck },
  { id: 'wiring', label: 'Wiring & terminals', icon: Cable },
  { id: 'network', label: 'SAS network', icon: Network },
  { id: 'communication', label: 'Communications', icon: Radio },
  { id: 'mapping', label: 'Signal mapping', icon: Database },
] as const;

const wiring = {
  'CT / PT': [
    { title: 'CT measurement and protection', path: ['CT secondary', 'Shorting / test block', 'IED current inputs'], detail: 'Conceptual route for current circuits. Shorting and isolation arrangements depend on the approved CT circuit and test block design.' },
    { title: 'PT / VT measurement', path: ['VT secondary', 'Secondary protection / test isolation', 'IED voltage inputs'], detail: 'The application supplies the model ratio. Core allocation, polarity and isolation details require the equipment drawings.' },
  ],
  'Trip / close': [
    { title: 'DC trip circuit', path: ['Station DC', 'Trip source / trip relay', 'Breaker trip coil', 'DC return'], detail: 'Trip-circuit supervision monitors the trip path. Trip coil count, supply allocation and auxiliary contact positions depend on the breaker design.' },
    { title: 'DC close circuit', path: ['Station DC', 'Close request and permissives', 'Close relay / breaker close coil', 'DC return'], detail: 'The training model exposes CILO permissive, spring, DC supply and lockout state. Actual protection and anti-pumping logic is equipment-specific.' },
  ],
  '52a / 52b': [
    { title: 'Breaker position feedback', path: ['52a / 52b auxiliary contacts', 'Marshalling / panel terminal blocks', 'IED digital inputs', 'XCBR / SCADA'], detail: 'For stable positions the illustrative contact pair is 52a made and 52b open when the breaker is closed, with the pair reversed when open. The application retains intermediate and bad states explicitly.' },
    { title: 'Panel communications', path: ['IED LAN-A / LAN-B interfaces', 'Separate patch paths', 'Station switches'], detail: 'Read the SAS network view for the modelled port and medium. Patch tray, core and terminal numbers require project schedules.' },
  ],
} as const;

function BreakerMark({ state }: { state: BreakerPosition }) {
  return <g className={`scheme-breaker scheme-breaker--${state.toLowerCase()}`} aria-hidden="true">
    <circle cx="-8" r="2" /><circle cx="8" r="2" />
    <path d={state === 'CLOSED' ? 'M-8 0H8' : state === 'OPEN' ? 'M-8 0L6 -7' : 'M-8 0L3 -5'} />
  </g>;
}

function BusDiagram({ level, bays, busbars, selected, select }: {
  level: VoltageLevel; bays: BayEquipment[]; busbars: BusbarSection[]; selected?: string; select: (id: string) => void;
}) {
  const groups = (['A', 'B'] as const).map(section => ({
    section,
    bus: busbars.find(bus => bus.voltageKv === level && bus.section === section),
    bays: bays.filter(bay => bay.voltageKv === level && bay.busSection === section),
  }));
  const coupler = bays.find(bay => bay.voltageKv === level && bay.bayType === 'BUS_COUPLER' && bay.busSection === 'COUPLE');
  const side = Math.max(360, ...groups.map(group => group.bays.length * 80 + 24));
  const center = side + 52;
  const width = center * 2;
  function pick(bay: BayEquipment, content: React.ReactNode, x: number, y: number) {
    return <g key={bay.id} role="button" tabIndex={0} aria-label={`${bay.bayCode}, breaker ${bay.breakerState}`}
      aria-pressed={selected === bay.id} className="scheme-sld-node" transform={`translate(${x},${y})`}
      onClick={() => select(bay.id)} onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(bay.id); }
      }}>
      <rect x="-37" y="-17" width="74" height="37" rx="6" />
      {content}
    </g>;
  }
  return <div className="scheme-scroll" tabIndex={0} aria-label={`${level} kV diagram scroll area`}>
    <svg className="scheme-sld" viewBox={`0 0 ${width} 117`} style={{ minWidth: width }} role="group" aria-label={`${level} kV single line`}>
      {groups.map(({ section, bus, bays: attached }, index) => {
        const start = index === 0 ? 20 : center + 43;
        const end = index === 0 ? center - 43 : width - 20;
        return <g key={section} className={bus?.energized ? 'scheme-bus-live' : 'scheme-bus-idle'}>
          <text x={start} y="16">{bus?.name ?? `${level} kV section ${section}`}</text>
          <line x1={start} x2={end} y1="30" y2="30" className="scheme-busbar" />
          {attached.map((bay, idx) => {
            const x = start + (end - start) * (idx + .5) / attached.length;
            return <g key={bay.id}>
              <line x1={x} x2={x} y1="30" y2="66" className="scheme-sld-branch" />
              {pick(bay, <><BreakerMark state={bay.breakerState} /><text y="14">{bay.bayCode}</text></>, x, 83)}
            </g>;
          })}
        </g>;
      })}
      {coupler && <>
        <path d={`M${center - 43} 30h86`} className="scheme-sld-branch" />
        {pick(coupler, <><BreakerMark state={coupler.breakerState} /><text y="14">{coupler.bayCode}</text></>, center, 30)}
      </>}
    </svg>
  </div>;
}

function DataTable({ headers, rows, empty = 'No matching model records.' }: {
  headers: string[]; rows: { key: string; cells: React.ReactNode[] }[]; empty?: string;
}) {
  if (!rows.length) return <p className="scheme-empty">{empty}</p>;
  return <div className="scheme-scroll scheme-table-wrap" tabIndex={0} aria-label={`${headers[0]} table`}>
    <table><thead><tr>{headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map(({ key, cells }) => <tr key={key}>{cells.map((cell, index) => <td key={headers[index]}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export default function SchemePage({ onNavigate }: { onNavigate: (tab: ActiveWorkspaceTab) => void }) {
  const model = useSubstationStore(useShallow(state => ({
    bays: state.bays, busbars: state.busbars, transformers: state.transformers,
    ieds: state.ieds, infrastructure: state.infrastructure, networkLinks: state.networkLinks,
    goose: state.gooseControlBlocks, signals: state.signals, redundancy: state.networkRedundancyMode,
  })));
  const [section, setSection] = useState<(typeof sections)[number]['id']>('drawings');
  const [selected, setSelected] = useState('BAY-132-L1');
  const [circuit, setCircuit] = useState<keyof typeof wiring>('CT / PT');
  const [plane, setPlane] = useState<'LAN_A' | 'LAN_B' | 'ALL'>('ALL');
  const [selectedLinks, setSelectedLinks] = useState(true);
  const [query, setQuery] = useState('');
  const bay = model.bays.find(item => item.id === selected) ?? model.bays[0];
  const ieds = model.ieds.filter(ied => ied.bayId === bay?.id);
  const iedNames = new Map(model.ieds.map(ied => [ied.id, ied.name]));
  const iedIds = new Set(ieds.map(ied => ied.id));
  const selectedSignals = model.signals.filter(signal => signal.bayId === bay?.id);
  const signals = selectedSignals.filter(signal =>
    [signal.signalName, signal.iec61850Ref, signal.scadaTag, signal.transportType].some(value => value.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const links = model.networkLinks.filter(link =>
    (plane === 'ALL' || link.lanPlane === plane) &&
    (!selectedLinks || iedIds.has(link.sourceId) || iedIds.has(link.targetId)),
  );
  const selectedGoose = model.goose.filter(block =>
    iedIds.has(block.publisherIedId) || block.subscriberIedIds.some(id => iedIds.has(id)),
  );
  const stationDevices = (category: string) => model.infrastructure.filter(device => device.category === category);
  const deviceList = (category: string) => stationDevices(category).map(device => device.name).join(' · ') || 'No model entry';
  const switchList = (lan: 'LAN_A' | 'LAN_B') => {
    const switchIds = new Set(model.networkLinks.filter(link => link.lanPlane === lan).flatMap(link => [link.sourceId, link.targetId]));
    return stationDevices('Ethernet Switch').filter(device => switchIds.has(device.id)).map(device => device.name).join(' · ') || 'No modelled switch';
  };
  function openLab(tab: ActiveWorkspaceTab) {
    if (tab === 'SLD' && bay) useSubstationStore.getState().setSelectedBayId(bay.id);
    onNavigate(tab);
    window.scrollTo(0, 0);
  }
  return <div className="scheme-page">
    <header className="scheme-hero">
      <div className="scheme-kicker"><CircuitBoard size={16} aria-hidden="true" /> Engineering scheme</div>
      <h1>132/33/11 kV Electrical + SAS Complete Project Scheme</h1>
      <p>Explore the substation model from primary equipment to station HMI and RCC.</p>
      <div className="scheme-stats" aria-label="Simulation model inventory">
        <span><b>{model.busbars.length}</b> bus sections</span><span><b>{model.bays.length}</b> bays</span>
        <span><b>{model.transformers.length}</b> transformers</span><span><b>{model.ieds.length}</b> IEDs</span>
      </div>
    </header>
    <nav className="scheme-tabs" aria-label="Scheme views">
      {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>
        <Icon size={16} aria-hidden="true" />{label}
      </button>)}
    </nav>
    {section === 'drawings' && <SchemeDrawingSheets />}
    {section !== 'drawings' && <div className="scheme-toolbar">
      <label>Selected bay <select value={bay?.id ?? ''} onChange={event => setSelected(event.target.value)} disabled={!bay}>
        {!bay && <option value="">No bays in model</option>}
        {levels.map(level => <optgroup label={`${level} kV`} key={level}>
          {model.bays.filter(item => item.voltageKv === level).map(item => <option key={item.id} value={item.id}>{item.bayCode} · {item.name}</option>)}
        </optgroup>)}
      </select></label>
      {bay && <span className="scheme-status">{bay.breakerId} · {bay.breakerState} · {bay.quality}</span>}
    </div>}

    {section === 'sld' && <section className="scheme-panel">
      <div className="scheme-section-head"><div><h2>Master single-line diagram</h2><p>Live model states. The master view groups bays by their modelled bus sections. Select a breaker to inspect its bay.</p></div>
        <button type="button" onClick={() => openLab('SLD')}>Open interactive SLD <ArrowRight size={15} aria-hidden="true" /></button></div>
      {levels.map(level => <BusDiagram key={level} level={level} bays={model.bays} busbars={model.busbars} selected={bay?.id} select={setSelected} />)}
      <h3>Transformer connections between voltage levels</h3>
      <div className="scheme-grid">
        {model.transformers.map(tx => <article className="scheme-tile" key={tx.id}>
          <strong>{tx.designation}</strong>
          <p>{tx.hvKv}/{tx.lvKv} kV · {tx.ratingMva} MVA · {tx.vectorGroup}</p>
          <div className="scheme-path">
            {[tx.hvBayId, tx.lvBayId].map((id, index) => {
              const linked = model.bays.find(item => item.id === id);
              return <div key={id}>{index > 0 && <ArrowDown size={14} aria-hidden="true" />}
                <button type="button" disabled={!linked} onClick={() => setSelected(id)}>{index === 0 ? 'HV' : 'LV'} · {linked?.bayCode ?? `${id} unavailable`}</button>
              </div>;
            })}
          </div>
        </article>)}
      </div>
      {bay && <div className="scheme-selected"><strong>{bay.bayCode} · {bay.name}</strong><span>Q1 {bay.busDisconnectorState} · Q9 {bay.lineDisconnectorState} · Q8 {bay.earthSwitchState}</span>
        <button type="button" onClick={() => setSection('protection')}>Inspect protection <ArrowRight size={15} aria-hidden="true" /></button></div>}
    </section>}

    {section === 'protection' && <section className="scheme-panel">
      <h2>Protection and breaker control</h2><p>State and permissives from the simulator for the selected bay.</p>
      {bay && <>
        <div className="scheme-grid">
          <article className="scheme-tile"><h3>CT / PT and IEDs</h3><p>CT {bay.ctRatio} · PT/VT {bay.vtRatio}</p>
            {ieds.length ? ieds.map(ied => <p key={ied.id}>{ied.model} · {ied.role}</p>) : <p>No linked IED in model.</p>}</article>
          <article className="scheme-tile"><h3>Trip and close</h3><p>{bay.breakerId} · {bay.localRemote} · {bay.breakerState}</p>
            <p>Trip {bay.protectionTripActive ? 'active' : 'inactive'} · 86 {bay.masterTripLockout === undefined ? 'not separately modelled' : bay.masterTripLockout ? 'active' : 'inactive'} · Reclose {bay.autoRecloseStatus}</p>
            <p>{bay.activeTripFunctions.join(' · ') || 'No active trip functions'}</p></article>
          <article className="scheme-tile"><h3>52a / 52b</h3><p>{bay.breakerState === 'CLOSED' ? '52a made · 52b open' : bay.breakerState === 'OPEN' ? '52a open · 52b made' : 'Contact pair indeterminate'}</p><p>Illustrative contact state derived from the stable breaker position.</p></article>
        </div>
        <details className="scheme-tile"><summary>Modelled protection logical nodes</summary>
          <DataTable headers={['IED', 'Logical device / node', 'Function']} rows={ieds.flatMap(ied => ied.logicalDevices.flatMap(device =>
            device.logicalNodes.filter(node => /^(P|CILO|CSWI|PTRC|RBRF)/.test(node.lnClass)).map(node => ({
              key: `${ied.id}/${device.ldInst}/${node.lnPrefix}${node.lnClass}${node.lnInst}`,
              cells: [ied.name, `${device.ldInst}/${node.lnPrefix}${node.lnClass}${node.lnInst}`, node.description],
            })),
          ))} />
        </details>
        <article className="scheme-selected"><strong>{bay.interlockPermissive ? 'Simulator close permissive available' : 'Simulator close permissive blocked'}</strong>
          <p>{bay.interlockReason}</p><p>DC supply {bay.dcSupplyHealthy ? 'healthy' : 'failed'} · TCS {bay.tcsHealthy ? 'healthy' : 'alarm'} · Spring {bay.springCharged ? 'charged' : 'discharged'}</p></article>
      </>}
    </section>}

    {section === 'wiring' && <section className="scheme-panel">
      <h2>Wiring and terminal interfaces</h2>
      <p>Illustrative functional diagrams for training. Terminal numbers, cable cores, coil assignments and equipment ratings require approved project drawings.</p>
      <div className="scheme-tabs" aria-label="Wiring circuits">{(Object.keys(wiring) as (keyof typeof wiring)[]).map(item =>
        <button type="button" key={item} aria-pressed={item === circuit} onClick={() => setCircuit(item)}>{item}</button>,
      )}</div>
      {wiring[circuit].map(item => <article className="scheme-tile scheme-circuit" key={item.title}>
        <h3>{item.title}</h3>
        <ol className="scheme-wire">{item.path.map(part => <li key={part}>{part}</li>)}</ol>
        <p>{item.detail}</p>
      </article>)}
    </section>}

    {section === 'network' && <section className="scheme-panel">
      <div className="scheme-section-head"><div><h2>PRP station network</h2><p>Functional overview. Exact model link endpoints, port names and media are listed below. Active simulator mode is {model.redundancy}.</p></div>
        <button type="button" onClick={() => openLab('NETWORK')}>Open network lab <ArrowRight size={15} aria-hidden="true" /></button></div>
      <div className="scheme-network">
        <div className="scheme-tile"><h3>Bay IED / BCU</h3>{ieds.length ? ieds.map(ied => <p key={ied.id}>{ied.model} · {ied.nodeType}<br />A {ied.ipAddressLanA || '—'} · B {ied.ipAddressLanB || '—'}</p>) : <p>No linked IED.</p>}</div>
        <div className="scheme-planes">
          <button className="scheme-plane-a" type="button" onClick={() => setPlane('LAN_A')} aria-pressed={plane === 'LAN_A'}><b>LAN-A</b>{switchList('LAN_A')}</button>
          <button className="scheme-plane-b" type="button" onClick={() => setPlane('LAN_B')} aria-pressed={plane === 'LAN_B'}><b>LAN-B</b>{switchList('LAN_B')}</button>
        </div>
        <div className="scheme-tile"><h3>Station level</h3><p>{deviceList('Station Gateway')}</p><p>{deviceList('SCADA Server')}</p><p>{deviceList('HMI Workstation')}</p></div>
      </div>
      <div className="scheme-toolbar">
        <label>Network plane <select value={plane} onChange={event => setPlane(event.target.value as typeof plane)}><option value="ALL">All planes</option><option value="LAN_A">LAN-A</option><option value="LAN_B">LAN-B</option></select></label>
        <label><input type="checkbox" checked={selectedLinks} onChange={event => setSelectedLinks(event.target.checked)} /> Selected bay links only</label>
      </div>
      <DataTable headers={['From', 'To', 'Plane', 'Media / VLAN', 'Link']} rows={links.map(link => ({
        key: link.id, cells: [`${link.sourceName} / ${link.sourcePort}`, `${link.targetName} / ${link.targetPort}`, link.lanPlane, `${link.mediaType} · ${link.vlanList.join(', ')}`, link.status],
      }))} />
      <h3>Station infrastructure</h3>
      <DataTable headers={['Device', 'Role', 'Model IP', 'Status']} rows={model.infrastructure.map(device => ({
        key: device.id, cells: [device.name, device.category, device.ipAddress, device.status],
      }))} />
    </section>}

    {section === 'communication' && <section className="scheme-panel">
      <h2>Communications and time synchronization</h2>
      <div className="scheme-grid">
        {([
          ['IEC 61850 MMS', 'IED reports and measurements to station clients via TCP/102. Breaker control uses the configured control model.', 'MMS'],
          ['IEC 61850 GOOSE', 'Station-bus multicast between publisher and subscriber IEDs. Review the selected bay’s modelled control blocks below.', 'GOOSE'],
          ['Modbus TCP', 'Meters and IED servers expose registers over TCP/502 for polling and conversion in the Modbus lab.', 'MODBUS_LAB'],
          ['IEC-104', 'The station gateway exchanges mapped indications, measurements and commands with the RCC over TCP/2404.', 'IEC104_LAB'],
        ] as const).map(([title, detail, tab]) => <article className="scheme-tile" key={tab}><h3>{title}</h3><p>{detail}</p><button type="button" onClick={() => openLab(tab)}>Open lab <ArrowRight size={15} aria-hidden="true" /></button></article>)}
        <article className="scheme-tile"><h3>PTP / SNTP</h3>
          {stationDevices('PTP Grandmaster Clock').map(device => <p key={device.id}>{device.name} · {device.ptpStatus}</p>)}
          {ieds.map(ied => <p key={ied.id}>{ied.name} · {ied.timeSyncProtocol} · {ied.timeSyncLocked ? 'locked' : 'unlocked'}</p>)}
        </article>
      </div>
      <h3>MMS reports for selected bay</h3>
      <DataTable headers={['IED', 'Report control block', 'DataSet', 'Mode', 'Model client']} rows={ieds.flatMap(ied => ied.rcbs.map(rcb => ({
        key: `${ied.id}/${rcb.name}/${rcb.rptId}`, cells: [ied.name, rcb.name, rcb.datSet, rcb.buffered ? 'Buffered' : 'Unbuffered', rcb.clientIp],
      })))} />
      <h3>GOOSE control blocks for selected bay</h3>
      <DataTable headers={['Control block / data set', 'Publisher', 'Subscribers', 'VLAN / APPID', 'State']} rows={selectedGoose.map(block => ({
        key: block.id, cells: [`${block.gocbName} / ${block.datSet}`, block.publisherIedName, block.subscriberIedIds.map(id => iedNames.get(id) ?? id).join(', '), `${block.vlanId} / ${block.appId}`, block.healthy ? 'Healthy' : block.mismatchFault],
      }))} />
    </section>}

    {section === 'mapping' && <section className="scheme-panel">
      <h2>Signal mapping</h2><p>Browse the selected bay’s instantiated model signals and protocol registry entries.</p>
      <label className="scheme-search">Filter signals <input type="search" placeholder="Signal, reference, SCADA tag or transport" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <DataTable headers={['Signal', 'IEC 61850 reference', 'DataSet / RCB / GOOSE', 'SCADA tag', 'Value / quality']} rows={signals.map(signal => ({
        key: signal.id, cells: [signal.signalName, signal.iec61850Ref, `${signal.datasetRef} · ${signal.rcbOrGooseRef}`, signal.scadaTag, `${signal.value} ${signal.unit ?? ''} · ${signal.quality}`],
      }))} />
      <h3>IEC-104 gateway to RCC</h3>
      <DataTable headers={['COA / IOA', 'IEC-104 type', 'Source protocol', 'Source reference']} rows={buildIec104TelecontrolTable(model.bays).filter(entry => entry.bayCode === bay?.bayCode).map(entry => ({
        key: String(entry.ioa), cells: [`${entry.commonAddress} / ${entry.ioa}`, entry.typeId, entry.sourceProtocol, entry.sourceReference],
      }))} empty="The simulator registry has no IEC-104 IOA entries for this bay." />
      <details className="scheme-tile"><summary>Modbus TCP register model</summary>
        {bay && <DataTable headers={['Register', 'Function', 'Parameter', 'Model reference']} rows={buildModbusRegistersForBay(bay, (model.bays.indexOf(bay) % 14) + 1).map((entry, index) => ({
          key: `${entry.registerAddress}-${index}`, cells: [entry.registerAddress, entry.functionCode, entry.parameterName, entry.iec61850SourceRef],
        }))} />}
      </details>
    </section>}

    <footer className="scheme-footnote">Engineering training reference. The diagrams describe the application model and illustrative wiring interfaces.</footer>
  </div>;
}
