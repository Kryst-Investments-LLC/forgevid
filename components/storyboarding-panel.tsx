"use client";
import React, { useState } from 'react';
import { withCsrfHeaders } from '@/lib/csrf-client';

interface StoryboardScene {
  id: number;
  description: string;
  visuals: string;
  audio: string;
}

interface Storyboard {
  scenes: StoryboardScene[];
  preferences?: any;
  generatedAt: string;
}

const StoryboardingPanel: React.FC = () => {
  const [script, setScript] = useState('');
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Session-cookie auth (next-auth) + double-submit CSRF header — the same
      // scheme the rest of the app uses. No localStorage JWT.
      const res = await fetch('/api/storyboarding', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify({ script }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to generate storyboard');
        return;
      }
      setStoryboard(data.storyboard);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow text-gray-900" style={{minHeight: '400px', contain: 'layout'}}>
      <h2 className="text-xl font-bold mb-4 text-gray-900">AI-Driven Storyboarding</h2>
      <textarea
        className="w-full border border-gray-300 rounded p-2 mb-4 bg-white text-gray-900 placeholder-gray-500"
        rows={6}
        placeholder="Enter your video script..."
        value={script}
        onChange={e => setScript(e.target.value)}
      />
      <button
        className="bg-blue-700 text-white px-4 py-2 rounded"
        onClick={handleGenerate}
        disabled={loading || !script}
      >
        {loading ? 'Generating...' : 'Generate Storyboard'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {storyboard && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Storyboard Scenes</h3>
          <ul className="space-y-2">
            {storyboard.scenes.map(scene => (
              <li key={scene.id} className="border rounded p-2 bg-gray-50">
                <div className="font-medium">Scene {scene.id}</div>
                <div className="text-sm text-gray-700">{scene.description}</div>
                <div className="text-xs text-gray-500">Visuals: {scene.visuals}</div>
                <div className="text-xs text-gray-500">Audio: {scene.audio}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StoryboardingPanel;
