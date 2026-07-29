import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, User, Store, ArrowRight, ShoppingBag, LogIn, X } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface AuthProps {
  onAuthComplete: (profile: UserProfile) => void;
  onCancel: () => void;
}

export default function Auth({ onAuthComplete, onCancel }: AuthProps) {
  const [step, setStep] = useState<'intro' | 'phone' | 'otp' | 'profile'>('intro');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in but missing profile
  React.useEffect(() => {
    const checkExistingAuth = async () => {
      const user = auth.currentUser;
      if (user && step === 'intro') {
        setLoading(true);
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            onAuthComplete(docSnap.data() as UserProfile);
          } else {
            setName(user.displayName || '');
            setStep('phone');
          }
        } catch (err) {
          console.error("Auth check error:", err);
          // Don't block if check fails, stay on intro
        } finally {
          setLoading(false);
        }
      }
    };
    checkExistingAuth();
  }, [step, onAuthComplete]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Remove custom parameters to reduce friction on some mobile browsers
      // provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const docRef = doc(db, 'users', user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (docSnap && docSnap.exists()) {
        onAuthComplete(docSnap.data() as UserProfile);
      } else {
        // New user, proceed to phone number step
        setName(user.displayName || '');
        setStep('phone');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      // More descriptive errors for the AI Studio / Iframe environment
      if (err.code === 'auth/popup-blocked') {
        setError("Le pop-up de connexion a été bloqué. Cliquez sur l'icône 'Ouvrir dans un nouvel onglet' en haut à droite pour une meilleure expérience.");
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError("La connexion a été interrompue.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Domaine non autorisé. Veuillez ajouter l'URL actuelle dans la console Firebase (Auth > Paramètres > Domaines autorisés).");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La connexion Google n'est pas activée dans votre console Firebase.");
      } else {
        setError("Erreur : " + (err.message || "Problème de connexion. Essayez le numéro de téléphone."));
      }
    } finally {
      setLoading(false);
    }
  };

  const [otp, setOtp] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 8) return;
    setStep('otp');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setStep('profile');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      let uid = auth.currentUser?.uid;
      
      if (!uid) {
        // If not logged in via Google, use anonymous for phone mock
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      }
      
      const profile: UserProfile = {
        id: uid,
        name,
        phoneNumber,
        role,
        bio: role === 'seller' ? "Nouveau vendeur sur Djassa Live" : undefined,
        location: role === 'seller' ? "Abidjan, CIV" : undefined,
        rating: role === 'seller' ? 0 : undefined,
        avatar: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      };

      await setDoc(doc(db, 'users', uid), profile);
      onAuthComplete(profile);
    } catch (error) {
      if (error instanceof Error && error.message.includes('{"error"')) {
        // Already handled
      } else {
        handleFirestoreError(error, OperationType.WRITE, `users/${phoneNumber}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* TikTok style Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center text-center max-w-xs"
          >
            <button
              onClick={onCancel}
              className="absolute top-8 right-8 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <ShoppingBag className="w-12 h-12 text-pink-500" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tighter leading-tight">
              DJASSA <span className="text-pink-500">LIVE</span>
            </h1>
            <p className="text-zinc-400 font-medium mb-12">Le marché ivoirien, en direct sur votre écran.</p>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-16 bg-white text-black rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 mb-4"
            >
              {loading ? 'Connexion...' : <><LogIn className="w-5 h-5" /> Google</>}
            </button>
            <button
              onClick={() => setStep('phone')}
              disabled={loading}
              className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Phone className="w-5 h-5" /> Numéro de téléphone
            </button>
            <p className="mt-8 text-[10px] text-zinc-500 font-medium italic">
              Conseil : Rejoignez le marché pour vendre ou acheter.
            </p>
          </motion.div>
        )}

        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm"
          >
            <button
              onClick={() => setStep('intro')}
              className="mb-8 text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Retour
            </button>
            <h2 className="text-2xl font-black mb-2 tracking-tight">C'est quoi ton numéro ?</h2>
            <p className="text-zinc-500 text-sm mb-8 font-medium">On t'enverra un petit code de vérification.</p>
            
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-16 bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white font-black text-lg focus:border-pink-500 outline-none transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-16 bg-pink-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 transition-transform shadow-xl shadow-pink-500/20"
              >
                Suivant
              </button>
            </form>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm"
          >
            <button
              onClick={() => setStep('phone')}
              className="mb-8 text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Modifier le numéro
            </button>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Vérification</h2>
            <p className="text-zinc-500 text-sm mb-8 font-medium">Saisis le code envoyé au {phoneNumber}</p>
            
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full h-20 bg-zinc-900 border border-white/5 rounded-2xl text-center text-white font-black text-4xl tracking-[1em] focus:border-pink-500 outline-none transition-colors"
                  maxLength={4}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-16 bg-pink-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 transition-transform shadow-xl shadow-pink-500/20"
              >
                Vérifier
              </button>
            </form>
          </motion.div>
        )}

        {step === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm"
          >
            <h2 className="text-2xl font-black mb-2 tracking-tight">On t'appelle comment ?</h2>
            <p className="text-zinc-500 text-sm mb-8 font-medium">Personnalise ton profil Djassa.</p>
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="text"
                  placeholder="Ton nom d'utilisateur"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-16 bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white font-black text-lg focus:border-pink-500 outline-none transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black text-[10px] tracking-widest uppercase transition-all ${
                    role === 'buyer' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-white/5 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  <ShoppingBag className="w-6 h-6" /> Acheteur
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black text-[10px] tracking-widest uppercase transition-all ${
                    role === 'seller' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-white/5 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  <Store className="w-6 h-6" /> Vendeur
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-white text-black rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Terminer'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
