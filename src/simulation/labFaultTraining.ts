import { create } from 'zustand';

export interface FaultTrainingRecord {
  injectedAt: string;
  before: string;
  observed?: string;
  clearedAt?: string;
  verifiedAt?: string;
  after?: string;
}

export function canVerifyRecovery(record: FaultTrainingRecord | undefined, active: boolean,
  recovered: boolean, reviewed: boolean): boolean {
  return !!record?.observed && !!record.clearedAt && !active && recovered && reviewed;
}

// Route a library exercise to its real protocol engine instead of a cosmetic station flag.
export const protocolFaultRoutes: Record<string, { lab: string; scenario: string }> = {
  'FLT-MODBUS-01': { lab: 'MODBUS_LAB', scenario: 'T13_EX02_ILLEGAL_ADDR' },
  'FLT-IEC104-01': { lab: 'IEC104_LAB', scenario: 'T06_STARTDT_T1_TO' },
  'FLT-OPCUA-01': { lab: 'OPCUA_LAB', scenario: 'T21_UNTRUSTED_CERT' },
};
export const useLabFaultRequest = create<{
  pending?: { lab: string; scenario: string };
  request: (lab: string, scenario: string) => void;
  consume: () => void;
}>((set) => ({
  request: (lab, scenario) => set({ pending: { lab, scenario } }),
  consume: () => set({ pending: undefined }),
}));

export function openProtocolFault(faultId: string): boolean {
  const route = protocolFaultRoutes[faultId];
  if (!route) return false;
  useLabFaultRequest.getState().request(route.lab, route.scenario);
  window.location.hash = `#/workspace/${route.lab}`;
  return true;
}
