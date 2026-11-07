import React, { useEffect, useMemo, useState } from 'react';
import {
  INTERVIEW_QUESTIONS_BANK,
  TROUBLESHOOTING_SCENARIOS_20,
  type InterviewCategory,
  type InterviewDifficulty,
  type InterviewQuestionItem,
  type TroubleshootingScenarioItem,
  evaluateMockAnswer,
} from '../data/interviewPrepData';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { useAuthStore } from '../auth/useAuthStore';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Download,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-react';

type PrepModuleId = 'PREP-01' | 'PREP-02' | 'PREP-03' | 'PREP-04';

interface PrepModuleDef {
  id: PrepModuleId;
  num: string;
  title: string;
  subtitle: string;
  mode: 'STUDY' | 'MOCK' | 'TROUBLESHOOTING' | 'REVISION';
}

const PREP_MODULES: PrepModuleDef[] = [
  {
    id: 'PREP-01',
    num: '01',
    title: 'Core Technical Q&A',
    subtitle: 'SAS / IEC 61850, SCADA / HMI, Protection, Networking & HR Q&A',
    mode: 'STUDY',
  },
  {
    id: 'PREP-02',
    num: '02',
    title: 'Mock Interview (Timed)',
    subtitle: 'Interactive technical evaluator with instant keyword & clarity scoring',
    mode: 'MOCK',
  },
  {
    id: 'PREP-03',
    num: '03',
    title: 'Troubleshooting Scenarios',
    subtitle: '20 real-world substation commissioning & maintenance fault scenarios',
    mode: 'TROUBLESHOOTING',
  },
  {
    id: 'PREP-04',
    num: '04',
    title: 'Revision & Quick Notes',
    subtitle: 'Rapid pre-interview cheat sheets, protocol ports & printable handbook',
    mode: 'REVISION',
  },
];

const TOPIC_GROUPS: {
  id: string;
  title: string;
  categories: InterviewCategory[];
  badge: string;
}[] = [
  {
    id: 'TOPIC-IEC',
    title: 'IEC 61850 & Substation Automation',
    categories: ['IEC 61850', 'Substation Equipments'],
    badge: 'SAS / IEC 61850',
  },
  {
    id: 'TOPIC-NET',
    title: 'Networking (CCNA Basics)',
    categories: ['Networking'],
    badge: 'CCNA / PRP / HSR',
  },
  {
    id: 'TOPIC-SCADA',
    title: 'SCADA / HMI & Protocols',
    categories: ['SCADA', 'Protocols'],
    badge: 'MMS / 104 / Modbus / OPC UA',
  },
  {
    id: 'TOPIC-PROT',
    title: 'Protection, Control & Commissioning',
    categories: ['Protection & Control', 'Testing & Commissioning'],
    badge: 'Relays & FAT/SAT',
  },
];

export const InterviewPrepPage: React.FC = () => {
  const { bilingualTeluguEnabled } = useSubstationStore();
  const { currentUserId, users, toggleInterviewQuestionComplete } = useAuthStore();
  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const [viewMode, setViewMode] = useState<'OVERVIEW' | 'WORKSPACE'>('OVERVIEW');
  const [activeModuleId, setActiveModuleId] = useState<PrepModuleId>('PREP-01');
  const [expandedTopicId, setExpandedTopicId] = useState<string>('TOPIC-IEC');

  // Workspace filter & question state
  const [selectedCategory, setSelectedCategory] = useState<InterviewCategory | 'ALL'>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    INTERVIEW_QUESTIONS_BANK[0].id
  );
  const [practiceReveal, setPracticeReveal] = useState<boolean>(false);

  // Local mastered questions state when guest
  const [guestMasteredIds, setGuestMasteredIds] = useState<string[]>([
    INTERVIEW_QUESTIONS_BANK[0]?.id || 'IQ-001',
    INTERVIEW_QUESTIONS_BANK[1]?.id || 'IQ-002',
    INTERVIEW_QUESTIONS_BANK[2]?.id || 'IQ-003',
  ]);

  const masteredQuestionIds = useMemo(() => {
    if (currentUser && (currentUser.progress.interviewCompletedIds || []).length > 0) {
      return currentUser.progress.interviewCompletedIds;
    }
    return guestMasteredIds;
  }, [currentUser, guestMasteredIds]);

  // Mock interview state
  const [mockAnswerText, setMockAnswerText] = useState<string>('');
  const [mockEvaluation, setMockEvaluation] = useState<ReturnType<typeof evaluateMockAnswer> | null>(
    null
  );
  const [mockTimerSec, setMockTimerSec] = useState<number>(0);
  const [mockTimerRunning, setMockTimerRunning] = useState<boolean>(false);

  // Troubleshooting scenario state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    TROUBLESHOOTING_SCENARIOS_20[0].id
  );
  const [scenarioFilter, setScenarioFilter] = useState<string>('ALL');

  // Consume deep-link payload if navigated from Learning Academies
  useEffect(() => {
    const dl = window.__SAS_DEEP_LINK__;
    if (dl && dl.tab === 'INTERVIEW_PREP') {
      if (dl.moduleId && PREP_MODULES.some((m) => m.id === dl.moduleId)) {
        setActiveModuleId(dl.moduleId as PrepModuleId);
        setViewMode('WORKSPACE');
      }
      if (dl.topicFilter) {
        setSelectedCategory(dl.topicFilter as InterviewCategory | 'ALL');
        setViewMode('WORKSPACE');
      }
      window.__SAS_DEEP_LINK__ = null;
    }
  }, []);

  // Listen for breadcrumb click to return to overview
  useEffect(() => {
    const onResetOverview = () => setViewMode('OVERVIEW');
    window.addEventListener('sas:reset-academy-overview', onResetOverview);
    return () => window.removeEventListener('sas:reset-academy-overview', onResetOverview);
  }, []);

  const activeModule = useMemo(
    () => PREP_MODULES.find((m) => m.id === activeModuleId) || PREP_MODULES[0],
    [activeModuleId]
  );

  // Sync breadcrumb suffix
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sas:breadcrumb', {
        detail: {
          suffix: viewMode === 'WORKSPACE' ? activeModule.title : null,
        },
      })
    );
  }, [viewMode, activeModule]);

  // Mock timer effect
  useEffect(() => {
    if (!mockTimerRunning) return;
    const t = window.setInterval(() => setMockTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [mockTimerRunning]);

  const filteredQuestions = useMemo(() => {
    return INTERVIEW_QUESTIONS_BANK.filter((item) => {
      const catOk = selectedCategory === 'ALL' || item.category === selectedCategory;
      const diffOk = selectedDifficulty === 'ALL' || item.difficulty === selectedDifficulty;
      const q = searchQuery.trim().toLowerCase();
      const searchOk =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.shortAnswer.toLowerCase().includes(q) ||
        item.detailedAnswer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return catOk && diffOk && searchOk;
    });
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  const activeQuestion: InterviewQuestionItem = useMemo(
    () =>
      filteredQuestions.find((q) => q.id === selectedQuestionId) ||
      filteredQuestions[0] ||
      INTERVIEW_QUESTIONS_BANK[0],
    [filteredQuestions, selectedQuestionId]
  );

  const filteredScenarios = useMemo(() => {
    if (scenarioFilter === 'ALL') return TROUBLESHOOTING_SCENARIOS_20;
    return TROUBLESHOOTING_SCENARIOS_20.filter((s) => s.category === scenarioFilter);
  }, [scenarioFilter]);

  const activeScenario: TroubleshootingScenarioItem = useMemo(
    () =>
      filteredScenarios.find((s) => s.id === selectedScenarioId) ||
      filteredScenarios[0] ||
      TROUBLESHOOTING_SCENARIOS_20[0],
    [filteredScenarios, selectedScenarioId]
  );

  const totalQuestionsCount = INTERVIEW_QUESTIONS_BANK.length;
  const masteredCount = masteredQuestionIds.length;
  const progressPct = Math.round((masteredCount / Math.max(1, totalQuestionsCount)) * 100);

  const handleToggleMastered = (qId: string) => {
    if (currentUser) {
      toggleInterviewQuestionComplete(qId);
    } else {
      setGuestMasteredIds((prev) =>
        prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
      );
    }
  };

  const openWorkspaceModule = (
    modId: PrepModuleId,
    catFilter: InterviewCategory | 'ALL' = 'ALL'
  ) => {
    setActiveModuleId(modId);
    setSelectedCategory(catFilter);
    setViewMode('WORKSPACE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadInterviewHandbook = () => {
    const lines: string[] = [
      '====================================================================',
      'SUBSTATION AUTOMATION — TECHNICAL INTERVIEW & TROUBLESHOOTING HANDBOOK',
      'Covers: IEC 61850, SAS, SCADA/HMI, Protection & Control, CCNA Networking & 20 Fault Scenarios',
      '====================================================================\n',
    ];
    INTERVIEW_QUESTIONS_BANK.forEach((q, idx) => {
      lines.push(`Q${idx + 1} [${q.category} | ${q.difficulty}]: ${q.question}`);
      lines.push(`Short Answer: ${q.shortAnswer}`);
      lines.push(`Detailed Explanation: ${q.detailedAnswer}`);
      lines.push(`Field Example: ${q.realSubstationExample}`);
      lines.push('--------------------------------------------------------------------\n');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Substation_Automation_Interview_Q_and_A_Handbook.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER VIEW 1: INTERVIEW PREPARATION OVERVIEW (Matching Reference Image 4 Bottom-Left)
  // ============================================================================
  if (viewMode === 'OVERVIEW') {
    return (
      <div className="space-y-3.5 text-[#E4F1FF]">
        {/* 1. COMPACT HEADER BANNER */}
        <section className="relative overflow-hidden rounded-2xl border border-[#A855F7]/45 bg-gradient-to-r from-[#0B1933] via-[#131D3B] to-[#09172E] px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Interview Preparation
              </h1>
              <p className="text-xs sm:text-[13px] text-[#B8CBE8] font-medium mt-0.5">
                Concepts <span className="text-[#C084FC] mx-1">•</span> Technical Q&amp;A{' '}
                <span className="text-[#C084FC] mx-1">•</span> Mock Interview{' '}
                <span className="text-[#C084FC] mx-1">•</span> Troubleshooting
              </p>
              {bilingualTeluguEnabled && (
                <p className="text-[11px] text-[#D8B4FE] mt-0.5">
                  ఇంటర్వ్యూ ప్రిపరేషన్ — కాన్సెప్ట్స్ • టెక్నికల్ Q&amp;A • మాక్ ఇంటర్వ్యూ • 20 ట్రబుల్‌షూటింగ్ సినారియోలు
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-02', 'ALL')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#C084FC]/65 bg-[#1B1638] hover:bg-[#271E4F] px-3.5 py-2 text-xs font-extrabold text-[#E9D5FF] transition"
              >
                <Clock className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>Timed Mock Interview</span>
              </button>
              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-01', 'ALL')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] hover:brightness-110 px-3.5 py-2 text-xs font-black text-white shadow-[0_0_18px_rgba(168,85,247,0.4)] transition"
              >
                <span>Open Question Bank</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 2. TOP ROW: Left 5-Book Stack Visual (4 cols) | Right 4 Action Cards (8 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Left (4 cols): 5 Technical Books Stack Card */}
          <div className="lg:col-span-4 rounded-2xl border border-[#27466E] bg-[#07182B] p-3 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div className="relative rounded-xl overflow-hidden border border-[#1E3F62] bg-[#04101E] flex-1 flex items-center justify-center">
              <img
                src="assets/academy/interview-books.jpg"
                width={1044}
                height={498}
                decoding="async"
                alt="Stack of 5 technical books: SAS / IEC 61850, SCADA / HMI, PLC / DCS, Networking, HR & Projects"
                className="sas-crisp-cover w-full h-[165px] sm:h-[180px] object-contain object-center bg-[#030C1A]"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold text-[#9CC4E4]">
              <span className="rounded bg-[#0A223B] border border-[#1E4466] px-2 py-0.5 text-[#00E5FF]">
                IEC 61850
              </span>
              <span className="rounded bg-[#0A223B] border border-[#1E4466] px-2 py-0.5 text-[#C084FC]">
                Substation Automation
              </span>
              <span className="rounded bg-[#0A223B] border border-[#1E4466] px-2 py-0.5 text-[#4ADE80]">
                Networking (CCNA)
              </span>
              <span className="rounded bg-[#0A223B] border border-[#1E4466] px-2 py-0.5 text-[#FBBF24]">
                Protection &amp; SCADA
              </span>
            </div>
          </div>

          {/* Right (8 cols): 4 Equal Action Cards (Q&A Topic-wise | Mock Interview | Troubleshooting 20 Scenarios | Revision & Notes) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#27466E] bg-gradient-to-br from-[#081D34] via-[#07182C] to-[#051222] p-4 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#C084FC]" />
                <h2 className="text-base sm:text-[17px] font-extrabold text-white tracking-tight">
                  Substation &amp; Industrial Automation Interview Tracks
                </h2>
              </div>
              <p className="mt-1.5 text-xs sm:text-[12.5px] leading-relaxed text-[#B6D3EA]">
                Prepare for Substation Automation Engineer, Protection &amp; Commissioning Engineer,
                SCADA/DMS Specialist, and OT Network Engineer roles with real field Q&amp;A, timed
                mock evaluations, and 20 commissioning fault scenarios.
              </p>
            </div>

            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-01', 'ALL')}
                className="group rounded-xl border border-[#234B70] hover:border-[#00CFFF] bg-[#09213A]/90 hover:bg-[#0E2E4F] p-3 text-center flex flex-col items-center justify-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#06182C] border border-[#00CFFF]/45 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">Q&amp;A</div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Topic-wise)</div>
              </button>

              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-02', 'ALL')}
                className="group rounded-xl border border-[#234B70] hover:border-[#C084FC] bg-[#09213A]/90 hover:bg-[#192044] p-3 text-center flex flex-col items-center justify-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#181534] border border-[#C084FC]/50 flex items-center justify-center text-[#C084FC] group-hover:scale-105 transition">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">
                  Mock Interview
                </div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Timed Evaluator)</div>
              </button>

              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-03', 'ALL')}
                className="group rounded-xl border border-[#234B70] hover:border-[#FFB838] bg-[#09213A]/90 hover:bg-[#0E2E4F] p-3 text-center flex flex-col items-center justify-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#261B12] border border-[#FFB838]/55 flex items-center justify-center text-[#FFC44D] group-hover:scale-105 transition">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">
                  Troubleshooting
                </div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(20 Scenarios)</div>
              </button>

              <button
                type="button"
                onClick={() => openWorkspaceModule('PREP-04', 'ALL')}
                className="group rounded-xl border border-[#234B70] hover:border-[#22C55E] bg-[#09213A]/90 hover:bg-[#0E2E4F] p-3 text-center flex flex-col items-center justify-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0A261E] border border-[#22C55E]/50 flex items-center justify-center text-[#4ADE80] group-hover:scale-105 transition">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">
                  Revision &amp; Notes
                </div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Cheat Sheets)</div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. LOWER ROW: Left Preparation Modules (4) (5 cols) | Right Topic Accordion + Your Progress (7 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Panel (5 cols): Preparation Modules (4) */}
          <div className="lg:col-span-5 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Preparation Modules (4)
              </h2>
              <span className="text-[11px] font-semibold text-[#84B2D6]">Select or Open</span>
            </div>

            <div className="space-y-2">
              {PREP_MODULES.map((mod) => {
                const isSelected = mod.id === activeModuleId;
                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl border transition p-3 flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0E3A5A] via-[#0B2C48] to-[#082036] border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.25)]'
                        : 'bg-[#081C32] border-[#1B3F60] hover:border-[#00CFFF]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveModuleId(mod.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#00CFFF] text-[#031222]'
                            : 'bg-[#051527] border border-[#00CFFF]/50 text-[#00E5FF]'
                        }`}
                      >
                        {mod.num}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-white truncate">
                          {mod.title}
                        </div>
                        <div className="text-[11px] text-[#8FB6D6] truncate mt-0.5">
                          {mod.subtitle}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openWorkspaceModule(mod.id, 'ALL')}
                      className="shrink-0 rounded-lg bg-[#00CFFF]/15 hover:bg-[#00CFFF] border border-[#00CFFF]/60 px-2.5 py-1 text-[11px] font-extrabold text-[#00E5FF] hover:text-[#031222] transition flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel (7 cols): Expandable Topic Rows + Your Progress (Matching Reference Image 4 Bottom-Left) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  {activeModule.num} {activeModule.title}
                </h2>
                <button
                  type="button"
                  onClick={() => openWorkspaceModule(activeModule.id, 'ALL')}
                  className="text-xs font-extrabold text-[#00E5FF] hover:underline flex items-center gap-1"
                >
                  <span>Launch Full Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {TOPIC_GROUPS.map((topic) => {
                  const isOpen = expandedTopicId === topic.id;
                  const topicQs = INTERVIEW_QUESTIONS_BANK.filter((q) =>
                    topic.categories.includes(q.category)
                  );
                  return (
                    <div
                      key={topic.id}
                      className="rounded-xl border border-[#1C4163] bg-[#061629] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTopicId((prev) => (prev === topic.id ? '' : topic.id))
                        }
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#0B2440] transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#00E5FF] shrink-0" />
                          <span className="text-xs sm:text-[13px] font-extrabold text-white truncate">
                            {topic.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded bg-[#0A223B] border border-[#1F476B] px-2 py-0.5 font-mono text-[10px] text-[#7BEAFF]">
                            {topic.badge}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-[#00E5FF]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#8AB4D4]" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-3.5 pb-3 pt-1 border-t border-[#163450] bg-[#041120] space-y-2">
                          {topicQs.slice(0, 3).map((q) => (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                setSelectedQuestionId(q.id);
                                openWorkspaceModule('PREP-01', q.category);
                              }}
                              className="w-full rounded-lg border border-[#173654] hover:border-[#00CFFF] bg-[#07192E] px-3 py-2 text-left flex items-center justify-between gap-2 transition"
                            >
                              <span className="text-xs font-semibold text-[#DCEAF5] truncate">
                                • {q.question}
                              </span>
                              <span className="text-[10px] font-mono text-[#00E5FF] shrink-0">
                                {q.difficulty} →
                              </span>
                            </button>
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => openWorkspaceModule('PREP-01', topic.categories[0])}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#00CFFF] px-3 py-1 text-[11px] font-black text-[#031222]"
                            >
                              <span>Practice All {topic.title} Q&amp;A</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Your Progress Bar (Matching Reference Image 4 Bottom-Left) */}
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00E5FF]" />
                  <h3 className="text-sm font-extrabold text-white">Your Progress</h3>
                </div>
                <span className="text-xs font-black text-[#00E5FF]">
                  {progressPct}%{' '}
                  <span className="font-semibold text-[#8FB6D6]">
                    ({masteredCount} / {totalQuestionsCount} Questions Mastered)
                  </span>
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#04101E] border border-[#1B3D5D] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00CFFF] via-[#38BDF8] to-[#A855F7] shadow-[0_0_12px_#00CFFF] transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPct)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // RENDER VIEW 2: FULL INTERVIEW PREPARATION WORKSPACE (Study, Mock, 20 Scenarios, Revision)
  // ============================================================================
  const isCurrentQuestionMastered = masteredQuestionIds.includes(activeQuestion.id);

  return (
    <div className="space-y-3.5 text-[#E4F1FF]">
      {/* TOP WORKSPACE HEADER */}
      <section className="rounded-2xl border border-[#A855F7]/45 bg-gradient-to-r from-[#081A30] via-[#101E38] to-[#081A30] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setViewMode('OVERVIEW')}
            className="inline-flex items-center gap-1 rounded-lg border border-[#244D70] bg-[#061729] hover:border-[#00CFFF] px-2.5 py-1 text-xs font-bold text-[#B8D7F0] hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00CFFF]" />
            <span>Overview</span>
          </button>
          <span className="rounded-md bg-[#A855F7] px-2.5 py-0.5 text-[11px] font-black uppercase text-white">
            MODULE {activeModule.num}
          </span>
          <h1 className="text-base sm:text-lg font-black text-white">{activeModule.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PREP_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModuleId(m.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                m.id === activeModule.id
                  ? 'bg-[#00CFFF] text-[#031222]'
                  : 'bg-[#081C33] border border-[#1E4466] text-[#9CC4E4] hover:text-white'
              }`}
            >
              {m.num} {m.title}
            </button>
          ))}
        </div>
      </section>

      {/* MODE 1: CORE TECHNICAL Q&A */}
      {activeModule.mode === 'STUDY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Question List & Filters (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-3.5 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7FA6C4] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interview questions..."
                className="w-full rounded-lg border border-[#224A6D] bg-[#041120] pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {(
                [
                  'ALL',
                  'IEC 61850',
                  'SCADA',
                  'Protocols',
                  'Networking',
                  'Protection & Control',
                  'Testing & Commissioning',
                  'Substation Equipments',
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    selectedCategory === cat
                      ? 'bg-[#00CFFF] text-[#031222]'
                      : 'bg-[#051323] text-[#9CC4E4] border border-[#1A3C5B]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
              {filteredQuestions.map((q, idx) => {
                const active = q.id === activeQuestion.id;
                const mastered = masteredQuestionIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuestionId(q.id);
                      setPracticeReveal(false);
                    }}
                    className={`w-full rounded-xl p-2.5 text-left border transition flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-[#0D3556] border-[#00CFFF] text-white'
                        : 'bg-[#051323] border-[#173654] text-[#B8D7F0] hover:border-[#00CFFF]/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-[#00E5FF]">
                        Q{idx + 1} • {q.category} • {q.difficulty}
                      </div>
                      <div className="text-xs font-bold line-clamp-2 mt-0.5">{q.question}</div>
                    </div>
                    {mastered && (
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detailed Answer Panel (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B3E5E] pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#00CFFF]/20 border border-[#00CFFF]/50 px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#00E5FF]">
                  {activeQuestion.category}
                </span>
                <span className="rounded bg-[#A855F7]/20 border border-[#A855F7]/50 px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#D8B4FE]">
                  {activeQuestion.difficulty}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleMastered(activeQuestion.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                  isCurrentQuestionMastered
                    ? 'border-[#22C55E] bg-[#123828] text-[#4ADE80]'
                    : 'border-[#00CFFF]/60 bg-[#08223C] text-white hover:bg-[#0D3156]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                <span>{isCurrentQuestionMastered ? 'Mastered' : 'Mark Question Mastered'}</span>
              </button>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                {activeQuestion.question}
              </h2>
              {bilingualTeluguEnabled && (
                <p className="text-xs text-[#7BEAFF] mt-1">{activeQuestion.questionTe}</p>
              )}
            </div>

            <div className="rounded-xl border border-[#00CFFF]/45 bg-[#06182C] p-3.5 space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#00E5FF]">
                Direct Interview Answer (30-Second Pitch)
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-white font-medium">
                {activeQuestion.shortAnswer}
              </p>
              {bilingualTeluguEnabled && (
                <p className="text-xs text-[#9CC4E4] pt-1 border-t border-[#173654]">
                  {activeQuestion.shortAnswerTe}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#C084FC]">
                Deep Technical Explanation
              </div>
              <p className="text-xs leading-relaxed text-[#C8E0F4]">
                {activeQuestion.detailedAnswer}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-2">
                <div className="text-xs font-extrabold text-[#4ADE80]">
                  Key Points Interviewers Look For
                </div>
                <ul className="space-y-1.5 text-xs text-[#DCEAF5]">
                  {activeQuestion.keyPointsToMention.map((kp) => (
                    <li key={kp} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0 mt-0.5" />
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-2">
                <div className="text-xs font-extrabold text-[#FFB838]">
                  Real 132/33 kV Substation Example
                </div>
                <p className="text-xs leading-relaxed text-[#C8E0F4]">
                  {activeQuestion.realSubstationExample}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TIMED MOCK INTERVIEW EVALUATOR */}
      {activeModule.mode === 'MOCK' && (
        <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3E5E] pb-3">
            <div>
              <h2 className="text-base font-black text-white">
                Timed Technical Mock Interview Simulator
              </h2>
              <p className="text-xs text-[#9CC4E4]">
                Type your technical response as you would explain it to a panel engineer and click Evaluate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-[#224A6D] bg-[#041120] px-3 py-1.5 font-mono text-xs font-bold text-[#00E5FF]">
                ⏱ {Math.floor(mockTimerSec / 60)}m {String(mockTimerSec % 60).padStart(2, '0')}s
              </span>
              <button
                type="button"
                onClick={() => setMockTimerRunning((r) => !r)}
                className="rounded-lg bg-[#00CFFF] px-3 py-1.5 text-xs font-black text-[#031222]"
              >
                {mockTimerRunning ? 'Pause Timer' : 'Start Timer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const rand =
                    INTERVIEW_QUESTIONS_BANK[
                      Math.floor(Math.random() * INTERVIEW_QUESTIONS_BANK.length)
                    ];
                  setSelectedQuestionId(rand.id);
                  setMockAnswerText('');
                  setMockEvaluation(null);
                  setMockTimerSec(0);
                }}
                className="rounded-lg border border-[#244D70] bg-[#081C33] px-3 py-1.5 text-xs font-bold text-white"
              >
                Next Random Question
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#00CFFF]/40 bg-[#051425] p-4">
            <div className="text-[11px] font-mono text-[#00E5FF] mb-1">
              {activeQuestion.category} • {activeQuestion.difficulty}
            </div>
            <div className="text-sm sm:text-base font-black text-white">
              {activeQuestion.question}
            </div>
          </div>

          <textarea
            rows={5}
            value={mockAnswerText}
            onChange={(e) => setMockAnswerText(e.target.value)}
            placeholder="Write your technical interview answer here (mention standard numbers, protocols, Logical Nodes, or commissioning steps)..."
            className="w-full rounded-xl border border-[#224A6D] bg-[#04101E] p-3.5 text-xs sm:text-sm text-white focus:border-[#00CFFF] focus:outline-none"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMockTimerRunning(false);
                setMockEvaluation(evaluateMockAnswer(activeQuestion, mockAnswerText));
              }}
              className="rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#A855F7] px-5 py-2 text-xs font-black text-white shadow-lg"
            >
              Evaluate My Answer
            </button>
          </div>

          {mockEvaluation && (
            <div className="rounded-xl border border-[#22C55E]/50 bg-[#051626] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">
                  Score: <span className="text-[#4ADE80]">{mockEvaluation.score}/100</span> (
                  {mockEvaluation.verdict})
                </span>
              </div>
              <p className="text-xs text-[#C8E0F4]">{mockEvaluation.feedback}</p>
              <div className="text-xs text-[#9CC4E4]">
                <strong className="text-[#00E5FF]">Model Answer: </strong>
                {activeQuestion.shortAnswer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: 20 TROUBLESHOOTING SCENARIOS */}
      {activeModule.mode === 'TROUBLESHOOTING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          <div className="lg:col-span-4 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-3.5 space-y-2.5 max-h-[540px] overflow-y-auto">
            <div className="text-xs font-extrabold text-[#00E5FF] px-1">
              20 Field Troubleshooting Scenarios
            </div>
            {filteredScenarios.map((sc) => {
              const active = sc.id === activeScenario.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`w-full rounded-xl p-2.5 text-left border transition ${
                    active
                      ? 'bg-[#0D3556] border-[#00CFFF] text-white'
                      : 'bg-[#051323] border-[#173654] text-[#B8D7F0] hover:border-[#00CFFF]/40'
                  }`}
                >
                  <div className="text-[10px] font-mono text-[#FFB838]">
                    Scenario #{sc.number} • {sc.category}
                  </div>
                  <div className="text-xs font-bold mt-0.5">{sc.title}</div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 space-y-3.5">
            <div className="border-b border-[#1B3E5E] pb-2.5">
              <span className="text-[10.5px] font-mono text-[#FFB838]">
                SCENARIO #{activeScenario.number} • {activeScenario.category}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                {activeScenario.title}
              </h2>
            </div>

            <div className="rounded-xl border border-[#FF5C65]/40 bg-[#24101B] p-3 text-xs space-y-1">
              <div className="font-extrabold text-[#FDA4AF]">Observed Symptoms in Substation</div>
              <ul className="list-disc list-inside text-[#FCE7F3] space-y-0.5">
                {activeScenario.symptoms.map((sym) => (
                  <li key={sym}>{sym}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#FFB838]/40 bg-[#231B10] p-3 text-xs space-y-1">
              <div className="font-extrabold text-[#FDE68A]">Root Cause Analysis</div>
              <p className="text-[#FEF3C7]">{activeScenario.rootCause}</p>
            </div>

            <div className="rounded-xl border border-[#22C55E]/40 bg-[#0A261E] p-3 text-xs space-y-1.5">
              <div className="font-extrabold text-[#4ADE80]">
                Step-by-Step Commissioning Fix
              </div>
              <ol className="list-decimal list-inside text-[#DCFCE7] space-y-1">
                {activeScenario.stepByStepFix.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: REVISION & QUICK NOTES */}
      {activeModule.mode === 'REVISION' && (
        <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3E5E] pb-3">
            <div>
              <h2 className="text-base font-black text-white">
                Rapid Pre-Interview Revision Sheet &amp; Protocol Ports
              </h2>
              <p className="text-xs text-[#9CC4E4]">
                Essential EtherTypes, TCP/UDP port numbers, multicast MAC ranges, and protection ANSI codes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadInterviewHandbook}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00CFFF] px-4 py-2 text-xs font-black text-[#031222]"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Interview Handbook (.TXT)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-1.5">
              <div className="font-extrabold text-[#00E5FF]">Standard Ports &amp; EtherTypes</div>
              <div>• MMS (IEC 61850-8-1): TCP Port 102</div>
              <div>• GOOSE: Layer-2 EtherType 0x88B8</div>
              <div>• Sampled Values (SV): EtherType 0x88BA</div>
              <div>• PTP IEEE 1588v2: EtherType 0x88F7</div>
              <div>• IEC 60870-5-104: TCP Port 2404</div>
              <div>• Modbus TCP: TCP Port 502</div>
              <div>• OPC UA Binary: TCP Port 4840</div>
            </div>

            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-1.5">
              <div className="font-extrabold text-[#4ADE80]">Core Logical Nodes &amp; ANSI</div>
              <div>• PTOC (50/51): Time Overcurrent</div>
              <div>• PDIS (21): Distance Protection</div>
              <div>• PDIF (87L/87T): Differential</div>
              <div>• RSYN (25): Synchrocheck</div>
              <div>• RREC (79): Auto-Recloser</div>
              <div>• XCBR (52) / XSWI (89): Breaker / Isolator</div>
              <div>• CSWI / CILO: Switch Controller / Interlock</div>
            </div>

            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-1.5">
              <div className="font-extrabold text-[#C084FC]">Timing &amp; Redundancy Benchmarks</div>
              <div>• GOOSE Trip Transfer Time: &lt; 3 ms (Class P1)</div>
              <div>• SV 50Hz Protection Rate: 4000 Hz (80 s/c)</div>
              <div>• PRP / HSR Failover Time: 0.0 ms (Zero loss)</div>
              <div>• PTP Time Sync Accuracy: &lt; 1 µs</div>
              <div>• 1 ms Error @ 50Hz: 18° Phase Shift</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
