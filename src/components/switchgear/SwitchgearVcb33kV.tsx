import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Real-Time 33 kV Indoor Metal-Clad VCB Switchgear Room (IEC 62271-200)
// Synced live to useSubstationStore (all 11 real 33 kV bays + dynamic feeders):
//   Bus 33-A: BAY-33-INC1, BAY-33-F01, BAY-33-F02, BAY-33-F03, BAY-33-TF1
//   Coupler : BAY-33-BC (CB-33, normally OPEN)
//   Bus 33-B: BAY-33-INC2, BAY-33-F04, BAY-33-F05, BAY-33-F06, BAY-33-TF2
// Features:
//   - Front View: 3-Compartment Metal-Clad Cubicle (LV Relay/VPIS/Annunciator,
//     Draw-Out VCB Truck with RACK IN/OUT + Spring Charge + Mechanical Counter,
//     Cable Chamber with XLPE Boots & Interlocked Earth Switch Q8)
//   - Internal Cutaway View: Live 3-Phase Copper Busbars, Draw-Out Vacuum
//     Interrupter Bottles, Safety Shutters, Toroidal CTs, Q8 Earth Blades & XLPE
// ============================================================================

type ViewMode = 'FRONT' | 'INTERNAL';
type TruckPosition = 'SERVICE' | 'TEST' | 'ISOLATED';
type SectionFilter = 'ALL' | 'A' | 'COUPLE' | 'B';

interface VcbVendorStyle {
  brand: string;
  model: string;
  brandColor: string;
  modelColor: string;
  bezelBg: string;
  lcdBg: string;
  lcdText: string;
  lcdGrid: string;
}

const VCB_VENDOR_STYLES: VcbVendorStyle[] = [
  {
    brand: 'SIEMENS',
    model: 'SIPROTEC 7SJ85',
    brandColor: '#e2e8f0',
    modelColor: '#38bdf8',
    bezelBg: '#26303d',
    lcdBg: 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)',
    lcdText: '#0c192c',
    lcdGrid: '#1e3a8a',
  },
  {
    brand: 'ABB',
    model: 'Relion REF615',
    brandColor: '#f87171',
    modelColor: '#e4e4e7',
    bezelBg: '#27272a',
    lcdBg: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)',
    lcdText: '#0f172a',
    lcdGrid: '#475569',
  },
  {
    brand: 'SCHNEIDER',
    model: 'MiCOM P143',
    brandColor: '#4ade80',
    modelColor: '#f8fafc',
    bezelBg: '#374151',
    lcdBg: 'linear-gradient(180deg, #bbf7d0 0%, #86efac 100%)',
    lcdText: '#052e16',
    lcdGrid: '#166534',
  },
  {
    brand: 'GE Grid',
    model: 'MULTILIN F650',
    brandColor: '#60a5fa',
    modelColor: '#cbd5e1',
    bezelBg: '#1f2937',
    lcdBg: 'linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 100%)',
    lcdText: '#064e3b',
    lcdGrid: '#047857',
  },
];

const BAY_33_ORDER: Record<string, number> = {
  'BAY-33-INC1': 0,
  'BAY-33-F01': 1,
  'BAY-33-F02': 2,
  'BAY-33-F03': 3,
  'BAY-33-TF1': 4,
  'BAY-33-BC': 5,
  'BAY-33-INC2': 6,
  'BAY-33-F04': 7,
  'BAY-33-F05': 8,
  'BAY-33-F06': 9,
  'BAY-33-TF2': 10,
};

interface InternalCutawayProps {
  bayId: string;
  bayCode: string;
  title: string;
  busSection: string;
  busLive: boolean;
  cbClosed: boolean;
  tripActive: boolean;
  earthClosed: boolean;
  truckPos: TruckPosition;
  springCharged: boolean;
  kvVal: number;
  ampVal: number;
  isZoomed: boolean;
  onToggleZoom: () => void;
  onRack: (next: TruckPosition) => void;
  onToggleEarth: () => void;
  onInspect: (msg: string) => void;
}

const VcbInternalCutaway: React.FC<InternalCutawayProps> = ({
  bayId,
  bayCode,
  title,
  busSection,
  busLive,
  cbClosed,
  tripActive,
  earthClosed,
  truckPos,
  springCharged,
  kvVal,
  ampVal,
  isZoomed,
  onToggleZoom,
  onRack,
  onToggleEarth,
  onInspect,
}) => {
  const [selectedPart, setSelectedPart] = useState<string>('VCB');
  const [activeNote, setActiveNote] = useState<string>(
    `IEC 62271-200 LSC2B-PM · ${truckPos} · ${cbClosed ? 'CB CLOSED' : 'CB OPEN'} · ${earthClosed ? 'Q8 EARTHED' : 'Q8 OPEN'}`
  );
  const uid = bayId.replace(/[^a-zA-Z0-9]/g, '');
  const inService = truckPos === 'SERVICE';
  const shuttersOpen = inService;
  const cableLive = busLive && inService && cbClosed && !earthClosed;
  const truckOffsetX = truckPos === 'SERVICE' ? 0 : truckPos === 'TEST' ? 24 : 44;

  const isIncomer = bayId.includes('INC');
  const isCoupler = bayId.includes('BC');
  const ratingText = isIncomer ? '1250A · 31.5kA' : isCoupler ? '1600A TIE · 31.5kA' : '630A · 31.5kA';
  const ctSpec = isIncomer ? '1200/1A 5P20' : isCoupler ? '1600/1A 5P20' : '400/1A 5P20';
  const cableSpec = isCoupler ? 'Bus-A ↔ Bus-B Copper Tie' : isIncomer ? '2×3C×400mm² 33kV XLPE' : '1×3C×300mm² 33kV XLPE';

  const inspectPart = (part: string, msg: string) => {
    setSelectedPart(part);
    setActiveNote(msg);
    onInspect(`${bayCode} [${part}]: ${msg}`);
  };

  return (
    <div
      className="bg-[#cfd6de] text-[#0f172a] flex flex-col border-2 border-[#475569] rounded-[3px] overflow-hidden select-none"
      style={{ boxShadow: 'inset 0 0 0 2px #94a3b8, 0 10px 24px rgba(0,0,0,0.48)' }}
    >
      {/* Cubicle Header with Live Status + Rating + Zoom */}
      <div className="bg-gradient-to-b from-[#1a365d] via-[#13294b] to-[#0b1b34] text-white px-2.5 py-1.5 flex items-center justify-between gap-2 border-b-2 border-[#020617]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: busLive ? '#22c55e' : '#ef4444',
                boxShadow: busLive ? '0 0 6px #22c55e' : '0 0 5px #ef4444',
              }}
            />
            <span className="font-extrabold text-[10.5px] tracking-wide truncate">
              {bayCode} · {title}
            </span>
          </div>
          <div className="text-[7.8px] font-mono text-[#93c5fd] pl-3.5 truncate">
            BUS 33-{busSection} · {ratingText} · IEC 62271-200
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleZoom}
          className="px-2 py-0.5 text-[8px] font-mono font-bold rounded-[2px] bg-[#0ea5e9] hover:bg-[#0284c7] text-white cursor-pointer shrink-0 shadow-sm"
        >
          {isZoomed ? 'ALL' : 'ZOOM'}
        </button>
      </div>

      {/* PHOTOREALISTIC IEC 62271-200 METAL-CLAD INTERNAL CUTAWAY SVG */}
      <div className="bg-[#aeb8c5] p-1">
        <svg viewBox="0 0 360 610" className="w-full h-auto block" role="img" aria-label={`33kV VCB Internal ${bayCode}`}>
          <defs>
            <linearGradient id={`vcbsteel-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#dde3eb" />
              <stop offset="50%" stopColor="#c5ceda" />
              <stop offset="100%" stopColor="#a9b4c4" />
            </linearGradient>
            <linearGradient id={`vcbcu-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9a3412" />
              <stop offset="35%" stopColor="#ea580c" />
              <stop offset="60%" stopColor="#fdba74" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
            <linearGradient id={`vcbpole-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9f1239" />
              <stop offset="45%" stopColor="#be123c" />
              <stop offset="100%" stopColor="#4c0519" />
            </linearGradient>
            <linearGradient id={`vcbcer-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id={`vcbmech-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Outer Galvanized Steel Metal-Clad Cubicle Frame */}
          <rect x="4" y="4" width="352" height="602" rx="3" fill={`url(#vcbsteel-${uid})`} stroke="#334155" strokeWidth="2" />
          {/* Top Arc-Fault Pressure Relief Vent Flap */}
          <rect x="96" y="6" width="168" height="10" rx="1.5" fill="#475569" stroke="#1e293b" strokeWidth="0.9" />
          <text x="180" y="13.2" fill="#e2e8f0" fontSize="5.8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
            ARC-FAULT PRESSURE RELIEF FLAP (IAC AFLR 31.5kA)
          </text>

          {/* ============================================================== */}
          {/* CHAMBER A: 33 kV INSULATED COPPER MAIN BUSBAR CHAMBER          */}
          {/* ============================================================== */}
          <g
            className="cursor-pointer"
            onClick={() =>
              inspectPart(
                'BUSBAR',
                `Bus 33-${busSection} 3-Phase Copper Busbars (2500A) — ${busLive ? `${kvVal.toFixed(1)} kV ENERGIZED · 41°C` : 'DE-ENERGIZED (0.0 kV)'}`
              )
            }
          >
            <rect
              x="12"
              y="20"
              width="336"
              height="108"
              rx="2"
              fill="#152033"
              stroke={selectedPart === 'BUSBAR' ? '#38bdf8' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="20" y="34" fill="#cbd5e1" fontSize="7.5" fontWeight="800" fontFamily="monospace">
              A. 33 kV MAIN COPPER BUSBARS (BUS 33-{busSection})
            </text>
            <rect x="252" y="24" width="88" height="13" rx="2" fill={busLive ? '#14532d' : '#7f1d1d'} stroke={busLive ? '#22c55e' : '#ef4444'} strokeWidth="0.8" />
            <text x="296" y="33" fill={busLive ? '#4ade80' : '#fca5a5'} fontSize="7" fontWeight="800" fontFamily="monospace" textAnchor="middle">
              {busLive ? `${kvVal.toFixed(1)} kV LIVE` : 'DEAD BUS 0kV'}
            </text>

            {/* 3 Horizontal Insulated Copper Busbars with Ribbed Epoxy Post Insulators & Tap Bolts */}
            {[
              { y: 54, col: '#ef4444', glow: '#fecaca', lbl: 'L1 (R)', tapX: 46 },
              { y: 78, col: '#eab308', glow: '#fef08a', lbl: 'L2 (Y)', tapX: 64 },
              { y: 102, col: '#3b82f6', glow: '#bfdbfe', lbl: 'L3 (B)', tapX: 82 },
            ].map((bar) => (
              <g key={bar.lbl}>
                {/* Ribbed Epoxy Post Insulators */}
                {[126, 286].map((ix) => (
                  <g key={ix}>
                    <rect x={ix - 6} y={bar.y - 8} width="12" height="16" rx="1.5" fill="#7c2d12" stroke="#451a03" strokeWidth="0.8" />
                    <line x1={ix - 6} y1={bar.y - 3} x2={ix + 6} y2={bar.y - 3} stroke="#b45309" strokeWidth="1" />
                    <line x1={ix - 6} y1={bar.y + 3} x2={ix + 6} y2={bar.y + 3} stroke="#b45309" strokeWidth="1" />
                  </g>
                ))}
                {/* Copper Busbar Strip */}
                <rect x="18" y={bar.y - 4.5} width="324" height="9" rx="1.5" fill={bar.col} opacity={busLive ? 0.96 : 0.38} stroke="#0f172a" strokeWidth="0.6" />
                {busLive && (
                  <line
                    x1="22"
                    y1={bar.y}
                    x2="338"
                    y2={bar.y}
                    stroke={bar.glow}
                    strokeWidth="2.2"
                    strokeDasharray="7 11"
                    className="vcb-flow"
                  />
                )}
                {/* Bolted Busbar Dropper Tap Joint */}
                <rect x={bar.tapX - 5} y={bar.y - 5} width="10" height="10" rx="1" fill="#d97706" stroke="#451a03" strokeWidth="0.8" />
                <circle cx={bar.tapX} cy={bar.y} r="2.2" fill="#fef3c7" />
                <text x="316" y={bar.y + 2.5} fill="#ffffff" fontSize="6.8" fontWeight="800" fontFamily="monospace">
                  {bar.lbl}
                </text>
              </g>
            ))}

            {/* Continuous 3-Phase Copper Risers Dropping Through Epoxy Roof Bushings into Chamber B */}
            <path d="M46,59 L46,144" stroke="#ef4444" strokeWidth="4" opacity={busLive ? 0.95 : 0.4} />
            <path d="M64,83 L64,144" stroke="#eab308" strokeWidth="4" opacity={busLive ? 0.95 : 0.4} />
            <path d="M82,107 L82,144" stroke="#3b82f6" strokeWidth="4" opacity={busLive ? 0.95 : 0.4} />
          </g>

          {/* Partition Steel Barrier + 3 Epoxy Busbar Bushings */}
          <rect x="12" y="128" width="336" height="8" fill="#64748b" stroke="#334155" strokeWidth="0.9" />
          {[46, 64, 82].map((bx, i) => (
            <rect key={i} x={bx - 5} y="125" width="10" height="14" rx="2" fill="#7c2d12" stroke="#f59e0b" strokeWidth="0.7" />
          ))}

          {/* ============================================================== */}
          {/* CHAMBER B: DRAW-OUT 3-POLE VACUUM CIRCUIT BREAKER (VCB TRUCK)  */}
          {/* ============================================================== */}
          <g>
            <rect
              x="12"
              y="136"
              width="336"
              height="214"
              rx="2"
              fill="#0d1526"
              stroke={selectedPart === 'VCB' ? '#38bdf8' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="20" y="150" fill="#cbd5e1" fontSize="7.5" fontWeight="800" fontFamily="monospace">
              B. DRAW-OUT 3-POLE VCB TRUCK ({ratingText})
            </text>
            <rect
              x="252"
              y="140"
              width="88"
              height="13"
              rx="2"
              fill={inService ? '#0c4a6e' : truckPos === 'TEST' ? '#78350f' : '#7f1d1d'}
              stroke={inService ? '#38bdf8' : '#fbbf24'}
              strokeWidth="0.8"
            />
            <text x="296" y="149" fill="#ffffff" fontSize="7" fontWeight="800" fontFamily="monospace" textAnchor="middle">
              POS: {truckPos}
            </text>

            {/* Busbar-to-Spout Feeder Busbars inside Left Spout Box */}
            <rect x="18" y="158" width="46" height="148" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
            <path d="M46,136 L46,184 L56,184" fill="none" stroke="#ef4444" strokeWidth="3.5" opacity={busLive ? 0.95 : 0.45} />
            <path d="M64,136 L64,232 L56,232" fill="none" stroke="#eab308" strokeWidth="3.5" opacity={busLive ? 0.95 : 0.45} />
            <path d="M82,136 L82,158 L30,158 L30,280 L56,280" fill="none" stroke="#3b82f6" strokeWidth="3.2" opacity={busLive ? 0.95 : 0.45} />

            {/* Fixed Epoxy Spout Bushings */}
            {[184, 232, 280].map((sy, idx) => (
              <g key={idx}>
                <rect x="34" y={sy - 11} width="26" height="22" rx="2.5" fill="#7c2d12" stroke="#d97706" strokeWidth="0.9" />
                <circle cx="56" cy={sy} r="4.8" fill={busLive ? '#fbbf24' : '#64748b'} stroke="#451a03" strokeWidth="0.8" />
              </g>
            ))}

            {/* Automatic Red Metallic Safety Shutters (Drop over live spouts when VCB Racked Out!) */}
            {!shuttersOpen && (
              <g>
                <rect x="56" y="160" width="13" height="144" rx="1.5" fill="#dc2626" stroke="#fecaca" strokeWidth="1" />
                <text
                  x="62.5"
                  y="234"
                  fill="#ffffff"
                  fontSize="6.5"
                  fontWeight="800"
                  fontFamily="monospace"
                  textAnchor="middle"
                  transform="rotate(-90 62.5 234)"
                >
                  METALLIC SHUTTERS CLOSED
                </text>
              </g>
            )}

            {/* Movable VCB Truck Assembly (Shifts Right when Racked to TEST / ISOLATED) */}
            <g
              transform={`translate(${truckOffsetX}, 0)`}
              className="cursor-pointer"
              onClick={() =>
                inspectPart(
                  'VCB',
                  `3-Pole Embedded Epoxy VCB Truck — Pos: ${truckPos}, CB: ${cbClosed ? 'CLOSED' : 'OPEN'}, Spring: ${
                    springCharged ? 'CHARGED' : 'DISCHARGED'
                  }, Shutters: ${shuttersOpen ? 'OPEN' : 'CLOSED (SAFE)'}`
                )
              }
            >
              {[184, 232, 280].map((py, idx) => {
                const phCol = idx === 0 ? '#ef4444' : idx === 1 ? '#eab308' : '#3b82f6';
                return (
                  <g key={idx}>
                    {/* Upper Tulip Copper Plug-In Contact */}
                    <rect x="58" y={py - 4.5} width="32" height="9" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                    {/* Ribbed Embedded Epoxy Pole Housing */}
                    <rect x="90" y={py - 16} width="76" height="32" rx="4" fill={`url(#vcbpole-${uid})`} stroke="#fda4af" strokeWidth="0.7" />
                    {/* Inner White Ceramic Vacuum Interrupter Bottle */}
                    <rect x="102" y={py - 10} width="52" height="20" rx="3" fill={`url(#vcbcer-${uid})`} stroke="#475569" strokeWidth="0.9" />
                    {/* Vacuum Interrupter Fixed & Moving Contacts */}
                    <line x1="106" y1={py} x2="124" y2={py} stroke={phCol} strokeWidth="3.5" />
                    <line x1={cbClosed ? 124 : 135} y1={py} x2="150" y2={py} stroke={phCol} strokeWidth="3.5" />
                    <circle cx="124" cy={py} r="2.8" fill="#0f172a" />
                    <circle cx={cbClosed ? 126 : 135} cy={py} r="2.8" fill={cbClosed ? '#ef4444' : '#22c55e'} />
                    {/* Lower Tulip Contact Arm */}
                    <rect x="166" y={py - 4.5} width="26" height="9" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                  </g>
                );
              })}

              {/* VCB Truck Steel Carriage & Spring Operating Mechanism */}
              <rect x="194" y="162" width="96" height="142" rx="3" fill={`url(#vcbmech-${uid})`} stroke="#94a3b8" strokeWidth="1.2" />
              <text x="242" y="177" fill="#f8fafc" fontSize="7.2" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                VCB MECHANISM
              </text>
              {/* Mechanical ON/OFF Flag */}
              <rect
                x="204"
                y="184"
                width="76"
                height="20"
                rx="2"
                fill={cbClosed ? '#dc2626' : '#16a34a'}
                stroke="#0f172a"
                strokeWidth="1"
              />
              <text x="242" y="197" fill="#ffffff" fontSize="8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                {cbClosed ? 'I · CLOSED' : 'O · OPEN'}
              </text>
              {/* Spring Charge Mechanical Window */}
              <rect
                x="204"
                y="210"
                width="76"
                height="17"
                rx="2"
                fill={springCharged ? '#facc15' : '#e2e8f0'}
                stroke="#0f172a"
                strokeWidth="0.9"
              />
              <text x="242" y="221" fill="#0f172a" fontSize="6.8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                {springCharged ? 'SPRING CHARGED' : 'DISCHARGED'}
              </text>
              {/* 86 Trip Coil & X0 64-Pin Umbilical Plug Status */}
              <rect
                x="204"
                y="233"
                width="76"
                height="16"
                rx="2"
                fill={tripActive ? '#991b1b' : '#0f172a'}
                stroke={tripActive ? '#fca5a5' : '#475569'}
                strokeWidth="0.9"
              />
              <text x="242" y="243.5" fill="#ffffff" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                {tripActive ? '86 COIL TRIPPED' : 'TRIP COIL OK'}
              </text>
              <rect x="204" y="255" width="76" height="15" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.7" />
              <text x="242" y="265" fill="#38bdf8" fontSize="6" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                X0 LV PLUG: {truckPos === 'ISOLATED' ? 'DISC' : 'CONN'}
              </text>
              {/* Racking Lead-Screw Socket */}
              <circle cx="242" cy="285" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
              <rect x="239" y="282" width="6" height="6" fill="#94a3b8" />

              {/* Heavy Steel Truck Wheels on Rail */}
              <circle cx="212" cy="308" r="5.5" fill="#64748b" stroke="#0f172a" strokeWidth="1.3" />
              <circle cx="272" cy="308" r="5.5" fill="#64748b" stroke="#0f172a" strokeWidth="1.3" />
            </g>

            {/* Steel Guide Rail + Interactive Racking Control Bar */}
            <line x1="68" y1="315" x2="340" y2="315" stroke="#94a3b8" strokeWidth="3.2" />
            {[
              { x: 20, pos: 'SERVICE' as TruckPosition, bg: '#0284c7', lbl: 'RACK: SERVICE' },
              { x: 130, pos: 'TEST' as TruckPosition, bg: '#d97706', lbl: 'RACK: TEST' },
              { x: 240, pos: 'ISOLATED' as TruckPosition, bg: '#dc2626', lbl: 'RACK: ISOLATED' },
            ].map((btn) => (
              <g key={btn.pos} className="cursor-pointer" onClick={() => onRack(btn.pos)}>
                <rect
                  x={btn.x}
                  y="323"
                  width="100"
                  height="19"
                  rx="2"
                  fill={truckPos === btn.pos ? btn.bg : '#1e293b'}
                  stroke={truckPos === btn.pos ? '#ffffff' : '#475569'}
                  strokeWidth="1"
                />
                <text x={btn.x + 50} y="335.5" fill="#ffffff" fontSize="7" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                  {btn.lbl}
                </text>
              </g>
            ))}
          </g>

          {/* Partition Steel Barrier + 3 Lower Spout Bushings Connecting Chamber B -> Chamber C */}
          <rect x="12" y="350" width="336" height="8" fill="#64748b" stroke="#334155" strokeWidth="0.9" />
          {[56, 114, 172].map((bx, i) => (
            <rect key={i} x={bx - 6} y="347" width="12" height="14" rx="2" fill="#7c2d12" stroke="#f59e0b" strokeWidth="0.7" />
          ))}

          {/* ============================================================== */}
          {/* CHAMBER C: TOROIDAL CTs, VT, EARTH SWITCH Q8 & 33kV XLPE CABLE */}
          {/* ============================================================== */}
          <g>
            <rect
              x="12"
              y="358"
              width="336"
              height="204"
              rx="2"
              fill="#0b1220"
              stroke={selectedPart === 'CABLE' ? '#38bdf8' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="20" y="372" fill="#cbd5e1" fontSize="7.5" fontWeight="800" fontFamily="monospace">
              C. CT ({ctSpec}), SURGE ARRESTERS, Q8 &amp; 33 kV XLPE
            </text>
            <rect
              x="252"
              y="362"
              width="88"
              height="13"
              rx="2"
              fill={earthClosed ? '#713f12' : cableLive ? '#14532d' : '#1e293b'}
              stroke={earthClosed ? '#facc15' : cableLive ? '#22c55e' : '#64748b'}
              strokeWidth="0.8"
            />
            <text
              x="296"
              y="371"
              fill={earthClosed ? '#fde047' : cableLive ? '#4ade80' : '#cbd5e1'}
              fontSize="7"
              fontWeight="800"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {earthClosed ? 'Q8 EARTHED!' : cableLive ? `${Math.round(ampVal)} A LIVE` : '0 A DEAD'}
            </text>

            {/* 3-Phase Vertical Copper Droppers -> Toroidal CTs -> Heat-Shrink Terminations -> XLPE */}
            {[
              { x: 56, col: '#ef4444', lbl: 'R-PH' },
              { x: 114, col: '#eab308', lbl: 'Y-PH' },
              { x: 172, col: '#3b82f6', lbl: 'B-PH' },
            ].map((ph) => (
              <g
                key={ph.lbl}
                className="cursor-pointer"
                onClick={() =>
                  inspectPart(
                    'CABLE',
                    `${cableSpec} (${ph.lbl}) · CT ${ctSpec} — ${
                      earthClosed ? 'EARTHED VIA Q8' : cableLive ? `${kvVal.toFixed(1)} kV / ${Math.round(ampVal)} A` : 'De-energized (0 A)'
                    }`
                  )
                }
              >
                {/* Copper Dropper Busbar from Lower VCB Spout */}
                <line x1={ph.x} y1="360" x2={ph.x} y2="444" stroke={ph.col} strokeWidth="6.5" opacity={cableLive ? 1 : 0.6} />
                {cableLive && (
                  <line
                    x1={ph.x}
                    y1="360"
                    x2={ph.x}
                    y2="444"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="4 8"
                    className="vcb-flow"
                  />
                )}
                {/* Toroidal Cast-Resin Current Transformer (CT) */}
                <rect x={ph.x - 18} y="384" width="36" height="26" rx="4" fill="#7c2d12" stroke="#f59e0b" strokeWidth="1.1" />
                <text x={ph.x} y="396" fill="#fef3c7" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                  CT
                </text>
                <text x={ph.x} y="405" fill="#fdba74" fontSize="5.2" fontFamily="monospace" textAnchor="middle">
                  S1/S2
                </text>

                {/* Lug Terminal Plate + Ribbed 33 kV Polymeric Heat-Shrink Termination */}
                <rect x={ph.x - 8} y="438" width="16" height="10" rx="1" fill="#d97706" stroke="#451a03" strokeWidth="0.7" />
                <circle cx={ph.x} cy="443" r="2.2" fill="#fef3c7" />
                <polygon
                  points={`${ph.x - 11},448 ${ph.x + 11},448 ${ph.x + 7},494 ${ph.x - 7},494`}
                  fill="#991b1b"
                  stroke="#450a0a"
                  strokeWidth="0.9"
                />
                {/* 33 kV Creepage Sheds */}
                {[458, 469, 480].map((sy) => (
                  <line key={sy} x1={ph.x - 13} y1={sy} x2={ph.x + 13} y2={sy} stroke="#dc2626" strokeWidth="2.5" />
                ))}
                {/* Armoured Black 33 kV XLPE Cable + Brass Gland */}
                <rect x={ph.x - 9} y="538" width="18" height="10" rx="1" fill="#ca8a04" stroke="#713f12" strokeWidth="0.8" />
                <line x1={ph.x} y1="494" x2={ph.x} y2="558" stroke="#1e293b" strokeWidth="11" />
                <line x1={ph.x} y1="494" x2={ph.x} y2="558" stroke="#475569" strokeWidth="2" strokeDasharray="3 4" />
                <text x={ph.x} y="522" fill="#f8fafc" fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                  {ph.lbl}
                </text>
              </g>
            ))}

            {/* 3-Phase Earthing Bar Bridge when Q8 is CLOSED */}
            {earthClosed && (
              <path d="M56,426 L236,426" stroke="#facc15" strokeWidth="4" strokeDasharray="6 3" />
            )}

            {/* Cast-Resin VT Block + Interlocked Earthing Switch Q8 Assembly */}
            <g className="cursor-pointer" onClick={onToggleEarth}>
              <rect
                x="216"
                y="382"
                width="122"
                height="168"
                rx="2.5"
                fill="#1e293b"
                stroke={earthClosed ? '#facc15' : '#475569'}
                strokeWidth="1.3"
              />
              {/* Top Cast-Resin VT Mini Module */}
              <rect x="224" y="390" width="106" height="30" rx="2" fill="#312e81" stroke="#818cf8" strokeWidth="0.9" />
              <text x="277" y="403" fill="#e0e7ff" fontSize="6.8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                CAST-RESIN VT (33kV/110V)
              </text>
              <text x="277" y="413" fill="#a5b4fc" fontSize="5.8" fontFamily="monospace" textAnchor="middle">
                HV FUSE OK · VPIS TAP
              </text>

              {/* Q8 Earthing Switch Blade Mechanism */}
              <text x="277" y="436" fill="#facc15" fontSize="7.5" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                EARTH SWITCH (Q8)
              </text>
              <line
                x1="277"
                y1="496"
                x2={earthClosed ? 236 : 306}
                y2={earthClosed ? 448 : 452}
                stroke="#f59e0b"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="277" cy="496" r="5.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1" />
              <circle cx="236" cy="448" r="4.5" fill={earthClosed ? '#facc15' : '#475569'} />
              <rect
                x="228"
                y="510"
                width="98"
                height="21"
                rx="2"
                fill={earthClosed ? '#ca8a04' : '#334155'}
                stroke={earthClosed ? '#fef08a' : '#64748b'}
                strokeWidth="0.9"
              />
              <text x="277" y="523.5" fill="#ffffff" fontSize="7.2" fontWeight="800" fontFamily="monospace" textAnchor="middle">
                {earthClosed ? '⏚ Q8 EARTHED' : 'Q8 OPEN (CLICK)'}
              </text>
              <text x="277" y="542" fill="#94a3b8" fontSize="5.6" fontFamily="monospace" textAnchor="middle">
                Requires VCB Open &amp; Racked Out
              </text>
            </g>

            {/* Green-Yellow Grounding Strap from Q8 Hinge to Copper Earth Busbar */}
            <path d="M277,502 L277,572" stroke="#16a34a" strokeWidth="3.5" />
            <path d="M277,502 L277,572" stroke="#facc15" strokeWidth="3.5" strokeDasharray="4 4" />
          </g>

          {/* Bottom Solid 25x6mm Copper Earth Busbar */}
          <g>
            <rect x="12" y="568" width="336" height="28" rx="2" fill={`url(#vcbcu-${uid})`} stroke="#7c2d12" strokeWidth="1.5" />
            {[36, 98, 180, 262, 324].map((bx, i) => (
              <g key={i}>
                <circle cx={bx} cy="582" r="4.8" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
                <circle cx={bx} cy="582" r="2" fill="#b45309" />
              </g>
            ))}
            <text x="180" y="585" fill="#ffffff" fontSize="7.8" fontWeight="800" fontFamily="monospace" textAnchor="middle">
              ⏚ 25×6mm COPPER EARTH BUSBAR (PE OK)
            </text>
          </g>
        </svg>
      </div>

      {/* LIVE ENGINEERING SPEC & INTERLOCK INSPECTOR FOOTER */}
      <div className="bg-[#0f172a] text-[#e2e8f0] border-t-2 border-[#334155] px-2.5 py-2 text-[8.5px] font-mono leading-snug space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[#38bdf8] truncate">CABLE: {cableSpec}</span>
          <span className="text-[#fbbf24] shrink-0">CT: {ctSpec}</span>
        </div>
        <div className="text-[#4ade80] truncate">{activeNote}</div>
        <div className="flex items-center justify-between text-[7.5px] text-[#94a3b8]">
          <span>SHUTTERS: {shuttersOpen ? 'OPEN (IN SERVICE)' : 'CLOSED (SAFE)'}</span>
          <span>Click Bus / VCB / Rack / Q8</span>
        </div>
      </div>
    </div>
  );
};

export const SwitchgearVcb33kV: React.FC = () => {
  const {
    bays,
    busbars,
    ieds,
    commandBreaker,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
  } = useSubstationStore();

  const bays33 = useMemo(() => {
    const list = bays.filter((b) => b.voltageKv === 33 || b.id.startsWith('BAY-33-'));
    return [...list].sort((a, b) => (BAY_33_ORDER[a.id] ?? 99) - (BAY_33_ORDER[b.id] ?? 99));
  }, [bays]);

  const bus33A = busbars.find((b) => b.id === 'BUS-33-A');
  const bus33B = busbars.find((b) => b.id === 'BUS-33-B');
  const bc33 = bays33.find((b) => b.id === 'BAY-33-BC');

  const [viewMode, setViewMode] = useState<ViewMode>('FRONT');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('ALL');
  const [focusedBayId, setFocusedBayId] = useState<string | null>(null);
  const [truckMap, setTruckMap] = useState<Record<string, TruckPosition>>({});
  const [manualTripMap, setManualTripMap] = useState<Record<string, boolean>>({});
  const [annAckMap, setAnnAckMap] = useState<Record<string, boolean>>({});
  const [annTestMap, setAnnTestMap] = useState<Record<string, boolean>>({});
  const [statusBanner, setStatusBanner] = useState<string>(
    '33 kV Indoor Metal-Clad VCB Switchgear Room Ready — Operate TNC, VCB Rack In/Out, Earth Switch Q8, or 86 Trip Test.'
  );

  const getTruck = (bayId: string): TruckPosition => truckMap[bayId] || 'SERVICE';

  const visibleBays = useMemo(() => {
    if (focusedBayId) return bays33.filter((b) => b.id === focusedBayId);
    if (sectionFilter === 'ALL') return bays33;
    return bays33.filter((b) => b.busSection === sectionFilter);
  }, [bays33, focusedBayId, sectionFilter]);

  const handleTnc = (bayId: string, label: string, dir: 'TRIP' | 'CLOSE') => {
    const bay = bays33.find((b) => b.id === bayId);
    if (!bay) return;
    const pos = getTruck(bayId);
    if (dir === 'CLOSE') {
      if (pos === 'ISOLATED') {
        setStatusBanner(`${label}: BLOCKED — VCB Truck is in ISOLATED position. Rack to SERVICE or TEST first.`);
        return;
      }
      if (bay.earthSwitchState === 'CLOSED') {
        setStatusBanner(`${label}: BLOCKED — Mechanical Interlock: Earth Switch Q8 is CLOSED. Open Q8 first.`);
        return;
      }
      if (bay.protectionTripActive) {
        setStatusBanner(`${label}: BLOCKED — 86 Master Trip Lockout active. Reset 86 Lockout first.`);
        return;
      }
      if (!(bay.springCharged ?? true)) {
        setStatusBanner(`${label}: BLOCKED — VCB Closing Spring is DISCHARGED (Fault FLT-01).`);
        return;
      }
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
          ? `${label}: VCB TRIPPED -> ${bay.breakerId} is now OPEN (52b Green ON, Trip lamp blinking).`
          : `${label}: VCB CLOSED -> ${bay.breakerId} is now CLOSED (52a Red ON, Healthy).`
        : `${label}: BLOCKED — ${storeMsg || `VCB ${dir} blocked by substation interlock.`}`
    );
  };

  const handleRack = (bayId: string, label: string, nextPos: TruckPosition) => {
    const bay = bays33.find((b) => b.id === bayId);
    if (!bay) return;
    const curr = getTruck(bayId);
    if (curr === nextPos) return;
    if (bay.breakerState === 'CLOSED') {
      setStatusBanner(`${label}: BLOCKED — Mechanical Interlock: Cannot rack VCB while Breaker is CLOSED. Trip VCB first!`);
      return;
    }
    if (nextPos === 'SERVICE' && bay.earthSwitchState === 'CLOSED') {
      setStatusBanner(`${label}: BLOCKED — Mechanical Interlock: Cannot rack into SERVICE while Earth Switch Q8 is CLOSED!`);
      return;
    }
    setTruckMap((m) => ({ ...m, [bayId]: nextPos }));
    setStatusBanner(`${label}: VCB Draw-Out Truck racked from ${curr} → ${nextPos}.`);
  };

  const handleEarthToggle = (bayId: string, label: string) => {
    const bay = bays33.find((b) => b.id === bayId);
    if (!bay) return;
    const pos = getTruck(bayId);
    const nextState = bay.earthSwitchState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    if (nextState === 'CLOSED') {
      if (bay.breakerState === 'CLOSED') {
        setStatusBanner(`${label}: BLOCKED — Cannot close Earth Switch Q8 while VCB is CLOSED!`);
        return;
      }
      if (pos === 'SERVICE') {
        setStatusBanner(`${label}: BLOCKED — Mechanical Interlock: Rack VCB Truck to TEST or ISOLATED before closing Earth Switch Q8.`);
        return;
      }
    }
    const ok = commandDisconnector(bay.id, 'EARTH_Q8', nextState);
    const storeMsg = useSubstationStore.getState().lastCommandFeedback?.message;
    setStatusBanner(
      ok
        ? `${label}: Earth Switch Q8 is now ${nextState}.`
        : `${label}: BLOCKED — ${storeMsg || 'Earth Switch Q8 interlock active.'}`
    );
  };

  return (
    <div className="flex flex-col gap-3 p-2.5 sm:p-4 bg-[#111827] text-[#e2e8f0] rounded-lg border border-[#334155]">
      <style>{`@keyframes vcbBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.14; } } .vcb-blink { animation: vcbBlink 0.7s infinite; } @keyframes vcbFlow { to { stroke-dashoffset: -24; } } .vcb-flow { animation: vcbFlow 0.9s linear infinite; }`}</style>

      {/* TOP SWITCHGEAR ROOM HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#334155]">
        <div>
          <h2 className="text-[15px] sm:text-[17px] font-bold text-white flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#15803d] text-white border border-[#4ade80]/40">
              33 kV VCB ROOM
            </span>
            <span>Real-Time 33 kV Indoor Metal-Clad VCB Switchgear (IEC 62271-200)</span>
          </h2>
          <p
            className={`text-[11.5px] mt-0.5 ${
              statusBanner.includes('BLOCKED') ? 'text-[#fbbf24] font-semibold' : 'text-[#94a3b8]'
            }`}
          >
            {statusBanner}
          </p>
        </div>

        {/* Live Bus 33-A / 33-B Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono">
          <span
            className="px-2 py-0.5 rounded border font-bold"
            style={{
              background: bus33A?.energized ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)',
              borderColor: bus33A?.energized ? '#22c55e' : '#ef4444',
              color: bus33A?.energized ? '#4ade80' : '#f87171',
            }}
          >
            BUS 33-A: {bus33A?.energized ? `${(bus33A.voltageKvLive ?? 33.1).toFixed(1)} kV LIVE` : 'DEAD'}
          </span>
          <span
            className="px-2 py-0.5 rounded border font-bold"
            style={{
              background: bc33?.breakerState === 'CLOSED' ? 'rgba(234,179,8,0.2)' : 'rgba(51,65,85,0.5)',
              borderColor: bc33?.breakerState === 'CLOSED' ? '#facc15' : '#64748b',
              color: bc33?.breakerState === 'CLOSED' ? '#fde047' : '#cbd5e1',
            }}
          >
            BC CB-33: {bc33?.breakerState || 'OPEN'}
          </span>
          <span
            className="px-2 py-0.5 rounded border font-bold"
            style={{
              background: bus33B?.energized ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)',
              borderColor: bus33B?.energized ? '#22c55e' : '#ef4444',
              color: bus33B?.energized ? '#4ade80' : '#f87171',
            }}
          >
            BUS 33-B: {bus33B?.energized ? `${(bus33B.voltageKvLive ?? 33.0).toFixed(1)} kV LIVE` : 'DEAD'}
          </span>
        </div>
      </div>

      {/* FILTER & VIEW MODE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL' as SectionFilter, lbl: `All ${bays33.length} Cubicles` },
            { id: 'A' as SectionFilter, lbl: 'Bus 33-A (INC1, F01-F03, TF1)' },
            { id: 'COUPLE' as SectionFilter, lbl: 'Bus Coupler (CB-33)' },
            { id: 'B' as SectionFilter, lbl: 'Bus 33-B (INC2, F04-F06, TF2)' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFocusedBayId(null);
                setSectionFilter(f.id);
              }}
              className="px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer"
              style={{
                background: !focusedBayId && sectionFilter === f.id ? '#0d4785' : '#1e293b',
                borderColor: !focusedBayId && sectionFilter === f.id ? '#38bdf8' : '#475569',
                color: '#ffffff',
              }}
            >
              {f.lbl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={focusedBayId || 'ALL'}
            onChange={(e) => setFocusedBayId(e.target.value === 'ALL' ? null : e.target.value)}
            className="h-[30px] px-2.5 text-[11px] rounded bg-[#1e293b] text-white border border-[#475569] font-semibold"
          >
            <option value="ALL">Zoom: Lineup View</option>
            {bays33.map((b) => (
              <option key={b.id} value={b.id}>
                Zoom: {b.bayCode} — {b.name}
              </option>
            ))}
          </select>

          <div className="flex rounded overflow-hidden border border-[#475569]">
            <button
              type="button"
              onClick={() => setViewMode('FRONT')}
              className="px-3 py-1 text-[11px] font-bold cursor-pointer"
              style={{ background: viewMode === 'FRONT' ? '#15803d' : '#1e293b', color: '#ffffff' }}
            >
              Front View (VCB Cubicles)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('INTERNAL')}
              className="px-3 py-1 text-[11px] font-bold cursor-pointer"
              style={{ background: viewMode === 'INTERNAL' ? '#15803d' : '#1e293b', color: '#ffffff' }}
            >
              Internal Cutaway (Busbars &amp; Truck)
            </button>
          </div>
        </div>
      </div>

      {/* SWITCHGEAR ROOM FLOOR + METAL-CLAD CUBICLE LINEUP */}
      <div className="bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#cbd5e1] rounded-md p-3 pb-4 border border-[#475569] overflow-x-auto">
        {/* Top Busbar Trunking Duct */}
        <div className="h-3.5 mb-1.5 rounded-t bg-[repeating-linear-gradient(90deg,#475569_0px,#475569_16px,#1e293b_16px,#1e293b_24px)] border-y border-[#64748b] opacity-85 min-w-[960px]" />

        <div
          className={`grid gap-[4px] bg-[#1e293b] p-[4px] shadow-2xl ${
            focusedBayId
              ? viewMode === 'INTERNAL'
                ? 'grid-cols-1 max-w-[680px] mx-auto'
                : 'grid-cols-1 max-w-[420px] mx-auto'
              : ''
          }`}
          style={
            !focusedBayId
              ? {
                  gridTemplateColumns: `repeat(${visibleBays.length}, minmax(${
                    viewMode === 'INTERNAL' ? '348px' : '236px'
                  }, 1fr))`,
                }
              : undefined
          }
        >
          {visibleBays.map((bay, idx) => {
            const styleProf = VCB_VENDOR_STYLES[idx % VCB_VENDOR_STYLES.length];
            const storeIed = ieds.find((i) => i.id === bay.iedId || i.name === bay.iedId);
            const brand = storeIed?.vendor ? storeIed.vendor.split(' ')[0].toUpperCase() : styleProf.brand;
            const model = storeIed?.model || styleProf.model;

            const cbClosed = bay.breakerState === 'CLOSED';
            const earthClosed = bay.earthSwitchState === 'CLOSED';
            const isRemote = bay.localRemote === 'REMOTE';
            const tripActive = Boolean(bay.protectionTripActive);
            const isBusCoupler = bay.id === 'BAY-33-BC' || bay.bayType === 'BUS_COUPLER';
            const truckPos = getTruck(bay.id);
            const inService = truckPos === 'SERVICE';
            const springCharged = bay.springCharged ?? true;
            const tcsOk = bay.tcsHealthy ?? true;

            const sectionBusLive =
              bay.busSection === 'A'
                ? Boolean(bus33A?.energized)
                : bay.busSection === 'B'
                  ? Boolean(bus33B?.energized)
                  : Boolean(bus33A?.energized || bus33B?.energized);

            const kvVal = inService ? (bay.voltageAbKv ?? (sectionBusLive ? 33.1 : 0)) : 0;
            const isEnergized = kvVal > 1;
            const ampVal = inService && cbClosed && isEnergized ? (bay.currentA ?? 0) : 0;
            const hzVal = isEnergized ? (bay.frequencyHz && bay.frequencyHz > 1 ? bay.frequencyHz : 50.0) : 0;
            const deadBusClosed = cbClosed && inService && !isEnergized;

            const isTripped = tripActive || Boolean(manualTripMap[bay.id]) || (!isBusCoupler && !cbClosed);
            const hasAlarm = !springCharged || !tcsOk || earthClosed || !inService || deadBusClosed;
            const shortName = bay.name.split('(')[0].trim();

            if (viewMode === 'INTERNAL') {
              return (
                <VcbInternalCutaway
                  key={bay.id}
                  bayId={bay.id}
                  bayCode={bay.bayCode}
                  title={shortName}
                  busSection={bay.busSection}
                  busLive={sectionBusLive}
                  cbClosed={cbClosed}
                  tripActive={tripActive}
                  earthClosed={earthClosed}
                  truckPos={truckPos}
                  springCharged={springCharged}
                  kvVal={kvVal || (sectionBusLive ? 33.1 : 0)}
                  ampVal={ampVal}
                  isZoomed={focusedBayId === bay.id}
                  onToggleZoom={() => setFocusedBayId(focusedBayId === bay.id ? null : bay.id)}
                  onRack={(next) => handleRack(bay.id, bay.bayCode, next)}
                  onToggleEarth={() => handleEarthToggle(bay.id, bay.bayCode)}
                  onInspect={(msg) => setStatusBanner(msg)}
                />
              );
            }

            // ==================== FRONT VIEW: 3-COMPARTMENT METAL-CLAD VCB CUBICLE ====================
            const isTest = Boolean(annTestMap[bay.id]);
            const isAcked = Boolean(annAckMap[bay.id]);
            const annWindows = [
              { id: 'CB', lbl: 'CB OPN', active: !cbClosed, crit: false, noFlash: isBusCoupler && !manualTripMap[bay.id] && !tripActive },
              { id: '86', lbl: '86 TRP', active: tripActive, crit: true, noFlash: false },
              { id: 'SPR', lbl: 'SPR DIS', active: !springCharged, crit: true, noFlash: false },
              { id: 'TCS', lbl: 'TCS 74', active: !tcsOk, crit: true, noFlash: false },
              { id: 'Q8', lbl: 'EARTH', active: earthClosed, crit: false, noFlash: false },
              { id: 'VT', lbl: 'NO VOLT', active: deadBusClosed || !inService, crit: false, noFlash: false },
            ];

            return (
              <div
                key={bay.id}
                className="text-[#111827] flex flex-col border-2 border-[#475569] rounded-[2px] overflow-hidden relative select-none"
                style={{
                  background: 'linear-gradient(180deg, #dde3e9 0%, #cdd4dc 50%, #bec6d0 100%)',
                  boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.65), inset -2px -2px 0 rgba(71,85,105,0.45)',
                }}
              >
                {/* COMPARTMENT 1: LV PROTECTION, METERING & VPIS CHAMBER */}
                <div className="p-2 pb-2.5 border-b-[3px] border-[#334155] flex flex-col gap-1.5 relative">
                  {/* Riveted Green/Blue 33 kV Nameplate */}
                  <div className="bg-gradient-to-b from-[#166534] via-[#14532d] to-[#052e16] text-white px-2 py-1 rounded-[2px] border border-[#020617] flex items-center justify-between gap-1 shadow">
                    <div className="min-w-0">
                      <div className="font-extrabold text-[10px] tracking-wide truncate">{bay.bayCode} · BUS {bay.busSection}</div>
                      <div className="text-[7.5px] text-[#bbf7d0] truncate">{shortName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFocusedBayId(focusedBayId === bay.id ? null : bay.id)}
                      className="px-1 py-0.5 text-[7px] font-mono font-bold rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white shrink-0 cursor-pointer"
                    >
                      {focusedBayId === bay.id ? 'ALL' : 'ZOOM'}
                    </button>
                  </div>

                  {/* Numerical Feeder Relay + 3D Healthy/Alarm/Trip Lamps */}
                  <div className="flex items-stretch gap-1.5">
                    <div
                      className="flex-1 border-2 border-[#0f172a] rounded-[2px] p-1 flex flex-col gap-1 shadow-inner"
                      style={{ background: styleProf.bezelBg }}
                    >
                      <div className="flex items-center justify-between text-[7px] font-extrabold">
                        <span style={{ color: styleProf.brandColor }}>{brand}</span>
                        <span className="font-mono truncate max-w-[74px]" style={{ color: styleProf.modelColor }}>
                          {model}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="flex-1 h-[54px] rounded-[1px] border border-[#0f172a] p-1 flex flex-col justify-between font-mono text-[7.5px]"
                          style={{ background: styleProf.lcdBg, color: styleProf.lcdText }}
                        >
                          <div className="flex justify-between font-bold border-b border-black/20 pb-0.5">
                            <span>{bay.bayCode}</span>
                            <span>{isRemote ? 'REM' : 'LOC'}</span>
                          </div>
                          <svg viewBox="0 0 60 22" className="w-full h-[20px]">
                            <line x1="4" y1="11" x2="56" y2="11" stroke={styleProf.lcdGrid} strokeWidth="0.6" strokeDasharray="2 1" />
                            <path
                              d={cbClosed && isEnergized && inService ? 'M4,11 Q17,1 30,11 T56,11' : 'M4,11 L56,11'}
                              fill="none"
                              stroke={styleProf.lcdText}
                              strokeWidth="1.4"
                            />
                          </svg>
                          <div className="flex justify-between text-[6.5px] font-bold">
                            <span>{truckPos.slice(0, 4)}</span>
                            <span className={tripActive || isTripped ? 'text-[#dc2626] vcb-blink' : ''}>
                              {tripActive ? '86 TRIP!' : isTripped ? 'TRIPPED' : !cbClosed ? 'OPEN' : !isEnergized ? 'NO VOLT' : 'OK'}
                            </span>
                          </div>
                        </div>
                        <div className="w-[12px] bg-[#111827] rounded-[1px] py-1 flex flex-col items-center justify-around">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: !isTripped && !hasAlarm ? '#22c55e' : '#334155' }} />
                          <span className={`w-1.5 h-1.5 rounded-full ${isTripped ? 'vcb-blink' : ''}`} style={{ background: isTripped ? '#ef4444' : '#334155' }} />
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasAlarm ? '#f59e0b' : '#334155' }} />
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#38bdf8' }} />
                        </div>
                      </div>
                    </div>

                    {/* 3D Chrome-Ring Pilot Lamps */}
                    <div className="w-[48px] flex flex-col justify-center gap-2 pl-0.5">
                      {[
                        { label: 'Healthy', on: !isTripped && !hasAlarm, col: '#22c55e', glow: '0 0 7px #22c55e' },
                        { label: 'Alarm', on: hasAlarm, col: '#facc15', glow: '0 0 7px #facc15' },
                        { label: 'Trip', on: isTripped, col: '#ef4444', glow: '0 0 8px #ef4444' },
                      ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border-2 border-[#475569] shrink-0 ${l.on && l.label === 'Trip' ? 'vcb-blink' : ''}`}
                            style={{
                              background: l.on
                                ? `radial-gradient(circle at 35% 30%, #ffffff 0%, ${l.col} 45%, #0f172a 100%)`
                                : 'radial-gradient(circle at 35% 30%, #f1f5f9 0%, #94a3b8 70%, #475569 100%)',
                              boxShadow: l.on ? l.glow : 'inset 0 1px 2px rgba(0,0,0,0.45)',
                            }}
                          />
                          <span className="text-[8px] font-semibold text-[#1e293b]">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multifunction Meter + VPIS Live Voltage Neon Indicators */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-[#18181b] border-2 border-[#3f3f46] rounded-[2px] px-2 py-1 font-mono text-right leading-[1.2] shadow-inner">
                      <div className="text-[10.5px] font-bold text-[#ff3b30]">
                        {kvVal.toFixed(1)} <span className="text-[8px] text-[#fca5a5]">kV</span>
                      </div>
                      <div className="text-[10.5px] font-bold text-[#ff3b30]">
                        {Math.round(ampVal)} <span className="text-[8px] text-[#fca5a5]">A</span> ·{' '}
                        <span className="text-[9px]">{hzVal.toFixed(1)}Hz</span>
                      </div>
                    </div>

                    {/* VPIS (Voltage Presence Indicating System - L1 L2 L3 Neon) */}
                    <div
                      className="bg-[#1e293b] border border-[#475569] rounded-[2px] px-1.5 py-1 flex flex-col items-center gap-0.5"
                      title="VPIS — Capacitive Voltage Presence Indicating System (L1/L2/L3)"
                    >
                      <span className="text-[6.5px] font-mono font-bold text-[#cbd5e1]">VPIS 33kV</span>
                      <div className="flex gap-1">
                        {['L1', 'L2', 'L3'].map((ph) => {
                          const vpisLive = sectionBusLive && inService && !earthClosed;
                          return (
                            <div key={ph} className="flex flex-col items-center">
                              <span
                                className={`w-2.5 h-2.5 rounded-full border border-[#64748b] ${vpisLive ? 'vcb-blink' : ''}`}
                                style={{
                                  background: vpisLive ? '#ff5722' : '#334155',
                                  boxShadow: vpisLive ? '0 0 6px #ff5722' : 'none',
                                }}
                              />
                              <span className="text-[5.5px] font-mono text-[#94a3b8]">{ph}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 6-Window Compact Facia Annunciator */}
                  <div className="bg-[#181e27] border border-[#475569] rounded-[2px] p-1 space-y-1">
                    <div className="flex items-center justify-between text-[6.8px] font-mono text-[#94a3b8]">
                      <span>ANNUNCIATOR</span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => setAnnTestMap((m) => ({ ...m, [bay.id]: !m[bay.id] }))}
                          className="px-1 bg-[#334155] hover:bg-[#475569] text-white rounded-[1px] cursor-pointer"
                        >
                          TST
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnAckMap((m) => ({ ...m, [bay.id]: true }))}
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
                            setStatusBanner(`${bay.bayCode}: Annunciator & 86 Trip Reset.`);
                          }}
                          className="px-1 bg-[#15803d] hover:bg-[#166534] text-white rounded-[1px] cursor-pointer"
                        >
                          RST
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                      {annWindows.map((w) => {
                        const lit = isTest || w.active;
                        const flash = !isTest && w.active && !isAcked && !w.noFlash;
                        return (
                          <div
                            key={w.id}
                            className={`py-[2px] px-0.5 text-center font-mono text-[6.3px] font-bold rounded-[1px] border ${
                              flash ? 'vcb-blink' : ''
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
                </div>

                {/* COMPARTMENT 2: DRAW-OUT VCB BREAKER CHAMBER */}
                <div className="p-2 border-b-[3px] border-[#334155] flex flex-col gap-1.5 relative">
                  {/* Mechanical Indicators Row: CB Flag + Spring Flag + 6-Digit Counter */}
                  <div className="grid grid-cols-3 gap-1 bg-[#1e293b] p-1 rounded-[2px] border border-[#475569] text-center font-mono">
                    <div
                      className="rounded-[1px] py-0.5 font-extrabold text-[7.5px] text-white"
                      style={{ background: cbClosed ? '#dc2626' : '#16a34a' }}
                    >
                      {cbClosed ? 'I · ON' : 'O · OFF'}
                    </div>
                    <div
                      className="rounded-[1px] py-0.5 font-extrabold text-[7px]"
                      style={{
                        background: springCharged ? '#facc15' : '#e2e8f0',
                        color: '#0f172a',
                      }}
                    >
                      {springCharged ? 'SPR CHG' : 'DISCHG'}
                    </div>
                    <div className="rounded-[1px] py-0.5 bg-[#090d16] text-[#38bdf8] text-[7.5px] font-bold border border-[#334155]">
                      {String(bay.opCounter ?? 12).padStart(5, '0')}
                    </div>
                  </div>

                  {/* Draw-Out VCB Truck Position Racking Control */}
                  <div className="bg-[#b8c1cc] border border-[#64748b] rounded-[2px] p-1">
                    <div className="flex items-center justify-between text-[6.8px] font-mono font-extrabold text-[#1e293b] mb-1">
                      <span>VCB TRUCK RACKING</span>
                      <span
                        className="px-1 rounded text-white"
                        style={{
                          background: truckPos === 'SERVICE' ? '#0284c7' : truckPos === 'TEST' ? '#d97706' : '#dc2626',
                        }}
                      >
                        {truckPos}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                      {(['SERVICE', 'TEST', 'ISOLATED'] as TruckPosition[]).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => handleRack(bay.id, bay.bayCode, pos)}
                          className="py-0.5 rounded-[1px] text-[6.8px] font-mono font-bold border cursor-pointer"
                          style={{
                            background: truckPos === pos ? '#0f172a' : '#e2e8f0',
                            color: truckPos === pos ? '#38bdf8' : '#334155',
                            borderColor: truckPos === pos ? '#38bdf8' : '#94a3b8',
                          }}
                        >
                          {pos === 'SERVICE' ? 'SERV' : pos === 'ISOLATED' ? 'ISOL' : 'TEST'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rotary 43LR + TNC TRIP / CLOSE + 86 TRIP TEST */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBayLocalRemote(bay.id, isRemote ? 'LOCAL' : 'REMOTE')}
                      className="px-1.5 py-1 rounded-[2px] bg-[#1e293b] hover:bg-[#0f172a] border border-[#475569] text-[7.5px] font-mono font-extrabold cursor-pointer shrink-0"
                      style={{ color: isRemote ? '#38bdf8' : '#fbbf24' }}
                      title="43LR Selector Switch"
                    >
                      43:{isRemote ? 'REM' : 'LOC'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTnc(bay.id, bay.bayCode, 'TRIP')}
                      className="flex-1 py-1 rounded-[2px] bg-gradient-to-b from-[#16a34a] to-[#14532d] text-white font-bold text-[8px] border border-[#052e16] cursor-pointer"
                    >
                      TRIP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTnc(bay.id, bay.bayCode, 'CLOSE')}
                      className="flex-1 py-1 rounded-[2px] bg-gradient-to-b from-[#ef4444] to-[#991b1b] text-white font-bold text-[8px] border border-[#450a0a] cursor-pointer"
                    >
                      CLOSE
                    </button>
                  </div>

                  {tripActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetProtectionTrip(bay.id);
                        setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
                        setStatusBanner(`${bay.bayCode}: 86 Master Trip Lockout reset.`);
                      }}
                      className="w-full py-1 rounded-[2px] bg-[#dc2626] text-white text-[7.8px] font-bold vcb-blink cursor-pointer"
                    >
                      RESET 86 LOCKOUT
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAnnAckMap((m) => ({ ...m, [bay.id]: false }));
                        triggerProtectionTrip(bay.id, '50/51 Overcurrent 86 Trip');
                        setStatusBanner(`${bay.bayCode}: 86 PROTECTION TRIP operated! VCB opened & locked out.`);
                      }}
                      className="w-full py-0.5 rounded-[2px] bg-[#7f1d1d] hover:bg-[#b91c1c] text-white text-[7.5px] font-bold cursor-pointer"
                    >
                      ⚡ 86 TRIP TEST
                    </button>
                  )}
                </div>

                {/* COMPARTMENT 3: CABLE TERMINATION & EARTH SWITCH Q8 CHAMBER */}
                <div className="p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Cable Chamber Glass Viewing Window (3-Phase XLPE Boots) */}
                    <div className="w-[74px] h-[38px] bg-[#0f172a] border-2 border-[#475569] rounded-[2px] p-1 flex items-end justify-around shadow-inner">
                      {['#ef4444', '#eab308', '#3b82f6'].map((c, ci) => (
                        <div key={ci} className="flex flex-col items-center">
                          <span className="w-2.5 h-3.5 rounded-t-[2px]" style={{ background: c, opacity: earthClosed ? 0.35 : 0.9 }} />
                          <span className="w-2 h-3 bg-[#334155]" />
                        </div>
                      ))}
                    </div>

                    {/* Earth Switch Q8 Interlocked Operating Lever */}
                    <button
                      type="button"
                      onClick={() => handleEarthToggle(bay.id, bay.bayCode)}
                      className="flex-1 h-[38px] rounded-[2px] border px-1.5 flex flex-col items-center justify-center font-mono cursor-pointer shadow-sm"
                      style={{
                        background: earthClosed ? '#ca8a04' : '#1e293b',
                        borderColor: earthClosed ? '#fde047' : '#475569',
                        color: '#ffffff',
                      }}
                      title="Mechanical Interlocked Earth Switch Q8 (Requires VCB OPEN & Racked Out)"
                    >
                      <span className="text-[7px] text-[#cbd5e1]">EARTH SW Q8</span>
                      <span className="text-[8.5px] font-extrabold">{earthClosed ? '⏚ EARTHED' : 'OPEN'}</span>
                    </button>
                  </div>

                  {/* High Voltage 33 kV Danger Plate */}
                  <div className="bg-[#facc15] text-[#0f172a] border border-[#0f172a] rounded-[1px] py-[1px] text-center font-mono text-[6.8px] font-extrabold tracking-wider">
                    ⚡ DANGER · 33,000 VOLTS · {bay.breakerId}
                  </div>
                </div>

                {/* Dark Steel Base Plinth */}
                <div className="h-2 bg-[#1e293b] border-t border-[#0f172a]" />
              </div>
            );
          })}
        </div>

        {/* Yellow Control Room Floor Safety Line */}
        <div className="h-2 mt-3 rounded bg-gradient-to-r from-[#eab308] via-[#facc15] to-[#eab308] shadow-sm min-w-[960px]" />
      </div>
    </div>
  );
};

export default SwitchgearVcb33kV;
