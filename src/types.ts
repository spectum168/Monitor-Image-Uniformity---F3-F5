/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StaffRole = 
  | 'หัวหน้างานรังสีเทคนิค' // Chief of Radiology
  | 'เจ้าพนักงานรังสีการแพทย์' // Radiographer
  | 'พนักงานการแพทย์และรังสี'; // Radiology Assistant

export interface StaffMember {
  name: string;
  role: StaffRole;
}

export type EquipmentType = 'monitor' | 'plate' | 'xray_unit';

export interface Equipment {
  id: string;
  type: EquipmentType;
  name: string;
  model: string;
  serialNumber?: string;
}

export interface F3MonitorQCRecord {
  id: string;
  date: string;
  inspectorName: string;
  inspectorRole: StaffRole;
  equipmentId: string; // Monitor ID
  distortion: 'Pass' | 'Fail';
  luminance: 'Pass' | 'Fail';
  resolution: 'Pass' | 'Fail';
  artifacts: 'Pass' | 'Fail';
  uniformity: 'Pass' | 'Fail';
  notes: string;
  driveImageUrl: string;
  status: 'Pass' | 'Fail';
}

export interface DarkNoiseRow {
  fpdNo: string;
  fpdSize: string;
  id: string;
  ei: string;
  ddi: string;
  pixelMean: string;
}

export interface F5UniformityQCRecord {
  id: string;
  date: string;
  inspectorName: string;
  inspectorRole: StaffRole;
  equipmentId: string; // Plate ID
  pvCenter: number;
  pvTopLeft: number;
  pvTopRight: number;
  pvBottomLeft: number;
  pvBottomRight: number;
  differencePercent: number; // Calculated difference %
  hasArtifacts: 'Yes' | 'No';
  notes: string;
  driveImageUrl: string;
  status: 'Pass' | 'Fail';
  darkNoiseRows?: DarkNoiseRow[];
}

export interface ImageQualityRecord {
  id: string;
  date: string;
  inspectorName: string;
  inspectorRole: StaffRole;
  equipmentId: string; // X-Ray Unit ID
  positioning: 'Pass' | 'Fail';
  exposure: 'Pass' | 'Fail';
  sharpness: 'Pass' | 'Fail';
  markers: 'Pass' | 'Fail';
  notes: string;
  driveImageUrl: string;
  status: 'Pass' | 'Fail';
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}
