import type { DataModelLesson } from './iec61850Chapter05';

export type Chapter07Diagram = 'architecture' | 'configuration' | 'buffering' | 'mms' | 'triggers' | 'testing';
export interface ReportingLesson extends DataModelLesson { diagram?: Chapter07Diagram; }

// Teaching fragment only. A deployable SCL document requires the applicable
// schema, surrounding IED/server configuration, instantiated LNs and data types.
export const REPORTING_SCL_EXAMPLE = `<LN0 lnClass="LLN0" inst="" lnType="ExampleLLN0">
  <DataSet name="dsStatus" desc="Illustrative feeder status">
    <FCDA ldInst="LD0" lnClass="XCBR" lnInst="1"
          doName="Pos" fc="ST" />
    <FCDA ldInst="LD0" lnClass="PTOC" lnInst="1"
          doName="Op" fc="ST" />
  </DataSet>
  <ReportControl name="brcbStatus" rptID="33F01_Status"
      datSet="dsStatus" confRev="1" buffered="true"
      indexed="true" bufTime="50" intgPd="60000">
    <TrgOps dchg="true" qchg="true" dupd="false"
            period="true" gi="true" />
    <OptFields seqNum="true" timeStamp="true"
        dataSet="true" reasonCode="true" dataRef="true"
        entryID="true" configRef="true" bufOvfl="true" />
    <RptEnabled max="2" />
  </ReportControl>
</LN0>`;

export const REPORTING_LESSONS: ReportingLesson[] = [
  {
    title: 'Introduction to IEC 61850 DataSets',
    diagram: 'architecture',
    paragraphs: [
      'An IEC 61850 DataSet is an ordered collection of references to modeled information. Its members identify the data that a service can read, report or publish. The members refer to information already present in the server model; creating a DataSet does not create new protection functions or new physical measurements. A member can select a functionally constrained data object or a particular data attribute, subject to the supported service and implementation.',
      'A DataSet is passive configuration. It does not automatically transmit when a value changes. Reporting requires a configured Report Control Block, appropriate triggers and a functioning client/server reporting arrangement. GOOSE requires its own GOOSE control block and publisher configuration. These services may use the DataSet concept, but their transport, delivery behavior and engineering rules differ.',
      'For reporting, think of the DataSet as the ordered content definition and the RCB as the reporting controller. The RCB refers to a DataSet through DatSet and controls when and how reports are produced. SCADA must interpret the received member values using the correct order, structure and configuration revision, not only a convenient tag label.'
    ],
    example: 'For feeder 33-F01, an engineer selects breaker position and overcurrent operation for a status DataSet. A BRCB references that collection and reports relevant changes to the station HMI. The relay continues to perform its protection function independently of whether the HMI subscribes to those reports.',
    check: 'Locate the DataSet and its ordered members online, then locate the service control block that actually uses it. A visible DataSet alone is not evidence of live reporting.'
  },
  {
    title: 'Why DataSets Are Required',
    paragraphs: [
      'DataSets provide a reusable, structured selection of application information. Instead of configuring an unrelated transaction for every point, an engineer can group signals according to purpose, update behavior and consumer requirements. Reporting can then identify which configured members are included in a particular event report, while an integrity or GI report can provide the whole collection.',
      'Grouping is an engineering decision. Fast-changing measurements and occasional status changes may benefit from different DataSets and report settings. Very large collections consume server resources, increase payloads and can require segmentation. Excessively fragmented collections can consume scarce RCB instances and complicate client management. Supported member counts and report sizes must be checked in the device and client documentation.',
      'A reporting DataSet supplies a client/server report service. A GOOSE DataSet supplies a publisher/subscriber exchange controlled by a GOOSE control block, with its own state-change and retransmission behavior. Sharing the same members between services, where permitted, does not make the services interchangeable or guarantee that one configuration is appropriate for both. RptEna does not enable GOOSE, and a GOOSE retransmission is not a buffered MMS report.'
    ],
    table: { headers: ['Aspect', 'Reporting DataSet', 'GOOSE DataSet'], rows: [ ['Associated controller', 'BRCB or URCB', 'GOOSE control block'], ['Typical consumer', 'Associated SCADA/gateway client', 'Configured subscribing IEDs'], ['Delivery concept', 'MMS reports and reporting triggers', 'Publisher state and retransmission behavior'], ['Recovery meaning', 'BRCB retained-entry recovery where eligible', 'Current publisher state; not BRCB event-history replay'] ] },
    example: 'Use a reporting collection for 33-F01 breaker status and operator alarms, and separately engineer any protection/interlocking GOOSE exchange. Even if both contain a trip indication, their performance criteria, receiver configuration and failure tests remain different.',
    check: 'Document each DataSet’s consumers and services. Confirm capacity, update rates and payload structure rather than grouping every available point into one collection.'
  },
  {
    title: 'Functional Constraint Data Attributes (FCDA)',
    paragraphs: [
      'The usual expansion of FCDA is functionally constrained data attribute. It identifies an attribute together with its Functional Constraint. ST groups status information, MX measurements and other constraints distinguish roles such as configuration or control. FC is part of the selection semantics; it is not another piece of physical equipment and does not grant access permission.',
      'In SCL, the element named FCDA can describe an attribute-level selection or an object-level functionally constrained data selection. An element with doName and fc but no daName selects the relevant object information for that FC. Supplying daName selects the specified attribute. The resulting received value may therefore be a structure or a scalar, and the client must decode the actual member type.',
      'Selecting XCBR1.Pos with ST commonly provides a status structure containing stVal, q and t, plus any other applicable members in that structure. Selecting Pos.stVal alone does not automatically include its sibling quality and timestamp. Even if stVal, q and t are three separate DataSet members, an event report may include only members selected by its inclusion rules. Do not assume an unchanged q or a non-triggering t is automatically carried alongside a changed scalar.'
    ],
    code: '<!-- Illustrative object-level selection: FCD -->\n<FCDA ldInst="LD0" lnClass="XCBR" lnInst="1"\n      doName="Pos" fc="ST" />\n\n<!-- Alternative scalar selection: FCDA -->\n<FCDA ldInst="LD0" lnClass="XCBR" lnInst="1"\n      doName="Pos" daName="stVal" fc="ST" />',
    example: 'For reliable breaker-event interpretation, inspect whether the client receives an entire Pos[ST] structure or separate scalar members. Verify how it obtains the source timestamp for each position event, rather than relying on the fact that a t member exists somewhere in the DataSet.',
    check: 'Verify LD instance, LN prefix/class/instance, DO, DA when present, FC and decoded member structure. Inspect actual reports to confirm value, quality and timestamp coverage.'
  },
  {
    title: 'DataSet Structure and Naming',
    paragraphs: [
      'A DataSet has a name within its owning logical-node context and an ordered membership list. LLN0 is a common location, but do not hard-code it as the only possible location. The references and permitted scope depend on the service and implementation. Reordering members can break a consumer that uses positional mapping even when all the same signals remain present.',
      'This chapter uses an illustrative physical IED name IED_33_F01 and an LD instance LD0, assuming the exposed LD name is IED_33_F01LD0. The readable DataSet reference is IED_33_F01LD0/LLN0.dsStatus. A mapped MMS/client representation may use LLN0$dsStatus or a domain plus item name. Use the notation expected by the particular client API; do not mix them blindly.',
      'The SCL name, runtime reference and HMI tag are related but different identifiers. An SCL FCDA uses ldInst="LD0" to identify the LD instance rather than inserting the entire exposed LD name. Prefixes and LN instances must match the engineered model. Association-specific or dynamically created DataSets have additional lifecycle and service restrictions; they must not be assumed suitable for buffered recovery.'
    ],
    code: 'Illustrative engineering context:\nIED name:         IED_33_F01\nLD instance:      LD0\nExposed LD name:  IED_33_F01LD0 (assumed naming)\nOwning LN:        LLN0\nDataSet name:     dsStatus\nReadable reference: IED_33_F01LD0/LLN0.dsStatus\nExample mapped form: IED_33_F01LD0/LLN0$dsStatus\n\nConfirm every name and the client’s required syntax online.',
    example: 'A client imports member 0 as breaker position and member 1 as protection operation. If engineering reverses those members, a positional decoder may misinterpret them. Configuration revision and type checks should expose the mismatch before the HMI uses the data.',
    check: 'Export and compare ordered membership, not just the DataSet name. Preserve a versioned mapping sheet and verify the associated RCB’s ConfRev after engineering changes.'
  },
  {
    title: 'DataSet Configuration in Protection IEDs',
    diagram: 'configuration',
    paragraphs: [
      'Start from the approved signal list and the actual device capabilities. Identify the physical/application source, LN instance, DO/DA, FC and required quality/time behavior for each point. Choose status and measurement groupings that fit the reporting and client requirements. Confirm the supported number of DataSets, members and RCB instances before configuring the collection.',
      'In an engineering tool, select the owning logical node, create a meaningful DataSet name and add the required members in a documented order. Inspect the exported SCL to confirm that the tool selected an object-level FCD or an individual FCDA as intended. A visual tree selection is not sufficient evidence of the resulting payload structure.',
      'Next assign the collection to a compatible RCB, configure supported trigger/optional-field choices and engineer client allocation. Static and dynamic configuration capabilities differ between products. Follow the vendor workflow for validation, export, deployment and restart requirements; editing an SCD file on a workstation does not itself update the running IED.',
      'After deployment, compare the live directory, membership and RCB configuration with the accepted engineering output. A device can still serve an earlier configuration while the latest file on the laptop looks correct. Maintain revision control through the IED tool, system configuration and client import stages.'
    ],
    example: 'The illustrative interface selects XCBR1.Pos[ST] and PTOC1.Op[ST] into dsStatus. Both are object-level selections represented with SCL FCDA elements. The illustration is a teaching interface, not a screenshot or click-by-click procedure for a particular manufacturer.',
    check: 'Verify the resulting SCL, live member order, supported member types and value/q/t delivery. Record the deployed IED configuration identity and the matching client import revision.'
  },
  {
    title: 'Introduction to Report Control Blocks',
    paragraphs: [
      'A Report Control Block controls reporting for an associated DataSet. IEC 61850-7-2 defines the abstract service behavior, IEC 61850-6 represents engineering configuration, and IEC 61850-8-1 maps the relevant communication to MMS. A report is information sent by the server over the client association after the reporting arrangement has been established; it is not simply a periodic sequence of client reads.',
      'The RCB identifies its DataSet through DatSet, reports a configuration revision through ConfRev and uses TrgOps to select supported triggering conditions. OptFlds controls optional report metadata. RptEna enables transmission for the client arrangement. RptID identifies the report stream, while other attributes govern timing, reservation and buffered recovery as applicable.',
      'BufTm is an event-coalescing interval, conventionally represented in milliseconds. It allows eligible events occurring close together to be assembled according to the report rules. It is not the amount of historical outage storage and does not define how long a BRCB can retain events. Repeated changes, service rules and implementation details can affect report assembly; do not assume every event experiences one exact fixed delay.',
      'A report can contain only a subset of the DataSet. Its inclusion bitstring identifies included member positions, and optional reason information explains why members were included. Large reports may require segmentation, which the client must reassemble correctly. A visible RCB is therefore only the starting point for end-to-end reporting verification.'
    ],
    table: { headers: ['Attribute', 'Purpose', 'Engineering check'], rows: [ ['RptEna / RptID', 'Enable reporting / identify the stream', 'Correct client and report identity'], ['DatSet / ConfRev', 'Content reference / configuration revision', 'Expected membership, order and types'], ['TrgOps / OptFlds', 'Triggers / optional report metadata', 'Server and client support'], ['BufTm / IntgPd', 'Event coalescing / integrity interval', 'Milliseconds; different functions'], ['GI', 'Request a general-interrogation report', 'Supported, enabled reporting arrangement'] ] },
    example: 'For 33-F01, a correctly configured dsStatus remains silent if the client has not enabled the appropriate RCB, or if no configured trigger occurs. Reading the same values directly can still work, so successful reads alone do not prove reporting.',
    check: 'Inspect the runtime RCB values, its association/ownership and actual MMS reports. Separate content-selection, trigger, transport and client-decoding failures.'
  },
  {
    title: 'Buffered Report Control Block (BRCB)',
    paragraphs: [
      'A BRCB supports retention of report entries so eligible information can be delivered after an interruption. The buffer is finite. Retention depends on the server’s supported buffering state, valid configuration, available capacity and lifecycle behavior. Merely creating an RCB in SCL does not establish unlimited history or prove that every event before client initialization is retained.',
      'After an association loss, the client must reconnect, regain access to the intended instance and perform the supported resynchronization/enable sequence. EntryID is an opaque identifier for a buffered entry and can be used to resume after a retained entry. It is not a timestamp, member index or counter that the client should invent. Persist the last accepted report identifier according to the client design and validate the server’s response during recovery.',
      'If entries have been overwritten, purged or lost during a device restart, complete replay may be impossible. BufOvfl, when included in reports, indicates relevant buffer-loss conditions; the client must expose the resulting gap. A current-state refresh can recover present values but cannot reconstruct every transition that happened during the gap. Reconfiguration and explicit PurgeBuf operations can discard entries, so routine reconnect code must avoid unnecessary writes that affect retained history.',
      'TimeOfEntry relates to the report handler’s entry time and the EntryID exposed by the BRCB. It is distinct from each data object’s t and from packet arrival time. Buffer survival across power loss and detailed capacity limits are implementation properties that require documentation and testing, not assumptions from the word “buffered.”'
    ],
    example: 'Initialize the 33-F01 BRCB, confirm reporting, disconnect the test client, produce a known sequence of position changes and reconnect using the client’s supported recovery method. Compare the recovered entries with the test sequence and inspect overflow/gap indications.',
    check: 'Verify initialized buffering, capacity limits, EntryID handling, reservation after disconnect, overflow and restart behavior. Do not claim lossless recovery unless the tested conditions and retention evidence support it.'
  },
  {
    title: 'Unbuffered Report Control Block (URCB)',
    paragraphs: [
      'A URCB provides event-driven reporting to its active client without a retained event queue for later replay after disconnection. While the reporting association is active and enabled, it can deliver the configured change reports. It can also support integrity and GI reporting according to the device’s services and configuration.',
      'When the association is lost, the client must establish the reporting arrangement again. Events that occurred during the disconnected interval are not recovered as a historical URCB sequence. A subsequent read or GI can establish current values, but a point that changed twice and returned to its original state cannot have its missing transitions reconstructed from that snapshot.',
      'The lack of a historical replay queue does not mean every report is instantaneous or that BufTm has no role. URCBs can still use the configured event-coalescing behavior. Distinguish report assembly from retained outage storage. Reservation and enablement use the appropriate unbuffered service model, commonly involving Resv where supported.',
      'URCB suitability depends on the application’s tolerance for missing transitions and its separate event-recording arrangements. It can be appropriate for some monitoring uses, but should not be selected solely because its initial connection appears simpler. The client must clearly mark communication loss and avoid presenting the last received value as freshly confirmed.'
    ],
    example: 'If a training alarm turns on and then off while a URCB client is disconnected, a later GI may show only the current off state. The station cannot infer the alarm’s occurrence or duration from that one value.',
    check: 'Test normal event delivery, loss of association, re-enablement and current-state refresh. Confirm that the HMI does not claim historical completeness for the disconnected interval.'
  },
  {
    title: 'BRCB vs URCB — Detailed Comparison',
    diagram: 'buffering',
    paragraphs: [
      'BRCB and URCB both report configured DataSet information to a client; the key distinction is retained-entry recovery. A BRCB offers a mechanism to recover eligible buffered entries, whereas a URCB does not keep an outage replay queue. Neither choice removes the need to configure triggers, client access, member interpretation and quality handling.',
      'Buffered reporting introduces additional engineering responsibilities: capacity assessment, EntryID persistence and resynchronization, overflow awareness, buffer lifecycle and reservation behavior. The recovery requirement should define the expected outage duration and event rate, then verify the implementation under that load. A vendor buffer expressed in bytes cannot be translated into a fixed number of events without knowing report sizes and storage behavior.',
      'A client may still need a current-state synchronization strategy after either type reconnects. That strategy must coexist with BRCB recovery and event ordering rather than accidentally purging history or treating a GI snapshot as a replayed event. Select the service based on operational requirements and supported interoperability, not a belief that buffered means permanent archival storage.'
    ],
    table: { headers: ['Property', 'BRCB', 'URCB'], rows: [ ['Active reporting', 'Configured events and supported snapshots', 'Configured events and supported snapshots'], ['Disconnected events', 'Eligible entries retained within limits', 'No retained queue for later replay'], ['Recovery identifier', 'EntryID where used by recovery', 'No BRCB EntryID replay mechanism'], ['Capacity concern', 'Finite buffer; overflow and purge matter', 'No outage-history buffer to recover'], ['Reservation', 'ResvTms/ownership where supported', 'Resv/association behavior where supported'], ['BufTm', 'Event coalescing; not retention duration', 'Event coalescing; not replay storage'], ['After recovery gap', 'Flag gap and restore current state', 'Restore current state; missed history unavailable'] ] },
    example: 'Run the same known event sequence during a disconnection against separate test BRCB and URCB instances. Compare recovered events, the current-state refresh and HMI gap indications. Use the result to validate the client design rather than merely noting that both clients reconnect.',
    check: 'Document the tested buffer limits, reconnect procedure and information-loss policy. Retain evidence for the expected failure duration and event load.'
  },
  {
    title: 'Report Trigger Options — dchg, qchg, dupd',
    diagram: 'triggers',
    paragraphs: [
      'TrgOps selects the reporting trigger conditions the RCB uses. dchg concerns data-change notifications, such as an eligible status transition. qchg concerns quality-change notifications, which can matter even when the numerical or status value is unchanged. The attribute’s defined trigger capability and the RCB’s enabled trigger must both be considered.',
      'dupd concerns a supported data-update notification and can cause reporting without a change in the value. It is not a command to poll every attribute continuously, and enabling it does not manufacture update events for attributes that do not provide that trigger behavior. Verify the CDC/model trigger properties and the device’s supported implementation.',
      'Measurement change detection may involve deadband behavior defined by the data model and configuration. Small input variations do not necessarily cause a report for every sample. A large dchg threshold, an absent qchg selection or an unsupported dupd expectation can all produce “missing report” symptoms for different reasons.',
      'Event reports often carry a subset of members. Optional reason-for-inclusion information distinguishes a data change from quality change, data update, integrity or GI. Multiple eligible reasons may apply. Decode the included member positions and reasons rather than assuming every received report is a new process event.'
    ],
    table: { headers: ['Trigger', 'Illustrative stimulus', 'What to verify'], rows: [ ['dchg', 'Breaker changes closed → open', 'Correct eligible value change and member inclusion'], ['qchg', 'Position quality changes while stVal stays fixed', 'Quality event reaches client and HMI'], ['dupd', 'Supported source updates the same value', 'Attribute supports update notification; reason decoded'], ['Integrity', 'Server integrity interval expires', 'Whole-DataSet snapshot behavior'], ['GI', 'Client requests interrogation', 'Whole-DataSet response; not a recovered event history'] ] },
    example: 'For 33-F01, test one position change and one quality-only change separately. Confirm that the client reports their different causes. Use a specifically supported test attribute for dupd rather than repeatedly reading a normal status point and expecting an update report.',
    check: 'Compare model trigger properties, runtime TrgOps and the report’s reason fields. Verify measurement deadbands before treating quiet traffic as a communications failure.'
  },
  {
    title: 'Integrity Period and General Interrogation',
    paragraphs: [
      'Integrity reporting provides a periodic report of the DataSet’s current information when the integrity trigger and interval are configured. IntgPd is the integrity period, conventionally represented in milliseconds. It is a server reporting timer, not a requirement for the client to poll each point. An interval value of zero disables the periodic integrity timer; a useful nonzero interval still needs the corresponding trigger/service configuration.',
      'General Interrogation requests a current DataSet report through the GI mechanism when supported and permitted by the enabled reporting arrangement. It is commonly used to establish a known current view, but it does not ask the server to invent missed historical events. The request has defined service behavior rather than acting as a permanently latched “send everything” mode.',
      'Integrity and GI select the whole DataSet rather than only members that triggered a change. A large snapshot may be segmented. The included information is a reported view of the collection; do not automatically treat all member source timestamps as equal or assume that the entire physical process was sampled atomically at one instant.',
      'Choose intervals with traffic and operator requirements in mind. A short period applied to many large DataSets can dominate bandwidth and client processing. A long period is not an acceptable substitute for correctly configured event triggers where prompt indications are required. Reconnection logic must coordinate snapshots with buffered replay and gap detection.'
    ],
    example: 'An illustrative IntgPd of 60000 ms produces a nominal one-minute integrity cycle when enabled. A separate GI test requests a snapshot immediately through the client workflow. These values are training settings, not universal defaults or timing guarantees.',
    check: 'Verify integrity enablement and interval, GI response, member completeness, segmentation and reason codes. Confirm that event logs distinguish snapshots from newly occurring process events.'
  },
  {
    title: 'Report Optional Fields',
    paragraphs: [
      'OptFlds selects additional metadata in reports. The best choices depend on the service, edition, server and client requirements. Optional does not mean operationally unimportant: a client may require particular fields for mapping, recovery or diagnostics. Confirm support and compatibility instead of enabling a copied bitmask from another product.',
      'SqNum helps follow a report sequence, but it can wrap or reset according to the service lifecycle. It is not a globally unique event identifier. ConfRev identifies the relevant configuration revision and helps detect a mismatched content definition. DataSet name and data references can make decoding more explicit, while reason-for-inclusion explains why a member was sent.',
      'For buffered reporting, EntryID and buffer-overflow information support recovery and loss detection. Report time relates to report-entry formation; each data object’s t describes its own modeled event/update. They are different clocks in the information chain. TimeOfEntry is a BRCB attribute; do not infer that a URCB exposes the same control-block attribute merely because a report can carry timestamp metadata.',
      'The inclusion bitstring is fundamental to interpreting a partial report and is not a user-selected substitute for a known DataSet. If a report is segmented, sequence/subsequence and continuation information must be handled by the client as required. The application should use the reassembled report, not mistakenly treat every fragment as a complete snapshot.'
    ],
    table: { headers: ['Field', 'Purpose', 'Common mistake'], rows: [ ['SqNum', 'Report sequence tracking', 'Treating it as a permanent unique event ID'], ['Reason for inclusion', 'dchg/qchg/dupd/integrity/GI context', 'Logging every snapshot as a new alarm'], ['DataSet / data reference', 'Identify content and members', 'Using old member order after a change'], ['ConfRev', 'Configuration revision', 'Ignoring mismatch with client mapping'], ['EntryID / BufOvfl', 'Buffered recovery / lost-entry indication', 'Assuming all disconnected events survived'], ['Report timestamp', 'Report-entry timing', 'Replacing each source data timestamp'], ['Segmentation fields', 'Reassemble large reports', 'Processing one segment as the complete DataSet'] ] },
    example: 'A recovered BRCB report has a later network arrival time than its entry time and its source event timestamp. Retain these distinctions when reconstructing the 33-F01 event sequence. A correct breaker symbol alone does not validate the event log.',
    check: 'Match required optional fields with the client manual. Inspect a change report, a snapshot and a recovered/segmented report where supported, and verify metadata decoding.'
  },
  {
    title: 'Report Enable, Reservation and Client Association',
    paragraphs: [
      'MMS reporting operates within an established client/server association. The client must gain appropriate access to an RCB instance, verify its settings and enable reporting with RptEna. RptEna is a service state, not a physical input or a universal instruction to start every reporting instance in the IED.',
      'Reservation prevents competing clients from reconfiguring or taking over the same instance improperly. URCBs commonly use Resv, while BRCBs can expose ResvTms according to supported edition and implementation. A positive ResvTms value represents a reservation period associated with recovery after association loss, in seconds; zero indicates no reservation and a configured -1 value has a predefined reservation meaning. Do not assume the field exists on every device or write a negative value as a generic takeover technique.',
      'Read the existing state and ownership first. Make only supported, necessary configuration changes while the RCB is in the required state, then enable it and read back the result. Many reporting configuration attributes cannot be changed while enabled. Some changes can purge buffered entries, so repeatedly rewriting a saved configuration during reconnect can undermine recovery.',
      'A communication connection, successful reservation and successful enable operation are separate outcomes. A maintenance browser can unintentionally occupy an RCB needed by SCADA. Ownership and authorization must therefore be coordinated through the engineering plan rather than solved by forcibly clearing another client’s reporting arrangement.'
    ],
    example: 'SCADA A reconnects before its BRCB reservation expires and resumes using its configured instance. If SCADA B tries to reserve that same instance, rejection may be correct behavior. Inspect ownership and the intended client allocation before declaring the IED faulty.',
    check: 'Verify association, supported reservation mechanism, ownership, RptEna response/readback and disconnect/reconnect behavior. Keep ResvTms seconds distinct from BufTm and IntgPd milliseconds.'
  },
  {
    title: 'RCB Instances and Multiple SCADA Clients',
    paragraphs: [
      'Each independently reporting client needs an appropriate reporting arrangement and available RCB instance. Two clients cannot be assumed to independently control the same enabled instance. One DataSet can be referenced by multiple supported RCB instances, allowing the same information to be delivered through separately managed client streams.',
      'SCL ReportControl configuration and RptEnabled capacity describe engineered reporting resources. With indexed reporting, engineering tools commonly create instance-specific names. The exact suffix, naming and available instance count must be verified online. Setting max="2" in a teaching fragment does not prove that the target product supports two additional active clients or sufficient memory for their buffered traffic.',
      'A station may have an HMI, redundant gateways and an engineering client. Allocate their reporting instances and recovery responsibilities explicitly. Redundant systems may use independent instances or a supported coordinated failover arrangement; they should not compete blindly for the same reservation. Confirm how the client software persists EntryID and handles duplicate or late events across failover.',
      'Resource planning also includes association limits, report bandwidth, event rates and buffer allocation. Multiple clients receiving the same point increase traffic and can increase storage requirements. A quiet laboratory test with one client does not demonstrate capacity for the complete station configuration.'
    ],
    table: { headers: ['Illustrative consumer', 'Assigned instance', 'Verification'], rows: [ ['Station HMI A', 'brcbStatus01', 'Enablement, recovery and HMI mapping'], ['Gateway B', 'brcbStatus02', 'Independent reservation and report stream'], ['Engineering browser', 'Separate authorized resource if available', 'Does not take over production client instance'] ] },
    example: 'For 33-F01, both HMI and gateway require status information. They reference the same dsStatus through separate supported RCB instances. During FAT, disconnect each client independently and confirm that the other stream continues and the returning client follows its own recovery procedure.',
    check: 'Inventory all clients and RCB instances. Test simultaneous operation, failover, reservation expiry and reconnect load using the actual supported allocation.'
  },
  {
    title: 'DataSet and RCB Configuration Using SCL Files',
    paragraphs: [
      'IEC 61850-6 provides SCL elements describing DataSets and report controls. The fragment below is intended to sit within a properly defined IED/server/LD model, here assumed to use IED name IED_33_F01 and LDevice inst="LD0". ExampleLLN0, XCBR1 and PTOC1 must exist with compatible type definitions in the full document. This is a teaching fragment, not a ready-to-import complete SCD or CID.',
      'Both FCDA members omit daName, selecting the objects’ ST information rather than only a single leaf. ReportControl datSet="dsStatus" binds the report control to that local DataSet name. buffered="true" chooses a BRCB configuration. The example confRev is an initial illustration; the engineering workflow and server must manage revision changes correctly. Do not manually force a revision merely to conceal a client mismatch.',
      'SCL spelling differs from runtime terminology: bufTime maps to BufTm, intgPd to IntgPd, TrgOps period selects integrity reporting, and OptFields configRef requests configuration-revision information. The configured 50 ms buffer time and 60000 ms integrity period are illustrative values. Runtime writable fields, ranges and constraints must be checked with the actual device.',
      'RptEnabled max="2" illustrates capacity for two indexed instances where supported; it is not a declaration that two clients are already connected or that RptEna is true. The complete system may also engineer ClientLN associations. Validate the full document against the project’s SCL schema and vendor tools, deploy through the approved workflow and compare the live directory afterward.'
    ],
    code: REPORTING_SCL_EXAMPLE,
    example: 'After importing the final configuration, browse the live DataSet, verify XCBR1.Pos[ST] and PTOC1.Op[ST] in that order, identify the actual generated RCB instance names and read ConfRev. Then configure each client using the deployed values rather than guessed suffixes.',
    check: 'Validate the full SCL schema/type references and vendor capability limits. Verify the deployed model and runtime service behavior; well-formed XML alone does not establish valid or working IED configuration.'
  },
  {
    title: 'MMS Reporting Communication Flow',
    diagram: 'mms',
    paragraphs: [
      'The server updates its modeled information from the IED application. The selected DataSet members identify the relevant information, and the RCB evaluates configured reporting conditions. Eligible notifications are assembled according to the service rules, including event coalescing, member inclusion and buffering where applicable. The resulting report travels over the established MMS client/server association.',
      'Under the commonly used IEC 61850-8-1 TCP/IP mapping, MMS uses the ISO communication stack over TCP, commonly on port 102. A working Ethernet link or reachable IP address is only a prerequisite. Association negotiation, access permissions, RCB ownership, enablement, triggers and client handling must also be correct. Reporting is not a GOOSE multicast exchange.',
      'MMS reports are InformationReport messages sent by the server; the client does not issue a separate read for each event. Transport reliability helps deliver bytes within a live connection but does not establish unlimited report history, successful HMI processing or correct application mapping. BRCB recovery addresses eligible retained entries after interruption through its own service mechanism.',
      'For diagnostics, inspect the actual association and report traffic using an authorized capture method. A switched network may require an appropriate mirrored port or tap; the engineering laptop will not necessarily see other devices’ unicast traffic by merely sharing the station switch. Protected traffic may require approved endpoint diagnostics instead of readable packet payloads.'
    ],
    example: 'For 33-F01, follow one simulated breaker transition through the IED value, report creation, station-bus capture, client receive log and HMI event. This distinguishes a missing source update from a disabled RCB, a transport problem or an incorrect display mapping.',
    check: 'Verify the source value, MMS association, actual report contents and client result. Inspect inclusion bits, reason codes, sequence/revision and source time rather than relying only on packet counts.'
  },
  {
    title: 'Practical Example — 33 kV Feeder Breaker Status',
    paragraphs: [
      'Use feeder 33-F01 with an illustrative exposed LD name IED_33_F01LD0 and breaker LN XCBR1. The physical breaker moves from closed to open. Its auxiliary contacts change the IED’s digital-input states, and the configured input logic updates XCBR1.Pos. The double-point stVal is interpreted with its quality q and data timestamp t; open/closed, intermediate and bad-state meanings must match the project.',
      'The reporting DataSet includes the required position information, preferably an appropriate object-level ST structure when supported by the client design. A configured, enabled RCB evaluates the eligible dchg notification and applies its report assembly rules. The server sends the MMS report to the associated SCADA client. No report should be expected solely because the DataSet exists.',
      'SCADA decodes the included member against the correct DataSet structure and ConfRev, updates the breaker symbol and records the source event time and quality. Alarms follow the configured project logic: a normal commanded opening may be an event without being a fault alarm. Invalid position, unexpected operation or stale communication can have separate alarm policies.',
      'If only a scalar stVal is selected, explicitly verify how source quality and time accompany each event. A report-level timestamp is not an automatic replacement for Pos.t. During a disconnect, distinguish BRCB replay of retained transitions from a current-state GI snapshot. A closed-to-open-to-closed sequence can be invisible in a final snapshot alone.'
    ],
    code: 'Illustrative source references, FC ST:\nIED_33_F01LD0/XCBR1.Pos.stVal\nIED_33_F01LD0/XCBR1.Pos.q\nIED_33_F01LD0/XCBR1.Pos.t\n\nReporting DataSet: IED_33_F01LD0/LLN0.dsStatus\nIllustrative MMS BRCB item: LLN0$BR$brcbStatus01\nMMS domain: IED_33_F01LD0\n\nThe actual exposed names and client address syntax must be browsed.',
    example: 'FAT sequence: set a simulated closed input → confirm model and HMI → change auxiliary-input simulation to open → inspect Pos value/q/t → capture the resulting report → compare the HMI symbol and event record. Repeat for quality-only change and a known disconnect/reconnect sequence.',
    check: 'Record evidence at all seven stages: breaker condition, auxiliary inputs, model update, DataSet member, RCB trigger, MMS report and SCADA result. Do not infer mechanical position from a command or trip indication alone.'
  },
  {
    title: 'Practical Example — Protection Trip and Alarm Reporting',
    paragraphs: [
      'Protection reporting describes events produced by the configured protection application. PTOC.Str, PTOC.Op and PTRC.Tr represent different stages: start, protection operation and trip conditioning. Their structured data can include general and phase components according to the actual model. Reporting them does not implement the trip scheme or establish the physical breaker’s position.',
      'A protection/alarm DataSet can select the required ST structures and quality/time information. Different events may be assembled into one report or separate reports depending on timing and BufTm rules. Use each source timestamp and the defined signal semantics to analyze the sequence; report order or one common entry time alone may not capture the exact protection chronology.',
      'A trip is often followed by breaker feedback and alarm processing. Keep command output, protection indication, position confirmation and operator alarm distinct in the mapping sheet. A buffered report arriving late after reconnect should retain its historical meaning rather than being presented as a newly occurring live fault solely because its network arrival time is recent.',
      'Alarm latching, acknowledgment and reset are application functions. An RCB does not automatically retain an HMI alarm acknowledgment or reset the relay’s protection latch. Likewise, repeated integrity/GI snapshots of an asserted trip should not create a fresh alarm occurrence every time. The client needs defined state and event handling.'
    ],
    code: 'Illustrative members for a separately engineered dsProtection:\nPTOC1.Str [ST]  — protection start structure\nPTOC1.Op  [ST]  — protection operation structure\nPTRC1.Tr  [ST]  — trip-conditioning structure\nXCBR1.Pos [ST]  — independent breaker feedback\n\nExample full attribute: IED_33_F01LD0/PTRC1.Tr.general [ST]\nConfirm actual prefixes, instances, CDCs and supported components.',
    example: 'An isolated test produces pickup, delayed overcurrent operation, conditioned trip and simulated breaker opening. Compare test-equipment timing, relay event records, reported source timestamps and the HMI log. Repeat with reporting interrupted while ensuring the protection test remains governed by the approved scheme.',
    check: 'Validate start/operate/trip labels, phase/general mapping, q/t delivery, delayed replay, duplicate handling and reset behavior. Protection execution must not depend on SCADA report receipt.'
  },
  {
    title: 'FAT/SAT Testing of DataSets and RCBs',
    diagram: 'testing',
    paragraphs: [
      'FAT verifies the engineered model and reporting behavior in a controlled environment before installation. Start with the IED firmware/configuration identity, SCL revision, client version and approved signal list. Confirm DataSet order and member types, assigned RCB instances, optional fields and client mappings. Record expected results before applying stimuli.',
      'Exercise value changes, quality-only changes, supported data updates, integrity and GI separately. Verify member inclusion, reason codes, source timestamps, report metadata and HMI results. Test structured values and segmentation where relevant. Include negative conditions such as an unavailable RCB instance, invalid reference or unsupported setting without disturbing other clients.',
      'For BRCB recovery, initialize reporting, disconnect the designated test client and generate a known event sequence within the expected retention envelope. Reconnect and compare retained entries and current state. A separate controlled capacity test checks overflow/gap handling. Do not deliberately flood a live operational IED or purge its buffer merely to demonstrate an overflow condition.',
      'SAT confirms the installed configuration, network paths, client allocations, time synchronization and actual field-to-model associations. Apply the site’s isolation and authorization procedure for input simulation and any active equipment tests. After restoration, verify the as-left reporting settings and normal client associations; a temporary engineering client must not remain in possession of production RCBs.'
    ],
    table: { headers: ['Test', 'Stimulus', 'Required evidence'], rows: [ ['Member mapping', 'Known source state per point', 'Correct reference, type, value, q/t and HMI'], ['Trigger behavior', 'dchg, qchg, supported dupd separately', 'Correct reason and included members'], ['Snapshots', 'Integrity interval and GI request', 'Complete current DataSet; proper event handling'], ['Buffered recovery', 'Known sequence during controlled disconnect', 'EntryID recovery, retained events and gap status'], ['Overflow/restart', 'Approved isolated capacity/lifecycle test', 'Documented loss indication and current-state recovery'], ['Multiple clients', 'Independent client disconnect/failover', 'No unintended takeover or impact on other streams'], ['Timing', 'Known event time and synchronization condition', 'Source t, report time and arrival time distinguished'] ] },
    example: 'The acceptance sheet for 33-F01 records the stimulus, model value, RCB identity, report metadata, HMI result and pass/fail evidence for every point. A screenshot of an open breaker is insufficient to prove quality, source time and recovery behavior.',
    check: 'Retain configuration exports, decoded captures or logs, timing evidence and signed results. Restore normal settings and verify that all intended clients are reporting after the test.'
  },
  {
    title: 'Troubleshooting and Interview Questions',
    paragraphs: [
      'Troubleshoot from source to display: physical/application update → model → DataSet → RCB → association/transport → client decoding → HMI. Establish the first point of disagreement. If a direct read is correct but reporting is silent, inspect member selection, trigger eligibility, RptEna and client ownership before changing the physical wiring or rewriting the entire SCL.',
      'After a configuration change, compare the deployed member order/types and ConfRev with the client import. A report with valid transport can still be interpreted incorrectly by stale application mapping. During reconnect failures, inspect the requested instance, reservation state, retained EntryID availability and any configuration writes that may have purged the buffer.',
      'Interview question: “Does a DataSet send data by itself?” No; a service uses it. “Does BufTm define outage retention?” No; it concerns event assembly. “Does GI recover missed history?” No; it requests a current snapshot. “Does BRCB guarantee every event survives a long outage or restart?” No; capacity, state, retention and recovery conditions must be evaluated.',
      'Further questions: “Can a qchg report occur with unchanged stVal?” Yes, when the modeled notification and RCB trigger apply. “Why can two SCADA clients conflict?” They may be competing for one RCB instance or reservation. “Why compare source t with report time?” They describe different stages. Strong answers connect the standard concepts to actual model inspection and test evidence.'
    ],
    table: { headers: ['Symptom', 'First checks', 'Next verification'], rows: [ ['DataSet exists; no reports', 'RCB binding, RptEna, ownership and TrgOps', 'Generate an eligible test event and inspect traffic'], ['Only some signals update', 'Member order/type/FC and inclusion reasons', 'Compare full runtime DataSet with client mapping'], ['Quality changes invisible', 'q member/structure and qchg configuration', 'Test unchanged value with changed quality'], ['Reconnection loses events', 'Buffer capacity/state, purge, EntryID and reservation', 'Compare known sequence and overflow/gap metadata'], ['Duplicate alarms', 'Replay, GI/integrity and client event handling', 'Distinguish snapshots from process transitions'], ['Wrong timestamps', 'Source t versus entry/arrival time; clock status', 'Compare synchronized source and device log'], ['Second client rejected', 'RCB instance allocation and ownership', 'Use the engineered independent client resource'] ] },
    example: 'An HMI works before an SCL update, then displays mismatched status values. Compare the revised DataSet order and ConfRev with the client’s cached mapping. Correct the mismatch through the engineering workflow, then retest changes, snapshots, quality and recovery for every affected member.',
    check: 'Close the fault only after normal operation and the original failure scenario both pass. Record the root cause, final revisions, client allocation and evidence rather than relying on a temporary successful connection.'
  }
];
