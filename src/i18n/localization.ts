/**
 * Core Static Offline Localization Architecture for SAS Engineering Hub.
 * Supports 8 languages (EN, TE, TA, HI, PT, KO, FR, JA) with zero external API calls.
 * Uses code-split JSON catalogs in src/i18n/translations/*.json for Vercel compatibility.
 */

import { useEffect, useState } from 'react';
import enCatalogData from './translations/en.json';
import { isPureTechnicalText, PROTECTED_TECH_REGEX } from './terminology';

export type SupportedLanguageCode = 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';

export const LANGUAGE_CODES: Record<SupportedLanguageCode, string> = {
  EN: 'en',
  TE: 'te',
  TA: 'ta',
  HI: 'hi',
  PT: 'pt-BR',
  KO: 'ko',
  FR: 'fr',
  JA: 'ja',
};

export const SUPPORTED_LANGUAGE_LIST: ReadonlyArray<{
  code: SupportedLanguageCode;
  label: string;
  nativeName: string;
}> = [
  { code: 'EN', label: 'English', nativeName: 'English' },
  { code: 'TE', label: 'తెలుగు (Telugu)', nativeName: 'తెలుగు' },
  { code: 'TA', label: 'தமிழ் (Tamil)', nativeName: 'தமிழ்' },
  { code: 'HI', label: 'हिन्दी (Hindi)', nativeName: 'हिन्दी' },
  { code: 'PT', label: 'Português (Brasil)', nativeName: 'Português' },
  { code: 'KO', label: '한국어 (Korean)', nativeName: '한국어' },
  { code: 'FR', label: 'Français (French)', nativeName: 'Français' },
  { code: 'JA', label: '日本語 (Japanese)', nativeName: '日本語' },
];

export function normalizeLanguageCode(code?: string | null): SupportedLanguageCode {
  const upper = String(code || 'EN').trim().toUpperCase();
  if (upper.startsWith('PT')) return 'PT';
  if (upper in LANGUAGE_CODES) return upper as SupportedLanguageCode;
  return 'EN';
}

const EN_CATALOG: Record<string, string> = enCatalogData as Record<string, string>;

// Loaded key-based catalogs: lang -> (key -> translated string)
const LOADED_KEY_CATALOGS: Partial<Record<SupportedLanguageCode, Record<string, string>>> = {
  EN: EN_CATALOG,
};

// Loaded text-based catalogs: lang -> (normalized English string -> translated string)
const LOADED_TEXT_MAPS: Partial<Record<SupportedLanguageCode, Map<string, string>>> = {};

// Reverse lookup map: normalized translated string -> canonical English string
export const REVERSE_TRANSLATION_MAP = new Map<string, string>();

// In-flight promises for lazy loading
const LOADING_PROMISES: Partial<Record<SupportedLanguageCode, Promise<Record<string, string>>>> = {};

function normalizeKeyText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function registerCatalogInMemory(lang: SupportedLanguageCode, catalog: Record<string, string>): void {
  LOADED_KEY_CATALOGS[lang] = catalog;
  if (lang === 'EN') return;
  const textMap = new Map<string, string>();
  for (const [key, enText] of Object.entries(EN_CATALOG)) {
    const trText = catalog[key];
    if (enText && trText) {
      const normEn = normalizeKeyText(enText);
      const normTr = normalizeKeyText(trText);
      textMap.set(normEn, trText);
      if (normTr && normTr !== normEn) {
        REVERSE_TRANSLATION_MAP.set(normTr, enText);
      }
    }
  }
  LOADED_TEXT_MAPS[lang] = textMap;
}

/**
 * Ensures the static JSON catalog for `langInput` is loaded into memory.
 * Uses Vite dynamic imports so each non-English language is split into its own chunk.
 */
export async function ensureLanguageLoaded(langInput: string): Promise<Record<string, string>> {
  const lang = normalizeLanguageCode(langInput);
  if (LOADED_KEY_CATALOGS[lang]) {
    return LOADED_KEY_CATALOGS[lang]!;
  }
  if (LOADING_PROMISES[lang]) {
    return LOADING_PROMISES[lang]!;
  }

  const loaderPromise = (async () => {
    let mod: { default: Record<string, string> };
    switch (lang) {
      case 'TE':
        mod = await import('./translations/te.json');
        break;
      case 'TA':
        mod = await import('./translations/ta.json');
        break;
      case 'HI':
        mod = await import('./translations/hi.json');
        break;
      case 'PT':
        mod = await import('./translations/pt.json');
        break;
      case 'KO':
        mod = await import('./translations/ko.json');
        break;
      case 'FR':
        mod = await import('./translations/fr.json');
        break;
      case 'JA':
        mod = await import('./translations/ja.json');
        break;
      default:
        mod = { default: EN_CATALOG };
        break;
    }
    const data = mod.default || (mod as unknown as Record<string, string>);
    registerCatalogInMemory(lang, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sas:language-ready', { detail: lang }));
    }
    return data;
  })();

  LOADING_PROMISES[lang] = loaderPromise;
  return loaderPromise;
}

export function isLanguageCatalogLoaded(langInput: string): boolean {
  const lang = normalizeLanguageCode(langInput);
  return Boolean(LOADED_KEY_CATALOGS[lang]);
}

export function getLoadedKeyTranslation(key: string, langInput: string): string | undefined {
  const lang = normalizeLanguageCode(langInput);
  if (lang === 'EN') return EN_CATALOG[key];
  return LOADED_KEY_CATALOGS[lang]?.[key];
}

export function getLoadedTextTranslation(normEnglishText: string, langInput: string): string | undefined {
  const lang = normalizeLanguageCode(langInput);
  if (lang === 'EN') return normEnglishText;
  return LOADED_TEXT_MAPS[lang]?.get(normEnglishText);
}

/**
 * Translates by explicit stable localization key (e.g. "interview.chapter01.q01.question"),
 * falling back to exact English text lookup if needed.
 */
export function translateByKey(
  key: string,
  fallbackEnglish: string,
  langInput: string,
  textFallbackFn?: (text: string, lang: string) => string
): string {
  const lang = normalizeLanguageCode(langInput);
  if (lang === 'EN') return EN_CATALOG[key] || fallbackEnglish;
  const byKey = LOADED_KEY_CATALOGS[lang]?.[key];
  if (byKey) return byKey;
  if (textFallbackFn) return textFallbackFn(fallbackEnglish, lang);
  return fallbackEnglish;
}

/**
 * Translates dynamic template strings containing numbers or runtime parameters.
 */
export function translateDynamicPattern(normText: string, lang: SupportedLanguageCode): string | undefined {
  if (lang === 'EN') return normText;

  // 1. "SELECTED CHAPTER · X OF Y"
  let m = normText.match(/^SELECTED CHAPTER\s*·\s*(\d+)\s*OF\s*(\d+)$/i);
  if (m) {
    const [, a, b] = m;
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `ఎంచుకున్న అధ్యాయం · ${b} లో ${a}`,
      TA: `தேர்ந்தெடுக்கப்பட்ட அத்தியாயம் · ${b}-இல் ${a}`,
      HI: `चयनित अध्याय · ${b} में से ${a}`,
      PT: `CAPÍTULO SELECIONADO · ${a} DE ${b}`,
      KO: `선택된 장 · 전체 ${b}개 중 ${a}번째`,
      FR: `CHAPITRE SÉLECTIONNÉ · ${a} SUR ${b}`,
      JA: `選択中の章 · 全${b}章中 第${a}章`,
    };
    return map[lang];
  }

  // 2. "{N} detailed interview questions for 2–3 years of SAS engineering experience. Expand a question to read the explanation, procedure and scenario."
  m = normText.match(/^(\d+)\s+detailed interview questions for 2[–-]3 years of SAS engineering experience\.\s*Expand a question to read the explanation,\s*procedure and scenario\.$/i);
  if (m) {
    const n = m[1];
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `2–3 సంవత్సరాల SAS ఇంజనీరింగ్ అనుభవం కోసం ${n} వివరణాత్మక ఇంటర్వ్యూ ప్రశ్నలు. వివరణ, దశలవారీ విధానం మరియు ప్రాక్టికల్ ఉదాహరణ చదవడానికి ప్రశ్నను విస్తరించండి.`,
      TA: `2–3 ஆண்டுகள் SAS பொறியியல் அனுபவத்திற்கான ${n} விரிவான நேர்காணல் கேள்விகள். விளக்கம், செயல்முறை மற்றும் நடைமுறைச் சூழலைப் படிக்க கேள்வியை விரிவாக்கவும்.`,
      HI: `2–3 वर्ष के SAS इंजीनियरिंग अनुभव के लिए ${n} विस्तृत इंटरव्यू प्रश्न। व्याख्या, प्रक्रिया और व्यावहारिक परिदृश्य पढ़ने के लिए किसी प्रश्न पर क्लिक करके खोलें।`,
      PT: `${n} perguntas detalhadas de entrevista para 2–3 anos de experiência em engenharia SAS. Expanda uma pergunta para ler a explicação, o procedimento e o cenário prático.`,
      KO: `2~3년차 SAS 엔지니어링 경력을 위한 ${n}개의 상세 면접 질문입니다. 설명, 절차 및 실무 사례를 확인하려면 질문을 펼쳐보세요.`,
      FR: `${n} questions d’entretien détaillées pour 2 à 3 ans d’expérience en ingénierie SAS. Développez une question pour lire l’explication, la procédure et le scénario pratique.`,
      JA: `2～3年の SAS エンジニアリング実務経験向けの ${n} 問の詳細な面接質問です。質問を展開すると、詳しい回答、手順、実務事例を確認できます。`,
    };
    return map[lang];
  }

  // 3. "Showing X of Y questions" / "Showing X of Y questions matching your search"
  m = normText.match(/^Showing\s+(\d+)\s+of\s+(\d+)\s+questions(\s+matching your search)?$/i);
  if (m) {
    const [, a, b, hasSearch] = m;
    if (hasSearch) {
      const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
        TE: `మీ శోధనకు సరిపోయే ${b} ప్రశ్నలలో ${a} చూపబడుతున్నాయి`,
        TA: `உங்கள் தேடலுக்குப் பொருந்தும் ${b} கேள்விகளில் ${a} காண்பிக்கப்படுகின்றன`,
        HI: `आपकी खोज से मेल खाने वाले ${b} में से ${a} प्रश्न दिखाए जा रहे हैं`,
        PT: `Exibindo ${a} de ${b} perguntas correspondentes à sua pesquisa`,
        KO: `검색어와 일치하는 전체 ${b}개 질문 중 ${a}개 표시 중`,
        FR: `Affichage de ${a} sur ${b} questions correspondant à votre recherche`,
        JA: `検索に一致する全 ${b} 問中 ${a} 問を表示しています`,
      };
      return map[lang];
    }
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `మొత్తం ${b} ప్రశ్నలలో ${a} చూపబడుతున్నాయి`,
      TA: `மொத்தம் ${b} கேள்விகளில் ${a} காண்பிக்கப்படுகின்றன`,
      HI: `कुल ${b} में से ${a} प्रश्न दिखाए जा रहे हैं`,
      PT: `Exibindo ${a} de ${b} perguntas`,
      KO: `전체 ${b}개 질문 중 ${a}개 표시 중`,
      FR: `Affichage de ${a} sur ${b} questions`,
      JA: `全 ${b} 問中 ${a} 問を表示しています`,
    };
    return map[lang];
  }

  // 4. "X of 20 chapters completed"
  m = normText.match(/^(\d+)\s+of\s+(\d+)\s+chapters completed$/i);
  if (m) {
    const [, a, b] = m;
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `${b} అధ్యాయాలలో ${a} పూర్తయ్యాయి`,
      TA: `${b} அத்தியாயங்களில் ${a} முடிந்தன`,
      HI: `${b} में से ${a} अध्याय पूर्ण`,
      PT: `${a} de ${b} capítulos concluídos`,
      KO: `전체 ${b}개 장 중 ${a}개 완료`,
      FR: `${a} sur ${b} chapitres terminés`,
      JA: `全 ${b} 章中 ${a} 章完了`,
    };
    return map[lang];
  }

  // 5. "X min read"
  m = normText.match(/^(\d+)\s+min read$/i);
  if (m) {
    const n = m[1];
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `${n} నిమిషాల పఠనం`,
      TA: `${n} நிமிட வாசிப்பு`,
      HI: `${n} मिनट पठन समय`,
      PT: `${n} min de leitura`,
      KO: `약 ${n}분 소요`,
      FR: `${n} min de lecture`,
      JA: `読了時間 約${n}分`,
    };
    return map[lang];
  }

  // 6. "Chapter XX · Foundation to Advanced"
  m = normText.match(/^Chapter\s+(\d+)\s*·\s*Foundation to Advanced$/i);
  if (m) {
    const c = m[1];
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `అధ్యాయం ${c} · ప్రాథమిక స్థాయి నుంచి అడ్వాన్స్‌డ్ వరకు`,
      TA: `அத்தியாயம் ${c} · அடிப்படை முதல் மேம்பட்ட நிலை வரை`,
      HI: `अध्याय ${c} · फाउंडेशन से एडवांस्ड तक`,
      PT: `Capítulo ${c} · Do Básico ao Avançado`,
      KO: `제${c}장 · 기초부터 고급까지`,
      FR: `Chapitre ${c} · Des fondamentaux au niveau avancé`,
      JA: `第${c}章 · 基礎から応用まで`,
    };
    return map[lang];
  }

  // 7. "Preparing {lang} PDF..." / "Generating {lang} PDF: X / Y questions"
  m = normText.match(/^Preparing\s+([A-Z]+)\s+PDF\.\.\.$/i);
  if (m) {
    const lCode = m[1];
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `${lCode} PDF సిద్ధం చేయబడుతోంది...`,
      TA: `${lCode} PDF தயாராகிறது...`,
      HI: `${lCode} PDF तैयार की जा रही है...`,
      PT: `Preparando PDF (${lCode})...`,
      KO: `${lCode} PDF 준비 중...`,
      FR: `Préparation du PDF (${lCode})...`,
      JA: `${lCode} PDF を準備しています...`,
    };
    return map[lang];
  }

  m = normText.match(/^Generating\s+([A-Z]+)\s+PDF:\s*(\d+)\s*\/\s*(\d+)\s*questions$/i);
  if (m) {
    const [, lCode, done, total] = m;
    const map: Record<Exclude<SupportedLanguageCode, 'EN'>, string> = {
      TE: `${lCode} PDF రూపొందించబడుతోంది: ${done} / ${total} ప్రశ్నలు`,
      TA: `${lCode} PDF உருவாக்கப்படுகிறது: ${done} / ${total} கேள்விகள்`,
      HI: `${lCode} PDF जनरेट हो रही है: ${done} / ${total} प्रश्न`,
      PT: `Gerando PDF (${lCode}): ${done} / ${total} perguntas`,
      KO: `${lCode} PDF 생성 중: ${done} / ${total} 질문`,
      FR: `Génération du PDF (${lCode}) : ${done} / ${total} questions`,
      JA: `${lCode} PDF を生成中: ${done} / ${total} 問`,
    };
    return map[lang];
  }

  return undefined;
}

export { isPureTechnicalText, PROTECTED_TECH_REGEX };
