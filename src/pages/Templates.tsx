import { useState, useEffect, useMemo } from 'react';
import { db } from '../store/db';
import { AttireTemplate } from '../types';
import { generateId } from '../lib/utils';
import { ArrowLeft, Plus, Scissors, Trash2, Copy, Search, ArrowUpDown, Filter, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUI } from '../store/ui';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function Templates() {
  const [templates, setTemplates] = useState<AttireTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'gender' | 'style'>('newest');
  const [activeGender, setActiveGender] = useState<'all' | 'male_adult' | 'female_adult' | 'male_teen' | 'female_teen' | 'male_child' | 'female_child' | 'infant'>('all');
  const [activeStyle, setActiveStyle] = useState<'all' | 'traditional' | 'modern'>('all');
  const { showToast, confirm } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    setTemplates(db.getAttireTemplates());
  }, []);

  const filteredAndSortedTemplates = useMemo(() => {
    return templates
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGender = activeGender === 'all' || t.gender === activeGender;
        const matchesStyle = activeStyle === 'all' || t.style === activeStyle;
        
        return matchesSearch && matchesGender && matchesStyle;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'style') return (a.style || '').localeCompare(b.style || '');
        return 0;
      });
  }, [templates, searchQuery, sortBy, activeGender, activeStyle]);

  const handleDuplicate = (template: AttireTemplate) => {
    const newTemplate: AttireTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (نسخة)`,
      createdAt: new Date().toISOString()
    };
    
    db.saveAttireTemplate(newTemplate);
    setTemplates(db.getAttireTemplates());
    showToast({ 
      message: `تم نسخ ${template.name} بنجاح`, 
      type: 'success' 
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'حذف نوع اللباس',
      message: 'هل أنت متأكد من حذف هذا النوع؟ سيتم إزالته من قائمة الاختيارات.',
      confirmText: 'حذف',
      cancelText: 'تراجع',
      isDestructive: true
    });

    if (confirmed) {
      db.deleteAttireTemplate(id);
      setTemplates(db.getAttireTemplates());
      showToast({ message: 'تم الحذف بنجاح', type: 'success' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-xl font-black text-slate-800">أنواع اللباس والموديلات</h2>
              <p className="text-[10px] font-bold text-gray-400">إدارة القياسات والقوالب الجاهزة</p>
            </div>
          </div>
          <Link to="/settings/templates/new" className="bg-indigo-600 text-white px-5 py-3 rounded-2xl hover:bg-indigo-700 transition flex items-center gap-2 font-black shadow-lg shadow-indigo-100 active:scale-95 text-sm">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة قالب جديد</span>
          </Link>
        </div>
      </div>
      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
        {/* Style Toggles: "Traditional" and "Modern" displayed prominently above */}
        <div className="flex items-center justify-between gap-4">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
             {[
               { id: 'all', label: 'كافة الأنماط', icon: Filter },
               { id: 'traditional', label: 'النمط التقليدي', icon: Scissors },
               { id: 'modern', label: 'النمط العصري', icon: Plus },
             ].map((btn) => (
               <button
                 key={btn.id}
                 onClick={() => setActiveStyle(btn.id as any)}
                 className={clsx(
                   "px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2",
                   activeStyle === btn.id 
                     ? 'bg-white text-indigo-700 shadow-md transform scale-105' 
                     : 'text-slate-500 hover:text-slate-700'
                 )}
               >
                 <btn.icon size={14} className={activeStyle === btn.id ? "text-indigo-500" : "text-slate-400"} />
                 {btn.label}
               </button>
             ))}
           </div>

           {/* Quick Stats */}
           <div className="hidden lg:flex items-center gap-2 text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-2xl border border-indigo-100 font-black text-xs shadow-4xs">
              <Sparkles size={14} className="animate-pulse" />
              <span>يوجد حالياً {filteredAndSortedTemplates.length} موديل مفعل</span>
           </div>
        </div>

        {/* Unified Search & Filter Bar */}
        <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-3">
          
          {/* Sorting Control */}
          <div className="relative shrink-0 w-full md:w-auto">
            <ArrowUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <select 
              className="w-full md:w-[150px] bg-slate-50 border border-slate-100 rounded-xl pr-10 pl-4 py-3 text-[11px] font-black text-slate-700 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="newest">الأحدث دخلاً</option>
              <option value="name">الاسم (أ-ي)</option>
              <option value="gender">حسب الفئة</option>
              <option value="style">حسب النمط</option>
            </select>
          </div>

          {/* Search Input - Main Area */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="ابحث عن موديل محدد..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pr-12 pl-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Detailed Category Dropdown - Replacing the old buttons */}
          <div className="relative shrink-0 w-full md:w-auto">
            <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4 pointer-events-none" />
            <select
              value={activeGender}
              onChange={(e) => setActiveGender(e.target.value as any)}
              className="w-full md:w-[200px] bg-indigo-50 border border-indigo-100 rounded-xl pr-10 pl-4 py-3 text-[11px] font-black text-indigo-800 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="all">كل الفئات والمقاسات</option>
              <optgroup label="الكبار">
                <option value="male_adult">رجال</option>
                <option value="female_adult">نساء</option>
              </optgroup>
              <optgroup label="المراهقين واليافعين">
                <option value="male_teen">شباب (يافعين)</option>
                <option value="female_teen">شابات (يافعات)</option>
              </optgroup>
              <optgroup label="الأطفال">
                <option value="male_child">أولاد صغار</option>
                <option value="female_child">بنات صغار</option>
              </optgroup>
              <optgroup label="أخرى">
                <option value="infant">مواليد فقط</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence>
          {filteredAndSortedTemplates.map(t => (
            <motion.div 
              layout
              key={t.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-50/50 hover:border-indigo-100 transition-all group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={clsx(
                    "p-3.5 rounded-2xl border transition-colors",
                    t.style === 'traditional' ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                  )}>
                    <Scissors className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={clsx(
                      "text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider",
                      t.style === 'traditional' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                    )}>
                      {t.style === 'traditional' ? 'تقليدي' : 'عصري'}
                    </span>
                    <span className="text-[9px] bg-slate-50 text-slate-400 px-2.5 py-1 rounded-full font-black border border-slate-100">
                      {t.gender.includes('male') ? 'رجالي' : t.gender.includes('female') ? 'نسائي' : 'مواليد'}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-black text-xl text-slate-800 mb-2 truncate">
                  {t.name}
                </h3>
                
                <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5 mb-6">
                   <Filter size={12} className="text-gray-300" />
                   يتضمن {t.points.length} نقاط قياس مخصصة
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-50 pt-4">
                <button 
                  onClick={() => handleDelete(t.id)} 
                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleDuplicate(t)} 
                  className="p-2.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                  title="نسخ الموديل"
                >
                  <Copy size={18} />
                </button>
                <div className="flex-1" />
                <Link to={`/settings/templates/${t.id}`} className="bg-slate-50 text-slate-700 hover:bg-indigo-600 hover:text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-4xs active:scale-95">
                  فتح التعديل
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
