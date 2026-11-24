import React, { useEffect, useMemo, useState } from 'react';
import { Download, Upload, Plus, Pencil, Trash2, Save, Layers, List, RotateCcw, Activity, Settings2, RadioTower, CloudUpload } from 'lucide-react';
import { useSubstationStore, solveSubstationElectricalGraph } from '../simulation/useSubstationStore';
import { INITIAL_BAYS } from '../data/substationData';
import { blank, KEY, loadCustomBayConfigs, loadHiddenDefaultBayIds, saveHiddenDefaultBayIds, toRuntimeBay, validRow, kinds, normalizeBayId, runtimeBayId, voltageVtRatio, type BayConfig, type BayKind } from '../simulation/customBayConfig';
import { buildMultiVendorIeds, buildNetworkLinks } from '../data/iedData';
import { instantiateSignalsForSubstation } from '../data/signalCatalogue';

function syncRuntime(rows: BayConfig[], hiddenDefaultIds: string[]) {
  const store = useSubstationStore.getState();
  const defaults = INITIAL_BAYS.filter(b => !hiddenDefaultIds.includes(b.id));
  const old = new Map(store.bays.filter(b => b.isUserCreated).map(b => [b.id, b]));
  const bays = [...defaults, ...rows.map(b => {
    const created = toRuntimeBay(b);
    const previous = old.get(created.id);
    // Preserve telemetry only while the engineering definition is unchanged.
    return previous && previous.iedId === created.iedId && previous.breakerId === created.breakerId
      ? { ...created, breakerState: previous.breakerState, currentA: previous.currentA,
          currentB: previous.currentB, currentC: previous.currentC, activePowerMw: previous.activePowerMw,
          energized: previous.energized } : created;
  })];
  const solved = solveSubstationElectricalGraph(bays, store.transformers, store.busbars, store.faultScenarios);
  const validIds = new Set(solved.bays.map(b => b.id));
  useSubstationStore.setState({
    bays: solved.bays, busbars: solved.busbars, transformers: solved.transformers,
    ieds: buildMultiVendorIeds(solved.bays), networkLinks: buildNetworkLinks(solved.bays),
    signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
    selectedBayId: validIds.has(store.selectedBayId) ? store.selectedBayId : defaults[0]?.id || '',
    alarms: store.alarms.filter(a => !a.bayId || validIds.has(a.bayId)),
  });
}
export function BayConfigurationManager() {
  const [rows, setRows] = useState<BayConfig[]>(loadCustomBayConfigs);
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>(loadHiddenDefaultBayIds);
  const [draft, setDraft] = useState<BayConfig>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [undoSnapshot, setUndoSnapshot] = useState<BayConfig[] | null>(null);
  const [filter, setFilter] = useState<'ALL' | '132' | '33' | '11'>('ALL');
  const [selectedBayId, setSelectedBayId] = useState('');
  const [activeTab, setActiveTab] = useState<'configuration' | 'manage' | 'import'>('configuration');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(rows)); saveHiddenDefaultBayIds(hiddenDefaults); syncRuntime(rows, hiddenDefaults); } catch { setMessage('Browser storage unavailable. Export your configuration as JSON.'); } }, [rows, hiddenDefaults]);
  const shown = useMemo(() => rows.filter(r => filter === 'ALL' || String(r.voltageKv) === filter), [rows, filter]);
  const defaultShown = useMemo(() => INITIAL_BAYS.filter(r => !hiddenDefaults.includes(r.id) && (filter === 'ALL' || String(r.voltageKv) === filter)), [hiddenDefaults, filter]);
  const selectedExisting = defaultShown.find(b => b.id === selectedBayId);
  const selectedCustom = shown.find(b => b.id === selectedBayId);
  const selectedBay = selectedExisting || selectedCustom;
  const runtimeBay = useSubstationStore(s => s.bays.find(b => b.id === runtimeBayId(selectedBayId)));
  const update = <K extends keyof BayConfig>(key: K, value: BayConfig[K]) => setDraft(s => ({ ...s, [key]: value }));
  function save(e: React.FormEvent) { e.preventDefault(); const b = { ...draft, id: normalizeBayId(draft.id), name: draft.name.trim(), breakerId: draft.breakerId.trim(), iedId: draft.iedId.trim() }; if (!validRow(b)) { setMessage('Enter a valid Bay ID, name, equipment and load.'); return; } if (INITIAL_BAYS.some(r => r.id === runtimeBayId(b.id)) || rows.some(r => r.id === b.id && r.id !== editing)) { setMessage('Bay ID already exists. Choose a unique ID.'); return; } if (b.busSection === 'COUPLE' && b.bayType !== 'BUS_COUPLER') { setMessage('COUPLE bus section is only valid for BUS COUPLER bays.'); return; }
    if (b.busSection !== 'COUPLE' && b.bayType === 'BUS_COUPLER') { setMessage('BUS COUPLER requires COUPLE bus section.'); return; }
    if (b.bayType === 'BUS_COUPLER') { setMessage('Adding bus couplers requires dedicated bus topology engineering and is not supported by automatic integration.'); return; }
    if (b.bayType === 'LINE_INCOMER' && b.voltageKv !== 132) { setMessage('Automatic LINE INCOMER placement is supported at 132 kV only.'); return; }
    if (b.bayType === 'TRANSFORMER_HV' || b.bayType === 'TRANSFORMER_LV_INCOMER' || b.bayType === 'DIST_TX_FEEDER') { setMessage('Transformer bays require transformer connectivity engineering; automatic creation is not yet supported.'); return; }
    if ([...INITIAL_BAYS, ...rows.filter(r => r.id !== editing)].some(r => r.breakerId === (b.breakerId || `CB-${b.id}`) || r.iedId === (b.iedId || `IED-${b.id}`))) { setMessage('Breaker ID and IED ID must be unique.'); return; }
    setRows(old => editing ? old.map(r => r.id === editing ? b : r) : [...old, b]); setDraft(blank()); setEditing(null); setMessage(`Saved ${b.id} locally.`); }
  function exportJson() { const blob = new Blob([JSON.stringify({ version: 2, bays: rows, hiddenDefaultBayIds: hiddenDefaults }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sas-bay-config.json'; a.click(); URL.revokeObjectURL(url); }
  async function importJson(file?: File) { if (!file) return; try { const data = JSON.parse(await file.text()); if (!Array.isArray(data.bays) || !data.bays.every(validRow) || new Set(data.bays.map((b: BayConfig) => normalizeBayId(b.id))).size !== data.bays.length) throw Error('Invalid or duplicate Bay entries'); if (!window.confirm(`Replace ${rows.length} saved custom bays with ${data.bays.length} imported bays?`)) return; setRows(data.bays.map((b: BayConfig) => ({ ...b, id: normalizeBayId(b.id) }))); setHiddenDefaults(Array.isArray(data.hiddenDefaultBayIds) ? data.hiddenDefaultBayIds.filter((id: unknown) => typeof id === 'string' && INITIAL_BAYS.some(b => b.id === id)) : []); setMessage('Configuration imported successfully.'); } catch (e) { setMessage(`Import failed: ${e instanceof Error ? e.message : 'Invalid JSON'}`); } }
  const inputClass = 'mt-1 w-full min-w-0 rounded-md border border-[#145576] bg-[#06192b] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-[#00dcff] focus:shadow-[0_0_8px_rgba(0,220,255,0.25)]';
  const actionClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-125';
  const tabClass = (active: boolean) => `inline-flex min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition ${active ? 'border-[#00E5FF] bg-gradient-to-b from-[#13D5EF] to-[#009DC2] text-white shadow-[0_0_12px_rgba(0,220,255,0.55)]' : 'border-[#1A6A8B] bg-[#06192b] text-slate-200 hover:border-cyan-400'}`;
  return <div className="space-y-3 text-slate-100 text-[12px]">
    <div className="flex flex-wrap gap-2 rounded-lg border border-[#14658a] bg-[#051a2c] p-2">
      <button type="button" className={tabClass(activeTab === 'configuration')} onClick={() => setActiveTab('configuration')}><Settings2 className="h-4 w-4"/> Bay Configuration</button>
      <button type="button" className={tabClass(activeTab === 'manage')} onClick={() => setActiveTab('manage')}><List className="h-4 w-4"/> Bay List &amp; Manage</button>
      <button type="button" className={tabClass(activeTab === 'import')} onClick={() => setActiveTab('import')}><CloudUpload className="h-4 w-4"/> Import / Export</button>
    </div>
    {activeTab === 'import' && <section className="rounded-lg border border-[#087da5] bg-[#061b2d] p-4 space-y-3">
      <h3 className="font-bold text-cyan-300">Import / Export Bay Configuration</h3>
      <p className="text-slate-400">Export existing custom bays and hidden default bay IDs. Import replaces the current saved configuration after confirmation.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={actionClass+' border-cyan-600 text-cyan-200'} onClick={exportJson}><Download className="h-4 w-4"/> Export JSON</button><label className={actionClass+' cursor-pointer border-cyan-600 text-cyan-200'}><Upload className="h-4 w-4"/> Import JSON<input className="hidden" type="file" accept=".json,application/json" onChange={e => { void importJson(e.target.files?.[0]); e.target.value = ''; }}/></label></div>
    </section>}
    {(activeTab === 'configuration' || activeTab === 'manage') && <div className={activeTab === 'configuration' ? 'grid gap-3' : 'grid gap-3'}>
      {activeTab === 'configuration' && <form onSubmit={save} className="space-y-2 rounded-lg border border-[#00a8d5] bg-[#041a2b] p-3 shadow-[inset_0_0_16px_rgba(0,207,255,0.05)]">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#52E6FF]"><Plus className="h-5 w-5"/> {editing ? `Edit Bay — ${editing}` : 'Add / Edit Bay'}</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <label>Bay ID <span className="text-red-400">*</span><input required className={inputClass} placeholder="33-F04" value={draft.id} onChange={e => { const id = e.target.value; setDraft(d => ({ ...d, id, breakerId: !d.breakerId || d.breakerId === `CB-${normalizeBayId(d.id)}` ? `CB-${normalizeBayId(id)}` : d.breakerId, iedId: !d.iedId || d.iedId === `IED-${normalizeBayId(d.id)}` ? `IED-${normalizeBayId(id)}` : d.iedId })); }}/></label>
          <label>Bay Name <span className="text-red-400">*</span><input required className={inputClass} placeholder="33 kV Feeder 04" value={draft.name} onChange={e => update('name', e.target.value)}/></label>
          <label>Voltage Level <span className="text-red-400">*</span><select className={inputClass} value={draft.voltageKv} onChange={e => { const kv = Number(e.target.value) as BayConfig['voltageKv']; setDraft(d => ({ ...d, voltageKv: kv, vtRatio: voltageVtRatio(kv) })); }}>{[132,33,11].map(v => <option key={v} value={v}>{v} kV</option>)}</select></label>
          <label>Bus Section <span className="text-red-400">*</span><select className={inputClass} value={draft.busSection} onChange={e => update('busSection', e.target.value as BayConfig['busSection'])}>{['A','B','COUPLE'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="col-span-2">Bay Type <span className="text-red-400">*</span><select className={inputClass} value={draft.bayType} onChange={e => update('bayType', e.target.value as BayKind)}>{kinds.map(v => <option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
          <label>Breaker ID<input className={inputClass} placeholder="52-F04" value={draft.breakerId} onChange={e => update('breakerId', e.target.value)}/></label>
          <label>IED ID<input className={inputClass} placeholder="IED-33-F04" value={draft.iedId} onChange={e => update('iedId', e.target.value)}/></label>
          <label className="col-span-2">IED Vendor<select className={inputClass} value={draft.vendor} onChange={e => update('vendor', e.target.value)}>{['Schneider Electric','Siemens','ABB / Hitachi Energy','GE Vernova','Other'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label>CT Ratio<input className={inputClass} value={draft.ctRatio} onChange={e => update('ctRatio', e.target.value)}/></label>
          <label>VT Ratio<input className={inputClass} value={draft.vtRatio} onChange={e => update('vtRatio', e.target.value)}/></label>
          <label>Nominal Load (MW)<input type="number" min="0" step="0.01" className={inputClass} value={draft.nominalLoadMw} onChange={e => update('nominalLoadMw', Number(e.target.value))}/></label>
          <label>Initial Breaker<select className={inputClass} value={draft.breakerState} onChange={e => update('breakerState', e.target.value as BayConfig['breakerState'])}><option>OPEN</option><option>CLOSED</option></select></label>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1"><button type="submit" className={actionClass+' border-cyan-400 bg-cyan-500 text-slate-950'}><Save className="h-4 w-4"/> {editing ? 'Update Bay' : 'Save Bay'}</button><button type="button" className={actionClass+' border-slate-600 text-slate-200'} onClick={() => { setEditing(null); setDraft(blank()); }}> <RotateCcw className="h-4 w-4"/> Reset</button></div>
        {message && <p role="status" className="text-xs text-cyan-300">{message}</p>}
        {undoSnapshot && <button type="button" className={actionClass+' border-amber-500 text-amber-300'} onClick={() => { setRows(undoSnapshot); setUndoSnapshot(null); setMessage('Restored previous custom bays.'); }}>Undo last deletion</button>}
      </form>}
      {activeTab === 'manage' && <section className="space-y-3 rounded-lg border border-[#00a8d5] bg-[#041a2b] p-3 shadow-[inset_0_0_16px_rgba(0,207,255,0.05)]">
        <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-extrabold text-[#52E6FF]"><Layers className="h-5 w-5"/> Configured Bays ({rows.length + INITIAL_BAYS.length - hiddenDefaults.length})</h3>
          <select aria-label="Filter voltage" className={inputClass+' !mt-0 !w-auto'} value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setSelectedBayId(''); }}>{['ALL','132','33','11'].map(v => <option key={v} value={v}>{v === 'ALL' ? 'All voltages' : `${v} kV`}</option>)}</select></div>
        <label className="block">Select Bay<select aria-label="Select bay to manage" className={inputClass} value={selectedBayId} onChange={e => setSelectedBayId(e.target.value)}><option value="">-- Select an existing or custom bay --</option>{defaultShown.length > 0 && <optgroup label="Existing Bays">{defaultShown.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}</optgroup>}{shown.length > 0 && <optgroup label="Custom Bays">{shown.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}</optgroup>}</select></label>
        {selectedBay ? <>
          <div className="rounded-lg border border-[#00a8d5] bg-[#062238] p-3 shadow-[inset_0_0_14px_rgba(0,207,255,0.09)]">
            <div className="flex gap-3"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-[#00DFFF] bg-[#001c30] text-[#00DFFF]"><RadioTower className="h-12 w-12" strokeWidth={1.3}/></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><strong className="text-base text-[#42E7FF]">{selectedBay.id}</strong><span className="rounded border border-cyan-600 px-1.5 py-0.5 text-[10px] text-cyan-300">{selectedExisting ? 'Existing Bay' : 'Custom Bay'}</span></div>
            <dl className="mt-2 grid grid-cols-[82px_minmax(0,1fr)] gap-x-1 gap-y-1 text-[11px]"><dt>Bay Name</dt><dd className="truncate">: {selectedBay.name}</dd><dt>Voltage</dt><dd>: {selectedBay.voltageKv} kV</dd><dt>Bay Type</dt><dd>: {selectedBay.bayType.replaceAll('_',' ')}</dd><dt>Bus Section</dt><dd>: {selectedBay.busSection}</dd><dt>IED Vendor</dt><dd>: {selectedExisting ? 'Configured in runtime' : selectedCustom?.vendor}</dd><dt>IED ID</dt><dd>: {selectedBay.iedId}</dd></dl></div></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCustom && <button type="button" className={actionClass+' border-cyan-500 text-cyan-300'} onClick={() => { setDraft({...selectedCustom}); setEditing(selectedCustom.id); setActiveTab('configuration'); setMessage(`Editing ${selectedCustom.id}.`); }}><Pencil className="h-4 w-4"/> Edit Bay</button>}
            <button type="button" className={actionClass+' border-red-600 text-red-300'} onClick={() => {
              if (!window.confirm(`Delete ${selectedBay.id} (${selectedBay.name}) from the training simulation? Related signals and IED data may be affected. ${selectedExisting ? 'You can restore this existing bay later.' : 'You can undo this custom bay deletion.'}`)) return;
              if (selectedExisting) setHiddenDefaults(old => [...old, selectedBay.id]);
              else { setUndoSnapshot(rows); setRows(old => old.filter(b => b.id !== selectedBay.id)); if (editing === selectedBay.id) { setEditing(null); setDraft(blank()); } }
              setSelectedBayId(''); setMessage(`Deleted ${selectedBay.id} from the training configuration.`);
            }}><Trash2 className="h-4 w-4"/> Delete Bay</button>
            <button type="button" className={actionClass+' border-slate-600 text-slate-200'} onClick={() => { if (hiddenDefaults.length && window.confirm(`Restore ${hiddenDefaults.length} deleted existing bay(s)?`)) { setHiddenDefaults([]); setMessage('Existing bays restored.'); } else if (!hiddenDefaults.length) setMessage('No deleted existing bays to restore.'); }}><RotateCcw className="h-4 w-4"/> Restore Deleted</button>
            <button type="button" className={actionClass+' border-[#2180a5] text-cyan-200'} onClick={() => setMessage(runtimeBay ? `Signals are synchronized for ${runtimeBay.id}. Inspect them in the IED & Signals section.` : `No runtime signal details found for ${selectedBay.id}.`)}><Activity className="h-4 w-4"/> View Signals</button>
          </div>
        </> : <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-cyan-900 p-4 text-center text-slate-400">Choose a Bay to view its configuration, edit or delete it.</div>}
        {hiddenDefaults.length > 0 && <p className="text-xs text-amber-300">{hiddenDefaults.length} default bay(s) hidden. Use Restore Deleted to bring them back.</p>}
      </section>}
    </div>}
    <div className="rounded-md border border-[#175777] bg-[#061b2d] px-3 py-2 text-[11px] text-slate-400">ⓘ Changes update the training simulation store and IEC 61850 signal models. Configured line incomers and outgoing feeders synchronize with the 2D SLD, IED list, simulated IEC 61850 signals and operator controls. 3D assets and physical IED communication are not automatically configured.</div>
  </div>;
}
