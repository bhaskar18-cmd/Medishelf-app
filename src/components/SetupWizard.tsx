/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, Shelf } from '../db/db';
import { initializeDefaultShelves } from '../db/seed';
import { Shield, Upload, Map, CheckCircle2, Plus, Trash2, AlertCircle, Sparkles } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'shop_info' | 'map_config' | 'shelf_review'>('welcome');
  const [shopName, setShopName] = useState('MediShelf Pharmacy');
  const [address, setAddress] = useState('Main Street, Medical Hub');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [mapOption, setMapOption] = useState<'upload' | 'chatgpt' | 'manual'>('manual');
  const [mapImage, setMapImage] = useState<string>('');
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [newShelfCode, setNewShelfCode] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('Area A');
  const [newDescription, setNewDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadShelvesForReview = async () => {
    await initializeDefaultShelves();
    const allShelves = await db.shelves.toArray();
    setShelves(allShelves);
  };

  const handleSaveShop = async () => {
    if (!shopName.trim()) {
      setErrorMsg('Please enter a shop name.');
      return;
    }
    setErrorMsg('');
    await db.shops.clear();
    await db.shops.add({
      shopName,
      address,
      phone,
      mapImage,
      defaultLowStockThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await loadShelvesForReview();
    setStep('shelf_review');
  };

  const handleToggleShelf = async (id: string) => {
    const shelf = shelves.find((s) => s.id === id);
    if (!shelf) return;
    const updatedStatus = !shelf.isAvailable;
    await db.shelves.update(id, { isAvailable: updatedStatus, updatedAt: new Date().toISOString() });
    setShelves(shelves.map((s) => (s.id === id ? { ...s, isAvailable: updatedStatus } : s)));
  };

  const handleDeleteShelf = async (id: string) => {
    await db.shelves.delete(id);
    setShelves(shelves.filter((s) => s.id !== id));
  };

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfCode.trim()) return;
    const upperId = newShelfCode.trim().toUpperCase();
    if (shelves.some((s) => s.id === upperId)) {
      setErrorMsg(`Shelf ID ${upperId} already exists.`);
      return;
    }
    setErrorMsg('');
    const newShelf: Shelf = {
      id: upperId,
      shelfCode: upperId,
      areaCode: newAreaCode,
      description: newDescription || 'Custom Location',
      positionX: 50,
      positionY: 50,
      width: 15,
      height: 12,
      isAvailable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.shelves.add(newShelf);
    setShelves([...shelves, newShelf]);
    setNewShelfCode('');
    setNewDescription('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMapImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinishSetup = async () => {
    if (mapImage) {
      const shop = await db.shops.toCollection().first();
      if (shop && shop.id) {
        await db.shops.update(shop.id, { mapImage });
      }
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header banner */}
        <div className="bg-slate-950 text-white px-8 py-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MediShelf Setup</h1>
              <p className="text-slate-400 text-sm">Find Every Medicine. Know Every Shelf.</p>
            </div>
          </div>
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`h-1.5 flex-1 rounded-full ${step === 'welcome' || step === 'shop_info' || step === 'map_config' || step === 'shelf_review' ? 'bg-teal-500' : 'bg-slate-800'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step === 'map_config' || step === 'shelf_review' ? 'bg-teal-500' : 'bg-slate-800'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step === 'shelf_review' ? 'bg-teal-500' : 'bg-slate-800'}`}></div>
          </div>
        </div>

        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: WELCOME & SHOP INFO */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to MediShelf</h2>
                <p className="text-slate-600 text-sm">
                  Set up your pharmacy details and configure shelf locations so your staff can locate medicines in seconds. All data remains securely stored on your device offline.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Pharmacy Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. City Central Pharmacy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Address (Optional)</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. 124 Health Ave"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Contact Phone (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. +1 (555) 019-2834"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep('map_config')}
                  className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20"
                >
                  Continue to Map Setup →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MAP CONFIGURATION */}
          {step === 'map_config' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Configure Pharmacy Floor Map</h2>
                <p className="text-slate-600 text-sm">
                  Choose how you would like to set up your floor plan and shelf locations. You can upload an image or use our manual layout generator.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <button
                  onClick={() => setMapOption('upload')}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${mapOption === 'upload' ? 'border-teal-600 bg-teal-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div>
                    <Upload className="w-6 h-6 text-teal-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">Upload Existing Map</h3>
                    <p className="text-xs text-slate-500">Upload a JPG, PNG, or WebP layout of your pharmacy floor plan.</p>
                  </div>
                  <span className="text-xs font-medium text-teal-700 mt-4">Selected →</span>
                </button>

                <button
                  onClick={() => setMapOption('chatgpt')}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${mapOption === 'chatgpt' ? 'border-teal-600 bg-teal-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div>
                    <Sparkles className="w-6 h-6 text-teal-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">ChatGPT Map Prompt</h3>
                    <p className="text-xs text-slate-500">Generate map layout prompt to structure your shelf arrangement.</p>
                  </div>
                  <span className="text-xs font-medium text-teal-700 mt-4">Selected →</span>
                </button>

                <button
                  onClick={() => setMapOption('manual')}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${mapOption === 'manual' ? 'border-teal-600 bg-teal-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div>
                    <Map className="w-6 h-6 text-teal-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">Create Map Manually</h3>
                    <p className="text-xs text-slate-500">Use standard Area A (Open shelves) and Area B (Cabinet) grid layout.</p>
                  </div>
                  <span className="text-xs font-medium text-teal-700 mt-4">Selected →</span>
                </button>
              </div>

              {mapOption === 'upload' && (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="map-upload-input" />
                  <label htmlFor="map-upload-input" className="cursor-pointer inline-flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-700 mb-1">Click to upload floor plan image</span>
                    <span className="text-xs text-slate-500">PNG, JPG or WebP up to 10MB</span>
                  </label>
                  {mapImage && (
                    <div className="mt-4 text-xs font-semibold text-teal-600 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Map image uploaded successfully
                    </div>
                  )}
                </div>
              )}

              {mapOption === 'chatgpt' && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
                  <p className="font-semibold">Optional ChatGPT Prompt for Floor Layout:</p>
                  <p className="p-3 bg-white rounded-xl border border-amber-200 font-mono text-[11px] select-all">
                    "Act as an expert pharmacy layout designer. Please generate a clean 2D floor plan layout with clearly labelled open wooden shelves (Area A: A1, A2-L, A2-C, A2-R, A3-L, A3-C, A3-R, A4-L, A4-R) and a glass-door cabinet (Area B: B1 to B9)."
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText('Act as an expert pharmacy layout designer. Please generate a clean 2D floor plan layout with clearly labelled open wooden shelves (Area A: A1, A2-L, A2-C, A2-R, A3-L, A3-C, A3-R, A4-L, A4-R) and a glass-door cabinet (Area B: B1 to B9).')}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                  >
                    Copy Map Prompt to Clipboard
                  </button>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('welcome')}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSaveShop}
                  className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20"
                >
                  Review Shelf Configuration →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SHELF REVIEW & CUSTOMIZATION */}
          {step === 'shelf_review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Review & Customize Shelf Locations</h2>
                <p className="text-slate-600 text-sm">
                  MediShelf comes pre-configured with Area A (Open Wooden Shelves, with A4-R disabled by default) and Area B (Glass-Door Cabinet 3x3). You can add, remove, or toggle availability.
                </p>
              </div>

              {/* Add custom shelf form */}
              <form onSubmit={handleAddShelf} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Shelf ID (e.g. C1)"
                  value={newShelfCode}
                  onChange={(e) => setNewShelfCode(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold uppercase bg-white flex-1"
                />
                <input
                  type="text"
                  placeholder="Area / Section (e.g. Area C)"
                  value={newAreaCode}
                  onChange={(e) => setNewAreaCode(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white flex-1"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white flex-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Shelf
                </button>
              </form>

              {/* Shelf List grouped / listed */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {shelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${shelf.isAvailable ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {shelf.id}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800">{shelf.areaCode}</span>
                        <p className="text-slate-500">{shelf.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleShelf(shelf.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] ${shelf.isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {shelf.isAvailable ? 'Available' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShelf(shelf.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Shelf"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('map_config')}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinishSetup}
                  className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Save & Start Using MediShelf
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
