import UserMemory from '../models/userMemory.model';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MemoryService {
  private readonly MAX_HISTORY = 10; // Giới hạn số lượng tin nhắn nhớ được

  /**
   * Lấy lịch sử trò chuyện của một người dùng
   */
  public async getHistory(userId: string): Promise<ChatMessage[]> {
    const memory = await UserMemory.findOne({ userId });
    return memory ? memory.messages : [];
  }

  /**
   * Thêm tin nhắn mới vào bộ nhớ
   */
  public async addMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    let memory = await UserMemory.findOne({ userId });
    if (!memory) {
      memory = new UserMemory({ userId, messages: [] });
    }

    memory.messages.push({ role, content });

    // Nếu vượt quá giới hạn, xóa tin nhắn cũ nhất (FIFO)
    if (memory.messages.length > this.MAX_HISTORY) {
      memory.messages.shift();
    }

    await memory.save();
  }

  public async clearMemory(userId: string): Promise<void> {
    await UserMemory.deleteOne({ userId });
  }
}