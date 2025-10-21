#!/usr/bin/env node

// Fallback collaboration server that works without Redis
// This is for development/testing when Redis is not available

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');

console.log('🚀 Starting ForgeVid Collaboration Server (No-Redis Mode)...\n');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// In-memory storage (fallback when Redis is not available)
const memoryStore = {
  rooms: new Map(),
  users: new Map(),
  edits: new Map(),
  messages: new Map()
};

// Middleware for JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Helper function to generate AI suggestions
const generateAISuggestion = (edit) => {
  const suggestions = [
    "Consider adding a transition effect here",
    "This scene could benefit from a color correction",
    "Try adding some background music to enhance the mood",
    "The timing could be improved for better flow",
    "Consider adding a text overlay for clarity"
  ];
  
  return {
    message: suggestions[Math.floor(Math.random() * suggestions.length)],
    timestamp: Date.now(),
    type: 'ai-suggestion'
  };
};

// Helper functions for memory store
const addUserToRoom = (roomId, user) => {
  if (!memoryStore.rooms.has(roomId)) {
    memoryStore.rooms.set(roomId, {
      id: roomId,
      users: new Set(),
      createdAt: Date.now()
    });
  }
  memoryStore.rooms.get(roomId).users.add(user.id);
  memoryStore.users.set(user.id, user);
};

const removeUserFromRoom = (roomId, userId) => {
  if (memoryStore.rooms.has(roomId)) {
    memoryStore.rooms.get(roomId).users.delete(userId);
  }
};

const getRoomUsers = (roomId) => {
  if (!memoryStore.rooms.has(roomId)) return [];
  const room = memoryStore.rooms.get(roomId);
  return Array.from(room.users).map(userId => memoryStore.users.get(userId)).filter(Boolean);
};

const saveEdit = (roomId, edit, userId) => {
  const editData = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    userId,
    edit,
    timestamp: Date.now()
  };
  
  if (!memoryStore.edits.has(roomId)) {
    memoryStore.edits.set(roomId, []);
  }
  memoryStore.edits.get(roomId).push(editData);
  
  // Keep only last 100 edits per room
  const edits = memoryStore.edits.get(roomId);
  if (edits.length > 100) {
    memoryStore.edits.set(roomId, edits.slice(-100));
  }
};

const saveMessage = (roomId, message, userId) => {
  const messageData = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    userId,
    message,
    timestamp: Date.now()
  };
  
  if (!memoryStore.messages.has(roomId)) {
    memoryStore.messages.set(roomId, []);
  }
  memoryStore.messages.get(roomId).push(messageData);
  
  // Keep only last 50 messages per room
  const messages = memoryStore.messages.get(roomId);
  if (messages.length > 50) {
    memoryStore.messages.set(roomId, messages.slice(-50));
  }
};

io.on('connection', (socket) => {
  console.log(`User ${socket.data.user.id} connected`);
  
  // Join room
  socket.on('join-room', async (roomId) => {
    try {
      socket.join(roomId);
      
      // Add user to room in memory
      addUserToRoom(roomId, socket.data.user);
      
      // Get all users in room
      const roomUsers = getRoomUsers(roomId);
      
      // Notify room about new user
      socket.to(roomId).emit('user-joined', {
        user: socket.data.user,
        roomUsers: roomUsers
      });
      
      // Send current room state to the new user
      socket.emit('room-joined', {
        roomId,
        roomUsers: roomUsers,
        message: `Welcome to room ${roomId}`
      });
      
      console.log(`User ${socket.data.user.id} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle edit changes
  socket.on('edit', async ({ roomId, edit }) => {
    try {
      // Save edit to memory
      saveEdit(roomId, edit, socket.data.user.id);
      
      // Broadcast edit to other users in room
      socket.to(roomId).emit('edit-received', {
        userId: socket.data.user.id,
        user: socket.data.user,
        edit,
        timestamp: Date.now()
      });
      
      // Generate AI suggestion
      const suggestion = generateAISuggestion(edit);
      io.to(roomId).emit('ai-suggestion', suggestion);
      
      console.log(`Edit from ${socket.data.user.id} in room ${roomId}:`, edit);
    } catch (error) {
      console.error('Error handling edit:', error);
      socket.emit('error', { message: 'Failed to process edit' });
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', ({ roomId, cursor }) => {
    socket.to(roomId).emit('cursor-moved', {
      userId: socket.data.user.id,
      user: socket.data.user,
      cursor,
      timestamp: Date.now()
    });
  });

  // Handle chat messages
  socket.on('chat-message', async ({ roomId, message }) => {
    try {
      // Save message to memory
      saveMessage(roomId, message, socket.data.user.id);
      
      // Broadcast message to room
      io.to(roomId).emit('chat-message-received', {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        userId: socket.data.user.id,
        user: socket.data.user,
        message,
        timestamp: Date.now()
      });
      
      console.log(`Chat message from ${socket.data.user.id} in room ${roomId}:`, message);
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle video state changes
  socket.on('video-state-change', ({ roomId, state }) => {
    socket.to(roomId).emit('video-state-changed', {
      userId: socket.data.user.id,
      user: socket.data.user,
      state,
      timestamp: Date.now()
    });
  });

  // Handle user typing indicator
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.data.user.id,
      user: socket.data.user,
      isTyping,
      timestamp: Date.now()
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User ${socket.data.user.id} disconnected`);
    
    // Remove user from all rooms
    for (const [roomId, room] of memoryStore.rooms.entries()) {
      if (room.users.has(socket.data.user.id)) {
        room.users.delete(socket.data.user.id);
        
        // Notify room about user leaving
        socket.to(roomId).emit('user-left', {
          user: socket.data.user,
          roomUsers: getRoomUsers(roomId)
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          memoryStore.rooms.delete(roomId);
        }
      }
    }
    
    // Remove user from memory
    memoryStore.users.delete(socket.data.user.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'memory-only',
    activeRooms: memoryStore.rooms.size,
    connectedUsers: memoryStore.users.size,
    timestamp: Date.now()
  });
});

// Get room info endpoint
app.get('/api/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomUsers = getRoomUsers(roomId);
    const recentEdits = memoryStore.edits.get(roomId) || [];
    const recentMessages = memoryStore.messages.get(roomId) || [];
    
    res.json({
      roomId,
      users: roomUsers,
      recentEdits: recentEdits.slice(-10),
      recentMessages: recentMessages.slice(-10),
      isActive: memoryStore.rooms.has(roomId)
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

const PORT = process.env.COLLABORATION_PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Collaboration server running on port ${PORT} (Memory Mode)`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Note: Running in memory-only mode (no Redis)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
