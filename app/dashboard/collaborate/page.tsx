"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Plus,
  Clock,
  MessageSquare,
  Video,
  Share2,
  Settings,
  UserPlus,
  Crown,
  Pencil,
  MousePointer2,
  Circle,
} from "lucide-react"
import { useState, useEffect } from "react"
import { FeatureGate } from "@/components/feature-gate"

const collaborators = [
  {
    id: 1,
    name: "Sarah Wilson",
    email: "sarah@company.com",
    avatar: "/placeholder.svg?key=sarah",
    role: "Editor",
    status: "online",
    lastActive: "now",
    cursor: { x: 45, y: 30, color: "bg-blue-500" },
  },
  {
    id: 2,
    name: "Mike Johnson",
    email: "mike@company.com",
    avatar: "/placeholder.svg?key=mike",
    role: "Viewer",
    status: "online",
    lastActive: "2 min ago",
    cursor: { x: 65, y: 50, color: "bg-green-500" },
  },
  {
    id: 3,
    name: "Emily Chen",
    email: "emily@company.com",
    avatar: "/placeholder.svg?key=emily",
    role: "Editor",
    status: "offline",
    lastActive: "1 hour ago",
    cursor: null,
  },
]

const recentProjects = [
  {
    id: 1,
    title: "Q4 Marketing Campaign",
    collaborators: 4,
    lastEdited: "5 minutes ago",
    status: "active",
    thumbnail: "/placeholder.svg?height=100&width=150&text=Q4+Campaign",
  },
  {
    id: 2,
    title: "Product Launch Video",
    collaborators: 2,
    lastEdited: "2 hours ago",
    status: "active",
    thumbnail: "/placeholder.svg?height=100&width=150&text=Product+Launch",
  },
  {
    id: 3,
    title: "Team Introduction",
    collaborators: 6,
    lastEdited: "1 day ago",
    status: "completed",
    thumbnail: "/placeholder.svg?height=100&width=150&text=Team+Intro",
  },
]

const chatMessages = [
  {
    id: 1,
    user: "Sarah Wilson",
    message: "I've updated the intro sequence. What do you think?",
    timestamp: "2 min ago",
    avatar: "/placeholder.svg?key=sarah",
  },
  {
    id: 2,
    user: "Mike Johnson",
    message: "Looks great! Can we adjust the timing on slide 3?",
    timestamp: "1 min ago",
    avatar: "/placeholder.svg?key=mike",
  },
  {
    id: 3,
    user: "You",
    message: "Sure, I'll make that change now.",
    timestamp: "30 sec ago",
    avatar: "/placeholder.svg?key=you",
  },
]

export default function CollaborationPage() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [cursors, setCursors] = useState(collaborators.filter((c) => c.cursor).map((c) => c.cursor))

  // Simulate real-time cursor movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) =>
        prev.map((cursor) => cursor ? ({
          ...cursor,
          x: Math.max(10, Math.min(90, cursor.x + (Math.random() - 0.5) * 10)),
          y: Math.max(10, Math.min(80, cursor.y + (Math.random() - 0.5) * 10)),
        }) : null),
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleInvite = () => {
    if (inviteEmail) {
      setInviteEmail("")
    }
  }

  const handleSendMessage = () => {
    if (newMessage) {
      setNewMessage("")
    }
  }

  return (
  <div className="min-h-[600px]">
          <FeatureGate
            feature="collaboration"
            plan="pro"
            fallback={
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-6 mx-auto">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h1 className="font-heading text-2xl font-bold mb-4">Real-time Collaboration</h1>
                  <p className="text-muted-foreground mb-6">
                    Collaborate with your team in real-time, share projects, and work together seamlessly.
                  </p>
                  <div className="space-y-4 text-left bg-muted/50 p-6 rounded-lg mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">Live cursors and real-time editing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">Team chat and comments</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">Project sharing and permissions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">Unlimited collaborators</span>
                    </div>
                  </div>
                  <Button size="lg">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  Collaboration Hub
                </h1>
                <p className="text-muted-foreground mt-1">Work together in real-time on your video projects</p>
              </div>

              <div className="flex items-center gap-4">
                <Button variant="outline" className="bg-transparent">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Project
                </Button>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Collaborator
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Collaboration Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Live Editing Canvas */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Live Editing Canvas</CardTitle>
                        <CardDescription>Real-time collaborative editing with live cursors</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {collaborators
                          .filter((c) => c.status === "online")
                          .map((collaborator) => (
                            <div key={collaborator.id} className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${collaborator.cursor?.color || "bg-gray-500"}`} />
                              <span className="text-xs">{collaborator.name.split(" ")[0]}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      {/* Canvas Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />

                      {/* Live Cursors */}
                      {cursors.map((cursor, index) => cursor ? (
                        <div
                          key={index}
                          className="absolute transition-all duration-1000 ease-out"
                          style={{
                            left: `${cursor.x}%`,
                            top: `${cursor.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <MousePointer2 className={`h-4 w-4 ${cursor.color.replace("bg-", "text-")}`} />
                          <div
                            className={`absolute top-4 left-0 px-2 py-1 rounded text-xs text-white ${cursor.color} whitespace-nowrap`}
                          >
                            {collaborators.find((c) => c.cursor?.color === cursor.color)?.name.split(" ")[0]}
                          </div>
                        </div>
                      ) : null)}

                      {/* Canvas Content Placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Video className="h-16 w-16 mx-auto mb-4" />
                          <p className="text-lg font-medium">Collaborative Video Editor</p>
                          <p className="text-sm">Real-time editing with your team</p>
                        </div>
                      </div>

                      {/* Live Changes Indicator */}
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-green-500 animate-pulse">
                          <Circle className="h-2 w-2 mr-1 fill-current" />
                          Live
                        </Badge>
                      </div>
                    </div>

                    {/* Recent Changes */}
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Recent Changes</h4>
                      <div className="space-y-1">
                        {[
                          { user: "Sarah Wilson", action: "Updated intro text", time: "2 min ago" },
                          { user: "Mike Johnson", action: "Added transition effect", time: "5 min ago" },
                          { user: "You", action: "Adjusted audio levels", time: "8 min ago" },
                        ].map((change, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {change.user} {change.action}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-xs">{change.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shared Projects */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shared Projects</CardTitle>
                    <CardDescription>Projects you're collaborating on with your team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {recentProjects.map((project) => (
                        <Card key={project.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              
                              <img
                                src={project.thumbnail || "/placeholder.svg"}
                                alt={project.title}
                                width={64}
                                height={48}
                                className="w-16 h-12 object-cover rounded aspect-[4/3]"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{project.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{project.collaborators} collaborators</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Edited {project.lastEdited}</span>
                                </div>
                              </div>
                              <Badge variant={project.status === "active" ? "default" : "secondary"}>
                                {project.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Team Members */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Team Members</span>
                      <Badge variant="secondary">{collaborators.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Invite New Member */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleInvite}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Current Members */}
                    <div className="space-y-3">
                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={collaborator.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {collaborator.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                                collaborator.status === "online" ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{collaborator.name}</span>
                              {collaborator.role === "Editor" && <Crown className="h-3 w-3 text-yellow-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {collaborator.status === "online" ? "Active now" : `Last seen ${collaborator.lastActive}`}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {collaborator.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Team Chat */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Team Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Messages */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {chatMessages.map((message) => (
                        <div key={message.id} className="flex gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {message.user
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">{message.user}</span>
                              <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      />
                      <Button size="sm" onClick={handleSendMessage}>
                        Send
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Project Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Public Link</div>
                          <div className="text-xs text-muted-foreground">Allow viewing via link</div>
                        </div>
                        <input type="checkbox" className="rounded" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Comments</div>
                          <div className="text-xs text-muted-foreground">Enable team comments</div>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Auto-save</div>
                          <div className="text-xs text-muted-foreground">Save changes automatically</div>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>

                    <Button variant="outline" className="w-full bg-transparent">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Project Link
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </FeatureGate>
  </div>
  )
}
