/**
 * Collaboration Client - WebSocket connection management
 * Handles real-time collaboration features
 */

import { io, Socket } from 'socket.io-client';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface CollaborationCallbacks {
  onUserJoined?: (user: UserInfo) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdate?: (userId: string, position: { x: number; y: number }) => void;
  onClipMoved?: (userId: string, clipId: string, position: any) => void;
  onClipUpdated?: (userId: string, clipId: string, updates: any) => void;
  onChatMessage?: (message: { userId: string; message: string; timestamp: number }) => void;
  onRoomMembers?: (members: UserInfo[]) => void;
  onError?: (error: string) => void;
}

export class CollaborationClient {
  private socket: Socket | null = null;
  private callbacks: CollaborationCallbacks = {};
  private currentRoom: string | null = null;

  constructor(private serverUrl: string = '') {
    this.serverUrl = serverUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  connect() {
    if (this.socket?.connected) {
      console.warn('[Collaboration] Already connected');
      return;
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoom = null;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  joinRoom(roomId: string, userInfo: UserInfo) {
    if (!this.socket?.connected) {
      this.connect();
    }

    this.socket?.emit('room:join', { roomId, userInfo });
    this.currentRoom = roomId;
  }

  leaveRoom() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('room:leave');
      this.currentRoom = null;
    }
  }

  updateCursor(position: { x: number; y: number }) {
    this.socket?.emit('cursor:update', position);
  }

  moveClip(clipId: string, trackId: string, position: any) {
    this.socket?.emit('edit:clip:move', { clipId, trackId, position });
  }

  updateClip(clipId: string, trackId: string, updates: any) {
    this.socket?.emit('edit:clip:update', { clipId, trackId, updates });
  }

  sendChatMessage(message: string) {
    this.socket?.emit('chat:message', { message });
  }

  sendHeartbeat() {
    this.socket?.emit('presence:heartbeat');
  }

  on(callbacks: CollaborationCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Collaboration] Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[Collaboration] Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Collaboration] Connection error:', error);
      this.callbacks.onError?.('Failed to connect to collaboration server');
    });

    this.socket.on('room:joined', ({ roomId }) => {
      console.log('[Collaboration] Joined room:', roomId);
    });

    this.socket.on('room:members', (members) => {
      this.callbacks.onRoomMembers?.(members);
    });

    this.socket.on('user:joined', (user) => {
      this.callbacks.onUserJoined?.(user);
    });

    this.socket.on('user:left', ({ id }) => {
      this.callbacks.onUserLeft?.(id);
    });

    this.socket.on('cursor:update', ({ id, ...data }) => {
      this.callbacks.onCursorUpdate?.(id, data);
    });

    this.socket.on('edit:clip:move', ({ userId, ...data }) => {
      this.callbacks.onClipMoved?.(userId, data.clipId, data);
    });

    this.socket.on('edit:clip:update', ({ userId, ...data }) => {
      this.callbacks.onClipUpdated?.(userId, data.clipId, data);
    });

    this.socket.on('chat:message', (message) => {
      this.callbacks.onChatMessage?.(message);
    });

    this.socket.on('error', ({ message }) => {
      this.callbacks.onError?.(message);
    });
  }

  generateUserColor(): string {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-indigo-500',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Singleton instance
let collaborationClient: CollaborationClient | null = null;

export function getCollaborationClient(): CollaborationClient {
  if (!collaborationClient) {
    collaborationClient = new CollaborationClient();
  }
  return collaborationClient;
}

