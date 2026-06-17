/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { F3MonitorQCRecord, Equipment, StaffMember } from '../types';
import { TG18_QC_EXPLANATION } from '../data';
import { FileText, Eye, CheckCircle2, AlertTriangle, Image as ImageIcon, Link as LinkIcon, Heart, PlusCircle, Trash2, Upload, Loader2 } from 'lucide-react';
import { getDriveDirectImageUrl, getDriveOriginalUrl, uploadQcImageToDrive } from '../lib/googleDriveAndSheets';

interface F3MonitorQCProps {
  monitors: Equipment[];
  staffList: StaffMember[];
  selectedStaff: StaffMember;
  records: F3MonitorQCRecord[];
  onAddRecord: (record: F3MonitorQCRecord) => void;
  onOpenReportPreview: (record: F3MonitorQCRecord) => void;
  onQuickAddMonitor: (name: string, model: string) => void;
  onDeleteRecord?: (id: string) => void;
  googleToken?: string | null;
}

export default function F3MonitorQC({
  monitors,
  staffList,
  selectedStaff,
  records,
  onAddRecord,
  onOpenReportPreview,
  onQuickAddMonitor,
  onDeleteRecord,
  googleToken
}: F3MonitorQCProps) {
  // Confirmation state for delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Form State
  const [selectedMonitorId, setSelectedMonitorId] = useState(monitors[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (monitors.length > 0 && !selectedMonitorId) {
      setSelectedMonitorId(monitors[0].id);
    }
  }, [monitors, selectedMonitorId]);
  const [distortion, setDistortion] = useState<'Pass' | 'Fail'>('Pass');
  const [luminance, setLuminance] = useState<'Pass' | 'Fail'>('Pass');
  const [resolution, setResolution] = useState<'Pass' | 'Fail'>('Pass');
  const [artifacts, setArtifacts] = useState<'Pass' | 'Fail'>('Pass');
  const [uniformity, setUniformity] = useState<'Pass' | 'Fail'>('Pass');
  const [notes, setNotes] = useState('');
  const [driveImageUrls, setDriveImageUrls] = useState<string[]>(['']);
  const [successMsg, setSuccessMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleAddUrlField = () => {
    setDriveImageUrls(prev => [...prev, '']);
  };

  const handleUrlFieldChange = (index: number, val: string) => {
    setDriveImageUrls(prev => prev.map((url, i) => i === index ? val : url));
  };

  const handleRemoveUrlField = (index: number) => {
    if (driveImageUrls.length <= 1) {
      setDriveImageUrls(['']);
      return;
    }
    setDriveImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Quick Monitor Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickModel, setQuickModel] = useState('');

  const submitQuickMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickModel) return;
    onQuickAddMonitor(quickName, quickModel);
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
        setDriveImageUrls(prev => {
          const filtered = prev.filter(Boolean);
          return [...filtered, resultFile.id];
        });
        setSuccessMsg(`อัปโหลดรูปภาพทดสอบ "${file.name}" เข้า Google Drive เรียบร้อย!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setDriveImageUrls(prev => {
              const filtered = prev.filter(Boolean);
              return [...filtered, event.target.result as string];
            });
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
    
    // Overall status is 'Pass' is all metrics are Pass
    const isOverallPass = 
      distortion === 'Pass' && 
      luminance === 'Pass' && 
      resolution === 'Pass' && 
      artifacts === 'Pass' && 
      uniformity === 'Pass';

    // Join all non-empty URLs with a comma
    const joinedUrl = driveImageUrls.map(u => u.trim()).filter(Boolean).join(',');

    const newRecord: F3MonitorQCRecord = {
      id: `F3-${Date.now()}`,
      date,
      inspectorName: selectedStaff.name,
      inspectorRole: selectedStaff.role,
      equipmentId: selectedMonitorId || (monitors[0]?.id || 'MONITOR-01'),
      distortion,
      luminance,
      resolution,
      artifacts,
      uniformity,
      notes: notes.trim(),
      driveImageUrl: joinedUrl,
      status: isOverallPass ? 'Pass' : 'Fail'
    };

    onAddRecord(newRecord);
    setNotes('');
    setDriveImageUrls(['']);
    setSuccessMsg('บันทึกผลการตรวจสอบมาตรฐานจอภาพ TG18-QC สำเร็จ!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Find corresponding equipment name for table lists
  const getMonitorName = (id: string) => {
    const monitor = monitors.find(m => m.id === id);
    return monitor ? `${monitor.name} (${monitor.model})` : `Monitor ID: ${id}`;
  };

  return (
    <div className="space-y-6" id="f3-module">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="font-sans font-bold text-slate-800 text-xl flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">🖥️</span>
            F3: Display Monitor QC (TG18-QC Test)
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            แบบประเมินและตรวจสอบคุณภาพหน้าจอแสดงผลรังสีแพทย์ ตามพารามิเตอร์การทดสอบของ TG18
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-sans font-medium rounded-xl mb-6">
            🎉 {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Panel - Date / Inspector / Monitor */}
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
                <span>เลือกจอภาพแสดงผลที่ตรวจสอบ</span>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  เพิ่มจอชิ้นที่ 2+
                </button>
              </label>

              {!showQuickAdd ? (
                <select
                  value={selectedMonitorId}
                  onChange={(e) => setSelectedMonitorId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="f3-select-monitor"
                >
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.model})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block">เพิ่มเครื่องจอใหม่ทันที</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อจอภาพ เช่น จอภาพห้องศัลยกรรม"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="bg-white border text-xs border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="ยี่ห้อ/รุ่น เช่น Dell S24"
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
                      onClick={submitQuickMonitor}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold px-2 py-1 rounded"
                    >
                      บันทึกจอภาพ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checklist Area with explanation details */}
          <div className="space-y-4">
            <h3 className="font-sans font-semibold text-slate-800 text-sm">เกณฑ์การประเมินและการตรวจสอบ TG18-QC (Checklist)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Distortion */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">1. Geometric Distortion</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{TG18_QC_EXPLANATION.distortion}</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setDistortion('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      distortion === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistortion('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      distortion === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Luminance */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">2. Luminance Response</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{TG18_QC_EXPLANATION.luminance}</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setLuminance('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      luminance === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLuminance('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      luminance === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Resolution */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">3. Spatial Resolution</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{TG18_QC_EXPLANATION.resolution}</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setResolution('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      resolution === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      resolution === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Artifacts */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">4. Image Artifacts</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{TG18_QC_EXPLANATION.artifacts}</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setArtifacts('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      artifacts === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtifacts('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      artifacts === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Uniformity */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">5. Display Uniformity</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{TG18_QC_EXPLANATION.uniformity}</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setUniformity('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      uniformity === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniformity('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      uniformity === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel - Image Input & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-sans text-slate-700 font-bold flex items-center gap-1.5 font-sans">
                  📁 รายการภาพถ่ายประเมินหน้าจอประกอบรายงาน (Google Drive Links / IDs)
                </span>
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
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {driveImageUrls.map((urlVal, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-slate-400 font-bold">#{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="วางลิงก์ เช่น https://drive.google.com/file/d/..."
                        value={urlVal}
                        onChange={(e) => handleUrlFieldChange(idx, e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        id={`f3-drive-url-input-${idx}`}
                      />
                      {urlVal && (
                        <a
                          href={getDriveOriginalUrl(urlVal)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 aspect-square flex items-center justify-center transition cursor-pointer"
                          title="เปิดภาพใน Drive"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveUrlField(idx)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 aspect-square flex items-center justify-center transition cursor-pointer"
                        title="ลบรายการลิงก์นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {urlVal && (
                      <div className="ml-6 p-2 bg-slate-50 border border-slate-150/60 rounded-xl flex items-center gap-3">
                        <img
                          src={getDriveDirectImageUrl(urlVal)}
                          alt={`Preview #${idx + 1}`}
                          className="w-12 h-12 object-contain bg-slate-200 rounded border border-slate-250 animate-fade-in"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=200&auto=format&fit=crop';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block">พรีวิวรูปภาพ #{idx + 1}:</span>
                          <span className="text-[10px] text-slate-600 truncate block font-mono">
                            {urlVal.length > 40 ? urlVal.substring(0, 40) + '...' : urlVal}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddUrlField}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 hover:text-indigo-800 border border-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition select-none"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เพิ่มช่องวางลิงก์ภาพถ่าย (+ Add image link)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">ข้อเสนอแนะเพิ่มเติม / หมายเหตุ</label>
              <textarea
                placeholder="เช่น พบแสงรบกวนภายนอกเล็กน้อย หน้าจอสะอาดไม่มีรอยนิ้วมือ"
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
              id="f3-submit-record"
            >
              บันทึกข้อมูลการตรวจสอบจอภาพ
            </button>
          </div>
        </form>
      </div>

      {/* History log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-sans font-bold text-slate-800 text-sm">ตารางประวัติการตรวจสอบหน้าจอ F3 (History Records)</h3>
          <p className="font-sans text-xs text-slate-400 mt-1">
            รายการผลประเมินย้อนหลังทั้งหมดที่ซิงก์จากฐานข้อมูลโรงพยาบาลรังสีเทคนิคแม่ทา
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-medium">
                <th className="p-4 font-sans text-xs">ID</th>
                <th className="p-4 font-sans text-xs">วันทำการทดสอบ</th>
                <th className="p-4 font-sans text-xs">ชุดจอภาพเครื่องตรวจ</th>
                <th className="p-4 font-sans text-xs">ผู้ประเมินหลัก</th>
                <th className="p-4 font-sans text-xs text-center">Dist / Lum / Res / Art / Unif</th>
                <th className="p-4 font-sans text-xs text-center">ผลลัพธ์ประเมิน</th>
                <th className="p-4 font-sans text-xs text-right">รายงานราชการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    ไม่พบประวัติบันทึกการตรวจผลของจอแสดงภาพ (F3) ในระบบโรงพยาบาลแม่ทา
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-mono text-slate-500 text-xs font-semibold">{rec.id}</td>
                    <td className="p-4 font-sans text-slate-800 font-medium">{rec.date}</td>
                    <td className="p-4 font-sans text-slate-700 font-medium text-xs">{getMonitorName(rec.equipmentId)}</td>
                    <td className="p-4 font-sans text-slate-600 text-xs">
                      {rec.inspectorName}
                      <span className="block text-[10px] text-slate-400">{rec.inspectorRole}</span>
                    </td>
                    <td className="p-4 text-center font-mono text-xs">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-1 py-0.5 rounded ${rec.distortion === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>D:{rec.distortion}</span>
                        <span className={`px-1 py-0.5 rounded ${rec.luminance === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>L:{rec.luminance}</span>
                        <span className={`px-1 py-0.5 rounded ${rec.resolution === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>R:{rec.resolution}</span>
                        <span className={`px-1 py-0.5 rounded ${rec.artifacts === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>A:{rec.artifacts}</span>
                        <span className={`px-1 py-0.5 rounded ${rec.uniformity === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>U:{rec.uniformity}</span>
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
