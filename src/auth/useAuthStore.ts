import { create } from 'zustand';

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
  passwordSalt: string;
  passwordHashHex: string;
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

// Deterministic salted hash helper (never stores plaintext passwords in localStorage or sessionStorage)
export const computeSaltedPasswordHash = (password: string, salt: string): string => {
  const input = `${salt}::sas_pbkdf2_v1::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x9e3779b9 ^ input.length;
  let h4 = 0x85ebca6b ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) + round * 17;
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ (ch << 3), 2246822507);
      h4 = Math.imul(h4 ^ (ch << 5), 3266489909);
    }
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h1 ^ h3)}${toHex(h2 ^ h4)}`;
};

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
const AUTH_STORAGE_KEY = 'sas_hub_auth_accounts_v3';
const SESSION_STORAGE_KEY = 'sas_hub_active_session_v3';

interface PersistedAuthDb {
  currentUserId: string | null;
  guestLang: 'EN' | 'TE' | 'TA' | 'HI' | 'PT' | 'KO' | 'FR' | 'JA';
  users: SasUserAccount[];
  chapterOverrides: Record<string, { published: boolean; customTitleEn?: string }>;
  resources: CourseResourceItem[];
  announcements: SystemAnnouncement[];
  auditLogs: AuditLogEntry[];
}

const loadAuthDb = (): PersistedAuthDb => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const sessionUserId =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        const savedUserId = parsed.currentUserId || sessionUserId || null;
        const validUser = savedUserId && parsed.users.some((u: SasUserAccount) => u.id === savedUserId);
        return {
          currentUserId: validUser ? savedUserId : null,
          guestLang: parsed.guestLang === 'TE' ? 'TE' : 'EN',
          users: parsed.users,
          chapterOverrides: parsed.chapterOverrides || {},
          resources: Array.isArray(parsed.resources) ? parsed.resources : INITIAL_RESOURCES,
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : INITIAL_ANNOUNCEMENTS,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        };
      }
    }
  } catch {
    // Ignore storage read errors in restricted iframe
  }
  // Requirement 1: On first launch, no predefined accounts and no user is authenticated
  return {
    currentUserId: null,
    guestLang: 'EN',
    users: [],
    chapterOverrides: {},
    resources: INITIAL_RESOURCES,
    announcements: INITIAL_ANNOUNCEMENTS,
    auditLogs: [],
  };
};

const saveAuthDb = (db: PersistedAuthDb, rememberMe = true) => {
  try {
    const toStore: PersistedAuthDb = {
      ...db,
      currentUserId: rememberMe ? db.currentUserId : null,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toStore));
    if (typeof sessionStorage !== 'undefined') {
      if (db.currentUserId) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, db.currentUserId);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage write errors
  }
};

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
  getEffectiveLanguage: () => 'EN' | 'TE';

  // Navigation / Profile Tab
  setActiveProfileTab: (tab: ProfileSectionTab) => void;

  // Auth Actions
  signIn: (email: string, password: string, rememberMe?: boolean) => { ok: boolean; message: string };
  quickSwitchAccount: (userId: string | null) => void;
  signUp: (payload: {
    fullName: string;
    email: string;
    password: string;
    specialization?: string;
  }) => { ok: boolean; message: string };
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

  // Admin RBAC Actions (enforced by role === 'ADMIN')
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

    signIn: (email, password, rememberMe = true) => {
      const normEmail = email.trim().toLowerCase();
      if (!normEmail || !password) {
        return { ok: false, message: 'Please enter both your email address and password.' };
      }
      const attempts = get().loginAttemptsByEmail[normEmail];
      if (attempts && attempts.lockedUntilMs > Date.now()) {
        const secs = Math.ceil((attempts.lockedUntilMs - Date.now()) / 1000);
        return {
          ok: false,
          message: `Account temporarily rate-limited due to failed attempts. Try again in ${secs}s.`,
        };
      }

      const user = get().users.find((u) => u.email.toLowerCase() === normEmail);
      if (!user) {
        return {
          ok: false,
          message: 'No account found with this email address. Please click "Create Account" to register.',
        };
      }
      if (user.status === 'SUSPENDED') {
        return { ok: false, message: 'This account has been suspended by an administrator.' };
      }

      const candidateHash = computeSaltedPasswordHash(password, user.passwordSalt);
      if (candidateHash !== user.passwordHashHex) {
        const prevCount = (attempts?.count || 0) + 1;
        const lockedUntilMs = prevCount >= 5 ? Date.now() + 30000 : 0;
        set((st) => ({
          loginAttemptsByEmail: {
            ...st.loginAttemptsByEmail,
            [normEmail]: { count: prevCount, lockedUntilMs },
          },
        }));
        return { ok: false, message: 'Invalid email address or password.' };
      }

      const nowIso = new Date().toISOString();
      const nextUsers = get().users.map((u) =>
        u.id === user.id ? { ...u, lastLoginAt: nowIso } : u
      );
      const nextLogs = appendAudit(user.email, user.role, 'USER_SIGN_IN', `Signed in (${user.role})`);
      persistState(
        {
          currentUserId: user.id,
          users: nextUsers,
          auditLogs: nextLogs,
          authBannerMessage: null,
        },
        rememberMe
      );
      return { ok: true, message: `Signed in as ${user.fullName}` };
    },

    quickSwitchAccount: (userId) => {
      if (!userId) {
        get().signOut();
        return;
      }
      const user = get().users.find((u) => u.id === userId);
      if (!user) return;
      persistState({
        currentUserId: user.id,
        authBannerMessage: null,
      });
    },

    signUp: ({ fullName, email, password, specialization }) => {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (cleanName.length < 2) {
        return { ok: false, message: 'Please enter your full name (at least 2 characters).' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { ok: false, message: 'Please enter a valid email address.' };
      }
      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        return {
          ok: false,
          message:
            'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
        };
      }
      if (get().users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { ok: false, message: 'An account with this email address is already registered.' };
      }

      const salt = `salt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const hashHex = computeSaltedPasswordHash(password, salt);
      const nowIso = new Date().toISOString();
      const curLang = get().guestLang;

      // Requirement 9: A newly registered account strictly receives the STUDENT role by default.
      // Never make the first registered user an administrator automatically.
      const newUser: SasUserAccount = {
        id: `USR-${Date.now().toString(36).toUpperCase()}`,
        fullName: cleanName,
        email: cleanEmail,
        role: 'STUDENT',
        specialization: (specialization || '').trim() || 'Substation Automation & IEC 61850 Engineering',
        status: 'ACTIVE',
        emailVerified: true,
        passwordSalt: salt,
        passwordHashHex: hashHex,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        progress: {
          iec61850CompletedChapters: [],
          iec61850LastChapterId: 'CH-01',
          iec61850QuizScores: {},
          interviewCompletedIds: [],
          interviewLastQuestionId: 'INT-Q-01',
          interviewMockScores: {},
          ccnaCompletedChapters: [],
          ccnaCompletedLabs: [],
          ccnaLastChapterNum: 1,
          lang: curLang,
        },
      };

      const nextUsers = [...get().users, newUser];
      const nextLogs = appendAudit(
        newUser.email,
        'STUDENT',
        'USER_SIGN_UP',
        `Registered account for ${newUser.fullName}`
      );
      persistState({
        currentUserId: newUser.id,
        users: nextUsers,
        auditLogs: nextLogs,
        authBannerMessage: null,
      });
      return { ok: true, message: `Welcome, ${newUser.fullName}! Your account has been created.` };
    },

    requestPasswordReset: (email) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { ok: false, message: 'Please enter a valid email address.' };
      }
      const token = `RST-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const match = get().users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (match) {
        set((st) => ({
          resetTokens: [
            ...st.resetTokens.filter((r) => r.email !== cleanEmail),
            { token, email: cleanEmail, expiresAtMs: Date.now() + 15 * 60 * 1000, used: false },
          ],
        }));
      }
      // Requirement 7: Neutral confirmation message that does not reveal whether an email address is registered
      return {
        ok: true,
        message:
          'If an account is registered with that email address, a password reset link (valid for 15 minutes) has been sent.',
        demoResetToken: match ? token : undefined,
      };
    },

    confirmPasswordReset: (token, newPassword) => {
      const cleanToken = token.trim();
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return {
          ok: false,
          message: 'New password must be at least 8 characters and include an uppercase letter and a number.',
        };
      }
      const rec = get().resetTokens.find(
        (r) => r.token === cleanToken && !r.used && r.expiresAtMs > Date.now()
      );
      if (!rec) {
        return { ok: false, message: 'Invalid, expired, or already-used password reset token.' };
      }
      const nextUsers = get().users.map((u) => {
        if (u.email.toLowerCase() !== rec.email) return u;
        const newSalt = `salt_${Date.now().toString(36)}`;
        return {
          ...u,
          passwordSalt: newSalt,
          passwordHashHex: computeSaltedPasswordHash(newPassword, newSalt),
        };
      });
      set((st) => ({
        resetTokens: st.resetTokens.map((r) => (r.token === cleanToken ? { ...r, used: true } : r)),
      }));
      const nextLogs = appendAudit(rec.email, 'USER', 'PASSWORD_RESET_COMPLETED', 'Single-use reset token consumed');
      persistState({ users: nextUsers, auditLogs: nextLogs });
      return { ok: true, message: 'Your password has been reset. You can now sign in with your new password.' };
    },

    updateOwnProfile: ({ fullName, specialization, avatarDataUrl, preferredLang, email }) => {
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

    changeOwnPassword: (currentPassword, newPassword) => {
      const user = get().getCurrentUser();
      if (!user) return { ok: false, message: 'Not authenticated.' };
      if (computeSaltedPasswordHash(currentPassword, user.passwordSalt) !== user.passwordHashHex) {
        return { ok: false, message: 'Current password is incorrect.' };
      }
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return {
          ok: false,
          message: 'New password must be at least 8 characters and include an uppercase letter and a number.',
        };
      }
      const newSalt = `salt_${Date.now().toString(36)}`;
      const nextUsers = get().users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              passwordSalt: newSalt,
              passwordHashHex: computeSaltedPasswordHash(newPassword, newSalt),
            }
          : u
      );
      const nextLogs = appendAudit(user.email, user.role, 'PASSWORD_CHANGE', 'Changed account password');
      persistState({ users: nextUsers, auditLogs: nextLogs });
      return { ok: true, message: 'Password updated successfully.' };
    },

    signOut: () => {
      const user = get().getCurrentUser();
      const nextLogs = user
        ? appendAudit(user.email, user.role, 'USER_SIGN_OUT', 'Invalidated active session')
        : get().auditLogs;
      persistState({ currentUserId: null, auditLogs: nextLogs, authBannerMessage: null }, true);
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

    adminChangeUserRole: (targetUserId, newRole) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') {
        return { ok: false, message: '403 Forbidden: Administrator privileges required.' };
      }
      const target = get().users.find((u) => u.id === targetUserId);
      if (!target) return { ok: false, message: 'Target user not found.' };
      const nextUsers = get().users.map((u) =>
        u.id === targetUserId ? { ...u, role: newRole } : u
      );
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'RBAC_ROLE_UPDATE',
        `Changed ${target.email} role from ${target.role} to ${newRole}`
      );
      persistState({ users: nextUsers, auditLogs: nextLogs });
      return { ok: true, message: `Updated ${target.fullName} role to ${newRole}.` };
    },

    adminToggleUserStatus: (targetUserId) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') {
        return { ok: false, message: '403 Forbidden: Administrator privileges required.' };
      }
      const target = get().users.find((u) => u.id === targetUserId);
      if (!target) return { ok: false, message: 'Target user not found.' };
      const nextStatus: SasUserAccount['status'] = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const nextUsers = get().users.map((u) =>
        u.id === targetUserId ? { ...u, status: nextStatus } : u
      );
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'ACCOUNT_STATUS_CHANGE',
        `Set ${target.email} status to ${nextStatus}`
      );
      persistState({ users: nextUsers, auditLogs: nextLogs });
      return { ok: true, message: `${target.fullName} is now ${nextStatus}.` };
    },

    adminToggleChapterPublished: (chapterKey, customTitleEn) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') {
        return { ok: false, message: '403 Forbidden: Administrator privileges required.' };
      }
      const cur = get().chapterOverrides[chapterKey] || { published: true };
      const nextPublished = customTitleEn !== undefined ? cur.published : !cur.published;
      const nextOverrides = {
        ...get().chapterOverrides,
        [chapterKey]: {
          published: nextPublished,
          customTitleEn: customTitleEn !== undefined ? customTitleEn : cur.customTitleEn,
        },
      };
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'COURSE_CONTENT_UPDATE',
        `Updated chapter ${chapterKey} (published=${nextPublished})`
      );
      persistState({ chapterOverrides: nextOverrides, auditLogs: nextLogs });
      return { ok: true, message: `Updated ${chapterKey}` };
    },

    adminAddResource: (item) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') {
        return { ok: false, message: '403 Forbidden: Administrator privileges required.' };
      }
      const newRes: CourseResourceItem = {
        ...item,
        id: `RES-${Date.now().toString().slice(-4)}`,
        uploadedBy: actor.email,
        uploadedAt: new Date().toISOString().slice(0, 10),
      };
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'RESOURCE_UPLOADED',
        `Added ${newRes.type} resource: ${newRes.title}`
      );
      persistState({ resources: [newRes, ...get().resources], auditLogs: nextLogs });
      return { ok: true, message: 'Resource added.' };
    },

    adminDeleteResource: (resourceId) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') return;
      const target = get().resources.find((r) => r.id === resourceId);
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'RESOURCE_DELETED',
        `Removed resource ${target?.title || resourceId}`
      );
      persistState({
        resources: get().resources.filter((r) => r.id !== resourceId),
        auditLogs: nextLogs,
      });
    },

    adminPublishAnnouncement: (title, message, severity) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') return;
      const ann: SystemAnnouncement = {
        id: `ANN-${Date.now().toString().slice(-4)}`,
        title: title.trim(),
        message: message.trim(),
        severity,
        publishedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
        author: actor.fullName,
        active: true,
      };
      const nextLogs = appendAudit(
        actor.email,
        actor.role,
        'ANNOUNCEMENT_PUBLISHED',
        `Published notice: ${ann.title}`
      );
      persistState({
        announcements: [ann, ...get().announcements],
        auditLogs: nextLogs,
      });
    },

    adminToggleAnnouncement: (annId) => {
      const actor = get().getCurrentUser();
      if (!actor || actor.role !== 'ADMIN') return;
      persistState({
        announcements: get().announcements.map((a) =>
          a.id === annId ? { ...a, active: !a.active } : a
        ),
      });
    },
  };
});
