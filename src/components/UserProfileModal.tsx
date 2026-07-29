import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, MapPin, AlignLeft, Save, Camera, Store, ShoppingBag, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';

interface UserProfileModalProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

export default function UserProfileModal({ initialProfile, onSave, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({ ...initialProfile });
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(profile.avatar || null);

  const handleLogout = () => {
    if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
      auth.signOut().then(() => onClose());
    }
  };

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
          const maxDim = 300;

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
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setPreviewAvatar(compressedBase64);
          setProfile({ ...profile, avatar: compressedBase64 });
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
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-xl font-black flex items-center gap-2">
            <User className="text-pink-500 w-5 h-5" /> MON PROFIL
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-zinc-900 border-4 border-white/5 flex items-center justify-center relative overflow-hidden group">
              {previewAvatar ? (
                <img src={previewAvatar} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Avatar" />
              ) : (
                <User className="w-12 h-12 text-zinc-700" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="mt-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Toucher pour changer la photo</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setProfile({ ...profile, role: 'buyer' })}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                profile.role === 'buyer' ? 'bg-white border-white text-black' : 'bg-zinc-900 border-white/5 text-zinc-500'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Acheteur</span>
            </button>
            <button
              onClick={() => setProfile({ ...profile, role: 'seller' })}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                profile.role === 'seller' ? 'bg-pink-500 border-pink-500 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500'
              }`}
            >
              <Store className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Vendeuse</span>
            </button>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Nom / Pseudo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-12 text-sm font-bold focus:border-pink-500 outline-none transition-colors"
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Téléphone (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="tel" 
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-12 text-sm font-bold focus:border-pink-500 outline-none transition-colors"
                  placeholder="Ex: 0102030405"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Bio / Slogan</label>
              <div className="relative">
                <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-zinc-500" />
                <textarea 
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full h-28 bg-zinc-900 border border-white/5 rounded-2xl px-12 py-4 text-sm font-bold focus:border-pink-500 outline-none transition-colors resize-none"
                  placeholder="Parlez-nous de vous ou de votre boutique..."
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Localisation</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={profile.location || ''}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-12 text-sm font-bold focus:border-pink-500 outline-none transition-colors"
                  placeholder="Ex: Abidjan, Cocody"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleLogout}
                className="w-full h-14 bg-zinc-900 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-900/50">
          <button 
            onClick={() => onSave(profile)}
            className="w-full h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-widest uppercase shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
          >
            <Save className="w-5 h-5" /> Enregistrer tout
          </button>
        </div>
      </motion.div>
    </div>
  );
}
