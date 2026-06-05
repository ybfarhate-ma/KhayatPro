import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { Order, Invoice, Customer } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Download, FileText, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Users, Scissors, PieChart, ArrowRight, History as HistoryIcon, Printer, Smartphone, X, Calendar, Hash, Sparkles, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

// Import newly uploaded professional logo assets
import logoKhayyat1 from '../assets/images/KhayyatProLogo (1).png';
import logoKhayyat2 from '../assets/images/KhayyatProLogo (2).png';
import logoKhayyat3 from '../assets/images/KhayyatProLogo (3).png';
import logoKhayyat4 from '../assets/images/KhayyatProLogo (4).png';
import logoKhayyat5 from '../assets/images/KhayyatProLogo (5).png';
import logoKhayyat6 from '../assets/images/KhayyatProLogo (6).png';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-right space-y-1.5 animate-in fade-in duration-100 min-w-[160px]" dir="rtl">
        <p className="text-[10px] text-slate-400 font-extrabold">{label}</p>
        <div className="flex justify-between items-center gap-4 border-b border-slate-800 pb-1.5">
          <span className="text-[10px] text-slate-450 font-bold">المداخيل:</span>
          <span className="text-sm font-black text-emerald-400 font-mono" dir="ltr">{formatCurrency(data.value)}</span>
        </div>
        {data.invoicesList && (
          <div className="text-[10px] text-slate-350 space-y-1 font-semibold">
            <div className="flex justify-between">
              <span>الفواتير:</span>
              <span className="font-bold text-white font-mono">{data.invoicesList.length}</span>
            </div>
            <div className="flex justify-between text-emerald-200">
              <span>المحصل:</span>
              <span className="font-mono">{formatCurrency(data.paid)}</span>
            </div>
            {data.remaining > 0 && (
              <div className="flex justify-between text-orange-350">
                <span>الديون:</span>
                <span className="font-mono">{formatCurrency(data.remaining)}</span>
              </div>
            )}
            {data.growth !== 0 && (
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span>مقارنة بـالشهر السابق:</span>
                <span className={clsx("font-bold font-mono", data.growth > 0 ? "text-emerald-400" : "text-rose-450")}>
                  {data.growth > 0 ? `+${data.growth}%` : `${data.growth}%`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const getProfitVal = (o: Order) => {
  return o.costs?.fields?.profit ?? (o.costs as any)?.profitMarginValue ?? 0;
};
const getFabricCost = (o: Order) => {
  return o.costs?.fields?.fabric ?? (o.costs as any)?.fabricCost ?? 0;
};
const getAccessoriesCost = (o: Order) => {
  return o.costs?.fields?.accessories ?? (o.costs as any)?.accessoriesCost ?? 0;
};
const getLaborCost = (o: Order) => {
  return o.costs?.fields?.labor ?? (o.costs as any)?.laborCost ?? 0;
};
const getEmbroideryCost = (o: Order) => {
  return o.costs?.fields?.embroidery ?? (o.costs as any)?.embroideryCost ?? 0;
};
const getOtherExpenses = (o: Order) => {
  return o.costs?.fields?.other ?? (o.costs as any)?.otherExpenses ?? 0;
};
const getTotalOrderExpenses = (o: Order) => {
  return getFabricCost(o) + getAccessoriesCost(o) + getLaborCost(o) + getEmbroideryCost(o) + getOtherExpenses(o);
};

export default function Reports() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<'revenue' | 'debts' | 'costs' | 'paid' | 'profits' | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Dynamic branding props loaded from Settings
  const [shopName, setShopName] = useState('أتيلييه الخياطة الرفيعة');
  const [tailorName, setTailorName] = useState('المعلم سفيان');
  const [shopPhone, setShopPhone] = useState('0661234567');
  const [shopEmail, setShopEmail] = useState('contact@khayatpro.ma');
  const [shopAddress, setShopAddress] = useState('شارع الحسن الثاني، عمارة 4، الرباط');
  const [shopPatent, setShopPatent] = useState('RC 45910 / PAT 120485');
  const [shopRc, setShopRc] = useState('RC-Rabat-45910');
  const [shopIf, setShopIf] = useState('IF-987654');
  const [shopLogo, setShopLogo] = useState('preset:scissors');

  const renderLogo = (logo: string | null | undefined, size = 'w-14 h-14') => {
    if (!logo) return null;
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
    return null;
  };

  useEffect(() => {
    setOrders(db.getOrders());
    setInvoices(db.getInvoices());
    setCustomers(db.getCustomers());

    setShopName(localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة');
    setTailorName(localStorage.getItem('khayatpro_setting_tailor_name') || 'المعلم سفيان');
    setShopPhone(localStorage.getItem('khayatpro_setting_phone') || '0661234567');
    setShopEmail(localStorage.getItem('khayatpro_setting_email') || 'contact@khayatpro.ma');
    setShopAddress(localStorage.getItem('khayatpro_setting_address') || 'شارع الحسن الثاني، عمارة 4، الرباط');
    setShopPatent(localStorage.getItem('khayatpro_setting_patent') || 'RC 45910 / PAT 120485');
    setShopRc(localStorage.getItem('khayatpro_setting_rc') || 'RC-Rabat-45910');
    setShopIf(localStorage.getItem('khayatpro_setting_if') || 'IF-987654');
    setShopLogo(localStorage.getItem('khayatpro_setting_logo') || 'preset:scissors');
  }, []);

  const totalSales = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((sum, inv) => sum + inv.amountPaid, 0), [invoices]);
  const totalRemaining = useMemo(() => invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0), [invoices]);

  const allPayments = useMemo(() => {
    const payments: { date: string, amount: number, invoiceNumber: string, customerName: string, orderId: string }[] = [];
    invoices.forEach(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      (inv.payments || []).forEach(payment => {
        payments.push({
          date: payment.date,
          amount: payment.amount,
          invoiceNumber: inv.invoiceNumber,
          customerName: customer?.fullName || 'غير معروف',
          orderId: inv.orderId
        });
      });
    });
    return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, customers]);

  const totalCosts = useMemo(() => orders.reduce((sum, o) => {
    const c = o.costs as any;
    if (c && c.fields) {
      return sum + (o.totalCost || 0);
    }
    return sum + (c.fabricCost || 0) + (c.accessoriesCost || 0) + (c.laborCost || 0) + (c.embroideryCost || 0) + (c.otherExpenses || 0);
  }, 0), [orders]);

  const shareWhatsAppReminder = (customer: Customer, amount: number, invoiceNumber: string) => {
    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const message = `الموضوع: تحية طيبة وتذكير بشأن فاتورتكم المستحقة

${dear} (${title}) - ${customer.fullName} -،
أتمنى أن تكونوا بألف خير وصحة جيدة.

يسعدنا دائماً التعامل معكم ونعتز بثقتكم الغالية في خدماتنا.

نود تذكيركم بوجود مبلغ متبقٍ بسيط قدره *${formatCurrency(amount)}* يتعلق بالفاتورتكم رقم *${invoiceNumber}*.
إذا كنتم بحاجة إلى أي استفسار أو مساعدة بشأن تفاصيل الفاتورة أو طرق الدفع، فلا تترددوا في التواصل
معنا، فنحن هنا دائماً لخدمتكم.
شكراً جزيلاً لتعاونكم وتفهمكم الدائم، ونمتنى لكم يوماً سعيداً.`;
    const url = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const toggleMaterialsPurchased = (order: Order) => {
    const updatedOrder = { ...order, materialsPurchased: !order.materialsPurchased };
    db.saveOrder(updatedOrder);
    setOrders(db.getOrders());
  };

  const totalProfitMargins = useMemo(() => orders.reduce((sum, o) => sum + (getProfitVal(o) || 0), 0), [orders]);

  const averageOrderValue = useMemo(() => invoices.length > 0 ? totalSales / invoices.length : 0, [invoices, totalSales]);

  // Chart Data: Revenue by Attire Type
  const revenueByAttire = useMemo(() => {
    const data: Record<string, number> = {};
    const templates = db.getAttireTemplates();
    orders.forEach(order => {
      const invoice = invoices.find(inv => inv.orderId === order.id);
      if (invoice) {
        const displayName = templates.find(t => t.id === order.attireType)?.name || order.attireType;
        data[displayName] = (data[displayName] || 0) + invoice.totalAmount;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders, invoices]);

  // Chart Data: Monthly Revenue (Last 6 months) with extensive details
  const monthlyData = useMemo(() => {
    const monthsGroup: Record<string, { 
      value: number; 
      invoicesList: Invoice[];
      paid: number;
      remaining: number;
    }> = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthsGroup[key]) {
        monthsGroup[key] = { value: 0, invoicesList: [], paid: 0, remaining: 0 };
      }
      monthsGroup[key].value += inv.totalAmount;
      monthsGroup[key].paid += inv.amountPaid;
      monthsGroup[key].remaining += inv.remainingAmount;
      monthsGroup[key].invoicesList.push(inv);
    });

    const sortedEntries = Object.entries(monthsGroup)
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        return { 
          name: `${monthNames[month - 1]} ${year}`, 
          value: data.value,
          paid: data.paid,
          remaining: data.remaining,
          invoicesList: data.invoicesList,
          originalKey: key
        };
      })
      .sort((a, b) => a.originalKey.localeCompare(b.originalKey))
      .slice(-6);

    // Compute growth rate compared to previous month
    return sortedEntries.map((curr, idx, arr) => {
      let growth = 0;
      if (idx > 0) {
        const prevValue = arr[idx - 1].value;
        if (prevValue > 0) {
          growth = Math.round(((curr.value - prevValue) / prevValue) * 100);
        }
      }
      return {
        ...curr,
        growth
      };
    });
  }, [invoices]);

  const revenueGrowthSummary = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getUTCMonth() - 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth() + 1}`;

    const getMonthRevenue = (key: string) => {
      return invoices
        .filter(inv => {
          const d = new Date(inv.createdAt);
          return `${d.getFullYear()}-${d.getMonth() + 1}` === key;
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
    };

    const currentRevenue = getMonthRevenue(currentMonthKey);
    const lastRevenue = getMonthRevenue(lastMonthKey);

    let growth = 0;
    if (lastRevenue > 0) {
      growth = Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100);
    } else if (currentRevenue > 0) {
      growth = 100;
    }

    return { currentRevenue, lastRevenue, growth };
  }, [invoices]);

  const topCustomers = useMemo(() => {
    const customerStats: Record<string, { totalSpent: number, orderCount: number, customer: Customer, lastOrderDate: string }> = {};
    
    invoices.forEach(inv => {
      if (!customerStats[inv.customerId]) {
        const customer = customers.find(c => c.id === inv.customerId);
        if (customer) {
          customerStats[inv.customerId] = { totalSpent: 0, orderCount: 0, customer, lastOrderDate: inv.createdAt };
        }
      }
      if (customerStats[inv.customerId]) {
        customerStats[inv.customerId].totalSpent += inv.totalAmount;
        customerStats[inv.customerId].orderCount += 1;
        if (new Date(inv.createdAt) > new Date(customerStats[inv.customerId].lastOrderDate)) {
          customerStats[inv.customerId].lastOrderDate = inv.createdAt;
        }
      }
    });

    return Object.values(customerStats).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  }, [invoices, customers]);

  const sortedOperations = useMemo(() => {
    const templates = db.getAttireTemplates();
    let sorted = [...invoices].map(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      const order = orders.find(o => o.id === inv.orderId);
      const attireName = order ? (templates.find(t => t.id === order.attireType)?.name || order.attireType) : '';
      return {
        ...inv,
        customerName: customer?.fullName || '---',
        attireType: attireName || '---',
      };
    });

    if (sortConfig) {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'customerName':
            aValue = a.customerName;
            bValue = b.customerName;
            break;
          case 'attireType':
            aValue = a.attireType;
            bValue = b.attireType;
            break;
          case 'revenue':
            aValue = a.totalAmount;
            bValue = b.totalAmount;
            break;
          case 'date':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          default:
            aValue = (a as any)[sortConfig.key];
            bValue = (b as any)[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [invoices, customers, orders, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportPDF = async () => {
    // If not native, just use window.print()
    const capacitor = (window as any).Capacitor;
    if (!capacitor || !capacitor.isNativePlatform) {
      window.print();
      return;
    }

    try {
      setIsCapturing(true);
      const element = document.querySelector('.printable-report') as HTMLElement;
      if (!element) throw new Error('تعذر العثور على منطقة التقرير');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const fileName = `Report_${new Date().getTime()}.pdf`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });

      await CapacitorShare.share({
        title: 'تقرير خياط برو',
        text: 'التقرير المالي الشامل',
        url: savedFile.uri,
      });

    } catch (error: any) {
      console.error('PDF Export Error:', error);
      alert('فشل تصدير التقرير: ' + error.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const COLORS = [
    '#6366f1', // Royal Indigo (إنديجو ملكي)
    '#0d9488', // Emerald Teal (أخضر زمردي)
    '#f59e0b', // Warm Amber (أصفر ذهبي دافئ)
    '#e11d48', // Velvet Rose (أحمر مخملي)
    '#8b5cf6', // Indigo Violet (بنفسجي فاخر)
    '#0ea5e9'  // Sky Silk Blue (أزرق حريري)
  ];

  return (
    <>
      <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
        
        <div className="flex justify-between items-center px-2">
           <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
           <button 
             onClick={handleExportPDF}
             className={clsx(
               "bg-primary-600 text-white font-black px-6 py-3 rounded-2xl text-sm flex items-center gap-2 hover:bg-primary-700 transition shadow-lg shadow-primary-100 active:scale-95",
               isCapturing && "opacity-50 pointer-events-none"
             )}
           >
              <Printer className="w-5 h-5" />
              <span>{isCapturing ? 'جاري التحضير...' : 'تحميل أو طباعة التقرير الشامل'}</span>
           </button>
        </div>

        {/* Revenue Growth Summary Card */}
        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-indigo-300">
                 <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm border border-white/5">
                    <TrendingUp size={18} className="animate-pulse" />
                 </div>
                 <span className="text-[11px] font-black uppercase tracking-[0.2em]">أداء المبيعات الشهري</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight">مداخيل الشهر الحالي: <span className="text-emerald-400 font-mono" dir="ltr">{formatCurrency(revenueGrowthSummary.currentRevenue)}</span></h2>
              <p className="text-indigo-300/80 text-sm font-bold flex items-center gap-2">
                <span>مقابل</span>
                <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded-lg">{formatCurrency(revenueGrowthSummary.lastRevenue)}</span>
                <span>في الشهر المنصرم</span>
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className={clsx(
                "px-6 py-4 rounded-3xl flex items-center gap-4 border shadow-2xl transition-all duration-500 group-hover:scale-105",
                revenueGrowthSummary.growth >= 0 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}>
                <div className={clsx(
                  "p-3 rounded-2xl",
                  revenueGrowthSummary.growth >= 0 ? "bg-emerald-400/20" : "bg-rose-400/20"
                )}>
                  {revenueGrowthSummary.growth >= 0 ? <ArrowUpRight size={28} strokeWidth={3} /> : <ArrowDownRight size={28} strokeWidth={3} />}
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black font-mono leading-none tracking-tighter">
                      {revenueGrowthSummary.growth > 0 ? '+' : ''}{revenueGrowthSummary.growth}%
                    </span>
                  </div>
                  <span className="text-[10px] block font-black uppercase tracking-wider mt-1 opacity-70">
                    {revenueGrowthSummary.growth >= 0 ? 'معدل نمو تصاعدي' : ' تراجع في الأداء'}
                  </span>
                </div>
              </div>
              
              <div className="hidden sm:flex bg-white/5 p-5 rounded-3xl backdrop-blur-md border border-white/5 group-hover:bg-white/10 transition-colors">
                 <Sparkles size={36} className="text-indigo-300 opacity-40 animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] -ml-40 -mb-40 pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-indigo-400/5 rounded-full blur-[80px] pointer-events-none" />
        </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setSelectedDetail('revenue')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-green-200 hover:shadow-md transition group"
        >
           <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-green-100 group-hover:scale-110 transition-transform">
             <TrendingUp className="w-6 h-6 text-green-600" />
           </div>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">المداخيل الإجمالية</p>
           <h3 className="text-lg font-bold text-gray-900" dir="ltr">{formatCurrency(totalSales)}</h3>
           <span className="text-[9px] text-primary-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">عرض التفاصيل ←</span>
        </button>

        <button 
          onClick={() => setSelectedDetail('paid')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-blue-200 hover:shadow-md transition group"
        >
           <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 group-hover:scale-110 transition-transform">
             <Wallet className="w-6 h-6 text-blue-600" />
           </div>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">الأموال المُحصّلة</p>
           <h3 className="text-lg font-bold text-gray-900" dir="ltr">{formatCurrency(totalPaid)}</h3>
           <span className="text-[9px] text-blue-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">سجل الدفعات ←</span>
        </button>

        <button 
          onClick={() => setSelectedDetail('debts')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-orange-200 hover:shadow-md transition group"
        >
           <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-orange-100 group-hover:scale-110 transition-transform">
             <FileText className="w-6 h-6 text-orange-600" />
           </div>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">الديون العالقة</p>
           <h3 className="text-lg font-bold text-orange-600" dir="ltr">{formatCurrency(totalRemaining)}</h3>
           <span className="text-[9px] text-orange-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">عرض المدينين ←</span>
        </button>

        <button 
          onClick={() => setSelectedDetail('costs')}
          className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-red-200 hover:shadow-md transition group"
        >
           <div className="bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-red-100 group-hover:scale-110 transition-transform">
             <ArrowDownRight className="w-6 h-6 text-red-600" />
           </div>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">إجمالي التكاليف</p>
           <h3 className="text-lg font-bold text-gray-900" dir="ltr">{formatCurrency(totalCosts)}</h3>
           <span className="text-[9px] text-red-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">جرد المصاريف ←</span>
        </button>
      </div>

      {/* Profits Card */}
      <button 
         onClick={() => setSelectedDetail('profits')}
         className="bg-primary-950 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden flex justify-between items-center group w-full text-right cursor-pointer hover:shadow-primary-900/40 hover:-translate-y-0.5 transition-all duration-200 border border-white/5 active:scale-[0.99]"
      >
         <div className="relative z-10">
            <p className="text-primary-300 text-xs font-bold uppercase tracking-widest mb-2">إجمالي الأرباح الصافية</p>
            <h2 className="text-4xl font-black text-accent-400 group-hover:scale-105 transition-transform duration-200 origin-right" dir="ltr">{formatCurrency(totalProfitMargins)}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-400 font-medium">
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span>معدل الربح: {totalSales > 0 ? ((totalProfitMargins/totalSales)*100).toFixed(1) : 0}%</span>
              </span>
              <span className="text-accent-400 font-bold hover:underline py-1 px-1">انقر لعرض تفاصيل الطلبات والربح الصافي ←</span>
            </div>
         </div>
         <div className="absolute -top-4 -right-4 w-40 h-40 bg-primary-800 rounded-full blur-3xl opacity-30"></div>
         <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md relative z-10 border border-white/5 group-hover:bg-white/20 transition-colors">
            <TrendingUp size={31} className="text-accent-400 opacity-80" />
         </div>
      </button>

      {/* Additional Stats & Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Monthly Trend Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 col-span-1 md:col-span-2 space-y-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-row-reverse sm:flex-row">
                 <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shadow-3xs">
                    <TrendingUp size={22} className="stroke-[2.5]" />
                 </div>
                 <div className="text-right">
                    <h4 className="font-extrabold text-gray-800 text-lg">تطور المداخيل</h4>
                    <p className="text-xs text-gray-400 font-bold mb-0.5">انقر على أحد الشهور لعرض تفاصيل الفواتير وحرك المؤشر للمزيد</p>
                 </div>
              </div>

              {/* Controls Toggle */}
              <div className="flex items-center gap-2 self-start sm:self-auto" dir="rtl">
                 {selectedMonth && (
                   <button 
                     onClick={() => setSelectedMonth(null)}
                     className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] px-2.5 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5 transition ml-2 shadow-3xs"
                   >
                     <X size={12} className="stroke-[3]" />
                     <span>إلغاء التحديد</span>
                   </button>
                 )}

                 <div className="bg-gray-105 p-1 rounded-xl flex items-center gap-0.5" dir="ltr">
                    <button 
                      onClick={() => setChartType('bar')}
                      className={clsx(
                        "text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all duration-200",
                        chartType === 'bar' ? "bg-white text-indigo-700 shadow-3xs font-black" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      أعمدة
                    </button>
                    <button 
                      onClick={() => setChartType('area')}
                      className={clsx(
                        "text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all duration-200",
                        chartType === 'area' ? "bg-white text-indigo-700 shadow-3xs font-black" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      مساحي
                    </button>
                 </div>
              </div>
           </div>

           {/* Selected Month Indicator Banner */}
           {selectedMonth && (
             <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-200" dir="rtl">
               <span className="flex items-center gap-2">
                 <Calendar size={15} className="text-indigo-600" />
                 <span>الشهر المحدد حالياً: <strong className="text-indigo-900 font-black">{selectedMonth}</strong></span>
               </span>
               <span className="text-[10px] text-indigo-600 font-extrabold">تصفّح فواتير هذا الشهر أدناه ↓</span>
             </div>
           )}

           <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 {chartType === 'bar' ? (
                    <BarChart 
                      data={monthlyData} 
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          setSelectedMonth(String(state.activeLabel));
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: '#f8fafc', radius: 6 as any}}
                        content={<CustomChartTooltip />}
                      />
                      <Bar 
                        dataKey="value" 
                        cursor="pointer"
                        radius={[8, 8, 0, 0]} 
                        barSize={38}
                      >
                        {monthlyData.map((entry, index) => {
                          const isSelected = selectedMonth === entry.name;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={isSelected ? '#6366f1' : '#c7d2fe'} 
                              className="transition-all duration-300 hover:fill-indigo-400"
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                 ) : (
                    <AreaChart 
                      data={monthlyData}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          setSelectedMonth(String(state.activeLabel));
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        cursor="pointer"
                      />
                    </AreaChart>
                 )}
              </ResponsiveContainer>
           </div>

           {/* Selected Month Interactive Details Feed */}
           {selectedMonth && (() => {
             const mData = monthlyData.find(m => m.name === selectedMonth);
             if (!mData) return null;
             return (
               <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-top-3 duration-300 space-y-5" dir="rtl">
                  
                  {/* Selected Month Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-gray-150 p-3 rounded-2xl text-center shadow-3xs">
                      <span className="text-[10px] text-gray-450 font-bold block mb-0.5">مجموع الفواتير</span>
                      <strong className="text-sm font-black text-gray-700 font-mono" dir="ltr">{formatCurrency(mData.value)}</strong>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl text-center shadow-3xs">
                      <span className="text-[10px] text-emerald-600 font-bold block mb-0.5">الدفعات المحصلة</span>
                      <strong className="text-sm font-black text-emerald-700 font-mono" dir="ltr">{formatCurrency(mData.paid)}</strong>
                    </div>
                    <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl text-center shadow-3xs">
                      <span className="text-[10px] text-orange-600 font-bold block mb-0.5">الديون العالقة</span>
                      <strong className="text-sm font-black text-orange-700 font-mono" dir="ltr">{formatCurrency(mData.remaining)}</strong>
                    </div>
                  </div>

                  {/* Monthly Invoices Subtitle */}
                  <div className="flex justify-between items-center px-1">
                    <h5 className="text-xs font-black text-gray-500 flex items-center gap-1.5">
                      <FileText size={14} className="text-gray-400" />
                      <span>قائمة فواتير شهر ({selectedMonth})</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">{mData.invoicesList.length} فواتير</span>
                    </h5>
                    <button 
                      onClick={() => setSelectedMonth(null)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 font-bold"
                    >
                      إغلاق التفاصيل ×
                    </button>
                  </div>

                  {/* List of Monthly Invoices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 pad-scroll-thin">
                    {mData.invoicesList.map((inv, idx) => {
                      const cust = customers.find(c => c.id === inv.customerId);
                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedInvoice(inv)}
                          className="border border-gray-150 hover:border-indigo-200 rounded-2xl bg-slate-50/30 hover:bg-white p-3.5 transition duration-200 cursor-pointer text-right flex justify-between items-center group shadow-4xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-gray-800">{cust?.fullName || 'زبون غير معروف'}</span>
                              <span className="text-[9px] font-bold text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-150">#{inv.invoiceNumber}</span>
                            </div>
                            <p className="text-[10px] text-gray-450 font-bold">المجموع: <span className="text-indigo-600 font-black font-mono">{formatCurrency(inv.totalAmount)}</span></p>
                            <p className="text-[9px] text-gray-400 font-semibold">{formatDate(inv.createdAt)}</p>
                          </div>

                          <div className="text-left space-y-1.5">
                            {inv.remainingAmount > 0 ? (
                              <span className="bg-orange-50 text-orange-700 border border-orange-100 text-[10px] px-2 py-0.5 rounded-lg font-black block text-center min-w-[70px]">متبقٍ: {formatCurrency(inv.remainingAmount)}</span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-lg font-black block text-center min-w-[70px]">خالص</span>
                            )}
                            <span className="text-[9px] text-indigo-600 font-bold block group-hover:underline">خيارات وطباعة الفاتورة ←</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>
             );
           })()}
        </div>

        {/* Attire Type Breakdown */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
           <div>
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-3 flex-row-reverse sm:flex-row">
                    <div className="bg-purple-50 p-2.5 rounded-xl text-purple-700 shadow-3xs">
                       <PieChart className="stroke-[2.5]" size={21} />
                    </div>
                    <div className="text-right">
                       <h4 className="font-extrabold text-gray-800 text-base">الإيرادات حسب نوع اللباس</h4>
                       <p className="text-[10px] text-gray-400 font-bold">توزيع مبيعات تصاميم الخياطة التقليدية</p>
                    </div>
                 </div>
              </div>

              {revenueByAttire.length > 0 ? (
                <div className="space-y-6">
                   {/* Donut Chart with Centered Info */}
                   <div className="h-52 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                         <RePieChart>
                           <Pie
                             data={revenueByAttire}
                             cx="50%"
                             cy="50%"
                             innerRadius={58}
                             outerRadius={78}
                             paddingAngle={4}
                             dataKey="value"
                           >
                             {revenueByAttire.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip 
                             contentStyle={{
                               borderRadius: '16px',
                               border: 'none',
                               boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                               fontSize: '11px',
                               fontWeight: '700',
                               textAlign: 'right',
                               direction: 'rtl'
                             }}
                             formatter={(value: any) => [formatCurrency(Number(value)), 'مجموع المبيعات']}
                           />
                         </RePieChart>
                      </ResponsiveContainer>

                      {/* Absolute Centered Label */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
                        <span className="text-[9px] text-gray-450 font-black block">إجمالي المداخيل</span>
                        <strong className="text-sm font-black text-slate-800 font-mono" dir="ltr">
                          {formatCurrency(revenueByAttire.reduce((sum, item) => sum + item.value, 0))}
                        </strong>
                      </div>
                   </div>

                   {/* Luxurious Legend & Bar Progress List */}
                   <div className="space-y-3.5" dir="rtl">
                      {(() => {
                        const totalVal = revenueByAttire.reduce((sum, item) => sum + item.value, 0);
                        return revenueByAttire.map((item, i) => {
                          const pct = totalVal > 0 ? Math.round((item.value / totalVal) * 105) : 0;
                          const displayPct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                          const color = COLORS[i % COLORS.length];
                          return (
                            <div key={i} className="space-y-1 animate-in fade-in duration-300">
                               <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                  <div className="flex items-center gap-2">
                                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                     <span className="text-gray-800 font-extrabold text-[11px] truncate">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-left text-[10px] font-black">
                                     <span className="text-slate-800 font-mono" dir="ltr">{formatCurrency(item.value)}</span>
                                     <span className="text-gray-400 font-mono bg-gray-50 border border-gray-150 rounded px-1">{displayPct}%</span>
                                  </div>
                               </div>
                               {/* Micro progress bar */}
                               <div className="w-full h-1 bg-gray-105 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${displayPct}%`,
                                      backgroundColor: color
                                    }}
                                  />
                                </div>
                             </div>
                           );
                         });
                       })()}
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-16 opacity-50 flex flex-col items-center">
                    <Scissors size={40} className="mb-4 text-gray-400" />
                    <p className="text-sm font-medium">لا توجد بيانات نوع اللباس حالياً</p>
                 </div>
               )}
            </div>
         </div>

      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
               <Users className="text-slate-600" size={20} />
               <h5 className="font-bold text-slate-800 text-sm">عدد الزبناء</h5>
            </div>
            <p className="text-3xl font-black text-slate-900">{customers.length}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">إجمالي قاعدة البيانات</p>
         </div>

         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
               <TrendingUp className="text-slate-600" size={20} />
               <h5 className="font-bold text-slate-800 text-sm">متوسط قيمة الطلب</h5>
            </div>
            <p className="text-3xl font-black text-slate-900" dir="ltr">{formatCurrency(averageOrderValue)}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">لكل فاتورة مسجلة</p>
         </div>

         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
               <Scissors className="text-slate-600" size={20} />
               <h5 className="font-bold text-slate-800 text-sm">إجمالي الطلبات</h5>
            </div>
            <p className="text-3xl font-black text-slate-900">{orders.length}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">كل الحالات والأنواع</p>
         </div>

      </div>
      
      {/* Top Customers & Detailed Log Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 shadow-3xs">
              <Sparkles size={20} />
            </div>
            <div className="text-right">
              <h4 className="font-extrabold text-gray-800 text-base">تصنيف الزبناء</h4>
              <p className="text-[10px] text-gray-400 font-bold">الأفضل (Top 5) والمميزون (Next 5)</p>
            </div>
          </div>
          
          <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2 pad-scroll-thin" dir="rtl">
            {topCustomers.length > 0 ? topCustomers.map((stat, i) => (
              <div key={i} className={clsx(
                "flex items-center justify-between p-3 rounded-2xl border transition-all group",
                i < 5 ? "bg-indigo-50/40 border-indigo-100 hover:bg-white" : "bg-slate-50/50 border-slate-100 hover:bg-white text-gray-600"
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-xs",
                    i < 1 ? "bg-amber-500 shadow-lg shadow-amber-200" : 
                    i < 3 ? "bg-amber-400 shadow-lg shadow-amber-100" : 
                    i < 5 ? "bg-indigo-600 shadow-lg shadow-indigo-100" : 
                    "bg-slate-400"
                  )}>
                    {i + 1}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{stat.customer.fullName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[9px] text-slate-400 font-bold">{stat.orderCount} طلبات</p>
                      {i < 5 ? (
                         <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">زبون(ة) VIP</span>
                      ) : (
                         <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">زبون(ة) نشط</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={clsx(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase",
                    i < 5 ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-teal-100 text-teal-600 border border-teal-200"
                  )}>
                    {i < 5 ? 'الأفضل (Best)' : 'جيد جداً (Better)'}
                  </span>
                  <p className="text-xs font-black text-indigo-600 font-mono" dir="ltr">{formatCurrency(stat.totalSpent)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 text-xs font-bold">لا يوجد بيانات حالياً</div>
            )}
          </div>
        </div>

        {/* Detailed Operations Log Table */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 shadow-3xs">
              <HistoryIcon size={20} />
            </div>
            <div className="text-right">
              <h4 className="font-extrabold text-gray-800 text-base">سجل العمليات التفصيلي</h4>
              <p className="text-[10px] text-gray-400 font-bold">انقر على العناوين للترتيب حسب الزبون، النوع، أو المداخيل</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[440px] overflow-y-auto pad-scroll-thin" dir="rtl">
            <table className="w-full text-right border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-200">
                  <th 
                    onClick={() => requestSort('customerName')}
                    className="cursor-pointer pb-4 text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>الزبون</span>
                      {sortConfig?.key === 'customerName' && (
                        sortConfig.direction === 'asc' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('attireType')}
                    className="cursor-pointer pb-4 text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>نوع اللباس</span>
                      {sortConfig?.key === 'attireType' && (
                        sortConfig.direction === 'asc' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('revenue')}
                    className="cursor-pointer pb-4 text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>الإيرادات</span>
                      {sortConfig?.key === 'revenue' && (
                        sortConfig.direction === 'asc' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('date')}
                    className="cursor-pointer pb-4 text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>التاريخ</span>
                      {sortConfig?.key === 'date' && (
                        sortConfig.direction === 'asc' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedOperations.slice(0, 30).map((inv, idx) => {
                  return (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="text-xs font-black text-slate-800">{inv.customerName || '---'}</div>
                        <div className="text-[9px] text-slate-400 font-mono">#{inv.invoiceNumber}</div>
                      </td>
                      <td className="py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                          {inv.attireType || '---'}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-xs font-black text-emerald-600">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-4 text-[10px] text-slate-400 font-bold">
                        {formatDate(inv.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modals */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div 
             className="bg-white w-full max-w-2xl max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-500"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-3">
                    <div className={clsx(
                      "p-2 rounded-xl",
                      selectedDetail === 'revenue' && "bg-green-100 text-green-700",
                      selectedDetail === 'debts' && "bg-orange-100 text-orange-700",
                      selectedDetail === 'costs' && "bg-red-100 text-red-700",
                      selectedDetail === 'paid' && "bg-blue-100 text-blue-700",
                      selectedDetail === 'profits' && "bg-amber-100 text-amber-700"
                    )}>
                       {selectedDetail === 'revenue' && <TrendingUp size={20} />}
                       {selectedDetail === 'debts' && <FileText size={20} />}
                       {selectedDetail === 'costs' && <ArrowDownRight size={20} />}
                       {selectedDetail === 'paid' && <HistoryIcon size={20} />}
                       {selectedDetail === 'profits' && <TrendingUp size={20} />}
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">
                       {selectedDetail === 'revenue' && 'تفاصيل المداخيل'}
                       {selectedDetail === 'debts' && 'قائمة الديون العالقة'}
                       {selectedDetail === 'costs' && 'جرد تفصيلي للتكاليف'}
                       {selectedDetail === 'paid' && 'سجل الدفعات المحصلة'}
                       {selectedDetail === 'profits' && 'تفاصيل الأرباح والطلبات الرابحة'}
                    </h3>
                 </div>
                 <button 
                   onClick={() => setSelectedDetail(null)}
                   className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                 >
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 {selectedDetail === 'debts' && (
                   <div className="space-y-4">
                      {invoices.filter(inv => inv.remainingAmount > 0).map((inv, idx) => {
                        const customer = customers.find(c => c.id === inv.customerId);
                        return (
                          <div
                            key={idx}
                            onClick={() => navigate(`/orders/${inv.orderId}`)}
                            className="w-full text-right flex justify-between items-center p-4 bg-orange-50/30 border border-orange-100 rounded-2xl hover:bg-orange-50 transition cursor-pointer"
                          >
                             <div>
                                <p className="font-bold text-gray-800">{customer?.fullName || 'زبون غير معروف'}</p>
                                <p className="text-xs text-gray-500">{customer?.phone}</p>
                                <p className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-orange-200 w-fit mt-1">فاتورة رقم: {inv.invoiceNumber}</p>
                             </div>
                           <div className="text-left flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/invoice/${inv.id}?mode=a4`); }}
                                  className="p-2 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); shareWhatsAppReminder(customer || ({} as any), inv.remainingAmount, inv.invoiceNumber); }}
                                  className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                                >
                                  <Smartphone className="w-4 h-4" />
                                </button>
                                <div className="text-left">
                                  <p className="text-lg font-black text-orange-600" dir="ltr">{formatCurrency(inv.remainingAmount)}</p>
                                  <p className="text-[10px] text-gray-400 font-bold">انقر للتسوية</p>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                      {invoices.filter(inv => inv.remainingAmount > 0).length === 0 && (
                        <div className="text-center py-12 text-gray-400">لا توجد ديون عالقة حالياً</div>
                      )}
                   </div>
                 )}

                 {selectedDetail === 'costs' && (
                   <div className="space-y-4">
                      {orders.map((order, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="w-full text-right p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition cursor-pointer"
                        >
                              <div className="flex justify-between items-center mb-3">
                                 <div>
                                   <p className="font-bold text-gray-800">{db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                     <p className="text-[10px] text-gray-500">طلب رقم: {order.orderNumber}</p>
                                     <button
                                       onClick={(e) => { e.stopPropagation(); toggleMaterialsPurchased(order); }}
                                       className={clsx(
                                          "text-[9px] px-1.5 py-0.5 rounded-md border transition-colors",
                                          order.materialsPurchased 
                                            ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" 
                                            : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                                       )}
                                     >
                                        {order.materialsPurchased ? 'تم شراء الثوب' : 'لم يتم شراء الثوب'}
                                     </button>
                                   </div>
                                 </div>
                                 <div className="text-left">
                                 <p className="font-bold text-red-600" dir="ltr">-{formatCurrency(getTotalOrderExpenses(order))}</p>
                                 <p className="text-[9px] text-gray-400 font-bold">انقر للتفاصيل</p>
                              </div>
                           </div>
                         </div>
                       ))}
                      </div>
                   )}

                 {selectedDetail === 'revenue' && (
                   <div className="space-y-4">
                      {invoices.map((inv, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setSelectedInvoice(inv)}
                          className="w-full text-right flex justify-between items-center p-4 bg-green-50/30 border border-green-100 rounded-2xl hover:bg-green-50 transition"
                        >
                           <div>
                              <p className="font-bold text-gray-800">فاتورة رقم: {inv.invoiceNumber}</p>
                              <p className="text-xs text-gray-500">التاريخ: {formatDate(inv.createdAt)}</p>
                           </div>
                           <div className="text-left">
                              <p className="text-lg font-black text-green-700" dir="ltr">{formatCurrency(inv.totalAmount)}</p>
                              <p className="text-[9px] text-gray-400 font-bold">انقر للعرض</p>
                           </div>
                        </button>
                      ))}
                   </div>
                 )}

                 {selectedDetail === 'paid' && (
                   <div className="space-y-4">
                      {allPayments.map((payment, idx) => {
                        const inv = invoices.find(i => i.invoiceNumber === payment.invoiceNumber);
                        return (
                          <button 
                            key={idx} 
                            onClick={() => setSelectedPayment(payment)}
                            className="w-full text-right flex justify-between items-center p-4 bg-blue-50/30 border border-blue-100 rounded-2xl hover:bg-blue-50 transition"
                          >
                             <div>
                                <p className="font-bold text-gray-800">{payment.customerName}</p>
                                <p className="text-xs text-gray-500">دفعة بتاريخ: {formatDate(payment.date)}</p>
                                <p className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-blue-200 w-fit mt-1">فاتورة رقم: {payment.invoiceNumber}</p>
                             </div>
                             <div className="text-left">
                                <p className="text-lg font-black text-blue-700" dir="ltr">+{formatCurrency(payment.amount)}</p>
                                <p className="text-[9px] text-gray-400 font-bold">انقر للعرض</p>
                             </div>
                          </button>
                        );
                      })}
                      {allPayments.length === 0 && (
                        <div className="text-center py-12 text-gray-400">لا توجد دفعات مسجلة بعد</div>
                      )}
                   </div>
                 )}

                  {selectedDetail === 'profits' && (
                    <div className="space-y-6">
                       {/* High level metrics banner */}
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right animate-in fade-in duration-300" dir="rtl">
                         
                         {/* Net Profit Card */}
                         <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                           <div className="space-y-1">
                             <span className="text-xs text-emerald-600 font-bold block">صافي الأرباح</span>
                             <strong className="text-xl font-black text-emerald-700 font-mono block" dir="ltr">
                               {formatCurrency(totalProfitMargins)}
                             </strong>
                           </div>
                           <div className="bg-emerald-100/60 p-2.5 rounded-xl text-emerald-600">
                             <TrendingUp size={22} className="stroke-[2.5]" />
                           </div>
                         </div>

                         {/* Total Sales Card */}
                         <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-indigo-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                           <div className="space-y-1">
                             <span className="text-xs text-indigo-600 font-bold block">المبيعات الإجمالية</span>
                             <strong className="text-xl font-black text-indigo-700 font-mono block" dir="ltr">
                               {formatCurrency(totalSales)}
                             </strong>
                           </div>
                           <div className="bg-indigo-100/60 p-2.5 rounded-xl text-indigo-600">
                             <Wallet size={22} className="stroke-[2.5]" />
                           </div>
                         </div>

                         {/* Total Costs Card */}
                         <div className="bg-gradient-to-br from-rose-50/80 to-orange-50/40 border border-rose-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                           <div className="space-y-1">
                             <span className="text-xs text-rose-600 font-bold block">مجموع التكاليف</span>
                             <strong className="text-xl font-black text-rose-700 font-mono block" dir="ltr">
                               {formatCurrency(totalCosts)}
                             </strong>
                           </div>
                           <div className="bg-rose-100/60 p-2.5 rounded-xl text-rose-600">
                             <ArrowDownRight size={22} className="stroke-[2.5]" />
                           </div>
                         </div>

                       </div>

                       {/* List of orders */}
                       <div className="space-y-4">
                          {orders.filter(o => (getProfitVal(o) || 0) > 0).map((order, idx) => {
                            const customer = customers.find(c => c.id === order.customerId);
                            const totalOrderExpenses = getTotalOrderExpenses(order);
                            const profitVal = getProfitVal(order) || 0;
                            const profitPercent = order.finalPrice > 0 ? Math.round((profitVal / order.finalPrice) * 100) : 0;
                            const costPercent = 100 - profitPercent;
                            
                            return (
                              <div 
                                key={idx}
                                className="border border-gray-150 rounded-2xl bg-white shadow-xs hover:shadow-md hover:border-emerald-350 transition-all duration-300 overflow-hidden text-right"
                              >
                                 <div 
                                   onClick={() => { setSelectedDetail(null); navigate(`/orders/${order.id}`); }}
                                   className="p-5 hover:bg-slate-50/40 transition cursor-pointer flex flex-col sm:flex-row justify-between items-start gap-4"
                                 >
                                    <div className="space-y-1.5 text-right w-full sm:w-auto">
                                       <div className="flex items-center gap-2">
                                         <strong className="text-base font-black text-gray-800">
                                           {db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType}
                                         </strong>
                                         <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono">#{order.orderNumber}</span>
                                       </div>
                                       <p className="text-sm text-gray-700 font-bold">الزبون: <span className="text-primary-800 font-black">{customer?.fullName || 'غير معروف'}</span></p>
                                       <p className="text-xs text-gray-400 font-semibold">تاريخ التسليم: <span className="font-mono text-gray-600 font-bold">{formatDate(order.deliveryDate)}</span></p>
                                    </div>

                                    <div className="text-left w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2.5">
                                       <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1.5 shadow-3xs" dir="ltr">
                                         <TrendingUp size={15} />
                                         <span>+ {formatCurrency(profitVal)}</span>
                                         <span className="text-[9px] font-bold bg-emerald-100/60 px-1 py-0.5 rounded-md text-emerald-600">
                                           {profitPercent}% ربح
                                         </span>
                                       </div>
                                       <p className="text-[11px] text-emerald-600 font-black flex items-center gap-1">معاينة وتعديل المقاسات ←</p>
                                    </div>
                                 </div>

                                 {/* Visual Profit / Cost ratio bar */}
                                 <div className="px-5 py-2.5 bg-slate-50/50 border-t border-b border-gray-100">
                                   <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5 font-bold">
                                     <span className="text-rose-600 flex items-center gap-1">
                                       <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                                       <span>مجموع التكاليف ({costPercent}%)</span>
                                     </span>
                                     <span className="text-emerald-600 flex items-center gap-1">
                                       <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                       <span>صافي الأرباح ({profitPercent}%)</span>
                                     </span>
                                   </div>
                                   <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
                                     <div 
                                       className="bg-gradient-to-r from-red-400 to-rose-500 h-full transition-all duration-300"
                                       style={{ width: `${costPercent}%` }}
                                     />
                                     <div 
                                       className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                                       style={{ width: `${profitPercent}%` }}
                                     />
                                   </div>
                                 </div>

                                 {/* Cost and Sale Price Details Strip */}
                                 <div className="bg-gray-50/60 px-5 py-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                    <div className="text-right flex flex-col justify-center">
                                       <span className="text-gray-400 block text-[9px] font-black">سعر بيع للزبون</span>
                                       <strong className="text-gray-800 font-black font-mono text-sm" dir="ltr">{formatCurrency(order.finalPrice)}</strong>
                                    </div>
                                    <div className="text-right flex flex-col justify-center">
                                       <span className="text-gray-400 block text-[9px] font-black">تكلفة الإنتاج الإجمالية</span>
                                       <strong className="text-rose-600 font-black font-mono text-sm" dir="ltr">{formatCurrency(totalOrderExpenses)}</strong>
                                    </div>
                                    <div className="text-right col-span-2 sm:col-span-3 border-t sm:border-t-0 sm:border-r border-gray-150 pt-3 sm:pt-0 sm:pr-4 flex flex-wrap gap-1.5 items-center justify-start text-[10px]" dir="rtl">
                                       {getFabricCost(order) > 0 && <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-700 font-bold shadow-3xs">🧵 ثوب: {getFabricCost(order)} د.م.</span>}
                                       {getAccessoriesCost(order) > 0 && <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-700 font-bold shadow-3xs">💎 سلعة: {getAccessoriesCost(order)} د.م.</span>}
                                       {getLaborCost(order) > 0 && <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-700 font-bold shadow-3xs">🪡 خياطة: {getLaborCost(order)} د.م.</span>}
                                       {getEmbroideryCost(order) > 0 ? <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-700 font-bold shadow-3xs">🎨 معلم/طرز: {getEmbroideryCost(order)} د.م.</span> : null}
                                       {getOtherExpenses(order) > 0 ? <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-700 font-bold shadow-3xs">📦 أخرى: {getOtherExpenses(order)} د.م.</span> : null}
                                    </div>
                                 </div>
                              </div>
                            );
                          })}
                          {orders.filter(o => (getProfitVal(o) || 0) > 0).length === 0 && (
                            <div className="text-center py-12 text-gray-400 font-bold">لا توجد طلبات بربحية مسجلة حالياً</div>
                          )}
                       </div>
                    </div>
                  )}
              </div>
           </div>
        </div>
      )}

      {selectedPayment && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           {(() => {
             const inv = invoices.find(i => i.invoiceNumber === selectedPayment.invoiceNumber);
             const order = orders.find(o => o.id === inv?.orderId);
             const orderType = order?.attireType || 'غير محدد';
             const payments = inv?.payments || [];
             const paymentIndex = payments.findIndex(p => p.date === selectedPayment.date && p.amount === selectedPayment.amount);
             const paymentOrdinal = paymentIndex !== -1 ? ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'][paymentIndex] || `رقم ${paymentIndex + 1}` : '';
             
             return (
               <div className="bg-white rounded-2xl p-8 w-full max-w-xl space-y-6 printable border border-gray-100 shadow-xl relative animate-in fade-in zoom-in duration-200 text-right">
                 {/* Header & Branding */}
                  <div className="flex justify-between items-center border-b-2 border-blue-900 pb-4">
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-blue-900 tracking-tight">
                        KHAYAT <span className="text-amber-600 font-bold">PRO</span>
                      </h2>
                      <p className="text-xs text-gray-400 font-bold">خياطة عصرية وتقليدية</p>
                    </div>
                    <div className="text-left">
                      <h1 className="text-xl font-bold text-gray-900">سند قبض</h1>
                      <p className="text-xs text-gray-500 font-mono font-bold">#{selectedPayment.invoiceNumber}</p>
                    </div>
                  </div>

                  <div className="text-center space-y-2 hidden">
                   <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                     <Wallet size={32} />
                   </div>
                   <h2 className="text-xl font-bold">سند قبض</h2>
                 </div>
                 {/* Grid of details */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-right">
                    <div className="border-b border-dashed border-gray-200 pb-2">
                      <span className="text-xs text-gray-400 block mb-1 font-bold">الاسم الكامل</span>
                      <strong className="text-base font-black text-gray-800">{selectedPayment.customerName}</strong>
                    </div>
                    <div className="border-b border-dashed border-gray-200 pb-2">
                      <span className="text-xs text-gray-400 block mb-1 font-bold">نوع اللباس</span>
                      <strong className="text-base font-black text-gray-800">{orderType}</strong>
                    </div>
                    <div className="border-b border-dashed border-gray-200 pb-2">
                      <span className="text-xs text-gray-400 block mb-1 font-bold">تاريخ العملية</span>
                      <strong className="text-base font-black text-gray-800">{formatDate(selectedPayment.date)}</strong>
                    </div>
                    <div className="border-b border-dashed border-gray-200 pb-2">
                      <span className="text-xs text-gray-400 block mb-1 font-bold">البيان</span>
                      <strong className="text-base font-black text-gray-800 font-bold">الدفعة {paymentOrdinal}</strong>
                    </div>
                  </div>

                  {/* Hero Amount component */}
                  <div className="bg-green-50/70 border border-green-200 rounded-2xl p-4 text-center">
                    <span className="text-xs text-green-800 block mb-1 font-bold text-green-600">المبلغ المقبوض</span>
                    <span className="text-3xl font-black text-green-700 font-mono" dir="ltr">{formatCurrency(selectedPayment.amount)}</span>
                  </div>

                  {/* Signatures & Seal */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                    <div className="text-center w-36">
                      <span className="text-xs text-gray-400 font-bold block mb-10">توقيع المستلم</span>
                      <div className="border-b border-gray-300 w-full"></div>
                    </div>
                    <div className="text-center w-36">
                      <span className="text-xs text-gray-400 font-bold block mb-10">خاتم المؤسسة</span>
                      <div className="border-b border-dashed border-gray-300 w-full h-8 rounded-full"></div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-b py-4 hidden">
                    <div className="flex justify-between">
                      <span className="text-gray-500">الاسم:</span>
                      <span className="font-bold">{selectedPayment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">نوع اللباس:</span>
                      <span className="font-bold">{orderType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">المبلغ:</span>
                      <span className="font-black text-blue-700">{formatCurrency(selectedPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">التاريخ:</span>
                      <span className="font-bold">{formatDate(selectedPayment.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">الفاتورة:</span>
                      <span className="font-bold">{selectedPayment.invoiceNumber} (الدفعة {paymentOrdinal})</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 no-print">
                    <button onClick={() => window.print()} className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-xl hover:bg-gray-200">
                      <Printer size={18} /> طباعة
                    </button>
                    <button onClick={() => {
                       const message = `سند قبض
رقم الفاتورة: ${selectedPayment.invoiceNumber}
نوع اللباس: ${orderType}
الدفعة: ${paymentOrdinal}
الاسم: ${selectedPayment.customerName}
المبلغ: ${formatCurrency(selectedPayment.amount)}
التاريخ: ${formatDate(selectedPayment.date)}`;
                       const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                       window.open(url, '_blank');
                    }} className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-xl hover:bg-green-500">
                      <Smartphone size={18} /> واتساب
                    </button>
                 </div>
                 <button onClick={() => setSelectedPayment(null)} className="w-full p-3 text-gray-500 no-print">إغلاق</button>
               </div>
             );
           })()}
         </div>
       )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {(() => {
            const customer = customers.find(c => c.id === selectedInvoice.customerId);
            const order = orders.find(o => o.id === selectedInvoice.orderId);
            const orderType = order?.attireType || 'غير محدد';
            
            return (
              <div className="bg-white rounded-3xl p-8 w-full max-w-lg space-y-6 border border-gray-105 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-right no-print">
                
                {/* Header & Branding */}
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">تفاصيل الفاتورة</h2>
                    <p className="text-xs text-gray-400 font-bold">معاينة وإجراءات</p>
                  </div>
                  <div className="text-left">
                    <h1 className="text-sm font-black text-blue-900 bg-blue-50 px-3 py-1 rounded-full">
                      #{selectedInvoice.invoiceNumber}
                    </h1>
                  </div>
                </div>

                {/* Grid of details */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-right">
                  <div className="border-b border-dashed border-gray-100 pb-2">
                    <span className="text-xs text-gray-400 block mb-1 font-bold">اسم الزبون</span>
                    <strong className="text-sm font-bold text-gray-800">{customer?.fullName || 'زبون غير معروف'}</strong>
                  </div>
                  <div className="border-b border-dashed border-gray-100 pb-2">
                    <span className="text-xs text-gray-400 block mb-1 font-bold">نوع اللباس</span>
                    <strong className="text-sm font-bold text-gray-800">{orderType}</strong>
                  </div>
                  <div className="border-b border-dashed border-gray-100 pb-2">
                    <span className="text-xs text-gray-400 block mb-1 font-bold">تاريخ الفاتورة</span>
                    <strong className="text-sm font-bold text-gray-700">
                      {formatDate(selectedInvoice.createdAt)}
                    </strong>
                  </div>
                  <div className="border-b border-dashed border-gray-100 pb-2">
                    <span className="text-xs text-gray-400 block mb-1 font-bold">حالة السداد</span>
                    <span className={clsx(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full inline-block",
                      selectedInvoice.remainingAmount === 0 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : "bg-orange-50 text-orange-700 border border-orange-100"
                    )}>
                      {selectedInvoice.remainingAmount === 0 ? 'مدفوعة بالكامل' : 'متبقي دفعات'}
                    </span>
                  </div>
                </div>

                {/* Invoice Totals Panel */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-105">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">إجمالي الفاتورة</span>
                    <span className="font-bold text-gray-900" dir="ltr">{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المبلغ المدفوع</span>
                    <span className="font-bold text-green-600" dir="ltr">{formatCurrency(selectedInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-800">المتبقي للتسديد</span>
                    <span className={clsx("font-black text-base", selectedInvoice.remainingAmount > 0 ? "text-orange-600" : "text-gray-500")} dir="ltr">
                      {formatCurrency(selectedInvoice.remainingAmount)}
                    </span>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => navigate(`/invoice/${selectedInvoice.id}?mode=a4`)} 
                    className="flex flex-col gap-1 items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition border border-blue-100 font-bold"
                  >
                    <Printer size={20} />
                    <span className="text-xs">فاتورة A4 (PDF)</span>
                  </button>
                  <button 
                    onClick={() => navigate(`/invoice/${selectedInvoice.id}?mode=thermal`)} 
                    className="flex flex-col gap-1 items-center justify-center p-3 bg-sky-50 text-sky-700 rounded-2xl hover:bg-sky-100 transition border border-sky-100 font-bold"
                  >
                    <Printer size={20} className="stroke-[2.5]" />
                    <span className="text-xs">وصل حراري</span>
                  </button>
                  <button 
                    onClick={() => {
                      const message = `مرحباً ${customer?.fullName || ''}،\nتفاصيل فاتورتكم رقم ${selectedInvoice.invoiceNumber} لدى KhayatPro:\nنوع اللباس: ${orderType}\nالمجموع: ${formatCurrency(selectedInvoice.totalAmount)}\nالمدفوع: ${formatCurrency(selectedInvoice.amountPaid)}\nالمتبقي: ${formatCurrency(selectedInvoice.remainingAmount)}\nشكراً لتعاملكم معنا!`;
                      const url = `https://wa.me/${customer?.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(message)}`;
                      window.open(url, '_blank');
                    }} 
                    className="flex flex-col gap-1 items-center justify-center p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition shadow-sm font-bold"
                  >
                    <Smartphone size={20} />
                    <span className="text-xs">مشاركة واتساب</span>
                  </button>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedInvoice(null)} 
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition text-sm font-bold"
                >
                  إغلاق
                </button>
                
              </div>
            );
          })()}
        </div>
      )}
    </div>

    {/* Printable Report (Only visible when printing) */}
    <div 
      className="hidden print:block w-full bg-white text-right p-6 pt-8 font-sans text-slate-800 overflow-y-visible printable-area" 
      dir="rtl"
    >
      {/* Header Section */}
      <header className="flex justify-between items-start border-b-4 border-indigo-600 pb-4 mb-6">
        <div className="flex items-center gap-6">
          {renderLogo(shopLogo, 'w-24 h-24')}
          <div>
            <h1 className="text-4xl font-black text-indigo-900 mb-1">{shopName}</h1>
            <p className="text-lg text-slate-500 font-bold">{tailorName}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400 font-bold">
              <span className="flex items-center gap-1"><Smartphone size={14} /> {shopPhone}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(new Date())}</span>
            </div>
          </div>
        </div>
        <div className="text-left">
           <h2 className="text-3xl font-black text-indigo-700 uppercase tracking-wider">تقرير مالي شامل</h2>
           <p className="text-xs text-slate-400 font-bold mt-1 tracking-tight italic opacity-60">وثائق ورشة {shopName} الرسمية</p>
        </div>
      </header>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
          <p className="text-xs text-slate-400 font-black mb-1 flex items-center gap-1.5"><TrendingUp size={12} /> إجمالي المبيعات (Revenue)</p>
          <p className="text-3xl font-black text-indigo-700">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
          <p className="text-xs text-slate-400 font-black mb-1 flex items-center gap-1.5"><Sparkles size={12} /> الأرباح الصافية (Net Profits)</p>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalProfitMargins)}</p>
        </div>
        <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
          <p className="text-xs text-slate-400 font-black mb-1 flex items-center gap-1.5"><Wallet size={12} /> السيولة النقدية (Paid)</p>
          <p className="text-3xl font-black text-blue-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl">
          <p className="text-xs text-slate-400 font-black mb-1 flex items-center gap-1.5"><AlertCircle size={12} className="text-orange-600" /> الديون المتبقية (Debts)</p>
          <p className="text-3xl font-black text-orange-600">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Top Customers Split Ranking */}
      <div className="mb-12">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Users size={18} />
          </div>
          <span>ترتيب كبار الزبناء (Top 10 Customers)</span>
        </h3>
        
        <div className="grid grid-cols-2 gap-8">
           {/* Elite Group - Best */}
           <div className="space-y-4">
              <h4 className="text-sm font-black text-indigo-700 border-b border-indigo-100 pb-2 mb-4">زبناء النخبة (ELITE - TOP 5)</h4>
              {topCustomers.slice(0, 5).map((stat, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                   <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      <span className="text-xs font-black text-slate-800">{stat.customer.fullName}</span>
                   </div>
                   <span className="text-xs font-bold text-indigo-600" dir="ltr">{formatCurrency(stat.totalSpent)}</span>
                </div>
              ))}
           </div>

           {/* Good Group - Better */}
           <div className="space-y-4">
              <h4 className="text-sm font-black text-teal-700 border-b border-teal-100 pb-2 mb-4">الأكثر تفاعلاً (VERY GOOD - NEXT 5)</h4>
              {topCustomers.slice(5, 10).map((stat, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                   <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">{i+6}</span>
                      <span className="text-xs font-black text-slate-800">{stat.customer.fullName}</span>
                   </div>
                   <span className="text-xs font-bold text-teal-600" dir="ltr">{formatCurrency(stat.totalSpent)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Detailed Operations Log Section */}
      <div className="mb-12">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <HistoryIcon size={18} />
          </div>
          <span>سجل العمليات التفصيلي (Financial Records)</span>
        </h3>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-y-2 border-slate-200">
              <th className="py-4 text-xs font-black text-slate-600 px-4 text-right">الزبون (Customer)</th>
              <th className="py-4 text-xs font-black text-slate-600 px-4 text-right">نوع اللباس (Attire Type)</th>
              <th className="py-4 text-xs font-black text-slate-600 px-4 text-right">الإيرادات (Revenue)</th>
              <th className="py-4 text-xs font-black text-slate-600 px-4 text-right">التاريخ (Date)</th>
              <th className="py-4 text-xs font-black text-slate-600 px-4 text-right">رقم الفاتورة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-black">
            {sortedOperations.slice(0, 50).map((inv, idx) => {
              return (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-4 text-xs font-black text-slate-800 px-4">{inv.customerName}</td>
                  <td className="py-4 text-xs font-bold text-indigo-700 px-4">{inv.attireType}</td>
                  <td className="py-4 text-sm font-black text-emerald-600 px-4" dir="ltr">{formatCurrency(inv.totalAmount)}</td>
                  <td className="py-4 text-xs font-bold text-slate-500 px-4">{formatDate(inv.createdAt)}</td>
                  <td className="py-4 text-xs font-mono font-bold px-4 text-slate-400">#{inv.invoiceNumber}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Signature Section */}
      <footer className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-center opacity-70">
        <div className="text-xs font-bold text-slate-400">
          <p>أنتجت هذه الوثيقة آلياً عبر تطبيق KhayyatPro بتاريخ {formatDate(new Date())}</p>
          <p className="mt-1 font-mono">{shopAddress}</p>
        </div>
        <div className="text-center w-52 border-t border-slate-300 pt-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ختم وتوقيع الإدارة</p>
          <p className="text-sm font-black text-slate-800">{tailorName}</p>
        </div>
      </footer>
    </div>
  </>
);
}

