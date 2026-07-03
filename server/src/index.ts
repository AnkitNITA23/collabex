// Load environment variables from .env BEFORE anything else
import 'dotenv/config';

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomState } from './room';
import { TextOperation } from '../../shared/ot';
import { transformPosition } from './document';
import { persistRoom, loadPersistedRoom, connectMongo } from './persist';

const app = express();

// Restrict CORS to the CLIENT_ORIGIN env var in production, allow all in dev.
// Strips trailing slashes to avoid mismatched origins in browser requests.
const parseAllowedOrigin = (): string | string[] => {
  const originEnv = process.env.CLIENT_ORIGIN;
  if (!originEnv) return '*';
  
  const origins = originEnv.split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
    
  return origins.length === 1 ? origins[0] : (origins.length > 0 ? origins : '*');
};

const allowedOrigin = parseAllowedOrigin();
app.use(cors({ origin: allowedOrigin }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

// Map of roomId -> RoomState
const rooms = new Map<string, RoomState>();

// In-flight load promises to prevent duplicate DB reads on concurrent joins
const pendingRoomLoads = new Map<string, Promise<RoomState>>();

// Helper to get or create room state — tries to restore from DB/disk first
async function getOrCreateRoom(roomId: string): Promise<RoomState> {
  const cached = rooms.get(roomId);
  if (cached) return cached;

  // Deduplicate concurrent join-room calls for the same roomId
  const existing = pendingRoomLoads.get(roomId);
  if (existing) return existing;

  const loadPromise = loadPersistedRoom(roomId).then((persisted) => {
    const room = persisted ?? new RoomState(roomId);
    rooms.set(roomId, room);
    pendingRoomLoads.delete(roomId);
    return room;
  });

  pendingRoomLoads.set(roomId, loadPromise);
  return loadPromise;
}

// Track which socket is in which room
interface UserConnection {
  roomId: string;
  username: string;
  color: string;
}
const socketConnections = new Map<string, UserConnection>();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Join Room
  socket.on('join-room', async ({ roomId, username, color, avatar }: { roomId: string; username: string; color: string; avatar?: string }) => {
    if (!roomId || !username) {
      socket.emit('error-msg', 'Room ID and username are required.');
      return;
    }

    socket.join(roomId);
    const room = await getOrCreateRoom(roomId);

    // Add collaborator
    const collab = room.addCollaborator(socket.id, username, color, avatar);
    socketConnections.set(socket.id, { roomId, username, color });

    console.log(`User ${username} (${socket.id}) joined room ${roomId}`);

    // Send current room state (all files, file tree, active file info) to the new client
    const filesWithContent = room.getFilesWithContent();
    const defaultActiveFileId = filesWithContent.find(f => f.id === 'main-js') ? 'main-js' : (filesWithContent[0]?.id || '');
    const defaultActiveFile = filesWithContent.find(f => f.id === defaultActiveFileId);

    socket.emit('init-room', {
      files: filesWithContent,
      fileTree: room.getFileTreeList(),
      activeFileId: defaultActiveFileId,
      text: defaultActiveFile?.text || '',
      version: defaultActiveFile?.version || 0,
      collaborators: room.getCollaboratorsList(),
      changesLog: room.changesLog
    });

    // Notify other users in the room
    socket.to(roomId).emit('collaborator-joined', collab);
  });

  // 2. Operational Transformation Change
  socket.on('operation', ({ roomId, fileId, op, version }: { roomId: string; fileId: string; op: any[]; version: number }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) {
      console.warn('[Server] Ignored operation: socket is not associated with this room:', { socketId: socket.id, roomId });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      console.warn('[Server] Ignored operation: room does not exist in memory:', roomId);
      return;
    }

    const doc = room.files.get(fileId);
    if (!doc) {
      console.warn('[Server] Ignored operation: file does not exist in room:', { roomId, fileId });
      return;
    }

    try {
      console.log('[Server] Incoming operation:', {
        socketId: socket.id,
        roomId,
        fileId,
        version,
        opLength: op.length
      });

      const operation = TextOperation.fromJSON(op);
      
      // Apply the operation using server-side OT
      const transformedOp = doc.applyOperation(operation, version);
      console.log('[Server] Resulting document text:', JSON.stringify(doc.text));

      // Add to change log
      const fileNode = room.fileTree.get(fileId);
      const fileName = fileNode ? fileNode.name : 'Unknown File';
      const logEntry = room.addChangeLog(
        socket.id,
        conn.username,
        conn.color,
        'edit',
        fileName,
        `Edited ${fileName}`
      );
      io.in(roomId).emit('new-changelog-entry', logEntry);

      // Adjust existing cursors of other collaborators in this room who are editing this file
      for (const collab of room.collaborators.values()) {
        if (collab.id !== socket.id && collab.activeFileId === fileId) {
          if (collab.cursor !== null) {
            collab.cursor = transformPosition(collab.cursor, transformedOp);
          }
          if (collab.selectionEnd !== null) {
            collab.selectionEnd = transformPosition(collab.selectionEnd, transformedOp);
          }
        }
      }

      console.log('[Server] Sending ACK to client:', socket.id, { fileId, docVersion: doc.version });
      // Send ACK back to the sender containing the new server version
      socket.emit('ack', { fileId, version: doc.version });

      console.log('[Server] Broadcasting operation to room:', roomId, { clientID: socket.id, docVersion: doc.version });
      // Broadcast the transformed operation to other clients in the room
      socket.to(roomId).emit('operation', {
        fileId,
        op: transformedOp.toJSON(),
        clientID: socket.id,
        version: doc.version
      });
    } catch (err: any) {
      console.error(`[Server] OT Error in room ${roomId} for file ${fileId} client ${socket.id}:`, err.message);
      // If we fall out of sync, send the client the current full document text to force resync
      socket.emit('resync', {
        fileId,
        text: doc.text,
        version: doc.version
      });
    }
  });

  // 3. Cursor & Selection tracking
  socket.on('cursor', ({ roomId, fileId, cursor, selectionEnd }: { roomId: string; fileId: string; cursor: number | null; selectionEnd: number | null }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const collab = room.collaborators.get(socket.id);
    if (collab) {
      collab.activeFileId = fileId;
      collab.cursor = cursor;
      collab.selectionEnd = selectionEnd;
      collab.lastActive = Date.now();
    }

    // Broadcast cursor position to other clients in the room
    socket.to(roomId).emit('cursor', {
      clientID: socket.id,
      fileId,
      cursor,
      selectionEnd
    });
  });

  // 4. File system operations
  socket.on('create-file', ({ roomId, id, name, isFolder, parentId }: { roomId: string; id: string; name: string; isFolder: boolean; parentId: string | null }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const node = room.createFile(id, name, isFolder, parentId);

    // Add to change log
    const logEntry = room.addChangeLog(
      socket.id,
      conn.username,
      conn.color,
      'create',
      name,
      `Created ${isFolder ? 'folder' : 'file'} "${name}"`
    );
    io.in(roomId).emit('new-changelog-entry', logEntry);

    // Broadcast to everyone in the room
    io.in(roomId).emit('file-created', {
      node,
      file: !isFolder ? {
        id,
        name,
        language: room.files.get(id)?.language || 'javascript'
      } : null
    });
  });

  socket.on('delete-file', ({ roomId, fileId }: { roomId: string; fileId: string }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const node = room.fileTree.get(fileId);
    const fileName = node ? node.name : 'Unknown File';
    const isFolder = node ? node.isFolder : false;

    room.deleteFile(fileId);

    // Add to change log
    const logEntry = room.addChangeLog(
      socket.id,
      conn.username,
      conn.color,
      'delete',
      fileName,
      `Deleted ${isFolder ? 'folder' : 'file'} "${fileName}"`
    );
    io.in(roomId).emit('new-changelog-entry', logEntry);

    // Broadcast delete event
    io.in(roomId).emit('file-deleted', { fileId });
  });

  socket.on('rename-file', ({ roomId, fileId, newName }: { roomId: string; fileId: string; newName: string }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const node = room.fileTree.get(fileId);
    const oldName = node ? node.name : 'Unknown File';

    room.renameFile(fileId, newName);

    // Add to change log
    const logEntry = room.addChangeLog(
      socket.id,
      conn.username,
      conn.color,
      'rename',
      newName,
      `Renamed "${oldName}" to "${newName}"`
    );
    io.in(roomId).emit('new-changelog-entry', logEntry);

    // Broadcast rename event
    io.in(roomId).emit('file-renamed', {
      fileId,
      newName,
      language: room.files.get(fileId)?.language || 'javascript'
    });
  });

  // 5. Programming language override change
  socket.on('language-change', ({ roomId, fileId, language }: { roomId: string; fileId: string; language: string }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const doc = room.files.get(fileId);
    if (doc) {
      doc.language = language;
    }
    
    // Broadcast language change to everyone in the room
    io.in(roomId).emit('language-change', { fileId, language });
  });

  // 6. Presence status change
  socket.on('presence-change', ({ roomId, status }: { roomId: string; status: string }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const collab = room.collaborators.get(socket.id);
    if (collab) {
      collab.status = status;
    }

    // Broadcast status change to everyone in the room
    socket.to(roomId).emit('presence-change', {
      clientID: socket.id,
      status
    });
  });

  // 7. Chat sync
  socket.on('chat-message', ({ roomId, text }: { roomId: string; text: string }) => {
    const conn = socketConnections.get(socket.id);
    if (!conn || conn.roomId !== roomId) return;

    const messagePayload = {
      clientID: socket.id,
      username: conn.username,
      color: conn.color,
      text,
      timestamp: Date.now()
    };

    // Broadcast chat to all clients in the room
    io.in(roomId).emit('chat-message', messagePayload);
  });

  // 8. Disconnect
  socket.on('disconnect', async () => {
    try {
      console.log(`Socket disconnected: ${socket.id}`);
      const conn = socketConnections.get(socket.id);
      if (conn) {
        const { roomId, username } = conn;
        const room = rooms.get(roomId);
        if (room) {
          room.removeCollaborator(socket.id);

          // Notify other clients in the room
          socket.to(roomId).emit('collaborator-left', { id: socket.id, username });

          // When the last user leaves, persist the room then remove from memory
          if (room.collaborators.size === 0) {
            await persistRoom(room);
            rooms.delete(roomId);
            console.log(`Room ${roomId} is empty — persisted and removed from memory.`);
          }
        }
        socketConnections.delete(socket.id);
      }
    } catch (err: any) {
      console.error(`Error in disconnect handler for socket ${socket.id}:`, err);
    }
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

(async () => {
  // Try to connect to MongoDB (will skip gracefully if MONGODB_URI is not set)
  await connectMongo();

  server.listen(PORT, () => {
    console.log(`CollabEx server running on port ${PORT}`);
  });
})();
