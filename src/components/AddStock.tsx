/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Medicine, StockBatch } from '../db/db';
import { PackagePlus, Scan, CheckCircle2, AlertCircle, Pill, MapPin, ArrowLeft } from 'lucide-react';

interface AddStockProps {
  initialBarcode?: string;
  onOpenScanner: (mode: 'medicine' | 'shelf') => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddStock: React.FC<AddStockProps> = ({ initialBarcode, onOpenScanner, onSuccess, onCancel }) => {
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];
  const shelves = useLiveQuery(() => db.shelves.toArray(), []) || [];

  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [isNewMedicine, setIsNewMedicine] = useState<boolean>(false);

  // New medicine fields
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [manufacturer, setManufacturer] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Stock batch fields
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(50);
  const [unit, setUnit] = useState('Strips');
  const [expiryDate, setExpiryDate] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [shelfId, setShelfId] = useState('A1');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleMedicineChange = (idStr: string) => {
    setSelectedMedicineId(idStr);
    if (idStr === 'NEW') {
      setIsNewMedicine(true);
    } else {
      setIsNewMedicine(false);
      const med = medicines.find((m) => m.id === Number(idStr));
      if (med && med.barcode) {
        setBarcode(med.barcode);
      }
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let medId = Number(selectedMedicineId);

    if (isNewMedicine || !selectedMedicineId || selectedMedicineId === 'NEW') {
      if (!brandName.trim()) {
        setErrorMsg('Brand name is required for new medicine.');
        return;
      }
      medId = await db.medicines.add({
        brandName: brandName.trim(),
        genericName: genericName.trim() || 'N/A',
        strength: strength.trim() || 'N/A',
        dosageForm,
        manufacturer: manufacturer.trim() || 'N/A',
        barcode: barcode.trim(),
        lowStockThreshold,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!batchNumber.trim()) {
      setErrorMsg('Batch number is required.');
      return;
    }
    if (!expiryDate) {
      setErrorMsg('Expiry date is required.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }

    const expiryPrecision = expiryDate.length === 7 ? 'month' : 'exact';

    // Save stock batch
    const batchId = await db.batches.add({
      medicineId: medId,
      shelfId,
      batchNumber: batchNumber.trim().toUpperCase(),
      quantity,
      unit,
      manufacturingDate: manufacturingDate || undefined,
      expiryDate,
      expiryPrecision,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Record inventory transaction
    await db.transactions.add({
      transactionType: 'stock_in',
      medicineId: medId,
      batchId,
      shelfId,
      quantityChange: quantity,
      timestamp: new Date().toISOString(),
      reason: `Received stock batch ${batchNumber}`,
    });

    setSuccessMsg('Stock batch received and inventory successfully updated!');
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Medicine & Receive Stock</h1>
          <p className="text-slate-500 text-sm">Register new medicines or receive incoming batch shipments into specific shelf locations.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveStock} className="space-y-6">
          {/* Medicine Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Select Medicine</label>
            <select
              value={selectedMedicineId}
              onChange={(e) => handleMedicineChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="">-- Choose Existing Medicine or Create New --</option>
              <option value="NEW">+ Register New Medicine</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brandName} ({m.strength}) - {m.genericName}
                </option>
              ))}
            </select>
          </div>

          {/* New Medicine Form Fields */}
          {isNewMedicine && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" /> New Medicine Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Paracetamol"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Strength</label>
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder="e.g. 500 mg"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Drops">Drops</option>
                    <option value="Inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. PharmaCorp"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Barcode</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or enter barcode"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => onOpenScanner('medicine')}
                      className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 shrink-0"
                    >
                      <Scan className="w-3.5 h-3.5" /> Scan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Batch & Quantity Receiving Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Batch & Shelf Allocation</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Batch Number *</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-9821"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Shelf Location *</label>
                <select
                  value={shelfId}
                  onChange={(e) => setShelfId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.areaCode}) - {s.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Unit of Measurement</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Strips">Strips</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Bottles">Bottles</option>
                  <option value="Tablets">Tablets</option>
                  <option value="Vials">Vials</option>
                  <option value="Tubes">Tubes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Expiry Date * (YYYY-MM-DD or YYYY-MM)</label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="e.g. 2027-08 or 2027-08-15"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Selling Price (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 flex items-center gap-2"
            >
              <PackagePlus className="w-5 h-5" /> Save Stock & Record Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
