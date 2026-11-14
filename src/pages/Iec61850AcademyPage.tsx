import Iec61850AdvancedChapter, { hasAdvancedChapter, advancedReadMinutes } from './Iec61850AdvancedChapter';
import Iec61850Chapter03 from './Iec61850Chapter03';
import Iec61850Chapter04 from './Iec61850Chapter04';
import Iec61850Chapter05 from './Iec61850Chapter05';
import Iec61850Chapter06 from './Iec61850Chapter06';
import Iec61850Chapter07 from './Iec61850Chapter07';
import sasArchitectureInfographic from '../assets/sas-architecture/three-level-sas-futuristic.png';
import SasArchitectureChapter02 from './SasArchitectureChapter02';
import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, ChevronLeft, Layers, Activity, ShieldCheck, Cpu, Zap, GraduationCap, ArrowRight, CircleCheck, Clock3 } from 'lucide-react';
import { IEC61850_ACADEMY_CHAPTERS } from '../data/iec61850AcademyData';

const COURSE_TITLES = [
  'What is Substation Automation?', 'SAS Architecture & Equipment', 'Introduction to IEC 61850',
  'IEC 61850 Standards & Parts', 'IEC 61850 Data Model', 'Logical Nodes & Common Data Classes',
  'DataSets & Report Control Blocks', 'MMS Communication', 'GOOSE Communication',
  'Sampled Values & Process Bus', 'SCL Files — ICD, CID, SCD, IID, SSD',
  'IED Configuration & Integration', 'Station Bus, PRP, HSR & VLAN',
  'Time Synchronization — SNTP & PTP', 'Gateway, SCADA/HMI & Signal Mapping',
  'Breaker Control, SBO & Interlocking', 'IEC 61850 Testing — FAT & SAT',
  'Wireshark & Troubleshooting', 'Multi-Vendor IED Integration',
  '132/33/11 kV Practical Project',
];

const CARD = 'rounded-xl border border-[#224968] bg-[#091c32]/95 shadow-[0_5px_20px_rgba(0,0,0,.24)]';
const HEAD = 'text-[#eef8ff] font-bold tracking-wide';

export const Iec61850AcademyPage: React.FC = () => {
  const [chapter, setChapter] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const sourceChapter = IEC61850_ACADEMY_CHAPTERS[chapter];
  const progress = Math.round(completed.length / COURSE_TITLES.length * 100);
  const changeChapter = (index: number) => { setChapter(Math.max(0, Math.min(19, index))); window.scrollTo({top:0, behavior:'smooth'}); };
  useEffect(() => {
    const deepLink = window.__SAS_DEEP_LINK__;
    if (deepLink?.tab === 'IEC61850_ACADEMY') {
      const n = IEC61850_ACADEMY_CHAPTERS.findIndex(c => c.id === deepLink.chapterId);
      if (n >= 0) setChapter(n);
      window.__SAS_DEEP_LINK__ = null;
    }
    const reset = () => setChapter(0);
    window.addEventListener('sas:reset-academy-overview', reset);
    return () => window.removeEventListener('sas:reset-academy-overview', reset);
  }, []);
  return <div className="w-full text-[#d6eaff] space-y-3 pb-10">
    <header className="relative isolate overflow-hidden rounded-2xl border border-[#1b5676] bg-gradient-to-r from-[#051527] via-[#082845] to-[#06182c] px-5 py-5 md:px-8 md:py-7">
      <div className="absolute inset-y-0 right-0 w-[48%] opacity-30 bg-[radial-gradient(circle_at_75%_50%,#00cfff55,transparent_55%)]" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] text-[#00d7ff]"><GraduationCap size={17}/> COMPLETE ENGINEERING COURSE</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-white">IEC 61850 <span className="text-[#16d5f5]">Digital Substation</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-[#b5d2e9]">From Substation Automation fundamentals to advanced IEC 61850 engineering, practical configuration, testing and troubleshooting.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            {['20 Detailed Chapters','132 / 33 / 11 kV Examples','Engineering Diagrams'].map(t => <span key={t} className="rounded-md border border-[#285675] bg-[#092a46] px-2.5 py-1 text-[#bceaff]">{t}</span>)}
            <div className="relative min-w-[220px] max-w-[340px] flex-1 sm:ml-2">
              <label htmlFor="iec61850-chapter-select" className="sr-only">Select IEC 61850 chapter</label>
              <BookOpen size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#00d9f3]" />
              <select id="iec61850-chapter-select" aria-label="Select IEC 61850 course chapter" value={chapter} onChange={e=>changeChapter(Number(e.target.value))} className="w-full cursor-pointer rounded-lg border border-[#00cbea] bg-[#06263f] py-2 pl-9 pr-3 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-[#00cbea]">
                {COURSE_TITLES.map((title,index)=><option key={index} value={index} className="bg-[#071c30] text-white">{String(index+1).padStart(2,'0')} — {title}{completed.includes(index)?' ✓':''}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="w-full max-w-[245px] shrink-0 space-y-2">
          <div className="rounded-xl border border-[#236184] bg-[#081d32]/90 p-3"><div className="flex items-center justify-between text-xs"><span>Course progress</span><strong className="text-[#32e2ec]">{progress}%</strong></div><div className="mt-2 h-2 rounded-full bg-[#183c58]"><div className="h-full rounded-full bg-[#00d3ef] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-2 text-[11px] text-[#a3c2d8]">{completed.length} of 20 chapters completed</div></div>
        </div>
      </div>
    </header>
    <div className="min-w-0">
      <main className="min-w-0 space-y-3">
        <section className={`${CARD} px-4 py-3 md:px-5`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] uppercase tracking-[.15em] text-[#32d4f1]">Chapter {String(chapter+1).padStart(2,'0')} · Foundation to Advanced</p><h2 className="mt-1 text-xl md:text-2xl font-extrabold text-white">{COURSE_TITLES[chapter]}</h2><p className="mt-1 text-xs text-[#a6c6dd]">Detailed theory, engineering principles and practical substation examples</p></div><span className="rounded-lg border border-[#275475] bg-[#0c2944] px-3 py-2 text-xs text-[#c4e7ff]"><Clock3 size={13} className="mr-1 inline"/> {chapter === 4 ? 45 : chapter === 5 ? 55 : chapter === 6 ? 60 : hasAdvancedChapter(chapter + 1) ? advancedReadMinutes(chapter + 1) : (sourceChapter?.estimatedMinutes || 25)} min read</span></div></section>
        {chapter===0 ? <>
          <section className={`${CARD} p-4 md:p-5`}><h3 className={`${HEAD} flex items-center gap-2 text-base`}><BookOpen size={17} className="text-[#00d9f3]"/> What is Substation Automation?</h3><p className="mt-3 text-[13px] leading-7 text-[#c2d9ed]">A Substation Automation System (SAS) is an integrated system of intelligent electronic devices (IEDs), communication networks, station controllers, gateways, and SCADA/HMI applications used to monitor, protect, control, and supervise electrical substation equipment. It converts field measurements and equipment states into reliable information, coordinates permitted control actions, and records alarms and events for operators and engineers.</p><p className="mt-2 text-[13px] leading-7 text-[#c2d9ed]">In a conventional substation, many signals travel through individual copper wires between the switchyard, relay panels and control room. A modern automated substation retains essential hardwired protection and safety circuits while using digital communication for monitoring, reports, interlocking information and selected protection applications. Automation does not eliminate the need for independent protection functions, secure controls, or commissioning tests.</p></section>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><section className={`${CARD} p-4`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><Activity size={17} className="text-[#00d9f3]"/> Key Functions of SAS</h3><div className="mt-3 space-y-2.5">{[['Monitoring','Read breaker positions, currents, voltages, power, frequency and equipment health.'],['Protection','Detect faults using protection IEDs and trip affected equipment through approved protection schemes.'],['Control','Execute authorized breaker and disconnector operations with local/remote and interlocking checks.'],['Communication','Exchange standardized data between IEDs, gateways, operator stations and control centers.'],['Events & Alarms','Time-stamp changes, record sequence of events and alert operators to abnormal conditions.']].map(([t,d])=><div key={t} className="flex gap-2.5"><CircleCheck size={15} className="mt-1 shrink-0 text-[#30dfaa]"/><p className="text-xs leading-5 text-[#bdd5e8]"><strong className="text-white">{t}:</strong> {d}</p></div>)}</div></section>
          <section className={`${CARD} p-3 sm:p-4 min-w-0`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><Layers size={17} className="text-[#00d9f3]"/> SAS Architecture — Three Levels</h3>
            <figure className="mt-3 overflow-hidden rounded-xl border border-[#1c7895] bg-[#031426]">
              <img src={sasArchitectureInfographic} alt="Three-Level SAS Architecture infographic showing Station Level, Station Bus, Bay Level, Process Bus and Process Level with engineering devices and IEC 61850 communication" loading="lazy" className="mx-auto block h-auto max-h-[320px] w-auto max-w-full object-contain" />
              <figcaption className="px-3 py-2 text-[11px] leading-5 text-[#a5c1d7]">Illustrative SAS architecture: Station Level, Bay Level and Process Level. Station Bus supports MMS/GOOSE; Process Bus can support SV/GOOSE where implemented. Actual connections depend on project design.</figcaption>
            </figure>
          </section></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><section className={`${CARD} p-4`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><GraduationCap size={17} className="text-[#00d9f3]"/> Learning Objectives</h3><div className="mt-3 space-y-2">{['Identify the main equipment and functions of an electrical substation.','Explain station, bay and process levels with practical examples.','Understand the role of protection IEDs, station gateway and SCADA/HMI.','Distinguish hardwired protection circuits from networked automation.','Describe the complete event path from fault detection to operator alarm.'].map(x=><div key={x} className="flex gap-2 text-xs leading-5 text-[#bed7eb]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#30dfaa]"/>{x}</div>)}</div></section>
          <section className={`${CARD} p-4`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><Zap size={17} className="text-[#f6c25d]"/> Real Example — 132/33 kV Substation</h3><p className="mt-2 text-xs leading-6 text-[#bdd6e8]">Assume a 132 kV incoming line supplies a 132/33 kV transformer, which feeds multiple 33 kV outgoing feeders. A short circuit develops on one 33 kV feeder.</p><div className="mt-2 space-y-1.5">{['CT measures the fault current and supplies the protection IED.','The feeder protection IED evaluates its protection elements.','When trip criteria are met, the IED operates the breaker trip circuit.','Breaker auxiliary contacts confirm the changed position.','IED reports and configured GOOSE messages share relevant events.','SCADA/HMI displays breaker status, alarms and time-stamped events.'].map((x,i)=><div key={x} className="flex gap-2 text-[11px] leading-5 text-[#b9d4e7]"><span className="font-bold text-[#26d4ee]">{i+1}.</span>{x}</div>)}</div><p className="mt-2 rounded-lg border border-[#65552c] bg-[#3b3019]/35 p-2 text-[11px] text-[#f2d9a0]">Safety note: critical protection tripping must not depend on an operator HMI or SCADA command.</p></section></div>
        </> : chapter===1 ? <SasArchitectureChapter02/> : chapter===2 ? <Iec61850Chapter03/> : chapter===3 ? <Iec61850Chapter04/> : chapter===4 ? <Iec61850Chapter05/> : chapter===5 ? <Iec61850Chapter06/> : chapter===6 ? <Iec61850Chapter07/> : hasAdvancedChapter(chapter + 1) ? <Iec61850AdvancedChapter number={chapter + 1}/> : <>
          <section className={`${CARD} p-4 md:p-5`}><h3 className={`${HEAD} flex items-center gap-2 text-base`}><BookOpen size={17} className="text-[#00d9f3]"/> Chapter Overview</h3><p className="mt-3 text-[13px] leading-7 text-[#c4dced]">{sourceChapter?.subtitleEn || COURSE_TITLES[chapter]}. This chapter explains the engineering principles, required components, communication behavior, and practical applications in a modern digital substation.</p></section>
          {(sourceChapter?.sections || []).map((section,idx)=><section key={`${chapter}-${idx}`} className={`${CARD} p-4 md:p-5`}><h3 className={`${HEAD} flex items-center gap-2 text-sm md:text-base`}><span className="rounded bg-[#0a4c66] px-2 py-1 text-[11px] text-[#43e4fa]">{chapter+1}.{idx+1}</span>{section.headingEn}</h3><div className="mt-3 space-y-3">{section.bodyEn.map((para,i)=><p key={i} className="text-[13px] leading-7 text-[#c2d9ed]">{para}</p>)}</div>{section.keyTakeawaysEn?.length>0&&<div className="mt-4 rounded-lg border border-[#1c5265] bg-[#08283b] p-3"><p className="mb-2 text-xs font-bold text-[#46dcef]">Key Takeaways</p>{section.keyTakeawaysEn.map((t,i)=><p key={i} className="mb-1 flex gap-2 text-xs leading-5 text-[#bcd9e9]"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#35d7a4]"/>{t}</p>)}</div>}{section.codeOrXmlSnippet&&<details className="mt-3 rounded-lg border border-[#28506d] bg-[#061524] p-3"><summary className="cursor-pointer text-xs font-bold text-[#45d7ed]">{section.codeOrXmlSnippet.title}</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-[#b5d6ed]">{section.codeOrXmlSnippet.content}</pre></details>}</section>)}
          {sourceChapter?.workedExample&&<section className={`${CARD} p-4 md:p-5`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><Cpu size={17} className="text-[#00d9f3]"/> Practical Example — {sourceChapter.workedExample.titleEn}</h3><div className="mt-3 space-y-2">{sourceChapter.workedExample.stepsEn.map((t,i)=><div key={i} className="flex gap-3 text-xs leading-6 text-[#c3daed]"><span className="font-bold text-[#22d2ed]">{String(i+1).padStart(2,'0')}</span><span>{t}</span></div>)}</div></section>}
          {sourceChapter?.troubleshooting&&<section className={`${CARD} p-4 md:p-5`}><h3 className={`${HEAD} flex items-center gap-2 text-sm`}><ShieldCheck size={17} className="text-[#00d9f3]"/> Engineering Troubleshooting</h3><div className="mt-3 space-y-2 text-xs leading-6 text-[#c2daec]"><p><strong className="text-white">Symptom:</strong> {sourceChapter.troubleshooting[0]?.symptomEn}</p><p><strong className="text-white">Possible cause:</strong> {sourceChapter.troubleshooting[0]?.causeEn}</p><p><strong className="text-white">Diagnostic check:</strong> {sourceChapter.troubleshooting[0]?.diagnosticCheckEn}</p><p><strong className="text-white">Corrective action:</strong> {sourceChapter.troubleshooting[0]?.correctiveActionEn}</p></div></section>}
        </>}
        <section className={`${CARD} p-3 flex flex-wrap items-center justify-between gap-3`}><button disabled={chapter===0} onClick={()=>changeChapter(chapter-1)} className="flex items-center gap-1.5 rounded-lg border border-[#315675] px-3 py-2 text-xs text-white disabled:opacity-30"><ChevronLeft size={15}/> Previous</button><button onClick={()=>setCompleted(prev=>prev.includes(chapter)?prev.filter(x=>x!==chapter):[...prev,chapter])} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${completed.includes(chapter)?'border-[#2a896e] bg-[#0b483d] text-[#8af5ca]':'border-[#236a84] bg-[#0b3952] text-[#7ee9f8]'}`}><CheckCircle2 size={15}/>{completed.includes(chapter)?'Completed':'Mark as completed'}</button><button disabled={chapter===19} onClick={()=>changeChapter(chapter+1)} className="flex items-center gap-1.5 rounded-lg bg-[#00bde0] px-3 py-2 text-xs font-bold text-[#052034] disabled:opacity-30">Next Chapter <ArrowRight size={15}/></button></section>
      </main>
    </div>
  </div>;
};
export default Iec61850AcademyPage;
