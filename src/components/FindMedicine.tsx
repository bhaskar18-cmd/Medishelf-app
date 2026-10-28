/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Medicine, StockBatch } from '../db/db';
import { Search, MapPin, Scan, Pill, AlertCircle, ExternalLink, Package } from 'lucide-react';

interface FindMedicineProps {
  onSelectShowOnMap: (shelfId: string, mapId: number | null) => void;
  onOpenScanner: (mode: 'medicine' | 'shelf') => void;
}

export const FindMedicine: React.FC<FindMedicineProps> = ({ onSelectShowOnMap, onOpenScanner }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const shelves = useLiveQuery(() => db.shelves.toArray(), []) || [];

  const filteredMedicines = medicines.filter((m) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      m.brandName.toLowerCase().includes(term) ||
      m.genericName.toLowerCase().includes(term) ||
      m.strength.toLowerCase().includes(term) ||
      m.manufacturer.toLowerCase().includes(term) ||
      m.barcode.toLowerCase().includes(term)
    );
  });

  const handleShowOnMap = async (shelfId: string) => {
    const marker = await db.mapMarkers.where('shelfId').equals(shelfId).first();
    onSelectShowOnMap(shelfId, marker ? marker.mapId : null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Find Medicine</h1>
          <p className="text-slate-500 text-sm">Search by brand, generic name, strength, or barcode.</p>
        </div>
        <button
          onClick={() => onOpenScanner('medicine')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Scan className="w-4 h-4" /> Scan Barcode
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search Paracetamol 500mg, Amoxicillin, barcode, etc..."
          className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-xs"
        />
      </div>

      {/* Medicines List */}
      {filteredMedicines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">Medicine not found in local inventory</h3>
          <p className="text-xs text-slate-500">Try searching with a different name, keyword, or barcode.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedicines.map((med) => {
            const medBatches = batches.filter((b) => b.medicineId === med.id);
            const totalQty = medBatches.reduce((sum, b) => sum + b.quantity, 0);

            // Group by shelf
            const shelfMap = new Map<string, StockBatch[]>();
            medBatches.forEach((b) => {
              const list = shelfMap.get(b.shelfId) || [];
              list.push(b);
              shelfMap.set(b.shelfId, list);
            });

            return (
              <div key={med.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                        {med.dosageForm}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">
                        {med.brandName} <span className="font-normal text-slate-600 text-sm">{med.strength}</span>
                      </h3>
                      <p className="text-xs text-slate-500">Generic: {med.genericName} • Mfr: {med.manufacturer}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-extrabold text-slate-900 block">{totalQty}</span>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">Total Available</span>
                    </div>
                  </div>

                  {/* Shelf Locations */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">Shelf Locations & Batches:</span>
                    {shelfMap.size === 0 ? (
                      <p className="text-xs text-slate-400 italic">No stock batches recorded currently.</p>
                    ) : (
                      Array.from(shelfMap.entries()).map(([shelfId, sBatches]) => {
                        const shelfObj = shelves.find((s) => s.id === shelfId);
                        const shelfQty = sBatches.reduce((sum, b) => sum + b.quantity, 0);
                        return (
                          <div key={shelfId} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900">{shelfId}</span>
                                <span className="text-slate-500 ml-1">({shelfObj?.areaCode || 'Area'})</span>
                                <p className="text-slate-500 text-[11px]">{shelfObj?.description || ''}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 block">{shelfQty} units</span>
                              <button
                                onClick={() => handleShowOnMap(shelfId)}
                                className="text-teal-700 hover:text-teal-800 font-semibold text-[11px] flex items-center gap-1 mt-0.5"
                              >
                                Show on Map <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Barcode: {med.barcode || 'N/A'}</span>
                  <span>Batches: {medBatches.length} active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
