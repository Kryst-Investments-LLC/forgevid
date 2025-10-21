"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  MessageSquare, 
  Edit3, 
  Play, 
  Pause, 
  Volume2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Send,
  Sparkles
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface Edit {
  id: string;
  userId: string;
  user: User;
  edit: any;
  timestamp: number;
}

interface Message {
  id: string;
  userId: string;
  user: User;
  message: string;
  timestamp: number;
}

interface Cursor {
  userId: string;
  user: User;
  x: number;
  y: number;
  timestamp: number;
}

interface AISuggestion {
  message: string;
  timestamp: number;
  type: string;
}

interface CollaborationRoomProps {
  roomId: string;
  user: User;
  onError?: (error: string) => void;
}

export function CollaborationRoom({ roomId, user, onError }: CollaborationRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('jwt_token') || generateMockToken();
  const newSocket = io(process.env.NEXT_PUBLIC_COLLABORATION_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
      newSocket.emit('join-room', roomId);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      onError?.(error.message || 'Connection error');
    });

    newSocket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      setRoomUsers(data.roomUsers || []);
    });

    newSocket.on('user-joined', (data) => {
      console.log('User joined:', data);
      setRoomUsers(data.roomUsers || []);
    });

    newSocket.on('user-left', (data) => {
      console.log('User left:', data);
      setRoomUsers(data.roomUsers || []);
    });

    newSocket.on('edit-received', (editData) => {
      console.log('Edit received:', editData);
      setEdits(prev => [...prev, editData]);
    });

    newSocket.on('chat-message-received', (messageData) => {
      console.log('Message received:', messageData);
      setMessages(prev => [...prev, messageData]);
    });

    newSocket.on('cursor-moved', (cursorData) => {
      setCursors(prev => {
        const filtered = prev.filter(c => c.userId !== cursorData.userId);
        return [...filtered, cursorData];
      });
    });

    newSocket.on('ai-suggestion', (suggestion) => {
      console.log('AI suggestion:', suggestion);
      setAiSuggestion(suggestion);
      // Auto-hide suggestion after 10 seconds
      setTimeout(() => setAiSuggestion(null), 10000);
    });

    newSocket.on('video-state-changed', (stateData) => {
      console.log('Video state changed:', stateData);
      setVideoState(stateData.state);
    });

    newSocket.on('user-typing', (typingData) => {
      if (typingData.userId !== user.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.id !== typingData.userId);
          return typingData.isTyping ? [...filtered, typingData.user] : filtered;
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [roomId, user.id, onError]);

  // Generate mock token for development
  const generateMockToken = () => {
    const mockUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role || 'user'
    };
    
    // In production, this would be generated by the backend
    return btoa(JSON.stringify(mockUser));
  };

  // Send edit
  const sendEdit = useCallback((edit: any) => {
    if (socket && isConnected) {
      socket.emit('edit', { roomId, edit });
    }
  }, [socket, isConnected, roomId]);

  // Send message
  const sendMessage = useCallback(() => {
    if (newMessage.trim() && socket && isConnected) {
      socket.emit('chat-message', { roomId, message: newMessage.trim() });
      setNewMessage('');
    }
  }, [newMessage, socket, isConnected, roomId]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (socket && isConnected) {
      setIsTyping(true);
      socket.emit('typing', { roomId, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', { roomId, isTyping: false });
      }, 1000);
    }
  }, [socket, isConnected, roomId]);

  // Send cursor movement
  const sendCursorMove = useCallback((x: number, y: number) => {
    if (socket && isConnected) {
      socket.emit('cursor-move', { roomId, cursor: { x, y } });
    }
  }, [socket, isConnected, roomId]);

  // Send video state change
  const sendVideoStateChange = useCallback((state: any) => {
    if (socket && isConnected) {
      socket.emit('video-state-change', { roomId, state });
      setVideoState(state);
    }
  }, [socket, isConnected, roomId]);

  // Demo functions
  const sendDemoEdit = () => {
    const demoEdit = {
      type: 'text-change',
      target: 'scene-1',
      value: `Edit by ${user.name} at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now()
    };
    sendEdit(demoEdit);
  };

  const sendDemoCursor = () => {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    sendCursorMove(x, y);
  };

  const toggleVideoPlayback = () => {
    const newState = {
      ...videoState,
      isPlaying: !videoState.isPlaying
    };
    sendVideoStateChange(newState);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Collaboration Room: {roomId}</h1>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{roomUsers.length} users</span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player Area */}
          <div className="flex-1 p-4">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Video Editor</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleVideoPlayback}
                    >
                      {videoState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full">
                <div className="h-full bg-muted/50 rounded-lg flex items-center justify-center relative">
                  <div className="text-center">
                    <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Video Editor Placeholder</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {videoState.isPlaying ? 'Playing' : 'Paused'} - {videoState.currentTime}s / {videoState.duration}s
                    </p>
                  </div>
                  
                  {/* Cursors */}
                  {cursors.map((cursor) => (
                    <div
                      key={cursor.userId}
                      className="absolute w-4 h-4 pointer-events-none"
                      style={{
                        left: `${cursor.x}%`,
                        top: `${cursor.y}%`,
                      }}
                    >
                      <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
                      <div className="text-xs text-primary mt-1 whitespace-nowrap">
                        {cursor.user.name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="mx-4 mb-4">
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">AI Suggestion</p>
                      <p className="text-sm text-muted-foreground">{aiSuggestion.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat Area */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Chat</span>
              {typingUsers.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              )}
            </div>
            
            <ScrollArea className="h-32 mb-4">
              <div className="space-y-2">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.user.avatar} />
                      <AvatarFallback>{message.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{message.user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={sendMessage} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l p-4 space-y-4">
          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Users ({roomUsers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roomUsers.map((roomUser) => (
                  <div key={roomUser.id} className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={roomUser.avatar} />
                      <AvatarFallback>{roomUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{roomUser.name}</p>
                      <p className="text-xs text-muted-foreground">{roomUser.email}</p>
                    </div>
                    {roomUser.id === user.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Edits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4" />
                <span>Recent Edits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {edits.slice(-5).map((edit) => (
                    <div key={edit.id} className="text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{edit.user.name}</span>
                        <span className="text-muted-foreground">
                          {new Date(edit.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {edit.edit.type}: {edit.edit.value}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Demo Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={sendDemoEdit} size="sm" className="w-full">
                Send Demo Edit
              </Button>
              <Button onClick={sendDemoCursor} size="sm" variant="outline" className="w-full">
                Move Cursor
              </Button>
              <Button onClick={toggleVideoPlayback} size="sm" variant="outline" className="w-full">
                {videoState.isPlaying ? 'Pause' : 'Play'} Video
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}