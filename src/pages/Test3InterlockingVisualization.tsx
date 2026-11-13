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
  Play,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface Test3InterlockingVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

type ActiveTab = 'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW';
type Authority = 'LOCAL' | 'REMOTE';
type CommandType = 'CLOSE' | 'OPEN';

interface SoeItem {
  id: number;
  time: string;
  event: string;
  kind: 'ok' | 'warn' | 'err';
}

function nowTime(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fullTs(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${nowTime(d)}`;
}

const TEST3_STEPS = [
  'Identify CILO/EnaCls conditions from the approved logic.',
  'Set all required permissives true and verify enable status.',
  'Make one disconnector/earth-switch condition invalid.',
  'Attempt simulated close and verify command blocked.',
  'Restore the interlock, then violate synch-check voltage difference.',
  'Repeat with frequency difference.',
  'Repeat with phase-angle difference.',
  'Verify RSYN result and CILO enable status each time.',
  'Restore normal test conditions and record results.',
];

export function Test3InterlockingVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test3InterlockingVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST3_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interlocking (CILO) & Synch-check (ANSI 25) simulation state
  const [authority, setAuthority] = useState<Authority>('REMOTE');
  const [command, setCommand] = useState<CommandType>('CLOSE');
  const [breakerClosed, setBreakerClosed] = useState<boolean>(true);
  const [ds89aClosed, setDs89aClosed] = useState<boolean>(true);
  const [ds89bClosed, setDs89bClosed] = useState<boolean>(true);
  const [ds89cOpen, setDs89cOpen] = useState<boolean>(true); // 89C Bypass DS must be OPEN in normal feeder config
  const [esOpen, setEsOpen] = useState<boolean>(true); // Earth Switch ES must be OPEN to close CB

  // ANSI 25 Synchrocheck simulated values (training example limits: ΔV <= 10%, Δf <= 0.2 Hz, Δφ <= 10°)
  const [deltaV, setDeltaV] = useState<number>(0.8);
  const [deltaF, setDeltaF] = useState<number>(0.01);
  const [deltaPhi, setDeltaPhi] = useState<number>(1.2);
  const [seqStage, setSeqStage] = useState<1 | 2 | 3 | 4>(1);
  const [lastRejection, setLastRejection] = useState<string | null>(null);
  const [ts, setTs] = useState<string>(() => fullTs());

  const [soe, setSoe] = useState<SoeItem[]>(() => [
    { id: 1, time: nowTime(), event: '89A Closed, 89B Closed, 89C Open, ES Open', kind: 'ok' },
    { id: 2, time: nowTime(), event: 'CILO.EnaCls = TRUE', kind: 'ok' },
    { id: 3, time: nowTime(), event: 'RSYN: In Sync (ΔV=0.8%, Δf=0.01 Hz, Δφ=1.2°)', kind: 'ok' },
    { id: 4, time: nowTime(), event: 'Close Command Permitted', kind: 'ok' },
  ]);

  useEffect(() => {
    if (initialDone) {
      setDone(Array.from({ length: TEST3_STEPS.length }, (_, i) => !!initialDone[i]));
    }
  }, [initialDone?.join('|')]);

  useEffect(() => {
    const t = window.setInterval(() => setTs(fullTs()), 1200);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const pushSoe = (event: string, kind: SoeItem['kind'] = 'ok') => {
    setSoe((prev) => [{ id: Date.now() + Math.random(), time: nowTime(), event, kind }, ...prev.slice(0, 7)]);
  };

  // Derived CILO & RSYN logic
  const ciloEnaCls = ds89aClosed && ds89bClosed && ds89cOpen && esOpen;
  const ciloEnaOpn = true;
  const vOk = deltaV <= 10;
  const fOk = deltaF <= 0.2;
  const phiOk = deltaPhi <= 10;
  const rsynInSync = vOk && fOk && phiOk;
  const rsynBlock = !rsynInSync;
  const closePermitted = authority === 'REMOTE' && ciloEnaCls && !rsynBlock;

  const handleOperate = () => {
    if (authority === 'LOCAL') {
      setLastRejection('Rejected: 43LR Authority is LOCAL.');
      pushSoe('CLOSE command rejected (LOCAL mode)', 'err');
      return;
    }
    if (command === 'CLOSE') {
      if (!ciloEnaCls) {
        setLastRejection('Blocked by CILO.EnaCls = FALSE (Disconnector/Earth Switch permissive invalid).');
        setSeqStage(2);
        pushSoe('CLOSE command BLOCKED by CILO interlock', 'err');
        return;
      }
      if (rsynBlock) {
        setLastRejection(
          `Blocked by RSYN.Block = TRUE (${!vOk ? 'ΔV > 10%' : !fOk ? 'Δf > 0.2 Hz' : 'Δφ > 10°'}).`
        );
        setSeqStage(3);
        pushSoe('CLOSE command BLOCKED by ANSI 25 Synch-check', 'err');
        return;
      }
      setLastRejection(null);
      setBreakerClosed(true);
      setSeqStage(4);
      pushSoe('CLOSE command ACCEPTED & Executed (CB-33-F03 CLOSED)', 'ok');
    } else {
      setLastRejection(null);
      setBreakerClosed(false);
      pushSoe('OPEN command Executed (CB-33-F03 OPEN)', 'ok');
    }
  };

  const handleRestoreNormal = () => {
    setAuthority('REMOTE');
    setCommand('CLOSE');
    setDs89aClosed(true);
    setDs89bClosed(true);
    setDs89cOpen(true);
    setEsOpen(true);
    setDeltaV(0.8);
    setDeltaF(0.01);
    setDeltaPhi(1.2);
    setBreakerClosed(true);
    setLastRejection(null);
    setSeqStage(1);
    pushSoe('Normal conditions restored (CILO=TRUE, RSYN=In Sync)', 'ok');
  };

  const handleStepSelect = (idx: number) => {
    setActiveStep(idx);
    if (idx === 0 || idx === 1) {
      handleRestoreNormal();
    } else if (idx === 2 || idx === 3) {
      setDs89aClosed(true);
      setDs89bClosed(true);
      setDs89cOpen(false);
      setEsOpen(true);
      setBreakerClosed(false);
      setSeqStage(2);
      setLastRejection('89C Bypass DS invalid → CILO.EnaCls = FALSE (CLOSE Blocked)');
      pushSoe('Interlock violation: 89C invalid → CILO.EnaCls = FALSE', 'err');
    } else if (idx === 4) {
      setDs89aClosed(true);
      setDs89bClosed(true);
      setDs89cOpen(true);
      setEsOpen(true);
      setDeltaV(12.5);
      setDeltaF(0.01);
      setDeltaPhi(1.2);
      setBreakerClosed(false);
      setSeqStage(3);
      setLastRejection('Synch-check ΔV = 12.5% (> 10%) → RSYN.Block = TRUE');
      pushSoe('ANSI 25 Voltage mismatch (ΔV = 12.5%) → CLOSE Blocked', 'warn');
    } else if (idx === 5) {
      setDs89cOpen(true);
      setDeltaV(0.8);
      setDeltaF(0.45);
      setDeltaPhi(1.2);
      setSeqStage(3);
      setLastRejection('Synch-check Δf = 0.45 Hz (> 0.2 Hz) → RSYN.Block = TRUE');
      pushSoe('ANSI 25 Frequency mismatch (Δf = 0.45 Hz) → CLOSE Blocked', 'warn');
    } else if (idx === 6) {
      setDeltaV(0.8);
      setDeltaF(0.01);
      setDeltaPhi(24.0);
      setSeqStage(3);
      setLastRejection('Synch-check Δφ = 24.0° (> 10°) → RSYN.Block = TRUE');
      pushSoe('ANSI 25 Phase-angle mismatch (Δφ = 24.0°) → CLOSE Blocked', 'warn');
    } else if (idx === 8) {
      handleRestoreNormal();
      setSeqStage(4);
    }
  };

  const handleToggleCheckbox = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setDone((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      onStepChange?.(idx, next[idx]);
      return next;
    });
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

  const cbColor = !ciloEnaCls || rsynBlock ? '#FF354F' : breakerClosed ? '#00FF59' : '#00E5FF';

  return (
    <div
      ref={containerRef}
      style={{
        background: 'radial-gradient(circle at 50% 0%, #092C48 0%, #061D30 45%, #020B16 100%)',
        color: '#F1F7FF',
        border: '1.5px solid #00CFFF',
        borderRadius: isFullscreen ? 0 : 12,
        boxShadow: '0 0 28px rgba(0, 207, 255, 0.22)',
        padding: isFullscreen ? '12px 16px' : '10px 14px',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        width: '100%',
        minHeight: isFullscreen ? '100vh' : undefined,
        boxSizing: 'border-box',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
        overflowY: isFullscreen ? 'auto' : 'visible',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          paddingBottom: 7,
          marginBottom: 8,
          borderBottom: '1px solid rgba(0, 207, 255, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span
            style={{
              width: 25,
              height: 25,
              borderRadius: '50%',
              background: '#06263E',
              border: '1.5px solid #00E5FF',
              display: 'grid',
              placeItems: 'center',
              color: '#FFC400',
              fontSize: 13,
            }}
          >
            ⚡
          </span>
          <button
            type="button"
            onClick={onBackToAllTests}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F1F7FF',
              fontWeight: 700,
              fontSize: 14.5,
              cursor: onBackToAllTests ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00E5FF', fontWeight: 800 }}>SLD &amp; OPERATION – TEST 3</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {onBackToAllTests && (
            <button
              type="button"
              onClick={onBackToAllTests}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #00E5FF',
                background: '#072238',
                color: '#D6F2FF',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} /> Back to All Tests
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #1E6E91',
              background: '#08283D',
              color: '#F1F7FF',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #1E6E91',
              background: '#08283D',
              color: '#F1F7FF',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const all = done.every(Boolean);
              const next = Array(TEST3_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              borderRadius: 6,
              border: '1.5px solid #00FF59',
              background: '#094E2B',
              color: '#F1F7FF',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0, 255, 89, 0.35)',
            }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF59' }} />
            {done.every(Boolean) ? 'Completed (9/9)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* TITLE & 5 TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 9,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(0, 207, 255, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1.5px solid #00E5FF',
              background: '#062238',
              display: 'grid',
              placeItems: 'center',
              color: '#00E5FF',
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            25
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              Interlocking and Synch-check (25)
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>
              Ensure unsafe switching is blocked and verify synchronism conditions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'PROCEDURE', label: 'Test Procedure', icon: ClipboardList },
              { id: 'VISUALIZATION', label: 'Visualization', icon: Monitor },
              { id: 'SIGNALS', label: 'IED Signals', icon: Activity },
              { id: 'HMI', label: 'HMI/SCADA', icon: Network },
              { id: 'INTERVIEW', label: 'Interview Focus', icon: GraduationCap },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: active ? '1.5px solid #80F5FF' : '1px solid #1C6588',
                  background: active
                    ? 'linear-gradient(180deg, #1CEBFF 0%, #00B8E6 100%)'
                    : '#08283D',
                  color: active ? '#011627' : '#D8F3FF',
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                }}
              >
                <Icon size={13.5} style={{ color: active ? '#011627' : '#00E5FF' }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN 2-COLUMN GRID */}
      <div
        className="sas-t3-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(265px, 24.5%) minmax(0, 1fr)',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {/* LEFT SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              <ClipboardList size={14} style={{ color: '#00E5FF' }} /> Before you start
            </div>
            <div style={{ padding: '7px 10px', display: 'grid', gap: 4, fontSize: 11.5 }}>
              {[
                'Approved interlocking logic diagram & permissive matrix',
                'Simulated voltage, frequency and phase-angle inputs',
              ].map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6.5, height: 6.5, borderRadius: '50%', background: '#00FF59', boxShadow: '0 0 7px #00FF59', flexShrink: 0 }} />
                  <span>{x}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ListChecks size={14} style={{ color: '#00E5FF' }} /> Step-by-step test process
              </span>
              <span style={{ fontSize: 10.5, color: '#00FF59' }}>{done.filter(Boolean).length}/9 Completed</span>
            </div>
            <div style={{ padding: '6px 7px', display: 'grid', gap: 3.5 }}>
              {TEST3_STEPS.map((text, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div
                    key={idx}
                    onClick={() => handleStepSelect(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 7px',
                      borderRadius: 5.5,
                      border: isSel ? '1.5px solid #00E5FF' : isDone ? '1px solid #00FF59' : '1px solid rgba(30,102,138,0.6)',
                      background: isSel ? 'rgba(0, 185, 220, 0.24)' : '#071B2E',
                      cursor: 'pointer',
                      fontSize: 11,
                      lineHeight: 1.28,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`Mark step ${idx + 1} complete`}
                      onClick={(e) => handleToggleCheckbox(e, idx)}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        border: isDone ? '1.5px solid #00FF59' : '1.5px solid #4A7A96',
                        background: isDone ? '#00FF59' : '#051525',
                        color: '#01200B',
                        fontWeight: 900,
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span>
                      <strong style={{ color: isDone ? '#00FF59' : '#00E5FF', marginRight: 4 }}>{idx + 1}.</strong>
                      {text}
                    </span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={text} testTitle="Interlocking and Synchronism Check" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF59', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', borderBottom: '1px solid rgba(0,255,89,0.35)', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              <CheckCircle2 size={14} style={{ color: '#00FF59' }} /> Expected result
            </div>
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#E2F8EC' }}>
              CLOSE commands are rejected when required interlocking or synchronization conditions are not satisfied.
            </div>
          </section>

          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              <GraduationCap size={14} style={{ color: '#00E5FF' }} /> Interview focus
            </div>
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#E2F4FF' }}>
              Differentiate electrical interlocking, mechanical interlocking, CILO permissives and ANSI 25 synch-check.
            </div>
          </section>
        </aside>

        {/* RIGHT MAIN AREA */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* ROW 1: Visualization – Interlocking & Synch-check (25) Operation */}
          <section style={{ background: '#061D30', border: '1.5px solid #00CFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,207,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Monitor size={15} style={{ color: '#00E5FF' }} />
                Visualization – Interlocking &amp; Synch-check (25) Operation
              </span>
              <span style={{ fontSize: 10.5, color: '#9CCBE4' }}>
                Step {activeStep + 1}/9 • {lastRejection ? <strong style={{ color: '#FF354F' }}>{lastRejection}</strong> : <strong style={{ color: '#00FF59' }}>All Permissives &amp; ANSI 25 Healthy</strong>}
              </span>
            </div>

            <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '175px 210px minmax(0, 1fr)', gap: 10, alignItems: 'center' }} className="sas-t3-top-viz">
              {/* A. SLD Bay 52 */}
              <div style={{ background: '#041423', border: '1px solid rgba(0,207,255,0.35)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, background: '#0A3352', borderRadius: 12, padding: '3px 8px', marginBottom: 4 }}>
                  Single Line Diagram – Bay 52
                </div>
                <svg viewBox="0 0 160 155" style={{ width: '100%', height: 148 }}>
                  <text x="80" y="14" textAnchor="middle" fill="#F1F7FF" fontSize="11" fontWeight="700">33 kV Bus</text>
                  <line x1="20" y1="22" x2="140" y2="22" stroke="#F1F7FF" strokeWidth="3" />
                  <line x1="80" y1="22" x2="80" y2="44" stroke="#F1F7FF" strokeWidth="2.2" />
                  {/* 89A Bus DS */}
                  <text x="35" y="42" fill={ds89aClosed ? '#00FF59' : '#FF354F'} fontSize="10" fontWeight="800">89A</text>
                  <circle cx="80" cy="44" r="3" fill={ds89aClosed ? '#00FF59' : '#FF354F'} />
                  {/* Breaker 52 */}
                  <rect x="64" y="54" width="32" height="32" rx="4" fill={breakerClosed ? 'rgba(0,255,89,0.25)' : 'rgba(255,53,79,0.28)'} stroke={cbColor} strokeWidth="2.8" />
                  <text x="80" y="75" textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="900">52</text>
                  {/* 89C Bypass */}
                  <text x="122" y="64" fill={ds89cOpen ? '#00FF59' : '#FF354F'} fontSize="10" fontWeight="800">89C</text>
                  <line x1="96" y1="70" x2="128" y2="70" stroke={ds89cOpen ? '#557A95' : '#FF354F'} strokeWidth="2" />
                  {/* ES Earth Switch */}
                  <text x="122" y="108" fill={esOpen ? '#00FF59' : '#FF354F'} fontSize="10" fontWeight="800">ES</text>
                  <line x1="80" y1="86" x2="80" y2="128" stroke="#F1F7FF" strokeWidth="2.2" />
                  <text x="35" y="106" fill={ds89bClosed ? '#00FF59' : '#FF354F'} fontSize="10" fontWeight="800">89B</text>
                  <polyline points="75,122 80,130 85,122" fill="none" stroke="#F1F7FF" strokeWidth="2.2" />
                  <text x="80" y="146" textAnchor="middle" fill="#F1F7FF" fontSize="10.5" fontWeight="700">To Feeder (CB-33-F03)</text>
                </svg>
              </div>

              {/* B & C. Permissives (CILO) + Synch-check (25) */}
              <div style={{ display: 'grid', gap: 7 }}>
                <div style={{ background: '#08283D', border: `1px solid ${ciloEnaCls ? '#00FF59' : '#FF354F'}`, borderRadius: 7, padding: '6px 8px', fontSize: 10.5 }}>
                  <div style={{ fontWeight: 800, color: '#00E5FF', marginBottom: 4 }}>Permissives (CILO)</div>
                  {[
                    { label: '89A (Bus DS)', ok: ds89aClosed, toggle: () => setDs89aClosed((v) => !v), state: ds89aClosed ? 'Closed' : 'Open' },
                    { label: '89B (Line DS)', ok: ds89bClosed, toggle: () => setDs89bClosed((v) => !v), state: ds89bClosed ? 'Closed' : 'Open' },
                    { label: '89C (Bypass DS)', ok: ds89cOpen, toggle: () => setDs89cOpen((v) => !v), state: ds89cOpen ? 'Open' : 'Closed!' },
                    { label: 'ES (Earth SW)', ok: esOpen, toggle: () => setEsOpen((v) => !v), state: esOpen ? 'Open' : 'Closed!' },
                  ].map((p) => (
                    <div key={p.label} onClick={p.toggle} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '1.5px 0' }}>
                      <span>
                        <strong style={{ color: p.ok ? '#00FF59' : '#FF354F', marginRight: 4 }}>{p.ok ? '✔' : '✖'}</strong>
                        {p.label}
                      </span>
                      <span style={{ color: p.ok ? '#00FF59' : '#FF354F', fontWeight: 700 }}>{p.state}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#08283D', border: `1px solid ${rsynInSync ? '#00FF59' : '#FFC400'}`, borderRadius: 7, padding: '6px 8px', fontSize: 10.5 }}>
                  <div style={{ fontWeight: 800, color: '#00E5FF', marginBottom: 3 }}>
                    Synch-check (25) <span style={{ fontSize: 9, color: '#9CCBE4' }}>(Training Ex.)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: vOk ? '#00FF59' : '#FF354F' }}>
                    <span>{vOk ? '✔' : '✖'} ΔV ≤ 10%</span>
                    <strong>({deltaV.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: fOk ? '#00FF59' : '#FF354F' }}>
                    <span>{fOk ? '✔' : '✖'} Δf ≤ 0.2 Hz</span>
                    <strong>({deltaF.toFixed(2)} Hz)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: phiOk ? '#00FF59' : '#FF354F' }}>
                    <span>{phiOk ? '✔' : '✖'} Δφ ≤ 10°</span>
                    <strong>({deltaPhi.toFixed(1)}°)</strong>
                  </div>
                </div>
              </div>

              {/* D, E, F. SIPROTEC 5 -> Station Gateway -> SCADA/HMI */}
              <div style={{ overflowX: 'auto' }}>
                <svg viewBox="0 0 510 165" style={{ width: '100%', minWidth: 440, height: 158 }}>
                  {/* Siemens SIPROTEC 5 */}
                  <RealisticSiprotec5
                    x={4}
                    y={6}
                    width={128}
                    height={128}
                    lcdLines={[
                      { text: `CILO: ${ciloEnaCls ? 'TRUE' : 'FALSE'}`, color: ciloEnaCls ? '#00FF59' : '#FF354F', bold: true },
                      { text: `RSYN: ${rsynBlock ? 'BLOCK' : 'OK'}`, color: rsynBlock ? '#FF354F' : '#00FF59', bold: true },
                      { text: `ΔV: ${deltaV.toFixed(1)}%`, color: '#F1F7FF' },
                      { text: `Δf: ${deltaF.toFixed(2)}Hz`, color: '#F1F7FF' },
                      { text: `Δφ: ${deltaPhi.toFixed(1)}°`, color: '#F1F7FF' },
                    ]}
                    label="IED – SIPROTEC 5"
                  />

                  {/* Link 1 */}
                  <line x1="134" y1="72" x2="188" y2="72" stroke={closePermitted ? '#00E5FF' : '#FF354F'} strokeWidth="3" />
                  <polygon points="184,66 194,72 184,78" fill={closePermitted ? '#00E5FF' : '#FF354F'} />
                  <circle r="4" fill={closePermitted ? '#00E5FF' : '#FF354F'}>
                    <animateMotion dur="1s" repeatCount="indefinite" path="M 136 72 L 188 72" />
                  </circle>

                  {/* Station Gateway */}
                  <RealisticGatewayOrSwitch
                    x={194}
                    y={18}
                    width={82}
                    height={102}
                    variant="GATEWAY"
                    healthy={closePermitted}
                    label="Station Gateway"
                    subLabel="(IEC 61850 MMS)"
                  />

                  {/* Link 2 */}
                  <line x1="274" y1="72" x2="322" y2="72" stroke={closePermitted ? '#00E5FF' : '#FF354F'} strokeWidth="3" />
                  <polygon points="318,66 328,72 318,78" fill={closePermitted ? '#00E5FF' : '#FF354F'} />
                  <circle r="4" fill={closePermitted ? '#00E5FF' : '#FF354F'}>
                    <animateMotion dur="0.9s" repeatCount="indefinite" path="M 276 72 L 322 72" />
                  </circle>

                  {/* SCADA / HMI Workstation */}
                  <g transform="translate(332, 12)">
                    <rect x="0" y="0" width="170" height="106" rx="6" fill="#5D7285" stroke="#00CFFF" strokeWidth="1.6" />
                    <rect x="5" y="5" width="160" height="92" rx="3" fill="#04111E" />
                    <rect x="6" y="6" width="158" height="13" fill="#0A2740" />
                    <text x="85" y="15.5" textAnchor="middle" fill="#D4EEFF" fontSize="8" fontWeight="800">SCADA / HMI</text>
                    <line x1="18" y1="30" x2="66" y2="30" stroke="#F1F7FF" strokeWidth="2" />
                    <line x1="42" y1="30" x2="42" y2="44" stroke="#F1F7FF" strokeWidth="1.6" />
                    <rect x="33" y="44" width="18" height="18" rx="2.5" fill={breakerClosed ? '#00FF59' : '#FF354F'} />
                    <text x="42" y="56.5" textAnchor="middle" fill="#FFF" fontSize="8.5" fontWeight="900">52</text>
                    <text x="74" y="40" fill={ciloEnaCls ? '#00FF59' : '#FF354F'} fontSize="8" fontWeight="800">
                      CILO: {ciloEnaCls ? 'ENABLED' : 'BLOCKED'}
                    </text>
                    <text x="74" y="55" fill={rsynInSync ? '#00FF59' : '#FFC400'} fontSize="8" fontWeight="800">
                      RSYN: {rsynInSync ? 'IN SYNC' : 'OUT SYNC'}
                    </text>
                    <text x="74" y="72" fill={closePermitted ? '#00FF59' : '#FF354F'} fontSize="8" fontWeight="900">
                      CLOSE: {closePermitted ? 'PERMITTED' : 'BLOCKED'}
                    </text>
                    <text x="85" y="126" textAnchor="middle" fill="#F1F7FF" fontSize="9.5" fontWeight="700">
                      SCADA / HMI
                    </text>
                    <text x="85" y="138" textAnchor="middle" fill="#9CCBE4" fontSize="8">(Operator Workstation)</text>
                  </g>
                </svg>
              </div>
            </div>
          </section>

          {/* ROW 2: 3-Column Grid */}
          <div className="sas-t3-mid" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.05fr) minmax(290px, 1.4fr) minmax(220px, 1fr)', gap: 8 }}>
            {/* Control Panel */}
            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800 }}>
                Interlocking &amp; Synch-check Control
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gap: 6, fontSize: 11 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 5, alignItems: 'center' }}>
                  <span style={{ color: '#9CCBE4' }}>Authority:</span>
                  {(['LOCAL', 'REMOTE'] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setAuthority(a)} style={{ padding: '4px', borderRadius: 4, border: authority === a ? '1.5px solid #00FF59' : '1px solid #29506D', background: authority === a ? 'rgba(0,255,89,0.2)' : '#071E32', color: '#F1F7FF', fontWeight: 800, cursor: 'pointer', fontSize: 10.5 }}>{a}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 5, alignItems: 'center' }}>
                  <span style={{ color: '#9CCBE4' }}>Command:</span>
                  {(['CLOSE', 'OPEN'] as const).map((c) => (
                    <button key={c} type="button" onClick={() => setCommand(c)} style={{ padding: '4px', borderRadius: 4, border: command === c ? `1.5px solid ${c === 'CLOSE' ? '#00FF59' : '#FF354F'}` : '1px solid #29506D', background: '#071E32', color: '#F1F7FF', fontWeight: 800, cursor: 'pointer', fontSize: 10.5 }}>{c}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  <button type="button" onClick={handleOperate} style={{ padding: '5px', borderRadius: 5, border: '1px solid #00FF59', background: 'rgba(0,255,89,0.18)', color: '#00FF59', fontWeight: 800, cursor: 'pointer', fontSize: 11 }}>
                    ▶ Operate ({command})
                  </button>
                  <button type="button" onClick={handleRestoreNormal} style={{ padding: '5px', borderRadius: 5, border: '1px solid #00CFFF', background: '#08283D', color: '#00E5FF', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                    ↺ Restore
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <button type="button" onClick={() => { setDs89cOpen(false); window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'MAJOR', id: 'TEST3-INTERLOCK', label: 'Test 3 interlock violation' } })); pushSoe('Injected 89C Interlock Violation', 'err'); }} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #FF354F', background: 'rgba(255,53,79,0.16)', color: '#FF7080', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Inject Interlock Fault</button>
                  <button type="button" onClick={() => { setDeltaV(13.2); window.dispatchEvent(new CustomEvent('sas:alarm-audio', { detail: { action: 'fault', severity: 'MINOR', id: 'TEST3-VOLTAGE', label: 'Test 3 voltage mismatch' } })); pushSoe('Injected ΔV = 13.2% Mismatch', 'warn'); }} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #FFC400', background: 'rgba(255,196,0,0.15)', color: '#FFC400', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>ΔV Mismatch</button>
                  <button type="button" onClick={() => { setDeltaF(0.45); pushSoe('Injected Δf = 0.45 Hz Mismatch', 'warn'); }} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #FFC400', background: 'rgba(255,196,0,0.15)', color: '#FFC400', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Δf Mismatch</button>
                  <button type="button" onClick={() => { setDeltaPhi(22); pushSoe('Injected Δφ = 22° Mismatch', 'warn'); }} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #FFC400', background: 'rgba(255,196,0,0.15)', color: '#FFC400', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Δφ Mismatch</button>
                </div>
              </div>
            </section>

            {/* Live Signal Monitoring */}
            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800 }}>
                Live Signal Monitoring (IEC 61850)
              </div>
              <div style={{ padding: '6px 8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                  <thead>
                    <tr style={{ background: '#08283D', color: '#9CCBE4', textAlign: 'left' }}>
                      <th style={{ padding: '4px 5px' }}>Parameter</th>
                      <th style={{ padding: '4px 5px' }}>Value</th>
                      <th style={{ padding: '4px 5px' }}>Quality</th>
                      <th style={{ padding: '4px 5px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { p: 'CILO.EnaCls', v: ciloEnaCls ? 'TRUE' : 'FALSE', ok: ciloEnaCls },
                      { p: 'CILO.EnaOpn', v: ciloEnaOpn ? 'TRUE' : 'FALSE', ok: true },
                      { p: 'RSYN.Block', v: rsynBlock ? 'TRUE' : 'FALSE', ok: !rsynBlock },
                      { p: 'RSYN.VoltDiff', v: `${deltaV.toFixed(1)} %`, ok: vOk },
                      { p: 'RSYN.FreqDiff', v: `${deltaF.toFixed(2)} Hz`, ok: fOk },
                      { p: 'RSYN.AngDiff', v: `${deltaPhi.toFixed(1)} °`, ok: phiOk },
                      { p: 'XCBR.Pos.stVal', v: breakerClosed ? 'CLOSED (2)' : 'OPEN (1)', ok: breakerClosed },
                    ].map((r) => (
                      <tr key={r.p} style={{ borderTop: '1px solid rgba(25,85,118,0.45)' }}>
                        <td style={{ padding: '3.5px 5px', fontWeight: 700 }}>{r.p}</td>
                        <td style={{ padding: '3.5px 5px', fontWeight: 800, color: r.ok ? '#00FF59' : '#FF354F' }}>{r.v}</td>
                        <td style={{ padding: '3.5px 5px', color: '#00FF59' }}>✔ Good</td>
                        <td style={{ padding: '3.5px 5px', color: '#9CCBE4', fontFamily: 'monospace', fontSize: 9.5 }}>{ts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SOE */}
            <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800 }}>
                SOE (Sequence Of Events)
              </div>
              <div style={{ padding: '6px 8px', maxHeight: 155, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                  <tbody>
                    {soe.map((s) => (
                      <tr key={s.id} style={{ borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                        <td style={{ padding: '3.5px 5px', fontFamily: 'monospace', color: '#9CCBE4', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 5, background: s.kind === 'err' ? '#FF354F' : s.kind === 'warn' ? '#FFC400' : '#00FF59' }} />
                          {s.time}
                        </td>
                        <td style={{ padding: '3.5px 5px' }}>{s.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ROW 3: 4-Stage Operation Sequence */}
          <section style={{ background: '#061D30', border: '1px solid #00CFFF', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,207,255,0.3)', fontSize: 12.5, fontWeight: 800 }}>
              Operation Sequence – Interlocking &amp; Synch-check (25)
            </div>
            <div className="sas-t3-seq" style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
              {[
                { num: 1 as const, title: 'Initial State – Permissives OK', ok: true, lines: ['All DS & ES valid', 'CILO.EnaCls = TRUE', 'RSYN.Block = FALSE', 'XCBR.Pos.stVal = CLOSED (2)'] },
                { num: 2 as const, title: 'Interlock Violation', ok: false, lines: ['89C Closed (Invalid)', 'CILO.EnaCls = FALSE', 'Close Command BLOCKED', 'Breaker Unchanged'] },
                { num: 3 as const, title: 'Synch-check Violation', ok: false, lines: ['Permissives = TRUE', 'ΔV = 12.5% (> 10%)', 'RSYN.Block = TRUE', 'Close Command BLOCKED'] },
                { num: 4 as const, title: 'Restore – Close Permitted', ok: true, lines: ['Interlocks = OK', 'ΔV=0.8%, Δf=0.01 Hz', 'Δφ = 1.2° (In Sync)', 'Close Command EXECUTED'] },
              ].map((c, idx) => (
                <React.Fragment key={c.num}>
                  <button
                    type="button"
                    onClick={() => {
                      setSeqStage(c.num);
                      if (c.num === 1 || c.num === 4) handleRestoreNormal();
                      else if (c.num === 2) handleStepSelect(2);
                      else handleStepSelect(4);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: 7,
                      border: seqStage === c.num ? '1.5px solid #00E5FF' : '1px solid rgba(0,207,255,0.35)',
                      background: seqStage === c.num ? '#0A2E4A' : '#051728',
                      color: '#F1F7FF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#00E5FF', color: '#011826', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 900 }}>{c.num}</span>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 10, lineHeight: 1.35 }}>
                      {c.lines.map((l, li) => (
                        <div key={li}>
                          <span style={{ color: c.ok ? '#00FF59' : '#FF354F', fontWeight: 900, marginRight: 4 }}>{c.ok ? '✔' : '✖'}</span>
                          {l}
                        </div>
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
          .sas-t3-grid, .sas-t3-top-viz, .sas-t3-mid, .sas-t3-seq { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test3InterlockingVisualization;
