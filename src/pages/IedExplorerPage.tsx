import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { SCL_FILE_SAMPLES } from '../data/sclSamples';
import { getIedImageByModel, getInfrastructureImage } from '../data/iedImageRegistry';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
} from 'lucide-react';

const IED_INSPECTOR_TABS = [
  'Overview',
  'Hardware',
  'IEC 61850 Model',
  'Logical Nodes',
  'DataSets',
  'RCBs',
  'Protocols & Communication',
  'GOOSE',
  'MMS',
  'Signal Mapping',
  'SCL',
  'Alarms & Diagnostics',
] as const;

type InspectorTab = (typeof IED_INSPECTOR_TABS)[number];

const RelayThumbnail: React.FC<{ vendor: string; model: string }> = ({ vendor, model }) => (
  <div style={{ width: "110px", height: "90px", flexShrink: 0 }} className="h-[90px] w-[110px] shrink-0 rounded-lg border border-[#2c4d66] bg-[#07111f] p-1 flex items-center justify-center overflow-hidden">
    <img
      src={getIedImageByModel(vendor, model)}
      alt={`${vendor} ${model}`}
      className="ied-device-image"
      loading="lazy"
      decoding="async"
    />
  </div>
);

const InfrastructureThumbnail: React.FC<{ category: string; name: string }> = ({ category, name }) => (
  <div style={{ width: "130px", height: "90px", flexShrink: 0 }} className="h-[90px] w-[130px] shrink-0 rounded-lg border border-[#2c4d66] bg-[#07111f] p-1 flex items-center justify-center overflow-hidden">
    <img
      src={getInfrastructureImage(category, name)}
      alt={`${name} (${category})`}
      className="ied-device-image"
      loading="lazy"
      decoding="async"
    />
  </div>
);

export const IedExplorerPage: React.FC = () => {
  const {
    ieds,
    infrastructure,
    selectedIedId,
    setSelectedIedId,
    signals,
    gooseControlBlocks,
    bays,
    toggleRcbEnabled,
    triggerMmsGeneralInterrogation,
  } = useSubstationStore();

  const [activeSubTab, setActiveSubTab] = useState<InspectorTab>('Overview');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [voltageFilter, setVoltageFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // High-Resolution Click-to-Zoom & Pan Modal State (Section 5)
  const [zoomModalOpen, setZoomModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomTarget, setZoomTarget] = useState<{ title: string; subtitle: string; src: string } | null>(null);

  const selectedIed = ieds.find((i) => i.id === selectedIedId) || ieds[0];
  const associatedBay = bays.find((b) => b.id === selectedIed.bayId);
  const iedSignals = signals.filter((s) => s.iedId === selectedIed.id);
  const iedGoose = gooseControlBlocks.filter(
    (g) => g.publisherIedId === selectedIed.id || g.subscriberIedIds.includes(selectedIed.id)
  );

  const selectedIedImage = getIedImageByModel(selectedIed.vendor, selectedIed.model);

  const openZoomInspector = (title: string, subtitle: string, src: string) => {
    setZoomTarget({ title, subtitle, src });
    setZoomLevel(1.35);
    setPanOffset({ x: 0, y: 0 });
    setZoomModalOpen(true);
  };

  const filteredIeds = ieds.filter((i) => {
    const query = searchText.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [i.name, i.vendor, i.model, i.bayName, i.ipAddressLanA].some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    const matchesVendor = vendorFilter === 'ALL' || i.vendor === vendorFilter;
    const matchesVoltage =
      voltageFilter === 'ALL' || i.bayName.includes(voltageFilter) || i.name.includes(`_${voltageFilter}_`);
    const matchesType =
      typeFilter === 'ALL' || String(i.role).toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesVendor && matchesVoltage && matchesType;
  });

  return (
    <div className="space-y-3">
      {/* Multi-Vendor Relay Fleet Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#081629] border border-[#1E3A5F]">
        <div>
          <h2 className="text-sm font-bold text-[#DCEAF5] uppercase tracking-wider">
            Multi-Vendor Protection &amp; Control IED Fleet + Station Infrastructure
          </h2>
          <p className="text-xs text-slate-400">
            Siemens SIPROTEC 5 (7SJ85, 7UT86, 7SA87) • Schneider MiCOM (P143, P633, C264) • ABB Relion (REF615, RET615, REC615) • GE Multilin (850, T60, D60)
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'Siemens', 'Schneider Electric', 'ABB / Hitachi Energy', 'GE Vernova'] as const).map(
            (v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVendorFilter(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                  vendorFilter === v
                    ? 'bg-[#00D9FF] text-slate-950 border-[#00D9FF]'
                    : 'bg-[#030712] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {v === 'ALL' ? `All Vendors (${ieds.length})` : v}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid: Left IED Selector List + Right 12-Tab Deep IED Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
        {/* Left 3 Columns: Multi-Vendor IED Directory Cards */}
        <div className="xl:col-span-3 min-w-0 rounded-xl border border-cyan-700/60 bg-[#061729] p-2.5 shadow-[0_0_16px_rgba(0,217,255,0.07)]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wide text-white">
              IED DIRECTORY ({filteredIeds.length})
            </h3>
            <span className="text-xs font-mono text-emerald-400">
              {ieds.filter((i) => i.commHealthy).length} ONLINE
            </span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              aria-label="Search IEDs"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by IED / Bay / IP..."
              className="w-full rounded-md border border-[#245071] bg-[#020e1b] py-1.5 pl-8 pr-2 text-[11px] text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <select
              aria-label="Voltage filter"
              value={voltageFilter}
              onChange={(e) => setVoltageFilter(e.target.value)}
              className="min-w-0 rounded border border-[#245071] bg-[#020e1b] p-1.5 text-[10px] text-slate-200"
            >
              <option value="ALL">All Voltage</option>
              <option value="132">132 kV</option>
              <option value="33">33 kV</option>
              <option value="11">11 kV</option>
            </select>
            <select
              aria-label="IED type filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-w-0 rounded border border-[#245071] bg-[#020e1b] p-1.5 text-[10px] text-slate-200"
            >
              <option value="ALL">All Types</option>
              <option value="Feeder">Feeder</option>
              <option value="Transformer">Transformer</option>
              <option value="Bus">Bus / Coupler</option>
              <option value="Line">Line</option>
            </select>
          </div>
          <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
            {filteredIeds.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">No IEDs match these filters.</div>
            )}
            {filteredIeds.map((ied) => {
              const isSelected = ied.id === selectedIed.id;
              return (
                <button
                  key={ied.id}
                  type="button"
                  onClick={() => setSelectedIedId(ied.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition ${
                    isSelected
                      ? 'bg-[#10243A] border-[#00D9FF] shadow-lg'
                      : 'bg-[#081629] border-[#1E3A5F] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RelayThumbnail vendor={ied.vendor} model={ied.model} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#00D9FF] font-mono">{ied.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ied.commHealthy
                              ? 'bg-[#22C55E]/20 text-[#22C55E]'
                              : 'bg-[#FF4D62]/20 text-[#FF4D62]'
                          }`}
                        >
                          {ied.commHealthy ? 'ONLINE' : 'COMM LOSS'}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-[#DCEAF5] mt-0.5">
                        {ied.vendor} — {ied.model}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{ied.bayName}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-1.5 border-t border-slate-800">
                        <span>PRP-A: {ied.ipAddressLanA}</span>
                        <span>{ied.redundancySupport.join('/')}</span>
                        <span>{ied.sclEdition}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 9 Columns: Deep IED Hardware & IEC 61850 Inspector */}
        <div className="xl:col-span-9 min-w-0 rounded-xl bg-[#081629] border border-cyan-700/60 p-3 space-y-3 shadow-[0_0_16px_rgba(0,217,255,0.07)]">
          {/* Selected IED faceplate and live communication status */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/70 pb-2">
            <h3 className="text-sm font-bold tracking-wide text-white">
              SELECTED IED — {selectedIed.vendor.toUpperCase()} {selectedIed.model} ({selectedIed.name})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openZoomInspector(
                    `${selectedIed.vendor} ${selectedIed.model} — ${selectedIed.name}`,
                    `Bay: ${selectedIed.bayName} • LAN A: ${selectedIed.ipAddressLanA} • High-Resolution 1400×1400 Front-Panel Inspection`,
                    selectedIedImage
                  )
                }
                className="px-2.5 py-1 rounded border border-[#00D9FF] bg-[#06223A] text-[11px] font-bold text-[#77E7FF] hover:bg-[#0B3558] flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Zoom &amp; Inspect Front Panel (HD)
              </button>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                  selectedIed.commHealthy
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500 bg-red-500/10 text-red-400'
                }`}
              >
                {selectedIed.commHealthy ? 'ONLINE' : 'COMM LOSS'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#204665] bg-[#020e1b] p-3 lg:grid-cols-12">
            <div className="lg:col-span-4 min-w-0">
              <div
                role="button"
                tabIndex={0}
                title="Click to enlarge and pan high-resolution front panel"
                onClick={() =>
                  openZoomInspector(
                    `${selectedIed.vendor} ${selectedIed.model} — ${selectedIed.name}`,
                    `Bay: ${selectedIed.bayName} • LAN A: ${selectedIed.ipAddressLanA} • High-Resolution Front-Panel Inspection`,
                    selectedIedImage
                  )
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  openZoomInspector(
                    `${selectedIed.vendor} ${selectedIed.model} — ${selectedIed.name}`,
                    `Bay: ${selectedIed.bayName} • LAN A: ${selectedIed.ipAddressLanA}`,
                    selectedIedImage
                  )
                }
                className="group relative cursor-zoom-in flex h-[220px] items-center justify-center rounded-lg border border-[#31536e] hover:border-[#00D9FF] bg-[#07111f] p-2 overflow-hidden"
              >
                <img
                  key={`${selectedIed.vendor}-${selectedIed.model}`}
                  src={selectedIedImage}
                  alt={`${selectedIed.vendor} ${selectedIed.model}`}
                  className="ied-device-image"
                  loading="lazy"
                  decoding="async"
                />
                <span style={{ position: "absolute", bottom: "8px", right: "8px", backgroundColor: "rgba(3, 13, 27, 0.92)", borderColor: "#00D9FF" }} className="rounded border px-2 py-0.5 text-[10px] font-mono text-[#77E7FF] flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" /> Click to Zoom HD
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerMmsGeneralInterrogation(selectedIed.id)}
                className="mt-2 w-full rounded-md bg-[#00D9FF] py-1.5 text-[11px] font-bold text-slate-950 hover:bg-[#35e5ff]"
              >
                Trigger MMS General Interrogation
              </button>
            </div>

            <div className="lg:col-span-4 min-w-0 rounded-lg border border-[#204665] bg-[#081b2d] p-2.5 text-[11px]">
              <h4 className="mb-2 text-xs font-bold text-cyan-300">IED INFORMATION</h4>
              {[
                ['IED ID', selectedIed.name],
                ['Vendor', selectedIed.vendor],
                ['Model', selectedIed.model],
                ['Bay', selectedIed.bayName],
                ['LAN A', selectedIed.ipAddressLanA],
                ['LAN B', selectedIed.ipAddressLanB],
                ['Redundancy', selectedIed.redundancySupport.join('/')],
                ['Firmware', selectedIed.firmwareVersion],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[78px_minmax(0,1fr)] gap-2 border-b border-[#193750] py-1 last:border-0"
                >
                  <span className="text-slate-400">{label}</span>
                  <span className="break-words font-mono text-slate-100">{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4 min-w-0 rounded-lg border border-[#204665] bg-[#081b2d] p-2.5">
              <h4 className="mb-2 text-xs font-bold text-cyan-300">COMMUNICATION STATUS</h4>
              {[
                ['MMS Association (TCP/102)', selectedIed.commHealthy, 'Connected'],
                [
                  'GOOSE Publish (0x88B8)',
                  selectedIed.commHealthy &&
                    iedGoose.some((g) => g.publisherIedId === selectedIed.id && g.healthy),
                  'Active',
                ],
                [
                  'GOOSE Subscribe (0x88B8)',
                  selectedIed.commHealthy &&
                    iedGoose.some((g) => g.subscriberIedIds.includes(selectedIed.id) && g.healthy),
                  'Active',
                ],
                ['Time Sync (PTP/SNTP)', selectedIed.commHealthy, selectedIed.timeSyncProtocol],
                ['PRP LAN A', selectedIed.commHealthy && Boolean(selectedIed.ipAddressLanA), 'Up'],
                ['PRP LAN B', selectedIed.commHealthy && Boolean(selectedIed.ipAddressLanB), 'Up'],
              ].map(([label, ok, status]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-2 border-b border-[#193750] py-1.5 text-[11px] last:border-0"
                >
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <span className={ok ? 'text-emerald-400' : 'text-amber-400'}>{ok ? '●' : '○'}</span>
                    {label}
                  </span>
                  <span className={ok ? 'font-semibold text-emerald-400' : 'text-slate-500'}>
                    {ok ? status : 'Not active'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 12-Tab Navigation Bar */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
            {IED_INSPECTOR_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveSubTab(t)}
                className={`px-3 py-2 rounded-lg text-[12.5px] font-semibold transition ${
                  activeSubTab === t
                    ? 'bg-[#00D9FF] text-slate-950'
                    : 'bg-[#10243A] text-slate-300 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="min-h-[155px] text-sm space-y-3">
            {activeSubTab === 'Overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#10243A] border border-cyan-900/70 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase">IED Identity</div>
                  <div className="font-bold text-sm text-white">{selectedIed.name}</div>
                  <div>Vendor: {selectedIed.vendor}</div>
                  <div>Model: {selectedIed.model}</div>
                  <div>Function: {selectedIed.role}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#10243A] border border-cyan-900/70 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase">Station-Bus Addressing</div>
                  <div className="font-mono text-[#00D9FF]">LAN A: {selectedIed.ipAddressLanA}</div>
                  <div className="font-mono text-[#00D9FF]">LAN B: {selectedIed.ipAddressLanB}</div>
                  <div className="font-mono">MAC: {selectedIed.macAddress}</div>
                  <div>
                    Node Type: {selectedIed.nodeType} ({selectedIed.redundancySupport.join(', ')})
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#10243A] border border-cyan-900/70 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase">IEC 61850 Stack</div>
                  <div>Edition: {selectedIed.sclEdition}</div>
                  <div>Logical Devices: {selectedIed.logicalDevices.length}</div>
                  <div>Configured DataSets: {selectedIed.datasets.length}</div>
                  <div>Report Control Blocks: {selectedIed.rcbs.length}</div>
                </div>
              </div>
            )}

            {activeSubTab === 'Protocols & Communication' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#071A2E] border border-[#00CFFF] space-y-1">
                  <div className="text-sm font-extrabold text-white">
                    Supported &amp; Enabled Communication Protocols — {selectedIed.vendor}{' '}
                    {selectedIed.model} ({selectedIed.name})
                  </div>
                  <p className="text-[11px] text-[#9BC0DF]">
                    Protection &amp; Bay Control IEDs natively implement IEC 61850 MMS, IEC 61850 GOOSE, and SNTP/PTP time synchronization. Northbound IEC-104 and OPC UA are provided via the Station Gateway / SCADA Server rather than directly on protection relays.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#1E466E]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[#0A2540] text-[#9BC0DF] font-bold">
                      <tr>
                        <th className="py-2 px-2.5">Protocol</th>
                        <th className="py-2 px-2.5">Capability / State</th>
                        <th className="py-2 px-2.5">IP / MAC Endpoint</th>
                        <th className="py-2 px-2.5">Port / EtherType</th>
                        <th className="py-2 px-2.5">Role</th>
                        <th className="py-2 px-2.5">Last Message &amp; Quality</th>
                        <th className="py-2 px-2.5">Diagnostics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#132E4A] bg-[#04101E] font-mono">
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-extrabold text-[#00CFFF]">IEC 61850 MMS</td>
                        <td className="py-2 px-2.5 text-[#4ADE80] font-bold">● Supported &amp; Enabled</td>
                        <td className="py-2 px-2.5 text-white">
                          {selectedIed.ipAddressLanA} / {selectedIed.ipAddressLanB}
                        </td>
                        <td className="py-2 px-2.5 text-[#77E7FF]">TCP Port 102</td>
                        <td className="py-2 px-2.5 text-slate-200">MMS Server (BRCB/URCB + SBO)</td>
                        <td className="py-2 px-2.5 text-[#4ADE80]">InformationReport • GOOD (0x0000)</td>
                        <td className="py-2 px-2.5 text-slate-300">
                          ISO COTP Association Active with SCADA (10.132.10.200)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-extrabold text-[#4ADE80]">IEC 61850 GOOSE</td>
                        <td className="py-2 px-2.5 text-[#4ADE80] font-bold">● Supported &amp; Enabled</td>
                        <td className="py-2 px-2.5 text-white">01-0C-CD-01-00-01 ({selectedIed.macAddress})</td>
                        <td className="py-2 px-2.5 text-[#4ADE80]">EtherType 0x88B8 (VLAN 20)</td>
                        <td className="py-2 px-2.5 text-slate-200">L2 Multicast Publisher &amp; Subscriber</td>
                        <td className="py-2 px-2.5 text-[#4ADE80]">GOOSE PDU • TAL=2000ms • GOOD</td>
                        <td className="py-2 px-2.5 text-slate-300">0 Mismatches • All ExtRefs Bound</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-extrabold text-[#FDE047]">
                          SNTP / IEEE 1588v2 PTP
                        </td>
                        <td className="py-2 px-2.5 text-[#4ADE80] font-bold">● Supported &amp; Enabled</td>
                        <td className="py-2 px-2.5 text-white">GM: 192.168.10.100 (Meinberg M400)</td>
                        <td className="py-2 px-2.5 text-[#FDE047]">L2 0x88F7 / UDP Port 123</td>
                        <td className="py-2 px-2.5 text-slate-200">
                          Time Slave ({selectedIed.timeSyncProtocol})
                        </td>
                        <td className="py-2 px-2.5 text-[#4ADE80]">Sync Locked (±38 ns offset)</td>
                        <td className="py-2 px-2.5 text-slate-300">ClockClass=6 (GNSS Locked)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-bold text-[#FDBA74]">Modbus TCP</td>
                        <td className="py-2 px-2.5 text-[#FACC15]">
                          {selectedIed.model.includes('850')
                            ? '● Supported (Optional Map)'
                            : '○ Gateway / Feeder Meter Only'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400">10.132.30.51 (Feeder Meter)</td>
                        <td className="py-2 px-2.5 text-slate-400">TCP Port 502</td>
                        <td className="py-2 px-2.5 text-slate-400">Dedicated Energy Meter / PLC</td>
                        <td className="py-2 px-2.5 text-slate-400">Mapped on 33/11 kV Feeder Meters</td>
                        <td className="py-2 px-2.5 text-slate-400">Primary protection uses IEC 61850</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-bold text-[#D8B4FE]">IEC 60870-5-104</td>
                        <td className="py-2 px-2.5 text-[#FACC15]">
                          {selectedIed.model.includes('C264')
                            ? '● Supported (Bay/Station GTW)'
                            : '○ Via Station Gateway Only'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400">10.132.10.190 (Station Gateway)</td>
                        <td className="py-2 px-2.5 text-slate-400">TCP Port 2404</td>
                        <td className="py-2 px-2.5 text-slate-400">Northbound Telecontrol to RCC</td>
                        <td className="py-2 px-2.5 text-slate-400">Gateway translates MMS → IOA</td>
                        <td className="py-2 px-2.5 text-slate-400">COA 132 Active on Moxa MGate 5216</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-sans font-bold text-[#93C5FD]">OPC UA</td>
                        <td className="py-2 px-2.5 text-slate-400">○ Via SCADA Server A Only</td>
                        <td className="py-2 px-2.5 text-slate-400">opc.tcp://10.132.10.200:4840</td>
                        <td className="py-2 px-2.5 text-slate-400">TCP Port 4840</td>
                        <td className="py-2 px-2.5 text-slate-400">SCADA Server → Historian</td>
                        <td className="py-2 px-2.5 text-slate-400">SCADA exposes ns=2 Nodes</td>
                        <td className="py-2 px-2.5 text-slate-400">Not run directly on protection IEDs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'Hardware' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#10243A] border border-slate-800 space-y-1.5">
                  <div className="font-bold text-[#DCEAF5]">Backplane Module &amp; Slot Configuration</div>
                  <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                    <li>• Slot X1 (PS): 110–250V DC Power Supply + Watchdog Contact</li>
                    <li>
                      • Slot X2 (CT/VT): 4× Current Inputs ({associatedBay?.ctRatio}) + 4× Voltage Inputs (
                      {associatedBay?.vtRatio})
                    </li>
                    <li>
                      • Slot X3 (BI/BO): 16× Binary Inputs (110V DC threshold 77V) + 12× High-Speed Trip Outputs
                    </li>
                    <li>• Slot X4 (ETH): Dual 100BASE-FX LC Optical Ports (ChA &amp; ChB PRP/HSR LRE)</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-[#10243A] border border-slate-800 space-y-1.5">
                  <div className="font-bold text-[#DCEAF5]">Environmental &amp; Resource Telemetry</div>
                  <div>
                    CPU Utilization: <strong className="text-[#00D9FF]">{selectedIed.cpuLoadPercent}%</strong>
                  </div>
                  <div>
                    Internal Case Temperature: <strong className="text-[#22C55E]">{selectedIed.caseTempC}°C</strong>
                  </div>
                  <div>
                    Optical Transceiver Tx/Rx Power:{' '}
                    <strong className="text-emerald-400">-14.2 dBm / -15.1 dBm (Normal)</strong>
                  </div>
                  <div>
                    Time Sync Hardware Clock:{' '}
                    <strong className="text-[#00D9FF]">{selectedIed.timeSyncProtocol}</strong>
                  </div>
                </div>
              </div>
            )}

            {(activeSubTab === 'IEC 61850 Model' || activeSubTab === 'Logical Nodes') && (
              <div className="space-y-3">
                {selectedIed.logicalDevices.map((ld) => (
                  <div key={ld.ldInst} className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#00D9FF] font-mono">
                        LDevice inst=&quot;{ld.ldInst}&quot; ({selectedIed.name}
                        {ld.ldInst})
                      </span>
                      <span className="text-slate-400">{ld.description}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ld.logicalNodes.map((ln) => (
                        <div
                          key={ln.lnClass + ln.lnInst}
                          className="p-2.5 rounded bg-[#10243A] border border-slate-700 space-y-1"
                        >
                          <div className="font-bold text-white font-mono">
                            LN: {ln.lnClass}
                            {ln.lnInst} —{' '}
                            <span className="font-sans font-normal text-slate-300">{ln.description}</span>
                          </div>
                          {ln.dataObjects.map((doItem) => (
                            <div
                              key={doItem.doName}
                              className="pl-2 border-l-2 border-[#00D9FF] text-[11px] font-mono"
                            >
                              <div className="flex justify-between">
                                <span className="text-[#DCEAF5]">
                                  DO: {doItem.doName} ({doItem.cdc} [{doItem.fc}])
                                </span>
                                <span className="text-[#22C55E]">{doItem.value}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Attributes:{' '}
                                {doItem.attributes.map((a) => `${a.daName}=${a.val}`).join(' | ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'DataSets' && (
              <div className="space-y-2.5">
                {selectedIed.datasets.map((ds) => (
                  <div key={ds.name} className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#00D9FF] font-mono">
                        {selectedIed.name}
                        {ds.ldInst}/LLN0.{ds.name}
                      </span>
                      <span className="text-slate-400">{ds.description}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ds.fcdas.map((f, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#10243A] border border-slate-700 font-mono text-[11px] text-slate-200"
                        >
                          {f.ldInst}/{f.lnClass}
                          {f.lnInst}.{f.doName} [{f.fc}]
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'RCBs' && (
              <div className="space-y-2.5">
                {selectedIed.rcbs.map((rcb) => (
                  <div
                    key={rcb.name}
                    className="p-3 rounded-lg bg-[#030712] border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 font-mono">
                      <div className="font-bold text-[#00D9FF]">{rcb.rptId}</div>
                      <div className="text-[11px] text-slate-300">
                        Type: {rcb.buffered ? 'Buffered BRCB' : 'Unbuffered URCB'} | DataSet: {rcb.datSet} | confRev:{' '}
                        {rcb.confRev}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        TrgOps: [{rcb.trgOps.join(', ')}] | IntgPd: {rcb.intgPdMs} ms | BufTime: {rcb.bufTimeMs} ms |
                        Client: {rcb.clientIp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRcbEnabled(selectedIed.id, rcb.name)}
                      className={`px-3 py-1 rounded font-bold text-xs ${
                        rcb.enabled
                          ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                          : 'bg-[#FF4D62]/20 text-[#FF4D62] border border-[#FF4D62]/40'
                      }`}
                    >
                      RptEna = {String(rcb.enabled)}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'GOOSE' && (
              <div className="space-y-2.5">
                {iedGoose.length === 0 ? (
                  <div className="p-4 rounded bg-[#030712] text-slate-400">
                    This bay IED uses local CILO interlocking and MMS BRCB reporting; inspect main GOOSE blocks in GOOSE Lab.
                  </div>
                ) : (
                  iedGoose.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-1 font-mono"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-[#00D9FF]">{g.gocbRef}</span>
                        <span className={g.healthy ? 'text-[#22C55E]' : 'text-[#FF4D62]'}>
                          {g.healthy ? 'HEALTHY' : g.mismatchFault}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        MAC: {g.multicastMac} | APPID: {g.appId} | VLAN: {g.vlanId} | stNum: {g.stNum} | sqNum:{' '}
                        {g.sqNum}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSubTab === 'MMS' && (
              <div className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-2 font-mono">
                <div className="text-[#00D9FF] font-bold">
                  MMS Server TCP:102 Association Status — {selectedIed.ipAddressLanA}:102
                </div>
                <div>OSI-TSEL: 0001 | OSI-SSEL: 0001 | OSI-PSEL: 00000001 | AP-Title: 1.3.9999.23</div>
                <div>Max MMS Client Associations: 8 (Active: 2 — SCADA Server A &amp; Station Gateway C264)</div>
                <div>
                  Supported MMS Services: GetNameList, Read, Write, InformationReport, SelectWithValue, Operate
                </div>
              </div>
            )}

            {activeSubTab === 'Signal Mapping' && (
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#10243A] text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Signal Name</th>
                      <th className="p-2">IEC 61850 Reference</th>
                      <th className="p-2">FC</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#030712]">
                    {iedSignals.map((sig) => (
                      <tr key={sig.id}>
                        <td className="p-2 font-mono text-slate-400">{sig.catalogNumber}</td>
                        <td className="p-2 font-medium text-white">{sig.signalName}</td>
                        <td className="p-2 font-mono text-[#00D9FF]">{sig.iec61850Ref}</td>
                        <td className="p-2 font-mono">{sig.fc}</td>
                        <td className="p-2 font-mono text-[#22C55E]">
                          {String(sig.value)} {sig.unit || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'SCL' && (
              <pre className="p-3 rounded-lg bg-[#030712] border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72">
                {SCL_FILE_SAMPLES[1].xmlContent.replace(/IED_33_F03/g, selectedIed.name)}
              </pre>
            )}

            {activeSubTab === 'Alarms & Diagnostics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-1">
                  <div className="font-bold text-[#DCEAF5]">Self-Supervision &amp; Watchdog</div>
                  <div>
                    LPHD1.PhyHealth.stVal:{' '}
                    <strong className="text-[#22C55E]">
                      {selectedIed.commHealthy ? '1 (Ok)' : '3 (Alarm)'}
                    </strong>
                  </div>
                  <div>
                    LLN0.Health.stVal:{' '}
                    <strong className="text-[#22C55E]">
                      {selectedIed.commHealthy ? '1 (Ok)' : '3 (Alarm)'}
                    </strong>
                  </div>
                  <div>
                    LTMS1.TmSyn.stVal:{' '}
                    <strong className="text-[#00D9FF]">LOCKED ({selectedIed.timeSyncProtocol})</strong>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-1">
                  <div className="font-bold text-[#DCEAF5]">Switchgear Supervision</div>
                  <div>
                    Spring Charged (SOPM1): <strong>{String(associatedBay?.springCharged)}</strong>
                  </div>
                  <div>
                    SF6 Pressure Normal (SIMG1): <strong>{String(associatedBay?.sf6PressureNormal)}</strong>
                  </div>
                  <div>
                    Trip Circuit 74TC Healthy (SPTR1): <strong>{String(associatedBay?.tcsHealthy)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Station-Level SAS Infrastructure Hardware Cards */}
      <div className="rounded-xl border border-cyan-700/60 bg-[#061729] p-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2.5">
          Substation Automation Station-Level Servers, Gateways, Switches &amp; PTP Clocks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {infrastructure.map((dev) => {
            const infraSrc = getInfrastructureImage(dev.category, dev.name);
            return (
              <div
                key={dev.id}
                onClick={() =>
                  openZoomInspector(`${dev.name} (${dev.model})`, `${dev.category} • IP: ${dev.ipAddress}`, infraSrc)
                }
                className="cursor-zoom-in min-w-0 p-2.5 rounded-lg bg-[#081629] border border-[#1E3A5F] hover:border-cyan-600/70 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#10243A] text-[#00D9FF] font-semibold text-[10px]">
                    {dev.category}
                  </span>
                  <span
                    className={`font-bold text-[10px] ${
                      dev.status === 'ONLINE' ? 'text-[#22C55E]' : 'text-[#FF4D62]'
                    }`}
                  >
                    {dev.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <InfrastructureThumbnail category={dev.category} name={dev.name} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[13px] font-bold leading-tight text-[#DCEAF5]">{dev.name}</div>
                    <div className="text-xs text-slate-300">{dev.model}</div>
                    <div className="text-xs font-mono text-[#00D9FF]">
                      IP: {dev.ipAddress} • {dev.portsCount} Ports
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-snug line-clamp-2" title={dev.description}>
                  {dev.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* High-Resolution Front-Panel Zoom & Pan Inspection Modal (Section 5) */}
      {zoomModalOpen && zoomTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-[#051324] border-2 border-[#00D9FF] shadow-[0_0_50px_rgba(0,217,255,0.35)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-[#081E36] border-b border-[#1D466E] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">{zoomTarget.title}</h3>
                <p className="text-xs text-[#77E7FF] font-mono">{zoomTarget.subtitle}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 1.5, 2, 3, 4].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoomLevel(z)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold border ${
                      zoomLevel === z
                        ? 'bg-[#00D9FF] text-slate-950 border-[#00D9FF]'
                        : 'bg-[#04101E] text-slate-200 border-[#245071]'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.5).toFixed(2))))}
                  className="p-1.5 rounded bg-[#04101E] border border-[#245071] text-white hover:border-[#00D9FF]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(4, Number((z + 0.5).toFixed(2))))}
                  className="p-1.5 rounded bg-[#04101E] border border-[#245071] text-white hover:border-[#00D9FF]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="p-1.5 rounded bg-[#04101E] border border-[#245071] text-white hover:border-[#00D9FF]"
                  title="Reset Zoom & Pan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomModalOpen(false)}
                  className="px-3 py-1 rounded-lg bg-[#102A45] border border-[#2D5A88] text-xs font-bold text-white hover:border-[#00D9FF] flex items-center gap-1 ml-1"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            <div
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                setZoomLevel((z) => Math.min(4, Math.max(1, Number((z + delta).toFixed(2)))));
              }}
              className="relative h-[540px] w-full bg-[#040B14] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
            >
              <img
                src={zoomTarget.src}
                alt={zoomTarget.title}
                draggable={false}
                style={{
                  width: `${Math.round(zoomLevel * 440)}px`,
                  height: `${Math.round(zoomLevel * 440)}px`,
                  objectFit: 'contain',
                  objectPosition: 'center',
                  marginLeft: `${panOffset.x}px`,
                  marginTop: `${panOffset.y}px`,
                }}
              />
              <div className="absolute bottom-3 left-3 rounded-lg bg-[#030D1B]/90 border border-[#1E466E] px-3 py-1.5 text-[11px] font-mono text-[#9BC0DF]">
                Zoom: {(zoomLevel * 100).toFixed(0)}% • Drag image to pan • Scroll wheel or buttons (1x–4x) to inspect LCD, LEDs &amp; keypad
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
