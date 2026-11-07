import React, { useState } from 'react';
import { LEARNING_MODULES } from '../data/substationData';
import { IEC61850_ACADEMY_CHAPTERS } from '../data/iec61850AcademyData';
import { CCNA_CHAPTERS } from '../data/ccnaAcademyData';
import { useSubstationStore, ActiveWorkspaceTab } from '../simulation/useSubstationStore';
import {
  Award,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  FileCode2,
  FileText,
  GitBranch,
  GraduationCap,
  HelpCircle,
  Layers,
  Network,
  Play,
  Sliders,
  Sparkles,
  Terminal,
  Trophy,
  Wrench,
  Zap,
} from 'lucide-react';

export const LearningAcademyPage: React.FC = () => {
  const { setActiveTab, bilingualTeluguEnabled } = useSubstationStore();
  const [showBilingualQuizzes, setShowBilingualQuizzes] = useState<boolean>(false);
  const [selectedQuizModId, setSelectedQuizModId] = useState<string>(LEARNING_MODULES[0].id);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const dispatchDeepNavigate = (payload: {
    tab: ActiveWorkspaceTab;
    moduleId?: string;
    chapterId?: string;
    subTab?: string;
    topicFilter?: string;
  }) => {
    window.dispatchEvent(new CustomEvent('sas:navigate', { detail: payload }));
  };

  const activeBilingualMod =
    LEARNING_MODULES.find((m) => m.id === selectedQuizModId) || LEARNING_MODULES[0];

  return (
    <div className="space-y-4 text-[#E4F1FF]">
      {/* ==========================================================================
          SECTION 1: IEC 61850 DIGITAL SUBSTATION (CYAN ACCENT — Matching Image 3 Top)
         ========================================================================== */}
      <section className="relative rounded-2xl border border-[#00CFFF]/55 border-l-4 border-l-[#00E5FF] bg-gradient-to-b from-[#081D34] via-[#07172B] to-[#051222] p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] space-y-3 overflow-hidden">
        {/* Top Header Row */}
        <div className="relative flex flex-wrap items-center justify-between gap-2.5 border-b border-[#183B5B] pb-2.5">
          {/* Center-Right Tower Backdrop */}
          <img
            src="assets/academy/banner-towers.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none hidden lg:block absolute right-52 top-0 h-full w-80 object-cover opacity-45 mix-blend-screen"
          />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#051629] border border-[#00CFFF]/60 flex items-center justify-center text-[#00E5FF] shadow-[0_0_10px_rgba(0,207,255,0.3)]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  IEC 61850 Digital Substation
                </h2>
                <span className="hidden md:inline text-[11.5px] text-[#9CC4E4] font-medium">
                  Concepts • Communication • Modelling • Configuration • FAT/SAT
                </span>
              </div>
              {bilingualTeluguEnabled && (
                <p className="text-[10.5px] text-[#7BEAFF]">
                  IEC 61850 డిజిటల్ సబ్‌స్టేషన్ — 6 మాడ్యూల్స్ &amp; 30 అధ్యాయాలు
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#234C70] bg-[#081C33] px-2.5 py-1.5 text-xs font-bold text-[#DCEAF5]">
              <BookOpen className="w-3.5 h-3.5 text-[#00E5FF]" />
              <select
                aria-label="Select IEC 61850 Chapter"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    dispatchDeepNavigate({
                      tab: 'IEC61850_ACADEMY',
                      chapterId: e.target.value,
                    });
                  }
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[115px]"
              >
                <option value="" disabled className="bg-[#061525]">
                  Chapter
                </option>
                {IEC61850_ACADEMY_CHAPTERS.map((ch) => (
                  <option key={ch.id} value={ch.id} className="bg-[#061525] text-white">
                    Ch {String(ch.number).padStart(2, '0')}: {ch.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8AB4D4]" />
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('SLD')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00A8FF] hover:brightness-110 px-3 py-1.5 text-xs font-black text-[#031222] shadow-[0_0_14px_rgba(0,217,255,0.4)] transition"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Open SLD</span>
            </button>
          </div>
        </div>

        {/* 3-Column Body: Left 4-Relay Visual | Center Learning Modules | Right Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left (4 cols): 4-Vendor Protection Relays Image */}
          <button
            type="button"
            onClick={() => dispatchDeepNavigate({ tab: 'IEC61850_ACADEMY' })}
            className="lg:col-span-4 rounded-xl border border-[#1D4366] hover:border-[#00CFFF] bg-[#051221] overflow-hidden p-1.5 flex items-center justify-center transition group"
          >
            <img
              src="assets/academy/relays-4vendor.jpg"
              width={1254}
              height={608}
              decoding="async"
              alt="Siemens SIPROTEC 5, Schneider MiCOM, ABB Relion, GE Multilin"
              className="sas-crisp-cover w-full h-[155px] sm:h-[168px] object-contain bg-[#030B17] rounded-lg"
            />
          </button>

          {/* Center (5 cols): Learning Modules */}
          <div className="lg:col-span-5 rounded-xl border border-[#1D4366] bg-[#061628]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-white">Learning Modules</span>
              <button
                type="button"
                onClick={() => dispatchDeepNavigate({ tab: 'IEC61850_ACADEMY' })}
                className="text-[10.5px] font-bold text-[#00E5FF] hover:underline"
              >
                View All 6 Modules →
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  id: 'MOD-01',
                  num: '01',
                  title: 'Electrical & Substation Fundamentals',
                  sub: 'Generation, Transmission, Distribution, Substation Equipment',
                },
                {
                  id: 'MOD-02',
                  num: '02',
                  title: 'IEC 61850 System & Data Model',
                  sub: 'Logical Nodes (LN), Data Objects (DO), Data Attributes (DA)',
                },
                {
                  id: 'MOD-03',
                  num: '03',
                  title: 'SCL Files & Engineering',
                  sub: 'ICD, SSD, SCD, CID Files & Configuration Process',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    dispatchDeepNavigate({
                      tab: 'IEC61850_ACADEMY',
                      moduleId: m.id,
                      subTab: 'LESSON',
                    })
                  }
                  className="group w-full rounded-lg border border-[#1A3D5E] hover:border-[#00CFFF] bg-[#081E35] hover:bg-[#0C2B4B] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded bg-[#051425] border border-[#00CFFF]/55 text-[#00E5FF] font-black text-[11px] flex items-center justify-center shrink-0">
                      {m.num}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">{m.title}</div>
                      <div className="text-[10px] text-[#8FB6D6] truncate">{m.sub}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7FA6C4] group-hover:text-[#00E5FF] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Right (3 cols): Quick Actions */}
          <div className="lg:col-span-3 rounded-xl border border-[#1D4366] bg-[#061628]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-[#FFB838] fill-[#FFB838]/40" />
              <span className="text-xs font-extrabold text-white">Quick Actions</span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  label: 'Diagrams Library',
                  icon: <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />,
                  onClick: () =>
                    dispatchDeepNavigate({
                      tab: 'IEC61850_ACADEMY',
                      moduleId: 'MOD-01',
                      subTab: 'DIAGRAMS',
                    }),
                },
                {
                  label: 'Simulation Lab',
                  icon: <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />,
                  onClick: () => setActiveTab('GOOSE'),
                },
                {
                  label: 'Signal Mapping',
                  icon: <GitBranch className="w-3.5 h-3.5 text-[#00E5FF]" />,
                  onClick: () => setActiveTab('SIGNALS'),
                },
                {
                  label: 'FAT / SAT Checklist',
                  icon: <CheckSquare className="w-3.5 h-3.5 text-[#4ADE80]" />,
                  onClick: () => setActiveTab('FATSAT'),
                },
              ].map((act) => (
                <button
                  key={act.label}
                  type="button"
                  onClick={act.onClick}
                  className="group w-full rounded-lg border border-[#1A3D5E] hover:border-[#00CFFF] bg-[#081E35] hover:bg-[#0C2B4B] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {act.icon}
                    <span className="text-xs font-bold text-[#E4F1FF] truncate">{act.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7FA6C4] group-hover:text-[#00E5FF] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 2: INTERVIEW PREPARATION (PURPLE ACCENT — Matching Image 3 Middle)
         ========================================================================== */}
      <section className="rounded-2xl border border-[#C44DFF]/55 border-l-4 border-l-[#C44DFF] bg-gradient-to-b from-[#0E1A35] via-[#09162C] to-[#061223] p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] space-y-3">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#29355C] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A1438] border border-[#C44DFF]/60 flex items-center justify-center text-[#D884FF] shadow-[0_0_10px_rgba(196,77,255,0.3)]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Interview Preparation
                </h2>
                <span className="hidden md:inline text-[11.5px] text-[#C4B5FD] font-medium">
                  SAS • SCADA • DCS • PLC • Networking • Protection &amp; Control
                </span>
              </div>
              {bilingualTeluguEnabled && (
                <p className="text-[10.5px] text-[#D8B4FE]">
                  ఇంటర్వ్యూ ప్రిపరేషన్ — టెక్నికల్ Q&amp;A, మాక్ ఇంటర్వ్యూ &amp; 20 ట్రబుల్‌షూటింగ్ సినారియోలు
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#3B336A] bg-[#121633] px-2.5 py-1.5 text-xs font-bold text-[#E9D5FF]">
              <BookOpen className="w-3.5 h-3.5 text-[#C44DFF]" />
              <select
                aria-label="Select Interview Topic"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    dispatchDeepNavigate({
                      tab: 'INTERVIEW_PREP',
                      moduleId: 'PREP-01',
                      topicFilter: e.target.value,
                    });
                  }
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[115px]"
              >
                <option value="" disabled className="bg-[#091326]">
                  Topic
                </option>
                <option value="IEC 61850" className="bg-[#091326]">
                  SAS / IEC 61850
                </option>
                <option value="SCADA" className="bg-[#091326]">
                  SCADA / HMI
                </option>
                <option value="Protocols" className="bg-[#091326]">
                  Industrial Protocols
                </option>
                <option value="Networking" className="bg-[#091326]">
                  Networking &amp; Firewall
                </option>
                <option value="Protection & Control" className="bg-[#091326]">
                  Protection &amp; Control
                </option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#C4B5FD]" />
            </div>

            <button
              type="button"
              onClick={() =>
                dispatchDeepNavigate({
                  tab: 'INTERVIEW_PREP',
                  moduleId: 'PREP-02',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#C44DFF] to-[#8B5CF6] hover:brightness-110 px-3 py-1.5 text-xs font-black text-white shadow-[0_0_16px_rgba(196,77,255,0.4)] transition"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Practice Mode</span>
            </button>
          </div>
        </div>

        {/* 3-Column Body: Left 5-Book Stack | Center Preparation Tracks (01–04) | Right Quick Practice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left (4 cols): 5-Book Stack Visual */}
          <button
            type="button"
            onClick={() => dispatchDeepNavigate({ tab: 'INTERVIEW_PREP' })}
            className="lg:col-span-4 rounded-xl border border-[#2B3964] hover:border-[#C44DFF] bg-[#051221] overflow-hidden p-1.5 flex items-center justify-center transition group"
          >
            <img
              src="assets/academy/interview-books.jpg"
              width={1044}
              height={498}
              decoding="async"
              alt="SAS / IEC 61850, SCADA / HMI, PLC / DCS, Networking, HR & Projects Books"
              className="sas-crisp-cover w-full h-[160px] sm:h-[175px] object-contain bg-[#030C1A] rounded-lg"
            />
          </button>

          {/* Center (5 cols): Preparation Tracks (01 to 04) */}
          <div className="lg:col-span-5 rounded-xl border border-[#2B3964] bg-[#07162B]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-white">Preparation Tracks</span>
              <button
                type="button"
                onClick={() => dispatchDeepNavigate({ tab: 'INTERVIEW_PREP' })}
                className="text-[10.5px] font-bold text-[#D884FF] hover:underline"
              >
                Open Overview →
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  num: '01',
                  title: 'SAS / IEC 61850 (50+ Q&A)',
                  sub: 'GOOSE, MMS, SV, SCL, IEDs & Architecture',
                  topic: 'IEC 61850',
                },
                {
                  num: '02',
                  title: 'SCADA / HMI (30+ Q&A)',
                  sub: 'IEC 101 / 104, DNP3, Modbus, Architecture',
                  topic: 'SCADA',
                },
                {
                  num: '03',
                  title: 'DCS / PLC (40+ Q&A)',
                  sub: 'Controllers, IO, Redundancy, Logic & Interlocks',
                  topic: 'Protection & Control',
                },
                {
                  num: '04',
                  title: 'Networking & Firewall (CCNA / FortiGate)',
                  sub: 'VLAN, Routing, PRP/HSR, Cyber Security',
                  topic: 'Networking',
                },
              ].map((tr) => (
                <button
                  key={tr.num}
                  type="button"
                  onClick={() =>
                    dispatchDeepNavigate({
                      tab: 'INTERVIEW_PREP',
                      moduleId: 'PREP-01',
                      topicFilter: tr.topic,
                    })
                  }
                  className="group w-full rounded-lg border border-[#24345A] hover:border-[#C44DFF] bg-[#091C34] hover:bg-[#142244] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded bg-[#151332] border border-[#C44DFF]/60 text-[#E09EFF] font-black text-[11px] flex items-center justify-center shrink-0">
                      {tr.num}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">{tr.title}</div>
                      <div className="text-[10px] text-[#9CC4E4] truncate">{tr.sub}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8AB4D4] group-hover:text-[#E09EFF] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Right (3 cols): Quick Practice */}
          <div className="lg:col-span-3 rounded-xl border border-[#2B3964] bg-[#07162B]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-[#D884FF]" />
              <span className="text-xs font-extrabold text-white">Quick Practice</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() =>
                  dispatchDeepNavigate({
                    tab: 'INTERVIEW_PREP',
                    moduleId: 'PREP-04',
                  })
                }
                className="w-full rounded-lg border border-[#24345A] hover:border-[#C44DFF] bg-[#091C34] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
              >
                <span className="text-xs font-bold text-[#E4F1FF] truncate">
                  HR &amp; Personal Questions
                </span>
                <span className="rounded bg-[#181534] border border-[#C44DFF]/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#E09EFF] shrink-0">
                  15 Q
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  dispatchDeepNavigate({
                    tab: 'INTERVIEW_PREP',
                    moduleId: 'PREP-01',
                  })
                }
                className="w-full rounded-lg border border-[#24345A] hover:border-[#C44DFF] bg-[#091C34] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
              >
                <span className="text-xs font-bold text-[#E4F1FF] truncate">
                  Technical Questions
                </span>
                <span className="rounded bg-[#181534] border border-[#C44DFF]/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#E09EFF] shrink-0">
                  100+ Q
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  dispatchDeepNavigate({
                    tab: 'INTERVIEW_PREP',
                    moduleId: 'PREP-03',
                  })
                }
                className="w-full rounded-lg border border-[#24345A] hover:border-[#C44DFF] bg-[#091C34] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
              >
                <span className="text-xs font-bold text-[#E4F1FF] truncate">
                  Scenario Based Q&amp;A
                </span>
                <span className="rounded bg-[#181534] border border-[#C44DFF]/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#E09EFF] shrink-0">
                  25 Q
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  dispatchDeepNavigate({
                    tab: 'INTERVIEW_PREP',
                    moduleId: 'PREP-02',
                  })
                }
                className="w-full rounded-lg border border-[#C44DFF]/60 bg-gradient-to-r from-[#1A1438] to-[#0E1D38] hover:brightness-110 px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition"
              >
                <span className="text-xs font-extrabold text-white truncate">
                  Mock Interview (Timed)
                </span>
                <span className="rounded bg-[#C44DFF] px-2 py-0.5 text-[10px] font-black text-white shrink-0">
                  Start
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 3: CCNA NETWORKING ACADEMY (GREEN ACCENT — Matching Image 3 Bottom)
         ========================================================================== */}
      <section className="rounded-2xl border border-[#22C985]/55 border-l-4 border-l-[#22C985] bg-gradient-to-b from-[#071E2E] via-[#061828] to-[#051220] p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] space-y-3">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#18434A] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#072624] border border-[#22C985]/60 flex items-center justify-center text-[#4ADE80] shadow-[0_0_10px_rgba(34,201,133,0.3)]">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  CCNA Networking Academy
                </h2>
                <span className="hidden md:inline text-[11.5px] text-[#9ED4C2] font-medium">
                  Network Fundamentals • Switching • Routing • VLAN • Security
                </span>
              </div>
              {bilingualTeluguEnabled && (
                <p className="text-[10.5px] text-[#4ADE80]">
                  CCNA నెట్‌వర్కింగ్ అకాడమీ — 30 అధ్యాయాలు, 10 ప్యాకెట్ ట్రేసర్ ల్యాబ్స్ &amp; 20 టోపాలజీలు
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#1E524E] bg-[#07202B] px-2.5 py-1.5 text-xs font-bold text-[#DCEAF5]">
              <BookOpen className="w-3.5 h-3.5 text-[#4ADE80]" />
              <select
                aria-label="Select CCNA Module"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    dispatchDeepNavigate({
                      tab: 'CCNA_ACADEMY',
                      moduleId: e.target.value,
                    });
                  }
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[115px]"
              >
                <option value="" disabled className="bg-[#061525]">
                  Module
                </option>
                <option value="CCNA-M01" className="bg-[#061525]">
                  01 Fundamentals
                </option>
                <option value="CCNA-M02" className="bg-[#061525]">
                  02 Switching &amp; VLAN
                </option>
                <option value="CCNA-M03" className="bg-[#061525]">
                  03 Routing
                </option>
                <option value="CCNA-M04" className="bg-[#061525]">
                  04 OSPF &amp; Services
                </option>
                <option value="CCNA-M05" className="bg-[#061525]">
                  05 Security
                </option>
                <option value="CCNA-M06" className="bg-[#061525]">
                  06 Troubleshooting
                </option>
                <option value="CCNA-M07" className="bg-[#061525]">
                  07 Packet Tracer Labs
                </option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#9ED4C2]" />
            </div>

            <button
              type="button"
              onClick={() =>
                dispatchDeepNavigate({
                  tab: 'CCNA_ACADEMY',
                  moduleId: 'CCNA-M07',
                  subTab: 'LABS',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22C985] to-[#10B981] hover:brightness-110 px-3 py-1.5 text-xs font-black text-[#031222] shadow-[0_0_16px_rgba(34,201,133,0.4)] transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Network Lab</span>
            </button>
          </div>
        </div>

        {/* 3-Column Body: Left Cisco Switches | Center Learning Path (2x3 Grid) | Right Lab & Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left (4 cols): Dual Stacked Cisco Switches */}
          <button
            type="button"
            onClick={() => dispatchDeepNavigate({ tab: 'CCNA_ACADEMY' })}
            className="lg:col-span-4 rounded-xl border border-[#1B4B4A] hover:border-[#22C985] bg-[#04111E] overflow-hidden p-1.5 flex items-center justify-center transition group"
          >
            <img
              src="assets/academy/cisco-switches.jpg"
              width={1074}
              height={414}
              decoding="async"
              alt="Dual Cisco 24-Port Industrial Rack Switches"
              className="sas-crisp-cover w-full h-[145px] sm:h-[158px] object-contain bg-[#030D1B] rounded-lg"
            />
          </button>

          {/* Center (5 cols): Learning Path (2x3 Grid of 6 Cards matching Reference Image 3 Bottom) */}
          <div className="lg:col-span-5 rounded-xl border border-[#1B4B4A] bg-[#061726]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-white">Learning Path</span>
              <button
                type="button"
                onClick={() => dispatchDeepNavigate({ tab: 'CCNA_ACADEMY' })}
                className="text-[10.5px] font-bold text-[#4ADE80] hover:underline"
              >
                All 30 Chapters →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                {
                  num: '01',
                  title: 'Network Fundamentals',
                  sub: 'OSI, TCP/IP, IP Addressing',
                  modId: 'CCNA-M01',
                },
                {
                  num: '02',
                  title: 'Switching & VLAN',
                  sub: 'L2 Switching, Trunking, STP',
                  modId: 'CCNA-M02',
                },
                {
                  num: '03',
                  title: 'Routing & OSPF',
                  sub: 'Static, Dynamic Routing',
                  modId: 'CCNA-M03',
                },
                {
                  num: '04',
                  title: 'Industrial Ethernet',
                  sub: 'PRP, HSR, RSTP, Ring',
                  modId: 'CCNA-M06',
                },
                {
                  num: '05',
                  title: 'Network Security',
                  sub: 'ACL, Firewall, VPN, Ports',
                  modId: 'CCNA-M05',
                },
                {
                  num: '06',
                  title: 'Practice Labs & Troubleshooting',
                  sub: 'Packet Tracer, Ping, Wireshark',
                  modId: 'CCNA-M07',
                },
              ].map((lp) => (
                <button
                  key={lp.num}
                  type="button"
                  onClick={() =>
                    dispatchDeepNavigate({
                      tab: 'CCNA_ACADEMY',
                      moduleId: lp.modId,
                      subTab: lp.num === '06' ? 'LABS' : 'LESSON',
                    })
                  }
                  className="group rounded-lg border border-[#194445] hover:border-[#22C985] bg-[#071E2E] hover:bg-[#0B2D3E] p-2 flex items-start gap-2 text-left transition"
                >
                  <span className="w-5 h-5 rounded bg-[#072924] border border-[#22C985]/60 text-[#4ADE80] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {lp.num}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-extrabold text-white truncate">
                      {lp.title}
                    </div>
                    <div className="text-[9.5px] text-[#9ED4C2] truncate">{lp.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right (3 cols): Lab & Resources */}
          <div className="lg:col-span-3 rounded-xl border border-[#1B4B4A] bg-[#061726]/90 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span className="text-xs font-extrabold text-white">Lab &amp; Resources</span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  label: 'Lab Topologies',
                  subTab: 'DIAGRAMS',
                  icon: <Network className="w-3.5 h-3.5 text-[#4ADE80]" />,
                },
                {
                  label: 'Configuration Guides',
                  subTab: 'CLI',
                  icon: <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />,
                },
                {
                  label: 'Practice Tests',
                  subTab: 'QUIZ',
                  icon: <CheckSquare className="w-3.5 h-3.5 text-[#FBBF24]" />,
                },
              ].map((res) => (
                <button
                  key={res.label}
                  type="button"
                  onClick={() =>
                    dispatchDeepNavigate({
                      tab: 'CCNA_ACADEMY',
                      moduleId: 'CCNA-M07',
                      subTab: res.subTab,
                    })
                  }
                  className="group w-full rounded-lg border border-[#194445] hover:border-[#22C985] bg-[#071E2E] hover:bg-[#0B2D3E] px-2.5 py-2 flex items-center justify-between gap-2 text-left transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {res.icon}
                    <span className="text-xs font-bold text-[#E4F1FF] truncate">{res.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9ED4C2] group-hover:text-[#4ADE80] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          OPTIONAL DRAWER: BILINGUAL (EN/TE) SUBSTATION SIMULATOR QUIZZES (6 MODULES)
         ========================================================================== */}
      <div className="rounded-2xl border border-[#1B3E5E] bg-[#061526] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#00E5FF]" />
            <span className="text-xs font-extrabold text-white">
              Interactive Bilingual (English / తెలుగు) Simulator Exercises &amp; Quick Quizzes (6 Modules)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBilingualQuizzes((s) => !s)}
            className="rounded-lg border border-[#00CFFF]/50 bg-[#09213A] px-3 py-1 text-xs font-bold text-[#00E5FF] hover:text-white"
          >
            {showBilingualQuizzes ? 'Hide Simulator Quizzes' : 'Open Simulator Quizzes'}
          </button>
        </div>

        {showBilingualQuizzes && (
          <div className="mt-3 pt-3 border-t border-[#173654] space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {LEARNING_MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedQuizModId(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    m.id === activeBilingualMod.id
                      ? 'bg-[#00CFFF] text-[#031222]'
                      : 'bg-[#081C33] text-[#9CC4E4] border border-[#1B3E5E]'
                  }`}
                >
                  {m.title}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#1B3E5E] bg-[#041120] p-3.5 space-y-2">
              <div className="text-xs font-extrabold text-[#00E5FF]">
                {activeBilingualMod.title} — {activeBilingualMod.titleTelugu}
              </div>
              <p className="text-xs text-[#C8E0F4]">{activeBilingualMod.englishSummary}</p>
              <p className="text-xs text-[#7BEAFF]">{activeBilingualMod.teluguSummary}</p>
              <div className="pt-2 space-y-2">
                {activeBilingualMod.quiz.map((q, qIdx) => {
                  const k = `${activeBilingualMod.id}-${qIdx}`;
                  const picked = quizAnswers[k];
                  const sub = !!quizSubmitted[k];
                  return (
                    <div
                      key={k}
                      className="rounded-lg border border-[#173654] bg-[#07192E] p-3 space-y-2 text-xs"
                    >
                      <div className="font-bold text-white">{q.question}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => {
                              setQuizAnswers((p) => ({ ...p, [k]: oIdx }));
                              setQuizSubmitted((p) => ({ ...p, [k]: true }));
                            }}
                            className={`rounded-lg border p-2 text-left ${
                              sub && q.correctIndex === oIdx
                                ? 'border-[#22C55E] bg-[#103326] text-[#4ADE80] font-bold'
                                : picked === oIdx
                                ? 'border-[#FF5C65] bg-[#3A121B] text-[#FDA4AF]'
                                : 'border-[#1C3F60] bg-[#081C33] text-[#D0E4F7]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {sub && <div className="text-[11px] text-[#7BEAFF]">{q.explanation}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
