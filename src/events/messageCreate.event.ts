import { Message, PermissionsBitField } from 'discord.js';
import { GroqService } from '../services/groq.service';
import { MemoryService } from '../services/memory.service';
import { ConfigService } from '../services/config.service';

import { ChatMode } from '../models/guildConfig.model';
// Khởi tạo các service một lần và truyền vào nhau (Dependency Injection)
const memoryService = new MemoryService();
const configService = new ConfigService();
const groqService = new GroqService(memoryService); // Truyền memoryService vào GroqService

const PREFIX = '$'; // Ký tự đặc biệt để gọi lệnh (bạn có thể đổi thành ?, ., hoặc airi!)
const AI_PREFIX = '~'; // Ký tự đặc biệt để gọi AI trò chuyện nhanh

export const handleMessageCreate = async (message: Message): Promise<void> => {
  console.log(`\n--- [Event Entry] ---`);
  console.log(`[${new Date().toISOString()}] Bắt đầu xử lý tin nhắn ID: ${message.id}`);

  // Bỏ qua tin nhắn từ các bot khác để tránh lặp vô tận
  if (message.author.bot) {
    console.log(`[Event Filter] Bỏ qua: Tin nhắn từ bot ${message.author.username}.`);
    return;
  }

  // Ưu tiên lấy biệt danh trong server (nickname), nếu không có thì lấy tên hiển thị (display name), cuối cùng mới lấy username
  const displayName = message.member?.displayName || message.author.displayName || message.author.username;

  // [LOGGER] In tin nhắn ra console để kiểm tra bot có "đọc" được chữ không
  console.log(`[Tin nhắn đến] ${displayName} (${message.author.username}): "${message.content}"`);

  // Xác định các điều kiện kích hoạt AI một lần để tối ưu và làm code dễ đọc hơn
  const isDM = message.channel.isDMBased();
  const isMentioned = message.mentions.has(message.client.user!);
  const isAiPrefix = message.content.startsWith(AI_PREFIX);

  // 1. XỬ LÝ LỆNH BẰNG KÝ TỰ ĐẶC BIỆT (Prefix Commands)
  if (message.content.startsWith(PREFIX)) {
    console.log(`[Path] Message content starts with prefix '${PREFIX}'. Entering command processing block.`);

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    console.log(`[Parser] Parsed command: '${command}', Args: [${args.join(', ')}]`);
    console.log(`[Command Logger] Nhận lệnh '${PREFIX}${command}' từ ${displayName} (${message.author.id})`);

    try {
      // Tái cấu trúc thành một chuỗi if/else if phẳng để logic rõ ràng hơn
      if (command === 'ping') {
        console.log(`[Command Handler] Executing 'ping' command.`);
        await message.reply(`Pong! Độ trễ mạng ở mức bình thường. Hệ thống trợ lý vẫn đang trực tuyến để hỗ trợ bạn, ${displayName}. *đẩy gọng kính*`);
        return;

      } else if (command === 'clear') {
        console.log(`[Command Handler] Executing 'clear' command.`);
        await memoryService.clearMemory(message.author.id);
        await message.reply(`Đã xóa toàn bộ bộ nhớ tạm thời của chúng ta. Bạn có cần hỗ trợ thông tin gì mới không, ${displayName}?`);
        return;

      } else if (command === 'all' || command === 'admin' || command === 'status' || command === 'clearall') {
        console.log(`[Command Handler] Executing admin-level command '${command}'.`);

        // 1. Kiểm tra xem có phải trong server không
        if (isDM || !message.guild) {
          console.log(`[Admin Command] Bỏ qua: Lệnh chỉ dùng được trong server.`);
          await message.reply(`Thông báo: ${displayName}, lệnh quản trị này chỉ có hiệu lực khi sử dụng bên trong một máy chủ (Server).`);
          return;
        }

        // 2. Lấy thông tin thành viên và kiểm tra quyền
        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) {
          console.log(`[Admin Command] ❌ Lỗi: Không lấy được data thành viên của ${displayName}.`);
          return;
        }
        
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
        console.log(`[Admin Command] Kiểm tra quyền Admin của ${displayName}: ${isAdmin ? 'CÓ QUYỀN ✅' : 'KHÔNG CÓ QUYỀN ❌'}`);

        if (!isAdmin) {
          await message.reply(`Từ chối truy cập: ${displayName}, bạn không có thẩm quyền Quản trị viên để thực thi lệnh này. Vui lòng tuân thủ quy định. (￢_￢)`);
          return;
        }

        // 3. Thực thi lệnh
        if (command === 'all') {
          await configService.setChatMode(message.guild.id, 'all');
          console.log(`[Admin Command] Đã chuyển mode server ${message.guild.name} thành 'all'.`);
          await message.reply(`Đã ghi nhận! Cấu hình máy chủ được chuyển sang **Chế độ Công khai**. Tôi sẽ tiếp nhận câu hỏi từ tất cả các thành viên (kích hoạt bằng \`${AI_PREFIX}\` hoặc tag tên).`);
        } else if (command === 'admin') {
          await configService.setChatMode(message.guild.id, 'admin');
          console.log(`[Admin Command] Đã chuyển mode server ${message.guild.name} thành 'admin'.`);
          await message.reply(`Đã ghi nhận! Cấu hình máy chủ được chuyển sang **Chế độ Bảo mật**. Từ giờ tôi sẽ chỉ hỗ trợ các Quản trị viên (kích hoạt bằng \`${AI_PREFIX}\` hoặc tag tên).`);
        } else if (command === 'status') {
          const currentMode = await configService.getChatMode(message.guild.id);
          console.log(`[Admin Command] Trạng thái hiện tại của server ${message.guild.name} là '${currentMode}'.`);
          const replyMessage = currentMode === 'all'
            ? `Trạng thái hiện tại: Trợ lý Airi đang ở chế độ hỗ trợ **Tất cả thành viên** trong máy chủ này.`
            : `Trạng thái hiện tại: Trợ lý Airi đang ở chế độ bảo mật, chỉ phản hồi lệnh từ **Quản trị viên** trong máy chủ này.`;
          await message.reply(replyMessage);
        } else if (command === 'clearall') {
          await memoryService.clearAllMemory();
          console.log(`[Admin Command] Đã xóa toàn bộ lịch sử trò chuyện của tất cả người dùng.`);
          await message.reply(`Đã xóa sạch bộ nhớ dữ liệu của toàn bộ hệ thống. Bây giờ tôi đã quên hết các phiên trò chuyện cũ và sẵn sàng làm việc dưới vai trò Trợ lý quản lý. *đẩy gọng kính*`);
        }
        return;
      }
      // Nếu có lệnh khác trong tương lai, có thể thêm else if ở đây
      // Hoặc một log cho lệnh không xác định
      console.log(`[Command Handler] Lệnh '${command}' không được nhận dạng.`);

    } catch (error: any) {
      // Bắt lỗi nếu bot bị thiếu quyền Gửi tin nhắn trong Discord
      console.error(`❌ [Command Logger] Lỗi khi chạy lệnh (Khả năng cao do bot thiếu quyền Gửi tin nhắn):`, error.message);
    }
  // 2. XỬ LÝ TRÒ CHUYỆN AI (Dùng else if để logic rõ ràng, không xử lý trùng lặp với command)
  } else if (isDM || isMentioned || isAiPrefix) {
    console.log(`[Path] Message is a potential AI chat trigger. Entering AI processing block.`);

    let chatMode: ChatMode = 'all'; // Mặc định là 'all' cho tin nhắn riêng (DM)

    // Nếu là tin nhắn trong server (không phải DM), kiểm tra quyền theo cài đặt của server
    if (!isDM && message.guild) {
      chatMode = await configService.getChatMode(message.guild.id);
      if (chatMode === 'admin' && !message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        // Ở chế độ admin, nếu người dùng không phải admin thì bot sẽ im lặng.
        // Điều này áp dụng cho cả mention và prefix ~, nhưng không ảnh hưởng đến tin nhắn riêng (DM).
        console.log(`[AI Filter] Bỏ qua: Server mode là 'admin' và người dùng không phải admin.`);
        return;
      } else {
        console.log(`[AI Logger] Chế độ chat của server '${message.guild.name}' là: '${chatMode}'.`);
      }
    }

    try {
      // Làm sạch tin nhắn (Xóa phần tag tên bot hoặc ký tự gọi AI)
      let cleanMessage = message.content;
      if (isAiPrefix) {
        cleanMessage = cleanMessage.slice(AI_PREFIX.length).trim();
      } else if (isMentioned) {
        // Regex này xóa tất cả các mention trong tin nhắn
        cleanMessage = cleanMessage.replace(/<@!?\d+>/g, '').trim();
      }

      if (!cleanMessage) {
        console.log(`[AI Logger] Tin nhắn AI rỗng sau khi làm sạch, bỏ qua.`);
        await message.reply(`Bạn gọi tôi có việc gì cần hỗ trợ sao, ${displayName}? *nhướng mày*`);
        return;
      }
      console.log(`[AI Logger] Tin nhắn đã làm sạch: "${cleanMessage}"`);

      // Hiển thị trạng thái "đang gõ..." trên Discord cho chân thực (kiểm tra loại kênh)
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }
      console.log(`[AI Logger] Đang gọi GroqService để tạo phản hồi...`);

      // Lấy phản hồi từ AI
      const maidReply = await groqService.generateMaidResponse(message.author.id, displayName, cleanMessage, chatMode);
      console.log(`[AI Logger] GroqService đã phản hồi: "${maidReply.substring(0, 100)}..."`); // Log 100 ký tự đầu

      // Trả lời người dùng
      await message.reply(maidReply);
    } catch (error: any) {
      console.error('❌ [Bot Logger] Lỗi khi xử lý chat (Có thể do đơ, lag hoặc API lỗi):', error);
      await message.reply(`Cảnh báo: Máy chủ đang gặp sự cố kết nối. Xin lỗi ${displayName}, bạn chịu khó đợi tôi một lát để khắc phục nhé... *lúng túng gõ phím* (///_///)\n\`\`\`${error.message}\`\`\``);
    }
  } else {
    console.log(`[Path] Message is not a command or AI trigger. No action taken.`);
  }
};
