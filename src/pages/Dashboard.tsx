import { useEffect, useState } from 'react';
import { db } from '../store/db';
import { Customer, Order, Subscription } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  Users, 
  Scissors, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Plus, 
  Sparkles, 
  Calendar, 
  Shirt, 
  ChevronLeft, 
  AlertTriangle, 
  Compass, 
  Award,
  Wallet,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { processRecurringSubscriptions, getSubscriptions, chargeSubscriptionPeriod, getNextDeliveryDate, saveSubscription } from '../lib/subscriptions';
import { useUI } from '../store/ui';

// Import newly uploaded professional logo assets
import logoKhayyat1 from '../assets/images/KhayyatProLogo (1).png';
import logoKhayyat2 from '../assets/images/KhayyatProLogo (2).png';
import logoKhayyat3 from '../assets/images/KhayyatProLogo (3).png';
import logoKhayyat4 from '../assets/images/KhayyatProLogo (4).png';
import logoKhayyat5 from '../assets/images/KhayyatProLogo (5).png';
import logoKhayyat6 from '../assets/images/KhayyatProLogo (6).png';

export default function Dashboard() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('أهلاً بك، طاب يومك بكل ثقة ✨');
  const [shopName, setShopName] = useState('أتيلييه الخياطة الرفيعة');
  const [tailorName, setTailorName] = useState('المعلم سفيان');
  const [shopLogo, setShopLogo] = useState('img:khayyat3');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    unpaidDebt: 0,
    materialsCompleted: 0
  });

  const [recentOrders, setRecentOrders] = useState<(Order & { customerName?: string; customerPhone?: string })[]>([]);
  const [dueSubscriptions, setDueSubscriptions] = useState<Subscription[]>([]);
  const { showToast, confirm } = useUI();

  const loadDueSubscriptions = () => {
    const allSubs = getSubscriptions();
    const now = new Date();
    const dueList = allSubs.filter(sub => {
      if (sub.status !== 'active') return false;
      if (sub.isAutoCharge === true) return false;
      
      const targetDate = getNextDeliveryDate(sub);
      return now >= targetDate;
    });
    setDueSubscriptions(dueList);
  };

  const handleChargeDue = async (sub: Subscription) => {
    const result = await confirm({
      title: 'ترحيل دفعة اشتراك دوري',
      message: `هل أنت متأكد من ترحيل دفعة جديدة بقيمة ${formatCurrency(sub.amount)} في ذمة العميل ${sub.customerName}؟`,
      confirmText: 'تأكيد الترحيل قيداً بالديون',
      cancelText: 'إلغاء',
      showAutoChargeCheckbox: true
    });

    if (result && result.confirmed) {
      chargeSubscriptionPeriod(sub);
      if (result.autoCharge) {
        sub.isAutoCharge = true;
        saveSubscription(sub);
      }
      showToast({ message: 'تم ترحيل الدفعة بنجاح ' + (result.autoCharge ? '(وتم تفعيل الترحيل التلقائي)' : ''), type: 'success' });
      
      loadDueSubscriptions();
      const allInvoices = db.getInvoices(true);
      const invoices = db.getInvoices();
      const unpaid = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      const revenue = allInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      setStats(prev => ({
        ...prev,
        totalRevenue: revenue,
        unpaidDebt: unpaid
      }));
    }
  };

  const handleActivateAutoCharge = (sub: Subscription) => {
    sub.isAutoCharge = true;
    saveSubscription(sub);
    processRecurringSubscriptions();
    showToast({ message: 'تم تحويل الاشتراك إلى الترحيل التلقائي، وسيتم توليد الفواتير القادمة تلقائياً', type: 'success' });
    loadDueSubscriptions();
    const allInvoices = db.getInvoices(true);
    const invoices = db.getInvoices();
    const unpaid = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const revenue = allInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    setStats(prev => ({
      ...prev,
      totalRevenue: revenue,
      unpaidDebt: unpaid
    }));
  };

  useEffect(() => {
    // Check and trigger auto-generation of subscriptions
    processRecurringSubscriptions();
    loadDueSubscriptions();

    const storedShopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const storedTailorName = localStorage.getItem('khayatpro_setting_tailor_name') || 'المعلم المحترف';
    const storedLogo = localStorage.getItem('khayatpro_setting_logo') || 'img:khayyat3';
    setShopName(storedShopName);
    setTailorName(storedTailorName);
    setShopLogo(storedLogo);

    // Generate organic Arabic greeting based on time of day
    const hour = new Date().getHours();
    const finalName = storedTailorName || 'المعلم';
    if (hour < 12) {
      setGreeting(`صباح الخير والبركة يا ${finalName} ☀️`);
    } else if (hour < 17) {
      setGreeting(`أهلاً بك يا ${finalName}، طاب يومك بكل ثقة ✨`);
    } else {
      setGreeting(`مساء الخير والتجلي يا ${finalName} 🌙`);
    }

    const customers = db.getCustomers();
    const orders = db.getOrders();
    const allInvoices = db.getInvoices(true);
    const invoices = db.getInvoices();

    const active = orders.filter(o => ['new', 'in_progress', 'ready'].includes(o.status));
    const completed = orders.filter(o => o.status === 'delivered');
    const materialsCount = orders.filter(o => o.materialsPurchased).length;
    
    const unpaid = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const revenue = allInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

    setStats({
      totalCustomers: customers.length,
      activeOrders: active.length,
      completedOrders: completed.length,
      totalRevenue: revenue,
      unpaidDebt: unpaid,
      materialsCompleted: materialsCount
    });

    // Create client map to prevent heavy nested lookups in render loop
    const clientMap = new Map(customers.map(c => [c.id, c]));

    const mappedRecent = orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(o => {
        const c = clientMap.get(o.customerId);
        return {
          ...o,
          customerName: c ? c.fullName : 'عميل مجهول',
          customerPhone: c ? c.phone : ''
        };
      });

    setRecentOrders(mappedRecent);
  }, []);

  const getDeliveryDaysDiff = (dateStr: string) => {
    if (!dateStr) return { text: 'بدون موعد', style: 'text-gray-400 bg-gray-50' };
    const delivery = new Date(dateStr);
    const now = new Date();
    // Reset to start of day for comparison
    delivery.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = delivery.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `متأخر بـ ${Math.abs(diffDays)} يوم`, style: 'text-rose-600 bg-rose-50 border border-rose-100 font-extrabold animate-pulse' };
    } else if (diffDays === 0) {
      return { text: 'استحقاق اليوم ⚠️', style: 'text-amber-700 bg-amber-50 border border-amber-100 font-extrabold animate-pulse' };
    } else if (diffDays === 1) {
      return { text: 'غداً للتسليم ⏱️', style: 'text-indigo-700 bg-indigo-50 border border-indigo-100 font-extrabold' };
    } else if (diffDays <= 3) {
      return { text: `خلال ${diffDays} أيام ⏱️`, style: 'text-indigo-600 bg-indigo-50/50 border border-indigo-100' };
    } else {
      return { text: `متبقي ${diffDays} يوم`, style: 'text-emerald-700 bg-emerald-50/70 border border-emerald-100' };
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch(status) {
      case 'new': 
        return { text: 'جديد 🏷️', style: 'bg-blue-50 text-blue-700 border border-blue-150' };
      case 'in_progress':
        return { text: 'قيد التفصيل ✂️', style: 'bg-orange-50 text-orange-700 border border-orange-150' };
      case 'ready':
        return { text: 'جاهز للتسليم ✨', style: 'bg-emerald-50 text-emerald-700 border border-emerald-150' };
      case 'delivered':
        return { text: 'تم التسليم والحمد لله', style: 'bg-slate-100 text-slate-600 border border-slate-200' };
      default:
        return { text: 'ملغى', style: 'bg-gray-100 text-gray-500 border border-gray-150' };
    }
  };

  const renderLogo = (logo: string | null | undefined, size = 'w-12 h-12') => {
    if (!logo) return <img src={logoKhayyat3} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo.startsWith('data:image/')) {
      return <img src={logo} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    
    if (logo === 'img:khayyat1') {
      return <img src={logoKhayyat1} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    if (logo === 'img:khayyat2') {
      return <img src={logoKhayyat2} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    if (logo === 'img:khayyat3') {
      return <img src={logoKhayyat3} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    if (logo === 'img:khayyat4') {
      return <img src={logoKhayyat4} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    if (logo === 'img:khayyat5') {
      return <img src={logoKhayyat5} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    if (logo === 'img:khayyat6') {
      return <img src={logoKhayyat6} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    
    if (logo === 'preset:scissors') {
      return (
        <div className={`flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl ${size} shadow-4xs shrink-0`}>
          <Scissors className="w-2/3 h-2/3 stroke-[2]" />
        </div>
      );
    }
    if (logo === 'preset:star') {
      return (
        <div className={`flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl ${size} shadow-4xs shrink-0`}>
          <Sparkles className="w-2/3 h-2/3 stroke-[2]" />
        </div>
      );
    }
    if (logo === 'preset:royal') {
      return (
        <div className={`flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl ${size} shadow-4xs shrink-0`}>
          <span className="text-xl">👑</span>
        </div>
      );
    }
    if (logo === 'preset:heart') {
      return (
        <div className={`flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl ${size} shadow-4xs shrink-0`}>
          <span className="text-xl">❤️</span>
        </div>
      );
    }
    return <img src={logoKhayyat3} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right pb-10" dir="rtl">
      
      {/* 1. Atelier Greeting & Brand Presence */}
      <div className="flex justify-between items-center bg-white p-4.5 rounded-3xl border border-gray-105 shadow-3xs">
        <div className="space-y-1">
          <span className="text-[10px] text-indigo-600 font-black tracking-wide flex items-center gap-1.5 justify-end">
            <Sparkles size={11} className="animate-spin duration-1000" />
            <span>المساعد الذكي لـ {shopName}</span>
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{greeting}</h2>
          <p className="text-[11px] text-gray-450 font-medium">سير عمل ورشة الخياطة التقليدية مستقر ويسير بشكل رائع.</p>
        </div>
        {renderLogo(shopLogo, 'w-14 h-14')}
      </div>

      {/* Due Subscriptions Urgent Alerts */}
      {dueSubscriptions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/50 p-5 rounded-3xl space-y-3.5 shadow-3xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2 justify-start flex-row-reverse">
            <AlertTriangle className="text-amber-600 w-5 h-5 shrink-0" />
            <h3 className="font-extrabold text-sm text-amber-900">انتباه: هناك اشتراكات معلقة لم تُرحّل بعد! ⚠️</h3>
          </div>
          <p className="text-xs text-amber-700/90 font-bold leading-relaxed">
            الاشتراكات أدناه بلغت تاريخ استحقاقها وتحتاج إلى ترحيل الدفعة كفاتورة في ديون العميل، أو تفعيل الترحيل التلقائي لها.
          </p>
          <div className="space-y-2.5">
            {dueSubscriptions.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-2xl border border-amber-200/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition hover:border-amber-300 shadow-4xs">
                <div className="text-right space-y-1">
                  <p className="text-xs font-black text-slate-800">
                    الزبون: {sub.customerName} • <span className="bg-amber-100/60 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{sub.attireType}</span>
                  </p>
                  <p className="text-[11px] font-bold text-gray-500">
                    قيمة الدفعة الدورية المستحقة: <span className="font-mono text-indigo-700 font-extrabold">{formatCurrency(sub.amount)}</span> • تاريخ الاستحقاق: {formatDate(getNextDeliveryDate(sub).toISOString())}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button 
                    onClick={() => handleChargeDue(sub)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] px-3.5 py-2.5 rounded-xl transition shadow-3xs cursor-pointer"
                  >
                    <CreditCard size={13} className="stroke-[2.5]" />
                    <span>ترحيل يدوي</span>
                  </button>
                  <button 
                    onClick={() => handleActivateAutoCharge(sub)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[11px] px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw size={13} className="stroke-[2.5]" />
                    <span>تحويل لترحيل تلقائي</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Premium Quick Actions (Couture Bento Design) */}
      <div className="space-y-3">
        {/* Hero Quick Action: Create New Custom Order */}
        <button 
          onClick={() => navigate('/orders/new')}
          className="w-full text-right relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 text-white p-6 rounded-3xl shadow-sm border border-indigo-600 flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4 transition duration-300 transform active:scale-[0.99] group focus:outline-none"
        >
          {/* Decorative floating lights */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 transition-all duration-500" />
          <div className="absolute -bottom-6 left-12 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10 text-right">
            {/* Elegant Double Sphere Sphere */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xs group-hover:scale-110 transition duration-300" />
              <div className="relative bg-white text-indigo-700 p-3.5 rounded-2xl shadow-3xs flex items-center justify-center transform group-hover:rotate-6 transition duration-300">
                <Scissors className="w-6.5 h-6.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2 justify-start flex-row-reverse">
                <span className="bg-amber-400 text-slate-900 font-extrabold text-[8.5px] px-2 py-0.5 rounded-md uppercase animate-pulse">
                   الأكثر استخداماً 👑
                </span>
                <h3 className="font-black text-lg tracking-tight block">تفصيل طلب جديد</h3>
              </div>
              <p className="text-xs text-indigo-150 font-bold leading-relaxed max-w-xl">
                أخذ القياسات، تصميم وتفصيل الطلبات، تنظيم المواعيد والدفعات المالية للزبون الحالي أو الزبناء الجدد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center bg-white/10 border border-white/10 hover:bg-white/15 px-4.5 py-2.5 rounded-2xl text-[11px] font-black transition relative z-10 group-hover:translate-x-[-4px] duration-300 shadow-4xs">
            <span>البدء الآن</span>
            <ChevronLeft size={15} className="rtl:rotate-180 text-white stroke-[2.5]" />
          </div>
        </button>

        {/* Secondary Quick Action: New Customer */}
        <button 
          onClick={() => navigate('/customers/new')}
          className="w-full text-right relative overflow-hidden bg-slate-900 hover:bg-slate-950 text-white px-5 py-3.5 rounded-2.5xl shadow-3xs flex items-center justify-between gap-4 transition duration-300 transform active:scale-[0.99] group focus:outline-none border border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/5 p-2 rounded-xl text-slate-300 group-hover:bg-white/10 group-hover:text-white transition duration-300">
              <Users size={15} className="stroke-[2.2]" />
            </div>
            <div className="text-right">
              <span className="font-extrabold text-xs tracking-tight block">إضافة زبون جديد في الدفتر</span>
              <span className="text-[10px] text-slate-400 block font-medium">تسجيل زبون جديد ومقاساته دون إنشاء طلب تفصيل فوري</span>
            </div>
          </div>
          <div className="bg-slate-800 group-hover:bg-indigo-600 p-1.5 rounded-lg text-slate-400 group-hover:text-white transition duration-300">
            <Plus size={13} className="stroke-[3.0]" />
          </div>
        </button>
      </div>

      {/* 3. Luxury Total Revenue Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden border border-slate-850">
        <div className="absolute top-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-[10px] font-extrabold tracking-widest uppercase">إجمالي المداخيل المحصلة</p>
            <h3 className="text-3xl font-black text-white font-mono tracking-tight" dir="ltr">
              {formatCurrency(stats.totalRevenue)}
            </h3>
            <p className="text-[9.5px] text-emerald-400 font-bold flex items-center gap-1">
              <span>●</span>
              <span>الدخل من دفعات الفواتير والطلبات المسلمة</span>
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xs text-indigo-300">
            <DollarSign className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* 4. Custom Grid Stats */}
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard 
          title="قاعدة الزبناء" 
          value={stats.totalCustomers} 
          subtitle="مسجلين في الدفتر"
          icon={Users} 
          color="text-indigo-600" 
          bg="bg-indigo-50/70 border-indigo-100" 
        />
        <StatCard 
          title="طلبات قيد الإنجاز" 
          value={stats.activeOrders} 
          subtitle="في الغرفة والورشة"
          icon={Scissors} 
          color="text-orange-600" 
          bg="bg-orange-50/70 border-orange-100" 
        />
        <StatCard 
          title="طلبات تم تسليمها" 
          value={stats.completedOrders} 
          subtitle="سجل أرشيف ناجح"
          icon={Clock} 
          color="text-emerald-600" 
          bg="bg-emerald-50/70 border-emerald-100" 
        />
        <StatCard 
          title="الديون غير المحصلة" 
          value={formatCurrency(stats.unpaidDebt)} 
          subtitle="مستحقة الفواتير"
          icon={Wallet} 
          color="text-rose-600" 
          bg="bg-rose-50/70 border-rose-100" 
          isCurrency 
        />
      </div>

      {/* 5. Recent Active Orders List with Customer Matching */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-indigo-600 font-black bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
            أعلى الأولويات أولاً
          </span>
          <h3 className="font-extrabold text-slate-800 text-base">
            آخر طلبات التفصيل والورشة
          </h3>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-gray-100 text-gray-400 shadow-4xs">
            <div className="bg-slate-50 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Shirt size={24} />
            </div>
            <p className="text-xs font-bold">لا توجد طلبات جارية حالياً.</p>
            <p className="text-[10px] text-gray-400 mt-1">اضغط على زر "تفصيل طلب جديد" للأعلى لتبدأ!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => {
              const deliveryStatus = getDeliveryDaysDiff(order.deliveryDate);
              const statusBadge = getStatusBadge(order.status);
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white p-4.5 rounded-3xl border border-gray-105 shadow-3xs flex flex-col sm:flex-row items-stretch justify-between gap-4 transition-all duration-300 hover:border-indigo-200 cursor-pointer text-right group"
                >
                  <div className="flex gap-3 justify-start items-center">
                    {/* Icon Sphere */}
                    <div className="bg-slate-50 border border-slate-100 text-slate-700 p-2.5 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition duration-300">
                      <Shirt size={19} className="stroke-[2.2]" />
                    </div>
                    {/* Information */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 text-[13.5px] tracking-tight">{order.attireType}</h4>
                        <span className="text-[9.5px] bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1 justify-end sm:justify-start">
                        <span>الزبون:</span>
                        <span className="text-slate-700 underline underline-offset-3 decoration-slate-200 decoration-2">{order.customerName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Financial & Status badge metrics */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t border-dashed border-gray-100 sm:border-t-0 pt-3 sm:pt-0">
                    {/* Delivery Warnings */}
                    <div className="flex flex-col items-end gap-1 text-left sm:text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-[9px] font-black border tracking-wide ${statusBadge.style}`}>
                        {statusBadge.text}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[9.5px] font-black font-sans leading-none ${deliveryStatus.style}`}>
                        {deliveryStatus.text}
                      </span>
                    </div>

                    {/* Price and Action Chevron icon */}
                    <div className="flex items-center gap-2 text-left">
                      <div className="text-left font-mono">
                        <span className="text-[9px] text-gray-400 block font-bold font-sans">السعر الكلي</span>
                        <span className="text-xs font-black text-slate-800" dir="ltr">{formatCurrency(order.finalPrice)}</span>
                      </div>
                      <div className="p-1 bg-gray-50 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition duration-300">
                        <ChevronLeft size={16} className="text-gray-400 group-hover:text-indigo-600 transition duration-300 rtl:rotate-180" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="text-center pt-1.5">
          <Link 
            to="/orders" 
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-black hover:underline underline-offset-4 decoration-2"
          >
            <span>عرض سجل كافة طلبات الورشة</span>
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>

    </div>
  );
}

interface StatCardProps {
  title: string;
  value: any;
  subtitle: string;
  icon: any;
  color: string;
  bg: string;
  isCurrency?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, color, bg, isCurrency = false }: StatCardProps) {
  return (
    <div className="bg-white p-4.5 rounded-3xl border border-gray-105 shadow-3xs flex flex-col gap-3 hover:border-indigo-100 transition-all duration-300 text-right">
      <div className={`w-9.5 h-9.5 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-3xs`}>
        <Icon className="w-5 h-5 stroke-[2.3]" />
      </div>
      <div className="space-y-0.5">
        <p className="text-gray-400 text-[10px] font-extrabold">{title}</p>
        <p className={`font-black tracking-tight ${isCurrency ? 'text-sm font-mono' : 'text-xl'}`} dir={isCurrency ? 'ltr' : 'rtl'}>
          {value}
        </p>
        <span className="text-[9px] text-gray-400 font-bold block">{subtitle}</span>
      </div>
    </div>
  );
}
