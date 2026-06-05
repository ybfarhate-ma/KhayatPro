import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, FileText, Lock, AlertCircle, X, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  isAccepting?: boolean;
}

const TermsModal: React.FC<TermsModalProps> = ({ 
  isOpen, 
  onClose, 
  onAccept, 
  showAcceptButton = false,
  isAccepting = false 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const checkScrollStatus = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // Use a threshold to account for minor rounding issues
      if (scrollTop + clientHeight >= scrollHeight - 60 || scrollHeight <= clientHeight + 10) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setIsChecked(false);
      // Check if scroll is even needed
      setTimeout(checkScrollStatus, 500);
    }
  }, [isOpen]);

  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section5Ref = useRef<HTMLElement>(null);
  const section8Ref = useRef<HTMLElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    if (ref.current) {
      try {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Fallback for custom container if scrollIntoView doesn't behave as expected in iframe
        if (contentRef.current) {
          const containerTop = contentRef.current.getBoundingClientRect().top;
          const elementTop = ref.current.getBoundingClientRect().top;
          const scrollOffset = elementTop - containerTop + contentRef.current.scrollTop - 20;
          contentRef.current.scrollTo({ top: scrollOffset, behavior: 'smooth' });
        }
      } catch (e) {
        console.error('Scroll error:', e);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-6" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative bg-white w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100 hidden sm:flex">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">الشروط القانونية والأحكام</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    KhayatPro Maroc - المرجعية القانونية والتنظيمية
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            {/* Quick Navigation Cards */}
            <div className="bg-slate-50/50 p-6 sm:p-8 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <button 
                  onClick={() => scrollToSection(section1Ref)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all text-right group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <Scale size={24} />
                    </div>
                    <div className="text-indigo-400 opacity-20 group-hover:opacity-100 transition-opacity">
                       <ExternalLink size={16} />
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">الملكية الفكرية</h4>
                  <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">انقر للانتقال إلى بنود الحقوق</p>
                </button>

                <button 
                  onClick={() => scrollToSection(section2Ref)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-100 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all text-right group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                      <Lock size={24} />
                    </div>
                    <div className="text-emerald-400 opacity-20 group-hover:opacity-100 transition-opacity">
                       <ExternalLink size={16} />
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">إخلاء المسؤولية</h4>
                  <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">حدود المزامنة والمسؤولية</p>
                </button>

                <button 
                  onClick={() => scrollToSection(section5Ref)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-100 hover:border-rose-500 hover:shadow-2xl hover:shadow-rose-100/50 transition-all text-right group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                      <FileText size={24} />
                    </div>
                    <div className="text-rose-400 opacity-20 group-hover:opacity-100 transition-opacity">
                       <ExternalLink size={16} />
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-rose-600 transition-colors">حماية المعطيات</h4>
                  <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">القانون رقم 09-08 المغربي</p>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={contentRef}
              onScroll={checkScrollStatus}
              className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-12 custom-scrollbar bg-white"
            >
              <div className="max-w-3xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                  <p className="font-bold text-slate-600 leading-relaxed text-sm sm:text-base">
                    بقبولك لهذه الاتفاقية، أو باستمرار استخدامك للتطبيق، فإنك تقر بأنك تملك الأهلية القانونية والتجارية الكاملة للالتزام بالبنود التالية:
                  </p>
                </div>

                <div className="space-y-14 text-slate-700 leading-loose font-sans">
                  {/* 1 */}
                  <section ref={section1Ref} className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">1. الملكية الفكرية والحقوق الحصرية</h3>
                    </div>
                    <p className="font-medium text-slate-600 text-sm sm:text-base pr-6">
                      إن تطبيق <span className="font-black text-indigo-600">KhayatPro Maroc</span>، بجميع مكوناته البرمجية، بما في ذلك كود المصدر، تكنولوجيا القياسات التفاعلية (Mannequin SVG Tech)، الخوارزميات، والواجهات، هي ملكية فكرية حصرية لمالك المنصة. يُمنع منعاً باتاً استنساخ، تعديل، أو الهندسة العكسية لأي جزء من التطبيق تحت طائلة المتابعة القضائية.
                    </p>
                  </section>

                  {/* 2 */}
                  <section ref={section2Ref} className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">2. إخلاء المسؤولية التام</h3>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 relative overflow-hidden group">
                      <p className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <AlertCircle className="text-rose-500" size={18} />
                        <span>المنصة تُقدم خدمة إدارية وتنظيمية "كما هي" وبناءً على المتاح:</span>
                      </p>
                      <ul className="list-disc pr-8 space-y-4 text-sm sm:text-base font-bold text-slate-600">
                        <li>أي اختراق أو تسريب ناتج عن سوء إدارة حساب المستخدم، أو إهمال حماية كلمات المرور ومفاتيح الوصول.</li>
                        <li>فشل المزامنة السحابية (CloudSense) أو ضياع/تلف البيانات الناتج عن خدمات الطرف الثالث (Google Cloud/Drive).</li>
                        <li>أي أخطاء في الحسابات المالية، أو رصد تقارير الأرباح، أو قياسات المانيكان التي يدخلها المستخدم يدوياً وتؤدي لخسائر مادية في الأقمشة أو السمعة التجارية.</li>
                      </ul>
                      <div className="absolute -bottom-10 -left-10 text-slate-200/50 group-hover:text-slate-200 transition-colors pointer-events-none">
                        <Scale size={120} strokeWidth={1} />
                      </div>
                    </div>
                  </section>

                  {/* 3 */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">3. سياسة التخزين والأمان (CloudSense)</h3>
                    </div>
                    <p className="font-medium text-slate-600 text-sm sm:text-base pr-6">
                      يعتمد نظام المزامنة على مبدأ التشفير لضمان الخصوصية. المستخدم هو المسؤول الأول والأخير عن سرية مفاتيح الوصول. نحن لا نملك الحق في الولوج المباشر، أو الاطلاع، أو تعديل بيانات الزبناء الخاصة بك والمخزنة في حسابك الشخصي.
                    </p>
                  </section>

                  {/* 4 */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">4. الالتزامات والمسؤولية القانونية</h3>
                    </div>
                    <p className="font-medium text-slate-600 text-sm sm:text-base pr-6">
                      يقر المستخدم بمسؤوله الكاملة والمنفردة عن صحة البيانات والمعاملات المالية المدخلة في النظام. المنصة ليست شريكاً، أو وسيطاً، أو طرفاً في أي نزاع تجاري أو مالي يقع بين الخياط وزبنائه أو موظفيه. كما يلتزم المستخدم بعدم استخدام المنصة في أي نشاط يخالف القوانين والأنظمة الجاري بها العمل في المملكة المغربية.
                    </p>
                  </section>

                  {/* 5 */}
                  <section ref={section5Ref} className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">5. حماية المعطيات ذات الطابع الشخصي (قانون 09-08)</h3>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-[2.5rem] relative overflow-hidden group">
                      <p className="font-medium text-emerald-900 text-sm sm:text-base relative z-10 leading-loose">
                        تماشياً مع مقتضيات <span className="font-black underline decoration-emerald-500/30">القانون رقم 09-08</span> المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي بالمغرب، يلتزم المستخدم التزاماً صارماً بالحصول على موافقة زبنائه الصريحة قبل إدخال أسمائهم، أرقام هواتفهم، أو قياساتهم الجسدية في النظام. إدارة المنصة تتعهد بعدم بيع, مشاركة، أو تسريب هذه المعطيات لأي طرف ثالث.
                      </p>
                      <div className="absolute -bottom-6 -left-6 text-emerald-100/50 pointer-events-none">
                        <ShieldCheck size={80} />
                      </div>
                    </div>
                  </section>

                  {/* 6 */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">6. حدود المسؤولية عن الخدمات السحابية</h3>
                    </div>
                    <p className="font-medium text-slate-600 text-sm sm:text-base pr-6">
                      بما أن المنصة تعتمد على بنية تحتية سحابية (CloudSense) مرتبطة كلياً بخدمات Google، فإننا لا نضمن توفر الخدمة بنسبة 100% دون انقطاع في حالة تعطل الخوادم العالمية. المالك ليس مسؤولاً عن أي عجز مؤقت أو دائم في الوصول إلى البيانات ناتج عن أعطال تقنية أو قاهرة خارجة عن إرادته الإدارية.
                    </p>
                  </section>

                  {/* 7 */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">7. القانون الواجب التطبيق والاختصاص القضائي</h3>
                    </div>
                    <p className="font-black bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] text-indigo-900 text-sm sm:text-base leading-loose">
                      تخضع هذه الاتفاقية بأكملها وتُفسر وفقاً للقوانين الجاري بها العمل في المملكة المغربية. في حالة وقوع أي نزاع أو خلاف ناتج عن تفسير أو تنفيذ هذه الشروط، يتم اللجوء حصرياً إلى المحاكم المختصة بمدينة الدار البيضاء، وذلك بعد استنفاد كافة الطرق الودية للتسوية.
                    </p>
                  </section>

                  {/* 8 */}
                  <section ref={section8Ref} className="space-y-6 pb-10">
                    <div className="flex items-center gap-3 border-r-4 border-indigo-600 pr-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">8. التعديلات المستقبلية والخطط</h3>
                    </div>
                    <p className="font-medium text-slate-600 text-sm sm:text-base pr-6">
                      تحتفظ إدارة المنصة بالحق الكامل في تحديث، تعديل، أو إضافة ميزات (بما في ذلك إدخال خطط اشتراك مدفوعة للميزات المتقدمة) في أي وقت لتواكب التطورات التقنية والقانونية. إن استمرار استخدامك للتطبيق بعد نشر التحديثات يُعتبر موافقة نهائية وقاطعة منك على المقتضيات الجديدة.
                    </p>
                  </section>
                </div>

                <div className="pt-10 border-t border-slate-100 flex flex-col items-center gap-3 pb-6">
                   <div className="bg-slate-100 px-6 py-2 rounded-full text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                     آخر تحديث مرجعي: 31 مايو 2026
                   </div>
                </div>
              </div>
            </div>

            {/* Footer with Acceptance Logic */}
            <div className="bg-slate-50 p-6 sm:p-10 border-t border-slate-200 shrink-0 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
              {showAcceptButton && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Scroll Alert if not finished */}
                  {!hasScrolledToBottom && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-center gap-4 text-amber-800 shadow-lg shadow-amber-500/5 pulse-amber"
                    >
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0 animate-pulse">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black mb-0.5">تحقق المراجعة مطلوب</h4>
                        <p className="text-[11px] font-bold opacity-80">يرجى قراءة الشروط بالكامل حتى النهاية لتفعيل الموافقة القانونية.</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <label className={clsx(
                      "flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer",
                      !hasScrolledToBottom ? "opacity-40 grayscale pointer-events-none bg-slate-100 border-transparent" : "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-50/50"
                    )}>
                      <input 
                        type="checkbox" 
                        disabled={!hasScrolledToBottom}
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        className="mt-1 w-6 h-6 rounded-lg border-2 border-slate-300 text-indigo-600 appearance-none bg-white checked:bg-indigo-600 checked:border-indigo-600 relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:opacity-0 checked:after:opacity-100 transition-all cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-black text-slate-800 leading-relaxed">
                        أقر بأنني قرأت شروط الخدمة وسياسة الاستخدام وأوافق على الالتزام بها، وأتحمل المسؤولية القانونية الكاملة عن تطبيق القانون 09-08 مع زبنائي.
                      </span>
                    </label>

                    <button 
                      disabled={!isChecked || !hasScrolledToBottom || isAccepting}
                      onClick={onAccept}
                      className="w-full bg-indigo-600 disabled:bg-slate-300 text-white font-black py-5 rounded-3xl shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] hover:bg-slate-900 flex items-center justify-center gap-3 text-lg"
                    >
                      {isAccepting ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>الموافقة والاستمرار في الاستخدام</span>
                          <ShieldCheck size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {!showAcceptButton && (
                <div className="max-w-3xl mx-auto flex justify-center">
                  <button 
                    onClick={onClose}
                    className="w-full sm:w-auto bg-slate-900 text-white font-black px-12 py-4 rounded-[2rem] hover:bg-indigo-600 transition shadow-2xl shadow-slate-200 active:scale-95"
                  >
                    إغلاق المراجعة
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TermsModal;
