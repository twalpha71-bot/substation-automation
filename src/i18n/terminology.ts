/**
 * Technical Terminology Protection & Allowlist for SAS Engineering Hub Localization.
 * Ensures IEC 61850 Logical Nodes, protocols, device IDs, IPs, MACs, ports, CLI syntax,
 * formulas, and engineering abbreviations remain untouched across all 8 languages.
 */

export const TECHNICAL_ALLOWLIST: ReadonlyArray<string> = [
  'IEC 61850', 'IEC 61850-6', 'IEC 61850-7-1', 'IEC 61850-7-2', 'IEC 61850-7-3', 'IEC 61850-7-4',
  'IEC 61850-8-1', 'IEC 61850-9-2', 'IEC 61850-9-2 LE', 'IEC 61850-10', 'IEC/IEEE 61850-9-3',
  'IEC 60870-5-101', 'IEC 60870-5-103', 'IEC 60870-5-104', 'IEC 62439-3', 'IEC 62351', 'IEC 60617',
  'IEEE 1588', 'IEEE 1588v2', 'IEEE 802.1Q', 'IEEE 802.1p', 'IEEE 802.1w', 'IEEE 802.3', 'IEEE 1613',
  'DNP3', 'Modbus RTU', 'Modbus TCP', 'Modbus', 'OPC UA', 'MMS', 'GOOSE', 'Sampled Values', 'SV', 'SMV',
  'SCADA', 'HMI', 'SCADA/HMI', 'IED', 'IEDs', 'PLC', 'RTU', 'RTUs', 'BCU', 'BCUs', 'SAS', 'SCL',
  'ICD', 'CID', 'SCD', 'IID', 'SSD', 'SED', 'DataSet', 'DataSets', 'RCB', 'RCBs', 'BRCB', 'BRCBs',
  'URCB', 'URCBs', 'GoCB', 'GoCBs', 'GCB', 'PRP', 'HSR', 'RSTP', 'STP', 'LACP', 'VLAN', 'VLANs',
  'SNTP', 'NTP', 'NTPv4', 'PTP', 'PTPv2', 'IRIG-B', 'PPS', 'SNMP', 'SNMPv2c', 'SNMPv3',
  'IP', 'IP Address', 'MAC', 'MAC Address', 'Ethernet', 'Gateway', 'Publisher', 'Subscriber',
  'Logical Node', 'Logical Device', 'Breaker', 'Isolator', 'Earth Switch', 'Interlocking',
  'Protection Relay', 'FAT', 'SAT', 'FAT/SAT', 'SOE', 'SBO', 'SBOw', 'SBOes', 'Oper', 'Cancel',
  'PCM600', 'DIGSI', 'DIGSI 4', 'DIGSI 5', 'PACiS', 'PACiS SCE', 'EcoSUI', 'zenon', 'MiCOM',
  'SIPROTEC', 'SIPROTEC 5', 'Relion', 'Easergy', 'Easergy Studio', 'Easergy Builder', 'EnerVista',
  'Multilin', 'IEDScout', 'Wireshark', 'OMICRON', 'Hirschmann', 'Meinberg', 'Moxa', 'RedBox',
  'LLN0', 'LPHD1', 'XCBR', 'XCBR1', 'XSWI', 'XSWI1', 'CSWI', 'CSWI1', 'CILO', 'CILO1',
  'MMXU', 'MMXU1', 'PTOC', 'PTOC1', 'PDIS', 'PDIS1', 'PDIF', 'PDIF1', 'PTRC', 'PTRC1', 'RBRF', 'RBRF1',
  'stVal', 'ctlVal', 'stNum', 'sqNum', 'confRev', 'gocbRef', 'datSet', 'DatSet', 'RptEna',
  'IntgPd', 'TrgOps', 'OptFlds', 'BufTm', 'EntryID', 'PurgeBuf', 'dchg', 'qchg', 'dupd',
  'ctlModel', 'AddCause', 'TimeQuality', 'ExtRef', 'FCDA',
  'kV', 'MVA', 'kVA', 'MW', 'MVAR', 'kA', 'mA', 'A', 'V', 'Hz', 'ms', 'µs', 'ns', 'dBm', 'Mbps', 'Gbps', 'Ω'
];

export const PROTECTED_TECH_REGEX = new RegExp(
  [
    '<[A-Za-z0-9_:/.-]+(?:\\s+[^>]*)?>',
    '\\[(?:ST|MX|CO|CF|DC|SP|SV|EX|BR|RP|GO)\\]',
    '[SPQ]\\s*=\\s*[^,.;]+',
    '3I0\\s*=\\s*Ia\\s*\\+\\s*Ib\\s*\\+\\s*Ic',
    'V_ph\\s*=\\s*V_L\\s*/\\s*√3',
    'Idiff\\s*[=≈]\\s*[^,.;]+',
    'I²R', '√3', 'cosφ', 'sinφ',
    'opc\\.tcp://[A-Za-z0-9.:/_-]+',
    'https?://[^\\s]+',
    '\\b(?:\\d{1,3}\\.){3}\\d{1,3}(?::\\d+)?(?:/\\d{1,2})?\\b',
    '\\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b',
    '\\b0x[0-9A-Fa-f]+\\b',
    '\\b[A-Za-z0-9_]+/[A-Za-z0-9_$.]+\\b',
    '\\b(?:LLN0|LPHD1?|XCBR\\d*|XSWI\\d*|CSWI\\d*|CILO\\d*|MMXU\\d*|PTOC\\d*|PDIS\\d*|PDIF\\d*|PTRC\\d*|RBRF\\d*|RSYN\\d*|ATCC\\d*|YLTC\\d*|SIMG\\d*|SIML\\d*|STMP\\d*|SOPM\\d*|SPDC\\d*|RREC\\d*|GGIO\\d*|GOOSEBIN)(?:\\.[A-Za-z0-9_$]+)*\\b',
    '\\b(?:stVal|ctlVal|stNum|sqNum|confRev|gocbRef|datSet|DatSet|RptEna|IntgPd|TrgOps|OptFlds|BufTm|EntryID|PurgeBuf|dchg|qchg|dupd|ndsCom|smpCnt|smpSynch|ctlModel|SBOw|SBOes|SBO|Oper|AddCause|TimeQuality|ClockNotSynchronized|brcbSt0\\d|brcbAlm0\\d|brcbMeas0\\d|urcbMeas0\\d|dsStatus|dsAlarm|dsMeas|dsGooseTrip|GoCB_[A-Za-z0-9_]+)\\b',
    '\\b(?:BAY|BUS|IED|CB|TX|DT|SRV|GTW|CLK|SW|MK|CRP|TTB|FLT|TC|SCEN|TOPO|FLOW|MOD|DOM)-[A-Za-z0-9_-]+\\b',
    '\\bIED_[A-Za-z0-9_]+\\b',
    '\\b(?:SIPROTEC\\s*5?|7SA87|7UT86|7SJ85|Relion|REF615|RET615|REC615|MiCOM|P143|P633|C264|Easergy|PACiS|EcoSUI|zenon|Multilin|850|T60|D60|EnerVista|DIGSI\\s*[45]?|PCM600|IEDScout|Wireshark|OMICRON|Hirschmann|RSP35|Meinberg|Moxa|MGate\\s*5216|Catalyst\\s*\\d+|Cisco\\s*\\d+|WLC-?2504)\\b',
    '\\bIEC\\s*61850(?:-[0-9-]+(?:\\s*LE)?)?\\b',
    '\\bIEC\\s*60870-5-10[134]\\b',
    '\\bIEC-?10[134]\\b',
    '\\bIEC\\s*(?:62439-3|62351|60617)\\b',
    '\\bIEEE\\s*(?:1588v2|1588|802\\.1[Qpw]|802\\.3(?:ad)?|1613|80)\\b',
    '\\b(?:GOOSE|MMS|Sampled\\s+Values|SV|SMV|PRP|HSR|RSTP|STP|LACP|Modbus\\s+TCP|Modbus\\s+RTU|Modbus|OPC\\s+UA|DNP3|SNMP|SNTP|NTP|PTPv2|PTP|BRCBs?|URCBs?|RCBs?|GoCBs?|GCB|SCL|ICD|SSD|IID|SCD|CID|SED|VLANs?|QoS|CCNA|ARP|ICMP|OSPFv2|OSPF|NAT|PAT|DHCP|DNS|ACL|SSH|HSRP|CAPWAP|WPA2|PoE|SLDs?|SCADA|HMI|SAS|BCUs?|RTUs?|RCC|SLDC|SAMU|PIU|DANP|SAN|RedBox|FAT/SAT|FAT|SAT|SOE|OLTC|AVR|TCS|50BF|50/51|50N/51N|87T|87B|43LR|52a/52b|52a|52b|89L|89B|89E|Q1|Q8|Q9|LOTO|PTW|COMTRADE|PBKDF2|RBAC|X\\.509v?3?|SHA-256|Three\\.js|WebGL|DataSets?|IEDs?)\\b',
    '\\b(?:TCP/\\d+|UDP/\\d+|Gi\\d+/\\d+(?:\\.\\d+)?|Fa\\d+/\\d+|Po\\d+|Se\\d+/\\d+/\\d+)\\b',
    '\\b(?:STARTDT|STOPDT|TESTFR|C_IC_NA_1|C_DC_NA_1|M_ME_TF_1|M_SP_TB_1|IOAs?|CASDU|COA|COT|MBAP|FC\\s*0[346]|ABCD|CDAB|100BASE-TX|100BASE-FX|1000BASE-LX|LC-Duplex-100BASE-FX|EtherType|InformationReport|GOOD|TAL|OSI-TSEL|OSI-SSEL|OSI-PSEL|AP-Title|SeqNr|LSDUsize|PRPsuffix|Bytes|PRI|Basic256Sha256|Aes128_Sha256_RsaOaep|Sign&Encrypt|NodeId|DisplayName|DataType|AccessLevel|StatusCode|SourceTimestamp|Q:OLD|OTI|WTI|Vab|Vbc|Vca|PF|Freq|TotW|PPV|dsProtTrip|LN\\.DO\\.DA|FC|CDC|LAN\\s*A/B|LAN\\s*A|LAN\\s*B|B:LAN-B|A:LAN-A|Eth\\.|ChA|ChB|VLAN\\s*ID|802\\.1p|PCP|GM|M400|LC|PDU|Sync|Layer-2|Substation_132_33_11kV|ns=2|s=SAS|server:4840|TCP:102|ABB|HIRSCHMANN|IP|Eth)\\b',
    '\\b\\d+(?:/\\d+)*(?:\\.\\d+)?\\s*(?:kV|MVA|kVA|MW|MVAR|kA|Hz|ms|µs|ns|dBm|Mbps|Gbps|kbps|bar|V|A|Ω)\\b',
  ].join('|'),
  'g'
);

export function isPureTechnicalText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= 1) return true;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^(?:https?:\/\/|opc\.tcp:\/\/|[\d\W]+$)/.test(trimmed)) return true;
  const stripped = trimmed
    .replace(PROTECTED_TECH_REGEX, '')
    .replace(/[\d\s•·|→←↔⇄▲▼●✓✕⚠⚡▸▾×±—–():,.;/#+=-]/g, '');
  return stripped.length === 0;
}
