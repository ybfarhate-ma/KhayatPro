import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { Customer, Order, CustomerMeasurementProfile, Invoice, CustomTemplate, Subscription } from '../types';
import { getSubscriptions, saveSubscription, archiveSubscription, getNextDeliveryDate, calculateNextDate, chargeSubscriptionPeriod, unarchiveSubscription } from '../lib/subscriptions';
import { ArrowLeft, User, Phone, MapPin, Grid, Scissors, Wallet, CreditCard, PhoneCall, MessageCircle, Copy, Check, Calendar, Award, MessageSquare, X, Smartphone, RefreshCw, Plus, AlertTriangle, Trash2, Play, Pause, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';
import InteractiveMannequin from '../components/Mannequin';
import { formatCurrency, generateId, formatDate } from '../lib/utils';
import { useUI } from '../store/ui';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, confirm } = useUI();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<CustomerMeasurementProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [customerSubscriptions, setCustomerSubscriptions] = useState<Subscription[]>([]);
  const [showArchivedSubs, setShowArchivedSubs] = useState(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);
  const [immediatelyChargeToDues, setImmediatelyChargeToDues] = useState(false);
  const [showMeasurementsArchive, setShowMeasurementsArchive] = useState(false);
  const [newSubForm, setNewSubForm] = useState<Partial<Subscription>>({ 
    frequency: 'monthly', 
    amount: 0, 
    itemPrice: 0,
    quantity: 1,
    status: 'active', 
    attireType: 'اشتراك تلقائي',
    isAutoCharge: true,
    startDate: new Date().toISOString().split('T')[0]
  });
  const [selectedTab, setSelectedTab] = useState<'individual' | 'bulk'>('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (id) {
      const cust = db.getCustomers().find(c => c.id === id) || null;
      setCustomer(cust);
      setOrders(db.getOrders(true).filter(o => o.customerId === id && (!o.isArchived || showArchivedSubs)));
      setInvoices(db.getInvoices(true).filter(i => i.customerId === id && (!i.isArchived || showArchivedSubs)));
      
      const allSubs = getSubscriptions(showArchivedSubs);
      setCustomerSubscriptions(allSubs.filter(s => s.customerId === id));
      
      if (cust) {
        setNewSubForm(prev => ({...prev, customerId: cust.id, customerName: cust.fullName}));
      }

      const custProfiles = db.getMeasurementProfiles(id);
      setProfiles(custProfiles);
      if (custProfiles.length > 0) {
        setActiveProfileTab(custProfiles[0].attireType);
      }
    }
  }, [id, showArchivedSubs]);

  const handleDeleteCustomerOrder = async (o: Order) => {
    const freshOrder = db.getOrders(true).find(ord => ord.id === o.id);
    if (!freshOrder) return;

    const invoice = db.getInvoices(true).find(i => i.orderId === freshOrder.id);
    const hasPayments = invoice && invoice.amountPaid > 0;
    
    let message = 'هل أنت متأكد من رغبتك في أرشفة وإلغاء هذا الطلب؟ سيتم خصم مبلغه المتبقي من ديون العميل.';
    if (hasPayments) {
      message += `\n\nتنبيه: هذا الطلب يحتوي على دفعات مسبقة مستلمة بقيمة ${invoice.amountPaid}. أرشفته ستخفي هذه الدفعة من السجلات، يرجى الاستمرار إذا كنت متأكداً فقط.`;
    }
    if (freshOrder.isSubscription && freshOrder.subscriptionId) {
      message += '\n\nملاحظة: هذا الطلب ناتج عن اشتراك دوري. أرشفتك للطلب لن توقف الاشتراك تلقائياً.';
    }

    const confirmed = await confirm({
      title: 'أرشفة الطلب',
      message: message,
      confirmText: 'نعم، أرشفة الطلب وإلغاء متبقي الدين',
      cancelText: 'إلغاء',
      isDestructive: true
    });
    
    if (confirmed) {
       db.archiveOrderAndInvoices(freshOrder.id);
       if (id) {
         setOrders(db.getOrders(true).filter(a => a.customerId === id && (!a.isArchived || showArchivedSubs)));
         setInvoices(db.getInvoices(true).filter(i => i.customerId === id && (!i.isArchived || showArchivedSubs)));
       }
       showToast({ message: 'تم أرشفة الطلب وتحديث السجل المالي' });
    }
  };

  // Messaging Modal States
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [selectedMsgType, setSelectedMsgType] = useState<string>('ready');
  const [customMsgText, setCustomMsgText] = useState('');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [selectedOrderForMsg, setSelectedOrderForMsg] = useState<Order | null>(null);

  const msgTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (!customer) return <div className="p-4">Customer not found</div>;

  const activeProfile = profiles.find(p => p.attireType === activeProfileTab);
  const allInvoices = db.getInvoices(true).filter(i => i.customerId === id);
  const totalOutstanding = allInvoices.filter(i => !i.isArchived).reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const totalPaid = allInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'ع';
    if (parts.length === 1) return parts[0].slice(0, 2);
    // Grab first letter of first and last name
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  };

  const getWhatsAppLink = (phone: string) => {
    let cleaned = phone.replace(/\s+/g, '').replace(/[-+()]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '212' + cleaned.slice(1);
    } else if (!cleaned.startsWith('212') && cleaned.length === 9) {
      cleaned = '212' + cleaned;
    }
    return `https://wa.me/${cleaned}`;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(customer.phone);
    setCopied(true);
    showToast({ message: 'تم نسخ رقم الهاتف بنجاح!', type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const insertRealValueAtCursor = (variableKey: string) => {
    const el = msgTextareaRef.current;
    if (!el || !customer) return;

    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const associatedInvoice = selectedOrderForMsg ? (db.getInvoices().find(i => i.orderId === selectedOrderForMsg.id) || null) : null;
    const remaining = associatedInvoice ? associatedInvoice.remainingAmount : 0;
    const deposit = associatedInvoice ? (associatedInvoice.totalAmount - associatedInvoice.remainingAmount) : 0;
    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const attireName = selectedOrderForMsg ? (db.getAttireTemplates().find(t => t.id === selectedOrderForMsg.attireType)?.name || selectedOrderForMsg.attireType) : 'الملابس';

    let realVal = '';
    switch (variableKey) {
      case '{customer}': realVal = customer.fullName; break;
      case '{title}': realVal = title; break;
      case '{dear}': realVal = dear; break;
      case '{attire}': realVal = attireName; break;
      case '{order_number}': realVal = selectedOrderForMsg ? selectedOrderForMsg.orderNumber : 'N/A'; break;
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
    if (!customer) return text;
    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const associatedInvoice = selectedOrderForMsg ? (db.getInvoices().find(i => i.orderId === selectedOrderForMsg.id) || null) : null;
    const remaining = associatedInvoice ? associatedInvoice.remainingAmount : 0;
    const deposit = associatedInvoice ? (associatedInvoice.totalAmount - associatedInvoice.remainingAmount) : 0;
    const title = customer.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
    const dear = customer.gender === 'female' ? 'عزيزتنا' : 'عزيزنا';
    const attireName = selectedOrderForMsg ? (db.getAttireTemplates().find(t => t.id === selectedOrderForMsg.attireType)?.name || selectedOrderForMsg.attireType) : 'الملابس';
    const remainingAmountStr = formatCurrency(remaining);
    const depositAmountStr = formatCurrency(deposit);
    const orderNumber = selectedOrderForMsg ? selectedOrderForMsg.orderNumber : '';

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

  const loadAndRenderTemplate = (type: string, templatesList: CustomTemplate[] = customTemplates, targetOrder = selectedOrderForMsg) => {
    if (!customer) return;
    const shopName = localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة';
    const associatedInvoice = targetOrder ? (db.getInvoices().find(i => i.orderId === targetOrder.id) || null) : null;
    const remaining = associatedInvoice ? associatedInvoice.remainingAmount : 0;
    const deposit = associatedInvoice ? (associatedInvoice.totalAmount - associatedInvoice.remainingAmount) : 0;

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
    const attireName = targetOrder ? (db.getAttireTemplates().find(t => t.id === targetOrder.attireType)?.name || targetOrder.attireType) : 'الملابس';

    const renderedText = templateBody
      .replace(/{customer}/g, customer.fullName)
      .replace(/{title}/g, title)
      .replace(/{dear}/g, dear)
      .replace(/{attire}/g, attireName)
      .replace(/{order_number}/g, targetOrder ? targetOrder.orderNumber : 'N/A')
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

    const activeOrders = db.getOrders().filter(o => o.customerId === id);
    const defaultOrder = activeOrders.length > 0 ? activeOrders[0] : null;
    setSelectedOrderForMsg(defaultOrder);

    const defaultType = defaultOrder?.status === 'ready' ? 'ready' : 'confirmed';
    loadAndRenderTemplate(defaultType, latestCustom, defaultOrder);
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header Profile Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white text-center shadow-lg relative overflow-hidden border border-slate-800" dir="rtl">
         {/* Premium background mesh lights */}
         <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-505/10 rounded-full blur-3xl pointer-events-none" />
         <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-505/10 rounded-full blur-3xl pointer-events-none" />

         <button onClick={() => navigate(-1)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white/90 shadow-2xs">
           <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
         </button>

         {/* VIP Distinction badge */}
         <div className="absolute top-4 left-4">
           {customer.gender === 'female' ? (
             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wide bg-pink-500/10 text-pink-300 border border-pink-500/20 shadow-4xs">
               <span className="w-1 h-1 rounded-full bg-pink-400 animate-pulse" />
               <span>زبونة مميزة</span>
             </span>
           ) : (
             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wide bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-4xs">
               <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
               <span>زبون مميز</span>
             </span>
           )}
         </div>
         
         {/* Monogram / Luxury Initial Medallion */}
         <div className="relative w-20 h-20 mx-auto mb-4 group">
            <div className={clsx(
              "absolute inset-0 rounded-2xl opacity-25 blur-md transition duration-500 group-hover:scale-110",
              customer.gender === 'female' ? "bg-pink-500" : "bg-amber-500"
            )} />
            <div className={clsx(
              "w-20 h-20 rounded-2xl border mx-auto flex flex-col items-center justify-center backdrop-blur-md relative transform transition duration-300 hover:rotate-3 shadow-inner",
              customer.gender === 'female' 
                ? "border-pink-500/30 bg-gradient-to-tr from-pink-950/40 to-slate-900/80" 
                : "border-amber-500/30 bg-gradient-to-tr from-amber-950/40 to-slate-900/80"
            )}>
               <span className={clsx(
                 "text-2xl font-black leading-none block font-mono tracking-wider",
                 customer.gender === 'female' ? "text-pink-300" : "text-amber-300"
               )}>
                 {getInitials(customer.fullName)}
               </span>
               <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-1">Haut de luxe</span>
            </div>
         </div>

         <button
           onClick={() => navigate(`/customers/edit/${customer.id}`)}
           className="group/name mx-auto flex items-center justify-center gap-2 text-2xl font-extrabold text-white hover:text-indigo-200 transition-colors duration-200 mb-1 tracking-tight cursor-pointer"
           title="تعديل بيانات الزبون"
         >
           <span>{customer.fullName}</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover/name:opacity-100 group-hover/name:translate-x-0.5 transition-all text-indigo-305"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
         </button>
         
         <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 mt-2 font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{customer.phone}</span>
            <button 
              onClick={handleCopyPhone}
              title="نسخ الرقم"
              className="p-1 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
         </div>

         {/* Quick Interactive Call / Messaging buttons - 3 matching columns */}
         <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 max-w-lg mx-auto" dir="rtl">
            <a 
              href={`tel:${customer.phone}`}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black p-2.5 sm:p-3 rounded-2xl transition shadow-3xs transform active:scale-95 text-center min-h-[54px]"
            >
              <PhoneCall size={13} className="stroke-[2.5]" />
              <span className="whitespace-nowrap">اتصال مباشر</span>
            </a>

            <a 
              href={getWhatsAppLink(customer.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black p-2.5 sm:p-3 rounded-2xl transition shadow-3xs transform active:scale-95 text-center min-h-[54px]"
            >
              <MessageCircle size={13} className="stroke-[2.5]" />
              <span className="whitespace-nowrap">واتساب سريع</span>
             </a>

             <button 
               type="button"
               onClick={openMessagingModal}
               className="flex flex-col sm:flex-row items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-[11px] font-black p-2.5 sm:p-3 rounded-2xl transition shadow-3xs transform active:scale-95 cursor-pointer text-center min-h-[54px]"
             >
               <MessageSquare size={13} className="stroke-[2.5]" />
               <span className="whitespace-nowrap">إشعار مخصص</span>
             </button>
         </div>

         {/* CRM Customer Statistics Belt */}
         <div className="grid grid-cols-3 gap-1 bg-white/5 border border-white/10 rounded-xl p-3 mt-5 backdrop-blur-xs">
            <div className="text-center space-y-1">
               <span className="block text-[8px] text-slate-400 font-extrabold">مجموع الطلبات</span>
               <div className="flex items-center justify-center gap-1 font-black text-white">
                  <Scissors size={11} className="text-indigo-405" />
                  <span className="font-mono text-xs leading-none">{orders.length}</span>
               </div>
            </div>
            
            <div className="text-center space-y-1 border-x border-white/10">
               <span className="block text-[8px] text-slate-400 font-extrabold">الديون العالقة</span>
               <div className="flex items-center justify-center gap-1 font-black">
                  <CreditCard size={11} className={totalOutstanding > 0 ? "text-orange-400" : "text-emerald-400"} />
                  <span className={clsx("font-mono text-[10px] leading-none", totalOutstanding > 0 ? "text-orange-400" : "text-emerald-300")}>
                     {totalOutstanding > 0 ? formatCurrency(totalOutstanding) : "خالص 🏆"}
                  </span>
               </div>
            </div>

            <div className="text-center space-y-1">
               <span className="block text-[8px] text-slate-400 font-extrabold">تاريخ الالتحاق</span>
               <div className="flex items-center justify-center gap-1 font-black text-white">
                  <Calendar size={11} className="text-blue-400" />
                  <span className="text-[10px] leading-none text-slate-250 font-sans">
                     {formatDate(customer.createdAt)}
                  </span>
               </div>
            </div>
         </div>
      </div>

      {/* Measurement Profiles (Tabs and Mannequin) */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
         <button 
           onClick={() => setShowMeasurementsArchive(!showMeasurementsArchive)}
           className="w-full flex items-center justify-between text-right focus:outline-none"
         >
           <div className="flex items-center gap-2">
             <Scissors className="w-4 h-4 text-indigo-500" />
             <h3 className="font-extrabold text-slate-800 text-base">أرشيف القياسات</h3>
             <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black">
               {profiles.length} قياسات
             </span>
           </div>
           <div className="p-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-800 transition">
             {showMeasurementsArchive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
           </div>
         </button>
         
         {showMeasurementsArchive && (
           <div className="pt-3 border-t border-slate-50">
             {profiles.length === 0 ? (
               <div className="text-center p-6 text-xs text-gray-400">
                 لا توجد قياسات مسجلة مسبقاً لهذا العميل.
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide border-b border-gray-50">
                   {profiles.map(p => (
                     <button 
                       key={p.id}
                       onClick={() => setActiveProfileTab(p.attireType)}
                       className={clsx(
                         "px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap",
                         activeProfileTab === p.attireType 
                           ? "bg-primary-50 text-primary-800 border border-primary-200/50" 
                           : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
                       )}
                     >
                       {db.getAttireTemplates().find(t => t.id === p.attireType)?.name || p.attireType}
                     </button>
                   ))}
                 </div>
                 
                 {activeProfile && (
                   <div className="pt-4 flex flex-col md:flex-row gap-6 items-start">
                     <div className="w-full md:w-[320px] mx-auto flex-shrink-0 order-2 md:order-1">
                        <div className="h-[500px] relative">
                          <InteractiveMannequin 
                            template={db.getAttireTemplates().find(t => t.id === activeProfile.attireType) || undefined}
                            measurements={activeProfile.measurements as any} 
                            onChange={() => {}} 
                          />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 flex-1 text-xs order-1 md:order-2 w-full">
                        {Object.entries(activeProfile.measurements).filter(([k]) => k !== 'custom_notes').map(([key, value]) => {
                          const lbl = db.getAttireTemplates().find(t => t.id === activeProfile.attireType)?.points.find(pt => pt.id === key)?.label || key;
                          return (
                            <div key={key} className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-center items-center text-center shadow-4xs">
                              <span className="block text-gray-400 text-[10px] mb-1 font-bold">{lbl}</span>
                              <div className="flex items-baseline gap-0.5">
                                <span className="font-extrabold font-mono text-gray-800 text-sm">{value}</span>
                                <span className="text-gray-400 text-[8px] font-sans">cm</span>
                              </div>
                            </div>
                          );
                        })}
                        {activeProfile.measurements.custom_notes && (
                          <div className="col-span-full mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-800">
                            <span className="font-bold block mb-1">ملاحظات إضافية:</span>
                            <p>{activeProfile.measurements.custom_notes}</p>
                          </div>
                        )}
                     </div>
                   </div>
                 )}
               </div>
             )}
           </div>
         )}
      </div>

      {/* إدارة الطلبات Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4" dir="rtl">
          <h3 className="font-extrabold text-slate-800 text-lg">إدارة الطلبات</h3>
          <button 
            onClick={() => navigate('/orders/new', { state: { selectedCustomerId: id } })}
            className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-xl mb-4" dir="rtl">
           <button onClick={() => setSelectedTab('individual')} className={clsx("flex-1 text-center py-2 text-xs font-bold transition rounded-lg", selectedTab === 'individual' ? "bg-slate-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <div className="flex items-center justify-center gap-1">
                <span>طلبات فردية</span>
                <AlertTriangle size={14} />
              </div>
           </button>
           <button onClick={() => setSelectedTab('bulk')} className={clsx("flex-1 text-center py-2 text-xs font-bold transition rounded-lg", selectedTab === 'bulk' ? "bg-slate-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <div className="flex items-center justify-center gap-1">
                <span>طلبات جملة (اشتراكات)</span>
                <Grid size={14} />
              </div>
           </button>
        </div>
        
        <input 
          type="text" 
          placeholder="ابحث باسم الطلب أو النوع..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm mb-4 text-right"
        />

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" dir="rtl">
          <button onClick={() => setSelectedStatus('all')} className={clsx("px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap", selectedStatus === 'all' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>الكل ({orders.filter(o => selectedTab === 'individual' ? !o.isSubscription : o.isSubscription).length})</button>
          <button onClick={() => setSelectedStatus('new')} className={clsx("px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap", selectedStatus === 'new' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>جديد</button>
          <button onClick={() => setSelectedStatus('in_progress')} className={clsx("px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap", selectedStatus === 'in_progress' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>قيد العمل</button>
          <button onClick={() => setSelectedStatus('ready')} className={clsx("px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap", selectedStatus === 'ready' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>جاهز</button>
          <button onClick={() => setSelectedStatus('delivered')} className={clsx("px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap", selectedStatus === 'delivered' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>مكتمل</button>
        </div>

         {orders.filter(o => {
            const matchesTab = selectedTab === 'individual' ? !o.isSubscription : o.isSubscription;
            const matchesSearch = searchTerm === '' || 
                                  o.orderNumber.includes(searchTerm) || 
                                  (db.getAttireTemplates().find(t => t.id === o.attireType)?.name || o.attireType).includes(searchTerm);
            const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
            return matchesTab && matchesSearch && matchesStatus;
         }).length === 0 ? (
            <div className="text-center p-6 bg-white border border-gray-100 rounded-2xl text-xs text-gray-400">لا توجد طلبات في هذا القسم.</div>
         ) : (
            <div className="space-y-2">
              {orders.filter(o => {
                const matchesTab = selectedTab === 'individual' ? !o.isSubscription : o.isSubscription;
                const matchesSearch = searchTerm === '' || 
                                      o.orderNumber.includes(searchTerm) || 
                                      (db.getAttireTemplates().find(t => t.id === o.attireType)?.name || o.attireType).includes(searchTerm);
                const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
                return matchesTab && matchesSearch && matchesStatus;
              }).map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-primary-300 transition">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => navigate(`/orders/${o.id}`)}>
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", o.isSubscription ? "bg-indigo-50 text-indigo-500" : "bg-gray-50 text-primary-500")}>
                      {o.isSubscription ? <Wallet className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{db.getAttireTemplates().find(t => t.id === o.attireType)?.name || o.attireType}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(o.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <span className={clsx("text-xs font-bold px-2 py-1 rounded-md", o.isSubscription ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600")}>
                        {o.isSubscription ? 'اشتراك دوري' : (o.status === 'delivered' ? 'مكتمل' : 'نشط')}
                     </span>
                     <div className="flex gap-1 ml-2">
                       <button onClick={() => navigate(`/orders/${o.id}/edit`)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                         <Edit3 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteCustomerOrder(o)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
         )}
      </div>

      {/* Subscriptions History */}
      <div className="space-y-3">
         <div className="flex justify-between items-center">
             <h3 className="font-bold text-gray-800 text-base">الاشتراكات الدورية</h3>
             <div className="flex bg-gray-100/50 p-1 rounded-lg gap-1 border border-gray-100">
               <button 
                 onClick={() => setShowArchivedSubs(!showArchivedSubs)}
                 className={clsx("px-3 py-1.5 text-[11px] font-bold rounded flex items-center gap-1.5 transition whitespace-nowrap", showArchivedSubs ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-700")}
               >
                 <RefreshCw size={14} />
                 {showArchivedSubs ? 'إخفاء الأرشيف' : 'عرض الأرشيف'}
               </button>
               <button onClick={() => {
                 setNewSubForm({ frequency: 'monthly', amount: 0, itemPrice: 0, quantity: 1, status: 'active', attireType: 'اشتراك تلقائي', isAutoCharge: true, startDate: new Date().toISOString().split('T')[0], customerId: id, customerName: customer?.fullName });
                 setImmediatelyChargeToDues(false);
                 setShowAddSubscriptionModal(true);
               }} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition">
                 <Plus size={14} className="stroke-[3]" />
                 إضافة اشتراك
               </button>
             </div>
         </div>
         {customerSubscriptions.length === 0 ? (
            <div className="text-center p-6 bg-white border border-gray-100 rounded-2xl text-xs text-gray-400">لا توجد اشتراكات مسجلة لهذا الزبون.</div>
         ) : (
            <div className="space-y-2">
              {customerSubscriptions.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition">
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                     <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 shrink-0">
                       <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                     </div>
                     <div>
                       <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-1 flex-wrap">
                         {s.attireType}
                         <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-black w-fit", s.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                           {s.status === 'active' ? 'مفعل' : 'موقف'}
                         </span>
                         <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-black w-fit border", s.isAutoCharge === true ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-gray-100 text-gray-600 border-gray-200/50")}>
                           {s.isAutoCharge === true ? '🔄 ترحيل تلقائي' : '👤 ترحيل يدوي'}
                         </span>
                       </p>
                       <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
                          {/* 1. Frequency and Start Date */}
                          <p className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[9.5px] font-bold">
                              {s.frequency === 'monthly' ? 'شهرياً' : s.frequency === 'weekly' ? 'أسبوعياً' : 'كل أسبوعين'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>تاريخ البدء: {formatDate(s.startDate)}</span>
                            {s.quantity && s.quantity > 0 && s.itemPrice ? (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="bg-indigo-50/70 text-indigo-700 border border-indigo-100/40 px-1.5 py-0.5 rounded-md text-[9.5px] font-black mr-0.5">
                                  {s.quantity} قطع × {formatCurrency(s.itemPrice)}
                                </span>
                              </>
                            ) : null}
                          </p>
                          {/* 2. Delivery Date and remaining days next to it */}
                          <p className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-indigo-800 font-black">تاريخ التسليم:</span>
                            <span className="font-mono text-indigo-950 font-black bg-indigo-50/50 px-1.5 py-0.5 rounded mr-1">
                              {formatDate(getNextDeliveryDate(s).toISOString())}
                            </span>
                            {s.status === 'active' ? (() => {
                              const nextDate2 = getNextDeliveryDate(s);
                              const daysRemaining2 = Math.ceil((nextDate2.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                              if (daysRemaining2 < 0) return <span className="font-black text-[9.5px] bg-red-100/80 text-red-700 px-2 py-0.5 rounded-full border border-red-200/40">متأخر</span>;
                              if (daysRemaining2 === 0) return <span className="font-black text-[9.5px] bg-amber-100/80 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200/40">اليوم!</span>;
                              return <span className="font-black text-[9.5px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/30">يتبقى {daysRemaining2} يوم</span>;
                            })() : (
                              <span className="font-black text-[9.5px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">الاشتراك موقف</span>
                            )}
                          </p>

                          {/* 3. Price Explanation is inlined above for compactness */}
                          {s.quantity && s.quantity > 0 && s.itemPrice && false ? (
                            <p className="flex items-center gap-1.5 flex-wrap mt-1 text-[10.5px] font-bold text-slate-500 bg-slate-50 border border-slate-100/70 p-1.5 rounded-lg w-fit">
                              <span className="text-gray-400">شرح السعر:</span>
                              <span className="bg-indigo-55 text-indigo-700 font-mono font-black px-1.5 py-0.5 rounded text-[10px]">
                                {s.quantity} قطع × {formatCurrency(s.itemPrice)}
                              </span>
                              <span className="text-gray-400">({s.quantity} قطع | القطعة: {formatCurrency(s.itemPrice)})</span>
                            </p>
                          ) : null}
                        </div>
                                              </div>
                    </div>
                   
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="flex flex-col items-center sm:items-end font-sans">
                        <div className="text-center sm:text-left">
                          <span className="text-[10px] text-gray-400 block font-bold mb-0.5">المجموع الإجمالي</span>
                          <span className="font-black text-sm sm:text-base text-indigo-800 font-mono block" dir="ltr">{formatCurrency(s.amount)}</span>
                        </div>

                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                         <button 
                           onClick={() => {
                             setNewSubForm({
                               ...s,
                               nextDeliveryDate: getNextDeliveryDate(s).toISOString().split('T')[0],
                               itemPrice: s.itemPrice || s.amount,
                               quantity: s.quantity || 1,
                               startDate: s.startDate.split('T')[0],
                               endDate: s.endDate ? s.endDate.split('T')[0] : ''
                             });
                             setImmediatelyChargeToDues(false);
                             setShowAddSubscriptionModal(true);
                           }}
                           className="p-2 border border-blue-50/70 rounded-lg text-blue-505 bg-blue-50/20 hover:text-blue-700 hover:bg-blue-100 transition whitespace-nowrap"
                           title="تعديل"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                         </button>
                         <button 
                           onClick={() => {
                             const subs = getSubscriptions();
                             const index = subs.findIndex(sub => sub.id === s.id);
                             if (index !== -1) {
                               subs[index].status = subs[index].status === 'active' ? 'paused' : 'active';
                               saveSubscription(subs[index]);
                               setCustomerSubscriptions(subs.filter(sub => sub.customerId === id));
                               showToast({ message: subs[index].status === 'active' ? 'تم تفعيل الاشتراك' : 'تم إيقاف الاشتراك', type: 'success' });
                             }
                           }}
                           className={clsx(
                             "p-2 border rounded-lg transition-all",
                             s.status === 'active' 
                               ? "border-amber-100 text-amber-600 bg-amber-50/30 hover:bg-amber-100 hover:text-amber-800" 
                               : "border-emerald-100 text-emerald-600 bg-emerald-50/30 hover:bg-emerald-100 hover:text-emerald-805"
                           )}
                           title={s.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                         >
                           {s.status === 'active' ? <Pause size={14} className="stroke-[2.5]" /> : <Play size={14} className="stroke-[2.5]" />}
                         </button>
                        <button 
                           disabled={s.status !== 'active' || getNextDeliveryDate(s) > new Date()}
                           onClick={async () => {
                             const result = await confirm({
                               title: getNextDeliveryDate(s) > new Date() ? 'تنبيه بالترحيل المبكر' : 'ترحيل دفعة اشتراك دوري',
                               message: getNextDeliveryDate(s) > new Date()
                                  ? `تنبيه: تاريخ الاستحقاق القادم لم يحن بعد (${formatDate(getNextDeliveryDate(s).toISOString())}). \n\nهل أنت متأكد من رغبتك في ترحيل هذه الدفعة مبكراً كفاتورة مستحقة وتنزيلها فوراً بالديون؟`
                                  : `هل أنت متأكد من ترحيل دفعة جديدة بقيمة ${formatCurrency(s.amount)} كفاتورة مستحقة فوراً في ذمة هذا العميل؟ \n(سيؤدي هذا إلى تقييد المبلغ في ديونه وتحديث تاريخ الدورة القادمة)`,
                               confirmText: 'تأكيد الترحيل',
                               cancelText: 'إلغاء',
                               showAutoChargeCheckbox: !s.isAutoCharge
                             });

                             if (result && result.confirmed) {
                               chargeSubscriptionPeriod(s);
                               if (result.autoCharge) {
                                 s.isAutoCharge = true;
                                 saveSubscription(s);
                               }
                               if (id) {
                                 setOrders(db.getOrders().filter(o => o.customerId === id));
                                 setInvoices(db.getInvoices().filter(i => i.customerId === id));
                                 setCustomerSubscriptions(getSubscriptions().filter(sub => sub.customerId === id));
                                }
                               showToast({ message: 'تم ترحيل دفعة الاشتراك بنجاح وقيدها في ديون الزبون بقيمة ' + formatCurrency(s.amount) + (result.autoCharge ? ' وتم تفعيل الترحيل التلقائي مالياً' : ''), type: 'success' });
                             }
                           }}
                           className={clsx(
                             "flex items-center gap-1.5 px-3 py-2 border rounded-lg transition text-[11px] font-black cursor-pointer",
                             (s.status === 'active' && getNextDeliveryDate(s) <= new Date())
                               ? "border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer"
                               : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                           )}
                           title={s.status !== 'active' ? 'الاشتراك متوقف' : getNextDeliveryDate(s) > new Date() ? 'تم الترحيل لهذا الشهر أو مجمّد' : 'القيد الفوري في الديون المستحقة'}
                         >
                           <CreditCard size={14} className="stroke-[2.5]" />
                           <span>ترحيل دفعة</span>
                         </button>

                          <button 
                            onClick={async () => {
                              if (s.isArchived) {
                                  try {
                                    const { unarchiveSubscription } = await import('../lib/subscriptions');
                                    unarchiveSubscription(s.id);
                                    setCustomerSubscriptions(getSubscriptions(showArchivedSubs).filter(sub => sub.customerId === id));
                                    setOrders(db.getOrders(true).filter(ord => ord.customerId === id && (!ord.isArchived || showArchivedSubs)));
                                    setInvoices(db.getInvoices(true).filter(i => i.customerId === id && (!i.isArchived || showArchivedSubs)));
                                    showToast({ message: 'تم إعادة تفعيل الاشتراك واستعادة طلباته', type: 'success' });
                                  } catch (e) {
                                    console.error(e);
                                  }
                              } else {
                                  const isConfirmed = await confirm({
                                    title: 'أرشفة الاشتراك الدوري',
                                    message: 'هل أنت متأكد من أرشفة هذا الاشتراك بشكل نهائي؟ (لن تصدر طلبات جديدة، لكن الطلبات السابقة ستبقى محفوظة ومسجلة في الديون).',
                                    confirmText: 'نعم، أرشفة',
                                    cancelText: 'إلغاء',
                                    isDestructive: true
                                  });
                                  if (isConfirmed) {
                                    archiveSubscription(s.id);
                                    setCustomerSubscriptions(getSubscriptions(showArchivedSubs).filter(sub => sub.customerId === id));
                                    showToast({ message: 'تم أرشفة الاشتراك بنجاح', type: 'info' });
                                  }
                              }
                            }}
                            className={clsx("p-2 border rounded-lg transition", s.isArchived ? "border-emerald-50 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100" : "border-red-50 text-red-400 bg-red-50/50 hover:text-red-700 hover:bg-red-100")}
                            title={s.isArchived ? "استعادة من الأرشيف" : "أرشفة"}
                          >
                            {s.isArchived ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                          </button>
                     </div>
                   </div>
                </div>
              ))}
            </div>
         )}
      </div>

      {/* Financial Archive */}
      <div className="space-y-3">
         <h3 className="font-bold text-gray-800 text-base">الأرشيف المالي</h3>
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
               <div className="flex items-center gap-2 mb-1">
                 <Wallet className="w-4 h-4 text-blue-500" />
                 <span className="text-xs text-gray-500 font-medium">المدفوعات</span>
               </div>
               <span className="text-lg font-bold text-gray-900" dir="ltr">
                  {formatCurrency(totalPaid)}
               </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
               <div className="flex items-center gap-2 mb-1">
                 <CreditCard className="w-4 h-4 text-orange-500" />
                 <span className="text-xs text-gray-500 font-medium">الديون (الباقي)</span>
               </div>
               <span className="text-lg font-bold text-orange-600" dir="ltr">
                  {formatCurrency(totalOutstanding)}
               </span>
            </div>
         </div>

         {/* Payments History */}
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-50 pb-2">سجل الدفعات الأخيرة</h4>

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
             <div className="bg-slate-50 border border-gray-100 p-3 rounded-2xl text-xs">
                <div className="flex justify-between items-center mb-2.5">
                   <div>
                      <span className="text-gray-400 block text-[9px] mb-0.5">الزبون المستلم</span>
                      <span className="font-extrabold text-slate-700">{customer.fullName} ({customer.phone})</span>
                   </div>
                   {selectedOrderForMsg && (
                     <div className="text-left">
                        <span className="text-gray-400 block text-[9px] mb-0.5">رقم الطلب النشط</span>
                        <span className="font-mono font-bold text-slate-700">#{selectedOrderForMsg.orderNumber}</span>
                     </div>
                   )}
                </div>

                {/* Multiple Orders Selector Dropdown/Radio buttons for beautiful CRM value mapping */}
                {orders.length > 0 ? (
                  <div className="pt-2 border-t border-gray-200/60">
                     <label className="block text-[10px] font-black text-slate-500 mb-1">🔗 ربط بيانات رسائل الإشعار بالطلب:</label>
                     <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {orders.filter(o => !o.isSubscription).map(o => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrderForMsg(o);
                              loadAndRenderTemplate(selectedMsgType, customTemplates, o);
                            }}
                            className={clsx(
                              "px-2.5 py-1 text-[10px] font-bold rounded-lg transition border shrink-0 cursor-pointer",
                              selectedOrderForMsg?.id === o.id
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-slate-50"
                            )}
                          >
                            #{o.orderNumber} ({db.getAttireTemplates().find(t => t.id === o.attireType)?.name || o.attireType})
                          </button>
                        ))}
                     </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-200/60 text-gray-400 text-[10px] text-center font-bold">
                    ⚠️ هذا الزبون ليس لديه أي طلب تفصيل حالي. سيتم إستخدام قيم افتراضية ومخصصة.
                  </div>
                )}
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
             <div className="space-y-1.5 text-right flex flex-col">
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
            <div className="space-y-3">
               {(() => {
                  const allPayments = invoices.flatMap(inv => 
                    (inv.payments || []).map(p => ({
                      ...p,
                      invoiceNumber: inv.invoiceNumber,
                      orderId: inv.orderId
                    }))
                  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (allPayments.length === 0) {
                     return <p className="text-xs text-gray-400 text-center py-2">لا توجد مدفوعات مسجلة.</p>;
                  }

                  return allPayments.slice(0, 5).map(p => (
                     <div key={p.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                        <div>
                           <p className="text-xs text-gray-500">{formatDate(p.date)}</p>
                           <Link to={`/orders/${p.orderId}`} className="text-[10px] text-primary-600 hover:underline">فاتورة #{p.invoiceNumber}</Link>
                        </div>
                        <span className="font-mono font-bold text-green-600" dir="ltr">+{formatCurrency(p.amount)}</span>
                     </div>
                  ));
               })()}
            </div>
         </div>
      </div>

      {/* Subscription Modal */}
      {showAddSubscriptionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600 stroke-[2.5]" /> {newSubForm.id ? 'تعديل الاشتراك' : 'إضافة اشتراك للزبون'}
              </h3>
              <button onClick={() => setShowAddSubscriptionModal(false)} className="text-indigo-400 hover:text-indigo-600">×</button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="flex-[3]">
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">نوع الطلب التلقائي</label>
                  <input 
                    type="text" 
                    placeholder="مثال: زي موحد، تفصيل دوري..."
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.attireType || ''}
                    onChange={e => setNewSubForm({...newSubForm, attireType: e.target.value})}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl h-[42px] flex flex-col items-center justify-center mt-1.5">
                    <span className="text-[9px] text-indigo-500 font-bold leading-none mb-1">يوم متبقي</span>
                    <span className="text-sm font-black text-indigo-700 leading-none">
                      {(() => {
                        if (!newSubForm.nextDeliveryDate) return '-';
                        const days = Math.ceil((new Date(newSubForm.nextDeliveryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return days >= 0 ? days : 0;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">سعر القطعة (درهم)</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.itemPrice || ''}
                    onChange={e => {
                      const price = parseFloat(e.target.value) || 0;
                      const qty = newSubForm.quantity || 1;
                      setNewSubForm({
                        ...newSubForm,
                        itemPrice: price,
                        amount: Number((price * qty).toFixed(2))
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">عدد القطع</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.quantity || ''}
                    onChange={e => {
                      const qty = parseInt(e.target.value) || 1;
                      if (newSubForm.itemPrice && newSubForm.itemPrice > 0) {
                        setNewSubForm({
                          ...newSubForm,
                          quantity: qty,
                          amount: Number((newSubForm.itemPrice * qty).toFixed(2))
                        });
                      } else if (newSubForm.amount && newSubForm.amount > 0) {
                        setNewSubForm({
                          ...newSubForm,
                          quantity: qty,
                          itemPrice: Number((newSubForm.amount / qty).toFixed(2))
                        });
                      } else {
                        setNewSubForm({
                          ...newSubForm,
                          quantity: qty
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">الإجمالي (درهم)</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.amount || ''}
                    onChange={e => {
                      const total = parseFloat(e.target.value) || 0;
                      const qty = newSubForm.quantity || 1;
                      setNewSubForm({
                        ...newSubForm,
                        amount: total,
                        itemPrice: qty > 0 ? Number((total / qty).toFixed(2)) : total
                      });
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">التكرار</label>
                <select 
                  className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSubForm.frequency || 'monthly'}
                  onChange={e => {
                    const freq = e.target.value as any;
                    const nextDate = newSubForm.startDate ? calculateNextDate(new Date(newSubForm.startDate).toISOString(), freq).split('T')[0] : newSubForm.nextDeliveryDate;
                    setNewSubForm({...newSubForm, frequency: freq, nextDeliveryDate: nextDate});
                  }}
                >
                  <option value="weekly">أسبوعياً</option>
                  <option value="bi-weekly">كل أسبوعين</option>
                  <option value="monthly">شهرياً</option>
                </select>
              </div>

              <div className="flex gap-3 relative">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">تاريخ بداية العقد</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.startDate || ''}
                    onChange={e => {
                      const st = e.target.value;
                      const nextDate = st ? calculateNextDate(new Date(st).toISOString(), newSubForm.frequency as any || 'monthly').split('T')[0] : newSubForm.nextDeliveryDate;
                      setNewSubForm({...newSubForm, startDate: st, nextDeliveryDate: nextDate});
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">التسليم القادم</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSubForm.nextDeliveryDate || ''}
                    onChange={e => setNewSubForm({...newSubForm, nextDeliveryDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">تاريخ انتهاء العقد <span className="text-[9px] font-normal text-gray-400">(اختياري)</span></label>
                <input 
                  type="date" 
                  className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newSubForm.endDate || ''}
                  onChange={e => setNewSubForm({...newSubForm, endDate: e.target.value})}
                />
              </div>

              {/* Checkbox for auto-charge */}
              <label className="flex items-center gap-2.5 mt-3 p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newSubForm.isAutoCharge ?? false} 
                  onChange={(e) => setNewSubForm({...newSubForm, isAutoCharge: e.target.checked})} 
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600" 
                />
                <span className="text-xs font-bold text-slate-800 select-none text-right">
                  🔄 تفعيل الترحيل التلقائي للفاتورة والدورة؟
                </span>
              </label>

              {/* Checkbox for immediate charging */}
              {!newSubForm.id && (
                <label className="flex items-center gap-2.5 mt-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={immediatelyChargeToDues} 
                    onChange={(e) => setImmediatelyChargeToDues(e.target.checked)} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" 
                  />
                  <span className="text-xs font-bold text-indigo-950 select-none text-right">
                    تقييد دفعة أولى وتصدير فاتورة مستحقة فوراً في ديون هذا الزبون؟
                  </span>
                </label>
              )}

              <button 
                onClick={async () => {
                  if (!newSubForm.customerId || !newSubForm.attireType || !newSubForm.amount || !newSubForm.startDate) {
                     showToast({ message: 'الرجاء ملء كافة الحقول وإدخال مبلغ صحيح', type: 'error' });
                     return;
                  }
                  
                  const startD = new Date(newSubForm.startDate);
                  const endD = newSubForm.endDate ? new Date(newSubForm.endDate) : undefined;
                  
                  if (endD && endD <= startD) {
                    showToast({ message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', type: 'error' });
                    return;
                  }

                  let finalSubStatus = newSubForm.status as any || 'active';
                  let chargeSuccess = false;
                  let unfreezingNote = false;

                  // Dynamic revision / unfreezing adjustment
                  if (newSubForm.id) {
                    const existing = getSubscriptions().find(x => x.id === newSubForm.id);
                    if (existing) {
                      const cleanAmt = Number(newSubForm.amount);
                      const cleanPrice = Number(newSubForm.itemPrice);
                      const cleanQty = Number(newSubForm.quantity);
                      const cleanStartDate = new Date(newSubForm.startDate).toISOString();
                      const cleanNextDeliveryDate = newSubForm.nextDeliveryDate ? new Date(newSubForm.nextDeliveryDate).toISOString() : undefined;

                      const isDateChanged = existing.startDate !== cleanStartDate || 
                                          (newSubForm.nextDeliveryDate && existing.nextDeliveryDate !== cleanNextDeliveryDate);
                      const isMoneyChanged = existing.amount !== cleanAmt || 
                                           (existing.itemPrice !== undefined && existing.itemPrice !== cleanPrice) || 
                                           (existing.quantity !== undefined && existing.quantity !== cleanQty);

                      if (isDateChanged || isMoneyChanged) {
                        unfreezingNote = true;
                        // For modifications, we always unfreeze the subscription automatically back to active status!
                        finalSubStatus = 'active';

                        const existingOrders = db.getOrders().filter(o => o.subscriptionId === newSubForm.id && o.isSubscription);
                        const unpaidOrderIds = existingOrders.map(o => o.id);
                        const unpaidInvoices = db.getInvoices().filter(inv => unpaidOrderIds.includes(inv.orderId) && inv.status === 'unpaid');

                        if (unpaidInvoices.length > 0) {
                          const rewriteConfirmed = await confirm({
                            title: 'تعديل تواريخ أو مبالغ الاشتراك',
                            message: 'لقد قمت بتعديل تواريخ أو قيمة اشتراك العميل. هل ترغب في إلغاء الترحيل القديم وإعادة احتساب كشف الفاتورة المفتوحة بالبيانات المُعدلة؟ \n\n(في حال الموافقة: سيتم إلغاء الفواتير غير المدفوعة والطلب السابق وحقن الجديد فوراً كإجراء احترازي نظيف لحسابات الديون)',
                            confirmText: 'نعم، الترحيل الجديد وإلغاء القديم',
                            cancelText: 'لا، الاحتفاظ بالفواتير والترحيل الفائت'
                          });

                          if (rewriteConfirmed) {
                            unpaidInvoices.forEach(inv => {
                              db.deleteInvoice(inv.id);
                              db.deleteOrder(inv.orderId);
                            });
                            chargeSuccess = true;
                          }
                        }
                      }
                    }
                  }
                  
                  const sub: Subscription = {
                    id: newSubForm.id || generateId(),
                    customerId: newSubForm.customerId,
                    customerName: newSubForm.customerName || customer?.fullName || '',
                    attireType: newSubForm.attireType,
                    amount: Number(newSubForm.amount),
                    itemPrice: newSubForm.itemPrice ? Number(newSubForm.itemPrice) : undefined,
                    quantity: newSubForm.quantity ? Number(newSubForm.quantity) : undefined,
                    frequency: newSubForm.frequency as any || 'monthly',
                    startDate: startD.toISOString(),
                    endDate: endD ? endD.toISOString() : undefined,
                    nextDeliveryDate: newSubForm.nextDeliveryDate ? new Date(newSubForm.nextDeliveryDate).toISOString() : undefined,
                    lastGeneratedDate: newSubForm.lastGeneratedDate || null,
                    status: finalSubStatus,
                    isAutoCharge: newSubForm.isAutoCharge ?? false
                  };

                  saveSubscription(sub);

                  if (chargeSuccess) {
                    try {
                      chargeSubscriptionPeriod(sub, new Date());
                    } catch (e) {
                      console.error("Failed to re-charge subscription period", e);
                    }
                  } else if (immediatelyChargeToDues) {
                    try {
                      chargeSubscriptionPeriod(sub, startD);
                      chargeSuccess = true;
                    } catch (e) {
                      console.error("Failed to charge immediate period", e);
                    }
                  }

                  if (id) {
                    setOrders(db.getOrders().filter(o => o.customerId === id));
                    setInvoices(db.getInvoices().filter(i => i.customerId === id));
                  }
                  setCustomerSubscriptions(getSubscriptions().filter(s => s.customerId === id));
                  setShowAddSubscriptionModal(false);
                  
                  showToast({ 
                    message: chargeSuccess 
                      ? 'تم تحديث الاشتراك وتعديل الترحيل بفاتورة الديون الجديدة بنجاح' 
                      : unfreezingNote 
                        ? 'تم حفظ التعديلات وتنشيط وإلغاء تجميد الاشتراك تلقائياً بنجاح'
                        : 'تم حفظ تفاصيل الاشتراك بنجاح', 
                    type: 'success' 
                  });
                }}
                className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition text-sm"
              >
                تأكيد وبدء الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
