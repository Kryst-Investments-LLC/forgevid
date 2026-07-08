import React from "react";
import { motion } from "framer-motion";

export default function MetricCard({
  title,
  value,
  delta,
  icon,
}: {
  title: string;
  value: string | number;
  delta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="glass-card p-6 rounded-2xl shadow-xl border border-cyan-500/20 hover:border-cyan-400/40 flex flex-col h-full overflow-hidden hover-lift transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 uppercase tracking-wide truncate mb-2">{title}</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mt-1 truncate">{value}</div>
        </div>
        <div className="text-cyan-400 flex-shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      {delta && (
        <div className="flex items-center gap-1 mt-4">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-sm text-green-400 font-medium truncate">{delta}</span>
        </div>
      )}
    </div>
  );
}
