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

const ChangeLogSchema = new Schema(
  {
    userId:      { type: String, required: true },
    username:    { type: String, required: true },
    color:       { type: String, required: true },
    fileName:    { type: String, required: true },
    timestamp:   { type: Number, required: true },
    changeType:  { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

// ─── Room document interface ──────────────────────────────────────────────────

export interface IRoomDocument extends Document {
  roomId:   string;
  savedAt:  Date;
  fileTree: { id: string; name: string; isFolder: boolean; parentId: string | null }[];
  files:    { id: string; name: string; language: string; text: string; version: number }[];
  changesLog: {
    userId: string;
    username: string;
    color: string;
    fileName: string;
    timestamp: number;
    changeType: string;
    description: string;
  }[];
}

// ─── Room schema ──────────────────────────────────────────────────────────────

const RoomSchema = new Schema<IRoomDocument>(
  {
    roomId:   { type: String, required: true, unique: true, index: true },
    savedAt:  { type: Date,   default: Date.now },
    fileTree: [FileNodeSchema],
    files:    [FileDocSchema],
    changesLog: [ChangeLogSchema],
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
