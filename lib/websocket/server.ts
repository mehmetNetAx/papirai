import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as Y from 'yjs';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Store Yjs documents per room
  const documents = new Map<string, Y.Doc>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', (room: string) => {
      socket.join(room);
      console.log(`Client ${socket.id} joined room: ${room}`);

      // Get or create Yjs document for this room
      if (!documents.has(room)) {
        documents.set(room, new Y.Doc());
      }

      const ydoc = documents.get(room)!;

      // Send current document state to new client
      const state = Y.encodeStateAsUpdate(ydoc);
      socket.emit('yjs-update', state);

      // Listen for Yjs updates from this client
      socket.on('yjs-update', (update: Uint8Array) => {
        Y.applyUpdate(ydoc, update);
        // Broadcast to other clients in the room
        socket.to(room).emit('yjs-update', update);
      });

      // Handle awareness (presence)
      socket.on('awareness-update', (update: any) => {
        socket.to(room).emit('awareness-update', update);
      });

      socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected from room: ${room}`);
      });
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

