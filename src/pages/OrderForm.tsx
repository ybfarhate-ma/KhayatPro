import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../store/db';
import { generateId, formatCurrency, compressImage } from '../lib/utils';
import { Customer, AttireType, MEASUREMENT_FIELDS, Order, Invoice, CustomerMeasurementProfile, AttireTemplate, CostFieldSetting, DEFAULT_COST_FIELDS, CostDetails } from '../types';
import { Save, ArrowRight, User, Scissors, Calculator, ChevronDown, ChevronUp, Ruler, X, Search, Sparkles, Check, UserPlus, Info } from 'lucide-react';
import { clsx } from 'clsx';
import InteractiveMannequin from '../components/Mannequin';

import { useUI } from '../store/ui';

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

export default function OrderForm({ isEdit = false }: { isEdit?: boolean }) {
  const navigate = useNavigate();
  const { id: editOrderId } = useParams();
  const location = useLocation();
  const { showToast } = useUI();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<AttireTemplate[]>([]);
  const [expandedSection, setExpandedSection] = useState<'info' | 'measurements' | 'pricing'>('info');
  const [activeStyle, setActiveStyle] = useState<'all' | 'traditional' | 'modern'>('all');
  const [activeGender, setActiveGender] = useState<'all' | 'male_adult' | 'female_adult' | 'male_teen' | 'female_teen' | 'male_child' | 'female_child' | 'infant'>('all');
  const [templateSearch, setTemplateSearch] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);

  // Form State
  const initialCustomerId = location.state?.selectedCustomerId || '';
  const [customerId, setCustomerId] = useState(initialCustomerId);
  
  useEffect(() => {
    const allCustomers = db.getCustomers();
    setCustomers(allCustomers);
    
    if (initialCustomerId) {
      const c = allCustomers.find(cu => cu.id === initialCustomerId);
      if (c) setSearchTerm(c.fullName);
    }
  }, [initialCustomerId]);
  const [attireType, setAttireType] = useState<string>(''); // Holds template ID
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  const [measurements, setMeasurements] = useState<Record<string, string | number>>({});
  
  const [costFieldsSettings, setCostFieldsSettings] = useState<CostFieldSetting[]>(DEFAULT_COST_FIELDS);
  const [costs, setCosts] = useState<CostDetails>({
    fields: {},
    taxRate: 0,
    totalPriceOverride: undefined
  });

  const currency = localStorage.getItem('khayatpro_setting_currency') || 'درهم';

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [resultImages, setResultImages] = useState<string[]>([]);

  useEffect(() => {
    setCustomers(db.getCustomers());
    const loadedTemplates = db.getAttireTemplates();
    setTemplates(loadedTemplates);

    // Load Cost Field Settings
    const storedFields = localStorage.getItem('khayatpro_setting_cost_fields');
    if (storedFields) {
      try { setCostFieldsSettings(JSON.parse(storedFields)); } catch (e) {}
    }
    
    // Set default if None
    if (!isEdit && loadedTemplates.length > 0 && !attireType) {
      setAttireType(loadedTemplates[0].id);
    }
    
    // Default taxes & margin field
    if (!isEdit) {
      const defaultTax = parseFloat(localStorage.getItem('khayatpro_setting_tax') || '0');
      const defaultMarginVal = parseFloat(localStorage.getItem('khayatpro_setting_margin') || '0');
      
      setCosts(prev => ({
        ...prev,
        taxRate: defaultTax,
        fields: {
          ...prev.fields,
          profit: defaultMarginVal // default profit margin
        }
      }));
    }

    if (isEdit && editOrderId) {
      const order = db.getOrders().find(o => o.id === editOrderId);
      if (order) {
        setCustomerId(order.customerId);
        setAttireType(order.attireType);
        setDescription(order.description || '');
        setDeliveryDate(
          order.deliveryDate 
            ? order.deliveryDate.split('T')[0] 
            : (order as any).dueDate 
              ? (order as any).dueDate.split('T')[0] 
              : (order as any).orderDate
                ? (order as any).orderDate.split('T')[0]
                : ''
        );
        setMeasurements((order.measurements || {}) as Record<string, string>);
        
        // Migration for legacy costs and sub-generated orders
        const legacyCosts = order.costs as any || (order as any).costDetails || {};
        if (!legacyCosts || !legacyCosts.fields) {
           setCosts({
             taxRate: legacyCosts.taxRate || 0,
             fields: {
               fabric: legacyCosts.fabricCost || 0,
               accessories: legacyCosts.accessoriesCost || 0,
               embroidery: legacyCosts.embroideryCost || 0,
               labor: legacyCosts.laborCost || 0,
               profit: legacyCosts.profitMarginValue || legacyCosts.totalCost || order.finalPrice || (order as any).totalAmount || 0,
               other: legacyCosts.otherExpenses || 0
             }
           });
        } else {
           setCosts(order.costs || { fields: {}, taxRate: 0 });
        }

        if (order.referenceImages) setReferenceImages(order.referenceImages);
        if (order.resultImages) setResultImages(order.resultImages);
      }
    }
  }, [isEdit, editOrderId]);

  // --- Auto-fill measurements logic ONLY if new order ---
  useEffect(() => {
    if (!isEdit && attireType) {
      const selectedTemplate = templates.find(t => t.id === attireType);
      
      // 1. Start with fixed measurements from template if they exist
      let newMeasurements: Record<string, string | number> = {};
      if (selectedTemplate?.fixedMeasurements) {
        newMeasurements = { ...selectedTemplate.fixedMeasurements };
      }

      // 2. Override with customer's last profile if available (if customer is selected)
      if (customerId) {
        const profiles = db.getMeasurementProfiles(customerId);
        const specificProfile = profiles.find(p => p.attireType === attireType);
        if (specificProfile) {
          newMeasurements = { ...newMeasurements, ...(specificProfile.measurements as Record<string, string | number>) };
        }
      }
      
      setMeasurements(newMeasurements);
    }
  }, [customerId, attireType, isEdit, templates]);

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  const handleCostFieldChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setCosts(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [id]: num
      }
    }));
  };

  const handleTaxChange = (value: string) => {
    setCosts(prev => ({ ...prev, taxRate: parseFloat(value) || 0 }));
  };

  // Synchronize search term when customerId changes
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const c = customers.find(item => item.id === customerId);
      if (c) {
        setSearchTerm(c.fullName);
      }
    } else if (!customerId) {
      setSearchTerm('');
    }
  }, [customerId, customers]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const activeTemplate = templates.find(t => t.id === attireType) || templates[0];

  // Pricing Engine Math (Dynamic)
  const taxableSubtotal = Object.entries(costs.fields).reduce((sum, [id, val]) => {
    const setting = costFieldsSettings.find(f => f.id === id);
    if (!setting || (setting.isEnabled && setting.isTaxable)) return sum + ((val as number) || 0);
    return sum;
  }, 0);

  const nonTaxableSubtotal = Object.entries(costs.fields).reduce((sum, [id, val]) => {
    const setting = costFieldsSettings.find(f => f.id === id);
    if (setting && setting.isEnabled && !setting.isTaxable) return sum + ((val as number) || 0);
    return sum;
  }, 0);

  const subtotalBeforeTax = taxableSubtotal + nonTaxableSubtotal;
  const taxAmount = taxableSubtotal * (costs.taxRate / 100);
  const finalPrice = costs.totalPriceOverride !== undefined ? costs.totalPriceOverride : (subtotalBeforeTax + taxAmount);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) return showToast({ message: 'الرجاء اختيار العميل', type: 'error' });

    const orderId = isEdit && editOrderId ? editOrderId : generateId();
    
    // Save Order
    const newOrder: Order = {
      id: orderId,
      orderNumber: isEdit ? (db.getOrders().find(o=>o.id===orderId)?.orderNumber || '') : `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId,
      attireType,
      description,
      status: isEdit ? (db.getOrders().find(o=>o.id===orderId)?.status || 'new') : 'new',
      priority: 'medium',
      createdAt: isEdit ? (db.getOrders().find(o=>o.id===orderId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      deliveryDate: deliveryDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      measurements: measurements,
      costs: costs,
      totalCost: subtotalBeforeTax,
      finalPrice,
      referenceImages,
      resultImages
    };
    db.saveOrder(newOrder);

    // Update / Save Measurement Profile for future use
    const profiles = db.getMeasurementProfiles(customerId);
    const existingProfile = profiles.find(p => p.attireType === attireType);
    
    db.saveMeasurementProfile({
      id: existingProfile ? existingProfile.id : generateId(),
      customerId,
      attireType: attireType as any,
      measurements,
      updatedAt: new Date().toISOString()
    });

    if (!isEdit) {
      // Generate Invoice Automatically for NEW orders
      const newInvoice: Invoice = {
        id: generateId(),
        invoiceNumber: `INV-${newOrder.orderNumber.split('-')[1]}`,
        orderId,
        customerId,
        createdAt: new Date().toISOString(),
        totalAmount: finalPrice,
        amountPaid: 0,
        remainingAmount: finalPrice,
        status: 'unpaid',
        payments: []
      };
      db.saveInvoice(newInvoice);
    } else {
      // Update existing invoice total
      const invoices = db.getInvoices();
      const existingInvoice = invoices.find(i => i.orderId === orderId);
      if (existingInvoice) {
        existingInvoice.totalAmount = finalPrice;
        existingInvoice.remainingAmount = finalPrice - existingInvoice.amountPaid;
        db.saveInvoice(existingInvoice);
      }
    }

    showToast({ message: isEdit ? 'تم تحديث الطلب بنجاح' : 'تم إضافة الطلب بنجاح', type: 'success' });
    navigate('/orders');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
          <ArrowRight className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-xl font-bold text-primary-800">{isEdit ? 'تعديل الطلب' : 'تفصيل طلب جديد'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Section 1: Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'info' ? '' as any : 'info')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-2 text-primary-800 font-bold">
              <User className="w-5 h-5 text-primary-600" />
              1. معلومات العميل والطلب
            </div>
            {expandedSection === 'info' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <div className={clsx("p-4 space-y-4", expandedSection !== 'info' && "hidden")}>
            <div className="space-y-1 relative" dir="rtl">
              <label className="text-sm font-medium text-gray-700 block text-right">العميل *</label>
              
              {selectedCustomer ? (
                // Premium Selected State
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100/90 rounded-xl flex items-center justify-center text-indigo-700 shadow-3xs">
                      <User size={18} className="stroke-[2.5]" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-extrabold text-sm text-slate-800">{selectedCustomer.fullName}</h4>
                      <p className="text-[10.5px] text-slate-500 font-mono font-bold" dir="ltr">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-150 text-indigo-800 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <Check size={12} className="stroke-[3.0]" />
                      <span>تم ربطه بالطلب</span>
                    </span>
                    
                    {!isEdit && (
                      <button 
                        type="button"
                        onClick={() => {
                          setCustomerId('');
                          setSearchTerm('');
                          setCustomerSuggestions([]);
                        }}
                        className="p-1.5 hover:bg-slate-200/50 rounded-xl transition text-slate-500 hover:text-red-600 focus:outline-none"
                        title="إلغاء اختيار العميل"
                      >
                        <X size={16} className="stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Autocomplete predictive input
                <div className="relative">
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-right placeholder:text-gray-300 font-medium bg-white"
                      placeholder="ابحث باسم العميل أو رقم هاتفه..."
                      value={searchTerm}
                      onChange={e => {
                        const val = e.target.value;
                        setSearchTerm(val);
                        if (!val.trim()) {
                          setCustomerSuggestions([]);
                          return;
                        }
                        const normVal = normalizeArabic(val);
                        const matches = customers.filter(c => {
                          const normName = normalizeArabic(c.fullName);
                          return normName.includes(normVal) || c.phone.replace(/\s+/g, '').includes(val.replace(/\s+/g, ''));
                        });
                        setCustomerSuggestions(matches);
                      }}
                      onFocus={() => {
                        setShowCustomerSuggestions(true);
                        // Trigger initial list if terms exist
                        if (searchTerm.trim()) {
                          const normVal = normalizeArabic(searchTerm);
                          const matches = customers.filter(c => {
                            const normName = normalizeArabic(c.fullName);
                            return normName.includes(normVal) || c.phone.includes(searchTerm);
                          });
                          setCustomerSuggestions(matches);
                        } else {
                          // Show all up to 5 customers as quick options
                          setCustomerSuggestions(customers.slice(0, 5));
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 250)}
                      autoComplete="off"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Search size={17} />
                    </div>
                  </div>
                  
                  {/* Suggestions Dropdown Card */}
                  {showCustomerSuggestions && (
                    <div className="absolute right-0 left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-50 flex flex-col text-right animate-in fade-in slide-in-from-top-2 duration-150">
                      
                      {searchTerm.trim() && customerSuggestions.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 font-bold space-y-2">
                          <p className="text-xs">لم نجد زبوناً مسجلاً مطابقاً لهذا الاسم</p>
                          <button
                            type="button"
                            onClick={() => navigate('/customers/new')}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] px-3.5 py-2 rounded-xl font-black transition shadow-4xs"
                          >
                            <UserPlus size={12} className="stroke-[2.5]" />
                            <span>سجل هذا الزبون ومقاساته الآن</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="p-2.5 bg-slate-50 text-[10px] text-slate-400 font-black flex justify-between items-center" dir="rtl">
                            <span>{searchTerm.trim() ? "نتائج البحث المقترحة" : "أحدث مسجلي زبناء الورشة"}</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                              {customerSuggestions.length} عملاء
                            </span>
                          </div>
                          
                          {customerSuggestions.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => {
                                setCustomerId(c.id);
                                setSearchTerm(c.fullName);
                                setCustomerSuggestions([]);
                                setShowCustomerSuggestions(false);
                                showToast({ message: `تم ربط العميل (${c.fullName}) وتعبئة مقاسات تفصيله تلقائياً`, type: 'success' });
                              }}
                              className="w-full text-right p-3 hover:bg-indigo-50/40 flex justify-between items-center transition"
                              dir="rtl"
                            >
                              <div className="space-y-0.5">
                                <p className="text-xs font-black text-slate-800">{c.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-extrabold font-mono" dir="ltr">{c.phone}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {c.gender === 'female' ? (
                                  <span className="text-[8px] bg-pink-50 text-pink-600 border border-pink-100/50 px-1.5 py-0.5 rounded font-bold">زبونة</span>
                                ) : (
                                  <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100/50 px-1.5 py-0.5 rounded font-bold">زبون</span>
                                )}
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-lg">
                                  ربط بالطلب
                                </span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                 <label className="text-sm font-black text-slate-800">نوع اللباس والموديل</label>
                 
                 {/* Combined Filter Row */}
                 <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-2">
                    {/* Style Toggles (Small) */}
                    <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-4xs shrink-0 w-full md:w-auto">
                       {[
                         { id: 'all', label: 'الجميع' },
                         { id: 'traditional', label: 'تقليدي' },
                         { id: 'modern', label: 'عصري' },
                       ].map((btn) => (
                         <button
                           key={btn.id}
                           type="button"
                           onClick={() => setActiveStyle(btn.id as any)}
                           className={clsx(
                             "flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer whitespace-nowrap",
                             activeStyle === btn.id 
                               ? 'bg-indigo-600 text-white shadow-sm' 
                               : 'text-gray-400 hover:text-gray-600'
                           )}
                         >
                           {btn.label}
                         </button>
                       ))}
                    </div>

                    {/* Detailed Category (Compact Dropdown) */}
                    <div className="relative shrink-0 w-full md:w-[150px]">
                      <select
                        value={activeGender}
                        onChange={(e) => setActiveGender(e.target.value as any)}
                        className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl pr-3 pl-7 py-2 text-[10px] font-black text-indigo-800 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
                      >
                        <option value="all">كل الفئات</option>
                        <optgroup label="الكبار">
                          <option value="male_adult">رجالي</option>
                          <option value="female_adult">نسائي</option>
                        </optgroup>
                        <optgroup label="اليافعين">
                          <option value="male_teen">شباب</option>
                          <option value="female_teen">شابات</option>
                        </optgroup>
                        <optgroup label="الأطفال">
                          <option value="male_child">أولاد</option>
                          <option value="female_child">بنات</option>
                        </optgroup>
                        <option value="infant">مواليد</option>
                      </select>
                      <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 w-3 h-3 pointer-events-none" />
                    </div>

                    {/* Search Field (Expands to fill remaining space) */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input 
                        type="text" 
                        placeholder="ابحث..."
                        className="w-full bg-white border border-gray-100 rounded-xl pr-9 pl-3 py-2 text-[10px] outline-none focus:border-indigo-500 transition-all font-bold"
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                      />
                    </div>
                 </div>
              </div>

              <div className="flex gap-2 text-sm overflow-x-auto pb-2 scrollbar-hide py-1">
                {templates
                  .filter(t => {
                    const matchesStyle = activeStyle === 'all' || t.style === activeStyle;
                    const matchesGender = activeGender === 'all' || t.gender === activeGender;
                    const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase());
                    return matchesStyle && matchesGender && matchesSearch;
                  })
                  .map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setAttireType(template.id);
                        showToast({ message: `تم اختيار موديل: ${template.name}`, type: 'info' });
                      }}
                      className={clsx(
                        "px-4 py-2.5 rounded-xl whitespace-nowrap transition-all border text-xs font-black flex flex-col items-center gap-1 min-w-[100px]",
                        attireType === template.id 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105" 
                          : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <span>{template.name}</span>
                      <span className={clsx(
                        "text-[8px] uppercase tracking-tighter opacity-70",
                        attireType === template.id ? "text-white" : "text-gray-400"
                      )}>
                        {template.style === 'traditional' ? 'تقليدي' : 'عصري'}
                      </span>
                    </button>
                  ))}
                  {templates.filter(t => (activeStyle === 'all' || t.style === activeStyle) && t.name.includes(templateSearch)).length === 0 && (
                    <div className="text-[10px] text-gray-400 font-bold py-3 px-2">لم نجد موديلات مطابقة لهذا التصنيف</div>
                  )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">تاريخ التسليم المتوقع</label>
              <input 
                type="date" 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary-500"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">وصف دقيق للتفصيل</label>
              <textarea 
                rows={2}
                placeholder="مثال: جلابة راندة لون أزرق ملكي بخيط ذهبي..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary-500 resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button type="button" onClick={() => setExpandedSection('measurements')} className="text-primary-600 font-medium text-sm flex items-center gap-1">
                التالي: القياسات <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Measurements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'measurements' ? '' as any : 'measurements')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-2 text-primary-800 font-bold">
              <Ruler className="w-5 h-5 text-primary-600" />
              2. التقاط القياسات
            </div>
            {expandedSection === 'measurements' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <div className={clsx("p-4 flex flex-col gap-6", expandedSection !== 'measurements' && "hidden")}>
             
             <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                   <div className="bg-white px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2 shadow-4xs">
                      <Sparkles className="text-indigo-600" size={16} />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-indigo-700 uppercase leading-none">الموديل المختار حالياً</span>
                         <span className="text-xs font-black text-slate-800">{activeTemplate?.name || 'غير محدد'}</span>
                      </div>
                   </div>

                   {/* Style Selection Row */}
                   <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                      {[
                        { id: 'all', label: 'الجميع' },
                        { id: 'traditional', label: 'تقليدي' },
                        { id: 'modern', label: 'عصري' },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setActiveStyle(btn.id as any)}
                          className={clsx(
                            "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                            activeStyle === btn.id 
                              ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' 
                              : 'text-gray-500 hover:text-gray-700'
                          )}
                        >
                          {btn.label}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Granular Gender/Age Filter Row */}
                <div className="space-y-1.5">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">تحديد الفئة والمقاس</span>
                   <div className="flex flex-wrap gap-2">
                     {[
                       { id: 'all', label: 'الكل' },
                       { id: 'male_adult', label: 'رجالي' },
                       { id: 'female_adult', label: 'نسائي' },
                       { id: 'male_teen', label: 'شباب' },
                       { id: 'female_teen', label: 'شابات' },
                       { id: 'male_child', label: 'أولاد صغار' },
                       { id: 'female_child', label: 'بنات صغار' },
                       { id: 'infant', label: 'مواليد' },
                     ].map((btn) => (
                       <button
                         key={btn.id}
                         type="button"
                         onClick={() => setActiveGender(btn.id as any)}
                         className={clsx(
                           "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border",
                           activeGender === btn.id 
                             ? 'bg-indigo-600 text-white shadow-sm border-indigo-600' 
                             : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                         )}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Template Selection / Search */}
                <div className="relative">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                   <input 
                     type="text" 
                     placeholder="ابحث عن موديل آخر بتفصيل مختلف..."
                     className="w-full bg-white border border-gray-100 rounded-xl pr-9 pl-3 py-2 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all shadow-4xs"
                     value={templateSearch}
                     onChange={e => setTemplateSearch(e.target.value)}
                   />
                </div>

                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                   {templates
                     .filter(t => {
                       const matchesStyle = activeStyle === 'all' || t.style === activeStyle;
                       const matchesGender = activeGender === 'all' || t.gender === activeGender;
                       const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase());
                       return matchesStyle && matchesGender && matchesSearch;
                     })
                     .map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setAttireType(t.id);
                            showToast({ message: `تم تغيير الموديل إلى: ${t.name}`, type: 'info' });
                          }}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all border whitespace-nowrap",
                            attireType === t.id 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-100' 
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-slate-50'
                          )}
                        >
                          {t.name}
                        </button>
                     ))}
                   {templates.filter(t => (activeStyle === 'all' || t.style === activeStyle) && (activeGender === 'all' || t.gender === activeGender) && t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                      <span className="text-[10px] text-gray-400 font-bold p-2">لا توجد موديلات مطابقة لهذا البحث</span>
                   )}
                </div>
             </div>

             {/* Interactive Component */}
             <div className="w-full max-w-[1000px] mx-auto">
                <InteractiveMannequin 
                  template={activeTemplate}
                  measurements={measurements} 
                  onChange={handleMeasurementChange} 
                />
             </div>
             
             {/* Fallback explicit fields just in case they prefer typing */}
             <div className="grid grid-cols-2 gap-3 mt-4">
                {activeTemplate?.points.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs text-gray-600 font-medium truncate block" title={field.label}>{field.label}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        dir="ltr"
                        name={`measure_${field.id}`}
                        className="w-full border border-gray-200 rounded-xl pl-3 pr-8 py-2 outline-none focus:border-primary-500 text-left bg-gray-50/50 font-mono"
                        value={measurements[field.id] || ''}
                        onChange={e => handleMeasurementChange(field.id, e.target.value)}
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold select-none">cm</span>
                    </div>
                  </div>
                ))}
             </div>

             <div className="space-y-1">
               <label className="text-xs text-gray-600 font-medium">ملاحظات إضافية للقياس (مثل: واسع من التحت)</label>
               <input 
                 type="text"
                 className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-500"
                 value={measurements['custom_notes'] || ''}
                 onChange={e => handleMeasurementChange('custom_notes', e.target.value)}
               />
             </div>

             <div className="space-y-4 pt-4 border-t border-gray-100">
               <div>
                 <label className="text-xs text-gray-800 font-bold block mb-2">صور طلب العميل (المرجع)</label>
                 <input 
                   type="file"
                   multiple
                   accept="image/*"
                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mb-2"
                   onChange={async (e) => {
                     if (e.target.files && e.target.files.length > 0) {
                       try {
                         const promises = Array.from(e.target.files).map(f => compressImage(f as File));
                         const base64s = await Promise.all(promises);
                         setReferenceImages(prev => [...prev, ...base64s]);
                         showToast({ message: 'تم إرفاق صور طلب العميل وحفظها بنجاح', type: 'success' });
                       } catch (err) {
                          showToast({ message: 'خطأ في معالجة الصور', type: 'error' });
                       }
                     }
                   }}
                 />
                 {referenceImages.length > 0 && (
                   <div className="flex gap-2 flex-wrap">
                     {referenceImages.map((src, i) => (
                       <div key={i} className="relative group">
                         <img src={src} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                         <button 
                           type="button" 
                           onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))}
                           className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <X size={12} />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {isEdit && (
                 <div>
                   <label className="text-xs text-gray-800 font-bold block mb-2">صور العمل المنجز</label>
                   <input 
                     type="file"
                     multiple
                     accept="image/*"
                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 mb-2"
                     onChange={async (e) => {
                       if (e.target.files && e.target.files.length > 0) {
                         try {
                           const promises = Array.from(e.target.files).map(f => compressImage(f as File));
                           const base64s = await Promise.all(promises);
                           setResultImages(prev => [...prev, ...base64s]);
                           showToast({ message: 'تم إرفاق صور الإنجاز وحفظها بنجاح', type: 'success' });
                         } catch (err) {
                            showToast({ message: 'خطأ في معالجة الصور', type: 'error' });
                         }
                       }
                     }}
                   />
                   {resultImages.length > 0 && (
                     <div className="flex gap-2 flex-wrap">
                       {resultImages.map((src, i) => (
                         <div key={i} className="relative group">
                           <img src={src} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                           <button 
                             type="button" 
                             onClick={() => setResultImages(prev => prev.filter((_, idx) => idx !== i))}
                             className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X size={12} />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}
             </div>

             <div className="flex justify-end">
              <button type="button" onClick={() => setExpandedSection('pricing')} className="text-primary-600 font-medium text-sm flex items-center gap-1">
                التالي: الحسابات التلقائية <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing Engine */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'pricing' ? '' as any : 'pricing')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-2 text-primary-800 font-bold">
              <Calculator className="w-5 h-5 text-primary-600" />
              3. تكلفة التفصيل (آلية)
            </div>
            {expandedSection === 'pricing' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <div className={clsx("p-4 space-y-4", expandedSection !== 'pricing' && "hidden")}>
             
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100 pb-4">
               {costFieldsSettings.filter(f => f.isEnabled).map(field => (
                 <CostInput 
                    key={field.id}
                    label={field.label} 
                    val={costs.fields[field.id] || 0} 
                    currency={currency}
                    onChange={v => handleCostFieldChange(field.id, v)} 
                 />
               ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
               <div className="space-y-1">
                  <label className="text-xs text-gray-600 mb-1 block">الضريبة (TVA %)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      dir="ltr"
                      min="0"
                      className="w-full border border-gray-200 rounded-xl pl-3 pr-8 py-2 outline-none focus:border-indigo-500 text-left bg-white font-mono"
                      value={costs.taxRate || ''}
                      onChange={e => handleTaxChange(e.target.value)}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</span>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-700 mb-1 block flex items-center gap-1">
                    <span>تعديل يدوي للمبلغ الإجمالي</span>
                    <Info size={10} className="text-indigo-400" />
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      dir="ltr"
                      min="0"
                      className="w-full border-2 border-indigo-100 bg-indigo-50/20 rounded-xl pl-3 pr-12 py-2 outline-none focus:border-indigo-500 text-left font-mono font-black"
                      value={costs.totalPriceOverride || ''}
                      onChange={e => setCosts(prev => ({ ...prev, totalPriceOverride: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder={formatCurrency(finalPrice)}
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-indigo-400 font-black">{currency}</span>
                  </div>
               </div>
            </div>

            {/* Final Calculation Banner */}
            <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4 shadow-inner">
               <h4 className="font-exrabold text-slate-800 border-b border-gray-200 pb-2 text-sm flex items-center justify-between">
                 ملخص الميزانية والفوترة
                 <span className="text-[10px] text-indigo-600 font-black bg-indigo-100 px-2.5 py-1 rounded-lg">حساب تلقائي ذكي</span>
               </h4>
               <div className="space-y-3 pt-2">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">إجمالي البنود الصافية</span>
                   <span className="font-mono font-bold">{formatCurrency((subtotalBeforeTax) || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                   <span className="text-gray-500">مبلغ الضريبة ({costs.taxRate}%)</span>
                   <span className="font-mono font-bold text-amber-600">+{formatCurrency(taxAmount || 0)}</span>
                 </div>
                 <div className="flex justify-between items-end pt-1">
                   <div className="space-y-0.5">
                     <span className="block font-black text-slate-800">المبلغ الإجمالي المستحق</span>
                     <span className="block text-[10px] text-gray-400">شامل لكافة البنود والضرائب المفعّلة</span>
                   </div>
                   <div className="text-left">
                     <span className="font-black text-2xl text-indigo-800 font-mono tracking-tight" dir="ltr">
                        {formatCurrency(finalPrice)}
                     </span>
                     {costs.totalPriceOverride !== undefined && (
                        <p className="text-[9px] text-indigo-500 font-black">يوجد تعديل يدوي نشط</p>
                     )}
                   </div>
                 </div>
               </div>
             </div>

          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-primary-800 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-primary-900 transition mt-6 shadow-md"
        >
          <Save className="w-5 h-5 shadow-sm" />
          {isEdit ? 'حفظ التعديلات' : 'حفظ وإنشاء الفاتورة'}
        </button>

      </form>
    </div>
  );
}

interface CostInputProps {
  label: string;
  val: number;
  currency: string;
  onChange: (v: string) => void;
  key?: any;
}

function CostInput({ label, val, currency, onChange }: CostInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-600 mb-1 block truncate" title={label}>{label}</label>
      <div className="relative">
        <input 
          type="number"
          dir="ltr"
          min="0"
          className="w-full border border-gray-200 rounded-xl pl-3 pr-12 py-2 outline-none focus:border-indigo-500 text-left font-mono"
          value={val || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
        />
        <span className="absolute right-3 top-2.5 text-[9px] text-gray-400 font-black">{currency}</span>
      </div>
    </div>
  );
}

