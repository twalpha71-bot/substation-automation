import React, { useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Lock,
  Power,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Unlock,
} from 'lucide-react';

export const BreakerControlDrawer: React.FC = () => {
  const {
    bays,
    selectedBayId,
    ieds,
    alarms,
    soeLog,
    commandBreaker,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
    setSelectedIedId,
    setActiveTab,
  } = useSubstationStore();

  const bay = bays.find((b) => b.id === selectedBayId) || bays[0];
  const ied = ieds.find((i) => i.id === bay.iedId);

  // Two-step IEC 61850 SBO (Select-Before-Operate) state machine
  const [sboSelectedTarget, setSboSelectedTarget] = useState<'OPEN' | 'CLOSED' | null>(null);

  const iedPrefix = bay.iedId.replace(/-/g, '_');
  const bayAlarms = alarms.filter((a) => a.bayId === bay.id && a.state !== 'CLEARED');
  const baySoe = soeLog.filter((s) => s.bayId === bay.id).slice(0, 5);

  const handleSboSelect = (target: 'OPEN' | 'CLOSED') => {
    setSboSelectedTarget(target);
  };

  const handleSboOperate = () => {
    if (!sboSelectedTarget) return;
    commandBreaker(bay.id, sboSelectedTarget, 'SCADA_SBO');
    setSboSelectedTarget(null);
  };

  return (
    <div className="rounded-lg bg-transparent p-0 flex flex-col gap-2.5 text-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/40">
              {bay.bayCode}
            </span>
            <span className="text-xs text-slate-400">
              {bay.voltageKv} kV • Bus {bay.busSection}
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#DCEAF5] mt-1">{bay.name}</h3>
        </div>
        <div
          className={`px-2.5 py-1 rounded text-xs font-bold border ${
            bay.breakerState === 'CLOSED'
              ? 'bg-[#FF4D62]/20 text-[#FF4D62] border-[#FF4D62]/50'
              : bay.breakerState === 'OPEN'
              ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50'
              : 'bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/50'
          }`}
        >
          {bay.breakerId}: {bay.breakerState}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 space-y-2.5 lg:col-span-3 rounded-lg border border-[#185477] bg-[#092139] p-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#DCEAF5]"><Activity className="h-4 w-4 text-[#00D9FF]"/> Bay Overview</h4>
      {/* Mode, Quality & IEC 61850 Reference */}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#10243A] border border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">43LR Control Hierarchy</div>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`font-bold ${
                bay.localRemote === 'REMOTE' ? 'text-[#00D9FF]' : 'text-[#FFB547]'
              }`}
            >
              {bay.localRemote}
            </span>
            <button
              type="button"
              onClick={() =>
                setBayLocalRemote(bay.id, bay.localRemote === 'REMOTE' ? 'LOCAL' : 'REMOTE')
              }
              className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-700"
            >
              Toggle L/R
            </button>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#10243A] border border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Quality & Timestamp</div>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`font-bold ${
                bay.quality === 'GOOD' ? 'text-[#22C55E]' : 'text-[#FFB547]'
              }`}
            >
              {bay.quality} (0x0000)
            </span>
            <span className="text-[10px] text-slate-400">OpCnt: {bay.opCounter}</span>
          </div>
        </div>
      </div>

        </div>
        <div className="min-w-0 space-y-2.5 lg:col-span-3 rounded-lg border border-[#185477] bg-[#092139] p-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#DCEAF5]"><Sliders className="h-4 w-4 text-[#00D9FF]"/> References &amp; Interlocking</h4>
      {/* IEC 61850 Object Reference Box */}
      <div className="p-2.5 rounded-lg bg-[#030712] border border-slate-800 font-mono text-[10px] space-y-1 break-all">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-slate-400">Status Ref:</span>
          <span className="text-[#00D9FF]">{iedPrefix}/XCBR1.Pos.stVal [ST]</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-slate-400">SBO Control Ref:</span>
          <span className="text-[#168BFF]">{iedPrefix}/CSWI1.Pos.Oper.ctlVal [CO]</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-slate-400">Interlock Ref:</span>
          <span className="text-emerald-400">{iedPrefix}/CILO1.EnaCls.stVal [ST]</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-slate-400">Synch-Check Ref:</span>
          <span className="text-emerald-300">{iedPrefix}/RSYN1.Rel.stVal [ST] (ANSI 25 OK)</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-slate-400">Derived SCADA 52a/52b:</span>
          <span className="text-slate-200">52a={String(bay.breakerState === 'CLOSED')} | 52b={String(bay.breakerState === 'OPEN')}</span>
        </div>
      </div>

        </div>
        <div className="min-w-0 space-y-2.5 lg:col-span-3 lg:row-span-2 rounded-lg border border-[#185477] bg-[#092139] p-2.5">
      {/* Two-Step IEC 61850 SBO Breaker Command Controls */}
      <div className="p-3 rounded-lg bg-[#10243A] border border-[#1E3A5F] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#DCEAF5] flex items-center gap-1.5">
            <Power className="w-3.5 h-3.5 text-[#00D9FF]" />
            IEC 61850 SBO Enhanced Control (CtlModel=4)
          </span>
          <span className="text-[10px] text-slate-400">Step 1: Select → Step 2: Operate</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSboSelect('CLOSED')}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
              sboSelectedTarget === 'CLOSED'
                ? 'bg-[#FF4D62] text-white border-white shadow-lg'
                : 'bg-[#FF4D62]/20 hover:bg-[#FF4D62]/30 text-[#FF4D62] border-[#FF4D62]/40'
            }`}
          >
            1. SELECT CLOSE (52-ON)
          </button>
          <button
            type="button"
            onClick={() => handleSboSelect('OPEN')}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
              sboSelectedTarget === 'OPEN'
                ? 'bg-[#22C55E] text-slate-950 border-white shadow-lg'
                : 'bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border-[#22C55E]/40'
            }`}
          >
            1. SELECT OPEN (52-OFF)
          </button>
        </div>

        {sboSelectedTarget && (
          <div className="p-2.5 rounded bg-[#030712] border border-[#00D9FF] space-y-2">
            <div className="text-[11px] text-[#00D9FF] font-mono">
              SBOw Selected: CSWI1$CO$Pos$SBOw = {sboSelectedTarget} (Timer: 15000 ms)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSboOperate}
                className="flex-1 py-1.5 rounded bg-[#00D9FF] hover:bg-[#168BFF] text-slate-950 font-bold text-xs"
              >
                2. EXECUTE OPERATE ({sboSelectedTarget})
              </button>
              <button
                type="button"
                onClick={() => setSboSelectedTarget(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Relevant Bay Alarms & Recent SOE */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Bay SOE & Alarm Feed ({bayAlarms.length} Active)
        </div>
        <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
          {baySoe.map((s) => (
            <div
              key={s.id}
              className="p-1.5 rounded bg-[#030712] border border-slate-800/80 text-[11px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-mono">
                <span>{s.timestampMs.split('T')[1]}</span>
                <span className="text-[#00D9FF]">{s.cause}</span>
              </div>
              <div className="text-slate-200 truncate">{s.eventDescription}</div>
            </div>
          ))}
        </div>
      </div>
        </div>
        <div className="min-w-0 space-y-2 lg:col-span-3 lg:row-span-2 rounded-lg border border-[#185477] bg-[#092139] p-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#DCEAF5]"><Cpu className="h-4 w-4 text-[#00D9FF]"/> Switches, Protection &amp; IED</h4>
      {/* Disconnectors Q1, Q9 & Earth Switch Q8 Controls */}
      <div className="p-3 rounded-lg bg-[#10243A]/70 border border-slate-800 space-y-2">
        <div className="text-xs font-semibold text-slate-300">
          Motorized Disconnectors (XSWI1) & Earth Switch (XSWI2)
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <button
            type="button"
            onClick={() =>
              commandDisconnector(
                bay.id,
                'BUS_Q1',
                bay.busDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
              )
            }
            className="p-2 rounded bg-[#030712] border border-slate-700 hover:border-[#00D9FF] text-center"
          >
            <div className="text-slate-400">Bus Isolator Q1</div>
            <div
              className={`font-bold mt-0.5 ${
                bay.busDisconnectorState === 'CLOSED' ? 'text-[#FF4D62]' : 'text-[#22C55E]'
              }`}
            >
              {bay.busDisconnectorState}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              commandDisconnector(
                bay.id,
                'LINE_Q9',
                bay.lineDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
              )
            }
            className="p-2 rounded bg-[#030712] border border-slate-700 hover:border-[#00D9FF] text-center"
          >
            <div className="text-slate-400">Line Isolator Q9</div>
            <div
              className={`font-bold mt-0.5 ${
                bay.lineDisconnectorState === 'CLOSED' ? 'text-[#FF4D62]' : 'text-[#22C55E]'
              }`}
            >
              {bay.lineDisconnectorState}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              commandDisconnector(
                bay.id,
                'EARTH_Q8',
                bay.earthSwitchState === 'CLOSED' ? 'OPEN' : 'CLOSED'
              )
            }
            className="p-2 rounded bg-[#030712] border border-slate-700 hover:border-[#FFB547] text-center"
          >
            <div className="text-slate-400">Earth Switch Q8</div>
            <div
              className={`font-bold mt-0.5 ${
                bay.earthSwitchState === 'CLOSED' ? 'text-[#FFB547]' : 'text-slate-400'
              }`}
            >
              {bay.earthSwitchState}
            </div>
          </button>
        </div>
      </div>

      {/* Protection Trip & Lockout 86 Simulation */}
      <div className="p-3 rounded-lg bg-[#10243A]/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF4D62]" />
            Protection Trip & Lockout 86 Test
          </span>
          {bay.protectionTripActive && (
            <span className="px-2 py-0.5 rounded bg-[#FF4D62] text-white text-[10px] font-bold animate-pulse">
              86 TRIP LATCHED
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              triggerProtectionTrip(
                bay.id,
                bay.voltageKv === 132 && bay.bayType === 'LINE_INCOMER'
                  ? '21 Distance Zone 1'
                  : bay.bayType === 'TRANSFORMER_HV'
                  ? '87T Transformer Differential'
                  : '50/51 Overcurrent'
              )
            }
            className="flex-1 py-1.5 px-2.5 rounded bg-[#FF4D62]/20 hover:bg-[#FF4D62]/30 text-[#FF4D62] border border-[#FF4D62]/40 text-xs font-semibold"
          >
            Simulate Protection Trip
          </button>
          <button
            type="button"
            onClick={() => resetProtectionTrip(bay.id)}
            className="py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset 86
          </button>
        </div>
      </div>

      {/* Associated Multi-Vendor IED Link */}
      {ied && (
        <div className="p-2.5 rounded-lg bg-[#030712] border border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <div className="text-slate-400 text-[10px]">Associated Bay IED ({ied.vendor})</div>
            <div className="font-semibold text-[#DCEAF5]">
              {ied.name} — {ied.model}
            </div>
            <div className="text-[10px] text-[#00D9FF] font-mono">
              PRP A: {ied.ipAddressLanA} | B: {ied.ipAddressLanB}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedIedId(ied.id);
              setActiveTab('IED');
            }}
            className="px-2.5 py-1.5 rounded bg-[#168BFF]/20 hover:bg-[#168BFF]/30 text-[#00D9FF] border border-[#168BFF]/40 text-xs font-semibold flex items-center gap-1"
          >
            <Cpu className="w-3.5 h-3.5" />
            Inspect IED
          </button>
        </div>
      )}

        </div>
        <div className="min-w-0 lg:col-span-6">
      {/* Interlocking Permissive Status */}
      <div
        className={`p-2.5 rounded-lg border text-xs ${
          bay.interlockPermissive
            ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-emerald-200'
            : 'bg-[#FFB547]/10 border-[#FFB547]/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-1.5 font-semibold">
          {bay.interlockPermissive ? (
            <Unlock className="w-3.5 h-3.5 text-[#22C55E]" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-[#FFB547]" />
          )}
          <span>Interlocking Status (CILO1)</span>
        </div>
        <p className="text-[11px] mt-1 leading-relaxed opacity-90">{bay.interlockReason}</p>
      </div>

        </div>
      </div>
    </div>
  );
};
