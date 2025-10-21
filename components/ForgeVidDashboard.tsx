"use client";
import React, { useEffect, useState } from "react";
import MetricCard from "./MetricCard";
import VideoCard from "./VideoCard";
import { FiSearch, FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const AIEditingPanel = dynamic(() => import("./ai-editing-panel"), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-800/20 rounded-lg animate-pulse" />
});
const StoryboardingPanel = dynamic(() => import("./storyboarding-panel"), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-800/20 rounded-lg animate-pulse" />
});
const TemplatesMediaPanel = dynamic(() => import("./templates-media-panel"), { 
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-800/20 rounded-lg animate-pulse" />
});
const VideoPreview = dynamic(() => import("./video-preview"), { 
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-800/20 rounded-lg animate-pulse" />
});
const VoiceToVideoPanel = dynamic(() => import("./voice-to-video-panel"), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-800/20 rounded-lg animate-pulse" />
});

// Helper to format seconds to mm:ss
function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Types for HyperMind API
type Metric = { label: string; value: string | number; trend?: string };
type Insight = { title: string; description: string; icon?: string };

export default function ForgeVidDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHyperMind() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/hypermind");
        if (!res.ok) throw new Error("Failed to fetch HyperMind data");
        const data = await res.json();
        setMetrics(data.metrics || []);
        setInsights(data.insights || []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchHyperMind();
  }, []);

  useEffect(() => {
    async function fetchVideos() {
      setVideosLoading(true);
      setVideosError(null);
      try {
        const res = await fetch("/api/videos");
        if (!res.ok) throw new Error("Failed to fetch videos");
        const data = await res.json();
        setVideos(data.videos || []);
      } catch (err: any) {
        setVideosError(err.message || "Unknown error");
      } finally {
        setVideosLoading(false);
      }
    }
    fetchVideos();
  }, []);

  useEffect(() => {
    async function fetchTemplates() {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const res = await fetch("/api/templates");
        if (!res.ok) throw new Error("Failed to fetch templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (err: any) {
        setTemplatesError(err.message || "Unknown error");
      } finally {
        setTemplatesLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // Group metrics for highlighting
  const collaborationLabels = [
    "Active Collaboration Rooms",
    "Total Collaboration Rooms",
    "Collaboration Messages",
    "Collaboration Edits"
  ];
  const aiLabels = [
    "AI Generations (AIGeneration)",
    "AI Tokens Used",
    "AI Cost (USD)"
  ];
  const collaborationMetrics = metrics.filter(m => collaborationLabels.includes(m.label));
  const aiMetrics = metrics.filter(m => aiLabels.includes(m.label));
  const otherMetrics = metrics.filter(m => !collaborationLabels.includes(m.label) && !aiLabels.includes(m.label));

  return (
    <div className="min-h-[900px]">

        {/* Main */}
        <main>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                Welcome to ForgeVid
              </h1>
              <p className="text-gray-300 text-lg">Create amazing videos with AI-powered tools</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos, templates..."
                  className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25">
                <FiPlus className="h-4 w-4" />
                New Project
              </button>
            </div>
          </div>

          {/* Main Features - Now at the top */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI-Powered Tools</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{minHeight: '400px'}}>
              <AIEditingPanel />
              <StoryboardingPanel />
              <TemplatesMediaPanel />
              <VideoPreview />
              <VoiceToVideoPanel />
            </div>
          </div>


          {/* ...existing code for insights, templates, videos ... */}

          {/* Template grid */}
          <div className="mb-16 h-[900px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-10 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">Video Templates</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 h-[800px] min-w-full">
              {templatesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/6 min-h-[260px] animate-pulse bg-gray-800/40">
                    <div className="w-full h-40 bg-gray-700" />
                    <div className="p-4">
                      <div className="h-5 w-2/3 bg-gray-700 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-gray-700 rounded mb-2" />
                      <div className="flex gap-2">
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                      </div>
                    </div>
                  </div>
                ))
              ) : templatesError ? (
                <div className="col-span-3 text-center text-red-400 py-8">{templatesError}</div>
              ) : templates.length > 0 ? (
                templates.map((t) => (
                  <div key={t.id} className="glass-card rounded-2xl overflow-hidden border border-white/6 min-h-[260px]">
                    <img src={t.thumbnail || '/placeholder.svg'} alt={t.name} className="w-full h-40 object-cover" width="320" height="160" style={{aspectRatio: '2/1'}} />
                    <div className="p-4">
                      <h3 className="text-white font-semibold text-lg mb-1">{t.name}</h3>
                      <p className="text-sm text-gray-300 mb-2">{t.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{t.category}</span>
                        <span>{t.resolution}</span>
                        <span>{formatDuration(t.duration)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/6 min-h-[260px] bg-gray-800/40">
                    <div className="w-full h-40 bg-gray-700" />
                    <div className="p-4">
                      <div className="h-5 w-2/3 bg-gray-700 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-gray-700 rounded mb-2" />
                      <div className="flex gap-2">
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                        <div className="h-3 w-12 bg-gray-700 rounded" />
                      </div>
                    </div>
                    <div className="text-center text-gray-400 mt-2">No templates found</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Video grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{minHeight: '700px'}}>
            {videosLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/6 min-h-[220px] animate-pulse bg-gray-800/40">
                  <div className="w-full h-40 bg-gray-700" />
                  <div className="p-4">
                    <div className="h-5 w-2/3 bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-gray-700 rounded mb-2" />
                  </div>
                </div>
              ))
            ) : videosError ? (
              <div className="col-span-3 text-center text-red-400 py-8">{videosError}</div>
            ) : videos.length > 0 ? (
              videos.map((v) => (
                <VideoCard
                  key={v.id}
                  title={v.title}
                  subtitle={v.description || v.summary || ''}
                  thumbnail={v.thumbnail || v.fileUrl || '/placeholder.svg'}
                  status={v.status}
                  views={v.analytics?.[0]?.views || 0}
                  duration={formatDuration(v.duration)}
                  width={320}
                  height={180}
                  aspectRatio="16/9"
                />
              ))
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/6 min-h-[220px] bg-gray-800/40">
                  <div className="w-full h-40 bg-gray-700" />
                  <div className="p-4">
                    <div className="h-5 w-2/3 bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-gray-700 rounded mb-2" />
                  </div>
                  <div className="text-center text-gray-400 mt-2">No videos found</div>
                </div>
              ))
            )}
          </div>

          {/* Metrics Section - Moved to bottom */}
          <div className="mt-16">
            {/* Collaboration Metrics */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Collaboration Metrics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12" style={{minHeight: '130px', contain: 'layout'}}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] animate-pulse bg-gray-800/40">
                    <div className="h-4 w-1/3 bg-gray-700 rounded mb-2" />
                    <div className="h-8 w-1/2 bg-gray-700 rounded" />
                  </div>
                ))
              ) : error ? (
                <div className="col-span-4 text-center text-red-400 py-8">{error}</div>
              ) : collaborationMetrics.length > 0 ? (
                collaborationMetrics.map((m, i) => (
                  <div key={i} className="h-[110px] min-w-[200px]" style={{contain: 'strict', contentVisibility: 'auto'}}>
                    <MetricCard title={m.label} value={m.value} delta={m.trend} />
                  </div>
                ))
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] bg-gray-800/20">
                    <div className="text-xs text-gray-400">No data</div>
                    <div className="text-2xl font-semibold text-gray-600 mt-2">--</div>
                  </div>
                ))
              )}
            </div>

            {/* AI Metrics */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">AI Metrics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12" style={{minHeight: '130px', contain: 'layout'}}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] animate-pulse bg-gray-800/40">
                    <div className="h-4 w-1/3 bg-gray-700 rounded mb-2" />
                    <div className="h-8 w-1/2 bg-gray-700 rounded" />
                  </div>
                ))
              ) : error ? (
                <div className="col-span-4 text-center text-red-400 py-8">{error}</div>
              ) : aiMetrics.length > 0 ? (
                aiMetrics.map((m, i) => (
                  <div key={i} className="h-[110px] min-w-[200px]" style={{contain: 'strict', contentVisibility: 'auto'}}>
                    <MetricCard title={m.label} value={m.value} delta={m.trend} />
                  </div>
                ))
              ) : (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] bg-gray-800/20">
                    <div className="text-xs text-gray-400">No data</div>
                    <div className="text-2xl font-semibold text-gray-600 mt-2">--</div>
                  </div>
                ))
              )}
            </div>

            {/* General Metrics */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">General Metrics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12" style={{minHeight: '130px', contain: 'layout'}}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] animate-pulse bg-gray-800/40">
                    <div className="h-4 w-1/3 bg-gray-700 rounded mb-2" />
                    <div className="h-8 w-1/2 bg-gray-700 rounded" />
                  </div>
                ))
              ) : error ? (
                <div className="col-span-4 text-center text-red-400 py-8">{error}</div>
              ) : otherMetrics.length > 0 ? (
                otherMetrics.map((m, i) => (
                  <div key={i} className="h-[110px] min-w-[200px]" style={{contain: 'strict', contentVisibility: 'auto'}}>
                    <MetricCard title={m.label} value={m.value} delta={m.trend} />
                  </div>
                ))
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl shadow-lg border border-white/6 flex flex-col h-[110px] min-w-[200px] bg-gray-800/20">
                    <div className="text-xs text-gray-400">No data</div>
                    <div className="text-2xl font-semibold text-gray-600 mt-2">--</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

      {/* Neon ambient footer accent - fixed position to prevent CLS */}
      <div className="fixed left-8 bottom-8 w-72 h-28 rounded-3xl opacity-30 pointer-events-none will-change-transform">
        <div className="w-full h-full bg-gradient-to-r from-blue-500/30 via-purple-400/20 to-pink-400/10 blur-3xl rounded-3xl" />
      </div>
    </div>
  );
}
