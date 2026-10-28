/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, ShopConfiguration } from '../db/db';
import { Settings, Shield, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  shop: ShopConfiguration | undefined;
  onClose: () => void;
  onUpdate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ shop, onClose, onUpdate }) => {
  const [shopName, setShopName] = useState(shop?.shopName || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [threshold, setThreshold] = useState(shop?.defaultLowStockThreshold || 10);
  const [successMsg, setSuccessMsg] = useState('');

  // Reset App Data states
  const [showResetSection, setShowResetSection] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shop && shop.id) {
      await db.shops.update(shop.id, {
        shopName,
        address,
        phone,
        defaultLowStockThreshold: threshold,
        updatedAt: new Date().toISOString(),
      });
      setSuccessMsg('Shop settings updated successfully.');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
    }
  };

  const handleResetAppData = async () => {
    if (resetInput !== 'RESET') {
      setResetError('Please type RESET in capital letters to confirm.');
      return;
    }
    setResetError('');
    try {
      await db.close();
      await db.delete();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset app data:', err);
      setResetError('Failed to reset app data. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-sm">Pharmacy Settings & Data Reset</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Default Low Stock Threshold</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>

          {/* Reset App Data Section */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm text-red-600">Danger Zone: Reset App Data</h4>
                <p className="text-xs text-slate-500">Permanently delete all local inventory, maps, and transactions.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetSection(!showResetSection)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {showResetSection ? 'Hide Reset' : 'Reset App Data'}
              </button>
            </div>

            {showResetSection && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <p className="text-xs text-red-800 leading-relaxed">
                  Warning: This will permanently delete all medicines, stock records, batches, sales history, shelf records, floor maps, uploaded images, marker positions, and settings stored on this device.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-red-900 mb-1">
                    To confirm, please type <code className="bg-red-200 px-1 py-0.5 rounded font-bold">RESET</code> below:
                  </label>
                  <input
                    type="text"
                    value={resetInput}
                    onChange={(e) => setResetInput(e.target.value)}
                    placeholder="Type RESET"
                    className="w-full px-3 py-2 rounded-xl border border-red-300 text-xs text-slate-900 bg-white"
                  />
                </div>
                {resetError && <p className="text-xs text-red-600 font-semibold">{resetError}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetSection(false);
                      setResetInput('');
                      setResetError('');
                    }}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAppData}
                    disabled={resetInput !== 'RESET'}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors ${
                      resetInput === 'RESET' ? 'bg-red-600 hover:bg-red-700 shadow-sm' : 'bg-red-300 cursor-not-allowed'
                    }`}
                  >
                    Confirm Permanent Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
