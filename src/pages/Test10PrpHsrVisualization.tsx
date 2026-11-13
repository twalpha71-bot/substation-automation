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
} from 'lucide-react';
import { RealisticSiprotec5, RealisticGatewayOrSwitch } from '../components/RealisticDevices';

interface Test10PrpHsrVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
  onClose?: () => void;
}

const TEST10_STEPS = [
  'Document network topology and baseline latency/packet loss.',
  'Verify both PRP LANs or HSR ring connections.',
  'Confirm duplicate handling or ring supervision diagnostics.',
  'Disable one approved link in the test environment.',
  'Observe MMS/GOOSE continuity and alarms.',
  'Record recovery behavior and packet capture.',
  'Restore link and verify redundant healthy state.',
  'Repeat only for other approved failure scenarios.',
];

export function Test10PrpHsrVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
  onClose,
}: Test10PrpHsrVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'PRP' | 'HSR'>('PRP');
  const [lanAUp, setLanAUp] = useState<boolean>(true);
  const [lanBUp, setLanBUp] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST10_STEPS.length }, (_, i) => !!initialDone?.[i])
  );

  useEffect(() => {
    if (initialDone) {
      setDone(Array.from({ length: TEST10_STEPS.length }, (_, i) => !!initialDone[i]));
    }
  }, [initialDone?.join('|')]);

  const handleBack = onBackToAllTests || onClose;
  const commHealthy = lanAUp || lanBUp;

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
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,207,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <Network size={18} style={{ color: '#00E5FF' }} />
          <button type="button" onClick={handleBack} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: handleBack ? 'pointer' : 'default', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00E5FF', fontWeight: 800 }}>COMMUNICATION – TEST 10</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {handleBack && (
            <button type="button" onClick={handleBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #00E5FF', background: '#072238', color: '#D6F2FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
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
              const next = Array(TEST10_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF59', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF59' }} /> {done.every(Boolean) ? 'Completed (8/8)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>PRP / HSR Redundancy Failover (IEC 62439-3)</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Confirm seamless 0 ms MMS/GOOSE communication across Dual-LAN PRP or HSR Ring under single-link failure.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['PRP', 'HSR'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{ padding: '6px 14px', borderRadius: 7, border: mode === m ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: mode === m ? '#1CEBFF' : '#08283D', color: mode === m ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {m === 'PRP' ? 'PRP Dual-LAN (Cl.4)' : 'HSR Ring 0x892F (Cl.5)'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t10-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 26%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00E5FF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF59' }}>●</span> Approved PRP LAN A/B or HSR ring topology</div>
            <div><span style={{ color: '#00FF59' }}>●</span> Controlled network test window</div>
          </section>

          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00E5FF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF59', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 4 }}>
              {TEST10_STEPS.map((txt, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div onClick={() => setActiveStep(idx)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, border: isSel ? '1.5px solid #00E5FF' : '1px solid rgba(30,102,138,0.6)', background: isSel ? 'rgba(0,185,220,0.24)' : '#071B2E', cursor: 'pointer', fontSize: 11 }}>
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
                  {isSel && (
                    <div style={{ margin: '3px 1px 7px 6px', padding: 9, border: '1px solid #00CFFF', borderRadius: 7, background: '#04182B', fontSize: 11.5, lineHeight: 1.55 }}>
                      <strong style={{ color: '#00E5FF' }}>Step {idx + 1}: {txt}</strong>
                      <p style={{ marginTop: 5, color: '#DCEAF5' }}>{[
                        'Identify PRP LAN A/LAN B or HSR ring nodes, record healthy ports, baseline packet loss and latency.',
                        'Trace each physical fiber/copper link and verify port status, correct wiring, and the configured topology.',
                        'Inspect PRP duplicate discard counters or HSR supervision frames and ring health before injecting a fault.',
                        'In the isolated training network, disable one approved link using the LAN or ring-port control on the right.',
                        'Check whether MMS reports and GOOSE traffic continue through the remaining healthy path; observe any alarm.',
                        'Capture event timestamps, port state, packet loss, recovery behavior and Wireshark evidence for the test record.',
                        'Restore the failed link, confirm both paths healthy, and verify alarms clear without duplicate application events.',
                        'Repeat only the failure scenarios authorized in the FAT/SAT procedure; document the result and restore baseline.',
                      ][idx]}</p>
                      <div style={{ color: '#00FF59', marginTop: 5 }}>✓ Verify network status and record evidence before completing this step.</div>
                    </div>
                  )}
                </React.Fragment>
                );
              })}
            </div>
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <section style={{ background: '#061D30', border: '1.5px solid #00CFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(0,207,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00E5FF' }} /> {mode} Redundancy Failover Simulation
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setLanAUp((v) => !v)} style={{ padding: '4px 10px', borderRadius: 5, border: lanAUp ? '1px solid #00FF59' : '1px solid #FF354F', background: '#08283D', color: lanAUp ? '#00FF59' : '#FF7080', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {mode === 'PRP' ? 'LAN A' : 'Ring Port A'}: {lanAUp ? 'UP' : 'FAULTED'}
                </button>
                <button type="button" onClick={() => setLanBUp((v) => !v)} style={{ padding: '4px 10px', borderRadius: 5, border: lanBUp ? '1px solid #00FF59' : '1px solid #FF354F', background: '#08283D', color: lanBUp ? '#00FF59' : '#FF7080', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {mode === 'PRP' ? 'LAN B' : 'Ring Port B'}: {lanBUp ? 'UP' : 'FAULTED'}
                </button>
                <button type="button" onClick={() => { setLanAUp(true); setLanBUp(true); }} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #00E5FF', background: '#08283D', color: '#00E5FF', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={12} /> Restore Both
                </button>
              </div>
            </div>

            <div style={{ padding: '12px', overflowX: 'auto' }}>
              <svg viewBox="0 0 820 220" style={{ width: '100%', minWidth: 640, height: 215 }}>
                <RealisticSiprotec5
                  x={24}
                  y={32}
                  width={140}
                  height={138}
                  lcdLines={[
                    { text: `${mode} DANP Node`, color: '#9CCBE4' },
                    { text: `LAN A: ${lanAUp ? 'UP' : 'DOWN'}`, color: lanAUp ? '#00FF59' : '#FF354F', bold: true },
                    { text: `LAN B: ${lanBUp ? 'UP' : 'DOWN'}`, color: lanBUp ? '#00FF59' : '#FF354F', bold: true },
                    { text: `Recovery: ${commHealthy ? '0 ms' : 'LOST'}`, color: commHealthy ? '#00E5FF' : '#FF354F', bold: true },
                  ]}
                  label="DANP Protection IED"
                />

                {/* Upper Path (LAN A) */}
                <line x1="168" y1="70" x2="335" y2="55" stroke={lanAUp ? '#00FF59' : '#FF354F'} strokeWidth="3" strokeDasharray={lanAUp ? undefined : '6 4'} />
                {lanAUp && <circle r="4.5" fill="#00FF59"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 168 70 L 335 55" /></circle>}
                <RealisticGatewayOrSwitch x={340} y={14} width={115} height={82} variant="SWITCH" healthy={lanAUp} label={mode === 'PRP' ? 'LAN A Switch' : 'HSR Node A'} subLabel="" />
                <line x1="458" y1="55" x2="625" y2="75" stroke={lanAUp ? '#00FF59' : '#FF354F'} strokeWidth="3" strokeDasharray={lanAUp ? undefined : '6 4'} />
                {lanAUp && <circle r="4.5" fill="#00FF59"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 458 55 L 625 75" /></circle>}

                {/* Lower Path (LAN B) */}
                <line x1="168" y1="130" x2="335" y2="155" stroke={lanBUp ? '#00E5FF' : '#FF354F'} strokeWidth="3" strokeDasharray={lanBUp ? undefined : '6 4'} />
                {lanBUp && <circle r="4.5" fill="#00E5FF"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 168 130 L 335 155" /></circle>}
                <RealisticGatewayOrSwitch x={340} y={114} width={115} height={82} variant="SWITCH" healthy={lanBUp} label={mode === 'PRP' ? 'LAN B Switch' : 'HSR Node B'} subLabel="" />
                <line x1="458" y1="155" x2="625" y2="125" stroke={lanBUp ? '#00E5FF' : '#FF354F'} strokeWidth="3" strokeDasharray={lanBUp ? undefined : '6 4'} />
                {lanBUp && <circle r="4.5" fill="#00E5FF"><animateMotion dur="0.9s" repeatCount="indefinite" path="M 458 155 L 625 125" /></circle>}

                {/* SCADA / RedBox Receiver */}
                <RealisticGatewayOrSwitch x={630} y={48} width={140} height={110} variant="GATEWAY" healthy={commHealthy} label="RedBox / SCADA" subLabel={commHealthy ? '0 ms Bumpless' : 'Comm Lost'} />
              </svg>
            </div>
          </section>

          <section style={{ background: '#052920', border: `1.5px solid ${commHealthy ? '#00FF59' : '#FF354F'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
            <strong>Expected result:</strong>{' '}
            {commHealthy
              ? 'MMS & GOOSE traffic continues with 0 ms recovery time even when one redundant LAN/Ring path is faulted.'
              : 'Both redundant paths are disconnected — communication loss alarm active.'}
          </section>
        </main>
      </div>

      <style>{`@media (max-width: 1100px) { .sas-t10-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export default Test10PrpHsrVisualization;
