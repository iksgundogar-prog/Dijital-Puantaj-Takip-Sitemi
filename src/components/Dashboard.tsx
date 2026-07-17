import React from 'react';
import { Users, MapPin, Clock, TrendingUp, Bell, Briefcase } from 'lucide-react';
import { Location, Employee, AttendanceData, AuditLog, User } from '../types';
import { MONTHS, DAYS_IN_MONTH } from '../constants';

interface DashboardProps {
  locations: Location[];
  employees: Employee[];
  attendance: AttendanceData;
  auditLog: AuditLog[];
  isAdmin: boolean;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ locations, employees, attendance, auditLog, isAdmin, currentUser }) => {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const totalDays = DAYS_IN_MONTH(curY, curM);
  const periodKey = `${curY}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthData = attendance[periodKey] || {};

  let totalNormalHours = 0;
  let totalFMHours = 0;

  employees.forEach(emp => {
    const ep = currentMonthData[emp.id] || {};
    for (let d = 1; d <= totalDays; d++) {
      const cell = ep[d] || { code: '', fm: 0, ubgt: 0 };
      if (cell.code === "X" || cell.code === "G") totalNormalHours += 8;
      totalFMHours += (cell.fm || 0);
    }
  });

  const stats = [
    { label: isAdmin ? "PERSONEL" : "BİRİM EKİBİ", value: employees.length, icon: Users, accent: "#252F9C" },
    { label: "OPERASYONEL BİRİM", value: isAdmin ? locations.length : 1, icon: MapPin, accent: "#7C1034" },
    { label: "TOPLAM MESAİ (SAAT)", value: totalNormalHours.toFixed(0), icon: Clock, accent: "#252F9C" },
    { label: "FAZLA MESAİ (SAAT)", value: totalFMHours.toFixed(1), icon: TrendingUp, accent: "#7C1034" },
  ];

  const visibleLocations = isAdmin ? locations : locations.filter(l => l.id === currentUser.locationId);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col">
        <h2 className="text-4xl font-black text-[#252F9C] tracking-tighter">Panel Özeti</h2>
        <div className="flex items-center space-x-3 mt-2">
           <span className="text-[#7C1034] font-black uppercase text-[10px] tracking-[0.4em]">{MONTHS[curM]} {curY}</span>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
           <span className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">Stratejik Analiz</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-[#CFE5FF] shadow-2xl shadow-[#252F9C]/5 hover:shadow-[#252F9C]/10 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#CFE5FF]/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</span>
              <div className="p-4 rounded-2xl transition-transform duration-500" style={{ backgroundColor: `${s.accent}15`, color: s.accent }}>
                <s.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-4xl font-black text-[#252F9C] tracking-tight">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 bg-white rounded-[3rem] border border-[#CFE5FF] shadow-xl overflow-hidden">
          <div className="px-10 py-8 border-b border-[#CFE5FF] bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-[#252F9C] rounded-2xl">
                 <Briefcase className="w-6 h-6 text-white" />
               </div>
               <h3 className="font-black text-[#252F9C] text-xl tracking-tight uppercase">Birim Performans Analizi</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#CFE5FF]/20 text-[10px] font-black text-[#252F9C]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="p-8">Lokasyon / Birim</th>
                  <th className="p-8">İnsan Kaynağı</th>
                  <th className="p-8">Planlanan (Saat)</th>
                  <th className="p-8">FM Gerçekleşen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE5FF]">
                {visibleLocations.map(loc => {
                  const locEmps = employees.filter(e => e.locationId === loc.id);
                  let locHours = 0; let locFM = 0;
                  locEmps.forEach(emp => {
                    const ep = currentMonthData[emp.id] || {};
                    for (let d = 1; d <= totalDays; d++) {
                      const c = ep[d] || { fm: 0, ubgt: 0, code: '' };
                      if (['X','G'].includes(c.code)) locHours += 8;
                      locFM += (c.fm || 0);
                    }
                  });
                  return (
                    <tr key={loc.id} className="hover:bg-[#CFE5FF]/10 transition-colors">
                      <td className="p-8 font-black text-[#252F9C] text-lg uppercase">{loc.name}</td>
                      <td className="p-8 font-bold text-slate-500 uppercase text-xs tracking-widest">{locEmps.length} Personel</td>
                      <td className="p-8 font-black text-slate-700">{locHours} s</td>
                      <td className="p-8">
                        <span className="bg-[#7C1034] text-white px-5 py-2 rounded-full text-[10px] font-black shadow-lg shadow-[#7C1034]/20">{locFM.toFixed(1)} s</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#252F9C] rounded-[3rem] shadow-2xl p-10 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="flex items-center space-x-4 mb-10 relative">
            <div className="p-4 bg-white/10 rounded-[1.5rem]">
              <Bell className="w-7 h-7 text-[#CFE5FF]" />
            </div>
            <h3 className="font-black text-white text-xl tracking-tighter uppercase">Kritik İşlem Logları</h3>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4 relative">
            {auditLog.slice(0, 8).map((log) => (
              <div key={log.id} className="bg-white/5 backdrop-blur-sm p-6 rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-all flex items-start space-x-5">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[9px] bg-[#7C1034] text-white shadow-lg">
                  {log.action.substring(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-black text-[#CFE5FF] truncate uppercase tracking-widest">{log.user}</p>
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">{log.time.split(' ')[0]}</p>
                  </div>
                  <p className="text-[11px] text-white/70 font-medium line-clamp-2 leading-snug">{log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
