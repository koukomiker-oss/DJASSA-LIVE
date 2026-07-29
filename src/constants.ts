import { Seller } from './types';

export const SELLERS: Seller[] = [
  { id: '1', name: 'Maman Africa', product: 'Pagne Kita Authentique', category: 'Mode', price: 25000, color: '#ec4899', whatsapp: '+2250101010101', location: 'Adjamé, Abidjan', bio: 'Pagne Kita de qualité supérieure.', rating: 4.9 },
  { id: '2', name: 'Djassa Phone', product: 'iPhone 15 Pro Max', category: 'Tech', price: 850000, color: '#06b6d4', whatsapp: '+2250101010102', location: 'Plateau, Abidjan', bio: 'High tech au meilleur prix.', rating: 4.8 },
  { id: '3', name: 'Épices de Katiola', product: 'Piment Sec (Le Kilo)', category: 'Marché', price: 1500, color: '#f97316', whatsapp: '+2250101010103', location: 'Katiola, CIV', bio: 'Épices naturelles du pays.', rating: 4.7 },
  { id: '4', name: 'Bijoux Bédié', product: 'Collier Or 18k', category: 'Bijoux', price: 120000, color: '#eab308', whatsapp: '+2250101010104', location: 'Cocody, Abidjan', bio: 'Or certifié et bijoux fins.', rating: 4.9 },
  { id: '5', name: 'Abidjan Sneakers', product: 'Nike Air Max Plus', category: 'Street', price: 45000, color: '#8b5cf6', whatsapp: '+2250101010105', location: 'Marcory, Abidjan', bio: 'Les meilleures baskets d\'Abidjan.', rating: 4.6 },
  { id: '6', name: 'Le Glacier', product: 'Glace Coco Traditionnelle', category: 'Gastro', price: 500, color: '#10b981', whatsapp: '+2250101010106', location: 'Bingerville, CIV', bio: 'Fraîcheur ivoirienne.', rating: 4.5 },
  { id: '7', name: 'Beauty By Amina', product: 'Parfum de Dubaï', category: 'Beauté', price: 18000, color: '#ec4899', whatsapp: '+2250101010107', location: 'Angré, Abidjan', bio: 'Senteurs orientales.', rating: 4.8 },
  { id: '8', name: 'Electro Ivoire', product: 'Smart TV 55 pouces', category: 'Tech', price: 220000, color: '#3b82f6', whatsapp: '+2250101010108', location: 'Koumassi, Abidjan', bio: 'Électroménager garanti.', rating: 4.4 },
  { id: '9', name: 'Petit Marché', product: 'Sac de Riz de 25kg', category: 'Alim', price: 11500, color: '#ef4444', whatsapp: '+2250101010109', location: 'Yopougon, Abidjan', bio: 'Gros et détail.', rating: 4.3 },
  { id: '10', name: 'Wax Design', product: 'Ensemble Homme Wax', category: 'Mode', price: 35000, color: '#14b8a6', whatsapp: '+2250101010110', location: 'Treichville, Abidjan', bio: 'Mode africaine moderne.', rating: 4.7 }
];

export const BUYER_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23ff6f00'/><stop offset='100%' stop-color='%23e91e63'/></linearGradient></defs><rect width='100' height='100' rx='50' fill='url(%23g)'/><text x='50' y='64' font-family='Arial Black' font-size='48' fill='white' text-anchor='middle' font-weight='900'>A</text></svg>`);

export const AUDIO_TRACKS: any[] = [
  { id: 'a1', title: 'Espoir 2000', artist: 'Zouglou', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 15, genre: 'Zouglou' },
  { id: 'a2', title: 'Premier Gaou', artist: 'Magic System', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 15, genre: 'Zouglou' },
  { id: 'a3', title: 'Guitare', artist: 'Ariel Sheney', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 15, genre: 'Coupé-décalé' },
  { id: 'a4', title: 'C\'est Gate', artist: 'Didi B', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 15, genre: 'Populaire' }
];

export const MOCK_VIDEOS = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
  "https://www.w3schools.com/html/movie.mp4",
  "https://media.w3.org/2010/05/bunny/trailer.mp4"
];

// URLs for adaptive bitrate simulation
export const VIDEO_SOURCES: Record<string, { hd: string; sd: string }> = {
  "v0": {
    hd: "https://www.w3schools.com/html/mov_bbb.mp4",
    sd: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  "v1": {
    hd: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    sd: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4"
  }
};
