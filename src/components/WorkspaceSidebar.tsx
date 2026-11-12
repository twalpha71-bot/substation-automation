import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Cpu, Home, Network, Search, Settings, Shield, UserRound, Wrench, X, Zap } from 'lucide-react';
import type { ActiveWorkspaceTab } from '../simulation/useSubstationStore';
import type { ProfileSectionTab } from '../auth/useAuthStore';
import { SUPPORTED_LANGUAGE_LIST, type SupportedLanguageCode } from '../i18n/offlineTranslation';
import '../styles/workspace-sidebar.css';

type NavItem = { id: ActiveWorkspaceTab; label: string; icon: React.ReactNode; badge?: number };
const groups: { id: string; label: string; icon: React.ReactNode; tabs: ActiveWorkspaceTab[] }[] = [
  { id: 'overview', label: 'Overview', icon: <Home />, tabs: ['HERO'] },
  { id: 'operation', label: 'SLD & Operation', icon: <Network />, tabs: ['SLD', 'SCADA'] },
  { id: 'ied', label: 'IED & Signals', icon: <Cpu />, tabs: ['IED', 'IED_SIGNAL_CHAIN'] },
  { id: 'communication', label: 'Communication', icon: <Network />, tabs: ['NETWORK', 'GOOSE', 'MMS', 'MODBUS_LAB', 'IEC104_LAB', 'OPCUA_LAB'] },
  { id: 'tools', label: 'Tools & Test', icon: <Wrench />, tabs: ['SIGNALS', 'FAULTS', 'FATSAT', 'IEC61850_ACADEMY', 'INTERVIEW_PREP', 'CCNA_ACADEMY', 'LEARNING'] },
];
const storageKey = 'sas-sidebar-groups-v1';

export function WorkspaceSidebar({ items, activeTab, navigate, mobileOpen, setMobileOpen, isAdmin, userName, avatar, openProfile, signIn, language, setLanguage, t }: {
  items: NavItem[]; activeTab: ActiveWorkspaceTab; navigate: (tab: ActiveWorkspaceTab) => void;
  mobileOpen: boolean; setMobileOpen: (open: boolean) => void; isAdmin: boolean;
  userName: string; avatar?: string; openProfile: (section: ProfileSectionTab) => void; signIn: () => void;
  language: SupportedLanguageCode; setLanguage: (language: SupportedLanguageCode) => void; t: (text: string) => string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return Object.fromEntries(groups.map(group => [group.id, typeof saved?.[group.id] === 'boolean' ? saved[group.id] : true]));
    } catch { return Object.fromEntries(groups.map(group => [group.id, true])); }
  });
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const searchTerm = query.trim().toLocaleLowerCase();
  const visibleGroups = groups.map(group => ({ ...group, items: items.filter(item => group.tabs.includes(item.id) && (!searchTerm || `${item.label} ${item.id} ${group.label}`.toLocaleLowerCase().includes(searchTerm))) })).filter(group => group.items.length);
  const showAdmin = isAdmin && (!searchTerm || 'admin dashboard'.includes(searchTerm));
  const resultCount = visibleGroups.reduce((count, group) => count + group.items.length, 0) + Number(showAdmin);
  const allExpanded = groups.every(group => expanded[group.id]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(expanded)); } catch { /* Navigation also works without storage. */ }
  }, [expanded]);
  useEffect(() => {
    const group = groups.find(group => group.tabs.includes(activeTab));
    if (group) setExpanded(previous => ({ ...previous, [group.id]: true }));
  }, [activeTab]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !settingsRef.current?.open) {
        event.preventDefault();
        if (window.matchMedia('(max-width: 1023px)').matches && !mobileOpen) {
          setMobileOpen(true);
        } else {
          searchRef.current?.focus();
          searchRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setMobileOpen, mobileOpen]);
  useEffect(() => {
    if (!mobileOpen || !window.matchMedia('(max-width: 1023px)').matches) return;
    const previous = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (settingsRef.current?.open) return;
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('button, input, [href]') || []).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [mobileOpen, setMobileOpen]);

  const go = (tab: ActiveWorkspaceTab) => { setQuery(''); navigate(tab); };
  const profile = (section: ProfileSectionTab) => {
    settingsRef.current?.close();
    if (userName) openProfile(section);
    else { setMobileOpen(false); signIn(); }
  };

  return <>
    {mobileOpen && <button type="button" className="workspace-sidebar-overlay" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
    <aside ref={sidebarRef} className={`workspace-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Workspace sidebar" onKeyDown={event => {
      if (event.key === 'Escape' && query) { event.preventDefault(); setQuery(''); searchRef.current?.focus(); }
    }}>
      <div className="workspace-sidebar-brand">
        <button className="workspace-sidebar-logo" onClick={() => go('HERO')} aria-label="Open substation workspace"><Zap /></button>
        <div><strong>Substation</strong><span>AUTOMATION</span></div>
        <button className="workspace-sidebar-collapse" aria-label={allExpanded ? 'Collapse all groups' : 'Expand all groups'} onClick={() => setExpanded(Object.fromEntries(groups.map(group => [group.id, !allExpanded])))}><ChevronDown className={allExpanded ? 'rotated' : ''} /></button>
        <button className="workspace-sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button>
      </div>
      <div className="workspace-sidebar-search">
        <Search aria-hidden="true" />
        <input ref={searchRef} aria-label="Search menu" placeholder={t('Search menu...')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter') {
            const first = visibleGroups[0]?.items[0];
            if (first) go(first.id); else if (showAdmin) go('ADMIN_DASHBOARD');
          }
          if (event.key === 'ArrowDown') { event.preventDefault(); sidebarRef.current?.querySelector<HTMLButtonElement>('.workspace-sidebar-link')?.focus(); }
        }} />
        {query ? <button aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X /></button> : <kbd>Ctrl + K</kbd>}
      </div>
      <span className="sr-only" role="status">{query ? `${resultCount} navigation results` : ''}</span>
      <nav className="workspace-sidebar-nav" aria-label="Engineering modules">
        {visibleGroups.map(group => {
          const open = !!searchTerm || expanded[group.id];
          return <section key={group.id} className="workspace-sidebar-group">
            <button className="workspace-sidebar-group-toggle" aria-expanded={open} aria-controls={`sidebar-${group.id}`} disabled={!!searchTerm} onClick={() => setExpanded(previous => ({ ...previous, [group.id]: !previous[group.id] }))}>
              {group.icon}<span>{t(group.label)}</span><ChevronDown className={open ? 'rotated' : ''} />
            </button>
            <div id={`sidebar-${group.id}`} hidden={!open}>
              {group.items.map(item => <button key={item.id} className="workspace-sidebar-link" aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => go(item.id)}>
                {item.icon}<span>{item.label}</span>{!!item.badge && <small>{item.badge}</small>}
              </button>)}
            </div>
          </section>;
        })}
        {showAdmin && <button className="workspace-sidebar-link workspace-sidebar-admin" aria-current={activeTab === 'ADMIN_DASHBOARD' ? 'page' : undefined} onClick={() => go('ADMIN_DASHBOARD')}><Shield /><span>{t('Admin Dashboard')}</span></button>}
        {!resultCount && <p className="workspace-sidebar-empty">{t('No matching destinations. Try another search.')}</p>}
      </nav>
      <div className="workspace-sidebar-footer">
        <button className="workspace-sidebar-profile" onClick={() => profile('MY_PROFILE')} aria-label="User Profile">
          {avatar ? <img src={avatar} alt="" /> : <UserRound />}<span><strong>{t('User Profile')}</strong><small>{userName || t('Manage account & preferences')}</small></span>
        </button>
        <button className="workspace-sidebar-settings" onClick={() => settingsRef.current?.showModal()} aria-label="Settings"><Settings /><span>{t('Settings')}</span></button>
      </div>
    </aside>
    <dialog ref={settingsRef} className="workspace-settings-dialog" aria-labelledby="workspace-settings-title" onClick={event => { if (event.target === event.currentTarget) settingsRef.current?.close(); }}>
      <div className="workspace-settings-heading"><h2 id="workspace-settings-title">{t('Settings')}</h2><button aria-label="Close settings" onClick={() => settingsRef.current?.close()}><X /></button></div>
      <label htmlFor="workspace-language">{t('Display language')}</label>
      <select id="workspace-language" value={language} onChange={event => setLanguage(event.target.value as SupportedLanguageCode)}>{SUPPORTED_LANGUAGE_LIST.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select>
      <p>{t('Offline translations are available for supported interface labels. Other page content remains unchanged until translated locally.')}</p>
      <button className="workspace-settings-action" onClick={() => profile('EDIT_PROFILE')}><UserRound />{t(userName ? 'Edit Profile' : 'Sign in to manage your profile')}</button>
      {userName && <button className="workspace-settings-action" onClick={() => profile('CHANGE_PASSWORD')}>{t('Change Password')}</button>}
    </dialog>
  </>;
}
