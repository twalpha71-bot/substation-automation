import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

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
  isZoomed?: boolean;
  onToggleZoom?: () => void;
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
  bayId,
  panelTitle,
  brandText,
  brandColor,
  modelText,
  breakerClosed,
  tripActive,
  interlockOk,
  tcsHealthy,
  hw,
  isZoomed,
  onToggleZoom,
  onUpdateHw,
  onSelectTrace,
}) => {
  const [activeWireId, setActiveWireId] = useState<string>('TRIP_COIL');

  const wires: WireTrace[] = [
    {
      id: 'DC_FEED',
      from: 'X3:1-2 (110V DC Bus)',
      to: 'F1 MCB (C10A) → IED X100 PWR & K86/K52',
      ferrule: 'J1+ / J2-',
      spec: '2.5mm² FRLS Red/Black Cu',
      color: '#dc2626',
      signal: hw.dcMcbOn ? '110V DC Energized (Bus Live)' : '0V DC — F1 MCB TRIPPED / OFF',
    },
    {
      id: 'TRIP_COIL',
      from: 'IED X102:1-2 (BO1 Trip)',
      to: 'K86 Lockout (A1/A2) → X3:3 (Yard CB Trip)',
      ferrule: 'K11 / K12',
      spec: '1.5mm² Grey FRLS Cu',
      color: '#f97316',
      signal: tripActive ? 'TRIP ENERGIZED — 86 LOCKOUT LATCHED' : 'Standby (K74 TCS Supervised)',
    },
    {
      id: 'CLOSE_CMD',
      from: 'IED X102:3-4 (BO2 Close)',
      to: 'K_INT (13-14) → X3:4 (Yard CB Close)',
      ferrule: 'K21 / K22',
      spec: '1.5mm² Yellow FRLS Cu',
      color: '#eab308',
      signal: interlockOk ? 'Interlock Permissive CLOSED' : 'Blocked by K_INT Interlock',
    },
    {
      id: 'CT_MEAS',
      from: 'X1 CT Shorting TB (1-8)',
      to: 'IED X104 Analog CT (IA / IB / IC / IN)',
      ferrule: 'K1 / K3 / K5 / K7',
      spec: '2.5mm² R-Y-B-Blk Screened Cu',
      color: '#2563eb',
      signal: hw.ctShorted ? 'CT SHORTING LINKS CLOSED (Test Mode)' : breakerClosed ? 'CT Secondary Active (Live Load)' : 'CT Secondary Standby (0 A)',
    },
    {
      id: 'VT_MEAS',
      from: 'X2 VT TB (1-4) → F2 MCB (C6A)',
      to: 'IED X104 Analog VT (VA / VB / VC / VN)',
      ferrule: 'A11 / B11 / C11 / N',
      spec: '1.5mm² R-Y-B-Blk FRLS Cu',
      color: '#9333ea',
      signal: hw.vtMcbOn ? '110V AC / √3 VT Live' : '0V AC — F2 VT MCB OFF',
    },
    {
      id: 'PRP_A',
      from: 'IED SFP ETH-A (Duplex LC)',
      to: 'LIU-A Port 1 → SW-LAN-A-01 (PRP-A)',
      ferrule: 'FO-PRP-A1',
      spec: 'OM3 Multimode Orange LC-LC Patch Cord',
      color: '#fb923c',
      signal: hw.prpAUp ? '1000BASE-SX Optical Link UP (-6.2 dBm)' : 'PATCH CORD UNPLUGGED (LOS)',
    },
    {
      id: 'PRP_B',
      from: 'IED SFP ETH-B (Duplex LC)',
      to: 'LIU-B Port 1 → SW-LAN-B-01 (PRP-B)',
      ferrule: 'FO-PRP-B1',
      spec: 'OM4 Multimode Aqua LC-LC Patch Cord',
      color: '#06b6d4',
      signal: hw.prpBUp ? '1000BASE-SX Optical Link UP (-6.4 dBm)' : 'PATCH CORD UNPLUGGED (LOS)',
    },
  ];

  const activeWire = wires.find((w) => w.id === activeWireId) || wires[0];
  const uid = bayId.replace(/[^a-zA-Z0-9]/g, '');

  const selectWire = (id: string) => {
    setActiveWireId(id);
    const found = wires.find((w) => w.id === id);
    if (found && onSelectTrace) {
      onSelectTrace(`${panelTitle} [${found.ferrule}]: ${found.from} → ${found.to} (${found.signal})`);
    }
  };

  const wOpacity = (id: string) => (activeWireId === id ? 1 : 0.62);
  const wWidth = (id: string, base: number) => (activeWireId === id ? base + 1.1 : base);

  return (
    <div
      className="bg-[#cfd6de] text-[#0f172a] flex flex-col border-2 border-[#475569] relative select-none rounded-[2px] overflow-hidden"
      style={{ boxShadow: 'inset 0 0 0 2px #94a3b8, 0 8px 20px rgba(0,0,0,0.45)' }}
    >
      {/* Top Industrial Cabinet Header */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#0f2544] text-white px-2.5 py-1.5 flex items-center justify-between border-b-2 border-[#020617]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
          <span className="font-bold text-[10px] tracking-wide truncate">REAR DOOR — {panelTitle}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[7.5px] font-mono text-[#cbd5e1] hidden sm:inline">RAL 7035 · IP54</span>
          {onToggleZoom && (
            <button
              type="button"
              onClick={onToggleZoom}
              className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-[2px] bg-[#0ea5e9] hover:bg-[#0284c7] text-white cursor-pointer"
              title={isZoomed ? 'Back to All 5 Panels' : 'Zoom Full Rear Cabinet'}
            >
              {isZoomed ? 'ALL 5' : 'ZOOM'}
            </button>
          )}
        </div>
      </div>

      {/* PHOTOREALISTIC INTERACTIVE INDUSTRIAL REAR CABINET SVG */}
      <div className="relative bg-[#b8c2ce] p-1">
        <svg viewBox="0 0 360 620" className="w-full h-auto block" role="img" aria-label={`Rear wiring of ${panelTitle}`}>
          <defs>
            {/* Brushed Galvanized Steel Backplate */}
            <linearGradient id={`steel-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d8dfe8" />
              <stop offset="45%" stopColor="#c5ced9" />
              <stop offset="100%" stopColor="#b0bac8" />
            </linearGradient>
            {/* 35mm Steel DIN Rail */}
            <linearGradient id={`din-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#e2e8f0" />
              <stop offset="55%" stopColor="#94a3b8" />
              <stop offset="85%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            {/* Brushed Copper Earth Busbar */}
            <linearGradient id={`copper-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9a3412" />
              <stop offset="30%" stopColor="#ea580c" />
              <stop offset="55%" stopColor="#fdba74" />
              <stop offset="85%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
            {/* Dark Anodized Aluminum IED Chassis */}
            <linearGradient id={`ied-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            {/* MCB Molded Body */}
            <linearGradient id={`mcb-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            {/* Transparent Relay Housing */}
            <linearGradient id={`relayglass-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.92" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Galvanized Steel Mounting Plate */}
          <rect x="4" y="4" width="352" height="612" rx="3" fill={`url(#steel-${uid})`} stroke="#64748b" strokeWidth="1.5" />
          {/* 4 Corner Mounting Bolts */}
          {[[12, 12], [348, 12], [12, 608], [348, 608]].map(([cx, cy], idx) => (
            <g key={idx}>
              <circle cx={cx} cy={cy} r="3.5" fill="#94a3b8" stroke="#475569" strokeWidth="0.9" />
              <line x1={cx - 2} y1={cy - 1} x2={cx + 2} y2={cy + 1} stroke="#334155" strokeWidth="0.9" />
            </g>
          ))}

          {/* LEFT & RIGHT VERTICAL SLOTTED PVC WIRING DUCTS (Salzer / Panduit Grey) */}
          <g>
            {/* Left Vertical Duct */}
            <rect x="10" y="22" width="18" height="552" fill="#7c8a99" stroke="#475569" strokeWidth="1" />
            {/* Right Vertical Duct */}
            <rect x="332" y="22" width="18" height="552" fill="#7c8a99" stroke="#475569" strokeWidth="1" />
            {/* Duct Comb Slots */}
            {Array.from({ length: 27 }).map((_, i) => (
              <g key={i}>
                <rect x="23" y={30 + i * 20} width="5" height="9" fill="#334155" />
                <rect x="332" y={30 + i * 20} width="5" height="9" fill="#334155" />
              </g>
            ))}
            {/* Horizontal Slotted Duct #1 (Under IED) */}
            <rect x="28" y="148" width="304" height="18" fill="#8896a6" stroke="#475569" strokeWidth="1" />
            {/* Horizontal Slotted Duct #2 (Between MCBs & Contactors) */}
            <rect x="28" y="294" width="304" height="16" fill="#8896a6" stroke="#475569" strokeWidth="1" />
            {/* Horizontal Slotted Duct #3 (Above Marshalling TBs) */}
            <rect x="28" y="428" width="304" height="16" fill="#8896a6" stroke="#475569" strokeWidth="1" />
            {Array.from({ length: 15 }).map((_, i) => (
              <g key={i}>
                <rect x={36 + i * 20} y="148" width="7" height="4" fill="#334155" />
                <rect x={36 + i * 20} y="162" width="7" height="4" fill="#334155" />
                <rect x={36 + i * 20} y="294" width="7" height="4" fill="#334155" />
                <rect x={36 + i * 20} y="306" width="7" height="4" fill="#334155" />
                <rect x={36 + i * 20} y="428" width="7" height="4" fill="#334155" />
                <rect x={36 + i * 20} y="440" width="7" height="4" fill="#334155" />
              </g>
            ))}
          </g>

          {/* ============================================================== */}
          {/* TIER 1: REAL IED REAR CHASSIS (HEATSINK + TERMINALS + SFP)     */}
          {/* ============================================================== */}
          <g>
            <rect x="34" y="18" width="292" height="122" rx="3" fill={`url(#ied-${uid})`} stroke="#0f172a" strokeWidth="1.5" />
            {/* Top Heatsink Fins */}
            {Array.from({ length: 24 }).map((_, i) => (
              <rect key={i} x={40 + i * 11.8} y="21" width="4" height="10" fill="#475569" opacity="0.7" />
            ))}
            {/* Vendor & Model Rear Nameplate */}
            <text x="42" y="44" fill={brandColor} fontSize="9" fontWeight="800" fontFamily="monospace">{brandText}</text>
            <text x="318" y="44" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="end">{modelText} · REAR CHASSIS</text>

            {/* Module A: X100 PWR & X102 BI/BO Green Phoenix Terminal Header */}
            <rect x="42" y="52" width="84" height="80" rx="2" fill="#0b1220" stroke="#475569" strokeWidth="1" />
            <text x="47" y="63" fill="#94a3b8" fontSize="6.8" fontWeight="700" fontFamily="monospace">X100 PWR / X102 BO</text>
            {/* Green Pluggable Phoenix Block */}
            <rect x="47" y="69" width="74" height="24" rx="1.5" fill="#15803d" stroke="#14532d" strokeWidth="1" />
            {[
              { x: 54, lbl: 'J1+', wire: 'DC_FEED' },
              { x: 66, lbl: 'J2-', wire: 'DC_FEED' },
              { x: 80, lbl: 'BO1', wire: 'TRIP_COIL' },
              { x: 94, lbl: 'BO2', wire: 'CLOSE_CMD' },
              { x: 108, lbl: 'PE', wire: 'DC_FEED' },
            ].map((pin, idx) => (
              <g key={idx} className="cursor-pointer" onClick={() => selectWire(pin.wire)}>
                <circle cx={pin.x} cy="81" r="4" fill="#e2e8f0" stroke="#334155" strokeWidth="0.9" />
                <line x1={pin.x - 2.5} y1="81" x2={pin.x + 2.5} y2="81" stroke="#334155" strokeWidth="1" />
                <text x={pin.x} y="103" fill="#cbd5e1" fontSize="5.8" fontFamily="monospace" textAnchor="middle">{pin.lbl}</text>
              </g>
            ))}
            <text x="84" y="123" fill={hw.dcMcbOn ? '#4ade80' : '#f87171'} fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="700">
              {hw.dcMcbOn ? '110V DC OK' : 'NO DC PWR'}
            </text>

            {/* Module B: X104 Analog CT / VT Heavy Barrier Screw Strip */}
            <rect x="132" y="52" width="102" height="80" rx="2" fill="#0b1220" stroke="#475569" strokeWidth="1" />
            <text x="137" y="63" fill="#94a3b8" fontSize="6.8" fontWeight="700" fontFamily="monospace">X104 CT / VT ANALOG</text>
            <rect x="137" y="69" width="92" height="26" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
            {[
              { x: 145, col: '#ef4444', lbl: 'IA', wire: 'CT_MEAS' },
              { x: 156, col: '#eab308', lbl: 'IB', wire: 'CT_MEAS' },
              { x: 167, col: '#3b82f6', lbl: 'IC', wire: 'CT_MEAS' },
              { x: 178, col: '#111827', lbl: 'IN', wire: 'CT_MEAS' },
              { x: 192, col: '#ef4444', lbl: 'VA', wire: 'VT_MEAS' },
              { x: 203, col: '#eab308', lbl: 'VB', wire: 'VT_MEAS' },
              { x: 214, col: '#3b82f6', lbl: 'VC', wire: 'VT_MEAS' },
              { x: 224, col: '#94a3b8', lbl: 'VN', wire: 'VT_MEAS' },
            ].map((t, idx) => (
              <g key={idx} className="cursor-pointer" onClick={() => selectWire(t.wire)}>
                <rect x={t.x - 4.5} y="71" width="9" height="22" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
                <circle cx={t.x} cy="82" r="3.2" fill="#d97706" stroke="#fde68a" strokeWidth="0.7" />
                <circle cx={t.x} cy="99" r="2.6" fill={t.col} />
                <text x={t.x} y="110" fill="#cbd5e1" fontSize="5.5" fontFamily="monospace" textAnchor="middle">{t.lbl}</text>
              </g>
            ))}
            <text x="183" y="124" fill="#38bdf8" fontSize="6.3" fontFamily="monospace" textAnchor="middle">
              {hw.ctShorted ? 'CT SHORTED' : 'CT 1A · VT 110V'}
            </text>

            {/* Module C: Dual SFP LC Fiber Transceiver Cage (Clickable Plug/Unplug!) */}
            <rect x="240" y="52" width="78" height="80" rx="2" fill="#0b1220" stroke="#475569" strokeWidth="1" />
            <text x="245" y="63" fill="#94a3b8" fontSize="6.8" fontWeight="700" fontFamily="monospace">SFP PRP LC-FO</text>

            {/* ETH-A Orange LC Plug */}
            <g
              className="cursor-pointer"
              onClick={() => {
                const next = !hw.prpAUp;
                onUpdateHw({ prpAUp: next }, `${panelTitle}: Rear ETH-A LC Fiber Patch Cord ${next ? 'PLUGGED IN (1000M UP)' : 'UNPLUGGED (LOS)'}.`);
                selectWire('PRP_A');
              }}
            >
              <rect x="246" y="70" width="30" height="36" rx="1.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.9" />
              <rect x="250" y={hw.prpAUp ? 74 : 84} width="22" height="18" rx="1.5" fill={hw.prpAUp ? '#f97316' : '#475569'} stroke="#fff" strokeWidth="0.6" />
              <circle cx="256" cy={hw.prpAUp ? 83 : 93} r="2.2" fill="#0f172a" />
              <circle cx="266" cy={hw.prpAUp ? 83 : 93} r="2.2" fill="#0f172a" />
              <circle cx="272" cy="73" r="2.2" fill={hw.prpAUp ? '#22c55e' : '#ef4444'} />
              <text x="261" y="116" fill="#fb923c" fontSize="6.2" fontFamily="monospace" textAnchor="middle" fontWeight="700">ETH-A</text>
              <text x="261" y="125" fill={hw.prpAUp ? '#4ade80' : '#f87171'} fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                {hw.prpAUp ? 'UP' : 'LOS'}
              </text>
            </g>

            {/* ETH-B Aqua LC Plug */}
            <g
              className="cursor-pointer"
              onClick={() => {
                const next = !hw.prpBUp;
                onUpdateHw({ prpBUp: next }, `${panelTitle}: Rear ETH-B LC Fiber Patch Cord ${next ? 'PLUGGED IN (1000M UP)' : 'UNPLUGGED (LOS)'}.`);
                selectWire('PRP_B');
              }}
            >
              <rect x="282" y="70" width="30" height="36" rx="1.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.9" />
              <rect x="286" y={hw.prpBUp ? 74 : 84} width="22" height="18" rx="1.5" fill={hw.prpBUp ? '#06b6d4' : '#475569'} stroke="#fff" strokeWidth="0.6" />
              <circle cx="292" cy={hw.prpBUp ? 83 : 93} r="2.2" fill="#0f172a" />
              <circle cx="302" cy={hw.prpBUp ? 83 : 93} r="2.2" fill="#0f172a" />
              <circle cx="308" cy="73" r="2.2" fill={hw.prpBUp ? '#22c55e' : '#ef4444'} />
              <text x="297" y="116" fill="#22d3ee" fontSize="6.2" fontFamily="monospace" textAnchor="middle" fontWeight="700">ETH-B</text>
              <text x="297" y="125" fill={hw.prpBUp ? '#4ade80' : '#f87171'} fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                {hw.prpBUp ? 'UP' : 'LOS'}
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* TIER 2: 35mm DIN-RAIL — PHYSICAL MCBs (F1, F2, F3) + LIU       */}
          {/* ============================================================== */}
          <g>
            {/* 35mm Steel DIN-Rail Bar */}
            <rect x="30" y="216" width="300" height="22" fill={`url(#din-${uid})`} stroke="#475569" strokeWidth="1" />

            {/* 3 Industrial Schneider/ABB-style DIN MCBs */}
            {[
              {
                x: 42,
                tag: 'F1',
                rating: 'C10A · 110V DC',
                on: hw.dcMcbOn,
                wire: 'DC_FEED',
                onClick: () => {
                  const next = !hw.dcMcbOn;
                  onUpdateHw({ dcMcbOn: next }, `${panelTitle}: Rear F1 (110V DC Control MCB) switched ${next ? 'ON' : 'OFF'}.`);
                  selectWire('DC_FEED');
                },
              },
              {
                x: 112,
                tag: 'F2',
                rating: 'C6A · 110V VT',
                on: hw.vtMcbOn,
                wire: 'VT_MEAS',
                onClick: () => {
                  const next = !hw.vtMcbOn;
                  onUpdateHw({ vtMcbOn: next }, `${panelTitle}: Rear F2 (110V VT MCB) switched ${next ? 'ON' : 'OFF'}.`);
                  selectWire('VT_MEAS');
                },
              },
              {
                x: 182,
                tag: 'F3',
                rating: 'C16A · 230V AC',
                on: hw.heaterMcbOn,
                wire: 'DC_FEED',
                onClick: () => {
                  const next = !hw.heaterMcbOn;
                  onUpdateHw({ heaterMcbOn: next }, `${panelTitle}: Rear F3 (230V AC Heater/Lamp MCB) switched ${next ? 'ON' : 'OFF'}.`);
                },
              },
            ].map((mcb) => (
              <g key={mcb.tag} className="cursor-pointer" onClick={mcb.onClick}>
                {/* Molded White/Grey DIN Body */}
                <rect x={mcb.x} y="182" width="60" height="96" rx="2" fill={`url(#mcb-${uid})`} stroke="#475569" strokeWidth="1.2" />
                {/* Top & Bottom Brass Terminal Screws */}
                <circle cx={mcb.x + 16} cy="191" r="3.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                <circle cx={mcb.x + 44} cy="191" r="3.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                <circle cx={mcb.x + 16} cy="269" r="3.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                <circle cx={mcb.x + 44} cy="269" r="3.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                {/* Rating Print */}
                <text x={mcb.x + 30} y="206" fill="#0f172a" fontSize="8" fontWeight="800" fontFamily="monospace" textAnchor="middle">{mcb.tag} MCB</text>
                <text x={mcb.x + 30} y="215" fill="#475569" fontSize="5.8" fontFamily="monospace" textAnchor="middle">{mcb.rating}</text>
                {/* Status Flag Window (Red=ON / Green=OFF per IEC 60898) */}
                <rect x={mcb.x + 18} y="220" width="24" height="8" rx="1" fill={mcb.on ? '#dc2626' : '#16a34a'} stroke="#1e293b" strokeWidth="0.7" />
                <text x={mcb.x + 30} y="226.2" fill="#ffffff" fontSize="5.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                  {mcb.on ? 'I - ON' : 'O - OFF'}
                </text>
                {/* Physical 3D Black Toggle Lever */}
                <rect x={mcb.x + 12} y="232" width="36" height="24" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                <rect
                  x={mcb.x + 15}
                  y={mcb.on ? 234 : 244}
                  width="30"
                  height="10"
                  rx="1.5"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="0.9"
                />
                <line
                  x1={mcb.x + 18}
                  y1={mcb.on ? 239 : 249}
                  x2={mcb.x + 42}
                  y2={mcb.on ? 239 : 249}
                  stroke="#64748b"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* LIU-A / LIU-B Optical Fiber Patch Module on DIN Rail */}
            <g>
              <rect x="252" y="182" width="70" height="96" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
              <text x="287" y="195" fill="#38bdf8" fontSize="7.2" fontWeight="800" fontFamily="monospace" textAnchor="middle">LIU-A / LIU-B</text>
              <text x="287" y="204" fill="#94a3b8" fontSize="5.5" fontFamily="monospace" textAnchor="middle">PRP FIBER COUPLER</text>
              {/* Duplex LC Adapter A */}
              <g className="cursor-pointer" onClick={() => selectWire('PRP_A')}>
                <rect x="260" y="212" width="22" height="32" rx="1.5" fill="#0f172a" stroke="#fb923c" strokeWidth="1" />
                <rect x="264" y="217" width="14" height="14" rx="1" fill={hw.prpAUp ? '#f97316' : '#475569'} />
                <circle cx="271" cy="238" r="2.2" fill={hw.prpAUp ? '#22c55e' : '#ef4444'} />
                <text x="271" y="255" fill="#fb923c" fontSize="5.8" fontFamily="monospace" textAnchor="middle">LAN-A</text>
              </g>
              {/* Duplex LC Adapter B */}
              <g className="cursor-pointer" onClick={() => selectWire('PRP_B')}>
                <rect x="292" y="212" width="22" height="32" rx="1.5" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
                <rect x="296" y="217" width="14" height="14" rx="1" fill={hw.prpBUp ? '#06b6d4' : '#475569'} />
                <circle cx="303" cy="238" r="2.2" fill={hw.prpBUp ? '#22c55e' : '#ef4444'} />
                <text x="303" y="255" fill="#22d3ee" fontSize="5.8" fontFamily="monospace" textAnchor="middle">LAN-B</text>
              </g>
              <text x="287" y="270" fill="#cbd5e1" fontSize="5.4" fontFamily="monospace" textAnchor="middle">IEC 62439-3 PRP</text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* TIER 3: 35mm DIN-RAIL — AUX CONTACTORS & 86 LOCKOUT RELAYS     */}
          {/* ============================================================== */}
          <g>
            {/* 35mm Steel DIN-Rail Bar */}
            <rect x="30" y="356" width="300" height="22" fill={`url(#din-${uid})`} stroke="#475569" strokeWidth="1" />

            {[
              {
                x: 40,
                tag: 'K86',
                sub: '86 LOCKOUT',
                stateText: tripActive ? 'TRIPPED' : 'RESET',
                active: tripActive,
                activeBg: '#dc2626',
                wire: 'TRIP_COIL',
                pins: 'A1/A2 · 11-14',
              },
              {
                x: 112,
                tag: 'K52',
                sub: 'CB AUX 52',
                stateText: breakerClosed ? '52a CLS' : '52b OPN',
                active: breakerClosed,
                activeBg: '#16a34a',
                wire: 'DC_FEED',
                pins: 'A1/A2 · 52a/b',
              },
              {
                x: 184,
                tag: 'K74',
                sub: 'TCS SUPV',
                stateText: tcsHealthy && hw.dcMcbOn ? 'TCS OK' : 'TCS FLT',
                active: tcsHealthy && hw.dcMcbOn,
                activeBg: '#15803d',
                wire: 'TRIP_COIL',
                pins: '95-96 · 97-98',
              },
              {
                x: 256,
                tag: 'K_INT',
                sub: 'INTERLOCK',
                stateText: interlockOk ? 'PERM OK' : 'BLOCKED',
                active: interlockOk,
                activeBg: '#0284c7',
                wire: 'CLOSE_CMD',
                pins: '13-14 · 23-24',
              },
            ].map((rel) => (
              <g key={rel.tag} className="cursor-pointer" onClick={() => selectWire(rel.wire)}>
                {/* DIN-Rail Screw Base Socket */}
                <rect x={rel.x} y="324" width="64" height="90" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1.2" />
                {/* Top & Bottom Socket Terminal Screws */}
                {[12, 26, 40, 52].map((dx) => (
                  <g key={dx}>
                    <circle cx={rel.x + dx} cy="331" r="2.6" fill="#cbd5e1" stroke="#475569" strokeWidth="0.6" />
                    <circle cx={rel.x + dx} cy="407" r="2.6" fill="#cbd5e1" stroke="#475569" strokeWidth="0.6" />
                  </g>
                ))}
                {/* Transparent Polycarbonate Relay Cover */}
                <rect
                  x={rel.x + 5}
                  y="338"
                  width="54"
                  height="61"
                  rx="2"
                  fill={`url(#relayglass-${uid})`}
                  stroke={rel.tag === 'K86' && tripActive ? '#ef4444' : '#94a3b8'}
                  strokeWidth={rel.tag === 'K86' && tripActive ? '1.6' : '0.9'}
                />
                {/* Visible Wound Copper Electromagnetic Coil Inside */}
                <rect x={rel.x + 14} y="346" width="36" height="17" rx="1.5" fill="#b45309" stroke="#f59e0b" strokeWidth="0.7" />
                <line x1={rel.x + 18} y1="346" x2={rel.x + 18} y2="363" stroke="#78350f" strokeWidth="0.8" />
                <line x1={rel.x + 24} y1="346" x2={rel.x + 24} y2="363" stroke="#78350f" strokeWidth="0.8" />
                <line x1={rel.x + 30} y1="346" x2={rel.x + 30} y2="363" stroke="#78350f" strokeWidth="0.8" />
                <line x1={rel.x + 36} y1="346" x2={rel.x + 36} y2="363" stroke="#78350f" strokeWidth="0.8" />
                <line x1={rel.x + 42} y1="346" x2={rel.x + 42} y2="363" stroke="#78350f" strokeWidth="0.8" />
                {/* Relay Tag & Status Flag */}
                <text x={rel.x + 32} y="373" fill="#ffffff" fontSize="7.8" fontWeight="800" fontFamily="monospace" textAnchor="middle">{rel.tag}</text>
                <rect
                  x={rel.x + 10}
                  y="377"
                  width="44"
                  height="11"
                  rx="1.5"
                  fill={rel.active ? rel.activeBg : rel.tag === 'K74' || rel.tag === 'K_INT' ? '#b91c1c' : '#0f172a'}
                />
                <text x={rel.x + 32} y="385" fill="#ffffff" fontSize="6" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                  {rel.stateText}
                </text>
                <text x={rel.x + 32} y="396" fill="#94a3b8" fontSize="5.2" fontFamily="monospace" textAnchor="middle">{rel.pins}</text>
              </g>
            ))}
          </g>

          {/* ============================================================== */}
          {/* TIER 4: MARSHALLING TERMINAL BLOCKS (X1 CT / X2 VT / X3 DC)    */}
          {/* ============================================================== */}
          <g>
            {/* 35mm DIN Rail for Marshalling TBs */}
            <rect x="30" y="482" width="300" height="18" fill={`url(#din-${uid})`} stroke="#475569" strokeWidth="1" />

            {/* X1 CT Shorting Terminal Block (Clickable to Short/Unshort Links!) */}
            <g
              className="cursor-pointer"
              onClick={() => {
                const next = !hw.ctShorted;
                onUpdateHw({ ctShorted: next }, `${panelTitle}: Rear X1 CT Shorting Links ${next ? 'SHORTED (Test Mode)' : 'NORMAL'}.`);
                selectWire('CT_MEAS');
              }}
            >
              <rect x="38" y="456" width="96" height="68" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
              <rect x="38" y="456" width="96" height="13" fill="#334155" />
              <text x="86" y="465" fill="#ffffff" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                X1 CT TB ({hw.ctShorted ? 'SHORTED' : 'NORM'})
              </text>
              {/* 4 Modular CT Slices with Brass Sliding Shorting Bar */}
              {[
                { x: 50, lbl: 'K1', col: '#ef4444' },
                { x: 74, lbl: 'K3', col: '#eab308' },
                { x: 98, lbl: 'K5', col: '#3b82f6' },
                { x: 122, lbl: 'K7', col: '#111827' },
              ].map((s) => (
                <g key={s.lbl}>
                  <rect x={s.x - 10} y="471" width="20" height="48" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.7" />
                  <circle cx={s.x} cy="479" r="3" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  <circle cx={s.x} cy="511" r="3" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  {/* Ferrule Sleeve Tag */}
                  <rect x={s.x - 8} y="498" width="16" height="8" rx="1" fill="#ffffff" stroke="#475569" strokeWidth="0.5" />
                  <text x={s.x} y="504" fill="#0f172a" fontSize="5.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">{s.lbl}</text>
                </g>
              ))}
              {/* Brass CT Shorting Jumper Bar */}
              <rect
                x="44"
                y={hw.ctShorted ? 488 : 484}
                width="84"
                height="5"
                rx="1"
                fill={hw.ctShorted ? '#f59e0b' : '#94a3b8'}
                stroke="#78350f"
                strokeWidth="0.7"
              />
            </g>

            {/* X2 VT Terminal Block */}
            <g className="cursor-pointer" onClick={() => selectWire('VT_MEAS')}>
              <rect x="142" y="456" width="84" height="68" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
              <rect x="142" y="456" width="84" height="13" fill="#4c1d95" />
              <text x="184" y="465" fill="#ffffff" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">X2 VT TB (110V)</text>
              {[
                { x: 153, lbl: 'A11' },
                { x: 174, lbl: 'B11' },
                { x: 195, lbl: 'C11' },
                { x: 215, lbl: 'N' },
              ].map((s) => (
                <g key={s.lbl}>
                  <rect x={s.x - 9} y="471" width="18" height="48" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.7" />
                  <circle cx={s.x} cy="479" r="2.8" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  <circle cx={s.x} cy="511" r="2.8" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  <rect x={s.x - 8} y="492" width="16" height="8" rx="1" fill="#ffffff" stroke="#475569" strokeWidth="0.5" />
                  <text x={s.x} y="498" fill="#0f172a" fontSize="5.2" fontWeight="800" fontFamily="monospace" textAnchor="middle">{s.lbl}</text>
                </g>
              ))}
            </g>

            {/* X3 110V DC & Yard Control TB */}
            <g className="cursor-pointer" onClick={() => selectWire('DC_FEED')}>
              <rect x="234" y="456" width="88" height="68" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
              <rect x="234" y="456" width="88" height="13" fill="#991b1b" />
              <text x="278" y="465" fill="#ffffff" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">X3 DC &amp; YARD TB</text>
              {[
                { x: 245, lbl: 'J1+', wire: 'DC_FEED' },
                { x: 267, lbl: 'J2-', wire: 'DC_FEED' },
                { x: 289, lbl: 'K11', wire: 'TRIP_COIL' },
                { x: 311, lbl: 'K21', wire: 'CLOSE_CMD' },
              ].map((s) => (
                <g key={s.lbl} onClick={(e) => { e.stopPropagation(); selectWire(s.wire); }}>
                  <rect x={s.x - 10} y="471" width="20" height="48" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.7" />
                  <circle cx={s.x} cy="479" r="2.8" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  <circle cx={s.x} cy="511" r="2.8" fill="#d97706" stroke="#78350f" strokeWidth="0.7" />
                  <rect x={s.x - 8} y="492" width="16" height="8" rx="1" fill="#ffffff" stroke="#475569" strokeWidth="0.5" />
                  <text x={s.x} y="498" fill="#0f172a" fontSize="5.2" fontWeight="800" fontFamily="monospace" textAnchor="middle">{s.lbl}</text>
                </g>
              ))}
            </g>

            {/* Outgoing Armoured Multi-Core Yard Cables into Bottom Cable Glands */}
            {[60, 96, 174, 256, 296].map((cx, i) => (
              <g key={i}>
                <line x1={cx} y1="524" x2={cx} y2="564" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                <line x1={cx} y1="524" x2={cx} y2="564" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
                <rect x={cx - 6} y="556" width="12" height="9" rx="1" fill="#94a3b8" stroke="#334155" strokeWidth="0.8" />
              </g>
            ))}
          </g>

          {/* ============================================================== */}
          {/* REAL CONTINUOUS PORT-TO-PORT INSULATED CABLES & PATCH CORDS    */}
          {/* ============================================================== */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* 1. 110V DC Red/Black Power Cable: X3:J1+ -> Left Duct -> F1 MCB -> IED X100 & K52 */}
            <path
              d="M245,479 L245,436 L19,436 L19,191 L58,191 M58,269 L58,302 L19,302 M54,81 L54,156 L19,156 L19,302"
              stroke="#dc2626"
              strokeWidth={wWidth('DC_FEED', 2.4)}
              opacity={wOpacity('DC_FEED')}
              className="cursor-pointer"
              onClick={() => selectWire('DC_FEED')}
            />
            {hw.dcMcbOn && (
              <path
                d="M245,479 L245,436 L19,436 L19,156 L54,156 L54,81"
                stroke="#fca5a5"
                strokeWidth="1.2"
                strokeDasharray="4 8"
                className="crp-flow"
                pointerEvents="none"
              />
            )}

            {/* 2. 86 Trip Coil Orange Cable (K11): IED X102 BO1 -> K86 Coil -> X3:K11 */}
            <path
              d="M80,81 L80,158 L24,158 L24,331 L52,331 M52,407 L52,438 L289,438 L289,479"
              stroke={tripActive ? '#ef4444' : '#f97316'}
              strokeWidth={wWidth('TRIP_COIL', tripActive ? 3.0 : 2.2)}
              opacity={wOpacity('TRIP_COIL')}
              className="cursor-pointer"
              onClick={() => selectWire('TRIP_COIL')}
            />
            {tripActive && (
              <path
                d="M80,81 L80,158 L24,158 L24,331 L52,331 M52,407 L52,438 L289,438 L289,479"
                stroke="#fef08a"
                strokeWidth="1.6"
                strokeDasharray="5 6"
                className="crp-flow"
                pointerEvents="none"
              />
            )}

            {/* 3. Close Command Yellow Cable (K21): IED X102 BO2 -> K_INT -> X3:K21 */}
            <path
              d="M94,81 L94,154 L338,154 L338,331 L282,331 M282,407 L282,434 L311,434 L311,479"
              stroke="#eab308"
              strokeWidth={wWidth('CLOSE_CMD', 2.0)}
              opacity={wOpacity('CLOSE_CMD')}
              className="cursor-pointer"
              onClick={() => selectWire('CLOSE_CMD')}
            />

            {/* 4. 3-Phase CT Secondary Bundle (R/Y/B): X1 CT TB -> Left Duct -> IED X104 CT */}
            <g className="cursor-pointer" onClick={() => selectWire('CT_MEAS')} opacity={wOpacity('CT_MEAS')}>
              <path d="M50,479 L50,441 L14,441 L14,153 L145,153 L145,99" stroke="#ef4444" strokeWidth={wWidth('CT_MEAS', 1.7)} />
              <path d="M74,479 L74,443 L16,443 L16,155 L156,155 L156,99" stroke="#eab308" strokeWidth={wWidth('CT_MEAS', 1.7)} />
              <path d="M98,479 L98,445 L18,445 L18,157 L167,157 L167,99" stroke="#2563eb" strokeWidth={wWidth('CT_MEAS', 1.7)} />
            </g>

            {/* 5. 3-Phase VT Bundle: X2 VT TB -> F2 MCB -> IED X104 VT */}
            <g className="cursor-pointer" onClick={() => selectWire('VT_MEAS')} opacity={wOpacity('VT_MEAS')}>
              <path d="M153,479 L153,432 L128,432 L128,269 M128,191 L128,161 L192,161 L192,99" stroke="#9333ea" strokeWidth={wWidth('VT_MEAS', 1.9)} />
              <path d="M174,479 L174,435 L156,435 L156,269 M156,191 L156,163 L203,163 L203,99" stroke="#a855f7" strokeWidth={wWidth('VT_MEAS', 1.6)} />
            </g>

            {/* 6. OM3 Orange Duplex LC Fiber Patch Cord (ETH-A -> LIU-A) */}
            <path
              d={hw.prpAUp ? 'M261,92 C261,132 342,130 342,175 C342,208 271,196 271,217' : 'M261,102 C261,126 246,136 242,148'}
              stroke="#f97316"
              strokeWidth={wWidth('PRP_A', 2.8)}
              strokeDasharray={hw.prpAUp ? undefined : '4 3'}
              opacity={wOpacity('PRP_A')}
              className="cursor-pointer"
              onClick={() => selectWire('PRP_A')}
            />
            {hw.prpAUp && (
              <path
                d="M261,92 C261,132 342,130 342,175 C342,208 271,196 271,217"
                stroke="#fed7aa"
                strokeWidth="1.1"
                strokeDasharray="3 9"
                className="crp-flow"
                pointerEvents="none"
              />
            )}

            {/* 7. OM4 Aqua Duplex LC Fiber Patch Cord (ETH-B -> LIU-B) */}
            <path
              d={hw.prpBUp ? 'M297,92 C297,138 347,136 347,182 C347,214 303,198 303,217' : 'M297,102 C297,126 312,136 316,148'}
              stroke="#06b6d4"
              strokeWidth={wWidth('PRP_B', 2.8)}
              strokeDasharray={hw.prpBUp ? undefined : '4 3'}
              opacity={wOpacity('PRP_B')}
              className="cursor-pointer"
              onClick={() => selectWire('PRP_B')}
            />
            {hw.prpBUp && (
              <path
                d="M297,92 C297,138 347,136 347,182 C347,214 303,198 303,217"
                stroke="#cffafe"
                strokeWidth="1.1"
                strokeDasharray="3 9"
                className="crp-flow"
                pointerEvents="none"
              />
            )}

            {/* 8. Green-Yellow Striped Protective Earth (PE) Wire to Copper Busbar */}
            <path d="M122,511 L122,578" stroke="#16a34a" strokeWidth="2.6" />
            <path d="M122,511 L122,578" stroke="#facc15" strokeWidth="2.6" strokeDasharray="4 4" />
            <path d="M108,81 L108,150 L21,150 L21,578 L58,578" stroke="#16a34a" strokeWidth="2.2" opacity="0.85" />
            <path d="M108,81 L108,150 L21,150 L21,578 L58,578" stroke="#facc15" strokeWidth="2.2" strokeDasharray="4 4" opacity="0.85" />
          </g>

          {/* ============================================================== */}
          {/* TIER 5: SOLID BRUSHED COPPER EARTH BUSBAR (PE) WITH HEX BOLTS  */}
          {/* ============================================================== */}
          <g>
            <rect x="24" y="572" width="312" height="24" rx="2" fill={`url(#copper-${uid})`} stroke="#7c2d12" strokeWidth="1.4" />
            {[42, 88, 134, 226, 272, 318].map((bx, i) => (
              <g key={i}>
                <circle cx={bx} cy="584" r="4.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
                <circle cx={bx} cy="584" r="2" fill="#b45309" />
              </g>
            ))}
            <text x="180" y="587" fill="#ffffff" fontSize="8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
              ⏚ 25×6mm COPPER EARTH BUSBAR (PE OK)
            </text>
          </g>
        </svg>
      </div>

      {/* LIVE CABLE & FERRULE INSPECTOR FOOTER */}
      <div className="bg-[#0f172a] text-[#e2e8f0] border-t-2 border-[#334155] px-2.5 py-2 text-[8.5px] font-mono leading-snug space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold truncate" style={{ color: activeWire.color }}>
            FERRULE {activeWire.ferrule}
          </span>
          <span className="text-[#94a3b8] truncate">{activeWire.spec}</span>
        </div>
        <div className="text-[#f8fafc] truncate">{activeWire.from}</div>
        <div className="text-[#38bdf8] truncate">↳ {activeWire.to}</div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[#4ade80] font-semibold truncate">{activeWire.signal}</span>
          <span className="text-[7.5px] text-[#64748b] shrink-0">Click MCB / LC / CT / Wire</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 132 kV Control & Relay Panel (CRP) Lineup — Multi-Vendor Industrial Switchgear
// Matches the project's 5-bay multi-vendor IED lineup:
//   1. 132 kV INCOMING LINE-1 -> SIEMENS SIPROTEC 7SA87 (Blue Backlit LCD)
//   2. 132 kV BUS COUPLER     -> Schneider Electric MiCOM C264 (Green LCD)
//   3. 132 kV LINE-2          -> GE MULTILIN D60 (Mint LCD + Blue GE Header)
//   4. 132 kV TRANSFORMER-1   -> SIEMENS SIPROTEC 7UT86 (Blue Backlit LCD)
//   5. 132 kV TRANSFORMER-2   -> ABB Relion RET670 (Silver LCD + Red ABB)
// Full Front View & Back View (PRP LAN-A/B, DIN-Rail MCBs, X1 CT Shorting TB,
// X2 VT TB, X3 110V DC TB, Copper Earth Bar) synced with useSubstationStore.
// ============================================================================

type ViewSide = 'FRONT' | 'BACK';

interface PanelHardwareState {
  dcMcbOn: boolean;
  vtMcbOn: boolean;
  heaterMcbOn: boolean;
  ctShorted: boolean;
  prpAUp: boolean;
  prpBUp: boolean;
}

interface VendorIedProfile {
  panelTitle: string;
  vendor: 'SIEMENS' | 'SCHNEIDER' | 'GE' | 'ABB';
  brandText: string;
  modelText: string;
  bezelBg: string;
  bezelBorder: string;
  brandColor: string;
  modelColor: string;
  lcdBg: string;
  lcdText: string;
  lcdGrid: string;
  keypadBg: string;
}

const VENDOR_PROFILES: VendorIedProfile[] = [
  {
    panelTitle: '132 kV INCOMING LINE-1',
    vendor: 'SIEMENS',
    brandText: 'SIEMENS',
    modelText: 'SIPROTEC 7SA87',
    bezelBg: '#26303d',
    bezelBorder: '#0f172a',
    brandColor: '#e2e8f0',
    modelColor: '#38bdf8',
    lcdBg: 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)',
    lcdText: '#0c192c',
    lcdGrid: '#1e3a8a',
    keypadBg: '#475569',
  },
  {
    panelTitle: '132 kV BUS COUPLER',
    vendor: 'SCHNEIDER',
    brandText: 'Schneider',
    modelText: 'MiCOM C264',
    bezelBg: '#4b5563',
    bezelBorder: '#1f2937',
    brandColor: '#4ade80',
    modelColor: '#f8fafc',
    lcdBg: 'linear-gradient(180deg, #bbf7d0 0%, #86efac 100%)',
    lcdText: '#052e16',
    lcdGrid: '#166534',
    keypadBg: '#374151',
  },
  {
    panelTitle: '132 kV LINE-2',
    vendor: 'GE',
    brandText: 'GE Grid',
    modelText: 'MULTILIN D60',
    bezelBg: '#1f2937',
    bezelBorder: '#090d16',
    brandColor: '#60a5fa',
    modelColor: '#cbd5e1',
    lcdBg: 'linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 100%)',
    lcdText: '#064e3b',
    lcdGrid: '#047857',
    keypadBg: '#334155',
  },
  {
    panelTitle: '132 kV TRANSFORMER-1',
    vendor: 'SIEMENS',
    brandText: 'SIEMENS',
    modelText: 'SIPROTEC 7UT86',
    bezelBg: '#26303d',
    bezelBorder: '#0f172a',
    brandColor: '#e2e8f0',
    modelColor: '#38bdf8',
    lcdBg: 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)',
    lcdText: '#0c192c',
    lcdGrid: '#1e3a8a',
    keypadBg: '#475569',
  },
  {
    panelTitle: '132 kV TRANSFORMER-2',
    vendor: 'ABB',
    brandText: 'ABB',
    modelText: 'Relion RET670',
    bezelBg: '#27272a',
    bezelBorder: '#09090b',
    brandColor: '#f87171',
    modelColor: '#e4e4e7',
    lcdBg: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)',
    lcdText: '#0f172a',
    lcdGrid: '#475569',
    keypadBg: '#3f3f46',
  },
];

export const SwitchgearCrp132kV: React.FC = () => {
  const { bays, ieds, commandBreaker, setBayLocalRemote, triggerProtectionTrip, resetProtectionTrip } = useSubstationStore();

  const CRP_BAY_ORDER: Record<string, number> = {
    'BAY-132-L1': 0,
    'BAY-132-BC': 1,
    'BAY-132-L2': 2,
    'BAY-132-T1': 3,
    'BAY-132-T2': 4,
  };

  const crpBays = useMemo(() => {
    const hv = bays.filter((b) => (b.voltageKv ?? b.voltageAbKv ?? 0) >= 100 || b.name.includes('132'));
    const list = hv.length > 0 ? [...hv] : [...bays];
    list.sort((a, b) => (CRP_BAY_ORDER[a.id] ?? 99) - (CRP_BAY_ORDER[b.id] ?? 99));
    return list.slice(0, 5);
  }, [bays]);

  const [viewSide, setViewSide] = useState<ViewSide>('FRONT');
  const [focusedBayId, setFocusedBayId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>(
    '132 kV Multi-Vendor CRP Lineup Ready — Click any panel TNC / 43LR / Back View MCB to operate live.'
  );

  // Per-panel rear hardware states (MCBs, CT shorting links, PRP links)
  const [hwMap, setHwMap] = useState<Record<string, PanelHardwareState>>({});
  const [annAckMap, setAnnAckMap] = useState<Record<string, boolean>>({});
  const [annTestMap, setAnnTestMap] = useState<Record<string, boolean>>({});
  const [manualTripMap, setManualTripMap] = useState<Record<string, boolean>>({});

  const getHw = (bayId: string): PanelHardwareState =>
    hwMap[bayId] || {
      dcMcbOn: true,
      vtMcbOn: true,
      heaterMcbOn: true,
      ctShorted: false,
      prpAUp: true,
      prpBUp: true,
    };

  const updateHw = (bayId: string, patch: Partial<PanelHardwareState>, logText: string) => {
    setHwMap((prev) => ({
      ...prev,
      [bayId]: { ...getHw(bayId), ...patch },
    }));
    setStatusBanner(logText);
  };

  const handleTnc = (bayId: string, bayLabel: string, dir: 'TRIP' | 'CLOSE') => {
    const bay = crpBays.find((b) => b.id === bayId);
    if (!bay) return;
    const hw = getHw(bayId);
    if (!hw.dcMcbOn) {
      setStatusBanner(`${bayLabel}: BLOCKED — Back View F1 (110V DC Control MCB) is OFF.`);
      return;
    }
    if (dir === 'CLOSE' && bay.protectionTripActive) {
      setStatusBanner(`${bayLabel}: BLOCKED — 86 Master Trip Lockout active. Reset 86 first.`);
      return;
    }
    const target = dir === 'CLOSE' ? 'CLOSED' : 'OPEN';
    const ok = commandBreaker(bay.id, target, 'LOCAL_PANEL');
    if (ok && dir === 'TRIP') {
      setManualTripMap((m) => ({ ...m, [bay.id]: true }));
      setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
    } else if (ok && dir === 'CLOSE') {
      setManualTripMap((m) => ({ ...m, [bay.id]: false }));
    }
    const storeMsg = useSubstationStore.getState().lastCommandFeedback?.message;
    setStatusBanner(
      ok
        ? dir === 'TRIP'
          ? `${bayLabel}: TNC TRIP executed -> ${bay.breakerId} OPEN (Trip lamp & Annunciator blinking, 52b Green ON).`
          : `${bayLabel}: TNC CLOSE executed -> ${bay.breakerId} CLOSED (52a Red ON, Healthy restored).`
        : `${bayLabel}: BLOCKED — ${storeMsg || `TNC ${dir} blocked by interlocking logic.`}`
    );
  };

  const visibleBays = focusedBayId ? crpBays.filter((b) => b.id === focusedBayId) : crpBays;

  return (
    <div className="flex flex-col gap-3 p-2.5 sm:p-4 bg-[#111827] text-[#e2e8f0] rounded-lg border border-[#334155]">
      <style>{`@keyframes crpFastBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.14; } } .crp-blink { animation: crpFastBlink 0.7s infinite; } @keyframes crpFlow { to { stroke-dashoffset: -24; } } .crp-flow { animation: crpFlow 0.9s linear infinite; }`}</style>
      {/* TOP CONTROL ROOM HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#334155]">
        <div>
          <h2 className="text-[15px] sm:text-[17px] font-bold text-white flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#0d4785] text-white border border-[#38bdf8]/40">
              132 kV CRP ROOM
            </span>
            <span>Real-Time 132 kV Multi-Vendor Control &amp; Relay Panel Lineup</span>
          </h2>
          <p className={`text-[11.5px] mt-0.5 ${statusBanner.includes('BLOCKED') ? 'text-[#fbbf24] font-semibold' : 'text-[#94a3b8]'}`}>{statusBanner}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom single bay or full 5-panel lineup */}
          <select
            value={focusedBayId || 'ALL'}
            onChange={(e) => setFocusedBayId(e.target.value === 'ALL' ? null : e.target.value)}
            className="h-[30px] px-2.5 text-[11.5px] rounded bg-[#1e293b] text-white border border-[#475569] font-semibold"
          >
            <option value="ALL">All {crpBays.length} Panels (Lineup View)</option>
            {crpBays.map((b, i) => {
              const prof = VENDOR_PROFILES[(CRP_BAY_ORDER[b.id] ?? i) % VENDOR_PROFILES.length];
              return (
                <option key={b.id} value={b.id}>
                  Zoom: {prof.panelTitle} ({prof.modelText})
                </option>
              );
            })}
          </select>

          {/* Front View / Back View Toggle */}
          <div className="flex rounded overflow-hidden border border-[#475569]">
            <button
              type="button"
              onClick={() => setViewSide('FRONT')}
              className="px-3.5 py-1 text-[11.5px] font-bold cursor-pointer"
              style={{
                background: viewSide === 'FRONT' ? '#0d4785' : '#1e293b',
                color: '#ffffff',
              }}
            >
              Front View
            </button>
            <button
              type="button"
              onClick={() => setViewSide('BACK')}
              className="px-3.5 py-1 text-[11.5px] font-bold cursor-pointer"
              style={{
                background: viewSide === 'BACK' ? '#0d4785' : '#1e293b',
                color: '#ffffff',
              }}
            >
              Back View (Wiring &amp; TBs)
            </button>
          </div>
        </div>
      </div>

      {/* SUBSTATION CONTROL ROOM OVERHEAD CABLE TRAY + PANEL LINEUP */}
      <div className="bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#cbd5e1] rounded-md p-3 pb-4 border border-[#475569] overflow-x-auto">
        {/* Overhead Cable Tray Visual */}
        <div className="h-4 mb-1.5 rounded-t bg-[repeating-linear-gradient(90deg,#475569_0px,#475569_14px,#1e293b_14px,#1e293b_22px)] border-y border-[#64748b] opacity-80 min-w-[920px]" />

        {/* HORIZONTAL PANEL CABINET ROW */}
        <div
          className={`grid gap-[4px] bg-[#1e293b] p-[4px] shadow-2xl ${
            focusedBayId
              ? viewSide === 'BACK'
                ? 'grid-cols-1 max-w-[660px] mx-auto'
                : 'grid-cols-1 max-w-[440px] mx-auto'
              : viewSide === 'BACK'
                ? 'min-w-[1620px]'
                : 'min-w-[1120px]'
          }`}
          style={
            !focusedBayId
              ? { gridTemplateColumns: `repeat(${visibleBays.length}, minmax(${viewSide === 'BACK' ? '316px' : '215px'}, 1fr))` }
              : undefined
          }
        >
          {visibleBays.map((bay) => {
            const origIdx = Math.max(0, crpBays.findIndex((b) => b.id === bay.id));
            const prof = VENDOR_PROFILES[(CRP_BAY_ORDER[bay.id] ?? origIdx) % VENDOR_PROFILES.length];
            const storeIed = ieds.find((i) => i.id === bay.iedId || i.name === bay.iedId);
            const panelTitle = prof.panelTitle || bay.name.toUpperCase();
            const displayModel = storeIed?.model || prof.modelText;
            const displayBrand = storeIed?.vendor ? storeIed.vendor.split(' ')[0].toUpperCase() : prof.brandText;

            const hw = getHw(bay.id);
            const cbClosed = bay.breakerState === 'CLOSED';
            const isRemote = bay.localRemote === 'REMOTE';
            const tripActive = Boolean(bay.protectionTripActive);
            const isBusCoupler = bay.id === 'BAY-132-BC' || bay.bayType === 'BUS_COUPLER';
            const isTripped = tripActive || Boolean(manualTripMap[bay.id]) || (!isBusCoupler && !cbClosed);
            const kvVal = hw.vtMcbOn ? (bay.voltageAbKv ?? bay.voltageKv ?? 132.0) : 0;
            const isEnergized = kvVal > 1;
            const ampVal = hw.ctShorted || !isEnergized ? 0 : (bay.currentA ?? (cbClosed ? 1185 : 0));
            const hzVal = hw.vtMcbOn && isEnergized ? (bay.frequencyHz && bay.frequencyHz > 1 ? bay.frequencyHz : 50.0) : 0;
            const deadBusClosed = cbClosed && !isEnergized;

            const hasAlarm =
              !hw.dcMcbOn ||
              !hw.vtMcbOn ||
              hw.ctShorted ||
              !hw.prpAUp ||
              !hw.prpBUp ||
              deadBusClosed ||
              !(bay.sf6PressureNormal ?? true) ||
              !(bay.tcsHealthy ?? true);

            if (viewSide === 'FRONT') {
              return (
                <div
                  key={bay.id}
                  className="text-[#111827] flex flex-col border-2 border-[#475569] relative select-none rounded-[2px] overflow-hidden"
                  style={{
                    background: 'linear-gradient(180deg, #dde3e9 0%, #cdd4dc 48%, #bec6d0 100%)',
                    boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.65), inset -2px -2px 0 rgba(71,85,105,0.45), 0 6px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* UPPER DOOR */}
                  <div className="p-2.5 pb-3 border-b-[3px] border-[#334155] flex flex-col gap-2.5 relative">
                    {/* Metallic Recessed Door Hinges */}
                    <div className="absolute left-0.5 top-4 w-2 h-7 bg-gradient-to-r from-[#475569] via-[#94a3b8] to-[#334155] rounded-[1px] border border-[#1e293b]" />
                    <div className="absolute left-0.5 bottom-4 w-2 h-7 bg-gradient-to-r from-[#475569] via-[#94a3b8] to-[#334155] rounded-[1px] border border-[#1e293b]" />

                    {/* 1. RIVETED ENGRAVED BLUE HEADER NAMEPLATE */}
                    <div className="bg-gradient-to-b from-[#155a9f] via-[#0e437a] to-[#092d54] text-white text-center py-1.5 px-3 rounded-[2px] border border-[#020617] shadow-md relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#cbd5e1] border border-[#334155]" />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#cbd5e1] border border-[#334155]" />
                      <div className="font-bold text-[10.5px] leading-tight tracking-wider drop-shadow-sm">{panelTitle}</div>
                    </div>

                    {/* 2. MULTI-VENDOR IED FACEPLATE + HEALTHY/ALARM/TRIP LAMPS */}
                    <div className="flex items-stretch gap-2">
                      {/* Authentic Vendor-Styled Relay Faceplate */}
                      <div
                        className="flex-1 border-2 rounded-[2px] p-1.5 flex flex-col gap-1.5 shadow-inner"
                        style={{ background: prof.bezelBg, borderColor: prof.bezelBorder }}
                      >
                        <div className="flex items-center justify-between text-[7.5px] font-extrabold tracking-wider">
                          <span style={{ color: prof.brandColor }}>{displayBrand}</span>
                          <span className="font-mono truncate max-w-[78px]" style={{ color: prof.modelColor }}>
                            {displayModel}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          {/* Vendor-Specific Backlit Graphic LCD */}
                          <div
                            className="flex-1 h-[62px] rounded-[1px] border border-[#0f172a] p-1 flex flex-col justify-between font-mono text-[8px]"
                            style={{
                              background: hw.dcMcbOn ? prof.lcdBg : '#1e293b',
                              color: hw.dcMcbOn ? prof.lcdText : '#64748b',
                            }}
                          >
                            {hw.dcMcbOn ? (
                              <>
                                <div
                                  className="font-bold pb-0.5 flex justify-between"
                                  style={{ borderBottom: `1px solid ${prof.lcdGrid}55` }}
                                >
                                  <span>{bay.bayCode}</span>
                                  <span>{isRemote ? 'REM' : 'LOC'}</span>
                                </div>
                                <svg viewBox="0 0 60 28" className="w-full h-[26px]">
                                  <line x1="30" y1="2" x2="30" y2="26" stroke={prof.lcdGrid} strokeWidth="0.7" strokeDasharray="2 1" />
                                  <line x1="5" y1="14" x2="55" y2="14" stroke={prof.lcdGrid} strokeWidth="0.7" strokeDasharray="2 1" />
                                  <path
                                    d={cbClosed && isEnergized ? 'M5,14 Q17,2 30,14 T55,14' : 'M5,14 L55,14'}
                                    fill="none"
                                    stroke={prof.lcdText}
                                    strokeWidth="1.4"
                                  />
                                </svg>
                                <div className="flex justify-between text-[7px] font-bold">
                                  <span>52:{cbClosed ? 'CLS' : 'OPN'}</span>
                                  <span className={tripActive || isTripped ? 'text-[#dc2626] font-extrabold crp-blink' : deadBusClosed ? 'text-[#b45309] font-extrabold' : ''}>{tripActive ? '86 TRIP!' : isTripped ? 'TRIPPED' : !cbClosed ? 'CB:OPEN' : !isEnergized ? 'NO VOLT' : 'OK'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="m-auto text-[7.5px] text-center">DC OFF</div>
                            )}
                          </div>

                          {/* IED Right Vertical LED Strip */}
                          <div className="w-[14px] bg-[#111827] rounded-[1px] py-1 flex flex-col items-center justify-around">
                            <span className="w-2 h-2 rounded-full" style={{ background: hw.dcMcbOn && !isTripped && !hasAlarm ? '#22c55e' : '#334155' }} title="RUN / HEALTHY" />
                            <span className={`w-2 h-2 rounded-full ${hw.dcMcbOn && isTripped ? 'crp-blink' : ''}`} style={{ background: hw.dcMcbOn && isTripped ? '#ef4444' : '#334155', boxShadow: hw.dcMcbOn && isTripped ? '0 0 6px #ef4444' : undefined }} title="TRIP" />
                            <span className="w-2 h-2 rounded-full" style={{ background: hw.dcMcbOn && hasAlarm ? '#f59e0b' : '#334155' }} title="ALARM" />
                            <span className="w-2 h-2 rounded-full" style={{ background: hw.dcMcbOn && hw.prpAUp ? '#38bdf8' : '#334155' }} title="PRP-A" />
                            <span className="w-2 h-2 rounded-full" style={{ background: hw.dcMcbOn && hw.prpBUp ? '#38bdf8' : '#334155' }} title="PRP-B" />
                          </div>
                        </div>

                        {/* Micro Keypad Row */}
                        <div className="grid grid-cols-5 gap-0.5">
                          {['F1', 'F2', 'F3', 'I', 'O'].map((k) => (
                            <span
                              key={k}
                              className="text-[6.5px] text-white text-center rounded-[1px] py-[1px] font-mono"
                              style={{ background: prof.keypadBg }}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 3 Vertical Physical Pilot Lamps (Healthy / Alarm / Trip) */}
                      <div className="w-[54px] flex flex-col justify-center gap-2.5 pl-0.5">
                        {[
                          { label: 'Healthy', on: hw.dcMcbOn && !isTripped && !hasAlarm, col: '#22c55e', glow: '0 0 8px #22c55e' },
                          { label: 'Alarm', on: hw.dcMcbOn && hasAlarm, col: '#facc15', glow: '0 0 8px #facc15' },
                          { label: 'Trip', on: hw.dcMcbOn && isTripped, col: '#ef4444', glow: '0 0 9px #ef4444' },
                        ].map((lamp) => (
                          <div key={lamp.label} className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded-full border-2 border-[#475569] shrink-0 relative ${
                                lamp.on && lamp.label === 'Trip' ? 'crp-blink' : ''
                              }`}
                              style={{
                                background: lamp.on
                                  ? `radial-gradient(circle at 35% 30%, #ffffff 0%, ${lamp.col} 42%, #0f172a 100%)`
                                  : 'radial-gradient(circle at 35% 30%, #f1f5f9 0%, #94a3b8 65%, #475569 100%)',
                                boxShadow: lamp.on
                                  ? `${lamp.glow}, inset 0 1px 2px rgba(255,255,255,0.8)`
                                  : 'inset 0 1px 3px rgba(0,0,0,0.55)',
                              }}
                            />
                            <span className="text-[9px] font-semibold text-[#1e293b]">{lamp.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. RED 7-SEGMENT DIGITAL MULTIFUNCTION METER */}
                    <div className="mx-auto w-[132px] bg-[#18181b] border-2 border-[#3f3f46] rounded-[2px] px-2.5 py-1.5 shadow-inner font-mono text-right leading-[1.28]">
                      {hw.dcMcbOn ? (
                        <>
                          <div className="text-[12px] font-bold text-[#ff3b30] tracking-wider" style={{ textShadow: '0 0 6px rgba(255,59,48,0.65)' }}>
                            {kvVal.toFixed(1)} <span className="text-[9px] text-[#fca5a5]">kV</span>
                          </div>
                          <div className="text-[12px] font-bold text-[#ff3b30] tracking-wider" style={{ textShadow: '0 0 6px rgba(255,59,48,0.65)' }}>
                            {Math.round(ampVal)} <span className="text-[9px] text-[#fca5a5]">A</span>
                          </div>
                          <div className="text-[11px] font-bold text-[#ff3b30] tracking-wider" style={{ textShadow: '0 0 6px rgba(255,59,48,0.65)' }}>
                            {hzVal.toFixed(2)} <span className="text-[8.5px] text-[#fca5a5]">Hz</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-[#52525b] text-center py-3">--- OFF ---</div>
                      )}
                    </div>
                    {/* 4. 8-WINDOW FACIA ANNUNCIATOR (TEST / ACK / RESET) */}
                    {(() => {
                      const isTest = Boolean(annTestMap[bay.id]);
                      const isAcked = Boolean(annAckMap[bay.id]);
                      const windows = [
                        { id: 'CB_OPN', lbl: 'CB OPEN', active: !cbClosed, crit: false, noFlash: isBusCoupler && !manualTripMap[bay.id] && !tripActive },
                        { id: 'TRIP86', lbl: '86 TRIP', active: tripActive, crit: true },
                        { id: 'DC_FAIL', lbl: 'DC FAIL', active: !hw.dcMcbOn || !(bay.dcSupplyHealthy ?? true), crit: true },
                        { id: 'VT_FAIL', lbl: 'VT FAIL', active: !hw.vtMcbOn || deadBusClosed, crit: false },
                        { id: 'TCS74', lbl: 'TCS 74', active: !hw.dcMcbOn || !(bay.tcsHealthy ?? true), crit: true },
                        { id: 'SF6', lbl: 'SF6 LOW', active: !(bay.sf6PressureNormal ?? true), crit: true },
                        { id: 'PRP', lbl: 'PRP FLT', active: !hw.prpAUp || !hw.prpBUp, crit: false },
                        { id: 'CT', lbl: 'CT SHRT', active: hw.ctShorted, crit: false },
                      ];
                      return (
                        <div className="bg-[#181e27] border border-[#475569] rounded-[2px] p-1 space-y-1">
                          <div className="flex items-center justify-between text-[7px] font-mono text-[#94a3b8]">
                            <span>FACIA ANNUNCIATOR</span>
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAnnTestMap((m) => ({ ...m, [bay.id]: !m[bay.id] }));
                                  setStatusBanner(`${panelTitle}: Annunciator Lamp Test ${!isTest ? 'ON' : 'OFF'}.`);
                                }}
                                className="px-1 bg-[#334155] hover:bg-[#475569] text-white rounded-[1px] cursor-pointer"
                              >
                                TST
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnnAckMap((m) => ({ ...m, [bay.id]: true }));
                                  setStatusBanner(`${panelTitle}: Annunciator alarms acknowledged.`);
                                }}
                                className="px-1 bg-[#0369a1] hover:bg-[#0284c7] text-white rounded-[1px] cursor-pointer"
                              >
                                ACK
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (tripActive) resetProtectionTrip(bay.id);
                                  setManualTripMap((m) => ({ ...m, [bay.id]: false }));
                                  setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
                                  setAnnTestMap((m) => ({ ...m, [bay.id]: false }));
                                  setStatusBanner(`${panelTitle}: Annunciator & 86 Trip Reset.`);
                                }}
                                className="px-1 bg-[#15803d] hover:bg-[#166534] text-white rounded-[1px] cursor-pointer"
                              >
                                RST
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-0.5">
                            {windows.map((w) => {
                              const lit = isTest || w.active;
                              const flash = !isTest && w.active && !isAcked && !(w as { noFlash?: boolean }).noFlash;
                              return (
                                <div
                                  key={w.id}
                                  className={`py-[3px] px-0.5 text-center font-mono text-[6.5px] font-bold rounded-[1px] border ${
                                    flash ? 'crp-blink' : ''
                                  }`}
                                  style={{
                                    background: lit ? (w.crit ? '#dc2626' : '#d97706') : '#0f172a',
                                    color: lit ? '#ffffff' : '#475569',
                                    borderColor: lit ? '#fde68a' : '#334155',
                                  }}
                                >
                                  {w.lbl}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* LOWER DOOR (MIMIC + CONTROLS + VENT LOUVERS) */}
                  <div className="p-2.5 pt-2 flex-1 flex flex-col justify-between gap-2 relative">
                    {/* Recessed Black Door Handle */}
                    <div className="absolute left-1 top-8 w-2 h-11 bg-[#111827] rounded-[2px] border border-[#475569]" />

                    <div className="flex items-start justify-between gap-1 pl-3">
                      {/* Printed Single-Line Mimic Diagram with Illuminated CB Indicator */}
                      <svg viewBox="0 0 110 135" className="w-[105px] h-[126px] shrink-0">
                        <line x1="20" y1="10" x2="95" y2="10" stroke="#111827" strokeWidth="3.5" />
                        <line x1="56" y1="10" x2="56" y2="26" stroke="#111827" strokeWidth="2.2" />
                        <circle cx="56" cy="27" r="2.3" fill="#111827" />
                        <line x1="56" y1="27" x2="56" y2="42" stroke="#111827" strokeWidth="2.2" />
                        <rect
                          x="47"
                          y="44"
                          width="18"
                          height="18"
                          rx="1"
                          fill={hw.dcMcbOn ? (cbClosed ? '#ef4444' : '#22c55e') : '#64748b'}
                          stroke="#111827"
                          strokeWidth="2"
                        />
                        <line x1="56" y1="62" x2="56" y2="80" stroke="#111827" strokeWidth="2.2" />
                        <circle cx="56" cy="88" r="8" fill="none" stroke="#111827" strokeWidth="2" />
                        <line x1="56" y1="96" x2="56" y2="122" stroke="#111827" strokeWidth="2.2" />
                        <line x1="56" y1="88" x2="88" y2="88" stroke="#111827" strokeWidth="1.6" />
                        <line x1="88" y1="88" x2="88" y2="112" stroke="#111827" strokeWidth="1.6" />
                        <line x1="81" y1="112" x2="95" y2="112" stroke="#111827" strokeWidth="1.8" />
                        <line x1="84" y1="116" x2="92" y2="116" stroke="#111827" strokeWidth="1.5" />
                        <line x1="56" y1="88" x2="26" y2="88" stroke="#111827" strokeWidth="1.6" />
                        <rect x="21" y="94" width="10" height="14" fill="none" stroke="#111827" strokeWidth="1.5" />
                      </svg>

                      {/* Right Control Cluster: 3D Labeled Pilot Lamps + Rotary 43LR + Pistol-Grip TNC + 86 */}
                      <div className="flex-1 flex flex-col gap-1.5 pt-1">
                        {/* 4 Domed Chrome-Ring Status Pilot Lamps with Engraved Tags */}
                        <div className="grid grid-cols-4 gap-0.5 bg-[#b8c1cc] border border-[#64748b] rounded-[2px] px-1 py-1 shadow-inner">
                          {[
                            { tag: 'SPR', on: hw.dcMcbOn && (bay.springCharged ?? true), col: '#2563eb', glow: '0 0 6px #3b82f6', title: 'Spring Charged' },
                            { tag: '79', on: hw.dcMcbOn && bay.autoRecloseStatus === 'IN_PROGRESS', col: '#eab308', glow: '0 0 6px #facc15', title: `Auto-Reclose (${bay.autoRecloseStatus || 'READY'})` },
                            { tag: '52a', on: hw.dcMcbOn && cbClosed, col: '#dc2626', glow: '0 0 7px #ef4444', title: '52a: CB Closed' },
                            { tag: '52b', on: hw.dcMcbOn && !cbClosed, col: '#16a34a', glow: '0 0 7px #22c55e', title: '52b: CB Open' },
                          ].map((l) => (
                            <div key={l.tag} className="flex flex-col items-center gap-0.5" title={l.title}>
                              <span
                                className="w-3.5 h-3.5 rounded-full border-2 border-[#334155]"
                                style={{
                                  background: l.on
                                    ? `radial-gradient(circle at 35% 30%, #ffffff 0%, ${l.col} 45%, #0f172a 100%)`
                                    : 'radial-gradient(circle at 35% 30%, #e2e8f0 0%, #94a3b8 70%, #475569 100%)',
                                  boxShadow: l.on ? l.glow : 'inset 0 1px 2px rgba(0,0,0,0.45)',
                                }}
                              />
                              <span className="text-[6.5px] font-mono font-bold text-[#1e293b] leading-none">{l.tag}</span>
                            </div>
                          ))}
                        </div>

                        {/* Realistic Rotary 43LR Key-Selector Bezel */}
                        <button
                          type="button"
                          onClick={() => setBayLocalRemote(bay.id, isRemote ? 'LOCAL' : 'REMOTE')}
                          className="w-full py-1 px-1.5 rounded-[2px] bg-[#1e293b] hover:bg-[#0f172a] border border-[#475569] shadow-sm flex items-center justify-between cursor-pointer"
                          title="43LR Local/Remote Rotary Selector Switch (Click to toggle)"
                        >
                          <div className="flex flex-col text-left leading-tight">
                            <span className="text-[6.5px] font-mono text-[#94a3b8]">43LR SELECTOR</span>
                            <span className="text-[8.5px] font-mono font-extrabold" style={{ color: isRemote ? '#38bdf8' : '#fbbf24' }}>
                              {isRemote ? 'REMOTE' : 'LOCAL'}
                            </span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#64748b] to-[#1e293b] border border-[#cbd5e1] flex items-center justify-center shadow-inner">
                            <div
                              className="w-4 h-1.5 bg-[#f8fafc] rounded-full transition-transform duration-150"
                              style={{ transform: isRemote ? 'rotate(38deg)' : 'rotate(-38deg)' }}
                            />
                          </div>
                        </button>

                        {/* Realistic Recessed Pistol-Grip TNC Control Switch */}
                        <div className="bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] border border-[#475569] rounded-[2px] p-1 shadow-inner">
                          <div className="flex items-center justify-between text-[7px] font-mono font-extrabold text-[#1e293b] px-0.5 mb-1">
                            <span className="text-[#15803d]">T</span>
                            <span>TNC (52)</span>
                            <span className="text-[#dc2626]">C</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => handleTnc(bay.id, panelTitle, 'TRIP')}
                              className="py-1 rounded-[2px] bg-gradient-to-b from-[#16a34a] to-[#14532d] hover:from-[#22c55e] text-white font-bold text-[8px] border border-[#052e16] shadow cursor-pointer"
                            >
                              TRIP
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTnc(bay.id, panelTitle, 'CLOSE')}
                              className="py-1 rounded-[2px] bg-gradient-to-b from-[#ef4444] to-[#991b1b] hover:from-[#f87171] text-white font-bold text-[8px] border border-[#450a0a] shadow cursor-pointer"
                            >
                              CLOSE
                            </button>
                          </div>
                        </div>

                        {tripActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              resetProtectionTrip(bay.id);
                              setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
                              setStatusBanner(`${panelTitle}: 86 Master Trip Lockout reset.`);
                            }}
                            className="w-full py-1 rounded-[2px] bg-gradient-to-b from-[#dc2626] to-[#7f1d1d] text-white text-[8px] font-bold border border-[#fca5a5] crp-blink cursor-pointer shadow"
                          >
                            RESET 86 LOCKOUT
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
                              triggerProtectionTrip(bay.id, '86 Master Trip Test');
                              setStatusBanner(`${panelTitle}: PROTECTION TRIP (86) operated! Trip lamp & Annunciator flashing.`);
                            }}
                            className="w-full py-1 rounded-[2px] bg-gradient-to-b from-[#991b1b] to-[#450a0a] hover:from-[#dc2626] text-white border border-[#fca5a5]/40 text-[7.8px] font-bold cursor-pointer shadow-sm"
                            title="Simulate Protection Trip (86 Lockout + Blinking Trip Lamp + Annunciator)"
                          >
                            ⚡ 86 TRIP TEST
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Engraved High Voltage Danger Tag + Steel Ventilation Louvers */}
                    <div className="space-y-1.5 px-1.5 pt-0.5">
                      <div className="bg-[#facc15] text-[#0f172a] border border-[#0f172a] rounded-[1px] py-[1px] text-center font-mono text-[6.8px] font-extrabold tracking-wider">
                        ⚡ DANGER · 132,000 VOLTS · CRP {bay.bayCode}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[0, 1].map((g) => (
                          <div
                            key={g}
                            className="h-6 rounded-[1px] border border-[#64748b] bg-[repeating-linear-gradient(180deg,#334155_0px,#334155_2px,#b8c1cc_2px,#b8c1cc_5px)] shadow-inner"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dark Steel Base Plinth */}
                  <div className="h-2.5 bg-[#1e293b] border-t border-[#0f172a]" />
                </div>
              );
            }

            // ==================== BACK VIEW (REALISTIC DEVICES, CONTACTORS, MCBs & PATCH CORDS) ====================
            return (
              <CrpRearPanelView
                key={bay.id}
                bayId={bay.id}
                panelTitle={panelTitle}
                brandText={displayBrand}
                brandColor={prof.brandColor}
                modelText={displayModel}
                breakerClosed={cbClosed}
                tripActive={tripActive}
                interlockOk={Boolean(bay.interlockPermissive)}
                tcsHealthy={Boolean(bay.tcsHealthy)}
                hw={hw}
                isZoomed={focusedBayId === bay.id}
                onToggleZoom={() => setFocusedBayId(focusedBayId === bay.id ? null : bay.id)}
                onUpdateHw={(patch, logText) => updateHw(bay.id, patch, logText)}
                onSelectTrace={(traceText) => setStatusBanner(traceText)}
              />
            );
          })}
        </div>

        {/* Yellow Control Room Floor Safety Line */}
        <div className="h-2 mt-3 rounded bg-gradient-to-r from-[#eab308] via-[#facc15] to-[#eab308] shadow-sm min-w-[920px]" />
      </div>
    </div>
  );
};

export default SwitchgearCrp132kV;
