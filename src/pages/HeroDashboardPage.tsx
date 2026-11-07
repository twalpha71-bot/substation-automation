import React from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { Substation3DScene } from '../components/Substation3DScene';
import { buildProtocolSummaryCards } from '../data/protocolRegistry';
export const HeroDashboardPage: React.FC = () => {
  const {
    bays,
    transformers,
    ieds,
    alarms,
    gooseControlBlocks,
    faultScenarios,
    setActiveTab,
    triggerProtectionTrip,
  } = useSubstationStore();
  const protocolCards = buildProtocolSummaryCards(bays, ieds, gooseControlBlocks, faultScenarios);

  const energizedBays = bays.filter((b) => b.energized).length;
  const activeAlarms = alarms.filter((a) => a.state !== 'CLEARED').length;
  const totalMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);

  return (
    <div className="space-y-7 pb-8">
      {/* Visual redesign only: all actions still use the existing simulation store. */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-4 py-2 text-xs font-bold tracking-wide text-cyan-300">Engineering Lab v2</span>
        <span className="text-xs text-slate-400">IEC 61850 / Digital Substation Workspace</span>
      </div>

      {/* Full-width cinematic hero uses the project's existing image asset. */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#1E5275] bg-[#06182c] shadow-2xl min-h-[350px] sm:min-h-[410px] lg:min-h-[445px]">
        <img src="assets/substation/substation_hero_opt.jpg" alt="132/33 kV substation switchyard" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03101f] via-[#03101f]/95 via-[42%] to-[#03101f]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/80 via-transparent to-transparent" />
        <div className="relative z-10 flex min-h-[350px] sm:min-h-[410px] lg:min-h-[445px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 max-w-[760px]">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-cyan-200"><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#00cfff]" /> Your Substation Automation Workspace</div>
          <h1 className="mt-6 font-black uppercase leading-[0.93] tracking-tight" style={{ textShadow: '0 3px 0 #163c60, 0 8px 12px #000b18, 0 0 22px #00a7ff33' }}>
            <span className="block text-[clamp(4rem,8vw,6.5rem)] bg-gradient-to-b from-white via-[#bfeaff] to-[#268cdb] bg-clip-text text-transparent">SAS</span>
            <span className="mt-2 block text-[clamp(1.7rem,4vw,3.4rem)] bg-gradient-to-b from-white via-[#8ce8ff] to-[#1676c4] bg-clip-text text-transparent">ENGINEERING HUB</span>
          </h1>
          <p className="mt-5 text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-slate-200">LEARN • CONFIGURE • SIMULATE • TROUBLESHOOT • COMMISSION</p>
          <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-5">
            <span className="text-[10px] sm:text-xs font-mono text-slate-300">IEC 61850 / DIGITAL SUBSTATION</span>
            <button type="button" onClick={() => setActiveTab('SLD')} className="rounded-lg border border-cyan-400/80 bg-[#05243b]/90 px-4 py-2.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-800/70">ENTER 132/33/11 kV SLD →</button>
          </div>
        </div>
        <div className="absolute bottom-3 right-4 z-10 hidden gap-2 text-[9px] font-mono text-slate-200 md:flex">
          <span className="rounded border border-slate-500/40 bg-[#03101f]/80 px-3 py-1.5">132 / 33 / 11 kV SWITCHYARD</span>
          <span className="rounded border border-slate-500/40 bg-[#03101f]/80 px-3 py-1.5">SCADA / PROTECTION & CONTROL</span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#7ea3c0]">Substation Automation / Practice Lab</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#e9f3ff]">132 / 33 / 11 kV Substation</h2>
            <p className="mt-1 text-sm text-slate-400">Explore the equipment. Follow the power. Understand the automation.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTab('SLD')} className="rounded-lg border border-[#315674] bg-[#102940] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-[#173c59]">Open SLD</button>
            <button type="button" onClick={() => setActiveTab('LEARNING')} className="rounded-lg border border-[#168bff] bg-gradient-to-r from-[#079cdb] to-[#166de2] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110">▷ Guided Practice</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">Station Import Load</div><div className="mt-3 text-xl font-bold text-cyan-300">{totalMw.toFixed(1)} MW</div><div className="mt-2 text-[10px] text-emerald-400">50.00 Hz • PF 0.952</div></div>
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">Energized Bays</div><div className="mt-3 text-xl font-bold text-emerald-400">{energizedBays} / {bays.length}</div><div className="mt-2 text-[10px] text-slate-400">Live simulation status</div></div>
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">Transformers T1 & T2</div><div className="mt-3 text-xl font-bold text-white">2 × 50 MVA</div><div className="mt-2 text-[10px] text-cyan-300">T1: {transformers[0]?.loadPercent}% | T2: {transformers[1]?.loadPercent}%</div></div>
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">PRP / PTPv2 Sync</div><div className="mt-3 text-xl font-bold text-emerald-400">LOCKED</div><div className="mt-2 text-[10px] text-slate-400">±45 ns IEEE 1588 GM</div></div>
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">IED Connections</div><div className="mt-3 text-xl font-bold text-cyan-300">{ieds.length} IEDs</div><div className="mt-2 text-[10px] text-slate-400">Configured devices</div></div>
          <div className="rounded-xl border border-[#1b5074] bg-gradient-to-b from-[#0b253d] to-[#061426] p-4"><div className="text-[11px] text-slate-300">Active Alarms</div><div className={`mt-3 text-xl font-bold ${activeAlarms ? 'text-rose-400' : 'text-emerald-400'}`}>{activeAlarms}</div><div className="mt-2 text-[10px] text-slate-400">{activeAlarms ? 'Review active alarms' : 'System Healthy'}</div></div>
        </div>
      </section>

      <div id="sas-3d-switchyard"><Substation3DScene /></div>

      {/* Preserve the existing feeder-trip demo action below the 3D switchyard. */}
      <button type="button" onClick={() => { triggerProtectionTrip('BAY-33-F03', '50/51 Overcurrent'); setActiveTab('SLD'); }} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20">Demo: Trip Feeder 03 Cascade</button>

      {/* SECTION 1: COMMUNICATION PROTOCOL OVERVIEW (6 Core Substation Protocols) */}
      <section
        style={{ backgroundColor: '#061628', borderColor: '#1B4B72' }}
        className="rounded-2xl border p-4 sm:p-5 space-y-3.5 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
              Communication Protocol Overview — 132/33/11 kV Multi-Protocol SAS Architecture
            </h2>
            <p className="text-xs text-[#9BC0DF]">
              Live status across all six station, bay, metering, telecontrol, historian, and time-synchronization protocols. Click any card to open its dedicated communication workspace.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#08223C] border border-[#00CFFF] text-[#77E7FF] font-mono text-[11px] font-bold">
            6 Active Protocols • Shared Real-Time Store
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {protocolCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(card.targetTab)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveTab(card.targetTab)}
              style={{
                backgroundColor: '#081C32',
                borderColor: card.healthy ? card.colorHex : '#FF5C65',
                boxShadow: `inset 0 0 14px ${card.colorHex}18`,
              }}
              className="cursor-pointer rounded-xl border p-3.5 space-y-2 transition hover:brightness-110"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div style={{ color: card.colorHex }} className="text-xs sm:text-sm font-extrabold">
                    {card.protocolName}
                  </div>
                  <div className="text-[11px] font-bold text-white mt-0.5">{card.architectureFlow}</div>
                </div>
                <span
                  style={{
                    backgroundColor: card.healthy ? '#06291E' : '#3B0D15',
                    borderColor: card.healthy ? '#22C55E' : '#FF5C65',
                    color: card.healthy ? '#4ADE80' : '#FDA4AF',
                  }}
                  className="px-2 py-0.5 rounded border text-[10px] font-mono font-bold shrink-0"
                >
                  ● {card.statusLabel}
                </span>
              </div>

              <div className="text-[11px] text-[#DCEAF5] leading-snug">{card.connectedDevicesText}</div>

              <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10.5px]">
                <div className="rounded bg-[#04101E] border border-[#153452] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Endpoints</div>
                  <div className="font-bold text-white">{card.endpointCount} Nodes</div>
                </div>
                <div className="rounded bg-[#04101E] border border-[#153452] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Active Signals</div>
                  <div className="font-bold text-[#00CFFF]">{card.activeSignalCount} Pts</div>
                </div>
                <div className="rounded bg-[#04101E] border border-[#153452] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Transport</div>
                  <div className="font-bold text-[#FACC15] truncate" title={card.transportBadge}>
                    {card.transportBadge.split(' ')[0]} {card.transportBadge.split(' ')[2] || ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#14324F] text-[10px] font-mono">
                <span className={card.healthy ? 'text-[#4ADE80]' : 'text-[#FDA4AF]'}>{card.faultSummary}</span>
                <span className="text-[#8BB3D4] shrink-0">{card.lastCommTimestamp.split(' ')[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
