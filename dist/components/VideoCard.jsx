import React from "react";
import { motion } from "framer-motion";
export default function VideoCard({ title, subtitle, thumbnail, status, views, duration, width, height, aspectRatio, }) {
    return (<motion.div whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }} className="bg-gradient-to-b from-white/3 to-white/2 glass-card rounded-2xl overflow-hidden border border-white/6">
      <div className="relative overflow-hidden" style={{
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined,
            aspectRatio: aspectRatio || undefined,
        }}>
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" width={width} height={height} style={{ aspectRatio: aspectRatio || undefined }}/>
        <div className="absolute top-3 left-3 px-2 py-1 text-xs rounded-md bg-blue-800 text-white">
          {status}
        </div>
        <div className="absolute bottom-3 right-3 px-2 py-0.5 text-xs rounded-md bg-blue-800 text-white">
          {duration}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-300 mt-1">{subtitle}</p>}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
          <span>Edited 2 hours ago</span>
          <span>{views?.toLocaleString() ?? 0} views</span>
        </div>
      </div>
    </motion.div>);
}
