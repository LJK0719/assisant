"use client";

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { Button } from './ui/button';
import { Task } from '@/lib/db/schema/simple';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  Circle, 
  BookOpen,
  Briefcase,
  Coffee,
  GraduationCap,
  PlayCircle,
  PauseCircle,
  Edit2,
  Trash2,
  StickyNote
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TaskListProps {
  tasks: Task[];
  title: string;
  showCompleted?: boolean;
}

export function TaskList({ tasks, title, showCompleted = false }: TaskListProps) {
  const { updateTask, deleteTask, selectTask, selectedTask } = useAppStore();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'learning': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'work': return <Briefcase className="w-4 h-4 text-green-500" />;
      case 'trivial': return <Coffee className="w-4 h-4 text-orange-500" />;
      case 'course': return <GraduationCap className="w-4 h-4 text-purple-500" />;
      default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (isRequired: boolean) => {
    return isRequired 
      ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      : 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  const getRequiredBadge = (isRequired: boolean) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isRequired 
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      }`}>
        {isRequired ? '必需' : '可选'}
      </span>
    );
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      await updateTask(task.id, { 
        isCompleted: !task.isCompleted
      });
    } catch (error) {
      console.error('更新任务状态失败:', error);
      // 可以在这里添加用户友好的错误提示
      alert(`更新任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const filteredTasks = showCompleted 
    ? tasks 
    : tasks.filter(task => !task.isCompleted);

  if (filteredTasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <CheckCircle className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {showCompleted ? '还没有已完成的任务' : '太棒了！没有待处理的任务'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTasks.length} 个任务
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredTasks.map((task) => {
          const isExpanded = expandedTask === task.id;
          const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !task.isCompleted;
          const isSelected = selectedTask?.id === task.id;

          return (
            <div
              key={task.id}
              className={`
                border-l-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50
                ${getPriorityColor(task.isRequired)}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}
              `}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => {
                  selectTask(isSelected ? null : task);
                  setExpandedTask(isExpanded ? null : task.id);
                }}
              >
                {/* 任务头部 */}
                <div className="flex items-start gap-3">
                  {/* 完成状态 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskCompletion(task);
                    }}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>

                  {/* 任务内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTaskIcon(task.type)}
                      <h3 className={`font-medium text-gray-900 dark:text-white ${
                        task.isCompleted ? 'line-through text-gray-500' : ''
                      }`}>
                        {task.title}
                      </h3>
                    </div>

                    {/* 任务元信息 */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.scheduledTime && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                            {isToday(new Date(task.scheduledTime)) 
                              ? `今天 ${format(new Date(task.scheduledTime), 'HH:mm')}` 
                              : format(new Date(task.scheduledTime), 'MM-dd HH:mm')
                            }
                          </span>
                        </div>
                      )}

                      {task.estimatedDuration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.estimatedDuration}分钟</span>
                        </div>
                      )}

                      {getRequiredBadge(task.isRequired)}
                    </div>

                    {/* 任务备注预览 */}
                    {task.description && !isExpanded && (
                      <div className="mt-2 flex items-start gap-2">
                        <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 flex-1">
                          {task.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 实现编辑功能
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteTask(task.id);
                        } catch (error) {
                          console.error('删除任务失败:', error);
                          // 可以在这里添加用户友好的错误提示
                          alert(`删除任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 展开的详细信息 */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    {task.description && (
                      <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">备注</h4>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-200">{task.description}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>创建: {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: zhCN })}</span>
                      {task.lastAdjustedAt && task.lastAdjustedAt !== task.createdAt && (
                        <span>最后调整: {formatDistanceToNow(new Date(task.lastAdjustedAt), { addSuffix: true, locale: zhCN })}</span>
                      )}
                      {task.isFixedTime && (
                        <span className="text-blue-600 dark:text-blue-400">固定时间</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}