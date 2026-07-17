import React, { useState } from 'react';
import { Shield, MapPin, Eye, EyeOff, UserPlus, X, Check, Pencil, Trash2 } from 'lucide-react';
import { User, Location, Role } from '../types';
import { supabase } from '../supabaseClient';

interface KullaniciPageProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  locations: Location[];
  addAudit: (action: string, detail: string) => void;
}

const KullaniciPage: React.FC<KullaniciPageProps> = ({ users, setUsers, locations, addAudit }) => {
  const [showPasswords, setShowPasswords] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<Partial<User>>({
    username: '', password: '', role: Role.USER, locationId: null, fullName: '', isActive: true
  });

  const handleOpenModal = (user: User | null) => {
    if (user) {
      setEditUser(user);
      setFormData(user);
    } else {
      setEditUser(null);
      setFormData({ username: '', password: '', role: Role.USER, locationId: locations[0]?.id || null, fullName: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) {
      alert("Lütfen tüm alanları doldurunuz.");
      return;
    }

    const dbPayload = {
      username: formData.username,
      password: formData.password,
      role: formData.role,
      location_id: formData.locationId,
      full_name: formData.fullName,
      is_active: formData.isActive !== undefined ? formData.isActive : true
    };

    if (editUser) {
      const { data, error } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('id', editUser.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Hata: Kullanıcı güncellenemedi!');
        return;
      }

      setUsers(prev => prev.map(u => u.id === editUser.id ? {
        id: data.id,
        username: data.username,
        role: data.role,
        locationId: data.location_id,
        fullName: data.full_name,
        isActive: data.is_active
      } : u));
      addAudit("KULLANICI", `${formData.fullName} kullanıcısı güncellendi.`);
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Hata: Kullanıcı oluşturulamadı!');
        return;
      }

      setUsers(prev => [...prev, {
        id: data.id,
        username: data.username,
        role: data.role,
        locationId: data.location_id,
        fullName: data.full_name,
        isActive: data.is_active
      }]);
      addAudit("KULLANICI", `${formData.fullName} kullanıcısı oluşturuldu.`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    const u = users.find(x => x.id === id);
    if (u?.username === 'admin') {
      alert("Ana yönetici hesabı silinemez!");
      return;
    }
    if (!window.confirm(`${u?.fullName} kullanıcısını silmek istediğinizden emin misiniz?`)) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Hata: Kullanıcı silinemedi!');
      return;
    }

    setUsers(prev => prev.filter(x => x.id !== id));
    addAudit("KULLANICI", `${u?.fullName} kullanıcısı silindi.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-slate-500 text-sm font-medium">Sisteme erişimi olan yetkili hesaplar.</p>
        </div>
        <div className="flex space-x-2">
           <button 
             onClick={() => setShowPasswords(!showPasswords)}
             className="bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-all active:scale-95"
           >
             {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             <span>Şifreleri {showPasswords ? 'Gizle' : 'Göster'}</span>
           </button>
           <button onClick={() => handleOpenModal(null)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
             <UserPlus className="w-4 h-4" />
             <span>Yeni Kullanıcı</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
            <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(u)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${u.role === 'ADMIN' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                <Shield className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-900 truncate tracking-tight pr-12">{u.fullName}</h3>
                <p className="text-sm font-bold text-slate-400">@{u.username}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rol</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${u.role === 'ADMIN' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>{u.role}</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Şifre</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{showPasswords ? u.password : '••••••••'}</span>
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center space-x-2">
               <MapPin className="w-4 h-4 text-slate-400" />
               <span className="text-xs font-bold text-slate-500 truncate">{u.locationId ? locations.find(l => l.id === u.locationId)?.name : 'Tüm Lokasyonlar'}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-8 py-6 border-b bg-slate-50 flex items-center justify-between">
               <h3 className="font-black text-slate-900 text-xl">{editUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             <form onSubmit={handleSave} className="p-8 space-y-6">
               <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Ad Soyad</label>
                 <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Ahmet Yılmaz" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Kullanıcı Adı</label>
                   <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="user_ahmet" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Şifre</label>
                   <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Şifre123" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Yetki Rolü</label>
                   <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                     <option value="USER">Birim Yetkilisi</option>
                     <option value="ADMIN">Sistem Yöneticisi</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Sorumlu Olduğu Birim</label>
                   <select value={formData.locationId || ''} onChange={e => setFormData({...formData, locationId: e.target.value ? Number(e.target.value) : null})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                     <option value="">Tümü (Genel Yetki)</option>
                     {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                 </div>
               </div>
               <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center">
                 <Check className="w-5 h-5 mr-2" />
                 <span>KAYDET</span>
               </button>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default KullaniciPage;
