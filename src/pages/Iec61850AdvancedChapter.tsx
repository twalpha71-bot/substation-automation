import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import diagramIndex from '../data/iec61850Advanced/diagrams.json';

interface AdvancedLesson {
  title: string; paragraphs: string[]; workflow: string[]; example: string; check: string;
  code?: string; table?: { headers: string[]; rows: string[][] };
}
const chapters = import.meta.glob<AdvancedLesson[]>('../data/iec61850Advanced/chapter*.json', { eager: true, import: 'default' });
const assets = import.meta.glob<string>('../assets/iec61850/advanced/*.svg', { eager: true, query: '?url', import: 'default' });
const diagrams: Record<string, { file: string; alt: string; caption: string }> = diagramIndex;
const CARD = 'min-w-0 rounded-xl border border-[#224968] bg-[#091c32]/95 p-4 md:p-5';
const referenceLinks: Record<number, [string, string][]> = {
  8: [['IEC 61850-8-1 — service mapping', 'https://webstore.iec.ch/en/publication/66585'], ['RFC 1006 — ISO transport over TCP', 'https://www.rfc-editor.org/rfc/rfc1006']],
  9: [['IEC 61850-8-1 — GOOSE mapping', 'https://webstore.iec.ch/en/publication/66585'], ['Wireshark GOOSE fields', 'https://www.wireshark.org/docs/dfref/g/goose.html']],
  10: [['IEC 61850-9-2 — Sampled Values mapping', 'https://webstore.iec.ch/en/publication/6023'], ['Wireshark SV fields', 'https://www.wireshark.org/docs/dfref/s/sv.html']],
  11: [['IEC 61850-6 — SCL', 'https://webstore.iec.ch/en/publication/103863']],
  12: [['IEC 61850-6 — system engineering exchange', 'https://webstore.iec.ch/en/publication/103863'], ['IEC 61850-7-4 — logical nodes', 'https://webstore.iec.ch/en/publication/66551']],
  13: [['IEC 62439-3 — PRP and HSR', 'https://webstore.iec.ch/en/publication/64423']],
  14: [['IEC 61850 series — including IEC/IEEE 61850-9-3', 'https://webstore.iec.ch/en/publication/6028'], ['RFC 5905 — NTPv4', 'https://www.rfc-editor.org/rfc/rfc5905']],
  15: [['IEC 61850-7-2 — service semantics', 'https://webstore.iec.ch/en/publication/6015'], ['Modbus application protocol', 'https://www.modbus.org/specs.php']],
  16: [['IEC 61850-7-2 — control services', 'https://webstore.iec.ch/en/publication/6015'], ['MZ Automation — control client API', 'https://support.mz-automation.de/doc/libiec61850/c/latest/group__IEC61850__CLIENT__CONTROL.html']],
  17: [['IEC 61850-10 — conformance testing', 'https://webstore.iec.ch/en/publication/108858'], ['UCA testing and certificates', 'https://ucatesting.org/61850-testing/']],
  18: [['Wireshark MMS fields', 'https://www.wireshark.org/docs/dfref/m/mms.html'], ['Wireshark GOOSE fields', 'https://www.wireshark.org/docs/dfref/g/goose.html'], ['Wireshark SV fields', 'https://www.wireshark.org/docs/dfref/s/sv.html']],
  19: [['IEC 61850-6 — SCL exchange', 'https://webstore.iec.ch/en/publication/103863'], ['UCA conformance testing', 'https://ucatesting.org/61850-testing/'], ['Siemens engineering tools', 'https://www.siemens.com/en-gb/products/siprotec/iec-61850/'], ['Schneider Easergy Studio', 'https://www.se.com/in/en/faqs/FA284200/'], ['Relion / PCM600', 'https://www.hitachienergy.com/us/en/products-and-solutions/substation-automation-protection-and-control/products/tools/pcm600'], ['GE Multilin UR example manual', 'https://www.gevernova.com/grid-solutions/products/manuals/g60/g60man-ab1.pdf']],
  20: [['IEC 61850 series — project reference framework', 'https://webstore.iec.ch/en/publication/6028'], ['IEC 62439-3 — network redundancy', 'https://webstore.iec.ch/en/publication/64423']],
};
export function hasAdvancedChapter(number: number) { return Boolean(chapters[`../data/iec61850Advanced/chapter${String(number).padStart(2, '0')}.json`]); }
export function advancedReadMinutes(number: number) {
  const lessons = chapters[`../data/iec61850Advanced/chapter${String(number).padStart(2, '0')}.json`] || [];
  const words = lessons.flatMap(l => [...l.paragraphs, ...l.workflow, l.example, l.check, l.code || '', ...(l.table?.rows.flat() || [])]).join(' ').split(/\s+/).length;
  return Math.max(20, Math.ceil(words / 110));
}
export default function Iec61850AdvancedChapter({ number }: { number: number }) {
  const id = String(number).padStart(2, '0');
  const lessons = chapters[`../data/iec61850Advanced/chapter${id}.json`] || [];
  return <div className="min-w-0 space-y-3" data-chapter={id}>
    {lessons.map((lesson, index) => {
      const diagram = diagrams[`${number}.${index + 1}`];
      const src = diagram ? assets[`../assets/iec61850/advanced/${diagram.file}`] : undefined;
      return <section id={`iec-ch${id}-${index + 1}`} aria-labelledby={`iec-ch${id}-heading-${index + 1}`} key={lesson.title} className={CARD}>
        <h3 id={`iec-ch${id}-heading-${index + 1}`} className="border-b border-[#204c68] pb-3 text-base font-bold text-white"><span className="mr-2 text-[#23d8f5]">{number}.{index + 1}</span>{lesson.title}</h3>
        {diagram && src && <figure className="mt-4 overflow-hidden rounded-xl border border-[#1c7895] bg-[#031426]">
          <a href={src} target="_blank" rel="noreferrer" aria-label={`Open full-size diagram: ${lesson.title}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#45dff4]">
            <img src={src} alt={diagram.alt} width={1600} height={520} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" className="chapter-engineering-image mx-auto my-4 block h-auto max-h-[340px] w-full max-w-[1100px] object-contain" />
          </a>
          <figcaption className="border-t border-[#17445d] px-3 py-2 text-[11px] leading-5 text-[#a5c1d7]">{diagram.caption} <a href={src} target="_blank" rel="noreferrer" className="text-[#50dcef] underline underline-offset-2">View full size</a></figcaption>
        </figure>}
        <div className="mt-3 space-y-3">{lesson.paragraphs.map(p => <p key={p} className="text-[13px] leading-7 text-[#c2d9ed]">{p}</p>)}</div>
        <div className="mt-4 text-[13px] leading-7 text-[#c2d9ed]"><p className="text-xs font-bold text-[#8cefff]">Engineering workflow</p><ol className="mt-2 list-decimal space-y-1 pl-5">{lesson.workflow.map(step => <li key={step}>{step}</li>)}</ol></div>
        {lesson.table && <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-[#28506d]" role="region" aria-label={`${lesson.title} reference table`} tabIndex={0}><table className="w-full min-w-[560px] border-collapse text-left text-xs leading-6"><thead className="bg-[#0b3048] text-[#8cefff]"><tr>{lesson.table.headers.map(h => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{lesson.table.rows.map((row, ri) => <tr key={ri} className="border-t border-[#20465e] text-[#c2d9ed]">{row.map((cell, ci) => ci === 0 ? <th key={ci} scope="row" className="px-3 py-2 align-top font-medium text-[#e0f2ff]">{cell}</th> : <td key={ci} className="px-3 py-2 align-top">{cell}</td>)}</tr>)}</tbody></table></div>}
        {lesson.code && <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-[#28506d] bg-[#041421] p-3 text-[11px] leading-6 text-[#9fe8f6]"><code>{lesson.code}</code></pre>}
        <div className="mt-4 rounded-lg border border-[#18536a] bg-[#08283b] p-3"><p className="flex items-center gap-2 text-xs font-bold text-[#44dff4]"><BookOpen size={15} aria-hidden="true" /> Practical engineering application</p><p className="mt-2 text-[13px] leading-6 text-[#c2d9ed]">{lesson.example}</p></div>
        <div className="mt-3 flex gap-2 rounded-lg border border-[#275e53] bg-[#0b2c30] p-3 text-xs leading-6 text-[#b8e9dc]"><CheckCircle2 size={16} aria-hidden="true" className="mt-1 shrink-0 text-[#35d7a4]" /><span><strong className="text-white">Engineering check:</strong> {lesson.check}</span></div>
        {index === 19 && <p className="mt-4 text-xs leading-6 text-[#a5c1d7]">Reference framework: {(referenceLinks[number] || []).map(([label, href], i) => <React.Fragment key={href}>{i > 0 && '; '}<a href={href} target="_blank" rel="noreferrer" className="text-[#50dcef] underline underline-offset-2">{label}</a></React.Fragment>)}. Apply the project-selected editions and the exact device/firmware manuals. Numeric examples, diagrams and XML fragments are illustrative; they are not deployable settings or universal device capabilities.</p>}
      </section>;
    })}
  </div>;
}
