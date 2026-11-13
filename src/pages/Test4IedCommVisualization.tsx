import { GuidanceStepDetail } from './GuidanceStepDetail';
import React, { useEffect, useRef, useState } from 'react';
import { RealisticSiprotec5, RealisticGatewayOrSwitch } from '../components/RealisticDevices';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  GraduationCap,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Network,
  RotateCcw,
  WifiOff,
} from 'lucide-react';

interface Test4IedCommVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

interface SoeEntry {
  id: number;
  time: string;
  event: string;
  ok: boolean;
}

function nowTime(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const TEST4_STEPS = [
  'Verify IED model, firmware and configured IP.',
  'Check link LEDs, switch port and VLAN.',
  'Test approved reachability and IEC 61850 MMS association.',
  'Verify LLN0/LPHD health and diagnostic data.',
  'Disconnect only a designated lab link or use simulation.',
  'Confirm communication-loss alarm and quality invalid/stale.',
  'Restore link and verify alarm clearance and recovery time.',
];

export function Test4IedCommVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test4IedCommVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST4_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [linkUp, setLinkUp] = useState<boolean>(true);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(1);
  const [ts, setTs] = useState<string>(() => nowTime());
  const [soe, setSoe] = useState<SoeEntry[]>(() => [
    { id: 1, time: nowTime(), event: 'IED Online (192.168.1.52)', ok: true },
    { id: 2, time: nowTime(), event: 'MMS Association Established (TCP/102)', ok: true },
    { id: 3, time: nowTime(), event: 'LLN0.Health = OK (1), LPHD.PhyHealth = OK (1)', ok: true },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST4_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (linkUp) setTs(nowTime());
    }, 1000);
    return () => window.clearInterval(t);
  }, [linkUp]);

  const pushSoe = (event: string, ok: boolean) =>
    setSoe((prev) => [{ id: Date.now() + Math.random(), time: nowTime(), event, ok }, ...prev.slice(0, 7)]);

  const simulateLinkLoss = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'MAJOR', id: 'TEST4-COMM', label: 'Test 4 IED communication link failure' } }));
    setLinkUp(false);
    setSeqStage(2);
    pushSoe('Comm. Link Disconnected (Simulated)', false);
    pushSoe('LPHD.CommHealth = Not OK / Quality Invalid', false);
  };

  const restoreConnection = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'clear', severity: 'MAJOR', id: 'TEST4-COMM', label: 'Test 4 IED communication link restored' } }));
    setLinkUp(true);
    setSeqStage(4);
    setTs(nowTime());
    pushSoe('Comm. Link Restored & MMS Reconnected', true);
    pushSoe('LPHD.CommHealth = OK (Alarm Cleared)', true);
  };

  const handleStepSelect = (idx: number) => {
    setActiveStep(idx);
    if (idx === 4 || idx === 5) {
      simulateLinkLoss();
      if (idx === 5) setSeqStage(3);
    } else if (idx === 6) {
      restoreConnection();
    } else if (!linkUp && idx < 4) {
      restoreConnection();
      setSeqStage(1);
    }
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
        background: 'radial-gradient(circle at 50% 0%, #092C48 0%, #061D30 45%, #020B16 100%)',
        color: '#F1F7FF',
        border: '1.5px solid #00CFFF',
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
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,207,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#06263E', border: '1.5px solid #00E5FF', display: 'grid', placeItems: 'center', color: '#FFC400' }}>⚡</span>
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00E5FF', fontWeight: 800 }}>SLD &amp; OPERATION – TEST 4</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {onBackToAllTests && (
            <button type="button" onClick={onBackToAllTests} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #00E5FF', background: '#072238', color: '#D6F2FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
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
              const next = Array(TEST4_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF59', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF59' }} /> {done.every(Boolean) ? 'Completed (7/7)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* TITLE & TABS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,207,255,0.25)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>IED Communication and Health</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>
            Verify IED connectivity, IEC 61850 MMS association, communication health, alarms, and recovery.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="sas-t4-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 24.5%) minmax(0, 1fr)', gap: 10 }}>
        {/* LEFT SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={14} style={{ color: '#00E5FF' }} /> Before you start
            </div>
            <div><span style={{ color: '#00FF59' }}>●</span> Approved IED address &amp; network diagram</div>
            <div><span style={{ color: '#00FF59' }}>●</span> Designated test link or simulation environment</div>
          </section>

          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00E5FF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF59', fontSize: 10.5 }}>{done.filter(Boolean).length}/7</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 4 }}>
              {TEST4_STEPS.map((txt, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div key={idx} onClick={() => handleStepSelect(idx)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5.5px 7px', borderRadius: 6, border: isSel ? '1.5px solid #00E5FF' : '1px solid rgba(30,102,138,0.6)', background: isSel ? 'rgba(0,185,220,0.24)' : '#071B2E', cursor: 'pointer', fontSize: 11 }}>
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
                      style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', border: isDone ? '1.5px solid #00FF59' : '1.5px solid #4A7A96', background: isDone ? '#00FF59' : '#051525', color: '#01200B', fontWeight: 900, fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span><strong style={{ color: isDone ? '#00FF59' : '#00E5FF', marginRight: 4 }}>{idx + 1}.</strong>{txt}</span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="IED Communication" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF59', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            Stable communication and correct loss/recovery indications.
          </section>

          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            Explain physical link, IP reachability, MMS association and data quality.
          </section>
        </aside>

        {/* RIGHT CONTENT */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* Topology Visualization */}
          <section style={{ background: '#061D30', border: '1.5px solid #00CFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,207,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00E5FF' }} /> Visualization – IED Communication and Health
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={simulateLinkLoss} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #FF354F', background: 'rgba(255,53,79,0.18)', color: '#FF7080', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <WifiOff size={12} /> Simulate Link Loss
                </button>
                <button type="button" onClick={restoreConnection} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #00FF59', background: 'rgba(0,255,89,0.16)', color: '#00FF59', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <RotateCcw size={12} /> Restore Connection
                </button>
              </div>
            </div>

            <div style={{ padding: '8px 12px', overflowX: 'auto' }}>
              <svg viewBox="0 0 860 175" style={{ width: '100%', minWidth: 680, height: 168 }}>
                {/* Bay 52 SLD */}
                <g transform="translate(10, 12)">
                  <rect x="0" y="0" width="140" height="145" rx="7" fill="#041423" stroke="#00CFFF" />
                  <text x="70" y="20" textAnchor="middle" fill="#F1F7FF" fontSize="10" fontWeight="700">33 kV Bus</text>
                  <line x1="25" y1="28" x2="115" y2="28" stroke="#F1F7FF" strokeWidth="2.8" />
                  <line x1="70" y1="28" x2="70" y2="54" stroke="#F1F7FF" strokeWidth="2.2" />
                  <rect x="52" y="54" width="36" height="36" rx="4" fill="#065E24" stroke="#00FF59" strokeWidth="2.5" />
                  <text x="70" y="77" textAnchor="middle" fill="#FFF" fontSize="15" fontWeight="900">52</text>
                  <line x1="70" y1="90" x2="70" y2="122" stroke="#F1F7FF" strokeWidth="2.2" />
                  <text x="70" y="137" textAnchor="middle" fill="#00FF59" fontSize="10" fontWeight="800">CB-33-F03</text>
                </g>

                {/* Siemens SIPROTEC 5 */}
                <RealisticSiprotec5
                  x={175}
                  y={8}
                  width={155}
                  height={136}
                  borderColor={linkUp ? '#00E5FF' : '#FF354F'}
                  lcdLines={[
                    { text: 'SIPROTEC 5 7SJ86', color: '#A8CBE0' },
                    { text: '192.168.1.52', color: '#F1F7FF', bold: true },
                    { text: `MMS: ${linkUp ? 'Connected' : 'Lost'}`, color: linkUp ? '#00FF59' : '#FF354F', bold: true },
                    { text: `LPHD: ${linkUp ? 'OK' : 'Alarm'}`, color: linkUp ? '#00FF59' : '#FF354F', bold: true },
                  ]}
                  label="IED – Siemens SIPROTEC 5"
                  subLabel="(192.168.1.52)"
                />

                {/* Link 1 */}
                <text x="392" y="56" textAnchor="middle" fill="#F1F7FF" fontSize="10" fontWeight="700">IEC 61850 (MMS)</text>
                <text x="392" y="70" textAnchor="middle" fill="#9CCBE4" fontSize="9">Reports / Status</text>
                <line x1="334" y1="80" x2="450" y2="80" stroke={linkUp ? '#00E5FF' : '#FF354F'} strokeWidth="3" strokeDasharray={linkUp ? undefined : '6 4'} />
                <polygon points="445,74 456,80 445,86" fill={linkUp ? '#00E5FF' : '#FF354F'} />
                {linkUp ? (
                  <circle r="4.5" fill="#00E5FF"><animateMotion dur="1s" repeatCount="indefinite" path="M 336 80 L 450 80" /></circle>
                ) : (
                  <text x="392" y="85" textAnchor="middle" fill="#FF354F" fontSize="16" fontWeight="900">✕</text>
                )}

                {/* Industrial Ethernet Switch */}
                <RealisticGatewayOrSwitch
                  x={458}
                  y={18}
                  width={94}
                  height={112}
                  variant="SWITCH"
                  healthy={linkUp}
                  label="Industrial Switch"
                  subLabel="(192.168.1.10)"
                />

                {/* Link 2 */}
                <line x1="554" y1="80" x2="640" y2="80" stroke={linkUp ? '#00E5FF' : '#FF354F'} strokeWidth="3" strokeDasharray={linkUp ? undefined : '6 4'} />
                <polygon points="635,74 646,80 635,86" fill={linkUp ? '#00E5FF' : '#FF354F'} />
                {linkUp && <circle r="4.5" fill="#00E5FF"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 556 80 L 640 80" /></circle>}

                {/* SCADA / HMI */}
                <g transform="translate(650, 14)">
                  <rect x="0" y="0" width="195" height="114" rx="6" fill="#5D7285" stroke={linkUp ? '#00CFFF' : '#FF354F'} strokeWidth="1.8" />
                  <rect x="6" y="6" width="183" height="98" rx="3" fill="#04111E" />
                  <rect x="7" y="7" width="181" height="14" fill="#0A2740" />
                  <text x="97" y="17" textAnchor="middle" fill="#D4EEFF" fontSize="8.5" fontWeight="800">SCADA / HMI</text>
                  <text x="18" y="38" fill={linkUp ? '#00FF59' : '#FF354F'} fontSize="9.5" fontWeight="800">
                    IED Status: {linkUp ? 'Online ●' : 'Comm. Loss ⚠'}
                  </text>
                  <text x="18" y="54" fill={linkUp ? '#00FF59' : '#FF354F'} fontSize="9" fontWeight="700">
                    Comm: {linkUp ? 'Healthy (MMS)' : 'Disconnected'}
                  </text>
                  <text x="18" y="70" fill={linkUp ? '#00FF59' : '#FFC400'} fontSize="9" fontWeight="700">
                    LPHD Health: {linkUp ? 'OK' : 'Invalid / Stale'}
                  </text>
                  <text x="18" y="86" fill="#9CCBE4" fontSize="8.5">Last Update: {ts}</text>
                  <text x="97" y="135" textAnchor="middle" fill="#F1F7FF" fontSize="10" fontWeight="700">SCADA / HMI Workstation</text>
                </g>
              </svg>
            </div>
          </section>

          {/* 3-Column Diagnostics */}
          <div className="sas-t4-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr 1fr', gap: 8 }}>
            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: '#00E5FF' }}>IED Communication Test</div>
              {[
                { k: 'Ping (192.168.1.52)', v: linkUp ? 'Reply (1 ms)' : 'Request Timed Out', ok: linkUp },
                { k: 'Port (TCP 102)', v: linkUp ? 'Open' : 'Unreachable', ok: linkUp },
                { k: 'MMS Association', v: linkUp ? 'Connected' : 'Lost', ok: linkUp },
                { k: 'LLN0.Heartbeat', v: linkUp ? 'Active (5 s)' : 'Expired', ok: linkUp },
                { k: 'LPHD Health', v: linkUp ? 'OK' : 'Alarm', ok: linkUp },
              ].map((r) => (
                <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span>{r.k}</span>
                  <strong style={{ color: r.ok ? '#00FF59' : '#FF354F' }}>{r.ok ? '✔' : '✖'} {r.v}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: '#00E5FF' }}>IED Health &amp; Diagnostic (IEC 61850)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#08283D', color: '#9CCBE4', textAlign: 'left' }}>
                    <th style={{ padding: '4px' }}>Parameter (LN)</th>
                    <th style={{ padding: '4px' }}>Value</th>
                    <th style={{ padding: '4px' }}>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p: 'LLN0.Mod.stVal', v: 'ON', ok: linkUp },
                    { p: 'LLN0.Health.stVal', v: linkUp ? 'OK (1)' : 'Alarm (3)', ok: linkUp },
                    { p: 'LPHD.PhyHealth.stVal', v: linkUp ? 'OK (1)' : 'Not OK (3)', ok: linkUp },
                    { p: 'LPHD.CommHealth.stVal', v: linkUp ? 'OK (1)' : 'Comm Loss', ok: linkUp },
                    { p: 'LPHD.DiagAlm.stVal', v: linkUp ? 'FALSE' : 'TRUE', ok: linkUp },
                  ].map((r) => (
                    <tr key={r.p} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                      <td style={{ padding: '4px', fontWeight: 700 }}>{r.p}</td>
                      <td style={{ padding: '4px', fontWeight: 800, color: r.ok ? '#00FF59' : '#FF354F' }}>{r.v}</td>
                      <td style={{ padding: '4px', color: r.ok ? '#00FF59' : '#FF354F' }}>{r.ok ? '✔ Good' : '✖ Invalid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, maxHeight: 175, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: '#00E5FF' }}>Sequence Of Events (SOE)</div>
              {soe.map((s) => (
                <div key={s.id} style={{ padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: s.ok ? '#00FF59' : '#FF354F', marginRight: 5 }}>●</span>
                  <span style={{ fontFamily: 'monospace', color: '#9CCBE4', marginRight: 6 }}>{s.time}</span>
                  <span>{s.event}</span>
                </div>
              ))}
            </section>
          </div>

          {/* 4-Stage Operation Sequence */}
          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – Communication Health Test</div>
            <div className="sas-t4-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Initial – Online', ok: true, lines: ['IED: Online', 'MMS: Connected', 'LPHD Health: OK', 'DiagAlm: FALSE'], act: restoreConnection },
                { num: 2 as const, title: 'Simulate Link Loss', ok: false, lines: ['Link: Disconnected', 'MMS: Not Connected', 'LPHD Health: Not OK', 'Data Quality: Invalid'], act: simulateLinkLoss },
                { num: 3 as const, title: 'Alarm at HMI/SCADA', ok: false, lines: ['Comm. Alarm: Active', 'Quality: Invalid', 'LLN0.Mod: ON', 'Event: Logged'], act: () => { simulateLinkLoss(); setSeqStage(3); } },
                { num: 4 as const, title: 'Restore – Recovery', ok: true, lines: ['Link: Restored', 'MMS: Connected', 'LPHD Health: OK', 'Alarm: Cleared'], act: restoreConnection },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={() => { c.act(); setSeqStage(c.num); }} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00E5FF' : '1px solid rgba(0,207,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F7FF', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{c.num}. {c.title}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.35 }}>
                      {c.lines.map((l, li) => (
                        <div key={li}><span style={{ color: c.ok ? '#00FF59' : '#FF354F', marginRight: 4 }}>{c.ok ? '✔' : '✖'}</span>{l}</div>
                      ))}
                    </div>
                  </button>
                  {idx < 3 && <span style={{ color: '#00E5FF', fontWeight: 900 }}>➔</span>}
                </React.Fragment>
              ))}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @media (max-width: 1120px) {
          .sas-t4-grid, .sas-t4-mid, .sas-t4-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test4IedCommVisualization;
