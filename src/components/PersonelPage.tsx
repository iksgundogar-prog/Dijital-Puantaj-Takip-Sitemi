import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, UserPlus, X, CheckCircle } from 'lucide-react';
import { Employee, Location, User } from '../types';
import { SGK_MESLEK_KODLARI } from '../constants';
import { supabase } from '../supabaseClient';

interface PersonelPageProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  locations: Location[];
  isAdmin: boolean;
  currentUser: User;
  addAudit: (action: string, detail: string) => void;
}

const PersonelPage: React.FC<PersonelPageProps> = ({
  employees, setEmployees, locations, isAdmin, currentUser, addAudit
}) => {
  const [search, setSearch] = useState('');
  const [locFilter, setLocFilter] = useState(isAdmin ? 'all' : String(currentUser.locationId));
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<Partial<Employee>>({
    sicilNo: '', adSoyad: '', gorevi: '', isGiris: '', isCikis: '', locationId: 1
  });

  const filtered = useMemo(() => {
    let list = isAdmin ? employees : employees.filter(e => e.locationId === currentUser.locationId);
    if (locFilter !== 'all') list = list.filter(e => e.locationId === Number(locFilter));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.adSoyad.toLowerCase().includes(s) || e.sicilNo.includes(search));
    }
    return list;
  }, [employees, isAdmin, currentUser, locFilter, search]);

  const handleOpenModal = (emp: Employee | null) => {
    if (emp) {
      setEditEmp(emp);
      setFormData(emp);
    } else {
      setEditEmp(null);
      setFormData({ 
        sicilNo: '', 
        adSoyad: '', 
        gorevi: '', 
        isGiris: new Date().toLocaleDateString('tr-TR'), 
        isCikis: '', 
        locationId: isAdmin ? 1 : (currentUser.locationId || 1) 
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dbPayload = {
      sicil_no: formData.sicilNo,
      ad_soyad: formData.adSoyad,
      location_id: formData.locationId,
      gorevi: formData.gorevi,
      is_giris: formData.isGiris,
      is_cikis: formData.isCikis || null,
      is_active: formData.isActive !== undefined ? formData.isActive : true
    };

    if (editEmp) {
      const { data, error } = await supabase
        .from('employees')
        .update(dbPayload)
        .eq('id', editEmp.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Hata: Personel güncellenemedi!');
        return;
      }

      setEmployees(prev => prev.map(e => e.id === editEmp.id ? {
        id: data.id,
        sicilNo: data.sicil_no,
        adSoyad: data.ad_soyad,
        locationId: data.location_id,
        gorevi: data.gorevi,
        isGiris: data.is_giris,
        isCikis: data.is_cikis,
        isActive: data.is_active
      } as Employee : e));
      addAudit("PERSONEL", `${formData.adSoyad} personeli güncellendi.`);
    } else {
      const { data, error } = await supabase
        .from('employees')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Hata: Personel eklenemedi!');
        return;
      }

      const newEmp: Employee = {
        id: data.id,
        sicilNo: data.sicil_no,
        adSoyad: data.ad_soyad,
        locationId: data.location_id,
        gorevi: data.gorevi,
        isGiris: data.is_giris,
        isCikis: data.is_cikis,
        isActive: data.is_active
      };

      setEmployees(prev => [...prev, newEmp]);
      addAudit("PERSONEL", `${formData.adSoyad} personeli sisteme eklendi.`);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    const emp = employees.find(e => e.id === id);
    if (!window.confirm(`${emp?.adSoyad} isimli personeli silmek istediğinizden emin misiniz?`)) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Hata: Personel silinemedi! (Puantaj kaydı bulunuyor olabilir)');
      return;
    }

    setEmployees(prev => prev.filter(e => e.id !== id));
    addAudit("PERSONEL", `${emp?.adSoyad} personel kaydı silindi.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#252F9C] tracking-tighter">Personel Yönetimi</h1>
          <p className="text-slate-400 text-sm font-black uppercase tracking-widest mt-1">{filtered.length} Aktif Kayıt</p>
        </div>
        <button 
          onClick={() => handleOpenModal(null)}
          className="bg-[#7C1034] hover:bg-[#630d2a] text-white font-black px-10 py-5 rounded-[2rem] flex items-center space-x-4 shadow-2xl shadow-[#7C1034]/20 transition-all active:scale-95 group"
        >
          <UserPlus className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          <span className="text-lg">Yeni Personel Ekle</span>
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[320px] relative group">
          <Search className="w-6 h-6 text-slate-400 absolute left-6 top-1/2 transform -translate-y-1/2 group-focus-within:text-[#252F9C] transition-colors" />
          <input
            type="text"
            placeholder="İsim veya Sicil No ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f8fafc] border border-slate-100 rounded-2xl pl-16 pr-8 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
          />
        </div>
        {isAdmin && (
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="bg-[#f8fafc] border border-slate-100 rounded-2xl px-10 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all cursor-pointer text-[#252F9C]"
          >
            <option value="all">Tüm Lokasyonlar</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden border-b-[12px]" style={{ borderBottomColor: '#252F9C' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-[#252F9C] uppercase tracking-[0.2em]">
                <th className="p-8">Sicil</th>
                <th className="p-8">Ad Soyad</th>
                <th className="p-8">Görev (SGK)</th>
                <th className="p-8">Lokasyon</th>
                <th className="p-8">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#CFE5FF]/20 transition-colors group">
                  <td className="p-8 font-black text-[#252F9C] text-lg">{emp.sicilNo}</td>
                  <td className="p-8 font-black text-slate-900 text-lg uppercase">{emp.adSoyad}</td>
                  <td className="p-8">
                    <span className="bg-[#CFE5FF] text-[#252F9C] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight line-clamp-1 max-w-[250px] shadow-sm">
                      {emp.gorevi || '—'}
                    </span>
                  </td>
                  <td className="p-8 font-bold text-slate-500 uppercase text-xs">{locations.find(l => l.id === emp.locationId)?.name}</td>
                  <td className="p-8">
                    <div className="flex items-center space-x-3">
                      <button onClick={() => handleOpenModal(emp)} className="p-3 text-slate-400 hover:text-[#252F9C] hover:bg-[#CFE5FF] rounded-2xl transition-all"><Pencil className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-3 text-slate-400 hover:text-[#7C1034] hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#252F9C]/40 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
             <div className="px-12 py-10 border-b bg-slate-50 flex items-center justify-between">
               <div className="flex flex-col">
                  <h3 className="font-black text-[#252F9C] text-3xl tracking-tighter mb-1">{editEmp ? 'Kaydı Güncelle' : 'Personel Tanımla'}</h3>
                  <span className="text-[11px] font-black text-[#7C1034] uppercase tracking-[0.3em]">Merkezi Yönetim Konsolu</span>
               </div>
               <button onClick={() => setModalOpen(false)} className="p-4 hover:bg-slate-200 rounded-3xl transition-all"><X className="w-8 h-8 text-slate-400" /></button>
             </div>
             <form onSubmit={handleSave} className="p-12 space-y-8">
               <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-3">
                   <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Sicil Numarası</label>
                   <input required value={formData.sicilNo} onChange={e => setFormData({...formData, sicilNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all" />
                 </div>
                 <div className="space-y-3">
                   <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Çalışma Birimi</label>
                   <select value={formData.locationId} onChange={e => setFormData({...formData, locationId: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all text-[#252F9C]">
                     {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                 </div>
               </div>
               
               <div className="space-y-3">
                 <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Personel Kimlik (Ad Soyad)</label>
                 <input required value={formData.adSoyad} onChange={e => setFormData({...formData, adSoyad: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all uppercase" />
               </div>

               <div className="space-y-3">
                 <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Görev / Ünvan (SGK)</label>
                 <input 
                   list="sgk-kodlari" 
                   value={formData.gorevi} 
                   onChange={e => setFormData({...formData, gorevi: e.target.value})} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all"
                   placeholder="Arayın veya yazın..."
                 />
                 <datalist id="sgk-kodlari">
                   {SGK_MESLEK_KODLARI.map(kod => <option key={kod} value={kod} />)}
                 </datalist>
               </div>

               <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Giriş Tarihi</label>
                    <input type="text" placeholder="GG.AA.YYYY" value={formData.isGiris} onChange={e => setFormData({...formData, isGiris: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all" />
                 </div>
                 <div className="space-y-3">
                   <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Çıkış Tarihi</label>
                   <input type="text" placeholder="GG.AA.YYYY" value={formData.isCikis} onChange={e => setFormData({...formData, isCikis: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-base font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all" />
                 </div>
               </div>

               <div className="flex items-center space-x-6 pt-6">
                 <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-400 font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-xs">VAZGEÇ</button>
                 <button type="submit" className="flex-[2] bg-[#7C1034] hover:bg-[#630d2a] text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-4 shadow-2xl transition-all active:scale-95">
                   <CheckCircle className="w-7 h-7" />
                   <span className="text-xl">KAYDI TAMAMLA</span>
                 </button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PersonelPage;
