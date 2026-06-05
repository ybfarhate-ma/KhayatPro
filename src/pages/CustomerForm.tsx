import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../store/db';
import { generateId } from '../lib/utils';
import { Customer } from '../types';
import { Save, ArrowRight, AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
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

export default function CustomerForm({ isEdit = false }: { isEdit?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useUI();
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    fullName: '',
    phone: '',
    address: '',
    gender: 'female',
    notes: ''
  });

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setAllCustomers(db.getCustomers());
    
    if (isEdit && id) {
      const existing = db.getCustomers().find(c => c.id === id);
      if (existing) {
        setFormData(existing);
        setMatchedCustomer(existing);
      }
    }
  }, [isEdit, id]);

  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, fullName: val }));
    
    if (matchedCustomer && val !== matchedCustomer.fullName) {
      setMatchedCustomer(null);
    }

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    const normVal = normalizeArabic(val);
    const matches = allCustomers.filter(c => {
      const normName = normalizeArabic(c.fullName);
      return normName.includes(normVal);
    });

    setSuggestions(matches);
  };

  const selectSuggestion = (item: Customer) => {
    setFormData({
      fullName: item.fullName,
      phone: item.phone,
      address: item.address || '',
      gender: item.gender,
      notes: item.notes || ''
    });
    setMatchedCustomer(item);
    setSuggestions([]);
    setShowSuggestions(false);
    showToast({ 
      message: `تم اختيار العميل (${item.fullName}) وتعبئة بياناته تلقائياً`, 
      type: 'success' 
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) return showToast({ message: 'الرجاء إدخال اسم ورقم هاتف العميل', type: 'error' });

    const newCustomer: Customer = {
      id: matchedCustomer ? matchedCustomer.id : generateId(),
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      gender: formData.gender as 'male' | 'female',
      notes: formData.notes,
      createdAt: matchedCustomer ? matchedCustomer.createdAt : new Date().toISOString()
    };

    db.saveCustomer(newCustomer);
    showToast({ 
      message: matchedCustomer ? 'تم تحديث بيانات العميل بنجاح' : 'تم حفظ العميل بنجاح', 
      type: 'success' 
    });
    navigate('/customers');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
          <ArrowRight className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-xl font-bold text-primary-800">
          {isEdit ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        
        {/* Warning card if customer already exists under this name */}
        {matchedCustomer && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3.5 text-right animate-in fade-in duration-200" dir="rtl">
            <div className="flex items-start gap-2.5">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
                <AlertTriangle size={20} className="stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-amber-800">هذا العميل مسجل بالفعل لدينا!</h4>
                <p className="text-xs text-amber-600 font-bold leading-relaxed">
                  تم رصد اسم مطابق وتعبئة البيانات تلقائياً. يمكنك تعديل الهاتف والعلامات مباشرة وحفظه لتحديث سجله، أو نقله لصفحته المخصصة.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/customers/${matchedCustomer.id}`)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] px-3.5 py-1.5 rounded-xl transition shadow-3xs flex items-center gap-1.5"
              >
                <UserCheck size={14} />
                <span>عرض الصفحة والقياسات لهذا العميل ←</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    fullName: '',
                    phone: '',
                    address: '',
                    gender: 'female',
                    notes: ''
                  });
                  setMatchedCustomer(null);
                }}
                className="bg-white border border-amber-200 hover:bg-amber-100/50 text-amber-800 font-black text-[10.5px] px-3.5 py-1.5 rounded-xl transition shadow-3xs"
              >
                <span>مسح وتجاوز (بدء عميل جديد)</span>
              </button>
            </div>
          </div>
        )}

        {/* Full Name input with Predictive suggestions UI */}
        <div className="space-y-1 relative">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">الاسم الكامل *</label>
            {formData.fullName && suggestions.length > 0 && (
              <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 animate-pulse">
                <Sparkles size={11} />
                <span>توجد اقتراحات للأسماء</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input 
              required
              type="text" 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-right placeholder:text-gray-300 font-medium"
              placeholder="اكتب اسم العميل الثلاثي هنا..."
              value={formData.fullName}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
              autoComplete="off"
            />
          </div>
          
          {/* Suggestions Dropdown List */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute right-0 left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-55 animate-in fade-in slide-in-from-top-2 duration-150 text-right">
              <div className="p-2.5 bg-slate-50 text-[10px] text-slate-450 font-black flex justify-between items-center" dir="rtl">
                <span>هل تقصد أحد هؤلاء العملاء؟</span>
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">{suggestions.length} عثر عليه</span>
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => selectSuggestion(item)}
                  className="w-full text-right p-3 hover:bg-indigo-50/50 flex justify-between items-center transition"
                  dir="rtl"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">{item.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-extrabold font-mono" dir="ltr">{item.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.address && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold max-w-[100px] truncate">{item.address}</span>
                    )}
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg font-black shadow-4xs transition hover:bg-indigo-100">
                      تعبئة البيانات
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">رقم الهاتف *</label>
          <input 
            required
            type="tel" 
            dir="ltr"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-left"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">الجنس</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="gender" 
                value="female" 
                checked={formData.gender === 'female'}
                onChange={e => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-semibold">أنثى</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="gender" 
                value="male" 
                checked={formData.gender === 'male'}
                onChange={e => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-semibold">ذكر</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">العنوان</label>
          <input 
            type="text" 
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">ملاحظات إضافية</label>
          <textarea 
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
            value={formData.notes || ''}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          ></textarea>
        </div>

        <button 
          type="submit" 
          className="w-full bg-primary-800 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-primary-900 transition mt-4 shadow-sm"
        >
          <Save className="w-5 h-5" />
          <span>{matchedCustomer ? 'تحديث بيانات العميل' : 'حفظ العميل'}</span>
        </button>

      </form>
    </div>
  );
}
