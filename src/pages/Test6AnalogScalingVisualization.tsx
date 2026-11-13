import { MultifunctionMeter } from '../components/MultifunctionMeter';
import { GuidanceStepDetail } from './GuidanceStepDetail';
import React, { useEffect, useRef, useState } from 'react';
import { RealisticSiprotec5, RealisticGatewayOrSwitch } from '../components/RealisticDevices';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCcw,
} from 'lucide-react';

interface Test6AnalogScalingVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

function nowTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

const TEST6_STEPS = [
  'Confirm CT/PT ratios from drawings.',
  'Verify IED scaling and engineering units.',
  'Inject a known value (current/voltage).',
  'Check IED measured value and quality.',
  'Verify gateway point mapping and scaling.',
  'Confirm HMI value, units and limits.',
  'Simulate invalid data (acquisition/comm fault).',
  'Restore normal condition and record results.',
];

export function Test6AnalogScalingVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test6AnalogScalingVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST6_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [primaryCurrent, setPrimaryCurrent] = useState<number>(125.0);
  const [primaryVoltageKv, setPrimaryVoltageKv] = useState<number>(33.0);
  const [invalidSim, setInvalidSim] = useState<boolean>(false);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(2);
  const [ts, setTs] = useState<string>(() => nowTs());
  const [soe, setSoe] = useState<{ id: number; time: string; event: string; ok: boolean }[]>(() => [
    { id: 1, time: nowTs(), event: 'Analog channel enabled (Ia, Ib, Ic, Uab)', ok: true },
    { id: 2, time: nowTs(), event: 'Measured values updated (Ia = 125.0 A, Uab = 33.00 kV)', ok: true },
    { id: 3, time: nowTs(), event: 'Scaling verification – OK (CT 600/1 A, PT 33kV/110V)', ok: true },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST6_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const pushSoe = (event: string, ok = true) => {
    const t = nowTs();
    setTs(t);
    setSoe((p) => [{ id: Date.now() + Math.random(), time: t, event, ok }, ...p.slice(0, 7)]);
  };

  const iSecondary = primaryCurrent / 600;
  const vSecondary = (primaryVoltageKv * 1000) / 300;

  const simulateInvalid = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'MINOR', id: 'TEST6-QUALITY', label: 'Test 6 analog measurement quality invalid' } }));
    setInvalidSim(true);
    setSeqStage(3);
    pushSoe('Simulated fault – Acquisition fault (Ia Invalid 0x4000)', false);
    pushSoe('SCADA Warning: MMXU1.A.phsA Quality = INVALID', false);
  };

  const restoreNormal = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'clear', severity: 'MINOR', id: 'TEST6-QUALITY', label: 'Test 6 analog measurement quality restored' } }));
    setInvalidSim(false);
    setPrimaryCurrent(125.0);
    setPrimaryVoltageKv(33.0);
    setSeqStage(4);
    pushSoe('Condition restored – Quality back to GOOD (0x00)', true);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: 'radial-gradient(circle at 50% 0%, #092A40 0%, #061C30 48%, #020B17 100%)',
        color: '#F1F8FF',
        border: '1.5px solid #00DFFF',
        borderRadius: isFullscreen ? 0 : 12,
        padding: isFullscreen ? '12px 16px' : '10px 14px',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        width: '100%',
        minHeight: isFullscreen ? '100vh' : undefined,
        boxSizing: 'border-box',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#06263E', border: '1.5px solid #00DFFF', display: 'grid', placeItems: 'center', color: '#FFC400' }}>⚡</span>
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F8FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>SLD &amp; OPERATION – TEST 6</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {onBackToAllTests && (
            <button type="button" onClick={onBackToAllTests} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #00DFFF', background: '#072238', color: '#D6F2FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              <ArrowLeft size={13} /> Back to All Tests
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F8FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />} {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F8FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={13} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const all = done.every(Boolean);
              const next = Array(TEST6_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF66', background: '#094E2B', color: '#F1F8FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF66' }} /> {done.every(Boolean) ? 'Completed (8/8)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.25)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Analog Scaling and Measurement Quality</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#89C7E8' }}>Validate CT/PT ratios, engineering units and invalid data.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t6-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 24.5%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF66' }}>●</span> CT/PT ratios and approved test equipment</div>
            <div><span style={{ color: '#00FF66' }}>●</span> Signal list with scaling &amp; engineering units</div>
          </section>

          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF66', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST6_STEPS.map((txt, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div key={idx} onClick={() => setActiveStep(idx)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, border: isSel ? '1.5px solid #00DFFF' : '1px solid rgba(30,102,138,0.6)', background: isSel ? 'rgba(0,185,220,0.24)' : '#071B2E', cursor: 'pointer', fontSize: 11 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDone((p) => {
                          const next = p.map((v, i) => (i === idx ? !v : v));
                          onStepChange?.(idx, next[idx]);
                          return next;
                        });
                      }}
                      style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', border: isDone ? '1.5px solid #00FF66' : '1.5px solid #4A7A96', background: isDone ? '#00FF66' : '#051525', color: '#01200B', fontWeight: 900, fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span><strong style={{ color: isDone ? '#00FF66' : '#00DFFF', marginRight: 4 }}>{idx + 1}.</strong>{txt}</span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="Analog Scaling" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF66', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            Measured values, CT/PT scaling, units, quality and SCADA indications match the approved signal list.
          </section>

          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            Explain primary/secondary scaling, IEC 61850 MMXU quality flags, and why energized CT secondaries must never be opened.
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* Main Visualization */}
          <section style={{ background: '#061C30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – Analog Scaling and Measurement Quality Flow
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontSize: 10.5, color: '#89C7E8' }}>
                  I<sub>pri</sub>: <strong style={{ color: '#00FF66' }}>{primaryCurrent.toFixed(1)} A</strong>
                  <input type="range" min={20} max={600} step={5} value={primaryCurrent} onChange={(e) => setPrimaryCurrent(Number(e.target.value))} style={{ width: 85, marginLeft: 5, verticalAlign: 'middle' }} />
                </label>
                <button type="button" onClick={simulateInvalid} style={{ padding: '3.5px 9px', borderRadius: 5, border: '1px solid #FF354D', background: 'rgba(255,53,77,0.18)', color: '#FF7080', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Simulate Invalid Measurement</button>
                <button type="button" onClick={restoreNormal} style={{ padding: '3.5px 9px', borderRadius: 5, border: '1px solid #00FF66', background: 'rgba(0,255,102,0.16)', color: '#00FF66', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Restore Measurement</button>
              </div>
            </div>

            <div style={{ padding: '8px 12px', overflowX: 'auto' }}>
              <svg viewBox="0 0 1100 252" style={{ width: '100%', minWidth: 860, height: 250 }}>
                {/* 1. Primary Network 33 kV Feeder */}
                <g transform="translate(8, 14)">
                  <rect x="0" y="0" width="118" height="142" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="59" y="20" textAnchor="middle" fill="#F1F8FF" fontSize="10" fontWeight="800">Primary Network</text>
                  <rect x="44" y="34" width="30" height="72" rx="4" fill="#3B4D5E" stroke="#9CCBE4" />
                  {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="40" y1={42 + i * 13} x2="78" y2={42 + i * 13} stroke="#C6D8E8" strokeWidth="3" />)}
                  <text x="59" y="128" textAnchor="middle" fill="#89C7E8" fontSize="9.5">33 kV Feeder</text>
                </g>

                <line x1="128" y1="84" x2="158" y2="84" stroke="#00DFFF" strokeWidth="2.8" />
                <polygon points="154,78 164,84 154,90" fill="#00DFFF" />

                {/* 2. Instrument Transformers (CT & PT) */}
                <g transform="translate(166, 14)">
                  <rect x="0" y="0" width="185" height="142" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="92" y="17" textAnchor="middle" fill="#F1F8FF" fontSize="10" fontWeight="800">Instrument Transformers</text>
                  <image href="/assets/iec/instrument-transformers.png" x="14" y="20" width="157" height="84" preserveAspectRatio="xMidYMid meet" />
                  <text x="52" y="116" textAnchor="middle" fill="#F1F8FF" fontSize="9" fontWeight="700">CT 600/1 A</text>
                  <text x="52" y="129" textAnchor="middle" fill="#00FF66" fontSize="8.5">Isec={iSecondary.toFixed(4)} A</text>
                  <text x="135" y="116" textAnchor="middle" fill="#F1F8FF" fontSize="9" fontWeight="700">PT 33kV/110V</text>
                  <text x="135" y="129" textAnchor="middle" fill="#00FF66" fontSize="8.5">Vsec={vSecondary.toFixed(1)} V</text>
                </g>

                <line x1="353" y1="84" x2="386" y2="84" stroke="#00FF66" strokeWidth="2.8" />
                <polygon points="381,78 391,84 381,90" fill="#00FF66" />
                <circle r="4" fill="#00FF66"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 355 84 L 386 84" /></circle>

                {/* 3. Siemens SIPROTEC 5 */}
                <RealisticSiprotec5
                  x={394}
                  y={8}
                  width={148}
                  height={138}
                  borderColor={invalidSim ? '#FF354F' : '#00DFFF'}
                  lcdLines={[
                    { text: `Ia: ${invalidSim ? '-----' : primaryCurrent.toFixed(1)} A`, color: invalidSim ? '#FF354F' : '#00FF66', bold: true },
                    { text: `Ib: ${(primaryCurrent - 0.2).toFixed(1)} A`, color: '#00FF66' },
                    { text: `Ic: ${(primaryCurrent + 0.2).toFixed(1)} A`, color: '#00FF66' },
                    { text: `Uab: ${primaryVoltageKv.toFixed(2)} kV`, color: '#00DFFF', bold: true },
                  ]}
                  label="IED – SIPROTEC 5"
                />

                {/* CT/PT secondary measurement signals branch independently to the IED and MFM. */}
                <path d="M 354 84 H 376 V 200 H 392" fill="none" stroke="#00FF70" strokeWidth="2" strokeDasharray="5 3" />
                <polygon points="386,195 396,200 386,205" fill="#00FF70" />
                <text x="382" y="178" fill="#8DDCC5" fontSize="8" textAnchor="end">CT/PT</text>
                {/* Dedicated multifunction meter: independent of the protection relay. */}
                <g transform="translate(394,154)">
                  <rect width="148" height="89" rx="7" fill="#091a2b" stroke={invalidSim ? '#FF354F' : '#00DFFF'} strokeWidth="1.8" />
                  <rect x="13" y="7" width="122" height="55" rx="5" fill="#2b3944" stroke="#6f8d9d" strokeWidth="2" />
                  <rect x="20" y="13" width="108" height="43" rx="2" fill="#052c32" stroke="#39ddca" />
                  <text x="26" y="24" fill="#91f9e8" fontSize="9" fontWeight="800">MULTIFUNCTION METER</text>
                  <text x="26" y="36" fill={invalidSim ? '#FF7A86' : '#E3FFF5'} fontSize="10" fontWeight="800">{invalidSim ? 'I: INVALID' : `I: ${primaryCurrent.toFixed(1)} A`}</text>
                  <text x="26" y="48" fill="#E3FFF5" fontSize="9">V: {primaryVoltageKv.toFixed(2)} kV</text>
                  <circle cx="125" cy="70" r="3" fill={invalidSim ? '#FF354F' : '#00FF70'} />
                  <text x="74" y="80" fill="#D9F6FF" fontSize="9" fontWeight="700" textAnchor="middle">MFM · Modbus TCP/502</text>
                </g>
                {/* IEC 61850 MMS from the protection IED to the station gateway. */}
                <text x="689" y="64" textAnchor="middle" fill="#F1F8FF" fontSize="9">IEC 61850</text>
                <text x="689" y="75" textAnchor="middle" fill="#89C7E8" fontSize="8.5">MMS Report</text>
                <line x1="546" y1="84" x2="825" y2="84" stroke="#00DFFF" strokeWidth="2.8" />
                <polygon points="820,78 830,84 820,90" fill="#00DFFF" />
                <circle r="4" fill="#00DFFF"><animateMotion dur="1.4s" repeatCount="indefinite" path="M 548 84 L 825 84" /></circle>
                {/* Separate Modbus TCP link from MFM to the gateway. */}
                <path d="M 542 198 H 868 V 137" fill="none" stroke={invalidSim ? '#FF354F' : '#FFB547'} strokeWidth="2.6" strokeDasharray="7 4" />
                <text x="684" y="192" textAnchor="middle" fill="#FFCF74" fontSize="10" fontWeight="800">Modbus TCP · Port 502</text>
                {!invalidSim && <circle r="4" fill="#FFB547"><animateMotion dur="1.6s" repeatCount="indefinite" path="M 544 198 H 868 V 137" /></circle>}
                <RealisticGatewayOrSwitch
                  x={832}
                  y={22}
                  width={86}
                  height={110}
                  variant="GATEWAY"
                  healthy={!invalidSim}
                  label="Station Gateway"
                  subLabel="MMS + Modbus"
                />
                <line x1="920" y1="84" x2="944" y2="84" stroke="#00DFFF" strokeWidth="2.8" />
                <polygon points="939,78 949,84 939,90" fill="#00DFFF" />
                {/* SCADA HMI displays measurements received from both device paths. */}
                <g transform="translate(952, 16)">
                  <rect x="0" y="0" width="122" height="114" rx="6" fill="#5D7285" stroke={invalidSim ? '#FF354F' : '#00DFFF'} strokeWidth="1.6" />
                  <rect x="5" y="5" width="112" height="100" rx="3" fill="#04111E" />
                  <rect x="6" y="6" width="110" height="14" fill="#0A2740" />
                  <text x="61" y="16" textAnchor="middle" fill="#D4EEFF" fontSize="8" fontWeight="800">SCADA / HMI</text>
                  <text x="14" y="38" fill={invalidSim ? '#FF354F' : '#00FF66'} fontSize="8.5" fontWeight="800">IA: {invalidSim ? 'INVALID' : `${primaryCurrent.toFixed(1)} A`}</text>
                  <text x="14" y="53" fill="#00FF66" fontSize="8.5">IB: {(primaryCurrent - 0.2).toFixed(1)} A</text>
                  <text x="14" y="68" fill="#00FF66" fontSize="8.5">IC: {(primaryCurrent + 0.2).toFixed(1)} A</text>
                  <text x="14" y="83" fill="#00DFFF" fontSize="8.5">Uab: {primaryVoltageKv.toFixed(2)} kV</text>
                  <text x="61" y="132" textAnchor="middle" fill="#F1F8FF" fontSize="9.5" fontWeight="700">SCADA / HMI</text>
                </g>
              </svg>
            </div>
          </section>

          <MultifunctionMeter context="Test 6 · CT/PT analog scaling · 33 kV feeder" compact currentOverride={primaryCurrent} voltageOverride={primaryVoltageKv} invalidOverride={invalidSim} />

          {/* 3 Panels */}
          <div className="sas-t6-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr 1fr', gap: 8 }}>
            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Scaling Configuration</div>
              {[
                ['CT Ratio', '600 / 1 A (×600)'],
                ['PT Ratio', '33,000 / 110 V (×300)'],
                ['I_secondary (Calc)', `${iSecondary.toFixed(4)} A`],
                ['V_secondary (Calc)', `${vSecondary.toFixed(2)} V`],
                ['Units', 'Current: A • Voltage: kV'],
                ['Quality Handling', invalidSim ? 'Invalid (0x4000)' : 'Good (0x00)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: '#89C7E8' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Live Measurement &amp; Quality (IEC 61850)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#08283D', color: '#89C7E8', textAlign: 'left' }}>
                    <th style={{ padding: '3.5px' }}>Parameter (MMXU1)</th>
                    <th style={{ padding: '3.5px' }}>Value</th>
                    <th style={{ padding: '3.5px' }}>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['MMXU1.A.phsA', invalidSim ? '----- A' : `${primaryCurrent.toFixed(1)} A`, !invalidSim],
                    ['MMXU1.A.phsB', `${(primaryCurrent - 0.2).toFixed(1)} A`, true],
                    ['MMXU1.A.phsC', `${(primaryCurrent + 0.2).toFixed(1)} A`, true],
                    ['MMXU1.PPV.phsAB', `${primaryVoltageKv.toFixed(2)} kV`, true],
                    ['MMXU1.PPV.phsBC', `${(primaryVoltageKv - 0.02).toFixed(2)} kV`, true],
                    ['MMXU1.A.q / t', invalidSim ? '0x4000' : `0x00 (${ts})`, !invalidSim],
                  ].map(([p, v, ok]) => (
                    <tr key={String(p)} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                      <td style={{ padding: '3.5px', fontWeight: 700 }}>{p}</td>
                      <td style={{ padding: '3.5px', fontWeight: 800, color: ok ? '#00FF66' : '#FF354D' }}>{v}</td>
                      <td style={{ padding: '3.5px', color: ok ? '#00FF66' : '#FF354D' }}>{ok ? '✔ Good' : '✖ Invalid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, maxHeight: 175, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>SOE (Sequence Of Events)</div>
              {soe.map((s) => (
                <div key={s.id} style={{ padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: s.ok ? '#00FF66' : '#FF354D', marginRight: 5 }}>●</span>
                  <span style={{ fontFamily: 'monospace', color: '#89C7E8', marginRight: 5 }}>{s.time}</span>
                  {s.event}
                </div>
              ))}
            </section>
          </div>

          {/* 4-Stage Operation Sequence */}
          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – Analog Scaling Test</div>
            <div className="sas-t6-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Reference & Config', ok: true, lines: ['CT: 600/1 A', 'PT: 33,000/110 V', 'Units: A, kV'], act: restoreNormal },
                { num: 2 as const, title: 'Normal Measurement', ok: true, lines: [`Ia = ${primaryCurrent.toFixed(1)} A`, `Uab = ${primaryVoltageKv.toFixed(2)} kV`, 'Quality = Good'], act: restoreNormal },
                { num: 3 as const, title: 'Simulate Invalid Data', ok: false, lines: ['Acquisition Fault', 'Ia = ----- A', 'Quality = Invalid'], act: simulateInvalid },
                { num: 4 as const, title: 'Restore – Normal', ok: true, lines: ['Condition Restored', 'Quality = Good', 'Alarm Cleared'], act: restoreNormal },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={() => { c.act(); setSeqStage(c.num); }} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F8FF', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{c.num}. {c.title}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.35 }}>
                      {c.lines.map((l, li) => <div key={li}><span style={{ color: c.ok ? '#00FF66' : '#FF354D', marginRight: 4 }}>{c.ok ? '✔' : '✖'}</span>{l}</div>)}
                    </div>
                  </button>
                  {idx < 3 && <span style={{ color: '#00DFFF', fontWeight: 900 }}>➔</span>}
                </React.Fragment>
              ))}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @media (max-width: 1120px) {
          .sas-t6-grid, .sas-t6-mid, .sas-t6-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test6AnalogScalingVisualization;
