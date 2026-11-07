import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildIec104TelecontrolTable } from '../data/protocolRegistry';
import { LAB_HW_ASSETS } from '../data/labHardwareAssets';
import {
  AlertTriangle,
  Database,
  Layers,
  Monitor,
  RefreshCw,
  Server,
  Terminal,
} from 'lucide-react';

type Iec104FaultMode = 'NONE' | 'TCP_2404_DOWN' | 'STARTDT_FAIL' | 'GI_TIMEOUT' | 'IOA_MAP_ERROR';

export const Iec104LabPage: React.FC = () => {
  const { bays, commandBreaker } = useSubstationStore();

  const [linkState, setLinkState] = useState<'STARTDT_ACTIVE' | 'STOPDT_STANDBY'>('STARTDT_ACTIVE');
  const [faultMode, setFaultMode] = useState<Iec104FaultMode>('NONE');
  const [txSeqNs, setTxSeqNs] = useState<number>(48);
  const [rxSeqNr, setRxSeqNr] = useState<number>(22);
  const [giCount, setGiCount] = useState<number>(3);
  const [selectedIoa, setSelectedIoa] = useState<number>(1001);
  const [commandTargetBayId, setCommandTargetBayId] = useState<string>(bays[0]?.id || 'BAY-132-L1');
  const [frameLog, setFrameLog] = useState<
    Array<{ time: string; format: 'I-Frame' | 'S-Frame' | 'U-Frame'; dir: string; summary: string }>
  >([
    {
      time: '14:20:01.104',
      format: 'U-Frame',
      dir: 'RCC → RTU',
      summary: 'STARTDT ACT (0x68 0x04 0x07 0x00 0x00 0x00) — Activate Data Transfer',
    },
    {
      time: '14:20:01.118',
      format: 'U-Frame',
      dir: 'RTU → RCC',
      summary: 'STARTDT CON (0x68 0x04 0x0B 0x00 0x00 0x00) — Data Transfer Confirmed',
    },
    {
      time: '14:20:02.450',
      format: 'I-Frame',
      dir: 'RCC → RTU',
      summary: 'C_IC_NA_1 (TypeID=100, COT=6 Act, COA=132, IOA=0, QOI=20) — Station General Interrogation',
    },
    {
      time: '14:20:02.512',
      format: 'I-Frame',
      dir: 'RTU → RCC',
      summary: 'M_DP_TB_1 (TypeID=31, COT=20 GI, COA=132, IOA=1001) — BAY-132-L1 Breaker CLOSED (DPI=2)',
    },
  ]);

  const ioaEntries = useMemo(() => buildIec104TelecontrolTable(bays), [bays]);
  const selectedEntry = ioaEntries.find((e) => e.ioa === selectedIoa) || ioaEntries[0];
  const targetBay = bays.find((b) => b.id === commandTargetBayId) || bays[0];

  const isHealthy = faultMode === 'NONE' && linkState === 'STARTDT_ACTIVE';

  const appendFrame = (format: 'I-Frame' | 'S-Frame' | 'U-Frame', dir: string, summary: string) => {
    const nowStr = new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.240';
    setFrameLog((prev) => [{ time: nowStr, format, dir, summary }, ...prev].slice(0, 16));
  };

  const handleSendUFrame = (uType: 'STARTDT' | 'STOPDT' | 'TESTFR') => {
    if (faultMode === 'TCP_2404_DOWN') return;
    if (uType === 'STARTDT') {
      if (faultMode === 'STARTDT_FAIL') {
        appendFrame('U-Frame', 'RCC → RTU', 'STARTDT ACT sent — No STARTDT CON received (T1 Timeout)!');
        return;
      }
      setLinkState('STARTDT_ACTIVE');
      appendFrame('U-Frame', 'RCC ↔ RTU', 'STARTDT ACT (0x07) → STARTDT CON (0x0B) — Link Active');
    } else if (uType === 'STOPDT') {
      setLinkState('STOPDT_STANDBY');
      appendFrame('U-Frame', 'RCC ↔ RTU', 'STOPDT ACT (0x13) → STOPDT CON (0x23) — Link Standby');
    } else {
      appendFrame('U-Frame', 'RCC ↔ RTU', 'TESTFR ACT (0x43) → TESTFR CON (0x83) — Keep-Alive OK');
    }
  };

  const handleTriggerGi = () => {
    if (!isHealthy) return;
    setGiCount((c) => c + 1);
    setTxSeqNs((n) => n + 2);
    setRxSeqNr((n) => n + 1);
    appendFrame(
      'I-Frame',
      'RCC ↔ RTU',
      `C_IC_NA_1 (TypeID=100, COA=132, QOI=20) → COT=7 (ActCon) → ${ioaEntries.length} IOAs Reported → COT=10 (ActTerm)`
    );
  };

  const handleRemoteCommand = (action: 'TRIP' | 'CLOSE') => {
    if (!isHealthy) return;
    const desiredPos = action === 'CLOSE' ? 'CLOSED' : 'OPEN';
    commandBreaker(targetBay.id, desiredPos);
    setTxSeqNs((n) => n + 1);
    setRxSeqNr((n) => n + 1);
    appendFrame(
      'I-Frame',
      'RCC → RTU → IED',
      `C_DC_NA_1 (TypeID=46, COT=6 Act, COA=132, IOA=${6001 + bays.indexOf(targetBay)}) → Gateway MMS CSWI1.Pos.Oper → ${targetBay.bayCode} Breaker ${desiredPos}`
    );
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
        gridTemplateColumns: '115px minmax(0, 1fr)',
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
            IEC 60870-5-104 (IEC-104) Lab — TCP Port 2404
          </h2>
          <p className="text-xs text-[#9BC0DF] mt-0.5">
            Station Gateway / RTU ↔ Remote Control Center (RCC / SLDC) · I/S/U APCI Frames · IOA Mapping · General Interrogation &amp; Remote Commands
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
            ● {isHealthy ? 'Link State: STARTDT ACTIVE' : `Link State: ${faultMode !== 'NONE' ? faultMode : linkState}`}
          </span>
          <span
            style={{ backgroundColor: '#241038', borderColor: '#A855F7', color: '#D8B4FE' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            IEC-104 · TCP Port 2404 · COA 132
          </span>
          <span
            style={{ backgroundColor: '#082038', borderColor: '#1E5280', color: '#77E7FF' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            N(S)={txSeqNs} · N(R)={rxSeqNr}
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
              borderColor: isHealthy ? '#A855F7' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(168, 85, 247, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Server className="w-4 h-4 text-[#D8B4FE]" />
                <span>Station Gateway / RTU (Controlled)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#241038] border border-[#A855F7] text-[#D8B4FE] font-mono text-[10px] font-bold">
                COA = 132
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '44% 56%',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{ backgroundColor: '#040E1A', borderColor: '#173C5E' }}
                className="rounded-lg border p-2 flex flex-col items-center justify-center h-[185px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCHNEIDER_MICOM}
                  alt="Moxa MGate 5216 / MiCOM C264 Station Gateway"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                />
                <span className="text-[9.5px] font-mono text-[#D8B4FE] mt-1 font-bold">
                  Moxa MGate 5216 / MiCOM C264
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'CONTROLLED STATION ONLINE' : 'TELECONTROL FAULT'}
                </div>
                <DetailRow label="Station Role" value="Controlled Station (Slave)" />
                <DetailRow label="Gateway IP" value="10.132.10.190:2404" valueColor="#38BDF8" />
                <DetailRow label="Common Addr" value="132 (0x0084)" valueColor="#D8B4FE" />
                <DetailRow label="Southbound" value="IEC 61850 MMS + Modbus TCP" />
                <DetailRow label="Northbound" value="IEC 60870-5-104 (TCP/2404)" valueColor="#4ADE80" />
                <DetailRow label="Mapped IOAs" value={`${ioaEntries.length} Active IOAs`} />
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#A855F7' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(168, 85, 247, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col items-center justify-between text-center"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-white">
                <Layers className="w-4 h-4 text-[#D8B4FE]" />
                <span>IEC 60870-5-104 — TCP Port 2404</span>
              </div>
              <div className="text-[11px] text-[#DCEAF5] font-semibold mt-1">
                Station Gateway / RTU ⇄ MPLS WAN ⇄ Remote Control Center
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-2.5 my-2">
              <span
                style={{ color: isHealthy ? '#A855F7' : '#FF5C65' }}
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
                  alt="Substation Telecontrol Switch / Router"
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
              style={{ backgroundColor: '#241038', borderColor: '#A855F7', color: '#E9D5FF' }}
              className="w-full rounded-lg border py-1.5 px-2.5 text-xs font-extrabold tracking-wide"
            >
              I-Frames (Data) | S-Frames (Ack) | U-Frames (STARTDT/TESTFR)
            </div>

            <div
              style={{
                backgroundColor: isHealthy ? '#06291E' : '#3B0D15',
                borderColor: isHealthy ? '#22C55E' : '#FF5C65',
                color: isHealthy ? '#4ADE80' : '#FDA4AF',
              }}
              className="w-full rounded-lg border px-2 py-1 text-[11px] font-bold mt-1"
            >
              {isHealthy
                ? '✓ STARTDT CON Active • End-to-End Breaker & Analog Telecontrol OK'
                : `✕ Telecontrol Fault: ${faultMode !== 'NONE' ? faultMode : 'STOPDT Standby'}`}
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
                <span>Remote Control Center (RCC / SLDC)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#082038] border border-[#00CFFF] text-[#77E7FF] font-mono text-[10px] font-bold">
                Controlling Station
              </span>
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
                style={{ backgroundColor: '#040E1A', borderColor: '#173C5E' }}
                className="rounded-lg border p-2 flex flex-col items-center justify-center h-[185px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCADA_WORKSTATION}
                  alt="Remote Control Center (SLDC / RCC) Operator Console"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                  className="rounded"
                />
                <span className="text-[9.5px] font-mono text-[#77E7FF] mt-1 font-bold">
                  SLDC / RCC EMS Master Station
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'RCC MASTER CONNECTED' : 'RCC LINK LOST'}
                </div>
                <DetailRow label="Station Role" value="Controlling Station (Master)" />
                <DetailRow label="RCC Master IP" value="172.16.104.10" valueColor="#38BDF8" />
                <DetailRow label="Timers T1/T2/T3" value="15s / 10s / 20s" />
                <DetailRow label="Parameters k / w" value="12 / 8 APDUs" />
                <DetailRow label="GI Cycles" value={`#${giCount} Completed (QOI=20)`} valueColor="#4ADE80" />
                <DetailRow label="Selected IOA" value={`IOA ${selectedEntry.ioa} (${selectedEntry.valueText})`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4 space-y-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2">
              1. U-Frame Link Layer &amp; General Interrogation (GI)
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSendUFrame('STARTDT')}
                className="py-1.5 px-2 rounded-lg bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold text-[11px]"
              >
                STARTDT ACT
              </button>
              <button
                type="button"
                onClick={() => handleSendUFrame('STOPDT')}
                className="py-1.5 px-2 rounded-lg bg-[#2B1608] border border-[#F97316] text-[#FDBA74] font-extrabold text-[11px]"
              >
                STOPDT ACT
              </button>
              <button
                type="button"
                onClick={() => handleSendUFrame('TESTFR')}
                className="py-1.5 px-2 rounded-lg bg-[#082038] border border-[#00CFFF] text-[#77E7FF] font-extrabold text-[11px]"
              >
                TESTFR ACT
              </button>
            </div>
            <button
              type="button"
              onClick={handleTriggerGi}
              style={{ backgroundColor: '#A855F7', color: '#FFFFFF' }}
              className="w-full py-2 rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Send Station General Interrogation (C_IC_NA_1, QOI=20)
            </button>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2">
              2. RCC Remote Command Execution (C_DC_NA_1, TypeID=46)
            </h3>
            <p className="text-[11px] text-[#9BC0DF]">
              Trace: RCC Master (IOA) → IEC-104 (TCP/2404) → Station Gateway → IEC 61850 MMS (CSWI1.Pos.Oper) → Bay Breaker.
            </p>
            <select
              value={targetBay.id}
              onChange={(e) => setCommandTargetBayId(e.target.value)}
              style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold"
            >
              {bays.slice(0, 12).map((b, idx) => (
                <option key={b.id} value={b.id}>
                  IOA {6001 + idx} — {b.bayCode} ({b.name}) • Current: {b.breakerState}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRemoteCommand('TRIP')}
                className="py-2 rounded-lg bg-[#3B0D15] border border-[#FF5C65] text-[#FDA4AF] font-extrabold text-xs hover:brightness-110"
              >
                RCC Trip (DCO=1 OFF)
              </button>
              <button
                type="button"
                onClick={() => handleRemoteCommand('CLOSE')}
                className="py-2 rounded-lg bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold text-xs hover:brightness-110"
              >
                RCC Close (DCO=2 ON)
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#FFB547]" />
              <span>3. IEC-104 Communication Loss &amp; Fault Simulation</span>
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  ['NONE', 'Normal — TCP/2404 Connected & STARTDT Active'],
                  ['TCP_2404_DOWN', 'Fault 1: TCP Port 2404 Socket Disconnected'],
                  ['STARTDT_FAIL', 'Fault 2: STARTDT Confirmation Timeout (T1 Expired)'],
                  ['GI_TIMEOUT', 'Fault 3: General Interrogation (COT=10) Timeout'],
                  ['IOA_MAP_ERROR', 'Fault 4: Unmapped IOA / Unknown COA Exception (COT=47)'],
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
                <Database className="w-4 h-4 text-[#D8B4FE]" />
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white">
                  Gateway IEC 61850 / Modbus → IEC 60870-5-104 IOA Mapping Table (COA = 132)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#D8B4FE]">
                Showing {ioaEntries.length} mapped Information Object Addresses (IOAs)
              </span>
            </div>

            <div className="overflow-x-auto max-h-[305px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 z-10 text-[#9BC0DF] font-bold">
                  <tr>
                    <th className="py-2 px-2">IOA</th>
                    <th className="py-2 px-2">Type ID</th>
                    <th className="py-2 px-2">COT</th>
                    <th className="py-2 px-2">Signal Description</th>
                    <th className="py-2 px-2">Southbound Source Protocol &amp; Ref</th>
                    <th className="py-2 px-2">Live Value</th>
                    <th className="py-2 px-2">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#132E4A] font-mono">
                  {ioaEntries.map((row) => {
                    const isSel = row.ioa === selectedEntry.ioa;
                    return (
                      <tr
                        key={row.ioa}
                        onClick={() => setSelectedIoa(row.ioa)}
                        style={{ backgroundColor: isSel ? 'rgba(168, 85, 247, 0.18)' : '#04101E' }}
                        className="cursor-pointer hover:bg-[#0B2540] transition"
                      >
                        <td className="py-2 px-2 font-extrabold text-[#D8B4FE]">{row.ioa}</td>
                        <td className="py-2 px-2 text-[#77E7FF]">{row.typeId}</td>
                        <td className="py-2 px-2 text-slate-300 text-[10px]">{row.cot}</td>
                        <td className="py-2 px-2 font-sans font-bold text-white">{row.signalDescription}</td>
                        <td className="py-2 px-2 text-[10px]">
                          <div className="text-[#00CFFF] font-bold">{row.sourceProtocol}</div>
                          <div className="text-slate-300">{row.sourceReference}</div>
                        </td>
                        <td className="py-2 px-2 font-bold text-[#4ADE80]">{row.valueText}</td>
                        <td className="py-2 px-2 text-[10px] text-[#FACC15]">{row.quality}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-[#163B5C] pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00CFFF]" />
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white">
                  Live IEC-104 APCI / ASDU Frame Stream (I-Frames, S-Frames, U-Frames)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#77E7FF]">Start Byte 0x68 • Port 2404</span>
            </div>
            <div className="max-h-[165px] overflow-y-auto space-y-1 font-mono text-[10.5px]">
              {frameLog.map((f, i) => (
                <div
                  key={i}
                  className="p-1.5 rounded bg-[#020913] border border-[#153452] flex flex-wrap items-center gap-2"
                >
                  <span className="text-slate-400">{f.time}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                      f.format === 'I-Frame'
                        ? 'bg-[#241038] text-[#D8B4FE]'
                        : f.format === 'U-Frame'
                        ? 'bg-[#082038] text-[#77E7FF]'
                        : 'bg-[#06291E] text-[#4ADE80]'
                    }`}
                  >
                    {f.format}
                  </span>
                  <span className="text-[#FACC15] font-bold">{f.dir}</span>
                  <span className="text-white flex-1">{f.summary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
