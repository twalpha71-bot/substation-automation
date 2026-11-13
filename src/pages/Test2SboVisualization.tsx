import { GuidanceStepDetail } from './GuidanceStepDetail';
import React, { useEffect, useRef, useState } from 'react';
import { RealisticSiprotec5, RealisticGatewayOrSwitch } from '../components/RealisticDevices';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  GraduationCap,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Network,
  Play,
  Power,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface Test2SboVisualizationProps {
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

type AuthorityMode = 'REMOTE' | 'LOCAL';
type TargetCmd = 'OPEN' | 'CLOSE';
type SboStage = 'IDLE' | 'SELECTED' | 'OPERATING' | 'COMPLETED' | 'REJECTED' | 'TIMEOUT';
type ActiveTab = 'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW';

interface SoeEntry {
  id: number;
  time: string;
  event: string;
  kind: 'info' | 'success' | 'warn' | 'error';
}

function fmtTime(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtFullTs(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const TEST2_STEPS = [
  'Confirm correct bay and current breaker state.',
  'Verify Local/Remote authority and all permissives.',
  'Attempt remote command in Local mode and confirm rejection.',
  'Switch to approved Remote test mode.',
  'Issue SBO Select for intended OPEN/CLOSE action.',
  'Check Select acknowledgement and select timeout.',
  'Issue Operate within the select window.',
  'Verify breaker response, 52a/52b, command termination and SOE.',
  'Test rejected command with a blocked permissive.',
  'Restore authority and original breaker state.',
];

const STEP_META: {
  title: string;
  focus: 'SLD' | 'AUTH' | 'IED' | 'GATEWAY' | 'HMI' | 'SBO';
  detail: string;
  expected: string;
  interview: string;
}[] = [
  {
    title: 'Step 1: Confirm Bay 52 & Initial CLOSED State',
    focus: 'SLD',
    detail:
      'Verify feeder Bay 52 (CB-33-F03) on the 33 kV Bus is in the initial CLOSED state (XCBR.Pos.stVal = 2, 52a = ON, 52b = OFF).',
    expected: 'SLD, IED LCD, and SCADA/HMI all agree on CB-33-F03 CLOSED.',
    interview: 'Always confirm bay identity and initial apparatus state before any switching test.',
  },
  {
    title: 'Step 2: Verify Local/Remote Authority & CILO Permissives',
    focus: 'AUTH',
    detail:
      'Check 43LR Local/Remote selector status (CSWI.Pos) and verify CILO.EnaOpn / CILO.EnaCls permissives are TRUE.',
    expected: 'Authority and interlock permissives match approved bay logic.',
    interview: '43LR prevents simultaneous local panel and remote SCADA control.',
  },
  {
    title: 'Step 3: Attempt Remote Command in LOCAL Mode (Rejection)',
    focus: 'AUTH',
    detail:
      'Switch Authority to LOCAL and issue a remote SBO Select. The IED CSWI must reject the command with AddCause: Blocked-by-mode.',
    expected: 'Red pulse indicates command rejection; breaker remains unchanged.',
    interview: 'In LOCAL mode, remote MMS SBO commands from SCADA are blocked at the IED.',
  },
  {
    title: 'Step 4: Switch to Approved REMOTE Test Mode',
    focus: 'AUTH',
    detail:
      'Return 43LR Authority to REMOTE so the Siemens SIPROTEC 5 IED accepts IEC 61850 MMS SBOw requests from the Station Gateway.',
    expected: 'Authority block turns green (REMOTE ✓) and CSWI.Pos reports remote (2).',
    interview: 'CSWI.Loc = FALSE indicates Remote control authority is active.',
  },
  {
    title: 'Step 5: Issue SBO Select for Intended OPEN/CLOSE Action',
    focus: 'SBO',
    detail:
      'Send Select-With-Value (SBOw) from Command Control. Yellow/cyan MMS command packets travel SCADA → Gateway → SIPROTEC 5.',
    expected: 'IED reserves control object, sets SBO.StSel = SELECTED, and starts 30 s timer.',
    interview: 'SBO prevents accidental single-action switching by requiring Select then Operate.',
  },
  {
    title: 'Step 6: Check Select Acknowledgement & Select Timeout (30 s)',
    focus: 'IED',
    detail:
      'Verify SelectResponse+ acknowledgement and observe the 30-second sboTimeout countdown. If Operate is not sent in time, selection expires.',
    expected: 'Selection automatically cancels upon timeout without operating the breaker.',
    interview: 'sboTimeout ensures a stale selection cannot be operated later unexpectedly.',
  },
  {
    title: 'Step 7: Issue Operate Within the Select Window',
    focus: 'SBO',
    detail:
      'Click Operate while SBO.StSel = SELECTED. Green command pulses propagate SCADA → Gateway → SIPROTEC 5 → Bay 52 Breaker.',
    expected: 'Breaker transitions cleanly (CLOSED → OPEN or OPEN → CLOSED).',
    interview: 'Operate is accepted only when ctlVal matches the selected action within the timer.',
  },
  {
    title: 'Step 8: Verify 52a/52b Feedback, Command Termination & SOE',
    focus: 'HMI',
    detail:
      'Trace status feedback Breaker → IED → Gateway → SCADA/HMI. Confirm 52a/52b complement, CommandTermination+, and 1 ms SOE log.',
    expected: 'SOE records Select, Operate, XCBR change, 52a/52b update, and Command Terminated.',
    interview: 'Enhanced security SBO provides CommandTermination+ after physical 52a/52b confirm.',
  },
  {
    title: 'Step 9: Test Rejected Command with Blocked Permissive',
    focus: 'IED',
    detail:
      'Block CILO permissive (e.g. Q8 Earth Switch closed) and attempt SBO Select/Operate. Verify IED blocks the unsafe switching request.',
    expected: 'CILO.EnaOpn / EnaCls = FALSE blocks command and logs Interlock Rejection in SOE.',
    interview: 'CILO interlocking is evaluated at the IED before energizing the trip/close coil.',
  },
  {
    title: 'Step 10: Restore Authority & Original CLOSED Breaker State',
    focus: 'SLD',
    detail:
      'Clear any blocked permissives, restore REMOTE authority, and return CB-33-F03 to its initial CLOSED state (XCBR.Pos.stVal = 2).',
    expected: 'Bay 52 restored to CLOSED (Green) with clean SOE and zero active overrides.',
    interview: 'Always restore normal operating state and remove test blocks before handover.',
  },
];

export function Test2SboVisualization({
  initialDone,
  onStepChange,
  onBackToAllTests,
}: Test2SboVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: 10 }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Simulated SBO & Equipment State
  const [breakerClosed, setBreakerClosed] = useState<boolean>(true);
  const [authority, setAuthority] = useState<AuthorityMode>('REMOTE');
  const [selectedCmd, setSelectedCmd] = useState<TargetCmd>('OPEN');
  const [sboStage, setSboStage] = useState<SboStage>('SELECTED');
  const [permissiveOk, setPermissiveOk] = useState<boolean>(true);
  const [timerSec, setTimerSec] = useState<number>(30);
  const [opSeqStage, setOpSeqStage] = useState<1 | 2 | 3 | 4>(2);
  const [packetDir, setPacketDir] = useState<'NONE' | 'CMD_OK' | 'CMD_REJECT' | 'FEEDBACK'>(
    'FEEDBACK'
  );
  const [liveTs, setLiveTs] = useState<string>(() => fmtFullTs(new Date()));

  const [soeLog, setSoeLog] = useState<SoeEntry[]>(() => {
    const now = new Date();
    const t = (offsetSec: number) => fmtTime(new Date(now.getTime() - offsetSec * 1000));
    return [
      { id: 1, time: t(4), event: 'SBO Select: OPEN', kind: 'info' },
      { id: 2, time: t(3), event: 'SBO Select accepted (Timer 30s)', kind: 'success' },
      { id: 3, time: t(2), event: 'Remote authority enabled', kind: 'info' },
      { id: 4, time: t(1), event: 'XCBR.Pos.stVal = 2 (CLOSED)', kind: 'success' },
      { id: 5, time: t(0), event: '52a: ON, 52b: OFF', kind: 'info' },
    ];
  });

  useEffect(() => {
    if (initialDone) {
      setDone(Array.from({ length: 10 }, (_, i) => !!initialDone[i]));
    }
  }, [initialDone?.join('|')]);

  // Live clock & SBO 30-second timeout countdown
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setLiveTs(fmtFullTs(now));

      setTimerSec((prev) => {
        if (sboStage !== 'SELECTED') return prev;
        if (prev <= 1) {
          setSboStage('TIMEOUT');
          setPacketDir('CMD_REJECT');
          setSoeLog((log) => [
            {
              id: Date.now(),
              time: fmtTime(now),
              event: 'SBO Select Timeout (30s expired)',
              kind: 'warn',
            },
            ...log.slice(0, 7),
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sboStage]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const pushSoe = (event: string, kind: SoeEntry['kind'] = 'info') => {
    setSoeLog((prev) => [
      { id: Date.now() + Math.random(), time: fmtTime(new Date()), event, kind },
      ...prev.slice(0, 7),
    ]);
  };

  const handleSetAuthority = (nextAuth: AuthorityMode) => {
    setAuthority(nextAuth);
    if (nextAuth === 'LOCAL' && sboStage === 'SELECTED') {
      setSboStage('IDLE');
    }
    pushSoe(
      nextAuth === 'REMOTE' ? 'Remote authority enabled (CSWI.Loc=FALSE)' : 'Local authority enabled (SCADA blocked)',
      nextAuth === 'REMOTE' ? 'success' : 'warn'
    );
  };

  const handleSboSelect = (cmdOverride?: TargetCmd) => {
    const cmd = cmdOverride || selectedCmd;
    setSelectedCmd(cmd);

    if (authority === 'LOCAL') {
      setSboStage('REJECTED');
      setPacketDir('CMD_REJECT');
      pushSoe(`SBO Select: ${cmd} REJECTED (LOCAL mode)`, 'error');
      return;
    }
    if (!permissiveOk) {
      setSboStage('REJECTED');
      setPacketDir('CMD_REJECT');
      pushSoe(`SBO Select: ${cmd} REJECTED (CILO Interlock)`, 'error');
      return;
    }

    setSboStage('SELECTED');
    setTimerSec(30);
    setPacketDir('CMD_OK');
    if (cmd === 'OPEN') setOpSeqStage(2);
    pushSoe(`SBO Select: ${cmd} accepted (30s timer)`, 'success');
  };

  const handleSboOperate = () => {
    if (sboStage !== 'SELECTED') return;
    if (authority === 'LOCAL' || !permissiveOk) {
      setSboStage('REJECTED');
      setPacketDir('CMD_REJECT');
      pushSoe('SBO Operate REJECTED (Authority / Permissive)', 'error');
      return;
    }

    const nextClosed = selectedCmd === 'CLOSE';
    setSboStage('COMPLETED');
    setPacketDir('CMD_OK');
    setBreakerClosed(nextClosed);
    setOpSeqStage(nextClosed ? 4 : 3);
    pushSoe(`SBO Operate: ${selectedCmd}`, 'info');
    pushSoe(`XCBR: ${nextClosed ? 'CLOSED (2)' : 'OPEN (1)'}`, 'success');
    pushSoe(nextClosed ? '52a: ON, 52b: OFF' : '52b: ON, 52a: OFF', 'info');
    pushSoe('Command Terminated+', 'success');

    window.setTimeout(() => {
      setPacketDir('FEEDBACK');
    }, 1100);
  };

  const handleSboCancel = () => {
    if (sboStage === 'SELECTED' || sboStage === 'TIMEOUT' || sboStage === 'REJECTED') {
      setSboStage('IDLE');
      setTimerSec(30);
      setPacketDir('FEEDBACK');
      pushSoe('SBO Selection Cancelled', 'warn');
    }
  };

  const handleStepClick = (idx: number) => {
    setActiveStep(idx);
    setDone((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      onStepChange?.(idx, next[idx]);
      return next;
    });

    // Step-specific visualization focus & live state demonstration
    if (idx === 0) {
      setAuthority('REMOTE');
      setPermissiveOk(true);
      setBreakerClosed(true);
      setSboStage('IDLE');
      setOpSeqStage(1);
      setPacketDir('FEEDBACK');
    } else if (idx === 1) {
      setAuthority('REMOTE');
      setPermissiveOk(true);
      setPacketDir('FEEDBACK');
    } else if (idx === 2) {
      setAuthority('LOCAL');
      setSboStage('REJECTED');
      setPacketDir('CMD_REJECT');
      pushSoe('Step 3: Remote command rejected in LOCAL mode', 'error');
    } else if (idx === 3) {
      setAuthority('REMOTE');
      setSboStage('IDLE');
      setPacketDir('FEEDBACK');
      pushSoe('Step 4: Switched to REMOTE test mode', 'success');
    } else if (idx === 4) {
      setAuthority('REMOTE');
      setPermissiveOk(true);
      setSelectedCmd('OPEN');
      setSboStage('SELECTED');
      setTimerSec(30);
      setOpSeqStage(2);
      setPacketDir('CMD_OK');
      pushSoe('Step 5: SBO Select OPEN acknowledged', 'success');
    } else if (idx === 5) {
      setAuthority('REMOTE');
      setSboStage('SELECTED');
      setTimerSec(18);
      setOpSeqStage(2);
      setPacketDir('CMD_OK');
    } else if (idx === 6) {
      setAuthority('REMOTE');
      setPermissiveOk(true);
      setSelectedCmd('OPEN');
      setBreakerClosed(false);
      setSboStage('COMPLETED');
      setOpSeqStage(3);
      setPacketDir('CMD_OK');
      pushSoe('Step 7: SBO Operate OPEN executed', 'success');
    } else if (idx === 7) {
      setBreakerClosed(false);
      setOpSeqStage(3);
      setPacketDir('FEEDBACK');
    } else if (idx === 8) {
      setAuthority('REMOTE');
      setPermissiveOk(false);
      setSboStage('REJECTED');
      setPacketDir('CMD_REJECT');
      pushSoe('Step 9: Command blocked by CILO permissive', 'error');
    } else if (idx === 9) {
      setAuthority('REMOTE');
      setPermissiveOk(true);
      setBreakerClosed(true);
      setSelectedCmd('CLOSE');
      setSboStage('COMPLETED');
      setOpSeqStage(4);
      setPacketDir('FEEDBACK');
      pushSoe('Step 10: Restored REMOTE & CB-33-F03 CLOSED', 'success');
    }
  };

  const handleToggleFullscreen = async () => {
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

  const handleMarkAllComplete = () => {
    const all = done.every(Boolean);
    const next = Array(10).fill(!all);
    setDone(next);
    next.forEach((v, i) => onStepChange?.(i, v));
  };

  const breakerColor = breakerClosed ? '#00FF65' : '#FF4055';
  const stepMeta = STEP_META[activeStep];
  const linkColor =
    packetDir === 'CMD_REJECT'
      ? '#FF4055'
      : sboStage === 'SELECTED'
      ? '#FFD23F'
      : packetDir === 'CMD_OK'
      ? '#00FF65'
      : '#00DFFF';

  return (
    <div
      ref={containerRef}
      style={{
        background:
          'radial-gradient(circle at 50% 0%, #092C48 0%, #041526 48%, #03101F 100%)',
        color: '#F2F8FF',
        border: '1.5px solid #00DFFF',
        borderRadius: isFullscreen ? 0 : 12,
        boxShadow: '0 0 28px rgba(0, 223, 255, 0.22)',
        padding: isFullscreen ? '12px 16px' : '10px 14px',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        width: '100%',
        minHeight: isFullscreen ? '100vh' : undefined,
        boxSizing: 'border-box',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
        overflowY: isFullscreen ? 'auto' : 'visible',
        overflowX: 'hidden',
      }}
    >
      {/* 1. TOP HEADER */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          paddingBottom: 7,
          marginBottom: 8,
          borderBottom: '1px solid rgba(0, 223, 255, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#06263E',
              border: '1.5px solid #00DFFF',
              display: 'grid',
              placeItems: 'center',
              color: '#FFD23F',
              fontSize: 13,
            }}
          >
            ⚡
          </div>
          <button
            type="button"
            onClick={onBackToAllTests}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F2F8FF',
              fontWeight: 700,
              fontSize: 14.5,
              cursor: onBackToAllTests ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>
            SLD &amp; OPERATION – TEST 2
          </span>
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
                border: '1px solid #00DFFF',
                background: 'linear-gradient(180deg, #0E3D60 0%, #072238 100%)',
                color: '#D6F2FF',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} style={{ color: '#00DFFF' }} />
              Back to All Tests
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #1E6E91',
              background: 'linear-gradient(180deg, #0B2D48 0%, #061A2C 100%)',
              color: '#F2F8FF',
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
              background: 'linear-gradient(180deg, #0B2D48 0%, #061A2C 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleMarkAllComplete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              borderRadius: 6,
              border: '1.5px solid #00FF65',
              background: 'linear-gradient(180deg, #0B6E3B 0%, #064224 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 255, 101, 0.35)',
            }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF65' }} />
            {done.every(Boolean) ? 'Completed (10/10)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* 2. TITLE & 5 TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 9,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(0, 223, 255, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1.5px solid #00DFFF',
              background: '#062238',
              display: 'grid',
              placeItems: 'center',
              color: '#00DFFF',
              boxShadow: '0 0 10px rgba(0, 223, 255, 0.35)',
            }}
          >
            <Network size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              Local / Remote and SBO Command
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A8CBE0' }}>
              Validate select-before-operate, command authority and feedback.
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
                    : 'linear-gradient(180deg, #09263E 0%, #051728 100%)',
                  color: active ? '#011627' : '#D8F3FF',
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 14px rgba(0, 223, 255, 0.5)' : 'none',
                }}
              >
                <Icon size={13.5} style={{ color: active ? '#011627' : '#00DFFF' }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN DASHBOARD GRID (Left ~25.5%, Right ~74.5%) */}
      <div
        className="sas-t2-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(265px, 25.5%) minmax(0, 1fr)',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {/* LEFT SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Before you start */}
          <section
            style={{
              background: '#061B2B',
              border: '1px solid #00DFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 10px',
                borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 223, 255, 0.14), transparent)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <ClipboardList size={14} style={{ color: '#00DFFF' }} />
              Before you start
            </div>
            <div style={{ padding: '7px 10px', display: 'grid', gap: 4, fontSize: 11.5 }}>
              {[
                'Approved switching permit and test mode',
                'Interlock checklist and safe apparatus state',
              ].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 6.5,
                      height: 6.5,
                      borderRadius: '50%',
                      background: '#00FF65',
                      boxShadow: '0 0 8px #00FF65',
                      flexShrink: 0,
                    }}
                  />
                  <span>{txt}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 10-Step Process */}
          <section
            style={{
              background: '#061B2B',
              border: '1px solid #00DFFF',
              borderRadius: 8,
              overflow: 'hidden',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 223, 255, 0.14), transparent)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ListChecks size={14} style={{ color: '#00DFFF' }} />
                Step-by-step test process
              </span>
              <span style={{ fontSize: 10.5, color: '#00FF65', fontWeight: 700 }}>
                {done.filter(Boolean).length}/10
              </span>
            </div>

            <div style={{ padding: '6px 7px', display: 'grid', gap: 3.5 }}>
              {TEST2_STEPS.map((text, idx) => {
                const isChecked = done[idx];
                const isSelected = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div
                    key={idx}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => handleStepClick(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStepClick(idx);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '4.5px 7px',
                      borderRadius: 5.5,
                      border: isSelected
                        ? '1.5px solid #00DFFF'
                        : isChecked
                        ? '1px solid #00FF65'
                        : '1px solid rgba(30, 102, 138, 0.6)',
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(0, 185, 220, 0.28), rgba(7, 45, 70, 0.85))'
                        : '#071B2E',
                      cursor: 'pointer',
                      fontSize: 11,
                      lineHeight: 1.28,
                      userSelect: 'none',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 3,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        border: isChecked ? '1.5px solid #00FF65' : '1.5px solid #4A7A96',
                        background: isChecked ? '#00FF65' : '#051525',
                        color: '#01200B',
                        fontWeight: 900,
                        fontSize: 11,
                        boxShadow: isChecked ? '0 0 8px rgba(0, 255, 101, 0.65)' : 'none',
                      }}
                    >
                      {isChecked ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong style={{ color: isChecked ? '#00FF65' : '#00DFFF', marginRight: 4 }}>
                        {idx + 1}.
                      </strong>
                      {text}
                    </span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={text} testTitle="Local / Remote and SBO Command" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* Expected result */}
          <section
            style={{
              background: '#052920',
              border: '1.5px solid #00FF65',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 10px',
                borderBottom: '1px solid rgba(0, 255, 101, 0.35)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <CheckCircle2 size={14} style={{ color: '#00FF65' }} />
              Expected result
            </div>
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#E2F8EC' }}>
              Commands execute only with valid authority, select and permissives.
            </div>
          </section>

          {/* Interview focus */}
          <section
            style={{
              background: '#061B2B',
              border: '1px solid #00DFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 10px',
                borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <GraduationCap size={14} style={{ color: '#00DFFF' }} />
              Interview focus
            </div>
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#E2F4FF' }}>
              Describe select, operate, timeout, interlocking and command feedback.
            </div>
          </section>
        </aside>

        {/* RIGHT MAIN VISUALIZATION AREA */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* ROW 1: Visualization – Local / Remote & SBO Command Flow */}
          <section
            style={{
              background: 'linear-gradient(180deg, #072036 0%, #041322 100%)',
              border: '1.5px solid #00DFFF',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: '6px 12px',
                borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 223, 255, 0.14), transparent)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800 }}>
                <Monitor size={15} style={{ color: '#00DFFF' }} />
                Visualization – Local / Remote &amp; SBO Command Flow
              </span>
              <span style={{ fontSize: 11, color: '#A8CBE0' }}>
                <strong style={{ color: '#00DFFF' }}>{stepMeta.title}:</strong> {stepMeta.detail}
              </span>
            </div>

            <div style={{ padding: '6px 10px', overflowX: 'auto' }}>
              <svg
                viewBox="0 0 920 198"
                style={{ width: '100%', minWidth: 740, height: 192, display: 'block' }}
                role="img"
                aria-label="Local Remote and SBO Command Flow Diagram"
              >
                <defs>
                  <filter id="t2GlowGreen" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="3.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="t2GlowCyan" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="3.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="t2GlowRed" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="3.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* A. SLD – Bay 52 */}
                <g transform="translate(8, 8)">
                  <rect
                    x="0"
                    y="0"
                    width="175"
                    height="22"
                    rx="11"
                    fill="#0A3352"
                    stroke="#00DFFF"
                    strokeWidth="1"
                  />
                  <text x="87" y="15" textAnchor="middle" fill="#F2F8FF" fontSize="10.5" fontWeight="700">
                    Single Line Diagram (SLD) – Bay 52
                  </text>
                  <text x="72" y="42" textAnchor="middle" fill="#F2F8FF" fontSize="12" fontWeight="700">
                    33 kV Bus
                  </text>
                  <line x1="18" y1="52" x2="126" y2="52" stroke="#F2F8FF" strokeWidth="3" />
                  <line x1="72" y1="52" x2="72" y2="80" stroke="#F2F8FF" strokeWidth="2.5" />
                  <g
                    onClick={() => handleSboSelect(breakerClosed ? 'OPEN' : 'CLOSE')}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x="52"
                      y="80"
                      width="40"
                      height="40"
                      rx="5"
                      fill={breakerClosed ? 'rgba(0,255,101,0.28)' : 'rgba(255,64,85,0.3)'}
                      stroke={breakerColor}
                      strokeWidth="3"
                      filter={breakerClosed ? 'url(#t2GlowGreen)' : 'url(#t2GlowRed)'}
                    />
                    <text x="72" y="106" textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="900">
                      52
                    </text>
                  </g>
                  <text x="100" y="96" fill={breakerColor} fontSize="11.5" fontWeight="800">
                    CB-33-F03
                  </text>
                  <text x="100" y="111" fill={breakerColor} fontSize="10.5" fontWeight="600">
                    (Feeder 03)
                  </text>
                  <line x1="72" y1="120" x2="72" y2="156" stroke="#F2F8FF" strokeWidth="2.5" />
                  <polyline points="67,150 72,158 77,150" fill="none" stroke="#F2F8FF" strokeWidth="2.4" />
                  <text x="72" y="175" textAnchor="middle" fill="#F2F8FF" fontSize="11.5" fontWeight="700">
                    To Feeder
                  </text>
                </g>

                {/* B. Authority & SBO Command Blocks */}
                <g transform="translate(205, 32)">
                  {/* Authority Block */}
                  <g
                    onClick={() => handleSetAuthority(authority === 'REMOTE' ? 'LOCAL' : 'REMOTE')}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="148"
                      height="52"
                      rx="8"
                      fill={authority === 'REMOTE' ? '#072A22' : '#320C14'}
                      stroke={authority === 'REMOTE' ? '#00FF65' : '#FF4055'}
                      strokeWidth="2"
                      filter={authority === 'REMOTE' ? 'url(#t2GlowGreen)' : 'url(#t2GlowRed)'}
                    />
                    <text x="42" y="21" fill="#A8CBE0" fontSize="10.5" fontWeight="700">
                      Authority
                    </text>
                    <text
                      x="42"
                      y="40"
                      fill={authority === 'REMOTE' ? '#00FF65' : '#FF4055'}
                      fontSize="13.5"
                      fontWeight="900"
                    >
                      {authority === 'REMOTE' ? 'REMOTE ✓' : 'LOCAL ✕'}
                    </text>
                    <rect x="12" y="14" width="22" height="16" rx="2" fill="none" stroke="#00DFFF" strokeWidth="1.5" />
                  </g>

                  {/* SBO Command Block */}
                  <g transform="translate(0, 68)" onClick={() => handleSboSelect()} style={{ cursor: 'pointer' }}>
                    <rect
                      x="0"
                      y="0"
                      width="148"
                      height="54"
                      rx="8"
                      fill="#062236"
                      stroke={sboStage === 'REJECTED' ? '#FF4055' : sboStage === 'SELECTED' ? '#FFD23F' : '#00FF65'}
                      strokeWidth="2"
                    />
                    <text x="38" y="20" fill="#F2F8FF" fontSize="11" fontWeight="800">
                      SBO Command
                    </text>
                    <text
                      x="38"
                      y="39"
                      fill={sboStage === 'REJECTED' ? '#FF4055' : sboStage === 'SELECTED' ? '#FFD23F' : '#00FF65'}
                      fontSize="10.5"
                      fontWeight="800"
                    >
                      SELECT → OPERATE
                    </text>
                  </g>

                  {/* Arrows into SIPROTEC 5 */}
                  <path d="M 148 26 L 176 26 L 176 50 L 194 50" fill="none" stroke="#00FF65" strokeWidth="2.5" />
                  <polygon points="190,45 199,50 190,55" fill="#00FF65" />
                  <path d="M 148 95 L 176 95 L 176 76 L 194 76" fill="none" stroke="#00FF65" strokeWidth="2.5" />
                  <polygon points="190,71 199,76 190,81" fill="#00FF65" />
                </g>

                {/* C. Realistic Siemens SIPROTEC 5 IED */}
                <RealisticSiprotec5
                  x={402}
                  y={8}
                  width={136}
                  height={140}
                  borderColor={stepMeta.focus === 'IED' ? '#00DFFF' : '#00CFFF'}
                  lcdLines={[
                    { text: 'Bay 52 CB-33-F03', color: '#A8CBE0' },
                    { text: `XCBR: ${breakerClosed ? 'CLOSED' : 'OPEN'}`, color: breakerColor, bold: true },
                    { text: `CSWI: ${sboStage === 'SELECTED' ? 'Selected' : 'NoSelect'}`, color: '#FFD23F', bold: true },
                    { text: `Auth: ${authority}`, color: '#00DFFF', bold: true },
                  ]}
                  label="IED – Siemens SIPROTEC 5"
                  subLabel="(CSWI / XCBR)"
                />

                {/* Animated Link 1: IED <-> Gateway */}
                <text x="598" y="64" textAnchor="middle" fill="#F2F8FF" fontSize="10.5" fontWeight="700">
                  IEC 61850
                </text>
                <text x="598" y="78" textAnchor="middle" fill="#A8CBE0" fontSize="9.5">
                  MMS (Command / Reports)
                </text>
                <line x1="538" y1="90" x2="654" y2="90" stroke={linkColor} strokeWidth="3" filter="url(#t2GlowCyan)" />
                <polygon points="544,84 534,90 544,96" fill={linkColor} />
                <polygon points="650,84 660,90 650,96" fill={linkColor} />
                <circle r="4.5" fill={linkColor} filter="url(#t2GlowCyan)">
                  <animateMotion
                    dur="1s"
                    repeatCount="indefinite"
                    path={packetDir === 'FEEDBACK' ? 'M 542 90 L 652 90' : 'M 652 90 L 542 90'}
                  />
                </circle>

                {/* D. Realistic Industrial Station Gateway */}
                <RealisticGatewayOrSwitch
                  x={658}
                  y={22}
                  width={92}
                  height={108}
                  variant="GATEWAY"
                  healthy={packetDir !== 'CMD_REJECT'}
                  label="Station Gateway"
                  subLabel="(IEC 61850)"
                />

                {/* Link 2: Gateway <-> SCADA/HMI */}
                <line x1="742" y1="90" x2="778" y2="90" stroke={linkColor} strokeWidth="3" />
                <polygon points="774,84 784,90 774,96" fill={linkColor} />
                <circle r="4" fill={linkColor}>
                  <animateMotion dur="0.8s" repeatCount="indefinite" path="M 744 90 L 778 90" />
                </circle>

                {/* E. SCADA / HMI Workstation Monitor */}
                <g transform="translate(786, 16)">
                  <rect x="0" y="0" width="126" height="98" rx="6" fill="#5D7285" stroke="#00DFFF" strokeWidth="1.6" />
                  <rect x="5" y="5" width="116" height="84" rx="3" fill="#04111E" />
                  <rect x="6" y="6" width="114" height="13" fill="#0A2740" />
                  <text x="63" y="15.5" textAnchor="middle" fill="#D4EEFF" fontSize="8" fontWeight="800">
                    SCADA / HMI
                  </text>
                  <text x="63" y="29" textAnchor="middle" fill="#A8CBE0" fontSize="7.5">
                    33 kV Bus
                  </text>
                  <line x1="22" y1="34" x2="76" y2="34" stroke="#F2F8FF" strokeWidth="2" />
                  <line x1="49" y1="34" x2="49" y2="46" stroke="#F2F8FF" strokeWidth="1.8" />
                  <rect x="40" y="46" width="18" height="18" rx="2.5" fill={breakerColor} stroke="#FFF" strokeWidth="1" />
                  <text x="49" y="58.5" textAnchor="middle" fill="#FFF" fontSize="8.5" fontWeight="900">
                    52
                  </text>
                  <line x1="49" y1="64" x2="49" y2="80" stroke="#F2F8FF" strokeWidth="1.8" />
                  <text x="64" y="53" fill={breakerColor} fontSize="8" fontWeight="800">
                    CB-33-F03
                  </text>
                  <text x="64" y="64" fill={breakerColor} fontSize="8" fontWeight="800">
                    {breakerClosed ? 'CLOSED' : 'OPEN'}
                  </text>
                  <rect x="54" y="98" width="18" height="12" fill="#8CA2B5" />
                  <polygon points="36,110 90,110 98,116 28,116" fill="#AEBFD0" />
                  <text x="63" y="138" textAnchor="middle" fill="#F2F8FF" fontSize="10.5" fontWeight="700">
                    SCADA / HMI
                  </text>
                  <text x="63" y="152" textAnchor="middle" fill="#A8CBE0" fontSize="9.5">
                    (Operator Workstation)
                  </text>
                </g>
              </svg>
            </div>
          </section>

          {/* ROW 2: 3-Column Grid (Command Control SBO | Live Signal Monitoring | SOE) */}
          <div
            className="sas-t2-mid-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.05fr) minmax(290px, 1.4fr) minmax(220px, 1fr)',
              gap: 8,
              alignItems: 'stretch',
            }}
          >
            {/* 1. Command Control (SBO) */}
            <section
              style={{
                background: '#061B2B',
                border: '1px solid #00DFFF',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Power size={14} style={{ color: '#00DFFF' }} />
                  Command Control (SBO)
                </span>
                <button
                  type="button"
                  onClick={() => setPermissiveOk((p) => !p)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 4,
                    border: permissiveOk ? '1px solid #00FF65' : '1px solid #FF4055',
                    background: permissiveOk ? 'rgba(0,255,101,0.14)' : 'rgba(255,64,85,0.18)',
                    color: permissiveOk ? '#00FF65' : '#FF4055',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  CILO: {permissiveOk ? 'OK' : 'BLOCKED'}
                </button>
              </div>

              <div style={{ padding: '8px 10px', display: 'grid', gap: 7, fontSize: 11.5 }}>
                {/* Authority */}
                <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr 1fr', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#A8CBE0', fontWeight: 700 }}>Authority :</span>
                  {(['LOCAL', 'REMOTE'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSetAuthority(m)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 5,
                        border: authority === m ? `1.5px solid ${m === 'REMOTE' ? '#00FF65' : '#FF4055'}` : '1px solid #29506D',
                        background:
                          authority === m
                            ? m === 'REMOTE'
                              ? 'rgba(0, 255, 101, 0.22)'
                              : 'rgba(255, 64, 85, 0.22)'
                            : '#071E32',
                        color: authority === m ? (m === 'REMOTE' ? '#00FF65' : '#FF6B7D') : '#A8CBE0',
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* SBO Command */}
                <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr 1fr', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#A8CBE0', fontWeight: 700 }}>SBO Cmd :</span>
                  {(['OPEN', 'CLOSE'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCmd(c)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 5,
                        border:
                          selectedCmd === c
                            ? `1.5px solid ${c === 'OPEN' ? '#FF4055' : '#00FF65'}`
                            : '1px solid #29506D',
                        background:
                          selectedCmd === c
                            ? c === 'OPEN'
                              ? 'rgba(255, 64, 85, 0.2)'
                              : 'rgba(0, 255, 101, 0.2)'
                            : '#071E32',
                        color: selectedCmd === c ? (c === 'OPEN' ? '#FF7585' : '#00FF65') : '#A8CBE0',
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* 3-stage progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: '#A8CBE0', padding: '2px 0' }}>
                  <span style={{ color: sboStage === 'SELECTED' || sboStage === 'COMPLETED' ? '#00FF65' : '#A8CBE0', fontWeight: 700 }}>
                    ① Select (SBO)
                  </span>
                  <span>➔</span>
                  <span style={{ color: sboStage === 'COMPLETED' ? '#00FF65' : sboStage === 'SELECTED' ? '#FFD23F' : '#A8CBE0', fontWeight: 700 }}>
                    ② Operate (30s)
                  </span>
                  <span>➔</span>
                  <span style={{ color: sboStage === 'COMPLETED' ? '#00FF65' : '#A8CBE0', fontWeight: 700 }}>
                    ③ Feedback
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => handleSboSelect()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '5px 6px',
                      borderRadius: 5,
                      border: '1px solid #00FF65',
                      background: 'rgba(0, 255, 101, 0.16)',
                      color: '#00FF65',
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={11} /> Select
                  </button>
                  <button
                    type="button"
                    disabled={sboStage !== 'SELECTED'}
                    onClick={handleSboOperate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '5px 6px',
                      borderRadius: 5,
                      border: sboStage === 'SELECTED' ? '1px solid #00DFFF' : '1px solid #2A4C66',
                      background: sboStage === 'SELECTED' ? 'rgba(0, 223, 255, 0.22)' : '#071B2B',
                      color: sboStage === 'SELECTED' ? '#00DFFF' : '#587A94',
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: sboStage === 'SELECTED' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Operate
                  </button>
                  <button
                    type="button"
                    onClick={handleSboCancel}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '5px 6px',
                      borderRadius: 5,
                      border: '1px solid #3A607D',
                      background: '#082238',
                      color: '#D8F3FF',
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <XCircle size={11} /> Cancel
                  </button>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 7px',
                      borderRadius: 5,
                      border: '1px solid #29506D',
                      background: '#041220',
                      color: sboStage === 'SELECTED' ? '#FFD23F' : '#A8CBE0',
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    <Clock size={11} /> {timerSec}s
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Live Signal Monitoring (IEC 61850) */}
            <section
              style={{
                background: '#061B2B',
                border: '1px solid #00DFFF',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
              >
                <Activity size={14} style={{ color: '#00DFFF' }} />
                Live Signal Monitoring (IEC 61850)
              </div>
              <div style={{ padding: '6px 8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#0A2C47', color: '#A8CBE0', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>Parameter</th>
                      <th style={{ padding: '4px 6px' }}>Value</th>
                      <th style={{ padding: '4px 6px' }}>Quality</th>
                      <th style={{ padding: '4px 6px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        p: 'CSWI.Pos',
                        v: authority === 'REMOTE' ? 'remote (2)' : 'local (1)',
                        ok: authority === 'REMOTE',
                      },
                      {
                        p: 'XCBR.Pos.stVal',
                        v: breakerClosed ? 'CLOSED (2)' : 'OPEN (1)',
                        ok: breakerClosed,
                      },
                      { p: 'CILO.EnaOpn', v: permissiveOk ? 'TRUE' : 'FALSE', ok: permissiveOk },
                      { p: 'CILO.EnaCls', v: permissiveOk ? 'TRUE' : 'FALSE', ok: permissiveOk },
                      {
                        p: 'SBO.StSel',
                        v: sboStage,
                        ok: sboStage === 'SELECTED' || sboStage === 'COMPLETED',
                      },
                    ].map((row) => (
                      <tr key={row.p} style={{ borderTop: '1px solid rgba(25, 85, 118, 0.45)' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>{row.p}</td>
                        <td
                          style={{
                            padding: '4px 6px',
                            fontWeight: 800,
                            color: row.ok ? '#00FF65' : row.p === 'SBO.StSel' && sboStage === 'IDLE' ? '#A8CBE0' : '#FF4055',
                          }}
                        >
                          {row.v}
                        </td>
                        <td style={{ padding: '4px 6px', color: '#00FF65' }}>✔ Good</td>
                        <td style={{ padding: '4px 6px', color: '#A8CBE0', fontFamily: 'monospace', fontSize: 10 }}>
                          {liveTs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. SOE (Sequence Of Events) */}
            <section
              style={{
                background: '#061B2B',
                border: '1px solid #00DFFF',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
              >
                <ClipboardCheck size={14} style={{ color: '#00DFFF' }} />
                SOE (Sequence Of Events)
              </div>
              <div style={{ padding: '6px 8px', maxHeight: 145, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                  <thead>
                    <tr style={{ background: '#0A2C47', color: '#A8CBE0', textAlign: 'left' }}>
                      <th style={{ padding: '3.5px 6px' }}>Time</th>
                      <th style={{ padding: '3.5px 6px' }}>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soeLog.map((e) => (
                      <tr key={e.id} style={{ borderTop: '1px solid rgba(25, 85, 118, 0.4)' }}>
                        <td style={{ padding: '3.5px 6px', color: '#A8CBE0', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              marginRight: 5,
                              background:
                                e.kind === 'error'
                                  ? '#FF4055'
                                  : e.kind === 'warn'
                                  ? '#FFD23F'
                                  : '#00FF65',
                            }}
                          />
                          {e.time}
                        </td>
                        <td style={{ padding: '3.5px 6px', color: '#E8F6FF' }}>{e.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ROW 3: Operation Sequence – Local / Remote & SBO (4 Cards + Cyan Arrows) */}
          <section
            style={{
              background: '#061B2B',
              border: '1px solid #00DFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderBottom: '1px solid rgba(0, 223, 255, 0.3)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <RotateCcw size={14} style={{ color: '#00DFFF' }} />
              Operation Sequence – Local / Remote &amp; SBO
            </div>

            <div
              className="sas-t2-seq-row"
              style={{
                padding: '8px 10px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr',
                gap: 6,
                alignItems: 'center',
              }}
            >
              {(
                [
                  {
                    num: 1 as const,
                    title: 'Initial State – CLOSED',
                    iconType: 'GREEN_CB',
                    lines: [
                      'Authority = REMOTE',
                      'XCBR.Pos.stVal = 2',
                      '52a = ON, 52b = OFF',
                      'HMI = CLOSED (Green)',
                    ],
                  },
                  {
                    num: 2 as const,
                    title: 'Select (SBO) – OPEN',
                    iconType: 'IED_LCD',
                    lines: [
                      'SBO.StSel = SELECTED',
                      'Command = OPEN',
                      'Timer Started (30 s)',
                      'Await Operate',
                    ],
                  },
                  {
                    num: 3 as const,
                    title: 'Operate – OPEN',
                    iconType: 'RED_CB',
                    lines: [
                      'Operate Accepted',
                      'XCBR.Pos.stVal = 1',
                      '52a = OFF, 52b = ON',
                      'HMI = OPEN (Red)',
                    ],
                  },
                  {
                    num: 4 as const,
                    title: 'Restore – CLOSED',
                    iconType: 'GREEN_CB',
                    lines: [
                      'Select + Operate (CLOSE)',
                      'XCBR.Pos.stVal = 2',
                      '52a = ON, 52b = OFF',
                      'HMI = CLOSED (Green)',
                    ],
                  },
                ]
              ).map((card, i) => {
                const active = opSeqStage === card.num;
                return (
                  <React.Fragment key={card.num}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpSeqStage(card.num);
                        if (card.num === 1) {
                          setAuthority('REMOTE');
                          setPermissiveOk(true);
                          setBreakerClosed(true);
                          setSboStage('IDLE');
                        } else if (card.num === 2) {
                          handleSboSelect('OPEN');
                        } else if (card.num === 3) {
                          setAuthority('REMOTE');
                          setPermissiveOk(true);
                          setSelectedCmd('OPEN');
                          setBreakerClosed(false);
                          setSboStage('COMPLETED');
                          pushSoe('Stage 3: Operate OPEN executed', 'success');
                        } else if (card.num === 4) {
                          setAuthority('REMOTE');
                          setPermissiveOk(true);
                          setSelectedCmd('CLOSE');
                          setBreakerClosed(true);
                          setSboStage('COMPLETED');
                          pushSoe('Stage 4: Restore CLOSED executed', 'success');
                        }
                      }}
                      style={{
                        textAlign: 'left',
                        padding: 0,
                        borderRadius: 7,
                        border: active ? '1.5px solid #00DFFF' : '1px solid rgba(0, 223, 255, 0.35)',
                        background: active ? '#0A2E4A' : '#051728',
                        color: '#F2F8FF',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 8px',
                          borderBottom: '1px solid rgba(0, 223, 255, 0.25)',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        <span
                          style={{
                            width: 17,
                            height: 17,
                            borderRadius: '50%',
                            background: '#00DFFF',
                            color: '#011826',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 10.5,
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {card.num}
                        </span>
                        <span>{card.title}</span>
                      </div>

                      <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
                        {/* Mini Equipment Indicator */}
                        <svg viewBox="0 0 46 66" style={{ width: 40, height: 58, flexShrink: 0 }}>
                          <rect x="2" y="2" width="42" height="62" rx="4" fill="#1F2E3D" stroke="#6E8BA3" strokeWidth="1.5" />
                          {card.iconType === 'IED_LCD' ? (
                            <>
                              <rect x="6" y="10" width="34" height="24" rx="2" fill="#061B2E" stroke="#00DFFF" />
                              <text x="23" y="21" textAnchor="middle" fill="#FFD23F" fontSize="6" fontWeight="800">
                                SELECT
                              </text>
                              <text x="23" y="30" textAnchor="middle" fill="#00FF65" fontSize="6" fontWeight="800">
                                30s
                              </text>
                            </>
                          ) : (
                            <>
                              <rect
                                x="13"
                                y="10"
                                width="20"
                                height="20"
                                rx="3"
                                fill={card.iconType === 'GREEN_CB' ? '#00FF65' : '#FF4055'}
                              />
                              <text x="23" y="44" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="900">
                                52
                              </text>
                              <text x="23" y="55" textAnchor="middle" fill="#A8CBE0" fontSize="7" fontWeight="700">
                                {card.iconType === 'GREEN_CB' ? 'CLOSED' : 'OPEN'}
                              </text>
                            </>
                          )}
                        </svg>

                        <div style={{ display: 'grid', gap: 2.5, fontSize: 10, lineHeight: 1.25 }}>
                          {card.lines.map((l, li) => (
                            <div key={li}>
                              <span style={{ color: '#00FF65', fontWeight: 900, marginRight: 4 }}>✔</span>
                              {l}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                    {i < 3 && (
                      <div style={{ color: '#00DFFF', fontSize: 18, fontWeight: 900, userSelect: 'none' }}>
                        ➔
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @media (max-width: 1120px) {
          .sas-t2-main-grid { grid-template-columns: 1fr !important; }
          .sas-t2-mid-grid { grid-template-columns: 1fr !important; }
          .sas-t2-seq-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test2SboVisualization;
