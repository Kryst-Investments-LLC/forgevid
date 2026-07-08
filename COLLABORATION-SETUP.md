# 🚀 ForgeVid Real-Time Collaboration Setup

This guide will help you set up the complete real-time collaboration system for ForgeVid.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │ Collaboration   │    │     Redis       │
│   (Port 3000)   │◄──►│    Server       │◄──►│   (Port 6379)   │
│                 │    │   (Port 3001)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- Docker Desktop (for Redis)
- Git

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install collaboration server dependencies
cd server
npm install
cd ..
```

### 2. Set Up Redis

**Option A: Using Docker (Recommended)**
```bash
# Start Redis with Docker Compose
docker-compose up -d redis

# Or use the PowerShell script
.\scripts\setup-redis.ps1
```

**Option B: Install Redis Locally**
- Windows: Download from https://github.com/microsoftarchive/redis/releases
- macOS: `brew install redis`
- Linux: `sudo apt-get install redis-server`

### 3. Environment Variables

Create `.env.local` in the root directory:

```env
# JWT Secret for collaboration authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Collaboration Server
COLLABORATION_PORT=3001
CLIENT_URL=http://localhost:3000
```

### 4. Start the Application

**Option A: Start Both Servers (Recommended)**
```bash
npm run dev:full
```

**Option B: Start Separately**
```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start collaboration server
npm run collaboration:dev
```

## 🎯 Features Implemented

### ✅ Real-Time Collaboration
- **WebSocket Server**: Socket.io-based real-time communication
- **User Presence**: See who's online in real-time
- **Live Cursors**: See other users' cursor movements
- **Edit Synchronization**: Real-time edit sharing between users
- **Chat System**: Live messaging with typing indicators

### ✅ Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **User Management**: Session-based user identification
- **Room Access Control**: Secure room joining and management

### ✅ Data Persistence
- **Redis Storage**: Persistent storage for rooms, edits, and messages
- **Edit History**: Track all changes with timestamps
- **Message History**: Persistent chat messages
- **Room State**: Synchronized video playback state

### ✅ AI Integration
- **Smart Suggestions**: AI-powered editing suggestions
- **Context Awareness**: Suggestions based on current edits
- **Real-time Feedback**: Instant AI responses to changes

## 🧪 Testing the System

### 1. Access the Collaboration Page
Navigate to: `http://localhost:3000/en/collaborate`

### 2. Create or Join a Room
- Click "Create Room" to generate a new room ID
- Or enter an existing room ID to join

### 3. Test Real-Time Features
- **Multiple Users**: Open multiple browser tabs/windows
- **Live Editing**: Send demo edits and see them appear instantly
- **Chat**: Send messages and see them in real-time
- **Cursors**: Move your cursor and see others' cursors
- **Video Sync**: Play/pause video and see it sync across users

## 🔧 Development

### Server Structure
```
server/
├── collaboration-server.js    # Main WebSocket server
├── package.json              # Server dependencies
└── README.md                 # Server documentation
```

### API Endpoints
- `GET /health` - Server health check
- `GET /api/room/:roomId` - Get room information
- `POST /api/collaboration/auth` - Get JWT token for collaboration

### WebSocket Events
- `join-room` - Join a collaboration room
- `edit` - Send edit changes
- `cursor-move` - Send cursor position
- `chat-message` - Send chat message
- `video-state-change` - Sync video playback
- `typing` - Typing indicators

## 🐛 Troubleshooting

### Common Issues

**1. Redis Connection Failed**
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

**2. Collaboration Server Won't Start**
```bash
# Check if port 3001 is available
netstat -ano | findstr :3001

# Kill process using port 3001
taskkill /PID <PID> /F

# Start server manually
cd server && node collaboration-server.js
```

**3. WebSocket Connection Failed**
- Check if collaboration server is running on port 3001
- Verify CORS settings in server configuration
- Check browser console for connection errors

**4. JWT Authentication Errors**
- Verify JWT_SECRET is set in environment variables
- Check if user is properly authenticated in Next.js app
- Clear browser localStorage and try again

### Debug Mode
```bash
# Enable debug logging
DEBUG=socket.io:* npm run collaboration:dev
```

## 📊 Monitoring

### Health Check
Visit: `http://localhost:3001/health`

Response:
```json
{
  "status": "healthy",
  "activeRooms": 2,
  "connectedUsers": 5,
  "timestamp": 1694123456789
}
```

### Redis Management
Visit: `http://localhost:8081` (if Redis Commander is running)

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
REDIS_HOST=your-redis-host
REDIS_PORT=6379
COLLABORATION_PORT=3001
CLIENT_URL=https://forgevid.com
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling
- Use Redis Cluster for high availability
- Deploy multiple collaboration server instances
- Use load balancer for WebSocket connections

## 📚 API Documentation

### Authentication
All collaboration features require JWT authentication. Get a token from:
```
POST /api/collaboration/auth
```

### WebSocket Connection
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});
```

### Room Management
```javascript
// Join room
socket.emit('join-room', 'room-123');

// Leave room (automatic on disconnect)
socket.disconnect();
```

### Real-Time Editing
```javascript
// Send edit
socket.emit('edit', {
  roomId: 'room-123',
  edit: {
    type: 'text-change',
    target: 'scene-1',
    value: 'New text content',
    timestamp: Date.now()
  }
});

// Receive edits
socket.on('edit-received', (editData) => {
  console.log('Edit received:', editData);
});
```

## 🎉 Success!

You now have a fully functional real-time collaboration system! Users can:
- ✅ Edit videos together in real-time
- ✅ Chat and communicate instantly
- ✅ See live cursors and user presence
- ✅ Get AI-powered suggestions
- ✅ Synchronize video playback
- ✅ Access persistent edit history

The system is production-ready with proper authentication, error handling, and scalability features.
