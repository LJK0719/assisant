/**
 * 简单的对话历史存储管理
 * 使用内存存储，支持会话级别的历史记录
 */

import { InsertTask } from '@/lib/db';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    taskAnalysis?: any;
    actions?: string[];
    conflicts?: string[];
  };
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 内存中的对话历史存储
 * 注意：这是一个简化版本，仅在应用运行期间保持数据
 * 生产环境中应该使用数据库或持久化存储
 */
class ChatHistoryManager {
  private sessions: Map<string, ChatSession> = new Map();
  private readonly maxMessagesPerSession = 100; // 每个会话最多保留100条消息
  private readonly maxSessions = 50; // 最多保留50个会话

  /**
   * 获取或创建会话
   */
  getOrCreateSession(sessionId: string): ChatSession {
    if (!this.sessions.has(sessionId)) {
      const newSession: ChatSession = {
        sessionId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.sessions.set(sessionId, newSession);
      
      // 清理旧会话（简单的LRU）
      if (this.sessions.size > this.maxSessions) {
        const oldestSession = Array.from(this.sessions.keys())[0];
        this.sessions.delete(oldestSession);
      }
    }
    
    return this.sessions.get(sessionId)!;
  }

  /**
   * 添加消息到会话
   */
  addMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string,
    metadata?: ChatMessage['metadata']
  ): ChatMessage {
    const session = this.getOrCreateSession(sessionId);
    
    const message: ChatMessage = {
      id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // 限制消息数量
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession);
    }

    console.log(`[ChatHistory] 添加消息到会话 ${sessionId}: ${role} - ${content.substring(0, 50)}...`);
    return message;
  }

  /**
   * 获取会话历史
   */
  getSessionHistory(sessionId: string, limit?: number): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    const messages = session.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * 查找最近的任务分析消息
   */
  findRecentTaskAnalysis(sessionId: string): ChatMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 倒序查找最近的包含taskAnalysis的助手消息
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const message = session.messages[i];
      if (message.role === 'assistant' && message.metadata?.taskAnalysis) {
        return message;
      }
    }

    return null;
  }

  /**
   * 查找最近的复杂任务输入
   */
  findRecentComplexTaskInput(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 倒序查找最近的复杂任务用户输入
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const message = session.messages[i];
      
      if (message.role === 'user') {
        const content = message.content;
        
        // 检查是否是复杂任务（包含多个动作词和时间信息）
        const actionWords = ['填写', '提交', '打印', '签署', '登录', '申报', '生成', '点击'];
        const timePattern = /\d+月\d+日|\d+:\d+|截止|之前|需于/;
        
        const hasMultipleActions = actionWords.filter(word => content.includes(word)).length >= 2;
        const hasTimeInfo = timePattern.test(content);
        const isLongText = content.length > 50;
        
        if (hasMultipleActions && hasTimeInfo && isLongText) {
          console.log(`[ChatHistory] 找到复杂任务输入: ${content.substring(0, 100)}...`);
          return content;
        }
      }
    }

    return null;
  }

  /**
   * 清除会话历史
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[ChatHistory] 已清除会话 ${sessionId}`);
  }

  /**
   * 获取所有会话ID
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(sessionId: string): {
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    createdAt: string;
    updatedAt: string;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;

    return {
      messageCount: session.messages.length,
      userMessages,
      assistantMessages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }
}

// 导出单例实例
export const chatHistory = new ChatHistoryManager();

// 便捷函数
export function addUserMessage(sessionId: string, content: string): ChatMessage {
  return chatHistory.addMessage(sessionId, 'user', content);
}

export function addAssistantMessage(
  sessionId: string, 
  content: string, 
  metadata?: ChatMessage['metadata']
): ChatMessage {
  return chatHistory.addMessage(sessionId, 'assistant', content, metadata);
}

export function getRecentHistory(sessionId: string, limit: number = 10): ChatMessage[] {
  return chatHistory.getSessionHistory(sessionId, limit);
}

export function findRecentTaskAnalysis(sessionId: string): ChatMessage | null {
  return chatHistory.findRecentTaskAnalysis(sessionId);
}

export function findRecentComplexTask(sessionId: string): string | null {
  return chatHistory.findRecentComplexTaskInput(sessionId);
}


