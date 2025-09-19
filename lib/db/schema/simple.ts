import { pgTable, text, boolean, timestamp, integer, uuid } from "drizzle-orm/pg-core";

// 任务类型枚举
export const taskTypes = ['course', 'trivial', 'work', 'learning'] as const;
export type TaskType = typeof taskTypes[number];

// 简化的任务表
export const tasksTable = pgTable("tasks", {
  // 任务ID
  id: uuid("id").primaryKey().defaultRandom(),
  
  // 任务标题
  title: text("title").notNull(),
  
  // 任务备注（可选）
  description: text("description"),
  
  // 类型：课程/琐碎/工作/学习
  type: text("type").$type<TaskType>().notNull(),
  
  // 状态：是否完成
  isCompleted: boolean("is_completed").default(false).notNull(),
  
  // 当前的时间安排
  scheduledTime: timestamp("scheduled_time"),
  
  // 是否固定时间
  isFixedTime: boolean("is_fixed_time").default(false).notNull(),
  
  // 加入的时间
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // 上一次调整的时间
  lastAdjustedAt: timestamp("last_adjusted_at").defaultNow().notNull(),
  
  // 截止时间（非必要）
  deadline: timestamp("deadline"),
  
  // 完成预计时间，单位：分钟（非必要）
  estimatedDuration: integer("estimated_duration"),
  
  // 是否必需完成
  isRequired: boolean("is_required").default(true).notNull()
});

// 留言表
export const messagesTable = pgTable("messages", {
  // 留言ID
  id: uuid("id").primaryKey().defaultRandom(),
  
  // 留言者姓名
  authorName: text("author_name").notNull(),
  
  // 留言内容
  content: text("content").notNull(),
  
  // 创建时间
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // 是否已读
  isRead: boolean("is_read").default(false).notNull()
});

// 类型导出
export type Task = typeof tasksTable.$inferSelect;
export type InsertTask = typeof tasksTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
