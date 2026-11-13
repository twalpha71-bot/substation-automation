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
  Network,
  RotateCcw,
  WifiOff,
} from 'lucide-react';

interface Test11Props {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

const TEST11_STEPS = [
  'Verify gateway configuration, IP and TCP port 2404.',
  'Check station-to-RCC network connectivity.',
  'Establish TCP connection and initiate STARTDT.',
  'Verify station indications and measurements.',
  'Verify General Interrogation and ASDU mapping.',
  'Perform authorized remote-control simulation.',
  'Monitor TESTFR supervision, link loss and reconnection.',
  'Restore configuration and record test evidence.',
];

function nowUtc(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function Test11Iec104Visualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test11Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST11_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // IEC 104 Protocol State Machine
  const [tcpConnected, setTcpConnected] = useState(true);
  const [startdtActive, setStartdtActive] = useState(true);
  const [wanUp, setWanUp] = useState(true);
  const [q1Closed, setQ1Closed] = useState(true);
  const [iFrameSeq, setIFrameSeq] = useState(12);
  const [sFrameAck, setSFrameAck] = useState(12);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(2);
  const [events, setEvents] = useState(() => [
    { id: 1, time: nowUtc(), msg: 'TCP Connected (2404)', ok: true },
    { id: 2, time: nowUtc(), msg: 'STARTDT act / con (U-Frame)', ok: true },
    { id: 3, time: nowUtc(), msg: 'Station Data (M_SP_NA_1 / M_ME_NC_1)', ok: true },
    { id: 4, time: nowUtc(), msg: 'TESTFR act / con (Keepalive)', ok: true },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST11_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const pushEvent = (msg: string, ok = true) =>
    setEvents((p) => [{ id: Date.now() + Math.random(), time: nowUtc(), msg, ok }, ...p.slice(0, 7)]);

  const handleTcpConnect = () => {
    setWanUp(true);
    setTcpConnected(true);
    setSeqStage(1);
    pushEvent('TCP Connected (Port 2404)', true);
  };

  const handleStartDt = () => {
    if (!wanUp || !tcpConnected) {
      pushEvent('STARTDT failed: Establish TCP 2404 first', false);
      return;
    }
    setStartdtActive(true);
    setSeqStage(2);
    pushEvent('STARTDT act → STARTDT con (Link ACTIVE)', true);
  };

  const handleGi = () => {
    if (!wanUp || !startdtActive) {
      pushEvent('GI blocked: STARTDT not active', false);
      return;
    }
    setIFrameSeq((n) => n + 3);
    setSFrameAck((n) => n + 3);
    setSeqStage(3);
    pushEvent('General Interrogation (C_IC_NA_1) → I-Frames Sent', true);
  };

  const handleRemoteCmd = () => {
    if (!wanUp || !startdtActive) {
      pushEvent('Remote Control blocked: Link down', false);
      return;
    }
    const next = !q1Closed;
    setQ1Closed(next);
    setIFrameSeq((n) => n + 1);
    setSFrameAck((n) => n + 1);
    setSeqStage(3);
    pushEvent(`Remote Control C_SC_NA_1 (${next ? 'CLOSE' : 'OPEN'}) → Feedback OK`, true);
  };

  const handleWanFail = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'MAJOR', id: 'TEST11-WAN', label: 'Test 11 IEC-104 WAN link failure' } }));
    setWanUp(false);
    setTcpConnected(false);
    setStartdtActive(false);
    setSeqStage(4);
    pushEvent('WAN Link Failure — TCP/2404 & STARTDT Lost', false);
  };

  const handleReconnect = () => {
    window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'clear', severity: 'MAJOR', id: 'TEST11-WAN', label: 'Test 11 IEC-104 WAN link restored' } }));
    setWanUp(true);
    setTcpConnected(true);
    setStartdtActive(true);
    setSeqStage(4);
    pushEvent('WAN Restored — TCP/2404 & STARTDT Re-established', true);
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

  const linkHealthy = wanUp && tcpConnected && startdtActive;

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
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#06263E', border: '1.5px solid #00DFFF', display: 'grid', placeItems: 'center', color: '#FFC400' }}>⚡</span>
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>COMMUNICATION – TEST 11</span>
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
              const next = Array(TEST11_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF70', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF70' }} /> {done.every(Boolean) ? 'Completed (8/8)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* TITLE & TABS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, border: '1.5px solid #00DFFF', background: '#062238', display: 'grid', placeItems: 'center', color: '#00DFFF', fontWeight: 900, fontSize: 12 }}>104</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>IEC 60870-5-104 Gateway to RCC</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Verify TCP/2404, STARTDT and telecontrol point exchange.</p>
          </div>
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
      <div className="sas-t11-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(255px, 23.5%) minmax(0, 1fr)', gap: 10 }}>
        {/* LEFT SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF70' }}>●</span> IEC 60870-5-104 gateway configuration</div>
            <div><span style={{ color: '#00FF70' }}>●</span> IP addressing, TCP port 2404 &amp; routing</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved ASDU &amp; IOA mapping list</div>
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF70', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST11_STEPS.map((txt, idx) => {
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
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="IEC 60870-5-104 Gateway to RCC" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF70', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            IEC 60870-5-104 communication established (STARTDT ACT), periodic TESTFR supervision succeeds, and remote control operates with valid authority.
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            Explain STARTDT, STOPDT, TESTFR, I/S/U-frames, ASDU, IOA, Common Address, and SBO telecontrol.
          </section>
        </aside>

        {/* RIGHT MAIN AREA */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* TOP VISUALIZATION */}
          <section style={{ background: '#061B30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – IEC 60870-5-104 Gateway to RCC
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={handleTcpConnect} style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #00DFFF', background: '#08283D', color: '#00DFFF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>TCP Connect</button>
                <button type="button" onClick={handleStartDt} style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #00FF70', background: '#063322', color: '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>STARTDT act/con</button>
                <button type="button" onClick={handleGi} style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #00DFFF', background: '#08283D', color: '#D8F3FF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>General Interrogation</button>
                <button type="button" onClick={handleRemoteCmd} style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #00FF70', background: '#063322', color: '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Remote Cmd ({q1Closed ? 'OPEN' : 'CLOSE'})</button>
                <button type="button" onClick={wanUp ? handleWanFail : handleReconnect} style={{ padding: '3px 7px', borderRadius: 4, border: wanUp ? '1px solid #FF3344' : '1px solid #00FF70', background: wanUp ? 'rgba(255,51,68,0.18)' : 'rgba(0,255,112,0.18)', color: wanUp ? '#FF7080' : '#00FF70', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {wanUp ? 'Simulate WAN Failure' : 'Reconnect & Restore'}
                </button>
              </div>
            </div>

            <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
              <svg viewBox="0 0 920 185" style={{ width: '100%', minWidth: 740, height: 178 }}>
                {/* Substation Field IEDs */}
                <g transform="translate(8, 8)">
                  <rect x="0" y="0" width="170" height="168" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="85" y="16" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">Substation (Field / SAS)</text>
                  <image href="/assets/devices/siemens-siprotec-5.png" x="10" y="24" width="44" height="40" preserveAspectRatio="xMidYMid meet" />
                  <text x="60" y="42" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Siemens SIPROTEC 5</text>
                  <image href="/assets/devices/abb-relion-ref615.png" x="10" y="70" width="44" height="40" preserveAspectRatio="xMidYMid meet" />
                  <text x="60" y="92" fill="#F1F7FF" fontSize="8.5" fontWeight="700">ABB REF615</text>
                  <image href="/assets/ieds/schneider-c264.webp" x="10" y="116" width="44" height="40" preserveAspectRatio="xMidYMid meet" />
                  <text x="60" y="138" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Schneider MiCOM C264</text>
                </g>

                <text x="210" y="68" textAnchor="middle" fill="#00DFFF" fontSize="8.5" fontWeight="700">IEC 61850</text>
                <text x="210" y="80" textAnchor="middle" fill="#9CCBE4" fontSize="8">(MMS)</text>
                <line x1="180" y1="90" x2="242" y2="90" stroke="#00FF70" strokeWidth="2.8" />
                <polygon points="238,84 248,90 238,96" fill="#00FF70" />
                <circle r="3.5" fill="#00FF70"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 182 90 L 242 90" /></circle>

                {/* Station Gateway */}
                <g transform="translate(250, 14)">
                  <rect x="0" y="0" width="155" height="156" rx="7" fill="#061D30" stroke={linkHealthy ? '#00FF70' : '#FF3344'} strokeWidth="1.6" />
                  <text x="77" y="16" textAnchor="middle" fill="#F1F7FF" fontSize="9.5" fontWeight="800">Station Gateway</text>
                  <image href="/assets/devices/station-gateway.jpg" x="18" y="22" width="118" height="58" preserveAspectRatio="xMidYMid meet" />
                  <text x="14" y="96" fill="#00FF70" fontSize="8">✔ IEC 61850 Client</text>
                  <text x="14" y="109" fill="#00FF70" fontSize="8">✔ IEC 60870-5-104 Server</text>
                  <text x="14" y="122" fill="#00FF70" fontSize="8">✔ ASDU &amp; Point Mapping</text>
                  <text x="14" y="135" fill="#00DFFF" fontSize="8">I-Seq: {iFrameSeq} | S-Ack: {sFrameAck}</text>
                </g>

                {/* Industrial security appliance: SVG chassis, because the project has no firewall photo asset. */}
                <g transform="translate(432, 34)">
                  <rect x="0" y="0" width="96" height="72" rx="5" fill="#101E2C" stroke="#00DFFF" strokeWidth="1.4" />
                  <rect x="5" y="19" width="86" height="31" rx="3" fill="#263847" stroke="#6A8797" strokeWidth="0.8" />
                  <text x="48" y="13" textAnchor="middle" fill="#C8EEFF" fontSize="8.5" fontWeight="800">Firewall</text>
                  {Array.from({ length: 5 }, (_, i) => (
                    <g key={i} transform={`translate(${12 + i * 15}, 27)`}>
                      <rect width="11" height="11" rx="1" fill="#050D17" stroke="#86A5B6" strokeWidth="0.8" />
                      <rect x="3" y="2" width="5" height="2" fill="#4C6370" />
                      <circle cx="9" cy="-3" r="1.5" fill={linkHealthy ? '#00FF70' : '#FF3344'} />
                    </g>
                  ))}
                  <text x="48" y="62" textAnchor="middle" fill={linkHealthy ? '#00FF70' : '#FF7080'} fontSize="7.3" fontWeight="700">
                    TCP/2404 {linkHealthy ? 'Allowed' : 'Unavailable'}
                  </text>
                </g>

                {/* Industrial WAN router chassis with status-dependent interface LEDs. */}
                <g transform="translate(550, 34)">
                  <rect x="0" y="0" width="96" height="72" rx="5" fill="#101E2C" stroke="#00DFFF" strokeWidth="1.4" />
                  <text x="48" y="13" textAnchor="middle" fill="#C8EEFF" fontSize="8.5" fontWeight="800">WAN Router</text>
                  <rect x="5" y="19" width="86" height="31" rx="3" fill="#263847" stroke="#6A8797" strokeWidth="0.8" />
                  {Array.from({ length: 4 }, (_, i) => (
                    <g key={i} transform={`translate(${13 + i * 19}, 27)`}>
                      <rect width="13" height="12" rx="1" fill="#050D17" stroke="#86A5B6" strokeWidth="0.8" />
                      <rect x="3" y="2" width="7" height="2" fill="#4C6370" />
                      <circle cx="10" cy="-3" r="1.5" fill={wanUp ? '#00FF70' : '#FF3344'} />
                    </g>
                  ))}
                  <text x="48" y="62" textAnchor="middle" fill={wanUp ? '#00FF70' : '#FF3344'} fontSize="7.5" fontWeight="800">
                    {wanUp ? 'IP WAN UP' : 'WAN LINK DOWN'}
                  </text>
                </g>

                {/* Link Gateway -> Firewall -> WAN -> RCC */}
                <line x1="407" y1="70" x2="718" y2="70" stroke={linkHealthy ? '#00DFFF' : '#FF3344'} strokeWidth="2.8" strokeDasharray={linkHealthy ? undefined : '5 4'} />
                <polygon points="713,64 724,70 713,76" fill={linkHealthy ? '#00DFFF' : '#FF3344'} />
                {linkHealthy && (
                  <circle r="4.5" fill="#00FF70"><animateMotion dur="1.3s" repeatCount="indefinite" path="M 408 70 L 718 70" /></circle>
                )}
                <rect x="430" y="122" width="248" height="36" rx="6" fill="#041423" stroke={linkHealthy ? '#00DFFF' : '#FF3344'} />
                <text x="554" y="137" textAnchor="middle" fill={linkHealthy ? '#00DFFF' : '#FF3344'} fontSize="8.5" fontWeight="800">
                  IEC 60870-5-104 over TCP/IP (Port: 2404)
                </text>
                <text x="554" y="150" textAnchor="middle" fill="#9CCBE4" fontSize="7.5">
                  {linkHealthy ? 'STARTDT ACTIVE • I-Frames & TESTFR OK' : 'ALARM: Communication Lost'}
                </text>

                {/* RCC / Control Centre */}
                <g transform="translate(726, 8)">
                  <rect x="0" y="0" width="186" height="168" rx="7" fill="#041423" stroke={linkHealthy ? '#00DFFF' : '#FF3344'} />
                  <text x="93" y="17" textAnchor="middle" fill="#F1F7FF" fontSize="9.5" fontWeight="800">RCC / Control Centre</text>
                  <image href="/assets/devices/scada-workstation.png" x="14" y="24" width="158" height="72" preserveAspectRatio="xMidYMid slice" />
                  <text x="16" y="112" fill="#00FF70" fontSize="8">✔ IEC 60870-5-104 Client</text>
                  <text x="16" y="126" fill={q1Closed ? '#00FF70' : '#FF3344'} fontSize="8.5" fontWeight="800">
                    Q1 Status: {q1Closed ? 'CLOSED (1)' : 'OPEN (0)'}
                  </text>
                  <text x="16" y="140" fill="#00DFFF" fontSize="8">Bus V: 33.12 kV | I: 120.4 A</text>
                  <text x="16" y="154" fill="#9CCBE4" fontSize="7.5">Simulated Training Display</text>
                </g>
              </svg>
            </div>
          </section>

          {/* MIDDLE ROW: 3 PANELS */}
          <div className="sas-t11-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: 8 }}>
            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>IEC 60870-5-104 Message Sequence</div>
              {[
                ['1. TCP Connect (Port 2404)', tcpConnected],
                ['2. STARTDT act (U-Frame) →', startdtActive],
                ['3. ← STARTDT con (U-Frame)', startdtActive],
                ['4. ← I-Frame (M_SP / M_ME)', linkHealthy],
                ['5. S-Frame Ack →', linkHealthy],
                ['6. TESTFR act / con (Keepalive)', linkHealthy],
              ].map(([msg, ok]) => (
                <div key={String(msg)} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span>{msg}</span>
                  <strong style={{ color: ok ? '#00FF70' : '#FF3344' }}>{ok ? 'OK' : 'WAIT'}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>ASDU &amp; Point Mapping (Example)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#08283D', color: '#9CCBE4', textAlign: 'left' }}>
                    <th style={{ padding: '3px' }}>ASDU Type</th>
                    <th style={{ padding: '3px' }}>IOA</th>
                    <th style={{ padding: '3px' }}>Point</th>
                    <th style={{ padding: '3px' }}>Dir</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['M_SP_NA_1 (1)', '1001', `Q1 (${q1Closed ? 'ON' : 'OFF'})`, 'S → RCC'],
                    ['M_ME_NC_1 (13)', '2001', 'Bus V (33.12 kV)', 'S → RCC'],
                    ['M_ME_NC_1 (13)', '2002', 'Feeder I (120.4 A)', 'S → RCC'],
                    ['C_SC_NA_1 (45)', '3001', 'Q1 Open/Close', 'RCC → S'],
                    ['C_IC_NA_1 (100)', '0', 'General Interr.', 'RCC → S'],
                  ].map((r) => (
                    <tr key={r[1] + r[2]} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                      <td style={{ padding: '3px', fontWeight: 700 }}>{r[0]}</td>
                      <td style={{ padding: '3px' }}>{r[1]}</td>
                      <td style={{ padding: '3px' }}>{r[2]}</td>
                      <td style={{ padding: '3px', color: r[3].startsWith('S') ? '#00FF70' : '#00DFFF' }}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, maxHeight: 165, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Live Communication &amp; Test Result</div>
              {events.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)', gap: 4 }}>
                  <span>
                    <span style={{ color: e.ok ? '#00FF70' : '#FF3344', marginRight: 4 }}>●</span>
                    <span style={{ fontFamily: 'monospace', color: '#9CCBE4', marginRight: 4 }}>{e.time}</span>
                    {e.msg}
                  </span>
                  <strong style={{ color: e.ok ? '#00FF70' : '#FF3344' }}>{e.ok ? 'PASS' : 'FAIL'}</strong>
                </div>
              ))}
            </section>
          </div>

          {/* BOTTOM: 4-STAGE OPERATION SEQUENCE */}
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – IEC 60870-5-104 Gateway to RCC Test</div>
            <div className="sas-t11-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Establish Connectivity', lines: ['Verify IP & TCP/2404', 'Check Firewall/WAN', 'Open RCC Client'], act: handleTcpConnect },
                { num: 2 as const, title: 'Start Data (STARTDT)', lines: ['Send STARTDT act', 'Receive STARTDT con', 'Link ACTIVE'], act: handleStartDt },
                { num: 3 as const, title: 'Verify Data & Control', lines: ['Check Q1, V, I ASDUs', 'Issue Remote Cmd', 'Confirm Feedback'], act: handleGi },
                { num: 4 as const, title: 'Supervision & Recovery', lines: ['Verify TESTFR keepalive', 'Simulate Link Loss', 'Auto Reconnect PASS'], act: handleReconnect },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={c.act} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F7FF', cursor: 'pointer' }}>
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
          .sas-t11-grid, .sas-t11-mid, .sas-t11-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test11Iec104Visualization;
