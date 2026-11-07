import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildOpcUaAddressSpace } from '../data/protocolRegistry';
import { LAB_HW_ASSETS } from '../data/labHardwareAssets';
import {
  AlertTriangle,
  Database,
  FolderTree,
  Layers,
  Lock,
  Monitor,
  Server,
} from 'lucide-react';

type OpcUaFaultMode =
  | 'NONE'
  | 'SESSION_FAILURE'
  | 'CERT_UNTRUSTED'
  | 'BAD_NODE_ID'
  | 'SUBSCRIPTION_FAIL';

export const OpcUaLabPage: React.FC = () => {
  const { bays, commandBreaker } = useSubstationStore();

  const [securityPolicy, setSecurityPolicy] = useState<string>('Basic256Sha256 (Sign & Encrypt)');
  const [certTrusted, setCertTrusted] = useState<boolean>(true);
  const [publishingIntervalMs] = useState<number>(500);
  const [faultMode, setFaultMode] = useState<OpcUaFaultMode>('NONE');
  const [selectedVoltageFolder, setSelectedVoltageFolder] = useState<'ALL' | '132' | '33' | '11'>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ns=2;s=SAS.132kV.132_L1.XCBR1.Pos.stVal');
  const [writeFeedback, setWriteFeedback] = useState<string | null>(null);

  const addressSpaceNodes = useMemo(() => buildOpcUaAddressSpace(bays), [bays]);

  const filteredNodes = useMemo(() => {
    return addressSpaceNodes.filter((n) => {
      if (selectedVoltageFolder === 'ALL') return true;
      return n.nodeId.includes(`SAS.${selectedVoltageFolder}kV.`);
    });
  }, [addressSpaceNodes, selectedVoltageFolder]);

  const selectedNode =
    addressSpaceNodes.find((n) => n.nodeId === selectedNodeId) ||
    filteredNodes[0] ||
    addressSpaceNodes[0];

  const isHealthy = faultMode === 'NONE' && certTrusted;

  const effectiveStatusCode = (() => {
    if (!certTrusted || faultMode === 'CERT_UNTRUSTED') return 'BadSecurityChecksFailed (0x80130000)';
    if (faultMode === 'SESSION_FAILURE') return 'BadSessionIdInvalid (0x80250000)';
    if (faultMode === 'BAD_NODE_ID') return 'BadNodeIdUnknown (0x80340000)';
    if (faultMode === 'SUBSCRIPTION_FAIL') return 'BadSubscriptionIdInvalid (0x80280000)';
    return selectedNode.statusCode;
  })();

  const handleOpcUaWrite = (newVal: 'OPEN' | 'CLOSED') => {
    if (!isHealthy) {
      setWriteFeedback(`OPC UA Write failed: ${effectiveStatusCode}`);
      return;
    }
    if (!selectedNode.accessLevel.includes('CurrentWrite')) {
      setWriteFeedback(
        `OPC UA Write rejected: BadNotWritable (0x803B0000) — Node "${selectedNode.browseName}" has AccessLevel = CurrentRead only.`
      );
      return;
    }
    const targetBay = bays.find((b) => b.bayCode === selectedNode.bayCode);
    if (targetBay) {
      commandBreaker(targetBay.id, newVal);
      setWriteFeedback(
        `OPC UA Write (ServiceId=673) succeeded on ${selectedNode.nodeId} → Value=${newVal} (StatusCode: Good 0x00000000).`
      );
    }
  };

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
        gridTemplateColumns: '118px minmax(0, 1fr)',
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
      <div
        style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
      >
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-white">
            OPC UA Lab — opc.tcp://10.132.10.200:4840
          </h2>
          <p className="text-xs text-[#9BC0DF] mt-0.5">
            SCADA OPC UA Server ↔ Historian / Analytics OPC UA Client · Address-Space Browser · Subscriptions &amp; X.509 Certificate Security
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
            ● {isHealthy ? 'OPC UA Session: ACTIVE' : `OPC UA Fault: ${effectiveStatusCode.split(' ')[0]}`}
          </span>
          <span
            style={{ backgroundColor: '#0A2246', borderColor: '#3B82F6', color: '#93C5FD' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            opc.tcp://10.132.10.200:4840 · ns=2
          </span>
          <span
            style={{ backgroundColor: '#06291E', borderColor: '#22C55E', color: '#4ADE80' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            {securityPolicy.split(' ')[0]}
          </span>
        </div>
      </div>

      <div
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
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#3B82F6' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(59, 130, 246, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Server className="w-4 h-4 text-[#60A5FA]" />
                <span>SCADA OPC UA Server (SCADA Server A)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#0A2246] border border-[#3B82F6] text-[#93C5FD] font-mono text-[10px] font-bold">
                TCP Port 4840
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '45% 55%',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{ backgroundColor: '#040E1A', borderColor: '#173C5E' }}
                className="rounded-lg border p-2 flex flex-col items-center justify-center h-[185px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCADA_WORKSTATION}
                  alt="SCADA OPC UA Server Dell PowerEdge R750"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                  className="rounded"
                />
                <span className="text-[9.5px] font-mono text-[#93C5FD] mt-1 font-bold">
                  Dell PowerEdge R750 • OPC UA Server
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'OPC UA SERVER RUNNING' : 'SERVER SECURITY / SESSION FAULT'}
                </div>
                <DetailRow label="Endpoint URL" value="opc.tcp://10.132.10.200:4840" valueColor="#60A5FA" />
                <DetailRow label="Namespace URI" value="urn:sas:iec61850:substation (ns=2)" />
                <DetailRow label="Security Policy" value={securityPolicy} />
                <DetailRow
                  label="Server Cert"
                  value={certTrusted ? 'X.509v3 Trusted (SHA-256)' : 'UNTRUSTED / REJECTED'}
                  valueColor={certTrusted ? '#4ADE80' : '#FF5C65'}
                />
                <DetailRow label="Exposed Nodes" value={`${addressSpaceNodes.length} Variable Nodes`} />
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#3B82F6' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(59, 130, 246, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col items-center justify-between text-center"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-white">
                <Layers className="w-4 h-4 text-[#60A5FA]" />
                <span>OPC UA — opc.tcp://server:4840</span>
              </div>
              <div className="text-[11px] text-[#DCEAF5] font-semibold mt-1">
                SCADA OPC UA Server ⇄ Station DMZ Switch ⇄ Historian / Analytics Client
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-2.5 my-2">
              <span
                style={{ color: isHealthy ? '#3B82F6' : '#FF5C65' }}
                className="text-lg font-black shrink-0"
              >
                {isHealthy ? '⇄' : '✕'}
              </span>

              <div
                style={{ backgroundColor: '#040E1A', borderColor: '#194368' }}
                className="rounded-lg border px-2.5 py-2 flex-1 flex items-center justify-center"
              >
                <img
                  src={LAB_HW_ASSETS.INDUSTRIAL_SWITCH}
                  alt="Station DMZ Industrial Switch"
                  style={{ maxHeight: '68px', width: '100%', objectFit: 'contain' }}
                />
              </div>

              <span
                style={{ color: isHealthy ? '#22C55E' : '#FF5C65' }}
                className="text-lg font-black shrink-0"
              >
                {isHealthy ? '⇄' : '✕'}
              </span>
            </div>

            <div
              style={{ backgroundColor: '#0A2246', borderColor: '#3B82F6', color: '#BFDBFE' }}
              className="w-full rounded-lg border py-1.5 px-2.5 text-xs font-extrabold tracking-wide"
            >
              Browse | Read | Write | Subscription | MonitoredItems (DataChange)
            </div>

            <div
              style={{
                backgroundColor: isHealthy ? '#06291E' : '#3B0D15',
                borderColor: isHealthy ? '#22C55E' : '#FF5C65',
                color: isHealthy ? '#4ADE80' : '#FDA4AF',
              }}
              className="w-full rounded-lg border px-2 py-1 text-[11px] font-bold mt-1"
            >
              {effectiveStatusCode}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Monitor className="w-4 h-4 text-[#00CFFF]" />
                <span>Historian / Analytics OPC UA Client</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#082038] border border-[#00CFFF] text-[#77E7FF] font-mono text-[10px] font-bold">
                OPC UA Client
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '45% 55%',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{ backgroundColor: '#040E1A', borderColor: '#173C5E' }}
                className="rounded-lg border p-2 flex flex-col items-center justify-center h-[185px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCADA_WORKSTATION}
                  alt="Enterprise Historian & Analytics Client"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                  className="rounded"
                />
                <span className="text-[9.5px] font-mono text-[#77E7FF] mt-1 font-bold">
                  Enterprise Historian (10.132.10.220)
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'SUBSCRIPTION STREAMING' : 'CLIENT SUBSCRIPTION HALTED'}
                </div>
                <DetailRow label="Client IP" value="10.132.10.220" valueColor="#38BDF8" />
                <DetailRow label="Session ID" value={isHealthy ? 'ns=1;g=9B4A-88F1' : 'INVALID'} />
                <DetailRow label="Sub Interval" value={`${publishingIntervalMs} ms`} />
                <DetailRow label="MonitoredItems" value={`${filteredNodes.length} Active Items`} />
                <DetailRow label="Selected Node" value={selectedNode.browseName} valueColor="#60A5FA" />
                <DetailRow label="Live DataChange" value={selectedNode.valueText} valueColor="#4ADE80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4 space-y-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-[#60A5FA]" />
              <span>OPC UA Address-Space Tree (Root → Objects → SAS)</span>
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['ALL', 'All Voltage Folders'],
                  ['132', '132 kV Bays'],
                  ['33', '33 kV Bays'],
                  ['11', '11 kV Bays'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVoltageFolder(v)}
                  style={{
                    backgroundColor: selectedVoltageFolder === v ? '#3B82F6' : '#04101E',
                    color: '#FFFFFF',
                    borderColor: '#1E466E',
                  }}
                  className="px-2.5 py-1 rounded border text-[10.5px] font-bold"
                >
                  📁 {label}
                </button>
              ))}
            </div>

            <div className="max-h-[210px] overflow-y-auto space-y-1 rounded-lg bg-[#04101E] border border-[#153452] p-2 font-mono text-[10.5px]">
              <div className="text-[#93C5FD] font-bold">▾ Root (ns=0;i=84) / Objects (ns=0;i=85)</div>
              <div className="pl-3 text-[#60A5FA] font-bold">▾ Substation_132_33_11kV (ns=2;s=SAS)</div>
              {filteredNodes.map((n) => {
                const isSel = n.nodeId === selectedNode.nodeId;
                return (
                  <button
                    key={n.nodeId}
                    type="button"
                    onClick={() => setSelectedNodeId(n.nodeId)}
                    style={{
                      backgroundColor: isSel ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      borderColor: isSel ? '#60A5FA' : 'transparent',
                    }}
                    className="w-full text-left pl-6 pr-2 py-1 rounded border flex items-center justify-between gap-2 hover:bg-[#0B223C]"
                  >
                    <span className="truncate text-white">{n.browseName} ({n.bayCode})</span>
                    <span className="text-[#4ADE80] font-bold shrink-0">{n.valueText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#4ADE80]" />
              <span>Security Policy, X.509 Trust &amp; Write Service</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] text-[#9BC0DF] mb-1">Security Policy</label>
                <select
                  value={securityPolicy}
                  onChange={(e) => setSecurityPolicy(e.target.value)}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                  className="w-full rounded border px-2 py-1 text-[10.5px] font-bold"
                >
                  <option value="Basic256Sha256 (Sign & Encrypt)">Basic256Sha256 (Sign&amp;Encrypt)</option>
                  <option value="Aes128_Sha256_RsaOaep (Sign)">Aes128_Sha256_RsaOaep</option>
                  <option value="None (Commissioning Only)">None (Diagnostics)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] text-[#9BC0DF] mb-1">X.509 Certificate</label>
                <button
                  type="button"
                  onClick={() => setCertTrusted((p) => !p)}
                  style={{
                    backgroundColor: certTrusted ? '#06291E' : '#3B0D15',
                    borderColor: certTrusted ? '#22C55E' : '#FF5C65',
                    color: certTrusted ? '#4ADE80' : '#FDA4AF',
                  }}
                  className="w-full rounded border py-1 px-2 text-[10.5px] font-extrabold"
                >
                  {certTrusted ? '✓ Trusted X.509v3' : '✕ Reject Certificate'}
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-[#163B5C] space-y-1.5">
              <div className="text-[10.5px] text-[#9BC0DF]">
                Test OPC UA Write Service on <span className="font-mono text-white">{selectedNode.browseName}</span> ({selectedNode.accessLevel}):
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpcUaWrite('OPEN')}
                  className="py-1.5 rounded bg-[#3B0D15] border border-[#FF5C65] text-[#FDA4AF] font-extrabold text-[11px]"
                >
                  Write Value = OPEN
                </button>
                <button
                  type="button"
                  onClick={() => handleOpcUaWrite('CLOSED')}
                  className="py-1.5 rounded bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold text-[11px]"
                >
                  Write Value = CLOSED
                </button>
              </div>
              {writeFeedback && (
                <div className="p-2 rounded bg-[#04101E] border border-[#3B82F6] text-[10.5px] font-mono text-[#93C5FD]">
                  {writeFeedback}
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#FFB547]" />
              <span>OPC UA Fault Scenarios</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['NONE', 'Good (0x00000000)'],
                  ['SESSION_FAILURE', 'Session Failure'],
                  ['CERT_UNTRUSTED', 'Cert Rejection'],
                  ['BAD_NODE_ID', 'BadNodeIdUnknown'],
                  ['SUBSCRIPTION_FAIL', 'Subscription Fail'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFaultMode(m)}
                  style={{
                    backgroundColor: faultMode === m ? (m === 'NONE' ? '#06291E' : '#3B0D15') : '#04101E',
                    borderColor: faultMode === m ? (m === 'NONE' ? '#22C55E' : '#FF5C65') : '#163856',
                    color: '#FFFFFF',
                  }}
                  className="p-1.5 rounded border text-[10.5px] font-bold text-left"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white">
                  OPC UA MonitoredItems &amp; DataChange Subscription Table (Endpoint: opc.tcp://10.132.10.200:4840)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#93C5FD]">
                PublishingInterval: {publishingIntervalMs} ms
              </span>
            </div>

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 z-10 text-[#9BC0DF] font-bold">
                  <tr>
                    <th className="py-2 px-2">NodeId (ns=2)</th>
                    <th className="py-2 px-2">DisplayName</th>
                    <th className="py-2 px-2">DataType</th>
                    <th className="py-2 px-2">AccessLevel</th>
                    <th className="py-2 px-2">Southbound Source</th>
                    <th className="py-2 px-2">Value</th>
                    <th className="py-2 px-2">StatusCode</th>
                    <th className="py-2 px-2">SourceTimestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#132E4A] font-mono">
                  {filteredNodes.map((n) => {
                    const isSel = n.nodeId === selectedNode.nodeId;
                    return (
                      <tr
                        key={n.nodeId}
                        onClick={() => setSelectedNodeId(n.nodeId)}
                        style={{ backgroundColor: isSel ? 'rgba(59, 130, 246, 0.2)' : '#04101E' }}
                        className="cursor-pointer hover:bg-[#0B2540] transition"
                      >
                        <td className="py-2 px-2 text-[#60A5FA] font-bold break-all">{n.nodeId}</td>
                        <td className="py-2 px-2 font-sans font-bold text-white">{n.displayName}</td>
                        <td className="py-2 px-2 text-slate-300">{n.dataType}</td>
                        <td className="py-2 px-2 text-[10px] text-[#FACC15]">{n.accessLevel}</td>
                        <td className="py-2 px-2 text-[10px]">
                          <div className="text-[#00CFFF] font-bold">{n.sourceProtocol}</div>
                          <div className="text-slate-400">{n.sourceIecRef}</div>
                        </td>
                        <td className="py-2 px-2 font-extrabold text-[#4ADE80]">{n.valueText}</td>
                        <td
                          style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                          className="py-2 px-2 text-[10px] font-bold"
                        >
                          {isHealthy ? n.statusCode : effectiveStatusCode}
                        </td>
                        <td className="py-2 px-2 text-[10px] text-slate-300">
                          {n.sourceTimestamp.split('T')[1]?.slice(0, 12)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
