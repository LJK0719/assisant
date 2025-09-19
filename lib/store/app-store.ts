import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Task, InsertTask } from '../db/schema/simple';

interface AppStore {
  // 任务状态
  tasks: Task[];
  
  // UI状态
  isLoading: boolean;
  selectedTask: Task | null;
  
  // 操作
  setTasks: (tasks: Task[]) => void;
  addTask: (task: InsertTask) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  
  // UI操作
  setLoading: (loading: boolean) => void;
  selectTask: (task: Task | null) => void;
  
  // 辅助方法
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getTasksByType: (type: Task['type']) => Task[];
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        tasks: [],
        
        // UI状态
        isLoading: false,
        selectedTask: null,
        
        // 操作实现
        setTasks: (tasks) => set({ tasks }),
        
        addTask: (task) => set((state) => ({
          tasks: [...state.tasks, { ...task, id: crypto.randomUUID(), createdAt: new Date(), lastAdjustedAt: new Date() } as Task]
        })),
        
        updateTask: async (id, updates) => {
          try {
            // 先调用后端API更新数据库中的任务
            const response = await fetch('/api/tasks', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id, ...updates }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || '更新任务失败');
            }

            const result = await response.json();

            // API调用成功后，更新前端状态
            set((state) => ({
              tasks: state.tasks.map(task => 
                task.id === id ? { ...task, ...updates, lastAdjustedAt: new Date() } : task
              )
            }));

            console.log(`任务 ${id} 已成功更新`);
            return result.task;
          } catch (error) {
            console.error('更新任务失败:', error);
            throw error;
          }
        },
        
        deleteTask: async (id) => {
          try {
            // 先调用后端API删除数据库中的任务
            const response = await fetch(`/api/tasks?id=${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || '删除任务失败');
            }

            // API调用成功后，从前端状态中删除任务
            set((state) => ({
              tasks: state.tasks.filter(task => task.id !== id),
              selectedTask: state.selectedTask?.id === id ? null : state.selectedTask
            }));

            console.log(`任务 ${id} 已成功删除`);
          } catch (error) {
            console.error('删除任务失败:', error);
            // 可以在这里添加错误提示
            throw error; // 重新抛出错误，让调用方知道删除失败
          }
        },
        
        fetchTasks: async () => {
          try {
            set({ isLoading: true });
            const response = await fetch('/api/tasks');
            if (response.ok) {
              const data = await response.json();
              set({ tasks: data.tasks || [] });
            }
          } catch (error) {
            console.error('Failed to fetch tasks:', error);
            set({ tasks: [] });
          } finally {
            set({ isLoading: false });
          }
        },
        
        // UI操作
        setLoading: (loading) => set({ isLoading: loading }),
        selectTask: (task) => set({ selectedTask: task }),
        
        // 辅助方法
        getTodayTasks: () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          return get().tasks.filter(task => {
            if (!task.scheduledTime) return false;
            const taskDate = new Date(task.scheduledTime);
            return taskDate >= today && taskDate < tomorrow;
          });
        },
        
        getUpcomingTasks: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          return get().tasks.filter(task => {
            if (!task.scheduledTime) return false;
            const taskDate = new Date(task.scheduledTime);
            return taskDate >= tomorrow && !task.isCompleted;
          }).sort((a, b) => {
            if (!a.scheduledTime || !b.scheduledTime) return 0;
            return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
          });
        },
        
        getCompletedTasks: () => {
          return get().tasks.filter(task => task.isCompleted);
        },
        
        getTasksByType: (type) => {
          return get().tasks.filter(task => task.type === type);
        }
      }),
      {
        name: 'ai-agent-storage',
        partialize: (state) => ({
          tasks: state.tasks
        })
      }
    ),
    {
      name: 'AI Agent Store'
    }
  )
);

// 选择器 hooks
export const useTodayTasks = () => useAppStore(state => state.getTodayTasks());
export const useUpcomingTasks = () => useAppStore(state => state.getUpcomingTasks());
export const useCompletedTasks = () => useAppStore(state => state.getCompletedTasks());
export const useLearningTasks = () => useAppStore(state => state.getTasksByType('learning'));
export const useWorkTasks = () => useAppStore(state => state.getTasksByType('work'));
export const useCourseTasks = () => useAppStore(state => state.getTasksByType('course'));
export const useTrivialTasks = () => useAppStore(state => state.getTasksByType('trivial'));
