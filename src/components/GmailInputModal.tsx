import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Mail, User, X, CheckCircle } from 'lucide-react';

interface GmailInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, name: string) => void;
}

export default function GmailInputModal({ isOpen, onClose, onSubmit }: GmailInputModalProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('khayatpro_web_mock_email') || '');
  const [name, setName] = useState(() => localStorage.getItem('khayatpro_web_mock_name') || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError('يرجى إدخال البريد الإلكتروني الخاص بجوجل.');
      return;
    }

    if (!trimmedName) {
      setError('يرجى إدخال اسمك الكريم.');
      return;
    }

    // Direct email validation format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال جيميل زبون حقيقي (مثال: name@gmail.com).');
      return;
    }

    onSubmit(trimmedEmail, trimmedName);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6" dir="rtl">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
          />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative bg-white w-full max-w-md bg-gradient-to-b from-white to-slate-50/50 rounded-[35px] shadow-2xl overflow-hidden border border-slate-100 p-8 text-right"
          >
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 left-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-90"
            >
              <X size={18} />
            </button>

            {/* Header section */}
            <div className="mb-6 mt-2 flex items-center gap-4">
              <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
                <Mail size={24} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">تسجيل الدخول بـ Google</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  محاكاة بيئة الويب الآمنة • Web Sim
                </p>
              </div>
            </div>

            {/* Explanation box */}
            <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-3 text-right">
              <ShieldAlert size={20} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                أنت تستخدم التطبيق في وضع الويب. يرجى إدخال عنوان بريدك الإلكتروني لإنشاء هويتك المحلية والخاصة بك لمزامنة ونسخ قاعدة البيانات على Google Drive بشكل مستقل تماماً.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  <span>الاسم الكامل</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl font-bold text-sm text-slate-800 transition-all"
                  autoFocus
                />
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 mr-1 flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <span>البريد الإلكتروني لـ Google (Gmail)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl font-bold text-sm text-slate-800 transition-all dir-ltr text-right"
                />
              </div>

              {/* Error boundary message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-100"
                >
                  {error}
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xs font-black text-slate-500 transition-all active:scale-[0.98]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-slate-900 rounded-2xl text-xs font-black text-white transition-all shadow-lg hover:shadow-indigo-100 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  <span>تسجيل الدخول والتفعيل</span>
                </button>
              </div>
            </form>

            <p className="mt-6 text-[10px] text-slate-400 font-bold leading-relaxed text-center">
              بياناتك مخزنة في قاعدة بيانات SQLite المحلية على متصفحك الحالي ولا يتم تشاركها مع أي شخص آخر.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
