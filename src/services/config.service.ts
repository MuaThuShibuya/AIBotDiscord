import GuildConfig, { ChatMode } from '../models/guildConfig.model';

export class ConfigService {
  // Thêm một bộ nhớ đệm (cache) đơn giản để giảm tải cho database
  // Dữ liệu sẽ được lưu trong 5 phút trước khi cần lấy lại
  private cache = new Map<string, { mode: ChatMode; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

  /**
   * Lấy chế độ chat hiện tại của một server
   * @param guildId ID của server
   * @returns 'all' hoặc 'admin'
   */
  public async getChatMode(guildId: string): Promise<ChatMode> {
    // 1. Kiểm tra trong cache trước
    const cached = this.cache.get(guildId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.mode;
    }

    // Mặc định là 'all' nếu không có cấu hình
    // 2. Nếu không có trong cache hoặc đã hết hạn, truy vấn database
    const config = await GuildConfig.findOne({ guildId }).lean(); // .lean() để tăng hiệu năng
    const mode = config?.chatMode || 'all';

    // 3. Lưu kết quả mới vào cache
    this.cache.set(guildId, { mode, timestamp: Date.now() });
    return mode;
  }

  /**
   * Cài đặt chế độ chat cho một server
   * @param guildId ID của server
   * @param mode Chế độ mới ('all' hoặc 'admin')
   */
  public async setChatMode(guildId: string, mode: ChatMode): Promise<void> {
    await GuildConfig.findOneAndUpdate({ guildId }, { chatMode: mode }, { upsert: true, new: true });
    // Cập nhật cache ngay lập tức với giá trị mới thay vì chỉ xóa.
    // Điều này đảm bảo trạng thái trong bộ nhớ của bot luôn đồng nhất ngay sau khi lệnh được thực thi,
    // loại bỏ nguy cơ đọc phải dữ liệu cũ từ database do độ trễ.
    this.cache.set(guildId, { mode, timestamp: Date.now() });
  }
}