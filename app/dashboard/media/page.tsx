"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Upload,
  Search,
  Grid3X3,
  List,
  FolderPlus,
  MoreHorizontal,
  Download,
  Heart,
  Play,
  ImageIcon,
  Video,
  Music,
  FileText,
  Folder,
  Star,
  Eye,
} from "lucide-react"
import { useState } from "react"

const mediaItems = [
  {
    id: 1,
    name: "Product Hero Shot",
    type: "image",
    size: "2.4 MB",
    dimensions: "1920x1080",
    uploadDate: "2024-01-15",
    folder: "Products",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Product+Hero",
    isStock: false,
    isFavorite: true,
  },
  {
    id: 2,
    name: "Corporate Background Music",
    type: "audio",
    size: "5.2 MB",
    duration: "3:45",
    uploadDate: "2024-01-14",
    folder: "Audio",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Audio+Wave",
    isStock: true,
    isFavorite: false,
  },
  {
    id: 3,
    name: "Team Meeting Video",
    type: "video",
    size: "45.8 MB",
    duration: "2:30",
    uploadDate: "2024-01-12",
    folder: "Corporate",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Team+Meeting",
    isStock: false,
    isFavorite: false,
  },
  {
    id: 4,
    name: "Modern Office Space",
    type: "image",
    size: "3.1 MB",
    dimensions: "3840x2160",
    uploadDate: "2024-01-10",
    folder: "Backgrounds",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Office+Space",
    isStock: true,
    isFavorite: true,
  },
  {
    id: 5,
    name: "Upbeat Intro Music",
    type: "audio",
    size: "4.7 MB",
    duration: "1:20",
    uploadDate: "2024-01-08",
    folder: "Audio",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Upbeat+Music",
    isStock: true,
    isFavorite: false,
  },
  {
    id: 6,
    name: "Product Demo Footage",
    type: "video",
    size: "78.3 MB",
    duration: "4:15",
    uploadDate: "2024-01-05",
    folder: "Products",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Product+Demo",
    isStock: false,
    isFavorite: true,
  },
]

const folders = [
  { name: "Products", count: 12, color: "bg-blue-500" },
  { name: "Corporate", count: 8, color: "bg-green-500" },
  { name: "Audio", count: 15, color: "bg-purple-500" },
  { name: "Backgrounds", count: 24, color: "bg-orange-500" },
  { name: "Templates", count: 6, color: "bg-pink-500" },
]

export default function MediaLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolder, setSelectedFolder] = useState("all")
  const [viewMode, setViewMode] = useState("grid")
  const [selectedTab, setSelectedTab] = useState("my-media")

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredMedia = mediaItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = selectedFolder === "all" || item.folder === selectedFolder
    const matchesTab = selectedTab === "my-media" ? !item.isStock : selectedTab === "stock" ? item.isStock : true
    return matchesSearch && matchesFolder && matchesTab
  })

  return (
  <div className="min-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold">Media Library</h1>
              <p className="text-muted-foreground mt-1">Manage your assets and browse stock media</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="bg-transparent">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="my-media">My Media</TabsTrigger>
                <TabsTrigger value="stock">Stock Library</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "" : "bg-transparent"}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "" : "bg-transparent"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Sidebar - Folders */}
              <div className="w-64 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Folders</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant={selectedFolder === "all" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedFolder("all")}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      All Media
                    </Button>
                    {folders.map((folder) => (
                      <Button
                        key={folder.name}
                        variant={selectedFolder === folder.name ? "default" : "ghost"}
                        className="w-full justify-between"
                        onClick={() => setSelectedFolder(folder.name)}
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded ${folder.color} mr-2`} />
                          {folder.name}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {folder.count}
                        </Badge>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used</span>
                        <span>45 GB / 100 GB</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }} />
                      </div>
                      <p className="text-xs text-muted-foreground">55 GB remaining</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                <TabsContent value={selectedTab} className="mt-0">
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredMedia.map((item) => (
                        <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <img
                              src={item.thumbnail || "/placeholder.svg"}
                              alt={item.name}
                              width={160}
                              height={64}
                              className="w-full h-32 object-cover rounded-t-lg aspect-[5/2]"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                              <div className="flex gap-1">
                                <Button size="sm" variant="secondary">
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="secondary">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {item.isFavorite && (
                              <Heart className="absolute top-2 right-2 h-4 w-4 fill-red-500 text-red-500" />
                            )}
                            {item.isStock && <Badge className="absolute top-2 left-2 text-xs">Stock</Badge>}
                            <div className="absolute bottom-2 left-2">{getMediaIcon(item.type)}</div>
                          </div>

                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm line-clamp-1 mb-1">{item.name}</h4>
                            <div className="text-xs text-muted-foreground">
                              {item.type === "audio" || item.type === "video" ? item.duration : item.dimensions}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.size}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-0">
                        <div className="space-y-1">
                          {filteredMedia.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                            >
                              <img
                                src={item.thumbnail || "/placeholder.svg"}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded aspect-square"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {getMediaIcon(item.type)}
                                  <h4 className="font-medium truncate">{item.name}</h4>
                                  {item.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
                                  {item.isStock && (
                                    <Badge variant="secondary" className="text-xs">
                                      Stock
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {item.folder} • {item.size} • {item.uploadDate}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Star className="h-4 w-4 mr-2" />
                                      Add to Favorites
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </div>
          </Tabs>
  </div>
  )
}
