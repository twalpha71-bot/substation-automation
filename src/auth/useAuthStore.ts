import { create } from 'zustand';
import { authApi, type AuthApiUser } from './authApi';
export type UserRole = 'GUEST' | 'STUDENT' | 'ADMIN';
export type ProfileSectionTab = 'MY_PROFILE' | 'LEARNING_PROGRESS' | 'EDIT_PROFILE' | 'CHANGE_PASSWORD';
export interface UserLearningProgress {
  iec61850CompletedChapters: string[];
  iec61850LastChapterId: string;
  iec61850QuizScores: Record<string, number>;
  interviewCompletedIds: string[];
  interviewLastQuestionId: string;
  interviewMockScores: Record<string, number>;
  ccnaCompletedChapters: number[];
  ccnaCompletedLabs: string[];
  ccnaLastChapterNum: number;
  lang: 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';
}
export interface SasUserAccount {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  specialization: string;
  avatarDataUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  progress: UserLearningProgress;
}
export interface CourseChapterMeta {
  id: string;
  academy: 'IEC61850' | 'INTERVIEW' | 'CCNA';
  chapterNumber: number;
  titleEn: string;
  published: boolean;
  updatedAt: string;
}
export interface CourseResourceItem {
  id: string;
  title: string;
  academy: 'IEC61850' | 'INTERVIEW' | 'CCNA';
  type: 'PDF' | 'DIAGRAM' | 'PACKET_TRACER' | 'SCL_XML';
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
}
export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'IMPORTANT' | 'MAINTENANCE';
  publishedAt: string;
  author: string;
  active: boolean;
}
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  ipAddress: string;
}
interface PasswordResetTokenRecord {
  token: string;
  email: string;
  expiresAtMs: number;
  used: boolean;
}
// Dynamically compute 1-2 letter uppercase initials from any authenticated user's full name
export const computeUserInitials = (fullName?: string | null): string => {
  const cleaned = (fullName || '').trim();
  if (!cleaned) return 'MA';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
};
const INITIAL_RESOURCES: CourseResourceItem[] = [
  {
    id: 'RES-01',
    title: '132/33/11 kV Substation SCD / CID Engineering Pack (IEC 61850 Ed 2.1)',
    academy: 'IEC61850',
    type: 'SCL_XML',
    sizeLabel: '1.8 MB',
    uploadedBy: 'System',
    uploadedAt: '2026-10-15',
  },
  {
    id: 'RES-02',
    title: '132/33/11 kV Single Line Diagram & Protection Coordination Handbook',
    academy: 'IEC61850',
    type: 'PDF',
    sizeLabel: '4.2 MB',
    uploadedBy: 'System',
    uploadedAt: '2026-10-18',
  },
  {
    id: 'RES-03',
    title: 'SAS FAT / SAT & Commissioning Field Checklist (GOOSE, MMS, PRP, IEC-104)',
    academy: 'INTERVIEW',
    type: 'PDF',
    sizeLabel: '2.4 MB',
    uploadedBy: 'System',
    uploadedAt: '2026-10-22',
  },
  {
    id: 'RES-04',
    title: 'CCNA 200-301 Complete 10 Cisco Packet Tracer (.pkt) Lab Topologies',
    academy: 'CCNA',
    type: 'PACKET_TRACER',
    sizeLabel: '6.5 MB',
    uploadedBy: 'System',
    uploadedAt: '2026-10-28',
  },
];
const INITIAL_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ANN-01',
    title: 'Unified Clean Academy UI & Bilingual Learning Active',
    message:
      'All 30 IEC 61850 chapters, 20 Interview Preparation modules, and 30 CCNA chapters support per-account progress synchronization and English / తెలుగు switching.',
    severity: 'INFO',
    publishedAt: '2026-11-06 09:00 UTC',
    author: 'SAS Engineering Hub',
    active: true,
  },
  {
    id: 'ANN-02',
    title: '132/33/11 kV Digital Twin & RCC IEC-104 Telecontrol Lab',
    message:
      'Practice remote breaker control from the 3D Remote Control Center (RCC) over TCP port 2404 and test all 8 WAN/Firewall fault scenarios.',
    severity: 'IMPORTANT',
    publishedAt: '2026-11-05 18:30 UTC',
    author: 'SAS Engineering Hub',
    active: true,
  },
];
// Clean storage key with zero predefined or hardcoded user accounts
const AUTH_STORAGE_KEY = 'sas_hub_auth_accounts_v3'; // Legacy read-only migration source
const CLIENT_PREFS_KEY = 'sas_hub_client_prefs_v1';
interface PersistedAuthDb {
  currentUserId: string | null;
  guestLang: UserLearningProgress['lang'];
  users: SasUserAccount[];
  chapterOverrides: Record<string, { published: boolean; customTitleEn?: string }>;
  resources: CourseResourceItem[];
  announcements: SystemAnnouncement[];
  auditLogs: AuditLogEntry[];
}
const loadAuthDb = (): PersistedAuthDb => {
  let legacy: Partial<PersistedAuthDb> = {};
  let prefs: Partial<PersistedAuthDb> = {};
  try { legacy = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}'); } catch { /* ignored */ }
  try { prefs = JSON.parse(localStorage.getItem(CLIENT_PREFS_KEY) || '{}'); } catch { /* ignored */ }
  // Never restore authentication or user roles from browser storage.
  // Read legacy progress only for the signed-in account after the API confirms identity.
  return {
    currentUserId: null,
    guestLang: prefs.guestLang || legacy.guestLang || 'EN',
    users: [],
    chapterOverrides: {},
    resources: INITIAL_RESOURCES,
    announcements: INITIAL_ANNOUNCEMENTS,
    auditLogs: [],
  };
};
const getSavedProgress = (email: string): UserLearningProgress | undefined => {
  try {
    const prefs = JSON.parse(localStorage.getItem(CLIENT_PREFS_KEY) || '{}');
    const match = prefs.progressByEmail?.[email.toLowerCase()];
    if (match) return match;
    const legacy = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    return legacy.users?.find((u: SasUserAccount) => u.email?.toLowerCase() === email.toLowerCase())?.progress;
  } catch { return undefined; }
};
const saveAuthDb = (db: PersistedAuthDb, _rememberMe = true) => {
  try {
    const raw = JSON.parse(localStorage.getItem(CLIENT_PREFS_KEY) || '{}');
    const progressByEmail = { ...(raw.progressByEmail || {}) };
    for (const user of db.users) {
      if (user.progress) progressByEmail[user.email.toLowerCase()] = user.progress;
    }
    localStorage.setItem(CLIENT_PREFS_KEY, JSON.stringify({ guestLang: db.guestLang, progressByEmail }));
  } catch { /* ignored */ }
};
const defaultProgress = (lang: UserLearningProgress['lang']): UserLearningProgress => ({
  iec61850CompletedChapters: [], iec61850LastChapterId: 'CH-01', iec61850QuizScores: {},
  interviewCompletedIds: [], interviewLastQuestionId: 'INT-Q-01', interviewMockScores: {},
  ccnaCompletedChapters: [], ccnaCompletedLabs: [], ccnaLastChapterNum: 1, lang,
});
const fromApiUser = (u: AuthApiUser, lang: UserLearningProgress['lang']): SasUserAccount => ({
  id: u.id, fullName: u.fullName, email: u.email, role: u.role,
  specialization: u.specialization, status: 'ACTIVE', emailVerified: false,
  createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(),
  progress: getSavedProgress(u.email) || defaultProgress(lang),
});
interface AuthStoreState {
  currentUserId: string | null;
  guestLang: 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';
  activeProfileTab: ProfileSectionTab;
  users: SasUserAccount[];
  chapterOverrides: Record<string, { published: boolean; customTitleEn?: string }>;
  resources: CourseResourceItem[];
  announcements: SystemAnnouncement[];
  auditLogs: AuditLogEntry[];
  resetTokens: PasswordResetTokenRecord[];
  loginAttemptsByEmail: Record<string, { count: number; lockedUntilMs: number }>;
  authBannerMessage: string | null;
  // Derived helpers
  getCurrentUser: () => SasUserAccount | null;
  getCurrentRole: () => UserRole;
  getEffectiveLanguage: () => UserLearningProgress['lang'];
  // Navigation / Profile Tab
  setActiveProfileTab: (tab: ProfileSectionTab) => void;
  // Auth Actions
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; message: string }>;
  quickSwitchAccount: (userId: string | null) => void;
  signUp: (payload: {
    fullName: string;
    email: string;
    password: string;
    specialization?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  requestPasswordReset: (email: string) => { ok: boolean; message: string; demoResetToken?: string };
  confirmPasswordReset: (token: string, newPassword: string) => { ok: boolean; message: string };
  updateOwnProfile: (updates: {
    fullName?: string;
    specialization?: string;
    avatarDataUrl?: string;
    preferredLang?: 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';
    email?: string;
  }) => { ok: boolean; message: string };
  changeOwnPassword: (currentPassword: string, newPassword: string) => { ok: boolean; message: string };
  signOut: () => void;
  // Per-User Course Progress Actions
  setUserLanguage: (lang: 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA') => void;
  toggleIec61850ChapterComplete: (chapterId: string) => void;
  setIec61850LastChapter: (chapterId: string) => void;
  recordIec61850QuizScore: (chapterId: string, scorePct: number) => void;
  toggleInterviewQuestionComplete: (questionId: string) => void;
  setInterviewLastQuestion: (questionId: string) => void;
  recordInterviewMockScore: (questionId: string, scorePct: number) => void;
  toggleCcnaChapterComplete: (chapterNum: number) => void;
  toggleCcnaLabComplete: (labId: string) => void;
  setCcnaLastChapter: (chapterNum: number) => void;
  // Admin actions disabled pending server-side RBAC endpoints
  adminChangeUserRole: (targetUserId: string, newRole: 'STUDENT' | 'ADMIN') => { ok: boolean; message: string };
  adminToggleUserStatus: (targetUserId: string) => { ok: boolean; message: string };
  adminToggleChapterPublished: (chapterKey: string, customTitleEn?: string) => { ok: boolean; message: string };
  adminAddResource: (item: Omit<CourseResourceItem, 'id' | 'uploadedBy' | 'uploadedAt'>) => { ok: boolean; message: string };
  adminDeleteResource: (resourceId: string) => void;
  adminPublishAnnouncement: (title: string, message: string, severity: 'INFO' | 'IMPORTANT' | 'MAINTENANCE') => void;
  adminToggleAnnouncement: (annId: string) => void;
}
const initialDb = loadAuthDb();
export const useAuthStore = create<AuthStoreState>((set, get) => {
  const persistState = (next: Partial<AuthStoreState>, rememberMe = true) => {
    set((state) => {
      const merged = { ...state, ...next };
      saveAuthDb(
        {
          currentUserId: merged.currentUserId,
          guestLang: merged.guestLang,
          users: merged.users,
          chapterOverrides: merged.chapterOverrides,
          resources: merged.resources,
          announcements: merged.announcements,
          auditLogs: merged.auditLogs,
        },
        rememberMe
      );
      return merged;
    });
  };
  const appendAudit = (actorEmail: string, actorRole: string, action: string, target: string) => {
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      actorEmail,
      actorRole,
      action,
      target,
      ipAddress: '10.132.10.50',
    };
    return [entry, ...get().auditLogs].slice(0, 80);
  };
  const updateCurrentUserProgress = (updater: (prev: UserLearningProgress) => UserLearningProgress) => {
    const curId = get().currentUserId;
    if (!curId) return;
    const nextUsers = get().users.map((u) =>
      u.id === curId ? { ...u, progress: updater(u.progress) } : u
    );
    persistState({ users: nextUsers });
  };
  return {
    currentUserId: initialDb.currentUserId,
    guestLang: initialDb.guestLang,
    activeProfileTab: 'MY_PROFILE',
    users: initialDb.users,
    chapterOverrides: initialDb.chapterOverrides,
    resources: initialDb.resources,
    announcements: initialDb.announcements,
    auditLogs: initialDb.auditLogs,
    resetTokens: [],
    loginAttemptsByEmail: {},
    authBannerMessage: null,
    getCurrentUser: () => {
      const { currentUserId, users } = get();
      if (!currentUserId) return null;
      return users.find((u) => u.id === currentUserId) || null;
    },
    getCurrentRole: () => {
      const u = get().getCurrentUser();
      if (!u) return 'GUEST';
      return u.role;
    },
    getEffectiveLanguage: () => {
      const u = get().getCurrentUser();
      if (u) return u.progress.lang;
      return get().guestLang;
    },
    setActiveProfileTab: (tab) => set({ activeProfileTab: tab }),
    signIn: async (email, password, _rememberMe = true) => {
      if (!email.trim() || !password) return { ok: false, message: 'Enter email and password.' };
      const result = await authApi.login(email.trim().toLowerCase(), password);
      if (!result.ok || !result.user) return { ok: false, message: result.message || 'Login failed.' };
      const user = fromApiUser(result.user, get().guestLang);
      persistState({ currentUserId: user.id, users: [user], authBannerMessage: null });
      return { ok: true, message: `Welcome back, ${user.fullName}!` };
    },
    // Account switching without a password is intentionally disabled.
    quickSwitchAccount: (userId) => {
      if (userId === null) void get().signOut();
    },
    signUp: async ({ fullName, email, password, specialization }) => {
      const result = await authApi.register({ fullName, email, password, specialization });
      if (!result.ok) return { ok: false, message: result.message || 'Registration failed.' };
      return get().signIn(email, password, true);
    },
    requestPasswordReset: (_email) => ({ ok: false, message: 'Password reset is temporarily unavailable until the secure server endpoint is added.' }),
    confirmPasswordReset: (_token, _newPassword) => ({ ok: false, message: 'Password reset is temporarily unavailable.' }),
    updateOwnProfile: ({ fullName, specialization, avatarDataUrl, preferredLang, email }) => {
      if (email !== undefined && email.toLowerCase() !== get().getCurrentUser()?.email.toLowerCase()) return { ok: false, message: 'Changing email requires a secure server endpoint.' };
      const user = get().getCurrentUser();
      if (!user) return { ok: false, message: 'Not authenticated.' };
      if (fullName !== undefined && fullName.trim().length < 2) {
        return { ok: false, message: 'Full name must be at least 2 characters.' };
      }
      const cleanEmail = email !== undefined ? email.trim().toLowerCase() : user.email;
      if (email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return { ok: false, message: 'Please enter a valid email address.' };
        }
        if (
          cleanEmail !== user.email.toLowerCase() &&
          get().users.some((u) => u.id !== user.id && u.email.toLowerCase() === cleanEmail)
        ) {
          return { ok: false, message: 'That email address is already in use by another account.' };
        }
      }
      const nextUsers = get().users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              fullName: fullName !== undefined ? fullName.trim() : u.fullName,
              email: cleanEmail,
              specialization:
                specialization !== undefined && specialization.trim()
                  ? specialization.trim()
                  : u.specialization,
              avatarDataUrl: avatarDataUrl !== undefined ? avatarDataUrl : u.avatarDataUrl,
              progress: {
                ...u.progress,
                lang: preferredLang !== undefined ? preferredLang : u.progress.lang,
              },
            }
          : u
      );
      const nextLogs = appendAudit(cleanEmail, user.role, 'PROFILE_UPDATE', `Updated profile (${fullName || user.fullName})`);
      persistState({
        users: nextUsers,
        guestLang: preferredLang !== undefined ? preferredLang : get().guestLang,
        auditLogs: nextLogs,
      });
      return { ok: true, message: 'Profile updated successfully.' };
    },
    changeOwnPassword: (_currentPassword, _newPassword) => ({ ok: false, message: 'Password change requires the secure server endpoint, not browser storage.' }),
    signOut: () => {
      // Never leave a browser-side authenticated identity after a logout request.
      void authApi.logout().then((result) => {
        if (!result.ok) console.warn('Server logout could not be confirmed; retry before signing into another account.');
      });
      persistState({ currentUserId: null, users: [], authBannerMessage: null });
    },
    setUserLanguage: (lang) => {
      const curId = get().currentUserId;
      if (curId) {
        const nextUsers = get().users.map((u) =>
          u.id === curId ? { ...u, progress: { ...u.progress, lang } } : u
        );
        persistState({ users: nextUsers, guestLang: lang });
      } else {
        persistState({ guestLang: lang });
      }
    },
    toggleIec61850ChapterComplete: (chapterId) => {
      updateCurrentUserProgress((p) => {
        const exists = p.iec61850CompletedChapters.includes(chapterId);
        return {
          ...p,
          iec61850CompletedChapters: exists
            ? p.iec61850CompletedChapters.filter((id) => id !== chapterId)
            : [...p.iec61850CompletedChapters, chapterId],
        };
      });
    },
    setIec61850LastChapter: (chapterId) => {
      updateCurrentUserProgress((p) => ({ ...p, iec61850LastChapterId: chapterId }));
    },
    recordIec61850QuizScore: (chapterId, scorePct) => {
      updateCurrentUserProgress((p) => ({
        ...p,
        iec61850QuizScores: { ...p.iec61850QuizScores, [chapterId]: scorePct },
        iec61850CompletedChapters:
          scorePct >= 50 && !p.iec61850CompletedChapters.includes(chapterId)
            ? [...p.iec61850CompletedChapters, chapterId]
            : p.iec61850CompletedChapters,
      }));
    },
    toggleInterviewQuestionComplete: (questionId) => {
      updateCurrentUserProgress((p) => {
        const exists = p.interviewCompletedIds.includes(questionId);
        return {
          ...p,
          interviewCompletedIds: exists
            ? p.interviewCompletedIds.filter((id) => id !== questionId)
            : [...p.interviewCompletedIds, questionId],
        };
      });
    },
    setInterviewLastQuestion: (questionId) => {
      updateCurrentUserProgress((p) => ({ ...p, interviewLastQuestionId: questionId }));
    },
    recordInterviewMockScore: (questionId, scorePct) => {
      updateCurrentUserProgress((p) => ({
        ...p,
        interviewMockScores: { ...p.interviewMockScores, [questionId]: scorePct },
        interviewCompletedIds:
          scorePct >= 65 && !p.interviewCompletedIds.includes(questionId)
            ? [...p.interviewCompletedIds, questionId]
            : p.interviewCompletedIds,
      }));
    },
    toggleCcnaChapterComplete: (chapterNum) => {
      updateCurrentUserProgress((p) => {
        const exists = p.ccnaCompletedChapters.includes(chapterNum);
        return {
          ...p,
          ccnaCompletedChapters: exists
            ? p.ccnaCompletedChapters.filter((n) => n !== chapterNum)
            : [...p.ccnaCompletedChapters, chapterNum],
        };
      });
    },
    toggleCcnaLabComplete: (labId) => {
      updateCurrentUserProgress((p) => {
        const exists = p.ccnaCompletedLabs.includes(labId);
        return {
          ...p,
          ccnaCompletedLabs: exists
            ? p.ccnaCompletedLabs.filter((id) => id !== labId)
            : [...p.ccnaCompletedLabs, labId],
        };
      });
    },
    setCcnaLastChapter: (chapterNum) => {
      updateCurrentUserProgress((p) => ({ ...p, ccnaLastChapterNum: chapterNum }));
    },
    adminChangeUserRole: (targetUserId, newRole) => ({ ok: false, message: 'Admin actions require a server endpoint.' }),
    adminToggleUserStatus: (targetUserId) => ({ ok: false, message: 'Admin actions require a server endpoint.' }),
    adminToggleChapterPublished: (chapterKey, customTitleEn) => ({ ok: false, message: 'Admin actions require a server endpoint.' }),
    adminAddResource: (item) => ({ ok: false, message: 'Admin actions require a server endpoint.' }),
    adminDeleteResource: (resourceId) => {},
    adminPublishAnnouncement: (title, message, severity) => {},
    adminToggleAnnouncement: (_annId) => {},
  };
});

// Restore the authenticated identity from the server after page refresh.
// Never use localStorage as proof of login.
void authApi.me().then((result) => {
  if (!result.ok || !result.user || useAuthStore.getState().currentUserId) return;
  const state = useAuthStore.getState();
  const user = fromApiUser(result.user, state.guestLang);
  useAuthStore.setState({ currentUserId: user.id, users: [user] });
});
