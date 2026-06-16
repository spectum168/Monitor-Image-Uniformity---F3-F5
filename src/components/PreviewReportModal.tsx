/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { X, Printer, FileText, ExternalLink, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { F3MonitorQCRecord, F5UniformityQCRecord, ImageQualityRecord, Equipment } from '../types';
import { getDriveDirectImageUrl, getDriveOriginalUrl } from '../lib/googleDriveAndSheets';

interface PreviewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordType: 'F3' | 'F5' | 'clinical';
  record: F3MonitorQCRecord | F5UniformityQCRecord | ImageQualityRecord | null;
  selectedEquipment: Equipment | null;
}

export default function PreviewReportModal({
  isOpen,
  onClose,
  recordType,
  record,
  selectedEquipment
}: PreviewReportModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !record) return null;

  // Print helper
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Open print dialog with custom stylesheet for correct print borders
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>รายงาน QC - แผนกรังสีเทคนิค โรงพยาบาลแม่ทา</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body {
                  margin: 20px;
                  color: #000;
                  background: #fff;
                  -webkit-print-color-adjust: exact;
                }
                .no-print {
                  display: none !important;
                }
              }
              body {
                font-family: 'Inter', 'Sarabun', sans-serif;
              }
              .border-double-custom {
                border-style: double;
                border-width: 6px;
                border-color: #475569;
              }
            </style>
          </head>
          <body>
            <div class="p-6 max-w-4xl mx-auto">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Human-readable labels for display parameters
  const getF3ResultDisplay = (rec: F3MonitorQCRecord) => [
    { label: 'ความบิดเบี้ยวของภาพ (Geometric Distortion)', status: rec.distortion },
    { label: 'ระดับความสว่างหน้าจอ (Luminance Quality)', status: rec.luminance },
    { label: 'ระดับความคมชัดพิกเซล (Resolution Quality)', status: rec.resolution },
    { label: 'สิ่งแปลกปลอมบนจอภาพ (Artifacts Check)', status: rec.artifacts },
    { label: 'ความสว่างสม่ำเสมอทั่วหน้าจอ (Uniformity)', status: rec.uniformity }
  ];

  const getClinicalResultDisplay = (rec: ImageQualityRecord) => [
    { label: 'การจัดท่าผู้ป่วยเพื่อถ่ายภาพทางรังสี (Positioning)', status: rec.positioning },
    { label: 'ปริมาณรังสีหรือค่าความดำที่ผิว (Exposure Quality)', status: rec.exposure },
    { label: 'ความแจ่มชัดความคมภาพ (Sharpness Detail)', status: rec.sharpness },
    { label: 'เครื่องหมายหรือตัวบ่งชี้ทิศรังสี (Side Markers)', status: rec.markers }
  ];

  const imageUrl = getDriveDirectImageUrl(record.driveImageUrl);
  const originalUrl = getDriveOriginalUrl(record.driveImageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="font-medium text-slate-800">พรีวิวหน้ารายงานใบรับรองโรงพยาบาล</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium cursor-pointer transition shadow-sm"
              id="btn-trigger-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์ / ออกเป็น PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Wrapper */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
          {/* Print container with Hospital Standard Theme */}
          <div 
            ref={printAreaRef}
            className="bg-white p-10 md:p-14 border border-slate-200 rounded-lg shadow-sm max-w-[210mm] mx-auto min-h-[297mm] text-slate-800 flex flex-col justify-between"
            style={{ contentVisibility: 'auto' }}
          >
            <div>
              {/* Document Header with Mae Tha Hospital Identity */}
              <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
                <div className="text-sm font-bold tracking-wider text-indigo-900 font-sans uppercase">Quality Control Certificate</div>
                <h1 className="text-2xl font-bold font-sans text-slate-900 mt-1">แผนกรังสีเทคนิค โรงพยาบาลแม่ทา</h1>
                <p className="text-xs text-slate-500 mt-1">
                  145 หมู่ที่ 2 ถนนลำพูน-ทาสบเส้า ตำบลทาสบเส้า อำเภอแม่ทา จังหวัดลำพูน 51140 | โทร. 053-575088
                </p>
                <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700 font-mono mt-3 border border-slate-200">
                  หมายเลขรายงาน: {record.id}
                </div>
              </div>

              {/* Title of Document */}
              <div className="text-center mb-8">
                <h2 className="text-lg font-bold font-sans text-slate-800 underline decor-solid underline-offset-4">
                  {recordType === 'F3' && 'ใบรายงานผลการประเมินคุณภาพของจอแสดงภาพ (Monitor TG18-QC Checklist)'}
                  {recordType === 'F5' && 'ใบรายงานผลการประเมินความสม่ำเสมอของตัวรับภาพ (Receptor Plate Uniformity QC)'}
                  {recordType === 'clinical' && 'ใบรายงานผลการวิเคราะห์คุณภาพของภาพในผู้ใช้บริการจริง (Clinical Image Quality Analysis)'}
                </h2>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 bg-slate-50 p-5 rounded-xl border border-slate-200/80 text-sm mb-6">
                <div>
                  <span className="text-slate-500 font-medium">วันที่ทำการทดสอบ:</span>
                  <span className="text-slate-800 block font-semibold pl-1.5 mt-0.5">{record.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ผู้ประเมิน / ตรวจสอบ:</span>
                  <span className="text-slate-800 block font-semibold pl-1.5 mt-0.5">
                    {record.inspectorName} ({record.inspectorRole})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">อุปกรณ์ / อุปกรณ์รับภาพ:</span>
                  <p className="text-slate-800 block font-semibold pl-1.5 mt-0.5" id="report-eq-name">
                    {selectedEquipment ? selectedEquipment.name : 'อุปกรณ์ภายนอก'} (ID: {record.equipmentId})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">รุ่น (Model) / รหัสเครื่อง:</span>
                  <span className="text-slate-800 block font-semibold pl-1.5 mt-0.5 font-mono text-xs">
                    {selectedEquipment ? `${selectedEquipment.model} [${selectedEquipment.serialNumber || 'ไม่มีซีเรียล'}]` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Specific QC metrics outcome rows */}
              <div className="mb-6">
                <h3 className="text-sm font-bold font-sans text-slate-900 border-b border-slate-300 pb-1 mb-3 bg-slate-50/80 px-2 py-1 rounded">
                  ตารางรายงานผลรายการตรวจควบคุมคุณภาพ (QC Verification Details)
                </h3>

                {/* Case 1: F3 Monitor TG18-QC */}
                {recordType === 'F3' && (
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-3 border-r border-slate-300">การทดสอบคุณลักษณะจอภาพ</th>
                        <th className="p-3 w-1/4 text-center">ระดับผลการตรวจ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {getF3ResultDisplay(record as F3MonitorQCRecord).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-sans text-slate-700 font-medium border-r border-slate-300">{item.label}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              item.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'
                            }`}>
                              {item.status === 'Pass' ? '✅ ผ่าน (Pass)' : '❌ ตก (Fail)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Case 2: F5 Plate Uniformity & 5-point PV values */}
                {recordType === 'F5' && (
                  <div className="space-y-6">
                    {/* F8-2: Dark Noise (การทดสอบสัญญาณรบกวนมืด) Table */}
                    <div>
                      <h4 className="text-xs font-bold font-sans text-slate-800 mb-2.5 border-b border-slate-200 pb-1 flex justify-between">
                        <span>แบบบันทึก F8-2 : การทดสอบสัญญาณรบกวนมืด (Dark Noise) ระบบ DR</span>
                        <span className="text-slate-400 font-normal">ความถี่ : ทุก 6 เดือน</span>
                      </h4>
                      <table className="w-full text-left text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300 font-sans">
                            <th className="p-2 border-r border-slate-300 w-12 text-center">ลำดับ</th>
                            <th className="p-2 border-r border-slate-300">FPD no.</th>
                            <th className="p-2 border-r border-slate-300">FPD size</th>
                            <th className="p-2 border-r border-slate-300">ID</th>
                            <th className="p-2 border-r border-slate-300 text-center">EI</th>
                            <th className="p-2 border-r border-slate-300 text-center">DDI</th>
                            <th className="p-2 text-center">Pixel mean</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {((record as F5UniformityQCRecord).darkNoiseRows && (record as F5UniformityQCRecord).darkNoiseRows!.length > 0) ? (
                            (record as F5UniformityQCRecord).darkNoiseRows!.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/20 text-slate-700">
                                <td className="p-2 border-r border-slate-300 text-center font-bold font-mono text-[10px]">{rIdx + 1}</td>
                                <td className="p-2 border-r border-slate-300 font-sans">{row.fpdNo || '-'}</td>
                                <td className="p-2 border-r border-slate-300 font-sans text-[11px]">{row.fpdSize || '-'}</td>
                                <td className="p-2 border-r border-slate-300 font-mono text-[11px]">{row.id || '-'}</td>
                                <td className="p-2 border-r border-slate-300 font-mono text-center">{row.ei || '-'}</td>
                                <td className="p-2 border-r border-slate-300 font-mono text-center">{row.ddi || '-'}</td>
                                <td className="p-2 text-center font-bold font-mono text-indigo-700">{row.pixelMean || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-slate-400 font-sans italic text-[11px]">
                                ไม่พบข้อมูลพารามิเตอร์แบบบันทึก Dark Noise สำหรับภาพตรวจประเมินฉบับเก่านี้
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold font-sans text-slate-800 mb-2 border-b border-slate-200 pb-1">
                        แบบประวัติบันทึกค่าพิกเซลสว่าง 5 จุด (5-Point Pixel-Value Measurements)
                      </h4>
                      <div className="grid grid-cols-5 gap-3 mb-4 text-center">
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-sans">PV Center</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{(record as F5UniformityQCRecord).pvCenter}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-sans">PV Top-Left</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{(record as F5UniformityQCRecord).pvTopLeft}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-sans">PV Top-Right</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{(record as F5UniformityQCRecord).pvTopRight}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-sans">PV Bottom-Left</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{(record as F5UniformityQCRecord).pvBottomLeft}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-sans">PV Bottom-Right</div>
                          <div className="text-sm font-bold text-slate-800 mt-1">{(record as F5UniformityQCRecord).pvBottomRight}</div>
                        </div>
                      </div>

                      <table className="w-full text-left text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="p-3 border-r border-slate-300">พารามิเตอร์การประเมินความสม่ำเสมอ</th>
                            <th className="p-3 w-1/4 text-center">ค่าวิเคราะห์ทางรังสี</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-3 font-sans text-slate-700 font-medium border-r border-slate-300">
                              ความแตกต่างของพิกเซลสูงสุด 5 ปริมณฑล (Max PV Difference)
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-700 text-sm">
                              {(record as F5UniformityQCRecord).differencePercent}%
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-sans text-slate-700 font-medium border-r border-slate-300">
                              ตรวจพบสิ่งประดิษฐ์แปลกปลอม (Artifact Detection Check)
                            </td>
                            <td className={`p-3 text-center font-bold ${
                              (record as F5UniformityQCRecord).hasArtifacts === 'No' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {(record as F5UniformityQCRecord).hasArtifacts === 'No' ? '❌ ไม่พบ (No)' : '⚠️ พบสิ่งผิดปกติ (Yes)'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-sans text-slate-500 text-[10px] border-r border-slate-300 italic" colSpan={2}>
                              *สูตรประเมินคำนวณ: ((Max PV - Min PV) / Average PV) * 100% | เกณฑ์มาตรฐานควรรักษาไม่ให้เกิน 10%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Case 3: Clinical Image Quality */}
                {recordType === 'clinical' && (
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-3 border-r border-slate-300">เกณฑ์การพิจารณาภาพรังสีคลินิก (Clinical Evaluation Criteria)</th>
                        <th className="p-3 w-1/4 text-center">ผลการประเมิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {getClinicalResultDisplay(record as ImageQualityRecord).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-sans text-slate-700 font-medium border-r border-slate-300">{item.label}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              item.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'
                            }`}>
                              {item.status === 'Pass' ? '✅ ผ่าน (Pass)' : '❌ ตก (Fail)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Notes / Remarks section */}
              {record.notes && (
                <div className="mb-6 p-4 border border-indigo-100 rounded-xl bg-indigo-50/50 text-xs font-sans">
                  <div className="font-bold text-indigo-900 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>บันทึกเพิ่มเติมหรือคำแนะนำทางเทคนิค:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed pr-2">{record.notes}</p>
                </div>
              )}

              {/* Google Drive Test Pattern/Receptor Image embed section */}
              {record.driveImageUrl && (
                <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium block mb-2.5">ภาพประกอบการตรวจวัดคุณภาพจากโฟลเดอร์รังสี (Drive Attachment)</span>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={imageUrl}
                      alt="QC Test Profile"
                      className="w-48 h-auto object-contain rounded-lg border border-slate-200 bg-slate-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.warn("Direct Drive image rendering failed. Swapped to template outline.");
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-600 leading-normal">
                        ภาพวิเคราะห์ที่เชื่อมต่อตรงจาก Google Drive และเก็บบันทึกในฐานข้อมูลโรงพยาบาลรหัสเครื่องตรวจชิ้นนี้ 
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1 no-print">
                        <a
                          href={originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>เปิดดูไฟล์ภาพในแท็บใหม่ (Google Drive)</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall status badge in document */}
              <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 mb-8">
                <span className="font-bold text-slate-700 text-sm">บทสรุปประเมินคุณภาพภาพรวม (QC Certification Assessment):</span>
                <div className="flex items-center gap-2">
                  {record.status === 'Pass' ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full text-sm font-bold">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>ผ่านตามเกณฑ์มาตรฐาน (QC PASSED)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full text-sm font-bold">
                      <AlertTriangle className="w-4.5 h-4.5" />
                      <span>ตกเกณฑ์ / ดำเนินการแก้ไข (QC FAILED)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Signature Area (Signatures align perfectly at bottom of document) */}
            <div className="grid grid-cols-2 gap-12 text-center pt-8 border-t border-slate-200 mt-12">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 mb-9">ลงชื่อ................................................................... ผู้ทดสอบประเมิน</div>
                <div className="text-sm font-semibold text-slate-800">{record.inspectorName}</div>
                <div className="text-xs text-slate-500">{record.inspectorRole}</div>
                <div className="text-xs text-slate-500 font-mono">วันที่ตรวจ: {record.date}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500 mb-9 flex flex-col items-center">
                  <div className="w-40 border-b border-dotted border-slate-400 mt-1 pb-1 flex justify-center items-center">
                    {/* Simulated visual digital mark for Sittisak to deliver premium look on screen */}
                    <div className="text-[10px] text-emerald-600 font-bold border border-emerald-300 bg-emerald-50/50 rounded px-1 flex items-center gap-0.5 transform -rotate-2 -translate-y-1 font-sans">
                      <ShieldCheck className="w-2.5 h-2.5" /> Approved
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5">หัวหน้างานรังสีเทคนิค รับรองผลตรวจ</span>
                </div>
                <div className="text-sm font-semibold text-slate-800">สิทธิศักดิ์ เลาหกุล</div>
                <div className="text-xs text-slate-500">หัวหน้างานรังสีเทคนิค โรงพยาบาลแม่ทา</div>
                <div className="text-xs text-slate-400 font-mono">ลงรับการอนุมัติเข้าระบบ QC อัตโนมัติ</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
