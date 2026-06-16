/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { F3MonitorQCRecord, F5UniformityQCRecord, ImageQualityRecord, Equipment, StaffMember } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  TrendingUp, 
  FileCheck, 
  Heart, 
  RefreshCw, 
  Monitor, 
  CreditCard, 
  Radio, 
  Users,
  Trash2,
  Eye
} from 'lucide-react';

interface DashboardProps {
  f3Records: F3MonitorQCRecord[];
  f5Records: F5UniformityQCRecord[];
  clinicalRecords: ImageQualityRecord[];
  equipmentList: Equipment[];
  staffList: StaffMember[];
  selectedStaff: StaffMember;
  onSelectStaff: (staff: StaffMember) => void;
  googleToken: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  syncInProgress: boolean;
  onFullSync: () => void;
  onNavigateTab: (tab: string) => void;
  onDeleteF3: (id: string) => void;
  onDeleteF5: (id: string) => void;
  onDeleteClinical: (id: string) => void;
  onOpenReportPreview: (record: any) => void;
}

export default function Dashboard({
  f3Records,
  f5Records,
  clinicalRecords,
  equipmentList,
  staffList,
  selectedStaff,
  onSelectStaff,
  googleToken,
  onGoogleLogin,
  onGoogleLogout,
  syncInProgress,
  onFullSync,
  onNavigateTab,
  onDeleteF3,
  onDeleteF5,
  onDeleteClinical,
  onOpenReportPreview
}: DashboardProps) {
  // Confirmation state for deleting
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteTrigger = (rec: any) => {
    if (rec.module === 'F3') {
      onDeleteF3(rec.id);
    } else if (rec.module === 'F5') {
      onDeleteF5(rec.id);
    } else if (rec.module === 'clinical') {
      onDeleteClinical(rec.id);
    }
    setConfirmDeleteId(null);
  };
  // Aggregate statistics
  const totalTests = f3Records.length + f5Records.length + clinicalRecords.length;
  
  const totalPass = 
    f3Records.filter(r => r.status === 'Pass').length +
    f5Records.filter(r => r.status === 'Pass').length +
    clinicalRecords.filter(r => r.status === 'Pass').length;

  const passRate = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 100;

  // Equipment count by type
  const countMonitor = equipmentList.filter(e => e.type === 'monitor').length;
  const countPlate = equipmentList.filter(e => e.type === 'plate').length;
  const countXray = equipmentList.filter(e => e.type === 'xray_unit').length;

  // Latest records merged to show recent actions
  const allLatestRecords = [
    ...f3Records.map(r => ({ ...r, typeLabel: 'ตรวจสอบหน้าจอ F3', module: 'F3', displayEq: r.equipmentId })),
    ...f5Records.map(r => ({ ...r, typeLabel: 'ความสม่ำเสมอตัวรับสัญญาณ F5', module: 'F5', displayEq: r.equipmentId })),
    ...clinicalRecords.map(r => ({ ...r, typeLabel: 'วิเคราะห์ภาพคลินิก', module: 'clinical', displayEq: r.equipmentId }))
  ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  // Map equipment health
  const getEquipmentStatus = (eqId: string) => {
    // Find latest record for this equipment
    const f3Latest = f3Records.filter(r => r.equipmentId === eqId).sort((a,b)=>b.id.localeCompare(a.id))[0];
    const f5Latest = f5Records.filter(r => r.equipmentId === eqId).sort((a,b)=>b.id.localeCompare(a.id))[0];
    const clinLatest = clinicalRecords.filter(r => r.equipmentId === eqId).sort((a,b)=>b.id.localeCompare(a.id))[0];
    
    const latest = f3Latest || f5Latest || clinLatest;
    if (!latest) return { badge: 'ยังไม่ได้ตรวจ', color: 'bg-slate-100 text-slate-500 border border-slate-300' };
    return latest.status === 'Pass' 
      ? { badge: 'ผ่านเกณฑ์ (OK)', color: 'bg-emerald-50 text-emerald-700 border border-emerald-300' }
      : { badge: 'พัง/ตกเกณฑ์', color: 'bg-rose-50 text-rose-700 border border-rose-300' };
  };

  const handleExportData = () => {
    const backupData = {
      f3Records,
      f5Records,
      clinicalRecords,
      equipmentList,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MaeTha_QA_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.f3Records || parsed.f5Records || parsed.clinicalRecords) {
          if (parsed.f3Records) localStorage.setItem('mth_f3_records', JSON.stringify(parsed.f3Records));
          if (parsed.f5Records) localStorage.setItem('mth_f5_records', JSON.stringify(parsed.f5Records));
          if (parsed.clinicalRecords) localStorage.setItem('mth_clinical_records', JSON.stringify(parsed.clinicalRecords));
          if (parsed.equipmentList) localStorage.setItem('mth_equipment', JSON.stringify(parsed.equipmentList));
          
          alert('นำเข้าข้อมูลสำเร็จแล้ว! ระบบกำลังปรับปรุงประวัติของแผนกในทันที');
          window.location.reload();
        } else {
          alert('รูปแบบไฟล์สำรองไม่ถูกต้อง คีย์หลักไม่ครบถ้วน');
        }
      } catch (err) {
        alert('เกิดความผิดพลาดในการแกะรวบรวมไฟล์สำรอง');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="dashboard-view">
      
      {/* Hospital Identity Header and Staff selector / Local data backup tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Identity with Welcome */}
        <div className="lg:col-span-2 bg-linear-to-br from-indigo-900 to-indigo-950 p-6 rounded-3xl text-white shadow-md flex flex-col justify-between" id="hospital-brand-banner">
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Mae Tha Technical Division
            </div>
            <h1 className="text-2xl font-bold font-sans">แผนกรังสีเทคนิค โรงพยาบาลแม่ทา</h1>
            <p className="text-indigo-200/80 text-xs mt-1.5 font-sans leading-relaxed">
              ระบบตรวจสอบและวิเคราะห์หลักฐานในการดำเนินงานควบคุมความปลอดภัยและตรวจสอบคุณภาพอุปกรณ์รังสีเทคนิค (QC Validation System)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 border-t border-indigo-800/60 pt-4 mt-6">
            <div className="text-xs text-indigo-200 font-medium">
              สำรองและถ่ายโอนข้อมูลของแผนก:
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportData}
                className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold border border-indigo-700 transition cursor-pointer select-none flex items-center gap-1.5"
                title="ดาวน์โหลดไฟล์สำรองเก็บไว้ในเครื่องคอมพิวเตอร์"
              >
                <span>💾 ส่งออกข้อมูล (Backup JSON)</span>
              </button>

              <label className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold border border-indigo-700/50 transition cursor-pointer select-none flex items-center gap-1.5">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <span>📂 นำเข้าข้อมูล (Restore JSON)</span>
              </label>
            </div>
          </div>
        </div>

        {/* User profile card & Staff Selection */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="staff-auth-card">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Active Inspector Profile</span>
            <h2 className="text-slate-800 font-bold text-lg font-sans">ลงชื่อปฏิบัติงานรังสี</h2>
            <p className="text-slate-500 text-xs mt-1">
              กรุณาเลือกชื่อของคุณผู้ใช้เครื่องเพื่อลงนามและบันทึกรายงาน QC
            </p>
            
            <div className="mt-4">
              <select
                value={`${selectedStaff.name}|${selectedStaff.role}`}
                onChange={(e) => {
                  const [name, role] = e.target.value.split('|');
                  const selected = staffList.find(s => s.name === name && s.role === role);
                  if (selected) onSelectStaff(selected);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                id="staff-profile-selector"
              >
                {staffList.map((st) => (
                  <option key={`${st.name}-${st.role}`} value={`${st.name}|${st.role}`}>
                    👤 {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>รหัสเจ้าหน้าที่โรงพยาบาล</span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700">MTH-XRAY-ACTIVE</span>
          </div>
        </div>

      </div>

      {/* Aggregate Statistics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="stats-ribbon">
        
        {/* Pass Rate Metric */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold font-sans block">อัตราการผ่านเกณฑ์ QC</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{passRate}%</span>
          </div>
        </div>

        {/* Total Tests Metric */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold font-sans block">จำนวนบันทึกรวมทั้งหมด</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{totalTests} ครั้ง</span>
          </div>
        </div>

        {/* Active Devices tracked */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold font-sans block">จอแสดงผลรับส่งตรวจ F3</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{countMonitor} ตัว</span>
          </div>
        </div>

        {/* Active Plates tracked */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold font-sans block">แผ่นรับสัญญาณรังสี F5</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{countPlate} แผ่น</span>
          </div>
        </div>

      </div>

      {/* Primary Grid: Equipment Health status & Large action bento card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Equipment overview list */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="equipment-health-panel">
          <div>
            <h3 className="font-bold text-slate-800 font-sans text-sm flex items-center gap-2">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">●</span>
              สถานะเครื่องรังสีแพทย์แม่ทาล่าสุด (Equipment QC Audits)
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              รายงานประเมินครั้งล่าสุดของแต่ละอุปกรณ์รังสีที่เชื่อมกับสแปร์ดชีต
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {equipmentList.map((eq) => {
                const health = getEquipmentStatus(eq.id);
                return (
                  <div key={eq.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {eq.type === 'monitor' && <Monitor className="w-4 h-4 text-indigo-500" />}
                      {eq.type === 'plate' && <CreditCard className="w-4 h-4 text-emerald-500" />}
                      {eq.type === 'xray_unit' && <Radio className="w-4 h-4 text-amber-500" />}
                      <div>
                        <span className="font-semibold text-slate-700 block">{eq.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Mod: {eq.model}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${health.color}`}>
                      {health.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
            <button
              onClick={() => onNavigateTab('equipment')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              แก้ไขและจัดการเครื่องมือทั้งหมด &rarr;
            </button>
          </div>
        </div>

        {/* Quick launch actions */}
        <div className="bg-linear-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="quick-links">
          <div>
            <h3 className="font-bold text-indigo-900 font-sans text-sm flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-500" />
              ทางลัดปฏิบัติการ QC
            </h3>
            <p className="text-indigo-700/80 text-xs mt-1 leading-normal font-sans">
              เลือกปฏิบัติงานตรวจสอบและกรอกแบบประเมินสำหรับแผนกรังสีเทคนิคเพื่อเขียนตารางเข้าชีต
            </p>

            <div className="space-y-2.5 mt-5">
              <button
                onClick={() => onNavigateTab('F3')}
                className="w-full text-left bg-white hover:bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex items-center gap-3 transition cursor-pointer"
              >
                <span className="text-lg">🖥️</span>
                <div>
                  <span className="text-xs font-bold font-sans text-slate-800 block">โปรแกรมตรวจหน้าจอ F3</span>
                  <span className="text-[10px] text-slate-500 font-sans block">ตรวจสอบ TG18-QC Checklist</span>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('F5')}
                className="w-full text-left bg-white hover:bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex items-center gap-3 transition cursor-pointer"
              >
                <span className="text-lg">📥</span>
                <div>
                  <span className="text-xs font-bold font-sans text-slate-800 block">Dark Noise & ตัวรับภาพ F5</span>
                  <span className="text-[10px] text-slate-500 font-sans block">บันทึก F8-2 Dark Noise & Uniformity</span>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('clinical')}
                className="w-full text-left bg-white hover:bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex items-center gap-3 transition cursor-pointer"
              >
                <span className="text-lg">☢️</span>
                <div>
                  <span className="text-xs font-bold font-sans text-slate-800 block">วิเคราะห์ความคมทางคลินิก</span>
                  <span className="text-[10px] text-slate-500 font-sans block">ตรวจสอบฟิล์มและสรีระผู้รับรูป</span>
                </div>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-indigo-900/60 font-mono mt-4">
            Mae Tha Hospital Diagnostic System v1.50
          </div>
        </div>

      </div>

      {/* Recent Inspections feed */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden" id="recent-audits-feed">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-sans font-bold text-slate-800 text-sm">การซิงก์ผล QC ล่าสุดเสร็จสิ้น (Recent Activity Sync)</h3>
          <p className="font-sans text-xs text-slate-400 mt-1">
            บันทึกการประเมิน 5 ลำดับแรกที่ทำลงฐานลึกโรงพยาบาลแม่ทา
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-medium">
                <th className="p-4 font-sans uppercase">โมดูล</th>
                <th className="p-4 font-sans">ID ข้อมูล</th>
                <th className="p-4 font-sans">วันที่ประเมิน</th>
                <th className="p-4 font-sans">รายละเอียดการตรวจ</th>
                <th className="p-4 font-sans">ผู้ยื่นเรื่องตรวจ</th>
                <th className="p-4 font-sans text-center">ระดับผลลพธ์ล่าสุด</th>
                <th className="p-4 font-sans text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allLatestRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    ไม่มีฐานกิจกรรมประเมินรังสีในช่วงเวลานี้ สามารถเริ่มการกรอกบันทึกจากเมนูด้านบนได้ทันที
                  </td>
                </tr>
              ) : (
                allLatestRecords.map((rec, index) => (
                  <tr key={index} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-800">{rec.typeLabel}</td>
                    <td className="p-4 font-mono text-slate-400">{rec.id}</td>
                    <td className="p-4 font-sans text-slate-600">{rec.date}</td>
                    <td className="p-4 font-sans text-slate-700 font-medium">ตรวจอุปกรณ์ ID: {rec.displayEq}</td>
                    <td className="p-4 font-sans text-slate-500">
                      {rec.inspectorName}
                      <span className="block text-[9px] text-slate-400">{rec.inspectorRole}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        rec.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {rec.status === 'Pass' ? '✅ ผ่านเกณฑ์' : '❌ ไม่ผ่าน'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {confirmDeleteId === rec.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in slide-in-from-right-1 duration-100">
                          <span className="text-[10px] text-rose-600 font-bold font-sans">ลบ?</span>
                          <button
                            onClick={() => handleDeleteTrigger(rec)}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer transition shadow-xs"
                          >
                            ตกลง
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer transition"
                          >
                            เลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenReportPreview(rec)}
                            className="p-1 hover:bg-slate-100 text-indigo-700 rounded transition cursor-pointer"
                            title="ดูรายงานผล"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(rec.id)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
