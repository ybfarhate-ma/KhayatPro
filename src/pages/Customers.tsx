import React, { useState, useEffect } from 'react';
import { db } from '../store/db';
import { Customer } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, User, Search, Phone, Trash2, Edit3, Eye, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../store/ui';
import { clsx } from 'clsx';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const { showToast } = useUI();
  const navigate = useNavigate();

  // Delete Confirmation State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    setCustomers(db.getCustomers());
  }, []);

  const handleDelete = () => {
    if (customerToDelete) {
      db.deleteCustomer(customerToDelete.id);
      setCustomers(db.getCustomers());
      showToast({ message: `تم حذف العميل ${customerToDelete.fullName} بنجاح`, type: 'success' });
      setCustomerToDelete(null);
    }
  };

  const filtered = customers.filter(c => 
    c.fullName.includes(search) || c.phone.includes(search)
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100" dir="rtl">
        <div>
          <h2 className="text-xl font-black text-slate-800">قائمة العملاء</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{customers.length} عميل بريميوم</p>
        </div>
        <Link to="/customers/new" className="bg-indigo-600 text-white p-3.5 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 transform active:scale-95">
          <Plus className="w-5 h-5 stroke-[3]" />
        </Link>
      </div>

      <div className="relative" dir="rtl">
        <input 
          type="text" 
          placeholder="ابحث بالاسم أو رقم الهاتف..." 
          className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pr-12 pl-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-sm font-bold text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="w-5 h-5 text-gray-400 absolute right-4 top-4" />
      </div>

      {/* Swipe and Click gestures Info Banner */}
      <div className="bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-2xl flex items-center gap-2.5 text-indigo-900 text-xs font-bold leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)]" dir="rtl">
        <span className="text-base select-none">💡</span>
        <p>انقر على الزبون لفتح ملفه ورقمه • اسحب لليسار <span className="text-emerald-700 font-black decoration-emerald-500/30 underline decoration-2">للتعديل</span> 🟢 • اسحب لليمين <span className="text-red-650 font-black decoration-red-500/30 underline decoration-2">للحذف</span> 🔴</p>
      </div>

      <div className="space-y-3 pt-1">
        {filtered.length === 0 ? (
          <div className="text-center p-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            <User size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-bold text-sm">{search ? 'لم يتم العثور على نتائج للبحث' : 'لا يوجد عملاء مسجلون حالياً'}</p>
          </div>
        ) : (
          filtered.map(c => (
            <CustomerItem 
              key={c.id} 
              customer={c} 
              onDelete={() => { setCustomerToDelete(c); }} 
              onView={() => { navigate(`/customers/${c.id}`); }}
              onEdit={() => { navigate(`/customers/edit/${c.id}`); }}
            />
          ))
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {customerToDelete && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" dir="rtl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-4xs border border-red-100">
                 <AlertTriangle size={40} className="stroke-[2.5]" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 mb-2">هل أنت متأكد؟</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-bold">
                أنت على وشك حذف العميل <span className="text-red-600 font-black">"{customerToDelete.fullName}"</span> وكافة بيانات قياساته وطلباته بشكل نهائي. لا يمكن التراجع عن هذا الإجراء!
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition active:scale-95"
                >
                  تأكيد الحذف النهائي
                </button>
                <button 
                  onClick={() => setCustomerToDelete(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95"
                >
                  إلغاء العملية
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CustomerItem: React.FC<{ 
  customer: Customer, 
  onDelete: () => void, 
  onView: () => void, 
  onEdit: () => void 
}> = ({ 
  customer, 
  onDelete, 
  onView, 
  onEdit 
}) => {
  const [dragX, setDragX] = useState(0);
  
  // Ultra-refined tight swipe boundaries for crisp premium feel
  const EDIT_THRESHOLD = -45;   // Swipe left to edit (reveals right side green action)
  const DELETE_THRESHOLD = 45;   // Swipe right to delete (reveals left side red action)
  const DRAG_LIMIT = 75;         // Constrained limit to avoid sloppy over-dragging

  const isEditActive = dragX <= EDIT_THRESHOLD;
  const isDeleteActive = dragX >= DELETE_THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] group">
      {/* Background Actions Layer with dynamic highlights */}
      <div className="absolute inset-0 flex items-center justify-between rounded-2xl overflow-hidden font-sans select-none bg-slate-50/40">
        {/* Deletion (Left Action) - Revealed when card dragged Right (dragX > 0) */}
        <div className={clsx(
          "h-full w-1/2 flex items-center justify-start pl-6 transition-all duration-200",
          dragX > 0 
            ? (isDeleteActive ? "bg-red-600 text-white shadow-inner" : "bg-red-50 text-red-600") 
            : "bg-transparent text-transparent opacity-0"
        )}>
          {dragX > 0 && (
            <div className="flex items-center gap-2">
              <Trash2 size={16} className={clsx("stroke-[2.5] transition-transform duration-150", isDeleteActive && "scale-115 rotate-6")} />
              <span className="text-[10px] sm:text-[11px] font-black">
                {isDeleteActive ? "أفلت للحذف 🗑️" : "حذف"}
              </span>
            </div>
          )}
        </div>

        {/* Editing (Right Action) - Revealed when card dragged Left (dragX < 0) */}
        <div className={clsx(
          "h-full w-1/2 flex items-center justify-end pr-6 transition-all duration-200",
          dragX < 0 
            ? (isEditActive ? "bg-emerald-600 text-white shadow-inner" : "bg-emerald-50 text-emerald-600") 
            : "bg-transparent text-transparent opacity-0"
        )}>
          {dragX < 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-black">
                {isEditActive ? "أفلت للتعديل 📝" : "تعديل"}
              </span>
              <Edit3 size={16} className={clsx("stroke-[2.5] transition-transform duration-150", isEditActive && "scale-115 -rotate-6")} />
            </div>
          )}
        </div>
      </div>

      {/* Main Draggable Content Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -DRAG_LIMIT, right: DRAG_LIMIT }}
        dragElastic={0.12}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          setDragX(0);
          if (info.offset.x <= EDIT_THRESHOLD) {
            onEdit();
          } else if (info.offset.x >= DELETE_THRESHOLD) {
            onDelete();
          }
        }}
        onClick={() => {
          // If the card is just tapped/clicked rather than dragged
          if (Math.abs(dragX) < 10) {
            onView();
          }
        }}
        className={clsx(
          "relative bg-white p-4 rounded-2xl flex items-center justify-between z-10 cursor-pointer",
          "border-l-[3.5px] border-l-red-500/90 border-r-[3.5px] border-r-emerald-500/90 border-y border-y-slate-100/80 shadow-[0_2px_4px_rgba(0,0,0,0.015)]",
          "hover:bg-slate-50 hover:shadow-2xs transition-all active:bg-slate-100/90 duration-150 select-none"
        )}
        dir="rtl"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 rounded-xl bg-indigo-50/50 flex items-center justify-center border border-indigo-100/40 shadow-4xs transition-colors group-hover:bg-indigo-100/30">
             <div className="text-base font-black text-indigo-800">
                {customer.fullName.trim().charAt(0).toUpperCase()}
             </div>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm mb-0.5 group-hover:text-indigo-950 transition-colors">{customer.fullName}</h3>
            <div className="flex items-center text-[10px] text-slate-400 gap-1.5 font-bold">
              <div className="bg-slate-100/80 p-0.5 rounded-md"><Phone size={10} className="text-slate-500" /></div>
              <span dir="ltr" className="font-medium">{customer.phone}</span>
            </div>
          </div>
        </div>
        
        {/* Help indicators/handles */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none pl-1">
            انقر للعرض
          </span>
          <div className="flex gap-1 opacity-20 group-hover:opacity-60 transition-opacity">
             <div className="w-1 h-6 bg-slate-300 rounded-full" />
             <div className="w-1 h-6 bg-slate-200 rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
