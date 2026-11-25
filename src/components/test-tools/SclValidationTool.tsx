import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// IEC 61850-6 SCL Validation Tool (ICD / IID / SCD / CID / SSD Schema Audit)
// Real XML parser, XSD/Tissue semantic validator, live Substation SCD builder,
// XML line-highlighter, structure explorer, and CSV audit report exporter.
// ============================================================================

type Severity = 'ERROR' | 'WARNING' | 'INFO';
type SchemaTarget = 'AUTO' | 'ED2_1' | 'ED2_0' | 'ED1_0';
type RightTab = 'XML' | 'STRUCTURE' | 'RULES';

interface ValidationIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  section: 'Header' | 'Communication' | 'IED' | 'DataTypeTemplates' | 'Interoperability';
  line: number;
  target: string;
  message: string;
  remedy: string;
}

interface SclSummary {
  fileName: string;
  fileSizeBytes: number;
  sclVersion: string;
  sclRevision: string;
  sclRelease: string;
  namespace: string;
  headerId: string;
  toolId: string;
  iedCount: number;
  ldCount: number;
  lnCount: number;
  datasetCount: number;
  rcbCount: number;
  gcbCount: number;
  lNodeTypeCount: number;
  doTypeCount: number;
  daTypeCount: number;
  enumTypeCount: number;
  commEntries: Array<{
    iedName: string;
    apName: string;
    subNetwork: string;
    ip: string;
    subnet: string;
    gseCount: number;
  }>;
  ieds: Array<{
    name: string;
    manufacturer: string;
    type: string;
    lds: number;
    lns: number;
    datasets: number;
    rcbs: number;
    gcbs: number;
  }>;
}

interface PersistedSclState {
  fileName: string;
  xmlText: string;
  schemaTarget: SchemaTarget;
  rightTab: RightTab;
}

const SCL_VAL_STORAGE_KEY = 'sas_scl_validator_state_v1';
let sclMemoryCache: PersistedSclState | null = null;

function loadInitialSclState(): Partial<PersistedSclState> {
  if (sclMemoryCache) return sclMemoryCache;
  try {
    const raw = window.localStorage.getItem(SCL_VAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedSclState;
      if (parsed && typeof parsed === 'object') {
        sclMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function saveSclState(state: PersistedSclState) {
  sclMemoryCache = state;
  try {
    window.localStorage.setItem(SCL_VAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors for very large SCDs
  }
}

const VALIDATION_RULE_CATALOG: Array<{ ruleId: string; section: string; severity: Severity; desc: string }> = [
  { ruleId: 'SCL-001', section: 'Header', severity: 'ERROR', desc: 'XML must be well-formed with root <SCL> element and IEC 61850-6 namespace.' },
  { ruleId: 'SCL-002', section: 'Header', severity: 'WARNING', desc: '<Header> should specify id, version, revision, and toolID attributes.' },
  { ruleId: 'SCL-003', section: 'Header', severity: 'WARNING', desc: 'SCL version/revision/release should match selected Edition target (Ed1 / Ed2 / Ed2.1).' },
  { ruleId: 'COM-101', section: 'Communication', severity: 'ERROR', desc: 'Every ConnectedAP IP address must be a valid IPv4 address.' },
  { ruleId: 'COM-102', section: 'Communication', severity: 'ERROR', desc: 'IP addresses must be unique across IEDs on the same SubNetwork.' },
  { ruleId: 'COM-103', section: 'Communication', severity: 'ERROR', desc: 'ConnectedAP iedName must reference an existing <IED> element.' },
  { ruleId: 'COM-104', section: 'Communication', severity: 'ERROR', desc: 'GOOSE MAC-Address must be within IEC 61850 multicast range (01-0C-CD-01-00-00 to 01-0C-CD-01-01-FF).' },
  { ruleId: 'COM-105', section: 'Communication', severity: 'ERROR', desc: 'GOOSE APPID must be valid 4-hex-digit value (0000..3FFF) and VLAN-ID within 0..4095.' },
  { ruleId: 'COM-106', section: 'Communication', severity: 'WARNING', desc: 'GOOSE MinTime must be strictly less than MaxTime.' },
  { ruleId: 'IED-201', section: 'IED', severity: 'ERROR', desc: 'IED names must be unique and non-empty.' },
  { ruleId: 'IED-202', section: 'IED', severity: 'ERROR', desc: 'Every LDevice must contain an <LN0 lnClass="LLN0"> node.' },
  { ruleId: 'IED-203', section: 'IED', severity: 'WARNING', desc: 'Every LDevice should contain an LPHD logical node (Physical Device Information).' },
  { ruleId: 'IED-204', section: 'IED', severity: 'ERROR', desc: 'ReportControl datSet must reference an existing DataSet in the same LN.' },
  { ruleId: 'IED-205', section: 'IED', severity: 'ERROR', desc: 'GSEControl datSet must reference an existing DataSet and have confRev >= 1.' },
  { ruleId: 'IED-206', section: 'IED', severity: 'WARNING', desc: 'ReportControl rptID should be unique across the station.' },
  { ruleId: 'IED-207', section: 'IED', severity: 'ERROR', desc: 'SettingControl actSG must be within 1..numOfSGs.' },
  { ruleId: 'DTT-301', section: 'DataTypeTemplates', severity: 'ERROR', desc: 'Every LN/LN0 lnType must reference a defined LNodeType in DataTypeTemplates.' },
  { ruleId: 'DTT-302', section: 'DataTypeTemplates', severity: 'ERROR', desc: 'Every DO type inside LNodeType must reference a defined DOType.' },
  { ruleId: 'DTT-303', section: 'DataTypeTemplates', severity: 'ERROR', desc: 'Every Struct/Enum DA type inside DOType must reference a defined DAType or EnumType.' },
  { ruleId: 'DTT-304', section: 'DataTypeTemplates', severity: 'WARNING', desc: 'Duplicate template IDs in DataTypeTemplates are prohibited.' },
];

const FAULTY_SAMPLE_CID = `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="FAULTY_SAMPLE_CID" version="1" revision="0" toolID="CommissioningAuditDemo"/>
  <Communication>
    <SubNetwork name="StationBus_LAN_A" type="8-MMS">
      <ConnectedAP iedName="IED_132_L1" apName="S1">
        <Address>
          <P type="IP">10.132.10.11</P>
          <P type="IP-SUBNET">255.255.255.0</P>
        </Address>
        <GSE ldInst="Application" cbName="gcbTrip01">
          <Address>
            <P type="MAC-Address">01-0C-CD-04-00-01</P>
            <P type="APPID">9999</P>
            <P type="VLAN-ID">4099</P>
            <P type="VLAN-PRIORITY">4</P>
          </Address>
          <MinTime unit="s" multiplier="m">1000</MinTime>
          <MaxTime unit="s" multiplier="m">500</MaxTime>
        </GSE>
      </ConnectedAP>
      <ConnectedAP iedName="IED_132_L2" apName="S1">
        <Address>
          <P type="IP">10.132.10.11</P>
          <P type="IP-SUBNET">255.255.255.0</P>
        </Address>
      </ConnectedAP>
      <ConnectedAP iedName="IED_GHOST_99" apName="S1">
        <Address>
          <P type="IP">10.132.10.999</P>
        </Address>
      </ConnectedAP>
    </SubNetwork>
  </Communication>
  <IED name="IED_132_L1" manufacturer="Siemens" type="SIPROTEC 5 7SA87">
    <AccessPoint name="S1">
      <Server>
        <LDevice inst="Application">
          <LN0 lnClass="LLN0" inst="" lnType="LN0_Type_1">
            <DataSet name="dsStatus">
              <FCDA ldInst="Application" lnClass="XCBR" lnInst="1" doName="Pos" daName="stVal" fc="ST"/>
            </DataSet>
            <ReportControl name="brcbSt01" rptID="IED_132_L1/LLN0$BR$brcbSt01" datSet="dsMissingDataset" buffered="true" confRev="1" intgPd="5000"/>
            <GSEControl name="gcbTrip01" appID="0x0001" datSet="dsStatus" confRev="0" type="GOOSE"/>
            <SettingControl numOfSGs="4" actSG="6"/>
          </LN0>
          <LN lnClass="XCBR" inst="1" lnType="XCBR_MissingType"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="IED_132_L2" manufacturer="GE Vernova" type="Multilin D60">
    <AccessPoint name="S1">
      <Server>
        <LDevice inst="CTRL">
          <LN0 lnClass="LLN0" inst="" lnType="LN0_Type_1">
            <ReportControl name="brcbSt01" rptID="IED_132_L1/LLN0$BR$brcbSt01" datSet="" buffered="true" confRev="1" intgPd="5000"/>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType id="LN0_Type_1" lnClass="LLN0">
      <DO name="Mod" type="ENC_Type_1"/>
      <DO name="Beh" type="ENS_MissingDOType"/>
    </LNodeType>
    <DOType id="ENC_Type_1" cdc="ENC">
      <DA name="stVal" fc="ST" bType="Enum" type="Enum_Missing"/>
      <DA name="q" fc="ST" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
  </DataTypeTemplates>
</SCL>`;

function findLineNumber(xmlLines: string[], needle: string, fallback = 1): number {
  if (!needle) return fallback;
  const idx = xmlLines.findIndex((l) => l.includes(needle));
  return idx >= 0 ? idx + 1 : fallback;
}

function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function isValidGooseMac(mac: string): boolean {
  const norm = mac.trim().toUpperCase().replace(/:/g, '-');
  return /^01-0C-CD-01-0[01]-[0-9A-F]{2}$/.test(norm);
}

function validateSclXml(
  fileName: string,
  xmlText: string,
  schemaTarget: SchemaTarget
): { issues: ValidationIssue[]; summary: SclSummary } {
  const issues: ValidationIssue[] = [];
  const xmlLines = xmlText.split(/\r?\n/);
  let seq = 0;
  const addIssue = (
    ruleId: string,
    severity: Severity,
    section: ValidationIssue['section'],
    line: number,
    target: string,
    message: string,
    remedy: string
  ) => {
    seq += 1;
    issues.push({ id: `ISS-${seq}`, ruleId, severity, section, line, target, message, remedy });
  };

  const emptySummary: SclSummary = {
    fileName,
    fileSizeBytes: new Blob([xmlText]).size,
    sclVersion: '-',
    sclRevision: '-',
    sclRelease: '-',
    namespace: '-',
    headerId: '-',
    toolId: '-',
    iedCount: 0,
    ldCount: 0,
    lnCount: 0,
    datasetCount: 0,
    rcbCount: 0,
    gcbCount: 0,
    lNodeTypeCount: 0,
    doTypeCount: 0,
    daTypeCount: 0,
    enumTypeCount: 0,
    commEntries: [],
    ieds: [],
  };

  if (!xmlText.trim()) {
    return { issues, summary: emptySummary };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    addIssue(
      'SCL-001',
      'ERROR',
      'Header',
      1,
      '<SCL>',
      `XML Well-Formedness Error: ${parseErr.textContent?.replace(/\s+/g, ' ').slice(0, 140) || 'Malformed XML'}`,
      'Fix unclosed tags, invalid attributes, or malformed XML characters before re-validating.'
    );
    return { issues, summary: emptySummary };
  }

  const sclEl = doc.documentElement;
  if (!sclEl || sclEl.localName !== 'SCL') {
    addIssue(
      'SCL-001',
      'ERROR',
      'Header',
      1,
      `<${sclEl?.tagName || 'root'}>`,
      'Root element must be <SCL> per IEC 61850-6.',
      'Ensure the XML document starts with <SCL xmlns="http://www.iec.ch/61850/2003/SCL">.'
    );
    return { issues, summary: emptySummary };
  }

  const ns = sclEl.namespaceURI || sclEl.getAttribute('xmlns') || '';
  const sclVersion = sclEl.getAttribute('version') || '';
  const sclRevision = sclEl.getAttribute('revision') || '';
  const sclRelease = sclEl.getAttribute('release') || '';

  if (ns !== 'http://www.iec.ch/61850/2003/SCL') {
    addIssue(
      'SCL-001',
      'ERROR',
      'Header',
      findLineNumber(xmlLines, '<SCL'),
      'SCL@xmlns',
      `Invalid or missing SCL namespace "${ns || '(empty)'}". Expected "http://www.iec.ch/61850/2003/SCL".`,
      'Set xmlns="http://www.iec.ch/61850/2003/SCL" on the root <SCL> element.'
    );
  }

  // Schema Edition check
  if (schemaTarget === 'ED2_1' && !(sclVersion === '2007' && sclRevision === 'B' && sclRelease === '4')) {
    addIssue(
      'SCL-003',
      'WARNING',
      'Header',
      findLineNumber(xmlLines, '<SCL'),
      'SCL@version/revision/release',
      `Target Edition 2.1 expects version="2007" revision="B" release="4" (found ${sclVersion || '-'} / ${sclRevision || '-'} / ${sclRelease || '-'}).`,
      'Update <SCL> schema attributes or switch target schema to Auto-Detect.'
    );
  } else if (schemaTarget === 'ED2_0' && !(sclVersion === '2007' && sclRevision === 'B')) {
    addIssue(
      'SCL-003',
      'WARNING',
      'Header',
      findLineNumber(xmlLines, '<SCL'),
      'SCL@version/revision',
      `Target Edition 2.0 expects version="2007" revision="B" (found ${sclVersion || '-'} / ${sclRevision || '-'}).`,
      'Update <SCL> version/revision attributes for IEC 61850 Edition 2.0.'
    );
  }

  const headerEl = doc.querySelector('Header');
  if (!headerEl) {
    addIssue('SCL-002', 'ERROR', 'Header', 2, '<Header>', 'Missing mandatory <Header> element.', 'Add <Header id="..." version="1" revision="0"/> directly under <SCL>.');
  } else {
    if (!headerEl.getAttribute('id')) {
      addIssue('SCL-002', 'WARNING', 'Header', findLineNumber(xmlLines, '<Header'), 'Header@id', '<Header> is missing the "id" attribute.', 'Provide a unique project/file identifier in Header@id.');
    }
    if (!headerEl.getAttribute('toolID')) {
      addIssue('SCL-002', 'INFO', 'Header', findLineNumber(xmlLines, '<Header'), 'Header@toolID', '<Header> does not specify toolID.', 'Adding toolID helps track which engineering tool generated the SCL file.');
    }
  }

  // Index DataTypeTemplates
  const lNodeTypeIds = new Set<string>();
  const doTypeIds = new Set<string>();
  const daTypeIds = new Set<string>();
  const enumTypeIds = new Set<string>();

  const dttEl = doc.querySelector('DataTypeTemplates');
  const lNodeTypes = dttEl ? Array.from(dttEl.querySelectorAll(':scope > LNodeType')) : [];
  const doTypes = dttEl ? Array.from(dttEl.querySelectorAll(':scope > DOType')) : [];
  const daTypes = dttEl ? Array.from(dttEl.querySelectorAll(':scope > DAType')) : [];
  const enumTypes = dttEl ? Array.from(dttEl.querySelectorAll(':scope > EnumType')) : [];

  const registerTemplate = (el: Element, set: Set<string>, kind: string) => {
    const id = el.getAttribute('id') || '';
    if (!id) {
      addIssue('DTT-304', 'ERROR', 'DataTypeTemplates', findLineNumber(xmlLines, `<${kind}`), kind, `<${kind}> is missing mandatory "id" attribute.`, `Assign a unique id to every <${kind}>.`);
      return;
    }
    if (set.has(id)) {
      addIssue('DTT-304', 'WARNING', 'DataTypeTemplates', findLineNumber(xmlLines, `id="${id}"`), `${kind}[id=${id}]`, `Duplicate ${kind} id "${id}" detected.`, 'Remove or rename duplicate template definitions.');
    }
    set.add(id);
  };

  lNodeTypes.forEach((el) => registerTemplate(el, lNodeTypeIds, 'LNodeType'));
  doTypes.forEach((el) => registerTemplate(el, doTypeIds, 'DOType'));
  daTypes.forEach((el) => registerTemplate(el, daTypeIds, 'DAType'));
  enumTypes.forEach((el) => registerTemplate(el, enumTypeIds, 'EnumType'));

  // Cross-check LNodeType -> DOType
  lNodeTypes.forEach((lnt) => {
    const lntId = lnt.getAttribute('id') || '';
    Array.from(lnt.querySelectorAll(':scope > DO')).forEach((doEl) => {
      const doName = doEl.getAttribute('name') || '';
      const doType = doEl.getAttribute('type') || '';
      if (doType && !doTypeIds.has(doType)) {
        addIssue(
          'DTT-302',
          'ERROR',
          'DataTypeTemplates',
          findLineNumber(xmlLines, `type="${doType}"`),
          `LNodeType[${lntId}]/DO[${doName}]`,
          `DO "${doName}" references undefined DOType "${doType}".`,
          `Define <DOType id="${doType}" cdc="..."/> inside <DataTypeTemplates>.`
        );
      }
    });
  });

  // Cross-check DOType -> DAType / EnumType
  doTypes.forEach((dt) => {
    const dtId = dt.getAttribute('id') || '';
    Array.from(dt.querySelectorAll(':scope > DA')).forEach((daEl) => {
      const daName = daEl.getAttribute('name') || '';
      const bType = daEl.getAttribute('bType') || '';
      const refType = daEl.getAttribute('type') || '';
      if (bType === 'Struct' && refType && !daTypeIds.has(refType)) {
        addIssue(
          'DTT-303',
          'ERROR',
          'DataTypeTemplates',
          findLineNumber(xmlLines, `type="${refType}"`),
          `DOType[${dtId}]/DA[${daName}]`,
          `Struct DA "${daName}" references undefined DAType "${refType}".`,
          `Define <DAType id="${refType}"> inside <DataTypeTemplates>.`
        );
      }
      if (bType === 'Enum' && refType && !enumTypeIds.has(refType)) {
        addIssue(
          'DTT-303',
          'ERROR',
          'DataTypeTemplates',
          findLineNumber(xmlLines, `type="${refType}"`),
          `DOType[${dtId}]/DA[${daName}]`,
          `Enum DA "${daName}" references undefined EnumType "${refType}".`,
          `Define <EnumType id="${refType}"> inside <DataTypeTemplates>.`
        );
      }
    });
  });

  // Audit IEDs
  const iedEls = Array.from(doc.querySelectorAll('IED'));
  const iedNameSet = new Set<string>();
  const rptIdSeen = new Map<string, string>();
  const iedSummaries: SclSummary['ieds'] = [];
  let totalLds = 0;
  let totalLns = 0;
  let totalDs = 0;
  let totalRcbs = 0;
  let totalGcbs = 0;

  iedEls.forEach((iedEl, idx) => {
    const iedName = iedEl.getAttribute('name') || '';
    const lineIed = findLineNumber(xmlLines, `name="${iedName}"`, idx + 1);
    if (!iedName) {
      addIssue('IED-201', 'ERROR', 'IED', lineIed, `IED[${idx + 1}]`, 'IED element has an empty name attribute.', 'Assign a unique IED name (e.g., IED_132_L1).');
    } else if (iedNameSet.has(iedName)) {
      addIssue('IED-201', 'ERROR', 'IED', lineIed, `IED[${iedName}]`, `Duplicate IED name "${iedName}" found in SCL.`, 'Ensure every <IED> has a unique name.');
    } else {
      iedNameSet.add(iedName);
    }

    const lds = Array.from(iedEl.querySelectorAll('LDevice'));
    let iedLns = 0;
    let iedDs = 0;
    let iedRcbs = 0;
    let iedGcbs = 0;

    lds.forEach((ldEl) => {
      const ldInst = ldEl.getAttribute('inst') || 'LD0';
      const ln0 = ldEl.querySelector(':scope > LN0');
      const lns = Array.from(ldEl.querySelectorAll(':scope > LN'));
      iedLns += (ln0 ? 1 : 0) + lns.length;

      if (!ln0) {
        addIssue(
          'IED-202',
          'ERROR',
          'IED',
          findLineNumber(xmlLines, `inst="${ldInst}"`, lineIed),
          `${iedName}/${ldInst}`,
          `LDevice "${ldInst}" is missing mandatory <LN0 lnClass="LLN0">.`,
          'Add an <LN0 lnClass="LLN0" inst="" lnType="..."/> node to this Logical Device.'
        );
      }

      const hasLphd = lns.some((l) => l.getAttribute('lnClass') === 'LPHD');
      if (!hasLphd) {
        addIssue(
          'IED-203',
          'INFO',
          'IED',
          findLineNumber(xmlLines, `inst="${ldInst}"`, lineIed),
          `${iedName}/${ldInst}`,
          `LDevice "${ldInst}" does not include an LPHD physical device node.`,
          'IEC 61850-7-4 recommends at least one LPHD1 per Logical Device.'
        );
      }

      const allLns = [...(ln0 ? [ln0] : []), ...lns];
      allLns.forEach((lnEl) => {
        const lnClass = lnEl.getAttribute('lnClass') || (lnEl.tagName === 'LN0' ? 'LLN0' : '');
        const lnName = `${lnEl.getAttribute('prefix') || ''}${lnClass}${lnEl.getAttribute('inst') || ''}`;
        const lnType = lnEl.getAttribute('lnType') || '';

        if (lnType && lNodeTypeIds.size > 0 && !lNodeTypeIds.has(lnType)) {
          addIssue(
            'DTT-301',
            'ERROR',
            'DataTypeTemplates',
            findLineNumber(xmlLines, `lnType="${lnType}"`, lineIed),
            `${iedName}/${ldInst}/${lnName}`,
            `Logical Node "${lnName}" references undefined LNodeType "${lnType}".`,
            `Add <LNodeType id="${lnType}" lnClass="${lnClass}"> to <DataTypeTemplates>.`
          );
        }

        // DataSets in this LN
        const dsSet = new Set<string>();
        Array.from(lnEl.querySelectorAll(':scope > DataSet')).forEach((dsEl) => {
          const dsName = dsEl.getAttribute('name') || '';
          iedDs += 1;
          if (dsName) dsSet.add(dsName);
          const fcdas = dsEl.querySelectorAll('FCDA');
          if (fcdas.length === 0) {
            addIssue(
              'IED-204',
              'WARNING',
              'IED',
              findLineNumber(xmlLines, `name="${dsName}"`, lineIed),
              `${iedName}/${ldInst}/${lnName}$DS$${dsName}`,
              `DataSet "${dsName}" has zero <FCDA> members.`,
              'Add at least one <FCDA> member or remove the unused DataSet.'
            );
          }
        });

        // ReportControls
        Array.from(lnEl.querySelectorAll(':scope > ReportControl')).forEach((rcEl) => {
          iedRcbs += 1;
          const rcName = rcEl.getAttribute('name') || 'rcb';
          const datSet = rcEl.getAttribute('datSet') || '';
          const rptId = rcEl.getAttribute('rptID') || '';
          const lineRc = findLineNumber(xmlLines, `name="${rcName}"`, lineIed);

          if (!datSet) {
            addIssue(
              'IED-204',
              'WARNING',
              'IED',
              lineRc,
              `${iedName}/${ldInst}/${lnName}$${rcName}`,
              `ReportControl "${rcName}" has an empty datSet reference.`,
              'Bind ReportControl@datSet to a valid DataSet in the same Logical Node.'
            );
          } else if (!dsSet.has(datSet)) {
            addIssue(
              'IED-204',
              'ERROR',
              'IED',
              findLineNumber(xmlLines, `datSet="${datSet}"`, lineRc),
              `${iedName}/${ldInst}/${lnName}$${rcName}`,
              `ReportControl "${rcName}" references missing DataSet "${datSet}".`,
              `Create <DataSet name="${datSet}"> under ${lnName} or fix datSet attribute.`
            );
          }

          if (rptId) {
            if (rptIdSeen.has(rptId)) {
              addIssue(
                'IED-206',
                'WARNING',
                'Interoperability',
                findLineNumber(xmlLines, `rptID="${rptId}"`, lineRc),
                `${iedName}/${ldInst}/${lnName}$${rcName}`,
                `Duplicate rptID "${rptId}" also used by ${rptIdSeen.get(rptId)}.`,
                'Assign a globally unique rptID to avoid SCADA/Gateway report collisions.'
              );
            } else {
              rptIdSeen.set(rptId, `${iedName}/${ldInst}/${rcName}`);
            }
          }
        });

        // GSEControls
        Array.from(lnEl.querySelectorAll(':scope > GSEControl')).forEach((gcEl) => {
          iedGcbs += 1;
          const gcName = gcEl.getAttribute('name') || 'gcb';
          const datSet = gcEl.getAttribute('datSet') || '';
          const confRev = Number(gcEl.getAttribute('confRev') || '0');
          const lineGc = findLineNumber(xmlLines, `name="${gcName}"`, lineIed);

          if (!datSet || !dsSet.has(datSet)) {
            addIssue(
              'IED-205',
              'ERROR',
              'IED',
              lineGc,
              `${iedName}/${ldInst}/${lnName}$GO$${gcName}`,
              `GSEControl "${gcName}" references missing or empty DataSet "${datSet || '(empty)'}".`,
              'Bind GSEControl@datSet to an existing DataSet.'
            );
          }
          if (Number.isNaN(confRev) || confRev < 1) {
            addIssue(
              'IED-205',
              'ERROR',
              'IED',
              lineGc,
              `${iedName}/${ldInst}/${lnName}$GO$${gcName}`,
              `GSEControl "${gcName}" has invalid confRev="${gcEl.getAttribute('confRev') || '0'}" (must be >= 1).`,
              'Set confRev="1" or increment it whenever the GOOSE DataSet changes.'
            );
          }
        });

        // SettingControl
        const sgEl = lnEl.querySelector(':scope > SettingControl');
        if (sgEl) {
          const numSgs = Number(sgEl.getAttribute('numOfSGs') || '1');
          const actSg = Number(sgEl.getAttribute('actSG') || '1');
          if (actSg < 1 || actSg > numSgs) {
            addIssue(
              'IED-207',
              'ERROR',
              'IED',
              findLineNumber(xmlLines, '<SettingControl', lineIed),
              `${iedName}/${ldInst}/${lnName}$SGCB`,
              `SettingControl actSG (${actSg}) exceeds numOfSGs (${numSgs}).`,
              `Set actSG between 1 and ${numSgs}.`
            );
          }
        }
      });
    });

    totalLds += lds.length;
    totalLns += iedLns;
    totalDs += iedDs;
    totalRcbs += iedRcbs;
    totalGcbs += iedGcbs;

    iedSummaries.push({
      name: iedName || `IED_${idx + 1}`,
      manufacturer: iedEl.getAttribute('manufacturer') || '-',
      type: iedEl.getAttribute('type') || '-',
      lds: lds.length,
      lns: iedLns,
      datasets: iedDs,
      rcbs: iedRcbs,
      gcbs: iedGcbs,
    });
  });

  // Audit Communication section
  const commEntries: SclSummary['commEntries'] = [];
  const subNets = Array.from(doc.querySelectorAll('Communication > SubNetwork'));
  if (subNets.length === 0) {
    addIssue(
      'COM-101',
      'INFO',
      'Communication',
      1,
      '<Communication>',
      'No <Communication>/<SubNetwork> section present (normal for ICD templates; required for SCD/CID).',
      'Add <Communication> with IP & GSE addresses when engineering a CID/SCD.'
    );
  }

  subNets.forEach((snEl) => {
    const snName = snEl.getAttribute('name') || 'SubNetwork';
    const seenIps = new Map<string, string>();
    Array.from(snEl.querySelectorAll(':scope > ConnectedAP')).forEach((cap) => {
      const iedName = cap.getAttribute('iedName') || '';
      const apName = cap.getAttribute('apName') || 'S1';
      const ip = cap.querySelector('Address > P[type="IP"]')?.textContent?.trim() || '';
      const subnet = cap.querySelector('Address > P[type="IP-SUBNET"]')?.textContent?.trim() || '-';
      const gses = Array.from(cap.querySelectorAll(':scope > GSE'));
      const capLine = findLineNumber(xmlLines, `iedName="${iedName}"`, 1);

      commEntries.push({ iedName, apName, subNetwork: snName, ip: ip || '-', subnet, gseCount: gses.length });

      if (iedName && !iedNameSet.has(iedName)) {
        addIssue(
          'COM-103',
          'ERROR',
          'Communication',
          capLine,
          `ConnectedAP[${iedName}/${apName}]`,
          `ConnectedAP references unknown IED "${iedName}" not defined in <SCL>.`,
          'Remove orphan ConnectedAP or add the corresponding <IED> section.'
        );
      }

      if (ip) {
        const ipLine = findLineNumber(xmlLines, `>${ip}<`, capLine);
        if (!isValidIpv4(ip)) {
          addIssue(
            'COM-101',
            'ERROR',
            'Communication',
            ipLine,
            `ConnectedAP[${iedName}]/IP`,
            `Invalid IPv4 address "${ip}".`,
            'Correct the IP address to four 0–255 octets (e.g., 10.132.10.11).'
          );
        } else if (seenIps.has(ip)) {
          addIssue(
            'COM-102',
            'ERROR',
            'Communication',
            ipLine,
            `SubNetwork[${snName}]/IP`,
            `Duplicate IP address "${ip}" shared by "${iedName}" and "${seenIps.get(ip)}".`,
            'Assign a unique IP address to each IED on the same SubNetwork.'
          );
        } else {
          seenIps.set(ip, iedName);
        }
      }

      gses.forEach((gse) => {
        const cbName = gse.getAttribute('cbName') || 'gcb';
        const mac = gse.querySelector('Address > P[type="MAC-Address"]')?.textContent?.trim() || '';
        const appId = gse.querySelector('Address > P[type="APPID"]')?.textContent?.trim() || '';
        const vlanId = gse.querySelector('Address > P[type="VLAN-ID"]')?.textContent?.trim() || '';
        const minTime = Number(gse.querySelector('MinTime')?.textContent?.trim() || '0');
        const maxTime = Number(gse.querySelector('MaxTime')?.textContent?.trim() || '0');
        const gseLine = findLineNumber(xmlLines, `cbName="${cbName}"`, capLine);

        if (mac && !isValidGooseMac(mac)) {
          addIssue(
            'COM-104',
            'ERROR',
            'Communication',
            findLineNumber(xmlLines, mac, gseLine),
            `GSE[${iedName}/${cbName}]/MAC`,
            `GOOSE MAC "${mac}" is outside IEC 61850-8-1 multicast range (01-0C-CD-01-00-00..01-FF).`,
            'Use a valid GOOSE multicast MAC starting with 01-0C-CD-01-00-xx or 01-0C-CD-01-01-xx.'
          );
        }

        if (appId) {
          const cleanHex = appId.replace(/^0x/i, '');
          const appVal = parseInt(cleanHex, 16);
          if (!/^[0-9A-Fa-f]{1,4}$/.test(cleanHex) || Number.isNaN(appVal) || appVal > 0x3fff) {
            addIssue(
              'COM-105',
              'ERROR',
              'Communication',
              findLineNumber(xmlLines, appId, gseLine),
              `GSE[${iedName}/${cbName}]/APPID`,
              `GOOSE APPID "${appId}" is outside standard Type 1/1A range (0x0000..0x3FFF).`,
              'Set APPID to a 4-digit hex value between 0000 and 3FFF.'
            );
          }
        }

        if (vlanId) {
          const vNum = /^[0-9A-Fa-f]+$/.test(vlanId) && vlanId.length <= 3 ? parseInt(vlanId, 16) : Number(vlanId);
          if (Number.isNaN(vNum) || vNum < 0 || vNum > 4095) {
            addIssue(
              'COM-105',
              'ERROR',
              'Communication',
              findLineNumber(xmlLines, vlanId, gseLine),
              `GSE[${iedName}/${cbName}]/VLAN-ID`,
              `VLAN-ID "${vlanId}" exceeds 12-bit IEEE 802.1Q limit (0..4095).`,
              'Configure VLAN-ID between 0 and 4095 (000..FFF).'
            );
          }
        }

        if (minTime > 0 && maxTime > 0 && minTime >= maxTime) {
          addIssue(
            'COM-106',
            'WARNING',
            'Communication',
            findLineNumber(xmlLines, '<MinTime', gseLine),
            `GSE[${iedName}/${cbName}]/Timing`,
            `GOOSE MinTime (${minTime} ms) must be less than MaxTime (${maxTime} ms).`,
            'Set MinTime (e.g., 4 ms) strictly below MaxTime (e.g., 1000 ms).'
          );
        }
      });
    });
  });

  return {
    issues,
    summary: {
      fileName,
      fileSizeBytes: new Blob([xmlText]).size,
      sclVersion: sclVersion || '-',
      sclRevision: sclRevision || '-',
      sclRelease: sclRelease || '-',
      namespace: ns || '-',
      headerId: headerEl?.getAttribute('id') || '-',
      toolId: headerEl?.getAttribute('toolID') || '-',
      iedCount: iedEls.length,
      ldCount: totalLds,
      lnCount: totalLns,
      datasetCount: totalDs,
      rcbCount: totalRcbs,
      gcbCount: totalGcbs,
      lNodeTypeCount: lNodeTypes.length,
      doTypeCount: doTypes.length,
      daTypeCount: daTypes.length,
      enumTypeCount: enumTypes.length,
      commEntries,
      ieds: iedSummaries,
    },
  };
}

export const SclValidationTool: React.FC = () => {
  const initialCache = useMemo(() => loadInitialSclState(), []);
  const { ieds: storeIeds, gooseControlBlocks: storeGcbs } = useSubstationStore();

  const [fileName, setFileName] = useState<string>(() => initialCache.fileName || '');
  const [xmlText, setXmlText] = useState<string>(() => initialCache.xmlText || '');
  const [schemaTarget, setSchemaTarget] = useState<SchemaTarget>(() => initialCache.schemaTarget || 'AUTO');
  const [rightTab, setRightTab] = useState<RightTab>(() => initialCache.rightTab || 'XML');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>('Ready. Open an .icd/.cid/.scd/.iid file or audit the live substation SCD.');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xmlScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveSclState({ fileName, xmlText, schemaTarget, rightTab });
  }, [fileName, xmlText, schemaTarget, rightTab]);

  // Run live validation whenever xmlText or schemaTarget changes
  const { issues, summary } = useMemo(
    () => validateSclXml(fileName || 'No file loaded', xmlText, schemaTarget),
    [fileName, xmlText, schemaTarget]
  );

  const errorCount = useMemo(() => issues.filter((i) => i.severity === 'ERROR').length, [issues]);
  const warnCount = useMemo(() => issues.filter((i) => i.severity === 'WARNING').length, [issues]);
  const infoCount = useMemo(() => issues.filter((i) => i.severity === 'INFO').length, [issues]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((iss) => {
      if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
      if (sectionFilter !== 'ALL' && iss.section !== sectionFilter) return false;
      if (q && !`${iss.ruleId} ${iss.target} ${iss.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, severityFilter, sectionFilter, searchQuery]);

  const xmlLines = useMemo(() => (xmlText ? xmlText.split(/\r?\n/) : []), [xmlText]);

  const issueLinesMap = useMemo(() => {
    const m = new Map<number, Severity>();
    issues.forEach((iss) => {
      const cur = m.get(iss.line);
      if (!cur || iss.severity === 'ERROR' || (cur === 'INFO' && iss.severity === 'WARNING')) {
        m.set(iss.line, iss.severity);
      }
    });
    return m;
  }, [issues]);

  // Build valid IEC 61850-6 Edition 2.1 SCD from live Substation Store
  const handleAuditLiveSubstation = () => {
    const commXml = storeIeds
      .map((ied) => {
        const gseXml = storeGcbs
          .filter((g) => g.publisherIedId === ied.id)
          .map(
            (g) => `        <GSE ldInst="${ied.logicalDevices[0]?.ldInst || 'LD0'}" cbName="${g.gocbName}">
          <Address>
            <P type="MAC-Address">${g.multicastMac}</P>
            <P type="APPID">${g.appId.replace(/^0x/i, '').padStart(4, '0')}</P>
            <P type="VLAN-ID">${g.vlanId.toString(16).toUpperCase().padStart(3, '0')}</P>
            <P type="VLAN-PRIORITY">${g.vlanPriority}</P>
          </Address>
          <MinTime unit="s" multiplier="m">${g.minTimeMs}</MinTime>
          <MaxTime unit="s" multiplier="m">${g.maxTimeMs}</MaxTime>
        </GSE>`
          )
          .join('\n');
        return `      <ConnectedAP iedName="${ied.name}" apName="S1">
        <Address>
          <P type="IP">${ied.ipAddressLanA}</P>
          <P type="IP-SUBNET">${ied.subnetMask || '255.255.255.0'}</P>
        </Address>${gseXml ? '\n' + gseXml : ''}
      </ConnectedAP>`;
      })
      .join('\n');

    const iedXml = storeIeds
      .map((ied) => {
        const ldsXml = ied.logicalDevices
          .map((ld, ldIdx) => {
            const dsXml =
              ldIdx === 0
                ? ied.datasets
                    .map(
                      (ds) => `            <DataSet name="${ds.name}">\n${ds.fcdas
                        .map(
                          (f) =>
                            `              <FCDA ldInst="${f.ldInst}" lnClass="${f.lnClass}" lnInst="${f.lnInst}" doName="${f.doName}"${
                              f.daName ? ` daName="${f.daName}"` : ''
                            } fc="${f.fc}"/>`
                        )
                        .join('\n')}\n            </DataSet>`
                    )
                    .join('\n')
                : '';
            const rcbXml =
              ldIdx === 0
                ? ied.rcbs
                    .map(
                      (r) =>
                        `            <ReportControl name="${r.name}" rptID="${r.rptId}" datSet="${r.datSet}" buffered="${r.buffered}" confRev="${r.confRev}" intgPd="${r.intgPdMs}"/>`
                    )
                    .join('\n')
                : '';
            const gcbXml =
              ldIdx === 0
                ? storeGcbs
                    .filter((g) => g.publisherIedId === ied.id)
                    .map(
                      (g) =>
                        `            <GSEControl name="${g.gocbName}" appID="${g.appId}" datSet="${g.datSet}" confRev="${g.confRev}" type="GOOSE"/>`
                    )
                    .join('\n')
                : '';
            const otherLns = ld.logicalNodes
              .filter((ln) => ln.lnClass !== 'LLN0')
              .map(
                (ln) =>
                  `          <LN lnClass="${ln.lnClass}" inst="${ln.lnInst || '1'}" lnType="LN_${ln.lnClass}" desc="${ln.description}"/>`
              )
              .join('\n');
            return `        <LDevice inst="${ld.ldInst}">
          <LN0 lnClass="LLN0" inst="" lnType="LN_LLN0">
${[dsXml, rcbXml, gcbXml, ldIdx === 0 ? '            <SettingControl numOfSGs="4" actSG="1"/>' : ''].filter(Boolean).join('\n')}
          </LN0>
          <LN lnClass="LPHD" inst="1" lnType="LN_LPHD"/>
${otherLns}
        </LDevice>`;
          })
          .join('\n');

        return `  <IED name="${ied.name}" manufacturer="${ied.vendor}" type="${ied.model}">
    <AccessPoint name="S1">
      <Server>
${ldsXml}
      </Server>
    </AccessPoint>
  </IED>`;
      })
      .join('\n');

    const lnClasses = Array.from(
      new Set(['LLN0', 'LPHD', ...storeIeds.flatMap((i) => i.logicalDevices.flatMap((l) => l.logicalNodes.map((n) => n.lnClass)))])
    );
    const lntXml = lnClasses
      .map(
        (cls) => `    <LNodeType id="LN_${cls}" lnClass="${cls}">
      <DO name="Mod" type="DO_ENC"/>
      <DO name="Beh" type="DO_ENS"/>
    </LNodeType>`
      )
      .join('\n');

    const generated = `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="Substation_132kV_Live_SCD" version="1" revision="0" toolID="SAS_SCL_Validator_Ed2.1"/>
  <Communication>
    <SubNetwork name="StationBus_LAN_A" type="8-MMS">
${commXml}
    </SubNetwork>
  </Communication>
${iedXml}
  <DataTypeTemplates>
${lntXml}
    <DOType id="DO_ENC" cdc="ENC">
      <DA name="stVal" fc="ST" bType="Enum" type="Enum_Mod"/>
      <DA name="q" fc="ST" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
    <DOType id="DO_ENS" cdc="ENS">
      <DA name="stVal" fc="ST" bType="Enum" type="Enum_Mod"/>
      <DA name="q" fc="ST" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
    <EnumType id="Enum_Mod">
      <EnumVal ord="1">on</EnumVal>
      <EnumVal ord="2">blocked</EnumVal>
      <EnumVal ord="3">test</EnumVal>
      <EnumVal ord="5">off</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>`;

    setFileName('Substation_132kV_Live.scd');
    setXmlText(generated);
    setSelectedIssueId('');
    setHighlightLine(null);
    setStatusBanner(`Audited Live Substation SCD (${storeIeds.length} IEDs) against IEC 61850-6 Edition 2.1 schema.`);
  };

  const handleLoadFaultySample = () => {
    setFileName('Faulty_Commissioning_Sample.cid');
    setXmlText(FAULTY_SAMPLE_CID);
    setSeverityFilter('ALL');
    setSectionFilter('ALL');
    setSelectedIssueId('');
    setHighlightLine(null);
    setStatusBanner('Loaded Faulty Sample CID containing duplicate IPs, bad GOOSE MAC/APPID/VLAN, missing DataSet & missing DataTypeTemplates.');
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setXmlText(String(reader.result || ''));
      setSeverityFilter('ALL');
      setSectionFilter('ALL');
      setSelectedIssueId('');
      setHighlightLine(null);
      setStatusBanner(`Loaded and audited "${file.name}" (${file.size.toLocaleString()} bytes).`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJumpToIssue = (iss: ValidationIssue) => {
    setSelectedIssueId(iss.id);
    setHighlightLine(iss.line);
    setRightTab('XML');
    window.setTimeout(() => {
      if (xmlScrollRef.current) {
        const lineHeight = 19;
        xmlScrollRef.current.scrollTop = Math.max(0, (iss.line - 5) * lineHeight);
      }
    }, 20);
  };

  const handleExportCsv = () => {
    if (!xmlText) return;
    const header = ['Rule ID', 'Severity', 'Section', 'Line', 'Object / XPath', 'Message', 'Recommended Fix'];
    const rows = issues.map((i) =>
      [i.ruleId, i.severity, i.section, String(i.line), i.target, i.message, i.remedy]
        .map((c) => `"${c.replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fileName || 'scl_audit').replace(/\.[^.]+$/, '')}_validation_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusBanner(`Exported ${issues.length} validation finding(s) to CSV.`);
  };

  const handleDownloadXml = () => {
    if (!xmlText) return;
    const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'validated.scd';
    a.click();
    URL.revokeObjectURL(url);
  };

  const verdict = !xmlText ? 'IDLE' : errorCount > 0 ? 'FAIL' : warnCount > 0 ? 'PASS_WARN' : 'PASS';

  return (
    <div
      className="sclval-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f3f5f8] text-[#111827] border border-[#94a3b8] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      {/* Scoped Light Desktop Theme overrides beating #root & luminous-cyan-theme.css */}
      <style>{`
        #root .sclval-app,
        .sclval-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f3f5f8 !important;
          background-color: #f3f5f8 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .sclval-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .sclval-app *::-webkit-scrollbar-track { background: #f1f5f9 !important; }
        #root .sclval-app *::-webkit-scrollbar-thumb { background: #cbd5e1 !important; border: 2px solid #f1f5f9 !important; border-radius: 0 !important; }
        #root .sclval-app button {
          font-family: "Segoe UI", Tahoma, sans-serif !important;
          box-shadow: none !important;
        }
        #root .sclval-app input,
        #root .sas-workspace-main .sclval-app input,
        #root .sclval-app select,
        #root .sas-workspace-main .sclval-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .sclval-app select option {
          background-color: #ffffff !important;
          color: #111827 !important;
        }
        #root .sclval-app .scl-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 4px 10px !important;
          font-size: 12px !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .sclval-app .scl-btn:hover:not(:disabled) {
          background: #e0f2fe !important;
          border-color: #0284c7 !important;
        }
        #root .sclval-app .scl-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        #root .sclval-app .scl-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0c3c66 !important;
          padding: 4px 11px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .sclval-app .scl-btn-primary:hover {
          background: #0c3c66 !important;
        }
        #root .sas-app-shell .sas-workspace-main .sclval-app table,
        #root .sclval-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .sclval-app table thead th,
        #root .sclval-app table thead th {
          background: #eef2f6 !important;
          color: #1e293b !important;
          font-weight: 600 !important;
          text-align: left;
          padding: 5px 8px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          border-right: 1px solid #e2e8f0 !important;
          position: sticky;
          top: 0;
          z-index: 4;
          font-size: 11.5px !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }
        #root .sas-app-shell .sas-workspace-main .sclval-app table tbody td,
        #root .sclval-app table tbody td {
          padding: 4px 8px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background-color: #ffffff !important;
          vertical-align: top;
        }
        #root .sas-app-shell .sas-workspace-main .sclval-app table tbody tr.scl-row:hover td,
        #root .sclval-app table tbody tr.scl-row:hover td {
          background-color: #f0f9ff !important;
        }
        #root .sas-app-shell .sas-workspace-main .sclval-app table tbody tr.scl-row-sel td,
        #root .sclval-app table tbody tr.scl-row-sel td {
          background-color: #dbeafe !important;
          color: #0f172a !important;
        }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept=".icd,.iid,.scd,.cid,.ssd,.sed,.xml"
        onChange={handleUploadFile}
        className="hidden"
      />

      {/* 1. TITLE BAR */}
      <div className="h-[30px] bg-[#0f3d6e] text-white px-3 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-2 font-semibold">
          <span className="inline-flex items-center justify-center bg-[#38bdf8] text-[#082f49] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">
            SCL
          </span>
          <span>IEC 61850-6 SCL Validation Tool — ICD / IID / SCD / CID Schema Audit</span>
        </div>
        <div className="text-[11px] opacity-90 font-mono">
          {fileName ? `${fileName} (${summary.sclVersion}${summary.sclRevision !== '-' ? summary.sclRevision : ''}${summary.sclRelease !== '-' ? '.' + summary.sclRelease : ''})` : 'No SCL Loaded'}
        </div>
      </div>

      {/* 2. TOOLBAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0">
        <button type="button" className="scl-btn-primary" onClick={() => fileInputRef.current?.click()}>
          Open SCL File (.icd/.cid/.scd)
        </button>
        <button type="button" className="scl-btn" onClick={handleAuditLiveSubstation}>
          Audit Live Substation SCD
        </button>
        <button type="button" className="scl-btn" onClick={handleLoadFaultySample}>
          Load Faulty Sample CID
        </button>

        <div className="w-[1px] h-5 bg-[#cbd5e1]" />

        <label className="text-[11.5px] font-semibold text-[#334155]">Target Schema:</label>
        <select
          value={schemaTarget}
          onChange={(e) => setSchemaTarget(e.target.value as SchemaTarget)}
          className="h-[26px] px-2 text-[11.5px]"
        >
          <option value="AUTO">Auto-Detect</option>
          <option value="ED2_1">Edition 2.1 (2007B4)</option>
          <option value="ED2_0">Edition 2.0 (2007B)</option>
          <option value="ED1_0">Edition 1.0 (2003)</option>
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className="scl-btn" disabled={!xmlText} onClick={handleExportCsv}>
            Export Audit CSV
          </button>
          <button type="button" className="scl-btn" disabled={!xmlText} onClick={handleDownloadXml}>
            Download XML
          </button>
        </div>
      </div>

      {/* 3. AUDIT SUMMARY KPI STRIP */}
      <div className="bg-[#ffffff] border-b border-[#cbd5e1] px-3 py-1.5 flex flex-wrap items-center gap-3 shrink-0 text-[11.5px]">
        <div
          className="px-2.5 py-0.5 rounded font-bold text-[11px]"
          style={{
            background:
              verdict === 'PASS'
                ? '#dcfce7'
                : verdict === 'PASS_WARN'
                ? '#fef3c7'
                : verdict === 'FAIL'
                ? '#fee2e2'
                : '#e2e8f0',
            color:
              verdict === 'PASS'
                ? '#166534'
                : verdict === 'PASS_WARN'
                ? '#92400e'
                : verdict === 'FAIL'
                ? '#991b1b'
                : '#475569',
          }}
        >
          {verdict === 'PASS'
            ? 'PASS — 0 Errors'
            : verdict === 'PASS_WARN'
            ? 'PASS WITH WARNINGS'
            : verdict === 'FAIL'
            ? `FAILED — ${errorCount} Error(s)`
            : 'NO FILE LOADED'}
        </div>

        <button
          type="button"
          onClick={() => setSeverityFilter(severityFilter === 'ERROR' ? 'ALL' : 'ERROR')}
          className="px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer"
          style={{
            background: severityFilter === 'ERROR' ? '#dc2626' : '#fef2f2',
            color: severityFilter === 'ERROR' ? '#ffffff' : '#b91c1c',
            borderColor: '#fca5a5',
          }}
        >
          Errors: {errorCount}
        </button>
        <button
          type="button"
          onClick={() => setSeverityFilter(severityFilter === 'WARNING' ? 'ALL' : 'WARNING')}
          className="px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer"
          style={{
            background: severityFilter === 'WARNING' ? '#d97706' : '#fffbeb',
            color: severityFilter === 'WARNING' ? '#ffffff' : '#b45309',
            borderColor: '#fcd34d',
          }}
        >
          Warnings: {warnCount}
        </button>
        <button
          type="button"
          onClick={() => setSeverityFilter(severityFilter === 'INFO' ? 'ALL' : 'INFO')}
          className="px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer"
          style={{
            background: severityFilter === 'INFO' ? '#0284c7' : '#f0f9ff',
            color: severityFilter === 'INFO' ? '#ffffff' : '#0369a1',
            borderColor: '#7dd3fc',
          }}
        >
          Info: {infoCount}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-[#334155]">
          <span><strong>IEDs:</strong> {summary.iedCount}</span>
          <span><strong>LDs:</strong> {summary.ldCount}</span>
          <span><strong>LNs:</strong> {summary.lnCount}</span>
          <span><strong>DataSets:</strong> {summary.datasetCount}</span>
          <span><strong>RCBs:</strong> {summary.rcbCount}</span>
          <span><strong>GCBs:</strong> {summary.gcbCount}</span>
          <span><strong>Templates:</strong> {summary.lNodeTypeCount + summary.doTypeCount + summary.daTypeCount + summary.enumTypeCount}</span>
        </div>
      </div>

      {/* 4. MAIN SPLIT WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANE: VALIDATION FINDINGS TABLE */}
        <div className="w-[54%] min-w-[320px] flex flex-col border-r-[3px] border-[#cbd5e1] bg-[#ffffff] overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2 py-1 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11.5px] font-semibold text-[#0f3d6e]">
              Validation Findings ({filteredIssues.length})
            </span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="h-[22px] px-1.5 text-[11px]"
            >
              <option value="ALL">All Sections</option>
              <option value="Header">Header</option>
              <option value="Communication">Communication</option>
              <option value="IED">IED</option>
              <option value="DataTypeTemplates">DataTypeTemplates</option>
              <option value="Interoperability">Interoperability</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter rule, IED, message..."
              className="h-[22px] flex-1 min-w-[120px] px-2 text-[11px]"
            />
          </div>

          <div className="flex-1 overflow-auto">
            {!xmlText ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#475569] gap-2">
                <div className="text-[13px] font-semibold text-[#0f3d6e]">No SCL File Loaded</div>
                <p className="text-[12px] max-w-sm">
                  Click <strong>Audit Live Substation SCD</strong> to validate your current substation model, <strong>Load Faulty Sample CID</strong> to test error detection, or upload any <code>.icd/.cid/.scd/.iid</code> file.
                </p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#166534] gap-1">
                <div className="text-[14px] font-bold">No Issues Found</div>
                <p className="text-[12px] text-[#334155]">
                  All IEC 61850-6 schema, Communication, IED, and DataTypeTemplates checks passed for the current filter.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '11%' }}>Severity</th>
                    <th style={{ width: '11%' }}>Rule</th>
                    <th style={{ width: '8%' }}>Line</th>
                    <th style={{ width: '24%' }}>Object / Reference</th>
                    <th style={{ width: '46%' }}>Finding &amp; Remedy</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((iss) => {
                    const isSel = selectedIssueId === iss.id;
                    return (
                      <tr
                        key={iss.id}
                        onClick={() => handleJumpToIssue(iss)}
                        className={`cursor-pointer scl-row ${isSel ? 'scl-row-sel' : ''}`}
                      >
                        <td>
                          <span
                            className="inline-block px-1.5 py-[1px] rounded text-[10px] font-bold"
                            style={{
                              background:
                                iss.severity === 'ERROR'
                                  ? '#fee2e2'
                                  : iss.severity === 'WARNING'
                                  ? '#fef3c7'
                                  : '#e0f2fe',
                              color:
                                iss.severity === 'ERROR'
                                  ? '#991b1b'
                                  : iss.severity === 'WARNING'
                                  ? '#92400e'
                                  : '#0369a1',
                            }}
                          >
                            {iss.severity}
                          </span>
                        </td>
                        <td className="font-mono font-semibold">{iss.ruleId}</td>
                        <td className="font-mono">{iss.line}</td>
                        <td className="font-mono text-[11px] break-all">{iss.target}</td>
                        <td>
                          <div className="font-medium text-[#0f172a]">{iss.message}</div>
                          <div className="text-[10.5px] text-[#475569] mt-0.5">Fix: {iss.remedy}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT PANE: XML SOURCE / STRUCTURE / RULE CATALOG */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff] overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2 pt-1 flex items-center gap-1 shrink-0">
            {(['XML', 'STRUCTURE', 'RULES'] as RightTab[]).map((tab) => {
              const active = rightTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightTab(tab)}
                  className="px-3 py-1 text-[11.5px] font-semibold border border-b-0 rounded-t-[3px] cursor-pointer"
                  style={{
                    background: active ? '#ffffff' : '#e2e8f0',
                    color: active ? '#0f3d6e' : '#475569',
                    borderColor: '#cbd5e1',
                  }}
                >
                  {tab === 'XML' ? 'XML Source' : tab === 'STRUCTURE' ? 'SCL Structure' : 'Rule Catalog'}
                </button>
              );
            })}
          </div>

          {rightTab === 'XML' && (
            <div ref={xmlScrollRef} className="flex-1 overflow-auto bg-[#ffffff] font-mono text-[11.5px] leading-[19px]">
              {xmlLines.length === 0 ? (
                <div className="p-6 text-[#64748b] font-sans text-[12px]">
                  Load an SCL file to inspect line-numbered XML with inline error highlights.
                </div>
              ) : (
                <div className="min-w-max">
                  {xmlLines.map((lineText, idx) => {
                    const ln = idx + 1;
                    const sev = issueLinesMap.get(ln);
                    const isHl = highlightLine === ln;
                    const bg = isHl
                      ? '#fde047'
                      : sev === 'ERROR'
                      ? '#fee2e2'
                      : sev === 'WARNING'
                      ? '#fef3c7'
                      : 'transparent';
                    return (
                      <div key={ln} className="flex" style={{ backgroundColor: bg }}>
                        <span className="w-[46px] shrink-0 text-right pr-2.5 select-none text-[#64748b] bg-[#f8fafc] border-r border-[#e2e8f0]">
                          {ln}
                        </span>
                        <span className="pl-2.5 pr-4 whitespace-pre text-[#0f172a]">{lineText}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {rightTab === 'STRUCTURE' && (
            <div className="flex-1 overflow-auto p-3 space-y-3 text-[12px]">
              <div>
                <div className="font-bold text-[#0f3d6e] mb-1">Communication SubNetworks ({summary.commEntries.length})</div>
                <table>
                  <thead>
                    <tr>
                      <th>IED</th>
                      <th>SubNetwork</th>
                      <th>IP Address</th>
                      <th>Subnet</th>
                      <th>GSEs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.commEntries.map((c, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{c.iedName}</td>
                        <td>{c.subNetwork}</td>
                        <td className="font-mono">{c.ip}</td>
                        <td className="font-mono">{c.subnet}</td>
                        <td>{c.gseCount}</td>
                      </tr>
                    ))}
                    {summary.commEntries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-[#64748b]">No Communication entries parsed.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="font-bold text-[#0f3d6e] mb-1">IED Summary ({summary.ieds.length})</div>
                <table>
                  <thead>
                    <tr>
                      <th>IED Name</th>
                      <th>Vendor / Model</th>
                      <th>LDs</th>
                      <th>LNs</th>
                      <th>DS</th>
                      <th>RCBs</th>
                      <th>GCBs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.ieds.map((i, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{i.name}</td>
                        <td>{`${i.manufacturer} ${i.type}`}</td>
                        <td>{i.lds}</td>
                        <td>{i.lns}</td>
                        <td>{i.datasets}</td>
                        <td>{i.rcbs}</td>
                        <td>{i.gcbs}</td>
                      </tr>
                    ))}
                    {summary.ieds.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-[#64748b]">No IEDs parsed.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rightTab === 'RULES' && (
            <div className="flex-1 overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '14%' }}>Rule ID</th>
                    <th style={{ width: '18%' }}>Section</th>
                    <th style={{ width: '14%' }}>Severity</th>
                    <th style={{ width: '54%' }}>IEC 61850-6 Audit Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  {VALIDATION_RULE_CATALOG.map((r) => (
                    <tr key={r.ruleId}>
                      <td className="font-mono font-semibold">{r.ruleId}</td>
                      <td>{r.section}</td>
                      <td>{r.severity}</td>
                      <td>{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div className="h-[24px] bg-[#eef2f6] border-t border-[#cbd5e1] px-3 flex items-center justify-between text-[11px] text-[#334155] shrink-0">
        <span className="truncate">{statusBanner}</span>
        <span className="font-mono shrink-0 ml-2">IEC 61850-6 Validator · Ed1 / Ed2 / Ed2.1</span>
      </div>
    </div>
  );
};

export default SclValidationTool;
