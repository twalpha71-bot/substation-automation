import { ScadaAlarmAudio } from './components/ScadaAlarmAudio';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSubstationStore, ActiveWorkspaceTab } from './simulation/useSubstationStore';
import { useAuthStore, computeUserInitials, ProfileSectionTab } from './auth/useAuthStore';
import { useSimulationLoop } from './hooks/useSimulationLoop';
import { HeroDashboardPage } from './pages/HeroDashboardPage';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  FileCode2,
  GitBranch,
  Globe2,
  UserRound,
  UserRoundPlus,
  LogIn,
  Rocket,
  GraduationCap,
  Home,
  Lock,
  Menu,
  Network,
  Pause,
  Play,
  PlusCircle,
  Power,
  Radio,
  Settings,
  Shield,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';


import { UI_TRANSLATIONS, translateOfflineText, setOnlineLanguage, SUPPORTED_LANGUAGE_LIST, LANGUAGE_CODES, normalizeLanguageCode, SupportedLanguageCode } from './i18n/offlineTranslation';

const BayConfigurationManager = React.lazy(() => import('./pages/BayConfigurationManager').then(module => ({ default: module.BayConfigurationManager })));
const AlarmsEventsPage = React.lazy(() => import('./pages/AlarmsEventsPage').then(module => ({ default: module.AlarmsEventsPage })));
const WiresharkAnalyzerPage = React.lazy(() => import('./pages/WiresharkAnalyzerPage').then(module => ({ default: module.WiresharkAnalyzerPage })));
const OsiModelPage = React.lazy(() => import('./pages/OsiModelPage').then(module => ({ default: module.OsiModelPage })));
const SldWorkspacePage = React.lazy(() => import('./pages/SldWorkspacePage').then(module => ({ default: module.SldWorkspacePage })));
const ScadaHmiPage = React.lazy(() => import('./pages/ScadaHmiPage').then(module => ({ default: module.ScadaHmiPage })));
const IedExplorerPage = React.lazy(() => import('./pages/IedExplorerPage').then(module => ({ default: module.IedExplorerPage })));
const NetworkTopologyPage = React.lazy(() => import('./pages/NetworkTopologyPage').then(module => ({ default: module.NetworkTopologyPage })));
const GooseLabPage = React.lazy(() => import('./pages/GooseLabPage').then(module => ({ default: module.GooseLabPage })));
const MmsLabPage = React.lazy(() => import('./pages/MmsLabPage').then(module => ({ default: module.MmsLabPage })));
const ModbusTcpLabPage = React.lazy(() => import('./pages/ModbusTcpLabPage').then(module => ({ default: module.ModbusTcpLabPage })));
const Iec104LabPage = React.lazy(() => import('./pages/Iec104LabPage').then(module => ({ default: module.Iec104LabPage })));
const OpcUaLabPage = React.lazy(() => import('./pages/OpcUaLabPage').then(module => ({ default: module.OpcUaLabPage })));
const SignalMappingSclPage = React.lazy(() => import('./pages/SignalMappingSclPage').then(module => ({ default: module.SignalMappingSclPage })));
const FaultTroubleshootingPage = React.lazy(() => import('./pages/FaultTroubleshootingPage').then(module => ({ default: module.FaultTroubleshootingPage })));
const FatSatLabPage = React.lazy(() => import('./pages/FatSatLabPage').then(module => ({ default: module.FatSatLabPage })));
const TestingGuidancePage = React.lazy(() => import('./pages/TestingGuidancePage').then(module => ({ default: module.TestingGuidancePage })));
const LearningAcademyPage = React.lazy(() => import('./pages/LearningAcademyPage').then(module => ({ default: module.LearningAcademyPage })));
const Iec61850AcademyPage = React.lazy(() => import('./pages/Iec61850AcademyPage').then(module => ({ default: module.Iec61850AcademyPage })));
const InterviewPrepPage = React.lazy(() => import('./pages/InterviewPrepPage').then(module => ({ default: module.InterviewPrepPage })));
const CcnaAcademyPage = React.lazy(() => import('./pages/CcnaAcademyPage').then(module => ({ default: module.CcnaAcademyPage })));
const AuthPortalPage = React.lazy(() => import('./pages/AuthAndAdminPages').then(module => ({ default: module.AuthPortalPage })));
const UserProfilePage = React.lazy(() => import('./pages/AuthAndAdminPages').then(module => ({ default: module.UserProfilePage })));
const AdminDashboardPage = React.lazy(() => import('./pages/AuthAndAdminPages').then(module => ({ default: module.AdminDashboardPage })));

export default function App() {
  useSimulationLoop();

  const {
    activeTab,
    setActiveTab,
    simulationRunning,
    toggleSimulationRunning,
    bilingualTeluguEnabled,
    toggleBilingualTelugu,
    alarms,
    faultScenarios,
    lastCommandFeedback,
    clearCommandFeedback,
    bays,
  } = useSubstationStore(useShallow(state => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    simulationRunning: state.simulationRunning,
    toggleSimulationRunning: state.toggleSimulationRunning,
    bilingualTeluguEnabled: state.bilingualTeluguEnabled,
    toggleBilingualTelugu: state.toggleBilingualTelugu,
    alarms: state.alarms,
    faultScenarios: state.faultScenarios,
    lastCommandFeedback: state.lastCommandFeedback,
    clearCommandFeedback: state.clearCommandFeedback,
    bays: state.bays,
  })));

  const {
    currentUserId,
    users,
    guestLang,
    announcements,
    setActiveProfileTab,
    signOut,
    setUserLanguage,
  } = useAuthStore();

  const [testingGuidanceOpen, setTestingGuidanceOpen] = useState(() => window.location.hash === '#/workspace/TESTING_GUIDANCE');
  const [showLanding, setShowLanding] = useState(false);
  const [specialPage, setSpecialPage] = useState<'ALARMS_EVENTS' | 'WIRESHARK' | 'BAY_MANAGER' | null>(null);
  const openSpecialPage = (page: 'ALARMS_EVENTS' | 'WIRESHARK' | 'BAY_MANAGER') => { clearScadaVisitOnExit(); setSpecialPage(page); setTestingGuidanceOpen(false); setShowLanding(false); setTopMenuOpen(null); window.history.pushState(null, '', `#/workspace/${page}`); window.scrollTo(0, 0); };
  // Deep-link the active workspace: refreshing /workspace/GOOSE stays in GOOSE Lab.
  useLayoutEffect(() => {
    const restoreLocation = () => {
      const special = window.location.hash.match(/^#\/workspace\/(ALARMS_EVENTS|WIRESHARK|BAY_MANAGER)$/);
      if (special) { setSpecialPage(special[1] as 'ALARMS_EVENTS' | 'WIRESHARK' | 'BAY_MANAGER'); setTestingGuidanceOpen(false); setShowLanding(false); return; }
      setSpecialPage(null);
      if (window.location.hash === '#/workspace/TESTING_GUIDANCE') {
        setTestingGuidanceOpen(true);
        setShowLanding(false);
        return;
      }
      setTestingGuidanceOpen(false);
      const match = window.location.hash.match(/^#\/workspace\/([A-Z0-9_]+)$/);
      if (match) {
        const requested = match[1] as ActiveWorkspaceTab;
        if (requested !== 'SCADA') { try { sessionStorage.removeItem('sas-scada-navigation-v1'); } catch { /* optional */ } }
        const valid = ['HERO','OSI_MODEL','IEC61850_ACADEMY','INTERVIEW_PREP','CCNA_ACADEMY','SLD','SCADA','IED','IED_SIGNAL_CHAIN','NETWORK','GOOSE','MMS','MODBUS_LAB','IEC104_LAB','OPCUA_LAB','SIGNALS','FAULTS','FATSAT','LEARNING','USER_PROFILE','ADMIN_DASHBOARD'];
        if (valid.includes(requested)) {
          setActiveTab(requested);
          setShowLanding(false);
          return;
        }
      }
      // Unknown or root URL: go directly to the main dashboard.
      setActiveTab('HERO');
      setShowLanding(false);
      if (window.location.hash !== '#/workspace/HERO') {
        window.history.replaceState(null, '', '#/workspace/HERO');
      }
    };
    restoreLocation();
    window.addEventListener('popstate', restoreLocation);
    window.addEventListener('hashchange', restoreLocation);
    return () => {
      window.removeEventListener('popstate', restoreLocation);
      window.removeEventListener('hashchange', restoreLocation);
    };
  }, [setActiveTab]);


  // Reset the page scroll whenever workspace navigation changes.
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({top:0,left:0,behavior:'instant'}));
    return () => cancelAnimationFrame(frame);
  }, [activeTab, showLanding]);

  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const sync = () => { if (mq.matches) setMobileNavOpen(false); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const [topMenuOpen, setTopMenuOpen] = useState<string | null>(null);
  // Dismiss the expanded top navigation menu when clicking anywhere outside it.
  // Pointerdown handles mouse, touch and pen input before navigation actions run.
  useEffect(() => {
    if (!topMenuOpen) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const element = target instanceof Element ? target : target.parentElement;
      const clickedGroup = element?.closest('.sas-top-group');
      if (!clickedGroup) setTopMenuOpen(null);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [topMenuOpen]);

  const [navSearch, setNavSearch] = useState('');
  const navSearchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navSearchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setTopMenuOpen(null);
        navSearchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState<boolean>(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [notifMenuOpen, setNotifMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [displayLanguage, setDisplayLanguage] = useState<SupportedLanguageCode>(() => { try { return normalizeLanguageCode(localStorage.getItem('sas-display-language')); } catch { return 'EN'; } });
  const [, setLangCatalogTick] = useState<number>(0);
  const t = (english: string) => translateOfflineText(english, displayLanguage);
  const [authPopupMode, setAuthPopupMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSettingsMenuOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [settingsMenuOpen]);

  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const currentRole = currentUser ? currentUser.role : 'GUEST';
  const currentLang: 'EN' | 'TE' = displayLanguage === 'TE' ? 'TE' : 'EN';
  const isTe = displayLanguage === 'TE';
  const activeAnnouncements = announcements.filter((a) => a.active);
  useEffect(() => {
    document.documentElement.lang = LANGUAGE_CODES[displayLanguage] || 'en';
    setOnlineLanguage(displayLanguage);
    const raf = requestAnimationFrame(() => setOnlineLanguage(displayLanguage));
    return () => cancelAnimationFrame(raf);
  }, [displayLanguage, activeTab, showLanding, authPopupMode, profileMenuOpen, notifMenuOpen, mobileNavOpen]);

  useEffect(() => {
    const onExternalLangChange = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      const next = normalizeLanguageCode(detail);
      setDisplayLanguage((prev) => (prev === next ? prev : next));
    };
    const onLangReady = () => setLangCatalogTick((v) => v + 1);
    window.addEventListener('sas:language-change', onExternalLangChange);
    window.addEventListener('sas:language-ready', onLangReady);
    return () => {
      window.removeEventListener('sas:language-change', onExternalLangChange);
      window.removeEventListener('sas:language-ready', onLangReady);
    };
  }, []);

  // Sync global language state with substation store bilingual toggle without resetting simulation
  useEffect(() => {
    if ((currentLang === 'TE' && !bilingualTeluguEnabled) || (currentLang === 'EN' && bilingualTeluguEnabled)) {
      toggleBilingualTelugu();
    }
  }, [currentLang]);

  // If any child triggers AUTH_SIGNIN / AUTH_SIGNUP / AUTH_FORGOT tab, open the modal pop-up on top of the current page
  useEffect(() => {
    if (activeTab === 'AUTH_SIGNIN') {
      setAuthPopupMode('SIGN_IN');
      setActiveTab('HERO');
    } else if (activeTab === 'AUTH_SIGNUP') {
      setAuthPopupMode('SIGN_UP');
      setActiveTab('HERO');
    } else if (activeTab === 'AUTH_FORGOT') {
      setAuthPopupMode('FORGOT_PASSWORD');
      setActiveTab('HERO');
    }
  }, [activeTab]);

  // Close auth popup on Escape key
  useEffect(() => {
    if (!authPopupMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuthPopupMode(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authPopupMode]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const unackAlarms = alarms.filter((a) => a.state === 'ACTIVE_UNACK').length;
  const activeFaults = faultScenarios.filter((f) => f.active).length;
  // Persist which notification items have already been viewed. Opening the bell
  // marks the current items as read; newly arriving items restore the dot.
  const notificationKeys = [
    ...activeAnnouncements.map((a) => `announcement:${a.id}`),
    ...alarms.filter((a) => a.state === 'ACTIVE_UNACK').map((a) => `alarm:${a.id}`),
  ];
  const [seenNotificationKeys, setSeenNotificationKeys] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('sas:seen-notifications') || '[]');
      return Array.isArray(saved) ? saved.filter((v): v is string => typeof v === 'string') : [];
    } catch { return []; }
  });
  const hasUnreadNotifications = notificationKeys.some((key) => !seenNotificationKeys.includes(key));
  const markNotificationsRead = () => {
    setSeenNotificationKeys((previous) => {
      const next = Array.from(new Set([...previous, ...notificationKeys]));
      try { window.localStorage.setItem('sas:seen-notifications', JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const totalMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);

  const navItems: { id: ActiveWorkspaceTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'HERO', label: t('Substation Workspace'), icon: <Home className="w-4 h-4" /> },
    { id: 'SLD', label: t('132/33/11kV SLD'), icon: <GitBranch className="w-4 h-4" /> },
    { id: 'SCADA', label: t('SCADA / HMI Operator Station'), icon: <Activity className="w-4 h-4" />, badge: unackAlarms },
    { id: 'IED', label: t('IED Explorer'), icon: <Cpu className="w-4 h-4" /> },
    { id: 'IED_SIGNAL_CHAIN', label: t('IED Signal Chain & Mapping'), icon: <Cpu className="w-4 h-4" /> },
    { id: 'NETWORK', label: t('PRP / HSR Network'), icon: <Network className="w-4 h-4" /> },
    { id: 'GOOSE', label: t('GOOSE Lab'), icon: <Radio className="w-4 h-4" /> },
    { id: 'MMS', label: t('MMS & RCB Lab (TCP/102)'), icon: <Database className="w-4 h-4" /> },
    { id: 'MODBUS_LAB', label: t('Modbus TCP Lab (TCP/502)'), icon: <Cpu className="w-4 h-4" /> },
    { id: 'IEC104_LAB', label: t('IEC-104 Lab (TCP/2404)'), icon: <Globe2 className="w-4 h-4" /> },
    { id: 'OPCUA_LAB', label: t('OPC UA Lab (TCP/4840)'), icon: <Database className="w-4 h-4" /> },
    { id: 'SIGNALS', label: t('Signal Mapping & SCL'), icon: <FileCode2 className="w-4 h-4" /> },
    { id: 'FAULTS', label: t('Fault Injection'), icon: <AlertOctagon className="w-4 h-4" />, badge: activeFaults },
    { id: 'FATSAT', label: t('FAT / SAT Laboratory'), icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'IEC61850_ACADEMY', label: t('IEC 61850 Digital Substation'), icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'TESTING_GUIDANCE' as ActiveWorkspaceTab, label: t('Testing Guidance'), icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'OSI_MODEL', label: t('OSI Model'), icon: <Network className="w-4 h-4" /> },
    { id: 'INTERVIEW_PREP', label: t('Interview Preparation'), icon: <Award className="w-4 h-4" /> },
    { id: 'CCNA_ACADEMY', label: t('CCNA Networking Academy'), icon: <Network className="w-4 h-4" /> },
    { id: 'LEARNING', label: t('Training (EN/TE)'), icon: <BookOpen className="w-4 h-4" /> },
  ];

  const topNavGroups = [
    { key: 'sld', title: t('SLD & Operation'), icon: GitBranch, ids: ['SLD', 'SCADA'] },
    { key: 'ied', title: t('IED & Signals'), icon: Cpu, ids: ['IED', 'IED_SIGNAL_CHAIN'] },
    { key: 'comms', title: t('Communication'), icon: Radio, ids: ['NETWORK', 'GOOSE', 'MMS', 'MODBUS_LAB', 'IEC104_LAB', 'OPCUA_LAB'] },
    { key: 'tools', title: t('Tools & Test'), icon: Settings, ids: ['SIGNALS', 'FAULTS', 'FATSAT', 'IEC61850_ACADEMY', 'TESTING_GUIDANCE', 'OSI_MODEL', 'INTERVIEW_PREP', 'CCNA_ACADEMY', 'LEARNING'] },
  ];
  const isWorkspaceHome = activeTab === 'HERO' && !specialPage && !testingGuidanceOpen;
  const filteredNavItems = navItems.filter(item => item.label.toLowerCase().includes(navSearch.trim().toLowerCase()));

  const clearScadaVisitOnExit = () => {
    try { sessionStorage.removeItem('sas-scada-navigation-v1'); } catch { /* optional */ }
  };

  const navigate = (tab: ActiveWorkspaceTab) => {
    if (tab !== 'SCADA') clearScadaVisitOnExit();
    setSpecialPage(null);
    if (tab === ('TESTING_GUIDANCE' as ActiveWorkspaceTab)) {
      window.history.pushState(null, '', '#/workspace/TESTING_GUIDANCE');
      setTestingGuidanceOpen(true);
      setShowLanding(false);
      setMobileNavOpen(false);
      setTopMenuOpen(null);
      setNavSearch('');
      return;
    }
    setTestingGuidanceOpen(false);
    window.history.pushState(null, '', `#/workspace/${tab}`);
    setShowLanding(false);
    setActiveTab(tab);
    setMobileNavOpen(false);
    setTopMenuOpen(null);
    setNavSearch('');
    setProfileMenuOpen(false);
    setNotifMenuOpen(false);
  };

  const openProfileSection = (section: ProfileSectionTab) => {
    setActiveProfileTab(section);
    navigate('USER_PROFILE');
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
  };

  const handleGlobalLangSwitch = (newLang: SupportedLanguageCode) => {
    setDisplayLanguage(newLang);
    setOnlineLanguage(newLang);
    window.dispatchEvent(new CustomEvent('sas:language-change', { detail: newLang }));
    setUserLanguage(newLang);
    setLangMenuOpen(false);
  };

  const activeBreadcrumbLabel = () => {
    if (specialPage === 'ALARMS_EVENTS') return 'Alarms / Events';
    if (specialPage === 'WIRESHARK') return 'Wireshark';
    if (specialPage === 'BAY_MANAGER') return 'Bay Configuration Manager';
    if (testingGuidanceOpen) return 'Testing Guidance';
    if (activeTab === 'HERO') return t('Substation Workspace');
    if (activeTab === 'ADMIN_DASHBOARD') return t('Admin Dashboard');
    if (activeTab === 'USER_PROFILE') return t('My Profile');
    return navItems.find((item) => item.id === activeTab)?.label || 'Substation Workspace';
  };

  const displayFullName = currentUser ? currentUser.fullName.trim() || 'My Account' : '';
  const userInitials = currentUser ? computeUserInitials(currentUser.fullName) : '';


  return (
    <div className="sas-app-shell min-h-screen bg-[#030D1B] text-[#DCEAF5] font-sans overflow-x-hidden">
      <ScadaAlarmAudio />
      <style>{`
        html, body { max-width: 100vw; overflow-x: hidden; }
        @keyframes sasLightningStrike {
          0%, 12%, 17%, 45%, 51%, 76%, 100% { filter: drop-shadow(0 0 7px #00d9ff) drop-shadow(0 0 16px #168bff); transform: scale(1) rotate(-4deg); opacity: .92; }
          13%, 15%, 46%, 48%, 77%, 79% { filter: drop-shadow(0 0 13px #ffffff) drop-shadow(0 0 26px #00eaff) drop-shadow(0 0 46px #168bff); transform: scale(1.15) rotate(3deg); opacity: 1; }
          16%, 49%, 80% { filter: drop-shadow(0 0 4px #00baff); transform: scale(.97) rotate(-3deg); opacity: .65; }
        }
        @keyframes sasLightningHalo {
          0%, 12%, 17%, 45%, 51%, 76%, 100% { box-shadow: 0 0 12px #00cfff70, inset 0 0 12px #00cfff30; border-color: #168bff; }
          13%, 15%, 46%, 48%, 77%, 79% { box-shadow: 0 0 23px #00eaff, 0 0 46px #168bff99, inset 0 0 24px #b4f7ff80; border-color: #b4f7ff; }
          16%, 49%, 80% { box-shadow: 0 0 7px #00cfff50; border-color: #168bff; }
        }
        @keyframes sasLogoHalo { 0%,100% { box-shadow: 0 0 12px #ff5a2040, inset 0 0 12px #ff8a1830; } 50% { box-shadow: 0 0 23px #ff7b2980, 0 0 34px #ff440033, inset 0 0 18px #ffb22e50; } }
        @keyframes sasTitleShimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        /* Match the opening-page Substation / AUTOMATION identity on every workspace page. */
        .sas-shared-brand-title { background: linear-gradient(100deg,#00edff,#5b9bff 60%,#e54cfc); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: none; }
        .sas-shared-brand-icon { box-shadow: 0 0 24px #ff991e75; }
        @media (prefers-reduced-motion: reduce) { .sas-shared-brand-title { animation: none !important; } }
        .sas-fire-icon { animation: none; }
        .sas-logo-halo { animation: none; }
        .sas-gradient-title { background: linear-gradient(110deg,#eafaff 0%,#00dcff 24%,#6d9eff 44%,#ffe29b 65%,#ff7d35 80%,#eafaff 100%); background-size: 240% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: none; }
        .sas-nav-item { transition: background .22s ease, border-color .22s ease, box-shadow .22s ease, transform .22s ease, color .22s ease; }
        .sas-nav-item:hover { transform: translateX(2px); box-shadow: inset 3px 0 #00d9ff, 0 0 13px #00cfff26; }
        .sas-nav-active { box-shadow: inset 3px 0 #00e5ff, 0 0 15px #00cfff4d, inset 0 0 20px #00bfff18 !important; }
        .sas-nav-active .sas-nav-icon { filter: drop-shadow(0 0 5px #00dcff); }
        .ied-device-image { width: 100%; height: 100%; object-fit: contain; object-position: center; image-rendering: auto; filter: none; transform: none; }
        /* Unified Clean Academy 2-column responsive layout (79% Main + 21% Sticky Right Sidebar on Desktop) */
        .sas-unified-academy-body { display: flex; flex-direction: column; gap: 1rem; align-items: stretch; width: 100%; }
        .sas-unified-main { width: 100%; min-width: 0; }
        .sas-unified-sidebar { width: 100%; flex-shrink: 0; }
        @media (min-width: 1024px) {
          .sas-unified-academy-body { flex-direction: row; align-items: flex-start; }
          .sas-unified-main { width: 79%; flex: 0 0 79%; }
          .sas-unified-sidebar { width: calc(21% - 1rem); flex: 0 0 calc(21% - 1rem); position: sticky; top: 5.5rem; }
        }
        @media (max-width: 767px) {
          pre, table { max-width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) { .sas-fire-icon,.sas-logo-halo,.sas-gradient-title { animation: none !important; } .sas-nav-item:hover { transform: none; } }
      `}</style>

      <div className="sas-app-content min-h-screen flex flex-col min-w-0">
        {/* Responsive Sticky Header (Top-Right has Bell + Sign In / Sign Up buttons OR Dynamic User Profile Menu) */}
        <header className="sas-app-header sticky top-0 z-30 bg-[#061525]/95 backdrop-blur border-b border-[#18334B]">
          <div className="sas-header-single-row px-3 sm:px-5 py-2 flex items-center gap-3">
            <button type="button" onClick={() => navigate('HERO')} className="sas-top-brand flex shrink-0 items-center gap-2.5 text-left" aria-label="Substation Automation home">
              <span className="sas-shared-brand-icon flex h-11 w-11 items-center justify-center rounded-xl border border-[#168bff] bg-[#071d38]">
                <Zap className="h-7 w-7 fill-current text-[#aaf6ff]" />
              </span>
              <span>
                <span className="sas-shared-brand-title block text-[21px] font-black leading-none">Substation</span>
                <span className="mt-1 block text-[9px] font-extrabold tracking-[0.23em] text-[#c8eaff]">AUTOMATION</span>
              </span>
            </button>

          <button type="button" className="sas-mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded={mobileNavOpen} aria-controls="sas-responsive-navigation" onClick={() => {setMobileNavOpen(v => !v);setTopMenuOpen(null);}}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Menu</span>
          </button>
          <nav id="sas-responsive-navigation" className={`sas-top-navigation ${mobileNavOpen ? 'sas-nav-expanded' : ''}`} aria-label="Engineering modules">
            <div className="sas-top-groups">
              <button
                type="button"
                className={`sas-top-group-trigger ${isWorkspaceHome ? 'is-active' : ''}`}
                aria-current={isWorkspaceHome ? 'page' : undefined}
                onClick={() => navigate('HERO')}
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>{t('Home')}</span>
              </button>
              {topNavGroups.map(group => {
                const Icon = group.icon;
                const active = group.ids.includes(testingGuidanceOpen ? 'TESTING_GUIDANCE' : activeTab);
                return (
                  <div key={group.key} className="sas-top-group">
                    <button type="button" className={`sas-top-group-trigger ${active ? 'is-active' : ''}`}
                      aria-expanded={topMenuOpen === group.key} aria-haspopup="menu"
                      onClick={() => setTopMenuOpen(prev => prev === group.key ? null : group.key)}>
                      <Icon className="h-4 w-4" /><span>{group.title}</span><ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {topMenuOpen === group.key && <div className="sas-top-dropdown" role="menu">
                      {navItems.filter(item => group.ids.includes(item.id)).map(item =>
                        <button type="button" role="menuitem" key={item.id} onClick={() => navigate(item.id)}
                          className={`sas-top-dropdown-item ${(testingGuidanceOpen ? item.id === ('TESTING_GUIDANCE' as ActiveWorkspaceTab) : activeTab === item.id) ? 'is-active' : ''}`}>
                          {item.icon}<span>{item.label}</span>
                          {!!item.badge && <span className="sas-top-badge">{item.badge}</span>}
                        </button>
                      )}
                      {group.key === 'tools' && <button type="button" role="menuitem" className="sas-top-dropdown-item" onClick={() => openSpecialPage('BAY_MANAGER')}><PlusCircle className="h-4 w-4" />Bay Configuration Manager</button>}
                      {group.key === 'tools' && currentRole === 'ADMIN' &&
                        <button type="button" role="menuitem" className="sas-top-dropdown-item" onClick={() => navigate('ADMIN_DASHBOARD')}>
                          <Shield className="h-4 w-4" />Admin Dashboard
                        </button>}
                    </div>}
                  </div>
                );
              })}
              <button type="button" className={`sas-top-group-trigger ${specialPage === 'ALARMS_EVENTS' ? 'is-active' : ''}`} onClick={() => openSpecialPage('ALARMS_EVENTS')}><Bell className="h-4 w-4" /><span>Alarms / Events</span></button>
              <button type="button" className={`sas-top-group-trigger ${specialPage === 'WIRESHARK' ? 'is-active' : ''}`} onClick={() => openSpecialPage('WIRESHARK')}><Network className="h-4 w-4" /><span>Wireshark</span></button>
            </div>
            <div className="sas-top-search">
              <input ref={navSearchRef} aria-label="Search navigation" placeholder="Search menu..."
                value={navSearch} onChange={e => {setNavSearch(e.target.value); setTopMenuOpen(null);}} />
              <kbd>Ctrl + K</kbd>
              {navSearch.trim() && <div className="sas-top-search-results" role="menu">
                {navSearch.toLowerCase().includes('alarm') && <button type="button" onClick={() => { openSpecialPage('ALARMS_EVENTS'); setNavSearch(''); }}><Bell className="w-4 h-4"/> Alarms / Events</button>}
                {'wireshark'.includes(navSearch.toLowerCase()) && <button type="button" onClick={() => { openSpecialPage('WIRESHARK'); setNavSearch(''); }}><Network className="w-4 h-4"/> Wireshark</button>}
                {filteredNavItems.length ? filteredNavItems.map(item =>
                  <button key={item.id} role="menuitem" type="button" onClick={() => navigate(item.id)}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                ) : <span className="sas-top-no-results">No matching modules</span>}
              </div>}
            </div>
          </nav>
            {/* Right: Notifications Bell + Sign In & Sign Up Options (when unauthenticated) OR Dynamic Profile Avatar & Dropdown */}
            <div className="sas-header-actions flex items-center gap-2 sm:gap-3">
              {/* Notifications Bell */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  aria-label="Notifications and announcements"
                  onClick={() => { if (!notifMenuOpen) markNotificationsRead(); setNotifMenuOpen((o) => !o); }}
                  className="relative p-2 rounded-full border border-transparent hover:border-[#234E73] hover:bg-[#081A30] text-[#DCEAF5] transition"
                >
                  <Bell className="w-5 h-5 text-[#DCEAF5]" />
                  {hasUnreadNotifications && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#00CFFF]" />
                  )}
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-80 sm:w-96 rounded-xl border border-[#00CFFF]/60 bg-[#071628] p-3 shadow-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#193B5A] pb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#00CFFF]">
                        Notifications & System Status
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifMenuOpen(false)}
                        className="text-[#8FAFC8] hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {activeAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="rounded-lg border border-[#193B5A] bg-[#030B18] p-2.5 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#00CFFF]">{ann.title}</span>
                            <span className="font-mono text-[9.5px] text-[#4ADE80]">{ann.severity}</span>
                          </div>
                          <p className="text-[11px] text-[#DCEAF5] leading-snug">{ann.message}</p>
                        </div>
                      ))}
                      {unackAlarms > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('SCADA')}
                          className="w-full rounded-lg border border-[#FF5C65] bg-[#3B0D15] p-2 text-left text-xs font-bold text-[#FDA4AF]"
                        >
                          ⚠ {unackAlarms} Unacknowledged Substation SCADA Alarm(s) — Open HMI →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={settingsRef} className="relative">
                <button type="button" title="Settings" aria-label="Open settings" aria-expanded={settingsMenuOpen}
                  onClick={() => { setSettingsMenuOpen(v => !v); setProfileMenuOpen(false); setNotifMenuOpen(false); }}
                  className="rounded-full p-2 text-[#DCEAF5] transition hover:bg-[#123B60] hover:text-[#00CFFF]">
                  <Settings className="h-5 w-5" />
                </button>
                {settingsMenuOpen && (
                  <div role="dialog" aria-label="Settings" className="absolute right-0 top-full z-[9999] mt-2 w-[min(290px,calc(100vw-24px))] rounded-xl border border-[#00CFFF]/60 bg-[#06182B] p-4 text-[#E9F3FF] shadow-[0_20px_55px_rgba(0,0,0,0.65)]">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold"><Settings className="h-4 w-4 text-[#00CFFF]" /> Settings</span>
                      <button type="button" aria-label="Close settings" onClick={() => setSettingsMenuOpen(false)} className="rounded px-2 py-1 text-[#B5CDDF] hover:bg-[#123B60]">✕</button>
                    </div>
                    {currentUser ? (
                      <button type="button" onClick={() => { setSettingsMenuOpen(false); openProfileSection('EDIT_PROFILE'); }} className="mt-3 w-full rounded-lg border border-[#35536C] px-3 py-2 text-left text-xs hover:bg-[#123B60]">Edit account profile</button>
                    ) : (
                      <p className="mt-3 text-xs text-[#91AFC5]">You can change display settings without signing in. Use the profile icon to sign in.</p>
                    )}
                  </div>
                )}
              </div>
              {/* Compact guest profile menu matching the approved visual design. */}
              {!currentUser ? (
                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    aria-label="Account options"
                    aria-expanded={profileMenuOpen}
                    onClick={() => setProfileMenuOpen(o => !o)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#00CFFF] bg-[#09223C] text-[#CDEEFF] shadow-[0_0_14px_rgba(0,207,255,0.22)] transition hover:bg-[#123B60] hover:shadow-[0_0_22px_rgba(0,207,255,0.48)]"
                  >
                    <UserRound className="h-4 w-4" />
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full z-[9999] mt-2 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-lg border border-[#00CFFF]/75 bg-[#06182B] text-[#E9F3FF] shadow-[0_20px_55px_rgba(0,0,0,0.65),0_0_24px_rgba(0,207,255,0.13)]" style={{ backgroundColor: "#06182B", opacity: 1, backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                      <div className="flex items-center gap-2.5 border-b border-[#00CFFF]/25 bg-gradient-to-r from-[#092E50] to-[#071D37] px-3.5 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#168BFF] bg-[#082747] text-[#DDF7FF]">
                          <UserRound className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">{t('Guest User')}</div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#A9C6D9]">{t('Sign in to personalize your experience')}</p>
                        </div>
                      </div>
                      <div className="space-y-2 p-3.5">
                        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00D9FF] bg-gradient-to-r from-[#008FF0] to-[#1652D6] px-3 py-2.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(0,207,255,0.18)] transition hover:brightness-110" onClick={() => { setProfileMenuOpen(false); setAuthPopupMode('SIGN_IN'); }}>
                          <LogIn className="h-4 w-4" /> Sign In
                        </button>
                        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00D9FF] bg-[#062F3E] px-3 py-2.5 text-xs font-bold text-[#4AF1F2] transition hover:bg-[#0A4454]" onClick={() => { setProfileMenuOpen(false); setAuthPopupMode('SIGN_UP'); }}>
                          <UserRoundPlus className="h-4 w-4" /> Sign Up
                        </button>
                        <div className="flex items-center gap-2 py-0.5 text-center text-[11px] text-[#8CA9BD]">
                          <span className="h-px flex-1 bg-[#35536C]" /> {t('or continue as Guest')} <span className="h-px flex-1 bg-[#35536C]" />
                        </div>
                        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#57718B] bg-[#1A334B] px-3 py-2.5 text-xs font-semibold text-[#E2F2FF] transition hover:bg-[#25445F]" onClick={() => setProfileMenuOpen(false)}>
                          <Rocket className="h-4 w-4" /> Continue as Guest
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    aria-label="Open user profile menu"
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-full p-1 hover:bg-[#0B2138] transition"
                  >
                    {currentUser.avatarDataUrl ? (
                      <img
                        src={currentUser.avatarDataUrl}
                        alt={displayFullName}
                        className="w-9 h-9 rounded-full object-cover border border-[#00CFFF]"
                      />
                    ) : (
                      <span
                        title={displayFullName}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4338CA] border border-[#818CF8]/70 flex items-center justify-center text-xs font-black text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]"
                      >
                        {userInitials}
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-[#9BC0DF]" />
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-[9999] w-60 rounded-xl border border-[#00CFFF]/55 bg-[#06182B] p-2 shadow-[0_14px_38px_rgba(0,0,0,0.75)] text-xs" style={{ backgroundColor: "#06182B", opacity: 1, backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                      {/* Authenticated User's Full Name & Account Role */}
                      <div className="px-3 py-2.5 border-b border-[#163654]">
                        <div className="font-extrabold text-sm text-white truncate">
                          {displayFullName}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#00CFFF]">
                            {currentUser.role === 'ADMIN' ? 'Admin' : 'Student'}
                          </span>
                          <span className="font-mono text-[10px] text-[#8FAFC8] truncate">
                            {currentUser.email}
                          </span>
                        </div>
                      </div>

                      {/* 5 Required Dropdown Menu Items matching reference screenshot */}
                      <div className="py-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => openProfileSection('MY_PROFILE')}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-[#E9F3FF] hover:bg-[#102944] transition"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#9BC0DF]" />
                          <span>{isTe ? 'నా ప్రొఫైల్ (My Profile)' : 'My Profile'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openProfileSection('LEARNING_PROGRESS')}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-[#E9F3FF] hover:bg-[#102944] transition"
                        >
                          <GraduationCap className="w-4 h-4 text-[#9BC0DF]" />
                          <span>{isTe ? 'లెర్నింగ్ ప్రోగ్రెస్' : 'Learning Progress'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openProfileSection('EDIT_PROFILE')}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-[#E9F3FF] hover:bg-[#102944] transition"
                        >
                          <Settings className="w-4 h-4 text-[#9BC0DF]" />
                          <span>{t('Edit Profile')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openProfileSection('CHANGE_PASSWORD')}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-[#E9F3FF] hover:bg-[#102944] transition"
                        >
                          <Lock className="w-4 h-4 text-[#9BC0DF]" />
                          <span>{t('Change Password')}</span>
                        </button>
                      </div>

                      <div className="pt-1 mt-1 border-t border-[#163654]">
                        <button
                          type="button"
                          onClick={() => {
                            signOut();
                            setProfileMenuOpen(false);
                            if (activeTab === 'USER_PROFILE' || activeTab === 'ADMIN_DASHBOARD') {
                              setActiveTab('HERO');
                            }
                          }}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-extrabold text-[#FF5C65] hover:bg-[#3B0D15]/60 transition"
                        >
                          <Power className="w-4 h-4 text-[#FF5C65]" />
                          <span>{t('Sign Out')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </header>

        {lastCommandFeedback && (
          <div
            className={`mx-3 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-lg ${
              lastCommandFeedback.type === 'ERROR'
                ? 'bg-[#FF4D62]/20 border-[#FF4D62] text-red-100'
                : lastCommandFeedback.type === 'SUCCESS'
                ? 'bg-[#22C55E]/20 border-[#22C55E] text-emerald-100'
                : 'bg-[#10243A] border-[#00D9FF] text-cyan-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] opacity-80 shrink-0">
                [{lastCommandFeedback.timestamp.split('T')[1]}]
              </span>
              <span className="font-semibold">{lastCommandFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={clearCommandFeedback}
              className="text-xs font-bold px-2 py-0.5 rounded bg-black/30 hover:bg-black/50"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="sas-workspace-main flex-1 p-2.5 sm:p-5 xl:p-6 w-full min-w-0">
          <React.Suspense fallback={<div role="status" className="rounded-xl border border-cyan-900 bg-[#061829] p-5 text-sm text-[#9bdcf3]">{t('Loading workspace…')}</div>}>
          {specialPage === 'BAY_MANAGER' ? <BayConfigurationManager /> : specialPage === 'ALARMS_EVENTS' ? <AlarmsEventsPage /> : specialPage === 'WIRESHARK' ? <WiresharkAnalyzerPage /> : testingGuidanceOpen ? <TestingGuidancePage /> : <>
          {activeTab === 'HERO' && <HeroDashboardPage />}
          {activeTab === 'OSI_MODEL' && <OsiModelPage />}
          {activeTab === 'IEC61850_ACADEMY' && <Iec61850AcademyPage />}
          {activeTab === 'INTERVIEW_PREP' && <InterviewPrepPage />}
          {activeTab === 'CCNA_ACADEMY' && <CcnaAcademyPage />}
          {activeTab === 'SLD' && <SldWorkspacePage />}
          {activeTab === 'SCADA' && <ScadaHmiPage />}
          {activeTab === 'IED' && <IedExplorerPage />}
          {activeTab === 'NETWORK' && <NetworkTopologyPage />}
          {activeTab === 'GOOSE' && <GooseLabPage />}
          {activeTab === 'MMS' && <MmsLabPage />}
          {activeTab === 'MODBUS_LAB' && <ModbusTcpLabPage />}
          {activeTab === 'IEC104_LAB' && <Iec104LabPage />}
          {activeTab === 'OPCUA_LAB' && <OpcUaLabPage />}
          {(activeTab === 'SIGNALS' || activeTab === 'IED_SIGNAL_CHAIN') && <SignalMappingSclPage />}
          {activeTab === 'FAULTS' && <FaultTroubleshootingPage />}
          {activeTab === 'FATSAT' && <FatSatLabPage />}
          {activeTab === 'LEARNING' && <LearningAcademyPage />}
          {activeTab === 'ADMIN_DASHBOARD' && <AdminDashboardPage />}
          {activeTab === 'USER_PROFILE' && <UserProfilePage />}
          </>}
          </React.Suspense>
        </main>

        <footer className="sas-app-footer px-4 sm:px-6 py-3 pb-14 sm:pb-3 border-t border-cyan-300/40 text-[10px] text-[#bde3f5] flex flex-wrap justify-between gap-2">
          <span>SAS ENGINEERING HUB — 132/33/11 kV IEC 61850 Digital Twin & Unified Academies</span>
          <span>Educational simulation only — Not connected to physical substation equipment · © {new Date().getFullYear()} Substation Automation Engineering Hub</span>
        </footer>
      </div>

      {/* ==================== SIGN IN / SIGN UP / FORGOT PASSWORD MODAL POP-UP ==================== */}
      {authPopupMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Authentication popup"
          onClick={() => setAuthPopupMode(null)}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
        >
          <React.Suspense fallback={<p role="status" className="text-sm text-cyan-100">{t('Loading…')}</p>}>
          <AuthPortalPage
            isModal
            initialMode={authPopupMode}
            onClose={() => setAuthPopupMode(null)}
            onSuccessRedirect={() => setAuthPopupMode(null)}
          />
          </React.Suspense>
        </div>
      )}

    </div>
  );
}
