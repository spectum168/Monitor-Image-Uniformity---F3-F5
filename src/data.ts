/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StaffMember, Equipment } from './types';

// Predefined inspectors/staff of division
export const INITIAL_STAFF: StaffMember[] = [
  { 
    name: 'สิทธิศักดิ์ เลาหกุล', 
    role: 'หัวหน้างานรังสีเทคนิค' 
  },
  { 
    name: 'ธีรพล เตจ๊ะเสาร์', 
    role: 'พนักงานการแพทย์และรังสี' 
  },
  { 
    name: 'สิทธิศักดิ์ เลาหกุล', 
    role: 'เจ้าพนักงานรังสีการแพทย์' 
  }
];

// Predefined list of equipment in Mae Tha Hospital
export const INITIAL_EQUIPMENT: Equipment[] = [
  // F3 Monitors
  {
    id: 'MONITOR-01',
    type: 'monitor',
    name: 'จอภาพรังสีแพทย์หลัก #1 (Main Diagnostic)',
    model: 'Barco Coronis MDCC-4430',
    serialNumber: 'SN-BARCO-1299A'
  },
  {
    id: 'MONITOR-02',
    type: 'monitor',
    name: 'จอภาพแผนกรังสีเทคนิค #2',
    model: 'Eizo RadiForce MX242W',
    serialNumber: 'SN-EIZO-33400B'
  },
  {
    id: 'MONITOR-03',
    type: 'monitor',
    name: 'จอภาพห้องทันตกรรม',
    model: 'Dell Professional P2421D',
    serialNumber: 'SN-DELL-55610D'
  },
  // F5 Plates
  {
    id: 'PLATE-02',
    type: 'plate',
    name: 'แผ่นรับสัญญาณเคลื่อนที่ DR Detector Plate #2',
    model: 'Carestream DRX-Plus 3543',
    serialNumber: 'DR-CARE-4428P'
  },
  // X-Ray Units
  {
    id: 'XRAY-01',
    type: 'xray_unit',
    name: 'เครื่องเอกซเรย์ห้องหลัก',
    model: 'Shimadzu RADspeed Pro',
    serialNumber: 'XM-SHIM-552'
  },
  {
    id: 'XRAY-02',
    type: 'xray_unit',
    name: 'เครื่องเอกซเรย์เคลื่อนย้าย (Portable)',
    model: 'Shimadzu MobileArt Evolution',
    serialNumber: 'XM-MOB-8821'
  },
  {
    id: 'XRAY-03',
    type: 'xray_unit',
    name: 'เครื่องเอกซเรย์ทันตกรรม',
    model: 'Belmont Phot-X II',
    serialNumber: 'XM-DENTAL-772'
  }
];

/**
 * Calculates Uniformity Pixel Value (PV) Difference Percent:
 * Difference (%) = ((PV_max - PV_min) / PV_average) * 100
 * Or: Max variation from center. Standard QC often calculates:
 * Max deviation: max(|PV_i - PV_center|) / PV_center * 100%
 * Or a 5-point formula:
 * Difference % = ( (PV_max - PV_min) / ((PV_center + PV_TL + PV_TR + PV_BL + PV_BR) / 5) ) * 100
 */
export function calculatePVUniformityDiff(
  center: number,
  tl: number,
  tr: number,
  bl: number,
  br: number
): {
  average: number;
  max: number;
  min: number;
  diffPercent: number;
} {
  const values = [center, tl, tr, bl, br];
  const total = values.reduce((sum, v) => sum + v, 0);
  const average = total / 5;
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // To avoid divide-by-zero
  if (average === 0) {
    return { average: 0, max: 0, min: 0, diffPercent: 0 };
  }
  
  // Uniformity Diff (%) = ((Max PV - Min PV) / Average PV) * 100
  const diffPercent = ((max - min) / average) * 100;
  
  return {
    average: parseFloat(average.toFixed(2)),
    max,
    min,
    diffPercent: parseFloat(diffPercent.toFixed(2))
  };
}

/**
 * Default TG18-QC guidelines explanation
 */
export const TG18_QC_EXPLANATION = {
  distortion: 'ตรวจวัดพยาธิสภาพความบิดเบี้ยวของเส้นตารางในรูปภาพแบบฟอร์ม TG18-QC (ต้องไม่โค้งงอ)',
  luminance: 'ตรวจสอบแถบความสว่างสีดำ-ขาวขั้นบันได (ตาราง 5% และ 95% ต้องเห็นแยกแยะกันชัดเจน)',
  resolution: 'ตรวจสอบความคมชัดลวดลายแถบความถี่ตรงมุมและกึ่งกลางรูป (ลายเส้นเล็กยาวต้องยังเห็นแยกเป็นเส้นๆ ไม่ละลายรวมกัน)',
  artifacts: 'การวิเคราะห์สิ่งแปลกปลอมบนหน้าจอ เช่น ฝุ่น จุดสี จุดด่างดำพิกเซลตาย (ต้องไม่มีสิ่งแปลกปลอมกวนสายตา)',
  uniformity: 'ตรวจสอบความบริสุทธิ์ของหน้าจอสีขาว-เทา เรียบเนียนเสมอกันทั่วทั้งจอ (ต้องไม่มีการเปลี่ยนโทนสีหรือสว่างวาบบางจุด)'
};
