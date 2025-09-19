"use client";

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Task } from '@/lib/db/schema/simple';

interface ScheduleViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  isLoading?: boolean;
}

// 时间段
const timeSlots = [
  { id: 1, name: '早晨', start: '06:00', end: '09:00' },
  { id: 2, name: '上午', start: '09:00', end: '12:00' },
  { id: 3, name: '下午', start: '13:00', end: '17:00' },
  { id: 4, name: '晚上', start: '17:00', end: '21:00' },
  { id: 5, name: '深夜', start: '21:00', end: '24:00' },
];

const getTaskTypeColor = (type: string) => {
  switch (type) {
    case 'learning':
      return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300';
    case 'work':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300';
    case 'trivial':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300';
    case 'course':
      return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/30 dark:border-gray-600 dark:text-gray-300';
  }
};

const getTimeSlotForTask = (task: Task) => {
  if (!task.scheduledTime) return null;
  
  const taskTime = new Date(task.scheduledTime);
  const hour = taskTime.getHours();
  
  // 时间段匹配
  if (hour >= 6 && hour < 9) return 1;   // 早晨
  if (hour >= 9 && hour < 12) return 2;  // 上午
  if (hour >= 13 && hour < 17) return 3; // 下午
  if (hour >= 17 && hour < 21) return 4; // 晚上
  if (hour >= 21 || hour < 6) return 5;  // 深夜
  
  return null;
};

export function ScheduleView({ tasks, onTaskClick, isLoading = false }: ScheduleViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const displayDays = weekDays; // 显示全部7天

  // 获取某天某时间段的任务
  const getTasksForSlot = (day: Date, slotId: number) => {
    return tasks.filter(task => {
      if (!task.scheduledTime) return false;
      const taskDate = new Date(task.scheduledTime);
      const isSameDate = isSameDay(taskDate, day);
      const timeSlot = getTimeSlotForTask(task);
      return isSameDate && timeSlot === slotId;
    });
  };

  // 统计不同类型的任务
  const tasksByType = tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">加载事务数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📅 事务日程表
            </h2>
            
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              本周
            </Button>
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {format(weekStart, 'yyyy年MM月dd日', { locale: zhCN })} - {format(weekEnd, 'MM月dd日', { locale: zhCN })}
        </div>

        {/* 任务类型统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded">
            <div className="font-medium text-purple-600 dark:text-purple-400">学习事务</div>
            <div className="text-purple-800 dark:text-purple-300">{tasksByType.learning || 0}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded">
            <div className="font-medium text-green-600 dark:text-green-400">工作事务</div>
            <div className="text-green-800 dark:text-green-300">{tasksByType.work || 0}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
            <div className="font-medium text-yellow-600 dark:text-yellow-400">琐碎事务</div>
            <div className="text-yellow-800 dark:text-yellow-300">{tasksByType.trivial || 0}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded">
            <div className="font-medium text-orange-600 dark:text-orange-400">课程</div>
            <div className="text-orange-800 dark:text-orange-300">{tasksByType.course || 0}</div>
          </div>
        </div>
      </div>

      {/* 日程表网格 */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* 表头 - 星期 */}
          <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3 text-center font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
              时间段
            </div>
            {displayDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={`p-3 text-center font-medium border-l border-gray-200 dark:border-gray-700 ${
                  isToday(day) 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="text-sm">
                  {format(day, 'EEE', { locale: zhCN })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format(day, 'M.d')}
                </div>
              </div>
            ))}
          </div>

          {/* 日程表主体 */}
          {timeSlots.map((slot) => (
            <div key={slot.id} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 min-h-[120px]">
              {/* 时间段标签 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 flex flex-col justify-center items-center text-center">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {slot.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {slot.start}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {slot.end}
                </div>
              </div>

              {/* 每天的任务 */}
              {displayDays.map((day) => {
                const dayTasks = getTasksForSlot(day, slot.id);
                
                return (
                  <div 
                    key={`${day.toISOString()}-${slot.id}`} 
                    className="p-2 border-l border-gray-200 dark:border-gray-700 relative min-h-[100px]"
                  >
                    {dayTasks.length > 0 ? (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick?.(task)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md mb-2 last:mb-0 ${getTaskTypeColor(task.type)}`}
                        >
                          <div className="text-sm font-medium mb-1 leading-tight">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="flex items-start gap-1 text-xs opacity-80 mb-1 leading-tight">
                              <div className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5">
                                📝
                              </div>
                              <div className="line-clamp-2 flex-1">
                                {task.description}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs opacity-70">
                            <span>{task.estimatedDuration ? `${task.estimatedDuration}分钟` : '未设定'}</span>
                            <span>{task.isRequired ? '必需' : '可选'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400">
                        {/* 空时间段 */}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded"></div>
            <span>学习事务</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
            <span>工作事务</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-200 border border-yellow-300 rounded"></div>
            <span>琐碎事务</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></div>
            <span>课程</span>
          </div>
        </div>
      </div>
    </div>
  );
}
