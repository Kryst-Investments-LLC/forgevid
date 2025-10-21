"use client";
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Play, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
function VoiceToVideoPanel() {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [result, setResult] = useState(null);
    const [options, setOptions] = useState({
        language: 'en',
        videoStyle: 'cinematic',
        duration: 30,
        quality: '1080p',
    });
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
            });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                setAudioUrl(URL.createObjectURL(audioBlob));
                toast.success('Recording completed!');
            };
            mediaRecorder.start();
            setIsRecording(true);
            toast.success('Recording started...');
        }
        catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Failed to start recording. Please check microphone permissions.');
        }
    }, []);
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    }, [isRecording]);
    const processVoiceToVideo = useCallback(async () => {
        if (!audioBlob) {
            toast.error('Please record audio first');
            return;
        }
        setIsProcessing(true);
        setResult(null);
        try {
            // Convert blob to base64
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            // For development - bypass authentication
            const response = await fetch('/api/voice-to-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Remove auth for development
                    // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    audio: base64Audio,
                    options,
                    // Add development flag
                    development: true,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to process voice-to-video');
            }
            const data = await response.json();
            setResult(data.data);
            toast.success('Video generated successfully!');
        }
        catch (error) {
            console.error('Error processing voice-to-video:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to process voice-to-video');
        }
        finally {
            setIsProcessing(false);
        }
    }, [audioBlob, options]);
    const clearRecording = useCallback(() => {
        setAudioBlob(null);
        setAudioUrl(null);
        setResult(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
    }, [audioUrl]);
    return (<div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5"/>
            Voice-to-Video Generation
          </CardTitle>
          <CardDescription>
            Record your voice and let AI create a professional video for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button onClick={isRecording ? stopRecording : startRecording} variant={isRecording ? "destructive" : "default"} size="lg" disabled={isProcessing} className={isRecording ? "" : "bg-blue-700 hover:bg-blue-800 text-white"}>
              {isRecording ? (<>
                  <MicOff className="h-4 w-4 mr-2"/>
                  Stop Recording
                </>) : (<>
                  <Mic className="h-4 w-4 mr-2"/>
                  Start Recording
                </>)}
            </Button>

            {audioUrl && (<Button onClick={clearRecording} variant="outline" size="lg">
                Clear
              </Button>)}
          </div>

          {/* Audio Preview */}
          {audioUrl && (<div className="space-y-2">
              <h4 className="text-sm font-medium">Audio Preview</h4>
              <audio controls src={audioUrl} className="w-full"/>
            </div>)}

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={options.language} onValueChange={(value) => setOptions(prev => ({ ...prev, language: value }))}>
                <SelectTrigger aria-label="Select language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Video Style</label>
              <div className="grid grid-cols-2 gap-3">
                {[
            { value: 'modern', label: 'Modern', description: 'Clean, minimal' },
            { value: 'cinematic', label: 'Cinematic', description: 'Film-like quality' },
            { value: 'energetic', label: 'Energetic', description: 'Fast-paced, dynamic' },
            { value: 'professional', label: 'Professional', description: 'Corporate, polished' }
        ].map((style) => (<button key={style.value} onClick={() => setOptions(prev => ({ ...prev, videoStyle: style.value }))} className={`p-3 text-left rounded-lg border transition-all ${options.videoStyle === style.value
                ? 'border-cyan-400 bg-cyan-400/10 text-white'
                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'}`}>
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{style.description}</div>
                  </button>))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="duration-slider">Duration: {options.duration}s</label>
              <div role="group" aria-labelledby="duration-label">
                <span id="duration-label" className="sr-only">Video duration in seconds</span>
                <Slider id="duration-slider" value={[options.duration]} onValueChange={([value]) => setOptions(prev => ({ ...prev, duration: value }))} min={10} max={300} step={5} className="w-full" aria-label="Video duration in seconds"/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <Select value={options.quality} onValueChange={(value) => setOptions(prev => ({ ...prev, quality: value }))}>
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

          {/* Process Button */}
          <Button onClick={processVoiceToVideo} disabled={!audioBlob || isProcessing} size="lg" className="w-full">
            {isProcessing ? (<>
                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                Processing...
              </>) : (<>
                <Play className="h-4 w-4 mr-2"/>
                Generate Video
              </>)}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (<Card>
          <CardHeader>
            <CardTitle>Generated Video</CardTitle>
            <CardDescription>
              Your voice has been converted to a professional video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <p>{result.duration}s</p>
              </div>
              <div>
                <span className="font-medium">Language:</span>
                <p>{result.language.toUpperCase()}</p>
              </div>
              <div>
                <span className="font-medium">Confidence:</span>
                <p>{Math.round(result.confidence * 100)}%</p>
              </div>
              <div>
                <span className="font-medium">Processing Time:</span>
                <p>{result.processingTime}ms</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transcript</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {result.transcript}
              </p>
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <a href={result.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2"/>
                  Play Video
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={result.videoUrl} download>
                  <Download className="h-4 w-4 mr-2"/>
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>)}
    </div>);
}
export default VoiceToVideoPanel;
