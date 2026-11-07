import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getBayProtocolBreakdown } from '../data/protocolRegistry';
import { AlarmRecord, BayEquipment, SoeRecord } from '../types/substation';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Eye,
  GitBranch,
  Info,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
  Zap,
} from 'lucide-react';

type ScadaPrimaryView = 'SLD' | 'BAY_MATRIX' | 'TRANSFORMERS' | 'ALARMS_SOE';
type InspectorTab =
  | 'All Sections'
  | 'Overview'
  | 'Measurements'
  | 'Controls'
  | 'IEC 61850'
  | 'Alarms'
  | 'SOE';

export const ScadaHmiPage: React.FC = () => {
  const {
    bays,
    busbars,
    transformers,
    ieds,
    signals,
    alarms,
    soeLog,
    trendHistory,
    selectedBayId,
    setSelectedBayId,
    setSelectedIedId,
    setActiveTab,
    simulationRunning,
    toggleSimulationRunning,
    commandBreaker,
    busTransferMode,
    busTransferStatus,
    busTransferMessage,
    setBusTransferMode,
    requestBusTransfer,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
    stepTransformerOltc,
    acknowledgeAlarm,
    acknowledgeAllAlarms,
    clearClearedAlarms,
  } = useSubstationStore();

  // Operator View & Collapsible Workstation Panels State
  const [primaryView, setPrimaryView] = useState<ScadaPrimaryView>('SLD');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('All Sections');
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 132 | 33 | 11>('ALL');
  const [baySearch, setBaySearch] = useState<string>('');
  const [isOperatorFullScreen, setIsOperatorFullScreen] = useState<boolean>(false);
  const [leftDirectoryCollapsed, setLeftDirectoryCollapsed] = useState<boolean>(false);
  const [rightInspectorCollapsed, setRightInspectorCollapsed] = useState<boolean>(false);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState<boolean>(false);

  // SLD Zoom & Pan State (1.0 = Fit to Screen without horizontal scroll)
  const [sldZoom, setSldZoom] = useState<number>(1.0);
  const [sldPanX, setSldPanX] = useState<number>(0);
  const [sldPanY, setSldPanY] = useState<number>(0);

  // Alarm & SOE Management + Clickable Event Detail Inspector State
  const [alarmSeverityFilter, setAlarmSeverityFilter] = useState<string>('ALL');
  const [alarmCategoryFilter, setAlarmCategoryFilter] = useState<string>('ACTIVE');
  const [selectedAlarmId, setSelectedAlarmId] = useState<string>(alarms[0]?.id || '');
  const [soeSearch, setSoeSearch] = useState<string>('');
  const [inspectedSoeEvent, setInspectedSoeEvent] = useState<SoeRecord | null>(soeLog[0] || null);
  const [inspectedAlarmRecord, setInspectedAlarmRecord] = useState<AlarmRecord | null>(null);

  // Two-Step SBO Confirmation & Operator Feedback State
  const [pendingSboCommand, setPendingSboCommand] = useState<'OPEN' | 'CLOSED' | null>(null);
  const [operatorFeedback, setOperatorFeedback] = useState<{
    status: 'SUCCESS' | 'REJECTED' | 'INFO';
    title: string;
    detail: string;
    timestamp: string;
  } | null>(null);

  // Derived System Metrics from Shared Simulation Store
  const selectedBay = bays.find((b) => b.id === selectedBayId) || bays[0];
  const selectedIed = ieds.find((i) => i.id === selectedBay.iedId);
  const selectedTx = transformers.find(
    (t) =>
      t.hvBayId === selectedBay.id ||
      t.lvBayId === selectedBay.id ||
      t.id === selectedBay.connectedTransformerId
  );

  const totalImportMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);
  const totalImportMvar =
    (bays.find((b) => b.id === 'BAY-132-L1')?.reactivePowerMvar || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.reactivePowerMvar || 0);
  const systemFreqHz = busbars.find((b) => b.energized)?.frequencyHz || 50.0;
  const onlineIedsCount = ieds.filter((i) => i.commHealthy).length;

  const unackCount = alarms.filter((a) => a.state === 'ACTIVE_UNACK').length;
  const criticalCount = alarms.filter((a) => a.state !== 'CLEARED' && a.severity === 'CRITICAL').length;
  const majorCount = alarms.filter((a) => a.state !== 'CLEARED' && a.severity === 'MAJOR').length;
  const warningCount = alarms.filter(
    (a) => a.state !== 'CLEARED' && (a.severity === 'WARNING' || a.severity === 'MINOR')
  ).length;

  const filteredAlarms = useMemo(() => {
    return alarms.filter((a) => {
      if (alarmCategoryFilter === 'ACTIVE' && a.state === 'CLEARED') return false;
      if (alarmSeverityFilter !== 'ALL' && a.severity !== alarmSeverityFilter) return false;
      return true;
    });
  }, [alarms, alarmCategoryFilter, alarmSeverityFilter]);

  const filteredSoe = useMemo(() => {
    return soeLog.filter(
      (s) =>
        !soeSearch.trim() ||
        s.bayName.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.iedId.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.eventDescription.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.sourceRef.toLowerCase().includes(soeSearch.toLowerCase())
    );
  }, [soeLog, soeSearch]);

  const filteredDirectoryBays = useMemo(() => {
    return bays.filter((b) => {
      if (voltageFilter !== 'ALL' && b.voltageKv !== voltageFilter) return false;
      if (!baySearch.trim()) return true;
      const q = baySearch.toLowerCase();
      return (
        b.bayCode.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.breakerId.toLowerCase().includes(q) ||
        b.iedId.toLowerCase().includes(q)
      );
    });
  }, [bays, voltageFilter, baySearch]);

  const selectedBaySignals = useMemo(
    () => signals.filter((s) => s.bayId === selectedBay.id),
    [signals, selectedBay.id]
  );
  const selectedBayAlarms = useMemo(
    () => alarms.filter((a) => a.bayId === selectedBay.id),
    [alarms, selectedBay.id]
  );
  const selectedBaySoe = useMemo(
    () => soeLog.filter((s) => s.bayId === selectedBay.id),
    [soeLog, selectedBay.id]
  );

  // SBO Step 1: Select Before Operate
  const handleSelectSbo = (target: 'OPEN' | 'CLOSED') => {
    const ts = new Date().toISOString();
    setPendingSboCommand(target);
    setOperatorFeedback({
      status: 'INFO',
      title: `SBO SELECT CONFIRMED: ${selectedBay.breakerId} → ${target}`,
      detail: `MMS SelectWithValue(${target === 'CLOSED' ? 'true' : 'false'}) accepted on ${selectedBay.iedId.replace(/-/g, '_')}/CSWI1$CO$Pos$SBOw. Confirm operation within 15 seconds.`,
      timestamp: ts,
    });
  };

  // SBO Step 2: Confirmed Execute Operate
  const handleConfirmOperate = () => {
    if (!pendingSboCommand) return;
    const ts = new Date().toISOString();
    const target = pendingSboCommand;
    setPendingSboCommand(null);

    const success = commandBreaker(selectedBay.id, target, 'SCADA_SBO');
    if (success) {
      setOperatorFeedback({
        status: 'SUCCESS',
        title: `COMMAND EXECUTED: ${selectedBay.breakerId} (${selectedBay.bayCode}) → ${target}`,
        detail: `MMS CommandTermination+ received. XCBR1.Pos.stVal updated to ${
          target === 'CLOSED' ? '10 (CLOSED)' : '01 (OPEN)'
        } and electrical topology recalculated.`,
        timestamp: ts,
      });
    } else {
      const rejectReason =
        selectedBay.quality !== 'GOOD'
          ? `IED ${selectedBay.iedId} communication offline / quality=${selectedBay.quality}`
          : selectedBay.localRemote === 'LOCAL'
          ? 'Bay 43LR switch is in LOCAL mode (Blocked-by-switching-hierarchy)'
          : selectedBay.interlockReason;

      setOperatorFeedback({
        status: 'REJECTED',
        title: `COMMAND REJECTED: ${selectedBay.breakerId} (${selectedBay.bayCode}) → ${target}`,
        detail: `MMS CommandTermination- — ${rejectReason}`,
        timestamp: ts,
      });
    }
  };

  const handleAcknowledgeSelected = () => {
    const targetId =
      selectedAlarmId || filteredAlarms.find((a) => a.state === 'ACTIVE_UNACK')?.id;
    if (targetId) {
      acknowledgeAlarm(targetId);
    }
  };

  const handleFitToScreen = () => {
    setSldZoom(1.0);
    setSldPanX(0);
    setSldPanY(0);
  };

  const handleResetView = () => {
    setSldZoom(1.0);
    setSldPanX(0);
    setSldPanY(0);
    setVoltageFilter('ALL');
    setPrimaryView('SLD');
  };

  // Group bays for the Main SCADA SLD
  const bay33BusA = bays.filter(
    (b) =>
      b.voltageKv === 33 &&
      b.busSection === 'A' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay33BusB = bays.filter(
    (b) =>
      b.voltageKv === 33 &&
      b.busSection === 'B' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay11BusA = bays.filter(
    (b) =>
      b.voltageKv === 11 &&
      b.busSection === 'A' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );
  const bay11BusB = bays.filter(
    (b) =>
      b.voltageKv === 11 &&
      b.busSection === 'B' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );

  const bus132A = busbars.find((b) => b.id === 'BUS-132-A')!;
  const bus132B = busbars.find((b) => b.id === 'BUS-132-B')!;
  const bus33A = busbars.find((b) => b.id === 'BUS-33-A')!;
  const bus33B = busbars.find((b) => b.id === 'BUS-33-B')!;
  const bus11A = busbars.find((b) => b.id === 'BUS-11-A')!;
  const bus11B = busbars.find((b) => b.id === 'BUS-11-B')!;

  const txT1 = transformers.find((t) => t.id === 'TX-T1')!;
  const txT2 = transformers.find((t) => t.id === 'TX-T2')!;
  const txDt1 = transformers.find((t) => t.id === 'TX-DT1')!;
  const txDt2 = transformers.find((t) => t.id === 'TX-DT2')!;

  // Compute dynamic Center column width based on collapsible left/right drawers
  const centerColSpanClass =
    leftDirectoryCollapsed && rightInspectorCollapsed
      ? 'xl:col-span-12'
      : leftDirectoryCollapsed
      ? 'xl:col-span-9'
      : rightInspectorCollapsed
      ? 'xl:col-span-10'
      : 'xl:col-span-7';

  const selectBayInScada = (bayId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBayId(bayId);
    setPendingSboCommand(null);
    if (rightInspectorCollapsed) setRightInspectorCollapsed(false);
  };

  /**
   * 3D Metallic Beveled Circuit Breaker Symbol ([X])
   * - CLOSED: Bright Crimson Red (#FF2A4B) inner cross & glowing red border
   * - OPEN: Bright Neon Green (#00E676) inner cross & glowing green border
   * Clicking selects the bay in the Right Inspector without auto-toggling.
   */
  const renderScadaCircuitBreakerBox = (bay: BayEquipment, cx: number, cy: number, size = 27) => {
    const isClosed = bay.breakerState === 'CLOSED';
    const isInvalidPos = bay.breakerState === 'INTERMEDIATE' || bay.breakerState === 'BAD';
    const stateColor = bay.protectionTripActive
      ? '#FF5C65'
      : isInvalidPos
      ? '#A855F7'
      : isClosed
      ? '#FF2A4B'
      : '#00E676';
    const innerBg = bay.protectionTripActive
      ? '#450A14'
      : isInvalidPos
      ? '#3B0764'
      : isClosed
      ? '#2B0912'
      : '#05291A';
    const half = size / 2;
    const innerHalf = half - 3.5;
    const crossHalf = innerHalf - 4.2;

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(bay.id, e)}
      >
        <title>{`${bay.breakerId} (${bay.bayCode}): ${bay.breakerState} — Click to select bay in Inspector`}</title>
        <rect
          x={cx - half - 2}
          y={cy - half - 2}
          width={size + 4}
          height={size + 4}
          rx={6.5}
          fill="none"
          stroke={stateColor}
          strokeWidth={1.6}
          opacity={0.45}
        />
        <rect
          x={cx - half}
          y={cy - half}
          width={size}
          height={size}
          rx={5.5}
          fill="url(#scadaCbFrameGrad)"
          stroke="#566B84"
          strokeWidth={1.5}
        />
        <rect
          x={cx - innerHalf}
          y={cy - innerHalf}
          width={innerHalf * 2}
          height={innerHalf * 2}
          rx={3.5}
          fill={innerBg}
          stroke={stateColor}
          strokeWidth={1.8}
        />
        {isInvalidPos ? (
          <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#E9F3FF" fontSize={10} fontWeight="bold">
            ?
          </text>
        ) : (
          <>
            <line
              x1={cx - crossHalf}
              y1={cy - crossHalf}
              x2={cx + crossHalf}
              y2={cy + crossHalf}
              stroke={isClosed ? '#FF3B58' : '#E2FFF0'}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <line
              x1={cx + crossHalf}
              y1={cy - crossHalf}
              x2={cx - crossHalf}
              y2={cy + crossHalf}
              stroke={isClosed ? '#FF3B58' : '#E2FFF0'}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    );
  };

  /**
   * Two-dot hinge Isolator / Disconnector + CT Ring indicator
   */
  const renderScadaIsolatorAndCt = (
    bay: BayEquipment,
    x: number,
    yTop: number,
    yBottom: number,
    liveColor: string
  ) => {
    const isIsoClosed = bay.busDisconnectorState === 'CLOSED';
    const isEnergized = bay.energized && isIsoClosed && bay.breakerState === 'CLOSED';
    const strokeCol = isEnergized ? liveColor : '#334458';

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(bay.id, e)}
      >
        <circle cx={x} cy={yTop} r={2.4} fill={strokeCol} />
        <circle cx={x} cy={yTop + 10} r={2.4} fill={strokeCol} />
        <line
          x1={x}
          y1={yTop + 10}
          x2={isIsoClosed ? x : x - 7}
          y2={yTop + (isIsoClosed ? 0 : 2)}
          stroke={isIsoClosed ? strokeCol : '#00E676'}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle
          cx={x}
          cy={yBottom}
          r={5.5}
          fill="#091322"
          stroke={strokeCol}
          strokeWidth={1.7}
        />
        <circle cx={x} cy={yBottom - 1.5} r={1.3} fill={strokeCol} />
        <circle cx={x} cy={yBottom + 1.8} r={1.3} fill={strokeCol} />
      </g>
    );
  };

  /**
   * High-Readability Vertical Bay Renderer for SCADA SLD
   */
  const renderScadaVerticalBay = (
    bay: BayEquipment,
    x: number,
    yBus: number,
    yEnd: number,
    direction: 'DOWN_FROM_BUS' | 'INTO_BUS_FROM_TOP',
    tierColor: string,
    options?: {
      showTelemetryCard?: boolean;
      dashedHighlight?: boolean;
    }
  ) => {
    const isSelected = selectedBay.id === bay.id;
    const isFilteredOut = voltageFilter !== 'ALL' && bay.voltageKv !== voltageFilter;
    const opacity = isFilteredOut ? 0.22 : 1.0;
    const isBadQuality = bay.quality !== 'GOOD';
    const isEnergized =
      bay.energized && bay.breakerState === 'CLOSED' && bay.busDisconnectorState === 'CLOSED';
    const lineCol = isEnergized ? tierColor : '#334458';
    const glowFilter = !isEnergized
      ? undefined
      : tierColor === '#00D2FF'
      ? 'url(#scadaGlowCyan)'
      : tierColor === '#00E676'
      ? 'url(#scadaGlowGreen)'
      : 'url(#scadaGlowAmber)';

    const topY = Math.min(yBus, yEnd);
    const botY = Math.max(yBus, yEnd);
    const cbY = direction === 'INTO_BUS_FROM_TOP' ? topY + 24 : topY + 30;
    const ctY = cbY + 21;
    const labelY = direction === 'INTO_BUS_FROM_TOP' ? topY + 4 : topY + 12;

    return (
      <g
        key={bay.id}
        opacity={opacity}
        onClick={(e) => selectBayInScada(bay.id, e)}
        className="cursor-pointer"
      >
        {(isSelected || options?.dashedHighlight) && (
          <rect
            x={x - 36}
            y={topY - 8}
            width={72}
            height={botY - topY + (options?.showTelemetryCard ? 54 : 18)}
            rx={6}
            fill="rgba(0, 210, 255, 0.06)"
            stroke="#00D2FF"
            strokeWidth={isSelected ? 1.7 : 1.2}
            strokeDasharray="4 3"
          />
        )}

        <line
          x1={x}
          y1={direction === 'INTO_BUS_FROM_TOP' ? topY + 7 : yBus}
          x2={x}
          y2={cbY - 13}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />
        <line
          x1={x}
          y1={cbY + 13}
          x2={x}
          y2={botY}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />

        {renderScadaIsolatorAndCt(
          bay,
          x,
          direction === 'INTO_BUS_FROM_TOP' ? cbY + 15 : yBus + 4,
          ctY,
          tierColor
        )}

        {renderScadaCircuitBreakerBox(bay, x, cbY, 27)}

        <rect
          x={x - 21}
          y={labelY - 9.5}
          width={42}
          height={12}
          rx={2.5}
          fill="#080E18"
          fillOpacity={0.88}
        />
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fill="#F1F8FF"
          fontSize="10"
          fontWeight="bold"
          fontFamily="Inter, ui-sans-serif, system-ui"
        >
          {bay.bayCode}
        </text>

        {bay.protectionTripActive && (
          <g>
            <rect x={x - 30} y={cbY - 28} width={60} height={13} rx={2.5} fill="#FF5C65" />
            <text x={x} y={cbY - 19} textAnchor="middle" fill="#FFFFFF" fontSize={8.5} fontWeight="bold">
              86 TRIP
            </text>
          </g>
        )}

        {isBadQuality && !bay.protectionTripActive && (
          <g>
            <rect x={x - 32} y={cbY - 28} width={64} height={13} rx={2.5} fill="#FFB547" />
            <text x={x} y={cbY - 19} textAnchor="middle" fill="#050B14" fontSize={8.2} fontWeight="bold">
              Q:{bay.quality}
            </text>
          </g>
        )}

        {(bay.earthSwitchState === 'CLOSED' || bay.id === 'BAY-11-SP1') && (
          <g>
            <line x1={x} y1={ctY + 8} x2={x + 14} y2={ctY + 8} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 14} y1={ctY + 8} x2={x + 14} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 9} y1={ctY + 13} x2={x + 19} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 11} y1={ctY + 16} x2={x + 17} y2={ctY + 16} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 13} y1={ctY + 19} x2={x + 15} y2={ctY + 19} stroke="#FFAB00" strokeWidth={1.6} />
          </g>
        )}

        {options?.showTelemetryCard && (
          <polygon
            points={`${x},${botY + 5} ${x - 4.5},${botY - 3} ${x + 4.5},${botY - 3}`}
            fill={lineCol}
          />
        )}

        {options?.showTelemetryCard && (
          <g transform={`translate(${x - 39}, ${botY + 8})`}>
            <rect
              width={78}
              height={34}
              rx={5}
              fill="#101E33"
              fillOpacity={0.92}
              stroke={
                isSelected
                  ? '#00D2FF'
                  : isBadQuality
                  ? '#FFB547'
                  : isEnergized
                  ? tierColor === '#00E676'
                    ? '#1C5D52'
                    : '#264B6E'
                  : '#223042'
              }
              strokeWidth={isSelected ? 1.6 : 1.1}
            />
            <text
              x={39}
              y={14}
              textAnchor="middle"
              fill={isEnergized ? '#00D2FF' : '#64748B'}
              fontSize="9.5"
              fontWeight="bold"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              {bay.activePowerMw.toFixed(1)} MW
            </text>
            <text
              x={39}
              y={27}
              textAnchor="middle"
              fill={isBadQuality ? '#FFB547' : isEnergized ? '#7CE8A6' : '#64748B'}
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              {bay.currentA.toFixed(0)}A • {bay.localRemote === 'REMOTE' ? 'REM' : 'LOC'}
            </text>
          </g>
        )}
      </g>
    );
  };

  /**
   * Center Bus Coupler Renderer (CB-132, CB-33, CB-11)
   */
  const renderScadaCouplerSvg = (
    bayId: string,
    cx: number,
    cy: number,
    tierColor: string,
    showOpenClosedPills = false
  ) => {
    const bay = bays.find((b) => b.id === bayId);
    if (!bay) return null;
    const isClosed = bay.breakerState === 'CLOSED';

    return (
      <g key={bay.id} onClick={(e) => selectBayInScada(bay.id, e)} className="cursor-pointer">
        <line
          x1={cx - 56}
          y1={cy}
          x2={cx - 15}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={3}
        />
        <line
          x1={cx + 15}
          y1={cy}
          x2={cx + 56}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={3}
        />
        <circle cx={cx - 32} cy={cy} r={2.3} fill={tierColor} />
        <circle cx={cx + 32} cy={cy} r={2.3} fill={tierColor} />

        {showOpenClosedPills && (
          <>
            <g transform={`translate(${cx - 128}, ${cy - 24})`}>
              <rect width={72} height={17} rx={3.5} fill="#091728" stroke="#1E496D" strokeWidth={1} />
              <rect
                x={isClosed ? 34 : 1}
                y={1}
                width={isClosed ? 37 : 33}
                height={15}
                rx={2.5}
                fill={isClosed ? '#3B0D18' : '#083826'}
                stroke={isClosed ? '#FF2A4B' : '#00E676'}
                strokeWidth={0.9}
              />
              <text x={17} y={11.5} textAnchor="middle" fill={!isClosed ? '#00E676' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                OPEN
              </text>
              <text x={52} y={11.5} textAnchor="middle" fill={isClosed ? '#FF4D62' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                CLOSED
              </text>
            </g>

            <g transform={`translate(${cx + 56}, ${cy - 24})`}>
              <rect width={72} height={17} rx={3.5} fill="#091728" stroke="#1E496D" strokeWidth={1} />
              <rect
                x={isClosed ? 34 : 1}
                y={1}
                width={isClosed ? 37 : 33}
                height={15}
                rx={2.5}
                fill={isClosed ? '#3B0D18' : '#083826'}
                stroke={isClosed ? '#FF2A4B' : '#00E676'}
                strokeWidth={0.9}
              />
              <text x={17} y={11.5} textAnchor="middle" fill={!isClosed ? '#00E676' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                OPEN
              </text>
              <text x={52} y={11.5} textAnchor="middle" fill={isClosed ? '#FF4D62' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                CLOSED
              </text>
            </g>
          </>
        )}

        {renderScadaCircuitBreakerBox(bay, cx, cy, 28)}

        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10.5"
          fontWeight="bold"
        >
          {bay.bayCode} ({bay.breakerState})
        </text>

        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fill={bay.interlockPermissive ? '#00E676' : '#FFAB00'}
          fontSize="8.5"
          fontWeight="bold"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {bay.interlockPermissive ? 'CILO: OK' : 'CILO: 2/3 LOCK'}
        </text>
      </g>
    );
  };

  /**
   * Interlocking Dual-Circle 50 MVA Power Transformer (TX-T1 & TX-T2) with Neon Core & Argon Telemetry Cards
   */
  const renderScadaMainPowerTransformer = (
    tx: typeof txT1,
    cx: number,
    cy: number,
    side: 'LEFT' | 'RIGHT',
    hvBayId: string
  ) => {
    const hvColor = tx.energized ? '#00D2FF' : '#334458';
    const lvColor = tx.energized ? '#00E676' : '#334458';
    const gaugeColor = side === 'LEFT' ? '#00D2FF' : '#FFAB00';
    const pct = Math.min(100, Math.max(0, tx.loadPercent));
    const dashLen = (pct / 100) * 88;

    return (
      <g
        key={tx.id}
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(hvBayId, e)}
      >
        {tx.energized && (
          <circle
            cx={cx}
            cy={cy}
            r={34}
            fill="url(#scadaTxCoreAura)"
            pointerEvents="none"
          />
        )}

        <circle
          cx={cx}
          cy={cy - 9}
          r={15.5}
          fill="#091526"
          stroke={hvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#scadaGlowCyan)' : undefined}
        />

        <circle
          cx={cx}
          cy={cy + 10}
          r={15.5}
          fill="#091526"
          stroke={lvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#scadaGlowGreen)' : undefined}
        />

        <line
          x1={cx - 18}
          y1={cy + 18}
          x2={cx + 18}
          y2={cy - 18}
          stroke="#FFAB00"
          strokeWidth={2}
        />
        <polygon
          points={`${cx + 20},${cy - 20} ${cx + 13},${cy - 18} ${cx + 18},${cy - 13}`}
          fill="#FFAB00"
        />

        {tx.energized && (
          <g pointerEvents="none">
            <line x1={cx - 28} y1={cy} x2={cx + 28} y2={cy} stroke="#E0F7FF" strokeWidth={1.2} opacity={0.75} />
            <circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" filter="url(#scadaGlowCyan)" />
          </g>
        )}

        {side === 'LEFT' ? (
          <g transform={`translate(48, ${cy - 34})`}>
            <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
            <circle cx={18} cy={18} r={9} fill="none" stroke="#00D2FF" strokeWidth={2.2} strokeDasharray="36 18" />
            <rect x={34} y={10} width={24} height={3} rx={1.5} fill="#00D2FF" />
            <rect x={34} y={16} width={18} height={3} rx={1.5} fill="#38BDF8" opacity={0.7} />
            <rect x={34} y={22} width={21} height={3} rx={1.5} fill="#00E676" opacity={0.8} />
            {[10, 15, 22, 18, 25, 19, 14, 24, 20, 16, 12].map((bh, idx) => (
              <rect
                key={idx}
                x={8 + idx * 4.8}
                y={58 - bh * 0.85}
                width={3}
                height={bh * 0.85}
                rx={1}
                fill={idx % 3 === 0 ? '#00D2FF' : '#38BDF8'}
              />
            ))}

            <g transform="translate(76, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={34} cy={34} r={20} fill="none" stroke="#1E344E" strokeWidth={4.5} strokeDasharray="88 40" strokeDashoffset="-20" strokeLinecap="round" />
              <circle
                cx={34}
                cy={34}
                r={20}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={4.5}
                strokeDasharray={`${dashLen} 120`}
                strokeDashoffset="-20"
                strokeLinecap="round"
              />
              <line x1={34} y1={34} x2={44} y2={24} stroke="#E2F2FF" strokeWidth={2} strokeLinecap="round" />
              <circle cx={34} cy={34} r={3} fill="#00D2FF" />
              <text x={34} y={58} textAnchor="middle" fill="#94B8D7" fontSize="8" fontFamily="monospace">
                {tx.loadPercent.toFixed(1)}%
              </text>
            </g>

            <g transform="translate(152, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke={tx.differentialTrip || tx.pressureReliefTrip ? '#FF5C65' : '#3B628B'}
                strokeWidth={1.4}
              />
              <text x={10} y={16} fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {tx.id}: 132/33kV 50MVA
              </text>
              <text x={10} y={31} fill="#00D2FF" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                Load: {tx.loadPercent.toFixed(1)}% ({tx.activePowerMw.toFixed(1)} MW)
              </text>
              <text x={10} y={45} fill="#00E676" fontSize="9" fontFamily="monospace">
                OTI: {tx.oilTempC}°C  WTI: {tx.windingTempLvC}°C
              </text>
              <text x={10} y={59} fill="#FFAB00" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                OLTC Tap: {tx.oltcTapPosition} ({tx.coolingStage})
              </text>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'LOWER');
                }}
              >
                <rect x={122} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={129} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">-</text>
              </g>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'RAISE');
                }}
              >
                <rect x={139} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={146} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">+</text>
              </g>
            </g>
          </g>
        ) : (
          <g transform={`translate(${cx + 32}, ${cy - 34})`}>
            <g transform="translate(0, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke={tx.differentialTrip || tx.pressureReliefTrip ? '#FF5C65' : '#3B628B'}
                strokeWidth={1.4}
              />
              <text x={10} y={16} fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {tx.id}: 132/33kV 50MVA
              </text>
              <text x={10} y={31} fill="#00D2FF" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                Load: {tx.loadPercent.toFixed(0)}% ({tx.activePowerMw.toFixed(1)} MW)
              </text>
              <text x={10} y={45} fill="#00E676" fontSize="9" fontFamily="monospace">
                OTI: {tx.oilTempC}°C  WTI: {tx.windingTempLvC}°C
              </text>
              <text x={10} y={59} fill="#FFAB00" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                OLTC Tap: {tx.oltcTapPosition} ({tx.coolingStage})
              </text>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'LOWER');
                }}
              >
                <rect x={122} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={129} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">-</text>
              </g>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'RAISE');
                }}
              >
                <rect x={139} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={146} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">+</text>
              </g>
            </g>

            <g transform="translate(166, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={34} cy={34} r={20} fill="none" stroke="#1E344E" strokeWidth={4.5} strokeDasharray="88 40" strokeDashoffset="-20" strokeLinecap="round" />
              <circle
                cx={34}
                cy={34}
                r={20}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={4.5}
                strokeDasharray={`${dashLen} 120`}
                strokeDashoffset="-20"
                strokeLinecap="round"
              />
              <line x1={34} y1={34} x2={43} y2={25} stroke="#FDE047" strokeWidth={2} strokeLinecap="round" />
              <circle cx={34} cy={34} r={3} fill="#FFAB00" />
              <text x={34} y={58} textAnchor="middle" fill="#FDE047" fontSize="8" fontFamily="monospace">
                {tx.loadPercent.toFixed(1)}%
              </text>
            </g>

            <g transform="translate(242, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={18} cy={18} r={9} fill="none" stroke="#FFAB00" strokeWidth={2.2} strokeDasharray="34 18" />
              <rect x={34} y={10} width={24} height={3} rx={1.5} fill="#FFAB00" />
              <rect x={34} y={16} width={18} height={3} rx={1.5} fill="#FDE047" opacity={0.7} />
              <rect x={34} y={22} width={21} height={3} rx={1.5} fill="#00D2FF" opacity={0.8} />
              <path
                d="M 8 54 L 16 48 L 24 50 L 32 42 L 40 45 L 48 39 L 58 43 L 58 58 L 8 58 Z"
                fill="rgba(255, 171, 0, 0.25)"
              />
              <path
                d="M 8 54 L 16 48 L 24 50 L 32 42 L 40 45 L 48 39 L 58 43"
                fill="none"
                stroke="#FFAB00"
                strokeWidth={1.8}
              />
            </g>
          </g>
        )}
      </g>
    );
  };

  const showSection = (sec: InspectorTab) =>
    inspectorTab === 'All Sections' || inspectorTab === sec;

  return (
    <div
      className={
        isOperatorFullScreen
          ? 'fixed inset-0 z-50 bg-[#050B14] text-[#E9F3FF] p-2.5 flex flex-col overflow-y-auto space-y-2'
          : 'bg-[#050B14] text-[#E9F3FF] p-3 rounded-xl border border-[#142A3C] space-y-3 overflow-x-hidden'
      }
    >
      {/* ==================== 1. TOP SCADA SYSTEM STATUS & TELEMETRY HEADER (#081A30) ==================== */}
      <div className="px-3.5 py-2 rounded-lg bg-[#081A30] border border-[#142A3C] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            <span className="text-xs font-extrabold tracking-wider uppercase text-[#E9F3FF]">
              SCADA / HMI OPERATOR WORKSTATION — 132/33/11 kV
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#0B1D30] border border-[#142A3C] text-[11px] font-mono text-[#00CFFF]">
            MMS: {onlineIedsCount}/{ieds.length} IEDs ONLINE
          </span>
          <span className="px-2 py-0.5 rounded bg-[#0B1D30] border border-[#142A3C] text-[11px] font-mono text-[#22C55E]">
            Import: {totalImportMw.toFixed(1)} MW | {totalImportMvar.toFixed(1)} MVAr | {systemFreqHz.toFixed(2)} Hz
          </span>
        </div>

        {/* Collapsible Drawer Controls & Operator Full Screen Button */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setLeftDirectoryCollapsed((c) => !c)}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 ${
              !leftDirectoryCollapsed
                ? 'bg-[#142A3C] text-[#00CFFF] border-[#00CFFF]/40'
                : 'bg-[#050B14] text-slate-400 border-[#142A3C]'
            }`}
            title="Toggle Left Bay Directory"
          >
            <ChevronLeft className="w-3 h-3" />
            Bay Dir
          </button>

          <button
            type="button"
            onClick={() => setRightInspectorCollapsed((c) => !c)}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 ${
              !rightInspectorCollapsed
                ? 'bg-[#142A3C] text-[#00CFFF] border-[#00CFFF]/40'
                : 'bg-[#050B14] text-slate-400 border-[#142A3C]'
            }`}
            title="Toggle Right Equipment Inspector"
          >
            Inspector
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => setBottomDrawerCollapsed((c) => !c)}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 ${
              !bottomDrawerCollapsed
                ? 'bg-[#142A3C] text-[#00CFFF] border-[#00CFFF]/40'
                : 'bg-[#050B14] text-slate-400 border-[#142A3C]'
            }`}
            title="Toggle Bottom Alarm/SOE/Transformer Console"
          >
            Bottom Console
            {bottomDrawerCollapsed ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleSimulationRunning}
            className={`px-2.5 py-1 rounded font-semibold border ${
              simulationRunning
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                : 'bg-[#FFB547]/15 text-[#FFB547] border-[#FFB547]/40'
            }`}
          >
            {simulationRunning ? 'Sim: LIVE' : 'Sim: PAUSED'}
          </button>

          <button
            type="button"
            onClick={() => setIsOperatorFullScreen((f) => !f)}
            className="px-2.5 py-1 rounded bg-[#168BFF] hover:bg-[#00CFFF] hover:text-slate-950 text-white font-bold flex items-center gap-1 transition"
          >
            {isOperatorFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Exit Operator Full Screen
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Operator Full Screen
              </>
            )}
          </button>
        </div>
      </div>

      {/* ==================== 2. DEDICATED INDUSTRIAL ALARM BANNER ==================== */}
      <div
        className={`px-3.5 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 ${
          unackCount > 0
            ? 'bg-[#FF5C65]/15 border-[#FF5C65] text-[#E9F3FF]'
            : 'bg-[#0B1D30] border-[#142A3C] text-[#E9F3FF]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`p-1.5 rounded ${
              unackCount > 0 ? 'bg-[#FF5C65] text-white animate-pulse' : 'bg-[#22C55E]/20 text-[#22C55E]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span>ISA-18.2 ALARM BANNER</span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#FF5C65] text-[10px] font-mono border border-[#FF5C65]/40">
                CRITICAL: {criticalCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#FFB547] text-[10px] font-mono border border-[#FFB547]/40">
                MAJOR: {majorCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#00CFFF] text-[10px] font-mono border border-[#00CFFF]/40">
                WARN: {warningCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#E9F3FF] text-[10px] font-mono">
                UNACK: {unackCount}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
              {alarms[0]
                ? `[${alarms[0].timestamp.split('T')[1]}] [${alarms[0].severity}] ${alarms[0].bayName} — ${alarms[0].signalName}: ${alarms[0].valueText}`
                : 'System Normal — All 132/33/11 kV protection, transformer, and communication points healthy'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleAcknowledgeSelected}
            className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-[#00CFFF]/40 font-semibold text-xs"
          >
            Acknowledge Selected
          </button>
          <button
            type="button"
            onClick={acknowledgeAllAlarms}
            className="px-2.5 py-1 rounded bg-[#00CFFF] hover:bg-[#168BFF] text-slate-950 font-bold text-xs flex items-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Acknowledge All ({unackCount})
          </button>
          <button
            type="button"
            onClick={clearClearedAlarms}
            className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-slate-800 text-[#E9F3FF] border border-slate-700 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Cleared
          </button>
        </div>
      </div>

      {/* 132 kV Bus Transfer Controller — educational simulation only */}
      <div className="rounded-lg border border-[#1E3A5F] bg-[#081A30] p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold tracking-wider text-[#00CFFF]">132 kV BUS TRANSFER CONTROLLER · CB-132</div>
          <div className="flex gap-2 items-center">
            {(['AUTO', 'MANUAL'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setBusTransferMode(mode)}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${busTransferMode === mode ? 'bg-[#00CFFF] text-[#050B14] border-[#00CFFF]' : 'bg-[#050B14] text-slate-300 border-[#1E3A5F]'}`}>
                {mode}
              </button>
            ))}
            <button type="button" disabled={busTransferMode !== 'MANUAL'} onClick={() => requestBusTransfer()}
              className="px-3 py-1.5 rounded text-xs font-bold bg-[#142A3C] border border-[#1E3A5F] text-[#E9F3FF] disabled:opacity-40">
              Request Transfer
            </button>
          </div>
        </div>
        <div className={`text-xs font-mono ${busTransferStatus === 'SUCCESS' ? 'text-[#22C55E]' : busTransferStatus === 'BLOCKED' ? 'text-[#FFB547]' : 'text-slate-300'}`}>
          {busTransferStatus}: {busTransferMessage}
        </div>
        <div className="text-[10px] text-slate-400">Dead-bus transfer only · healthy alternate source · failed incomer OPEN · CILO1 / 43LR permissives · no automatic paralleling</div>
      </div>


      {/* Operator Command Execution / Rejection Feedback Banner */}
      {operatorFeedback && (
        <div
          className={`px-3.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            operatorFeedback.status === 'REJECTED'
              ? 'bg-[#FF5C65]/15 border-[#FF5C65] text-red-100'
              : operatorFeedback.status === 'SUCCESS'
              ? 'bg-[#22C55E]/15 border-[#22C55E] text-emerald-100'
              : 'bg-[#142A3C] border-[#00CFFF] text-cyan-100'
          }`}
        >
          <div>
            <span className="font-bold mr-2">[{operatorFeedback.title}]</span>
            <span className="font-mono text-[11px]">{operatorFeedback.detail}</span>
          </div>
          <button
            type="button"
            onClick={() => setOperatorFeedback(null)}
            className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[11px] font-bold"
          >
            Close
          </button>
        </div>
      )}

      {/* ==================== 3. MAIN THREE-COLUMN OPERATOR WORKSPACE (COLLAPSIBLE LEFT / CENTER / COLLAPSIBLE RIGHT) ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 flex-1 min-h-0 items-start">
        {/* COLLAPSIBLE LEFT COLUMN (2 Cols): View Navigation, Voltage-Level Filter & Bay Directory */}
        {!leftDirectoryCollapsed && (
          <div className="xl:col-span-2 min-w-0 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-2.5 flex flex-col gap-2.5 xl:max-h-[670px] overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operator Views
              </span>
              <button
                type="button"
                onClick={() => setLeftDirectoryCollapsed(true)}
                className="text-[10px] text-slate-400 hover:text-white"
                title="Collapse Bay Directory"
              >
                ◀ Hide
              </button>
            </div>

            <div className="space-y-1">
              {(
                [
                  ['SLD', '1. Main SCADA SLD'],
                  ['BAY_MATRIX', '2. Bay Status Matrix'],
                  ['TRANSFORMERS', '3. Transformer Monitoring'],
                  ['ALARMS_SOE', '4. Alarm & SOE Console'],
                ] as [ScadaPrimaryView, string][]
              ).map(([viewKey, label]) => (
                <button
                  key={viewKey}
                  type="button"
                  onClick={() => setPrimaryView(viewKey)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold border transition ${
                    primaryView === viewKey
                      ? 'bg-[#168BFF] text-white border-[#00CFFF]'
                      : 'bg-[#050B14] text-slate-300 border-[#142A3C] hover:bg-[#142A3C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Voltage-Level Selection */}
            <div className="space-y-1 pt-2 border-t border-[#142A3C]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Voltage Filter
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(['ALL', 132, 33, 11] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setVoltageFilter(v)}
                    className={`py-1 rounded font-semibold border ${
                      voltageFilter === v
                        ? 'bg-[#00CFFF] text-slate-950 border-[#00CFFF]'
                        : 'bg-[#050B14] text-slate-300 border-[#142A3C] hover:border-slate-600'
                    }`}
                  >
                    {v === 'ALL' ? 'All Levels' : `${v} kV`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Equipment Search & Bay List */}
            <div className="space-y-1.5 pt-2 border-t border-[#142A3C] flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bay Directory ({filteredDirectoryBays.length})
              </div>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={baySearch}
                  onChange={(e) => setBaySearch(e.target.value)}
                  placeholder="Filter bay/CB..."
                  className="w-full pl-6 pr-2 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF] focus:outline-none focus:border-[#00CFFF]"
                />
              </div>

              <div className="max-h-[350px] xl:max-h-[480px] overflow-y-auto space-y-1 pr-0.5">
                {filteredDirectoryBays.map((b) => {
                  const isSel = selectedBay.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBayId(b.id);
                        setPendingSboCommand(null);
                      }}
                      className={`w-full text-left p-1.5 rounded border text-[11px] flex items-center justify-between transition ${
                        isSel
                          ? 'bg-[#142A3C] border-[#00CFFF] text-[#E9F3FF]'
                          : 'bg-[#050B14] border-[#142A3C]/70 text-slate-300 hover:bg-[#142A3C]/50'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="font-bold font-mono text-[11px] text-[#E9F3FF]">
                          {b.bayCode}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {b.activePowerMw.toFixed(1)} MW • {b.currentA.toFixed(0)}A
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          b.protectionTripActive
                            ? 'bg-[#FF5C65] text-white animate-pulse'
                            : b.breakerState === 'CLOSED'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                            : 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                        }`}
                      >
                        {b.breakerState === 'CLOSED' ? 'CLS' : 'OPN'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CENTER COLUMN: Main Interactive 132/33/11 kV SCADA Single-Line Diagram */}
        <div
          className={`${centerColSpanClass} min-w-0 bg-[#0B1D30] border border-[#142A3C] rounded-lg flex flex-col overflow-hidden`}
        >
          {/* Center Workspace Header & Fit-to-Screen / Zoom In / Zoom Out / Reset View Controls */}
          <div className="px-3 py-2 bg-[#081A30] border-b border-[#142A3C] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#00CFFF]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E9F3FF]">
                {primaryView === 'SLD'
                  ? 'PRIMARY SCADA 132 / 33 / 11 kV SINGLE-LINE DIAGRAM'
                  : primaryView === 'BAY_MATRIX'
                  ? 'OPERATOR BAY STATUS MATRIX VIEW'
                  : primaryView === 'TRANSFORMERS'
                  ? 'TRANSFORMER MONITORING OVERVIEW (T1, T2, DT1, DT2)'
                  : 'DEDICATED ALARM & MILLISECOND SOE VIEW'}
              </span>
            </div>

            {primaryView === 'SLD' && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={handleFitToScreen}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold"
                >
                  Fit to Screen
                </button>
                <button
                  type="button"
                  onClick={() => setSldZoom((z) => Math.min(1.6, Number((z + 0.12).toFixed(2))))}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold flex items-center gap-0.5"
                  title="Zoom In SLD"
                >
                  <Plus className="w-3 h-3" /> Zoom In
                </button>
                <span className="px-1.5 font-mono text-[11px] text-[#00CFFF]">
                  {Math.round(sldZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSldZoom((z) => Math.max(0.68, Number((z - 0.12).toFixed(2))))}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold flex items-center gap-0.5"
                  title="Zoom Out SLD"
                >
                  <Minus className="w-3 h-3" /> Zoom Out
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold"
                >
                  Reset View
                </button>
              </div>
            )}
          </div>

          {/* Compact IEC Symbol & Status Colour Legend Bar */}
          {primaryView === 'SLD' && (
            <div className="px-3 py-1.5 bg-[#050B14] border-b border-[#142A3C] flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-400 uppercase">IEC Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444] inline-block" /> CLOSED CB (52a)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm border-2 border-[#22C55E] bg-[#050B14] inline-block" /> OPEN CB (52b)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C65] inline-block" /> TRIPPED CB (86)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#A855F7] inline-block" /> Intermediate/Bad (00/11)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#00CFFF] inline-block" /> 132kV Live
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#22C55E] inline-block" /> 33/11kV Live
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#475569] inline-block" /> De-energized
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1 rounded bg-[#FFB547] text-[#050B14] font-bold text-[9px]">Q:OLD</span> Bad/Old Quality
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">
                Click any Breaker or Bay to inspect &amp; execute SBO controls
              </span>
            </div>
          )}

          {/* Primary Center View Content — Argon Dark-SCADA 132/33/11 kV Interactive SLD Structure */}
          {primaryView === 'SLD' && (
            <div
              className="overflow-auto relative flex items-center justify-center p-1.5 h-[460px] sm:h-[530px] xl:h-[590px]"
              style={{
                background: 'linear-gradient(180deg, #080E18 0%, #0D1625 50%, #080E18 100%)',
              }}
            >
              <svg
                viewBox="0 0 1200 646"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full min-w-[660px] select-none block"
                style={{
                  transform: `scale(${sldZoom}) translate(${sldPanX}px, ${sldPanY}px)`,
                  transformOrigin: 'center center',
                }}
              >
                <defs>
                  <pattern id="scadaMinorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#101D30" strokeWidth="0.6" />
                  </pattern>
                  <pattern id="scadaMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="url(#scadaMinorGrid)" />
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#162840" strokeWidth="1.0" />
                  </pattern>

                  <linearGradient id="scadaCbFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B4D63" />
                    <stop offset="50%" stopColor="#1E2B3C" />
                    <stop offset="100%" stopColor="#0E1622" />
                  </linearGradient>

                  <radialGradient id="scadaTxCoreAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#00E676" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#080E18" stopOpacity="0" />
                  </radialGradient>

                  <filter id="scadaGlowCyan" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="scadaGlowGreen" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="scadaGlowAmber" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect width="1200" height="646" fill="url(#scadaMajorGrid)" />

                {/* ==================== TIER 1: 132 kV TRANSMISSION SWITCHYARD ==================== */}
                <text
                  x="28"
                  y="24"
                  fill="#00D2FF"
                  fontSize="12.5"
                  fontWeight="bold"
                  letterSpacing="0.04em"
                >
                  132 kV TRANSMISSION SWITCHYARD (DOUBLE-SECTION BUSBAR WITH BUS COUPLER CB-132)
                </text>

                {bays.find((b) => b.id === 'BAY-132-L1') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-132-L1')!,
                    215,
                    116,
                    28,
                    'INTO_BUS_FROM_TOP',
                    '#00D2FF'
                  )}
                {bays.find((b) => b.id === 'BAY-132-L2') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-132-L2')!,
                    985,
                    116,
                    28,
                    'INTO_BUS_FROM_TOP',
                    '#00D2FF'
                  )}

                {/* 132 kV BUS SECTION A */}
                {bus132A.energized && (
                  <line x1="48" y1="116" x2="544" y2="116" stroke="#00D2FF" strokeWidth="9" opacity="0.22" />
                )}
                <line
                  x1="48"
                  y1="116"
                  x2="544"
                  y2="116"
                  stroke={bus132A.energized ? '#00D2FF' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus132A.energized ? 'url(#scadaGlowCyan)' : undefined}
                />
                <text x="82" y="106" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  132 kV BUS SECTION A ({bus132A.voltageKvLive.toFixed(1)} kV • {bus132A.frequencyHz.toFixed(2)} Hz)
                </text>

                {/* 132 kV BUS SECTION B */}
                {bus132B.energized && (
                  <line x1="656" y1="116" x2="1152" y2="116" stroke="#00D2FF" strokeWidth="9" opacity="0.22" />
                )}
                <line
                  x1="656"
                  y1="116"
                  x2="1152"
                  y2="116"
                  stroke={bus132B.energized ? '#00D2FF' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus132B.energized ? 'url(#scadaGlowCyan)' : undefined}
                />
                <text x="825" y="106" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  132 kV BUS SECTION B ({bus132B.voltageKvLive.toFixed(1)} kV • {bus132B.frequencyHz.toFixed(2)} Hz)
                </text>

                {renderScadaCouplerSvg('BAY-132-BC', 600, 116, '#00D2FF', true)}

                {bays.find((b) => b.id === 'BAY-132-T1') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-132-T1')!,
                    382,
                    116,
                    190,
                    'DOWN_FROM_BUS',
                    '#00D2FF'
                  )}
                {bays.find((b) => b.id === 'BAY-132-T2') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-132-T2')!,
                    818,
                    116,
                    190,
                    'DOWN_FROM_BUS',
                    '#00D2FF'
                  )}

                {renderScadaMainPowerTransformer(txT1, 382, 212, 'LEFT', 'BAY-132-T1')}
                {renderScadaMainPowerTransformer(txT2, 818, 212, 'RIGHT', 'BAY-132-T2')}

                {/* ==================== TIER 2: 33 kV DISTRIBUTION SECTION ==================== */}
                {bays.find((b) => b.id === 'BAY-33-INC1') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-33-INC1')!,
                    382,
                    314,
                    238,
                    'INTO_BUS_FROM_TOP',
                    '#00E676'
                  )}
                {bays.find((b) => b.id === 'BAY-33-INC2') &&
                  renderScadaVerticalBay(
                    bays.find((b) => b.id === 'BAY-33-INC2')!,
                    818,
                    314,
                    238,
                    'INTO_BUS_FROM_TOP',
                    '#00E676'
                  )}

                {bus33A.energized && (
                  <line x1="42" y1="314" x2="544" y2="314" stroke="#00E676" strokeWidth="9" opacity="0.20" />
                )}
                <line
                  x1="42"
                  y1="314"
                  x2="544"
                  y2="314"
                  stroke={bus33A.energized ? '#00E676' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus33A.energized ? 'url(#scadaGlowGreen)' : undefined}
                />
                <text x="48" y="304" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  33 kV BUS SECTION A ({bus33A.voltageKvLive.toFixed(2)} kV)
                </text>

                {bus33B.energized && (
                  <line x1="656" y1="314" x2="1158" y2="314" stroke="#00E676" strokeWidth="9" opacity="0.20" />
                )}
                <line
                  x1="656"
                  y1="314"
                  x2="1158"
                  y2="314"
                  stroke={bus33B.energized ? '#00E676' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus33B.energized ? 'url(#scadaGlowGreen)' : undefined}
                />
                <text x="892" y="304" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  33 kV BUS SECTION B ({bus33B.voltageKvLive.toFixed(2)} kV)
                </text>

                {renderScadaCouplerSvg('BAY-33-BC', 600, 314, '#00E676', false)}

                {bay33BusA.map((bay, idx) => {
                  const span = 355 / Math.max(1, bay33BusA.length - 1);
                  const bx = 76 + idx * span;
                  return renderScadaVerticalBay(bay, bx, 314, 386, 'DOWN_FROM_BUS', '#00E676', {
                    showTelemetryCard: true,
                  });
                })}

                {bay33BusB.map((bay, idx) => {
                  const span = 365 / Math.max(1, bay33BusB.length - 1);
                  const bx = 685 + idx * span;
                  return renderScadaVerticalBay(bay, bx, 314, 386, 'DOWN_FROM_BUS', '#00E676', {
                    showTelemetryCard: true,
                  });
                })}

                {/* ==================== TIER 3: 33/11 kV STEP-DOWN TRANSFORMERS & 11 kV SWITCHGEAR BOARD ==================== */}
                {[
                  { tx: txDt1, x: 431, y: 448, incId: 'BAY-11-INC1', dashed: true },
                  { tx: txDt2, x: 769, y: 448, incId: 'BAY-11-INC2', dashed: false },
                ].map(({ tx, x, y, incId, dashed }) => {
                  const hvCol = tx.energized ? '#00E676' : '#334458';
                  const lvCol = tx.energized ? '#FFAB00' : '#334458';
                  const incBay = bays.find((b) => b.id === incId);
                  return (
                    <g key={tx.id}>
                      <circle
                        cx={x}
                        cy={y - 7}
                        r={11.5}
                        fill="#091526"
                        stroke={hvCol}
                        strokeWidth={2.4}
                        filter={tx.energized ? 'url(#scadaGlowGreen)' : undefined}
                      />
                      <circle
                        cx={x}
                        cy={y + 7}
                        r={11.5}
                        fill="#091526"
                        stroke={lvCol}
                        strokeWidth={2.4}
                        filter={tx.energized ? 'url(#scadaGlowAmber)' : undefined}
                      />
                      <text
                        x={x - 18}
                        y={y + 4}
                        textAnchor="end"
                        fill="#E8F3FF"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {tx.id} (33/11kV 16MVA - {tx.activePowerMw.toFixed(1)}MW)
                      </text>
                      {incBay &&
                        renderScadaVerticalBay(
                          incBay,
                          x,
                          532,
                          y + 15,
                          'INTO_BUS_FROM_TOP',
                          '#FFAB00',
                          { dashedHighlight: dashed }
                        )}
                    </g>
                  );
                })}

                {bus11A.energized && (
                  <line x1="42" y1="532" x2="544" y2="532" stroke="#FFAB00" strokeWidth="9" opacity="0.20" />
                )}
                <line
                  x1="42"
                  y1="532"
                  x2="544"
                  y2="532"
                  stroke={bus11A.energized ? '#FFAB00' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus11A.energized ? 'url(#scadaGlowAmber)' : undefined}
                />
                <text x="48" y="522" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  11 kV SWITCHGEAR BUS A ({bus11A.voltageKvLive.toFixed(2)} kV)
                </text>

                {bus11B.energized && (
                  <line x1="656" y1="532" x2="1158" y2="532" stroke="#FFAB00" strokeWidth="9" opacity="0.20" />
                )}
                <line
                  x1="656"
                  y1="532"
                  x2="1158"
                  y2="532"
                  stroke={bus11B.energized ? '#FFAB00' : '#334458'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  filter={bus11B.energized ? 'url(#scadaGlowAmber)' : undefined}
                />
                <text x="890" y="522" fill="#F1F8FF" fontSize="11" fontWeight="bold">
                  11 kV SWITCHGEAR BUS B ({bus11B.voltageKvLive.toFixed(2)} kV)
                </text>

                {renderScadaCouplerSvg('BAY-11-BC', 600, 532, '#FFAB00', false)}

                {bay11BusA.map((bay, idx) => {
                  const span = 385 / Math.max(1, bay11BusA.length - 1);
                  const bx = 66 + idx * span;
                  return renderScadaVerticalBay(bay, bx, 532, 598, 'DOWN_FROM_BUS', '#FFAB00', {
                    showTelemetryCard: true,
                  });
                })}

                {bay11BusB.map((bay, idx) => {
                  const span = 365 / Math.max(1, bay11BusB.length - 1);
                  const bx = 685 + idx * span;
                  return renderScadaVerticalBay(bay, bx, 532, 598, 'DOWN_FROM_BUS', '#FFAB00', {
                    showTelemetryCard: true,
                  });
                })}
              </svg>
            </div>
          )}

          {/* Retained Alternative View 2: Bay Status Matrix */}
          {primaryView === 'BAY_MATRIX' && (
            <div className="p-4 space-y-3 overflow-y-auto max-h-[680px]">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {busbars.map((bus) => (
                  <div
                    key={bus.id}
                    className={`p-2 rounded border text-xs ${
                      bus.energized
                        ? 'bg-[#142A3C] border-[#22C55E]/50'
                        : 'bg-[#050B14] border-[#FF5C65]/60'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 truncate">{bus.id}</div>
                    <div className="font-bold text-[#E9F3FF] font-mono mt-0.5">
                      {bus.voltageKvLive.toFixed(2)} kV
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        bus.energized ? 'text-[#22C55E]' : 'text-[#FF5C65]'
                      }`}
                    >
                      {bus.energized ? 'LIVE' : 'DEAD'} • {bus.frequencyHz.toFixed(1)}Hz
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredDirectoryBays.map((bay) => {
                  const isSel = selectedBay.id === bay.id;
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => setSelectedBayId(bay.id)}
                      className={`p-2.5 rounded border text-left transition ${
                        isSel
                          ? 'bg-[#142A3C] border-[#00CFFF] ring-1 ring-[#00CFFF]'
                          : 'bg-[#050B14] border-[#142A3C] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E9F3FF]">{bay.bayCode}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            bay.breakerState === 'CLOSED'
                              ? 'bg-[#EF4444]/20 text-[#EF4444]'
                              : 'bg-[#22C55E]/20 text-[#22C55E]'
                          }`}
                        >
                          {bay.breakerState}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{bay.name}</div>
                      <div className="text-[11px] font-mono text-[#00CFFF] mt-1">
                        {bay.activePowerMw.toFixed(1)} MW | {bay.currentA.toFixed(0)}A
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alternative View 3: Dedicated T1, T2, DT1, DT2 Transformer Monitoring */}
          {primaryView === 'TRANSFORMERS' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[680px]">
              {transformers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-lg bg-[#050B14] border border-[#142A3C] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#142A3C] pb-2">
                    <div>
                      <div className="font-bold text-sm text-[#E9F3FF]">{tx.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Rating: {tx.ratingMva} MVA • Vector: {tx.vectorGroup} • Z={tx.impedancePercent}%
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.energized
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#FF5C65]/20 text-[#FF5C65]'
                      }`}
                    >
                      {tx.energized ? 'ENERGIZED' : 'DE-ENERGIZED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-center bg-[#0B1D30] p-2.5 rounded border border-[#142A3C]">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Active / Reactive</div>
                      <div className="text-[#00CFFF] font-bold">
                        {tx.activePowerMw.toFixed(1)} MW
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tx.reactivePowerMvar.toFixed(1)} MVAr
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Loading / Cooling</div>
                      <div className="text-[#22C55E] font-bold">{tx.loadPercent}%</div>
                      <div className="text-[10px] text-slate-300">{tx.coolingStage}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">OTI / WTI Temp</div>
                      <div className="text-[#FFB547] font-bold">{tx.oilTempC}°C</div>
                      <div className="text-[10px] text-amber-300">WTI: {tx.windingTempLvC}°C</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px]">
                      OLTC Tap: <strong className="text-[#00CFFF]">{tx.oltcTapPosition}</strong> ({tx.oltcMinTap}..{tx.oltcMaxTap})
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'LOWER')}
                        className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-xs font-semibold"
                      >
                        OLTC Lower (-)
                      </button>
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'RAISE')}
                        className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-xs font-semibold"
                      >
                        OLTC Raise (+)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alternative View 4: Full Alarm & SOE Console */}
          {primaryView === 'ALARMS_SOE' && (
            <div className="p-4 space-y-3 overflow-y-auto max-h-[680px] text-xs font-mono">
              <div className="text-xs font-bold text-[#00CFFF] uppercase font-sans">
                Complete Sequence of Events (SOE) — Millisecond Resolution ({filteredSoe.length} Records)
              </div>
              <div className="border border-[#142A3C] rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#081A30] text-slate-300">
                    <tr>
                      <th className="p-2">Timestamp (ms)</th>
                      <th className="p-2">Bay / IED</th>
                      <th className="p-2">Event</th>
                      <th className="p-2">Cause</th>
                      <th className="p-2">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#142A3C] bg-[#050B14]">
                    {filteredSoe.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setInspectedSoeEvent(s)}
                        className="hover:bg-[#142A3C]/50 cursor-pointer"
                      >
                        <td className="p-2 text-[#00CFFF]">{s.timestampMs}</td>
                        <td className="p-2 text-[#E9F3FF] font-sans">
                          {s.bayName} ({s.iedId})
                        </td>
                        <td className="p-2 text-slate-200 font-sans">{s.eventDescription}</td>
                        <td className="p-2 text-[#FFB547]">{s.cause}</td>
                        <td className="p-2 text-emerald-400">{s.quality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE RIGHT COLUMN (4 Cols): Independently Scrollable Compact Equipment Inspector */}
        {!rightInspectorCollapsed && (
          <div className="xl:col-span-3 min-w-0 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 flex flex-col gap-2.5 xl:max-h-[670px] overflow-y-auto">
            {/* Selected Equipment Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#142A3C] pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#00CFFF]/15 text-[#00CFFF] border border-[#00CFFF]/40 text-[10px] font-bold font-mono">
                    {selectedBay.bayCode}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedBay.voltageKv} kV • Bus {selectedBay.busSection} • {selectedBay.iedId}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#E9F3FF] mt-0.5">{selectedBay.name}</h3>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border font-mono ${
                    selectedBay.breakerState === 'CLOSED'
                      ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
                      : 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50'
                  }`}
                >
                  {selectedBay.breakerId}: {selectedBay.breakerState}
                </span>
                <button
                  type="button"
                  onClick={() => setRightInspectorCollapsed(true)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Hide Inspector ▶
                </button>
              </div>
            </div>

            {/* Section Filter Tabs */}
            <div className="flex flex-wrap gap-1 bg-[#050B14] p-1 rounded border border-[#142A3C]">
              {(
                [
                  'All Sections',
                  'Overview',
                  'Measurements',
                  'Controls',
                  'IEC 61850',
                  'Alarms',
                  'SOE',
                ] as InspectorTab[]
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInspectorTab(tab)}
                  className={`py-0.5 px-2 rounded text-[10px] font-bold transition ${
                    inspectorTab === tab
                      ? 'bg-[#00CFFF] text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 1. COMPACT SECTION: EQUIPMENT OVERVIEW */}
            {showSection('Overview') && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-1.5 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#00CFFF]">
                  1. Equipment Overview
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <div className="text-[9.5px] text-slate-400 font-sans">Position</div>
                    <div
                      className={`font-bold ${
                        selectedBay.breakerState === 'CLOSED' ? 'text-[#EF4444]' : 'text-[#22C55E]'
                      }`}
                    >
                      {selectedBay.breakerState}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <div className="text-[9.5px] text-slate-400 font-sans">43LR Mode</div>
                    <div className="font-bold text-[#00CFFF]">{selectedBay.localRemote}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <div className="text-[9.5px] text-slate-400 font-sans">Quality</div>
                    <div
                      className={`font-bold ${
                        selectedBay.quality === 'GOOD' ? 'text-[#22C55E]' : 'text-[#FFB547]'
                      }`}
                    >
                      {selectedBay.quality}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <div className="text-[9.5px] text-slate-400 font-sans">Op Counter</div>
                    <div className="font-bold text-[#E9F3FF]">#{selectedBay.opCounter}</div>
                  </div>
                </div>
                {selectedIed && (
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-300 pt-1">
                    <span>
                      IED: <strong className="text-[#E9F3FF]">{selectedIed.name}</strong> ({selectedIed.model})
                    </span>
                    <span className="text-[#00CFFF]">{selectedIed.ipAddressLanA}</span>
                  </div>
                )}
              </div>
            )}

            {/* 2. COMPACT SECTION: ELECTRICAL MEASUREMENTS */}
            {showSection('Measurements') && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between font-sans">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00CFFF]">
                    2. Electrical Measurements (MMXU1)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    CT:{selectedBay.ctRatio} • VT:{selectedBay.vtRatio}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Active P</span>
                    <strong className="text-[#00CFFF]">{selectedBay.activePowerMw.toFixed(2)} MW</strong>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Reactive Q</span>
                    <strong className="text-[#E9F3FF]">{selectedBay.reactivePowerMvar.toFixed(2)} MVAr</strong>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Apparent S</span>
                    <strong className="text-[#E9F3FF]">{selectedBay.apparentPowerMva.toFixed(2)} MVA</strong>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Ia / Ib / Ic</span>
                    <strong className="text-[#E9F3FF]">{selectedBay.currentA.toFixed(1)} A</strong>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Vab / Vbc / Vca</span>
                    <strong className="text-[#22C55E]">{selectedBay.voltageAbKv.toFixed(2)} kV</strong>
                  </div>
                  <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-[9.5px] text-slate-400 block font-sans">PF / Freq</span>
                    <strong className="text-[#FFB547]">
                      {selectedBay.powerFactor.toFixed(3)} • {selectedBay.frequencyHz.toFixed(2)}Hz
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* 3. COMPACT SECTION: CONTROL AND INTERLOCKING */}
            {showSection('Controls') && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00CFFF]">
                    3. Control &amp; Interlocking (CSWI1 / CILO1)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setBayLocalRemote(
                        selectedBay.id,
                        selectedBay.localRemote === 'REMOTE' ? 'LOCAL' : 'REMOTE'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-[#00CFFF]/40 font-semibold text-[10.5px]"
                  >
                    Switch to {selectedBay.localRemote === 'REMOTE' ? 'LOCAL' : 'REMOTE'}
                  </button>
                </div>

                {/* Supervision Badges */}
                <div className="grid grid-cols-4 gap-1 font-mono text-[10px] text-center">
                  <div className="p-1 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-slate-400 block">Spring</span>
                    <strong className={selectedBay.springCharged ? 'text-[#22C55E]' : 'text-[#FF5C65]'}>
                      {selectedBay.springCharged ? 'CHG' : 'DIS'}
                    </strong>
                  </div>
                  <div className="p-1 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-slate-400 block">74TC</span>
                    <strong className={selectedBay.tcsHealthy ? 'text-[#22C55E]' : 'text-[#FF5C65]'}>
                      {selectedBay.tcsHealthy ? 'OK' : 'FAIL'}
                    </strong>
                  </div>
                  <div className="p-1 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-slate-400 block">110V DC</span>
                    <strong className={selectedBay.dcSupplyHealthy ? 'text-[#22C55E]' : 'text-[#FF5C65]'}>
                      {selectedBay.dcSupplyHealthy ? 'OK' : 'FAIL'}
                    </strong>
                  </div>
                  <div className="p-1 rounded bg-[#0B1D30] border border-[#142A3C]">
                    <span className="text-slate-400 block">SF6 Gas</span>
                    <strong className={selectedBay.sf6PressureNormal ? 'text-[#22C55E]' : 'text-[#FF5C65]'}>
                      {selectedBay.sf6PressureNormal ? 'OK' : 'ALM'}
                    </strong>
                  </div>
                </div>

                {/* CILO Permissive Reason */}
                <div
                  className={`p-2 rounded border text-[10.5px] ${
                    selectedBay.interlockPermissive
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-emerald-200'
                      : 'bg-[#FFB547]/10 border-[#FFB547]/40 text-amber-200'
                  }`}
                >
                  {selectedBay.interlockReason}
                </div>

                {/* SBO Select Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectSbo('CLOSED')}
                    className={`py-1.5 px-2 rounded font-bold text-xs border transition ${
                      pendingSboCommand === 'CLOSED'
                        ? 'bg-[#EF4444] text-white border-white'
                        : 'bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border-[#EF4444]/50'
                    }`}
                  >
                    1. SELECT CLOSE (52-ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSbo('OPEN')}
                    className={`py-1.5 px-2 rounded font-bold text-xs border transition ${
                      pendingSboCommand === 'OPEN'
                        ? 'bg-[#22C55E] text-slate-950 border-white'
                        : 'bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border-[#22C55E]/50'
                    }`}
                  >
                    1. SELECT OPEN (52-OFF)
                  </button>
                </div>

                {pendingSboCommand && (
                  <div className="p-2 rounded bg-[#142A3C] border border-[#00CFFF] space-y-1.5">
                    <div className="text-[10.5px] font-mono text-[#00CFFF]">
                      CONFIRMATION REQUIRED: Operate({pendingSboCommand}) on{' '}
                      <strong>{selectedBay.breakerId}</strong>?
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleConfirmOperate}
                        className="flex-1 py-1 rounded bg-[#00CFFF] hover:bg-[#168BFF] text-slate-950 font-bold text-xs"
                      >
                        2. CONFIRM &amp; OPERATE ({pendingSboCommand})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingSboCommand(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Disconnectors Q1, Q9 & Earth Switch Q8 */}
                <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                  <button
                    type="button"
                    onClick={() =>
                      commandDisconnector(
                        selectedBay.id,
                        'BUS_Q1',
                        selectedBay.busDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                      )
                    }
                    className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] hover:border-[#00CFFF] text-center"
                  >
                    <span className="text-slate-400 block text-[9.5px]">Bus DS Q1</span>
                    <strong
                      className={
                        selectedBay.busDisconnectorState === 'CLOSED' ? 'text-[#EF4444]' : 'text-[#22C55E]'
                      }
                    >
                      {selectedBay.busDisconnectorState}
                    </strong>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commandDisconnector(
                        selectedBay.id,
                        'LINE_Q9',
                        selectedBay.lineDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                      )
                    }
                    className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] hover:border-[#00CFFF] text-center"
                  >
                    <span className="text-slate-400 block text-[9.5px]">Line DS Q9</span>
                    <strong
                      className={
                        selectedBay.lineDisconnectorState === 'CLOSED' ? 'text-[#EF4444]' : 'text-[#22C55E]'
                      }
                    >
                      {selectedBay.lineDisconnectorState}
                    </strong>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commandDisconnector(
                        selectedBay.id,
                        'EARTH_Q8',
                        selectedBay.earthSwitchState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                      )
                    }
                    className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] hover:border-[#FFB547] text-center"
                  >
                    <span className="text-slate-400 block text-[9.5px]">Earth Sw Q8</span>
                    <strong
                      className={
                        selectedBay.earthSwitchState === 'CLOSED' ? 'text-[#FFB547]' : 'text-slate-400'
                      }
                    >
                      {selectedBay.earthSwitchState}
                    </strong>
                  </button>
                </div>
              </div>
            )}

            {/* 4. COMPACT SECTION: PROTECTION AND LOCKOUT */}
            {(showSection('Controls') || showSection('Overview')) && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00CFFF]">
                    4. Protection &amp; Lockout (PTRC1 / RREC1)
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      selectedBay.protectionTripActive
                        ? 'bg-[#FF5C65] text-white animate-pulse'
                        : 'bg-[#22C55E]/15 text-[#22C55E]'
                    }`}
                  >
                    {selectedBay.protectionTripActive ? '86 LOCKOUT ACTIVE' : 'PROTECTION NORMAL'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-300">
                  <span>Active Trip: {selectedBay.activeTripFunctions.join(', ') || 'None'}</span>
                  <span>AR (79): {selectedBay.autoRecloseStatus}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      triggerProtectionTrip(
                        selectedBay.id,
                        selectedBay.voltageKv === 132 && selectedBay.bayType === 'LINE_INCOMER'
                          ? '21 Distance Zone 1'
                          : selectedBay.bayType === 'TRANSFORMER_HV'
                          ? '87T Transformer Differential'
                          : '50/51 Overcurrent'
                      )
                    }
                    className="flex-1 py-1 px-2 rounded bg-[#FF5C65]/20 hover:bg-[#FF5C65]/30 text-[#FF5C65] border border-[#FF5C65]/40 font-semibold text-xs"
                  >
                    Trigger Protection Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => resetProtectionTrip(selectedBay.id)}
                    className="py-1 px-2.5 rounded bg-[#142A3C] hover:bg-slate-700 text-[#E9F3FF] border border-slate-600 font-semibold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset 86
                  </button>
                </div>
              </div>
            )}

            {/* 5. COMPACT SECTION: IEC 61850 DIAGNOSTICS */}
            {showSection('IEC 61850') && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-1 text-[10.5px] font-mono">
                <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#00CFFF]">
                  5. IEC 61850 Diagnostics ({selectedBay.iedId})
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">XCBR1.Pos.stVal:</span>
                  <span className="text-[#E9F3FF] font-bold">
                    {selectedBay.breakerState === 'CLOSED' ? '10 (on/closed)' : '01 (off/open)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CSWI1.Pos (ctlModel):</span>
                  <span className="text-[#00CFFF]">sbo-with-enhanced-security</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CILO1.EnaCls.stVal:</span>
                  <span className={selectedBay.interlockPermissive ? 'text-[#22C55E]' : 'text-[#FF5C65]'}>
                    {String(selectedBay.interlockPermissive)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PTRC1.Tr.general:</span>
                  <span className={selectedBay.protectionTripActive ? 'text-[#FF5C65]' : 'text-[#22C55E]'}>
                    {String(selectedBay.protectionTripActive)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">XSWI1.Pos / XSWI2.Pos:</span>
                  <span className="text-[#E9F3FF]">
                    Q1:{selectedBay.busDisconnectorState} Q9:{selectedBay.lineDisconnectorState} Q8:{selectedBay.earthSwitchState}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MMXU1 (TotW / PPV / A):</span>
                  <span className="text-[#22C55E]">
                    {selectedBay.activePowerMw.toFixed(1)}MW | {selectedBay.voltageAbKv.toFixed(1)}kV | {selectedBay.currentA.toFixed(0)}A
                  </span>
                </div>
              </div>
            )}

            {/* 6. COMPACT SECTION: RECENT EVENTS & ALARMS */}
            {(showSection('Alarms') || showSection('SOE')) && (
              <div className="p-2.5 rounded bg-[#050B14] border border-[#142A3C] space-y-1.5 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00CFFF]">
                    6. Recent Bay Events &amp; Alarms ({selectedBayAlarms.length})
                  </span>
                  <span className="font-mono text-[9.5px] text-slate-400">
                    Click any row to inspect full IEC 61850 ref
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono">
                  {selectedBaySoe.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setInspectedSoeEvent(s)}
                      className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] hover:border-[#00CFFF] cursor-pointer"
                    >
                      <div className="flex justify-between text-[9.5px] text-slate-400">
                        <span className="text-[#00CFFF]">{s.timestampMs.split('T')[1]}</span>
                        <span>{s.cause}</span>
                      </div>
                      <div className="font-sans text-[#E9F3FF] truncate">{s.eventDescription}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== 4. COLLAPSIBLE BOTTOM CONSOLE: TRANSFORMER MONITORING + ALARM/SOE CONSOLE WITH EVENT DETAIL INSPECTOR ==================== */}
      {!bottomDrawerCollapsed && (
        <div className="space-y-3 border-t border-[#1E3A5F] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1"><h3 className="text-sm font-bold tracking-wide text-[#00CFFF]">OPERATIONS CONSOLE</h3><span className="text-[11px] text-slate-400">Transformer telemetry · Alarms · SOE · Trends</span></div>
          {/* Transformer Monitoring Panels (T1, T2, DT1, DT2) with Crisp Tabular Alignment */}
          <div className="bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E9F3FF]">
                Transformer Monitoring Panels (T1 — 50 MVA, T2 — 50 MVA, DT1 — 16 MVA, DT2 — 16 MVA)
              </span>
              <span className="text-[11px] font-mono text-[#00CFFF]">
                Live Simulation Telemetry &amp; OLTC Controls (YLTC1)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {transformers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg bg-[#050B14] border border-[#142A3C] flex flex-col justify-between gap-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#142A3C] pb-1.5">
                    <div>
                      <span className="font-bold text-[#E9F3FF]">{tx.id}</span>
                      <span className="ml-1.5 text-[11px] text-slate-400 font-mono">
                        {tx.hvKv}/{tx.lvKv} kV • {tx.ratingMva} MVA
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold font-mono ${
                        tx.energized
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#FF5C65]/20 text-[#FF5C65]'
                      }`}
                    >
                      {tx.energized ? 'ENERGIZED' : 'DEAD'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center bg-[#0B1D30] p-1.5 rounded border border-[#142A3C] font-mono text-[10.5px]">
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">Active P</div>
                      <div className="font-bold text-[#00CFFF]">{tx.activePowerMw.toFixed(1)} MW</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">Load %</div>
                      <div className="font-bold text-[#22C55E]">{tx.loadPercent.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">OTI / WTI</div>
                      <div className="font-bold text-[#FFB547]">
                        {tx.oilTempC}°/{tx.windingTempLvC}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">OLTC Tap</div>
                      <div className="font-bold text-[#E9F3FF]">Tap {tx.oltcTapPosition}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      Cooling: <strong className="text-[#E9F3FF]">{tx.coolingStage}</strong> • Prot:{' '}
                      <strong
                        className={
                          tx.differentialTrip || tx.buchholzAlarm || tx.pressureReliefTrip
                            ? 'text-[#FF5C65]'
                            : 'text-[#22C55E]'
                        }
                      >
                        {tx.differentialTrip ? '87T TRIP' : tx.buchholzAlarm ? '63B ALM' : 'OK'}
                      </strong>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'LOWER')}
                        className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-slate-600 font-semibold text-[11px]"
                      >
                        Tap -
                      </button>
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'RAISE')}
                        className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-slate-600 font-semibold text-[11px]"
                      >
                        Tap +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Alarm List, SOE Table (with Clickable Event Detail Inspector) & Live Trends */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Active Alarms & Alarm History (4 Cols) */}
            <div className="xl:col-span-4 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase text-[#E9F3FF]">
                    Alarms ({filteredAlarms.length})
                  </span>
                  <div className="flex rounded bg-[#050B14] p-0.5 border border-[#142A3C] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAlarmCategoryFilter('ACTIVE')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        alarmCategoryFilter === 'ACTIVE'
                          ? 'bg-[#00CFFF] text-slate-950'
                          : 'text-slate-400'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlarmCategoryFilter('HISTORY')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        alarmCategoryFilter === 'HISTORY'
                          ? 'bg-[#00CFFF] text-slate-950'
                          : 'text-slate-400'
                      }`}
                    >
                      History
                    </button>
                  </div>
                </div>

                <select
                  value={alarmSeverityFilter}
                  onChange={(e) => setAlarmSeverityFilter(e.target.value)}
                  className="px-2 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF]"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="MAJOR">Major</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredAlarms.map((a) => {
                  const isSel = selectedAlarmId === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAlarmId(a.id);
                        setInspectedAlarmRecord(a);
                      }}
                      className={`p-2 rounded border text-xs cursor-pointer flex items-start justify-between gap-2 ${
                        isSel ? 'ring-1 ring-[#00CFFF]' : ''
                      } ${
                        a.state === 'ACTIVE_UNACK'
                          ? 'bg-[#FF5C65]/15 border-[#FF5C65]'
                          : a.state === 'ACTIVE_ACK'
                          ? 'bg-[#142A3C] border-[#FFB547]/40'
                          : 'bg-[#050B14] border-[#142A3C] opacity-65'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#E9F3FF]">{a.bayName}</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#050B14] text-[#00CFFF] font-mono">
                            {a.severity}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-400">
                            {a.timestamp.split('T')[1]}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-200">{a.signalName}</div>
                        <div className="text-[10px] font-mono text-slate-400 break-all">
                          {a.iec61850Ref} • {a.state}
                        </div>
                      </div>
                      {a.state === 'ACTIVE_UNACK' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlarm(a.id);
                          }}
                          className="px-2 py-1 rounded bg-[#00CFFF] text-slate-950 font-bold text-[10px] shrink-0"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Millisecond Sequence of Events (SOE) Table + Clickable Event Detail Inspector (8 Cols) */}
            <div className="xl:col-span-8 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase text-[#E9F3FF]">
                    Sequence of Events (SOE) — 1 ms Resolution
                  </span>
                  <span className="ml-2 text-[10.5px] text-slate-400">
                    Click any event row to inspect untruncated IEC 61850 details below
                  </span>
                </div>
                <input
                  type="text"
                  value={soeSearch}
                  onChange={(e) => setSoeSearch(e.target.value)}
                  placeholder="Filter SOE by bay, IED, event..."
                  className="px-2.5 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF] w-52"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                {/* Readable 5-Column SOE Table (No Nested Horizontal Scroll) */}
                <div className="lg:col-span-8 max-h-56 overflow-y-auto border border-[#142A3C] rounded bg-[#050B14]">
                  <table className="w-full text-left border-collapse text-[10.5px] font-mono">
                    <thead className="bg-[#081A30] text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-1.5">Timestamp (ms)</th>
                        <th className="p-1.5">Bay / IED</th>
                        <th className="p-1.5">Event</th>
                        <th className="p-1.5">Cause</th>
                        <th className="p-1.5">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#142A3C]">
                      {filteredSoe.map((s) => {
                        const isInspected = inspectedSoeEvent?.id === s.id;
                        return (
                          <tr
                            key={s.id}
                            onClick={() => {
                              setInspectedSoeEvent(s);
                              setInspectedAlarmRecord(null);
                            }}
                            className={`cursor-pointer transition ${
                              isInspected
                                ? 'bg-[#142A3C] text-white'
                                : 'hover:bg-[#142A3C]/40'
                            }`}
                          >
                            <td className="p-1.5 text-[#00CFFF] whitespace-nowrap">
                              {s.timestampMs.split('T')[1] || s.timestampMs}
                            </td>
                            <td className="p-1.5">
                              <div className="text-[#E9F3FF] font-sans font-semibold">
                                {s.bayName}
                              </div>
                              <div className="text-[9.5px] text-slate-400">{s.iedId}</div>
                            </td>
                            <td className="p-1.5 font-sans text-slate-200">
                              {s.eventDescription}
                            </td>
                            <td className="p-1.5 text-[#FFB547] whitespace-nowrap">{s.cause}</td>
                            <td className="p-1.5 text-[#22C55E] whitespace-nowrap">{s.quality}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Clickable SOE / Alarm Complete Detail Inspector (Untruncated IEC 61850 Reference & State) */}
                <div className="lg:col-span-4 p-2.5 rounded bg-[#050B14] border border-[#142A3C] flex flex-col justify-between space-y-2 text-xs">
                  {inspectedAlarmRecord ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#142A3C] pb-1">
                        <span className="text-[10px] font-bold uppercase text-[#FF5C65]">
                          Selected Alarm Detail Inspector
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {inspectedAlarmRecord.severity}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#E9F3FF]">
                        {inspectedAlarmRecord.bayName} ({inspectedAlarmRecord.iedId})
                      </div>
                      <div className="text-[11px] text-slate-200">
                        {inspectedAlarmRecord.signalName}
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] font-mono text-[10px] space-y-1 break-all">
                        <div>
                          <span className="text-slate-400">IEC 61850 Ref: </span>
                          <span className="text-[#00CFFF]">{inspectedAlarmRecord.iec61850Ref}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Value / State: </span>
                          <span className="text-[#FFB547]">{inspectedAlarmRecord.valueText}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">UTC Timestamp: </span>
                          <span className="text-slate-200">{inspectedAlarmRecord.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ) : inspectedSoeEvent ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#142A3C] pb-1">
                        <span className="text-[10px] font-bold uppercase text-[#00CFFF]">
                          SOE Event Detail Inspector
                        </span>
                        <span className="font-mono text-[10px] text-[#22C55E]">
                          Q: {inspectedSoeEvent.quality}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#E9F3FF]">
                        {inspectedSoeEvent.bayName} ({inspectedSoeEvent.iedId})
                      </div>
                      <div className="text-[11px] text-slate-200 leading-snug">
                        {inspectedSoeEvent.eventDescription}
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] font-mono text-[10px] space-y-1 break-all">
                        <div>
                          <span className="text-slate-400">Full IEC 61850 Ref: </span>
                          <span className="text-[#00CFFF]">{inspectedSoeEvent.sourceRef}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Old / New State: </span>
                          <span className="text-[#FFB547]">{inspectedSoeEvent.valueChange}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Cause &amp; UTC Time: </span>
                          <span className="text-slate-200">
                            {inspectedSoeEvent.cause} • {inspectedSoeEvent.timestampMs}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px]">
                      Select any SOE event or alarm row to inspect its complete IEC 61850 reference.
                    </div>
                  )}

                  {/* Compact Station Load Mini-Trend inside Inspector Footer */}
                  <div className="pt-1 border-t border-[#142A3C]">
                    <div className="text-[9.5px] font-bold uppercase text-slate-400 mb-1">
                      Station Load (MW) &amp; 33kV Bus Trend
                    </div>
                    <div className="relative h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#142A3C" />
                          <XAxis dataKey="time" hide />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#050B14',
                              borderColor: '#142A3C',
                              fontSize: 10,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalLoadMw"
                            name="Total MW"
                            stroke="#00CFFF"
                            fill="rgba(0, 207, 255, 0.2)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SCADA / HMI MULTI-PROTOCOL COMMUNICATION STATUS & SIGNAL SOURCE */}
      {(() => {
        const bayIdx = Math.max(0, bays.findIndex((b) => b.id === selectedBay.id));
        const proto = getBayProtocolBreakdown(selectedBay, bayIdx);
        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 23);
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1 text-xs">
            <div
              style={{ backgroundColor: '#061526', borderColor: '#1B4B72' }}
              className="xl:col-span-7 rounded-xl border p-3.5 space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  SCADA Multi-Protocol Communication Status
                </h3>
                <span className="text-[10.5px] font-mono text-[#00CFFF]">
                  All 7 Device Classes Online
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold">
                    <tr>
                      <th className="py-1.5 px-2.5">Device / Connection</th>
                      <th className="py-1.5 px-2.5">Active Protocol</th>
                      <th className="py-1.5 px-2.5">Port / Endpoint</th>
                      <th className="py-1.5 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132E4A] font-mono">
                    {[
                      ['Siemens SIPROTEC 5 IED (7SA87 / 7UT86 / 7SJ85)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['ABB Relion IED (REF615 / RET615 / REC615)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['Schneider MiCOM IED (C264 / P633 / P143)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['GE Multilin IED (850 / D60 / T60)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['33 kV / 11 kV Feeder Energy Meter (PM8000)', 'Modbus TCP', 'TCP Port 502 (Unit ID 1–14)', 'POLLING OK (1000 ms)'],
                      ['Station Gateway to Remote Control Center (RCC)', 'IEC 60870-5-104 (IEC-104)', 'TCP Port 2404 (COA 132)', 'STARTDT ACTIVE'],
                      ['SCADA Server A to Enterprise Historian', 'OPC UA', 'opc.tcp://10.132.10.200:4840', 'SUBSCRIBED (ns=2)'],
                    ].map(([dev, pr, ep, st]) => (
                      <tr key={dev} className="hover:bg-[#0B2540]">
                        <td className="py-1.5 px-2.5 font-sans font-bold text-white">{dev}</td>
                        <td className="py-1.5 px-2.5 font-bold text-[#00CFFF]">{pr}</td>
                        <td className="py-1.5 px-2.5 text-slate-300">{ep}</td>
                        <td className="py-1.5 px-2.5 font-bold text-[#4ADE80]">● {st}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{ backgroundColor: '#061526', borderColor: '#00CFFF' }}
              className="xl:col-span-5 rounded-xl border p-3.5 space-y-2 shadow-lg"
            >
              <div className="border-b border-[#163B5C] pb-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  Selected Equipment Protocol Source &amp; RCC Forwarding ({selectedBay.bayCode})
                </h3>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#00CFFF] font-sans font-bold">
                    1. Primary Station-Bus Acquisition — Circuit Breaker Position
                  </div>
                  <div className="text-white mt-0.5">
                    Protocol: <span className="text-[#4ADE80] font-bold">IEC 61850 MMS (TCP/102)</span> &amp;{' '}
                    <span className="text-[#4ADE80] font-bold">GOOSE (0x88B8)</span>
                  </div>
                  <div className="text-[#77E7FF]">IEC Reference: {proto.mms.statusRef}</div>
                  <div className="text-slate-300">
                    Value: <span className="text-white font-bold">{selectedBay.breakerState}</span> • Quality:{' '}
                    <span className="text-[#4ADE80] font-bold">{selectedBay.quality}</span> • Timestamp: {nowStr}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#D8B4FE] font-sans font-bold">
                    2. Northbound RCC Telecontrol Forwarding (via Station Gateway)
                  </div>
                  <div className="text-white mt-0.5">
                    Protocol: <span className="text-[#D8B4FE] font-bold">IEC 60870-5-104 (TCP/2404 • COA 132)</span>
                  </div>
                  <div className="text-[#D8B4FE]">
                    Status Mapping: {proto.iec104.ioaStatus} • COT=3 (Spontaneous)
                  </div>
                  <div className="text-slate-300">
                    Analog Mapping: {proto.iec104.ioaMeas} ({selectedBay.activePowerMw.toFixed(2)} MW)
                  </div>
                </div>

                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#93C5FD] font-sans font-bold">
                    3. Historian &amp; Feeder Metering Integration
                  </div>
                  <div className="text-slate-300">
                    Metering: <span className="text-[#FDBA74] font-bold">Modbus TCP (Port 502)</span> ({proto.modbus.registers})
                  </div>
                  <div className="text-slate-300 break-all">
                    Historian: <span className="text-[#60A5FA] font-bold">OPC UA</span> ({proto.opcUa.nodeIdStatus})
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
