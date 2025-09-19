import OpenAI from 'openai';
import { DatabaseTools } from './database-tools';
import { Agent2 } from './agent2';
import { Task, TaskType, InsertTask } from '@/lib/db';
import { ChatMessage, findRecentComplexTask } from '@/lib/chat-history';

// 思考进度管理器
class ThinkingProgressManager {
  private static instance: ThinkingProgressManager;
  private progress: string[] = [];

  static getInstance(): ThinkingProgressManager {
    if (!ThinkingProgressManager.instance) {
      ThinkingProgressManager.instance = new ThinkingProgressManager();
    }
    return ThinkingProgressManager.instance;
  }

  add(message: string) {
    this.progress.push(`${new Date().toLocaleTimeString()}: ${message}`);
    // 异步更新API进度
    this.updateProgress();
  }

  clear() {
    this.progress = [];
    this.updateProgress();
  }

  get() {
    return [...this.progress];
  }

  private async updateProgress() {
    try {
      await fetch('/api/ai/thinking-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'set', 
          message: this.progress 
        }),
      });
    } catch (error) {
      console.error('更新思考进度失败:', error);
    }
  }
}

// 定义分析结果的接口
interface AnalysisResult {
  taskInfo?: Partial<InsertTask>;
  [key: string]: unknown;
}

// OpenAI 客户端配置
const openai = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY!,
  baseURL: process.env.SILICONFLOW_BASE_URL!
});

/**
 * Agent1: 主要的用户交互和任务编排代理
 * 
 * 配置说明：
 * - 默认不生成预计完成时间(scheduledTime)，除非用户明确指定
 * - 只有当用户明确提到截止时间时才设置deadline
 * - 只有当用户明确提到预计时长时才设置estimatedDuration
 */
export class Agent1 {
  private dbTools: DatabaseTools;
  private agent2: Agent2;
  private progressManager: ThinkingProgressManager;

  constructor() {
    this.dbTools = new DatabaseTools();
    this.agent2 = new Agent2();
    this.progressManager = ThinkingProgressManager.getInstance();
  }

  /**
   * 处理用户输入
   */
  async handleUserInput(
    input: string, 
    chatHistory: ChatMessage[] = [], 
    sessionId?: string
  ): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
    conflicts?: string[];
    taskAnalysis?: {
      originalInput: string;
      suggestedTasks: Array<Partial<InsertTask>>;
      requiresConfirmation: boolean;
    };
  }> {
    
    // 清除之前的进度并开始新的思考过程
    this.progressManager.clear();
    this.progressManager.add('开始分析用户输入');
    this.progressManager.add(`输入内容: ${input.slice(0, 50)}${input.length > 50 ? '...' : ''}`);
    try {
      console.log(`[Agent1] 处理用户输入: ${input}`);

      // 分析用户输入类型
      this.progressManager.add('正在分析输入类型和意图...');
      const inputAnalysis = await this.analyzeUserInput(input);
      console.log(`[Agent1] 输入分析结果:`, inputAnalysis);
      
      // 仅在有必要时清理数据库（避免与手动删除操作冲突）
      // 只有在处理新任务或任务编排时才清理
      if (inputAnalysis.type === 'new_task' || inputAnalysis.type === 'complex_task') {
        console.log(`[Agent1] 处理新任务前进行数据库清理`);
        await this.agent2.cleanDatabase();
      }

      if (inputAnalysis.type === 'adjustment') {
        this.progressManager.add('识别为调整指令，开始处理...');
        return await this.handleAdjustmentCommand(input);
      } else if (inputAnalysis.type === 'new_task') {
        this.progressManager.add('识别为新任务，开始任务创建流程...');
        return await this.handleNewTask(input, inputAnalysis);
      } else if (inputAnalysis.type === 'complex_task') {
        this.progressManager.add('识别为复杂任务，开始复杂任务处理...');
        return await this.handleComplexTask(input);
      } else {
        // 检查是否是用户确认指令
        this.progressManager.add('检查是否为确认指令...');
        const confirmationResult = await this.checkUserConfirmation(input, chatHistory, sessionId);
        if (confirmationResult.isConfirmation && confirmationResult.originalInput) {
          this.progressManager.add('确认指令，执行用户确认...');
          return await this.handleUserConfirmation(confirmationResult.originalInput);
        }
        this.progressManager.add('处理为一般查询...');
        return await this.handleGeneralQuery(input);
      }

    } catch (error) {
      console.error(`[Agent1] 处理用户输入失败:`, error);
      return {
        success: false,
        response: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 分析用户输入类型
   */
  private async analyzeUserInput(input: string): Promise<{
    type: 'adjustment' | 'new_task' | 'query' | 'complex_task';
    taskInfo?: Partial<InsertTask>;
    adjustmentTarget?: string;
    complexTaskInfo?: {
      needsSplitting: boolean;
      suggestedTasks?: Array<Partial<InsertTask>>;
      requiresConfirmation?: boolean;
    };
  }> {
    const now = new Date();
    const currentDate = now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    const currentTime = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const isoDate = now.toISOString().split('T')[0]; // YYYY-MM-DD格式

    const prompt = `
当前真实日期和时间：${currentDate} ${currentTime}
ISO格式日期：${isoDate}

**重要：当用户提到相对时间词汇时，请基于当前真实日期(${isoDate})计算具体日期**
- "明天" = ${isoDate}+1天
- "后天" = ${isoDate}+2天  
- "周六"、"周日"等 = 找到下一个对应的星期几
- "下周" = ${isoDate}+7天

分析以下用户输入，判断是以下哪种类型：
1. adjustment - 明确的调整指令（如"把...改到..."、"调整..."、"重新安排..."、"修改类型..."、"改成...类型"）
2. new_task - 简单新任务（如"我要..."、"明天..."、"帮我安排..."）
3. query - 一般查询（如"我的任务怎么样"、"今天有什么安排"）
4. complex_task - 复杂任务（包含多个步骤、多个时间点、多个动作的描述，需要拆分为多个子任务）

**重要：判断complex_task的标准：**
- 文本中包含多个动作词（如：填报、打印、签字、提交）
- 包含多个时间节点或截止时间
- 描述了一个完整的流程或多个步骤
- 文本长度较长且信息密度高

**重要：判断adjustment的标准：**
- 明确提到要"调整"、"修改"、"改变"现有任务
- 涉及任务类型的重新分类（如"...是课程"、"...是琐碎事务"）
- 更改任务的时间、截止时间、重要性等属性
- 涉及备注的添加、修改或删除（如"添加备注"、"修改备注"、"移除备注"）

用户输入：${input}

请只返回JSON格式：
{
  "type": "adjustment|new_task|query|complex_task",
  "explanation": "判断理由",
  "taskInfo": {
    "title": "任务标题",
    "type": "course|trivial|work|learning",
    "scheduledTime": "YYYY-MM-DD HH:MM（仅当用户明确指定时间时才包含，否则不要包含此字段）",
    "isFixedTime": true/false,
    "deadline": "YYYY-MM-DD HH:MM（仅当用户明确提到截止时间时才包含，否则不要包含此字段）",
    "estimatedDuration": 数字（分钟，仅当用户明确提到预计时长时才包含，否则不要包含此字段），
    "isRequired": true/false（默认false，仅当用户明确说明是必需/重要/紧急时才设为true）
  },
  "complexTaskInfo": {
    "needsSplitting": true/false,
    "requiresConfirmation": true/false
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    try {
      // 清理可能的markdown格式
      let content = response.choices[0].message.content || '{}';
      content = content.replace(/```json\s*|```\s*/g, '').trim();
      
      const result = JSON.parse(content);
      return {
        type: result.type || 'query',
        taskInfo: result.taskInfo,
        adjustmentTarget: result.adjustmentTarget
      };
    } catch (error) {
      console.error(`[Agent1] 分析输入失败:`, error);
      return { type: 'query' };
    }
  }

  /**
   * 处理复杂任务（需要拆分的任务）
   */
  private async handleComplexTask(
    input: string
  ): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
    taskAnalysis?: {
      originalInput: string;
      suggestedTasks: Array<Partial<InsertTask>>;
      requiresConfirmation: boolean;
    };
  }> {
    try {
      console.log(`[Agent1] 开始处理复杂任务，进行智能拆分...`);
      
      // 智能拆分任务
      const taskSplittingResult = await this.splitComplexTask(input);
      
      if (!taskSplittingResult.success || !taskSplittingResult.suggestedTasks || taskSplittingResult.suggestedTasks.length === 0) {
        return {
          success: false,
          response: '无法解析该复杂任务，请提供更清晰的描述'
        };
      }

      // 检查是否需要用户确认
      const requiresConfirmation = this.shouldRequireConfirmation(taskSplittingResult.suggestedTasks);
      
      if (requiresConfirmation) {
        // 返回分析结果供用户确认
        return {
          success: true,
          response: this.formatTaskAnalysisForConfirmation(taskSplittingResult.suggestedTasks),
          taskAnalysis: {
            originalInput: input,
            suggestedTasks: taskSplittingResult.suggestedTasks,
            requiresConfirmation: true
          }
        };
      } else {
        // 直接执行任务创建和编排
        return await this.executeTaskSplitting(taskSplittingResult.suggestedTasks);
      }

    } catch (error) {
      console.error(`[Agent1] 处理复杂任务失败:`, error);
      return {
        success: false,
        response: `处理复杂任务失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 智能拆分复杂任务
   */
  private async splitComplexTask(input: string): Promise<{
    success: boolean;
    suggestedTasks?: Array<Partial<InsertTask>>;
    analysis?: string;
  }> {
    const now = new Date();
    const currentDate = now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    const isoDate = now.toISOString().split('T')[0];

    const prompt = `
当前真实日期和时间：${currentDate}
ISO格式日期：${isoDate}

你是一个智能任务分析助手。请仔细分析以下复杂文本，将其拆分为具体的、可执行的子任务。

**重要指导原则：**
1. 识别文本中的所有动作词（如：填报、提交、打印、签字、检查等）
2. 提取所有时间信息（截止时间、开始时间等）
3. 按照逻辑顺序排列任务
4. 每个任务应该有明确的目标和可验证的完成标准
5. 相对时间计算基准：${isoDate}
6. **重要：除非用户明确指定任务的具体执行时间，否则不要设置scheduledTime字段**

**任务类型定义：**
- course: 课程类（上课、学习、作业等）
- trivial: 琐碎事务（跑腿、简单操作等）
- work: 工作类（项目任务、报告等）
- learning: 学习类（学习、研究等）

用户输入：${input}

请返回JSON格式：
{
  "analysis": "对文本的分析总结",
  "suggestedTasks": [
    {
      "title": "具体任务标题",
      "type": "course|trivial|work|learning",
      "scheduledTime": "YYYY-MM-DD HH:MM（仅当用户明确指定具体执行时间时才包含此字段）",
      "isFixedTime": true/false,
      "deadline": "YYYY-MM-DD HH:MM（仅当用户明确提到截止时间时才包含此字段）",
      "estimatedDuration": 预计时长分钟数（仅当用户明确提到预计时长时才包含此字段）,
      "isRequired": true/false,
      "description": "任务备注（可选，除非用户明确提供否则不填写）"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    try {
      let content = response.choices[0].message.content || '{}';
      content = content.replace(/```json\s*|```\s*/g, '').trim();
      
      const result = JSON.parse(content);
      
      // 处理建议的任务，转换日期格式
      const processedTasks = result.suggestedTasks?.map((task: Partial<InsertTask>) => {
        const processedTask = { ...task };
        
        // 处理scheduledTime - 只有当明确指定时间时才处理
        const scheduledTimeStr = processedTask.scheduledTime as string | undefined;
        if (scheduledTimeStr && typeof scheduledTimeStr === 'string' && scheduledTimeStr.trim() !== '') {
          const scheduleDate = new Date(scheduledTimeStr);
          processedTask.scheduledTime = isNaN(scheduleDate.getTime()) ? null : scheduleDate;
        } else {
          // 默认不设置预计完成时间
          processedTask.scheduledTime = null;
        }
        
        // 处理deadline - 只有当明确提到截止时间时才处理
        const deadlineStr = processedTask.deadline as string | undefined;
        if (deadlineStr && typeof deadlineStr === 'string' && deadlineStr.trim() !== '') {
          const deadlineDate = new Date(deadlineStr);
          processedTask.deadline = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
        } else {
          // 默认不设置截止时间
          processedTask.deadline = null;
        }
        
        // 确保estimatedDuration是合理的数字
        if (processedTask.estimatedDuration !== undefined) {
          const duration = Number(processedTask.estimatedDuration);
          if (isNaN(duration) || duration < 5 || duration > 480) {
            processedTask.estimatedDuration = null;
          } else {
            processedTask.estimatedDuration = duration;
          }
        }
        
        // 设置默认值
        if (processedTask.isRequired === undefined) {
          processedTask.isRequired = false;
        }
        
        return processedTask;
      }) || [];

      return {
        success: true,
        suggestedTasks: processedTasks,
        analysis: result.analysis
      };

    } catch (error) {
      console.error(`[Agent1] 拆分复杂任务失败:`, error);
      return {
        success: false
      };
    }
  }

  /**
   * 判断是否需要用户确认
   */
  private shouldRequireConfirmation(suggestedTasks: Array<Partial<InsertTask>>): boolean {
    // 如果拆分出的任务数量超过3个，或包含重要任务，则需要确认
    return suggestedTasks.length > 3 || suggestedTasks.some(task => task.isRequired);
  }

  /**
   * 格式化任务分析结果供用户确认
   */
  private formatTaskAnalysisForConfirmation(suggestedTasks: Array<Partial<InsertTask>>): string {
    let response = '我已为您分析并拆分出以下任务，请确认：\n\n';
    
    suggestedTasks.forEach((task, index) => {
      response += `${index + 1}. **${task.title}**\n`;
      response += `   类型：${this.getTaskTypeDisplayName(task.type || 'work')}\n`;
      
      if (task.scheduledTime && task.scheduledTime instanceof Date) {
        response += `   计划时间：${task.scheduledTime.toLocaleString('zh-CN')}\n`;
      }
      
      if (task.deadline && task.deadline instanceof Date) {
        response += `   截止时间：${task.deadline.toLocaleString('zh-CN')}\n`;
      }
      
      if (task.estimatedDuration) {
        response += `   预计用时：${task.estimatedDuration}分钟\n`;
      }
      
      if (task.isRequired) {
        response += `   重要程度：必需完成\n`;
      }
      
      if (task.description) {
        response += `   备注：${task.description}\n`;
      }
      
      response += '\n';
    });
    
    response += '如果确认无误，请回复"确认"或"好的"。如需修改，请具体说明。';
    
    return response;
  }

  /**
   * 执行任务拆分（直接创建任务）
   */
  private async executeTaskSplitting(suggestedTasks: Array<Partial<InsertTask>>): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
  }> {
    try {
      const createdTasks = [];
      const actions = [];
      
      // 依次创建所有子任务
      for (const taskData of suggestedTasks) {
        // 确保任务数据完整
        if (!taskData.title) {
          console.warn('[Agent1] 跳过没有标题的任务:', taskData);
          continue;
        }
        
        const completeTaskData = {
          title: taskData.title,
          type: taskData.type || 'work' as const,
          ...taskData
        };
        
        const newTask = await this.dbTools.addTask(completeTaskData);
        createdTasks.push(newTask);
        actions.push(`创建任务：${newTask.title}`);
      }
      
      console.log(`[Agent1] 已创建${createdTasks.length}个子任务`);
      
      // 获取所有必需完成的事件进行智能编排
      const requiredTasks = await this.dbTools.getRequiredUncompletedTasks();
      const scheduleResult = await this.smartScheduling(requiredTasks);
      
      return {
        success: true,
        response: `已成功拆分并创建${createdTasks.length}个任务：\n${createdTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}\n\n${scheduleResult.response}`,
        actions: [...actions, ...(scheduleResult.actions || [])]
      };

    } catch (error) {
      console.error(`[Agent1] 执行任务拆分失败:`, error);
      return {
        success: false,
        response: `创建任务失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取任务类型显示名称
   */
  private getTaskTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      'course': '课程安排',
      'trivial': '琐碎事务',
      'work': '工作任务',
      'learning': '学习任务'
    };
    return typeMap[type] || '工作任务';
  }

  /**
   * 检查用户是否在确认之前的任务分析
   */
  private async checkUserConfirmation(
    input: string, 
    chatHistory: ChatMessage[] = [], 
    sessionId?: string
  ): Promise<{
    isConfirmation: boolean;
    originalInput?: string;
  }> {
    // 简单的确认关键词检测
    const confirmationKeywords = ['确认', '好的', '可以', '同意', '没问题', '行', '对的'];
    const lowerInput = input.toLowerCase();
    
    const isConfirmation = confirmationKeywords.some(keyword => 
      input.includes(keyword) || lowerInput.includes(keyword.toLowerCase())
    );

    if (isConfirmation) {
      // 从对话历史中查找最近的复杂任务
      let originalInput: string | undefined;
      
      if (sessionId) {
        // 使用chatHistory模块查找
        originalInput = findRecentComplexTask(sessionId) || undefined;
      }
      
      if (!originalInput && chatHistory.length > 0) {
        // 从传入的历史中查找
        originalInput = this.extractOriginalTaskFromHistory(chatHistory);
      }
      
      console.log(`[Agent1] 用户确认，找到原始任务: ${originalInput ? originalInput.substring(0, 100) + '...' : '未找到'}`);
      
      return {
        isConfirmation: true,
        originalInput
      };
    }

    return { isConfirmation: false };
  }

  /**
   * 从聊天历史中提取原始任务输入
   */
  private extractOriginalTaskFromHistory(chatHistory: ChatMessage[]): string | undefined {
    // 倒序查找最近的复杂任务输入
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      
      // 查找用户输入的消息
      if (message.role === 'user') {
        const content = message.content || '';
        
        // 检查是否是复杂任务（包含多个动作词和时间信息）
        const actionWords = ['填写', '提交', '打印', '签署', '登录', '申报', '生成', '点击'];
        const timePattern = /\d+月\d+日|\d+:\d+|截止|之前|需于/;
        
        const hasMultipleActions = actionWords.filter(word => content.includes(word)).length >= 2;
        const hasTimeInfo = timePattern.test(content);
        const isLongText = content.length > 50;
        
        if (hasMultipleActions && hasTimeInfo && isLongText) {
          console.log(`[Agent1] 从历史中找到原始任务: ${content.substring(0, 100)}...`);
          return content;
        }
      }
    }
    
    console.log(`[Agent1] 未在聊天历史中找到原始复杂任务`);
    return undefined;
  }

  /**
   * 处理用户确认（简化版本）
   */
  private async handleUserConfirmation(originalInput?: string): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
  }> {
    // 由于这是简化版本，当无法获取原始输入时，提示用户重新输入
    if (!originalInput) {
      return {
        success: false,
        response: '很抱歉，我无法找到您要确认的任务内容。请重新输入完整的任务描述，我将重新为您分析。'
      };
    }

    // 重新进行复杂任务分析和创建
    const taskSplittingResult = await this.splitComplexTask(originalInput);
    
    if (!taskSplittingResult.success || !taskSplittingResult.suggestedTasks) {
      return {
        success: false,
        response: '重新分析任务失败，请重新输入任务描述。'
      };
    }

    // 直接创建任务
    return await this.executeTaskSplitting(taskSplittingResult.suggestedTasks);
  }

  /**
   * 处理调整指令
   */
  private async handleAdjustmentCommand(
    input: string
  ): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
    conflicts?: string[];
  }> {
    // 获取当前所有任务
    const currentTasks = await this.dbTools.getRequiredUncompletedTasks();
    
    // 检查是否有冲突
    const conflicts = await this.checkForConflicts();
    
    if (conflicts.length > 0) {
      return {
        success: false,
        response: `发现以下冲突，请提供进一步指令：\n${conflicts.join('\n')}`,
        conflicts
      };
    }

    // 执行调整
    const adjustmentResult = await this.executeAdjustment(input, currentTasks);
    return adjustmentResult;
  }

  /**
   * 处理新任务
   */
  private async handleNewTask(
    input: string, 
    analysis: unknown
  ): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
  }> {
    // 添加新任务
    const analysisResult = analysis as AnalysisResult;
    if (analysisResult?.taskInfo) {
      // 处理日期字段，将字符串转换为Date对象
      const taskData = { ...analysisResult.taskInfo };
      
      const scheduledTimeStr = taskData.scheduledTime as string | undefined;
      if (scheduledTimeStr && typeof scheduledTimeStr === 'string' && scheduledTimeStr.trim() !== '') {
        const scheduleDate = new Date(scheduledTimeStr);
        taskData.scheduledTime = isNaN(scheduleDate.getTime()) ? null : scheduleDate;
      } else {
        // 默认不设置预计完成时间，除非用户明确指定
        taskData.scheduledTime = null;
      }
      
      // 只有当明确提供了deadline时才处理，否则保持undefined（数据库中为null）
      if (taskData.deadline !== undefined) {
        const originalDeadline = taskData.deadline;
        if (originalDeadline && typeof originalDeadline === 'string' && (originalDeadline as string).trim() !== '') {
          const deadlineDate = new Date(originalDeadline);
          taskData.deadline = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
        } else {
          taskData.deadline = null;
        }
      }
      
      // 确保估计时长是合理的数字，不设置默认值
      if (taskData.estimatedDuration !== undefined) {
        const duration = Number(taskData.estimatedDuration);
        if (isNaN(duration) || duration < 5 || duration > 480) {
          // 如果提供的时长不合理，设为null
          taskData.estimatedDuration = null;
        } else {
          taskData.estimatedDuration = duration;
        }
      }
      
      // 设置默认的isRequired为false
      if (taskData.isRequired === undefined) {
        taskData.isRequired = false;
      }
      
      // 确保必需字段存在
      if (!taskData.title || !taskData.type) {
        return {
          success: false,
          response: '任务数据不完整，缺少标题或类型'
        };
      }
      
      const newTask = await this.dbTools.addTask(taskData as InsertTask);
      console.log(`[Agent1] 添加新任务:`, newTask);
    }

    // 获取所有必需完成的事件
    const requiredTasks = await this.dbTools.getRequiredUncompletedTasks();
    
    // AI智能编排这些事件
    const scheduleResult = await this.smartScheduling(requiredTasks);
    
    return scheduleResult;
  }

  /**
   * 智能编排任务
   */
  private async smartScheduling(tasks: Task[]): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
  }> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      console.log(`[Agent1] 智能编排尝试 ${attempt}/${maxRetries}`);
      this.progressManager.add(`智能编排尝试 ${attempt}/${maxRetries}`);

      // 生成编排计划
      this.progressManager.add('正在生成智能编排计划...');
      const schedule = await this.generateSchedule(tasks);
      
      // 验证计划
      this.progressManager.add('正在验证编排计划...');
      const validation = await this.validateSchedule(schedule, tasks);
      
      if (validation.isValid) {
        // 应用编排结果
        await this.applySchedule(schedule);
        
        return {
          success: true,
          response: `任务编排完成！${validation.summary}`,
          actions: [`编排了${schedule.length}个任务`, validation.summary]
        };
      } else {
        console.log(`[Agent1] 编排验证失败: ${validation.issues.join(', ')}`);
        if (attempt === maxRetries) {
          return {
            success: false,
            response: `编排失败: ${validation.issues.join(', ')}`
          };
        }
      }
    }

    return {
      success: false,
      response: '编排失败，已达到最大重试次数'
    };
  }

  /**
   * 生成编排计划
   */
  private async generateSchedule(tasks: Task[]): Promise<Array<{
    id: string;
    scheduledTime: Date;
    reason: string;
  }>> {
    const now = new Date();
    const currentDate = now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    const currentTime = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const isoDate = now.toISOString().split('T')[0];

    const prompt = `
当前真实日期和时间：${currentDate} ${currentTime}
ISO格式日期：${isoDate}

你是一个智能任务编排助手。请为以下任务安排合理的时间，遵循以下原则：

⚠️ **重要约束：**
- **固定时间的任务（isFixedTime: true）绝对不能更改时间！** 这些通常是课程、会议等有严格时间要求的事务
- 有scheduledTime且isFixedTime为true的任务，必须保持原有时间不变

📋 **编排原则：**
1. 琐碎事务尽量堆积在一起集中处理
2. 学习时间尽量连续不受打扰  
3. 考虑截止时间限制
4. 优先安排必需任务（isRequired: true）
5. 合理分配工作量，避免时间冲突

当前任务列表：
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  type: t.type,
  isFixedTime: t.isFixedTime,
  scheduledTime: t.scheduledTime,
  deadline: t.deadline,
  estimatedDuration: t.estimatedDuration,
  isRequired: t.isRequired,
  description: t.description // 备注信息，帮助理解任务内容
})), null, 2)}

请返回JSON格式的编排计划：
{
  "schedule": [
    {
      "id": "任务ID",
      "scheduledTime": "YYYY-MM-DD HH:MM",
      "reason": "编排理由"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5
    });

    try {
      // 清理可能的markdown格式
      let content = response.choices[0].message.content || '{}';
      content = content.replace(/```json\s*|```\s*/g, '').trim();
      
      const result = JSON.parse(content);
      return result.schedule.map((item: { id: string; scheduledTime: string | Date; title?: string; reason?: string }) => {
        let scheduledTime: Date;
        if (typeof item.scheduledTime === 'string') {
          scheduledTime = new Date(item.scheduledTime);
          // 检查日期是否有效
          if (isNaN(scheduledTime.getTime())) {
            console.warn(`[Agent1] 无效的日期格式: ${item.scheduledTime}`);
            scheduledTime = new Date(); // 使用当前时间作为fallback
          }
        } else {
          scheduledTime = item.scheduledTime || new Date();
        }
        
        return {
          id: item.id,
          scheduledTime,
          reason: item.reason
        };
      });
    } catch (error) {
      console.error(`[Agent1] 生成编排计划失败:`, error);
      return [];
    }
  }

  /**
   * 验证编排计划
   */
  private async validateSchedule(
    schedule: Array<{ id: string; scheduledTime: Date; reason: string }>,
    tasks: Task[]
  ): Promise<{
    isValid: boolean;
    issues: string[];
    summary: string;
  }> {
    const issues: string[] = [];

    // 检查是否有遗漏
    const scheduledIds = new Set(schedule.map(s => s.id));
    const unscheduledTasks = tasks.filter(t => !scheduledIds.has(t.id));
    if (unscheduledTasks.length > 0) {
      issues.push(`有${unscheduledTasks.length}个任务未安排时间`);
    }

    // 检查固定时间任务
    for (const item of schedule) {
      const task = tasks.find(t => t.id === item.id);
      if (task?.isFixedTime && task.scheduledTime) {
        const originalTime = new Date(task.scheduledTime);
        if (Math.abs(item.scheduledTime.getTime() - originalTime.getTime()) > 60000) {
          issues.push(`任务"${task.title}"的时间不能更改（固定时间）`);
        }
      }
    }

    // 检查截止时间
    for (const item of schedule) {
      const task = tasks.find(t => t.id === item.id);
      if (task?.deadline && task.deadline instanceof Date && item.scheduledTime > task.deadline) {
        issues.push(`任务"${task.title}"安排时间超过截止时间`);
      }
    }

    // 检查时间冲突
    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const task1 = tasks.find(t => t.id === schedule[i].id);
        const task2 = tasks.find(t => t.id === schedule[j].id);
        
        if (task1?.estimatedDuration && task2?.estimatedDuration) {
          const end1 = new Date(schedule[i].scheduledTime.getTime() + task1.estimatedDuration * 60000);
          const end2 = new Date(schedule[j].scheduledTime.getTime() + task2.estimatedDuration * 60000);
          
          if (schedule[i].scheduledTime < end2 && schedule[j].scheduledTime < end1) {
            issues.push(`任务"${task1.title}"和"${task2.title}"时间冲突`);
          }
        }
      }
    }

    const isValid = issues.length === 0;
    const summary = isValid ? 
      `成功编排${schedule.length}个任务，琐碎事务已集中安排，学习时间保持连续` : 
      `编排存在${issues.length}个问题`;

    return { isValid, issues, summary };
  }

  /**
   * 应用编排计划
   */
  private async applySchedule(
    schedule: Array<{ id: string; scheduledTime: Date; reason: string }>
  ): Promise<void> {
    const updates = schedule.map(item => ({
      id: item.id,
      scheduledTime: item.scheduledTime
    }));
    
    await this.dbTools.updateTasksSchedule(updates);
    console.log(`[Agent1] 已应用编排计划，更新了${updates.length}个任务`);
  }

  /**
   * 检查冲突
   */
  private async checkForConflicts(): Promise<string[]> {
    // 简化的冲突检查逻辑
    const conflicts: string[] = [];
    
    // 这里可以实现更复杂的冲突检查逻辑
    // 例如解析调整指令，检查是否与现有任务冲突
    
    return conflicts;
  }

  /**
   * 执行调整
   */
  private async executeAdjustment(input: string, tasks: Task[]): Promise<{
    success: boolean;
    response: string;
    actions?: string[];
  }> {
    try {
      // 使用AI解析调整指令，获取具体的调整内容
      const adjustmentResult = await this.parseAdjustmentInstruction(input, tasks);
      
      if (!adjustmentResult.adjustments || adjustmentResult.adjustments.length === 0) {
        return {
          success: false,
          response: "无法识别要调整的任务，请明确指定任务名称"
        };
      }

      // 执行所有调整操作
      const allActions: string[] = [];
      const successfulAdjustments: string[] = [];
      const failedAdjustments: string[] = [];

      for (const adjustmentPlan of adjustmentResult.adjustments) {
        try {
          const updateData: Partial<Task> = {};
          const actions: string[] = [];

          if (adjustmentPlan.newScheduledTime) {
            updateData.scheduledTime = adjustmentPlan.newScheduledTime;
            actions.push(`时间调整为${adjustmentPlan.newScheduledTime.toLocaleString('zh-CN')}`);
          }

          if (adjustmentPlan.newDuration) {
            updateData.estimatedDuration = adjustmentPlan.newDuration;
            actions.push(`预计时长调整为${adjustmentPlan.newDuration}分钟`);
          }

          if (adjustmentPlan.newDeadline !== undefined) {
            updateData.deadline = adjustmentPlan.newDeadline;
            if (adjustmentPlan.newDeadline) {
              actions.push(`截止时间设为${adjustmentPlan.newDeadline.toLocaleString('zh-CN')}`);
            } else {
              actions.push("移除截止时间");
            }
          }

          if (adjustmentPlan.newType) {
            updateData.type = adjustmentPlan.newType;
            actions.push(`任务类型调整为${this.getTaskTypeDisplayName(adjustmentPlan.newType)}`);
          }

          if (adjustmentPlan.newDescription !== undefined) {
            updateData.description = adjustmentPlan.newDescription;
            if (adjustmentPlan.newDescription) {
              actions.push(`备注更新为"${adjustmentPlan.newDescription}"`);
            } else {
              actions.push("移除备注");
            }
          }

          // 更新任务
          const updatedTask = await this.dbTools.updateTask(adjustmentPlan.taskId, updateData);
          
          if (updatedTask) {
            successfulAdjustments.push(`任务"${updatedTask.title}"调整完成：${actions.join('、')}`);
            allActions.push(...actions.map(action => `${updatedTask.title}: ${action}`));
          } else {
            failedAdjustments.push(`任务"${adjustmentPlan.taskTitle}"更新失败（任务不存在）`);
          }

        } catch (adjustError) {
          console.error(`[Agent1] 调整任务 ${adjustmentPlan.taskTitle} 失败:`, adjustError);
          failedAdjustments.push(`任务"${adjustmentPlan.taskTitle}"调整失败`);
        }
      }

      // 构建响应消息
      let response = '';
      const hasSuccessful = successfulAdjustments.length > 0;
      const hasFailed = failedAdjustments.length > 0;

      if (hasSuccessful) {
        response += successfulAdjustments.join('\n');
      }

      if (hasFailed) {
        if (hasSuccessful) response += '\n\n';
        response += '以下调整失败：\n' + failedAdjustments.join('\n');
      }

      return {
        success: hasSuccessful,
        response: response || '没有任务被调整',
        actions: allActions
      };

    } catch (error) {
      console.error('[Agent1] 执行调整失败:', error);
      return {
        success: false,
        response: `调整失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 解析调整指令
   */
  private async parseAdjustmentInstruction(input: string, tasks: Task[]): Promise<{
    adjustments: Array<{
      taskId: string;
      taskTitle: string;
      newScheduledTime?: Date;
      newDuration?: number;
      newDeadline?: Date | null;
      newType?: TaskType;
      newDescription?: string | null;
    }>;
  }> {
    const now = new Date();
    const currentDate = now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    const isoDate = now.toISOString().split('T')[0];

    const prompt = `
当前时间：${currentDate} (${isoDate})

现有任务列表：
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  type: t.type,
  scheduledTime: t.scheduledTime,
  estimatedDuration: t.estimatedDuration,
  deadline: t.deadline,
  description: t.description // 备注信息，帮助理解任务具体内容
})), null, 2)}

用户调整指令：${input}

请分析用户要调整哪些任务，以及具体的调整内容。注意：用户可能在一条指令中调整多个任务。返回JSON格式：
{
  "adjustments": [
    {
      "taskId": "要调整的任务ID",
      "taskTitle": "任务标题（用于确认）",
      "newScheduledTime": "新的安排时间 YYYY-MM-DD HH:MM（如果有调整）",
      "newDuration": 新的预计时长分钟数（如果有调整）,
      "newDeadline": "新的截止时间 YYYY-MM-DD HH:MM（如果有调整，null表示移除截止时间）",
      "newType": "新的任务类型（如果有调整）：course|trivial|work|learning",
      "newDescription": "新的备注内容（如果有调整，null表示移除备注）"
    }
  ]
}

注意：
- 明天 = ${isoDate}+1天
- 后天 = ${isoDate}+2天
- 仅返回实际需要调整的字段

**任务类型说明：**
- course: 课程类（上课、学习、作业等）
- trivial: 琐碎事务（跑腿、简单操作、申报等）
- work: 工作类（项目任务、报告等）
- learning: 学习类（自主学习、研究等）

**类型调整示例：**
- "金融工程上课" → course
- "申报奖学金" → trivial
- "写项目报告" → work
- "自学Python" → learning

**多任务调整示例：**
- "调整现有事务的类型，金融工程上课是课程，与申报奖学金相关的是琐碎事务" 
  → 需要返回两个调整项：一个将"金融工程"相关任务改为course，另一个将"申报奖学金"相关任务改为trivial

**备注调整示例：**
- "给数学作业添加备注：包含微积分和线性代数" → newDescription: "包含微积分和线性代数"
- "移除项目报告的备注" → newDescription: null
- "修改会议备注为重要会议" → newDescription: "重要会议"
`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    try {
      let content = response.choices[0].message.content || '{}';
      content = content.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(content);
      
      const adjustments = result.adjustments?.map((adj: { taskId: string; taskTitle: string; newScheduledTime?: string; newDuration?: number; newDeadline?: string | null; newType?: string; newDescription?: string }) => {
        const adjustment: { taskId: string; taskTitle: string; newScheduledTime?: Date; newDuration?: number; newDeadline?: Date | null; newType?: TaskType; newDescription?: string } = {
          taskId: adj.taskId,
          taskTitle: adj.taskTitle
        };

        if (adj.newScheduledTime) {
          const newTime = new Date(adj.newScheduledTime);
          if (!isNaN(newTime.getTime())) {
            adjustment.newScheduledTime = newTime;
          }
        }

        if (adj.newDuration && typeof adj.newDuration === 'number') {
          adjustment.newDuration = adj.newDuration;
        }

        if (adj.newDeadline !== undefined) {
          if (adj.newDeadline === null) {
            adjustment.newDeadline = null;
          } else if (adj.newDeadline) {
            const newDeadline = new Date(adj.newDeadline);
            if (!isNaN(newDeadline.getTime())) {
              adjustment.newDeadline = newDeadline;
            }
          }
        }

        // 处理类型调整
        if (adj.newType && ['course', 'trivial', 'work', 'learning'].includes(adj.newType)) {
          adjustment.newType = adj.newType as TaskType;
        }

        // 处理备注调整
        if (adj.newDescription !== undefined) {
          adjustment.newDescription = adj.newDescription;
        }

        return adjustment;
      }) || [];

      return { adjustments };
    } catch (error) {
      console.error('[Agent1] 解析调整指令失败:', error);
      return { adjustments: [] };
    }
  }

  /**
   * 处理一般查询
   */
  private async handleGeneralQuery(input: string): Promise<{
    success: boolean;
    response: string;
  }> {
    const now = new Date();
    const currentDate = now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    const currentTime = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const isoDate = now.toISOString().split('T')[0];

    const tasks = await this.dbTools.getAllTasks();
    const tasksByType = await this.dbTools.getTasksByType();
    
    const prompt = `
当前真实日期和时间：${currentDate} ${currentTime}
ISO格式日期：${isoDate}

用户询问：${input}

当前任务情况：
- 总任务数：${tasks.length}
- 已完成：${tasks.filter(t => t.isCompleted).length}
- 未完成：${tasks.filter(t => !t.isCompleted).length}
- 课程任务：${tasksByType.course.length}
- 琐碎任务：${tasksByType.trivial.length}
- 工作任务：${tasksByType.work.length}
- 学习任务：${tasksByType.learning.length}

请基于这些信息回答用户的问题，要友好、简洁、实用。
`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    return {
      success: true,
      response: response.choices[0].message.content || '无法回答您的问题。'
    };
  }
}
