import React, { useEffect, useRef, useState } from 'react';
import { RealisticSiprotec5, RealisticGatewayOrSwitch } from '../components/RealisticDevices';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  GraduationCap,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Network,
  PlayCircle,
  Radio,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export type DbposState = 'CLOSED' | 'OPEN' | 'INTERMEDIATE' | 'BAD';
export type CommFaultMode =
  | 'NONE'
  | 'ETH_LINK_FAIL'
  | 'IED_COMM_LOSS'
  | 'GATEWAY_UNAVAILABLE'
  | 'INVALID_QUALITY'
  | 'STALE_TIMESTAMP';
export type ProtocolViewMode = 'MMS' | 'GOOSE';
export type ActiveVizTab = 'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW';

interface BreakerStatusVisualizationProps {
  onClose?: () => void;
  initialDone?: boolean[];
  onStepChange?: (index: number, checked: boolean) => void;
}

function formatLiveTimestamp(date: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/**
 * Interactive Training-Only Simulation of SLD Breaker Status Indication (Bay 52 / CB-33-F03).
 * All devices, wires, breaker symbols, auxiliary contacts, packet animations, and controls
 * are independent, interactive React/SVG elements matching the target SCADA reference.
 */
export function BreakerStatusVisualization({
  onClose,
  initialDone,
  onStepChange,
}: BreakerStatusVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core simulated breaker state (IEC 61850-7-4 XCBR.Pos Dbpos: 0=intermediate, 1=off/open, 2=on/closed, 3=bad)
  const [position, setPosition] = useState<DbposState>('CLOSED');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showStepGuide, setShowStepGuide] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveVizTab>('VISUALIZATION');
  const [protocolMode, setProtocolMode] = useState<ProtocolViewMode>('MMS');
  const [faultMode, setFaultMode] = useState<CommFaultMode>('NONE');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [transitionPulse, setTransitionPulse] = useState<boolean>(false);
  const [iedInputFlash, setIedInputFlash] = useState<boolean>(false);
  const [gooseStNum, setGooseStNum] = useState<number>(14);
  const [gooseSqNum, setGooseSqNum] = useState<number>(0);
  const [liveTimestamp, setLiveTimestamp] = useState<string>(() => formatLiveTimestamp(new Date()));
  const [frozenTimestamp, setFrozenTimestamp] = useState<string | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);

  // 7-step completion state (Step 1 checked by default if no initialDone is passed with true values, matching reference)
  const [done, setDone] = useState<boolean[]>(() => {
    if (initialDone) {
      return Array.from({ length: 7 }, (_, i) => !!initialDone[i]);
    }
    return [false, false, false, false, false, false, false];
  });

  useEffect(() => {
    if (initialDone) {
      setDone(Array.from({ length: 7 }, (_, i) => !!initialDone[i]));
    }
  }, [initialDone?.join('|')]);

  // Continuous clock for live MMS integrity timestamps and GOOSE sqNum increments
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        faultMode !== 'STALE_TIMESTAMP' &&
        faultMode !== 'ETH_LINK_FAIL' &&
        faultMode !== 'IED_COMM_LOSS' &&
        faultMode !== 'GATEWAY_UNAVAILABLE'
      ) {
        setLiveTimestamp(formatLiveTimestamp(new Date()));
      }
      if (faultMode === 'NONE') {
        setGooseSqNum((s) => (s < 999 ? s + 1 : 1));
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [faultMode]);

  // Sync browser fullscreen exits
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Trigger animated signal propagation on breaker state change
  const triggerBreakerTransition = (nextPos: DbposState, nextStage?: 0 | 1 | 2) => {
    setPosition(nextPos);
    if (typeof nextStage === 'number') {
      setStage(nextStage);
    } else if (nextPos === 'OPEN') {
      setStage(1);
    } else if (nextPos === 'CLOSED') {
      setStage((prev) => (prev === 1 ? 2 : 0));
    }

    setIedInputFlash(true);
    setTransitionPulse(true);
    setGooseStNum((n) => n + 1);
    setGooseSqNum(0);

    if (
      faultMode !== 'STALE_TIMESTAMP' &&
      faultMode !== 'ETH_LINK_FAIL' &&
      faultMode !== 'IED_COMM_LOSS' &&
      faultMode !== 'GATEWAY_UNAVAILABLE'
    ) {
      setLiveTimestamp(formatLiveTimestamp(new Date()));
    }

    window.setTimeout(() => setIedInputFlash(false), 900);
    window.setTimeout(() => setTransitionPulse(false), 1600);
  };

  // Inject or clear communication/quality fault
  const handleSelectFault = (mode: CommFaultMode) => {
    setFaultMode(mode);
    if (
      mode === 'STALE_TIMESTAMP' ||
      mode === 'ETH_LINK_FAIL' ||
      mode === 'IED_COMM_LOSS' ||
      mode === 'GATEWAY_UNAVAILABLE'
    ) {
      setFrozenTimestamp((prev) => prev || liveTimestamp);
    } else {
      setFrozenTimestamp(null);
      setLiveTimestamp(formatLiveTimestamp(new Date()));
    }
  };

  // Toggle Full Screen mode
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

  // Download / Print PDF Evidence Sheet
  const handleDownloadPdf = () => {
    window.print();
  };

  // Mark all 7 steps complete
  const handleMarkAllComplete = () => {
    const allCompleted = done.every(Boolean);
    const next = Array(7).fill(!allCompleted);
    setDone(next);
    next.forEach((val, idx) => onStepChange?.(idx, val));
  };

  // Step checkbox handler (keeps step completion separate from unintended breaker operations)
  const handleStepToggle = (index: number) => {
    setActiveStep(index);
    setShowStepGuide(true);
    setDone((prev) => {
      const next = prev.map((v, idx) => (idx === index ? !v : v));
      onStepChange?.(index, next[index]);
      return next;
    });
    setTransitionPulse(true);
    window.setTimeout(() => setTransitionPulse(false), 1100);
  };

  // Derived electrical & IEC 61850 states
  const isClosed = position === 'CLOSED';
  const isOpen = position === 'OPEN';
  const isIntermediate = position === 'INTERMEDIATE';
  const isBadState = position === 'BAD';

  // 52a (Normally Open) & 52b (Normally Closed) auxiliary contact states
  const contact52aClosed = isClosed || isBadState;
  const contact52bClosed = isOpen || isBadState;

  // IEC 61850-7-4 XCBR.Pos.stVal double-point encoding:
  // 0 = intermediate-state (00), 1 = off / OPEN (01), 2 = on / CLOSED (10), 3 = bad-state (11)
  const stValNumber = isClosed ? 2 : isOpen ? 1 : isIntermediate ? 0 : 3;
  const stValText = isClosed
    ? 'CLOSED (2)'
    : isOpen
    ? 'OPEN (1)'
    : isIntermediate
    ? 'INTERMEDIATE (0)'
    : 'BAD STATE (3)';

  // Link & Quality health evaluation
  const iedToGwDown = faultMode === 'ETH_LINK_FAIL' || faultMode === 'IED_COMM_LOSS';
  const gwToHmiDown =
    faultMode === 'ETH_LINK_FAIL' ||
    faultMode === 'IED_COMM_LOSS' ||
    faultMode === 'GATEWAY_UNAVAILABLE';
  const isQualityInvalid =
    faultMode === 'INVALID_QUALITY' ||
    faultMode === 'IED_COMM_LOSS' ||
    faultMode === 'ETH_LINK_FAIL' ||
    isBadState;
  const isQualityStale =
    faultMode === 'STALE_TIMESTAMP' || faultMode === 'GATEWAY_UNAVAILABLE' || isIntermediate;

  const posQualityLabel = isQualityInvalid
    ? 'Invalid'
    : isQualityStale
    ? 'Questionable / Stale'
    : 'Good';
  const qHexValue = isQualityInvalid
    ? 'Invalid (0x4000)'
    : isQualityStale
    ? 'OldData (0x0080)'
    : 'Good (0x00)';
  const qValidityLabel = isQualityInvalid ? 'Invalid' : isQualityStale ? 'Stale' : 'Valid';
  const displayedTimestamp =
    frozenTimestamp && (isQualityStale || iedToGwDown || gwToHmiDown)
      ? `${frozenTimestamp}`
      : liveTimestamp;

  // Step focus highlights
  const highlightSld = activeStep === 0 || activeStep === 2 || activeStep === 5 || activeStep === 6;
  const highlightContacts = activeStep === 1 || activeStep === 2 || activeStep === 5;
  const highlightIed = activeStep === 3 || activeStep === 5;
  const highlightGatewayHmi = activeStep === 4 || activeStep === 6 || activeTab === 'HMI';

  const steps = [
    'Record breaker tag, bay and initial physical position.',
    'Verify the 52a and 52b contact wiring against the schematic.',
    'Change breaker position using an approved test method.',
    'Observe IED XCBR.Pos.stVal and quality/time stamp.',
    'Verify gateway mapping and HMI symbol/color.',
    'Repeat for OPEN, CLOSED and intermediate/invalid status.',
    'Record evidence and restore original state.',
  ];

  const stepGuides = [
    {
      title: 'Step 1: Identify Breaker & Initial State',
      detail:
        'Confirm Bay 52 feeder tag CB-33-F03 on the 33 kV Bus and verify initial CLOSED position before state simulation.',
      actionLabel: 'Highlight Bay 52 SLD',
      onAction: () => triggerBreakerTransition('CLOSED', 0),
    },
    {
      title: 'Step 2: Verify 52a (NO) & 52b (NC) Contact Wiring',
      detail:
        'Trace physical auxiliary contacts 52a (Normally Open) and 52b (Normally Closed) to Siemens SIPROTEC 5 binary inputs BI1 & BI2.',
      actionLabel: 'Pulse 52a/52b Wiring',
      onAction: () => {
        setIedInputFlash(true);
        setTransitionPulse(true);
        window.setTimeout(() => setIedInputFlash(false), 900);
        window.setTimeout(() => setTransitionPulse(false), 1400);
      },
    },
    {
      title: 'Step 3: Simulate Breaker Position Change (CLOSED → OPEN)',
      detail:
        'Operate breaker CB-33-F03 from CLOSED to OPEN and verify complementary switching of 52a (OFF) and 52b (ON).',
      actionLabel: isClosed ? 'Simulate Operate → OPEN' : 'Simulate Restore → CLOSED',
      onAction: () => triggerBreakerTransition(isClosed ? 'OPEN' : 'CLOSED', isClosed ? 1 : 2),
    },
    {
      title: 'Step 4: Observe IED XCBR.Pos.stVal & Quality / Timestamp',
      detail:
        'Verify IEC 61850 double-point encoding at the SIPROTEC 5 IED: CLOSED = 2 (10₂), OPEN = 1 (01₂), Quality = Good (0x00).',
      actionLabel: 'Inspect XCBR.Pos Signals',
      onAction: () => setActiveTab('SIGNALS'),
    },
    {
      title: 'Step 5: Verify Station Gateway Mapping & SCADA/HMI Indication',
      detail:
        'Confirm buffered MMS Report propagation through the Station Gateway to the SCADA/HMI display and verify symbol color.',
      actionLabel: 'Trigger MMS Report Burst',
      onAction: () => {
        setProtocolMode('MMS');
        setTransitionPulse(true);
        window.setTimeout(() => setTransitionPulse(false), 1500);
      },
    },
    {
      title: 'Step 6: Test OPEN, CLOSED, Intermediate (0) & Bad State (3)',
      detail:
        'Exercise all four IEC 61850 Dbpos states (2=CLOSED, 1=OPEN, 0=INTERMEDIATE, 3=BAD) and communication fault handling.',
      actionLabel: 'Open 4-State & Fault Simulator',
      onAction: () => setShowAdvancedControls(true),
    },
    {
      title: 'Step 7: Record Evidence & Restore Original CLOSED State',
      detail:
        'Restore breaker CB-33-F03 to CLOSED (stVal=2), clear all simulated faults, and verify healthy SCADA/HMI indication.',
      actionLabel: 'Restore Normal CLOSED State',
      onAction: () => {
        handleSelectFault('NONE');
        triggerBreakerTransition('CLOSED', 2);
      },
    },
  ];

  const primaryColor = isClosed
    ? '#00FF4C'
    : isOpen
    ? '#FF2525'
    : '#FFB020';

  return (
    <div
      ref={containerRef}
      className={`sas-tg-replica-root ${isFullscreen ? 'sas-tg-fullscreen' : ''}`}
      style={{
        background:
          'radial-gradient(circle at 50% 0%, #092C48 0%, #041526 45%, #020B18 100%)',
        color: '#F2F8FF',
        border: '1.5px solid #00CFFF',
        borderRadius: isFullscreen ? 0 : 12,
        boxShadow:
          '0 0 28px rgba(0, 207, 255, 0.25), inset 0 0 32px rgba(0, 207, 255, 0.08)',
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
      {/* ===================================================================
          1. TOP HEADER BAR & BREADCRUMB
         =================================================================== */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'linear-gradient(180deg, #0A3756 0%, #051B2E 100%)',
              border: '1px solid #00EAFF',
              boxShadow: '0 0 10px rgba(0, 234, 255, 0.35)',
              display: 'grid',
              placeItems: 'center',
              color: '#00EAFF',
            }}
          >
            <ClipboardCheck size={15} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
            <button
              type="button"
              onClick={onClose}
              title={onClose ? 'Switch to all 15 Testing Guidance procedures' : 'Testing Guidance'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#F2F8FF',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: onClose ? 'pointer' : 'default',
                padding: 0,
              }}
            >
              Testing Guidance
            </button>
            <span style={{ color: '#68A8C8', fontWeight: 400 }}>›</span>
            <span
              style={{
                color: '#00EAFF',
                fontWeight: 800,
                letterSpacing: '0.02em',
                textShadow: '0 0 10px rgba(0, 234, 255, 0.45)',
              }}
            >
              SLD &amp; OPERATION – TEST 1
            </span>
          </div>
        </div>

        {/* Right Action Buttons: Full Screen, Download PDF, Mark as Complete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sas-tg-top-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #1E6E91',
                background: 'linear-gradient(180deg, #0B2D48 0%, #061A2C 100%)',
                color: '#D6F2FF',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} style={{ color: '#00EAFF' }} />
              Back to All Tests
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="sas-tg-top-btn"
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
              boxShadow: 'inset 0 0 8px rgba(0, 207, 255, 0.15)',
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={13} style={{ color: '#00EAFF' }} />
            ) : (
              <Maximize2 size={13} style={{ color: '#00EAFF' }} />
            )}
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="sas-tg-top-btn"
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
              boxShadow: 'inset 0 0 8px rgba(0, 207, 255, 0.15)',
            }}
          >
            <Download size={13} style={{ color: '#00EAFF' }} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleMarkAllComplete}
            className="sas-tg-top-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              borderRadius: 6,
              border: '1.5px solid #00FF4C',
              background: done.every(Boolean)
                ? 'linear-gradient(180deg, #0B6E3B 0%, #064224 100%)'
                : 'linear-gradient(180deg, #09522C 0%, #05331B 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 255, 76, 0.35), inset 0 0 8px rgba(0, 255, 76, 0.2)',
            }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF4C' }} />
            {done.every(Boolean) ? 'Completed (7/7)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* ===================================================================
          2. TITLE & 5 NAVIGATION TABS ROW
         =================================================================== */}
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
        {/* Left: [52] Schematic Badge + Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg
            width="38"
            height="38"
            viewBox="0 0 44 44"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(0, 234, 255, 0.45))',
            }}
          >
            <rect
              x="3"
              y="3"
              width="38"
              height="38"
              rx="8"
              fill="#062238"
              stroke="#00EAFF"
              strokeWidth="1.6"
              strokeDasharray="6 2"
            />
            <line x1="22" y1="6" x2="22" y2="13" stroke="#00EAFF" strokeWidth="2" />
            <line x1="22" y1="31" x2="22" y2="38" stroke="#00EAFF" strokeWidth="2" />
            <rect
              x="11"
              y="13"
              width="22"
              height="18"
              rx="3"
              fill="#041526"
              stroke="#00EAFF"
              strokeWidth="1.8"
            />
            <text
              x="22"
              y="25.5"
              textAnchor="middle"
              fill="#00EAFF"
              fontSize="11"
              fontWeight="900"
            >
              52
            </text>
            <circle cx="8" cy="10" r="2" fill="#00FF4C" />
            <circle cx="36" cy="10" r="2" fill="#00EAFF" />
            <circle cx="8" cy="34" r="2" fill="#00EAFF" />
            <circle cx="36" cy="34" r="2" fill="#00FF4C" />
          </svg>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 19.5,
                fontWeight: 800,
                color: '#F2F8FF',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
              }}
            >
              SLD Breaker Status Indication
            </h1>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: '#A8CBE0',
              }}
            >
              Verify that field breaker auxiliary contacts and the HMI indication agree.
            </p>
          </div>
        </div>

        {/* Right: 5 Interactive Tabs matching IMAGE 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'PROCEDURE', label: 'Test Procedure', icon: ClipboardList, target: 'tg-procedure' },
              { id: 'VISUALIZATION', label: 'Visualization', icon: Monitor, target: 'tg-viz-canvas' },
              { id: 'SIGNALS', label: 'IED Signals', icon: Activity, target: 'tg-signals' },
              { id: 'HMI', label: 'HMI/SCADA', icon: Network, target: 'tg-hmi' },
              { id: 'INTERVIEW', label: 'Interview Focus', icon: GraduationCap, target: 'tg-interview' },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'VISUALIZATION') {
                    document
                      .getElementById(tab.target)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: isTabActive ? '1.5px solid #80F5FF' : '1px solid #1C6588',
                  background: isTabActive
                    ? 'linear-gradient(180deg, #1CEBFF 0%, #00B8E6 100%)'
                    : 'linear-gradient(180deg, #09263E 0%, #051728 100%)',
                  color: isTabActive ? '#011627' : '#D8F3FF',
                  fontSize: 12,
                  fontWeight: isTabActive ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: isTabActive
                    ? '0 0 16px rgba(0, 234, 255, 0.55)'
                    : 'inset 0 0 8px rgba(0, 207, 255, 0.1)',
                  transition: 'all 0.18s ease',
                }}
              >
                <Icon size={13.5} style={{ color: isTabActive ? '#011627' : '#00EAFF' }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          3. MAIN 2-COLUMN SCADA DASHBOARD GRID (Left ~28.5%, Right ~71.5%)
         =================================================================== */}
      <div
        className="sas-tg-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 28.5%) minmax(0, 1fr)',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {/* =================================================================
            LEFT COLUMN: 4 STACKED PANELS
           ================================================================= */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* PANEL L1: Before you start */}
          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 8,
              boxShadow: '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13,
                fontWeight: 800,
                color: '#F2F8FF',
              }}
            >
              <ClipboardList size={14} style={{ color: '#00EAFF' }} />
              Before you start
            </div>
            <div style={{ padding: '7px 11px', display: 'grid', gap: 4.5, fontSize: 11.5 }}>
              {[
                'Approved drawing and signal list',
                'Authorized simulation or isolated test circuit',
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2F4FF' }}
                >
                  <span
                    style={{
                      width: 6.5,
                      height: 6.5,
                      borderRadius: '50%',
                      background: '#00FF4C',
                      boxShadow: '0 0 8px #00FF4C',
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* PANEL L2: Step-by-step test process (7 interactive checkboxes) */}
          <section
            id="tg-procedure"
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: activeTab === 'PROCEDURE' ? '1.5px solid #00EAFF' : '1px solid #00CFFF',
              borderRadius: 8,
              boxShadow: '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13,
                fontWeight: 800,
                color: '#F2F8FF',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ListChecks size={14} style={{ color: '#00EAFF' }} />
                Step-by-step test process
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#00FF4C',
                  background: 'rgba(0, 255, 76, 0.12)',
                  border: '1px solid rgba(0, 255, 76, 0.4)',
                  borderRadius: 12,
                  padding: '1px 7px',
                }}
              >
                {done.filter(Boolean).length}/7
              </span>
            </div>

            <div style={{ padding: '6px 8px', display: 'grid', gap: 4.5 }}>
              {steps.map((stepText, idx) => {
                const isChecked = done[idx];
                const isCurrent = activeStep === idx;
                return (
                  <div key={idx}>
                    <div
                      onClick={() => handleStepToggle(idx)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStepToggle(idx);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5.5px 8px',
                        borderRadius: 6,
                        border: isChecked
                          ? '1.5px solid #00EAFF'
                          : isCurrent
                          ? '1px solid #00CFFF'
                          : '1px solid rgba(30, 102, 138, 0.65)',
                        background: isChecked
                          ? 'linear-gradient(90deg, rgba(0, 185, 220, 0.28) 0%, rgba(7, 45, 70, 0.85) 100%)'
                          : isCurrent
                          ? 'linear-gradient(90deg, rgba(0, 150, 200, 0.2) 0%, rgba(6, 30, 50, 0.9) 100%)'
                          : '#071B2E',
                        boxShadow: isChecked
                          ? '0 0 12px rgba(0, 234, 255, 0.28), inset 0 0 8px rgba(0, 255, 76, 0.12)'
                          : 'none',
                        cursor: 'pointer',
                        fontSize: 11.5,
                        lineHeight: 1.3,
                        color: '#F2F8FF',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                      }}
                    >
                      {/* Checkbox square */}
                      <span
                        aria-hidden="true"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3.5,
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          border: isChecked ? '1.5px solid #00FF4C' : '1.5px solid #4A7A96',
                          background: isChecked
                            ? 'linear-gradient(180deg, #00FF4C 0%, #00C838 100%)'
                            : '#051525',
                          color: '#01200B',
                          fontWeight: 900,
                          fontSize: 12,
                          boxShadow: isChecked ? '0 0 10px rgba(0, 255, 76, 0.65)' : 'none',
                        }}
                      >
                        {isChecked ? '✓' : ''}
                      </span>

                      <span style={{ flex: 1 }}>
                        <strong
                          style={{
                            color: isChecked ? '#00FF4C' : '#00EAFF',
                            marginRight: 4,
                            fontWeight: 800,
                          }}
                        >
                          {idx + 1}.
                        </strong>
                        {stepText}
                      </span>
                    </div>

                    {/* Compact Expandable Step Guidance Tooltip */}
                    {showStepGuide && isCurrent && (
                      <div
                        style={{
                          marginTop: 3,
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: '#041322',
                          border: '1px solid rgba(0, 234, 255, 0.45)',
                          fontSize: 10.5,
                          color: '#BBE6FF',
                          lineHeight: 1.4,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 2,
                          }}
                        >
                          <strong style={{ color: '#00EAFF' }}>{stepGuides[idx].title}</strong>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowStepGuide(false);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#7AB2D0',
                              cursor: 'pointer',
                              fontSize: 11,
                              padding: '0 2px',
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ marginBottom: 5 }}>{stepGuides[idx].detail}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            stepGuides[idx].onAction();
                          }}
                          style={{
                            padding: '2.5px 7px',
                            borderRadius: 4,
                            border: '1px solid #00FF4C',
                            background: 'rgba(0, 255, 76, 0.14)',
                            color: '#00FF4C',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ▶ {stepGuides[idx].actionLabel}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* PANEL L3: Expected result (Green Glowing Frame) */}
          <section
            style={{
              background: 'linear-gradient(160deg, #062E22 0%, #041C16 100%)',
              border: '1.5px solid #00FF4C',
              borderRadius: 8,
              boxShadow: '0 0 14px rgba(0, 255, 76, 0.2), inset 0 0 14px rgba(0, 255, 76, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 255, 76, 0.35)',
                background: 'linear-gradient(90deg, rgba(0, 255, 76, 0.16), transparent)',
                fontSize: 13,
                fontWeight: 800,
                color: '#F2F8FF',
              }}
            >
              <CheckCircle2 size={14} style={{ color: '#00FF4C' }} />
              Expected result
            </div>
            <div style={{ padding: '7px 11px', fontSize: 11.5, color: '#E2F8EC', lineHeight: 1.4 }}>
              Correct position and quality at IED, gateway, SLD and event log.
            </div>
          </section>

          {/* PANEL L4: Interview focus */}
          <section
            id="tg-interview"
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: activeTab === 'INTERVIEW' ? '1.5px solid #00EAFF' : '1px solid #00CFFF',
              borderRadius: 8,
              boxShadow: '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13,
                fontWeight: 800,
                color: '#F2F8FF',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <GraduationCap size={14} style={{ color: '#00EAFF' }} />
                Interview focus
              </span>
            </div>
            <div style={{ padding: '7px 11px', fontSize: 11.5, color: '#E2F4FF', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00EAFF',
                    boxShadow: '0 0 6px #00EAFF',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <span>Explain how 52a/52b become XCBR.Pos.stVal and an HMI indication.</span>
              </div>
              {activeTab === 'INTERVIEW' && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: '#041220',
                    border: '1px solid rgba(0, 234, 255, 0.35)',
                    fontSize: 10.5,
                    color: '#A8CBE0',
                  }}
                >
                  <strong style={{ color: '#00EAFF' }}>Key SAS Interview Answer:</strong> Field auxiliary switches{' '}
                  <b>52a (NO)</b> and <b>52b (NC)</b> energize opto-isolated binary inputs on the protection IED (110/220 V DC). The IED filters contact bounce and maps the complementary pair to Logical Node{' '}
                  <b>XCBR1.Pos.stVal</b> (Dbpos: <code>10₂=2 CLOSED</code>, <code>01₂=1 OPEN</code>,{' '}
                  <code>00₂=0 Intermediate</code>, <code>11₂=3 Bad</code>) with quality{' '}
                  <b>XCBR1.Pos.q</b> and UTC timestamp <b>t</b>, then transmits a BRCB MMS Report via the Station Gateway to update the SCADA/HMI symbol.
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* =================================================================
            RIGHT COLUMN: 3 STACKED VISUALIZATION SECTIONS
           ================================================================= */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* ===============================================================
              RIGHT PANEL 1: Visualization – Test Setup & Signal Flow
             =============================================================== */}
          <section
            id="tg-viz-canvas"
            style={{
              background: 'linear-gradient(180deg, #072036 0%, #041322 100%)',
              border: '1.5px solid #00CFFF',
              borderRadius: 9,
              boxShadow:
                '0 0 18px rgba(0, 207, 255, 0.2), inset 0 0 24px rgba(0, 207, 255, 0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Section Header + Compact Interactive Simulation Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: '6px 12px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.35)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.16), rgba(6, 26, 44, 0.4))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#F2F8FF',
                }}
              >
                <Monitor size={15} style={{ color: '#00EAFF' }} />
                <span>Visualization – Test Setup &amp; Signal Flow</span>
              </div>

              {/* Compact Interactive Simulation Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setProtocolMode((m) => (m === 'MMS' ? 'GOOSE' : 'MMS'))}
                  title="Toggle normal MMS Report visualization vs selectable GOOSE protection/interlocking burst"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 5,
                    border:
                      protocolMode === 'GOOSE'
                        ? '1px solid #00FF4C'
                        : '1px solid rgba(0, 234, 255, 0.5)',
                    background:
                      protocolMode === 'GOOSE'
                        ? 'rgba(0, 255, 76, 0.15)'
                        : 'rgba(0, 207, 255, 0.12)',
                    color: protocolMode === 'GOOSE' ? '#00FF4C' : '#00EAFF',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Radio size={11.5} />
                  {protocolMode === 'MMS' ? 'Path: MMS Reports' : 'Path: MMS + GOOSE Burst'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvancedControls((v) => !v)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 5,
                    border:
                      faultMode !== 'NONE' || isIntermediate || isBadState
                        ? '1px solid #FF5555'
                        : '1px solid rgba(0, 207, 255, 0.45)',
                    background:
                      faultMode !== 'NONE' || isIntermediate || isBadState
                        ? 'rgba(255, 37, 37, 0.18)'
                        : 'rgba(8, 34, 56, 0.85)',
                    color:
                      faultMode !== 'NONE' || isIntermediate || isBadState
                        ? '#FF8080'
                        : '#A8CBE0',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={11.5} />
                  {showAdvancedControls ? 'Hide Test Sim Controls' : 'Dbpos / Fault Simulator'}
                </button>

                {faultMode !== 'NONE' && (
                  <button
                    type="button"
                    onClick={() => handleSelectFault('NONE')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 5,
                      border: '1px solid #00FF4C',
                      background: 'rgba(0, 255, 76, 0.18)',
                      color: '#00FF4C',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={11.5} />
                    Reset Fault
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Training Simulator Drawer */}
            {showAdvancedControls && (
              <div
                style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(0, 207, 255, 0.25)',
                  background: 'rgba(3, 14, 26, 0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 10.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ color: '#A8CBE0', fontWeight: 700 }}>
                    IEC 61850 Dbpos (Step 6):
                  </span>
                  {(
                    [
                      { id: 'CLOSED', label: 'CLOSED (2 / 10₂)', color: '#00FF4C' },
                      { id: 'OPEN', label: 'OPEN (1 / 01₂)', color: '#FF2525' },
                      { id: 'INTERMEDIATE', label: 'INTERMEDIATE (0 / 00₂)', color: '#FFB020' },
                      { id: 'BAD', label: 'BAD STATE (3 / 11₂)', color: '#FF4D4D' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => triggerBreakerTransition(st.id)}
                      style={{
                        padding: '2.5px 7px',
                        borderRadius: 4,
                        border:
                          position === st.id
                            ? `1.5px solid ${st.color}`
                            : '1px solid rgba(168, 203, 224, 0.3)',
                        background:
                          position === st.id ? 'rgba(0, 207, 255, 0.18)' : 'rgba(6, 26, 44, 0.7)',
                        color: position === st.id ? st.color : '#D8F3FF',
                        fontWeight: 700,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ color: '#A8CBE0', fontWeight: 700 }}>Fault Injection:</span>
                  {(
                    [
                      { id: 'NONE', label: 'Healthy' },
                      { id: 'ETH_LINK_FAIL', label: 'Ethernet Link Fail' },
                      { id: 'IED_COMM_LOSS', label: 'IED Comm Loss' },
                      { id: 'GATEWAY_UNAVAILABLE', label: 'Gateway Down' },
                      { id: 'INVALID_QUALITY', label: 'Invalid Quality' },
                      { id: 'STALE_TIMESTAMP', label: 'Stale Timestamp' },
                    ] as const
                  ).map((fl) => (
                    <button
                      key={fl.id}
                      type="button"
                      onClick={() => handleSelectFault(fl.id)}
                      style={{
                        padding: '2.5px 7px',
                        borderRadius: 4,
                        border:
                          faultMode === fl.id
                            ? fl.id === 'NONE'
                              ? '1.5px solid #00FF4C'
                              : '1.5px solid #FF2525'
                            : '1px solid rgba(168, 203, 224, 0.3)',
                        background:
                          faultMode === fl.id
                            ? fl.id === 'NONE'
                              ? 'rgba(0, 255, 76, 0.16)'
                              : 'rgba(255, 37, 37, 0.22)'
                            : 'rgba(6, 26, 44, 0.7)',
                        color:
                          faultMode === fl.id
                            ? fl.id === 'NONE'
                              ? '#00FF4C'
                              : '#FF7070'
                            : '#D8F3FF',
                        fontWeight: 700,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {fl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Fault Banner when active */}
            {faultMode !== 'NONE' && (
              <div
                style={{
                  padding: '5px 12px',
                  background: 'linear-gradient(90deg, rgba(255, 37, 37, 0.25), rgba(40, 8, 12, 0.9))',
                  borderBottom: '1px solid #FF2525',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 11,
                  color: '#FFD2D2',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} style={{ color: '#FF2525' }} />
                  <strong>COMMUNICATION / QUALITY ALARM ACTIVE:</strong>{' '}
                  {faultMode === 'ETH_LINK_FAIL' &&
                    'Station Bus Ethernet Link Down — MMS/GOOSE packets halted, XCBR.Pos.q flagged Invalid.'}
                  {faultMode === 'IED_COMM_LOSS' &&
                    'Siemens SIPROTEC 5 IED Association Lost (TCP/102) — Last known value retained as Invalid.'}
                  {faultMode === 'GATEWAY_UNAVAILABLE' &&
                    'Station Gateway Unavailable — Upstream SCADA/HMI link down, HMI indication marked Stale (OldData).'}
                  {faultMode === 'INVALID_QUALITY' &&
                    'IED Quality Flag Forced Invalid (0x4000) — Operator control blocked until quality is Good (0x00).'}
                  {faultMode === 'STALE_TIMESTAMP' &&
                    'Time Sync / Refresh Frozen — Timestamp stale (OldData 0x0080), verify SNTP/PTP & BRCB buffering.'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectFault('NONE')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #00FF4C',
                    background: '#05351D',
                    color: '#00FF4C',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Clear Alarm
                </button>
              </div>
            )}

            {/* =============================================================
                INTERACTIVE SVG + REACT VISUALIZATION STAGE (MATCHING IMAGE 2)
               ============================================================= */}
            <div
              className="sas-tg-stage-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(195px, 24.5%) minmax(0, 1fr)',
                minHeight: 232,
                background:
                  'radial-gradient(ellipse at 58% 50%, rgba(0, 180, 255, 0.11) 0%, rgba(4, 18, 34, 0.96) 75%)',
              }}
            >
              {/* -----------------------------------------------------------
                  SUB-PANEL A: Single Line Diagram (SLD) – Bay 52
                 ----------------------------------------------------------- */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRight: '1px solid rgba(0, 207, 255, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: highlightSld
                    ? 'inset 0 0 18px rgba(0, 234, 255, 0.22)'
                    : 'none',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: '4px 8px',
                    borderRadius: 16,
                    background: 'linear-gradient(180deg, #0D3859 0%, #072238 100%)',
                    border: '1px solid rgba(0, 207, 255, 0.5)',
                    color: '#F2F8FF',
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 0 10px rgba(0, 207, 255, 0.18)',
                  }}
                >
                  Single Line Diagram (SLD) – Bay 52
                </div>

                <svg
                  viewBox="0 0 230 202"
                  style={{ width: '100%', maxWidth: 225, height: 184, overflow: 'visible' }}
                  role="img"
                  aria-label="Single Line Diagram Bay 52 33 kV Bus CB-33-F03"
                >
                  <defs>
                    <filter id="sldGlowGreen" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="sldGlowRed" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <text
                    x="95"
                    y="20"
                    textAnchor="middle"
                    fill="#F2F8FF"
                    fontSize="13"
                    fontWeight="700"
                  >
                    33 kV Bus
                  </text>

                  <line
                    x1="28"
                    y1="32"
                    x2="162"
                    y2="32"
                    stroke="#F2F8FF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  <line x1="95" y1="32" x2="95" y2="70" stroke="#F2F8FF" strokeWidth="2.8" />

                  {isClosed && (
                    <>
                      <circle cx="95" cy="46" r="2.8" fill="#00FF4C" filter="url(#sldGlowGreen)">
                        <animate
                          attributeName="cy"
                          values="34;68"
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle cx="95" cy="130" r="2.8" fill="#00FF4C" filter="url(#sldGlowGreen)">
                        <animate
                          attributeName="cy"
                          values="120;170"
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}

                  <g
                    onClick={() => triggerBreakerTransition(isClosed ? 'OPEN' : 'CLOSED')}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>Click to toggle Circuit Breaker 52 (CB-33-F03)</title>
                    <rect
                      x="70"
                      y="67"
                      width="50"
                      height="50"
                      rx="7"
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="2"
                      opacity="0.45"
                      filter={isClosed ? 'url(#sldGlowGreen)' : 'url(#sldGlowRed)'}
                    />
                    <rect
                      x="73"
                      y="70"
                      width="44"
                      height="44"
                      rx="6"
                      fill={
                        isClosed
                          ? 'rgba(0, 190, 55, 0.28)'
                          : isOpen
                          ? 'rgba(210, 25, 35, 0.3)'
                          : 'rgba(220, 140, 10, 0.3)'
                      }
                      stroke={primaryColor}
                      strokeWidth="3.2"
                      filter={isClosed ? 'url(#sldGlowGreen)' : 'url(#sldGlowRed)'}
                    />
                    <text
                      x="95"
                      y="98"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="19"
                      fontWeight="900"
                    >
                      52
                    </text>
                  </g>

                  <text x="128" y="89" fill={primaryColor} fontSize="12.5" fontWeight="800">
                    CB-33-F03
                  </text>
                  <text x="128" y="105" fill={primaryColor} fontSize="11.5" fontWeight="600">
                    (Feeder 03)
                  </text>

                  <line x1="95" y1="114" x2="95" y2="140" stroke="#F2F8FF" strokeWidth="2.6" />
                  <line x1="85" y1="140" x2="105" y2="140" stroke="#F2F8FF" strokeWidth="2.4" />
                  <line x1="88" y1="145" x2="102" y2="145" stroke="#F2F8FF" strokeWidth="2.2" />
                  <line x1="91" y1="150" x2="99" y2="150" stroke="#F2F8FF" strokeWidth="2" />
                  <line x1="95" y1="150" x2="95" y2="172" stroke="#F2F8FF" strokeWidth="2.6" />
                  <polyline
                    points="89,165 95,174 101,165"
                    fill="none"
                    stroke="#F2F8FF"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <text
                    x="95"
                    y="192"
                    textAnchor="middle"
                    fill="#F2F8FF"
                    fontSize="12.5"
                    fontWeight="700"
                  >
                    To Feeder
                  </text>
                </svg>
              </div>

              {/* -----------------------------------------------------------
                  SUB-PANEL B-E: Field Wiring, Siemens SIPROTEC 5 IED,
                  Station Gateway & SCADA/HMI Workstation
                 ----------------------------------------------------------- */}
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      marginLeft: '12%',
                      padding: '4px 20px',
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, #0D3859 0%, #072238 100%)',
                      border: '1px solid rgba(0, 207, 255, 0.5)',
                      color: '#F2F8FF',
                      fontSize: 11,
                      fontWeight: 700,
                      boxShadow: '0 0 10px rgba(0, 207, 255, 0.18)',
                    }}
                  >
                    Field Wiring &amp; IED
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 10.5,
                      color: '#A8CBE0',
                    }}
                  >
                    <span>
                      52a:{' '}
                      <strong style={{ color: contact52aClosed ? '#00FF4C' : '#FF6B6B' }}>
                        {contact52aClosed ? 'ON (Closed)' : 'OFF (Open)'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      52b:{' '}
                      <strong style={{ color: contact52bClosed ? '#00FF4C' : '#FF6B6B' }}>
                        {contact52bClosed ? 'ON (Closed)' : 'OFF (Open)'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Full Interactive Hardware & Animated Signal Path SVG Diagram */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg
                    viewBox="0 0 770 198"
                    style={{
                      width: '100%',
                      minWidth: 640,
                      height: 186,
                      display: 'block',
                      overflow: 'visible',
                    }}
                    role="img"
                    aria-label="Interactive Field Wiring, Siemens SIPROTEC 5 IED, Station Gateway, and SCADA HMI Signal Flow"
                  >
                    <defs>
                      <filter id="neonGreenGlow" x="-35%" y="-35%" width="170%" height="170%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="neonCyanGlow" x="-35%" y="-35%" width="170%" height="170%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="neonRedGlow" x="-35%" y="-35%" width="170%" height="170%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient id="iedChassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B4D5E" />
                        <stop offset="50%" stopColor="#243342" />
                        <stop offset="100%" stopColor="#16222F" />
                      </linearGradient>
                      <linearGradient id="iedFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1B2A3A" />
                        <stop offset="100%" stopColor="#0E1824" />
                      </linearGradient>
                      <linearGradient id="gatewayChassisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#384B5E" />
                        <stop offset="45%" stopColor="#1E2D3D" />
                        <stop offset="100%" stopColor="#101B27" />
                      </linearGradient>
                      <linearGradient id="monitorBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#B8C7D4" />
                        <stop offset="50%" stopColor="#7C90A1" />
                        <stop offset="100%" stopColor="#495A6B" />
                      </linearGradient>
                    </defs>

                    {/* 1. 52a (NO) & 52b (NC) AUXILIARY CONTACT BLOCKS */}
                    <g
                      onClick={() => triggerBreakerTransition(isClosed ? 'OPEN' : 'CLOSED')}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>52a Normally Open Auxiliary Contact — Click to toggle breaker state</title>
                      <rect
                        x="6"
                        y="32"
                        width="116"
                        height="35"
                        rx="8"
                        fill="#061D2E"
                        stroke={contact52aClosed ? '#00FF4C' : '#1F7A4C'}
                        strokeWidth={highlightContacts || transitionPulse ? '2.2' : '1.6'}
                        filter={contact52aClosed ? 'url(#neonGreenGlow)' : undefined}
                      />
                      <text x="15" y="54" fill="#F2F8FF" fontSize="12.5" fontWeight="800">
                        52a (NO)
                      </text>
                      <line x1="74" y1="50" x2="84" y2="50" stroke="#00FF4C" strokeWidth="2" />
                      <circle cx="84" cy="50" r="2.2" fill="#00FF4C" />
                      <circle cx="101" cy="50" r="2.2" fill="#00FF4C" />
                      {contact52aClosed ? (
                        <line x1="84" y1="50" x2="101" y2="50" stroke="#00FF4C" strokeWidth="2.5" />
                      ) : (
                        <line x1="84" y1="50" x2="99" y2="41" stroke="#00FF4C" strokeWidth="2.2" />
                      )}
                      <line x1="101" y1="50" x2="112" y2="50" stroke="#00FF4C" strokeWidth="2" />
                    </g>

                    <g
                      onClick={() => triggerBreakerTransition(isClosed ? 'OPEN' : 'CLOSED')}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>52b Normally Closed Auxiliary Contact — Click to toggle breaker state</title>
                      <rect
                        x="6"
                        y="86"
                        width="116"
                        height="35"
                        rx="8"
                        fill="#061D2E"
                        stroke={contact52bClosed ? '#00FF4C' : '#1F7A4C'}
                        strokeWidth={highlightContacts || transitionPulse ? '2.2' : '1.6'}
                        filter={contact52bClosed ? 'url(#neonGreenGlow)' : undefined}
                      />
                      <text x="15" y="108" fill="#F2F8FF" fontSize="12.5" fontWeight="800">
                        52b (NC)
                      </text>
                      <line x1="74" y1="104" x2="84" y2="104" stroke="#00FF4C" strokeWidth="2" />
                      <circle cx="84" cy="104" r="2.2" fill="#00FF4C" />
                      <circle cx="101" cy="104" r="2.2" fill="#00FF4C" />
                      <line x1="99" y1="97" x2="99" y2="105" stroke="#00FF4C" strokeWidth="1.6" />
                      {contact52bClosed ? (
                        <line
                          x1="84"
                          y1="104"
                          x2="101"
                          y2="104"
                          stroke="#00FF4C"
                          strokeWidth="2.5"
                        />
                      ) : (
                        <line
                          x1="84"
                          y1="104"
                          x2="99"
                          y2="95"
                          stroke="#00FF4C"
                          strokeWidth="2.2"
                        />
                      )}
                      <line x1="101" y1="104" x2="112" y2="104" stroke="#00FF4C" strokeWidth="2" />
                    </g>

                    {/* 2. ANIMATED GREEN SIGNAL PATHS (52a & 52b → SIEMENS IED) */}
                    <path
                      d="M 122 50 L 146 50 L 146 68 L 178 68"
                      fill="none"
                      stroke="#00FF4C"
                      strokeWidth={contact52aClosed ? '3' : '2'}
                      opacity={contact52aClosed ? 1 : 0.55}
                      filter="url(#neonGreenGlow)"
                    />
                    <polygon
                      points="172,62 183,68 172,74"
                      fill="#00FF4C"
                      filter="url(#neonGreenGlow)"
                    />

                    <path
                      d="M 122 104 L 146 104 L 146 90 L 178 90"
                      fill="none"
                      stroke="#00FF4C"
                      strokeWidth={contact52bClosed ? '3' : '2'}
                      opacity={contact52bClosed ? 1 : 0.55}
                      filter="url(#neonGreenGlow)"
                    />
                    <polygon
                      points="172,84 183,90 172,96"
                      fill="#00FF4C"
                      filter="url(#neonGreenGlow)"
                    />

                    {(contact52aClosed || transitionPulse) && (
                      <circle r="4" fill="#B8FFD0" filter="url(#neonGreenGlow)">
                        <animateMotion
                          dur={transitionPulse ? '0.45s' : '1.1s'}
                          repeatCount="indefinite"
                          path="M 122 50 L 146 50 L 146 68 L 178 68"
                        />
                      </circle>
                    )}
                    {(contact52bClosed || transitionPulse) && (
                      <circle r="4" fill="#B8FFD0" filter="url(#neonGreenGlow)">
                        <animateMotion
                          dur={transitionPulse ? '0.45s' : '1.1s'}
                          repeatCount="indefinite"
                          path="M 122 104 L 146 104 L 146 90 L 178 90"
                        />
                      </circle>
                    )}

                    {/* 3. SIEMENS SIPROTEC 5 PROTECTION IED */}
                    <RealisticSiprotec5
                      x={186}
                      y={6}
                      width={132}
                      height={146}
                      borderColor={highlightIed || iedInputFlash ? '#00EAFF' : '#00CFFF'}
                      lcdLines={[
                        { text: 'SIEMENS SIPROTEC 5', color: '#A8CBE0' },
                        { text: `XCBR.Pos=${stValNumber}`, color: primaryColor, bold: true },
                        { text: `${position}`, color: primaryColor, bold: true },
                        { text: `52a:${contact52aClosed ? '1' : '0'} 52b:${contact52bClosed ? '1' : '0'}`, color: '#00FF4C' },
                      ]}
                      label="IED (XCBR)"
                      onClick={() => setActiveTab('SIGNALS')}
                    />

                    {/* 4. ANIMATED IEC 61850 MMS / GOOSE LINK (IED → GATEWAY) */}
                    <text
                      x="384"
                      y="58"
                      textAnchor="middle"
                      fill="#F2F8FF"
                      fontSize="12"
                      fontWeight="700"
                    >
                      IEC 61850
                    </text>
                    <text
                      x="384"
                      y="74"
                      textAnchor="middle"
                      fill={protocolMode === 'GOOSE' ? '#00FF4C' : '#F2F8FF'}
                      fontSize="12"
                      fontWeight="700"
                    >
                      {protocolMode === 'GOOSE' ? 'MMS / GOOSE (0x88B8)' : 'MMS / GOOSE'}
                    </text>

                    <line
                      x1="322"
                      y1="89"
                      x2="438"
                      y2="89"
                      stroke={
                        iedToGwDown
                          ? '#FF2525'
                          : protocolMode === 'GOOSE'
                          ? '#00FF4C'
                          : '#00EAFF'
                      }
                      strokeWidth="3.2"
                      strokeDasharray={iedToGwDown ? '6 4' : undefined}
                      filter={
                        iedToGwDown
                          ? 'url(#neonRedGlow)'
                          : protocolMode === 'GOOSE'
                          ? 'url(#neonGreenGlow)'
                          : 'url(#neonCyanGlow)'
                      }
                    />
                    <polygon
                      points="433,83 445,89 433,95"
                      fill={
                        iedToGwDown
                          ? '#FF2525'
                          : protocolMode === 'GOOSE'
                          ? '#00FF4C'
                          : '#00EAFF'
                      }
                    />

                    {!iedToGwDown && (
                      <>
                        <circle
                          r={transitionPulse ? '5' : '3.8'}
                          fill={protocolMode === 'GOOSE' ? '#00FF4C' : '#80F8FF'}
                          filter={
                            protocolMode === 'GOOSE'
                              ? 'url(#neonGreenGlow)'
                              : 'url(#neonCyanGlow)'
                          }
                        >
                          <animateMotion
                            dur={transitionPulse ? '0.45s' : '1.15s'}
                            repeatCount="indefinite"
                            path="M 324 89 L 438 89"
                          />
                        </circle>
                        <circle
                          r="3.2"
                          fill={protocolMode === 'GOOSE' ? '#B8FFD0' : '#00EAFF'}
                          filter="url(#neonCyanGlow)"
                        >
                          <animateMotion
                            dur={transitionPulse ? '0.45s' : '1.15s'}
                            begin="0.55s"
                            repeatCount="indefinite"
                            path="M 324 89 L 438 89"
                          />
                        </circle>
                      </>
                    )}

                    {iedToGwDown && (
                      <g transform="translate(384, 89)">
                        <circle r="9" fill="#3A080C" stroke="#FF2525" strokeWidth="2" />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#FF2525"
                          fontSize="12"
                          fontWeight="900"
                        >
                          ✕
                        </text>
                      </g>
                    )}

                    {protocolMode === 'GOOSE' && (
                      <g transform="translate(332, 100)">
                        <rect
                          x="0"
                          y="0"
                          width="104"
                          height="17"
                          rx="4"
                          fill="#042818"
                          stroke="#00FF4C"
                          strokeWidth="1"
                        />
                        <text
                          x="52"
                          y="11.5"
                          textAnchor="middle"
                          fill="#00FF4C"
                          fontSize="8.5"
                          fontWeight="800"
                        >
                          stNum={gooseStNum} sqNum={gooseSqNum}
                        </text>
                      </g>
                    )}

                    {/* 5. INDUSTRIAL STATION GATEWAY */}
                    <RealisticGatewayOrSwitch
                      x={448}
                      y={24}
                      width={136}
                      height={102}
                      variant="GATEWAY"
                      healthy={faultMode !== 'GATEWAY_UNAVAILABLE'}
                      label="Station Gateway"
                      subLabel="SICAM / IEC 61850"
                    />

                    {/* 6. ANIMATED LINK (STATION GATEWAY → SCADA/HMI) */}
                    <line
                      x1="586"
                      y1="80"
                      x2="634"
                      y2="80"
                      stroke={gwToHmiDown ? '#FF2525' : '#00EAFF'}
                      strokeWidth="3.2"
                      strokeDasharray={gwToHmiDown ? '5 4' : undefined}
                      filter={gwToHmiDown ? 'url(#neonRedGlow)' : 'url(#neonCyanGlow)'}
                    />
                    <polygon
                      points="629,74 641,80 629,86"
                      fill={gwToHmiDown ? '#FF2525' : '#00EAFF'}
                    />

                    {!gwToHmiDown && (
                      <circle
                        r={transitionPulse ? '4.8' : '3.6'}
                        fill="#80F8FF"
                        filter="url(#neonCyanGlow)"
                      >
                        <animateMotion
                          dur={transitionPulse ? '0.4s' : '0.95s'}
                          repeatCount="indefinite"
                          path="M 588 80 L 634 80"
                        />
                      </circle>
                    )}

                    {/* 7. SCADA / HMI WORKSTATION MONITOR */}
                    <g
                      transform="translate(643, 12)"
                      onClick={() => triggerBreakerTransition(isClosed ? 'OPEN' : 'CLOSED')}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>SCADA / HMI Operator Workstation — Click to toggle breaker state</title>
                      <rect
                        x="0"
                        y="0"
                        width="122"
                        height="90"
                        rx="6"
                        fill="url(#monitorBezelGrad)"
                        stroke={highlightGatewayHmi ? '#00EAFF' : '#96B2C8'}
                        strokeWidth="1.8"
                        filter="url(#neonCyanGlow)"
                      />
                      <rect
                        x="5"
                        y="5"
                        width="112"
                        height="77"
                        rx="3"
                        fill="#04111E"
                        stroke="#1E5270"
                        strokeWidth="1"
                      />

                      <rect x="6" y="6" width="110" height="12" fill="#08243B" />
                      <text
                        x="61"
                        y="14.5"
                        textAnchor="middle"
                        fill="#D4EEFF"
                        fontSize="7.5"
                        fontWeight="800"
                        letterSpacing="0.04em"
                      >
                        SCADA/HMI
                      </text>

                      <line x1="20" y1="25" x2="72" y2="25" stroke="#F2F8FF" strokeWidth="2.2" />
                      <line x1="46" y1="25" x2="46" y2="39" stroke="#F2F8FF" strokeWidth="1.8" />
                      <rect
                        x="37"
                        y="39"
                        width="18"
                        height="18"
                        rx="2.5"
                        fill={primaryColor}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                        filter={isClosed ? 'url(#sldGlowGreen)' : 'url(#sldGlowRed)'}
                      />
                      <line x1="46" y1="57" x2="46" y2="69" stroke="#F2F8FF" strokeWidth="1.8" />
                      <line x1="41" y1="69" x2="51" y2="69" stroke="#F2F8FF" strokeWidth="1.5" />
                      <line x1="43" y1="72" x2="49" y2="72" stroke="#F2F8FF" strokeWidth="1.3" />
                      <polyline
                        points="43,75 46,79 49,75"
                        fill="none"
                        stroke="#F2F8FF"
                        strokeWidth="1.4"
                      />

                      <text x="61" y="46" fill={primaryColor} fontSize="8.5" fontWeight="800">
                        CB-33-F03
                      </text>
                      <text x="61" y="57" fill={primaryColor} fontSize="8.5" fontWeight="800">
                        {isClosed
                          ? 'Closed'
                          : isOpen
                          ? 'Open'
                          : isIntermediate
                          ? 'Interm.'
                          : 'Bad (3)'}
                      </text>
                      {(gwToHmiDown || isQualityInvalid || isQualityStale) && (
                        <text x="61" y="69" fill="#FFB020" fontSize="7.5" fontWeight="800">
                          {isQualityInvalid ? 'INVALID' : 'STALE'}
                        </text>
                      )}

                      <rect x="52" y="90" width="18" height="13" fill="#8CA2B5" />
                      <polygon
                        points="34,103 88,103 96,109 26,109"
                        fill="#AEBFD0"
                        stroke="#647B8F"
                        strokeWidth="1"
                      />

                      <rect
                        x="6"
                        y="119"
                        width="110"
                        height="24"
                        rx="12"
                        fill="#061B2E"
                        stroke="#689AB8"
                        strokeWidth="1.3"
                      />
                      <text
                        x="61"
                        y="135"
                        textAnchor="middle"
                        fill="#F2F8FF"
                        fontSize="11.5"
                        fontWeight="700"
                      >
                        SCADA / HMI
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* ===============================================================
              RIGHT ROW 2: Live Signal Monitoring + HMI / SCADA Indication
             =============================================================== */}
          <div
            className="sas-tg-mid-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.95fr) minmax(235px, 1fr)',
              gap: 8,
              alignItems: 'stretch',
            }}
          >
            {/* PANEL R2-A: Live Signal Monitoring Table */}
            <section
              id="tg-signals"
              style={{
                background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
                border: activeTab === 'SIGNALS' ? '1.5px solid #00EAFF' : '1px solid #00CFFF',
                borderRadius: 8,
                boxShadow:
                  '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
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
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                  background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#F2F8FF',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Activity size={15} style={{ color: '#00EAFF' }} />
                  Live Signal Monitoring
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#A8CBE0' }}>
                  IED: <strong style={{ color: '#00EAFF' }}>SIPROTEC 5 (XCBR1)</strong>
                </span>
              </div>

              <div style={{ padding: '8px 10px', overflowX: 'auto', flex: 1 }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontSize: 12,
                    border: '1px solid rgba(0, 207, 255, 0.35)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'linear-gradient(180deg, #0B3150 0%, #072038 100%)',
                        color: '#E2F4FF',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '6.5px 10px', borderBottom: '1px solid #155273' }}>
                        Parameter (IEC 61850)
                      </th>
                      <th style={{ padding: '6.5px 10px', borderBottom: '1px solid #155273' }}>
                        Value
                      </th>
                      <th style={{ padding: '6.5px 10px', borderBottom: '1px solid #155273' }}>
                        Quality
                      </th>
                      <th style={{ padding: '6.5px 10px', borderBottom: '1px solid #155273' }}>
                        Time Stamp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'rgba(6, 24, 42, 0.85)' }}>
                      <td
                        style={{
                          padding: '7px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.6)',
                          fontWeight: 700,
                          color: '#F2F8FF',
                        }}
                      >
                        XCBR.Pos.stVal
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.6)',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2.5px 10px',
                            borderRadius: 14,
                            fontWeight: 800,
                            fontSize: 11,
                            background: isClosed
                              ? 'linear-gradient(180deg, #00FF4C 0%, #00B835 100%)'
                              : isOpen
                              ? 'linear-gradient(180deg, #FF3B3B 0%, #C8141E 100%)'
                              : 'linear-gradient(180deg, #FFB020 0%, #C87A00 100%)',
                            color: isClosed ? '#01220A' : '#FFFFFF',
                            boxShadow: isClosed
                              ? '0 0 12px rgba(0, 255, 76, 0.55)'
                              : '0 0 12px rgba(255, 37, 37, 0.55)',
                          }}
                        >
                          {stValText}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.6)',
                          fontWeight: 700,
                          color:
                            isQualityInvalid
                              ? '#FF5555'
                              : isQualityStale
                              ? '#FFB020'
                              : '#00FF4C',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={13.5} />
                          {posQualityLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.6)',
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          fontSize: 11.5,
                          color: isQualityStale ? '#FFB020' : '#D8F3FF',
                        }}
                      >
                        {displayedTimestamp}
                      </td>
                    </tr>

                    <tr style={{ background: 'rgba(8, 30, 50, 0.85)' }}>
                      <td
                        style={{
                          padding: '7px 10px',
                          fontWeight: 700,
                          color: '#F2F8FF',
                        }}
                      >
                        XCBR.Pos.q
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2.5px 10px',
                            borderRadius: 14,
                            fontWeight: 700,
                            fontSize: 11,
                            border:
                              isQualityInvalid
                                ? '1px solid #FF4D4D'
                                : isQualityStale
                                ? '1px solid #FFB020'
                                : '1px solid #00FF4C',
                            background:
                              isQualityInvalid
                                ? 'rgba(255, 37, 37, 0.2)'
                                : isQualityStale
                                ? 'rgba(255, 176, 32, 0.2)'
                                : 'rgba(0, 255, 76, 0.16)',
                            color:
                              isQualityInvalid
                                ? '#FF8080'
                                : isQualityStale
                                ? '#FFD070'
                                : '#6BFF9E',
                          }}
                        >
                          {qHexValue}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          fontWeight: 700,
                          color:
                            isQualityInvalid
                              ? '#FF5555'
                              : isQualityStale
                              ? '#FFB020'
                              : '#00FF4C',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={13.5} />
                          {qValidityLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          fontSize: 11.5,
                          color: isQualityStale ? '#FFB020' : '#D8F3FF',
                        }}
                      >
                        {displayedTimestamp}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* PANEL R2-B: HMI / SCADA Indication (CLOSED Green & OPEN Red Cards) */}
            <section
              id="tg-hmi"
              style={{
                background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
                border: activeTab === 'HMI' ? '1.5px solid #00EAFF' : '1px solid #00CFFF',
                borderRadius: 8,
                boxShadow:
                  '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                  background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#F2F8FF',
                }}
              >
                <Monitor size={15} style={{ color: '#00EAFF' }} />
                HMI / SCADA Indication
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  flex: 1,
                  alignItems: 'stretch',
                }}
              >
                <button
                  type="button"
                  onClick={() => triggerBreakerTransition('CLOSED', 0)}
                  style={{
                    borderRadius: 8,
                    border: isClosed ? '2px solid #00FF4C' : '1px solid #26516E',
                    background: isClosed
                      ? 'radial-gradient(circle at 50% 40%, rgba(0, 255, 76, 0.25) 0%, rgba(5, 36, 26, 0.92) 100%)'
                      : 'linear-gradient(180deg, #081E32 0%, #051322 100%)',
                    boxShadow: isClosed
                      ? '0 0 16px rgba(0, 255, 76, 0.45), inset 0 0 12px rgba(0, 255, 76, 0.2)'
                      : 'none',
                    padding: '7px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#F2F8FF',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: '3.2px solid #00FF4C',
                      background: isClosed ? 'rgba(0, 255, 76, 0.22)' : 'rgba(0, 255, 76, 0.06)',
                      boxShadow: isClosed
                        ? '0 0 14px #00FF4C'
                        : '0 0 6px rgba(0, 255, 76, 0.35)',
                    }}
                  />
                  <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.1 }}>CLOSED</div>
                  <div style={{ fontSize: 11, color: '#A8CBE0' }}>(Green)</div>
                </button>

                <button
                  type="button"
                  onClick={() => triggerBreakerTransition('OPEN', 1)}
                  style={{
                    borderRadius: 8,
                    border: isOpen ? '2px solid #FF2525' : '1px solid #26516E',
                    background: isOpen
                      ? 'radial-gradient(circle at 50% 40%, rgba(255, 37, 37, 0.28) 0%, rgba(44, 8, 16, 0.92) 100%)'
                      : 'linear-gradient(180deg, #081E32 0%, #051322 100%)',
                    boxShadow: isOpen
                      ? '0 0 16px rgba(255, 37, 37, 0.5), inset 0 0 12px rgba(255, 37, 37, 0.2)'
                      : 'none',
                    padding: '7px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#F2F8FF',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: '3.2px solid #FF2525',
                      background: isOpen ? 'rgba(255, 37, 37, 0.24)' : 'rgba(255, 37, 37, 0.06)',
                      boxShadow: isOpen
                        ? '0 0 14px #FF2525'
                        : '0 0 6px rgba(255, 37, 37, 0.35)',
                    }}
                  />
                  <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.1 }}>OPEN</div>
                  <div style={{ fontSize: 11, color: '#A8CBE0' }}>(Red)</div>
                </button>
              </div>
            </section>
          </div>

          {/* ===============================================================
              RIGHT ROW 3: Operation Sequence – Visualization (3 Cards + Arrows)
             =============================================================== */}
          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 8,
              boxShadow:
                '0 0 14px rgba(0, 207, 255, 0.15), inset 0 0 14px rgba(0, 207, 255, 0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13.5,
                fontWeight: 800,
                color: '#F2F8FF',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <PlayCircle size={15} style={{ color: '#00EAFF' }} />
                Operation Sequence – Visualization
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#A8CBE0' }}>
                Click any stage to propagate signals
              </span>
            </div>

            <div
              className="sas-tg-seq-row"
              style={{
                padding: '8px 10px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1fr',
                gap: 7,
                alignItems: 'center',
              }}
            >
              {(
                [
                  {
                    stageIndex: 0 as const,
                    num: 1,
                    title: 'Initial State – CLOSED',
                    targetPos: 'CLOSED' as const,
                    isGreen: true,
                    lines: [
                      '52a = ON (Closed)',
                      '52b = OFF (Open)',
                      'XCBR.Pos.stVal = 2',
                      'HMI = Closed (Green)',
                    ],
                  },
                  {
                    stageIndex: 1 as const,
                    num: 2,
                    title: 'Operate – OPEN',
                    targetPos: 'OPEN' as const,
                    isGreen: false,
                    lines: [
                      '52a = OFF (Open)',
                      '52b = ON (Closed)',
                      'XCBR.Pos.stVal = 1',
                      'HMI = Open (Red)',
                    ],
                  },
                  {
                    stageIndex: 2 as const,
                    num: 3,
                    title: 'Restore – CLOSED',
                    targetPos: 'CLOSED' as const,
                    isGreen: true,
                    lines: [
                      '52a = ON (Closed)',
                      '52b = OFF (Open)',
                      'XCBR.Pos.stVal = 2',
                      'HMI = Closed (Green)',
                    ],
                  },
                ]
              ).map((card, idx) => {
                const isCardSelected = stage === card.stageIndex && position === card.targetPos;
                const cardColor = card.isGreen ? '#00FF4C' : '#FF2525';
                return (
                  <React.Fragment key={card.num}>
                    <button
                      type="button"
                      onClick={() => triggerBreakerTransition(card.targetPos, card.stageIndex)}
                      style={{
                        textAlign: 'left',
                        padding: 0,
                        borderRadius: 7,
                        border: isCardSelected
                          ? '1.5px solid #00EAFF'
                          : '1px solid rgba(0, 207, 255, 0.4)',
                        background: isCardSelected
                          ? 'linear-gradient(180deg, #0A2E4A 0%, #051829 100%)'
                          : 'linear-gradient(180deg, #072036 0%, #041322 100%)',
                        boxShadow: isCardSelected
                          ? '0 0 16px rgba(0, 234, 255, 0.32), inset 0 0 12px rgba(0, 207, 255, 0.12)'
                          : 'inset 0 0 10px rgba(0, 207, 255, 0.05)',
                        cursor: 'pointer',
                        color: '#F2F8FF',
                        overflow: 'hidden',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '5.5px 9px',
                          borderBottom: '1px solid rgba(0, 207, 255, 0.25)',
                          background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.16), transparent)',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'linear-gradient(180deg, #1CEBFF 0%, #0099CC 100%)',
                            color: '#011826',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 11,
                            fontWeight: 900,
                            boxShadow: '0 0 8px rgba(0, 234, 255, 0.5)',
                            flexShrink: 0,
                          }}
                        >
                          {card.num}
                        </span>
                        <span>{card.title}</span>
                      </div>

                      <div
                        style={{
                          padding: '6px 9px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <svg
                          viewBox="0 0 64 96"
                          style={{
                            width: 50,
                            height: 76,
                            flexShrink: 0,
                            overflow: 'visible',
                          }}
                          aria-hidden="true"
                        >
                          <line
                            x1="10"
                            y1="10"
                            x2="54"
                            y2="10"
                            stroke="#F2F8FF"
                            strokeWidth="2.5"
                          />
                          <line
                            x1="32"
                            y1="10"
                            x2="32"
                            y2="30"
                            stroke="#F2F8FF"
                            strokeWidth="2.2"
                          />
                          <rect
                            x="18"
                            y="30"
                            width="28"
                            height="28"
                            rx="4"
                            fill={
                              card.isGreen
                                ? 'rgba(0, 190, 55, 0.28)'
                                : 'rgba(210, 25, 35, 0.32)'
                            }
                            stroke={cardColor}
                            strokeWidth="2.6"
                            filter={card.isGreen ? 'url(#sldGlowGreen)' : 'url(#sldGlowRed)'}
                          />
                          <text
                            x="32"
                            y="49"
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="13.5"
                            fontWeight="900"
                          >
                            52
                          </text>
                          <line
                            x1="32"
                            y1="58"
                            x2="32"
                            y2="72"
                            stroke="#F2F8FF"
                            strokeWidth="2.2"
                          />
                          <line
                            x1="25"
                            y1="72"
                            x2="39"
                            y2="72"
                            stroke="#F2F8FF"
                            strokeWidth="2"
                          />
                          <line
                            x1="27"
                            y1="76"
                            x2="37"
                            y2="76"
                            stroke="#F2F8FF"
                            strokeWidth="1.8"
                          />
                          <line
                            x1="32"
                            y1="76"
                            x2="32"
                            y2="88"
                            stroke="#F2F8FF"
                            strokeWidth="2"
                          />
                          <polyline
                            points="28,83 32,89 36,83"
                            fill="none"
                            stroke="#F2F8FF"
                            strokeWidth="2"
                          />
                        </svg>

                        <div style={{ display: 'grid', gap: 3, fontSize: 11, lineHeight: 1.3 }}>
                          {card.lines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                color: '#E8F6FF',
                              }}
                            >
                              <span
                                style={{
                                  color: '#00FF4C',
                                  fontWeight: 900,
                                  fontSize: 11.5,
                                  textShadow: '0 0 6px rgba(0, 255, 76, 0.5)',
                                }}
                              >
                                ✔
                              </span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>

                    {idx < 2 && (
                      <div
                        aria-hidden="true"
                        style={{
                          color: '#00EAFF',
                          fontSize: 20,
                          fontWeight: 900,
                          textShadow: '0 0 10px rgba(0, 234, 255, 0.65)',
                          padding: '0 1px',
                          userSelect: 'none',
                        }}
                      >
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
        .sas-tg-top-btn:hover {
          filter: brightness(1.16);
        }
        @media (max-width: 1100px) {
          .sas-tg-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 820px) {
          .sas-tg-stage-grid {
            grid-template-columns: 1fr !important;
          }
          .sas-tg-stage-grid > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid rgba(0, 207, 255, 0.3);
          }
          .sas-tg-mid-grid {
            grid-template-columns: 1fr !important;
          }
          .sas-tg-seq-row {
            grid-template-columns: 1fr !important;
          }
          .sas-tg-seq-row > div[aria-hidden="true"] {
            transform: rotate(90deg);
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default BreakerStatusVisualization;
