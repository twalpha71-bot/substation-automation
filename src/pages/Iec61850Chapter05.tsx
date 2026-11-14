import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { DATA_MODEL_LESSONS } from '../data/iec61850Chapter05';
import dataModelDiagram from '../assets/iec61850/chapter05-data-model.svg';

const CARD = 'min-w-0 rounded-xl border border-[#224968] bg-[#091c32]/95 p-4 md:p-5';

export default function Iec61850Chapter05() {
  return <div className="min-w-0 space-y-3" data-chapter="05">
    {DATA_MODEL_LESSONS.map((lesson, index) => <section
      id={`iec-ch05-${index + 1}`}
      aria-labelledby={`iec-ch05-heading-${index + 1}`}
      key={lesson.title}
      className={CARD}
    >
      <h3 id={`iec-ch05-heading-${index + 1}`} className="border-b border-[#204c68] pb-3 text-base font-bold text-white">
        <span className="mr-2 text-[#23d8f5]">5.{index + 1}</span>{lesson.title}
      </h3>
      {index === 0 && <figure className="mt-4 overflow-hidden rounded-xl border border-[#1c7895] bg-[#031426]">
        <img src={dataModelDiagram}
          alt="IEC 61850 data hierarchy: the FDR01 IED hosts a server containing logical device FDR01LD0, logical node XCBR1, position object Pos and attributes stVal, q and t. Configured datasets and MMS reports carry selected information to SCADA/HMI."
          width={1120} height={420}
          className="mx-auto block h-auto max-h-[320px] w-auto max-w-full object-contain" />
        <figcaption className="border-t border-[#17445d] px-3 py-2 text-[11px] leading-5 text-[#a5c1d7]">
          IED → Logical Device → Logical Node → Data Object → Data Attribute. Illustrative names; verify the deployed IED model. Selected data reaches SCADA through configured communication services.
        </figcaption>
      </figure>}
      <div className="mt-3 space-y-3">
        {lesson.paragraphs.map(paragraph => <p key={paragraph} className="text-[13px] leading-7 text-[#c2d9ed]">{paragraph}</p>)}
      </div>
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
        Further reading: <a className="text-[#50dcef] underline underline-offset-2" href="https://webstore.iec.ch/en/publication/66551" target="_blank" rel="noreferrer">IEC 61850-7-4 — logical nodes and data objects</a>;{' '}
        <a className="text-[#50dcef] underline underline-offset-2" href="https://help.plc.abb.com/iec_61850_server_introduction.html" target="_blank" rel="noreferrer">ABB — data modeling and DPC attributes</a>;{' '}
        <a className="text-[#50dcef] underline underline-offset-2" href="https://www.pcvue.com/ProductHelp/PcVue/en/Content/AE/Comm_DataAcq/61850_overview.php" target="_blank" rel="noreferrer">PcVue — IEC 61850 model overview</a>.
        {' '}Use the applicable standard edition and your IED’s own model and configuration documentation for project engineering.
      </p>}
    </section>)}
  </div>;
}
