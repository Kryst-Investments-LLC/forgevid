const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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

// Store active rooms and users
const activeRooms = new Map();
const userSockets = new Map();

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

// Helper function to save edit to Redis
const saveEditToRedis = async (roomId, edit, userId) => {
  const editData = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    userId,
    edit,
    timestamp: Date.now()
  };
  
  await redis.rpush(`room:${roomId}:edits`, JSON.stringify(editData));
  await redis.expire(`room:${roomId}:edits`, 86400); // 24 hours
};

// Helper function to get room users from Redis
const getRoomUsers = async (roomId) => {
  const users = await redis.smembers(`room:${roomId}:users`);
  return users.map(userId => JSON.parse(userId));
};

// Helper function to add user to room in Redis
const addUserToRoom = async (roomId, user) => {
  await redis.sadd(`room:${roomId}:users`, JSON.stringify(user));
  await redis.expire(`room:${roomId}:users`, 86400); // 24 hours
};

// Helper function to remove user from room in Redis
const removeUserFromRoom = async (roomId, userId) => {
  const users = await redis.smembers(`room:${roomId}:users`);
  const userToRemove = users.find(u => {
    const userData = JSON.parse(u);
    return userData.id === userId;
  });
  
  if (userToRemove) {
    await redis.srem(`room:${roomId}:users`, userToRemove);
  }
};

io.on('connection', (socket) => {
  console.log(`User ${socket.data.user.id} connected`);
  
  // Store user socket
  userSockets.set(socket.data.user.id, socket);

  // Join room
  socket.on('join-room', async (roomId) => {
    try {
      socket.join(roomId);
      
      // Add user to room in Redis
      await addUserToRoom(roomId, socket.data.user);
      
      // Store room info
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          id: roomId,
          users: new Set(),
          createdAt: Date.now()
        });
      }
      
      activeRooms.get(roomId).users.add(socket.data.user.id);
      
      // Get all users in room
      const roomUsers = await getRoomUsers(roomId);
      
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
      // Save edit to Redis
      await saveEditToRedis(roomId, edit, socket.data.user.id);
      
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
      const chatData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        userId: socket.data.user.id,
        user: socket.data.user,
        message,
        timestamp: Date.now()
      };
      
      // Save message to Redis
      await redis.rpush(`room:${roomId}:messages`, JSON.stringify(chatData));
      await redis.expire(`room:${roomId}:messages`, 86400); // 24 hours
      
      // Broadcast message to room
      io.to(roomId).emit('chat-message-received', chatData);
      
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
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.users.has(socket.data.user.id)) {
        room.users.delete(socket.data.user.id);
        
        // Remove from Redis
        await removeUserFromRoom(roomId, socket.data.user.id);
        
        // Notify room about user leaving
        socket.to(roomId).emit('user-left', {
          user: socket.data.user,
          roomUsers: await getRoomUsers(roomId)
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    }
    
    // Remove user socket
    userSockets.delete(socket.data.user.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeRooms: activeRooms.size,
    connectedUsers: userSockets.size,
    timestamp: Date.now()
  });
});

// Get room info endpoint
app.get('/api/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomUsers = await getRoomUsers(roomId);
    const recentEdits = await redis.lrange(`room:${roomId}:edits`, -10, -1);
    const recentMessages = await redis.lrange(`room:${roomId}:messages`, -10, -1);
    
    res.json({
      roomId,
      users: roomUsers,
      recentEdits: recentEdits.map(edit => JSON.parse(edit)),
      recentMessages: recentMessages.map(msg => JSON.parse(msg)),
      isActive: activeRooms.has(roomId)
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

const PORT = process.env.COLLABORATION_PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Collaboration server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});
