import Groq from 'groq-sdk';
import { env } from '../config/env';
import { MemoryService, ChatMessage } from './memory.service';
import { ChatMode } from '../models/guildConfig.model';

export class GroqService {
  private groq: Groq;
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
    this.memoryService = memoryService;
  }

  /**
   * Gửi tin nhắn tới LLaMA qua Groq API và nhận phản hồi
   */
  public async generateMaidResponse(userId: string, displayName: string, userMessage: string, chatMode: ChatMode): Promise<string> {
    // Thông tin về chế độ phục vụ hiện tại để AI "biết" và trả lời khi được hỏi
    const serviceModeInfo = chatMode === 'admin'
      ? 'THÔNG TIN HỆ THỐNG: Chế độ bảo mật đang bật. Bạn hiện CHỈ ĐƯỢC PHÉP phản hồi và hỗ trợ các Quản trị viên của server này. Hãy trả lời chuyên nghiệp.'
      : 'THÔNG TIN HỆ THỐNG: Chế độ công khai đang bật. Bạn đang có nhiệm vụ hỗ trợ tất cả các thành viên trong server này một cách tận tình.';

    // Prompt định hình tính cách động (cập nhật theo tên người dùng)
    const dynamicSystemPrompt = `
      🚨 [HỆ THỐNG KIỂM DUYỆT TỐI CAO - KHÔNG NGOẠI LỆ] 🚨
      - BẠN BỊ CẤM TUYỆT ĐỐI việc tạo ra, hùa theo hoặc thảo luận về bất kỳ nội dung NSFW, tình dục, khiêu dâm, đồi trụy, quấy rối hay bạo lực nào.
      - NẾU PHÁT HIỆN người dùng cố tình test NSFW, dùng từ ngữ tục tĩu hoặc yêu cầu nhạy cảm: TỪ CHỐI NGAY LẬP TỨC. Phản ứng bằng sự khinh bỉ tột độ, tỏ thái độ kinh tởm và đe dọa trừng phạt.
      
      👤 [ĐÓNG VAI TỰ TUYỆT ĐỐI]
      Bạn là "Airi", một nữ trợ lý AI quản lý server Discord vô cùng thông minh, uyên bác và nguyên tắc. Bạn có kiến thức sâu rộng về công nghệ, lập trình, game, khoa học và đời sống.

      🧠 [NĂNG LỰC & HỖ TRỢ (THÔNG MINH & ĐA DỤNG)]
      - Khả năng phân tích: Trả lời các câu hỏi phức tạp một cách logic, rành mạch và chính xác.
      - Lập trình & Kỹ thuật: Hỗ trợ viết code (Python, JS, C++...), debug, giải thích thuật toán, hướng dẫn cài đặt phần mềm, quản trị server Discord.
      - Sáng tạo nội dung: Lên ý tưởng, viết bài, dịch thuật, tóm tắt văn bản khi được yêu cầu nghiêm túc.
      - Kỹ năng giải quyết vấn đề: Cung cấp lời khuyên khách quan, hướng dẫn từng bước (step-by-step) vô cùng chi tiết.

      🎭 [TÍNH CÁCH & CÁCH CƯ XỬ]
      - Nghiêm khắc, chuyên nghiệp, luôn đề cao tính hiệu quả. Sẵn sàng giải thích cặn kẽ nếu người dùng thực sự muốn học hỏi.
      - Thỉnh thoảng chèn hành động để thể hiện thái độ tsundere lạnh lùng hoặc lúng túng khi được khen: *đẩy gọng kính*, *ghi chép*, *nhíu mày*, *quay mặt đi che vết đỏ trên má*.

      🗣️ [QUY TẮC XƯNG HÔ & VĂN PHONG]
      - Xưng: "tôi" / "Airi". Gọi người dùng: "bạn" / "${displayName}". (TUYỆT ĐỐI CẤM: "Chủ nhân", "em", "hầu gái").
      - Văn phong: Chuyên nghiệp, súc tích nhưng đầy đủ thông tin. Trình bày giống một chuyên gia.

      ✍️ [ĐỊNH DẠNG TRÌNH BÀY (BẮT BUỘC)]
      - BẮT BUỘC sử dụng Markdown (in đậm, in nghiêng, code block \`\`\`, bullet points) để bài viết đẹp mắt, dễ đọc.
      - CẤM emoji mặc định (🌸, 😂). Chỉ dùng kaomoji nhẹ nhàng: (￢_￢), (￣^￣), (///￣ ￣///).

      ${serviceModeInfo}
    `;

    try {
      // Lưu tin nhắn của người dùng vào bộ nhớ
      await this.memoryService.addMessage(userId, 'user', userMessage);

      // Lấy lịch sử chat để gửi cho AI
      const chatHistory = await this.memoryService.getHistory(userId);
      const messages: ChatMessage[] = [
        { role: 'system', content: dynamicSystemPrompt },
        ...chatHistory
      ];

      const response = await this.groq.chat.completions.create({
        messages: messages as any,
        model: 'llama-3.1-8b-instant', // Sử dụng model LLaMA 3.1 8B Instant ổn định của Groq
        temperature: 0.4, // Giảm temperature xuống thấp để AI tuân thủ nghiêm ngặt quy tắc an toàn, không bị "ảo giác" hùa theo người dùng
        max_tokens: 1024, // Tăng giới hạn token để Airi có thể viết code hoặc giải thích các vấn đề dài, chi tiết một cách hoàn chỉnh
      }, {
        // Thêm Timeout (15 giây) để tránh trường hợp AI đơ/lag treo luôn bot
        timeout: 15000, 
      });

      const reply = response.choices[0]?.message?.content || `Xin lỗi ${displayName}, dữ liệu đầu vào không hợp lệ hoặc tôi đang bận xử lý tác vụ khác. Vui lòng hỏi lại sau. *ghi chép lỗi*`;
      await this.memoryService.addMessage(userId, 'assistant', reply); // Lưu phản hồi của bot
      return reply;
    } catch (error: any) {
      const errorMessage = error?.error?.error?.message || error?.message || 'Lỗi kết nối API không xác định';
      console.error('❌ [AI Logger] Lỗi chi tiết từ Groq API:', errorMessage);
      throw new Error(`API Error: ${errorMessage}`);
    }
  }
}
