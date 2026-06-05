import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../store/db';
import { Order, Invoice, Customer, CostFieldSetting, DEFAULT_COST_FIELDS, BrandingVisibility, DEFAULT_BRANDING_VISIBILITY } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useUI } from '../store/ui';
import { Printer, Phone, MapPin, Hash, User, FileText, Calendar, Scissors, Sparkles, Shield as ShieldLockIcon } from 'lucide-react';

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
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';

export default function InvoiceView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'a4'; // a4 or thermal
  
  const [isCapturing, setIsCapturing] = useState(false);
  const { showToast } = useUI();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [costFieldsSettings, setCostFieldsSettings] = useState<CostFieldSetting[]>(DEFAULT_COST_FIELDS);

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
  const [shopSignature, setShopSignature] = useState('');
  const [showSignature, setShowSignature] = useState(true);
  const [isSigningLive, setIsSigningLive] = useState(false);
  const sigCanvas = useRef<any>(null);
  const [invoiceNotes, setInvoiceNotes] = useState('الرجاء الحفاظ على هذا الوصل وتقديمه عند استلام اللباس. الطلبات غير المستلمة لمدة تفوق 3 أشهر لا نتحمل مسؤولية بقائها بالورشة.');
  const [brandingVisibility, setBrandingVisibility] = useState<BrandingVisibility>(DEFAULT_BRANDING_VISIBILITY);

  const renderLogo = (logo: string | null | undefined, size = 'w-14 h-14') => {
    if (!logo) return null;
    if (logo.startsWith('data:image/')) {
      return <img src={logo} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    }
    
    if (logo === 'img:khayyat1') return <img src={logoKhayyat1} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo === 'img:khayyat2') return <img src={logoKhayyat2} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo === 'img:khayyat3') return <img src={logoKhayyat3} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo === 'img:khayyat4') return <img src={logoKhayyat4} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo === 'img:khayyat5') return <img src={logoKhayyat5} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    if (logo === 'img:khayyat6') return <img src={logoKhayyat6} className={`${size} object-contain rounded-2xl border border-slate-100 shrink-0 bg-white shadow-4xs`} alt="لوغو" />;
    
    if (logo === 'preset:scissors') return <div className={`flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl ${size} shadow-4xs shrink-0`}><Scissors className="w-2/3 h-2/3 stroke-[2]" /></div>;
    if (logo === 'preset:star') return <div className={`flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl ${size} shadow-4xs shrink-0`}><Sparkles className="w-2/3 h-2/3 stroke-[2]" /></div>;
    if (logo === 'preset:royal') return <div className={`flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl ${size} shadow-4xs shrink-0`}><span className="text-xl">👑</span></div>;
    if (logo === 'preset:heart') return <div className={`flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl ${size} shadow-4xs shrink-0`}><span className="text-xl">❤️</span></div>;
    return null;
  };

  useEffect(() => {
    if (id) {
      const inv = db.getInvoices().find(i => i.id === id);
      if (inv) {
        setInvoice(inv);
        const o = db.getOrders().find(o => o.id === inv.orderId);
        if (o) {
          setOrder(o);
          setCustomer(db.getCustomers().find(c => c.id === o.customerId) || null);
        }
      }
    }
    setShopName(localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة');
    setTailorName(localStorage.getItem('khayatpro_setting_tailor_name') || 'المعلم سفيان');
    setShopPhone(localStorage.getItem('khayatpro_setting_phone') || '0661234567');
    setShopEmail(localStorage.getItem('khayatpro_setting_email') || 'contact@khayatpro.ma');
    setShopAddress(localStorage.getItem('khayatpro_setting_address') || 'شارع الحسن الثاني، عمارة 4، الرباط');
    setShopPatent(localStorage.getItem('khayatpro_setting_patent') || 'RC 45910 / PAT 120485');
    setShopRc(localStorage.getItem('khayatpro_setting_rc') || 'RC-Rabat-45910');
    setShopIf(localStorage.getItem('khayatpro_setting_if') || 'IF-987654');
    setShopLogo(localStorage.getItem('khayatpro_setting_logo') || 'preset:scissors');
    setShopSignature(localStorage.getItem('khayatpro_setting_signature') || '');
    setInvoiceNotes(localStorage.getItem('khayatpro_setting_invoice_notes') || 'الرجاء الحفاظ على هذا الوصل وتقديمه عند استلام اللباس.');
    
    const storedFields = localStorage.getItem('khayatpro_setting_cost_fields');
    if (storedFields) {
      try { setCostFieldsSettings(JSON.parse(storedFields)); } catch (e) {}
    }

    const storedBranding = localStorage.getItem('khayatpro_branding_visibility');
    if (storedBranding) {
      try { setBrandingVisibility(JSON.parse(storedBranding)); } catch (e) {}
    }
  }, [id]);

  if (!invoice || !order || !customer) return <div className="p-8 text-center text-gray-500 font-bold">جاري تحميل الفاتورة...</div>;

  const handlePrint = async () => {
    // If not native, just use window.print()
    const capacitor = (window as any).Capacitor;
    if (!capacitor || !capacitor.isNativePlatform) {
      window.print();
      return;
    }

    // For Native: Capture as PDF and Share
    try {
      setIsCapturing(true);
      showToast({ message: 'جاري تحضير نسخة PDF للمشاركة...', type: 'info' });
      
      const element = document.querySelector('.printable') as HTMLElement;
      if (!element) throw new Error('تعذر العثور على منطقة الطباعة');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: mode === 'thermal' ? 'portrait' : 'portrait',
        unit: 'mm',
        format: mode === 'thermal' ? [80, 297] : 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const fileName = `Invoice_${invoice?.invoiceNumber || Date.now()}.pdf`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });

      await CapacitorShare.share({
        title: 'فاتورة خياط برو',
        text: `فاتورة رقم ${invoice?.invoiceNumber}`,
        url: savedFile.uri,
      });

    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      showToast({ message: 'فشل إنشاء ملف PDF: ' + error.message, type: 'error' });
    } finally {
      setIsCapturing(false);
    }
  };

  // THERMAL INVOICE LAYOUT (وصول حراري بأسلوب مغربي)
  if (mode === 'thermal') {
    return (
      <div className="min-h-screen bg-gray-150 flex flex-col items-center p-4 print:p-0 print:bg-white print:block text-right" dir="rtl">
        
        {/* Controls (Hidden in print) */}
        <div className="mb-4 w-full max-w-[300px] flex flex-col gap-2 print:hidden">
           <div className="flex justify-between">
             <button onClick={() => window.history.back()} className="text-xs font-black text-gray-500 hover:text-gray-700">الرجوع للخلف</button>
             <div className="flex gap-2 items-center">
               <button onClick={() => setIsSigningLive(true)} className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-black shadow-sm transition" title="توقيع يدوي سريع">
                 <Scissors className="w-3.5 h-3.5" />
               </button>
               <button onClick={handlePrint} className="flex gap-2 items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition">
                 <Printer className="w-3.5 h-3.5" /> طبع الوصل
               </button>
             </div>
           </div>
           <label className="flex items-center justify-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black cursor-pointer shadow-sm mx-auto w-full">
             <input type="checkbox" checked={showSignature} onChange={e => setShowSignature(e.target.checked)} className="rounded text-indigo-600 w-3 h-3" />
             إظهار التوقيع المعتمد
           </label>
        </div>

        {/* Thermal Receipt Paper */}
        <div className="bg-white w-[300px] p-5 shadow-lg font-mono text-xs leading-normal text-slate-800 border-t-4 border-indigo-600 print:w-full print:border-none print:shadow-none printable">
           <div className="text-center pb-3 border-b border-dashed border-gray-300 mb-3 flex flex-col items-center justify-center gap-2">
             {brandingVisibility.showLogo ? renderLogo(shopLogo, 'w-12 h-12 mb-1') : null}
             {brandingVisibility.showShopName && <h1 className="font-extrabold text-sm text-slate-900 mb-0.5 leading-tight">{shopName}</h1>}
             {brandingVisibility.showTailorName && <p className="text-[10px] text-gray-400">تحت إشراف: {tailorName}</p>}
             {brandingVisibility.showPhone && <p className="text-[9px] text-gray-400">الهاتف: {shopPhone}</p>}
             {(shopAddress && brandingVisibility.showAddress) && <p className="text-[8.5px] text-gray-450 mt-0.5 leading-tight">{shopAddress}</p>}
           </div>
           
           <div className="space-y-1 mb-3 text-[10px] bg-slate-50 p-2 rounded-lg">
             <div className="flex justify-between"><span className="text-gray-400 font-bold">التاريخ:</span> <span className="font-bold text-slate-700">{formatDate(invoice.createdAt)}</span></div>
             <div className="flex justify-between"><span className="text-gray-400 font-bold">رقم الوصل:</span> <span className="font-mono font-bold text-slate-700">{invoice.invoiceNumber}</span></div>
             <div className="flex justify-between"><span className="text-gray-400 font-bold">الزبون(ة):</span> <span className="font-black text-slate-800 truncate max-w-[140px]">{customer.fullName}</span></div>
             {customer.phone && <div className="flex justify-between"><span className="text-gray-405">الهاتف:</span> <span className="font-mono">{customer.phone}</span></div>}
           </div>

           <table className="w-full text-[10px] mb-3 border-b border-dashed border-gray-300 pb-3">
             <thead>
               <tr className="border-b border-gray-200">
                 <th className="text-right py-1 font-bold text-gray-400">الصنف والبيان</th>
                 <th className="text-left py-1 font-bold text-gray-400">المبلغ</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td className="py-2 text-right text-slate-800 font-black">
                   بناء {db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType}
                 </td>
                 <td className="py-2 text-left font-bold text-slate-700" dir="ltr">{formatCurrency(invoice.totalAmount)}</td>
               </tr>

               {/* Detailed Breakdown for Thermal */}
               {order.costs && (order.costs as any).fields && Object.entries((order.costs as any).fields).map(([id, val]) => {
                  const setting = costFieldsSettings.find(f => f.id === id);
                  if (!setting || (val as number) === 0) return null;
                  return (
                    <tr key={id} className="text-[9px] text-gray-500">
                      <td className="py-0.5 pr-2 truncate max-w-[120px]">└ {setting.label}</td>
                      <td className="text-left font-mono" dir="ltr">{formatCurrency(val as number)}</td>
                    </tr>
                  );
               })}
               {order.description && (
                 <tr>
                   <td colSpan={2} className="py-1 text-right text-[9px] text-slate-400 leading-tight">
                     الملاحظات: {order.description}
                   </td>
                 </tr>
               )}
             </tbody>
           </table>

           <div className="space-y-1.5 text-[10.5px] border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي الحساب:</span>
                <span dir="ltr" className="font-bold text-slate-700">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>المبلغ المقدم (المدفوع):</span>
                <span dir="ltr">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-xs text-indigo-700 pt-1.5 border-t border-slate-100">
                <span>المتبقي عند الاستلام:</span>
                <span dir="ltr" className="font-mono">{formatCurrency(invoice.remainingAmount)}</span>
              </div>
           </div>

           {/* Thermal Signature */}
           {shopSignature && showSignature && (
             <div className="flex flex-col items-center justify-center my-3 pb-3 border-b border-dashed border-gray-300">
               <span className="text-[9px] text-gray-400 font-bold mb-1">توقيع الورشة</span>
               <img src={shopSignature} className="h-10 object-contain mix-blend-multiply opacity-80 filter grayscale" alt="توقيع الورشة" />
             </div>
           )}

           {/* Dynamic Invoice notes under thermal receipt */}
           <div className="text-center text-[9px] text-gray-400 space-y-1 bg-slate-50/50 p-2.5 rounded-xl leading-normal">
              <p className="font-bold text-gray-500 whitespace-pre-wrap">{invoiceNotes}</p>
              <div className="border-t border-dashed border-gray-200 pt-1.5 mt-1">
                <p>شكرًا لتعاملكم الجميل وثقتكم بنا</p>
                <p className="text-[7.5px] text-indigo-400/80 font-mono mt-0.5">برنامج خياط برو © المساعد الذكي للخياطة</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // A4 INVOICE LAYOUT (جمال وأناقة ورش الخياطة التقليدية)
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 print:p-0 print:bg-white pb-24 text-right" dir="rtl">
       {/* Controls */}
       <div className="w-full max-w-3xl flex flex-col gap-3 mb-6 print:hidden">
         <div className="flex justify-between w-full">
            <button onClick={() => window.history.back()} className="text-xs font-black text-gray-500 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition">الرجوع للوحة التحكم</button>
            <div className="flex gap-2">
              <button onClick={() => setIsSigningLive(true)} className="flex items-center gap-2 bg-sky-50 text-sky-700 hover:bg-sky-100 px-4 py-2.5 rounded-xl border border-sky-200 text-[11px] font-black cursor-pointer shadow-sm">
                توقيع الفاتورة
                <Sparkles className="w-3 h-3" />
              </button>
              <label className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-black cursor-pointer shadow-sm">
                <input type="checkbox" checked={showSignature} onChange={e => setShowSignature(e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                إظهار التوقيع
              </label>
              <button onClick={handlePrint} className="flex gap-2 items-center bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md">
                <Printer className="w-4 h-4" /> تحميل / طباعة PDF
              </button>
            </div>
         </div>
       </div>

       {/* A4 Paper */}
       <div className="bg-white w-full max-w-3xl aspect-[1/1.4] p-12 shadow-xl print:shadow-none print:w-full print:h-auto print:p-8 border border-gray-105 printable rounded-3xl print:rounded-none flex flex-col justify-between">
          
          <div>
            {/* Header section with Dynamic Brand details */}
            <header className="flex justify-between items-start border-b-2 border-indigo-600 pb-8 mb-8">
              <div>
                <span className="bg-indigo-50 text-indigo-800 text-[10px] font-black px-3 py-1 rounded-full mb-2 inline-block">فاتورة رسمية للحساب</span>
                <h1 className="text-3xl font-black text-indigo-900 tracking-tight mb-2">وصل تفصيل وتصميم</h1>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold font-mono">
                  <FileText size={13} />
                  <span>الرقم المرجعي: {invoice.invoiceNumber}</span>
                </div>
              </div>
              <div className="text-left font-sans flex flex-col items-end">
                {brandingVisibility.showLogo ? renderLogo(shopLogo, 'w-16 h-16 mb-2') : null}
                {brandingVisibility.showShopName && <h2 className="text-2xl font-black tracking-tight text-slate-800 leading-tight">{shopName}</h2>}
                {brandingVisibility.showTailorName && <p className="text-[11px] text-indigo-600 font-extrabold mt-1">تسيير الأستاذ المعلم: {tailorName}</p>}
                
                <div className="text-[10px] text-gray-400 space-y-0.5 mt-2.5" dir="ltr">
                  {brandingVisibility.showPhone && (
                    <p className="flex items-center justify-end gap-1.5 font-bold">
                      <span>{shopPhone}</span>
                      <Phone size={10} className="text-indigo-500" />
                    </p>
                  )}
                  {brandingVisibility.showEmail && (
                    <p className="flex items-center justify-end gap-1.5 font-bold">
                      <span>{shopEmail}</span>
                      <MapPin size={10} className="text-indigo-500" />
                    </p>
                  )}
                  {(shopAddress && brandingVisibility.showAddress) && <p className="text-[9.5px]/tight text-right pr-4 text-gray-400">{shopAddress}</p>}
                </div>
              </div>
            </header>

            {/* Customer & Order Metadata */}
            <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50/50 p-5 rounded-2xl border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">جهة إصدار الفاتورة للزبون(ة)</p>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{customer.fullName}</span>
                </h3>
                <p className="text-xs text-gray-500 font-mono font-bold mt-1.5" dir="ltr">{customer.phone}</p>
                {customer.address && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{customer.address}</p>}
                <div className="mt-2.5">
                  {customer.gender === 'female' ? (
                     <span className="bg-pink-50 text-pink-700 text-[9px] font-black px-2.5 py-1 rounded">زبونة الورشة المسجلة</span>
                  ) : (
                     <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded">زبون الورشة المسجل</span>
                  )}
                </div>
              </div>
              
              <div className="text-left font-sans flex flex-col justify-between">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">تفاصيل مواعيد الخياطة</p>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex justify-end gap-2"><span className="text-slate-800 font-bold">{formatDate(invoice.createdAt)}</span> <span className="text-gray-400 font-bold">:تاريخ تفصيل الثوب</span></p>
                      <p className="flex justify-end gap-2"><span className="text-slate-800 font-bold font-mono">{order.orderNumber}</span> <span className="text-gray-400 font-bold">:رقم مرجع الملف</span></p>
                      <p className="flex justify-end gap-2 text-indigo-700 font-extrabold font-sans">
                        <span>{formatDate(order.deliveryDate)}</span>
                        <span className="text-indigo-400 font-bold">(:تاريخ استلام جاهز للتسليم)</span>
                      </p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-xs mb-10">
              <thead>
                <tr className="bg-slate-100 border-y border-gray-200">
                  <th className="py-3 px-4 text-right font-black text-slate-700">البيان وصنف اللباس التقليدي الأصيل</th>
                  <th className="py-3 px-4 text-right font-black text-slate-705 w-2/5">مواصفات وتوابع الموديل</th>
                  <th className="py-3 px-4 text-left font-black text-slate-705 w-1/4">مبلغ التفصيل الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-5 px-4 align-top">
                    <span className="font-extrabold text-sm text-slate-800 block">
                      {db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">خياطة يدوية وتصميم تقليدي ممتاز</span>
                  </td>
                  <td className="py-5 px-4 text-slate-600 leading-normal font-sans">
                     {order.description || 'تفصيل ممتاز للمقاسات المسجلة'}
                     
                     {/* Breakdown List under Description for A4 */}
                     {order.costs && (order.costs as any).fields && (
                       <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {Object.entries((order.costs as any).fields).map(([id, val]) => {
                             const setting = costFieldsSettings.find(f => f.id === id);
                             if (!setting || (val as number) === 0) return null;
                             return (
                               <div key={id} className="flex justify-between border-b border-slate-200 pb-1">
                                 <span className="text-gray-500 font-bold">{setting.label}:</span>
                                 <span className="font-mono font-black text-slate-700">{formatCurrency(val as number)}</span>
                               </div>
                             );
                          })}
                       </div>
                     )}
                  </td>
                  <td className="py-5 px-4 text-left font-mono font-extrabold text-slate-800 text-sm align-top" dir="ltr">
                     {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Calculations and Breakdown */}
            <div className="flex justify-between items-start pt-6 border-t border-slate-100 mb-10">
               {/* Left Block showing Legal info (Patent / license of shop) if set */}
               <div className="text-right max-w-sm">
                  {((shopPatent || shopRc || shopIf) && brandingVisibility.showLegalInfo) ? (
                    <div className="text-[10px] text-gray-405 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                      <p className="font-extrabold text-gray-500 mb-1 flex items-center gap-1">
                        <ShieldLockIcon size={11} className="text-indigo-600" />
                        <span>الهوية المهنية والجبائية للورشة</span>
                      </p>
                      {shopPatent && <p className="font-sans text-gray-500 font-bold mt-1 text-right">رقم براءة الاختراع: <span className="font-mono font-black text-slate-700">{shopPatent}</span></p>}
                      {shopRc && <p className="font-sans text-gray-500 font-bold mt-1 text-right">السجل التجاري: <span className="font-mono font-black text-slate-700">{shopRc}</span></p>}
                      {shopIf && <p className="font-sans text-gray-500 font-bold mt-1 text-right font-sans">التعريف الضريبي (I.F): <span className="font-mono font-black text-slate-700">{shopIf}</span></p>}
                    </div>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
               </div>

               {/* Right Block showing totals */}
               <div className="w-1/2 space-y-3 font-sans">
                 <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2.5">
                    <span>مجموع تكلفة العمل والمواد المستعملة:</span>
                    <span dir="ltr" className="font-mono font-bold text-slate-700">{formatCurrency(order.totalCost)}</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2.5">
                    <span>قيمة ضريبة الأداء والورشة المفروضة:</span>
                    <span dir="ltr" className="font-mono font-bold text-slate-700">{formatCurrency(invoice.totalAmount - (order.totalCost))}</span>
                 </div>
                 <div className="flex justify-between text-base font-black text-indigo-900 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
                    <span>الإجمالي العام للمستحقات:</span>
                    <span dir="ltr" className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
                 </div>
                 
                 <div className="flex justify-between text-xs pt-3">
                    <span className="text-slate-500 font-bold">التسبيق المقدم (المقبول):</span>
                    <span dir="ltr" className="font-mono text-emerald-600 font-extrabold">{formatCurrency(invoice.amountPaid)}</span>
                 </div>
                 <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-slate-100">
                    <span className="text-slate-800">الباقي بذمة الزبون عند استلام اللباس جاهزاً:</span>
                    <span dir="ltr" className="font-mono text-indigo-700 text-base">{formatCurrency(invoice.remainingAmount)}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Footer Terms & Dynamic notes */}
          <footer className="border-t-2 border-gray-100 pt-6 mt-12 bg-slate-50/40 p-4 rounded-2xl text-center relative">
             <div className="max-w-2xl mx-auto space-y-2">
                <p className="text-xs font-extrabold text-slate-700 whitespace-pre-wrap">{invoiceNotes}</p>
                <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between items-center text-[10px] text-gray-400 font-semibold relative" dir="rtl">
                   <div className="flex flex-col items-center">
                     <span>إمضاء الورشة / الأتيلييه</span>
                     {shopSignature && showSignature && (
                       <img src={shopSignature} className="h-12 w-auto mt-1 absolute -top-8 mix-blend-multiply opacity-80" alt="توقيع الورشة" />
                     )}
                   </div>
                   <span>التاريخ: {formatDate(new Date())}</span>
                   <span dir="ltr">برنامج خياط برو المكتبي</span>
                </div>
             </div>
          </footer>
       </div>

       {/* Floating Signature Modal */}
       {isSigningLive && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
             <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
               <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-indigo-600" /> توقيع الفاتورة السريع
               </h3>
               <button onClick={() => setIsSigningLive(false)} className="text-indigo-400 hover:text-indigo-600">×</button>
             </div>
             <div className="p-4 flex flex-col items-center">
                <div className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl relative overflow-hidden mb-4">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="#0f172a"
                    canvasProps={{className: 'w-full h-full cursor-crosshair'}}
                  />
                  <div className="absolute top-2 left-2 text-[9px] text-gray-400 font-bold pointer-events-none">وقع هنا مباشرة</div>
                </div>
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => {
                      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
                        setShopSignature(signatureDataUrl);
                        localStorage.setItem('khayatpro_setting_signature', signatureDataUrl);
                        setShowSignature(true);
                        setIsSigningLive(false);
                      }
                    }} 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 text-xs rounded-xl transition"
                  >
                    تأكيد وحفظ
                  </button>
                  <button 
                    onClick={() => sigCanvas.current?.clear()} 
                    className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-black py-3 text-xs rounded-xl transition"
                  >
                    مسح اللوحة
                  </button>
                </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
