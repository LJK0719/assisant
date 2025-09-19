import { db, Task, InsertTask, tasksTable, TaskType } from '@/lib/db';
import { eq, and, lt, desc } from 'drizzle-orm';

/**
 * 数据库操作工具
 */
export class DatabaseTools {
  
  /**
   * 查询所有任务
   */
  async getAllTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasksTable)
      .orderBy(desc(tasksTable.createdAt));
  }

  /**
   * 查询所有必需完成的未完成任务
   */
  async getRequiredUncompletedTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.isCompleted, false),
          eq(tasksTable.isRequired, true)
        )
      )
      .orderBy(tasksTable.deadline, tasksTable.createdAt);
  }

  /**
   * 添加新任务
   */
  async addTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasksTable)
      .values({
        ...task,
        lastAdjustedAt: new Date()
      })
      .returning();
    return newTask;
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const [updatedTask] = await db
      .update(tasksTable)
      .set({
        ...updates,
        lastAdjustedAt: new Date()
      })
      .where(eq(tasksTable.id, taskId))
      .returning();
    return updatedTask || null;
  }

  /**
   * 批量更新任务的时间安排
   */
  async updateTasksSchedule(updates: Array<{ id: string; scheduledTime: Date | null }>): Promise<void> {
    for (const update of updates) {
      await this.updateTask(update.id, { 
        scheduledTime: update.scheduledTime 
      });
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const result = await db
      .delete(tasksTable)
      .where(eq(tasksTable.id, taskId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * 删除已完成的任务
   */
  async deleteCompletedTasks(): Promise<number> {
    const result = await db
      .delete(tasksTable)
      .where(eq(tasksTable.isCompleted, true));
    return result.rowCount || 0;
  }

  /**
   * 删除已过期的任务（截止时间在当前时间之前且未完成）
   */
  async deleteExpiredTasks(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(tasksTable)
      .where(
        and(
          eq(tasksTable.isCompleted, false),
          lt(tasksTable.deadline, now)
        )
      );
    return result.rowCount || 0;
  }

  /**
   * 检查任务时间冲突
   */
  async checkTimeConflicts(
    scheduledTime: Date, 
    duration: number,
    excludeTaskId?: string
  ): Promise<Task[]> {
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    const tasks = await this.getAllTasks();
    
    return tasks.filter(task => {
      if (excludeTaskId && task.id === excludeTaskId) return false;
      if (!task.scheduledTime || !task.estimatedDuration) return false;
      
      const taskStart = new Date(task.scheduledTime);
      const taskEnd = new Date(taskStart.getTime() + task.estimatedDuration * 60 * 1000);
      
      // 检查时间重叠
      return (startTime < taskEnd && endTime > taskStart);
    });
  }

  /**
   * 获取按类型分组的任务
   */
  async getTasksByType(): Promise<Record<TaskType, Task[]>> {
    const tasks = await this.getAllTasks();
    
    const grouped: Record<TaskType, Task[]> = {
      course: [],
      trivial: [],
      work: [],
      learning: []
    };
    
    tasks.forEach(task => {
      if (task.type in grouped) {
        grouped[task.type as TaskType].push(task);
      }
    });
    
    return grouped;
  }
}
