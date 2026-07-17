import React, { useState } from 'react';
import { FileText, Filter, History } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogPageProps {
  auditLog: AuditLog[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ auditLog }) => {
  const [filter, setFilter] = useState('all');

  const actions = ['all', 'LOGIN', 'LOGOUT', 'PUANTAJ', 'PERSONEL', 'LOKASYON', 'KULLANICI', 'LOCK', 'UNLOCK', 'EXPORT'];

  const filteredLogs = filter === 'all' ? auditLog : auditLog.filter(log => log.action === filter);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'LOCK': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'UNLOCK': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'PUANTAJ': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'EXPORT': return 'bg-slate-900 text-white border-slate-900';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log</h1>
        <p className="text-slate-500 text-sm font-medium">Sistem üzerindeki tüm kritik işlemlerin kayıtları.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <div className="flex items-center text-slate-400 mr-2">
          <Filter className="w-4 h-4 mr-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Filtrele:</span>
        </div>
        {actions.map((act) => (
          <button 
            key={act} 
            onClick={() => setFilter(act)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
              filter === act 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
            }`}
          >
            {act === 'all' ? 'TÜMÜ' : act}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <History className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                   <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{log.user}</span>
                   </div>
                   <p className="text-slate-600 font-medium">{log.detail}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                 <p className="text-xs font-bold text-slate-400 tracking-tighter">{log.time}</p>
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="p-10 text-center flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium italic">Kayıt bulunamadı.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
