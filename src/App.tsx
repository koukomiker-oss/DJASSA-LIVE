import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Store, ChevronLeft, Zap, CheckCircle2, 
  Download, MessageCircle, Trash2, Heart, Share2, 
  Users, Send, Gift, Camera, VideoOff, Mic, MapPin, Star, User, Search, TrendingUp, Settings, RefreshCw, Radio
} from 'lucide-react';
import { Seller, Order, AppView, LiveProduct, UserProfile, LiveSession, VideoPost, SellerAnalytics, SellerLiveConfig } from './types';
import { SELLERS, BUYER_AVATAR, MOCK_VIDEOS } from './constants';
import { adjustColor, generateReceipt } from './lib/utils';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where, orderBy, setDoc, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreErrors';
import Auth from './components/Auth';
import VideoFeed from './components/VideoFeed';
import VideoEditor from './components/VideoEditor';
import SellerAnalyticsDashboard from './components/SellerAnalyticsDashboard';
import LiveConfigModal from './components/LiveConfigModal';
import UserProfileModal from './components/UserProfileModal';
import LiveGateway from './components/LiveGateway';

// Helper for chat messages
const MOCK_COMMENTS = [
  "C'est trop beau ! 😍",
  "Il en reste en rouge ?",
  "Je viens de prendre l'avance 👌",
  "Qualité 10/10",
  "Livraison à Cocody possible ?",
  "Wouah le prix est cadeau",
  "Est-ce que c'est du vrai cuir ?",
  "C'est la nouvelle collection ?"
];

export default function App() {
  const [view, setView] = useState<AppView>('acheteur');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(1000);
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [sellerTab, setSellerTab] = useState<'actives' | 'expirees'>('actives');
  const [liveProducts, setLiveProducts] = useState<LiveProduct[]>([]);
  const [activeLiveProduct, setActiveLiveProduct] = useState<LiveProduct | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [videoFeed, setVideoFeed] = useState<VideoPost[]>([]);
  const [tempVideoUrl, setTempVideoUrl] = useState<string | null>(null);
  const [sellerAnalytics, setSellerAnalytics] = useState<SellerAnalytics | null>(null);
  const [sellerLiveConfig, setSellerLiveConfig] = useState<SellerLiveConfig | null>(null);
  const [selectedSellerConfig, setSelectedSellerConfig] = useState<SellerLiveConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('Tous');
  const [maxPrice, setMaxPrice] = useState<number>(30000);

  // TikTok Live elements
  const [comments, setComments] = useState<{id: string, text: string, user: string}[]>([]);
  const [hearts, setHearts] = useState<{id: number, left: number}[]>([]);
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 500) + 120);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Load user profile and listen to orders from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            // Auto redirect based on role if on home/auth
            if (view === 'acheteur' || view === 'auth') {
              setView(profile.role === 'seller' ? 'vendeuse' : 'acheteur');
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time orders from Firestore
  useEffect(() => {
    if (!userProfile || !auth.currentUser) return;

    let q;
    if (userProfile.role === 'seller') {
      q = query(
        collection(db, 'orders'),
        where('sellerId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, 'orders'),
        where('buyerId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(newOrders);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Real-time live sessions
  useEffect(() => {
    const q = query(
      collection(db, 'lives'),
      where('status', '==', 'active'),
      orderBy('startedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveSession));
      setLiveSessions(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'lives');
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for current live session products (for buyers)
  const isInitialLiveProducts = useRef(true);
  useEffect(() => {
    if (view !== 'live' || !selectedSeller?.id) {
      isInitialLiveProducts.current = true;
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'lives', selectedSeller.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LiveSession;
        if (data.products) {
          setLiveProducts(prev => {
            const hasNew = data.products && data.products.length > (prev?.length || 0);
            if (hasNew && !isInitialLiveProducts.current) {
              const newProduct = data.products![data.products!.length - 1];
              setNotification(`Nouvel article ajouté : ${newProduct.name} ! 🛒`);
              setLastAddedId(newProduct.id);
              setTimeout(() => {
                setNotification(null);
                setLastAddedId(null);
              }, 5000);
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }
            isInitialLiveProducts.current = false;
            return data.products || [];
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `lives/${selectedSeller.id}`);
    });

    return () => {
      unsubscribe();
      isInitialLiveProducts.current = true;
    };
  }, [view, selectedSeller?.id]);

  // Test Connection and Fetch Video Feed
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {
          // It's okay if this document doesn't exist, as long as it doesn't throw permission denied
        });
      } catch (error: any) {
        if (error.message?.includes('insufficient permissions')) {
          console.error("Firestore Permission denied on connection test.");
        }
      }
    };
    testConnection();

    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      if (videos.length === 0) {
        // Fallback with mock data if DB is empty
        const mockVideos: VideoPost[] = MOCK_VIDEOS.map((url, i) => ({
          id: `v${i}`,
          sellerId: SELLERS[i % SELLERS.length].id,
          sellerName: SELLERS[i % SELLERS.length].name,
          sellerAvatar: BUYER_AVATAR,
          videoUrl: url,
          thumbnailUrl: '',
          caption: `Regardez notre nouvelle collection de ${SELLERS[i % SELLERS.length].category} ! #AbidjanStyle`,
          products: Array.from({ length: 8 }).map((_, j) => ({
            id: `p${i}-${j}`,
            name: `${SELLERS[i % SELLERS.length].product} V${j}`,
            price: SELLERS[i % SELLERS.length].price + (j * 1000),
            image: `https://picsum.photos/seed/${i*10+j}/200`
          })),
          tags: [],
          stickers: [],
          completionRate: Math.random(),
          shareCount: Math.floor(Math.random() * 500),
          viewCount: Math.floor(Math.random() * 10000),
          createdAt: Date.now() - (i * 3600000)
        }));
        setVideoFeed(mockVideos);
      } else {
        setVideoFeed(videos);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'videos');
    });
    return () => unsubscribe();
  }, []);

  // Fetch Seller Analytics
  useEffect(() => {
    if (!userProfile || !auth.currentUser || userProfile.role !== 'seller') return;
    const unsubscribe = onSnapshot(doc(db, 'seller_analytics', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        setSellerAnalytics(snapshot.data() as SellerAnalytics);
      }
    });
    return () => unsubscribe();
  }, [userProfile]);

  // Fetch Seller Live Config
  useEffect(() => {
    if (!userProfile || !auth.currentUser || userProfile.role !== 'seller') return;
    const unsubscribe = onSnapshot(doc(db, 'seller_live_config', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        setSellerLiveConfig(snapshot.data() as SellerLiveConfig);
      }
    });
    return () => unsubscribe();
  }, [userProfile]);

  const handleAuthComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setView(profile.role === 'seller' ? 'vendeuse' : 'acheteur');
  };

  const handleSaveLiveConfig = async (config: SellerLiveConfig) => {
    if (!userProfile) return;
    try {
      await setDoc(doc(db, 'seller_live_config', userProfile.id), {
        ...config,
        sellerId: userProfile.id,
        updatedAt: Date.now()
      }, { merge: true });
      setShowConfigModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `seller_live_config/${userProfile.id}`);
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!userProfile) return;
    try {
      await setDoc(doc(db, 'users', userProfile.id), {
        ...updatedProfile,
        id: userProfile.id // Ensure ID remains current
      }, { merge: true });
      
      setUserProfile(updatedProfile);
      // If role changed, view might need to change
      if (updatedProfile.role !== userProfile.role) {
        setView(updatedProfile.role === 'seller' ? 'vendeuse' : 'acheteur');
      }
      setShowProfileModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userProfile.id}`);
    }
  };

  const handlePublishVideo = (videoData: Partial<VideoPost>) => {
    if (!userProfile) return;
    
    const seller = SELLERS.find(s => s.id === userProfile.id);
    
    const newVideo: any = {
      id: Date.now().toString(),
      sellerId: userProfile.id,
      sellerName: userProfile.name,
      sellerAvatar: userProfile.avatar || BUYER_AVATAR,
      videoUrl: videoData.videoUrl || MOCK_VIDEOS[0],
      thumbnailUrl: '',
      caption: videoData.caption || 'Nouvelle arrivage ! 🎉 #Djassa',
      products: videoData.products || (seller ? [
        { id: '1', name: seller.product, price: seller.price, image: `https://picsum.photos/seed/${userProfile.id}/200` }
      ] : []),
      tags: [],
      filter: videoData.filter || 'normal',
      stickers: videoData.stickers || [],
      completionRate: 0,
      shareCount: 0,
      viewCount: 0,
      createdAt: Date.now(),
      audioId: videoData.audioId || null
    };

    // Combine and ensure no undefined values reach Firestore
    const dataToSave = { ...newVideo, ...videoData };
    Object.keys(dataToSave).forEach(key => {
      if ((dataToSave as any)[key] === undefined) {
        (dataToSave as any)[key] = null;
      }
    });

    setDoc(doc(db, 'videos', newVideo.id), dataToSave)
      .then(() => {
        setView('vendeuse');
        setTempVideoUrl(null);
      })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, 'videos'));
  };

  // Simulate incoming comments in Live view
  useEffect(() => {
    if (view === 'live') {
      const interval = setInterval(() => {
        const newComment = {
          id: Math.random().toString(36),
          text: MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)],
          user: ['Aïcha', 'Moussa', 'Fanta', 'Koffi', 'Yaya'][Math.floor(Math.random() * 5)]
        };
        setComments(prev => [...prev.slice(-12), newComment]);
        
        // Randomly change viewer count
        setViewers(v => Math.max(50, v + (Math.random() > 0.5 ? 2 : -2)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [view]);

  // Simulate buyer notifications in Live view
  useEffect(() => {
    if (view === 'live') {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const user = ['Aminata', 'Bakayoko', 'Sarah', 'Jean'][Math.floor(Math.random() * 4)];
          setNotification(`${user} vient de payer l'avance ! 🛍️`);
          setTimeout(() => setNotification(null), 4000);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    
    if (isCameraOn) {
      // 1. Stop all current tracks first
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        // 2. Clear the source object to release hardware explicitly
        videoRef.current.srcObject = null;
      }

      // Small delay to allow hardware to release if needed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. Update state and start new stream
      setFacingMode(newMode);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: newMode }, 
          audio: view === 'vendeuse-live' 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera switch error:", err);
        // Fallback: try to revert or just show error
        setNotification("Impossible de changer de caméra. Vérifiez les permissions.");
      }
    } else {
      setFacingMode(newMode);
    }
  };

  const addHeart = () => {
    const id = Date.now();
    setHearts(prev => [...prev, { id, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const userComment = {
          id: Math.random().toString(36),
          text: transcript,
          user: 'Moi'
        };
        setComments(prev => [...prev, userComment]);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const enterLive = async (seller: Seller) => {
    setSelectedSeller(seller);
    setCurrentCapture(null);
    setComments([]);
    setLiveProducts([]); // Reset for this live
    setActiveLiveProduct(null);
    setView('live');

    // Fetch this seller's config
    try {
      const configSnap = await getDoc(doc(db, 'seller_live_config', seller.id));
      if (configSnap.exists()) {
        const config = configSnap.data() as SellerLiveConfig;
        setSelectedSellerConfig(config);
        setViewers(config.simulatedViewers);
      } else {
        setSelectedSellerConfig(null);
        setViewers(Math.floor(Math.random() * 500) + 120);
      }
    } catch (err) {
      console.error("Error fetching live config:", err);
    }
  };

  const startVendeuseLive = async () => {
    if (!userProfile) return;
    
    // For demo/simplicity, we still use SELLERS[0] if userProfile isn't fully seller-ready
    // but in reality we should use userProfile data.
    const sellerInfo = SELLERS.find(s => s.name === userProfile.name) || SELLERS[0];
    
    setSelectedSeller(sellerInfo);
    setLiveProducts([]);
    
    const liveId = userProfile.id; // Each seller can have one active live with their ID
    const liveSession: LiveSession = {
      id: liveId,
      sellerId: userProfile.id,
      sellerName: userProfile.name,
      sellerAvatar: userProfile.avatar || BUYER_AVATAR,
      status: 'active',
      viewers: sellerLiveConfig?.simulatedViewers || Math.floor(Math.random() * 100) + 10,
      startedAt: Date.now(),
      products: []
    };

    try {
      // Clean up any existing stream before starting live
      if (videoRef.current?.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }

      await setDoc(doc(db, 'lives', liveId), liveSession);
      setView('live-gateway');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lives/${liveId}`);
    }
  };

  const stopVendeuseLive = async () => {
    if (!userProfile) return;
    try {
      // Update analytics before closing stream
      const revenue = orders.filter(o => o.timestamp > Date.now() - 3600000).reduce((s, o) => s + o.amount, 0);
      const analyticsRef = doc(db, 'seller_analytics', userProfile.id);
      
      const current = sellerAnalytics || {
        id: userProfile.id,
        sellerId: userProfile.id,
        totalRevenue: 0,
        totalLives: 0,
        totalVideoViews: 0,
        dailyStats: [],
        updatedAt: Date.now()
      };
      
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const dailyStats = [...current.dailyStats];
      const todayIdx = dailyStats.findIndex(s => s.date === today);
      if (todayIdx > -1) {
        dailyStats[todayIdx].revenue += revenue;
      } else {
        dailyStats.push({ date: today, revenue, views: 0 });
      }

      await setDoc(analyticsRef, {
        ...current,
        totalRevenue: current.totalRevenue + revenue,
        totalLives: current.totalLives + 1,
        dailyStats: dailyStats.slice(-7),
        updatedAt: Date.now()
      }, { merge: true });

      await setDoc(doc(db, 'lives', userProfile.id), { status: 'ended' }, { merge: true });
      setView('vendeuse');
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraOn(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lives/${userProfile.id}`);
    }
  };

  const handleSellerCapture = () => {
    if (!videoRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720; // Square for products
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 720, 720);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const newProduct: LiveProduct = {
      id: Date.now().toString(),
      image: dataUrl,
      name: `Article #${liveProducts.length + 1}`,
      price: selectedSeller?.price || 5000
    };
    
    setLiveProducts(prev => {
      const updated = prev.length >= 10 ? prev : [...prev, newProduct];
      // Sync with Firestore
      if (userProfile?.id) {
        setDoc(doc(db, 'lives', userProfile.id), { products: updated }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `lives/${userProfile.id}`));
      }
      return updated;
    });
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleCapture = useCallback(() => {
    if (!selectedSeller) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient if camera is off
    if (!isCameraOn) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1280);
      grad.addColorStop(0, selectedSeller.color);
      grad.addColorStop(1, adjustColor(selectedSeller.color, -60));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 1280);
    } else if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, 720, 1280);
    }

    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(0, 800, 720, 480);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('@' + selectedSeller.name, 360, 880);
    ctx.font = '36px Arial';
    ctx.fillText(selectedSeller.product, 360, 950);
    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(selectedSeller.price.toLocaleString('fr-FR') + ' FCFA', 360, 1020);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '28px Arial';
    ctx.fillText(new Date().toLocaleString('fr-FR'), 360, 1100);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCurrentCapture(dataUrl);
    if (navigator.vibrate) navigator.vibrate(30);
    return dataUrl;
  }, [selectedSeller, isCameraOn]);

  const openPayment = async (amount: number) => {
    let capture = currentCapture;
    if (!capture) {
      capture = handleCapture() || null;
    }
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  const handlePay = async (method: string) => {
    if (!selectedSeller || !currentCapture) return;

    if (!userProfile) {
      setShowPaymentModal(false);
      setView('auth');
      return;
    }

    setShowPaymentModal(false);
    const newOrder: Order = {
      id: 'DJ' + Date.now().toString(36).toUpperCase(),
      seller: selectedSeller.name,
      sellerId: selectedSeller.id,
      buyerId: userProfile?.id || 'anonymous',
      sellerWhatsApp: selectedSeller.whatsapp,
      buyerName: userProfile?.name || 'Client',
      buyerAvatar: userProfile?.avatar || BUYER_AVATAR,
      productImage: currentCapture,
      productName: selectedSeller.product,
      amount: paymentAmount,
      method,
      timestamp: Date.now(),
      status: 'completed'
    };
    
    // If it's a specific live product, override the default
    if (activeLiveProduct) {
      newOrder.productName = activeLiveProduct.name;
      newOrder.amount = activeLiveProduct.price;
    }

    const receipt = await generateReceipt(newOrder);
    newOrder.receipt = receipt;
    setOrders(prev => [newOrder, ...prev]);
    // Save order to Firestore
    try {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${newOrder.id}`);
    }
    
    setLastOrder(newOrder);
    setShowSuccessModal(true);
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  };

  const clearHistory = () => {
    if (confirm('Vider tout l\'historique ?')) {
      setOrders([]);
    }
  };

  const getTimeRemaining = (timestamp: number) => {
    const elapsed = Date.now() - timestamp;
    const remaining = 24 * 3600 * 1000 - elapsed;
    if (remaining <= 0) return 'Expiré';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col select-none">
      {(view !== 'auth' && view !== 'feed' && view !== 'live' && view !== 'vendeuse-live' && view !== 'editor') && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-xl flex gap-2 p-2 z-50 border-b border-white/5">
          <button
            onClick={() => { setView('acheteur'); setIsCameraOn(false); }}
            className={`flex-1 rounded-xl font-black text-[10px] tracking-widest transition-all ${
              view === 'acheteur' || view === 'live' || view === 'feed'
                ? 'bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/30' 
                : 'bg-zinc-900 text-zinc-500'
            }`}
          >
            ACHETEUR
          </button>
          <button
            onClick={() => { 
              if (userProfile) {
                setView('vendeuse'); 
              } else {
                setView('auth');
              }
              setIsCameraOn(false); 
            }}
            className={`flex-1 rounded-xl font-black text-[10px] tracking-widest transition-all ${
              view === 'vendeuse' 
                ? 'bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/30' 
                : 'bg-zinc-900 text-zinc-500'
            }`}
          >
            VENDEUSE
          </button>
        </div>
      )}

      <main className={`flex-1 ${(view !== 'auth' && view !== 'feed' && view !== 'live' && view !== 'vendeuse-live' && view !== 'editor') ? 'pt-16' : ''} relative overflow-hidden`}>
        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Auth 
                onAuthComplete={handleAuthComplete} 
                onCancel={() => setView('acheteur')} 
              />
            </motion.div>
          )}
          {view === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <div className="absolute top-12 left-4 z-[130]">
                <button 
                  onClick={() => setView('acheteur')}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>
              <VideoFeed 
                videos={videoFeed} 
                onProductClick={(p) => {
                  setActiveLiveProduct(p);
                  // Simulate a capture for the order receipt if none exists
                  if (!currentCapture) {
                    setCurrentCapture(p.image);
                  }
                  // We need to set a selected seller and current capture context to open payment
                  const seller = SELLERS.find(s => s.id === videoFeed.find(v => v.products.some(pr => pr.id === p.id))?.sellerId) || SELLERS[0];
                  setSelectedSeller(seller);
                  setPaymentAmount(p.price);
                  setShowPaymentModal(true);
                }} 
              />
            </motion.div>
          )}

          {view === 'editor' && tempVideoUrl && (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <VideoEditor 
                videoUrl={tempVideoUrl} 
                initialProducts={userProfile?.role === 'seller' ? (SELLERS.filter(s => s.id === userProfile.id).map(s => ({
                  id: '1',
                  name: s.product,
                  price: s.price,
                  image: `https://picsum.photos/seed/${s.id}/200`
                }))) : []}
                onSave={handlePublishVideo}
                onCancel={() => { setView('vendeuse'); setTempVideoUrl(null); }}
              />
            </motion.div>
          )}

          {view === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <SellerAnalyticsDashboard 
                analytics={sellerAnalytics} 
                videos={videoFeed.filter(v => v.sellerId === userProfile?.id)}
                onBack={() => setView('vendeuse')}
              />
            </motion.div>
          )}

          {view === 'acheteur' && (
            <motion.div
              key="acheteur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="bg-zinc-950 p-4 border-b border-white/5 flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <ShoppingBag className="text-pink-500" /> DJASSA <span className="text-pink-500">LIVE</span>
                </h1>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setView('feed')}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-pink-500/20"
                  >
                    <Zap className="w-3 h-3 fill-current" /> Voir le Flux
                  </button>
                  {userProfile ? (
                    <button 
                      onClick={() => setShowProfileModal(true)}
                      className="w-10 h-10 rounded-xl bg-zinc-900 border-2 border-pink-500 overflow-hidden active:scale-95 transition-transform"
                    >
                      <img src={userProfile.avatar} className="w-full h-full object-cover" alt="" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setView('auth')}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-white/5 text-black"
                    >
                      <User className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-zinc-950 p-4 border-b border-white/5 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un produit, un vendeur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 bg-zinc-900 border border-white/5 rounded-xl px-12 text-sm font-medium focus:border-pink-500 outline-none transition-colors"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Search className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {['Tous', ...new Set(SELLERS.map(s => s.category))].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        filterCategory === cat 
                          ? 'bg-white text-black' 
                          : 'bg-zinc-900 text-zinc-500 border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 px-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                    Max: {maxPrice.toLocaleString()} F
                  </span>
                  <input 
                    type="range" 
                    min="5000" 
                    max="30000" 
                    step="1000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="flex-1 accent-pink-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth">
                {liveSessions
                  .filter(session => {
                    const seller = SELLERS.find(s => s.name === session.sellerName) || SELLERS[0];
                    const matchesSearch = 
                      session.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      seller.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      seller.category.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = filterCategory === 'Tous' || seller.category === filterCategory;
                    const matchesPrice = seller.price <= maxPrice;
                    return matchesSearch && matchesCategory && matchesPrice;
                  })
                  .map(session => {
                    const seller = SELLERS.find(s => s.name === session.sellerName) || SELLERS[0];
                  return (
                    <div
                      key={session.id}
                      onClick={() => enterLive(seller)}
                      className="h-full min-h-[calc(100vh-128px)] snap-start relative flex flex-col justify-end p-8 cursor-pointer group"
                      style={{
                        background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.95) 90%), 
                                     radial-gradient(circle at 30% 20%, ${seller.color}55, transparent 60%),
                                     ${seller.color}22`
                      }}
                    >
                      <div className="absolute top-8 left-8 bg-red-600 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 border border-white/10 z-10 shadow-lg shadow-red-600/20">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_#fff]" />
                        EN DIRECT
                      </div>

                      <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-2 border border-white/10 z-10">
                        <Users className="w-3 h-3 text-pink-500" /> {session.viewers} spectateurs
                      </div>
                      
                      <div className="relative z-10 transition-transform group-active:scale-95 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-pink-500/30">
                            {seller.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <img src={session.sellerAvatar} className="w-12 h-12 rounded-full border-2 border-pink-500 bg-zinc-800" alt="" />
                          <h2 className="text-2xl font-black mb-1 drop-shadow-lg tracking-tight">@{session.sellerName}</h2>
                        </div>
                        <p className="text-lg opacity-90 font-medium mb-1 drop-shadow-md">{seller.product}</p>
                        <div className="text-3xl font-black mb-6 drop-shadow-lg text-pink-500">{seller.price.toLocaleString('fr-FR')} FCFA</div>
                        <div className="flex gap-3">
                          <div className="flex-1 bg-white text-black h-14 rounded-2xl text-center font-black text-[10px] tracking-widest border border-white shadow-2xl uppercase flex items-center justify-center">
                            Rejoindre le Live
                          </div>
                          <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                            <ShoppingBag className="w-6 h-6 text-pink-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {SELLERS
                  .filter(s => {
                    const matchesSearch = 
                      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      s.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.category.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = filterCategory === 'Tous' || s.category === filterCategory;
                    const matchesPrice = s.price <= maxPrice;
                    return matchesSearch && matchesCategory && matchesPrice;
                  })
                  .filter(s => !liveSessions.find(ls => ls.sellerName === s.name))
                  .map(seller => (
                    <div
                      key={seller.id}
                      onClick={() => enterLive(seller)}
                      className="h-full min-h-[calc(100vh-128px)] snap-start relative flex flex-col justify-end p-8 cursor-pointer group"
                      style={{
                        background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.95) 90%), 
                                     radial-gradient(circle at 30% 20%, ${seller.color}55, transparent 60%),
                                     ${seller.color}22`
                      }}
                    >
                      <div className="absolute top-8 left-8 bg-zinc-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 border border-white/10 z-10">
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                        REDIFFUSION
                      </div>
                      
                      <div className="relative z-10 transition-transform group-active:scale-95 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-white/10">
                            {seller.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-zinc-800 flex items-center justify-center font-bold text-sm">
                            {seller.name[0]}
                          </div>
                          <h2 className="text-2xl font-black mb-1 drop-shadow-lg tracking-tight">@{seller.name}</h2>
                        </div>
                        <p className="text-lg opacity-90 font-medium mb-1 drop-shadow-md">{seller.product}</p>
                        <div className="text-3xl font-black mb-6 drop-shadow-lg text-pink-500">{seller.price.toLocaleString('fr-FR')} FCFA</div>
                        <div className="flex gap-3">
                          <div className="flex-1 bg-white/20 backdrop-blur-xl h-14 rounded-2xl text-center font-black text-[10px] tracking-widest border border-white/30 shadow-2xl uppercase flex items-center justify-center">
                            Voir le catalogue
                          </div>
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                            <ShoppingBag className="w-6 h-6 text-pink-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {SELLERS.filter(s => (filterCategory === 'Tous' || s.category === filterCategory) && s.price <= maxPrice).length === 0 && (
                    <div className="h-full flex items-center justify-center p-8 text-center bg-zinc-950">
                      <div className="space-y-4">
                        <ShoppingBag className="w-16 h-16 text-zinc-800 mx-auto" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Aucun vendeur ne correspond à ces critères</p>
                        <button 
                          onClick={() => {setFilterCategory('Tous'); setMaxPrice(30000);}}
                          className="text-pink-500 font-black text-[10px] uppercase tracking-widest"
                        >
                          Réinitialiser les filtres
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          )}

          {view === 'live' && selectedSeller && (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black flex flex-col"
              onClick={addHeart}
            >
              <div className="absolute top-4 left-4 right-4 z-[60] flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setView('acheteur'); setIsCameraOn(false); }}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center font-bold text-[10px] uppercase">
                      {selectedSeller.name[0]}
                    </div>
                    <div className="leading-tight">
                      <div className="text-[10px] font-black tracking-tight">@{selectedSeller.name}</div>
                      <div className="text-[9px] text-zinc-400 font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" /> {viewers}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                  >
                    {isCameraOn ? <VideoOff className="w-5 h-5 text-red-500" /> : <Camera className="w-5 h-5" />}
                  </button>
                  {isCameraOn && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                    >
                      <RefreshCw className={`w-5 h-5 ${facingMode === 'environment' ? 'text-yellow-400' : ''}`} />
                    </button>
                  )}
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
                {isCameraOn ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    } ${
                      selectedSellerConfig?.filter === 'sepia' ? 'sepia' : 
                      selectedSellerConfig?.filter === 'grayscale' ? 'grayscale' : 
                      selectedSellerConfig?.filter === 'warm' ? 'saturate-150 sepia-[0.2]' : ''
                    }`} 
                  />
                ) : (
                  <>
                    <div className="absolute inset-[-20%] animate-[spin_12s_linear_infinite] opacity-40 blur-[60px] bg-[conic-gradient(from_0deg,var(--c1),var(--c2),var(--c1))]" 
                      style={{'--c1': selectedSeller.color, '--c2': adjustColor(selectedSeller.color, -40)} as any}
                    />
                    <div className="relative z-10 text-center">
                      <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-2xl mx-auto mb-6 flex items-center justify-center text-5xl font-black border-4 border-white/20 shadow-2xl">
                        {selectedSeller.name[0]}
                      </div>
                      <h2 className="text-3xl font-black mb-1">@{selectedSeller.name}</h2>
                      <p className="opacity-80 font-bold text-sm">En direct maintenant</p>
                    </div>
                  </>
                )}

                {/* Overlay Image if configured by seller */}
                {selectedSellerConfig?.overlayImage && (
                  <div className="absolute top-20 right-4 w-24 h-24 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl z-20">
                    <img src={selectedSellerConfig.overlayImage} className="w-full h-full object-cover" alt="Overlay" />
                  </div>
                )}

                <div className="absolute bottom-[240px] left-4 right-4 z-20 pointer-events-none space-y-3">
                  <AnimatePresence>
                    {notification && (
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-pink-600/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black border border-white/20 shadow-xl inline-block"
                      >
                        {notification}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="h-44 overflow-hidden flex flex-col justify-end space-y-2.5 opacity-90">
                    {comments.map((c) => (
                      <motion.div key={c.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-2 items-start">
                        <div className="bg-black/30 backdrop-blur-lg px-3 py-1.5 rounded-2xl border border-white/5 text-[11px]">
                          <span className="font-black text-zinc-400 mr-2">{c.user}</span>
                          <span className="font-bold text-white">{c.text}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {hearts.map(h => (
                    <motion.div
                      key={h.id}
                      initial={{ y: 0, opacity: 1, scale: 0.5, x: `${h.left}%` }}
                      animate={{ y: -600, opacity: 0, scale: 2 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="absolute bottom-56 pointer-events-none text-red-500"
                    >
                      <Heart className="fill-current w-10 h-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Vertical Catalog Sidebars for Buyer */}
                <div className="absolute top-20 left-4 bottom-32 w-16 flex flex-col gap-2 z-40">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const product = liveProducts[i];
                    return (
                      <button
                        key={`left-${i}`}
                        onClick={(e) => { e.stopPropagation(); product && setActiveLiveProduct(product); }}
                        className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all bg-black/20 backdrop-blur-md relative ${
                          activeLiveProduct?.id === product?.id && product 
                            ? 'border-pink-500 scale-110 shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                            : lastAddedId === product?.id && product
                            ? 'border-yellow-400 scale-105 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                            : 'border-white/10 opacity-80'
                        }`}
                      >
                        {product ? (
                          <>
                            <img src={product.image} className="w-full h-full object-cover" alt="" />
                            {lastAddedId === product.id && (
                              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[8px] px-1 font-black rounded-bl-lg">NOUVEAU</div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 font-black">L{i+1}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="absolute top-20 right-4 bottom-32 w-16 flex flex-col gap-2 z-40">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const product = liveProducts[i + 5];
                    return (
                      <button
                        key={`right-${i}`}
                        onClick={(e) => { e.stopPropagation(); product && setActiveLiveProduct(product); }}
                        className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all bg-black/20 backdrop-blur-md relative ${
                          activeLiveProduct?.id === product?.id && product 
                            ? 'border-pink-500 scale-110 shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                            : lastAddedId === product?.id && product
                            ? 'border-yellow-400 scale-105 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                            : 'border-white/10 opacity-80'
                        }`}
                      >
                        {product ? (
                          <>
                            <img src={product.image} className="w-full h-full object-cover" alt="" />
                            {lastAddedId === product.id && (
                              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[8px] px-1 font-black rounded-bl-lg">NOUVEAU</div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 font-black">R{i+1}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-950 border-t border-white/5 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative z-30">
                <div className="flex justify-between items-end mb-5">
                  <div className="flex-1">
                    <h3 className="text-xl font-black mb-1">{activeLiveProduct ? activeLiveProduct.name : selectedSeller.product}</h3>
                    <div className="text-2xl font-black text-pink-500 tracking-tight">{(activeLiveProduct ? activeLiveProduct.price : selectedSeller.price).toLocaleString('fr-FR')} FCFA</div>
                  </div>
                  <button className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <Gift className="w-7 h-7 text-yellow-400 fill-yellow-400" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); startVoiceInput(); }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${
                      isListening ? 'bg-red-500 border-red-500 animate-pulse' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Mic className={`w-6 h-6 ${isListening ? 'text-white' : 'text-zinc-400'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCapture(); }}
                    className="flex-1 h-16 bg-white/5 rounded-2xl font-black text-[10px] tracking-widest border border-white/10 flex items-center justify-center gap-2 uppercase"
                  >
                    <Zap className="fill-pink-500 text-pink-500 w-5 h-5" /> CAPTURER
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openPayment(1000); }}
                    className="flex-[1.5] h-16 bg-gradient-to-br from-pink-500 to-orange-600 rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-pink-600/20 uppercase"
                  >
                    CAUTION 1.000 FCFA
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'live-gateway' && userProfile && (
            <LiveGateway 
              sellerName={userProfile.name}
              onConnected={() => setView('vendeuse-live')}
            />
          )}

          {view === 'vendeuse-live' && selectedSeller && (
            <motion.div
              key="vendeuse-live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black flex flex-col"
            >
              <div className="flex-1 relative bg-zinc-900 overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${
                    sellerLiveConfig?.filter === 'sepia' ? 'sepia' : 
                    sellerLiveConfig?.filter === 'grayscale' ? 'grayscale' : 
                    sellerLiveConfig?.filter === 'warm' ? 'saturate-150 sepia-[0.2]' : ''
                  }`} 
                />
                
                {/* Overlay Image if configured */}
                {sellerLiveConfig?.overlayImage && (
                  <div className="absolute top-20 right-4 w-24 h-24 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl z-20">
                    <img src={sellerLiveConfig.overlayImage} className="w-full h-full object-cover" alt="Overlay" />
                  </div>
                )}
                
                {/* Seller Controls Over Overlay */}
                <div className="absolute top-4 left-4 right-4 z-[60] flex items-center justify-between">
                  <button
                    onClick={stopVendeuseLive}
                    className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 text-xs font-black tracking-widest uppercase"
                  >
                    Quitter Live
                  </button>
                  <div className="bg-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-2 animate-pulse">
                    REC 00:42
                  </div>
                </div>

                {/* Sidebar Catalog Review for Seller */}
                <div className="absolute top-20 left-4 bottom-32 w-16 flex flex-col gap-2 z-20">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const product = liveProducts[i];
                    return (
                      <div key={`s-left-${i}`} className="w-16 h-16 rounded-xl border border-white/20 bg-black/40 overflow-hidden">
                        {product && <img src={product.image} className="w-full h-full object-cover" alt="" />}
                      </div>
                    );
                  })}
                </div>
                <div className="absolute top-20 right-4 bottom-32 w-16 flex flex-col gap-2 z-20">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const product = liveProducts[i + 5];
                    return (
                      <div key={`s-right-${i}`} className="w-16 h-16 rounded-xl border border-white/20 bg-black/40 overflow-hidden">
                        {product && <img src={product.image} className="w-full h-full object-cover" alt="" />}
                      </div>
                    );
                  })}
                </div>

                <div className="absolute bottom-32 left-4 right-4 text-center z-10">
                  <p className="text-xs font-black uppercase tracking-widest text-white drop-shadow-lg mb-1">
                    Capturez un article pour vos clients
                  </p>
                  <p className="text-[10px] font-medium text-white/60">Ils verront la photo apparaître sur les côtés</p>
                </div>
              </div>

              <div className="bg-zinc-950 p-8 flex gap-4">
                <button
                  onClick={toggleCamera}
                  className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  {isCameraOn ? <VideoOff className="w-6 h-6 text-red-500" /> : <Camera className="w-6 h-6" />}
                </button>
                <button
                  onClick={switchCamera}
                  className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <RefreshCw className={`w-6 h-6 ${facingMode === 'environment' ? 'text-yellow-400' : ''}`} />
                </button>
                <button
                  onClick={handleSellerCapture}
                  className="flex-1 h-16 bg-white rounded-2xl text-black font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                  <Camera className="w-5 h-5" /> Photographier Article
                </button>
              </div>
            </motion.div>
          )}

          {view === 'vendeuse' && (
            <motion.div key="vendeuse" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="h-full overflow-y-auto bg-black p-6">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 uppercase">
                  <Store className="text-pink-500" /> {userProfile?.name || 'TABLEAU VENDEUSE'}
                </h1>
                <div 
                  className="w-12 h-12 rounded-full border-2 border-pink-500 flex items-center justify-center font-bold text-lg bg-zinc-900 cursor-pointer overflow-hidden active:scale-95 transition-transform" 
                  onClick={() => setShowProfileModal(true)}
                >
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    (userProfile?.name?.[0] || 'V')
                  )}
                </div>
              </div>

              {/* Seller Profile Info Section */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 mb-8 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-white">@{userProfile?.name}</h2>
                  <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1 rounded-full border border-white/5">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-black text-white">{userProfile?.rating || 5.0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 mb-4">
                  <MapPin className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">{userProfile?.location || 'Côte d’Ivoire'}</span>
                </div>
                <p className="text-sm text-zinc-300 font-medium leading-relaxed italic pr-12">
                  "{userProfile?.bio || 'Bienvenue sur ma boutique !'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={startVendeuseLive}
                  className="col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-pink-500 to-orange-500 flex flex-col items-center justify-center gap-3 text-white font-black tracking-widest uppercase active:scale-95 transition-transform shadow-xl shadow-pink-500/20 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Radio className="w-8 h-8" />
                  <div className="flex flex-col items-center">
                    <span className="text-xl">Lancer le Direct</span>
                    <span className="text-[9px] opacity-70 tracking-[0.3em]">Via Passerelle Streaming</span>
                  </div>
                </button>
                <button 
                   onClick={() => {
                      setTempVideoUrl(MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)]);
                      setView('editor');
                    }}
                  className="col-span-1 p-6 rounded-[32px] bg-zinc-900 border border-white/10 flex flex-col items-center justify-center gap-2 text-white font-black tracking-widest uppercase active:scale-95 transition-transform shadow-xl"
                >
                  <Zap className="w-6 h-6 text-pink-500" /> Poste
                </button>
                <button 
                   onClick={() => setView('analytics')}
                  className="col-span-1 p-6 rounded-[32px] bg-zinc-900 border border-white/10 flex flex-col items-center justify-center gap-2 text-white font-black tracking-widest uppercase active:scale-95 transition-transform shadow-xl"
                >
                  <TrendingUp className="w-6 h-6 text-emerald-400" /> Analyt.
                </button>
                <button 
                   onClick={() => setShowConfigModal(true)}
                  className="col-span-1 p-6 rounded-[32px] bg-zinc-900 border border-white/10 flex flex-col items-center justify-center gap-2 text-white font-black tracking-widest uppercase active:scale-95 transition-transform shadow-xl"
                >
                  <Settings className="w-6 h-6 text-zinc-400" /> Config.
                </button>
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="text-4xl font-black text-white mb-1">{orders.length}</div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Ventes Totales</div>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="text-xl font-black text-white mb-1 truncate">{orders.reduce((s, o) => s + o.amount, 0).toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Encaissé FCFA</div>
                </div>
              </div>

              <div className="flex bg-zinc-900/50 rounded-2xl p-1 gap-1 mb-8 border border-white/5">
                <button
                  onClick={() => setSellerTab('actives')}
                  className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    sellerTab === 'actives' ? 'bg-white text-black shadow-lg' : 'text-zinc-600'
                  }`}
                >
                  Confirmées
                </button>
                <button
                  onClick={() => setSellerTab('expirees')}
                  className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    sellerTab === 'expirees' ? 'bg-white text-black shadow-lg' : 'text-zinc-600'
                  }`}
                >
                  Historique
                </button>
              </div>

              <div className="space-y-3 min-h-[400px]">
                {orders.filter(o => {
                  const active = Date.now() - o.timestamp < 24 * 3600 * 1000;
                  return sellerTab === 'actives' ? active : !active;
                }).map(order => (
                  <motion.div layout key={order.id} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <img src={order.buyerAvatar} className="w-12 h-12 rounded-full border-2 border-white/10" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-zinc-600 font-black mb-1 uppercase tracking-tighter">#{order.id}</div>
                      <h4 className="font-black text-sm text-white truncate uppercase">{order.buyerName}</h4>
                      <div className="text-xs font-black text-pink-500">{order.amount.toLocaleString()} FCFA</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={clearHistory} className="w-full mt-10 p-5 rounded-3xl bg-zinc-950 text-zinc-800 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> EFFACER TOUT
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showProfileModal && userProfile && (
          <UserProfileModal 
            initialProfile={userProfile}
            onSave={handleSaveProfile}
            onClose={() => setShowProfileModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfigModal && (
          <LiveConfigModal 
            initialConfig={sellerLiveConfig}
            onSave={handleSaveLiveConfig}
            onClose={() => setShowConfigModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && currentCapture && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white text-black w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] p-8 pb-14 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8 sm:hidden" />
              <div className="relative mb-8 aspect-video overflow-hidden rounded-[32px] shadow-2xl">
                <img src={currentCapture} className="w-full h-full object-cover" alt="" />
              </div>
              <h2 className="text-3xl font-black mb-1 tracking-tighter">Payer {paymentAmount.toLocaleString('fr-FR')} FCFA</h2>
              <p className="text-zinc-500 font-black text-[11px] uppercase tracking-widest mb-8">{selectedSeller?.product} â€¢ @{selectedSeller?.name}</p>
              <div className="grid gap-3.5">
                <button onClick={() => handlePay('Wave')} className="h-18 rounded-3xl bg-[#0089ff] text-white font-black text-xl flex items-center justify-center gap-4">Wave <Send className="w-4 h-4 fill-white" /></button>
                <button onClick={() => handlePay('Orange Money')} className="h-18 rounded-3xl bg-[#ff7900] text-white font-black text-xl">Orange Money</button>
                <button onClick={() => handlePay('MTN MoMo')} className="h-18 rounded-3xl bg-[#ffcc00] text-black font-black text-xl">MTN MoMo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && lastOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black flex items-center justify-center p-8 backdrop-blur-3xl">
            <div className="text-center w-full max-w-sm">
              <div className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-8 flex items-center justify-center text-white"><CheckCircle2 className="w-12 h-12" /></div>
              <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase italic">Confirmé</h2>
              <img src={lastOrder.receipt} className="w-56 h-72 object-cover rounded-[32px] mx-auto mb-12 border-4 border-white shadow-2xl rotate-2" alt="" />
              <div className="grid gap-3.5">
                <button onClick={() => { const a = document.createElement('a'); a.href = lastOrder.receipt!; a.download = `djassa-${lastOrder.id}.png`; a.click(); }} className="w-full h-18 rounded-3xl bg-white text-black font-black text-sm tracking-widest flex items-center justify-center gap-3 uppercase">
                  <Download className="w-5 h-5" /> Enregistrer Reçu
                </button>
                <button onClick={() => { const num = lastOrder.sellerWhatsApp.replace(/\D/g, ''); window.open(`https://wa.me/${num}?text=Confirmé`); }} className="w-full h-18 rounded-3xl bg-green-600 text-white font-black text-sm tracking-widest flex items-center justify-center gap-3 uppercase">
                  <MessageCircle className="w-5 h-5" /> WhatsApp Vendeuse
                </button>
                <button onClick={() => { setShowSuccessModal(false); setView('acheteur'); }} className="w-full py-6 text-zinc-700 font-black text-[10px] uppercase tracking-widest">Fermer</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{flash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white pointer-events-none" />}</AnimatePresence>
    </div>
  );
}
