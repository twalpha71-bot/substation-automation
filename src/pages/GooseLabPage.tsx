import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { GooseControlBlock } from '../types/substation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Radio,
  Settings,
  Table,
  Zap,
} from 'lucide-react';

import { LAB_HW_ASSETS } from '../data/labHardwareAssets';
import { getIedImageByModel } from '../data/iedImageRegistry';

export const GooseLabPage: React.FC = () => {
  const {
    gooseControlBlocks,
    triggerGooseStateChangeBurst,
    setGooseMismatchFault,
  } = useSubstationStore();

  const [selectedGocbId, setSelectedGocbId] = useState<string>(gooseControlBlocks[0]?.id || 'GOCB-132-L1-TRIP');
  const gocb = gooseControlBlocks.find((g) => g.id === selectedGocbId) || gooseControlBlocks[0];

  const [activeTab, setActiveTab] = useState('GOOSE Publisher / Subscriber');

  const faultOptions: { value: GooseControlBlock['mismatchFault']; label: string }[] = [
    { value: 'NONE', label: 'Healthy (No Mismatch)' },
    { value: 'VLAN_MISMATCH', label: 'VLAN ID Mismatch (Drop at Ingress)' },
    { value: 'APPID_MISMATCH', label: 'APPID Mismatch (Ignored by Subscriber)' },
    { value: 'CONFREV_MISMATCH', label: 'confRev Mismatch (Configuration Error)' },
    { value: 'DATASET_MISSING', label: 'Missing DataSet FCDA Member' },
    { value: 'TIMEOUT', label: 'TAL Timeout (2000 ms Expired)' },
  ];

  const macHex = gocb.multicastMac.replace(/-/g, ' ');
  const appIdHex = gocb.appId.replace('0x', '');
  const stHex = gocb.stNum.toString(16).toUpperCase().padStart(4, '0');
  const sqHex = gocb.sqNum.toString(16).toUpperCase().padStart(4, '0');

  const subscriberId = gocb.subscriberIedIds[0] || 'IED-132-BC';
  const isHealthy = gocb.healthy && gocb.mismatchFault === 'NONE';
  const boundExtRefCount = isHealthy
    ? gocb.extRefs.filter((e) => e.bound).length
    : gocb.mismatchFault === 'DATASET_MISSING'
    ? Math.max(0, gocb.extRefs.length - 1)
    : 0;

  // Dynamic Publisher & Subscriber Hardware Assets based on selected GCB
  const publisherImg = getIedImageByModel(gocb.publisherIedName, gocb.publisherIedName);
  const subscriberImg = subscriberId.includes('132-BC') || subscriberId.includes('33-BC')
    ? LAB_HW_ASSETS.ABB_RELION_REF615
    : subscriberId.includes('132-T1')
    ? LAB_HW_ASSETS.SIEMENS_7UT86
    : LAB_HW_ASSETS.ABB_RELION_REF615;

  // Fault-specific Communication Flow Status Message (Section 3)
  const commFlowStatusText = (() => {
    if (isHealthy) return '✓ Multicast delivered - Binding valid';
    switch (gocb.mismatchFault) {
      case 'VLAN_MISMATCH':
        return `✕ VLAN ${gocb.vlanId} Mismatch - Rejected at Switch Ingress`;
      case 'APPID_MISMATCH':
        return `✕ APPID ${gocb.appId} Mismatch - Subscriber Filter Drop`;
      case 'CONFREV_MISMATCH':
        return `✕ confRev Mismatch (Expected 1, Rx ${gocb.confRev + 1}) - ndsCom=1`;
      case 'DATASET_MISSING':
        return '✕ Missing DataSet FCDA Member - ExtRef Unbound';
      case 'TIMEOUT':
        return `✕ Communication Interrupted - TAL (${gocb.timeAllowedToLiveMs} ms) Expired`;
      default:
        return `✕ GOOSE Fault: ${gocb.mismatchFault}`;
    }
  })();

  const Panel = ({
    title,
    icon,
    children,
    className = '',
  }: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) => (
    <section
      style={{
        backgroundColor: '#07192C',
        borderColor: '#1B4B72',
        boxShadow: 'inset 0 1px 0 rgba(0, 217, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.35)',
      }}
      className={`rounded-xl border p-3.5 flex flex-col justify-between ${className}`}
    >
      <div>
        <h3 className="mb-2.5 border-b border-[#163B5C] pb-2 text-xs sm:text-[13px] font-extrabold text-white flex items-center gap-1.5">
          {icon}
          <span>{title}</span>
        </h3>
        {children}
      </div>
    </section>
  );

  const DetailRow = ({
    label,
    value,
    valueColor = '#E9F3FF',
  }: {
    label: string;
    value: React.ReactNode;
    valueColor?: string;
  }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '104px minmax(0, 1fr)',
        alignItems: 'center',
        borderBottom: '1px solid #122E49',
        padding: '3px 0',
      }}
      className="goose-detail-row text-[11.5px] last:border-0"
    >
      <span className="text-[#9BC0DF] font-medium">{label}</span>
      <span style={{ color: valueColor }} className="break-all text-right font-mono font-bold">
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#030B18', color: '#E9F3FF' }} className="goose-compact space-y-2 pb-3 text-xs select-none">
      <style>{`
        .goose-compact .goose-equipment-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.16fr) minmax(0,1fr); gap:9px; align-items:stretch; }
        .goose-compact .goose-device-grid { display:grid; grid-template-columns:40% minmax(0,1fr); gap:8px; align-items:center; }
        .goose-compact .goose-device-image {height:152px!important; min-width:0; max-width:100%; overflow:hidden; position:relative;}
        .goose-compact .goose-device-image img {display:block!important; width:100%!important; height:128px!important; max-width:100%!important; max-height:128px!important; min-height:0!important; min-width:0!important; object-fit:contain!important; object-position:center!important; flex-shrink:1!important;}
        .goose-compact .goose-switch-image {display:block!important;width:100%!important;height:115px!important;max-height:115px!important;max-width:110px!important;object-fit:contain!important;object-position:center!important;}
        .goose-compact .goose-equipment-grid > div {min-width:0;}
        .goose-compact .goose-mid-grid {display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;align-items:stretch;}
        .goose-compact .goose-mid-grid > .goose-mid-row {display:contents;}
        .goose-compact .goose-mid-grid > .goose-mid-row > div {min-width:0;grid-column:auto!important;width:100%;}
        .goose-compact .goose-mid-grid > .goose-mid-row > div > section {height:100%;min-width:0;padding:10px!important;}
        .goose-compact .goose-mid-grid > .goose-mid-row > div > section h3 {font-size:11px!important;line-height:1.3;margin-bottom:7px;padding-bottom:7px;}
        .goose-compact .goose-mid-grid .goose-detail-row {font-size:10px!important;grid-template-columns:74px minmax(0,1fr)!important;}
        .goose-compact .goose-mid-grid .goose-detail-row span {overflow-wrap:anywhere;}
        .goose-compact .goose-mid-grid .goose-mid-row .grid-cols-2 button {padding:7px 4px!important;font-size:10px!important;}
        .goose-compact .goose-mid-grid table {font-size:10px;}
        .goose-compact .goose-mid-grid table td,.goose-compact .goose-mid-grid table th {padding:5px 3px!important;}
        .goose-compact .goose-mid-grid .goose-mid-row {gap:0!important;}
        .goose-compact .goose-equipment-grid > div {height:250px;min-height:0;}
        .goose-compact .goose-equipment-grid > div > .goose-device-body {flex:1;min-height:0;}
        .goose-compact .goose-equipment-grid .goose-detail-row {font-size:10px!important;grid-template-columns:80px minmax(0,1fr)!important;padding:3px 0!important;}
        .goose-compact .goose-equipment-grid .goose-detail-row span {overflow-wrap:anywhere;}
        .goose-compact .goose-equipment-grid .goose-device-image {height:142px!important;}
        .goose-compact .goose-equipment-grid .goose-device-image img {height:122px!important;max-height:122px!important;}
        .goose-compact .goose-equipment-grid .goose-switch-image {height:105px!important;max-height:105px!important;}
        .goose-compact .goose-equipment-grid .goose-flow-tag {font-size:9px;line-height:1.35;padding:4px 6px;}
        .goose-compact .goose-bottom-grid {display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1.55fr) minmax(0,1.2fr);gap:9px;}
        .goose-compact .goose-bottom-grid > div {min-width:0;grid-column:auto!important;}
        .goose-compact .goose-bottom-grid > div > section {height:100%;padding:10px!important;}
        @media(max-width:1250px){.goose-compact .goose-mid-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:900px){.goose-compact .goose-mid-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.goose-compact .goose-bottom-grid{grid-template-columns:1fr 1fr}.goose-compact .goose-equipment-grid{grid-template-columns:1fr!important}.goose-compact .goose-equipment-grid>div{height:auto;min-height:225px}}
        @media(max-width:650px){.goose-compact .goose-mid-grid,.goose-compact .goose-bottom-grid{grid-template-columns:1fr}}
        .goose-compact .goose-mid-grid .goose-mid-row .goose-detail-row {grid-template-columns:90px minmax(0,1fr)!important;}
        .goose-compact .goose-flow-track {height:5px; flex:1; position:relative; border-radius:12px; background:linear-gradient(90deg,#005d6b,#00f4cb,#005d6b); box-shadow:0 0 11px #00e9c6; overflow:visible;}
        .goose-compact .goose-flow-track::before {content:'';position:absolute;inset:-8px 0;background:repeating-linear-gradient(90deg,transparent 0 20px,#7affcf 21px 27px,transparent 28px 42px);clip-path:polygon(0 36%,100% 36%,100% 65%,0 65%);animation:goose-packets 1.25s linear infinite;filter:drop-shadow(0 0 5px #54ffbb);}
        .goose-compact .goose-flow-track::after {content:'➤  ➤  ➤';position:absolute;left:0;right:0;top:-11px;color:#7affbf;font-size:19px;letter-spacing:10px;white-space:nowrap;overflow:hidden;animation:goose-packets 1.25s linear infinite;}
        .goose-compact .goose-flow-track.goose-flow-fault {background:linear-gradient(90deg,#bd3b42,#ff5666);box-shadow:0 0 9px #f43f5e;}
        .goose-compact .goose-flow-track.goose-flow-fault::before,.goose-compact .goose-flow-track.goose-flow-fault::after {animation-play-state:paused;color:#ff6576;filter:none;opacity:.4;}
        .goose-compact .goose-flow-track.goose-flow-timeout::before,.goose-compact .goose-flow-track.goose-flow-timeout::after {display:none;}
        .goose-compact .goose-flow-tag {padding:5px 7px;border:1px solid #00d9da;border-radius:7px;background:#002c3b;color:#90fff3;font:700 10px/1.5 monospace;text-align:left;}
        @keyframes goose-packets {from{background-position:0 0;transform:translateX(-8px)}to{background-position:42px 0;transform:translateX(8px)}}
        
        @media(max-width:680px){.goose-compact .goose-mid-grid{grid-template-columns:1fr}.goose-compact .goose-equipment-grid{grid-template-columns:1fr!important}}
        
        @media(prefers-reduced-motion:reduce){.goose-compact .goose-flow-track::before,.goose-compact .goose-flow-track::after{animation:none}}
      `}</style>
      {/* 1. TOP HEADER BAR Matching Image 1 */}
      <div
        style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
      >
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-white">
            GOOSE Lab — IEC 61850-8-1
          </h2>
          <p className="text-xs text-[#9BC0DF] mt-0.5">
            Publisher / Subscriber Configuration · State Change Simulation · Packet Analysis &amp; Troubleshooting
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span
            style={{
              backgroundColor: isHealthy ? '#06291E' : '#3B0D15',
              borderColor: isHealthy ? '#22C55E' : '#FF5C65',
              color: isHealthy ? '#4ADE80' : '#FDA4AF',
            }}
            className="rounded-lg border px-3 py-1.5"
          >
            ● {isHealthy ? 'Simulation: HEALTHY' : `Simulation: FAULT (${gocb.mismatchFault})`}
          </span>
          <span
            style={{ backgroundColor: '#082038', borderColor: '#1E5280', color: '#77E7FF' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            stNum {gocb.stNum} · sqNum {gocb.sqNum}
          </span>
          <span
            style={{ backgroundColor: '#06291E', borderColor: '#22C55E', color: '#4ADE80' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            GOOSE L2 · 0x88B8
          </span>
        </div>
      </div>

      {/* 2. SIX NAVIGATION TABS ROW Matching Image 1 */}
      <div
        style={{ backgroundColor: '#061628', borderColor: '#194164' }}
        className="flex flex-wrap gap-2 rounded-xl border p-2"
      >
        {[
          'GOOSE Publisher / Subscriber',
          'GOOSE Packet Viewer',
          'State Change & Retransmission',
          'Fault Injection Lab',
          'Wireshark Analysis',
          'Troubleshooting Guide',
        ].map((t) => {
          const active = activeTab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setActiveTab(t);
                document
                  .getElementById(t.replace(/[^a-z]/gi, '-'))
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                backgroundColor: active ? '#00D9FF' : '#0B2138',
                color: active ? '#03101E' : '#DCEAF5',
                borderColor: active ? '#00F0FF' : '#1E486E',
                boxShadow: active ? '0 0 14px rgba(0, 217, 255, 0.45)' : 'none',
              }}
              className="rounded-lg border px-3.5 py-1.5 text-xs font-extrabold transition hover:border-[#00CFFF]"
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* 3. THREE MAIN EQUIPMENT PANELS: Publisher IED -> GOOSE Communication Flow (Switch) -> Subscriber IED */}
      <div
        id="GOOSE-Publisher---Subscriber"
        style={{
          backgroundColor: '#051324',
          borderColor: '#1B4B72',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.45)',
        }}
        className="rounded-xl border p-2"
      >
        <div
          style={{
            gap: '9px',
            alignItems: 'stretch',
          }}
          className="goose-equipment-grid"
        >
          {/* PANEL A: Publisher IED */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: '#00CFFF',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-2.5 flex flex-col justify-between min-w-0 overflow-hidden"
          >
            <div className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-white">
              <Radio className="w-4 h-4 text-[#00CFFF]" />
              <span>
                Publisher IED ({gocb.publisherIedId})
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,43%) minmax(0,1fr)',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#173C5E',
                  boxShadow: '0 0 14px rgba(0, 207, 255, 0.12)',
                }}
                className="goose-device-image rounded-lg border p-2 flex items-center justify-center"
              >
                <img
                  src={publisherImg}
                  alt={`Publisher IED ${gocb.publisherIedName}`}
                  style={{ width: '100%', height: 128, maxHeight: 128, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              <div className="pr-1 min-w-0">
                <div
                  style={{ color: gocb.mismatchFault === 'TIMEOUT' ? '#FF5C65' : '#4ADE80' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {gocb.mismatchFault === 'TIMEOUT' ? 'TX INTERRUPTED' : 'GOOSE PUBLISHING'}
                </div>
                <DetailRow label="GCB" value={gocb.gocbName} />
                <DetailRow label="APPID" value={gocb.appId} />
                <DetailRow label="VLAN / Priority" value={`${gocb.vlanId} / P${gocb.vlanPriority}`} />
                <DetailRow label="Multicast MAC" value={gocb.multicastMac} />
                <DetailRow label="confRev" value={gocb.confRev} />
                <DetailRow label="DataSet" value={gocb.datSet} />
              </div>
            </div>
          </div>

          {/* PANEL B: animated real simulation-driven Publisher -> Switch -> Subscriber */}
          <div className="rounded-xl border border-[#00CFFF] bg-[#071B2F] p-2.5 flex flex-col items-center justify-between text-center min-w-0 overflow-hidden">
            <div className="text-sm font-extrabold text-white flex items-center gap-2"><Layers className="h-4 w-4 text-cyan-400"/>GOOSE Communication Flow</div>
            <div className="text-[10px] text-[#9BC0DF]">IEC 61850-8-1 · L2 Ethernet Multicast · 0x88B8</div>
            <div className="flex items-start justify-between gap-2 w-full my-2">
              <div className="goose-flow-tag">GOOSE (L2)<br/>APPID: {gocb.appId}<br/>VLAN: {gocb.vlanId}<br/>stNum: {gocb.stNum} · sqNum: {gocb.sqNum}</div>
              <div className="goose-flow-tag">{isHealthy ? '✓ SUBSCRIBED' : '⚠ FAULT'}<br/>confRev: {gocb.confRev}<br/>ExtRef: {boundExtRefCount}/{gocb.extRefs.length}</div>
            </div>
            <div className="flex items-center w-full gap-1.5 min-w-0">
              <div className={`goose-flow-track ${gocb.mismatchFault === 'TIMEOUT' ? 'goose-flow-timeout' : ''}`} aria-label="GOOSE frames from publisher to switch"/>
              <div className="shrink-0 w-[92px] sm:w-[112px] flex flex-col items-center min-w-0 overflow-hidden">
                <img src={LAB_HW_ASSETS.INDUSTRIAL_SWITCH} alt="Industrial Ethernet station-bus switch" className="goose-switch-image"/>
                <span className="text-[10px] font-bold text-white">Station-Bus Switch</span>
                <span className="text-[10px] text-cyan-300">VLAN {gocb.vlanId}</span>
              </div>
              <div className={`goose-flow-track ${isHealthy ? '' : 'goose-flow-fault'} ${gocb.mismatchFault === 'TIMEOUT' ? 'goose-flow-timeout' : ''}`} aria-label="GOOSE frames from switch to subscriber"/>
            </div>
            <div className={`w-full mt-2 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isHealthy ? 'border-green-600 bg-green-950 text-green-300' : 'border-red-600 bg-red-950 text-red-300'}`} role="status">{commFlowStatusText}</div>
          </div>

          {/* PANEL C: Subscriber IED */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-2.5 flex flex-col justify-between min-w-0 overflow-hidden"
          >
            <div className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-white">
              <Radio className="w-4 h-4 text-[#00CFFF]" />
              <span>
                Subscriber IED ({subscriberId})
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,43%) minmax(0,1fr)',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#173C5E',
                  boxShadow: '0 0 14px rgba(0, 207, 255, 0.12)',
                }}
                className="goose-device-image rounded-lg border p-2 flex items-center justify-center"
              >
                <img
                  src={subscriberImg}
                  alt={`Subscriber IED ${subscriberId} ABB Relion REF615`}
                  style={{ width: '100%', height: 128, maxHeight: 128, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              <div className="pr-1 min-w-0">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'GOOSE RECEIVING' : 'SUBSCRIPTION FAULT'}
                </div>
                <DetailRow label="GCB" value={gocb.gocbName} />
                <DetailRow label="Source MAC" value={gocb.multicastMac} />
                <DetailRow
                  label="APPID"
                  value={gocb.mismatchFault === 'APPID_MISMATCH' ? `${gocb.appId} (Mismatch)` : gocb.appId}
                  valueColor={gocb.mismatchFault === 'APPID_MISMATCH' ? '#FF5C65' : '#E9F3FF'}
                />
                <DetailRow
                  label="VLAN ID"
                  value={gocb.mismatchFault === 'VLAN_MISMATCH' ? `${gocb.vlanId} (Dropped)` : gocb.vlanId}
                  valueColor={gocb.mismatchFault === 'VLAN_MISMATCH' ? '#FF5C65' : '#E9F3FF'}
                />
                <DetailRow
                  label="ExtRef"
                  value={`${boundExtRefCount}/${gocb.extRefs.length} bound`}
                  valueColor={boundExtRefCount === gocb.extRefs.length ? '#E9F3FF' : '#FFB547'}
                />
                <DetailRow
                  label="Status"
                  value={isHealthy ? 'VALID' : gocb.mismatchFault}
                  valueColor={isHealthy ? '#4ADE80' : '#FF5C65'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Five compact simulation/configuration panels */}
      <div className="goose-mid-grid">
      <div className="goose-mid-row grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <Panel
            title="GOOSE Control Block (Publisher) Configuration"
            icon={<Settings className="w-4 h-4 text-[#00CFFF]" />}
            className="h-full"
          >
            <div className="space-y-2">
              <label className="block text-[11.5px] text-[#9BC0DF] font-semibold">
                Select GOOSE Control Block
              </label>
              <select
                value={gocb.id}
                onChange={(e) => setSelectedGocbId(e.target.value)}
                style={{ backgroundColor: '#040F1D', borderColor: '#1E5280', color: '#FFFFFF' }}
                className="w-full rounded-lg border px-3 py-2 text-xs font-bold"
              >
                {gooseControlBlocks.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.gocbName} : {g.publisherIedId}
                  </option>
                ))}
              </select>
              <div className="pt-1">
                <DetailRow label="Publisher IED" value={gocb.publisherIedName} />
                <DetailRow label="GCB Reference" value={gocb.gocbRef} valueColor="#38BDF8" />
                <DetailRow label="DataSet" value={gocb.datSet} valueColor="#38BDF8" />
                <DetailRow label="APPID" value={gocb.appId} />
                <DetailRow label="VLAN / Priority" value={`${gocb.vlanId} / ${gocb.vlanPriority}`} />
                <DetailRow label="ConfRev" value={gocb.confRev} />
              </div>
              <p className="text-[11px] text-[#8BB3D4] pt-1">
                Configuration values are read from the simulation store. Select another GCB to inspect its actual configuration.
              </p>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel
            title="Subscriber ExtRef Binding & DataSet"
            icon={<Table className="w-4 h-4 text-[#00CFFF]" />}
            className="h-full"
          >
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-[#173B5C]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ backgroundColor: '#0C2742' }} className="text-[#9BC0DF] font-bold">
                    <tr>
                      <th className="py-2 px-2.5">Subscriber</th>
                      <th className="py-2 px-2.5">Internal Address</th>
                      <th className="py-2 px-2.5 text-right">Binding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132E4A] bg-[#04101E]">
                    {gocb.extRefs.map((er, i) => {
                      const rowValid =
                        isHealthy && er.bound && !(gocb.mismatchFault === 'DATASET_MISSING' && i === 1);
                      return (
                        <tr key={i}>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-white">{er.subscriberIedId}</td>
                          <td className="py-2.5 px-2.5 font-mono text-[#38BDF8] break-all">{er.intAddr}</td>
                          <td
                            style={{ color: rowValid ? '#4ADE80' : '#FF5C65' }}
                            className="py-2.5 px-2.5 text-right font-extrabold"
                          >
                            {rowValid ? 'VALID' : 'FAULT'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{ backgroundColor: '#04101E', borderColor: '#153452' }}
                className="rounded-lg border p-2.5 text-xs"
              >
                <span className="text-[#9BC0DF] font-semibold">Published DataSet: </span>
                <span className="break-all font-mono font-bold text-[#38BDF8]">{gocb.datSet}</span>
              </div>
            <details className="mt-2 rounded-md border border-[#1B4B72] bg-[#04101E] px-2 py-1.5 text-[10px]">
              <summary className="cursor-pointer font-bold text-cyan-300">Subscriber Binding Status · {isHealthy ? 'BOUND (VALID)' : 'FAULT'} · {boundExtRefCount}/{gocb.extRefs.length} ExtRefs</summary>
              <div className="mt-2 space-y-1">
                <DetailRow label="Subscriber IEDs" value={gocb.subscriberIedIds.join(', ')} />
                <DetailRow label="Source MAC" value={gocb.multicastMac} />
                <DetailRow label="APPID / VLAN" value={`${gocb.appId} / ${gocb.vlanId}`} />
                <DetailRow label="ConfRev" value={gocb.confRev} />
                <DetailRow label="Last Tx" value={gocb.lastTxTimestamp} />
              </div>
            </details>
            </div>
          </Panel>
        </div>

      </div>

      {/* 5. LOWER INTERACTIVE SIMULATION, RETRANSMISSION, FAULT INJECTION & WIRESHARK PANELS */}
      <div className="goose-mid-row grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div id="State-Change---Retransmission" className="xl:col-span-4">
          <Panel title="▶ State Change Simulation" className="h-full">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGooseMismatchFault(gocb.id, 'NONE')}
                className="rounded-lg border border-emerald-600 bg-emerald-900/50 p-3 text-xs font-extrabold text-emerald-300 hover:bg-emerald-900/70 transition"
              >
                ✓ Healthy / Reset Fault
              </button>
              <button
                type="button"
                onClick={() => triggerGooseStateChangeBurst(gocb.id)}
                className="rounded-lg border border-rose-500 bg-rose-900/50 p-3 text-xs font-extrabold text-rose-200 hover:bg-rose-900/70 transition"
              >
                ⚡ Trigger State Change (stNum+1)
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Trigger the simulator&apos;s real state-change burst. The store increments stNum, resets sqNum to 0, and initiates MinTime retransmission.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded bg-[#020d19] border border-[#163856] p-2 text-center">
                <div className="text-xs text-slate-400">stNum</div>
                <div className="text-lg font-extrabold text-cyan-300 font-mono">{gocb.stNum}</div>
              </div>
              <div className="rounded bg-[#020d19] border border-[#163856] p-2 text-center">
                <div className="text-xs text-slate-400">sqNum</div>
                <div className="text-lg font-extrabold text-cyan-300 font-mono">{gocb.sqNum}</div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel title="◷ GOOSE Retransmission (IEC 61850-8-1)" className="h-full">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['T0', '1000 ms'],
                ['MinTime (T1)', `${gocb.minTimeMs} ms`],
                ['TAL', `${gocb.timeAllowedToLiveMs} ms`],
                ['MaxTime', `${gocb.maxTimeMs} ms`],
                ['stNum', String(gocb.stNum)],
                ['sqNum', String(gocb.sqNum)],
              ].map(([a, b]) => (
                <div key={a} className="rounded border border-[#245273] bg-[#020d19] p-2">
                  <div className="text-[11px] text-slate-400">{a}</div>
                  <div className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">{b}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-12 items-end justify-between border-b border-cyan-500 px-2">
              {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                <div key={v} className="flex flex-col items-center gap-1">
                  <span className="h-5 w-1.5 bg-rose-500 rounded-t" />
                  <span className="text-[10px] text-slate-400 font-mono">T{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Exponential retransmission timing (T1=4ms, T2=8ms, T3=16ms ... T0=1000ms) upon GOOSE data-change event.
            </p>
          </Panel>
        </div>

        <div id="Fault-Injection-Lab" className="xl:col-span-4">
          <Panel title="⚠ Fault Injection Scenarios" className="h-full">
            <div className="space-y-1.5">
              {faultOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGooseMismatchFault(gocb.id, opt.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-2 text-left text-xs font-semibold transition ${
                    gocb.mismatchFault === opt.value
                      ? 'border-cyan-400 bg-cyan-950/60 text-white'
                      : 'border-[#24415d] bg-[#020d19] text-slate-300 hover:border-cyan-600'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full border ${
                      gocb.mismatchFault === opt.value ? 'border-cyan-300 bg-cyan-400' : 'border-slate-500'
                    }`}
                  />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      </div>
      <div className="goose-bottom-grid">
        <div id="GOOSE-Packet-Viewer" className="xl:col-span-4">
          <Panel title="⌁ GOOSE Live Monitoring" className="h-full">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                ['stNum', gocb.stNum],
                ['sqNum', gocb.sqNum],
                ['confRev', gocb.confRev],
              ].map(([a, b]) => (
                <div key={a} className="rounded border border-emerald-700 bg-emerald-950/30 p-2 text-center">
                  <div className="text-[11px] text-emerald-400">{a}</div>
                  <div className="text-lg font-bold text-white font-mono">{b}</div>
                </div>
              ))}
            </div>
            <DetailRow label="GOOSE Control Block" value={gocb.gocbName} />
            <DetailRow label="Last Transmitted" value={gocb.lastTxTimestamp} />
            <DetailRow label="Health" value={isHealthy ? 'SUBSCRIBED OK' : 'FAULT'} valueColor={isHealthy ? '#4ADE80' : '#FF5C65'} />
            <DetailRow label="Simulation / Test" value={String(gocb.testMode)} />
            <DetailRow label="ndsCom" value={String(gocb.ndsCom || gocb.mismatchFault === 'CONFREV_MISMATCH')} />
          </Panel>
        </div>

        <div id="Wireshark-Analysis" className="xl:col-span-5">
          <Panel title="▤ Wireshark-Style GOOSE Packet Dissector" className="h-full">
            <div className="max-h-[240px] overflow-auto rounded border border-[#24415d] bg-[#020811] p-3 font-mono text-[11px] leading-5">
              <div className="text-cyan-300">▾ Frame / Ethernet II · Layer-2 GOOSE Multicast</div>
              <div className="pl-3">Destination MAC: {gocb.multicastMac}</div>
              <div className="text-amber-400">
                ▾ IEEE 802.1Q Virtual LAN · VID: {gocb.vlanId} · Priority: {gocb.vlanPriority} (0x8100)
              </div>
              <div className="text-cyan-300">▾ IEC 61850-8-1 GOOSE PDU · EtherType 0x88B8</div>
              <div className="pl-3">APPID: {gocb.appId}</div>
              <div className="pl-3 break-all">gocbRef: {gocb.gocbRef}</div>
              <div className="pl-3">timeAllowedToLive: {gocb.timeAllowedToLiveMs} ms</div>
              <div className="pl-3 break-all">datSet: {gocb.datSet}</div>
              <div className="pl-3">stNum: {gocb.stNum} · sqNum: {gocb.sqNum}</div>
              <div className="pl-3">confRev: {gocb.confRev} · test: {String(gocb.testMode)} · ndsCom: {String(gocb.ndsCom)}</div>
              <div className="mt-2 border-t border-slate-700 pt-2 text-[10px] text-slate-400">{`0000  ${macHex} 00 1B 1B 61 85 11 81 00`}</div>
              <div className="text-[10px] text-slate-400">{`0010  88 B8 ${appIdHex} 00 82 ${stHex} ${sqHex}`}</div>
            </div>
          </Panel>
        </div>

        <div id="Troubleshooting-Guide" className="xl:col-span-3">
          <Panel title="✓ Result & Diagnostics" className="h-full">
            <div className="space-y-2.5">
              {[
                ['GOOSE Publishing', gocb.mismatchFault !== 'TIMEOUT'],
                ['Station-Bus VLAN Forwarding', gocb.mismatchFault !== 'VLAN_MISMATCH'],
                ['APPID & confRev Match', gocb.mismatchFault !== 'APPID_MISMATCH' && gocb.mismatchFault !== 'CONFREV_MISMATCH'],
                ['ExtRef FCDA Binding', boundExtRefCount === gocb.extRefs.length],
                ['TAL Watchdog Timer', gocb.mismatchFault !== 'TIMEOUT'],
              ].map(([name, ok]) => (
                <div key={String(name)} className="flex items-center justify-between gap-2 border-b border-[#24415d] pb-2 text-xs">
                  <span className="text-slate-200">{name}</span>
                  <span className={ok ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>
                    {ok ? '✓ OK' : '⚠ CHECK'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {isHealthy
                ? 'Publisher and subscriber Layer-2 multicast bindings are healthy.'
                : `Active diagnostic alert: ${commFlowStatusText}`}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
