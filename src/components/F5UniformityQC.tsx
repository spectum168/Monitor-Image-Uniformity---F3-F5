/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { F5UniformityQCRecord, Equipment, StaffMember, DarkNoiseRow } from '../types';
import { calculatePVUniformityDiff } from '../data';
import { FileText, Eye, CheckCircle2, AlertTriangle, Link as LinkIcon, Sparkles, PlusCircle, Trash2, Upload, Loader2 } from 'lucide-react';
import { getDriveDirectImageUrl, getDriveOriginalUrl, uploadQcImageToDrive } from '../lib/googleDriveAndSheets';

interface F5UniformityQCProps {
  plates: Equipment[];
  staffList: StaffMember[];
  selectedStaff: StaffMember;
  records: F5UniformityQCRecord[];
  onAddRecord: (record: F5UniformityQCRecord) => void;
  onOpenReportPreview: (record: F5UniformityQCRecord) => void;
  onQuickAddPlate: (name: string, model: string) => void;
  onDeleteRecord?: (id: string) => void;
  googleToken?: string | null;
}

export default function F5UniformityQC({
  plates,
  staffList,
  selectedStaff,
  records,
  onAddRecord,
  onOpenReportPreview,
  onQuickAddPlate,
  onDeleteRecord,
  googleToken
}: F5UniformityQCProps) {
  // Confirmation state for deleting
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Form state
  const [selectedPlateId, setSelectedPlateId] = useState(plates[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (plates.length > 0 && !selectedPlateId) {
      setSelectedPlateId(plates[0].id);
    }
  }, [plates, selectedPlateId]);
  
  // 5-Point measurements
  const [pvCenter, setPvCenter] = useState<number>(450);
  const [pvTopLeft, setPvTopLeft] = useState<number>(448);
  const [pvTopRight, setPvTopRight] = useState<number>(452);
  const [pvBottomLeft, setPvBottomLeft] = useState<number>(447);
  const [pvBottomRight, setPvBottomRight] = useState<number>(451);
  
  // States
  const [hasArtifacts, setHasArtifacts] = useState<'Yes' | 'No'>('No');
  const [notes, setNotes] = useState('');
  const [driveImageUrl, setDriveImageUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // F8-2 Dark Noise Table Rows State
  const [darkNoiseRows, setDarkNoiseRows] = useState<DarkNoiseRow[]>(() => [
    { fpdNo: 'FPD 1', fpdSize: '14" x 17"', id: 'FPD-01', ei: '120', ddi: '0.1', pixelMean: '450' },
    { fpdNo: 'FPD 2', fpdSize: '14" x 17"', id: 'FPD-02', ei: '115', ddi: '-0.1', pixelMean: '448' },
  ]);

  const handleAddDarkNoiseRow = () => {
    setDarkNoiseRows(prev => [
      ...prev,
      { fpdNo: `FPD ${prev.length + 1}`, fpdSize: '14" x 17"', id: `FPD-0${prev.length + 1}`, ei: '', ddi: '', pixelMean: '' }
    ]);
  };

  const handleDarkNoiseChange = (index: number, field: keyof DarkNoiseRow, value: string) => {
    setDarkNoiseRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleRemoveDarkNoiseRow = (index: number) => {
    if (darkNoiseRows.length <= 1) return;
    setDarkNoiseRows(prev => prev.filter((_, i) => i !== index));
  };

  // Auto Calculations State
  const [calcAvg, setCalcAvg] = useState(0);
  const [calcDiff, setCalcDiff] = useState(0);
  const [calcMax, setCalcMax] = useState(0);
  const [calcMin, setCalcMin] = useState(0);

  // Quick Plate Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickModel, setQuickModel] = useState('');

  // Re-Calculate Uniformity on input changes
  useEffect(() => {
    const { average, max, min, diffPercent } = calculatePVUniformityDiff(
      pvCenter || 0,
      pvTopLeft || 0,
      pvTopRight || 0,
      pvBottomLeft || 0,
      pvBottomRight || 0
    );
    setCalcAvg(average);
    setCalcMax(max);
    setCalcMin(min);
    setCalcDiff(diffPercent);
  }, [pvCenter, pvTopLeft, pvTopRight, pvBottomLeft, pvBottomRight]);

  const submitQuickPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickModel) return;
    onQuickAddPlate(quickName, quickModel);
    setQuickName('');
    setQuickModel('');
    setShowQuickAdd(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      if (googleToken) {
        const resultFile = await uploadQcImageToDrive(googleToken, file);
        setDriveImageUrl(resultFile.id);
        setSuccessMsg(`อัปโหลดรูปภาพทดสอบ "${file.name}" เข้า Google Drive เรียบร้อย!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setDriveImageUrl(event.target.result as string);
            setSuccessMsg(`โหลดรูปภาพจากเครื่องเรียบร้อย (บันทึกออฟไลน์)`);
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      alert(`ไม่สามารถอัปโหลดรูปได้: ${err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Standard QC threshold: PV variation (Difference %) <= 10% and no artifacts detected as Pass
    const isPass = calcDiff <= 10 && hasArtifacts === 'No';

    const newRecord: F5UniformityQCRecord = {
      id: `F5-${Date.now()}`,
      date,
      inspectorName: selectedStaff.name,
      inspectorRole: selectedStaff.role,
      equipmentId: selectedPlateId || (plates[0]?.id || 'PLATE-01'),
      pvCenter: pvCenter || 0,
      pvTopLeft: pvTopLeft || 0,
      pvTopRight: pvTopRight || 0,
      pvBottomLeft: pvBottomLeft || 0,
      pvBottomRight: pvBottomRight || 0,
      differencePercent: calcDiff,
      hasArtifacts,
      notes: notes.trim(),
      driveImageUrl: driveImageUrl.trim(),
      status: isPass ? 'Pass' : 'Fail',
      darkNoiseRows: [...darkNoiseRows]
    };

    onAddRecord(newRecord);
    setNotes('');
    setDriveImageUrl('');
    setSuccessMsg('บันทึกผลตรวจสอบสัญญาณรบกวนมืด (Dark Noise) F8-2 และความสม่ำเสมอพิกเซล F5 สำเร็จ!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getPlateName = (id: string) => {
    const plate = plates.find(p => p.id === id);
    return plate ? `${plate.name} (${plate.model})` : `Plate ID: ${id}`;
  };

  return (
    <div className="space-y-6" id="f5-module">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="font-sans font-bold text-slate-800 text-xl flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">📥</span>
            F8-2 & F5: Dark Noise & Receptor Plate Uniformity QC
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            แบบบันทึกการประเมินสัญญาณรบกวนมืด (Dark Noise) ระบบ DR ทุก 6 เดือน ร่วมกับการคำนวณวัดเปอร์เซ็นต์ความสม่ำเสมอของค่าความสว่างพิกเซล (PV) 5 จุดรับภาพ
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-sans font-medium rounded-xl mb-6">
            🎉 {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">วันที่ตรวจสอบ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">ผู้ประเมินหลัก</label>
              <div className="w-full bg-slate-50 border border-slate-100 cursor-not-allowed rounded-xl px-3.5 py-2.5 text-sm text-slate-700 font-sans">
                {selectedStaff.name} ({selectedStaff.role})
              </div>
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold flex items-center justify-between">
                <span>เลือกตัวรับสัญญาณ (Receptor Plate)</span>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  เพิ่มแผ่นชิ้นที่ 2+
                </button>
              </label>

              {!showQuickAdd ? (
                <select
                  value={selectedPlateId}
                  onChange={(e) => setSelectedPlateId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="f5-select-plate"
                >
                  {plates.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.model})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block">เพิ่มเครื่องแผ่นสัญญาณใหม่</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อแผ่นรับสัญญาณ เช่น แผ่นเอกซเรย์ DR-A"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="bg-white border text-xs border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="ยี่ห้อ/รุ่น เช่น Carestream-3"
                      value={quickModel}
                      onChange={(e) => setQuickModel(e.target.value)}
                      className="bg-white border text-xs border-slate-200 rounded-lg px-2 py-1.5"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] uppercase font-bold px-2 py-1 rounded"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={submitQuickPlate}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold px-2 py-1 rounded"
                    >
                      บันทึกแผ่นสัญญาณ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Measurements & Virtual Diagram Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Diagram Inputs (Aesthetic visual mimicry of standard 14x17 CR Plate) */}
            <div className="col-span-2 space-y-4">
              <h3 className="font-sans font-semibold text-slate-800 text-sm">ป้อนข้อมูลค่าความสว่างพิกเซล 5 จุดการตรวจ (5-Point Exposure Measurements)</h3>
              
              <div 
                className="relative w-full aspect-[4/3] bg-linear-to-b from-slate-900 to-slate-950 rounded-2xl border-4 border-slate-700 p-8 shadow-inner flex flex-col justify-between"
                id="expose-plate-visual"
              >
                {/* Visual Label indicators */}
                <div className="absolute inset-x-0 top-3 text-center text-[10px] text-slate-400 font-mono tracking-widest font-bold">
                  BIOMEDICAL IMAGING CONTAINER - MAE THA REGION
                </div>
                
                {/* 5 Points UI Nodes */}
                <div className="flex justify-between">
                  {/* Top Left */}
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">1. Top-Left PV</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pvTopLeft || ''}
                      onChange={(e) => setPvTopLeft(Number(e.target.value))}
                      className="w-24 bg-slate-800/90 text-center font-bold font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  {/* Top Right */}
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">2. Top-Right PV</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pvTopRight || ''}
                      onChange={(e) => setPvTopRight(Number(e.target.value))}
                      className="w-24 bg-slate-800/90 text-center font-bold font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                {/* Center Node */}
                <div className="flex justify-center">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] text-indigo-300 font-bold font-mono">5. Center PV (Reference)</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pvCenter || ''}
                      onChange={(e) => setPvCenter(Number(e.target.value))}
                      className="w-28 bg-slate-800/90 text-center font-bold font-mono text-indigo-300 border border-indigo-400/50 rounded-lg px-2 py-1.5 text-sm shadow-md shadow-indigo-500/10"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  {/* Bottom Left */}
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">3. Bottom-Left PV</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pvBottomLeft || ''}
                      onChange={(e) => setPvBottomLeft(Number(e.target.value))}
                      className="w-24 bg-slate-800/90 text-center font-bold font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  {/* Bottom Right */}
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">4. Bottom-Right PV</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pvBottomRight || ''}
                      onChange={(e) => setPvBottomRight(Number(e.target.value))}
                      className="w-24 bg-slate-800/90 text-center font-bold font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Dashboard View panel */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  สรุปผลทางคณิตศาสตร์สถิติ (Statistics summary)
                </h4>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-baseline border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-sans">ค่ายอดรวมพิกเซลทั้งหมด (Total Avg):</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{calcAvg}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-sans">ค่าพิกเซลสูงสุด (Max PV):</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{calcMax}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-sans">ค่าพิกเซลต่ำสุด (Min PV):</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{calcMin}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-indigo-900 block font-sans">ส่วนต่างรังสีพิกเซลเฉลี่ย (Calculated Difference %):</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono text-indigo-700">{calcDiff}%</span>
                      <span className={`text-[10px] font-bold font-sans ${calcDiff <= 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        ({calcDiff <= 10 ? 'ตามเกณฑ์ <=10%' : 'เกินเกณฑ์ควบคุม'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artifact selector */}
              <div className="border border-slate-200 bg-white rounded-xl p-3 mt-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">5. พบอาการแสงแวบหรือสิ่งแปลกปลอมกริตติง</span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setHasArtifacts('No')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      hasArtifacts === 'No' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ไม่พบ (No)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasArtifacts('Yes')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      hasArtifacts === 'Yes' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    พบ (Yes)
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* F8-2: Dark Noise Spreadsheet-like Interactive Table */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3.5">
              <div>
                <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="text-indigo-600">📊</span>
                  <span>แบบบันทึก F8-2 : การทดสอบสัญญาณรบกวนมืด (Dark Noise) ระบบ DR</span>
                </h3>
                <p className="font-sans text-[11px] text-slate-500 mt-1">
                  ความถี่ในการตรวจวัด: ทุก 6 เดือน (กรอกหรือเพิ่มเติมข้อตกลงพารามิเตอร์ของพิกเซลมืดได้ด้านล่าง)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDarkNoiseRow}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-100 rounded-xl text-xs font-bold transition cursor-pointer select-none"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เพิ่มแผ่น FPD (Add Row)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-xs font-sans text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="p-3 w-14 text-center">ลำดับ</th>
                    <th className="p-3">FPD no.</th>
                    <th className="p-3 w-1/5">FPD size</th>
                    <th className="p-3 w-1/5">ID</th>
                    <th className="p-3">EI (Exposure Index)</th>
                    <th className="p-3">DDI (Dev. Index)</th>
                    <th className="p-3">Pixel mean</th>
                    <th className="p-3 w-12 text-center text-rose-600">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {darkNoiseRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40 transition">
                      <td className="p-2.5 text-center text-slate-400 font-bold font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={row.fpdNo}
                          onChange={(e) => handleDarkNoiseChange(idx, 'fpdNo', e.target.value)}
                          placeholder="เช่น FPD 1"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-sans text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={row.fpdSize}
                          onChange={(e) => handleDarkNoiseChange(idx, 'fpdSize', e.target.value)}
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-sans text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value='14" x 17"'>14" x 17" (Standard)</option>
                          <option value='10" x 12"'>10" x 12" (Small)</option>
                          <option value='8" x 10"'>8" x 10" (Mini)</option>
                          <option value='17" x 17"'>17" x 17" (Large)</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={row.id}
                          onChange={(e) => handleDarkNoiseChange(idx, 'id', e.target.value)}
                          placeholder="เช่น PM-101"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={row.ei}
                          onChange={(e) => handleDarkNoiseChange(idx, 'ei', e.target.value)}
                          placeholder="เช่น 120"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={row.ddi}
                          onChange={(e) => handleDarkNoiseChange(idx, 'ddi', e.target.value)}
                          placeholder="เช่น 0.1"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          required
                          value={row.pixelMean}
                          onChange={(e) => handleDarkNoiseChange(idx, 'pixelMean', e.target.value)}
                          placeholder="เช่น 450"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDarkNoiseRow(idx)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            darkNoiseRows.length > 1
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                          disabled={darkNoiseRows.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drive & Notes fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold flex items-center justify-between">
                <span>บันทึกภาพถ่ายการประเมินความสม่ำเสมอพิกเซล (Google Drive Link / ID)</span>
                <label className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer select-none">
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{googleToken ? 'อัปโหลดเข้า Drive / เลือกไฟล์' : 'เลือกไฟล์ภาพในเครื่อง'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น https://drive.google.com/file/d/1VRMs-..."
                  value={driveImageUrl}
                  onChange={(e) => setDriveImageUrl(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none"
                  id="f5-drive-url-input"
                />
                {driveImageUrl && (
                  <a
                    href={getDriveOriginalUrl(driveImageUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center justify-center transition cursor-pointer"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
              
              {driveImageUrl && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <img
                    src={getDriveDirectImageUrl(driveImageUrl)}
                    alt="Preview"
                    className="w-20 h-20 object-contain bg-slate-200 rounded border border-slate-200"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=200&auto=format&fit=crop';
                    }}
                  />
                  <div>
                    <span className="text-xs text-slate-400 font-medium font-sans">พรีวิวรูปภาพตรวจสอบ:</span>
                    <p className="text-xs text-slate-800 font-medium font-sans truncate max-w-[200px]">รูปแผ่นสัญญาณ Exposure Profile</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">พยาธิสภาพข้อเสอแนะ (Remarks)</label>
              <textarea
                placeholder="เช่น การประเมินกระจายคริสตัลเป็นไปตามสมมาตร ไม่พบสิ่งแปลกปลอมกวนสัญญาณภาพ"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-sans font-medium transition shadow-sm hover:shadow cursor-pointer"
              id="f5-submit-record"
            >
              บันทึกผลตรวจสอบ (Save Report)
            </button>
          </div>
        </form>
      </div>

      {/* History log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-sans font-bold text-slate-800 text-sm">ตารางประวัติการตรวจสอบสัญญาณรบกวนมืด F8-2 และ Uniformity (History Records)</h3>
          <p className="font-sans text-xs text-slate-400 mt-1">
            รายการผลประเมินย้อนหลังทั้งหมดที่บันทึกของกลุ่มงานรังสีโรงพยาบาลแม่ทา
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-medium">
                <th className="p-4 font-sans text-xs font-semibold">ID</th>
                <th className="p-4 font-sans text-xs">วันทำการทดสอบ</th>
                <th className="p-4 font-sans text-xs">อุปกรณ์แผ่นสัญญาณ</th>
                <th className="p-4 font-sans text-xs">ผู้ประเมินหลัก</th>
                <th className="p-4 font-sans text-xs text-center">Center / Max Diff % / Artifact</th>
                <th className="p-4 font-sans text-xs text-center">ระดับผลประเมิน</th>
                <th className="p-4 font-sans text-xs text-right">รายงานราชการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    ไม่พบประวัติบันทึกการตรวจผลของ Dark Noise (F8-2) หรือ Receptor Uniformity (F5) ในระบบโรงพยาบาลแม่ทา
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-mono text-slate-500 text-xs font-semibold">{rec.id}</td>
                    <td className="p-4 font-sans text-slate-800 font-medium">{rec.date}</td>
                    <td className="p-4 font-sans text-slate-700 font-medium text-xs">{getPlateName(rec.equipmentId)}</td>
                    <td className="p-4 font-sans text-slate-600 text-xs">
                      {rec.inspectorName}
                      <span className="block text-[10px] text-slate-400">{rec.inspectorRole}</span>
                    </td>
                    <td className="p-4 text-center font-mono text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <span>Center: {rec.pvCenter}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-indigo-600">Diff: {rec.differencePercent}%</span>
                        <span className="text-slate-300">|</span>
                        <span className={rec.hasArtifacts === 'No' ? 'text-emerald-600' : 'text-rose-500'}>Art: {rec.hasArtifacts}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        rec.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {rec.status === 'Pass' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>ผ่าน (Pass)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>ไม่ผ่าน (Fail)</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {confirmDeleteId === rec.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in slide-in-from-right-1 duration-100">
                          <span className="text-[10px] text-rose-600 font-bold font-sans">ลบ?</span>
                          <button
                            onClick={() => {
                              if (onDeleteRecord) onDeleteRecord(rec.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer transition select-none hover:bg-rose-700"
                          >
                            ตกลง
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition select-none hover:bg-slate-300"
                          >
                            เลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenReportPreview(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 hover:text-indigo-900 rounded-lg text-xs font-medium cursor-pointer transition"
                            title="ดูรายงานผลและพิมพ์"
                            id={`btn-open-preview-${rec.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>รายงานก่อนปริ้น</span>
                          </button>
                          
                          {onDeleteRecord && (
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-lg transition cursor-pointer"
                              title="ลบรายการนี้"
                              id={`btn-delete-rec-${rec.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
