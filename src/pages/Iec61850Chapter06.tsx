import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { LOGICAL_NODE_LESSONS, type Chapter06Diagram } from '../data/iec61850Chapter06';
import architectureImage from '../assets/iec61850/chapter06/architecture.png';
import xcbrImage from '../assets/iec61850/chapter06/xcbr.png';
import protectionImage from '../assets/iec61850/chapter06/protection.png';
import mmxuImage from '../assets/iec61850/chapter06/mmxu.png';
import cdcImage from '../assets/iec61850/chapter06/cdc.png';
import feederImage from '../assets/iec61850/chapter06/feeder.png';

const CARD = 'min-w-0 rounded-xl border border-[#224968] bg-[#091c32]/95 p-4 md:p-5';
const diagrams: Record<Chapter06Diagram, { src: string; alt: string; caption: string }> = {
  architecture: {
    src: architectureImage,
    alt: 'A physical protection IED hosts an IEC 61850 server containing a logical device and XCBR1, MMXU1 and PTOC1 logical nodes. XCBR1 contains Pos with stVal, q and t attributes.',
    caption: 'Logical-node architecture: containment relationships from the physical IED to data attributes. Example names are illustrative.'
  },
  xcbr: {
    src: xcbrImage,
    alt: '33 kV breaker auxiliary contacts 52a and 52b feed IED digital inputs. XCBR1.Pos exposes stVal, q and t, and an MMS report carries position information to SCADA/HMI.',
    caption: 'Breaker indication path: auxiliary contacts → IED input logic → XCBR.Pos → configured reporting → HMI. Feedback is separate from commands; contact symbols illustrate the open state.'
  },
  protection: {
    src: protectionImage,
    alt: 'CT current enters a protection IED. The illustrative application path passes through PTOC, PTRC and a trip output to the circuit breaker.',
    caption: 'Protection path: PTOC operation feeds the configured PTRC/output chain. These internal functional relationships do not imply separate network messages or a mandatory PTRC time delay.'
  },
  mmxu: {
    src: mmxuImage,
    alt: 'CT and VT measurements enter the 33-F01 feeder IED. MMXU1 exposes current, voltage, power and frequency information to SCADA through configured MMS reports.',
    caption: 'Measurement path: verify CT/VT scaling, phase identity, units, quality and time. MMXU measurement reporting is distinct from a process-bus sampled-value stream.'
  },
  cdc: {
    src: cdcImage,
    alt: 'Nine common data classes grouped as status: SPS, DPS, INS; measurements: MV, CMV, SAV; and controls: SPC, DPC, INC, with their full names.',
    caption: 'Common Data Classes organize information by meaning and structure. This is a selected comparison, not the complete CDC catalogue; actual attributes depend on the class and configured implementation.'
  },
  feeder: {
    src: feederImage,
    alt: 'Inside the 33-F01 IED, MMXU supplies measurements, PTOC feeds PTRC and a trip output, CILO supplies a permissive to CSWI and its control output, and XCBR receives breaker feedback. SCADA and the physical breaker are outside the IED.',
    caption: 'Illustrative 33-F01 application: CILO supervises the configured switching-control path; the protection-trip path is separate. XCBR represents returned position feedback. Arrows express functional relationships, not terminal wiring.'
  }
};

export default function Iec61850Chapter06() {
  return <div className="min-w-0 space-y-3" data-chapter="06">
    {LOGICAL_NODE_LESSONS.map((lesson, index) => {
      const diagram = lesson.diagram ? diagrams[lesson.diagram] : undefined;
      return <section id={`iec-ch06-${index + 1}`} aria-labelledby={`iec-ch06-heading-${index + 1}`} key={lesson.title} className={CARD}>
        <h3 id={`iec-ch06-heading-${index + 1}`} className="border-b border-[#204c68] pb-3 text-base font-bold text-white">
          <span className="mr-2 text-[#23d8f5]">6.{index + 1}</span>{lesson.title}
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
          Reference reading: <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/6016" target="_blank" rel="noreferrer">IEC 61850-7-3 — Common Data Classes</a>;{' '}
          <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/66551" target="_blank" rel="noreferrer">IEC 61850-7-4 — Logical Nodes and Data Objects</a>;{' '}
          <a className="text-[#50dcef] underline underline-offset-2" href="https://en.help.plc.abb.com/iec_61850_server_introduction.html" target="_blank" rel="noreferrer">ABB — model and control overview</a>.
          {' '}Use the edition and amendments specified by your project, the device MICS/PICS/PIXIT and the deployed SCL to confirm supported behavior. Manufacturer examples are implementation-specific.
        </p>}
      </section>;
    })}
  </div>;
}
