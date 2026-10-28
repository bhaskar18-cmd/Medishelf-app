/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Papa from 'papaparse';
import { db, Medicine, StockBatch, Shelf, ShopConfiguration } from '../db/db';
import { Download, Upload, Database, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const BackupRestore: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Export JSON Backup
  const handleExportJSON = async () => {
    try {
      const shop = await db.shops.toCollection().first();
      const shelves = await db.shelves.toArray();
      const medicines = await db.medicines.toArray();
      const batches = await db.batches.toArray();
      const transactions = await db.transactions.toArray();
      const sales = await db.sales.toArray();

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        shop,
        shelves,
        medicines,
        batches,
        transactions,
        sales,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `medishelf_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('JSON backup successfully exported.');
    } catch (err: any) {
      setErrorMsg('Failed to export JSON backup.');
    }
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.medicines || !json.shelves) {
          throw new Error('Invalid backup file structure.');
        }

        await db.transaction('rw', [db.shops, db.shelves, db.medicines, db.batches, db.transactions, db.sales], async () => {
          await db.shops.clear();
          await db.shelves.clear();
          await db.medicines.clear();
          await db.batches.clear();
          await db.transactions.clear();
          await db.sales.clear();

          if (json.shop) await db.shops.add(json.shop);
          if (json.shelves) await db.shelves.bulkAdd(json.shelves);
          if (json.medicines) await db.medicines.bulkAdd(json.medicines);
          if (json.batches) await db.batches.bulkAdd(json.batches);
          if (json.transactions) await db.transactions.bulkAdd(json.transactions);
          if (json.sales) await db.sales.bulkAdd(json.sales);
        });

        setSuccessMsg('Backup successfully restored! Reloading application...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setErrorMsg(err.message || 'Malformed backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Export CSV Medicines
  const handleExportCSV = async () => {
    const medicines = await db.medicines.toArray();
    const csv = Papa.unparse(medicines as any);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `medishelf_medicines_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSuccessMsg('Medicines CSV successfully exported.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Backup & Data Restore</h1>
        <p className="text-slate-500 text-sm">Secure local data backup, JSON state snapshots, and CSV medicine catalog export.</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Export JSON */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Export Full JSON Backup</h3>
            <p className="text-xs text-slate-500">Download complete shop configuration, shelf maps, medicine inventory, batches, and sales history.</p>
          </div>
          <button
            onClick={handleExportJSON}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
          >
            Download JSON Backup
          </button>
        </div>

        {/* Import JSON */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Restore JSON Backup</h3>
            <p className="text-xs text-slate-500">Restore your local IndexedDB state from a previously exported MediShelf JSON backup file.</p>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
          />
        </div>

        {/* Export CSV */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Export Medicine Catalog (CSV)</h3>
              <p className="text-xs text-slate-500">Export your medicine list for spreadsheets and external analysis.</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
            >
              Export CSV Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
