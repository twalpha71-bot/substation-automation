import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import {
  Activity,
  CheckCircle2,
  Database,
  FileText,
  FolderTree,
  Layers,
  Monitor,
  RefreshCw,
  Search,
  Server,
  Terminal,
  Wifi,
} from 'lucide-react';

import { LAB_HW_ASSETS } from '../data/labHardwareAssets';
import { getIedImageByModel } from '../data/iedImageRegistry';

export const MmsLabPage: React.FC = () => {
  const {
    ieds,
    selectedIedId,
    setSelectedIedId,
    toggleRcbEnabled,
    triggerMmsGeneralInterrogation,
    soeLog,
  } = useSubstationStore();

  // Default to IED_33_F03 (SIPROTEC 5 7SJ85) if available, matching Section 7 reference table
  const defaultMmsIed =
    ieds.find((i) => i.name.includes('33_F03') || i.id.includes('33-F03')) || ieds[0];
  const [localSelectedIedId, setLocalSelectedIedId] = useState<string>(defaultMmsIed.id);
  const selectedIed =
    ieds.find((i) => i.id === localSelectedIedId) ||
    ieds.find((i) => i.id === selectedIedId) ||
    defaultMmsIed;

  const [selectedLdInst, setSelectedLdInst] = useState<string>(
    selectedIed.logicalDevices[0]?.ldInst || 'Application'
  );
  const [integrityCounter, setIntegrityCounter] = useState<number>(14);
  const [activeTab, setActiveTab] = useState('MMS Client / Server');
  const [rcbKind, setRcbKind] = useState<'BRCB' | 'URCB'>('BRCB');
  const [selectedRcbName, setSelectedRcbName] = useState('');
  const [nodeSearch, setNodeSearch] = useState('');
  const [selectedNodeKey, setSelectedNodeKey] = useState('');
  const [operationResult, setOperationResult] = useState('Ready to browse MMS data over ISO/IEC 9506 (TCP Port 102).');
  const [lastGiCount, setLastGiCount] = useState(0);
  const [readCounter, setReadCounter] = useState(0);
  const [writeRequested, setWriteRequested] = useState(false);
  const [manualDisconnect, setManualDisconnect] = useState<boolean>(false);

  const isMmsAssociated = selectedIed.mmsConnected && !manualDisconnect;

  const currentLd =
    selectedIed.logicalDevices.find((ld) => ld.ldInst === selectedLdInst) ||
    selectedIed.logicalDevices[0];

  const nodes = currentLd?.logicalNodes || [];
  const selectedNode = nodes.find((ln) => `${ln.lnClass}${ln.lnInst}` === selectedNodeKey) || nodes[0];
  const allObjects = selectedNode?.dataObjects || [];
  const allRcbs = selectedIed.rcbs || [];
  const visibleRcbs = allRcbs.filter((r) => (rcbKind === 'BRCB' ? r.buffered : !r.buffered));
  const selectedRcb = allRcbs.find((r) => r.name === selectedRcbName) || visibleRcbs[0] || allRcbs[0];
  const filteredNodes = nodes.filter((ln) =>
    `${ln.lnClass}${ln.lnInst} ${ln.dataObjects.map((o) => o.doName).join(' ')}`
      .toLowerCase()
      .includes(nodeSearch.toLowerCase())
  );

  const panel =
    'rounded-xl border border-[#1B4B72] bg-[#07192C] shadow-[inset_0_1px_0_rgba(0,217,255,0.08),0_4px_16px_rgba(0,0,0,0.35)]';
  const title =
    'flex items-center gap-2 border-b border-[#163B5C] px-3.5 py-2.5 text-xs sm:text-[13px] font-extrabold text-white';
  const cell = 'rounded-lg border border-[#1E466E] bg-[#04101E] p-2.5';

  const doGi = () => {
    if (!isMmsAssociated) {
      setOperationResult(`GI rejected: MMS association with ${selectedIed.name} is currently DISCONNECTED.`);
      return;
    }
    triggerMmsGeneralInterrogation(selectedIed.id);
    setLastGiCount((n) => n + 1);
    setOperationResult(`GI requested for ${selectedIed.name} (${selectedRcb?.rptId || 'all enabled RCBs'}) — reports delivered over TCP/102.`);
  };

  const doRead = () => {
    if (!isMmsAssociated) {
      setOperationResult(`MMS Read failed: Association with ${selectedIed.name} is DISCONNECTED.`);
      return;
    }
    setReadCounter((n) => n + 1);
    setOperationResult(
      `MMS Read (GetDataValues): ${selectedIed.name}${currentLd?.ldInst}/${selectedNode?.lnClass}${selectedNode?.lnInst} — retrieved ${allObjects.length} Data Objects.`
    );
  };

  const chooseIed = (id: string) => {
    setLocalSelectedIedId(id);
    setSelectedIedId(id);
    const i = ieds.find((d) => d.id === id);
    setSelectedLdInst(i?.logicalDevices[0]?.ldInst || 'Application');
    setSelectedNodeKey('');
    setSelectedRcbName('');
  };

  // Dynamic MMS Server IED Hardware Asset based on selected target IED vendor
  const serverRelayImg = getIedImageByModel(selectedIed.vendor, selectedIed.model);

  // Format IP to match reference table (10.132.10.21 for IED_33_F03 or configured IP)
  const displayServerIp =
    selectedIed.name === 'IED_33_F03' ? '10.132.10.21' : selectedIed.ipAddressLanA;

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
        gridTemplateColumns: '88px minmax(0, 1fr)',
        alignItems: 'center',
        borderBottom: '1px solid #122E49',
        padding: '4.5px 0',
      }}
      className="text-[11.5px] last:border-0"
    >
      <span className="text-[#9BC0DF] font-medium">{label}</span>
      <span style={{ color: valueColor }} className="break-all text-right font-mono font-bold">
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#030B18', color: '#E9F3FF' }} className="space-y-3 pb-5 text-xs select-none">
      {/* 1. TOP HEADER BAR Matching Image 2 & Section 6 */}
      <header
        style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
      >
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-white">
            MMS &amp; RCB Lab — IEC 61850-8-1
          </h2>
          <p className="text-xs text-[#9BC0DF] mt-0.5">
            MMS Client / Server · Logical Device &amp; Data Model · BRCB / URCB · General Interrogation · Diagnostics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span
            style={{ backgroundColor: '#06291E', borderColor: '#22C55E', color: '#4ADE80' }}
            className="rounded-lg border px-3 py-1.5"
          >
            ● Simulation: LIVE
          </span>
          <button
            type="button"
            onClick={() => setManualDisconnect((prev) => !prev)}
            title="Click to toggle MMS Client/Server TCP:102 Association"
            style={{
              backgroundColor: isMmsAssociated ? '#06291E' : '#3B0D15',
              borderColor: isMmsAssociated ? '#22C55E' : '#FF5C65',
              color: isMmsAssociated ? '#4ADE80' : '#FDA4AF',
            }}
            className="rounded-lg border px-3 py-1.5 font-bold transition hover:brightness-110"
          >
            MMS Association: {isMmsAssociated ? 'CONNECTED' : 'DISCONNECTED'}
          </button>
          <span
            style={{ backgroundColor: '#082038', borderColor: '#1E5280', color: '#77E7FF' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            TCP Port: 102
          </span>
        </div>
      </header>

      {/* 2. FIVE NAVIGATION TABS ROW */}
      <div
        style={{ backgroundColor: '#061628', borderColor: '#194164' }}
        className="grid grid-cols-2 gap-2 md:grid-cols-5 rounded-xl border p-2"
      >
        {[
          'MMS Client / Server',
          'IEC 61850 Data Model',
          'Report Control Blocks (BRCB / URCB)',
          'General Interrogation (GI)',
          'Logs & Diagnostics',
        ].map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                document
                  .getElementById(
                    tab.includes('Data Model')
                      ? 'mms-data-model'
                      : tab.includes('Report Control')
                      ? 'mms-rcb'
                      : tab.includes('Interrogation')
                      ? 'mms-gi'
                      : tab.includes('Logs')
                      ? 'mms-diagnostics'
                      : 'mms-client'
                  )
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                backgroundColor: active ? '#00D9FF' : '#0B2138',
                color: active ? '#03101E' : '#DCEAF5',
                borderColor: active ? '#00F0FF' : '#1E486E',
                boxShadow: active ? '0 0 14px rgba(0, 217, 255, 0.45)' : 'none',
              }}
              className="rounded-lg border px-2.5 py-2 text-xs font-extrabold transition hover:border-[#00CFFF]"
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. THREE MAIN MMS EQUIPMENT PANELS: MMS Server (IED) <-> Industrial Ethernet Switch <-> MMS Client (SCADA / HMI) */}
      <section
        id="mms-client"
        style={{
          backgroundColor: '#051324',
          borderColor: '#1B4B72',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.45)',
        }}
        className="rounded-xl border p-3"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.12fr 0.88fr 1.12fr',
            gap: '12px',
            alignItems: 'stretch',
          }}
          className="min-w-[860px] overflow-x-auto"
        >
          {/* PANEL 1: MMS Server — Realistic Siemens SIPROTEC 5 7SJ85 IED (Section 7) */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isMmsAssociated ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-white">
              <Server className="w-4 h-4 text-[#00CFFF]" />
              <span>MMS Server ({selectedIed.name})</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '46% 54%',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#173C5E',
                  boxShadow: '0 0 14px rgba(0, 207, 255, 0.12)',
                }}
                className="rounded-lg border p-2 flex items-center justify-center h-[188px]"
              >
                <img
                  src={serverRelayImg}
                  alt={`${selectedIed.vendor} ${selectedIed.model} MMS Server Relay`}
                  style={{ maxHeight: '172px', width: '100%', objectFit: 'contain' }}
                />
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isMmsAssociated ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isMmsAssociated ? 'MMS SERVER ONLINE' : 'MMS SERVER DISCONNECTED'}
                </div>
                <DetailRow label="IED" value={selectedIed.name} />
                <DetailRow label="IP" value={displayServerIp} valueColor="#38BDF8" />
                <DetailRow label="TCP Port" value="102" />
                <DetailRow label="Model" value={selectedIed.model} />
                <DetailRow label="Role" value="MMS Server" />
                <DetailRow
                  label="Status"
                  value={isMmsAssociated ? 'ONLINE' : 'DISCONNECTED'}
                  valueColor={isMmsAssociated ? '#4ADE80' : '#FF5C65'}
                />
              </div>
            </div>
          </div>

          {/* PANEL 2: MMS Communication Flow — Industrial Ethernet Switch (Section 8) */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isMmsAssociated ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col items-center justify-between text-center"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-white">
                <Layers className="w-4 h-4 text-[#00CFFF]" />
                <span>MMS Communication Flow</span>
              </div>
              <div className="text-[11px] text-[#DCEAF5] font-semibold mt-1">
                MMS Client (SCADA) ⇄ Ethernet Switch ⇄ MMS Server (IED)
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-2.5 my-2">
              <span
                style={{
                  color: isMmsAssociated ? '#22C55E' : '#FF5C65',
                  textShadow: isMmsAssociated ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
                }}
                className="text-lg font-black shrink-0"
              >
                {isMmsAssociated ? '⇄' : '✕'}
              </span>

              <div
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#194368',
                  boxShadow: '0 0 14px rgba(0, 207, 255, 0.14)',
                }}
                className="rounded-lg border px-2.5 py-2 flex-1 flex items-center justify-center"
              >
                <img
                  src={LAB_HW_ASSETS.INDUSTRIAL_SWITCH}
                  alt="Siemens SCALANCE / Industrial Station-Bus Switch"
                  style={{ maxHeight: '70px', width: '100%', objectFit: 'contain' }}
                />
              </div>

              <span
                style={{
                  color: isMmsAssociated ? '#22C55E' : '#FF5C65',
                  textShadow: isMmsAssociated ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
                }}
                className="text-lg font-black shrink-0"
              >
                {isMmsAssociated ? '⇄' : '✕'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#06213A',
                borderColor: '#00CFFF',
                color: '#FFFFFF',
              }}
              className="w-full rounded-lg border py-1.5 px-2.5 text-xs font-extrabold tracking-wide shadow-[0_0_10px_rgba(0,207,255,0.2)]"
            >
              IEC 61850 MMS — TCP Port 102
            </div>

            <div
              style={{ color: isMmsAssociated ? '#4ADE80' : '#FDA4AF' }}
              className="text-[11.5px] font-extrabold tracking-wide mt-1"
            >
              Association | Read | Write | GI | Reports
            </div>
          </div>

          {/* PANEL 3: MMS Client — Realistic SCADA/HMI Dual-Monitor Workstation (Section 9) */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isMmsAssociated ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-white">
              <Monitor className="w-4 h-4 text-[#00CFFF]" />
              <span>MMS Client (SCADA / HMI)</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48% 52%',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#173C5E',
                  boxShadow: '0 0 14px rgba(0, 207, 255, 0.12)',
                }}
                className="rounded-lg border p-2 flex items-center justify-center h-[188px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCADA_WORKSTATION}
                  alt="Dual-Monitor SCADA Server A Workstation"
                  style={{ maxHeight: '172px', width: '100%', objectFit: 'contain' }}
                  className="rounded"
                />
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isMmsAssociated ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isMmsAssociated ? 'MMS CLIENT ACTIVE' : 'ASSOCIATION CLOSED'}
                </div>
                <DetailRow label="Client" value="SCADA Server A" />
                <DetailRow label="IP" value="10.132.10.200" valueColor="#38BDF8" />
                <DetailRow label="Role" value="MMS Client" />
                <DetailRow
                  label="Association"
                  value={isMmsAssociated ? 'ASSOCIATED' : 'DISCONNECTED'}
                  valueColor={isMmsAssociated ? '#4ADE80' : '#FF5C65'}
                />
                <DetailRow
                  label="GI State"
                  value={lastGiCount > 0 ? `COMPLETED (#${lastGiCount})` : 'IDLE'}
                  valueColor={lastGiCount > 0 ? '#77E7FF' : '#E9F3FF'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LOWER WORKING MMS & RCB PANELS (Preserved & Connected to Store) */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-3">
          <section className={panel}>
            <h3 className={title}>
              <Server className="h-4 w-4 text-cyan-300" /> Select Target IED / MMS Server
            </h3>
            <div className="p-3 space-y-2">
              <select
                aria-label="Select MMS server"
                value={selectedIed.id}
                onChange={(e) => chooseIed(e.target.value)}
                className="w-full rounded-lg border border-[#39708f] bg-[#020e1c] p-2 text-xs font-bold text-white"
              >
                {ieds.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} — {i.model} ({i.name === 'IED_33_F03' ? '10.132.10.21' : i.ipAddressLanA}:102)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setManualDisconnect((prev) => !prev)}
                className={`w-full rounded-lg border py-1.5 px-2.5 text-xs font-bold transition ${
                  isMmsAssociated
                    ? 'border-rose-600/80 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                    : 'border-emerald-600 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60'
                }`}
              >
                {isMmsAssociated ? 'Disconnect MMS Association' : 'Reconnect MMS Association (TCP:102)'}
              </button>
            </div>
          </section>

          <section className={panel}>
            <h3 className={title}>
              <Wifi className="h-4 w-4 text-cyan-300" /> MMS Association Status
            </h3>
            <div className="space-y-2 p-3">
              <div
                className={`rounded-md border px-2 py-2 text-center font-bold ${
                  isMmsAssociated
                    ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400'
                    : 'border-red-700 bg-red-900/30 text-red-400'
                }`}
              >
                {isMmsAssociated ? '✓ ASSOCIATED (ISO COTP OK)' : '● DISCONNECTED'}
              </div>
              {[
                ['Server IP', displayServerIp],
                ['Client IP', '10.132.10.200'],
                ['TCP Port', '102'],
                ['PDU Size', '65,000 Bytes'],
                ['Keep Alive', isMmsAssociated ? 'Active (10 s)' : 'Stopped'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 text-xs">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={panel}>
            <h3 className={title}>
              <Terminal className="h-4 w-4 text-cyan-300" /> MMS Operations (Client)
            </h3>
            <div className="grid grid-cols-4 gap-1.5 p-3">
              {[
                ['Read', 'Get'],
                ['Write', 'Set'],
                ['GI', 'General Int.'],
                ['Report', 'Start/Stop'],
              ].map(([label, sub]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    label === 'Read'
                      ? doRead()
                      : label === 'GI'
                      ? doGi()
                      : label === 'Report'
                      ? selectedRcb
                        ? toggleRcbEnabled(selectedIed.id, selectedRcb.name)
                        : setOperationResult('No RCB configured.')
                      : (setWriteRequested(true),
                        setOperationResult(
                          'Write (SetDataValues) verified access permissions and FC=[CO]/[SP] control model.'
                        ))
                  }
                  className={`rounded-lg border border-cyan-700 px-1 py-3 text-center text-xs font-bold transition ${
                    label === 'Read'
                      ? 'bg-[#00d9ff] text-slate-950'
                      : 'bg-[#0d3555] text-white hover:bg-[#15517c]'
                  }`}
                >
                  {label}
                  <span className="mt-1 block text-[10px] font-normal">{sub}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section id="mms-data-model" className={`${panel} min-w-0 xl:col-span-5`}>
          <h3 className={title}>
            <FolderTree className="h-4 w-4 text-cyan-300" /> Logical Node / Data Object / Data Attribute Browser
          </h3>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-5">
            <div className="min-w-0 rounded-lg border border-[#285b78] bg-[#020e1b] p-2 md:col-span-2">
              <div className="mb-2 text-xs font-bold text-cyan-300">IED: {selectedIed.name}</div>
              {selectedIed.logicalDevices.map((ld) => (
                <button
                  key={ld.ldInst}
                  type="button"
                  onClick={() => {
                    setSelectedLdInst(ld.ldInst);
                    setSelectedNodeKey('');
                  }}
                  className={`mb-1 block w-full rounded px-2 py-1.5 text-left text-xs font-semibold ${
                    currentLd?.ldInst === ld.ldInst
                      ? 'bg-cyan-800/60 text-white'
                      : 'text-slate-400 hover:bg-[#10243a]'
                  }`}
                >
                  ▸ LD: {ld.ldInst}
                </button>
              ))}
              <div className="relative my-2">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={nodeSearch}
                  onChange={(e) => setNodeSearch(e.target.value)}
                  placeholder="Search LN / DO"
                  className="w-full rounded border border-[#285b78] bg-[#0a2439] py-1.5 pl-7 pr-2 text-xs text-white"
                />
              </div>
              <div className="max-h-[255px] overflow-y-auto">
                {filteredNodes.map((ln) => (
                  <div key={`${ln.lnClass}${ln.lnInst}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedNodeKey(`${ln.lnClass}${ln.lnInst}`)}
                      className={`w-full rounded px-2 py-1.5 text-left text-xs font-semibold ${
                        selectedNode === ln
                          ? 'bg-cyan-600/40 text-cyan-200'
                          : 'text-slate-300 hover:bg-[#12334d]'
                      }`}
                    >
                      ▸ {ln.lnClass}
                      {ln.lnInst}
                    </button>
                    {selectedNode === ln &&
                      ln.dataObjects.map((o) => (
                        <div key={o.doName} className="pl-4 text-[11px] text-slate-400">
                          ◇ {o.doName}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-2 md:col-span-3">
              <div className={cell}>
                <div className="mb-2 break-all font-mono text-xs font-bold text-cyan-300">
                  {selectedIed.name}
                  {currentLd?.ldInst}/{selectedNode?.lnClass}
                  {selectedNode?.lnInst}
                </div>
                <div className="max-h-[230px] overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#123653] text-slate-200">
                      <tr>
                        <th className="p-1.5">Data Object</th>
                        <th>FC</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allObjects.map((o) => (
                        <React.Fragment key={o.doName}>
                          <tr className="border-t border-[#25445b]">
                            <td className="p-1.5 font-semibold text-white">{o.doName}</td>
                            <td className="font-mono text-amber-300">{o.fc}</td>
                            <td className="break-all font-mono text-emerald-400">{String(o.value)}</td>
                          </tr>
                          {o.attributes.map((a) => (
                            <tr
                              key={`${o.doName}.${a.daName}`}
                              className="border-t border-[#1d384d] text-[11px] text-slate-300"
                            >
                              <td className="pl-4 font-mono">.{a.daName}</td>
                              <td className="font-mono">{a.fc}</td>
                              <td className="break-all font-mono">{String(a.val)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={cell}>
                <div className="mb-1 font-bold text-cyan-300">
                  {selectedNode?.lnClass}
                  {selectedNode?.lnInst} — IEC 61850 Model
                </div>
                <p className="text-xs text-slate-300">
                  Select a Logical Node to inspect its Data Objects, Functional Constraints, attributes and simulated values.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div id="mms-rcb" className="space-y-3 xl:col-span-4">
          <section className={panel}>
            <h3 className={title}>
              <Database className="h-4 w-4 text-cyan-300" /> Report Control Blocks on {selectedIed.name}
            </h3>
            <div className="p-3">
              <div className="mb-2 grid grid-cols-2 gap-2">
                {(['BRCB', 'URCB'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setRcbKind(k);
                      setSelectedRcbName('');
                    }}
                    className={`rounded-md border px-2 py-2 font-bold text-xs ${
                      rcbKind === k
                        ? 'border-cyan-400 bg-[#00d9ff] text-slate-950'
                        : 'border-[#326080] bg-[#0b2944] text-white'
                    }`}
                  >
                    {k} ({k === 'BRCB' ? 'Buffered' : 'Unbuffered'})
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#123653]">
                    <tr>
                      {['RCB Name', 'DataSet', 'TrgOps', 'IntgPd', 'RptEna'].map((h) => (
                        <th key={h} className="p-1.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRcbs.map((r) => (
                      <tr
                        key={r.name}
                        onClick={() => setSelectedRcbName(r.name)}
                        className={`cursor-pointer border-b border-[#244661] ${
                          selectedRcb?.name === r.name ? 'bg-cyan-900/40' : 'hover:bg-[#10334f]'
                        }`}
                      >
                        <td className="p-1.5 font-mono font-bold text-cyan-300">{r.name}</td>
                        <td className="font-mono">{r.datSet}</td>
                        <td className="font-mono">{r.trgOps.join(', ')}</td>
                        <td className="font-mono">{r.intgPdMs} ms</td>
                        <td>
                          <span className={r.enabled ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
                            {r.enabled ? 'ON' : 'OFF'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleRcbs.length === 0 && (
                  <p className="p-3 text-xs text-slate-400">No {rcbKind} configured for this IED.</p>
                )}
              </div>
            </div>
          </section>

          <section className={panel}>
            <h3 className={title}>
              <Activity className="h-4 w-4 text-cyan-300" /> Selected RCB Configuration
            </h3>
            <div className="space-y-2 p-3">
              {selectedRcb ? (
                <>
                  <div className="font-bold text-cyan-300 font-mono">{selectedRcb.name}</div>
                  {[
                    ['Report ID', selectedRcb.rptId],
                    ['DataSet', selectedRcb.datSet],
                    ['Trigger Options', selectedRcb.trgOps.join(', ')],
                    ['Integrity Period', `${selectedRcb.intgPdMs} ms`],
                    ['Buffer Time', `${selectedRcb.bufTimeMs} ms`],
                    ['Report Enabled', String(selectedRcb.enabled)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-[#21415b] py-1 text-xs">
                      <span className="text-slate-400">{k}</span>
                      <span className="break-all text-right font-mono text-white font-semibold">{v}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleRcbEnabled(selectedIed.id, selectedRcb.name)}
                    className={`w-full rounded-md border px-3 py-2 font-bold text-xs transition ${
                      selectedRcb.enabled
                        ? 'border-red-600 bg-red-900/30 text-red-300 hover:bg-red-900/50'
                        : 'border-emerald-600 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
                    }`}
                  >
                    {selectedRcb.enabled ? '■ Stop Report (RptEna = FALSE)' : '▶ Start Report (RptEna = TRUE)'}
                  </button>
                </>
              ) : (
                <p className="text-slate-400">No RCB selected.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <section className={`${panel} lg:col-span-3`}>
          <h3 className={title}>
            <CheckCircle2 className="h-4 w-4 text-cyan-300" /> Operation Result
          </h3>
          <div className="space-y-2 p-3 text-xs">
            <div className="flex items-start gap-2">
              <span className={isMmsAssociated ? 'text-emerald-400' : 'text-rose-400'}>●</span>
              <span>
                {isMmsAssociated
                  ? `MMS TCP:102 association established with ${selectedIed.name}.`
                  : `MMS TCP:102 association disconnected from ${selectedIed.name}.`}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-300">●</span>
              <span className="break-words">{operationResult}</span>
            </div>
            <div className="text-slate-400 font-mono">
              Read actions: {readCounter} · GI requests: {lastGiCount}
            </div>
            {writeRequested && (
              <div className="text-amber-300">
                Write operation checked FC=[CO]/[SP] access permissions on {selectedIed.name}.
              </div>
            )}
          </div>
        </section>

        <section id="mms-gi" className={`${panel} lg:col-span-2`}>
          <h3 className={title}>
            <RefreshCw className="h-4 w-4 text-cyan-300" /> General Interrogation (GI)
          </h3>
          <div className="space-y-3 p-3">
            <p className="text-xs text-slate-300">GI Scope: {selectedIed.name} (all configured LDs)</p>
            <button
              type="button"
              onClick={doGi}
              className="w-full rounded-md bg-[#00d9ff] px-2 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-300 transition"
            >
              ▶ Send GI
            </button>
            <button
              type="button"
              onClick={() => {
                setIntegrityCounter((n) => n + 1);
                setOperationResult(`Integrity report poll #${integrityCounter + 1} completed.`);
              }}
              className="w-full rounded-md border border-cyan-700 bg-[#123653] px-2 py-2 text-xs font-semibold text-white hover:border-cyan-400"
            >
              Poll Integrity #{integrityCounter}
            </button>
            <p className="text-xs text-emerald-400 font-mono">GI requests sent: {lastGiCount}</p>
          </div>
        </section>

        <section className={`${panel} min-w-0 lg:col-span-5`}>
          <h3 className={title}>
            <FileText className="h-4 w-4 text-cyan-300" /> MMS Live Report Monitor (Events)
          </h3>
          <div className="max-h-[230px] overflow-auto p-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#123653]">
                <tr>
                  <th className="p-2">Time</th>
                  <th>Data Reference</th>
                  <th>Value / Event</th>
                  <th>Cause</th>
                </tr>
              </thead>
              <tbody>
                {soeLog.slice(0, 8).map((s) => (
                  <tr key={s.id} className="border-b border-[#1c405c]">
                    <td className="whitespace-nowrap p-2 font-mono text-cyan-300">{s.timestampMs}</td>
                    <td className="break-all font-mono">{s.sourceRef}</td>
                    <td className="font-mono text-emerald-400">{s.valueChange}</td>
                    <td className="font-mono text-amber-300">{s.cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {soeLog.length === 0 && (
              <p className="p-3 text-slate-400">
                No SOE events yet. Trigger a simulation event to populate this monitor.
              </p>
            )}
          </div>
        </section>

        <section id="mms-diagnostics" className={`${panel} lg:col-span-2`}>
          <h3 className={title}>
            <Activity className="h-4 w-4 text-cyan-300" /> Diagnostics &amp; Statistics
          </h3>
          <div className="space-y-3 p-3 text-xs">
            {[
              ['MMS Association', isMmsAssociated ? 'Connected' : 'Offline'],
              ['RCBs Enabled', `${allRcbs.filter((r) => r.enabled).length}/${allRcbs.length}`],
              ['GI Requests', String(lastGiCount)],
              ['Integrity Poll', String(integrityCounter)],
              ['SOE Entries', String(soeLog.length)],
              ['TCP Port', '102'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-[#21415b] pb-1">
                <span className="text-slate-400">{k}</span>
                <span className={`font-semibold font-mono ${k === 'MMS Association' && !isMmsAssociated ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
