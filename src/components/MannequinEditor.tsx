import { useState, MouseEvent, ChangeEvent } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { MeasurementPoint } from '../types';

import mannequinAdultMale from '../assets/images/mannequin_adult_male_1779713738052.png';
import mannequinAdultFemale from '../assets/images/mannequin_adult_female_1779713718441.png';
import mannequinTeenMale from '../assets/images/mannequin_teen_male_1779713754203.png';
import mannequinTeenFemale from '../assets/images/mannequin_teen_female_1779713754203.png';
import mannequinChildMale from '../assets/images/mannequin_child_male_1779713770238.png';
import mannequinChildFemale from '../assets/images/mannequin_child_female_1779713788016.png';
import mannequinInfant from '../assets/images/mannequin_infant_1779713805797.png';

interface MannequinEditorProps {
  gender: 'male_adult' | 'female_adult' | 'male_teen' | 'female_teen' | 'male_child' | 'female_child' | 'infant';
  points: MeasurementPoint[];
  onChange: (points: MeasurementPoint[]) => void;
  activePointId?: string | null;
  onActivePointChange?: (id: string | null) => void;
  onResetPoints?: () => void;
}

export default function MannequinEditor({ gender, points, onChange, activePointId: propsActivePointId, onActivePointChange, onResetPoints }: MannequinEditorProps) {
  const [internalActivePointId, setInternalActivePointId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const activePointId = propsActivePointId !== undefined ? propsActivePointId : internalActivePointId;
  const setActivePointId = onActivePointChange || setInternalActivePointId;

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    // Determine click position relative to SVG
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    // The cursor point, translated into svg coordinates
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // Scale coords to percentages of viewBox (viewBox is 0 0 100 100)
    const xPct = Math.min(Math.max(cursorPt.x, 0), 100);
    const yPct = Math.min(Math.max(cursorPt.y, 0), 100);

    const newId = `p_${Date.now()}`;
    const newPoint: MeasurementPoint = {
      id: newId,
      label: 'نقطة قياس',
      x: xPct,
      y: yPct
    };

    onChange([...points, newPoint]);
    setActivePointId(newId);
  };

  const getMannequinImage = (g: string) => {
    switch (g) {
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

  const handleDragLabel = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onChange(points.map(p => p.id === id ? { ...p, label: e.target.value } : p));
  };

  const removePoint = (id: string) => {
    onChange(points.filter(p => p.id !== id));
    setActivePointId(null);
  };

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center bg-white rounded-2xl overflow-hidden border border-gray-200">
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#3d5a45 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="relative h-full flex items-center justify-center scale-[1.05] origin-center">
        {/* Precise image wrapper to ensure points align perfectly regardless of aspect ratio */}
        <div className="relative h-full flex items-center justify-center">
          <img 
            src={getMannequinImage(gender)} 
            alt="Mannequin Editor" 
            className="h-full w-auto block drop-shadow-2xl select-none"
            referrerPolicy="no-referrer"
          />

          {/* Interaction Surface (Transparent Overlay) */}
          <div className="absolute inset-0">
            <svg 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair overflow-visible"
              onPointerDown={handleSvgClick}
            >
              {/* Draw Points */}
              {points.filter(p => p.id !== activePointId).map(p => (
                <g 
                  key={p.id} 
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setActivePointId(p.id);
                  }}
                >
                  <circle cx={p.x} cy={p.y} r="1.5" className="fill-gray-400 opacity-60" />
                </g>
              ))}

              {/* Active Point (Always on Top) */}
              {points.filter(p => p.id === activePointId).map(p => (
                <g 
                  key={p.id} 
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    
                    const svg = e.currentTarget.ownerSVGElement;
                    if (!svg) return;
                    
                    let moved = false;
                    setIsDragging(true);
                    
                    const onPointerMove = (moveEvent: PointerEvent) => {
                      moved = true;
                      const pt = svg.createSVGPoint();
                      pt.x = moveEvent.clientX;
                      pt.y = moveEvent.clientY;
                      const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                      
                      const xPct = Math.min(Math.max(cursorPt.x, 0), 100);
                      const yPct = Math.min(Math.max(cursorPt.y, 0), 100);
                      
                      onChange(points.map(pt => pt.id === p.id ? { ...pt, x: xPct, y: yPct } : pt));
                    };
                    
                    const onPointerUp = () => {
                      setIsDragging(false);
                      if (!moved) {
                        // setActivePointId(null);
                      }
                      window.removeEventListener('pointermove', onPointerMove);
                      window.removeEventListener('pointerup', onPointerUp);
                    };
                    
                    window.addEventListener('pointermove', onPointerMove);
                    window.addEventListener('pointerup', onPointerUp);
                  }}
                >
                  <circle cx={p.x} cy={p.y} r="3.5" className="fill-accent-500 opacity-20 animate-ping" />
                  <circle cx={p.x} cy={p.y} r="1.8" className="fill-accent-500 shadow-xl drop-shadow-lg" />
                  <circle cx={p.x} cy={p.y} r="0.8" className="fill-white" />
                </g>
              ))}
            </svg>

            {/* Floating Editors (Dynamic placement to avoid blocking point) */}
            {points.map(p => {
              if (activePointId !== p.id || isDragging) return null;
              
              const isBottomHalf = p.y > 50;
              
              return (
                <div 
                  key={p.id} 
                  className={clsx(
                    "absolute left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-4 border border-primary-100 z-[60] w-72 animate-in pointer-events-auto",
                    isBottomHalf ? "top-6 slide-in-from-top-4" : "bottom-6 slide-in-from-bottom-4"
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">تعديل نقطة القياس</label>
                        <span className="text-[9px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-bold">
                          {p.label}
                        </span>
                      </div>
                      <input
                        autoFocus
                        type="text"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary-500 transition-all text-center"
                        value={p.label}
                        onChange={(e) => handleDragLabel(p.id, e)}
                        placeholder="مثلاً: الصدر"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => removePoint(p.id)}
                        className="flex-1 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={12} />
                        حذف
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(points.map(pt => pt.id === p.id ? { ...pt, x: 50, y: 50 } : pt))}
                        className="aspect-square w-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors border border-gray-100"
                        title="إعادة التمركز"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePointId(null)}
                        className="flex-1 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-bold transition-colors"
                      >
                        تم
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 flex gap-2 items-center z-20">
        {onResetPoints && points.length > 0 && (
          <button
            type="button"
            onClick={onResetPoints}
            className="bg-white/90 backdrop-blur hover:bg-white text-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 transition-all active:scale-95 flex items-center gap-1.5"
            title="إعادة تموضع النقاط في المنتصف"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            إعادة التمركز
          </button>
        )}
      </div>
    </div>
  );
}
