export interface SclFileSample {
  id: string;
  fileType: 'ICD' | 'CID' | 'SCD' | 'IID';
  fileName: string;
  title: string;
  iecClause: string;
  purpose: string;
  keyElements: string[];
  xmlContent: string;
}

export const SCL_FILE_SAMPLES: SclFileSample[] = [
  {
    id: 'SCL-ICD',
    fileType: 'ICD',
    fileName: 'SIPROTEC5_7SJ85_Template.icd',
    title: 'IED Capability Description (ICD) — Unconfigured Template',
    iecClause: 'IEC 61850-6 Clause 9 (Template IED Name = "TEMPLATE")',
    purpose: 'Supplied by the IED manufacturer (e.g., Siemens, ABB, Schneider, GE). Declares supported Logical Nodes, Data Object types, Services, and capabilities before project-specific IP or GOOSE binding.',
    keyElements: ['<Header>', '<IED name="TEMPLATE">', '<Services>', '<AccessPoint name="P1">', '<DataTypeTemplates>'],
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="SIPROTEC5_7SJ85_ICD_V9.40" version="1.0" toolID="DIGSI5_IEC61850_Export" nameStructure="IEDName"/>
  <IED name="TEMPLATE" type="7SJ85" manufacturer="Siemens" configVersion="V09.40.01" originalSclVersion="2007" originalSclRevision="B">
    <Services nameLength="64">
      <DynAssociation max="8"/>
      <GetDirectory/>
      <GetDataObjectDefinition/>
      <GetDataSetValue/>
      <DataSetDirectory/>
      <ConfDataSet max="16" maxAttributes="120"/>
      <ConfReportControl max="16" bufMode="both" bufConf="true"/>
      <GOOSE max="12" fixedOffs="false" goose="true" rGOOSE="false"/>
      <ClientServices goose="true" bufReport="true" unbufReport="true"/>
      <SupSubscription maxGo="32" maxSv="0"/>
    </Services>
    <AccessPoint name="P1">
      <Server timeout="30">
        <Authentication none="true"/>
        <LDevice inst="Application" desc="Switchgear Control &amp; Interlocking">
          <LN0 lnClass="LLN0" inst="" lnType="Siemens_LLN0_Ed2"/>
          <LN lnClass="LPHD" inst="1" lnType="Siemens_LPHD_Ed2"/>
          <LN lnClass="XCBR" inst="1" lnType="Siemens_XCBR_DPC"/>
          <LN lnClass="XSWI" inst="1" lnType="Siemens_XSWI_DPC"/>
          <LN lnClass="CSWI" inst="1" lnType="Siemens_CSWI_SBOw"/>
          <LN lnClass="CILO" inst="1" lnType="Siemens_CILO_Std"/>
        </LDevice>
        <LDevice inst="FeedProt" desc="Overcurrent &amp; Earth Fault Protection">
          <LN0 lnClass="LLN0" inst="" lnType="Siemens_LLN0_Ed2"/>
          <LN lnClass="PTOC" inst="1" lnType="Siemens_PTOC_51"/>
          <LN lnClass="PTOC" inst="2" lnType="Siemens_PTOC_51N"/>
          <LN lnClass="PTRC" inst="1" lnType="Siemens_PTRC_MasterTrip"/>
          <LN lnClass="RBRF" inst="1" lnType="Siemens_RBRF_50BF"/>
          <LN lnClass="RREC" inst="1" lnType="Siemens_RREC_79"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType id="Siemens_XCBR_DPC" lnClass="XCBR">
      <DO name="Mod" type="ENC_Mod"/>
      <DO name="Beh" type="ENS_Beh"/>
      <DO name="Health" type="ENS_Health"/>
      <DO name="Loc" type="SPS_Loc"/>
      <DO name="OpCnt" type="INS_OpCnt"/>
      <DO name="Pos" type="DPC_Pos_SBOw"/>
    </LNodeType>
  </DataTypeTemplates>
</SCL>`,
  },
  {
    id: 'SCL-IID',
    fileType: 'IID',
    fileName: 'IED_33_F03_Instantiated.iid',
    title: 'Instantiated IED Description (IID) — Single Bay Export',
    iecClause: 'IEC 61850-6 Edition 2 (Vendor IED Tool → System Configurator)',
    purpose: 'Exported from the vendor IED tool (e.g., DIGSI 5 or PCM600) after assigning the concrete IED name, bay IP address, and pre-configured datasets for import into the System Configurator.',
    keyElements: ['<Header>', '<Communication>', '<IED name="IED_33_F03">', '<DataSet name="dsStatus">', '<ReportControl>'],
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="IED_33_F03_IID" version="2.1" toolID="DIGSI5_V9.40" nameStructure="IEDName"/>
  <Communication>
    <SubNetwork name="StationBus_PRP" type="8-MMS">
      <ConnectedAP iedName="IED_33_F03" apName="P1" redProt="prp">
        <Address>
          <P type="IP">10.132.10.21</P>
          <P type="IP-SUBNET">255.255.255.0</P>
          <P type="IP-GATEWAY">10.132.10.1</P>
          <P type="OSI-TSEL">0001</P>
          <P type="OSI-SSEL">0001</P>
          <P type="OSI-PSEL">00000001</P>
        </Address>
      </ConnectedAP>
    </SubNetwork>
  </Communication>
  <IED name="IED_33_F03" desc="33 kV Outgoing Feeder 03 (Data Center Corridor)" type="7SJ85" manufacturer="Siemens">
    <AccessPoint name="P1">
      <Server>
        <LDevice inst="Application">
          <LN0 lnClass="LLN0" inst="" lnType="Siemens_LLN0_Ed2">
            <DataSet name="dsStatus" desc="Breaker, Isolator &amp; Interlock Status">
              <FCDA ldInst="Application" lnClass="XCBR" lnInst="1" doName="Pos" fc="ST"/>
              <FCDA ldInst="Application" lnClass="XSWI" lnInst="1" doName="Pos" fc="ST"/>
              <FCDA ldInst="Application" lnClass="CSWI" lnInst="1" doName="Loc" fc="ST"/>
              <FCDA ldInst="Application" lnClass="CILO" lnInst="1" doName="EnaCls" fc="ST"/>
            </DataSet>
            <ReportControl name="brcbSt01" rptID="IED_33_F03Application/LLN0$BR$brcbSt01" datSet="dsStatus" confRev="101" buffered="true" bufTime="100" intgPd="5000">
              <TrgOps dchg="true" qchg="true" dupd="false" period="true" gi="true"/>
              <OptFields seqNum="true" timeStamp="true" dataSet="true" reasonCode="true" dataRef="true" entryID="true" configRef="true"/>
              <RptEnabled max="4"/>
            </ReportControl>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>`,
  },
  {
    id: 'SCL-SCD',
    fileType: 'SCD',
    fileName: 'SAS_132_33_11kV_Substation_Master.scd',
    title: 'Substation Configuration Description (SCD) — Complete Station Master',
    iecClause: 'IEC 61850-6 Clause 9.2 (Substation + Communication + All IEDs + ExtRefs)',
    purpose: 'The master engineering deliverable produced by the System Integrator. Contains the <Substation> single-line voltage/bay hierarchy, full <Communication> multicast GOOSE addressing, and cross-vendor <Inputs><ExtRef> bindings.',
    keyElements: ['<Substation name="HYD_132_33_11KV">', '<VoltageLevel name="132kV">', '<Communication>', '<GSE ldInst="Application" cbName="gcbFeeder03StatusTrip">', '<Inputs><ExtRef>'],
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="SAS_HUB_132_33_11KV_SCD" version="4.2" revision="C" toolID="SAS_Engineering_Hub_SystemConfigurator" nameStructure="IEDName">
    <History>
      <Hitem version="4.2" revision="C" when="2026-11-02T14:35:00Z" who="Senior_SAS_Engineer" what="Validated 132/33/11kV GOOSE ExtRefs, PRP SubNetwork &amp; 50-Signal Catalogue"/>
    </History>
  </Header>
  <Substation name="SAS_132_33_11KV" desc="132/33/11 kV Digital Twin Substation">
    <VoltageLevel name="VL_132kV" nomFreq="50.0" numPhases="3">
      <Voltage unit="V" multiplier="k">132</Voltage>
      <Bay name="BAY_132_L1" desc="LINE-1: 132 kV Incoming Line">
        <ConductingEquipment name="CB_132_L1" type="CBR">
          <LNode iedName="IED_132_L1" ldInst="Application" lnClass="XCBR" lnInst="1"/>
          <LNode iedName="IED_132_L1" ldInst="Application" lnClass="CSWI" lnInst="1"/>
        </ConductingEquipment>
      </Bay>
      <Bay name="BAY_132_T1" desc="Transformer T1 132/33 kV 50 MVA HV Bay">
        <PowerTransformer name="TX_T1" type="PTR">
          <LNode iedName="IED_132_T1" ldInst="FeedProt" lnClass="PDIF" lnInst="1"/>
          <LNode iedName="IED_132_T1" ldInst="System" lnClass="YLTC" lnInst="1"/>
        </PowerTransformer>
      </Bay>
    </VoltageLevel>
    <VoltageLevel name="VL_33kV" nomFreq="50.0" numPhases="3">
      <Voltage unit="V" multiplier="k">33</Voltage>
      <Bay name="BAY_33_INC1" desc="Transformer T1 33 kV Incomer"/>
      <Bay name="BAY_33_BC" desc="33 kV Bus Coupler CB-33"/>
      <Bay name="BAY_33_F03" desc="33 kV Outgoing Feeder 03"/>
    </VoltageLevel>
  </Substation>
  <Communication>
    <SubNetwork name="StationBus_PRP_A_B" type="8-MMS">
      <ConnectedAP iedName="IED_33_F03" apName="P1" redProt="prp">
        <Address>
          <P type="IP">10.132.10.21</P>
          <P type="IP-SUBNET">255.255.255.0</P>
        </Address>
        <GSE ldInst="Application" cbName="gcbFeeder03StatusTrip">
          <Address>
            <P type="MAC-Address">01-0C-CD-01-00-33</P>
            <P type="APPID">0033</P>
            <P type="VLAN-ID">085</P>
            <P type="VLAN-PRIORITY">4</P>
          </Address>
          <MinTime unit="s" multiplier="m">4</MinTime>
          <MaxTime unit="s" multiplier="m">1000</MaxTime>
        </GSE>
      </ConnectedAP>
    </SubNetwork>
  </Communication>
  <IED name="IED_33_INC1" type="7SJ85" manufacturer="Siemens">
    <AccessPoint name="P1">
      <Server>
        <LDevice inst="FeedProt">
          <LN0 lnClass="LLN0" inst="" lnType="Siemens_LLN0_Ed2">
            <Inputs>
              <ExtRef iedName="IED_33_F03" ldInst="FeedProt" lnClass="PTOC" lnInst="1" doName="Str" daName="general" serviceType="GOOSE" srcLDInst="Application" srcCBName="gcbFeeder03StatusTrip" intAddr="FeedProt/PTOC1.Blk_ReverseBusFault"/>
              <ExtRef iedName="IED_132_T1" ldInst="FeedProt" lnClass="PDIF" lnInst="1" doName="Op" daName="general" serviceType="GOOSE" srcLDInst="FeedProt" srcCBName="gcbTx1DiffIntertrip" intAddr="FeedProt/PTRC1.In01_87T_HV_Intertrip"/>
            </Inputs>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>`,
  },
  {
    id: 'SCL-CID',
    fileType: 'CID',
    fileName: 'IED_33_INC1_Configured.cid',
    title: 'Configured IED Description (CID) — Ready for Relay Download',
    iecClause: 'IEC 61850-6 Clause 9.3 (System Configurator → Target Relay)',
    purpose: 'Stripped down from the master SCD for one specific relay (`IED_33_INC1`) containing its own server data model, datasets, BRCBs, GOOSE Control Blocks, and subscribed `<ExtRef>` inputs for flashing to the physical IED.',
    keyElements: ['<ConnectedAP iedName="IED_33_INC1">', '<GSEControl>', '<Inputs><ExtRef>', '<DAI name="ctlModel">'],
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="IED_33_INC1_CID_DEPLOY" version="4.2" toolID="DIGSI5_CID_Compiler" nameStructure="IEDName"/>
  <Communication>
    <SubNetwork name="StationBus_PRP_A_B" type="8-MMS">
      <ConnectedAP iedName="IED_33_INC1" apName="P1" redProt="prp">
        <Address>
          <P type="IP">10.132.10.16</P>
          <P type="IP-SUBNET">255.255.255.0</P>
        </Address>
      </ConnectedAP>
    </SubNetwork>
  </Communication>
  <IED name="IED_33_INC1" desc="Transformer T1 33 kV Incomer Relay" type="7SJ85" manufacturer="Siemens">
    <AccessPoint name="P1">
      <Server>
        <LDevice inst="Application">
          <LN0 lnClass="LLN0" inst="" lnType="Siemens_LLN0_Ed2">
            <GSEControl name="gcbInc1Status" appID="IED_33_INC1Application/LLN0$GO$gcbInc1Status" datSet="dsStatus" confRev="1" type="GOOSE"/>
          </LN0>
          <LN lnClass="CSWI" inst="1" lnType="Siemens_CSWI_SBOw">
            <DOI name="Pos">
              <DAI name="ctlModel">
                <Val>sbo-with-enhanced-security</Val>
              </DAI>
              <DAI name="sboTimeout">
                <Val>15000</Val>
              </DAI>
            </DOI>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>`,
  },
];
