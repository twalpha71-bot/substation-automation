import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { ActiveWorkspaceTab } from '../simulation/useSubstationStore';
import { IedScoutTool } from '../components/test-tools/IedScoutTool';

const TOOL_META: Record<string, { title: string; subtitle: string }> = {
  IEDSCOUT: { title: 'IEDScout (OMICRON)', subtitle: 'IEC 61850 MMS Client, SBO Control, RCB Reporting & GOOSE Simulator' },
  IEC_BROWSER: { title: 'IEC Browser (V02.21)', subtitle: 'MMS Read/Write, DataSets & GI' },
  SCL_VALIDATOR: { title: 'SCL Validation Tool', subtitle: 'ICD / IID / SCD / CID Schema Audit' },
  MODSCAN: { title: 'ModScan64 / ModScan-IP', subtitle: 'Modbus TCP Master Poller' },
  MODBUS_SLAVE_POLL: { title: 'Modbus Slave / Poll', subtitle: 'Slave Simulator & Modpoll CLI' },
  IEC_TEST: { title: 'IEC_TEST (V1.02)', subtitle: 'IEC 60870-5-104 / 101 Test Master' },
  VINCI: { title: 'VINCI Protocol Analyser', subtitle: 'Multi-Protocol Master/Slave Analyzer' },
  HIVIEW: { title: 'HiView (Hirschmann)', subtitle: 'RSP35 / RED25 Switch Manager' },
  HYPER_TERMINAL: { title: 'Hyper Terminal', subtitle: 'Serial / Console CLI Terminal' },
};

interface SchemePageProps {
  onNavigate?: (tab: ActiveWorkspaceTab) => void;
  activeTool?: string;
  onSelectTool?: (toolId: any) => void;
}

export default function SchemePage({ activeTool = 'IEDSCOUT' }: SchemePageProps) {
  if (activeTool === 'IEDSCOUT') {
    return <IedScoutTool />;
  }

  const meta = TOOL_META[activeTool] || TOOL_META.IEDSCOUT;

  return (
    <section className="min-h-[76vh] rounded-2xl border border-[#1B4B72] bg-[#041222]/90 p-3.5 sm:p-5 text-[#E5F6FF] flex flex-col gap-3.5">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00DFFF]/60 bg-[#07263D] text-[#00E5FF]">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white">{meta.title}</h1>
            <p className="text-xs text-[#9BC0DF]">{meta.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#00DFFF]/40 bg-[#062238] px-3 py-1 font-mono text-[11px] font-bold text-[#7DD3FC]">
          SAS Test Tools · Ready for Implementation
        </span>
      </header>

      <div className="flex-1 rounded-xl border border-dashed border-[#1E4B75] bg-[#030D1B]/70 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-1.5">
          <div className="text-sm font-bold text-white">{meta.title} Workspace</div>
          <p className="text-xs text-[#8BB3D4]">
            Blank workspace ready. Select <strong>IEDScout (OMICRON)</strong> or another tool from the <strong>SAS Test Tools</strong> dropdown.
          </p>
        </div>
      </div>
    </section>
  );
}
