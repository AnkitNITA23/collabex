/**
 * persist.ts — Dual-backend persistence layer
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  If MONGODB_URI is set  →  saves/loads from MongoDB Atlas       │
 * │  Otherwise              →  falls back to local data/rooms.json  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * The MongoDB URI is read ONLY from process.env — it is never
 * hard-coded and the .env file is gitignored.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { RoomModel } from './models/Room';
import { RoomState } from './room';
import { DocumentState } from './document';

// ─── Connection state ─────────────────────────────────────────────────────────

let mongoConnected = false;
let mongoConnecting = false;

/**
 * Connect to MongoDB if MONGODB_URI is available.
 * Safe to call multiple times — only connects once.
 */
export async function connectMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.log('[persist] No MONGODB_URI set — using JSON-file fallback.');
    return false;
  }

  if (mongoConnected) return true;
  if (mongoConnecting) {
    // Wait for the in-progress connection
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (mongoConnected || !mongoConnecting) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    return mongoConnected;
  }

  mongoConnecting = true;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      // Mongoose 7+ no longer needs useNewUrlParser / useUnifiedTopology
    });
    mongoConnected = true;
    mongoConnecting = false;
    console.log('[persist] MongoDB connected.');
    return true;
  } catch (err: any) {
    mongoConnecting = false;
    console.error('[persist] MongoDB connection failed — falling back to JSON.', err.message);
    return false;
  }
}

// ─── MongoDB implementation ───────────────────────────────────────────────────

async function persistRoomMongo(room: RoomState): Promise<void> {
  const fileTreeArr = Array.from(room.fileTree.values());
  const filesArr = [];

  for (const [id, node] of room.fileTree.entries()) {
    if (!node.isFolder) {
      const doc = room.files.get(id);
      filesArr.push({
        id,
        name:     node.name,
        language: doc?.language ?? 'javascript',
        text:     doc?.text     ?? '',
        version:  doc?.version  ?? 0,
      });
    }
  }

  await RoomModel.findOneAndUpdate(
    { roomId: room.roomId },
    { roomId: room.roomId, savedAt: new Date(), fileTree: fileTreeArr, files: filesArr },
    { upsert: true, new: true }
  );

  console.log(`[persist] Room ${room.roomId} saved to MongoDB (${filesArr.length} file(s)).`);
}

async function loadRoomMongo(roomId: string): Promise<RoomState | null> {
  const doc = await RoomModel.findOne({ roomId }).lean();
  if (!doc) return null;

  const room = new RoomState(roomId, true /* skipDefault */);

  for (const node of doc.fileTree) {
    room.fileTree.set(node.id, node);
  }

  for (const f of doc.files) {
    const fileDoc = new DocumentState(f.text, f.language);
    fileDoc.version = f.version;
    room.files.set(f.id, fileDoc);
  }

  console.log(`[persist] Room ${roomId} restored from MongoDB (${doc.files.length} file(s)).`);
  return room;
}

// ─── JSON-file fallback implementation ───────────────────────────────────────

const DATA_DIR  = path.join(__dirname, '..', '..', 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

interface JsonRoom {
  roomId:   string;
  savedAt:  number;
  fileTree: { id: string; name: string; isFolder: boolean; parentId: string | null }[];
  files:    { id: string; name: string; language: string; text: string; version: number }[];
}

function readJsonData(): { rooms: JsonRoom[] } {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ROOMS_FILE)) return { rooms: [] };
  try {
    return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf-8'));
  } catch {
    return { rooms: [] };
  }
}

function writeJsonData(data: { rooms: JsonRoom[] }): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function persistRoomJson(room: RoomState): void {
  const data = readJsonData();
  const fileTreeArr = Array.from(room.fileTree.values());
  const filesArr: JsonRoom['files'] = [];

  for (const [id, node] of room.fileTree.entries()) {
    if (!node.isFolder) {
      const doc = room.files.get(id);
      filesArr.push({
        id,
        name:     node.name,
        language: doc?.language ?? 'javascript',
        text:     doc?.text     ?? '',
        version:  doc?.version  ?? 0,
      });
    }
  }

  const payload: JsonRoom = { roomId: room.roomId, savedAt: Date.now(), fileTree: fileTreeArr, files: filesArr };
  const idx = data.rooms.findIndex((r) => r.roomId === room.roomId);
  if (idx >= 0) data.rooms[idx] = payload; else data.rooms.push(payload);
  writeJsonData(data);
  console.log(`[persist] Room ${room.roomId} saved to JSON (${filesArr.length} file(s)).`);
}

function loadRoomJson(roomId: string): RoomState | null {
  const data = readJsonData();
  const saved = data.rooms.find((r) => r.roomId === roomId);
  if (!saved) return null;

  const room = new RoomState(roomId, true /* skipDefault */);
  for (const node of saved.fileTree) room.fileTree.set(node.id, node);
  for (const f of saved.files) {
    const doc = new DocumentState(f.text, f.language);
    doc.version = f.version;
    room.files.set(f.id, doc);
  }

  console.log(`[persist] Room ${roomId} restored from JSON (${saved.files.length} file(s)).`);
  return room;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Save a room's state. Uses MongoDB if connected, otherwise JSON file. */
export async function persistRoom(room: RoomState): Promise<void> {
  if (mongoConnected) {
    try {
      await persistRoomMongo(room);
      return;
    } catch (err: any) {
      console.error(`[persist] MongoDB save failed: ${err.message}. Falling back to JSON persistence.`, err);
    }
  }
  
  try {
    persistRoomJson(room);
  } catch (err: any) {
    console.error(`[persist] JSON fallback save failed: ${err.message}`, err);
  }
}

/** Load a room's state. Returns null if not found. */
export async function loadPersistedRoom(roomId: string): Promise<RoomState | null> {
  if (mongoConnected) {
    try {
      const room = await loadRoomMongo(roomId);
      if (room) return room;
    } catch (err: any) {
      console.error(`[persist] MongoDB load failed: ${err.message}. Falling back to JSON load.`, err);
    }
  }
  return loadRoomJson(roomId);
}
