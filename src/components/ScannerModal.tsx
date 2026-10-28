/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface ScannerModalProps {
  title: string;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ title, onScanSuccess, onClose }) => {
  const [error, setError] = useState<string>('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef<boolean>(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('reader-container');
        scannerRef.current = html5QrCode;

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const rearCam = devices.find(d => /back|rear|environment|primary/i.test(d.label)) || devices[devices.length - 1];
          setActiveCameraId(rearCam.id);

          await html5QrCode.start(
            rearCam.id,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (scannedRef.current) return;
              scannedRef.current = true;
              stopAndClose(decodedText);
            },
            () => {}
          );
        } else {
          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (scannedRef.current) return;
              scannedRef.current = true;
              stopAndClose(decodedText);
            },
            () => {}
          );
        }
      } catch (err: any) {
        console.error('Camera start error:', err);
        setError('Camera permission denied or camera unavailable. Please check browser permissions or use manual entry below.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {});
      }
    };
  }, []);

  const stopAndClose = async (text: string) => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (e) {}
    onScanSuccess(text);
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2 || !scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
      const nextCamera = cameras[(currentIndex + 1) % cameras.length];
      setActiveCameraId(nextCamera.id);

      await scannerRef.current.start(
        nextCamera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          stopAndClose(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setError('Failed to switch camera.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (scannedRef.current) return;
    scannedRef.current = true;
    stopAndClose(manualInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <button
            onClick={() => {
              if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
              }
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isScanning && (
            <div className="space-y-3">
              <div id="reader-container" className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 min-h-[250px]"></div>
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Switch Rear / Front Camera
                </button>
              )}
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Manual Barcode / QR Code Entry</label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter barcode or shelf ID (e.g. A1)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Submit
              </button>
            </form>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
              }
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  );
};
