import React, { useState } from 'react';

// ============================================================================
// Realistic 132 kV CRP Rear Panel Interior (Back View)
// Features:
//  - Steel mounting plate + slotted gray PVC cable ducts (wireways)
//  - Real IED rear chassis: BI/BO terminal blocks, CT/VT analog plugs,
//    clickable LC Fiber Patch Cords (ETH-A PRP LAN-A & ETH-B PRP LAN-B)
//  - Top 35mm DIN-Rail: Physical F1/F2/F3 MCBs + K86/K52/K74/K_INT Contactors
//  - Interactive SVG Port-to-Port Wiring & Patch Cord Harness
//  - Bottom 35mm DIN-Rail: X1 (CT Shorting TB), X2 (VT TB), X3 (110V DC TB)
//  - Click any device, port, or terminal to trace its exact ferrule wiring
// ============================================================================

export interface RearHardwareState {
  dcMcbOn: boolean;
  vtMcbOn: boolean;
  heaterMcbOn: boolean;
  ctShorted: boolean;
  prpAUp: boolean;
  prpBUp: boolean;
}

export interface CrpRearPanelProps {
  bayId: string;
  panelTitle: string;
  brandText: string;
  brandColor: string;
  modelText: string;
  breakerClosed: boolean;
  tripActive: boolean;
  interlockOk: boolean;
  tcsHealthy: boolean;
  hw: RearHardwareState;
  onUpdateHw: (patch: Partial<RearHardwareState>, logText: string) => void;
  onSelectTrace?: (traceText: string) => void;
}

interface WireTrace {
  id: string;
  from: string;
  to: string;
  ferrule: string;
  spec: string;
  color: string;
  signal: string;
}

export const CrpRearPanelView: React.FC<CrpRearPanelProps> = ({
  panelTitle,
  brandText,
  brandColor,
  modelText,
  breakerClosed,
  tripActive,
  interlockOk,
  tcsHealthy,
  hw,
  onUpdateHw,
  onSelectTrace,
}) => {
  const [activeWireId, setActiveWireId] = useState<string>('TRIP_COIL');

  const wires: WireTrace[] = [
    {
      id: 'DC_FEED',
      from: 'X3:1-2 (110V DC Bus)',
      to: 'F1 MCB → IED X100 (PWR) & K86/K52',
      ferrule: 'J1+ / J2-',
      spec: '2.5mm² Red/Black',
      color: '#ef4444',
      signal: hw.dcMcbOn ? '110V DC Energized' : '0V DC (F1 OFF)',
    },
    {
      id: 'TRIP_COIL',
      from: 'IED X102:1-2 (BO1 Trip)',
      to: 'K86 Lockout (A1/A2) → X3:11 (Yard CB Trip)',
      ferrule: 'K11 / K12',
      spec: '1.5mm² Grey',
      color: '#f97316',
      signal: tripActive ? 'TRIP ENERGIZED (86 Operated)' : 'Standby (TCS Supervised)',
    },
    {
      id: 'CLOSE_CMD',
      from: 'IED X102:3-4 (BO2 Close)',
      to: 'K_INT (13-14) → X3:15 (Yard CB Close)',
      ferrule: 'K21 / K22',
      spec: '1.5mm² Grey',
      color: '#eab308',
      signal: interlockOk ? 'Interlock Permissive Closed' : 'Blocked by K_INT',
    },
    {
      id: 'CT_MEAS',
      from: 'X1 CT TB (1-8)',
      to: 'IED Analog CT Module (IA/IB/IC/IN)',
      ferrule: 'K1 / K3 / K5 / K7',
      spec: '2.5mm² R/Y/B/Blk',
      color: '#38bdf8',
      signal: hw.ctShorted ? 'SHORTED AT X1 LINKS (Test Mode)' : 'Normal CT Secondary Active',
    },
    {
      id: 'VT_MEAS',
      from: 'X2 VT TB (1-4) → F2 MCB',
      to: 'IED Analog VT Module (VA/VB/VC/VN)',
      ferrule: 'A11 / B11 / C11',
      spec: '1.5mm² R/Y/B/Blk',
      color: '#a855f7',
      signal: hw.vtMcbOn ? '110V AC / √3 Live' : '0V AC (F2 OFF)',
    },
    {
      id: 'PRP_A',
      from: 'IED Port ETH-A (LC)',
      to: 'Panel LIU-A:1 → SW-LAN-A-01 (1/5)',
      ferrule: 'FO-PRP-A1',
      spec: 'OM3 Multimode Orange Patch Cord',
      color: '#fb923c',
      signal: hw.prpAUp ? '1000M-LX Link UP' : 'UNPLUGGED / LOS',
    },
    {
      id: 'PRP_B',
      from: 'IED Port ETH-B (LC)',
      to: 'Panel LIU-B:1 → SW-LAN-B-01 (1/5)',
      ferrule: 'FO-PRP-B1',
      spec: 'OM3 Multimode Aqua Patch Cord',
      color: '#22d3ee',
      signal: hw.prpBUp ? '1000M-LX Link UP' : 'UNPLUGGED / LOS',
    },
  ];

  const activeWire = wires.find((w) => w.id === activeWireId) || wires[0];

  const selectWire = (id: string) => {
    setActiveWireId(id);
    const w = wires.find((x) => x.id === id);
    if (w && onSelectTrace) {
      onSelectTrace(`${panelTitle} [${w.ferrule}]: ${w.from} ──▶ ${w.to} (${w.spec}) · ${w.signal}`);
    }
  };

  return (
    <div className="bg-[#2a313b] border-2 border-[#475569] rounded-[3px] flex flex-col overflow-hidden select-none shadow-inner">
      {/* Rear Cabinet Header */}
      <div className="bg-[#0f3d6e] text-white px-2.5 py-1 flex items-center justify-between border-b border-[#38bdf8]/40">
        <span className="font-bold text-[10px] tracking-wide truncate">REAR · {panelTitle}</span>
        <span className="font-mono text-[9px] text-[#93c5fd]">GALV. BACKPLATE</span>
      </div>

      {/* Slotted Cable Duct Top */}
      <div className="h-2.5 bg-[#475569] border-b border-[#1e293b] flex items-center justify-between px-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="w-[3px] h-1.5 bg-[#1e293b] rounded-[0.5px]" />
        ))}
      </div>

      {/* Main Interior Backplate */}
      <div className="relative p-2 space-y-2 bg-[linear-gradient(180deg,#333c48_0%,#2b333e_100%)]">
        {/* 1. IED REAR CHASSIS & FIBER PATCH PORTS */}
        <div className="bg-[#181e27] border border-[#64748b] rounded-[2px] p-1.5 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold border-b border-[#334155] pb-1">
            <span style={{ color: brandColor }}>{brandText}</span>
            <span className="font-mono text-[#e2e8f0]">{modelText} (REAR)</span>
          </div>

          {/* Rear Plug-in Modules Row */}
          <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
            {/* PWR + BI/BO */}
            <button
              type="button"
              onClick={() => selectWire('TRIP_COIL')}
              className="bg-[#0f172a] border rounded-[2px] p-1 text-left cursor-pointer"
              style={{ borderColor: activeWireId === 'TRIP_COIL' ? '#f97316' : '#334155' }}
            >
              <div className="text-[#94a3b8] font-bold">X100/102</div>
              <div className="text-[#e2e8f0]">PWR · BO1/2</div>
              <div className="flex gap-0.5 mt-0.5">
                {[1, 2, 3, 4].map((p) => (
                  <span key={p} className="w-2 h-2 rounded-[1px] bg-[#16a34a] border border-[#86efac]" title={`Term ${p}`} />
                ))}
              </div>
            </button>

            {/* CT / VT Analog Module */}
            <button
              type="button"
              onClick={() => selectWire('CT_MEAS')}
              className="bg-[#0f172a] border rounded-[2px] p-1 text-left cursor-pointer"
              style={{ borderColor: activeWireId === 'CT_MEAS' ? '#38bdf8' : '#334155' }}
            >
              <div className="text-[#94a3b8] font-bold">X104 CT/VT</div>
              <div className="text-[#e2e8f0]">IA/IB/IC · V</div>
              <div className="flex gap-0.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="w-2 h-2 rounded-full bg-[#eab308]" />
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span className="w-2 h-2 rounded-full bg-[#111827] border border-[#64748b]" />
              </div>
            </button>

            {/* Dual LC Fiber SFP Ports */}
            <div className="bg-[#0f172a] border border-[#334155] rounded-[2px] p-1 space-y-0.5">
              <div className="text-[#94a3b8] font-bold">SFP FIBER</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateHw({ prpAUp: !hw.prpAUp }, `${panelTitle}: Fiber Patch Cord ETH-A (PRP LAN-A) ${!hw.prpAUp ? 'Connected' : 'Unplugged'}.`);
                    selectWire('PRP_A');
                  }}
                  className="flex-1 py-[1px] rounded-[1px] font-bold cursor-pointer text-[7.5px]"
                  style={{
                    background: hw.prpAUp ? '#ea580c' : '#334155',
                    color: '#ffffff',
                    border: hw.prpAUp ? '1px solid #fdba74' : '1px dashed #94a3b8',
                  }}
                  title="Click to plug/unplug LC Fiber Patch Cord A"
                >
                  ETH-A
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateHw({ prpBUp: !hw.prpBUp }, `${panelTitle}: Fiber Patch Cord ETH-B (PRP LAN-B) ${!hw.prpBUp ? 'Connected' : 'Unplugged'}.`);
                    selectWire('PRP_B');
                  }}
                  className="flex-1 py-[1px] rounded-[1px] font-bold cursor-pointer text-[7.5px]"
                  style={{
                    background: hw.prpBUp ? '#0891b2' : '#334155',
                    color: '#ffffff',
                    border: hw.prpBUp ? '1px solid #67e8f9' : '1px dashed #94a3b8',
                  }}
                  title="Click to plug/unplug LC Fiber Patch Cord B"
                >
                  ETH-B
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PORT-TO-PORT SVG CABLING & PATCH CORD HARNESS */}
        <div className="relative h-[44px] bg-[#1e252f] border border-[#334155] rounded-[2px] overflow-hidden">
          <svg viewBox="0 0 260 44" className="w-full h-full" preserveAspectRatio="none">
            {/* Wireway guide */}
            <rect x="0" y="18" width="260" height="8" fill="#334155" opacity="0.55" />
            {/* 110V DC Red/Black Harness */}
            <path
              d="M 28 2 C 28 18, 22 26, 22 42"
              fill="none"
              stroke={hw.dcMcbOn ? '#ef4444' : '#7f1d1d'}
              strokeWidth={activeWireId === 'DC_FEED' ? '2.6' : '1.6'}
              onClick={() => selectWire('DC_FEED')}
              className="cursor-pointer"
            />
            {/* Trip Coil Orange Harness */}
            <path
              d="M 52 2 C 52 18, 128 24, 128 42"
              fill="none"
              stroke={tripActive ? '#fb923c' : '#c2410c'}
              strokeWidth={activeWireId === 'TRIP_COIL' ? '2.6' : '1.5'}
              onClick={() => selectWire('TRIP_COIL')}
              className="cursor-pointer"
            />
            {/* CT R/Y/B Bundle */}
            <path
              d="M 122 2 C 122 20, 66 24, 66 42"
              fill="none"
              stroke="#38bdf8"
              strokeWidth={activeWireId === 'CT_MEAS' ? '2.6' : '1.5'}
              strokeDasharray={hw.ctShorted ? '4 2' : undefined}
              onClick={() => selectWire('CT_MEAS')}
              className="cursor-pointer"
            />
            {/* VT Purple Bundle */}
            <path
              d="M 136 2 C 136 20, 96 24, 96 42"
              fill="none"
              stroke={hw.vtMcbOn ? '#a855f7' : '#581c87'}
              strokeWidth={activeWireId === 'VT_MEAS' ? '2.6' : '1.5'}
              onClick={() => selectWire('VT_MEAS')}
              className="cursor-pointer"
            />
            {/* Fiber Patch Cord A (Orange) */}
            <path
              d="M 205 2 C 205 20, 218 22, 218 42"
              fill="none"
              stroke={hw.prpAUp ? '#fb923c' : '#475569'}
              strokeWidth={activeWireId === 'PRP_A' ? '2.8' : '2'}
              strokeDasharray={hw.prpAUp ? undefined : '3 3'}
              onClick={() => selectWire('PRP_A')}
              className="cursor-pointer"
            />
            {/* Fiber Patch Cord B (Aqua) */}
            <path
              d="M 235 2 C 235 20, 244 22, 244 42"
              fill="none"
              stroke={hw.prpBUp ? '#22d3ee' : '#475569'}
              strokeWidth={activeWireId === 'PRP_B' ? '2.8' : '2'}
              strokeDasharray={hw.prpBUp ? undefined : '3 3'}
              onClick={() => selectWire('PRP_B')}
              className="cursor-pointer"
            />
          </svg>
          <div className="absolute top-0.5 left-1.5 text-[7.5px] font-mono text-[#94a3b8] pointer-events-none">
            PORT-TO-PORT HARNESS &amp; PATCH CORDS (Click wire)
          </div>
        </div>

        {/* 3. TOP 35mm DIN-RAIL: PHYSICAL MCBs + CONTACTORS + LIU PATCH */}
        <div className="relative bg-[#1e2630] border border-[#475569] rounded-[2px] p-1.5">
          {/* Steel DIN Rail Bar */}
          <div className="h-1 bg-gradient-to-r from-[#94a3b8] via-[#cbd5e1] to-[#94a3b8] rounded-full mb-1.5" />
          <div className="grid grid-cols-4 gap-1">
            {/* F1 110V DC MCB */}
            <button
              type="button"
              onClick={() => {
                onUpdateHw({ dcMcbOn: !hw.dcMcbOn }, `${panelTitle}: F1 110V DC MCB toggled ${!hw.dcMcbOn ? 'ON' : 'OFF'}.`);
                selectWire('DC_FEED');
              }}
              className="bg-[#e2e8f0] text-[#0f172a] rounded-[2px] p-1 border border-[#94a3b8] flex flex-col items-center cursor-pointer"
              title="Click to flip F1 110V DC MCB"
            >
              <span className="text-[8px] font-bold">F1 DC</span>
              <div
                className="w-full h-3.5 my-0.5 rounded-[1px] flex items-center justify-center text-[7.5px] font-extrabold text-white"
                style={{ background: hw.dcMcbOn ? '#16a34a' : '#dc2626' }}
              >
                {hw.dcMcbOn ? '▲ ON' : '▼ OFF'}
              </div>
              <span className="text-[7px] font-mono text-[#475569]">110VDC</span>
            </button>

            {/* F2 110V VT MCB */}
            <button
              type="button"
              onClick={() => {
                onUpdateHw({ vtMcbOn: !hw.vtMcbOn }, `${panelTitle}: F2 110V VT MCB toggled ${!hw.vtMcbOn ? 'ON' : 'OFF'}.`);
                selectWire('VT_MEAS');
              }}
              className="bg-[#e2e8f0] text-[#0f172a] rounded-[2px] p-1 border border-[#94a3b8] flex flex-col items-center cursor-pointer"
              title="Click to flip F2 110V VT MCB"
            >
              <span className="text-[8px] font-bold">F2 VT</span>
              <div
                className="w-full h-3.5 my-0.5 rounded-[1px] flex items-center justify-center text-[7.5px] font-extrabold text-white"
                style={{ background: hw.vtMcbOn ? '#16a34a' : '#dc2626' }}
              >
                {hw.vtMcbOn ? '▲ ON' : '▼ OFF'}
              </div>
              <span className="text-[7px] font-mono text-[#475569]">110VAC</span>
            </button>

            {/* F3 230V AC Heater/Light MCB */}
            <button
              type="button"
              onClick={() =>
                onUpdateHw({ heaterMcbOn: !hw.heaterMcbOn }, `${panelTitle}: F3 230V AC MCB toggled ${!hw.heaterMcbOn ? 'ON' : 'OFF'}.`)
              }
              className="bg-[#e2e8f0] text-[#0f172a] rounded-[2px] p-1 border border-[#94a3b8] flex flex-col items-center cursor-pointer"
              title="Click to flip F3 230V AC MCB"
            >
              <span className="text-[8px] font-bold">F3 AC</span>
              <div
                className="w-full h-3.5 my-0.5 rounded-[1px] flex items-center justify-center text-[7.5px] font-extrabold text-white"
                style={{ background: hw.heaterMcbOn ? '#16a34a' : '#dc2626' }}
              >
                {hw.heaterMcbOn ? '▲ ON' : '▼ OFF'}
              </div>
              <span className="text-[7px] font-mono text-[#475569]">230VAC</span>
            </button>

            {/* Fiber LIU Patch Box */}
            <button
              type="button"
              onClick={() => selectWire('PRP_A')}
              className="bg-[#0f172a] text-[#e2e8f0] rounded-[2px] p-1 border border-[#475569] flex flex-col items-center justify-between cursor-pointer"
              title="Fiber Optic LIU Patch Panel"
            >
              <span className="text-[7.5px] font-bold text-[#38bdf8]">LIU A/B</span>
              <div className="flex gap-1 my-0.5">
                <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: hw.prpAUp ? '#fb923c' : '#475569' }} />
                <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: hw.prpBUp ? '#22d3ee' : '#475569' }} />
              </div>
              <span className="text-[7px] font-mono text-[#94a3b8]">SC/LC</span>
            </button>
          </div>

          {/* 4. CONTACTORS & AUXILIARY RELAYS ON 2nd DIN RAIL */}
          <div className="h-1 bg-gradient-to-r from-[#94a3b8] via-[#cbd5e1] to-[#94a3b8] rounded-full my-1.5" />
          <div className="grid grid-cols-4 gap-1 text-[7.5px] font-mono">
            {/* K86 Master Trip Lockout Relay */}
            <button
              type="button"
              onClick={() => selectWire('TRIP_COIL')}
              className="bg-[#334155] border rounded-[2px] p-1 text-center cursor-pointer"
              style={{ borderColor: tripActive ? '#ef4444' : '#64748b' }}
              title="86 Master Trip Lockout Contactor (A1/A2)"
            >
              <div className="font-bold text-white">K86</div>
              <div
                className="my-0.5 py-[1px] rounded-[1px] font-bold"
                style={{ background: tripActive ? '#dc2626' : '#0f172a', color: tripActive ? '#fff' : '#94a3b8' }}
              >
                {tripActive ? 'TRIP' : 'RESET'}
              </div>
              <div className="text-[6.5px] text-[#cbd5e1]">A1/A2</div>
            </button>

            {/* K52 CB Aux Multiplier Contactor */}
            <button
              type="button"
              onClick={() => selectWire('TRIP_COIL')}
              className="bg-[#334155] border border-[#64748b] rounded-[2px] p-1 text-center cursor-pointer"
              title="K52 Breaker Aux Contactor (52a/52b)"
            >
              <div className="font-bold text-white">K52</div>
              <div
                className="my-0.5 py-[1px] rounded-[1px] font-bold"
                style={{ background: breakerClosed ? '#16a34a' : '#1e293b', color: '#fff' }}
              >
                {breakerClosed ? '52a' : '52b'}
              </div>
              <div className="text-[6.5px] text-[#cbd5e1]">13-14</div>
            </button>

            {/* K74 Trip Circuit Supervision Relay */}
            <button
              type="button"
              onClick={() => selectWire('TRIP_COIL')}
              className="bg-[#334155] border border-[#64748b] rounded-[2px] p-1 text-center cursor-pointer"
              title="K74 Trip Circuit Supervision (TCS)"
            >
              <div className="font-bold text-white">K74</div>
              <div
                className="my-0.5 py-[1px] rounded-[1px] font-bold"
                style={{ background: tcsHealthy && hw.dcMcbOn ? '#15803d' : '#b91c1c', color: '#fff' }}
              >
                {tcsHealthy && hw.dcMcbOn ? 'TCS OK' : 'FAIL'}
              </div>
              <div className="text-[6.5px] text-[#cbd5e1]">95-98</div>
            </button>

            {/* K_INT Interlock Contactor */}
            <button
              type="button"
              onClick={() => selectWire('CLOSE_CMD')}
              className="bg-[#334155] border border-[#64748b] rounded-[2px] p-1 text-center cursor-pointer"
              title="Interlock Permissive Contactor"
            >
              <div className="font-bold text-white">K_INT</div>
              <div
                className="my-0.5 py-[1px] rounded-[1px] font-bold"
                style={{ background: interlockOk && hw.dcMcbOn ? '#0284c7' : '#7f1d1d', color: '#fff' }}
              >
                {interlockOk && hw.dcMcbOn ? 'PERM' : 'BLKD'}
              </div>
              <div className="text-[6.5px] text-[#cbd5e1]">23-24</div>
            </button>
          </div>
        </div>

        {/* 5. BOTTOM MARSHALLING TERMINAL BLOCKS (X1 CT / X2 VT / X3 DC) */}
        <div className="bg-[#0f172a] border border-[#475569] rounded-[2px] p-1.5 space-y-1 text-[8.5px] font-mono">
          <div className="flex items-center justify-between text-[#facc15] font-bold text-[8.5px]">
            <span>MARSHALLING TBs (X1 / X2 / X3)</span>
            <span className="text-[#94a3b8]">PHOENIX URTK</span>
          </div>

          {/* X1 CT Shorting Block */}
          <div
            onClick={() => selectWire('CT_MEAS')}
            className="flex items-center justify-between bg-[#1e293b] px-1.5 py-0.5 rounded cursor-pointer border"
            style={{ borderColor: activeWireId === 'CT_MEAS' ? '#38bdf8' : 'transparent' }}
          >
            <span className="text-[#e2e8f0]">X1 CT (K1/K3/K5/K7)</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateHw({ ctShorted: !hw.ctShorted }, `${panelTitle}: X1 CT Shorting Links ${!hw.ctShorted ? 'SHORTED' : 'OPEN (Normal)'}.`);
              }}
              className="px-1.5 py-[1px] rounded text-[8px] font-bold cursor-pointer"
              style={{ background: hw.ctShorted ? '#d97706' : '#334155', color: '#fff' }}
            >
              {hw.ctShorted ? 'SHORTED' : 'NORM'}
            </button>
          </div>

          {/* X2 VT Terminal Block */}
          <div
            onClick={() => selectWire('VT_MEAS')}
            className="flex items-center justify-between bg-[#1e293b] px-1.5 py-0.5 rounded cursor-pointer border"
            style={{ borderColor: activeWireId === 'VT_MEAS' ? '#a855f7' : 'transparent' }}
          >
            <span className="text-[#e2e8f0]">X2 VT (A11/B11/C11)</span>
            <span className={hw.vtMcbOn ? 'text-[#4ade80] font-bold' : 'text-[#f87171] font-bold'}>
              {hw.vtMcbOn ? '110V AC' : '0V'}
            </span>
          </div>

          {/* X3 110V DC & Yard Field TB */}
          <div
            onClick={() => selectWire('DC_FEED')}
            className="flex items-center justify-between bg-[#1e293b] px-1.5 py-0.5 rounded cursor-pointer border"
            style={{ borderColor: activeWireId === 'DC_FEED' ? '#ef4444' : 'transparent' }}
          >
            <span className="text-[#e2e8f0]">X3 DC (J1+/J2-/K11)</span>
            <span className={hw.dcMcbOn ? 'text-[#4ade80] font-bold' : 'text-[#f87171] font-bold'}>
              {hw.dcMcbOn ? '110V DC' : '0V'}
            </span>
          </div>
        </div>

        {/* 6. LIVE POINT-TO-POINT FERRULE WIRING TRACE BOX */}
        <div className="bg-[#090d16] border border-[#38bdf8]/40 rounded-[2px] p-1.5 text-[8px] font-mono leading-tight space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: activeWire.color }}>
              TRACE: {activeWire.ferrule}
            </span>
            <span className="text-[#94a3b8]">{activeWire.spec}</span>
          </div>
          <div className="text-[#e2e8f0] truncate">{activeWire.from}</div>
          <div className="text-[#38bdf8] truncate">↳ {activeWire.to}</div>
          <div className="text-[#4ade80]">{activeWire.signal}</div>
        </div>
      </div>

      {/* Copper Earth Busbar */}
      <div className="bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#b45309] text-white px-2 py-1 text-center font-mono text-[8.5px] font-bold border-t border-[#fde68a]">
        ⏚ COPPER EARTH BUSBAR (PE OK)
      </div>
    </div>
  );
};

export default CrpRearPanelView;
