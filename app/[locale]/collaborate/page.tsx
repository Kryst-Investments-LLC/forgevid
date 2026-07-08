"use client";
export const dynamic = "force-dynamic";


import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CollaborationRoom } from '@/components/CollaborationRoom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Video, MessageSquare } from "lucide-react";
import { useTranslations } from 'next-intl';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

export default function CollaboratePage() {
  // Defensive: useSession may be undefined during static export
  let sessionResult, session, status;
  try {
    sessionResult = useSession?.();
    session = sessionResult?.data;
    status = sessionResult?.status || 'unauthenticated';
  } catch (e) {
    session = undefined;
    status = 'unauthenticated';
  }
  const router = useRouter();
  const t = useTranslations();
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [user, setUser] = useState<User | null>(null);

  // Get JWT token for collaboration
  useEffect(() => {
    if (session?.user) {
      fetch('/api/collaboration/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setJwtToken(data.token);
            setUser(data.user);
            localStorage.setItem('jwt_token', data.token);
          } else {
            setError('Failed to get collaboration token');
          }
        })
        .catch(err => {
          console.error('Error getting collaboration token:', err);
          setError('Failed to get collaboration token');
        });
    }
  }, [session]);

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    if (!jwtToken || !user) {
      setError('Please wait for authentication to complete');
      return;
    }

    setIsJoining(true);
    setError('');

    // Simulate joining room (in real app, you might validate room exists)
    setTimeout(() => {
      setIsJoining(false);
    }, 1000);
  };

  const handleCreateRoom = () => {
    const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setRoomId(newRoomId);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to be signed in to use collaboration features.
            </p>
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we have a room ID and user, show the collaboration room
  if (roomId && user && jwtToken) {
    return (
      <CollaborationRoom
        roomId={roomId}
        user={user}
        onError={(error) => setError(error)}
      />
    );
  }

  // Show room join/create interface
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Real-Time Collaboration</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Collaborate with your team in real-time. Edit videos together, chat, and share ideas instantly.
          </p>

          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join or Create Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                  className="w-full"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleJoinRoom}
                    disabled={isJoining || !roomId.trim() || !jwtToken}
                    className="flex-1"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Joining...
                      </>
                    ) : (
                      'Join Room'
                    )}
                  </Button>
                  <Button
                    onClick={handleCreateRoom}
                    variant="outline"
                    className="flex-1"
                  >
                    Create Room
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Real-time editing</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Video className="h-4 w-4" />
                    <span>Video sync</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>Live chat</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Editing</h3>
              <p className="text-sm text-muted-foreground">
                See edits from team members as they happen with live cursors and changes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Synchronized Playback</h3>
              <p className="text-sm text-muted-foreground">
                Video playback is synchronized across all users for seamless collaboration.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground">
                Communicate with your team through real-time chat and comments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
