import React, { useState } from 'react';
import axios from 'axios';

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
      const token = localStorage.getItem('jwt');
      const res = await axios.post('/api/storyboarding', { script }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStoryboard(res.data.storyboard);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate storyboard');
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="p-6 bg-white rounded shadow" style={{minHeight: '400px', contain: 'layout'}}>
      <h2 className="text-xl font-bold mb-4">AI-Driven Storyboarding</h2>
      <textarea
        className="w-full border rounded p-2 mb-4"
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
