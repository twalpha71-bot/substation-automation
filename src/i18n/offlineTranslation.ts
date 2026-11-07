/**
 * 100% Local Offline Multi-Language Translation Engine for Substation Automation Engineering Hub.
 *
 * Supported Languages (8):
 *   - EN: English
 *   - TE: తెలుగు (Telugu)
 *   - TA: தமிழ் (Tamil)
 *   - HI: हिन्दी (Hindi)
 *   - PT: Português (Portuguese)
 *   - KO: 한국어 (Korean)
 *   - FR: Français (French)
 *   - JA: 日本語 (Japanese)
 *
 * Kannada (KN) and Malayalam (ML) are removed.
 * Zero external APIs are used. All translations are resolved synchronously and locally.
 * Technical terminology, commands, formulas, and device identifiers are strictly preserved.
 */

import { IEC61850_ACADEMY_CHAPTERS, ACADEMY_GLOSSARY_TERMS } from '../data/iec61850AcademyData';
import { INTERVIEW_MODULES_LIST, INTERVIEW_QUESTIONS_BANK, TROUBLESHOOTING_SCENARIOS_20 } from '../data/interviewPrepData';
import { CCNA_EXAM_DOMAINS, CCNA_TOPOLOGIES, CCNA_PACKET_FLOWS, CCNA_CHAPTERS } from '../data/ccnaAcademyData';
import { LEARNING_MODULES } from '../data/learningData';

export type SupportedLanguageCode = 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';

export const LANGUAGE_CODES: Record<SupportedLanguageCode, string> = {
  EN: 'en',
  TE: 'te',
  TA: 'ta',
  HI: 'hi',
  PT: 'pt',
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
  { code: 'PT', label: 'Português (Portuguese)', nativeName: 'Português' },
  { code: 'KO', label: '한국어 (Korean)', nativeName: '한국어' },
  { code: 'FR', label: 'Français (French)', nativeName: 'Français' },
  { code: 'JA', label: '日本語 (Japanese)', nativeName: '日本語' },
];

export const UI_TRANSLATIONS: Record<string, Record<SupportedLanguageCode, string>> = {
  "Substation Workspace": {
    "EN": "Substation Workspace",
    "TE": "సబ్‌స్టేషన్ వర్క్‌స్పేస్",
    "TA": "துணை மின் நிலையப் பணியிடம்",
    "HI": "सबस्टेशन कार्यक्षेत्र",
    "PT": "Área de trabalho da subestação",
    "KO": "변전소 작업 공간",
    "FR": "Espace de travail du poste",
    "JA": "変電所ワークスペース"
  },
  "132/33/11kV SLD": {
    "EN": "132/33/11kV SLD",
    "TE": "132/33/11kV SLD (ఏక-రేఖా చిత్రం)",
    "TA": "132/33/11kV SLD (ஒற்றை வரி வரைபடம்)",
    "HI": "132/33/11kV SLD (एकल-रेखा आरेख)",
    "PT": "132/33/11kV SLD (Diagrama Unifilar)",
    "KO": "132/33/11kV SLD (단선 결선도)",
    "FR": "132/33/11kV SLD (Schéma Unifilaire)",
    "JA": "132/33/11kV SLD (単線結線図)"
  },
  "SCADA / HMI Operator Station": {
    "EN": "SCADA / HMI Operator Station",
    "TE": "SCADA / HMI ఆపరేటర్ స్టేషన్",
    "TA": "SCADA / HMI இயக்குநர் நிலையம்",
    "HI": "SCADA / HMI ऑपरेटर स्टेशन",
    "PT": "Estação do operador SCADA / HMI",
    "KO": "SCADA / HMI 운영자 스테이션",
    "FR": "Poste opérateur SCADA / HMI",
    "JA": "SCADA / HMI オペレーターステーション"
  },
  "IED Explorer": {
    "EN": "IED Explorer",
    "TE": "IED ఎక్స్‌ప్లోరర్",
    "TA": "IED ஆய்வி",
    "HI": "IED एक्सप्लोरर",
    "PT": "Explorador de IED",
    "KO": "IED 탐색기",
    "FR": "Explorateur IED",
    "JA": "IED エクスプローラー"
  },
  "IED Signal Chain & Mapping": {
    "EN": "IED Signal Chain & Mapping",
    "TE": "IED సిగ్నల్ చైన్ & మ్యాపింగ్",
    "TA": "IED சிக்னல் சங்கிலி & மேப்பிங்",
    "HI": "IED सिग्नल चेन और मैपिंग",
    "PT": "Cadeia de sinais e mapeamento IED",
    "KO": "IED 신호 체인 및 매핑",
    "FR": "Chaîne de signaux et mappage IED",
    "JA": "IED 信号チェーンとマッピング"
  },
  "PRP / HSR Network": {
    "EN": "PRP / HSR Network",
    "TE": "PRP / HSR నెట్‌వర్క్",
    "TA": "PRP / HSR பிணையம்",
    "HI": "PRP / HSR नेटवर्क",
    "PT": "Rede PRP / HSR",
    "KO": "PRP / HSR 네트워크",
    "FR": "Réseau PRP / HSR",
    "JA": "PRP / HSR ネットワーク"
  },
  "GOOSE Lab": {
    "EN": "GOOSE Lab",
    "TE": "GOOSE ల్యాబ్",
    "TA": "GOOSE ஆய்வகம்",
    "HI": "GOOSE प्रयोगशाला",
    "PT": "Laboratório GOOSE",
    "KO": "GOOSE 실습실",
    "FR": "Laboratoire GOOSE",
    "JA": "GOOSE ラボ"
  },
  "MMS & RCB Lab (TCP/102)": {
    "EN": "MMS & RCB Lab (TCP/102)",
    "TE": "MMS & RCB ల్యాబ్ (TCP/102)",
    "TA": "MMS & RCB ஆய்வகம் (TCP/102)",
    "HI": "MMS और RCB प्रयोगशाला (TCP/102)",
    "PT": "Laboratório MMS & RCB (TCP/102)",
    "KO": "MMS & RCB 실습실 (TCP/102)",
    "FR": "Laboratoire MMS & RCB (TCP/102)",
    "JA": "MMS & RCB ラボ (TCP/102)"
  },
  "Modbus TCP Lab (TCP/502)": {
    "EN": "Modbus TCP Lab (TCP/502)",
    "TE": "Modbus TCP ల్యాబ్ (TCP/502)",
    "TA": "Modbus TCP ஆய்வகம் (TCP/502)",
    "HI": "Modbus TCP प्रयोगशाला (TCP/502)",
    "PT": "Laboratório Modbus TCP (TCP/502)",
    "KO": "Modbus TCP 실습실 (TCP/502)",
    "FR": "Laboratoire Modbus TCP (TCP/502)",
    "JA": "Modbus TCP ラボ (TCP/502)"
  },
  "IEC-104 Lab (TCP/2404)": {
    "EN": "IEC-104 Lab (TCP/2404)",
    "TE": "IEC-104 ల్యాబ్ (TCP/2404)",
    "TA": "IEC-104 ஆய்வகம் (TCP/2404)",
    "HI": "IEC-104 प्रयोगशाला (TCP/2404)",
    "PT": "Laboratório IEC-104 (TCP/2404)",
    "KO": "IEC-104 실습실 (TCP/2404)",
    "FR": "Laboratoire IEC-104 (TCP/2404)",
    "JA": "IEC-104 ラボ (TCP/2404)"
  },
  "OPC UA Lab (TCP/4840)": {
    "EN": "OPC UA Lab (TCP/4840)",
    "TE": "OPC UA ల్యాబ్ (TCP/4840)",
    "TA": "OPC UA ஆய்வகம் (TCP/4840)",
    "HI": "OPC UA प्रयोगशाला (TCP/4840)",
    "PT": "Laboratório OPC UA (TCP/4840)",
    "KO": "OPC UA 실습실 (TCP/4840)",
    "FR": "Laboratoire OPC UA (TCP/4840)",
    "JA": "OPC UA ラボ (TCP/4840)"
  },
  "Signal Mapping & SCL": {
    "EN": "Signal Mapping & SCL",
    "TE": "సిగ్నల్ మ్యాపింగ్ & SCL",
    "TA": "சிக்னல் மேப்பிங் & SCL",
    "HI": "सिग्नल मैपिंग और SCL",
    "PT": "Mapeamento de sinais e SCL",
    "KO": "신호 매핑 및 SCL",
    "FR": "Mappage des signaux et SCL",
    "JA": "信号マッピングと SCL"
  },
  "Fault Injection": {
    "EN": "Fault Injection",
    "TE": "ఫాల్ట్ ఇంజెక్షన్",
    "TA": "பிழை செலுத்துதல்",
    "HI": "फॉल्ट इंजेक्शन",
    "PT": "Injeção de falhas",
    "KO": "고장 주입",
    "FR": "Injection de défauts",
    "JA": "故障注入"
  },
  "FAT / SAT Laboratory": {
    "EN": "FAT / SAT Laboratory",
    "TE": "FAT / SAT ల్యాబ్",
    "TA": "FAT / SAT ஆய்வகம்",
    "HI": "FAT / SAT प्रयोगशाला",
    "PT": "Laboratório FAT / SAT",
    "KO": "FAT / SAT 실험실",
    "FR": "Laboratoire FAT / SAT",
    "JA": "FAT / SAT ラボ"
  },
  "IEC 61850 Digital Substation": {
    "EN": "IEC 61850 Digital Substation",
    "TE": "IEC 61850 డిజిటల్ సబ్‌స్టేషన్",
    "TA": "IEC 61850 டிஜிட்டல் துணை மின் நிலையம்",
    "HI": "IEC 61850 डिजिटल सबस्टेशन",
    "PT": "Subestação digital IEC 61850",
    "KO": "IEC 61850 디지털 변전소",
    "FR": "Poste numérique IEC 61850",
    "JA": "IEC 61850 デジタル変電所"
  },
  "Interview Preparation": {
    "EN": "Interview Preparation",
    "TE": "ఇంటర్వ్యూ ప్రిపరేషన్",
    "TA": "நேர்காணல் தயாரிப்பு",
    "HI": "साक्षात्कार की तैयारी",
    "PT": "Preparação para entrevista",
    "KO": "면접 준비",
    "FR": "Préparation aux entretiens",
    "JA": "面接対策"
  },
  "CCNA Networking Academy": {
    "EN": "CCNA Networking Academy",
    "TE": "CCNA నెట్‌వర్కింగ్ అకాడమీ",
    "TA": "CCNA நெட்வொர்க்கிங் அகாடமி",
    "HI": "CCNA नेटवर्किंग अकादमी",
    "PT": "Academia de redes CCNA",
    "KO": "CCNA 네트워킹 아카데미",
    "FR": "Académie réseau CCNA",
    "JA": "CCNA ネットワークアカデミー"
  },
  "Training (EN/TE)": {
    "EN": "Training (EN/TE)",
    "TE": "శిక్షణ",
    "TA": "பயிற்சி",
    "HI": "प्रशिक्षण",
    "PT": "Treinamento",
    "KO": "교육",
    "FR": "Formation",
    "JA": "トレーニング"
  },
  "Training": {
    "EN": "Training",
    "TE": "శిక్షణ",
    "TA": "பயிற்சி",
    "HI": "प्रशिक्षण",
    "PT": "Treinamento",
    "KO": "교육",
    "FR": "Formation",
    "JA": "トレーニング"
  },
  "Your Workspace": {
    "EN": "Your Workspace",
    "TE": "మీ వర్క్‌స్పేస్",
    "TA": "உங்கள் பணியிடம்",
    "HI": "आपका कार्यक्षेत्र",
    "PT": "Seu espaço de trabalho",
    "KO": "내 작업 공간",
    "FR": "Votre espace de travail",
    "JA": "ワークスペース"
  },
  "Select language": {
    "EN": "Select language",
    "TE": "భాషను ఎంచుకోండి",
    "TA": "மொழியைத் தேர்ந்தெடுக்கவும்",
    "HI": "भाषा चुनें",
    "PT": "Selecionar idioma",
    "KO": "언어 선택",
    "FR": "Choisir la langue",
    "JA": "言語を選択"
  },
  "Available languages": {
    "EN": "Available languages",
    "TE": "అందుబాటులో ఉన్న భాషలు",
    "TA": "கிடைக்கும் மொழிகள்",
    "HI": "उपलब्ध भाषाएँ",
    "PT": "Idiomas disponíveis",
    "KO": "사용 가능한 언어",
    "FR": "Langues disponibles",
    "JA": "利用可能な言語"
  },
  "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.": {
    "EN": "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
    "TE": "మద్దతు ఉన్న అన్ని భాషలకు 100% ఆఫ్‌లైన్ అనువాదం అందుబాటులో ఉంది. సాంకేతిక పదాలు మరియు పరికర ఐడిలు మార్చబడవు.",
    "TA": "ஆதரிக்கப்படும் அனைத்து மொழிகளுக்கும் 100% ஆஃப்லைன் மொழிபெயர்ப்பு உள்ளது. தொழில்நுட்பச் சொற்கள் மாற்றப்படாது.",
    "HI": "समर्थित सभी भाषाओं के लिए 100% ऑफ़लाइन अनुवाद उपलब्ध है। तकनीकी शब्द अपरिवर्तित रहते हैं।",
    "PT": "Traduções 100% offline disponíveis para todos os idiomas suportados. Termos técnicos permanecem inalterados.",
    "KO": "지원되는 모든 언어에 대해 100% 오프라인 번역이 제공됩니다. 기술 용어와 장치 ID는 유지됩니다.",
    "FR": "Traductions 100% hors ligne disponibles pour toutes les langues prises en charge. Les termes techniques restent inchangés.",
    "JA": "サポートされている全言語で100%オフライン翻訳が利用可能です。技術用語や機器IDは変更されません。"
  },
  "Guest User": {
    "EN": "Guest User",
    "TE": "అతిథి వినియోగదారు",
    "TA": "விருந்தினர் பயனர்",
    "HI": "अतिथि उपयोगकर्ता",
    "PT": "Usuário convidado",
    "KO": "게스트 사용자",
    "FR": "Utilisateur invité",
    "JA": "ゲストユーザー"
  },
  "Sign In": {
    "EN": "Sign In",
    "TE": "సైన్ ఇన్",
    "TA": "உள்நுழை",
    "HI": "साइन इन",
    "PT": "Entrar",
    "KO": "로그인",
    "FR": "Se connecter",
    "JA": "ログイン"
  },
  "Sign Up": {
    "EN": "Sign Up",
    "TE": "సైన్ అప్",
    "TA": "பதிவு செய்க",
    "HI": "साइन अप",
    "PT": "Cadastrar",
    "KO": "회원가입",
    "FR": "S'inscrire",
    "JA": "新規登録"
  },
  "Continue as Guest": {
    "EN": "Continue as Guest",
    "TE": "అతిథిగా కొనసాగండి",
    "TA": "விருந்தினராகத் தொடரவும்",
    "HI": "अतिथि के रूप में जारी रखें",
    "PT": "Continuar como convidado",
    "KO": "게스트로 계속",
    "FR": "Continuer en invité",
    "JA": "ゲストとして続行"
  },
  "Sign in to personalize your experience": {
    "EN": "Sign in to personalize your experience",
    "TE": "వ్యక్తిగత అనుభవం కోసం సైన్ ఇన్ చేయండి",
    "TA": "தனிப்பயனாக்க உள்நுழையவும்",
    "HI": "व्यक्तिगत अनुभव के लिए साइन इन करें",
    "PT": "Entre para personalizar sua experiência",
    "KO": "개인화하려면 로그인하세요",
    "FR": "Connectez-vous pour personnaliser",
    "JA": "ログインしてカスタマイズ"
  },
  "or continue as Guest": {
    "EN": "or continue as Guest",
    "TE": "లేదా అతిథిగా కొనసాగండి",
    "TA": "அல்லது விருந்தினராகத் தொடரவும்",
    "HI": "या अतिथि के रूप में जारी रखें",
    "PT": "ou continuar como convidado",
    "KO": "또는 게스트로 계속",
    "FR": "ou continuer en invité",
    "JA": "またはゲストとして続行"
  },
  "Engineering Hub": {
    "EN": "Engineering Hub",
    "TE": "ఇంజినీరింగ్ హబ్",
    "TA": "பொறியியல் மையம்",
    "HI": "इंजीनियरिंग हब",
    "PT": "Centro de engenharia",
    "KO": "엔지니어링 허브",
    "FR": "Centre d'ingénierie",
    "JA": "エンジニアリングハブ"
  },
  "Opening Page": {
    "EN": "Opening Page",
    "TE": "ప్రారంభ పేజీ",
    "TA": "தொடக்கப் பக்கம்",
    "HI": "प्रारंभिक पृष्ठ",
    "PT": "Página inicial",
    "KO": "시작 페이지",
    "FR": "Page d'accueil",
    "JA": "開始ページ"
  },
  "My Profile": {
    "EN": "My Profile",
    "TE": "నా ప్రొఫైల్",
    "TA": "என் சுயவிவரம்",
    "HI": "मेरी प्रोफ़ाइल",
    "PT": "Meu perfil",
    "KO": "내 프로필",
    "FR": "Mon profil",
    "JA": "マイプロフィール"
  },
  "Learning Progress": {
    "EN": "Learning Progress",
    "TE": "అభ్యాస పురోగతి",
    "TA": "கற்றல் முன்னேற்றம்",
    "HI": "सीखने की प्रगति",
    "PT": "Progresso de aprendizagem",
    "KO": "학습 진행 상황",
    "FR": "Progression d'apprentissage",
    "JA": "学習進捗"
  },
  "Edit Profile": {
    "EN": "Edit Profile",
    "TE": "ప్రొఫైల్ సవరించు",
    "TA": "சுயவிவரத்தைத் திருத்து",
    "HI": "प्रोफ़ाइल संपादित करें",
    "PT": "Editar perfil",
    "KO": "프로필 수정",
    "FR": "Modifier le profil",
    "JA": "プロフィール編集"
  },
  "Change Password": {
    "EN": "Change Password",
    "TE": "పాస్‌వర్డ్ మార్చు",
    "TA": "கடவுச்சொல்லை மாற்று",
    "HI": "पासवर्ड बदलें",
    "PT": "Alterar senha",
    "KO": "비밀번호 변경",
    "FR": "Changer le mot de passe",
    "JA": "パスワード変更"
  },
  "Sign Out": {
    "EN": "Sign Out",
    "TE": "సైన్ అవుట్",
    "TA": "வெளியேறு",
    "HI": "साइन आउट",
    "PT": "Sair",
    "KO": "로그아웃",
    "FR": "Se déconnecter",
    "JA": "ログアウト"
  },
  "Admin Dashboard": {
    "EN": "Admin Dashboard",
    "TE": "అడ్మిన్ డాష్‌బోర్డ్",
    "TA": "நிர்வாகப் பலகை",
    "HI": "एडमिन डैशबोर्ड",
    "PT": "Painel administrativo",
    "KO": "관리자 대시보드",
    "FR": "Tableau de bord admin",
    "JA": "管理ダッシュボード"
  },
  "Sim Live": {
    "EN": "Sim Live",
    "TE": "సిమ్యులేషన్ ఆన్",
    "TA": "உருவகப்படுத்தல் இயங்குகிறது",
    "HI": "सिमुलेशन चालू",
    "PT": "Simulação ativa",
    "KO": "시뮬레이션 실행",
    "FR": "Simulation active",
    "JA": "シミュレーション実行中"
  },
  "Sim Paused": {
    "EN": "Sim Paused",
    "TE": "సిమ్యులేషన్ పాజ్",
    "TA": "உருவகப்படுத்தல் இடைநிறுத்தம்",
    "HI": "सिमुलेशन रुका",
    "PT": "Simulação pausada",
    "KO": "시뮬레이션 일시정지",
    "FR": "Simulation en pause",
    "JA": "シミュレーション一時停止"
  },
  "Dismiss": {
    "EN": "Dismiss",
    "TE": "మూసివేయి",
    "TA": "மூடு",
    "HI": "बंद करें",
    "PT": "Fechar",
    "KO": "닫기",
    "FR": "Fermer",
    "JA": "閉じる"
  },
  "Private engineering workspace": {
    "EN": "Private engineering workspace",
    "TE": "ప్రైవేట్ ఇంజనీరింగ్ వర్క్‌స్పేస్",
    "TA": "தனிப்பட்ட பொறியியல் பணியிடம்",
    "HI": "निजी इंजीनियरिंग कार्यक्षेत्र",
    "PT": "Espaço de trabalho de engenharia privado",
    "KO": "개인 엔지니어링 작업 공간",
    "FR": "Espace d'ingénierie privé",
    "JA": "プライベートエンジニアリングワークスペース"
  },
  "132/33/11 kV Digital Twin & Academies": {
    "EN": "132/33/11 kV Digital Twin & Academies",
    "TE": "132/33/11 kV డిజిటల్ ట్విన్ & అకాడమీలు",
    "TA": "132/33/11 kV டிஜிட்டல் இரட்டை & அகாடமிகள்",
    "HI": "132/33/11 kV डिजिटल ट्विन और अकादमियाँ",
    "PT": "Gêmeo Digital 132/33/11 kV & Academias",
    "KO": "132/33/11 kV 디지털 트윈 및 아카데미",
    "FR": "Jumeau numérique 132/33/11 kV & Académies",
    "JA": "132/33/11 kV デジタルツイン＆アカデミー"
  },
  "Notifications & System Status": {
    "EN": "Notifications & System Status",
    "TE": "నోటిఫికేషన్లు & సిస్టమ్ స్థితి",
    "TA": "அறிவிப்புகள் & கணினி நிலை",
    "HI": "सूचनाएं और सिस्टम स्थिति",
    "PT": "Notificações e status do sistema",
    "KO": "알림 및 시스템 상태",
    "FR": "Notifications et état du système",
    "JA": "通知とシステム状態"
  },
  "Search topics, labs, protocols, or learning modules...": {
    "EN": "Search topics, labs, protocols, or learning modules...",
    "TE": "అంశాలు, ల్యాబ్‌లు, ప్రోటోకాల్స్ లేదా మాడ్యూల్స్ వెతకండి...",
    "TA": "தலைப்புகள், ஆய்வகங்கள், நெறிமுறைகள் அல்லது பாடங்களைத் தேடுங்கள்...",
    "HI": "विषय, प्रयोगशालाएँ, प्रोटोकॉल या शिक्षण मॉड्यूल खोजें...",
    "PT": "Pesquisar tópicos, laboratórios, protocolos ou módulos...",
    "KO": "주제, 실습실, 프로토콜 또는 학습 모듈 검색...",
    "FR": "Rechercher des sujets, laboratoires, protocoles ou modules...",
    "JA": "トピック、ラボ、プロトコル、学習モジュールを検索..."
  },
  "Go To Substation Automation": {
    "EN": "Go To Substation Automation",
    "TE": "Substation Automation తెరవండి",
    "TA": "Substation Automation செல்லவும்",
    "HI": "Substation Automation पर जाएँ",
    "PT": "Ir para Substation Automation",
    "KO": "Substation Automation 이동",
    "FR": "Aller à Substation Automation",
    "JA": "Substation Automation へ移動"
  },
  "Your Substation Automation Workspace": {
    "EN": "Your Substation Automation Workspace",
    "TE": "మీ సబ్‌స్టేషన్ ఆటోమేషన్ వర్క్‌స్పేస్",
    "TA": "உங்கள் துணை மின் நிலைய தன்னியக்கப் பணியிடம்",
    "HI": "आपका सबस्टेशन ऑटोमेशन कार्यक्षेत्र",
    "PT": "Seu espaço de trabalho de automação de subestação",
    "KO": "변전소 자동화 작업 공간",
    "FR": "Votre espace d'automatisation de poste",
    "JA": "変電所オートメーション・ワークスペース"
  },
  "LEARN • CONFIGURE • SIMULATE • TROUBLESHOOT • COMMISSION": {
    "EN": "LEARN • CONFIGURE • SIMULATE • TROUBLESHOOT • COMMISSION",
    "TE": "నేర్చుకోండి • కాన్ఫిగర్ చేయండి • సిమ్యులేట్ చేయండి • ట్రబుల్‌షూట్ చేయండి • కమిషన్ చేయండి",
    "TA": "கற்க • கட்டமைக்க • உருவகப்படுத்த • பழுதுபார்க்க • இயக்க",
    "HI": "सीखें • कॉन्फ़िगर करें • सिमुलेट करें • समस्या निवारण करें • कमीशन करें",
    "PT": "APRENDER • CONFIGURAR • SIMULAR • DIAGNOSTICAR • COMISSIONAR",
    "KO": "학습 • 구성 • 시뮬레이션 • 문제 해결 • 시운전",
    "FR": "APPRENDRE • CONFIGURER • SIMULER • DÉPANNER • METTRE EN SERVICE",
    "JA": "学習 • 構成 • シミュレーション • トラブルシューティング • 試運転"
  },
  "ENTER 132/33/11 kV SLD →": {
    "EN": "ENTER 132/33/11 kV SLD →",
    "TE": "132/33/11 kV SLD తెరవండి →",
    "TA": "132/33/11 kV SLD உள்ளிடவும் →",
    "HI": "132/33/11 kV SLD में प्रवेश करें →",
    "PT": "ENTRAR NO SLD 132/33/11 kV →",
    "KO": "132/33/11 kV SLD 입장 →",
    "FR": "ENTRER DANS LE SLD 132/33/11 kV →",
    "JA": "132/33/11 kV SLD に入る →"
  },
  "Substation Automation / Practice Lab": {
    "EN": "Substation Automation / Practice Lab",
    "TE": "సబ్‌స్టేషన్ ఆటోమేషన్ / ప్రాక్టీస్ ల్యాబ్",
    "TA": "துணை மின் நிலைய தன்னியக்கம் / பயிற்சி ஆய்வகம்",
    "HI": "सबस्टेशन ऑटोमेशन / अभ्यास प्रयोगशाला",
    "PT": "Automação de Subestação / Laboratório Prático",
    "KO": "변전소 자동화 / 실습 랩",
    "FR": "Automatisation de poste / Laboratoire pratique",
    "JA": "変電所オートメーション / 実習ラボ"
  },
  "132 / 33 / 11 kV Substation": {
    "EN": "132 / 33 / 11 kV Substation",
    "TE": "132 / 33 / 11 kV సబ్‌స్టేషన్",
    "TA": "132 / 33 / 11 kV துணை மின் நிலையம்",
    "HI": "132 / 33 / 11 kV सबस्टेशन",
    "PT": "Subestação 132 / 33 / 11 kV",
    "KO": "132 / 33 / 11 kV 변전소",
    "FR": "Poste 132 / 33 / 11 kV",
    "JA": "132 / 33 / 11 kV 変電所"
  },
  "Explore the equipment. Follow the power. Understand the automation.": {
    "EN": "Explore the equipment. Follow the power. Understand the automation.",
    "TE": "పరికరాలను పరిశీలించండి. విద్యుత్ ప్రవాహాన్ని అనుసరించండి. ఆటోమేషన్‌ను అర్థం చేసుకోండి.",
    "TA": "உபகரணங்களை ஆராயுங்கள். மின் ஓட்டத்தைப் பின்பற்றுங்கள். தன்னியக்கத்தைப் புரிந்து கொள்ளுங்கள்.",
    "HI": "उपकरणों का अन्वेषण करें। बिजली प्रवाह का अनुसरण करें। ऑटोमेशन को समझें।",
    "PT": "Explore os equipamentos. Siga o fluxo de potência. Entenda a automação.",
    "KO": "장비를 탐색하고 전력 흐름을 따라가며 자동화를 이해하세요.",
    "FR": "Explorez les équipements. Suivez le flux de puissance. Comprenez l'automatisation.",
    "JA": "機器を探索し、電力潮流を追い、オートメーションを理解しましょう。"
  },
  "Open SLD": {
    "EN": "Open SLD",
    "TE": "SLD తెరవండి",
    "TA": "SLD திறக்கவும்",
    "HI": "SLD खोलें",
    "PT": "Abrir SLD",
    "KO": "SLD 열기",
    "FR": "Ouvrir le SLD",
    "JA": "SLD を開く"
  },
  "▷ Guided Practice": {
    "EN": "▷ Guided Practice",
    "TE": "▷ గైడెడ్ ప్రాక్టీస్",
    "TA": "▷ வழிகாட்டப்பட்ட பயிற்சி",
    "HI": "▷ निर्देशित अभ्यास",
    "PT": "▷ Prática guiada",
    "KO": "▷ 가이드 실습",
    "FR": "▷ Pratique guidée",
    "JA": "▷ ガイド付き実習"
  },
  "Station Import Load": {
    "EN": "Station Import Load",
    "TE": "స్టేషన్ దిగుమతి లోడ్",
    "TA": "நிலைய இறக்குமதி சுமை",
    "HI": "स्टेशन आयात भार",
    "PT": "Carga de importação da subestação",
    "KO": "변전소 수전 부하",
    "FR": "Charge d'importation du poste",
    "JA": "変電所受電負荷"
  },
  "Energized Bays": {
    "EN": "Energized Bays",
    "TE": "ఎనర్జైజ్డ్ బేలు",
    "TA": "மின்னேற்றப்பட்ட பேக்கள்",
    "HI": "ऊर्जावान बे (Energized Bays)",
    "PT": "Vãos energizados",
    "KO": "가압된 베이 (Energized Bays)",
    "FR": "Travées sous tension",
    "JA": "充電中ベイ"
  },
  "Live simulation status": {
    "EN": "Live simulation status",
    "TE": "లైవ్ సిమ్యులేషన్ స్థితి",
    "TA": "நேரடி உருவகப்படுத்தல் நிலை",
    "HI": "लाइव सिमुलेशन स्थिति",
    "PT": "Status da simulação ao vivo",
    "KO": "실시간 시뮬레이션 상태",
    "FR": "État de la simulation en direct",
    "JA": "ライブシミュレーション状態"
  },
  "Transformers T1 & T2": {
    "EN": "Transformers T1 & T2",
    "TE": "ట్రాన్స్‌ఫార్మర్లు T1 & T2",
    "TA": "மின்மாற்றிகள் T1 & T2",
    "HI": "ट्रांसफॉर्मर T1 और T2",
    "PT": "Transformadores T1 & T2",
    "KO": "변압기 T1 & T2",
    "FR": "Transformateurs T1 & T2",
    "JA": "変圧器 T1 & T2"
  },
  "Configured devices": {
    "EN": "Configured devices",
    "TE": "కాన్ఫిగర్ చేసిన పరికరాలు",
    "TA": "கட்டமைக்கப்பட்ட சாதனங்கள்",
    "HI": "कॉन्फ़िगर किए गए उपकरण",
    "PT": "Dispositivos configurados",
    "KO": "구성된 장치",
    "FR": "Équipements configurés",
    "JA": "構成済みデバイス"
  },
  "Active Alarms": {
    "EN": "Active Alarms",
    "TE": "యాక్టివ్ అలారాలు",
    "TA": "செயலில் உள்ள அலாரங்கள்",
    "HI": "सक्रिय अलार्म",
    "PT": "Alarmes ativos",
    "KO": "활성 알람",
    "FR": "Alarmes actives",
    "JA": "アクティブアラーム"
  },
  "System Healthy": {
    "EN": "System Healthy",
    "TE": "సిస్టమ్ సాధారణం (Healthy)",
    "TA": "கணினி இயல்பானது (Healthy)",
    "HI": "सिस्टम स्वस्थ (Healthy)",
    "PT": "Sistema íntegro (Healthy)",
    "KO": "시스템 정상 (Healthy)",
    "FR": "Système sain (Healthy)",
    "JA": "システム正常 (Healthy)"
  },
  "Review active alarms": {
    "EN": "Review active alarms",
    "TE": "యాక్టివ్ అలారాలను సమీక్షించండి",
    "TA": "செயலில் உள்ள அலாரங்களைப் பார்க்கவும்",
    "HI": "सक्रिय अलार्म की समीक्षा करें",
    "PT": "Revisar alarmes ativos",
    "KO": "활성 알람 검토",
    "FR": "Examiner les alarmes actives",
    "JA": "アクティブアラームを確認"
  },
  "Demo: Trip Feeder 03 Cascade": {
    "EN": "Demo: Trip Feeder 03 Cascade",
    "TE": "డెమో: ఫీడర్ 03 కాస్కేడ్ ట్రిప్",
    "TA": "டெமோ: ஃபீடர் 03 கேஸ்கேட் டிரிப்",
    "HI": "डेमो: फीडर 03 कैस्केड ट्रिप",
    "PT": "Demo: Disparo em cascata do Alimentador 03",
    "KO": "데모: 피더 03 캐스케이드 트립",
    "FR": "Démo : Déclenchement en cascade départ 03",
    "JA": "デモ: フィーダ03 カスケードトリップ"
  },
  "Communication Protocol Overview — 132/33/11 kV Multi-Protocol SAS Architecture": {
    "EN": "Communication Protocol Overview — 132/33/11 kV Multi-Protocol SAS Architecture",
    "TE": "కమ్యూనికేషన్ ప్రోటోకాల్ అవలోకనం — 132/33/11 kV మల్టీ-ప్రోటోకాల్ SAS ఆర్కిటెక్చర్",
    "TA": "தொடர்பு நெறிமுறை கண்ணோட்டம் — 132/33/11 kV பல-நெறிமுறை SAS கட்டமைப்பு",
    "HI": "संचार प्रोटोकॉल अवलोकन — 132/33/11 kV मल्टी-प्रोटोकॉल SAS आर्किटेक्चर",
    "PT": "Visão Geral dos Protocolos de Comunicação — Arquitetura SAS Multiprotocolo 132/33/11 kV",
    "KO": "통신 프로토콜 개요 — 132/33/11 kV 다중 프로토콜 SAS 아키텍처",
    "FR": "Aperçu des protocoles de communication — Architecture SAS multiprotocole 132/33/11 kV",
    "JA": "通信プロトコル概要 — 132/33/11 kV マルチプロトコル SAS アーキテクチャ"
  },
  "Live status across all six station, bay, metering, telecontrol, historian, and time-synchronization protocols. Click any card to open its dedicated communication workspace.": {
    "EN": "Live status across all six station, bay, metering, telecontrol, historian, and time-synchronization protocols. Click any card to open its dedicated communication workspace.",
    "TE": "మొత్తం ఆరు స్టేషన్, బే, మీటరింగ్, టెలికంట్రోల్, హిస్టోరియన్ మరియు టైమ్-సింక్ ప్రోటోకాల్స్ యొక్క లైవ్ స్థితి. ఏదైనా కార్డుపై క్లిక్ చేసి ఆ ల్యాబ్‌ను తెరవండి.",
    "TA": "ஆறு நிலையம், பே, அளவீடு, தொலைக்கட்டுப்பாடு மற்றும் நேர ஒத்திசைவு நெறிமுறைகளின் நேரடி நிலை. எந்த அட்டையையும் கிளிக் செய்து திறக்கவும்.",
    "HI": "सभी छह स्टेशन, बे, मीटरिंग, टेलीकंट्रोल, हिस्टोरियन और समय-सिंक्रनाइज़ेशन प्रोटोकॉल की लाइव स्थिति। किसी भी कार्ड पर क्लिक करें।",
    "PT": "Status ao vivo dos seis protocolos de estação, vão, medição, telecontrole, historiador e sincronismo de tempo. Clique em qualquer cartão.",
    "KO": "6개 스테이션, 베이, 계량, 원격제어, 히스토리언 및 시간 동기화 프로토콜의 실시간 상태입니다. 카드를 클릭하여 작업 공간을 여세요.",
    "FR": "État en direct des six protocoles de poste, travée, comptage, téléconduite, historien et synchronisation horaire. Cliquez sur une carte.",
    "JA": "ステーション、ベイ、計量、遠方監視制御、ヒストリアン、時刻同期の全6プロトコルのライブ状態。カードをクリックして専用ラボを開きます。"
  },
  "Endpoints": {
    "EN": "Endpoints",
    "TE": "ఎండ్‌పాయింట్లు",
    "TA": "முனைகள் (Endpoints)",
    "HI": "एंडपॉइंट्स",
    "PT": "Pontos de extremidade",
    "KO": "엔드포인트",
    "FR": "Points de terminaison",
    "JA": "エンドポイント"
  },
  "Active Signals": {
    "EN": "Active Signals",
    "TE": "యాక్టివ్ సిగ్నల్స్",
    "TA": "செயலில் உள்ள சிக்னல்கள்",
    "HI": "सक्रिय सिग्नल",
    "PT": "Sinais ativos",
    "KO": "활성 신호",
    "FR": "Signaux actifs",
    "JA": "アクティブ信号"
  },
  "Transport": {
    "EN": "Transport",
    "TE": "ట్రాన్స్‌పోర్ట్",
    "TA": "போக்குவரத்து",
    "HI": "ट्रांसपोर्ट",
    "PT": "Transporte",
    "KO": "전송 계층",
    "FR": "Couche Transport",
    "JA": "トランスポート"
  },
  "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.:": {
    "EN": "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.:",
    "TE": "మద్దతు ఉన్న అన్ని భాషలకు 100% ఆఫ్‌లైన్ అనువాదం అందుబాటులో ఉంది. సాంకేతిక పదాలు మరియు పరికర ఐడిలు మార్చబడవు.:",
    "TA": "ஆதரிக்கப்படும் அனைத்து மொழிகளுக்கும் 100% ஆஃப்லைன் மொழிபெயர்ப்பு உள்ளது. தொழில்நுட்பச் சொற்கள் மாற்றப்படாது.:",
    "HI": "समर्थित सभी भाषाओं के लिए 100% ऑफ़लाइन अनुवाद उपलब्ध है। तकनीकी शब्द अपरिवर्तित रहते हैं।:",
    "PT": "Traduções 100% offline disponíveis para todos os idiomas suportados. Termos técnicos permanecem inalterados.:",
    "KO": "지원되는 모든 언어에 대해 100% 오프라인 번역이 제공됩니다. 기술 용어와 장치 ID는 유지됩니다.:",
    "FR": "Traductions 100% hors ligne disponibles pour toutes les langues prises en charge. Les termes techniques restent inchangés.:",
    "JA": "サポートされている全言語で100%オフライン翻訳が利用可能です。技術用語や機器IDは変更されません。:"
  },
  "Interactive IPv4 CIDR / VLSM Subnet Calculator": {
    "EN": "Interactive IPv4 CIDR / VLSM Subnet Calculator",
    "TE": "ఇంటరాక్టివ్ IPv4 CIDR / VLSM సబ్‌నెట్ కాలిక్యులేటర్",
    "TA": "ஊடாடும் IPv4 CIDR / VLSM சப்நெட் கால்குலேட்டர்",
    "HI": "इंटरैक्टिव IPv4 CIDR / VLSM सबनेट कैलकुलेटर",
    "PT": "Calculadora de Sub-rede IPv4 CIDR / VLSM Interativa",
    "KO": "대화형 IPv4 CIDR / VLSM 서브넷 계산기",
    "FR": "Calculateur de sous-réseau IPv4 CIDR / VLSM interactif",
    "JA": "インタラクティブ IPv4 CIDR / VLSM サブネット計算機"
  },
  "Interactive IPv4 CIDR / VLSM Subnet Calculator:": {
    "EN": "Interactive IPv4 CIDR / VLSM Subnet Calculator:",
    "TE": "ఇంటరాక్టివ్ IPv4 CIDR / VLSM సబ్‌నెట్ కాలిక్యులేటర్:",
    "TA": "ஊடாடும் IPv4 CIDR / VLSM சப்நெட் கால்குலேட்டர்:",
    "HI": "इंटरैक्टिव IPv4 CIDR / VLSM सबनेट कैलकुलेटर:",
    "PT": "Calculadora de Sub-rede IPv4 CIDR / VLSM Interativa:",
    "KO": "대화형 IPv4 CIDR / VLSM 서브넷 계산기:",
    "FR": "Calculateur de sous-réseau IPv4 CIDR / VLSM interactif:",
    "JA": "インタラクティブ IPv4 CIDR / VLSM サブネット計算機:"
  },
  "Modbus TCP Client Polling Configuration": {
    "EN": "Modbus TCP Client Polling Configuration",
    "TE": "Modbus TCP క్లయింట్ పోలింగ్ కాన్ఫిగరేషన్",
    "TA": "Modbus TCP கிளையன்ட் போலிங் கட்டமைப்பு",
    "HI": "Modbus TCP क्लाइंट पोलिंग कॉन्फ़िगरेशन",
    "PT": "Configuração de Polling do Cliente Modbus TCP",
    "KO": "Modbus TCP 클라이언트 폴링 구성",
    "FR": "Configuration d'interrogation client Modbus TCP",
    "JA": "Modbus TCP クライアントポーリング設定"
  },
  "Modbus TCP Client Polling Configuration:": {
    "EN": "Modbus TCP Client Polling Configuration:",
    "TE": "Modbus TCP క్లయింట్ పోలింగ్ కాన్ఫిగరేషన్:",
    "TA": "Modbus TCP கிளையன்ட் போலிங் கட்டமைப்பு:",
    "HI": "Modbus TCP क्लाइंट पोलिंग कॉन्फ़िगरेशन:",
    "PT": "Configuração de Polling do Cliente Modbus TCP:",
    "KO": "Modbus TCP 클라이언트 폴링 구성:",
    "FR": "Configuration d'interrogation client Modbus TCP:",
    "JA": "Modbus TCP クライアントポーリング設定:"
  },
  "Backplane Module & Slot Configuration": {
    "EN": "Backplane Module & Slot Configuration",
    "TE": "బ్యాక్‌ప్లేన్ మాడ్యూల్ & స్లాట్ కాన్ఫిగరేషన్",
    "TA": "பேக்பிளேன் தொகுதி & ஸ்லாட் கட்டமைப்பு",
    "HI": "बैकप्लेन मॉड्यूल और स्लॉट कॉन्फ़िगरेशन",
    "PT": "Configuração de Módulo e Slot de Backplane",
    "KO": "백플레인 모듈 및 슬롯 구성",
    "FR": "Configuration des modules et emplacements de fond de panier",
    "JA": "バックプレーンモジュール＆スロット構成"
  },
  "Backplane Module & Slot Configuration:": {
    "EN": "Backplane Module & Slot Configuration:",
    "TE": "బ్యాక్‌ప్లేన్ మాడ్యూల్ & స్లాట్ కాన్ఫిగరేషన్:",
    "TA": "பேக்பிளேன் தொகுதி & ஸ்லாட் கட்டமைப்பு:",
    "HI": "बैकप्लेन मॉड्यूल और स्लॉट कॉन्फ़िगरेशन:",
    "PT": "Configuração de Módulo e Slot de Backplane:",
    "KO": "백플레인 모듈 및 슬롯 구성:",
    "FR": "Configuration des modules et emplacements de fond de panier:",
    "JA": "バックプレーンモジュール＆スロット構成:"
  },
  "VLAN 20 — GOOSE Multicast (0x88B8)": {
    "EN": "VLAN 20 — GOOSE Multicast (0x88B8)",
    "TE": "VLAN 20 — GOOSE మల్టీకాస్ట్ (0x88B8)",
    "TA": "VLAN 20 — GOOSE மல்டிகாஸ்ட் (0x88B8)",
    "HI": "VLAN 20 — GOOSE मल्टीकास्ट (0x88B8)",
    "PT": "VLAN 20 — Multodifusão GOOSE (0x88B8)",
    "KO": "VLAN 20 — GOOSE 멀티캐스트 (0x88B8)",
    "FR": "VLAN 20 — Multidiffusion GOOSE (0x88B8)",
    "JA": "VLAN 20 — GOOSE マルチキャスト (0x88B8)"
  },
  "VLAN 20 — GOOSE Multicast (0x88B8):": {
    "EN": "VLAN 20 — GOOSE Multicast (0x88B8):",
    "TE": "VLAN 20 — GOOSE మల్టీకాస్ట్ (0x88B8):",
    "TA": "VLAN 20 — GOOSE மல்டிகாஸ்ட் (0x88B8):",
    "HI": "VLAN 20 — GOOSE मल्टीकास्ट (0x88B8):",
    "PT": "VLAN 20 — Multodifusão GOOSE (0x88B8):",
    "KO": "VLAN 20 — GOOSE 멀티캐스트 (0x88B8):",
    "FR": "VLAN 20 — Multidiffusion GOOSE (0x88B8):",
    "JA": "VLAN 20 — GOOSE マルチキャスト (0x88B8):"
  },
  "Interactive Packet Flow Animator": {
    "EN": "Interactive Packet Flow Animator",
    "TE": "ఇంటరాక్టివ్ ప్యాకెట్ ఫ్లో యానిమేటర్",
    "TA": "ஊடாடும் பாக்கெட் ஓட்ட அனிமேட்டர்",
    "HI": "इंटरैक्टिव पैकेट प्रवाह एनिमेटर",
    "PT": "Animador Interativo de Fluxo de Pacotes",
    "KO": "대화형 패킷 흐름 애니메이터",
    "FR": "Animateur Interactif de Flux de Paquets",
    "JA": "インタラクティブ・パケットフロー・アニメーター"
  },
  "Interactive Packet Flow Animator:": {
    "EN": "Interactive Packet Flow Animator:",
    "TE": "ఇంటరాక్టివ్ ప్యాకెట్ ఫ్లో యానిమేటర్:",
    "TA": "ஊடாடும் பாக்கெட் ஓட்ட அனிமேட்டர்:",
    "HI": "इंटरैक्टिव पैकेट प्रवाह एनिमेटर:",
    "PT": "Animador Interativo de Fluxo de Pacotes:",
    "KO": "대화형 패킷 흐름 애니메이터:",
    "FR": "Animateur Interactif de Flux de Paquets:",
    "JA": "インタラクティブ・パケットフロー・アニメーター:"
  },
  "Interactive Single-Line Diagram": {
    "EN": "Interactive Single-Line Diagram",
    "TE": "ఇంటరాక్టివ్ సింగిల్-లైన్ డయాగ్రమ్ (SLD)",
    "TA": "ஊடாடும் ஒற்றை வரி வரைபடம் (SLD)",
    "HI": "इंटरैक्टिव सिंगल-लाइन आरेख (SLD)",
    "PT": "Diagrama Unifilar Interativo (SLD)",
    "KO": "대화형 단선 결선도 (SLD)",
    "FR": "Schéma Unifilaire Interactif (SLD)",
    "JA": "インタラクティブ単線結線図 (SLD)"
  },
  "Interactive Single-Line Diagram:": {
    "EN": "Interactive Single-Line Diagram:",
    "TE": "ఇంటరాక్టివ్ సింగిల్-లైన్ డయాగ్రమ్ (SLD):",
    "TA": "ஊடாடும் ஒற்றை வரி வரைபடம் (SLD):",
    "HI": "इंटरैक्टिव सिंगल-लाइन आरेख (SLD):",
    "PT": "Diagrama Unifilar Interativo (SLD):",
    "KO": "대화형 단선 결선도 (SLD):",
    "FR": "Schéma Unifilaire Interactif (SLD):",
    "JA": "インタラクティブ単線結線図 (SLD):"
  },
  "Northbound Telecontrol to RCC": {
    "EN": "Northbound Telecontrol to RCC",
    "TE": "RCC కు నార్త్‌బౌండ్ టెలికంట్రోల్",
    "TA": "RCC க்கு வடக்கு நோக்கிய தொலைக்கட்டுப்பாடு",
    "HI": "RCC के लिए नॉर्थबाउंड टेलीकंट्रोल",
    "PT": "Telecontrole Northbound para o RCC",
    "KO": "RCC 상위 원격제어 (Northbound)",
    "FR": "Téléconduite amont vers le RCC",
    "JA": "RCC向け上位遠方監視制御"
  },
  "Northbound Telecontrol to RCC:": {
    "EN": "Northbound Telecontrol to RCC:",
    "TE": "RCC కు నార్త్‌బౌండ్ టెలికంట్రోల్:",
    "TA": "RCC க்கு வடக்கு நோக்கிய தொலைக்கட்டுப்பாடு:",
    "HI": "RCC के लिए नॉर्थबाउंड टेलीकंट्रोल:",
    "PT": "Telecontrole Northbound para o RCC:",
    "KO": "RCC 상위 원격제어 (Northbound):",
    "FR": "Téléconduite amont vers le RCC:",
    "JA": "RCC向け上位遠方監視制御:"
  },
  "No IEDs match these filters.": {
    "EN": "No IEDs match these filters.",
    "TE": "ఈ ఫిల్టర్లకు సరిపోయే IEDలు ఏవీ లేవు.",
    "TA": "இந்த வடிகட்டிகளுக்குப் பொருந்தும் IEDகள் எதுவும் இல்லை.",
    "HI": "इन फ़िल्टरों से कोई IED मेल नहीं खाता।",
    "PT": "Nenhum IED corresponde a estes filtros.",
    "KO": "이 필터와 일치하는 IED가 없습니다.",
    "FR": "Aucun IED ne correspond à ces filtres.",
    "JA": "これらのフィルタに一致するIEDはありません。"
  },
  "No IEDs match these filters.:": {
    "EN": "No IEDs match these filters.:",
    "TE": "ఈ ఫిల్టర్లకు సరిపోయే IEDలు ఏవీ లేవు.:",
    "TA": "இந்த வடிகட்டிகளுக்குப் பொருந்தும் IEDகள் எதுவும் இல்லை.:",
    "HI": "इन फ़िल्टरों से कोई IED मेल नहीं खाता।:",
    "PT": "Nenhum IED corresponde a estes filtros.:",
    "KO": "이 필터와 일치하는 IED가 없습니다.:",
    "FR": "Aucun IED ne correspond à ces filtres.:",
    "JA": "これらのフィルタに一致するIEDはありません。:"
  },
  "EXPECTED ACCEPTANCE CRITERIA": {
    "EN": "EXPECTED ACCEPTANCE CRITERIA",
    "TE": "ఆశించిన అంగీకార ప్రమాణాలు (Acceptance Criteria)",
    "TA": "எதிர்பார்க்கப்படும் ஏற்பு வரம்புகள்",
    "HI": "अपेक्षित स्वीकृति मानदंड",
    "PT": "CRITÉRIOS DE ACEITAÇÃO ESPERADOS",
    "KO": "예상 합격 기준 (Acceptance Criteria)",
    "FR": "CRITÈRES D'ACCEPTATION ATTENDUS",
    "JA": "期待される合格判定基準"
  },
  "EXPECTED ACCEPTANCE CRITERIA:": {
    "EN": "EXPECTED ACCEPTANCE CRITERIA:",
    "TE": "ఆశించిన అంగీకార ప్రమాణాలు (Acceptance Criteria):",
    "TA": "எதிர்பார்க்கப்படும் ஏற்பு வரம்புகள்:",
    "HI": "अपेक्षित स्वीकृति मानदंड:",
    "PT": "CRITÉRIOS DE ACEITAÇÃO ESPERADOS:",
    "KO": "예상 합격 기준 (Acceptance Criteria):",
    "FR": "CRITÈRES D'ACCEPTATION ATTENDUS:",
    "JA": "期待される合格判定基準:"
  },
  "Gateway translates MMS → IOA": {
    "EN": "Gateway translates MMS → IOA",
    "TE": "గేట్‌వే MMS → IOA అనువదిస్తుంది",
    "TA": "கேட்வே MMS → IOA மாற்றுகிறது",
    "HI": "गेटवे MMS → IOA अनुवाद करता है",
    "PT": "Gateway converte MMS → IOA",
    "KO": "게이트웨이가 MMS → IOA 변환",
    "FR": "La passerelle traduit MMS → IOA",
    "JA": "ゲートウェイが MMS → IOA 変換"
  },
  "Gateway translates MMS → IOA:": {
    "EN": "Gateway translates MMS → IOA:",
    "TE": "గేట్‌వే MMS → IOA అనువదిస్తుంది:",
    "TA": "கேட்வே MMS → IOA மாற்றுகிறது:",
    "HI": "गेटवे MMS → IOA अनुवाद करता है:",
    "PT": "Gateway converte MMS → IOA:",
    "KO": "게이트웨이가 MMS → IOA 변환:",
    "FR": "La passerelle traduit MMS → IOA:",
    "JA": "ゲートウェイが MMS → IOA 変換:"
  },
  "Self-Supervision & Watchdog": {
    "EN": "Self-Supervision & Watchdog",
    "TE": "సెల్ఫ్-సూపర్‌విజన్ & వాచ్‌డాగ్",
    "TA": "சுய-கண்காணிப்பு & வாட்ச்டாக்",
    "HI": "स्व-निगरानी और वॉचडॉग",
    "PT": "Autovigilância e Watchdog",
    "KO": "자체 감시 및 워치독",
    "FR": "Auto-surveillance et chien de garde",
    "JA": "自己監視＆ウォッチドッグ"
  },
  "Self-Supervision & Watchdog:": {
    "EN": "Self-Supervision & Watchdog:",
    "TE": "సెల్ఫ్-సూపర్‌విజన్ & వాచ్‌డాగ్:",
    "TA": "சுய-கண்காணிப்பு & வாட்ச்டாக்:",
    "HI": "स्व-निगरानी और वॉचडॉग:",
    "PT": "Autovigilância e Watchdog:",
    "KO": "자체 감시 및 워치독:",
    "FR": "Auto-surveillance et chien de garde:",
    "JA": "自己監視＆ウォッチドッグ:"
  },
  "Standard Ports & EtherTypes": {
    "EN": "Standard Ports & EtherTypes",
    "TE": "ప్రామాణిక పోర్టులు & EtherTypes",
    "TA": "நிலையான போர்ட்கள் & EtherTypes",
    "HI": "मानक पोर्ट और EtherTypes",
    "PT": "Portas Padrão e EtherTypes",
    "KO": "표준 포트 및 EtherTypes",
    "FR": "Ports standards et EtherTypes",
    "JA": "標準ポート＆EtherType一覧"
  },
  "Standard Ports & EtherTypes:": {
    "EN": "Standard Ports & EtherTypes:",
    "TE": "ప్రామాణిక పోర్టులు & EtherTypes:",
    "TA": "நிலையான போர்ட்கள் & EtherTypes:",
    "HI": "मानक पोर्ट और EtherTypes:",
    "PT": "Portas Padrão e EtherTypes:",
    "KO": "표준 포트 및 EtherTypes:",
    "FR": "Ports standards et EtherTypes:",
    "JA": "標準ポート＆EtherType一覧:"
  },
  "Factory Acceptance Testing": {
    "EN": "Factory Acceptance Testing",
    "TE": "ఫ్యాక్టరీ యాక్సెప్టెన్స్ టెస్టింగ్ (FAT)",
    "TA": "தொழிற்சாலை ஏற்பு சோதனை (FAT)",
    "HI": "फैक्ट्री स्वीकृति परीक्षण (FAT)",
    "PT": "Teste de Aceitação em Fábrica (FAT)",
    "KO": "공장 인수 시험 (FAT)",
    "FR": "Essais de Réception en Usine (FAT)",
    "JA": "工場立会試験 (FAT)"
  },
  "Factory Acceptance Testing:": {
    "EN": "Factory Acceptance Testing:",
    "TE": "ఫ్యాక్టరీ యాక్సెప్టెన్స్ టెస్టింగ్ (FAT):",
    "TA": "தொழிற்சாலை ஏற்பு சோதனை (FAT):",
    "HI": "फैक्ट्री स्वीकृति परीक्षण (FAT):",
    "PT": "Teste de Aceitação em Fábrica (FAT):",
    "KO": "공장 인수 시험 (FAT):",
    "FR": "Essais de Réception en Usine (FAT):",
    "JA": "工場立会試験 (FAT):"
  },
  "Industrial Ethernet Switch": {
    "EN": "Industrial Ethernet Switch",
    "TE": "ఇండస్ట్రియల్ ఈథర్నెట్ స్విచ్",
    "TA": "தொழில்துறை ஈதர்நெட் சுவிட்ச்",
    "HI": "औद्योगिक ईथरनेट स्विच",
    "PT": "Switch Ethernet Industrial",
    "KO": "산업용 이더넷 스위치",
    "FR": "Commutateur Ethernet industriel",
    "JA": "産業用イーサネットスイッチ"
  },
  "Industrial Ethernet Switch:": {
    "EN": "Industrial Ethernet Switch:",
    "TE": "ఇండస్ట్రియల్ ఈథర్నెట్ స్విచ్:",
    "TA": "தொழில்துறை ஈதர்நெட் சுவிட்ச்:",
    "HI": "औद्योगिक ईथरनेट स्विच:",
    "PT": "Switch Ethernet Industrial:",
    "KO": "산업용 이더넷 스위치:",
    "FR": "Commutateur Ethernet industriel:",
    "JA": "産業用イーサネットスイッチ:"
  },
  "Fault Injection Scenarios": {
    "EN": "Fault Injection Scenarios",
    "TE": "ఫాల్ట్ ఇంజెక్షన్ సినారియోలు",
    "TA": "பிழை செலுத்துதல் காட்சிகள்",
    "HI": "फॉल्ट इंजेक्शन परिदृश्य",
    "PT": "Cenários de Injeção de Falhas",
    "KO": "고장 주입 시나리오",
    "FR": "Scénarios d'Injection de Défauts",
    "JA": "故障注入シナリオ"
  },
  "Fault Injection Scenarios:": {
    "EN": "Fault Injection Scenarios:",
    "TE": "ఫాల్ట్ ఇంజెక్షన్ సినారియోలు:",
    "TA": "பிழை செலுத்துதல் காட்சிகள்:",
    "HI": "फॉल्ट इंजेक्शन परिदृश्य:",
    "PT": "Cenários de Injeção de Falhas:",
    "KO": "고장 주입 시나리오:",
    "FR": "Scénarios d'Injection de Défauts:",
    "JA": "故障注入シナリオ:"
  },
  "30 IEC • 20 Int • 30 CCNA": {
    "EN": "30 IEC • 20 Int • 30 CCNA",
    "TE": "30 IEC • 20 ఇంటర్వ్యూ • 30 CCNA",
    "TA": "30 IEC • 20 நேர்காணல் • 30 CCNA",
    "HI": "30 IEC • 20 साक्षात्कार • 30 CCNA",
    "PT": "30 IEC • 20 Entrevistas • 30 CCNA",
    "KO": "30 IEC • 20 면접 • 30 CCNA",
    "FR": "30 IEC • 20 Entretiens • 30 CCNA",
    "JA": "30 IEC • 20 面接 • 30 CCNA"
  },
  "30 IEC • 20 Int • 30 CCNA:": {
    "EN": "30 IEC • 20 Int • 30 CCNA:",
    "TE": "30 IEC • 20 ఇంటర్వ్యూ • 30 CCNA:",
    "TA": "30 IEC • 20 நேர்காணல் • 30 CCNA:",
    "HI": "30 IEC • 20 साक्षात्कार • 30 CCNA:",
    "PT": "30 IEC • 20 Entrevistas • 30 CCNA:",
    "KO": "30 IEC • 20 면접 • 30 CCNA:",
    "FR": "30 IEC • 20 Entretiens • 30 CCNA:",
    "JA": "30 IEC • 20 面接 • 30 CCNA:"
  },
  "StatusCode: Good (0x0000)": {
    "EN": "StatusCode: Good (0x0000)",
    "TE": "స్థితి కోడ్: సాధారణం (0x0000)",
    "TA": "நிலை குறியீடு: நன்று (0x0000)",
    "HI": "स्थिति कोड: अच्छा (0x0000)",
    "PT": "StatusCode: Bom (0x0000)",
    "KO": "상태 코드: 정상 (0x0000)",
    "FR": "StatusCode : Bon (0x0000)",
    "JA": "ステータスコード: 正常 (0x0000)"
  },
  "StatusCode: Good (0x0000):": {
    "EN": "StatusCode: Good (0x0000):",
    "TE": "స్థితి కోడ్: సాధారణం (0x0000):",
    "TA": "நிலை குறியீடு: நன்று (0x0000):",
    "HI": "स्थिति कोड: अच्छा (0x0000):",
    "PT": "StatusCode: Bom (0x0000):",
    "KO": "상태 코드: 정상 (0x0000):",
    "FR": "StatusCode : Bon (0x0000):",
    "JA": "ステータスコード: 正常 (0x0000):"
  },
  "Start Test & Capture SOE": {
    "EN": "Start Test & Capture SOE",
    "TE": "టెస్ట్ ప్రారంభించి SOE క్యాప్చర్ చేయండి",
    "TA": "சோதனையைத் தொடங்கி SOE பதிவு செய்",
    "HI": "परीक्षण शुरू करें और SOE कैप्चर करें",
    "PT": "Iniciar Teste e Capturar SOE",
    "KO": "테스트 시작 및 SOE 캡처",
    "FR": "Démarrer l'essai et capturer SOE",
    "JA": "テスト開始＆SOE記録"
  },
  "Start Test & Capture SOE:": {
    "EN": "Start Test & Capture SOE:",
    "TE": "టెస్ట్ ప్రారంభించి SOE క్యాప్చర్ చేయండి:",
    "TA": "சோதனையைத் தொடங்கி SOE பதிவு செய்:",
    "HI": "परीक्षण शुरू करें और SOE कैप्चर करें:",
    "PT": "Iniciar Teste e Capturar SOE:",
    "KO": "테스트 시작 및 SOE 캡처:",
    "FR": "Démarrer l'essai et capturer SOE:",
    "JA": "テスト開始＆SOE記録:"
  },
  "Site Acceptance Testing": {
    "EN": "Site Acceptance Testing",
    "TE": "సైట్ యాక్సెప్టెన్స్ టెస్టింగ్ (SAT)",
    "TA": "தள ஏற்பு சோதனை (SAT)",
    "HI": "साइट स्वीकृति परीक्षण (SAT)",
    "PT": "Teste de Aceitação em Campo (SAT)",
    "KO": "현장 인수 시험 (SAT)",
    "FR": "Essais de Réception sur Site (SAT)",
    "JA": "現地立会試験 (SAT)"
  },
  "Site Acceptance Testing:": {
    "EN": "Site Acceptance Testing:",
    "TE": "సైట్ యాక్సెప్టెన్స్ టెస్టింగ్ (SAT):",
    "TA": "தள ஏற்பு சோதனை (SAT):",
    "HI": "साइट स्वीकृति परीक्षण (SAT):",
    "PT": "Teste de Aceitação em Campo (SAT):",
    "KO": "현장 인수 시험 (SAT):",
    "FR": "Essais de Réception sur Site (SAT):",
    "JA": "現地立会試験 (SAT):"
  },
  "State Change Simulation": {
    "EN": "State Change Simulation",
    "TE": "స్టేట్ చేంజ్ సిమ్యులేషన్",
    "TA": "நிலை மாற்ற உருவகப்படுத்தல்",
    "HI": "स्थिति परिवर्तन सिमुलेशन",
    "PT": "Simulação de Mudança de Estado",
    "KO": "상태 변경 시뮬레이션",
    "FR": "Simulation de Changement d'État",
    "JA": "状態変化シミュレーション"
  },
  "State Change Simulation:": {
    "EN": "State Change Simulation:",
    "TE": "స్టేట్ చేంజ్ సిమ్యులేషన్:",
    "TA": "நிலை மாற்ற உருவகப்படுத்தல்:",
    "HI": "स्थिति परिवर्तन सिमुलेशन:",
    "PT": "Simulação de Mudança de Estado:",
    "KO": "상태 변경 시뮬레이션:",
    "FR": "Simulation de Changement d'État:",
    "JA": "状態変化シミュレーション:"
  },
  "MMXU1 (TotW / PPV / A):": {
    "EN": "MMXU1 (TotW / PPV / A):",
    "TE": "MMXU1 (TotW / PPV / A కొలతలు):",
    "TA": "MMXU1 (TotW / PPV / A அளவீடு):",
    "HI": "MMXU1 (TotW / PPV / A माप):",
    "PT": "MMXU1 (Medições TotW / PPV / A):",
    "KO": "MMXU1 (TotW / PPV / A 계측):",
    "FR": "MMXU1 (Mesures TotW / PPV / A) :",
    "JA": "MMXU1 (TotW / PPV / A 計測):"
  },
  "Key Takeaways & Checks": {
    "EN": "Key Takeaways & Checks",
    "TE": "ముఖ్య అంశాలు & తనిఖీలు",
    "TA": "முக்கிய குறிப்புகள் & சரிபார்ப்புகள்",
    "HI": "मुख्य बिंदु और जाँच",
    "PT": "Pontos Principais e Verificações",
    "KO": "핵심 요약 및 점검 사항",
    "FR": "Points clés et vérifications",
    "JA": "重要ポイントと確認事項"
  },
  "Key Takeaways & Checks:": {
    "EN": "Key Takeaways & Checks:",
    "TE": "ముఖ్య అంశాలు & తనిఖీలు:",
    "TA": "முக்கிய குறிப்புகள் & சரிபார்ப்புகள்:",
    "HI": "मुख्य बिंदु और जाँच:",
    "PT": "Pontos Principais e Verificações:",
    "KO": "핵심 요약 및 점검 사항:",
    "FR": "Points clés et vérifications:",
    "JA": "重要ポイントと確認事項:"
  },
  "Electrical Connections": {
    "EN": "Electrical Connections",
    "TE": "ఎలక్ట్రికల్ కనెక్షన్లు",
    "TA": "மின் இணைப்புகள்",
    "HI": "विद्युत कनेक्शन",
    "PT": "Conexões Elétricas",
    "KO": "전기 연결",
    "FR": "Connexions électriques",
    "JA": "電気接続"
  },
  "Electrical Connections:": {
    "EN": "Electrical Connections:",
    "TE": "ఎలక్ట్రికల్ కనెక్షన్లు:",
    "TA": "மின் இணைப்புகள்:",
    "HI": "विद्युत कनेक्शन:",
    "PT": "Conexões Elétricas:",
    "KO": "전기 연결:",
    "FR": "Connexions électriques:",
    "JA": "電気接続:"
  },
  "out-of-band management": {
    "EN": "out-of-band management",
    "TE": "అవుట్-ఆఫ్-బ్యాండ్ మేనేజ్‌మెంట్",
    "TA": "அவுட்-ஆஃப்-பேண்ட் மேலாண்மை",
    "HI": "आउट-ऑफ-बैंड प्रबंधन",
    "PT": "gerenciamento fora de banda",
    "KO": "대역 외 관리",
    "FR": "gestion hors bande",
    "JA": "帯域外管理"
  },
  "out-of-band management:": {
    "EN": "out-of-band management:",
    "TE": "అవుట్-ఆఫ్-బ్యాండ్ మేనేజ్‌మెంట్:",
    "TA": "அவுட்-ஆஃப்-பேண்ட் மேலாண்மை:",
    "HI": "आउट-ऑफ-बैंड प्रबंधन:",
    "PT": "gerenciamento fora de banda:",
    "KO": "대역 외 관리:",
    "FR": "gestion hors bande:",
    "JA": "帯域外管理:"
  },
  "Derived SCADA 52a/52b:": {
    "EN": "Derived SCADA 52a/52b:",
    "TE": "ఉత్పన్న SCADA 52a/52b:",
    "TA": "பெறப்பட்ட SCADA 52a/52b:",
    "HI": "व्युत्पन्न SCADA 52a/52b:",
    "PT": "SCADA Derivado 52a/52b:",
    "KO": "파생 SCADA 52a/52b:",
    "FR": "SCADA dérivé 52a/52b :",
    "JA": "派生 SCADA 52a/52b:"
  },
  "General Interrogation": {
    "EN": "General Interrogation",
    "TE": "జనరల్ ఇంటరాగేషన్ (GI)",
    "TA": "பொது வினவல் (GI)",
    "HI": "जनरल इंटरोगेशन (GI)",
    "PT": "Interrogação Geral (GI)",
    "KO": "전체 조회 (GI)",
    "FR": "Interrogation Générale (GI)",
    "JA": "一括照会・総召喚 (GI)"
  },
  "General Interrogation:": {
    "EN": "General Interrogation:",
    "TE": "జనరల్ ఇంటరాగేషన్ (GI):",
    "TA": "பொது வினவல் (GI):",
    "HI": "जनरल इंटरोगेशन (GI):",
    "PT": "Interrogação Geral (GI):",
    "KO": "전체 조회 (GI):",
    "FR": "Interrogation Générale (GI):",
    "JA": "一括照会・総召喚 (GI):"
  },
  "Highlight connections": {
    "EN": "Highlight connections",
    "TE": "కనెక్షన్లను హైలైట్ చేయండి",
    "TA": "இணைப்புகளை முன்னிலைப்படுத்து",
    "HI": "कनेक्शन हाइलाइट करें",
    "PT": "Destacar conexões",
    "KO": "연결 강조 표시",
    "FR": "Surligner les connexions",
    "JA": "接続をハイライト"
  },
  "Highlight connections:": {
    "EN": "Highlight connections:",
    "TE": "కనెక్షన్లను హైలైట్ చేయండి:",
    "TA": "இணைப்புகளை முன்னிலைப்படுத்து:",
    "HI": "कनेक्शन हाइलाइट करें:",
    "PT": "Destacar conexões:",
    "KO": "연결 강조 표시:",
    "FR": "Surligner les connexions:",
    "JA": "接続をハイライト:"
  },
  "Front South Elevation": {
    "EN": "Front South Elevation",
    "TE": "ఫ్రంట్ సౌత్ ఎలివేషన్ వ్యూ",
    "TA": "முன் தெற்கு உயரக் காட்சி",
    "HI": "फ्रंट साउथ एलिवेशन",
    "PT": "Elevação Frontal Sul",
    "KO": "전면 남측 입면도",
    "FR": "Élévation frontale sud",
    "JA": "正面南側立面図"
  },
  "Front South Elevation:": {
    "EN": "Front South Elevation:",
    "TE": "ఫ్రంట్ సౌత్ ఎలివేషన్ వ్యూ:",
    "TA": "முன் தெற்கு உயரக் காட்சி:",
    "HI": "फ्रंट साउथ एलिवेशन:",
    "PT": "Elevação Frontal Sul:",
    "KO": "전면 남측 입면도:",
    "FR": "Élévation frontale sud:",
    "JA": "正面南側立面図:"
  },
  "Parameter Description": {
    "EN": "Parameter Description",
    "TE": "పారామీటర్ వివరణ",
    "TA": "அளவுரு விளக்கம்",
    "HI": "पैरामीटर विवरण",
    "PT": "Descrição do Parâmetro",
    "KO": "매개변수 설명",
    "FR": "Description du paramètre",
    "JA": "パラメータ説明"
  },
  "Parameter Description:": {
    "EN": "Parameter Description:",
    "TE": "పారామీటర్ వివరణ:",
    "TA": "அளவுரு விளக்கம்:",
    "HI": "पैरामीटर विवरण:",
    "PT": "Descrição do Parâmetro:",
    "KO": "매개변수 설명:",
    "FR": "Description du paramètre:",
    "JA": "パラメータ説明:"
  },
  "Checkpoints / Remarks": {
    "EN": "Checkpoints / Remarks",
    "TE": "తనిఖీ పాయింట్లు / వ్యాఖ్యలు",
    "TA": "சரிபார்ப்புகள் / குறிப்புகள்",
    "HI": "जाँच बिंदु / टिप्पणियाँ",
    "PT": "Pontos de Verificação / Observações",
    "KO": "점검 항목 / 비고",
    "FR": "Points de contrôle / Remarques",
    "JA": "確認項目 / 備考"
  },
  "Checkpoints / Remarks:": {
    "EN": "Checkpoints / Remarks:",
    "TE": "తనిఖీ పాయింట్లు / వ్యాఖ్యలు:",
    "TA": "சரிபார்ப்புகள் / குறிப்புகள்:",
    "HI": "जाँच बिंदु / टिप्पणियाँ:",
    "PT": "Pontos de Verificação / Observações:",
    "KO": "점검 항목 / 비고:",
    "FR": "Points de contrôle / Remarques:",
    "JA": "確認項目 / 備考:"
  },
  "Gateway IEC 61850 Map": {
    "EN": "Gateway IEC 61850 Map",
    "TE": "గేట్‌వే IEC 61850 మ్యాప్",
    "TA": "கேட்வே IEC 61850 மேப்",
    "HI": "गेटवे IEC 61850 मैप",
    "PT": "Mapeamento IEC 61850 do Gateway",
    "KO": "게이트웨이 IEC 61850 맵",
    "FR": "Table IEC 61850 de la passerelle",
    "JA": "ゲートウェイ IEC 61850 マップ"
  },
  "Gateway IEC 61850 Map:": {
    "EN": "Gateway IEC 61850 Map:",
    "TE": "గేట్‌వే IEC 61850 మ్యాప్:",
    "TA": "கேட்வே IEC 61850 மேப்:",
    "HI": "गेटवे IEC 61850 मैप:",
    "PT": "Mapeamento IEC 61850 do Gateway:",
    "KO": "게이트웨이 IEC 61850 맵:",
    "FR": "Table IEC 61850 de la passerelle:",
    "JA": "ゲートウェイ IEC 61850 マップ:"
  },
  "Result & Diagnostics": {
    "EN": "Result & Diagnostics",
    "TE": "ఫలితం & డయాగ్నస్టిక్స్",
    "TA": "முடிவு & கண்டறிதல்",
    "HI": "परिणाम और निदान",
    "PT": "Resultado e Diagnóstico",
    "KO": "결과 및 진단",
    "FR": "Résultat et Diagnostics",
    "JA": "結果と診断"
  },
  "Result & Diagnostics:": {
    "EN": "Result & Diagnostics:",
    "TE": "ఫలితం & డయాగ్నస్టిక్స్:",
    "TA": "முடிவு & கண்டறிதல்:",
    "HI": "परिणाम और निदान:",
    "PT": "Resultado e Diagnóstico:",
    "KO": "결과 및 진단:",
    "FR": "Résultat et Diagnostics:",
    "JA": "結果と診断:"
  },
  "Terms and Conditions": {
    "EN": "Terms and Conditions",
    "TE": "నిబంధనలు మరియు షరతులు",
    "TA": "விதிமுறைகள் மற்றும் நிபந்தனைகள்",
    "HI": "नियम और शर्तें",
    "PT": "Termos e Condições",
    "KO": "이용 약관",
    "FR": "Conditions générales d'utilisation",
    "JA": "利用規約"
  },
  "Terms and Conditions:": {
    "EN": "Terms and Conditions:",
    "TE": "నిబంధనలు మరియు షరతులు:",
    "TA": "விதிமுறைகள் மற்றும் நிபந்தனைகள்:",
    "HI": "नियम और शर्तें:",
    "PT": "Termos e Condições:",
    "KO": "이용 약관:",
    "FR": "Conditions générales d'utilisation:",
    "JA": "利用規約:"
  },
  "Single-Line Diagram": {
    "EN": "Single-Line Diagram",
    "TE": "సింగిల్-లైన్ డయాగ్రమ్ (SLD)",
    "TA": "ஒற்றை வரி வரைபடம் (SLD)",
    "HI": "सिंगल-लाइन आरेख (SLD)",
    "PT": "Diagrama Unifilar (SLD)",
    "KO": "단선 결선도 (SLD)",
    "FR": "Schéma Unifilaire (SLD)",
    "JA": "単線結線図 (SLD)"
  },
  "Single-Line Diagram:": {
    "EN": "Single-Line Diagram:",
    "TE": "సింగిల్-లైన్ డయాగ్రమ్ (SLD):",
    "TA": "ஒற்றை வரி வரைபடம் (SLD):",
    "HI": "सिंगल-लाइन आरेख (SLD):",
    "PT": "Diagrama Unifilar (SLD):",
    "KO": "단선 결선도 (SLD):",
    "FR": "Schéma Unifilaire (SLD):",
    "JA": "単線結線図 (SLD):"
  },
  "Communication Block": {
    "EN": "Communication Block",
    "TE": "కమ్యూనికేషన్ బ్లాక్",
    "TA": "தொடர்பு தடை",
    "HI": "संचार अवरोध",
    "PT": "Bloqueio de Comunicação",
    "KO": "통신 차단",
    "FR": "Blocage de communication",
    "JA": "通信ブロック"
  },
  "Communication Block:": {
    "EN": "Communication Block:",
    "TE": "కమ్యూనికేషన్ బ్లాక్:",
    "TA": "தொடர்பு தடை:",
    "HI": "संचार अवरोध:",
    "PT": "Bloqueio de Comunicação:",
    "KO": "통신 차단:",
    "FR": "Blocage de communication:",
    "JA": "通信ブロック:"
  },
  "Root Cause Analysis": {
    "EN": "Root Cause Analysis",
    "TE": "మూల కారణ విశ్లేషణ",
    "TA": "மூல காரண பகுப்பாய்வு",
    "HI": "मूल कारण विश्लेषण",
    "PT": "Análise de Causa Raiz",
    "KO": "근본 원인 분석",
    "FR": "Analyse de cause racine",
    "JA": "根本原因分析"
  },
  "Root Cause Analysis:": {
    "EN": "Root Cause Analysis:",
    "TE": "మూల కారణ విశ్లేషణ:",
    "TA": "மூல காரண பகுப்பாய்வு:",
    "HI": "मूल कारण विश्लेषण:",
    "PT": "Análise de Causa Raiz:",
    "KO": "근본 원인 분석:",
    "FR": "Analyse de cause racine:",
    "JA": "根本原因分析:"
  },
  "Distance Protection": {
    "EN": "Distance Protection",
    "TE": "డిస్టెన్స్ ప్రొటెక్షన్",
    "TA": "தூரப் பாதுகாப்பு",
    "HI": "डिस्टेंस प्रोटेक्शन",
    "PT": "Proteção de Distância",
    "KO": "거리 보호",
    "FR": "Protection de distance",
    "JA": "距離保護"
  },
  "Distance Protection:": {
    "EN": "Distance Protection:",
    "TE": "డిస్టెన్స్ ప్రొటెక్షన్:",
    "TA": "தூரப் பாதுகாப்பு:",
    "HI": "डिस्टेंस प्रोटेक्शन:",
    "PT": "Proteção de Distância:",
    "KO": "거리 보호:",
    "FR": "Protection de distance:",
    "JA": "距離保護:"
  },
  "Industrial Ethernet": {
    "EN": "Industrial Ethernet",
    "TE": "ఇండస్ట్రియల్ ఈథర్నెట్",
    "TA": "தொழில்துறை ஈதர்நெட்",
    "HI": "औद्योगिक ईथरनेट",
    "PT": "Ethernet Industrial",
    "KO": "산업용 이더넷",
    "FR": "Ethernet industriel",
    "JA": "産業用イーサネット"
  },
  "Industrial Ethernet:": {
    "EN": "Industrial Ethernet:",
    "TE": "ఇండస్ట్రియల్ ఈథర్నెట్:",
    "TA": "தொழில்துறை ஈதர்நெட்:",
    "HI": "औद्योगिक ईथरनेट:",
    "PT": "Ethernet Industrial:",
    "KO": "산업용 이더넷:",
    "FR": "Ethernet industriel:",
    "JA": "産業用イーサネット:"
  },
  "Communication Flow": {
    "EN": "Communication Flow",
    "TE": "కమ్యూనికేషన్ ప్రవాహం",
    "TA": "தொடர்பு ஓட்டம்",
    "HI": "संचार प्रवाह",
    "PT": "Fluxo de Comunicação",
    "KO": "통신 흐름",
    "FR": "Flux de Communication",
    "JA": "通信フロー"
  },
  "Communication Flow:": {
    "EN": "Communication Flow:",
    "TE": "కమ్యూనికేషన్ ప్రవాహం:",
    "TA": "தொடர்பு ஓட்டம்:",
    "HI": "संचार प्रवाह:",
    "PT": "Fluxo de Comunicação:",
    "KO": "통신 흐름:",
    "FR": "Flux de Communication:",
    "JA": "通信フロー:"
  },
  "Preferred Language": {
    "EN": "Preferred Language",
    "TE": "ప్రాధాన్య భాష",
    "TA": "விருப்ப மொழி",
    "HI": "पसंदीदा भाषा",
    "PT": "Idioma Preferido",
    "KO": "선호 언어",
    "FR": "Langue préférée",
    "JA": "優先言語"
  },
  "Preferred Language:": {
    "EN": "Preferred Language:",
    "TE": "ప్రాధాన్య భాష:",
    "TA": "விருப்ப மொழி:",
    "HI": "पसंदीदा भाषा:",
    "PT": "Idioma Preferido:",
    "KO": "선호 언어:",
    "FR": "Langue préférée:",
    "JA": "優先言語:"
  },
  "PBKDF2 Salted Auth": {
    "EN": "PBKDF2 Salted Auth",
    "TE": "PBKDF2 సాల్టెడ్ ధృవీకరణ",
    "TA": "PBKDF2 சால்டட் அங்கீகாரம்",
    "HI": "PBKDF2 साल्टेड प्रमाणीकरण",
    "PT": "Autenticação Salgada PBKDF2",
    "KO": "PBKDF2 솔트 인증",
    "FR": "Authentification salée PBKDF2",
    "JA": "PBKDF2 ソルト認証"
  },
  "PBKDF2 Salted Auth:": {
    "EN": "PBKDF2 Salted Auth:",
    "TE": "PBKDF2 సాల్టెడ్ ధృవీకరణ:",
    "TA": "PBKDF2 சால்டட் அங்கீகாரம்:",
    "HI": "PBKDF2 साल्टेड प्रमाणीकरण:",
    "PT": "Autenticação Salgada PBKDF2:",
    "KO": "PBKDF2 솔트 인증:",
    "FR": "Authentification salée PBKDF2:",
    "JA": "PBKDF2 ソルト認証:"
  },
  "Signal Description": {
    "EN": "Signal Description",
    "TE": "సిగ్నల్ వివరణ",
    "TA": "சிக்னல் விளக்கம்",
    "HI": "सिग्नल विवरण",
    "PT": "Descrição do Sinal",
    "KO": "신호 설명",
    "FR": "Description du signal",
    "JA": "信号説明"
  },
  "Signal Description:": {
    "EN": "Signal Description:",
    "TE": "సిగ్నల్ వివరణ:",
    "TA": "சிக்னல் விளக்கம்:",
    "HI": "सिग्नल विवरण:",
    "PT": "Descrição do Sinal:",
    "KO": "신호 설명:",
    "FR": "Description du signal:",
    "JA": "信号説明:"
  },
  "Affected Endpoints": {
    "EN": "Affected Endpoints",
    "TE": "ప్రభావిత ఎండ్‌పాయింట్లు",
    "TA": "பாதிக்கப்பட்ட முனைகள்",
    "HI": "प्रभावित एंडपॉइंट्स",
    "PT": "Endpoints Afetados",
    "KO": "영향받는 엔드포인트",
    "FR": "Points de terminaison affectés",
    "JA": "影響を受けるエンドポイント"
  },
  "Affected Endpoints:": {
    "EN": "Affected Endpoints:",
    "TE": "ప్రభావిత ఎండ్‌పాయింట్లు:",
    "TA": "பாதிக்கப்பட்ட முனைகள்:",
    "HI": "प्रभावित एंडपॉइंट्स:",
    "PT": "Endpoints Afetados:",
    "KO": "영향받는 엔드포인트:",
    "FR": "Points de terminaison affectés:",
    "JA": "影響を受けるエンドポイント:"
  },
  "OPERATIONS CONSOLE": {
    "EN": "OPERATIONS CONSOLE",
    "TE": "ఆపరేషన్స్ కన్సోల్",
    "TA": "செயல்பாட்டுக் கன்சோல்",
    "HI": "संचालन कंसोल",
    "PT": "CONSOLE DE OPERAÇÕES",
    "KO": "운영 콘솔",
    "FR": "CONSOLE D'EXPLOITATION",
    "JA": "運用コンソール"
  },
  "OPERATIONS CONSOLE:": {
    "EN": "OPERATIONS CONSOLE:",
    "TE": "ఆపరేషన్స్ కన్సోల్:",
    "TA": "செயல்பாட்டுக் கன்சோல்:",
    "HI": "संचालन कंसोल:",
    "PT": "CONSOLE DE OPERAÇÕES:",
    "KO": "운영 콘솔:",
    "FR": "CONSOLE D'EXPLOITATION:",
    "JA": "運用コンソール:"
  },
  "Stop highlighting": {
    "EN": "Stop highlighting",
    "TE": "హైలైట్ ఆపండి",
    "TA": "முன்னிலைப்படுத்துவதை நிறுத்து",
    "HI": "हाइलाइट करना रोकें",
    "PT": "Parar destaque",
    "KO": "강조 표시 중지",
    "FR": "Arrêter le surlignage",
    "JA": "ハイライト停止"
  },
  "Stop highlighting:": {
    "EN": "Stop highlighting:",
    "TE": "హైలైట్ ఆపండి:",
    "TA": "முன்னிலைப்படுத்துவதை நிறுத்து:",
    "HI": "हाइलाइट करना रोकें:",
    "PT": "Parar destaque:",
    "KO": "강조 표시 중지:",
    "FR": "Arrêter le surlignage:",
    "JA": "ハイライト停止:"
  },
  "Verified Sessions": {
    "EN": "Verified Sessions",
    "TE": "ధృవీకరించబడిన సెషన్లు",
    "TA": "சரிபார்க்கப்பட்ட அமர்வுகள்",
    "HI": "सत्यापित सत्र",
    "PT": "Sessões Verificadas",
    "KO": "검증된 세션",
    "FR": "Sessions vérifiées",
    "JA": "認証済みセッション"
  },
  "Verified Sessions:": {
    "EN": "Verified Sessions:",
    "TE": "ధృవీకరించబడిన సెషన్లు:",
    "TA": "சரிபார்க்கப்பட்ட அமர்வுகள்:",
    "HI": "सत्यापित सत्र:",
    "PT": "Sessões Verificadas:",
    "KO": "검증된 세션:",
    "FR": "Sessions vérifiées:",
    "JA": "認証済みセッション:"
  },
  "serial connection": {
    "EN": "serial connection",
    "TE": "సీరియల్ కనెక్షన్",
    "TA": "சீரியல் இணைப்பு",
    "HI": "सीरियल कनेक्शन",
    "PT": "conexão serial",
    "KO": "시리얼 연결",
    "FR": "connexion série",
    "JA": "シリアル接続"
  },
  "serial connection:": {
    "EN": "serial connection:",
    "TE": "సీరియల్ కనెక్షన్:",
    "TA": "சீரியல் இணைப்பு:",
    "HI": "सीरियल कनेक्शन:",
    "PT": "conexão serial:",
    "KO": "시리얼 연결:",
    "FR": "connexion série:",
    "JA": "シリアル接続:"
  },
  "Published DataSet": {
    "EN": "Published DataSet",
    "TE": "పబ్లిష్డ్ DataSet",
    "TA": "வெளியிடப்பட்ட DataSet",
    "HI": "प्रकाशित DataSet",
    "PT": "DataSet Publicado",
    "KO": "발행된 DataSet",
    "FR": "DataSet publié",
    "JA": "パブリッシュDataSet"
  },
  "Published DataSet:": {
    "EN": "Published DataSet:",
    "TE": "పబ్లిష్డ్ DataSet:",
    "TA": "வெளியிடப்பட்ட DataSet:",
    "HI": "प्रकाशित DataSet:",
    "PT": "DataSet Publicado:",
    "KO": "발행된 DataSet:",
    "FR": "DataSet publié:",
    "JA": "パブリッシュDataSet:"
  },
  "Southbound Source": {
    "EN": "Southbound Source",
    "TE": "సౌత్‌బౌండ్ సోర్స్",
    "TA": "தெற்கு நோக்கிய மூலம்",
    "HI": "साउथबाउंड स्रोत",
    "PT": "Fonte Southbound",
    "KO": "하위 소스 (Southbound)",
    "FR": "Source aval (Southbound)",
    "JA": "下位ソース"
  },
  "Southbound Source:": {
    "EN": "Southbound Source:",
    "TE": "సౌత్‌బౌండ్ సోర్స్:",
    "TA": "தெற்கு நோக்கிய மூலம்:",
    "HI": "साउथबाउंड स्रोत:",
    "PT": "Fonte Southbound:",
    "KO": "하위 소스 (Southbound):",
    "FR": "Source aval (Southbound):",
    "JA": "下位ソース:"
  },
  "Loading / Cooling": {
    "EN": "Loading / Cooling",
    "TE": "లోడింగ్ / కూలింగ్",
    "TA": "சுமை / குளிர்விப்பு",
    "HI": "लोडिंग / कूलिंग",
    "PT": "Carregamento / Resfriamento",
    "KO": "부하율 / 냉각",
    "FR": "Charge / Refroidissement",
    "JA": "負荷率 / 冷却"
  },
  "Loading / Cooling:": {
    "EN": "Loading / Cooling:",
    "TE": "లోడింగ్ / కూలింగ్:",
    "TA": "சுமை / குளிர்விப்பு:",
    "HI": "लोडिंग / कूलिंग:",
    "PT": "Carregamento / Resfriamento:",
    "KO": "부하율 / 냉각:",
    "FR": "Charge / Refroidissement:",
    "JA": "負荷率 / 冷却:"
  },
  "Finish & Evaluate": {
    "EN": "Finish & Evaluate",
    "TE": "ముగించి మూల్యాంకనం చేయండి",
    "TA": "முடித்து மதிப்பிடு",
    "HI": "समाप्त करें और मूल्यांकन करें",
    "PT": "Concluir e Avaliar",
    "KO": "완료 및 평가",
    "FR": "Terminer et évaluer",
    "JA": "完了して評価"
  },
  "Finish & Evaluate:": {
    "EN": "Finish & Evaluate:",
    "TE": "ముగించి మూల్యాంకనం చేయండి:",
    "TA": "முடித்து மதிப்பிடு:",
    "HI": "समाप्त करें और मूल्यांकन करें:",
    "PT": "Concluir e Avaliar:",
    "KO": "완료 및 평가:",
    "FR": "Terminer et évaluer:",
    "JA": "完了して評価:"
  },
  "IEC 61850 Dataset": {
    "EN": "IEC 61850 Dataset",
    "TE": "IEC 61850 డేటాసెట్",
    "TA": "IEC 61850 தரவுத்தொகுப்பு",
    "HI": "IEC 61850 डेटासेट",
    "PT": "Conjunto de Dados IEC 61850",
    "KO": "IEC 61850 데이터셋",
    "FR": "Jeu de données IEC 61850",
    "JA": "IEC 61850 データセット"
  },
  "IEC 61850 Dataset:": {
    "EN": "IEC 61850 Dataset:",
    "TE": "IEC 61850 డేటాసెట్:",
    "TA": "IEC 61850 தரவுத்தொகுப்பு:",
    "HI": "IEC 61850 डेटासेट:",
    "PT": "Conjunto de Dados IEC 61850:",
    "KO": "IEC 61850 데이터셋:",
    "FR": "Jeu de données IEC 61850:",
    "JA": "IEC 61850 データセット:"
  },
  "Protection Relay": {
    "EN": "Protection Relay",
    "TE": "ప్రొటెక్షన్ రిలే",
    "TA": "பாதுகாப்பு ரிலே",
    "HI": "प्रोटेक्शन रिले",
    "PT": "Relé de Proteção",
    "KO": "보호 계전기",
    "FR": "Relais de Protection",
    "JA": "保護リレー"
  },
  "Protection Relay:": {
    "EN": "Protection Relay:",
    "TE": "ప్రొటెక్షన్ రిలే:",
    "TA": "பாதுகாப்பு ரிலே:",
    "HI": "प्रोटेक्शन रिले:",
    "PT": "Relé de Proteção:",
    "KO": "보호 계전기:",
    "FR": "Relais de Protection:",
    "JA": "保護リレー:"
  },
  "Operator Station": {
    "EN": "Operator Station",
    "TE": "ఆపరేటర్ స్టేషన్",
    "TA": "இயக்குநர் நிலையம்",
    "HI": "ऑपरेटर स्टेशन",
    "PT": "Estação do Operador",
    "KO": "운영자 스테이션",
    "FR": "Poste Opérateur",
    "JA": "オペレーターステーション"
  },
  "Operator Station:": {
    "EN": "Operator Station:",
    "TE": "ఆపరేటర్ స్టేషన్:",
    "TA": "இயக்குநர் நிலையம்:",
    "HI": "ऑपरेटर स्टेशन:",
    "PT": "Estação do Operador:",
    "KO": "운영자 스테이션:",
    "FR": "Poste Opérateur:",
    "JA": "オペレーターステーション:"
  },
  "Topology Summary": {
    "EN": "Topology Summary",
    "TE": "టోపాలజీ సారాంశం",
    "TA": "இடவியல் சுருக்கம்",
    "HI": "टोपोलॉजी सारांश",
    "PT": "Resumo da Topologia",
    "KO": "토폴로지 요약",
    "FR": "Résumé de la Topologie",
    "JA": "トポロジ概要"
  },
  "Topology Summary:": {
    "EN": "Topology Summary:",
    "TE": "టోపాలజీ సారాంశం:",
    "TA": "இடவியல் சுருக்கம்:",
    "HI": "टोपोलॉजी सारांश:",
    "PT": "Resumo da Topologia:",
    "KO": "토폴로지 요약:",
    "FR": "Résumé de la Topologie:",
    "JA": "トポロジ概要:"
  },
  "Rollover Console": {
    "EN": "Rollover Console",
    "TE": "రోలోవర్ కన్సోల్",
    "TA": "ரோல்ஓவர் கன்சோல்",
    "HI": "रोलओवर कंसोल",
    "PT": "Console Rollover",
    "KO": "롤오버 콘솔",
    "FR": "Console câble inversé",
    "JA": "ロールオーバーコンソール"
  },
  "Rollover Console:": {
    "EN": "Rollover Console:",
    "TE": "రోలోవర్ కన్సోల్:",
    "TA": "ரோல்ஓவர் கன்சோல்:",
    "HI": "रोलओवर कंसोल:",
    "PT": "Console Rollover:",
    "KO": "롤오버 콘솔:",
    "FR": "Console câble inversé:",
    "JA": "ロールオーバーコンソール:"
  },
  "Firewall Cluster": {
    "EN": "Firewall Cluster",
    "TE": "ఫైర్‌వాల్ క్లస్టర్",
    "TA": "ஃபயர்வால் கிளஸ்டர்",
    "HI": "फ़ायरवॉल क्लस्टर",
    "PT": "Cluster de Firewall",
    "KO": "방화벽 클러스터",
    "FR": "Cluster de pare-feu",
    "JA": "ファイアウォールクラスタ"
  },
  "Firewall Cluster:": {
    "EN": "Firewall Cluster:",
    "TE": "ఫైర్‌వాల్ క్లస్టర్:",
    "TA": "ஃபயர்வால் கிளஸ்டர்:",
    "HI": "फ़ायरवॉल क्लस्टर:",
    "PT": "Cluster de Firewall:",
    "KO": "방화벽 클러스터:",
    "FR": "Cluster de pare-feu:",
    "JA": "ファイアウォールクラスタ:"
  },
  "Association Loss": {
    "EN": "Association Loss",
    "TE": "అసోసియేషన్ లాస్",
    "TA": "இணைப்பு இழப்பு",
    "HI": "एसोसिएशन हानि",
    "PT": "Perda de Associação",
    "KO": "연결 손실",
    "FR": "Perte d'association",
    "JA": "アソシエーション喪失"
  },
  "Association Loss:": {
    "EN": "Association Loss:",
    "TE": "అసోసియేషన్ లాస్:",
    "TA": "இணைப்பு இழப்பு:",
    "HI": "एसोसिएशन हानि:",
    "PT": "Perda de Associação:",
    "KO": "연결 손실:",
    "FR": "Perte d'association:",
    "JA": "アソシエーション喪失:"
  },
  "Ethertype Suffix": {
    "EN": "Ethertype Suffix",
    "TE": "Ethertype సఫిక్స్",
    "TA": "Ethertype பின்னொட்டு",
    "HI": "Ethertype प्रत्यय",
    "PT": "Sufixo Ethertype",
    "KO": "Ethertype 접미사",
    "FR": "Suffixe Ethertype",
    "JA": "Ethertypeサフィックス"
  },
  "Ethertype Suffix:": {
    "EN": "Ethertype Suffix:",
    "TE": "Ethertype సఫిక్స్:",
    "TA": "Ethertype பின்னொட்டு:",
    "HI": "Ethertype प्रत्यय:",
    "PT": "Sufixo Ethertype:",
    "KO": "Ethertype 접미사:",
    "FR": "Suffixe Ethertype:",
    "JA": "Ethertypeサフィックス:"
  },
  "Return to Normal": {
    "EN": "Return to Normal",
    "TE": "సాధారణ స్థితికి తిరిగి వెళ్ళు",
    "TA": "இயல்பு நிலைக்குத் திரும்பு",
    "HI": "सामान्य स्थिति में लौटें",
    "PT": "Retornar ao Normal",
    "KO": "정상 복귀",
    "FR": "Retour à la normale",
    "JA": "通常状態へ復帰"
  },
  "Return to Normal:": {
    "EN": "Return to Normal:",
    "TE": "సాధారణ స్థితికి తిరిగి వెళ్ళు:",
    "TA": "இயல்பு நிலைக்குத் திரும்பு:",
    "HI": "सामान्य स्थिति में लौटें:",
    "PT": "Retornar ao Normal:",
    "KO": "정상 복귀:",
    "FR": "Retour à la normale:",
    "JA": "通常状態へ復帰:"
  },
  "Circuit Breaker": {
    "EN": "Circuit Breaker",
    "TE": "సర్క్యూట్ బ్రేకర్",
    "TA": "சர்க்யூட் பிரேக்கர்",
    "HI": "सर्किट ब्रेकर",
    "PT": "Disjuntor",
    "KO": "차단기",
    "FR": "Disjoncteur",
    "JA": "遮断器"
  },
  "Circuit Breaker:": {
    "EN": "Circuit Breaker:",
    "TE": "సర్క్యూట్ బ్రేకర్:",
    "TA": "சர்க்யூட் பிரேக்கர்:",
    "HI": "सर्किट ब्रेकर:",
    "PT": "Disjuntor:",
    "KO": "차단기:",
    "FR": "Disjoncteur:",
    "JA": "遮断器:"
  },
  "Protection Trip": {
    "EN": "Protection Trip",
    "TE": "ప్రొటెక్షన్ ట్రిప్",
    "TA": "பாதுகாப்பு டிரிப்",
    "HI": "प्रोटेक्शन ट्रिप",
    "PT": "Disparo de Proteção",
    "KO": "보호 트립",
    "FR": "Déclenchement de Protection",
    "JA": "保護トリップ"
  },
  "Protection Trip:": {
    "EN": "Protection Trip:",
    "TE": "ప్రొటెక్షన్ ట్రిప్:",
    "TA": "பாதுகாப்பு டிரிப்:",
    "HI": "प्रोटेक्शन ट्रिप:",
    "PT": "Disparo de Proteção:",
    "KO": "보호 트립:",
    "FR": "Déclenchement de Protection:",
    "JA": "保護トリップ:"
  },
  "Addressing Plan": {
    "EN": "Addressing Plan",
    "TE": "అడ్రసింగ్ ప్లాన్",
    "TA": "முகவரித் திட்டம்",
    "HI": "एड्रेसिंग योजना",
    "PT": "Plano de Endereçamento",
    "KO": "주소 할당 계획",
    "FR": "Plan d'Adressage",
    "JA": "アドレス設計表"
  },
  "Addressing Plan:": {
    "EN": "Addressing Plan:",
    "TE": "అడ్రసింగ్ ప్లాన్:",
    "TA": "முகவரித் திட்டம்:",
    "HI": "एड्रेसिंग योजना:",
    "PT": "Plano de Endereçamento:",
    "KO": "주소 할당 계획:",
    "FR": "Plan d'Adressage:",
    "JA": "アドレス設計表:"
  },
  "Live Monitoring": {
    "EN": "Live Monitoring",
    "TE": "లైవ్ మానిటరింగ్",
    "TA": "நேரடி கண்காணிப்பு",
    "HI": "लाइव निगरानी",
    "PT": "Monitoramento ao Vivo",
    "KO": "실시간 모니터링",
    "FR": "Surveillance en Direct",
    "JA": "ライブ監視"
  },
  "Live Monitoring:": {
    "EN": "Live Monitoring:",
    "TE": "లైవ్ మానిటరింగ్:",
    "TA": "நேரடி கண்காணிப்பு:",
    "HI": "लाइव निगरानी:",
    "PT": "Monitoramento ao Vivo:",
    "KO": "실시간 모니터링:",
    "FR": "Surveillance en Direct:",
    "JA": "ライブ監視:"
  },
  "Troubleshooting": {
    "EN": "Troubleshooting",
    "TE": "ట్రబుల్‌షూటింగ్",
    "TA": "பழுதுபார்ப்பு",
    "HI": "समस्या निवारण",
    "PT": "Solução de problemas",
    "KO": "문제 해결",
    "FR": "Dépannage",
    "JA": "トラブルシューティング"
  },
  "Troubleshooting:": {
    "EN": "Troubleshooting:",
    "TE": "ట్రబుల్‌షూటింగ్:",
    "TA": "பழுதுபார்ப்பு:",
    "HI": "समस्या निवारण:",
    "PT": "Solução de problemas:",
    "KO": "문제 해결:",
    "FR": "Dépannage:",
    "JA": "トラブルシューティング:"
  },
  "Display options": {
    "EN": "Display options",
    "TE": "డిస్‌ప్లే ఎంపికలు",
    "TA": "காட்சி விருப்பங்கள்",
    "HI": "प्रदर्शन विकल्प",
    "PT": "Opções de exibição",
    "KO": "표시 옵션",
    "FR": "Options d'affichage",
    "JA": "表示オプション"
  },
  "Display options:": {
    "EN": "Display options:",
    "TE": "డిస్‌ప్లే ఎంపికలు:",
    "TA": "காட்சி விருப்பங்கள்:",
    "HI": "प्रदर्शन विकल्प:",
    "PT": "Opções de exibição:",
    "KO": "표시 옵션:",
    "FR": "Options d'affichage:",
    "JA": "表示オプション:"
  },
  "Synch-Check Ref": {
    "EN": "Synch-Check Ref",
    "TE": "సింక్-చెక్ రిఫరెన్స్",
    "TA": "ஒத்திசைவு-சரிபார்ப்பு குறிப்பு",
    "HI": "सिंक-चेक संदर्भ",
    "PT": "Ref. de Sincronismo",
    "KO": "동기검정 기준",
    "FR": "Réf. contrôle de synchronisme",
    "JA": "同期検定基準"
  },
  "Synch-Check Ref:": {
    "EN": "Synch-Check Ref:",
    "TE": "సింక్-చెక్ రిఫరెన్స్:",
    "TA": "ஒத்திசைவு-சரிபார்ப்பு குறிப்பு:",
    "HI": "सिंक-चेक संदर्भ:",
    "PT": "Ref. de Sincronismo:",
    "KO": "동기검정 기준:",
    "FR": "Réf. contrôle de synchronisme:",
    "JA": "同期検定基準:"
  },
  "IED Connections": {
    "EN": "IED Connections",
    "TE": "IED కనెక్షన్లు",
    "TA": "IED இணைப்புகள்",
    "HI": "IED कनेक्शन",
    "PT": "Conexões de IED",
    "KO": "IED 연결",
    "FR": "Connexions IED",
    "JA": "IED接続"
  },
  "IED Connections:": {
    "EN": "IED Connections:",
    "TE": "IED కనెక్షన్లు:",
    "TA": "IED இணைப்புகள்:",
    "HI": "IED कनेक्शन:",
    "PT": "Conexões de IED:",
    "KO": "IED 연결:",
    "FR": "Connexions IED:",
    "JA": "IED接続:"
  },
  "Data Attributes": {
    "EN": "Data Attributes",
    "TE": "డేటా అట్రిబ్యూట్లు",
    "TA": "தரவு பண்புகள்",
    "HI": "डेटा विशेषताएँ",
    "PT": "Atributos de Dados",
    "KO": "데이터 속성",
    "FR": "Attributs de données",
    "JA": "データ属性"
  },
  "Data Attributes:": {
    "EN": "Data Attributes:",
    "TE": "డేటా అట్రిబ్యూట్లు:",
    "TA": "தரவு பண்புகள்:",
    "HI": "डेटा विशेषताएँ:",
    "PT": "Atributos de Dados:",
    "KO": "데이터 속성:",
    "FR": "Attributs de données:",
    "JA": "データ属性:"
  },
  "IED INFORMATION": {
    "EN": "IED INFORMATION",
    "TE": "IED సమాచారం",
    "TA": "IED தகவல்",
    "HI": "IED जानकारी",
    "PT": "INFORMAÇÕES DO IED",
    "KO": "IED 정보",
    "FR": "INFORMATIONS IED",
    "JA": "IED情報"
  },
  "IED INFORMATION:": {
    "EN": "IED INFORMATION:",
    "TE": "IED సమాచారం:",
    "TA": "IED தகவல்:",
    "HI": "IED जानकारी:",
    "PT": "INFORMAÇÕES DO IED:",
    "KO": "IED 정보:",
    "FR": "INFORMATIONS IED:",
    "JA": "IED情報:"
  },
  "Sequence Number": {
    "EN": "Sequence Number",
    "TE": "సీక్వెన్స్ నంబర్",
    "TA": "வரிசை எண்",
    "HI": "अनुक्रम संख्या",
    "PT": "Número de Sequência",
    "KO": "시퀀스 번호",
    "FR": "Numéro de séquence",
    "JA": "シーケンス番号"
  },
  "Sequence Number:": {
    "EN": "Sequence Number:",
    "TE": "సీక్వెన్స్ నంబర్:",
    "TA": "வரிசை எண்:",
    "HI": "अनुक्रम संख्या:",
    "PT": "Número de Sequência:",
    "KO": "시퀀스 번호:",
    "FR": "Numéro de séquence:",
    "JA": "シーケンス番号:"
  },
  "Failed Segments": {
    "EN": "Failed Segments",
    "TE": "విఫలమైన సెగ్మెంట్లు",
    "TA": "தோல்வியடைந்த பிரிவுகள்",
    "HI": "विफल सेगमेंट",
    "PT": "Segmentos com Falha",
    "KO": "장애 세그먼트",
    "FR": "Segments défaillants",
    "JA": "障害セグメント"
  },
  "Failed Segments:": {
    "EN": "Failed Segments:",
    "TE": "విఫలమైన సెగ్మెంట్లు:",
    "TA": "தோல்வியடைந்த பிரிவுகள்:",
    "HI": "विफल सेगमेंट:",
    "PT": "Segmentos com Falha:",
    "KO": "장애 세그먼트:",
    "FR": "Segments défaillants:",
    "JA": "障害セグメント:"
  },
  "Manual Transfer": {
    "EN": "Manual Transfer",
    "TE": "మాన్యువల్ ట్రాన్స్‌ఫర్",
    "TA": "கைமுறை மாற்றம்",
    "HI": "मैनुअल ट्रांसफर",
    "PT": "Transferência Manual",
    "KO": "수동 절체",
    "FR": "Transfert manuel",
    "JA": "手動切替"
  },
  "Manual Transfer:": {
    "EN": "Manual Transfer:",
    "TE": "మాన్యువల్ ట్రాన్స్‌ఫర్:",
    "TA": "கைமுறை மாற்றம்:",
    "HI": "मैनुअल ट्रांसफर:",
    "PT": "Transferência Manual:",
    "KO": "수동 절체:",
    "FR": "Transfert manuel:",
    "JA": "手動切替:"
  },
  "Fast Protection": {
    "EN": "Fast Protection",
    "TE": "ఫాస్ట్ ప్రొటెక్షన్",
    "TA": "வேகமான பாதுகாப்பு",
    "HI": "तेज़ सुरक्षा",
    "PT": "Proteção Rápida",
    "KO": "고속 보호",
    "FR": "Protection rapide",
    "JA": "高速保護"
  },
  "Fast Protection:": {
    "EN": "Fast Protection:",
    "TE": "ఫాస్ట్ ప్రొటెక్షన్:",
    "TA": "வேகமான பாதுகாப்பு:",
    "HI": "तेज़ सुरक्षा:",
    "PT": "Proteção Rápida:",
    "KO": "고속 보호:",
    "FR": "Protection rapide:",
    "JA": "高速保護:"
  },
  "Timed Evaluator": {
    "EN": "Timed Evaluator",
    "TE": "టైమ్డ్ ఎవాల్యుయేటర్",
    "TA": "நேர மதிப்பீட்டாளர்",
    "HI": "समयबद्ध मूल्यांकनकर्ता",
    "PT": "Avaliador Cronometrado",
    "KO": "시간 제한 평가기",
    "FR": "Évaluateur chronométré",
    "JA": "制限時間付き評価"
  },
  "Timed Evaluator:": {
    "EN": "Timed Evaluator:",
    "TE": "టైమ్డ్ ఎవాల్యుయేటర్:",
    "TA": "நேர மதிப்பீட்டாளர்:",
    "HI": "समयबद्ध मूल्यांकनकर्ता:",
    "PT": "Avaliador Cronometrado:",
    "KO": "시간 제한 평가기:",
    "FR": "Évaluateur chronométré:",
    "JA": "制限時間付き評価:"
  },
  "Synchronization": {
    "EN": "Synchronization",
    "TE": "సింక్రొనైజేషన్",
    "TA": "ஒத்திசைவு",
    "HI": "सिंक्रनाइज़ेशन",
    "PT": "Sincronização",
    "KO": "동기화",
    "FR": "Synchronisation",
    "JA": "同期"
  },
  "Synchronization:": {
    "EN": "Synchronization:",
    "TE": "సింక్రొనైజేషన్:",
    "TA": "ஒத்திசைவு:",
    "HI": "सिंक्रनाइज़ेशन:",
    "PT": "Sincronização:",
    "KO": "동기화:",
    "FR": "Synchronisation:",
    "JA": "同期:"
  },
  "Firmware / SCL:": {
    "EN": "Firmware / SCL:",
    "TE": "ఫర్మ్‌వేర్ / SCL:",
    "TA": "ஃபர்ம்வேர் / SCL:",
    "HI": "फ़र्मवेयर / SCL:",
    "PT": "Microcódigo / SCL:",
    "KO": "펌웨어 / SCL:",
    "FR": "Micrologiciel / SCL :",
    "JA": "ファームウェア / SCL:"
  },
  "MMS Association": {
    "EN": "MMS Association",
    "TE": "MMS అసోసియేషన్",
    "TA": "MMS இணைப்பு",
    "HI": "MMS एसोसिएशन",
    "PT": "Associação MMS",
    "KO": "MMS 연결 (Association)",
    "FR": "Association MMS (TCP/102)",
    "JA": "MMS アソシエーション"
  },
  "MMS Association:": {
    "EN": "MMS Association:",
    "TE": "MMS అసోసియేషన్:",
    "TA": "MMS இணைப்பு:",
    "HI": "MMS एसोसिएशन:",
    "PT": "Associação MMS:",
    "KO": "MMS 연결 (Association):",
    "FR": "Association MMS (TCP/102):",
    "JA": "MMS アソシエーション:"
  },
  "SCADA Tag / HMI": {
    "EN": "SCADA Tag / HMI",
    "TE": "SCADA ట్యాగ్ / HMI",
    "TA": "SCADA குறிச்சொல் / HMI",
    "HI": "SCADA टैग / HMI",
    "PT": "Tag SCADA / IHM",
    "KO": "SCADA 태그 / HMI",
    "FR": "Tag SCADA / IHM",
    "JA": "SCADAタグ / HMI"
  },
  "SCADA Tag / HMI:": {
    "EN": "SCADA Tag / HMI:",
    "TE": "SCADA ట్యాగ్ / HMI:",
    "TA": "SCADA குறிச்சொல் / HMI:",
    "HI": "SCADA टैग / HMI:",
    "PT": "Tag SCADA / IHM:",
    "KO": "SCADA 태그 / HMI:",
    "FR": "Tag SCADA / IHM:",
    "JA": "SCADAタグ / HMI:"
  },
  "Retransmission": {
    "EN": "Retransmission",
    "TE": "రీ-ట్రాన్స్‌మిషన్",
    "TA": "மறு ஒளிபரப்பு",
    "HI": "पुनः प्रसारण",
    "PT": "Retransmissão",
    "KO": "재전송",
    "FR": "Retransmission",
    "JA": "再送"
  },
  "Retransmission:": {
    "EN": "Retransmission:",
    "TE": "రీ-ట్రాన్స్‌మిషన్:",
    "TA": "மறு ஒளிபரப்பு:",
    "HI": "पुनः प्रसारण:",
    "PT": "Retransmissão:",
    "KO": "재전송:",
    "FR": "Retransmission:",
    "JA": "再送:"
  },
  "Privacy Policy": {
    "EN": "Privacy Policy",
    "TE": "గోప్యతా విధానం",
    "TA": "தனியுரிமைக் கொள்கை",
    "HI": "गोपनीयता नीति",
    "PT": "Política de Privacidade",
    "KO": "개인정보 처리방침",
    "FR": "Politique de confidentialité",
    "JA": "プライバシーポリシー"
  },
  "Privacy Policy:": {
    "EN": "Privacy Policy:",
    "TE": "గోప్యతా విధానం:",
    "TA": "தனியுரிமைக் கொள்கை:",
    "HI": "गोपनीयता नीति:",
    "PT": "Política de Privacidade:",
    "KO": "개인정보 처리방침:",
    "FR": "Politique de confidentialité:",
    "JA": "プライバシーポリシー:"
  },
  "Distance-Aware": {
    "EN": "Distance-Aware",
    "TE": "దూర-ఆధారిత (Distance-Aware)",
    "TA": "தூர-உணர்வு",
    "HI": "दूरी-संवेदी",
    "PT": "Sensível à Distância",
    "KO": "거리 감지형",
    "FR": "Sensible à la distance",
    "JA": "距離連動"
  },
  "Distance-Aware:": {
    "EN": "Distance-Aware:",
    "TE": "దూర-ఆధారిత (Distance-Aware):",
    "TA": "தூர-உணர்வு:",
    "HI": "दूरी-संवेदी:",
    "PT": "Sensível à Distância:",
    "KO": "거리 감지형:",
    "FR": "Sensible à la distance:",
    "JA": "距離連動:"
  },
  "LAN Identifier": {
    "EN": "LAN Identifier",
    "TE": "LAN ఐడెంటిఫైయర్",
    "TA": "LAN அடையாளங்காட்டி",
    "HI": "LAN पहचानकर्ता",
    "PT": "Identificador de LAN",
    "KO": "LAN 식별자",
    "FR": "Identifiant LAN",
    "JA": "LAN識別子"
  },
  "LAN Identifier:": {
    "EN": "LAN Identifier:",
    "TE": "LAN ఐడెంటిఫైయర్:",
    "TA": "LAN அடையாளங்காட்டி:",
    "HI": "LAN पहचानकर्ता:",
    "PT": "Identificador de LAN:",
    "KO": "LAN 식별자:",
    "FR": "Identifiant LAN:",
    "JA": "LAN識別子:"
  },
  "Reachable IEDs": {
    "EN": "Reachable IEDs",
    "TE": "చేరుకోగల IEDలు",
    "TA": "அடையக்கூடிய IEDகள்",
    "HI": "पहुँच योग्य IEDs",
    "PT": "IEDs Alcançáveis",
    "KO": "도달 가능한 IED",
    "FR": "IED joignables",
    "JA": "到達可能IED"
  },
  "Reachable IEDs:": {
    "EN": "Reachable IEDs:",
    "TE": "చేరుకోగల IEDలు:",
    "TA": "அடையக்கூடிய IEDகள்:",
    "HI": "पहुँच योग्य IEDs:",
    "PT": "IEDs Alcançáveis:",
    "KO": "도달 가능한 IED:",
    "FR": "IED joignables:",
    "JA": "到達可能IED:"
  },
  "Busbar Section": {
    "EN": "Busbar Section",
    "TE": "బస్‌బార్ విభాగం",
    "TA": "பஸ்பார் பிரிவு",
    "HI": "बसबॉर अनुभाग",
    "PT": "Seção de Barramento",
    "KO": "모선 섹션",
    "FR": "Section de jeu de barres",
    "JA": "母線セクション"
  },
  "Busbar Section:": {
    "EN": "Busbar Section:",
    "TE": "బస్‌బార్ విభాగం:",
    "TA": "பஸ்பார் பிரிவு:",
    "HI": "बसबॉर अनुभाग:",
    "PT": "Seção de Barramento:",
    "KO": "모선 섹션:",
    "FR": "Section de jeu de barres:",
    "JA": "母線セクション:"
  },
  "Specialization": {
    "EN": "Specialization",
    "TE": "స్పెషలైజేషన్",
    "TA": "சிறப்புத் துறை",
    "HI": "विशेषज्ञता",
    "PT": "Especialização",
    "KO": "전문 분야",
    "FR": "Spécialisation",
    "JA": "専門分野"
  },
  "Specialization:": {
    "EN": "Specialization:",
    "TE": "స్పెషలైజేషన్:",
    "TA": "சிறப்புத் துறை:",
    "HI": "विशेषज्ञता:",
    "PT": "Especialização:",
    "KO": "전문 분야:",
    "FR": "Spécialisation:",
    "JA": "専門分野:"
  },
  "Firmware / SCL": {
    "EN": "Firmware / SCL",
    "TE": "ఫర్మ్‌వేర్ / SCL",
    "TA": "ஃபர்ம்வேர் / SCL",
    "HI": "फ़र्मवेयर / SCL",
    "PT": "Microcódigo / SCL",
    "KO": "펌웨어 / SCL",
    "FR": "Micrologiciel / SCL",
    "JA": "ファームウェア / SCL"
  },
  "OTI / WTI Temp": {
    "EN": "OTI / WTI Temp",
    "TE": "OTI / WTI ఉష్ణోగ్రత",
    "TA": "OTI / WTI வெப்பநிலை",
    "HI": "OTI / WTI तापमान",
    "PT": "Temp. OTI / WTI",
    "KO": "OTI / WTI 온도",
    "FR": "Temp. OTI / WTI",
    "JA": "OTI / WTI 温度"
  },
  "OTI / WTI Temp:": {
    "EN": "OTI / WTI Temp:",
    "TE": "OTI / WTI ఉష్ణోగ్రత:",
    "TA": "OTI / WTI வெப்பநிலை:",
    "HI": "OTI / WTI तापमान:",
    "PT": "Temp. OTI / WTI:",
    "KO": "OTI / WTI 온도:",
    "FR": "Temp. OTI / WTI:",
    "JA": "OTI / WTI 温度:"
  },
  "IEC 61850 Ref:": {
    "EN": "IEC 61850 Ref:",
    "TE": "IEC 61850 రిఫరెన్స్:",
    "TA": "IEC 61850 குறிப்பு:",
    "HI": "IEC 61850 संदर्भ:",
    "PT": "Ref. IEC 61850:",
    "KO": "IEC 61850 참조:",
    "FR": "Réf. IEC 61850 :",
    "JA": "IEC 61850 参照:"
  },
  "Line Isolator": {
    "EN": "Line Isolator",
    "TE": "లైన్ ఐసోలేటర్",
    "TA": "லைன் ஐசோலேட்டர்",
    "HI": "लाइन आइसोलेटर",
    "PT": "Seccionadora de Linha",
    "KO": "선로 단로기",
    "FR": "Sectionneur de Ligne",
    "JA": "線路断路器"
  },
  "Line Isolator:": {
    "EN": "Line Isolator:",
    "TE": "లైన్ ఐసోలేటర్:",
    "TA": "லைன் ஐசோலேட்டர்:",
    "HI": "लाइन आइसोलेटर:",
    "PT": "Seccionadora de Linha:",
    "KO": "선로 단로기:",
    "FR": "Sectionneur de Ligne:",
    "JA": "線路断路器:"
  },
  "Disconnectors": {
    "EN": "Disconnectors",
    "TE": "ఐసోలేటర్లు",
    "TA": "பிரிப்பான்கள்",
    "HI": "डिस्कनेक्टर",
    "PT": "Seccionadoras",
    "KO": "단로기",
    "FR": "Sectionneurs",
    "JA": "断路器"
  },
  "Disconnectors:": {
    "EN": "Disconnectors:",
    "TE": "ఐసోలేటర్లు:",
    "TA": "பிரிப்பான்கள்:",
    "HI": "डिस्कनेक्टर:",
    "PT": "Seccionadoras:",
    "KO": "단로기:",
    "FR": "Sectionneurs:",
    "JA": "断路器:"
  },
  "Communication": {
    "EN": "Communication",
    "TE": "కమ్యూనికేషన్",
    "TA": "தொடர்பு",
    "HI": "संचार",
    "PT": "Comunicação",
    "KO": "통신",
    "FR": "Communication réseau",
    "JA": "通信"
  },
  "Communication:": {
    "EN": "Communication:",
    "TE": "కమ్యూనికేషన్:",
    "TA": "தொடர்பு:",
    "HI": "संचार:",
    "PT": "Comunicação:",
    "KO": "통신:",
    "FR": "Communication réseau:",
    "JA": "通信:"
  },
  "Configuration": {
    "EN": "Configuration",
    "TE": "కాన్ఫిగరేషన్",
    "TA": "கட்டமைப்பு",
    "HI": "कॉन्फ़िगरेशन",
    "PT": "Configuração",
    "KO": "구성",
    "FR": "Configuration",
    "JA": "設定・構成"
  },
  "Configuration:": {
    "EN": "Configuration:",
    "TE": "కాన్ఫిగరేషన్:",
    "TA": "கட்டமைப்பு:",
    "HI": "कॉन्फ़िगरेशन:",
    "PT": "Configuração:",
    "KO": "구성:",
    "FR": "Configuration:",
    "JA": "設定・構成:"
  },
  "Commissioning": {
    "EN": "Commissioning",
    "TE": "కమిషనింగ్",
    "TA": "ஆணையிடுதல்",
    "HI": "कमीशनिंग",
    "PT": "Comissionamento",
    "KO": "시운전",
    "FR": "Mise en service",
    "JA": "試運転"
  },
  "Commissioning:": {
    "EN": "Commissioning:",
    "TE": "కమిషనింగ్:",
    "TA": "ஆணையிடுதல்:",
    "HI": "कमीशनिंग:",
    "PT": "Comissionamento:",
    "KO": "시운전:",
    "FR": "Mise en service:",
    "JA": "試運転:"
  },
  "Key Takeaways": {
    "EN": "Key Takeaways",
    "TE": "ముఖ్య అంశాలు",
    "TA": "முக்கிய குறிப்புகள்",
    "HI": "मुख्य बिंदु",
    "PT": "Pontos Principais",
    "KO": "핵심 요약",
    "FR": "Points clés",
    "JA": "重要ポイント"
  },
  "Key Takeaways:": {
    "EN": "Key Takeaways:",
    "TE": "ముఖ్య అంశాలు:",
    "TA": "முக்கிய குறிப்புகள்:",
    "HI": "मुख्य बिंदु:",
    "PT": "Pontos Principais:",
    "KO": "핵심 요약:",
    "FR": "Points clés:",
    "JA": "重要ポイント:"
  },
  "Derived SCADA": {
    "EN": "Derived SCADA",
    "TE": "ఉత్పన్న SCADA",
    "TA": "பெறப்பட்ட SCADA",
    "HI": "व्युत्पन्न SCADA",
    "PT": "SCADA Derivado",
    "KO": "파생 SCADA",
    "FR": "SCADA dérivé",
    "JA": "派生SCADA"
  },
  "Derived SCADA:": {
    "EN": "Derived SCADA:",
    "TE": "ఉత్పన్న SCADA:",
    "TA": "பெறப்பட்ட SCADA:",
    "HI": "व्युत्पन्न SCADA:",
    "PT": "SCADA Derivado:",
    "KO": "파생 SCADA:",
    "FR": "SCADA dérivé:",
    "JA": "派生SCADA:"
  },
  "Wildcard Mask": {
    "EN": "Wildcard Mask",
    "TE": "వైల్డ్‌కార్డ్ మాస్క్",
    "TA": "வைல்ட்கார்ட் மாஸ்க்",
    "HI": "वाइल्डकार्ड मास्क",
    "PT": "Máscara Wildcard",
    "KO": "와일드카드 마스크",
    "FR": "Masque générique (Wildcard)",
    "JA": "ワイルドカードマスク"
  },
  "Wildcard Mask:": {
    "EN": "Wildcard Mask:",
    "TE": "వైల్డ్‌కార్డ్ మాస్క్:",
    "TA": "வைல்ட்கார்ட் மாஸ்க்:",
    "HI": "वाइल्डकार्ड मास्क:",
    "PT": "Máscara Wildcard:",
    "KO": "와일드카드 마스크:",
    "FR": "Masque générique (Wildcard):",
    "JA": "ワイルドカードマスク:"
  },
  "Quick Actions": {
    "EN": "Quick Actions",
    "TE": "త్వరిత చర్యలు",
    "TA": "விரைவுச் செயல்கள்",
    "HI": "त्वरित कार्रवाइयाँ",
    "PT": "Ações Rápidas",
    "KO": "빠른 작업",
    "FR": "Actions rapides",
    "JA": "クイックアクション"
  },
  "Quick Actions:": {
    "EN": "Quick Actions:",
    "TE": "త్వరిత చర్యలు:",
    "TA": "விரைவுச் செயல்கள்:",
    "HI": "त्वरित कार्रवाइयाँ:",
    "PT": "Ações Rápidas:",
    "KO": "빠른 작업:",
    "FR": "Actions rapides:",
    "JA": "クイックアクション:"
  },
  "Auto-Recloser": {
    "EN": "Auto-Recloser",
    "TE": "ఆటో-రీక్లోజర్",
    "TA": "தானியங்கி மீள்மூடி",
    "HI": "ऑटो-रिक्लोज़र",
    "PT": "Religador Automático",
    "KO": "자동 재폐로",
    "FR": "Réenclencheur automatique",
    "JA": "自動再閉路"
  },
  "Auto-Recloser:": {
    "EN": "Auto-Recloser:",
    "TE": "ఆటో-రీక్లోజర్:",
    "TA": "தானியங்கி மீள்மூடி:",
    "HI": "ऑटो-रिक्लोज़र:",
    "PT": "Religador Automático:",
    "KO": "자동 재폐로:",
    "FR": "Réenclencheur automatique:",
    "JA": "自動再閉路:"
  },
  "Function Code": {
    "EN": "Function Code",
    "TE": "ఫంక్షన్ కోడ్",
    "TA": "செயல்பாட்டுக் குறியீடு",
    "HI": "फ़ंक्शन कोड",
    "PT": "Código de Função",
    "KO": "기능 코드",
    "FR": "Code de fonction",
    "JA": "ファンクションコード"
  },
  "Function Code:": {
    "EN": "Function Code:",
    "TE": "ఫంక్షన్ కోడ్:",
    "TA": "செயல்பாட்டுக் குறியீடு:",
    "HI": "फ़ंक्शन कोड:",
    "PT": "Código de Função:",
    "KO": "기능 코드:",
    "FR": "Code de fonction:",
    "JA": "ファンクションコード:"
  },
  "Allowed VLANs": {
    "EN": "Allowed VLANs",
    "TE": "అనుమతించబడిన VLANలు",
    "TA": "அனுமதிக்கப்பட்ட VLANகள்",
    "HI": "अनुमत VLANs",
    "PT": "VLANs Permitidas",
    "KO": "허용된 VLAN",
    "FR": "VLAN autorisés",
    "JA": "許可VLAN"
  },
  "Allowed VLANs:": {
    "EN": "Allowed VLANs:",
    "TE": "అనుమతించబడిన VLANలు:",
    "TA": "அனுமதிக்கப்பட்ட VLANகள்:",
    "HI": "अनुमत VLANs:",
    "PT": "VLANs Permitidas:",
    "KO": "허용된 VLAN:",
    "FR": "VLAN autorisés:",
    "JA": "許可VLAN:"
  },
  "Bus Section A": {
    "EN": "Bus Section A",
    "TE": "బస్ విభాగం A",
    "TA": "பஸ் பிரிவு A",
    "HI": "बस अनुभाग A",
    "PT": "Seção de Barra A",
    "KO": "모선 섹션 A",
    "FR": "Section de barre A",
    "JA": "母線セクションA"
  },
  "Bus Section A:": {
    "EN": "Bus Section A:",
    "TE": "బస్ విభాగం A:",
    "TA": "பஸ் பிரிவு A:",
    "HI": "बस अनुभाग A:",
    "PT": "Seção de Barra A:",
    "KO": "모선 섹션 A:",
    "FR": "Section de barre A:",
    "JA": "母線セクションA:"
  },
  "Bus Section B": {
    "EN": "Bus Section B",
    "TE": "బస్ విభాగం B",
    "TA": "பஸ் பிரிவு B",
    "HI": "बस अनुभाग B",
    "PT": "Seção de Barra B",
    "KO": "모선 섹션 B",
    "FR": "Section de barre B",
    "JA": "母線セクションB"
  },
  "Bus Section B:": {
    "EN": "Bus Section B:",
    "TE": "బస్ విభాగం B:",
    "TA": "பஸ் பிரிவு B:",
    "HI": "बस अनुभाग B:",
    "PT": "Seção de Barra B:",
    "KO": "모선 섹션 B:",
    "FR": "Section de barre B:",
    "JA": "母線セクションB:"
  },
  "Preconditions": {
    "EN": "Preconditions",
    "TE": "ముందస్తు షరతులు",
    "TA": "முன்நிபந்தனைகள்",
    "HI": "पूर्व-शर्तें",
    "PT": "Pré-condições",
    "KO": "사전 조건",
    "FR": "Conditions préalables",
    "JA": "前提条件"
  },
  "Preconditions:": {
    "EN": "Preconditions:",
    "TE": "ముందస్తు షరతులు:",
    "TA": "முன்நிபந்தனைகள்:",
    "HI": "पूर्व-शर्तें:",
    "PT": "Pré-condições:",
    "KO": "사전 조건:",
    "FR": "Conditions préalables:",
    "JA": "前提条件:"
  },
  "MMS → IEC 104": {
    "EN": "MMS → IEC 104",
    "TE": "MMS → IEC 104 (మ్యాపింగ్)",
    "TA": "MMS → IEC 104 (மாற்றம்)",
    "HI": "MMS → IEC 104 (मैपिंग)",
    "PT": "MMS → IEC 104 (Conversão)",
    "KO": "MMS → IEC 104 (변환)",
    "FR": "MMS → IEC 104 (Passerelle)",
    "JA": "MMS → IEC 104（変換）"
  },
  "MMS → IEC 104:": {
    "EN": "MMS → IEC 104:",
    "TE": "MMS → IEC 104 (మ్యాపింగ్):",
    "TA": "MMS → IEC 104 (மாற்றம்):",
    "HI": "MMS → IEC 104 (मैपिंग):",
    "PT": "MMS → IEC 104 (Conversão):",
    "KO": "MMS → IEC 104 (변환):",
    "FR": "MMS → IEC 104 (Passerelle):",
    "JA": "MMS → IEC 104（変換）:"
  },
  "52 CB (Dbpos)": {
    "EN": "52 CB (Dbpos)",
    "TE": "52 CB (Dbpos స్థితి)",
    "TA": "52 CB (Dbpos நிலை)",
    "HI": "52 CB (Dbpos स्थिति)",
    "PT": "52 DJ (Dbpos)",
    "KO": "52 차단기 (Dbpos)",
    "FR": "52 DJ (Dbpos)",
    "JA": "52 遮断器 (Dbpos)"
  },
  "52 CB (Dbpos):": {
    "EN": "52 CB (Dbpos):",
    "TE": "52 CB (Dbpos స్థితి):",
    "TA": "52 CB (Dbpos நிலை):",
    "HI": "52 CB (Dbpos स्थिति):",
    "PT": "52 DJ (Dbpos):",
    "KO": "52 차단기 (Dbpos):",
    "FR": "52 DJ (Dbpos):",
    "JA": "52 遮断器 (Dbpos):"
  },
  "Earth Switch": {
    "EN": "Earth Switch",
    "TE": "ఎర్త్ స్విచ్",
    "TA": "எர்த் சுவிட்ச்",
    "HI": "अर्थ स्विच",
    "PT": "Chave de Aterramento",
    "KO": "접지 개폐기",
    "FR": "Sectionneur de Terre",
    "JA": "接地開閉器"
  },
  "Earth Switch:": {
    "EN": "Earth Switch:",
    "TE": "ఎర్త్ స్విచ్:",
    "TA": "எர்த் சுவிட்ச்:",
    "HI": "अर्थ स्विच:",
    "PT": "Chave de Aterramento:",
    "KO": "접지 개폐기:",
    "FR": "Sectionneur de Terre:",
    "JA": "接地開閉器:"
  },
  "Bus Isolator": {
    "EN": "Bus Isolator",
    "TE": "బస్ ఐసోలేటర్",
    "TA": "பஸ் ஐசோலேட்டர்",
    "HI": "बस आइसोलेटर",
    "PT": "Seccionadora de Barra",
    "KO": "모선 단로기",
    "FR": "Sectionneur de Barre",
    "JA": "母線断路器"
  },
  "Bus Isolator:": {
    "EN": "Bus Isolator:",
    "TE": "బస్ ఐసోలేటర్:",
    "TA": "பஸ் ஐசோலேட்டர்:",
    "HI": "बस आइसोलेटर:",
    "PT": "Seccionadora de Barra:",
    "KO": "모선 단로기:",
    "FR": "Sectionneur de Barre:",
    "JA": "母線断路器:"
  },
  "Bus Transfer": {
    "EN": "Bus Transfer",
    "TE": "బస్ ట్రాన్స్‌ఫర్",
    "TA": "பஸ் மாற்றம்",
    "HI": "बस ट्रांसफर",
    "PT": "Transferência de Barra",
    "KO": "모선 절체",
    "FR": "Transfert de Barres",
    "JA": "母線切替"
  },
  "Bus Transfer:": {
    "EN": "Bus Transfer:",
    "TE": "బస్ ట్రాన్స్‌ఫర్:",
    "TA": "பஸ் மாற்றம்:",
    "HI": "बस ट्रांसफर:",
    "PT": "Transferência de Barra:",
    "KO": "모선 절체:",
    "FR": "Transfert de Barres:",
    "JA": "母線切替:"
  },
  "Transformers": {
    "EN": "Transformers",
    "TE": "ట్రాన్స్‌ఫార్మర్లు",
    "TA": "மின்மாற்றிகள்",
    "HI": "ट्रांसफॉर्मर",
    "PT": "Transformadores",
    "KO": "변압기",
    "FR": "Transformateurs",
    "JA": "変圧器"
  },
  "Transformers:": {
    "EN": "Transformers:",
    "TE": "ట్రాన్స్‌ఫార్మర్లు:",
    "TA": "மின்மாற்றிகள்:",
    "HI": "ट्रांसफॉर्मर:",
    "PT": "Transformadores:",
    "KO": "변압기:",
    "FR": "Transformateurs:",
    "JA": "変圧器:"
  },
  "Disconnector": {
    "EN": "Disconnector",
    "TE": "ఐసోలేటర్",
    "TA": "பிரிப்பான்",
    "HI": "डिस्कनेक्टर",
    "PT": "Seccionadora",
    "KO": "단로기",
    "FR": "Sectionneur",
    "JA": "断路器"
  },
  "Disconnector:": {
    "EN": "Disconnector:",
    "TE": "ఐసోలేటర్:",
    "TA": "பிரிப்பான்:",
    "HI": "डिस्कनेक्टर:",
    "PT": "Seccionadora:",
    "KO": "단로기:",
    "FR": "Sectionneur:",
    "JA": "断路器:"
  },
  "Interlocking": {
    "EN": "Interlocking",
    "TE": "ఇంటర్‌లాకింగ్",
    "TA": "இன்டர்லாக்கிங்",
    "HI": "इंटरलॉकिंग",
    "PT": "Intertravamento",
    "KO": "인터록킹",
    "FR": "Verrouillage",
    "JA": "インターロック"
  },
  "Interlocking:": {
    "EN": "Interlocking:",
    "TE": "ఇంటర్‌లాకింగ్:",
    "TA": "இன்டர்லாக்கிங்:",
    "HI": "इंटरलॉकिंग:",
    "PT": "Intertravamento:",
    "KO": "인터록킹:",
    "FR": "Verrouillage:",
    "JA": "インターロック:"
  },
  "Architecture": {
    "EN": "Architecture",
    "TE": "ఆర్కిటెక్చర్",
    "TA": "கட்டமைப்பு",
    "HI": "आर्किटेक्चर",
    "PT": "Arquitetura",
    "KO": "아키텍처",
    "FR": "Architecture",
    "JA": "アーキテクチャ"
  },
  "Architecture:": {
    "EN": "Architecture:",
    "TE": "ఆర్కిటెక్చర్:",
    "TA": "கட்டமைப்பு:",
    "HI": "आर्किटेक्चर:",
    "PT": "Arquitetura:",
    "KO": "아키텍처:",
    "FR": "Architecture:",
    "JA": "アーキテクチャ:"
  },
  "Distribution": {
    "EN": "Distribution",
    "TE": "డిస్ట్రిబ్యూషన్",
    "TA": "விநியோகம்",
    "HI": "वितरण",
    "PT": "Distribuição",
    "KO": "배전",
    "FR": "Distribution",
    "JA": "配電"
  },
  "Distribution:": {
    "EN": "Distribution:",
    "TE": "డిస్ట్రిబ్యూషన్:",
    "TA": "விநியோகம்:",
    "HI": "वितरण:",
    "PT": "Distribuição:",
    "KO": "배전:",
    "FR": "Distribution:",
    "JA": "配電:"
  },
  "Disconnected": {
    "EN": "Disconnected",
    "TE": "డిస్‌కనెక్ట్ అయింది",
    "TA": "துண்டிக்கப்பட்டது",
    "HI": "डिस्कनेक्टेड",
    "PT": "Desconectado",
    "KO": "연결 끊김",
    "FR": "Déconnecté",
    "JA": "切断"
  },
  "Disconnected:": {
    "EN": "Disconnected:",
    "TE": "డిస్‌కనెక్ట్ అయింది:",
    "TA": "துண்டிக்கப்பட்டது:",
    "HI": "डिस्कनेक्टेड:",
    "PT": "Desconectado:",
    "KO": "연결 끊김:",
    "FR": "Déconnecté:",
    "JA": "切断:"
  },
  "Night Floods": {
    "EN": "Night Floods",
    "TE": "నైట్ ఫ్లడ్ లైట్లు",
    "TA": "இரவு வெள்ள விளக்குகள்",
    "HI": "नाइट फ्लड लाइट्स",
    "PT": "Refletores Noturnos",
    "KO": "야간 투광등",
    "FR": "Projecteurs de nuit",
    "JA": "夜間投光照明"
  },
  "Night Floods:": {
    "EN": "Night Floods:",
    "TE": "నైట్ ఫ్లడ్ లైట్లు:",
    "TA": "இரவு வெள்ள விளக்குகள்:",
    "HI": "नाइट फ्लड लाइट्स:",
    "PT": "Refletores Noturnos:",
    "KO": "야간 투광등:",
    "FR": "Projecteurs de nuit:",
    "JA": "夜間投光照明:"
  },
  "Broadcast IP": {
    "EN": "Broadcast IP",
    "TE": "బ్రాడ్‌కాస్ట్ IP",
    "TA": "ஒளிபரப்பு IP",
    "HI": "ब्रॉडकास्ट IP",
    "PT": "IP de Broadcast",
    "KO": "브로드캐스트 IP",
    "FR": "IP de diffusion (Broadcast)",
    "JA": "ブロードキャストIP"
  },
  "Broadcast IP:": {
    "EN": "Broadcast IP:",
    "TE": "బ్రాడ్‌కాస్ట్ IP:",
    "TA": "ஒளிபரப்பு IP:",
    "HI": "ब्रॉडकास्ट IP:",
    "PT": "IP de Broadcast:",
    "KO": "브로드캐스트 IP:",
    "FR": "IP de diffusion (Broadcast):",
    "JA": "ブロードキャストIP:"
  },
  "Usable Range": {
    "EN": "Usable Range",
    "TE": "వినియోగ పరిధి",
    "TA": "பயன்படுத்தக்கூடிய வரம்பு",
    "HI": "उपयोगी श्रेणी",
    "PT": "Faixa Utilizável",
    "KO": "사용 가능 범위",
    "FR": "Plage utilisable",
    "JA": "使用可能範囲"
  },
  "Usable Range:": {
    "EN": "Usable Range:",
    "TE": "వినియోగ పరిధి:",
    "TA": "பயன்படுத்தக்கூடிய வரம்பு:",
    "HI": "उपयोगी श्रेणी:",
    "PT": "Faixa Utilizável:",
    "KO": "사용 가능 범위:",
    "FR": "Plage utilisable:",
    "JA": "使用可能範囲:"
  },
  "Usable Hosts": {
    "EN": "Usable Hosts",
    "TE": "వినియోగ హోస్ట్‌లు",
    "TA": "பயன்படுத்தக்கூடிய ஹோஸ்ட்கள்",
    "HI": "उपयोगी होस्ट",
    "PT": "Hosts Utilizáveis",
    "KO": "사용 가능 호스트",
    "FR": "Hôtes utilisables",
    "JA": "使用可能ホスト数"
  },
  "Usable Hosts:": {
    "EN": "Usable Hosts:",
    "TE": "వినియోగ హోస్ట్‌లు:",
    "TA": "பயன்படுத்தக்கூடிய ஹோஸ்ட்கள்:",
    "HI": "उपयोगी होस्ट:",
    "PT": "Hosts Utilizáveis:",
    "KO": "사용 가능 호스트:",
    "FR": "Hôtes utilisables:",
    "JA": "使用可能ホスト数:"
  },
  "IED Identity": {
    "EN": "IED Identity",
    "TE": "IED గుర్తింపు",
    "TA": "IED அடையாளம்",
    "HI": "IED पहचान",
    "PT": "Identidade do IED",
    "KO": "IED 식별 정보",
    "FR": "Identité de l'IED",
    "JA": "IED識別情報"
  },
  "IED Identity:": {
    "EN": "IED Identity:",
    "TE": "IED గుర్తింపు:",
    "TA": "IED அடையாளம்:",
    "HI": "IED पहचान:",
    "PT": "Identidade do IED:",
    "KO": "IED 식별 정보:",
    "FR": "Identité de l'IED:",
    "JA": "IED識別情報:"
  },
  "Access Ports": {
    "EN": "Access Ports",
    "TE": "యాక్సెస్ పోర్టులు",
    "TA": "அணுகல் போர்ட்கள்",
    "HI": "एक्सेस पोर्ट्स",
    "PT": "Portas de Acesso",
    "KO": "액세스 포트",
    "FR": "Ports d'accès",
    "JA": "アクセスポート"
  },
  "Access Ports:": {
    "EN": "Access Ports:",
    "TE": "యాక్సెస్ పోర్టులు:",
    "TA": "அணுகல் போர்ட்கள்:",
    "HI": "एक्सेस पोर्ट्स:",
    "PT": "Portas de Acesso:",
    "KO": "액세스 포트:",
    "FR": "Ports d'accès:",
    "JA": "アクセスポート:"
  },
  "Input Module": {
    "EN": "Input Module",
    "TE": "ఇన్‌పుట్ మాడ్యూల్",
    "TA": "உள்ளீட்டுத் தொகுதி",
    "HI": "इनपुट मॉड्यूल",
    "PT": "Módulo de Entrada",
    "KO": "입력 모듈",
    "FR": "Module d'entrée",
    "JA": "入力モジュール"
  },
  "Input Module:": {
    "EN": "Input Module:",
    "TE": "ఇన్‌పుట్ మాడ్యూల్:",
    "TA": "உள்ளீட்டுத் தொகுதி:",
    "HI": "इनपुट मॉड्यूल:",
    "PT": "Módulo de Entrada:",
    "KO": "입력 모듈:",
    "FR": "Module d'entrée:",
    "JA": "入力モジュール:"
  },
  "Cheat Sheets": {
    "EN": "Cheat Sheets",
    "TE": "చీట్ షీట్లు",
    "TA": "குறிப்புத் தாள்கள்",
    "HI": "चीट शीट्स",
    "PT": "Folhas de Referência",
    "KO": "핵심 요약표",
    "FR": "Fiches mémo",
    "JA": "チートシート"
  },
  "Cheat Sheets:": {
    "EN": "Cheat Sheets:",
    "TE": "చీట్ షీట్లు:",
    "TA": "குறிப்புத் தாள்கள்:",
    "HI": "चीट शीट्स:",
    "PT": "Folhas de Referência:",
    "KO": "핵심 요약표:",
    "FR": "Fiches mémo:",
    "JA": "チートシート:"
  },
  "Differential": {
    "EN": "Differential",
    "TE": "డిఫరెన్షియల్",
    "TA": "வேறுபாட்டு (Differential)",
    "HI": "डिफरेंशियल",
    "PT": "Diferencial",
    "KO": "차동 (Differential)",
    "FR": "Différentiel",
    "JA": "差動"
  },
  "Differential:": {
    "EN": "Differential:",
    "TE": "డిఫరెన్షియల్:",
    "TA": "வேறுபாட்டு (Differential):",
    "HI": "डिफरेंशियल:",
    "PT": "Diferencial:",
    "KO": "차동 (Differential):",
    "FR": "Différentiel:",
    "JA": "差動:"
  },
  "Synchrocheck": {
    "EN": "Synchrocheck",
    "TE": "సింక్రోచెక్",
    "TA": "ஒத்திசைவு சரிபார்ப்பு",
    "HI": "सिंक्रोचेक",
    "PT": "Verificação de Sincronismo",
    "KO": "동기검정",
    "FR": "Contrôle de synchronisme",
    "JA": "同期検定"
  },
  "Synchrocheck:": {
    "EN": "Synchrocheck:",
    "TE": "సింక్రోచెక్:",
    "TA": "ஒத்திசைவு சரிபார்ப்பு:",
    "HI": "सिंक्रोचेक:",
    "PT": "Verificação de Sincronismo:",
    "KO": "동기검정:",
    "FR": "Contrôle de synchronisme:",
    "JA": "同期検定:"
  },
  "Interruption": {
    "EN": "Interruption",
    "TE": "అంతరాయం",
    "TA": "தடை",
    "HI": "व्यवधान",
    "PT": "Interrupção",
    "KO": "중단 시간",
    "FR": "Interruption de service",
    "JA": "瞬断時間"
  },
  "Interruption:": {
    "EN": "Interruption:",
    "TE": "అంతరాయం:",
    "TA": "தடை:",
    "HI": "व्यवधान:",
    "PT": "Interrupção:",
    "KO": "중단 시간:",
    "FR": "Interruption de service:",
    "JA": "瞬断時間:"
  },
  "Measurements": {
    "EN": "Measurements",
    "TE": "కొలతలు",
    "TA": "அளவீடுகள்",
    "HI": "माप",
    "PT": "Medições",
    "KO": "계측값",
    "FR": "Mesures",
    "JA": "計測値"
  },
  "Measurements:": {
    "EN": "Measurements:",
    "TE": "కొలతలు:",
    "TA": "அளவீடுகள்:",
    "HI": "माप:",
    "PT": "Medições:",
    "KO": "계측값:",
    "FR": "Mesures:",
    "JA": "計測値:"
  },
  "Transmission": {
    "EN": "Transmission",
    "TE": "ట్రాన్స్‌మిషన్",
    "TA": "பரிமாற்றம்",
    "HI": "पारेषण",
    "PT": "Transmissão",
    "KO": "송전/전송",
    "FR": "Transmission",
    "JA": "送電・伝送"
  },
  "Transmission:": {
    "EN": "Transmission:",
    "TE": "ట్రాన్స్‌మిషన్:",
    "TA": "பரிமாற்றம்:",
    "HI": "पारेषण:",
    "PT": "Transmissão:",
    "KO": "송전/전송:",
    "FR": "Transmission:",
    "JA": "送電・伝送:"
  },
  "IEC-104 Link": {
    "EN": "IEC-104 Link",
    "TE": "IEC-104 లింక్",
    "TA": "IEC-104 இணைப்பு",
    "HI": "IEC-104 लिंक",
    "PT": "Enlace IEC-104",
    "KO": "IEC-104 링크",
    "FR": "Liaison IEC-104",
    "JA": "IEC-104 リンク"
  },
  "IEC-104 Link:": {
    "EN": "IEC-104 Link:",
    "TE": "IEC-104 లింక్:",
    "TA": "IEC-104 இணைப்பு:",
    "HI": "IEC-104 लिंक:",
    "PT": "Enlace IEC-104:",
    "KO": "IEC-104 링크:",
    "FR": "Liaison IEC-104:",
    "JA": "IEC-104 リンク:"
  },
  "CB Pos [ST]:": {
    "EN": "CB Pos [ST]:",
    "TE": "CB స్థానం [ST]:",
    "TA": "CB நிலை [ST]:",
    "HI": "CB स्थिति [ST]:",
    "PT": "Pos. DJ [ST]:",
    "KO": "차단기 위치 [ST]:",
    "FR": "Pos. DJ [ST] :",
    "JA": "遮断器位置 [ST]:"
  },
  "Bus Coupler": {
    "EN": "Bus Coupler",
    "TE": "బస్ కప్లర్",
    "TA": "பஸ் கப்ளர்",
    "HI": "बस कपलर",
    "PT": "Disjuntor de Interligação",
    "KO": "모선 연락 차단기",
    "FR": "Couplage de Barres",
    "JA": "母線連絡遮断器"
  },
  "Bus Coupler:": {
    "EN": "Bus Coupler:",
    "TE": "బస్ కప్లర్:",
    "TA": "பஸ் கப்ளர்:",
    "HI": "बस कपलर:",
    "PT": "Disjuntor de Interligação:",
    "KO": "모선 연락 차단기:",
    "FR": "Couplage de Barres:",
    "JA": "母線連絡遮断器:"
  },
  "Execute All": {
    "EN": "Execute All",
    "TE": "అన్నీ అమలు చేయండి",
    "TA": "அனைத்தையும் இயக்கு",
    "HI": "सभी निष्पादित करें",
    "PT": "Executar Tudo",
    "KO": "전체 실행",
    "FR": "Tout Exécuter",
    "JA": "すべて実行"
  },
  "Execute All:": {
    "EN": "Execute All:",
    "TE": "అన్నీ అమలు చేయండి:",
    "TA": "அனைத்தையும் இயக்கு:",
    "HI": "सभी निष्पादित करें:",
    "PT": "Executar Tudo:",
    "KO": "전체 실행:",
    "FR": "Tout Exécuter:",
    "JA": "すべて実行:"
  },
  "Engineering": {
    "EN": "Engineering",
    "TE": "ఇంజనీరింగ్",
    "TA": "பொறியியல்",
    "HI": "इंजीनियरिंग",
    "PT": "Engenharia",
    "KO": "엔지니어링",
    "FR": "Ingénierie",
    "JA": "エンジニアリング"
  },
  "Engineering:": {
    "EN": "Engineering:",
    "TE": "ఇంజనీరింగ్:",
    "TA": "பொறியியல்:",
    "HI": "इंजीनियरिंग:",
    "PT": "Engenharia:",
    "KO": "엔지니어링:",
    "FR": "Ingénierie:",
    "JA": "エンジニアリング:"
  },
  "Transformer": {
    "EN": "Transformer",
    "TE": "ట్రాన్స్‌ఫార్మర్",
    "TA": "மின்மாற்றி",
    "HI": "ट्रांसफॉर्मर",
    "PT": "Transformador",
    "KO": "변압기",
    "FR": "Transformateur",
    "JA": "変圧器"
  },
  "Transformer:": {
    "EN": "Transformer:",
    "TE": "ట్రాన్స్‌ఫార్మర్:",
    "TA": "மின்மாற்றி:",
    "HI": "ट्रांसफॉर्मर:",
    "PT": "Transformador:",
    "KO": "변압기:",
    "FR": "Transformateur:",
    "JA": "変圧器:"
  },
  "Diagnostics": {
    "EN": "Diagnostics",
    "TE": "డయాగ్నస్టిక్స్",
    "TA": "கண்டறிதல்",
    "HI": "निदान",
    "PT": "Diagnósticos",
    "KO": "진단",
    "FR": "Diagnostic système",
    "JA": "診断"
  },
  "Diagnostics:": {
    "EN": "Diagnostics:",
    "TE": "డయాగ్నస్టిక్స్:",
    "TA": "கண்டறிதல்:",
    "HI": "निदान:",
    "PT": "Diagnósticos:",
    "KO": "진단:",
    "FR": "Diagnostic système:",
    "JA": "診断:"
  },
  "Preparation": {
    "EN": "Preparation",
    "TE": "ప్రిపరేషన్",
    "TA": "தயாரிப்பு",
    "HI": "तैयारी",
    "PT": "Preparação",
    "KO": "준비",
    "FR": "Préparation",
    "JA": "対策・準備"
  },
  "Preparation:": {
    "EN": "Preparation:",
    "TE": "ప్రిపరేషన్:",
    "TA": "தயாரிப்பு:",
    "HI": "तैयारी:",
    "PT": "Preparação:",
    "KO": "준비:",
    "FR": "Préparation:",
    "JA": "対策・準備:"
  },
  "Description": {
    "EN": "Description",
    "TE": "వివరణ",
    "TA": "விளக்கம்",
    "HI": "विवरण",
    "PT": "Descrição",
    "KO": "설명",
    "FR": "Description",
    "JA": "説明"
  },
  "Description:": {
    "EN": "Description:",
    "TE": "వివరణ:",
    "TA": "விளக்கம்:",
    "HI": "विवरण:",
    "PT": "Descrição:",
    "KO": "설명:",
    "FR": "Description:",
    "JA": "説明:"
  },
  "Association": {
    "EN": "Association",
    "TE": "అసోసియేషన్",
    "TA": "இணைப்பு",
    "HI": "एसोसिएशन",
    "PT": "Associação",
    "KO": "연결",
    "FR": "Association",
    "JA": "アソシエーション"
  },
  "Association:": {
    "EN": "Association:",
    "TE": "అసోసియేషన్:",
    "TA": "இணைப்பு:",
    "HI": "एसोसिएशन:",
    "PT": "Associação:",
    "KO": "연결:",
    "FR": "Association:",
    "JA": "アソシエーション:"
  },
  "Certificate": {
    "EN": "Certificate",
    "TE": "సర్టిఫికేట్",
    "TA": "சான்றிதழ்",
    "HI": "प्रमाणपत्र",
    "PT": "Certificado",
    "KO": "인증서",
    "FR": "Certificat",
    "JA": "証明書"
  },
  "Certificate:": {
    "EN": "Certificate:",
    "TE": "సర్టిఫికేట్:",
    "TA": "சான்றிதழ்:",
    "HI": "प्रमाणपत्र:",
    "PT": "Certificado:",
    "KO": "인증서:",
    "FR": "Certificat:",
    "JA": "証明書:"
  },
  "Residential": {
    "EN": "Residential",
    "TE": "నివాస (Residential)",
    "TA": "குடியிருப்பு",
    "HI": "आवासीय",
    "PT": "Residencial",
    "KO": "주거용",
    "FR": "Résidentiel",
    "JA": "住宅"
  },
  "Residential:": {
    "EN": "Residential:",
    "TE": "నివాస (Residential):",
    "TA": "குடியிருப்பு:",
    "HI": "आवासीय:",
    "PT": "Residencial:",
    "KO": "주거용:",
    "FR": "Résidentiel:",
    "JA": "住宅:"
  },
  "WAN Routing": {
    "EN": "WAN Routing",
    "TE": "WAN రౌటింగ్",
    "TA": "WAN திசைவியல்",
    "HI": "WAN रूटिंग",
    "PT": "Roteamento WAN",
    "KO": "WAN 라우팅",
    "FR": "Routage WAN",
    "JA": "WANルーティング"
  },
  "WAN Routing:": {
    "EN": "WAN Routing:",
    "TE": "WAN రౌటింగ్:",
    "TA": "WAN திசைவியல்:",
    "HI": "WAN रूटिंग:",
    "PT": "Roteamento WAN:",
    "KO": "WAN 라우팅:",
    "FR": "Routage WAN:",
    "JA": "WANルーティング:"
  },
  "Comm Health": {
    "EN": "Comm Health",
    "TE": "కమ్యూనికేషన్ స్థితి",
    "TA": "தொடர்பு நிலை",
    "HI": "संचार स्वास्थ्य",
    "PT": "Saúde da Com.",
    "KO": "통신 상태",
    "FR": "Santé comm.",
    "JA": "通信健全性"
  },
  "Comm Health:": {
    "EN": "Comm Health:",
    "TE": "కమ్యూనికేషన్ స్థితి:",
    "TA": "தொடர்பு நிலை:",
    "HI": "संचार स्वास्थ्य:",
    "PT": "Saúde da Com.:",
    "KO": "통신 상태:",
    "FR": "Santé comm.:",
    "JA": "通信健全性:"
  },
  "Subnet Mask": {
    "EN": "Subnet Mask",
    "TE": "సబ్‌నెట్ మాస్క్",
    "TA": "சப்நெட் மாஸ்க்",
    "HI": "सबनेट मास्क",
    "PT": "Máscara de Sub-rede",
    "KO": "서브넷 마스크",
    "FR": "Masque de sous-réseau",
    "JA": "サブネットマスク"
  },
  "Subnet Mask:": {
    "EN": "Subnet Mask:",
    "TE": "సబ్‌నెట్ మాస్క్:",
    "TA": "சப்நெட் மாஸ்க்:",
    "HI": "सबनेट मास्क:",
    "PT": "Máscara de Sub-rede:",
    "KO": "서브넷 마스크:",
    "FR": "Masque de sous-réseau:",
    "JA": "サブネットマスク:"
  },
  "Subnet mask": {
    "EN": "Subnet mask",
    "TE": "సబ్‌నెట్ మాస్క్",
    "TA": "சப்நெட் மாஸ்க்",
    "HI": "सबनेट मास्क",
    "PT": "Máscara de sub-rede",
    "KO": "서브넷 마스크",
    "FR": "Masque de sous-réseau",
    "JA": "サブネットマスク"
  },
  "Subnet mask:": {
    "EN": "Subnet mask:",
    "TE": "సబ్‌నెట్ మాస్క్:",
    "TA": "சப்நெட் மாஸ்க்:",
    "HI": "सबनेट मास्क:",
    "PT": "Máscara de sub-rede:",
    "KO": "서브넷 마스크:",
    "FR": "Masque de sous-réseau:",
    "JA": "サブネットマスク:"
  },
  "Phase Shift": {
    "EN": "Phase Shift",
    "TE": "ఫేజ్ షిఫ్ట్",
    "TA": "கட்ட நகர்வு",
    "HI": "फ़ेज़ शिफ्ट",
    "PT": "Deslocamento de Fase",
    "KO": "위상 변이",
    "FR": "Déphasage",
    "JA": "位相シフト"
  },
  "Phase Shift:": {
    "EN": "Phase Shift:",
    "TE": "ఫేజ్ షిఫ్ట్:",
    "TA": "கட்ட நகர்வு:",
    "HI": "फ़ेज़ शिफ्ट:",
    "PT": "Deslocamento de Fase:",
    "KO": "위상 변이:",
    "FR": "Déphasage:",
    "JA": "位相シフト:"
  },
  "Trunk Ports": {
    "EN": "Trunk Ports",
    "TE": "ట్రంక్ పోర్టులు",
    "TA": "டிரங்க் போர்ட்கள்",
    "HI": "ट्रंक पोर्ट्स",
    "PT": "Portas Trunk",
    "KO": "트렁크 포트",
    "FR": "Ports trunk",
    "JA": "トランクポート"
  },
  "Trunk Ports:": {
    "EN": "Trunk Ports:",
    "TE": "ట్రంక్ పోర్టులు:",
    "TA": "டிரங்க் போர்ட்கள்:",
    "HI": "ट्रंक पोर्ट्स:",
    "PT": "Portas Trunk:",
    "KO": "트렁크 포트:",
    "FR": "Ports trunk:",
    "JA": "トランクポート:"
  },
  "Process Bus": {
    "EN": "Process Bus",
    "TE": "ప్రాసెస్ బస్",
    "TA": "செயல்முறை பஸ்",
    "HI": "प्रोसेस बस",
    "PT": "Barramento de Processo",
    "KO": "프로세스 버스",
    "FR": "Bus de processus",
    "JA": "プロセスバス"
  },
  "Process Bus:": {
    "EN": "Process Bus:",
    "TE": "ప్రాసెస్ బస్:",
    "TA": "செயல்முறை பஸ்:",
    "HI": "प्रोसेस बस:",
    "PT": "Barramento de Processo:",
    "KO": "프로세스 버스:",
    "FR": "Bus de processus:",
    "JA": "プロセスバス:"
  },
  "Termination": {
    "EN": "Termination",
    "TE": "టెర్మినేషన్",
    "TA": "முடிவு",
    "HI": "टर्मिनेशन",
    "PT": "Terminação",
    "KO": "종단 (Termination)",
    "FR": "Terminaison",
    "JA": "終端"
  },
  "Termination:": {
    "EN": "Termination:",
    "TE": "టెర్మినేషన్:",
    "TA": "முடிவு:",
    "HI": "टर्मिनेशन:",
    "PT": "Terminação:",
    "KO": "종단 (Termination):",
    "FR": "Terminaison:",
    "JA": "終端:"
  },
  "Maintenance": {
    "EN": "Maintenance",
    "TE": "మెయింటెనెన్స్",
    "TA": "பராமரிப்பு",
    "HI": "रखरखाव",
    "PT": "Manutenção",
    "KO": "유지보수",
    "FR": "Maintenance préventive",
    "JA": "保守・メンテナンス"
  },
  "Maintenance:": {
    "EN": "Maintenance:",
    "TE": "మెయింటెనెన్స్:",
    "TA": "பராமரிப்பு:",
    "HI": "रखरखाव:",
    "PT": "Manutenção:",
    "KO": "유지보수:",
    "FR": "Maintenance préventive:",
    "JA": "保守・メンテナンス:"
  },
  "Explanation": {
    "EN": "Explanation",
    "TE": "వివరణ",
    "TA": "விளக்கம்",
    "HI": "स्पष्टीकरण",
    "PT": "Explicação",
    "KO": "해설",
    "FR": "Explication",
    "JA": "解説"
  },
  "Explanation:": {
    "EN": "Explanation:",
    "TE": "వివరణ:",
    "TA": "விளக்கம்:",
    "HI": "स्पष्टीकरण:",
    "PT": "Explicação:",
    "KO": "해설:",
    "FR": "Explication:",
    "JA": "解説:"
  },
  "Supervision": {
    "EN": "Supervision",
    "TE": "సూపర్‌విజన్",
    "TA": "கண்காணிப்பு",
    "HI": "निगरानी",
    "PT": "Supervisão",
    "KO": "감시",
    "FR": "Supervision",
    "JA": "監視"
  },
  "Supervision:": {
    "EN": "Supervision:",
    "TE": "సూపర్‌విజన్:",
    "TA": "கண்காணிப்பு:",
    "HI": "निगरानी:",
    "PT": "Supervisão:",
    "KO": "감시:",
    "FR": "Supervision:",
    "JA": "監視:"
  },
  "Workstation": {
    "EN": "Workstation",
    "TE": "వర్క్‌స్టేషన్",
    "TA": "பணிநிலையம்",
    "HI": "वर्कस्टेशन",
    "PT": "Estação de Trabalho",
    "KO": "워크스테이션",
    "FR": "Poste de travail",
    "JA": "ワークステーション"
  },
  "Workstation:": {
    "EN": "Workstation:",
    "TE": "వర్క్‌స్టేషన్:",
    "TA": "பணிநிலையம்:",
    "HI": "वर्कस्टेशन:",
    "PT": "Estação de Trabalho:",
    "KO": "워크스테이션:",
    "FR": "Poste de travail:",
    "JA": "ワークステーション:"
  },
  "Earth Sw Q8": {
    "EN": "Earth Sw Q8",
    "TE": "ఎర్త్ స్విచ్ Q8",
    "TA": "எர்த் சுவிட்ச் Q8",
    "HI": "अर्थ स्विच Q8",
    "PT": "Chave Terra Q8",
    "KO": "접지 개폐기 Q8",
    "FR": "Sectionneur terre Q8",
    "JA": "接地開閉器 Q8"
  },
  "Earth Sw Q8:": {
    "EN": "Earth Sw Q8:",
    "TE": "ఎర్త్ స్విచ్ Q8:",
    "TA": "எர்த் சுவிட்ச் Q8:",
    "HI": "अर्थ स्विच Q8:",
    "PT": "Chave Terra Q8:",
    "KO": "접지 개폐기 Q8:",
    "FR": "Sectionneur terre Q8:",
    "JA": "接地開閉器 Q8:"
  },
  "Telecontrol": {
    "EN": "Telecontrol",
    "TE": "టెలికంట్రోల్",
    "TA": "தொலைக்கட்டுப்பாடு",
    "HI": "टेलीकंट्रोल",
    "PT": "Telecontrole",
    "KO": "원격제어",
    "FR": "Téléconduite",
    "JA": "遠方監視制御"
  },
  "Telecontrol:": {
    "EN": "Telecontrol:",
    "TE": "టెలికంట్రోల్:",
    "TA": "தொலைக்கட்டுப்பாடு:",
    "HI": "टेलीकंट्रोल:",
    "PT": "Telecontrole:",
    "KO": "원격제어:",
    "FR": "Téléconduite:",
    "JA": "遠方監視制御:"
  },
  "Reset View": {
    "EN": "Reset View",
    "TE": "వ్యూ రీసెట్ చేయండి",
    "TA": "காட்சியை மீட்டமை",
    "HI": "दृश्य रीसेट करें",
    "PT": "Redefinir Visualização",
    "KO": "화면 초기화",
    "FR": "Réinitialiser la Vue",
    "JA": "表示をリセット"
  },
  "Reset View:": {
    "EN": "Reset View:",
    "TE": "వ్యూ రీసెట్ చేయండి:",
    "TA": "காட்சியை மீட்டமை:",
    "HI": "दृश्य रीसेट करें:",
    "PT": "Redefinir Visualização:",
    "KO": "화면 초기화:",
    "FR": "Réinitialiser la Vue:",
    "JA": "表示をリセット:"
  },
  "Reset view": {
    "EN": "Reset view",
    "TE": "వ్యూ రీసెట్ చేయండి",
    "TA": "காட்சியை மீட்டமை",
    "HI": "दृश्य रीसेट करें",
    "PT": "Redefinir visualização",
    "KO": "화면 초기화",
    "FR": "Réinitialiser la vue",
    "JA": "表示をリセット"
  },
  "Reset view:": {
    "EN": "Reset view:",
    "TE": "వ్యూ రీసెట్ చేయండి:",
    "TA": "காட்சியை மீட்டமை:",
    "HI": "दृश्य रीसेट करें:",
    "PT": "Redefinir visualização:",
    "KO": "화면 초기화:",
    "FR": "Réinitialiser la vue:",
    "JA": "表示をリセット:"
  },
  "Substation": {
    "EN": "Substation",
    "TE": "సబ్‌స్టేషన్",
    "TA": "துணை மின் நிலையம்",
    "HI": "सबस्टेशन",
    "PT": "Subestação",
    "KO": "변전소",
    "FR": "Poste électrique",
    "JA": "変電所"
  },
  "Substation:": {
    "EN": "Substation:",
    "TE": "సబ్‌స్టేషన్:",
    "TA": "துணை மின் நிலையம்:",
    "HI": "सबस्टेशन:",
    "PT": "Subestação:",
    "KO": "변전소:",
    "FR": "Poste électrique:",
    "JA": "変電所:"
  },
  "Automation": {
    "EN": "Automation",
    "TE": "ఆటోమేషన్",
    "TA": "தன்னியக்கம்",
    "HI": "ऑटोमेशन",
    "PT": "Automação",
    "KO": "자동화",
    "FR": "Automatisation",
    "JA": "オートメーション"
  },
  "Automation:": {
    "EN": "Automation:",
    "TE": "ఆటోమేషన్:",
    "TA": "தன்னியக்கம்:",
    "HI": "ऑटोमेशन:",
    "PT": "Automação:",
    "KO": "자동화:",
    "FR": "Automatisation:",
    "JA": "オートメーション:"
  },
  "Laboratory": {
    "EN": "Laboratory",
    "TE": "ల్యాబొరేటరీ",
    "TA": "ஆய்வகம்",
    "HI": "प्रयोगशाला",
    "PT": "Laboratório",
    "KO": "실험실",
    "FR": "Laboratoire",
    "JA": "ラボ"
  },
  "Laboratory:": {
    "EN": "Laboratory:",
    "TE": "ల్యాబొరేటరీ:",
    "TA": "ஆய்வகம்:",
    "HI": "प्रयोगशाला:",
    "PT": "Laboratório:",
    "KO": "실험실:",
    "FR": "Laboratoire:",
    "JA": "ラボ:"
  },
  "Networking": {
    "EN": "Networking",
    "TE": "నెట్‌వర్కింగ్",
    "TA": "நெட்வொர்க்கிங்",
    "HI": "नेटवर्किंग",
    "PT": "Redes",
    "KO": "네트워킹",
    "FR": "Réseautage",
    "JA": "ネットワーキング"
  },
  "Networking:": {
    "EN": "Networking:",
    "TE": "నెట్‌వర్కింగ్:",
    "TA": "நெட்வொர்க்கிங்:",
    "HI": "नेटवर्किंग:",
    "PT": "Redes:",
    "KO": "네트워킹:",
    "FR": "Réseautage:",
    "JA": "ネットワーキング:"
  },
  "Switchyard": {
    "EN": "Switchyard",
    "TE": "స్విచ్‌యార్డ్",
    "TA": "சுவிட்ச்யார்ட்",
    "HI": "स्विचयार्ड",
    "PT": "Pátio de manobras",
    "KO": "스위치야드",
    "FR": "Poste extérieur",
    "JA": "スイッチヤード"
  },
  "Switchyard:": {
    "EN": "Switchyard:",
    "TE": "స్విచ్‌యార్డ్:",
    "TA": "சுவிட்ச்யார்ட்:",
    "HI": "स्विचयार्ड:",
    "PT": "Pátio de manobras:",
    "KO": "스위치야드:",
    "FR": "Poste extérieur:",
    "JA": "スイッチヤード:"
  },
  "Switchgear": {
    "EN": "Switchgear",
    "TE": "స్విచ్‌గేర్",
    "TA": "சுவிட்ச்கியர்",
    "HI": "स्विचगियर",
    "PT": "Painel de manobra",
    "KO": "스위치기어",
    "FR": "Appareillage",
    "JA": "スイッチギヤ"
  },
  "Switchgear:": {
    "EN": "Switchgear:",
    "TE": "స్విచ్‌గేర్:",
    "TA": "சுவிட்ச்கியர்:",
    "HI": "स्विचगियर:",
    "PT": "Painel de manobra:",
    "KO": "스위치기어:",
    "FR": "Appareillage:",
    "JA": "スイッチギヤ:"
  },
  "Protection": {
    "EN": "Protection",
    "TE": "ప్రొటెక్షన్",
    "TA": "பாதுகாப்பு",
    "HI": "प्रोटेक्शन",
    "PT": "Proteção",
    "KO": "보호",
    "FR": "Protection",
    "JA": "保護"
  },
  "Protection:": {
    "EN": "Protection:",
    "TE": "ప్రొటెక్షన్:",
    "TA": "பாதுகாப்பு:",
    "HI": "प्रोटेक्शन:",
    "PT": "Proteção:",
    "KO": "보호:",
    "FR": "Protection:",
    "JA": "保護:"
  },
  "Simulation": {
    "EN": "Simulation",
    "TE": "సిమ్యులేషన్",
    "TA": "உருவகப்படுத்தல்",
    "HI": "सिमुलेशन",
    "PT": "Simulação",
    "KO": "시뮬레이션",
    "FR": "Simulation",
    "JA": "シミュレーション"
  },
  "Simulation:": {
    "EN": "Simulation:",
    "TE": "సిమ్యులేషన్:",
    "TA": "உருவகப்படுத்தல்:",
    "HI": "सिमुलेशन:",
    "PT": "Simulação:",
    "KO": "시뮬레이션:",
    "FR": "Simulation:",
    "JA": "シミュレーション:"
  },
  "Configured": {
    "EN": "Configured",
    "TE": "కాన్ఫిగర్ చేసిన",
    "TA": "கட்டமைக்கப்பட்ட",
    "HI": "कॉन्फ़िगर किया गया",
    "PT": "Configurado",
    "KO": "구성됨",
    "FR": "Configuré",
    "JA": "構成済"
  },
  "Configured:": {
    "EN": "Configured:",
    "TE": "కాన్ఫిగర్ చేసిన:",
    "TA": "கட்டமைக்கப்பட்ட:",
    "HI": "कॉन्फ़िगर किया गया:",
    "PT": "Configurado:",
    "KO": "구성됨:",
    "FR": "Configuré:",
    "JA": "構成済:"
  },
  "Diagnostic": {
    "EN": "Diagnostic",
    "TE": "డయాగ్నస్టిక్",
    "TA": "கண்டறியும்",
    "HI": "नैदानिक",
    "PT": "Diagnóstico",
    "KO": "진단",
    "FR": "Diagnostic",
    "JA": "診断"
  },
  "Diagnostic:": {
    "EN": "Diagnostic:",
    "TE": "డయాగ్నస్టిక్:",
    "TA": "கண்டறியும்:",
    "HI": "नैदानिक:",
    "PT": "Diagnóstico:",
    "KO": "진단:",
    "FR": "Diagnostic:",
    "JA": "診断:"
  },
  "Topologies": {
    "EN": "Topologies",
    "TE": "టోపాలజీలు",
    "TA": "இடவியல்கள்",
    "HI": "टोपोलॉजी",
    "PT": "Topologias",
    "KO": "토폴로지",
    "FR": "Topologies",
    "JA": "トポロジ"
  },
  "Topologies:": {
    "EN": "Topologies:",
    "TE": "టోపాలజీలు:",
    "TA": "இடவியல்கள்:",
    "HI": "टोपोलॉजी:",
    "PT": "Topologias:",
    "KO": "토폴로지:",
    "FR": "Topologies:",
    "JA": "トポロジ:"
  },
  "Redundancy": {
    "EN": "Redundancy",
    "TE": "రిడండెన్సీ",
    "TA": "மிகைமை (Redundancy)",
    "HI": "रिडंडेंसी",
    "PT": "Redundância",
    "KO": "이중화",
    "FR": "Redondance",
    "JA": "冗長성"
  },
  "Redundancy:": {
    "EN": "Redundancy:",
    "TE": "రిడండెన్సీ:",
    "TA": "மிகைமை (Redundancy):",
    "HI": "रिडंडेंसी:",
    "PT": "Redundância:",
    "KO": "이중화:",
    "FR": "Redondance:",
    "JA": "冗長성:"
  },
  "Interfaces": {
    "EN": "Interfaces",
    "TE": "ఇంటర్‌ఫేస్‌లు",
    "TA": "இடைமுகங்கள்",
    "HI": "इंटरफ़ेस",
    "PT": "Interfaces",
    "KO": "인터페이스",
    "FR": "Interfaces",
    "JA": "インターフェース"
  },
  "Interfaces:": {
    "EN": "Interfaces:",
    "TE": "ఇంటర్‌ఫేస్‌లు:",
    "TA": "இடைமுகங்கள்:",
    "HI": "इंटरफ़ेस:",
    "PT": "Interfaces:",
    "KO": "인터페이스:",
    "FR": "Interfaces:",
    "JA": "インターフェース:"
  },
  "Procedures": {
    "EN": "Procedures",
    "TE": "విధానాలు",
    "TA": "செயல்முறைகள்",
    "HI": "प्रक्रियाएँ",
    "PT": "Procedimentos",
    "KO": "절차",
    "FR": "Procédures",
    "JA": "手順"
  },
  "Procedures:": {
    "EN": "Procedures:",
    "TE": "విధానాలు:",
    "TA": "செயல்முறைகள்:",
    "HI": "प्रक्रियाएँ:",
    "PT": "Procedimentos:",
    "KO": "절차:",
    "FR": "Procédures:",
    "JA": "手順:"
  },
  "Subscriber": {
    "EN": "Subscriber",
    "TE": "సబ్‌స్క్రైబర్",
    "TA": "சந்தாதாரர்",
    "HI": "सब्सक्राइबर",
    "PT": "Assinante",
    "KO": "구독자",
    "FR": "Abonné",
    "JA": "サブスクライバー"
  },
  "Subscriber:": {
    "EN": "Subscriber:",
    "TE": "సబ్‌స్క్రైబర్:",
    "TA": "சந்தாதாரர்:",
    "HI": "सब्सक्राइबर:",
    "PT": "Assinante:",
    "KO": "구독자:",
    "FR": "Abonné:",
    "JA": "サブスクライバー:"
  },
  "References": {
    "EN": "References",
    "TE": "రిఫరెన్స్‌లు",
    "TA": "குறிப்புகள்",
    "HI": "संदर्भ",
    "PT": "Referências",
    "KO": "참조",
    "FR": "Références",
    "JA": "参照"
  },
  "References:": {
    "EN": "References:",
    "TE": "రిఫరెన్స్‌లు:",
    "TA": "குறிப்புகள்:",
    "HI": "संदर्भ:",
    "PT": "Referências:",
    "KO": "참조:",
    "FR": "Références:",
    "JA": "参照:"
  },
  "Industrial": {
    "EN": "Industrial",
    "TE": "ఇండస్ట్రియల్",
    "TA": "தொழில்துறை",
    "HI": "औद्योगिक",
    "PT": "Industrial",
    "KO": "산업용",
    "FR": "Industriel",
    "JA": "産業用"
  },
  "Industrial:": {
    "EN": "Industrial:",
    "TE": "ఇండస్ట్రియల్:",
    "TA": "தொழில்துறை:",
    "HI": "औद्योगिक:",
    "PT": "Industrial:",
    "KO": "산업용:",
    "FR": "Industriel:",
    "JA": "産業用:"
  },
  "Root Cause": {
    "EN": "Root Cause",
    "TE": "మూల కారణం",
    "TA": "மூல காரணம்",
    "HI": "मूल कारण",
    "PT": "Causa Raiz",
    "KO": "근본 원인",
    "FR": "Cause racine",
    "JA": "根本原因"
  },
  "Root Cause:": {
    "EN": "Root Cause:",
    "TE": "మూల కారణం:",
    "TA": "மூல காரணம்:",
    "HI": "मूल कारण:",
    "PT": "Causa Raiz:",
    "KO": "근본 원인:",
    "FR": "Cause racine:",
    "JA": "根本原因:"
  },
  "Media Type": {
    "EN": "Media Type",
    "TE": "మీడియా రకం",
    "TA": "ஊடக வகை",
    "HI": "मीडिया प्रकार",
    "PT": "Tipo de Mídia",
    "KO": "미디어 유형",
    "FR": "Type de média",
    "JA": "メディア種別"
  },
  "Media Type:": {
    "EN": "Media Type:",
    "TE": "మీడియా రకం:",
    "TA": "ஊடக வகை:",
    "HI": "मीडिया प्रकार:",
    "PT": "Tipo de Mídia:",
    "KO": "미디어 유형:",
    "FR": "Type de média:",
    "JA": "メディア種別:"
  },
  "IEC Legend": {
    "EN": "IEC Legend",
    "TE": "IEC లెజెండ్",
    "TA": "IEC குறியீட்டு விளக்கம்",
    "HI": "IEC लीजेंड",
    "PT": "Legenda IEC",
    "KO": "IEC 범례",
    "FR": "Légende CEI",
    "JA": "IEC凡例"
  },
  "IEC Legend:": {
    "EN": "IEC Legend:",
    "TE": "IEC లెజెండ్:",
    "TA": "IEC குறியீட்டு விளக்கம்:",
    "HI": "IEC लीजेंड:",
    "PT": "Legenda IEC:",
    "KO": "IEC 범례:",
    "FR": "Légende CEI:",
    "JA": "IEC凡例:"
  },
  "Op Counter": {
    "EN": "Op Counter",
    "TE": "ఆపరేషన్ కౌంటర్",
    "TA": "செயல்பாட்டு எண்ணிக்கை",
    "HI": "ऑपरेशन काउंटर",
    "PT": "Contador de Operações",
    "KO": "동작 횟수 카운터",
    "FR": "Compteur de manœuvres",
    "JA": "動作回数カウンタ"
  },
  "Op Counter:": {
    "EN": "Op Counter:",
    "TE": "ఆపరేషన్ కౌంటర్:",
    "TA": "செயல்பாட்டு எண்ணிக்கை:",
    "HI": "ऑपरेशन काउंटर:",
    "PT": "Contador de Operações:",
    "KO": "동작 횟수 카운터:",
    "FR": "Compteur de manœuvres:",
    "JA": "動作回数カウンタ:"
  },
  "Reactive Q": {
    "EN": "Reactive Q",
    "TE": "రియాక్టివ్ Q",
    "TA": "ரியாக்டிவ் Q",
    "HI": "प्रतिक्रियाशील Q",
    "PT": "Q Reativo",
    "KO": "무효전력 Q",
    "FR": "Puissance réactive Q",
    "JA": "無効電力 Q"
  },
  "Reactive Q:": {
    "EN": "Reactive Q:",
    "TE": "రియాక్టివ్ Q:",
    "TA": "ரியாக்டிவ் Q:",
    "HI": "प्रतिक्रियाशील Q:",
    "PT": "Q Reativo:",
    "KO": "무효전력 Q:",
    "FR": "Puissance réactive Q:",
    "JA": "無効電力 Q:"
  },
  "Apparent S": {
    "EN": "Apparent S",
    "TE": "అపారెంట్ S",
    "TA": "தோற்ற சக்தி S",
    "HI": "आभासी S",
    "PT": "S Aparente",
    "KO": "피상전력 S",
    "FR": "Puissance apparente S",
    "JA": "皮相電力 S"
  },
  "Apparent S:": {
    "EN": "Apparent S:",
    "TE": "అపారెంట్ S:",
    "TA": "தோற்ற சக்தி S:",
    "HI": "आभासी S:",
    "PT": "S Aparente:",
    "KO": "피상전력 S:",
    "FR": "Puissance apparente S:",
    "JA": "皮相電力 S:"
  },
  "Topic-wise": {
    "EN": "Topic-wise",
    "TE": "టాపిక్ వారీగా",
    "TA": "தலைப்பு வாரியாக",
    "HI": "विषय-वार",
    "PT": "Por Tópico",
    "KO": "주제별",
    "FR": "Par sujet",
    "JA": "トピック別"
  },
  "Topic-wise:": {
    "EN": "Topic-wise:",
    "TE": "టాపిక్ వారీగా:",
    "TA": "தலைப்பு வாரியாக:",
    "HI": "विषय-वार:",
    "PT": "Por Tópico:",
    "KO": "주제별:",
    "FR": "Par sujet:",
    "JA": "トピック別:"
  },
  "Forwarding": {
    "EN": "Forwarding",
    "TE": "ఫార్వార్డింగ్",
    "TA": "முன்னனுப்புதல்",
    "HI": "फॉरवर्डिंग",
    "PT": "Encaminhamento",
    "KO": "포워딩",
    "FR": "acheminement",
    "JA": "転送"
  },
  "Forwarding:": {
    "EN": "Forwarding:",
    "TE": "ఫార్వార్డింగ్:",
    "TA": "முன்னனுப்புதல்:",
    "HI": "फॉरवर्डिंग:",
    "PT": "Encaminhamento:",
    "KO": "포워딩:",
    "FR": "acheminement:",
    "JA": "転送:"
  },
  "Permissive": {
    "EN": "Permissive",
    "TE": "పర్మిసివ్",
    "TA": "அனுமதிக்கும்",
    "HI": "अनुमतिप्रद",
    "PT": "Permissivo",
    "KO": "허용 (Permissive)",
    "FR": "Permissif",
    "JA": "許可（パーミッシブ）"
  },
  "Permissive:": {
    "EN": "Permissive:",
    "TE": "పర్మిసివ్:",
    "TA": "அனுமதிக்கும்:",
    "HI": "अनुमतिप्रद:",
    "PT": "Permissivo:",
    "KO": "허용 (Permissive):",
    "FR": "Permissif:",
    "JA": "許可（パーミッシブ）:"
  },
  "Continuity": {
    "EN": "Continuity",
    "TE": "కంటిన్యూటీ",
    "TA": "தொடர்ச்சி",
    "HI": "निरंतरता",
    "PT": "Continuidade",
    "KO": "연속성/도통",
    "FR": "Continuité",
    "JA": "導通・連続性"
  },
  "Continuity:": {
    "EN": "Continuity:",
    "TE": "కంటిన్యూటీ:",
    "TA": "தொடர்ச்சி:",
    "HI": "निरंतरता:",
    "PT": "Continuidade:",
    "KO": "연속성/도통:",
    "FR": "Continuité:",
    "JA": "導通・連続性:"
  },
  "Hypothesis": {
    "EN": "Hypothesis",
    "TE": "హైపోథెసిస్ (అంచనా)",
    "TA": "கருதுகோள்",
    "HI": "परिकल्पना",
    "PT": "Hipótese",
    "KO": "가설",
    "FR": "Hypothèse",
    "JA": "仮説"
  },
  "Hypothesis:": {
    "EN": "Hypothesis:",
    "TE": "హైపోథెసిస్ (అంచనా):",
    "TA": "கருதுகோள்:",
    "HI": "परिकल्पना:",
    "PT": "Hipótese:",
    "KO": "가설:",
    "FR": "Hypothèse:",
    "JA": "仮説:"
  },
  "Line DS Q9": {
    "EN": "Line DS Q9",
    "TE": "లైన్ DS Q9",
    "TA": "லைன் DS Q9",
    "HI": "लाइन DS Q9",
    "PT": "Secc. Linha Q9",
    "KO": "선로 단로기 Q9",
    "FR": "Sectionneur ligne Q9",
    "JA": "線路断路器 Q9"
  },
  "Line DS Q9:": {
    "EN": "Line DS Q9:",
    "TE": "లైన్ DS Q9:",
    "TA": "லைன் DS Q9:",
    "HI": "लाइन DS Q9:",
    "PT": "Secc. Linha Q9:",
    "KO": "선로 단로기 Q9:",
    "FR": "Sectionneur ligne Q9:",
    "JA": "線路断路器 Q9:"
  },
  "Northbound": {
    "EN": "Northbound",
    "TE": "నార్త్‌బౌండ్",
    "TA": "வடக்கு நோக்கிய",
    "HI": "नॉर्थबाउंड",
    "PT": "Northbound (Superior)",
    "KO": "상위 (Northbound)",
    "FR": "Amont (Northbound)",
    "JA": "上位 (Northbound)"
  },
  "Northbound:": {
    "EN": "Northbound:",
    "TE": "నార్త్‌బౌండ్:",
    "TA": "வடக்கு நோக்கிய:",
    "HI": "नॉर्थबाउंड:",
    "PT": "Northbound (Superior):",
    "KO": "상위 (Northbound):",
    "FR": "Amont (Northbound):",
    "JA": "上位 (Northbound):"
  },
  "Event Log": {
    "EN": "Event Log",
    "TE": "ఈవెంట్ లాగ్",
    "TA": "நிகழ்வுப் பதிவு",
    "HI": "इवेंट लॉग",
    "PT": "Registro de Eventos",
    "KO": "이벤트 로그",
    "FR": "Journal des Événements",
    "JA": "イベントログ"
  },
  "Event Log:": {
    "EN": "Event Log:",
    "TE": "ఈవెంట్ లాగ్:",
    "TA": "நிகழ்வுப் பதிவு:",
    "HI": "इवेंट लॉग:",
    "PT": "Registro de Eventos:",
    "KO": "이벤트 로그:",
    "FR": "Journal des Événements:",
    "JA": "イベントログ:"
  },
  "Key Notes": {
    "EN": "Key Notes",
    "TE": "ముఖ్య నోట్స్",
    "TA": "முக்கிய குறிப்புகள்",
    "HI": "मुख्य नोट्स",
    "PT": "Notas Principais",
    "KO": "핵심 노트",
    "FR": "Notes Clés",
    "JA": "重要ノート"
  },
  "Key Notes:": {
    "EN": "Key Notes:",
    "TE": "ముఖ్య నోట్స్:",
    "TA": "முக்கிய குறிப்புகள்:",
    "HI": "मुख्य नोट्स:",
    "PT": "Notas Principais:",
    "KO": "핵심 노트:",
    "FR": "Notes Clés:",
    "JA": "重要ノート:"
  },
  "Clear All": {
    "EN": "Clear All",
    "TE": "అన్నీ క్లియర్ చేయండి",
    "TA": "அனைத்தையும் அழி",
    "HI": "सभी साफ़ करें",
    "PT": "Limpar Tudo",
    "KO": "전체 지우기",
    "FR": "Tout Effacer",
    "JA": "すべてクリア"
  },
  "Clear All:": {
    "EN": "Clear All:",
    "TE": "అన్నీ క్లియర్ చేయండి:",
    "TA": "அனைத்தையும் அழி:",
    "HI": "सभी साफ़ करें:",
    "PT": "Limpar Tudo:",
    "KO": "전체 지우기:",
    "FR": "Tout Effacer:",
    "JA": "すべてクリア:"
  },
  "Next Step": {
    "EN": "Next Step",
    "TE": "తదుపరి దశ",
    "TA": "அடுத்த படி",
    "HI": "अगला चरण",
    "PT": "Próximo Passo",
    "KO": "다음 단계",
    "FR": "Étape Suivante",
    "JA": "次のステップ"
  },
  "Next Step:": {
    "EN": "Next Step:",
    "TE": "తదుపరి దశ:",
    "TA": "அடுத்த படி:",
    "HI": "अगला चरण:",
    "PT": "Próximo Passo:",
    "KO": "다음 단계:",
    "FR": "Étape Suivante:",
    "JA": "次のステップ:"
  },
  "Workspace": {
    "EN": "Workspace",
    "TE": "వర్క్‌స్పేస్",
    "TA": "பணியிடம்",
    "HI": "कार्यक्षेत्र",
    "PT": "Espaço de trabalho",
    "KO": "작업 공간",
    "FR": "Espace de travail",
    "JA": "ワークスペース"
  },
  "Workspace:": {
    "EN": "Workspace:",
    "TE": "వర్క్‌స్పేస్:",
    "TA": "பணியிடம்:",
    "HI": "कार्यक्षेत्र:",
    "PT": "Espaço de trabalho:",
    "KO": "작업 공간:",
    "FR": "Espace de travail:",
    "JA": "ワークスペース:"
  },
  "Academies": {
    "EN": "Academies",
    "TE": "అకాడమీలు",
    "TA": "அகாடமிகள்",
    "HI": "अकादमियाँ",
    "PT": "Academias",
    "KO": "아카데미",
    "FR": "Académies",
    "JA": "アカデミー"
  },
  "Academies:": {
    "EN": "Academies:",
    "TE": "అకాడమీలు:",
    "TA": "அகாடமிகள்:",
    "HI": "अकादमियाँ:",
    "PT": "Academias:",
    "KO": "아카데미:",
    "FR": "Académies:",
    "JA": "アカデミー:"
  },
  "Interlock": {
    "EN": "Interlock",
    "TE": "ఇంటర్‌లాక్",
    "TA": "இன்டர்லாக்",
    "HI": "इंटरलॉक",
    "PT": "Intertravamento",
    "KO": "인터록",
    "FR": "Verrouillage",
    "JA": "インターロック"
  },
  "Interlock:": {
    "EN": "Interlock:",
    "TE": "ఇంటర్‌లాక్:",
    "TA": "இன்டர்லாக்:",
    "HI": "इंटरलॉक:",
    "PT": "Intertravamento:",
    "KO": "인터록:",
    "FR": "Verrouillage:",
    "JA": "インターロック:"
  },
  "Telemetry": {
    "EN": "Telemetry",
    "TE": "టెలిమెట్రీ",
    "TA": "டெலிமெட்ரி",
    "HI": "टेलीमेट्री",
    "PT": "Telemetria",
    "KO": "원격 측정",
    "FR": "Télémesure",
    "JA": "テレメトリ"
  },
  "Telemetry:": {
    "EN": "Telemetry:",
    "TE": "టెలిమెట్రీ:",
    "TA": "டெலிமெட்ரி:",
    "HI": "टेलीमेट्री:",
    "PT": "Telemetria:",
    "KO": "원격 측정:",
    "FR": "Télémesure:",
    "JA": "テレメトリ:"
  },
  "Simulator": {
    "EN": "Simulator",
    "TE": "సిమ్యులేటర్",
    "TA": "உருவகப்படுத்தி",
    "HI": "सिम्युलेटर",
    "PT": "Simulador",
    "KO": "시뮬레이터",
    "FR": "Simulateur",
    "JA": "シミュレータ"
  },
  "Simulator:": {
    "EN": "Simulator:",
    "TE": "సిమ్యులేటర్:",
    "TA": "உருவகப்படுத்தி:",
    "HI": "सिम्युलेटर:",
    "PT": "Simulador:",
    "KO": "시뮬레이터:",
    "FR": "Simulateur:",
    "JA": "シミュレータ:"
  },
  "Simulated": {
    "EN": "Simulated",
    "TE": "సిమ్యులేటెడ్",
    "TA": "உருவகப்படுத்தப்பட்ட",
    "HI": "सिमुलेटेड",
    "PT": "Simulado",
    "KO": "시뮬레이션됨",
    "FR": "Simulé",
    "JA": "シミュレート済"
  },
  "Simulated:": {
    "EN": "Simulated:",
    "TE": "సిమ్యులేటెడ్:",
    "TA": "உருவகப்படுத்தப்பட்ட:",
    "HI": "सिमुलेटेड:",
    "PT": "Simulado:",
    "KO": "시뮬레이션됨:",
    "FR": "Simulé:",
    "JA": "シミュレート済:"
  },
  "Protocols": {
    "EN": "Protocols",
    "TE": "ప్రోటోకాల్స్",
    "TA": "நெறிமுறைகள்",
    "HI": "प्रोटोकॉल",
    "PT": "Protocolos",
    "KO": "프로토콜",
    "FR": "Protocoles",
    "JA": "プロトコル"
  },
  "Protocols:": {
    "EN": "Protocols:",
    "TE": "ప్రోటోకాల్స్:",
    "TA": "நெறிமுறைகள்:",
    "HI": "प्रोटोकॉल:",
    "PT": "Protocolos:",
    "KO": "프로토콜:",
    "FR": "Protocoles:",
    "JA": "プロトコル:"
  },
  "Equipment": {
    "EN": "Equipment",
    "TE": "పరికరాలు",
    "TA": "உபகரணங்கள்",
    "HI": "उपकरण",
    "PT": "Equipamento",
    "KO": "장비",
    "FR": "Équipement",
    "JA": "機器"
  },
  "Equipment:": {
    "EN": "Equipment:",
    "TE": "పరికరాలు:",
    "TA": "உபகரணங்கள்:",
    "HI": "उपकरण:",
    "PT": "Equipamento:",
    "KO": "장비:",
    "FR": "Équipement:",
    "JA": "機器:"
  },
  "Interface": {
    "EN": "Interface",
    "TE": "ఇంటర్‌ఫేస్",
    "TA": "இடைமுகம்",
    "HI": "इंटरफ़ेस",
    "PT": "Interface de rede",
    "KO": "인터페이스",
    "FR": "Interface réseau",
    "JA": "インターフェース"
  },
  "Interface:": {
    "EN": "Interface:",
    "TE": "ఇంటర్‌ఫేస్:",
    "TA": "இடைமுகம்:",
    "HI": "इंटरफ़ेस:",
    "PT": "Interface de rede:",
    "KO": "인터페이스:",
    "FR": "Interface réseau:",
    "JA": "インターフェース:"
  },
  "Procedure": {
    "EN": "Procedure",
    "TE": "విధానం",
    "TA": "செயல்முறை",
    "HI": "प्रक्रिया",
    "PT": "Procedimento",
    "KO": "절차",
    "FR": "Procédure",
    "JA": "手順"
  },
  "Procedure:": {
    "EN": "Procedure:",
    "TE": "విధానం:",
    "TA": "செயல்முறை:",
    "HI": "प्रक्रिया:",
    "PT": "Procedimento:",
    "KO": "절차:",
    "FR": "Procédure:",
    "JA": "手順:"
  },
  "Scenarios": {
    "EN": "Scenarios",
    "TE": "సినారియోలు",
    "TA": "காட்சிகள்",
    "HI": "परिदृश्य",
    "PT": "Cenários",
    "KO": "시나리오",
    "FR": "Scénarios",
    "JA": "シナリオ"
  },
  "Scenarios:": {
    "EN": "Scenarios:",
    "TE": "సినారియోలు:",
    "TA": "காட்சிகள்:",
    "HI": "परिदृश्य:",
    "PT": "Cenários:",
    "KO": "시나리오:",
    "FR": "Scénarios:",
    "JA": "シナリオ:"
  },
  "Questions": {
    "EN": "Questions",
    "TE": "ప్రశ్నలు",
    "TA": "கேள்விகள்",
    "HI": "प्रश्न",
    "PT": "Perguntas",
    "KO": "질문",
    "FR": "Questions",
    "JA": "質問"
  },
  "Questions:": {
    "EN": "Questions:",
    "TE": "ప్రశ్నలు:",
    "TA": "கேள்விகள்:",
    "HI": "प्रश्न:",
    "PT": "Perguntas:",
    "KO": "질문:",
    "FR": "Questions:",
    "JA": "質問:"
  },
  "Interview": {
    "EN": "Interview",
    "TE": "ఇంటర్వ్యూ",
    "TA": "நேர்காணல்",
    "HI": "साक्षात्कार",
    "PT": "Entrevista",
    "KO": "면접",
    "FR": "Entretien",
    "JA": "面接"
  },
  "Interview:": {
    "EN": "Interview:",
    "TE": "ఇంటర్వ్యూ:",
    "TA": "நேர்காணல்:",
    "HI": "साक्षात्कार:",
    "PT": "Entrevista:",
    "KO": "면접:",
    "FR": "Entretien:",
    "JA": "面接:"
  },
  "Timestamp": {
    "EN": "Timestamp",
    "TE": "టైమ్‌స్టాంప్",
    "TA": "நேர முத்திரை",
    "HI": "टाइमस्टैम्प",
    "PT": "Carimbo de tempo",
    "KO": "타임스탬프",
    "FR": "Horodatage",
    "JA": "タイムスタンプ"
  },
  "Timestamp:": {
    "EN": "Timestamp:",
    "TE": "టైమ్‌స్టాంప్:",
    "TA": "நேர முத்திரை:",
    "HI": "टाइमस्टैम्प:",
    "PT": "Carimbo de tempo:",
    "KO": "타임스탬프:",
    "FR": "Horodatage:",
    "JA": "タイムスタンプ:"
  },
  "Frequency": {
    "EN": "Frequency",
    "TE": "ఫ్రీక్వెన్సీ",
    "TA": "அதிர்வெண்",
    "HI": "आवृत्ति",
    "PT": "Frequência",
    "KO": "주파수",
    "FR": "Fréquence",
    "JA": "周波数"
  },
  "Frequency:": {
    "EN": "Frequency:",
    "TE": "ఫ్రీక్వెన్సీ:",
    "TA": "அதிர்வெண்:",
    "HI": "आवृत्ति:",
    "PT": "Frequência:",
    "KO": "주파수:",
    "FR": "Fréquence:",
    "JA": "周波数:"
  },
  "Registers": {
    "EN": "Registers",
    "TE": "రిజిస్టర్లు",
    "TA": "பதிவேடுகள்",
    "HI": "रजिस्टर",
    "PT": "Registradores",
    "KO": "레지스터",
    "FR": "Registres",
    "JA": "レジスタ"
  },
  "Registers:": {
    "EN": "Registers:",
    "TE": "రిజిస్టర్లు:",
    "TA": "பதிவேடுகள்:",
    "HI": "रजिस्टर:",
    "PT": "Registradores:",
    "KO": "레지스터:",
    "FR": "Registres:",
    "JA": "レジスタ:"
  },
  "Publisher": {
    "EN": "Publisher",
    "TE": "పబ్లిషర్",
    "TA": "வெளியீட்டாளர்",
    "HI": "पब्लिशर",
    "PT": "Publicador",
    "KO": "발행자",
    "FR": "Éditeur",
    "JA": "パブリッシャー"
  },
  "Publisher:": {
    "EN": "Publisher:",
    "TE": "పబ్లిషర్:",
    "TA": "வெளியீட்டாளர்:",
    "HI": "पब्लिशर:",
    "PT": "Publicador:",
    "KO": "발행자:",
    "FR": "Éditeur:",
    "JA": "パブリッシャー:"
  },
  "Historian": {
    "EN": "Historian",
    "TE": "హిస్టోరియన్",
    "TA": "ஹிஸ்டோரியன்",
    "HI": "हिस्टोरियन",
    "PT": "Historiador",
    "KO": "히스토리언",
    "FR": "Historien",
    "JA": "ヒストリアン"
  },
  "Historian:": {
    "EN": "Historian:",
    "TE": "హిస్టోరియన్:",
    "TA": "ஹிஸ்டோரியன்:",
    "HI": "हिस्टोरियन:",
    "PT": "Historiador:",
    "KO": "히스토리언:",
    "FR": "Historien:",
    "JA": "ヒストリアン:"
  },
  "Apartment": {
    "EN": "Apartment",
    "TE": "అపార్ట్‌మెంట్",
    "TA": "அடுக்குமாடி",
    "HI": "अपार्टमेंट",
    "PT": "Apartamento",
    "KO": "아파트",
    "FR": "Appartement",
    "JA": "マンション・アパート"
  },
  "Apartment:": {
    "EN": "Apartment:",
    "TE": "అపార్ట్‌మెంట్:",
    "TA": "அடுக்குமாடி:",
    "HI": "अपार्टमेंट:",
    "PT": "Apartamento:",
    "KO": "아파트:",
    "FR": "Appartement:",
    "JA": "マンション・アパート:"
  },
  "Inspector": {
    "EN": "Inspector",
    "TE": "ఇన్‌స్పెక్టర్",
    "TA": "ஆய்வாளர்",
    "HI": "निरीक्षक",
    "PT": "Inspetor",
    "KO": "검사기",
    "FR": "Inspecteur",
    "JA": "インスペクター"
  },
  "Inspector:": {
    "EN": "Inspector:",
    "TE": "ఇన్‌స్పెక్టర్:",
    "TA": "ஆய்வாளர்:",
    "HI": "निरीक्षक:",
    "PT": "Inspetor:",
    "KO": "검사기:",
    "FR": "Inspecteur:",
    "JA": "インスペクター:"
  },
  "Downloads": {
    "EN": "Downloads",
    "TE": "డౌన్‌లోడ్లు",
    "TA": "பதிவிறக்கங்கள்",
    "HI": "डाउनलोड",
    "PT": "Downloads",
    "KO": "다운로드",
    "FR": "Téléchargements",
    "JA": "ダウンロード"
  },
  "Downloads:": {
    "EN": "Downloads:",
    "TE": "డౌన్‌లోడ్లు:",
    "TA": "பதிவிறக்கங்கள்:",
    "HI": "डाउनलोड:",
    "PT": "Downloads:",
    "KO": "다운로드:",
    "FR": "Téléchargements:",
    "JA": "ダウンロード:"
  },
  "Completed": {
    "EN": "Completed",
    "TE": "పూర్తయింది",
    "TA": "முடிந்தது",
    "HI": "पूर्ण",
    "PT": "Concluído",
    "KO": "완료됨",
    "FR": "Terminé",
    "JA": "完了"
  },
  "Completed:": {
    "EN": "Completed:",
    "TE": "పూర్తయింది:",
    "TA": "முடிந்தது:",
    "HI": "पूर्ण:",
    "PT": "Concluído:",
    "KO": "완료됨:",
    "FR": "Terminé:",
    "JA": "完了:"
  },
  "Permitted": {
    "EN": "Permitted",
    "TE": "అనుమతించబడింది",
    "TA": "அனுமதிக்கப்பட்டது",
    "HI": "अनुमत",
    "PT": "Permitido",
    "KO": "허용됨",
    "FR": "Autorisé",
    "JA": "許可"
  },
  "Permitted:": {
    "EN": "Permitted:",
    "TE": "అనుమతించబడింది:",
    "TA": "அனுமதிக்கப்பட்டது:",
    "HI": "अनुमत:",
    "PT": "Permitido:",
    "KO": "허용됨:",
    "FR": "Autorisé:",
    "JA": "許可:"
  },
  "Connected": {
    "EN": "Connected",
    "TE": "కనెక్ట్ అయింది",
    "TA": "இணைக்கப்பட்டது",
    "HI": "जुड़ा हुआ",
    "PT": "Conectado",
    "KO": "연결됨",
    "FR": "Connecté",
    "JA": "接続済"
  },
  "Connected:": {
    "EN": "Connected:",
    "TE": "కనెక్ట్ అయింది:",
    "TA": "இணைக்கப்பட்டது:",
    "HI": "जुड़ा हुआ:",
    "PT": "Conectado:",
    "KO": "연결됨:",
    "FR": "Connecté:",
    "JA": "接続済:"
  },
  "Multicast": {
    "EN": "Multicast",
    "TE": "మల్టీకాస్ట్",
    "TA": "மல்டிகாஸ்ட்",
    "HI": "मल्टीकास्ट",
    "PT": "Multicast",
    "KO": "멀티캐스트",
    "FR": "Multidiffusion",
    "JA": "マルチキャスト"
  },
  "Multicast:": {
    "EN": "Multicast:",
    "TE": "మల్టీకాస్ట్:",
    "TA": "மல்டிகாஸ்ட்:",
    "HI": "मल्टीकास्ट:",
    "PT": "Multicast:",
    "KO": "멀티캐스트:",
    "FR": "Multidiffusion:",
    "JA": "マルチキャスト:"
  },
  "Reference": {
    "EN": "Reference",
    "TE": "రిఫరెన్స్",
    "TA": "குறிப்பு",
    "HI": "संदर्भ",
    "PT": "Referência",
    "KO": "참조",
    "FR": "Référence",
    "JA": "参照"
  },
  "Reference:": {
    "EN": "Reference:",
    "TE": "రిఫరెన్స్:",
    "TA": "குறிப்பு:",
    "HI": "संदर्भ:",
    "PT": "Referência:",
    "KO": "참조:",
    "FR": "Référence:",
    "JA": "参照:"
  },
  "Hierarchy": {
    "EN": "Hierarchy",
    "TE": "హైరార్కీ",
    "TA": "படிநிலை",
    "HI": "पदानुक्रम",
    "PT": "Hierarquia",
    "KO": "계층",
    "FR": "Hiérarchie",
    "JA": "階層"
  },
  "Hierarchy:": {
    "EN": "Hierarchy:",
    "TE": "హైరార్కీ:",
    "TA": "படிநிலை:",
    "HI": "पदानुक्रम:",
    "PT": "Hierarquia:",
    "KO": "계층:",
    "FR": "Hiérarchie:",
    "JA": "階層:"
  },
  "Technical": {
    "EN": "Technical",
    "TE": "సాంకేతిక",
    "TA": "தொழில்நுட்ப",
    "HI": "तकनीकी",
    "PT": "Técnico",
    "KO": "기술",
    "FR": "Technique",
    "JA": "技術"
  },
  "Technical:": {
    "EN": "Technical:",
    "TE": "సాంకేతిక:",
    "TA": "தொழில்நுட்ப:",
    "HI": "तकनीकी:",
    "PT": "Técnico:",
    "KO": "기술:",
    "FR": "Technique:",
    "JA": "技術:"
  },
  "Comm Loss": {
    "EN": "Comm Loss",
    "TE": "కమ్యూనికేషన్ లాస్",
    "TA": "தொடர்பு இழப்பு",
    "HI": "संचार हानि",
    "PT": "Perda de Com.",
    "KO": "통신 손실",
    "FR": "Perte de comm.",
    "JA": "通信喪失"
  },
  "Comm Loss:": {
    "EN": "Comm Loss:",
    "TE": "కమ్యూనికేషన్ లాస్:",
    "TA": "தொடர்பு இழப்பு:",
    "HI": "संचार हानि:",
    "PT": "Perda de Com.:",
    "KO": "통신 손실:",
    "FR": "Perte de comm.:",
    "JA": "通信喪失:"
  },
  "Poll Rate": {
    "EN": "Poll Rate",
    "TE": "పోల్ రేట్",
    "TA": "போலிங் விகிதம்",
    "HI": "पोल दर",
    "PT": "Taxa de Polling",
    "KO": "폴링 주기",
    "FR": "Taux d'interrogation",
    "JA": "ポーリング周期"
  },
  "Poll Rate:": {
    "EN": "Poll Rate:",
    "TE": "పోల్ రేట్:",
    "TA": "போலிங் விகிதம்:",
    "HI": "पोल दर:",
    "PT": "Taxa de Polling:",
    "KO": "폴링 주기:",
    "FR": "Taux d'interrogation:",
    "JA": "ポーリング周期:"
  },
  "Data Type": {
    "EN": "Data Type",
    "TE": "డేటా రకం",
    "TA": "தரவு வகை",
    "HI": "डेटा प्रकार",
    "PT": "Tipo de Dados",
    "KO": "데이터 유형",
    "FR": "Type de données",
    "JA": "データ型"
  },
  "Data Type:": {
    "EN": "Data Type:",
    "TE": "డేటా రకం:",
    "TA": "தரவு வகை:",
    "HI": "डेटा प्रकार:",
    "PT": "Tipo de Dados:",
    "KO": "데이터 유형:",
    "FR": "Type de données:",
    "JA": "データ型:"
  },
  "IED Ports": {
    "EN": "IED Ports",
    "TE": "IED పోర్టులు",
    "TA": "IED போர்ட்கள்",
    "HI": "IED पोर्ट्स",
    "PT": "Portas de IED",
    "KO": "IED 포트",
    "FR": "Ports IED",
    "JA": "IEDポート"
  },
  "IED Ports:": {
    "EN": "IED Ports:",
    "TE": "IED పోర్టులు:",
    "TA": "IED போர்ட்கள்:",
    "HI": "IED पोर्ट्स:",
    "PT": "Portas de IED:",
    "KO": "IED 포트:",
    "FR": "Ports IED:",
    "JA": "IEDポート:"
  },
  "Hardwired": {
    "EN": "Hardwired",
    "TE": "హార్డ్‌వైర్డ్",
    "TA": "ஹார்டுவயர்ட்",
    "HI": "हार्डवायर्ड",
    "PT": "Cabeado (Hardwired)",
    "KO": "하드와이어드",
    "FR": "Câblé en dur",
    "JA": "ハードワイヤード"
  },
  "Hardwired:": {
    "EN": "Hardwired:",
    "TE": "హార్డ్‌వైర్డ్:",
    "TA": "ஹார்டுவயர்ட்:",
    "HI": "हार्डवायर्ड:",
    "PT": "Cabeado (Hardwired):",
    "KO": "하드와이어드:",
    "FR": "Câblé en dur:",
    "JA": "ハードワイヤード:"
  },
  "Important": {
    "EN": "Important",
    "TE": "ముఖ్యమైన",
    "TA": "முக்கியமான",
    "HI": "महत्वपूर्ण",
    "PT": "Importante",
    "KO": "중요",
    "FR": "Important (Critique)",
    "JA": "重要"
  },
  "Important:": {
    "EN": "Important:",
    "TE": "ముఖ్యమైన:",
    "TA": "முக்கியமான:",
    "HI": "महत्वपूर्ण:",
    "PT": "Importante:",
    "KO": "중요:",
    "FR": "Important (Critique):",
    "JA": "重要:"
  },
  "Endpoints:": {
    "EN": "Endpoints:",
    "TE": "ఎండ్‌పాయింట్లు:",
    "TA": "முனைகள் (Endpoints):",
    "HI": "एंडपॉइंट्स:",
    "PT": "Pontos de extremidade:",
    "KO": "엔드포인트:",
    "FR": "Points de terminaison:",
    "JA": "エンドポイント:"
  },
  "Transport:": {
    "EN": "Transport:",
    "TE": "ట్రాన్స్‌పోర్ట్:",
    "TA": "போக்குவரத்து:",
    "HI": "ट्रांसपोर्ट:",
    "PT": "Transporte:",
    "KO": "전송 계층:",
    "FR": "Couche Transport:",
    "JA": "トランスポート:"
  },
  "Configure": {
    "EN": "Configure",
    "TE": "కాన్ఫిగర్ చేయండి",
    "TA": "கட்டமை",
    "HI": "कॉन्फ़िगर करें",
    "PT": "Configurar",
    "KO": "구성",
    "FR": "Configurer",
    "JA": "設定"
  },
  "Configure:": {
    "EN": "Configure:",
    "TE": "కాన్ఫిగర్ చేయండి:",
    "TA": "கட்டமை:",
    "HI": "कॉन्फ़िगर करें:",
    "PT": "Configurar:",
    "KO": "구성:",
    "FR": "Configurer:",
    "JA": "設定:"
  },
  "Energized": {
    "EN": "Energized",
    "TE": "ఎనర్జైజ్ చేయబడింది",
    "TA": "மின்னேற்றப்பட்டது",
    "HI": "ऊर्जावान",
    "PT": "Energizado",
    "KO": "가압됨",
    "FR": "Sous tension",
    "JA": "充電中"
  },
  "Energized:": {
    "EN": "Energized:",
    "TE": "ఎనర్జైజ్ చేయబడింది:",
    "TA": "மின்னேற்றப்பட்டது:",
    "HI": "ऊर्जावान:",
    "PT": "Energizado:",
    "KO": "가압됨:",
    "FR": "Sous tension:",
    "JA": "充電中:"
  },
  "Redundant": {
    "EN": "Redundant",
    "TE": "రిడండెంట్",
    "TA": "மிகைமை",
    "HI": "रिडंडेंट",
    "PT": "Redundante",
    "KO": "이중화",
    "FR": "Redondant",
    "JA": "冗長"
  },
  "Redundant:": {
    "EN": "Redundant:",
    "TE": "రిడండెంట్:",
    "TA": "மிகைமை:",
    "HI": "रिडंडेंट:",
    "PT": "Redundante:",
    "KO": "이중화:",
    "FR": "Redondant:",
    "JA": "冗長:"
  },
  "Secondary": {
    "EN": "Secondary",
    "TE": "సెకండరీ",
    "TA": "இரண்டாம் நிலை",
    "HI": "द्वितीयक",
    "PT": "Secundário",
    "KO": "2차 (Secondary)",
    "FR": "Secondaire",
    "JA": "二次"
  },
  "Secondary:": {
    "EN": "Secondary:",
    "TE": "సెకండరీ:",
    "TA": "இரண்டாம் நிலை:",
    "HI": "द्वितीयक:",
    "PT": "Secundário:",
    "KO": "2차 (Secondary):",
    "FR": "Secondaire:",
    "JA": "二次:"
  },
  "Broadcast": {
    "EN": "Broadcast",
    "TE": "బ్రాడ్‌కాస్ట్",
    "TA": "ஒளிபரப்பு",
    "HI": "ब्रॉडकास्ट",
    "PT": "Broadcast (Difusão)",
    "KO": "브로드캐스트",
    "FR": "Diffusion (Broadcast)",
    "JA": "ブロードキャスト"
  },
  "Broadcast:": {
    "EN": "Broadcast:",
    "TE": "బ్రాడ్‌కాస్ట్:",
    "TA": "ஒளிபரப்பு:",
    "HI": "ब्रॉडकास्ट:",
    "PT": "Broadcast (Difusão):",
    "KO": "브로드캐스트:",
    "FR": "Diffusion (Broadcast):",
    "JA": "ブロードキャスト:"
  },
  "Mandatory": {
    "EN": "Mandatory",
    "TE": "తప్పనిసరి",
    "TA": "கட்டாய",
    "HI": "अनिवार्य",
    "PT": "Obrigatório",
    "KO": "필수",
    "FR": "Obligatoire",
    "JA": "必須"
  },
  "Mandatory:": {
    "EN": "Mandatory:",
    "TE": "తప్పనిసరి:",
    "TA": "கட்டாய:",
    "HI": "अनिवार्य:",
    "PT": "Obrigatório:",
    "KO": "필수:",
    "FR": "Obligatoire:",
    "JA": "必須:"
  },
  "Operation": {
    "EN": "Operation",
    "TE": "ఆపరేషన్",
    "TA": "செயல்பாடு",
    "HI": "संचालन",
    "PT": "Operação",
    "KO": "동작/운전",
    "FR": "Exploitation",
    "JA": "操作・動作"
  },
  "Operation:": {
    "EN": "Operation:",
    "TE": "ఆపరేషన్:",
    "TA": "செயல்பாடு:",
    "HI": "संचालन:",
    "PT": "Operação:",
    "KO": "동작/운전:",
    "FR": "Exploitation:",
    "JA": "操作・動作:"
  },
  "Switching": {
    "EN": "Switching",
    "TE": "స్విచింగ్",
    "TA": "ஸ்விட்சிங்",
    "HI": "स्विचिंग",
    "PT": "Manobra",
    "KO": "개폐 (Switching)",
    "FR": "Manœuvre",
    "JA": "開閉操作"
  },
  "Switching:": {
    "EN": "Switching:",
    "TE": "స్విచింగ్:",
    "TA": "ஸ்விட்சிங்:",
    "HI": "स्विचिंग:",
    "PT": "Manobra:",
    "KO": "개폐 (Switching):",
    "FR": "Manœuvre:",
    "JA": "開閉操作:"
  },
  "Auxiliary": {
    "EN": "Auxiliary",
    "TE": "ఆగ్జిలరీ",
    "TA": "துணை",
    "HI": "सहायक",
    "PT": "Auxiliar",
    "KO": "보조 (Auxiliary)",
    "FR": "Auxiliaire",
    "JA": "補助"
  },
  "Auxiliary:": {
    "EN": "Auxiliary:",
    "TE": "ఆగ్జిలరీ:",
    "TA": "துணை:",
    "HI": "सहायक:",
    "PT": "Auxiliar:",
    "KO": "보조 (Auxiliary):",
    "FR": "Auxiliaire:",
    "JA": "補助:"
  },
  "✓ Link Up": {
    "EN": "✓ Link Up",
    "TE": "✓ లింక్ అప్ (ఆన్)",
    "TA": "✓ இணைப்பு உள்ளது",
    "HI": "✓ लिंक अप (सक्रिय)",
    "PT": "✓ Link Ativo",
    "KO": "✓ 링크 활성 (Up)",
    "FR": "✓ Lien actif",
    "JA": "✓ リンク確立 (Up)"
  },
  "✓ Link Up:": {
    "EN": "✓ Link Up:",
    "TE": "✓ లింక్ అప్ (ఆన్):",
    "TA": "✓ இணைப்பு உள்ளது:",
    "HI": "✓ लिंक अप (सक्रिय):",
    "PT": "✓ Link Ativo:",
    "KO": "✓ 링크 활성 (Up):",
    "FR": "✓ Lien actif:",
    "JA": "✓ リンク確立 (Up):"
  },
  "ANSI Code": {
    "EN": "ANSI Code",
    "TE": "ANSI కోడ్",
    "TA": "ANSI குறியீடு",
    "HI": "ANSI कोड",
    "PT": "Código ANSI",
    "KO": "ANSI 코드",
    "FR": "Code ANSI (Fonction)",
    "JA": "ANSIコード"
  },
  "ANSI Code:": {
    "EN": "ANSI Code:",
    "TE": "ANSI కోడ్:",
    "TA": "ANSI குறியீடு:",
    "HI": "ANSI कोड:",
    "PT": "Código ANSI:",
    "KO": "ANSI 코드:",
    "FR": "Code ANSI (Fonction):",
    "JA": "ANSIコード:"
  },
  "Pin → pin": {
    "EN": "Pin → pin",
    "TE": "పిన్ → పిన్",
    "TA": "பின் → பின்",
    "HI": "पिन → पिन",
    "PT": "Pino → pino",
    "KO": "핀 → 핀",
    "FR": "Broche → broche",
    "JA": "ピン → ピン"
  },
  "Pin → pin:": {
    "EN": "Pin → pin:",
    "TE": "పిన్ → పిన్:",
    "TA": "பின் → பின்:",
    "HI": "पिन → पिन:",
    "PT": "Pino → pino:",
    "KO": "핀 → 핀:",
    "FR": "Broche → broche:",
    "JA": "ピン → ピン:"
  },
  "Q1 Bus DS": {
    "EN": "Q1 Bus DS",
    "TE": "Q1 బస్ DS",
    "TA": "Q1 பஸ் DS",
    "HI": "Q1 बस DS",
    "PT": "Q1 Secc. Barra",
    "KO": "Q1 모선 단로기",
    "FR": "Sectionneur barre Q1",
    "JA": "Q1 母線断路器"
  },
  "Q1 Bus DS:": {
    "EN": "Q1 Bus DS:",
    "TE": "Q1 బస్ DS:",
    "TA": "Q1 பஸ் DS:",
    "HI": "Q1 बस DS:",
    "PT": "Q1 Secc. Barra:",
    "KO": "Q1 모선 단로기:",
    "FR": "Sectionneur barre Q1:",
    "JA": "Q1 母線断路器:"
  },
  "Bus DS Q1": {
    "EN": "Bus DS Q1",
    "TE": "బస్ DS Q1",
    "TA": "பஸ் DS Q1",
    "HI": "बस DS Q1",
    "PT": "Secc. Barra Q1",
    "KO": "모선 단로기 Q1",
    "FR": "Sectionneur barre Q1",
    "JA": "母線断路器 Q1"
  },
  "Bus DS Q1:": {
    "EN": "Bus DS Q1:",
    "TE": "బస్ DS Q1:",
    "TA": "பஸ் DS Q1:",
    "HI": "बस DS Q1:",
    "PT": "Secc. Barra Q1:",
    "KO": "모선 단로기 Q1:",
    "FR": "Sectionneur barre Q1:",
    "JA": "母線断路器 Q1:"
  },
  "Bay / IED": {
    "EN": "Bay / IED",
    "TE": "బే / IED",
    "TA": "பே / IED",
    "HI": "बे / IED",
    "PT": "Vão / IED",
    "KO": "베이 / IED",
    "FR": "Travée / IED",
    "JA": "ベイ / IED"
  },
  "Bay / IED:": {
    "EN": "Bay / IED:",
    "TE": "బే / IED:",
    "TA": "பே / IED:",
    "HI": "बे / IED:",
    "PT": "Vão / IED:",
    "KO": "베이 / IED:",
    "FR": "Travée / IED:",
    "JA": "ベイ / IED:"
  },
  "Field I/O": {
    "EN": "Field I/O",
    "TE": "ఫీల్డ్ I/O",
    "TA": "கள I/O",
    "HI": "फ़ील्ड I/O",
    "PT": "E/S de Campo",
    "KO": "현장 I/O",
    "FR": "E/S terrain",
    "JA": "フィールド I/O"
  },
  "Field I/O:": {
    "EN": "Field I/O:",
    "TE": "ఫీల్డ్ I/O:",
    "TA": "கள I/O:",
    "HI": "फ़ील्ड I/O:",
    "PT": "E/S de Campo:",
    "KO": "현장 I/O:",
    "FR": "E/S terrain:",
    "JA": "フィールド I/O:"
  },
  "(DI Card)": {
    "EN": "(DI Card)",
    "TE": "(DI కార్డ్)",
    "TA": "(DI அட்டை)",
    "HI": "(DI कार्ड)",
    "PT": "(Cartão DI)",
    "KO": "(DI 카드)",
    "FR": "(Carte DI)",
    "JA": "(DIカード)"
  },
  "(DI Card):": {
    "EN": "(DI Card):",
    "TE": "(DI కార్డ్):",
    "TA": "(DI அட்டை):",
    "HI": "(DI कार्ड):",
    "PT": "(Cartão DI):",
    "KO": "(DI 카드):",
    "FR": "(Carte DI):",
    "JA": "(DIカード):"
  },
  "Run Test": {
    "EN": "Run Test",
    "TE": "పరీక్ష రన్ చేయండి",
    "TA": "சோதனையை இயக்கு",
    "HI": "परीक्षण चलाएँ",
    "PT": "Executar Teste",
    "KO": "테스트 실행",
    "FR": "Lancer le Test",
    "JA": "テスト実行"
  },
  "Run Test:": {
    "EN": "Run Test:",
    "TE": "పరీక్ష రన్ చేయండి:",
    "TA": "சோதனையை இயக்கு:",
    "HI": "परीक्षण चलाएँ:",
    "PT": "Executar Teste:",
    "KO": "테스트 실행:",
    "FR": "Lancer le Test:",
    "JA": "テスト実行:"
  },
  "Zoom out": {
    "EN": "Zoom out",
    "TE": "జూమ్ అవుట్",
    "TA": "சிறிதாக்கு",
    "HI": "ज़ूम आउट",
    "PT": "Diminuir zoom",
    "KO": "축소",
    "FR": "Zoom arrière",
    "JA": "縮小"
  },
  "Zoom out:": {
    "EN": "Zoom out:",
    "TE": "జూమ్ అవుట్:",
    "TA": "சிறிதாக்கு:",
    "HI": "ज़ूम आउट:",
    "PT": "Diminuir zoom:",
    "KO": "축소:",
    "FR": "Zoom arrière:",
    "JA": "縮小:"
  },
  "Breakers": {
    "EN": "Breakers",
    "TE": "బ్రేకర్లు",
    "TA": "பிரேக்கர்கள்",
    "HI": "ब्रेकर",
    "PT": "Disjuntores",
    "KO": "차단기",
    "FR": "Disjoncteurs",
    "JA": "遮断器"
  },
  "Breakers:": {
    "EN": "Breakers:",
    "TE": "బ్రేకర్లు:",
    "TA": "பிரேக்கர்கள்:",
    "HI": "ब्रेकर:",
    "PT": "Disjuntores:",
    "KO": "차단기:",
    "FR": "Disjoncteurs:",
    "JA": "遮断器:"
  },
  "Isolator": {
    "EN": "Isolator",
    "TE": "ఐసోలేటర్",
    "TA": "ஐசோலேட்டர்",
    "HI": "आइसोलेटर",
    "PT": "Isolador",
    "KO": "단로기",
    "FR": "Isolateur",
    "JA": "断路器"
  },
  "Isolator:": {
    "EN": "Isolator:",
    "TE": "ఐసోలేటర్:",
    "TA": "ஐசோலேட்டர்:",
    "HI": "आइसोलेटर:",
    "PT": "Isolador:",
    "KO": "단로기:",
    "FR": "Isolateur:",
    "JA": "断路器:"
  },
  "Controls": {
    "EN": "Controls",
    "TE": "కంట్రోల్స్",
    "TA": "கட்டுப்பாடுகள்",
    "HI": "नियंत्रण",
    "PT": "Controles",
    "KO": "제어",
    "FR": "Commandes",
    "JA": "コントロール"
  },
  "Controls:": {
    "EN": "Controls:",
    "TE": "కంట్రోల్స్:",
    "TA": "கட்டுப்பாடுகள்:",
    "HI": "नियंत्रण:",
    "PT": "Controles:",
    "KO": "제어:",
    "FR": "Commandes:",
    "JA": "コントロール:"
  },
  "Commands": {
    "EN": "Commands",
    "TE": "కమాండ్‌లు",
    "TA": "கட்டளைகள்",
    "HI": "कमांड",
    "PT": "Comandos",
    "KO": "명령",
    "FR": "Commandes",
    "JA": "コマンド"
  },
  "Commands:": {
    "EN": "Commands:",
    "TE": "కమాండ్‌లు:",
    "TA": "கட்டளைகள்:",
    "HI": "कमांड:",
    "PT": "Comandos:",
    "KO": "명령:",
    "FR": "Commandes:",
    "JA": "コマンド:"
  },
  "Simulate": {
    "EN": "Simulate",
    "TE": "సిమ్యులేట్ చేయండి",
    "TA": "உருவகப்படுத்து",
    "HI": "सिमुलेट करें",
    "PT": "Simular",
    "KO": "시뮬레이션",
    "FR": "Simuler",
    "JA": "シミュレート"
  },
  "Simulate:": {
    "EN": "Simulate:",
    "TE": "సిమ్యులేట్ చేయండి:",
    "TA": "உருவகப்படுத்து:",
    "HI": "सिमुलेट करें:",
    "PT": "Simular:",
    "KO": "시뮬레이션:",
    "FR": "Simuler:",
    "JA": "シミュレート:"
  },
  "Protocol": {
    "EN": "Protocol",
    "TE": "ప్రోటోకాల్",
    "TA": "நெறிமுறை",
    "HI": "प्रोटोकॉल",
    "PT": "Protocolo",
    "KO": "프로토콜",
    "FR": "Protocole",
    "JA": "プロトコル"
  },
  "Protocol:": {
    "EN": "Protocol:",
    "TE": "ప్రోటోకాల్:",
    "TA": "நெறிமுறை:",
    "HI": "प्रोटोकॉल:",
    "PT": "Protocolo:",
    "KO": "프로토콜:",
    "FR": "Protocole:",
    "JA": "プロトコル:"
  },
  "Settings": {
    "EN": "Settings",
    "TE": "సెట్టింగ్స్",
    "TA": "அமைப்புகள்",
    "HI": "सेटिंग्स",
    "PT": "Configurações",
    "KO": "설정",
    "FR": "Paramètres",
    "JA": "設定"
  },
  "Settings:": {
    "EN": "Settings:",
    "TE": "సెట్టింగ్స్:",
    "TA": "அமைப்புகள்:",
    "HI": "सेटिंग्स:",
    "PT": "Configurações:",
    "KO": "설정:",
    "FR": "Paramètres:",
    "JA": "設定:"
  },
  "Topology": {
    "EN": "Topology",
    "TE": "టోపాలజీ",
    "TA": "இடவியல்",
    "HI": "टोपोलॉजी",
    "PT": "Topologia",
    "KO": "토폴로지",
    "FR": "Topologie",
    "JA": "トポロジ"
  },
  "Topology:": {
    "EN": "Topology:",
    "TE": "టోపాలజీ:",
    "TA": "இடவியல்:",
    "HI": "टोपोलॉजी:",
    "PT": "Topologia:",
    "KO": "토폴로지:",
    "FR": "Topologie:",
    "JA": "トポロジ:"
  },
  "Failover": {
    "EN": "Failover",
    "TE": "ఫెయిల్‌ఓవర్",
    "TA": "ஃபெயில்ஓவர்",
    "HI": "फ़ेलओवर",
    "PT": "Failover",
    "KO": "페일오버",
    "FR": "Basculement",
    "JA": "フェイルオーバー"
  },
  "Failover:": {
    "EN": "Failover:",
    "TE": "ఫెయిల్‌ఓవర్:",
    "TA": "ஃபெயில்ஓவர்:",
    "HI": "फ़ेलओवर:",
    "PT": "Failover:",
    "KO": "페일오버:",
    "FR": "Basculement:",
    "JA": "フェイルオーバー:"
  },
  "Hardware": {
    "EN": "Hardware",
    "TE": "హార్డ్‌వేర్",
    "TA": "வன்பொருள்",
    "HI": "हार्डवेयर",
    "PT": "Hardware",
    "KO": "하드웨어",
    "FR": "Matériel",
    "JA": "ハードウェア"
  },
  "Hardware:": {
    "EN": "Hardware:",
    "TE": "హార్డ్‌వేర్:",
    "TA": "வன்பொருள்:",
    "HI": "हार्डवेयर:",
    "PT": "Hardware:",
    "KO": "하드웨어:",
    "FR": "Matériel:",
    "JA": "ハードウェア:"
  },
  "Switches": {
    "EN": "Switches",
    "TE": "స్విచ్‌లు",
    "TA": "சுவிட்சுகள்",
    "HI": "स्विच",
    "PT": "Switches",
    "KO": "스위치",
    "FR": "Commutateurs",
    "JA": "スイッチ"
  },
  "Switches:": {
    "EN": "Switches:",
    "TE": "స్విచ్‌లు:",
    "TA": "சுவிட்சுகள்:",
    "HI": "स्विच:",
    "PT": "Switches:",
    "KO": "스위치:",
    "FR": "Commutateurs:",
    "JA": "スイッチ:"
  },
  "Scenario": {
    "EN": "Scenario",
    "TE": "సినారియో",
    "TA": "காட்சி",
    "HI": "परिदृश्य",
    "PT": "Cenário",
    "KO": "시나리오",
    "FR": "Scénario",
    "JA": "シナリオ"
  },
  "Scenario:": {
    "EN": "Scenario:",
    "TE": "సినారియో:",
    "TA": "காட்சி:",
    "HI": "परिदृश्य:",
    "PT": "Cenário:",
    "KO": "시나리오:",
    "FR": "Scénario:",
    "JA": "シナリオ:"
  },
  "Chapters": {
    "EN": "Chapters",
    "TE": "అధ్యాయాలు",
    "TA": "அத்தியாயங்கள்",
    "HI": "अध्याय",
    "PT": "Capítulos",
    "KO": "장",
    "FR": "Chapitres",
    "JA": "チャプター"
  },
  "Chapters:": {
    "EN": "Chapters:",
    "TE": "అధ్యాయాలు:",
    "TA": "அத்தியாயங்கள்:",
    "HI": "अध्याय:",
    "PT": "Capítulos:",
    "KO": "장:",
    "FR": "Chapitres:",
    "JA": "チャプター:"
  },
  "Diagrams": {
    "EN": "Diagrams",
    "TE": "డయాగ్రమ్స్",
    "TA": "வரைபடங்கள்",
    "HI": "आरेख",
    "PT": "Diagramas",
    "KO": "다이어그램",
    "FR": "Schémas",
    "JA": "ダイアグラム"
  },
  "Diagrams:": {
    "EN": "Diagrams:",
    "TE": "డయాగ్రమ్స్:",
    "TA": "வரைபடங்கள்:",
    "HI": "आरेख:",
    "PT": "Diagramas:",
    "KO": "다이어그램:",
    "FR": "Schémas:",
    "JA": "ダイアグラム:"
  },
  "Examples": {
    "EN": "Examples",
    "TE": "ఉదాహరణలు",
    "TA": "எடுத்துக்காட்டுகள்",
    "HI": "उदाहरण",
    "PT": "Exemplos",
    "KO": "예제",
    "FR": "Exemples",
    "JA": "実例"
  },
  "Examples:": {
    "EN": "Examples:",
    "TE": "ఉదాహరణలు:",
    "TA": "எடுத்துக்காட்டுகள்:",
    "HI": "उदाहरण:",
    "PT": "Exemplos:",
    "KO": "예제:",
    "FR": "Exemples:",
    "JA": "実例:"
  },
  "Question": {
    "EN": "Question",
    "TE": "ప్రశ్న",
    "TA": "கேள்வி",
    "HI": "प्रश्न",
    "PT": "Pergunta",
    "KO": "질문",
    "FR": "Question",
    "JA": "質問"
  },
  "Question:": {
    "EN": "Question:",
    "TE": "ప్రశ్న:",
    "TA": "கேள்வி:",
    "HI": "प्रश्न:",
    "PT": "Pergunta:",
    "KO": "질문:",
    "FR": "Question:",
    "JA": "質問:"
  },
  "Learning": {
    "EN": "Learning",
    "TE": "అభ్యాసం",
    "TA": "கற்றல்",
    "HI": "शिक्षण",
    "PT": "Aprendizagem",
    "KO": "학습",
    "FR": "Apprentissage",
    "JA": "学習"
  },
  "Learning:": {
    "EN": "Learning:",
    "TE": "అభ్యాసం:",
    "TA": "கற்றல்:",
    "HI": "शिक्षण:",
    "PT": "Aprendizagem:",
    "KO": "학습:",
    "FR": "Apprentissage:",
    "JA": "学習:"
  },
  "Practice": {
    "EN": "Practice",
    "TE": "ప్రాక్టీస్",
    "TA": "பயிற்சி",
    "HI": "अभ्यास",
    "PT": "Prática",
    "KO": "실습",
    "FR": "Pratique",
    "JA": "実習"
  },
  "Practice:": {
    "EN": "Practice:",
    "TE": "ప్రాక్టీస్:",
    "TA": "பயிற்சி:",
    "HI": "अभ्यास:",
    "PT": "Prática:",
    "KO": "실습:",
    "FR": "Pratique:",
    "JA": "実習:"
  },
  "Overview": {
    "EN": "Overview",
    "TE": "అవలోకనం",
    "TA": "கண்ணோட்டம்",
    "HI": "अवलोकन",
    "PT": "Visão Geral",
    "KO": "개요",
    "FR": "Aperçu",
    "JA": "概要"
  },
  "Overview:": {
    "EN": "Overview:",
    "TE": "అవలోకనం:",
    "TA": "கண்ணோட்டம்:",
    "HI": "अवलोकन:",
    "PT": "Visão Geral:",
    "KO": "개요:",
    "FR": "Aperçu:",
    "JA": "概要:"
  },
  "Register": {
    "EN": "Register",
    "TE": "రిజిస్టర్",
    "TA": "பதிவேடு",
    "HI": "रजिस्टर",
    "PT": "Registrador",
    "KO": "레지스터",
    "FR": "Registre",
    "JA": "レジスタ"
  },
  "Register:": {
    "EN": "Register:",
    "TE": "రిజిస్టర్:",
    "TA": "பதிவேடு:",
    "HI": "रजिस्टर:",
    "PT": "Registrador:",
    "KO": "레지스터:",
    "FR": "Registre:",
    "JA": "レジスタ:"
  },
  "Security": {
    "EN": "Security",
    "TE": "సెక్యూరిటీ",
    "TA": "பாதுகாப்பு",
    "HI": "सुरक्षा",
    "PT": "Segurança",
    "KO": "보안",
    "FR": "Sécurité",
    "JA": "セキュリティ"
  },
  "Security:": {
    "EN": "Security:",
    "TE": "సెక్యూరిటీ:",
    "TA": "பாதுகாப்பு:",
    "HI": "सुरक्षा:",
    "PT": "Segurança:",
    "KO": "보안:",
    "FR": "Sécurité:",
    "JA": "セキュリティ:"
  },
  "Selected": {
    "EN": "Selected",
    "TE": "ఎంచుకున్న",
    "TA": "தேர்ந்தெடுக்கப்பட்டது",
    "HI": "चयनित",
    "PT": "Selecionado",
    "KO": "선택됨",
    "FR": "Sélectionné",
    "JA": "選択中"
  },
  "Selected:": {
    "EN": "Selected:",
    "TE": "ఎంచుకున్న:",
    "TA": "தேர்ந்தெடுக்கப்பட்டது:",
    "HI": "चयनित:",
    "PT": "Selecionado:",
    "KO": "선택됨:",
    "FR": "Sélectionné:",
    "JA": "選択中:"
  },
  "Download": {
    "EN": "Download",
    "TE": "డౌన్‌లోడ్",
    "TA": "பதிவிறக்கு",
    "HI": "डाउनलोड",
    "PT": "Baixar",
    "KO": "다운로드",
    "FR": "Télécharger",
    "JA": "ダウンロード"
  },
  "Download:": {
    "EN": "Download:",
    "TE": "డౌన్‌లోడ్:",
    "TA": "பதிவிறக்கு:",
    "HI": "डाउनलोड:",
    "PT": "Baixar:",
    "KO": "다운로드:",
    "FR": "Télécharger:",
    "JA": "ダウンロード:"
  },
  "Complete": {
    "EN": "Complete",
    "TE": "పూర్తి",
    "TA": "முழுமையான",
    "HI": "पूर्ण",
    "PT": "Completo",
    "KO": "완료",
    "FR": "Complet",
    "JA": "完全"
  },
  "Complete:": {
    "EN": "Complete:",
    "TE": "పూర్తి:",
    "TA": "முழுமையான:",
    "HI": "पूर्ण:",
    "PT": "Completo:",
    "KO": "완료:",
    "FR": "Complet:",
    "JA": "完全:"
  },
  "Rejected": {
    "EN": "Rejected",
    "TE": "తిరస్కరించబడింది",
    "TA": "நிராகரிக்கப்பட்டது",
    "HI": "अस्वीकृत",
    "PT": "Rejeitado",
    "KO": "거부됨",
    "FR": "Rejeté",
    "JA": "拒否"
  },
  "Rejected:": {
    "EN": "Rejected:",
    "TE": "తిరస్కరించబడింది:",
    "TA": "நிராகரிக்கப்பட்டது:",
    "HI": "अस्वीकृत:",
    "PT": "Rejeitado:",
    "KO": "거부됨:",
    "FR": "Rejeté:",
    "JA": "拒否:"
  },
  "Disabled": {
    "EN": "Disabled",
    "TE": "డిసేబుల్ చేయబడింది",
    "TA": "முடக்கப்பட்டது",
    "HI": "अक्षम",
    "PT": "Desativado",
    "KO": "비활성화됨",
    "FR": "Désactivé",
    "JA": "無効"
  },
  "Disabled:": {
    "EN": "Disabled:",
    "TE": "డిసేబుల్ చేయబడింది:",
    "TA": "முடக்கப்பட்டது:",
    "HI": "अक्षम:",
    "PT": "Desativado:",
    "KO": "비활성화됨:",
    "FR": "Désactivé:",
    "JA": "無効:"
  },
  "Isolated": {
    "EN": "Isolated",
    "TE": "ఐసోలేట్ చేయబడింది",
    "TA": "தனிமைப்படுத்தப்பட்டது",
    "HI": "पृथक",
    "PT": "Isolado",
    "KO": "격리됨",
    "FR": "Isolé",
    "JA": "隔離済"
  },
  "Isolated:": {
    "EN": "Isolated:",
    "TE": "ఐసోలేట్ చేయబడింది:",
    "TA": "தனிமைப்படுத்தப்பட்டது:",
    "HI": "पृथक:",
    "PT": "Isolado:",
    "KO": "격리됨:",
    "FR": "Isolé:",
    "JA": "隔離済:"
  },
  "Students": {
    "EN": "Students",
    "TE": "విద్యార్థులు",
    "TA": "மாணவர்கள்",
    "HI": "छात्र",
    "PT": "Estudantes",
    "KO": "학생",
    "FR": "Étudiants",
    "JA": "受講生"
  },
  "Students:": {
    "EN": "Students:",
    "TE": "విద్యార్థులు:",
    "TA": "மாணவர்கள்:",
    "HI": "छात्र:",
    "PT": "Estudantes:",
    "KO": "학생:",
    "FR": "Étudiants:",
    "JA": "受講生:"
  },
  "Password": {
    "EN": "Password",
    "TE": "పాస్‌వర్డ్",
    "TA": "கடவுச்சொல்",
    "HI": "पासवर्ड",
    "PT": "Senha",
    "KO": "비밀번호",
    "FR": "Mot de passe",
    "JA": "パスワード"
  },
  "Password:": {
    "EN": "Password:",
    "TE": "పాస్‌వర్డ్:",
    "TA": "கடவுச்சொல்:",
    "HI": "पासवर्ड:",
    "PT": "Senha:",
    "KO": "비밀번호:",
    "FR": "Mot de passe:",
    "JA": "パスワード:"
  },
  "Progress": {
    "EN": "Progress",
    "TE": "పురోగతి",
    "TA": "முன்னேற்றம்",
    "HI": "प्रगति",
    "PT": "Progresso",
    "KO": "진행률",
    "FR": "Progression",
    "JA": "進捗"
  },
  "Progress:": {
    "EN": "Progress:",
    "TE": "పురోగతి:",
    "TA": "முன்னேற்றம்:",
    "HI": "प्रगति:",
    "PT": "Progresso:",
    "KO": "진행률:",
    "FR": "Progression:",
    "JA": "進捗:"
  },
  "Sections": {
    "EN": "Sections",
    "TE": "విభాగాలు",
    "TA": "பிரிவுகள்",
    "HI": "अनुभाग",
    "PT": "Seções",
    "KO": "섹션",
    "FR": "Sections",
    "JA": "セクション"
  },
  "Sections:": {
    "EN": "Sections:",
    "TE": "విభాగాలు:",
    "TA": "பிரிவுகள்:",
    "HI": "अनुभाग:",
    "PT": "Seções:",
    "KO": "섹션:",
    "FR": "Sections:",
    "JA": "セクション:"
  },
  "Evidence": {
    "EN": "Evidence",
    "TE": "ఆధారం",
    "TA": "ஆதாரம்",
    "HI": "प्रमाण",
    "PT": "Evidência",
    "KO": "증거",
    "FR": "Preuve",
    "JA": "エビデンス"
  },
  "Evidence:": {
    "EN": "Evidence:",
    "TE": "ఆధారం:",
    "TA": "ஆதாரம்:",
    "HI": "प्रमाण:",
    "PT": "Evidência:",
    "KO": "증거:",
    "FR": "Preuve:",
    "JA": "エビデンス:"
  },
  "Physical": {
    "EN": "Physical",
    "TE": "భౌతిక",
    "TA": "இயற்பியல்",
    "HI": "भौतिक",
    "PT": "Físico",
    "KO": "물리적",
    "FR": "Physique",
    "JA": "物理"
  },
  "Physical:": {
    "EN": "Physical:",
    "TE": "భౌతిక:",
    "TA": "இயற்பியல்:",
    "HI": "भौतिक:",
    "PT": "Físico:",
    "KO": "물리적:",
    "FR": "Physique:",
    "JA": "物理:"
  },
  "Previous": {
    "EN": "Previous",
    "TE": "మునుపటి",
    "TA": "முந்தைய",
    "HI": "पिछला",
    "PT": "Anterior",
    "KO": "이전",
    "FR": "Précédent",
    "JA": "前へ"
  },
  "Previous:": {
    "EN": "Previous:",
    "TE": "మునుపటి:",
    "TA": "முந்தைய:",
    "HI": "पिछला:",
    "PT": "Anterior:",
    "KO": "이전:",
    "FR": "Précédent:",
    "JA": "前へ:"
  },
  "Daylight": {
    "EN": "Daylight",
    "TE": "పగటి వెలుగు",
    "TA": "பகல் ஒளி",
    "HI": "दिन का प्रकाश",
    "PT": "Luz do Dia",
    "KO": "주간 (Daylight)",
    "FR": "Lumière du jour",
    "JA": "昼光"
  },
  "Daylight:": {
    "EN": "Daylight:",
    "TE": "పగటి వెలుగు:",
    "TA": "பகல் ஒளி:",
    "HI": "दिन का प्रकाश:",
    "PT": "Luz do Dia:",
    "KO": "주간 (Daylight):",
    "FR": "Lumière du jour:",
    "JA": "昼光:"
  },
  "Endpoint": {
    "EN": "Endpoint",
    "TE": "ఎండ్‌పాయింట్",
    "TA": "முனை (Endpoint)",
    "HI": "एंडपॉइंट",
    "PT": "Ponto de extremidade",
    "KO": "엔드포인트",
    "FR": "Point de terminaison",
    "JA": "エンドポイント"
  },
  "Endpoint:": {
    "EN": "Endpoint:",
    "TE": "ఎండ్‌పాయింట్:",
    "TA": "முனை (Endpoint):",
    "HI": "एंडपॉइंट:",
    "PT": "Ponto de extremidade:",
    "KO": "엔드포인트:",
    "FR": "Point de terminaison:",
    "JA": "エンドポイント:"
  },
  "Severity": {
    "EN": "Severity",
    "TE": "తీవ్రత",
    "TA": "தீவிரம்",
    "HI": "गंभीरता",
    "PT": "Severidade",
    "KO": "심각도",
    "FR": "Sévérité",
    "JA": "重要度"
  },
  "Severity:": {
    "EN": "Severity:",
    "TE": "తీవ్రత:",
    "TA": "தீவிரம்:",
    "HI": "गंभीरता:",
    "PT": "Severidade:",
    "KO": "심각도:",
    "FR": "Sévérité:",
    "JA": "重要度:"
  },
  "Position": {
    "EN": "Position",
    "TE": "స్థానం (Position)",
    "TA": "நிலை",
    "HI": "स्थान/स्थिति",
    "PT": "Posição",
    "KO": "위치/상태",
    "FR": "Position d'organe",
    "JA": "位置・状態"
  },
  "Position:": {
    "EN": "Position:",
    "TE": "స్థానం (Position):",
    "TA": "நிலை:",
    "HI": "स्थान/स्थिति:",
    "PT": "Posição:",
    "KO": "위치/상태:",
    "FR": "Position d'organe:",
    "JA": "位置・状態:"
  },
  "Critical": {
    "EN": "Critical",
    "TE": "క్రిటికల్",
    "TA": "மிக முக்கியமான",
    "HI": "गंभीर (Critical)",
    "PT": "Crítico",
    "KO": "치명적 (Critical)",
    "FR": "Critique",
    "JA": "重大（クリティカル）"
  },
  "Critical:": {
    "EN": "Critical:",
    "TE": "క్రిటికల్:",
    "TA": "மிக முக்கியமான:",
    "HI": "गंभीर (Critical):",
    "PT": "Crítico:",
    "KO": "치명적 (Critical):",
    "FR": "Critique:",
    "JA": "重大（クリティカル）:"
  },
  "Category": {
    "EN": "Category",
    "TE": "వర్గం",
    "TA": "வகை",
    "HI": "श्रेणी",
    "PT": "Categoria",
    "KO": "카테고리",
    "FR": "Catégorie",
    "JA": "カテゴリ"
  },
  "Category:": {
    "EN": "Category:",
    "TE": "వర్గం:",
    "TA": "வகை:",
    "HI": "श्रेणी:",
    "PT": "Categoria:",
    "KO": "카테고리:",
    "FR": "Catégorie:",
    "JA": "カテゴリ:"
  },
  "Expected": {
    "EN": "Expected",
    "TE": "ఆశించిన",
    "TA": "எதிர்பார்க்கப்படும்",
    "HI": "अपेक्षित",
    "PT": "Esperado",
    "KO": "예상값",
    "FR": "Attendu",
    "JA": "期待値"
  },
  "Expected:": {
    "EN": "Expected:",
    "TE": "ఆశించిన:",
    "TA": "எதிர்பார்க்கப்படும்:",
    "HI": "अपेक्षित:",
    "PT": "Esperado:",
    "KO": "예상값:",
    "FR": "Attendu:",
    "JA": "期待値:"
  },
  "Operator": {
    "EN": "Operator",
    "TE": "ఆపరేటర్",
    "TA": "இயக்குநர்",
    "HI": "ऑपरेटर",
    "PT": "Operador",
    "KO": "운영자",
    "FR": "Opérateur",
    "JA": "オペレーター"
  },
  "Operator:": {
    "EN": "Operator:",
    "TE": "ఆపరేటర్:",
    "TA": "இயக்குநர்:",
    "HI": "ऑपरेटर:",
    "PT": "Operador:",
    "KO": "운영자:",
    "FR": "Opérateur:",
    "JA": "オペレーター:"
  },
  "Mismatch": {
    "EN": "Mismatch",
    "TE": "మిస్‌మ్యాచ్",
    "TA": "பொருத்தமின்மை",
    "HI": "बेमेल (Mismatch)",
    "PT": "Incompatibilidade",
    "KO": "불일치",
    "FR": "Incohérence",
    "JA": "不一致"
  },
  "Mismatch:": {
    "EN": "Mismatch:",
    "TE": "మిస్‌మ్యాచ్:",
    "TA": "பொருத்தமின்மை:",
    "HI": "बेमेल (Mismatch):",
    "PT": "Incompatibilidade:",
    "KO": "불일치:",
    "FR": "Incohérence:",
    "JA": "不一致:"
  },
  "Priority": {
    "EN": "Priority",
    "TE": "ప్రాధాన్యత",
    "TA": "முன்னுரிமை",
    "HI": "प्राथमिकता",
    "PT": "Prioridade",
    "KO": "우선순위",
    "FR": "Priorité",
    "JA": "優先度"
  },
  "Priority:": {
    "EN": "Priority:",
    "TE": "ప్రాధాన్యత:",
    "TA": "முன்னுரிமை:",
    "HI": "प्राथमिकता:",
    "PT": "Prioridade:",
    "KO": "우선순위:",
    "FR": "Priorité:",
    "JA": "優先度:"
  },
  "Transfer": {
    "EN": "Transfer",
    "TE": "ట్రాన్స్‌ఫర్",
    "TA": "மாற்றம்",
    "HI": "ट्रांसफर",
    "PT": "Transferência",
    "KO": "절체/전송",
    "FR": "Transfert",
    "JA": "切替・転送"
  },
  "Transfer:": {
    "EN": "Transfer:",
    "TE": "ట్రాన్స్‌ఫర్:",
    "TA": "மாற்றம்:",
    "HI": "ट्रांसफर:",
    "PT": "Transferência:",
    "KO": "절체/전송:",
    "FR": "Transfert:",
    "JA": "切替・転送:"
  },
  "Sequence": {
    "EN": "Sequence",
    "TE": "సీక్వెన్స్",
    "TA": "வரிசை",
    "HI": "अनुक्रम",
    "PT": "Sequência",
    "KO": "시퀀스",
    "FR": "Séquence",
    "JA": "シーケンス"
  },
  "Sequence:": {
    "EN": "Sequence:",
    "TE": "సీక్వెన్స్:",
    "TA": "வரிசை:",
    "HI": "अनुक्रम:",
    "PT": "Sequência:",
    "KO": "시퀀스:",
    "FR": "Séquence:",
    "JA": "シーケンス:"
  },
  "Overload": {
    "EN": "Overload",
    "TE": "ఓవర్‌లోడ్",
    "TA": "அதிக சுமை",
    "HI": "ओवरलोड",
    "PT": "Sobrecarga",
    "KO": "과부하",
    "FR": "Surcharge",
    "JA": "過負荷"
  },
  "Overload:": {
    "EN": "Overload:",
    "TE": "ఓవర్‌లోడ్:",
    "TA": "அதிக சுமை:",
    "HI": "ओवरलोड:",
    "PT": "Sobrecarga:",
    "KO": "과부하:",
    "FR": "Surcharge:",
    "JA": "過負荷:"
  },
  "Recovery": {
    "EN": "Recovery",
    "TE": "రికవరీ",
    "TA": "மீட்பு",
    "HI": "रिकवरी",
    "PT": "Recuperação",
    "KO": "복구",
    "FR": "Reprise",
    "JA": "復旧"
  },
  "Recovery:": {
    "EN": "Recovery:",
    "TE": "రికవరీ:",
    "TA": "மீட்பு:",
    "HI": "रिकवरी:",
    "PT": "Recuperação:",
    "KO": "복구:",
    "FR": "Reprise:",
    "JA": "復旧:"
  },
  "Terminal": {
    "EN": "Terminal",
    "TE": "టెర్మినల్",
    "TA": "முனையம்",
    "HI": "टर्मिनल",
    "PT": "Terminal de conexão",
    "KO": "터미널/단자",
    "FR": "Borne / Terminal",
    "JA": "端子・ターミナル"
  },
  "Terminal:": {
    "EN": "Terminal:",
    "TE": "టెర్మినల్:",
    "TA": "முனையம்:",
    "HI": "टर्मिनल:",
    "PT": "Terminal de conexão:",
    "KO": "터미널/단자:",
    "FR": "Borne / Terminal:",
    "JA": "端子・ターミナル:"
  },
  "Internal": {
    "EN": "Internal",
    "TE": "అంతర్గత",
    "TA": "உள்",
    "HI": "आंतरिक",
    "PT": "Interno",
    "KO": "내부",
    "FR": "Interne",
    "JA": "内部"
  },
  "Internal:": {
    "EN": "Internal:",
    "TE": "అంతర్గత:",
    "TA": "உள்:",
    "HI": "आंतरिक:",
    "PT": "Interno:",
    "KO": "내부:",
    "FR": "Interne:",
    "JA": "内部:"
  },
  "External": {
    "EN": "External",
    "TE": "బాహ్య",
    "TA": "வெளி",
    "HI": "बाहरी",
    "PT": "Externo",
    "KO": "외부",
    "FR": "Externe",
    "JA": "外部"
  },
  "External:": {
    "EN": "External:",
    "TE": "బాహ్య:",
    "TA": "வெளி:",
    "HI": "बाहरी:",
    "PT": "Externo:",
    "KO": "외부:",
    "FR": "Externe:",
    "JA": "外部:"
  },
  "Wireless": {
    "EN": "Wireless",
    "TE": "వైర్‌లెస్",
    "TA": "வயர்லெஸ்",
    "HI": "वायरलेस",
    "PT": "Sem Fio (Wireless)",
    "KO": "무선",
    "FR": "Sans fil",
    "JA": "無線"
  },
  "Wireless:": {
    "EN": "Wireless:",
    "TE": "వైర్‌లెస్:",
    "TA": "வயர்லெஸ்:",
    "HI": "वायरलेस:",
    "PT": "Sem Fio (Wireless):",
    "KO": "무선:",
    "FR": "Sans fil:",
    "JA": "無線:"
  },
  "DataSet:": {
    "EN": "DataSet:",
    "TE": "డేటాసెట్:",
    "TA": "தரவுத்தொகுப்பு:",
    "HI": "डेटासेट:",
    "PT": "Conjunto de Dados:",
    "KO": "데이터셋:",
    "FR": "Jeu de données :",
    "JA": "データセット:"
  },
  "Evaluate": {
    "EN": "Evaluate",
    "TE": "మూల్యాంకనం చేయండి",
    "TA": "மதிப்பிடு",
    "HI": "मूल्यांकन करें",
    "PT": "Avaliar",
    "KO": "평가",
    "FR": "Évaluer",
    "JA": "評価"
  },
  "Evaluate:": {
    "EN": "Evaluate:",
    "TE": "మూల్యాంకనం చేయండి:",
    "TA": "மதிப்பிடு:",
    "HI": "मूल्यांकन करें:",
    "PT": "Avaliar:",
    "KO": "평가:",
    "FR": "Évaluer:",
    "JA": "評価:"
  },
  "Zoom in": {
    "EN": "Zoom in",
    "TE": "జూమ్ ఇన్",
    "TA": "பெரிதாக்கு",
    "HI": "ज़ूम इन",
    "PT": "Aumentar zoom",
    "KO": "확대",
    "FR": "Zoom avant",
    "JA": "拡大"
  },
  "Zoom in:": {
    "EN": "Zoom in:",
    "TE": "జూమ్ ఇన్:",
    "TA": "பெரிதாக்கு:",
    "HI": "ज़ूम इन:",
    "PT": "Aumentar zoom:",
    "KO": "확대:",
    "FR": "Zoom avant:",
    "JA": "拡大:"
  },
  "Academy": {
    "EN": "Academy",
    "TE": "అకాడమీ",
    "TA": "அகாடமி",
    "HI": "अकादमी",
    "PT": "Academia",
    "KO": "아카데미",
    "FR": "Académie",
    "JA": "アカデミー"
  },
  "Academy:": {
    "EN": "Academy:",
    "TE": "అకాడమీ:",
    "TA": "அகாடமி:",
    "HI": "अकादमी:",
    "PT": "Academia:",
    "KO": "아카데미:",
    "FR": "Académie:",
    "JA": "アカデミー:"
  },
  "Network": {
    "EN": "Network",
    "TE": "నెట్‌వర్క్",
    "TA": "பிணையம்",
    "HI": "नेटवर्क",
    "PT": "Rede",
    "KO": "네트워크",
    "FR": "Réseau",
    "JA": "ネットワーク"
  },
  "Network:": {
    "EN": "Network:",
    "TE": "నెట్‌వర్క్:",
    "TA": "பிணையம்:",
    "HI": "नेटवर्क:",
    "PT": "Rede:",
    "KO": "네트워크:",
    "FR": "Réseau:",
    "JA": "ネットワーク:"
  },
  "Station": {
    "EN": "Station",
    "TE": "స్టేషన్",
    "TA": "நிலையம்",
    "HI": "स्टेशन",
    "PT": "Estação",
    "KO": "스테이션",
    "FR": "Poste",
    "JA": "ステーション"
  },
  "Station:": {
    "EN": "Station:",
    "TE": "స్టేషన్:",
    "TA": "நிலையம்:",
    "HI": "स्टेशन:",
    "PT": "Estação:",
    "KO": "스테이션:",
    "FR": "Poste:",
    "JA": "ステーション:"
  },
  "Feeders": {
    "EN": "Feeders",
    "TE": "ఫీడర్లు",
    "TA": "ஃபீடர்கள்",
    "HI": "फीडर",
    "PT": "Alimentadores",
    "KO": "피더",
    "FR": "Départs",
    "JA": "フィーダ"
  },
  "Feeders:": {
    "EN": "Feeders:",
    "TE": "ఫీడర్లు:",
    "TA": "ஃபீடர்கள்:",
    "HI": "फीडर:",
    "PT": "Alimentadores:",
    "KO": "피더:",
    "FR": "Départs:",
    "JA": "フィーダ:"
  },
  "Incomer": {
    "EN": "Incomer",
    "TE": "ఇన్‌కమర్",
    "TA": "இன்கமர்",
    "HI": "इनकमर",
    "PT": "Entrada",
    "KO": "수전반",
    "FR": "Arrivée",
    "JA": "受電"
  },
  "Incomer:": {
    "EN": "Incomer:",
    "TE": "ఇన్‌కమర్:",
    "TA": "இன்கமர்:",
    "HI": "इनकमर:",
    "PT": "Entrada:",
    "KO": "수전반:",
    "FR": "Arrivée:",
    "JA": "受電:"
  },
  "Breaker": {
    "EN": "Breaker",
    "TE": "బ్రేకర్",
    "TA": "பிரேக்கர்",
    "HI": "ब्रेकर",
    "PT": "Disjuntor",
    "KO": "차단기",
    "FR": "Disjoncteur",
    "JA": "遮断器"
  },
  "Breaker:": {
    "EN": "Breaker:",
    "TE": "బ్రేకర్:",
    "TA": "பிரேக்கர்:",
    "HI": "ब्रेकर:",
    "PT": "Disjuntor:",
    "KO": "차단기:",
    "FR": "Disjoncteur:",
    "JA": "遮断器:"
  },
  "Coupler": {
    "EN": "Coupler",
    "TE": "కప్లర్",
    "TA": "கப்ளர்",
    "HI": "कपलर",
    "PT": "Interligador",
    "KO": "연락 차단기",
    "FR": "Couplage",
    "JA": "連絡遮断器"
  },
  "Coupler:": {
    "EN": "Coupler:",
    "TE": "కప్లర్:",
    "TA": "கப்ளர்:",
    "HI": "कपलर:",
    "PT": "Interligador:",
    "KO": "연락 차단기:",
    "FR": "Couplage:",
    "JA": "連絡遮断器:"
  },
  "Control": {
    "EN": "Control",
    "TE": "కంట్రోల్",
    "TA": "கட்டுப்பாடு",
    "HI": "नियंत्रण",
    "PT": "Controle",
    "KO": "제어",
    "FR": "Contrôle",
    "JA": "制御"
  },
  "Control:": {
    "EN": "Control:",
    "TE": "కంట్రోల్:",
    "TA": "கட்டுப்பாடு:",
    "HI": "नियंत्रण:",
    "PT": "Controle:",
    "KO": "제어:",
    "FR": "Contrôle:",
    "JA": "制御:"
  },
  "Command": {
    "EN": "Command",
    "TE": "కమాండ్",
    "TA": "கட்டளை",
    "HI": "कमांड",
    "PT": "Comando",
    "KO": "명령",
    "FR": "Commande",
    "JA": "コマンド"
  },
  "Command:": {
    "EN": "Command:",
    "TE": "కమాండ్:",
    "TA": "கட்டளை:",
    "HI": "कमांड:",
    "PT": "Comando:",
    "KO": "명령:",
    "FR": "Commande:",
    "JA": "コマンド:"
  },
  "Devices": {
    "EN": "Devices",
    "TE": "పరికరాలు",
    "TA": "சாதனங்கள்",
    "HI": "उपकरण",
    "PT": "Dispositivos",
    "KO": "장치",
    "FR": "Appareils",
    "JA": "デバイス"
  },
  "Devices:": {
    "EN": "Devices:",
    "TE": "పరికరాలు:",
    "TA": "சாதனங்கள்:",
    "HI": "उपकरण:",
    "PT": "Dispositivos:",
    "KO": "장치:",
    "FR": "Appareils:",
    "JA": "デバイス:"
  },
  "Servers": {
    "EN": "Servers",
    "TE": "సర్వర్లు",
    "TA": "சேவையகங்கள்",
    "HI": "सर्वर",
    "PT": "Servidores",
    "KO": "서버",
    "FR": "Serveurs",
    "JA": "サーバー"
  },
  "Servers:": {
    "EN": "Servers:",
    "TE": "సర్వర్లు:",
    "TA": "சேவையகங்கள்:",
    "HI": "सर्वर:",
    "PT": "Servidores:",
    "KO": "서버:",
    "FR": "Serveurs:",
    "JA": "サーバー:"
  },
  "Gateway": {
    "EN": "Gateway",
    "TE": "గేట్‌వే",
    "TA": "கேட்வே",
    "HI": "गेटवे",
    "PT": "Gateway (Passarela)",
    "KO": "게이트웨이",
    "FR": "Passerelle",
    "JA": "ゲートウェイ"
  },
  "Gateway:": {
    "EN": "Gateway:",
    "TE": "గేట్‌వే:",
    "TA": "கேட்வே:",
    "HI": "गेटवे:",
    "PT": "Gateway (Passarela):",
    "KO": "게이트웨이:",
    "FR": "Passerelle:",
    "JA": "ゲートウェイ:"
  },
  "Optical": {
    "EN": "Optical",
    "TE": "ఆప్టికల్",
    "TA": "ஆப்டிகல்",
    "HI": "ऑप्टिकल",
    "PT": "Óptico",
    "KO": "광학",
    "FR": "Optique",
    "JA": "光"
  },
  "Optical:": {
    "EN": "Optical:",
    "TE": "ఆప్టికల్:",
    "TA": "ஆப்டிகல்:",
    "HI": "ऑप्टिकल:",
    "PT": "Óptico:",
    "KO": "광학:",
    "FR": "Optique:",
    "JA": "光:"
  },
  "Signals": {
    "EN": "Signals",
    "TE": "సిగ్నల్స్",
    "TA": "சிக்னல்கள்",
    "HI": "सिग्नल",
    "PT": "Sinais",
    "KO": "신호",
    "FR": "Signaux",
    "JA": "信号"
  },
  "Signals:": {
    "EN": "Signals:",
    "TE": "సిగ్నల్స్:",
    "TA": "சிக்னல்கள்:",
    "HI": "सिग्नल:",
    "PT": "Sinais:",
    "KO": "신호:",
    "FR": "Signaux:",
    "JA": "信号:"
  },
  "Mapping": {
    "EN": "Mapping",
    "TE": "మ్యాపింగ్",
    "TA": "மேப்பிங்",
    "HI": "मैपिंग",
    "PT": "Mapeamento",
    "KO": "매핑",
    "FR": "Mappage",
    "JA": "マッピング"
  },
  "Mapping:": {
    "EN": "Mapping:",
    "TE": "మ్యాపింగ్:",
    "TA": "மேப்பிங்:",
    "HI": "मैपिंग:",
    "PT": "Mapeamento:",
    "KO": "매핑:",
    "FR": "Mappage:",
    "JA": "マッピング:"
  },
  "Failure": {
    "EN": "Failure",
    "TE": "ఫెయిల్యూర్",
    "TA": "தோல்வி",
    "HI": "विफलता",
    "PT": "Falha",
    "KO": "장애",
    "FR": "Défaillance",
    "JA": "障害"
  },
  "Failure:": {
    "EN": "Failure:",
    "TE": "ఫెయిల్యూర్:",
    "TA": "தோல்வி:",
    "HI": "विफलता:",
    "PT": "Falha:",
    "KO": "장애:",
    "FR": "Défaillance:",
    "JA": "障害:"
  },
  "Testing": {
    "EN": "Testing",
    "TE": "టెస్టింగ్",
    "TA": "சோதனை",
    "HI": "परीक्षण",
    "PT": "Teste",
    "KO": "테스팅",
    "FR": "Tests",
    "JA": "テスト"
  },
  "Testing:": {
    "EN": "Testing:",
    "TE": "టెస్టింగ్:",
    "TA": "சோதனை:",
    "HI": "परीक्षण:",
    "PT": "Teste:",
    "KO": "테스팅:",
    "FR": "Tests:",
    "JA": "テスト:"
  },
  "Chapter": {
    "EN": "Chapter",
    "TE": "అధ్యాయం",
    "TA": "அத்தியாயம்",
    "HI": "अध्याय",
    "PT": "Capítulo",
    "KO": "장",
    "FR": "Chapitre",
    "JA": "チャプター"
  },
  "Chapter:": {
    "EN": "Chapter:",
    "TE": "అధ్యాయం:",
    "TA": "அத்தியாயம்:",
    "HI": "अध्याय:",
    "PT": "Capítulo:",
    "KO": "장:",
    "FR": "Chapitre:",
    "JA": "チャプター:"
  },
  "Modules": {
    "EN": "Modules",
    "TE": "మాడ్యూల్స్",
    "TA": "தொகுதிகள்",
    "HI": "मॉड्यूल",
    "PT": "Módulos",
    "KO": "모듈",
    "FR": "Modules",
    "JA": "モジュール"
  },
  "Modules:": {
    "EN": "Modules:",
    "TE": "మాడ్యూల్స్:",
    "TA": "தொகுதிகள்:",
    "HI": "मॉड्यूल:",
    "PT": "Módulos:",
    "KO": "모듈:",
    "FR": "Modules:",
    "JA": "モジュール:"
  },
  "Lessons": {
    "EN": "Lessons",
    "TE": "పాఠాలు",
    "TA": "பாடங்கள்",
    "HI": "पाठ",
    "PT": "Lições",
    "KO": "강의",
    "FR": "Leçons",
    "JA": "レッスン"
  },
  "Lessons:": {
    "EN": "Lessons:",
    "TE": "పాఠాలు:",
    "TA": "பாடங்கள்:",
    "HI": "पाठ:",
    "PT": "Lições:",
    "KO": "강의:",
    "FR": "Leçons:",
    "JA": "レッスン:"
  },
  "Diagram": {
    "EN": "Diagram",
    "TE": "డయాగ్రమ్",
    "TA": "வரைபடம்",
    "HI": "आरेख",
    "PT": "Diagrama",
    "KO": "다이어그램",
    "FR": "Schéma",
    "JA": "ダイアグラム"
  },
  "Diagram:": {
    "EN": "Diagram:",
    "TE": "డయాగ్రమ్:",
    "TA": "வரைபடம்:",
    "HI": "आरेख:",
    "PT": "Diagrama:",
    "KO": "다이어그램:",
    "FR": "Schéma:",
    "JA": "ダイアグラム:"
  },
  "Example": {
    "EN": "Example",
    "TE": "ఉదాహరణ",
    "TA": "எடுத்துக்காட்டு",
    "HI": "उदाहरण",
    "PT": "Exemplo",
    "KO": "예제",
    "FR": "Exemple",
    "JA": "例"
  },
  "Example:": {
    "EN": "Example:",
    "TE": "ఉదాహరణ:",
    "TA": "எடுத்துக்காட்டு:",
    "HI": "उदाहरण:",
    "PT": "Exemplo:",
    "KO": "예제:",
    "FR": "Exemple:",
    "JA": "例:"
  },
  "Summary": {
    "EN": "Summary",
    "TE": "సారాంశం",
    "TA": "சுருக்கம்",
    "HI": "सारांश",
    "PT": "Resumo",
    "KO": "요약",
    "FR": "Résumé",
    "JA": "概要"
  },
  "Summary:": {
    "EN": "Summary:",
    "TE": "సారాంశం:",
    "TA": "சுருக்கம்:",
    "HI": "सारांश:",
    "PT": "Resumo:",
    "KO": "요약:",
    "FR": "Résumé:",
    "JA": "概要:"
  },
  "Details": {
    "EN": "Details",
    "TE": "వివరాలు",
    "TA": "விவரங்கள்",
    "HI": "विवरण",
    "PT": "Detalhes",
    "KO": "상세 정보",
    "FR": "Détails",
    "JA": "詳細"
  },
  "Details:": {
    "EN": "Details:",
    "TE": "వివరాలు:",
    "TA": "விவரங்கள்:",
    "HI": "विवरण:",
    "PT": "Detalhes:",
    "KO": "상세 정보:",
    "FR": "Détails:",
    "JA": "詳細:"
  },
  "Quality": {
    "EN": "Quality",
    "TE": "క్వాలిటీ",
    "TA": "தரம்",
    "HI": "गुणवत्ता",
    "PT": "Qualidade",
    "KO": "품질",
    "FR": "Qualité",
    "JA": "品質"
  },
  "Quality:": {
    "EN": "Quality:",
    "TE": "క్వాలిటీ:",
    "TA": "தரம்:",
    "HI": "गुणवत्ता:",
    "PT": "Qualidade:",
    "KO": "품질:",
    "FR": "Qualité:",
    "JA": "品質:"
  },
  "Address": {
    "EN": "Address",
    "TE": "అడ్రస్",
    "TA": "முகவரி",
    "HI": "पता",
    "PT": "Endereço",
    "KO": "주소",
    "FR": "Adresse",
    "JA": "アドレス"
  },
  "Address:": {
    "EN": "Address:",
    "TE": "అడ్రస్:",
    "TA": "முகவரி:",
    "HI": "पता:",
    "PT": "Endereço:",
    "KO": "주소:",
    "FR": "Adresse:",
    "JA": "アドレス:"
  },
  "Voltage": {
    "EN": "Voltage",
    "TE": "వోల్టేజ్",
    "TA": "மின்னழுத்தம்",
    "HI": "वोल्टेज",
    "PT": "Tensão",
    "KO": "전압",
    "FR": "Tension",
    "JA": "電圧"
  },
  "Voltage:": {
    "EN": "Voltage:",
    "TE": "వోల్టేజ్:",
    "TA": "மின்னழுத்தம்:",
    "HI": "वोल्टेज:",
    "PT": "Tensão:",
    "KO": "전압:",
    "FR": "Tension:",
    "JA": "電圧:"
  },
  "Current": {
    "EN": "Current",
    "TE": "కరెంట్",
    "TA": "மின்னோட்டம்",
    "HI": "करंट",
    "PT": "Corrente",
    "KO": "전류",
    "FR": "Courant",
    "JA": "電流"
  },
  "Current:": {
    "EN": "Current:",
    "TE": "కరెంట్:",
    "TA": "மின்னோட்டம்:",
    "HI": "करंट:",
    "PT": "Corrente:",
    "KO": "전류:",
    "FR": "Courant:",
    "JA": "電流:"
  },
  "Reports": {
    "EN": "Reports",
    "TE": "రిపోర్టులు",
    "TA": "அறிக்கைகள்",
    "HI": "रिपोर्ट",
    "PT": "Relatórios",
    "KO": "보고서",
    "FR": "Rapports",
    "JA": "レポート"
  },
  "Reports:": {
    "EN": "Reports:",
    "TE": "రిపోర్టులు:",
    "TA": "அறிக்கைகள்:",
    "HI": "रिपोर्ट:",
    "PT": "Relatórios:",
    "KO": "보고서:",
    "FR": "Rapports:",
    "JA": "レポート:"
  },
  "History": {
    "EN": "History",
    "TE": "చరిత్ర",
    "TA": "வரலாறு",
    "HI": "इतिहास",
    "PT": "Histórico",
    "KO": "이력",
    "FR": "Historique",
    "JA": "履歴"
  },
  "History:": {
    "EN": "History:",
    "TE": "చరిత్ర:",
    "TA": "வரலாறு:",
    "HI": "इतिहास:",
    "PT": "Histórico:",
    "KO": "이력:",
    "FR": "Historique:",
    "JA": "履歴:"
  },
  "Inspect": {
    "EN": "Inspect",
    "TE": "తనిఖీ చేయండి",
    "TA": "ஆய்வு செய்",
    "HI": "निरीक्षण करें",
    "PT": "Inspecionar",
    "KO": "검사",
    "FR": "Inspecter",
    "JA": "検査・確認"
  },
  "Inspect:": {
    "EN": "Inspect:",
    "TE": "తనిఖీ చేయండి:",
    "TA": "ஆய்வு செய்:",
    "HI": "निरीक्षण करें:",
    "PT": "Inspecionar:",
    "KO": "검사:",
    "FR": "Inspecter:",
    "JA": "検査・確認:"
  },
  "Execute": {
    "EN": "Execute",
    "TE": "అమలు చేయండి",
    "TA": "இயக்கு",
    "HI": "निष्पादित करें",
    "PT": "Executar",
    "KO": "실행",
    "FR": "Exécuter",
    "JA": "実行"
  },
  "Execute:": {
    "EN": "Execute:",
    "TE": "అమలు చేయండి:",
    "TA": "இயக்கு:",
    "HI": "निष्पादित करें:",
    "PT": "Executar:",
    "KO": "실행:",
    "FR": "Exécuter:",
    "JA": "実行:"
  },
  "Operate": {
    "EN": "Operate",
    "TE": "ఆపరేట్ చేయండి",
    "TA": "இயக்கு",
    "HI": "संचालित करें",
    "PT": "Operar",
    "KO": "조작",
    "FR": "Opérer",
    "JA": "操作"
  },
  "Operate:": {
    "EN": "Operate:",
    "TE": "ఆపరేట్ చేయండి:",
    "TA": "இயக்கு:",
    "HI": "संचालित करें:",
    "PT": "Operar:",
    "KO": "조작:",
    "FR": "Opérer:",
    "JA": "操作:"
  },
  "Confirm": {
    "EN": "Confirm",
    "TE": "నిర్ధారించండి",
    "TA": "உறுதிப்படுத்து",
    "HI": "पुष्टि करें",
    "PT": "Confirmar",
    "KO": "확인",
    "FR": "Confirmer",
    "JA": "確認"
  },
  "Confirm:": {
    "EN": "Confirm:",
    "TE": "నిర్ధారించండి:",
    "TA": "உறுதிப்படுத்து:",
    "HI": "पुष्टि करें:",
    "PT": "Confirmar:",
    "KO": "확인:",
    "FR": "Confirmer:",
    "JA": "確認:"
  },
  "Preview": {
    "EN": "Preview",
    "TE": "ప్రివ్యూ",
    "TA": "முன்னோட்டம்",
    "HI": "पूर्वावलोकन",
    "PT": "Pré-visualização",
    "KO": "미리보기",
    "FR": "Aperçu",
    "JA": "プレビュー"
  },
  "Preview:": {
    "EN": "Preview:",
    "TE": "ప్రివ్యూ:",
    "TA": "முன்னோட்டம்:",
    "HI": "पूर्वावलोकन:",
    "PT": "Pré-visualização:",
    "KO": "미리보기:",
    "FR": "Aperçu:",
    "JA": "プレビュー:"
  },
  "Healthy": {
    "EN": "Healthy",
    "TE": "సాధారణం (Healthy)",
    "TA": "இயல்பானது",
    "HI": "स्वस्थ",
    "PT": "Íntegro",
    "KO": "정상",
    "FR": "Sain",
    "JA": "正常"
  },
  "Healthy:": {
    "EN": "Healthy:",
    "TE": "సాధారణం (Healthy):",
    "TA": "இயல்பானது:",
    "HI": "स्वस्थ:",
    "PT": "Íntegro:",
    "KO": "정상:",
    "FR": "Sain:",
    "JA": "正常:"
  },
  "Blocked": {
    "EN": "Blocked",
    "TE": "బ్లాక్ చేయబడింది",
    "TA": "தடுக்கப்பட்டது",
    "HI": "अवरुद्ध",
    "PT": "Bloqueado",
    "KO": "차단됨",
    "FR": "Bloqué",
    "JA": "ブロック済"
  },
  "Blocked:": {
    "EN": "Blocked:",
    "TE": "బ్లాక్ చేయబడింది:",
    "TA": "தடுக்கப்பட்டது:",
    "HI": "अवरुद्ध:",
    "PT": "Bloqueado:",
    "KO": "차단됨:",
    "FR": "Bloqué:",
    "JA": "ブロック済:"
  },
  "Enabled": {
    "EN": "Enabled",
    "TE": "ఎనేబుల్ చేయబడింది",
    "TA": "இயக்கப்பட்டது",
    "HI": "सक्षम",
    "PT": "Ativado",
    "KO": "활성화됨",
    "FR": "Activé",
    "JA": "有効"
  },
  "Enabled:": {
    "EN": "Enabled:",
    "TE": "ఎనేబుల్ చేయబడింది:",
    "TA": "இயக்கப்பட்டது:",
    "HI": "सक्षम:",
    "PT": "Ativado:",
    "KO": "활성화됨:",
    "FR": "Activé:",
    "JA": "有効:"
  },
  "Offline": {
    "EN": "Offline",
    "TE": "ఆఫ్‌లైన్",
    "TA": "ஆஃப்லைன்",
    "HI": "ऑफ़लाइन",
    "PT": "Offline",
    "KO": "오프라인",
    "FR": "Hors ligne",
    "JA": "オフライン"
  },
  "Offline:": {
    "EN": "Offline:",
    "TE": "ఆఫ్‌లైన్:",
    "TA": "ஆஃப்லைன்:",
    "HI": "ऑफ़लाइन:",
    "PT": "Offline:",
    "KO": "오프라인:",
    "FR": "Hors ligne:",
    "JA": "オフライン:"
  },
  "Profile": {
    "EN": "Profile",
    "TE": "ప్రొఫైల్",
    "TA": "சுயவிவரம்",
    "HI": "प्रोफ़ाइल",
    "PT": "Perfil",
    "KO": "프로필",
    "FR": "Profil",
    "JA": "プロフィール"
  },
  "Profile:": {
    "EN": "Profile:",
    "TE": "ప్రొఫైల్:",
    "TA": "சுயவிவரம்:",
    "HI": "प्रोफ़ाइल:",
    "PT": "Perfil:",
    "KO": "프로필:",
    "FR": "Profil:",
    "JA": "プロフィール:"
  },
  "Account": {
    "EN": "Account",
    "TE": "ఖాతా",
    "TA": "கணக்கு",
    "HI": "खाता",
    "PT": "Conta",
    "KO": "계정",
    "FR": "Compte",
    "JA": "アカウント"
  },
  "Account:": {
    "EN": "Account:",
    "TE": "ఖాతా:",
    "TA": "கணக்கு:",
    "HI": "खाता:",
    "PT": "Conta:",
    "KO": "계정:",
    "FR": "Compte:",
    "JA": "アカウント:"
  },
  "Student": {
    "EN": "Student",
    "TE": "విద్యార్థి",
    "TA": "மாணவர்",
    "HI": "छात्र",
    "PT": "Estudante",
    "KO": "학생",
    "FR": "Étudiant",
    "JA": "受講生"
  },
  "Student:": {
    "EN": "Student:",
    "TE": "విద్యార్థి:",
    "TA": "மாணவர்:",
    "HI": "छात्र:",
    "PT": "Estudante:",
    "KO": "학생:",
    "FR": "Étudiant:",
    "JA": "受講生:"
  },
  "Section": {
    "EN": "Section",
    "TE": "విభాగం",
    "TA": "பிரிவு",
    "HI": "अनुभाग",
    "PT": "Seção",
    "KO": "섹션",
    "FR": "Section de poste",
    "JA": "セクション"
  },
  "Section:": {
    "EN": "Section:",
    "TE": "విభాగం:",
    "TA": "பிரிவு:",
    "HI": "अनुभाग:",
    "PT": "Seção:",
    "KO": "섹션:",
    "FR": "Section de poste:",
    "JA": "セクション:"
  },
  "Actions": {
    "EN": "Actions",
    "TE": "చర్యలు",
    "TA": "செயல்கள்",
    "HI": "कार्रवाइयाँ",
    "PT": "Ações",
    "KO": "작업",
    "FR": "Actions opérateur",
    "JA": "アクション"
  },
  "Actions:": {
    "EN": "Actions:",
    "TE": "చర్యలు:",
    "TA": "செயல்கள்:",
    "HI": "कार्रवाइयाँ:",
    "PT": "Ações:",
    "KO": "작업:",
    "FR": "Actions opérateur:",
    "JA": "アクション:"
  },
  "Objects": {
    "EN": "Objects",
    "TE": "ఆబ్జెక్టులు",
    "TA": "பொருள்கள்",
    "HI": "ऑब्जेक्ट्स",
    "PT": "Objetos",
    "KO": "객체",
    "FR": "Objets",
    "JA": "オブジェクト"
  },
  "Objects:": {
    "EN": "Objects:",
    "TE": "ఆబ్జెక్టులు:",
    "TA": "பொருள்கள்:",
    "HI": "ऑब्जेक्ट्स:",
    "PT": "Objetos:",
    "KO": "객체:",
    "FR": "Objets:",
    "JA": "オブジェクト:"
  },
  "Traffic": {
    "EN": "Traffic",
    "TE": "ట్రాఫిక్",
    "TA": "போக்குவரத்து",
    "HI": "ट्रैफ़िक",
    "PT": "Tráfego",
    "KO": "트래픽",
    "FR": "Trafic",
    "JA": "トラフィック"
  },
  "Traffic:": {
    "EN": "Traffic:",
    "TE": "ట్రాఫిక్:",
    "TA": "போக்குவரத்து:",
    "HI": "ट्रैफ़िक:",
    "PT": "Tráfego:",
    "KO": "트래픽:",
    "FR": "Trafic:",
    "JA": "トラフィック:"
  },
  "Digital": {
    "EN": "Digital",
    "TE": "డిజిటల్",
    "TA": "டிஜிட்டல்",
    "HI": "डिजिटल",
    "PT": "Digital",
    "KO": "디지털",
    "FR": "Numérique",
    "JA": "デジタル"
  },
  "Digital:": {
    "EN": "Digital:",
    "TE": "డిజిటల్:",
    "TA": "டிஜிட்டல்:",
    "HI": "डिजिटल:",
    "PT": "Digital:",
    "KO": "디지털:",
    "FR": "Numérique:",
    "JA": "デジタル:"
  },
  "Logical": {
    "EN": "Logical",
    "TE": "లాజికల్",
    "TA": "தர்க்கரீதியான",
    "HI": "लॉजिकल",
    "PT": "Lógico",
    "KO": "논리적",
    "FR": "Logique",
    "JA": "論理"
  },
  "Logical:": {
    "EN": "Logical:",
    "TE": "లాజికల్:",
    "TA": "தர்க்கரீதியான:",
    "HI": "लॉजिकल:",
    "PT": "Lógico:",
    "KO": "논리적:",
    "FR": "Logique:",
    "JA": "論理:"
  },
  "Symptom": {
    "EN": "Symptom",
    "TE": "లక్షణం",
    "TA": "அறிகுறி",
    "HI": "लक्षण",
    "PT": "Sintoma",
    "KO": "증상",
    "FR": "Symptôme",
    "JA": "症状"
  },
  "Symptom:": {
    "EN": "Symptom:",
    "TE": "లక్షణం:",
    "TA": "அறிகுறி:",
    "HI": "लक्षण:",
    "PT": "Sintoma:",
    "KO": "증상:",
    "FR": "Symptôme:",
    "JA": "症状:"
  },
  "Binding": {
    "EN": "Binding",
    "TE": "బైండింగ్",
    "TA": "பிணைப்பு",
    "HI": "बाइंडिंग",
    "PT": "Vinculação",
    "KO": "바인딩",
    "FR": "Liaison (Binding)",
    "JA": "バインディング"
  },
  "Binding:": {
    "EN": "Binding:",
    "TE": "బైండింగ్:",
    "TA": "பிணைப்பு:",
    "HI": "बाइंडिंग:",
    "PT": "Vinculação:",
    "KO": "바인딩:",
    "FR": "Liaison (Binding):",
    "JA": "バインディング:"
  },
  "Service": {
    "EN": "Service",
    "TE": "సర్వీస్",
    "TA": "சேவை",
    "HI": "सेवा",
    "PT": "Serviço",
    "KO": "서비스",
    "FR": "Service réseau",
    "JA": "サービス"
  },
  "Service:": {
    "EN": "Service:",
    "TE": "సర్వీస్:",
    "TA": "சேவை:",
    "HI": "सेवा:",
    "PT": "Serviço:",
    "KO": "서비스:",
    "FR": "Service réseau:",
    "JA": "サービス:"
  },
  "Holding": {
    "EN": "Holding",
    "TE": "హోల్డింగ్",
    "TA": "ஹோல்டிங்",
    "HI": "होल्डिंग",
    "PT": "Retenção (Holding)",
    "KO": "홀딩",
    "FR": "Maintien (Holding)",
    "JA": "保持（ホールディング）"
  },
  "Holding:": {
    "EN": "Holding:",
    "TE": "హోల్డింగ్:",
    "TA": "ஹோல்டிங்:",
    "HI": "होल्डिंग:",
    "PT": "Retenção (Holding):",
    "KO": "홀딩:",
    "FR": "Maintien (Holding):",
    "JA": "保持（ホールディング）:"
  },
  "Timeout": {
    "EN": "Timeout",
    "TE": "టైమ్అవుట్",
    "TA": "நேர முடிவு",
    "HI": "टाइमआउट",
    "PT": "Tempo Esgotado",
    "KO": "타임아웃",
    "FR": "Délai d'expiration",
    "JA": "タイムアウト"
  },
  "Timeout:": {
    "EN": "Timeout:",
    "TE": "టైమ్అవుట్:",
    "TA": "நேர முடிவு:",
    "HI": "टाइमआउट:",
    "PT": "Tempo Esgotado:",
    "KO": "타임아웃:",
    "FR": "Délai d'expiration:",
    "JA": "タイムアウト:"
  },
  "Scaling": {
    "EN": "Scaling",
    "TE": "స్కేలింగ్",
    "TA": "அளவிடுதல்",
    "HI": "स्केलिंग",
    "PT": "Escalonamento",
    "KO": "스케일링",
    "FR": "Mise à l'échelle",
    "JA": "スケーリング"
  },
  "Scaling:": {
    "EN": "Scaling:",
    "TE": "స్కేలింగ్:",
    "TA": "அளவிடுதல்:",
    "HI": "स्केलिंग:",
    "PT": "Escalonamento:",
    "KO": "스케일링:",
    "FR": "Mise à l'échelle:",
    "JA": "スケーリング:"
  },
  "Segment": {
    "EN": "Segment",
    "TE": "సెగ్మెంట్",
    "TA": "பிரிவு",
    "HI": "सेगमेंट",
    "PT": "Segmento",
    "KO": "세그먼트",
    "FR": "Segment réseau",
    "JA": "セグメント"
  },
  "Segment:": {
    "EN": "Segment:",
    "TE": "సెగ్మెంట్:",
    "TA": "பிரிவு:",
    "HI": "सेगमेंट:",
    "PT": "Segmento:",
    "KO": "세그먼트:",
    "FR": "Segment réseau:",
    "JA": "セグメント:"
  },
  "Warning": {
    "EN": "Warning",
    "TE": "హెచ్చరిక",
    "TA": "எச்சரிக்கை",
    "HI": "चेतावनी",
    "PT": "Aviso",
    "KO": "경고",
    "FR": "Avertissement",
    "JA": "警告"
  },
  "Warning:": {
    "EN": "Warning:",
    "TE": "హెచ్చరిక:",
    "TA": "எச்சரிக்கை:",
    "HI": "चेतावनी:",
    "PT": "Aviso:",
    "KO": "경고:",
    "FR": "Avertissement:",
    "JA": "警告:"
  },
  "Disable": {
    "EN": "Disable",
    "TE": "డిసేబుల్ చేయండి",
    "TA": "முடக்கு",
    "HI": "अक्षम करें",
    "PT": "Desabilitar",
    "KO": "비활성화",
    "FR": "Désactiver",
    "JA": "無効化"
  },
  "Disable:": {
    "EN": "Disable:",
    "TE": "డిసేబుల్ చేయండి:",
    "TA": "முடக்கு:",
    "HI": "अक्षम करें:",
    "PT": "Desabilitar:",
    "KO": "비활성화:",
    "FR": "Désactiver:",
    "JA": "無効化:"
  },
  "Connect": {
    "EN": "Connect",
    "TE": "కనెక్ట్ చేయండి",
    "TA": "இணை",
    "HI": "कनेक्ट करें",
    "PT": "Conectar",
    "KO": "연결",
    "FR": "Connecter",
    "JA": "接続"
  },
  "Connect:": {
    "EN": "Connect:",
    "TE": "కనెక్ట్ చేయండి:",
    "TA": "இணை:",
    "HI": "कनेक्ट करें:",
    "PT": "Conectar:",
    "KO": "연결:",
    "FR": "Connecter:",
    "JA": "接続:"
  },
  "Restore": {
    "EN": "Restore",
    "TE": "పునరుద్ధరించండి",
    "TA": "மீட்டமை",
    "HI": "पुनर्स्थापित करें",
    "PT": "Restaurar",
    "KO": "복구",
    "FR": "Restaurer",
    "JA": "復旧"
  },
  "Restore:": {
    "EN": "Restore:",
    "TE": "పునరుద్ధరించండి:",
    "TA": "மீட்டமை:",
    "HI": "पुनर्स्थापित करें:",
    "PT": "Restaurar:",
    "KO": "복구:",
    "FR": "Restaurer:",
    "JA": "復旧:"
  },
  "Capture": {
    "EN": "Capture",
    "TE": "క్యాప్చర్ చేయండి",
    "TA": "பிடி (Capture)",
    "HI": "कैप्चर करें",
    "PT": "Capturar",
    "KO": "캡처",
    "FR": "Capturer",
    "JA": "キャプチャ"
  },
  "Capture:": {
    "EN": "Capture:",
    "TE": "క్యాప్చర్ చేయండి:",
    "TA": "பிடி (Capture):",
    "HI": "कैप्चर करें:",
    "PT": "Capturar:",
    "KO": "캡처:",
    "FR": "Capturer:",
    "JA": "キャプチャ:"
  },
  "Monitor": {
    "EN": "Monitor",
    "TE": "పర్యవేక్షించండి",
    "TA": "கண்காணி",
    "HI": "निगरानी करें",
    "PT": "Monitorar",
    "KO": "모니터링",
    "FR": "Surveiller",
    "JA": "監視"
  },
  "Monitor:": {
    "EN": "Monitor:",
    "TE": "పర్యవేక్షించండి:",
    "TA": "கண்காணி:",
    "HI": "निगरानी करें:",
    "PT": "Monitorar:",
    "KO": "모니터링:",
    "FR": "Surveiller:",
    "JA": "監視:"
  },
  "Trigger": {
    "EN": "Trigger",
    "TE": "ట్రిగ్గర్ చేయండి",
    "TA": "தூண்டு",
    "HI": "ट्रिगर करें",
    "PT": "Disparar",
    "KO": "트리거",
    "FR": "Déclencher",
    "JA": "トリガー"
  },
  "Trigger:": {
    "EN": "Trigger:",
    "TE": "ట్రిగ్గర్ చేయండి:",
    "TA": "தூண்டு:",
    "HI": "ट्रिगर करें:",
    "PT": "Disparar:",
    "KO": "트리거:",
    "FR": "Déclencher:",
    "JA": "トリガー:"
  },
  "Primary": {
    "EN": "Primary",
    "TE": "ప్రైమరీ",
    "TA": "முதன்மை",
    "HI": "प्राथमिक",
    "PT": "Primário",
    "KO": "1차 (Primary)",
    "FR": "Primaire",
    "JA": "一次"
  },
  "Primary:": {
    "EN": "Primary:",
    "TE": "ప్రైమరీ:",
    "TA": "முதன்மை:",
    "HI": "प्राथमिक:",
    "PT": "Primário:",
    "KO": "1차 (Primary):",
    "FR": "Primaire:",
    "JA": "一次:"
  },
  "Circuit": {
    "EN": "Circuit",
    "TE": "సర్క్యూట్",
    "TA": "சுற்று",
    "HI": "सर्किट",
    "PT": "Circuito",
    "KO": "회로",
    "FR": "Circuit électrique",
    "JA": "回路"
  },
  "Circuit:": {
    "EN": "Circuit:",
    "TE": "సర్క్యూట్:",
    "TA": "சுற்று:",
    "HI": "सर्किट:",
    "PT": "Circuito:",
    "KO": "회로:",
    "FR": "Circuit électrique:",
    "JA": "回路:"
  },
  "Unicast": {
    "EN": "Unicast",
    "TE": "యూనికాస్ట్",
    "TA": "யூனிகாஸ்ட்",
    "HI": "यूनिकास्ट",
    "PT": "Unicast",
    "KO": "유니캐스트",
    "FR": "Monodiffusion (Unicast)",
    "JA": "ユニキャスト"
  },
  "Unicast:": {
    "EN": "Unicast:",
    "TE": "యూనికాస్ట్:",
    "TA": "யூனிகாஸ்ட்:",
    "HI": "यूनिकास्ट:",
    "PT": "Unicast:",
    "KO": "유니캐스트:",
    "FR": "Monodiffusion (Unicast):",
    "JA": "ユニキャスト:"
  },
  "VLAN ID": {
    "EN": "VLAN ID",
    "TE": "VLAN ID (ఐడి)",
    "TA": "VLAN ID (எண்)",
    "HI": "VLAN ID (पहचान)",
    "PT": "ID da VLAN",
    "KO": "VLAN ID (식별자)",
    "FR": "ID de VLAN",
    "JA": "VLAN ID（識別子）"
  },
  "VLAN ID:": {
    "EN": "VLAN ID:",
    "TE": "VLAN ID (ఐడి):",
    "TA": "VLAN ID (எண்):",
    "HI": "VLAN ID (पहचान):",
    "PT": "ID da VLAN:",
    "KO": "VLAN ID (식별자):",
    "FR": "ID de VLAN:",
    "JA": "VLAN ID（識別子）:"
  },
  "Type ID": {
    "EN": "Type ID",
    "TE": "టైప్ ID",
    "TA": "வகை ID",
    "HI": "टाइप ID",
    "PT": "ID de Tipo",
    "KO": "유형 ID",
    "FR": "ID de type",
    "JA": "タイプID"
  },
  "Type ID:": {
    "EN": "Type ID:",
    "TE": "టైప్ ID:",
    "TA": "வகை ID:",
    "HI": "टाइप ID:",
    "PT": "ID de Tipo:",
    "KO": "유형 ID:",
    "FR": "ID de type:",
    "JA": "タイプID:"
  },
  "Derived": {
    "EN": "Derived",
    "TE": "ఉత్పన్న",
    "TA": "பெறப்பட்ட",
    "HI": "व्युत्पन्न",
    "PT": "Derivado",
    "KO": "파생",
    "FR": "Dérivé",
    "JA": "派生"
  },
  "Derived:": {
    "EN": "Derived:",
    "TE": "ఉత్పన్న:",
    "TA": "பெறப்பட்ட:",
    "HI": "व्युत्पन्न:",
    "PT": "Derivado:",
    "KO": "파생:",
    "FR": "Dérivé:",
    "JA": "派生:"
  },
  "Filters": {
    "EN": "Filters",
    "TE": "ఫిల్టర్లు",
    "TA": "வடிகட்டிகள்",
    "HI": "फ़िल्टर",
    "PT": "Filtros",
    "KO": "필터",
    "FR": "Filtres",
    "JA": "フィルタ"
  },
  "Filters:": {
    "EN": "Filters:",
    "TE": "ఫిల్టర్లు:",
    "TA": "வடிகட்டிகள்:",
    "HI": "फ़िल्टर:",
    "PT": "Filtros:",
    "KO": "필터:",
    "FR": "Filtres:",
    "JA": "フィルタ:"
  },
  "Feeder": {
    "EN": "Feeder",
    "TE": "ఫీడర్",
    "TA": "ஃபீடர்",
    "HI": "फीडर",
    "PT": "Alimentador",
    "KO": "피더",
    "FR": "Départ",
    "JA": "フィーダ"
  },
  "Feeder:": {
    "EN": "Feeder:",
    "TE": "ఫీడర్:",
    "TA": "ஃபீடர்:",
    "HI": "फीडर:",
    "PT": "Alimentador:",
    "KO": "피더:",
    "FR": "Départ:",
    "JA": "フィーダ:"
  },
  "Relays": {
    "EN": "Relays",
    "TE": "రిలేలు",
    "TA": "ரிலேக்கள்",
    "HI": "रिले",
    "PT": "Relés",
    "KO": "계전기",
    "FR": "Relais",
    "JA": "リレー"
  },
  "Relays:": {
    "EN": "Relays:",
    "TE": "రిలేలు:",
    "TA": "ரிலேக்கள்:",
    "HI": "रिले:",
    "PT": "Relés:",
    "KO": "계전기:",
    "FR": "Relais:",
    "JA": "リレー:"
  },
  "Device": {
    "EN": "Device",
    "TE": "పరికరం",
    "TA": "சாதனம்",
    "HI": "उपकरण",
    "PT": "Dispositivo",
    "KO": "장치",
    "FR": "Appareil",
    "JA": "デバイス"
  },
  "Device:": {
    "EN": "Device:",
    "TE": "పరికరం:",
    "TA": "சாதனம்:",
    "HI": "उपकरण:",
    "PT": "Dispositivo:",
    "KO": "장치:",
    "FR": "Appareil:",
    "JA": "デバイス:"
  },
  "Server": {
    "EN": "Server",
    "TE": "సర్వర్",
    "TA": "சேவையகம்",
    "HI": "सर्वर",
    "PT": "Servidor",
    "KO": "서버",
    "FR": "Serveur",
    "JA": "サーバー"
  },
  "Server:": {
    "EN": "Server:",
    "TE": "సర్వర్:",
    "TA": "சேவையகம்:",
    "HI": "सर्वर:",
    "PT": "Servidor:",
    "KO": "서버:",
    "FR": "Serveur:",
    "JA": "サーバー:"
  },
  "Client": {
    "EN": "Client",
    "TE": "క్లయింట్",
    "TA": "கிளையன்ட்",
    "HI": "क्लाइंट",
    "PT": "Cliente",
    "KO": "클라이언트",
    "FR": "Client réseau",
    "JA": "クライアント"
  },
  "Client:": {
    "EN": "Client:",
    "TE": "క్లయింట్:",
    "TA": "கிளையன்ட்:",
    "HI": "क्लाइंट:",
    "PT": "Cliente:",
    "KO": "클라이언트:",
    "FR": "Client réseau:",
    "JA": "クライアント:"
  },
  "Switch": {
    "EN": "Switch",
    "TE": "స్విచ్",
    "TA": "சுவிட்ச்",
    "HI": "स्विच",
    "PT": "Switch",
    "KO": "스위치",
    "FR": "Commutateur",
    "JA": "スイッチ"
  },
  "Switch:": {
    "EN": "Switch:",
    "TE": "స్విచ్:",
    "TA": "சுவிட்ச்:",
    "HI": "स्विच:",
    "PT": "Switch:",
    "KO": "스위치:",
    "FR": "Commutateur:",
    "JA": "スイッチ:"
  },
  "Router": {
    "EN": "Router",
    "TE": "రౌటర్",
    "TA": "திசைவி (Router)",
    "HI": "राउटर",
    "PT": "Roteador",
    "KO": "라우터",
    "FR": "Routeur",
    "JA": "ルーター"
  },
  "Router:": {
    "EN": "Router:",
    "TE": "రౌటర్:",
    "TA": "திசைவி (Router):",
    "HI": "राउटर:",
    "PT": "Roteador:",
    "KO": "라우터:",
    "FR": "Routeur:",
    "JA": "ルーター:"
  },
  "Cables": {
    "EN": "Cables",
    "TE": "కేబుల్స్",
    "TA": "கேபிள்கள்",
    "HI": "केबल",
    "PT": "Cabos",
    "KO": "케이블",
    "FR": "Câbles",
    "JA": "ケーブル"
  },
  "Cables:": {
    "EN": "Cables:",
    "TE": "కేబుల్స్:",
    "TA": "கேபிள்கள்:",
    "HI": "केबल:",
    "PT": "Cabos:",
    "KO": "케이블:",
    "FR": "Câbles:",
    "JA": "ケーブル:"
  },
  "Copper": {
    "EN": "Copper",
    "TE": "కాపర్",
    "TA": "செம்பு",
    "HI": "कॉपर",
    "PT": "Cobre",
    "KO": "구리",
    "FR": "Cuivre",
    "JA": "銅線"
  },
  "Copper:": {
    "EN": "Copper:",
    "TE": "కాపర్:",
    "TA": "செம்பு:",
    "HI": "कॉपर:",
    "PT": "Cobre:",
    "KO": "구리:",
    "FR": "Cuivre:",
    "JA": "銅線:"
  },
  "Signal": {
    "EN": "Signal",
    "TE": "సిగ్నల్",
    "TA": "சிக்னல்",
    "HI": "सिग्नल",
    "PT": "Sinal",
    "KO": "신호",
    "FR": "Signal électrique",
    "JA": "信号"
  },
  "Signal:": {
    "EN": "Signal:",
    "TE": "సిగ్నల్:",
    "TA": "சிக்னல்:",
    "HI": "सिग्नल:",
    "PT": "Sinal:",
    "KO": "신호:",
    "FR": "Signal électrique:",
    "JA": "信号:"
  },
  "Mapped": {
    "EN": "Mapped",
    "TE": "మ్యాప్ చేయబడిన",
    "TA": "மேப் செய்யப்பட்ட",
    "HI": "मैप किया गया",
    "PT": "Mapeado",
    "KO": "매핑됨",
    "FR": "Mappé",
    "JA": "マッピング済"
  },
  "Mapped:": {
    "EN": "Mapped:",
    "TE": "మ్యాప్ చేయబడిన:",
    "TA": "மேப் செய்யப்பட்ட:",
    "HI": "मैप किया गया:",
    "PT": "Mapeado:",
    "KO": "매핑됨:",
    "FR": "Mappé:",
    "JA": "マッピング済:"
  },
  "Alarms": {
    "EN": "Alarms",
    "TE": "అలారాలు",
    "TA": "அலாரங்கள்",
    "HI": "अलार्म",
    "PT": "Alarmes",
    "KO": "알람",
    "FR": "Alarmes",
    "JA": "アラーム"
  },
  "Alarms:": {
    "EN": "Alarms:",
    "TE": "అలారాలు:",
    "TA": "அலாரங்கள்:",
    "HI": "अलार्म:",
    "PT": "Alarmes:",
    "KO": "알람:",
    "FR": "Alarmes:",
    "JA": "アラーム:"
  },
  "Events": {
    "EN": "Events",
    "TE": "ఈవెంట్లు",
    "TA": "நிகழ்வுகள்",
    "HI": "घटनाएँ",
    "PT": "Eventos",
    "KO": "이벤트",
    "FR": "Événements",
    "JA": "イベント"
  },
  "Events:": {
    "EN": "Events:",
    "TE": "ఈవెంట్లు:",
    "TA": "நிகழ்வுகள்:",
    "HI": "घटनाएँ:",
    "PT": "Eventos:",
    "KO": "이벤트:",
    "FR": "Événements:",
    "JA": "イベント:"
  },
  "Faults": {
    "EN": "Faults",
    "TE": "ఫాల్ట్స్",
    "TA": "பிழைகள்",
    "HI": "फॉल्ट",
    "PT": "Falhas",
    "KO": "고장",
    "FR": "Défauts",
    "JA": "故障・フォルト"
  },
  "Faults:": {
    "EN": "Faults:",
    "TE": "ఫాల్ట్స్:",
    "TA": "பிழைகள்:",
    "HI": "फॉल्ट:",
    "PT": "Falhas:",
    "KO": "고장:",
    "FR": "Défauts:",
    "JA": "故障・フォルト:"
  },
  "Module": {
    "EN": "Module",
    "TE": "మాడ్యూల్",
    "TA": "தொகுதி",
    "HI": "मॉड्यूल",
    "PT": "Módulo",
    "KO": "모듈",
    "FR": "Module logique",
    "JA": "モジュール"
  },
  "Module:": {
    "EN": "Module:",
    "TE": "మాడ్యూల్:",
    "TA": "தொகுதி:",
    "HI": "मॉड्यूल:",
    "PT": "Módulo:",
    "KO": "모듈:",
    "FR": "Module logique:",
    "JA": "モジュール:"
  },
  "Lesson": {
    "EN": "Lesson",
    "TE": "పాఠం",
    "TA": "பாடம்",
    "HI": "पाठ",
    "PT": "Lição",
    "KO": "강의",
    "FR": "Leçon",
    "JA": "レッスン"
  },
  "Lesson:": {
    "EN": "Lesson:",
    "TE": "పాఠం:",
    "TA": "பாடம்:",
    "HI": "पाठ:",
    "PT": "Lição:",
    "KO": "강의:",
    "FR": "Leçon:",
    "JA": "レッスン:"
  },
  "Answer": {
    "EN": "Answer",
    "TE": "సమాధానం",
    "TA": "பதில்",
    "HI": "उत्तर",
    "PT": "Resposta",
    "KO": "답변",
    "FR": "Réponse",
    "JA": "回答"
  },
  "Answer:": {
    "EN": "Answer:",
    "TE": "సమాధానం:",
    "TA": "பதில்:",
    "HI": "उत्तर:",
    "PT": "Resposta:",
    "KO": "답변:",
    "FR": "Réponse:",
    "JA": "回答:"
  },
  "Status": {
    "EN": "Status",
    "TE": "స్థితి",
    "TA": "நிலை",
    "HI": "स्थिति",
    "PT": "Estado",
    "KO": "상태",
    "FR": "État",
    "JA": "ステータス"
  },
  "Status:": {
    "EN": "Status:",
    "TE": "స్థితి:",
    "TA": "நிலை:",
    "HI": "स्थिति:",
    "PT": "Estado:",
    "KO": "상태:",
    "FR": "État:",
    "JA": "ステータス:"
  },
  "Values": {
    "EN": "Values",
    "TE": "విలువలు",
    "TA": "மதிப்புகள்",
    "HI": "मान",
    "PT": "Valores",
    "KO": "값",
    "FR": "Valeurs",
    "JA": "値"
  },
  "Values:": {
    "EN": "Values:",
    "TE": "విలువలు:",
    "TA": "மதிப்புகள்:",
    "HI": "मान:",
    "PT": "Valores:",
    "KO": "값:",
    "FR": "Valeurs:",
    "JA": "値:"
  },
  "Source": {
    "EN": "Source",
    "TE": "సోర్స్",
    "TA": "மூலம்",
    "HI": "स्रोत",
    "PT": "Fonte",
    "KO": "소스",
    "FR": "Source d'alimentation",
    "JA": "ソース"
  },
  "Source:": {
    "EN": "Source:",
    "TE": "సోర్స్:",
    "TA": "மூலம்:",
    "HI": "स्रोत:",
    "PT": "Fonte:",
    "KO": "소스:",
    "FR": "Source d'alimentation:",
    "JA": "ソース:"
  },
  "Target": {
    "EN": "Target",
    "TE": "టార్గెట్",
    "TA": "இலக்கு",
    "HI": "लक्ष्य",
    "PT": "Destino",
    "KO": "대상",
    "FR": "Cible",
    "JA": "ターゲット"
  },
  "Target:": {
    "EN": "Target:",
    "TE": "టార్గెట్:",
    "TA": "இலக்கு:",
    "HI": "लक्ष्य:",
    "PT": "Destino:",
    "KO": "대상:",
    "FR": "Cible:",
    "JA": "ターゲット:"
  },
  "Energy": {
    "EN": "Energy",
    "TE": "ఎనర్జీ",
    "TA": "ஆற்றல்",
    "HI": "ऊर्जा",
    "PT": "Energia",
    "KO": "에너지",
    "FR": "Énergie",
    "JA": "エネルギー"
  },
  "Energy:": {
    "EN": "Energy:",
    "TE": "ఎనర్జీ:",
    "TA": "ஆற்றல்:",
    "HI": "ऊर्जा:",
    "PT": "Energia:",
    "KO": "에너지:",
    "FR": "Énergie:",
    "JA": "エネルギー:"
  },
  "Packet": {
    "EN": "Packet",
    "TE": "ప్యాకెట్",
    "TA": "பாக்கெட்",
    "HI": "पैकेट",
    "PT": "Pacote",
    "KO": "패킷",
    "FR": "Paquet",
    "JA": "パケット"
  },
  "Packet:": {
    "EN": "Packet:",
    "TE": "ప్యాకెట్:",
    "TA": "பாக்கெட்:",
    "HI": "पैकेट:",
    "PT": "Pacote:",
    "KO": "패킷:",
    "FR": "Paquet:",
    "JA": "パケット:"
  },
  "Frames": {
    "EN": "Frames",
    "TE": "ఫ్రేమ్‌లు",
    "TA": "பிரேம்கள்",
    "HI": "फ़्रेम",
    "PT": "Quadros",
    "KO": "프레임",
    "FR": "Trames",
    "JA": "フレーム"
  },
  "Frames:": {
    "EN": "Frames:",
    "TE": "ఫ్రేమ్‌లు:",
    "TA": "பிரேம்கள்:",
    "HI": "फ़्रेम:",
    "PT": "Quadros:",
    "KO": "프레임:",
    "FR": "Trames:",
    "JA": "フレーム:"
  },
  "Report": {
    "EN": "Report",
    "TE": "రిపోర్ట్",
    "TA": "அறிக்கை",
    "HI": "रिपोर्ट",
    "PT": "Relatório",
    "KO": "보고서",
    "FR": "Rapport",
    "JA": "レポート"
  },
  "Report:": {
    "EN": "Report:",
    "TE": "రిపోర్ట్:",
    "TA": "அறிக்கை:",
    "HI": "रिपोर्ट:",
    "PT": "Relatório:",
    "KO": "보고서:",
    "FR": "Rapport:",
    "JA": "レポート:"
  },
  "Camera": {
    "EN": "Camera",
    "TE": "కెమెరా",
    "TA": "கேமரா",
    "HI": "कैमरा",
    "PT": "Câmera",
    "KO": "카메라",
    "FR": "Caméra",
    "JA": "カメラ"
  },
  "Camera:": {
    "EN": "Camera:",
    "TE": "కెమెరా:",
    "TA": "கேமரா:",
    "HI": "कैमरा:",
    "PT": "Câmera:",
    "KO": "카메라:",
    "FR": "Caméra:",
    "JA": "カメラ:"
  },
  "Street": {
    "EN": "Street",
    "TE": "వీధి (Street)",
    "TA": "தெரு",
    "HI": "गली",
    "PT": "Rua",
    "KO": "거리",
    "FR": "Rue",
    "JA": "通り"
  },
  "Street:": {
    "EN": "Street:",
    "TE": "వీధి (Street):",
    "TA": "தெரு:",
    "HI": "गली:",
    "PT": "Rua:",
    "KO": "거리:",
    "FR": "Rue:",
    "JA": "通り:"
  },
  "Closed": {
    "EN": "Closed",
    "TE": "క్లోజ్డ్ (Closed)",
    "TA": "மூடப்பட்டது",
    "HI": "बंद (Closed)",
    "PT": "Fechado",
    "KO": "닫힘 (Closed)",
    "FR": "Fermé",
    "JA": "投入・閉 (Closed)"
  },
  "Closed:": {
    "EN": "Closed:",
    "TE": "క్లోజ్డ్ (Closed):",
    "TA": "மூடப்பட்டது:",
    "HI": "बंद (Closed):",
    "PT": "Fechado:",
    "KO": "닫힘 (Closed):",
    "FR": "Fermé:",
    "JA": "投入・閉 (Closed):"
  },
  "Select": {
    "EN": "Select",
    "TE": "ఎంచుకోండి",
    "TA": "தேர்ந்தெடு",
    "HI": "चुनें",
    "PT": "Selecionar",
    "KO": "선택",
    "FR": "Sélectionner",
    "JA": "選択"
  },
  "Select:": {
    "EN": "Select:",
    "TE": "ఎంచుకోండి:",
    "TA": "தேர்ந்தெடு:",
    "HI": "चुनें:",
    "PT": "Selecionar:",
    "KO": "선택:",
    "FR": "Sélectionner:",
    "JA": "選択:"
  },
  "Search": {
    "EN": "Search",
    "TE": "వెతకండి",
    "TA": "தேடு",
    "HI": "खोजें",
    "PT": "Pesquisar",
    "KO": "검색",
    "FR": "Rechercher",
    "JA": "検索"
  },
  "Search:": {
    "EN": "Search:",
    "TE": "వెతకండి:",
    "TA": "தேடு:",
    "HI": "खोजें:",
    "PT": "Pesquisar:",
    "KO": "검색:",
    "FR": "Rechercher:",
    "JA": "検索:"
  },
  "Filter": {
    "EN": "Filter",
    "TE": "ఫిల్టర్",
    "TA": "வடிகட்டி",
    "HI": "फ़िल्टर",
    "PT": "Filtro",
    "KO": "필터",
    "FR": "Filtre",
    "JA": "フィルタ"
  },
  "Filter:": {
    "EN": "Filter:",
    "TE": "ఫిల్టర్:",
    "TA": "வடிகட்டி:",
    "HI": "फ़िल्टर:",
    "PT": "Filtro:",
    "KO": "필터:",
    "FR": "Filtre:",
    "JA": "フィルタ:"
  },
  "Cancel": {
    "EN": "Cancel",
    "TE": "రద్దు చేయండి",
    "TA": "ரத்து செய்",
    "HI": "रद्द करें",
    "PT": "Cancelar",
    "KO": "취소",
    "FR": "Annuler",
    "JA": "キャンセル"
  },
  "Cancel:": {
    "EN": "Cancel:",
    "TE": "రద్దు చేయండి:",
    "TA": "ரத்து செய்:",
    "HI": "रद्द करें:",
    "PT": "Cancelar:",
    "KO": "취소:",
    "FR": "Annuler:",
    "JA": "キャンセル:"
  },
  "Upload": {
    "EN": "Upload",
    "TE": "అప్‌లోడ్",
    "TA": "பதிவேற்று",
    "HI": "अपलोड",
    "PT": "Enviar",
    "KO": "업로드",
    "FR": "Téléverser",
    "JA": "アップロード"
  },
  "Upload:": {
    "EN": "Upload:",
    "TE": "అప్‌లోడ్:",
    "TA": "பதிவேற்று:",
    "HI": "अपलोड:",
    "PT": "Enviar:",
    "KO": "업로드:",
    "FR": "Téléverser:",
    "JA": "アップロード:"
  },
  "Export": {
    "EN": "Export",
    "TE": "ఎక్స్‌పోర్ట్",
    "TA": "ஏற்றுமதி",
    "HI": "निर्यात करें",
    "PT": "Exportar",
    "KO": "내보내기",
    "FR": "Exporter",
    "JA": "エクスポート"
  },
  "Export:": {
    "EN": "Export:",
    "TE": "ఎక్స్‌పోర్ట్:",
    "TA": "ஏற்றுமதி:",
    "HI": "निर्यात करें:",
    "PT": "Exportar:",
    "KO": "내보내기:",
    "FR": "Exporter:",
    "JA": "エクスポート:"
  },
  "Toggle": {
    "EN": "Toggle",
    "TE": "మార్చండి (Toggle)",
    "TA": "மாற்று",
    "HI": "टॉगल करें",
    "PT": "Alternar",
    "KO": "전환",
    "FR": "Basculer",
    "JA": "切替"
  },
  "Toggle:": {
    "EN": "Toggle:",
    "TE": "మార్చండి (Toggle):",
    "TA": "மாற்று:",
    "HI": "टॉगल करें:",
    "PT": "Alternar:",
    "KO": "전환:",
    "FR": "Basculer:",
    "JA": "切替:"
  },
  "Active": {
    "EN": "Active",
    "TE": "యాక్టివ్",
    "TA": "செயலில்",
    "HI": "सक्रिय",
    "PT": "Ativo",
    "KO": "활성",
    "FR": "Actif",
    "JA": "アクティブ"
  },
  "Active:": {
    "EN": "Active:",
    "TE": "యాక్టివ్:",
    "TA": "செயலில்:",
    "HI": "सक्रिय:",
    "PT": "Ativo:",
    "KO": "활성:",
    "FR": "Actif:",
    "JA": "アクティブ:"
  },
  "Normal": {
    "EN": "Normal",
    "TE": "సాధారణం",
    "TA": "இயல்பான",
    "HI": "सामान्य",
    "PT": "Estado normal",
    "KO": "정상",
    "FR": "État normal",
    "JA": "通常"
  },
  "Normal:": {
    "EN": "Normal:",
    "TE": "సాధారణం:",
    "TA": "இயல்பான:",
    "HI": "सामान्य:",
    "PT": "Estado normal:",
    "KO": "정상:",
    "FR": "État normal:",
    "JA": "通常:"
  },
  "Online": {
    "EN": "Online",
    "TE": "ఆన్‌లైన్",
    "TA": "ஆன்லைன்",
    "HI": "ऑनलाइन",
    "PT": "Online",
    "KO": "온라인",
    "FR": "En ligne",
    "JA": "オンライン"
  },
  "Online:": {
    "EN": "Online:",
    "TE": "ఆన్‌లైన్:",
    "TA": "ஆன்லைன்:",
    "HI": "ऑनलाइन:",
    "PT": "Online:",
    "KO": "온라인:",
    "FR": "En ligne:",
    "JA": "オンライン:"
  },
  "Locked": {
    "EN": "Locked",
    "TE": "లాక్ అయింది",
    "TA": "பூட்டப்பட்டது",
    "HI": "लॉक किया गया",
    "PT": "Bloqueado",
    "KO": "잠김",
    "FR": "Verrouillé",
    "JA": "ロック済"
  },
  "Locked:": {
    "EN": "Locked:",
    "TE": "లాక్ అయింది:",
    "TA": "பூட்டப்பட்டது:",
    "HI": "लॉक किया गया:",
    "PT": "Bloqueado:",
    "KO": "잠김:",
    "FR": "Verrouillé:",
    "JA": "ロック済:"
  },
  "Result": {
    "EN": "Result",
    "TE": "ఫలితం",
    "TA": "முடிவு",
    "HI": "परिणाम",
    "PT": "Resultado",
    "KO": "결과",
    "FR": "Résultat",
    "JA": "結果"
  },
  "Result:": {
    "EN": "Result:",
    "TE": "ఫలితం:",
    "TA": "முடிவு:",
    "HI": "परिणाम:",
    "PT": "Resultado:",
    "KO": "결과:",
    "FR": "Résultat:",
    "JA": "結果:"
  },
  "Action": {
    "EN": "Action",
    "TE": "చర్య",
    "TA": "செயல்",
    "HI": "कार्रवाई",
    "PT": "Ação",
    "KO": "조치",
    "FR": "Action opérateur",
    "JA": "アクション"
  },
  "Action:": {
    "EN": "Action:",
    "TE": "చర్య:",
    "TA": "செயல்:",
    "HI": "कार्रवाई:",
    "PT": "Ação:",
    "KO": "조치:",
    "FR": "Action opérateur:",
    "JA": "アクション:"
  },
  "System": {
    "EN": "System",
    "TE": "సిస్టమ్",
    "TA": "கணினி",
    "HI": "सिस्टम",
    "PT": "Sistema",
    "KO": "시스템",
    "FR": "Système",
    "JA": "システム"
  },
  "System:": {
    "EN": "System:",
    "TE": "సిస్టమ్:",
    "TA": "கணினி:",
    "HI": "सिस्टम:",
    "PT": "Sistema:",
    "KO": "시스템:",
    "FR": "Système:",
    "JA": "システム:"
  },
  "Object": {
    "EN": "Object",
    "TE": "ఆబ్జెక్ట్",
    "TA": "பொருள்",
    "HI": "ऑब्जेक्ट",
    "PT": "Objeto",
    "KO": "객체",
    "FR": "Objet",
    "JA": "オブジェクト"
  },
  "Object:": {
    "EN": "Object:",
    "TE": "ఆబ్జెక్ట్:",
    "TA": "பொருள்:",
    "HI": "ऑब्जेक्ट:",
    "PT": "Objeto:",
    "KO": "객체:",
    "FR": "Objet:",
    "JA": "オブジェクト:"
  },
  "Resume": {
    "EN": "Resume",
    "TE": "కొనసాగించండి",
    "TA": "தொடர்",
    "HI": "फिर से शुरू करें",
    "PT": "Retomar",
    "KO": "재개",
    "FR": "Reprendre",
    "JA": "再開"
  },
  "Resume:": {
    "EN": "Resume:",
    "TE": "కొనసాగించండి:",
    "TA": "தொடர்:",
    "HI": "फिर से शुरू करें:",
    "PT": "Retomar:",
    "KO": "재개:",
    "FR": "Reprendre:",
    "JA": "再開:"
  },
  "Hidden": {
    "EN": "Hidden",
    "TE": "దాచబడింది",
    "TA": "மறைக்கப்பட்டது",
    "HI": "छुपा हुआ",
    "PT": "Oculto",
    "KO": "숨김",
    "FR": "Masqué",
    "JA": "非表示"
  },
  "Hidden:": {
    "EN": "Hidden:",
    "TE": "దాచబడింది:",
    "TA": "மறைக்கப்பட்டது:",
    "HI": "छुपा हुआ:",
    "PT": "Oculto:",
    "KO": "숨김:",
    "FR": "Masqué:",
    "JA": "非表示:"
  },
  "Tagged": {
    "EN": "Tagged",
    "TE": "ట్యాగ్ చేయబడిన",
    "TA": "குறிச்சொல் இடப்பட்ட",
    "HI": "टैग किया गया",
    "PT": "Marcado (Tagged)",
    "KO": "태그됨",
    "FR": "Étiqueté (Tagged)",
    "JA": "タグ付"
  },
  "Tagged:": {
    "EN": "Tagged:",
    "TE": "ట్యాగ్ చేయబడిన:",
    "TA": "குறிச்சொல் இடப்பட்ட:",
    "HI": "टैग किया गया:",
    "PT": "Marcado (Tagged):",
    "KO": "태그됨:",
    "FR": "Étiqueté (Tagged):",
    "JA": "タグ付:"
  },
  "Errors": {
    "EN": "Errors",
    "TE": "ఎర్రర్స్",
    "TA": "பிழைகள்",
    "HI": "त्रुटियाँ",
    "PT": "Erros",
    "KO": "오류",
    "FR": "Erreurs",
    "JA": "エラー"
  },
  "Errors:": {
    "EN": "Errors:",
    "TE": "ఎర్రర్స్:",
    "TA": "பிழைகள்:",
    "HI": "त्रुटियाँ:",
    "PT": "Erros:",
    "KO": "오류:",
    "FR": "Erreurs:",
    "JA": "エラー:"
  },
  "Spring": {
    "EN": "Spring",
    "TE": "స్ప్రింగ్",
    "TA": "ஸ்பிரிங்",
    "HI": "स्प्रिंग",
    "PT": "Mola",
    "KO": "스프링",
    "FR": "Ressort",
    "JA": "ばね（スプリング）"
  },
  "Spring:": {
    "EN": "Spring:",
    "TE": "స్ప్రింగ్:",
    "TA": "ஸ்பிரிங்:",
    "HI": "स्प्रिंग:",
    "PT": "Mola:",
    "KO": "스프링:",
    "FR": "Ressort:",
    "JA": "ばね（スプリング）:"
  },
  "Actual": {
    "EN": "Actual",
    "TE": "వాస్తవ",
    "TA": "உண்மையான",
    "HI": "वास्तविक",
    "PT": "Real (Atual)",
    "KO": "실제값",
    "FR": "Réel",
    "JA": "実測値"
  },
  "Actual:": {
    "EN": "Actual:",
    "TE": "వాస్తవ:",
    "TA": "உண்மையான:",
    "HI": "वास्तविक:",
    "PT": "Real (Atual):",
    "KO": "실제값:",
    "FR": "Réel:",
    "JA": "実測値:"
  },
  "Verify": {
    "EN": "Verify",
    "TE": "ధృవీకరించండి",
    "TA": "சரிபார்",
    "HI": "सत्यापित करें",
    "PT": "Verificar",
    "KO": "검증",
    "FR": "Vérifier",
    "JA": "確認・検証"
  },
  "Verify:": {
    "EN": "Verify:",
    "TE": "ధృవీకరించండి:",
    "TA": "சரிபார்:",
    "HI": "सत्यापित करें:",
    "PT": "Verificar:",
    "KO": "검증:",
    "FR": "Vérifier:",
    "JA": "確認・検証:"
  },
  "Enable": {
    "EN": "Enable",
    "TE": "ఎనేబుల్ చేయండి",
    "TA": "இயக்கு",
    "HI": "सक्षम करें",
    "PT": "Habilitar",
    "KO": "활성화",
    "FR": "Activer",
    "JA": "有効化"
  },
  "Enable:": {
    "EN": "Enable:",
    "TE": "ఎనేబుల్ చేయండి:",
    "TA": "இயக்கு:",
    "HI": "सक्षम करें:",
    "PT": "Habilitar:",
    "KO": "활성화:",
    "FR": "Activer:",
    "JA": "有効化:"
  },
  "Inject": {
    "EN": "Inject",
    "TE": "ఇంజెక్ట్ చేయండి",
    "TA": "செலுத்து",
    "HI": "इंजेक्ट करें",
    "PT": "Injetar",
    "KO": "주입",
    "FR": "Injecter",
    "JA": "注入"
  },
  "Inject:": {
    "EN": "Inject:",
    "TE": "ఇంజెక్ట్ చేయండి:",
    "TA": "செலுத்து:",
    "HI": "इंजेक्ट करें:",
    "PT": "Injetar:",
    "KO": "주입:",
    "FR": "Injecter:",
    "JA": "注入:"
  },
  "Remote": {
    "EN": "Remote",
    "TE": "రిమోట్",
    "TA": "தொலைநிலை (Remote)",
    "HI": "रिमोट",
    "PT": "Remoto",
    "KO": "원격 (Remote)",
    "FR": "distant (Télécommande)",
    "JA": "リモート（遠方）"
  },
  "Remote:": {
    "EN": "Remote:",
    "TE": "రిమోట్:",
    "TA": "தொலைநிலை (Remote):",
    "HI": "रिमोट:",
    "PT": "Remoto:",
    "KO": "원격 (Remote):",
    "FR": "distant (Télécommande):",
    "JA": "リモート（遠方）:"
  },
  "Busbar": {
    "EN": "Busbar",
    "TE": "బస్‌బార్",
    "TA": "பஸ்பார்",
    "HI": "बसबॉर",
    "PT": "Barramento",
    "KO": "모선 (Busbar)",
    "FR": "Jeu de barres",
    "JA": "母線"
  },
  "Busbar:": {
    "EN": "Busbar:",
    "TE": "బస్‌బార్:",
    "TA": "பஸ்பார்:",
    "HI": "बसबॉर:",
    "PT": "Barramento:",
    "KO": "모선 (Busbar):",
    "FR": "Jeu de barres:",
    "JA": "母線:"
  },
  "Subnet": {
    "EN": "Subnet",
    "TE": "సబ్‌నెట్",
    "TA": "சப்நெட்",
    "HI": "सबनेट",
    "PT": "Sub-rede",
    "KO": "서브넷",
    "FR": "Sous-réseau",
    "JA": "サブネット"
  },
  "Subnet:": {
    "EN": "Subnet:",
    "TE": "సబ్‌నెట్:",
    "TA": "சப்நெட்:",
    "HI": "सबनेट:",
    "PT": "Sub-rede:",
    "KO": "서브넷:",
    "FR": "Sous-réseau:",
    "JA": "サブネット:"
  },
  "Bus A:": {
    "EN": "Bus A:",
    "TE": "బస్ A:",
    "TA": "பஸ் A:",
    "HI": "बस A:",
    "PT": "Barra A:",
    "KO": "모선 A:",
    "FR": "Barre A :",
    "JA": "母線A:"
  },
  "Bus B:": {
    "EN": "Bus B:",
    "TE": "బస్ B:",
    "TA": "பஸ் B:",
    "HI": "बस B:",
    "PT": "Barra B:",
    "KO": "모선 B:",
    "FR": "Barre B :",
    "JA": "母線B:"
  },
  "Salted": {
    "EN": "Salted",
    "TE": "సాల్టెడ్",
    "TA": "சால்டட்",
    "HI": "साल्टेड",
    "PT": "Salgado",
    "KO": "솔트",
    "FR": "Salé",
    "JA": "ソルト"
  },
  "Salted:": {
    "EN": "Salted:",
    "TE": "సాల్టెడ్:",
    "TA": "சால்டட்:",
    "HI": "साल्टेड:",
    "PT": "Salgado:",
    "KO": "솔트:",
    "FR": "Salé:",
    "JA": "ソルト:"
  },
  "Finish": {
    "EN": "Finish",
    "TE": "ముగించు",
    "TA": "முடி",
    "HI": "समाप्त करें",
    "PT": "Concluir",
    "KO": "완료",
    "FR": "Terminer",
    "JA": "完了"
  },
  "Finish:": {
    "EN": "Finish:",
    "TE": "ముగించు:",
    "TA": "முடி:",
    "HI": "समाप्त करें:",
    "PT": "Concluir:",
    "KO": "완료:",
    "FR": "Terminer:",
    "JA": "完了:"
  },
  "Relay": {
    "EN": "Relay",
    "TE": "రిలే",
    "TA": "ரிலே",
    "HI": "रिले",
    "PT": "Relé",
    "KO": "계전기",
    "FR": "Relais",
    "JA": "リレー"
  },
  "Relay:": {
    "EN": "Relay:",
    "TE": "రిలే:",
    "TA": "ரிலே:",
    "HI": "रिले:",
    "PT": "Relé:",
    "KO": "계전기:",
    "FR": "Relais:",
    "JA": "リレー:"
  },
  "Ports": {
    "EN": "Ports",
    "TE": "పోర్టులు",
    "TA": "போர்ட்கள்",
    "HI": "पोर्ट",
    "PT": "Portas",
    "KO": "포트",
    "FR": "Ports réseau",
    "JA": "ポート"
  },
  "Ports:": {
    "EN": "Ports:",
    "TE": "పోర్టులు:",
    "TA": "போர்ட்கள்:",
    "HI": "पोर्ट:",
    "PT": "Portas:",
    "KO": "포트:",
    "FR": "Ports réseau:",
    "JA": "ポート:"
  },
  "Cable": {
    "EN": "Cable",
    "TE": "కేబుల్",
    "TA": "கேபிள்",
    "HI": "केबल",
    "PT": "Cabo",
    "KO": "케이블",
    "FR": "Câble",
    "JA": "ケーブル"
  },
  "Cable:": {
    "EN": "Cable:",
    "TE": "కేబుల్:",
    "TA": "கேபிள்:",
    "HI": "केबल:",
    "PT": "Cabo:",
    "KO": "케이블:",
    "FR": "Câble:",
    "JA": "ケーブル:"
  },
  "Fiber": {
    "EN": "Fiber",
    "TE": "ఫైబర్",
    "TA": "ஃபைபர்",
    "HI": "फाइबर",
    "PT": "Fibra",
    "KO": "광케이블",
    "FR": "Fibre",
    "JA": "光ファイバ"
  },
  "Fiber:": {
    "EN": "Fiber:",
    "TE": "ఫైబర్:",
    "TA": "ஃபைபர்:",
    "HI": "फाइबर:",
    "PT": "Fibra:",
    "KO": "광케이블:",
    "FR": "Fibre:",
    "JA": "光ファイバ:"
  },
  "Alarm": {
    "EN": "Alarm",
    "TE": "అలారం",
    "TA": "அலாரம்",
    "HI": "अलार्म",
    "PT": "Alarme",
    "KO": "알람",
    "FR": "Alarme",
    "JA": "アラーム"
  },
  "Alarm:": {
    "EN": "Alarm:",
    "TE": "అలారం:",
    "TA": "அலாரம்:",
    "HI": "अलार्म:",
    "PT": "Alarme:",
    "KO": "알람:",
    "FR": "Alarme:",
    "JA": "アラーム:"
  },
  "Event": {
    "EN": "Event",
    "TE": "ఈవెంట్",
    "TA": "நிகழ்வு",
    "HI": "इवेंट",
    "PT": "Evento",
    "KO": "이벤트",
    "FR": "Événement",
    "JA": "イベント"
  },
  "Event:": {
    "EN": "Event:",
    "TE": "ఈవెంట్:",
    "TA": "நிகழ்வு:",
    "HI": "इवेंट:",
    "PT": "Evento:",
    "KO": "이벤트:",
    "FR": "Événement:",
    "JA": "イベント:"
  },
  "Fault": {
    "EN": "Fault",
    "TE": "ఫాల్ట్",
    "TA": "பிழை",
    "HI": "फॉल्ट",
    "PT": "Falha",
    "KO": "고장",
    "FR": "Défaut",
    "JA": "故障・フォルト"
  },
  "Fault:": {
    "EN": "Fault:",
    "TE": "ఫాల్ట్:",
    "TA": "பிழை:",
    "HI": "फॉल्ट:",
    "PT": "Falha:",
    "KO": "고장:",
    "FR": "Défaut:",
    "JA": "故障・フォルト:"
  },
  "Tests": {
    "EN": "Tests",
    "TE": "పరీక్షలు",
    "TA": "சோதனைகள்",
    "HI": "परीक्षण",
    "PT": "Testes",
    "KO": "테스트",
    "FR": "Tests",
    "JA": "テスト"
  },
  "Tests:": {
    "EN": "Tests:",
    "TE": "పరీక్షలు:",
    "TA": "சோதனைகள்:",
    "HI": "परीक्षण:",
    "PT": "Testes:",
    "KO": "테스트:",
    "FR": "Tests:",
    "JA": "テスト:"
  },
  "State": {
    "EN": "State",
    "TE": "స్థితి",
    "TA": "நிலை",
    "HI": "अवस्था",
    "PT": "Estado",
    "KO": "상태",
    "FR": "État",
    "JA": "状態"
  },
  "State:": {
    "EN": "State:",
    "TE": "స్థితి:",
    "TA": "நிலை:",
    "HI": "अवस्था:",
    "PT": "Estado:",
    "KO": "상태:",
    "FR": "État:",
    "JA": "状態:"
  },
  "Value": {
    "EN": "Value",
    "TE": "విలువ",
    "TA": "மதிப்பு",
    "HI": "मान",
    "PT": "Valor",
    "KO": "값",
    "FR": "Valeur",
    "JA": "値"
  },
  "Value:": {
    "EN": "Value:",
    "TE": "విలువ:",
    "TA": "மதிப்பு:",
    "HI": "मान:",
    "PT": "Valor:",
    "KO": "값:",
    "FR": "Valeur:",
    "JA": "値:"
  },
  "Level": {
    "EN": "Level",
    "TE": "స్థాయి",
    "TA": "நிலை",
    "HI": "स्तर",
    "PT": "Nível",
    "KO": "레벨",
    "FR": "Niveau",
    "JA": "レベル"
  },
  "Level:": {
    "EN": "Level:",
    "TE": "స్థాయి:",
    "TA": "நிலை:",
    "HI": "स्तर:",
    "PT": "Nível:",
    "KO": "레벨:",
    "FR": "Niveau:",
    "JA": "レベル:"
  },
  "Power": {
    "EN": "Power",
    "TE": "పవర్",
    "TA": "மின்சாரம்",
    "HI": "पावर",
    "PT": "Potência",
    "KO": "전력",
    "FR": "Puissance",
    "JA": "電力"
  },
  "Power:": {
    "EN": "Power:",
    "TE": "పవర్:",
    "TA": "மின்சாரம்:",
    "HI": "पावर:",
    "PT": "Potência:",
    "KO": "전력:",
    "FR": "Puissance:",
    "JA": "電力:"
  },
  "Meter": {
    "EN": "Meter",
    "TE": "మీటర్",
    "TA": "மீட்டர்",
    "HI": "मीटर",
    "PT": "Medidor",
    "KO": "미터",
    "FR": "Compteur",
    "JA": "メーター"
  },
  "Meter:": {
    "EN": "Meter:",
    "TE": "మీటర్:",
    "TA": "மீட்டர்:",
    "HI": "मीटर:",
    "PT": "Medidor:",
    "KO": "미터:",
    "FR": "Compteur:",
    "JA": "メーター:"
  },
  "Frame": {
    "EN": "Frame",
    "TE": "ఫ్రేమ్",
    "TA": "பிரேம்",
    "HI": "फ़्रेम",
    "PT": "Quadro",
    "KO": "프레임",
    "FR": "Trame",
    "JA": "フレーム"
  },
  "Frame:": {
    "EN": "Frame:",
    "TE": "ఫ్రేమ్:",
    "TA": "பிரேம்:",
    "HI": "फ़्रेम:",
    "PT": "Quadro:",
    "KO": "프레임:",
    "FR": "Trame:",
    "JA": "フレーム:"
  },
  "House": {
    "EN": "House",
    "TE": "ఇల్లు (House)",
    "TA": "வீடு",
    "HI": "घर",
    "PT": "Casa",
    "KO": "주택",
    "FR": "Maison",
    "JA": "住宅"
  },
  "House:": {
    "EN": "House:",
    "TE": "ఇల్లు (House):",
    "TA": "வீடு:",
    "HI": "घर:",
    "PT": "Casa:",
    "KO": "주택:",
    "FR": "Maison:",
    "JA": "住宅:"
  },
  "Close": {
    "EN": "Close",
    "TE": "మూసివేయి (Close)",
    "TA": "மூடு (Close)",
    "HI": "बंद करें (Close)",
    "PT": "Fechar (Close)",
    "KO": "닫기 (Close)",
    "FR": "Fermer (Close)",
    "JA": "閉じる (Close)"
  },
  "Close:": {
    "EN": "Close:",
    "TE": "మూసివేయి (Close):",
    "TA": "மூடு (Close):",
    "HI": "बंद करें (Close):",
    "PT": "Fechar (Close):",
    "KO": "닫기 (Close):",
    "FR": "Fermer (Close):",
    "JA": "閉じる (Close):"
  },
  "Reset": {
    "EN": "Reset",
    "TE": "రీసెట్",
    "TA": "மீட்டமை",
    "HI": "रीसेट",
    "PT": "Redefinir",
    "KO": "초기화",
    "FR": "Réinitialiser",
    "JA": "リセット"
  },
  "Reset:": {
    "EN": "Reset:",
    "TE": "రీసెట్:",
    "TA": "மீட்டமை:",
    "HI": "रीसेट:",
    "PT": "Redefinir:",
    "KO": "초기화:",
    "FR": "Réinitialiser:",
    "JA": "リセット:"
  },
  "Clear": {
    "EN": "Clear",
    "TE": "క్లియర్",
    "TA": "அழி",
    "HI": "साफ़ करें",
    "PT": "Limpar",
    "KO": "지우기",
    "FR": "Effacer",
    "JA": "クリア"
  },
  "Clear:": {
    "EN": "Clear:",
    "TE": "క్లియర్:",
    "TA": "அழி:",
    "HI": "साफ़ करें:",
    "PT": "Limpar:",
    "KO": "지우기:",
    "FR": "Effacer:",
    "JA": "クリア:"
  },
  "Print": {
    "EN": "Print",
    "TE": "ప్రింట్",
    "TA": "அச்சிடு",
    "HI": "प्रिंट",
    "PT": "Imprimir",
    "KO": "인쇄",
    "FR": "Imprimer",
    "JA": "印刷"
  },
  "Print:": {
    "EN": "Print:",
    "TE": "ప్రింట్:",
    "TA": "அச்சிடு:",
    "HI": "प्रिंट:",
    "PT": "Imprimir:",
    "KO": "인쇄:",
    "FR": "Imprimer:",
    "JA": "印刷:"
  },
  "Users": {
    "EN": "Users",
    "TE": "వినియోగదారులు",
    "TA": "பயனர்கள்",
    "HI": "उपयोगकर्ता",
    "PT": "Usuários",
    "KO": "사용자",
    "FR": "Utilisateurs",
    "JA": "ユーザー"
  },
  "Users:": {
    "EN": "Users:",
    "TE": "వినియోగదారులు:",
    "TA": "பயனர்கள்:",
    "HI": "उपयोगकर्ता:",
    "PT": "Usuários:",
    "KO": "사용자:",
    "FR": "Utilisateurs:",
    "JA": "ユーザー:"
  },
  "Table": {
    "EN": "Table",
    "TE": "పట్టిక",
    "TA": "அட்டவணை",
    "HI": "तालिका",
    "PT": "Tabela",
    "KO": "테이블",
    "FR": "Tableau",
    "JA": "テーブル"
  },
  "Table:": {
    "EN": "Table:",
    "TE": "పట్టిక:",
    "TA": "அட்டவணை:",
    "HI": "तालिका:",
    "PT": "Tabela:",
    "KO": "테이블:",
    "FR": "Tableau:",
    "JA": "テーブル:"
  },
  "Steps": {
    "EN": "Steps",
    "TE": "దశలు",
    "TA": "படிகள்",
    "HI": "चरण",
    "PT": "Passos",
    "KO": "단계",
    "FR": "Étapes",
    "JA": "ステップ"
  },
  "Steps:": {
    "EN": "Steps:",
    "TE": "దశలు:",
    "TA": "படிகள்:",
    "HI": "चरण:",
    "PT": "Passos:",
    "KO": "단계:",
    "FR": "Étapes:",
    "JA": "ステップ:"
  },
  "Cause": {
    "EN": "Cause",
    "TE": "కారణం",
    "TA": "காரணம்",
    "HI": "कारण",
    "PT": "Causa",
    "KO": "원인",
    "FR": "Cause du défaut",
    "JA": "原因"
  },
  "Cause:": {
    "EN": "Cause:",
    "TE": "కారణం:",
    "TA": "காரணம்:",
    "HI": "कारण:",
    "PT": "Causa:",
    "KO": "원인:",
    "FR": "Cause du défaut:",
    "JA": "原因:"
  },
  "Model": {
    "EN": "Model",
    "TE": "మోడల్",
    "TA": "மாதிரி",
    "HI": "मॉडल",
    "PT": "Modelo",
    "KO": "모델",
    "FR": "Modèle",
    "JA": "モデル"
  },
  "Model:": {
    "EN": "Model:",
    "TE": "మోడల్:",
    "TA": "மாதிரி:",
    "HI": "मॉडल:",
    "PT": "Modelo:",
    "KO": "모델:",
    "FR": "Modèle:",
    "JA": "モデル:"
  },
  "Nodes": {
    "EN": "Nodes",
    "TE": "నోడ్స్",
    "TA": "முனைகள்",
    "HI": "नोड्स",
    "PT": "Nós",
    "KO": "노드",
    "FR": "Nœuds",
    "JA": "ノード"
  },
  "Nodes:": {
    "EN": "Nodes:",
    "TE": "నోడ్స్:",
    "TA": "முனைகள்:",
    "HI": "नोड्स:",
    "PT": "Nós:",
    "KO": "노드:",
    "FR": "Nœuds:",
    "JA": "ノード:"
  },
  "Links": {
    "EN": "Links",
    "TE": "లింక్‌లు",
    "TA": "இணைப்புகள்",
    "HI": "लिंक",
    "PT": "Links",
    "KO": "링크",
    "FR": "Liens",
    "JA": "リンク"
  },
  "Links:": {
    "EN": "Links:",
    "TE": "లింక్‌లు:",
    "TA": "இணைப்புகள்:",
    "HI": "लिंक:",
    "PT": "Links:",
    "KO": "링크:",
    "FR": "Liens:",
    "JA": "リンク:"
  },
  "Paths": {
    "EN": "Paths",
    "TE": "మార్గాలు",
    "TA": "பாதைகள்",
    "HI": "पथ",
    "PT": "Caminhos",
    "KO": "경로",
    "FR": "Chemins",
    "JA": "経路"
  },
  "Paths:": {
    "EN": "Paths:",
    "TE": "మార్గాలు:",
    "TA": "பாதைகள்:",
    "HI": "पथ:",
    "PT": "Caminhos:",
    "KO": "경로:",
    "FR": "Chemins:",
    "JA": "経路:"
  },
  "Chain": {
    "EN": "Chain",
    "TE": "చైన్",
    "TA": "சங்கிலி",
    "HI": "श्रृंखला",
    "PT": "Cadeia",
    "KO": "체인",
    "FR": "Chaîne",
    "JA": "チェーン"
  },
  "Chain:": {
    "EN": "Chain:",
    "TE": "చైన్:",
    "TA": "சங்கிலி:",
    "HI": "श्रृंखला:",
    "PT": "Cadeia:",
    "KO": "체인:",
    "FR": "Chaîne:",
    "JA": "チェーン:"
  },
  "Panel": {
    "EN": "Panel",
    "TE": "ప్యానెల్",
    "TA": "பேனல்",
    "HI": "पैनल",
    "PT": "Painel",
    "KO": "패널",
    "FR": "Panneau",
    "JA": "パネル"
  },
  "Panel:": {
    "EN": "Panel:",
    "TE": "ప్యానెల్:",
    "TA": "பேனல்:",
    "HI": "पैनल:",
    "PT": "Painel:",
    "KO": "패널:",
    "FR": "Panneau:",
    "JA": "パネル:"
  },
  "Speed": {
    "EN": "Speed",
    "TE": "వేగం",
    "TA": "வேகம்",
    "HI": "गति",
    "PT": "Velocidade",
    "KO": "속도",
    "FR": "Vitesse",
    "JA": "速度"
  },
  "Speed:": {
    "EN": "Speed:",
    "TE": "వేగం:",
    "TA": "வேகம்:",
    "HI": "गति:",
    "PT": "Velocidade:",
    "KO": "속도:",
    "FR": "Vitesse:",
    "JA": "速度:"
  },
  "Click": {
    "EN": "Click",
    "TE": "క్లిక్ చేయండి",
    "TA": "கிளிக் செய்",
    "HI": "क्लिक करें",
    "PT": "Clique",
    "KO": "클릭",
    "FR": "Cliquez",
    "JA": "クリック"
  },
  "Click:": {
    "EN": "Click:",
    "TE": "క్లిక్ చేయండి:",
    "TA": "கிளிக் செய்:",
    "HI": "क्लिक करें:",
    "PT": "Clique:",
    "KO": "클릭:",
    "FR": "Cliquez:",
    "JA": "クリック:"
  },
  "Pause": {
    "EN": "Pause",
    "TE": "పాజ్ చేయండి",
    "TA": "இடைநிறுத்து",
    "HI": "रोकें (Pause)",
    "PT": "Pausar",
    "KO": "일시정지",
    "FR": "Mettre en pause",
    "JA": "一時停止"
  },
  "Pause:": {
    "EN": "Pause:",
    "TE": "పాజ్ చేయండి:",
    "TA": "இடைநிறுத்து:",
    "HI": "रोकें (Pause):",
    "PT": "Pausar:",
    "KO": "일시정지:",
    "FR": "Mettre en pause:",
    "JA": "一時停止:"
  },
  "Actor": {
    "EN": "Actor",
    "TE": "యాక్టర్ (Actor)",
    "TA": "செயற்பாட்டாளர்",
    "HI": "कर्ता (Actor)",
    "PT": "Ator",
    "KO": "수행 주체",
    "FR": "Acteur",
    "JA": "アクター"
  },
  "Actor:": {
    "EN": "Actor:",
    "TE": "యాక్టర్ (Actor):",
    "TA": "செயற்பாட்டாளர்:",
    "HI": "कर्ता (Actor):",
    "PT": "Ator:",
    "KO": "수행 주체:",
    "FR": "Acteur:",
    "JA": "アクター:"
  },
  "Class": {
    "EN": "Class",
    "TE": "క్లాస్",
    "TA": "வகுப்பு",
    "HI": "वर्ग (Class)",
    "PT": "Classe",
    "KO": "클래스",
    "FR": "Classe logique",
    "JA": "クラス"
  },
  "Class:": {
    "EN": "Class:",
    "TE": "క్లాస్:",
    "TA": "வகுப்பு:",
    "HI": "वर्ग (Class):",
    "PT": "Classe:",
    "KO": "클래스:",
    "FR": "Classe logique:",
    "JA": "クラス:"
  },
  "Stack": {
    "EN": "Stack",
    "TE": "స్టాక్",
    "TA": "அடுக்கு (Stack)",
    "HI": "स्टैक",
    "PT": "Pilha (Stack)",
    "KO": "스택",
    "FR": "Pile protocolaire",
    "JA": "スタック"
  },
  "Stack:": {
    "EN": "Stack:",
    "TE": "స్టాక్:",
    "TA": "அடுக்கு (Stack):",
    "HI": "स्टैक:",
    "PT": "Pilha (Stack):",
    "KO": "스택:",
    "FR": "Pile protocolaire:",
    "JA": "スタック:"
  },
  "Input": {
    "EN": "Input",
    "TE": "ఇన్‌పుట్",
    "TA": "உள்ளீடு",
    "HI": "इनपुट",
    "PT": "Entrada",
    "KO": "입력",
    "FR": "Entrée",
    "JA": "入力"
  },
  "Input:": {
    "EN": "Input:",
    "TE": "ఇన్‌పుట్:",
    "TA": "உள்ளீடு:",
    "HI": "इनपुट:",
    "PT": "Entrada:",
    "KO": "입력:",
    "FR": "Entrée:",
    "JA": "入力:"
  },
  "Write": {
    "EN": "Write",
    "TE": "రాయండి (Write)",
    "TA": "எழுது",
    "HI": "लिखें (Write)",
    "PT": "Escrita",
    "KO": "쓰기",
    "FR": "Écriture",
    "JA": "書込"
  },
  "Write:": {
    "EN": "Write:",
    "TE": "రాయండి (Write):",
    "TA": "எழுது:",
    "HI": "लिखें (Write):",
    "PT": "Escrita:",
    "KO": "쓰기:",
    "FR": "Écriture:",
    "JA": "書込:"
  },
  "Plane": {
    "EN": "Plane",
    "TE": "ప్లేన్",
    "TA": "தளம்",
    "HI": "प्लेन",
    "PT": "Plano",
    "KO": "플레인",
    "FR": "Plan réseau",
    "JA": "プレーン"
  },
  "Plane:": {
    "EN": "Plane:",
    "TE": "ప్లేన్:",
    "TA": "தளம்:",
    "HI": "प्लेन:",
    "PT": "Plano:",
    "KO": "플레인:",
    "FR": "Plan réseau:",
    "JA": "プレーン:"
  },
  "Media": {
    "EN": "Media",
    "TE": "మీడియా",
    "TA": "ஊடகம்",
    "HI": "मीडिया",
    "PT": "Mídia",
    "KO": "미디어",
    "FR": "Support physique",
    "JA": "メディア"
  },
  "Media:": {
    "EN": "Media:",
    "TE": "మీడియా:",
    "TA": "ஊடகம்:",
    "HI": "मीडिया:",
    "PT": "Mídia:",
    "KO": "미디어:",
    "FR": "Support physique:",
    "JA": "メディア:"
  },
  "Major": {
    "EN": "Major",
    "TE": "మేజర్",
    "TA": "முக்கிய",
    "HI": "प्रमुख (Major)",
    "PT": "Maior (Major)",
    "KO": "주요 (Major)",
    "FR": "Majeur",
    "JA": " 주요（メジャー）"
  },
  "Major:": {
    "EN": "Major:",
    "TE": "మేజర్:",
    "TA": "முக்கிய:",
    "HI": "प्रमुख (Major):",
    "PT": "Maior (Major):",
    "KO": "주요 (Major):",
    "FR": "Majeur:",
    "JA": " 주요（メジャー）:"
  },
  "Check": {
    "EN": "Check",
    "TE": "తనిఖీ చేయండి",
    "TA": "சரிபார்",
    "HI": "जाँचें",
    "PT": "Verificar",
    "KO": "점검",
    "FR": "Contrôler",
    "JA": "チェック"
  },
  "Check:": {
    "EN": "Check:",
    "TE": "తనిఖీ చేయండి:",
    "TA": "சரிபார்:",
    "HI": "जाँचें:",
    "PT": "Verificar:",
    "KO": "점검:",
    "FR": "Contrôler:",
    "JA": "チェック:"
  },
  "Local": {
    "EN": "Local",
    "TE": "లోకల్",
    "TA": "உள்ளூர் (Local)",
    "HI": "लोकल",
    "PT": "Local (Painel)",
    "KO": "로컬 (현장)",
    "FR": "Local (Cellule)",
    "JA": "ローカル（現地）"
  },
  "Local:": {
    "EN": "Local:",
    "TE": "లోకల్:",
    "TA": "உள்ளூர் (Local):",
    "HI": "लोकल:",
    "PT": "Local (Painel):",
    "KO": "로컬 (현장):",
    "FR": "Local (Cellule):",
    "JA": "ローカル（現地）:"
  },
  "Earth": {
    "EN": "Earth",
    "TE": "ఎర్త్",
    "TA": "புவி (Earth)",
    "HI": "अर्थ",
    "PT": "Terra",
    "KO": "접지",
    "FR": "Terre",
    "JA": "接地"
  },
  "Earth:": {
    "EN": "Earth:",
    "TE": "ఎర్త్:",
    "TA": "புவி (Earth):",
    "HI": "अर्थ:",
    "PT": "Terra:",
    "KO": "접지:",
    "FR": "Terre:",
    "JA": "接地:"
  },
  "Clock": {
    "EN": "Clock",
    "TE": "క్లాక్",
    "TA": "கடிகாரம்",
    "HI": "क्लॉक",
    "PT": "Relógio",
    "KO": "클록",
    "FR": "Horloge",
    "JA": "クロック"
  },
  "Clock:": {
    "EN": "Clock:",
    "TE": "క్లాక్:",
    "TA": "கடிகாரம்:",
    "HI": "क्लॉक:",
    "PT": "Relógio:",
    "KO": "클록:",
    "FR": "Horloge:",
    "JA": "クロック:"
  },
  "Match": {
    "EN": "Match",
    "TE": "సరిపోలు",
    "TA": "பொருந்தும்",
    "HI": "मेल",
    "PT": "Corresponder",
    "KO": "일치",
    "FR": "Correspondre",
    "JA": "一致"
  },
  "Match:": {
    "EN": "Match:",
    "TE": "సరిపోలు:",
    "TA": "பொருந்தும்:",
    "HI": "मेल:",
    "PT": "Corresponder:",
    "KO": "일치:",
    "FR": "Correspondre:",
    "JA": "一致:"
  },
  "Field": {
    "EN": "Field",
    "TE": "ఫీల్డ్",
    "TA": "களம்",
    "HI": "फ़ील्ड",
    "PT": "Campo",
    "KO": "현장 (Field)",
    "FR": "Terrain",
    "JA": "フィールド"
  },
  "Field:": {
    "EN": "Field:",
    "TE": "ఫీల్డ్:",
    "TA": "களம்:",
    "HI": "फ़ील्ड:",
    "PT": "Campo:",
    "KO": "현장 (Field):",
    "FR": "Terrain:",
    "JA": "フィールド:"
  },
  "Labs": {
    "EN": "Labs",
    "TE": "ల్యాబ్‌లు",
    "TA": "ஆய்வகங்கள்",
    "HI": "लैब्स",
    "PT": "Laboratórios",
    "KO": "실습실",
    "FR": "Laboratoires",
    "JA": "ラボ"
  },
  "Labs:": {
    "EN": "Labs:",
    "TE": "ల్యాబ్‌లు:",
    "TA": "ஆய்வகங்கள்:",
    "HI": "लैब्स:",
    "PT": "Laboratórios:",
    "KO": "실습실:",
    "FR": "Laboratoires:",
    "JA": "ラボ:"
  },
  "Port": {
    "EN": "Port",
    "TE": "పోర్ట్",
    "TA": "போர்ட்",
    "HI": "पोर्ट",
    "PT": "Porta",
    "KO": "포트",
    "FR": "Port réseau",
    "JA": "ポート"
  },
  "Port:": {
    "EN": "Port:",
    "TE": "పోర్ట్:",
    "TA": "போர்ட்:",
    "HI": "पोर्ट:",
    "PT": "Porta:",
    "KO": "포트:",
    "FR": "Port réseau:",
    "JA": "ポート:"
  },
  "Trip": {
    "EN": "Trip",
    "TE": "ట్రిప్",
    "TA": "டிரிப்",
    "HI": "ट्रिप",
    "PT": "Disparo",
    "KO": "트립",
    "FR": "Déclenchement",
    "JA": "トリップ"
  },
  "Trip:": {
    "EN": "Trip:",
    "TE": "ట్రిప్:",
    "TA": "டிரிப்:",
    "HI": "ट्रिप:",
    "PT": "Disparo:",
    "KO": "트립:",
    "FR": "Déclenchement:",
    "JA": "トリップ:"
  },
  "Test": {
    "EN": "Test",
    "TE": "పరీక్ష (Test)",
    "TA": "சோதனை",
    "HI": "परीक्षण",
    "PT": "Teste",
    "KO": "테스트",
    "FR": "Essai (Test)",
    "JA": "テスト"
  },
  "Test:": {
    "EN": "Test:",
    "TE": "పరీక్ష (Test):",
    "TA": "சோதனை:",
    "HI": "परीक्षण:",
    "PT": "Teste:",
    "KO": "테스트:",
    "FR": "Essai (Test):",
    "JA": "テスト:"
  },
  "Time": {
    "EN": "Time",
    "TE": "సమయం",
    "TA": "நேரம்",
    "HI": "समय",
    "PT": "Tempo",
    "KO": "시간",
    "FR": "Temps",
    "JA": "時間"
  },
  "Time:": {
    "EN": "Time:",
    "TE": "సమయం:",
    "TA": "நேரம்:",
    "HI": "समय:",
    "PT": "Tempo:",
    "KO": "시간:",
    "FR": "Temps:",
    "JA": "時間:"
  },
  "Name": {
    "EN": "Name",
    "TE": "పేరు",
    "TA": "பெயர்",
    "HI": "नाम",
    "PT": "Nome",
    "KO": "이름",
    "FR": "Nom",
    "JA": "名前"
  },
  "Name:": {
    "EN": "Name:",
    "TE": "పేరు:",
    "TA": "பெயர்:",
    "HI": "नाम:",
    "PT": "Nome:",
    "KO": "이름:",
    "FR": "Nom:",
    "JA": "名前:"
  },
  "Type": {
    "EN": "Type",
    "TE": "రకం",
    "TA": "வகை",
    "HI": "प्रकार",
    "PT": "Tipo",
    "KO": "유형",
    "FR": "Type",
    "JA": "タイプ"
  },
  "Type:": {
    "EN": "Type:",
    "TE": "రకం:",
    "TA": "வகை:",
    "HI": "प्रकार:",
    "PT": "Tipo:",
    "KO": "유형:",
    "FR": "Type:",
    "JA": "タイプ:"
  },
  "Role": {
    "EN": "Role",
    "TE": "పాత్ర",
    "TA": "பங்கு",
    "HI": "भूमिका",
    "PT": "Função",
    "KO": "역할",
    "FR": "Rôle",
    "JA": "役割"
  },
  "Role:": {
    "EN": "Role:",
    "TE": "పాత్ర:",
    "TA": "பங்கு:",
    "HI": "भूमिका:",
    "PT": "Função:",
    "KO": "역할:",
    "FR": "Rôle:",
    "JA": "役割:"
  },
  "Mode": {
    "EN": "Mode",
    "TE": "మోడ్",
    "TA": "முறை",
    "HI": "मोड",
    "PT": "Modo",
    "KO": "모드",
    "FR": "Mode opératoire",
    "JA": "モード"
  },
  "Mode:": {
    "EN": "Mode:",
    "TE": "మోడ్:",
    "TA": "முறை:",
    "HI": "मोड:",
    "PT": "Modo:",
    "KO": "모드:",
    "FR": "Mode opératoire:",
    "JA": "モード:"
  },
  "Load": {
    "EN": "Load",
    "TE": "లోడ్",
    "TA": "சுமை",
    "HI": "लोड",
    "PT": "Carga",
    "KO": "부하",
    "FR": "Charge",
    "JA": "負荷"
  },
  "Load:": {
    "EN": "Load:",
    "TE": "లోడ్:",
    "TA": "சுமை:",
    "HI": "लोड:",
    "PT": "Carga:",
    "KO": "부하:",
    "FR": "Charge:",
    "JA": "負荷:"
  },
  "Road": {
    "EN": "Road",
    "TE": "రోడ్డు",
    "TA": "சாலை",
    "HI": "सड़क",
    "PT": "Estrada",
    "KO": "도로",
    "FR": "Route",
    "JA": "道路"
  },
  "Road:": {
    "EN": "Road:",
    "TE": "రోడ్డు:",
    "TA": "சாலை:",
    "HI": "सड़क:",
    "PT": "Estrada:",
    "KO": "도로:",
    "FR": "Route:",
    "JA": "道路:"
  },
  "Open": {
    "EN": "Open",
    "TE": "తెరవండి (Open)",
    "TA": "திற (Open)",
    "HI": "खोलें (Open)",
    "PT": "Abrir (Open)",
    "KO": "열기 (Open)",
    "FR": "Ouvrir (Open)",
    "JA": "開く (Open)"
  },
  "Open:": {
    "EN": "Open:",
    "TE": "తెరవండి (Open):",
    "TA": "திற (Open):",
    "HI": "खोलें (Open):",
    "PT": "Abrir (Open):",
    "KO": "열기 (Open):",
    "FR": "Ouvrir (Open):",
    "JA": "開く (Open):"
  },
  "Save": {
    "EN": "Save",
    "TE": "సేవ్ చేయండి",
    "TA": "சேமி",
    "HI": "सहेजें",
    "PT": "Salvar",
    "KO": "저장",
    "FR": "Enregistrer",
    "JA": "保存"
  },
  "Save:": {
    "EN": "Save:",
    "TE": "సేవ్ చేయండి:",
    "TA": "சேமி:",
    "HI": "सहेजें:",
    "PT": "Salvar:",
    "KO": "저장:",
    "FR": "Enregistrer:",
    "JA": "保存:"
  },
  "View": {
    "EN": "View",
    "TE": "వ్యూ",
    "TA": "காட்சி",
    "HI": "दृश्य",
    "PT": "Visualizar",
    "KO": "보기",
    "FR": "Vue",
    "JA": "表示"
  },
  "View:": {
    "EN": "View:",
    "TE": "వ్యూ:",
    "TA": "காட்சி:",
    "HI": "दृश्य:",
    "PT": "Visualizar:",
    "KO": "보기:",
    "FR": "Vue:",
    "JA": "表示:"
  },
  "Live": {
    "EN": "Live",
    "TE": "లైవ్",
    "TA": "நேரடி",
    "HI": "लाइव",
    "PT": "Ao vivo",
    "KO": "실시간",
    "FR": "En direct",
    "JA": "ライブ"
  },
  "Live:": {
    "EN": "Live:",
    "TE": "లైవ్:",
    "TA": "நேரடி:",
    "HI": "लाइव:",
    "PT": "Ao vivo:",
    "KO": "실시간:",
    "FR": "En direct:",
    "JA": "ライブ:"
  },
  "User": {
    "EN": "User",
    "TE": "వినియోగదారు",
    "TA": "பயனர்",
    "HI": "उपयोगकर्ता",
    "PT": "Usuário",
    "KO": "사용자",
    "FR": "Utilisateur",
    "JA": "ユーザー"
  },
  "User:": {
    "EN": "User:",
    "TE": "వినియోగదారు:",
    "TA": "பயனர்:",
    "HI": "उपयोगकर्ता:",
    "PT": "Usuário:",
    "KO": "사용자:",
    "FR": "Utilisateur:",
    "JA": "ユーザー:"
  },
  "Step": {
    "EN": "Step",
    "TE": "దశ",
    "TA": "படி",
    "HI": "चरण",
    "PT": "Passo",
    "KO": "단계",
    "FR": "Étape",
    "JA": "ステップ"
  },
  "Step:": {
    "EN": "Step:",
    "TE": "దశ:",
    "TA": "படி:",
    "HI": "चरण:",
    "PT": "Passo:",
    "KO": "단계:",
    "FR": "Étape:",
    "JA": "ステップ:"
  },
  "Node": {
    "EN": "Node",
    "TE": "నోడ్",
    "TA": "முனை",
    "HI": "नोड",
    "PT": "Nó",
    "KO": "노드",
    "FR": "Nœud",
    "JA": "ノード"
  },
  "Node:": {
    "EN": "Node:",
    "TE": "నోడ్:",
    "TA": "முனை:",
    "HI": "नोड:",
    "PT": "Nó:",
    "KO": "노드:",
    "FR": "Nœud:",
    "JA": "ノード:"
  },
  "Link": {
    "EN": "Link",
    "TE": "లింక్",
    "TA": "இணைப்பு",
    "HI": "लिंक",
    "PT": "Link",
    "KO": "링크",
    "FR": "Lien",
    "JA": "リンク"
  },
  "Link:": {
    "EN": "Link:",
    "TE": "లింక్:",
    "TA": "இணைப்பு:",
    "HI": "लिंक:",
    "PT": "Link:",
    "KO": "링크:",
    "FR": "Lien:",
    "JA": "リンク:"
  },
  "Path": {
    "EN": "Path",
    "TE": "మార్గం",
    "TA": "பாதை",
    "HI": "पथ",
    "PT": "Caminho",
    "KO": "경로",
    "FR": "Chemin",
    "JA": "経路"
  },
  "Path:": {
    "EN": "Path:",
    "TE": "మార్గం:",
    "TA": "பாதை:",
    "HI": "पथ:",
    "PT": "Caminho:",
    "KO": "경로:",
    "FR": "Chemin:",
    "JA": "経路:"
  },
  "Ring": {
    "EN": "Ring",
    "TE": "రింగ్",
    "TA": "வளையம்",
    "HI": "रिंग",
    "PT": "Anel",
    "KO": "링",
    "FR": "Anneau",
    "JA": "リング"
  },
  "Ring:": {
    "EN": "Ring:",
    "TE": "రింగ్:",
    "TA": "வளையம்:",
    "HI": "रिंग:",
    "PT": "Anel:",
    "KO": "링:",
    "FR": "Anneau:",
    "JA": "リング:"
  },
  "Rack": {
    "EN": "Rack",
    "TE": "ర్యాక్",
    "TA": "ரேக்",
    "HI": "रैक",
    "PT": "Rack",
    "KO": "랙",
    "FR": "Baie",
    "JA": "ラック"
  },
  "Rack:": {
    "EN": "Rack:",
    "TE": "ర్యాక్:",
    "TA": "ரேக்:",
    "HI": "रैक:",
    "PT": "Rack:",
    "KO": "랙:",
    "FR": "Baie:",
    "JA": "ラック:"
  },
  "Last": {
    "EN": "Last",
    "TE": "చివరి",
    "TA": "கடைசி",
    "HI": "अंतिम",
    "PT": "Último",
    "KO": "최근",
    "FR": "Dernier",
    "JA": "最終"
  },
  "Last:": {
    "EN": "Last:",
    "TE": "చివరి:",
    "TA": "கடைசி:",
    "HI": "अंतिम:",
    "PT": "Último:",
    "KO": "최근:",
    "FR": "Dernier:",
    "JA": "最終:"
  },
  "Full": {
    "EN": "Full",
    "TE": "పూర్తి",
    "TA": "முழு",
    "HI": "पूर्ण",
    "PT": "Completo",
    "KO": "전체",
    "FR": "Complet",
    "JA": "フル"
  },
  "Full:": {
    "EN": "Full:",
    "TE": "పూర్తి:",
    "TA": "முழு:",
    "HI": "पूर्ण:",
    "PT": "Completo:",
    "KO": "전체:",
    "FR": "Complet:",
    "JA": "フル:"
  },
  "Dual": {
    "EN": "Dual",
    "TE": "డ్యూయల్",
    "TA": "இரட்டை",
    "HI": "दोहरा",
    "PT": "Duplo",
    "KO": "듀얼",
    "FR": "Double",
    "JA": "デュアル"
  },
  "Dual:": {
    "EN": "Dual:",
    "TE": "డ్యూయల్:",
    "TA": "இரட்டை:",
    "HI": "दोहरा:",
    "PT": "Duplo:",
    "KO": "듀얼:",
    "FR": "Double:",
    "JA": "デュアル:"
  },
  "Dusk": {
    "EN": "Dusk",
    "TE": "సాయంత్రం (Dusk)",
    "TA": "மாலை",
    "HI": "गोधूलि (Dusk)",
    "PT": "Entardecer",
    "KO": "황혼 (Dusk)",
    "FR": "Crépuscule",
    "JA": "夕暮れ"
  },
  "Dusk:": {
    "EN": "Dusk:",
    "TE": "సాయంత్రం (Dusk):",
    "TA": "மாலை:",
    "HI": "गोधूलि (Dusk):",
    "PT": "Entardecer:",
    "KO": "황혼 (Dusk):",
    "FR": "Crépuscule:",
    "JA": "夕暮れ:"
  },
  "Code": {
    "EN": "Code",
    "TE": "కోడ్",
    "TA": "குறியீடு",
    "HI": "कोड",
    "PT": "Código",
    "KO": "코드",
    "FR": "Code",
    "JA": "コード"
  },
  "Code:": {
    "EN": "Code:",
    "TE": "కోడ్:",
    "TA": "குறியீடு:",
    "HI": "कोड:",
    "PT": "Código:",
    "KO": "코드:",
    "FR": "Code:",
    "JA": "コード:"
  },
  "Line": {
    "EN": "Line",
    "TE": "లైన్",
    "TA": "வரி / லைன்",
    "HI": "लाइन",
    "PT": "Linha",
    "KO": "선로",
    "FR": "Ligne",
    "JA": "線路"
  },
  "Line:": {
    "EN": "Line:",
    "TE": "లైన్:",
    "TA": "வரி / லைன்:",
    "HI": "लाइन:",
    "PT": "Linha:",
    "KO": "선로:",
    "FR": "Ligne:",
    "JA": "線路:"
  },
  "Rate": {
    "EN": "Rate",
    "TE": "రేటు",
    "TA": "விகிதம்",
    "HI": "दर",
    "PT": "Taxa",
    "KO": "속도/율",
    "FR": "Débit",
    "JA": "レート"
  },
  "Rate:": {
    "EN": "Rate:",
    "TE": "రేటు:",
    "TA": "விகிதம்:",
    "HI": "दर:",
    "PT": "Taxa:",
    "KO": "속도/율:",
    "FR": "Débit:",
    "JA": "レート:"
  },
  "Loss": {
    "EN": "Loss",
    "TE": "నష్టం (Loss)",
    "TA": "இழப்பு",
    "HI": "हानि",
    "PT": "Perda",
    "KO": "손실",
    "FR": "Perte",
    "JA": "損失"
  },
  "Loss:": {
    "EN": "Loss:",
    "TE": "నష్టం (Loss):",
    "TA": "இழப்பு:",
    "HI": "हानि:",
    "PT": "Perda:",
    "KO": "손실:",
    "FR": "Perte:",
    "JA": "損失:"
  },
  "Info": {
    "EN": "Info",
    "TE": "సమాచారం",
    "TA": "தகவல்",
    "HI": "जानकारी",
    "PT": "Informação",
    "KO": "정보",
    "FR": "Information",
    "JA": "情報"
  },
  "Info:": {
    "EN": "Info:",
    "TE": "సమాచారం:",
    "TA": "தகவல்:",
    "HI": "जानकारी:",
    "PT": "Informação:",
    "KO": "정보:",
    "FR": "Information:",
    "JA": "情報:"
  },
  "Case": {
    "EN": "Case",
    "TE": "కేసు",
    "TA": "வழக்கு",
    "HI": "केस",
    "PT": "Caso",
    "KO": "케이스",
    "FR": "Cas d'essai",
    "JA": "ケース"
  },
  "Case:": {
    "EN": "Case:",
    "TE": "కేసు:",
    "TA": "வழக்கு:",
    "HI": "केस:",
    "PT": "Caso:",
    "KO": "케이스:",
    "FR": "Cas d'essai:",
    "JA": "ケース:"
  },
  "Coil": {
    "EN": "Coil",
    "TE": "కాయిల్",
    "TA": "காயில்",
    "HI": "कॉइल",
    "PT": "Bobina",
    "KO": "코일",
    "FR": "Bobine",
    "JA": "コイル"
  },
  "Coil:": {
    "EN": "Coil:",
    "TE": "కాయిల్:",
    "TA": "காயில்:",
    "HI": "कॉइल:",
    "PT": "Bobina:",
    "KO": "코일:",
    "FR": "Bobine:",
    "JA": "コイル:"
  },
  "Bay:": {
    "EN": "Bay:",
    "TE": "బే:",
    "TA": "பே:",
    "HI": "बे:",
    "PT": "Vão:",
    "KO": "베이:",
    "FR": "Travée :",
    "JA": "ベイ:"
  },
  "Auth": {
    "EN": "Auth",
    "TE": "ధృవీకరణ",
    "TA": "அங்கீகாரம்",
    "HI": "प्रमाणीकरण",
    "PT": "Autenticação",
    "KO": "인증",
    "FR": "Authentification",
    "JA": "認証"
  },
  "Auth:": {
    "EN": "Auth:",
    "TE": "ధృవీకరణ:",
    "TA": "அங்கீகாரம்:",
    "HI": "प्रमाणीकरण:",
    "PT": "Autenticação:",
    "KO": "인증:",
    "FR": "Authentification:",
    "JA": "認証:"
  },
  "Card": {
    "EN": "Card",
    "TE": "కార్డ్",
    "TA": "அட்டை",
    "HI": "कार्ड",
    "PT": "Cartão",
    "KO": "카드",
    "FR": "Carte",
    "JA": "カード"
  },
  "Card:": {
    "EN": "Card:",
    "TE": "కార్డ్:",
    "TA": "அட்டை:",
    "HI": "कार्ड:",
    "PT": "Cartão:",
    "KO": "카드:",
    "FR": "Carte:",
    "JA": "カード:"
  },
  "Temp": {
    "EN": "Temp",
    "TE": "ఉష్ణోగ్రత",
    "TA": "வெப்பநிலை",
    "HI": "तापमान",
    "PT": "Temp.",
    "KO": "온도",
    "FR": "Temp.",
    "JA": "温度"
  },
  "Temp:": {
    "EN": "Temp:",
    "TE": "ఉష్ణోగ్రత:",
    "TA": "வெப்பநிலை:",
    "HI": "तापमान:",
    "PT": "Temp.:",
    "KO": "온도:",
    "FR": "Temp.:",
    "JA": "温度:"
  },
  "Lab": {
    "EN": "Lab",
    "TE": "ల్యాబ్",
    "TA": "ஆய்வகம்",
    "HI": "लैब",
    "PT": "Laboratório",
    "KO": "실습실",
    "FR": "Laboratoire",
    "JA": "ラボ"
  },
  "Lab:": {
    "EN": "Lab:",
    "TE": "ల్యాబ్:",
    "TA": "ஆய்வகம்:",
    "HI": "लैब:",
    "PT": "Laboratório:",
    "KO": "실습실:",
    "FR": "Laboratoire:",
    "JA": "ラボ:"
  },
  "All": {
    "EN": "All",
    "TE": "అన్నీ",
    "TA": "அனைத்தும்",
    "HI": "सभी",
    "PT": "Todos",
    "KO": "전체",
    "FR": "Tous",
    "JA": "すべて"
  },
  "All:": {
    "EN": "All:",
    "TE": "అన్నీ:",
    "TA": "அனைத்தும்:",
    "HI": "सभी:",
    "PT": "Todos:",
    "KO": "전체:",
    "FR": "Tous:",
    "JA": "すべて:"
  },
  "New": {
    "EN": "New",
    "TE": "కొత్త",
    "TA": "புதிய",
    "HI": "नया",
    "PT": "Novo",
    "KO": "새",
    "FR": "Nouveau",
    "JA": "新規"
  },
  "New:": {
    "EN": "New:",
    "TE": "కొత్త:",
    "TA": "புதிய:",
    "HI": "नया:",
    "PT": "Novo:",
    "KO": "새:",
    "FR": "Nouveau:",
    "JA": "新規:"
  },
  "Run": {
    "EN": "Run",
    "TE": "రన్ చేయండి",
    "TA": "இயக்கு",
    "HI": "चलाएँ",
    "PT": "Executar",
    "KO": "실행",
    "FR": "Lancer",
    "JA": "実行"
  },
  "Run:": {
    "EN": "Run:",
    "TE": "రన్ చేయండి:",
    "TA": "இயக்கு:",
    "HI": "चलाएँ:",
    "PT": "Executar:",
    "KO": "실행:",
    "FR": "Lancer:",
    "JA": "実行:"
  },
  "Gas": {
    "EN": "Gas",
    "TE": "గ్యాస్",
    "TA": "வாயு",
    "HI": "गैस",
    "PT": "Gás",
    "KO": "가스",
    "FR": "Gaz",
    "JA": "ガス"
  },
  "Gas:": {
    "EN": "Gas:",
    "TE": "గ్యాస్:",
    "TA": "வாயு:",
    "HI": "गैस:",
    "PT": "Gás:",
    "KO": "가스:",
    "FR": "Gaz:",
    "JA": "ガス:"
  },
  "Tap": {
    "EN": "Tap",
    "TE": "ట్యాప్",
    "TA": "டேப்",
    "HI": "टैप",
    "PT": "Tape (Derivação)",
    "KO": "탭 (Tap)",
    "FR": "Prise (Tap)",
    "JA": "タップ"
  },
  "Tap:": {
    "EN": "Tap:",
    "TE": "ట్యాప్:",
    "TA": "டேப்:",
    "HI": "टैप:",
    "PT": "Tape (Derivação):",
    "KO": "탭 (Tap):",
    "FR": "Prise (Tap):",
    "JA": "タップ:"
  },
  "Q&A": {
    "EN": "Q&A",
    "TE": "ప్రశ్నోత్తరాలు (Q&A)",
    "TA": "கேள்வி & பதில் (Q&A)",
    "HI": "प्रश्नोत्तर (Q&A)",
    "PT": "Perguntas e Respostas (Q&A)",
    "KO": "질의응답 (Q&A)",
    "FR": "Questions & Réponses (Q&A)",
    "JA": "一問一答 (Q&A)"
  },
  "Q&A:": {
    "EN": "Q&A:",
    "TE": "ప్రశ్నోత్తరాలు (Q&A):",
    "TA": "கேள்வி & பதில் (Q&A):",
    "HI": "प्रश्नोत्तर (Q&A):",
    "PT": "Perguntas e Respostas (Q&A):",
    "KO": "질의응답 (Q&A):",
    "FR": "Questions & Réponses (Q&A):",
    "JA": "一問一答 (Q&A):"
  },
  "Bay": {
    "EN": "Bay",
    "TE": "బే (Bay)",
    "TA": "பே (Bay)",
    "HI": "बे (Bay)",
    "PT": "Vão (Bay)",
    "KO": "베이 (Bay)",
    "FR": "Travée (Bay)",
    "JA": "ベイ (Bay)"
  },
  "Bus": {
    "EN": "Bus",
    "TE": "బస్ (Bus)",
    "TA": "பஸ் (Bus)",
    "HI": "बस (Bus)",
    "PT": "Barra (Bus)",
    "KO": "모선 (Bus)",
    "FR": "Barre (Bus)",
    "JA": "母線 (Bus)"
  },
  "Bus:": {
    "EN": "Bus:",
    "TE": "బస్ (Bus):",
    "TA": "பஸ் (Bus):",
    "HI": "बस (Bus):",
    "PT": "Barra (Bus):",
    "KO": "모선 (Bus):",
    "FR": "Barre (Bus):",
    "JA": "母線 (Bus):"
  },
  "Tag": {
    "EN": "Tag",
    "TE": "ట్యాగ్",
    "TA": "குறிச்சொல்",
    "HI": "टैग",
    "PT": "Tag (Etiqueta)",
    "KO": "태그",
    "FR": "Étiquette (Tag)",
    "JA": "タグ"
  },
  "Tag:": {
    "EN": "Tag:",
    "TE": "ట్యాగ్:",
    "TA": "குறிச்சொல்:",
    "HI": "टैग:",
    "PT": "Tag (Etiqueta):",
    "KO": "태그:",
    "FR": "Étiquette (Tag):",
    "JA": "タグ:"
  }
};

const PHRASE_RULES: Record<Exclude<SupportedLanguageCode, 'EN'>, ReadonlyArray<readonly [string, string]>> = {
  "TE": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "మద్దతు ఉన్న అన్ని భాషలకు 100% ఆఫ్‌లైన్ అనువాదం అందుబాటులో ఉంది. సాంకేతిక పదాలు మరియు పరికర ఐడిలు మార్చబడవు."
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "ఇంటరాక్టివ్ IPv4 CIDR / VLSM సబ్‌నెట్ కాలిక్యులేటర్"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Modbus TCP క్లయింట్ పోలింగ్ కాన్ఫిగరేషన్"
    ],
    [
      "Backplane Module & Slot Configuration",
      "బ్యాక్‌ప్లేన్ మాడ్యూల్ & స్లాట్ కాన్ఫిగరేషన్"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — GOOSE మల్టీకాస్ట్ (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "ఇంటరాక్టివ్ ప్యాకెట్ ఫ్లో యానిమేటర్"
    ],
    [
      "Interactive Single-Line Diagram",
      "ఇంటరాక్టివ్ సింగిల్-లైన్ డయాగ్రమ్ (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "RCC కు నార్త్‌బౌండ్ టెలికంట్రోల్"
    ],
    [
      "No IEDs match these filters.",
      "ఈ ఫిల్టర్లకు సరిపోయే IEDలు ఏవీ లేవు."
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "ఆశించిన అంగీకార ప్రమాణాలు (Acceptance Criteria)"
    ],
    [
      "Gateway translates MMS → IOA",
      "గేట్‌వే MMS → IOA అనువదిస్తుంది"
    ],
    [
      "Self-Supervision & Watchdog",
      "సెల్ఫ్-సూపర్‌విజన్ & వాచ్‌డాగ్"
    ],
    [
      "Standard Ports & EtherTypes",
      "ప్రామాణిక పోర్టులు & EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "ఫ్యాక్టరీ యాక్సెప్టెన్స్ టెస్టింగ్ (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "ఇండస్ట్రియల్ ఈథర్నెట్ స్విచ్"
    ],
    [
      "Fault Injection Scenarios",
      "ఫాల్ట్ ఇంజెక్షన్ సినారియోలు"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 ఇంటర్వ్యూ • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "స్థితి కోడ్: సాధారణం (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "టెస్ట్ ప్రారంభించి SOE క్యాప్చర్ చేయండి"
    ],
    [
      "Site Acceptance Testing",
      "సైట్ యాక్సెప్టెన్స్ టెస్టింగ్ (SAT)"
    ],
    [
      "State Change Simulation",
      "స్టేట్ చేంజ్ సిమ్యులేషన్"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (TotW / PPV / A కొలతలు):"
    ],
    [
      "Key Takeaways & Checks",
      "ముఖ్య అంశాలు & తనిఖీలు"
    ],
    [
      "Electrical Connections",
      "ఎలక్ట్రికల్ కనెక్షన్లు"
    ],
    [
      "out-of-band management",
      "అవుట్-ఆఫ్-బ్యాండ్ మేనేజ్‌మెంట్"
    ],
    [
      "Derived SCADA 52a/52b:",
      "ఉత్పన్న SCADA 52a/52b:"
    ],
    [
      "General Interrogation",
      "జనరల్ ఇంటరాగేషన్ (GI)"
    ],
    [
      "Highlight connections",
      "కనెక్షన్లను హైలైట్ చేయండి"
    ],
    [
      "Front South Elevation",
      "ఫ్రంట్ సౌత్ ఎలివేషన్ వ్యూ"
    ],
    [
      "Parameter Description",
      "పారామీటర్ వివరణ"
    ],
    [
      "Checkpoints / Remarks",
      "తనిఖీ పాయింట్లు / వ్యాఖ్యలు"
    ],
    [
      "Gateway IEC 61850 Map",
      "గేట్‌వే IEC 61850 మ్యాప్"
    ],
    [
      "Result & Diagnostics",
      "ఫలితం & డయాగ్నస్టిక్స్"
    ],
    [
      "Terms and Conditions",
      "నిబంధనలు మరియు షరతులు"
    ],
    [
      "Single-Line Diagram",
      "సింగిల్-లైన్ డయాగ్రమ్ (SLD)"
    ],
    [
      "Communication Block",
      "కమ్యూనికేషన్ బ్లాక్"
    ],
    [
      "Root Cause Analysis",
      "మూల కారణ విశ్లేషణ"
    ],
    [
      "Distance Protection",
      "డిస్టెన్స్ ప్రొటెక్షన్"
    ],
    [
      "Industrial Ethernet",
      "ఇండస్ట్రియల్ ఈథర్నెట్"
    ],
    [
      "Communication Flow",
      "కమ్యూనికేషన్ ప్రవాహం"
    ],
    [
      "Preferred Language",
      "ప్రాధాన్య భాష"
    ],
    [
      "PBKDF2 Salted Auth",
      "PBKDF2 సాల్టెడ్ ధృవీకరణ"
    ],
    [
      "Signal Description",
      "సిగ్నల్ వివరణ"
    ],
    [
      "Affected Endpoints",
      "ప్రభావిత ఎండ్‌పాయింట్లు"
    ],
    [
      "OPERATIONS CONSOLE",
      "ఆపరేషన్స్ కన్సోల్"
    ],
    [
      "Stop highlighting",
      "హైలైట్ ఆపండి"
    ],
    [
      "Verified Sessions",
      "ధృవీకరించబడిన సెషన్లు"
    ],
    [
      "serial connection",
      "సీరియల్ కనెక్షన్"
    ],
    [
      "Published DataSet",
      "పబ్లిష్డ్ DataSet"
    ],
    [
      "Southbound Source",
      "సౌత్‌బౌండ్ సోర్స్"
    ],
    [
      "Loading / Cooling",
      "లోడింగ్ / కూలింగ్"
    ],
    [
      "Finish & Evaluate",
      "ముగించి మూల్యాంకనం చేయండి"
    ],
    [
      "IEC 61850 Dataset",
      "IEC 61850 డేటాసెట్"
    ],
    [
      "Protection Relay",
      "ప్రొటెక్షన్ రిలే"
    ],
    [
      "Operator Station",
      "ఆపరేటర్ స్టేషన్"
    ],
    [
      "Topology Summary",
      "టోపాలజీ సారాంశం"
    ],
    [
      "Rollover Console",
      "రోలోవర్ కన్సోల్"
    ],
    [
      "Firewall Cluster",
      "ఫైర్‌వాల్ క్లస్టర్"
    ],
    [
      "Association Loss",
      "అసోసియేషన్ లాస్"
    ],
    [
      "Ethertype Suffix",
      "Ethertype సఫిక్స్"
    ],
    [
      "Return to Normal",
      "సాధారణ స్థితికి తిరిగి వెళ్ళు"
    ],
    [
      "Circuit Breaker",
      "సర్క్యూట్ బ్రేకర్"
    ],
    [
      "Protection Trip",
      "ప్రొటెక్షన్ ట్రిప్"
    ],
    [
      "Addressing Plan",
      "అడ్రసింగ్ ప్లాన్"
    ],
    [
      "Live Monitoring",
      "లైవ్ మానిటరింగ్"
    ],
    [
      "Troubleshooting",
      "ట్రబుల్‌షూటింగ్"
    ],
    [
      "Display options",
      "డిస్‌ప్లే ఎంపికలు"
    ],
    [
      "Synch-Check Ref",
      "సింక్-చెక్ రిఫరెన్స్"
    ],
    [
      "IED Connections",
      "IED కనెక్షన్లు"
    ],
    [
      "Data Attributes",
      "డేటా అట్రిబ్యూట్లు"
    ],
    [
      "IED INFORMATION",
      "IED సమాచారం"
    ],
    [
      "Sequence Number",
      "సీక్వెన్స్ నంబర్"
    ],
    [
      "Failed Segments",
      "విఫలమైన సెగ్మెంట్లు"
    ],
    [
      "Manual Transfer",
      "మాన్యువల్ ట్రాన్స్‌ఫర్"
    ],
    [
      "Fast Protection",
      "ఫాస్ట్ ప్రొటెక్షన్"
    ],
    [
      "Timed Evaluator",
      "టైమ్డ్ ఎవాల్యుయేటర్"
    ],
    [
      "Synchronization",
      "సింక్రొనైజేషన్"
    ],
    [
      "Firmware / SCL:",
      "ఫర్మ్‌వేర్ / SCL:"
    ],
    [
      "MMS Association",
      "MMS అసోసియేషన్"
    ],
    [
      "SCADA Tag / HMI",
      "SCADA ట్యాగ్ / HMI"
    ],
    [
      "Retransmission",
      "రీ-ట్రాన్స్‌మిషన్"
    ],
    [
      "Privacy Policy",
      "గోప్యతా విధానం"
    ],
    [
      "Distance-Aware",
      "దూర-ఆధారిత (Distance-Aware)"
    ],
    [
      "LAN Identifier",
      "LAN ఐడెంటిఫైయర్"
    ],
    [
      "Reachable IEDs",
      "చేరుకోగల IEDలు"
    ],
    [
      "Busbar Section",
      "బస్‌బార్ విభాగం"
    ],
    [
      "Specialization",
      "స్పెషలైజేషన్"
    ],
    [
      "Firmware / SCL",
      "ఫర్మ్‌వేర్ / SCL"
    ],
    [
      "OTI / WTI Temp",
      "OTI / WTI ఉష్ణోగ్రత"
    ],
    [
      "IEC 61850 Ref:",
      "IEC 61850 రిఫరెన్స్:"
    ],
    [
      "Line Isolator",
      "లైన్ ఐసోలేటర్"
    ],
    [
      "Disconnectors",
      "ఐసోలేటర్లు"
    ],
    [
      "Communication",
      "కమ్యూనికేషన్"
    ],
    [
      "Configuration",
      "కాన్ఫిగరేషన్"
    ],
    [
      "Commissioning",
      "కమిషనింగ్"
    ],
    [
      "Key Takeaways",
      "ముఖ్య అంశాలు"
    ],
    [
      "Derived SCADA",
      "ఉత్పన్న SCADA"
    ],
    [
      "Wildcard Mask",
      "వైల్డ్‌కార్డ్ మాస్క్"
    ],
    [
      "Quick Actions",
      "త్వరిత చర్యలు"
    ],
    [
      "Auto-Recloser",
      "ఆటో-రీక్లోజర్"
    ],
    [
      "Function Code",
      "ఫంక్షన్ కోడ్"
    ],
    [
      "Allowed VLANs",
      "అనుమతించబడిన VLANలు"
    ],
    [
      "Bus Section A",
      "బస్ విభాగం A"
    ],
    [
      "Bus Section B",
      "బస్ విభాగం B"
    ],
    [
      "Preconditions",
      "ముందస్తు షరతులు"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (మ్యాపింగ్)"
    ],
    [
      "52 CB (Dbpos)",
      "52 CB (Dbpos స్థితి)"
    ],
    [
      "Earth Switch",
      "ఎర్త్ స్విచ్"
    ],
    [
      "Bus Isolator",
      "బస్ ఐసోలేటర్"
    ],
    [
      "Bus Transfer",
      "బస్ ట్రాన్స్‌ఫర్"
    ],
    [
      "Transformers",
      "ట్రాన్స్‌ఫార్మర్లు"
    ],
    [
      "Disconnector",
      "ఐసోలేటర్"
    ],
    [
      "Interlocking",
      "ఇంటర్‌లాకింగ్"
    ],
    [
      "Architecture",
      "ఆర్కిటెక్చర్"
    ],
    [
      "Distribution",
      "డిస్ట్రిబ్యూషన్"
    ],
    [
      "Disconnected",
      "డిస్‌కనెక్ట్ అయింది"
    ],
    [
      "Night Floods",
      "నైట్ ఫ్లడ్ లైట్లు"
    ],
    [
      "Broadcast IP",
      "బ్రాడ్‌కాస్ట్ IP"
    ],
    [
      "Usable Range",
      "వినియోగ పరిధి"
    ],
    [
      "Usable Hosts",
      "వినియోగ హోస్ట్‌లు"
    ],
    [
      "IED Identity",
      "IED గుర్తింపు"
    ],
    [
      "Access Ports",
      "యాక్సెస్ పోర్టులు"
    ],
    [
      "Input Module",
      "ఇన్‌పుట్ మాడ్యూల్"
    ],
    [
      "Cheat Sheets",
      "చీట్ షీట్లు"
    ],
    [
      "Differential",
      "డిఫరెన్షియల్"
    ],
    [
      "Synchrocheck",
      "సింక్రోచెక్"
    ],
    [
      "Interruption",
      "అంతరాయం"
    ],
    [
      "Measurements",
      "కొలతలు"
    ],
    [
      "Transmission",
      "ట్రాన్స్‌మిషన్"
    ],
    [
      "IEC-104 Link",
      "IEC-104 లింక్"
    ],
    [
      "CB Pos [ST]:",
      "CB స్థానం [ST]:"
    ],
    [
      "Bus Coupler",
      "బస్ కప్లర్"
    ],
    [
      "Execute All",
      "అన్నీ అమలు చేయండి"
    ],
    [
      "Engineering",
      "ఇంజనీరింగ్"
    ],
    [
      "Transformer",
      "ట్రాన్స్‌ఫార్మర్"
    ],
    [
      "Diagnostics",
      "డయాగ్నస్టిక్స్"
    ],
    [
      "Preparation",
      "ప్రిపరేషన్"
    ],
    [
      "Description",
      "వివరణ"
    ],
    [
      "Association",
      "అసోసియేషన్"
    ],
    [
      "Certificate",
      "సర్టిఫికేట్"
    ],
    [
      "Residential",
      "నివాస (Residential)"
    ],
    [
      "WAN Routing",
      "WAN రౌటింగ్"
    ],
    [
      "Comm Health",
      "కమ్యూనికేషన్ స్థితి"
    ],
    [
      "Subnet Mask",
      "సబ్‌నెట్ మాస్క్"
    ],
    [
      "Subnet mask",
      "సబ్‌నెట్ మాస్క్"
    ],
    [
      "Phase Shift",
      "ఫేజ్ షిఫ్ట్"
    ],
    [
      "Trunk Ports",
      "ట్రంక్ పోర్టులు"
    ],
    [
      "Process Bus",
      "ప్రాసెస్ బస్"
    ],
    [
      "Termination",
      "టెర్మినేషన్"
    ],
    [
      "Maintenance",
      "మెయింటెనెన్స్"
    ],
    [
      "Explanation",
      "వివరణ"
    ],
    [
      "Supervision",
      "సూపర్‌విజన్"
    ],
    [
      "Workstation",
      "వర్క్‌స్టేషన్"
    ],
    [
      "Earth Sw Q8",
      "ఎర్త్ స్విచ్ Q8"
    ],
    [
      "Telecontrol",
      "టెలికంట్రోల్"
    ],
    [
      "Reset View",
      "వ్యూ రీసెట్ చేయండి"
    ],
    [
      "Reset view",
      "వ్యూ రీసెట్ చేయండి"
    ],
    [
      "Substation",
      "సబ్‌స్టేషన్"
    ],
    [
      "Automation",
      "ఆటోమేషన్"
    ],
    [
      "Laboratory",
      "ల్యాబొరేటరీ"
    ],
    [
      "Networking",
      "నెట్‌వర్కింగ్"
    ],
    [
      "Switchyard",
      "స్విచ్‌యార్డ్"
    ],
    [
      "Switchgear",
      "స్విచ్‌గేర్"
    ],
    [
      "Protection",
      "ప్రొటెక్షన్"
    ],
    [
      "Simulation",
      "సిమ్యులేషన్"
    ],
    [
      "Configured",
      "కాన్ఫిగర్ చేసిన"
    ],
    [
      "Diagnostic",
      "డయాగ్నస్టిక్"
    ],
    [
      "Topologies",
      "టోపాలజీలు"
    ],
    [
      "Redundancy",
      "రిడండెన్సీ"
    ],
    [
      "Interfaces",
      "ఇంటర్‌ఫేస్‌లు"
    ],
    [
      "Procedures",
      "విధానాలు"
    ],
    [
      "Subscriber",
      "సబ్‌స్క్రైబర్"
    ],
    [
      "References",
      "రిఫరెన్స్‌లు"
    ],
    [
      "Industrial",
      "ఇండస్ట్రియల్"
    ],
    [
      "Root Cause",
      "మూల కారణం"
    ],
    [
      "Media Type",
      "మీడియా రకం"
    ],
    [
      "IEC Legend",
      "IEC లెజెండ్"
    ],
    [
      "Op Counter",
      "ఆపరేషన్ కౌంటర్"
    ],
    [
      "Reactive Q",
      "రియాక్టివ్ Q"
    ],
    [
      "Apparent S",
      "అపారెంట్ S"
    ],
    [
      "Topic-wise",
      "టాపిక్ వారీగా"
    ],
    [
      "Forwarding",
      "ఫార్వార్డింగ్"
    ],
    [
      "Permissive",
      "పర్మిసివ్"
    ],
    [
      "Continuity",
      "కంటిన్యూటీ"
    ],
    [
      "Hypothesis",
      "హైపోథెసిస్ (అంచనా)"
    ],
    [
      "Line DS Q9",
      "లైన్ DS Q9"
    ],
    [
      "Northbound",
      "నార్త్‌బౌండ్"
    ],
    [
      "Event Log",
      "ఈవెంట్ లాగ్"
    ],
    [
      "Key Notes",
      "ముఖ్య నోట్స్"
    ],
    [
      "Clear All",
      "అన్నీ క్లియర్ చేయండి"
    ],
    [
      "Next Step",
      "తదుపరి దశ"
    ],
    [
      "Workspace",
      "వర్క్‌స్పేస్"
    ],
    [
      "Academies",
      "అకాడమీలు"
    ],
    [
      "Interlock",
      "ఇంటర్‌లాక్"
    ],
    [
      "Telemetry",
      "టెలిమెట్రీ"
    ],
    [
      "Simulator",
      "సిమ్యులేటర్"
    ],
    [
      "Simulated",
      "సిమ్యులేటెడ్"
    ],
    [
      "Protocols",
      "ప్రోటోకాల్స్"
    ],
    [
      "Equipment",
      "పరికరాలు"
    ],
    [
      "Interface",
      "ఇంటర్‌ఫేస్"
    ],
    [
      "Procedure",
      "విధానం"
    ],
    [
      "Scenarios",
      "సినారియోలు"
    ],
    [
      "Questions",
      "ప్రశ్నలు"
    ],
    [
      "Interview",
      "ఇంటర్వ్యూ"
    ],
    [
      "Timestamp",
      "టైమ్‌స్టాంప్"
    ],
    [
      "Frequency",
      "ఫ్రీక్వెన్సీ"
    ],
    [
      "Registers",
      "రిజిస్టర్లు"
    ],
    [
      "Publisher",
      "పబ్లిషర్"
    ],
    [
      "Historian",
      "హిస్టోరియన్"
    ],
    [
      "Apartment",
      "అపార్ట్‌మెంట్"
    ],
    [
      "Inspector",
      "ఇన్‌స్పెక్టర్"
    ],
    [
      "Downloads",
      "డౌన్‌లోడ్లు"
    ],
    [
      "Completed",
      "పూర్తయింది"
    ],
    [
      "Permitted",
      "అనుమతించబడింది"
    ],
    [
      "Connected",
      "కనెక్ట్ అయింది"
    ],
    [
      "Multicast",
      "మల్టీకాస్ట్"
    ],
    [
      "Reference",
      "రిఫరెన్స్"
    ],
    [
      "Hierarchy",
      "హైరార్కీ"
    ],
    [
      "Technical",
      "సాంకేతిక"
    ],
    [
      "Comm Loss",
      "కమ్యూనికేషన్ లాస్"
    ],
    [
      "Poll Rate",
      "పోల్ రేట్"
    ],
    [
      "Data Type",
      "డేటా రకం"
    ],
    [
      "IED Ports",
      "IED పోర్టులు"
    ],
    [
      "Hardwired",
      "హార్డ్‌వైర్డ్"
    ],
    [
      "Important",
      "ముఖ్యమైన"
    ],
    [
      "Endpoints",
      "ఎండ్‌పాయింట్లు"
    ],
    [
      "Transport",
      "ట్రాన్స్‌పోర్ట్"
    ],
    [
      "Configure",
      "కాన్ఫిగర్ చేయండి"
    ],
    [
      "Energized",
      "ఎనర్జైజ్ చేయబడింది"
    ],
    [
      "Redundant",
      "రిడండెంట్"
    ],
    [
      "Secondary",
      "సెకండరీ"
    ],
    [
      "Broadcast",
      "బ్రాడ్‌కాస్ట్"
    ],
    [
      "Mandatory",
      "తప్పనిసరి"
    ],
    [
      "Operation",
      "ఆపరేషన్"
    ],
    [
      "Switching",
      "స్విచింగ్"
    ],
    [
      "Auxiliary",
      "ఆగ్జిలరీ"
    ],
    [
      "✓ Link Up",
      "✓ లింక్ అప్ (ఆన్)"
    ],
    [
      "ANSI Code",
      "ANSI కోడ్"
    ],
    [
      "Pin → pin",
      "పిన్ → పిన్"
    ],
    [
      "Q1 Bus DS",
      "Q1 బస్ DS"
    ],
    [
      "Bus DS Q1",
      "బస్ DS Q1"
    ],
    [
      "Bay / IED",
      "బే / IED"
    ],
    [
      "Field I/O",
      "ఫీల్డ్ I/O"
    ],
    [
      "(DI Card)",
      "(DI కార్డ్)"
    ],
    [
      "Run Test",
      "పరీక్ష రన్ చేయండి"
    ],
    [
      "Zoom out",
      "జూమ్ అవుట్"
    ],
    [
      "Breakers",
      "బ్రేకర్లు"
    ],
    [
      "Isolator",
      "ఐసోలేటర్"
    ],
    [
      "Controls",
      "కంట్రోల్స్"
    ],
    [
      "Commands",
      "కమాండ్‌లు"
    ],
    [
      "Simulate",
      "సిమ్యులేట్ చేయండి"
    ],
    [
      "Protocol",
      "ప్రోటోకాల్"
    ],
    [
      "Settings",
      "సెట్టింగ్స్"
    ],
    [
      "Topology",
      "టోపాలజీ"
    ],
    [
      "Failover",
      "ఫెయిల్‌ఓవర్"
    ],
    [
      "Hardware",
      "హార్డ్‌వేర్"
    ],
    [
      "Switches",
      "స్విచ్‌లు"
    ],
    [
      "Scenario",
      "సినారియో"
    ],
    [
      "Chapters",
      "అధ్యాయాలు"
    ],
    [
      "Diagrams",
      "డయాగ్రమ్స్"
    ],
    [
      "Examples",
      "ఉదాహరణలు"
    ],
    [
      "Question",
      "ప్రశ్న"
    ],
    [
      "Learning",
      "అభ్యాసం"
    ],
    [
      "Practice",
      "ప్రాక్టీస్"
    ],
    [
      "Overview",
      "అవలోకనం"
    ],
    [
      "Register",
      "రిజిస్టర్"
    ],
    [
      "Security",
      "సెక్యూరిటీ"
    ],
    [
      "Selected",
      "ఎంచుకున్న"
    ],
    [
      "Download",
      "డౌన్‌లోడ్"
    ],
    [
      "Complete",
      "పూర్తి"
    ],
    [
      "Rejected",
      "తిరస్కరించబడింది"
    ],
    [
      "Disabled",
      "డిసేబుల్ చేయబడింది"
    ],
    [
      "Isolated",
      "ఐసోలేట్ చేయబడింది"
    ],
    [
      "Students",
      "విద్యార్థులు"
    ],
    [
      "Password",
      "పాస్‌వర్డ్"
    ],
    [
      "Progress",
      "పురోగతి"
    ],
    [
      "Sections",
      "విభాగాలు"
    ],
    [
      "Evidence",
      "ఆధారం"
    ],
    [
      "Physical",
      "భౌతిక"
    ],
    [
      "Previous",
      "మునుపటి"
    ],
    [
      "Daylight",
      "పగటి వెలుగు"
    ],
    [
      "Endpoint",
      "ఎండ్‌పాయింట్"
    ],
    [
      "Severity",
      "తీవ్రత"
    ],
    [
      "Position",
      "స్థానం (Position)"
    ],
    [
      "Critical",
      "క్రిటికల్"
    ],
    [
      "Category",
      "వర్గం"
    ],
    [
      "Expected",
      "ఆశించిన"
    ],
    [
      "Operator",
      "ఆపరేటర్"
    ],
    [
      "Mismatch",
      "మిస్‌మ్యాచ్"
    ],
    [
      "Priority",
      "ప్రాధాన్యత"
    ],
    [
      "Transfer",
      "ట్రాన్స్‌ఫర్"
    ],
    [
      "Sequence",
      "సీక్వెన్స్"
    ],
    [
      "Overload",
      "ఓవర్‌లోడ్"
    ],
    [
      "Recovery",
      "రికవరీ"
    ],
    [
      "Terminal",
      "టెర్మినల్"
    ],
    [
      "Internal",
      "అంతర్గత"
    ],
    [
      "External",
      "బాహ్య"
    ],
    [
      "Wireless",
      "వైర్‌లెస్"
    ],
    [
      "DataSet:",
      "డేటాసెట్:"
    ],
    [
      "Evaluate",
      "మూల్యాంకనం చేయండి"
    ],
    [
      "Zoom in",
      "జూమ్ ఇన్"
    ],
    [
      "Academy",
      "అకాడమీ"
    ],
    [
      "Network",
      "నెట్‌వర్క్"
    ],
    [
      "Station",
      "స్టేషన్"
    ],
    [
      "Feeders",
      "ఫీడర్లు"
    ],
    [
      "Incomer",
      "ఇన్‌కమర్"
    ],
    [
      "Breaker",
      "బ్రేకర్"
    ],
    [
      "Coupler",
      "కప్లర్"
    ],
    [
      "Control",
      "కంట్రోల్"
    ],
    [
      "Command",
      "కమాండ్"
    ],
    [
      "Devices",
      "పరికరాలు"
    ],
    [
      "Servers",
      "సర్వర్లు"
    ],
    [
      "Gateway",
      "గేట్‌వే"
    ],
    [
      "Optical",
      "ఆప్టికల్"
    ],
    [
      "Signals",
      "సిగ్నల్స్"
    ],
    [
      "Mapping",
      "మ్యాపింగ్"
    ],
    [
      "Failure",
      "ఫెయిల్యూర్"
    ],
    [
      "Testing",
      "టెస్టింగ్"
    ],
    [
      "Chapter",
      "అధ్యాయం"
    ],
    [
      "Modules",
      "మాడ్యూల్స్"
    ],
    [
      "Lessons",
      "పాఠాలు"
    ],
    [
      "Diagram",
      "డయాగ్రమ్"
    ],
    [
      "Example",
      "ఉదాహరణ"
    ],
    [
      "Summary",
      "సారాంశం"
    ],
    [
      "Details",
      "వివరాలు"
    ],
    [
      "Quality",
      "క్వాలిటీ"
    ],
    [
      "Address",
      "అడ్రస్"
    ],
    [
      "Voltage",
      "వోల్టేజ్"
    ],
    [
      "Current",
      "కరెంట్"
    ],
    [
      "Reports",
      "రిపోర్టులు"
    ],
    [
      "History",
      "చరిత్ర"
    ],
    [
      "Inspect",
      "తనిఖీ చేయండి"
    ],
    [
      "Execute",
      "అమలు చేయండి"
    ],
    [
      "Operate",
      "ఆపరేట్ చేయండి"
    ],
    [
      "Confirm",
      "నిర్ధారించండి"
    ],
    [
      "Preview",
      "ప్రివ్యూ"
    ],
    [
      "Healthy",
      "సాధారణం (Healthy)"
    ],
    [
      "Blocked",
      "బ్లాక్ చేయబడింది"
    ],
    [
      "Enabled",
      "ఎనేబుల్ చేయబడింది"
    ],
    [
      "Offline",
      "ఆఫ్‌లైన్"
    ],
    [
      "Profile",
      "ప్రొఫైల్"
    ],
    [
      "Account",
      "ఖాతా"
    ],
    [
      "Student",
      "విద్యార్థి"
    ],
    [
      "Section",
      "విభాగం"
    ],
    [
      "Actions",
      "చర్యలు"
    ],
    [
      "Objects",
      "ఆబ్జెక్టులు"
    ],
    [
      "Traffic",
      "ట్రాఫిక్"
    ],
    [
      "Digital",
      "డిజిటల్"
    ],
    [
      "Logical",
      "లాజికల్"
    ],
    [
      "Symptom",
      "లక్షణం"
    ],
    [
      "Binding",
      "బైండింగ్"
    ],
    [
      "Service",
      "సర్వీస్"
    ],
    [
      "Holding",
      "హోల్డింగ్"
    ],
    [
      "Timeout",
      "టైమ్అవుట్"
    ],
    [
      "Scaling",
      "స్కేలింగ్"
    ],
    [
      "Segment",
      "సెగ్మెంట్"
    ],
    [
      "Warning",
      "హెచ్చరిక"
    ],
    [
      "Disable",
      "డిసేబుల్ చేయండి"
    ],
    [
      "Connect",
      "కనెక్ట్ చేయండి"
    ],
    [
      "Restore",
      "పునరుద్ధరించండి"
    ],
    [
      "Capture",
      "క్యాప్చర్ చేయండి"
    ],
    [
      "Monitor",
      "పర్యవేక్షించండి"
    ],
    [
      "Trigger",
      "ట్రిగ్గర్ చేయండి"
    ],
    [
      "Primary",
      "ప్రైమరీ"
    ],
    [
      "Circuit",
      "సర్క్యూట్"
    ],
    [
      "Unicast",
      "యూనికాస్ట్"
    ],
    [
      "VLAN ID",
      "VLAN ID (ఐడి)"
    ],
    [
      "Type ID",
      "టైప్ ID"
    ],
    [
      "Derived",
      "ఉత్పన్న"
    ],
    [
      "Filters",
      "ఫిల్టర్లు"
    ],
    [
      "Feeder",
      "ఫీడర్"
    ],
    [
      "Relays",
      "రిలేలు"
    ],
    [
      "Device",
      "పరికరం"
    ],
    [
      "Server",
      "సర్వర్"
    ],
    [
      "Client",
      "క్లయింట్"
    ],
    [
      "Switch",
      "స్విచ్"
    ],
    [
      "Router",
      "రౌటర్"
    ],
    [
      "Cables",
      "కేబుల్స్"
    ],
    [
      "Copper",
      "కాపర్"
    ],
    [
      "Signal",
      "సిగ్నల్"
    ],
    [
      "Mapped",
      "మ్యాప్ చేయబడిన"
    ],
    [
      "Alarms",
      "అలారాలు"
    ],
    [
      "Events",
      "ఈవెంట్లు"
    ],
    [
      "Faults",
      "ఫాల్ట్స్"
    ],
    [
      "Module",
      "మాడ్యూల్"
    ],
    [
      "Lesson",
      "పాఠం"
    ],
    [
      "Answer",
      "సమాధానం"
    ],
    [
      "Status",
      "స్థితి"
    ],
    [
      "Values",
      "విలువలు"
    ],
    [
      "Source",
      "సోర్స్"
    ],
    [
      "Target",
      "టార్గెట్"
    ],
    [
      "Energy",
      "ఎనర్జీ"
    ],
    [
      "Packet",
      "ప్యాకెట్"
    ],
    [
      "Frames",
      "ఫ్రేమ్‌లు"
    ],
    [
      "Report",
      "రిపోర్ట్"
    ],
    [
      "Camera",
      "కెమెరా"
    ],
    [
      "Street",
      "వీధి (Street)"
    ],
    [
      "Closed",
      "క్లోజ్డ్ (Closed)"
    ],
    [
      "Select",
      "ఎంచుకోండి"
    ],
    [
      "Search",
      "వెతకండి"
    ],
    [
      "Filter",
      "ఫిల్టర్"
    ],
    [
      "Cancel",
      "రద్దు చేయండి"
    ],
    [
      "Upload",
      "అప్‌లోడ్"
    ],
    [
      "Export",
      "ఎక్స్‌పోర్ట్"
    ],
    [
      "Toggle",
      "మార్చండి (Toggle)"
    ],
    [
      "Active",
      "యాక్టివ్"
    ],
    [
      "Normal",
      "సాధారణం"
    ],
    [
      "Online",
      "ఆన్‌లైన్"
    ],
    [
      "Locked",
      "లాక్ అయింది"
    ],
    [
      "Result",
      "ఫలితం"
    ],
    [
      "Action",
      "చర్య"
    ],
    [
      "System",
      "సిస్టమ్"
    ],
    [
      "Object",
      "ఆబ్జెక్ట్"
    ],
    [
      "Resume",
      "కొనసాగించండి"
    ],
    [
      "Hidden",
      "దాచబడింది"
    ],
    [
      "Tagged",
      "ట్యాగ్ చేయబడిన"
    ],
    [
      "Errors",
      "ఎర్రర్స్"
    ],
    [
      "Spring",
      "స్ప్రింగ్"
    ],
    [
      "Actual",
      "వాస్తవ"
    ],
    [
      "Verify",
      "ధృవీకరించండి"
    ],
    [
      "Enable",
      "ఎనేబుల్ చేయండి"
    ],
    [
      "Inject",
      "ఇంజెక్ట్ చేయండి"
    ],
    [
      "Remote",
      "రిమోట్"
    ],
    [
      "Busbar",
      "బస్‌బార్"
    ],
    [
      "Subnet",
      "సబ్‌నెట్"
    ],
    [
      "Bus A:",
      "బస్ A:"
    ],
    [
      "Bus B:",
      "బస్ B:"
    ],
    [
      "Salted",
      "సాల్టెడ్"
    ],
    [
      "Finish",
      "ముగించు"
    ],
    [
      "Relay",
      "రిలే"
    ],
    [
      "Ports",
      "పోర్టులు"
    ],
    [
      "Cable",
      "కేబుల్"
    ],
    [
      "Fiber",
      "ఫైబర్"
    ],
    [
      "Alarm",
      "అలారం"
    ],
    [
      "Event",
      "ఈవెంట్"
    ],
    [
      "Fault",
      "ఫాల్ట్"
    ],
    [
      "Tests",
      "పరీక్షలు"
    ],
    [
      "State",
      "స్థితి"
    ],
    [
      "Value",
      "విలువ"
    ],
    [
      "Level",
      "స్థాయి"
    ],
    [
      "Power",
      "పవర్"
    ],
    [
      "Meter",
      "మీటర్"
    ],
    [
      "Frame",
      "ఫ్రేమ్"
    ],
    [
      "House",
      "ఇల్లు (House)"
    ],
    [
      "Close",
      "మూసివేయి (Close)"
    ],
    [
      "Reset",
      "రీసెట్"
    ],
    [
      "Clear",
      "క్లియర్"
    ],
    [
      "Print",
      "ప్రింట్"
    ],
    [
      "Users",
      "వినియోగదారులు"
    ],
    [
      "Table",
      "పట్టిక"
    ],
    [
      "Steps",
      "దశలు"
    ],
    [
      "Cause",
      "కారణం"
    ],
    [
      "Model",
      "మోడల్"
    ],
    [
      "Nodes",
      "నోడ్స్"
    ],
    [
      "Links",
      "లింక్‌లు"
    ],
    [
      "Paths",
      "మార్గాలు"
    ],
    [
      "Chain",
      "చైన్"
    ],
    [
      "Panel",
      "ప్యానెల్"
    ],
    [
      "Speed",
      "వేగం"
    ],
    [
      "Click",
      "క్లిక్ చేయండి"
    ],
    [
      "Pause",
      "పాజ్ చేయండి"
    ],
    [
      "Actor",
      "యాక్టర్ (Actor)"
    ],
    [
      "Class",
      "క్లాస్"
    ],
    [
      "Stack",
      "స్టాక్"
    ],
    [
      "Input",
      "ఇన్‌పుట్"
    ],
    [
      "Write",
      "రాయండి (Write)"
    ],
    [
      "Plane",
      "ప్లేన్"
    ],
    [
      "Media",
      "మీడియా"
    ],
    [
      "Major",
      "మేజర్"
    ],
    [
      "Check",
      "తనిఖీ చేయండి"
    ],
    [
      "Local",
      "లోకల్"
    ],
    [
      "Earth",
      "ఎర్త్"
    ],
    [
      "Clock",
      "క్లాక్"
    ],
    [
      "Match",
      "సరిపోలు"
    ],
    [
      "Field",
      "ఫీల్డ్"
    ],
    [
      "Labs",
      "ల్యాబ్‌లు"
    ],
    [
      "Port",
      "పోర్ట్"
    ],
    [
      "Trip",
      "ట్రిప్"
    ],
    [
      "Test",
      "పరీక్ష (Test)"
    ],
    [
      "Time",
      "సమయం"
    ],
    [
      "Name",
      "పేరు"
    ],
    [
      "Type",
      "రకం"
    ],
    [
      "Role",
      "పాత్ర"
    ],
    [
      "Mode",
      "మోడ్"
    ],
    [
      "Load",
      "లోడ్"
    ],
    [
      "Road",
      "రోడ్డు"
    ],
    [
      "Open",
      "తెరవండి (Open)"
    ],
    [
      "Save",
      "సేవ్ చేయండి"
    ],
    [
      "View",
      "వ్యూ"
    ],
    [
      "Live",
      "లైవ్"
    ],
    [
      "User",
      "వినియోగదారు"
    ],
    [
      "Step",
      "దశ"
    ],
    [
      "Node",
      "నోడ్"
    ],
    [
      "Link",
      "లింక్"
    ],
    [
      "Path",
      "మార్గం"
    ],
    [
      "Ring",
      "రింగ్"
    ],
    [
      "Rack",
      "ర్యాక్"
    ],
    [
      "Last",
      "చివరి"
    ],
    [
      "Full",
      "పూర్తి"
    ],
    [
      "Dual",
      "డ్యూయల్"
    ],
    [
      "Dusk",
      "సాయంత్రం (Dusk)"
    ],
    [
      "Code",
      "కోడ్"
    ],
    [
      "Line",
      "లైన్"
    ],
    [
      "Rate",
      "రేటు"
    ],
    [
      "Loss",
      "నష్టం (Loss)"
    ],
    [
      "Info",
      "సమాచారం"
    ],
    [
      "Case",
      "కేసు"
    ],
    [
      "Coil",
      "కాయిల్"
    ],
    [
      "Bay:",
      "బే:"
    ],
    [
      "Auth",
      "ధృవీకరణ"
    ],
    [
      "Card",
      "కార్డ్"
    ],
    [
      "Temp",
      "ఉష్ణోగ్రత"
    ],
    [
      "Lab",
      "ల్యాబ్"
    ],
    [
      "All",
      "అన్నీ"
    ],
    [
      "New",
      "కొత్త"
    ],
    [
      "Run",
      "రన్ చేయండి"
    ],
    [
      "Gas",
      "గ్యాస్"
    ],
    [
      "Tap",
      "ట్యాప్"
    ],
    [
      "Q&A",
      "ప్రశ్నోత్తరాలు (Q&A)"
    ],
    [
      "Bay",
      "బే (Bay)"
    ],
    [
      "Bus",
      "బస్ (Bus)"
    ],
    [
      "Tag",
      "ట్యాగ్"
    ]
  ],
  "TA": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "ஆதரிக்கப்படும் அனைத்து மொழிகளுக்கும் 100% ஆஃப்லைன் மொழிபெயர்ப்பு உள்ளது. தொழில்நுட்பச் சொற்கள் மாற்றப்படாது."
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "ஊடாடும் IPv4 CIDR / VLSM சப்நெட் கால்குலேட்டர்"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Modbus TCP கிளையன்ட் போலிங் கட்டமைப்பு"
    ],
    [
      "Backplane Module & Slot Configuration",
      "பேக்பிளேன் தொகுதி & ஸ்லாட் கட்டமைப்பு"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — GOOSE மல்டிகாஸ்ட் (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "ஊடாடும் பாக்கெட் ஓட்ட அனிமேட்டர்"
    ],
    [
      "Interactive Single-Line Diagram",
      "ஊடாடும் ஒற்றை வரி வரைபடம் (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "RCC க்கு வடக்கு நோக்கிய தொலைக்கட்டுப்பாடு"
    ],
    [
      "No IEDs match these filters.",
      "இந்த வடிகட்டிகளுக்குப் பொருந்தும் IEDகள் எதுவும் இல்லை."
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "எதிர்பார்க்கப்படும் ஏற்பு வரம்புகள்"
    ],
    [
      "Gateway translates MMS → IOA",
      "கேட்வே MMS → IOA மாற்றுகிறது"
    ],
    [
      "Self-Supervision & Watchdog",
      "சுய-கண்காணிப்பு & வாட்ச்டாக்"
    ],
    [
      "Standard Ports & EtherTypes",
      "நிலையான போர்ட்கள் & EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "தொழிற்சாலை ஏற்பு சோதனை (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "தொழில்துறை ஈதர்நெட் சுவிட்ச்"
    ],
    [
      "Fault Injection Scenarios",
      "பிழை செலுத்துதல் காட்சிகள்"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 நேர்காணல் • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "நிலை குறியீடு: நன்று (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "சோதனையைத் தொடங்கி SOE பதிவு செய்"
    ],
    [
      "Site Acceptance Testing",
      "தள ஏற்பு சோதனை (SAT)"
    ],
    [
      "State Change Simulation",
      "நிலை மாற்ற உருவகப்படுத்தல்"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (TotW / PPV / A அளவீடு):"
    ],
    [
      "Key Takeaways & Checks",
      "முக்கிய குறிப்புகள் & சரிபார்ப்புகள்"
    ],
    [
      "Electrical Connections",
      "மின் இணைப்புகள்"
    ],
    [
      "out-of-band management",
      "அவுட்-ஆஃப்-பேண்ட் மேலாண்மை"
    ],
    [
      "Derived SCADA 52a/52b:",
      "பெறப்பட்ட SCADA 52a/52b:"
    ],
    [
      "General Interrogation",
      "பொது வினவல் (GI)"
    ],
    [
      "Highlight connections",
      "இணைப்புகளை முன்னிலைப்படுத்து"
    ],
    [
      "Front South Elevation",
      "முன் தெற்கு உயரக் காட்சி"
    ],
    [
      "Parameter Description",
      "அளவுரு விளக்கம்"
    ],
    [
      "Checkpoints / Remarks",
      "சரிபார்ப்புகள் / குறிப்புகள்"
    ],
    [
      "Gateway IEC 61850 Map",
      "கேட்வே IEC 61850 மேப்"
    ],
    [
      "Result & Diagnostics",
      "முடிவு & கண்டறிதல்"
    ],
    [
      "Terms and Conditions",
      "விதிமுறைகள் மற்றும் நிபந்தனைகள்"
    ],
    [
      "Single-Line Diagram",
      "ஒற்றை வரி வரைபடம் (SLD)"
    ],
    [
      "Communication Block",
      "தொடர்பு தடை"
    ],
    [
      "Root Cause Analysis",
      "மூல காரண பகுப்பாய்வு"
    ],
    [
      "Distance Protection",
      "தூரப் பாதுகாப்பு"
    ],
    [
      "Industrial Ethernet",
      "தொழில்துறை ஈதர்நெட்"
    ],
    [
      "Communication Flow",
      "தொடர்பு ஓட்டம்"
    ],
    [
      "Preferred Language",
      "விருப்ப மொழி"
    ],
    [
      "PBKDF2 Salted Auth",
      "PBKDF2 சால்டட் அங்கீகாரம்"
    ],
    [
      "Signal Description",
      "சிக்னல் விளக்கம்"
    ],
    [
      "Affected Endpoints",
      "பாதிக்கப்பட்ட முனைகள்"
    ],
    [
      "OPERATIONS CONSOLE",
      "செயல்பாட்டுக் கன்சோல்"
    ],
    [
      "Stop highlighting",
      "முன்னிலைப்படுத்துவதை நிறுத்து"
    ],
    [
      "Verified Sessions",
      "சரிபார்க்கப்பட்ட அமர்வுகள்"
    ],
    [
      "serial connection",
      "சீரியல் இணைப்பு"
    ],
    [
      "Published DataSet",
      "வெளியிடப்பட்ட DataSet"
    ],
    [
      "Southbound Source",
      "தெற்கு நோக்கிய மூலம்"
    ],
    [
      "Loading / Cooling",
      "சுமை / குளிர்விப்பு"
    ],
    [
      "Finish & Evaluate",
      "முடித்து மதிப்பிடு"
    ],
    [
      "IEC 61850 Dataset",
      "IEC 61850 தரவுத்தொகுப்பு"
    ],
    [
      "Protection Relay",
      "பாதுகாப்பு ரிலே"
    ],
    [
      "Operator Station",
      "இயக்குநர் நிலையம்"
    ],
    [
      "Topology Summary",
      "இடவியல் சுருக்கம்"
    ],
    [
      "Rollover Console",
      "ரோல்ஓவர் கன்சோல்"
    ],
    [
      "Firewall Cluster",
      "ஃபயர்வால் கிளஸ்டர்"
    ],
    [
      "Association Loss",
      "இணைப்பு இழப்பு"
    ],
    [
      "Ethertype Suffix",
      "Ethertype பின்னொட்டு"
    ],
    [
      "Return to Normal",
      "இயல்பு நிலைக்குத் திரும்பு"
    ],
    [
      "Circuit Breaker",
      "சர்க்யூட் பிரேக்கர்"
    ],
    [
      "Protection Trip",
      "பாதுகாப்பு டிரிப்"
    ],
    [
      "Addressing Plan",
      "முகவரித் திட்டம்"
    ],
    [
      "Live Monitoring",
      "நேரடி கண்காணிப்பு"
    ],
    [
      "Troubleshooting",
      "பழுதுபார்ப்பு"
    ],
    [
      "Display options",
      "காட்சி விருப்பங்கள்"
    ],
    [
      "Synch-Check Ref",
      "ஒத்திசைவு-சரிபார்ப்பு குறிப்பு"
    ],
    [
      "IED Connections",
      "IED இணைப்புகள்"
    ],
    [
      "Data Attributes",
      "தரவு பண்புகள்"
    ],
    [
      "IED INFORMATION",
      "IED தகவல்"
    ],
    [
      "Sequence Number",
      "வரிசை எண்"
    ],
    [
      "Failed Segments",
      "தோல்வியடைந்த பிரிவுகள்"
    ],
    [
      "Manual Transfer",
      "கைமுறை மாற்றம்"
    ],
    [
      "Fast Protection",
      "வேகமான பாதுகாப்பு"
    ],
    [
      "Timed Evaluator",
      "நேர மதிப்பீட்டாளர்"
    ],
    [
      "Synchronization",
      "ஒத்திசைவு"
    ],
    [
      "Firmware / SCL:",
      "ஃபர்ம்வேர் / SCL:"
    ],
    [
      "MMS Association",
      "MMS இணைப்பு"
    ],
    [
      "SCADA Tag / HMI",
      "SCADA குறிச்சொல் / HMI"
    ],
    [
      "Retransmission",
      "மறு ஒளிபரப்பு"
    ],
    [
      "Privacy Policy",
      "தனியுரிமைக் கொள்கை"
    ],
    [
      "Distance-Aware",
      "தூர-உணர்வு"
    ],
    [
      "LAN Identifier",
      "LAN அடையாளங்காட்டி"
    ],
    [
      "Reachable IEDs",
      "அடையக்கூடிய IEDகள்"
    ],
    [
      "Busbar Section",
      "பஸ்பார் பிரிவு"
    ],
    [
      "Specialization",
      "சிறப்புத் துறை"
    ],
    [
      "Firmware / SCL",
      "ஃபர்ம்வேர் / SCL"
    ],
    [
      "OTI / WTI Temp",
      "OTI / WTI வெப்பநிலை"
    ],
    [
      "IEC 61850 Ref:",
      "IEC 61850 குறிப்பு:"
    ],
    [
      "Line Isolator",
      "லைன் ஐசோலேட்டர்"
    ],
    [
      "Disconnectors",
      "பிரிப்பான்கள்"
    ],
    [
      "Communication",
      "தொடர்பு"
    ],
    [
      "Configuration",
      "கட்டமைப்பு"
    ],
    [
      "Commissioning",
      "ஆணையிடுதல்"
    ],
    [
      "Key Takeaways",
      "முக்கிய குறிப்புகள்"
    ],
    [
      "Derived SCADA",
      "பெறப்பட்ட SCADA"
    ],
    [
      "Wildcard Mask",
      "வைல்ட்கார்ட் மாஸ்க்"
    ],
    [
      "Quick Actions",
      "விரைவுச் செயல்கள்"
    ],
    [
      "Auto-Recloser",
      "தானியங்கி மீள்மூடி"
    ],
    [
      "Function Code",
      "செயல்பாட்டுக் குறியீடு"
    ],
    [
      "Allowed VLANs",
      "அனுமதிக்கப்பட்ட VLANகள்"
    ],
    [
      "Bus Section A",
      "பஸ் பிரிவு A"
    ],
    [
      "Bus Section B",
      "பஸ் பிரிவு B"
    ],
    [
      "Preconditions",
      "முன்நிபந்தனைகள்"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (மாற்றம்)"
    ],
    [
      "52 CB (Dbpos)",
      "52 CB (Dbpos நிலை)"
    ],
    [
      "Earth Switch",
      "எர்த் சுவிட்ச்"
    ],
    [
      "Bus Isolator",
      "பஸ் ஐசோலேட்டர்"
    ],
    [
      "Bus Transfer",
      "பஸ் மாற்றம்"
    ],
    [
      "Transformers",
      "மின்மாற்றிகள்"
    ],
    [
      "Disconnector",
      "பிரிப்பான்"
    ],
    [
      "Interlocking",
      "இன்டர்லாக்கிங்"
    ],
    [
      "Architecture",
      "கட்டமைப்பு"
    ],
    [
      "Distribution",
      "விநியோகம்"
    ],
    [
      "Disconnected",
      "துண்டிக்கப்பட்டது"
    ],
    [
      "Night Floods",
      "இரவு வெள்ள விளக்குகள்"
    ],
    [
      "Broadcast IP",
      "ஒளிபரப்பு IP"
    ],
    [
      "Usable Range",
      "பயன்படுத்தக்கூடிய வரம்பு"
    ],
    [
      "Usable Hosts",
      "பயன்படுத்தக்கூடிய ஹோஸ்ட்கள்"
    ],
    [
      "IED Identity",
      "IED அடையாளம்"
    ],
    [
      "Access Ports",
      "அணுகல் போர்ட்கள்"
    ],
    [
      "Input Module",
      "உள்ளீட்டுத் தொகுதி"
    ],
    [
      "Cheat Sheets",
      "குறிப்புத் தாள்கள்"
    ],
    [
      "Differential",
      "வேறுபாட்டு (Differential)"
    ],
    [
      "Synchrocheck",
      "ஒத்திசைவு சரிபார்ப்பு"
    ],
    [
      "Interruption",
      "தடை"
    ],
    [
      "Measurements",
      "அளவீடுகள்"
    ],
    [
      "Transmission",
      "பரிமாற்றம்"
    ],
    [
      "IEC-104 Link",
      "IEC-104 இணைப்பு"
    ],
    [
      "CB Pos [ST]:",
      "CB நிலை [ST]:"
    ],
    [
      "Bus Coupler",
      "பஸ் கப்ளர்"
    ],
    [
      "Execute All",
      "அனைத்தையும் இயக்கு"
    ],
    [
      "Engineering",
      "பொறியியல்"
    ],
    [
      "Transformer",
      "மின்மாற்றி"
    ],
    [
      "Diagnostics",
      "கண்டறிதல்"
    ],
    [
      "Preparation",
      "தயாரிப்பு"
    ],
    [
      "Description",
      "விளக்கம்"
    ],
    [
      "Association",
      "இணைப்பு"
    ],
    [
      "Certificate",
      "சான்றிதழ்"
    ],
    [
      "Residential",
      "குடியிருப்பு"
    ],
    [
      "WAN Routing",
      "WAN திசைவியல்"
    ],
    [
      "Comm Health",
      "தொடர்பு நிலை"
    ],
    [
      "Subnet Mask",
      "சப்நெட் மாஸ்க்"
    ],
    [
      "Subnet mask",
      "சப்நெட் மாஸ்க்"
    ],
    [
      "Phase Shift",
      "கட்ட நகர்வு"
    ],
    [
      "Trunk Ports",
      "டிரங்க் போர்ட்கள்"
    ],
    [
      "Process Bus",
      "செயல்முறை பஸ்"
    ],
    [
      "Termination",
      "முடிவு"
    ],
    [
      "Maintenance",
      "பராமரிப்பு"
    ],
    [
      "Explanation",
      "விளக்கம்"
    ],
    [
      "Supervision",
      "கண்காணிப்பு"
    ],
    [
      "Workstation",
      "பணிநிலையம்"
    ],
    [
      "Earth Sw Q8",
      "எர்த் சுவிட்ச் Q8"
    ],
    [
      "Telecontrol",
      "தொலைக்கட்டுப்பாடு"
    ],
    [
      "Reset View",
      "காட்சியை மீட்டமை"
    ],
    [
      "Reset view",
      "காட்சியை மீட்டமை"
    ],
    [
      "Substation",
      "துணை மின் நிலையம்"
    ],
    [
      "Automation",
      "தன்னியக்கம்"
    ],
    [
      "Laboratory",
      "ஆய்வகம்"
    ],
    [
      "Networking",
      "நெட்வொர்க்கிங்"
    ],
    [
      "Switchyard",
      "சுவிட்ச்யார்ட்"
    ],
    [
      "Switchgear",
      "சுவிட்ச்கியர்"
    ],
    [
      "Protection",
      "பாதுகாப்பு"
    ],
    [
      "Simulation",
      "உருவகப்படுத்தல்"
    ],
    [
      "Configured",
      "கட்டமைக்கப்பட்ட"
    ],
    [
      "Diagnostic",
      "கண்டறியும்"
    ],
    [
      "Topologies",
      "இடவியல்கள்"
    ],
    [
      "Redundancy",
      "மிகைமை (Redundancy)"
    ],
    [
      "Interfaces",
      "இடைமுகங்கள்"
    ],
    [
      "Procedures",
      "செயல்முறைகள்"
    ],
    [
      "Subscriber",
      "சந்தாதாரர்"
    ],
    [
      "References",
      "குறிப்புகள்"
    ],
    [
      "Industrial",
      "தொழில்துறை"
    ],
    [
      "Root Cause",
      "மூல காரணம்"
    ],
    [
      "Media Type",
      "ஊடக வகை"
    ],
    [
      "IEC Legend",
      "IEC குறியீட்டு விளக்கம்"
    ],
    [
      "Op Counter",
      "செயல்பாட்டு எண்ணிக்கை"
    ],
    [
      "Reactive Q",
      "ரியாக்டிவ் Q"
    ],
    [
      "Apparent S",
      "தோற்ற சக்தி S"
    ],
    [
      "Topic-wise",
      "தலைப்பு வாரியாக"
    ],
    [
      "Forwarding",
      "முன்னனுப்புதல்"
    ],
    [
      "Permissive",
      "அனுமதிக்கும்"
    ],
    [
      "Continuity",
      "தொடர்ச்சி"
    ],
    [
      "Hypothesis",
      "கருதுகோள்"
    ],
    [
      "Line DS Q9",
      "லைன் DS Q9"
    ],
    [
      "Northbound",
      "வடக்கு நோக்கிய"
    ],
    [
      "Event Log",
      "நிகழ்வுப் பதிவு"
    ],
    [
      "Key Notes",
      "முக்கிய குறிப்புகள்"
    ],
    [
      "Clear All",
      "அனைத்தையும் அழி"
    ],
    [
      "Next Step",
      "அடுத்த படி"
    ],
    [
      "Workspace",
      "பணியிடம்"
    ],
    [
      "Academies",
      "அகாடமிகள்"
    ],
    [
      "Interlock",
      "இன்டர்லாக்"
    ],
    [
      "Telemetry",
      "டெலிமெட்ரி"
    ],
    [
      "Simulator",
      "உருவகப்படுத்தி"
    ],
    [
      "Simulated",
      "உருவகப்படுத்தப்பட்ட"
    ],
    [
      "Protocols",
      "நெறிமுறைகள்"
    ],
    [
      "Equipment",
      "உபகரணங்கள்"
    ],
    [
      "Interface",
      "இடைமுகம்"
    ],
    [
      "Procedure",
      "செயல்முறை"
    ],
    [
      "Scenarios",
      "காட்சிகள்"
    ],
    [
      "Questions",
      "கேள்விகள்"
    ],
    [
      "Interview",
      "நேர்காணல்"
    ],
    [
      "Timestamp",
      "நேர முத்திரை"
    ],
    [
      "Frequency",
      "அதிர்வெண்"
    ],
    [
      "Registers",
      "பதிவேடுகள்"
    ],
    [
      "Publisher",
      "வெளியீட்டாளர்"
    ],
    [
      "Historian",
      "ஹிஸ்டோரியன்"
    ],
    [
      "Apartment",
      "அடுக்குமாடி"
    ],
    [
      "Inspector",
      "ஆய்வாளர்"
    ],
    [
      "Downloads",
      "பதிவிறக்கங்கள்"
    ],
    [
      "Completed",
      "முடிந்தது"
    ],
    [
      "Permitted",
      "அனுமதிக்கப்பட்டது"
    ],
    [
      "Connected",
      "இணைக்கப்பட்டது"
    ],
    [
      "Multicast",
      "மல்டிகாஸ்ட்"
    ],
    [
      "Reference",
      "குறிப்பு"
    ],
    [
      "Hierarchy",
      "படிநிலை"
    ],
    [
      "Technical",
      "தொழில்நுட்ப"
    ],
    [
      "Comm Loss",
      "தொடர்பு இழப்பு"
    ],
    [
      "Poll Rate",
      "போலிங் விகிதம்"
    ],
    [
      "Data Type",
      "தரவு வகை"
    ],
    [
      "IED Ports",
      "IED போர்ட்கள்"
    ],
    [
      "Hardwired",
      "ஹார்டுவயர்ட்"
    ],
    [
      "Important",
      "முக்கியமான"
    ],
    [
      "Endpoints",
      "முனைகள் (Endpoints)"
    ],
    [
      "Transport",
      "போக்குவரத்து"
    ],
    [
      "Configure",
      "கட்டமை"
    ],
    [
      "Energized",
      "மின்னேற்றப்பட்டது"
    ],
    [
      "Redundant",
      "மிகைமை"
    ],
    [
      "Secondary",
      "இரண்டாம் நிலை"
    ],
    [
      "Broadcast",
      "ஒளிபரப்பு"
    ],
    [
      "Mandatory",
      "கட்டாய"
    ],
    [
      "Operation",
      "செயல்பாடு"
    ],
    [
      "Switching",
      "ஸ்விட்சிங்"
    ],
    [
      "Auxiliary",
      "துணை"
    ],
    [
      "✓ Link Up",
      "✓ இணைப்பு உள்ளது"
    ],
    [
      "ANSI Code",
      "ANSI குறியீடு"
    ],
    [
      "Pin → pin",
      "பின் → பின்"
    ],
    [
      "Q1 Bus DS",
      "Q1 பஸ் DS"
    ],
    [
      "Bus DS Q1",
      "பஸ் DS Q1"
    ],
    [
      "Bay / IED",
      "பே / IED"
    ],
    [
      "Field I/O",
      "கள I/O"
    ],
    [
      "(DI Card)",
      "(DI அட்டை)"
    ],
    [
      "Run Test",
      "சோதனையை இயக்கு"
    ],
    [
      "Zoom out",
      "சிறிதாக்கு"
    ],
    [
      "Breakers",
      "பிரேக்கர்கள்"
    ],
    [
      "Isolator",
      "ஐசோலேட்டர்"
    ],
    [
      "Controls",
      "கட்டுப்பாடுகள்"
    ],
    [
      "Commands",
      "கட்டளைகள்"
    ],
    [
      "Simulate",
      "உருவகப்படுத்து"
    ],
    [
      "Protocol",
      "நெறிமுறை"
    ],
    [
      "Settings",
      "அமைப்புகள்"
    ],
    [
      "Topology",
      "இடவியல்"
    ],
    [
      "Failover",
      "ஃபெயில்ஓவர்"
    ],
    [
      "Hardware",
      "வன்பொருள்"
    ],
    [
      "Switches",
      "சுவிட்சுகள்"
    ],
    [
      "Scenario",
      "காட்சி"
    ],
    [
      "Chapters",
      "அத்தியாயங்கள்"
    ],
    [
      "Diagrams",
      "வரைபடங்கள்"
    ],
    [
      "Examples",
      "எடுத்துக்காட்டுகள்"
    ],
    [
      "Question",
      "கேள்வி"
    ],
    [
      "Learning",
      "கற்றல்"
    ],
    [
      "Practice",
      "பயிற்சி"
    ],
    [
      "Overview",
      "கண்ணோட்டம்"
    ],
    [
      "Register",
      "பதிவேடு"
    ],
    [
      "Security",
      "பாதுகாப்பு"
    ],
    [
      "Selected",
      "தேர்ந்தெடுக்கப்பட்டது"
    ],
    [
      "Download",
      "பதிவிறக்கு"
    ],
    [
      "Complete",
      "முழுமையான"
    ],
    [
      "Rejected",
      "நிராகரிக்கப்பட்டது"
    ],
    [
      "Disabled",
      "முடக்கப்பட்டது"
    ],
    [
      "Isolated",
      "தனிமைப்படுத்தப்பட்டது"
    ],
    [
      "Students",
      "மாணவர்கள்"
    ],
    [
      "Password",
      "கடவுச்சொல்"
    ],
    [
      "Progress",
      "முன்னேற்றம்"
    ],
    [
      "Sections",
      "பிரிவுகள்"
    ],
    [
      "Evidence",
      "ஆதாரம்"
    ],
    [
      "Physical",
      "இயற்பியல்"
    ],
    [
      "Previous",
      "முந்தைய"
    ],
    [
      "Daylight",
      "பகல் ஒளி"
    ],
    [
      "Endpoint",
      "முனை (Endpoint)"
    ],
    [
      "Severity",
      "தீவிரம்"
    ],
    [
      "Position",
      "நிலை"
    ],
    [
      "Critical",
      "மிக முக்கியமான"
    ],
    [
      "Category",
      "வகை"
    ],
    [
      "Expected",
      "எதிர்பார்க்கப்படும்"
    ],
    [
      "Operator",
      "இயக்குநர்"
    ],
    [
      "Mismatch",
      "பொருத்தமின்மை"
    ],
    [
      "Priority",
      "முன்னுரிமை"
    ],
    [
      "Transfer",
      "மாற்றம்"
    ],
    [
      "Sequence",
      "வரிசை"
    ],
    [
      "Overload",
      "அதிக சுமை"
    ],
    [
      "Recovery",
      "மீட்பு"
    ],
    [
      "Terminal",
      "முனையம்"
    ],
    [
      "Internal",
      "உள்"
    ],
    [
      "External",
      "வெளி"
    ],
    [
      "Wireless",
      "வயர்லெஸ்"
    ],
    [
      "DataSet:",
      "தரவுத்தொகுப்பு:"
    ],
    [
      "Evaluate",
      "மதிப்பிடு"
    ],
    [
      "Zoom in",
      "பெரிதாக்கு"
    ],
    [
      "Academy",
      "அகாடமி"
    ],
    [
      "Network",
      "பிணையம்"
    ],
    [
      "Station",
      "நிலையம்"
    ],
    [
      "Feeders",
      "ஃபீடர்கள்"
    ],
    [
      "Incomer",
      "இன்கமர்"
    ],
    [
      "Breaker",
      "பிரேக்கர்"
    ],
    [
      "Coupler",
      "கப்ளர்"
    ],
    [
      "Control",
      "கட்டுப்பாடு"
    ],
    [
      "Command",
      "கட்டளை"
    ],
    [
      "Devices",
      "சாதனங்கள்"
    ],
    [
      "Servers",
      "சேவையகங்கள்"
    ],
    [
      "Gateway",
      "கேட்வே"
    ],
    [
      "Optical",
      "ஆப்டிகல்"
    ],
    [
      "Signals",
      "சிக்னல்கள்"
    ],
    [
      "Mapping",
      "மேப்பிங்"
    ],
    [
      "Failure",
      "தோல்வி"
    ],
    [
      "Testing",
      "சோதனை"
    ],
    [
      "Chapter",
      "அத்தியாயம்"
    ],
    [
      "Modules",
      "தொகுதிகள்"
    ],
    [
      "Lessons",
      "பாடங்கள்"
    ],
    [
      "Diagram",
      "வரைபடம்"
    ],
    [
      "Example",
      "எடுத்துக்காட்டு"
    ],
    [
      "Summary",
      "சுருக்கம்"
    ],
    [
      "Details",
      "விவரங்கள்"
    ],
    [
      "Quality",
      "தரம்"
    ],
    [
      "Address",
      "முகவரி"
    ],
    [
      "Voltage",
      "மின்னழுத்தம்"
    ],
    [
      "Current",
      "மின்னோட்டம்"
    ],
    [
      "Reports",
      "அறிக்கைகள்"
    ],
    [
      "History",
      "வரலாறு"
    ],
    [
      "Inspect",
      "ஆய்வு செய்"
    ],
    [
      "Execute",
      "இயக்கு"
    ],
    [
      "Operate",
      "இயக்கு"
    ],
    [
      "Confirm",
      "உறுதிப்படுத்து"
    ],
    [
      "Preview",
      "முன்னோட்டம்"
    ],
    [
      "Healthy",
      "இயல்பானது"
    ],
    [
      "Blocked",
      "தடுக்கப்பட்டது"
    ],
    [
      "Enabled",
      "இயக்கப்பட்டது"
    ],
    [
      "Offline",
      "ஆஃப்லைன்"
    ],
    [
      "Profile",
      "சுயவிவரம்"
    ],
    [
      "Account",
      "கணக்கு"
    ],
    [
      "Student",
      "மாணவர்"
    ],
    [
      "Section",
      "பிரிவு"
    ],
    [
      "Actions",
      "செயல்கள்"
    ],
    [
      "Objects",
      "பொருள்கள்"
    ],
    [
      "Traffic",
      "போக்குவரத்து"
    ],
    [
      "Digital",
      "டிஜிட்டல்"
    ],
    [
      "Logical",
      "தர்க்கரீதியான"
    ],
    [
      "Symptom",
      "அறிகுறி"
    ],
    [
      "Binding",
      "பிணைப்பு"
    ],
    [
      "Service",
      "சேவை"
    ],
    [
      "Holding",
      "ஹோல்டிங்"
    ],
    [
      "Timeout",
      "நேர முடிவு"
    ],
    [
      "Scaling",
      "அளவிடுதல்"
    ],
    [
      "Segment",
      "பிரிவு"
    ],
    [
      "Warning",
      "எச்சரிக்கை"
    ],
    [
      "Disable",
      "முடக்கு"
    ],
    [
      "Connect",
      "இணை"
    ],
    [
      "Restore",
      "மீட்டமை"
    ],
    [
      "Capture",
      "பிடி (Capture)"
    ],
    [
      "Monitor",
      "கண்காணி"
    ],
    [
      "Trigger",
      "தூண்டு"
    ],
    [
      "Primary",
      "முதன்மை"
    ],
    [
      "Circuit",
      "சுற்று"
    ],
    [
      "Unicast",
      "யூனிகாஸ்ட்"
    ],
    [
      "VLAN ID",
      "VLAN ID (எண்)"
    ],
    [
      "Type ID",
      "வகை ID"
    ],
    [
      "Derived",
      "பெறப்பட்ட"
    ],
    [
      "Filters",
      "வடிகட்டிகள்"
    ],
    [
      "Feeder",
      "ஃபீடர்"
    ],
    [
      "Relays",
      "ரிலேக்கள்"
    ],
    [
      "Device",
      "சாதனம்"
    ],
    [
      "Server",
      "சேவையகம்"
    ],
    [
      "Client",
      "கிளையன்ட்"
    ],
    [
      "Switch",
      "சுவிட்ச்"
    ],
    [
      "Router",
      "திசைவி (Router)"
    ],
    [
      "Cables",
      "கேபிள்கள்"
    ],
    [
      "Copper",
      "செம்பு"
    ],
    [
      "Signal",
      "சிக்னல்"
    ],
    [
      "Mapped",
      "மேப் செய்யப்பட்ட"
    ],
    [
      "Alarms",
      "அலாரங்கள்"
    ],
    [
      "Events",
      "நிகழ்வுகள்"
    ],
    [
      "Faults",
      "பிழைகள்"
    ],
    [
      "Module",
      "தொகுதி"
    ],
    [
      "Lesson",
      "பாடம்"
    ],
    [
      "Answer",
      "பதில்"
    ],
    [
      "Status",
      "நிலை"
    ],
    [
      "Values",
      "மதிப்புகள்"
    ],
    [
      "Source",
      "மூலம்"
    ],
    [
      "Target",
      "இலக்கு"
    ],
    [
      "Energy",
      "ஆற்றல்"
    ],
    [
      "Packet",
      "பாக்கெட்"
    ],
    [
      "Frames",
      "பிரேம்கள்"
    ],
    [
      "Report",
      "அறிக்கை"
    ],
    [
      "Camera",
      "கேமரா"
    ],
    [
      "Street",
      "தெரு"
    ],
    [
      "Closed",
      "மூடப்பட்டது"
    ],
    [
      "Select",
      "தேர்ந்தெடு"
    ],
    [
      "Search",
      "தேடு"
    ],
    [
      "Filter",
      "வடிகட்டி"
    ],
    [
      "Cancel",
      "ரத்து செய்"
    ],
    [
      "Upload",
      "பதிவேற்று"
    ],
    [
      "Export",
      "ஏற்றுமதி"
    ],
    [
      "Toggle",
      "மாற்று"
    ],
    [
      "Active",
      "செயலில்"
    ],
    [
      "Normal",
      "இயல்பான"
    ],
    [
      "Online",
      "ஆன்லைன்"
    ],
    [
      "Locked",
      "பூட்டப்பட்டது"
    ],
    [
      "Result",
      "முடிவு"
    ],
    [
      "Action",
      "செயல்"
    ],
    [
      "System",
      "கணினி"
    ],
    [
      "Object",
      "பொருள்"
    ],
    [
      "Resume",
      "தொடர்"
    ],
    [
      "Hidden",
      "மறைக்கப்பட்டது"
    ],
    [
      "Tagged",
      "குறிச்சொல் இடப்பட்ட"
    ],
    [
      "Errors",
      "பிழைகள்"
    ],
    [
      "Spring",
      "ஸ்பிரிங்"
    ],
    [
      "Actual",
      "உண்மையான"
    ],
    [
      "Verify",
      "சரிபார்"
    ],
    [
      "Enable",
      "இயக்கு"
    ],
    [
      "Inject",
      "செலுத்து"
    ],
    [
      "Remote",
      "தொலைநிலை (Remote)"
    ],
    [
      "Busbar",
      "பஸ்பார்"
    ],
    [
      "Subnet",
      "சப்நெட்"
    ],
    [
      "Bus A:",
      "பஸ் A:"
    ],
    [
      "Bus B:",
      "பஸ் B:"
    ],
    [
      "Salted",
      "சால்டட்"
    ],
    [
      "Finish",
      "முடி"
    ],
    [
      "Relay",
      "ரிலே"
    ],
    [
      "Ports",
      "போர்ட்கள்"
    ],
    [
      "Cable",
      "கேபிள்"
    ],
    [
      "Fiber",
      "ஃபைபர்"
    ],
    [
      "Alarm",
      "அலாரம்"
    ],
    [
      "Event",
      "நிகழ்வு"
    ],
    [
      "Fault",
      "பிழை"
    ],
    [
      "Tests",
      "சோதனைகள்"
    ],
    [
      "State",
      "நிலை"
    ],
    [
      "Value",
      "மதிப்பு"
    ],
    [
      "Level",
      "நிலை"
    ],
    [
      "Power",
      "மின்சாரம்"
    ],
    [
      "Meter",
      "மீட்டர்"
    ],
    [
      "Frame",
      "பிரேம்"
    ],
    [
      "House",
      "வீடு"
    ],
    [
      "Close",
      "மூடு (Close)"
    ],
    [
      "Reset",
      "மீட்டமை"
    ],
    [
      "Clear",
      "அழி"
    ],
    [
      "Print",
      "அச்சிடு"
    ],
    [
      "Users",
      "பயனர்கள்"
    ],
    [
      "Table",
      "அட்டவணை"
    ],
    [
      "Steps",
      "படிகள்"
    ],
    [
      "Cause",
      "காரணம்"
    ],
    [
      "Model",
      "மாதிரி"
    ],
    [
      "Nodes",
      "முனைகள்"
    ],
    [
      "Links",
      "இணைப்புகள்"
    ],
    [
      "Paths",
      "பாதைகள்"
    ],
    [
      "Chain",
      "சங்கிலி"
    ],
    [
      "Panel",
      "பேனல்"
    ],
    [
      "Speed",
      "வேகம்"
    ],
    [
      "Click",
      "கிளிக் செய்"
    ],
    [
      "Pause",
      "இடைநிறுத்து"
    ],
    [
      "Actor",
      "செயற்பாட்டாளர்"
    ],
    [
      "Class",
      "வகுப்பு"
    ],
    [
      "Stack",
      "அடுக்கு (Stack)"
    ],
    [
      "Input",
      "உள்ளீடு"
    ],
    [
      "Write",
      "எழுது"
    ],
    [
      "Plane",
      "தளம்"
    ],
    [
      "Media",
      "ஊடகம்"
    ],
    [
      "Major",
      "முக்கிய"
    ],
    [
      "Check",
      "சரிபார்"
    ],
    [
      "Local",
      "உள்ளூர் (Local)"
    ],
    [
      "Earth",
      "புவி (Earth)"
    ],
    [
      "Clock",
      "கடிகாரம்"
    ],
    [
      "Match",
      "பொருந்தும்"
    ],
    [
      "Field",
      "களம்"
    ],
    [
      "Labs",
      "ஆய்வகங்கள்"
    ],
    [
      "Port",
      "போர்ட்"
    ],
    [
      "Trip",
      "டிரிப்"
    ],
    [
      "Test",
      "சோதனை"
    ],
    [
      "Time",
      "நேரம்"
    ],
    [
      "Name",
      "பெயர்"
    ],
    [
      "Type",
      "வகை"
    ],
    [
      "Role",
      "பங்கு"
    ],
    [
      "Mode",
      "முறை"
    ],
    [
      "Load",
      "சுமை"
    ],
    [
      "Road",
      "சாலை"
    ],
    [
      "Open",
      "திற (Open)"
    ],
    [
      "Save",
      "சேமி"
    ],
    [
      "View",
      "காட்சி"
    ],
    [
      "Live",
      "நேரடி"
    ],
    [
      "User",
      "பயனர்"
    ],
    [
      "Step",
      "படி"
    ],
    [
      "Node",
      "முனை"
    ],
    [
      "Link",
      "இணைப்பு"
    ],
    [
      "Path",
      "பாதை"
    ],
    [
      "Ring",
      "வளையம்"
    ],
    [
      "Rack",
      "ரேக்"
    ],
    [
      "Last",
      "கடைசி"
    ],
    [
      "Full",
      "முழு"
    ],
    [
      "Dual",
      "இரட்டை"
    ],
    [
      "Dusk",
      "மாலை"
    ],
    [
      "Code",
      "குறியீடு"
    ],
    [
      "Line",
      "வரி / லைன்"
    ],
    [
      "Rate",
      "விகிதம்"
    ],
    [
      "Loss",
      "இழப்பு"
    ],
    [
      "Info",
      "தகவல்"
    ],
    [
      "Case",
      "வழக்கு"
    ],
    [
      "Coil",
      "காயில்"
    ],
    [
      "Bay:",
      "பே:"
    ],
    [
      "Auth",
      "அங்கீகாரம்"
    ],
    [
      "Card",
      "அட்டை"
    ],
    [
      "Temp",
      "வெப்பநிலை"
    ],
    [
      "Lab",
      "ஆய்வகம்"
    ],
    [
      "All",
      "அனைத்தும்"
    ],
    [
      "New",
      "புதிய"
    ],
    [
      "Run",
      "இயக்கு"
    ],
    [
      "Gas",
      "வாயு"
    ],
    [
      "Tap",
      "டேப்"
    ],
    [
      "Q&A",
      "கேள்வி & பதில் (Q&A)"
    ],
    [
      "Bay",
      "பே (Bay)"
    ],
    [
      "Bus",
      "பஸ் (Bus)"
    ],
    [
      "Tag",
      "குறிச்சொல்"
    ]
  ],
  "HI": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "समर्थित सभी भाषाओं के लिए 100% ऑफ़लाइन अनुवाद उपलब्ध है। तकनीकी शब्द अपरिवर्तित रहते हैं।"
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "इंटरैक्टिव IPv4 CIDR / VLSM सबनेट कैलकुलेटर"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Modbus TCP क्लाइंट पोलिंग कॉन्फ़िगरेशन"
    ],
    [
      "Backplane Module & Slot Configuration",
      "बैकप्लेन मॉड्यूल और स्लॉट कॉन्फ़िगरेशन"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — GOOSE मल्टीकास्ट (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "इंटरैक्टिव पैकेट प्रवाह एनिमेटर"
    ],
    [
      "Interactive Single-Line Diagram",
      "इंटरैक्टिव सिंगल-लाइन आरेख (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "RCC के लिए नॉर्थबाउंड टेलीकंट्रोल"
    ],
    [
      "No IEDs match these filters.",
      "इन फ़िल्टरों से कोई IED मेल नहीं खाता।"
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "अपेक्षित स्वीकृति मानदंड"
    ],
    [
      "Gateway translates MMS → IOA",
      "गेटवे MMS → IOA अनुवाद करता है"
    ],
    [
      "Self-Supervision & Watchdog",
      "स्व-निगरानी और वॉचडॉग"
    ],
    [
      "Standard Ports & EtherTypes",
      "मानक पोर्ट और EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "फैक्ट्री स्वीकृति परीक्षण (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "औद्योगिक ईथरनेट स्विच"
    ],
    [
      "Fault Injection Scenarios",
      "फॉल्ट इंजेक्शन परिदृश्य"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 साक्षात्कार • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "स्थिति कोड: अच्छा (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "परीक्षण शुरू करें और SOE कैप्चर करें"
    ],
    [
      "Site Acceptance Testing",
      "साइट स्वीकृति परीक्षण (SAT)"
    ],
    [
      "State Change Simulation",
      "स्थिति परिवर्तन सिमुलेशन"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (TotW / PPV / A माप):"
    ],
    [
      "Key Takeaways & Checks",
      "मुख्य बिंदु और जाँच"
    ],
    [
      "Electrical Connections",
      "विद्युत कनेक्शन"
    ],
    [
      "out-of-band management",
      "आउट-ऑफ-बैंड प्रबंधन"
    ],
    [
      "Derived SCADA 52a/52b:",
      "व्युत्पन्न SCADA 52a/52b:"
    ],
    [
      "General Interrogation",
      "जनरल इंटरोगेशन (GI)"
    ],
    [
      "Highlight connections",
      "कनेक्शन हाइलाइट करें"
    ],
    [
      "Front South Elevation",
      "फ्रंट साउथ एलिवेशन"
    ],
    [
      "Parameter Description",
      "पैरामीटर विवरण"
    ],
    [
      "Checkpoints / Remarks",
      "जाँच बिंदु / टिप्पणियाँ"
    ],
    [
      "Gateway IEC 61850 Map",
      "गेटवे IEC 61850 मैप"
    ],
    [
      "Result & Diagnostics",
      "परिणाम और निदान"
    ],
    [
      "Terms and Conditions",
      "नियम और शर्तें"
    ],
    [
      "Single-Line Diagram",
      "सिंगल-लाइन आरेख (SLD)"
    ],
    [
      "Communication Block",
      "संचार अवरोध"
    ],
    [
      "Root Cause Analysis",
      "मूल कारण विश्लेषण"
    ],
    [
      "Distance Protection",
      "डिस्टेंस प्रोटेक्शन"
    ],
    [
      "Industrial Ethernet",
      "औद्योगिक ईथरनेट"
    ],
    [
      "Communication Flow",
      "संचार प्रवाह"
    ],
    [
      "Preferred Language",
      "पसंदीदा भाषा"
    ],
    [
      "PBKDF2 Salted Auth",
      "PBKDF2 साल्टेड प्रमाणीकरण"
    ],
    [
      "Signal Description",
      "सिग्नल विवरण"
    ],
    [
      "Affected Endpoints",
      "प्रभावित एंडपॉइंट्स"
    ],
    [
      "OPERATIONS CONSOLE",
      "संचालन कंसोल"
    ],
    [
      "Stop highlighting",
      "हाइलाइट करना रोकें"
    ],
    [
      "Verified Sessions",
      "सत्यापित सत्र"
    ],
    [
      "serial connection",
      "सीरियल कनेक्शन"
    ],
    [
      "Published DataSet",
      "प्रकाशित DataSet"
    ],
    [
      "Southbound Source",
      "साउथबाउंड स्रोत"
    ],
    [
      "Loading / Cooling",
      "लोडिंग / कूलिंग"
    ],
    [
      "Finish & Evaluate",
      "समाप्त करें और मूल्यांकन करें"
    ],
    [
      "IEC 61850 Dataset",
      "IEC 61850 डेटासेट"
    ],
    [
      "Protection Relay",
      "प्रोटेक्शन रिले"
    ],
    [
      "Operator Station",
      "ऑपरेटर स्टेशन"
    ],
    [
      "Topology Summary",
      "टोपोलॉजी सारांश"
    ],
    [
      "Rollover Console",
      "रोलओवर कंसोल"
    ],
    [
      "Firewall Cluster",
      "फ़ायरवॉल क्लस्टर"
    ],
    [
      "Association Loss",
      "एसोसिएशन हानि"
    ],
    [
      "Ethertype Suffix",
      "Ethertype प्रत्यय"
    ],
    [
      "Return to Normal",
      "सामान्य स्थिति में लौटें"
    ],
    [
      "Circuit Breaker",
      "सर्किट ब्रेकर"
    ],
    [
      "Protection Trip",
      "प्रोटेक्शन ट्रिप"
    ],
    [
      "Addressing Plan",
      "एड्रेसिंग योजना"
    ],
    [
      "Live Monitoring",
      "लाइव निगरानी"
    ],
    [
      "Troubleshooting",
      "समस्या निवारण"
    ],
    [
      "Display options",
      "प्रदर्शन विकल्प"
    ],
    [
      "Synch-Check Ref",
      "सिंक-चेक संदर्भ"
    ],
    [
      "IED Connections",
      "IED कनेक्शन"
    ],
    [
      "Data Attributes",
      "डेटा विशेषताएँ"
    ],
    [
      "IED INFORMATION",
      "IED जानकारी"
    ],
    [
      "Sequence Number",
      "अनुक्रम संख्या"
    ],
    [
      "Failed Segments",
      "विफल सेगमेंट"
    ],
    [
      "Manual Transfer",
      "मैनुअल ट्रांसफर"
    ],
    [
      "Fast Protection",
      "तेज़ सुरक्षा"
    ],
    [
      "Timed Evaluator",
      "समयबद्ध मूल्यांकनकर्ता"
    ],
    [
      "Synchronization",
      "सिंक्रनाइज़ेशन"
    ],
    [
      "Firmware / SCL:",
      "फ़र्मवेयर / SCL:"
    ],
    [
      "MMS Association",
      "MMS एसोसिएशन"
    ],
    [
      "SCADA Tag / HMI",
      "SCADA टैग / HMI"
    ],
    [
      "Retransmission",
      "पुनः प्रसारण"
    ],
    [
      "Privacy Policy",
      "गोपनीयता नीति"
    ],
    [
      "Distance-Aware",
      "दूरी-संवेदी"
    ],
    [
      "LAN Identifier",
      "LAN पहचानकर्ता"
    ],
    [
      "Reachable IEDs",
      "पहुँच योग्य IEDs"
    ],
    [
      "Busbar Section",
      "बसबॉर अनुभाग"
    ],
    [
      "Specialization",
      "विशेषज्ञता"
    ],
    [
      "Firmware / SCL",
      "फ़र्मवेयर / SCL"
    ],
    [
      "OTI / WTI Temp",
      "OTI / WTI तापमान"
    ],
    [
      "IEC 61850 Ref:",
      "IEC 61850 संदर्भ:"
    ],
    [
      "Line Isolator",
      "लाइन आइसोलेटर"
    ],
    [
      "Disconnectors",
      "डिस्कनेक्टर"
    ],
    [
      "Communication",
      "संचार"
    ],
    [
      "Configuration",
      "कॉन्फ़िगरेशन"
    ],
    [
      "Commissioning",
      "कमीशनिंग"
    ],
    [
      "Key Takeaways",
      "मुख्य बिंदु"
    ],
    [
      "Derived SCADA",
      "व्युत्पन्न SCADA"
    ],
    [
      "Wildcard Mask",
      "वाइल्डकार्ड मास्क"
    ],
    [
      "Quick Actions",
      "त्वरित कार्रवाइयाँ"
    ],
    [
      "Auto-Recloser",
      "ऑटो-रिक्लोज़र"
    ],
    [
      "Function Code",
      "फ़ंक्शन कोड"
    ],
    [
      "Allowed VLANs",
      "अनुमत VLANs"
    ],
    [
      "Bus Section A",
      "बस अनुभाग A"
    ],
    [
      "Bus Section B",
      "बस अनुभाग B"
    ],
    [
      "Preconditions",
      "पूर्व-शर्तें"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (मैपिंग)"
    ],
    [
      "52 CB (Dbpos)",
      "52 CB (Dbpos स्थिति)"
    ],
    [
      "Earth Switch",
      "अर्थ स्विच"
    ],
    [
      "Bus Isolator",
      "बस आइसोलेटर"
    ],
    [
      "Bus Transfer",
      "बस ट्रांसफर"
    ],
    [
      "Transformers",
      "ट्रांसफॉर्मर"
    ],
    [
      "Disconnector",
      "डिस्कनेक्टर"
    ],
    [
      "Interlocking",
      "इंटरलॉकिंग"
    ],
    [
      "Architecture",
      "आर्किटेक्चर"
    ],
    [
      "Distribution",
      "वितरण"
    ],
    [
      "Disconnected",
      "डिस्कनेक्टेड"
    ],
    [
      "Night Floods",
      "नाइट फ्लड लाइट्स"
    ],
    [
      "Broadcast IP",
      "ब्रॉडकास्ट IP"
    ],
    [
      "Usable Range",
      "उपयोगी श्रेणी"
    ],
    [
      "Usable Hosts",
      "उपयोगी होस्ट"
    ],
    [
      "IED Identity",
      "IED पहचान"
    ],
    [
      "Access Ports",
      "एक्सेस पोर्ट्स"
    ],
    [
      "Input Module",
      "इनपुट मॉड्यूल"
    ],
    [
      "Cheat Sheets",
      "चीट शीट्स"
    ],
    [
      "Differential",
      "डिफरेंशियल"
    ],
    [
      "Synchrocheck",
      "सिंक्रोचेक"
    ],
    [
      "Interruption",
      "व्यवधान"
    ],
    [
      "Measurements",
      "माप"
    ],
    [
      "Transmission",
      "पारेषण"
    ],
    [
      "IEC-104 Link",
      "IEC-104 लिंक"
    ],
    [
      "CB Pos [ST]:",
      "CB स्थिति [ST]:"
    ],
    [
      "Bus Coupler",
      "बस कपलर"
    ],
    [
      "Execute All",
      "सभी निष्पादित करें"
    ],
    [
      "Engineering",
      "इंजीनियरिंग"
    ],
    [
      "Transformer",
      "ट्रांसफॉर्मर"
    ],
    [
      "Diagnostics",
      "निदान"
    ],
    [
      "Preparation",
      "तैयारी"
    ],
    [
      "Description",
      "विवरण"
    ],
    [
      "Association",
      "एसोसिएशन"
    ],
    [
      "Certificate",
      "प्रमाणपत्र"
    ],
    [
      "Residential",
      "आवासीय"
    ],
    [
      "WAN Routing",
      "WAN रूटिंग"
    ],
    [
      "Comm Health",
      "संचार स्वास्थ्य"
    ],
    [
      "Subnet Mask",
      "सबनेट मास्क"
    ],
    [
      "Subnet mask",
      "सबनेट मास्क"
    ],
    [
      "Phase Shift",
      "फ़ेज़ शिफ्ट"
    ],
    [
      "Trunk Ports",
      "ट्रंक पोर्ट्स"
    ],
    [
      "Process Bus",
      "प्रोसेस बस"
    ],
    [
      "Termination",
      "टर्मिनेशन"
    ],
    [
      "Maintenance",
      "रखरखाव"
    ],
    [
      "Explanation",
      "स्पष्टीकरण"
    ],
    [
      "Supervision",
      "निगरानी"
    ],
    [
      "Workstation",
      "वर्कस्टेशन"
    ],
    [
      "Earth Sw Q8",
      "अर्थ स्विच Q8"
    ],
    [
      "Telecontrol",
      "टेलीकंट्रोल"
    ],
    [
      "Reset View",
      "दृश्य रीसेट करें"
    ],
    [
      "Reset view",
      "दृश्य रीसेट करें"
    ],
    [
      "Substation",
      "सबस्टेशन"
    ],
    [
      "Automation",
      "ऑटोमेशन"
    ],
    [
      "Laboratory",
      "प्रयोगशाला"
    ],
    [
      "Networking",
      "नेटवर्किंग"
    ],
    [
      "Switchyard",
      "स्विचयार्ड"
    ],
    [
      "Switchgear",
      "स्विचगियर"
    ],
    [
      "Protection",
      "प्रोटेक्शन"
    ],
    [
      "Simulation",
      "सिमुलेशन"
    ],
    [
      "Configured",
      "कॉन्फ़िगर किया गया"
    ],
    [
      "Diagnostic",
      "नैदानिक"
    ],
    [
      "Topologies",
      "टोपोलॉजी"
    ],
    [
      "Redundancy",
      "रिडंडेंसी"
    ],
    [
      "Interfaces",
      "इंटरफ़ेस"
    ],
    [
      "Procedures",
      "प्रक्रियाएँ"
    ],
    [
      "Subscriber",
      "सब्सक्राइबर"
    ],
    [
      "References",
      "संदर्भ"
    ],
    [
      "Industrial",
      "औद्योगिक"
    ],
    [
      "Root Cause",
      "मूल कारण"
    ],
    [
      "Media Type",
      "मीडिया प्रकार"
    ],
    [
      "IEC Legend",
      "IEC लीजेंड"
    ],
    [
      "Op Counter",
      "ऑपरेशन काउंटर"
    ],
    [
      "Reactive Q",
      "प्रतिक्रियाशील Q"
    ],
    [
      "Apparent S",
      "आभासी S"
    ],
    [
      "Topic-wise",
      "विषय-वार"
    ],
    [
      "Forwarding",
      "फॉरवर्डिंग"
    ],
    [
      "Permissive",
      "अनुमतिप्रद"
    ],
    [
      "Continuity",
      "निरंतरता"
    ],
    [
      "Hypothesis",
      "परिकल्पना"
    ],
    [
      "Line DS Q9",
      "लाइन DS Q9"
    ],
    [
      "Northbound",
      "नॉर्थबाउंड"
    ],
    [
      "Event Log",
      "इवेंट लॉग"
    ],
    [
      "Key Notes",
      "मुख्य नोट्स"
    ],
    [
      "Clear All",
      "सभी साफ़ करें"
    ],
    [
      "Next Step",
      "अगला चरण"
    ],
    [
      "Workspace",
      "कार्यक्षेत्र"
    ],
    [
      "Academies",
      "अकादमियाँ"
    ],
    [
      "Interlock",
      "इंटरलॉक"
    ],
    [
      "Telemetry",
      "टेलीमेट्री"
    ],
    [
      "Simulator",
      "सिम्युलेटर"
    ],
    [
      "Simulated",
      "सिमुलेटेड"
    ],
    [
      "Protocols",
      "प्रोटोकॉल"
    ],
    [
      "Equipment",
      "उपकरण"
    ],
    [
      "Interface",
      "इंटरफ़ेस"
    ],
    [
      "Procedure",
      "प्रक्रिया"
    ],
    [
      "Scenarios",
      "परिदृश्य"
    ],
    [
      "Questions",
      "प्रश्न"
    ],
    [
      "Interview",
      "साक्षात्कार"
    ],
    [
      "Timestamp",
      "टाइमस्टैम्प"
    ],
    [
      "Frequency",
      "आवृत्ति"
    ],
    [
      "Registers",
      "रजिस्टर"
    ],
    [
      "Publisher",
      "पब्लिशर"
    ],
    [
      "Historian",
      "हिस्टोरियन"
    ],
    [
      "Apartment",
      "अपार्टमेंट"
    ],
    [
      "Inspector",
      "निरीक्षक"
    ],
    [
      "Downloads",
      "डाउनलोड"
    ],
    [
      "Completed",
      "पूर्ण"
    ],
    [
      "Permitted",
      "अनुमत"
    ],
    [
      "Connected",
      "जुड़ा हुआ"
    ],
    [
      "Multicast",
      "मल्टीकास्ट"
    ],
    [
      "Reference",
      "संदर्भ"
    ],
    [
      "Hierarchy",
      "पदानुक्रम"
    ],
    [
      "Technical",
      "तकनीकी"
    ],
    [
      "Comm Loss",
      "संचार हानि"
    ],
    [
      "Poll Rate",
      "पोल दर"
    ],
    [
      "Data Type",
      "डेटा प्रकार"
    ],
    [
      "IED Ports",
      "IED पोर्ट्स"
    ],
    [
      "Hardwired",
      "हार्डवायर्ड"
    ],
    [
      "Important",
      "महत्वपूर्ण"
    ],
    [
      "Endpoints",
      "एंडपॉइंट्स"
    ],
    [
      "Transport",
      "ट्रांसपोर्ट"
    ],
    [
      "Configure",
      "कॉन्फ़िगर करें"
    ],
    [
      "Energized",
      "ऊर्जावान"
    ],
    [
      "Redundant",
      "रिडंडेंट"
    ],
    [
      "Secondary",
      "द्वितीयक"
    ],
    [
      "Broadcast",
      "ब्रॉडकास्ट"
    ],
    [
      "Mandatory",
      "अनिवार्य"
    ],
    [
      "Operation",
      "संचालन"
    ],
    [
      "Switching",
      "स्विचिंग"
    ],
    [
      "Auxiliary",
      "सहायक"
    ],
    [
      "✓ Link Up",
      "✓ लिंक अप (सक्रिय)"
    ],
    [
      "ANSI Code",
      "ANSI कोड"
    ],
    [
      "Pin → pin",
      "पिन → पिन"
    ],
    [
      "Q1 Bus DS",
      "Q1 बस DS"
    ],
    [
      "Bus DS Q1",
      "बस DS Q1"
    ],
    [
      "Bay / IED",
      "बे / IED"
    ],
    [
      "Field I/O",
      "फ़ील्ड I/O"
    ],
    [
      "(DI Card)",
      "(DI कार्ड)"
    ],
    [
      "Run Test",
      "परीक्षण चलाएँ"
    ],
    [
      "Zoom out",
      "ज़ूम आउट"
    ],
    [
      "Breakers",
      "ब्रेकर"
    ],
    [
      "Isolator",
      "आइसोलेटर"
    ],
    [
      "Controls",
      "नियंत्रण"
    ],
    [
      "Commands",
      "कमांड"
    ],
    [
      "Simulate",
      "सिमुलेट करें"
    ],
    [
      "Protocol",
      "प्रोटोकॉल"
    ],
    [
      "Settings",
      "सेटिंग्स"
    ],
    [
      "Topology",
      "टोपोलॉजी"
    ],
    [
      "Failover",
      "फ़ेलओवर"
    ],
    [
      "Hardware",
      "हार्डवेयर"
    ],
    [
      "Switches",
      "स्विच"
    ],
    [
      "Scenario",
      "परिदृश्य"
    ],
    [
      "Chapters",
      "अध्याय"
    ],
    [
      "Diagrams",
      "आरेख"
    ],
    [
      "Examples",
      "उदाहरण"
    ],
    [
      "Question",
      "प्रश्न"
    ],
    [
      "Learning",
      "शिक्षण"
    ],
    [
      "Practice",
      "अभ्यास"
    ],
    [
      "Overview",
      "अवलोकन"
    ],
    [
      "Register",
      "रजिस्टर"
    ],
    [
      "Security",
      "सुरक्षा"
    ],
    [
      "Selected",
      "चयनित"
    ],
    [
      "Download",
      "डाउनलोड"
    ],
    [
      "Complete",
      "पूर्ण"
    ],
    [
      "Rejected",
      "अस्वीकृत"
    ],
    [
      "Disabled",
      "अक्षम"
    ],
    [
      "Isolated",
      "पृथक"
    ],
    [
      "Students",
      "छात्र"
    ],
    [
      "Password",
      "पासवर्ड"
    ],
    [
      "Progress",
      "प्रगति"
    ],
    [
      "Sections",
      "अनुभाग"
    ],
    [
      "Evidence",
      "प्रमाण"
    ],
    [
      "Physical",
      "भौतिक"
    ],
    [
      "Previous",
      "पिछला"
    ],
    [
      "Daylight",
      "दिन का प्रकाश"
    ],
    [
      "Endpoint",
      "एंडपॉइंट"
    ],
    [
      "Severity",
      "गंभीरता"
    ],
    [
      "Position",
      "स्थान/स्थिति"
    ],
    [
      "Critical",
      "गंभीर (Critical)"
    ],
    [
      "Category",
      "श्रेणी"
    ],
    [
      "Expected",
      "अपेक्षित"
    ],
    [
      "Operator",
      "ऑपरेटर"
    ],
    [
      "Mismatch",
      "बेमेल (Mismatch)"
    ],
    [
      "Priority",
      "प्राथमिकता"
    ],
    [
      "Transfer",
      "ट्रांसफर"
    ],
    [
      "Sequence",
      "अनुक्रम"
    ],
    [
      "Overload",
      "ओवरलोड"
    ],
    [
      "Recovery",
      "रिकवरी"
    ],
    [
      "Terminal",
      "टर्मिनल"
    ],
    [
      "Internal",
      "आंतरिक"
    ],
    [
      "External",
      "बाहरी"
    ],
    [
      "Wireless",
      "वायरलेस"
    ],
    [
      "DataSet:",
      "डेटासेट:"
    ],
    [
      "Evaluate",
      "मूल्यांकन करें"
    ],
    [
      "Zoom in",
      "ज़ूम इन"
    ],
    [
      "Academy",
      "अकादमी"
    ],
    [
      "Network",
      "नेटवर्क"
    ],
    [
      "Station",
      "स्टेशन"
    ],
    [
      "Feeders",
      "फीडर"
    ],
    [
      "Incomer",
      "इनकमर"
    ],
    [
      "Breaker",
      "ब्रेकर"
    ],
    [
      "Coupler",
      "कपलर"
    ],
    [
      "Control",
      "नियंत्रण"
    ],
    [
      "Command",
      "कमांड"
    ],
    [
      "Devices",
      "उपकरण"
    ],
    [
      "Servers",
      "सर्वर"
    ],
    [
      "Gateway",
      "गेटवे"
    ],
    [
      "Optical",
      "ऑप्टिकल"
    ],
    [
      "Signals",
      "सिग्नल"
    ],
    [
      "Mapping",
      "मैपिंग"
    ],
    [
      "Failure",
      "विफलता"
    ],
    [
      "Testing",
      "परीक्षण"
    ],
    [
      "Chapter",
      "अध्याय"
    ],
    [
      "Modules",
      "मॉड्यूल"
    ],
    [
      "Lessons",
      "पाठ"
    ],
    [
      "Diagram",
      "आरेख"
    ],
    [
      "Example",
      "उदाहरण"
    ],
    [
      "Summary",
      "सारांश"
    ],
    [
      "Details",
      "विवरण"
    ],
    [
      "Quality",
      "गुणवत्ता"
    ],
    [
      "Address",
      "पता"
    ],
    [
      "Voltage",
      "वोल्टेज"
    ],
    [
      "Current",
      "करंट"
    ],
    [
      "Reports",
      "रिपोर्ट"
    ],
    [
      "History",
      "इतिहास"
    ],
    [
      "Inspect",
      "निरीक्षण करें"
    ],
    [
      "Execute",
      "निष्पादित करें"
    ],
    [
      "Operate",
      "संचालित करें"
    ],
    [
      "Confirm",
      "पुष्टि करें"
    ],
    [
      "Preview",
      "पूर्वावलोकन"
    ],
    [
      "Healthy",
      "स्वस्थ"
    ],
    [
      "Blocked",
      "अवरुद्ध"
    ],
    [
      "Enabled",
      "सक्षम"
    ],
    [
      "Offline",
      "ऑफ़लाइन"
    ],
    [
      "Profile",
      "प्रोफ़ाइल"
    ],
    [
      "Account",
      "खाता"
    ],
    [
      "Student",
      "छात्र"
    ],
    [
      "Section",
      "अनुभाग"
    ],
    [
      "Actions",
      "कार्रवाइयाँ"
    ],
    [
      "Objects",
      "ऑब्जेक्ट्स"
    ],
    [
      "Traffic",
      "ट्रैफ़िक"
    ],
    [
      "Digital",
      "डिजिटल"
    ],
    [
      "Logical",
      "लॉजिकल"
    ],
    [
      "Symptom",
      "लक्षण"
    ],
    [
      "Binding",
      "बाइंडिंग"
    ],
    [
      "Service",
      "सेवा"
    ],
    [
      "Holding",
      "होल्डिंग"
    ],
    [
      "Timeout",
      "टाइमआउट"
    ],
    [
      "Scaling",
      "स्केलिंग"
    ],
    [
      "Segment",
      "सेगमेंट"
    ],
    [
      "Warning",
      "चेतावनी"
    ],
    [
      "Disable",
      "अक्षम करें"
    ],
    [
      "Connect",
      "कनेक्ट करें"
    ],
    [
      "Restore",
      "पुनर्स्थापित करें"
    ],
    [
      "Capture",
      "कैप्चर करें"
    ],
    [
      "Monitor",
      "निगरानी करें"
    ],
    [
      "Trigger",
      "ट्रिगर करें"
    ],
    [
      "Primary",
      "प्राथमिक"
    ],
    [
      "Circuit",
      "सर्किट"
    ],
    [
      "Unicast",
      "यूनिकास्ट"
    ],
    [
      "VLAN ID",
      "VLAN ID (पहचान)"
    ],
    [
      "Type ID",
      "टाइप ID"
    ],
    [
      "Derived",
      "व्युत्पन्न"
    ],
    [
      "Filters",
      "फ़िल्टर"
    ],
    [
      "Feeder",
      "फीडर"
    ],
    [
      "Relays",
      "रिले"
    ],
    [
      "Device",
      "उपकरण"
    ],
    [
      "Server",
      "सर्वर"
    ],
    [
      "Client",
      "क्लाइंट"
    ],
    [
      "Switch",
      "स्विच"
    ],
    [
      "Router",
      "राउटर"
    ],
    [
      "Cables",
      "केबल"
    ],
    [
      "Copper",
      "कॉपर"
    ],
    [
      "Signal",
      "सिग्नल"
    ],
    [
      "Mapped",
      "मैप किया गया"
    ],
    [
      "Alarms",
      "अलार्म"
    ],
    [
      "Events",
      "घटनाएँ"
    ],
    [
      "Faults",
      "फॉल्ट"
    ],
    [
      "Module",
      "मॉड्यूल"
    ],
    [
      "Lesson",
      "पाठ"
    ],
    [
      "Answer",
      "उत्तर"
    ],
    [
      "Status",
      "स्थिति"
    ],
    [
      "Values",
      "मान"
    ],
    [
      "Source",
      "स्रोत"
    ],
    [
      "Target",
      "लक्ष्य"
    ],
    [
      "Energy",
      "ऊर्जा"
    ],
    [
      "Packet",
      "पैकेट"
    ],
    [
      "Frames",
      "फ़्रेम"
    ],
    [
      "Report",
      "रिपोर्ट"
    ],
    [
      "Camera",
      "कैमरा"
    ],
    [
      "Street",
      "गली"
    ],
    [
      "Closed",
      "बंद (Closed)"
    ],
    [
      "Select",
      "चुनें"
    ],
    [
      "Search",
      "खोजें"
    ],
    [
      "Filter",
      "फ़िल्टर"
    ],
    [
      "Cancel",
      "रद्द करें"
    ],
    [
      "Upload",
      "अपलोड"
    ],
    [
      "Export",
      "निर्यात करें"
    ],
    [
      "Toggle",
      "टॉगल करें"
    ],
    [
      "Active",
      "सक्रिय"
    ],
    [
      "Normal",
      "सामान्य"
    ],
    [
      "Online",
      "ऑनलाइन"
    ],
    [
      "Locked",
      "लॉक किया गया"
    ],
    [
      "Result",
      "परिणाम"
    ],
    [
      "Action",
      "कार्रवाई"
    ],
    [
      "System",
      "सिस्टम"
    ],
    [
      "Object",
      "ऑब्जेक्ट"
    ],
    [
      "Resume",
      "फिर से शुरू करें"
    ],
    [
      "Hidden",
      "छुपा हुआ"
    ],
    [
      "Tagged",
      "टैग किया गया"
    ],
    [
      "Errors",
      "त्रुटियाँ"
    ],
    [
      "Spring",
      "स्प्रिंग"
    ],
    [
      "Actual",
      "वास्तविक"
    ],
    [
      "Verify",
      "सत्यापित करें"
    ],
    [
      "Enable",
      "सक्षम करें"
    ],
    [
      "Inject",
      "इंजेक्ट करें"
    ],
    [
      "Remote",
      "रिमोट"
    ],
    [
      "Busbar",
      "बसबॉर"
    ],
    [
      "Subnet",
      "सबनेट"
    ],
    [
      "Bus A:",
      "बस A:"
    ],
    [
      "Bus B:",
      "बस B:"
    ],
    [
      "Salted",
      "साल्टेड"
    ],
    [
      "Finish",
      "समाप्त करें"
    ],
    [
      "Relay",
      "रिले"
    ],
    [
      "Ports",
      "पोर्ट"
    ],
    [
      "Cable",
      "केबल"
    ],
    [
      "Fiber",
      "फाइबर"
    ],
    [
      "Alarm",
      "अलार्म"
    ],
    [
      "Event",
      "इवेंट"
    ],
    [
      "Fault",
      "फॉल्ट"
    ],
    [
      "Tests",
      "परीक्षण"
    ],
    [
      "State",
      "अवस्था"
    ],
    [
      "Value",
      "मान"
    ],
    [
      "Level",
      "स्तर"
    ],
    [
      "Power",
      "पावर"
    ],
    [
      "Meter",
      "मीटर"
    ],
    [
      "Frame",
      "फ़्रेम"
    ],
    [
      "House",
      "घर"
    ],
    [
      "Close",
      "बंद करें (Close)"
    ],
    [
      "Reset",
      "रीसेट"
    ],
    [
      "Clear",
      "साफ़ करें"
    ],
    [
      "Print",
      "प्रिंट"
    ],
    [
      "Users",
      "उपयोगकर्ता"
    ],
    [
      "Table",
      "तालिका"
    ],
    [
      "Steps",
      "चरण"
    ],
    [
      "Cause",
      "कारण"
    ],
    [
      "Model",
      "मॉडल"
    ],
    [
      "Nodes",
      "नोड्स"
    ],
    [
      "Links",
      "लिंक"
    ],
    [
      "Paths",
      "पथ"
    ],
    [
      "Chain",
      "श्रृंखला"
    ],
    [
      "Panel",
      "पैनल"
    ],
    [
      "Speed",
      "गति"
    ],
    [
      "Click",
      "क्लिक करें"
    ],
    [
      "Pause",
      "रोकें (Pause)"
    ],
    [
      "Actor",
      "कर्ता (Actor)"
    ],
    [
      "Class",
      "वर्ग (Class)"
    ],
    [
      "Stack",
      "स्टैक"
    ],
    [
      "Input",
      "इनपुट"
    ],
    [
      "Write",
      "लिखें (Write)"
    ],
    [
      "Plane",
      "प्लेन"
    ],
    [
      "Media",
      "मीडिया"
    ],
    [
      "Major",
      "प्रमुख (Major)"
    ],
    [
      "Check",
      "जाँचें"
    ],
    [
      "Local",
      "लोकल"
    ],
    [
      "Earth",
      "अर्थ"
    ],
    [
      "Clock",
      "क्लॉक"
    ],
    [
      "Match",
      "मेल"
    ],
    [
      "Field",
      "फ़ील्ड"
    ],
    [
      "Labs",
      "लैब्स"
    ],
    [
      "Port",
      "पोर्ट"
    ],
    [
      "Trip",
      "ट्रिप"
    ],
    [
      "Test",
      "परीक्षण"
    ],
    [
      "Time",
      "समय"
    ],
    [
      "Name",
      "नाम"
    ],
    [
      "Type",
      "प्रकार"
    ],
    [
      "Role",
      "भूमिका"
    ],
    [
      "Mode",
      "मोड"
    ],
    [
      "Load",
      "लोड"
    ],
    [
      "Road",
      "सड़क"
    ],
    [
      "Open",
      "खोलें (Open)"
    ],
    [
      "Save",
      "सहेजें"
    ],
    [
      "View",
      "दृश्य"
    ],
    [
      "Live",
      "लाइव"
    ],
    [
      "User",
      "उपयोगकर्ता"
    ],
    [
      "Step",
      "चरण"
    ],
    [
      "Node",
      "नोड"
    ],
    [
      "Link",
      "लिंक"
    ],
    [
      "Path",
      "पथ"
    ],
    [
      "Ring",
      "रिंग"
    ],
    [
      "Rack",
      "रैक"
    ],
    [
      "Last",
      "अंतिम"
    ],
    [
      "Full",
      "पूर्ण"
    ],
    [
      "Dual",
      "दोहरा"
    ],
    [
      "Dusk",
      "गोधूलि (Dusk)"
    ],
    [
      "Code",
      "कोड"
    ],
    [
      "Line",
      "लाइन"
    ],
    [
      "Rate",
      "दर"
    ],
    [
      "Loss",
      "हानि"
    ],
    [
      "Info",
      "जानकारी"
    ],
    [
      "Case",
      "केस"
    ],
    [
      "Coil",
      "कॉइल"
    ],
    [
      "Bay:",
      "बे:"
    ],
    [
      "Auth",
      "प्रमाणीकरण"
    ],
    [
      "Card",
      "कार्ड"
    ],
    [
      "Temp",
      "तापमान"
    ],
    [
      "Lab",
      "लैब"
    ],
    [
      "All",
      "सभी"
    ],
    [
      "New",
      "नया"
    ],
    [
      "Run",
      "चलाएँ"
    ],
    [
      "Gas",
      "गैस"
    ],
    [
      "Tap",
      "टैप"
    ],
    [
      "Q&A",
      "प्रश्नोत्तर (Q&A)"
    ],
    [
      "Bay",
      "बे (Bay)"
    ],
    [
      "Bus",
      "बस (Bus)"
    ],
    [
      "Tag",
      "टैग"
    ]
  ],
  "PT": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "Traduções 100% offline disponíveis para todos os idiomas suportados. Termos técnicos permanecem inalterados."
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "Calculadora de Sub-rede IPv4 CIDR / VLSM Interativa"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Configuração de Polling do Cliente Modbus TCP"
    ],
    [
      "Backplane Module & Slot Configuration",
      "Configuração de Módulo e Slot de Backplane"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — Multodifusão GOOSE (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "Animador Interativo de Fluxo de Pacotes"
    ],
    [
      "Interactive Single-Line Diagram",
      "Diagrama Unifilar Interativo (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "Telecontrole Northbound para o RCC"
    ],
    [
      "No IEDs match these filters.",
      "Nenhum IED corresponde a estes filtros."
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "CRITÉRIOS DE ACEITAÇÃO ESPERADOS"
    ],
    [
      "Gateway translates MMS → IOA",
      "Gateway converte MMS → IOA"
    ],
    [
      "Self-Supervision & Watchdog",
      "Autovigilância e Watchdog"
    ],
    [
      "Standard Ports & EtherTypes",
      "Portas Padrão e EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "Teste de Aceitação em Fábrica (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "Switch Ethernet Industrial"
    ],
    [
      "Fault Injection Scenarios",
      "Cenários de Injeção de Falhas"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 Entrevistas • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "StatusCode: Bom (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "Iniciar Teste e Capturar SOE"
    ],
    [
      "Site Acceptance Testing",
      "Teste de Aceitação em Campo (SAT)"
    ],
    [
      "State Change Simulation",
      "Simulação de Mudança de Estado"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (Medições TotW / PPV / A):"
    ],
    [
      "Key Takeaways & Checks",
      "Pontos Principais e Verificações"
    ],
    [
      "Electrical Connections",
      "Conexões Elétricas"
    ],
    [
      "out-of-band management",
      "gerenciamento fora de banda"
    ],
    [
      "Derived SCADA 52a/52b:",
      "SCADA Derivado 52a/52b:"
    ],
    [
      "General Interrogation",
      "Interrogação Geral (GI)"
    ],
    [
      "Highlight connections",
      "Destacar conexões"
    ],
    [
      "Front South Elevation",
      "Elevação Frontal Sul"
    ],
    [
      "Parameter Description",
      "Descrição do Parâmetro"
    ],
    [
      "Checkpoints / Remarks",
      "Pontos de Verificação / Observações"
    ],
    [
      "Gateway IEC 61850 Map",
      "Mapeamento IEC 61850 do Gateway"
    ],
    [
      "Result & Diagnostics",
      "Resultado e Diagnóstico"
    ],
    [
      "Terms and Conditions",
      "Termos e Condições"
    ],
    [
      "Single-Line Diagram",
      "Diagrama Unifilar (SLD)"
    ],
    [
      "Communication Block",
      "Bloqueio de Comunicação"
    ],
    [
      "Root Cause Analysis",
      "Análise de Causa Raiz"
    ],
    [
      "Distance Protection",
      "Proteção de Distância"
    ],
    [
      "Industrial Ethernet",
      "Ethernet Industrial"
    ],
    [
      "Communication Flow",
      "Fluxo de Comunicação"
    ],
    [
      "Preferred Language",
      "Idioma Preferido"
    ],
    [
      "PBKDF2 Salted Auth",
      "Autenticação Salgada PBKDF2"
    ],
    [
      "Signal Description",
      "Descrição do Sinal"
    ],
    [
      "Affected Endpoints",
      "Endpoints Afetados"
    ],
    [
      "OPERATIONS CONSOLE",
      "CONSOLE DE OPERAÇÕES"
    ],
    [
      "Stop highlighting",
      "Parar destaque"
    ],
    [
      "Verified Sessions",
      "Sessões Verificadas"
    ],
    [
      "serial connection",
      "conexão serial"
    ],
    [
      "Published DataSet",
      "DataSet Publicado"
    ],
    [
      "Southbound Source",
      "Fonte Southbound"
    ],
    [
      "Loading / Cooling",
      "Carregamento / Resfriamento"
    ],
    [
      "Finish & Evaluate",
      "Concluir e Avaliar"
    ],
    [
      "IEC 61850 Dataset",
      "Conjunto de Dados IEC 61850"
    ],
    [
      "Protection Relay",
      "Relé de Proteção"
    ],
    [
      "Operator Station",
      "Estação do Operador"
    ],
    [
      "Topology Summary",
      "Resumo da Topologia"
    ],
    [
      "Rollover Console",
      "Console Rollover"
    ],
    [
      "Firewall Cluster",
      "Cluster de Firewall"
    ],
    [
      "Association Loss",
      "Perda de Associação"
    ],
    [
      "Ethertype Suffix",
      "Sufixo Ethertype"
    ],
    [
      "Return to Normal",
      "Retornar ao Normal"
    ],
    [
      "Circuit Breaker",
      "Disjuntor"
    ],
    [
      "Protection Trip",
      "Disparo de Proteção"
    ],
    [
      "Addressing Plan",
      "Plano de Endereçamento"
    ],
    [
      "Live Monitoring",
      "Monitoramento ao Vivo"
    ],
    [
      "Troubleshooting",
      "Solução de problemas"
    ],
    [
      "Display options",
      "Opções de exibição"
    ],
    [
      "Synch-Check Ref",
      "Ref. de Sincronismo"
    ],
    [
      "IED Connections",
      "Conexões de IED"
    ],
    [
      "Data Attributes",
      "Atributos de Dados"
    ],
    [
      "IED INFORMATION",
      "INFORMAÇÕES DO IED"
    ],
    [
      "Sequence Number",
      "Número de Sequência"
    ],
    [
      "Failed Segments",
      "Segmentos com Falha"
    ],
    [
      "Manual Transfer",
      "Transferência Manual"
    ],
    [
      "Fast Protection",
      "Proteção Rápida"
    ],
    [
      "Timed Evaluator",
      "Avaliador Cronometrado"
    ],
    [
      "Synchronization",
      "Sincronização"
    ],
    [
      "Firmware / SCL:",
      "Microcódigo / SCL:"
    ],
    [
      "MMS Association",
      "Associação MMS"
    ],
    [
      "SCADA Tag / HMI",
      "Tag SCADA / IHM"
    ],
    [
      "Retransmission",
      "Retransmissão"
    ],
    [
      "Privacy Policy",
      "Política de Privacidade"
    ],
    [
      "Distance-Aware",
      "Sensível à Distância"
    ],
    [
      "LAN Identifier",
      "Identificador de LAN"
    ],
    [
      "Reachable IEDs",
      "IEDs Alcançáveis"
    ],
    [
      "Busbar Section",
      "Seção de Barramento"
    ],
    [
      "Specialization",
      "Especialização"
    ],
    [
      "Firmware / SCL",
      "Microcódigo / SCL"
    ],
    [
      "OTI / WTI Temp",
      "Temp. OTI / WTI"
    ],
    [
      "IEC 61850 Ref:",
      "Ref. IEC 61850:"
    ],
    [
      "Line Isolator",
      "Seccionadora de Linha"
    ],
    [
      "Disconnectors",
      "Seccionadoras"
    ],
    [
      "Communication",
      "Comunicação"
    ],
    [
      "Configuration",
      "Configuração"
    ],
    [
      "Commissioning",
      "Comissionamento"
    ],
    [
      "Key Takeaways",
      "Pontos Principais"
    ],
    [
      "Derived SCADA",
      "SCADA Derivado"
    ],
    [
      "Wildcard Mask",
      "Máscara Wildcard"
    ],
    [
      "Quick Actions",
      "Ações Rápidas"
    ],
    [
      "Auto-Recloser",
      "Religador Automático"
    ],
    [
      "Function Code",
      "Código de Função"
    ],
    [
      "Allowed VLANs",
      "VLANs Permitidas"
    ],
    [
      "Bus Section A",
      "Seção de Barra A"
    ],
    [
      "Bus Section B",
      "Seção de Barra B"
    ],
    [
      "Preconditions",
      "Pré-condições"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (Conversão)"
    ],
    [
      "52 CB (Dbpos)",
      "52 DJ (Dbpos)"
    ],
    [
      "Earth Switch",
      "Chave de Aterramento"
    ],
    [
      "Bus Isolator",
      "Seccionadora de Barra"
    ],
    [
      "Bus Transfer",
      "Transferência de Barra"
    ],
    [
      "Transformers",
      "Transformadores"
    ],
    [
      "Disconnector",
      "Seccionadora"
    ],
    [
      "Interlocking",
      "Intertravamento"
    ],
    [
      "Architecture",
      "Arquitetura"
    ],
    [
      "Distribution",
      "Distribuição"
    ],
    [
      "Disconnected",
      "Desconectado"
    ],
    [
      "Night Floods",
      "Refletores Noturnos"
    ],
    [
      "Broadcast IP",
      "IP de Broadcast"
    ],
    [
      "Usable Range",
      "Faixa Utilizável"
    ],
    [
      "Usable Hosts",
      "Hosts Utilizáveis"
    ],
    [
      "IED Identity",
      "Identidade do IED"
    ],
    [
      "Access Ports",
      "Portas de Acesso"
    ],
    [
      "Input Module",
      "Módulo de Entrada"
    ],
    [
      "Cheat Sheets",
      "Folhas de Referência"
    ],
    [
      "Differential",
      "Diferencial"
    ],
    [
      "Synchrocheck",
      "Verificação de Sincronismo"
    ],
    [
      "Interruption",
      "Interrupção"
    ],
    [
      "Measurements",
      "Medições"
    ],
    [
      "Transmission",
      "Transmissão"
    ],
    [
      "IEC-104 Link",
      "Enlace IEC-104"
    ],
    [
      "CB Pos [ST]:",
      "Pos. DJ [ST]:"
    ],
    [
      "Bus Coupler",
      "Disjuntor de Interligação"
    ],
    [
      "Execute All",
      "Executar Tudo"
    ],
    [
      "Engineering",
      "Engenharia"
    ],
    [
      "Transformer",
      "Transformador"
    ],
    [
      "Diagnostics",
      "Diagnósticos"
    ],
    [
      "Preparation",
      "Preparação"
    ],
    [
      "Description",
      "Descrição"
    ],
    [
      "Association",
      "Associação"
    ],
    [
      "Certificate",
      "Certificado"
    ],
    [
      "Residential",
      "Residencial"
    ],
    [
      "WAN Routing",
      "Roteamento WAN"
    ],
    [
      "Comm Health",
      "Saúde da Com."
    ],
    [
      "Subnet Mask",
      "Máscara de Sub-rede"
    ],
    [
      "Subnet mask",
      "Máscara de sub-rede"
    ],
    [
      "Phase Shift",
      "Deslocamento de Fase"
    ],
    [
      "Trunk Ports",
      "Portas Trunk"
    ],
    [
      "Process Bus",
      "Barramento de Processo"
    ],
    [
      "Termination",
      "Terminação"
    ],
    [
      "Maintenance",
      "Manutenção"
    ],
    [
      "Explanation",
      "Explicação"
    ],
    [
      "Supervision",
      "Supervisão"
    ],
    [
      "Workstation",
      "Estação de Trabalho"
    ],
    [
      "Earth Sw Q8",
      "Chave Terra Q8"
    ],
    [
      "Telecontrol",
      "Telecontrole"
    ],
    [
      "Reset View",
      "Redefinir Visualização"
    ],
    [
      "Reset view",
      "Redefinir visualização"
    ],
    [
      "Substation",
      "Subestação"
    ],
    [
      "Automation",
      "Automação"
    ],
    [
      "Laboratory",
      "Laboratório"
    ],
    [
      "Networking",
      "Redes"
    ],
    [
      "Switchyard",
      "Pátio de manobras"
    ],
    [
      "Switchgear",
      "Painel de manobra"
    ],
    [
      "Protection",
      "Proteção"
    ],
    [
      "Simulation",
      "Simulação"
    ],
    [
      "Configured",
      "Configurado"
    ],
    [
      "Diagnostic",
      "Diagnóstico"
    ],
    [
      "Topologies",
      "Topologias"
    ],
    [
      "Redundancy",
      "Redundância"
    ],
    [
      "Interfaces",
      "Interfaces"
    ],
    [
      "Procedures",
      "Procedimentos"
    ],
    [
      "Subscriber",
      "Assinante"
    ],
    [
      "References",
      "Referências"
    ],
    [
      "Industrial",
      "Industrial"
    ],
    [
      "Root Cause",
      "Causa Raiz"
    ],
    [
      "Media Type",
      "Tipo de Mídia"
    ],
    [
      "IEC Legend",
      "Legenda IEC"
    ],
    [
      "Op Counter",
      "Contador de Operações"
    ],
    [
      "Reactive Q",
      "Q Reativo"
    ],
    [
      "Apparent S",
      "S Aparente"
    ],
    [
      "Topic-wise",
      "Por Tópico"
    ],
    [
      "Forwarding",
      "Encaminhamento"
    ],
    [
      "Permissive",
      "Permissivo"
    ],
    [
      "Continuity",
      "Continuidade"
    ],
    [
      "Hypothesis",
      "Hipótese"
    ],
    [
      "Line DS Q9",
      "Secc. Linha Q9"
    ],
    [
      "Northbound",
      "Northbound (Superior)"
    ],
    [
      "Event Log",
      "Registro de Eventos"
    ],
    [
      "Key Notes",
      "Notas Principais"
    ],
    [
      "Clear All",
      "Limpar Tudo"
    ],
    [
      "Next Step",
      "Próximo Passo"
    ],
    [
      "Workspace",
      "Espaço de trabalho"
    ],
    [
      "Academies",
      "Academias"
    ],
    [
      "Interlock",
      "Intertravamento"
    ],
    [
      "Telemetry",
      "Telemetria"
    ],
    [
      "Simulator",
      "Simulador"
    ],
    [
      "Simulated",
      "Simulado"
    ],
    [
      "Protocols",
      "Protocolos"
    ],
    [
      "Equipment",
      "Equipamento"
    ],
    [
      "Interface",
      "Interface de rede"
    ],
    [
      "Procedure",
      "Procedimento"
    ],
    [
      "Scenarios",
      "Cenários"
    ],
    [
      "Questions",
      "Perguntas"
    ],
    [
      "Interview",
      "Entrevista"
    ],
    [
      "Timestamp",
      "Carimbo de tempo"
    ],
    [
      "Frequency",
      "Frequência"
    ],
    [
      "Registers",
      "Registradores"
    ],
    [
      "Publisher",
      "Publicador"
    ],
    [
      "Historian",
      "Historiador"
    ],
    [
      "Apartment",
      "Apartamento"
    ],
    [
      "Inspector",
      "Inspetor"
    ],
    [
      "Downloads",
      "Downloads"
    ],
    [
      "Completed",
      "Concluído"
    ],
    [
      "Permitted",
      "Permitido"
    ],
    [
      "Connected",
      "Conectado"
    ],
    [
      "Multicast",
      "Multicast"
    ],
    [
      "Reference",
      "Referência"
    ],
    [
      "Hierarchy",
      "Hierarquia"
    ],
    [
      "Technical",
      "Técnico"
    ],
    [
      "Comm Loss",
      "Perda de Com."
    ],
    [
      "Poll Rate",
      "Taxa de Polling"
    ],
    [
      "Data Type",
      "Tipo de Dados"
    ],
    [
      "IED Ports",
      "Portas de IED"
    ],
    [
      "Hardwired",
      "Cabeado (Hardwired)"
    ],
    [
      "Important",
      "Importante"
    ],
    [
      "Endpoints",
      "Pontos de extremidade"
    ],
    [
      "Transport",
      "Transporte"
    ],
    [
      "Configure",
      "Configurar"
    ],
    [
      "Energized",
      "Energizado"
    ],
    [
      "Redundant",
      "Redundante"
    ],
    [
      "Secondary",
      "Secundário"
    ],
    [
      "Broadcast",
      "Broadcast (Difusão)"
    ],
    [
      "Mandatory",
      "Obrigatório"
    ],
    [
      "Operation",
      "Operação"
    ],
    [
      "Switching",
      "Manobra"
    ],
    [
      "Auxiliary",
      "Auxiliar"
    ],
    [
      "✓ Link Up",
      "✓ Link Ativo"
    ],
    [
      "ANSI Code",
      "Código ANSI"
    ],
    [
      "Pin → pin",
      "Pino → pino"
    ],
    [
      "Q1 Bus DS",
      "Q1 Secc. Barra"
    ],
    [
      "Bus DS Q1",
      "Secc. Barra Q1"
    ],
    [
      "Bay / IED",
      "Vão / IED"
    ],
    [
      "Field I/O",
      "E/S de Campo"
    ],
    [
      "(DI Card)",
      "(Cartão DI)"
    ],
    [
      "Run Test",
      "Executar Teste"
    ],
    [
      "Zoom out",
      "Diminuir zoom"
    ],
    [
      "Breakers",
      "Disjuntores"
    ],
    [
      "Isolator",
      "Isolador"
    ],
    [
      "Controls",
      "Controles"
    ],
    [
      "Commands",
      "Comandos"
    ],
    [
      "Simulate",
      "Simular"
    ],
    [
      "Protocol",
      "Protocolo"
    ],
    [
      "Settings",
      "Configurações"
    ],
    [
      "Topology",
      "Topologia"
    ],
    [
      "Failover",
      "Failover"
    ],
    [
      "Hardware",
      "Hardware"
    ],
    [
      "Switches",
      "Switches"
    ],
    [
      "Scenario",
      "Cenário"
    ],
    [
      "Chapters",
      "Capítulos"
    ],
    [
      "Diagrams",
      "Diagramas"
    ],
    [
      "Examples",
      "Exemplos"
    ],
    [
      "Question",
      "Pergunta"
    ],
    [
      "Learning",
      "Aprendizagem"
    ],
    [
      "Practice",
      "Prática"
    ],
    [
      "Overview",
      "Visão Geral"
    ],
    [
      "Register",
      "Registrador"
    ],
    [
      "Security",
      "Segurança"
    ],
    [
      "Selected",
      "Selecionado"
    ],
    [
      "Download",
      "Baixar"
    ],
    [
      "Complete",
      "Completo"
    ],
    [
      "Rejected",
      "Rejeitado"
    ],
    [
      "Disabled",
      "Desativado"
    ],
    [
      "Isolated",
      "Isolado"
    ],
    [
      "Students",
      "Estudantes"
    ],
    [
      "Password",
      "Senha"
    ],
    [
      "Progress",
      "Progresso"
    ],
    [
      "Sections",
      "Seções"
    ],
    [
      "Evidence",
      "Evidência"
    ],
    [
      "Physical",
      "Físico"
    ],
    [
      "Previous",
      "Anterior"
    ],
    [
      "Daylight",
      "Luz do Dia"
    ],
    [
      "Endpoint",
      "Ponto de extremidade"
    ],
    [
      "Severity",
      "Severidade"
    ],
    [
      "Position",
      "Posição"
    ],
    [
      "Critical",
      "Crítico"
    ],
    [
      "Category",
      "Categoria"
    ],
    [
      "Expected",
      "Esperado"
    ],
    [
      "Operator",
      "Operador"
    ],
    [
      "Mismatch",
      "Incompatibilidade"
    ],
    [
      "Priority",
      "Prioridade"
    ],
    [
      "Transfer",
      "Transferência"
    ],
    [
      "Sequence",
      "Sequência"
    ],
    [
      "Overload",
      "Sobrecarga"
    ],
    [
      "Recovery",
      "Recuperação"
    ],
    [
      "Terminal",
      "Terminal de conexão"
    ],
    [
      "Internal",
      "Interno"
    ],
    [
      "External",
      "Externo"
    ],
    [
      "Wireless",
      "Sem Fio (Wireless)"
    ],
    [
      "DataSet:",
      "Conjunto de Dados:"
    ],
    [
      "Evaluate",
      "Avaliar"
    ],
    [
      "Zoom in",
      "Aumentar zoom"
    ],
    [
      "Academy",
      "Academia"
    ],
    [
      "Network",
      "Rede"
    ],
    [
      "Station",
      "Estação"
    ],
    [
      "Feeders",
      "Alimentadores"
    ],
    [
      "Incomer",
      "Entrada"
    ],
    [
      "Breaker",
      "Disjuntor"
    ],
    [
      "Coupler",
      "Interligador"
    ],
    [
      "Control",
      "Controle"
    ],
    [
      "Command",
      "Comando"
    ],
    [
      "Devices",
      "Dispositivos"
    ],
    [
      "Servers",
      "Servidores"
    ],
    [
      "Gateway",
      "Gateway (Passarela)"
    ],
    [
      "Optical",
      "Óptico"
    ],
    [
      "Signals",
      "Sinais"
    ],
    [
      "Mapping",
      "Mapeamento"
    ],
    [
      "Failure",
      "Falha"
    ],
    [
      "Testing",
      "Teste"
    ],
    [
      "Chapter",
      "Capítulo"
    ],
    [
      "Modules",
      "Módulos"
    ],
    [
      "Lessons",
      "Lições"
    ],
    [
      "Diagram",
      "Diagrama"
    ],
    [
      "Example",
      "Exemplo"
    ],
    [
      "Summary",
      "Resumo"
    ],
    [
      "Details",
      "Detalhes"
    ],
    [
      "Quality",
      "Qualidade"
    ],
    [
      "Address",
      "Endereço"
    ],
    [
      "Voltage",
      "Tensão"
    ],
    [
      "Current",
      "Corrente"
    ],
    [
      "Reports",
      "Relatórios"
    ],
    [
      "History",
      "Histórico"
    ],
    [
      "Inspect",
      "Inspecionar"
    ],
    [
      "Execute",
      "Executar"
    ],
    [
      "Operate",
      "Operar"
    ],
    [
      "Confirm",
      "Confirmar"
    ],
    [
      "Preview",
      "Pré-visualização"
    ],
    [
      "Healthy",
      "Íntegro"
    ],
    [
      "Blocked",
      "Bloqueado"
    ],
    [
      "Enabled",
      "Ativado"
    ],
    [
      "Offline",
      "Offline"
    ],
    [
      "Profile",
      "Perfil"
    ],
    [
      "Account",
      "Conta"
    ],
    [
      "Student",
      "Estudante"
    ],
    [
      "Section",
      "Seção"
    ],
    [
      "Actions",
      "Ações"
    ],
    [
      "Objects",
      "Objetos"
    ],
    [
      "Traffic",
      "Tráfego"
    ],
    [
      "Digital",
      "Digital"
    ],
    [
      "Logical",
      "Lógico"
    ],
    [
      "Symptom",
      "Sintoma"
    ],
    [
      "Binding",
      "Vinculação"
    ],
    [
      "Service",
      "Serviço"
    ],
    [
      "Holding",
      "Retenção (Holding)"
    ],
    [
      "Timeout",
      "Tempo Esgotado"
    ],
    [
      "Scaling",
      "Escalonamento"
    ],
    [
      "Segment",
      "Segmento"
    ],
    [
      "Warning",
      "Aviso"
    ],
    [
      "Disable",
      "Desabilitar"
    ],
    [
      "Connect",
      "Conectar"
    ],
    [
      "Restore",
      "Restaurar"
    ],
    [
      "Capture",
      "Capturar"
    ],
    [
      "Monitor",
      "Monitorar"
    ],
    [
      "Trigger",
      "Disparar"
    ],
    [
      "Primary",
      "Primário"
    ],
    [
      "Circuit",
      "Circuito"
    ],
    [
      "Unicast",
      "Unicast"
    ],
    [
      "VLAN ID",
      "ID da VLAN"
    ],
    [
      "Type ID",
      "ID de Tipo"
    ],
    [
      "Derived",
      "Derivado"
    ],
    [
      "Filters",
      "Filtros"
    ],
    [
      "Feeder",
      "Alimentador"
    ],
    [
      "Relays",
      "Relés"
    ],
    [
      "Device",
      "Dispositivo"
    ],
    [
      "Server",
      "Servidor"
    ],
    [
      "Client",
      "Cliente"
    ],
    [
      "Switch",
      "Switch"
    ],
    [
      "Router",
      "Roteador"
    ],
    [
      "Cables",
      "Cabos"
    ],
    [
      "Copper",
      "Cobre"
    ],
    [
      "Signal",
      "Sinal"
    ],
    [
      "Mapped",
      "Mapeado"
    ],
    [
      "Alarms",
      "Alarmes"
    ],
    [
      "Events",
      "Eventos"
    ],
    [
      "Faults",
      "Falhas"
    ],
    [
      "Module",
      "Módulo"
    ],
    [
      "Lesson",
      "Lição"
    ],
    [
      "Answer",
      "Resposta"
    ],
    [
      "Status",
      "Estado"
    ],
    [
      "Values",
      "Valores"
    ],
    [
      "Source",
      "Fonte"
    ],
    [
      "Target",
      "Destino"
    ],
    [
      "Energy",
      "Energia"
    ],
    [
      "Packet",
      "Pacote"
    ],
    [
      "Frames",
      "Quadros"
    ],
    [
      "Report",
      "Relatório"
    ],
    [
      "Camera",
      "Câmera"
    ],
    [
      "Street",
      "Rua"
    ],
    [
      "Closed",
      "Fechado"
    ],
    [
      "Select",
      "Selecionar"
    ],
    [
      "Search",
      "Pesquisar"
    ],
    [
      "Filter",
      "Filtro"
    ],
    [
      "Cancel",
      "Cancelar"
    ],
    [
      "Upload",
      "Enviar"
    ],
    [
      "Export",
      "Exportar"
    ],
    [
      "Toggle",
      "Alternar"
    ],
    [
      "Active",
      "Ativo"
    ],
    [
      "Normal",
      "Estado normal"
    ],
    [
      "Online",
      "Online"
    ],
    [
      "Locked",
      "Bloqueado"
    ],
    [
      "Result",
      "Resultado"
    ],
    [
      "Action",
      "Ação"
    ],
    [
      "System",
      "Sistema"
    ],
    [
      "Object",
      "Objeto"
    ],
    [
      "Resume",
      "Retomar"
    ],
    [
      "Hidden",
      "Oculto"
    ],
    [
      "Tagged",
      "Marcado (Tagged)"
    ],
    [
      "Errors",
      "Erros"
    ],
    [
      "Spring",
      "Mola"
    ],
    [
      "Actual",
      "Real (Atual)"
    ],
    [
      "Verify",
      "Verificar"
    ],
    [
      "Enable",
      "Habilitar"
    ],
    [
      "Inject",
      "Injetar"
    ],
    [
      "Remote",
      "Remoto"
    ],
    [
      "Busbar",
      "Barramento"
    ],
    [
      "Subnet",
      "Sub-rede"
    ],
    [
      "Bus A:",
      "Barra A:"
    ],
    [
      "Bus B:",
      "Barra B:"
    ],
    [
      "Salted",
      "Salgado"
    ],
    [
      "Finish",
      "Concluir"
    ],
    [
      "Relay",
      "Relé"
    ],
    [
      "Ports",
      "Portas"
    ],
    [
      "Cable",
      "Cabo"
    ],
    [
      "Fiber",
      "Fibra"
    ],
    [
      "Alarm",
      "Alarme"
    ],
    [
      "Event",
      "Evento"
    ],
    [
      "Fault",
      "Falha"
    ],
    [
      "Tests",
      "Testes"
    ],
    [
      "State",
      "Estado"
    ],
    [
      "Value",
      "Valor"
    ],
    [
      "Level",
      "Nível"
    ],
    [
      "Power",
      "Potência"
    ],
    [
      "Meter",
      "Medidor"
    ],
    [
      "Frame",
      "Quadro"
    ],
    [
      "House",
      "Casa"
    ],
    [
      "Close",
      "Fechar (Close)"
    ],
    [
      "Reset",
      "Redefinir"
    ],
    [
      "Clear",
      "Limpar"
    ],
    [
      "Print",
      "Imprimir"
    ],
    [
      "Users",
      "Usuários"
    ],
    [
      "Table",
      "Tabela"
    ],
    [
      "Steps",
      "Passos"
    ],
    [
      "Cause",
      "Causa"
    ],
    [
      "Model",
      "Modelo"
    ],
    [
      "Nodes",
      "Nós"
    ],
    [
      "Links",
      "Links"
    ],
    [
      "Paths",
      "Caminhos"
    ],
    [
      "Chain",
      "Cadeia"
    ],
    [
      "Panel",
      "Painel"
    ],
    [
      "Speed",
      "Velocidade"
    ],
    [
      "Click",
      "Clique"
    ],
    [
      "Pause",
      "Pausar"
    ],
    [
      "Actor",
      "Ator"
    ],
    [
      "Class",
      "Classe"
    ],
    [
      "Stack",
      "Pilha (Stack)"
    ],
    [
      "Input",
      "Entrada"
    ],
    [
      "Write",
      "Escrita"
    ],
    [
      "Plane",
      "Plano"
    ],
    [
      "Media",
      "Mídia"
    ],
    [
      "Major",
      "Maior (Major)"
    ],
    [
      "Check",
      "Verificar"
    ],
    [
      "Local",
      "Local (Painel)"
    ],
    [
      "Earth",
      "Terra"
    ],
    [
      "Clock",
      "Relógio"
    ],
    [
      "Match",
      "Corresponder"
    ],
    [
      "Field",
      "Campo"
    ],
    [
      "Labs",
      "Laboratórios"
    ],
    [
      "Port",
      "Porta"
    ],
    [
      "Trip",
      "Disparo"
    ],
    [
      "Test",
      "Teste"
    ],
    [
      "Time",
      "Tempo"
    ],
    [
      "Name",
      "Nome"
    ],
    [
      "Type",
      "Tipo"
    ],
    [
      "Role",
      "Função"
    ],
    [
      "Mode",
      "Modo"
    ],
    [
      "Load",
      "Carga"
    ],
    [
      "Road",
      "Estrada"
    ],
    [
      "Open",
      "Abrir (Open)"
    ],
    [
      "Save",
      "Salvar"
    ],
    [
      "View",
      "Visualizar"
    ],
    [
      "Live",
      "Ao vivo"
    ],
    [
      "User",
      "Usuário"
    ],
    [
      "Step",
      "Passo"
    ],
    [
      "Node",
      "Nó"
    ],
    [
      "Link",
      "Link"
    ],
    [
      "Path",
      "Caminho"
    ],
    [
      "Ring",
      "Anel"
    ],
    [
      "Rack",
      "Rack"
    ],
    [
      "Last",
      "Último"
    ],
    [
      "Full",
      "Completo"
    ],
    [
      "Dual",
      "Duplo"
    ],
    [
      "Dusk",
      "Entardecer"
    ],
    [
      "Code",
      "Código"
    ],
    [
      "Line",
      "Linha"
    ],
    [
      "Rate",
      "Taxa"
    ],
    [
      "Loss",
      "Perda"
    ],
    [
      "Info",
      "Informação"
    ],
    [
      "Case",
      "Caso"
    ],
    [
      "Coil",
      "Bobina"
    ],
    [
      "Bay:",
      "Vão:"
    ],
    [
      "Auth",
      "Autenticação"
    ],
    [
      "Card",
      "Cartão"
    ],
    [
      "Temp",
      "Temp."
    ],
    [
      "Lab",
      "Laboratório"
    ],
    [
      "All",
      "Todos"
    ],
    [
      "New",
      "Novo"
    ],
    [
      "Run",
      "Executar"
    ],
    [
      "Gas",
      "Gás"
    ],
    [
      "Tap",
      "Tape (Derivação)"
    ],
    [
      "Q&A",
      "Perguntas e Respostas (Q&A)"
    ],
    [
      "Bay",
      "Vão (Bay)"
    ],
    [
      "Bus",
      "Barra (Bus)"
    ],
    [
      "Tag",
      "Tag (Etiqueta)"
    ]
  ],
  "KO": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "지원되는 모든 언어에 대해 100% 오프라인 번역이 제공됩니다. 기술 용어와 장치 ID는 유지됩니다."
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "대화형 IPv4 CIDR / VLSM 서브넷 계산기"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Modbus TCP 클라이언트 폴링 구성"
    ],
    [
      "Backplane Module & Slot Configuration",
      "백플레인 모듈 및 슬롯 구성"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — GOOSE 멀티캐스트 (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "대화형 패킷 흐름 애니메이터"
    ],
    [
      "Interactive Single-Line Diagram",
      "대화형 단선 결선도 (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "RCC 상위 원격제어 (Northbound)"
    ],
    [
      "No IEDs match these filters.",
      "이 필터와 일치하는 IED가 없습니다."
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "예상 합격 기준 (Acceptance Criteria)"
    ],
    [
      "Gateway translates MMS → IOA",
      "게이트웨이가 MMS → IOA 변환"
    ],
    [
      "Self-Supervision & Watchdog",
      "자체 감시 및 워치독"
    ],
    [
      "Standard Ports & EtherTypes",
      "표준 포트 및 EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "공장 인수 시험 (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "산업용 이더넷 스위치"
    ],
    [
      "Fault Injection Scenarios",
      "고장 주입 시나리오"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 면접 • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "상태 코드: 정상 (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "테스트 시작 및 SOE 캡처"
    ],
    [
      "Site Acceptance Testing",
      "현장 인수 시험 (SAT)"
    ],
    [
      "State Change Simulation",
      "상태 변경 시뮬레이션"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (TotW / PPV / A 계측):"
    ],
    [
      "Key Takeaways & Checks",
      "핵심 요약 및 점검 사항"
    ],
    [
      "Electrical Connections",
      "전기 연결"
    ],
    [
      "out-of-band management",
      "대역 외 관리"
    ],
    [
      "Derived SCADA 52a/52b:",
      "파생 SCADA 52a/52b:"
    ],
    [
      "General Interrogation",
      "전체 조회 (GI)"
    ],
    [
      "Highlight connections",
      "연결 강조 표시"
    ],
    [
      "Front South Elevation",
      "전면 남측 입면도"
    ],
    [
      "Parameter Description",
      "매개변수 설명"
    ],
    [
      "Checkpoints / Remarks",
      "점검 항목 / 비고"
    ],
    [
      "Gateway IEC 61850 Map",
      "게이트웨이 IEC 61850 맵"
    ],
    [
      "Result & Diagnostics",
      "결과 및 진단"
    ],
    [
      "Terms and Conditions",
      "이용 약관"
    ],
    [
      "Single-Line Diagram",
      "단선 결선도 (SLD)"
    ],
    [
      "Communication Block",
      "통신 차단"
    ],
    [
      "Root Cause Analysis",
      "근본 원인 분석"
    ],
    [
      "Distance Protection",
      "거리 보호"
    ],
    [
      "Industrial Ethernet",
      "산업용 이더넷"
    ],
    [
      "Communication Flow",
      "통신 흐름"
    ],
    [
      "Preferred Language",
      "선호 언어"
    ],
    [
      "PBKDF2 Salted Auth",
      "PBKDF2 솔트 인증"
    ],
    [
      "Signal Description",
      "신호 설명"
    ],
    [
      "Affected Endpoints",
      "영향받는 엔드포인트"
    ],
    [
      "OPERATIONS CONSOLE",
      "운영 콘솔"
    ],
    [
      "Stop highlighting",
      "강조 표시 중지"
    ],
    [
      "Verified Sessions",
      "검증된 세션"
    ],
    [
      "serial connection",
      "시리얼 연결"
    ],
    [
      "Published DataSet",
      "발행된 DataSet"
    ],
    [
      "Southbound Source",
      "하위 소스 (Southbound)"
    ],
    [
      "Loading / Cooling",
      "부하율 / 냉각"
    ],
    [
      "Finish & Evaluate",
      "완료 및 평가"
    ],
    [
      "IEC 61850 Dataset",
      "IEC 61850 데이터셋"
    ],
    [
      "Protection Relay",
      "보호 계전기"
    ],
    [
      "Operator Station",
      "운영자 스테이션"
    ],
    [
      "Topology Summary",
      "토폴로지 요약"
    ],
    [
      "Rollover Console",
      "롤오버 콘솔"
    ],
    [
      "Firewall Cluster",
      "방화벽 클러스터"
    ],
    [
      "Association Loss",
      "연결 손실"
    ],
    [
      "Ethertype Suffix",
      "Ethertype 접미사"
    ],
    [
      "Return to Normal",
      "정상 복귀"
    ],
    [
      "Circuit Breaker",
      "차단기"
    ],
    [
      "Protection Trip",
      "보호 트립"
    ],
    [
      "Addressing Plan",
      "주소 할당 계획"
    ],
    [
      "Live Monitoring",
      "실시간 모니터링"
    ],
    [
      "Troubleshooting",
      "문제 해결"
    ],
    [
      "Display options",
      "표시 옵션"
    ],
    [
      "Synch-Check Ref",
      "동기검정 기준"
    ],
    [
      "IED Connections",
      "IED 연결"
    ],
    [
      "Data Attributes",
      "데이터 속성"
    ],
    [
      "IED INFORMATION",
      "IED 정보"
    ],
    [
      "Sequence Number",
      "시퀀스 번호"
    ],
    [
      "Failed Segments",
      "장애 세그먼트"
    ],
    [
      "Manual Transfer",
      "수동 절체"
    ],
    [
      "Fast Protection",
      "고속 보호"
    ],
    [
      "Timed Evaluator",
      "시간 제한 평가기"
    ],
    [
      "Synchronization",
      "동기화"
    ],
    [
      "Firmware / SCL:",
      "펌웨어 / SCL:"
    ],
    [
      "MMS Association",
      "MMS 연결 (Association)"
    ],
    [
      "SCADA Tag / HMI",
      "SCADA 태그 / HMI"
    ],
    [
      "Retransmission",
      "재전송"
    ],
    [
      "Privacy Policy",
      "개인정보 처리방침"
    ],
    [
      "Distance-Aware",
      "거리 감지형"
    ],
    [
      "LAN Identifier",
      "LAN 식별자"
    ],
    [
      "Reachable IEDs",
      "도달 가능한 IED"
    ],
    [
      "Busbar Section",
      "모선 섹션"
    ],
    [
      "Specialization",
      "전문 분야"
    ],
    [
      "Firmware / SCL",
      "펌웨어 / SCL"
    ],
    [
      "OTI / WTI Temp",
      "OTI / WTI 온도"
    ],
    [
      "IEC 61850 Ref:",
      "IEC 61850 참조:"
    ],
    [
      "Line Isolator",
      "선로 단로기"
    ],
    [
      "Disconnectors",
      "단로기"
    ],
    [
      "Communication",
      "통신"
    ],
    [
      "Configuration",
      "구성"
    ],
    [
      "Commissioning",
      "시운전"
    ],
    [
      "Key Takeaways",
      "핵심 요약"
    ],
    [
      "Derived SCADA",
      "파생 SCADA"
    ],
    [
      "Wildcard Mask",
      "와일드카드 마스크"
    ],
    [
      "Quick Actions",
      "빠른 작업"
    ],
    [
      "Auto-Recloser",
      "자동 재폐로"
    ],
    [
      "Function Code",
      "기능 코드"
    ],
    [
      "Allowed VLANs",
      "허용된 VLAN"
    ],
    [
      "Bus Section A",
      "모선 섹션 A"
    ],
    [
      "Bus Section B",
      "모선 섹션 B"
    ],
    [
      "Preconditions",
      "사전 조건"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (변환)"
    ],
    [
      "52 CB (Dbpos)",
      "52 차단기 (Dbpos)"
    ],
    [
      "Earth Switch",
      "접지 개폐기"
    ],
    [
      "Bus Isolator",
      "모선 단로기"
    ],
    [
      "Bus Transfer",
      "모선 절체"
    ],
    [
      "Transformers",
      "변압기"
    ],
    [
      "Disconnector",
      "단로기"
    ],
    [
      "Interlocking",
      "인터록킹"
    ],
    [
      "Architecture",
      "아키텍처"
    ],
    [
      "Distribution",
      "배전"
    ],
    [
      "Disconnected",
      "연결 끊김"
    ],
    [
      "Night Floods",
      "야간 투광등"
    ],
    [
      "Broadcast IP",
      "브로드캐스트 IP"
    ],
    [
      "Usable Range",
      "사용 가능 범위"
    ],
    [
      "Usable Hosts",
      "사용 가능 호스트"
    ],
    [
      "IED Identity",
      "IED 식별 정보"
    ],
    [
      "Access Ports",
      "액세스 포트"
    ],
    [
      "Input Module",
      "입력 모듈"
    ],
    [
      "Cheat Sheets",
      "핵심 요약표"
    ],
    [
      "Differential",
      "차동 (Differential)"
    ],
    [
      "Synchrocheck",
      "동기검정"
    ],
    [
      "Interruption",
      "중단 시간"
    ],
    [
      "Measurements",
      "계측값"
    ],
    [
      "Transmission",
      "송전/전송"
    ],
    [
      "IEC-104 Link",
      "IEC-104 링크"
    ],
    [
      "CB Pos [ST]:",
      "차단기 위치 [ST]:"
    ],
    [
      "Bus Coupler",
      "모선 연락 차단기"
    ],
    [
      "Execute All",
      "전체 실행"
    ],
    [
      "Engineering",
      "엔지니어링"
    ],
    [
      "Transformer",
      "변압기"
    ],
    [
      "Diagnostics",
      "진단"
    ],
    [
      "Preparation",
      "준비"
    ],
    [
      "Description",
      "설명"
    ],
    [
      "Association",
      "연결"
    ],
    [
      "Certificate",
      "인증서"
    ],
    [
      "Residential",
      "주거용"
    ],
    [
      "WAN Routing",
      "WAN 라우팅"
    ],
    [
      "Comm Health",
      "통신 상태"
    ],
    [
      "Subnet Mask",
      "서브넷 마스크"
    ],
    [
      "Subnet mask",
      "서브넷 마스크"
    ],
    [
      "Phase Shift",
      "위상 변이"
    ],
    [
      "Trunk Ports",
      "트렁크 포트"
    ],
    [
      "Process Bus",
      "프로세스 버스"
    ],
    [
      "Termination",
      "종단 (Termination)"
    ],
    [
      "Maintenance",
      "유지보수"
    ],
    [
      "Explanation",
      "해설"
    ],
    [
      "Supervision",
      "감시"
    ],
    [
      "Workstation",
      "워크스테이션"
    ],
    [
      "Earth Sw Q8",
      "접지 개폐기 Q8"
    ],
    [
      "Telecontrol",
      "원격제어"
    ],
    [
      "Reset View",
      "화면 초기화"
    ],
    [
      "Reset view",
      "화면 초기화"
    ],
    [
      "Substation",
      "변전소"
    ],
    [
      "Automation",
      "자동화"
    ],
    [
      "Laboratory",
      "실험실"
    ],
    [
      "Networking",
      "네트워킹"
    ],
    [
      "Switchyard",
      "스위치야드"
    ],
    [
      "Switchgear",
      "스위치기어"
    ],
    [
      "Protection",
      "보호"
    ],
    [
      "Simulation",
      "시뮬레이션"
    ],
    [
      "Configured",
      "구성됨"
    ],
    [
      "Diagnostic",
      "진단"
    ],
    [
      "Topologies",
      "토폴로지"
    ],
    [
      "Redundancy",
      "이중화"
    ],
    [
      "Interfaces",
      "인터페이스"
    ],
    [
      "Procedures",
      "절차"
    ],
    [
      "Subscriber",
      "구독자"
    ],
    [
      "References",
      "참조"
    ],
    [
      "Industrial",
      "산업용"
    ],
    [
      "Root Cause",
      "근본 원인"
    ],
    [
      "Media Type",
      "미디어 유형"
    ],
    [
      "IEC Legend",
      "IEC 범례"
    ],
    [
      "Op Counter",
      "동작 횟수 카운터"
    ],
    [
      "Reactive Q",
      "무효전력 Q"
    ],
    [
      "Apparent S",
      "피상전력 S"
    ],
    [
      "Topic-wise",
      "주제별"
    ],
    [
      "Forwarding",
      "포워딩"
    ],
    [
      "Permissive",
      "허용 (Permissive)"
    ],
    [
      "Continuity",
      "연속성/도통"
    ],
    [
      "Hypothesis",
      "가설"
    ],
    [
      "Line DS Q9",
      "선로 단로기 Q9"
    ],
    [
      "Northbound",
      "상위 (Northbound)"
    ],
    [
      "Event Log",
      "이벤트 로그"
    ],
    [
      "Key Notes",
      "핵심 노트"
    ],
    [
      "Clear All",
      "전체 지우기"
    ],
    [
      "Next Step",
      "다음 단계"
    ],
    [
      "Workspace",
      "작업 공간"
    ],
    [
      "Academies",
      "아카데미"
    ],
    [
      "Interlock",
      "인터록"
    ],
    [
      "Telemetry",
      "원격 측정"
    ],
    [
      "Simulator",
      "시뮬레이터"
    ],
    [
      "Simulated",
      "시뮬레이션됨"
    ],
    [
      "Protocols",
      "프로토콜"
    ],
    [
      "Equipment",
      "장비"
    ],
    [
      "Interface",
      "인터페이스"
    ],
    [
      "Procedure",
      "절차"
    ],
    [
      "Scenarios",
      "시나리오"
    ],
    [
      "Questions",
      "질문"
    ],
    [
      "Interview",
      "면접"
    ],
    [
      "Timestamp",
      "타임스탬프"
    ],
    [
      "Frequency",
      "주파수"
    ],
    [
      "Registers",
      "레지스터"
    ],
    [
      "Publisher",
      "발행자"
    ],
    [
      "Historian",
      "히스토리언"
    ],
    [
      "Apartment",
      "아파트"
    ],
    [
      "Inspector",
      "검사기"
    ],
    [
      "Downloads",
      "다운로드"
    ],
    [
      "Completed",
      "완료됨"
    ],
    [
      "Permitted",
      "허용됨"
    ],
    [
      "Connected",
      "연결됨"
    ],
    [
      "Multicast",
      "멀티캐스트"
    ],
    [
      "Reference",
      "참조"
    ],
    [
      "Hierarchy",
      "계층"
    ],
    [
      "Technical",
      "기술"
    ],
    [
      "Comm Loss",
      "통신 손실"
    ],
    [
      "Poll Rate",
      "폴링 주기"
    ],
    [
      "Data Type",
      "데이터 유형"
    ],
    [
      "IED Ports",
      "IED 포트"
    ],
    [
      "Hardwired",
      "하드와이어드"
    ],
    [
      "Important",
      "중요"
    ],
    [
      "Endpoints",
      "엔드포인트"
    ],
    [
      "Transport",
      "전송 계층"
    ],
    [
      "Configure",
      "구성"
    ],
    [
      "Energized",
      "가압됨"
    ],
    [
      "Redundant",
      "이중화"
    ],
    [
      "Secondary",
      "2차 (Secondary)"
    ],
    [
      "Broadcast",
      "브로드캐스트"
    ],
    [
      "Mandatory",
      "필수"
    ],
    [
      "Operation",
      "동작/운전"
    ],
    [
      "Switching",
      "개폐 (Switching)"
    ],
    [
      "Auxiliary",
      "보조 (Auxiliary)"
    ],
    [
      "✓ Link Up",
      "✓ 링크 활성 (Up)"
    ],
    [
      "ANSI Code",
      "ANSI 코드"
    ],
    [
      "Pin → pin",
      "핀 → 핀"
    ],
    [
      "Q1 Bus DS",
      "Q1 모선 단로기"
    ],
    [
      "Bus DS Q1",
      "모선 단로기 Q1"
    ],
    [
      "Bay / IED",
      "베이 / IED"
    ],
    [
      "Field I/O",
      "현장 I/O"
    ],
    [
      "(DI Card)",
      "(DI 카드)"
    ],
    [
      "Run Test",
      "테스트 실행"
    ],
    [
      "Zoom out",
      "축소"
    ],
    [
      "Breakers",
      "차단기"
    ],
    [
      "Isolator",
      "단로기"
    ],
    [
      "Controls",
      "제어"
    ],
    [
      "Commands",
      "명령"
    ],
    [
      "Simulate",
      "시뮬레이션"
    ],
    [
      "Protocol",
      "프로토콜"
    ],
    [
      "Settings",
      "설정"
    ],
    [
      "Topology",
      "토폴로지"
    ],
    [
      "Failover",
      "페일오버"
    ],
    [
      "Hardware",
      "하드웨어"
    ],
    [
      "Switches",
      "스위치"
    ],
    [
      "Scenario",
      "시나리오"
    ],
    [
      "Chapters",
      "장"
    ],
    [
      "Diagrams",
      "다이어그램"
    ],
    [
      "Examples",
      "예제"
    ],
    [
      "Question",
      "질문"
    ],
    [
      "Learning",
      "학습"
    ],
    [
      "Practice",
      "실습"
    ],
    [
      "Overview",
      "개요"
    ],
    [
      "Register",
      "레지스터"
    ],
    [
      "Security",
      "보안"
    ],
    [
      "Selected",
      "선택됨"
    ],
    [
      "Download",
      "다운로드"
    ],
    [
      "Complete",
      "완료"
    ],
    [
      "Rejected",
      "거부됨"
    ],
    [
      "Disabled",
      "비활성화됨"
    ],
    [
      "Isolated",
      "격리됨"
    ],
    [
      "Students",
      "학생"
    ],
    [
      "Password",
      "비밀번호"
    ],
    [
      "Progress",
      "진행률"
    ],
    [
      "Sections",
      "섹션"
    ],
    [
      "Evidence",
      "증거"
    ],
    [
      "Physical",
      "물리적"
    ],
    [
      "Previous",
      "이전"
    ],
    [
      "Daylight",
      "주간 (Daylight)"
    ],
    [
      "Endpoint",
      "엔드포인트"
    ],
    [
      "Severity",
      "심각도"
    ],
    [
      "Position",
      "위치/상태"
    ],
    [
      "Critical",
      "치명적 (Critical)"
    ],
    [
      "Category",
      "카테고리"
    ],
    [
      "Expected",
      "예상값"
    ],
    [
      "Operator",
      "운영자"
    ],
    [
      "Mismatch",
      "불일치"
    ],
    [
      "Priority",
      "우선순위"
    ],
    [
      "Transfer",
      "절체/전송"
    ],
    [
      "Sequence",
      "시퀀스"
    ],
    [
      "Overload",
      "과부하"
    ],
    [
      "Recovery",
      "복구"
    ],
    [
      "Terminal",
      "터미널/단자"
    ],
    [
      "Internal",
      "내부"
    ],
    [
      "External",
      "외부"
    ],
    [
      "Wireless",
      "무선"
    ],
    [
      "DataSet:",
      "데이터셋:"
    ],
    [
      "Evaluate",
      "평가"
    ],
    [
      "Zoom in",
      "확대"
    ],
    [
      "Academy",
      "아카데미"
    ],
    [
      "Network",
      "네트워크"
    ],
    [
      "Station",
      "스테이션"
    ],
    [
      "Feeders",
      "피더"
    ],
    [
      "Incomer",
      "수전반"
    ],
    [
      "Breaker",
      "차단기"
    ],
    [
      "Coupler",
      "연락 차단기"
    ],
    [
      "Control",
      "제어"
    ],
    [
      "Command",
      "명령"
    ],
    [
      "Devices",
      "장치"
    ],
    [
      "Servers",
      "서버"
    ],
    [
      "Gateway",
      "게이트웨이"
    ],
    [
      "Optical",
      "광학"
    ],
    [
      "Signals",
      "신호"
    ],
    [
      "Mapping",
      "매핑"
    ],
    [
      "Failure",
      "장애"
    ],
    [
      "Testing",
      "테스팅"
    ],
    [
      "Chapter",
      "장"
    ],
    [
      "Modules",
      "모듈"
    ],
    [
      "Lessons",
      "강의"
    ],
    [
      "Diagram",
      "다이어그램"
    ],
    [
      "Example",
      "예제"
    ],
    [
      "Summary",
      "요약"
    ],
    [
      "Details",
      "상세 정보"
    ],
    [
      "Quality",
      "품질"
    ],
    [
      "Address",
      "주소"
    ],
    [
      "Voltage",
      "전압"
    ],
    [
      "Current",
      "전류"
    ],
    [
      "Reports",
      "보고서"
    ],
    [
      "History",
      "이력"
    ],
    [
      "Inspect",
      "검사"
    ],
    [
      "Execute",
      "실행"
    ],
    [
      "Operate",
      "조작"
    ],
    [
      "Confirm",
      "확인"
    ],
    [
      "Preview",
      "미리보기"
    ],
    [
      "Healthy",
      "정상"
    ],
    [
      "Blocked",
      "차단됨"
    ],
    [
      "Enabled",
      "활성화됨"
    ],
    [
      "Offline",
      "오프라인"
    ],
    [
      "Profile",
      "프로필"
    ],
    [
      "Account",
      "계정"
    ],
    [
      "Student",
      "학생"
    ],
    [
      "Section",
      "섹션"
    ],
    [
      "Actions",
      "작업"
    ],
    [
      "Objects",
      "객체"
    ],
    [
      "Traffic",
      "트래픽"
    ],
    [
      "Digital",
      "디지털"
    ],
    [
      "Logical",
      "논리적"
    ],
    [
      "Symptom",
      "증상"
    ],
    [
      "Binding",
      "바인딩"
    ],
    [
      "Service",
      "서비스"
    ],
    [
      "Holding",
      "홀딩"
    ],
    [
      "Timeout",
      "타임아웃"
    ],
    [
      "Scaling",
      "스케일링"
    ],
    [
      "Segment",
      "세그먼트"
    ],
    [
      "Warning",
      "경고"
    ],
    [
      "Disable",
      "비활성화"
    ],
    [
      "Connect",
      "연결"
    ],
    [
      "Restore",
      "복구"
    ],
    [
      "Capture",
      "캡처"
    ],
    [
      "Monitor",
      "모니터링"
    ],
    [
      "Trigger",
      "트리거"
    ],
    [
      "Primary",
      "1차 (Primary)"
    ],
    [
      "Circuit",
      "회로"
    ],
    [
      "Unicast",
      "유니캐스트"
    ],
    [
      "VLAN ID",
      "VLAN ID (식별자)"
    ],
    [
      "Type ID",
      "유형 ID"
    ],
    [
      "Derived",
      "파생"
    ],
    [
      "Filters",
      "필터"
    ],
    [
      "Feeder",
      "피더"
    ],
    [
      "Relays",
      "계전기"
    ],
    [
      "Device",
      "장치"
    ],
    [
      "Server",
      "서버"
    ],
    [
      "Client",
      "클라이언트"
    ],
    [
      "Switch",
      "스위치"
    ],
    [
      "Router",
      "라우터"
    ],
    [
      "Cables",
      "케이블"
    ],
    [
      "Copper",
      "구리"
    ],
    [
      "Signal",
      "신호"
    ],
    [
      "Mapped",
      "매핑됨"
    ],
    [
      "Alarms",
      "알람"
    ],
    [
      "Events",
      "이벤트"
    ],
    [
      "Faults",
      "고장"
    ],
    [
      "Module",
      "모듈"
    ],
    [
      "Lesson",
      "강의"
    ],
    [
      "Answer",
      "답변"
    ],
    [
      "Status",
      "상태"
    ],
    [
      "Values",
      "값"
    ],
    [
      "Source",
      "소스"
    ],
    [
      "Target",
      "대상"
    ],
    [
      "Energy",
      "에너지"
    ],
    [
      "Packet",
      "패킷"
    ],
    [
      "Frames",
      "프레임"
    ],
    [
      "Report",
      "보고서"
    ],
    [
      "Camera",
      "카메라"
    ],
    [
      "Street",
      "거리"
    ],
    [
      "Closed",
      "닫힘 (Closed)"
    ],
    [
      "Select",
      "선택"
    ],
    [
      "Search",
      "검색"
    ],
    [
      "Filter",
      "필터"
    ],
    [
      "Cancel",
      "취소"
    ],
    [
      "Upload",
      "업로드"
    ],
    [
      "Export",
      "내보내기"
    ],
    [
      "Toggle",
      "전환"
    ],
    [
      "Active",
      "활성"
    ],
    [
      "Normal",
      "정상"
    ],
    [
      "Online",
      "온라인"
    ],
    [
      "Locked",
      "잠김"
    ],
    [
      "Result",
      "결과"
    ],
    [
      "Action",
      "조치"
    ],
    [
      "System",
      "시스템"
    ],
    [
      "Object",
      "객체"
    ],
    [
      "Resume",
      "재개"
    ],
    [
      "Hidden",
      "숨김"
    ],
    [
      "Tagged",
      "태그됨"
    ],
    [
      "Errors",
      "오류"
    ],
    [
      "Spring",
      "스프링"
    ],
    [
      "Actual",
      "실제값"
    ],
    [
      "Verify",
      "검증"
    ],
    [
      "Enable",
      "활성화"
    ],
    [
      "Inject",
      "주입"
    ],
    [
      "Remote",
      "원격 (Remote)"
    ],
    [
      "Busbar",
      "모선 (Busbar)"
    ],
    [
      "Subnet",
      "서브넷"
    ],
    [
      "Bus A:",
      "모선 A:"
    ],
    [
      "Bus B:",
      "모선 B:"
    ],
    [
      "Salted",
      "솔트"
    ],
    [
      "Finish",
      "완료"
    ],
    [
      "Relay",
      "계전기"
    ],
    [
      "Ports",
      "포트"
    ],
    [
      "Cable",
      "케이블"
    ],
    [
      "Fiber",
      "광케이블"
    ],
    [
      "Alarm",
      "알람"
    ],
    [
      "Event",
      "이벤트"
    ],
    [
      "Fault",
      "고장"
    ],
    [
      "Tests",
      "테스트"
    ],
    [
      "State",
      "상태"
    ],
    [
      "Value",
      "값"
    ],
    [
      "Level",
      "레벨"
    ],
    [
      "Power",
      "전력"
    ],
    [
      "Meter",
      "미터"
    ],
    [
      "Frame",
      "프레임"
    ],
    [
      "House",
      "주택"
    ],
    [
      "Close",
      "닫기 (Close)"
    ],
    [
      "Reset",
      "초기화"
    ],
    [
      "Clear",
      "지우기"
    ],
    [
      "Print",
      "인쇄"
    ],
    [
      "Users",
      "사용자"
    ],
    [
      "Table",
      "테이블"
    ],
    [
      "Steps",
      "단계"
    ],
    [
      "Cause",
      "원인"
    ],
    [
      "Model",
      "모델"
    ],
    [
      "Nodes",
      "노드"
    ],
    [
      "Links",
      "링크"
    ],
    [
      "Paths",
      "경로"
    ],
    [
      "Chain",
      "체인"
    ],
    [
      "Panel",
      "패널"
    ],
    [
      "Speed",
      "속도"
    ],
    [
      "Click",
      "클릭"
    ],
    [
      "Pause",
      "일시정지"
    ],
    [
      "Actor",
      "수행 주체"
    ],
    [
      "Class",
      "클래스"
    ],
    [
      "Stack",
      "스택"
    ],
    [
      "Input",
      "입력"
    ],
    [
      "Write",
      "쓰기"
    ],
    [
      "Plane",
      "플레인"
    ],
    [
      "Media",
      "미디어"
    ],
    [
      "Major",
      "주요 (Major)"
    ],
    [
      "Check",
      "점검"
    ],
    [
      "Local",
      "로컬 (현장)"
    ],
    [
      "Earth",
      "접지"
    ],
    [
      "Clock",
      "클록"
    ],
    [
      "Match",
      "일치"
    ],
    [
      "Field",
      "현장 (Field)"
    ],
    [
      "Labs",
      "실습실"
    ],
    [
      "Port",
      "포트"
    ],
    [
      "Trip",
      "트립"
    ],
    [
      "Test",
      "테스트"
    ],
    [
      "Time",
      "시간"
    ],
    [
      "Name",
      "이름"
    ],
    [
      "Type",
      "유형"
    ],
    [
      "Role",
      "역할"
    ],
    [
      "Mode",
      "모드"
    ],
    [
      "Load",
      "부하"
    ],
    [
      "Road",
      "도로"
    ],
    [
      "Open",
      "열기 (Open)"
    ],
    [
      "Save",
      "저장"
    ],
    [
      "View",
      "보기"
    ],
    [
      "Live",
      "실시간"
    ],
    [
      "User",
      "사용자"
    ],
    [
      "Step",
      "단계"
    ],
    [
      "Node",
      "노드"
    ],
    [
      "Link",
      "링크"
    ],
    [
      "Path",
      "경로"
    ],
    [
      "Ring",
      "링"
    ],
    [
      "Rack",
      "랙"
    ],
    [
      "Last",
      "최근"
    ],
    [
      "Full",
      "전체"
    ],
    [
      "Dual",
      "듀얼"
    ],
    [
      "Dusk",
      "황혼 (Dusk)"
    ],
    [
      "Code",
      "코드"
    ],
    [
      "Line",
      "선로"
    ],
    [
      "Rate",
      "속도/율"
    ],
    [
      "Loss",
      "손실"
    ],
    [
      "Info",
      "정보"
    ],
    [
      "Case",
      "케이스"
    ],
    [
      "Coil",
      "코일"
    ],
    [
      "Bay:",
      "베이:"
    ],
    [
      "Auth",
      "인증"
    ],
    [
      "Card",
      "카드"
    ],
    [
      "Temp",
      "온도"
    ],
    [
      "Lab",
      "실습실"
    ],
    [
      "All",
      "전체"
    ],
    [
      "New",
      "새"
    ],
    [
      "Run",
      "실행"
    ],
    [
      "Gas",
      "가스"
    ],
    [
      "Tap",
      "탭 (Tap)"
    ],
    [
      "Q&A",
      "질의응답 (Q&A)"
    ],
    [
      "Bay",
      "베이 (Bay)"
    ],
    [
      "Bus",
      "모선 (Bus)"
    ],
    [
      "Tag",
      "태그"
    ]
  ],
  "FR": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "Traductions 100% hors ligne disponibles pour toutes les langues prises en charge. Les termes techniques restent inchangés."
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "Calculateur de sous-réseau IPv4 CIDR / VLSM interactif"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Configuration d'interrogation client Modbus TCP"
    ],
    [
      "Backplane Module & Slot Configuration",
      "Configuration des modules et emplacements de fond de panier"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — Multidiffusion GOOSE (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "Animateur Interactif de Flux de Paquets"
    ],
    [
      "Interactive Single-Line Diagram",
      "Schéma Unifilaire Interactif (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "Téléconduite amont vers le RCC"
    ],
    [
      "No IEDs match these filters.",
      "Aucun IED ne correspond à ces filtres."
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "CRITÈRES D'ACCEPTATION ATTENDUS"
    ],
    [
      "Gateway translates MMS → IOA",
      "La passerelle traduit MMS → IOA"
    ],
    [
      "Self-Supervision & Watchdog",
      "Auto-surveillance et chien de garde"
    ],
    [
      "Standard Ports & EtherTypes",
      "Ports standards et EtherTypes"
    ],
    [
      "Factory Acceptance Testing",
      "Essais de Réception en Usine (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "Commutateur Ethernet industriel"
    ],
    [
      "Fault Injection Scenarios",
      "Scénarios d'Injection de Défauts"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 Entretiens • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "StatusCode : Bon (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "Démarrer l'essai et capturer SOE"
    ],
    [
      "Site Acceptance Testing",
      "Essais de Réception sur Site (SAT)"
    ],
    [
      "State Change Simulation",
      "Simulation de Changement d'État"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (Mesures TotW / PPV / A) :"
    ],
    [
      "Key Takeaways & Checks",
      "Points clés et vérifications"
    ],
    [
      "Electrical Connections",
      "Connexions électriques"
    ],
    [
      "out-of-band management",
      "gestion hors bande"
    ],
    [
      "Derived SCADA 52a/52b:",
      "SCADA dérivé 52a/52b :"
    ],
    [
      "General Interrogation",
      "Interrogation Générale (GI)"
    ],
    [
      "Highlight connections",
      "Surligner les connexions"
    ],
    [
      "Front South Elevation",
      "Élévation frontale sud"
    ],
    [
      "Parameter Description",
      "Description du paramètre"
    ],
    [
      "Checkpoints / Remarks",
      "Points de contrôle / Remarques"
    ],
    [
      "Gateway IEC 61850 Map",
      "Table IEC 61850 de la passerelle"
    ],
    [
      "Result & Diagnostics",
      "Résultat et Diagnostics"
    ],
    [
      "Terms and Conditions",
      "Conditions générales d'utilisation"
    ],
    [
      "Single-Line Diagram",
      "Schéma Unifilaire (SLD)"
    ],
    [
      "Communication Block",
      "Blocage de communication"
    ],
    [
      "Root Cause Analysis",
      "Analyse de cause racine"
    ],
    [
      "Distance Protection",
      "Protection de distance"
    ],
    [
      "Industrial Ethernet",
      "Ethernet industriel"
    ],
    [
      "Communication Flow",
      "Flux de Communication"
    ],
    [
      "Preferred Language",
      "Langue préférée"
    ],
    [
      "PBKDF2 Salted Auth",
      "Authentification salée PBKDF2"
    ],
    [
      "Signal Description",
      "Description du signal"
    ],
    [
      "Affected Endpoints",
      "Points de terminaison affectés"
    ],
    [
      "OPERATIONS CONSOLE",
      "CONSOLE D'EXPLOITATION"
    ],
    [
      "Stop highlighting",
      "Arrêter le surlignage"
    ],
    [
      "Verified Sessions",
      "Sessions vérifiées"
    ],
    [
      "serial connection",
      "connexion série"
    ],
    [
      "Published DataSet",
      "DataSet publié"
    ],
    [
      "Southbound Source",
      "Source aval (Southbound)"
    ],
    [
      "Loading / Cooling",
      "Charge / Refroidissement"
    ],
    [
      "Finish & Evaluate",
      "Terminer et évaluer"
    ],
    [
      "IEC 61850 Dataset",
      "Jeu de données IEC 61850"
    ],
    [
      "Protection Relay",
      "Relais de Protection"
    ],
    [
      "Operator Station",
      "Poste Opérateur"
    ],
    [
      "Topology Summary",
      "Résumé de la Topologie"
    ],
    [
      "Rollover Console",
      "Console câble inversé"
    ],
    [
      "Firewall Cluster",
      "Cluster de pare-feu"
    ],
    [
      "Association Loss",
      "Perte d'association"
    ],
    [
      "Ethertype Suffix",
      "Suffixe Ethertype"
    ],
    [
      "Return to Normal",
      "Retour à la normale"
    ],
    [
      "Circuit Breaker",
      "Disjoncteur"
    ],
    [
      "Protection Trip",
      "Déclenchement de Protection"
    ],
    [
      "Addressing Plan",
      "Plan d'Adressage"
    ],
    [
      "Live Monitoring",
      "Surveillance en Direct"
    ],
    [
      "Troubleshooting",
      "Dépannage"
    ],
    [
      "Display options",
      "Options d'affichage"
    ],
    [
      "Synch-Check Ref",
      "Réf. contrôle de synchronisme"
    ],
    [
      "IED Connections",
      "Connexions IED"
    ],
    [
      "Data Attributes",
      "Attributs de données"
    ],
    [
      "IED INFORMATION",
      "INFORMATIONS IED"
    ],
    [
      "Sequence Number",
      "Numéro de séquence"
    ],
    [
      "Failed Segments",
      "Segments défaillants"
    ],
    [
      "Manual Transfer",
      "Transfert manuel"
    ],
    [
      "Fast Protection",
      "Protection rapide"
    ],
    [
      "Timed Evaluator",
      "Évaluateur chronométré"
    ],
    [
      "Synchronization",
      "Synchronisation"
    ],
    [
      "Firmware / SCL:",
      "Micrologiciel / SCL :"
    ],
    [
      "MMS Association",
      "Association MMS (TCP/102)"
    ],
    [
      "SCADA Tag / HMI",
      "Tag SCADA / IHM"
    ],
    [
      "Retransmission",
      "Retransmission"
    ],
    [
      "Privacy Policy",
      "Politique de confidentialité"
    ],
    [
      "Distance-Aware",
      "Sensible à la distance"
    ],
    [
      "LAN Identifier",
      "Identifiant LAN"
    ],
    [
      "Reachable IEDs",
      "IED joignables"
    ],
    [
      "Busbar Section",
      "Section de jeu de barres"
    ],
    [
      "Specialization",
      "Spécialisation"
    ],
    [
      "Firmware / SCL",
      "Micrologiciel / SCL"
    ],
    [
      "OTI / WTI Temp",
      "Temp. OTI / WTI"
    ],
    [
      "IEC 61850 Ref:",
      "Réf. IEC 61850 :"
    ],
    [
      "Line Isolator",
      "Sectionneur de Ligne"
    ],
    [
      "Disconnectors",
      "Sectionneurs"
    ],
    [
      "Communication",
      "Communication réseau"
    ],
    [
      "Configuration",
      "Configuration"
    ],
    [
      "Commissioning",
      "Mise en service"
    ],
    [
      "Key Takeaways",
      "Points clés"
    ],
    [
      "Derived SCADA",
      "SCADA dérivé"
    ],
    [
      "Wildcard Mask",
      "Masque générique (Wildcard)"
    ],
    [
      "Quick Actions",
      "Actions rapides"
    ],
    [
      "Auto-Recloser",
      "Réenclencheur automatique"
    ],
    [
      "Function Code",
      "Code de fonction"
    ],
    [
      "Allowed VLANs",
      "VLAN autorisés"
    ],
    [
      "Bus Section A",
      "Section de barre A"
    ],
    [
      "Bus Section B",
      "Section de barre B"
    ],
    [
      "Preconditions",
      "Conditions préalables"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104 (Passerelle)"
    ],
    [
      "52 CB (Dbpos)",
      "52 DJ (Dbpos)"
    ],
    [
      "Earth Switch",
      "Sectionneur de Terre"
    ],
    [
      "Bus Isolator",
      "Sectionneur de Barre"
    ],
    [
      "Bus Transfer",
      "Transfert de Barres"
    ],
    [
      "Transformers",
      "Transformateurs"
    ],
    [
      "Disconnector",
      "Sectionneur"
    ],
    [
      "Interlocking",
      "Verrouillage"
    ],
    [
      "Architecture",
      "Architecture"
    ],
    [
      "Distribution",
      "Distribution"
    ],
    [
      "Disconnected",
      "Déconnecté"
    ],
    [
      "Night Floods",
      "Projecteurs de nuit"
    ],
    [
      "Broadcast IP",
      "IP de diffusion (Broadcast)"
    ],
    [
      "Usable Range",
      "Plage utilisable"
    ],
    [
      "Usable Hosts",
      "Hôtes utilisables"
    ],
    [
      "IED Identity",
      "Identité de l'IED"
    ],
    [
      "Access Ports",
      "Ports d'accès"
    ],
    [
      "Input Module",
      "Module d'entrée"
    ],
    [
      "Cheat Sheets",
      "Fiches mémo"
    ],
    [
      "Differential",
      "Différentiel"
    ],
    [
      "Synchrocheck",
      "Contrôle de synchronisme"
    ],
    [
      "Interruption",
      "Interruption de service"
    ],
    [
      "Measurements",
      "Mesures"
    ],
    [
      "Transmission",
      "Transmission"
    ],
    [
      "IEC-104 Link",
      "Liaison IEC-104"
    ],
    [
      "CB Pos [ST]:",
      "Pos. DJ [ST] :"
    ],
    [
      "Bus Coupler",
      "Couplage de Barres"
    ],
    [
      "Execute All",
      "Tout Exécuter"
    ],
    [
      "Engineering",
      "Ingénierie"
    ],
    [
      "Transformer",
      "Transformateur"
    ],
    [
      "Diagnostics",
      "Diagnostic système"
    ],
    [
      "Preparation",
      "Préparation"
    ],
    [
      "Description",
      "Description"
    ],
    [
      "Association",
      "Association"
    ],
    [
      "Certificate",
      "Certificat"
    ],
    [
      "Residential",
      "Résidentiel"
    ],
    [
      "WAN Routing",
      "Routage WAN"
    ],
    [
      "Comm Health",
      "Santé comm."
    ],
    [
      "Subnet Mask",
      "Masque de sous-réseau"
    ],
    [
      "Subnet mask",
      "Masque de sous-réseau"
    ],
    [
      "Phase Shift",
      "Déphasage"
    ],
    [
      "Trunk Ports",
      "Ports trunk"
    ],
    [
      "Process Bus",
      "Bus de processus"
    ],
    [
      "Termination",
      "Terminaison"
    ],
    [
      "Maintenance",
      "Maintenance préventive"
    ],
    [
      "Explanation",
      "Explication"
    ],
    [
      "Supervision",
      "Supervision"
    ],
    [
      "Workstation",
      "Poste de travail"
    ],
    [
      "Earth Sw Q8",
      "Sectionneur terre Q8"
    ],
    [
      "Telecontrol",
      "Téléconduite"
    ],
    [
      "Reset View",
      "Réinitialiser la Vue"
    ],
    [
      "Reset view",
      "Réinitialiser la vue"
    ],
    [
      "Substation",
      "Poste électrique"
    ],
    [
      "Automation",
      "Automatisation"
    ],
    [
      "Laboratory",
      "Laboratoire"
    ],
    [
      "Networking",
      "Réseautage"
    ],
    [
      "Switchyard",
      "Poste extérieur"
    ],
    [
      "Switchgear",
      "Appareillage"
    ],
    [
      "Protection",
      "Protection"
    ],
    [
      "Simulation",
      "Simulation"
    ],
    [
      "Configured",
      "Configuré"
    ],
    [
      "Diagnostic",
      "Diagnostic"
    ],
    [
      "Topologies",
      "Topologies"
    ],
    [
      "Redundancy",
      "Redondance"
    ],
    [
      "Interfaces",
      "Interfaces"
    ],
    [
      "Procedures",
      "Procédures"
    ],
    [
      "Subscriber",
      "Abonné"
    ],
    [
      "References",
      "Références"
    ],
    [
      "Industrial",
      "Industriel"
    ],
    [
      "Root Cause",
      "Cause racine"
    ],
    [
      "Media Type",
      "Type de média"
    ],
    [
      "IEC Legend",
      "Légende CEI"
    ],
    [
      "Op Counter",
      "Compteur de manœuvres"
    ],
    [
      "Reactive Q",
      "Puissance réactive Q"
    ],
    [
      "Apparent S",
      "Puissance apparente S"
    ],
    [
      "Topic-wise",
      "Par sujet"
    ],
    [
      "Forwarding",
      "acheminement"
    ],
    [
      "Permissive",
      "Permissif"
    ],
    [
      "Continuity",
      "Continuité"
    ],
    [
      "Hypothesis",
      "Hypothèse"
    ],
    [
      "Line DS Q9",
      "Sectionneur ligne Q9"
    ],
    [
      "Northbound",
      "Amont (Northbound)"
    ],
    [
      "Event Log",
      "Journal des Événements"
    ],
    [
      "Key Notes",
      "Notes Clés"
    ],
    [
      "Clear All",
      "Tout Effacer"
    ],
    [
      "Next Step",
      "Étape Suivante"
    ],
    [
      "Workspace",
      "Espace de travail"
    ],
    [
      "Academies",
      "Académies"
    ],
    [
      "Interlock",
      "Verrouillage"
    ],
    [
      "Telemetry",
      "Télémesure"
    ],
    [
      "Simulator",
      "Simulateur"
    ],
    [
      "Simulated",
      "Simulé"
    ],
    [
      "Protocols",
      "Protocoles"
    ],
    [
      "Equipment",
      "Équipement"
    ],
    [
      "Interface",
      "Interface réseau"
    ],
    [
      "Procedure",
      "Procédure"
    ],
    [
      "Scenarios",
      "Scénarios"
    ],
    [
      "Questions",
      "Questions"
    ],
    [
      "Interview",
      "Entretien"
    ],
    [
      "Timestamp",
      "Horodatage"
    ],
    [
      "Frequency",
      "Fréquence"
    ],
    [
      "Registers",
      "Registres"
    ],
    [
      "Publisher",
      "Éditeur"
    ],
    [
      "Historian",
      "Historien"
    ],
    [
      "Apartment",
      "Appartement"
    ],
    [
      "Inspector",
      "Inspecteur"
    ],
    [
      "Downloads",
      "Téléchargements"
    ],
    [
      "Completed",
      "Terminé"
    ],
    [
      "Permitted",
      "Autorisé"
    ],
    [
      "Connected",
      "Connecté"
    ],
    [
      "Multicast",
      "Multidiffusion"
    ],
    [
      "Reference",
      "Référence"
    ],
    [
      "Hierarchy",
      "Hiérarchie"
    ],
    [
      "Technical",
      "Technique"
    ],
    [
      "Comm Loss",
      "Perte de comm."
    ],
    [
      "Poll Rate",
      "Taux d'interrogation"
    ],
    [
      "Data Type",
      "Type de données"
    ],
    [
      "IED Ports",
      "Ports IED"
    ],
    [
      "Hardwired",
      "Câblé en dur"
    ],
    [
      "Important",
      "Important (Critique)"
    ],
    [
      "Endpoints",
      "Points de terminaison"
    ],
    [
      "Transport",
      "Couche Transport"
    ],
    [
      "Configure",
      "Configurer"
    ],
    [
      "Energized",
      "Sous tension"
    ],
    [
      "Redundant",
      "Redondant"
    ],
    [
      "Secondary",
      "Secondaire"
    ],
    [
      "Broadcast",
      "Diffusion (Broadcast)"
    ],
    [
      "Mandatory",
      "Obligatoire"
    ],
    [
      "Operation",
      "Exploitation"
    ],
    [
      "Switching",
      "Manœuvre"
    ],
    [
      "Auxiliary",
      "Auxiliaire"
    ],
    [
      "✓ Link Up",
      "✓ Lien actif"
    ],
    [
      "ANSI Code",
      "Code ANSI (Fonction)"
    ],
    [
      "Pin → pin",
      "Broche → broche"
    ],
    [
      "Q1 Bus DS",
      "Sectionneur barre Q1"
    ],
    [
      "Bus DS Q1",
      "Sectionneur barre Q1"
    ],
    [
      "Bay / IED",
      "Travée / IED"
    ],
    [
      "Field I/O",
      "E/S terrain"
    ],
    [
      "(DI Card)",
      "(Carte DI)"
    ],
    [
      "Run Test",
      "Lancer le Test"
    ],
    [
      "Zoom out",
      "Zoom arrière"
    ],
    [
      "Breakers",
      "Disjoncteurs"
    ],
    [
      "Isolator",
      "Isolateur"
    ],
    [
      "Controls",
      "Commandes"
    ],
    [
      "Commands",
      "Commandes"
    ],
    [
      "Simulate",
      "Simuler"
    ],
    [
      "Protocol",
      "Protocole"
    ],
    [
      "Settings",
      "Paramètres"
    ],
    [
      "Topology",
      "Topologie"
    ],
    [
      "Failover",
      "Basculement"
    ],
    [
      "Hardware",
      "Matériel"
    ],
    [
      "Switches",
      "Commutateurs"
    ],
    [
      "Scenario",
      "Scénario"
    ],
    [
      "Chapters",
      "Chapitres"
    ],
    [
      "Diagrams",
      "Schémas"
    ],
    [
      "Examples",
      "Exemples"
    ],
    [
      "Question",
      "Question"
    ],
    [
      "Learning",
      "Apprentissage"
    ],
    [
      "Practice",
      "Pratique"
    ],
    [
      "Overview",
      "Aperçu"
    ],
    [
      "Register",
      "Registre"
    ],
    [
      "Security",
      "Sécurité"
    ],
    [
      "Selected",
      "Sélectionné"
    ],
    [
      "Download",
      "Télécharger"
    ],
    [
      "Complete",
      "Complet"
    ],
    [
      "Rejected",
      "Rejeté"
    ],
    [
      "Disabled",
      "Désactivé"
    ],
    [
      "Isolated",
      "Isolé"
    ],
    [
      "Students",
      "Étudiants"
    ],
    [
      "Password",
      "Mot de passe"
    ],
    [
      "Progress",
      "Progression"
    ],
    [
      "Sections",
      "Sections"
    ],
    [
      "Evidence",
      "Preuve"
    ],
    [
      "Physical",
      "Physique"
    ],
    [
      "Previous",
      "Précédent"
    ],
    [
      "Daylight",
      "Lumière du jour"
    ],
    [
      "Endpoint",
      "Point de terminaison"
    ],
    [
      "Severity",
      "Sévérité"
    ],
    [
      "Position",
      "Position d'organe"
    ],
    [
      "Critical",
      "Critique"
    ],
    [
      "Category",
      "Catégorie"
    ],
    [
      "Expected",
      "Attendu"
    ],
    [
      "Operator",
      "Opérateur"
    ],
    [
      "Mismatch",
      "Incohérence"
    ],
    [
      "Priority",
      "Priorité"
    ],
    [
      "Transfer",
      "Transfert"
    ],
    [
      "Sequence",
      "Séquence"
    ],
    [
      "Overload",
      "Surcharge"
    ],
    [
      "Recovery",
      "Reprise"
    ],
    [
      "Terminal",
      "Borne / Terminal"
    ],
    [
      "Internal",
      "Interne"
    ],
    [
      "External",
      "Externe"
    ],
    [
      "Wireless",
      "Sans fil"
    ],
    [
      "DataSet:",
      "Jeu de données :"
    ],
    [
      "Evaluate",
      "Évaluer"
    ],
    [
      "Zoom in",
      "Zoom avant"
    ],
    [
      "Academy",
      "Académie"
    ],
    [
      "Network",
      "Réseau"
    ],
    [
      "Station",
      "Poste"
    ],
    [
      "Feeders",
      "Départs"
    ],
    [
      "Incomer",
      "Arrivée"
    ],
    [
      "Breaker",
      "Disjoncteur"
    ],
    [
      "Coupler",
      "Couplage"
    ],
    [
      "Control",
      "Contrôle"
    ],
    [
      "Command",
      "Commande"
    ],
    [
      "Devices",
      "Appareils"
    ],
    [
      "Servers",
      "Serveurs"
    ],
    [
      "Gateway",
      "Passerelle"
    ],
    [
      "Optical",
      "Optique"
    ],
    [
      "Signals",
      "Signaux"
    ],
    [
      "Mapping",
      "Mappage"
    ],
    [
      "Failure",
      "Défaillance"
    ],
    [
      "Testing",
      "Tests"
    ],
    [
      "Chapter",
      "Chapitre"
    ],
    [
      "Modules",
      "Modules"
    ],
    [
      "Lessons",
      "Leçons"
    ],
    [
      "Diagram",
      "Schéma"
    ],
    [
      "Example",
      "Exemple"
    ],
    [
      "Summary",
      "Résumé"
    ],
    [
      "Details",
      "Détails"
    ],
    [
      "Quality",
      "Qualité"
    ],
    [
      "Address",
      "Adresse"
    ],
    [
      "Voltage",
      "Tension"
    ],
    [
      "Current",
      "Courant"
    ],
    [
      "Reports",
      "Rapports"
    ],
    [
      "History",
      "Historique"
    ],
    [
      "Inspect",
      "Inspecter"
    ],
    [
      "Execute",
      "Exécuter"
    ],
    [
      "Operate",
      "Opérer"
    ],
    [
      "Confirm",
      "Confirmer"
    ],
    [
      "Preview",
      "Aperçu"
    ],
    [
      "Healthy",
      "Sain"
    ],
    [
      "Blocked",
      "Bloqué"
    ],
    [
      "Enabled",
      "Activé"
    ],
    [
      "Offline",
      "Hors ligne"
    ],
    [
      "Profile",
      "Profil"
    ],
    [
      "Account",
      "Compte"
    ],
    [
      "Student",
      "Étudiant"
    ],
    [
      "Section",
      "Section de poste"
    ],
    [
      "Actions",
      "Actions opérateur"
    ],
    [
      "Objects",
      "Objets"
    ],
    [
      "Traffic",
      "Trafic"
    ],
    [
      "Digital",
      "Numérique"
    ],
    [
      "Logical",
      "Logique"
    ],
    [
      "Symptom",
      "Symptôme"
    ],
    [
      "Binding",
      "Liaison (Binding)"
    ],
    [
      "Service",
      "Service réseau"
    ],
    [
      "Holding",
      "Maintien (Holding)"
    ],
    [
      "Timeout",
      "Délai d'expiration"
    ],
    [
      "Scaling",
      "Mise à l'échelle"
    ],
    [
      "Segment",
      "Segment réseau"
    ],
    [
      "Warning",
      "Avertissement"
    ],
    [
      "Disable",
      "Désactiver"
    ],
    [
      "Connect",
      "Connecter"
    ],
    [
      "Restore",
      "Restaurer"
    ],
    [
      "Capture",
      "Capturer"
    ],
    [
      "Monitor",
      "Surveiller"
    ],
    [
      "Trigger",
      "Déclencher"
    ],
    [
      "Primary",
      "Primaire"
    ],
    [
      "Circuit",
      "Circuit électrique"
    ],
    [
      "Unicast",
      "Monodiffusion (Unicast)"
    ],
    [
      "VLAN ID",
      "ID de VLAN"
    ],
    [
      "Type ID",
      "ID de type"
    ],
    [
      "Derived",
      "Dérivé"
    ],
    [
      "Filters",
      "Filtres"
    ],
    [
      "Feeder",
      "Départ"
    ],
    [
      "Relays",
      "Relais"
    ],
    [
      "Device",
      "Appareil"
    ],
    [
      "Server",
      "Serveur"
    ],
    [
      "Client",
      "Client réseau"
    ],
    [
      "Switch",
      "Commutateur"
    ],
    [
      "Router",
      "Routeur"
    ],
    [
      "Cables",
      "Câbles"
    ],
    [
      "Copper",
      "Cuivre"
    ],
    [
      "Signal",
      "Signal électrique"
    ],
    [
      "Mapped",
      "Mappé"
    ],
    [
      "Alarms",
      "Alarmes"
    ],
    [
      "Events",
      "Événements"
    ],
    [
      "Faults",
      "Défauts"
    ],
    [
      "Module",
      "Module logique"
    ],
    [
      "Lesson",
      "Leçon"
    ],
    [
      "Answer",
      "Réponse"
    ],
    [
      "Status",
      "État"
    ],
    [
      "Values",
      "Valeurs"
    ],
    [
      "Source",
      "Source d'alimentation"
    ],
    [
      "Target",
      "Cible"
    ],
    [
      "Energy",
      "Énergie"
    ],
    [
      "Packet",
      "Paquet"
    ],
    [
      "Frames",
      "Trames"
    ],
    [
      "Report",
      "Rapport"
    ],
    [
      "Camera",
      "Caméra"
    ],
    [
      "Street",
      "Rue"
    ],
    [
      "Closed",
      "Fermé"
    ],
    [
      "Select",
      "Sélectionner"
    ],
    [
      "Search",
      "Rechercher"
    ],
    [
      "Filter",
      "Filtre"
    ],
    [
      "Cancel",
      "Annuler"
    ],
    [
      "Upload",
      "Téléverser"
    ],
    [
      "Export",
      "Exporter"
    ],
    [
      "Toggle",
      "Basculer"
    ],
    [
      "Active",
      "Actif"
    ],
    [
      "Normal",
      "État normal"
    ],
    [
      "Online",
      "En ligne"
    ],
    [
      "Locked",
      "Verrouillé"
    ],
    [
      "Result",
      "Résultat"
    ],
    [
      "Action",
      "Action opérateur"
    ],
    [
      "System",
      "Système"
    ],
    [
      "Object",
      "Objet"
    ],
    [
      "Resume",
      "Reprendre"
    ],
    [
      "Hidden",
      "Masqué"
    ],
    [
      "Tagged",
      "Étiqueté (Tagged)"
    ],
    [
      "Errors",
      "Erreurs"
    ],
    [
      "Spring",
      "Ressort"
    ],
    [
      "Actual",
      "Réel"
    ],
    [
      "Verify",
      "Vérifier"
    ],
    [
      "Enable",
      "Activer"
    ],
    [
      "Inject",
      "Injecter"
    ],
    [
      "Remote",
      "distant (Télécommande)"
    ],
    [
      "Busbar",
      "Jeu de barres"
    ],
    [
      "Subnet",
      "Sous-réseau"
    ],
    [
      "Bus A:",
      "Barre A :"
    ],
    [
      "Bus B:",
      "Barre B :"
    ],
    [
      "Salted",
      "Salé"
    ],
    [
      "Finish",
      "Terminer"
    ],
    [
      "Relay",
      "Relais"
    ],
    [
      "Ports",
      "Ports réseau"
    ],
    [
      "Cable",
      "Câble"
    ],
    [
      "Fiber",
      "Fibre"
    ],
    [
      "Alarm",
      "Alarme"
    ],
    [
      "Event",
      "Événement"
    ],
    [
      "Fault",
      "Défaut"
    ],
    [
      "Tests",
      "Tests"
    ],
    [
      "State",
      "État"
    ],
    [
      "Value",
      "Valeur"
    ],
    [
      "Level",
      "Niveau"
    ],
    [
      "Power",
      "Puissance"
    ],
    [
      "Meter",
      "Compteur"
    ],
    [
      "Frame",
      "Trame"
    ],
    [
      "House",
      "Maison"
    ],
    [
      "Close",
      "Fermer (Close)"
    ],
    [
      "Reset",
      "Réinitialiser"
    ],
    [
      "Clear",
      "Effacer"
    ],
    [
      "Print",
      "Imprimer"
    ],
    [
      "Users",
      "Utilisateurs"
    ],
    [
      "Table",
      "Tableau"
    ],
    [
      "Steps",
      "Étapes"
    ],
    [
      "Cause",
      "Cause du défaut"
    ],
    [
      "Model",
      "Modèle"
    ],
    [
      "Nodes",
      "Nœuds"
    ],
    [
      "Links",
      "Liens"
    ],
    [
      "Paths",
      "Chemins"
    ],
    [
      "Chain",
      "Chaîne"
    ],
    [
      "Panel",
      "Panneau"
    ],
    [
      "Speed",
      "Vitesse"
    ],
    [
      "Click",
      "Cliquez"
    ],
    [
      "Pause",
      "Mettre en pause"
    ],
    [
      "Actor",
      "Acteur"
    ],
    [
      "Class",
      "Classe logique"
    ],
    [
      "Stack",
      "Pile protocolaire"
    ],
    [
      "Input",
      "Entrée"
    ],
    [
      "Write",
      "Écriture"
    ],
    [
      "Plane",
      "Plan réseau"
    ],
    [
      "Media",
      "Support physique"
    ],
    [
      "Major",
      "Majeur"
    ],
    [
      "Check",
      "Contrôler"
    ],
    [
      "Local",
      "Local (Cellule)"
    ],
    [
      "Earth",
      "Terre"
    ],
    [
      "Clock",
      "Horloge"
    ],
    [
      "Match",
      "Correspondre"
    ],
    [
      "Field",
      "Terrain"
    ],
    [
      "Labs",
      "Laboratoires"
    ],
    [
      "Port",
      "Port réseau"
    ],
    [
      "Trip",
      "Déclenchement"
    ],
    [
      "Test",
      "Essai (Test)"
    ],
    [
      "Time",
      "Temps"
    ],
    [
      "Name",
      "Nom"
    ],
    [
      "Type",
      "Type"
    ],
    [
      "Role",
      "Rôle"
    ],
    [
      "Mode",
      "Mode opératoire"
    ],
    [
      "Load",
      "Charge"
    ],
    [
      "Road",
      "Route"
    ],
    [
      "Open",
      "Ouvrir (Open)"
    ],
    [
      "Save",
      "Enregistrer"
    ],
    [
      "View",
      "Vue"
    ],
    [
      "Live",
      "En direct"
    ],
    [
      "User",
      "Utilisateur"
    ],
    [
      "Step",
      "Étape"
    ],
    [
      "Node",
      "Nœud"
    ],
    [
      "Link",
      "Lien"
    ],
    [
      "Path",
      "Chemin"
    ],
    [
      "Ring",
      "Anneau"
    ],
    [
      "Rack",
      "Baie"
    ],
    [
      "Last",
      "Dernier"
    ],
    [
      "Full",
      "Complet"
    ],
    [
      "Dual",
      "Double"
    ],
    [
      "Dusk",
      "Crépuscule"
    ],
    [
      "Code",
      "Code"
    ],
    [
      "Line",
      "Ligne"
    ],
    [
      "Rate",
      "Débit"
    ],
    [
      "Loss",
      "Perte"
    ],
    [
      "Info",
      "Information"
    ],
    [
      "Case",
      "Cas d'essai"
    ],
    [
      "Coil",
      "Bobine"
    ],
    [
      "Bay:",
      "Travée :"
    ],
    [
      "Auth",
      "Authentification"
    ],
    [
      "Card",
      "Carte"
    ],
    [
      "Temp",
      "Temp."
    ],
    [
      "Lab",
      "Laboratoire"
    ],
    [
      "All",
      "Tous"
    ],
    [
      "New",
      "Nouveau"
    ],
    [
      "Run",
      "Lancer"
    ],
    [
      "Gas",
      "Gaz"
    ],
    [
      "Tap",
      "Prise (Tap)"
    ],
    [
      "Q&A",
      "Questions & Réponses (Q&A)"
    ],
    [
      "Bay",
      "Travée (Bay)"
    ],
    [
      "Bus",
      "Barre (Bus)"
    ],
    [
      "Tag",
      "Étiquette (Tag)"
    ]
  ],
  "JA": [
    [
      "Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.",
      "サポートされている全言語で100%オフライン翻訳が利用可能です。技術用語や機器IDは変更されません。"
    ],
    [
      "Interactive IPv4 CIDR / VLSM Subnet Calculator",
      "インタラクティブ IPv4 CIDR / VLSM サブネット計算機"
    ],
    [
      "Modbus TCP Client Polling Configuration",
      "Modbus TCP クライアントポーリング設定"
    ],
    [
      "Backplane Module & Slot Configuration",
      "バックプレーンモジュール＆スロット構成"
    ],
    [
      "VLAN 20 — GOOSE Multicast (0x88B8)",
      "VLAN 20 — GOOSE マルチキャスト (0x88B8)"
    ],
    [
      "Interactive Packet Flow Animator",
      "インタラクティブ・パケットフロー・アニメーター"
    ],
    [
      "Interactive Single-Line Diagram",
      "インタラクティブ単線結線図 (SLD)"
    ],
    [
      "Northbound Telecontrol to RCC",
      "RCC向け上位遠方監視制御"
    ],
    [
      "No IEDs match these filters.",
      "これらのフィルタに一致するIEDはありません。"
    ],
    [
      "EXPECTED ACCEPTANCE CRITERIA",
      "期待される合格判定基準"
    ],
    [
      "Gateway translates MMS → IOA",
      "ゲートウェイが MMS → IOA 変換"
    ],
    [
      "Self-Supervision & Watchdog",
      "自己監視＆ウォッチドッグ"
    ],
    [
      "Standard Ports & EtherTypes",
      "標準ポート＆EtherType一覧"
    ],
    [
      "Factory Acceptance Testing",
      "工場立会試験 (FAT)"
    ],
    [
      "Industrial Ethernet Switch",
      "産業用イーサネットスイッチ"
    ],
    [
      "Fault Injection Scenarios",
      "故障注入シナリオ"
    ],
    [
      "30 IEC • 20 Int • 30 CCNA",
      "30 IEC • 20 面接 • 30 CCNA"
    ],
    [
      "StatusCode: Good (0x0000)",
      "ステータスコード: 正常 (0x0000)"
    ],
    [
      "Start Test & Capture SOE",
      "テスト開始＆SOE記録"
    ],
    [
      "Site Acceptance Testing",
      "現地立会試験 (SAT)"
    ],
    [
      "State Change Simulation",
      "状態変化シミュレーション"
    ],
    [
      "MMXU1 (TotW / PPV / A):",
      "MMXU1 (TotW / PPV / A 計測):"
    ],
    [
      "Key Takeaways & Checks",
      "重要ポイントと確認事項"
    ],
    [
      "Electrical Connections",
      "電気接続"
    ],
    [
      "out-of-band management",
      "帯域外管理"
    ],
    [
      "Derived SCADA 52a/52b:",
      "派生 SCADA 52a/52b:"
    ],
    [
      "General Interrogation",
      "一括照会・総召喚 (GI)"
    ],
    [
      "Highlight connections",
      "接続をハイライト"
    ],
    [
      "Front South Elevation",
      "正面南側立面図"
    ],
    [
      "Parameter Description",
      "パラメータ説明"
    ],
    [
      "Checkpoints / Remarks",
      "確認項目 / 備考"
    ],
    [
      "Gateway IEC 61850 Map",
      "ゲートウェイ IEC 61850 マップ"
    ],
    [
      "Result & Diagnostics",
      "結果と診断"
    ],
    [
      "Terms and Conditions",
      "利用規約"
    ],
    [
      "Single-Line Diagram",
      "単線結線図 (SLD)"
    ],
    [
      "Communication Block",
      "通信ブロック"
    ],
    [
      "Root Cause Analysis",
      "根本原因分析"
    ],
    [
      "Distance Protection",
      "距離保護"
    ],
    [
      "Industrial Ethernet",
      "産業用イーサネット"
    ],
    [
      "Communication Flow",
      "通信フロー"
    ],
    [
      "Preferred Language",
      "優先言語"
    ],
    [
      "PBKDF2 Salted Auth",
      "PBKDF2 ソルト認証"
    ],
    [
      "Signal Description",
      "信号説明"
    ],
    [
      "Affected Endpoints",
      "影響を受けるエンドポイント"
    ],
    [
      "OPERATIONS CONSOLE",
      "運用コンソール"
    ],
    [
      "Stop highlighting",
      "ハイライト停止"
    ],
    [
      "Verified Sessions",
      "認証済みセッション"
    ],
    [
      "serial connection",
      "シリアル接続"
    ],
    [
      "Published DataSet",
      "パブリッシュDataSet"
    ],
    [
      "Southbound Source",
      "下位ソース"
    ],
    [
      "Loading / Cooling",
      "負荷率 / 冷却"
    ],
    [
      "Finish & Evaluate",
      "完了して評価"
    ],
    [
      "IEC 61850 Dataset",
      "IEC 61850 データセット"
    ],
    [
      "Protection Relay",
      "保護リレー"
    ],
    [
      "Operator Station",
      "オペレーターステーション"
    ],
    [
      "Topology Summary",
      "トポロジ概要"
    ],
    [
      "Rollover Console",
      "ロールオーバーコンソール"
    ],
    [
      "Firewall Cluster",
      "ファイアウォールクラスタ"
    ],
    [
      "Association Loss",
      "アソシエーション喪失"
    ],
    [
      "Ethertype Suffix",
      "Ethertypeサフィックス"
    ],
    [
      "Return to Normal",
      "通常状態へ復帰"
    ],
    [
      "Circuit Breaker",
      "遮断器"
    ],
    [
      "Protection Trip",
      "保護トリップ"
    ],
    [
      "Addressing Plan",
      "アドレス設計表"
    ],
    [
      "Live Monitoring",
      "ライブ監視"
    ],
    [
      "Troubleshooting",
      "トラブルシューティング"
    ],
    [
      "Display options",
      "表示オプション"
    ],
    [
      "Synch-Check Ref",
      "同期検定基準"
    ],
    [
      "IED Connections",
      "IED接続"
    ],
    [
      "Data Attributes",
      "データ属性"
    ],
    [
      "IED INFORMATION",
      "IED情報"
    ],
    [
      "Sequence Number",
      "シーケンス番号"
    ],
    [
      "Failed Segments",
      "障害セグメント"
    ],
    [
      "Manual Transfer",
      "手動切替"
    ],
    [
      "Fast Protection",
      "高速保護"
    ],
    [
      "Timed Evaluator",
      "制限時間付き評価"
    ],
    [
      "Synchronization",
      "同期"
    ],
    [
      "Firmware / SCL:",
      "ファームウェア / SCL:"
    ],
    [
      "MMS Association",
      "MMS アソシエーション"
    ],
    [
      "SCADA Tag / HMI",
      "SCADAタグ / HMI"
    ],
    [
      "Retransmission",
      "再送"
    ],
    [
      "Privacy Policy",
      "プライバシーポリシー"
    ],
    [
      "Distance-Aware",
      "距離連動"
    ],
    [
      "LAN Identifier",
      "LAN識別子"
    ],
    [
      "Reachable IEDs",
      "到達可能IED"
    ],
    [
      "Busbar Section",
      "母線セクション"
    ],
    [
      "Specialization",
      "専門分野"
    ],
    [
      "Firmware / SCL",
      "ファームウェア / SCL"
    ],
    [
      "OTI / WTI Temp",
      "OTI / WTI 温度"
    ],
    [
      "IEC 61850 Ref:",
      "IEC 61850 参照:"
    ],
    [
      "Line Isolator",
      "線路断路器"
    ],
    [
      "Disconnectors",
      "断路器"
    ],
    [
      "Communication",
      "通信"
    ],
    [
      "Configuration",
      "設定・構成"
    ],
    [
      "Commissioning",
      "試運転"
    ],
    [
      "Key Takeaways",
      "重要ポイント"
    ],
    [
      "Derived SCADA",
      "派生SCADA"
    ],
    [
      "Wildcard Mask",
      "ワイルドカードマスク"
    ],
    [
      "Quick Actions",
      "クイックアクション"
    ],
    [
      "Auto-Recloser",
      "自動再閉路"
    ],
    [
      "Function Code",
      "ファンクションコード"
    ],
    [
      "Allowed VLANs",
      "許可VLAN"
    ],
    [
      "Bus Section A",
      "母線セクションA"
    ],
    [
      "Bus Section B",
      "母線セクションB"
    ],
    [
      "Preconditions",
      "前提条件"
    ],
    [
      "MMS → IEC 104",
      "MMS → IEC 104（変換）"
    ],
    [
      "52 CB (Dbpos)",
      "52 遮断器 (Dbpos)"
    ],
    [
      "Earth Switch",
      "接地開閉器"
    ],
    [
      "Bus Isolator",
      "母線断路器"
    ],
    [
      "Bus Transfer",
      "母線切替"
    ],
    [
      "Transformers",
      "変圧器"
    ],
    [
      "Disconnector",
      "断路器"
    ],
    [
      "Interlocking",
      "インターロック"
    ],
    [
      "Architecture",
      "アーキテクチャ"
    ],
    [
      "Distribution",
      "配電"
    ],
    [
      "Disconnected",
      "切断"
    ],
    [
      "Night Floods",
      "夜間投光照明"
    ],
    [
      "Broadcast IP",
      "ブロードキャストIP"
    ],
    [
      "Usable Range",
      "使用可能範囲"
    ],
    [
      "Usable Hosts",
      "使用可能ホスト数"
    ],
    [
      "IED Identity",
      "IED識別情報"
    ],
    [
      "Access Ports",
      "アクセスポート"
    ],
    [
      "Input Module",
      "入力モジュール"
    ],
    [
      "Cheat Sheets",
      "チートシート"
    ],
    [
      "Differential",
      "差動"
    ],
    [
      "Synchrocheck",
      "同期検定"
    ],
    [
      "Interruption",
      "瞬断時間"
    ],
    [
      "Measurements",
      "計測値"
    ],
    [
      "Transmission",
      "送電・伝送"
    ],
    [
      "IEC-104 Link",
      "IEC-104 リンク"
    ],
    [
      "CB Pos [ST]:",
      "遮断器位置 [ST]:"
    ],
    [
      "Bus Coupler",
      "母線連絡遮断器"
    ],
    [
      "Execute All",
      "すべて実行"
    ],
    [
      "Engineering",
      "エンジニアリング"
    ],
    [
      "Transformer",
      "変圧器"
    ],
    [
      "Diagnostics",
      "診断"
    ],
    [
      "Preparation",
      "対策・準備"
    ],
    [
      "Description",
      "説明"
    ],
    [
      "Association",
      "アソシエーション"
    ],
    [
      "Certificate",
      "証明書"
    ],
    [
      "Residential",
      "住宅"
    ],
    [
      "WAN Routing",
      "WANルーティング"
    ],
    [
      "Comm Health",
      "通信健全性"
    ],
    [
      "Subnet Mask",
      "サブネットマスク"
    ],
    [
      "Subnet mask",
      "サブネットマスク"
    ],
    [
      "Phase Shift",
      "位相シフト"
    ],
    [
      "Trunk Ports",
      "トランクポート"
    ],
    [
      "Process Bus",
      "プロセスバス"
    ],
    [
      "Termination",
      "終端"
    ],
    [
      "Maintenance",
      "保守・メンテナンス"
    ],
    [
      "Explanation",
      "解説"
    ],
    [
      "Supervision",
      "監視"
    ],
    [
      "Workstation",
      "ワークステーション"
    ],
    [
      "Earth Sw Q8",
      "接地開閉器 Q8"
    ],
    [
      "Telecontrol",
      "遠方監視制御"
    ],
    [
      "Reset View",
      "表示をリセット"
    ],
    [
      "Reset view",
      "表示をリセット"
    ],
    [
      "Substation",
      "変電所"
    ],
    [
      "Automation",
      "オートメーション"
    ],
    [
      "Laboratory",
      "ラボ"
    ],
    [
      "Networking",
      "ネットワーキング"
    ],
    [
      "Switchyard",
      "スイッチヤード"
    ],
    [
      "Switchgear",
      "スイッチギヤ"
    ],
    [
      "Protection",
      "保護"
    ],
    [
      "Simulation",
      "シミュレーション"
    ],
    [
      "Configured",
      "構成済"
    ],
    [
      "Diagnostic",
      "診断"
    ],
    [
      "Topologies",
      "トポロジ"
    ],
    [
      "Redundancy",
      "冗長성"
    ],
    [
      "Interfaces",
      "インターフェース"
    ],
    [
      "Procedures",
      "手順"
    ],
    [
      "Subscriber",
      "サブスクライバー"
    ],
    [
      "References",
      "参照"
    ],
    [
      "Industrial",
      "産業用"
    ],
    [
      "Root Cause",
      "根本原因"
    ],
    [
      "Media Type",
      "メディア種別"
    ],
    [
      "IEC Legend",
      "IEC凡例"
    ],
    [
      "Op Counter",
      "動作回数カウンタ"
    ],
    [
      "Reactive Q",
      "無効電力 Q"
    ],
    [
      "Apparent S",
      "皮相電力 S"
    ],
    [
      "Topic-wise",
      "トピック別"
    ],
    [
      "Forwarding",
      "転送"
    ],
    [
      "Permissive",
      "許可（パーミッシブ）"
    ],
    [
      "Continuity",
      "導通・連続性"
    ],
    [
      "Hypothesis",
      "仮説"
    ],
    [
      "Line DS Q9",
      "線路断路器 Q9"
    ],
    [
      "Northbound",
      "上位 (Northbound)"
    ],
    [
      "Event Log",
      "イベントログ"
    ],
    [
      "Key Notes",
      "重要ノート"
    ],
    [
      "Clear All",
      "すべてクリア"
    ],
    [
      "Next Step",
      "次のステップ"
    ],
    [
      "Workspace",
      "ワークスペース"
    ],
    [
      "Academies",
      "アカデミー"
    ],
    [
      "Interlock",
      "インターロック"
    ],
    [
      "Telemetry",
      "テレメトリ"
    ],
    [
      "Simulator",
      "シミュレータ"
    ],
    [
      "Simulated",
      "シミュレート済"
    ],
    [
      "Protocols",
      "プロトコル"
    ],
    [
      "Equipment",
      "機器"
    ],
    [
      "Interface",
      "インターフェース"
    ],
    [
      "Procedure",
      "手順"
    ],
    [
      "Scenarios",
      "シナリオ"
    ],
    [
      "Questions",
      "質問"
    ],
    [
      "Interview",
      "面接"
    ],
    [
      "Timestamp",
      "タイムスタンプ"
    ],
    [
      "Frequency",
      "周波数"
    ],
    [
      "Registers",
      "レジスタ"
    ],
    [
      "Publisher",
      "パブリッシャー"
    ],
    [
      "Historian",
      "ヒストリアン"
    ],
    [
      "Apartment",
      "マンション・アパート"
    ],
    [
      "Inspector",
      "インスペクター"
    ],
    [
      "Downloads",
      "ダウンロード"
    ],
    [
      "Completed",
      "完了"
    ],
    [
      "Permitted",
      "許可"
    ],
    [
      "Connected",
      "接続済"
    ],
    [
      "Multicast",
      "マルチキャスト"
    ],
    [
      "Reference",
      "参照"
    ],
    [
      "Hierarchy",
      "階層"
    ],
    [
      "Technical",
      "技術"
    ],
    [
      "Comm Loss",
      "通信喪失"
    ],
    [
      "Poll Rate",
      "ポーリング周期"
    ],
    [
      "Data Type",
      "データ型"
    ],
    [
      "IED Ports",
      "IEDポート"
    ],
    [
      "Hardwired",
      "ハードワイヤード"
    ],
    [
      "Important",
      "重要"
    ],
    [
      "Endpoints",
      "エンドポイント"
    ],
    [
      "Transport",
      "トランスポート"
    ],
    [
      "Configure",
      "設定"
    ],
    [
      "Energized",
      "充電中"
    ],
    [
      "Redundant",
      "冗長"
    ],
    [
      "Secondary",
      "二次"
    ],
    [
      "Broadcast",
      "ブロードキャスト"
    ],
    [
      "Mandatory",
      "必須"
    ],
    [
      "Operation",
      "操作・動作"
    ],
    [
      "Switching",
      "開閉操作"
    ],
    [
      "Auxiliary",
      "補助"
    ],
    [
      "✓ Link Up",
      "✓ リンク確立 (Up)"
    ],
    [
      "ANSI Code",
      "ANSIコード"
    ],
    [
      "Pin → pin",
      "ピン → ピン"
    ],
    [
      "Q1 Bus DS",
      "Q1 母線断路器"
    ],
    [
      "Bus DS Q1",
      "母線断路器 Q1"
    ],
    [
      "Bay / IED",
      "ベイ / IED"
    ],
    [
      "Field I/O",
      "フィールド I/O"
    ],
    [
      "(DI Card)",
      "(DIカード)"
    ],
    [
      "Run Test",
      "テスト実行"
    ],
    [
      "Zoom out",
      "縮小"
    ],
    [
      "Breakers",
      "遮断器"
    ],
    [
      "Isolator",
      "断路器"
    ],
    [
      "Controls",
      "コントロール"
    ],
    [
      "Commands",
      "コマンド"
    ],
    [
      "Simulate",
      "シミュレート"
    ],
    [
      "Protocol",
      "プロトコル"
    ],
    [
      "Settings",
      "設定"
    ],
    [
      "Topology",
      "トポロジ"
    ],
    [
      "Failover",
      "フェイルオーバー"
    ],
    [
      "Hardware",
      "ハードウェア"
    ],
    [
      "Switches",
      "スイッチ"
    ],
    [
      "Scenario",
      "シナリオ"
    ],
    [
      "Chapters",
      "チャプター"
    ],
    [
      "Diagrams",
      "ダイアグラム"
    ],
    [
      "Examples",
      "実例"
    ],
    [
      "Question",
      "質問"
    ],
    [
      "Learning",
      "学習"
    ],
    [
      "Practice",
      "実習"
    ],
    [
      "Overview",
      "概要"
    ],
    [
      "Register",
      "レジスタ"
    ],
    [
      "Security",
      "セキュリティ"
    ],
    [
      "Selected",
      "選択中"
    ],
    [
      "Download",
      "ダウンロード"
    ],
    [
      "Complete",
      "完全"
    ],
    [
      "Rejected",
      "拒否"
    ],
    [
      "Disabled",
      "無効"
    ],
    [
      "Isolated",
      "隔離済"
    ],
    [
      "Students",
      "受講生"
    ],
    [
      "Password",
      "パスワード"
    ],
    [
      "Progress",
      "進捗"
    ],
    [
      "Sections",
      "セクション"
    ],
    [
      "Evidence",
      "エビデンス"
    ],
    [
      "Physical",
      "物理"
    ],
    [
      "Previous",
      "前へ"
    ],
    [
      "Daylight",
      "昼光"
    ],
    [
      "Endpoint",
      "エンドポイント"
    ],
    [
      "Severity",
      "重要度"
    ],
    [
      "Position",
      "位置・状態"
    ],
    [
      "Critical",
      "重大（クリティカル）"
    ],
    [
      "Category",
      "カテゴリ"
    ],
    [
      "Expected",
      "期待値"
    ],
    [
      "Operator",
      "オペレーター"
    ],
    [
      "Mismatch",
      "不一致"
    ],
    [
      "Priority",
      "優先度"
    ],
    [
      "Transfer",
      "切替・転送"
    ],
    [
      "Sequence",
      "シーケンス"
    ],
    [
      "Overload",
      "過負荷"
    ],
    [
      "Recovery",
      "復旧"
    ],
    [
      "Terminal",
      "端子・ターミナル"
    ],
    [
      "Internal",
      "内部"
    ],
    [
      "External",
      "外部"
    ],
    [
      "Wireless",
      "無線"
    ],
    [
      "DataSet:",
      "データセット:"
    ],
    [
      "Evaluate",
      "評価"
    ],
    [
      "Zoom in",
      "拡大"
    ],
    [
      "Academy",
      "アカデミー"
    ],
    [
      "Network",
      "ネットワーク"
    ],
    [
      "Station",
      "ステーション"
    ],
    [
      "Feeders",
      "フィーダ"
    ],
    [
      "Incomer",
      "受電"
    ],
    [
      "Breaker",
      "遮断器"
    ],
    [
      "Coupler",
      "連絡遮断器"
    ],
    [
      "Control",
      "制御"
    ],
    [
      "Command",
      "コマンド"
    ],
    [
      "Devices",
      "デバイス"
    ],
    [
      "Servers",
      "サーバー"
    ],
    [
      "Gateway",
      "ゲートウェイ"
    ],
    [
      "Optical",
      "光"
    ],
    [
      "Signals",
      "信号"
    ],
    [
      "Mapping",
      "マッピング"
    ],
    [
      "Failure",
      "障害"
    ],
    [
      "Testing",
      "テスト"
    ],
    [
      "Chapter",
      "チャプター"
    ],
    [
      "Modules",
      "モジュール"
    ],
    [
      "Lessons",
      "レッスン"
    ],
    [
      "Diagram",
      "ダイアグラム"
    ],
    [
      "Example",
      "例"
    ],
    [
      "Summary",
      "概要"
    ],
    [
      "Details",
      "詳細"
    ],
    [
      "Quality",
      "品質"
    ],
    [
      "Address",
      "アドレス"
    ],
    [
      "Voltage",
      "電圧"
    ],
    [
      "Current",
      "電流"
    ],
    [
      "Reports",
      "レポート"
    ],
    [
      "History",
      "履歴"
    ],
    [
      "Inspect",
      "検査・確認"
    ],
    [
      "Execute",
      "実行"
    ],
    [
      "Operate",
      "操作"
    ],
    [
      "Confirm",
      "確認"
    ],
    [
      "Preview",
      "プレビュー"
    ],
    [
      "Healthy",
      "正常"
    ],
    [
      "Blocked",
      "ブロック済"
    ],
    [
      "Enabled",
      "有効"
    ],
    [
      "Offline",
      "オフライン"
    ],
    [
      "Profile",
      "プロフィール"
    ],
    [
      "Account",
      "アカウント"
    ],
    [
      "Student",
      "受講生"
    ],
    [
      "Section",
      "セクション"
    ],
    [
      "Actions",
      "アクション"
    ],
    [
      "Objects",
      "オブジェクト"
    ],
    [
      "Traffic",
      "トラフィック"
    ],
    [
      "Digital",
      "デジタル"
    ],
    [
      "Logical",
      "論理"
    ],
    [
      "Symptom",
      "症状"
    ],
    [
      "Binding",
      "バインディング"
    ],
    [
      "Service",
      "サービス"
    ],
    [
      "Holding",
      "保持（ホールディング）"
    ],
    [
      "Timeout",
      "タイムアウト"
    ],
    [
      "Scaling",
      "スケーリング"
    ],
    [
      "Segment",
      "セグメント"
    ],
    [
      "Warning",
      "警告"
    ],
    [
      "Disable",
      "無効化"
    ],
    [
      "Connect",
      "接続"
    ],
    [
      "Restore",
      "復旧"
    ],
    [
      "Capture",
      "キャプチャ"
    ],
    [
      "Monitor",
      "監視"
    ],
    [
      "Trigger",
      "トリガー"
    ],
    [
      "Primary",
      "一次"
    ],
    [
      "Circuit",
      "回路"
    ],
    [
      "Unicast",
      "ユニキャスト"
    ],
    [
      "VLAN ID",
      "VLAN ID（識別子）"
    ],
    [
      "Type ID",
      "タイプID"
    ],
    [
      "Derived",
      "派生"
    ],
    [
      "Filters",
      "フィルタ"
    ],
    [
      "Feeder",
      "フィーダ"
    ],
    [
      "Relays",
      "リレー"
    ],
    [
      "Device",
      "デバイス"
    ],
    [
      "Server",
      "サーバー"
    ],
    [
      "Client",
      "クライアント"
    ],
    [
      "Switch",
      "スイッチ"
    ],
    [
      "Router",
      "ルーター"
    ],
    [
      "Cables",
      "ケーブル"
    ],
    [
      "Copper",
      "銅線"
    ],
    [
      "Signal",
      "信号"
    ],
    [
      "Mapped",
      "マッピング済"
    ],
    [
      "Alarms",
      "アラーム"
    ],
    [
      "Events",
      "イベント"
    ],
    [
      "Faults",
      "故障・フォルト"
    ],
    [
      "Module",
      "モジュール"
    ],
    [
      "Lesson",
      "レッスン"
    ],
    [
      "Answer",
      "回答"
    ],
    [
      "Status",
      "ステータス"
    ],
    [
      "Values",
      "値"
    ],
    [
      "Source",
      "ソース"
    ],
    [
      "Target",
      "ターゲット"
    ],
    [
      "Energy",
      "エネルギー"
    ],
    [
      "Packet",
      "パケット"
    ],
    [
      "Frames",
      "フレーム"
    ],
    [
      "Report",
      "レポート"
    ],
    [
      "Camera",
      "カメラ"
    ],
    [
      "Street",
      "通り"
    ],
    [
      "Closed",
      "投入・閉 (Closed)"
    ],
    [
      "Select",
      "選択"
    ],
    [
      "Search",
      "検索"
    ],
    [
      "Filter",
      "フィルタ"
    ],
    [
      "Cancel",
      "キャンセル"
    ],
    [
      "Upload",
      "アップロード"
    ],
    [
      "Export",
      "エクスポート"
    ],
    [
      "Toggle",
      "切替"
    ],
    [
      "Active",
      "アクティブ"
    ],
    [
      "Normal",
      "通常"
    ],
    [
      "Online",
      "オンライン"
    ],
    [
      "Locked",
      "ロック済"
    ],
    [
      "Result",
      "結果"
    ],
    [
      "Action",
      "アクション"
    ],
    [
      "System",
      "システム"
    ],
    [
      "Object",
      "オブジェクト"
    ],
    [
      "Resume",
      "再開"
    ],
    [
      "Hidden",
      "非表示"
    ],
    [
      "Tagged",
      "タグ付"
    ],
    [
      "Errors",
      "エラー"
    ],
    [
      "Spring",
      "ばね（スプリング）"
    ],
    [
      "Actual",
      "実測値"
    ],
    [
      "Verify",
      "確認・検証"
    ],
    [
      "Enable",
      "有効化"
    ],
    [
      "Inject",
      "注入"
    ],
    [
      "Remote",
      "リモート（遠方）"
    ],
    [
      "Busbar",
      "母線"
    ],
    [
      "Subnet",
      "サブネット"
    ],
    [
      "Bus A:",
      "母線A:"
    ],
    [
      "Bus B:",
      "母線B:"
    ],
    [
      "Salted",
      "ソルト"
    ],
    [
      "Finish",
      "完了"
    ],
    [
      "Relay",
      "リレー"
    ],
    [
      "Ports",
      "ポート"
    ],
    [
      "Cable",
      "ケーブル"
    ],
    [
      "Fiber",
      "光ファイバ"
    ],
    [
      "Alarm",
      "アラーム"
    ],
    [
      "Event",
      "イベント"
    ],
    [
      "Fault",
      "故障・フォルト"
    ],
    [
      "Tests",
      "テスト"
    ],
    [
      "State",
      "状態"
    ],
    [
      "Value",
      "値"
    ],
    [
      "Level",
      "レベル"
    ],
    [
      "Power",
      "電力"
    ],
    [
      "Meter",
      "メーター"
    ],
    [
      "Frame",
      "フレーム"
    ],
    [
      "House",
      "住宅"
    ],
    [
      "Close",
      "閉じる (Close)"
    ],
    [
      "Reset",
      "リセット"
    ],
    [
      "Clear",
      "クリア"
    ],
    [
      "Print",
      "印刷"
    ],
    [
      "Users",
      "ユーザー"
    ],
    [
      "Table",
      "テーブル"
    ],
    [
      "Steps",
      "ステップ"
    ],
    [
      "Cause",
      "原因"
    ],
    [
      "Model",
      "モデル"
    ],
    [
      "Nodes",
      "ノード"
    ],
    [
      "Links",
      "リンク"
    ],
    [
      "Paths",
      "経路"
    ],
    [
      "Chain",
      "チェーン"
    ],
    [
      "Panel",
      "パネル"
    ],
    [
      "Speed",
      "速度"
    ],
    [
      "Click",
      "クリック"
    ],
    [
      "Pause",
      "一時停止"
    ],
    [
      "Actor",
      "アクター"
    ],
    [
      "Class",
      "クラス"
    ],
    [
      "Stack",
      "スタック"
    ],
    [
      "Input",
      "入力"
    ],
    [
      "Write",
      "書込"
    ],
    [
      "Plane",
      "プレーン"
    ],
    [
      "Media",
      "メディア"
    ],
    [
      "Major",
      " 주요（メジャー）"
    ],
    [
      "Check",
      "チェック"
    ],
    [
      "Local",
      "ローカル（現地）"
    ],
    [
      "Earth",
      "接地"
    ],
    [
      "Clock",
      "クロック"
    ],
    [
      "Match",
      "一致"
    ],
    [
      "Field",
      "フィールド"
    ],
    [
      "Labs",
      "ラボ"
    ],
    [
      "Port",
      "ポート"
    ],
    [
      "Trip",
      "トリップ"
    ],
    [
      "Test",
      "テスト"
    ],
    [
      "Time",
      "時間"
    ],
    [
      "Name",
      "名前"
    ],
    [
      "Type",
      "タイプ"
    ],
    [
      "Role",
      "役割"
    ],
    [
      "Mode",
      "モード"
    ],
    [
      "Load",
      "負荷"
    ],
    [
      "Road",
      "道路"
    ],
    [
      "Open",
      "開く (Open)"
    ],
    [
      "Save",
      "保存"
    ],
    [
      "View",
      "表示"
    ],
    [
      "Live",
      "ライブ"
    ],
    [
      "User",
      "ユーザー"
    ],
    [
      "Step",
      "ステップ"
    ],
    [
      "Node",
      "ノード"
    ],
    [
      "Link",
      "リンク"
    ],
    [
      "Path",
      "経路"
    ],
    [
      "Ring",
      "リング"
    ],
    [
      "Rack",
      "ラック"
    ],
    [
      "Last",
      "最終"
    ],
    [
      "Full",
      "フル"
    ],
    [
      "Dual",
      "デュアル"
    ],
    [
      "Dusk",
      "夕暮れ"
    ],
    [
      "Code",
      "コード"
    ],
    [
      "Line",
      "線路"
    ],
    [
      "Rate",
      "レート"
    ],
    [
      "Loss",
      "損失"
    ],
    [
      "Info",
      "情報"
    ],
    [
      "Case",
      "ケース"
    ],
    [
      "Coil",
      "コイル"
    ],
    [
      "Bay:",
      "ベイ:"
    ],
    [
      "Auth",
      "認証"
    ],
    [
      "Card",
      "カード"
    ],
    [
      "Temp",
      "温度"
    ],
    [
      "Lab",
      "ラボ"
    ],
    [
      "All",
      "すべて"
    ],
    [
      "New",
      "新規"
    ],
    [
      "Run",
      "実行"
    ],
    [
      "Gas",
      "ガス"
    ],
    [
      "Tap",
      "タップ"
    ],
    [
      "Q&A",
      "一問一答 (Q&A)"
    ],
    [
      "Bay",
      "ベイ (Bay)"
    ],
    [
      "Bus",
      "母線 (Bus)"
    ],
    [
      "Tag",
      "タグ"
    ]
  ]
};

// Build runtime index of authored Telugu pairs from project data files
const REVERSE_UI_MAP = new Map<string, string>();
for (const [enKey, langMap] of Object.entries(UI_TRANSLATIONS)) {
  const normEn = enKey.replace(/\s+/g, ' ').trim();
  for (const val of Object.values(langMap)) {
    if (val) REVERSE_UI_MAP.set(val.replace(/\s+/g, ' ').trim(), normEn);
  }
}

const AUTHORED_TE_MAP = new Map<string, string>();
function registerTePair(en?: string, te?: string) {
  if (!en || !te) return;
  const k = en.replace(/\s+/g, ' ').trim();
  const v = te.replace(/\s+/g, ' ').trim();
  if (k && v && k !== v) AUTHORED_TE_MAP.set(k, v);
}


// Collect authored pairs in nested data, including aligned paragraph/step arrays.
function registerRecursiveTePairs(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) registerRecursiveTePairs(item, seen);
    return;
  }

  const record = value as Record<string, unknown>;
  const registerValues = (en: unknown, te: unknown): void => {
    if (typeof en === 'string' && typeof te === 'string') {
      registerTePair(en, te);
    } else if (Array.isArray(en) && Array.isArray(te)) {
      en.forEach((item, index) => {
        if (typeof item === 'string' && typeof te[index] === 'string') {
          registerTePair(item, te[index]);
        }
      });
    }
  };

  // CCNA key concepts and command explanations use plain en/te fields.
  registerValues(record.en, record.te);
  for (const [key, translated] of Object.entries(record)) {
    const suffix = key.endsWith('Telugu') ? 'Telugu' : key.endsWith('Te') ? 'Te' : null;
    if (suffix) {
      const base = key.slice(0, -suffix.length);
      registerValues(record[base + 'En'] ?? record[base], translated);
    }
    registerRecursiveTePairs(translated, seen);
  }
}

try {
  for (const ch of IEC61850_ACADEMY_CHAPTERS || []) {
    registerTePair(ch.titleEn, ch.titleTe);
    registerTePair(ch.subtitleEn, ch.subtitleTe);
    registerTePair(ch.workedExample.titleEn, ch.workedExample.titleTe);
    for (const sec of ch.sections || []) {
      registerTePair(sec.headingEn, sec.headingTe);
      (sec.bodyEn || []).forEach((p, idx) => registerTePair(p, sec.bodyTe?.[idx]));
    }
    (ch.workedExample.stepsEn || []).forEach((s, idx) => registerTePair(s, ch.workedExample.stepsTe?.[idx]));
    (ch.commonMistakesEn || []).forEach((m, idx) => registerTePair(m, ch.commonMistakesTe?.[idx]));
    for (const ts of ch.troubleshooting || []) {
      registerTePair(ts.symptomEn, ts.symptomTe);
      registerTePair(ts.causeEn, ts.causeTe);
      registerTePair(ts.diagnosticCheckEn, ts.diagnosticCheckTe);
      registerTePair(ts.correctiveActionEn, ts.correctiveActionTe);
      registerTePair(ts.validationEn, ts.validationTe);
    }
    for (const iq of ch.interviewPreview || []) {
      // The preview question has no authored Telugu counterpart.
      registerTePair(iq.aEn, iq.aTe);
    }
  }
  for (const g of ACADEMY_GLOSSARY_TERMS || []) {
    registerTePair(g.definitionEn, g.definitionTe);
  }
  for (const m of INTERVIEW_MODULES_LIST || []) {
    registerTePair(m.titleEn, m.titleTe);
  }
  for (const q of INTERVIEW_QUESTIONS_BANK || []) {
    registerTePair(q.shortAnswerEn, q.shortAnswerTe);
    registerTePair(q.practicalExampleEn, q.practicalExampleTe);
    (q.workingPrincipleStepsEn || []).forEach((s, idx) => registerTePair(s, q.workingPrincipleStepsTe?.[idx]));
  }
  for (const sc of TROUBLESHOOTING_SCENARIOS_20 || []) {
    registerTePair(sc.titleEn, sc.titleTe);
    registerTePair(sc.problemStatementEn, sc.problemStatementTe);
    registerTePair(sc.expectedObservationsEn, sc.expectedObservationsTe);
    registerTePair(sc.confirmedRootCauseEn, sc.confirmedRootCauseTe);
    registerTePair(sc.correctiveActionEn, sc.correctiveActionTe);
    registerTePair(sc.verificationProcedureEn, sc.verificationProcedureTe);
    registerTePair(sc.preventiveMeasuresEn, sc.preventiveMeasuresTe);
    registerTePair(sc.interviewReadyAnswerEn, sc.interviewReadyAnswerTe);
    (sc.initialSymptomsEn || []).forEach((s, idx) => registerTePair(s, sc.initialSymptomsTe?.[idx]));
    (sc.stepByStepDiagnosisEn || []).forEach((s, idx) => registerTePair(s, sc.stepByStepDiagnosisTe?.[idx]));
  }
  for (const d of CCNA_EXAM_DOMAINS || []) {
    registerTePair(d.nameEn, d.nameTe);
    registerTePair(d.summaryEn, d.summaryTe);
  }
  for (const top of CCNA_TOPOLOGIES || []) {
    registerTePair(top.titleEn, top.titleTe);
    registerTePair(top.subtitleEn, top.subtitleTe);
    registerTePair(top.routingInfoEn, top.routingInfoTe);
  }
  for (const fl of CCNA_PACKET_FLOWS || []) {
    registerTePair(fl.titleEn, fl.titleTe);
    registerTePair(fl.summaryEn, fl.summaryTe);
    for (const st of fl.steps || []) {
      registerTePair(st.descEn, st.descTe);
    }
  }
  for (const ch of CCNA_CHAPTERS || []) {
    registerTePair(ch.titleEn, ch.titleTe);
    registerTePair(ch.subtitleEn, ch.subtitleTe);
  }
  registerRecursiveTePairs([IEC61850_ACADEMY_CHAPTERS, ACADEMY_GLOSSARY_TERMS, INTERVIEW_MODULES_LIST, INTERVIEW_QUESTIONS_BANK, TROUBLESHOOTING_SCENARIOS_20, CCNA_EXAM_DOMAINS, CCNA_TOPOLOGIES, CCNA_PACKET_FLOWS, CCNA_CHAPTERS, LEARNING_MODULES]);
  for (const lm of LEARNING_MODULES || []) {
    registerTePair(lm.title, lm.titleTelugu);
    registerTePair(lm.summaryEn, lm.summaryTe);
  }
} catch {
  // Ignore if called in minimal unit context
}

/**
 * Regex matching technical terminology, commands, formulas, hex values,
 * IP/MAC addresses, ports, IEC 61850 object references, and device IDs
 * that MUST remain unchanged across all translations.
 */
const PROTECTED_TECH_REGEX = new RegExp(
  [
    // XML tags & bracketed FC codes
    '<[A-Za-z0-9_:/.-]+(?:\\s+[^>]*)?>',
    '\\[(?:ST|MX|CO|CF|DC|SP|SV|EX|BR|RP|GO)\\]',
    // Formulas
    '[SPQ]\\s*=\\s*[^,.;]+',
    '3I0\\s*=\\s*Ia\\s*\\+\\s*Ib\\s*\\+\\s*Ic',
    'V_ph\\s*=\\s*V_L\\s*/\\s*√3',
    'Idiff\\s*[=≈]\\s*[^,.;]+',
    'I²R',
    '√3',
    'cosφ',
    'sinφ',
    // URLs, endpoints, IPv4/CIDR, MAC addresses, Hex literals
    'opc\\.tcp://[A-Za-z0-9.:/_-]+',
    'https?://[^\\s]+',
    '\\b(?:\\d{1,3}\\.){3}\\d{1,3}(?::\\d+)?(?:/\\d{1,2})?\\b',
    '\\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b',
    '\\b0x[0-9A-Fa-f]+\\b',
    // IEC 61850 paths & logical nodes
    '\\b[A-Za-z0-9_]+/[A-Za-z0-9_$.]+\\b',
    '\\b(?:LLN0|LPHD1?|XCBR\\d*|XSWI\\d*|CSWI\\d*|CILO\\d*|MMXU\\d*|PTOC\\d*|PDIS\\d*|PDIF\\d*|PTRC\\d*|RBRF\\d*|RSYN\\d*|ATCC\\d*|YLTC\\d*|SIMG\\d*|SIML\\d*|STMP\\d*|SOPM\\d*|SPDC\\d*|RREC\\d*|GGIO\\d*|GOOSEBIN)(?:\\.[A-Za-z0-9_$]+)*\\b',
    '\\b(?:stVal|ctlVal|stNum|sqNum|confRev|gocbRef|datSet|DatSet|RptEna|IntgPd|TrgOps|OptFlds|BufTm|EntryID|PurgeBuf|dchg|qchg|dupd|ndsCom|smpCnt|smpSynch|ctlModel|SBOw|SBOes|SBO|Oper|AddCause|TimeQuality|ClockNotSynchronized|brcbSt0\\d|brcbAlm0\\d|brcbMeas0\\d|urcbMeas0\\d|dsStatus|dsAlarm|dsMeas|dsGooseTrip|GoCB_[A-Za-z0-9_]+)\\b',
    // Bay, Bus, IED, Transformer, Switch, Gateway, and Apartment Device IDs
    '\\b(?:BAY|BUS|IED|CB|TX|DT|SRV|GTW|CLK|SW|MK|CRP|TTB|FLT|TC|SCEN|TOPO|FLOW|MOD|DOM)-[A-Za-z0-9_-]+\\b',
    '\\bIED_[A-Za-z0-9_]+\\b',
    '\\b(?:SIPROTEC\\s*5?|7SA87|7UT86|7SJ85|Relion|REF615|RET615|REC615|MiCOM|P143|P633|C264|Easergy|PACiS|Multilin|850|T60|D60|EnerVista|DIGSI\\s*5|PCM600|IEDScout|Wireshark|OMICRON|Hirschmann|RSP35|Meinberg|Moxa|MGate\\s*5216|Catalyst\\s*\\d+|Cisco\\s*\\d+|WLC-?2504)\\b',
    // Standards & Protocols
    '\\bIEC\\s*61850(?:-[0-9-]+(?:\\s*LE)?)?\\b',
    '\\bIEC\\s*60870-5-10[134]\\b',
    '\\bIEC-10[134]\\b',
    '\\bIEC\\s*(?:62439-3|62351|60617)\\b',
    '\\bIEEE\\s*(?:1588v2|1588|802\\.1[Qpw]|802\\.3(?:ad)?|1613|80)\\b',
    '\\b(?:GOOSE|MMS|Sampled\\s+Values|SV|SMV|PRP|HSR|RSTP|STP|LACP|Modbus\\s+TCP|Modbus\\s+RTU|Modbus|OPC\\s+UA|DNP3|SNMP|SNTP|NTP|PTPv2|PTP|BRCB|URCB|RCB|GoCB|GCB|SCL|ICD|SSD|IID|SCD|CID|SED|VLAN|QoS|CCNA|ARP|ICMP|OSPFv2|OSPF|NAT|PAT|DHCP|DNS|ACL|SSH|HSRP|CAPWAP|WPA2|PoE|SLD|SCADA|HMI|SAS|BCU|RTU|RCC|SLDC|SAMU|PIU|DANP|SAN|RedBox|FAT/SAT|FAT|SAT|SOE|OLTC|AVR|TCS|50BF|50/51|50N/51N|87T|87B|43LR|52a/52b|52a|52b|89L|89B|89E|Q1|Q8|Q9|LOTO|PTW|COMTRADE|PBKDF2|RBAC|X\\.509v?3?|SHA-256|Three\\.js|WebGL)\\b',
    // Ports, Interfaces, Telegram Types, and Electrical Units
    '\\b(?:TCP/\\d+|UDP/\\d+|Gi\\d+/\\d+(?:\\.\\d+)?|Fa\\d+/\\d+|Po\\d+|Se\\d+/\\d+/\\d+)\\b',
    '\\b(?:STARTDT|STOPDT|TESTFR|C_IC_NA_1|C_DC_NA_1|M_ME_TF_1|M_SP_TB_1|IOA|CASDU|COA|COT|MBAP|FC\\s*0[346]|ABCD|CDAB|100BASE-TX|100BASE-FX|1000BASE-LX|LC-Duplex-100BASE-FX|EtherType|InformationReport|GOOD|TAL|OSI-TSEL|OSI-SSEL|OSI-PSEL|AP-Title|SeqNr|LSDUsize|PRPsuffix|Bytes|PRI|Basic256Sha256|Aes128_Sha256_RsaOaep|Sign&Encrypt|NodeId|DisplayName|DataType|AccessLevel|StatusCode|SourceTimestamp|Q:OLD|OTI|WTI|Vab|Vbc|Vca|PF|Freq|TotW|PPV|dsProtTrip|LN\\.DO\\.DA|FC|CDC|LAN\\s*A/B|LAN\\s*A|LAN\\s*B|B:LAN-B|A:LAN-A|Eth\\.|ChA|ChB|VLAN\\s*ID|802\\.1p|PCP|GM|M400|LC|PDU|Sync|Layer-2|Substation_132_33_11kV|ns=2|s=SAS|server:4840|TCP:102|Int|IED|ABB|HIRSCHMANN|IP|IEC\s*104|Eth)\\b',
    '\\b\\d+(?:/\\d+)*(?:\\.\\d+)?\\s*(?:kV|MVA|kVA|MW|MVAR|kA|Hz|ms|µs|ns|dBm|Mbps|Gbps|kbps|bar|V|A|Ω)\\b',
  ].join('|'),
  'g'
);

/**
 * Checks whether a string is purely a technical identifier, number, formula, or code
 * that should never be altered.
 */
export function isPureTechnicalText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= 1) return true;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^(?:https?:\/\/|opc\.tcp:\/\/|[\d\W]+$)/.test(trimmed)) return true;
  const stripped = trimmed.replace(PROTECTED_TECH_REGEX, '').replace(/[\d\s•·|→←↔⇄▲▼●✓✕⚠⚡▸▾×±—–():,.;/#+=-]/g, '');
  return stripped.length === 0;
}

/**
 * Normalizes any language code to a valid SupportedLanguageCode.
 * Explicitly rejects removed languages ('KN', 'ML') and falls back to 'EN'.
 */
export function normalizeLanguageCode(code?: string | null): SupportedLanguageCode {
  const upper = String(code || 'EN').trim().toUpperCase();
  if (upper in LANGUAGE_CODES) return upper as SupportedLanguageCode;
  return 'EN';
}

/**
 * Synchronously translates any UI string, heading, button, table label, dialog,
 * or engineering explanation into the requested target language while keeping
 * all technical terminology, commands, formulas, and device identifiers unchanged.
 */
export function translateOfflineText(rawText: string, targetLangInput: string): string {
  const targetLang = normalizeLanguageCode(targetLangInput);
  if (!rawText || targetLang === 'EN') return rawText;

  const leadingWs = rawText.match(/^\s*/)?.[0] || '';
  const trailingWs = rawText.match(/\s*$/)?.[0] || '';
  const trimmed = rawText.trim();
  if (!trimmed) return rawText;

  // 1. Check Exact UI Dictionary first
  const normKey = trimmed.replace(/\s+/g, ' ');
  if (UI_TRANSLATIONS[normKey]?.[targetLang]) {
    return leadingWs + UI_TRANSLATIONS[normKey][targetLang] + trailingWs;
  }

  // 2. If Telugu ('TE'), check authored Telugu pairs from project data files
  if (targetLang === 'TE' && AUTHORED_TE_MAP.has(normKey)) {
    return leadingWs + AUTHORED_TE_MAP.get(normKey)! + trailingWs;
  }

  // 3. If purely technical (e.g. "132/33/11 kV", "BAY-132-L1", "XCBR1.Pos.stVal [ST]"), keep unchanged
  if (isPureTechnicalText(normKey)) {
    return rawText;
  }

  // 4. Mask protected technical tokens (__TK0__, __TK1__, ...), apply phrase translations, and restore tokens
  const tokens: string[] = [];
  let masked = normKey.replace(PROTECTED_TECH_REGEX, (match) => {
    const idx = tokens.length;
    tokens.push(match);
    return `__TK${idx}__`;
  });

  const rules = PHRASE_RULES[targetLang as Exclude<SupportedLanguageCode, 'EN'>] || [];
  for (const [srcPhrase, dstPhrase] of rules) {
    const esc = srcPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`\\b${esc}\\b`, 'gi');
    masked = masked.replace(rx, dstPhrase);
  }

  const restored = masked.replace(/__TK(\d+)__/g, (_, n) => tokens[Number(n)] ?? '');
  return leadingWs + restored + trailingWs;
}

// DOM TreeWalker + MutationObserver for automatic synchronous translation across all pages
const originals = new WeakMap<Text, string>();
const lastRendered = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();
let currentLanguage: SupportedLanguageCode = 'EN';
let observer: MutationObserver | undefined;

const SKIP_SELECTOR =
  'script,style,code,pre,kbd,samp,textarea,math,[data-no-translate],[translate="no"],[contenteditable="true"]';
const TRANSLATABLE_ATTRS = ['title', 'placeholder', 'aria-label', 'alt'] as const;

function isAllowedElement(el: Element | null): boolean {
  if (!el) return false;
  if (el.closest(SKIP_SELECTOR)) return false;
  if (el.closest('svg') && el.tagName.toLowerCase() !== 'title') return false;
  return true;
}

function scanNode(root: Node): void {
  if (typeof document === 'undefined') return;
  if (root.nodeType === Node.TEXT_NODE) {
    const textNode = root as Text;
    if (!isAllowedElement(textNode.parentElement)) return;
    const currentVal = textNode.textContent ?? '';
    const prevRendered = lastRendered.get(textNode);
    if (!originals.has(textNode) || (prevRendered !== undefined && currentVal !== prevRendered)) {
      const normCur = currentVal.replace(/\s+/g, ' ').trim();
      const canonicalEn = REVERSE_UI_MAP.get(normCur);
      originals.set(textNode, canonicalEn ?? currentVal);
    }
    const original = originals.get(textNode) ?? currentVal;
    const nextVal = currentLanguage === 'EN' ? original : translateOfflineText(original, currentLanguage);
    lastRendered.set(textNode, nextVal);
    if (textNode.textContent !== nextVal) {
      textNode.textContent = nextVal;
    }
    return;
  }

  if (!(root instanceof Element)) return;
  if (!isAllowedElement(root)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (isAllowedElement(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  let n: Node | null;
  while ((n = walker.nextNode())) {
    scanNode(n);
  }

  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of elements) {
    if (!isAllowedElement(el)) continue;
    let attrMap = originalAttrs.get(el);
    if (!attrMap) {
      attrMap = new Map();
      originalAttrs.set(el, attrMap);
    }
    for (const attr of TRANSLATABLE_ATTRS) {
      const cur = el.getAttribute(attr);
      if (cur === null) continue;
      if (!attrMap.has(attr)) attrMap.set(attr, cur);
      const orig = attrMap.get(attr)!;
      const nextAttr = currentLanguage === 'EN' ? orig : translateOfflineText(orig, currentLanguage);
      if (cur !== nextAttr) el.setAttribute(attr, nextAttr);
    }
  }
}

export function getActiveLanguage(): SupportedLanguageCode {
  return currentLanguage;
}

export function setOnlineLanguage(code: string): void {
  const normalized = normalizeLanguageCode(code);
  currentLanguage = normalized;
  try {
    localStorage.setItem('sas-display-language', normalized);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = LANGUAGE_CODES[normalized];
    if (document.body) scanNode(document.body);
  }
}

export function startOnlineTranslation(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  let initial: SupportedLanguageCode = 'EN';
  try {
    initial = normalizeLanguageCode(localStorage.getItem('sas-display-language'));
    localStorage.setItem('sas-display-language', initial);
  } catch {
    initial = 'EN';
  }
  currentLanguage = initial;
  document.documentElement.lang = LANGUAGE_CODES[currentLanguage];

  observer?.disconnect();
  observer = new MutationObserver((records) => {
    for (const rec of records) {
      if (rec.type === 'childList') {
        for (const added of Array.from(rec.addedNodes)) {
          scanNode(added);
        }
      } else if (rec.type === 'characterData') {
        scanNode(rec.target);
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    scanNode(document.body);
  }
  window.addEventListener('sas:language-change', (ev: Event) => {
    const detail = (ev as CustomEvent<string>).detail;
    setOnlineLanguage(detail);
  });
}
