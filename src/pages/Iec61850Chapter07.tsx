import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { REPORTING_LESSONS, type Chapter07Diagram } from '../data/iec61850Chapter07';
import architectureImage from '../assets/iec61850/chapter07/architecture.png';
import configurationImage from '../assets/iec61850/chapter07/configuration.png';
import bufferingImage from '../assets/iec61850/chapter07/buffering.png';
import mmsImage from '../assets/iec61850/chapter07/mms.png';
import triggersImage from '../assets/iec61850/chapter07/triggers.png';
import testingImage from '../assets/iec61850/chapter07/testing.png';

const CARD = 'min-w-0 rounded-xl border border-[#224968] bg-[#091c32]/95 p-4 md:p-5';
const diagrams: Record<Chapter07Diagram, { src: string; alt: string; caption: string }> = {
  architecture: {
    src: architectureImage,
    alt: 'Protection IED server: logical nodes supply data objects and attributes referenced by an ordered DataSet, which a Report Control Block uses to deliver MMS reports to SCADA/HMI.',
    caption: 'DataSet-to-report architecture. The short references are illustrative. Separate scalar stVal, q and t members are not automatically all included in every event report; verify inclusion or use a suitable object-level selection.'
  },
  configuration: {
    src: configurationImage,
    alt: 'Illustrative engineering interface selecting XCBR1.Pos with functional constraint ST, including stVal, q and t, and configuring XCBR1.Pos and PTOC1.Op as ordered DataSet members.',
    caption: 'Illustrative interface, not a vendor-tool screenshot. ST is a functional constraint; stVal, q and t are attributes. The shown FCDA elements represent object-level selections.'
  },
  buffering: {
    src: bufferingImage,
    alt: 'BRCB uses a finite buffer and can deliver eligible retained reports after reconnection and resynchronization. URCB has no replay queue for the disconnected period; a read or GI restores current state only.',
    caption: 'Buffered recovery is conditional on retained entries, capacity, configuration and client recovery. Neither a finite BRCB buffer nor a GI snapshot guarantees a complete event history.'
  },
  mms: {
    src: mmsImage,
    alt: '33-F01 breaker feedback updates the protection IED. The DataSet and BRCB inside the IED produce MMS reports that cross the Ethernet station bus to a SCADA client.',
    caption: 'Reporting indication path: feedback → model/DataSet → configured BRCB → MMS association → SCADA. Packet-shaped arrows show report traffic; the software blocks are not separate network devices.'
  },
  triggers: {
    src: triggersImage,
    alt: 'Event triggers dchg, qchg and supported dupd produce reports; integrity uses a server timer and GI uses a client request to report the current DataSet.',
    caption: 'Event triggers and current-state snapshots serve different purposes. dupd requires supported data-update notifications; integrity is server-timed and GI is client-requested.'
  },
  testing: {
    src: testingImage,
    alt: 'Isolated FAT/SAT setup: test workstation simulates IED inputs, reports pass through an Ethernet switch to SCADA, and a mirrored port supports MMS capture. Checks cover value, quality, source time, reconnect and overflow.',
    caption: 'Illustrative isolated test arrangement. Use the appropriate simulator or approved input-test interface; a laptop is not wired directly to a live binary input. Capture access and active tests follow the project procedure.'
  }
};

export default function Iec61850Chapter07() {
  return <div className="min-w-0 space-y-3" data-chapter="07">
    {REPORTING_LESSONS.map((lesson, index) => {
      const diagram = lesson.diagram ? diagrams[lesson.diagram] : undefined;
      return <section id={`iec-ch07-${index + 1}`} aria-labelledby={`iec-ch07-heading-${index + 1}`} key={lesson.title} className={CARD}>
        <h3 id={`iec-ch07-heading-${index + 1}`} className="border-b border-[#204c68] pb-3 text-base font-bold text-white">
          <span className="mr-2 text-[#23d8f5]">7.{index + 1}</span>{lesson.title}
        </h3>
        {diagram && <figure className="mt-4 overflow-hidden rounded-xl border border-[#1c7895] bg-[#031426]">
          <a href={diagram.src} target="_blank" rel="noreferrer" aria-label={`Open full-size diagram: ${lesson.title}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#45dff4]">
            <img src={diagram.src} alt={diagram.alt} width={2172} height={724} loading={index === 0 ? 'eager' : 'lazy'} decoding="async"
              className="chapter-engineering-image mx-auto my-4 block h-auto max-h-[320px] w-full max-w-[1100px] object-contain" />
          </a>
          <figcaption className="border-t border-[#17445d] px-3 py-2 text-[11px] leading-5 text-[#a5c1d7]">
            {diagram.caption} <a href={diagram.src} target="_blank" rel="noreferrer" className="text-[#50dcef] underline underline-offset-2">View full size</a>
          </figcaption>
        </figure>}
        <div className="mt-3 space-y-3">{lesson.paragraphs.map(paragraph => <p key={paragraph} className="text-[13px] leading-7 text-[#c2d9ed]">{paragraph}</p>)}</div>
        {lesson.table && <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-[#28506d]" role="region" aria-label={`${lesson.title} reference table`} tabIndex={0}>
          <table className="w-full min-w-[560px] border-collapse text-left text-xs leading-6">
            <thead className="bg-[#0b3048] text-[#8cefff]"><tr>{lesson.table.headers.map(header => <th key={header} scope="col" className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead>
            <tbody>{lesson.table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[#20465e] text-[#c2d9ed]">
              {row.map((cell, cellIndex) => cellIndex === 0
                ? <th key={cellIndex} scope="row" className="px-3 py-2 align-top font-medium text-[#e0f2ff]">{cell}</th>
                : <td key={cellIndex} className="px-3 py-2 align-top">{cell}</td>)}
            </tr>)}</tbody>
          </table>
        </div>}
        {lesson.code && <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-[#28506d] bg-[#041421] p-3 text-[11px] leading-6 text-[#9fe8f6]"><code>{lesson.code}</code></pre>}
        <div className="mt-4 rounded-lg border border-[#18536a] bg-[#08283b] p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-[#44dff4]"><BookOpen size={15} aria-hidden="true"/> Practical engineering application</p>
          <p className="mt-2 text-[13px] leading-6 text-[#c2d9ed]">{lesson.example}</p>
        </div>
        <div className="mt-3 flex gap-2 rounded-lg border border-[#275e53] bg-[#0b2c30] p-3 text-xs leading-6 text-[#b8e9dc]">
          <CheckCircle2 size={16} aria-hidden="true" className="mt-1 shrink-0 text-[#35d7a4]"/>
          <span><strong className="text-white">Engineering check:</strong> {lesson.check}</span>
        </div>
        {index === 19 && <p className="mt-4 text-xs leading-6 text-[#a5c1d7]">
          Reference framework: <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/6015" target="_blank" rel="noreferrer">IEC 61850-7-2 — ACSI and reporting</a>;{' '}
          <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/103863" target="_blank" rel="noreferrer">IEC 61850-6 — SCL</a>;{' '}
          <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/66585" target="_blank" rel="noreferrer">IEC 61850-8-1 — MMS mapping</a>;{' '}
          <a className="text-[#50dcef] underline underline-offset-2" href="https://support.mz-automation.de/doc/libiec61850/c/latest/group__IEC61850__CLIENT__REPORTS.html" target="_blank" rel="noreferrer">MZ Automation — client reporting API examples</a>.
          {' '}Apply the project-specified edition and amendments, the IED capability documents and client manual. Example names, SCL fragments and timing values are illustrative, not universal device settings.
        </p>}
      </section>;
    })}
  </div>;
}
