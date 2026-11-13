import React, { useEffect, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';

type MeterProps = { compact?: boolean; context?: string; communicationHealthy?: boolean; currentOverride?: number; voltageOverride?: number; invalidOverride?: boolean };
const METER_ID = 'MFM-33KV-INCOMER-01';
/** Training-only virtual multifunction meter. Values come from the simulated bay, not field hardware. */
export function MultifunctionMeter({ compact = false, context = '33 kV Incomer 01', communicationHealthy = true, currentOverride, voltageOverride, invalidOverride = false }: MeterProps) {
  const bays = useSubstationStore(s => s.bays);
  const simulationRunning = useSubstationStore(s => s.simulationRunning);
  const [linkUp, setLinkUp] = useState(true);
  const [lastGood, setLastGood] = useState<{v:number;i:number;p:number;q:number;pf:number;f:number} | null>(null);
  const [energy, setEnergy] = useState(0);
  const bay = bays.find(b => b.id === 'BAY-33-IN1') || bays.find(b => b.id.includes('33') && /IN|F0/.test(b.id)) || bays[0];
  const live = !!bay?.energized;
  const v = voltageOverride ?? (live ? 33 : 0);
  const p = live ? Math.abs(bay?.activePowerMw ?? 0) : 0;
  const q = live ? Math.abs(bay?.reactivePowerMvar ?? 0) : 0;
  const apparent = Math.hypot(p, q);
  const i = currentOverride ?? (v > 0 ? apparent * 1000 / (Math.sqrt(3) * v) : 0);
  const pf = apparent > 0 ? p / apparent : 1;
  const data = {v,i,p,q,pf,f:live ? 50 : 0};
  const valid = communicationHealthy && linkUp && !invalidOverride;
  useEffect(() => {
    const onChange = (ev: Event) => { const detail = (ev as CustomEvent).detail; if (detail?.id === METER_ID) setLinkUp(detail.connected !== false); };
    window.addEventListener('sas:mfm-connection', onChange);
    return () => window.removeEventListener('sas:mfm-connection', onChange);
  }, []);
  useEffect(() => { if (valid) setLastGood(data); }, [valid, v, i, p, q, pf, live]);
  useEffect(() => {
    if (!valid || !simulationRunning || !live) return;
    const timer = window.setInterval(() => setEnergy(e => e + p / 3600), 1000);
    return () => window.clearInterval(timer);
  }, [valid, simulationRunning, live, p]);
  const display = valid ? data : lastGood;
  const quality = valid ? 'GOOD' : 'STALE / BAD';
  const fields = [
    ['Voltage', display ? display.v.toFixed(2) : '—', 'kV'],
    ['Current', display ? display.i.toFixed(1) : '—', 'A'],
    ['Frequency', display ? display.f.toFixed(2) : '—', 'Hz'],
    ['Power Factor', display ? display.pf.toFixed(3) : '—', ''],
    ['Active Power', display ? (display.p * 1000).toFixed(1) : '—', 'kW'],
    ['Reactive Power', display ? (display.q * 1000).toFixed(1) : '—', 'kVAR'],
    ['Apparent Power', display ? (Math.hypot(display.p, display.q) * 1000).toFixed(1) : '—', 'kVA'],
    ['Energy', energy.toFixed(3), 'kWh'],
  ];
  return <section aria-label="Multifunction Meter" style={{background:'#061a2b',border:'1px solid #087f9e',borderRadius:10,padding:compact?10:14,color:'#e6f7ff',fontFamily:'Inter,Segoe UI,sans-serif'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:9}}>
      <div><strong style={{color:'#00dfff',fontSize:compact?12:15}}>▣ Multifunction Meter (MFM)</strong><div style={{fontSize:10,color:'#91b8ca'}}>{context} · {METER_ID} · Modbus TCP / 502 · Unit ID 1</div></div>
      <span style={{border:'1px solid',borderColor:valid?'#22c55e':'#ff5c65',color:valid?'#22c55e':'#ff5c65',borderRadius:5,padding:'3px 6px',fontSize:10,fontWeight:800}}>{quality}</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:`repeat(${compact?2:4},minmax(0,1fr))`,gap:6}}>{fields.map(([name,value,unit])=><div key={name} style={{background:'#0b2b40',border:'1px solid #17485e',borderRadius:5,padding:7,minWidth:0}}><div style={{fontSize:10,color:'#9fc7d8'}}>{name}</div><div style={{fontWeight:800,fontSize:compact?12:15,color:valid?'#e9f8ff':'#ffb547'}}>{value} <small style={{fontSize:9}}>{unit}</small></div></div>)}</div>
    {!valid && <div style={{color:'#ffb547',fontSize:11,marginTop:8}}>Communication/measurement invalid: last good values retained for training; do not treat as live data.</div>}
    {!compact && <details style={{marginTop:9,fontSize:11}}><summary style={{cursor:'pointer',color:'#00dfff'}}>Modbus register mapping (illustrative)</summary><div style={{marginTop:5,color:'#b8d5e4'}}>FC04 Input Registers · Float32 · 2 registers/value · network word order to be confirmed against vendor map</div><div>30001 Voltage kV · 30003 Current A · 30005 Frequency Hz · 30007 PF · 30009 kW · 30011 kVAR · 30013 kVA · 30015 kWh</div><div style={{color:'#ffb547'}}>Addresses are training examples, not manufacturer register specifications.</div></details>}
  </section>;
}
export default MultifunctionMeter;
