import React, { useState } from 'react';
import { LogIn, ClipboardList, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

interface LoginPageProps {
  users?: User[];
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .maybeSingle();

      if (dbError) {
        console.error('Login error:', dbError);
        setError("Giriş yapılırken sistemsel bir hata oluştu!");
        return;
      }

      if (!data) {
        setError("Kullanıcı adı veya şifre hatalı!");
        return;
      }

      const loggedUser: User = {
        id: data.id,
        username: data.username,
        role: data.role,
        locationId: data.location_id,
        fullName: data.full_name,
        isActive: data.is_active
      };

      onLogin(loggedUser);
    } catch (err) {
      console.error(err);
      setError("Bağlantı hatası oluştu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" 
         style={{ background: "linear-gradient(135deg, #252F9C 0%, #1a237e 50%, #7C1034 100%)" }}>
      
      {/* Sophisticated Soft Blur Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#CFE5FF]/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#7C1034]/10 blur-[120px]" />

      <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-[#252F9C] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#252F9C]/20 transition-transform hover:scale-105 duration-500 relative group">
            <ClipboardList className="w-12 h-12 text-white" />
            <div className="absolute -bottom-2 -right-2 bg-[#7C1034] p-2 rounded-xl border-4 border-white shadow-lg">
               <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-[#252F9C] tracking-tighter leading-none italic uppercase">BİLGİN</h1>
          <p className="text-[#7C1034] text-[10px] font-black uppercase tracking-[0.4em] mt-3">Merkezi Puantaj Sistemi</p>
        </div>

        <form onSubmit={doLogin} className="space-y-8">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-[#7C1034] text-[11px] font-black rounded-2xl p-4 text-center animate-pulse">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sistem Erişimi</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#CFE5FF]/20 border border-slate-100 text-[#252F9C] rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-[#CFE5FF] focus:bg-white transition-all placeholder-slate-300 font-bold"
              placeholder="Kullanıcı Adı"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Güvenlik Anahtarı</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#CFE5FF]/20 border border-slate-100 text-[#252F9C] rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-[#CFE5FF] focus:bg-white transition-all placeholder-slate-300 font-bold"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C1034] hover:bg-[#630d2a] disabled:bg-slate-400 text-white font-black py-6 rounded-2xl flex items-center justify-center space-x-4 transition-all transform active:scale-95 shadow-2xl shadow-[#7C1034]/20 group"
          >
            <span className="text-xl tracking-tight">{loading ? "GİRİŞ YAPILIYOR..." : "GÜVENLİ GİRİŞ"}</span>
            {!loading && <LogIn className="w-7 h-7 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-16 pt-10 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Hazırlayan: Süleyman Gündoğar</p>
          <p className="text-[#252F9C] text-[8px] font-bold mt-1 tracking-widest uppercase">© 2025 BİLGİN SİSTEM</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
