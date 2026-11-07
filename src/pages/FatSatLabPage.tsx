import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import {
  CheckCircle2,
  CheckSquare,
  Download,
  FileText,
  Play,
  Printer,
  XCircle,
  Search, ClipboardCheck, Activity, ShieldCheck, ListChecks, FileCheck2, AlertCircle, RotateCcw,
} from 'lucide-react';

export const FatSatLabPage: React.FC = () => {
  const { fatSatTests, runFatSatTest, runAllFatSatTests } = useSubstationStore();
  const [selectedTestId, setSelectedTestId] = useState<string>(fatSatTests[0]?.id || 'TST-01');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('FAT / SAT Test Suite');
  const [showEvidence, setShowEvidence] = useState(false);

  const selectedTest = fatSatTests.find((t) => t.id === selectedTestId) || fatSatTests[0];
  const passCount = fatSatTests.filter((t) => t.status === 'PASS').length;
  const failCount = fatSatTests.filter((t) => t.status === 'FAIL').length;

  const categories = ['All', 'IED', 'GOOSE', 'MMS', 'Protection', 'SCADA', 'Other'];
  const categorize = (test: typeof fatSatTests[number]) => {
    const label = `${test.testCode} ${test.title} ${test.category}`.toLowerCase();
    if (label.includes('goose')) return 'GOOSE';
    if (label.includes('mms') || label.includes('rcb') || label.includes('report control')) return 'MMS';
    if (label.includes('protection') || label.includes('trip') || label.includes('overcurrent')) return 'Protection';
    if (label.includes('scada') || label.includes('alarm') || label.includes('soe') || label.includes('mapping')) return 'SCADA';
    if (label.includes('ied') || label.includes('link') || label.includes('communication')) return 'IED';
    return 'Other';
  };
  const filteredTests = fatSatTests.filter((test) =>
    (category === 'All' || categorize(test) === category) &&
    `${test.testCode} ${test.title} ${test.category} ${test.standardRef}`.toLowerCase().includes(search.toLowerCase())
  );
  const runSelected = () => { if (selectedTest) runFatSatTest(selectedTest.id); };
  const handleExportFatSatCsv = () => {
    const header = ['TestCode', 'Title', 'Category', 'StandardRef', 'Status', 'ExpectedResult', 'ActualResult', 'EvidenceLog'].join(',');
    const rows = fatSatTests.map((t) =>
      [
        t.testCode,
        `"${t.title}"`,
        `"${t.category}"`,
        `"${t.standardRef}"`,
        t.status,
        `"${t.expectedResult}"`,
        `"${t.actualSimulatedResult}"`,
        `"${t.evidenceLog}"`,
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SAS_FAT_SAT_Commissioning_Report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const panel = 'rounded-xl border border-cyan-500/80 bg-[#061a2d] shadow-[0_0_12px_rgba(0,217,255,0.16),inset_0_0_15px_rgba(0,217,255,0.025)]';
  const btn = 'rounded-lg border border-cyan-500/70 bg-[#0a2944] px-3 py-2 font-semibold text-slate-100 transition hover:bg-[#104468] hover:shadow-[0_0_12px_rgba(0,217,255,.35)]';
  const neon = 'rounded-lg bg-[#00d9ef] px-4 py-2 font-bold text-[#001421] shadow-[0_0_14px_rgba(0,217,255,.48)] hover:bg-[#52f5ff]';
  return (
    <div className="space-y-3 text-[13px] text-[#e6f4ff]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">FAT / SAT Laboratory – Substation Automation Commissioning Lab</h1>
          <p className="text-sm text-slate-300">Factory &amp; Site Acceptance Testing (FAT/SAT) for IEC 61850 IEDs, GOOSE, MMS, Protection Functions and SCADA Integration</p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded-lg border border-green-500/70 bg-green-950/40 px-3 py-2 text-green-400">● Simulation : LIVE</span>
          <span className="rounded-lg border border-cyan-500/70 px-3 py-2 text-cyan-300">Tests : {passCount + failCount} / {fatSatTests.length}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {['FAT / SAT Test Suite', 'Test Execution & Monitoring', 'Results & Evidence Log', 'Protocol Export', 'Commissioning Certificate'].map((tab) => (
          <button key={tab} type="button" onClick={() => {setActiveTab(tab); if (tab === 'Protocol Export') handleExportFatSatCsv(); if (tab === 'Commissioning Certificate') window.print(); if (tab === 'Results & Evidence Log') setShowEvidence(true);}} className={activeTab === tab ? neon : btn}>{tab}{tab === 'FAT / SAT Test Suite' ? ` (${fatSatTests.length})` : ''}</button>
        ))}
      </div>
      <section className={`${panel} p-3 sm:p-4`}>
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-9 w-9 shrink-0 text-cyan-300" />
          <div>
            <h2 className="text-base font-extrabold uppercase text-white">FAT / SAT Substation Automation Commissioning Laboratory ({fatSatTests.length} Guided Test Procedures)</h2>
            <p className="text-xs text-slate-300">Execute automated Factory &amp; Site Acceptance Tests directly against the live simulation state and export commissioning protocols.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-green-500 bg-green-950/40 px-4 py-2 font-extrabold text-green-400 shadow-[0_0_12px_rgba(34,197,94,.24)]"><CheckCircle2 className="mr-2 inline h-5 w-5"/>PASS : {passCount}</div>
            <div className="rounded-lg border border-red-500 bg-red-950/30 px-4 py-2 font-extrabold text-red-400 shadow-[0_0_12px_rgba(255,77,98,.2)]"><XCircle className="mr-2 inline h-5 w-5"/>FAIL : {failCount}</div>
            <div className="rounded-lg border border-blue-400/70 bg-[#0a203a] px-4 py-2 font-extrabold text-white">TOTAL : {fatSatTests.length}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runAllFatSatTests} className={`${neon} flex items-center gap-2`}><Play className="h-4 w-4"/>Execute All {fatSatTests.length} FAT/SAT Procedures</button>
            <button type="button" onClick={handleExportFatSatCsv} className={`${btn} flex items-center gap-2`}><Download className="h-4 w-4 text-cyan-300"/>Export CSV Protocol</button>
            <button type="button" onClick={() => window.print()} className={`${btn} flex items-center gap-2`}><Printer className="h-4 w-4 text-cyan-300"/>Print Certificate</button>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className={`${panel} min-w-0 p-3 xl:col-span-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold text-white"><ListChecks className="h-5 w-5 text-cyan-300"/>FAT / SAT Test Case Library ({fatSatTests.length})</h3>
            <label className="flex items-center gap-2 rounded-lg border border-cyan-800 bg-[#020e1e] px-2 py-1.5"><Search className="h-4 w-4 text-slate-400"/><input aria-label="Search test cases" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search test (GOOSE, MMS, XCBR...)" className="w-48 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"/></label>
          </div>
          <div className="my-3 flex flex-wrap gap-1.5">{categories.map((cat) => <button type="button" key={cat} onClick={() => setCategory(cat)} className={category === cat ? `${neon} !px-3 !py-1.5 text-xs` : `${btn} !px-3 !py-1.5 text-xs`}>{cat === 'All' ? `All (${fatSatTests.length})` : `${cat} (${fatSatTests.filter((t) => categorize(t) === cat).length})`}</button>)}</div>
          <div className="max-h-[490px] space-y-1.5 overflow-y-auto pr-1">
            {filteredTests.map((tc) => <div key={tc.id} onClick={() => {setSelectedTestId(tc.id); setShowEvidence(false);}} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 transition ${selectedTest?.id === tc.id ? 'border-cyan-300 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,217,255,.35)]' : 'border-cyan-900/80 bg-[#031426] hover:border-cyan-500'}`}>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-[#06334c] px-1.5 py-0.5 font-mono text-xs font-bold text-cyan-300">{tc.testCode}</span><span className="text-[10px] text-slate-400">{tc.standardRef}</span></div><div className="mt-1 text-xs font-bold leading-snug text-white">{tc.title}</div></div>
              <div className="flex shrink-0 items-center gap-1.5"><span className={`rounded px-1.5 py-1 text-[10px] font-bold ${tc.status === 'PASS' ? 'bg-green-900/40 text-green-400' : tc.status === 'FAIL' ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-300'}`}>{tc.status}</span><button type="button" onClick={(e) => {e.stopPropagation(); setSelectedTestId(tc.id); runFatSatTest(tc.id);}} className="rounded-md border border-cyan-400 bg-[#06324b] px-2 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-800"><Play className="mr-1 inline h-3 w-3"/>Run</button></div>
            </div>)}
            {filteredTests.length === 0 && <p className="p-5 text-center text-slate-400">No matching test cases.</p>}
          </div>
        </section>
        <section className={`${panel} min-w-0 space-y-3 p-3 xl:col-span-7`}>
          {selectedTest && <>
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cyan-900 pb-2"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-cyan-900/60 px-2 py-1 font-mono font-bold text-cyan-300">{selectedTest.testCode}</span><span className="text-xs text-slate-300">{selectedTest.standardRef}</span></div><h3 className="mt-1 text-base font-extrabold text-white">{selectedTest.title}</h3></div><button type="button" onClick={runSelected} className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 font-bold text-[#001d13] shadow-[0_0_13px_rgba(34,197,94,.35)] hover:bg-green-400"><Play className="h-4 w-4"/>Execute Test Against Live Simulator</button></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={`${panel} p-3`}><h4 className="mb-2 flex items-center gap-2 font-extrabold text-cyan-300"><ClipboardCheck className="h-5 w-5"/>PRECONDITIONS</h4><ul className="space-y-2">{selectedTest.preconditions.map((item, i) => <li key={i} className="flex gap-2 text-slate-100"><span className="text-green-400">●</span>{item}</li>)}</ul></div>
              <div className={`${panel} p-3`}><h4 className="mb-2 flex items-center gap-2 font-extrabold text-cyan-300"><Activity className="h-5 w-5"/>COMMISSIONING STEP PROCEDURE</h4><ol className="space-y-2">{selectedTest.steps.map((item, i) => <li key={i} className="flex gap-2 text-slate-100"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-500 font-bold text-black">{i+1}</span>{item}</li>)}</ol></div>
            </div>
            <div className="rounded-xl border border-yellow-400 bg-[#161a16] p-3 shadow-[0_0_12px_rgba(250,204,21,.4)]"><h4 className="mb-1 flex items-center gap-2 font-extrabold text-yellow-300"><ShieldCheck className="h-5 w-5"/>EXPECTED ACCEPTANCE CRITERIA</h4><p className="text-slate-100">{selectedTest.expectedResult}</p></div>
            <div className={`${panel} p-3`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 font-extrabold text-white"><FileText className="h-5 w-5 text-cyan-300"/>ACTUAL SIMULATED TEST RESULT &amp; EVIDENCE LOG</h4><span className={`rounded px-2 py-1 font-bold ${selectedTest.status === 'PASS' ? 'bg-green-950 text-green-400' : selectedTest.status === 'FAIL' ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-300'}`}>{selectedTest.status}</span></div><div className="mt-2 rounded-lg border border-[#173b5c] bg-[#081d32] p-2 text-slate-200">{selectedTest.actualSimulatedResult || 'Not executed yet.'}</div>{(showEvidence || selectedTest.evidenceLog) && <p className="mt-2 break-words font-mono text-xs text-cyan-300">{selectedTest.evidenceLog ? `Evidence: ${selectedTest.evidenceLog}` : 'No evidence recorded. Run the test to generate simulator evidence.'}</p>}</div>
            <div className={`${panel} flex flex-wrap justify-between gap-2 p-2`}><button type="button" onClick={runSelected} className={`${neon} flex items-center gap-2`}><Play className="h-4 w-4"/>Run Test</button><button type="button" onClick={() => setShowEvidence((v) => !v)} className={`${btn} flex items-center gap-2`}><FileText className="h-4 w-4"/>View Evidence Log</button><button type="button" onClick={handleExportFatSatCsv} className={`${btn} flex items-center gap-2`}><Download className="h-4 w-4"/>Export Result (CSV)</button><span className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">PASS / FAIL is determined by the live simulator</span></div>
          </>}
        </section>
      </div>
    </div>
  );
};
