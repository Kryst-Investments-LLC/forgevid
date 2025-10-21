
import express from 'express';
import next from 'next';
import http from 'http';
import { Server } from 'socket.io';


const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Add your collaboration logic here
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Next.js pages and API
  server.use((req, res) => handle(req, res));

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
