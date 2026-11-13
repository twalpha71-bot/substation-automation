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

interface Test13Props {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

const TEST13_STEPS = [
  'Verify GNSS time source and master clock status.',
  'Confirm SNTP/PTP configuration on each device.',
  'Verify time synchronization status and measured offset.',
  'Generate approved simulated SOE test events.',
  'Compare IED and SCADA event timestamps.',
  'Simulate time-source or synchronization loss.',
  'Restore time source and verify re-synchronization.',
  'Record results and restore original configuration.',
];

function nowUtc(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(
    d.getUTCMilliseconds(),
    3
  )}`;
}

export function Test13TimeSyncVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test13Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST13_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [gnssLocked, setGnssLocked] = useState(true);
  const [netTimeOk, setNetTimeOk] = useState(true);
  const [utcNow, setUtcNow] = useState(() => nowUtc());
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(2);
  const [soeEvents, setSoeEvents] = useState(() => [
    { seq: 1, ts: '10:42:30.125', desc: 'Q1 Close Command', src: 'SCADA' },
    { seq: 2, ts: '10:42:30.365', desc: 'Q1 Status – CLOSED', src: 'SIPROTEC 5' },
    { seq: 3, ts: '10:42:31.220', desc: 'Feeder Current Change', src: 'ABB REF615' },
    { seq: 4, ts: '10:42:36.450', desc: 'Trip Initiated (Protection)', src: 'MiCOM C264' },
    { seq: 5, ts: '10:42:36.470', desc: 'Q1 Status – OPEN', src: 'SIPROTEC 5' },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST13_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  useEffect(() => {
    const t = window.setInterval(() => setUtcNow(nowUtc()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const generateSoeEvent = () => {
    const t = nowUtc();
    setSeqStage(3);
    setSoeEvents((prev) => [
      { seq: prev.length + 1, ts: t, desc: 'Simulated Breaker Test Event', src: 'SIPROTEC 5' },
      ...prev.slice(0, 5),
    ]);
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

  const ptpHealthy = gnssLocked && netTimeOk;
  const sntpHealthy = netTimeOk;

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
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>TIME &amp; EVENTS – TEST 13</span>
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
              const next = Array(TEST13_STEPS.length).fill(!all);
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
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>SNTP / PTP Time Synchronization and SOE</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Verify device clock source and event ordering.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t13-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(255px, 23.5%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved time sync architecture (GNSS/PTP/SNTP)</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved SOE point list &amp; timestamp resolution</div>
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF70', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST13_STEPS.map((txt, idx) => {
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
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="SNTP / PTP and SOE" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF70', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            All devices synchronize within project tolerances; SOE timestamps remain ordered and loss-of-sync raises an alarm.
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            SNTP (UDP/123) vs PTP (IEEE 1588), Grandmaster, Boundary/Transparent Clock, holdover, and SOE ordering.
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <section style={{ background: '#061B30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – SNTP / PTP Time Synchronization and SOE
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={generateSoeEvent} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #00FF70', background: '#063322', color: '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Generate SOE Event</button>
                <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: gnssLocked ? 'fault' : 'clear', severity: 'MAJOR', id: 'TEST13-GNSS', label: 'Test 13 GNSS time source lost' } })); setGnssLocked((g) => !g); }} style={{ padding: '3px 8px', borderRadius: 4, border: gnssLocked ? '1px solid #FFBF00' : '1px solid #00FF70', background: '#08283D', color: gnssLocked ? '#FFBF00' : '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {gnssLocked ? 'Simulate GNSS Loss' : 'Restore GNSS Lock'}
                </button>
                <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: netTimeOk ? 'fault' : 'clear', severity: 'MAJOR', id: 'TEST13-TIME', label: 'Test 13 network time synchronization lost' } })); setNetTimeOk((n) => !n); }} style={{ padding: '3px 8px', borderRadius: 4, border: netTimeOk ? '1px solid #FF3344' : '1px solid #00FF70', background: '#08283D', color: netTimeOk ? '#FF7080' : '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {netTimeOk ? 'Simulate Time Net Fail' : 'Restore Time Network'}
                </button>
              </div>
            </div>

            <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
              <svg viewBox="0 0 900 190" style={{ width: '100%', minWidth: 720, height: 184 }}>
                {/* GNSS Satellite & Master Clock */}
                <g transform="translate(12, 12)">
                  <rect x="0" y="0" width="135" height="60" rx="6" fill="#041423" stroke={gnssLocked ? '#00DFFF' : '#FFBF00'} />
                  <text x="67" y="24" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">🛰 GNSS / GPS</text>
                  <text x="67" y="42" textAnchor="middle" fill={gnssLocked ? '#00FF70' : '#FFBF00'} fontSize="8.5" fontWeight="800">
                    {gnssLocked ? 'Signal LOCKED' : 'GNSS LOST (Holdover)'}
                  </text>
                </g>
                <line x1="149" y1="42" x2="210" y2="42" stroke={gnssLocked ? '#00DFFF' : '#FFBF00'} strokeWidth="2.5" strokeDasharray="4 3" />

                {/* GNSS Master Clock */}
                <g transform="translate(214, 8)">
                  <rect x="0" y="0" width="235" height="68" rx="6" fill="#061D30" stroke={gnssLocked ? '#00FF70' : '#FFBF00'} />
                  <image href="/assets/devices/ptp-clock.jpg" x="8" y="8" width="90" height="50" preserveAspectRatio="xMidYMid slice" />
                  <text x="106" y="23" fill="#00FF70" fontSize="9" fontWeight="800">UTC {utcNow}</text>
                  <text x="106" y="37" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Meinberg LANTIME M400</text>
                  <text x="106" y="51" fill="#9CCBE4" fontSize="7.5">GM (PTP) • SNTP (UDP/123)</text>
                </g>

                {/* Switch */}
                <line x1="330" y1="76" x2="330" y2="96" stroke={ptpHealthy ? '#00FF70' : '#FF3344'} strokeWidth="2.8" />
                <g transform="translate(245, 96)">
                  <rect x="0" y="0" width="175" height="36" rx="5" fill="#08283D" stroke={netTimeOk ? '#00DFFF' : '#FF3344'} />
                  <image href="/assets/devices/industrial-ethernet-switch.png" x="6" y="4" width="46" height="28" preserveAspectRatio="xMidYMid meet" />
                  <text x="112" y="16" textAnchor="middle" fill="#F1F7FF" fontSize="8" fontWeight="800">Hirschmann RSP35</text>
                  <text x="112" y="28" textAnchor="middle" fill="#00DFFF" fontSize="7">PTP-aware Switch</text>
                </g>

                {/* 3 IEDs */}
                {[
                  { x: 16, img: '/assets/devices/siemens-siprotec-5.png', name: 'SIPROTEC 5', proto: 'PTP', off: ptpHealthy ? '0.2 μs' : 'HOLDOVER', ok: ptpHealthy },
                  { x: 215, img: '/assets/devices/abb-relion-ref615.png', name: 'ABB REF615', proto: 'PTP', off: ptpHealthy ? '0.4 μs' : 'HOLDOVER', ok: ptpHealthy },
                  { x: 414, img: '/assets/ieds/schneider-c264.webp', name: 'MiCOM C264', proto: 'SNTP', off: sntpHealthy ? '2.1 ms' : 'UNSYNC', ok: sntpHealthy },
                ].map((d) => (
                  <g key={d.name} transform={`translate(${d.x}, 140)`}>
                    <rect x="0" y="0" width="182" height="44" rx="5" fill="#041423" stroke={d.ok ? '#00FF70' : '#FF3344'} />
                    <image href={d.img} x="6" y="4" width="36" height="36" preserveAspectRatio="xMidYMid meet" />
                    <text x="48" y="17" fill="#F1F7FF" fontSize="8.5" fontWeight="800">{d.name} ({d.proto})</text>
                    <text x="48" y="32" fill={d.ok ? '#00FF70' : '#FF3344'} fontSize="8" fontWeight="700">Offset: {d.off} ✔</text>
                  </g>
                ))}

                {/* SCADA/HMI */}
                <g transform="translate(625, 18)">
                  <rect x="0" y="0" width="265" height="158" rx="7" fill="#041423" stroke={sntpHealthy ? '#00DFFF' : '#FF3344'} />
                  <text x="132" y="18" textAnchor="middle" fill="#D4EEFF" fontSize="9.5" fontWeight="800">SCADA / HMI (SOE Workstation)</text>
                  <image href="/assets/devices/scada-workstation.png" x="16" y="26" width="232" height="82" preserveAspectRatio="xMidYMid slice" />
                  <text x="16" y="126" fill="#00DFFF" fontSize="9" fontWeight="800">SCADA Time: UTC {utcNow}</text>
                  <text x="16" y="142" fill={sntpHealthy ? '#00FF70' : '#FF3344'} fontSize="8.5" fontWeight="800">
                    SNTP: {sntpHealthy ? 'SYNCHRONIZED (Offset 1.8 ms)' : 'TIME SYNC ALARM'}
                  </text>
                </g>
              </svg>
            </div>
          </section>

          <div className="sas-t13-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 8 }}>
            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Device Time Configuration (Simulated)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['GNSS Master', 'PTP/SNTP', gnssLocked ? 'Locked' : 'Holdover'],
                    ['SIPROTEC 5', 'PTP', ptpHealthy ? '+0.2 μs' : 'Holdover'],
                    ['ABB REF615', 'PTP', ptpHealthy ? '+0.4 μs' : 'Holdover'],
                    ['MiCOM C264', 'SNTP', sntpHealthy ? '+2.1 ms' : 'Unsync'],
                    ['SCADA / HMI', 'SNTP', sntpHealthy ? '+1.8 ms' : 'Unsync'],
                  ].map((r) => (
                    <tr key={r[0]} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                      <td style={{ padding: 3.5, fontWeight: 700 }}>{r[0]}</td>
                      <td style={{ padding: 3.5 }}>{r[1]}</td>
                      <td style={{ padding: 3.5, color: '#00FF70', fontWeight: 700 }}>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10, maxHeight: 155, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>SOE – Event Sequence (Simulated UTC)</div>
              {soeEvents.map((e) => (
                <div key={e.seq + e.ts} style={{ padding: '3px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <strong style={{ color: '#00FF70', marginRight: 5 }}>#{e.seq}</strong>
                  <span style={{ fontFamily: 'monospace', color: '#9CCBE4', marginRight: 5 }}>{e.ts}</span>
                  <span>{e.desc}</span> <span style={{ color: '#00DFFF' }}>({e.src})</span>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Time Sync &amp; Test Result</div>
              {[
                ['GNSS / GM Status', gnssLocked ? 'PASS' : 'HOLDOVER'],
                ['PTP Sync (IEDs)', ptpHealthy ? 'PASS' : 'WARN'],
                ['SNTP Sync (SCADA)', sntpHealthy ? 'PASS' : 'FAIL'],
                ['SOE Chronology', 'PASS'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span>{k}</span>
                  <strong style={{ color: v === 'PASS' ? '#00FF70' : v === 'FAIL' ? '#FF3344' : '#FFBF00' }}>{v}</strong>
                </div>
              ))}
            </section>
          </div>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – SNTP / PTP Synchronization and SOE Test</div>
            <div className="sas-t13-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Verify Time Source', lines: ['Check GNSS lock', 'Enable PTP GM & SNTP'] },
                { num: 2 as const, title: 'Sync IEDs & SCADA', lines: ['Check PTP/SNTP status', 'Verify offsets'] },
                { num: 3 as const, title: 'Generate & Check SOE', lines: ['Trigger test events', 'Verify UTC ordering'] },
                { num: 4 as const, title: 'Time Loss & Recovery', lines: ['Test holdover/alarm', 'Restore & re-sync PASS'] },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={() => setSeqStage(c.num)} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F7FF', cursor: 'pointer' }}>
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
          .sas-t13-grid, .sas-t13-mid, .sas-t13-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test13TimeSyncVisualization;
