/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Equipment, EquipmentType } from '../types';
import { Monitor, CreditCard, Radio, Plus, Layers, Trash2 } from 'lucide-react';

interface EquipmentManagerProps {
  equipmentList: Equipment[];
  onAddEquipment: (eq: Equipment) => void;
  onDeleteEquipment?: (id: string) => void;
  onRestoreDefaults?: () => void;
}

export default function EquipmentManager({
  equipmentList,
  onAddEquipment,
  onDeleteEquipment,
  onRestoreDefaults
}: EquipmentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>('monitor');
  const [model, setModel] = useState('');
  const [sn, setSn] = useState('');
  const [errorCode, setErrorCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorCode('กรุณากรอกชื่ออุปกรณ์');
      return;
    }
    if (!model.trim()) {
      setErrorCode('กรุณากรอกรุ่น/โมเดล');
      return;
    }

    const newId = `${type.toUpperCase()}-${Date.now()}`;
    const newEq: Equipment = {
      id: newId,
      type,
      name: name.trim(),
      model: model.trim(),
      serialNumber: sn.trim() || undefined
    };

    onAddEquipment(newEq);
    
    // Reset form
    setName('');
    setModel('');
    setSn('');
    setErrorCode('');
    setIsOpen(false);
  };

  const getIcon = (eqType: EquipmentType) => {
    switch (eqType) {
      case 'monitor': return <Monitor className="w-5 h-5 text-indigo-500" />;
      case 'plate': return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case 'xray_unit': return <Radio className="w-5 h-5 text-amber-500" />;
    }
  };

  const typeLabels: Record<EquipmentType, string> = {
    monitor: 'จอภาพ (F3)',
    plate: 'แผ่นรับสัญญาณ (F5)',
    xray_unit: 'เครื่องถ่ายสำมะโนรังสี (Clinical Quality)'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="equipment-manager">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-sans font-medium text-slate-900 text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-500" />
            รายชื่อเครื่องมือรังสีแพทย์ ({equipmentList.length} รายการ)
          </h3>
          <p className="font-sans text-xs text-slate-500 mt-1">
            อุปกรณ์และชุดรับภาพสำหรับงานตรวจสอบ QC ประจำโรงพยาบาลแม่ทา
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {onRestoreDefaults && (
            <button
              onClick={onRestoreDefaults}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-sans font-semibold border border-rose-100 transition cursor-pointer select-none"
              title="กู้คืนรายการเครื่องเอกซเรย์ห้องหลัก และเครื่องเอกซเรย์เคลื่อนย้าย (Portable) หากคุณเผลอลบทิ้ง"
              id="btn-restore-defaults"
            >
              <span>♻️ กู้คืนเครื่องเอกซเรย์ห้องหลัก/Portable ที่เผลอลบ</span>
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-sans font-medium transition cursor-pointer"
            id="btn-add-unit"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มอุปกรณ์</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-sans font-medium text-slate-800 text-sm">บันทึกเครื่องมือหรือชุดตรวจเพิ่มชิ้นใหม่</h4>
            
            {errorCode && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-sans">
                {errorCode}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-sans text-slate-500 mb-1.5 font-medium">ประเภทอุปกรณ์</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EquipmentType)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="monitor">🖥️ จอภาพ (TG18-QC)</option>
                  <option value="plate">📥 แผ่นรับสัญญาณ (Receptor Plate)</option>
                  <option value="xray_unit">☢️ เครื่องรังสีเอกซเรย์ทั่วไป</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-sans text-slate-500 mb-1.5 font-medium">ชื่ออุปกรณ์ที่ใช้เรียก</label>
                <input
                  type="text"
                  placeholder="เช่น จอประมวลผลแพทย์ #3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-sans text-slate-500 mb-1.5 font-medium">รุ่น (Model)</label>
                <input
                  type="text"
                  placeholder="เช่น Eizo RadiForce"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-sans text-slate-500 mb-1.5 font-medium">รหัสเครื่อง (Serial Number)</label>
                <input
                  type="text"
                  placeholder="เช่น SN-88301"
                  value={sn}
                  onChange={(e) => setSn(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-sans font-medium transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-sans font-medium transition cursor-pointer"
              >
                บันทึกอุปกรณ์
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-medium">
              <th className="p-4 font-sans text-xs">ประเภท</th>
              <th className="p-4 font-sans text-xs">รหัสอุปกรณ์</th>
              <th className="p-4 font-sans text-xs">ชื่อและแบรนด์เครื่องตรวจ</th>
              <th className="p-4 font-sans text-xs">รุ่น (Model)</th>
              <th className="p-4 font-sans text-xs">Serial Number</th>
              {onDeleteEquipment && <th className="p-4 font-sans text-xs text-right">จัดการ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipmentList.map((eq) => (
              <tr key={eq.id} className="hover:bg-slate-50/40 transition">
                <td className="p-4 flex items-center gap-2.5 font-sans">
                  {getIcon(eq.type)}
                  <span className="font-medium text-slate-700">{typeLabels[eq.type]}</span>
                </td>
                <td className="p-4 font-mono text-slate-500 text-xs">{eq.id}</td>
                <td className="p-4 font-sans text-slate-800 font-medium">{eq.name}</td>
                <td className="p-4 font-sans text-slate-600">{eq.model}</td>
                <td className="p-4 font-mono text-slate-500 text-xs">{eq.serialNumber || '-'}</td>
                {onDeleteEquipment && (
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onDeleteEquipment(eq.id)}
                      className="p-1 px-2.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 transition cursor-pointer"
                      title="ลบตัวเครื่องมือ"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
