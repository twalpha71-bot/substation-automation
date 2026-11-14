export interface DataModelLesson {
  title: string;
  paragraphs: string[];
  example: string;
  check: string;
  table?: { headers: string[]; rows: string[][] };
  code?: string;
}

// Object references below are illustrative. Confirm names and supported attributes
// against the deployed IED's SCL, model documentation and online server directory.
export const DATA_MODEL_LESSONS: DataModelLesson[] = [
  {
    title: 'Introduction to IEC 61850 Data Model',
    paragraphs: [
      'The IEC 61850 data model describes information by its engineering meaning. A breaker position, a phase current and a protection operation have recognizable structures instead of being identified only by an unexplained register number. This shared vocabulary helps the IED manufacturer, protection engineer and SCADA integrator describe the same function consistently.',
      'The usual hierarchy is server → logical device → logical node → data object → data attribute. The physical IED hosts the server; the remaining levels organize information inside that server. Data attributes carry values and supporting information such as quality and time. The hierarchy describes information, while communication services determine how clients read it, receive reports or request permitted controls.',
      'A standardized model does not mean every relay contains identical functions or identical names. Implementations differ in logical-device organization, node instances, optional objects and supported services. Engineering therefore combines the standard vocabulary with the actual device model and the project signal list.'
    ],
    example: 'For feeder 33-F01, the HMI needs breaker position, phase currents and an overcurrent trip indication. First identify the relevant XCBR, MMXU and protection logical nodes in the IED. Then record their complete references and the attributes needed to interpret each signal. Only after that should the communication and display mappings be configured.',
    check: 'Explain the difference between the meaning of a signal, its full object reference and the service that transports it. A successful network connection proves none of these mappings by itself.'
  },
  {
    title: 'Object-Oriented Data Modeling',
    paragraphs: [
      'IEC 61850 groups related information into objects representing equipment and automation functions. A logical-node class defines a recognizable function; an instance represents one occurrence of that function in a particular device. XCBR is a circuit-breaker class, while XCBR1 and XCBR2 can represent two distinct breaker functions. Instance numbers identify instances, not voltage levels or universal bay numbers.',
      'Within a logical node, a data object represents a specific aspect of the function. A Common Data Class (CDC) defines the structure and semantics of that object. For example, breaker position uses DPC, a controllable double-point structure. Reusable classes make the model consistent while allowing separate instances to hold different live values.',
      'Think of a class as a specification and an instance as the configured occurrence. This analogy helps explain reuse, but it does not imply that the relay is programmed in any particular object-oriented language. The communication model exposes agreed information, not the internal source code of the protection algorithm.'
    ],
    example: 'A bus-coupler controller may expose two XCBR instances. Both contain position information, but one belongs to the first breaker and the other to the second. Mapping both HMI symbols to XCBR1 would produce two plausible displays with only one actual source.',
    check: 'Record class, instance, equipment association and CDC separately. Verify each instance against drawings and configuration instead of inferring its purpose from its number.'
  },
  {
    title: 'Physical IED and IEC 61850 Server',
    paragraphs: [
      'An Intelligent Electronic Device is the equipment performing protection, control, measurement or another automation task. Its IEC 61850 server is the communication-side model through which supported information and services are exposed. A single protection relay can perform several functions and organize them into multiple logical devices under its server.',
      'An IP address identifies a network endpoint; it is not the complete identity of a measurement or breaker indication. After reaching the endpoint, a client must use the correct logical-device name, logical-node instance, data path and functional constraint. Changing an IED name or importing a different configuration can change references even when the IP address stays unchanged.',
      'The model available online should agree with the configuration and firmware used for engineering. An ICD describes capabilities, whereas project and device configuration files describe configured instances within their respective scopes. Use the deployed configuration and vendor documentation to resolve differences between what a file advertises and what a running server exposes.'
    ],
    example: 'Two identical feeder relays have different station IP addresses and IED names. Importing the first relay into a client and changing only the IP address may still leave object references pointing to the first relay’s logical-device domain. Browse the second relay and compare the complete names.',
    check: 'Confirm the physical device, network endpoint, IED identity, firmware and deployed configuration revision before diagnosing individual data points.'
  },
  {
    title: 'Logical Device (LD)',
    paragraphs: [
      'A logical device groups related logical nodes within the server model. A manufacturer might separate protection, measurements and control into different LDs, or combine several functions in one LD. The grouping is an engineering organization; an LD is not automatically a separate hardware module or an independently addressed Ethernet device.',
      'Each logical device contains LLN0, the logical node for information and services common to that logical device. LPHD represents physical-device information within the applicable model; inspect its actual placement rather than assuming one universal arrangement. Application nodes such as XCBR and PTOC then describe particular functions.',
      'The SCL LDevice instance identifier and the exposed logical-device name must be distinguished. In common naming, an IED name and LD instance are combined; an explicit ldName can affect the resulting reference where supported. Always use the configured or browsed name rather than constructing it from a guessed naming rule.'
    ],
    example: 'An illustrative IED named FDR01 with LD instance LD0 may expose the domain FDR01LD0. A second LD may contain protection functions. Finding XCBR1 in one LD does not mean PTOC1 is necessarily beside it.',
    check: 'List every LD and its function. Confirm the actual exposed LD name and LLN0 information before building datasets or SCADA tags.'
  },
  {
    title: 'Logical Node (LN)',
    paragraphs: [
      'A logical node is a standardized grouping of data associated with a function. IEC 61850-7-4 defines many commonly used logical-node classes and their data objects. The four-letter class conveys the type of function, while a prefix and instance number distinguish configured occurrences. Prefixes and instances are part of the reference and must be retained exactly.',
      'Equipment functions and automation functions can be represented by different nodes even when they interact. XCBR represents circuit-breaker information; CSWI represents switching control. PTOC describes time-overcurrent protection information, and PTRC describes protection trip conditioning. The presence of these classes does not describe every connection in the relay’s internal logic.',
      'Standard class names improve discoverability, but not all optional objects or services are implemented. Some project signals use generic input/output nodes such as GGIO when no appropriate dedicated mapping is exposed. In those cases, descriptions and signal documentation become particularly important.'
    ],
    table: { headers: ['LN class', 'Typical function', 'Engineering question'], rows: [ ['XCBR', 'Circuit breaker', 'Which physical breaker does this instance represent?'], ['CSWI', 'Switching control', 'Which command path and control model are configured?'], ['MMXU', 'Electrical measurements', 'Which measurement location and ratios apply?'], ['PTOC', 'Time-overcurrent protection', 'Which stage and characteristic are represented?'], ['PTRC', 'Protection trip conditioning', 'Which protection functions feed this trip logic?'] ] },
    example: 'A feeder relay may contain PTOC1, PTOC2 and PTOC3 for separate overcurrent stages. The project engineer must associate each with the configured protection stage before naming alarms in SCADA.',
    check: 'Compare the LN prefix, class and instance with the vendor signal list. Never treat the instance number as a guaranteed protection-stage definition.'
  },
  {
    title: 'Data Object (DO)',
    paragraphs: [
      'A data object describes one aspect of a logical-node function. In XCBR1.Pos, XCBR1 identifies the node and Pos identifies its position object. The object is a structured collection, so reading its name alone is not the same as selecting a particular scalar value for an HMI tag.',
      'The Common Data Class gives the object its expected organization. DPC combines double-point status with control-related information where supported; MV describes a measured value; structured measurement classes organize multi-phase or vector quantities. The CDC tells an engineer what kinds of attributes to expect, while the actual device description tells which applicable optional attributes exist.',
      'Objects may contain sub-data objects before reaching attributes. For example, a phase measurement can require selecting a phase component and then its magnitude. Do not flatten all objects into a single Boolean or number: doing so can lose phase identity, units, quality or control semantics.'
    ],
    example: 'A request to “map breaker Pos” is incomplete. For indication, select the status value and preserve its quality and timestamp. For a control request, identify the supported controllable object and service path separately.',
    check: 'For each required DO, record its CDC, subordinate structure, supported attributes and intended use. Confirm that the chosen object represents the required equipment function.'
  },
  {
    title: 'Data Attribute (DA)',
    paragraphs: [
      'A data attribute holds a particular value or property within a data object. Familiar names include stVal for a status value, q for quality and t for a timestamp. Attributes have defined types: a Boolean alarm, a coded double-point state and a floating-point measurement cannot be interpreted interchangeably.',
      'Some attributes are structured. A measurement path may pass through cVal and mag before reaching the floating-point component f. Engineers must distinguish a structured attribute from its basic components. A client can display a whole structure, but a scalar HMI tag usually needs the correct basic value together with associated quality and time handling.',
      'Attribute availability and update behavior depend on the CDC, supported services and configuration. A timestamp is not necessarily refreshed continuously; its semantics follow the modeled data and event rules. A value that has not changed may therefore legitimately retain an older data timestamp.'
    ],
    code: 'Illustrative status attributes:\nFDR01LD0/XCBR1.Pos.stVal  [ST]  position\nFDR01LD0/XCBR1.Pos.q      [ST]  quality\nFDR01LD0/XCBR1.Pos.t      [ST]  data timestamp\n\nIllustrative structured measurement:\nFDR01LD0/MMXU1.A.phsA.cVal.mag.f  [MX]',
    example: 'A client that imports stVal as Boolean may display both “on” and “bad-state” as true. Selecting the correct data type prevents a contact discrepancy from appearing as a normal closed breaker.',
    check: 'Inspect the attribute type and full structure in the online browser. Preserve associated quality and timestamp rather than importing the numerical value alone.'
  },
  {
    title: 'Functional Constraints (FC)',
    paragraphs: [
      'A functional constraint groups data attributes according to their role. It is a classification used in access and service modeling, not another physical level between the IED and logical node. Attributes belonging to one data object can have different functional constraints because status, settings and controls serve different purposes.',
      'ST commonly identifies status attributes and MX measurements. CF covers configuration, DC descriptive information and CO control-related information. SG and SE relate to setting groups and their editing where supported. SV denotes substitution in this context; it must not be confused with the abbreviation SV used for Sampled Values communication.',
      'Some tools present an FC as a separate selection, while MMS-oriented displays may include it in a dollar-separated item identifier. A correct data path with the wrong FC can fail to resolve or select the wrong group. An FC also does not grant permission: control models, access rules and device operating conditions still apply.'
    ],
    table: { headers: ['FC', 'Role', 'Illustrative use'], rows: [ ['ST', 'Status', 'XCBR1.Pos.stVal, q, t'], ['MX', 'Measurements', 'MMXU phase-current values'], ['CF', 'Configuration', 'Control-model configuration where exposed'], ['DC', 'Description', 'Human-readable descriptions'], ['CO', 'Control', 'Operate structures of supported controllable objects'], ['SG / SE', 'Setting groups / editing', 'Supported setting-group values'], ['SV', 'Substitution', 'Substitution enable/value where implemented'] ] },
    example: 'A model browser may show XCBR1 → ST → Pos. Another tool may show Pos and ask for ST in a separate field. Both can refer to the same functional grouping.',
    check: 'Record the FC alongside every mapped data reference and confirm the client’s naming convention. Do not use the control FC to read an indication.'
  },
  {
    title: 'IEC 61850 Object Reference Naming',
    paragraphs: [
      'A readable object reference identifies the logical device, logical node and nested data path. The slash separates the LD name from the LN; dots separate data objects, sub-objects and attributes. Exact spelling, capitalization, prefixes and instance numbers matter. A short name such as XCBR1.Pos is useful in discussion but is incomplete when several LDs or IEDs contain that node.',
      'ACSI-style references and MMS item names are different presentations of related information. With MMS, the logical-device name is commonly the domain, and an item identifier uses dollar separators with an FC grouping. A client may accept the readable path and FC independently, or it may require the mapped domain/item form. Follow that client’s documented interface.',
      'SCL references can identify components through separate XML attributes rather than one concatenated string. This is why copying a name from a screenshot is less reliable than importing the deployed SCL and validating against the online directory. Renaming an IED or LD can invalidate previously configured client references.'
    ],
    code: 'Readable data reference: FDR01LD0/XCBR1.Pos.stVal\nFunctional constraint:   ST\n\nIllustrative MMS representation:\nDomain: FDR01LD0\nItem:   XCBR1$ST$Pos$stVal\n\nFDR01LD0 = exposed logical-device name\nXCBR1    = logical-node instance\nPos      = data object\nstVal    = data attribute',
    example: 'If the live server exposes CBXCBR1 but the HMI requests XCBR1, the reference is wrong even though the class and attribute look familiar. The CB prefix cannot be silently omitted.',
    check: 'Copy the reference from the authoritative model and verify it online. Keep the readable object reference, FC and client-specific address fields in the mapping sheet.'
  },
  {
    title: 'Structured vs Functional Data',
    paragraphs: [
      'The structural view answers “where does this information belong?” It follows the hierarchy from LD to LN to DO and DA. The functional view answers “which part of this information is required for this service?” It groups attributes using functional constraints. These are complementary views of the same model.',
      'A functionally constrained data object (FCD) selects the attributes of an object for a particular FC. A functionally constrained data attribute (FCDA) identifies a particular attribute with its FC. A dataset can therefore select a suitable group or an individual attribute according to the implementation and configuration. The selected level affects the structure received by a client.',
      'Dataset order and nesting are operationally important. A consumer expecting a scalar must not silently treat a received structure as a scalar, and an index-based decoder must agree with the configured dataset order. Changing members may also require corresponding configuration-revision handling and client configuration updates.'
    ],
    example: 'Including XCBR1.Pos with FC ST can provide a status structure with value, quality and time. Including only XCBR1.Pos.stVal selects a narrower value. Confirm the actual member and decoded structure before deciding that an HMI will automatically receive q and t.',
    check: 'Inspect dataset membership, FC, ordering and the received structure. Verify quality and timestamp coverage explicitly rather than assuming they accompany every scalar selection.'
  },
  {
    title: 'Status, Measurements and Control Data',
    paragraphs: [
      'Status information describes a condition such as breaker position, trip operation or an equipment alarm. A single-point indication has two logical states; double-point indication distinguishes valid positions from intermediate and bad states. Each must be interpreted using its data class and project meaning.',
      'Measurements describe quantities such as current, voltage, power and frequency. Correct integration requires the unit, multiplier, phase or phase-pair, sign convention and conversion settings. A believable number is not proof of correct scaling: 1.0 may represent a secondary quantity, a primary quantity or a value displayed with a multiplier depending on the model and configuration.',
      'Control data requests an action through a defined service and control model. Writing an observed status attribute is not a valid substitute for operating a controllable object. Direct control and select-before-operate workflows, local/remote state, interlocks and command feedback must be considered separately from the monitoring path.'
    ],
    example: 'For one breaker, the HMI may display XCBR position, trend MMXU feeder current and issue an authorized command through the configured CSWI or XCBR control object. These paths interact in the application but must remain separately documented.',
    check: 'Classify each signal as indication, measurement, setting or control. Verify data type, unit or state mapping and the required service before connecting it to an HMI element.'
  },
  {
    title: 'Quality and Timestamp Attributes',
    paragraphs: [
      'Quality tells a receiving application how much confidence to place in a value. It includes validity and, where applicable, detail indicators such as old data, out of range or failure, together with source, test and operator-blocked information. Collapsing all quality into a normal-looking number hides distinctions that operators and automation logic may need.',
      'The data timestamp t describes the modeled event or update according to the relevant data semantics. It is distinct from a report creation time, network arrival time or HMI display time. Time quality also matters: a device can supply a timestamp while indicating a clock problem or lack of synchronization. Displaying many decimal places does not establish corresponding time accuracy.',
      'The client must handle both source quality and communication health. After a connection loss, a last-known good value can remain visible; the HMI should identify its stale communication state according to the project policy. A valid process value, a synchronized event time and a healthy reporting connection are three separate checks.'
    ],
    example: 'A feeder current remains at 245 A after communication is interrupted. The number alone looks reasonable, but the client should mark the point stale or unavailable. For event analysis, retain the original device timestamp and distinguish it from the time the client noticed the outage.',
    check: 'Exercise invalid/questionable quality, test/substitution indications, loss of communication and clock-unsynchronized conditions in the approved test environment. Verify the HMI behavior for each.'
  },
  {
    title: 'Breaker Position — XCBR.Pos',
    paragraphs: [
      'XCBR.Pos describes circuit-breaker position using the DPC data class. Its status value is double-point information, not a plain Boolean. The model distinguishes intermediate-state, off, on and bad-state. For a normal breaker display, off and on are generally interpreted as open and closed; the project must verify that interpretation against the actual equipment and IED logic.',
      'The IED typically derives the indication from configured auxiliary contacts and processing logic. Contact polarity, input inversion, filtering and discrepancy supervision affect the result. An invalid contact combination must not be forced into an apparently healthy open or closed indication just to simplify an HMI symbol.',
      'Position confirmation is distinct from a command request or a protection trip indication. A trip command may be issued without the breaker reaching open position. Conversely, a breaker can open for another reason. Troubleshooting therefore compares command, protection event, auxiliary feedback and timing rather than treating one signal as proof of the others.'
    ],
    table: { headers: ['Decoded state', 'Meaning', 'Typical HMI interpretation'], rows: [ ['0 — intermediate-state', 'Neither stable position established', 'Moving or intermediate; evaluate duration'], ['1 — off', 'Off position', 'Open, after project verification'], ['2 — on', 'On position', 'Closed, after project verification'], ['3 — bad-state', 'Invalid/inconsistent position state', 'Discrepancy or invalid-position indication'] ] },
    example: 'During an approved simulated opening test, observe the trip request, the change in auxiliary inputs, Pos.stVal, q and t, and the HMI update. If PTRC shows a trip but Pos remains on, investigate the feedback and operating path instead of declaring the breaker open.',
    check: 'Test all four decoded states and quality handling using an isolated simulator or approved commissioning procedure. Raw wire encodings and driver representations may differ from the decoded numbers shown here.'
  },
  {
    title: 'Analog Measurements — MMXU',
    paragraphs: [
      'MMXU provides a model for electrical measurements such as phase currents, voltages, power and frequency where implemented. Multi-phase quantities are structured: A can contain phsA, phsB and phsC, with a complex measured value under each phase. Magnitude and angle are different components and must not be confused.',
      'An illustrative current magnitude path is MMXU1.A.phsA.cVal.mag.f with FC MX. Its associated quality and timestamp are found at the corresponding measured-value structure, not necessarily by appending q or t to the final floating-point leaf. Browse the complete structure to establish the correct paths.',
      'Measurement verification includes units, multipliers, CT/VT ratios, phase identity, direction and deadband configuration. Reports may send changes based on configured triggers and thresholds, so a constant displayed value does not automatically indicate a broken link. Conversely, applying an extra CT ratio in the HMI to a value already expressed in primary amperes produces a large scaling error.'
    ],
    code: 'Illustrative phase-A current paths (FC MX):\nMMXU1.A.phsA.cVal.mag.f  → current magnitude\nMMXU1.A.phsA.q           → phase-A current quality\nMMXU1.A.phsA.t           → phase-A current timestamp\n\nConfirm full LD/LN names, units and supported components online.',
    example: 'For a training case with a 600/1 A CT, a 0.5 A secondary injection corresponds to 300 A primary. Compare the expected primary value with the IED display and exposed measurement, then confirm whether the HMI needs any conversion. The conversion is determined by configuration, not by the path name alone.',
    check: 'Use at least two known test points and verify each phase, unit and multiplier. Check zero, sign/direction where relevant, quality and report deadband behavior.'
  },
  {
    title: 'Protection Information — PTOC and PTRC',
    paragraphs: [
      'PTOC represents time-overcurrent protection information. Common data objects include Str for start and Op for operation, with structured attributes such as general where present. A start indicates that the relevant protection logic has picked up; operation indicates that the function’s operating criteria have been met. They should not share an indistinguishable alarm label.',
      'PTRC represents protection trip conditioning and exposes trip-related information, commonly through Tr. It can aggregate or condition results from protection functions according to the relay’s application logic. A PTOC operation and a PTRC trip therefore describe related but different points in the protection chain.',
      'The complete sequence depends on the configured relay logic, output circuits and breaker behavior. IEC 61850 node names do not reveal every blocking input, latch, reset rule or trip matrix. Use the application configuration and event records to interpret which stage operated and how its result reached the trip output.'
    ],
    code: 'Illustrative status references (FC ST):\nFDR01LD0/PTOC1.Str.general  → overcurrent start\nFDR01LD0/PTOC1.Op.general   → overcurrent operation\nFDR01LD0/PTRC1.Tr.general   → conditioned trip indication\nFDR01LD0/XCBR1.Pos.stVal    → breaker feedback\n\nThese examples do not define the relay’s internal trip wiring.',
    example: 'In a simulated fault, the start may precede operation by the configured protection delay. PTRC may then assert, followed by breaker opening feedback. Use the individual timestamps and time-quality indications to analyze the sequence rather than measuring it from screen refreshes.',
    check: 'Verify the actual stage-to-node association, trip matrix and reset/latching behavior. Confirm that the SCADA labels distinguish pickup, operation, trip and breaker position.'
  },
  {
    title: 'IEC 61850 Data Model Browser',
    paragraphs: [
      'A data model browser helps inspect the server directory, logical devices, logical nodes and data structures exposed by an IED. Use it to establish what the device actually presents, then compare that model with the SCL and signal list. Browsing names is only the first step; reading types and values and inspecting supported services provide additional evidence.',
      'Start with the intended endpoint and confirm the IED identity. Expand the relevant LD and LN, inspect the object and FC, then read the required value, quality and timestamp. For report-based integration, inspect configured datasets and report control blocks as supported by the tool and device.',
      'Keep passive inspection separate from commissioning operations. Some browser tools expose write, control and report-configuration functions beside read functions. A connection used for inspection should follow the site’s access policy, and active tests should use a simulator or an authorized commissioning arrangement.'
    ],
    example: 'If the HMI cannot find a breaker point, browse the IED and search the applicable XCBR instance. Compare the complete name and type. If the browser reads the correct point but the HMI remains wrong, focus next on the HMI address, dataset/report subscription and state conversion.',
    check: 'Save a model export or inspection record with device identity and configuration revision. A cached offline tree must not be mistaken for a confirmed online model.'
  },
  {
    title: 'Mapping Physical Signals to Data Objects',
    paragraphs: [
      'Physical-to-model mapping connects an equipment signal to its IEC 61850 meaning. For a hardwired status, the chain may include an auxiliary contact, terminal number, IED binary input, input logic, application signal and model attribute. For a network-sourced input, document the publisher, subscribed dataset member and consuming application logic instead of a copper terminal.',
      'A useful mapping sheet preserves both the physical source and the modeled destination. Record contact polarity or active state, filtering, logic inversion, equipment identity and the complete reference with FC. For measurements, record the measurement location, CT/VT data, units and conversion settings.',
      'Choose a dedicated standardized object when the device and application expose an appropriate one. If a generic indication is used, give it an unambiguous description and document its semantics. A generic node name alone cannot tell a future engineer whether true means healthy, alarm, permissive or blocked.'
    ],
    table: { headers: ['Physical/application source', 'Illustrative model destination', 'Verification'], rows: [ ['Breaker auxiliary contact logic', 'XCBR1.Pos.stVal [ST]', 'Both stable positions and discrepancy states'], ['Phase-A measurement channel', 'MMXU1.A.phsA.cVal.mag.f [MX]', 'Ratio, phase identity and unit'], ['Overcurrent operation logic', 'PTOC1.Op.general [ST]', 'Correct protection stage and reset'], ['Trip conditioning logic', 'PTRC1.Tr.general [ST]', 'Trip matrix and indication timing'] ] },
    example: 'If the field breaker is open but the online model shows on, changing the HMI color mapping would conceal the underlying input or model error. Trace the chain from contact state through the relay logic to the published value first.',
    check: 'Verify one signal end to end and retain the evidence. Do not compensate for an upstream mapping error with an undocumented downstream inversion.'
  },
  {
    title: 'Data Model to SCADA/HMI Signal Mapping',
    paragraphs: [
      'SCADA integration associates a modeled point with an operator tag, symbol, alarm or trend. The mapping must include the full reference, FC, data type, state or unit conversion, quality policy and timestamp source. A tag name should identify the bay and equipment clearly while the engineering record retains the exact underlying reference.',
      'For MMS reporting, confirm that the intended data is present in a supported dataset and that the relevant report control block is correctly configured and enabled for the client. A successful direct read does not prove that change reporting is working. Trigger options, client association, buffering and dataset interpretation all influence the delivery path.',
      'A gateway may transform the point into another protocol for a control center. Preserve the meaning of valid states, quality and event time through that conversion. Test reconnection and initialization so that old values are not presented as fresh observations and a missing report does not silently freeze a healthy-looking breaker symbol.'
    ],
    example: 'Map FDR01LD0/XCBR1.Pos.stVal [ST] to tag 33_F01_CB_POSITION, with explicit open, closed, intermediate and bad-state display rules. Associate its source quality and timestamp, then verify both the initial state and a simulated change delivered by the reporting path.',
    check: 'Compare the live IED value, received report and displayed HMI state. Include quality-only changes, connection loss, recovery and the project’s event-time requirements in acceptance tests.'
  },
  {
    title: 'Practical Example — 33 kV Feeder IED',
    paragraphs: [
      'Consider training feeder 33-F01 with one circuit breaker, a feeder protection IED, a station HMI and a gateway. Assume the illustrative LD name FDR01LD0. The actual project may place the same functions in several LDs, so the following names are a worked mapping example rather than a device import file.',
      'Define four information groups: breaker position from XCBR, electrical measurements from MMXU, overcurrent indications from PTOC and conditioned trip information from PTRC. For each group, retain the relevant quality and timestamp. Build the reporting configuration from the required signals and supported dataset structures, then associate the received information with the HMI display.',
      'In an isolated simulator or approved test setup, begin with a closed breaker and stable current. Apply the simulated fault condition, observe protection start and operation, inspect the trip indication, and verify that breaker feedback changes after the simulated operating delay. Protection execution belongs to the approved protection scheme; the HMI receives indications and must not be a prerequisite for tripping.'
    ],
    table: { headers: ['HMI purpose', 'Illustrative reference within FDR01LD0', 'FC'], rows: [ ['Breaker position', 'XCBR1.Pos.stVal', 'ST'], ['Phase-A current', 'MMXU1.A.phsA.cVal.mag.f', 'MX'], ['Overcurrent start', 'PTOC1.Str.general', 'ST'], ['Overcurrent operation', 'PTOC1.Op.general', 'ST'], ['Trip indication', 'PTRC1.Tr.general', 'ST'] ] },
    example: 'Acceptance evidence should show the simulated source condition, correct online value, received report, HMI indication and event timestamp for each point. Repeat with a quality problem and a communication interruption to verify that the display communicates uncertainty instead of merely keeping the last value.',
    check: 'Use the mapping sheet to verify every path and the recovery behavior. Treat command acceptance, protection trip indication and confirmed breaker opening as separate outcomes.'
  },
  {
    title: 'Engineering Verification and Troubleshooting',
    paragraphs: [
      'Troubleshoot in layers: physical/application source, online data model, dataset/report service, client decoding and HMI mapping. Establish where the first disagreement appears. If the source and online value disagree, investigate the IED mapping; if the online value is right but the HMI is wrong, move toward transport, decoding and display configuration.',
      'Configuration changes can produce subtle failures. Renamed LDs or LNs break references, revised dataset members change decoded structures, and firmware changes can alter optional model elements. Compare the deployed configuration, engineering files and client import rather than assuming all copies are synchronized.',
      'Close testing with recorded evidence: device and configuration identity, point references, expected and observed states, quality behavior, event-time behavior and recovery results. Correcting one point is insufficient if the same naming or type assumption was applied to an entire bay. Review the affected mapping group after fixing the root cause.'
    ],
    table: { headers: ['Symptom', 'First checks', 'Useful next action'], rows: [ ['Object not found', 'LD/LN spelling, prefix, instance and FC', 'Compare online directory with deployed SCL'], ['Plausible but wrong value', 'Wrong instance, phase, ratio or unit', 'Trace from the known physical/test source'], ['Direct read works; HMI frozen', 'Dataset, RCB, client ownership and triggers', 'Inspect actual report delivery and decoding'], ['Wrong breaker color', 'Double-point type and state conversion', 'Test all states and quality indications'], ['Events appear out of order', 'Source timestamps, clock status and receipt-time use', 'Compare device events with client records'], ['Value stays normal after outage', 'Client communication-quality policy', 'Verify stale indication and recovery'] ] },
    example: 'A breaker point works before an SCL update and disappears afterward. Compare old and new LD/LN names first. Once the reference is corrected, recheck dataset membership and the HMI’s state, quality and timestamp mapping; a successful read alone does not complete the repair.',
    check: 'Final review: all 20 lessons understood, actual references verified, value/q/t handled, state and unit conversions tested, reporting confirmed and configuration revisions recorded.'
  }
];
