/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ShopConfiguration } from '../db/db';
import { Search, ShoppingCart, PackagePlus, Scan, Map, Database, AlertTriangle, History, Download, Settings, ShieldCheck, Pill, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  shop: ShopConfiguration | undefined;
  setActiveTab: (tab: string) => void;
  onOpenScanner: (mode: 'medicine' | 'shelf') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ shop, setActiveTab, onOpenScanner }) => {
  const medicinesCount = useLiveQuery(() => db.medicines.count(), []) || 0;
  const batches = useLiveQuery(() => db.batches.toArray(), []) || 0;
  
  const totalStockQty = Array.isArray(batches) ? batches.reduce((acc, b) => acc + b.quantity, 0) : 0;
  
  const lowStockThreshold = shop?.defaultLowStockThreshold || 10;
  
  // Calculate low stock and expiring soon
  const lowStockMedicinesCount = useLiveQuery(async () => {
    const meds = await db.medicines.toArray();
    let count = 0;
    for (const med of meds) {
      const medBatches = await db.batches.where('medicineId').equals(med.id!).toArray();
      const total = medBatches.reduce((sum, b) => sum + b.quantity, 0);
      const threshold = med.lowStockThreshold ?? lowStockThreshold;
      if (total <= threshold) count++;
    }
    return count;
  }, [lowStockThreshold]) || 0;

  const expiringSoonCount = useLiveQuery(async () => {
    const allBatches = await db.batches.toArray();
    const now = new Date();
    const ninetyDays = new Date();
    ninetyDays.setDate(now.getDate() + 90);

    let count = 0;
    for (const b of allBatches) {
      if (b.quantity <= 0) continue;
      const expDate = new Date(b.expiryDate.length === 7 ? `${b.expiryDate}-01` : b.expiryDate);
      if (expDate <= ninetyDays && expDate >= now) {
        count++;
      }
    }
    return count;
  }, []) || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-4 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" /> Offline Pharmacy Operating Normally
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            {shop?.shopName || 'MediShelf Pharmacy'}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Find Every Medicine. Know Every Shelf. Fast local inventory, deterministic batch tracking, and interactive shelf mapping without external cloud dependencies.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('sell')}
              className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-teal-600/30 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Sell Medicine
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors backdrop-blur-md border border-white/10 flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" /> Receive Stock
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Distinct Medicines</span>
            <Pill className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{medicinesCount}</span>
            <span className="text-xs text-slate-500 block mt-1">Catalog items registered</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stock Units</span>
            <Database className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalStockQty}</span>
            <span className="text-xs text-slate-500 block mt-1">Items across all shelves</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{lowStockMedicinesCount}</span>
            <span className="text-xs text-amber-600 font-medium block mt-1">Below minimum threshold</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{expiringSoonCount}</span>
            <span className="text-xs text-red-600 font-medium block mt-1">Batches expiring in &lt;90 days</span>
          </div>
        </div>
      </div>

      {/* Action Grid (Large Touch-Friendly Buttons) */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Pharmacy Operations & Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <button
            onClick={() => setActiveTab('find')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Find Medicine</h3>
              <p className="text-xs text-slate-500">Search shelf locations & stock</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('sell')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Sell Medicine</h3>
              <p className="text-xs text-slate-500">Record sales & deduct stock</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Add Stock</h3>
              <p className="text-xs text-slate-500">Receive batches & new items</p>
            </div>
          </button>

          <button
            onClick={() => onOpenScanner('medicine')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Scan Barcode</h3>
              <p className="text-xs text-slate-500">Camera lookup by barcode</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Shelf Map</h3>
              <p className="text-xs text-slate-500">Interactive shop layout view</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Inventory</h3>
              <p className="text-xs text-slate-500">Manage catalog & batches</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Expiring & Low</h3>
              <p className="text-xs text-slate-500">Expiry dates & stock alerts</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">History</h3>
              <p className="text-xs text-slate-500">Transaction log & audit trail</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Backup & Restore</h3>
              <p className="text-xs text-slate-500">CSV & JSON safe data export</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">Reconciliation</h3>
              <p className="text-xs text-slate-500">Physical stock count audit</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
