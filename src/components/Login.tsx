import { useState, useEffect } from 'react';
import { googleSignIn, guestSignIn, initAuth, User, isNative } from '../lib/auth';
import { motion } from 'motion/react';
import { Cloud, Lock as ShieldLockIcon, ShieldCheck, Database, UserCircle, ExternalLink, Scale } from 'lucide-react';
import LogoImage from '../assets/images/KhayyatProLogo (3).png';
import { clsx } from 'clsx';
import TermsModal from './TermsModal';
import GmailInputModal from './GmailInputModal';

interface LoginProps {
  onLogin: (user: User, token: string | null) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        onLogin(user, token);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [onLogin]);

  const handleSignIn = async () => {
    if (!isTermsChecked) return;
    
    if (!isNative) {
      // Prompt user with a gorgeous simulation dialogue on web browsers
      setIsGmailModalOpen(true);
      return;
    }
    
    // Direct native sign-in
    await handleGoogleSignInSubmit();
  };

  const handleGoogleSignInSubmit = async (webEmail?: string, webName?: string) => {
    try {
      setAuthLoading(true);
      setError(null);
      setIsGmailModalOpen(false);
      const result = await googleSignIn(webEmail, webName);
      if (result) {
        // Clicking Google Login automatically enables CloudSense syncing
        localStorage.setItem('khayatpro_cloud_sync', 'true');
        onLogin(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in failed', err);
      if (err.code === 'auth/popup-blocked') {
        setError('تعذر فتح صفحة تسجيل الدخول. يرجى التأكد من صلاحيات التطبيق.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مرة أخرى.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('فشل الاتصال بالإنترنت. يرجى التأكد من جودة الاتصال وأن التطبيق يمتلك الصلاحيات اللازمة.');
      } else {
        setError(`فشل تسجيل الدخول (${err.code || err.message}). يرجى المحاولة مرة أخرى.`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (!isTermsChecked) return;
    try {
      setAuthLoading(true);
      setError(null);
      const result = await guestSignIn();
      if (result) {
        localStorage.setItem('khayatpro_cloud_sync', 'false');
        onLogin(result.user, null);
      }
    } catch (err: any) {
      setError('عذراً، حدث خطأ أثناء البدء. يرجى المحاولة لاحقاً.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-bold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 font-sans" dir="rtl">
      <TermsModal 
        isOpen={isTermsModalOpen} 
        onClose={() => setIsTermsModalOpen(false)} 
      />
      <GmailInputModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onSubmit={handleGoogleSignInSubmit}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-indigo-100/50 border border-slate-100 text-center relative overflow-hidden"
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-indigo-400" />
        
        <div className="mb-10 flex flex-col items-center">
          <div className="w-24 h-24 mb-6 relative group">
            <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-xl group-hover:bg-indigo-600/20 transition-all duration-700" />
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-2xl relative z-10 p-1 bg-white">
              <img 
                src={LogoImage} 
                alt="KhayatPro Logo" 
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3" 
              />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">خياط برو</h1>
          <p className="text-sm text-slate-600 font-black leading-relaxed px-4">
            نظام إدارة متكامل للخياطين المحترفين. سجل دخولك للبدء في إدارة أعمالك.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {/* Legal Consent Checkbox */}
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] text-right space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-wider">
              <Scale size={14} />
              <span>الشروط القانونية والأحكام</span>
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={isTermsChecked}
                  onChange={(e) => setIsTermsChecked(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-2 border-amber-300 text-amber-600 appearance-none bg-white checked:bg-amber-600 checked:border-amber-600 relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:opacity-0 checked:after:opacity-100 transition-all cursor-pointer"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-relaxed select-none">
                أوافق على <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-indigo-600 underline hover:text-indigo-800 inline-flex items-center gap-0.5 font-black">الشروط القانونية والأحكام وسياسة الاستخدام<ExternalLink size={10} /></button> الخاصة بتطبيق KhayatPro Maroc.
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <button 
              disabled={!isTermsChecked || authLoading}
              onClick={handleSignIn}
              className={clsx(
                "w-full flex items-center justify-center gap-4 py-4 rounded-[24px] transition-all duration-300 shadow-sm group",
                isTermsChecked && !authLoading 
                ? "bg-indigo-600 text-white hover:bg-slate-900 border-2 border-indigo-600 hover:shadow-xl active:scale-[0.98]" 
                : "bg-slate-100 text-slate-400 border-2 border-slate-100 cursor-not-allowed opacity-60"
              )}
            >
              <div className={clsx("bg-white p-1 rounded-full transition-all duration-300", !isTermsChecked && "grayscale")}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11.996 11.996 0 000 12c0 1.92.45 3.74 1.24 5.36l3.6-2.26z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="text-base font-black">دخول بواسطة جوجل</span>
            </button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-[10px] font-black text-slate-300 uppercase shrink-0">أو</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <button 
              disabled={!isTermsChecked || authLoading}
              onClick={handleGuestSignIn}
              className={clsx(
                "w-full flex items-center justify-center gap-4 py-3.5 rounded-[24px] transition-all duration-300 group",
                isTermsChecked && !authLoading
                ? "bg-slate-900 text-white hover:bg-indigo-600 active:scale-[0.98]"
                : "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
              )}
            >
              <UserCircle size={20} className={clsx("transition-colors", isTermsChecked ? "text-white/80" : "text-slate-400")} />
              <span className="text-sm font-black">ابدأ الآن بحساب محلي</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex flex-col items-center opacity-40">
            <ShieldCheck size={18} className="text-slate-900 mb-1" />
            <span className="text-[9px] font-black uppercase">آمن تماماً</span>
          </div>
          <div className="w-px h-6 bg-slate-100" />
          <div className="flex flex-col items-center opacity-40">
            <Database size={18} className="text-slate-900 mb-1" />
            <span className="text-[9px] font-black uppercase">تخزين محلي</span>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 text-[11px] font-black rounded-2xl border border-red-100 flex flex-col items-center gap-1.5 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-right leading-relaxed">{error}</span>
            </div>

            {error.includes('12500') ? (
              <div className="mt-3 bg-white/70 border border-red-100 p-3.5 rounded-xl text-right text-[10px] text-slate-700 font-bold space-y-2 leading-relaxed">
                <p className="text-red-700 font-black">💡 ما هو الخطأ (12500) وكيف تحله؟</p>
                <p>هذا الخطأ يعني أن Google Sign-in على الهاتف لا يتعرف على تطبيقك للمطورين لسببين رئيسيين:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>عدم تسجيل بصمة الـ <span className="font-mono text-red-600 text-[9px]">SHA-1</span> الخاصة بجهازك أو بمفتاح الـ Keystore داخل <strong className="text-slate-900">Google Cloud Console</strong> أو <strong className="text-slate-900">Firebase Console</strong>.</li>
                  <li>استخدام معرف عميل (Client ID) خاطئ في ملف الإعدادات. يجب استخدام نوع <strong className="text-slate-900">"Web Application" Client ID</strong> كـ <strong className="text-indigo-600">clientId</strong> رئيسي وليس Android Client ID.</li>
                </ol>
                <div className="pt-2 border-t border-slate-100 flex flex-col items-stretch gap-1.5">
                  <p className="text-[9px] text-indigo-700 font-black">🚀 حلول فورية لتجاوز العقبة اليوم:</p>
                  <p className="text-[9px] text-slate-500">• يمكنك النقر على <strong className="text-slate-800">"ابدأ الآن بحساب محلي"</strong> في الأعلى للدخول فوراً والاشتغال على النظام أوفلاين دون قيود.</p>
                  <p className="text-[9px] text-slate-500">• احرص على توليد الـ SHA-1 من سطر الأوامر أو Gradle داخل Android Studio وإدراجه في كونسول جوجل.</p>
                </div>
              </div>
            ) : error.includes('فشل') ? (
              <div className="flex flex-col items-center gap-2 mt-2">
                <span className="text-[8px] opacity-60 font-bold">يرجى التأكد من اتصال الإنترنت أو إعدادات الجهاز</span>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[9px] bg-slate-900 text-white px-3 py-1 rounded-full font-black hover:bg-slate-800 transition-colors"
                >
                  إعادة تحميل الصفحة
                </button>
              </div>
            ) : null}
          </div>
        )}

        <p className="mt-8 text-[11px] text-slate-400 font-bold leading-relaxed px-2">
          بياناتك مملوكة لك بالكامل ويتم تشفيرها محلياً وسحابياً وفق أعلى معايير الأمان.
        </p>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl" />
      </motion.div>

      <div className="mt-12 text-center opacity-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <span>KhayatPro Moroccan Tailoring System</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>v1.0.0</span>
        </p>
      </div>
    </div>
  );
}

