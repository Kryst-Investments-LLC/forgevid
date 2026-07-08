"use client"

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scissors, 
  Crop, 
  Palette, 
  Type, 
  Volume2, 
  Wand2, 
  Play, 
  Download, 
  Loader2,
  Eye,
  Clock,
  FileVideo
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoAnalysis {
  duration: number;
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;
  scenes: Array<{ startTime: number; endTime: number; description: string }>;
  audioTracks: Array<{ language: string; channels: number }>;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

interface EditSuggestion {
  type: string;
  description: string;
  confidence: number;
  parameters: any;
}

interface VideoEditResult {
  editedVideoUrl: string;
  originalVideoUrl: string;
  editType: string;
  processingTime: number;
  fileSize: number;
  duration: number;
  previewUrl?: string;
  metadata: {
    resolution: string;
    frameRate: number;
    bitrate: number;
    codec: string;
  };
}

function AIEditingPanel() {
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [result, setResult] = useState<VideoEditResult | null>(null);
  const [autoEditPrompt, setAutoEditPrompt] = useState('');

  // Edit parameters
  const [editParams, setEditParams] = useState({
    editType: 'trim' as const,
    startTime: 0,
    endTime: 30,
    cropArea: { x: 0, y: 0, width: 100, height: 100 },
    filterType: 'vintage' as const,
    transitionType: 'fade' as const,
    textContent: '',
    textPosition: { x: 50, y: 20 },
    textStyle: {
      font: 'Arial',
      size: 24,
      color: '#ffffff',
      backgroundColor: 'transparent'
    },
    audioEnhancement: {
      noiseReduction: true,
      volumeBoost: false,
      equalizer: { bass: 0, mid: 0, treble: 0 }
    },
    outputFormat: 'mp4' as const,
    quality: '1080p' as const,
  });

  const analyzeVideo = async () => {
    if (!videoUrl) {
      toast.error('Please enter a video URL');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'analyze',
          videoUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video');
      }

      const data = await response.json();
      setAnalysis(data.data);
      toast.success('Video analysis completed!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze video');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSuggestions = async () => {
    if (!videoUrl || !autoEditPrompt) {
      toast.error('Please enter video URL and edit prompt');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'suggest',
          videoUrl,
          prompt: autoEditPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.data);
      toast.success('Edit suggestions generated!');
    } catch (error) {
      console.error('Suggestions error:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyEdit = async (editType: string, parameters: any) => {
    if (!videoUrl) {
      toast.error('Please enter a video URL');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'edit',
          videoUrl,
          editType,
          parameters,
          outputFormat: editParams.outputFormat,
          quality: editParams.quality,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply edit');
      }

      const data = await response.json();
      setResult(data.data);
      toast.success('Video edit applied successfully!');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to apply video edit');
    } finally {
      setIsProcessing(false);
    }
  };

  const applySuggestion = (suggestion: EditSuggestion) => {
    applyEdit(suggestion.type, suggestion.parameters);
  };

  return (
    <div className="space-y-6" style={{minHeight: '600px', contain: 'layout'}}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI-Powered Video Editing
          </CardTitle>
          <CardDescription>
            Use AI to automatically edit your videos with professional results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video URL Input */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL</Label>
            <div className="flex gap-2">
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1"
              />
              <Button onClick={analyzeVideo} disabled={isProcessing || !videoUrl}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Video Analysis */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{analysis.duration}s</p>
                  </div>
                  <div>
                    <span className="font-medium">Resolution:</span>
                    <p>{analysis.resolution.width}x{analysis.resolution.height}</p>
                  </div>
                  <div>
                    <span className="font-medium">Frame Rate:</span>
                    <p>{analysis.frameRate} fps</p>
                  </div>
                  <div>
                    <span className="font-medium">Quality:</span>
                    <Badge variant={analysis.quality === 'ultra' ? 'default' : 'secondary'}>
                      {analysis.quality.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                {analysis.scenes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Detected Scenes:</h4>
                    <div className="space-y-1">
                      {analysis.scenes.map((scene, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {scene.startTime}s - {scene.endTime}s: {scene.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Auto Edit</TabsTrigger>
              <TabsTrigger value="manual">Manual Edit</TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoPrompt">Describe what you want to do with the video</Label>
                <Textarea
                  id="autoPrompt"
                  value={autoEditPrompt}
                  onChange={(e) => setAutoEditPrompt(e.target.value)}
                  placeholder="e.g., Make this video more engaging by adding transitions and text overlays, trim the boring parts..."
                  rows={3}
                />
                <Button 
                  onClick={generateSuggestions} 
                  disabled={isProcessing || !videoUrl || !autoEditPrompt}
                  className="w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate AI Suggestions
                </Button>
              </div>

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">AI Suggestions:</h4>
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h5 className="font-medium capitalize">{suggestion.type.replace('_', ' ')}</h5>
                          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                          <Badge variant="outline">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                          disabled={isProcessing}
                        >
                          Apply
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trim */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scissors className="h-4 w-4" />
                      Trim Video
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Time (seconds)</Label>
                      <Input
                        type="number"
                        value={editParams.startTime}
                        onChange={(e) => setEditParams(prev => ({ 
                          ...prev, 
                          startTime: parseInt(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time (seconds)</Label>
                      <Input
                        type="number"
                        value={editParams.endTime}
                        onChange={(e) => setEditParams(prev => ({ 
                          ...prev, 
                          endTime: parseInt(e.target.value) || 30 
                        }))}
                      />
                    </div>
                    <Button 
                      onClick={() => applyEdit('trim', {
                        startTime: editParams.startTime,
                        endTime: editParams.endTime
                      })}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Apply Trim
                    </Button>
                  </CardContent>
                </Card>

                {/* Filter */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Palette className="h-4 w-4" />
                      Apply Filter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Filter Type</Label>
                      <Select
                        value={editParams.filterType}
                        onValueChange={(value: any) => setEditParams(prev => ({ 
                          ...prev, 
                          filterType: value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vintage">Vintage</SelectItem>
                          <SelectItem value="black_white">Black & White</SelectItem>
                          <SelectItem value="sepia">Sepia</SelectItem>
                          <SelectItem value="bright">Bright</SelectItem>
                          <SelectItem value="contrast">High Contrast</SelectItem>
                          <SelectItem value="saturation">High Saturation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => applyEdit('filter', {
                        filterType: editParams.filterType
                      })}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Apply Filter
                    </Button>
                  </CardContent>
                </Card>

                {/* Text Overlay */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      Add Text Overlay
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Text Content</Label>
                      <Input
                        value={editParams.textContent}
                        onChange={(e) => setEditParams(prev => ({ 
                          ...prev, 
                          textContent: e.target.value 
                        }))}
                        placeholder="Enter text to overlay"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">X Position (%)</Label>
                        <Input
                          type="number"
                          value={editParams.textPosition.x}
                          onChange={(e) => setEditParams(prev => ({ 
                            ...prev, 
                            textPosition: { ...prev.textPosition, x: parseInt(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Y Position (%)</Label>
                        <Input
                          type="number"
                          value={editParams.textPosition.y}
                          onChange={(e) => setEditParams(prev => ({ 
                            ...prev, 
                            textPosition: { ...prev.textPosition, y: parseInt(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => applyEdit('text_overlay', {
                        textContent: editParams.textContent,
                        textPosition: editParams.textPosition,
                        textStyle: editParams.textStyle
                      })}
                      disabled={isProcessing || !editParams.textContent}
                      className="w-full"
                    >
                      Add Text
                    </Button>
                  </CardContent>
                </Card>

                {/* Audio Enhancement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Volume2 className="h-4 w-4" />
                      Enhance Audio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="noiseReduction"
                          checked={editParams.audioEnhancement.noiseReduction}
                          onChange={(e) => setEditParams(prev => ({ 
                            ...prev, 
                            audioEnhancement: { 
                              ...prev.audioEnhancement, 
                              noiseReduction: e.target.checked 
                            }
                          }))}
                        />
                        <Label htmlFor="noiseReduction" className="text-sm">Noise Reduction</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="volumeBoost"
                          checked={editParams.audioEnhancement.volumeBoost}
                          onChange={(e) => setEditParams(prev => ({ 
                            ...prev, 
                            audioEnhancement: { 
                              ...prev.audioEnhancement, 
                              volumeBoost: e.target.checked 
                            }
                          }))}
                        />
                        <Label htmlFor="volumeBoost" className="text-sm">Volume Boost</Label>
                      </div>
                    </div>
                    <Button 
                      onClick={() => applyEdit('audio_enhance', {
                        audioEnhancement: editParams.audioEnhancement
                      })}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Enhance Audio
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Output Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select
                    value={editParams.outputFormat}
                    onValueChange={(value: any) => setEditParams(prev => ({ 
                      ...prev, 
                      outputFormat: value 
                    }))}
                  >
                    <SelectTrigger aria-label="Select output format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="mov">MOV</SelectItem>
                      <SelectItem value="avi">AVI</SelectItem>
                      <SelectItem value="webm">WEBM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={editParams.quality}
                    onValueChange={(value: any) => setEditParams(prev => ({ 
                      ...prev, 
                      quality: value 
                    }))}
                  >
                    <SelectTrigger aria-label="Select video quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p HD</SelectItem>
                      <SelectItem value="1080p">1080p Full HD</SelectItem>
                      <SelectItem value="4k">4K Ultra HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Edited Video</CardTitle>
            <CardDescription>
              Your video has been processed with AI-powered editing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <p>{result.duration}s</p>
              </div>
              <div>
                <span className="font-medium">File Size:</span>
                <p>{(result.fileSize / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <div>
                <span className="font-medium">Processing Time:</span>
                <p>{result.processingTime}ms</p>
              </div>
              <div>
                <span className="font-medium">Resolution:</span>
                <p>{result.metadata.resolution}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <a href={result.previewUrl || result.editedVideoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={result.editedVideoUrl} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIEditingPanel;
