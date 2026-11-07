import React, { useMemo, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildModbusRegistersForBay } from '../data/protocolRegistry';
import { LAB_HW_ASSETS } from '../data/labHardwareAssets';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  Play,
  RefreshCw,
  Server,
  Settings,
  Terminal,
} from 'lucide-react';

type ModbusExceptionMode =
  | 'NONE'
  | 'EX_01_ILLEGAL_FUNCTION'
  | 'EX_02_ILLEGAL_ADDRESS'
  | 'EX_03_ILLEGAL_VALUE'
  | 'SERVER_TIMEOUT'
  | 'SCALING_ERROR';

export const ModbusTcpLabPage: React.FC = () => {
  const { bays, selectedBayId, setSelectedBayId } = useSubstationStore();

  // Default to a 33 kV Feeder bay (matching Section 9: "33 kV Energy Meter -> Industrial Ethernet Switch -> SCADA / Gateway")
  const defaultFeederBay =
    bays.find((b) => b.bayCode === '33-F03') ||
    bays.find((b) => b.voltageKv === 33) ||
    bays[0];

  const [meterBayId, setMeterBayId] = useState<string>(defaultFeederBay.id);
  const activeBay = bays.find((b) => b.id === meterBayId) || defaultFeederBay;

  const [functionCode, setFunctionCode] = useState<'03' | '04' | '06'>('04');
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(1000);
  const [timeoutMs, setTimeoutMs] = useState<number>(1000);
  const [exceptionMode, setExceptionMode] = useState<ModbusExceptionMode>('NONE');
  const [selectedRegAddr, setSelectedRegAddr] = useState<number>(30001);
  const [pollCount, setPollCount] = useState<number>(142);
  const [activeExercise, setActiveExercise] = useState<string>('VOLTAGE_KV');

  const unitId = useMemo(() => {
    const idx = bays.findIndex((b) => b.id === activeBay.id);
    return idx >= 0 ? (idx % 14) + 1 : 1;
  }, [bays, activeBay.id]);

  const scalingMultiplier = exceptionMode === 'SCALING_ERROR' ? 10 : 1;
  const registers = useMemo(
    () => buildModbusRegistersForBay(activeBay, unitId, scalingMultiplier),
    [activeBay, unitId, scalingMultiplier]
  );

  const selectedReg = registers.find((r) => r.registerAddress === selectedRegAddr) || registers[0];
  const isHealthy = exceptionMode === 'NONE';

  const exceptionBadgeText = (() => {
    switch (exceptionMode) {
      case 'NONE':
        return '0x00 — Normal Response (No Exception)';
      case 'EX_01_ILLEGAL_FUNCTION':
        return 'Exception 0x01 — Illegal Function (FC Not Supported)';
      case 'EX_02_ILLEGAL_ADDRESS':
        return 'Exception 0x02 — Illegal Data Address (Unmapped Register)';
      case 'EX_03_ILLEGAL_VALUE':
        return 'Exception 0x03 — Illegal Data Value';
      case 'SERVER_TIMEOUT':
        return `TCP Timeout (> ${timeoutMs} ms) — No Response from Unit ID ${unitId}`;
      case 'SCALING_ERROR':
        return 'Configuration Warning — Incorrect 10x Scaling Factor Applied';
    }
  })();

  const exercises = [
    {
      id: 'VOLTAGE_KV',
      title: 'Exercise 1: Poll 33 kV Feeder Voltage (Reg 30001)',
      reg: 30001,
      fc: '04' as const,
      desc: 'Read 32-bit float Input Register 30001 (PDU 0x0000) with scaling 0.01 to obtain phase-to-phase kV.',
    },
    {
      id: 'CURRENT_A',
      title: 'Exercise 2: Poll Three-Phase Line Currents (Reg 30003–30007)',
      reg: 30003,
      fc: '04' as const,
      desc: 'Read Input Registers 30003, 30005, 30007 with scaling 0.1 A/count to verify CT secondary metering.',
    },
    {
      id: 'POWER_MW_MVAR',
      title: 'Exercise 3: Poll Active & Reactive Power (Reg 30009–30011)',
      reg: 30009,
      fc: '04' as const,
      desc: 'Read Input Registers 30009 (MW) and 30011 (MVAr) and verify match with SCADA SLD feeder load.',
    },
    {
      id: 'FREQ_ENERGY',
      title: 'Exercise 4: Poll Frequency & Net Energy MWh (Reg 30015 / 40001)',
      reg: 40001,
      fc: '03' as const,
      desc: 'Switch to Function Code 03 (Holding Registers) to read accumulated Net Energy Import MWh at Reg 40001.',
    },
  ];

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
      {/* 1. TOP HEADER BAR */}
      <div
        style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
      >
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-white">
            Modbus TCP Lab — TCP Port 502
          </h2>
          <p className="text-xs text-[#9BC0DF] mt-0.5">
            33 kV Energy Meter → Industrial Ethernet Switch → SCADA / Gateway · Function Codes 03/04/06 · Register Polling &amp; Scaling
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
            ● {isHealthy ? 'Modbus Poll: HEALTHY' : `Modbus Fault: ${exceptionMode}`}
          </span>
          <span
            style={{ backgroundColor: '#2B1608', borderColor: '#F97316', color: '#FDBA74' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            Modbus TCP · Port 502 · Unit ID {unitId}
          </span>
          <span
            style={{ backgroundColor: '#082038', borderColor: '#1E5280', color: '#77E7FF' }}
            className="rounded-lg border px-3 py-1.5 font-mono"
          >
            Polls: #{pollCount} ({pollIntervalMs} ms)
          </span>
        </div>
      </div>

      {/* 2. THREE MAIN HARDWARE PANELS: 33 kV Energy Meter (Modbus Server) -> Industrial Switch -> SCADA / Gateway (Modbus Client) */}
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
          {/* PANEL 1: Modbus TCP Server (33 kV Multifunction Energy Meter) */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#F97316' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(249, 115, 22, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col justify-between"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Cpu className="w-4 h-4 text-[#F97316]" />
                <span>33 kV Energy Meter ({activeBay.bayCode})</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#2B1608] border border-[#F97316] text-[#FDBA74] font-mono text-[10px] font-bold">
                Modbus Server
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
                style={{
                  backgroundColor: '#040E1A',
                  borderColor: '#173C5E',
                }}
                className="rounded-lg border p-2 flex flex-col items-center justify-center h-[185px]"
              >
                <img
                  src={LAB_HW_ASSETS.SCHNEIDER_MICOM}
                  alt="33 kV Multifunction Feeder Energy Meter"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                />
                <span className="text-[9.5px] font-mono text-[#FDBA74] mt-1 font-bold">
                  PowerLogic ION7650 / PM8000
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: exceptionMode === 'SERVER_TIMEOUT' ? '#FF5C65' : '#4ADE80' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {exceptionMode === 'SERVER_TIMEOUT' ? 'MODBUS SERVER TIMEOUT' : 'MODBUS SERVER ONLINE'}
                </div>
                <DetailRow label="Protocol" value="Modbus TCP (Port 502)" valueColor="#FDBA74" />
                <DetailRow label="Server IP" value={selectedReg.serverIp} valueColor="#38BDF8" />
                <DetailRow label="Unit ID (Slave)" value={String(unitId)} />
                <DetailRow label="Function Code" value={`FC ${functionCode}`} />
                <DetailRow label="Active Reg" value={`${selectedReg.registerAddress} (${selectedReg.pduOffsetHex})`} />
                <DetailRow
                  label="Exception"
                  value={isHealthy ? '0x00 (OK)' : exceptionMode}
                  valueColor={isHealthy ? '#4ADE80' : '#FF5C65'}
                />
              </div>
            </div>
          </div>

          {/* PANEL 2: Industrial Ethernet Switch — Labeled "Modbus TCP — TCP Port 502" */}
          <div
            style={{
              backgroundColor: '#071B2F',
              borderColor: isHealthy ? '#00CFFF' : '#FF5C65',
              boxShadow: 'inset 0 0 16px rgba(0, 207, 255, 0.08)',
            }}
            className="rounded-xl border p-3.5 flex flex-col items-center justify-between text-center"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-white">
                <Layers className="w-4 h-4 text-[#F97316]" />
                <span>Modbus TCP — TCP Port 502</span>
              </div>
              <div className="text-[11px] text-[#DCEAF5] font-semibold mt-1">
                33 kV Energy Meter → Industrial Ethernet Switch → SCADA / Gateway
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-2.5 my-2">
              <span
                style={{ color: isHealthy ? '#F97316' : '#FF5C65' }}
                className="text-lg font-black shrink-0"
              >
                {exceptionMode === 'SERVER_TIMEOUT' ? '✕' : '⇄'}
              </span>

              <div
                style={{ backgroundColor: '#040E1A', borderColor: '#194368' }}
                className="rounded-lg border px-2.5 py-2 flex-1 flex items-center justify-center"
              >
                <img
                  src={LAB_HW_ASSETS.INDUSTRIAL_SWITCH}
                  alt="Industrial Ethernet Station-Bus Switch"
                  style={{ maxHeight: '68px', width: '100%', objectFit: 'contain' }}
                />
              </div>

              <span
                style={{ color: isHealthy ? '#22C55E' : '#FF5C65' }}
                className="text-lg font-black shrink-0"
              >
                {exceptionMode === 'SERVER_TIMEOUT' ? '✕' : '⇄'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#2B1608',
                borderColor: '#F97316',
                color: '#FDBA74',
              }}
              className="w-full rounded-lg border py-1.5 px-2.5 text-xs font-extrabold tracking-wide"
            >
              MBAP Header (7B) + Modbus PDU • TCP/502
            </div>

            <div
              style={{
                backgroundColor: isHealthy ? '#06291E' : '#3B0D15',
                borderColor: isHealthy ? '#22C55E' : '#FF5C65',
                color: isHealthy ? '#4ADE80' : '#FDA4AF',
              }}
              className="w-full rounded-lg border px-2 py-1 text-[11px] font-bold mt-1"
            >
              {exceptionBadgeText}
            </div>
          </div>

          {/* PANEL 3: SCADA / Station Gateway (Modbus TCP Client) */}
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
                <Server className="w-4 h-4 text-[#00CFFF]" />
                <span>SCADA / Station Gateway</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#082038] border border-[#00CFFF] text-[#77E7FF] font-mono text-[10px] font-bold">
                Modbus Client
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
                  alt="SCADA & Gateway Modbus Client"
                  style={{ maxHeight: '145px', width: '100%', objectFit: 'contain' }}
                  className="rounded"
                />
                <span className="text-[9.5px] font-mono text-[#77E7FF] mt-1 font-bold">
                  Moxa MGate 5216 + SCADA Server A
                </span>
              </div>

              <div className="pr-1">
                <div
                  style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                  className="font-extrabold text-xs mb-1.5"
                >
                  ● {isHealthy ? 'MODBUS CLIENT POLLING' : 'CLIENT EXCEPTION / ALARM'}
                </div>
                <DetailRow label="Client IP" value="10.132.10.190 / .200" valueColor="#38BDF8" />
                <DetailRow label="Poll Interval" value={`${pollIntervalMs} ms`} />
                <DetailRow label="Timeout" value={`${timeoutMs} ms`} />
                <DetailRow label="Polled Value" value={`${selectedReg.scaledEngineeringValue} ${selectedReg.unit}`} valueColor="#4ADE80" />
                <DetailRow label="Scaling" value={`× ${selectedReg.scalingFactor}`} />
                <DetailRow label="Gateway Map" value="Modbus → IEC 61850 / IEC-104" valueColor="#FDBA74" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS, PRACTICAL EXERCISES & REGISTER MONITORING TABLE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Left 4 Cols: Configuration, Practical Exercises & Exception Simulator */}
        <div className="xl:col-span-4 space-y-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-[#F97316]" />
              <span>Modbus TCP Client Polling Configuration</span>
            </h3>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-[#9BC0DF] mb-1">Select Feeder Energy Meter (Bay)</label>
                <select
                  value={activeBay.id}
                  onChange={(e) => {
                    setMeterBayId(e.target.value);
                    setSelectedBayId(e.target.value);
                  }}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold"
                >
                  {bays.map((b, i) => (
                    <option key={b.id} value={b.id}>
                      Unit ID {(i % 14) + 1} — {b.bayCode} ({b.name} • 10.132.30.{51 + (i % 14)}:502)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] text-[#9BC0DF] mb-1">Function Code</label>
                  <select
                    value={functionCode}
                    onChange={(e) => setFunctionCode(e.target.value as '03' | '04' | '06')}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FDBA74' }}
                    className="w-full rounded border px-2 py-1 text-xs font-mono font-bold"
                  >
                    <option value="04">FC 04 (Input)</option>
                    <option value="03">FC 03 (Holding)</option>
                    <option value="06">FC 06 (Write)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] text-[#9BC0DF] mb-1">Poll Rate</label>
                  <select
                    value={pollIntervalMs}
                    onChange={(e) => setPollIntervalMs(Number(e.target.value))}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-2 py-1 text-xs font-mono"
                  >
                    <option value={500}>500 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={2000}>2000 ms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] text-[#9BC0DF] mb-1">Timeout</label>
                  <select
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-2 py-1 text-xs font-mono"
                  >
                    <option value={500}>500 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={3000}>3000 ms</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPollCount((c) => c + 1)}
                style={{ backgroundColor: '#F97316', color: '#03101E' }}
                className="w-full py-1.5 rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Issue Manual Modbus Poll Request (TCP/502)
              </button>
            </div>
          </div>

          {/* Practical Exercises */}
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2">
              Practical Metering Exercises (Illustrative Register Map)
            </h3>
            <div className="space-y-1.5">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setActiveExercise(ex.id);
                    setSelectedRegAddr(ex.reg);
                    setFunctionCode(ex.fc);
                    setPollCount((c) => c + 1);
                  }}
                  style={{
                    backgroundColor: activeExercise === ex.id ? '#112E4B' : '#04101E',
                    borderColor: activeExercise === ex.id ? '#F97316' : '#163856',
                  }}
                  className="w-full text-left p-2 rounded-lg border transition"
                >
                  <div className="font-bold text-white text-[11.5px]">{ex.title}</div>
                  <div className="text-[10.5px] text-[#9BC0DF] mt-0.5">{ex.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fault & Exception Code Injection */}
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <h3 className="text-xs sm:text-[13px] font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#FFB547]" />
              <span>Modbus Exception &amp; Fault Injection</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['NONE', '0x00 Normal (Healthy)'],
                  ['EX_01_ILLEGAL_FUNCTION', '0x01 Illegal Function'],
                  ['EX_02_ILLEGAL_ADDRESS', '0x02 Illegal Reg Addr'],
                  ['EX_03_ILLEGAL_VALUE', '0x03 Illegal Value'],
                  ['SERVER_TIMEOUT', 'Server TCP Timeout'],
                  ['SCALING_ERROR', '10x Scaling Mismatch'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExceptionMode(mode)}
                  style={{
                    backgroundColor: exceptionMode === mode ? (mode === 'NONE' ? '#06291E' : '#3B0D15') : '#04101E',
                    borderColor: exceptionMode === mode ? (mode === 'NONE' ? '#22C55E' : '#FF5C65') : '#163856',
                    color: exceptionMode === mode ? '#FFFFFF' : '#C8E0F4',
                  }}
                  className="p-1.5 rounded border text-[10.5px] font-bold text-left"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Live Register Monitoring Table + MBAP/PDU Packet Dissector */}
        <div className="xl:col-span-8 space-y-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white">
                  Modbus TCP Live Register Monitoring Table — {activeBay.bayCode} ({activeBay.name})
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-[#FDBA74]">
                Illustrative Register Map • Click any register to inspect MBAP/PDU frame
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold">
                  <tr>
                    <th className="py-2 px-2">Register</th>
                    <th className="py-2 px-2">Function Code</th>
                    <th className="py-2 px-2">Parameter Description</th>
                    <th className="py-2 px-2">Data Type</th>
                    <th className="py-2 px-2">Raw Reg Value</th>
                    <th className="py-2 px-2">Scaling</th>
                    <th className="py-2 px-2">Engineering Value</th>
                    <th className="py-2 px-2">Gateway IEC 61850 Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#132E4A] font-mono">
                  {registers.map((reg) => {
                    const isSel = reg.registerAddress === selectedReg.registerAddress;
                    return (
                      <tr
                        key={reg.registerAddress}
                        onClick={() => setSelectedRegAddr(reg.registerAddress)}
                        style={{
                          backgroundColor: isSel ? 'rgba(249, 115, 22, 0.16)' : '#04101E',
                        }}
                        className="cursor-pointer hover:bg-[#0B2540] transition"
                      >
                        <td className="py-2 px-2 font-bold text-[#FDBA74]">
                          {reg.registerAddress} <span className="text-[9.5px] text-slate-400">({reg.pduOffsetHex})</span>
                        </td>
                        <td className="py-2 px-2 text-[#77E7FF]">{reg.functionCode}</td>
                        <td className="py-2 px-2 font-sans font-bold text-white">{reg.parameterName}</td>
                        <td className="py-2 px-2 text-slate-300">{reg.dataType}</td>
                        <td className="py-2 px-2 text-[#FACC15]">{reg.rawRegisterValue}</td>
                        <td className="py-2 px-2 text-slate-300">×{reg.scalingFactor}</td>
                        <td
                          style={{ color: isHealthy ? '#4ADE80' : '#FF5C65' }}
                          className="py-2 px-2 font-extrabold"
                        >
                          {exceptionMode === 'SERVER_TIMEOUT'
                            ? 'TIMEOUT'
                            : exceptionMode.startsWith('EX_')
                            ? exceptionMode.slice(0, 5)
                            : `${reg.scaledEngineeringValue} ${reg.unit}`}
                        </td>
                        <td className="py-2 px-2 text-[10px] text-[#38BDF8]">{reg.iec61850SourceRef}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MBAP + Modbus PDU Dissector */}
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3.5 space-y-2">
            <div className="flex items-center gap-2 border-b border-[#163B5C] pb-2">
              <Terminal className="w-4 h-4 text-[#00CFFF]" />
              <h3 className="text-xs sm:text-[13px] font-extrabold text-white">
                Wireshark-Style Modbus TCP (MBAP + PDU) Frame Dissector — Port 502
              </h3>
            </div>
            <div className="rounded-lg bg-[#020913] border border-[#193E63] p-3 font-mono text-[11px] leading-relaxed">
              <div className="text-[#FDBA74] font-bold">
                ▾ Transmission Control Protocol (TCP) · Src: 10.132.10.190:54112 → Dst: {selectedReg.serverIp}:502
              </div>
              <div className="text-[#00CFFF] font-bold mt-1">
                ▾ Modbus/TCP Application Data Unit (ADU)
              </div>
              <div className="pl-4 text-slate-200">
                Transaction Identifier: {pollCount} (0x{pollCount.toString(16).padStart(4, '0').toUpperCase()}) · Protocol Identifier: 0x0000 (Modbus) · Length: 6 · Unit ID: {unitId}
              </div>
              <div className="text-[#4ADE80] font-bold mt-1">
                ▾ Modbus Protocol Data Unit (PDU) — {selectedReg.functionCode}
              </div>
              <div className="pl-4 text-slate-200">
                Reference Register: {selectedReg.registerAddress} (PDU Offset {selectedReg.pduOffsetHex}) · Word Count: {selectedReg.dataType.includes('32') ? 2 : 1} · Raw Value: {selectedReg.rawRegisterValue} · Scaled: {selectedReg.scaledEngineeringValue} {selectedReg.unit}
              </div>
              <div className="pl-4 text-[#FACC15]">
                Diagnostic Status: {exceptionBadgeText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
