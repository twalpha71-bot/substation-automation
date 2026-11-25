import { useEffect, useId, useState } from 'react';
import { canVerifyRecovery, useLabFaultRequest } from '../simulation/labFaultTraining';
import type { FaultTrainingRecord } from '../simulation/labFaultTraining';

export interface LabFaultExercise {
  id: string;
  label: string;
  expected: string;
  checks: readonly string[];
  active: boolean;
  observed: boolean;
  recovered: boolean;
  evidence: string;
  inject: () => void;
  clear: () => void;
  busy?: boolean;
}

export function LabFaultWorkbench({ lab, target, exercises }: {
  lab: string; target: string; exercises: LabFaultExercise[];
}) {
  const heading = useId();
  const [selected, setSelected] = useState(exercises[0]?.id || '');
  const [records, setRecords] = useState<Record<string, FaultTrainingRecord>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState('Select a fault, record its effect, diagnose, clear, then verify.');
  const pending = useLabFaultRequest(state => state.pending);
  const chosen = exercises.find(item => item.id === selected) || exercises[0];
  const recordKey = `${target}/${chosen?.id}`;
  const record = records[recordKey];
  const checklistKey = (index: number) => `${recordKey}/${index}`;
  const allReviewed = !!chosen && chosen.checks.every((_, index) => reviewed[checklistKey(index)]);
  const mayVerify = !!chosen && canVerifyRecovery(record, chosen.active, chosen.recovered, allReviewed);

  useEffect(() => {
    if (pending?.lab !== lab) return;
    const found = exercises.find(item => item.id === pending.scenario);
    if (found) {
      setSelected(found.id);
      setFeedback('Fault library exercise selected. Review the target, then choose Inject selected fault.');
    } else setFeedback('This library exercise is not available for the current target.');
    useLabFaultRequest.getState().consume();
  }, [pending, lab, exercises]);

  useEffect(() => {
    if (!chosen?.active || !chosen.observed || !record || record.observed) return;
    setRecords(previous => ({ ...previous, [recordKey]: { ...previous[recordKey], observed: chosen.evidence } }));
  }, [chosen?.active, chosen?.observed, chosen?.evidence, recordKey, record]);

  if (!chosen) return null;
  const buttonClass = 'rounded border border-cyan-700 bg-[#09283c] px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40';
  const exportEvidence = () => {
    const data = JSON.stringify({ lab, target, scenario: chosen.id, expected: chosen.expected,
      evidence: record || null, currentEvidence: chosen.evidence, checksReviewed: allReviewed,
      currentRecoveryValid: mayVerify, simulationOnly: true }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${lab}-${chosen.id}-evidence.json`; a.click();
    URL.revokeObjectURL(url);
  };
  return <section aria-labelledby={heading} data-testid="lab-fault-workbench" className="my-3 rounded-xl border border-cyan-700 bg-[#041827] p-3 text-xs text-sky-100">
    <h2 id={heading} className="text-sm font-bold text-white">Guided fault injection &amp; recovery</h2>
    <p className="my-1 break-words">Target: {target}. Native lab simulation; each exercise uses the existing engine.</p>
    <label className="flex flex-wrap items-center gap-2">Fault exercise
      <select aria-label={`${lab} guided fault`} value={chosen.id} onChange={event => setSelected(event.target.value)} className="max-w-full rounded border border-cyan-700 bg-[#082439] p-2">
        {exercises.map(item => <option key={item.id} value={item.id}>{item.label}{item.active ? ' (active)' : ''}</option>)}
      </select>
    </label>
    <p className="my-2">Expected effect: {chosen.expected}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={chosen.active || chosen.busy || exercises.some(item => item.active)} onClick={() => {
        setRecords(previous => ({ ...previous, [recordKey]: { injectedAt: new Date().toISOString(), before: chosen.evidence } }));
        setReviewed(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(`${recordKey}/`))));
        setFeedback('Fault requested. Waiting for the lab to expose its effect.'); chosen.inject();
      }}>1. Inject selected fault</button>
      <button type="button" className={buttonClass} disabled={!chosen.active || chosen.busy} onClick={() => {
        if (record) setRecords(previous => ({ ...previous, [recordKey]: { ...previous[recordKey], clearedAt: new Date().toISOString(), verifiedAt: undefined } }));
        chosen.clear(); setFeedback('Fault cleared. Check the live evidence and complete the diagnosis checklist.');
      }}>4. Clear selected fault</button>
      <button type="button" className={buttonClass} disabled={!mayVerify || chosen.busy} onClick={() => {
        setRecords(previous => ({ ...previous, [recordKey]: { ...previous[recordKey], verifiedAt: new Date().toISOString(), after: chosen.evidence } }));
        setFeedback('Recovery verified against the current simulated state.');
      }}>5. Verify recovery</button>
      <button type="button" className={buttonClass} onClick={exportEvidence}>Export evidence</button>
    </div>
    <p role="status" className="my-2 break-words text-cyan-200">{feedback}</p>
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded border border-slate-700 p-2"><b>2. Observe the first failure</b>
        <p className="mt-1 break-words" data-testid="fault-live-evidence">{chosen.evidence}</p>
        <p className="mt-1 text-amber-200">{chosen.active ? chosen.observed ? 'Effect observed' : 'Waiting for observable effect' : chosen.recovered ? 'Recovery condition available' : 'Underlying condition still unresolved'}</p>
        {record?.observed && <p className="mt-1 break-words">During fault: {record.observed}</p>}
        {record?.verifiedAt && <p className="mt-1">Verified: {record.verifiedAt}{!mayVerify && ' (historical result; current conditions changed)'}</p>}
      </div>
      <div className="rounded border border-slate-700 p-2"><b>3. Diagnose and confirm</b>
        {chosen.checks.map((check, index) => <label key={check} className="mt-2 flex items-start gap-2">
          <input type="checkbox" checked={!!reviewed[checklistKey(index)]} onChange={event => setReviewed(previous => ({ ...previous, [checklistKey(index)]: event.target.checked }))} />
          <span>{index + 1}. {check}</span>
        </label>)}
      </div>
    </div>
  </section>;
}
