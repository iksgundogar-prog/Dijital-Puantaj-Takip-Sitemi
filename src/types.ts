export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface Location {
  id: number;
  code: string;
  name: string;
  defaultHours: number;
}

export interface Employee {
  id: number;
  sicilNo: string;
  adSoyad: string;
  locationId: number;
  gorevi: string;
  isGiris: string;
  isCikis?: string;
  isActive: boolean;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: Role;
  locationId: number | null;
  fullName: string;
  isActive: boolean;
}

export interface AttendanceCell {
  code: string;
  ubgt: number;
  fm: number;
  meal: boolean;
}

export interface AttendanceData {
  [periodKey: string]: {
    [empId: number]: {
      [day: number]: AttendanceCell;
    };
  };
}

export interface AuditLog {
  id: number;
  user: string;
  action: string;
  detail: string;
  time: string;
}

export interface LockedPeriods {
  [key: string]: boolean;
}

export type Page = 'dashboard' | 'puantaj' | 'personel' | 'lokasyon' | 'kullanici' | 'donemkilit' | 'mikroexp' | 'auditlog';
