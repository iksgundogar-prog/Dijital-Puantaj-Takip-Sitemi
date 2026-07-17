import { Location, Employee, User, Role } from './types';

export const LOCATIONS: Location[] = [
  { id: 1,  code: "LOK001", name: "İstanbul Merkez", defaultHours: 8 },
  { id: 2,  code: "LOK002", name: "Ankara",          defaultHours: 8 },
  { id: 3,  code: "LOK003", name: "İzmir",           defaultHours: 8 },
  { id: 4,  code: "LOK004", name: "Bursa",           defaultHours: 8 },
  { id: 5,  code: "LOK005", name: "Antalya",         defaultHours: 8 },
  { id: 6,  code: "LOK006", name: "Adana",           defaultHours: 8 },
  { id: 7,  code: "LOK007", name: "Gaziantep",       defaultHours: 8 },
  { id: 8,  code: "LOK008", name: "Konya",           defaultHours: 8 },
  { id: 9,  code: "LOK009", name: "Mersin",          defaultHours: 8 },
  { id: 10, code: "LOK010", name: "Kayseri",         defaultHours: 8 },
  { id: 11, code: "LOK011", name: "Trabzon",         defaultHours: 8 },
  { id: 12, code: "LOK012", name: "Samsun",          defaultHours: 8 },
  { id: 13, code: "LOK013", name: "Denizli",         defaultHours: 8 },
  { id: 14, code: "LOK014", name: "Eskişehir",       defaultHours: 8 },
];

export const SGK_MESLEK_KODLARI = [
  "1112.01 - Genel Müdür",
  "1112.02 - Genel Müdür Yardımcısı",
  "2141.01 - Endüstri Mühendisi",
  "2142.01 - İnşaat Mühendisi",
  "2144.01 - Makine Mühendisi",
  "2151.01 - Elektrik Mühendisi",
  "2411.01 - Muhasebeci",
  "2411.02 - Mali Müşavir",
  "2421.01 - Yönetim Danışmanı",
  "3112.01 - İnşaat Teknikeri",
  "3113.01 - Elektrik Teknikeri",
  "3115.01 - Makine Teknikeri",
  "3322.01 - Satış Temsilcisi",
  "3341.01 - Büro Yönetimi Elemanı",
  "4110.01 - Sekreter",
  "4311.01 - Muhasebe Kayıt Elemanı",
  "5223.01 - Tezgahtar",
  "7233.01 - Makine Bakım Onarımcısı",
  "8181.01 - Forklift Operatörü",
  "9112.01 - Temizlik Görevlisi",
  "9333.01 - Yükleme Boşaltma İşçisi",
  "9412.01 - Kurye"
];

export const GOREVLER = ["MÜDÜR", "ŞEF", "UZMAN", "MÜHENDİS", "TEKNİKER", "MEMUR", "OPERATÖR", "İŞÇİ"];

const generateSeedEmployees = (): Employee[] => {
  const list: Employee[] = [];
  let sid = 5001;
  LOCATIONS.forEach(loc => {
    const names = [["Ahmet", "Yılmaz"], ["Ayşe", "Demir"], ["Mehmet", "Kaya"]];
    names.forEach(([fn, ln], i) => {
      list.push({
        id: sid,
        sicilNo: String(sid).padStart(5, "0"),
        adSoyad: `${fn} ${ln}`,
        locationId: loc.id,
        gorevi: GOREVLER[i % GOREVLER.length],
        isGiris: `01.01.2023`,
        isActive: true
      });
      sid++;
    });
  });
  return list;
};

export const SEED_EMPLOYEES = generateSeedEmployees();

export const SEED_USERS: User[] = [
  { id: 1, username: "admin", password: "Admin123!", role: Role.ADMIN, locationId: null, fullName: "Sistem Yöneticisi", isActive: true },
  ...LOCATIONS.map((loc, i) => ({
    id: i + 2,
    username: `user${i + 1}`,
    password: "User123!",
    role: Role.USER,
    locationId: loc.id,
    fullName: `${loc.name} Yetkilisi`,
    isActive: true
  }))
];

export const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const DAYNAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export interface CodeStyle {
  bg: string;
  text: string;
  label: string;
  isPaid: boolean;
  isWork?: boolean;
}

export const CODE_STYLES: { [key: string]: CodeStyle } = {
  "X":  { bg: "#dcfce7", text: "#16a34a", label: "Çalıştı", isPaid: true, isWork: true },
  "H":  { bg: "#fee2e2", text: "#dc2626", label: "Hafta Tatili", isPaid: true },
  "Y1": { bg: "#fefce8", text: "#ca8a04", label: "Yıllık İzin", isPaid: true },
  "Y2": { bg: "#dbeafe", text: "#2563eb", label: "Raporlu", isPaid: true },
  "İ":  { bg: "#f3e8ff", text: "#9333ea", label: "Ücretsiz İzin", isPaid: false },
  "G":  { bg: "#f1f5f9", text: "#475569", label: "Görevli", isPaid: true, isWork: true },
  "D":  { bg: "#fef2f2", text: "#991b1b", label: "Devamsız", isPaid: false },
  "A":  { bg: "#fce7f3", text: "#db2777", label: "Analık İzni", isPaid: true },
  "B":  { bg: "#e0f2fe", text: "#0369a1", label: "Babalık İzni", isPaid: true },
  "S":  { bg: "#ccfbf1", text: "#0f766e", label: "Süt İzni", isPaid: true },
  "V":  { bg: "#f5f5f5", text: "#404040", label: "Vefat İzni", isPaid: true },
  "E":  { bg: "#fae8ff", text: "#a21caf", label: "Evlilik İzni", isPaid: true },
  "":   { bg: "transparent", text: "#cbd5e1", label: "Boş", isPaid: false }
};

export const DAYS_IN_MONTH = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const DAY_OF_WEEK = (y: number, m: number, d: number) => new Date(y, m, d).getDay();
