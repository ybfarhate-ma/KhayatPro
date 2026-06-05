import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Ruler } from 'lucide-react';
import { AttireTemplate, MeasurementPoint } from '../types';

import mannequinAdultMale from '../assets/images/mannequin_adult_male_1779713738052.png';
import mannequinAdultFemale from '../assets/images/mannequin_adult_female_1779713718441.png';
import mannequinTeenMale from '../assets/images/mannequin_teen_male_1779713754203.png';
import mannequinTeenFemale from '../assets/images/mannequin_teen_female_1779713754203.png';
import mannequinChildMale from '../assets/images/mannequin_child_male_1779713770238.png';
import mannequinChildFemale from '../assets/images/mannequin_child_female_1779713788016.png';
import mannequinInfant from '../assets/images/mannequin_infant_1779713805797.png';

export default function InteractiveMannequin({ 
  template,
  measurements, 
  onChange,
  className
}: { 
  template?: AttireTemplate,
  measurements: Record<string, string | number>,
  onChange: (id: string, value: string) => void,
  className?: string
}) {
  const [activePoint, setActivePoint] = useState<MeasurementPoint | null>(null);

  const scale = activePoint ? 2.5 : 1;
  const originX = activePoint ? `${activePoint.x}%` : '50%';
  const originY = activePoint ? `${activePoint.y}%` : '50%';
  
  const displayPoints = template?.points || [];
  
  // Map gender to images
  const getMannequinImage = (gender?: string) => {
    switch (gender) {
      case 'male_adult': return mannequinAdultMale;
      case 'female_adult': return mannequinAdultFemale;
      case 'male_teen': return mannequinTeenMale;
      case 'female_teen': return mannequinTeenFemale;
      case 'male_child': return mannequinChildMale;
      case 'female_child': return mannequinChildFemale;
      case 'infant': return mannequinInfant;
      default: return mannequinAdultFemale;
    }
  };

  return (
    <div className={clsx("relative w-full h-full bg-white rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center min-h-[400px]", className)}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#3d5a45 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="relative h-full w-full flex items-center justify-center">
        <motion.div 
          className="relative h-full flex items-center justify-center"
          animate={{ scale: activePoint ? 2.8 : 1.05 }}
          style={{ transformOrigin: `${originX} ${originY}`, width: 'auto' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Mannequin Image wrapper to force same bounding box as images */}
          <div className="relative h-full flex items-center justify-center">
            <img 
              src={getMannequinImage(template?.gender)} 
              alt="Mannequin" 
              className="h-full w-auto block drop-shadow-2xl select-none"
              referrerPolicy="no-referrer"
            />

            {/* Measurement Points Overlay Container */}
            <div className="absolute inset-0">
              <div className="relative w-full h-full overflow-visible">
                {displayPoints.map(point => {
                  const val = measurements[point.id];
                  const isActive = activePoint?.id === point.id;
                  return (
                    <div 
                      key={point.id}
                      className="absolute group flex items-center justify-center cursor-pointer z-10"
                      style={{ top: `${point.y}%`, left: `${point.x}%`, width: '20px', height: '20px', transform: 'translate(-50%, -50%)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isActive) setActivePoint(point);
                      }}
                    >
                       {/* Pulsing indicator if empty */}
                       {!val && !activePoint && (
                         <div className="absolute inset-0 bg-primary-400 rounded-full animate-ping opacity-50"></div>
                       )}
                       <div className={clsx("w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-all duration-300", 
                         isActive ? "bg-accent-500 scale-125" : (val ? "bg-emerald-500" : "bg-primary-500")
                       )}></div>
                       
                       {/* Label (hidden when zooming active) */}
                       {!activePoint && (
                         <div className="absolute top-5 bg-gray-800 text-white px-2 py-0.5 rounded shadow-lg text-[9px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                           {point.label}
                         </div>
                       )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Input Overlay when Zooms In */}
      <AnimatePresence>
        {activePoint && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-primary-200 flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary-100 p-2 rounded-full text-primary-700">
               <Ruler className="w-4 h-4" />
            </div>
            <div className="flex-1">
               <label className="text-xs font-bold text-primary-800 block mb-1">{activePoint.label}</label>
               <div className="relative">
                 <input 
                   autoFocus
                   type="number"
                   dir="ltr"
                   placeholder="0"
                   className="w-full bg-white border border-gray-200 rounded py-1 pl-2 pr-8 outline-none focus:border-primary-500 text-left font-mono"
                   value={measurements[activePoint.id] || ''}
                   onChange={(e) => onChange(activePoint.id, e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       e.stopPropagation();
                       setActivePoint(null);
                     }
                   }}
                 />
                 <span className="absolute right-2 top-1.5 text-xs text-gray-400 font-bold select-none">cm</span>
               </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActivePoint(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              تم
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Click outside dismisses active point */}
      {activePoint && (
        <div className="absolute inset-0 z-[-1]" onClick={() => setActivePoint(null)}></div>
      )}
    </div>
  );
}
