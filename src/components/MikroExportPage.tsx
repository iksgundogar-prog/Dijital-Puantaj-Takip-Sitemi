import React, { useState, useMemo } from 'react';
import { FileDown, Database, CheckCircle } from 'lucide-react';
import { Employee, Location, AttendanceData } from '../types';
import { MONTHS, DAYS_IN_MONTH } from '../constants';

interface MikroExportPageProps {
  employees: Employee[];
  locations: Location[];
  attendance: AttendanceData;
  addAudit: (action: string, detail: string) => void;
}

const MikroExportPage: React.FC<MikroExportPageProps> = ({ employees, locations, attendance, addAudit }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [locFilter, setLocFilter] = useState('all');

  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const exportData = useMemo(() => {
    let list = locFilter === 'all' ? employees : employees.filter(e => e.locationId === Number(locFilter));
    const totalDays = DAYS_IN_MONTH(year, month);
    const monthData = attendance[periodKey] || {};

    return list.map(emp => {
      const data = monthData[emp.id] || {};
      let nG = 0, uI = 0, fM = 0, uGT = 0, rP = 0, dV = 0, uCI = 0;

      for (let d = 1; d <= totalDays; d++) {
        const cell = data[d];
        if (cell) {
          if (['X', 'H'].includes(cell.code)) nG++;
          if (cell.code === 'Y1') uI++;
          if (cell.code === 'Y2') rP++;
          if (cell.code === 'İ') uCI++;
          if (cell.code === 'D') dV++;
          fM += (cell.fm || 0);
          uGT += (cell.ubgt || 0);
        }
      }

      return {
        sicil: emp.sicilNo,
        ad: emp.adSoyad,
        normalGun: nG,
        ucretliIzin: uI,
        raporGun: rP,
        ucretsizIzin: uCI,
        fazlaMesai: fM.toFixed(1),
        ubgt: uGT.toFixed(1),
        devamsiz: dV
      };
    });
  }, [employees, attendance, month, year, locFilter, periodKey]);

  const handleDownload = () => {
    const headers = ["Sicil No", "Ad Soyad", "Normal Gün", "Ücretli İzin (Y1)", "Raporlu Gün (Y2)", "Ücretsiz İzin (İ)", "Fazla Mesai", "UBGT", "Devamsız"];
    const csvContent = "\uFEFF" + headers.join(",") + "\n"
      + exportData.map(r => [r.sicil, r.ad, r.normalGun, r.ucretliIzin, r.raporGun, r.ucretsizIzin, r.fazlaMesai, r.ubgt, r.devamsiz].join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Mikro_Export_${periodKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addAudit("EXPORT", `Mikro Excel Çıktısı alındı (${periodKey})`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mikro Export</h1>
        <p className="text-slate-500 text-sm font-medium">Muhasebe yazılımı için puantaj transfer dosyası.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dönem Seçimi</label>
             <div className="flex space-x-2">
               <select value={month} onChange={e => setMonth(Number(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black outline-none transition-all">
                 {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
               </select>
               <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black outline-none transition-all">
                 {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
             </div>
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birim Filtresi</label>
             <select value={locFilter} onChange={e => setLocFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black outline-none transition-all">
               <option value="all">Tüm Lokasyonlar</option>
               {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
             </select>
           </div>
           <div className="flex items-end">
             <button onClick={handleDownload} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
               <FileDown className="w-5 h-5 mr-2" />
               <span>Export Al (CSV)</span>
             </button>
           </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 bg-slate-50 border-b flex items-center justify-between">
           <h3 className="font-black text-slate-900 flex items-center tracking-tight">
             <Database className="w-5 h-5 mr-3 text-blue-500" />
             Aktarım Önizleme ({periodKey})
           </h3>
           <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-3 py-1.5 rounded-full uppercase tracking-widest">{exportData.length} Kayıt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6">Sicil</th>
                <th className="p-6">Ad Soyad</th>
                <th className="p-6">Çalışma</th>
                <th className="p-6">Rapor (Y2)</th>
                <th className="p-6">Ücr.İzin (Y1)</th>
                <th className="p-6">FM</th>
                <th className="p-6">UBGT</th>
                <th className="p-6 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exportData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-black text-blue-600">{row.sicil}</td>
                  <td className="p-6 font-black text-slate-900">{row.ad}</td>
                  <td className="p-6 font-bold text-slate-500">{row.normalGun} G</td>
                  <td className="p-6 font-black text-rose-500">{row.raporGun} G</td>
                  <td className="p-6 font-bold text-slate-500">{row.ucretliIzin} G</td>
                  <td className="p-6 font-black text-emerald-600">{row.fazlaMesai} s</td>
                  <td className="p-6 font-black text-indigo-600">{row.ubgt} s</td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MikroExportPage;
