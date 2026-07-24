"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Sparkles, Loader2, Video, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  videoBrief?: VideoBrief | null;
  /** Set when the user asked to generate a video FOR A WEBSITE — renders the
      one-click "generate from this site" card instead of a chat round-trip. */
  siteUrl?: string;
}

interface VideoBrief {
  ready: boolean;
  title: string;
  description: string;
  style: string;
  duration: number;
  scenes: Array<{ description: string; duration: number; visualElements: string[] }>;
  addOns: string[];
}

interface AIChatPanelProps {
  onGenerateVideo?: (brief: VideoBrief) => void;
  /** Handoff for "make a video for <website>": the panel resolves the site into
      a grounded script + imported images, then the parent generates from it. */
  onGenerateFromSite?: (opts: { prompt: string; mediaAssetIds: string[]; duration: number }) => void;
}

/** Pull the first URL/bare-domain out of free text (neurohires.com, https://…). */
function extractUrl(text: string): string | null {
  const m = text.match(/(https?:\/\/[^\s]+)|(\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b(?:\/[^\s]*)?)/i);
  return m ? m[0].replace(/[.,)]+$/, '') : null;
}

/** "make a video for <site>" — generation intent that names a website. */
function siteVideoIntent(text: string): string | null {
  if (!/\b(generate|create|make|build|produce|do)\b[\s\S]{0,60}\b(video|commercial|ad|advert|promo|reel|clip)\b/i.test(text)) {
    return null;
  }
  return extractUrl(text);
}

export default function AIChatPanel({ onGenerateVideo, onGenerateFromSite }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI video creation assistant. Tell me about the video you'd like to create — what's it about, who's it for, and what style are you going for? I'll help you refine your idea step by step.",
      timestamp: new Date(),
      videoBrief: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [busySite, setBusySite] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');

    // "make a video for neurohires.com" — skip the chat round-trip and offer to
    // build straight from the site (reads the page, writes the script from its
    // own content, uses its images). Exactly what a user expects when they paste
    // a URL and ask for a video.
    const siteUrl = siteVideoIntent(text);
    if (siteUrl) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `I can build a video straight from ${siteUrl} — I'll read the site, write the script from its own content, and use its images.`,
          timestamp: new Date(),
          siteUrl,
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        videoBrief: data.videoBrief || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.videoBrief) {
        toast.success('Video brief ready! Click "Generate Video" to create it.');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGenerateFromBrief = (brief: VideoBrief) => {
    if (onGenerateVideo) {
      onGenerateVideo(brief);
    } else {
      // Fallback: call the AI generation endpoint directly
      generateVideo(brief);
    }
  };

  const generateVideo = async (brief: VideoBrief) => {
    toast.info('Starting video generation from your brief...');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_video',
          prompt: brief.description,
          style: brief.style,
          duration: brief.duration,
          addOns: brief.addOns,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // The API QUEUES the job and returns a videoId — nothing is "generated"
      // yet. Say what actually happened.
      toast.success('Generation started!');
      const resultMsg: ChatMessage = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: `"${brief.title}" is rendering now. Watch the progress in My Videos — you'll also get an email when it's ready.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Video generation failed. Please try again.');
    }
  };

  const handleGenerateFromSite = async (url: string) => {
    setBusySite(true);
    toast.info(`Reading ${url}…`);
    try {
      // Turn the site into a grounded script + its own images (SSRF-guarded,
      // auth'd, rate-limited server-side).
      const res = await fetch('/api/site-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, duration: 30, tone: 'energetic' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not read that site');

      const sitePrompt: string = data.prompt || `A 30-second marketing video for ${url}`;
      const mediaAssetIds: string[] = Array.isArray(data.mediaAssetIds) ? data.mediaAssetIds : [];

      if (onGenerateFromSite) {
        // Hand off to the Creator tab, where the real progress bar lives.
        onGenerateFromSite({ prompt: sitePrompt, mediaAssetIds, duration: 30 });
      } else {
        // Self-contained fallback: queue the job directly.
        const gen = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_video',
            prompt: sitePrompt,
            style: 'energetic',
            duration: 30,
            addOns: ['subtitles', 'music', 'voiceover'],
            ...(mediaAssetIds.length ? { mediaAssetIds } : {}),
          }),
        });
        const gd = await gen.json().catch(() => ({}));
        if (!gen.ok || !gd.success) throw new Error(gd.error || 'Generation failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `result-${Date.now()}`,
          role: 'assistant',
          content: `Building your video from ${url}${mediaAssetIds.length ? ` using ${mediaAssetIds.length} image(s) from the site` : ''}. Watch the progress in the AI Creator tab.`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build from that site.');
    } finally {
      setBusySite(false);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Let's start fresh! Tell me about the video you'd like to create.",
        timestamp: new Date(),
      },
    ]);
    setInput('');
  };

  const renderMessageContent = (msg: ChatMessage) => {
    // Strip JSON code blocks from display (show the brief card instead)
    const displayContent = msg.content.replace(/```json\s*[\s\S]*?```/g, '').trim();

    return (
      <div className="space-y-3">
        {displayContent && (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{displayContent}</div>
        )}
        {msg.siteUrl && (
          <Card className="border-cyan-200 bg-cyan-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-cyan-600" />
                <span className="font-semibold text-cyan-900">Build from {msg.siteUrl}</span>
              </div>
              <p className="text-xs text-cyan-900/70">
                Reads the page, writes the script from its own words, and pulls in its images as scenes.
              </p>
              <Button
                size="sm"
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={busySite}
                onClick={() => handleGenerateFromSite(msg.siteUrl!)}
              >
                {busySite ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-2" />
                )}
                {busySite ? 'Reading the site…' : 'Generate from this site'}
              </Button>
            </CardContent>
          </Card>
        )}
        {msg.videoBrief && (
          <Card className="border-cyan-200 bg-cyan-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-cyan-600" />
                <span className="font-semibold text-cyan-800">{msg.videoBrief.title}</span>
              </div>
              {/* This card is hardcoded LIGHT (bg-cyan-50) inside a dark-token
                  app, so semantic colors (muted-foreground, outline badges)
                  resolve light-on-light and vanish. Every color in here must
                  be explicit. */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-cyan-900/70">Style:</span>{' '}
                  <Badge variant="outline" className="ml-1 border-cyan-300 text-cyan-900">{msg.videoBrief.style}</Badge>
                </div>
                <div>
                  <span className="text-cyan-900/70">Duration:</span>{' '}
                  <Badge variant="outline" className="ml-1 border-cyan-300 text-cyan-900">{msg.videoBrief.duration}s</Badge>
                </div>
                <div>
                  <span className="text-cyan-900/70">Scenes:</span>{' '}
                  <Badge variant="outline" className="ml-1 border-cyan-300 text-cyan-900">{msg.videoBrief.scenes.length}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                {msg.videoBrief.scenes.map((scene, i) => (
                  <div key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-cyan-700 font-mono shrink-0">Scene {i + 1}:</span>
                    <span>{scene.description} ({scene.duration}s)</span>
                  </div>
                ))}
              </div>
              {msg.videoBrief.addOns.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {msg.videoBrief.addOns.map((addon) => (
                    <Badge key={addon} className="text-xs bg-cyan-100 text-cyan-900 border border-cyan-200 hover:bg-cyan-100">{addon}</Badge>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                onClick={() => handleGenerateFromBrief(msg.videoBrief!)}
              >
                <Sparkles className="h-3 w-3 mr-2" />
                Generate This Video
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-cyan-400" />
          AI Video Assistant
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={resetConversation} title="Start new conversation">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages — a real overflow container so long replies scroll and
            auto-scroll-to-bottom actually works (a ref on radix ScrollArea
            targets the wrong element and never scrolled). */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={msg.role === 'assistant' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white'}>
                    {msg.role === 'assistant' ? 'AI' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white border border-cyan-700'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  {renderMessageContent(msg)}
                  {/* suppressHydrationWarning: the welcome message is in the
                      INITIAL state, so the server renders its timestamp with
                      the server's clock and locale (UTC on Railway) and the
                      browser re-renders with its own — a guaranteed mismatch
                      that crashed hydration (React #425/#422) in production. */}
                  <div
                    suppressHydrationWarning
                    className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-cyan-100' : 'text-gray-500'}`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-cyan-600 text-white">AI</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your video idea..."
              disabled={isLoading}
              className="flex-1"
              maxLength={5000}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tip: Say &quot;generate it&quot; when you&apos;re happy with your idea
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
