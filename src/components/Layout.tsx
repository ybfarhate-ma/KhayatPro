import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Scissors, Settings, BarChart3, CloudUpload, LogOut, User as UserIcon, ShieldCheck, ChevronDown, X, Info, Database, Cloud } from 'lucide-react';
import LogoImage from '../assets/images/KhayyatProLogo (3).png';
import { cn } from '../lib/utils';
import { User } from '../lib/auth';
import { useState, useEffect, useRef } from 'react';
import { useUI } from '../store/ui';
import { logout } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  user: User;
}

export default function Layout({ user }: LayoutProps) {
  const { confirm } = useUI();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAnonBanner, setShowAnonBanner] = useState(() => {
    return localStorage.getItem('khayatpro_hide_anon_banner') !== 'true';
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { to: '/', icon: Home, label: 'الرئيسية' },
    { to: '/customers', icon: Users, label: 'العملاء' },
    { to: '/orders', icon: Scissors, label: 'الطلبات' },
    { to: '/reports', icon: BarChart3, label: 'التقارير' },
    { to: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من تطبيق خياط برو؟',
      confirmText: 'خروج',
      cancelText: 'بقاء',
      isDestructive: true
    });

    if (isConfirmed) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout failed', error);
      }
    }
  };

  useEffect(() => {
    // Click outside to close menu
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible">
      {/* Top Header / App Bar (Fixed) */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-[150] px-4 py-2 flex items-center justify-between shrink-0 print:hidden relative">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigate('/orders')}
            className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-100 transform hover:scale-110 active:scale-95 transition-all cursor-pointer bg-white flex items-center justify-center p-0.5 border border-slate-100"
          >
            <img src={LogoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-tight">خياط برو</h1>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck size={8} />
                تأمين درايف
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 mr-2">
            <Cloud size={14} className="text-indigo-600" />
            <p className="text-[10px] font-black text-indigo-800 leading-none">نسخ احتياطي خاص (Drive)</p>
          </div>

          {/* User Profile with Dropdown */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "flex items-center gap-2 pl-2 pr-1 py-1 rounded-2xl transition-all border active:scale-95",
                isMenuOpen ? "bg-indigo-50 border-indigo-100" : "hover:bg-slate-50 border-transparent hover:border-gray-100"
              )}
            >
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-800 truncate max-w-[80px] leading-none mb-0.5 tracking-tight">
                  {user.isAnonymous ? 'مستخدم محلي' : (user.displayName?.split(' ')[0] || 'المستخدم')}
                </p>
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest">ملازم</p>
                </div>
              </div>
              
              <div className="relative">
                {user.photoURL && !user.isAnonymous ? (
                  <motion.div
                    animate={{ 
                      y: isMenuOpen ? 0 : [0, -4, 0],
                      scale: isMenuOpen ? 1.1 : 1
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-400 to-sky-400 shadow-xl shadow-indigo-100/40 cursor-pointer"
                  >
                    <div className={cn(
                      "absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-400 to-sky-400 opacity-50 blur-[4px]",
                      localStorage.getItem('khayatpro_cloud_sync') === 'true' && "animate-spin-slow"
                    )} />
                    <img 
                      src={user.photoURL} 
                      alt="User" 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover relative z-10" 
                    />
                    <motion.div 
                      animate={{ 
                        scale: isMenuOpen ? 1.3 : 1,
                        rotate: isMenuOpen ? 180 : 0
                      }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xl z-20"
                    >
                      <ChevronDown size={11} className="text-indigo-600" />
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-lg relative group overflow-hidden">
                    <UserIcon size={20} />
                    <motion.div 
                      animate={{ 
                        scale: isMenuOpen ? 1.3 : 1,
                        rotate: isMenuOpen ? 180 : 0
                      }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xl z-20"
                    >
                      <ChevronDown size={11} className="text-indigo-600" />
                    </motion.div>
                  </div>
                )}
              </div>
            </button>

            {/* Dropdown Backdrop (Subtle Blur for background) */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-[12px] z-[120]"
                />
              )}
            </AnimatePresence>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9, rotate: -2, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 15, scale: 0.9, rotate: -2, filter: 'blur(10px)' }}
                  className="absolute left-0 top-full mt-4 w-72 bg-white rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-slate-100 p-3 z-[130] overflow-hidden"
                  dir="rtl"
                >
                  <div className="relative">
                    {/* Glassmorphism Header */}
                    <div className="p-4 mb-3 bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[2rem] text-white overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700" />
                      <div className="relative z-10 flex items-center gap-4 text-right">
                        {user.photoURL && !user.isAnonymous ? (
                          <div className="relative">
                            <img src={user.photoURL} className="w-12 h-12 rounded-2xl shadow-xl border-2 border-white/20" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-sm" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/20">
                            <UserIcon size={24} />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-black truncate leading-tight">
                            {user.isAnonymous ? 'حساب محلي' : (user.displayName || 'خياط برو')}
                          </p>
                          <p className="text-[10px] text-indigo-300 font-bold truncate opacity-80 mt-0.5">
                            {user.isAnonymous ? 'وضع الأوفلاين نشط' : user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3 px-1">
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100 transition-colors">
                        <p className="text-[9px] font-black text-slate-400 mb-1 uppercase tracking-[0.1em]">حالة النظام</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[11px] font-black text-slate-800">نشط الآن</span>
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100/50 text-center">
                        <p className="text-[9px] font-black text-indigo-400 mb-1 uppercase tracking-[0.1em]">تأمين البيانات</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <Cloud size={12} className="text-indigo-600" />
                          <span className="text-[11px] font-black text-slate-800">جوجل درايف</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="space-y-1.5">
                      <button 
                        onClick={() => { setIsMenuOpen(false); navigate('/orders'); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-[1.5rem] transition-all group"
                      >
                        <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                          <Scissors size={18} />
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800 block">تفصيل طلب جديد</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">أخذ قياسات وتصميم موديل جديد</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-[1.5rem] transition-all group"
                      >
                        <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          <Settings size={18} />
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800 block">الإعدادات</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">الملف الشخصي والإعدادات المتقدمة</span>
                        </div>
                      </button>

                      <div className="h-px bg-slate-100/80 my-2 mx-4" />

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3.5 hover:bg-red-50 rounded-[1.5rem] transition-all group"
                      >
                        <div className="p-2 rounded-xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
                          <LogOut size={18} />
                        </div>
                        <span className="text-xs font-black text-red-600">تسجيل الخروج الآمن</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 pb-24 print:p-0 print:overflow-visible print:h-auto print:max-w-none">
        <Outlet />
      </main>

      {/* Bottom Navigation (Fixed) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-105 pb-safe z-10 print:hidden shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-around items-center h-16 pointer-events-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 group relative",
                  isActive ? "text-indigo-600 scale-110" : "text-slate-400 hover:text-slate-600"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    "group-hover:bg-slate-50"
                  )}>
                    <item.icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-black tracking-tighter">{item.label}</span>
                  
                  {isActive && (
                    <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
