import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, Tag, Save, X, Play, Pause } from 'lucide-react';
import { AudioTrack, Sticker, VideoPost, LiveProduct } from '../types';
import { AUDIO_TRACKS, MOCK_VIDEOS } from '../constants';

interface VideoEditorProps {
  videoUrl: string;
  initialProducts?: LiveProduct[];
  onSave: (data: Partial<VideoPost>) => void;
  onCancel: () => void;
}

export default function VideoEditor({ videoUrl, initialProducts = [], onSave, onCancel }: VideoEditorProps) {
  const [filter, setFilter] = useState<'normal' | 'éclat'>('normal');
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [caption, setCaption] = useState('Nouvelle arrivage ! 🎉 #Djassa');
  const [products, setProducts] = useState<LiveProduct[]>(initialProducts.length > 0 ? initialProducts : [
    { id: '1', name: 'Nouveau Produit', price: 5000, image: 'https://picsum.photos/seed/new/200' }
  ]);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    } else {
      videoRef.current?.play().catch(() => setVideoError(true));
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const addPriceSticker = () => {
    const newSticker: Sticker = {
      id: Math.random().toString(36).substring(7),
      type: 'price',
      price: products[0]?.price || 5000,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      animation: 'pulse'
    };
    setStickers([...stickers, newSticker]);
    setEditingStickerId(newSticker.id);
  };

  const updateStickerPrice = (id: string, price: number) => {
    setStickers(stickers.map(s => s.id === id ? { ...s, price } : s));
  };

  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id));
    setEditingStickerId(null);
  };

  const updateProduct = (id: string, updates: Partial<LiveProduct>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleSave = () => {
    onSave({
      filter,
      audioId: selectedAudio?.id,
      stickers,
      caption,
      products,
      videoUrl // In real app, this would be the processed/uploaded URL
    });
  };

  const finalVideoUrl = videoError ? "https://www.w3schools.com/html/mov_bbb.mp4" : (videoUrl || MOCK_VIDEOS[0]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={onCancel} className="p-2 bg-zinc-900 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-black text-xs uppercase tracking-widest">Éditeur Vidéo</h2>
        <button 
          onClick={handleSave}
          className="bg-pink-500 px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
        >
          <Save className="w-4 h-4" /> PUBLIER
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          src={finalVideoUrl}
          className={`max-h-full w-full object-contain transition-all duration-500 ${
            filter === 'éclat' ? 'brightness-125 contrast-110 saturate-125' : ''
          }`}
          loop
          playsInline
          onEnded={() => setIsPlaying(false)}
          onError={() => setVideoError(true)}
        />

        {/* Stickers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {stickers.map(sticker => (
            <motion.div
              key={sticker.id}
              initial={{ scale: 0 }}
              animate={{ 
                scale: editingStickerId === sticker.id ? [1, 1.05, 1] : [1, 1.1, 1],
                opacity: 1 
              }}
              transition={{ 
                repeat: Infinity,
                duration: 2
              }}
              style={{ left: `${sticker.x}%`, top: `${sticker.y}%` }}
              className={`absolute pointer-events-auto px-4 py-2 rounded-full font-black text-base shadow-2xl border-2 transition-all cursor-pointer ${
                editingStickerId === sticker.id ? 'bg-white text-pink-500 border-pink-500 z-50' : 'bg-pink-500 text-white border-white/20'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingStickerId(sticker.id);
              }}
            >
              {sticker.price.toLocaleString()} F
            </motion.div>
          ))}
        </div>

        {/* Price Editor Overlay */}
        <AnimatePresence>
          {editingStickerId && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 z-[70] bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modifier le prix</span>
                <button onClick={() => setEditingStickerId(null)} className="text-zinc-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-3">
                <input 
                  type="number"
                  autoFocus
                  className="flex-1 bg-zinc-100 rounded-2xl px-4 py-3 font-black text-zinc-900 border-none focus:ring-2 focus:ring-pink-500"
                  value={stickers.find(s => s.id === editingStickerId)?.price || ''}
                  onChange={(e) => updateStickerPrice(editingStickerId, parseInt(e.target.value) || 0)}
                />
                <button 
                  onClick={() => removeSticker(editingStickerId)}
                  className="aspect-square bg-red-50 text-red-500 rounded-2xl flex items-center justify-center p-3"
                >
                  <X className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setEditingStickerId(null)}
                  className="bg-green-500 text-white font-black px-6 rounded-2xl"
                >
                  OK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/40 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-6 bg-zinc-950 border-t border-white/10 space-y-6 overflow-y-auto no-scrollbar">
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Légende</p>
          <textarea 
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-zinc-900 rounded-2xl p-4 text-xs font-bold border border-white/5 focus:border-pink-500 focus:ring-0 transition-all text-white h-20 resize-none"
            placeholder="Écrivez une légende captivante..."
          />
        </div>

        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Produits & Prix</p>
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                <img src={product.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                <div className="flex-1 space-y-2">
                  <input 
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                    className="w-full bg-transparent p-0 border-none font-black text-xs text-white focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={product.price}
                      onChange={(e) => updateProduct(product.id, { price: parseInt(e.target.value) || 0 })}
                      className="w-24 bg-zinc-800 rounded-lg px-2 py-1 font-black text-[10px] text-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                    <span className="text-[10px] font-black text-zinc-500">F CFA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Filtres</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setFilter('normal')}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                filter === 'normal' ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-zinc-900'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800" />
              <span className="text-[9px] font-bold">Normal</span>
            </button>
            <button 
              onClick={() => setFilter('éclat')}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                filter === 'éclat' ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-zinc-900'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 animate-pulse" />
              <span className="text-[9px] font-bold text-orange-400">ÉCLAT</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Audio (15s Tendances)</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {AUDIO_TRACKS.map(track => (
              <button
                key={track.id}
                onClick={() => setSelectedAudio(track)}
                className={`flex-none w-32 p-3 rounded-xl border transition-all ${
                  selectedAudio?.id === track.id ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-zinc-400'
                }`}
              >
                <Music className={`w-4 h-4 mb-2 ${selectedAudio?.id === track.id ? 'text-pink-500' : ''}`} />
                <p className="text-[10px] font-black truncate">{track.title}</p>
                <p className="text-[8px] font-bold opacity-60 uppercase">{track.genre}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={addPriceSticker}
            className="flex-1 h-12 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-pink-500 active:scale-95 transition-transform"
          >
            <Tag className="w-4 h-4" /> AJOUTER UN PRIX
          </button>
        </div>
      </div>

      {selectedAudio && (
        <audio 
          ref={audioRef}
          src={selectedAudio.url}
          className="hidden"
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
