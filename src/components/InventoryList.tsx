/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Medicine, StockBatch } from '../db/db';
import { Database, Pill, Trash2, Edit3, MapPin, Search } from 'lucide-react';

export const InventoryList: React.FC = () => {
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const shelves = useLiveQuery(() => db.shelves.toArray(), []) || [];

  const [searchTerm, setSearchTerm] = useState('');

  // In-app confirmation states
  const [medToDelete, setMedToDelete] = useState<{ id: number; name: string } | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<{ id: number; number: string } | null>(null);
  const [diagnosticMsg, setDiagnosticMsg] = useState<string>('');

  const filteredMeds = medicines.filter((m) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return m.brandName.toLowerCase().includes(term) || m.genericName.toLowerCase().includes(term) || m.barcode.toLowerCase().includes(term);
  });

  const confirmDeleteMedicine = async () => {
    if (!medToDelete) return;
    setDiagnosticMsg('Storage operation started: Deleting medicine...');
    try {
      await db.transaction('rw', [db.medicines, db.batches], async () => {
        await db.medicines.delete(medToDelete.id);
        await db.batches.where('medicineId').equals(medToDelete.id).delete();
      });
      setDiagnosticMsg('Storage operation succeeded: Medicine deleted.');
      setMedToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete medicine:', err);
      setDiagnosticMsg(`Storage operation failed: ${err.message || err}`);
    }
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    setDiagnosticMsg('Storage operation started: Deleting batch...');
    try {
      await db.batches.delete(batchToDelete.id);
      setDiagnosticMsg('Storage operation succeeded: Batch deleted.');
      setBatchToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      setDiagnosticMsg(`Storage operation failed: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {diagnosticMsg && (
        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
          <span>Diagnostic: {diagnosticMsg}</span>
          <button onClick={() => setDiagnosticMsg('')} className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Catalog</h1>
          <p className="text-slate-500 text-sm">Manage registered medicine records, active stock batches, and shelf allocations.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter catalog by medicine name or barcode..."
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredMeds.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Database className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-xs">No medicines registered in inventory.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredMeds.map((med) => {
              const medBatches = batches.filter((b) => b.medicineId === med.id);
              const totalQty = medBatches.reduce((sum, b) => sum + b.quantity, 0);

              return (
                <div key={med.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold text-[10px] uppercase border border-teal-200">
                        {med.dosageForm}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{med.brandName} {med.strength}</h3>
                    </div>
                    <p className="text-slate-500">
                      Generic: <span className="text-slate-800">{med.genericName}</span> • Manufacturer: <span className="text-slate-800">{med.manufacturer}</span> • Barcode: <span className="text-slate-800">{med.barcode || 'N/A'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {medBatches.map((b) => (
                        <div key={b.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                          <span>Batch: {b.batchNumber} ({b.quantity} {b.unit} @ {b.shelfId}) [Exp: {b.expiryDate}]</span>
                          <button
                            onClick={() => {
                              setDiagnosticMsg(`Delete batch button clicked for batch ${b.batchNumber}`);
                              setBatchToDelete({ id: b.id!, number: b.batchNumber });
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors ml-1 p-0.5"
                            title="Delete Stock Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-extrabold text-base text-slate-900 block">{totalQty} units</span>
                      <span className="text-[11px] text-slate-400">{medBatches.length} active batches</span>
                    </div>
                    <button
                      onClick={() => {
                        setDiagnosticMsg(`Delete medicine button clicked for ${med.brandName}`);
                        setMedToDelete({ id: med.id!, name: `${med.brandName} ${med.strength}` });
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Delete Medicine"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Medicine Confirmation Modal */}
      {medToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Confirm Delete Medicine</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{medToDelete.name}</strong> and all its associated stock batches? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMedToDelete(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedicine}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Confirm Delete Batch</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete stock batch <strong className="text-slate-900">{batchToDelete.number}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBatch}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
