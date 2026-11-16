import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import './InterviewPrepPage.css';
import { getActiveLanguage, translateOfflineText, translateByKey, ensureLanguageLoaded, LANGUAGE_CODES, type SupportedLanguageCode } from '../i18n/offlineTranslation';

const chapters = [
  { id: '01', title: 'SAS Fundamentals' },
  { id: '02', title: 'IEC 61850' },
  { id: '03', title: 'MMS & Reporting' },
  { id: '04', title: 'GOOSE' },
  { id: '05', title: 'SCL Files' },
  { id: '06', title: 'SCADA/HMI' },
  { id: '07', title: 'Networking' },
  { id: '08', title: 'FAT/SAT' },
  { id: '09', title: 'Wireshark & IEC 61850 Troubleshooting' },
  { id: '10', title: 'Multi-Vendor IED Integration' },
  { id: '11', title: 'Station Gateway & Protocol Conversion' },
  { id: '12', title: 'Breaker Control, Interlocking & SBO' },
  { id: '13', title: 'Protection Signals, Alarms & SOE' },
  { id: '14', title: 'Time Synchronization & SNMP Monitoring' },
  { id: '15', title: 'Engineering Tools & Software' },
  { id: '16', title: 'Real-World SAS Troubleshooting' },
  { id: '17', title: 'Technical HR & Project-Based Questions' },
  { id: '18', title: 'Advanced SAS Architecture & System Integration' },
  { id: '19', title: 'Advanced Commissioning & Troubleshooting' },
  { id: '20', title: 'Final Revision & Mock Technical Interview' },
];

type InterviewQuestion = { question: string; answer: string; steps: string[]; scenario: string; takeaway: string };

const chapterOneQuestions: InterviewQuestion[] = [
  {
    "question": "What is a Substation Automation System (SAS), and what are its main functions?",
    "answer": "SAS is an integrated system that monitors, controls and records substation equipment through IEDs, communication networks, station computers and gateways. Protection remains a separate safety-critical function, even when information is exchanged with SAS.",
    "steps": [
      "Identify primary equipment such as breakers, disconnectors and transformers and the associated secondary IEDs.",
      "Collect status, measurements, alarms and events from IEDs using the configured protocols.",
      "Present validated data on the HMI and record events with timestamps.",
      "Issue authorized operator controls through the configured control model and interlocks.",
      "Forward selected operational points to the control centre through the gateway."
    ],
    "scenario": "During FAT, change a simulated breaker auxiliary contact and confirm the IED input, SCADA point, alarm/event record and gateway indication update correctly.",
    "takeaway": "Explain the complete signal path rather than describing SAS as only an HMI."
  },
  {
    "question": "Explain the difference between a protection relay, BCU, RTU, gateway and SCADA server.",
    "answer": "A protection relay detects abnormal electrical conditions and initiates configured protection actions. A BCU performs bay-level monitoring and control. An RTU acquires and transfers field data, a gateway exchanges or converts information with external systems, and a SCADA server manages station-wide supervisory data and operator functions. Product architectures can combine these roles.",
    "steps": [
      "Identify which device owns each field signal and control output.",
      "Check the device communication interface and protocol.",
      "Determine which system hosts point mapping, alarms and control permissions.",
      "Verify the end-to-end indication and command route in the approved drawings."
    ],
    "scenario": "A feeder status reaches the local BCU but not the remote control centre: verify BCU acquisition, station communications, gateway mapping and remote protocol transmission in order.",
    "takeaway": "Avoid assuming every project has a separate physical device for each function."
  },
  {
    "question": "Describe the end-to-end flow of a breaker status from the yard to the HMI.",
    "answer": "A breaker auxiliary contact provides a hardwired input to a bay device. The IED represents that state in its data model; SCADA receives it via reporting, polling or another configured integration path, maps it to a database point, and displays it on the single-line diagram.",
    "steps": [
      "Verify the breaker auxiliary contact and input wiring using approved test procedures.",
      "Check the binary input and the IED logical status, for example XCBR.Pos where applicable.",
      "Verify the relevant DataSet, reporting configuration and active MMS association when IEC 61850 reporting is used.",
      "Confirm SCADA database address, quality, inversion and display binding.",
      "Check timestamp, quality and state transitions at the HMI."
    ],
    "scenario": "The breaker is physically open but HMI shows closed: compare the field contact, IED value, report and mapped HMI tag to isolate the first mismatch.",
    "takeaway": "A green network link does not prove the signal mapping is correct."
  },
  {
    "question": "What is the difference between station bus and process bus?",
    "answer": "The station bus typically connects bay IEDs to station-level clients, HMIs and gateways for monitoring, control and peer communications. A process bus connects process-interface devices such as merging units and protection/control IEDs for sampled measurements and related process signals. Actual topology depends on design.",
    "steps": [
      "Read the network architecture and identify devices on each bus.",
      "Identify MMS, GOOSE and Sampled Values traffic where used.",
      "Review bandwidth, VLANs, multicast handling and redundancy requirements.",
      "Check whether the project uses conventional copper wiring, digital process interfaces or a hybrid design."
    ],
    "scenario": "If SV traffic is missing at a protection IED, inspect merging-unit publication, process-bus switch forwarding and subscriber settings instead of troubleshooting the HMI first.",
    "takeaway": "Do not claim every IEC 61850 station uses Sampled Values."
  },
  {
    "question": "How do you verify a newly integrated IED in the SAS?",
    "answer": "IED integration must be checked from the physical and network layers through the configured data model to the operator interface. A successful ping or MMS association is only one part of acceptance.",
    "steps": [
      "Check IED model, firmware, configuration revision and approved engineering files.",
      "Verify IP settings, network port status, VLAN and time synchronization.",
      "Establish the required protocol connection and browse expected data objects.",
      "Validate reporting, measurements, indications, alarms and controls against the signal list.",
      "Record evidence, defects and retest results in FAT/SAT sheets."
    ],
    "scenario": "A new feeder relay communicates but measurements remain zero: compare actual injected/available values, IED data objects, scaling and SCADA mapping.",
    "takeaway": "Never perform live switching just to demonstrate connectivity."
  },
  {
    "question": "What is the difference between an alarm, event and SOE record?",
    "answer": "An event records a state change or occurrence. An alarm is an event or condition configured to require operator attention. Sequence of Events (SOE) uses precise event timestamps to reconstruct the order of operations; its accuracy depends on device timestamping and clock synchronization.",
    "steps": [
      "Confirm the originating device and event condition.",
      "Verify timestamp source and time-sync status.",
      "Check alarm priority, acknowledgement behavior and return-to-normal logic.",
      "Confirm the event is stored and ordered correctly in SCADA/SOE logs."
    ],
    "scenario": "After a feeder trip, compare relay trip assertion, breaker-open indication and HMI alarm timestamps to reconstruct the sequence.",
    "takeaway": "Do not confuse event arrival time at the server with the original device event time."
  },
  {
    "question": "Explain local, remote and supervisory control of a circuit breaker.",
    "answer": "Breaker control is permitted only through the selected authority and the approved electrical and operational interlocks. A supervisory command may involve select-before-operate, authorization and feedback verification. Control behavior depends on the IED control model and project philosophy.",
    "steps": [
      "Verify the Local/Remote selector and current control authority.",
      "Check user permissions, operational permits and interlocking status.",
      "Confirm the configured control model, target point and command parameters.",
      "Issue commands only in an authorized test environment or approved switching procedure.",
      "Verify command result, breaker feedback, SOE and any failure indication."
    ],
    "scenario": "HMI close button is disabled while the breaker is healthy: inspect Local/Remote mode, interlock conditions, permissions and SCADA command configuration.",
    "takeaway": "Never bypass interlocks to make a test pass."
  },
  {
    "question": "What is redundancy in SAS, and how do you test it?",
    "answer": "Redundancy reduces single points of failure through duplicated networks, servers, power supplies or communication paths. PRP and HSR are examples of IEC 62439-3 seamless network redundancy; redundant SCADA servers and gateways may use separate application failover mechanisms.",
    "steps": [
      "Identify the redundant elements and their intended failure behavior.",
      "Verify both network paths or server nodes are healthy before testing.",
      "Record baseline communication, alarms and client connections.",
      "Perform a controlled single-failure test with approved isolation and supervision.",
      "Verify continuity, failover indications and recovery; document any loss or delay."
    ],
    "scenario": "During FAT, disconnect one approved PRP LAN path and confirm the IED remains reachable through the other path without a service interruption expected under correct PRP operation.",
    "takeaway": "PRP/HSR and RSTP do not have identical failover behavior."
  },
  {
    "question": "What checks do you perform before starting FAT for a SAS project?",
    "answer": "Factory Acceptance Testing demonstrates that the configured system meets agreed functional requirements in a controlled environment before shipment or site installation.",
    "steps": [
      "Review approved architecture, signal list, SLD, network diagram and test procedures.",
      "Confirm software versions, licenses, IED configurations and backups.",
      "Verify test equipment, simulated inputs and safe output isolation.",
      "Check station communications, time synchronization and database loading.",
      "Execute witnessed test cases, record results and manage punch-list closure."
    ],
    "scenario": "A breaker simulation is shown on the IED but not on the HMI during FAT: log the discrepancy, trace mapping and reporting, correct under change control and retest.",
    "takeaway": "FAT is not a substitute for site wiring and end-to-end SAT verification."
  },
  {
    "question": "A device responds to ping but shows communication failure on SCADA. What do you check?",
    "answer": "Ping verifies only basic IP reachability. The SCADA application may still fail because the application port, protocol association, device settings, security policy or data/report configuration is incorrect.",
    "steps": [
      "Check SCADA driver logs and exact failure timestamp.",
      "Verify target IP, port and service availability; for MMS commonly TCP 102.",
      "Inspect VLAN, ACL/firewall rules and routing where relevant.",
      "Check IEC 61850 server settings, association limits, certificates/security where deployed and client configuration.",
      "Use an approved packet capture to confirm whether the TCP connection and application association complete.",
      "Retest reports and points after the association is restored."
    ],
    "scenario": "A replacement IED uses the correct IP but SCADA cannot establish MMS: compare the enabled server service, access settings and client configuration with the approved baseline.",
    "takeaway": "Never conclude that IEC 61850 works simply because ping succeeds."
  }
];

const chapterTwoQuestions: InterviewQuestion[] = [
  {
    "question": "What is IEC 61850 and why is it used in substation automation?",
    "answer": "IEC 61850 is a family of standards for power utility automation communication and engineering. It defines standardized data models, abstract communication services and configuration language, enabling consistent integration across equipment vendors. It does not guarantee plug-and-play interoperability without engineering.",
    "steps": [
      "Identify the IED roles and communication requirements from the project architecture.",
      "Review logical devices, logical nodes and data objects in the IED model.",
      "Identify the services used: MMS for client-server access, GOOSE for event exchange and SV where process-bus sampling is implemented.",
      "Engineer communication and datasets through the appropriate SCL files.",
      "Validate interoperability with end-to-end functional tests."
    ],
    "scenario": "A new vendor relay supports IEC 61850 but its breaker position is missing in HMI. Check model reference, report dataset, RCB and SCADA mapping rather than assuming standard compliance guarantees correct mapping.",
    "takeaway": "Mention interoperability, standardized semantics and engineering files—not just Ethernet."
  },
  {
    "question": "Explain the IEC 61850 data hierarchy with a breaker status example.",
    "answer": "The typical reference hierarchy is IED → Logical Device → Logical Node → Data Object → Data Attribute. For example, a breaker logical node XCBR can expose position through Pos; its structured value and quality attributes are used by the client. Exact references and instance names depend on the device SCL.",
    "steps": [
      "Open the ICD/CID or browse the live IED with an IEC 61850 client.",
      "Find the relevant logical device and XCBR instance.",
      "Locate Pos and its structured attributes such as stVal, q and t as implemented.",
      "Check actual field changes against stVal and quality.",
      "Use the full configured reference in SCADA mapping and reporting."
    ],
    "scenario": "SCADA shows stale breaker position: compare physical auxiliary contact, XCBR.Pos.stVal, quality/timestamp and HMI binding to find the first incorrect stage.",
    "takeaway": "Do not assume XCBR1 or a particular logical device name is universal."
  },
  {
    "question": "What are Logical Nodes, Data Objects, Data Attributes and Functional Constraints?",
    "answer": "A Logical Node groups related function data (for example XCBR for circuit breaker, MMXU for measurements). Data Objects represent information such as Pos or A; Data Attributes contain typed values and metadata. Functional Constraints classify attribute usage, such as ST for status, MX for measurements, CO for control and CF for configuration.",
    "steps": [
      "Inspect the IED SCL DataTypeTemplates and instantiated data model.",
      "Identify the target logical node and data object.",
      "Check the functional constraint of the needed attribute.",
      "Confirm whether the client uses read, report or control services for it.",
      "Validate the data type and expected values in the SCADA database."
    ],
    "scenario": "A measurement is configured as a status attribute in the client and fails to decode: review the reference, FC and attribute type against the live model.",
    "takeaway": "FC is part of addressing and service semantics; it is not a network layer."
  },
  {
    "question": "What is the difference between MMS, GOOSE and Sampled Values?",
    "answer": "MMS maps IEC 61850 client-server services to a TCP/IP-based stack and commonly supports reading, reporting and control. GOOSE uses Ethernet multicast for time-critical state/event distribution. Sampled Values carries sampled measurements, commonly on process-bus networks. Network and application engineering requirements differ.",
    "steps": [
      "Identify which producer and consumer require the data.",
      "Use MMS for station-client access and reporting when appropriate.",
      "Use GOOSE for engineered peer-to-peer event/state exchange.",
      "Use SV only where the architecture includes sampled measurement publishers and subscribers.",
      "Validate VLAN/multicast handling, data content and timing against the project design."
    ],
    "scenario": "A subscriber misses a GOOSE trip signal even though MMS reads work: inspect GOOSE frames and subscription engineering, not just the TCP/IP connection.",
    "takeaway": "GOOSE does not require IP addressing in its conventional Ethernet mapping."
  },
  {
    "question": "What is an SCL file and how do ICD, CID, SCD and IID differ?",
    "answer": "SCL is the XML-based Substation Configuration Language used to describe IED capabilities, instantiated configurations and system communication. ICD generally describes device capabilities, CID an IED-specific configured instance, SCD the system-wide engineering configuration, and IID an instantiated IED exchange description. Exact export workflows vary by vendor.",
    "steps": [
      "Collect the vendor-provided capability file and approved system design.",
      "Import device descriptions into the system configuration tool.",
      "Assign IED identities, communication addresses and required datasets/controls.",
      "Engineer GOOSE subscriptions and reporting relationships.",
      "Export appropriate files, download to devices and verify consistency with the approved SCD."
    ],
    "scenario": "A replacement relay has a new firmware build: compare its data model and supported services with the existing SCD before reusing the previous CID.",
    "takeaway": "Never rename an ICD to CID and assume that changes its contents."
  },
  {
    "question": "What is a DataSet in IEC 61850 and how do you verify it?",
    "answer": "A DataSet is an ordered collection of data references used by services such as reporting and GOOSE. Its membership and ordering must match the publisher configuration and consumer expectations; inclusion alone does not guarantee delivery.",
    "steps": [
      "Locate the DataSet in the live model or SCL.",
      "List every member and verify the reference and functional constraint.",
      "Confirm the expected values and data types at the source.",
      "Check which Report Control Block or GOOSE Control Block references it.",
      "Trigger a permitted test change and confirm the expected consumer update."
    ],
    "scenario": "A new alarm does not appear in SCADA after mapping: confirm the alarm attribute is actually a member of the DataSet associated with the active RCB.",
    "takeaway": "Distinguish dataset membership from report trigger configuration."
  },
  {
    "question": "Explain Buffered and Unbuffered Report Control Blocks (BRCB and URCB).",
    "answer": "Report Control Blocks define how a server sends reports for a DataSet. BRCBs can buffer eligible events while a client is disconnected, subject to server limits and configuration; URCBs generally do not retain a disconnected backlog. Both require correct client ownership/enabling and triggers.",
    "steps": [
      "Identify the RCB name, DataSet reference and configured report instances.",
      "Check RptEna, reservation/ownership and client association status.",
      "Inspect TrgOps, OptFlds, integrity period and buffer settings as applicable.",
      "Cause an approved value change and observe whether a report is generated.",
      "For buffered reports, test disconnection/reconnection and review entry handling under the approved procedure."
    ],
    "scenario": "HMI reconnects but historical changes are missing: check whether the client uses URCB rather than BRCB, and review buffer overflow/entry behavior.",
    "takeaway": "BRCB is not a substitute for historian retention or SOE time synchronization."
  },
  {
    "question": "What are quality and timestamp attributes, and why do they matter?",
    "answer": "IEC 61850 data can carry a value together with quality and time information. Quality helps consumers identify validity, test/substitution or other conditions; timestamp supports event ordering. A displayed value without its quality context can be misleading.",
    "steps": [
      "Browse the value, q and t attributes for the target data object.",
      "Check IED time synchronization and source timestamp generation.",
      "Force only an approved simulated fault or communication-loss condition.",
      "Confirm HMI quality indication and alarm behavior.",
      "Compare SOE timestamps against source records and the time reference."
    ],
    "scenario": "A breaker indication remains displayed after communication loss: verify that SCADA marks stale/invalid quality rather than presenting it as confirmed live status.",
    "takeaway": "A correct value with invalid quality should not be treated as a healthy indication."
  },
  {
    "question": "What is the IEC 61850 control model and what is Select-Before-Operate?",
    "answer": "IEC 61850 supports control models including direct operate and select-before-operate (SBO), with normal or enhanced security variants depending on the implementation. The server validates selection, authorization, interlocks and command conditions before operation; command termination and feedback must be checked.",
    "steps": [
      "Read the configured ctlModel for the control object.",
      "Verify local/remote authority, permissions and interlock conditions.",
      "For SBO, select the object before issuing the operate command within the configured time.",
      "Observe command response, termination where supported and actual device feedback.",
      "Record unsuccessful control causes and avoid repeated operation without diagnosis."
    ],
    "scenario": "A breaker control works locally but SCADA returns command rejection: check ctlModel, selection ownership, origin/authorization, local/remote and interlocks.",
    "takeaway": "Never bypass electrical interlocks or operate live plant for an interview demonstration."
  },
  {
    "question": "How do you troubleshoot an MMS association failure when ping works?",
    "answer": "Ping confirms only ICMP reachability. MMS access depends on TCP connectivity, the IEC 61850 server, application association and client/server configuration. The commonly used MMS TCP port is 102, subject to project security arrangements.",
    "steps": [
      "Confirm correct target IP, VLAN, routing and link status.",
      "Check whether TCP port 102 is reachable and permitted by network security policy.",
      "Inspect IED MMS service settings, client access limits and server logs.",
      "Capture traffic to identify TCP establishment and application association errors.",
      "Compare configured client parameters and approved IED baseline, then retest reads and reports."
    ],
    "scenario": "After relay replacement, ping works but SCADA says disconnected: the replacement may have MMS disabled or a changed access configuration.",
    "takeaway": "Separate network reachability, MMS association and report delivery as three different tests."
  },
  {
    "question": "How do you verify GOOSE publisher/subscriber engineering?",
    "answer": "GOOSE requires a valid publisher DataSet and GoCB, a network that forwards the multicast frames, and a subscriber engineered to interpret the publisher message. Matching expected configuration revision and DataSet structure is essential; supervision must detect missing or stale messages.",
    "steps": [
      "Confirm publisher GoCB is enabled and points to the intended DataSet.",
      "Verify destination MAC, APPID, VLAN settings and frame transmission with a capture.",
      "Check subscriber input mappings and expected publisher identification.",
      "Review confRev, stNum, sqNum, timeAllowedToLive and subscriber supervision status.",
      "Perform a controlled FAT stimulus and verify the subscriber logic input and expected output safely."
    ],
    "scenario": "GOOSE frames appear in Wireshark but subscriber status remains invalid: check confRev, DataSet structure and subscription bindings before changing switch settings.",
    "takeaway": "Successful packet arrival does not prove correct application-level subscription."
  },
  {
    "question": "What is the correct end-to-end procedure for integrating a new IEC 61850 IED?",
    "answer": "IED integration includes engineering-file validation, physical and logical connectivity, IEC 61850 service configuration, point mapping and witnessed functional testing. The process must follow approved project documentation and change control.",
    "steps": [
      "Verify device model, firmware, ICD/CID/SCD consistency and backups.",
      "Configure approved IP, VLAN, time sync and required IEC 61850 services.",
      "Confirm MMS association and browse data objects and quality attributes.",
      "Validate DataSets, RCBs, GOOSE subscriptions and control model as applicable.",
      "Map points to SCADA/HMI and gateway; test status, measurements, alarms, SOE and controls under safe conditions.",
      "Record FAT/SAT evidence and close defects through controlled retesting."
    ],
    "scenario": "A multi-vendor relay communicates but HMI measurements are wrong: inspect source units, data type, magnitude reference and scaling before editing the HMI display.",
    "takeaway": "Present a testable integration sequence, not just a software tool name."
  }
];

const chapterThreeQuestions: InterviewQuestion[] = [
  {
    "question": "Explain how IEC 61850 MMS communication works between an IED and a SCADA client.",
    "answer": "MMS is the application-level client/server service used for IEC 61850 station-bus data access. An IED typically acts as the server and SCADA, gateway or engineering tools act as clients. MMS supports reads, writes where permitted, reports and controls. IEC 61850 MMS is commonly carried over TCP port 102 using the ISO-on-TCP stack.",
    "steps": [
      "Check the approved SCD/CID file for the IED IP address and MMS access point.",
      "Verify physical link, VLAN, routing and TCP 102 reachability.",
      "Establish MMS association and browse logical devices, logical nodes and data attributes.",
      "Enable or reserve report control blocks as required by the SCADA driver.",
      "Verify live indications, quality, timestamps and authorized control services."
    ],
    "scenario": "An IED responds to ping but SCADA is offline: isolate TCP 102 connectivity, MMS association and reporting separately.",
    "takeaway": "Ping does not confirm MMS service or successful reporting."
  },
  {
    "question": "What is the difference between a DataSet and a Report Control Block (RCB)?",
    "answer": "A DataSet is an ordered collection of references to IEC 61850 data objects or attributes. An RCB defines how a server sends changes from that DataSet to a client, including triggers, integrity reporting, buffering and report identifiers. A DataSet alone does not transmit reports.",
    "steps": [
      "Browse the DataSet and confirm each required FCDA reference.",
      "Locate the RCB and confirm its DatSet reference.",
      "Review RptID, TrgOps, OptFlds, IntgPd and BufTm.",
      "Enable reporting using the correct client ownership procedure.",
      "Change an approved test input and verify report content, quality and timestamps."
    ],
    "scenario": "Breaker status is visible on direct MMS read but not updating automatically: the DataSet may be correct while its RCB is disabled or incorrectly configured.",
    "takeaway": "DataSet = what to report; RCB = when and how to report."
  },
  {
    "question": "Compare Buffered Report Control Block (BRCB) and Unbuffered Report Control Block (URCB).",
    "answer": "BRCB retains report entries in a server buffer during eligible client disconnections, within its capacity and implementation limits; URCB does not provide the same buffered delivery. Neither guarantees unlimited storage. BRCB uses concepts such as entry identifiers and purge behavior, while URCB is suitable where buffering is not required.",
    "steps": [
      "Identify the RCB type and supported client allocation in the IED.",
      "Configure DataSet and trigger options consistently with the SCADA client.",
      "For BRCB, check reservation/ownership, RptEna, entry handling and buffer status.",
      "Generate test changes while connected and verify received reports.",
      "In FAT, test controlled disconnect/reconnect and review missing or replayed entries."
    ],
    "scenario": "SCADA loses connectivity for 20 seconds; after recovery the engineer checks whether a BRCB can replay buffered state changes without buffer overflow.",
    "takeaway": "Buffered does not mean guaranteed recovery under every failure condition."
  },
  {
    "question": "What are dchg, qchg, dupd and integrity triggers in reporting?",
    "answer": "Trigger options determine when a report may be generated. dchg detects data value changes for attributes that support it; qchg detects quality changes; dupd handles supported data-update indications; integrity produces periodic reports at the configured integrity period. General Interrogation (GI) is a client-requested reporting mechanism, not the same as periodic integrity.",
    "steps": [
      "Inspect the target attribute and its supported trigger behavior.",
      "Review RCB TrgOps flags and IntgPd value.",
      "Create a controlled value change and verify dchg reporting.",
      "Simulate an approved quality change and verify qchg reporting.",
      "Request GI and confirm the expected DataSet values are reported."
    ],
    "scenario": "SCADA shows correct status after GI but misses later changes: check dchg and whether the IED data object actually generates change triggers.",
    "takeaway": "Trigger settings must match the data behavior and project requirements."
  },
  {
    "question": "Explain the purpose of BufTm and IntgPd in an RCB.",
    "answer": "BufTm is a report buffering interval that can group eligible events before transmission; IntgPd sets the periodic integrity reporting interval when integrity is enabled. Both are configured in milliseconds in the IEC 61850 data model, subject to device implementation. They serve different purposes.",
    "steps": [
      "Identify the required event reporting latency and network loading requirements.",
      "Check the approved RCB BufTm setting and avoid unnecessary delays.",
      "Check whether integrity is enabled and its IntgPd value.",
      "Generate two controlled rapid state changes and inspect resulting reports.",
      "Verify SOE source timestamps and report arrival behavior."
    ],
    "scenario": "An alarm reaches SCADA later than expected: compare IED event timestamp with report arrival and inspect BufTm plus client processing delays.",
    "takeaway": "Do not confuse event timestamp, report transmission time and HMI display time."
  },
  {
    "question": "What are RptID, DatSet, ConfRev, OptFlds and SqNum in reporting?",
    "answer": "RptID identifies the report stream; DatSet identifies its data source; ConfRev indicates relevant DataSet configuration revision; OptFlds controls which optional report fields are included; SqNum supports report sequence tracking. Exact optional fields and handling depend on the IEC 61850 edition and implementation.",
    "steps": [
      "Open the approved SCD and locate the relevant RCB.",
      "Compare RptID and DatSet reference with the SCADA driver configuration.",
      "Verify ConfRev expectations after DataSet engineering changes.",
      "Inspect optional fields such as timestamps, reasons and DataSet references as required.",
      "Capture or log consecutive reports and review sequence handling."
    ],
    "scenario": "After an IED configuration update, SCADA rejects reports: compare DataSet membership and ConfRev against the imported engineering database.",
    "takeaway": "Treat a configuration revision mismatch as a controlled engineering change."
  },
  {
    "question": "How do you enable a BRCB for a SCADA client during integration?",
    "answer": "The client must use the RCB access and ownership procedure supported by the server and its IEC 61850 edition. Typically the engineer checks availability, selects or reserves the correct instance as needed, configures permitted parameters, and sets RptEna. Multiple clients may need separate RCB instances.",
    "steps": [
      "Check the server-supported BRCB instances and any existing client ownership.",
      "Confirm the client references the correct RCB and DataSet.",
      "Apply the supported reservation/ownership procedure before writing protected settings.",
      "Set or verify trigger options and other permitted parameters.",
      "Enable RptEna and request GI if supported and needed.",
      "Test updates and monitor ownership/reconnection behavior."
    ],
    "scenario": "Two SCADA clients attempt to use the same exclusive RCB instance; one fails to enable reporting. Assign supported instances rather than forcing concurrent ownership.",
    "takeaway": "RCB ownership and reservation are device- and edition-dependent."
  },
  {
    "question": "Why can an IED be online in SCADA while its status points do not update?",
    "answer": "An MMS association proves that the client and server communicate, but individual report subscriptions, DataSet references, triggers, point mappings and quality processing can still be wrong. Diagnose from source signal to HMI rather than restarting the network first.",
    "steps": [
      "Check the physical input and the live IED data attribute.",
      "Read the same attribute directly using an approved MMS browser.",
      "Verify DataSet membership and RCB DatSet reference.",
      "Check RptEna, reservation, triggers and GI behavior.",
      "Confirm report reception and SCADA database point mapping.",
      "Verify display inversion, quality and timestamps."
    ],
    "scenario": "XCBR.Pos.stVal changes in the IED but the HMI stays closed: find whether the change disappears at DataSet, report reception or SCADA mapping.",
    "takeaway": "An active association is not equivalent to valid point-level telemetry."
  },
  {
    "question": "How do you troubleshoot MMS connection failure when ping succeeds?",
    "answer": "ICMP reachability tests a different service than MMS. Possible causes include blocked TCP 102, disabled MMS server, incompatible application parameters, client limits, device security settings or invalid association configuration.",
    "steps": [
      "Verify target IP and network route from the SCADA host.",
      "Test TCP port 102 with an approved tool and check firewall/ACL rules.",
      "Capture TCP handshake and ISO-on-TCP/COTP and MMS association traffic.",
      "Review MMS server enablement, permitted clients and session limits.",
      "Compare client/server communication settings with the approved SCD/CID.",
      "Retest read access, report enablement and application stability."
    ],
    "scenario": "After a relay replacement, ping works but MMS fails; compare the replacement firmware/security configuration and server access point before editing SCADA tags.",
    "takeaway": "Troubleshoot at the first failed protocol layer, not from assumptions."
  },
  {
    "question": "What is General Interrogation (GI), and when should SCADA use it?",
    "answer": "GI is a request from the client to the RCB to send a report containing the relevant DataSet values, provided the IED and RCB support the operation and reporting is properly enabled. It is useful for initial synchronization and recovery but does not replace change reporting.",
    "steps": [
      "Confirm the correct RCB is enabled and accessible to the client.",
      "Initiate GI using the SCADA driver or approved test client.",
      "Verify the report contains expected DataSet entries and quality.",
      "Compare displayed values with the current IED states.",
      "Then test ordinary dchg/qchg reporting without relying on GI."
    ],
    "scenario": "After SCADA server failover, GI refreshes current states; subsequent breaker operations must still generate change reports.",
    "takeaway": "GI verifies current state synchronization, not continuous event delivery."
  },
  {
    "question": "How do quality and timestamps travel through MMS reports and affect SOE?",
    "answer": "Reported data may include source data values, quality and timestamps depending on DataSet membership and report options. SOE accuracy requires reliable source event timestamping, time synchronization and correct SCADA processing. Server arrival time is not necessarily the event time.",
    "steps": [
      "Inspect the relevant stVal, q and t attributes in the IED data model.",
      "Verify IED SNTP/PTP/IRIG-B synchronization as applicable.",
      "Check DataSet and optional report fields needed by the client.",
      "Generate a safe test transition and compare IED log, MMS report and HMI SOE.",
      "Test communication loss and verify invalid/stale quality is handled correctly."
    ],
    "scenario": "The HMI displays a breaker state after loss of communication: verify that the quality indicates stale or invalid data and does not imply a live measurement.",
    "takeaway": "Always interpret value together with quality and time."
  },
  {
    "question": "How would you execute a complete FAT test for MMS reporting and document the result?",
    "answer": "A good FAT test demonstrates traceability from approved signal list and IED configuration to actual MMS reporting and SCADA display. It includes normal operation, quality behavior, reconnect scenarios and recorded evidence, without operating live plant.",
    "steps": [
      "Review approved signal list, SCD/CID baseline, RCB allocation and test sheet.",
      "Establish a stable MMS association and record server/client details.",
      "Check DataSet contents and RCB parameters against the approved design.",
      "Stimulate approved simulated binary and analog values; verify value, scaling, quality and timestamps.",
      "Test GI, change triggers and controlled disconnect/reconnect behavior.",
      "Record screenshots, packet/log evidence, pass/fail observations and punch items.",
      "Retest corrected defects and archive final configuration versions."
    ],
    "scenario": "During witnessed FAT, one feeder alarm is absent from reports: trace its FCDA reference, add it through approved engineering change control, reload the affected configuration and repeat the witnessed test.",
    "takeaway": "A complete test includes documented evidence and controlled defect closure."
  }
];

const chapterFourQuestions: InterviewQuestion[] = [
  {
    "question": "What is IEC 61850 GOOSE and why is it used?",
    "answer": "GOOSE (Generic Object Oriented Substation Event) distributes configured data changes from a publishing IED to subscribing IEDs using Ethernet multicast. It supports time-critical interlocking, status and protection-related signaling without requiring an MMS client connection. Performance depends on engineered network and device behavior.",
    "steps": [
      "Identify the publishing IED and required source data objects.",
      "Configure a DataSet and GOOSE Control Block (GoCB).",
      "Configure multicast destination, APPID and VLAN parameters as designed.",
      "Map subscriber inputs to the published DataSet members.",
      "Verify supervision and functional behavior under approved test conditions."
    ],
    "scenario": "During FAT, a simulated protection pickup in one relay is received by a second relay through GOOSE, with physical trip outputs isolated.",
    "takeaway": "GOOSE is publish/subscribe Layer 2 traffic, not an IP/TCP session."
  },
  {
    "question": "Explain publisher, subscriber, DataSet and GoCB in a GOOSE application.",
    "answer": "A publisher sends GOOSE frames containing values from a defined DataSet. The GoCB controls the GOOSE publication and identifies the message. A subscriber is configured to accept the correct publisher message and bind its DataSet members to internal signals.",
    "steps": [
      "Confirm the exact FCDA members and ordering in the publisher DataSet.",
      "Check the GoCB reference, GoID, DataSet reference and confRev.",
      "Verify APPID, multicast MAC, VLAN ID and priority against the network design.",
      "Import or configure external references (ExtRef) in the subscriber.",
      "Validate message reception and subscriber signal quality."
    ],
    "scenario": "A subscriber receives Ethernet frames but its interlock input remains invalid because the ExtRef points to the wrong published member.",
    "takeaway": "Receiving a frame does not guarantee correct subscriber mapping."
  },
  {
    "question": "What is the role of stNum and sqNum in GOOSE?",
    "answer": "stNum is the state number and normally increments when the published DataSet state changes. sqNum identifies retransmissions for a given state and generally advances as repeated frames are sent. These fields help analyze changes, continuity and retransmission patterns.",
    "steps": [
      "Capture publisher traffic with a mirror/SPAN port or approved capture method.",
      "Apply the Wireshark display filter goose.",
      "Observe stNum when a safe simulated input changes.",
      "Observe sqNum across retransmissions while state is unchanged.",
      "Correlate frame sequence with subscriber diagnostics."
    ],
    "scenario": "A relay input changes once; the capture shows a new stNum and a burst of retransmissions with advancing sqNum.",
    "takeaway": "Do not confuse a new state with a retransmission of the same state."
  },
  {
    "question": "Why does GOOSE retransmit even when there is no new event?",
    "answer": "GOOSE uses repeated transmission to improve reliability and allow subscribers to supervise publisher availability. Immediately after a state change, transmissions are frequent, then spacing generally increases toward a steady-state interval as configured by the device.",
    "steps": [
      "Review the configured minimum and maximum retransmission intervals.",
      "Capture traffic before and after a controlled state transition.",
      "Measure actual frame spacing in Wireshark.",
      "Check the subscriber time-allowed-to-live supervision.",
      "Compare results with vendor documentation and project requirements."
    ],
    "scenario": "A network capture shows rapid GOOSE frames after a simulated trip indication and slower periodic messages afterward.",
    "takeaway": "GOOSE is not a one-time event packet; supervision relies on repeated traffic."
  },
  {
    "question": "What are APPID, multicast MAC, VLAN ID and VLAN priority in GOOSE?",
    "answer": "APPID identifies an application stream within the GOOSE frame. The destination multicast MAC directs Ethernet multicast delivery. IEEE 802.1Q VLAN tagging can segregate traffic and carry priority information. All parameters must agree with the engineered network and device configuration.",
    "steps": [
      "Read publisher GoCB communication settings from the approved SCD.",
      "Check the destination MAC and APPID in captured frames.",
      "Verify VLAN tagging and priority behavior on ingress/egress switch ports.",
      "Confirm the subscriber expects the correct stream.",
      "Retest after any controlled network configuration correction."
    ],
    "scenario": "Publisher and subscriber are connected to one switch but GOOSE is absent at the subscriber because the switch port excludes the publisher VLAN.",
    "takeaway": "VLAN mismatch can block GOOSE even when IP ping succeeds."
  },
  {
    "question": "What is confRev and how can it cause a GOOSE subscription failure?",
    "answer": "confRev is the configuration revision associated with the published DataSet definition. A subscriber may reject or flag messages when the received revision does not match its engineered expectation, especially after DataSet structure changes.",
    "steps": [
      "Compare publisher DataSet contents and order with the approved SCD.",
      "Check the publisher confRev in Wireshark.",
      "Inspect subscriber expected confRev and subscription diagnostic.",
      "Update and distribute validated engineering configuration to affected IEDs.",
      "Repeat subscription and signal-level FAT tests."
    ],
    "scenario": "An engineer adds a new DataSet member to the publisher; GOOSE frames arrive but the subscriber reports a configuration mismatch.",
    "takeaway": "Changing a DataSet can require coordinated publisher and subscriber engineering."
  },
  {
    "question": "How do you configure GOOSE communication between two different vendors?",
    "answer": "Cross-vendor GOOSE engineering requires consistent IEC 61850 data references, DataSet structure, communication parameters and subscriber mapping. Vendor engineering tools may import SCD files differently, so interoperability must be verified end to end.",
    "steps": [
      "Export or obtain correct ICD/IID information for each device.",
      "Engineer publisher DataSet and GoCB in the system configuration.",
      "Assign approved multicast MAC, APPID, VLAN and priority.",
      "Import SCD or configure subscriber ExtRef mappings in its vendor tool.",
      "Download validated configurations and test every mapped bit and supervision state."
    ],
    "scenario": "A Siemens relay publishes a breaker interlock and a Schneider relay subscribes; the engineer verifies the imported ExtRef and a controlled simulated state transition.",
    "takeaway": "SCD exchange helps interoperability, but actual functional testing is still required."
  },
  {
    "question": "How do you troubleshoot GOOSE when both IEDs ping but no GOOSE is received?",
    "answer": "Ping tests IP connectivity; GOOSE uses Ethernet multicast and does not depend on the TCP/IP path used for ping. Troubleshoot physical delivery, switch VLAN/multicast configuration, publication, subscription and message compatibility separately.",
    "steps": [
      "Check link state, optical levels, switch errors and the correct physical ports.",
      "Capture publisher traffic and verify GOOSE frames are transmitted.",
      "Inspect VLAN membership, tagging, multicast forwarding and filtering on the path.",
      "Capture near the subscriber to confirm frames arrive.",
      "Check APPID, destination MAC, GoCB reference, confRev, DataSet and ExtRef mapping.",
      "Perform an approved functional retest and record evidence."
    ],
    "scenario": "Both relays respond to ping, but GOOSE is lost after a switch replacement because the new trunk does not carry the configured VLAN.",
    "takeaway": "Always separate network delivery failure from subscriber configuration failure."
  },
  {
    "question": "How do you identify a GOOSE subscription fault in Wireshark?",
    "answer": "Wireshark can decode GOOSE Ethernet frames, allowing inspection of source/destination MAC, VLAN, APPID, GoCB reference, DataSet, confRev, stNum, sqNum and timeAllowedToLive. Captures must be interpreted alongside IED diagnostics.",
    "steps": [
      "Capture traffic using an authorized mirror port or test TAP.",
      "Use display filter goose and select the expected publisher.",
      "Verify frames arrive at the intended capture point.",
      "Compare APPID, GoCB reference, DataSet and confRev with approved engineering.",
      "Observe stNum/sqNum during a safe simulated event.",
      "Check subscriber diagnostic counters and input values."
    ],
    "scenario": "GOOSE frames are visible at the subscriber switch port, but the subscriber rejects them due to an unexpected confRev.",
    "takeaway": "A packet capture proves network arrival, not successful application binding."
  },
  {
    "question": "What is timeAllowedToLive and what happens when a publisher fails?",
    "answer": "The GOOSE timeAllowedToLive field indicates how long a subscriber may wait for a subsequent valid message before treating the stream as timed out. On loss, subscriber quality or supervision status should change according to device logic and engineered fail-safe requirements.",
    "steps": [
      "Check publisher steady-state retransmission settings.",
      "Verify the subscriber supervision or communication-health signal.",
      "Under approved FAT conditions, isolate the test publisher or test link.",
      "Measure the time until subscriber timeout indication.",
      "Verify configured fail-safe behavior and recovery after publication resumes."
    ],
    "scenario": "During FAT, an interlocking subscriber raises a GOOSE communication-failure alarm after the publisher is disconnected.",
    "takeaway": "Loss of GOOSE must be handled by designed supervision, not assumed to mean FALSE."
  },
  {
    "question": "How do you test GOOSE-based interlocking safely during FAT?",
    "answer": "Test both functional state changes and communication-failure behavior against an approved cause-and-effect matrix. Live breaker operations and protection trip outputs must not be used as casual communication tests.",
    "steps": [
      "Review interlocking logic, expected publisher signals and test permits.",
      "Isolate trip/close outputs and establish approved simulated input conditions.",
      "Confirm publisher and subscriber communication healthy.",
      "Apply each simulated permissive/blocking condition and record subscriber response.",
      "Test loss-of-message supervision and restoration.",
      "Document actual versus expected results and retest any defect."
    ],
    "scenario": "A simulated disconnector-not-open signal must block a breaker close permissive at the subscriber; verify logic indication without operating the breaker.",
    "takeaway": "Never bypass interlocks to pass a GOOSE test."
  },
  {
    "question": "How is GOOSE different from MMS reporting?",
    "answer": "GOOSE is Ethernet multicast publish/subscribe for rapid IED-to-IED data distribution. MMS reporting uses an established client-server association over TCP/IP to deliver DataSet changes to SCADA or other clients. Their engineering, transport, diagnostics and use cases differ.",
    "steps": [
      "Identify whether the consumer is another IED or a station-level MMS client.",
      "For GOOSE check GoCB, multicast, VLAN, APPID and ExtRef.",
      "For MMS reporting check client association, RCB, DataSet and report triggers.",
      "Use Wireshark filters goose and tcp.port == 102 as appropriate.",
      "Verify application behavior and quality handling for each service."
    ],
    "scenario": "A breaker status updates on HMI via MMS while the peer interlocking relay does not receive its GOOSE subscription: troubleshoot the two paths independently.",
    "takeaway": "Healthy MMS does not prove healthy GOOSE, and vice versa."
  }
];

const chapterFiveQuestions: InterviewQuestion[] = [
  {
    "question": "What is SCL and why is it important in IEC 61850 engineering?",
    "answer": "Substation Configuration Language (SCL) is the IEC 61850-6 XML-based engineering format for exchanging IED capabilities, substation structure, communication settings and signal relationships between engineering tools. It supports coordinated multi-vendor configuration; it does not replace testing of the actual running IED.",
    "steps": [
      "Collect approved project architecture, IED capability files and vendor engineering requirements.",
      "Validate XML/SCL schema and vendor-specific constraints.",
      "Integrate IEDs and network settings in the system configuration tool.",
      "Engineer DataSets, reports, GOOSE subscriptions and control mappings as required.",
      "Export approved configurations and verify the downloaded IED against the master design."
    ],
    "scenario": "An ABB relay and Siemens relay need GOOSE exchange: their capability descriptions are imported into a system configurator and the final subscriber bindings are verified in each vendor tool.",
    "takeaway": "SCL is a configuration exchange format, not a real-time protocol."
  },
  {
    "question": "Explain ICD, CID, SCD and IID files with their practical differences.",
    "answer": "ICD (IED Capability Description) describes a device type or capability template. CID (Configured IED Description) describes one configured IED, often for download. SCD (Substation Configuration Description) describes the coordinated system including multiple IEDs and communications. IID (Instantiated IED Description) represents an engineered IED instance for exchange within a multi-tool workflow. Exact vendor import/export behavior varies.",
    "steps": [
      "Start with vendor ICD or supported capability export.",
      "Instantiate the actual IED and configure its name, logical devices and communication interfaces.",
      "Combine the participating IEDs in a project SCD and engineer subscriptions.",
      "Exchange IID files when the workflow calls for individual IED updates.",
      "Generate vendor-accepted CID or equivalent download file and verify installed configuration."
    ],
    "scenario": "A vendor supplies ICD for a new bay controller; after integrating it with the station SCD, the configured device-specific file is exported for commissioning.",
    "takeaway": "An ICD is not automatically the final commissioned configuration."
  },
  {
    "question": "What information is contained in an SCD file?",
    "answer": "An SCD can include the Substation electrical hierarchy, IED instances, AccessPoints, ConnectedAPs, subnetworks, IP addresses, logical nodes, DataSets, ReportControl, GSEControl, GOOSE addresses and subscriber ExtRef links. Presence and detail depend on project engineering and tool support.",
    "steps": [
      "Open the SCD in a trusted SCL viewer or engineering tool.",
      "Inspect Header and Substation sections for project identity and topology.",
      "Inspect Communication for SubNetwork, ConnectedAP, IP and GSE addressing.",
      "Inspect each IED/AccessPoint/Server/LDevice/LN for DataSets and control blocks.",
      "Inspect Inputs/ExtRef to confirm intended subscriber signal references."
    ],
    "scenario": "A GOOSE subscription is missing after an SCD update; compare publisher GSEControl and subscriber ExtRef paths before modifying a relay.",
    "takeaway": "An SCD is the integration baseline; do not assume every runtime setting is fully represented in it."
  },
  {
    "question": "Describe the complete SCL engineering workflow from design to FAT.",
    "answer": "The workflow starts from approved functional requirements and vendor capability data, produces a coordinated system configuration, exports device-specific settings, and validates the deployed behavior through controlled tests.",
    "steps": [
      "Freeze signal list, architecture, IED list, naming rules and network plan.",
      "Import capability files and create unique IED instances in the system configuration tool.",
      "Configure DataSets, RCBs, GOOSE publishers/subscribers and communications.",
      "Run schema, cross-reference and vendor compatibility checks; review changes.",
      "Export device configurations, download under controlled procedure and record versions.",
      "Test MMS reporting, GOOSE behavior, quality, controls and failure handling during FAT."
    ],
    "scenario": "During FAT, a subscriber rejects a GOOSE stream; the engineer checks SCD cross-references, regenerates the affected vendor configuration and repeats the approved test.",
    "takeaway": "The exported XML is only an intermediate deliverable; FAT evidence closes the loop."
  },
  {
    "question": "What is the difference between IED name, logical device and logical node in SCL?",
    "answer": "An IED name uniquely identifies a configured IED instance in the SCL project. A logical device groups logical nodes within a server. A logical node models a defined function, such as XCBR for breaker information or PTOC for overcurrent protection. Data references combine these levels and the data object/attribute path.",
    "steps": [
      "Identify the IED instance name in the SCD.",
      "Open the intended AccessPoint, Server and LDevice instance.",
      "Find the LN class and instance, for example XCBR1.",
      "Confirm the Data Object and Data Attribute used by the signal list.",
      "Verify the complete reference in the IED browser and SCADA mapping."
    ],
    "scenario": "After changing an IED name in an engineering tool, report and GOOSE references are reviewed because references that depend on the old name may become invalid.",
    "takeaway": "Never confuse an IED physical label with its IEC 61850 object reference."
  },
  {
    "question": "How do you configure DataSets and Report Control Blocks using SCL?",
    "answer": "A DataSet identifies a collection of data attributes or functional constraints. A ReportControl references a DataSet and defines reporting-related parameters. Buffered and unbuffered behavior, trigger options and client reservation must be checked against the IED capability and runtime implementation.",
    "steps": [
      "Identify required SCADA points and appropriate data attributes including quality and time where available.",
      "Create or verify DataSet FCDA members and functional constraints.",
      "Create the supported ReportControl referencing that DataSet.",
      "Set supported trigger options, integrity period, buffer time and report identifiers.",
      "Check available RCB instances and client ownership expectations.",
      "Download configuration and verify report enablement and actual updates with a client."
    ],
    "scenario": "SCADA can read XCBR.Pos by MMS but gets no change report: inspect the DataSet FCDA, ReportControl datSet reference, TrgOps, RptEna and client configuration.",
    "takeaway": "The number of BRCB instances is a client/IED design decision, not always a fixed count."
  },
  {
    "question": "How are GOOSE publisher and subscriber references represented in SCL?",
    "answer": "The publisher typically defines a DataSet and GSEControl under its logical node, with communication addressing in the GSE section. The subscriber uses Inputs/ExtRef references to identify required publisher data. Vendor tools may require additional mapping to internal logic.",
    "steps": [
      "Identify the publisher DataSet members and GSEControl name.",
      "Confirm GOOSE MAC, APPID, VLAN ID and priority in the Communication section.",
      "Check the subscriber Inputs/ExtRef attributes against publisher IED, LD, LN, DO and DA.",
      "Check engineering revision and subscriber binding status in vendor software.",
      "Download both sides if required and test in an isolated approved environment."
    ],
    "scenario": "GOOSE packets arrive on the subscriber port but the logic input remains invalid: verify ExtRef references, DataSet member order, confRev and the vendor internal mapping.",
    "takeaway": "Network arrival is not the same as valid subscriber mapping."
  },
  {
    "question": "What is confRev and when should it change?",
    "answer": "The configuration revision (confRev) is used with GOOSE and reporting configurations to identify relevant changes. For GOOSE, a subscriber may reject messages if the expected revision or DataSet structure does not match the publisher. Tools manage revision behavior differently; confirm against the applicable standard and vendor documentation.",
    "steps": [
      "Record current publisher configuration and subscriber expected revision.",
      "Review the changed DataSet/control-block configuration and affected subscriptions.",
      "Regenerate and validate system configuration using the approved workflow.",
      "Update the affected IEDs and verify both sides agree.",
      "Capture a valid test message and check confRev and subscriber status."
    ],
    "scenario": "After adding a GOOSE DataSet member, the subscriber reports configuration mismatch until its engineered subscription is updated.",
    "takeaway": "Never force a revision number without understanding the actual DataSet and subscriber configuration."
  },
  {
    "question": "How do you troubleshoot an SCL file that fails to import into a vendor tool?",
    "answer": "Import failure can result from malformed XML, unsupported SCL schema/version, invalid names, missing references, unsupported IED features or tool-specific restrictions. Diagnose from the first meaningful validation error and the vendor import log.",
    "steps": [
      "Save the original file and capture exact error, tool version and firmware.",
      "Run an XML parser and SCL schema validation appropriate to the file edition.",
      "Inspect namespaces, schema edition and required sections.",
      "Check duplicate IED names, broken references, DataSet members and unsupported options.",
      "Re-export using a compatible engineering-tool workflow; compare the diff.",
      "Re-import and record evidence before deploying any configuration."
    ],
    "scenario": "An IID exported by a newer vendor tool is rejected by an older system configurator; compare supported SCL editions and use a vendor-supported exchange path.",
    "takeaway": "Do not remove unknown XML sections blindly just to suppress an import error."
  },
  {
    "question": "What are common SCL configuration mistakes in multi-vendor integration?",
    "answer": "Common issues include mismatched IED naming, duplicate network addresses, unsupported logical node/data object paths, inconsistent DataSet member order, missing ExtRef bindings, wrong functional constraints and configuration revision mismatches.",
    "steps": [
      "Validate unique IED names and communication addresses.",
      "Compare publisher DataSet FCDA members with subscriber expected structure.",
      "Check functional constraints and data attribute references.",
      "Verify RCB ownership, report instances and trigger options.",
      "Run vendor interoperability checks and packet-level tests.",
      "Maintain an issue log tied to SCD revision and IED firmware."
    ],
    "scenario": "SCADA shows an invalid measurement after a relay replacement because the new model exposes a different logical-device instance; update mappings through controlled engineering.",
    "takeaway": "A syntactically valid SCD can still contain semantically incorrect mappings."
  },
  {
    "question": "How do you manage SCD revisions and change control during FAT and SAT?",
    "answer": "A controlled SCD baseline prevents divergent engineering data between station tools and deployed IEDs. Every change should have an owner, reason, approval, impacted IED list, regenerated outputs and retest evidence.",
    "steps": [
      "Back up the approved SCD and affected IED configurations before changes.",
      "Create a change record identifying exact affected signals and services.",
      "Review the XML diff and validate references, addresses and subscriptions.",
      "Export updated device files using the documented engineering chain.",
      "Deploy only with authorization and verify communication and functional tests.",
      "Archive final approved SCD, device files, version list and FAT/SAT evidence."
    ],
    "scenario": "A late GOOSE signal addition affects two relays and SCADA; the team updates the master SCD and retests publisher, subscriber and station reporting before closure.",
    "takeaway": "Avoid making undocumented changes directly on an IED that are absent from the master configuration."
  },
  {
    "question": "How do you verify that the downloaded CID matches the approved SCD?",
    "answer": "Compare the deployed IED identity, communication settings, logical-device/data references, control blocks and subscriptions with the approved baseline. Use device readback, configuration identifiers and functional testing because file names or checksums alone may not describe runtime state.",
    "steps": [
      "Identify the approved SCD revision and generated device configuration.",
      "Read back the IED configuration or use vendor comparison tools when supported.",
      "Verify IED name, IP, DataSets, RCBs, GOOSE addressing and subscriber references.",
      "Test representative status changes, reports and GOOSE inputs under approved test conditions.",
      "Document deviations, corrective changes and final configuration backup."
    ],
    "scenario": "An IED was replaced with a spare: it pings but GOOSE interlocking is unhealthy; read back the installed device configuration and compare with the approved subscriber bindings.",
    "takeaway": "Commissioning acceptance depends on verified behavior, not just a successful file download."
  }
];


const chapterSixQuestions: InterviewQuestion[] = [
  {
    "question": "Explain the end-to-end SCADA signal path from an IED to an HMI indication.",
    "answer": "SCADA displays an engineered representation of a field value. The complete path includes the physical signal, IED data object, communication service, SCADA acquisition, database tag and HMI binding. Every stage must preserve value, quality and timestamp where available.",
    "steps": [
      "Confirm the field contact or measured quantity and IED input using approved test methods.",
      "Browse the corresponding IED data object, for example XCBR.Pos.stVal, and inspect quality and timestamp.",
      "Verify MMS association, DataSet membership and report delivery, or the project's configured acquisition protocol.",
      "Match the received object reference to the SCADA database point, including inversion and quality handling.",
      "Check the HMI symbol binding, indication colors, event logging and alarm behavior.",
      "Record expected versus actual results in the FAT/SAT test sheet."
    ],
    "scenario": "Breaker opens physically and the relay shows Open, but HMI remains Closed. Compare the IED value, report capture, SCADA tag and HMI binding to find the first incorrect stage.",
    "takeaway": "Troubleshoot from field to display; successful ping does not prove point acquisition."
  },
  {
    "question": "What is signal mapping in SCADA and how do you validate it?",
    "answer": "Signal mapping links each source IED data reference or protocol address to a unique SCADA database point and its display, alarm, event and gateway destinations. Mapping must be validated against an approved signal list.",
    "steps": [
      "Obtain the approved signal list, IED naming conventions and protocol configuration.",
      "Identify each source reference, functional constraint, value type and expected engineering unit.",
      "Create or import SCADA points with consistent names, descriptions and scaling.",
      "Configure status polarity, alarm limits, quality behavior and timestamps as required.",
      "Test representative normal, abnormal and communication-failure states.",
      "Reconcile exceptions with the signal list and archive test evidence."
    ],
    "scenario": "Two feeder breaker indications appear swapped on the HMI after a database import. Compare source object references and destination tags before correcting mappings.",
    "takeaway": "Check both the signal value and its identity; a changing tag may still be the wrong tag."
  },
  {
    "question": "How do you configure and test SCADA alarms?",
    "answer": "An alarm is an engineered condition requiring operator attention. Alarm design includes activation criteria, priority, annunciation, acknowledgement, return-to-normal and historical records.",
    "steps": [
      "Identify alarm source and operating philosophy from the approved alarm list.",
      "Define activation logic, priority, deadband or delay where appropriate.",
      "Configure message text, equipment identity and acknowledgment behavior.",
      "Generate a safe simulated input or approved test stimulus.",
      "Verify activation, timestamp, priority, sound or visual indication, acknowledgment and return-to-normal.",
      "Check alarm history and document results."
    ],
    "scenario": "A transformer temperature alarm appears repeatedly around its threshold. Review analog deadband and delay rather than simply disabling the alarm.",
    "takeaway": "Alarm acknowledgement is not the same as the condition returning to normal."
  },
  {
    "question": "What is SOE and why is time synchronization important?",
    "answer": "Sequence of Events (SOE) records time-stamped changes to reconstruct the order of operations. Device-originated timestamps can be more useful than server arrival time when network delays vary. Accuracy depends on synchronization and timestamp handling.",
    "steps": [
      "Check configured time source such as SNTP, NTP, PTP or IRIG-B as supported.",
      "Verify time zone and UTC handling across devices and SCADA.",
      "Generate controlled events with known order and compare device and SCADA records.",
      "Confirm timestamps, quality, event order and millisecond resolution where supported.",
      "Investigate clock offsets, unsynchronized quality and delayed reports."
    ],
    "scenario": "After a trip, the HMI shows breaker open before protection pickup. Compare source timestamps and synchronization status before concluding the sequence is incorrect.",
    "takeaway": "Distinguish device event time from the time a SCADA server received the event."
  },
  {
    "question": "How do you implement breaker Open/Close control from an HMI?",
    "answer": "Remote breaker control follows the approved authority, interlocking and IEC 61850 control model or the project's other command protocol. A successful command request does not guarantee physical operation.",
    "steps": [
      "Confirm operator permission, Local/Remote selection and work permit requirements.",
      "Check the correct controllable object, such as CSWI.Pos or XCBR.Pos depending on design.",
      "Verify interlocks, synchrocheck and other permissives before attempting a test.",
      "For select-before-operate, validate select, operate and timeout handling.",
      "Observe command response and independently verify physical feedback.",
      "Test rejection paths, alarms and audit logs under approved isolated FAT/SAT conditions."
    ],
    "scenario": "An HMI Close button is enabled but the command fails. Check Local/Remote, interlock permissives, control object, select/operate sequence and device diagnostic response.",
    "takeaway": "Never bypass electrical interlocks to make an HMI test pass."
  },
  {
    "question": "Explain the difference between direct-operate and select-before-operate control.",
    "answer": "Direct-operate sends an operation without a preceding select stage. Select-before-operate (SBO) requires a selection phase before execution, supporting controlled operation according to the configured IEC 61850 control model.",
    "steps": [
      "Read the IED control model and SCADA command configuration.",
      "Identify select, operate, cancellation and timeout requirements.",
      "Verify origin, control number and enhanced-security termination where applicable.",
      "Test allowed and rejected commands with approved simulated equipment.",
      "Confirm the final state from independent feedback and record logs."
    ],
    "scenario": "The HMI sends Operate without Select to an SBO-configured IED and receives a rejection. Align the client command workflow with the IED control model.",
    "takeaway": "Control behavior is configured per object; do not assume every breaker uses SBO."
  },
  {
    "question": "How do you configure an HMI single-line diagram and verify dynamic symbols?",
    "answer": "An HMI single-line diagram is a graphical view tied to engineered SCADA points. It must show equipment identity, correct state, quality and control permissions without misleading the operator.",
    "steps": [
      "Build symbols according to approved electrical drawings and equipment naming.",
      "Bind each breaker, disconnector and measurement to verified database points.",
      "Define normal, open, closed, intermediate, invalid and communication-loss indications.",
      "Test each state transition and confirm colors follow the project HMI standard.",
      "Verify navigation, popup details, alarms and operator control access.",
      "Conduct a point-by-point FAT review with the signal list."
    ],
    "scenario": "A breaker symbol stays green after the communication link fails. Verify the symbol's quality-state binding, not just its Open/Closed logic.",
    "takeaway": "Bad quality must be visibly distinguishable from a valid normal state."
  },
  {
    "question": "How do you handle analog measurements and scaling in SCADA?",
    "answer": "SCADA measurements must preserve correct engineering units, sign, magnitude, range and quality. Scaling may occur in an IED, gateway or SCADA database, so duplicate scaling must be avoided.",
    "steps": [
      "Identify the source data attribute, engineering unit and multiplier.",
      "Compare IED native value with expected injected or measured value.",
      "Check gateway and SCADA transformations for duplicate factors or sign inversion.",
      "Verify display precision, limits, trends and out-of-range handling.",
      "Test several points across the operating range and record tolerances."
    ],
    "scenario": "IED reports 11.0 kV but HMI displays 11000 kV. Inspect engineering-unit multipliers and any extra scaling applied in SCADA.",
    "takeaway": "Always verify engineering units and sign, not only numeric changes."
  },
  {
    "question": "What causes SCADA communication healthy but points not updating?",
    "answer": "A healthy Ethernet link or MMS association only confirms part of the communication chain. Stale points may result from disabled reporting, wrong DataSet members, RCB ownership, trigger options, point mapping or quality issues.",
    "steps": [
      "Confirm whether the source IED value changes when the field state changes.",
      "Inspect MMS report traffic or polling responses using an approved client/capture.",
      "Verify RCB enabled state, reservation, DataSet, trigger options and integrity period.",
      "Check whether SCADA receives and decodes the expected object reference.",
      "Verify point database mapping, acquisition status, quality and HMI binding.",
      "Apply a controlled correction and repeat the test."
    ],
    "scenario": "All IED points show stale after SCADA restart. Check whether the client re-established association and re-enabled the correct report instances.",
    "takeaway": "Separate transport connectivity from application-level reporting."
  },
  {
    "question": "How do you troubleshoot missing alarms while indications are updating?",
    "answer": "An indication and its alarm may use different logic, priorities, point configurations or event paths. Working indication alone does not prove alarm engineering is correct.",
    "steps": [
      "Verify the source condition and current SCADA point value.",
      "Check alarm enablement, threshold, polarity, delay and suppression state.",
      "Inspect alarm priority, area filters and user display settings.",
      "Confirm event processing and alarm server services are healthy.",
      "Generate an approved test transition and inspect alarm history.",
      "Correct the configuration and verify activation, acknowledgment and clearance."
    ],
    "scenario": "A protection pickup bit changes on the detail page but no alarm banner appears. The point is mapped correctly, but its alarm class is disabled.",
    "takeaway": "Trace the alarm rule separately from the raw signal acquisition."
  },
  {
    "question": "Explain SCADA database engineering and change management.",
    "answer": "SCADA database engineering covers naming, point definitions, data acquisition, alarms, events, commands, calculations and HMI associations. Controlled changes prevent unintended effects across multiple displays and interfaces.",
    "steps": [
      "Back up the approved database and document the change request.",
      "Identify affected source references, tags, graphics, alarms, trends and gateway points.",
      "Modify the engineering database in a controlled environment.",
      "Validate naming, type, scaling, quality and command permissions.",
      "Run regression tests on impacted and related points.",
      "Record version, reviewer approval, deployment and rollback procedure."
    ],
    "scenario": "A renamed feeder tag fixes one HMI screen but breaks a gateway export. Use a dependency check before publishing the database change.",
    "takeaway": "SCADA changes can affect HMI, historian, alarm engine and remote gateway simultaneously."
  },
  {
    "question": "How would you perform SCADA/HMI FAT and SAT for a new bay?",
    "answer": "FAT verifies engineered behavior in a controlled environment; SAT verifies installation, interfaces and approved functionality at site. Testing must cover status, measurements, alarms, events, control, communication loss and recovery.",
    "steps": [
      "Review approved drawings, signal lists, cause-and-effect logic and test procedures.",
      "Verify device communications and time synchronization.",
      "Test each digital status and analog measurement with expected value, quality and timestamp.",
      "Verify alarms, SOE, trends and HMI symbol behavior.",
      "Test authorized commands, interlocks and rejection paths with safe isolation.",
      "Simulate approved communication failures and recovery; document defects and retests."
    ],
    "scenario": "During FAT a bay passes status tests but fails breaker Close due to missing permissive. Record the interlock condition and validate the logic rather than forcing the command.",
    "takeaway": "Acceptance requires traceable evidence and safe test boundaries."
  }
];

const chapterSevenQuestions: InterviewQuestion[] = [
  {
    "question": "Explain the SAS station-bus network architecture and the role of managed Ethernet switches.",
    "answer": "The station bus interconnects protection IEDs, BCUs, gateways, HMI and engineering stations. Managed industrial switches provide controlled Ethernet forwarding, VLANs, monitoring, redundancy and diagnostics. Network design must follow approved station architecture and traffic requirements.",
    "steps": [
      "Review the approved network topology and port schedule.",
      "Identify IED, SCADA, gateway and time-server connections and their communication protocols.",
      "Verify switch port speed, duplex, SFP type and link state.",
      "Check VLAN membership, multicast handling and redundancy settings.",
      "Test required communication paths and capture evidence before handover."
    ],
    "scenario": "A new IED is physically connected but cannot communicate with the gateway. Compare its port VLAN, IP configuration and switch MAC learning with the approved design.",
    "takeaway": "A link LED proves only a physical link, not a correct application path."
  },
  {
    "question": "What is PRP and how does it provide zero-recovery-time redundancy?",
    "answer": "Parallel Redundancy Protocol (IEC 62439-3) allows a dual-attached node to send duplicate Ethernet frames over two independent LANs, LAN A and LAN B. A receiving PRP node accepts the first valid copy and discards duplicates. With both LANs independent, a single LAN failure need not interrupt supported traffic.",
    "steps": [
      "Confirm the device is a dual-attached node and has two PRP interfaces.",
      "Check LAN A and LAN B are physically and logically independent.",
      "Verify each PRP interface is connected to the correct LAN and supervision frames are visible.",
      "Check duplicate reception and LAN health using vendor diagnostics.",
      "Isolate one LAN under an approved test plan and confirm communication continues over the other."
    ],
    "scenario": "An IED works normally until LAN A is unplugged, then loses SCADA. Investigate whether LAN B is connected, enabled, correctly switched and receiving traffic.",
    "takeaway": "PRP is not simply two uplinks into the same network; LAN independence matters."
  },
  {
    "question": "What is HSR and how is it different from PRP?",
    "answer": "High-availability Seamless Redundancy (IEC 62439-3) uses a ring of HSR-capable nodes that forward frames in both directions. A destination accepts the first copy and discards duplicates. PRP instead uses two separate parallel LANs. HSR ring nodes require appropriate HSR capability, and non-HSR equipment may connect through a RedBox.",
    "steps": [
      "Identify whether the approved topology is a PRP dual-LAN or HSR ring design.",
      "Check each HSR node has its ring ports correctly wired to its neighbors.",
      "Verify ring supervision and duplicate-discard diagnostics.",
      "Test a single ring-link failure in a controlled test and check service continuity.",
      "Document any RedBox connections and attached conventional Ethernet devices."
    ],
    "scenario": "A technician connects a conventional Ethernet switch directly as an HSR ring node and traffic fails. Check for an approved RedBox or HSR-capable device.",
    "takeaway": "PRP and HSR are distinct architectures, not interchangeable switch settings."
  },
  {
    "question": "What is RSTP and when is it used in substation networks?",
    "answer": "Rapid Spanning Tree Protocol (IEEE 802.1w) prevents Layer 2 loops by maintaining a loop-free active topology and reconverging after a change. Unlike PRP and HSR, RSTP generally involves a reconvergence interval and should not be described as zero-recovery redundancy.",
    "steps": [
      "Review the designed Layer 2 topology and redundant links.",
      "Verify the root bridge priority and switch roles are as engineered.",
      "Check RSTP is consistently enabled on intended switch ports.",
      "Inspect topology-change counters and blocked/forwarding port states.",
      "Test an approved link failure and measure the actual application impact."
    ],
    "scenario": "GOOSE supervision alarms appear for several seconds when a switch uplink fails. Determine whether the topology uses RSTP reconvergence rather than seamless redundancy.",
    "takeaway": "Never add a redundant Ethernet cable without checking for Layer 2 loops."
  },
  {
    "question": "Explain VLAN tagging and why it matters for GOOSE communication.",
    "answer": "IEEE 802.1Q VLAN tags logically separate Layer 2 traffic and can carry priority information. Conventional IEC 61850 GOOSE is Ethernet multicast; a mismatch in VLAN tagging or port membership can prevent subscriber delivery even when both IEDs have working IP connectivity.",
    "steps": [
      "Read publisher VLAN ID and priority settings from the approved SCL/IED configuration.",
      "Verify switch ingress and egress port mode, permitted VLANs and tagged/untagged behavior.",
      "Confirm publisher and subscriber reside in the intended Layer 2 broadcast domain.",
      "Capture GOOSE frames at the source and near the subscriber where permitted.",
      "Correct the VLAN path and retest subscriber supervision and functional logic."
    ],
    "scenario": "IED A and IED B respond to ping but the GOOSE subscriber shows timeout. Publisher sends tagged VLAN 100 while the subscriber-facing port only permits VLAN 200.",
    "takeaway": "Ping is an IP test; it does not validate Layer 2 multicast VLAN forwarding."
  },
  {
    "question": "How do multicast MAC addresses, APPID and switch multicast filtering affect GOOSE?",
    "answer": "GOOSE uses Layer 2 multicast destination MAC addresses and an APPID within its protocol header. Switch multicast filtering and VLAN configuration determine whether frames reach subscribed IEDs. The APPID identifies an application stream for receivers; it is not an IP port.",
    "steps": [
      "Check destination multicast MAC, APPID and VLAN in the publisher configuration.",
      "Confirm subscriber expectations and DataSet/control-block identity.",
      "Inspect switch multicast filtering or static forwarding settings where used.",
      "Use a permitted SPAN/mirror port to capture GOOSE and verify arrival.",
      "Check subscriber diagnostic status and test the configured signal."
    ],
    "scenario": "Publisher GOOSE frames are visible on one switch but absent at the subscriber port. Investigate multicast forwarding configuration before changing the IED logic.",
    "takeaway": "GOOSE multicast MAC and APPID must not be confused with TCP/IP addressing."
  },
  {
    "question": "How do you plan and troubleshoot IP addressing in a SAS network?",
    "answer": "IP addresses, subnet masks and gateways determine Layer 3 reachability for MMS, engineering access and remote services. Many station-bus functions use local subnet communication; GOOSE itself does not require an IP address because conventional GOOSE uses Ethernet Layer 2.",
    "steps": [
      "Compare each device IP address, subnet mask and default gateway with the approved IP schedule.",
      "Check for duplicate addresses and wrong subnet masks.",
      "Verify switch VLAN and port membership.",
      "Test reachability with ping where permitted, then test the actual service such as MMS TCP 102.",
      "Inspect ARP, routes and firewall policies if the service crosses network boundaries."
    ],
    "scenario": "Two IEDs use the same static IP and MMS connections become intermittent. Identify the conflict using ARP tables and switch MAC-port records.",
    "takeaway": "Separate IP/MMS troubleshooting from Layer 2 GOOSE troubleshooting."
  },
  {
    "question": "How do you troubleshoot fibre-optic Ethernet links and SFP modules?",
    "answer": "Fibre links depend on matching transceiver specifications, correct fibre type, connectors, wavelength, optical power and port settings. Link failures can also result from damaged patch cords or incorrect Tx/Rx connections.",
    "steps": [
      "Check link LEDs and switch interface counters without disturbing live circuits.",
      "Verify SFP speed, wavelength, connector and single-mode/multimode compatibility.",
      "Inspect the approved fibre route, patch-panel labels and Tx/Rx cross-connections.",
      "Review digital optical monitoring values if supported and compare with transceiver limits.",
      "Arrange approved cleaning or optical tests and verify stable link after correction."
    ],
    "scenario": "A switch reports frequent link flaps after replacing a fibre patch cord. Check connector cleanliness, bend radius and received optical power before replacing the IED.",
    "takeaway": "Never look into an optical fibre connector; follow site laser-safety procedures."
  },
  {
    "question": "How would you use Wireshark to diagnose SAS network communication problems?",
    "answer": "Wireshark captures packets to distinguish link delivery, protocol negotiation and application issues. Useful filters include goose, mms, arp, icmp and tcp.port == 102, depending on the traffic being investigated. Captures require appropriate switch mirroring and authorization.",
    "steps": [
      "Define the fault and choose a capture point that can observe the relevant direction.",
      "Configure a permitted switch mirror/SPAN port without impacting production forwarding.",
      "Capture baseline and fault conditions with synchronized timestamps.",
      "Inspect GOOSE APPID, VLAN, stNum, sqNum or MMS association and reporting as applicable.",
      "Compare source and destination captures and correlate with device diagnostics.",
      "Document packet evidence and validate the correction with a repeat capture."
    ],
    "scenario": "SCADA connects to an IED but reports stop after a restart. Capture MMS association and report traffic to determine whether the client re-enabled the expected RCB.",
    "takeaway": "Capturing on a laptop port does not automatically show traffic on every switch port."
  },
  {
    "question": "How does time synchronization work in SAS networks?",
    "answer": "Substation systems may use SNTP/NTP, PTP or IRIG-B depending on accuracy requirements and device capabilities. Consistent time enables meaningful SOE correlation and diagnostics. Network reachability alone does not guarantee synchronized clocks.",
    "steps": [
      "Identify the approved time source, protocol and required accuracy.",
      "Check time-server reachability and configuration on each device.",
      "Verify UTC/time-zone handling and daylight-saving policies in display systems.",
      "Inspect clock sync status and device time quality.",
      "Generate approved test events and compare timestamps across IED and SCADA records."
    ],
    "scenario": "Two IEDs record the same disturbance several seconds apart. Check each clock synchronization status and source before changing SOE sorting logic.",
    "takeaway": "Always distinguish event source timestamps from SCADA reception timestamps."
  },
  {
    "question": "What is the difference between a network loop, broadcast storm and normal GOOSE retransmission?",
    "answer": "A Layer 2 loop can cause frames to circulate repeatedly and overload switches; broadcast storms involve excessive broadcast traffic. GOOSE intentionally retransmits state messages with a changing interval, so repeated GOOSE frames alone are not evidence of a loop.",
    "steps": [
      "Check topology-change and interface utilization counters.",
      "Look for MAC address flapping and unexpectedly high broadcast/multicast rates.",
      "Verify RSTP or the approved PRP/HSR topology is correctly engineered.",
      "Capture traffic and inspect GOOSE stNum/sqNum to distinguish normal retransmission.",
      "Isolate the fault only through approved network maintenance procedures."
    ],
    "scenario": "After connecting an extra patch lead, switch CPU usage spikes and SCADA drops. Investigate a Layer 2 loop rather than disabling GOOSE retransmissions.",
    "takeaway": "Do not treat every repeated Ethernet frame as a fault."
  },
  {
    "question": "How do you perform network FAT/SAT for PRP, VLAN, GOOSE and MMS?",
    "answer": "Network FAT/SAT validates the approved topology, switch configuration, application connectivity, redundancy and recovery under controlled conditions. It should produce traceable evidence and avoid unapproved live outages or protection operations.",
    "steps": [
      "Review topology, IP/VLAN schedules, switch configurations and acceptance criteria.",
      "Check port labels, SFPs, link state, switch logs and device firmware/configuration versions.",
      "Verify MMS and engineering access and confirm GOOSE delivery with approved test signals.",
      "Test PRP LAN A/LAN B or HSR ring resilience only as specified in the test procedure.",
      "Check time synchronization, alarms and SCADA communication-loss indications.",
      "Save captures, diagnostic logs, results, deviations and approved as-built configuration."
    ],
    "scenario": "During FAT, removing PRP LAN A causes a gateway disconnect. Record the failure, trace LAN B forwarding and repeat the test after the approved correction.",
    "takeaway": "Prove redundancy by testing failure behavior, not only by looking at two connected cables."
  }
];

const chapterEightQuestions: InterviewQuestion[] = [
  {
    "question": "What is the difference between FAT and SAT in Substation Automation?",
    "answer": "Factory Acceptance Testing (FAT) checks the engineered SAS configuration in a controlled factory or laboratory setup against approved specifications. Site Acceptance Testing (SAT) checks the installed system, actual wiring, communications, interfaces and operational behavior at site. The exact scope depends on the project test plan.",
    "steps": [
      "Review approved functional design, signal lists, network architecture and acceptance criteria.",
      "At FAT, use simulators or connected IEDs to verify mappings, reporting, alarms, controls and redundancy.",
      "Record test stimuli, expected outcomes, actual results, screenshots and defect IDs.",
      "At SAT, verify installed hardware, wiring, fibre links, IP settings, time synchronization and real interfaces.",
      "Repeat required functional and end-to-end tests under approved site safety controls.",
      "Close punch-list items and obtain authorized sign-off."
    ],
    "scenario": "FAT passed with a simulated breaker contact, but SAT shows the wrong HMI state. Trace site wiring, IED input polarity, source object and SCADA tag instead of assuming the factory result covers installation.",
    "takeaway": "FAT proves engineered functions; SAT proves installed integration."
  },
  {
    "question": "How do you prepare an SAS FAT test procedure and checklist?",
    "answer": "A FAT procedure is a traceable set of tests tied to the approved design and contract requirements. Each test must define prerequisites, test stimulus, expected result, evidence and pass/fail criteria.",
    "steps": [
      "Collect approved SLDs, architecture drawings, IED signal lists, SCD/CID versions, HMI screenshots and control philosophy.",
      "Create a test matrix for statuses, measurements, alarms, SOE, controls, GOOSE, MMS, gateways and network resilience.",
      "Define prerequisites, simulated inputs, safe isolation and responsible witnesses.",
      "State expected indication, quality, timestamp, command response and recovery behavior.",
      "Assign unique test IDs, record actual results and attach captures or screenshots.",
      "Track deviations and retest only after approved corrections."
    ],
    "scenario": "A witness asks how to prove a protection pickup alarm. Show its approved test ID, input method, expected HMI alarm and recorded result.",
    "takeaway": "A good checklist connects every tested function to an approved requirement."
  },
  {
    "question": "How do you test digital status indications from an IED to SCADA?",
    "answer": "Digital status testing verifies the correct equipment identity, state encoding, polarity, quality, timestamp and HMI presentation through the complete signal chain.",
    "steps": [
      "Confirm the approved point list and whether the status is single-point or double-point.",
      "Apply an authorized simulated contact or IED test input; do not operate live primary equipment without permission.",
      "Check the IED binary input and logical data attribute such as XCBR.Pos.stVal when applicable.",
      "Confirm MMS report or configured acquisition reaches the SCADA point.",
      "Verify HMI Open, Closed, intermediate or invalid states, including quality indication.",
      "Record both state transitions and restore the test condition."
    ],
    "scenario": "A breaker Open input is active in the relay but HMI shows Closed. Check contact inversion, double-point encoding and SCADA mapping.",
    "takeaway": "Always verify both value and quality, not only a color change."
  },
  {
    "question": "How do you perform analog signal testing and scaling verification?",
    "answer": "Analog testing checks source value, engineering units, multiplier, sign, display precision, alarm limits and trend behavior. Incorrect scaling can create plausible but dangerous values.",
    "steps": [
      "Identify the source data attribute, CT/VT ratio and engineering unit from approved documents.",
      "Use an authorized injection or simulator at several points across the range.",
      "Compare IED measured value and quality with expected test values.",
      "Check gateway and SCADA conversion factors to avoid double scaling.",
      "Verify HMI units, sign, decimal places, trends and alarm thresholds.",
      "Document deviations, tolerances and as-left values."
    ],
    "scenario": "A 110 V simulated secondary value appears as 110 kV instead of the expected engineering value. Verify ratio handling and whether scaling was applied twice.",
    "takeaway": "Test multiple values, including zero and negative values when applicable."
  },
  {
    "question": "How do you test GOOSE publisher and subscriber operation during FAT?",
    "answer": "GOOSE FAT verifies that the publisher DataSet and GoCB match the subscriber configuration and that approved signal changes are received with correct validity and supervision.",
    "steps": [
      "Confirm approved SCD and both IED configuration versions.",
      "Verify publisher DataSet members, GoCB, APPID, multicast MAC, VLAN and confRev.",
      "Check subscriber external references and expected signal order and types.",
      "Use an approved test signal and observe the publisher state change.",
      "Capture GOOSE traffic and inspect stNum, sqNum, APPID and VLAN information.",
      "Verify subscriber input, configured logic response and communication-loss behavior without energizing live trip circuits."
    ],
    "scenario": "Publisher IED changes its output but subscriber stays unchanged. Inspect VLAN forwarding, subscription mapping and confRev before changing logic.",
    "takeaway": "GOOSE is Layer 2 multicast; successful ping does not validate it."
  },
  {
    "question": "How do you validate MMS reporting and RCB behavior?",
    "answer": "MMS reporting tests confirm that the client receives correct DataSet changes with quality and timestamps, and that the configured report control blocks are properly enabled and owned.",
    "steps": [
      "Verify MMS association and access to the correct logical device.",
      "Inspect DataSet references and BRCB or URCB configuration.",
      "Check RptEna, reservation/ownership, trigger options, BufTm, IntgPd and ConfRev as applicable.",
      "Generate approved changes and verify reports at the client and HMI.",
      "Test reconnect behavior and buffered delivery when BRCB behavior is in scope.",
      "Compare reported values, quality and timestamps to source IED data."
    ],
    "scenario": "After SCADA restart, values remain stale despite successful ping. Check report reservation and whether the client re-enabled its RCB instance.",
    "takeaway": "Separate MMS connection testing from report-delivery testing."
  },
  {
    "question": "How do you test breaker Open/Close commands safely during FAT and SAT?",
    "answer": "Breaker command testing validates authorization, control model, interlocks, command response and independent feedback. Live switching must follow site operating rules and approved isolation procedures.",
    "steps": [
      "Obtain approved switching/test authorization and isolate physical outputs when the procedure requires.",
      "Verify Local/Remote status, operator access and correct controllable object.",
      "Confirm Direct Operate or Select-Before-Operate configuration and command timeout.",
      "Test valid and invalid permissive conditions without bypassing protection interlocks.",
      "Issue an authorized simulated command and inspect IED acceptance or rejection diagnostics.",
      "Verify independent status feedback, event logs and restoration of the original state."
    ],
    "scenario": "Close command is rejected while an earth switch is indicated Closed. Confirm the interlock is working and record the expected rejection.",
    "takeaway": "Never defeat an interlock merely to pass a test."
  },
  {
    "question": "How do you verify alarms, SOE and time synchronization during testing?",
    "answer": "Alarm and SOE testing checks activation logic, priority, acknowledgement, return-to-normal and event chronology. Accurate sequence reconstruction requires trustworthy device timestamps and synchronized clocks.",
    "steps": [
      "Confirm the approved alarm list, priorities and event sources.",
      "Verify IED and SCADA time sources, synchronization status and UTC/time-zone settings.",
      "Generate controlled alarm and status transitions in known order.",
      "Check HMI banner, alarm history, acknowledgement and clearance behavior.",
      "Compare IED event timestamps with SCADA SOE records and quality.",
      "Record clock offset or ordering discrepancies and repeat after correction."
    ],
    "scenario": "Trip appears before pickup in the SOE. Compare source timestamps and clock status before assuming protection logic is wrong.",
    "takeaway": "Distinguish device event time from SCADA receipt time."
  },
  {
    "question": "How do you perform PRP/HSR redundancy and network failover tests?",
    "answer": "Redundancy testing checks the approved dual-network or ring design under controlled link failures. PRP uses independent LAN A and LAN B paths for dual-attached nodes; HSR forwards frames around a ring.",
    "steps": [
      "Review approved topology and identify DAN, SAN, RedBox or HSR nodes as applicable.",
      "Check switch port, fibre, SFP and redundancy diagnostics in healthy state.",
      "Establish baseline MMS/GOOSE traffic and alarms.",
      "Disconnect only the approved test link under the authorized procedure.",
      "Verify communication continuity, redundancy diagnostics, alarm behavior and recovery.",
      "Restore links and archive logs, captures and measured results against project criteria."
    ],
    "scenario": "MMS disconnects when PRP LAN A is removed. Investigate LAN B configuration, cabling and node redundancy status rather than claiming the topology is redundant.",
    "takeaway": "Two physical cables alone do not prove fault tolerance."
  },
  {
    "question": "How do you verify gateway communication with a remote control centre?",
    "answer": "Gateway testing validates correct mapping, scaling, cause-of-transmission or event behavior, quality and command handling for the configured external protocol such as IEC 60870-5-104 or DNP3.",
    "steps": [
      "Review the approved SCADA-to-gateway and gateway-to-control-centre signal lists.",
      "Confirm protocol link, addressing, security and time synchronization settings.",
      "Generate approved source status and analog changes and compare local and remote values.",
      "Check quality, timestamps, spontaneous events, interrogation and scaling as supported.",
      "Test authorized remote commands and rejected conditions in an isolated environment.",
      "Record all mismatches, resolve mapping issues and retest end to end."
    ],
    "scenario": "Local SCADA shows a feeder alarm but RCC does not. Trace the source tag, gateway export mapping, protocol event queue and remote point address.",
    "takeaway": "Remote indication requires its own end-to-end acceptance evidence."
  },
  {
    "question": "How do you document and resolve FAT/SAT punch-list defects?",
    "answer": "A punch list tracks deviations against requirements with evidence, severity, owner, correction and retest status. It supports traceable acceptance and prevents undocumented field changes.",
    "steps": [
      "Record test ID, equipment identity, software/configuration version and expected result.",
      "Capture actual behavior with timestamps, logs, screenshots or packet traces.",
      "Classify impact and assign the responsible engineer or vendor.",
      "Agree on corrective action through project change control.",
      "Apply the approved correction and perform targeted plus regression testing.",
      "Update as-built records and obtain witness closure or documented concession."
    ],
    "scenario": "A GOOSE subscription works after changing confRev-related configuration. Update both configuration baselines and attach the passing retest evidence.",
    "takeaway": "A defect is closed by verified retest, not by changing its status in a spreadsheet."
  },
  {
    "question": "Describe your troubleshooting approach when multiple SAS FAT tests fail at once.",
    "answer": "Use a structured fault-isolation method to find shared dependencies before changing individual points. Common causes include time source faults, switch VLAN issues, MMS client/report configuration and database imports.",
    "steps": [
      "List all failed tests and identify common equipment, protocol, network segment or software version.",
      "Check recent configuration changes and compare against approved baselines.",
      "Verify power, physical links, VLANs, IP addressing and switch diagnostics.",
      "Inspect IED values, protocol packets, SCADA acquisition and HMI tags to locate the first failed stage.",
      "Apply one approved correction at a time and retest affected and neighboring functions.",
      "Document root cause, preventive action and final evidence."
    ],
    "scenario": "All bay statuses become stale after a database deployment while GOOSE remains healthy. Focus on shared MMS reporting or SCADA acquisition before editing every HMI symbol.",
    "takeaway": "Find the first failing common layer and preserve evidence before making changes."
  }
];

const chapterNineQuestions: InterviewQuestion[] = [
  {
    "question": "How do you capture IEC 61850 MMS traffic in Wireshark?",
    "answer": "MMS is normally carried over TCP port 102 using the ISO-on-TCP stack. A capture must be taken at a point where the relevant client/server frames are visible.",
    "steps": [
      "Confirm IED and SCADA IP addresses",
      "configure a switch mirror/SPAN port or approved network TAP",
      "start capture before reconnecting the client",
      "filter tcp.port == 102",
      "inspect TCP setup, COTP, MMS association and subsequent services",
      "compare captures against SCADA diagnostics."
    ],
    "scenario": "An IED pings successfully but SCADA stays disconnected. The capture shows TCP SYN retransmissions to port 102, indicating an access, routing or server-listening problem.",
    "takeaway": "Ping verifies IP reachability, not MMS service availability."
  },
  {
    "question": "Which Wireshark filters are useful for SAS troubleshooting?",
    "answer": "Use display filters to isolate traffic without altering the original capture. The exact filter depends on protocol and Wireshark version.",
    "steps": [
      "Start with ip.addr == 192.168.1.10 for an example IED",
      "use tcp.port == 102 for MMS",
      "goose for GOOSE",
      "sv for sampled values when supported",
      "arp for address resolution",
      "icmp for ping",
      "vlan for tagged Ethernet",
      "inspect frame details rather than relying on filter counts."
    ],
    "scenario": "GOOSE status is missing at the subscriber; goose shows no frames at the capture point, so inspect VLAN membership and mirroring configuration.",
    "takeaway": "A display filter hides packets; it does not prove traffic is absent elsewhere."
  },
  {
    "question": "How do you troubleshoot MMS association failures?",
    "answer": "MMS communication depends on IP connectivity, TCP port 102, protocol negotiation, server access and compatible client configuration.",
    "steps": [
      "Check physical link and addressing",
      "verify route and firewall ACLs",
      "capture TCP handshake",
      "inspect COTP and MMS initiate exchange",
      "review server connection limits and authentication or access settings if applicable",
      "compare client and IED diagnostics",
      "retry with approved test client."
    ],
    "scenario": "TCP handshake completes but MMS initiate is rejected after a firmware update. Compare negotiated parameters and server access settings.",
    "takeaway": "Identify the exact protocol stage that fails."
  },
  {
    "question": "How do you verify that IEC 61850 reports are being received?",
    "answer": "An active MMS association does not guarantee report delivery. Reporting requires correctly configured and enabled Report Control Blocks and DataSets.",
    "steps": [
      "Confirm IED data changes",
      "inspect the DataSet members",
      "verify BRCB/URCB selection, reservation and RptEna",
      "capture MMS report information",
      "check trigger options, BufTm and IntgPd",
      "compare report object references, quality and timestamps with SCADA tags."
    ],
    "scenario": "Breaker status changes in IED but no report reaches SCADA after a restart. Client may not have re-enabled its RCB.",
    "takeaway": "Check both the RCB configuration and client runtime ownership."
  },
  {
    "question": "How do you analyze GOOSE stNum and sqNum?",
    "answer": "In conventional IEC 61850 GOOSE, stNum advances when the published state changes and sqNum tracks retransmissions within a state. Values must be interpreted with the packet timeline and configuration.",
    "steps": [
      "Capture goose traffic",
      "isolate the publisher by source MAC or goID",
      "inspect stNum and sqNum over time",
      "trigger a permitted state change",
      "confirm stNum advances",
      "check retransmissions and subscriber supervision",
      "correlate with IED event logs."
    ],
    "scenario": "Publisher stNum changes but subscriber remains stale. Inspect DataSet mapping, confRev and destination VLAN rather than assuming the publisher failed.",
    "takeaway": "State change and retransmission are different events."
  },
  {
    "question": "How do you troubleshoot a GOOSE VLAN mismatch?",
    "answer": "GOOSE is typically Layer 2 multicast and may carry IEEE 802.1Q VLAN tags. The switching path must carry the configured multicast traffic to the subscriber.",
    "steps": [
      "Verify publisher VLAN ID and priority",
      "inspect tagged packets at the source",
      "review ingress/egress switch VLAN settings and trunk/access behavior",
      "check multicast filtering",
      "capture at subscriber port",
      "confirm subscriber accepts the configured GOOSE stream",
      "retest under controlled conditions."
    ],
    "scenario": "GOOSE frames are visible on the publisher port but absent at the subscriber port after a switch replacement. Compare switch VLAN and multicast configuration.",
    "takeaway": "GOOSE can fail even while IP ping works."
  },
  {
    "question": "What does confRev mismatch mean in GOOSE troubleshooting?",
    "answer": "confRev is the configuration revision for a GOOSE control block and helps receivers detect incompatible configuration. A mismatch can occur after changing a published DataSet or its configuration.",
    "steps": [
      "Read publisher GoCB and subscriber expected confRev",
      "compare DataSet member count, order and types",
      "confirm SCD/CID baseline",
      "regenerate subscriber mapping using the approved engineering workflow",
      "download and validate configuration",
      "capture GOOSE and retest."
    ],
    "scenario": "Publisher DataSet gained a new status signal but subscriber still uses old SCD. GOOSE packets arrive, yet subscriber marks them invalid.",
    "takeaway": "Network delivery alone does not prove application compatibility."
  },
  {
    "question": "How do you identify duplicate IP addresses using packet captures?",
    "answer": "Duplicate IPs may cause intermittent connectivity, ARP changes and communication flapping. Confirm with switch and host evidence before making address changes.",
    "steps": [
      "Capture arp traffic",
      "observe conflicting MAC addresses claiming the same IP",
      "check switch MAC address table and port",
      "compare device configuration against the approved IP plan",
      "isolate and correct the duplicate under change control",
      "clear or refresh ARP as appropriate",
      "retest MMS."
    ],
    "scenario": "Two IEDs are accidentally assigned the same IP and SCADA alternates between connected and disconnected.",
    "takeaway": "ARP evidence and the approved IP plan establish the root cause."
  },
  {
    "question": "How do you troubleshoot TCP retransmissions in MMS traffic?",
    "answer": "TCP retransmissions indicate segments may not have been acknowledged in time; they can arise from loss, congestion, asymmetric captures or endpoint behavior. They are symptoms, not a diagnosis.",
    "steps": [
      "Capture at an appropriate network point",
      "inspect sequence numbers, RTT and retransmission patterns",
      "check interface errors and switch counters",
      "compare capture near sender and receiver when possible",
      "review CPU load and bandwidth",
      "test after a controlled correction."
    ],
    "scenario": "MMS reporting is delayed during heavy network traffic. Packet capture shows repeated retransmissions and switch interface drops.",
    "takeaway": "Correlate packet evidence with switch counters before concluding the network is faulty."
  },
  {
    "question": "How do you verify PRP redundancy using Wireshark?",
    "answer": "PRP sends duplicate frames over independent LAN A and LAN B for doubly attached nodes. Captures and device diagnostics can help verify both paths and duplicate handling.",
    "steps": [
      "Identify the PRP-capable ports and independent LANs",
      "capture at each LAN where permitted",
      "inspect PRP trailer and sequence information with a capable decoder",
      "verify traffic on both paths",
      "isolate one path during approved FAT",
      "confirm no unacceptable interruption and monitor duplicate-discard counters."
    ],
    "scenario": "LAN A fibre is disconnected during FAT and SCADA remains operational through LAN B; diagnostics confirm single-path operation.",
    "takeaway": "PRP requires two independent networks, not just two cables into one unmanaged path."
  },
  {
    "question": "How do you troubleshoot time synchronization issues in event records?",
    "answer": "SOE analysis depends on synchronized device clocks and correct timestamp interpretation. Packet capture can supplement device time-source diagnostics.",
    "steps": [
      "Verify device time source and lock/synchronization state",
      "capture NTP/SNTP or PTP traffic where relevant",
      "inspect network reachability and VLAN path",
      "check UTC and time zone conversion in SCADA",
      "compare device event timestamps with server receive times",
      "repeat a controlled ordered-event test."
    ],
    "scenario": "Protection event appears after breaker-open in SCADA despite earlier pickup; device clock is several seconds behind.",
    "takeaway": "Distinguish source timestamps from SCADA receipt timestamps."
  },
  {
    "question": "Describe your systematic workflow for an unknown IEC 61850 communication fault.",
    "answer": "Troubleshoot layer by layer while preserving evidence and changing one variable at a time. Differentiate physical connectivity, network delivery, application association and point configuration.",
    "steps": [
      "Record symptoms, affected devices and last known good state",
      "verify power, ports, fibre and switch counters",
      "check IP and VLAN where applicable",
      "inspect MMS/GOOSE/SV captures",
      "compare SCD/CID, RCB/GoCB and subscriber settings",
      "verify SCADA mappings and quality",
      "apply approved fix, retest and document root cause."
    ],
    "scenario": "Following a switch configuration change, MMS remains healthy but GOOSE interlocking fails. Packet captures isolate missing multicast forwarding rather than an IED logic fault.",
    "takeaway": "Avoid random configuration changes; isolate the first failed layer."
  }
];

const chapterTenQuestions: InterviewQuestion[] = [
  {
    "question": "How do you plan integration of Siemens, Schneider, ABB and GE protection IEDs into one SAS?",
    "answer": "Multi-vendor integration starts with an approved interface matrix. IEC 61850 interoperability is based on services, supported data models and tested configuration, not simply the presence of an Ethernet port. Vendor tools differ in import/export and control behavior.",
    "steps": [
      "Collect approved signal lists, network diagrams, device models, firmware and ICD/IID/CID files.",
      "Confirm each IED supports the required MMS, reporting, GOOSE and control services.",
      "Allocate unique IED names, IP addresses, VLANs and time synchronization.",
      "Build a common SCD where the engineering workflow supports it; validate vendor-specific imports and exports.",
      "Test data acquisition, commands, quality, timestamps and GOOSE subscriptions during FAT."
    ],
    "scenario": "A new ABB relay is visible in the network but its signals do not appear in a Schneider-based SCADA: validate its actual IEC 61850 object references, reporting and point mapping rather than assuming vendor naming is identical.",
    "takeaway": "Use an interface matrix and evidence-based point-by-point testing."
  },
  {
    "question": "What checks are needed before importing an ICD or IID file from a different vendor?",
    "answer": "An ICD describes device capability while an IID can represent an instantiated IED configuration. File availability alone does not guarantee compatible engineering features or the latest installed device settings.",
    "steps": [
      "Verify the exact device type, firmware and SCL edition compatibility.",
      "Validate XML structure, namespaces and unique IED names.",
      "Inspect logical devices, logical nodes, DataSets and report/GOOSE capabilities.",
      "Compare imported object references with the approved signal list.",
      "Resolve import warnings, preserve backups and record version changes."
    ],
    "scenario": "A Siemens device file imports but several logical nodes are missing in the system configurator: compare supported SCL edition, namespaces and exported configuration.",
    "takeaway": "Treat imported engineering files as configuration inputs requiring verification."
  },
  {
    "question": "Why can an MMS connection work while reports from a multi-vendor IED do not arrive?",
    "answer": "MMS association proves basic application connectivity, but reporting requires a compatible report control block, DataSet, ownership and client configuration. Different devices may implement optional services differently.",
    "steps": [
      "Confirm the association and browse live values using an IEC 61850 client.",
      "Identify the correct BRCB or URCB and DataSet reference.",
      "Check reservation or ownership, RptEna, trigger options and integrity period.",
      "Check OptFlds, buffer handling and client support for report structure.",
      "Capture reports and verify SCADA tag decoding and mapping."
    ],
    "scenario": "A GE relay responds to MMS reads but the HMI stays stale: the SCADA client is enabling a non-existent RCB instance after a firmware change.",
    "takeaway": "Distinguish reading data from receiving unsolicited reports."
  },
  {
    "question": "How do you configure GOOSE communication between two different vendors?",
    "answer": "GOOSE interoperability requires the publisher to send a defined DataSet and the subscriber to consume its exact members with correct engineering references and supervision. Publisher and subscriber tools may use different configuration workflows.",
    "steps": [
      "Define and validate publisher DataSet and GoCB in its vendor tool.",
      "Confirm destination multicast MAC, APPID, VLAN ID/priority, GoID and confRev.",
      "Import publisher information into the subscriber tool or SCD workflow.",
      "Map each subscribed value to the correct external reference and internal logic input.",
      "Download approved configurations and verify live reception and quality in a controlled test."
    ],
    "scenario": "A Schneider IED publishes GOOSE but a Siemens subscriber shows invalid input: compare the DataSet order, type, confRev and subscriber binding.",
    "takeaway": "GOOSE packets on a switch do not prove the subscriber accepted their contents."
  },
  {
    "question": "What is confRev and how can a mismatch affect GOOSE integration?",
    "answer": "The GOOSE configuration revision identifies the publisher DataSet configuration version. A subscriber may reject or flag messages when its expected revision differs from the transmitted one.",
    "steps": [
      "Read the current publisher GoCB and DataSet configuration.",
      "Capture the GOOSE frame and inspect confRev and DataSet references.",
      "Check subscriber expected revision and configured external references.",
      "Re-export and re-import the approved publisher description if the DataSet changed.",
      "Retest value, quality, communication supervision and logic response."
    ],
    "scenario": "A relay replacement changes the published DataSet; frames are visible but the subscriber marks the GOOSE input invalid due to revision mismatch.",
    "takeaway": "Never solve a mismatch by guessing revision values; synchronize engineering configurations."
  },
  {
    "question": "How do you handle different logical node naming conventions across vendors?",
    "answer": "IEC 61850 standardizes logical-node classes and data structures, but logical device names, prefixes, instances and optional data vary by implementation. Integration must use actual object references.",
    "steps": [
      "Browse each device or inspect its approved SCL file.",
      "Record the full object reference and functional constraint for each required point.",
      "Map to project-standard SCADA tags without assuming identical naming.",
      "Check data type, quality, timestamp and state encoding.",
      "Test source-to-HMI behavior for every critical point."
    ],
    "scenario": "One relay exposes breaker position under a different logical-device path from another relay; a copied tag template silently points to the wrong object.",
    "takeaway": "Use exact object references rather than memorized vendor-specific paths."
  },
  {
    "question": "How do you troubleshoot data type or quality mismatch after an IED replacement?",
    "answer": "A replacement may change the supported data attribute, quality handling or encoding even when the visible signal name is similar. Incorrect mapping can cause invalid displays or alarms.",
    "steps": [
      "Compare old and new SCL data models and firmware versions.",
      "Inspect actual value, data type, functional constraint, q and t attributes.",
      "Check SCADA point type, scaling, status inversion and enum interpretation.",
      "Update mapping through approved change control.",
      "Test normal, abnormal and bad-quality cases and preserve rollback."
    ],
    "scenario": "After a relay upgrade, an HMI shows an intermediate breaker state as Closed because the SCADA point treats a double-point status as Boolean.",
    "takeaway": "IEC 61850 double-point status must not be reduced to Boolean without defined mapping."
  },
  {
    "question": "What is the correct way to validate multi-vendor breaker control?",
    "answer": "Breaker control must honor each IED control model, access authority and interlocks. Vendor implementations may expose different diagnostics or support different control options.",
    "steps": [
      "Identify the controlled object and configured ctlModel from the device.",
      "Verify Local/Remote, authority, interlocks and synchrocheck requirements.",
      "Configure direct-operate or select-before-operate according to the actual model.",
      "Perform only approved isolated FAT/SAT command tests.",
      "Inspect command responses, rejection reasons, event logs and independent position feedback."
    ],
    "scenario": "SCADA can read a GE breaker status but its Close command fails because the client uses direct operate while the IED requires select-before-operate.",
    "takeaway": "A successful MMS association does not imply command permission."
  },
  {
    "question": "How do you verify interoperability after a firmware upgrade?",
    "answer": "Firmware can alter supported services, SCL exports, control behavior or reporting details. Interoperability requires impact analysis and regression testing rather than assuming unchanged behavior.",
    "steps": [
      "Record the old and new firmware, engineering files and configuration backups.",
      "Review vendor release notes and compatibility requirements.",
      "Compare exported data model, DataSets, RCBs and GoCBs.",
      "Check protocol associations, reports, GOOSE subscription and controls.",
      "Run targeted FAT regression and approve deployment with rollback readiness."
    ],
    "scenario": "Following an IED firmware update, the SCADA client cannot reserve its former BRCB instance; investigate service/configuration changes before modifying the production database.",
    "takeaway": "Always include communication regression tests in firmware change plans."
  },
  {
    "question": "What tools would you use to diagnose a Siemens/ABB/Schneider/GE integration issue?",
    "answer": "Use the vendor engineering tool for device configuration, an independent IEC 61850 client for data browsing, and network capture tools for protocol evidence. Tool names and supported features depend on product generation.",
    "steps": [
      "Verify device configuration in the appropriate vendor tool such as DIGSI, PCM600, Easergy/related Schneider engineering software or GE EnerVista.",
      "Browse the IED using a compatible IEC 61850 test client where permitted.",
      "Capture MMS or GOOSE frames with Wireshark at an approved monitoring point.",
      "Compare observed object references and packets against the approved SCD and signal list.",
      "Document root cause, corrective action and regression tests."
    ],
    "scenario": "An ABB device looks correct in PCM600 but the station SCADA reports invalid quality: use independent data browsing to separate source quality from client mapping.",
    "takeaway": "Use independent observations to distinguish IED, network and SCADA faults."
  },
  {
    "question": "How do you resolve duplicate IED names or IP addresses during commissioning?",
    "answer": "Duplicate identities can cause ambiguous SCL references, network connectivity faults and incorrect station mapping. Both IEC 61850 naming and IP planning must be controlled.",
    "steps": [
      "Check the approved IP and IED naming schedule.",
      "Compare installed device identity, IP, subnet and VLAN settings.",
      "Inspect ARP tables and switch MAC address tables for conflicts.",
      "Correct identities using an approved change request and update SCL/database references.",
      "Retest connectivity, reports, GOOSE and HMI mapping."
    ],
    "scenario": "Two newly installed feeder relays have the same IP address, causing intermittent MMS communication and changing ARP entries.",
    "takeaway": "Check address uniqueness before investigating complex application faults."
  },
  {
    "question": "How do you conduct FAT for a mixed-vendor IEC 61850 SAS?",
    "answer": "Mixed-vendor FAT should verify interoperability at signal, service and functional levels. Evidence must be traceable to approved specifications, not limited to device ping tests.",
    "steps": [
      "Approve the interface matrix, SCD, signal list and test procedures.",
      "Verify time sync, physical/network configuration and MMS associations.",
      "Test each critical indication, measurement, alarm, quality and report behavior.",
      "Test GOOSE subscription, supervision, failure and recovery under safe isolation.",
      "Verify commands, interlocks and rejection handling with approved test boundaries.",
      "Log defects, retest corrective actions and retain captures/screenshots."
    ],
    "scenario": "During FAT, a subscriber loses GOOSE after a VLAN change while MMS still works; verify switch VLAN membership and multicast forwarding separately.",
    "takeaway": "Demonstrate end-to-end functions, not only protocol connectivity."
  }
];

const chapterElevenQuestions: InterviewQuestion[] = [
  {
    "question": "What is the role of a station gateway in a Substation Automation System?",
    "answer": "A station gateway collects selected indications, measurements, events and controls from bay-level IEDs and exposes them to a remote control centre through the agreed telecontrol protocol. It is not a substitute for protection logic; its mapping, timestamps, quality and command permissions are engineered separately.",
    "steps": [
      "Review the approved architecture and signal list, identifying local IEDs and remote masters.",
      "Configure upstream IED connections such as IEC 61850 MMS or Modbus according to the project.",
      "Create the gateway point database with source references, types, scaling and quality rules.",
      "Configure the remote protocol endpoint and permitted command direction.",
      "Verify each point from source IED through gateway to the simulated control-centre master.",
      "Test communication failure, recovery and event buffering where supported."
    ],
    "scenario": "The local HMI shows the breaker open but the remote control centre shows closed. Check the IED value, gateway input, telecontrol information-object mapping and master interpretation in that order.",
    "takeaway": "Gateway integration is end-to-end point engineering, not merely enabling a protocol."
  },
  {
    "question": "How does IEC 61850 data map to IEC 60870-5-104 information objects?",
    "answer": "IEC 61850 uses object references and data attributes such as XCBR1.Pos.stVal, quality and timestamp. IEC 60870-5-104 represents telecontrol information using information-object addresses (IOAs), type identifiers and cause of transmission. The gateway must deliberately map values, quality, timestamps and semantics; there is no universal automatic one-to-one mapping.",
    "steps": [
      "Obtain the IEC 61850 source reference and expected data type.",
      "Choose the IEC 104 type identification appropriate for single-point, double-point or measured value information.",
      "Assign a unique IOA within the correct common address of ASDU.",
      "Configure value conversion, quality flags and source timestamp handling.",
      "Verify spontaneous and interrogation responses at the IEC 104 master.",
      "Test abnormal quality and time-invalid conditions."
    ],
    "scenario": "A double-point breaker indication is configured as a single-point IEC 104 type. The RCC display interprets it incorrectly; correct the semantic mapping and retest both positions.",
    "takeaway": "Match meaning and quality, not just numeric addresses."
  },
  {
    "question": "Explain the difference between IEC 60870-5-101 and IEC 60870-5-104.",
    "answer": "IEC 101 is a telecontrol protocol commonly carried over serial links, while IEC 104 transports the IEC 101 application information over TCP/IP networks. Both require correct station addressing, information objects, causes of transmission and master/slave or controlling/controlled station behavior.",
    "steps": [
      "Identify whether the project uses serial IEC 101 or Ethernet IEC 104.",
      "For IEC 101 verify baud rate, parity, link addresses and balanced/unbalanced mode as configured.",
      "For IEC 104 verify IP connectivity, TCP port 2404, common ASDU address and IOAs.",
      "Check interrogation, spontaneous events, time synchronization and command handling.",
      "Record master-side and gateway-side traces to isolate a mismatch."
    ],
    "scenario": "A serial RTU migration to IEC 104 retains the same point semantics but requires new IP/TCP and session settings. Confirm master point addressing rather than assuming the old serial link settings apply.",
    "takeaway": "IEC 104 is not simply IEC 101 packets tunneled unchanged over Ethernet."
  },
  {
    "question": "What are the main IEC 104 connection and session checks?",
    "answer": "IEC 104 normally uses TCP port 2404 and APCI control frames. The controlling station starts data transfer with STARTDT, and I-format frames carry ASDUs. Sequence counters, acknowledgements, timers and test frames support reliable session operation.",
    "steps": [
      "Check link state, IP, subnet, route and firewall rules.",
      "Verify TCP establishment to the configured IEC 104 server port.",
      "Inspect STARTDT activation/confirmation and subsequent I-format data.",
      "Check send/receive sequence counters and timer-related disconnects.",
      "Verify common address, IOA and type identification in application data.",
      "Perform general interrogation and confirm point updates."
    ],
    "scenario": "TCP connects but the master receives no measurements. Inspect STARTDT state and GI request/response before changing gateway point mapping.",
    "takeaway": "TCP connected does not necessarily mean IEC 104 data transfer is active."
  },
  {
    "question": "What is General Interrogation (GI) in IEC 104?",
    "answer": "General Interrogation is a request from the controlling station for the current state of configured process information. It complements spontaneous reporting of changes and helps establish a consistent picture after a connection or restart.",
    "steps": [
      "Establish and start the IEC 104 data-transfer session.",
      "Send a GI command with the configured interrogation qualifier.",
      "Verify activation confirmation, relevant process ASDUs and activation termination.",
      "Compare returned values and quality against gateway source points.",
      "Verify spontaneous changes are subsequently reported as configured."
    ],
    "scenario": "After a control-centre reconnect, the master has blank statuses until a GI is issued. Verify the reconnect sequence and whether the master initiates interrogation.",
    "takeaway": "GI retrieves current state; it does not replace event/SOE engineering."
  },
  {
    "question": "How do you configure Modbus RTU/TCP points in a gateway?",
    "answer": "Modbus accesses coils, discrete inputs, input registers and holding registers. The engineering task is to map each device address and function code to the correct signal with proper word order, data type, scaling and polling behavior.",
    "steps": [
      "Review the device Modbus register map and unit/slave ID.",
      "Configure RTU serial settings or Modbus TCP IP/port 502 as applicable.",
      "Select the correct function code and address offset convention.",
      "Interpret 16-bit, 32-bit, signed and floating-point values with correct word/byte order.",
      "Apply engineering scaling once and configure scan intervals/timeouts.",
      "Compare gateway readings with the source device under several test values."
    ],
    "scenario": "A power meter displays 12.5 MW locally but the gateway reads an impossible number. Check register offset, float word order and scaling before replacing hardware.",
    "takeaway": "Modbus register numbering conventions frequently cause off-by-one errors."
  },
  {
    "question": "How would you troubleshoot a gateway receiving IEC 61850 MMS but not sending IEC 104 points?",
    "answer": "The failure may be at the source mapping, gateway point processing, IEC 104 session, information-object configuration or master database. Test each boundary with observed values and protocol traces.",
    "steps": [
      "Confirm the live IEC 61850 object value, quality and MMS reporting or polling.",
      "Check the gateway internal point status and any transform/inversion rules.",
      "Verify IEC 104 connection, STARTDT and master interrogation.",
      "Inspect transmitted ASDU type, IOA, common address, value and quality.",
      "Compare master configuration and event filters with the transmitted object.",
      "Retest a controlled change and save logs from both sides."
    ],
    "scenario": "Gateway diagnostics show breaker status changing, but the RCC point remains static. A mismatched IOA at the master explains the fault despite healthy communications.",
    "takeaway": "Use protocol captures and gateway internal values to pinpoint the failing stage."
  },
  {
    "question": "How do you engineer remote breaker control through a gateway safely?",
    "answer": "Remote control must preserve authorization, select/execute behavior where configured, local/remote authority, interlocks, feedback and auditability. Mapping a command IOA to an IEC 61850 controllable object is only one part of the safety chain.",
    "steps": [
      "Confirm approved remote-control philosophy and permitted equipment.",
      "Map the IEC 104 command object to the correct IEC 61850 control object and control model.",
      "Validate select-before-execute, timeouts, origin and negative responses where applicable.",
      "Verify Local/Remote status, electrical interlocks and synchrocheck permissives.",
      "Test commands only in approved FAT/SAT isolation or simulation.",
      "Confirm independent feedback and log both accepted and rejected commands."
    ],
    "scenario": "The RCC sends Close but the breaker remains open because the bay is in Local mode. Gateway should return the appropriate failure/status; do not bypass the selector.",
    "takeaway": "A command acknowledgement is not proof that the breaker physically operated."
  },
  {
    "question": "How are quality and timestamps handled during protocol conversion?",
    "answer": "Source quality and time information must be converted consistently to the destination protocol. IEC 61850 quality details do not always have an exact IEC 104 equivalent, so the project must define a documented mapping and avoid presenting invalid data as healthy.",
    "steps": [
      "Identify source validity, test, operator-blocked and old-data conditions.",
      "Define destination quality bits and invalid/blocked/substituted semantics as supported.",
      "Determine whether source or gateway timestamp is transmitted.",
      "Verify time synchronization and UTC/local-time conversion.",
      "Inject communication-loss and invalid-quality test cases.",
      "Check the RCC indication and SOE ordering after conversion."
    ],
    "scenario": "An IED becomes disconnected but RCC still shows its last good value without an invalid flag. Correct gateway stale-data quality handling and retest.",
    "takeaway": "Never silently convert bad-quality data into a valid indication."
  },
  {
    "question": "What is the difference between spontaneous, cyclic and interrogated data transfer?",
    "answer": "Spontaneous transfer is triggered by a change or event; cyclic transfer sends data at configured intervals; interrogated transfer responds to a master request. The appropriate behavior depends on point criticality, bandwidth and control-centre requirements.",
    "steps": [
      "Classify each point according to the approved telecontrol signal list.",
      "Configure event triggers and deadbands for spontaneous transmission.",
      "Set cyclic periods where required and avoid unnecessary traffic.",
      "Verify GI behavior and completeness of current values.",
      "Test rapid changes, reconnects and event buffering or loss behavior."
    ],
    "scenario": "A frequently fluctuating analog signal floods the link with spontaneous events. Review deadband and reporting strategy instead of suppressing the signal without approval.",
    "takeaway": "Explain why a point is configured for a given reporting mode."
  },
  {
    "question": "How do you troubleshoot IEC 104 disconnections or repeated reconnects?",
    "answer": "Repeated reconnects can result from network loss, firewall/session timeout, duplicate endpoints, application timer settings, sequence problems or gateway resource issues. Use timestamps and captures from both ends to distinguish network and protocol causes.",
    "steps": [
      "Review link alarms, switch port errors, IP routes and firewall state.",
      "Capture TCP SYN/FIN/RST and IEC 104 STARTDT/TESTFR exchanges.",
      "Inspect t0/t1/t2/t3 and k/w parameters against the project specification.",
      "Check sequence-number handling, master connection limits and duplicate clients.",
      "Correlate disconnect times with device logs and network events.",
      "Correct the identified mismatch and monitor stability under normal load."
    ],
    "scenario": "The RCC session drops every idle period while ping stays stable. Inspect TESTFR exchanges and intermediate firewall idle timers before blaming IED data mapping.",
    "takeaway": "Correlate logs from gateway, network and master rather than relying on ping alone."
  },
  {
    "question": "Describe a complete gateway FAT/SAT test plan.",
    "answer": "Gateway acceptance verifies source acquisition, point mapping, scaling, events, quality, time, controls, redundancy and control-centre communication. FAT uses controlled simulation; SAT confirms installed paths and approved field interfaces.",
    "steps": [
      "Freeze approved signal list, gateway database and protocol parameters.",
      "Verify IEC 61850/Modbus acquisition with controlled status and analog values.",
      "Verify IEC 104 addresses, types, GI, spontaneous events and quality.",
      "Test time synchronization, communication loss/recovery and event behavior.",
      "Test permitted remote controls, rejections and feedback under approved isolation.",
      "Record evidence, defects, retests and final configuration versions."
    ],
    "scenario": "During SAT, one transformer alarm reaches the local HMI but not the RCC. Compare the gateway source mapping, alarm point inclusion and transmitted IOA, then retest with witnessed evidence.",
    "takeaway": "Point-by-point traceability and negative-path tests are essential to acceptance."
  }
];

const chapterTwelveQuestions: InterviewQuestion[] = [
  {
    "question": "Explain the complete breaker Close command path from SCADA HMI to the field breaker.",
    "answer": "A remote Close request begins at an authorized HMI operator and travels through the SCADA client and configured IEC 61850 control object to bay logic and the breaker operating circuit. Depending on the IED design, CSWI represents switching control, XCBR represents breaker status/control, and CILO provides interlocking information. A successful service response is not proof that the breaker physically closed.",
    "steps": [
      "Check the approved SLD, point list, command path and operator authority.",
      "Verify Local/Remote status and relevant permissives before issuing any test command.",
      "Confirm the configured control object, control model and HMI-to-IED mapping.",
      "Observe Select/Operate exchanges where applicable and capture command diagnostics.",
      "Verify the output relay and simulated breaker auxiliary feedback under an approved test arrangement.",
      "Confirm HMI status, SOE timestamps, command log and alarms; document evidence."
    ],
    "scenario": "HMI reports 'command accepted' but breaker remains Open. Trace command termination, output activation, DC supply, interlock status and auxiliary feedback rather than repeating Close commands.",
    "takeaway": "Separate command acceptance, output operation and actual breaker position."
  },
  {
    "question": "What is the difference between Direct Operate and Select-Before-Operate (SBO)?",
    "answer": "Direct Operate issues an operate service without a preceding select step. SBO requires the client to select the control object before operating it within a configured timeout. IEC 61850 also defines normal and enhanced security variants; enhanced-security control uses additional termination/feedback semantics. The configured ctlModel determines the permitted sequence.",
    "steps": [
      "Read ctlModel for the target control object from the IED data model.",
      "Identify whether the client must use Select or SelectWithValue before Operate.",
      "Confirm client identity, origin, control number and configured select timeout.",
      "Test a valid command sequence in an isolated FAT environment.",
      "Test invalid sequence, timeout, second-client contention and cancel behavior.",
      "Confirm device feedback and operation termination according to the selected control model."
    ],
    "scenario": "An HMI sends Operate to an SBO-configured IED and receives a negative response. Correct the SCADA control model rather than disabling SBO.",
    "takeaway": "SBO is a protocol workflow, not a substitute for electrical interlocking."
  },
  {
    "question": "What roles do CSWI, XCBR and CILO play in breaker control?",
    "answer": "CSWI commonly provides the logical switching-control interface, XCBR represents the circuit-breaker function and position, and CILO exposes interlocking conditions. Exact logical-node allocation and wiring depend on the vendor and project. The HMI may control CSWI.Pos or another engineered control object; the displayed position is typically sourced from the configured breaker status.",
    "steps": [
      "Browse the IED's actual logical nodes and identify control and feedback references.",
      "Compare CSWI.Pos, XCBR.Pos and CILO outputs with the approved SCL and logic drawings.",
      "Check whether the SCADA command targets the correct controllable object.",
      "Verify interlocking logic and feedback using a safe test simulation.",
      "Record source references and any vendor-specific mappings."
    ],
    "scenario": "SCADA reads XCBR.Pos correctly but Close fails because the command was mapped to a non-controllable status attribute. Map the approved controllable object.",
    "takeaway": "Never assume an object is writable just because it is visible in an IEC 61850 browser."
  },
  {
    "question": "Explain Local/Remote selection and command authority.",
    "answer": "Local/Remote selection determines which operating location or source is permitted to control equipment. Authority may be enforced by hardware selector, IED logic, bay controller, SCADA permissions or a combination. IEC 61850 origin information identifies the command source but does not itself override site control authority.",
    "steps": [
      "Check selector-switch input and its interpreted IED status.",
      "Review approved command-source priority and authorization rules.",
      "Verify SCADA user role and command enablement.",
      "Attempt approved test commands under both Local and Remote states using isolated equipment.",
      "Confirm blocked commands produce the expected rejection and audit trail.",
      "Verify return to normal operating authority after testing."
    ],
    "scenario": "SCADA can monitor a breaker but cannot Close while the bay selector is in Local. Verify authority before investigating network communication.",
    "takeaway": "Monitoring availability does not imply remote control permission."
  },
  {
    "question": "What is interlocking, and how is it different from protection tripping?",
    "answer": "Interlocking prevents unsafe or prohibited switching operations based on plant conditions such as disconnector positions, earthing-switch state, breaker state or synchrocheck permissives. Protection tripping responds to detected electrical faults. Interlocking logic may be implemented in a BCU, relay or hardwired circuit, with independent safety measures defined by the project.",
    "steps": [
      "Review the approved switching interlock matrix and cause-and-effect documents.",
      "Identify each required input, permissive and block condition.",
      "Verify input source, quality and communication supervision.",
      "Test each permitted and prohibited state in an isolated FAT setup.",
      "Check HMI indications, blocked-command diagnostics and event logging.",
      "Document results and obtain approval before field energization."
    ],
    "scenario": "A breaker Close is blocked because the earthing switch is indicated Closed. Verify the field state and interlock input; do not bypass the condition to pass a test.",
    "takeaway": "Interlocking must be validated against approved plant logic, not assumptions."
  },
  {
    "question": "How do you troubleshoot an HMI Close command rejected by an IED?",
    "answer": "A rejected command can be caused by incorrect control model, authority, missing select stage, interlock block, object reference mismatch, timeouts, quality or device-specific checks. Diagnosis should start with the actual command response and IED event log.",
    "steps": [
      "Record exact error, timestamp, operator and target object.",
      "Confirm IED association and that the target data attribute is controllable.",
      "Read ctlModel and verify Select/Operate sequence and timeout.",
      "Check Local/Remote, CILO and other permissives.",
      "Review origin, test flag, control number and vendor diagnostics as applicable.",
      "Retest once under an approved safe test condition and capture evidence."
    ],
    "scenario": "HMI says 'Object not selected'. Inspect SBO select timeout and whether a different client reserved the object.",
    "takeaway": "The precise rejection code is more useful than a generic 'communication failed' message."
  },
  {
    "question": "What is synchrocheck and when can it block breaker closing?",
    "answer": "Synchrocheck is a permissive function used when closing could connect energized systems. It checks configured conditions such as voltage magnitude, phase angle and frequency difference, or approved dead-line/dead-bus conditions. The exact criteria and wiring depend on the scheme.",
    "steps": [
      "Identify the approved synchrocheck relay/function and closing permissive path.",
      "Review voltage inputs, VT supervision and configuration settings.",
      "Verify whether the bay is expected to use live-line/live-bus or dead-line/dead-bus logic.",
      "Inspect the synchrocheck permit/block indication and event records.",
      "Use approved secondary injection or simulator conditions to validate permissives.",
      "Confirm the Close command is blocked when conditions are outside approved limits."
    ],
    "scenario": "SCADA Close fails although communication and Local/Remote are healthy; synchrocheck is blocking due to unacceptable phase angle. Diagnose the permissive, not the MMS link.",
    "takeaway": "Do not change synchrocheck settings solely to make a remote Close test pass."
  },
  {
    "question": "How are GOOSE signals used in interlocking, and what happens on communication failure?",
    "answer": "GOOSE can carry peer IED states such as disconnector position or interlocking permissives. The subscriber must validate message freshness, quality and configuration consistency. Loss of GOOSE may trigger a configured fail-safe block or another approved fallback; behavior must be verified in the project logic.",
    "steps": [
      "Identify publisher DataSet, GoCB and subscriber external references.",
      "Check multicast/VLAN path, APPID, confRev and subscriber status.",
      "Verify the actual received value and quality, not just packet presence.",
      "Simulate an approved publisher loss and confirm the specified fail-safe behavior.",
      "Restore communication and verify recovery without unintended operations.",
      "Record the event sequence and diagnostic alarms."
    ],
    "scenario": "GOOSE packets are visible but Close remains blocked because the subscriber input is invalid after a confRev mismatch. Correct engineering consistency before retesting.",
    "takeaway": "Receiving Ethernet frames does not guarantee valid interlocking data."
  },
  {
    "question": "What is the difference between command acknowledgment, operation termination and position feedback?",
    "answer": "A command acknowledgment indicates whether the control service request was accepted or rejected. Enhanced-security control can provide command termination information. Position feedback is an independent measured or calculated breaker state, often derived from auxiliary contacts. These signals should not be conflated.",
    "steps": [
      "Observe command request and service response in client logs.",
      "Check enhanced-security termination indication if the control model supports it.",
      "Verify output activation and the physical or simulated switching mechanism.",
      "Inspect XCBR.Pos and quality/timestamp after the operation.",
      "Check command timeout and mismatch alarms if expected feedback does not arrive.",
      "Correlate the sequence using SOE and device records."
    ],
    "scenario": "The IED accepts Close but the mechanism is blocked; SCADA must show failed or mismatched final position rather than falsely showing Closed.",
    "takeaway": "Always validate the final field state independently."
  },
  {
    "question": "How do you handle intermediate, invalid or bad-quality breaker status?",
    "answer": "A double-point breaker indication can represent Open, Closed, intermediate and bad/invalid states depending on the data model and mapping. SCADA should distinguish ambiguous or stale information from a confirmed safe state, and control permissives should follow approved engineering logic.",
    "steps": [
      "Inspect the actual XCBR.Pos.stVal encoding and associated quality.",
      "Verify both auxiliary contacts and input logic when double-point indication is used.",
      "Test all valid and invalid states through approved simulation.",
      "Confirm HMI symbols, alarms and SOE represent intermediate/bad quality correctly.",
      "Check communication-loss behavior and command blocking policy.",
      "Document discrepancies against the approved point list."
    ],
    "scenario": "Both 52a and 52b contacts are active after wiring changes. The HMI should indicate an abnormal state rather than a valid Open or Closed position.",
    "takeaway": "Never treat unknown status as a confirmed safe switching position."
  },
  {
    "question": "How do you test breaker Open/Close control during FAT and SAT safely?",
    "answer": "Control FAT/SAT validates command mapping, permissions, interlocks, protocol workflow, outputs, feedback, alarms and logging. Tests must be conducted under approved isolation and switching procedures; real breaker operation requires site authorization.",
    "steps": [
      "Review approved test plan, switching procedure, permits and isolation boundaries.",
      "Confirm test mode, output isolation and personnel coordination.",
      "Verify positive and negative control cases including Local/Remote and interlock blocks.",
      "Test Direct Operate or SBO sequence as configured.",
      "Check output indication, simulated or authorized physical feedback, alarms and SOE.",
      "Restore the original configuration, verify safe state and sign test records."
    ],
    "scenario": "During FAT a Close command is accepted but the simulator provides no position feedback. Log a feedback-path failure rather than recording a pass.",
    "takeaway": "Never defeat hardwired interlocks or trip circuits for convenience."
  },
  {
    "question": "Describe a systematic troubleshooting workflow when a breaker cannot close remotely.",
    "answer": "A structured workflow separates SCADA access, protocol/control-service handling, permissives, output circuit and final position feedback. This avoids repeated commands and helps identify the first failed stage.",
    "steps": [
      "Confirm equipment identity, operating authority and approved safe test conditions.",
      "Verify HMI command target and user permissions.",
      "Check MMS association and actual control service response.",
      "Inspect ctlModel, SBO selection and command timeout.",
      "Review Local/Remote, interlocks, synchrocheck, protection lockout and DC supply indications.",
      "Check output relay/circuit and independent position feedback under approved testing.",
      "Document root cause, corrective action and retest evidence."
    ],
    "scenario": "An operator reports 'remote Close not working'. Network is healthy and command accepted, but lockout relay 86 is active. Stop at the blocked permissive and escalate per procedure.",
    "takeaway": "The goal is to identify why control is blocked, not to force the breaker to close."
  }
];

const chapterThirteenQuestions: InterviewQuestion[] = [
  {
    "question": "What is the difference between protection pickup, trip and breaker-open indication?",
    "answer": "Pickup indicates that a protection element detected its operating condition. Trip means that protection logic issued a trip request. Breaker-open is the independently measured mechanical position; these events are related but not interchangeable.",
    "steps": [
      "Identify the protection element and pickup indication in the relay event record.",
      "Trace the configured trip logic and master trip output, including PTRC where applicable.",
      "Verify the trip circuit and breaker auxiliary contact feedback under an approved test setup.",
      "Compare device-originated event timestamps, SCADA mapping and quality.",
      "Document whether the issue is detection, trip logic, output wiring or feedback."
    ],
    "scenario": "Overcurrent pickup is logged but the breaker stays closed. The configured delay may not have elapsed or the trip path may be blocked; do not label pickup as a breaker trip.",
    "takeaway": "Explain the full chain: detect → trip decision → output → breaker movement → feedback."
  },
  {
    "question": "How are PTOC, PDIS, PTRC and RBRF used in IEC 61850?",
    "answer": "PTOC represents time overcurrent protection, PDIS distance protection, PTRC protection trip conditioning and RBRF breaker failure protection. Actual instantiated logical nodes and their data attributes depend on the relay configuration and edition.",
    "steps": [
      "Inspect the IED SCL file and actual instantiated logical nodes.",
      "Identify configured data attributes for start, operate and trip-related indications.",
      "Map required signals into a report DataSet and SCADA points.",
      "Check the protection logic and signal-list definitions rather than assuming a generic mapping.",
      "Test each relevant event with a relay simulator or approved test method."
    ],
    "scenario": "The SCADA signal list expects a distance protection start but the relay only publishes configured overcurrent indications. Reconcile the approved engineering design and SCL model.",
    "takeaway": "Know logical-node purposes, but always verify actual IED data references."
  },
  {
    "question": "How do you engineer a protection trip alarm from an IED to SCADA?",
    "answer": "A protection trip alarm should identify the correct bay, cause and state with reliable event time and quality. Mapping must use the intended protection indication, not a generic breaker position.",
    "steps": [
      "Review the approved protection and SCADA signal lists.",
      "Identify the exact IEC 61850 data object and functional constraint.",
      "Verify DataSet and RCB membership or the configured acquisition path.",
      "Create the SCADA point with correct polarity, priority and message.",
      "Simulate a safe trip indication and confirm HMI banner, SOE and historian records.",
      "Verify return-to-normal and acknowledgment behavior separately."
    ],
    "scenario": "A trip event is visible in IED logs but absent from SCADA alarms. Check reporting, point mapping and alarm enablement in sequence.",
    "takeaway": "Differentiate alarm source acquisition from alarm annunciation logic."
  },
  {
    "question": "What is Sequence of Events (SOE), and how do you verify event order?",
    "answer": "SOE is a chronological record of operational changes. Reliable sequence analysis requires synchronized source clocks, correct timestamp propagation and awareness of event time versus receipt time.",
    "steps": [
      "Confirm the time synchronization source and device synchronization status.",
      "Generate a controlled series of test events with known order.",
      "Read event timestamps in the IED and corresponding SCADA SOE records.",
      "Check UTC/time-zone conversion and timestamp resolution.",
      "Investigate missing, duplicated or reordered entries and report delays."
    ],
    "scenario": "A trip appears after breaker open on an HMI event list because one point uses server arrival time and another uses IED time. Compare source timestamps before diagnosing protection logic.",
    "takeaway": "Never infer physical event order from unsynchronized clocks."
  },
  {
    "question": "What are IEC 61850 quality and timestamp attributes, and why do they matter?",
    "answer": "IEC 61850 data commonly includes status value, quality and timestamp attributes. Quality communicates validity and conditions such as old data, test or operator-blocked states, depending on the applicable data model.",
    "steps": [
      "Browse the source object and inspect stVal, q and t where available.",
      "Confirm SCADA reads and propagates quality and timestamp.",
      "Disconnect or simulate a supervised source under safe conditions.",
      "Verify that HMI shows bad or stale quality instead of an apparently valid state.",
      "Restore communications and check quality recovery and event logging."
    ],
    "scenario": "A protection alarm stays green during an IED communication outage. The value is cached, but the HMI ignores invalid quality.",
    "takeaway": "A value without valid quality can mislead an operator."
  },
  {
    "question": "How do you configure alarm priorities and acknowledgment?",
    "answer": "Alarm priority reflects the approved operating philosophy and required operator response. Acknowledgment records operator awareness; it does not clear an active physical condition.",
    "steps": [
      "Review approved alarm philosophy and signal criticality.",
      "Assign priority, message, equipment reference and alarm group.",
      "Configure activation, clear, acknowledgment and shelving rules as authorized.",
      "Test each alarm transition and user action.",
      "Confirm history retains occurrence, acknowledgment and return-to-normal records."
    ],
    "scenario": "An active transformer protection trip is acknowledged but remains present until the trip condition clears. This is expected when acknowledgment and clearance are separate.",
    "takeaway": "Avoid treating acknowledgment as a reset of protection or equipment."
  },
  {
    "question": "How do you troubleshoot missing SOE entries when alarms are visible?",
    "answer": "Alarm displays and SOE records may use different processing or storage paths. Missing SOE can result from reporting settings, event ingestion, timestamp handling, filters or historian service issues.",
    "steps": [
      "Verify the event exists in the source IED log.",
      "Inspect report or acquisition traffic and configured trigger options.",
      "Check SCADA event processing and SOE database service health.",
      "Review event filters, point flags and timestamp acceptance rules.",
      "Reproduce the event safely and compare all logging stages."
    ],
    "scenario": "An alarm banner activates but SOE remains blank because the event-storage service is stopped. The acquisition path is healthy; the historian path is not.",
    "takeaway": "Follow acquisition, alarm engine and SOE storage as separate paths."
  },
  {
    "question": "What causes alarm flooding and how do you troubleshoot it?",
    "answer": "Alarm flooding occurs when many alarms arrive in a short period, potentially obscuring the initiating event. Root causes include communication flapping, unstable inputs, poor deadbands or cascading equipment conditions.",
    "steps": [
      "Collect a timestamped alarm list and identify the earliest initiating event.",
      "Group alarms by IED, network path and affected equipment.",
      "Check communication-loss patterns and time synchronization.",
      "Inspect contact chatter, debounce settings and analog deadbands.",
      "Apply only approved alarm-rationalization or delay changes.",
      "Retest and verify important protection alarms are never masked."
    ],
    "scenario": "A switch uplink flaps and hundreds of IED communication alarms occur. Restore the link and confirm correlated recovery before changing individual alarms.",
    "takeaway": "Fix the initiating fault; do not simply suppress high-volume alarms."
  },
  {
    "question": "How do you test protection indications during FAT without operating live equipment?",
    "answer": "FAT uses isolated relay test setups, simulators and controlled digital inputs to verify protection indications and SCADA mapping. Live protection outputs and trip circuits require approved isolation and safety controls.",
    "steps": [
      "Review test procedure, isolation plan and signal list.",
      "Confirm trip outputs cannot unintentionally operate energized equipment.",
      "Inject an approved simulated pickup or operate condition.",
      "Observe IED event, IEC 61850 report, SCADA alarm and SOE.",
      "Check event time, priority, polarity, acknowledgment and reset.",
      "Restore normal configuration and attach test evidence."
    ],
    "scenario": "During FAT a simulated distance protection operate event appears on the wrong feeder alarm. Correct the database source reference and repeat the test.",
    "takeaway": "State the test isolation and acceptance evidence in your interview answer."
  },
  {
    "question": "How do you investigate a protection trip recorded by the relay but not by the station gateway?",
    "answer": "A missing remote indication may arise in the source DataSet, MMS report acquisition, gateway point mapping, protocol conversion or remote control-centre receiving system.",
    "steps": [
      "Confirm the trip event and IEC 61850 reference in the relay.",
      "Verify the gateway receives the event with correct value, quality and timestamp.",
      "Check IEC 61850-to-IEC 104 or other protocol mapping and point enablement.",
      "Inspect gateway transmit logs and remote protocol traffic.",
      "Validate remote point address, cause of transmission and control-centre database.",
      "Perform a safe retest and document the first failing stage."
    ],
    "scenario": "Local HMI shows a trip but RCC does not. The IEC 104 IOA points to an unused address; correct mapping under change control.",
    "takeaway": "Local HMI success does not prove gateway or RCC delivery."
  },
  {
    "question": "How would you troubleshoot incorrect protection alarm timestamps?",
    "answer": "Timestamp problems can originate from IED clock drift, time-source loss, UTC conversion, report handling or server-time substitution. Investigate the source timestamp before changing the display.",
    "steps": [
      "Compare IED clock with the approved master time source.",
      "Check synchronization health, time-zone settings and daylight-saving handling.",
      "Inspect the timestamp on the original IEC 61850 data/report.",
      "Compare gateway, SCADA SOE and historian timestamps.",
      "Determine whether a server receipt timestamp replaced the source timestamp.",
      "Correct the responsible layer and verify with controlled events."
    ],
    "scenario": "A relay event is correct in UTC but HMI shows a five-and-a-half-hour offset error due to duplicate local-time conversion.",
    "takeaway": "Distinguish timestamp source, transport and presentation."
  },
  {
    "question": "Explain a systematic approach to a protection alarm that stays active after reset.",
    "answer": "A persistent alarm may reflect an uncleared physical condition, latched protection indication, reset permission, stale reporting or incorrect SCADA alarm logic. Never force a reset without understanding the cause.",
    "steps": [
      "Verify equipment is safe and confirm the underlying protection condition is cleared.",
      "Read the IED current value and protection latch state.",
      "Check authorized reset procedure and whether an active condition blocks reset.",
      "Inspect report updates, SCADA tag polarity and alarm clear logic.",
      "Review quality, timestamp and communication status.",
      "Retest under approved conditions and document root cause."
    ],
    "scenario": "The relay trip latch clears locally, but SCADA alarm remains active because the reset transition was not reported. Check RCB trigger settings and mapping before restarting services.",
    "takeaway": "Do not bypass protection latches or interlocks to clear an HMI alarm."
  }
];

const chapterFourteenQuestions: InterviewQuestion[] = [
  {
    "question": "Why is time synchronization necessary in SAS?",
    "answer": "Time synchronization aligns IED, gateway and SCADA clocks so SOE, disturbance records and fault investigations can be correlated. Clock accuracy and source timestamp handling must meet project requirements.",
    "steps": [
      "Identify project accuracy and time-source requirements.",
      "Check every device time source and synchronization status.",
      "Compare UTC timestamps of controlled events from two IEDs.",
      "Confirm SCADA preserves device timestamps and quality.",
      "Record offset and corrective action."
    ],
    "scenario": "Two relays report a trip sequence in reverse order; compare synchronization alarms and device-origin timestamps before blaming logic.",
    "takeaway": "A valid event value with an unsynchronized timestamp can mislead fault analysis."
  },
  {
    "question": "What is the difference between NTP and SNTP?",
    "answer": "NTP is a network time synchronization protocol with algorithms for clock selection and discipline. SNTP is a simpler client implementation often used by industrial devices. Both commonly use UDP port 123, subject to device support.",
    "steps": [
      "Read device support and time architecture.",
      "Configure authorized server addresses and redundancy.",
      "Verify UDP 123 reachability where applicable.",
      "Check synchronization state and measured offset.",
      "Test failover without changing live protection settings."
    ],
    "scenario": "An IED points to an obsolete NTP server after network migration and its clock drifts; correct the server and verify lock.",
    "takeaway": "Do not assume SNTP and NTP provide identical accuracy under all conditions."
  },
  {
    "question": "How do you configure SNTP synchronization for an IED?",
    "answer": "SNTP clients obtain time from configured servers. Vendor menus and support vary, so configuration must follow the approved device manual and site time architecture.",
    "steps": [
      "Confirm network IP, gateway and VLAN path to time server.",
      "Enter primary and secondary time-server IP addresses if supported.",
      "Configure UTC/time zone display separately where required.",
      "Enable synchronization and verify status diagnostics.",
      "Compare IED clock with a trusted reference.",
      "Document server failover and recovery test."
    ],
    "scenario": "IED communicates with SCADA but timestamps drift; discover the SNTP VLAN is blocked and correct switch policy.",
    "takeaway": "Successful ping to a time server is not proof that UDP 123 exchange works."
  },
  {
    "question": "Explain PTP and when it is preferred over SNTP.",
    "answer": "IEEE 1588 Precision Time Protocol uses time-aware message exchanges and, where supported, hardware timestamping and suitable network infrastructure for high-accuracy synchronization. Profiles, grandmaster selection and boundary/transparent clocks matter.",
    "steps": [
      "Identify required PTP profile and accuracy.",
      "Verify grandmaster and slave compatibility.",
      "Check VLAN, multicast and switch PTP features.",
      "Confirm grandmaster lock and slave offset diagnostics.",
      "Test failover and packet loss according to approved plan."
    ],
    "scenario": "A merging unit reports loss of synchronization despite network connectivity; inspect grandmaster profile and switch PTP support.",
    "takeaway": "PTP accuracy depends on the entire timing path, not just enabling a checkbox."
  },
  {
    "question": "What is IRIG-B and how does it differ from network time?",
    "answer": "IRIG-B distributes time using a dedicated electrical or optical signal in supported installations, rather than relying on ordinary IP packet exchange. Encoding, year information and UTC offset handling depend on equipment configuration.",
    "steps": [
      "Check time source and IRIG-B output format.",
      "Verify cabling, signal level and compatible IED input.",
      "Configure time code and UTC handling.",
      "Inspect lock indication and time accuracy.",
      "Test disconnection alarm and restoration."
    ],
    "scenario": "An IED shows time input present but wrong year; verify IRIG-B format and year source settings.",
    "takeaway": "Physical timing signal presence does not guarantee correct decoded time."
  },
  {
    "question": "How do you troubleshoot incorrect SOE timestamps?",
    "answer": "Incorrect event order may result from clock offset, source versus receive timestamp confusion, time zone conversion, reporting delay or bad synchronization quality.",
    "steps": [
      "Identify which device originated each event.",
      "Compare raw IED event time and SCADA stored time.",
      "Check clock synchronization state and offset.",
      "Review UTC/time-zone and daylight-saving handling.",
      "Inspect event/report buffering and network delay.",
      "Repeat a controlled test and document evidence."
    ],
    "scenario": "Trip and breaker-open events differ by several seconds only on HMI; raw IED logs match, indicating SCADA timestamp conversion error.",
    "takeaway": "Always compare source timestamps before adjusting alarm delays."
  },
  {
    "question": "How do you test redundancy of time servers?",
    "answer": "Time-source redundancy prevents loss of accurate timing when a primary server or path fails, provided clients support the configured failover mechanism.",
    "steps": [
      "Confirm approved primary/secondary server setup.",
      "Record normal synchronization state and offset.",
      "Under approved FAT conditions disconnect the primary path.",
      "Observe server selection, holdover and alarm behavior.",
      "Restore primary and verify recovery without time jumps.",
      "Record results against acceptance criteria."
    ],
    "scenario": "Primary SNTP server is disconnected but some IEDs drift because they were never configured with a secondary address.",
    "takeaway": "Check each IED individually; a redundant server pair does not imply redundant client configuration."
  },
  {
    "question": "What are clock holdover and time-quality indications?",
    "answer": "Holdover is the clock maintaining estimated time when its reference is unavailable. Accuracy degrades according to oscillator quality and outage duration; status flags indicate unsynchronized or uncertain timing.",
    "steps": [
      "Review timing equipment holdover specifications.",
      "Check IED sync and quality diagnostics.",
      "Simulate approved time-source loss.",
      "Measure offset over the required interval.",
      "Verify SOE quality flags and alarms.",
      "Restore reference and confirm stable resynchronization."
    ],
    "scenario": "A gateway continues displaying plausible timestamps during a timing outage, but quality shows unsynchronized.",
    "takeaway": "A plausible clock display is not proof of valid synchronization."
  },
  {
    "question": "What is SNMP and what are Manager, Agent, MIB and OID?",
    "answer": "Simple Network Management Protocol is used to monitor and sometimes manage network equipment. A manager queries agents; MIBs describe managed objects; OIDs identify individual objects or metrics. SNMP does not replace IEC 61850 operational messaging.",
    "steps": [
      "Identify switch SNMP agent and management station.",
      "Review supported MIB and OID list.",
      "Enable authorized SNMP access on the management VLAN.",
      "Query interface status and counters with a test manager.",
      "Map required metrics and alarms into monitoring."
    ],
    "scenario": "Network monitoring shows a switch port down using ifOperStatus OID while SCADA still shows the last valid relay data.",
    "takeaway": "SNMP reports network health; it is not a protection trip transport."
  },
  {
    "question": "Compare SNMPv2c and SNMPv3 for a substation network.",
    "answer": "SNMPv2c typically relies on community strings without built-in message confidentiality. SNMPv3 supports authentication and privacy with suitable security levels and is generally preferable where equipment and project policy allow.",
    "steps": [
      "Check switch and monitoring software versions.",
      "Choose approved SNMPv3 security level and users where supported.",
      "Limit access with management VLAN and ACLs.",
      "Configure secure credentials and permitted managers.",
      "Verify polling and traps while checking logs.",
      "Disable unnecessary write access."
    ],
    "scenario": "A monitoring server can poll a switch with v2c but fails after v3 migration; verify username, auth/privacy algorithms and security level.",
    "takeaway": "Prefer least privilege and avoid exposing SNMP on untrusted networks."
  },
  {
    "question": "What is the difference between SNMP polling, traps and informs?",
    "answer": "Polling is a manager-initiated request for status or counters. Traps are agent-initiated notifications generally without acknowledgment; informs request acknowledgment and depend on version/device support.",
    "steps": [
      "List required polled OIDs and notification events.",
      "Set appropriate polling interval to avoid excess load.",
      "Configure authorized trap/inform destinations.",
      "Generate an approved port-down event.",
      "Verify notification reception and event correlation.",
      "Confirm recovery notification and logging."
    ],
    "scenario": "Switch port failure is visible during polling but no trap arrives because the destination IP was configured incorrectly.",
    "takeaway": "Polling and notification delivery are independent checks."
  },
  {
    "question": "How do you configure SNMP monitoring on a managed Ethernet switch?",
    "answer": "SNMP configuration enables approved network health monitoring, including port state, traffic errors, link changes and device status. Exact commands vary by vendor.",
    "steps": [
      "Confirm management IP, VLAN, ACL and monitoring requirements.",
      "Enable supported SNMP version and secure credentials.",
      "Configure read-only OID access and trap receiver.",
      "Select interface status, error counters and device health OIDs.",
      "Test polling and notifications from management station.",
      "Save configuration and document backup and security settings."
    ],
    "scenario": "An industrial switch is reachable by ping but not SNMP; an ACL allows ICMP but blocks UDP 161.",
    "takeaway": "SNMP polling normally uses UDP 161 and traps typically use UDP 162."
  },
  {
    "question": "How do you detect a PRP LAN failure using SNMP?",
    "answer": "SNMP can expose managed switch port and link status for PRP LAN A and LAN B. PRP redundancy supervision is a separate mechanism; combine switch alarms with DANP/RedBox diagnostics where available.",
    "steps": [
      "Identify LAN A and LAN B switches and relevant ports.",
      "Poll link status and error counters for each independent LAN.",
      "Configure link-down traps and device-health alarms.",
      "Correlate switch event with PRP supervision diagnostics.",
      "Perform an approved single-LAN failure test.",
      "Verify communication continuity and correct alarm recovery."
    ],
    "scenario": "LAN B fibre disconnects; HMI continues receiving MMS over LAN A, while SNMP reports LAN B port down.",
    "takeaway": "Do not infer PRP health from a single switch alone."
  },
  {
    "question": "SNMP traps are not reaching the monitoring server. How do you troubleshoot?",
    "answer": "Trap loss can arise from wrong receiver IP, routing, VLAN/ACL policy, UDP 162 filtering, version/security mismatch, event configuration or collector processing.",
    "steps": [
      "Verify that the switch event actually occurred and traps are enabled.",
      "Check receiver IP, routing and source interface.",
      "Validate management VLAN and firewall rules for UDP 162.",
      "Match SNMP version, user/community and security settings.",
      "Capture traffic at switch mirror port or collector where permitted.",
      "Check collector logs, event rules and duplicate suppression.",
      "Retest with an approved port-down event and document results."
    ],
    "scenario": "A switch sends link-down traps to an old monitoring server address; polling from the new server still works.",
    "takeaway": "Working SNMP polling does not prove trap delivery."
  }
];

const chapterFifteenQuestions: InterviewQuestion[] = [
  {
    "question": "How do you approach a new IED configuration task using an engineering tool?",
    "answer": "Engineering begins with approved drawings, settings, firmware compatibility and an engineering backup. Vendor tools edit device parameters and IEC 61850 models, but configuration must be reviewed and tested before deployment.",
    "steps": [
      "Confirm device make, model, firmware and tool version.",
      "Obtain the approved settings, signal list, network plan and latest project backup.",
      "Connect using the approved engineering interface and read the existing device configuration.",
      "Compare offline and online settings before making controlled changes.",
      "Validate the IEC 61850 model, export the required SCL file and run approved tests.",
      "Archive the final project, version, change record and rollback copy."
    ],
    "scenario": "A replacement relay has a newer firmware revision. Check tool and configuration compatibility before importing the previous relay project.",
    "takeaway": "Never overwrite an in-service IED without authorization and a verified backup."
  },
  {
    "question": "What is Schneider PACiS SCE and how is it used in SAS engineering?",
    "answer": "PACiS SCE is an engineering environment used in applicable PACiS architectures to configure station automation data and communication relationships. Exact workflows depend on the installed PACiS version and project design.",
    "steps": [
      "Review the approved PACiS project and engineering database.",
      "Identify IEDs, bay objects, signal references and communication configuration.",
      "Import or reconcile IED data models and map relevant points.",
      "Configure database associations, indications, alarms and required gateway or HMI relationships.",
      "Validate database consistency and generate or export project deliverables.",
      "Test representative indications, controls and reports in FAT."
    ],
    "scenario": "An IED status is visible in an IEC 61850 browser but absent from PACiS HMI. Compare source reference, engineering database point and HMI association.",
    "takeaway": "Describe the engineering workflow without claiming a feature is identical across PACiS versions."
  },
  {
    "question": "How do you use Schneider Easergy Studio or Easergy Builder for IED integration?",
    "answer": "The supported Schneider engineering application is selected according to the IED family and firmware. It can be used for device settings, IEC 61850 configuration and communication validation where supported.",
    "steps": [
      "Confirm the exact device family, firmware and supported engineering software.",
      "Read or import the existing project and verify communication access.",
      "Inspect logical devices, logical nodes, DataSets and reporting configuration.",
      "Review IP settings, control model and GOOSE settings if supported.",
      "Export the supported ICD/CID or other SCL deliverable and validate it.",
      "Perform offline checks and approved FAT communication tests."
    ],
    "scenario": "After importing a relay ICD, the expected breaker status object is missing. Confirm the correct device model and firmware-specific export.",
    "takeaway": "Avoid assuming every Easergy-family device has the same configuration menus."
  },
  {
    "question": "Explain the basic ABB PCM600 engineering workflow.",
    "answer": "ABB PCM600 is used with supported ABB protection and control IEDs for parameterization and IEC 61850 engineering, with connectivity packages required for the relevant IED types.",
    "steps": [
      "Install a compatible PCM600 release and IED connectivity package.",
      "Create or open the plant structure and add the correct IED type.",
      "Read the IED configuration or import approved project data.",
      "Review application configuration, communication parameters and signal mapping.",
      "Engineer DataSets, reporting and GOOSE as supported by the IED and project.",
      "Write approved changes, verify online values and export configuration evidence."
    ],
    "scenario": "PCM600 connects to a relay but cannot display its complete model. Check connectivity package, device type and firmware compatibility.",
    "takeaway": "Mention the role of connectivity packages in ABB workflows."
  },
  {
    "question": "What do Siemens DIGSI 4 and DIGSI 5 do, and how do you select between them?",
    "answer": "DIGSI engineering tools configure supported Siemens SIPROTEC protection and control devices. DIGSI 4 and DIGSI 5 support different device generations; selection depends on the exact SIPROTEC family and firmware.",
    "steps": [
      "Identify the SIPROTEC device model and generation.",
      "Confirm the supported DIGSI version and communication interface.",
      "Back up the current device settings and project.",
      "Inspect protection parameters, communication settings and IEC 61850 configuration.",
      "Review report, GOOSE and control engineering in the supported workflow.",
      "Test changes and retain the final project and settings report."
    ],
    "scenario": "An engineer tries to open a SIPROTEC 5 project in DIGSI 4. Identify the tool-generation mismatch rather than troubleshooting Ethernet first.",
    "takeaway": "Always match engineering tool generation to device generation."
  },
  {
    "question": "How is GE EnerVista used for relay configuration and troubleshooting?",
    "answer": "GE EnerVista is a family of engineering and maintenance tools for supported GE Multilin devices. Capabilities depend on the specific relay and its supported application.",
    "steps": [
      "Identify the relay model, firmware and appropriate EnerVista application.",
      "Establish authorized local or network communication.",
      "Read and back up settings and check device health.",
      "Inspect digital inputs, outputs, measurements and communication settings.",
      "Review supported IEC 61850 objects and reporting configuration.",
      "Apply approved changes and verify with controlled test signals."
    ],
    "scenario": "A GE relay responds over Ethernet but a configured SCADA point is stale. Verify the relay's IEC 61850 reporting and the SCADA mapping independently.",
    "takeaway": "Avoid presenting all EnerVista products as one identical interface."
  },
  {
    "question": "How do you validate an ICD file before importing it into a station project?",
    "answer": "An ICD file describes an IED's IEC 61850 capabilities. Its content must be compatible with the device version and station engineering requirements; capability descriptions are not proof of final installed configuration.",
    "steps": [
      "Check file provenance, model, firmware and revision.",
      "Validate XML/SCL syntax with an appropriate validator.",
      "Inspect logical devices, logical nodes, DataSets and supported services.",
      "Check the expected report and GOOSE capabilities.",
      "Import into a controlled engineering project and review warnings.",
      "Compare the engineered model against the online IED and FAT signal list."
    ],
    "scenario": "An ICD imports successfully but the intended report DataSet is unavailable. Determine whether the file describes only capabilities and whether final engineering is still required.",
    "takeaway": "Successful XML import does not prove live IED compatibility."
  },
  {
    "question": "How do you troubleshoot a vendor tool that cannot connect to an IED?",
    "answer": "Connection failure may be caused by physical access, addressing, firewalls, protocol settings, credentials, firmware/tool mismatch or a device-side service restriction.",
    "steps": [
      "Check engineering authorization and physical port or fibre link.",
      "Confirm laptop IP, subnet, route and the intended IED address.",
      "Check ARP and ping where applicable; remember some devices block ICMP.",
      "Verify required protocol port, service and user credentials.",
      "Confirm tool version, driver or connectivity package and firmware support.",
      "Capture logs and escalate before changing security or device settings."
    ],
    "scenario": "A relay responds to ping but the vendor tool times out. Investigate the tool's service port and authentication rather than assuming the network is fully healthy.",
    "takeaway": "Never disable cybersecurity controls as a shortcut."
  },
  {
    "question": "How do you engineer GOOSE across two different vendor tools?",
    "answer": "Multi-vendor GOOSE requires consistent publisher DataSet and GoCB details plus compatible subscriber signal mapping. Import/export through SCL can assist, but both devices must be independently verified.",
    "steps": [
      "Export the publisher's correct SCL description.",
      "Identify GoCB, DataSet, APPID, multicast MAC, VLAN and configuration revision.",
      "Import or map the publisher references in the subscriber engineering tool.",
      "Validate data types, member order, quality handling and supervision.",
      "Deploy approved configurations to both IEDs.",
      "Capture GOOSE traffic and perform isolated functional tests."
    ],
    "scenario": "Publisher packets appear in Wireshark but the subscriber does not react. Compare subscription mapping, DataSet structure and confRev.",
    "takeaway": "Packet reception is not equivalent to successful subscriber logic."
  },
  {
    "question": "How do you compare an offline engineering project with an online IED?",
    "answer": "Offline-to-online comparison detects configuration drift between an approved engineering baseline and the installed device. The exact compare feature differs by vendor and tool version.",
    "steps": [
      "Back up the online configuration before comparison.",
      "Verify device identity, firmware and project revision.",
      "Read online parameters or supported configuration fingerprint.",
      "Compare communication settings, logic, DataSets, RCBs and GOOSE mappings.",
      "Classify differences as approved, undocumented or critical.",
      "Resolve through change control and repeat targeted FAT/SAT tests."
    ],
    "scenario": "An SCD file shows a new GOOSE DataSet but the relay still sends the old revision. Confirm whether the updated configuration was downloaded.",
    "takeaway": "Do not assume exporting a project automatically updates the IED."
  },
  {
    "question": "What is the role of IEDScout, IEC 61850 browsers and Wireshark in commissioning?",
    "answer": "IED browsers and test clients inspect IEC 61850 data and services, while Wireshark analyzes network packets. These tools complement, but do not replace, the vendor engineering software and approved test procedures.",
    "steps": [
      "Use an IEC 61850 client to establish a permitted MMS association.",
      "Browse object references, values, quality and timestamps.",
      "Inspect report control attributes and report delivery where permitted.",
      "Use Wireshark to verify TCP/MMS and Layer 2 GOOSE packets.",
      "Correlate captures with IED diagnostics, SCADA logs and the signal list.",
      "Document findings and restore any temporary test configuration."
    ],
    "scenario": "SCADA misses reports although an IEC 61850 browser reads the current value. Investigate RCB enablement and client ownership.",
    "takeaway": "A successful MMS read does not prove reporting works."
  },
  {
    "question": "How do you manage multi-vendor engineering files during FAT and SAT?",
    "answer": "Engineering file management ensures that the approved station SCL model, device projects and deployed IED configurations remain traceable. A mismatch can cause difficult-to-diagnose integration faults.",
    "steps": [
      "Maintain a revision-controlled register of vendor projects and SCL exports.",
      "Record IED model, firmware, tool version and IP identity.",
      "Validate SCD/IID/CID consistency against the approved station design.",
      "Back up deployed configurations before every approved change.",
      "Run regression tests for affected reports, GOOSE subscriptions and controls.",
      "Store signed test results, deviations and as-built files."
    ],
    "scenario": "A late firmware upgrade changes an ICD export and a subscriber reports confRev mismatch. Revalidate the SCL integration and retest the affected GOOSE path.",
    "takeaway": "Treat engineering files as controlled deliverables, not disposable exports."
  }
];

const chapterSixteenQuestions: InterviewQuestion[] = [
  {
    "question": "An IED responds to ping but SCADA shows communication failure. How do you troubleshoot?",
    "answer": "ICMP reachability confirms only basic IP connectivity. IEC 61850 MMS requires an operational TCP connection, MMS association, compatible model and configured acquisition. Diagnose each layer independently.",
    "steps": [
      "Confirm the correct IED IP, VLAN and physical switch port.",
      "Check TCP port 102 reachability and review firewall or access-control rules.",
      "Use an authorized IEC 61850 client to verify MMS association and browse a known object.",
      "Inspect SCADA client logs, IED association limits and authentication or service restrictions.",
      "Check SCL object references, DataSets, RCB reservation and report enablement.",
      "Retest the affected SCADA points and record the fault cause."
    ],
    "scenario": "During SAT, ping succeeds but all bay points show bad quality after a SCADA restart. The MMS client fails to re-enable its reserved BRCB. Correct the client configuration and verify reporting.",
    "takeaway": "Ping success does not establish IEC 61850 application health."
  },
  {
    "question": "Breaker status changes in the IED but not on the HMI. What is your method?",
    "answer": "Trace the signal from physical input through the IEC 61850 object and acquisition chain to the HMI. Check value, quality, timestamps and mapping at each stage.",
    "steps": [
      "Verify breaker auxiliary contacts and IED binary input safely.",
      "Read XCBR.Pos.stVal and its quality and timestamp using an approved client.",
      "Check the configured DataSet, RCB and whether reports are reaching SCADA.",
      "Compare the SCADA database object reference, inversion and quality processing.",
      "Inspect the HMI symbol binding and stale-data handling.",
      "Repeat Open/Close indication tests with approved isolation."
    ],
    "scenario": "IED browser shows Open and reports contain the change, but the HMI still shows Closed. The graphics symbol references a different feeder tag. Fix the HMI binding.",
    "takeaway": "Always identify the first point in the chain where expected and actual values differ."
  },
  {
    "question": "GOOSE frames are visible in Wireshark, but the subscriber does not operate. Why?",
    "answer": "Packet visibility proves frames reached the capture point, not that the subscriber accepted the message or executed logic. Subscription mapping, DataSet structure, confRev, quality and interlocks may prevent action.",
    "steps": [
      "Capture GOOSE on the subscriber-facing port or a correctly configured mirror port.",
      "Compare APPID, multicast destination MAC, VLAN, GoID and DataSet reference.",
      "Verify confRev and DataSet member order and data types against the subscriber configuration.",
      "Check subscriber external references, GOOSE supervision and validity diagnostics.",
      "Inspect subscriber logic permissives and output blocking conditions.",
      "Use isolated FAT signals to verify the subscriber logic without energizing trip outputs."
    ],
    "scenario": "GOOSE traffic is present but the subscriber reports configuration mismatch after a publisher DataSet change. Re-engineer the subscription and verify the new confRev.",
    "takeaway": "Separate Ethernet delivery from IEC 61850 subscription and protection logic."
  },
  {
    "question": "GOOSE communication stops after changing a switch. What checks do you perform?",
    "answer": "GOOSE normally uses Layer 2 multicast and may use IEEE 802.1Q VLAN tags. Switch replacement can change VLAN membership, multicast handling and port configuration.",
    "steps": [
      "Check fibre/SFP link, port speed and error counters.",
      "Compare old and new port VLAN membership, tagged/untagged behavior and PVID.",
      "Check multicast filtering, storm control and relevant QoS policies.",
      "Verify GOOSE frames enter and leave the switch with expected VLAN and destination MAC.",
      "Check publisher/subscriber supervision diagnostics.",
      "Restore approved configuration and perform an isolated functional retest."
    ],
    "scenario": "An untagged access port is replaced with a tagged trunk port; the subscriber no longer receives expected GOOSE frames. Correct port VLAN configuration.",
    "takeaway": "GOOSE traffic is not validated by an IP ping test."
  },
  {
    "question": "PRP LAN A fails but communications remain healthy. How do you verify redundancy?",
    "answer": "PRP duplicates eligible frames over two independent LANs. A single LAN failure should not interrupt supported dual-attached communication, but supervision must report the fault.",
    "steps": [
      "Confirm IEDs and switches are correctly assigned to separate LAN A and LAN B networks.",
      "Check PRP supervision, duplicate discard counters and link health.",
      "Record baseline MMS and GOOSE operation with both LANs healthy.",
      "During an approved test, isolate only LAN A and observe service continuity.",
      "Verify alarms, counters and network path behavior; restore LAN A.",
      "Repeat for LAN B and document recovery results."
    ],
    "scenario": "Operators see no loss of indications when LAN A fibre is unplugged, but no redundancy alarm appears. Investigate PRP supervision and alarm mapping.",
    "takeaway": "Communication continuity and fault annunciation are separate acceptance criteria."
  },
  {
    "question": "A SCADA alarm appears with an incorrect timestamp. How do you investigate?",
    "answer": "Event time can originate at the IED, gateway or SCADA server. Incorrect synchronization, UTC/local conversion or arrival-time substitution can reorder SOE records.",
    "steps": [
      "Identify the source of the event timestamp and whether it is device-originated.",
      "Check IED clock synchronization status, time source and time-quality flags.",
      "Verify SNTP/NTP/PTP or IRIG-B settings as applicable.",
      "Check UTC, time-zone and daylight-saving conversion at gateway and SCADA.",
      "Compare the IED event log with gateway and HMI event records.",
      "Generate a controlled event sequence and confirm order and accuracy."
    ],
    "scenario": "IED event time is correct but HMI SOE is offset by 5 hours 30 minutes. Review UTC-to-local conversion instead of adjusting relay clock blindly.",
    "takeaway": "Never change time zones to hide a synchronization fault."
  },
  {
    "question": "A breaker Close command from HMI is rejected. What is your troubleshooting flow?",
    "answer": "A command can fail because of user permissions, Local/Remote selection, control model, interlocking, synchrocheck, communication or device diagnostics. A rejection may be the correct safe response.",
    "steps": [
      "Confirm operating authorization and approved test boundaries.",
      "Check operator role and Local/Remote status.",
      "Verify the configured control object and Direct Operate or SBO sequence.",
      "Read interlock, synchrocheck and other permissive statuses.",
      "Inspect IEC 61850 command responses and device diagnostics.",
      "Correct the engineering fault and retest without bypassing safety logic."
    ],
    "scenario": "A breaker closes locally but not from HMI because Local mode is active. Explain the expected command rejection and verify Remote selection only under approved conditions.",
    "takeaway": "Do not bypass interlocks or force a live breaker to make a test pass."
  },
  {
    "question": "MMS reporting stops after an IED configuration download. What might have changed?",
    "answer": "Downloading an engineered IED configuration may change DataSets, RCB instances, confRev or service settings. SCADA may still expect the earlier model.",
    "steps": [
      "Compare deployed IED configuration with the approved SCD/CID and prior backup.",
      "Check whether the DataSet name, members or RCB references changed.",
      "Verify report enablement, reservation, triggers, integrity period and client ownership.",
      "Review SCADA SCL import and mapping version.",
      "Inspect MMS reports and client logs to locate the mismatch.",
      "Align approved configurations and retest reporting after controlled deployment."
    ],
    "scenario": "A relay update renamed a report DataSet but the SCADA client still references the old RCB. Update engineering references and retest affected points.",
    "takeaway": "Keep SCADA and IED engineering revisions synchronized."
  },
  {
    "question": "The gateway is online but the control centre receives no IEC 104 points. How do you isolate the fault?",
    "answer": "Gateway network availability is not proof that IEC 60870-5-104 is exchanging application data. Check TCP association, station addressing, mapping, quality and interrogation.",
    "steps": [
      "Verify gateway health, remote route and TCP port 2404.",
      "Check IEC 104 connection state, common address and configuration parameters.",
      "Review interrogation requests and corresponding ASDUs in logs or packet captures.",
      "Compare IEC 61850 source values with gateway database mappings and IOAs.",
      "Check invalid quality flags, blocked transmission and event queues.",
      "Test representative points and document the verified end-to-end path."
    ],
    "scenario": "Gateway pings successfully but the RCC shows blank indications because the IEC 104 common address is mismatched. Correct the approved addressing and retest GI.",
    "takeaway": "Test protocol-layer data transfer, not just Ethernet connectivity."
  },
  {
    "question": "An analog measurement is ten or one thousand times too high on HMI. What do you check?",
    "answer": "Incorrect scaling usually comes from unit multipliers, CT/VT ratios, gateway conversion or duplicate SCADA scaling. Verify the actual source value and engineering units before changing factors.",
    "steps": [
      "Record the physical or injected test value and expected engineering unit.",
      "Read the raw IED measurement and associated unit/multiplier.",
      "Check any gateway transformation and sign convention.",
      "Review SCADA tag scaling, display units and decimal precision.",
      "Test multiple values across the range, including zero and negative where applicable.",
      "Document the corrected scaling and verify trends and alarms."
    ],
    "scenario": "IED shows 11.0 kV but HMI shows 11000 kV because a factor of 1000 is applied twice. Remove the incorrect SCADA multiplier after approval.",
    "takeaway": "Scaling fixes must be validated at more than one test point."
  },
  {
    "question": "One feeder shows repeated communication-loss alarms while other IEDs are healthy. How do you troubleshoot?",
    "answer": "A single-IED fault suggests local physical, configuration, resource or device issues, although switch-port and VLAN policies can also affect one device. Use comparative evidence.",
    "steps": [
      "Check IED diagnostics, reboot logs, CPU load and communication service health.",
      "Inspect fibre, SFP, connector cleanliness and switch-port errors.",
      "Check IP conflicts, MAC learning, VLAN and ACL configuration.",
      "Correlate alarm times with link flaps, MMS session resets and switch logs.",
      "Capture packets at the relevant port and compare against a healthy feeder.",
      "Correct the confirmed cause and monitor stability during approved tests."
    ],
    "scenario": "A switch reports intermittent CRC errors on one feeder port and the IED association repeatedly resets. Repair the physical link before modifying SCADA database settings.",
    "takeaway": "Use fault timestamps and switch counters to avoid random configuration changes."
  },
  {
    "question": "How do you handle an intermittent fault during FAT/SAT when it cannot be reproduced immediately?",
    "answer": "Intermittent faults require evidence collection, controlled reproduction and disciplined change management. Avoid marking the test passed solely because the fault disappeared.",
    "steps": [
      "Record exact symptoms, affected equipment, timestamps and environmental conditions.",
      "Collect IED, SCADA, gateway and switch logs before they roll over.",
      "Capture baseline network and device health data.",
      "Change one approved variable at a time during safe test conditions.",
      "Attempt reproducible test cases and compare with a healthy reference.",
      "Document open punch-list item, risk, owner, corrective action and retest criteria."
    ],
    "scenario": "GOOSE supervision alarm appears once every few hours. Preserve packet capture and switch counters, correlate with network events and track the issue until acceptance criteria are met.",
    "takeaway": "A temporary recovery is not proof that the root cause is resolved."
  }
];

const chapterSeventeenQuestions: InterviewQuestion[] = [
  {
    "question": "Tell me about yourself for a 2–3 years SAS Engineer interview.",
    "answer": "I am an Electrical and Electronics Engineering graduate focused on Substation Automation Systems. My technical preparation covers IEC 61850 data models, MMS reporting, GOOSE, SCADA/HMI mapping, station networking and FAT/SAT test procedures. I am comfortable explaining how an IED signal travels through the automation system and how to diagnose faults methodically. I describe my actual project, lab and training exposure accurately and do not claim site commissioning tasks I have not performed.",
    "steps": [
      "State your education and current role or training background in one sentence.",
      "Name three to five relevant skills you can demonstrate.",
      "Describe one real task you personally completed, clearly identifying lab versus project work.",
      "Explain the type of SAS engineering role you are seeking.",
      "Keep the spoken answer to roughly 60–90 seconds."
    ],
    "scenario": "An interviewer asks for your experience summary. If your practical work was on a simulation laptop, say that it was an engineering lab and explain the actual test results.",
    "takeaway": "Use your real history; never turn training exercises into invented site experience."
  },
  {
    "question": "Explain a SAS project or engineering assignment you worked on.",
    "answer": "A good project explanation covers scope, architecture, tools, assigned responsibility, test method, outcome and unresolved limitations. It must distinguish your individual contribution from the work of the overall team.",
    "steps": [
      "Introduce the project or training setup and its purpose.",
      "Describe IEDs, station network, SCADA and gateway only where actually present.",
      "Identify the exact database, mapping, configuration or testing task you handled.",
      "Explain your inputs, actions, validation evidence and results.",
      "State challenges and what you learned without exaggerating responsibility."
    ],
    "scenario": "If you created a simulated breaker HMI, describe the tag mapping and script verification; do not claim physical breaker commissioning.",
    "takeaway": "Interviewers often ask follow-up questions about every tool and activity you mention."
  },
  {
    "question": "What are your main responsibilities as a SAS Engineer?",
    "answer": "Typical SAS responsibilities can include IED integration, IEC 61850 configuration review, SCADA database mapping, HMI graphics, communication testing, FAT/SAT support, documentation and troubleshooting. The actual scope varies by project and seniority.",
    "steps": [
      "Start with responsibilities you have personally performed.",
      "Separate tasks you independently handled from tasks you assisted or studied.",
      "Connect each responsibility to a concrete deliverable, such as a signal list or test record.",
      "Explain how you verified work and escalated safety-critical issues."
    ],
    "scenario": "During a panel interview, the interviewer asks whether you performed SAT. State exactly whether you executed, observed, assisted or only studied the SAT procedure.",
    "takeaway": "Describe typical role scope, but label your own exposure precisely."
  },
  {
    "question": "Describe an IEC 61850 issue and how you would troubleshoot it.",
    "answer": "An IEC 61850 problem should be investigated in layers: physical connection, network reachability, service association, IED data model, reporting or GOOSE subscription, SCADA mapping and application behavior. Evidence should determine the root cause.",
    "steps": [
      "Define the symptom and identify affected devices and points.",
      "Check physical link, IP connectivity where applicable and switch diagnostics.",
      "Verify MMS association or Layer 2 GOOSE packet presence as appropriate.",
      "Inspect DataSet, RCB, GoCB, confRev, quality and object references.",
      "Compare IED source value with SCADA or subscriber behavior.",
      "Document the fault, correction and repeat test."
    ],
    "scenario": "Breaker indication is visible in an IED browser but not on the HMI. Inspect the RCB and SCADA tag mapping before changing network configuration.",
    "takeaway": "Give a repeatable diagnostic sequence instead of guessing one cause."
  },
  {
    "question": "How would you explain GOOSE communication to an interviewer?",
    "answer": "GOOSE is an IEC 61850 event messaging mechanism commonly used for fast IED-to-IED signal exchange. Conventional GOOSE uses Ethernet Layer 2 multicast with publisher and subscriber engineering; it does not depend on TCP or IP routing.",
    "steps": [
      "Identify the publisher IED and its DataSet.",
      "Describe the GoCB, multicast MAC, APPID, VLAN and confRev.",
      "Explain subscriber mapping and supervision.",
      "Describe event-driven publication and retransmission.",
      "Explain how to verify packets and subscriber logic safely."
    ],
    "scenario": "A protection IED publishes an interlock permissive but a bay controller does not update. Verify subscription configuration and packet capture.",
    "takeaway": "Clearly distinguish GOOSE from MMS client-server reporting."
  },
  {
    "question": "How do you explain your FAT or SAT testing approach?",
    "answer": "FAT validates engineered functionality in a controlled test environment; SAT validates installed interfaces and approved functionality on site. Both require traceable procedures, expected results and recorded evidence.",
    "steps": [
      "Review drawings, signal lists, control philosophy and approved test procedures.",
      "Confirm test isolation and safety authorization.",
      "Check communications, status, measurements, alarms and event timestamps.",
      "Test controls and interlocks only under approved conditions.",
      "Log defects, corrective actions and retest evidence.",
      "Obtain required review and sign-off."
    ],
    "scenario": "An HMI Close command fails during FAT because an interlock is active. Record the expected rejection and investigate permissives rather than bypassing the interlock.",
    "takeaway": "Never imply you personally conducted site tests if you only practiced FAT simulations."
  },
  {
    "question": "What would you do if a senior engineer asks you to change a live relay setting urgently?",
    "answer": "Changes to protection or control settings can affect equipment safety and service continuity. I would follow authorization, change management, backup and testing procedures rather than make an undocumented live change.",
    "steps": [
      "Confirm the request, affected device and operational risk.",
      "Check work permit, approved settings and responsible authority.",
      "Back up the current configuration and record the existing revision.",
      "Prepare a reviewed change and rollback plan.",
      "Implement only with required authorization and safe operating conditions.",
      "Validate results and document the final as-built configuration."
    ],
    "scenario": "A request arrives to disable an interlock to complete a test. Escalate and use an approved isolated test arrangement instead.",
    "takeaway": "Safety and traceability are stronger answers than speed."
  },
  {
    "question": "How do you work with protection, SCADA and networking teams?",
    "answer": "SAS integration crosses disciplines. Clear interface definitions, approved signal lists, coordinated test windows and defect ownership reduce integration errors.",
    "steps": [
      "Confirm the responsible team for each IED, switch, gateway and HMI function.",
      "Use shared interface documents and configuration revisions.",
      "Communicate exact object references, IP/VLAN details and test expectations.",
      "Capture evidence before escalating faults.",
      "Track ownership, corrective actions and retest results."
    ],
    "scenario": "A GOOSE subscription fails. Share the publisher capture and subscriber configuration evidence with the protection and network teams rather than assigning blame.",
    "takeaway": "Explain technical collaboration using artifacts and test evidence."
  },
  {
    "question": "How do you handle an unfamiliar engineering tool?",
    "answer": "I first confirm the supported device and tool version, read vendor documentation, work on a backed-up offline project, and validate any change in a safe test environment. I ask for review before touching production configurations.",
    "steps": [
      "Identify the tool, device model, firmware and required license or package.",
      "Study the relevant engineering workflow and safety notes.",
      "Open a training project or backed-up configuration.",
      "Practice read, compare, export and validation functions.",
      "Record results and request peer review.",
      "Move to live systems only after authorization and competency checks."
    ],
    "scenario": "Asked about a tool you have only seen in training, explain what you practiced and what you would need to learn for deployment.",
    "takeaway": "An accurate limitation plus a structured learning plan is better than a false claim."
  },
  {
    "question": "Describe a difficult troubleshooting situation and what you learned.",
    "answer": "Use a clear Situation–Task–Action–Result structure. The result should be measurable or observable, and the description should be based on a genuine project or lab exercise.",
    "steps": [
      "State the symptom and operational impact.",
      "Explain your assigned task and the initial evidence.",
      "Describe the checks in the order you performed them.",
      "Identify the actual root cause, or say if it remained unresolved.",
      "Report the observed result and a preventive lesson."
    ],
    "scenario": "In a training lab, an HMI breaker symbol failed to change after a script edit. Explain the tag binding, script test, correction and verified outcome if that is what actually happened.",
    "takeaway": "Never invent an outage, site incident or customer project to make the story impressive."
  },
  {
    "question": "What is the difference between your knowledge and your hands-on experience?",
    "answer": "Knowledge means I can explain a concept and its configuration principles; hands-on experience means I personally used the relevant tools or equipment and verified results. Site commissioning, factory testing and laptop simulation are different types of exposure.",
    "steps": [
      "List concepts you can explain confidently.",
      "List tools you actually operated and what you did with them.",
      "Separate simulated tests from physical equipment testing.",
      "Identify gaps you are actively closing.",
      "Offer to walk through a real configuration or troubleshooting exercise."
    ],
    "scenario": "If asked whether you commissioned a relay on site, answer directly and then explain your related offline configuration and test practice.",
    "takeaway": "Precise experience claims help the interviewer assess your readiness fairly."
  },
  {
    "question": "Why should we hire you for a 2–3 years SAS engineering role?",
    "answer": "My strengths are structured IEC 61850 and SCADA fundamentals, careful troubleshooting, documentation discipline and willingness to learn vendor-specific workflows. I can contribute to engineering support and testing tasks appropriate to my demonstrated skills, and I will escalate unfamiliar or safety-critical work.",
    "steps": [
      "Match your verified skills to the job description.",
      "Give one genuine technical example.",
      "Emphasize evidence-based testing and safe change management.",
      "Show willingness to learn the employer's engineering tools.",
      "Avoid unsupported promises about independent commissioning experience."
    ],
    "scenario": "For a multi-vendor integration role, highlight a real GOOSE mapping or MMS reporting exercise you completed and describe its limitations.",
    "takeaway": "Confidence comes from specific verifiable examples, not overstated experience."
  }
];

const chapterEighteenQuestions: InterviewQuestion[] = [
  {
    "question": "Explain a typical SAS architecture from process level to station level.",
    "answer": "A SAS integrates process equipment and IEDs with station-level SCADA, engineering workstations, gateways, and time sources. Bay-level protection and control functions remain engineered independently of the operator display. IEC 61850 MMS commonly supports supervision and control; GOOSE supports fast peer-to-peer event exchange.",
    "steps": [
      "Review the approved architecture drawing.",
      "Identify process interfaces and bay ieds.",
      "Trace station-bus communication.",
      "Verify server and gateway roles.",
      "Check redundancy and time synchronization.",
      "Validate one signal end to end."
    ],
    "scenario": "An HMI loses one bay while other bays remain healthy. Trace that bay IED, switch path, MMS session, report and SCADA mapping.",
    "takeaway": "Explain functional layers and actual interfaces, not only a block diagram."
  },
  {
    "question": "How does redundant SCADA server architecture work?",
    "answer": "Two servers may operate as primary/standby or in another vendor-specific redundancy model. Redundancy involves application state, acquisition ownership, historian/event synchronization, and operator connectivity, not simply two PCs on a network.",
    "steps": [
      "Identify the redundancy design and active roles.",
      "Inspect heartbeat and application health.",
      "Verify acquisition ownership and report reservations.",
      "Test planned failover in fat.",
      "Confirm hmi values and soe continuity.",
      "Test recovery and failback behavior."
    ],
    "scenario": "Primary SCADA fails and the standby becomes active but some IED reports stop. Check RCB reservation and report re-enablement by the new client.",
    "takeaway": "Never assume failover is seamless without functional tests."
  },
  {
    "question": "What is gateway redundancy and how would you test it?",
    "answer": "Station gateways may use active/standby or other supported redundancy schemes to maintain remote control center communication. The mechanism, addressing, state replication and command authority depend on the gateway vendor and protocol configuration.",
    "steps": [
      "Review gateway redundancy specification.",
      "Confirm upstream iec 61850 acquisition.",
      "Check downstream iec 104 or other interface.",
      "Verify active gateway selection.",
      "Simulate approved primary loss.",
      "Check gi, indications, events and commands.",
      "Document recovery behavior."
    ],
    "scenario": "Remote control center stops receiving events after gateway switchover although the standby TCP session is established. Verify event queues, interrogation and mapping.",
    "takeaway": "Distinguish a healthy TCP connection from healthy application data."
  },
  {
    "question": "Compare PRP and HSR in a redundant substation network.",
    "answer": "PRP sends duplicate frames over independent LAN A and LAN B; a dual-attached node accepts the first valid copy and discards duplicates. HSR uses a ring where participating nodes forward frames around both directions. RedBoxes can interface singly attached equipment with a redundant domain where supported.",
    "steps": [
      "Identify topology and node capability.",
      "Verify prp lan independence or hsr ring connections.",
      "Inspect duplicate-discard and link counters.",
      "Perform controlled single-link failure tests.",
      "Confirm application continuity.",
      "Document alarms and recovery."
    ],
    "scenario": "An IED continues MMS on PRP LAN A failure but raises a redundancy alarm. That may be expected continuity with degraded redundancy; investigate the failed path.",
    "takeaway": "PRP and HSR are distinct designs, not interchangeable switch settings."
  },
  {
    "question": "How do you integrate single-attached devices into a redundant station network?",
    "answer": "A single-attached node does not natively provide PRP or HSR redundancy. Depending on the architecture, a RedBox or supported infrastructure can connect it to a redundant network, but the device-side link can remain a single point of failure.",
    "steps": [
      "Identify san, danp or danh device capabilities.",
      "Review approved redbox topology.",
      "Check ports and vlans.",
      "Validate mac learning and duplicate handling.",
      "Test path failure.",
      "Document residual single points of failure."
    ],
    "scenario": "A legacy gateway connects through a RedBox and loses service when its only copper cable is unplugged. Explain why network redundancy does not protect that single device link.",
    "takeaway": "State the limits of redundancy clearly."
  },
  {
    "question": "How do you design VLANs for MMS and GOOSE traffic?",
    "answer": "VLANs can segment traffic and support engineering control of multicast forwarding. MMS generally uses TCP/IP while conventional GOOSE is Ethernet Layer 2 multicast. VLAN IDs, tagging, priorities and port membership must match the approved station design.",
    "steps": [
      "Review vlan and port schedule.",
      "Verify trunk/access tagging behavior.",
      "Inspect publisher vlan and priority.",
      "Check multicast forwarding and subscriber port membership.",
      "Capture tagged frames.",
      "Test controlled changes and restore baseline."
    ],
    "scenario": "GOOSE is visible on the publisher switch port but not at the subscriber. Check VLAN membership and multicast filtering before editing the relay DataSet.",
    "takeaway": "GOOSE is not made routable by adding an IP address."
  },
  {
    "question": "What is IEC 61850 interoperability and how is it validated?",
    "answer": "Interoperability means independently engineered devices and clients exchange required services and data correctly. Standards compliance helps but does not guarantee every optional service, control model or vendor interpretation will match the station requirements.",
    "steps": [
      "Compare device capability and conformance information.",
      "Validate scl versions and data models.",
      "Check dataset/rcb and gocb compatibility.",
      "Confirm control model and quality handling.",
      "Run cross-vendor functional tests.",
      "Record deviations."
    ],
    "scenario": "A SCADA client can read values from a third-party IED but cannot operate a breaker. Verify control model, authority, origin and command sequence.",
    "takeaway": "Test each required service rather than claiming interoperability from a successful ping."
  },
  {
    "question": "How do you manage SCD revisions across multiple vendors?",
    "answer": "The SCD is the coordinated station configuration description. Engineering changes may affect IED subscriptions, reports, naming and communication parameters; updates need controlled distribution and device-level validation.",
    "steps": [
      "Back up approved scd and vendor projects.",
      "Document requested change.",
      "Validate scl syntax and object references.",
      "Regenerate affected ied configuration exports.",
      "Compare confrev and subscription mappings.",
      "Deploy through approved change control.",
      "Retest impacted functions."
    ],
    "scenario": "A publisher DataSet changes after an SCD revision but subscriber configuration is not updated. GOOSE frames arrive while the subscriber rejects the new configuration.",
    "takeaway": "An SCD update is not automatically downloaded to all devices."
  },
  {
    "question": "How do you isolate a system-wide communication fault?",
    "answer": "System-wide faults require determining the scope and common dependencies before changing individual devices. Possible shared causes include switch uplinks, VLAN changes, time source failures, server acquisition faults and gateway configuration.",
    "steps": [
      "List affected and unaffected ieds.",
      "Identify common network paths and services.",
      "Check switch health and recent changes.",
      "Inspect mms/goose packet captures.",
      "Correlate server and gateway logs.",
      "Apply one controlled correction.",
      "Verify restoration and root cause."
    ],
    "scenario": "Multiple bays become stale simultaneously after a core switch maintenance window. Compare affected VLANs and uplink counters rather than changing every relay.",
    "takeaway": "Use a fault-domain approach to avoid unnecessary changes."
  },
  {
    "question": "How do you test time synchronization in a redundant SAS?",
    "answer": "Accurate event sequence depends on source clock health, protocol configuration, device support and timestamp handling. Redundant time servers may provide resilience, but failover behavior and accuracy must be verified.",
    "steps": [
      "Identify supported ntp/sntp, ptp or irig-b sources.",
      "Verify source priorities.",
      "Inspect ied synchronization quality.",
      "Compare event timestamps across devices.",
      "Isolate the primary source in a controlled test.",
      "Verify backup synchronization and alarms."
    ],
    "scenario": "After a time-server failure, SOE order appears inconsistent across bays. Inspect clock offset, synchronization flags and source timestamps.",
    "takeaway": "Do not infer event order solely from server arrival time."
  },
  {
    "question": "How would you plan a full-system FAT for a redundant SAS?",
    "answer": "A system FAT should validate integrated functions and failure recovery using approved architecture, signal lists, control philosophy and acceptance criteria. Tests must include negative and degraded-mode behavior, not only nominal indications.",
    "steps": [
      "Review approved test scope and safety isolation.",
      "Verify network and time services.",
      "Test representative mms reports and goose.",
      "Validate scada/hmi and gateway mapping.",
      "Test server, gateway and network failover.",
      "Check control rejection and alarm handling.",
      "Record evidence and defects."
    ],
    "scenario": "The HMI remains responsive during server failover but breaker controls time out. Record the failed control path and examine active-server command ownership.",
    "takeaway": "Include restoration and regression tests after each simulated fault."
  },
  {
    "question": "How do you approach cybersecurity and change control in SAS integration?",
    "answer": "Substation automation changes must preserve availability, integrity and operational safety. Access permissions, network segmentation, backups, logging and reviewed change windows help prevent unplanned outages. Exact controls depend on the project security policy.",
    "steps": [
      "Identify assets and approved access paths.",
      "Back up current configurations.",
      "Assess impact on protection and control.",
      "Review firewall/acl and management services.",
      "Apply changes in an authorized window.",
      "Test critical functions.",
      "Preserve logs and rollback plan."
    ],
    "scenario": "A new switch ACL blocks TCP 102 and SCADA reports become stale. Validate the rule against approved traffic requirements rather than disabling all security controls.",
    "takeaway": "Never bypass protections or security rules just to complete a test."
  }
];

const chapterNineteenQuestions: InterviewQuestion[] = [
  {
    "question": "How do you plan system-level SAS commissioning before energization?",
    "answer": "Commissioning is a controlled verification of the complete SAS, from IEDs and networks through SCADA and the gateway. The plan must define scope, responsibilities, safety boundaries, prerequisites and acceptance evidence.",
    "steps": [
      "Review approved drawings, signal lists, SCD files, network design and test procedures.",
      "Confirm IED firmware, configuration revisions, IP/VLAN plan and time source.",
      "Agree isolation boundaries, work permits, control authority and rollback plans.",
      "Verify communication and point mapping before any functional control test.",
      "Execute approved test cases and record expected/actual values, quality and timestamps.",
      "Close punch-list items with retest evidence and obtain sign-off."
    ],
    "scenario": "During pre-energization checks, a bay has correct MMS communication but an unverified close interlock. Hold the affected control test until the permissive logic is reviewed and safe isolation is confirmed.",
    "takeaway": "Acceptance is evidence-based; a green communication indicator is not commissioning sign-off."
  },
  {
    "question": "An entire bay disappears from SCADA after a switch replacement. How do you isolate the fault?",
    "answer": "A complete bay outage suggests a shared communication path or configuration issue, but it should not be assumed. Compare switch port status, VLAN membership, addressing and IEC 61850 services with the approved baseline.",
    "steps": [
      "Define the scope: one IED, one bay, or multiple bays.",
      "Check power, fibre/SFP link, port errors and switch logs.",
      "Compare replacement switch VLAN tagging, port membership and trunk settings.",
      "Verify IP/ARP connectivity and TCP 102 access for MMS where permitted.",
      "Inspect SCADA association and reporting status after connectivity is restored.",
      "Recheck alarms, status, controls and redundancy; record the root cause."
    ],
    "scenario": "The new switch has the correct physical links but the bay VLAN is not permitted on its uplink. Correct the approved switch configuration and repeat point tests.",
    "takeaway": "Do not change IED settings until the shared network path is understood."
  },
  {
    "question": "GOOSE packets are visible, but an interlocking permissive is not updating. What is your approach?",
    "answer": "GOOSE reception at a capture point does not prove successful subscription or application logic. Check publisher configuration, subscriber mapping, supervision and quality before interpreting the permissive.",
    "steps": [
      "Confirm the publisher DataSet value changes and GoCB is enabled.",
      "Inspect APPID, destination MAC, VLAN, confRev, stNum and sqNum in capture.",
      "Verify the subscriber expects the correct publisher reference and DataSet member order/types.",
      "Inspect subscriber GOOSE supervision, quality and validity diagnostics.",
      "Check the mapped internal signal and interlocking logic.",
      "Use approved isolated tests and verify the final permissive without bypassing safety logic."
    ],
    "scenario": "A firmware update changed the publisher DataSet revision; the subscriber sees frames but rejects the configuration. Update engineering consistently and retest.",
    "takeaway": "Separate Ethernet delivery, subscription acceptance and protection logic."
  },
  {
    "question": "What would you do if MMS reports stop after a SCADA server failover?",
    "answer": "Server failover may change the MMS client identity, associations and RCB ownership. Buffered and unbuffered reporting behavior depends on IED capabilities and client configuration.",
    "steps": [
      "Confirm which SCADA server is active and whether the standby took over.",
      "Check network reachability and MMS association from the new active server.",
      "Inspect report control reservation, enablement and configured client identity.",
      "Verify DataSet, trigger options, GI and buffered entry handling as applicable.",
      "Compare received report traffic with SCADA point status and timestamps.",
      "Test failback and record expected report continuity and any gaps."
    ],
    "scenario": "After failover, the new active server establishes MMS but does not enable the assigned BRCB. Restore the approved client/RCB workflow and retest.",
    "takeaway": "A successful failover ping is not proof of report recovery."
  },
  {
    "question": "How do you test PRP redundancy without interrupting SAS functions?",
    "answer": "PRP dual-attached nodes use independent LAN A and LAN B paths. A valid redundancy test demonstrates continued communication after an approved single-LAN failure while preserving diagnostics and service quality.",
    "steps": [
      "Confirm DANP connections to physically independent LAN A and LAN B.",
      "Record baseline link status, PRP diagnostics and normal MMS/GOOSE behavior.",
      "Obtain authorization for a controlled single-path interruption.",
      "Disable or disconnect one approved test path while monitoring point updates and packet counters.",
      "Verify traffic continuity, loss diagnostics and recovery after restoring the path.",
      "Repeat for the other LAN only if the approved procedure allows it."
    ],
    "scenario": "A station remains operational when LAN A is disconnected but an IED reports PRP duplicate discard errors after reconnection. Inspect LAN separation and topology.",
    "takeaway": "Do not disconnect both PRP LANs or treat two ports on one switch as independent redundancy."
  },
  {
    "question": "How do you investigate an incorrect SOE sequence during a trip event?",
    "answer": "SOE ordering depends on source timestamps, time synchronization, timestamp quality and event buffering. SCADA arrival order can differ from the actual event order.",
    "steps": [
      "Collect IED event records and SCADA SOE exports for the same incident.",
      "Check UTC/time zone handling and whether devices were synchronized.",
      "Compare source timestamps, timestamp quality and server receive times.",
      "Inspect SNTP/PTP/IRIG-B source status, offsets and holdover alarms.",
      "Check event buffering, gateway translation and report delay.",
      "Correct the verified cause and perform a controlled multi-event test."
    ],
    "scenario": "SCADA shows breaker open before protection trip, but the relay clock is several seconds ahead of the BCU. Repair synchronization and retest ordering.",
    "takeaway": "Do not reorder records manually to make an event sequence appear correct."
  },
  {
    "question": "A breaker close command is rejected even though the HMI shows all permissives healthy. How do you troubleshoot?",
    "answer": "The HMI display may not reflect every IED-level permissive or the configured control model. Control failures require examination of authority, interlocking, SBO sequence and device response.",
    "steps": [
      "Confirm the equipment is in an approved isolated test state and remote control is permitted.",
      "Check Local/Remote, operator authority and command object reference.",
      "Inspect CILO, synchrocheck, spring charge and other required permissives.",
      "Verify direct-operate or SBO workflow, select timeout and origin attributes.",
      "Read the device command response and event log, not just the HMI message.",
      "Correct the underlying configuration or condition and repeat the approved test."
    ],
    "scenario": "The HMI permissive tag is stale while CILO reports blocked. Fix acquisition/quality handling rather than bypassing the interlock.",
    "takeaway": "Never force a breaker close to demonstrate successful commissioning."
  },
  {
    "question": "IEC 104 gateway is connected to RCC but some indications are wrong. What is your troubleshooting method?",
    "answer": "IEC 104 link health does not prove correct information-object mapping, quality, timestamps or command handling. Diagnose source-to-gateway-to-master mapping point by point.",
    "steps": [
      "Identify affected IOAs, types and common address from the approved point list.",
      "Verify corresponding IED/SCADA source values and quality.",
      "Inspect gateway mapping, inversion, timestamp conversion and scaling.",
      "Check IEC 104 spontaneous transmission and General Interrogation behavior.",
      "Compare gateway transmit capture with RCC received values.",
      "Retest corrected points and ensure other mapped points remain unaffected."
    ],
    "scenario": "RCC shows a feeder disconnector open when it is closed because the gateway point polarity was inverted. Correct the mapping and document the test.",
    "takeaway": "Use source, gateway and control-centre evidence to isolate the first wrong stage."
  },
  {
    "question": "How do you diagnose intermittent MMS disconnections across multiple IEDs?",
    "answer": "Intermittent outages may originate from congestion, switch errors, routing, duplicated addresses, server resource exhaustion or session timeouts. A time-correlated evidence set is essential.",
    "steps": [
      "Build a timeline from SCADA logs and IED communication alarms.",
      "Check switch port errors, interface utilization, MAC flapping and redundancy events.",
      "Inspect duplicate IP/ARP anomalies and TCP retransmissions in captures.",
      "Review server CPU, memory, connection limits and MMS client behavior.",
      "Correlate disconnects with backups, network changes or traffic bursts.",
      "Apply one controlled correction and verify stability over an agreed observation period."
    ],
    "scenario": "Multiple relays disconnect at the same minute during a scheduled network scan. Confirm correlation and review authorized scan scope with the cybersecurity team.",
    "takeaway": "Avoid restarting all IEDs before collecting evidence."
  },
  {
    "question": "What is your process for a multi-vendor SCD or firmware change during SAT?",
    "answer": "A late SCD or firmware change can affect object references, DataSets, GOOSE subscriptions, report control settings and vendor project compatibility. Changes require impact assessment and regression testing.",
    "steps": [
      "Identify the exact devices, firmware and SCL revisions affected.",
      "Back up vendor projects and installed configurations.",
      "Run SCL validation and compare the approved station model with new exports.",
      "Review MMS references, RCBs, GoCBs, confRev and subscriber mapping.",
      "Deploy only under approved change control and maintain rollback artifacts.",
      "Run targeted regression tests and update as-built documentation."
    ],
    "scenario": "An updated publisher firmware changes GOOSE DataSet structure. Retest every subscriber that depends on the publisher before SAT sign-off.",
    "takeaway": "A successful configuration download is not proof of system interoperability."
  },
  {
    "question": "How do you handle a critical FAT/SAT defect that cannot be resolved immediately?",
    "answer": "Critical defects require a clear risk assessment, containment, ownership and formal disposition. Testing may continue only where safe and authorized; acceptance should not hide unresolved functions.",
    "steps": [
      "Log the defect with equipment ID, reproducible steps and expected/actual results.",
      "Capture logs, screenshots, packet traces and configuration versions.",
      "Classify severity and operational or safety impact with responsible engineers.",
      "Define containment and stop affected tests if needed.",
      "Assign corrective action, retest criteria and due date.",
      "Obtain formal review of residual risk and acceptance status."
    ],
    "scenario": "An interlocking signal remains unreliable before energization. Keep the function open as a blocking defect rather than marking the test passed.",
    "takeaway": "A punch-list item is not closed until its fix is verified."
  },
  {
    "question": "Explain a structured root-cause analysis after a SAS integration failure.",
    "answer": "Root-cause analysis should distinguish symptoms from the underlying defect and establish evidence linking the cause to the failure. Corrective actions should include prevention and regression checks.",
    "steps": [
      "State the failure, affected scope and impact in precise terms.",
      "Build a timeline using device logs, SCADA events and network captures.",
      "List plausible causes across field, IED, network, protocol, database and HMI layers.",
      "Test hypotheses against observations without making unsafe changes.",
      "Document the confirmed cause, correction and verification results.",
      "Update engineering checklists, baselines or tests to prevent recurrence."
    ],
    "scenario": "A GOOSE subscriber fails after a switch replacement. Evidence shows the switch port dropped the required VLAN; revise the switch acceptance checklist.",
    "takeaway": "An interview answer is stronger when it explains why other suspected causes were ruled out."
  }
];

const chapterTwentyQuestions: InterviewQuestion[] = [
  {
    "question": "In two minutes, explain the complete SAS signal path from a breaker to the control centre.",
    "answer": "Start with the breaker auxiliary contact, IED input and IEC 61850 data object. The station SCADA acquires the value using its configured MMS reporting or other acquisition service, then maps it to a database point and HMI symbol. A station gateway separately maps approved signals to the control-centre protocol, commonly IEC 60870-5-104. The status, quality and event timestamp must remain consistent throughout.",
    "steps": [
      "Identify the physical contact and IED terminal.",
      "Verify the IED data reference, such as XCBR.Pos.stVal, quality and timestamp.",
      "Confirm DataSet, RCB and MMS report delivery to SCADA.",
      "Verify SCADA point mapping, alarm/SOE and HMI symbol.",
      "Check gateway point address, type, quality mapping and control-centre receipt."
    ],
    "scenario": "IED shows breaker Open, local HMI shows Open, but RCC shows Closed. Isolate the fault at gateway mapping, IEC 104 transfer or RCC database rather than changing the relay.",
    "takeaway": "Give the path in order and identify the first stage with incorrect data."
  },
  {
    "question": "An IED responds to ping, but the SCADA server cannot establish MMS communication. What do you check?",
    "answer": "Ping proves only that ICMP reachability may exist. MMS uses TCP port 102 and application association services, so firewall policy, TCP connectivity, service availability and client/server compatibility must be verified separately.",
    "steps": [
      "Confirm correct IP, subnet, VLAN and physical link.",
      "Test TCP port 102 reachability from the actual SCADA host.",
      "Check IED MMS server enablement and allowed client connections.",
      "Inspect association attempts and error messages in SCADA logs or Wireshark.",
      "Check supported services, configuration revisions and server capacity.",
      "Retest association and confirm a valid data read or report."
    ],
    "scenario": "A laptop pings the relay but SCADA shows connection refused on TCP 102. Check IED service and access restrictions before altering RCB settings.",
    "takeaway": "Ping success does not prove IEC 61850 application connectivity."
  },
  {
    "question": "MMS association is healthy, but breaker status is not updating. Explain your troubleshooting sequence.",
    "answer": "A live MMS association is not the same as correct report delivery. The source object, DataSet, Report Control Block and SCADA mapping must all be consistent. For polling systems, inspect the polling request and response instead.",
    "steps": [
      "Confirm the IED source value changes and has valid quality.",
      "Check the expected DataSet member and functional constraint.",
      "Inspect RCB enabled state, reservation, trigger options and report identifier.",
      "Capture report traffic and verify the object reference and value.",
      "Check SCADA acquisition status, tag mapping and HMI binding.",
      "Correct the first failed stage and repeat the controlled test."
    ],
    "scenario": "After a SCADA restart, indications freeze although the association returns. Verify that the client re-enables the intended RCB instance.",
    "takeaway": "Distinguish association, acquisition and visualization."
  },
  {
    "question": "GOOSE packets are visible in Wireshark but the subscriber output does not operate. Why?",
    "answer": "GOOSE packet visibility proves network delivery at the capture point, not that the subscriber accepts the message or its application logic operates. Subscription matching, DataSet structure, configuration revision, quality and interlocks can all block the intended action.",
    "steps": [
      "Verify publisher GoCB, DataSet and actual transmitted values.",
      "Compare APPID, multicast MAC, VLAN and confRev with subscriber engineering.",
      "Confirm expected DataSet member order, types and external references.",
      "Inspect subscriber communication supervision and quality checks.",
      "Verify downstream logic, permissives and output mapping.",
      "Perform an isolated, approved functional test with trip outputs controlled."
    ],
    "scenario": "Publisher changes a permissive, stNum increments, but subscriber does not respond after an SCD update. Compare confRev and imported subscriber mapping.",
    "takeaway": "Do not bypass protection or interlocks to make a GOOSE test pass."
  },
  {
    "question": "How do you prove PRP redundancy during FAT without causing an outage?",
    "answer": "PRP dual-attached nodes send duplicate frames over independent LAN A and LAN B. A valid redundancy test verifies communication continuity during an approved single-LAN failure and restores both paths afterward.",
    "steps": [
      "Review topology and confirm the two LANs are independent.",
      "Check DANP ports, switch links and redundancy diagnostics.",
      "Establish baseline MMS, GOOSE and alarm behavior.",
      "Under an approved FAT procedure, isolate one LAN path.",
      "Verify continuity, packet loss indicators and device alarms.",
      "Restore the LAN, repeat for the other path if authorized, and record evidence."
    ],
    "scenario": "SCADA stays online when LAN A is disconnected, but a switch alarm appears. This can be expected; investigate if any required data path actually fails.",
    "takeaway": "Do not confuse PRP with RSTP or HSR."
  },
  {
    "question": "A breaker Close command from HMI is rejected. How do you diagnose it safely?",
    "answer": "Breaker control depends on operator authority, Local/Remote status, the IEC 61850 control model, device permissives and the physical switching circuit. A rejected command can be correct behavior when an interlock is not satisfied.",
    "steps": [
      "Confirm authorization and equipment test isolation.",
      "Verify the selected breaker and HMI command mapping.",
      "Check Local/Remote mode and operator access rights.",
      "Inspect CSWI/CILO permissives, synchrocheck and interlocking logic.",
      "Check Direct Operate or SBO select/operate sequence and diagnostic response.",
      "Verify command outcome using independent XCBR feedback; record rejection reason."
    ],
    "scenario": "Close is rejected because an earthing switch is closed. Confirm the interlock and report the expected rejection; never force the close.",
    "takeaway": "A safe refusal is not automatically a software defect."
  },
  {
    "question": "SOE event order is incorrect after commissioning. What could cause it?",
    "answer": "Incorrect SOE order may come from clock drift, unsynchronized IEDs, UTC/time-zone conversion, different timestamp sources, delayed reporting or SCADA sorting by arrival time rather than event time.",
    "steps": [
      "Compare IED clock against the approved time source.",
      "Check NTP/SNTP/PTP/IRIG-B configuration as applicable.",
      "Inspect event timestamp, time-quality flags and server arrival time.",
      "Confirm UTC and local time conversions across systems.",
      "Generate two safe test events in known order.",
      "Correct synchronization or display processing and repeat the SOE test."
    ],
    "scenario": "A trip appears before protection pickup in SCADA although relay logs show the opposite. Compare source timestamps and time-quality before blaming logic.",
    "takeaway": "Always distinguish event time from receipt time."
  },
  {
    "question": "The control centre receives IEC 104 indications but remote commands fail. Where do you look?",
    "answer": "IEC 104 monitoring and control can use different mappings, permissions and command semantics. Successful indications do not prove that command addresses, select/execute sequences and interlocks are configured correctly.",
    "steps": [
      "Check gateway IEC 104 connection and command permissions.",
      "Verify command Type ID, common address and information object address.",
      "Check select/execute behavior and cause-of-transmission handling.",
      "Trace gateway-to-IED control mapping and IEC 61850 control model.",
      "Verify Local/Remote and device interlocks.",
      "Use an approved isolated command test and review confirmations."
    ],
    "scenario": "RCC sees breaker status but receives negative confirmation for Close. Inspect IEC 104 command mapping and IED rejection reason.",
    "takeaway": "Treat remote commands as safety-critical; do not test on live equipment without authorization."
  },
  {
    "question": "What is your method for diagnosing a multi-vendor IED integration issue?",
    "answer": "First verify the device's actual IEC 61850 capabilities and deployed configuration, then compare the station SCL engineering model with online behavior. Different vendor tools may express similar services differently, so packet evidence and object references are useful neutral references.",
    "steps": [
      "Record device model, firmware, vendor tool and SCL file revisions.",
      "Validate ICD/IID/CID/SCD consistency and actual online model.",
      "Compare DataSets, RCBs, GoCBs, confRev and data types.",
      "Verify IP/VLAN and network transport separately.",
      "Use IEC 61850 browser and Wireshark captures for independent evidence.",
      "Document correction, approval and regression test."
    ],
    "scenario": "After replacing an IED, SCADA reports work but a GOOSE subscriber flags configuration mismatch. Compare the new device's publisher confRev and DataSet.",
    "takeaway": "Do not assume an imported ICD represents the installed configuration."
  },
  {
    "question": "During FAT you discover 15 unmapped alarms. How do you manage the defect?",
    "answer": "FAT issues should be documented with traceable references, severity, responsible owner, corrective action and retest evidence. The goal is controlled closure, not hiding exceptions to achieve sign-off.",
    "steps": [
      "Record each alarm with signal-list ID, expected result and observed result.",
      "Capture source values, screenshots and relevant logs.",
      "Classify impact and assign the appropriate engineering owner.",
      "Correct mapping or alarm logic through change control.",
      "Retest each affected point and related functionality.",
      "Update punch list and obtain required acceptance approval."
    ],
    "scenario": "A new HMI database import removes alarm priorities for several feeder points. Restore the approved configuration and regression-test all affected alarms.",
    "takeaway": "Explain defect tracking as well as technical diagnosis."
  },
  {
    "question": "Explain the difference between SNMP and SNTP in a substation network.",
    "answer": "SNMP monitors managed network devices using manager/agent polling, MIB/OID values and notifications such as traps. SNTP is a simpler time synchronization protocol based on NTP messaging. They solve different problems and may both be used in an SAS network.",
    "steps": [
      "Identify which switches and servers support SNMP monitoring.",
      "Check SNMP version, credentials, polling reachability and trap destinations.",
      "Verify interface/link alarms and relevant redundancy diagnostics.",
      "Identify the configured time source and clients for SNTP/NTP.",
      "Compare clock status and SOE timestamps separately from SNMP alarms."
    ],
    "scenario": "A switch reports a fibre-port-down SNMP trap while relay clocks remain synchronized. Network monitoring and time synchronization are independent functions.",
    "takeaway": "SNMP is monitoring; SNTP is time synchronization."
  },
  {
    "question": "How do you answer a question about work you have studied but not performed on site?",
    "answer": "Be precise about the level of exposure. Explain what you actually configured or tested in training, which steps you understand conceptually, and which site tasks would require supervision. Technical accuracy and transparency matter more than claiming unsupported commissioning experience.",
    "steps": [
      "State the actual context: project, FAT lab, simulation or study.",
      "Describe the exact device, tool, configuration and result you personally handled.",
      "Explain the correct engineering procedure and safety controls.",
      "Identify what you have not yet done independently.",
      "Offer a relevant troubleshooting walkthrough or demonstration."
    ],
    "scenario": "If asked whether you independently commissioned a PRP network, describe your genuine lab or observation experience rather than inventing a site commissioning claim.",
    "takeaway": "An interviewer can probe details; accurate experience descriptions build credibility."
  }
];

const questionsByChapter: Record<string, InterviewQuestion[]> = {
  '01': chapterOneQuestions,
  '02': chapterTwoQuestions,
  '03': chapterThreeQuestions,
  '04': chapterFourQuestions,
  '05': chapterFiveQuestions,
  '06': chapterSixQuestions,
  '07': chapterSevenQuestions,
  '08': chapterEightQuestions,
  '09': chapterNineQuestions,
  '10': chapterTenQuestions,
  '11': chapterElevenQuestions,
  '12': chapterTwelveQuestions,
  '13': chapterThirteenQuestions,
  '14': chapterFourteenQuestions,
  '15': chapterFifteenQuestions,
  '16': chapterSixteenQuestions,
  '17': chapterSeventeenQuestions,
  '18': chapterEighteenQuestions,
  '19': chapterNineteenQuestions,
  '20': chapterTwentyQuestions
};


// One export at a time, including rapid double-clicks before React can re-render.
let interviewPdfInProgress = false;

/** Export all 20 chapters or a specific chapter in the active language with full multi-script support. */
const exportInterviewPdf = async (targetChapterId?: string) => {
  if (interviewPdfInProgress) return;
  interviewPdfInProgress = true;
  const overlay = document.createElement('div');
  const frame = document.createElement('iframe');
  try {
    // Snapshot the selection and ensure the full static catalog for `lang` is loaded before rendering.
    const lang = getActiveLanguage();
    await ensureLanguageLoaded(lang);

    const tr = (value: string) => translateOfflineText(value, lang);
    const trKey = (key: string, fallback: string) => translateByKey(key, fallback, lang, translateOfflineText);
    const safe = (value: string) =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const text = (value: string) => safe(tr(value));
    const keyedText = (key: string, fallback: string) => safe(trKey(key, fallback));

    overlay.setAttribute('data-no-translate', '');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(2,12,24,.96);display:flex;align-items:center;justify-content:center;color:#fff;font:16px/1.5 Arial,sans-serif;';
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText =
      'background:#0b2539;border:1px solid #00cfff;border-radius:12px;padding:24px;max-width:460px;text-align:center;';
    status.textContent = tr(`Preparing ${lang} PDF...`);
    overlay.appendChild(status);
    document.body.appendChild(overlay);

    frame.title = 'PDF rendering surface';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('data-no-translate', '');
    frame.tabIndex = -1;
    frame.style.cssText =
      'position:fixed;left:0;top:0;width:800px;height:1200px;border:0;pointer-events:none;z-index:2147483646;background:#fff;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Could not create the PDF rendering surface.');

    const fontFamilies: Record<SupportedLanguageCode, string> = {
      EN: '"Noto Sans", Arial, sans-serif',
      TE: '"Noto Sans Telugu", "Nirmala UI", Gautami, "Noto Sans", sans-serif',
      TA: '"Noto Sans Tamil", "Nirmala UI", Latha, "Noto Sans", sans-serif',
      HI: '"Noto Sans Devanagari", "Nirmala UI", Mangal, "Noto Sans", sans-serif',
      PT: '"Noto Sans", Arial, sans-serif',
      KO: '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
      FR: '"Noto Sans", Arial, sans-serif',
      JA: '"Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", Meiryo, sans-serif',
    };
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const margin = 12;
    const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const pageWidth = 720;
    const pageHeight = Math.floor((pageWidth * usableHeight) / usableWidth);
    doc.open();
    doc.write(`<!doctype html><html lang="${safe(LANGUAGE_CODES[lang])}"><head><meta charset="utf-8"><style>
      * { box-sizing:border-box; }
      html, body { margin:0; padding:0; background:#fff; color:#142a3c; }
      body { font:14.5px/1.68 ${fontFamilies[lang]}; }
      #pdf-page { width:${pageWidth}px; height:${pageHeight}px; background:#fff; overflow:hidden; }
      #pdf-content { display:flow-root; width:100%; }
      article { display:flow-root; padding:0 0 12px; border-bottom:1px solid #e5eef5; margin-bottom:10px; }
      h1 { font-size:24px; line-height:1.42; color:#0a4467; margin:0 0 12px; }
      h2 { font-size:20px; line-height:1.48; color:#087c9d; margin:0 0 12px; }
      h3 { font-size:16.5px; line-height:1.58; color:#0f2940; margin:0 0 8px; }
      h4 { font-size:14.5px; color:#087c9d; margin:8px 0 3px; }
      p { margin:0 0 8px; }
      ol { margin:0 0 8px; padding-left:26px; }
      li { margin:0 0 4px; }
      h1,h2,h3,h4,p,li { overflow-wrap:anywhere; word-break:break-word; white-space:pre-wrap; }
    </style></head><body><div id="pdf-page"><div id="pdf-content"></div></div></body></html>`);
    doc.close();
    const page = doc.getElementById('pdf-page')!;
    const content = doc.getElementById('pdf-content')!;
    await doc.fonts.ready;
    let pageCount = 0;
    const fits = () => content.getBoundingClientRect().height <= pageHeight - 2;

    const flushPage = async () => {
      if (!content.textContent?.trim()) return;
      await doc.fonts.ready;
      const canvas = await html2canvas(page, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
        windowHeight: 1200,
        width: pageWidth,
        height: pageHeight,
      });
      try {
        if (!canvas.width || !canvas.height) throw new Error('The PDF page could not be rendered.');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas rendering is not available in this browser.');
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hasInk = false;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 230) {
            hasInk = true;
            break;
          }
        }
        if (!hasInk) throw new Error('An empty PDF page was detected. Please retry after fonts have loaded.');
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.94),
          'JPEG',
          margin,
          margin,
          usableWidth,
          (pageHeight * usableWidth) / pageWidth
        );
        pageCount++;
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
      content.replaceChildren();
    };

    const appendBlock = async (block: HTMLElement): Promise<void> => {
      content.appendChild(block);
      await doc.fonts.ready;
      if (fits()) return;
      block.remove();
      // A multi-element question must flow into the remaining page space.
      // Moving the whole article to the next page creates large blank areas.
      if (block.children.length) {
        const children = Array.from(block.children) as HTMLElement[];
        for (const [index, child] of children.entries()) {
          if (block.tagName === 'OL') {
            const numbered = doc.createElement('p');
            numbered.textContent = `${index + 1}. ${child.textContent ?? ''}`;
            await appendBlock(numbered);
          } else {
            await appendBlock(child);
          }
        }
        return;
      }

      // A single heading/paragraph may need a new page or a text split.
      let remaining = Array.from(block.textContent ?? '');
      while (remaining.length) {
        const part = block.cloneNode(false) as HTMLElement;
        content.appendChild(part);
        let low = 0,
          high = remaining.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          part.textContent = remaining.slice(0, mid).join('');
          if (fits()) low = mid;
          else high = mid - 1;
        }
        if (low === 0) {
          part.remove();
          if (content.textContent?.trim()) {
            await flushPage();
            continue;
          }
          throw new Error('A text block could not fit on an empty PDF page.');
        }
        let end = low;
        if (end < remaining.length) {
          for (let i = end - 1; i > end / 2; i--) {
            if (/\s/.test(remaining[i])) {
              end = i + 1;
              break;
            }
          }
        }
        part.textContent = remaining.slice(0, end).join('');
        remaining = remaining.slice(end);
        if (remaining.length) await flushPage();
      }
    };

    const appendHtml = async (html: string) => {
      const template = doc.createElement('template');
      template.innerHTML = html;
      for (const child of Array.from(template.content.children)) await appendBlock(child as HTMLElement);
    };

    const selectedChapters = targetChapterId
      ? chapters.filter((c) => c.id === targetChapterId)
      : chapters;

    // The front cover occupies the first PDF page, edge to edge.
    // The cover artwork is stored in public/assets/books, not in the translation JSON.
    const addFullPageCover = async (url: string, existingPage = false) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load PDF cover artwork: ${url}`);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Could not read PDF cover artwork: ${url}`));
        reader.readAsDataURL(blob);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Could not decode PDF cover artwork: ${url}`));
        img.src = dataUrl;
      });
      if (!existingPage) pdf.addPage();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      // Crop the artwork slightly instead of stretching it out of proportion.
      const pageRatio = pdfWidth / pdfHeight;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = 1240;
      canvas.height = Math.round(canvas.width / pageRatio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cover rendering is unavailable.');
      const sourceWidth = imageRatio > pageRatio ? image.naturalHeight * pageRatio : image.naturalWidth;
      const sourceHeight = imageRatio > pageRatio ? image.naturalHeight : image.naturalWidth / pageRatio;
      context.drawImage(image, (image.naturalWidth - sourceWidth) / 2,
        (image.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pdfWidth, pdfHeight);
      canvas.width = 0;
      canvas.height = 0;
      pageCount++;
    };

    await addFullPageCover('/assets/books/sas-interview-front-cover.png', true);
    // Reserve the Table of Contents on the second page.
    const tocPageNumber = pageCount + 1;
    const chapterStarts: Array<{ id: string; title: string; page: number }> = [];
    const tocTitle = tr('Table of Contents');
    const renderToc = (withPages: boolean) =>
      `<h1>${safe(tocTitle)}</h1>` +
      selectedChapters.map((chapter) => {
        const title = keyedText(`interview.chapter${chapter.id}.title`, chapter.title);
        const start = chapterStarts.find((entry) => entry.id === chapter.id);
        return `<div style="display:flex;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px dotted #b6c9d5;page-break-inside:avoid">` +
          `<span style="flex:1">${safe(chapter.id)}. ${title}</span>` +
          `<strong style="min-width:34px;text-align:right">${withPages && start ? start.page : '—'}</strong></div>`;
      }).join('');
    await appendHtml(renderToc(false));
    await flushPage();
    const total = selectedChapters.reduce((sum, chapter) => sum + (questionsByChapter[chapter.id] ?? []).length, 0);
    let done = 0;
    for (const chapter of selectedChapters) {
      const chTitle = keyedText(`interview.chapter${chapter.id}.title`, chapter.title);
      // Keep the chapter heading with enough room for its first question.
      if (content.getBoundingClientRect().height > pageHeight - 170) await flushPage();
      chapterStarts.push({ id: chapter.id, title: chTitle, page: pageCount + 1 });
      await appendHtml(
        `<h2>${keyedText('interview.ui.chapterWord', 'Chapter')} ${safe(chapter.id)}: ${chTitle}</h2>`
      );
      for (const [index, question] of (questionsByChapter[chapter.id] ?? []).entries()) {
        const qid = `q${String(index + 1).padStart(2, '0')}`;
        const qKeyBase = `interview.chapter${chapter.id}.${qid}`;
        const stepsHtml = question.steps
          .map((step, sIdx) => {
            const sid = `step${String(sIdx + 1).padStart(2, '0')}`;
            return `<li>${keyedText(`${qKeyBase}.${sid}`, step)}</li>`;
          })
          .join('');
        await appendHtml(
          `<article><h3>Q${String(index + 1).padStart(2, '0')}. ${keyedText(`${qKeyBase}.question`, question.question)}</h3>` +
            `<h4>${keyedText('interview.ui.detailedAnswer', 'Detailed Answer')}</h4><p>${keyedText(`${qKeyBase}.answer`, question.answer)}</p>` +
            `<h4>${keyedText('interview.ui.stepByStep', 'Step-by-Step Explanation')}</h4><ol>${stepsHtml}</ol>` +
            `<h4>${keyedText('interview.ui.practicalScenario', 'Practical Engineering Scenario')}</h4><p>${keyedText(`${qKeyBase}.scenario`, question.scenario)}</p>` +
            `<h4>${keyedText('interview.ui.interviewTip', 'Interview Tip')}</h4><p>${keyedText(`${qKeyBase}.takeaway`, question.takeaway)}</p></article>`
        );
        done++;
        status.textContent = tr(`Generating ${lang} PDF: ${done} / ${total} questions`);
      }
    }
    await flushPage();
    if (!pageCount) throw new Error('No interview content was available to export.');
    // Replace the reserved contents page with the actual chapter starting pages.
    content.innerHTML = renderToc(true);
    await doc.fonts.ready;
    if (!fits()) throw new Error('The table of contents exceeds its reserved page.');
    const tocCanvas = await html2canvas(page, {
      scale: 1.5, backgroundColor: '#ffffff', logging: false,
      scrollX: 0, scrollY: 0, windowWidth: 800, windowHeight: 1200,
      width: pageWidth, height: pageHeight,
    });
    try {
      pdf.setPage(tocPageNumber);
      pdf.addImage(tocCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin,
        usableWidth, (pageHeight * usableWidth) / pageWidth);
    } finally {
      tocCanvas.width = 0;
      tocCanvas.height = 0;
      content.replaceChildren();
    }
    // Append the back cover after the final chapter, as the last page.
    await addFullPageCover('/assets/books/sas-interview-back-cover.png');
    // Covers are full-bleed artwork; footer is printed on interior pages only.
    for (let number = 2; number < pageCount; number++) {
      pdf.setPage(number);
      pdf.setFontSize(8);
      pdf.setTextColor(80, 95, 110);
      pdf.text(
        `SAS Interview Preparation | ${lang} | Page ${number} of ${pageCount}`,
        margin,
        pdf.internal.pageSize.getHeight() - 5
      );
    }
    const fileName = targetChapterId
      ? `SAS_Interview_Chapter_${targetChapterId}_${lang}.pdf`
      : `SAS_Interview_All_20_Chapters_${lang}.pdf`;
    await pdf.save(fileName, { returnPromise: true });
  } catch (error) {
    window.alert(`PDF download failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    frame.remove();
    overlay.remove();
    interviewPdfInProgress = false;
  }
};

const downloadAllChaptersPdf = () => exportInterviewPdf();

export const InterviewPrepPage: React.FC = () => {
  const [selectedChapter, setSelectedChapter] = useState<string>('01');
  const [lang, setLang] = useState<SupportedLanguageCode>(() => getActiveLanguage());
  const [, setCatalogVersion] = useState<number>(0);

  useEffect(() => {
    const activeLang = getActiveLanguage();
    setLang(activeLang);
    void ensureLanguageLoaded(activeLang).then(() => setCatalogVersion((v) => v + 1));

    const onLangChange = (ev: Event) => {
      const next = (ev as CustomEvent<string>).detail ? getActiveLanguage() : getActiveLanguage();
      setLang(next);
      void ensureLanguageLoaded(next).then(() => setCatalogVersion((v) => v + 1));
    };
    const onLangReady = () => {
      setLang(getActiveLanguage());
      setCatalogVersion((v) => v + 1);
    };
    window.addEventListener('sas:language-change', onLangChange);
    window.addEventListener('sas:language-ready', onLangReady);
    return () => {
      window.removeEventListener('sas:language-change', onLangChange);
      window.removeEventListener('sas:language-ready', onLangReady);
    };
  }, []);

  const tr = (value: string) => translateOfflineText(value, lang);
  const trKey = (key: string, fallback: string) => translateByKey(key, fallback, lang, translateOfflineText);

  const [search, setSearch] = useState('');
  const [openQuestions, setOpenQuestions] = useState<number[]>([0]);
  const activeIndex = chapters.findIndex((chapter) => chapter.id === selectedChapter);
  const active = chapters[activeIndex] ?? chapters[0];
  const questions = questionsByChapter[active.id] ?? [];
  const matches = useMemo(
    () =>
      questions
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => {
          const needle = search.trim().toLowerCase();
          if (!needle) return true;
          const qid = `q${String(index + 1).padStart(2, '0')}`;
          const baseKey = `interview.chapter${active.id}.${qid}`;
          return [
            item.question,
            item.answer,
            ...item.steps,
            item.scenario,
            item.takeaway,
            trKey(`${baseKey}.question`, item.question),
            trKey(`${baseKey}.answer`, item.answer),
            trKey(`${baseKey}.scenario`, item.scenario),
            trKey(`${baseKey}.takeaway`, item.takeaway),
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle);
        }),
    [questions, search, active.id, lang]
  );

  useEffect(() => {
    setOpenQuestions([0]);
    setSearch('');
  }, [selectedChapter]);

  const toggleQuestion = (index: number) => {
    setOpenQuestions((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  };
  const changeChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) setSelectedChapter(chapters[index].id);
  };
  const allExpanded = matches.length > 0 && matches.every(({ index }) => openQuestions.includes(index));
  const toggleAll = () => {
    if (allExpanded) {
      setOpenQuestions([]);
    } else {
      setOpenQuestions(matches.map(({ index }) => index));
    }
  };

  return (
    <main className="interview-prep-page" aria-label={tr('Interview Preparation')}>
      <div className="interview-prep-shell">
        <header className="interview-prep-hero">
          <div className="interview-prep-eyebrow">
            <GraduationCap size={15} aria-hidden="true" />{' '}
            {trKey('interview.ui.eyebrow', 'SAS ENGINEERING HUB / INTERVIEW PREPARATION')}
          </div>
          <h1>{trKey('interview.ui.title', 'Substation Automation Interview Preparation')}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="interview-prep-download-pdf"
              onClick={downloadAllChaptersPdf}
              title={tr('Download all 20 chapters as a single PDF')}
            >
              <Download size={17} aria-hidden="true" />{' '}
              {trKey('interview.ui.downloadAllPdf', 'Download PDF — All 20 Chapters')}
            </button>
            <button
              type="button"
              className="interview-prep-action"
              onClick={() => exportInterviewPdf(active.id)}
              title={tr('Download current chapter as PDF')}
            >
              <Download size={15} aria-hidden="true" />{' '}
              {trKey('interview.ui.downloadChapterPdf', 'Download PDF — Current Chapter')} ({active.id})
            </button>
          </div>
          <p>
            {trKey('interview.ui.exp2to3', '2–3 Years Experience')} <span aria-hidden="true">|</span>{' '}
            {trKey('interview.ui.begToAdv', 'Beginner to Advanced')} <span aria-hidden="true">|</span>{' '}
            {trKey('interview.ui.pracTs', 'Practical Troubleshooting')}
          </p>
        </header>
        <section className="interview-prep-chapters" aria-labelledby="interview-chapters-heading">
          <div className="interview-prep-section-heading">
            <BookOpen size={19} aria-hidden="true" />
            <h2 id="interview-chapters-heading">{trKey('interview.ui.technicalChapters', 'Technical Chapters')}</h2>
          </div>
          <div className="interview-prep-dropdown-wrap">
            <select
              id="interview-prep-chapter-select"
              className="interview-prep-chapter-select"
              aria-label={tr('Select technical chapter')}
              value={selectedChapter}
              onChange={(event) => setSelectedChapter(event.target.value)}
            >
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.id} · {trKey(`interview.chapter${chapter.id}.title`, chapter.title)}
                </option>
              ))}
            </select>
            <ChevronDown size={19} aria-hidden="true" className="interview-prep-dropdown-icon" />
          </div>
        </section>
        <section className="interview-prep-selected" aria-labelledby="interview-active-chapter-heading">
          <span className="interview-prep-selected-label">
            {tr(`SELECTED CHAPTER · ${activeIndex + 1} OF ${chapters.length}`)}
          </span>
          <h2 id="interview-active-chapter-heading">
            {active.id} · {trKey(`interview.chapter${active.id}.title`, active.title)}
          </h2>
          <p className="interview-prep-chapter-intro">
            {tr(
              `${questions.length} detailed interview questions for 2–3 years of SAS engineering experience. Expand a question to read the explanation, procedure and scenario.`
            )}
          </p>
          <div className="interview-prep-toolbar">
            <label className="interview-prep-search-wrap">
              <Search size={17} aria-hidden="true" />
              <span className="interview-prep-sr-only">{tr('Search questions and answers in this chapter')}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={trKey('interview.ui.searchPlaceholder', 'Search this chapter...')}
                aria-label={tr('Search questions and answers in this chapter')}
              />
            </label>
            <button type="button" className="interview-prep-action" onClick={toggleAll} disabled={matches.length === 0}>
              {allExpanded
                ? trKey('interview.ui.collapseAll', 'Collapse all')
                : trKey('interview.ui.expandAll', 'Expand all')}
            </button>
          </div>
          <p className="interview-prep-results" role="status">
            {tr(
              `Showing ${matches.length} of ${questions.length} questions${
                search.trim() ? ' matching your search' : ''
              }`
            )}
          </p>
          <div className="interview-prep-question-list">
            {matches.length === 0 && (
              <p className="interview-prep-empty">
                {trKey('interview.ui.noMatching', 'No matching questions. Try a different search term.')}
              </p>
            )}
            {matches.map(({ item, index }) => {
              const isOpen = openQuestions.includes(index);
              const panelId = `interview-answer-${active.id}-${index}`;
              const qid = `q${String(index + 1).padStart(2, '0')}`;
              const qKeyBase = `interview.chapter${active.id}.${qid}`;
              return (
                <article className="interview-prep-qa" key={`${active.id}-${index}`}>
                  <button
                    type="button"
                    className="interview-prep-question-toggle"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleQuestion(index)}
                  >
                    <span className="interview-prep-question-number">Q{String(index + 1).padStart(2, '0')}</span>
                    <span className="interview-prep-question-text">{trKey(`${qKeyBase}.question`, item.question)}</span>
                    <ChevronDown className={isOpen ? 'is-open' : ''} size={19} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div id={panelId} className="interview-prep-answer">
                      <h3>{trKey('interview.ui.detailedAnswer', 'Detailed Answer')}</h3>
                      <p>{trKey(`${qKeyBase}.answer`, item.answer)}</p>
                      <h3>{trKey('interview.ui.stepByStep', 'Step-by-Step Explanation')}</h3>
                      <ol>
                        {item.steps.map((step, stepIndex) => {
                          const sid = `step${String(stepIndex + 1).padStart(2, '0')}`;
                          return <li key={stepIndex}>{trKey(`${qKeyBase}.${sid}`, step)}</li>;
                        })}
                      </ol>
                      <div className="interview-prep-scenario">
                        <h3>{trKey('interview.ui.practicalScenario', 'Practical Engineering Scenario')}</h3>
                        <p>{trKey(`${qKeyBase}.scenario`, item.scenario)}</p>
                      </div>
                      <div className="interview-prep-takeaway">
                        <strong>{trKey('interview.ui.interviewTipColon', 'Interview Tip:')}</strong>{' '}
                        {trKey(`${qKeyBase}.takeaway`, item.takeaway)}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <nav className="interview-prep-nav" aria-label={tr('Chapter navigation')}>
            <button
              type="button"
              className="interview-prep-action"
              disabled={activeIndex <= 0}
              onClick={() => changeChapter(activeIndex - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" /> {trKey('interview.ui.prevChapter', 'Previous chapter')}
            </button>
            <span>
              {activeIndex + 1} / {chapters.length}
            </span>
            <button
              type="button"
              className="interview-prep-action"
              disabled={activeIndex >= chapters.length - 1}
              onClick={() => changeChapter(activeIndex + 1)}
            >
              {trKey('interview.ui.nextChapter', 'Next chapter')} <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </section>
      </div>
    </main>
  );
};
