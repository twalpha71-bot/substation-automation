import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  GraduationCap,
  Search,
  X,
} from 'lucide-react';

export interface UnifiedChapterOption {
  id: string;
  numberLabel: string;
  title?: string;
  titleEn?: string;
  titleTe?: string;
  subtitle?: string;
  subtitleEn?: string;
  subtitleTe?: string;
  completed: boolean;
}

export interface UnifiedOutlineItem {
  id: string;
  label?: string;
  labelEn?: string;
  labelTe?: string;
  onClick?: () => void;
}

export interface UnifiedKeyTermItem {
  term: string;
  category?: string;
  definition?: string;
  definitionEn?: string;
  definitionTe?: string;
}

export interface UnifiedResourceLink {
  id: string;
  label?: string;
  labelEn?: string;
  labelTe?: string;
  badge?: string;
  onClick: () => void;
}

export interface UnifiedModeTab {
  id: string;
  label?: string;
  labelEn?: string;
  labelTe?: string;
  active?: boolean;
  onClick?: () => void;
}

interface UnifiedAcademyLayoutProps {
  academyBadge?: string;
  academyTitle?: string;
  titleEn?: string;
  titleTe?: string;
  shortDescription?: string;
  descriptionEn?: string;
  descriptionTe?: string;
  lang: 'EN' | 'TE';
  onLanguageChange?: (lang: 'EN' | 'TE') => void;
  onChangeLang?: (lang: 'EN' | 'TE') => void;
  progressPct?: number;
  completedCount: number;
  totalCount: number;
  chapterLabelPrefix?: string;
  chapters: UnifiedChapterOption[];
  selectedChapterId: string;
  onSelectChapter: (id: string) => void;
  onPrevious?: () => void;
  onPrevChapter?: () => void;
  onNext?: () => void;
  onNextChapter?: () => void;
  hasPrevious?: boolean;
  hasPrev?: boolean;
  hasNext: boolean;
  isCurrentCompleted: boolean;
  onToggleComplete: () => void;
  modeTabs?: UnifiedModeTab[];
  activeModeTab?: string;
  onSelectModeTab?: (id: string) => void;
  outlineItems: UnifiedOutlineItem[];
  keyTerms: UnifiedKeyTermItem[];
  resources: UnifiedResourceLink[];
  children: React.ReactNode;
}

export const UnifiedAcademyLayout: React.FC<UnifiedAcademyLayoutProps> = ({
  academyBadge,
  academyTitle,
  titleEn,
  titleTe,
  shortDescription,
  descriptionEn,
  descriptionTe,
  lang,
  onLanguageChange,
  onChangeLang,
  progressPct,
  completedCount,
  totalCount,
  chapterLabelPrefix = 'Course Chapter',
  chapters,
  selectedChapterId,
  onSelectChapter,
  onPrevious,
  onPrevChapter,
  onNext,
  onNextChapter,
  hasPrevious,
  hasPrev,
  hasNext,
  isCurrentCompleted,
  onToggleComplete,
  modeTabs,
  activeModeTab,
  onSelectModeTab,
  outlineItems,
  keyTerms,
  resources,
  children,
}) => {
  const isTe = lang === 'TE';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Collapsible right-sidebar panels state
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [termsOpen, setTermsOpen] = useState(true);
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [selectedTermKey, setSelectedTermKey] = useState<string | null>(null);
  const [resourcesOpen, setResourcesOpen] = useState(true);

  const handleLangChange = (newLang: 'EN' | 'TE') => {
    if (onLanguageChange) onLanguageChange(newLang);
    if (onChangeLang) onChangeLang(newLang);
  };

  const handlePrev = () => {
    if (onPrevious) onPrevious();
    else if (onPrevChapter) onPrevChapter();
  };

  const handleNext = () => {
    if (onNext) onNext();
    else if (onNextChapter) onNextChapter();
  };

  const canGoPrev = hasPrevious !== undefined ? hasPrevious : Boolean(hasPrev);
  const computedProgressPct =
    progressPct !== undefined
      ? progressPct
      : totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  const displayTitle = isTe ? titleTe || academyTitle || titleEn : titleEn || academyTitle;
  const displayDesc = isTe
    ? descriptionTe || shortDescription || descriptionEn
    : descriptionEn || shortDescription;

  const getChapterTitle = (ch: UnifiedChapterOption) =>
    (isTe ? ch.titleTe || ch.title || ch.titleEn : ch.titleEn || ch.title) || '';
  const getChapterSub = (ch: UnifiedChapterOption) =>
    (isTe ? ch.subtitleTe || ch.subtitle || ch.subtitleEn : ch.subtitleEn || ch.subtitle) || '';

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId) || chapters[0],
    [chapters, selectedChapterId]
  );

  const filteredChapters = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => {
      const tEn = (c.titleEn || c.title || '').toLowerCase();
      const tTe = (c.titleTe || '').toLowerCase();
      const sEn = (c.subtitleEn || c.subtitle || '').toLowerCase();
      return (
        c.numberLabel.toLowerCase().includes(q) ||
        tEn.includes(q) ||
        tTe.includes(q) ||
        sEn.includes(q)
      );
    });
  }, [chapters, chapterQuery]);

  // Close chapter dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  const visibleTerms = showAllTerms ? keyTerms : keyTerms.slice(0, 5);
  const activeTermObj = keyTerms.find((t) => t.term === selectedTermKey) || null;

  return (
    <div className="space-y-3.5 pb-8 text-[#E9F3FF]">
      {/* ==================== COMPACT COMMON PAGE HEADER (ROW 1 + ROW 2) ==================== */}
      <header className="rounded-xl border border-[#193B5A] bg-[#081A30] px-4 py-3 shadow-md space-y-2.5">
        {/* TOP ROW (75-100px desktop): Academy Title, Short Description, EN/TE Switch, Progress % & Slim Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14304B] pb-2.5">
          <div className="min-w-0 flex-1">
            {academyBadge && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00CFFF]/60 bg-[#030B18] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#00CFFF] mb-1">
                <GraduationCap className="w-3 h-3" /> {academyBadge}
              </div>
            )}
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#E9F3FF] truncate">
              {displayTitle}
            </h1>
            <p className="text-xs text-[#8FAFC8] line-clamp-1 mt-0.5">{displayDesc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Slim Course Progress Indicator */}
            <div className="flex items-center gap-2 bg-[#030B18] border border-[#193B5A] rounded-lg px-2.5 py-1.5">
              <div className="text-[11px] font-mono">
                <span className="text-[#8FAFC8]">{isTe ? 'పురోగతి:' : 'Progress:'} </span>
                <strong className="text-[#22C55E]">{computedProgressPct}%</strong>
                <span className="text-[#8FAFC8] ml-1">
                  ({completedCount}/{totalCount})
                </span>
              </div>
              <div className="w-20 sm:w-24 h-1.5 rounded-full bg-[#10253B] overflow-hidden">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-300"
                  style={{ width: `${Math.max(2, Math.min(100, computedProgressPct))}%` }}
                />
              </div>
            </div>

            {/* English / తెలుగు Language Switch */}
            <div
              role="group"
              aria-label="Language Selector"
              className="inline-flex rounded-lg border border-[#00CFFF]/60 bg-[#030B18] p-0.5"
            >
              <button
                type="button"
                onClick={() => handleLangChange('EN')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  lang === 'EN'
                    ? 'bg-[#00CFFF] text-[#030B18]'
                    : 'text-[#8FAFC8] hover:text-[#E9F3FF]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('TE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  lang === 'TE'
                    ? 'bg-[#00CFFF] text-[#030B18]'
                    : 'text-[#8FAFC8] hover:text-[#E9F3FF]'
                }`}
              >
                తెలుగు
              </button>
            </div>
          </div>
        </div>

        {/* SECOND ROW (44-52px desktop): Searchable Chapter Dropdown + Previous + Next + Mark Complete + Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-[#8FAFC8] hidden sm:inline shrink-0">
              {chapterLabelPrefix}:
            </span>

            {/* Searchable Chapter Dropdown */}
            <div ref={dropdownRef} className="relative flex-1 min-w-[210px] max-w-md">
              <button
                type="button"
                aria-label="Select course chapter"
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#00CFFF]/60 bg-[#030B18] hover:bg-[#10253B] px-3 py-1.5 text-left text-xs font-bold text-[#E9F3FF] transition"
              >
                <span className="truncate">
                  {activeChapter ? (
                    <>
                      <span className="font-mono text-[#00CFFF] mr-1.5">
                        {activeChapter.numberLabel}
                      </span>
                      <span>— {getChapterTitle(activeChapter)}</span>
                      {activeChapter.completed && (
                        <span className="ml-1.5 text-[#22C55E]">✓</span>
                      )}
                    </>
                  ) : (
                    'Select Chapter'
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#00CFFF] shrink-0" />
              </button>

              {dropdownOpen && (
                <div
                  style={{ backgroundColor: '#081A30', borderColor: '#00CFFF' }}
                  className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-2xl p-2 space-y-2"
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#00CFFF] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={chapterQuery}
                      onChange={(e) => setChapterQuery(e.target.value)}
                      placeholder={
                        isTe
                          ? 'అధ్యాయం సంఖ్య లేదా శీర్షిక వెతకండి...'
                          : 'Search chapter number or title...'
                      }
                      className="w-full rounded-lg border border-[#193B5A] bg-[#030B18] pl-8 pr-7 py-1.5 text-xs text-[#E9F3FF] placeholder-[#8FAFC8] focus:border-[#00CFFF] focus:outline-none"
                    />
                    {chapterQuery && (
                      <button
                        type="button"
                        onClick={() => setChapterQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8FAFC8]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {filteredChapters.map((ch) => {
                      const isSel = ch.id === selectedChapterId;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            onSelectChapter(ch.id);
                            setDropdownOpen(false);
                            setChapterQuery('');
                          }}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                            isSel
                              ? 'bg-[#10253B] border border-[#00CFFF] text-white font-bold'
                              : 'hover:bg-[#10253B]/60 text-[#E9F3FF]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-mono text-[#00CFFF] font-bold mr-1.5">
                              {ch.numberLabel}
                            </span>
                            <span>{getChapterTitle(ch)}</span>
                            {getChapterSub(ch) && (
                              <span className="block text-[10px] text-[#8FAFC8] truncate">
                                {getChapterSub(ch)}
                              </span>
                            )}
                          </div>
                          {ch.completed && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Previous / Next / Mark Complete Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-lg border border-[#193B5A] bg-[#10253B] hover:border-[#00CFFF] disabled:opacity-40 px-2.5 py-1.5 text-xs font-bold text-[#E9F3FF] transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isTe ? 'మునుపటి' : 'Previous'}</span>
              </button>

              <button
                type="button"
                disabled={!hasNext}
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-lg border border-[#193B5A] bg-[#10253B] hover:border-[#00CFFF] disabled:opacity-40 px-2.5 py-1.5 text-xs font-bold text-[#E9F3FF] transition"
              >
                <span>{isTe ? 'తదుపరి' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleComplete}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  isCurrentCompleted
                    ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E]'
                    : 'border-[#00CFFF] bg-[#00CFFF] text-[#030B18]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isCurrentCompleted
                    ? isTe
                      ? 'పూర్తయింది ✓'
                      : 'Completed ✓'
                    : isTe
                    ? 'పూర్తిగా గుర్తించు'
                    : 'Mark Complete'}
                </span>
              </button>
            </div>
          </div>

          {/* Optional Compact Mode Sub-Tabs */}
          {modeTabs && modeTabs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#030B18] p-0.5 border border-[#193B5A]">
              {modeTabs.map((mt) => {
                const active =
                  mt.active !== undefined ? mt.active : activeModeTab === mt.id;
                const tabLabel = isTe
                  ? mt.labelTe || mt.label || mt.labelEn
                  : mt.labelEn || mt.label;
                return (
                  <button
                    key={mt.id}
                    type="button"
                    onClick={() => {
                      if (mt.onClick) mt.onClick();
                      else if (onSelectModeTab) onSelectModeTab(mt.id);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      active
                        ? 'bg-[#10253B] text-[#00CFFF] border border-[#00CFFF]/50'
                        : 'text-[#8FAFC8] hover:text-[#E9F3FF]'
                    }`}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ==================== TWO-COLUMN MAIN CONTENT LAYOUT (79% MAIN + 21% STICKY RIGHT SIDEBAR) ==================== */}
      <div className="sas-unified-academy-body flex flex-col lg:flex-row gap-4 items-start">
        {/* Main Learning Area (78-80% on Desktop, 100% on Mobile/Tablet) */}
        <div className="sas-unified-main w-full lg:w-[79%] min-w-0 space-y-3.5">{children}</div>

        {/* Compact Sticky Right Sidebar (20-22% on Desktop, Collapsible Below Lesson on Mobile) */}
        <aside className="sas-unified-sidebar w-full lg:w-[21%] shrink-0 lg:sticky lg:top-24 space-y-2.5">
          {/* PANEL A: CHAPTER OUTLINE (Max Visible Height: 90-110 px) */}
          <div className="rounded-xl border border-[#193B5A] bg-[#081A30] p-3">
            <button
              type="button"
              onClick={() => setOutlineOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-[#00CFFF]"
            >
              <span>{isTe ? 'అధ్యాయం అవుట్‌లైన్' : 'Chapter Outline'}</span>
              {outlineOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {outlineOpen && (
              <div
                style={{ maxHeight: '104px' }}
                className="mt-2 overflow-y-auto space-y-1 pr-1 text-xs"
              >
                {outlineItems.map((item, idx) => {
                  const lbl = isTe
                    ? item.labelTe || item.label || item.labelEn
                    : item.labelEn || item.label;
                  return (
                    <button
                      key={item.id + idx}
                      type="button"
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                        } else {
                          const el = document.getElementById(item.id);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="w-full text-left rounded px-2 py-1 text-[11px] text-[#E9F3FF] hover:bg-[#10253B] hover:text-[#00CFFF] truncate block transition"
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANEL B: KEY TERMS (Max Visible Height: 80-100 px, 4-6 terms initially, definition on click) */}
          <div className="rounded-xl border border-[#193B5A] bg-[#081A30] p-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTermsOpen((o) => !o)}
                className="flex items-center gap-1 text-left text-xs font-extrabold uppercase tracking-wider text-[#00CFFF]"
              >
                <span>{isTe ? 'ముఖ్య పదజాలం' : 'Key Terms'}</span>
                {termsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {keyTerms.length > 5 && termsOpen && (
                <button
                  type="button"
                  onClick={() => setShowAllTerms((s) => !s)}
                  className="text-[10px] font-bold text-[#8FAFC8] hover:text-[#00CFFF]"
                >
                  {showAllTerms ? 'Less' : `All (${keyTerms.length})`}
                </button>
              )}
            </div>

            {termsOpen && (
              <div className="mt-2 space-y-1.5">
                <div
                  style={{ maxHeight: '94px' }}
                  className="overflow-y-auto flex flex-wrap gap-1 pr-1"
                >
                  {visibleTerms.map((kt) => {
                    const isSelected = selectedTermKey === kt.term;
                    return (
                      <button
                        key={kt.term}
                        type="button"
                        onClick={() =>
                          setSelectedTermKey(isSelected ? null : kt.term)
                        }
                        className={`rounded px-2 py-0.5 font-mono text-[10.5px] border transition ${
                          isSelected
                            ? 'bg-[#00CFFF] text-[#030B18] border-[#00CFFF] font-bold'
                            : 'bg-[#10253B] text-[#E9F3FF] border-[#193B5A] hover:border-[#00CFFF]'
                        }`}
                      >
                        {kt.term}
                      </button>
                    );
                  })}
                </div>
                {activeTermObj && (
                  <div className="rounded-lg border border-[#00CFFF]/50 bg-[#030B18] p-2 text-[11px] text-[#E9F3FF] leading-snug">
                    <strong className="text-[#00CFFF] font-mono">{activeTermObj.term}:</strong>{' '}
                    {isTe
                      ? activeTermObj.definitionTe ||
                        activeTermObj.definition ||
                        activeTermObj.definitionEn
                      : activeTermObj.definitionEn || activeTermObj.definition}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PANEL C: RESOURCES (Max Visible Height: 80-100 px) */}
          <div className="rounded-xl border border-[#193B5A] bg-[#081A30] p-3">
            <button
              type="button"
              onClick={() => setResourcesOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-[#00CFFF]"
            >
              <span>{isTe ? 'వనరులు & ఫైల్స్' : 'Resources'}</span>
              {resourcesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {resourcesOpen && (
              <div
                style={{ maxHeight: '94px' }}
                className="mt-2 overflow-y-auto space-y-1 pr-1 text-xs"
              >
                {resources.map((res) => {
                  const resLbl = isTe
                    ? res.labelTe || res.label || res.labelEn
                    : res.labelEn || res.label;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={res.onClick}
                      className="w-full flex items-center justify-between gap-1.5 rounded px-2 py-1 text-left text-[11px] text-[#E9F3FF] hover:bg-[#10253B] hover:text-[#00CFFF] transition"
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-[#00CFFF] shrink-0" />
                        <span className="truncate">{resLbl}</span>
                      </span>
                      {res.badge && (
                        <span className="font-mono text-[9.5px] text-[#8FAFC8] shrink-0">
                          {res.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
