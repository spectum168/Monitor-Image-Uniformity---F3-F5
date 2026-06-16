/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  F3MonitorQCRecord, 
  F5UniformityQCRecord, 
  ImageQualityRecord, 
  GoogleDriveFile 
} from '../types';

export const SPREADSHEET_ID = '1_FkpfAnw8PKHbbqaqhAQI9y4UYoIxU10gL0BU8XVfVo';
export const DRIVE_FOLDER_ID = '1VRMs-lCzN7ncsJV-8Nkmecg40Sn3-1vC';

/**
 * Extracts Google Drive file ID from standard sharing/view links.
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // Match structure: /d/FILE_ID/
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];
  
  // Match structure: id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  
  // Clean ID if input was just the ID
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(url.trim())) {
    return url.trim();
  }
  return null;
}

/**
 * Formats a Google Drive File ID into an embeddable direct photo display URL.
 */
export function getDriveDirectImageUrl(urlOrId: string): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId; // fallback to original input if we can't parse it
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Formats Google Drive file ID into original view URL
 */
export function getDriveOriginalUrl(urlOrId: string): string {
  const fileId = extractDriveFileId(urlOrId);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

/**
 * Helper to fetch with Bearer token
 */
async function apiCall(url: string, token: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`API Call failed to URL ${url}:`, errText);
    throw new Error(`Google API returned status ${response.status}: ${errText}`);
  }
  return response.json();
}

/**
 * Initialize Sheets (creates the sub-sheets if they do not exist)
 */
export async function initializeSheetsStructure(token: string): Promise<void> {
  try {
    // 1. Check existing sheet metadata
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const ssMetadata = await apiCall(metadataUrl, token);
    const existingSheets: string[] = ssMetadata.sheets.map((s: any) => s.properties.title);
    
    const requiredSheets = ['F3_MonitorQC', 'F5_UniformityQC', 'ImageQuality'];
    const sheetsToAdd = requiredSheets.filter(title => !existingSheets.includes(title));
    
    if (sheetsToAdd.length > 0) {
      const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
      const requests = sheetsToAdd.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));
      
      await apiCall(batchUpdateUrl, token, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
      
      // Add row headers for each newly created sheet
      for (const sheetTitle of sheetsToAdd) {
        let headers: string[] = [];
        if (sheetTitle === 'F3_MonitorQC') {
          headers = ["ID", "Test Date", "Inspector Name", "Inspector Role", "Equipment ID", "Geometric Distortion", "Luminance", "Resolution", "Artifacts", "Uniformity", "Notes", "Drive Image URL", "Overall Status"];
        } else if (sheetTitle === 'F5_UniformityQC') {
          headers = ["ID", "Test Date", "Inspector Name", "Inspector Role", "Plate ID", "PV Center", "PV Top-Left", "PV Top-Right", "PV Bottom-Left", "PV Bottom-Right", "Difference (%)", "Has Artifacts", "Notes", "Drive Image URL", "Overall Status"];
        } else if (sheetTitle === 'ImageQuality') {
          headers = ["ID", "Test Date", "Inspector Name", "Inspector Role", "Equipment ID", "Positioning", "Exposure", "Sharpness", "Markers", "Notes", "Drive Image URL", "Overall Status"];
        }
        
        const updateHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetTitle}!A1:M1?valueInputOption=USER_ENTERED`;
        await apiCall(updateHeadersUrl, token, {
          method: 'PUT',
          body: JSON.stringify({
            range: `${sheetTitle}!A1:M1`,
            majorDimension: 'ROWS',
            values: [headers]
          })
        });
      }
    }
  } catch (err) {
    console.error("Sheets initialization error. If range is already written or permissions issues, it skips: ", err);
  }
}

/**
 * Fetch F3 records
 */
export async function syncFetchF3Records(token: string): Promise<F3MonitorQCRecord[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/F3_MonitorQC!A2:M1000`;
    const data = await apiCall(url, token);
    if (!data.values) return [];
    
    return data.values.map((row: any[]): F3MonitorQCRecord => ({
      id: row[0] || '',
      date: row[1] || '',
      inspectorName: row[2] || '',
      inspectorRole: row[3] || 'เจ้าพนักงานรังสีการแพทย์',
      equipmentId: row[4] || '',
      distortion: row[5] || 'Fail',
      luminance: row[6] || 'Fail',
      resolution: row[7] || 'Fail',
      artifacts: row[8] || 'Fail',
      uniformity: row[9] || 'Fail',
      notes: row[10] || '',
      driveImageUrl: row[11] || '',
      status: row[12] === 'Pass' ? 'Pass' : 'Fail'
    }));
  } catch (err) {
    console.warn("Could not fetch F3 from Sheets. Standard fallback will be used.", err);
    throw err;
  }
}

/**
 * Append F3 Record
 */
export async function syncAppendF3Record(token: string, record: F3MonitorQCRecord): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/F3_MonitorQC!A:M:append?valueInputOption=USER_ENTERED`;
  const values = [
    [
      record.id,
      record.date,
      record.inspectorName,
      record.inspectorRole,
      record.equipmentId,
      record.distortion,
      record.luminance,
      record.resolution,
      record.artifacts,
      record.uniformity,
      record.notes,
      record.driveImageUrl,
      record.status
    ]
  ];
  await apiCall(url, token, {
    method: 'POST',
    body: JSON.stringify({
      range: 'F3_MonitorQC!A:M',
      majorDimension: 'ROWS',
      values
    })
  });
}

/**
 * Fetch F5 records
 */
export async function syncFetchF5Records(token: string): Promise<F5UniformityQCRecord[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/F5_UniformityQC!A2:O1000`;
    const data = await apiCall(url, token);
    if (!data.values) return [];
    
    return data.values.map((row: any[]): F5UniformityQCRecord => ({
      id: row[0] || '',
      date: row[1] || '',
      inspectorName: row[2] || '',
      inspectorRole: row[3] || 'เจ้าพนักงานรังสีการแพทย์',
      equipmentId: row[4] || '',
      pvCenter: Number(row[5]) || 0,
      pvTopLeft: Number(row[6]) || 0,
      pvTopRight: Number(row[7]) || 0,
      pvBottomLeft: Number(row[8]) || 0,
      pvBottomRight: Number(row[9]) || 0,
      differencePercent: Number(row[10]) || 0,
      hasArtifacts: row[11] === 'Yes' ? 'Yes' : 'No',
      notes: row[12] || '',
      driveImageUrl: row[13] || '',
      status: row[14] === 'Pass' ? 'Pass' : 'Fail'
    }));
  } catch (err) {
    console.warn("Could not fetch F5 from Sheets. Standard fallback will be used.", err);
    throw err;
  }
}

/**
 * Append F5 Record
 */
export async function syncAppendF5Record(token: string, record: F5UniformityQCRecord): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/F5_UniformityQC!A:O:append?valueInputOption=USER_ENTERED`;
  const values = [
    [
      record.id,
      record.date,
      record.inspectorName,
      record.inspectorRole,
      record.equipmentId,
      record.pvCenter,
      record.pvTopLeft,
      record.pvTopRight,
      record.pvBottomLeft,
      record.pvBottomRight,
      record.differencePercent,
      record.hasArtifacts,
      record.notes,
      record.driveImageUrl,
      record.status
    ]
  ];
  await apiCall(url, token, {
    method: 'POST',
    body: JSON.stringify({
      range: 'F5_UniformityQC!A:O',
      majorDimension: 'ROWS',
      values
    })
  });
}

/**
 * Fetch Image Quality records
 */
export async function syncFetchImageQualityRecords(token: string): Promise<ImageQualityRecord[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/ImageQuality!A2:L1000`;
    const data = await apiCall(url, token);
    if (!data.values) return [];
    
    return data.values.map((row: any[]): ImageQualityRecord => ({
      id: row[0] || '',
      date: row[1] || '',
      inspectorName: row[2] || '',
      inspectorRole: row[3] || 'เจ้าพนักงานรังสีการแพทย์',
      equipmentId: row[4] || '',
      positioning: row[5] || 'Fail',
      exposure: row[6] || 'Fail',
      sharpness: row[7] || 'Fail',
      markers: row[8] || 'Fail',
      notes: row[9] || '',
      driveImageUrl: row[10] || '',
      status: row[11] === 'Pass' ? 'Pass' : 'Fail'
    }));
  } catch (err) {
    console.warn("Could not fetch Image Quality from Sheets. Standard fallback will be used.", err);
    throw err;
  }
}

/**
 * Append Image Quality Record
 */
export async function syncAppendImageQualityRecord(token: string, record: ImageQualityRecord): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/ImageQuality!A:L:append?valueInputOption=USER_ENTERED`;
  const values = [
    [
      record.id,
      record.date,
      record.inspectorName,
      record.inspectorRole,
      record.equipmentId,
      record.positioning,
      record.exposure,
      record.sharpness,
      record.markers,
      record.notes,
      record.driveImageUrl,
      record.status
    ]
  ];
  await apiCall(url, token, {
    method: 'POST',
    body: JSON.stringify({
      range: 'ImageQuality!A:L',
      majorDimension: 'ROWS',
      values
    })
  });
}

/**
 * Google Drive: List files in QC folder
 */
export async function listDriveQcImages(token: string): Promise<GoogleDriveFile[]> {
  try {
    const query = encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType starts with 'image/'`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink)&orderBy=createdTime%20desc`;
    const data = await apiCall(url, token);
    return data.files || [];
  } catch (err) {
    console.error("Could not fetch images from Google Drive folder", err);
    return [];
  }
}

/**
 * Google Drive: Upload photo directly
 */
export async function uploadQcImageToDrive(
  token: string, 
  file: File
): Promise<GoogleDriveFile> {
  const metadata = {
    name: `QC_${Date.now()}_${file.name}`,
    parents: [DRIVE_FOLDER_ID],
    mimeType: file.type
  };

  const form = new FormData();
  form.append(
    'metadata', 
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to upload image to Google Drive", errText);
    throw new Error(`Upload failed: ${errText}`);
  }

  return response.json();
}

/**
 * Google Drive: Delete photo
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Failed to delete file ${fileId} from Google Drive:`, errText);
    throw new Error(`Delete failed: ${errText}`);
  }
}

