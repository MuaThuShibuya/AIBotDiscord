import { Message } from 'discord.js';
import { GroqService } from '../services/groq.service';
import { MemoryService } from '../services/memory.service';

const groqService = new GroqService();
const memoryService = new MemoryService();
const PREFIX = '$'; // Ký tự đặc biệt để gọi lệnh (bạn có thể đổi thành ?, ., hoặc airi!)
const AI_PREFIX = '~'; // Ký tự đặc biệt để gọi AI trò chuyện nhanh

export const handleMessageCreate = async (message: Message): Promise<void> => {
  // Bỏ qua tin nhắn từ các bot khác để tránh lặp vô tận
  if (message.author.bot) return;

  // [LOGGER] In tin nhắn ra console để kiểm tra bot có "đọc" được chữ không
  console.log(`[Tin nhắn đến] ${message.author.username}: "${message.content}"`);

  // 1. XỬ LÝ LỆNH BẰNG KÝ TỰ ĐẶC BIỆT (Prefix Commands)
  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command === 'ping') {
      await message.reply(`Pong! Em vẫn đang thức đợi Chủ nhân ${message.author.username} ạ~ ehehe...`);
      return; // Dừng lại, không gọi AI
    } else if (command === 'clear') {
      await memoryService.clearMemory(message.author.id);
      await message.reply(`Em đã dọn dẹp sạch trí nhớ rồi ạ... Chủ nhân ${message.author.username} muốn nói chuyện gì mới với em nào? (///￣ ￣///)`);
      return; // Dừng lại, không gọi AI
    }
  }

  // 2. XỬ LÝ TRÒ CHUYỆN AI
  // Kiểm tra xem tin nhắn có phải là gửi riêng cho bot (DM) hoặc bot được tag không
  const isDM = message.channel.isDMBased();
  const isMentioned = message.mentions.has(message.client.user!);
  const isAiPrefix = message.content.startsWith(AI_PREFIX);

  if (isDM || isMentioned || isAiPrefix) {
    try {
      // Làm sạch tin nhắn (Xóa phần tag tên bot hoặc ký tự gọi AI)
      let cleanMessage = message.content;
      if (isAiPrefix) {
        cleanMessage = cleanMessage.slice(AI_PREFIX.length).trim();
      } else if (isMentioned) {
        cleanMessage = cleanMessage.replace(`<@${message.client.user?.id}>`, '').trim();
      }
      
      if (!cleanMessage) {
        await message.reply(`Chủ nhân ${message.author.username} gọi em có việc gì không ạ... ưm?`);
        return;
      }

      // Hiển thị trạng thái "đang gõ..." trên Discord cho chân thực (kiểm tra loại kênh)
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Lấy phản hồi từ AI
      const maidReply = await groqService.generateMaidResponse(message.author.id, message.author.username, cleanMessage);

      // Trả lời người dùng
      await message.reply(maidReply);
    } catch (error: any) {
      console.error('❌ [Bot Logger] Lỗi khi xử lý chat (Có thể do đơ, lag hoặc API lỗi):', error);
      await message.reply(`Chủ nhân ${message.author.username} ơi... hệ thống của em bị lag mất rồi... Chủ nhân đợi em một lát nhé! hức hức (╥﹏╥)\n\`\`\`${error.message}\`\`\``);
    }
  }
};
