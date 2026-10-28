/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Medicine, StockBatch, SaleItem } from '../db/db';
import { ShoppingCart, Search, Trash2, Plus, CheckCircle2, AlertCircle, Pill, MapPin } from 'lucide-react';

interface SellMedicineProps {
  onSuccess: () => void;
}

export const SellMedicine: React.FC<SellMedicineProps> = ({ onSuccess }) => {
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const filteredMeds = medicines.filter((m) => {
    const term = searchTerm.toLowerCase();
    if (!term) return false;
    return (
      m.brandName.toLowerCase().includes(term) ||
      m.genericName.toLowerCase().includes(term) ||
      m.strength.toLowerCase().includes(term)
    );
  });

  const medBatches = selectedMed
    ? batches.filter((b) => b.medicineId === selectedMed.id && b.quantity > 0)
    : [];

  // FEFO default sorting: earliest expiry date first
  const sortedBatches = [...medBatches].sort((a, b) => {
    const dateA = new Date(a.expiryDate.length === 7 ? `${a.expiryDate}-01` : a.expiryDate).getTime();
    const dateB = new Date(b.expiryDate.length === 7 ? `${b.expiryDate}-01` : b.expiryDate).getTime();
    return dateA - dateB;
  });

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMed(med);
    setSearchTerm('');
    setErrorMsg('');
    const mBatches = batches.filter((b) => b.medicineId === med.id && b.quantity > 0);
    const sorted = [...mBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    if (sorted.length > 0) {
      setSelectedBatchId(sorted[0].id!);
    } else {
      setSelectedBatchId(null);
    }
    setSaleQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedMed || !selectedBatchId) {
      setErrorMsg('Please select a medicine and active batch.');
      return;
    }
    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch) {
      setErrorMsg('Selected batch not found.');
      return;
    }
    if (saleQuantity <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }
    if (saleQuantity > batch.quantity) {
      setErrorMsg(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}`);
      return;
    }

    // Check expiry
    const expDate = new Date(batch.expiryDate.length === 7 ? `${batch.expiryDate}-01` : batch.expiryDate);
    if (expDate < new Date()) {
      setErrorMsg('Cannot sell expired stock batch!');
      return;
    }

    setErrorMsg('');
    const unitPrice = batch.sellingPrice || 10.0;
    const newItem: SaleItem = {
      medicineId: selectedMed.id!,
      batchId: batch.id!,
      shelfId: batch.shelfId,
      medicineName: `${selectedMed.brandName} ${selectedMed.strength}`,
      batchNumber: batch.batchNumber,
      quantity: saleQuantity,
      unitPrice,
      totalPrice: unitPrice * saleQuantity,
    };

    setCart([...cart, newItem]);
    setSelectedMed(null);
    setSelectedBatchId(null);
    setSaleQuantity(1);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty. Add items before completing sale.');
      return;
    }
    setErrorMsg('');

    try {
      await db.transaction('rw', [db.batches, db.transactions, db.sales], async () => {
        const saleNumber = `SALE-${Math.floor(100000 + Math.random() * 900000)}`;

        // Deduct batch quantities & record transactions
        for (const item of cart) {
          const batch = await db.batches.get(item.batchId);
          if (!batch || batch.quantity < item.quantity) {
            throw new Error(`Stock conflict for batch ${item.batchNumber}`);
          }
          await db.batches.update(item.batchId, {
            quantity: batch.quantity - item.quantity,
            updatedAt: new Date().toISOString(),
          });

          await db.transactions.add({
            transactionType: 'sale',
            medicineId: item.medicineId,
            batchId: item.batchId,
            shelfId: item.shelfId,
            quantityChange: -item.quantity,
            timestamp: new Date().toISOString(),
            reason: `Sale order ${saleNumber}`,
            referenceId: saleNumber,
          });
        }

        await db.sales.add({
          saleNumber,
          items: cart,
          totalAmount,
          timestamp: new Date().toISOString(),
          status: 'completed',
        });
      });

      setSuccessMsg('Sale successfully completed and inventory updated!');
      setCart([]);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete sale transaction.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sell Medicine</h1>
        <p className="text-slate-500 text-sm">Search and record customer sales with automatic FEFO batch selection and stock deduction.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search & Select */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">1. Search & Select Medicine</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type medicine name (e.g. Paracetamol)..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {searchTerm && (
              <div className="max-h-60 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {filteredMeds.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 text-center">No medicines match your search.</p>
                ) : (
                  filteredMeds.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMedicine(m)}
                      className="w-full p-3 rounded-xl hover:bg-white text-left transition-colors flex items-center justify-between text-xs border border-transparent hover:border-slate-200"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{m.brandName} {m.strength}</span>
                        <span className="text-slate-500">Generic: {m.genericName} • Form: {m.dosageForm}</span>
                      </div>
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg">Select →</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedMed && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedMed.brandName} {selectedMed.strength}</h3>
                  <p className="text-xs text-slate-500">Generic: {selectedMed.genericName}</p>
                </div>
                <button
                  onClick={() => setSelectedMed(null)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Change
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Select Batch (FEFO Recommended)
                </label>
                {sortedBatches.length === 0 ? (
                  <p className="text-xs text-red-600 font-medium">No available stock batches for this medicine.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedBatches.map((b, idx) => {
                      const isSelected = selectedBatchId === b.id;
                      const isEarliest = idx === 0;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBatchId(b.id!)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected ? 'border-teal-600 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">Batch: {b.batchNumber}</span>
                              {isEarliest && (
                                <span className="px-2 py-0.5 bg-teal-600 text-white rounded font-semibold text-[10px]">FEFO Earliest</span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Shelf: <strong className="text-slate-800">{b.shelfId}</strong> • Expires: {b.expiryDate}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-teal-700 text-sm">{b.quantity} {b.unit}</span>
                            <span className="text-slate-400 block text-[10px]">Available</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Quantity to Sell</label>
                  <input
                    type="number"
                    min="1"
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" /> Add Item to Sale Cart
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sale Cart & Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Sale Summary</h3>
              <ShoppingCart className="w-5 h-5 text-teal-600" />
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">Your sale cart is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.medicineName}</span>
                      <span className="text-slate-500">Batch: {item.batchNumber} • Shelf: {item.shelfId}</span>
                      <span className="text-teal-700 font-semibold block mt-1">{item.quantity} units @ ${item.unitPrice.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-base font-bold text-slate-900">
              <span>Total Amount:</span>
              <span className="text-teal-700">${totalAmount.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-md ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" /> Confirm & Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
