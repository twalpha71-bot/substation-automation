import { SubstationBrand } from '../components/SubstationBrand';
import React, { useEffect, useState } from 'react';
import { useAuthStore, computeUserInitials, ProfileSectionTab } from '../auth/useAuthStore';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { IEC61850_ACADEMY_CHAPTERS } from '../data/iec61850AcademyData';
import { INTERVIEW_MODULES_LIST } from '../data/interviewPrepData';
import { CCNA_CHAPTERS } from '../data/ccnaAcademyData';
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Eye,
  FileCode2,
  Globe2,
  GraduationCap,
  Lock,
  Network,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  X,
  Zap,
} from 'lucide-react';

// Embedded twilight 132/33/11 kV substation switchyard SVG backdrop so the photorealistic substation
// scene renders reliably in both local Vite dev/build and sandboxed Canvas environments.
const SUBSTATION_BG_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020916"/>
      <stop offset="42%" stop-color="#071d3b"/>
      <stop offset="68%" stop-color="#14385c"/>
      <stop offset="84%" stop-color="#4e3848"/>
      <stop offset="93%" stop-color="#9e5a3c"/>
      <stop offset="100%" stop-color="#051324"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx="0.32" cy="0.82" r="0.38">
      <stop offset="0%" stop-color="#ffb347" stop-opacity="0.72"/>
      <stop offset="45%" stop-color="#ff6b22" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#030d1b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#fff4c2" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#00d9ff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#00d9ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect width="1600" height="900" fill="url(#sunGlow)"/>
  <!-- Ground horizon -->
  <rect x="0" y="740" width="1600" height="160" fill="#030b16"/>
  <line x1="0" y1="740" x2="1600" y2="740" stroke="#00cfff" stroke-opacity="0.35" stroke-width="2"/>
  <!-- High-voltage transmission lines -->
  <g stroke="#77e7ff" stroke-opacity="0.28" stroke-width="1.5" fill="none">
    <path d="M 80 280 Q 420 355 780 300 T 1480 270"/>
    <path d="M 80 340 Q 420 410 780 355 T 1480 325"/>
    <path d="M 80 400 Q 420 465 780 410 T 1480 380"/>
  </g>
  <!-- Left 132 kV Lattice Tower -->
  <g stroke="#061526" stroke-width="4" fill="none">
    <polygon points="150,740 230,210 260,210 340,740" stroke="#102c48" stroke-width="5"/>
    <line x1="175" y1="580" x2="315" y2="580" stroke="#153a5e" stroke-width="4"/>
    <line x1="190" y1="450" x2="300" y2="450" stroke="#153a5e" stroke-width="4"/>
    <line x1="205" y1="330" x2="285" y2="330" stroke="#153a5e" stroke-width="4"/>
    <line x1="130" y1="275" x2="360" y2="275" stroke="#19466f" stroke-width="5"/>
    <line x1="115" y1="345" x2="375" y2="345" stroke="#19466f" stroke-width="5"/>
    <line x1="135" y1="415" x2="355" y2="415" stroke="#19466f" stroke-width="5"/>
    <line x1="150" y1="740" x2="315" y2="580" stroke="#123252" stroke-width="2.5"/>
    <line x1="340" y1="740" x2="175" y2="580" stroke="#123252" stroke-width="2.5"/>
    <line x1="175" y1="580" x2="300" y2="450" stroke="#123252" stroke-width="2.5"/>
    <line x1="315" y1="580" x2="190" y2="450" stroke="#123252" stroke-width="2.5"/>
  </g>
  <!-- Right 132 kV Portal Gantry & Transformers -->
  <g stroke="#143a5c" stroke-width="4" fill="none">
    <rect x="1160" y="340" width="28" height="400" fill="#091e34"/>
    <rect x="1420" y="340" width="28" height="400" fill="#091e34"/>
    <rect x="1130" y="340" width="350" height="24" fill="#0d2a47"/>
  </g>
  <!-- Illuminated Substation Transformers & Switchgear Cubicles -->
  <g>
    <rect x="160" y="610" width="190" height="130" rx="6" fill="#082038" stroke="#00cfff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="180" y="628" width="38" height="95" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
    <rect x="232" y="628" width="38" height="95" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
    <rect x="284" y="628" width="38" height="95" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
    <rect x="1180" y="595" width="230" height="145" rx="6" fill="#082038" stroke="#00cfff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="1205" y="615" width="52" height="105" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
    <rect x="1272" y="615" width="52" height="105" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
    <rect x="1339" y="615" width="52" height="105" fill="#0d3154" stroke="#38bdf8" stroke-opacity="0.5"/>
  </g>
  <!-- Floodlight Halos -->
  <circle cx="255" cy="590" r="85" fill="url(#lampGlow)"/>
  <circle cx="1295" cy="575" r="95" fill="url(#lampGlow)"/>
  <circle cx="490" cy="650" r="65" fill="url(#lampGlow)"/>
</svg>`);

export const AuthPortalPage: React.FC<{
  initialMode?: 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD';
  isModal?: boolean;
  onClose?: () => void;
  onSuccessRedirect?: () => void;
}> = ({ initialMode = 'SIGN_IN', isModal = false, onClose, onSuccessRedirect }) => {
  const { setActiveTab } = useSubstationStore();
  const {
    signIn,
    signUp,
    requestPasswordReset,
    confirmPasswordReset,
    getEffectiveLanguage,
  } = useAuthStore();

  const isTe = getEffectiveLanguage() === 'TE';
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [generatedTokenHint, setGeneratedTokenHint] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setStatusMsg(null);
  }, [initialMode]);

  const finishSuccess = () => {
    if (onClose) onClose();
    if (onSuccessRedirect) onSuccessRedirect();
    else setActiveTab('HERO');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn(email, password, rememberMe);
    setStatusMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      finishSuccess();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setStatusMsg({
        ok: false,
        text: isTe
          ? 'దయచేసి నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరించండి.'
          : 'Please agree to the Terms and Conditions and Privacy Policy.',
      });
      return;
    }
    if (password !== confirmPassword) {
      setStatusMsg({
        ok: false,
        text: isTe ? 'పాస్‌వర్డ్ మరియు కన్ఫర్మ్ పాస్‌వర్డ్ సరిపోలలేదు.' : 'Password and Confirm Password do not match.',
      });
      return;
    }
    const res = await signUp({
      fullName,
      email,
      password,
    });
    setStatusMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      finishSuccess();
    }
  };

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    const res = requestPasswordReset(email);
    setStatusMsg({ ok: res.ok, text: res.message });
    if (res.demoResetToken) {
      setGeneratedTokenHint(res.demoResetToken);
      setResetTokenInput(res.demoResetToken);
    }
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newResetPassword !== confirmResetPassword) {
      setStatusMsg({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }
    const res = confirmPasswordReset(resetTokenInput, newResetPassword);
    setStatusMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      setGeneratedTokenHint(null);
      setResetTokenInput('');
      setNewResetPassword('');
      setConfirmResetPassword('');
      setMode('SIGN_IN');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative w-full flex items-center justify-center overflow-hidden rounded-2xl border border-[#00CFFF]/55 bg-[#020A16] px-4 py-7 sm:px-8 sm:py-9 shadow-[0_0_55px_rgba(0,207,255,0.25)] ${
        isModal ? "max-w-[680px] max-h-[92vh] overflow-y-auto" : "min-h-[calc(100vh-8rem)]"
      }`}
    >
      {onClose && (
        <button
          type="button"
          aria-label="Close sign in popup"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 rounded-full border border-[#00CFFF]/50 bg-[#041224]/90 p-2 text-[#DCEAF5] hover:bg-[#00CFFF] hover:text-[#030B18] transition shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {/* Photorealistic electrical substation background with SVG fallback */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${SUBSTATION_BG_SVG}")` }}
      />
      <img
        src="assets/substation/substation_hero_opt.jpg"
        alt=""
        aria-hidden="true"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-65 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030C1A]/80 via-[#041428]/70 to-[#020914]/90 pointer-events-none" />

      {/* Centered Dark Navy Login / Registration / Forgot Password Panel matching reference image */}
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-[#00CFFF]/60 bg-[#051527]/90 backdrop-blur-md px-6 py-7 sm:px-8 sm:py-8 shadow-[0_0_40px_rgba(0,207,255,0.22)] space-y-5">
        {/* Top SAS Engineering Hub Logo */}
        <div className="flex items-center justify-center">
          <SubstationBrand variant="auth" />
        </div>

        {/* Status / Validation Feedback Banner */}
        {statusMsg && (
          <div
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              statusMsg.ok
                ? 'border-[#22C55E] bg-[#06291E]/90 text-[#4ADE80]'
                : 'border-[#FF5C65] bg-[#3B0D15]/90 text-[#FDA4AF]'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* ==================== 1. SIGN IN VIEW ==================== */}
        {mode === 'SIGN_IN' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {isTe ? 'మీ ఖాతాలోకి సైన్ ఇన్ చేయండి' : 'Sign In to Your Account'}
              </h1>
              <p className="text-xs text-[#9BC0DF]">
                {isTe
                  ? 'డిజిటల్ సబ్‌స్టేషన్, IEC 61850, ల్యాబ్స్ & అకాడమీలను యాక్సెస్ చేయండి'
                  : 'Access Digital Substation, IEC 61850, Labs & Academies'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Email Address */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77E7FF]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTe ? 'ఇమెయిల్ చిరునామా (Email Address)' : 'Email Address'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="pointer-events-none w-4 h-4 text-[#77E7FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isTe ? 'పాస్‌వర్డ్ (Password)' : 'Password'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FAFC8] hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password? */}
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#DCEAF5] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#00CFFF]"
                />
                <span>{isTe ? 'నన్ను గుర్తుంచుకో' : 'Remember me'}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode('FORGOT_PASSWORD');
                  setStatusMsg(null);
                }}
                className="font-semibold text-[#00CFFF] hover:underline"
              >
                {isTe ? 'పాస్‌వర్డ్ మర్చిపోయారా?' : 'Forgot Password?'}
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00B4FF] py-2.5 text-sm font-extrabold text-[#02101F] shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:brightness-110 transition"
            >
              {isTe ? 'సైన్ ఇన్ (Sign In)' : 'Sign In'}
            </button>

            <div className="text-center text-xs text-[#9BC0DF] pt-1">
              {isTe ? 'ఖాతా లేదా? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode('SIGN_UP');
                  setStatusMsg(null);
                }}
                className="font-extrabold text-[#00CFFF] hover:underline"
              >
                {isTe ? 'ఖాతా సృష్టించండి (Create Account)' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* ==================== 2. SIGN UP (CREATE ACCOUNT) VIEW ==================== */}
        {mode === 'SIGN_UP' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {isTe ? 'మీ ఖాతాను సృష్టించండి' : 'Create Your Account'}
              </h1>
              <p className="text-xs text-[#9BC0DF]">
                {isTe
                  ? 'SAS ఇంజనీరింగ్ హబ్‌లో చేరండి మరియు నేర్చుకోవడం ప్రారంభించండి'
                  : 'Join SAS Engineering Hub and start learning'}
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Full Name */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77E7FF]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isTe ? 'పూర్తి పేరు (Full Name)' : 'Full Name'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
              </div>

              {/* Email Address */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77E7FF]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTe ? 'ఇమెయిల్ చిరునామా (Email Address)' : 'Email Address'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="pointer-events-none w-4 h-4 text-[#77E7FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isTe ? 'పాస్‌వర్డ్ (8+ అక్షరాలు, A-Z, 0-9)' : 'Password'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FAFC8] hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="pointer-events-none w-4 h-4 text-[#77E7FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isTe ? 'పాస్‌వర్డ్ నిర్ధారించండి (Confirm Password)' : 'Confirm Password'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FAFC8] hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <label className="flex items-center gap-2 text-xs text-[#DCEAF5] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 rounded accent-[#00CFFF]"
              />
              <span>
                {isTe ? 'నేను ' : 'I agree to the '}
                <span className="text-[#00CFFF] underline">Terms and Conditions</span>
                {isTe ? ' మరియు ' : ' and '}
                <span className="text-[#00CFFF] underline">Privacy Policy</span>
              </span>
            </label>

            {/* Create Account Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00B4FF] py-2.5 text-sm font-extrabold text-[#02101F] shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:brightness-110 transition"
            >
              {isTe ? 'ఖాతా సృష్టించండి (Create Account)' : 'Create Account'}
            </button>

            <div className="text-center text-xs text-[#9BC0DF] pt-1">
              {isTe ? 'ఇప్పటికే ఖాతా ఉందా? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode('SIGN_IN');
                  setStatusMsg(null);
                }}
                className="font-extrabold text-[#00CFFF] hover:underline"
              >
                {isTe ? 'సైన్ ఇన్ (Sign In)' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {/* ==================== 3. FORGOT PASSWORD VIEW ==================== */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {isTe ? 'పాస్‌వర్డ్ మర్చిపోయారా?' : 'Forgot Password?'}
              </h1>
              <p className="text-xs text-[#9BC0DF]">
                {isTe
                  ? 'మీ ఇమెయిల్ చిరునామాను నమోదు చేయండి, మేము రీసెట్ లింక్ పంపుతాము'
                  : "Enter your email address and we'll send a reset link"}
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-3.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77E7FF]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTe ? 'ఇమెయిల్ చిరునామా (Email Address)' : 'Email Address'}
                  className="w-full rounded-xl border border-[#1E4E79] bg-[#04101E]/90 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7DA2C1] focus:border-[#00CFFF] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00B4FF] py-2.5 text-sm font-extrabold text-[#02101F] shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:brightness-110 transition"
              >
                {isTe ? 'రీసెట్ లింక్ పంపండి (Send Reset Link)' : 'Send Reset Link'}
              </button>
            </form>

            {generatedTokenHint && (
              <form
                onSubmit={handleConfirmReset}
                className="rounded-xl border border-[#00CFFF]/50 bg-[#030B18]/90 p-3.5 space-y-2.5 text-xs"
              >
                <div className="font-mono text-[11px] text-[#77E7FF]">
                  Single-Use Reset Token (15-min expiry):{' '}
                  <strong className="text-[#4ADE80]">{generatedTokenHint}</strong>
                </div>
                <input
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  placeholder="Reset Token"
                  className="w-full rounded-lg border border-[#1E4E79] bg-[#04101E] px-3 py-2 font-mono text-white"
                />
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="New Password (8+ chars, A-Z, 0-9)"
                  className="w-full rounded-lg border border-[#1E4E79] bg-[#04101E] px-3 py-2 text-white"
                />
                <input
                  type="password"
                  required
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full rounded-lg border border-[#1E4E79] bg-[#04101E] px-3 py-2 text-white"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#22C55E] py-2 font-extrabold text-[#030B18]"
                >
                  Confirm New Password
                </button>
              </form>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('SIGN_IN');
                  setStatusMsg(null);
                }}
                className="text-xs font-extrabold text-[#00CFFF] hover:underline"
              >
                {isTe ? '← సైన్ ఇన్‌కు తిరిగి వెళ్ళండి' : 'Back to Sign In'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const UserProfilePage: React.FC = () => {
  const { setActiveTab } = useSubstationStore();
  const {
    getCurrentUser,
    activeProfileTab,
    setActiveProfileTab,
    updateOwnProfile,
    changeOwnPassword,
    signOut,
  } = useAuthStore();

  const user = getCurrentUser();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [specialization, setSpecialization] = useState(user?.specialization || '');
  const [preferredLang, setPreferredLang] = useState<'EN' | 'TE'>(user?.progress.lang === 'TE' ? 'TE' : 'EN');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(user?.avatarDataUrl);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setSpecialization(user.specialization);
      setPreferredLang(user.progress.lang === 'TE' ? 'TE' : 'EN');
      setAvatarDataUrl(user.avatarDataUrl);
    }
  }, [user?.id, user?.fullName, user?.email, user?.avatarDataUrl, user?.progress.lang]);

  if (!user) {
    return <AuthPortalPage initialMode="SIGN_IN" />;
  }

  const isTe = user.progress.lang === 'TE';
  const displayFullName = user.fullName.trim() || 'My Account';
  const initials = computeUserInitials(user.fullName);
  const iecDone = user.progress.iec61850CompletedChapters.length;
  const intDone = user.progress.interviewCompletedIds.length;
  const ccnaDone = user.progress.ccnaCompletedChapters.length;
  const ccnaLabsDone = user.progress.ccnaCompletedLabs.length;
  const iecQuizValues = Object.values(user.progress.iec61850QuizScores);
  const avgIecQuiz =
    iecQuizValues.length > 0
      ? Math.round(iecQuizValues.reduce((a, b) => a + b, 0) / iecQuizValues.length)
      : 0;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5 pb-12 text-[#E9F3FF]">
      <div className="rounded-2xl border border-[#1B4B72] bg-[#081A30] p-4 sm:p-6 shadow-xl space-y-5">
        {/* Top Profile Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#163B5C] pb-4">
          <div className="flex items-center gap-3.5">
            {user.avatarDataUrl ? (
              <img
                src={user.avatarDataUrl}
                alt={displayFullName}
                className="h-14 w-14 rounded-full object-cover border-2 border-[#00CFFF]"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4338CA] border-2 border-[#00CFFF] flex items-center justify-center text-white font-black text-lg shadow-[0_0_16px_rgba(99,102,241,0.45)]">
                {initials}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">{displayFullName}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                    user.role === 'ADMIN'
                      ? 'bg-[#2B1F0B] text-[#FFD584] border border-[#FFB547]'
                      : 'bg-[#06291E] text-[#4ADE80] border border-[#22C55E]'
                  }`}
                >
                  {user.role === 'ADMIN' ? 'Admin' : 'Student'}
                </span>
              </div>
              <div className="text-xs text-[#8FAFC8] font-mono mt-0.5">
                {user.email} • {user.specialization}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
              setActiveTab('AUTH_SIGNIN');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FF5C65]/60 bg-[#3B0D15] text-xs font-extrabold text-[#FDA4AF] hover:brightness-110 transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isTe ? 'సైన్ అవుట్ (Sign Out)' : 'Sign Out'}</span>
          </button>
        </div>

        {/* 4 Profile Navigation Tabs matching the Profile Dropdown */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {(
            [
              ['MY_PROFILE', isTe ? 'నా ప్రొఫైల్ (My Profile)' : 'My Profile'],
              ['LEARNING_PROGRESS', isTe ? 'లెర్నింగ్ ప్రోగ్రెస్ (Learning Progress)' : 'Learning Progress'],
              ['EDIT_PROFILE', isTe ? 'ప్రొఫైల్ సవరించు (Edit Profile)' : 'Edit Profile'],
              ['CHANGE_PASSWORD', isTe ? 'పాస్‌వర్డ్ మార్చు (Change Password)' : 'Change Password'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveProfileTab(key);
                setFeedback(null);
              }}
              className={`px-3.5 py-2 rounded-xl border transition ${
                activeProfileTab === key
                  ? 'border-[#00CFFF] bg-[#00CFFF] text-[#030B18]'
                  : 'border-[#163B5C] bg-[#030B18] text-[#8FAFC8] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              feedback.ok
                ? 'border-[#22C55E] bg-[#06291E] text-[#4ADE80]'
                : 'border-[#FF5C65] bg-[#3B0D15] text-[#FDA4AF]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* TAB 1: MY PROFILE (Account Details + Learning Summary) */}
        {activeProfileTab === 'MY_PROFILE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            <div className="lg:col-span-6 rounded-xl border border-[#163B5C] bg-[#030B18] p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#00CFFF]">
                {isTe ? 'ఖాతా వివరాలు (Account Information)' : 'Authenticated Account Details'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Full Name</div>
                  <div className="mt-1 font-bold text-white">{displayFullName}</div>
                </div>
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Email Address</div>
                  <div className="mt-1 font-mono font-bold text-[#77E7FF] truncate">{user.email}</div>
                </div>
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Account Role</div>
                  <div className="mt-1 font-bold text-[#4ADE80]">
                    {user.role === 'ADMIN' ? 'Admin' : 'Student'}
                  </div>
                </div>
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Preferred Language</div>
                  <div className="mt-1 font-bold text-white">
                    {user.progress.lang === 'TE' ? 'తెలుగు (Telugu)' : 'English'}
                  </div>
                </div>
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Account Created</div>
                  <div className="mt-1 font-mono text-[#DCEAF5]">
                    {user.createdAt.replace('T', ' ').slice(0, 16)} UTC
                  </div>
                </div>
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3">
                  <div className="text-[10px] font-mono uppercase text-[#8FAFC8]">Last Sign In</div>
                  <div className="mt-1 font-mono text-[#DCEAF5]">
                    {user.lastLoginAt.replace('T', ' ').slice(0, 16)} UTC
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-[#163B5C] bg-[#030B18] p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#22C55E]">
                {isTe ? 'లెర్నింగ్ ప్రోగ్రెస్ సారాంశం' : 'Learning Progress Summary'}
              </div>
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00CFFF]">IEC 61850 Digital Substation Academy</span>
                    <span className="font-mono font-bold text-[#4ADE80]">
                      {iecDone} / 30 Chapters ({Math.round((iecDone / 30) * 100)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#030B18] overflow-hidden">
                    <div
                      className="h-full bg-[#00CFFF]"
                      style={{ width: `${Math.round((iecDone / 30) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#8FAFC8]">
                    Current Chapter: <strong className="text-white">{user.progress.iec61850LastChapterId}</strong>
                    {iecQuizValues.length > 0 && ` • Avg Quiz Score: ${avgIecQuiz}%`}
                  </div>
                </div>

                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#FFB547]">SAS Interview Preparation Academy</span>
                    <span className="font-mono font-bold text-[#4ADE80]">{intDone} Completed</span>
                  </div>
                  <div className="text-[11px] text-[#8FAFC8]">
                    Last Accessed Question:{' '}
                    <strong className="text-white">{user.progress.interviewLastQuestionId}</strong>
                  </div>
                </div>

                <div className="rounded-lg border border-[#142D47] bg-[#071628] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#22C55E]">CCNA Networking Academy</span>
                    <span className="font-mono font-bold text-[#4ADE80]">
                      {ccnaDone} / 30 Chapters ({Math.round((ccnaDone / 30) * 100)}%) • {ccnaLabsDone}/10 Labs
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#030B18] overflow-hidden">
                    <div
                      className="h-full bg-[#22C55E]"
                      style={{ width: `${Math.round((ccnaDone / 30) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#8FAFC8]">
                    Current Chapter: <strong className="text-white">Chapter {user.progress.ccnaLastChapterNum}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEARNING PROGRESS */}
        {activeProfileTab === 'LEARNING_PROGRESS' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#163B5C] bg-[#030B18] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00CFFF]">IEC 61850 Digital Substation</span>
                  <span className="font-mono text-xs font-bold text-[#22C55E]">
                    {iecDone} / 30 ({Math.round((iecDone / 30) * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#081A30] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00CFFF] to-[#22C55E]"
                    style={{ width: `${Math.round((iecDone / 30) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8FAFC8]">
                  Last Chapter: <strong className="text-white">{user.progress.iec61850LastChapterId}</strong>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {user.progress.iec61850CompletedChapters.map((cid) => (
                    <span
                      key={cid}
                      className="rounded bg-[#06291E] border border-[#22C55E]/40 px-2 py-0.5 font-mono text-[10px] text-[#4ADE80]"
                    >
                      ✓ {cid}
                    </span>
                  ))}
                  {iecDone === 0 && (
                    <span className="text-[11px] text-[#8FAFC8]">No chapters marked complete yet.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('IEC61850_ACADEMY')}
                  className="w-full rounded-lg bg-[#10253B] hover:bg-[#163350] border border-[#00CFFF]/40 py-1.5 text-xs font-bold text-[#00CFFF]"
                >
                  Open IEC 61850 Academy →
                </button>
              </div>

              <div className="rounded-xl border border-[#163B5C] bg-[#030B18] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FFB547]">Interview Preparation</span>
                  <span className="font-mono text-xs font-bold text-[#22C55E]">{intDone} Completed</span>
                </div>
                <div className="h-2 rounded-full bg-[#081A30] overflow-hidden">
                  <div
                    className="h-full bg-[#FFB547]"
                    style={{ width: `${Math.min(100, Math.round((intDone / 20) * 100))}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8FAFC8]">
                  Last Question: <strong className="text-white">{user.progress.interviewLastQuestionId}</strong>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {user.progress.interviewCompletedIds.map((qid) => (
                    <span
                      key={qid}
                      className="rounded bg-[#06291E] border border-[#22C55E]/40 px-2 py-0.5 font-mono text-[10px] text-[#4ADE80]"
                    >
                      ✓ {qid}
                    </span>
                  ))}
                  {intDone === 0 && (
                    <span className="text-[11px] text-[#8FAFC8]">No questions marked complete yet.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('INTERVIEW_PREP')}
                  className="w-full rounded-lg bg-[#10253B] hover:bg-[#163350] border border-[#FFB547]/40 py-1.5 text-xs font-bold text-[#FFD584]"
                >
                  Open Interview Preparation →
                </button>
              </div>

              <div className="rounded-xl border border-[#163B5C] bg-[#030B18] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#22C55E]">CCNA Networking Academy</span>
                  <span className="font-mono text-xs font-bold text-[#22C55E]">
                    {ccnaDone} / 30 ({Math.round((ccnaDone / 30) * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#081A30] overflow-hidden">
                  <div
                    className="h-full bg-[#22C55E]"
                    style={{ width: `${Math.round((ccnaDone / 30) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8FAFC8]">
                  Last Chapter: <strong className="text-white">Chapter {user.progress.ccnaLastChapterNum}</strong>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {user.progress.ccnaCompletedChapters.map((cnum) => (
                    <span
                      key={cnum}
                      className="rounded bg-[#06291E] border border-[#22C55E]/40 px-2 py-0.5 font-mono text-[10px] text-[#4ADE80]"
                    >
                      ✓ CH-{String(cnum).padStart(2, '0')}
                    </span>
                  ))}
                  {ccnaDone === 0 && (
                    <span className="text-[11px] text-[#8FAFC8]">No chapters marked complete yet.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('CCNA_ACADEMY')}
                  className="w-full rounded-lg bg-[#10253B] hover:bg-[#163350] border border-[#22C55E]/40 py-1.5 text-xs font-bold text-[#4ADE80]"
                >
                  Open CCNA Academy →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EDIT PROFILE */}
        {activeProfileTab === 'EDIT_PROFILE' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const res = updateOwnProfile({
                fullName,
                email,
                specialization,
                avatarDataUrl,
                preferredLang,
              });
              setFeedback({ ok: res.ok, text: res.message });
            }}
            className="max-w-lg space-y-4 text-xs pt-1"
          >
            {/* Profile Photo Upload */}
            <div className="flex items-center gap-4 rounded-xl border border-[#163B5C] bg-[#030B18] p-3.5">
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt="Preview"
                  className="h-14 w-14 rounded-full object-cover border border-[#00CFFF]"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4338CA] border border-[#00CFFF] flex items-center justify-center text-white font-black text-lg">
                  {computeUserInitials(fullName)}
                </div>
              )}
              <div className="space-y-1.5">
                <div className="font-bold text-white">Profile Photo</div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#00CFFF] bg-[#081A30] px-3 py-1.5 font-bold text-[#00CFFF] hover:bg-[#10253B]">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {avatarDataUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarDataUrl(undefined)}
                      className="rounded-lg border border-[#FF5C65]/50 bg-[#3B0D15] px-2.5 py-1.5 font-bold text-[#FDA4AF]"
                    >
                      Use Initials ({computeUserInitials(fullName)})
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#E9F3FF]">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#E9F3FF]">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#E9F3FF]">Preferred Language</label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as 'EN' | 'TE')}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              >
                <option value="EN">English</option>
                <option value="TE">తెలుగు (Telugu)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#E9F3FF]">Engineering Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00B4FF] px-5 py-2.5 font-extrabold text-[#030B18] shadow-[0_0_16px_rgba(0,217,255,0.35)]"
            >
              Save Profile Changes
            </button>
          </form>
        )}

        {/* TAB 4: CHANGE PASSWORD */}
        {activeProfileTab === 'CHANGE_PASSWORD' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPwd !== confirmNewPwd) {
                setFeedback({
                  ok: false,
                  text: 'New password and confirm new password do not match.',
                });
                return;
              }
              const res = changeOwnPassword(curPwd, newPwd);
              setFeedback({ ok: res.ok, text: res.message });
              if (res.ok) {
                setCurPwd('');
                setNewPwd('');
                setConfirmNewPwd('');
              }
            }}
            className="max-w-md space-y-3.5 text-xs pt-1"
          >
            <div>
              <label className="font-bold text-[#E9F3FF]">Current Password</label>
              <input
                type="password"
                required
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#E9F3FF]">New Password (8+ chars, A-Z, a-z, 0-9)</label>
              <input
                type="password"
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#E9F3FF]">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPwd}
                onChange={(e) => setConfirmNewPwd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1E466E] bg-[#030B18] px-3.5 py-2.5 text-white focus:border-[#00CFFF] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00B4FF] px-5 py-2.5 font-extrabold text-[#030B18] shadow-[0_0_16px_rgba(0,217,255,0.35)]"
            >
              Save Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { setActiveTab } = useSubstationStore();
  const {
    getCurrentUser,
    users,
    chapterOverrides,
    resources,
    announcements,
    auditLogs,
    adminChangeUserRole,
    quickSwitchAccount,
    adminToggleUserStatus,
    adminToggleChapterPublished,
    adminAddResource,
    adminDeleteResource,
    adminPublishAnnouncement,
    adminToggleAnnouncement,
  } = useAuthStore();

  const currentUser = getCurrentUser();
  const [adminTab, setAdminTab] = useState<
    | 'OVERVIEW'
    | 'USERS'
    | 'COURSES'
    | 'PROGRESS'
    | 'RESOURCES'
    | 'ANNOUNCEMENTS'
    | 'AUDIT_LOGS'
  >('OVERVIEW');
  const [userSearch, setUserSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<'IEC61850' | 'INTERVIEW' | 'CCNA'>('IEC61850');
  const [newResTitle, setNewResTitle] = useState('');
  const [newResAcademy, setNewResAcademy] = useState<'IEC61850' | 'INTERVIEW' | 'CCNA'>('IEC61850');
  const [newResType, setNewResType] = useState<'PDF' | 'DIAGRAM' | 'PACKET_TRACER' | 'SCL_XML'>('PDF');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');
  const [newAnnSev, setNewAnnSev] = useState<'INFO' | 'IMPORTANT' | 'MAINTENANCE'>('INFO');

  // Strict RBAC enforcement: only ADMIN can access AdminDashboardPage; no public self-promotion button
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-2xl border border-[#FF5C65] bg-[#081A30] p-6 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-[#FF5C65] mx-auto" />
          <h2 className="text-lg font-black text-white">
            403 Forbidden — Administrator Access Required
          </h2>
          <p className="text-xs text-[#8FAFC8]">
            Only authorized administrators provisioned on the backend may access the Admin Management Dashboard.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('HERO')}
            className="rounded-xl bg-[#00CFFF] px-4 py-2 text-xs font-extrabold text-[#030B18]"
          >
            Return to Substation Workspace
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.specialization.toLowerCase().includes(q)
    );
  });

  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE').length;
  const studentUsersCount = users.filter((u) => u.role === 'STUDENT').length;
  const totalChaptersCompletedAcrossUsers = users.reduce(
    (acc, u) =>
      acc +
      u.progress.iec61850CompletedChapters.length +
      u.progress.interviewCompletedIds.length +
      u.progress.ccnaCompletedChapters.length,
    0
  );

  return (
    <div className="space-y-4 pb-10 text-[#E9F3FF]">
      {/* Compact Admin Header */}
      <section className="rounded-2xl border border-[#1B4B72] bg-[#081A30] p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#163B5C] pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB547] bg-[#2B1F0B] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#FFD584]">
              <Shield className="w-3.5 h-3.5 text-[#FFB547]" /> RBAC ADMINISTRATOR CONSOLE
            </div>
            <h1 className="mt-1 text-lg sm:text-xl font-black text-white">
              SAS Engineering Hub — Admin Dashboard
            </h1>
            <p className="text-xs text-[#8FAFC8]">
              Manage users, roles, academy chapters, per-student learning progress, lab resources, announcements, and security audit logs.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-[#00CFFF]">
            <div>Admin: {currentUser.fullName}</div>
            <div className="text-[10px] text-[#8FAFC8]">{currentUser.email}</div>
          </div>
        </div>

        {/* 7 Admin Section Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          {([
            ['OVERVIEW', '1. Overview'],
            ['USERS', '2. User Management'],
            ['COURSES', '3. Course Management'],
            ['PROGRESS', '4. Learning Progress'],
            ['RESOURCES', '5. Resources'],
            ['ANNOUNCEMENTS', '6. Announcements'],
            ['AUDIT_LOGS', '7. Audit Logs'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAdminTab(key)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                adminTab === key
                  ? 'border-[#00CFFF] bg-[#00CFFF] text-[#030B18]'
                  : 'border-[#163B5C] bg-[#030B18] text-[#8FAFC8] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 1. OVERVIEW */}
      {adminTab === 'OVERVIEW' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-3.5">
              <div className="text-[11px] text-[#8FAFC8]">Total Users</div>
              <div className="mt-1 text-2xl font-black text-white">{users.length}</div>
              <div className="text-[10px] font-mono text-[#00CFFF]">PBKDF2 Salted Auth</div>
            </div>
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-3.5">
              <div className="text-[11px] text-[#8FAFC8]">Active Accounts</div>
              <div className="mt-1 text-2xl font-black text-[#22C55E]">{activeUsersCount}</div>
              <div className="text-[10px] font-mono text-[#4ADE80]">Verified Sessions</div>
            </div>
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-3.5">
              <div className="text-[11px] text-[#8FAFC8]">Registered Students</div>
              <div className="mt-1 text-2xl font-black text-[#00CFFF]">{studentUsersCount}</div>
              <div className="text-[10px] font-mono text-[#8FAFC8]">Isolated Progress</div>
            </div>
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-3.5">
              <div className="text-[11px] text-[#8FAFC8]">Academy Modules</div>
              <div className="mt-1 text-2xl font-black text-white">80</div>
              <div className="text-[10px] font-mono text-[#00CFFF]">30 IEC • 20 Int • 30 CCNA</div>
            </div>
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-3.5">
              <div className="text-[11px] text-[#8FAFC8]">Completed Units</div>
              <div className="mt-1 text-2xl font-black text-[#FFB547]">
                {totalChaptersCompletedAcrossUsers}
              </div>
              <div className="text-[10px] font-mono text-[#8FAFC8]">Across All Users</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#00CFFF] uppercase tracking-wider">
                Student Learning Snapshot (Isolated Per-Student Records)
              </div>
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg border border-[#163B5C] bg-[#030B18] p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-white">{u.fullName}</div>
                      <div className="text-[10px] font-mono text-[#8FAFC8]">{u.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#081A30] text-[#00CFFF]">
                        IEC 61850: {u.progress.iec61850CompletedChapters.length}/30
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#081A30] text-[#FFB547]">
                        Interview: {u.progress.interviewCompletedIds.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#081A30] text-[#22C55E]">
                        CCNA: {u.progress.ccnaCompletedChapters.length}/30
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#163B5C] bg-[#081A30] p-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#00CFFF] uppercase tracking-wider">
                Recent Security & Administrative Audit Trail
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-[#163B5C] bg-[#030B18] p-2.5 flex items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <div>
                      <span className="text-[#00CFFF] font-bold">{log.action}</span> —{' '}
                      <span className="text-white">{log.target}</span>
                      <div className="text-[10px] text-[#8FAFC8]">
                        Actor: {log.actorEmail} ({log.actorRole})
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8FAFC8] shrink-0">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER MANAGEMENT */}
      {adminTab === 'USERS' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-white text-sm">
              Registered User Accounts ({filteredUsers.length})
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#00CFFF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, email, role..."
                className="w-full rounded-lg border border-[#1E466E] bg-[#030B18] pl-8 pr-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-[#163B5C] text-[11px] uppercase text-[#8FAFC8]">
                  <th className="py-2 px-2.5">User / Email</th>
                  <th className="py-2 px-2.5">Specialization</th>
                  <th className="py-2 px-2.5">Role</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#163B5C]/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#10253B]/50">
                    <td className="py-2.5 px-2.5">
                      <div className="font-bold text-white">{u.fullName}</div>
                      <div className="font-mono text-[10.5px] text-[#8FAFC8]">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-2.5 text-[#8FAFC8]">{u.specialization}</td>
                    <td className="py-2.5 px-2.5">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-[#2B1F0B] text-[#FFD584] border border-[#FFB547]'
                            : 'bg-[#06291E] text-[#4ADE80] border border-[#22C55E]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'text-[#22C55E] bg-[#06291E]'
                            : 'text-[#FF5C65] bg-[#3B0D15]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            adminChangeUserRole(u.id, u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN')
                          }
                          className="rounded border border-[#00CFFF]/50 bg-[#030B18] px-2 py-1 text-[10.5px] font-bold text-[#00CFFF]"
                        >
                          Set {u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN'}
                        </button>
                        <button
                          type="button"
                          onClick={() => adminToggleUserStatus(u.id)}
                          className="rounded border border-[#FFB547]/50 bg-[#030B18] px-2 py-1 text-[10.5px] font-bold text-[#FFD584]"
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. COURSE MANAGEMENT */}
      {adminTab === 'COURSES' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-white text-sm">
              Course Chapter Publishing & Curriculum Organization
            </div>
            <div className="flex gap-1.5">
              {(['IEC61850', 'INTERVIEW', 'CCNA'] as const).map((ac) => (
                <button
                  key={ac}
                  type="button"
                  onClick={() => setCourseFilter(ac)}
                  className={`px-3 py-1 rounded-lg border font-bold ${
                    courseFilter === ac
                      ? 'border-[#00CFFF] bg-[#00CFFF] text-[#030B18]'
                      : 'border-[#163B5C] bg-[#030B18] text-[#8FAFC8]'
                  }`}
                >
                  {ac === 'IEC61850'
                    ? 'IEC 61850 (30 Ch)'
                    : ac === 'INTERVIEW'
                    ? 'Interview Prep (20 Mod)'
                    : 'CCNA (30 Ch)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
            {(courseFilter === 'IEC61850'
              ? IEC61850_ACADEMY_CHAPTERS.map((c) => ({
                  key: `IEC-${c.id}`,
                  num: c.chapterNumber,
                  title: c.titleEn,
                }))
              : courseFilter === 'INTERVIEW'
              ? INTERVIEW_MODULES_LIST.map((m) => ({
                  key: `INT-M${m.moduleNumber}`,
                  num: m.moduleNumber,
                  title: m.titleEn,
                }))
              : CCNA_CHAPTERS.map((c) => ({
                  key: `CCNA-CH${c.chapterNumber}`,
                  num: c.chapterNumber,
                  title: c.titleEn,
                }))
            ).map((item) => {
              const ov = chapterOverrides[item.key];
              const isPub = ov ? ov.published : true;
              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-[#163B5C] bg-[#030B18] p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-[#00CFFF]">
                      #{item.num} • {item.key}
                    </div>
                    <div className="font-bold text-white truncate">{item.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => adminToggleChapterPublished(item.key)}
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10.5px] font-bold ${
                      isPub
                        ? 'border-[#22C55E] bg-[#06291E] text-[#4ADE80]'
                        : 'border-[#FFB547] bg-[#2B1F0B] text-[#FFD584]'
                    }`}
                  >
                    {isPub ? 'Published' : 'Draft / Hidden'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. LEARNING PROGRESS */}
      {adminTab === 'PROGRESS' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-3 text-xs">
          <div className="font-bold text-white text-sm">
            Student Chapter Completion & Assessment Progress Matrix
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-[#163B5C] text-[11px] uppercase text-[#8FAFC8]">
                  <th className="py-2 px-2.5">Student</th>
                  <th className="py-2 px-2.5">IEC 61850 (30 Chapters)</th>
                  <th className="py-2 px-2.5">Interview Prep</th>
                  <th className="py-2 px-2.5">CCNA (30 Chapters)</th>
                  <th className="py-2 px-2.5">Inspect Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#163B5C]/60">
                {users.map((u) => {
                  const iecN = u.progress.iec61850CompletedChapters.length;
                  const intN = u.progress.interviewCompletedIds.length;
                  const ccnaN = u.progress.ccnaCompletedChapters.length;
                  return (
                    <tr key={u.id}>
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-white">{u.fullName}</div>
                        <div className="font-mono text-[10px] text-[#8FAFC8]">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[#00CFFF]">
                        {iecN} / 30 chapters ({Math.round((iecN / 30) * 100)}%)
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[#FFB547]">
                        {intN} chapters/items completed
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[#22C55E]">
                        {ccnaN} / 30 chapters ({Math.round((ccnaN / 30) * 100)}%)
                      </td>
                      <td className="py-2.5 px-2.5">
                        <button
                          type="button"
                          onClick={() => quickSwitchAccount(u.id)}
                          className="rounded border border-[#00CFFF]/50 bg-[#030B18] px-2.5 py-1 text-[10.5px] font-bold text-[#00CFFF]"
                        >
                          Preview User Progress
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. RESOURCES MANAGEMENT */}
      {adminTab === 'RESOURCES' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newResTitle.trim()) return;
              adminAddResource({
                title: newResTitle.trim(),
                academy: newResAcademy,
                type: newResType,
                sizeLabel: '1.5 MB',
              });
              setNewResTitle('');
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-[#030B18] p-3 rounded-xl border border-[#163B5C]"
          >
            <input
              type="text"
              value={newResTitle}
              onChange={(e) => setNewResTitle(e.target.value)}
              placeholder="New resource title (PDF, Diagram, .pkt)..."
              className="sm:col-span-2 rounded-lg border border-[#1E466E] bg-[#081A30] px-3 py-1.5 text-white"
            />
            <select
              value={newResAcademy}
              onChange={(e) => setNewResAcademy(e.target.value as any)}
              className="rounded-lg border border-[#1E466E] bg-[#081A30] px-2.5 py-1.5 text-white"
            >
              <option value="IEC61850">IEC 61850 Academy</option>
              <option value="INTERVIEW">Interview Preparation</option>
              <option value="CCNA">CCNA Academy</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[#00CFFF] text-[#030B18] font-extrabold py-1.5 px-3"
            >
              + Upload Resource
            </button>
          </form>

          <div className="space-y-2">
            {resources.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#163B5C] bg-[#030B18] p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="rounded bg-[#10253B] px-2 py-0.5 font-mono text-[10px] font-bold text-[#00CFFF] mr-2">
                    {r.academy} • {r.type}
                  </span>
                  <span className="font-bold text-white">{r.title}</span>
                  <span className="ml-2 font-mono text-[10px] text-[#8FAFC8]">({r.sizeLabel})</span>
                </div>
                <button
                  type="button"
                  onClick={() => adminDeleteResource(r.id)}
                  className="rounded border border-[#FF5C65]/50 bg-[#3B0D15] px-2.5 py-1 text-[10px] font-bold text-[#FDA4AF]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ANNOUNCEMENTS */}
      {adminTab === 'ANNOUNCEMENTS' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAnnTitle.trim() || !newAnnMsg.trim()) return;
              adminPublishAnnouncement(newAnnTitle, newAnnMsg, newAnnSev);
              setNewAnnTitle('');
              setNewAnnMsg('');
            }}
            className="space-y-2.5 bg-[#030B18] p-3.5 rounded-xl border border-[#163B5C]"
          >
            <div className="font-bold text-[#00CFFF]">Publish New Notice to Students</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder="Announcement headline..."
                className="sm:col-span-2 rounded-lg border border-[#1E466E] bg-[#081A30] px-3 py-1.5 text-white"
              />
              <select
                value={newAnnSev}
                onChange={(e) => setNewAnnSev(e.target.value as any)}
                className="rounded-lg border border-[#1E466E] bg-[#081A30] px-2.5 py-1.5 text-white"
              >
                <option value="INFO">INFO</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={newAnnMsg}
              onChange={(e) => setNewAnnMsg(e.target.value)}
              placeholder="Announcement details..."
              className="w-full rounded-lg border border-[#1E466E] bg-[#081A30] p-2.5 text-white"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#00CFFF] px-4 py-1.5 font-extrabold text-[#030B18]"
            >
              Publish Notice
            </button>
          </form>

          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-[#163B5C] bg-[#030B18] p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="space-y-0.5 max-w-2xl">
                  <div className="font-bold text-white">
                    [{a.severity}] {a.title}
                  </div>
                  <div className="text-[#8FAFC8]">{a.message}</div>
                  <div className="font-mono text-[10px] text-[#00CFFF]">
                    {a.publishedAt} • {a.author}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => adminToggleAnnouncement(a.id)}
                  className={`rounded px-2.5 py-1 font-bold text-[10px] ${
                    a.active
                      ? 'bg-[#06291E] text-[#4ADE80] border border-[#22C55E]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {a.active ? 'Active' : 'Archived'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. AUDIT LOGS */}
      {adminTab === 'AUDIT_LOGS' && (
        <div className="rounded-2xl border border-[#163B5C] bg-[#081A30] p-4 space-y-3 text-xs">
          <div className="font-bold text-white text-sm">
            Immutable Security, RBAC & Administrative Audit Logs ({auditLogs.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px] font-mono text-[11px]">
              <thead>
                <tr className="border-b border-[#163B5C] text-[#8FAFC8]">
                  <th className="py-2 px-2">Timestamp</th>
                  <th className="py-2 px-2">Actor</th>
                  <th className="py-2 px-2">Role</th>
                  <th className="py-2 px-2">Event Action</th>
                  <th className="py-2 px-2">Target / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#163B5C]/60">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 px-2 text-[#8FAFC8]">{l.timestamp}</td>
                    <td className="py-2 px-2 text-white">{l.actorEmail}</td>
                    <td className="py-2 px-2 text-[#00CFFF]">{l.actorRole}</td>
                    <td className="py-2 px-2 text-[#4ADE80] font-bold">{l.action}</td>
                    <td className="py-2 px-2 text-slate-200">{l.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
