import mongoose, { Schema, Document } from 'mongoose';
import { ChatMessage } from '../services/memory.service';

export interface IUserMemory extends Document {
  userId: string;
  messages: ChatMessage[];
}

const UserMemorySchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  messages: { type: Array, default: [] }
});

export default mongoose.model<IUserMemory>('UserMemory', UserMemorySchema);