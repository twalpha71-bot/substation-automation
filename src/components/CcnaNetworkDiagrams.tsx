import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';
import { CCNA_TOPOLOGIES, CCNA_PACKET_FLOWS, type CcnaTopologyNode, type CcnaTopologyLink } from '../data/ccnaAcademyData';
import { copperPinMap, packetEdges, topologySteps } from './ccnaFlow';
import '../styles/ccna-diagrams.css';

const cableNames = { CROSSOVER: 'Copper Crossover', STRAIGHT: 'Copper Straight-Through', FIBER: 'Fiber Optic', SERIAL: 'Serial WAN', WIRELESS: 'Wireless Radio', CONSOLE: 'Rollover Console' };
const cableColors = { CROSSOVER: '#ff922e', STRAIGHT: '#35e69a', FIBER: '#c58bff', SERIAL: '#ffdb65', WIRELESS: '#6ab9ff', CONSOLE: '#65e8ff' };
type CableKind = keyof typeof cableNames;

function Hardware({ node, x, y, width = 100 }: { node: CcnaTopologyNode; x: number; y: number; width?: number }) {
  if (node.type === 'PC') return <image href="./assets/ccna/desktop.png" x={x-width/2} y={y-width*0.34} width={width} height={width*0.67} />;
  if (node.type === 'SWITCH_L2' || node.type === 'SWITCH_L3') return <image href="./assets/devices/industrial-ethernet-switch.png" x={x-width/2} y={y-24} width={width} height={48} />;
  return <g transform={`translate(${x-width/2} ${y-26}) scale(${width/120})`}>
    {node.type === 'CLOUD' ? <path d="M22 55C-4 55-3 23 20 23C18 0 53-8 65 12C89-4 110 14 105 30C130 32 127 56 105 56Z" fill="url(#ccna-metal)" stroke="#75cdf4" strokeWidth="2" /> : node.type === 'AP' ? <>
      <path d="M22 25V0M96 25V0" stroke="#a2b3c2" strokeWidth="5" strokeLinecap="round"/><path d="M28 8Q60-16 92 8M38 16Q60-1 82 16" fill="none" stroke="#20dcff" strokeWidth="2"/>
      <rect x="10" y="25" width="100" height="29" rx="8" fill="url(#ccna-metal)" stroke="#8aa5bb"/><circle cx="60" cy="42" r="3" fill="#3cffae"/>
    </> : node.type === 'SERVER' ? <>
      <path d="M30 0L83 0L100 12V70H30Z" fill="url(#ccna-metal)" stroke="#8da4b9"/><path d="M83 0V70M83 0L100 12" stroke="#14283c"/>
      {[12,26,40].map(a=><g key={a}><rect x="37" y={a} width="39" height="10" rx="1" fill="#08101a"/><circle cx="71" cy={a+5} r="1.6" fill="#49ffa4"/></g>)}<circle cx="57" cy="61" r="3" fill="#16cafa"/>
    </> : <>
      <path d="M2 19L18 5H111L119 19V57H2Z" fill="url(#ccna-metal)" stroke="#8ea9bf" strokeWidth="1.5"/><path d="M2 19H119M18 5V19" stroke="#98a6b2"/>
      <rect x="8" y="25" width="104" height="24" rx="2" fill="#102238"/>
      {Array.from({length: node.type === 'ROUTER' ? 4 : 10}, (_,i)=><g key={i}><rect x={12+i*9} y="30" width="7" height="10" fill="#030a12" stroke="#6a8093" strokeWidth=".6"/><path d={`M${13+i*9} 38h5`} stroke="#d8bc6f"/><circle cx={15+i*9} cy="44" r="1.3" fill="#55ff91"/></g>)}
      <text x="60" y="15" textAnchor="middle" fontSize="6" fill="#e4faff">{node.type === 'ROUTER' ? 'INTEGRATED SERVICES ROUTER' : node.type === 'WLC' ? 'WIRELESS CONTROLLER' : 'CATALYST ETHERNET SWITCH'}</text>
      <circle cx="106" cy="35" r="2" fill="#00eaff"/>
    </>}
  </g>;
}

function Plug({x,y,flip=false,color='#ff922e'}:{x:number;y:number;flip?:boolean;color?:string}) {
  return <g transform={`translate(${x} ${y}) scale(${flip?-1:1} 1)`}>
    <rect x="-13" y="-8" width="23" height="16" rx="2" fill="#bce0e6" fillOpacity=".6" stroke="#d8f7ff"/>
    <rect x="5" y="-9" width="16" height="18" rx="3" fill={color}/>
    {[0,1,2,3,4,5,6,7].map(i=><path key={i} d={`M-11 ${-6+i*1.7}h13`} stroke="#ffe7a2" strokeWidth=".8"/>)}
    <path d="M-8-8v-4h12v4" stroke="#d7f3ff" fill="none"/>
  </g>;
}

function Pinout({kind,gigabit}:{kind:CableKind;gigabit:boolean}) {
  if (kind === 'WIRELESS') return <div className="nd-media-note"><span className="nd-radio">◉ )))</span><b>802.11 radio link</b><p>No physical cable or RJ45 pins. AP bridges the associated client into its configured VLAN.</p></div>;
  if (kind === 'FIBER') return <div className="nd-media-note"><b>Duplex optical link</b><svg viewBox="0 0 280 65"><path d="M30 20C140 20 140 45 250 45M30 45C140 45 140 20 250 20" stroke="#c58bff" strokeWidth="3" fill="none"/><text x="5" y="18">TX</text><text x="5" y="60">RX</text><text x="252" y="18">TX</text><text x="252" y="60">RX</text></svg><p>TX → RX in each direction. Connector and fiber type must match the installed transceivers.</p></div>;
  if (kind === 'SERIAL') return <div className="nd-media-note"><b>DCE ↔ DTE serial connection</b><p>DCE supplies clocking. Serial connector and pin assignments depend on the interface module; Ethernet T568 pinouts do not apply.</p></div>;
  const crossover = kind === 'CROSSOVER', consoleCable = kind === 'CONSOLE';
  const mapping = copperPinMap(crossover,gigabit,consoleCable);
  const colors = ['#bcf6cb','#33df81','#ffd5a5','#498bff','#b7d7ff','#ff9b32','#e0bd9a','#bd824d'];
  return <div className="nd-pinout">
    <div className="nd-pin-labels"><b>{consoleCable?'RJ45 console': crossover && !gigabit?'T568A':'End A'}</b><span>Pin → pin</span><b>{consoleCable?'Rolled end':crossover && !gigabit?'T568B':'End B'}</b></div>
    <svg viewBox="0 0 280 116" role="img" aria-label={`${cableNames[kind]} pin mapping ${mapping.map((n,i)=>`${i+1} to ${n}`).join(', ')}`}>
      <rect x="10" y="2" width="38" height="111" rx="5" fill="#41677c" stroke="#b5d3df"/><rect x="232" y="2" width="38" height="111" rx="5" fill="#41677c" stroke="#b5d3df"/>
      {mapping.map((n,i)=><g key={i}><path d={`M45 ${9+i*14}H82C124 ${9+i*14} 156 ${9+(n-1)*14} 197 ${9+(n-1)*14}H235`} stroke={colors[i]} strokeWidth="2" fill="none"/><text x="24" y={13+i*14}>{i+1}</text><text x="248" y={13+i*14}>{i+1}</text></g>)}
    </svg>
    <p>{consoleCable?'1↔8 · 2↔7 · 3↔6 · 4↔5. Out-of-band management; carries no ARP or ICMP.':crossover?gigabit?'1000BASE-T legacy crossover: all four pairs cross. Modern Auto-MDIX ports also accept straight-through.':'100BASE-TX: 1↔3, 2↔6; pins 4, 5, 7, 8 stay straight. TX and RX pairs cross.':'Pins 1–8 connect straight through. Use the same T568A or T568B termination at both ends.'}</p>
  </div>;
}

export function CcnaNetworkDiagrams({topologyId,onTopologyChange,isTe=false}:{topologyId:string;onTopologyChange:(id:string)=>void;isTe?:boolean}) {
  const top = CCNA_TOPOLOGIES.find(t=>t.id===topologyId) || CCNA_TOPOLOGIES[0];
  const [scenarioId,setScenarioId] = useState('');
  const [index,setIndex] = useState(0), [fraction,setFraction] = useState(0), [playing,setPlaying] = useState(false), [begun,setBegun] = useState(false);
  const [speed,setSpeed] = useState(1), [zoom,setZoom] = useState(1), [expanded,setExpanded] = useState(false);
  const [selectedLink,setSelectedLink] = useState(0), [selectedNode,setSelectedNode] = useState<string|null>(null), [consoleSelected,setConsoleSelected] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const available = CCNA_PACKET_FLOWS.filter(f=>f.topoId===top.id);
  const activeScenario = available.find(f=>f.id===scenarioId) || available[0];
  const steps = useMemo(()=>topologySteps(top,activeScenario?.id||''),[top,activeScenario]);
  const done = index >= steps.length;
  const step = steps[Math.min(index,steps.length-1)];
  const walkthrough = top.number!==1 && !activeScenario;
  const reset = () => {setPlaying(false);setBegun(false);setIndex(0);setFraction(0);};
  useEffect(()=>{reset();setZoom(1);setSelectedLink(0);setSelectedNode(null);setConsoleSelected(false);},[top.id]);
  useEffect(()=>{
    if (!playing || done) return;
    const timer = window.setTimeout(()=>{
      if (fraction >= 1) {setFraction(0);setIndex(i=>i+1);if(index+1>=steps.length)setPlaying(false);}
      else setFraction(f=>Math.min(1,f+0.04*speed));
    },80);
    return ()=>window.clearTimeout(timer);
  },[playing,done,fraction,index,speed,steps.length]);
  useEffect(()=>{
    const close = (e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};
    window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close);
  },[]);
  const edgeList = begun && !done ? packetEdges(top,step) : [];
  const chosenLink = top.links[Math.min(selectedLink,top.links.length-1)];
  const kind:CableKind = consoleSelected?'CONSOLE':chosenLink?.cable||'STRAIGHT';
  const gigabit = !!chosenLink && /Gi|Gigabit/.test(chosenLink.fromIf+chosenLink.toIf) && !/Fa|FastEthernet/.test(chosenLink.fromIf+chosenLink.toIf);
  const node = top.nodes.find(n=>n.id===selectedNode);
  const direct = top.number===1;
  const maxX = Math.max(...top.nodes.map(n=>n.x)), minX = Math.min(...top.nodes.map(n=>n.x));
  const maxY = Math.max(...top.nodes.map(n=>n.y)), minY = Math.min(...top.nodes.map(n=>n.y));
  const pos = (n:CcnaTopologyNode) => direct ? {x:n.id==='PC1'?133:767,y:150} : {x:95+(n.x-minX)/Math.max(1,maxX-minX)*710,y:maxY===minY?155:85+(n.y-minY)/Math.max(1,maxY-minY)*190};
  const points = (link:CcnaTopologyLink,i:number) => {
    const a=pos(top.nodes.find(n=>n.id===link.fromId)!),b=pos(top.nodes.find(n=>n.id===link.toId)!);
    if(direct)return {a:{x:238,y:160},b:{x:662,y:160},bend:0};
    const duplicate=top.links.slice(0,i).some(l=>(l.fromId===link.fromId&&l.toId===link.toId)||(l.toId===link.fromId&&l.fromId===link.toId));
    return {a,b,bend:duplicate?50:0};
  };
  const linkPath = (link:CcnaTopologyLink,i:number,reverse=false) => {const p=points(link,i);const a=reverse?p.b:p.a,b=reverse?p.a:p.b;return `M${a.x},${a.y} Q${(a.x+b.x)/2},${(a.y+b.y)/2+p.bend} ${b.x},${b.y}`;};
  const next = ()=>{setPlaying(false);setBegun(true);setFraction(0);setIndex(i=>begun?Math.min(steps.length,i+1):0);};
  return <div className={`ccna-diagrams ${expanded?'nd-expanded':''}`}>
    <div className="nd-layout">
      <aside className="nd-topologies nd-panel" aria-label="Topology scenarios">
        <h2>20 CCNA &amp; Substation Network Topologies</h2>
        <div className="nd-topology-list">{CCNA_TOPOLOGIES.map(t=><button key={t.id} type="button" aria-pressed={t.id===top.id} onClick={()=>onTopologyChange(t.id)}><span>#{String(t.number).padStart(2,'0')}</span>{(isTe?t.titleTe:t.titleEn).replace(/^\d+\.\s*/,'')}</button>)}</div>
        <div className="nd-list-footer"><span className="nd-dot"/> {String(top.number).padStart(2,'0')} / 20 scenarios · Select to explore</div>
      </aside>
      <section className="nd-workspace nd-panel">
        <div className="nd-title-row"><h3>{isTe?top.titleTe:top.titleEn}</h3><div className="nd-view-tools">
          <button type="button" aria-label="Zoom in" onClick={()=>setZoom(v=>Math.min(2.5,v+.25))} disabled={zoom>=2.5}><ZoomIn size={16}/></button>
          <button type="button" aria-label="Zoom out" onClick={()=>setZoom(v=>Math.max(1,v-.25))} disabled={zoom<=1}><ZoomOut size={16}/></button>
          <button type="button" aria-label={expanded?'Exit expanded view':'Expand diagram workspace'} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button>
          <button type="button" aria-label="Reset view" onClick={()=>{setZoom(1);viewport.current?.scrollTo(0,0);}}><RotateCcw size={16}/></button>
        </div></div>
        <p className="nd-subtitle">{isTe?top.subtitleTe:top.subtitleEn}</p>
        <div ref={viewport} className="nd-canvas-scroll" tabIndex={0} aria-label="Network diagram, scroll to pan when zoomed">
          <svg className="nd-canvas" viewBox="0 0 900 340" style={{width:`${zoom*100}%`}} role="img" aria-label={`${top.titleEn}. Select a device or cable to inspect details.`}>
            <defs><linearGradient id="ccna-metal" x2="0.25" y2="1"><stop stopColor="#9faebb"/><stop offset=".22" stopColor="#536476"/><stop offset=".55" stopColor="#263b50"/><stop offset="1" stopColor="#101b28"/></linearGradient><filter id="ccna-glow"><feGaussianBlur stdDeviation="4"/></filter></defs>
            {direct && <g><rect x="341" y="35" width="218" height="46" rx="8" fill="#031221" stroke="#ff922e"/><text x="450" y="54" textAnchor="middle" className="nd-cable-heading">Copper Crossover Cable</text><text x="450" y="72" textAnchor="middle" fill="#ffcc67">100BASE-TX</text><path d="M450 81V140" stroke="#ff922e"/><path d="M445 134L450 142L455 134" fill="none" stroke="#ff922e"/></g>}
            {top.links.map((l,i)=>{
              const p=points(l,i),d=linkPath(l,i),color=cableColors[l.cable];
              return <g key={i} className="nd-cable" role="button" tabIndex={0} aria-label={`Inspect cable ${l.fromId} ${l.fromIf} to ${l.toId} ${l.toIf}`} onClick={()=>{setSelectedLink(i);setConsoleSelected(false);setSelectedNode(null);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedLink(i);setConsoleSelected(false);setSelectedNode(null);}}}>
                <title>{l.fromId} {l.fromIf} ↔ {l.toId} {l.toIf} · {l.label}</title>
                <path d={d} stroke={color} strokeWidth={direct?13:7} opacity={selectedLink===i?.22:.09} filter="url(#ccna-glow)" fill="none"/>
                <path d={d} stroke={color} strokeWidth={direct?5:2.5} fill="none" strokeDasharray={l.cable==='WIRELESS'?'7 6':undefined}/>
                <path d={d} stroke="#fff" strokeWidth=".8" opacity=".7" fill="none"/>
                <path d={d} stroke="transparent" strokeWidth="18" fill="none"/>
                {direct?<><Plug x={p.a.x} y={p.a.y}/><Plug x={p.b.x} y={p.b.y} flip/></>:<g><rect x={(p.a.x+p.b.x)/2-67} y={(p.a.y+p.b.y)/2+p.bend/2-12} width="134" height="19" rx="5" fill="#051321" stroke="#22445f"/><text x={(p.a.x+p.b.x)/2} y={(p.a.y+p.b.y)/2+p.bend/2+1} textAnchor="middle" className="nd-port-label">{l.fromIf.replace(' + RS232','')} ↔ {l.toIf.replace(' + Console','')}</text></g>}
              </g>;
            })}
            {top.number===2 && <g role="button" tabIndex={0} aria-label="Inspect rollover console cable" onClick={()=>{setConsoleSelected(true);setSelectedNode(null);}} onKeyDown={e=>{if(e.key==='Enter')setConsoleSelected(true);}}><path d="M95 175C280 285 620 285 805 175" stroke="#65e8ff" strokeWidth="3" fill="none"/><text x="450" y="248" textAnchor="middle" fill="#65e8ff">RS232 ↔ Console · out-of-band management</text></g>}
            {top.nodes.map(n=>{
              const p=pos(n),w=direct?210:top.nodes.length>4?98:120;
              return <g key={n.id} className="nd-device" role="button" tabIndex={0} aria-label={`Inspect ${n.id}`} onClick={()=>setSelectedNode(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedNode(n.id);}}}>
                <title>{n.label} · {n.model} · {n.ip}</title>
                <ellipse cx={p.x} cy={p.y+(direct?64:30)} rx={w/2} ry="7" fill="#00cfff" opacity=".08"/>
                <Hardware node={n} x={p.x} y={p.y-10} width={w}/>
                {direct?<g><rect x={p.x-100} y="221" width="200" height="97" rx="8" fill="#002239" stroke="#00d9f2"/><text x={p.x-85} y="244" className="nd-host-name">▣　{n.id}</text><text x={p.x-85} y="267">IP　　{n.ip.split('/')[0]}</text><text x={p.x-85} y="287">Mask　255.255.255.0</text><text x={p.x-85} y="307">Intf　 FastEthernet0</text></g>:<g><text x={p.x} y={p.y+48} textAnchor="middle" className="nd-node-name">{n.label}</text><text x={p.x} y={p.y+64} textAnchor="middle" className="nd-node-ip">{n.ip.length>36?n.ip.slice(0,33)+'…':n.ip}</text></g>}
              </g>;
            })}
            {edgeList.map((e,i)=>{
              const t = step.to.includes('&') ? fraction : fraction*edgeList.length-i;
              if(t<0||t>1)return null;
              const p=points(top.links[e.index],e.index),a=e.reverse?p.b:p.a,b=e.reverse?p.a:p.b;
              const x=(1-t)*(1-t)*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y=(1-t)*(1-t)*a.y+2*(1-t)*t*((a.y+b.y)/2+p.bend)+t*t*b.y;
              return <g key={i} transform={`translate(${x} ${y})`} className="nd-packet"><circle r="15" fill="#00dfff" opacity=".2"/><rect x="-9" y="-6" width="18" height="12" rx="2" fill={step?.title.includes('Reply')?'#40ffad':'#fff1aa'} stroke="#fff"/><path d="M-8-5L0 1L8-5" stroke="#18415c" fill="none"/></g>;
            })}
            {direct&&<g><rect x="320" y="257" width="260" height="60" rx="9" fill="#003329" stroke="#008b62"/><text x="450" y="277" textAnchor="middle" fill="#64ff4d" className="nd-host-name">✓ Link Up</text><text x="450" y="295" textAnchor="middle" fill="#58ffe2">100 Mbps · Full duplex</text><text x="450" y="311" textAnchor="middle">PC1 Fa0 ↔ PC2 Fa0</text></g>}
          </svg>
        </div>
        {node && <div className="nd-inspector"><button type="button" aria-label="Close device details" onClick={()=>setSelectedNode(null)}>×</button><b>{node.label} · {node.model}</b><span>{node.role} · {node.vlan}</span><code>{node.ip}</code><span>{top.links.filter(l=>l.fromId===node.id||l.toId===node.id).map(l=>`${l.fromId===node.id?l.fromIf:l.toIf} → ${l.fromId===node.id?l.toId:l.fromId}`).join(' | ')}</span></div>}
        <div className="nd-details-grid">
          <section className="nd-detail-card nd-addressing"><h4>Addressing Plan <small>{top.ipTable.length} interfaces</small></h4><div className="nd-table-scroll"><table><thead><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Gateway</th><th>VLAN</th></tr></thead><tbody>{top.ipTable.map((r,i)=><tr key={i}><td>{r.device}</td><td>{r.interfaceName}</td><td>{r.ipAddress}</td><td>{r.subnetMask}</td><td>{r.defaultGateway}</td><td>{r.vlan}</td></tr>)}</tbody></table></div></section>
          <section className="nd-detail-card"><h4>Cable &amp; Pinout</h4><label className="nd-cable-picker"><span className="nd-sr-only">Select cable to inspect</span><select value={consoleSelected?'console':selectedLink} onChange={e=>{setConsoleSelected(e.target.value==='console');if(e.target.value!=='console')setSelectedLink(Number(e.target.value));}}>{top.links.map((l,i)=><option key={i} value={i}>{l.fromId} ↔ {l.toId} · {cableNames[l.cable]}</option>)}{top.number===2&&<option value="console">PC1 ↔ SW1 · Rollover Console</option>}</select></label><Pinout kind={kind} gigabit={gigabit}/></section>
          <section className="nd-detail-card"><h4>Topology Summary</h4><div className="nd-summary">{direct?<ul>{['Direct PC-to-PC connection','Layer 2 Ethernet communication','ARP resolves IPv4 to MAC','ICMP ping verifies connectivity'].map(s=><li key={s}><CheckCircle2 size={14}/>{s}</li>)}</ul>:<p>{isTe?top.routingInfoTe:top.routingInfoEn}</p>}<div className="nd-legend">{[...new Set(top.links.map(l=>l.cable))].map(c=><span key={c}><i style={{background:cableColors[c]}}/>{cableNames[c]}</span>)}</div><small>Teaching model · select devices and cables for details</small></div></section>
        </div>
      </section>
    </div>
    <section className="nd-animator nd-panel">
      <div className="nd-animation-header"><h3>Interactive Packet Flow Animator</h3><div className="nd-controls">
        <button type="button" className="nd-start" onClick={()=>{if(done){setIndex(0);setFraction(0);}setBegun(true);setPlaying(true);}} disabled={playing}><Play size={14}/>{done?'Replay':begun?'Resume':'Start'}</button>
        <button type="button" onClick={()=>setPlaying(false)} disabled={!playing}><Pause size={14}/>Pause</button>
        <button type="button" onClick={next} disabled={done}><SkipForward size={14}/>Next Step</button>
        <button type="button" onClick={reset}><RotateCcw size={14}/>Reset</button>
        <label><span className="nd-sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,1,2,4].map(s=><option value={s} key={s}>Speed: {s}×</option>)}</select></label>
      </div></div>
      <div className="nd-playback-grid"><div>
        <div className="nd-step-track">{steps.map((s,i)=><button type="button" key={i} className={begun&&index===i?'active':index>i?'complete':''} onClick={()=>{setPlaying(false);setBegun(true);setIndex(i);setFraction(0);}} aria-current={begun&&index===i?'step':undefined}><span>{index>i?'✓':i+1}</span>{s.title}</button>)}<div className={`nd-finish ${done?'complete':''}`}><CheckCircle2 size={20}/>{direct?'Communication Successful':'Walkthrough Complete'}</div></div>
        <div className="nd-current-step" aria-live="polite"><b>{done?'Complete':begun?`Step ${index+1}`:'Ready'}</b><span>{done?(direct?'Echo Reply received. PC1 ↔ PC2 communication successful.':'Scenario walkthrough finished. Review the event log and packet fields; this is an educational model.'):begun?step?.detail:'Press Start to follow the packets, or use Next Step to inspect each stage.'}</span></div>
        <div className="nd-progress" role="progressbar" aria-label="Scenario progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((index+fraction)/steps.length*100)}><i style={{width:`${(index+fraction)/steps.length*100}%`}}/></div>
        <details className="nd-packet-details"><summary>Packet fields &amp; ARP cache</summary><div><p><b>{step?.protocol}</b></p><p>IPv4: {step?.srcIp} → {step?.dstIp}</p><p>Ethernet: {step?.srcMac} → {step?.dstMac}</p>{direct&&<p>PC1 ARP cache: {index>=2?'192.168.1.11 → 02:00:00:00:01:11 (dynamic)':'No resolved entry yet'}. MAC addresses are illustrative.</p>}{!walkthrough&&edgeList.length===0&&!done&&begun&&<p>This authored step describes a logical endpoint; inspect the fields and event log for its forwarding action.</p>}</div></details>
      </div><section className="nd-event-log"><h4>▤ Event Log <small>{playing?'RUNNING':done?'COMPLETE':begun?'PAUSED':'READY'}</small></h4><div role="log" aria-live="polite"><p><time>00:00</time>Scenario ready · {walkthrough?'physical-link walkthrough':'protocol walkthrough'}</p>{begun&&steps.slice(0,Math.min(index+1,steps.length)).map((s,i)=><p key={i}><time>{String(Math.floor((i+1)*2/60)).padStart(2,'0')}:{String((i+1)*2%60).padStart(2,'0')}</time>{s.from} → {s.to}: {s.title}{i===index?' · in progress':' · reviewed'}</p>)}{done&&<p className="nd-log-success">✓ {direct?'Echo Reply received · communication successful':'Scenario complete'}</p>}</div><small>Illustrative timeline, not measured network latency.</small></section></div>
      <details className="nd-library"><summary>Protocol scenario library · all {CCNA_PACKET_FLOWS.length} original scenarios</summary><div>{CCNA_PACKET_FLOWS.map(f=><button type="button" key={f.id} aria-pressed={f.id===activeScenario?.id} onClick={()=>{reset();onTopologyChange(f.topoId);setScenarioId(f.id);}}>{f.titleEn}</button>)}</div></details>
    </section>
  </div>;
}
