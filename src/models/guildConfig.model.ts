import { Schema, model, Document } from 'mongoose';

export type ChatMode = 'all' | 'admin';

export interface IGuildConfig extends Document {
  guildId: string;
  chatMode: ChatMode;
}

const GuildConfigSchema = new Schema<IGuildConfig>({
  guildId: { type: String, required: true, unique: true },
  chatMode: { type: String, enum: ['all', 'admin'], default: 'all' },
});

export default model<IGuildConfig>('GuildConfig', GuildConfigSchema);