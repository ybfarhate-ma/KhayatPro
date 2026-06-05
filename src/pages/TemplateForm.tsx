import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../store/db';
import { AttireTemplate, MeasurementPoint } from '../types';
import { generateId } from '../lib/utils';
import { ArrowLeft, Save, Trash2, Import, ChevronDown } from 'lucide-react';
import { useUI } from '../store/ui';
import MannequinEditor from '../components/MannequinEditor';
import ConfirmationModal from '../components/ConfirmationModal';

export default function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useUI();
  
  const isEdit = Boolean(id && id !== 'new');

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male_adult' | 'female_adult' | 'male_teen' | 'female_teen' | 'male_child' | 'female_child' | 'infant'>('female_adult');
  const [style, setStyle] = useState<'traditional' | 'modern'>('traditional');
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [fixedMeasurements, setFixedMeasurements] = useState<Record<string, string | number>>({});
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState<AttireTemplate[]>([]);
  const [showImportList, setShowImportList] = useState(false);

  useEffect(() => {
    setAllTemplates(db.getAttireTemplates());
    if (isEdit && id) {
      const existing = db.getAttireTemplates().find(t => t.id === id);
      if (existing) {
        setName(existing.name);
        setGender(existing.gender as any);
        setStyle(existing.style || 'traditional');
        setPoints(existing.points);
        setFixedMeasurements(existing.fixedMeasurements || {});
      }
    }
  }, [isEdit, id]);

  const handleFixedMeasurementChange = (pointId: string, value: string) => {
    setFixedMeasurements(prev => ({
      ...prev,
      [pointId]: value
    }));
  };

  const handleImportPoints = (template: AttireTemplate) => {
    // We deep copy the points and give them new IDs if we want them to be independent 
    // or keep original IDs if it's a direct replacement. Usually, new IDs are better for a fresh start.
    const importedPoints = template.points.map(p => ({
      ...p,
      id: generateId() // Assigning fresh IDs to avoid conflicts if needed, though they are scoped to the template
    }));
    
    setPoints(importedPoints);
    setShowImportList(false);
    showToast({ 
      message: `تم استيراد ${importedPoints.length} نقطة من ${template.name}`, 
      type: 'success' 
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ message: 'يرجى إدخال اسم نوع اللباس', type: 'error' });
      return;
    }

    const existingTemplate = db.getAttireTemplates().find(t => t.id === id);
    
    const template: AttireTemplate = {
      id: isEdit ? id! : generateId(),
      name,
      gender,
      style,
      lowerBodyStyle: 'robe',
      points,
      fixedMeasurements,
      createdAt: isEdit && existingTemplate?.createdAt ? existingTemplate.createdAt : new Date().toISOString()
    };

    db.saveAttireTemplate(template);
    showToast({ message: 'تم حفظ النوع بنجاح', type: 'success' });
    navigate('/settings/templates');
  };

  const handleResetPoints = () => {
    setPoints(points.map(p => ({ ...p, x: 50, y: 50 })));
    showToast({ message: 'تمت إعادة تموضع النقاط في المنتصف', type: 'info' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-primary-800">
            {isEdit ? 'تعديل نوع لباس' : 'إضافة نوع لباس جديد'}
          </h2>
        </div>
        <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 font-bold transition flex items-center gap-2">
          <Save className="w-4 h-4" />
          حفظ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2">الإعدادات العامة</h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">اسم النوع (مثال: دراعة، عباية...)</label>
              <input 
                type="text" 
                autoFocus
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary-500"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">التصنيف (عصري أم تقليدي)</label>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setStyle('traditional')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${style === 'traditional' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  تقليدي (الأصيل)
                </button>
                <button 
                  type="button" 
                  onClick={() => setStyle('modern')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${style === 'modern' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  عصري (حديث)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">فئة المانيكان والمقاس</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setGender('male_adult')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'male_adult' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>رجالي (كبار)</button>
                <button type="button" onClick={() => setGender('female_adult')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'female_adult' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>نسائي (كبار)</button>
                <button type="button" onClick={() => setGender('male_teen')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'male_teen' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>شباب (مراهقين)</button>
                <button type="button" onClick={() => setGender('female_teen')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'female_teen' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>شابات (مراهقات)</button>
                <button type="button" onClick={() => setGender('male_child')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'male_child' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>أطفال (ذكور)</button>
                <button type="button" onClick={() => setGender('female_child')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'female_child' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>أطفال (إناث)</button>
                <button type="button" onClick={() => setGender('infant')} className={`py-2 rounded-lg text-[10px] font-black transition-all border ${gender === 'infant' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>مواليد</button>
              </div>
            </div>
          </div>

          {/* Points List */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <h3 className="font-bold text-gray-800">
                نقاط القياس ({points.length})
              </h3>
              
              {allTemplates.length > 0 && (
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowImportList(!showImportList)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary-600 hover:text-primary-800 transition-colors uppercase border border-primary-200 px-2 py-1 rounded-lg bg-primary-50/50"
                  >
                    <Import size={12} />
                    <span>استيراد النقاط</span>
                    <ChevronDown size={10} />
                  </button>
                  
                  {showImportList && (
                    <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto">
                      <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border-b border-gray-50 mb-1">اختر نوعاً للاستيراد منه</p>
                      {allTemplates.filter(t => t.id !== id).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleImportPoints(t)}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors flex items-center justify-between"
                        >
                          <span>{t.name}</span>
                          <span className="text-[10px] text-gray-400">({t.points.length})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
              {points.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">لا توجد نقاط للقياس. انقر على المانيكان لإضافة النقط.</p>
              ) : (
                points.map((p, index) => (
                  <div 
                    key={p.id} 
                    className={`flex flex-col gap-2 p-2 rounded-lg cursor-pointer transition-colors ${activePointId === p.id ? 'bg-primary-100 border border-primary-300 ring-1 ring-primary-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => setActivePointId(activePointId === p.id ? null : p.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${activePointId === p.id ? 'text-primary-900' : 'text-gray-800'}`}>
                        <span className="text-gray-400 ml-1">{index + 1}.</span> 
                        {p.label}
                      </span>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPoints(points.filter(pt => pt.id !== p.id));
                          const newFixed = { ...fixedMeasurements };
                          delete newFixed[p.id];
                          setFixedMeasurements(newFixed);
                          if (activePointId === p.id) setActivePointId(null);
                        }}
                        className="text-red-500 hover:bg-red-100 p-1.5 rounded-md transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 " onClick={e => e.stopPropagation()}>
                       <span className="text-[10px] font-black text-gray-400 shrink-0">قياس ثابت:</span>
                       <input 
                         type="number"
                         step="0.5"
                         placeholder="0"
                         className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs font-mono font-bold text-center outline-none focus:border-primary-500"
                         value={fixedMeasurements[p.id] || ''}
                         onChange={(e) => handleFixedMeasurementChange(p.id, e.target.value)}
                       />
                       <span className="text-[10px] font-bold text-gray-400">{localStorage.getItem('khayatpro_setting_length_unit') || 'سم'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Mannequin Interactive Editor */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-end">
            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[11px] font-bold text-primary-700 shadow-sm border border-primary-50 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
              انقر على المانيكان لإضافة نقطة قياس
            </span>
          </div>
          <MannequinEditor 
            gender={gender}
            points={points}
            onChange={setPoints}
            activePointId={activePointId}
            onActivePointChange={setActivePointId}
            onResetPoints={() => setIsResetModalOpen(true)}
          />
        </div>

      </div>

      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetPoints}
        title="تأكيد إعادة التمركز"
        message="هل أنت متأكد من إعادة تموضع كل نقاط القياس في منتصف صورة المانيكان؟"
        confirmText="نعم، أعد التمركز"
        cancelText="إلغاء"
        type="warning"
      />
    </form>
  );
}
