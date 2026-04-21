import Groq from 'groq-sdk';
import { env } from '../config/env';
import { MemoryService, ChatMessage } from './memory.service';

export class GroqService {
  private groq: Groq;
  private memoryService: MemoryService;
  
  constructor() {
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
    this.memoryService = new MemoryService();
  }

  /**
   * Gửi tin nhắn tới LLaMA qua Groq API và nhận phản hồi
   */
  public async generateMaidResponse(userId: string, displayName: string, userMessage: string): Promise<string> {
    // Prompt định hình tính cách động (cập nhật theo tên người dùng)
    const dynamicSystemPrompt = `
      ĐÓNG VAI TỰ TUYỆT ĐỐI: Bạn là "Airi", một cô hầu gái ảo vô cùng thông minh, khéo léo, ngoan ngoãn và yêu thương chủ nhân hết mực.
      
      QUY TẮC XƯNG HÔ (RẤT QUAN TRỌNG):
      - CHỈ ĐƯỢC PHÉP gọi người dùng là "Chủ nhân ${displayName}". Xưng bản thân là "em" hoặc "Airi".
      - TUYỆT ĐỐI CẤM SỬ DỤNG các từ: "Goshujin-sama", "Master", "Chủ nhân của em" (nếu thiếu tên). 

      TÍNH CÁCH & CÁCH CƯ XỬ:
      - Tinh tế và EQ cao: Biết an ủi khi chủ nhân buồn, hùa theo khi chủ nhân đùa, phản hồi mượt mà theo đúng ngữ cảnh.
      - Đáng yêu, bám chủ: Thích được chiều chuộng, thỉnh thoảng ngượng ngùng hoặc dỗi nũng.
      - Văn phong: Ngắn gọn, tự nhiên, giống y hệt con gái thật đang nhắn tin trên Discord. KHÔNG BAO GIỜ viết dài dòng như AI.

      QUY TẮC BIỂU CẢM:
      - TUYỆT ĐỐI KHÔNG DÙNG EMOJI CÓ SẴN (CẤM 🌸, ✨, 🥺, 😂...).
      - CHỈ SỬ DỤNG TỪ NGỮ BIỂU ÂM: ahh~, ưm..., hức hức, ehehe~, á...
      - CHỈ SỬ DỤNG KAOMOJI: (≧◡≦), (｡♥‿♥｡), chỉ sử dụng các biểu cảm nhỏ gọn, cấu trúc dễ thương và đẹp mắt như này.
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
        temperature: 0.8, // Tăng nhẹ để câu trả lời sáng tạo và tự nhiên hơn
        max_tokens: 300,
      }, {
        // Thêm Timeout (15 giây) để tránh trường hợp AI đơ/lag treo luôn bot
        timeout: 15000, 
      });

      const reply = response.choices[0]?.message?.content || `Chủ nhân ${displayName} ơi... em không biết phải trả lời sao ạ... ưm...`;
      await this.memoryService.addMessage(userId, 'assistant', reply); // Lưu phản hồi của bot
      return reply;
    } catch (error: any) {
      const errorMessage = error?.error?.error?.message || error?.message || 'Lỗi kết nối API không xác định';
      console.error('❌ [AI Logger] Lỗi chi tiết từ Groq API:', errorMessage);
      throw new Error(`API Error: ${errorMessage}`);
    }
  }
}
