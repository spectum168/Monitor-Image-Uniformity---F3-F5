/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ImageQualityRecord, Equipment, StaffMember, GoogleDriveFile } from '../types';
import { FileText, Eye, CheckCircle2, AlertTriangle, Link as LinkIcon, Upload, Image as ImageIcon, Sparkles, FolderOpen, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { getDriveDirectImageUrl, getDriveOriginalUrl, listDriveQcImages, uploadQcImageToDrive, deleteDriveFile } from '../lib/googleDriveAndSheets';

interface ClinicalImageQualityProps {
  xrayUnits: Equipment[];
  staffList: StaffMember[];
  selectedStaff: StaffMember;
  records: ImageQualityRecord[];
  onAddRecord: (record: ImageQualityRecord) => void;
  onOpenReportPreview: (record: ImageQualityRecord) => void;
  onQuickAddXray: (name: string, model: string) => void;
  googleToken: string | null;
  onDeleteRecord?: (id: string) => void;
}

export default function ClinicalImageQuality({
  xrayUnits,
  staffList,
  selectedStaff,
  records,
  onAddRecord,
  onOpenReportPreview,
  onQuickAddXray,
  googleToken,
  onDeleteRecord
}: ClinicalImageQualityProps) {
  // Confirmation state for delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Form state
  const [selectedUnitId, setSelectedUnitId] = useState(xrayUnits[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (xrayUnits.length > 0 && !selectedUnitId) {
      setSelectedUnitId(xrayUnits[0].id);
    }
  }, [xrayUnits, selectedUnitId]);
  
  // Checklist Metrics
  const [positioning, setPositioning] = useState<'Pass' | 'Fail'>('Pass');
  const [exposure, setExposure] = useState<'Pass' | 'Fail'>('Pass');
  const [sharpness, setSharpness] = useState<'Pass' | 'Fail'>('Pass');
  const [markers, setMarkers] = useState<'Pass' | 'Fail'>('Pass');
  
  const [notes, setNotes] = useState('');
  const [driveImageUrls, setDriveImageUrls] = useState<string[]>(['']);
  const [successMsg, setSuccessMsg] = useState('');

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

  // Google Drive integrations
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Quick Xray Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickModel, setQuickModel] = useState('');

  // Fetch Drive images if token is available
  const fetchDriveImages = async () => {
    if (!googleToken) return;
    setIsLoadingDrive(true);
    try {
      const files = await listDriveQcImages(googleToken);
      setDriveFiles(files);
    } catch (err) {
      console.error("Could not load Drive folder database.", err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      fetchDriveImages();
    }
  }, [googleToken]);

  const submitQuickXray = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickModel) return;
    onQuickAddXray(quickName, quickModel);
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
        // Auto capture original web url or file id
        setDriveImageUrls(prev => {
          const filtered = prev.filter(Boolean);
          return [...filtered, resultFile.id];
        });
        await fetchDriveImages(); // refresh roster
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
    
    // Overall status is Pass if all are Pass
    const isOverallPass = 
      positioning === 'Pass' && 
      exposure === 'Pass' && 
      sharpness === 'Pass' && 
      markers === 'Pass';

    // Join all non-empty URLs with a comma
    const joinedUrl = driveImageUrls.map(u => u.trim()).filter(Boolean).join(',');

    const newRecord: ImageQualityRecord = {
      id: `CI-${Date.now()}`,
      date,
      inspectorName: selectedStaff.name,
      inspectorRole: selectedStaff.role,
      equipmentId: selectedUnitId || (xrayUnits[0]?.id || 'XRAY-01'),
      positioning,
      exposure,
      sharpness,
      markers,
      notes: notes.trim(),
      driveImageUrl: joinedUrl,
      status: isOverallPass ? 'Pass' : 'Fail'
    };

    onAddRecord(newRecord);
    setNotes('');
    setDriveImageUrls(['']);
    setSuccessMsg('บันทึกรายงานประเมินความสมบูรณ์ภาพถ่ายรังสีแพทย์เวชปฏิบัติทั่วไปสำเร็จ!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getUnitName = (id: string) => {
    const unit = xrayUnits.find(u => u.id === id);
    return unit ? `${unit.name} (${unit.model})` : `X-Ray Unit ID: ${id}`;
  };

  return (
    <div className="space-y-6" id="clinical-image-module">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="font-sans font-bold text-slate-800 text-xl flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">☢️</span>
            Image Quality Analysis (Clinical Anatomy Test)
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            แบบประเมินคุณภาพภาพถ่ายรังสีจากประวัติตรวจรักษาจริงของคลินิก เพื่อพิจารณาความสมบูรณ์ของสรีรวิทยากระดูกและเนื้อเยื่อเปรียบเทียบมาตรฐาน
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-sans font-medium rounded-xl mb-6">
            🎉 {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">วันที่วิเคราะห์ภาพ</label>
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
                <span>เลือกเครื่องถ่ายเอกซเรย์รังสี (X-Ray Machine)</span>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  เพิ่มเครื่องที่ 2+
                </button>
              </label>

              {!showQuickAdd ? (
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="clinical-select-unit"
                >
                  {xrayUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.model})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block">เพิ่มเครื่องเอกซเรย์ตัวใหม่</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อเครื่อง เช่น เครื่องเอกซเรย์พกพา #4"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="bg-white border text-xs border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="ยี่ห้อ/รุ่น เช่น Shimadzu MobileArt"
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
                      onClick={submitQuickXray}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold px-2 py-1 rounded"
                    >
                      บันทึกเครื่องรังซี
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rating Matrix */}
          <div className="space-y-4">
            <h3 className="font-sans font-semibold text-slate-800 text-sm">เกณฑ์การพิจารณาคะแนนทางคลินิก (Clinical QC parameters)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Positioning */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">1. Patient Positioning</span>
                <p className="text-[10px] text-slate-500 leading-tight">การจัดสัณฐาน อวัยวะครบถ้วน ชัดเจน มุมจัดระบุองศากระดูกถูกต้อง</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setPositioning('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      positioning === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPositioning('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      positioning === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Exposure */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">2. Image Exposure</span>
                <p className="text-[10px] text-slate-500 leading-tight">ความทึบแสง (Exposure) เสมอกัน แยกความเข้มของไขมันและกระดูกได้แจ่มชัด</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setExposure('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      exposure === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExposure('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      exposure === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Sharpness */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">3. Anatomical Sharpness</span>
                <p className="text-[10px] text-slate-500 leading-tight">ความขุ่นเบลอยังเห็นพยาธิเด่นชัด ไม่สั่นไหวขณะเปิดรังสีเก็บรายละเอียดสูง</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setSharpness('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      sharpness === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharpness('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      sharpness === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

              {/* Markers */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">4. Side Lead Markers</span>
                <p className="text-[10px] text-slate-500 leading-tight">มีป้ายแสดงทิศทาง (L/R) ประกอบชัดเจนในฟิล์มรังสี ไม่ขัดขวางอวัยวะตรวจ</p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setMarkers('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      markers === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkers('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition font-sans cursor-pointer ${
                      markers === 'Fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ตก (Fail)
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Drive & Remarks Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-sans text-slate-700 font-bold flex items-center gap-1.5 font-sans">
                  📁 รายการภาพถ่ายประเมินรังสีประกอบรายงาน (Google Drive Links / Photos)
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
                        id={`clinical-drive-url-${idx}`}
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
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576091158783-a212ecb13df4?q=80&w=200&auto=format&fit=crop';
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
              <label className="block text-xs font-sans text-slate-500 mb-1.5 font-semibold">บันทึกเพิ่มเติมหรือพยาธิเด่นตรวจพบคคลินิก</label>
              <textarea
                placeholder="เช่น การจัดท่าครอบคลุมสรีรศาสตร์สมบูรณ์ ท่า Chest PA ชัดเจนไม่มีรอยกวน"
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
              id="clinical-submit-record"
            >
              บันทึกข้อมูลการประเมินทางคลินิก
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Google Drive folder image repository */}
      {googleToken && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="drive-images-gallery">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-slate-500" />
                คลังรูปภาพรังสีในโฟลเดอร์ Google Drive (Folder ID: 1VRMs-lCzN7ncsJV-8Nkmecg40Sn3-1vC)
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-0.5">
                คลิกที่รูปภาพเพื่อเลือกเข้าแบบฟอร์มตรวจสอบของคุณทันที
              </p>
            </div>
            <button
              onClick={fetchDriveImages}
              disabled={isLoadingDrive}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold px-3 py-1.5 rounded-lg transition"
            >
              {isLoadingDrive ? 'กำลังโหลด...' : '🔄 รีเฟรชคลังภาพ'}
            </button>
          </div>

          {isLoadingDrive ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500 ml-2 font-sans">กำลังดึงข้อมูลสารบบไฟล์ภาพ...</span>
            </div>
          ) : driveFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-sans">
              ไม่พบรูปภาพเช่าใช้ในโฟลเดอร์รังสี โรงพยาบาลแม่ทา สามารถกดปุ่มอัปโหลดด้านบนเพื่อเชื่อมต่อเข้าระบบได้ทันที
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    setDriveImageUrls((prev) => {
                      const copy = [...prev];
                      const emptyIdx = copy.findIndex((u) => !u.trim());
                      if (emptyIdx !== -1) {
                        copy[emptyIdx] = file.id;
                      } else {
                        copy.push(file.id);
                      }
                      return copy;
                    });
                    setSuccessMsg(`เลือกภาพจากแบรนด์ Drive: ${file.name} เรียบร้อย!`);
                    setTimeout(() => setSuccessMsg(''), 3000);
                  }}
                  className="group relative cursor-pointer border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-500 select-none bg-slate-50 hover:shadow transition"
                  id={`drive-file-${file.id}`}
                >
                  <img
                    src={getDriveDirectImageUrl(file.id)}
                    alt={file.name}
                    className="w-full aspect-square object-cover bg-slate-200 group-hover:scale-105 transition duration-200"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576091158783-a212ecb13df4?q=80&w=200&auto=format&fit=crop';
                    }}
                  />
                  {/* Delete Image button directly inside Drive list */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`คุณแน่ใจว่าต้องการลบรูปภาพ "${file.name}" คลังรูปภาพ Google Drive หรือไม่?`)) {
                        try {
                          setIsLoadingDrive(true);
                          await deleteDriveFile(googleToken, file.id);
                          setSuccessMsg(`ลบรูปภาพ "${file.name}" ออกจากระบบ Google Drive สำเร็จ!`);
                          setTimeout(() => setSuccessMsg(''), 4000);
                          setDriveImageUrls((prev) => prev.map((u) => (u === file.id ? '' : u)));
                          await fetchDriveImages();
                        } catch (err: any) {
                          alert(`เกิดปัญหาลบรูปภาพ: ${err.message || err}`);
                        } finally {
                          setIsLoadingDrive(false);
                        }
                      }
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 shadow-md cursor-pointer flex items-center justify-center z-10"
                    title="ลบรูปภาพนี้ถาวรจาก Google Drive"
                    id={`btn-del-img-${file.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="p-1 px-2 text-[9px] text-slate-500 font-sans truncate bg-white border-t border-slate-100">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Grid list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-sans font-bold text-slate-800 text-sm">ตารางประวัติการตรวจสอบภาพคลินิก (Clinical Evaluation History)</h3>
          <p className="font-sans text-xs text-slate-400 mt-1">
            รายการตรวจสอบและวิเคราะห์คุณภาพภาพของผู้รับบริการแผนกรังสีเทคนิคแม่ทา
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-medium">
                <th className="p-4 font-sans text-xs">ID</th>
                <th className="p-4 font-sans text-xs">วันทำการประเมิน</th>
                <th className="p-4 font-sans text-xs">เครื่องเอกซเรย์ใช้งาน</th>
                <th className="p-4 font-sans text-xs">ผู้ประเมินหลัก</th>
                <th className="p-4 font-sans text-xs text-center">Pos / Exp / Sharp / Mark</th>
                <th className="p-4 font-sans text-xs text-center">ระดับผลลัพธ์</th>
                <th className="p-4 font-sans text-xs text-right">รายงานราชการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    ไม่พบข้อมูลและแบบคัดกรองประเมินคุณภาพภาพถ่ายรังสีแพทย์แผนกโรงพยาบาลแม่ทา
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-mono text-slate-500 text-xs font-semibold">{rec.id}</td>
                    <td className="p-4 font-sans text-slate-800 font-medium">{rec.date}</td>
                    <td className="p-4 font-sans text-slate-700 font-medium text-xs">{getUnitName(rec.equipmentId)}</td>
                    <td className="p-4 font-sans text-slate-600 text-xs">
                      {rec.inspectorName}
                      <span className="block text-[10px] text-slate-400">{rec.inspectorRole}</span>
                    </td>
                    <td className="p-4 text-center font-mono text-xs">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded ${rec.positioning === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>P:{rec.positioning}</span>
                        <span className={`px-1.5 py-0.5 rounded ${rec.exposure === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>E:{rec.exposure}</span>
                        <span className={`px-1.5 py-0.5 rounded ${rec.sharpness === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>S:{rec.sharpness}</span>
                        <span className={`px-1.5 py-0.5 rounded ${rec.markers === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>M:{rec.markers}</span>
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
