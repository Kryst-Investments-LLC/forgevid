"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, Play, Download, Star, Clock, Wand2, Video, Music, FileText, Grid, List, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
function TemplatesMediaPanel() {
    const [activeTab, setActiveTab] = useState('templates');
    const [templates, setTemplates] = useState([]);
    const [mediaAssets, setMediaAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [viewMode, setViewMode] = useState('grid');
    const [aiPrompt, setAiPrompt] = useState('');
    // Template filters
    const [templateFilters, setTemplateFilters] = useState({
        category: '',
        duration: { min: 0, max: 300 },
        aspectRatio: '',
        rating: { min: 0, max: 5 }
    });
    // Media filters
    const [mediaFilters, setMediaFilters] = useState({
        type: '',
        category: '',
        license: '',
        duration: { min: 0, max: 300 }
    });
    const categories = [
        'business', 'social', 'educational', 'marketing',
        'entertainment', 'presentation', 'background', 'audio'
    ];
    const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '21:9'];
    const mediaTypes = ['image', 'video', 'audio', 'animation', 'icon'];
    const licenses = ['free', 'premium', 'royalty-free', 'rights-managed'];
    useEffect(() => {
        loadTemplates();
        loadMediaAssets();
    }, []);
    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/templates-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                },
                body: JSON.stringify({
                    action: 'search_templates',
                    filters: templateFilters
                }),
            });
            if (!response.ok) {
                // Silently handle auth errors in development
                if (response.status === 401) {
                    setTemplates([]);
                    return;
                }
                throw new Error('Failed to load templates');
            }
            const data = await response.json();
            setTemplates(data.data.templates);
        }
        catch (error) {
            // Only log non-auth errors
            if (error instanceof TypeError) {
                console.warn('Templates API unavailable');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const loadMediaAssets = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/templates-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                },
                body: JSON.stringify({
                    action: 'search_media',
                    filters: mediaFilters
                }),
            });
            if (!response.ok) {
                // Silently handle auth errors in development
                if (response.status === 401) {
                    setMediaAssets([]);
                    return;
                }
                throw new Error('Failed to load media assets');
            }
            const data = await response.json();
            setMediaAssets(data.data.assets);
        }
        catch (error) {
            // Only log non-auth errors
            if (error instanceof TypeError) {
                console.warn('Media API unavailable');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const generateTemplate = async () => {
        if (!aiPrompt.trim()) {
            toast.error('Please enter a prompt for template generation');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/templates-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                },
                body: JSON.stringify({
                    action: 'generate_template',
                    prompt: aiPrompt
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to generate template');
            }
            const data = await response.json();
            setTemplates(prev => [data.data, ...prev]);
            setAiPrompt('');
            toast.success('Template generated successfully!');
        }
        catch (error) {
            console.error('Error generating template:', error);
            toast.error('Failed to generate template');
        }
        finally {
            setIsLoading(false);
        }
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    return (<div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5"/>
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
              {/* AI Template Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wand2 className="h-4 w-4"/>
                    AI Template Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="aiPrompt">Describe the template you want to create</Label>
                    <Textarea id="aiPrompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Create a modern business presentation template with blue color scheme and professional fonts..." rows={3}/>
                  </div>
                  <Button onClick={generateTemplate} disabled={isLoading || !aiPrompt.trim()} className="w-full">
                    {isLoading ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<Wand2 className="h-4 w-4 mr-2"/>)}
                    Generate Template
                  </Button>
                </CardContent>
              </Card>

              {/* Template Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4"/>
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 min-h-[110px] min-w-[200px]">
                      <Label>Category</Label>
                      <Select value={templateFilters.category} onValueChange={(value) => setTemplateFilters(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger aria-label="Select template category">
                          <SelectValue placeholder="All Categories"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (<SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Aspect Ratio</Label>
                      <Select value={templateFilters.aspectRatio} onValueChange={(value) => setTemplateFilters(prev => ({ ...prev, aspectRatio: value }))}>
                        <SelectTrigger aria-label="Select aspect ratio">
                          <SelectValue placeholder="All Ratios"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ratios</SelectItem>
                          {aspectRatios.map(ratio => (<SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Min Rating</Label>
                      <Select value={templateFilters.rating.min.toString()} onValueChange={(value) => setTemplateFilters(prev => ({
            ...prev,
            rating: { ...prev.rating, min: parseFloat(value) }
        }))}>
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
                        <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} aria-label="Grid view">
                          <Grid className="h-4 w-4"/>
                        </Button>
                        <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} aria-label="List view">
                          <List className="h-4 w-4"/>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={loadTemplates} disabled={isLoading} className="bg-blue-700 hover:bg-blue-800 text-white">
                      {isLoading ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<Search className="h-4 w-4 mr-2"/>)}
                      Apply Filters
                    </Button>
                    <Button variant="outline" onClick={() => setTemplateFilters({
            category: '',
            duration: { min: 0, max: 300 },
            aspectRatio: '',
            rating: { min: 0, max: 5 }
        })}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Templates Grid */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {templates.map((template) => (<Card key={template.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary">
                            <Play className="h-4 w-4 mr-1"/>
                            Preview
                          </Button>
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-1"/>
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
                          <Clock className="h-3 w-3"/>
                          {formatDuration(template.duration)}
                          <Star className="h-3 w-3"/>
                          {template.rating.toFixed(1)}
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (<Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>))}
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              {/* Media Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4"/>
                    Media Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={mediaFilters.type} onValueChange={(value) => setMediaFilters(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {mediaTypes.map(type => (<SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={mediaFilters.category} onValueChange={(value) => setMediaFilters(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (<SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>License</Label>
                      <Select value={mediaFilters.license} onValueChange={(value) => setMediaFilters(prev => ({ ...prev, license: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Licenses"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Licenses</SelectItem>
                          {licenses.map(license => (<SelectItem key={license} value={license}>
                              {license.charAt(0).toUpperCase() + license.slice(1)}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>View Mode</Label>
                      <div className="flex gap-2">
                        <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} aria-label="Grid view">
                          <Grid className="h-4 w-4"/>
                        </Button>
                        <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} aria-label="List view">
                          <List className="h-4 w-4"/>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={loadMediaAssets} disabled={isLoading} className="bg-blue-700 hover:bg-blue-800 text-white">
                      {isLoading ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<Search className="h-4 w-4 mr-2"/>)}
                      Apply Filters
                    </Button>
                    <Button variant="outline" onClick={() => setMediaFilters({
            type: '',
            category: '',
            license: '',
            duration: { min: 0, max: 300 }
        })}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Media Assets Grid */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-4'}>
                {mediaAssets.map((asset) => (<Card key={asset.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      {asset.type === 'image' ? (<img src={asset.thumbnail} alt={asset.title} width="300" height="300" className="w-full h-full object-cover"/>) : asset.type === 'video' ? (<div className="w-full h-full flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground"/>
                        </div>) : asset.type === 'audio' ? (<div className="w-full h-full flex items-center justify-center">
                          <Music className="h-12 w-12 text-muted-foreground"/>
                        </div>) : (<div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-12 w-12 text-muted-foreground"/>
                        </div>)}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary">
                            <Play className="h-4 w-4 mr-1"/>
                            Preview
                          </Button>
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-1"/>
                            Use
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold line-clamp-1">{asset.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {asset.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {asset.duration && (<>
                              <Clock className="h-3 w-3"/>
                              {formatDuration(asset.duration)}
                            </>)}
                          <Badge variant="secondary">{asset.type}</Badge>
                          <Badge variant="outline">{formatFileSize(asset.size)}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map((tag) => (<Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>);
}
export default TemplatesMediaPanel;
