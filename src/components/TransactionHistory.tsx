/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { History, ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const transactions = useLiveQuery(() => db.transactions.orderBy('timestamp').reverse().toArray(), []) || [];
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'sale':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'adjustment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction History</h1>
        <p className="text-slate-500 text-sm">Complete audit trail of all inventory movements, stock receipts, sales, and audit adjustments.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">Recorded Audit Events</h3>
          </div>
          <span className="text-xs text-slate-500">{transactions.length} total events</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">No inventory transactions recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {transactions.map((tx) => {
              const med = medicines.find((m) => m.id === tx.medicineId);
              const dateStr = new Date(tx.timestamp).toLocaleString();

              return (
                <div key={tx.id} className="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${getBadgeColor(tx.transactionType)}`}>
                      {tx.transactionType === 'stock_in' ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{med?.brandName || 'Medicine'} {med?.strength}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgeColor(tx.transactionType)}`}>
                          {tx.transactionType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {tx.reason || 'Inventory operation'} {tx.shelfId ? `• Shelf: ${tx.shelfId}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`font-extrabold text-sm block ${tx.quantityChange > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{dateStr}</span>
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
