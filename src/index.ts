import { ActivityType } from 'discord.js';
import mongoose from 'mongoose';
import http from 'http';
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

// Helper để format bytes sang MB cho dễ đọc
const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

// Helper để lấy trạng thái kết nối của Mongoose
const getMongoState = (state: number) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[state] || 'unknown';
};

// Tạo HTTP Server để nhận ping và báo cáo sức khỏe
const keepAliveServer = http.createServer((req, res) => {
  // Thêm routing đơn giản: /health để báo cáo, các đường dẫn khác để ping
  if (req.url === '/health') {
    const healthReport = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      // client.uptime là milliseconds, đổi sang phút
      uptime: client.uptime ? `${(client.uptime / 1000 / 60).toFixed(2)} minutes` : 'Client not ready',
      discordClientStatus: client.isReady() ? 'Ready' : 'Not Ready',
      databaseStatus: getMongoState(mongoose.connection.readyState),
      memoryUsage: {
        rss: formatBytes(process.memoryUsage().rss), // Resident Set Size: tổng bộ nhớ mà process chiếm dụng
        heapUsed: formatBytes(process.memoryUsage().heapUsed), // Bộ nhớ heap đang được sử dụng
      },
    };

    // In báo cáo ra console log trên Render để bạn tiện theo dõi
    console.log('🩺 [Health Check] API được gọi, tạo báo cáo sức khỏe:');
    console.table(healthReport);

    // Trả về dữ liệu JSON cho cronjob hoặc trình duyệt
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthReport, null, 2));
  } else {
    // Endpoint mặc định để giữ cho bot "thức"
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive and running! Use the /health endpoint for a status report.');
  }
});

const PORT = process.env.PORT || 3000;
// Thêm '0.0.0.0' để ép Node.js mở port cho tất cả các luồng mạng (rất quan trọng để Render không báo lỗi Deploy Failed)
keepAliveServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🌐 [Keep-Alive] HTTP Server đang lắng nghe trên port ${PORT} để nhận ping.`);
});

// Kết nối MongoDB sau đó mới khởi động bot
const startBot = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
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
