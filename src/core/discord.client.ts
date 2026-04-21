import { Client, GatewayIntentBits, Partials } from 'discord.js';

// Khởi tạo Discord Client với các quyền (intents) cần thiết
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Bắt buộc phải bật Message Content Intent
    GatewayIntentBits.DirectMessages, // Cần thiết để nhận tin nhắn riêng (DM)
  ],
  partials: [
    Partials.Channel, // Cần thiết để nhận sự kiện DM
  ],
});