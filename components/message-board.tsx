"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Trash2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Message {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

interface MessageBoardProps {
  className?: string;
}

export function MessageBoard({ className = '' }: MessageBoardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 留言表单状态
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');

  // 获取留言
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages');
      const data = await response.json();
      
      if (data.success) {
        // 转换日期字符串为Date对象
        const messagesWithDates = data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('获取留言失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 发布留言
  const submitMessage = async () => {
    if (!authorName.trim() || !content.trim()) {
      alert('请填写姓名和留言内容');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim(),
          content: content.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAuthorName('');
        setContent('');
        await fetchMessages(); // 刷新留言列表
      } else {
        alert(data.error || '发布留言失败');
      }
    } catch (error) {
      console.error('发布留言失败:', error);
      alert('发布留言失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 标记已读/未读
  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isRead: !currentStatus
        })
      });

      if (response.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('更新留言状态失败:', error);
    }
  };

  // 删除留言
  const deleteMessage = async (id: string) => {
    if (!confirm('确定要删除这条留言吗？')) return;

    try {
      const response = await fetch(`/api/messages?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('删除留言失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">留言板</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                朋友和同事可以在这里给你留言
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount} 条未读
            </span>
          )}
        </div>
      </div>

      {/* 留言表单 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="你的姓名"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            maxLength={50}
          />
          <textarea
            placeholder="写下你的留言... (Ctrl+Enter 发送)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-800 dark:text-white"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {content.length}/1000
            </span>
            <Button 
              onClick={submitMessage}
              disabled={isSubmitting || !authorName.trim() || !content.trim()}
              size="sm"
            >
              {isSubmitting ? (
                '发送中...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  发送留言
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 留言列表 */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            还没有留言，快来留下第一条吧！
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 ${
                  !message.isRead 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {message.authorName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(message.createdAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReadStatus(message.id, message.isRead)}
                      title={message.isRead ? '标记为未读' : '标记为已读'}
                    >
                      {message.isRead ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMessage(message.id)}
                      title="删除留言"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

