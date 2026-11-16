/**
 * Automated Localization Coverage & Linguistic Quality Control Checker.
 * Compares all 8 language catalogs against the canonical English source catalog
 * and detects:
 *  1. Missing keys, empty strings, untranslated non-allowlisted strings, and broken interpolation tokens.
 *  2. Mixed-grammar English copula/auxiliary/verb/conjunction leaks inside translated sentences.
 *  3. Artificial placeholder suffixes (e.g., "(సాంకేతిక వివరణ)", "(especificação técnica)").
 *  4. Dropped critical IEC 61850 / SAS technical identifiers (GoCB, DataSet, BRCB, URCB, XCBR, CSWI, etc.).
 */

import { isPureTechnicalText, TECHNICAL_ALLOWLIST } from './terminology';
import type { SupportedLanguageCode } from './localization';

export interface LanguageCoverageStats {
  language: SupportedLanguageCode;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  emptyKeys: string[];
  untranslatedKeys: string[];
  brokenPlaceholders: string[];
  mixedGrammarKeys: string[];
  artificialSuffixKeys: string[];
  missingTechnicalTermKeys: string[];
  coveragePercent: number;
  linguisticQualityPercent: number;
}

export interface CoverageReportSummary {
  interviewChaptersChecked: number;
  interviewQuestionsChecked: number;
  totalKeysPerLanguage: number;
  missingTranslationKeys: number;
  languages: Record<SupportedLanguageCode, LanguageCoverageStats>;
}

const ALLOWLIST_SET = new Set(TECHNICAL_ALLOWLIST.map((t) => t.toLowerCase()));

const ARTIFICIAL_SUFFIXES = [
  '(సాంకేతిక వివరణ)',
  '(தொழில்நுட்ப விளக்கம்)',
  '(तकनीकी विवरण)',
  '(especificação técnica)',
  '(기술 설명)',
  '(spécification technique)',
  '（技術仕様）',
];

const CRITICAL_TECH_TOKENS = [
  'IEC 61850',
  'GOOSE',
  'MMS',
  'SCADA',
  'HMI',
  'IED',
  'DataSet',
  'GoCB',
  'BRCB',
  'URCB',
  'XCBR',
  'XSWI',
  'CSWI',
  'CILO',
  'PTOC',
  'PTRC',
  'MMXU',
  'PRP',
  'HSR',
  'RSTP',
  'VLAN',
];

// English copulas, auxiliaries, conjunctions, and finite verbs that must never leak into non-English prose
const MIXED_GRAMMAR_LEAK_RE =
  /\b(?:is|are|was|were|been|being|has|have|had|does|did|cannot|could|should|would|shall|because|although|unless|whereas|therefore|however|between|through|without|within|during|initiates|detects|monitors|performs|acquires|transfers|exchanges|converts|manages|provides|represents|receives|maps|displays|connects|depends|requires|supports|defines|describes|collects|sends|publishes|verifies|checks|confirms|indicates|proves|reduces|demonstrates|meets|remains|stays|shows|responds|differs|includes|contains|allows|prevents|affects|aligns|distributes|interconnects|exposes|opens|closes|begins|starts|travels|reaches|arrives|stops|disappears|loses|communicates|operates|owns|appears|succeeds|guarantees|assumes)\b/i;

function stripProtectedTechnicalSpans(text: string): string {
  let cleaned = text.replace(/`[^`]+`/g, ' ');
  cleaned = cleaned.replace(
    /\b(?:Select-Before-Operate|select-before-operate|Direct-Operate|direct-operate|plug-and-play|Time-limit-over|status-only|direct-with-normal-security)\b/gi,
    ' '
  );
  for (const term of TECHNICAL_ALLOWLIST) {
    if (term.length >= 3) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
    }
  }
  return cleaned;
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[a-zA-Z0-9_]+\}|\$\{[a-zA-Z0-9_]+\}/g);
  return matches ? [...matches].sort() : [];
}

export function isAllowlistedTechnicalTerm(text: string): boolean {
  const norm = text.replace(/\s+/g, ' ').trim();
  if (!norm) return true;
  if (ALLOWLIST_SET.has(norm.toLowerCase())) return true;
  if (norm.startsWith('<svg') || norm.startsWith('`')) return true;
  return isPureTechnicalText(norm);
}

export function hasMixedGrammarLeak(text: string, lang: SupportedLanguageCode): boolean {
  if (lang === 'EN') return false;
  const norm = text.replace(/\s+/g, ' ').trim();
  if (norm.startsWith('<svg') || (norm.startsWith('`') && norm.endsWith('`'))) return false;
  const stripped = stripProtectedTechnicalSpans(norm);
  return MIXED_GRAMMAR_LEAK_RE.test(stripped);
}

export function evaluateLanguageCatalogCoverage(
  enCatalog: Record<string, string>,
  targetCatalog: Record<string, string>,
  lang: SupportedLanguageCode
): LanguageCoverageStats {
  const enKeys = Object.keys(enCatalog);
  const missingKeys: string[] = [];
  const emptyKeys: string[] = [];
  const untranslatedKeys: string[] = [];
  const brokenPlaceholders: string[] = [];
  const mixedGrammarKeys: string[] = [];
  const artificialSuffixKeys: string[] = [];
  const missingTechnicalTermKeys: string[] = [];

  for (const key of enKeys) {
    const enVal = enCatalog[key];
    const trVal = targetCatalog[key];
    if (trVal === undefined) {
      missingKeys.push(key);
      continue;
    }
    if (!trVal || !trVal.trim()) {
      emptyKeys.push(key);
      continue;
    }
    if (lang !== 'EN') {
      const normEn = enVal.replace(/\s+/g, ' ').trim();
      const normTr = trVal.replace(/\s+/g, ' ').trim();
      if (normTr === normEn && !isAllowlistedTechnicalTerm(normEn)) {
        untranslatedKeys.push(key);
      }
      const enPh = extractPlaceholders(normEn);
      const trPh = extractPlaceholders(normTr);
      if (enPh.join('|') !== trPh.join('|')) {
        brokenPlaceholders.push(key);
      }
      if (ARTIFICIAL_SUFFIXES.some((suf) => normTr.includes(suf))) {
        artificialSuffixKeys.push(key);
      }
      if (hasMixedGrammarLeak(normTr, lang)) {
        mixedGrammarKeys.push(key);
      }
      for (const token of CRITICAL_TECH_TOKENS) {
        const tokenRe = new RegExp(`\\b${token.replace(/\s+/g, '\\s+')}\\b`);
        if (tokenRe.test(normEn) && !new RegExp(token.replace(/\s+/g, '\\s+'), 'i').test(normTr)) {
          missingTechnicalTermKeys.push(key);
          break;
        }
      }
    }
  }

  const validCount =
    enKeys.length -
    missingKeys.length -
    emptyKeys.length -
    untranslatedKeys.length -
    brokenPlaceholders.length;
  const linguisticValidCount =
    validCount - mixedGrammarKeys.length - artificialSuffixKeys.length;
  const coveragePercent =
    enKeys.length > 0 ? Number(((validCount / enKeys.length) * 100).toFixed(2)) : 100;
  const linguisticQualityPercent =
    enKeys.length > 0 ? Number(((Math.max(0, linguisticValidCount) / enKeys.length) * 100).toFixed(2)) : 100;

  return {
    language: lang,
    totalKeys: enKeys.length,
    translatedKeys: Math.max(0, validCount),
    missingKeys,
    emptyKeys,
    untranslatedKeys,
    brokenPlaceholders,
    mixedGrammarKeys,
    artificialSuffixKeys,
    missingTechnicalTermKeys,
    coveragePercent,
    linguisticQualityPercent,
  };
}
