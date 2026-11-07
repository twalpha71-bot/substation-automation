import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { AlertTriangle, ArrowRight, CheckCircle2, RotateCcw, ShieldAlert, Wrench, Search, Zap, Monitor, Settings, ClipboardCheck, } from 'lucide-react';

const workflow = [
  { title: 'Inject Fault', sub: 'Simulate Event', Icon: Zap },
  { title: 'Observe Behavior', sub: 'HMI / SLD / Protocol', Icon: Monitor },
  { title: 'Analyze & Diagnose', sub: 'Root Cause', Icon: Search },
  { title: 'Take Corrective Action', sub: 'Reset / Reconfigure', Icon: Settings },
  { title: 'Validate & Close', sub: 'Post-Repair Check', Icon: CheckCircle2 },
];
const tabs = ['Fault Scenario Library', 'Fault Injection & Monitoring', 'Event / Alarm Analysis', 'Diagnostics & Root Cause', 'Commissioning Checklist'];
const diagnosticColors = ['#ff4d62', '#ffb547', '#00d9ff', '#168bff', '#22c55e'];

export const FaultTroubleshootingPage: React.FC = () => {
  const { faultScenarios, toggleFaultScenario } = useSubstationStore();
  const [selectedFaultId, setSelectedFaultId] = useState<string>(faultScenarios[0]?.id || 'FLT-01');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState(0);
  const selectedFault = faultScenarios.find((f) => f.id === selectedFaultId) || faultScenarios[0];
  const activeFaults = faultScenarios.filter((f) => f.active);
  const categories = ['All', ...Array.from(new Set(faultScenarios.map((f) => f.category)))];
  const filteredFaults = faultScenarios.filter((f) => {
    const matchesCategory = category === 'All' || f.category === category;
    const text = `${f.code} ${f.title} ${f.targetBayOrIed} ${f.category}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  });
  const diagnosticSections = selectedFault ? [
    { title: '1. Observed Symptoms (HMI, SLD, IED LEDs & Protocol Behavior)', Icon: ClipboardCheck, items: selectedFault.symptoms },
    { title: '2. Possible Root Causes (Field Wiring, Switchgear or SCL Config)', Icon: ShieldAlert, items: selectedFault.possibleCauses },
    { title: '3. Engineering Diagnostics & Verification Steps', Icon: Search, items: selectedFault.diagnostics },
    { title: '4. Corrective Action Procedure', Icon: Wrench, items: [selectedFault.correctiveAction] },
    { title: '5. Post-Repair Commissioning Validation', Icon: CheckCircle2, items: [selectedFault.validationCheck] },
  ] : [];

  if (!selectedFault) return <div className="rounded-xl border border-cyan-500/50 bg-[#06182a] p-5 text-slate-200">No fault scenarios are configured.</div>;

  return (
    <div className="space-y-3 text-[#e9f3ff]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-[#051a31] via-[#061b30] to-[#03101e] px-4 py-3 shadow-[0_0_16px_rgba(0,217,255,0.12)]">
        <div>
          <h1 className="text-lg font-extrabold tracking-wide text-white sm:text-xl">Fault Injection — Substation Testing & Troubleshooting Laboratory</h1>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">Switchgear, protection, GOOSE, MMS and PRP fault simulation • Five-stage engineering diagnosis workflow</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-md border border-emerald-500/70 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]"/> Simulation: LIVE</span>
          <span className="rounded-md border border-cyan-500/60 bg-[#03101e] px-3 py-2 font-mono text-xs font-bold text-cyan-300">Active Faults: {activeFaults.length} / {faultScenarios.length}</span>
          {activeFaults.length > 0 && <button type="button" onClick={() => activeFaults.forEach((f) => toggleFaultScenario(f.id))} className="flex items-center gap-1 rounded-md border border-green-400 bg-green-700/30 px-3 py-2 text-xs font-bold text-green-300 hover:bg-green-700/50"><RotateCcw className="h-4 w-4"/> Clear All</button>}
        </div>
      </div>

      <nav aria-label="Fault laboratory sections" className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {tabs.map((tab, i) => <button key={tab} type="button" onClick={() => setActiveTab(i)} className={`min-h-[38px] rounded-lg border px-2 py-2 text-xs font-bold transition sm:text-sm ${activeTab === i ? 'border-cyan-300 bg-[#00d9ff] text-[#001523] shadow-[0_0_14px_rgba(0,217,255,0.65)]' : 'border-[#225778] bg-gradient-to-b from-[#0b3553] to-[#06182d] text-slate-100 hover:border-cyan-400 hover:text-cyan-200'}`}>{tab}</button>)}
      </nav>

      <section className="rounded-xl border border-cyan-400 bg-gradient-to-b from-[#07263b] to-[#031323] p-3 shadow-[0_0_18px_rgba(0,217,255,0.22)]">
        <div className="mb-3 flex items-center gap-3"><AlertTriangle className="h-8 w-8 shrink-0 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,217,255,0.7)]"/><div><h2 className="text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">Practical Substation Fault Injection & Troubleshooting Laboratory ({faultScenarios.length} Scenarios)</h2><p className="text-xs text-slate-300">Inject real-world faults into the shared simulator and follow the structured diagnosis and recovery process.</p></div></div>
        <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-5">
          {workflow.map(({ title, sub, Icon }, i) => <div key={title} className="flex min-w-0 items-center gap-1.5"><div className="flex min-h-[62px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-cyan-400 bg-[#05243a] px-2.5 shadow-[inset_0_0_12px_rgba(0,217,255,0.08),0_0_8px_rgba(0,217,255,0.15)]"><Icon className={`h-6 w-6 shrink-0 ${i === 4 ? 'text-green-400' : 'text-cyan-300'}`}/><div className="min-w-0"><div className="text-[11px] font-bold text-white sm:text-xs">{i + 1}. {title}</div><div className="text-[10px] text-slate-300">{sub}</div></div></div>{i < 4 && <ArrowRight className="hidden h-5 w-5 shrink-0 text-green-400 sm:block"/>}</div>)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="min-w-0 rounded-xl border border-cyan-400 bg-[#041729] p-3 shadow-[0_0_16px_rgba(0,217,255,0.17)] xl:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-extrabold text-white"><AlertTriangle className="h-5 w-5 text-cyan-300"/> Fault Scenario Library ({faultScenarios.length})</h3><div className="relative min-w-[190px] flex-1 sm:max-w-[280px]"><Search className="absolute left-2.5 top-2 h-4 w-4 text-cyan-300"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GOOSE, MMS, VLAN..." aria-label="Search fault scenarios" className="w-full rounded-md border border-[#27779c] bg-[#020d19] py-2 pl-8 pr-2 text-xs text-white outline-none focus:border-cyan-300"/></div></div>
          <div className="mb-3 flex flex-wrap gap-1.5">{categories.map((cat) => <button type="button" key={cat} onClick={() => setCategory(cat)} className={`rounded-md border px-2.5 py-1.5 text-[11px] font-bold ${category === cat ? 'border-cyan-300 bg-[#00d9ff] text-[#001523] shadow-[0_0_9px_rgba(0,217,255,0.5)]' : 'border-[#286485] bg-[#061c30] text-slate-200 hover:border-cyan-400'}`}>{cat === 'All' ? 'All' : cat} ({cat === 'All' ? faultScenarios.length : faultScenarios.filter((f) => f.category === cat).length})</button>)}</div>
          <div className="max-h-[485px] space-y-2 overflow-y-auto pr-1.5">
            {filteredFaults.length === 0 && <p className="p-4 text-sm text-slate-400">No scenarios match your search.</p>}
            {filteredFaults.map((flt) => { const selected = flt.id === selectedFault.id; return <div key={flt.id} role="button" tabIndex={0} onClick={() => setSelectedFaultId(flt.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFaultId(flt.id); } }} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${flt.active ? 'border-red-400 bg-red-950/30 shadow-[0_0_12px_rgba(255,77,98,0.2)]' : selected ? 'border-cyan-300 bg-[#063444] shadow-[0_0_12px_rgba(0,217,255,0.35)]' : 'border-[#1b6485] bg-[#061b2c] hover:border-cyan-400'}`}><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded bg-[#083e55] px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-300">{flt.code}</span><span className="text-[11px] text-slate-300">{flt.category}</span>{flt.active && <span className="text-[10px] font-bold text-red-400">ACTIVE</span>}</div><div className="text-xs font-bold leading-snug text-white sm:text-[13px]">{flt.title}</div><div className="mt-0.5 text-[11px] text-slate-300">{flt.targetBayOrIed}</div></div><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFaultId(flt.id); toggleFaultScenario(flt.id); }} className={`flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-2 text-[11px] font-bold ${flt.active ? 'border-green-400 bg-green-700/30 text-green-300' : 'border-red-400 bg-red-600/40 text-white shadow-[0_0_10px_rgba(255,77,98,0.3)] hover:bg-red-600/60'}`}>{flt.active ? <RotateCcw className="h-3.5 w-3.5"/> : <Zap className="h-3.5 w-3.5"/>}{flt.active ? 'Clear Fault' : 'Inject Fault'}</button></div>; })}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-cyan-400 bg-[#041729] p-3 shadow-[0_0_16px_rgba(0,217,255,0.17)] xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-[#205472] pb-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-[#06516b] px-2 py-1 font-mono text-xs font-bold text-cyan-200">{selectedFault.code}</span><span className="text-xs text-slate-300">Target: {selectedFault.targetBayOrIed}</span></div><h3 className="mt-1.5 text-sm font-extrabold text-white sm:text-base">{selectedFault.title}</h3></div><button type="button" onClick={() => toggleFaultScenario(selectedFault.id)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-extrabold shadow-[0_0_12px_rgba(255,77,98,0.3)] ${selectedFault.active ? 'border-green-400 bg-green-700/40 text-green-200' : 'border-red-300 bg-[#e82e4e] text-white hover:bg-red-500'}`}>{selectedFault.active ? <CheckCircle2 className="h-4 w-4"/> : <Zap className="h-4 w-4"/>}{selectedFault.active ? 'Apply Corrective Action & Clear Fault' : 'Inject Fault Scenario into Simulator'}</button></div>
          <div className="space-y-2.5">{diagnosticSections.map(({ title, Icon, items }, i) => <div key={title} className="rounded-xl border bg-[#020e1d] px-3 py-2.5 shadow-[inset_0_0_8px_rgba(0,0,0,0.35)]" style={{ borderColor: diagnosticColors[i], boxShadow: `inset 0 0 8px rgba(0,0,0,0.35), 0 0 8px ${diagnosticColors[i]}22` }}><div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide sm:text-[13px]" style={{ color: diagnosticColors[i] }}><Icon className="h-5 w-5 shrink-0"/>{title}</div><ul className="ml-7 list-disc space-y-1 text-xs leading-relaxed text-slate-100 sm:text-[13px]">{items.map((item, j) => <li key={j}>{item}</li>)}</ul></div>)}</div>
        </section>
      </div>
    </div>
  );
};
