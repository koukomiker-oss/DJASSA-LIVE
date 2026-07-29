import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Eye, MapPin, Sparkles, Save, Image as ImageIcon } from 'lucide-react';
import { SellerLiveConfig } from '../types';

interface LiveConfigModalProps {
  initialConfig: SellerLiveConfig | null;
  onSave: (config: SellerLiveConfig) => void;
  onClose: () => void;
}

export default function LiveConfigModal({ initialConfig, onSave, onClose }: LiveConfigModalProps) {
  const [config, setConfig] = useState<SellerLiveConfig>(initialConfig || {
    sellerId: '',
    simulatedViewers: 250,
    showLocation: true,
    filter: 'none',
    updatedAt: Date.now()
  });

  const [previewImage, setPreviewImage] = useState<string | null>(config.overlayImage || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400; // Max dimension to keep size low

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with quality 0.7
          setPreviewImage(compressedBase64);
          setConfig({ ...config, overlayImage: compressedBase64 });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[40px] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="text-pink-500 w-5 h-5" /> REGLAGES LIVE
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
          {/* Overlay Image */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Photo d'Écran (Overlay)</label>
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                {previewImage ? (
                  <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                Uploadez une photo pour l'afficher sur votre écran pendant la diffusion. Idéal pour les promos ou le logo.
              </p>
            </div>
          </div>

          {/* Viewers */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
              <Eye className="w-3 h-3" /> Nombre de Vues Simulé
            </label>
            <input 
              type="range" 
              min="50" 
              max="5000" 
              step="50"
              value={config.simulatedViewers}
              onChange={(e) => setConfig({ ...config, simulatedViewers: parseInt(e.target.value) })}
              className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] font-black text-pink-500">{config.simulatedViewers} SPECTATEURS</span>
              <span className="text-[10px] font-black text-zinc-600">MAX 5000</span>
            </div>
          </div>

          {/* Filter */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Ambiance Visuelle</label>
            <div className="grid grid-cols-4 gap-2">
              {(['none', 'sepia', 'grayscale', 'warm'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setConfig({ ...config, filter: f })}
                  className={`py-3 rounded-xl border transition-all text-[8px] font-black uppercase ${
                    config.filter === f ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-zinc-500'
                  }`}
                >
                  {f === 'none' ? 'Normal' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Location */}
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-xs font-black">Afficher ma position</p>
                <p className="text-[9px] text-zinc-500 font-bold">Abidjan, Cocody...</p>
              </div>
            </div>
            <button 
              onClick={() => setConfig({ ...config, showLocation: !config.showLocation })}
              className={`w-12 h-6 rounded-full transition-colors relative ${config.showLocation ? 'bg-pink-500' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.showLocation ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6">
          <button 
            onClick={() => onSave(config)}
            className="w-full h-14 bg-pink-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
          >
            <Save className="w-5 h-5" /> ENREGISTRER LES PARAMÈTRES
          </button>
        </div>
      </motion.div>
    </div>
  );
}
