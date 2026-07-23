"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Eye, ExternalLink, RefreshCw, FileVideo, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface VideoOption {
  id: string;
  title: string;
  duration: number | null;
  status: string;
}

type SuggestionAction = 'open_editor' | 'rerender';

interface EditSuggestion {
  title: string;
  description: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  action: SuggestionAction;
}

interface VideoAnalysis {
  videoId: string;
  title: string;
  duration: number | null;
  status: string | null;
  hasTranscript: boolean;
  sceneCount: number;
  canRerender: boolean;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  suggestions: EditSuggestion[];
}

function formatDuration(sec: number | null): string {
  if (sec == null) return 'unknown';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function priorityVariant(priority: EditSuggestion['priority']): 'default' | 'secondary' | 'outline' {
  if (priority === 'high') return 'default';
  if (priority === 'low') return 'outline';
  return 'secondary';
}

function AIEditingPanel() {
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);

  const [autoEditPrompt, setAutoEditPrompt] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<EditSuggestion[] | null>(null);
  const [generateIntent, setGenerateIntent] = useState<{ url: string | null } | null>(null);

  const [isRerendering, setIsRerendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVideos(true);
      try {
        const response = await fetch('/api/videos');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Failed to load videos');
        if (cancelled) return;
        const list: VideoOption[] = Array.isArray(data.videos) ? data.videos : [];
        setVideos(list);
        setSelectedVideoId((prev) => prev || list[0]?.id || '');
      } catch (error) {
        console.error('Failed to load videos:', error);
        toast.error('Could not load your videos');
      } finally {
        if (!cancelled) setLoadingVideos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalysis = async () => {
    if (!selectedVideoId) {
      toast.error('Pick a video first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/ai-editing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', videoId: selectedVideoId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to analyze video');
      setAnalysis(data.data);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze video');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runSuggestions = async () => {
    // This panel REVIEWS an existing video. A "generate/create a video for X"
    // ask sent through it produces absurd advice ("rebrand this commercial to
    // X") — seen with a real user. Route generation intent to the generator
    // instead of running the review.
    // "make A video" is generation; "make THIS video better" is review — the
    // article is what separates them.
    const wantsNewVideo =
      /\b(generate|create|make|build|produce)\b\s+(me\s+)?(a|an|another|new)\b[\s\S]{0,50}\b(video|commercial|ad|promo|reel)\b/i.test(
        autoEditPrompt,
      );
    if (wantsNewVideo) {
      const url = autoEditPrompt.match(/(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z]{2,})+[^\s]*/i)?.[0] ?? null;
      setGenerateIntent({ url });
      setSuggestions(null);
      return;
    }
    setGenerateIntent(null);

    if (!selectedVideoId) {
      toast.error('Pick a video first');
      return;
    }
    if (!autoEditPrompt.trim()) {
      toast.error('Describe what you want to change');
      return;
    }

    setIsSuggesting(true);
    try {
      const response = await fetch('/api/ai-editing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', videoId: selectedVideoId, prompt: autoEditPrompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to generate suggestions');
      setSuggestions(Array.isArray(data.data?.suggestions) ? data.data.suggestions : []);
      toast.success('Suggestions ready');
    } catch (error) {
      console.error('Suggestions error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const triggerRerender = async () => {
    if (!selectedVideoId) return;
    setIsRerendering(true);
    try {
      const response = await fetch(`/api/videos/${selectedVideoId}/rerender`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to queue re-render');
      toast.success('Re-render queued — track progress in the editor');
    } catch (error) {
      console.error('Rerender error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to queue re-render');
    } finally {
      setIsRerendering(false);
    }
  };

  const editorHref = selectedVideoId ? `/dashboard/editor?videoId=${selectedVideoId}` : '/dashboard/editor';

  const renderSuggestionCard = (suggestion: EditSuggestion, index: number) => (
    <Card key={index} className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h5 className="font-medium">{suggestion.title}</h5>
            <Badge variant={priorityVariant(suggestion.priority)}>{suggestion.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          {suggestion.rationale && (
            <p className="text-xs text-muted-foreground italic">{suggestion.rationale}</p>
          )}
        </div>
        {suggestion.action === 'rerender' ? (
          <Button size="sm" variant="outline" onClick={triggerRerender} disabled={isRerendering}>
            {isRerendering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-render
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href={editorHref}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Editor
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6" style={{ minHeight: '600px', contain: 'layout' }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Video Review
          </CardTitle>
          <CardDescription>
            Get an honest AI read on one of your videos — real title, duration, transcript and scene data, real
            suggestions. Actually applying an edit happens in the Scene Editor or via a real re-render.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video picker */}
          <div className="space-y-2">
            <Label htmlFor="video-select">Video</Label>
            {loadingVideos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your videos…
              </div>
            ) : videos.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileVideo className="h-4 w-4" />
                You don&apos;t have any videos yet.{' '}
                <Link href="/dashboard/ai" className="underline">
                  Generate one
                </Link>
                .
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                  <SelectTrigger id="video-select" className="flex-1" aria-label="Select a video">
                    <SelectValue placeholder="Choose a video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.title} · {formatDuration(v.duration)} · {v.status.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={runAnalysis} disabled={isAnalyzing || !selectedVideoId}>
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Analysis */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{analysis.title}</CardTitle>
                <CardDescription>
                  {formatDuration(analysis.duration)} · {analysis.sceneCount} persisted scene
                  {analysis.sceneCount === 1 ? '' : 's'} ·{' '}
                  {analysis.hasTranscript ? 'transcript available' : 'no transcript available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{analysis.summary}</p>

                {analysis.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Strengths</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                      {analysis.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.improvementAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Could improve</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                      {analysis.improvementAreas.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggestions</h4>
                    {analysis.suggestions.map(renderSuggestionCard)}
                  </div>
                )}

                {!analysis.canRerender && (
                  <p className="text-xs text-muted-foreground">
                    This video has no persisted scenes yet, so it can&apos;t be re-rendered from here — edit it in
                    the Scene Editor first.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autoPrompt" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Ask for suggestions
              </Label>
              <Textarea
                id="autoPrompt"
                value={autoEditPrompt}
                onChange={(e) => setAutoEditPrompt(e.target.value)}
                placeholder="e.g., Make this video more engaging, trim the boring parts, tighten the pacing…"
                rows={3}
              />
              <Button
                onClick={runSuggestions}
                disabled={isSuggesting || !selectedVideoId || !autoEditPrompt.trim()}
                className="w-full"
              >
                {isSuggesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate AI Suggestions
              </Button>
            </div>

            {generateIntent && (
              <div className="rounded-lg border border-cyan-700 bg-cyan-950/40 p-4 space-y-2">
                <h4 className="font-medium text-cyan-200">
                  Looks like you want a NEW video — this screen reviews existing ones.
                </h4>
                <p className="text-sm text-cyan-100/80">
                  {generateIntent.url
                    ? `To generate a marketing video for ${generateIntent.url}, use the AI Creator: paste the URL into the "Website → video" box and ForgeVid will write the script from the site's own content and pull in its images.`
                    : 'To generate a new video, use the AI Creator tab and describe it there.'}
                </p>
                <a
                  href="/dashboard/ai"
                  className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Open the AI Creator
                </a>
              </div>
            )}

            {suggestions && (
              <div className="space-y-2">
                <h4 className="font-medium">AI Suggestions:</h4>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No suggestions came back — try rephrasing.</p>
                ) : (
                  suggestions.map(renderSuggestionCard)
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground border-t pt-4">
            Need to actually trim, re-order, swap footage, or change text/narration? That happens in the{' '}
            <Link href={editorHref} className="underline">
              Scene Editor
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIEditingPanel;
