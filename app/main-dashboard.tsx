"use client";

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { AIChatInterface } from '@/components/ai-chat-interface';
import { TaskList } from '@/components/task-list';
import { ScheduleView } from '@/components/schedule-view';
import { MessageBoard } from '@/components/message-board';
import { Button } from '@/components/ui/button';
import { MobileNavigation, useIsMobile } from '@/components/ui/mobile-navigation';
import { Task } from '@/lib/db/schema/simple';
import { 
  Calendar, 
  MessageSquare, 
  Sun,
  Moon,
  CheckSquare,
  Brain,
  Mail
} from 'lucide-react';

type ViewMode = 'chat' | 'tasks' | 'schedule' | 'messages';

export function MainDashboard() {
  const { tasks, fetchTasks, selectTask } = useAppStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const isMobile = useIsMobile();

  // 主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 获取任务数据
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
  };

  const handleTaskClick = (task: Task) => {
    selectTask(task);
    setViewMode('chat');
  };


  // 任务统计
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.isCompleted).length,
    learning: tasks.filter(t => t.type === 'learning').length,
    work: tasks.filter(t => t.type === 'work').length,
    trivial: tasks.filter(t => t.type === 'trivial').length,
    course: tasks.filter(t => t.type === 'course').length,
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : ''}`}>
      {/* 桌面端顶部导航栏 */}
      {!isMobile && (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                      AI事务代理智能体
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      智能管理学习、工作、生活事务
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* 桌面端视图切换 */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'chat' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('chat')}
                    className="text-xs h-8"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    AI助手
                  </Button>
                  <Button
                    variant={viewMode === 'tasks' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('tasks')}
                    className="text-xs h-8"
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    任务
                  </Button>
                  <Button
                    variant={viewMode === 'schedule' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('schedule')}
                    className="text-xs h-8"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    日程
                  </Button>
                  <Button
                    variant={viewMode === 'messages' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('messages')}
                    className="text-xs h-8"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    留言
                  </Button>
                </div>

                <Button variant="ghost" size="sm" onClick={toggleTheme}>
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 移动端顶部简化标题栏 */}
      {isMobile && (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-base font-bold text-gray-900 dark:text-white">
                    AI事务代理智能体
                  </h1>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-4' : 'py-6'}`}>
        {/* 快速统计卡片 */}
        {isMobile ? (
          // 移动端：紧凑横向滚动布局
          <div className="mb-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {taskStats.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">总事务</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {taskStats.completed}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">已完成</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {taskStats.learning}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">学习</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {taskStats.work}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">工作</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {taskStats.trivial}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">琐碎</div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {taskStats.course}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">课程</div>
              </div>
            </div>
          </div>
        ) : (
          // 桌面端：原始网格布局
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {taskStats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总事务</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {taskStats.completed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">已完成</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {taskStats.learning}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">学习</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {taskStats.work}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">工作</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {taskStats.trivial}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">琐碎</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {taskStats.course}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">课程</div>
            </div>
          </div>
        )}

        {/* 主内容区域 */}
        {viewMode === 'chat' && (
          <AIChatInterface 
            className={isMobile ? "h-[calc(100vh-180px)]" : "h-[600px]"} 
          />
        )}

        {viewMode === 'messages' && (
          <MessageBoard 
            className={isMobile ? "h-[calc(100vh-180px)]" : "h-[600px]"} 
          />
        )}

        {viewMode === 'tasks' && (
          <div className="space-y-4">
            <TaskList 
              tasks={tasks.filter(t => !t.isCompleted)} 
              title="待处理事务" 
            />
            {tasks.filter(t => t.isCompleted).length > 0 && (
              <TaskList 
                tasks={tasks.filter(t => t.isCompleted)} 
                title="已完成事务" 
                showCompleted={true}
              />
            )}
          </div>
        )}

        {viewMode === 'schedule' && (
          <ScheduleView 
            tasks={tasks} 
            onTaskClick={handleTaskClick}
          />
        )}
      </main>

      {/* 移动端底部导航 */}
      {isMobile && (
        <MobileNavigation 
          currentView={viewMode}
          onViewChange={setViewMode}
        />
      )}
    </div>
  );
}
