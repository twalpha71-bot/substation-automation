import { useId } from 'react';

export interface TroubleshootingStage {
  name: string;
  evidence: string;
  check: string;
  blocked?: boolean;
  warning?: boolean;
}

interface ProtocolTroubleshootingProps {
  title: string;
  target: string;
  stages: TroubleshootingStage[];
  activeFaults: string[];
}

export function ProtocolTroubleshootingPanel({ title, target, stages, activeFaults }: ProtocolTroubleshootingProps) {
  const headingId = useId();
  const blockedIndex = stages.findIndex(stage => stage.blocked);
  const firstBlocked = stages[blockedIndex];
  const firstWarning = stages.find(stage => stage.warning);
  const summary = firstBlocked ? `First blocked stage: ${firstBlocked.name}`
    : firstWarning ? `Check first: ${firstWarning.name}` : 'No block detected on the simulated path';
  const summaryColor = firstBlocked ? 'text-rose-200' : firstWarning ? 'text-amber-200' : 'text-emerald-200';

  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-3 rounded-xl border border-[#1E5280] bg-[#03101F] p-3">
      <h3 id={headingId} className="text-sm font-extrabold text-white">{title}</h3>
      <div className="space-y-1 rounded-lg border border-[#245578] bg-[#061B2B] p-3 text-xs">
        <p className={`font-bold ${summaryColor}`}>{summary}</p>
        <p className="break-words text-sky-100">{target}</p>
        {activeFaults.length > 0 && (
          <p className="break-words text-amber-200">Active test faults · {activeFaults.join(' · ')}</p>
        )}
      </div>
      <ol className="grid gap-2 md:grid-cols-2">
        {stages.map((stage, index) => {
          const waiting = blockedIndex >= 0 && index > blockedIndex;
          const status = waiting ? 'NOT REACHED' : stage.blocked ? 'BLOCKED' : stage.warning ? 'CHECK' : 'READY';
          const color = waiting ? 'text-slate-300' : stage.blocked ? 'text-rose-200' : stage.warning ? 'text-amber-200' : 'text-emerald-200';
          return (
            <li key={stage.name} className="min-w-0 space-y-1 rounded-lg border border-[#1B4160] bg-[#061827] p-3 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <h4 className="font-bold text-white">{index + 1}. {stage.name}</h4>
                <span className={`font-bold ${color}`}>{status}</span>
              </div>
              <p className="break-words text-sky-100">{waiting ? 'Resolve the earlier stage before tracing this hop.' : stage.evidence}</p>
              <p className="break-words text-sky-300">{stage.check}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
