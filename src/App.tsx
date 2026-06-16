/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  StaffMember, 
  Equipment, 
  F3MonitorQCRecord, 
  F5UniformityQCRecord, 
  ImageQualityRecord 
} from './types';
import { 
  INITIAL_STAFF, 
  INITIAL_EQUIPMENT 
} from './data';
// No more firebase or googleSheets sync library imports needed for client-only offline use


// Component imports
import Dashboard from './components/Dashboard';
import F3MonitorQC from './components/F3MonitorQC';
import F5UniformityQC from './components/F5UniformityQC';
import ClinicalImageQuality from './components/ClinicalImageQuality';
import EquipmentManager from './components/EquipmentManager';
import PreviewReportModal from './components/PreviewReportModal';
import ConsolidatedReport from './components/ConsolidatedReport';

// Icons
import { 
  Activity, 
  LayoutDashboard, 
  Monitor, 
  CreditCard, 
  Radio, 
  ShieldAlert, 
  FolderSync, 
  LogOut, 
  Wrench,
  ClipboardCheck
} from 'lucide-react';

export default function App() {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Roster lists (initialized with defaults or loaded from local storage)
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => {
    const local = localStorage.getItem('mth_equipment');
    if (local) {
      try {
        const parsed: Equipment[] = JSON.parse(local);
        // Clean up / upgrade logic
        // 1. Remove PLATE-01 (CR Plate)
        let updated = parsed.filter(e => e.id !== 'PLATE-01' && !e.name.includes('CR Plate') && !e.name.includes('แผ่นรับสัญญาณกระดูกและทรวงอก CR'));
        
        // 2. Perform renames
        updated = updated.map(e => {
          if (e.id === 'MONITOR-02' && (e.name.includes('จอภาพห้องบึกบันทึกและตรวจสอบภาพ') || e.name === 'จอภาพห้องบึกบันทึกและตรวจสอบภาพ #2')) {
            return { ...e, name: 'จอภาพแผนกรังสีเทคนิค #2' };
          }
          if (e.id === 'XRAY-01' && (e.name.includes('General Room 1') || e.name === 'เครื่องเอกซเรย์ทั่วไปห้องที่ 1 (General Room 1)' || e.name === 'เครื่องเอกซเรย์ทั่วไปห้องที่ 1')) {
            return { ...e, name: 'เครื่องเอกซเรย์ห้องหลัก' };
          }
          if (e.id === 'XRAY-02' && (e.name.includes('เคลื่อนที่เตียงผู้ป่วย') || e.name === 'เครื่องเอกซเรย์เคลื่อนที่เตียงผู้ป่วย (Mobile Room)' || e.name === 'เครื่องเอกซเรย์Portable' || e.name === 'เครื่องเอกซเรย์เคลื่อนที่เตียงผู้ป่วย')) {
            return { ...e, name: 'เครื่องเอกซเรย์เคลื่อนย้าย (Portable)' };
          }
          return e;
        });

        // 3. Ensure standard X-ray units exist (Bring back deleted)
        if (!updated.some(e => e.id === 'XRAY-01')) {
          updated.push({
            id: 'XRAY-01',
            type: 'xray_unit',
            name: 'เครื่องเอกซเรย์ห้องหลัก',
            model: 'Shimadzu RADspeed Pro',
            serialNumber: 'XM-SHIM-552'
          });
        }
        if (!updated.some(e => e.id === 'XRAY-02')) {
          updated.push({
            id: 'XRAY-02',
            type: 'xray_unit',
            name: 'เครื่องเอกซเรย์เคลื่อนย้าย (Portable)',
            model: 'Shimadzu MobileArt Evolution',
            serialNumber: 'XM-MOB-8821'
          });
        }

        // 4. Ensure new dental equipment exists
        if (!updated.some(e => e.id === 'MONITOR-03' || e.name === 'จอภาพห้องทันตกรรม')) {
          updated.push({
            id: 'MONITOR-03',
            type: 'monitor',
            name: 'จอภาพห้องทันตกรรม',
            model: 'Dell Professional P2421D',
            serialNumber: 'SN-DELL-55610D'
          });
        }
        if (!updated.some(e => e.id === 'XRAY-03' || e.name === 'เครื่องเอกซเรย์ทันตกรรม')) {
          updated.push({
            id: 'XRAY-03',
            type: 'xray_unit',
            name: 'เครื่องเอกซเรย์ทันตกรรม',
            model: 'Belmont Phot-X II',
            serialNumber: 'XM-DENTAL-772'
          });
        }
        return updated;
      } catch (err) {
        return INITIAL_EQUIPMENT;
      }
    }
    return INITIAL_EQUIPMENT;
  });
  
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(INITIAL_STAFF[0]);

  // QC History Records Logs State (with local storage caching for offline robust use)
  const [f3Records, setF3Records] = useState<F3MonitorQCRecord[]>(() => {
    const local = localStorage.getItem('mth_f3_records');
    return local ? JSON.parse(local) : [];
  });
  const [f5Records, setF5Records] = useState<F5UniformityQCRecord[]>(() => {
    const local = localStorage.getItem('mth_f5_records');
    return local ? JSON.parse(local) : [];
  });
  const [clinicalRecords, setClinicalRecords] = useState<ImageQualityRecord[]>(() => {
    const local = localStorage.getItem('mth_clinical_records');
    return local ? JSON.parse(local) : [];
  });

  // Report Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewType, setPreviewType] = useState<'F3' | 'F5' | 'clinical'>('F3');
  const [selectedPreviewRecord, setSelectedPreviewRecord] = useState<any | null>(null);

  // Sync state changes back to local storage
  useEffect(() => {
    localStorage.setItem('mth_equipment', JSON.stringify(equipmentList));
  }, [equipmentList]);

  useEffect(() => {
    localStorage.setItem('mth_f3_records', JSON.stringify(f3Records));
  }, [f3Records]);

  useEffect(() => {
    localStorage.setItem('mth_f5_records', JSON.stringify(f5Records));
  }, [f5Records]);

  useEffect(() => {
    localStorage.setItem('mth_clinical_records', JSON.stringify(clinicalRecords));
  }, [clinicalRecords]);

  // Add equipment (with local state and local storage save)
  const handleAddEquipment = (eq: Equipment) => {
    setEquipmentList(prev => [...prev, eq]);
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipmentList(prev => prev.filter(e => e.id !== id));
  };

  const handleRestoreDefaults = () => {
    setEquipmentList(prev => {
      const map = new Map<string, Equipment>();
      prev.forEach(e => map.set(e.id, e));
      
      INITIAL_EQUIPMENT.forEach(e => {
        map.set(e.id, e);
      });
      
      return Array.from(map.values());
    });
  };

  // Quick inline device creator helpers
  const handleQuickAddEquipment = (type: 'monitor' | 'plate' | 'xray_unit', name: string, model: string) => {
    const newId = `${type.toUpperCase()}-${Date.now()}`;
    const newEq: Equipment = {
      id: newId,
      type,
      name,
      model,
    };
    handleAddEquipment(newEq);
  };

  // Record submissions
  const handleAddF3Record = async (record: F3MonitorQCRecord) => {
    setF3Records(prev => [record, ...prev]);
  };

  const handleAddF5Record = async (record: F5UniformityQCRecord) => {
    setF5Records(prev => [record, ...prev]);
  };

  const handleAddClinicalRecord = async (record: ImageQualityRecord) => {
    setClinicalRecords(prev => [record, ...prev]);
  };

  // Record deletions
  const handleDeleteF3Record = (id: string) => {
    setF3Records(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteF5Record = (id: string) => {
    setF5Records(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteClinicalRecord = (id: string) => {
    setClinicalRecords(prev => prev.filter(r => r.id !== id));
  };

  // Handle open Report preview
  const handleOpenReportPreview = (record: any) => {
    let type: 'F3' | 'F5' | 'clinical' = 'F3';
    if (record.id.startsWith('F5-')) type = 'F5';
    else if (record.id.startsWith('CI-')) type = 'clinical';
    
    setPreviewType(type);
    setSelectedPreviewRecord(record);
    setPreviewModalOpen(true);
  };

  // Extract selected equipment for preview report details
  const getSelectedPreviewEquipment = () => {
    if (!selectedPreviewRecord) return null;
    return equipmentList.find(e => e.id === selectedPreviewRecord.equipmentId) || null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-shell">

      {/* Main Structural Navbar Header */}
      <header className="bg-white border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-600/35 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                <span>Hospital Diagnostic QA Platform</span>
              </div>
              <h1 className="text-lg font-bold font-sans text-slate-900 leading-tight">ฝ่ายรังสีเทคนิค โรงพยาบาลแม่ทา</h1>
            </div>
          </div>

          {/* Nav / Tabs selectors */}
          <nav className="flex flex-wrap items-center gap-1.5 md:ml-6" id="app-nav-container">
            {[
              { id: 'dashboard', label: 'แดชบอร์ด', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
              { id: 'F3', label: 'Monitor QC (F3)', icon: <Monitor className="w-3.5 h-3.5" /> },
              { id: 'F5', label: 'Dark Noise (F5)', icon: <CreditCard className="w-3.5 h-3.5" /> },
              { id: 'clinical', label: 'วิเคราะห์ภาพภาพ', icon: <Radio className="w-3.5 h-3.5" /> },
              { id: 'all-reports', label: 'รายงานรวมทั้งหมด', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
              { id: 'equipment', label: 'เครื่องมือรังสี', icon: <Wrench className="w-3.5 h-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                id={`nav-${tab.id}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Offline Mode Badge */}
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-1.5 rounded-2xl text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Offline Local Database Active</span>
            </div>
          </div>

        </div>
      </header>

      {/* Primary Content Chassis Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            f3Records={f3Records}
            f5Records={f5Records}
            clinicalRecords={clinicalRecords}
            equipmentList={equipmentList}
            staffList={staffList}
            selectedStaff={selectedStaff}
            onSelectStaff={setSelectedStaff}
            googleToken={null}
            onGoogleLogin={() => {}}
            onGoogleLogout={() => {}}
            syncInProgress={false}
            onFullSync={() => {}}
            onNavigateTab={setActiveTab}
            onDeleteF3={handleDeleteF3Record}
            onDeleteF5={handleDeleteF5Record}
            onDeleteClinical={handleDeleteClinicalRecord}
            onOpenReportPreview={handleOpenReportPreview}
          />
        )}

        {activeTab === 'F3' && (
          <F3MonitorQC
            monitors={equipmentList.filter(e => e.type === 'monitor')}
            staffList={staffList}
            selectedStaff={selectedStaff}
            records={f3Records}
            onAddRecord={handleAddF3Record}
            onOpenReportPreview={handleOpenReportPreview}
            onQuickAddMonitor={(name, model) => handleQuickAddEquipment('monitor', name, model)}
            onDeleteRecord={handleDeleteF3Record}
            googleToken={null}
          />
        )}

        {activeTab === 'F5' && (
          <F5UniformityQC
            plates={equipmentList.filter(e => e.type === 'plate')}
            staffList={staffList}
            selectedStaff={selectedStaff}
            records={f5Records}
            onAddRecord={handleAddF5Record}
            onOpenReportPreview={handleOpenReportPreview}
            onQuickAddPlate={(name, model) => handleQuickAddEquipment('plate', name, model)}
            onDeleteRecord={handleDeleteF5Record}
            googleToken={null}
          />
        )}

        {activeTab === 'clinical' && (
          <ClinicalImageQuality
            xrayUnits={equipmentList.filter(e => e.type === 'xray_unit')}
            staffList={staffList}
            selectedStaff={selectedStaff}
            records={clinicalRecords}
            onAddRecord={handleAddClinicalRecord}
            onOpenReportPreview={handleOpenReportPreview}
            onQuickAddXray={(name, model) => handleQuickAddEquipment('xray_unit', name, model)}
            googleToken={null}
            onDeleteRecord={handleDeleteClinicalRecord}
          />
        )}

        {activeTab === 'all-reports' && (
          <ConsolidatedReport
            f3Records={f3Records}
            f5Records={f5Records}
            clinicalRecords={clinicalRecords}
            equipmentList={equipmentList}
            onDeleteF3={handleDeleteF3Record}
            onDeleteF5={handleDeleteF5Record}
            onDeleteClinical={handleDeleteClinicalRecord}
            onOpenReportPreview={handleOpenReportPreview}
          />
        )}

        {activeTab === 'equipment' && (
          <EquipmentManager
            equipmentList={equipmentList}
            onAddEquipment={handleAddEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onRestoreDefaults={handleRestoreDefaults}
          />
        )}

      </main>

      {/* Official Certificate Report View Modal */}
      <PreviewReportModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        recordType={previewType}
        record={selectedPreviewRecord}
        selectedEquipment={getSelectedPreviewEquipment()}
      />

      {/* Minimal Aesthetic Margin System credit lines */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 font-sans gap-2.5">
          <p>&copy; 2026 ฝ่ายรังสีเทคนิค โรงพยาบาลแม่ทา. พัฒนาและให้บริการตรวจสอบเพื่อความปลอดภัยของผู้ใช้รังสี.</p>
          <p className="font-mono">Local-first client storage secured</p>
        </div>
      </footer>

    </div>
  );
}
