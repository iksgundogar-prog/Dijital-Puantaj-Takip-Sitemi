import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Calendar, Save, Check, Lock, Zap, X, Utensils, FileDown, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Employee, Location, User, AttendanceData, LockedPeriods, AttendanceCell } from '../types';
import { MONTHS, DAYNAMES, CODE_STYLES, DAYS_IN_MONTH, DAY_OF_WEEK } from '../constants';
import { supabase } from '../supabaseClient';

interface PuantajPageProps {
  employees: Employee[];
  locations: Location[];
  isAdmin: boolean;
  currentUser: User;
  attendance: AttendanceData;
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceData>>;
  lockedPeriods: LockedPeriods;
  addAudit: (action: string, detail: string) => void;
}

const PuantajPage: React.FC<PuantajPageProps> = ({
  employees, locations, isAdmin, currentUser, attendance, setAttendance, lockedPeriods, addAudit
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [locFilter, setLocFilter] = useState(isAdmin ? 'all' : String(currentUser.locationId));
  const [modal, setModal] = useState<{ empId: number, day: number } | null>(null);

  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const isLocked = !!lockedPeriods[periodKey];
  const totalDays = DAYS_IN_MONTH(year, month);

  const displayEmps = useMemo(() => {
    let list = isAdmin ? employees : employees.filter(e => e.locationId === currentUser.locationId);
    if (locFilter !== 'all') list = list.filter(e => e.locationId === Number(locFilter));
    return list;
  }, [employees, isAdmin, locFilter, currentUser]);

  const currentMonthData = attendance[periodKey] || {};

  const autoFillAll = useCallback(() => {
    if (isLocked) return;
    if (!window.confirm(`${MONTHS[month]} ${year} dönemi için seçili ${displayEmps.length} personele otomatik puantaj uygulansın mı?`)) return;

    setAttendance(prev => {
      const next = { ...prev };
      const periodData = { ...(next[periodKey] || {}) };

      displayEmps.forEach(emp => {
        const empUpd: { [day: number]: AttendanceCell } = {};
        for (let d = 1; d <= totalDays; d++) {
          const dow = DAY_OF_WEEK(year, month, d);
          const isWeekend = (dow === 0 || dow === 6);
          empUpd[d] = { 
            code: isWeekend ? "H" : "X", 
            ubgt: 0, 
            fm: 0, 
            meal: !isWeekend 
          };
        }
        periodData[emp.id] = empUpd;
      });

      next[periodKey] = periodData;
      return next;
    });

    const upsertData: any[] = [];
    displayEmps.forEach(emp => {
      for (let d = 1; d <= totalDays; d++) {
        const dow = DAY_OF_WEEK(year, month, d);
        const isWeekend = (dow === 0 || dow === 6);
        upsertData.push({
          period_key: periodKey,
          employee_id: emp.id,
          day: d,
          code: isWeekend ? "H" : "X",
          ubgt: 0,
          fm: 0,
          meal: !isWeekend
        });
      }
    });

    if (upsertData.length > 0) {
      supabase
        .from('attendance')
        .upsert(upsertData, { onConflict: 'period_key,employee_id,day' })
        .then(({ error }) => {
          if (error) {
            console.error('Supabase batch upsert error:', error);
            alert('Hata: Otomatik puantaj doldurma kaydedilemedi!');
          }
        });
    }

    addAudit("PUANTAJ", `${displayEmps.length} personel için otomatik dolum yapıldı.`);
  }, [isLocked, displayEmps, totalDays, year, month, periodKey, setAttendance, addAudit]);

  const clearAll = useCallback(() => {
    if (isLocked) return;
    if (!window.confirm(`${periodKey} dönem verileri temizlensin mi?`)) return;
    
    setAttendance(prev => {
      const next = { ...prev };
      delete next[periodKey];
      return next;
    });

    const empIds = displayEmps.map(e => e.id);
    if (empIds.length > 0) {
      supabase
        .from('attendance')
        .delete()
        .eq('period_key', periodKey)
        .in('employee_id', empIds)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase clear error:', error);
            alert('Hata: Puantaj temizleme işlemi kaydedilemedi!');
          }
        });
    }

    addAudit("PUANTAJ", `${periodKey} dönemi temizlendi.`);
  }, [isLocked, periodKey, displayEmps, setAttendance, addAudit]);

  const saveCell = useCallback((code: string, ubgt: number, fm: number, meal: boolean) => {
    if (!modal) return;
    const { empId, day } = modal;
    
    setAttendance(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[periodKey]) next[periodKey] = {};
      if (!next[periodKey][empId]) next[periodKey][empId] = {};
      next[periodKey][empId][day] = { code, ubgt, fm, meal };
      return next;
    });

    supabase
      .from('attendance')
      .upsert({
        period_key: periodKey,
        employee_id: empId,
        day: day,
        code: code,
        ubgt: ubgt,
        fm: fm,
        meal: meal
      }, { onConflict: 'period_key,employee_id,day' })
      .then(({ error }) => {
        if (error) {
          console.error('Supabase write error:', error);
          alert('Hata: Puantaj veritabanına kaydedilemedi!');
        }
      });

    setModal(null);
  }, [modal, periodKey, setAttendance]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const importExcelGrid = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Çalışma sayfası bulunamadı.");
      }

      const headerRow = worksheet.getRow(1);
      if (headerRow.getCell(2).value?.toString() !== "Sicil No" || headerRow.getCell(8).value?.toString() !== "Katman") {
        throw new Error("Uyumsuz Excel formatı! Lütfen sistemden indirilen Excel şablonunu yükleyin.");
      }

      const rowCount = worksheet.rowCount;
      const parsedAttendance: AttendanceData = JSON.parse(JSON.stringify(attendance));
      if (!parsedAttendance[periodKey]) parsedAttendance[periodKey] = {};

      const dbUpsertData: any[] = [];
      let importedCount = 0;

      let r = 2;
      while (r <= rowCount) {
        const fmRow = worksheet.getRow(r);
        const ubgtRow = worksheet.getRow(r + 1);
        const mealRow = worksheet.getRow(r + 2);
        const codeRow = worksheet.getRow(r + 3);

        const sicilNo = fmRow.getCell(2).value?.toString()?.trim();
        const fmLabel = fmRow.getCell(8).value?.toString()?.trim();
        const ubgtLabel = ubgtRow.getCell(8).value?.toString()?.trim();
        const mealLabel = mealRow.getCell(8).value?.toString()?.trim();
        const codeLabel = codeRow.getCell(8).value?.toString()?.trim();

        if (sicilNo && fmLabel === "FM" && ubgtLabel === "UBGT" && mealLabel === "YEMEK" && codeLabel === "KOD") {
          const emp = employees.find(e => e.sicilNo === sicilNo);
          if (emp) {
            if (isAdmin || emp.locationId === currentUser.locationId) {
              const empUpd: { [day: number]: AttendanceCell } = parsedAttendance[periodKey][emp.id] || {};
              
              for (let d = 1; d <= totalDays; d++) {
                const colIdx = 8 + d;
                
                const fmVal = Number(fmRow.getCell(colIdx).value) || 0;
                const ubgtVal = Number(ubgtRow.getCell(colIdx).value) || 0;
                const mealVal = Number(mealRow.getCell(colIdx).value) === 1 || mealRow.getCell(colIdx).value === true;
                let codeVal = codeRow.getCell(colIdx).value?.toString()?.trim() || "";
                
                if (codeVal === ".") codeVal = "";

                empUpd[d] = {
                  code: codeVal,
                  ubgt: ubgtVal,
                  fm: fmVal,
                  meal: mealVal
                };

                dbUpsertData.push({
                  period_key: periodKey,
                  employee_id: emp.id,
                  day: d,
                  code: codeVal,
                  ubgt: ubgtVal,
                  fm: fmVal,
                  meal: mealVal
                });
              }

              parsedAttendance[periodKey][emp.id] = empUpd;
              importedCount++;
            }
          }
        }

        r += 4;
      }

      if (importedCount === 0) {
        throw new Error("Yüklenecek uygun personel kaydı bulunamadı.");
      }

      const { error: dbError } = await supabase
        .from('attendance')
        .upsert(dbUpsertData, { onConflict: 'period_key,employee_id,day' });

      if (dbError) throw dbError;

      setAttendance(parsedAttendance);
      addAudit("IMPORT", `${importedCount} personel için Excel'den puantaj yüklendi (${periodKey})`);
      alert(`${importedCount} personelin puantaj verileri başarıyla yüklendi!`);
    } catch (err: any) {
      console.error(err);
      alert(`Hata: ${err.message || 'Excel dosyası çözümlenemedi!'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getSummary = (empId: number) => {
    const data = currentMonthData[empId] || {};
    const summary: any = {
      X: 0, H: 0, Y1: 0, Y2: 0, İ: 0, G: 0, D: 0, A: 0, B: 0, S: 0, V: 0, E: 0,
      totalPaidDays: 0, totalFM: 0, totalUBGT: 0, totalMeal: 0
    };

    for (let d = 1; d <= totalDays; d++) {
      const c = data[d] || { code: '', fm: 0, ubgt: 0, meal: false };
      if (c.code in summary) summary[c.code]++;
      if (CODE_STYLES[c.code]?.isPaid) summary.totalPaidDays++;
      if (c.meal) summary.totalMeal++;
      summary.totalFM += (c.fm || 0);
      summary.totalUBGT += (c.ubgt || 0);
    }
    return summary;
  };

  const exportExcelGrid = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Puantaj Raporu', {
      views: [{ showGridLines: false }]
    });

    const headers = [
      "Sıra", "Sicil No", "Ad Soyad", "Görevi", "İşe Giriş Tarihi", "İşten Çıkış Tarihi", "Lokasyon", "Katman"
    ];
    for (let i = 1; i <= 31; i++) headers.push(`${i}`);
    headers.push(
      "Toplam FM", 
      "Toplam UBGT", 
      "Toplam Yemek", 
      "Hafta Tatili (HT)", 
      "Yıllık İzin", 
      "Raporlu", 
      "Ücretsiz İzin", 
      "Ücretli Gün Toplamı"
    );

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 35;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF252F3C' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
    });

    displayEmps.forEach((emp, empIdx) => {
      const empData = currentMonthData[emp.id] || {};
      const sum = getSummary(emp.id);
      const locName = locations.find(l => l.id === emp.locationId)?.name || "";

      const fmRow: (string | number)[] = [empIdx + 1, emp.sicilNo, emp.adSoyad, emp.gorevi, emp.isGiris, emp.isCikis || "—", locName, "FM"];
      const ubgtRow: (string | number)[] = ["", "", "", "", "", "", "", "UBGT"];
      const mealRow: (string | number)[] = ["", "", "", "", "", "", "", "YEMEK"];
      const codeRow: (string | number)[] = ["", "", "", "", "", "", "", "KOD"];

      for (let d = 1; d <= 31; d++) {
        const cell = empData[d];
        if (d <= totalDays) {
          fmRow.push(cell?.fm || 0);
          ubgtRow.push(cell?.ubgt || 0);
          mealRow.push(cell?.meal ? 1 : 0);
          codeRow.push(cell?.code || ".");
        } else {
          [fmRow, ubgtRow, mealRow, codeRow].forEach(r => r.push(""));
        }
      }

      fmRow.push(sum.totalFM.toFixed(1), "", "", "", "", "", "", "");
      ubgtRow.push("", sum.totalUBGT.toFixed(1), "", "", "", "", "", "");
      mealRow.push("", "", sum.totalMeal, "", "", "", "", "");
      codeRow.push("", "", "", sum.H, sum.Y1, sum.Y2, sum.İ, sum.totalPaidDays);

      const r1 = worksheet.addRow(fmRow);
      const r2 = worksheet.addRow(ubgtRow);
      const r3 = worksheet.addRow(mealRow);
      const r4 = worksheet.addRow(codeRow);

      for (let col = 1; col <= 7; col++) {
        worksheet.mergeCells(r1.number, col, r4.number, col);
        const cell = r1.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFE5FF' } };
        cell.font = { bold: true, color: { argb: 'FF252F9C' }, size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }

      const personRows = [r1, r2, r3, r4];
      personRows.forEach((row, idx) => {
        row.height = 22;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber > 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };

            if (idx === 3 && colNumber > 8 && colNumber <= 31 + 8) {
              const val = cell.value?.toString();
              if (val === 'H') cell.font = { bold: true, color: { argb: 'FFFF0000' } };
              if (val === 'X') cell.font = { bold: true, color: { argb: 'FF006400' } };
            }

            if (colNumber > 31 + 8) {
              cell.font = { bold: true, size: 9 };
            }
          }
        });

        if (idx === 3) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: 'FF252F3C' } } };
          });
        }
      });
    });

    worksheet.columns.forEach((col, idx) => {
      const colNumber = idx + 1;
      if (colNumber === 1) col.width = 6;
      else if (colNumber === 2) col.width = 12;
      else if (colNumber === 3) col.width = 25;
      else if (colNumber === 4) col.width = 20;
      else if (colNumber === 5 || colNumber === 6) col.width = 14;
      else if (colNumber === 7) col.width = 20;
      else if (colNumber === 8) col.width = 9;
      else if (colNumber <= 31 + 8) col.width = 4.5;
      else col.width = 14;

      if (colNumber > 8 && colNumber <= 31 + 8) {
        const dayNum = colNumber - 8;
        if (dayNum <= totalDays) {
          const dow = DAY_OF_WEEK(year, month, dayNum);
          if (dow === 0 || dow === 6) {
            worksheet.getColumn(colNumber).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
              if (rowNumber > 1) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFEE2E2' }
                };
              }
            });
          }
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BILGIN_KURUMSAL_RAPOR_${periodKey}.xlsx`;
    link.click();
    addAudit("EXPORT", `Kurumsal Puantaj Raporu indirildi (${periodKey})`);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
      {importing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4 animate-duration-1000"></div>
          <p className="font-black tracking-tight text-lg">Excel Dosyası İşleniyor ve Kaydediliyor...</p>
        </div>
      )}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-[#CFE5FF] shadow-sm">
        <div className="flex items-center space-x-5">
          <div className={`p-4 rounded-[1.5rem] shadow-lg ${isLocked ? 'bg-rose-100 text-[#7C1034]' : 'bg-[#CFE5FF] text-[#252F9C]'}`}>
            <Calendar className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#252F9C] tracking-tighter uppercase italic">Puantaj Formu</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">{MONTHS[month]} {year} • {isLocked ? 'DÖNEM KİLİTLİ' : 'DÜZENLENEBİLİR'}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex bg-[#CFE5FF]/20 p-1.5 rounded-2xl border border-[#CFE5FF]/50">
             <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent border-none px-4 py-2.5 text-sm font-black text-[#252F9C] outline-none cursor-pointer">
               {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
             <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent border-none px-4 py-2.5 text-sm font-black text-[#252F9C] outline-none cursor-pointer">
               {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>

           {isAdmin && (
             <select value={locFilter} onChange={e => setLocFilter(e.target.value)} className="bg-white border border-[#CFE5FF] rounded-2xl px-6 py-4 text-sm font-black text-[#252F9C] outline-none transition-all shadow-sm">
                <option value="all">Tüm Lokasyonlar</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
             </select>
           )}

           <div className="flex items-center space-x-3 border-l border-[#CFE5FF] pl-6 ml-2">
             {!isLocked && (
               <>
                 <button onClick={autoFillAll} className="bg-[#7C1034] hover:bg-[#630d2a] text-white font-black px-6 py-4 rounded-[1.25rem] text-xs flex items-center transition-all shadow-xl shadow-[#7C1034]/20 active:scale-95 group">
                   <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" /> OTO DOLDUR
                 </button>
                 <button onClick={clearAll} className="bg-white border border-rose-100 text-[#7C1034] hover:bg-rose-50 font-black px-6 py-4 rounded-[1.25rem] text-xs flex items-center transition-all active:scale-95">
                   <Trash2 className="w-4 h-4 mr-2" /> TEMİZLE
                 </button>
                 <input type="file" ref={fileInputRef} onChange={importExcelGrid} accept=".xlsx" className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-4 rounded-[1.25rem] text-xs flex items-center transition-all shadow-xl shadow-emerald-600/20 active:scale-95">
                    <Save className="w-4 h-4 mr-2" /> EXCEL YÜKLE
                  </button>
               </>
             )}
             <button onClick={exportExcelGrid} className="bg-[#252F9C] hover:bg-[#1a237e] text-white font-black px-8 py-4 rounded-[1.25rem] text-xs flex items-center transition-all shadow-2xl shadow-[#252F9C]/20 active:scale-95 group">
               <FileDown className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform" /> GRID EXCEL
             </button>
           </div>
        </div>
      </div>

      <div className="bg-white border border-[#CFE5FF] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px]" style={{ borderBottomColor: '#252F9C' }}>
        <div className="puantaj-scroll overflow-x-auto">
          <table className="border-collapse text-[10px] min-w-max w-full">
            <thead className="sticky top-0 z-40">
              <tr className="bg-slate-50 border-b border-[#CFE5FF]">
                <th rowSpan={3} className="p-4 border-r border-[#CFE5FF] text-[#252F9C]/40 font-black w-12 text-center bg-slate-50">Sıra</th>
                <th rowSpan={3} className="p-4 border-r border-[#CFE5FF] text-[#252F9C] font-black text-left uppercase tracking-tighter w-64 sticky left-0 bg-slate-50 z-50 shadow-xl">Personel Kimlik / Sicil</th>
                <th rowSpan={3} className="p-4 border-r border-[#CFE5FF] text-[#252F9C]/40 font-black w-12 text-center bg-slate-50">Drm</th>
                {Array.from({ length: totalDays }, (_, i) => {
                  const dayNum = i + 1;
                  const dow = DAY_OF_WEEK(year, month, dayNum);
                  const isWeekend = [0, 6].includes(dow);
                  return (
                    <th key={i} className={`p-2 border-r border-[#CFE5FF] text-center font-black ${isWeekend ? 'bg-[#CFE5FF]/40 text-[#252F9C]' : 'bg-slate-50 text-slate-500'} w-12`}>
                      {dayNum}
                    </th>
                  );
                })}
                <th colSpan={3} className="p-3 bg-slate-100 text-[#252F9C] font-black border-l border-[#CFE5FF] uppercase tracking-widest text-[8px]">Bilgiler</th>
                <th colSpan={14} className="p-3 bg-[#CFE5FF] text-[#252F9C] font-black border-l border-[#CFE5FF] uppercase tracking-widest text-[8px]">Hakediş Özetleri</th>
              </tr>
              <tr className="bg-white/50">
                {Array.from({ length: totalDays }, (_, i) => {
                  const dow = DAY_OF_WEEK(year, month, i + 1);
                  return <th key={i} className="p-1 border-r border-[#CFE5FF] text-[8px] font-black text-slate-400 uppercase bg-white/50">{DAYNAMES[dow].substring(0, 3)}</th>
                })}
                <th className="p-3 border-r border-[#CFE5FF] text-[#252F9C]/50 font-black bg-white/50 text-[8px]">Giriş</th>
                <th className="p-3 border-r border-[#CFE5FF] text-[#252F9C]/50 font-black bg-white/50 text-[8px]">Çıkış</th>
                <th className="p-3 border-r border-[#CFE5FF] text-[#7C1034] font-black bg-white/50 text-[8px]">Yemek</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">FM</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">UBGT</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">HT</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Yıllık</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Rapor</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Ücr.S</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Görv</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Devm</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Anlk</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Bablk</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Süt</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Veft</th>
                <th className="p-3 border-r border-slate-200 text-[#252F9C] font-black bg-[#CFE5FF]/30 text-[8px]">Evlk</th>
                <th className="p-3 bg-[#252F9C] text-white font-black border-l-2 border-[#1a237e]">ÜCRET GÜN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayEmps.map((emp, idx) => {
                const sum = getSummary(emp.id);
                const empPeriodData = currentMonthData[emp.id] || {};
                return (
                  <tr key={emp.id} className="hover:bg-[#CFE5FF]/10 transition-colors group">
                    <td className="p-3 border-r border-slate-50 text-center font-bold text-slate-300 bg-white group-hover:bg-[#CFE5FF]/5">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-50 sticky left-0 bg-white group-hover:bg-[#CFE5FF]/5 z-20 shadow-xl">
                       <div className="font-black text-[#252F9C] uppercase truncate leading-tight tracking-tighter text-sm">{emp.adSoyad}</div>
                       <div className="text-[9px] font-black text-[#7C1034] leading-none uppercase tracking-widest">{emp.sicilNo}</div>
                    </td>
                    <td className="p-3 border-r border-slate-50 text-[7px] font-black text-slate-300 leading-tight text-center bg-white group-hover:bg-[#CFE5FF]/5">
                       <div className="text-violet-400">UBGT</div>
                       <div className="text-amber-400">FM</div>
                       <div className="text-[#252F9C] font-black">GÜN</div>
                    </td>
                    {Array.from({ length: totalDays }, (_, i) => {
                      const day = i + 1;
                      const cell = empPeriodData[day] || { code: '', fm: 0, ubgt: 0, meal: false };
                      const style = CODE_STYLES[cell.code] || CODE_STYLES[''];
                      const isWeekend = [0,6].includes(DAY_OF_WEEK(year, month, day));
                      return (
                        <td key={i} onClick={() => !isLocked && setModal({ empId: emp.id, day })}
                          className={`p-0 border-r border-slate-50 text-center cursor-pointer transition-all ${isWeekend ? 'bg-[#CFE5FF]/10' : 'bg-white'}`}>
                          <div className="flex flex-col items-center justify-center min-h-[64px] space-y-1 py-2">
                             <div className={`text-[8px] font-black px-1.5 rounded-md ${cell.ubgt ? 'bg-violet-100 text-violet-700' : 'text-slate-100'}`}>{cell.ubgt || '—'}</div>
                             <div className={`text-[8px] font-black px-1.5 rounded-md ${cell.fm ? 'bg-amber-100 text-amber-700' : 'text-slate-100'}`}>{cell.fm || '—'}</div>
                             <div className="flex items-center space-x-1">
                               <div className="text-[12px] font-black" style={{ color: style.text }}>{cell.code || '.'}</div>
                               {cell.meal && <Utensils className="w-2.5 h-2.5 text-[#252F9C]/30" />}
                             </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 border-r border-slate-50 text-center font-black text-slate-400 text-[9px]">{emp.isGiris}</td>
                    <td className="p-3 border-r border-slate-50 text-center font-black text-slate-400 text-[9px]">{emp.isCikis || '—'}</td>
                    <td className="p-3 border-r border-slate-50 text-center font-black text-[#7C1034] bg-[#7C1034]/5 text-[12px]">{sum.totalMeal}</td>
                    
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-black text-[#252F9C]">{sum.totalFM.toFixed(1)}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-black text-[#252F9C]">{sum.totalUBGT.toFixed(1)}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.H}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.Y1}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.Y2}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.İ}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.G}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold text-rose-600">{sum.D}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.A}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.B}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.S}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.V}</td>
                    <td className="p-3 bg-[#CFE5FF]/10 text-center font-bold">{sum.E}</td>
                    <td className="p-3 bg-[#252F9C] text-center font-black text-white text-[14px] border-l-2 border-[#1a237e]">{sum.totalPaidDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#252F9C] p-8 rounded-[2.5rem] flex flex-wrap items-center gap-x-12 gap-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="flex flex-col border-r border-white/10 pr-12 relative z-10">
           <span className="text-[10px] font-black text-[#CFE5FF] uppercase tracking-[0.4em] leading-none mb-2">Kod Rehberi</span>
           <span className="text-[9px] font-bold text-white/40 uppercase">Mevzuat Uyumlu Puantaj Kodları</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 relative z-10">
          {Object.entries(CODE_STYLES).map(([code, style]) => code && (
            <div key={code} className="flex items-center space-x-3 bg-white/5 pr-4 rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all cursor-help" title={style.label}>
              <span className="px-4 py-2 font-black text-[12px] shadow-lg" style={{ backgroundColor: style.bg, color: style.text }}>{code}</span>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <CellEditor 
          open={!!modal} 
          onClose={() => setModal(null)} 
          onSave={saveCell} 
          current={(currentMonthData[modal.empId] || {})[modal.day] || { code: '', fm: 0, ubgt: 0, meal: false }}
          empName={employees.find(e => e.id === modal.empId)?.adSoyad || ''}
          day={modal.day}
        />
      )}
    </div>
  );
};

interface EditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (code: string, ubgt: number, fm: number, meal: boolean) => void;
  current: AttendanceCell;
  empName: string;
  day: number;
}

const CellEditor: React.FC<EditorProps> = ({ onClose, onSave, current, empName, day }) => {
  const [code, setCode] = useState(current.code || '');
  const [ubgt, setUbgt] = useState(current.ubgt || 0);
  const [fm, setFm] = useState(current.fm || 0);
  const [meal, setMeal] = useState(current.meal || false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#252F9C]/40 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden border border-white/20">
        <div className="px-12 py-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-black text-[#252F9C] text-3xl tracking-tighter leading-none mb-2 uppercase italic">{empName}</h3>
            <span className="text-[11px] font-black text-[#7C1034] uppercase tracking-[0.3em]">Hakediş Veri Girişi • GÜN {day}</span>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-200 rounded-[1.5rem] transition-all"><X className="w-8 h-8 text-slate-400" /></button>
        </div>
        <div className="p-12 space-y-10">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">DURUM KODU SEÇİMİ</label>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(CODE_STYLES).map(([c, s]) => c && (
                <button key={c} type="button" onClick={() => setCode(c)} className={`p-5 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group ${code === c ? 'border-[#7C1034] bg-[#7C1034]/5 scale-105 shadow-xl shadow-[#7C1034]/10' : 'border-slate-50 bg-slate-50 hover:border-[#CFE5FF]'}`}>
                  <span className="text-xl font-black group-hover:scale-110 transition-transform" style={{ color: s.text }}>{c}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase text-center leading-none tracking-tighter">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Fazla Mesai (Saat)</label>
              <input type="number" step="0.5" value={fm} onChange={e => setFm(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-8 py-5 text-xl font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all" placeholder="0.0" />
            </div>
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">UBGT Mesai (Saat)</label>
              <input type="number" step="0.5" value={ubgt} onChange={e => setUbgt(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-8 py-5 text-xl font-black outline-none focus:ring-4 focus:ring-[#CFE5FF] transition-all" placeholder="0.0" />
            </div>
          </div>
          <div onClick={() => setMeal(!meal)} className="flex items-center justify-between p-8 bg-[#CFE5FF]/20 rounded-3xl border border-[#CFE5FF]/50 group hover:bg-[#CFE5FF]/40 transition-all cursor-pointer">
             <div className="flex items-center space-x-5">
                <div className={`p-4 rounded-2xl transition-all ${meal ? 'bg-[#252F9C] text-white' : 'bg-white text-slate-400 shadow-inner'}`}>
                  <Utensils className="w-7 h-7" />
                </div>
                <div>
                   <span className="text-lg font-black text-[#252F9C] block leading-none">Yemek Hakkı</span>
                   <span className="text-[10px] font-black text-[#252F9C]/50 uppercase tracking-widest">Günlük Beslenme Desteği</span>
                </div>
             </div>
             <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${meal ? 'bg-[#7C1034] border-[#7C1034] shadow-lg shadow-[#7C1034]/20' : 'bg-white border-slate-200'}`}>
                {meal && <Check className="w-6 h-6 text-white" />}
             </div>
          </div>
          <button onClick={() => onSave(code, ubgt, fm, meal)} className="w-full bg-[#252F9C] hover:bg-[#1a237e] text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-[#252F9C]/30 transition-all active:scale-95 flex items-center justify-center space-x-4 group">
            <Check className="w-8 h-8 group-hover:scale-125 transition-transform" />
            <span className="text-2xl tracking-tighter uppercase italic">KAYDET VE KAPAT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PuantajPage;
