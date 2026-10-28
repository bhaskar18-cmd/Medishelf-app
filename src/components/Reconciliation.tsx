/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StockBatch, Medicine } from '../db/db';
import { CheckCircle2, AlertCircle, RefreshCw, ClipboardCheck } from 'lucide-react';

interface ReconciliationProps {
  onSuccess: () => void;
}

export const Reconciliation: React.FC<ReconciliationProps> = ({ onSuccess }) => {
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];

  const [counts, setCounts] = useState<{ [batchId: number]: number }>({});
  const [reasons, setReasons] = useState<{ [batchId: number]: string }>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCountChange = (batchId: number, val: number) => {
    setCounts({ ...counts, [batchId]: val });
  };

  const handleReasonChange = (batchId: number, val: string) => {
    setReasons({ ...reasons, [batchId]: val });
  };

  const handleConfirmReconciliation = async (batch: StockBatch) => {
    const physicalCount = counts[batch.id!];
    if (physicalCount === undefined || physicalCount < 0) {
      setErrorMsg(`Please enter a valid physical count for batch ${batch.batchNumber}`);
      return;
    }
    const diff = physicalCount - batch.quantity;
    if (diff === 0) {
      setErrorMsg(`No quantity discrepancy found for batch ${batch.batchNumber}`);
      return;
    }

    const reason = reasons[batch.id!] || 'Physical count reconciliation audit adjustment';
    setErrorMsg('');

    try {
      await db.transaction('rw', [db.batches, db.transactions], async () => {
        await db.batches.update(batch.id!, {
          quantity: physicalCount,
          updatedAt: new Date().toISOString(),
        });

        await db.transactions.add({
          transactionType: 'adjustment',
          medicineId: batch.medicineId,
          batchId: batch.id!,
          shelfId: batch.shelfId,
          quantityChange: diff,
          timestamp: new Date().toISOString(),
          reason,
        });
      });

      setSuccessMsg(`Successfully reconciled batch ${batch.batchNumber} (Difference: ${diff > 0 ? `+${diff}` : diff})`);
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update reconciliation adjustment.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Physical Stock Reconciliation</h1>
        <p className="text-slate-500 text-sm">Compare system inventory quantities against physical shelf counts and record audit adjustments.</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ClipboardCheck className="w-5 h-5 text-teal-600" />
          <h3 className="font-bold text-slate-900 text-base">Active Batches Audit Sheet</h3>
        </div>

        {batches.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-xs">No active stock batches found in inventory.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {batches.map((batch) => {
              const med = medicines.find((m) => m.id === batch.medicineId);
              const currentCount = counts[batch.id!] !== undefined ? counts[batch.id!] : batch.quantity;
              const diff = currentCount - batch.quantity;

              return (
                <div key={batch.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 text-sm block">
                      {med?.brandName || 'Medicine'} {med?.strength}
                    </span>
                    <p className="text-slate-500">
                      Batch: <strong className="text-slate-800">{batch.batchNumber}</strong> • Shelf: <strong className="text-slate-800">{batch.shelfId}</strong> • System Qty: <strong className="text-slate-800">{batch.quantity} {batch.unit}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Physical Count</label>
                      <input
                        type="number"
                        min="0"
                        value={currentCount}
                        onChange={(e) => handleCountChange(batch.id!, Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Audit Reason</label>
                      <input
                        type="text"
                        placeholder="e.g. Annual physical count check"
                        value={reasons[batch.id!] || ''}
                        onChange={(e) => handleReasonChange(batch.id!, e.target.value)}
                        className="w-48 px-3 py-2 rounded-xl border border-slate-200 text-slate-900 bg-white text-xs"
                      />
                    </div>

                    <div className="pt-4">
                      <span className={`block font-semibold mb-1 ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Diff: {diff > 0 ? `+${diff}` : diff}
                      </span>
                      <button
                        onClick={() => handleConfirmReconciliation(batch)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                      >
                        Confirm Adjustment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
