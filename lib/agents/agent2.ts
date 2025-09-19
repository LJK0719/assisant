import { DatabaseTools } from './database-tools';

/**
 * Agent2: 数据库清理代理
 * 负责清理已完成事件和过期事件
 */
export class Agent2 {
  private dbTools: DatabaseTools;

  constructor() {
    this.dbTools = new DatabaseTools();
  }

  /**
   * 执行数据库清理
   * @returns 清理结果统计
   */
  async cleanDatabase(): Promise<{
    deletedCompleted: number;
    deletedExpired: number;
    totalDeleted: number;
  }> {
    try {
      console.log(`[Agent2] 开始清理数据库...`);

      // 获取所有任务，判断是否需要清理
      const allTasks = await this.dbTools.getAllTasks();
      console.log(`[Agent2] 当前任务总数: ${allTasks.length}`);

      // 统计需要删除的任务
      const completedTasks = allTasks.filter(task => task.isCompleted);
      const now = new Date();
      const expiredTasks = allTasks.filter(task => 
        !task.isCompleted && 
        task.deadline && 
        task.deadline instanceof Date && 
        task.deadline < now
      );

      console.log(`[Agent2] 已完成任务: ${completedTasks.length}个`);
      console.log(`[Agent2] 已过期任务: ${expiredTasks.length}个`);

      let deletedCompleted = 0;
      let deletedExpired = 0;

      // 删除已完成的任务
      if (completedTasks.length > 0) {
        deletedCompleted = await this.dbTools.deleteCompletedTasks();
        console.log(`[Agent2] 已删除已完成任务: ${deletedCompleted}个`);
      }

      // 删除过期的任务
      if (expiredTasks.length > 0) {
        deletedExpired = await this.dbTools.deleteExpiredTasks();
        console.log(`[Agent2] 已删除过期任务: ${deletedExpired}个`);
      }

      const totalDeleted = deletedCompleted + deletedExpired;
      
      console.log(`[Agent2] 数据库清理完成，共删除 ${totalDeleted} 个任务`);

      return {
        deletedCompleted,
        deletedExpired,
        totalDeleted
      };

    } catch (error) {
      console.error(`[Agent2] 数据库清理失败:`, error);
      throw new Error(`数据库清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查是否需要清理数据库
   * @returns 是否需要清理
   */
  async needsCleaning(): Promise<{
    needsCleaning: boolean;
    completedCount: number;
    expiredCount: number;
    reason: string;
  }> {
    try {
      const allTasks = await this.dbTools.getAllTasks();
      
      const completedCount = allTasks.filter(task => task.isCompleted).length;
      const now = new Date();
      const expiredCount = allTasks.filter(task => 
        !task.isCompleted && 
        task.deadline && 
        task.deadline instanceof Date && 
        task.deadline < now
      ).length;

      const needsCleaning = completedCount > 0 || expiredCount > 0;
      
      let reason = '';
      if (completedCount > 0 && expiredCount > 0) {
        reason = `有${completedCount}个已完成任务和${expiredCount}个过期任务需要清理`;
      } else if (completedCount > 0) {
        reason = `有${completedCount}个已完成任务需要清理`;
      } else if (expiredCount > 0) {
        reason = `有${expiredCount}个过期任务需要清理`;
      } else {
        reason = '无需清理';
      }

      return {
        needsCleaning,
        completedCount,
        expiredCount,
        reason
      };

    } catch (error) {
      console.error(`[Agent2] 检查清理需求失败:`, error);
      return {
        needsCleaning: false,
        completedCount: 0,
        expiredCount: 0,
        reason: '检查失败'
      };
    }
  }
}
