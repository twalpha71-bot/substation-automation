import React, { useEffect, useId, useRef } from 'react';
import { ChevronDown, GraduationCap, Lock, LogIn, Power, Rocket, Settings, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-react';
import { computeUserInitials, type ProfileSectionTab, type SasUserAccount } from '../auth/useAuthStore';
import '../styles/profile-menu.css';

type Props = {
  user: SasUserAccount | null;
  isTe: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (mode: 'SIGN_IN' | 'SIGN_UP') => void;
  onProfile: (section: ProfileSectionTab) => void;
  onGuest: () => void;
  onSignOut: () => void;
};

export function UserProfileMenu({ user, isTe, open, onOpenChange, onAuth, onProfile, onGuest, onSignOut }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const name = user?.fullName.trim() || 'My Account';
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onOpenChange(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const act = (action: () => void) => { onOpenChange(false); action(); };
  const items = [
    { tab: 'MY_PROFILE' as const, icon: ShieldCheck, label: isTe ? 'నా ప్రొఫైల్ (My Profile)' : 'My Profile' },
    { tab: 'LEARNING_PROGRESS' as const, icon: GraduationCap, label: isTe ? 'లెర్నింగ్ ప్రోగ్రెస్' : 'Learning Progress' },
    { tab: 'EDIT_PROFILE' as const, icon: Settings, label: isTe ? 'ప్రొఫైల్ సవరించు' : 'Edit Profile' },
    { tab: 'CHANGE_PASSWORD' as const, icon: Lock, label: isTe ? 'పాస్‌వర్డ్ మార్చు' : 'Change Password' },
  ];
  return <div className="sas-profile" ref={root} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) onOpenChange(false); }}>
    <style>{`
/* Compact guest account menu — scoped to this component. */
.sas-profile { position: relative; }
.sas-profile .sas-profile-trigger { width: 38px !important; height: 38px !important; min-width: 38px !important; min-height: 38px !important; padding: 2px !important; border-radius: 50% !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.sas-profile .sas-profile-avatar { width: 32px !important; height: 32px !important; min-width: 32px !important; min-height: 32px !important; border-radius: 50% !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; overflow: hidden; }
.sas-profile .sas-profile-avatar svg { width: 19px !important; height: 19px !important; }
.sas-profile .sas-profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sas-profile .sas-profile-menu.sas-profile-guest { position: absolute !important; top: calc(100% + 10px) !important; right: 0 !important; left: auto !important; width: min(320px, calc(100vw - 24px)) !important; min-width: 0 !important; max-width: calc(100vw - 24px) !important; height: auto !important; min-height: 0 !important; max-height: min(480px, calc(100dvh - 72px)) !important; overflow-y: auto !important; padding: 0 !important; border-radius: 15px !important; box-sizing: border-box !important; z-index: 10000 !important; }
.sas-profile .sas-profile-guest-header { display: flex !important; align-items: center !important; gap: 11px !important; padding: 14px 15px !important; min-height: 0 !important; height: auto !important; }
.sas-profile .sas-profile-guest-portrait { width: 43px !important; height: 43px !important; min-width: 43px !important; min-height: 43px !important; border-radius: 50% !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.sas-profile .sas-profile-guest-portrait svg { width: 25px !important; height: 25px !important; }
.sas-profile .sas-profile-guest-header strong { font-size: 17px !important; line-height: 1.3 !important; }
.sas-profile .sas-profile-guest-header p { font-size: 12px !important; line-height: 1.4 !important; margin: 3px 0 0 !important; }
.sas-profile .sas-profile-guest-actions { display: flex !important; flex-direction: column !important; gap: 9px !important; padding: 13px 15px 15px !important; }
.sas-profile .sas-profile-guest-actions > button { width: 100% !important; height: 40px !important; min-height: 40px !important; max-height: 40px !important; padding: 0 12px !important; margin: 0 !important; border-radius: 10px !important; font-size: 14px !important; line-height: 1.2 !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 9px !important; }
.sas-profile .sas-profile-guest-actions > button svg { width: 17px !important; height: 17px !important; flex-shrink: 0; }
.sas-profile .sas-profile-guest-actions > .sas-profile-continue { height: 38px !important; min-height: 38px !important; max-height: 38px !important; }
.sas-profile .sas-profile-divider { display: flex !important; align-items: center !important; gap: 8px !important; margin: 2px 0 !important; padding: 0 !important; font-size: 11px !important; line-height: 18px !important; white-space: nowrap; }
.sas-profile .sas-profile-divider span { flex: 1; min-width: 8px; }
@media (max-width: 480px) { .sas-profile .sas-profile-menu.sas-profile-guest { width: min(300px, calc(100vw - 16px)) !important; right: 0 !important; } }
`}</style>
    <button ref={trigger} type="button" className="sas-profile-trigger" aria-label="Open user profile menu" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => onOpenChange(!open)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); onOpenChange(true); } }}>
      <span className={`sas-profile-avatar ${user ? 'is-member' : 'is-guest'}`}>
        {user ? user.avatarDataUrl ? <img src={user.avatarDataUrl} alt="" /> : computeUserInitials(user.fullName) : <UserRound aria-hidden="true" />}
      </span>
      {user && <ChevronDown className="sas-profile-chevron" size={18} aria-hidden="true" />}
    </button>
    {open && <div ref={menu} id={id} role="menu" aria-label="User account" className={`sas-profile-menu ${user ? 'sas-profile-member' : 'sas-profile-guest'}`} onKeyDown={e => {
      const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    }}>
      {user ? <>
        <div className="sas-profile-member-header">
          <strong>{name}</strong>
          <div><span>{user.role === 'ADMIN' ? 'Admin' : 'Student'}</span><span className="sas-profile-email" title={user.email}>{user.email}</span></div>
        </div>
        <div className="sas-profile-actions">{items.map(({ tab, icon: Icon, label }) => <button role="menuitem" type="button" key={tab} onClick={() => act(() => onProfile(tab))}><Icon aria-hidden="true" /><span>{label}</span></button>)}</div>
        <div className="sas-profile-signout"><button role="menuitem" type="button" onClick={() => act(onSignOut)}><Power aria-hidden="true" /><span>{isTe ? 'సైన్ అవుట్ (Sign Out)' : 'Sign Out'}</span></button></div>
      </> : <>
        <div className="sas-profile-guest-header"><span className="sas-profile-guest-portrait"><UserRound aria-hidden="true" /></span><div><strong>{isTe ? 'అతిథి వినియోగదారు' : 'Guest User'}</strong><p>{isTe ? 'మీ అనుభవాన్ని వ్యక్తిగతీకరించడానికి సైన్ ఇన్ చేయండి' : 'Sign in to personalize your experience'}</p></div></div>
        <div className="sas-profile-guest-actions">
          <button role="menuitem" type="button" className="sas-profile-signin" onClick={() => act(() => onAuth('SIGN_IN'))}><LogIn aria-hidden="true" />{isTe ? 'సైన్ ఇన్' : 'Sign In'}</button>
          <button role="menuitem" type="button" className="sas-profile-signup" onClick={() => act(() => onAuth('SIGN_UP'))}><UserRoundPlus aria-hidden="true" />{isTe ? 'సైన్ అప్' : 'Sign Up'}</button>
          <div className="sas-profile-divider"><span />{isTe ? 'లేదా అతిథిగా కొనసాగించండి' : 'or continue as Guest'}<span /></div>
          <button role="menuitem" type="button" className="sas-profile-continue" onClick={() => act(onGuest)}><Rocket aria-hidden="true" />{isTe ? 'అతిథిగా కొనసాగించు' : 'Continue as Guest'}</button>
        </div>
      </>}
    </div>}
  </div>;
}
