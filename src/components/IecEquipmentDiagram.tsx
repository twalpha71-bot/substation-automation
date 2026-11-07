import React, { useEffect, useId, useState } from 'react';
import { IEC_ASSETS, IEC_EQUIPMENT_SCENES, IEC_MEDIA, type EquipmentNode, type EquipmentLink } from '../data/iecEquipmentDiagrams';
import '../styles/iec-equipment.css';

function position(node: EquipmentNode) { return { x: 185 + (node.slot % 3) * 365, y: node.slot < 3 ? 145 : 470 }; }
function route(a: EquipmentNode, b: EquipmentNode, index: number) {
  const p = position(a), q = position(b);
  if (p.y === q.y && Math.abs(p.x - q.x) < 400) {
    const direction = Math.sign(q.x - p.x);
    const y = p.y + (index % 2 ? 13 : -13);
    return { d: `M${p.x + direction * 126},${y} H${q.x - direction * 126}`, x: (p.x + q.x) / 2, y };
  }
  if (p.y === q.y) {
    const y = p.y < 300 ? 27 + index * 3 : 601 + index * 3;
    const sign = p.y < 300 ? -1 : 1;
    return { d: `M${p.x},${p.y + sign * 105} V${y} H${q.x} V${q.y + sign * 105}`, x: (p.x + q.x) / 2, y };
  }
  const direction = Math.sign(q.y - p.y), lane = 288 + index * 9;
  const offset = (index % 3 - 1) * 22;
  return { d: `M${p.x + offset},${p.y + direction * 105} V${lane} H${q.x + offset} V${q.y - direction * 105}`, x: (p.x + q.x) / 2 + offset, y: lane };
}

export default function IecEquipmentDiagram({ number, zoom = 100, compact = false }: { number: number; zoom?: number; compact?: boolean }) {
  const scene = IEC_EQUIPMENT_SCENES.find(s => s.number === number) ?? IEC_EQUIPMENT_SCENES[0];
  const [selection, setSelection] = useState<{ kind: 'node' | 'link'; index: number } | null>(null);
  const [trace, setTrace] = useState(false);
  const uid = useId().replace(/:/g, '');
  useEffect(() => { setSelection(null); setTrace(false); }, [number]);
  const node = selection?.kind === 'node' ? scene.nodes[selection.index] : null;
  const link = selection?.kind === 'link' ? scene.links[selection.index] : null;
  const media = Array.from(new Set(scene.links.map(l => l.media)));
  const selectLink = (index: number) => setSelection({ kind: 'link', index });
  const linkName = (l: EquipmentLink) => `${scene.nodes.find(n => n.id === l.from)?.name} → ${scene.nodes.find(n => n.id === l.to)?.name}`;
  return <section className={`iec-equipment ${compact ? 'iec-equipment--compact' : ''}`} aria-label={`Equipment view for diagram ${scene.number}`} data-scene={scene.number}>
    <div className="iec-equipment-bar"><span><i /> EQUIPMENT & CONNECTIONS</span><button type="button" onClick={() => setTrace(v => !v)} aria-pressed={trace}>{trace ? 'Stop highlighting' : 'Highlight connections'}</button></div>
    <div className="iec-equipment-viewport" tabIndex={0} aria-label="Scrollable equipment drawing">
      <svg className={trace ? 'iec-equipment-svg iec-tracing' : 'iec-equipment-svg'} viewBox="0 0 1100 640" style={{ width: `${zoom}%` }} role="group" aria-label="Interactive equipment diagram. Select a device or numbered cable.">
        <defs>
          <pattern id={`${uid}-grid`} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#254561" /></pattern>
          <radialGradient id={`${uid}-glow`}><stop stopColor="#174666" stopOpacity=".65" /><stop offset="1" stopColor="#081622" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1100" height="640" fill={`url(#${uid}-grid)`} opacity=".45" />
        {scene.links.map((l, i) => {
          const a = scene.nodes.find(n => n.id === l.from)!, b = scene.nodes.find(n => n.id === l.to)!;
          const r = route(a, b, i), m = IEC_MEDIA[l.media], selected = selection?.kind === 'link' && selection.index === i;
          return <g key={i} className={`iec-cable ${selected ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-label={`Cable ${i + 1}: ${l.label}. ${m.name}`} aria-pressed={selected} onClick={() => selectLink(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectLink(i); } }}>
            <title>{l.label} — {m.name}</title>
            <path d={r.d} fill="none" stroke="#020912" strokeWidth="10" />
            <path className="iec-cable-line" d={r.d} fill="none" stroke={m.color} strokeWidth={selected ? 5 : 3} strokeDasharray={m.dash} strokeLinejoin="round" />
            <path d={r.d} fill="none" stroke="transparent" strokeWidth="18" />
            <circle cx={r.x} cy={r.y} r="12" fill="#081827" stroke={m.color} strokeWidth="1.5" />
            <text x={r.x} y={r.y + 4} fill={m.color} textAnchor="middle" fontSize="11" fontWeight="800">{i + 1}</text>
          </g>;
        })}
        {scene.nodes.map((n, i) => {
          const { x, y } = position(n), selected = selection?.kind === 'node' && selection.index === i;
          return <g key={n.id} className={`iec-device ${selected ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-label={`${n.name}: ${n.role}`} aria-pressed={selected} onClick={() => setSelection({ kind: 'node', index: i })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelection({ kind: 'node', index: i }); } }}>
            <title>{n.name} — {n.role}</title>
            <rect className="iec-device-focus" x={x - 126} y={y - 106} width="252" height="212" rx="15" fill="#071525" fillOpacity=".86" stroke={selected ? '#00d8eb' : '#18364e'} strokeWidth={selected ? 2 : 1} />
            <ellipse cx={x} cy={y - 24} rx="115" ry="80" fill={`url(#${uid}-glow)`} />
            {n.asset ? <image href={IEC_ASSETS[n.asset]} x={x - 108} y={y - 95} width="216" height="137" preserveAspectRatio="xMidYMid meet" /> : <g>
              <path d={`M${x - 32},${y - 78} h43 l21,21 v66 h-64 z M${x + 11},${y - 78} v21 h21`} stroke="#d9aeef" strokeWidth="2" fill="#20213c" />
              <path d={`M${x - 18},${y - 34} h36 M${x - 18},${y - 19} h28 M${x - 18},${y - 4} h36`} stroke="#d9aeef" strokeWidth="2" />
              <text x={x} y={y + 32} textAnchor="middle" fill="#d9aeef" fontSize="10" letterSpacing="2">LOGICAL / FUNCTIONAL</text>
            </g>}
            {scene.number === 12 && n.id === 'cb' && <image href={IEC_ASSETS.mu} x={x + 35} y={y - 26} width="77" height="65" preserveAspectRatio="xMidYMid meet" />}
            <rect x={x - 120} y={y + 44} width="240" height="56" rx="7" fill="#0d2335" />
            <text x={x} y={y + 65} textAnchor="middle" fill="#f0f8ff" fontSize="14" fontWeight="700">{n.name}</text>
            <text x={x} y={y + 85} textAnchor="middle" fill="#9dbdd3" fontSize="11">{n.role}</text>
          </g>;
        })}
      </svg>
    </div>
    <div className="iec-media-legend">{media.map(m => <span key={m}><i style={{ backgroundColor: IEC_MEDIA[m].color }} />{IEC_MEDIA[m].name}</span>)}</div>
    <div className="iec-inspector" aria-live="polite">
      <span className="iec-eyebrow">{node ? 'Selected equipment' : link ? `Connection ${selection!.index + 1}` : 'Engineering view'}</span>
      <strong>{node ? node.name : link ? link.label : 'Select equipment or a numbered connection to inspect it.'}</strong>
      <p>{node ? `${node.role}. ${node.asset ? 'Representative hardware appearance; verify the actual device capabilities and port configuration.' : 'This is a logical or functional object, not a cable-connected product.'}` : link ? `${linkName(link)}. ${IEC_MEDIA[link.media].detail}` : scene.note}</p>
      {link && <div className="iec-connector"><b>Termination:</b> {IEC_MEDIA[link.media].connector}<span>{IEC_MEDIA[link.media].name}</span></div>}
      {node && <div className="iec-node-links">{scene.links.map((l, i) => l.from === node.id || l.to === node.id ? <button type="button" key={i} onClick={() => selectLink(i)}> {i + 1}. {l.label}</button> : null)}</div>}
    </div>
    <details className="iec-schedule" open={!compact}>
      <summary>Connection schedule · {scene.links.length} links / {scene.nodes.length} equipment roles</summary>
      <div>{scene.links.map((l, i) => <button key={i} type="button" onClick={() => selectLink(i)} aria-pressed={selection?.kind === 'link' && selection.index === i}><span style={{ color: IEC_MEDIA[l.media].color }}>{String(i + 1).padStart(2, '0')}</span><span><b>{l.label}</b><small>{linkName(l)}</small></span><em>{IEC_MEDIA[l.media].name}</em></button>)}</div>
    </details>
    <p className="iec-footnote">Representative equipment views • Physical connections are simplified • Highlighting shows routes, not live traffic • Original lesson content retained</p>
  </section>;
}
