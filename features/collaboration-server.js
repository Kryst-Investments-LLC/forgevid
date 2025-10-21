// Real-Time Collaboration Server (Socket.io scaffold)
import { Server } from 'socket.io';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { generateAISuggestion } from './collaboration-ai';
const redis = new Redis();
const io = new Server(3001, { cors: { origin: '*' } });
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.user = user;
        next();
    }
    catch (err) {
        next(new Error('Authentication error'));
    }
});
io.on('connection', (socket) => {
    socket.on('join-room', async (roomId) => {
        socket.join(roomId);
        await redis.sadd(`room:${roomId}:users`, socket.data.user.id);
        io.to(roomId).emit('user-joined', socket.data.user.id);
    });
    socket.on('edit', async ({ roomId, edit }) => {
        await redis.rpush(`room:${roomId}:edits`, JSON.stringify(edit));
        socket.to(roomId).emit('edit', { userId: socket.data.user.id, edit });
        const suggestion = generateAISuggestion(edit);
        io.to(roomId).emit('ai-suggestion', { suggestion });
    });
    socket.on('disconnect', async () => {
        // Remove user from room
        // ...existing code...
    });
});
console.log('Collaboration server running on port 3001');
