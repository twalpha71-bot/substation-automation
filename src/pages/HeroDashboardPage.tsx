import { MultifunctionMeter } from '../components/MultifunctionMeter';
import React, { useState } from 'react';
import { Zap, Layers3, Activity, Network, CircuitBoard, Cpu, Bell } from 'lucide-react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { Substation3DScene } from '../components/Substation3DScene';
import { buildProtocolSummaryCards } from '../data/protocolRegistry';
export const HeroDashboardPage: React.FC = () => {
  const {
    bays,
    selectedBayId,
    setSelectedBayId,
    simulationRunning,
    busbars,
    trendHistory,
    transformers,
    ieds,
    alarms,
    gooseControlBlocks,
    faultScenarios,
    setActiveTab,
    triggerProtectionTrip,
  } = useSubstationStore();
  const [detailTab, setDetailTab] = useState<'STATUS' | 'MEASUREMENTS' | 'ALARMS'>('STATUS');
  const selectedBay = bays.find(b => b.id === selectedBayId) || bays[0];
  const latestTrend = trendHistory[trendHistory.length - 1];
  const protocolCards = buildProtocolSummaryCards(bays, ieds, gooseControlBlocks, faultScenarios);

  const energizedBays = bays.filter((b) => b.energized).length;
  const activeAlarms = alarms.filter((a) => a.state !== 'CLEARED').length;
  const totalMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);

  const equipmentInspector = (
    <aside className="sas-equipment-panel" aria-label="Equipment and feeder control">
          <div className="sas-region-title"><div><span className="sas-eyebrow">EQUIPMENT INSPECTOR</span><h2>Feeder & Bay Status</h2></div><span className="sas-live-dot">● LIVE</span></div>
          <label className="sas-field-label" htmlFor="sas-bay-select">Selected equipment</label>
          <select id="sas-bay-select" value={selectedBayId} onChange={e => setSelectedBayId(e.target.value)} className="sas-field-select">{bays.map(b => <option value={b.id} key={b.id}>{b.id}</option>)}</select>
          <div className="sas-detail-tabs" role="tablist" aria-label="Equipment details">{(['STATUS','MEASUREMENTS','ALARMS'] as const).map(tab => <button role="tab" aria-selected={detailTab === tab} className={detailTab === tab ? 'active' : ''} onClick={() => setDetailTab(tab)} key={tab}>{tab === 'MEASUREMENTS' ? 'Meters' : tab === 'ALARMS' ? 'Alarms' : 'Status'}</button>)}</div>
          {selectedBay ? <div className="sas-detail-content">
            {detailTab === 'STATUS' && <><div className="sas-equipment-hero"><span>{selectedBay.id}</span><strong className={selectedBay.energized ? 'sas-ok' : 'sas-alert-value'}>{selectedBay.energized ? '● ENERGIZED' : '● DE-ENERGIZED'}</strong></div><div className="sas-info-line"><span>Breaker</span><b>{selectedBay.breakerState}</b></div><div className="sas-info-line"><span>Bus disconnector</span><b>{selectedBay.busDisconnectorState}</b></div><div className="sas-info-line"><span>Line disconnector</span><b>{selectedBay.lineDisconnectorState}</b></div><div className="sas-info-line"><span>Earth switch</span><b>{selectedBay.earthSwitchState}</b></div><div className="sas-info-line"><span>Protection trip</span><b>{selectedBay.protectionTripActive ? 'ACTIVE' : 'Clear'}</b></div></>}
            {detailTab === 'MEASUREMENTS' && <><div className="sas-info-line"><span>Active power</span><b>{selectedBay.activePowerMw.toFixed(2)} MW</b></div><div className="sas-info-line"><span>Voltage AB</span><b>{selectedBay.voltageAbKv?.toFixed(2) ?? '—'} kV</b></div><div className="sas-info-line"><span>Voltage BC</span><b>{selectedBay.voltageBcKv?.toFixed(2) ?? '—'} kV</b></div><div className="sas-info-line"><span>Voltage CA</span><b>{selectedBay.voltageCaKv?.toFixed(2) ?? '—'} kV</b></div></>}
            {detailTab === 'ALARMS' && <><div className="sas-info-line"><span>Active station alarms</span><b>{activeAlarms}</b></div><p className="sas-inspector-note">Open SCADA/HMI for the complete alarm and event log.</p></>}
          </div> : <p className="sas-inspector-note">No equipment available.</p>}
          <div className="sas-inspector-actions"><button onClick={() => setActiveTab('SLD')}>Open Control SLD</button><button onClick={() => setActiveTab('SCADA')}>Operator HMI</button></div>
          <details className="sas-panel-details"><summary>Engineering tools & safety tests</summary><div><button onClick={() => setActiveTab('FAULTS')}>Fault troubleshooting</button><button onClick={() => setActiveTab('FATSAT')}>FAT / SAT tests</button><button onClick={() => { triggerProtectionTrip('BAY-33-F03', '50/51 Overcurrent'); setActiveTab('SLD'); }}>Demo: Trip Feeder 03</button></div></details>
        </aside>
  );

  return (
    <div className="sas-dashboard space-y-5 pb-8">
      <header className="sas-workspace-heading">
        <div><span className="sas-eyebrow">SUBSTATION AUTOMATION / WORKSPACE</span><h1>132 / 33 / 11 kV Substation</h1><p>Digital Twin · SCADA / HMI · Protection & Control</p></div>
        <div className="sas-heading-actions"><span className={`sas-sim-state ${simulationRunning ? 'is-running' : ''}`}>● {simulationRunning ? 'Simulation Running' : 'Simulation Paused'}</span><button onClick={() => setActiveTab('SLD')}>Open SLD</button><button className="sas-action-primary" onClick={() => setActiveTab('SCADA')}>SCADA / HMI</button></div>
      </header>
      <MultifunctionMeter context="Substation Dashboard – 33 kV Incomer" />
      <section className="sas-kpi-strip" aria-label="Substation telemetry">
        {[
          ['Active Power', `${totalMw.toFixed(1)} MW`, 'Live import'],
          ['132 kV Bus', busbars.find(b => b.voltageKv === 132)?.voltageKvLive != null ? `${busbars.find(b => b.voltageKv === 132)!.voltageKvLive.toFixed(1)} kV` : '—', 'Measured voltage'],
          ['Frequency', latestTrend?.freqHz != null ? `${latestTrend.freqHz.toFixed(2)} Hz` : '—', 'Simulation trend'],
          ['Energized Bays', `${energizedBays}/${bays.length}`, 'Online circuits'],
          ['Transformer T1', `${transformers[0]?.loadPercent ?? '—'}%`, 'Loading'],
          ['Transformer T2', `${transformers[1]?.loadPercent ?? '—'}%`, 'Loading'],
          ['IED Devices', String(ieds.length), 'Configured'],
          ['Active Alarms', String(activeAlarms), activeAlarms ? 'Needs attention' : 'Normal'],
        ].map(([label, value, note], index) => {
          const KpiIcon = [Zap, Layers3, Activity, Network, CircuitBoard, CircuitBoard, Cpu, Bell][index];
          return <div className="sas-kpi" key={label}>
            <div className="sas-kpi-icon" aria-hidden="true"><KpiIcon size={24} strokeWidth={2.3} /></div>
            <div className="sas-kpi-copy"><span>{label}</span><strong className={label === 'Active Alarms' && activeAlarms ? 'sas-alert-value' : ''}>{value}</strong><small>{note}</small></div>
          </div>;
        })}
      </section>
        <section className="sas-twin-region" aria-label="3D digital twin">
          <div className="sas-region-title"><div><span className="sas-eyebrow">LIVE ENGINEERING VIEW</span><h2>3D Digital Twin</h2></div><span className="sas-region-tag">132 / 33 / 11 kV</span></div>
          <div id="sas-3d-switchyard" className="sas-twin-embed"><Substation3DScene equipmentInspector={equipmentInspector} /></div>
        </section>

      <details className="sas-protocol-disclosure"><summary><span><strong>Communication Protocol Overview</strong><small>Six communication workspaces · Open for diagnostics and protocol status</small></span><span>Expand ▾</span></summary>
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

        <div className="sas-protocol-cards grid gap-3">
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

      </details>
    </div>
  );
};
