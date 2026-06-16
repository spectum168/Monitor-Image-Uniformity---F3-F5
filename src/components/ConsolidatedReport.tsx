/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  F3MonitorQCRecord, 
  F5UniformityQCRecord, 
  ImageQualityRecord, 
  Equipment 
} from '../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  Trash2, 
  Eye, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Monitor, 
  CreditCard, 
  Radio, 
  ClipboardCheck,
  Building
} from 'lucide-react';
import { getDriveDirectImageUrl } from '../lib/googleDriveAndSheets';

interface ConsolidatedReportProps {
  f3Records: F3MonitorQCRecord[];
  f5Records: F5UniformityQCRecord[];
  clinicalRecords: ImageQualityRecord[];
  equipmentList: Equipment[];
  onDeleteF3: (id: string) => void;
  onDeleteF5: (id: string) => void;
  onDeleteClinical: (id: string) => void;
  onOpenReportPreview: (record: any) => void;
}

export default function ConsolidatedReport({
  f3Records,
  f5Records,
  clinicalRecords,
  equipmentList,
  onDeleteF3,
  onDeleteF5,
  onDeleteClinical,
  onOpenReportPreview
}: ConsolidatedReportProps) {
  // Search and Filter status states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<'All' | 'F3' | 'F5' | 'clinical'>('All');
  const [selectedFilterEquipment, setSelectedFilterEquipment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Pass' | 'Fail'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete confirmation modals / inline warnings state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper getters
  const getEquipmentName = (id: string) => {
    const eq = equipmentList.find(e => e.id === id);
    return eq ? `${eq.name} (${eq.model})` : id;
  };

  // Harmonized records mapper
  const combineRecords = () => {
    const arr: any[] = [];
    
    // Process F3 Records
    f3Records.forEach(rec => {
      arr.push({
        ...rec,
        module: 'F3',
        moduleLabel: 'ตรวจสอบหน้าจอ F3',
        equipmentName: getEquipmentName(rec.equipmentId),
        details: `D:${rec.distortion} | L:${rec.luminance} | R:${rec.resolution} | A:${rec.artifacts} | U:${rec.uniformity}`,
      });
    });

    // Process F5 Records
    f5Records.forEach(rec => {
      arr.push({
        ...rec,
        module: 'F5',
        moduleLabel: 'ความสม่ำเสมอตัวรับสัญญาณ F5',
        equipmentName: getEquipmentName(rec.equipmentId),
        details: `Center PV: ${rec.pvCenter} | ส่วนต่างสูงสุด: ${rec.differencePercent}% | แปลกปลอม: ${rec.hasArtifacts}`,
      });
    });

    // Process Clinical Records
    clinicalRecords.forEach(rec => {
      arr.push({
        ...rec,
        module: 'clinical',
        moduleLabel: 'วิเคราะห์ภาพคลินิก',
        equipmentName: getEquipmentName(rec.equipmentId),
        details: `จัดท่า P:${rec.positioning} | ปริมาณ E:${rec.exposure} | ชัด S:${rec.sharpness} | มาร์กเกอร์ M:${rec.markers}`,
      });
    });

    // Sort by ID / Date descending (newest first)
    return arr.sort((a, b) => b.id.localeCompare(a.id));
  };

  const allRecordsList = combineRecords();

  // Filtered list algorithm
  const filteredRecords = allRecordsList.filter(rec => {
    // 1. Text Search matcher (Id, Inspector Name, Notes, Equipment ID)
    const matchesSearch = 
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Module Filter matcher
    const matchesModule = selectedModule === 'All' || rec.module === selectedModule;

    // 3. Equipment Filter matcher
    const matchesEq = selectedFilterEquipment === 'All' || rec.equipmentId === selectedFilterEquipment;

    // 4. Status Filter matcher
    const matchesStatus = selectedStatus === 'All' || rec.status === selectedStatus;

    // 5. Date Range matcher
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && rec.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && rec.date <= endDate;
    }

    return matchesSearch && matchesModule && matchesEq && matchesStatus && matchesDate;
  });

  // Calculate stats based on filtered listings
  const totalQty = filteredRecords.length;
  const passedQty = filteredRecords.filter(r => r.status === 'Pass').length;
  const failedQty = totalQty - passedQty;
  const currentPassRate = totalQty > 0 ? Math.round((passedQty / totalQty) * 100) : 100;

  // Breakdown across modules currently displayed
  const f3Qty = filteredRecords.filter(r => r.module === 'F3').length;
  const f5Qty = filteredRecords.filter(r => r.module === 'F5').length;
  const clinicalQty = filteredRecords.filter(r => r.module === 'clinical').length;

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

  // Simple print of filtered reports list
  const handlePrintConsolidatedTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRowsHtml = filteredRecords.map(rec => `
      <tr class="border-b border-gray-200">
        <td class="p-3 font-mono font-semibold" style="font-size: 11px;">${rec.id}</td>
        <td class="p-3">${rec.date}</td>
        <td class="p-3"><strong>${rec.moduleLabel}</strong></td>
        <td class="p-3" style="font-size: 11px;">${rec.equipmentName}</td>
        <td class="p-3" style="font-size: 11px;">${rec.details}</td>
        <td class="p-3" style="font-size: 11px;">${rec.inspectorName}<br/><span style="color: #64748b; font-size: 9px;">${rec.inspectorRole}</span></td>
        <td class="p-3 text-center">
          <span style="font-weight: bold; font-size: 11px; padding: 3px 8px; border-radius: 9999px; ${
            rec.status === 'Pass' 
              ? 'background-color: #ecfdf5; color: #047857;' 
              : 'background-color: #fef2f2; color: #b91c1c;'
          }">
            ${rec.status === 'Pass' ? 'ผ่าน (Pass)' : 'ไม่ผ่าน (Fail)'}
          </span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>หน้ารายงานใบประเมินผล QC คัดกรองรังสีเทคนิค โรงพยาบาลแม่ทา</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 15mm; color: #000; -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Sarabun', 'Inter', sans-serif; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto">
            <div class="text-center border-b-2 border-slate-950 pb-4 mb-6">
              <span class="text-xs uppercase tracking-wider font-bold text-slate-500 font-mono">Mae Tha Hospital QA Consolidated Summary</span>
              <h1 class="text-xl font-bold mt-1 text-slate-950">ฝ่ายรังสีเทคนิค โรงพยาบาลแม่ทา จังหวัดลำพูน</h1>
              <p class="text-xs text-slate-500">รายงานสรุปผลการตรวจสอบประเมินคุณภาพและปรับปรุงเครื่องมือรังสีแพทย์รวมทั้งหมด</p>
              <p class="text-[10px] text-slate-400 mt-1 font-mono">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
            </div>

            <!-- Stats Header Grid -->
            <div class="grid grid-cols-4 gap-4 p-4 mb-6 bg-slate-50 rounded-xl border border-slate-200">
              <div class="text-center">
                <span class="text-[10px] text-slate-500 block">จำนวนประเมินรวม</span>
                <span class="text-lg font-bold font-mono text-slate-800">${totalQty} คาบการตรวจ</span>
              </div>
              <div class="text-center">
                <span class="text-[10px] text-slate-500 block">อัตราผ่านการตรวจ</span>
                <span class="text-lg font-bold font-mono text-emerald-600">${currentPassRate}%</span>
              </div>
              <div class="text-center">
                <span class="text-[10px] text-slate-400 block">ประเมินผ่าน</span>
                <span class="text-lg font-bold font-mono text-emerald-600">${passedQty} ครั้ง</span>
              </div>
              <div class="text-center">
                <span class="text-[10px] text-slate-400 block">ประเมินไม่ผ่าน</span>
                <span class="text-lg font-bold font-mono text-rose-600">${failedQty} ครั้ง</span>
              </div>
            </div>

            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th class="p-3">ID รายงาน</th>
                  <th class="p-3">วันทำการตรวจ</th>
                  <th class="p-3">ประเภทตรวจสอบ (Module)</th>
                  <th class="p-3">ชื่ออุปกรณ์ตรวจจับคุณภาพ</th>
                  <th class="p-3">รายละเอียดทางพารามิเตอร์</th>
                  <th class="p-3">ผู้ประเมินรับประกัน</th>
                  <th class="p-3 text-center">ระดับผลลัพธ์</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml || '<tr><td colspan="7" class="p-8 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไขตัวกรอง</td></tr>'}
              </tbody>
            </table>

            <div class="mt-8 flex justify-between text-[11px] text-slate-400 border-t border-slate-200 pt-4">
              <p>ลงนามประเมินรับรองคุณภาพเครื่องมือตรวจรังสีการแพทย์ โรงพยาบาลแม่ทา</p>
              <p>ผู้ควบคุมหลักประกันคุณภาพฝ่ายรังสีเทคนิค</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="consolidated-reporting-workspace">
      
      {/* Upper header segment and print action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase block mb-1">QA Unified Documentation</span>
          <h2 className="text-xl font-bold text-slate-900 font-sans flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            รายงานรวมทั้งหมด (Consolidated QA Logs Board)
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            ศูนย์กลางประมวลรายงานและตรวจสอบ คัดกรองสถิติรายคาบ เครื่องมือ Monitor F3, Dark Noise & Uniformity (F5) และการวิเคราะห์ภาพคลินิก
          </p>
        </div>
        
        <button
          onClick={handlePrintConsolidatedTable}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer select-none transition"
        >
          <Printer className="w-4 h-4" />
          <span>สั่งพิมพ์สรุปหน้ารายงานรวม</span>
        </button>
      </div>

      {/* Statistics Bento dashboard block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="consolidated-metrics-row">
        
        {/* Pass rate radial / meter */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-bold font-sans">อัตราการผ่านเกณฑ์เฉลี่ย</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-slate-800">{currentPassRate}%</span>
              <span className="text-xs font-semibold text-emerald-600">(เกณฑ์ควบคุม)</span>
            </div>
            
            {/* Visual HTML Progress Indicator */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentPassRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* F3 Monitor QC card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-bold font-sans">จำนวนตรวจจอภาพ (F3)</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
              <Monitor className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-3xl font-black font-mono text-slate-800">{f3Qty}</span>
            <span className="text-xs text-slate-400 font-medium font-sans ml-1 text-[11px]">บันทึกชีต</span>
            <p className="text-[10px] text-slate-400 mt-2">ประเมินระดับแสงพิกเซลเรขาคณิต</p>
          </div>
        </div>

        {/* F5 Receptor Uniformity card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-bold font-sans">จำนวนตรวจแผ่นรับเสียง (F5)</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-3xl font-black font-mono text-slate-800">{f5Qty}</span>
            <span className="text-xs text-slate-400 font-medium font-sans ml-1 text-[11px]">บันทึกชีต</span>
            <p className="text-[10px] text-slate-400 mt-2">ประเมิน 5-Point Density</p>
          </div>
        </div>

        {/* Clinical analysis card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-bold font-sans">จำนวนวิเคราะห์ทางคลินิก</span>
            <span className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
              <Radio className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-3xl font-black font-mono text-slate-800">{clinicalQty}</span>
            <span className="text-xs text-slate-400 font-medium font-sans ml-1 text-[11px]">ภาพประเมิน</span>
            <p className="text-[10px] text-slate-400 mt-2">ประเมินท่าประกอบปริมาณรังสี</p>
          </div>
        </div>

      </div>

      {/* Advanced interactive filter suite card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs" id="interactive-filters-board">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-sans font-bold text-slate-800 text-sm">บอร์ดกำหนดกรองข้อมูลขั้นสูง (Data Filtering Controls)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          
          {/* Search text term */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 font-sans">คำค้นหาหลัก (ID/ผู้ประเมิน/ชื่ออุปกรณ์)</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อ ID, ผู้ประเมิน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Module filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 font-sans">ประเภทประเมิน (QC Module)</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">ทั้งหมด (All Modules)</option>
              <option value="F3">Monitor QC (F3)</option>
              <option value="F5">Dark Noise & Uniformity (F5)</option>
              <option value="clinical">วิเคราะห์ภาพทางคลินิก</option>
            </select>
          </div>

          {/* Result Status filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 font-sans">ระดับผลลัพธ์ (Assessment)</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="Pass">ผ่านเกณฑ์ (Pass)</option>
              <option value="Fail">ไม่ผ่านเกณฑ์ (Fail)</option>
            </select>
          </div>

          {/* Start Date filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 font-sans flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>ตรวจตั้งแต่วันที่</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* End Date filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 font-sans flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>ตรวจจนถึงวันที่</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

        </div>

        {/* Clear filters trigger */}
        {(searchTerm || selectedModule !== 'All' || selectedStatus !== 'All' || startDate || endDate) && (
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('All');
                setSelectedStatus('All');
                setSelectedFilterEquipment('All');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer select-none"
            >
              รีเซ็ตตัวกรองทั้งหมด &times;
            </button>
          </div>
        )}
      </div>

      {/* Primary Consolidated Listing results board */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden" id="consolidated-results-table">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-sm">สมุดบันทึกรายการและการประเมินประวัติทั้งหมด (Report Registry)</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              แสดงพิกัดผลงาน {filteredRecords.length} ของทั้งหมด {allRecordsList.length} แฟ้มตรวจสอบสะสม
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 text-slate-400 border-b border-slate-100 font-bold">
                <th className="p-4">ID รายงาน</th>
                <th className="p-4">ประเภทเครื่องวัด (Module)</th>
                <th className="p-4">วันทำการประเมิน</th>
                <th className="p-4">ชื่ออุปกรณ์และโมเดล</th>
                <th className="p-4">ผู้ประเมิน / ตแหน่งปฏิบัติงาน</th>
                <th className="p-4">ค่าตัวแปร QC ล่าสุด</th>
                <th className="p-4 text-center">ระดับผล</th>
                <th className="p-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-sans">
                    ไม่พบรายการตรวจสอบคุณภาพ QC ตามตัวกรองที่คุณกำหนด
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isConfirming = confirmDeleteId === rec.id;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/40 transition">
                      
                      {/* ID with custom bullet prefix */}
                      <td className="p-4 font-mono font-black text-slate-600 tracking-tight">
                        <span className="block font-sans text-[10px] text-slate-400">REPORT ID</span>
                        {rec.id}
                      </td>

                      {/* Module Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          rec.module === 'F3' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          rec.module === 'F5' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {rec.module === 'F3' && <Monitor className="w-3 h-3" />}
                          {rec.module === 'F5' && <CreditCard className="w-3 h-3" />}
                          {rec.module === 'clinical' && <Radio className="w-3 h-3" />}
                          <span>{rec.moduleLabel}</span>
                        </span>
                      </td>

                      {/* Inspector Date */}
                      <td className="p-4 text-slate-850 font-semibold">{rec.date}</td>

                      {/* Equipment Display and details */}
                      <td className="p-4 font-sans font-medium text-slate-700">
                        <span className="block text-slate-800 font-bold max-w-[180px] truncate">{rec.equipmentName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">Device ID: {rec.equipmentId}</span>
                      </td>

                      {/* Inspector & Role */}
                      <td className="p-4">
                        <span className="font-bold text-slate-700 block">{rec.inspectorName}</span>
                        <span className="block text-[9px] text-slate-400 font-sans truncate max-w-[140px]">{rec.inspectorRole}</span>
                      </td>

                      {/* Evaluated Specifics parameters details */}
                      <td className="p-4 max-w-[200px] truncate font-mono text-slate-500 font-medium select-none" title={rec.details}>
                        {rec.details}
                      </td>

                      {/* Assessment Result */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rec.status === 'Pass' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />}
                          <span>{rec.status === 'Pass' ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
                        </span>
                      </td>

                      {/* Actions with beautiful delete confirmations inline layout */}
                      <td className="p-4 text-right">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-1.5 animate-in slide-in-from-right-2 duration-150">
                            <span className="text-[10px] text-rose-600 font-bold font-sans">แน่ใจ?</span>
                            <button
                              onClick={() => handleDeleteTrigger(rec)}
                              className="px-2 py-1 bg-rose-600 text-white rounded-md text-[10px] font-bold cursor-pointer transition select-none hover:bg-rose-700"
                              id={`btn-confirm-del-${rec.id}`}
                            >
                              ใช่, ลบเลย
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition select-none hover:bg-slate-300"
                            >
                              ไม่
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View detailed Report certificate printout paper preview */}
                            <button
                              onClick={() => onOpenReportPreview(rec)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer select-none"
                              title="เปิดดูรายงานใบรับรองก่อนพิมพ์"
                              id={`btn-view-preview-${rec.id}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* Secure custom RED trash / delete capability */}
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer select-none"
                              title="ลบรายการตรวจสอบประเมินนี้"
                              id={`btn-trash-rec-${rec.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
