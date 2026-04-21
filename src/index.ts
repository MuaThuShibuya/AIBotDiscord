import { ActivityType } from 'discord.js';
import mongoose from 'mongoose';
import { env } from './config/env';
import { client } from './core/discord.client';
import { handleMessageCreate } from './events/messageCreate.event';

client.once('clientReady', () => {
  console.log(`✅ [Maid Bot] Đã sẵn sàng phục vụ Goshujin-sama dưới tên: ${client.user?.tag}`);
  client.user?.setActivity('chăm sóc Goshujin-sama 🌸', {
    type: ActivityType.Playing,
  });
});

client.on('messageCreate', handleMessageCreate);

// Kết nối MongoDB sau đó mới khởi động bot
const startBot = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ [Database] Đã kết nối thành công tới MongoDB Atlas!');
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Lỗi khởi động:', error);
  }
};

startBot();

// --- GLOBAL ERROR HANDLERS ---
// Ngăn bot bị crash (sập Node.js process) khi có lỗi không được bắt (unhandled exceptions)
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [CRASH GUARD] Unhandled Rejection tại:', promise, 'lý do:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ [CRASH GUARD] Uncaught Exception:', error);
});
