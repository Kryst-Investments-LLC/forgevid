"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  Play,
  Download,
  Star,
  Clock,
  Video,
  Music,
  FileText,
  Grid,
  List,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

/** Shape returned by GET /api/templates — DB-backed (Prisma `Template`). */
interface ApiTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string; // TemplateCategory enum: BUSINESS | SOCIAL | EDUCATIONAL | MARKETING | ENTERTAINMENT | PRESENTATION
  duration: number;
  aspectRatio: string;
  resolution: string;
  tags: string | null; // JSON-stringified string[]
  thumbnail: string;
  previewUrl: string | null;
  usageCount: number;
  rating: string | number | null; // Prisma Decimal -> serialized as string
  averageRating: string | number | null;
  totalRatings: number;
}

/** Shape returned by GET /api/media — DB-backed (Prisma `MediaAsset`), scoped to the session user. */
interface ApiMediaAsset {
  id: string;
  name: string;
  fileName: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  category: string | null;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  fileSize: number | null;
  resolution: string | null;
  createdAt: string;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function titleCase(value: string): string {
  return value.length ? value.charAt(0) + value.slice(1).toLowerCase() : value;
}

function TemplatesMediaPanel() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [mediaAssets, setMediaAssets] = useState<ApiMediaAsset[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Template filters
  const [templateFilters, setTemplateFilters] = useState({
    category: '',
    aspectRatio: '',
    rating: { min: 0 },
  });

  // Media filters
  const [mediaFilters, setMediaFilters] = useState({
    type: '',
    category: '',
  });

  const templateCategories = ['business', 'social', 'educational', 'marketing', 'entertainment', 'presentation'];
  const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '21:9'];
  const mediaTypes = ['image', 'video', 'audio', 'document'];
  const mediaCategories = ['upload', 'business', 'social', 'educational', 'marketing', 'entertainment', 'presentation', 'background'];

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (templateFilters.category && templateFilters.category !== 'all') {
        params.set('category', templateFilters.category.toUpperCase());
      }
      const response = await fetch(`/api/templates?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      let list: ApiTemplate[] = data.templates || [];
      if (templateFilters.aspectRatio && templateFilters.aspectRatio !== 'all') {
        list = list.filter((t) => t.aspectRatio === templateFilters.aspectRatio);
      }
      if (templateFilters.rating.min > 0) {
        list = list.filter((t) => Number(t.averageRating ?? t.rating ?? 0) >= templateFilters.rating.min);
      }
      setTemplates(list);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [templateFilters]);

  const loadMediaAssets = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (mediaFilters.type && mediaFilters.type !== 'all') {
        params.set('type', mediaFilters.type.toUpperCase());
      }
      const response = await fetch(`/api/media?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load media assets');
      const data = await response.json();
      let list: ApiMediaAsset[] = data.assets || [];
      if (mediaFilters.category && mediaFilters.category !== 'all') {
        list = list.filter((a) => (a.category || '').toLowerCase() === mediaFilters.category.toLowerCase());
      }
      setMediaAssets(list);
    } catch (error) {
      console.error('Failed to load media assets:', error);
      toast.error('Failed to load media assets');
    } finally {
      setIsLoadingMedia(false);
    }
  }, [mediaFilters]);

  useEffect(() => {
    loadTemplates();
    loadMediaAssets();
    // Initial load only — filter changes are applied via the "Apply Filters" buttons below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseTemplate = async (template: ApiTemplate) => {
    try {
      const response = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.videoId) {
        throw new Error(data?.error || 'Failed to use template');
      }
      toast.success('Template loaded — opening editor…');
      window.location.href = `/dashboard/editor?videoId=${data.videoId}`;
    } catch (error) {
      console.error('Failed to use template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to use template');
    }
  };

  const handlePreviewTemplate = (template: ApiTemplate) => {
    const url = template.previewUrl || template.thumbnail;
    if (!url) {
      toast.error('No preview available for this template');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUseMedia = async (asset: ApiMediaAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      toast.success('Asset URL copied to clipboard');
    } catch {
      window.open(asset.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePreviewMedia = (asset: ApiMediaAsset) => {
    window.open(asset.url, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            Templates & Media Library
          </CardTitle>
          <CardDescription>
            Browse templates and manage your media assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="media">Media Library</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              {/* Template Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 min-h-[110px] min-w-[200px]">
                      <Label>Category</Label>
                      <Select
                        value={templateFilters.category}
                        onValueChange={(value) => setTemplateFilters(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger aria-label="Select template category">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {templateCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Aspect Ratio</Label>
                      <Select
                        value={templateFilters.aspectRatio}
                        onValueChange={(value) => setTemplateFilters(prev => ({ ...prev, aspectRatio: value }))}
                      >
                        <SelectTrigger aria-label="Select aspect ratio">
                          <SelectValue placeholder="All Ratios" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ratios</SelectItem>
                          {aspectRatios.map(ratio => (
                            <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Min Rating</Label>
                      <Select
                        value={templateFilters.rating.min.toString()}
                        onValueChange={(value) => setTemplateFilters(prev => ({
                          ...prev,
                          rating: { min: parseFloat(value) }
                        }))}
                      >
                        <SelectTrigger aria-label="Select minimum rating">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any</SelectItem>
                          <SelectItem value="3">3+ Stars</SelectItem>
                          <SelectItem value="4">4+ Stars</SelectItem>
                          <SelectItem value="4.5">4.5+ Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>View Mode</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          aria-label="Grid view"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          aria-label="List view"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={loadTemplates} disabled={isLoadingTemplates} className="bg-blue-700 hover:bg-blue-800 text-white">
                      {isLoadingTemplates ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTemplateFilters({
                        category: '',
                        aspectRatio: '',
                        rating: { min: 0 }
                      })}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Templates Grid */}
              {isLoadingTemplates && templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No templates found
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {templates.map((template) => {
                    const tags = parseTags(template.tags);
                    const rating = template.averageRating ?? template.rating;
                    return (
                      <Card key={template.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handlePreviewTemplate(template)}>
                                <Play className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button size="sm" onClick={() => handleUseTemplate(template)}>
                                <Download className="h-4 w-4 mr-1" />
                                Use
                              </Button>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold line-clamp-1">{template.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(template.duration)}
                              {template.totalRatings > 0 && rating != null && (
                                <>
                                  <Star className="h-3 w-3" />
                                  {Number(rating).toFixed(1)}
                                </>
                              )}
                              <Badge variant="secondary">{titleCase(template.category)}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              {/* Media Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Media Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={mediaFilters.type}
                        onValueChange={(value) => setMediaFilters(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {mediaTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={mediaFilters.category}
                        onValueChange={(value) => setMediaFilters(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {mediaCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>View Mode</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          aria-label="Grid view"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          aria-label="List view"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={loadMediaAssets} disabled={isLoadingMedia} className="bg-blue-700 hover:bg-blue-800 text-white">
                      {isLoadingMedia ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setMediaFilters({ type: '', category: '' })}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Media Assets Grid */}
              {isLoadingMedia && mediaAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading media…
                </div>
              ) : mediaAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No media assets found. Upload some from the Media Library page.
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-4'}>
                  {mediaAssets.map((asset) => (
                    <Card key={asset.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        {asset.type === 'IMAGE' ? (
                          <img
                            src={asset.thumbnail || asset.url}
                            alt={asset.name}
                            width="300"
                            height="300"
                            className="w-full h-full object-cover"
                          />
                        ) : asset.type === 'VIDEO' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ) : asset.type === 'AUDIO' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handlePreviewMedia(asset)}>
                              <Play className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" onClick={() => handleUseMedia(asset)}>
                              <Download className="h-4 w-4 mr-1" />
                              Use
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold line-clamp-1">{asset.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {asset.fileName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {asset.duration != null && (
                              <>
                                <Clock className="h-3 w-3" />
                                {formatDuration(asset.duration)}
                              </>
                            )}
                            <Badge variant="secondary">{titleCase(asset.type)}</Badge>
                            <Badge variant="outline">{formatFileSize(asset.fileSize)}</Badge>
                            {asset.resolution && <Badge variant="outline">{asset.resolution}</Badge>}
                          </div>
                          {asset.category && (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">{asset.category}</Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TemplatesMediaPanel;
