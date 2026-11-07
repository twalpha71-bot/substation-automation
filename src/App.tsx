import React, { useEffect, useRef, useState } from 'react';
import { useSubstationStore, ActiveWorkspaceTab } from './simulation/useSubstationStore';
import { useAuthStore, computeUserInitials, ProfileSectionTab } from './auth/useAuthStore';
import { useSimulationLoop } from './hooks/useSimulationLoop';
import { HeroDashboardPage } from './pages/HeroDashboardPage';
import { SubstationLandingPage } from './pages/SubstationLandingPage';
import { SldWorkspacePage } from './pages/SldWorkspacePage';
import { ScadaHmiPage } from './pages/ScadaHmiPage';
import { IedExplorerPage } from './pages/IedExplorerPage';
import { NetworkTopologyPage } from './pages/NetworkTopologyPage';
import { GooseLabPage } from './pages/GooseLabPage';
import { MmsLabPage } from './pages/MmsLabPage';
import { ModbusTcpLabPage } from './pages/ModbusTcpLabPage';
import { Iec104LabPage } from './pages/Iec104LabPage';
import { OpcUaLabPage } from './pages/OpcUaLabPage';
import { SignalMappingSclPage } from './pages/SignalMappingSclPage';
import { FaultTroubleshootingPage } from './pages/FaultTroubleshootingPage';
import { FatSatLabPage } from './pages/FatSatLabPage';
import { LearningAcademyPage } from './pages/LearningAcademyPage';
import { Iec61850AcademyPage } from './pages/Iec61850AcademyPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { CcnaAcademyPage } from './pages/CcnaAcademyPage';
import { AuthPortalPage, UserProfilePage, AdminDashboardPage } from './pages/AuthAndAdminPages';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckSquare,
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
  } = useSubstationStore();

  const {
    currentUserId,
    users,
    guestLang,
    announcements,
    setActiveProfileTab,
    signOut,
    setUserLanguage,
  } = useAuthStore();

  const [showLanding, setShowLanding] = useState(() => !window.location.hash.startsWith('#/workspace/'));
  // Deep-link the active workspace: refreshing /workspace/GOOSE stays in GOOSE Lab.
  useEffect(() => {
    const restoreLocation = () => {
      const match = window.location.hash.match(/^#\/workspace\/([A-Z0-9_]+)$/);
      if (match) {
        const requested = match[1] as ActiveWorkspaceTab;
        const valid = ['HERO','IEC61850_ACADEMY','INTERVIEW_PREP','CCNA_ACADEMY','SLD','SCADA','IED','IED_SIGNAL_CHAIN','NETWORK','GOOSE','MMS','MODBUS_LAB','IEC104_LAB','OPCUA_LAB','SIGNALS','FAULTS','FATSAT','LEARNING','USER_PROFILE','ADMIN_DASHBOARD'];
        if (valid.includes(requested)) {
          setActiveTab(requested);
          setShowLanding(false);
          return;
        }
      }
      setShowLanding(true);
    };
    restoreLocation();
    window.addEventListener('popstate', restoreLocation);
    window.addEventListener('hashchange', restoreLocation);
    return () => {
      window.removeEventListener('popstate', restoreLocation);
      window.removeEventListener('hashchange', restoreLocation);
    };
  }, [setActiveTab]);


  const openLanding = () => {
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
    window.history.pushState(null, '', '#/');
    setShowLanding(true);
  };

  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [displayLanguage, setDisplayLanguage] = useState<SupportedLanguageCode>(() => { try { return normalizeLanguageCode(localStorage.getItem('sas-display-language')); } catch { return 'EN'; } });
  const t = (english: string) => translateOfflineText(english, displayLanguage);
  const [authPopupMode, setAuthPopupMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

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
    window.addEventListener('sas:language-change', onExternalLangChange);
    return () => window.removeEventListener('sas:language-change', onExternalLangChange);
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
  const totalNotifications = unackAlarms + activeAnnouncements.length;
  const totalMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);

  const navItems: { id: ActiveWorkspaceTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'HERO', label: t('Substation Workspace'), icon: <Home className="w-4 h-4" /> },
    { id: 'SLD', label: '132/33/11kV SLD', icon: <GitBranch className="w-4 h-4" /> },
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
    { id: 'INTERVIEW_PREP', label: t('Interview Preparation'), icon: <Award className="w-4 h-4" /> },
    { id: 'CCNA_ACADEMY', label: t('CCNA Networking Academy'), icon: <Network className="w-4 h-4" /> },
    { id: 'LEARNING', label: t('Training (EN/TE)'), icon: <BookOpen className="w-4 h-4" /> },
  ];

  const navigate = (tab: ActiveWorkspaceTab) => {
    window.history.pushState(null, '', `#/workspace/${tab}`);
    setShowLanding(false);
    setActiveTab(tab);
    setMobileNavOpen(false);
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
    if (activeTab === 'HERO') return t('Substation Workspace');
    if (activeTab === 'ADMIN_DASHBOARD') return t('Admin Dashboard');
    if (activeTab === 'USER_PROFILE') return t('My Profile');
    return navItems.find((item) => item.id === activeTab)?.label || 'Substation Workspace';
  };

  const displayFullName = currentUser ? currentUser.fullName.trim() || 'My Account' : '';
  const userInitials = currentUser ? computeUserInitials(currentUser.fullName) : '';

  const languageBubble = (
              <>
              <style>{`
                /* Compact floating language selector on every page. */
                .sas-language-floating .sas-language-menu {
                  width: min(258px, calc(100vw - 24px)) !important;
                  min-width: 0 !important;
                  max-height: min(340px, 58dvh) !important;
                  padding: 5px !important;
                  border-radius: 12px !important;
                }
                .sas-language-floating .sas-language-heading {
                  padding: 5px 8px 6px !important;
                  font-size: 10px !important;
                }
                .sas-language-floating .sas-language-option {
                  min-height: 30px !important;
                  padding: 4px 8px !important;
                  gap: 6px !important;
                  font-size: 11px !important;
                  border-radius: 7px !important;
                  line-height: 1.2 !important;
                }
                .sas-language-floating .sas-language-english { font-size: 9px !important; }
                .sas-language-floating .sas-language-note {
                  padding: 6px 8px !important;
                  font-size: 9px !important;
                  line-height: 1.3 !important;
                }
              `}</style>
              <div ref={langRef} className="sas-header-language sas-language-floating">
                <button type="button" className="sas-language-trigger" aria-label="Select language" aria-haspopup="menu" aria-expanded={langMenuOpen} onClick={() => setLangMenuOpen(v => !v)}>
                  <Globe2 className="w-4 h-4" /><span className="sas-language-code">{displayLanguage}</span><ChevronDown className="w-3 h-3" />
                </button>
                {langMenuOpen && <div className="sas-language-menu" role="menu" aria-label="Available languages">
                  <div className="sas-language-heading">{t('Select language')}</div>
                  {SUPPORTED_LANGUAGE_LIST.map(({ code, label }) => <button type="button" role="menuitem" key={code} data-lang-option={code} className={`sas-language-option ${displayLanguage === code ? 'sas-language-selected' : ''}`} onClick={() => {
                    handleGlobalLangSwitch(code);
                  }}><span className="sas-language-native" data-no-translate="true">{label}</span><span className="sas-language-english" data-no-translate="true">{code}</span>{displayLanguage === code && <span className="sas-language-check" data-no-translate="true">✓</span>}</button>)}
                  <div className="sas-language-note">{t('Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.')}</div>
                </div>}
              </div>
              </>
  );

  if (showLanding) {
    return (
      <div className="relative min-h-screen">
        {languageBubble}
        <SubstationLandingPage destinations={navItems.map(item => ({ label: item.label, tab: item.id }))} onEnter={(tab) => navigate((tab || 'HERO') as ActiveWorkspaceTab)} />
        <div ref={profileRef} className="fixed right-4 top-5 sm:right-8 sm:top-7 z-[80] text-[#E9F3FF]">
          <button type="button" aria-label="Open profile menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-[#00CFFF]/65 bg-[#06182B] p-1.5 shadow-[0_0_16px_#00CFFF33]">
            {currentUser?.avatarDataUrl ? <img src={currentUser.avatarDataUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover" /> : currentUser ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#4338CA] text-xs font-black">{userInitials}</span> : <UserRound className="h-7 w-7 m-1 text-[#9EEFFF]" />}
            <ChevronDown className="h-4 w-4 text-[#9BC0DF]" />
          </button>
          {profileMenuOpen && <div className="absolute right-0 top-full mt-2 w-[min(300px,calc(100vw-32px))] rounded-xl border border-[#00CFFF]/65 bg-[#06182B] p-3 shadow-[0_16px_45px_#000b]" style={{backgroundColor:'#06182B',backdropFilter:'none',opacity:1}}>
            {currentUser ? <>
              <div className="border-b border-[#25415B] px-2 pb-3"><div className="truncate text-sm font-extrabold">{displayFullName}</div><div className="mt-1 flex justify-between gap-2 text-[11px]"><span className="text-[#00CFFF]">{currentUser.role === 'ADMIN' ? 'Admin' : 'Student'}</span><span className="truncate text-[#A6C5D9]">{currentUser.email}</span></div></div>
              <div className="py-2 space-y-0.5">
                <button onClick={() => openProfileSection('MY_PROFILE')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-[#102944]"><ShieldCheck className="h-4 w-4" />{t('My Profile')}</button>
                <button onClick={() => openProfileSection('LEARNING_PROGRESS')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-[#102944]"><GraduationCap className="h-4 w-4" />{t('Learning Progress')}</button>
                <button onClick={() => openProfileSection('EDIT_PROFILE')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-[#102944]"><Settings className="h-4 w-4" />{t('Edit Profile')}</button>
                <button onClick={() => openProfileSection('CHANGE_PASSWORD')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-[#102944]"><Lock className="h-4 w-4" />{t('Change Password')}</button>
              </div>
              <button onClick={() => {signOut();setProfileMenuOpen(false);}} className="flex w-full items-center gap-3 border-t border-[#25415B] px-2 pt-3 pb-1 text-left text-xs font-bold text-[#FF5C65]"><Power className="h-4 w-4" />{t('Sign Out')}</button>
            </> : <>
              <div className="flex items-center gap-3 border-b border-[#25415B] pb-3"><div className="rounded-full border border-[#00CFFF] p-2"><UserRound className="h-5 w-5" /></div><div><div className="text-sm font-extrabold">{t('Guest User')}</div><div className="text-[11px] text-[#A6C5D9]">{t('Sign in to personalize your experience')}</div></div></div>
              <div className="space-y-2 pt-3"><button onClick={() => {setProfileMenuOpen(false);setAuthPopupMode('SIGN_IN');}} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00D9FF] bg-gradient-to-r from-[#008FF0] to-[#1652D6] py-2.5 text-xs font-bold"><LogIn className="h-4 w-4" />{t('Sign In')}</button><button onClick={() => {setProfileMenuOpen(false);setAuthPopupMode('SIGN_UP');}} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00D9FF] bg-[#062F3E] py-2.5 text-xs font-bold text-[#4AF1F2]"><UserRoundPlus className="h-4 w-4" />{t('Sign Up')}</button><div className="py-1 text-center text-[11px] text-[#8FAFC8]">or continue as Guest</div><button onClick={() => setProfileMenuOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#57718B] bg-[#1A334B] py-2.5 text-xs font-semibold"><Rocket className="h-4 w-4" />{t('Continue as Guest')}</button></div>
            </>}
          </div>}
        </div>
        {authPopupMode && <div role="dialog" aria-modal="true" aria-label="Authentication popup" onClick={() => setAuthPopupMode(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-5"><AuthPortalPage isModal initialMode={authPopupMode} onClose={() => setAuthPopupMode(null)} onSuccessRedirect={() => setAuthPopupMode(null)} /></div>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030D1B] text-[#DCEAF5] font-sans overflow-x-hidden">
      {languageBubble}
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
        .sas-shared-brand-title { background: linear-gradient(100deg,#00edff,#5b9bff 60%,#e54cfc); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sasTitleShimmer 6s ease-in-out infinite; }
        .sas-shared-brand-icon { box-shadow: 0 0 24px #ff991e75; }
        @media (prefers-reduced-motion: reduce) { .sas-shared-brand-title { animation: none !important; } }
        .sas-fire-icon { animation: sasLightningStrike 3.6s linear infinite; will-change: filter, transform; }
        .sas-logo-halo { animation: sasLightningHalo 3.6s linear infinite; }
        .sas-gradient-title { background: linear-gradient(110deg,#eafaff 0%,#00dcff 24%,#6d9eff 44%,#ffe29b 65%,#ff7d35 80%,#eafaff 100%); background-size: 240% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sasTitleShimmer 6s ease-in-out infinite; }
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

      {/* Mobile / Tablet Navigation Drawer Overlay */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
        />
      )}

      {/* Left Sidebar (Fixed on >=1024px, Slide-Out Drawer on Mobile & Tablet) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[274px] flex flex-col bg-gradient-to-b from-[#0C2339] via-[#07192D] to-[#061323] transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-[#00cfff]/25 bg-gradient-to-r from-[#0b2a44]/60 to-transparent">
          <button
            type="button"
            onClick={() => navigate('HERO')}
            aria-label="Open substation workspace"
            className="sas-shared-brand-icon sas-logo-halo w-14 h-14 rounded-2xl border border-[#168bff] bg-[#071d38] flex items-center justify-center shrink-0"
          >
            <Zap className="sas-fire-icon w-8 h-8 text-[#aaf6ff] fill-current" />
          </button>
          <div className="min-w-0">
            <div className="sas-shared-brand-title text-[22px] leading-none font-black tracking-tight">
              Substation
            </div>
            <div className="sas-shared-brand-subtitle text-[10px] font-extrabold tracking-[0.24em] text-[#c8eaff] mt-1">
              AUTOMATION
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="ml-auto lg:hidden p-1.5 rounded-lg border border-[#2A4A64] text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-[#7D9DB6]">
          <span>{t('Your Workspace')}</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1" aria-label="Engineering modules">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`sas-nav-item w-full min-h-[44px] text-left flex items-center gap-3 rounded-lg px-3.5 py-2 border ${
                  active
                    ? 'sas-nav-active bg-gradient-to-r from-[#0D425D] to-[#09283e] border-[#00cfff] text-[#F1FDFF]'
                    : 'border-transparent text-[#a9c7da] hover:text-white hover:border-[#00cfff]/40 hover:bg-[#123b55]'
                }`}
              >
                <span className={`sas-nav-icon shrink-0 ${active ? 'text-[#77E7FF]' : 'text-[#89A8C0]'}`}>
                  {item.icon}
                </span>
                <span className="text-[12.5px] leading-5 font-semibold flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded bg-[#C43F58]/25 text-[#FF8B9D] px-1.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 text-[#00CFFF]" />}
              </button>
            );
          })}

          {/* RBAC: Admin Dashboard Item (Visible ONLY when authenticated role === 'ADMIN') */}
          {currentRole === 'ADMIN' && (
            <div className="pt-2 mt-2 border-t border-[#183B59]">
              <button
                type="button"
                onClick={() => navigate('ADMIN_DASHBOARD')}
                aria-current={activeTab === 'ADMIN_DASHBOARD' ? 'page' : undefined}
                className={`sas-nav-item w-full min-h-[44px] text-left flex items-center gap-3 rounded-lg px-3.5 py-2 border ${
                  activeTab === 'ADMIN_DASHBOARD'
                    ? 'sas-nav-active bg-gradient-to-r from-[#2D1A47] to-[#132942] border-[#00CFFF] text-white'
                    : 'border-[#00CFFF]/35 bg-[#092238] text-[#77E7FF] hover:text-white hover:border-[#00CFFF]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#00CFFF] shrink-0" />
                <span className="text-[12.5px] leading-5 font-extrabold flex-1">Admin Dashboard</span>
                <span className="rounded bg-[#00CFFF]/20 border border-[#00CFFF]/50 text-[#00CFFF] px-1.5 py-0.5 font-mono text-[9.5px] font-bold">
                  ADMIN
                </span>
              </button>
            </div>
          )}
        </nav>

        <div className="px-5 py-3.5 border-t border-[#00cfff]/30 bg-[#061b2c]/70 text-[10px] text-[#94bed3]">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            <span className="truncate">
              {currentUser ? displayFullName : 'Private engineering workspace'}
            </span>
          </div>
          <div className="mt-0.5 text-[#7FA6C4]">132/33/11 kV Digital Twin & Academies</div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[274px] flex flex-col min-w-0">
        {/* Responsive Sticky Header (Top-Right has Bell + Sign In / Sign Up buttons OR Dynamic User Profile Menu) */}
        <header className="sticky top-0 z-30 bg-[#061525]/95 backdrop-blur border-b border-[#18334B]">
          <div className="min-h-[60px] px-3 sm:px-6 py-2 flex items-center justify-between gap-2.5">
            {/* Left: Hamburger Menu (Mobile/Tablet) + Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-[13px] min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="lg:hidden p-2 rounded-lg border border-[#2A4A64] bg-[#081A30] text-[#C6DFEF] hover:border-[#00CFFF]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => navigate('HERO')}
                className="lg:hidden flex items-center gap-1.5 font-black tracking-wider text-[#00CFFF]"
              >
                <Zap className="w-4 h-4 text-[#ffb344]" />
                <span>SAS</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('HERO')}
                className="hidden sm:inline text-[#8BA9C0] hover:text-[#00CFFF]"
              >
                Engineering Hub
              </button>
              <span className="hidden sm:inline text-[#66859C]">/</span>
              <span className="font-bold text-[#E9F3FF] truncate max-w-[165px] sm:max-w-[340px]">
                {activeBreadcrumbLabel()}
              </span>
              <button type="button" onClick={openLanding} title="Back to opening page" className="ml-1 rounded-lg border border-[#23516B] px-2 py-1.5 text-[11px] font-semibold text-[#72DFFF] hover:bg-[#0A3448] whitespace-nowrap">← {t('Opening Page')}</button>
            </div>

            {/* Right: Notifications Bell + Sign In & Sign Up Options (when unauthenticated) OR Dynamic Profile Avatar & Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications Bell */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  aria-label="Notifications and announcements"
                  onClick={() => setNotifMenuOpen((o) => !o)}
                  className="relative p-2 rounded-full border border-transparent hover:border-[#234E73] hover:bg-[#081A30] text-[#DCEAF5] transition"
                >
                  <Bell className="w-5 h-5 text-[#DCEAF5]" />
                  {totalNotifications > 0 && (
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

          {/* Compact Telemetry & Simulator Status Strip */}
          <div className="px-3 sm:px-6 pb-2.5 flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="rounded-md border border-[#21405A] bg-[#0A1E32] px-2.5 py-1 text-[#00D9FF]">
              LOAD: {totalMw.toFixed(1)} MW
            </span>
            <span className="rounded-md border border-[#21405A] bg-[#0A1E32] px-2.5 py-1 text-[#22C55E]">
              FREQ: 50.00 Hz
            </span>
            <button
              type="button"
              onClick={() => navigate('SCADA')}
              className={`rounded-md border px-2.5 py-1 font-bold ${
                unackAlarms
                  ? 'border-[#FF4D62] text-[#FF7181] bg-[#FF4D62]/10'
                  : 'border-[#21405A] text-[#A7BBD0] bg-[#0A1E32]'
              }`}
            >
              ALARMS: {unackAlarms} UNACK
            </button>
            <button
              type="button"
              onClick={toggleSimulationRunning}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-bold ${
                simulationRunning
                  ? 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]'
                  : 'border-[#FFB547]/40 bg-[#FFB547]/10 text-[#FFB547]'
              }`}
            >
              {simulationRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {simulationRunning ? t('Sim Live') : t('Sim Paused')}
            </button>
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
        <main className="flex-1 p-2.5 sm:p-5 xl:p-6 w-full min-w-0">
          {activeTab === 'HERO' && <HeroDashboardPage />}
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
        </main>

        <footer className="px-4 sm:px-6 py-3 pb-14 sm:pb-3 bg-[#061525] border-t border-[#18334B] text-[10px] text-[#829CB0] flex flex-wrap justify-between gap-2">
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
          <AuthPortalPage
            isModal
            initialMode={authPopupMode}
            onClose={() => setAuthPopupMode(null)}
            onSuccessRedirect={() => setAuthPopupMode(null)}
          />
        </div>
      )}

    </div>
  );
}
