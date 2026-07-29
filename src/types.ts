export interface Seller {
  id: string;
  name: string;
  product: string;
  category: string;
  price: number;
  whatsapp: string;
  color: string;
  location: string;
  bio: string;
  rating: number;
}

export interface Order {
  id: string;
  seller: string;
  sellerId: string;
  buyerId: string;
  sellerWhatsApp: string;
  buyerName: string;
  buyerAvatar: string;
  productImage: string;
  productName: string;
  amount: number;
  method: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'cancelled';
  receipt?: string;
}

export interface LiveProduct {
  id: string;
  image: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export type AppView = 'auth' | 'acheteur' | 'vendeuse' | 'live' | 'vendeuse-live' | 'editor' | 'feed' | 'analytics' | 'live-gateway';

export interface Sticker {
  id: string;
  type: 'price';
  price: number;
  x: number;
  y: number;
  animation: 'pulse' | 'bounce' | 'rotate';
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number; // in seconds
  genre: 'Zouglou' | 'Coupé-décalé' | 'Trending';
}

export interface VideoPost {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  products: LiveProduct[];
  tags: { productId: string; x: number; y: number }[];
  audioId?: string;
  filter?: 'normal' | 'éclat';
  stickers: Sticker[];
  // Algorithm metrics
  completionRate: number;
  shareCount: number;
  viewCount: number;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'buyer' | 'seller';
  bio?: string;
  location?: string;
  rating?: number;
  avatar?: string;
}

export interface LiveSession {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  status: 'active' | 'ended';
  viewers: number;
  startedAt: number;
  peakViewers?: number;
  totalSales?: number;
  products?: LiveProduct[];
}

export interface SellerAnalytics {
  id: string;
  sellerId: string;
  totalRevenue: number;
  totalLives: number;
  totalVideoViews: number;
  dailyStats: { date: string; revenue: number; views: number }[];
  updatedAt: number;
}

export interface SellerLiveConfig {
  sellerId: string;
  simulatedViewers: number;
  overlayImage?: string;
  showLocation: boolean;
  filter: 'none' | 'sepia' | 'grayscale' | 'warm';
  updatedAt: number;
}
