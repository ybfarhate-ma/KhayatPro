import { useState, useEffect, FormEvent, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import { db } from '../store/db';
import { getSubscriptions, saveSubscription } from '../lib/subscriptions';
import { Order, Customer, Invoice, CustomTemplate, CostFieldSetting, DEFAULT_COST_FIELDS } from '../types';
import { ArrowRight, Edit3, Trash2, Printer, CheckCircle, Share2, Printer as PrinterThermal, Smartphone, ShoppingBag, Download, Share, MessageSquare, Send, X, MessageCircle, Info, Calculator } from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { clsx } from 'clsx';
import { useUI } from '../store/ui';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, confirm } = useUI();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [costFieldsSettings, setCostFieldsSettings] = useState<CostFieldSetting[]>(DEFAULT_COST_FIELDS);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [selectedMsgType, setSelectedMsgType] = useState<string>('ready');
  const [customMsgText, setCustomMsgText] = useState('');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  const msgTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertRealValueAtCursor = (variableKey: string) => {
    const el = msgTextareaRef.current;
    if (!el || !order || !customer) return;

    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const remaining = invoice ? invoice.remainingAmount : 0;
    const deposit = invoice ? (invoice.totalAmount - invoice.remainingAmount) : 0;
    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const attireName = db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType;

    let realVal = '';
    switch (variableKey) {
      case '{customer}': realVal = customer.fullName; break;
      case '{title}': realVal = title; break;
      case '{dear}': realVal = dear; break;
      case '{attire}': realVal = attireName; break;
      case '{order_number}': realVal = order.orderNumber; break;
      case '{remaining_amount}': realVal = formatCurrency(remaining); break;
      case '{deposit_amount}': realVal = formatCurrency(deposit); break;
      case '{shop_name}': realVal = shopName; break;
      default: realVal = variableKey;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const origText = el.value;
    const newText = origText.substring(0, start) + realVal + origText.substring(end);

    setCustomMsgText(newText);

    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + realVal.length;
    }, 50);
  };

  const renderHighlightedMsg = (text: string) => {
    if (!customer || !order) return text;
    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const remaining = invoice ? invoice.remainingAmount : 0;
    const deposit = invoice ? (invoice.totalAmount - invoice.remainingAmount) : 0;
    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const attireName = db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType;
    const remainingAmountStr = formatCurrency(remaining);
    const depositAmountStr = formatCurrency(deposit);
    const orderNumber = order ? order.orderNumber : '';

    const tags = [
      { value: customer.fullName, color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs text-emerald-900' },
      { value: title, color: 'bg-red-100 text-red-800 border-red-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs text-red-900' },
      { value: dear, color: 'bg-pink-100 text-pink-800 border-pink-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs text-pink-900' },
      { value: attireName, color: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs text-indigo-900' },
      { value: orderNumber, color: 'bg-purple-100 text-purple-800 border-purple-300 font-bold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs font-mono text-purple-900' },
      { value: remainingAmountStr, color: 'bg-amber-100 text-amber-800 border-amber-305 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs font-mono text-amber-900' },
      { value: depositAmountStr, color: 'bg-teal-100 text-teal-800 border-teal-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs font-mono text-teal-900' },
      { value: shopName, color: 'bg-blue-100 text-blue-800 border-blue-300 font-extrabold px-1.5 py-0.5 rounded-md border inline-block mx-0.5 shadow-4xs text-blue-900' }
    ].filter(t => t.value && t.value.trim().length > 0);

    // Sort tags by descending value length to avoid partial overlaps matching incorrectly
    const sortedTags = [...tags].sort((a, b) => b.value.length - a.value.length);
    let parts: { text: string; tagIndex?: number }[] = [{ text: text }];

    sortedTags.forEach((tag, idx) => {
      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.tagIndex !== undefined) {
          newParts.push(part);
        } else {
          const segments = part.text.split(tag.value);
          segments.forEach((seg, sIdx) => {
            if (sIdx > 0) {
              newParts.push({ text: tag.value, tagIndex: idx });
            }
            if (seg) {
              newParts.push({ text: seg });
            }
          });
        }
      });
      parts = newParts;
    });

    return parts.map((p, pIdx) => {
      if (p.tagIndex !== undefined) {
        const matchedTag = sortedTags[p.tagIndex];
        return <span key={pIdx} className={matchedTag.color}>{p.text}</span>;
      }
      return <span key={pIdx}>{p.text}</span>;
    });
  };

  const handleDownloadImage = () => {
    if (!selectedImage) return;
    const link = document.createElement('a');
    link.href = selectedImage;
    link.download = `order-${order?.orderNumber || 'image'}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async () => {
    if (!selectedImage) return;
    try {
      // For Capacitor Mobile, we must save the file first then share it
      const fileName = `order-${order?.orderNumber || 'image'}-${Date.now()}.jpg`;
      
      // selectedImage is base64
      const result = await Filesystem.writeFile({
        path: fileName,
        data: selectedImage,
        directory: Directory.Cache,
      });

      await CapacitorShare.share({
        title: 'صورة طلب',
        text: `طلب رقم ${order?.orderNumber}`,
        url: result.uri,
      });
    } catch (err) {
      console.error('Share error:', err);
      // Fallback for web if needed
      if (navigator.share) {
        try {
          const res = await fetch(selectedImage);
          const blob = await res.blob();
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
               files: [file],
               title: 'صورة طلب',
               text: `طلب رقم ${order?.orderNumber}`,
             });
             return;
          }
        } catch (e) {}
      }
      showToast({ message: 'تعذر تنفيذ المشاركة على هذا الجهاز', type: 'error' });
    }
  };

  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0 && invoice) {
      const newPaid = invoice.amountPaid + amount;
      const newRem = invoice.totalAmount - newPaid;
      const updatedInvoice = { 
        ...invoice, 
        amountPaid: newPaid, 
        remainingAmount: newRem < 0 ? 0 : newRem,
        status: newRem <= 0 ? 'paid' : 'partial',
        payments: [...(invoice.payments || []), { id: Date.now().toString(), amount, date: new Date().toISOString(), method: 'cash' }]
      };
      db.saveInvoice(updatedInvoice as any);
      setInvoice(updatedInvoice as any);
      showToast({ message: 'تم تسجيل الدفعة بنجاح', type: 'success' });
      setShowPaymentModal(false);
      setPaymentAmount('');
    } else {
       showToast({ message: 'مبلغ غير صحيح', type: 'error' });
    }
  };

  useEffect(() => {
    if (id) {
      const o = db.getOrders().find(o => o.id === id);
      if (o) {
        // Enforce safe measurements object
        if (!o.measurements) {
          o.measurements = {};
        }
        
        // Enforce safe costs object
        if (!o.costs) {
          const oldCosts = (o as any).costDetails || {};
          o.costs = {
            fields: {
              profit: oldCosts.totalCost || o.finalPrice || (o as any).totalAmount || 0
            },
            taxRate: 0,
            totalPriceOverride: o.finalPrice || (o as any).totalAmount || 0
          };
          o.finalPrice = o.finalPrice || (o as any).totalAmount || 0;
          o.totalCost = o.totalCost || (o as any).totalAmount || 0;
          db.saveOrder(o);
        }

        setOrder(o);
        setCustomer(db.getCustomers().find(c => c.id === o.customerId) || null);
        
        let inv = db.getInvoices().find(i => i.orderId === o.id);
        if (!inv) {
          // Auto-create missing invoice on the fly
          const finalPrice = o.finalPrice || (o as any).totalAmount || 0;
          inv = {
            id: generateId(),
            invoiceNumber: `INV-${o.orderNumber ? o.orderNumber.split('-')[1] || Math.floor(1000 + Math.random() * 9000) : Math.floor(1000 + Math.random() * 9000)}`,
            orderId: o.id,
            customerId: o.customerId,
            createdAt: o.createdAt || new Date().toISOString(),
            totalAmount: finalPrice,
            amountPaid: 0,
            remainingAmount: finalPrice,
            status: 'unpaid',
            payments: []
          };
          db.saveInvoice(inv);
        }
        setInvoice(inv);
      }
    }

    const storedFields = localStorage.getItem('khayatpro_setting_cost_fields');
    if (storedFields) {
      try { setCostFieldsSettings(JSON.parse(storedFields)); } catch (e) {}
    }
  }, [id]);

  if (!order || !customer) return <div className="p-8 text-center text-gray-500 text-sm">جاري التحميل...</div>;

  const handleStatusChange = (newStatus: Order['status']) => {
    order.status = newStatus;
    db.saveOrder(order);
    setOrder({ ...order }); // force re-render
  };

  const loadAndRenderTemplate = (type: string, templatesList: CustomTemplate[] = customTemplates) => {
    if (!order || !customer) return;
    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const remaining = invoice ? invoice.remainingAmount : 0;
    const deposit = invoice ? (invoice.totalAmount - invoice.remainingAmount) : 0;

    let templateBody = '';
    if (type === 'ready') {
      templateBody = localStorage.getItem('khayatpro_setting_template_ready') || localStorage.getItem('khayatpro_setting_whatsapp_template') || 'مرحباً {title} {customer}،\n\nنخبركم بكل سرور وسعادة بأن طلبكم ({attire}) ذي الرقم {order_number} أصبح جاهزاً بالكامل للتسليم في ورشتنا ({shop_name})! ✨\n\n💵 الباقي استخلاصه: {remaining_amount}\n\nيسعدنا دائماً استقبالكم ومرحباً بكم في أي وقت!';
    } else if (type === 'confirmed') {
      templateBody = localStorage.getItem('khayatpro_setting_template_confirmed') || 'مرحباً {title} {customer}،\n\nنؤكد لكم استلام طلبكم في ورشتنا ({shop_name}) لتفصيل ({attire}) ذي الرقم {order_number} بنجاح. 🪡\n\n💵 عربون الدفع: {deposit_amount}\n💵 الباقي استخلاصه: {remaining_amount}\n\nشكراً لثقتكم الغالية بنا ونعمل جاهدين ليكون اللباس في أبهى حلة! ✨';
    } else if (type === 'payment') {
      templateBody = localStorage.getItem('khayatpro_setting_template_payment') || 'مرحباً {title} {customer}،\n\nتذكير رقيق من ({shop_name}) بخصوص طلبكم ({attire}) رقم {order_number}.\n\n💵 الباقي استخلاصه: {remaining_amount}\n\nنشكركم جزيلاً ويسعدنا دائماً خدمتكم!';
    } else if (type === 'greeting') {
      templateBody = localStorage.getItem('khayatpro_setting_template_greeting') || 'عزيزنا العميل {customer}،\n\nأتيلييه {shop_name} يهنئكم بمناسبة قدوم المناسبة السعيدة! كل عام وأنتم بألف خير، ويسعدنا دائماً تزيين إطلالتكم الفاخرة. 🌙✨';
    } else {
      const found = templatesList.find(t => t.id === type);
      templateBody = found ? found.body : '';
    }

    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const attireName = db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType;

    const renderedText = templateBody
      .replace(/{customer}/g, customer.fullName)
      .replace(/{title}/g, title)
      .replace(/{dear}/g, dear)
      .replace(/{attire}/g, attireName)
      .replace(/{order_number}/g, order.orderNumber)
      .replace(/{remaining_amount}/g, formatCurrency(remaining))
      .replace(/{deposit_amount}/g, formatCurrency(deposit))
      .replace(/{shop_name}/g, shopName);

    setCustomMsgText(renderedText);
    setSelectedMsgType(type);
  };

  const openMessagingModal = () => {
    let latestCustom: CustomTemplate[] = [];
    const storedCustom = localStorage.getItem('khayatpro_setting_custom_templates');
    if (storedCustom) {
      try {
        latestCustom = JSON.parse(storedCustom);
        setCustomTemplates(latestCustom);
      } catch (e) {
        console.error('Error parsing custom templates', e);
      }
    }
    const defaultType = order?.status === 'ready' ? 'ready' : 'confirmed';
    loadAndRenderTemplate(defaultType, latestCustom);
    setShowMsgModal(true);
  };

  const handleSendWhatsApp = () => {
    if (!customer) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMsgText)}`;
    window.open(url, '_blank');
    setShowMsgModal(false);
    showToast({ message: 'تم فتح واتساب لإرسال الإشعار بنجاح!', type: 'success' });
  };

  const handleSendSMS = () => {
    if (!customer) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const url = `sms:${cleanPhone}?body=${encodeURIComponent(customMsgText)}`;
    window.open(url, '_blank');
    setShowMsgModal(false);
    showToast({ message: 'تم تحضير الرسالة النصية القصيرة بنجاح!', type: 'success' });
  };

  const shareWhatsApp = () => {
    openMessagingModal();
  };

  const handlePrint = (mode: 'thermal' | 'a4') => {
    navigate(`/invoice/${invoice?.id}?mode=${mode}`);
  };

  const handleMaterialsToggle = () => {
    if (!order) return;
    const updatedOrder = { ...order, materialsPurchased: !order.materialsPurchased };
    db.saveOrder(updatedOrder);
    setOrder(updatedOrder);
    showToast({ message: updatedOrder.materialsPurchased ? 'تم تحديد المستلزمات كمُشتراة' : 'تم إلغاء تحديد المستلزمات', type: 'success' });
  };

  const handleDelete = async () => {
    // Re-fetch order from DB to ensure fields are fresh
    const freshOrder = db.getOrders(true).find(o => o.id === order?.id);
    if (!freshOrder) return;
    
    const currInvoice = db.getInvoices(true).find(i => i.orderId === freshOrder.id);
    const hasPayments = currInvoice && currInvoice.amountPaid > 0;
    
    let message = 'هل أنت متأكد من رغبتك في أرشفة وإلغاء هذا الطلب؟ سيتم خصم مبلغه المتبقي من ديون العميل.';
    if (hasPayments) {
      message += `\n\nتنبيه: هذا الطلب يحتوي على دفعات مسبقة بقيمة ${currInvoice.amountPaid}. أرشفتك للطلب ستخفي هذه الدفعة من السجلات، يرجى الاستمرار إذا كنت متأكداً فقط.`;
    }
    if (freshOrder.isSubscription && freshOrder.subscriptionId) {
      message += '\n\nملاحظة: هذا الطلب ناتج عن اشتراك دوري. أرشفتك للطلب لن توقف الاشتراك التلقائياً (يمكنك إيقافه من الاشتراكات).';
    }

    const confirmed = await confirm({
      title: 'أرشفة الطلب وإلغاء الدين',
      message: message,
      confirmText: 'نعم، أرشفة وإلغاء المتبقي',
      cancelText: 'إلغاء',
      isDestructive: true
    });
    
    if (confirmed) {
       db.archiveOrderAndInvoices(freshOrder.id);
       
       showToast({ message: 'تم أرشفة الطلب وتحديث سجل الديون' });
       navigate('/orders');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/orders')} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-primary-800">تفاصيل الطلب</h2>
            <p className="text-xs text-gray-500 font-mono" dir="ltr">{order.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} className="bg-red-50 text-red-600 p-2 rounded-xl flex items-center justify-center hover:bg-red-100 transition">
             <Trash2 className="w-5 h-5" />
          </button>
          <Link to={`/orders/${order.id}/edit`} className="bg-primary-50 text-primary-700 p-2 rounded-xl flex items-center justify-center">
             <Edit3 className="w-5 h-5" />
          </Link>
        </div>
      </div>

       {/* Status Progress */}
       <div className="bg-white p-4 items-center rounded-2xl shadow-sm border border-gray-100">
          <label className="text-xs font-bold text-gray-500 mb-2 block">حالة الطلب:</label>
          <div className="flex gap-2">
             {[
               { id: 'new', label: 'جديد' },
               { id: 'in_progress', label: 'قيد العمل' },
               { id: 'ready', label: 'جاهز' },
               { id: 'delivered', label: 'سُلم' }
             ].map(s => (
               <button 
                 key={s.id}
                 onClick={() => handleStatusChange(s.id as any)}
                 className={clsx(
                   "flex-1 py-2 text-xs font-bold rounded-lg transition border",
                   order.status === s.id 
                     ? "bg-primary-800 text-white border-primary-800 shadow-sm transform scale-[1.02]" 
                     : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                 )}
               >
                 {s.label}
               </button>
             ))}
          </div>
       </div>

       {/* Materials Status Toggle */}
       <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className={clsx("p-2.5 rounded-xl", order.materialsPurchased ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
             <ShoppingBag className="w-5 h-5" />
           </div>
           <div>
             <p className="font-bold text-gray-800 text-sm">شراء المستلزمات والقماش</p>
             <p className="text-xs text-gray-500">{order.materialsPurchased ? 'تم شراء المستلزمات المطلوبة لهذا الطلب' : 'لم يتم شراء المستلزمات بعد'}</p>
           </div>
         </div>
         <button 
            onClick={handleMaterialsToggle}
            className={clsx(
              "relative w-14 h-8 rounded-full transition-colors",
              order.materialsPurchased ? "bg-green-500" : "bg-gray-300"
            )}
          >
            <span className={clsx(
              "absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm",
              order.materialsPurchased ? "left-1" : "right-1"
            )}></span>
          </button>
       </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1">
           <p className="text-xs text-gray-500">العميل</p>
           <p className="font-bold text-gray-800">{customer.fullName}</p>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1">
           <p className="text-xs text-gray-500">النوع</p>
           <p className="font-bold text-gray-800">{db.getAttireTemplates().find(t => t.id === order.attireType)?.name || order.attireType}</p>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1 col-span-2">
           <p className="text-xs text-gray-500 border-b border-gray-100 pb-2 mb-2">الوصف</p>
           <p className="text-sm text-gray-800 leading-relaxed">{order.description || 'لا يوجد وصف.'}</p>
         </div>
      </div>

      {/* Invoice & Actions Quick Card */}
      <div className="bg-primary-900 rounded-2xl shadow-lg p-5 text-white flex flex-col gap-4 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-32 h-32 bg-primary-800 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 opacity-70"></div>
         
         {/* Detailed Breakdown for the Tailor */}
         {order.costs && (order.costs as any).fields && (
             <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] bg-white/5 p-3 rounded-xl border border-white/10 mb-1">
                {Object.entries((order.costs as any).fields).map(([fid, val]) => {
                   const setting = costFieldsSettings.find(f => f.id === fid);
                   if (!setting || (val as number) === 0) return null;
                   return (
                     <div key={fid} className="flex justify-between border-b border-white/5 pb-1 last:border-0">
                        <span className="text-primary-300 font-bold">{setting.label}:</span>
                        <span className="font-mono font-black text-white">{formatCurrency(val as number)}</span>
                     </div>
                   );
                })}
             </div>
          )}

         <div className="relative z-10 flex justify-between items-end">
            <div>
              <p className="text-primary-200 text-sm mb-1">المبلغ الإجمالي</p>
              <h3 className="text-2xl font-bold tracking-tight" dir="ltr">{formatCurrency(invoice?.totalAmount || 0)}</h3>
            </div>
            <div className="text-right">
              <p className="text-primary-200 text-sm mb-1">الباقي أداؤه</p>
              <h3 className="text-lg font-bold text-accent-400" dir="ltr">{formatCurrency(invoice?.remainingAmount || 0)}</h3>
            </div>
         </div>

         <div className="relative z-10 flex gap-2">
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-accent-500 hover:bg-accent-600 transition flex-1 py-3 text-white font-bold rounded-xl shadow-md text-sm"
            >
              تسجيل دفعة جديدة
            </button>
         </div>

         <div className="relative z-10 grid grid-cols-3 gap-2 mt-2">
            <button onClick={() => handlePrint('a4')} className="bg-white/10 hover:bg-white/20 transition py-2 rounded-xl flex flex-col items-center justify-center gap-1">
              <Printer className="w-5 h-5 text-white" />
              <span className="text-[10px]">فاتورة A4</span>
            </button>
            <button onClick={() => handlePrint('thermal')} className="bg-white/10 hover:bg-white/20 transition py-2 rounded-xl flex flex-col items-center justify-center gap-1">
              <PrinterThermal className="w-5 h-5 text-white" />
              <span className="text-[10px]">وصل حراري</span>
            </button>
            <button onClick={openMessagingModal} className="bg-indigo-600 hover:bg-indigo-500 transition py-2 rounded-xl flex flex-col items-center justify-center gap-1 shadow-md shadow-indigo-900/40">
              <MessageSquare className="w-5 h-5 text-white" />
              <span className="text-[10px] font-bold">مراسلة وإشعار</span>
            </button>
         </div>
      </div>

      {invoice?.payments && invoice.payments.length > 0 && (
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">سجل الدفعات</h3>
           <div className="space-y-2">
              {invoice.payments.map(p => (
                 <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0 last:pb-0">
                    <span className="text-gray-500 text-xs">{formatDate(p.date)}</span>
                    <span className="font-mono font-bold text-green-600" dir="ltr">+{p.amount.toFixed(2)} MAD</span>
                 </div>
              ))}
           </div>
         </div>
      )}

      {/* Measurements Snapshot */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
         <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">قياسات الطلب</h3>
         <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {Object.entries(order.measurements).filter(([k]) => k !== 'custom_notes').map(([key, val]) => (
              <div key={key} className="flex justify-between items-end border-b border-gray-50 pb-1">
                 <span className="text-xs text-gray-500">{key}</span>
                 <span className="font-mono font-bold text-gray-800 text-sm">{val} <span className="text-[10px] text-gray-400 font-normal">cm</span></span>
              </div>
            ))}
         </div>
      </div>

      {order.referenceImages && order.referenceImages.length > 0 && (
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">صور طلب العميل (المرجع)</h3>
           <div className="flex gap-2 overflow-x-auto pb-2">
             {order.referenceImages.map((src, i) => (
               <button key={i} onClick={() => setSelectedImage(src)} className="flex-shrink-0">
                 <img src={src} className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
               </button>
             ))}
           </div>
         </div>
      )}

      {order.resultImages && order.resultImages.length > 0 && (
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">صور العمل المنجز</h3>
           <div className="flex gap-2 overflow-x-auto pb-2">
             {order.resultImages.map((src, i) => (
               <button key={i} onClick={() => setSelectedImage(src)} className="flex-shrink-0">
                 <img src={src} className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
               </button>
             ))}
           </div>
         </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
             <h3 className="text-lg font-bold text-gray-900 mb-2">تسجيل دفعة جديدة</h3>
             <p className="text-sm text-gray-500 mb-6">المتبقي: <span className="font-bold text-red-600" dir="ltr">{formatCurrency(invoice?.remainingAmount || 0)}</span></p>
             <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-600">المبلغ المؤدى (درهم)</label>
                      <button 
                        type="button" 
                        onClick={() => setPaymentAmount(invoice?.remainingAmount.toString() || '')}
                        className="text-[10px] bg-primary-100 text-primary-800 px-2.5 py-1 rounded-lg font-bold hover:bg-primary-200 transition-colors"
                      >
                        دفع المبلغ كاملاً
                      </button>
                   </div>
                   <input 
                     type="number" 
                     autoFocus
                     min="0.01" 
                     step="0.01"
                     max={invoice?.remainingAmount}
                     required
                     value={paymentAmount}
                     onChange={(e) => setPaymentAmount(e.target.value)}
                     className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary-500 font-mono text-lg text-left" 
                     dir="ltr"
                     placeholder="0.00"
                   />
                </div>
                <div className="flex gap-2 pt-2">
                   <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition">إلغاء</button>
                   <button type="submit" className="flex-1 py-3 bg-primary-800 hover:bg-primary-900 text-white font-bold rounded-xl shadow-md transition">تأكيد الدفع</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedImage(null)}>
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 relative z-10">
            <button 
               onClick={() => setSelectedImage(null)}
               className="p-3 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors"
            >
               <ArrowRight className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              <button 
                 onClick={(e) => { e.stopPropagation(); handleShareImage(); }}
                 className="p-3 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors flex items-center gap-2 px-4 text-sm font-bold"
              >
                 <Share className="w-5 h-5" />
                 <span>مشاركة</span>
              </button>
              <button 
                 onClick={(e) => { e.stopPropagation(); handleDownloadImage(); }}
                 className="p-3 text-white bg-primary-600 hover:bg-primary-500 rounded-full transition-colors flex items-center gap-2 px-4 shadow-lg shadow-primary-900/40 text-sm font-bold"
              >
                 <Download className="w-5 h-5" />
                 <span>تحميل</span>
              </button>
            </div>
          </div>
          <div className="relative max-w-4xl w-full flex-1 flex items-center justify-center pointer-events-none">
             <img 
               src={selectedImage} 
               className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl pointer-events-auto transition-transform duration-300" 
               onClick={(e) => e.stopPropagation()}
             />
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {showMsgModal && customer && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center" dir="rtl">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-right my-4 flex flex-col gap-4 border border-gray-100">
             {/* Close Button */}
             <button 
               onClick={() => setShowMsgModal(false)}
               className="absolute top-4 left-4 p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition cursor-pointer"
             >
               <X className="w-4 h-4" />
             </button>

             <div className="flex items-center gap-3 mb-1">
               <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-700 shadow-4xs">
                 <Smartphone className="w-6 h-6 stroke-[2.2]" />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-800">تفاصيل إشعار ومراسلة الزبون</h3>
                  <p className="text-xs text-gray-400">تحضير القوالب مسبقاً وإرسالها بلمسة نقرة سريعة</p>
               </div>
             </div>

             {/* Customers Quick Info Snapshot */}
             <div className="bg-slate-50 border border-gray-100 p-3 rounded-2xl flex justify-between items-center text-xs">
                <div>
                   <span className="text-gray-400 block text-[9px] mb-0.5">الزبون المستلم</span>
                   <span className="font-extrabold text-slate-700">{customer.fullName} ({customer.phone})</span>
                </div>
                <div className="text-left">
                   <span className="text-gray-400 block text-[9px] mb-0.5">رقم الطلب</span>
                   <span className="font-mono font-bold text-slate-700">#{order?.orderNumber}</span>
                </div>
             </div>

             {/* Template Selectors */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-black text-gray-500 block pb-1 border-b border-gray-50 text-right">اختر نوع قوالب المراسلة المتاحة:</label>
               <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => loadAndRenderTemplate('ready')}
                    className={clsx(
                      "p-2 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1 border cursor-pointer",
                      selectedMsgType === 'ready' 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-250 shadow-4xs" 
                        : "bg-white text-gray-600 border-gray-150 hover:bg-slate-50"
                    )}
                  >
                    <span>👗 جاهز للتسليم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadAndRenderTemplate('confirmed')}
                    className={clsx(
                      "p-2 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1 border cursor-pointer",
                      selectedMsgType === 'confirmed' 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-250 shadow-4xs" 
                        : "bg-white text-gray-600 border-gray-150 hover:bg-slate-50"
                    )}
                  >
                    <span>🪡 حجز وتأكيد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadAndRenderTemplate('payment')}
                    className={clsx(
                      "p-2 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1 border cursor-pointer",
                      selectedMsgType === 'payment' 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-250 shadow-4xs" 
                        : "bg-white text-gray-600 border-gray-150 hover:bg-slate-50"
                    )}
                  >
                    <span>💵 تذكير بالمتبقي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadAndRenderTemplate('greeting')}
                    className={clsx(
                      "p-2 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1 border cursor-pointer",
                      selectedMsgType === 'greeting' 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-250 shadow-4xs" 
                        : "bg-white text-gray-600 border-gray-150 hover:bg-slate-50"
                    )}
                  >
                    <span>🌙 تهنئة ومناسبات</span>
                  </button>

                  {/* Custom User-Added Templates */}
                  {customTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => loadAndRenderTemplate(tpl.id)}
                      className={clsx(
                        "p-2 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1 border cursor-pointer truncate",
                        selectedMsgType === tpl.id 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-250 shadow-4xs" 
                          : "bg-white text-gray-600 border-gray-150 hover:bg-slate-50"
                      )}
                      title={tpl.name}
                    >
                      <span>📝 {tpl.name}</span>
                    </button>
                  ))}
               </div>
             </div>

             {/* Message Content Editable Textbox */}
             <div className="space-y-1.5 text-right">
               <div className="flex justify-between items-center">
                 <span className="text-[9px] text-gray-400 font-mono font-bold" dir="ltr">حروف: {customMsgText.length}</span>
                 <label className="text-xs font-black text-gray-500 block">معاينة وتخصيص نص الرسالة يدوياً:</label>
               </div>

               <div className="bg-slate-50 border border-gray-100 p-2.5 rounded-xl mb-1 text-right">
                 <span className="text-[10px] font-bold text-gray-500 block mb-1.5">💡 إدراج بيانات الطلب فوراً عند موضع المؤشر:</span>
                 <div className="flex flex-wrap gap-1.5 text-indigo-800 justify-start" dir="rtl">
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{customer}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="اسم الزبون الكامل"
                   >
                     👤 اسم الزبون
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{title}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="اللقب التقديري"
                   >
                     👑 اللقب
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{dear}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="صيغة مودة ترحيبية"
                   >
                     🌸 عزيزنا
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{attire}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="نوع وتفاصيل الفستان/اللباس"
                   >
                     👗 اللباس
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{order_number}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="رقم الطلب"
                   >
                     #⃣ رقم الطلب
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{remaining_amount}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="المبلغ المتبقي"
                   >
                     💵 متبقي الدفع
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{deposit_amount}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="مبلغ العربون"
                   >
                     💰 العربون
                   </button>
                   <button
                     type="button"
                     onClick={() => insertRealValueAtCursor("{shop_name}")}
                     className="bg-white border border-gray-200 hover:bg-indigo-50 active:scale-95 transition-all text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-sans cursor-pointer font-extrabold"
                     title="اسم الورشة"
                   >
                     🏢 اسم الورشة
                   </button>
                 </div>
               </div>

               <textarea
                 ref={msgTextareaRef}
                 rows={4}
                 value={customMsgText}
                 onChange={(e) => setCustomMsgText(e.target.value)}
                 className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed text-right font-sans"
               />
             </div>

             {/* Live Styled Visual Preview (Variables Colored) */}
             <div className="space-y-1.5 text-right">
               <label className="text-xs font-black text-gray-500 block">👁️ معاينة شكل الرسالة الملوّنة (تلوين البيانات المدمجة تلقائياً):</label>
               <div 
                 className="rounded-2xl p-4 bg-[#efeae2] border border-gray-200 shadow-inner relative overflow-hidden" 
                 style={{
                   backgroundImage: 'radial-gradient(circle, #e5ddd5 10%, transparent 11%)',
                   backgroundSize: '12px 12px'
                 }}
               >
                 <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-100 inline-flex items-center gap-1 float-left shadow-2xs">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   <span>تلوين معاينة البيانات</span>
                 </div>
                 <div className="clear-both"></div>
                 
                 {/* WhatsApp speech bubble */}
                 <div className="bg-[#d9fdd3] text-gray-800 p-3 rounded-2xl rounded-tr-none shadow-xs text-xs font-bold leading-relaxed relative max-w-[95%] mr-auto text-right border border-[#bae4b3] mt-2">
                   {/* Speech bubble tail */}
                   <div className="absolute top-0 -right-2 w-3 h-3 bg-[#d9fdd3] border-t border-[#bae4b3] rotate-45" style={{ borderRightWidth: '1px', borderRightColor: '#bae4b3' }}></div>
                   <div className="whitespace-pre-wrap leading-relaxed tag-highlighted-content">
                      {renderHighlightedMsg(customMsgText)}
                   </div>
                   <div className="text-left text-[9px] text-gray-400 mt-1 font-mono font-normal">
                     {new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })} ✓✓
                   </div>
                 </div>
               </div>
             </div>

             {/* Quick sending triggers */}
             <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  dir="rtl"
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مراسلة عبر واتساب</span>
                </button>
                <button
                  dir="rtl"
                  type="button"
                  onClick={handleSendSMS}
                  className="py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>إرسال رسالة SMS</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
