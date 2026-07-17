import React, { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Users as UsersIcon } from 'lucide-react';
import { Location, User } from '../types';
import { supabase } from '../supabaseClient';

interface LokasyonPageProps {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  users: User[];
  addAudit: (action: string, detail: string) => void;
}

const LokasyonPage: React.FC<LokasyonPageProps> = ({ locations, setLocations, users, addAudit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<Location | null>(null);
  const [formData, setFormData] = useState<Partial<Location>>({ code: '', name: '', defaultHours: 8 });

  const handleOpenModal = (loc: Location | null) => {
    if (loc) {
      setEditLoc(loc);
      setFormData(loc);
    } else {
      setEditLoc(null);
      setFormData({ code: '', name: '', defaultHours: 8 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (formData.code && formData.name) {
      const dbPayload = {
        code: formData.code,
        name: formData.name,
        default_hours: formData.defaultHours || 8
      };

      if (editLoc) {
        const { data, error } = await supabase
          .from('locations')
          .update(dbPayload)
          .eq('id', editLoc.id)
          .select()
          .single();

        if (error) {
          console.error(error);
          alert('Hata: Lokasyon güncellenemedi!');
          return;
        }

        setLocations(prev => prev.map(l => l.id === editLoc.id ? {
          id: data.id,
          code: data.code,
          name: data.name,
          defaultHours: data.default_hours
        } : l));
        addAudit("LOKASYON", `Lokasyon güncellendi: ${formData.name}`);
      } else {
        const { data, error } = await supabase
          .from('locations')
          .insert(dbPayload)
          .select()
          .single();

        if (error) {
          console.error(error);
          alert('Hata: Yeni lokasyon eklenemedi!');
          return;
        }

        setLocations(prev => [...prev, {
          id: data.id,
          code: data.code,
          name: data.name,
          defaultHours: data.default_hours
        }]);
        addAudit("LOKASYON", `Yeni lokasyon eklendi: ${formData.name}`);
      }
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: number) => {
    const loc = locations.find(l => l.id === id);
    if (!window.confirm(`${loc?.name} lokasyonunu silmek istediğinizden emin misiniz?`)) return;

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Hata: Lokasyon silinemedi! (Lokasyona bağlı personel veya kullanıcı olabilir)');
      return;
    }

    setLocations(prev => prev.filter(l => l.id !== id));
    addAudit("LOKASYON", `${loc?.name} lokasyonu silindi.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lokasyonlar</h1>
          <p className="text-slate-500 text-sm font-medium">Birim ve Şube Yönetimi</p>
        </div>
        <button onClick={() => handleOpenModal(null)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
          <Plus className="w-5 h-5" />
          <span>Yeni Lokasyon</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((loc) => {
          const assignedUser = users.find(u => u.locationId === loc.id);
          return (
            <div key={loc.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => handleOpenModal(loc)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(loc.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <MapPin className="w-7 h-7" />
                </div>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{loc.code}</div>
              <h3 className="text-xl font-black text-slate-900 mb-6 truncate pr-12 tracking-tight">{loc.name}</h3>
              
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Normal Mesai:</span>
                  <span className="text-slate-900">{loc.defaultHours} Saat</span>
                </div>
                <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <UsersIcon className="w-4 h-4 mr-3 text-blue-500" />
                  <span className="truncate">Sorumlu: {assignedUser ? <span className="text-slate-900">{assignedUser.fullName}</span> : <span className="text-rose-400 italic font-medium">Birim Yetkilisi Yok</span>}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="px-8 py-8 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-black text-slate-900 text-xl tracking-tight">{editLoc ? 'Lokasyon Düzenle' : 'Yeni Kayıt'}</h3>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Master Data Girişi</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">BİRİM KODU</label>
                 <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="LOK001" />
               </div>
               <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">BİRİM ADI</label>
                 <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Merkez Şube" />
               </div>
               <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNLÜK MESAİ (SAAT)</label>
                 <input type="number" value={formData.defaultHours} onChange={e => setFormData({...formData, defaultHours: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none transition-all" placeholder="8" />
               </div>
               <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95">
                 {editLoc ? 'GÜNCELLEMEYİ KAYDET' : 'KAYDI TAMAMLA'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LokasyonPage;
