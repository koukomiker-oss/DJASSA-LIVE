import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingCart, Video, ArrowLeft, 
  Calendar, Download, Filter 
} from 'lucide-react';
import { SellerAnalytics, VideoPost } from '../types';

interface DashboardProps {
  analytics: SellerAnalytics | null;
  videos: VideoPost[];
  onBack: () => void;
}

export default function SellerAnalyticsDashboard({ analytics, videos, onBack }: DashboardProps) {
  // Mock data if analytics is null for demo purposes
  const data = analytics || {
    totalRevenue: 1250000,
    totalLives: 12,
    totalVideoViews: 45000,
    dailyStats: [
      { date: '01/05', revenue: 45000, views: 1200 },
      { date: '02/05', revenue: 52000, views: 1500 },
      { date: '03/05', revenue: 38000, views: 1100 },
      { date: '04/05', revenue: 85000, views: 2500 },
      { date: '05/05', revenue: 65000, views: 1800 },
      { date: '06/05', revenue: 95000, views: 3200 },
    ]
  };

  const topVideos = [...videos]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black">Tableau de Bord</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Analyses de performance</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="Revenu Total" 
          value={`${data.totalRevenue.toLocaleString()} F`} 
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          trend="+12%"
          color="emerald"
        />
        <StatCard 
          label="Vues Vidéos" 
          value={data.totalVideoViews.toLocaleString()} 
          icon={<Video className="w-4 h-4 text-pink-500" />}
          trend="+24%"
          color="pink"
        />
        <StatCard 
          label="Ventes Lives" 
          value="84" 
          icon={<ShoppingCart className="w-4 h-4 text-orange-400" />}
          trend="+8%"
          color="orange"
        />
        <StatCard 
          label="Audiences" 
          value="12.5k" 
          icon={<Users className="w-4 h-4 text-blue-400" />}
          trend="+15%"
          color="blue"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-6 mb-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-sm uppercase tracking-widest">Revenus (CFA)</h3>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyStats}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#71717a', fontSize: 10, fontWeight: 700}}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: '#ec4899', fontWeight: 900 }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#ec4899" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorRev)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-widest text-zinc-500">Top Vidéos</h3>
          <button className="text-[10px] font-black text-pink-500 uppercase">Voir tout</button>
        </div>
        
        {topVideos.map((video, i) => (
          <div key={video.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex gap-4 items-center">
            <div className="w-12 h-16 rounded-xl bg-zinc-800 flex-none relative overflow-hidden">
               <video src={video.videoUrl} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="text-[10px] font-black">#{i+1}</span>
               </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate mb-1">{video.caption || "Nouvelle collection..."}</p>
              <div className="flex gap-3">
                 <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-black text-zinc-400">{video.viewCount} vues</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400">{(video.completionRate * 100).toFixed(0)}% compl.</span>
                 </div>
              </div>
            </div>
            <button className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
               <Download className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    pink: 'bg-pink-500/10 text-pink-400',
    orange: 'bg-orange-500/10 text-orange-400',
    blue: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <motion.div 
      whileActive={{ scale: 0.98 }}
      className="bg-zinc-900 border border-white/5 p-5 rounded-[28px] relative overflow-hidden group shadow-xl"
    >
      <div className={`w-8 h-8 rounded-full ${colors[color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-lg font-black">{value}</p>
        <span className="text-[10px] font-bold text-emerald-400">{trend}</span>
      </div>
    </motion.div>
  );
}
