export const iedImages = {
  SIEMENS_7SJ85: 'assets/ieds/siemens-7sj85.webp',
  SIEMENS_7SA87: 'assets/ieds/siemens-7sa87.webp',
  SIEMENS_7UT86: 'assets/ieds/siemens-7ut86.webp',
  SCHNEIDER_P143: 'assets/ieds/schneider-p143.webp',
  SCHNEIDER_P633: 'assets/ieds/schneider-p633.webp',
  SCHNEIDER_C264: 'assets/ieds/schneider-c264.webp',
  ABB_REF615: 'assets/ieds/abb-ref615.webp',
  ABB_RET615: 'assets/ieds/abb-ret615.webp',
  ABB_REC615: 'assets/ieds/abb-rec615.webp',
  GE_850: 'assets/ieds/ge-850.webp',
  GE_D60: 'assets/ieds/ge-d60.webp',
  GE_T60: 'assets/ieds/ge-t60.webp',
  // Station-Level Infrastructure High-Resolution Assets
  INDUSTRIAL_SWITCH: 'assets/devices/hirschmann-rsp35.png',
  STATION_GATEWAY: 'assets/devices/station-gateway.jpg',
  PTP_CLOCK: 'assets/devices/ptp-clock.jpg',
  SCADA_SERVER: 'assets/devices/scada-server.jpg',
  SCADA_WORKSTATION: 'assets/devices/hmi-workstation.jpg',
  ENGINEERING_WORKSTATION: 'assets/devices/engineering-workstation.jpg',
  OPERATOR_CONSOLE: 'assets/devices/operator-console.jpg',
} as const;

/**
 * Centralized exact Vendor:Model mapping for all 12 distinct transparent front-panel IED models
 * covering all configured bays in the Multi-Vendor IED Explorer.
 */
export const deviceImages: Record<string, string> = {
  'Siemens:SIPROTEC 5 7SA87': iedImages.SIEMENS_7SA87,
  'Siemens:SIPROTEC 5 7UT86': iedImages.SIEMENS_7UT86,
  'Siemens:SIPROTEC 5 7SJ85': iedImages.SIEMENS_7SJ85,
  'Schneider Electric:MiCOM P143': iedImages.SCHNEIDER_P143,
  'Schneider Electric:MiCOM P633': iedImages.SCHNEIDER_P633,
  'Schneider Electric:MiCOM C264': iedImages.SCHNEIDER_C264,
  'ABB / Hitachi Energy:Relion REF615': iedImages.ABB_REF615,
  'ABB / Hitachi Energy:Relion RET615': iedImages.ABB_RET615,
  'ABB / Hitachi Energy:Relion REC615': iedImages.ABB_REC615,
  'GE Vernova:Multilin 850': iedImages.GE_850,
  'GE Vernova:Multilin D60': iedImages.GE_D60,
  'GE Vernova:Multilin T60': iedImages.GE_T60,
};

export type IedImageKey = keyof typeof iedImages;

export function getIedImageByModel(vendor: string, model: string): string {
  const exactKey = `${(vendor || '').trim()}:${(model || '').trim()}`;
  if (deviceImages[exactKey]) {
    return deviceImages[exactKey];
  }

  const v = (vendor || '').toLowerCase();
  const m = (model || '').toLowerCase();

  if (v.includes('siemens') || m.includes('siprotec') || m.includes('7sj') || m.includes('7sa') || m.includes('7ut')) {
    if (m.includes('7sa87')) return iedImages.SIEMENS_7SA87;
    if (m.includes('7ut86')) return iedImages.SIEMENS_7UT86;
    return iedImages.SIEMENS_7SJ85;
  }

  if (v.includes('schneider') || m.includes('micom') || m.includes('p14') || m.includes('p63') || m.includes('c264')) {
    if (m.includes('c264')) return iedImages.SCHNEIDER_C264;
    if (m.includes('p63')) return iedImages.SCHNEIDER_P633;
    return iedImages.SCHNEIDER_P143;
  }

  if (v.includes('abb') || v.includes('hitachi') || m.includes('relion') || m.includes('ref615') || m.includes('ret615') || m.includes('rec615')) {
    if (m.includes('ret615')) return iedImages.ABB_RET615;
    if (m.includes('rec615')) return iedImages.ABB_REC615;
    return iedImages.ABB_REF615;
  }

  if (v.includes('ge') || m.includes('multilin') || m.includes('850') || m.includes('d60') || m.includes('t60')) {
    if (m.includes('d60')) return iedImages.GE_D60;
    if (m.includes('t60')) return iedImages.GE_T60;
    return iedImages.GE_850;
  }

  return iedImages.SIEMENS_7SJ85;
}

export function getInfrastructureImage(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase();
  if (/clock|ptp|time|meinberg/.test(text)) return iedImages.PTP_CLOCK;
  if (/hmi|operator/.test(text)) return iedImages.SCADA_WORKSTATION;
  if (/engineering|workstation/.test(text)) return iedImages.ENGINEERING_WORKSTATION;
  if (/switch|redbox|hirschmann|scalance/.test(text)) return iedImages.INDUSTRIAL_SWITCH;
  if (/gateway|rtu|moxa/.test(text)) return iedImages.STATION_GATEWAY;
  if (/server|scada/.test(text)) return iedImages.SCADA_SERVER;
  return iedImages.SCADA_SERVER;
}
