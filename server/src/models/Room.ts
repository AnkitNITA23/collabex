import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Sub-document schemas ─────────────────────────────────────────────────────

const FileNodeSchema = new Schema(
  {
    id:       { type: String, required: true },
    name:     { type: String, required: true },
    isFolder: { type: Boolean, required: true },
    parentId: { type: String, default: null },
  },
  { _id: false }
);

const FileDocSchema = new Schema(
  {
    id:       { type: String, required: true },
    name:     { type: String, required: true },
    language: { type: String, default: 'javascript' },
    text:     { type: String, default: '' },
    version:  { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Room document interface ──────────────────────────────────────────────────

export interface IRoomDocument extends Document {
  roomId:   string;
  savedAt:  Date;
  fileTree: { id: string; name: string; isFolder: boolean; parentId: string | null }[];
  files:    { id: string; name: string; language: string; text: string; version: number }[];
}

// ─── Room schema ──────────────────────────────────────────────────────────────

const RoomSchema = new Schema<IRoomDocument>(
  {
    roomId:   { type: String, required: true, unique: true, index: true },
    savedAt:  { type: Date,   default: Date.now },
    fileTree: [FileNodeSchema],
    files:    [FileDocSchema],
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Prevent model recompilation in watch mode
export const RoomModel: Model<IRoomDocument> =
  (mongoose.models['Room'] as Model<IRoomDocument>) ??
  mongoose.model<IRoomDocument>('Room', RoomSchema);
