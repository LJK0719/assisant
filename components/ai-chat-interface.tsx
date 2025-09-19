"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Brain, User, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/app-store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string; // AI的思考过程
  actions?: string[]; // AI执行的动作
}

interface AIChatInterfaceProps {
  className?: string;
}

export function AIChatInterface({ className = '' }: AIChatInterfaceProps) {
  const { fetchTasks } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的AI事务代理智能体。我可以帮你解析任务、制定计划、调整日程。你可以直接告诉我你的任务，或者粘贴微信通知，我会帮你合理安排。',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputValue,
          sessionId: sessionId
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存或更新sessionId
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
          thinking: data.data.thinking, // 如果AI返回了思考过程
          actions: data.data.actions, // 如果AI执行了什么动作
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // 如果AI执行了任务相关操作，刷新任务数据
        if (data.data.actions && data.data.actions.length > 0) {
          await fetchTasks();
        }
      } else {
        throw new Error(data.error || '未知错误');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `抱歉，出现了错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await fetch('/api/ai/chat', {
        method: 'DELETE',
      });
      
      // 清除sessionId和消息
      setSessionId(null);
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: '对话已清空。我是你的AI事务代理智能体，有什么可以帮你的吗？',
          timestamp: new Date(),
        }
      ]);
    } catch (error) {
      console.error('清空对话失败:', error);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* 聊天头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">AI 事务代理</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">智能管理学习、工作、生活事务</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : message.role === 'system'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </div>

            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg max-w-xs ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                {/* AI思考过程 */}
                {message.thinking && (
                  <details className="mt-2 text-xs opacity-70">
                    <summary className="cursor-pointer hover:opacity-100">🤔 AI思考过程</summary>
                    <div className="mt-1 p-2 bg-black/10 dark:bg-white/10 rounded text-xs">
                      {message.thinking}
                    </div>
                  </details>
                )}

                {/* AI执行的动作 */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-2 text-xs opacity-70">
                    <div className="font-medium">🔧 已执行:</div>
                    <ul className="mt-1 space-y-0.5">
                      {message.actions.map((action, index) => (
                        <li key={index} className="text-xs">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {format(message.timestamp, 'HH:mm', { locale: zhCN })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI正在思考...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="告诉我你的任务，或粘贴微信通知...&#10;例如：&#10;• 明天上午复习复分析第三章&#10;• 周三中午12点约学弟吃饭&#10;• 取快递（在小区门口）"
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            rows={3}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
