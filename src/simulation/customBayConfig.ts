import { INITIAL_BAYS } from '../data/substationData';
import type { BayEquipment } from '../types/substation';
export type BayKind = 'LINE_INCOMER' | 'TRANSFORMER_HV' | 'TRANSFORMER_LV_INCOMER' | 'BUS_COUPLER' | 'OUTGOING_FEEDER' | 'DIST_TX_FEEDER' | 'SPARE_FEEDER';
export type BayConfig = { id: string; name: string; voltageKv: 132 | 33 | 11; busSection: 'A' | 'B' | 'COUPLE'; bayType: BayKind; breakerId: string; iedId: string; vendor: string; ctRatio: string; vtRatio: string; nominalLoadMw: number; breakerState: 'OPEN' | 'CLOSED'; createdAt: string };
export const KEY = 'sas:custom-bay-config:v1';
export const normalizeBayId = (id: string) => id.trim().toUpperCase().replace(/^BAY-/, '');
export const runtimeBayId = (id: string) => `BAY-${normalizeBayId(id)}`;
export const voltageVtRatio = (kv: 132 | 33 | 11) => `${kv * 1000}/110`;
export const blank = (): BayConfig => ({ id: '', name: '', voltageKv: 33, busSection: 'A', bayType: 'OUTGOING_FEEDER', breakerId: '', iedId: '', vendor: 'Schneider Electric', ctRatio: '600/1', vtRatio: '33000/110', nominalLoadMw: 0, breakerState: 'OPEN', createdAt: new Date().toISOString() });
// Training-only bay definitions. All generated equipment is simulated, never connected to physical IEDs.
export function toRuntimeBay(b: BayConfig): BayEquipment {
  const template = INITIAL_BAYS.find(x => x.voltageKv === b.voltageKv && x.bayType === b.bayType)
    || INITIAL_BAYS.find(x => x.voltageKv === b.voltageKv)
    || INITIAL_BAYS[0];
  return {
    ...template, id: runtimeBayId(b.id), bayCode: normalizeBayId(b.id), name: b.name,
    voltageKv: b.voltageKv, busSection: b.busSection, bayType: b.bayType,
    breakerId: b.breakerId || `CB-${normalizeBayId(b.id)}`, iedId: b.iedId || `IED-${normalizeBayId(b.id)}`,
    configuredVendor: b.vendor,
    secondaryIedId: undefined, connectedTransformerId: undefined,
    protectionTripActive: false, masterTripLockout: false, activeTripFunctions: [], autoRecloseStatus: 'DISABLED',
    breakerState: b.breakerState, lineDisconnectorState: 'CLOSED',
    busDisconnectorState: 'CLOSED', earthSwitchState: 'OPEN',
    ctRatio: b.ctRatio, vtRatio: b.vtRatio, nominalLoadMw: b.nominalLoadMw,
    nominalLoadMvar: b.nominalLoadMw * 0.3,
    activePowerMw: 0, reactivePowerMvar: 0, apparentPowerMva: 0,
    currentA: 0, currentB: 0, currentC: 0, energized: false,
    isUserCreated: true, lastUpdated: new Date().toISOString(),
  };
}

export const kinds: BayKind[] = ['LINE_INCOMER','TRANSFORMER_HV','TRANSFORMER_LV_INCOMER','BUS_COUPLER','OUTGOING_FEEDER','DIST_TX_FEEDER','SPARE_FEEDER'];
export function validRow(v: unknown): v is BayConfig { const b = v as Partial<BayConfig>; return !!b && typeof b.id === 'string' && /^[A-Za-z0-9_-]{2,40}$/.test(b.id) && typeof b.name === 'string' && b.name.trim().length > 0 && [132,33,11].includes(Number(b.voltageKv)) && ['A','B','COUPLE'].includes(String(b.busSection)) && kinds.includes(b.bayType as BayKind) && typeof b.breakerId === 'string' && typeof b.iedId === 'string' && Number.isFinite(Number(b.nominalLoadMw)) && Number(b.nominalLoadMw) >= 0; }

export function loadCustomBayConfigs(): BayConfig[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(validRow).map(b => ({ ...b, id: normalizeBayId(b.id) })) : [];
  } catch { return []; }
}


// Tombstones let operators hide factory bays without mutating the shipped defaults.
export const HIDDEN_DEFAULT_BAYS_KEY = 'sas:hidden-default-bays:v1';
export function loadHiddenDefaultBayIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HIDDEN_DEFAULT_BAYS_KEY) || '[]');
    const known = new Set(INITIAL_BAYS.map(b => b.id));
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];
  } catch { return []; }
}
export function saveHiddenDefaultBayIds(ids: string[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(HIDDEN_DEFAULT_BAYS_KEY, JSON.stringify([...new Set(ids)]));
}
