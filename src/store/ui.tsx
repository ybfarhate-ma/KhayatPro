import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  showAutoChargeCheckbox?: boolean;
}

interface UIContextType {
  showToast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<any>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (val: any) => void } | null>(null);
  const [autoChargeChecked, setAutoChargeChecked] = useState(false);

  const showToast = (options: ToastOptions) => {
    const id = Date.now();
    setToast({ ...options, id, type: options.type || 'success' });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 3500);
  };

  const handleConfirm = (options: ConfirmOptions) => {
    setAutoChargeChecked(false);
    return new Promise<any>((resolve) => {
      setConfirmState({ options, resolve });
    });
  };

  const handleConfirmClose = (val: boolean) => {
    if (confirmState) {
      if (confirmState.options.showAutoChargeCheckbox) {
        confirmState.resolve({ confirmed: val, autoCharge: autoChargeChecked });
      } else {
        confirmState.resolve(val);
      }
      setConfirmState(null);
      setAutoChargeChecked(false);
    }
  };

  return (
    <UIContext.Provider value={{ showToast, confirm: handleConfirm }}>
      {children}
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-[100] flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl min-w-[300px] w-max max-w-[90vw]"
            dir="rtl"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            <span className="text-sm font-medium flex-1 pl-4">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-auto">
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => handleConfirmClose(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmState.options.title}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{confirmState.options.message}</p>

              {confirmState.options.showAutoChargeCheckbox && (
                <label className="flex items-center gap-2.5 p-3.5 bg-indigo-50/50 border border-indigo-100/70 rounded-2xl cursor-pointer mb-6 select-none select-none">
                  <input 
                    type="checkbox" 
                    checked={autoChargeChecked} 
                    onChange={(e) => setAutoChargeChecked(e.target.checked)} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer accent-indigo-600" 
                  />
                  <span className="text-xs font-extrabold text-indigo-950 text-right leading-relaxed">
                    تفعيل الترحيل التلقائي لهذا الاشتراك في الدورات القادمة؟
                  </span>
                </label>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => handleConfirmClose(false)} 
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                >
                  {confirmState.options.cancelText || 'إلغاء'}
                </button>
                <button 
                  onClick={() => handleConfirmClose(true)} 
                  className={`flex-1 py-3 text-white font-bold text-sm rounded-xl transition-colors shadow-sm ${confirmState.options.isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-primary-800 hover:bg-primary-900 shadow-primary-900/20'}`}
                >
                  {confirmState.options.confirmText || 'تأكيد'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
}
