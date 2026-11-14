import React from 'react';
import dataModelImage from '../assets/iec61850/iec61850-data-model-futuristic.png';
const CARD = 'rounded-xl border border-[#224968] bg-[#091c32]/95 p-4 md:p-5';
export default function Iec61850Chapter03(){return <div className="space-y-3">
<section className={CARD} id="iec-ch03-3-1"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.1</span> What Is IEC 61850?</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">IEC 61850 is a family of international standards for communication networks and systems used in power utility automation. It defines a common information model, abstract communication services, mappings to communication protocols, and an engineering description language. It is not merely a network protocol or a replacement for every hardwired circuit.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">The main engineering advantage is that different manufacturers can describe substation functions using common names and data structures. Actual interoperability still depends on supported services, compatible data models, configuration and testing.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Standardized information models make the meaning of exchanged data clearer.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Communication, engineering configuration and conformance are distinct parts of the standard.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-2"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.2</span> IEC 61850 Data Model</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">IEC 61850 represents electrical functions through a structured hierarchy. An IED may host one or more logical devices. Each logical device contains logical nodes that represent functions, such as breaker monitoring or overcurrent protection. Logical nodes expose data objects, which in turn contain data attributes.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">For a breaker, the XCBR logical node exposes the Pos data object. Position status, quality and timestamp can be accessed through attributes such as stVal, q and t. The exact reference includes the configured logical-device and logical-node instance names, so it must be checked in the IED model.</p>
<figure className="my-4 overflow-hidden rounded-xl border border-[#00aeca] bg-[#061728]"><img src={dataModelImage} alt="Futuristic IEC 61850 data model hierarchy showing IED, Logical Device, Logical Node, Data Object and Data Attribute, with a circuit breaker position example" className="mx-auto block h-auto max-h-[320px] w-auto max-w-full object-contain" loading="lazy"/><figcaption className="px-3 py-2 text-[11px] leading-5 text-[#a5c7d9]">Illustrative IEC 61850 hierarchy. Verify exact data references, values, quality and timestamps against the configured IED; examples in the artwork are illustrative.</figcaption></figure>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• IED → Logical Device → Logical Node → Data Object → Data Attribute.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• DataSet membership and reporting are configured separately from the underlying data model.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-3"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.3</span> IEC 61850 Standard Parts and Their Functions</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">IEC 61850-7-2 defines the Abstract Communication Service Interface (ACSI). IEC 61850-7-3 defines common data classes; IEC 61850-7-4 defines compatible logical-node classes and data objects. IEC 61850-8-1 maps services to MMS and Ethernet GOOSE. IEC 61850-9-2 covers sampled-value mappings.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">IEC 61850-6 defines the Substation Configuration Language (SCL) used to exchange engineering information. IEC 61850-10 covers conformance testing. The series also contains other parts, technical reports and extensions relevant to specific applications.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Always distinguish a standardized data model from a protocol mapping.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Check the applicable edition and the device implementation conformance statement.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-4"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.4</span> Object-Oriented Data Model</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">The data model is function-oriented rather than a flat list of vendor-specific register numbers. A logical node groups information for one functional role, and each data object uses an appropriate common data class. This makes status, measurements and controls recognizable across equipment vendors.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">For example, XCBR1.Pos represents a breaker-position function; MMXU1.A can represent measured phase currents. These examples are not a guarantee that every relay exposes the same instance names or optional attributes.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Functions are represented by logical nodes.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Use the IED SCL file or online model browser to confirm the actual hierarchy.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-5"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.5</span> IED, Logical Device and Logical Node</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">An Intelligent Electronic Device (IED) is a physical or virtual automation device such as a protection relay or bay controller. A logical device groups logical nodes for an application or function, while a logical node is the smallest standardized functional building block.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">A feeder protection relay can contain a logical device with LLN0 for common logical-device information, LPHD for physical-device information, XCBR for breaker status, PTOC for overcurrent protection, and PTRC for trip conditioning. The actual model is vendor- and project-specific.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• IED is not synonymous with logical device.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• LLN0 is important for DataSets and report control blocks.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-6"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.6</span> Data Objects, Data Attributes and Functional Constraints</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">A data object represents information such as position (Pos), operation (Op), or measurement. Data attributes hold the values and metadata. Functional constraints classify attributes by use, such as ST for status, MX for measurements, CO for control, CF for configuration and DC for descriptions.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">When browsing an IEC 61850 server, the functional constraint is part of how an attribute is addressed in the service model. Do not confuse a data-object name with the actual value attribute.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• stVal is a status value; q indicates quality; t provides time information where defined.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Use the correct functional constraint when creating or validating signal mappings.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-7"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.7</span> Common Logical Nodes — XCBR, XSWI, MMXU, PTOC, PTRC</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">XCBR models circuit-breaker functions; XSWI models switching devices such as disconnectors; MMXU groups electrical measurements; PTOC models time-overcurrent protection; PTRC represents protection trip conditioning.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">For a 33 kV feeder, an overcurrent element can assert its operation data, the protection logic can initiate a trip, and the XCBR position can change after the physical breaker operates. These are related but separate pieces of information.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• A protection trip is not the same as breaker position feedback.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Select the appropriate logical node and data object for each SCADA point.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-8"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.8</span> Common Data Classes, Quality and Timestamp</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">Common Data Classes (CDCs) specify the attributes and semantics of different data types. Examples include SPS for single-point status, DPS for double-point status, MV for measured values and SPC/DPC for controllable points. The selected CDC determines the structure that a client expects.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">Quality information helps indicate whether a value is valid, questionable or invalid and can carry additional detail. Timestamps help correlate events, but accuracy depends on the source clock and synchronization quality.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Never display a value as trustworthy without considering its quality.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Time synchronization is essential for meaningful sequence-of-events analysis.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-9"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.9</span> DataSets and Report Control Blocks</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">A DataSet is an engineered collection of data references. It can include status and measurement attributes from different logical nodes. A Report Control Block (RCB) defines how a server reports DataSet changes to an MMS client, including triggers, optional fields and other behavior.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">For a feeder bay, a DataSet might contain XCBR position, protection operation, phase currents and alarm statuses. A configured report can deliver updates to SCADA when the selected trigger conditions occur.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• A DataSet does not send anything by itself; a service such as reporting uses it.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Confirm report enablement, client assignment, DataSet references and trigger options.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-10"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.10</span> Buffered and Unbuffered Reporting</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">An Unbuffered Report Control Block (URCB) provides event reports while an appropriate client association and reporting configuration are active; it does not provide the same event buffering and recovery behavior as a BRCB.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">A Buffered Report Control Block (BRCB) can retain report entries during communication interruptions within device limits and supports sequence recovery mechanisms. Buffer capacity, entry identifiers, client ownership and configuration must be verified for the actual IED.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• BRCB is generally preferred where loss of events during temporary disconnections is a concern.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Buffered reporting is not a substitute for testing event recovery and overflow behavior.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-11"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.11</span> MMS, GOOSE and Sampled Values</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">MMS client/server communication, as mapped in IEC 61850-8-1, is widely used for monitoring, control and reports between station systems and IEDs. GOOSE provides Ethernet multicast event exchange, commonly for fast inter-IED signaling. Sampled Values carry digitized measurement samples in process-bus applications.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">These services solve different problems. A protection IED may publish GOOSE to peers, send reports to SCADA through MMS and receive sampled measurements from a merging unit when the system design supports it.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• MMS and GOOSE are not interchangeable.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• GOOSE and SV require careful VLAN, network and performance engineering.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-12"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.12</span> Naming and Object References</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">IEC 61850 references combine configured names of logical devices, logical nodes, data objects and attributes. A reference such as LD0/XCBR1.Pos.stVal is illustrative; the complete address and separator conventions depend on the service representation and configured IED names.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">Engineers should copy verified references from the actual SCL model or online browser rather than assuming that the logical-device name or logical-node instance is universal.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Use the exact configured object reference in mapping and testing.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Check naming consistency across SCL, gateway and HMI databases.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-13"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.13</span> Practical Example — 33 kV Breaker Status</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">Assume a 33 kV outgoing feeder breaker has 52a and 52b auxiliary contacts. Its digital inputs feed an IED, which evaluates the contact states and updates the breaker position in its IEC 61850 model. The status can be included in a DataSet and reported to the SCADA MMS client.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">During FAT, test breaker OPEN, CLOSED, intermediate and inconsistent-contact states where supported. Verify the SCADA symbol, quality, timestamp, event log and alarm rules rather than relying only on a green network-status indication.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• 52a/52b interpretation must match the approved wiring and IED logic.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• SCADA indication and control permission are different engineering checks.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-14"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.14</span> Practical Example — Overcurrent Trip</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">When current exceeds configured protection criteria, a PTOC function can operate. Protection logic, often represented through PTRC or related nodes, can initiate a breaker trip. The breaker auxiliary contacts then provide independent confirmation of the final position.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">The IED can report protection operation, trip initiation and breaker position as separate signals. This separation helps engineers distinguish an actual fault trip from a control command or a feedback failure.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Critical trip paths must follow the approved protection design.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Test operation indications, trip circuit and position feedback separately.</p>
</div></section>
<section className={CARD} id="iec-ch03-3-15"><h3 className="mb-3 border-b border-[#204c68] pb-3 text-lg font-bold text-white"><span className="mr-2 text-[#23d8f5]">3.15</span> Data Model Inspection and Troubleshooting</h3>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">Start by importing the correct ICD/CID/SCD into an IEC 61850 browser or engineering tool. Establish the MMS association, browse the logical-device tree, inspect logical nodes and data attributes, and compare actual values, quality and timestamps with the field condition.</p>
<p className="mb-3 text-[13px] leading-7 text-[#c2d9ed]">If SCADA does not update, check the network connection, association, report control block state, DataSet membership, client reservation, trigger options, integrity period, quality and gateway mapping. Capture packets when necessary and compare with the approved signal list.</p>
<div className="mt-3 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#44dff4]">Engineering key points</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• A successful ping does not prove a correct MMS report configuration.</p>
<p className="mb-1 text-xs leading-6 text-[#bcd9e9]">• Use a structured signal-by-signal FAT/SAT checklist.</p>
</div></section>
</div>;}