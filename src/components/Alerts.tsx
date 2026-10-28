/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StockBatch, Medicine } from '../db/db';
import { AlertTriangle, ShieldAlert, Pill, MapPin, Calendar } from 'lucide-react';

export const Alerts: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'expired' | '7days' | '30days' | '90days' | 'lowstock'>('all');
  
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];
  const shop = useLiveQuery(() => db.shops.toCollection().first(), []) || undefined;
  const defaultThreshold = shop?.defaultLowStockThreshold || 10;

  const now = new Date();

  const getDaysUntilExpiry = (expiryDateStr: string) => {
    const expDate = new Date(expiryDateStr.length === 7 ? `${expiryDateStr}-01` : expiryDateStr);
    const diffTime = expDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Categorize batches
  const expiredBatches = batches.filter((b) => b.quantity > 0 && getDaysUntilExpiry(b.expiryDate) < 0);
  const expiring7Days = batches.filter((b) => {
    const d = getDaysUntilExpiry(b.expiryDate);
    return b.quantity > 0 && d >= 0 && d <= 7;
  });
  const expiring30Days = batches.filter((b) => {
    const d = getDaysUntilExpiry(b.expiryDate);
    return b.quantity > 0 && d >= 0 && d <= 30;
  });
  const expiring90Days = batches.filter((b) => {
    const d = getDaysUntilExpiry(b.expiryDate);
    return b.quantity > 0 && d >= 0 && d <= 90;
  });

  // Low stock medicines
  const lowStockMeds = medicines.filter((med) => {
    const medBatches = batches.filter((b) => b.medicineId === med.id);
    const total = medBatches.reduce((sum, b) => sum + b.quantity, 0);
    const threshold = med.lowStockThreshold ?? defaultThreshold;
    return total <= threshold;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expiry & Low-Stock Alerts</h1>
        <p className="text-slate-500 text-sm">Deterministic programmed checks for expired stock, upcoming expiry windows, and low stock items.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          All Alerts ({expiredBatches.length + expiring90Days.length + lowStockMeds.length})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === 'expired' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Expired ({expiredBatches.length})
        </button>
        <button
          onClick={() => setFilter('7days')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === '7days' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          &lt; 7 Days ({expiring7Days.length})
        </button>
        <button
          onClick={() => setFilter('30days')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === '30days' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          &lt; 30 Days ({expiring30Days.length})
        </button>
        <button
          onClick={() => setFilter('90days')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === '90days' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          &lt; 90 Days ({expiring90Days.length})
        </button>
        <button
          onClick={() => setFilter('lowstock')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === 'lowstock' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Low Stock ({lowStockMeds.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {(filter === 'all' || filter === 'expired') && expiredBatches.length > 0 && (
          <div className="bg-white rounded-3xl border border-red-200 overflow-hidden shadow-sm">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-2 text-red-800 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Expired Stock Batches ({expiredBatches.length})
            </div>
            <div className="p-6 divide-y divide-slate-100">
              {expiredBatches.map((b) => {
                const med = medicines.find((m) => m.id === b.medicineId);
                return (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{med?.brandName} {med?.strength}</span>
                      <span className="text-slate-500">Batch: {b.batchNumber} • Shelf: {b.shelfId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600 block">{b.quantity} {b.unit} remaining</span>
                      <span className="text-[11px] text-slate-400">Expired on: {b.expiryDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === '90days' || filter === '30days' || filter === '7days') && expiring90Days.length > 0 && (
          <div className="bg-white rounded-3xl border border-amber-200 overflow-hidden shadow-sm">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Expiring Soon Batches ({expiring90Days.length})
            </div>
            <div className="p-6 divide-y divide-slate-100">
              {expiring90Days.map((b) => {
                const med = medicines.find((m) => m.id === b.medicineId);
                const days = getDaysUntilExpiry(b.expiryDate);
                return (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{med?.brandName} {med?.strength}</span>
                      <span className="text-slate-500">Batch: {b.batchNumber} • Shelf: {b.shelfId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-700 block">{b.quantity} {b.unit}</span>
                      <span className="text-[11px] text-amber-800 font-semibold">Expires in {days} days ({b.expiryDate})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === 'lowstock') && lowStockMeds.length > 0 && (
          <div className="bg-white rounded-3xl border border-teal-200 overflow-hidden shadow-sm">
            <div className="bg-teal-50 px-6 py-4 border-b border-teal-200 flex items-center gap-2 text-teal-900 font-bold text-sm">
              <Pill className="w-5 h-5 text-teal-600" /> Low Stock Medicines ({lowStockMeds.length})
            </div>
            <div className="p-6 divide-y divide-slate-100">
              {lowStockMeds.map((med) => {
                const medBatches = batches.filter((b) => b.medicineId === med.id);
                const total = medBatches.reduce((sum, b) => sum + b.quantity, 0);
                return (
                  <div key={med.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{med.brandName} {med.strength}</span>
                      <span className="text-slate-500">Generic: {med.genericName} • Form: {med.dosageForm}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-teal-700 block text-sm">{total} units available</span>
                      <span className="text-[11px] text-slate-400">Threshold: {med.lowStockThreshold ?? defaultThreshold}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expiredBatches.length === 0 && expiring90Days.length === 0 && lowStockMeds.length === 0 && (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
            <Calendar className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">All Stock Levels & Expiry Dates are Healthy</h3>
            <p className="text-xs text-slate-500">No expired items, urgent expiry batches, or low-stock medicines detected.</p>
          </div>
        )}
      </div>
    </div>
  );
};
