import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  Settings2, 
  Download, 
  Upload, 
  Bell, 
  Cloud, 
  ShoppingBag, 
  Store, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Hash, 
  MessageSquare, 
  DollarSign, 
  FileText, 
  Check, 
  Sparkles,
  Info,
  Scissors,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  CloudUpload,
  CloudDownload,
  AlertTriangle,
  Play,
  Pause,
  Lock as ShieldLockIcon,
  Search,
  ArrowUpDown,
  Copy,
  Filter,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { db } from '../store/db';
import { clsx } from 'clsx';
import { useUI } from '../store/ui';
import { CustomTemplate, AttireTemplate, CostFieldSetting, DEFAULT_COST_FIELDS, BrandingVisibility, DEFAULT_BRANDING_VISIBILITY, Subscription, Customer } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { backupToDrive, restoreFromDrive } from '../lib/driveBackup';
import { logout, AppUser } from '../lib/auth';
import { generateId, formatCurrency, formatDate } from '../lib/utils';
import { getSubscriptions, saveSubscription, archiveSubscription, getNextDeliveryDate, calculateNextDate, chargeSubscriptionPeriod } from '../lib/subscriptions';
import { useMemo } from 'react';

import SignatureCanvas from 'react-signature-canvas';
// Import newly uploaded professional logo assets
import logoKhayyat1 from '../assets/images/KhayyatProLogo (1).png';
import logoKhayyat2 from '../assets/images/KhayyatProLogo (2).png';
import logoKhayyat3 from '../assets/images/KhayyatProLogo (3).png';
import logoKhayyat4 from '../assets/images/KhayyatProLogo (4).png';
import logoKhayyat5 from '../assets/images/KhayyatProLogo (5).png';
import logoKhayyat6 from '../assets/images/KhayyatProLogo (6).png';

export default function Settings({ user }: { user: AppUser }) {
  const { showToast, confirm } = useUI();
  const [searchParams] = useSearchParams();
  
  // Custom states for tabs
  const [activeTab, setActiveTab] = useState<'attire' | 'profile' | 'billing' | 'whatsapp' | 'cloud' | 'subscriptions' | 'trash'>('attire');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle initial tab from search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cloud') setActiveTab('cloud');
    else if (tabParam === 'attire') setActiveTab('attire');
    else if (tabParam === 'profile') setActiveTab('profile');
    else if (tabParam === 'billing') setActiveTab('billing');
    else if (tabParam === 'whatsapp') setActiveTab('whatsapp');
  }, [searchParams]);

  // Scroll active tab into view
  useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // Attire templates states
  const [attireTemplates, setAttireTemplates] = useState<AttireTemplate[]>([]);
  const [attireSearchQuery, setAttireSearchQuery] = useState('');
  const [attireSortBy, setAttireSortBy] = useState<'name' | 'newest' | 'gender' | 'style'>('newest');
  const [attireActiveGender, setAttireActiveGender] = useState<AttireTemplate['gender'] | 'all'>('all');
  const [attireActiveStyle, setAttireActiveStyle] = useState<AttireTemplate['style'] | 'all'>('all');

  const filteredAndSortedAttire = useMemo(() => {
    return attireTemplates
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(attireSearchQuery.toLowerCase());
        const matchesStyle = attireActiveStyle === 'all' || t.style === attireActiveStyle;
        const matchesGender = attireActiveGender === 'all' || t.gender === attireActiveGender;
        
        return matchesSearch && matchesStyle && matchesGender;
      })
      .sort((a, b) => {
        if (attireSortBy === 'name') return a.name.localeCompare(b.name);
        if (attireSortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (attireSortBy === 'gender') return a.gender.localeCompare(b.gender);
        if (attireSortBy === 'style') return (a.style || '').localeCompare(b.style || '');
        return 0;
      });
  }, [attireTemplates, attireSearchQuery, attireSortBy, attireActiveGender, attireActiveStyle]);

  // Workshop & Tailor profile states
  const [shopName, setShopName] = useState('');
  const [tailorName, setTailorName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPatent, setShopPatent] = useState('');
  const [shopRc, setShopRc] = useState('');
  const [shopIf, setShopIf] = useState('');
  const [shopLogo, setShopLogo] = useState('');
  const [shopSignature, setShopSignature] = useState('');
  const signaturePadRef = useRef<any>(null);

  // Invoice & billing states
  const [taxRate, setTaxRate] = useState('0');
  const [defaultMargin, setDefaultMargin] = useState('0');
  const [currency, setCurrency] = useState('درهم');
  const [measurementUnit, setMeasurementUnit] = useState('cm');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [costFields, setCostFields] = useState<CostFieldSetting[]>(DEFAULT_COST_FIELDS);

  // Branding visibility states
  const [brandingVisibility, setBrandingVisibility] = useState<BrandingVisibility>(DEFAULT_BRANDING_VISIBILITY);

  // WhatsApp & SMS reminder template states
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [templateReady, setTemplateReady] = useState('');
  const [templateConfirmed, setTemplateConfirmed] = useState('');
  const [templatePayment, setTemplatePayment] = useState('');
  const [templateGreeting, setTemplateGreeting] = useState('');
  const [selectedTemplateSubTab, setSelectedTemplateSubTab] = useState<string>('ready');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);

  // Subscriptions states
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTabSub, setActiveTabSub] = useState<'active' | 'archived'>('active');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);
  const [immediatelyChargeToDues, setImmediatelyChargeToDues] = useState(false);
  const [newSubForm, setNewSubForm] = useState<Partial<Subscription>>({ 
    frequency: 'monthly', 
    amount: 0, 
    itemPrice: 0,
    quantity: 1,
    status: 'active', 
    attireType: 'اشتراك تلقائي',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [subSortOrder, setSubSortOrder] = useState<'newest' | 'oldest' | 'amount_asc' | 'amount_desc'>('newest');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);


  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleVarInsert = (placeholder: string) => {
    const el = templateTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const origText = el.value;
    const newText = origText.substring(0, start) + placeholder + origText.substring(end);

    if (selectedTemplateSubTab === 'ready') {
      setTemplateReady(newText);
      setWhatsappTemplate(newText);
    } else if (selectedTemplateSubTab === 'confirmed') {
      setTemplateConfirmed(newText);
    } else if (selectedTemplateSubTab === 'payment') {
      setTemplatePayment(newText);
    } else if (selectedTemplateSubTab === 'greeting') {
      setTemplateGreeting(newText);
    } else {
      const updated = customTemplates.map(t => t.id === selectedTemplateSubTab ? { ...t, body: newText } : t);
      setCustomTemplates(updated);
      localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(updated));
    }

    // Restore focus and update cursor position
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + placeholder.length;
    }, 50);
  };

  // Utilities / Preferences
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [showCloudAgreement, setShowCloudAgreement] = useState(false);
  const [reminderMaterials, setReminderMaterials] = useState(true);

  // Load settings on mount
  useEffect(() => {
    // Standard settings
    setTaxRate(localStorage.getItem('khayatpro_setting_tax') || '0');
    setDefaultMargin(localStorage.getItem('khayatpro_setting_margin') || '0');
    setCloudSyncEnabled(localStorage.getItem('khayatpro_cloud_sync') === 'true');
    setReminderMaterials(localStorage.getItem('khayatpro_setting_reminder_materials') !== 'false');

    // Tailor shop profile
    setShopName(localStorage.getItem('khayatpro_setting_shop_name') || 'أتيلييه الخياطة الرفيعة');
    setTailorName(localStorage.getItem('khayatpro_setting_tailor_name') || 'المعلم سفيان');
    setShopPhone(localStorage.getItem('khayatpro_setting_phone') || '0661234567');
    setShopEmail(localStorage.getItem('khayatpro_setting_email') || 'contact@khayatpro.ma');
    setShopAddress(localStorage.getItem('khayatpro_setting_address') || 'شارع الحسن الثاني، عمارة 4، الرباط');
    setShopPatent(localStorage.getItem('khayatpro_setting_patent') || 'RC 45910 / PAT 120485');
    setShopRc(localStorage.getItem('khayatpro_setting_rc') || 'RC-Rabat-45910');
    setShopIf(localStorage.getItem('khayatpro_setting_if') || 'IF-987654');
    setShopLogo(localStorage.getItem('khayatpro_setting_logo') || 'img:khayyat3');
    setShopSignature(localStorage.getItem('khayatpro_setting_signature') || '');

    // Receipts branding & terms
    setInvoiceNotes(localStorage.getItem('khayatpro_setting_invoice_notes') || 'الرجاء الحفاظ على هذا الوصل وتقديمه عند استلام اللباس. الطلبات غير المستلمة لمدة تفوق 3 أشهر لا نتحمل مسؤولية بقائها بالورشة.');
    setCurrency(localStorage.getItem('khayatpro_setting_currency') || 'درهم');
    setMeasurementUnit(localStorage.getItem('khayatpro_setting_unit') || 'cm');

    // Cost Fields
    const storedCostFields = localStorage.getItem('khayatpro_setting_cost_fields');
    if (storedCostFields) {
      try {
        setCostFields(JSON.parse(storedCostFields));
      } catch (e) {
        setCostFields(DEFAULT_COST_FIELDS);
      }
    }

    // Branding Visibility
    const storedBranding = localStorage.getItem('khayatpro_branding_visibility');
    if (storedBranding) {
      try {
        setBrandingVisibility(JSON.parse(storedBranding));
      } catch (e) {
        setBrandingVisibility(DEFAULT_BRANDING_VISIBILITY);
      }
    }

    // WhatsApp structures
    const loadedReady = localStorage.getItem('khayatpro_setting_template_ready') || localStorage.getItem('khayatpro_setting_whatsapp_template') || 'مرحباً {title} {customer}،\n\nنخبركم بكل سرور وسعادة بأن طلبكم ({attire}) ذي الرقم {order_number} أصبح جاهزاً بالكامل للتسليم في ورشتنا ({shop_name})! ✨\n\n💵 الباقي استخلاصه: {remaining_amount}\n\nيسعدنا دائماً استقبالكم ومرحباً بكم في أي وقت!';
    setWhatsappTemplate(loadedReady);
    setTemplateReady(loadedReady);

    setTemplateConfirmed(localStorage.getItem('khayatpro_setting_template_confirmed') || 'مرحباً {title} {customer}،\n\nنؤكد لكم استلام طلبكم في ورشتنا ({shop_name}) لتفصيل ({attire}) ذي الرقم {order_number} بنجاح. 🪡\n\n💵 عربون الدفع: {deposit_amount}\n💵 الباقي استخلاصه: {remaining_amount}\n\nشكراً لثقتكم الغالية بنا ونعمل جاهدين ليكون اللباس في أبهى حلة! ✨');
    setTemplatePayment(localStorage.getItem('khayatpro_setting_template_payment') || 'مرحباً {title} {customer}،\n\nتذكير رقيق من ({shop_name}) بخصوص طلبكم ({attire}) رقم {order_number}.\n\n💵 الباقي استخلاصه: {remaining_amount}\n\nنشكركم جزيلاً ويسعدنا دائماً خدمتكم!');
    setTemplateGreeting(localStorage.getItem('khayatpro_setting_template_greeting') || 'عزيزنا العميل {customer}،\n\nأتيلييه {shop_name} يهنئكم بمناسبة قدوم المناسبة السعيدة! كل عام وأنتم بألف خير، ويسعدنا دائماً تزيين إطلالتكم الفاخرة. 🌙✨');

    // Load custom templates
    const storedCustom = localStorage.getItem('khayatpro_setting_custom_templates');
    if (storedCustom) {
      try {
        setCustomTemplates(JSON.parse(storedCustom));
      } catch (e) {
        console.error('Error loading custom templates', e);
      }
    }

    // Attire templates
    setAttireTemplates(db.getAttireTemplates());

    // Load Customers and Subscriptions
    const allCustomers = db.getCustomers();
    setCustomersList(allCustomers);
    setSubscriptions(getSubscriptions(true));
  }, []);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 300000) {
      showToast({ message: 'حجم ملف الشعار كبير جداً! يرجى اختيار صورة أقل من 300 كيلوبايت لضمان سلاسة التخزين المحلي الآمن.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setShopLogo(base64Data);
      showToast({ message: 'تم تحميل الشعار المخصص بنجاح 🖼️', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAttireTemplate = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'حذف نوع اللباس',
      message: 'هل أنت متأكد من رغبتك في حذف هذا النوع من الملابس؟ سيتوقف ظهوره في قائمة أخذ القياسات.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      isDestructive: true
    });

    if (isConfirmed) {
      db.deleteAttireTemplate(id);
      setAttireTemplates(db.getAttireTemplates());
      showToast({ message: 'تم حذف نوع اللباس بنجاح', type: 'success' });
    }
  };

  const handleDuplicateAttireTemplate = (template: AttireTemplate) => {
    const newTemplate: AttireTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (نسخة)`,
      createdAt: new Date().toISOString()
    };
    
    db.saveAttireTemplate(newTemplate);
    setAttireTemplates(db.getAttireTemplates());
    showToast({ 
      message: `تم نسخ ${template.name} بنجاح`, 
      type: 'success' 
    });
  };

  const saveSettings = () => {
    // General
    localStorage.setItem('khayatpro_setting_tax', taxRate);
    localStorage.setItem('khayatpro_setting_margin', defaultMargin);
    localStorage.setItem('khayatpro_cloud_sync', cloudSyncEnabled ? 'true' : 'false');
    localStorage.setItem('khayatpro_setting_reminder_materials', reminderMaterials ? 'true' : 'false');

    // Profile details
    localStorage.setItem('khayatpro_setting_shop_name', shopName);
    localStorage.setItem('khayatpro_setting_tailor_name', tailorName);
    localStorage.setItem('khayatpro_setting_phone', shopPhone);
    localStorage.setItem('khayatpro_setting_email', shopEmail);
    localStorage.setItem('khayatpro_setting_address', shopAddress);
    localStorage.setItem('khayatpro_setting_patent', shopPatent);
    localStorage.setItem('khayatpro_setting_rc', shopRc);
    localStorage.setItem('khayatpro_setting_if', shopIf);
    localStorage.setItem('khayatpro_setting_logo', shopLogo);
    localStorage.setItem('khayatpro_setting_signature', shopSignature);

    // Invoice custom notes & currency
    localStorage.setItem('khayatpro_setting_invoice_notes', invoiceNotes);
    localStorage.setItem('khayatpro_setting_currency', currency);
    localStorage.setItem('khayatpro_setting_unit', measurementUnit);
    localStorage.setItem('khayatpro_setting_cost_fields', JSON.stringify(costFields));
    localStorage.setItem('khayatpro_branding_visibility', JSON.stringify(brandingVisibility));

    // Message templates
    localStorage.setItem('khayatpro_setting_template_ready', templateReady);
    localStorage.setItem('khayatpro_setting_template_confirmed', templateConfirmed);
    localStorage.setItem('khayatpro_setting_template_payment', templatePayment);
    localStorage.setItem('khayatpro_setting_template_greeting', templateGreeting);
    localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(customTemplates));
    // Backward compatibility
    localStorage.setItem('khayatpro_setting_whatsapp_template', templateReady);

    showToast({ message: 'تم حفظ كافة إعدات الورشة والفواتير بنجاح!', type: 'success' });
  };

  const handleExport = () => {
    const backupData: any = {
      _exportDate: new Date().toISOString(),
      _version: '2.0',
      storage: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('khayatpro_')) {
        try {
          const val = localStorage.getItem(key);
          backupData.storage[key] = val ? JSON.parse(val) : null;
        } catch (e) {
          backupData.storage[key] = localStorage.getItem(key);
        }
      }
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khayatpro_full_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({ message: 'تم تصدير نسخة احتياطية شاملة بنجاح 💾', type: 'success' });
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.storage) {
          Object.entries(data.storage).forEach(([key, val]) => {
            if (typeof val === 'string') localStorage.setItem(key, val);
            else localStorage.setItem(key, JSON.stringify(val));
          });
        } else if (data.customers && data.orders) {
          // v1.1 format fallback
          if (data.customers) localStorage.setItem('khayatpro_customers', JSON.stringify(data.customers));
          if (data.orders) localStorage.setItem('khayatpro_orders', JSON.stringify(data.orders));
          if (data.invoices) localStorage.setItem('khayatpro_invoices', JSON.stringify(data.invoices));
          if (data.measurementProfiles) localStorage.setItem('khayatpro_measurement_profiles', JSON.stringify(data.measurementProfiles));
          if (data.attireTemplates) localStorage.setItem('khayatpro_attire_templates', JSON.stringify(data.attireTemplates));
          
          if (data.settings) {
            if (data.settings.tax !== undefined) localStorage.setItem('khayatpro_setting_tax', data.settings.tax);
            if (data.settings.margin !== undefined) localStorage.setItem('khayatpro_setting_margin', data.settings.margin);
            if (data.settings.cloudSync !== undefined) localStorage.setItem('khayatpro_cloud_sync', data.settings.cloudSync);
          }
        } else {
          throw new Error('Unknown format');
        }

        showToast({ message: 'تم استيراد كافة البيانات والإعدادات بنجاح! سيتم تحديث الصفحة', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showToast({ message: 'فشل الاستيراد: ملف النسخة الاحتياطية غير صالح', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const getSimulatedMessage = () => {
    const title = "الأستاذة";
    const customer = "فاطمة الزهراء البقالي";
    const attire = "تكشيطة بالطرز الرباطي";
    const orderNumber = "2048";
    const remaining = "450,00 " + currency;
    const deposit = "500,00 " + currency;
    
    let activeTemplateText = '';
    if (selectedTemplateSubTab === 'ready') activeTemplateText = templateReady;
    else if (selectedTemplateSubTab === 'confirmed') activeTemplateText = templateConfirmed;
    else if (selectedTemplateSubTab === 'payment') activeTemplateText = templatePayment;
    else if (selectedTemplateSubTab === 'greeting') activeTemplateText = templateGreeting;
    else {
      const customTpl = customTemplates.find(t => t.id === selectedTemplateSubTab);
      activeTemplateText = customTpl ? customTpl.body : '';
    }

    return activeTemplateText
      .replace(/{customer}/g, customer)
      .replace(/{title}/g, title)
      .replace(/{dear}/g, "عزيزتنا")
      .replace(/{attire}/g, attire)
      .replace(/{order_number}/g, orderNumber)
      .replace(/{remaining_amount}/g, remaining)
      .replace(/{deposit_amount}/g, deposit)
      .replace(/{shop_name}/g, shopName || "أتيلييه الخياطة");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 text-right" dir="rtl">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-3xs">
        <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-700 shadow-4xs">
          <Settings2 className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">إعدادات الورشة والفواتير</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {user.isAnonymous 
              ? 'تنبيه: أنت تستخدم حساباً محلياً حالياً. الميزات السحابية تتطلب تسجيل الدخول بحساب جوجل.'
              : 'تخصيص هوية المحل، الفواتير، ونصوص المراسلات التلقائية للعملاء'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation - Scrollable Chip Bar with Transitions */}
      <div className="relative">
        {/* Left/Right Overlays to indicate more content is available */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-gray-50/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-gray-50/80 to-transparent z-10 pointer-events-none" />
        
        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 p-1.5 bg-white border border-gray-105 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth"
          dir="rtl"
        >
          <button
            onClick={() => setActiveTab('attire')}
            data-active={activeTab === 'attire'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'attire' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'attire' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Scissors size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'attire' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">أنواع الملابس والقياس</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            data-active={activeTab === 'profile'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'profile' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Store size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'profile' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">هوية الورشة</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            data-active={activeTab === 'billing'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'billing' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'billing' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <FileText size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'billing' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">الفواتير والعملة</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            data-active={activeTab === 'whatsapp'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'whatsapp' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'whatsapp' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <MessageSquare size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'whatsapp' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">قوالب الرسائل</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            data-active={activeTab === 'cloud'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'cloud' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'cloud' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Cloud size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'cloud' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">الأمان والنسخ</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            data-active={activeTab === 'subscriptions'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'subscriptions' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'subscriptions' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <RefreshCw size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'subscriptions' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">فواتير المتكررة</span>
          </button>

          <button
            onClick={() => setActiveTab('trash')}
            data-active={activeTab === 'trash'}
            className={clsx(
              "flex-none py-2.5 px-4 text-[11px] font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none cursor-pointer relative",
              activeTab === 'trash' ? "text-white" : "text-gray-500 hover:text-gray-800 hover:bg-slate-50"
            )}
          >
            {activeTab === 'trash' && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute inset-0 bg-red-600 rounded-xl shadow-lg shadow-red-100"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Trash2 size={14} className={clsx("stroke-[2.5] relative z-10", activeTab === 'trash' ? "text-white" : "")} />
            <span className="whitespace-nowrap relative z-10">المحذوفات</span>
          </button>
        </div>
      </div>

      {/* Main Containers */}
      <div className="bg-white rounded-3xl border border-gray-105 p-6 shadow-3xs overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Tab 0: Attire Types Management */}
            {activeTab === 'attire' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
                  <span>تعديل أنواع اللباس والمقاسات</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5 font-medium leading-relaxed">
                  هذا هو القسم المسؤول عن تحديد أنواع الملابس التي تظهر في شاشة أخذ القياسات ونقاط القياس الخاصة بكل نوع.
                </p>
              </div>
              <Link 
                to="/settings/templates/new" 
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all shadow-3xs transform active:scale-95 shrink-0"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>إضافة نوع جديد</span>
              </Link>
            </div>

            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800">وحدة القياس الافتراضية</h4>
                <p className="text-[10px] text-gray-500">اختر الوحدة التي سيتم استخدامها لتسجيل قياسات الزبائن</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-gray-200 shadow-4xs shrink-0">
                <button
                  onClick={() => setMeasurementUnit('cm')}
                  className={clsx(
                    "px-6 py-2 rounded-lg text-xs font-black transition-all cursor-pointer",
                    measurementUnit === 'cm' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  سنتيمتر (cm)
                </button>
                <button
                  onClick={() => setMeasurementUnit('inch')}
                  className={clsx(
                    "px-6 py-2 rounded-lg text-xs font-black transition-all cursor-pointer",
                    measurementUnit === 'inch' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  بوصة (inch)
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-gray-150 rounded-[2rem] p-3 mb-6 flex flex-col lg:flex-row items-center gap-3">
              {/* Style Selection (Traditional / Modern) */}
              <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-4xs w-full lg:w-auto shrink-0">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'traditional', label: 'تقليدي' },
                  { id: 'modern', label: 'عصري' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setAttireActiveStyle(btn.id as any)}
                    className={clsx(
                      "flex-1 lg:px-5 py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer whitespace-nowrap",
                      attireActiveStyle === btn.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div className="relative w-full lg:w-[180px] shrink-0">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 w-3.5 h-3.5 pointer-events-none" />
                <select
                  value={attireActiveGender}
                  onChange={(e) => setAttireActiveGender(e.target.value as any)}
                  className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl pr-9 pl-4 py-2 text-[10px] font-black text-indigo-800 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="all">كل الفئات</option>
                  <option value="male_adult">رجالي (كبار)</option>
                  <option value="female_adult">نسائي (كبار)</option>
                  <option value="male_teen">شباب</option>
                  <option value="female_teen">شابات</option>
                  <option value="male_child">أولاد</option>
                  <option value="female_child">بنات</option>
                  <option value="infant">مواليد</option>
                </select>
              </div>

              {/* Search Field */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="ابحث عن موديل..."
                  className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all font-bold"
                  value={attireSearchQuery}
                  onChange={e => setAttireSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Sorting */}
              <div className="relative shrink-0 w-full lg:w-auto">
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                <select 
                  className="w-full lg:w-auto bg-slate-50 border border-gray-100 rounded-xl pr-8 pl-4 py-2 text-[10px] font-black text-gray-600 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
                  value={attireSortBy}
                  onChange={e => setAttireSortBy(e.target.value as any)}
                >
                  <option value="newest">الأحدث</option>
                  <option value="name">الاسم</option>
                  <option value="style">النمط</option>
                </select>
              </div>

              {/* Total Count */}
              <div className="text-[10px] bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black shrink-0 border border-indigo-100 whitespace-nowrap">
                {filteredAndSortedAttire.length} موديلات
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAndSortedAttire.length > 0 ? (
                filteredAndSortedAttire.map(t => (
                  <div 
                    key={t.id} 
                    className="bg-slate-50 border border-gray-150 rounded-2xl p-4 hover:border-indigo-300 transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-white p-2 rounded-xl border border-gray-150 group-hover:border-indigo-200 transition-all shadow-4xs">
                          <Scissors className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-800">{t.name}</h4>
                          <span className="text-[9px] text-gray-400 font-bold">
                            {t.points.length} نقاط قياس مخصصة
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={clsx(
                          "text-[8px] font-black px-2 py-0.5 rounded-lg border",
                          t.gender === 'female_adult' || t.gender === 'female_teen' || t.gender === 'female_child' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                          t.gender === 'infant' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-sky-50 text-sky-600 border-sky-100"
                        )}>
                          {t.gender === 'male_adult' ? 'رجال' : 
                           t.gender === 'female_adult' ? 'نساء' : 
                           t.gender === 'male_teen' ? 'شباب' : 
                           t.gender === 'female_teen' ? 'شابات' : 
                           t.gender === 'male_child' ? 'أولاد' : 
                           t.gender === 'female_child' ? 'بنات' : 
                           t.gender === 'infant' ? 'مواليد' : 'عام'}
                        </span>
                        <span className={clsx(
                          "text-[7px] font-black px-1.5 py-0.5 rounded-md border",
                          t.style === 'traditional' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-teal-50 text-teal-700 border-teal-100"
                        )}>
                          {t.style === 'traditional' ? 'تقليدي' : 'عصري'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-3 border-t border-gray-200/60 relative z-10">
                      <Link 
                        to={`/settings/templates/${t.id}`}
                        className="flex-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-gray-200 hover:border-indigo-200 py-1.5 rounded-xl text-[10px] font-black text-center transition shadow-4xs"
                      >
                        تعديل النقاط
                      </Link>
                      <button 
                        onClick={() => handleDuplicateAttireTemplate(t)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-lg border border-gray-100 shadow-4xs"
                        title="نسخ هذا النوع"
                      >
                        <Copy size={13} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAttireTemplate(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-gray-100 shadow-4xs"
                        title="حذف هذا النوع"
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                    {/* Subtle Background Accent */}
                    <div className="absolute -bottom-2 -left-2 text-gray-100 group-hover:text-indigo-50 transition-colors -rotate-12 pointer-events-none">
                      <Scissors size={40} strokeWidth={1} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 bg-white border border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Search size={24} className="opacity-20" />
                  <p className="text-xs font-bold">لم يتم العثور على أنواع ملابس تطابق بحثك</p>
                </div>
              )}
            </div>
            
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-right">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                <span className="font-black block mb-1">💡 نصيحة احترافية:</span>
                يمكنك إضافة العديد من أنواع الملابس المخصصة. عند إضافة زبون جديد، سيظهر لك قائمة الأنواع التي عرفتها هنا لتسهيل عملية إدخال القياسات بدقة عالية وبسرعة فائقة.
              </p>
            </div>
          </div>
        )}

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              <span>معلومات ورشة ومحل الخياطة</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
              المعلومات المدخلة هنا هي التي يتم طباعتها تلقائياً على وصولات فواتير الزبناء وهيدر التقارير والطباعة. تضفي مظهراً احترافياً لعملك!
            </p>

            {/* Logo Picker Section */}
            <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl space-y-4 mb-2">
              <label className="text-xs font-black text-gray-600 block flex items-center gap-1.5 justify-end">
                <span>شعار محل وورشة الخياطة المعتمد لدعم الهوية المهنية</span>
                <Sparkles size={11} className="text-indigo-600" />
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
                
                {/* 1. Real-time Logo Preview */}
                <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-gray-200 w-32 h-32 shadow-4xs shrink-0 select-none">
                  {shopLogo ? (
                    shopLogo.startsWith('data:image/') ? (
                      <img src={shopLogo} className="w-20 h-20 object-contain rounded-xl" alt="شعار المحل" />
                    ) : shopLogo === 'img:khayyat1' ? (
                      <img src={logoKhayyat1} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 1" />
                    ) : shopLogo === 'img:khayyat2' ? (
                      <img src={logoKhayyat2} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 2" />
                    ) : shopLogo === 'img:khayyat3' ? (
                      <img src={logoKhayyat3} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 3" />
                    ) : shopLogo === 'img:khayyat4' ? (
                      <img src={logoKhayyat4} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 4" />
                    ) : shopLogo === 'img:khayyat5' ? (
                      <img src={logoKhayyat5} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 5" />
                    ) : shopLogo === 'img:khayyat6' ? (
                      <img src={logoKhayyat6} className="w-20 h-20 object-contain rounded-xl" alt="شعار خياط برو 6" />
                    ) : shopLogo === 'preset:scissors' ? (
                      <div className="flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200 rounded-xl w-14 h-14">
                        <Scissors className="w-8 h-8 stroke-[2]" />
                      </div>
                    ) : shopLogo === 'preset:star' ? (
                      <div className="flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl w-14 h-14">
                        <Sparkles className="w-8 h-8 stroke-[2]" />
                      </div>
                    ) : shopLogo === 'preset:royal' ? (
                      <div className="flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl w-14 h-14">
                        <span className="text-2xl">👑</span>
                      </div>
                    ) : shopLogo === 'preset:heart' ? (
                      <div className="flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200 rounded-xl w-14 h-14">
                        <span className="text-2xl">❤️</span>
                      </div>
                    ) : (
                      <div className="text-gray-300 text-[10px] text-center font-bold">بدون شعار</div>
                    )
                  ) : (
                    <div className="text-gray-300 text-[10px] text-center font-bold">لا يوجد شعار</div>
                  )}
                  <span className="text-[9px] font-black text-gray-400 mt-1 select-none">شعار الورشة</span>
                </div>

                {/* 2. Logo Selections / Action Panel */}
                <div className="flex-1 w-full space-y-3.5 text-right">
                  <span className="text-[11px] font-extrabold text-slate-700 block mb-1">حدد أحد الشعارات الحصرية المدمجة بالمشروع أو قم برفع هويتك الخاصة:</span>
                  
                  {/* Grid of Custom Embroidery/Tailor Logos */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat1')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat1' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية الأولى"
                    >
                      <img src={logoKhayyat1} className="w-10 h-10 object-contain rounded-lg" alt="شعار 1" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat2')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat2' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية الثانية"
                    >
                      <img src={logoKhayyat2} className="w-10 h-10 object-contain rounded-lg" alt="شعار 2" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat3')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat3' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية الثالثة"
                    >
                      <img src={logoKhayyat3} className="w-10 h-10 object-contain rounded-lg" alt="شعار 3" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 3</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat4')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat4' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية الرابعة"
                    >
                      <img src={logoKhayyat4} className="w-10 h-10 object-contain rounded-lg" alt="شعار 4" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat5')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat5' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية الخامسة"
                    >
                      <img src={logoKhayyat5} className="w-10 h-10 object-contain rounded-lg" alt="شعار 5" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 5</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('img:khayyat6')}
                      className={clsx(
                        "p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 bg-white",
                        shopLogo === 'img:khayyat6' ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-55/5" : "border-gray-200 hover:border-gray-300"
                      )}
                      title="شعار خياط برو - الهوية السادسة"
                    >
                      <img src={logoKhayyat6} className="w-10 h-10 object-contain rounded-lg" alt="شعار 6" />
                      <span className="text-[8px] font-black text-slate-600 truncate w-full text-center">شعار 6</span>
                    </button>
                  </div>

                  {/* Standard SVG icon presets */}
                  <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShopLogo('preset:scissors')}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer bg-white",
                        shopLogo === 'preset:scissors' ? "bg-amber-50 border-amber-350 text-amber-700 ring-2 ring-amber-200/50" : "border-gray-150 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <Scissors size={10} className="stroke-[2.5]" />
                      <span>المقص الذهبي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('preset:star')}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer bg-white",
                        shopLogo === 'preset:star' ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-200/50" : "border-gray-150 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <Sparkles size={10} className="stroke-[2.5]" />
                      <span>النجمة التقليدية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('preset:royal')}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer bg-white",
                        shopLogo === 'preset:royal' ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-200/50" : "border-gray-150 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <span>👑 الملوكي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('preset:heart')}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer bg-white",
                        shopLogo === 'preset:heart' ? "bg-rose-50 border-rose-300 text-rose-600 ring-2 ring-rose-200/50" : "border-gray-150 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <span>❤️ شغف رقيق</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShopLogo('')}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-xl border text-[9px] font-black transition-all cursor-pointer bg-white",
                        !shopLogo ? "bg-slate-100 border-slate-350 text-slate-800" : "border-gray-150 text-gray-400 hover:bg-gray-50"
                      )}
                    >
                      بدون شعار
                    </button>
                  </div>

                  {/* Upload Actions */}
                  <div className="flex items-center gap-2 justify-end pt-1">
                    {shopLogo && (
                      <button
                        type="button"
                        onClick={() => { setShopLogo(''); showToast({ message: 'تم إزالة الشعار بالكامل', type: 'info' }) }}
                        className="text-red-500 hover:text-red-700 text-[9.5px] font-black flex items-center gap-1 border border-red-200 hover:border-red-300 px-3 py-1 pb-1 px-3 py-1.5 rounded-xl bg-white transition shadow-4xs cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>إزالة الشعار</span>
                      </button>
                    )}

                    <label className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-3.5 py-1.5 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer shadow-4xs">
                      <Upload size={11} className="stroke-[2.5]" />
                      <span>رفع لوغو مخصص للورشة</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleLogoUpload} 
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">يدعم الشعار المخصص الصور بصيغة PNG أو JPG شفافة وبمقاس مربع ومضغوطة.</p>
                </div>

              </div>
            </div>

            {/* Signature Pad Section */}
            <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl space-y-4 mb-2">
              <label className="text-xs font-black text-gray-600 block flex items-center gap-1.5 justify-end">
                <span>توقيع المحل أو الخياط المعتمد</span>
                <Sparkles size={11} className="text-indigo-600" />
              </label>

              <div className="flex flex-col items-center gap-4">
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-white w-full max-w-sm h-32 overflow-hidden shadow-4xs">
                  {shopSignature ? (
                    <img src={shopSignature} alt="توقيع الورشة" className="w-full h-full object-contain pointer-events-none" />
                  ) : (
                    <SignatureCanvas 
                      ref={signaturePadRef}
                      penColor="black"
                      canvasProps={{className: 'w-full h-full cursor-crosshair'}}
                    />
                  )}
                  {!shopSignature && (
                    <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1 text-[9px] text-gray-400 font-bold bg-white/80 px-2 py-1 rounded-md">
                      <span>ارسم التوقيع هنا</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!shopSignature ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                            const trimmedDataURL = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
                            setShopSignature(trimmedDataURL);
                            showToast({ message: 'تم حفظ التوقيع بنجاح!', type: 'success' });
                          } else {
                            showToast({ message: 'يرجى رسم التوقيع أولاً', type: 'error' });
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-colors"
                      >
                        تأكيد التوقيع
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (signaturePadRef.current) signaturePadRef.current.clear();
                        }}
                        className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-[10px] font-black transition-colors"
                      >
                        مسح
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShopSignature('');
                      }}
                      className="text-red-500 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      إزالة التوقيع
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>اسم المحل / الأتيلييه المعتمد *</span>
                  <Store size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="مثال: دار القفطان والجلابة المغربية"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>اسم الخياط المسؤول (المعلم) *</span>
                  <User size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right"
                  value={tailorName}
                  onChange={e => setTailorName(e.target.value)}
                  placeholder="مثال: المعلم سفيان"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>هاتف الابتكار والتواصل التجاري *</span>
                  <Phone size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  required
                  dir="ltr"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-left"
                  value={shopPhone}
                  onChange={e => setShopPhone(e.target.value)}
                  placeholder="0661234567"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>البريد الإلكتروني للورشة</span>
                  <Mail size={12} className="text-gray-450" />
                </label>
                <input 
                  type="email"
                  dir="ltr"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-left"
                  value={shopEmail}
                  onChange={e => setShopEmail(e.target.value)}
                  placeholder="contact@khayatpro.ma"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>العنوان الطبيعي للمحل والجريدة</span>
                  <MapPin size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right"
                  value={shopAddress}
                  onChange={e => setShopAddress(e.target.value)}
                  placeholder="مثال: الحبوس، شارع الأحباس، رقم 48، الدار البيضاء"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>رقم براءة الاختراع (Patente)</span>
                  <Hash size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right font-mono"
                  value={shopPatent}
                  onChange={e => setShopPatent(e.target.value)}
                  placeholder="مثال: 32145678"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>السجل التجاري (R.C)</span>
                  <Hash size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right font-mono"
                  value={shopRc}
                  onChange={e => setShopRc(e.target.value)}
                  placeholder="مثال: RC-Rabat-45910"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-black text-gray-500 block flex items-center gap-1.5 justify-end">
                  <span>التعريف المالي والضريبي (I.F)</span>
                  <Hash size={12} className="text-gray-450" />
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-right font-mono"
                  value={shopIf}
                  onChange={e => setShopIf(e.target.value)}
                  placeholder="مثال: IF-987654"
                />
              </div>
            </div>

            {/* Branding Visibility Toggles */}
            <div className="mt-8 pt-6 border-t border-gray-100" dir="rtl">
              <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-3 bg-amber-500 rounded-full" />
                <span>إعدادات ظهور المعلومات على الفاتورة والوصل</span>
              </h4>
              <p className="text-[10px] text-gray-400 mb-4 font-bold">اختر المعلومات التي ترغب في إظهارها للعملاء في الفاتورة المطبوعة أو المرسلة:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { id: 'showShopName', label: 'اسم المحل', icon: Store },
                  { id: 'showTailorName', label: 'اسم الخياط', icon: User },
                  { id: 'showPhone', label: 'رقم الهاتف', icon: Phone },
                  { id: 'showEmail', label: 'البريد الإلكتروني', icon: Mail },
                  { id: 'showAddress', label: 'العنوان', icon: MapPin },
                  { id: 'showLegalInfo', label: 'المعلومات القانونية', icon: ShieldLockIcon },
                  { id: 'showLogo', label: 'الشعار واللوغو', icon: Sparkles },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBrandingVisibility(prev => ({ ...prev, [item.id]: !prev[item.id as keyof BrandingVisibility] }))}
                    className={clsx(
                      "flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-xs font-black",
                      brandingVisibility[item.id as keyof BrandingVisibility]
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-4xs ring-1 ring-indigo-50"
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    <div className={clsx(
                      "p-2 rounded-xl border flex items-center justify-center transition-colors",
                      brandingVisibility[item.id as keyof BrandingVisibility] ? "bg-white border-indigo-200 text-indigo-600" : "bg-gray-50 border-gray-100 text-gray-300"
                    )}>
                      <item.icon size={16} />
                    </div>
                    <span className="flex-1 text-right">{item.label}</span>
                    <div className={clsx(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                      brandingVisibility[item.id as keyof BrandingVisibility] ? "bg-indigo-600 border-indigo-600 scale-110" : "bg-white border-gray-200"
                    )}>
                      {brandingVisibility[item.id as keyof BrandingVisibility] && <Check size={12} className="text-white stroke-[3]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Billing & Calculations */}
        {activeTab === 'billing' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              <span>إعدادات الفواتير والحسابات الافتراضية</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
              تحديد ثوابت التسعير والضريبة وقيمة الباقي استخلاصه وعملتك المفضلة، إضافة إلى توابل وبنود الفاتورة التي تقدمها كواجب الثقة للعميل.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block text-right">العملة الافتراضية</label>
                <input 
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-800 text-center"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  placeholder="درهم"
                />
                <span className="text-[10px] text-slate-400 block text-right">تستخدم لحساب الأرباح وعرض الواجهات</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block text-right">الضريبة الافتراضية (TVA %)</label>
                <div className="relative">
                  <input 
                    type="number"
                    dir="ltr"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-805 text-left"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                  />
                  <span className="absolute right-4 top-3 text-xs text-gray-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 block text-right">هامش الربح الأساسي للطلب</label>
                <div className="relative">
                  <input 
                    type="number"
                    dir="ltr"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-sm text-slate-805 text-left"
                    value={defaultMargin}
                    onChange={e => setDefaultMargin(e.target.value)}
                  />
                  <span className="absolute right-4 top-3 text-[10px] text-gray-400 font-bold">{currency}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const newField: CostFieldSetting = {
                      id: `field_${Date.now()}`,
                      label: 'بند جديد',
                      isEnabled: true,
                      isTaxable: true
                    };
                    setCostFields([...costFields, newField]);
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition shadow-4xs"
                >
                  <Plus size={12} className="stroke-[3]" />
                  <span>إضافة بند تكلفة جديد</span>
                </button>
                <h4 className="text-xs font-extrabold text-slate-700">تخصيص بنود تكلفة التفصيل (Cost Breakdown)</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {costFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-gray-150">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = costFields.filter((_, i) => i !== index);
                        setCostFields(updated);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex-1 flex items-center gap-2">
                       <div className="flex items-center gap-1">
                         <input
                           type="checkbox"
                           id={`taxable-${field.id}`}
                           checked={field.isTaxable}
                           onChange={(e) => {
                             const updated = [...costFields];
                             updated[index].isTaxable = e.target.checked;
                             setCostFields(updated);
                           }}
                           className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                         />
                         <label htmlFor={`taxable-${field.id}`} className="text-[9px] font-bold text-gray-400 whitespace-nowrap">خاضع للضريبة</label>
                       </div>

                       <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...costFields];
                          updated[index].label = e.target.value;
                          setCostFields(updated);
                        }}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-right outline-none focus:border-indigo-500"
                        placeholder="اسم البند..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...costFields];
                        updated[index].isEnabled = !updated[index].isEnabled;
                        setCostFields(updated);
                      }}
                      className={clsx(
                        "w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0",
                        field.isEnabled ? "bg-indigo-600" : "bg-gray-200"
                      )}
                    >
                      <div className={clsx(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200",
                        field.isEnabled ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-medium text-right">💡 هذه البنود ستظهر عند إنشاء كل طلب جديد لتفصيل التكلفة حسب رغبتك. يمكنك تفعيل أو تعطيل أي بند دون حذفه.</p>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-black text-gray-500 block flex items-center justify-end gap-1.5">
                <span>شروط الاستلام وملاحظات الفاتورة أسفل الوصل</span>
                <Info size={12} className="text-indigo-500" />
              </label>
              <textarea 
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-xs text-slate-700 leading-relaxed text-right space-y-1 font-sans"
                value={invoiceNotes}
                onChange={e => setInvoiceNotes(e.target.value)}
                placeholder="شروط البقاء، المواعيد، أو الملاحظات الضرورية للزبناء..."
              />
              <span className="text-[10px] text-slate-400 block text-right">يرجى كتابة شروط الاسترداد أو الضمان التي يتعين على الزبون معرفتها عند إحضار وصل التفصيل.</span>
            </div>
          </div>
        )}

        {/* Tab 3: WhatsApp Templates */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              <span>قوالب الرسائل الجاهزة للعميل (WhatsApp SMS)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
              قم بصياغة وتنشيط قوالب الإشعارات التلقائية التي ترسلها لعملائك عبر واتساب أو الرسائل النصية بلمسة زر لتسريع استلام طلباتهم ومتابعة المدفوعات.
            </p>

            {/* Sub Tabs to Switch Templates */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedTemplateSubTab('ready')}
                className={clsx(
                  "px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center flex-1 min-w-[120px]",
                  selectedTemplateSubTab === 'ready' ? "bg-white text-indigo-700 shadow-4xs" : "text-gray-500 hover:text-slate-800"
                )}
              >
                👗 اللباس جاهز للتسليم
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplateSubTab('confirmed')}
                className={clsx(
                  "px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center flex-1 min-w-[120px]",
                  selectedTemplateSubTab === 'confirmed' ? "bg-white text-indigo-700 shadow-4xs" : "text-gray-500 hover:text-slate-800"
                )}
              >
                🪡 تأكيد حجز الطلب والقياسات
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplateSubTab('payment')}
                className={clsx(
                  "px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center flex-1 min-w-[120px]",
                  selectedTemplateSubTab === 'payment' ? "bg-white text-indigo-700 shadow-4xs" : "text-gray-500 hover:text-slate-800"
                )}
              >
                💵 تذكير بالباقي المتبقي
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplateSubTab('greeting')}
                className={clsx(
                  "px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center flex-1 min-w-[120px]",
                  selectedTemplateSubTab === 'greeting' ? "bg-white text-indigo-700 shadow-4xs" : "text-gray-500 hover:text-slate-800"
                )}
              >
                🌙 معايدات ومناسبات للزبائن
              </button>

              {/* Dynamic User Custom Templates */}
              {customTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateSubTab(tpl.id)}
                  className={clsx(
                    "px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center flex-1 min-w-[120px] flex items-center justify-center gap-1",
                    selectedTemplateSubTab === tpl.id ? "bg-white text-indigo-700 shadow-4xs" : "text-gray-500 hover:text-slate-800"
                  )}
                >
                  <span>📝 {tpl.name}</span>
                </button>
              ))}

              {/* Add New Template Button */}
              <button
                type="button"
                onClick={() => {
                  const newId = `custom_${Date.now()}`;
                  const newTpl: CustomTemplate = {
                    id: newId,
                    name: `قالب مخصص #${customTemplates.length + 1}`,
                    body: 'مرحباً {title} {customer}،\n\nاكتب رسالتك المخصصة هنا...'
                  };
                  const updated = [...customTemplates, newTpl];
                  setCustomTemplates(updated);
                  setSelectedTemplateSubTab(newId);
                  localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(updated));
                  showToast({ message: 'تم إنشاء قالب مخصص جديد! متاح الآن لتعديل اسمه ومحتواه ومزامنته بلمسة واحدة.', type: 'success' });
                }}
                className="px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer text-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1 flex-1 min-w-[120px]"
              >
                <Plus size={12} className="stroke-[2.5]" />
                <span>إضافة قالب مخصص</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-gray-150 rounded-2xl p-4 text-right mb-4">
              <span className="font-extrabold text-xs text-slate-700 block mb-1">الرموز المتغيرة المتاحة للاستخدام (تُستبدل تلقائياً):</span>
              <p className="text-[11px] text-indigo-600 mb-3 font-medium">💡 انقر على أي رمز ملوّن بالأسفل لإدراجه تلقائياً في موضع مؤشر الماوس داخل نص الرسالة:</p>
              <div className="flex flex-wrap gap-2 text-indigo-800 justify-start" dir="rtl">
                <button
                  type="button"
                  onClick={() => handleVarInsert("{customer}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: اسم الزبون الكامل"
                >
                  <span>{"{customer}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(الزبون)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{title}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: اللقب (الأستاذ / الأستاذة)"
                >
                  <span>{"{title}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(اللقب)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{dear}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: صيغة ترحيب لطيفة للعميل"
                >
                  <span>{"{dear}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(عزيزنا)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{attire}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: اسم ونوع الفستان/اللباس"
                >
                  <span>{"{attire}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(اللباس)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{order_number}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: رقم سجل الطلب"
                >
                  <span>{"{order_number}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(رقم الطلب)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{remaining_amount}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: المبلغ الباقي للدفع"
                >
                  <span>{"{remaining_amount}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(الباقي)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{deposit_amount}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: مبلغ العربون المدفوع مسبقا"
                >
                  <span>{"{deposit_amount}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(العربون)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVarInsert("{shop_name}")}
                  className="bg-white border hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer font-bold flex items-center gap-1"
                  title="انقر لمضاعفة الإدراج: اسم ورشة الخياطة"
                >
                  <span>{"{shop_name}"}</span>
                  <span className="text-[9px] text-gray-400 font-sans font-normal">(الورشة)</span>
                </button>
              </div>
            </div>

            {/* Custom Template Name Customizer & Delete Action */}
            {selectedTemplateSubTab.startsWith('custom_') && (() => {
              const activeTpl = customTemplates.find(t => t.id === selectedTemplateSubTab);
              if (!activeTpl) return null;
              return (
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mt-2">
                  <div className="flex-1 w-full space-y-1 text-right">
                    <label className="text-[11px] font-black text-slate-500 block">تعديل اسم وعنوان القالب المخصص الحالي *</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-extrabold text-xs text-slate-700 text-right"
                      value={activeTpl.name}
                      onChange={e => {
                        const val = e.target.value;
                        const updated = customTemplates.map(t => t.id === activeTpl.id ? { ...t, name: val } : t);
                        setCustomTemplates(updated);
                        localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(updated));
                      }}
                      placeholder="عنوان تعريفي وسهل مثل: تذكير بالموعد"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: 'حذف قالب',
                        message: 'هل أنت متأكد من رغبتك في حذف هذا القالب المخصص بشكل نهائي؟',
                        confirmText: 'حذف القالب',
                        cancelText: 'إلغاء',
                        isDestructive: true
                      });
                      if (isConfirmed) {
                        const updated = customTemplates.filter(t => t.id !== activeTpl.id);
                        setCustomTemplates(updated);
                        setSelectedTemplateSubTab('ready');
                        localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(updated));
                        showToast({ message: 'تم حذف القالب المخصص بنجاح!', type: 'info' });
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl border border-red-150 transition cursor-pointer flex items-center gap-1 text-xs font-black self-end w-full sm:w-auto justify-center"
                  >
                    <Trash2 size={13} />
                    <span>حذف القالب</span>
                  </button>
                </div>
              );
            })()}

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-500 block text-right">
                تعديل القالب: {
                  selectedTemplateSubTab === 'ready' ? '👗 لباس جاهز للتسليم' :
                  selectedTemplateSubTab === 'confirmed' ? '🪡 تأكيد حجز طلب جديد' :
                  selectedTemplateSubTab === 'payment' ? '💵 تذكير بتحصيل المتبقي' :
                  selectedTemplateSubTab === 'greeting' ? '🌙 تهنئة ومناسبات سعيدة' :
                  `📝 ${customTemplates.find(t => t.id === selectedTemplateSubTab)?.name || 'قالب مخصص'}`
                }
              </label>
              <textarea 
                ref={templateTextareaRef}
                rows={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-xs text-slate-705 leading-relaxed text-right font-sans"
                value={
                  selectedTemplateSubTab === 'ready' ? templateReady :
                  selectedTemplateSubTab === 'confirmed' ? templateConfirmed :
                  selectedTemplateSubTab === 'payment' ? templatePayment :
                  selectedTemplateSubTab === 'greeting' ? templateGreeting :
                  (customTemplates.find(t => t.id === selectedTemplateSubTab)?.body || '')
                }
                onChange={e => {
                  const val = e.target.value;
                  if (selectedTemplateSubTab === 'ready') {
                    setTemplateReady(val);
                    setWhatsappTemplate(val); // Backward compatibility
                  } else if (selectedTemplateSubTab === 'confirmed') {
                    setTemplateConfirmed(val);
                  } else if (selectedTemplateSubTab === 'payment') {
                    setTemplatePayment(val);
                  } else if (selectedTemplateSubTab === 'greeting') {
                    setTemplateGreeting(val);
                  } else {
                    const updated = customTemplates.map(t => t.id === selectedTemplateSubTab ? { ...t, body: val } : t);
                    setCustomTemplates(updated);
                    localStorage.setItem('khayatpro_setting_custom_templates', JSON.stringify(updated));
                  }
                }}
              />
            </div>

            {/* Simulated Chat Live Preview */}
            <div className="space-y-2 pt-2 text-right">
              <span className="text-xs font-black text-slate-500 block flex items-center justify-end gap-1.5">
                <Sparkles size={11} className="text-emerald-500 animate-pulse" />
                <span>المعاينة التفاعلية لإرسال الرسالة إلى هاتف العميل 📱</span>
              </span>
              
              <div className="bg-gradient-to-b from-[#efeae2] to-[#e5ddd5] rounded-3xl p-4 border border-gray-200 shadow-inner relative max-w-lg mx-auto overflow-hidden">
                {/* Simulated Chat Header */}
                <div className="absolute top-0 right-0 left-0 bg-[#075e54] text-white py-2 px-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-350 flex items-center justify-center text-[10px] font-bold text-slate-800">ف</div>
                    <div className="text-right">
                      <p className="font-extrabold text-[10px] leading-none">فاطمة الزهراء البقالي</p>
                      <span className="text-[7.5px] text-white/70">متصل الآن</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold">بوابة مراسلة الزبائن المحترفة</span>
                </div>

                {/* Simulated Message Bubble */}
                <div className="mt-8 mb-2 flex justify-start pl-8 whitespace-pre-wrap">
                  <div className="bg-[#d9fdd3] text-gray-800 rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs text-right shadow-4xs border border-[#cfeec3] max-w-full relative">
                    <p className="leading-relaxed text-[11px] font-medium font-sans">{getSimulatedMessage()}</p>
                    <div className="text-left mt-1.5 text-[8.5px] text-gray-400 font-bold flex items-center gap-1 justify-end" dir="ltr">
                      <span>14:32</span>
                      <Check size={11} className="text-sky-500 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Storage & Private Backup */}
        {activeTab === 'cloud' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              <span>تأمين البيانات (Google Drive Backup)</span>
            </h3>

            {/* Privacy Promise Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <Cloud className="w-10 h-10 text-indigo-600" />
                </div>
                
                <div className="text-center sm:text-right flex-1">
                  <h4 className="text-lg font-black text-slate-900 mb-2">نسختك الاحتياطية في مساحتك الخاصة</h4>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                    هذا النظام يضمن لك السيادة الكاملة. عند تفعيل النسخ، يتم رفع ملف البيانات مباشرة من جهازك إلى مجلدك الخاص في جوجل درايف. التطبيق لا يملك سيرفرات لتخزين بياناتك، مما يضمن خصوصيتك المطلقة.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3">
                    {user.isAnonymous ? (
                      <button 
                        onClick={() => {
                          confirm({
                            title: 'ربط حساب جوجل',
                            message: 'سنقوم بتسجيل دخولك عبر جوجل فقط للحصول على إذن برفع ملف النسخة الاحتياطية لمساحتك الخاصة. لن نطلع على ملفاتك الأخرى.',
                            confirmText: 'تسجيل دخول جوجل والتفعيل',
                          }).then(res => {
                            if (res) {
                              logout();
                            }
                          });
                        }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2"
                      >
                        <CloudUpload size={14} />
                        ربط حساب جوجل للنسخ
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={async () => {
                            showToast({ message: 'جاري تحديث نسختك في جوجل درايف...', type: 'info' });
                            const res = await backupToDrive();
                            if (res.success) showToast({ message: 'تم حفظ النسخة بنجاح في حسابك الشخصي ✅', type: 'success' });
                            else showToast({ message: 'فشل النسخ: ' + res.message, type: 'error' });
                          }}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-slate-900 transition-colors shadow-md shadow-indigo-200"
                        >
                          <CloudUpload size={16} />
                          <span>رفع نسخة احتياطية الآن</span>
                        </button>

                        <button 
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: 'استعادة من جوجل درايف؟',
                              message: 'سيتم استبدال بياناتك المحلية بالنسخة المحفوظة في حسابك. تأكد من أنك تريد المتابعة.',
                              confirmText: 'تأكيد الاستعادة',
                              isDestructive: true
                            });
                            
                            if (confirmed) {
                              showToast({ message: 'جاري جلب بياناتك من جوجل...', type: 'info' });
                              const res = await restoreFromDrive();
                              if (res.success) {
                                showToast({ message: 'تمت الاستعادة بنجاح! جاري تحديث التطبيق...', type: 'success' });
                                setTimeout(() => window.location.reload(), 1500);
                              } else {
                                showToast({ message: 'خطأ: ' + res.message, type: 'error' });
                              }
                            }
                          }}
                          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-xs hover:bg-slate-50 transition-colors"
                        >
                          <CloudDownload size={16} />
                          <span>تحميل آخر نسخة</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-black text-amber-800 mb-1">الخصوصية والمسؤولية</h5>
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  تطبيق "خياط برو" لا يحتفظ بأي سجلات للزبائن في أي قاعدة بيانات سحابية. البيانات هي ملك لك وتحت تصرفك بالكامل. ميزة جوجل درايف هي "جسر تقني" لضمان عدم ضياع عملك في حال تلف الهاتف.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t border-gray-100">
              <button 
                onClick={handleExport} 
                className="w-full bg-slate-50 text-slate-700 border border-slate-200 rounded-xl py-3 text-[10px] font-black hover:bg-slate-100 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>تصدير ملف JSON (للحفظ اليدوي)</span>
              </button>
              
              <label className="w-full bg-slate-50 text-slate-700 border border-slate-200 rounded-xl py-3 text-[10px] font-black hover:bg-slate-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-4xs">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>استيراد من ملف محلي</span>
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
            </div>
          </div>
        )}

        {/* Tab 5: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <RefreshCw size={18} className="stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-800">الاشتراكات الدورية والفواتير المتكررة</h3>
                <p className="text-[11px] text-gray-500 font-medium">قم بإضافة فواتير تتكرر تلقائياً بشكل شهري، أسبوعي للزبائن الدائمين وسيتم توليدها تلقائياً.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex bg-slate-50 border border-gray-200 rounded-xl p-1 shadow-sm w-full md:w-auto gap-1">
                <button
                  onClick={() => setActiveTabSub('active')}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                    activeTabSub === 'active' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  الاشتراكات المفعلة
                </button>
                <button
                  onClick={() => setActiveTabSub('archived')}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                    activeTabSub === 'archived' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  الاشتراكات المؤرشفة/الموقوفة
                </button>
              </div>

              <div className="flex flex-col sm:flex-row bg-slate-50 border border-gray-200 rounded-xl p-1 shadow-sm w-full md:w-auto gap-1">
                <div className="flex items-center px-3 py-1.5 gap-2 flex-1 sm:w-56 text-gray-500 bg-white rounded-lg border border-gray-100">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="ابحث باسم الزبون..."
                    className="bg-transparent border-none outline-none text-[11px] font-bold w-full"
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 sm:flex-none">
                  <select
                    className="bg-white border border-gray-100 flex-1 sm:w-auto text-[10px] font-bold outline-none text-gray-600 px-2 py-1.5 rounded-lg cursor-pointer mx-0.5"
                    value={subSortOrder}
                    onChange={(e) => setSubSortOrder(e.target.value as any)}
                  >
                    <option value="newest">الأحدث أولاً</option>
                    <option value="oldest">الأقدم أولاً</option>
                    <option value="amount_desc">الأعلى قيمة</option>
                    <option value="amount_asc">الأقل قيمة</option>
                  </select>
                </div>
              </div>
              <button onClick={() => {
                setNewSubForm({ frequency: 'monthly', amount: 0, itemPrice: 0, quantity: 1, status: 'active', attireType: 'اشتراك تلقائي', startDate: new Date().toISOString().split('T')[0] });
                setCustomerSearchTerm('');
                setImmediatelyChargeToDues(false);
                setShowAddSubscriptionModal(true);
              }} className="flex-none flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition shadow-sm w-full md:w-auto justify-center">
                <Plus size={14} className="stroke-[3]" />
                إضافة اشتراك جديد
              </button>
            </div>

            {(() => {
              const filteredAndSorted = subscriptions.filter(s => {
                  const isArch = !!s.isArchived;
                  const matchesTab = activeTabSub === 'active' ? !isArch : isArch;
                  const resolvedName = s.customerName || customersList.find(c => c.id === s.customerId)?.fullName || '';
                  return matchesTab && (resolvedName.toLowerCase().includes(subSearch.toLowerCase()) || s.attireType.toLowerCase().includes(subSearch.toLowerCase()));
                }).sort((a, b) => {
                  if (subSortOrder === 'amount_asc') return a.amount - b.amount;
                  if (subSortOrder === 'amount_desc') return b.amount - a.amount;
                  if (subSortOrder === 'oldest') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                  return new Date(b.startDate).getTime() - new Date(a.startDate).getTime(); // newest
                });
                
                if (subscriptions.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-gray-150 rounded-2xl p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                        <RefreshCw size={24} className="stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-600">لا توجد اشتراكات بعد</h4>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">أضف خطط فواتير دائمين ليقوم التطبيق بتوليدها نيابة عنك حسب المدة المطلوبة.</p>
                    </div>
                  );
                }

                if (filteredAndSorted.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-gray-150 rounded-2xl p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-3 text-gray-400">
                        <Search size={24} className="stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-600">لا توجد نتائج مطابقة لبحثك</h4>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">جرب تغيير شروط التصفية أو البحث عن زبون آخر.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAndSorted.map(sub => (
                      <div key={sub.id} className="bg-white border border-gray-250 rounded-2xl p-4 hover:border-slate-300 transition shadow-sm flex flex-col justify-between gap-4 relative">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-slate-900 mb-1">
                              {sub.customerName || customersList.find(c => c.id === sub.customerId)?.fullName || 'زبون غير معروف'}
                            </h4>
                            <p className="font-extrabold text-slate-800 text-[12px] flex items-center gap-1.5 mb-1">
                              نوع الملبس: {sub.attireType}
                            </p>
                            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 mt-1.5">
                              {/* 1. Frequency & Start Date */}
                              <p className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px]">
                                  {sub.frequency === 'monthly' ? 'شهرياً' : sub.frequency === 'weekly' ? 'أسبوعياً' : 'كل أسبوعين'}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>تاريخ البدء: {formatDate(sub.startDate)}</span>
                                {sub.quantity && sub.quantity > 0 && sub.itemPrice ? (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="bg-indigo-50/70 text-indigo-700 border border-indigo-100/40 px-1.5 py-0.5 rounded text-[9.5px] font-black mr-0.5">
                                      {sub.quantity} قطع × {formatCurrency(sub.itemPrice)}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                              {/* 2. Delivery Date & remaining days next to it */}
                              <p className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-indigo-800 font-extrabold">تاريخ التسليم:</span>
                                <span className="font-mono text-indigo-950 font-black bg-indigo-50/50 px-1.5 py-0.5 rounded mr-1">
                                  {formatDate(getNextDeliveryDate(sub).toISOString())}
                                </span>
                                {sub.status === 'active' ? (() => {
                                  const nextDate = getNextDeliveryDate(sub);
                                  const daysRemaining = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                  if (daysRemaining < 0) return <span className="font-black text-[9.5px] bg-red-100/80 text-red-700 px-2 py-0.5 rounded-full border border-red-200/40">متأخر</span>;
                                  if (daysRemaining === 0) return <span className="font-black text-[9.5px] bg-amber-100/80 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200/40">اليوم!</span>;
                                  return <span className="font-black text-[9.5px] bg-indigo-55 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/30">يتبقى {daysRemaining} يوم</span>;
                                })() : (
                                  <span className="font-black text-[9.5px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">الاشتراك موقف</span>
                                )}
                              </p>

                              {/* 3. Price Explanation is inlined above for compactness */}
                              {sub.quantity && sub.quantity > 0 && sub.itemPrice && false ? (
                                <p className="flex items-center gap-1.5 flex-wrap mt-1 text-[10.5px] font-bold text-slate-500 bg-slate-50 border border-slate-100/70 p-1.5 rounded-lg w-fit">
                                  <span className="text-gray-400">شرح السعر:</span>
                                  <span className="bg-indigo-55 text-indigo-700 font-mono font-black px-1.5 py-0.5 rounded text-[10px]">
                                    {sub.quantity} قطع × {formatCurrency(sub.itemPrice)}
                                  </span>
                                  <span className="text-gray-400">({sub.quantity} قطع | القطعة: {formatCurrency(sub.itemPrice)})</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            <span className={clsx("px-2 py-1 rounded-md text-[9px] font-black w-fit", sub.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100")}>
                              {sub.status === 'active' ? 'مفعل' : 'موقف'}
                            </span>
                            <span className={clsx("px-2 py-1 rounded-md text-[9px] font-black w-fit border", sub.isAutoCharge === true ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-gray-100 text-gray-600 border-gray-200/50")}>
                              {sub.isAutoCharge === true ? '🔄 ترحيل تلقائي' : '👤 ترحيل يدوي'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-100 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 block font-bold mb-0.5">المجموع الإجمالي</span>
                            <span className="font-black text-sm text-indigo-800 font-mono block" dir="ltr">{formatCurrency(sub.amount)}</span>

                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setNewSubForm({
                                  ...sub,
                                  nextDeliveryDate: getNextDeliveryDate(sub).toISOString().split('T')[0],
                                  itemPrice: sub.itemPrice || sub.amount,
                                  quantity: sub.quantity || 1,
                                  startDate: sub.startDate.split('T')[0],
                                  endDate: sub.endDate ? sub.endDate.split('T')[0] : ''
                                });
                                setImmediatelyChargeToDues(false);
                                setShowAddSubscriptionModal(true);
                              }}
                              className="bg-blue-50/20 hover:bg-blue-100 text-blue-600 p-2 rounded-xl border border-blue-105 transition-colors"
                              title="تعديل الاشتراك"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                            <button 
                              onClick={() => {
                                const clone = [...subscriptions];
                                const tgt = clone.find(s => s.id === sub.id);
                                if (tgt) {
                                  tgt.status = tgt.status === 'active' ? 'paused' : 'active';
                                  setSubscriptions(clone);
                                  saveSubscription(tgt);
                                  showToast({ message: tgt.status === 'active' ? 'تم التفعيل' : 'تم الإيقاف', type: 'success' });
                                }
                              }}
                              className={clsx(
                                "p-2 border rounded-xl transition-all",
                                sub.status === 'active' 
                                  ? "border-amber-100 text-amber-600 bg-amber-50/30 hover:bg-amber-100 hover:text-amber-800" 
                                  : "border-emerald-100 text-emerald-600 bg-emerald-50/30 hover:bg-emerald-100 hover:text-emerald-805"
                              )}
                              title={sub.status === 'active' ? 'إيقاف الاشتراك مؤقتاً' : 'تفعيل الاشتراك'}
                            >
                              {sub.status === 'active' ? <Pause size={12} className="stroke-[2.5]" /> : <Play size={12} className="stroke-[2.5]" />}
                            </button>
                            <button 
                               onClick={async () => {
                                 const isConfirmed = await confirm({
                                   title: getNextDeliveryDate(sub) > new Date() ? 'تنبيه بالترحيل المبكر' : 'ترحيل دفعة اشتراك دوري',
                                   message: getNextDeliveryDate(sub) > new Date()
                                     ? `تنبيه: تاريخ الاستحقاق القادم لم يحن بعد (${formatDate(getNextDeliveryDate(sub).toISOString())}). \n\nهل أنت متأكد من رغبتك في ترحيل هذه الدفعة مبكراً كفاتورة مستحقة وتنزيلها فوراً بالديون؟`
                                     : `هل أنت متأكد من ترحيل دفعة جديدة بقيمة ${formatCurrency(sub.amount)} كفاتورة مستحقة فوراً في ذمة هذا العميل؟ \n(سيؤدي هذا إلى تقييد المبلغ في ديونه وتحديث تاريخ الدورة القادمة)`,
                                   confirmText: 'تأكيد الترحيل',
                                   cancelText: 'إلغاء',
                                   isDestructive: false
                                 });
                                 if (isConfirmed) {
                                   chargeSubscriptionPeriod(sub);
                                   setSubscriptions(getSubscriptions(true));
                                   showToast({ message: 'تم ترحيل دفعة الاشتراك بنجاح وقيدها في ديون الزبون بقيمة ' + formatCurrency(sub.amount), type: 'success' });
                                 }
                               }}
                                disabled={sub.status !== 'active' || getNextDeliveryDate(sub) > new Date()}
                               className={clsx(
                                 "flex items-center gap-1.5 px-2 py-1.5 border rounded-xl transition text-[11px] font-black cursor-pointer",
                                 sub.status === 'active' && getNextDeliveryDate(sub) <= new Date()
                                   ? "border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer"
                                   : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                               )}
                               title={sub.status !== 'active' ? 'الاشتراك متوقف' : getNextDeliveryDate(sub) > new Date() ? 'تم الترحيل لهذا الشهر أو مجمّد' : 'القيد الفوري في الديون المستحقة'}
                             >
                               <CreditCard size={12} className="stroke-[2.5]" />
                               <span>ترحيل دفعة</span>
                             </button>

                             <button 
                               onClick={async () => {
                                 if (sub.isArchived) {
                                   try {
                                     const { unarchiveSubscription } = await import('../lib/subscriptions');
                                     unarchiveSubscription(sub.id);
                                     setSubscriptions(getSubscriptions(true));
                                     showToast({ message: 'تم إعادة تفعيل الاشتراك واستعادة طلباته', type: 'success' });
                                   } catch (e) { console.error(e); }
                                 } else {
                                   const isConfirmed = await confirm({
                                     title: 'أرشفة الاشتراك',
                                     message: 'هل أنت متأكد من أرشفة هذا الاشتراك بشكل نهائي؟ سيتم أرشفة جميع الطلبات والفواتير المرتبطة به ولن يظهر بعد الآن.',
                                     confirmText: 'نعم، أرشفة',
                                     cancelText: 'إلغاء',
                                     isDestructive: true
                                   });
                                   if (isConfirmed) {
                                     archiveSubscription(sub.id);
                                     setSubscriptions(getSubscriptions(true));
                                     showToast({ message: 'تم أرشفة الاشتراك وطلباته بنجاح', type: 'info' });
                                   }
                                 }
                               }}
                               className={clsx("p-2 border rounded-xl transition-colors", sub.isArchived ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100")}
                               title={sub.isArchived ? "استعادة من الأرشيف" : "أرشفة"}
                             >
                               {sub.isArchived ? <RefreshCw size={12} /> : <Trash2 size={12} />}
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
            })()}
          </div>
        )}
        {activeTab === 'trash' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Trash2 size={18} className="stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-800">سلة المحذوفات</h3>
                <p className="text-[11px] text-gray-500 font-medium">يمكنك استعادة الطلبات والاشتراكات المحذوفة من هنا في حال تم حذفها بالخطأ.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const archivedOrders = db.getOrders(true).filter(o => o.isArchived);
                
                if (archivedOrders.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                      <Trash2 className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">سلة المحذوفات فارغة</p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid gap-3">
                    {archivedOrders.map((o) => {
                       const invoice = db.getInvoices(true).find(i => i.orderId === o.id);
                       const customerName = customersList.find(c => c.id === o.customerId)?.fullName || 'غير معروف';
                       return (
                         <div key={o.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm gap-4">
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded leading-none">{o.orderNumber || 'رقم الطلب'}</span>
                               <span className="text-sm font-bold text-gray-900">{customerName}</span>
                             </div>
                             <div className="text-xs text-gray-500 mt-1">
                               تاريخ: {formatDate(o.createdAt)} {o.isSubscription && <span className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mr-2 text-[10px] font-bold">اشتراك دوري</span>}
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <button
                               onClick={async () => {
                                  const confirmed = await confirm({
                                     title: 'استعادة الطلب',
                                     message: 'هل ترغب حقاً في استعادة هذا الطلب إلى قائمة الطلبات النشطة وإعادة حساب ديونه؟',
                                     confirmText: 'نعم، استعادة'
                                  });
                                  if (confirmed) {
                                     // Restore Logic
                                     db.restoreOrderAndInvoices(o.id);
                                     showToast({ message: 'تم استعادة الطلب بنجاح', type: 'success' });
                                     // Quick re-render hack:
                                     setActiveTab('attire'); setTimeout(() => setActiveTab('trash'), 0);
                                  }
                               }}
                               className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-bold transition flex items-center gap-1"
                             >
                               <RefreshCw size={12} /> استعادة
                             </button>
                             <button
                               onClick={async () => {
                                  const confirmed = await confirm({
                                     title: 'حذف نهائي',
                                     message: 'تحذير: سيتم حذف هذا الطلب نهائياً ولا يمكن التراجع عن ذلك. المدفوعات المسجلة فيه ستختفي أيضاً.',
                                     confirmText: 'حذف نهائي',
                                     isDestructive: true
                                  });
                                  if (confirmed) {
                                     // Hard Delete
                                     db.deleteOrder(o.id);
                                     const remainingInvs = db.getInvoices(true).filter(i => i.orderId !== o.id);
                                     localStorage.setItem('khayatpro_invoices', JSON.stringify(remainingInvs));
                                     showToast({ message: 'تم الحذف النهائي', type: 'info' });
                                     setActiveTab('attire'); setTimeout(() => setActiveTab('trash'), 0);
                                  }
                               }}
                               className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition flex items-center gap-1"
                             >
                               <Trash2 size={12} /> حذف نهائي
                             </button>
                           </div>
                         </div>
                       );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Save Action */}
      <button 
        onClick={saveSettings} 
        className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-200/50 transform active:scale-99"
      >
        <Save className="w-5 h-5 stroke-[2.5]" />
        <span>حفظ كافة إعدادات الورشة والفواتير</span>
      </button>

      {/* Subscription Modal */}
      {showAddSubscriptionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600 stroke-[2.5]" /> 
                {newSubForm.id ? 'تعديل الاشتراك' : 'إضافة اشتراك دائم'}
              </h3>
              <button onClick={() => setShowAddSubscriptionModal(false)} className="text-indigo-400 hover:text-indigo-600">×</button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="relative z-50">
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">الزبون المستفيد</label>
                <div 
                  className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-medium focus-within:ring-2 focus-within:ring-indigo-500 flex items-center justify-between cursor-text"
                >
                  <input
                    type="text"
                    placeholder="ابحث عن اسم الزبون..."
                    className="bg-transparent border-none outline-none w-full"
                    value={customerSearchTerm}
                    onChange={e => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                      setNewSubForm({...newSubForm, customerId: undefined, customerName: undefined}); // Reset selection if typing
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                  {newSubForm.customerId && <Check size={14} className="text-emerald-500" />}
                </div>
                
                {showCustomerDropdown && (
                  <>
                  <div className="fixed inset-0 z-[5]" onClick={() => setShowCustomerDropdown(false)}></div>
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {customersList.filter(c => c.fullName.toLowerCase().includes(customerSearchTerm.toLowerCase())).length === 0 ? (
                      <div className="p-3 text-center text-[10px] text-gray-400">لا يوجد زبون بهذا الاسم</div>
                    ) : (
                      customersList.filter(c => c.fullName.toLowerCase().includes(customerSearchTerm.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition border-b border-gray-50 last:border-b-0"
                          onClick={() => {
                            setNewSubForm({...newSubForm, customerId: c.id, customerName: c.fullName});
                            setCustomerSearchTerm(c.fullName);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div className="font-bold">{c.fullName}</div>
                          <div className="text-[9px] text-gray-400">{c.phone}</div>
                        </button>
                      ))
                    )}
                  </div>
                  </>
                )}
              </div>

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
                onClick={() => {
                  if (!newSubForm.customerId || !newSubForm.attireType || !newSubForm.amount || !newSubForm.startDate) {
                    showToast({ message: 'الرجاء ملء كافة الحقول', type: 'error' });
                    return;
                  }
                  
                  const startD = new Date(newSubForm.startDate);
                  const endD = newSubForm.endDate ? new Date(newSubForm.endDate) : undefined;
                  
                  if (endD && endD <= startD) {
                    showToast({ message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', type: 'error' });
                    return;
                  }

                  let finalStatus = newSubForm.status || 'active';
                  if (newSubForm.id) {
                    const existing = getSubscriptions().find(x => x.id === newSubForm.id);
                    if (existing && existing.status === 'paused') {
                      finalStatus = 'active';
                      // Keep the notification simple or maybe use a special one
                    }
                  }

                  const sub: Subscription = {
                    id: newSubForm.id || generateId(),
                    customerId: newSubForm.customerId!,
                    customerName: newSubForm.customerName!,
                    attireType: newSubForm.attireType!,
                    amount: newSubForm.amount,
                    itemPrice: newSubForm.itemPrice,
                    quantity: newSubForm.quantity,
                    frequency: newSubForm.frequency as any || 'monthly',
                    startDate: startD.toISOString(),
                    endDate: endD ? endD.toISOString() : undefined,
                    nextDeliveryDate: newSubForm.nextDeliveryDate ? new Date(newSubForm.nextDeliveryDate).toISOString() : undefined,
                    lastGeneratedDate: newSubForm.lastGeneratedDate || null,
                    status: finalStatus as any
                  };
                  saveSubscription(sub);
                  
                  if (finalStatus === 'active' && newSubForm.status === 'paused') {
                     showToast({ message: 'تم تفعيل الاشتراك تلقائياً بعد التعديل', type: 'success' });
                  }
                  let chargeSuccess = false;
                  if (immediatelyChargeToDues) {
                    try {
                      chargeSubscriptionPeriod(sub, startD);
                      chargeSuccess = true;
                    } catch (e) {
                      console.error("Failed to charge immediate period in settings", e);
                    }
                  }
                  setSubscriptions(getSubscriptions(true));
                  setShowAddSubscriptionModal(false);
                  setNewSubForm({ frequency: 'monthly', amount: 0, itemPrice: 0, quantity: 1, status: 'active', attireType: 'اشتراك تلقائي' });
                  showToast({ 
                    message: chargeSuccess 
                      ? 'تم تفعيل الاشتراك وتنزيل أول فاتورة مستحقة في ديون العميل بنجاح' 
                      : 'تم تفعيل الاشتراك التلقائي بنجاح', 
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
