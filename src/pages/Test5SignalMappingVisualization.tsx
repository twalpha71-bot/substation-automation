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

interface Test5SignalMappingVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

function nowTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

const TEST5_STEPS = [
  'Identify field contact or analog source.',
  'Find IED LD, LN, Data Object and attribute.',
  'Check DataSet and Report-Control-Block.',
  'Check gateway point mapping and scaling.',
  'Inject or simulate one input at a time.',
  'Verify IED value, report, gateway and HMI tag.',
  'Confirm alarm class, units, quality and timestamp.',
  'Repeat with reset/normal condition and save evidence.',
];

export function Test5SignalMappingVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test5SignalMappingVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST5_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cbClosed, setCbClosed] = useState<boolean>(true);
  const [mappingFault, setMappingFault] = useState<boolean>(false);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(1);
  const [ts, setTs] = useState<string>(() => nowTs());
  const [soe, setSoe] = useState<{ id: number; time: string; event: string; ok: boolean }[]>(() => [
    { id: 1, time: nowTs(), event: 'Point Mapping Loaded (DS_CB_Status → CB_5201_ST)', ok: true },
    { id: 2, time: nowTs(), event: 'IED Report: XCBR1.Pos = 2 (CLOSED)', ok: true },
    { id: 3, time: nowTs(), event: 'HMI Update: CB-33-F03 CLOSED (Green)', ok: true },
  ]);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST5_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const pushSoe = (event: string, ok = true) => {
    const t = nowTs();
    setTs(t);
    setSoe((p) => [{ id: Date.now() + Math.random(), time: t, event, ok }, ...p.slice(0, 7)]);
  };

  const simulatePosition = (closed: boolean) => {
    setCbClosed(closed);
    setSeqStage(2);
    pushSoe(`Field 52a=${closed ? 'ON' : 'OFF'}, 52b=${closed ? 'OFF' : 'ON'} → XCBR1.Pos=${closed ? '2 (CLOSED)' : '1 (OPEN)'}`, true);
    if (!mappingFault) {
      pushSoe(`HMI Update: CB-33-F03 ${closed ? 'CLOSED' : 'OPEN'}`, true);
    } else {
      pushSoe('Mapping Fault: Gateway point CB_5201_ST failed to update HMI', false);
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

  const stVal = cbClosed ? '2 (CLOSED)' : '1 (OPEN)';
  const cbColor = mappingFault ? '#FFC400' : cbClosed ? '#00FF66' : '#FF354D';

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
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>SLD &amp; OPERATION – TEST 5</span>
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
              const next = Array(TEST5_STEPS.length).fill(!all);
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
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Signal Mapping End-to-End</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#89C7E8' }}>Trace an input from field/IED to SCADA and RCC (Control Center).</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t5-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 24.5%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF66' }}>●</span> Signal list and point database available</div>
            <div><span style={{ color: '#00FF66' }}>●</span> Approved test injection method (simulation)</div>
          </section>

          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF66', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST5_STEPS.map((txt, idx) => {
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
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="Signal Mapping" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF66', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            All point names, values, engineering units and quality match the signal list.
          </section>

          <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            Trace XCBR1.Pos.stVal through DataSet, RCB, gateway and HMI.
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* Main Flow */}
          <section style={{ background: '#061C30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – Signal Mapping End-to-End Flow
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => simulatePosition(false)} style={{ padding: '3.5px 9px', borderRadius: 5, border: '1px solid #FF354D', background: 'rgba(255,53,77,0.16)', color: '#FF7080', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Simulate OPEN</button>
                <button type="button" onClick={() => simulatePosition(true)} style={{ padding: '3.5px 9px', borderRadius: 5, border: '1px solid #00FF66', background: 'rgba(0,255,102,0.16)', color: '#00FF66', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Simulate CLOSE</button>
                <button type="button" onClick={() => { setMappingFault((m) => !m); window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: mappingFault ? 'clear' : 'fault', severity: 'MAJOR', id: 'TEST5-MAPPING', label: 'Test 5 gateway mapping fault' } })); pushSoe(!mappingFault ? 'Injected Gateway Mapping Fault' : 'Restored Gateway Mapping', mappingFault); }} style={{ padding: '3.5px 9px', borderRadius: 5, border: mappingFault ? '1px solid #00FF66' : '1px solid #FFC400', background: '#08283D', color: mappingFault ? '#00FF66' : '#FFC400', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                  {mappingFault ? 'Restore Mapping' : 'Inject Mapping Fault'}
                </button>
              </div>
            </div>

            <div style={{ padding: '8px 12px', overflowX: 'auto' }}>
              <svg viewBox="0 0 880 175" style={{ width: '100%', minWidth: 700, height: 168 }}>
                {/* 1. Field Device Auxiliary Contacts */}
                <g transform="translate(8, 12)">
                  <rect x="0" y="0" width="175" height="145" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="87" y="18" textAnchor="middle" fill="#00DFFF" fontSize="10.5" fontWeight="800">Field Device (Aux Contacts)</text>
                  <rect x="16" y="34" width="142" height="36" rx="5" fill="#062236" stroke={cbClosed ? '#00FF66' : '#35607A'} />
                  <text x="26" y="56" fill="#F1F8FF" fontSize="11" fontWeight="800">52a (NO): {cbClosed ? 'ON' : 'OFF'}</text>
                  <rect x="16" y="82" width="142" height="36" rx="5" fill="#062236" stroke={!cbClosed ? '#00FF66' : '#35607A'} />
                  <text x="26" y="104" fill="#F1F8FF" fontSize="11" fontWeight="800">52b (NC): {!cbClosed ? 'ON' : 'OFF'}</text>
                  <text x="87" y="135" textAnchor="middle" fill="#89C7E8" fontSize="9.5">CB-33-F03 Aux Contacts</text>
                </g>

                <line x1="185" y1="64" x2="232" y2="64" stroke="#00FF66" strokeWidth="2.8" />
                <polygon points="227,58 237,64 227,70" fill="#00FF66" />
                <circle r="4" fill="#00FF66"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 187 64 L 232 64" /></circle>

                {/* 2. Siemens SIPROTEC 5 */}
                <RealisticSiprotec5
                  x={242}
                  y={8}
                  width={156}
                  height={138}
                  lcdLines={[
                    { text: 'LD0 / XCBR1.Pos', color: '#89C7E8' },
                    { text: `stVal=${stVal}`, color: cbClosed ? '#00FF66' : '#FF354D', bold: true },
                    { text: 'q: Good (0x00)', color: '#00FF66' },
                    { text: 'DS_CB_Status', color: '#00DFFF' },
                  ]}
                  label="IED – SIPROTEC 5"
                />

                {/* Link IED -> Gateway */}
                <text x="454" y="54" textAnchor="middle" fill="#F1F8FF" fontSize="9.5" fontWeight="700">IEC 61850 MMS</text>
                <text x="454" y="67" textAnchor="middle" fill="#89C7E8" fontSize="8.5">DS_CB_Status / RCB</text>
                <line x1="404" y1="80" x2="504" y2="80" stroke="#00DFFF" strokeWidth="3" />
                <polygon points="499,74 510,80 499,86" fill="#00DFFF" />
                <circle r="4.5" fill="#00DFFF"><animateMotion dur="1s" repeatCount="indefinite" path="M 406 80 L 504 80" /></circle>

                {/* 3. Station Gateway */}
                <RealisticGatewayOrSwitch
                  x={516}
                  y={16}
                  width={116}
                  height={118}
                  variant="GATEWAY"
                  healthy={!mappingFault}
                  label="Station Gateway"
                  subLabel="Tag: CB_5201_ST"
                />

                {/* Link Gateway -> SCADA */}
                <text x="676" y="62" textAnchor="middle" fill="#F1F8FF" fontSize="9">IEC 104 /</text>
                <text x="676" y="73" textAnchor="middle" fill="#89C7E8" fontSize="8.5">DNP3 (RCC)</text>
                <line x1="636" y1="80" x2="712" y2="80" stroke={mappingFault ? '#FF354D' : '#00DFFF'} strokeWidth="3" />
                <polygon points="707,74 718,80 707,86" fill={mappingFault ? '#FF354D' : '#00DFFF'} />
                {!mappingFault && <circle r="4" fill="#00DFFF"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 638 80 L 712 80" /></circle>}

                {/* 4. SCADA / HMI */}
                <g transform="translate(722, 16)">
                  <rect x="0" y="0" width="150" height="114" rx="6" fill="#5D7285" stroke="#00DFFF" strokeWidth="1.6" />
                  <rect x="5" y="5" width="140" height="100" rx="3" fill="#04111E" />
                  <rect x="6" y="6" width="138" height="14" fill="#0A2740" />
                  <text x="75" y="16" textAnchor="middle" fill="#D4EEFF" fontSize="8" fontWeight="800">SCADA / HMI</text>
                  <rect x="26" y="42" width="22" height="22" rx="3" fill={cbColor} />
                  <text x="37" y="57" textAnchor="middle" fill="#FFF" fontSize="10" fontWeight="900">52</text>
                  <text x="58" y="49" fill={cbColor} fontSize="8.5" fontWeight="800">CB-33-F03</text>
                  <text x="58" y="63" fill={cbColor} fontSize="8.5" fontWeight="800">{mappingFault ? 'INVALID' : cbClosed ? 'CLOSED' : 'OPEN'}</text>
                  <text x="75" y="132" textAnchor="middle" fill="#F1F8FF" fontSize="9.5" fontWeight="700">SCADA / HMI &amp; RCC</text>
                </g>
              </svg>
            </div>
          </section>

          {/* 3 Diagnostic Panels */}
          <div className="sas-t5-mid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.25fr 1fr', gap: 8 }}>
            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>IEC 61850 Signal Mapping</div>
              {[
                ['Field Signal', 'CB-33-F03 52a / 52b'],
                ['IED', 'LD0/XCBR1.Pos.stVal'],
                ['DataSet', 'DS_CB_Status'],
                ['RCB', 'RCB_CB_STATUS (UR, 100ms)'],
                ['Gateway Tag', 'CB_5201_ST → IEC104 IOA 1001'],
                ['HMI Tag', 'CB-33-F03 Position'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span style={{ color: '#89C7E8' }}>{k}</span>
                  <strong style={{ color: '#F1F8FF' }}>{v}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 5 }}>Live Signal Monitoring (IEC 61850)</div>
              {[
                ['XCBR1.Pos.stVal', stVal, true],
                ['XCBR1.Pos.q', mappingFault ? 'Invalid (0x40)' : 'Good (0x00)', !mappingFault],
                ['XCBR1.Pos.t', ts, true],
                ['52a / 52b', cbClosed ? 'ON / OFF' : 'OFF / ON', true],
                ['Gateway Point', mappingFault ? 'MAP FAULT' : 'ALIGNED', !mappingFault],
              ].map(([p, v, ok]) => (
                <div key={String(p)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span>{p}</span>
                  <strong style={{ color: ok ? '#00FF66' : '#FF354D' }}>{v}</strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061C30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, maxHeight: 165, overflowY: 'auto' }}>
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
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Operation Sequence – End-to-End Signal Flow</div>
            <div className="sas-t5-seq" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Field Input – Contact', lines: ['Change CB position', `52a = ${cbClosed ? 'ON' : 'OFF'}`, `52b = ${cbClosed ? 'OFF' : 'ON'}`] },
                { num: 2 as const, title: 'IED – IEC 61850', lines: ['LD/LN/DO Identified', `Value = ${stVal}`, 'Report Sent (UR)'] },
                { num: 3 as const, title: 'Gateway – Mapping', lines: ['Point Mapping OK', 'CB_5201_ST', 'Protocol: IEC 104'] },
                { num: 4 as const, title: 'HMI / SCADA – Final', lines: ['HMI Tag: CB-33-F03', `Status: ${cbClosed ? 'CLOSED' : 'OPEN'}`, 'Timestamp Updated'] },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button type="button" onClick={() => setSeqStage(c.num)} style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: seqStage === c.num ? '1.5px solid #00DFFF' : '1px solid rgba(0,223,255,0.35)', background: seqStage === c.num ? '#0A2E4A' : '#051728', color: '#F1F8FF', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{c.num}. {c.title}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.35 }}>
                      {c.lines.map((l, li) => <div key={li}><span style={{ color: '#00FF66', marginRight: 4 }}>✔</span>{l}</div>)}
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
          .sas-t5-grid, .sas-t5-mid, .sas-t5-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test5SignalMappingVisualization;
