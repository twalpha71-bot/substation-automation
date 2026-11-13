import { GuidanceStepDetail } from './GuidanceStepDetail';
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';

interface Test14Props {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

const TEST14_STEPS = [
  'Verify alarm and SOE configuration and initial status.',
  'Simulate an approved protection fault in isolated test mode.',
  'Verify protection operation and alarm generation.',
  'Confirm alarm transfer to gateway and SCADA/HMI.',
  'Acknowledge the alarm and verify acknowledgement status.',
  'Verify SOE event sequence, source and timestamps.',
  'Clear the simulated fault and restore the initial condition.',
  'Record evidence, results and remaining punch points.',
];

function nowUtc(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function Test14AlarmSoeVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test14Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST14_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [faultType, setFaultType] = useState<'50/51' | '50N/51N' | '50BF'>('50/51');
  const [faultActive, setFaultActive] = useState(true);
  const [alarmAcked, setAlarmAcked] = useState(false);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(2);
  const [soe, setSoe] = useState(() => [
    { seq: 1, ts: nowUtc(), desc: 'OC Pickup (50/51)', src: 'SIPROTEC 5', kind: 'err' },
    { seq: 2, ts: nowUtc(), desc: 'Trip Output Asserted', src: 'SIPROTEC 5', kind: 'err' },
    { seq: 3, ts: nowUtc(), desc: 'Q1 OPEN Feedback (52a=0)', src: 'CB / IED', kind: 'warn' },
    { seq: 4, ts: nowUtc(), desc: 'Trip Alarm Displayed (UNACK)', src: 'SCADA', kind: 'err' },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST14_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const pushSoe = (desc: string, src: string, kind: 'ok' | 'warn' | 'err') =>
    setSoe((p) => [{ seq: p.length + 1, ts: nowUtc(), desc, src, kind }, ...p.slice(0, 6)]);

  const injectFault = (kind: '50/51' | '50N/51N' | '50BF') => {
    setFaultType(kind);
    setFaultActive(true);
    setAlarmAcked(false);
    setSeqStage(2);
    pushSoe(`Simulated ${kind} Protection Trip & Alarm`, 'SIPROTEC 5', 'err');
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'CRITICAL', id: 'TEST14-TRIP', label: 'Test 14 protection trip' } }));
  };

  const acknowledgeAlarm = () => {
    if (!faultActive) return;
    setAlarmAcked(true);
    setSeqStage(3);
    pushSoe(`Alarm Acknowledged by Operator (${faultType})`, 'SCADA', 'warn');
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'ack', id: 'TEST14-TRIP' } }));
  };

  const clearFault = () => {
    setFaultActive(false);
    setAlarmAcked(true);
    setSeqStage(4);
    pushSoe('Fault Cleared & Q1 Restored (Alarm RTN)', 'SCADA', 'ok');
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'clear', id: 'TEST14-TRIP' } }));
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
        background: 'radial-gradient(circle at 50% 0%, #092C48 0%, #061B30 48%, #03101F 100%)',
        color: '#F1F7FF',
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
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>FAT / SAT – TEST 14</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {onBackToAllTests && (
            <button type="button" onClick={onBackToAllTests} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #00DFFF', background: '#072238', color: '#D6F2FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              <ArrowLeft size={13} /> Back to All Tests
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F7FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />} {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F7FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={13} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const all = done.every(Boolean);
              const next = Array(TEST14_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF70', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF70' }} /> {done.every(Boolean) ? 'Completed (8/8)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.25)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Alarm, SOE and Fault Injection</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Verify alarm generation, acknowledgement and restoration.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t14-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(255px, 23.5%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved alarm &amp; SOE point list</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Authorized isolated simulation environment</div>
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF70', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST14_STEPS.map((txt, idx) => {
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
                      style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', border: isDone ? '1.5px solid #00FF70' : '1.5px solid #4A7A96', background: isDone ? '#00FF70' : '#051525', color: '#01200B', fontWeight: 900, fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span><strong style={{ color: isDone ? '#00FF70' : '#00DFFF', marginRight: 4 }}>{idx + 1}.</strong>{txt}</span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="Alarm, SOE and Fault Injection" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF70', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            Alarms are generated, displayed, acknowledged and cleared correctly with chronological SOE timestamps.
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            Alarm vs Event vs SOE, acknowledgement vs clearing, and source vs SCADA timestamps.
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <section style={{ background: '#061B30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – Alarm, SOE and Fault Injection
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => injectFault('50/51')} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #FF3344', background: 'rgba(255,51,68,0.18)', color: '#FF7080', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Inject 50/51</button>
                <button type="button" onClick={() => injectFault('50N/51N')} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #FF3344', background: 'rgba(255,51,68,0.18)', color: '#FF7080', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Inject 50N</button>
                <button type="button" onClick={acknowledgeAlarm} disabled={!faultActive || alarmAcked} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #FFBF00', background: '#2A2208', color: '#FFBF00', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Acknowledge Alarm</button>
                <button type="button" onClick={clearFault} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #00FF70', background: '#063322', color: '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Clear Fault &amp; Restore</button>
              </div>
            </div>

            <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
              <svg viewBox="0 0 900 180" style={{ width: '100%', minWidth: 720, height: 174 }}>
                {/* Stage 1: Fault Injection Test Set */}
                <g transform="translate(8, 14)">
                  <rect x="0" y="0" width="165" height="148" rx="7" fill="#041423" stroke={faultActive ? '#FF3344' : '#00FF70'} />
                  <text x="82" y="18" textAnchor="middle" fill={faultActive ? '#FF3344' : '#00FF70'} fontSize="9.5" fontWeight="800">
                    Fault Injection (Test Mode)
                  </text>
                  <image href="/assets/iec/test-set.png" x="18" y="24" width="128" height="72" preserveAspectRatio="xMidYMid meet" />
                  <text x="82" y="114" textAnchor="middle" fill="#F1F7FF" fontSize="9" fontWeight="700">
                    {faultActive ? `ACTIVE: ${faultType} Fault` : 'Normal / Cleared'}
                  </text>
                  <text x="82" y="130" textAnchor="middle" fill="#9CCBE4" fontSize="8">OMICRON CMC (Simulated)</text>
                </g>

                <line x1="175" y1="88" x2="218" y2="88" stroke={faultActive ? '#FF3344' : '#00FF70'} strokeWidth="3" />
                <polygon points="213,82 224,88 213,94" fill={faultActive ? '#FF3344' : '#00FF70'} />

                {/* Stage 2: Siemens SIPROTEC 5 */}
                <g transform="translate(226, 12)">
                  <rect x="0" y="0" width="165" height="152" rx="7" fill="#061D30" stroke={faultActive ? '#FF3344' : '#00FF70'} />
                  <image href="/assets/devices/siemens-siprotec-5.png" x="14" y="8" width="136" height="118" preserveAspectRatio="xMidYMid meet" />
                  <rect x="66" y="42" width="66" height="44" rx="2" fill="rgba(4,16,30,0.92)" stroke={faultActive ? '#FF3344' : '#00FF70'} />
                  <text x="99" y="57" textAnchor="middle" fill={faultActive ? '#FF3344' : '#00FF70'} fontSize="7.5" fontWeight="900">
                    {faultActive ? `Trip (${faultType})` : 'NORMAL'}
                  </text>
                  <text x="99" y="70" textAnchor="middle" fill="#F1F7FF" fontSize="7">
                    {faultActive ? 'Operated' : 'Closed'}
                  </text>
                  <text x="82" y="142" textAnchor="middle" fill="#F1F7FF" fontSize="9.5" fontWeight="700">SIEMENS SIPROTEC 5</text>
                </g>

                <text x="434" y="68" textAnchor="middle" fill="#F1F7FF" fontSize="8.5" fontWeight="700">IEC 61850</text>
                <text x="434" y="80" textAnchor="middle" fill="#9CCBE4" fontSize="7.5">(MMS / GOOSE)</text>
                <line x1="393" y1="88" x2="474" y2="88" stroke="#00DFFF" strokeWidth="2.8" />
                <circle r="4" fill="#00DFFF"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 395 88 L 474 88" /></circle>

                {/* Stage 3: Hirschmann Switch */}
                <g transform="translate(478, 28)">
                  <rect x="0" y="0" width="120" height="116" rx="6" fill="#061D30" stroke="#00DFFF" />
                  <image href="/assets/devices/industrial-ethernet-switch.png" x="10" y="14" width="100" height="58" preserveAspectRatio="xMidYMid meet" />
                  <text x="60" y="88" textAnchor="middle" fill="#F1F7FF" fontSize="8.5" fontWeight="800">Hirschmann RSP35</text>
                  <text x="60" y="102" textAnchor="middle" fill="#9CCBE4" fontSize="7.5">Ethernet Switch</text>
                </g>

                <line x1="600" y1="88" x2="638" y2="88" stroke="#00FF70" strokeWidth="2.8" />

                {/* Stage 4: SCADA / HMI */}
                <g transform="translate(642, 12)">
                  <rect x="0" y="0" width="250" height="152" rx="7" fill="#041423" stroke={faultActive ? '#FF3344' : '#00FF70'} strokeWidth="1.8" />
                  <text x="125" y="18" textAnchor="middle" fill="#D4EEFF" fontSize="9.5" fontWeight="800">SCADA / HMI (Alarm &amp; SOE)</text>
                  <rect x="20" y="42" width="28" height="28" rx="4" fill={faultActive ? '#FF3344' : '#00FF70'} />
                  <text x="34" y="60" textAnchor="middle" fill="#011826" fontSize="11" fontWeight="900">Q1</text>
                  <text x="58" y="48" fill={faultActive ? '#FF3344' : '#00FF70'} fontSize="9" fontWeight="800">
                    {faultActive ? `TRIP – ${faultType} ALARM` : 'Q1 – CLOSED (Normal)'}
                  </text>
                  <text x="58" y="64" fill={alarmAcked ? '#FFBF00' : '#FF3344'} fontSize="8.5" fontWeight="800">
                    State: {faultActive ? (alarmAcked ? 'ACTIVE / ACK' : 'ACTIVE / UNACK') : 'CLEARED / RTN'}
                  </text>
                  <text x="58" y="80" fill="#00FF70" fontSize="8">SOE: Updated (UTC)</text>
                  <text x="58" y="96" fill="#9CCBE4" fontSize="8">Comm: Healthy (MMS)</text>
                </g>
              </svg>
            </div>
          </section>

          <div className="sas-t14-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: 8 }}>
            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Test Fault / Alarm Configuration</div>
              {[
                ['T1', 'Overcurrent (50/51)', 'Trip – OC'],
                ['T2', 'Earth Fault (50N/51N)', 'Trip – EF'],
                ['T3', 'Breaker Fail (50BF)', 'BF Alarm'],
                ['T4', 'CB Open / Close', 'Q1 Event'],
              ].map(([id, fn, exp]) => (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <strong>{id}: {fn}</strong>
                  <span style={{ color: '#9CCBE4' }}>{exp}</span>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10, maxHeight: 155, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>SOE – Event Sequence (Simulated)</div>
              {soe.map((s) => (
                <div key={s.seq + s.ts} style={{ padding: '3px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: s.kind === 'err' ? '#FF3344' : s.kind === 'warn' ? '#FFBF00' : '#00FF70', marginRight: 5 }}>●</span>
                  <span style={{ fontFamily: 'monospace', color: '#9CCBE4', marginRight: 5 }}>{s.ts}</span>
                  <span>{s.desc}</span>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Test Result – Alarm &amp; SOE</div>
              {[
                ['Fault Injection', faultActive ? 'ACTIVE' : 'PASS'],
                ['Alarm at SCADA', 'PASS'],
                ['Acknowledgement', alarmAcked ? 'PASS' : 'PENDING'],
                ['Fault Clearing', !faultActive ? 'PASS' : 'PENDING'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span>{k}</span>
                  <strong style={{ color: v === 'PASS' ? '#00FF70' : '#FFBF00' }}>{v}</strong>
                </div>
              ))}
            </section>
          </div>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – Alarm, SOE and Fault Injection Test</div>
            <div className="sas-t14-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Verify Config', lines: ['Alarm points ready', 'SOE enabled (1 ms)'], act: () => setSeqStage(1) },
                { num: 2 as const, title: 'Inject Fault & Alarm', lines: ['Apply simulated fault', 'Verify Trip & Alarm'], act: () => injectFault('50/51') },
                { num: 3 as const, title: 'Verify SOE & Ack', lines: ['Check SOE order', 'Acknowledge alarm'], act: acknowledgeAlarm },
                { num: 4 as const, title: 'Clear & Restore', lines: ['Clear fault', 'Verify Q1 CLOSED PASS'], act: clearFault },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={c.act} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F7FF', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 3 }}>{c.num}. {c.title}</div>
                    <div style={{ fontSize: 10 }}>{c.lines.map((l) => <div key={l}><span style={{ color: '#00FF70', marginRight: 4 }}>✔</span>{l}</div>)}</div>
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
          .sas-t14-grid, .sas-t14-mid, .sas-t14-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test14AlarmSoeVisualization;
