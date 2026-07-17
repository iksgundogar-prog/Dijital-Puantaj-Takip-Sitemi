import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { LockedPeriods } from '../types';
import { MONTHS } from '../constants';
import { supabase } from '../supabaseClient';

interface DonemKilitPageProps {
  lockedPeriods: LockedPeriods;
  setLockedPeriods: React.Dispatch<React.SetStateAction<LockedPeriods>>;
  addAudit: (action: string, detail: string) => void;
}

const DonemKilitPage: React.FC<DonemKilitPageProps> = ({ lockedPeriods, setLockedPeriods, addAudit }) => {
  const [year, setYear] = useState(new Date().getFullYear());

  const toggleLock = async (monthIdx: number) => {
    const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const isCurrentlyLocked = !!lockedPeriods[key];
    
    const { error } = await supabase
      .from('locked_periods')
      .upsert({
        period_key: key,
        is_locked: !isCurrentlyLocked,
        locked_by: 'Sistem'
      }, { onConflict: 'period_key' });

    if (error) {
      console.error(error);
      alert('Hata: Dönem kilidi kaydedilemedi!');
      return;
    }

    setLockedPeriods(prev => {
      const next = { ...prev };
      if (isCurrentlyLocked) {
        delete next[key];
        addAudit("UNLOCK", `${MONTHS[monthIdx]} ${year} dönemi kilidi açıldı.`);
      } else {
        next[key] = true;
        addAudit("LOCK", `${MONTHS[monthIdx]} ${year} dönemi kilitlendi.`);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dönem Kilitleme</h1>
          <p className="text-slate-500 text-sm font-medium">Kilitlenen dönemlerde puantaj verisi değiştirilemez.</p>
        </div>
        <div className="flex items-center space-x-2">
           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Çalışma Yılı:</label>
           <select 
             value={year} 
             onChange={(e) => setYear(Number(e.target.value))}
             className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
           >
             {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start space-x-3">
         <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
         <p className="text-rose-700 text-xs font-medium leading-relaxed">
           Kilitleme işlemi, verilerin Mikro yazılımına aktarılmadan önceki son kontrol aşamasıdır. 
           Kilitli dönemlerde yapılan tüm değişiklikler loglanır ve sadece admin yetkisiyle açılabilir.
         </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MONTHS.map((m, idx) => {
          const key = `${year}-${String(idx + 1).padStart(2, "0")}`;
          const isLocked = !!lockedPeriods[key];
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-3xl border transition-all flex flex-col items-center text-center ${
                isLocked 
                  ? 'bg-rose-50 border-rose-200 shadow-rose-200/20' 
                  : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                isLocked ? 'bg-rose-100 text-rose-600 rotate-12' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <h3 className="font-black text-slate-900 text-lg leading-tight">{m}</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">{year}</p>
              
              <button 
                onClick={() => toggleLock(idx)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                  isLocked 
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                    : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-lg shadow-slate-900/10'
                }`}
              >
                {isLocked ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>KİLİDİ AÇ</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>DÖNEMİ KİLİTLE</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonemKilitPage;
