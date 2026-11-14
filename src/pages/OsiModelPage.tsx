import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Check, Copy, Layers, Network, Search, Wrench } from 'lucide-react';
import { osiCases, osiFilters, osiLayers, osiQuestions } from '../data/osiModel';
import './OsiModelPage.css';
import osiProtocolStacks from '../assets/osi-model/osi-protocol-stacks.png';
import osiMmsPath from '../assets/osi-model/osi-mms-report-path.png';
import osiGoosePath from '../assets/osi-model/osi-goose-event-path.png';
import osiSvPath from '../assets/osi-model/osi-sampled-values-path.png';

const sources = [
  ['IEC 61850-8-1 — MMS and Ethernet mappings', 'https://webstore.iec.ch/en/publication/6021'],
  ['IEC 61850-9-2 — Sampled Values mapping', 'https://webstore.iec.ch/en/publication/6023'],
  ['RFC 1006 — ISO transport over TCP / TPKT', 'https://datatracker.ietf.org/doc/html/rfc1006'],
  ['IEC TR 61850-90-5 — context for routable profiles', 'https://webstore.iec.ch/en/publication/6026'],
  ['Wireshark — MMS display fields', 'https://www.wireshark.org/docs/dfref/m/mms.html'],
  ['Wireshark — GOOSE display fields', 'https://www.wireshark.org/docs/dfref/g/goose.html'],
  ['Wireshark — SV display fields', 'https://www.wireshark.org/docs/dfref/s/sv.html'],
  ['ABB — GOOSE retransmission example', 'https://en.help.plc.abb.com/AB270/3d245e8f427944dfc33528ee7a40e297_2_en_us.html'],
];

/** Technical diagrams are embedded images; keep accompanying explanatory text accessible. */
function Flow({ label, image, alt }: { label: string; image: string; alt: string }) {
  return <figure className="osi-engineering-image osi-path-image" aria-label={label}>
    <img src={image} alt={alt} loading="lazy" decoding="async" />
  </figure>;
}

function Stacks() {
  return <figure className="osi-engineering-image osi-protocol-image" aria-labelledby="osi-stack-caption">
    <img src={osiProtocolStacks} alt="IEC 61850 communication stack comparison: MMS uses application and ISO upper layers over TCP/IP and Ethernet; conventional GOOSE and Sampled Values use direct Layer 2 Ethernet multicast without TCP, UDP or IP." loading="lazy" decoding="async" />
    <figcaption id="osi-stack-caption" className="osi-caption">Conceptual protocol paths, not a literal seven-row implementation. ASN.1/BER encoding inside a GOOSE/SV payload does not add a separate OSI presentation protocol. VLAN and PCP belong to L2. Conventional Ethernet profiles are shown; routable R-GOOSE/R-SV use separate UDP/IP profiles.</figcaption>
  </figure>;
}

export function OsiModelPage() {
  const [layerNumber, setLayerNumber] = useState(7);
  const [caseIndex, setCaseIndex] = useState(0);
  const [filterQuery, setFilterQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const layer = osiLayers.find(item => item.n === layerNumber)!;
  const currentCase = osiCases[caseIndex];
  const jumpTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopyStatus(`Copied: ${value}`); }
    catch { setCopyStatus('Clipboard unavailable. Select the filter text and copy it manually.'); }
  };
  const visibleFilters = osiFilters.filter(row => row.join(' ').toLowerCase().includes(filterQuery.toLowerCase()));
  return <article className="osi-page">
    <header className="osi-hero">
      <div><p className="osi-eyebrow"><Layers size={16} aria-hidden="true" /> TOOLS & TEST / ENGINEERING GUIDE</p><h1>OSI Model<span>for Substation Automation</span></h1>
      <p>How does data travel from an IED to SCADA, and how can you identify the layer where a fault occurs? Learn all seven layers through practical SAS examples.</p>
      </div>
      <div className="osi-hero-map" aria-label="Seven OSI layers from application to physical">{osiLayers.map(item => <button key={item.n} onClick={() => { setLayerNumber(item.n); jumpTo('osi-layers'); }} aria-label={`Explore layer ${item.n}: ${item.name}`}><span>L{item.n}</span>{item.name}<ArrowRight size={14} aria-hidden="true" /></button>)}</div>
    </header>
    <nav className="osi-jump" aria-label="OSI guide sections">{[['osi-intro', 'Overview'], ['osi-layers', '7 layers'], ['osi-stacks', 'Protocol stacks'], ['osi-examples', 'Substation examples'], ['osi-troubleshooting', 'Troubleshooting'], ['osi-filters', 'Wireshark'], ['osi-questions', 'Interview Q&A']].map(([id, text]) => <button key={id} onClick={() => jumpTo(id)}>{text}</button>)}</nav>

    <section id="osi-intro" className="osi-section"><div className="osi-heading"><span>01 / THE FOUNDATION</span><h2>One model to organize the questions</h2></div>
      <p><strong>OSI = Open Systems Interconnection.</strong> The OSI reference model explains communication through seven conceptual layers. A sender encapsulates information as it moves down the stack; the receiver decodes and decapsulates it on the way up. Real protocol stacks do not necessarily implement each layer as a separate software module.</p>
      <div className="osi-three"><div className="osi-card"><b>MMS</b><h3>Monitor & control</h3><p>SCADA / gateway ↔ IED. Reads, reports, controls and supported file services. TCP/IP path.</p></div><div className="osi-card"><b>GOOSE</b><h3>Share events & states</h3><p>IED → subscribing IEDs. Trips, blocking, permissives and interlocking signals. Direct Ethernet path.</p></div><div className="osi-card"><b>SV</b><h3>Stream measurements</h3><p>Merging Unit → protection / measurement IEDs. Digitized current and voltage samples. Direct Ethernet path.</p></div></div>
      <aside className="osi-note"><strong>Remember:</strong> Ping success ≠ MMS service success ≠ GOOSE/SV subscription success. Collect evidence specific to each communication path.</aside>
    </section>

    <section id="osi-layers" className="osi-section"><div className="osi-heading"><span>02 / INTERACTIVE EXPLORER</span><h2>Seven layers, explained in context</h2><p>Select a layer to view its explanation, equipment, practical example, and verification checks.</p></div>
      <div className="osi-explorer"><div className="osi-layer-list" role="group" aria-label="Select OSI layer">{osiLayers.map(item => <button key={item.n} aria-pressed={item.n === layerNumber} aria-controls="osi-layer-detail" onClick={() => setLayerNumber(item.n)}><span className="osi-number">{item.n}</span><span><strong>{item.name}</strong><small>{item.cue}</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}</div>
      <div id="osi-layer-detail" className="osi-layer-detail" aria-live="polite"><div className="osi-detail-title"><span>L{layer.n}</span><div><p>{layer.unit}</p><h3>{layer.name}</h3></div></div><p>{layer.intro}</p><p>{layer.detail}</p><div className="osi-example"><h4>Substation example</h4><p>{layer.example}</p></div><h4>Equipment & protocols</h4><p>{layer.devices}</p><h4>What to check</h4><p>{layer.check}</p><aside className="osi-note">{layer.myth}</aside></div></div>
      <details className="osi-details"><summary>Open the complete seven-layer reference</summary><div className="osi-table-wrap"><table><caption>OSI summary — top to bottom</caption><thead><tr><th>Layer</th><th>Purpose / unit</th><th>SAS context</th></tr></thead><tbody>{osiLayers.map(item => <tr key={item.n}><th>L{item.n} · {item.name}</th><td>{item.cue}<br /><small>{item.unit}</small></td><td>{item.devices}</td></tr>)}</tbody></table></div></details>
    </section>

    <section id="osi-stacks" className="osi-section"><div className="osi-heading"><span>03 / IEC 61850 MAPPINGS</span><h2>Read the stack before testing the service</h2></div><Stacks />
      <p>For MMS client-server services and GOOSE mapping, refer to <a href={sources[0][1]} target="_blank" rel="noreferrer">IEC 61850-8-1</a>; for Ethernet Sampled Values, refer to <a href={sources[1][1]} target="_blank" rel="noreferrer">IEC 61850-9-2</a>; the MMS ISO-over-TCP adaptation is described by <a href={sources[2][1]} target="_blank" rel="noreferrer">RFC 1006</a>.</p>
      <div className="osi-table-wrap"><table><caption>Conventional MMS, GOOSE and SV comparison</caption><thead><tr><th>Property</th><th>MMS</th><th>GOOSE</th><th>SV</th></tr></thead><tbody>
      {[
        ['Purpose', 'Monitoring, reports, control', 'Event / state distribution', 'Sampled current / voltage'],
        ['Pattern', 'Client–server', 'Publisher–subscriber', 'Publisher–subscriber'],
        ['Network path', 'TCP / IP / Ethernet', 'Direct Ethernet multicast', 'Direct Ethernet multicast'],
        ['Identification', 'Server IP + TCP 102; object references', 'MAC, APPID, gocbRef / DataSet', 'MAC, APPID, svID / stream configuration'],
        ['EtherType', 'IP: 0x0800 (IPv4), 0x86DD (IPv6)', '0x88B8', '0x88BA'],
        ['Transmission', 'Requests/responses + reports', 'On change + repeated state messages', 'Continuous configured sample stream'],
        ['Typical location', 'Station bus', 'Station and/or process bus', 'Process bus'],
        ['Health evidence', 'Association + correct service result', 'Accepted stream + valid mapped input', 'Valid samples + quality/timing'],
      ].map(row => <tr key={row[0]}>{row.map((value, i) => i === 0 ? <th key={i}>{value}</th> : <td key={i}>{value}</td>)}</tr>)}
      </tbody></table></div>
      <div className="osi-two"><div className="osi-card"><h3>Frame anatomy · encapsulation</h3><p className="osi-code">Ethernet header → [802.1Q tag] → EtherType → payload → FCS</p><p>The MMS path includes IP → TCP → TPKT → COTP → applicable upper-layer PDUs. GOOSE/SV frames carry protocol headers (including APPID) and encoded payloads directly over Ethernet. This simplified sketch omits redundancy and security headers. FCS and VLAN tags may not appear in every capture.</p></div><div className="osi-card"><h3>Routable profiles are separate</h3><p>R-GOOSE and R-SV use routable UDP/IP profiles. Do not apply conventional Layer 2 multicast diagrams to them. Verify the selected standard edition, security profile, and device support. <a href={sources[3][1]} target="_blank" rel="noreferrer">IEC 61850-90-5 background</a>.</p></div></div>
    </section>

    <section id="osi-examples" className="osi-section"><div className="osi-heading"><span>04 / 132 / 33 / 11 kV SUBSTATION</span><h2>Follow the information, end to end</h2><p>These are illustrative engineering scenarios. Voltage level does not determine the protocol stack; device roles and required services do.</p></div>
      <article className="osi-card osi-scenario"><h3>A. 33 kV feeder breaker indication → SCADA</h3><Flow label="MMS report path · station bus" image={osiMmsPath} alt="MMS reporting: XCBR1.Pos at the protection IED server through an Ethernet switch to the SCADA MMS client and HMI indication." /><ol><li>A breaker position change updates the IED data model; consider the associated quality and timestamp.</li><li>A configured DataSet and enabled RCB report the change to SCADA over an established MMS association.</li><li>SCADA decodes the value using the correct model reference and data type, then updates the indication. Do not blindly map double-point status as a Boolean.</li></ol><p className="osi-checkline">Verify: source state → MMS report → quality/time → displayed indication.</p></article>
      <article className="osi-card osi-scenario"><h3>B. 132 kV protection event → engineered trip logic</h3><Flow label="GOOSE event path · Layer 2 multicast" image={osiGoosePath} alt="GOOSE event path: protection IED publisher, VLAN multicast Ethernet switch, subscriber IED logic, engineered output." /><ol><li>A protection logic event changes the published DataSet state. stNum identifies the new state generation.</li><li>GOOSE repeats rapidly after a new event and continues periodic retransmissions during steady state. Inspect sqNum and timeout supervision.</li><li>The subscriber operates its mapped logic only after accepting the intended stream, configuration, flags, and quality. Receiving an Ethernet frame alone does not prove a breaker trip.</li></ol><p className="osi-checkline">Verify: publisher state → subscriber acceptance → logic mapping → output under approved test conditions.</p></article>
      <article className="osi-card osi-scenario"><h3>C. 11 kV feeder measurements → protection IED</h3><Flow label="Sampled Values path · process bus" image={osiSvPath} alt="Sampled Values process bus: CT and VT inputs to merging unit, process-bus Ethernet switch, and protection IED subscriber." /><ol><li>The Merging Unit digitizes analogue inputs according to its configured profile and publishes an SV stream.</li><li>The protection IED subscribes using the intended svID/APPID, channel order, scaling, and sampling profile.</li><li>Evaluate smpCnt continuity, sample quality, and synchronization status. Packet loss, delay, and timing errors can affect measurement and protection performance.</li></ol><p className="osi-checkline">Example only: 80 samples/cycle × 50 Hz = 4,000 samples/s. Frame rate depends on packing/profile.</p></article>
      <div className="osi-two"><div className="osi-card"><h3>Time is a separate dependency</h3><p>PTP or another engineered time source provides synchronization where required. Verify PTP transport/profile, clock domain, and source quality. The absence of TCP in SV does not eliminate timing requirements.</p></div><div className="osi-card"><h3>Redundancy is a separate dependency</h3><p>PRP sends duplicate frames across independent LAN A and LAN B; HSR uses two directions around a ring. The redundancy function removes duplicates as appropriate. Correct topology, endpoint support, and supervision are essential.</p></div></div>
    </section>

    <section id="osi-troubleshooting" className="osi-section"><div className="osi-heading"><span>05 / DIAGNOSE WITH EVIDENCE</span><h2><Wrench size={24} aria-hidden="true" /> OSI-based troubleshooting</h2><p>First identify the symptom and affected service. Compare observations with a known-good baseline to isolate the likely faulty layer.</p></div>
      <div className="osi-case-buttons" role="group" aria-label="Troubleshooting symptom">{osiCases.map((item, i) => <button key={item.name} aria-pressed={i === caseIndex} aria-controls="osi-case-detail" onClick={() => setCaseIndex(i)}>{item.name}</button>)}</div>
      <div id="osi-case-detail" className="osi-case-detail" aria-live="polite"><span className="osi-eyebrow">{currentCase.layer}</span><h3>{currentCase.name}</h3><ol>{currentCase.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="osi-checkline"><Check size={18} aria-hidden="true" /> {currentCase.evidence}</p></div>
      <aside className="osi-note">Capture location matters: an engineering PC on a normal switch port may not see all unicast or multicast frames. Verify approved TAP/SPAN setup, direction, VLAN visibility, and capture-drop counters. This is a training guide; live trip/control tests require site-approved isolation and test procedures.</aside>
    </section>

    <section id="osi-filters" className="osi-section"><div className="osi-heading"><span>06 / PACKET INSPECTION</span><h2><Search size={24} aria-hidden="true" /> Wireshark field guide</h2><p>These are actual Wireshark <strong>display filters</strong>; they are not capture-filter syntax. The Hub simulated packet viewer is not a complete Wireshark filter engine.</p></div>
      <label className="osi-filter-label">Find a display filter<input type="search" value={filterQuery} onChange={e => setFilterQuery(e.target.value)} placeholder="Search MMS, GOOSE, VLAN…" /></label>
      <div className="osi-filter-list">{visibleFilters.map(([filter, title, note]) => <div key={filter} className="osi-filter"><div><strong>{title}</strong><code>{filter}</code><p>{note}</p></div><button onClick={() => copy(filter)} aria-label={`Copy filter ${filter}`}><Copy size={16} aria-hidden="true" /> Copy</button></div>)}{!visibleFilters.length && <p role="status">No matching filters. Try “MMS”, “GOOSE” or “VLAN”.</p>}</div><p className="osi-copy-status" role="status">{copyStatus}</p>
      <p>Field definitions: <a href={sources[4][1]} target="_blank" rel="noreferrer">MMS</a> · <a href={sources[5][1]} target="_blank" rel="noreferrer">GOOSE</a> · <a href={sources[6][1]} target="_blank" rel="noreferrer">SV</a>. Match the installed Wireshark version and dissector support.</p>
    </section>

    <section id="osi-questions" className="osi-section"><div className="osi-heading"><span>07 / CHECK YOUR UNDERSTANDING</span><h2>Interview questions & common misconceptions</h2></div>{osiQuestions.map(([q, a]) => <details key={q} className="osi-details"><summary>{q}</summary><p>{a}</p></details>)}</section>
    <footer className="osi-section osi-sources"><div className="osi-heading"><span>ENGINEERING REFERENCES</span><h2>Continue with the source documents</h2></div><p>This page supports conceptual learning and troubleshooting. For implementation details, consult the project-selected IEC edition, vendor PICS/MICS/PIXIT, SCL files, and approved test plan. Standards links may reference specific editions; check applicable amendments.</p><ul>{sources.map(([label, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{label} ↗</a></li>)}</ul><button onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}><Network size={16} aria-hidden="true" /> Back to top</button></footer>
  </article>;
}
