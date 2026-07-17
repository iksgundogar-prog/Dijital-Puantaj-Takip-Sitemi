import React, { useState, useCallback, useEffect } from 'react';
import {
  LogOut, LayoutDashboard, Users, MapPin, UserCheck,
  ClipboardList, Lock, FileDown, Bell, Menu, X, FileText
} from 'lucide-react';
import { Location, Employee, User, AttendanceData, AuditLog, LockedPeriods, Page, Role } from './types';
import { supabase } from './supabaseClient';

import Dashboard from './components/Dashboard';
import PuantajPage from './components/PuantajPage';
import PersonelPage from './components/PersonelPage';
import LokasyonPage from './components/LokasyonPage';
import KullaniciPage from './components/KullaniciPage';
import DonemKilitPage from './components/DonemKilitPage';
import MikroExportPage from './components/MikroExportPage';
import AuditLogPage from './components/AuditLogPage';
import LoginPage from './components/LoginPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [lockedPeriods, setLockedPeriods] = useState<LockedPeriods>({});
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);

  const addAudit = useCallback((action: string, detail: string) => {
    const userName = currentUser?.fullName || currentUser?.username || 'Sistem';
    
    const newLog: AuditLog = {
      id: Date.now(),
      time: new Date().toLocaleString("tr"),
      user: userName,
      action,
      detail
    };
    setAuditLog(prev => [newLog, ...prev]);

    supabase
      .from('audit_logs')
      .insert({
        user_name: userName,
        action,
        detail
      })
      .then(({ error }) => {
        if (error) console.error('Supabase write audit error:', error);
      });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        const { data: locs, error: locsErr } = await supabase.from('locations').select('*').order('id');
        if (locsErr) throw locsErr;
        setLocations(locs || []);

        const { data: emps, error: empsErr } = await supabase.from('employees').select('*').order('id');
        if (empsErr) throw empsErr;
        setEmployees(
          (emps || []).map((e: any) => ({
            id: e.id,
            sicilNo: e.sicil_no,
            adSoyad: e.ad_soyad,
            locationId: e.location_id,
            gorevi: e.gorevi,
            isGiris: e.is_giris,
            isCikis: e.is_cikis,
            isActive: e.is_active,
          }))
        );

        const { data: locks, error: locksErr } = await supabase.from('locked_periods').select('*');
        if (locksErr) throw locksErr;
        const lockMap: LockedPeriods = {};
        (locks || []).forEach((row: any) => {
          lockMap[row.period_key] = row.is_locked;
        });
        setLockedPeriods(lockMap);

        const { data: atts, error: attsErr } = await supabase.from('attendance').select('*');
        if (attsErr) throw attsErr;
        const attMap: AttendanceData = {};
        (atts || []).forEach((row: any) => {
          const pk = row.period_key;
          const empId = row.employee_id;
          const day = row.day;
          if (!attMap[pk]) attMap[pk] = {};
          if (!attMap[pk][empId]) attMap[pk][empId] = {};
          attMap[pk][empId][day] = {
            code: row.code,
            ubgt: Number(row.ubgt || 0),
            fm: Number(row.fm || 0),
            meal: !!row.meal,
          };
        });
        setAttendance(attMap);

        const { data: logs, error: logsErr } = await supabase
          .from('audit_logs')
          .select('*')
          .order('id', { ascending: false })
          .limit(150);
        if (logsErr) throw logsErr;
        setAuditLog(
          (logs || []).map((l: any) => ({
            id: l.id,
            time: new Date(l.created_at).toLocaleString('tr'),
            user: l.user_name,
            action: l.action,
            detail: l.detail,
          }))
        );

        if (currentUser.role === Role.ADMIN) {
          const { data: dbUsers, error: usersErr } = await supabase.from('users').select('*').order('id');
          if (usersErr) throw usersErr;
          setUsers(
            (dbUsers || []).map((u: any) => ({
              id: u.id,
              username: u.username,
              role: u.role,
              locationId: u.location_id,
              fullName: u.full_name,
              isActive: u.is_active,
            }))
          );
        }
      } catch (err) {
        console.error('Error loading initial data from Supabase:', err);
        alert('Veritabanından veriler yüklenirken bir hata oluştu!');
      }
    };

    loadData();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addAudit('LOGIN', 'Sisteme giriş yapıldı');
  };

  if (!currentUser) {
    return <LoginPage users={users} onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === Role.ADMIN;

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#252f3c] text-white transition-all flex flex-col shadow-xl`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-700/50">
          {sidebarOpen && <span className="font-bold text-xl text-blue-400 italic tracking-tighter">BİLGİN</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-700 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
          <button onClick={() => setPage('dashboard')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
            <LayoutDashboard size={20} />
            {sidebarOpen && <span className="ml-3 font-medium text-sm">Dashboard</span>}
          </button>
          <button onClick={() => setPage('puantaj')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'puantaj' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
            <ClipboardList size={20} />
            {sidebarOpen && <span className="ml-3 font-medium text-sm">Puantaj</span>}
          </button>
          <button onClick={() => setPage('personel')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'personel' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
            <UserCheck size={20} />
            {sidebarOpen && <span className="ml-3 font-medium text-sm">Personel</span>}
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setPage('lokasyon')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'lokasyon' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
                <MapPin size={20} />
                {sidebarOpen && <span className="ml-3 font-medium text-sm">Lokasyonlar</span>}
              </button>
              <button onClick={() => setPage('kullanici')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'kullanici' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
                <Users size={20} />
                {sidebarOpen && <span className="ml-3 font-medium text-sm">Kullanıcılar</span>}
              </button>
              <button onClick={() => setPage('donemkilit')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'donemkilit' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
                <Lock size={20} />
                {sidebarOpen && <span className="ml-3 font-medium text-sm">Dönem Kilit</span>}
              </button>
              <button onClick={() => setPage('mikroexp')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'mikroexp' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
                <FileDown size={20} />
                {sidebarOpen && <span className="ml-3 font-medium text-sm">Mikro Export</span>}
              </button>
              <button onClick={() => setPage('auditlog')} className={`w-full flex items-center p-3 rounded-xl transition-colors ${page === 'auditlog' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-800'}`}>
                <FileText size={20} />
                {sidebarOpen && <span className="ml-3 font-medium text-sm">Audit Log</span>}
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center p-3 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-3 font-medium text-sm">Çıkış</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              {currentUser.fullName?.[0] || currentUser.username?.[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-none">{currentUser.fullName}</h1>
              <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">{currentUser.role === Role.ADMIN ? 'Sistem Yöneticisi' : 'Birim Yetkilisi'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="p-2 text-gray-400 hover:text-blue-600 cursor-pointer relative transition-colors">
               <Bell size={20} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-12 bg-[#fdfdfd]">
          <div className="max-w-[1700px] mx-auto h-full">
            {page === 'dashboard' && <Dashboard locations={locations} employees={employees} attendance={attendance} auditLog={auditLog} isAdmin={isAdmin} currentUser={currentUser} />}
            {page === 'puantaj' && <PuantajPage employees={employees} locations={locations} isAdmin={isAdmin} currentUser={currentUser} attendance={attendance} setAttendance={setAttendance} lockedPeriods={lockedPeriods} addAudit={addAudit} />}
            {page === 'personel' && <PersonelPage employees={employees} setEmployees={setEmployees} locations={locations} isAdmin={isAdmin} currentUser={currentUser} addAudit={addAudit} />}
            {page === 'lokasyon' && <LokasyonPage locations={locations} setLocations={setLocations} users={users} addAudit={addAudit} />}
            {page === 'kullanici' && <KullaniciPage users={users} setUsers={setUsers} locations={locations} addAudit={addAudit} />}
            {page === 'donemkilit' && <DonemKilitPage lockedPeriods={lockedPeriods} setLockedPeriods={setLockedPeriods} addAudit={addAudit} />}
            {page === 'mikroexp' && <MikroExportPage employees={employees} locations={locations} attendance={attendance} addAudit={addAudit} />}
            {page === 'auditlog' && <AuditLogPage auditLog={auditLog} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
