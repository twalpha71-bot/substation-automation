import type { DataModelLesson } from './iec61850Chapter05';

export type Chapter06Diagram = 'architecture' | 'xcbr' | 'protection' | 'mmxu' | 'cdc' | 'feeder';
export interface LogicalNodeLesson extends DataModelLesson {
  diagram?: Chapter06Diagram;
}

// These are training configurations, not device-specific import files or protection settings.
// IED_33_F01 is assumed to be the exposed logical-device name in the examples.
export const LOGICAL_NODE_LESSONS: LogicalNodeLesson[] = [
  {
    title: 'Introduction to Logical Nodes',
    diagram: 'architecture',
    paragraphs: [
      'A Logical Node (LN) is the standardized information interface for a power-system function. It groups information that belongs together, such as circuit-breaker position, electrical measurements or overcurrent protection indications. IEC 61850-7-4 defines commonly used LN classes and their data objects. The LN describes externally visible information; it does not prescribe the manufacturer’s internal software architecture or protection algorithm.',
      'One physical protection IED can host an IEC 61850 server with several logical devices and many logical nodes. A feeder relay may expose XCBR for breaker information, MMXU for measurements, PTOC for overcurrent protection and PTRC for trip conditioning. These are functions within an engineered model, not necessarily separate processors, Ethernet ports or physical boxes.',
      'A logical-node class is a reusable definition, while an instance identifies a particular occurrence. Two feeders may each have an XCBR1, distinguished by their logical-device names. Within one device, prefixes and instance numbers distinguish multiple functions. Correct integration therefore requires both the standard function meaning and the complete configured reference.'
    ],
    example: 'At a 132/33/11 kV station, the 33-F01 feeder IED supplies position, current and protection events to the station HMI. Instead of treating them as unrelated register addresses, the engineer identifies their LN instances, selects the required attributes and documents how each instance is associated with the feeder.',
    check: 'Browse the actual IED and identify one equipment LN, one measurement LN and one protection LN. Confirm their physical/application associations using the project drawings and deployed configuration.'
  },
  {
    title: 'Purpose and Structure of Logical Nodes',
    paragraphs: [
      'Logical nodes organize functions into discoverable information structures. A node contains data objects, and each object is structured according to a Common Data Class (CDC). In CTRLXCBR1.Pos.stVal, CTRLXCBR1 is the LN instance, Pos is the position data object and stVal is one status attribute. Pos also contains other information defined by its CDC and implemented by the device.',
      'Common LN information can describe operating mode, behavior, health or identification according to the applicable class and edition. Application-specific objects then express the function: breaker position differs from a protection start or a phase-current measurement. Never infer that every node implements every familiar object or every optional component of a CDC.',
      'The information model, service model and application logic must be considered together. A data object may exist but be exposed as status-only, or its control service may be restricted by configuration. Similarly, showing a protection start in the model does not establish which output contact or GOOSE publication is driven by that start. Those connections belong to the engineered application.'
    ],
    table: { headers: ['Level', 'Illustrative item', 'What it tells you'], rows: [ ['Logical device', 'IED_33_F01', 'Configured domain containing functions'], ['Logical node', 'CTRLXCBR1', 'One circuit-breaker function'], ['Data object', 'Pos', 'Position information, CDC DPC'], ['Data attribute', 'stVal / q / t', 'Status, quality and data timestamp'] ] },
    example: 'An HMI request for “breaker Pos” should be expanded into the indication value, its quality, timestamp and state mapping. A separate command specification identifies the controllable object and supported control model. This avoids confusing command requests with measured breaker feedback.',
    check: 'For each required point, record LN class, instance, DO, CDC, DA, functional constraint and supported service. Inspect the actual type definitions before importing tags.'
  },
  {
    title: 'Logical Node Naming Conventions',
    paragraphs: [
      'A typical application LN name is formed from a configured prefix, a four-letter LN class and an instance identifier. In CTRLXCBR1, CTRL is the prefix, XCBR is the circuit-breaker class and 1 is the instance. The prefix is project or vendor engineering information; it is not a universal keyword that all devices must use. Special nodes such as LLN0 follow their defined naming rules.',
      'The examples below assume IED_33_F01 is the actual exposed logical-device name. In a complete IEC 61850 object reference, the part before the slash is the LD name, not merely the physical IED label. Real LD names may be formed from an IED name and LD instance, or use an explicitly configured name where supported. If IED_33_F01 is only the physical device name in your project, replace it with the server’s actual LD name.',
      'A slash separates LD from LN. Dots separate the object and attribute path. Case, prefix and instance identifiers must match the server. Functional constraint ST is normally supplied separately in readable references; a client using MMS domain/item notation may present the same information with dollar-separated components.'
    ],
    code: 'IED_33_F01/CTRLXCBR1.Pos.stVal  [ST]  breaker position\nIED_33_F01/CTRLXCBR1.Pos.q      [ST]  position quality\nIED_33_F01/CTRLXCBR1.Pos.t      [ST]  position timestamp\n\nIED_33_F01 = assumed exposed Logical Device name\nCTRL       = illustrative prefix\nXCBR       = Logical Node class\n1          = instance identifier\nPos        = Data Object\nstVal/q/t  = Data Attributes',
    example: 'If the online directory shows LD name IED_33_F01CTRL and LN name CBXCBR1, the correct point starts IED_33_F01CTRL/CBXCBR1. Copying the tutorial reference unchanged would fail even though both models represent a circuit breaker.',
    check: 'Compare names in the deployed SCL and live browser. Keep physical IED name, LD instance, exposed LD name, LN prefix, class and instance in separate mapping-sheet fields.'
  },
  {
    title: 'Logical Node Groups and Categories',
    paragraphs: [
      'The first letter of an LN class identifies its group. This helps an engineer navigate a large model: X classes describe switchgear, M classes describe metering or measurement, P classes describe protection functions and C classes describe supervisory control. The group provides orientation, but the complete class determines the specific function.',
      'A relay generally contains nodes from several groups because it performs several related tasks. For example, a feeder protection IED can contain XCBR, CSWI, CILO, MMXU, PTOC and PTRC. A protection-related class may belong to a different group than a primary protection function; use the actual standard classification rather than grouping solely by an English description.',
      'Generic nodes can expose signals for which the device has no dedicated application mapping. They should not erase useful semantics: a generic alarm requires a clear description, active-state definition, source and testing record. The table is a practical subset for this course, not an exhaustive catalogue of all IEC 61850 application domains or later extensions.'
    ],
    table: { headers: ['Group', 'Purpose', 'Examples'], rows: [ ['L', 'System logical nodes', 'LLN0, LPHD'], ['X', 'Switchgear', 'XCBR, XSWI'], ['C', 'Supervisory control', 'CSWI, CILO'], ['M', 'Metering and measurement', 'MMXU'], ['P', 'Protection functions', 'PTOC, PDIS, PTRC'], ['R', 'Protection-related functions', 'RBRF, RREC'], ['T', 'Instrument transformers', 'TCTR, TVTR'], ['G', 'Generic function references', 'GGIO'] ] },
    example: 'A 132 kV line bay might expose PDIS for distance protection and RREC for autoreclosing, while an 11 kV outgoing feeder might use PTOC. Voltage level alone does not determine which nodes must exist; the protection and control design does.',
    check: 'Identify the supported class and namespace in the IED documentation. Do not rename vendor extensions to standard objects without verifying that their meaning and structure match.'
  },
  {
    title: 'XCBR — Circuit Breaker Logical Node',
    diagram: 'xcbr',
    paragraphs: [
      'XCBR models circuit-breaker information. Its Pos data object uses CDC DPC, which includes double-point position status and control-related structure according to the implemented control model. Typical indication attributes are Pos.stVal, Pos.q and Pos.t with FC ST. Other objects, such as operation count or blocking information, must be checked against the device model rather than assumed universally available.',
      'A common physical indication arrangement uses 52a and 52b auxiliary contacts connected to IED digital inputs. Conventionally, 52a follows the closed breaker and 52b follows the open breaker. Input inversion, contact wiring, debounce and discrepancy logic determine how the relay interprets the contact combination. The example diagram represents information flow and is not a terminal-wiring drawing.',
      'The decoded double-point states are intermediate-state, off, on and bad-state. Open and closed HMI states must be mapped deliberately; intermediate or inconsistent states must remain distinguishable. A trip request is not position confirmation: a failed mechanism or feedback problem can leave Pos indicating closed after protection has operated.'
    ],
    table: { headers: ['Decoded DPC status', 'Typical breaker interpretation', 'Verification focus'], rows: [ ['0 — intermediate-state', 'No stable position established', 'Travel time and supervision behavior'], ['1 — off', 'Open', '52a/52b mapping and input polarity'], ['2 — on', 'Closed', 'Both feedback channels and HMI state'], ['3 — bad-state', 'Inconsistent position indication', 'Discrepancy alarm and quality policy'] ] },
    example: 'For 33-F01, trace auxiliary contacts through the relay input logic to IED_33_F01/CTRLXCBR1.Pos.stVal, then to a configured MMS report and the SCADA symbol. Retain q and t alongside the value so an invalid or stale indication remains visible to the operator.',
    check: 'Using an isolated test setup, exercise open, closed, intermediate and discrepancy conditions; record relay input states, model values, quality, timestamps and HMI interpretation. Driver wire encodings may differ from the decoded numbers in this table.'
  },
  {
    title: 'XSWI — Disconnector and Switch Logical Node',
    paragraphs: [
      'XSWI models switching equipment such as a disconnector or earthing switch. Like XCBR, its position information commonly uses Pos with CDC DPC. The similar data structure does not imply the same electrical interrupting capability. A disconnector must be operated within its equipment rating and the approved switching sequence; its IEC 61850 class does not authorize load interruption.',
      'The IED obtains position feedback from the configured physical inputs or application interface. Equipment identity, switch type and operating capability may be described by supported model objects, but optional data and extensions differ between implementations. Two XSWI instances may represent an isolator and an earth switch; their instance numbers alone do not identify which is which.',
      'SCADA needs clear open, closed, intermediate and discrepancy indications for each switch. The control path may be represented through a CSWI instance with interlocking information associated with CILO. These relationships are configured in the IED application and station engineering, rather than created automatically by placing matching LN names in an SCL file.'
    ],
    example: 'In a 132 kV bay, document the line disconnector and earthing switch as separate equipment functions with separate references. In a 33 kV switchgear lineup, confirm how the supplied product models its disconnecting and earthing mechanisms instead of forcing the 132 kV naming scheme onto it.',
    check: 'Verify each switch against the single-line diagram, equipment tag and feedback contacts. Test approved permissive and blocking conditions with simulated inputs before any authorized operating test.'
  },
  {
    title: 'CSWI — Switch Controller Logical Node',
    paragraphs: [
      'CSWI describes supervisory switching control. It provides an information interface for an open or close request and its associated control behavior. Pos is a commonly used controllable object. The actual command endpoint may be CSWI or another supported node according to the IED design, so the client must follow the configured model rather than infer it from the breaker-status point.',
      'The control model determines whether the client operates directly or performs select-before-operate, and whether normal or enhanced security behavior is supported. In this terminology, enhanced security refers to control-service supervision and command completion behavior; it does not by itself mean network encryption or user authentication.',
      'An accepted command request is not proof of completed mechanical movement. The application evaluates relevant permissions and conditions, drives its configured output and supervises the result as implemented. The HMI should distinguish selection, request acceptance, command termination where applicable, and actual XCBR or XSWI feedback. Writing Pos.stVal is not a substitute for the control service.'
    ],
    code: 'Illustrative configured command object:\nIED_33_F01/CTRLCSWI1.Pos\n\nRead the supported ctlModel/configuration first.\nUse the client’s Select/Operate workflow when required.\nConfirm independent feedback at:\nIED_33_F01/CTRLXCBR1.Pos.stVal [ST]',
    example: 'During FAT, a permitted simulated close command is issued through the configured CSWI object. The test records the service response and independently checks breaker feedback. A second test removes a required permissive and verifies that the request is rejected without an unintended output.',
    check: 'Verify local/remote state, supported control model, selection timeout where relevant, command feedback and independent position indication. Perform active controls only within the approved test arrangement.'
  },
  {
    title: 'CILO — Interlocking Logical Node',
    paragraphs: [
      'CILO represents interlocking information used to determine whether an operation is permitted. EnaOpn and EnaCls are standard-defined enable-open and enable-close objects using single-point status information. Their values are the modeled results of interlocking evaluation; the class name does not define the complete interlocking logic or the project switching rules.',
      'Inputs may include breaker and disconnector positions, earthing-switch position, local/remote conditions and information received from other IEDs. The engineered application evaluates those inputs and applies its control checks. If a required remote input becomes invalid or stale, the resulting behavior must follow the approved design and be verified; it must not be guessed from the last Boolean value.',
      'An HMI can display the permissive and, where separately available, the reason for a block. CILO does not guarantee that a detailed cause string exists. A displayed permissive is also not blanket authority to operate equipment: the command path, control mode and operating procedure still apply. Supervisory switching permissives must not be casually inserted into or used to bypass the independent protection-trip scheme.'
    ],
    code: 'Illustrative interlocking indications (FC ST):\nIED_33_F01/CTRLCILO1.EnaOpn.stVal\nIED_33_F01/CTRLCILO1.EnaCls.stVal\n\nEnaCls = true: close permissive asserted by configured logic.\nIt does not prove command acceptance or breaker closure.',
    example: 'For 33-F01, the approved closing logic may require an open earth switch and valid relevant position inputs. Simulate each prerequisite independently and verify the permissive, client response and output behavior. This is an example test method, not a universal interlocking equation.',
    check: 'Test the permitted state, every specified blocking condition, invalid/stale remote information and recovery. Confirm the actual link from interlocking evaluation to the controlled object.'
  },
  {
    title: 'MMXU — Measurement Logical Node',
    diagram: 'mmxu',
    paragraphs: [
      'MMXU organizes electrical measurements such as currents, voltages, power and frequency where implemented. Objects can be structured: phase currents under A can contain phsA, phsB and phsC, and each complex measured-value structure can expose magnitude and angle. Select the required phase and component rather than treating the whole A object as one floating-point value.',
      'For an illustrative phase-A current, A.phsA.cVal.mag.f is a possible floating-point magnitude path with FC MX. Associated quality and timestamp belong to the measured-value structure, for example A.phsA.q and A.phsA.t. Units, multipliers and supported components must be obtained from the actual model; not every quantity is expressed through the same path.',
      'CT/VT scaling, primary-versus-secondary presentation, phase order and power direction are essential integration details. Measurement reporting can use deadbands and configured triggers, so a small change may not immediately produce a new report. MMXU information is distinct from the raw sampled-value stream used by a process bus; seeing MMXU does not establish that the IED publishes or subscribes to SV.'
    ],
    code: 'Illustrative phase-A measurement, FC MX:\nIED_33_F01/MEASMMXU1.A.phsA.cVal.mag.f\nIED_33_F01/MEASMMXU1.A.phsA.q\nIED_33_F01/MEASMMXU1.A.phsA.t\n\nMEAS is an illustrative LN prefix; confirm it online.',
    example: 'With a training 600/1 A CT ratio, 0.5 A secondary corresponds to 300 A primary. Compare the injected value, relay display, model value and HMI. Apply the ratio only where required by the configured representation; applying it twice causes a major scaling error.',
    check: 'Verify at least two known measurement points, all phases, units and sign conventions. Check deadband response, quality propagation and the client’s stale-data behavior.'
  },
  {
    title: 'PTOC — Time Overcurrent Protection',
    paragraphs: [
      'PTOC models time-overcurrent protection information. The protection function evaluates current against its configured criteria and timing characteristic. Pickup, intentional delay, directional supervision where part of the implemented function and blocking conditions belong to the actual protection application. The LN model exposes information about that function without prescribing one universal algorithm.',
      'Commonly used objects include Str for start and Op for operation. These use protection-specific structures, commonly ACD for starting information and ACT for activation information; they should not automatically be imported as simple SPS objects. A general Boolean component can be available alongside phase-specific components according to the model.',
      'Multiple PTOC instances may represent different stages or functions. Map each one to the vendor’s protection configuration before naming it “low set” or “high set.” A start indicates pickup, while operation indicates that the relevant operating criteria have been met. Neither alone proves that the breaker has opened.'
    ],
    code: 'Illustrative FC ST indications:\nIED_33_F01/PROTPTOC1.Str.general\nIED_33_F01/PROTPTOC1.Op.general\n\nCheck CDC, phase components, q and t in the device model.\nThe instance number is not a universal protection-stage number.',
    example: 'For 33-F01, an approved secondary-injection test applies a current above a configured pickup setting and records start and operation times. Test values and expected delays come from the approved setting file and relay characteristic, not from the tutorial. Reported events are compared with the test equipment and relay event record.',
    check: 'Verify stage identity, pickup/dropout behavior, timing at specified test points, blocking inputs and reset/latching behavior. Separate relay operate time from reporting and HMI update delay.'
  },
  {
    title: 'PDIS — Distance Protection',
    paragraphs: [
      'PDIS models distance-protection information. Distance protection uses voltage and current to evaluate an apparent impedance for selected fault loops and compares that result with configured operating characteristics. Reach, direction, timing and supervision depend on the relay application. A simple V/I explanation is introductory; actual fault-loop calculations can include phase selection and compensation.',
      'Distance zones can be represented through one or several configured instances and associated objects depending on the implementation. Starting and operation information, commonly Str and Op, may include general, phase or directional components where supported. An instance named PDIS2 must not automatically be labelled Zone 2 without checking the vendor mapping.',
      'This function is a useful example for the 132 kV line bays of a 132/33/11 kV station. The 33-F01 outgoing feeder need not contain PDIS if its protection design does not use distance protection. Adding a node to a training signal list does not add the corresponding protection capability to an IED.'
    ],
    example: 'For a 132 kV line relay, FAT uses approved impedance test points inside and outside each configured zone and verifies the relevant start, operation and trip indications. The HMI labels identify the actual zone and function. Voltage-transformer failure supervision and other specified blocks are tested according to the relay application.',
    check: 'Confirm the zone-to-instance mapping, fault-loop meaning, configured reach/delay and applicable supervision. Use relay-specific test procedures; this lesson supplies no operational distance-protection settings.'
  },
  {
    title: 'PTRC — Protection Trip Conditioning',
    diagram: 'protection',
    paragraphs: [
      'PTRC represents protection trip-conditioning information. It relates protection results to a conditioned trip output according to the engineered application. Possible application behavior includes combining selected function outputs, applying specified latching or pulse behavior, and routing trip indications. These details are configuration dependent; the presence of PTRC does not guarantee any particular timer, latch or wiring arrangement.',
      'Tr is a commonly used trip data object with activation information, often including Tr.general and supported phase components. It describes the trip function’s state, not the physical breaker position. A PTOC.Op indication, PTRC.Tr indication, relay output contact operation and XCBR.Pos change are distinct verification points.',
      'The diagram shows an illustrative internal signal chain from current evaluation through PTOC and PTRC to a trip output. It does not mean that each arrow is an MMS or GOOSE message. A project may use hardwired outputs, engineered GOOSE exchanges or a combination. The actual protection path must satisfy its design independently of whether the HMI is available.'
    ],
    example: 'A 33-F01 test produces a configured overcurrent operation. Verify the PTOC indication, its intended trip-matrix association, PTRC trip state, assigned output and simulated breaker feedback. If the trip indication appears but feedback remains closed, investigate the output/mechanical/feedback chain instead of changing the HMI to show open.',
    check: 'Compare the approved trip matrix with the configured application. Verify each input path, output assignment, pulse or latch behavior, reset conditions and independent breaker feedback.'
  },
  {
    title: 'LLN0 and LPHD — Common Logical Nodes',
    paragraphs: [
      'LLN0 is the logical node for information and services common to a logical device. Each LD has its LLN0. It is a familiar location for engineered datasets and report or GOOSE control blocks according to the relevant service and configuration rules. Do not assume that every dataset or service in every product is available at one hard-coded location.',
      'LPHD represents physical-device information. Its supported identification and health information helps distinguish a device-level issue from a particular application-function issue. Objects such as PhyNam and PhyHealth should be interpreted using the actual model and supported attributes. Verify how LPHD is placed and instantiated in the device rather than treating its location as universal.',
      'System and application health must be interpreted separately. A healthy physical device does not prove that all field inputs are valid or that every GOOSE subscription is healthy. Likewise, an application function may be blocked or in test mode while the device remains operational. The HMI should retain these distinctions instead of using one green “IED OK” lamp as evidence for every function.'
    ],
    example: 'During 33-F01 integration, inspect LLN0 to locate the configured reporting objects and inspect supported LPHD information to confirm device identity and health. If breaker status is missing, compare those results with XCBR quality and the reporting configuration before deciding that the whole relay has failed.',
    check: 'Record the actual LD/LLN0 organization and supported LPHD references. Validate device identification, available health indications and report-control configuration without changing unrelated settings.'
  },
  {
    title: 'Introduction to Common Data Classes',
    diagram: 'cdc',
    paragraphs: [
      'A Common Data Class is a reusable structure for a type of information. IEC 61850-7-3 defines CDCs and constructed attribute classes; IEC 61850-7-4 associates data objects with those structures in logical-node definitions. The LN answers “which function?”, the DO answers “which aspect of that function?”, and the CDC answers “how is that information organized and interpreted?”',
      'For example, XCBR.Pos is a position object whose CDC is DPC. DPC is the type definition, not another path component to insert between Pos and stVal. The class defines relevant status, control and supporting attributes with conditions and functional constraints. The device’s instantiated type determines the supported members for that configuration.',
      'The nine CDCs shown here provide an introduction to status, measurement and control information. They are not the complete IEC 61850 catalogue: protection structures such as ACD and ACT and enumerated classes such as ENS and ENC also matter. Choosing a CDC only because it has a convenient primitive value can lose important semantics.',
      'In SCL, an LN instance refers to an LNodeType; its DO definition refers to a DOType whose cdc identifies the class. Nested structures can reference additional type definitions. Inspect the whole type chain and the applicable edition rather than declaring every attribute seen in one vendor file mandatory everywhere.'
    ],
    example: 'For a model review, locate the actual LNodeType for CTRLXCBR1, follow its Pos type to the DOType and verify cdc="DPC". Then inspect the instantiated status and control attributes. This establishes the modeled type without assuming that all control services are enabled.',
    check: 'Verify the standard-defined semantics, supported instance structure and client decoding together. Keep custom namespaces and vendor extensions identifiable in the engineering record.'
  },
  {
    title: 'SPS, DPS, INS — Status Data Classes',
    paragraphs: [
      'SPS represents single-point status, typically with a Boolean stVal and associated quality and timestamp. A Boolean has two values but its application meaning must still be documented: true could mean alarm present, device healthy or a permissive asserted. Tag descriptions and alarm polarity must come from the engineered signal definition.',
      'DPS represents double-point status. It distinguishes intermediate-state, off, on and bad-state, allowing a receiver to show uncertainty or inconsistency instead of collapsing all nonzero values into true. DPC has a related double-point status representation but adds controllable semantics; DPS and DPC should not be treated as identical classes.',
      'INS represents integer status. The number may be a count or another integer-valued state according to the data object, with associated quality/time where defined. An integer data type does not by itself provide an enumeration dictionary. In editions and models using ENS for enumerated status, preserve that class distinction and obtain the allowed meanings from the type definition.'
    ],
    table: { headers: ['CDC', 'Value interpretation', 'Integration consideration'], rows: [ ['SPS', 'Boolean status', 'Document active polarity and alarm meaning'], ['DPS', 'Four decoded position states', 'Keep intermediate and bad-state visible'], ['INS', 'Integer status', 'Confirm range, unit/count meaning and reset behavior'] ] },
    example: 'For a station HMI, a permissive may use SPS, a status-only switching indication may use DPS and a supported operation count may use INS. These are illustrative uses; the actual DO’s declared CDC controls the mapping. A count must not be displayed as a binary alarm.',
    check: 'Test both SPS states, all DPS states and representative INS values including boundaries. Verify quality-only changes and event timestamps without assuming every integer is an enumerated state.'
  },
  {
    title: 'MV, CMV, SAV — Measurement Data Classes',
    paragraphs: [
      'MV represents a measured quantity, commonly exposing a magnitude through mag and related measurement metadata. The magnitude structure may provide an integer or floating-point component according to the type. Instantaneous and deadband-related attributes have defined roles; optional instantaneous members must not be invented just because a client expects them.',
      'CMV represents a complex measured value, with a vector structure such as cVal containing magnitude and angle components. In a multi-phase measurement object, each phase can contain its own CMV structure. Units, angle convention, phase association and the availability of optional components must be checked. An angle and a magnitude cannot be combined into one scalar tag without a deliberate representation.',
      'SAV represents a sampled analogue value, using an instantaneous-magnitude structure such as instMag according to the model. It is a data class, not the Ethernet Sampled Values transport itself. Do not assume that SAV has the same per-value timestamp layout as MV or CMV; in an SV application, sample counts, synchronization indications and stream timing also matter.',
      'Measurements should be validated with known inputs and end-to-end scaling checks. A report deadband affects when a change is sent, while a CT ratio or multiplier affects the numerical meaning. These are different causes of apparently incorrect HMI behavior and require different diagnostic tests.'
    ],
    table: { headers: ['CDC', 'Illustrative value path within a DO', 'Key distinction'], rows: [ ['MV', 'mag.f or mag.i, as supported', 'Scalar magnitude; verify unit and deadband'], ['CMV', 'cVal.mag.f and cVal.ang.f, as supported', 'Magnitude/angle structure'], ['SAV', 'instMag.i or instMag.f, as supported', 'Sampled analogue structure; inspect time handling separately'] ] },
    example: 'Use a known three-phase test source to compare phase magnitudes and angles with the relay model. For a process-bus test, additionally verify the configured SV stream and timing indicators; an accurate MMXU display alone does not validate the sampled-value communication path.',
    check: 'Confirm the actual DOType/DAType structure, numerical representation, units, q/t availability and transport context. Never append “.t” blindly to every measurement leaf.'
  },
  {
    title: 'SPC, DPC, INC — Control Data Classes',
    paragraphs: [
      'SPC is controllable single point, DPC is controllable double point and INC is controllable integer status. These classes combine applicable status information with control-related structures. The presence of a controllable CDC does not guarantee that a particular device instance accepts remote operations; the configured control model can be status-only or otherwise restricted.',
      'For DPC, the observed stVal has double-point states, while a supported command’s ctlVal is typically Boolean for off/on. The command value is therefore not the same four-state code used for feedback. SPC uses single-point control/status semantics, and INC handles an integer control/status value according to the modeled object. Do not replace INC with a floating-point setpoint or assume an enumerated control is INC rather than ENC.',
      'Control execution uses the defined control service and applicable structures, such as Oper and selection-related objects where supported. The client must honor direct versus select-before-operate behavior, permitted origin and check fields, and command completion rules. An ad hoc write to the status attribute bypasses the intended model and is not the correct implementation.',
      'A complete test observes request handling and process feedback separately. A rejected operation, expired selection, interlock block or unsuccessful movement should produce the correct client behavior and operator indication without changing unrelated status information.'
    ],
    table: { headers: ['CDC', 'Status/control distinction', 'Engineering question'], rows: [ ['SPC', 'Single-point status and supported Boolean control', 'What action and feedback does true represent?'], ['DPC', 'Double-point status; off/on command semantics', 'Which object is commandable and which gives feedback?'], ['INC', 'Integer status and supported integer control', 'What range and operation are permitted?'] ] },
    example: 'For a simulated feeder breaker, inspect the configured CSWI.Pos control model, perform the required client workflow and verify the independent XCBR.Pos response. Do not send the double-point “bad-state” code as a close command.',
    check: 'Verify supported control services, command data types, limits, selection/termination behavior and negative cases. Use an authorized simulator or FAT setup for active operations.'
  },
  {
    title: 'Quality, Timestamp and Functional Constraints',
    paragraphs: [
      'Quality is part of the meaning of a measurement or status. It can communicate validity, detailed problems, substitution, test state and operator blocking according to the relevant structure. The HMI must not convert an invalid but numerically plausible value into a healthy display. Communication loss also requires client-side stale-data handling even if the last received source quality was good.',
      'A data timestamp t describes the modeled data event or update according to its CDC semantics. It is different from report creation time, message arrival time and HMI refresh time. Time quality can indicate clock problems or lack of synchronization. An unchanged signal may retain an old data timestamp legitimately, so age alone must be interpreted in its service and quality context.',
      'Functional constraints classify attributes by role. ST is used for status, MX for measurements, CO for control, CF for configuration and DC for descriptions. Setting-group and substitution constraints apply where supported. FC is not a physical hierarchy level or an access permission. Some clients require it in a separate field, while an MMS item name may embed it.',
      'A dataset can select a functionally constrained object or a narrower attribute. Confirm the actual member structure and whether value, quality and time are included. Selecting only stVal must not be assumed to deliver every sibling attribute automatically.'
    ],
    example: 'A 33-F01 breaker report changes quality while position remains on. The HMI should reflect the quality change even though the breaker symbol’s state value is unchanged. After a connection interruption, verify that the client distinguishes stale information from a newly confirmed closed position.',
    check: 'Exercise data changes, quality-only changes, test/substituted values where supported, unsynchronized time, communication loss and recovery. Compare source event time with receipt time explicitly.'
  },
  {
    title: 'Practical Example — 33 kV Feeder Protection IED',
    diagram: 'feeder',
    paragraphs: [
      'Consider outgoing feeder 33-F01 at a 132/33/11 kV substation. Its protection IED receives current/voltage inputs and breaker feedback, evaluates protection and interlocking logic, exposes IEC 61850 information and drives its configured outputs. For this worked example, assume the server exposes LD name IED_33_F01. All prefixes, instances and paths below are illustrative and must be replaced by the deployed model.',
      'Separate three application paths. Monitoring exposes measurements through MMXU and breaker feedback through XCBR to SCADA. Supervisory control accepts a command through CSWI subject to configured checks, including relevant CILO permissives. Protection evaluates the fault through PTOC and the configured PTRC/output chain. Supervisory close permissives do not define whether the independent protection scheme is allowed to trip.',
      'Start FAT with configuration identity and a complete signal mapping sheet. Verify the physical/application source against the live model, then inspect the configured dataset/report delivery and HMI interpretation. During a simulated fault, compare start, operation, trip output and breaker feedback as separate events. Timing expectations come from the approved protection design and test plan.',
      'During SAT, verify the installed terminal associations, device identities, communication paths and time synchronization against the accepted configuration. Active output and switching tests require the project’s isolation and authorization procedures. Preserve the as-left configuration and signed test evidence so later troubleshooting can distinguish a configuration change from a field problem.'
    ],
    table: { headers: ['Purpose', 'Illustrative path within IED_33_F01', 'FC'], rows: [ ['Breaker status', 'CTRLXCBR1.Pos.stVal / q / t', 'ST'], ['Close permissive', 'CTRLCILO1.EnaCls.stVal', 'ST'], ['Switching command', 'CTRLCSWI1.Pos (control service)', 'CO structures'], ['Phase-A current', 'MEASMMXU1.A.phsA.cVal.mag.f', 'MX'], ['Overcurrent start / operate', 'PROTPTOC1.Str.general / Op.general', 'ST'], ['Trip indication', 'PROTPTRC1.Tr.general', 'ST'] ] },
    example: 'Acceptance sequence: confirm identity → read baseline values → simulate each indication → verify report and HMI → test approved control permissions → simulate protection operation → verify independent breaker feedback → test quality/time and communication recovery → archive the final mapping and configuration.',
    check: 'For every test, record stimulus, expected response, observed model value, q/t interpretation, client response and pass/fail evidence. Never equate a successful MMS connection with completed feeder commissioning.'
  },
  {
    title: 'Logical Node Inspection and Troubleshooting',
    paragraphs: [
      'Begin with the authoritative device identity and configuration. Compare the online LD/LN directory with the deployed SCL and vendor MICS. Inspect the LN prefix/class/instance, DO type, CDC, nested attribute type and FC. A cached browser tree or an old ICD can look convincing while describing a different model than the device currently exposes.',
      'Trace faults from the source toward the display. If the physical/test source disagrees with the online value, inspect input mapping and application logic. If the online value is correct but direct client access fails, inspect the reference, FC and type. If a direct read works but reporting fails, inspect the dataset, report-control configuration and client association. If received data is correct but the HMI is wrong, inspect conversion, quality handling and tag mapping.',
      'After firmware, SCL or application changes, recheck affected names, optional attributes, datasets and control models. A renamed prefix can break many points; a changed dataset structure can break a decoder that relied on member order. Fixing the first visible symptom should be followed by a review of every point sharing the same assumption.',
      'Close the investigation with repeatable evidence and the final configuration revision. Retest normal operation and the failure case that exposed the issue. Keep standard-defined behavior separate from vendor implementation details and project settings in the handover notes.'
    ],
    table: { headers: ['Symptom', 'Likely area to inspect', 'Verification'], rows: [ ['Object missing', 'LD/LN name, prefix, FC or optional support', 'Compare live directory and current SCL/MICS'], ['Wrong switch displayed', 'Equipment-to-instance association', 'Trace actual input and equipment tag'], ['Measurement scaled incorrectly', 'Unit, multiplier, CT/VT or phase mapping', 'Compare known injection and source value'], ['Read works, reports do not', 'Dataset, RCB, triggers or client association', 'Inspect actual report contents and delivery'], ['Control rejected', 'Control model, local/remote, selection or permissive', 'Inspect service response and approved logic'], ['Events appear out of order', 'Data time versus arrival time; clock quality', 'Compare relay record and synchronized test source'], ['Healthy-looking frozen value', 'Client stale/communication-quality handling', 'Interrupt and restore the approved test link'] ] },
    example: 'After an IED update, CTRLXCBR1 becomes CBXCBR1. The HMI loses position while current measurements continue working. Compare the directory, correct the affected references through the normal engineering workflow, then verify dataset delivery, all four position states, quality and event time.',
    check: 'Completion criteria: correct LN/CDC mappings, all required attributes resolved, six functional paths understood, negative tests passed, old configuration assumptions removed and FAT/SAT evidence retained.'
  }
];
