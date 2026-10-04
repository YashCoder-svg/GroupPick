import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ensureSeedPlaces } from './services/placesService.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

// Socket.io room management
io.on('connection', (socket) => {
  socket.on('join:group', ({ groupId }) => {
    if (groupId) {
      socket.join(`group:${groupId}`);
      // Notify group that a connection is active in the room
      io.to(`group:${groupId}`).emit('presence:ping', {
        socketId: socket.id,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('leave:group', ({ groupId }) => {
    if (groupId) {
      socket.leave(`group:${groupId}`);
    }
  });

  socket.on('disconnect', () => {
    // Clean disconnection
  });
});

// Store io instance on app for route controllers to use
app.set('io', io);

import { Group } from './models/Group.js';
import { runSeed } from './scripts/seed.js';

// Start database and server
const startServer = async () => {
  try {
    await connectDB();
    await ensureSeedPlaces();

    // Auto-seed realistic demo groups if DB is empty
    const groupCount = await Group.countDocuments();
    if (groupCount === 0) {
      await runSeed();
    }

    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 GroupPick Server running on port ${PORT}`);
      console.log(`📚 Swagger UI Docs: http://localhost:${PORT}/api/docs`);
      console.log(`🩺 Health Check:   http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Only listen if not imported by tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server, io };
