import { MultifunctionMeter } from '../components/MultifunctionMeter';
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

interface Test12Props {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

const TEST12_STEPS = [
  'Verify Modbus TCP device reachability and port 502.',
  'Read configured registers using FC03/FC04.',
  'Verify data types, scaling and register offsets.',
  'Configure Modbus-to-OPC UA point mapping.',
  'Start OPC UA server and verify endpoint security.',
  'Connect OPC UA client and browse the namespace.',
  'Create subscriptions and verify live data updates.',
  'Simulate permitted changes and communication faults.',
  'Restore configuration and record test evidence.',
];

function nowTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function Test12ModbusOpcUaVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test12Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST12_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [modbusConnected, setModbusConnected] = useState(true);
  const [opcServerUp, setOpcServerUp] = useState(true);
  const [opcSubscribed, setOpcSubscribed] = useState(true);
  const [q1Closed, setQ1Closed] = useState(true);
  const [feederCurrent, setFeederCurrent] = useState(120.5);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(3);
  const [logs, setLogs] = useState(() => [
    { id: 1, time: nowTs(), src: 'Gateway', tag: 'ns=2;s=Q1.Status', val: 'CLOSED (1)', ok: true },
    { id: 2, time: nowTs(), src: 'Gateway', tag: 'ns=2;s=Bus1.Voltage', val: '33.12 kV', ok: true },
    { id: 3, time: nowTs(), src: 'SCADA', tag: 'Subscription Update', val: 'Received (1000ms)', ok: true },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST12_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const pushLog = (src: string, tag: string, val: string, ok = true) =>
    setLogs((p) => [{ id: Date.now() + Math.random(), time: nowTs(), src, tag, val, ok }, ...p.slice(0, 6)]);

  const toggleBreaker = () => {
    if (!modbusConnected || !opcServerUp || !opcSubscribed) {
      pushLog('SCADA', 'Q1.Status', 'Comm Offline / No Sub', false);
      return;
    }
    const next = !q1Closed;
    setQ1Closed(next);
    setSeqStage(4);
    pushLog('Gateway', 'ns=2;s=Q1.Status', next ? 'CLOSED (1)' : 'OPEN (0)', true);
  };

  const toggleModbusFault = () => {
    const nextConn = !modbusConnected;
    setModbusConnected(nextConn);
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: nextConn ? 'clear' : 'fault', severity: 'MAJOR', id: 'TEST12-MODBUS', label: 'Test 12 Modbus device communication timeout' } }));
    pushLog('Gateway', 'Modbus TCP/502', nextConn ? 'Polling Restored' : 'Device Offline (Timeout)', nextConn);
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

  const healthy = modbusConnected && opcServerUp && opcSubscribed;

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
      <div style={{marginBottom:10}}><MultifunctionMeter context="Test 12 – Modbus / OPC UA" communicationHealthy={modbusConnected && opcServerUp} /></div>
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#06263E', border: '1.5px solid #00DFFF', display: 'grid', placeItems: 'center', color: '#FFC400' }}>⚡</span>
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>COMMUNICATION – TEST 12</span>
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
              const next = Array(TEST12_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF70', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF70' }} /> {done.every(Boolean) ? 'Completed (9/9)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* TITLE & TABS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.25)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Modbus TCP and OPC UA</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Validate gateway integration with register mapping and subscriptions.</p>
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
      <div className="sas-t12-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(255px, 23.5%) minmax(0, 1fr)', gap: 10 }}>
        {/* LEFT SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved Modbus register map &amp; point list</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Device IPs (Port 502) &amp; OPC UA Endpoint (4840)</div>
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF70', fontSize: 10.5 }}>{done.filter(Boolean).length}/9</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3 }}>
              {TEST12_STEPS.map((txt, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div key={idx} onClick={() => setActiveStep(idx)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4.5px 7px', borderRadius: 6, border: isSel ? '1.5px solid #00DFFF' : '1px solid rgba(30,102,138,0.6)', background: isSel ? 'rgba(0,185,220,0.24)' : '#071B2E', cursor: 'pointer', fontSize: 10.5 }}>
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
                      style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', border: isDone ? '1.5px solid #00FF70' : '1.5px solid #4A7A96', background: isDone ? '#00FF70' : '#051525', color: '#01200B', fontWeight: 900, fontSize: 10.5, cursor: 'pointer', padding: 0 }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span><strong style={{ color: isDone ? '#00FF70' : '#00DFFF', marginRight: 4 }}>{idx + 1}.</strong>{txt}</span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="Modbus TCP and OPC UA" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF70', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            Modbus register values are read accurately, mapped to OPC UA nodes, and subscribed by SCADA/HMI with valid quality.
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            FC03 vs FC04, 32-bit float word order, register offsets, OPC UA NodeIds, and polling vs subscriptions.
          </section>
        </aside>

        {/* RIGHT CONTENT */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* TOP VISUALIZATION */}
          <section style={{ background: '#061B30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – Modbus TCP and OPC UA Integration
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={toggleBreaker} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #00FF70', background: '#063322', color: '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Toggle Q1 ({q1Closed ? 'OPEN' : 'CLOSE'})</button>
                <button type="button" onClick={() => { setFeederCurrent((c) => (c > 150 ? 120.5 : 168.4)); pushLog('Gateway', 'ns=2;s=Feeder.Current', `${feederCurrent > 150 ? '120.5' : '168.4'} A`, true); }} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #00DFFF', background: '#08283D', color: '#00DFFF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Change Register Value</button>
                <button type="button" onClick={toggleModbusFault} style={{ padding: '3px 8px', borderRadius: 4, border: modbusConnected ? '1px solid #FF3344' : '1px solid #00FF70', background: '#08283D', color: modbusConnected ? '#FF7080' : '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {modbusConnected ? 'Simulate Device Offline' : 'Restore Communication'}
                </button>
              </div>
            </div>

            <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
              <svg viewBox="0 0 920 185" style={{ width: '100%', minWidth: 740, height: 178 }}>
                {/* Field Devices */}
                <g transform="translate(8, 8)">
                  <rect x="0" y="0" width="188" height="168" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="94" y="16" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">Field Devices (Modbus TCP)</text>
                  <image href="/assets/ieds/schneider-c264.webp" x="10" y="24" width="42" height="40" preserveAspectRatio="xMidYMid meet" />
                  <text x="58" y="40" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Schneider MiCOM C264</text>
                  <text x="58" y="51" fill="#9CCBE4" fontSize="7.5">192.168.10.11</text>
                  <image href="/assets/devices/abb-relion-ref615.png" x="10" y="70" width="42" height="40" preserveAspectRatio="xMidYMid meet" />
                  <text x="58" y="86" fill="#F1F7FF" fontSize="8.5" fontWeight="700">ABB REF615</text>
                  <text x="58" y="97" fill="#9CCBE4" fontSize="7.5">192.168.10.12</text>
                  {/* Physical-style digital MFM faceplate and Modbus TCP address. */}
                  <rect x="10" y="116" width="42" height="40" rx="4" fill="#384a58" stroke={modbusConnected ? '#00DFFF' : '#FF3344'} strokeWidth="1.5" />
                  <rect x="14" y="121" width="34" height="24" rx="2" fill="#06352d" stroke="#58bfb4" />
                  <text x="31" y="130" textAnchor="middle" fill="#b3ffdc" fontSize="6.5" fontWeight="800">MFM</text>
                  <text x="31" y="139" textAnchor="middle" fill="#b3ffdc" fontSize="6.5">{modbusConnected ? `${feederCurrent.toFixed(0)} A` : 'OFFLINE'}</text>
                  <text x="58" y="132" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Multifunction Meter</text>
                  <text x="58" y="143" fill="#9CCBE4" fontSize="7.5">192.168.10.13 · Unit 1</text>
                </g>

                {/* Industrial Switch */}
                <line x1="198" y1="90" x2="238" y2="90" stroke={modbusConnected ? '#00DFFF' : '#FF3344'} strokeWidth="2.8" />
                <g transform="translate(242, 34)">
                  <rect x="0" y="0" width="112" height="106" rx="6" fill="#061D30" stroke="#00DFFF" />
                  <image href="/assets/devices/industrial-ethernet-switch.png" x="8" y="12" width="96" height="58" preserveAspectRatio="xMidYMid meet" />
                  <text x="56" y="84" textAnchor="middle" fill="#F1F7FF" fontSize="8.5" fontWeight="800">Hirschmann RSP35</text>
                  <text x="56" y="96" textAnchor="middle" fill="#00DFFF" fontSize="7.5">Modbus TCP (502)</text>
                </g>

                <line x1="356" y1="90" x2="394" y2="90" stroke={modbusConnected ? '#00DFFF' : '#FF3344'} strokeWidth="2.8" />
                {modbusConnected && <circle r="4" fill="#00DFFF"><animateMotion dur="0.8s" repeatCount="indefinite" path="M 358 90 L 394 90" /></circle>}

                {/* Protocol Gateway / OPC UA Server */}
                <g transform="translate(396, 12)">
                  <rect x="0" y="0" width="176" height="160" rx="7" fill="#061D30" stroke={healthy ? '#00FF70' : '#FF3344'} strokeWidth="1.6" />
                  <text x="88" y="16" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">Protocol Gateway / OPC UA</text>
                  <image href="/assets/devices/station-gateway.jpg" x="24" y="22" width="128" height="56" preserveAspectRatio="xMidYMid meet" />
                  <text x="12" y="94" fill="#00FF70" fontSize="8">✔ Modbus TCP Client (Poll)</text>
                  <text x="12" y="107" fill="#00FF70" fontSize="8">✔ Register → Node Mapping</text>
                  <text x="12" y="120" fill="#00FF70" fontSize="8">✔ OPC UA Server (Publish)</text>
                  <text x="12" y="135" fill="#9CCBE4" fontSize="7.5">opc.tcp://192.168.10.100:4840</text>
                </g>

                <line x1="574" y1="90" x2="622" y2="90" stroke={healthy ? '#00FF70' : '#FF3344'} strokeWidth="2.8" />
                <polygon points="617,84 628,90 617,96" fill={healthy ? '#00FF70' : '#FF3344'} />
                {healthy && <circle r="4.5" fill="#00FF70"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 576 90 L 622 90" /></circle>}

                {/* SCADA / HMI OPC UA Client */}
                <g transform="translate(632, 10)">
                  <rect x="0" y="0" width="278" height="164" rx="7" fill="#041423" stroke={healthy ? '#00DFFF' : '#FF3344'} strokeWidth="1.6" />
                  <text x="139" y="16" textAnchor="middle" fill="#D4EEFF" fontSize="9.5" fontWeight="800">33/11 kV Substation – SCADA (OPC UA Client)</text>
                  <rect x="38" y="54" width="24" height="24" rx="3" fill={q1Closed ? '#00FF70' : '#FF3344'} />
                  <text x="50" y="70" textAnchor="middle" fill="#011826" fontSize="10" fontWeight="900">Q1</text>
                  <text x="82" y="52" fill="#00DFFF" fontSize="9" fontWeight="800">Measurements</text>
                  <text x="82" y="68" fill="#F1F7FF" fontSize="9">Bus V: 33.12 kV</text>
                  <text x="82" y="83" fill="#00FF70" fontSize="9" fontWeight="700">Feeder I: {feederCurrent.toFixed(1)} A</text>
                  <text x="82" y="98" fill="#F1F7FF" fontSize="9">Active P: 6.75 MW</text>
                  <text x="82" y="113" fill={healthy ? '#00FF70' : '#FF3344'} fontSize="9" fontWeight="800">
                    {healthy ? 'Modbus & OPC UA: HEALTHY' : 'COMM FAULT / BAD QUALITY'}
                  </text>
                  <text x="82" y="132" fill={q1Closed ? '#00FF70' : '#FF3344'} fontSize="9.5" fontWeight="800">
                    Breaker Q1: {q1Closed ? 'CLOSED' : 'OPEN'}
                  </text>
                </g>
              </svg>
            </div>
          </section>

          {/* MIDDLE ROW */}
          <div className="sas-t12-mid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1.15fr', gap: 8 }}>
            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Modbus TCP Register Mapping</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#08283D', color: '#9CCBE4', textAlign: 'left' }}><th style={{ padding: 3 }}>Signal</th><th style={{ padding: 3 }}>Reg</th><th style={{ padding: 3 }}>Type</th><th style={{ padding: 3 }}>Value</th></tr></thead>
                <tbody>
                  {[
                    ['Breaker Q1', '40001', 'UINT16', q1Closed ? '1 (CLOSED)' : '0 (OPEN)'],
                    ['Bus Voltage', '30001', 'FLOAT32', '33.12 kV'],
                    ['Feeder I', '30003', 'FLOAT32', `${feederCurrent.toFixed(2)} A`],
                    ['Active P', '30005', 'FLOAT32', '6.75 MW'],
                  ].map((r) => (
                    <tr key={r[0]} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                      <td style={{ padding: 3, fontWeight: 700 }}>{r[0]}</td>
                      <td style={{ padding: 3 }}>{r[1]}</td>
                      <td style={{ padding: 3 }}>{r[2]}</td>
                      <td style={{ padding: 3, color: modbusConnected ? '#00FF70' : '#FF3344', fontWeight: 700 }}>{modbusConnected ? r[3] : 'TIMEOUT'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>OPC UA Server Configuration</div>
              {[
                ['Endpoint', 'opc.tcp://192.168.10.100:4840'],
                ['Security', 'Sign & Encrypt (Basic256Sha256)'],
                ['Namespace', 'urn:sas:substation'],
                ['Publishing Interval', '1000 ms (Subscriptions Enabled)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: '#9CCBE4' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10, maxHeight: 155, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Live Data &amp; Communication Result</div>
              {logs.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span><span style={{ color: l.ok ? '#00FF70' : '#FF3344', marginRight: 4 }}>●</span>{l.tag}: <strong>{l.val}</strong></span>
                  <strong style={{ color: l.ok ? '#00FF70' : '#FF3344' }}>{l.ok ? 'PASS' : 'FAIL'}</strong>
                </div>
              ))}
            </section>
          </div>

          {/* BOTTOM: 4-STAGE OPERATION SEQUENCE */}
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – Modbus TCP and OPC UA Test</div>
            <div className="sas-t12-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Verify Modbus TCP', lines: ['Verify IP & TCP/502', 'Read FC03/FC04', 'Confirm raw values'] },
                { num: 2 as const, title: 'Configure Mapping', lines: ['Decode 32-bit float', 'Apply scaling', 'Map to OPC UA NodeId'] },
                { num: 3 as const, title: 'OPC UA Subscription', lines: ['Secure session', 'Browse namespace', 'Create monitored items'] },
                { num: 4 as const, title: 'SCADA Validation', lines: ['Simulate data change', 'Verify subscription', 'Final Result: PASS'] },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={() => setSeqStage(c.num)} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F7FF', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{c.num}. {c.title}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.35 }}>
                      {c.lines.map((l, li) => <div key={li}><span style={{ color: '#00FF70', marginRight: 4 }}>✔</span>{l}</div>)}
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
          .sas-t12-grid, .sas-t12-mid, .sas-t12-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test12ModbusOpcUaVisualization;
