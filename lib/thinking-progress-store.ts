/**
 * 思考进度共享存储
 * 用于Agent和API路由之间的进度同步
 */

class ThinkingProgressStore {
  private static instance: ThinkingProgressStore;
  private progress: string[] = [];

  static getInstance(): ThinkingProgressStore {
    if (!ThinkingProgressStore.instance) {
      ThinkingProgressStore.instance = new ThinkingProgressStore();
    }
    return ThinkingProgressStore.instance;
  }

  add(message: string): void {
    const timestampedMessage = `${new Date().toLocaleTimeString()}: ${message}`;
    this.progress.push(timestampedMessage);
    console.log(`[ThinkingProgress] ${timestampedMessage}`);
  }

  clear(): void {
    this.progress = [];
    console.log(`[ThinkingProgress] 清除进度`);
  }

  set(messages: string[]): void {
    this.progress = [...messages];
  }

  get(): string[] {
    return [...this.progress];
  }

  // 获取最近的几条进度（用于显示优化）
  getRecent(count: number = 10): string[] {
    return this.progress.slice(-count);
  }
}

// 导出单例实例
export const thinkingProgressStore = ThinkingProgressStore.getInstance();
