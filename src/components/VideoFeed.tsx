import React, { useState, useEffect, useRef, UIEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Heart, MessageCircle, Share2, Music, X, ChevronRight, Zap } from 'lucide-react';
import { VideoPost, LiveProduct } from '../types';
import { rankVideos } from '../lib/algorithm';
import { VIDEO_SOURCES, MOCK_VIDEOS } from '../constants';

interface VideoFeedProps {
  videos: VideoPost[];
  onProductClick: (product: LiveProduct) => void;
}

export default function VideoFeed({ videos, onProductClick }: VideoFeedProps) {
  const [rankedVideos, setRankedVideos] = useState<VideoPost[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<LiveProduct | null>(null);
  const [connectionType, setConnectionType] = useState<'4G' | 'Wifi' | 'Low'>('4G');
  
  useEffect(() => {
    setRankedVideos(rankVideos(videos));
  }, [videos]);

  // Simulate network detection
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn) {
      if (conn.effectiveType === '4g' || conn.type === 'wifi') {
        setConnectionType('Wifi');
      } else {
        setConnectionType('Low');
      }
    }
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight;
    const index = Math.round(scrollPos / height);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <div className="h-full bg-black relative">
      {/* Top Tabs (TikTok style) */}
      <div className="absolute top-10 left-0 right-0 z-[120] flex justify-center gap-6 text-white/60 font-black text-sm pointer-events-none">
        <button className="pointer-events-auto border-b-2 border-transparent pb-1">Suivis</button>
        <button className="pointer-events-auto border-b-2 border-white text-white pb-1">Pour toi</button>
      </div>

      <div 
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {rankedVideos.map((video, idx) => (
          <VideoItem 
            key={video.id}
            video={video}
            isActive={idx === activeIndex}
            connectionType={connectionType}
            onProductTagClick={setSelectedProduct}
          />
        ))}
      </div>

      {/* Product Sheet Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div 
              className="bg-zinc-950 p-6 rounded-t-[32px] border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />
              <div className="flex gap-4 mb-6">
                <img src={selectedProduct.image} className="w-24 h-24 rounded-2xl object-cover border border-white/10" alt="" />
                <div className="flex-1">
                  <h3 className="text-xl font-black mb-1">{selectedProduct.name}</h3>
                  <p className="text-pink-500 font-black text-2xl">{selectedProduct.price.toLocaleString()} F</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">{selectedProduct.category}</p>
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                {selectedProduct.description || "Top qualité disponible immédiatement. Livraison express partout à Abidjan."}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => onProductClick(selectedProduct)}
                  className="flex-1 h-14 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Commander <ChevronRight className="w-4 h-4" />
                </button>
                <button className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface VideoItemProps {
  video: VideoPost;
  isActive: boolean;
  connectionType: string;
  onProductTagClick: (p: LiveProduct) => void;
  key?: any;
}

function VideoItem({ 
  video, 
  isActive, 
  connectionType,
  onProductTagClick 
}: VideoItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Adaptive compression logic: simulated by selecting HD or SD source
  const sources = VIDEO_SOURCES[video.id] || { hd: video.videoUrl, sd: video.videoUrl };
  const rawSrc = (connectionType === 'Low' ? sources.sd : sources.hd) || video.videoUrl || MOCK_VIDEOS[0];
  const videoSrc = rawSrc;

  const [liked, setLiked] = useState(false);
  const [localHearts, setLocalHearts] = useState<{id: number, x: number, y: number}[]>([]);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [videoSrc]);

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Basic double tap logic or generic interaction to spawn hearts
    addHeart(e);
    if (!liked) setLiked(true);
  };

  const addHeart = (e: any) => {
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX) || window.innerWidth / 2;
    const y = e.clientY || (e.touches && e.touches[0].clientY) || window.innerHeight / 2;
    setLocalHearts(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setLocalHearts(prev => prev.filter(h => h.id !== id));
    }, 1000);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Djassa Live - @${video.sellerName}`,
      text: `${video.caption}\n\nRetrouve les articles de @${video.sellerName} sur Djassa Live !`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Lien de la vidéo copié !');
      }
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(e => {
        console.error("Video play failed:", e);
        setVideoError(true);
      });
    } else {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [isActive, videoSrc]);

  const finalVideoSrc = videoError ? "https://www.w3schools.com/html/mov_bbb.mp4" : videoSrc;

  return (
    <div 
      className="h-full snap-start relative flex flex-col items-center justify-center bg-zinc-900" 
      onDoubleClick={handleDoubleTap}
    >
      <video
        ref={videoRef}
        src={finalVideoSrc}
        className={`w-full h-full object-cover transition-all duration-700 ${video.filter === 'éclat' ? 'brightness-125 contrast-110 saturate-125' : ''}`}
        loop
        playsInline
        muted
        autoPlay
        onError={() => setVideoError(true)}
      />

      {/* Tapping Hearts */}
      <AnimatePresence>
        {localHearts.map(h => (
          <motion.div
            key={h.id}
            initial={{ scale: 0, opacity: 0, y: 0 }}
            animate={{ scale: [1, 1.5, 1.2], opacity: [1, 0.8, 0], y: -100 }}
            exit={{ opacity: 0 }}
            className="absolute z-[150] pointer-events-none"
            style={{ left: h.x - 40, top: h.y - 40 }}
          >
            <Heart className="w-20 h-20 text-pink-500 fill-pink-500 drop-shadow-2xl" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Animated Stickers Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {video.stickers?.map(sticker => (
          <motion.div
            key={sticker.id}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: 1 
            }}
            transition={{ 
              repeat: Infinity,
              duration: 2
            }}
            style={{ left: `${sticker.x}%`, top: `${sticker.y}%` }}
            className="absolute bg-pink-500 text-white px-3 py-1.5 rounded-full font-black text-xs shadow-lg border-2 border-white/20 whitespace-nowrap"
          >
            {sticker.price.toLocaleString()} F
          </motion.div>
        ))}
      </div>

      {/* Network Indicator (Debug/Sim) */}
      <div className="absolute top-20 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-black tracking-widest text-zinc-400 flex items-center gap-1">
        <Zap className={`w-3 h-3 ${connectionType !== 'Low' ? 'text-green-500' : 'text-orange-500'}`} />
        {connectionType === 'Low' ? 'SD' : 'HD'} 
      </div>

      {/* Interactive Products - Trigger points on the left/right */}
      {/* 5 Points on the Left */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        {video.products.slice(0, 5).map((p, i) => (
          <button
            key={`left-${p.id}`}
            onClick={() => onProductTagClick(p)}
            className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center overflow-hidden active:scale-90 transition-transform shadow-2xl"
          >
            <img src={p.image} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="" />
          </button>
        ))}
      </div>

      {/* 5 Points on the Right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        {video.products.slice(5, 10).map((p, i) => (
          <button
            key={`right-${p.id}`}
            onClick={() => onProductTagClick(p)}
            className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center overflow-hidden active:scale-90 transition-transform shadow-2xl"
          >
            <img src={p.image} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="" />
          </button>
        ))}
      </div>

      {/* Content Info */}
      <div className="absolute bottom-10 left-4 right-16 pointer-events-none">
        <div className="flex items-center gap-3 mb-4">
          <img src={video.sellerAvatar} className="w-10 h-10 rounded-full border-2 border-white shadow-lg" alt="" />
          <div>
            <h4 className="font-black text-sm drop-shadow-lg">@{video.sellerName}</h4>
            <div className="flex items-center gap-2">
              <span className="bg-pink-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">VENDEUSE</span>
            </div>
          </div>
        </div>
        <p className="text-sm font-medium leading-tight mb-4 drop-shadow-md mr-10">
          {video.caption}
        </p>
        <div className="flex items-center gap-2 opacity-80">
          <Music className="w-4 h-4" />
          <p className="text-[10px] font-bold tracking-tight overflow-hidden whitespace-nowrap">
            Son tendance - Afrobeat DJ Remix...
          </p>
        </div>
      </div>

      {/* Right Sidebar Actions */}
      <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setLiked(!liked)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart className={`w-6 h-6 ${liked ? 'text-pink-500 fill-pink-500' : 'text-white'}`} />
          </button>
          <span className="text-[10px] font-black">{liked ? '2.4k' : '2.4k'}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
            <MessageCircle className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-black">128</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-[10px] font-black">{video.shareCount}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-700 p-1 animate-[spin_4s_linear_infinite]">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
            <Music className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
