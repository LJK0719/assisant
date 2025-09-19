import { NextRequest, NextResponse } from "next/server";
import { Agent1 } from "@/lib/agents/agent1";
import { addUserMessage, addAssistantMessage, getRecentHistory } from "@/lib/chat-history";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "消息内容不能为空" },
        { status: 400 }
      );
    }

    // 生成或使用提供的会话ID
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 添加用户消息到历史
    addUserMessage(currentSessionId, message);
    
    // 获取最近的对话历史
    const recentHistory = getRecentHistory(currentSessionId, 20);
    
    // 使用Agent1处理用户输入
    const agent1 = new Agent1();
    const result = await agent1.handleUserInput(message, recentHistory, currentSessionId);

    // 添加助手回复到历史
    if (result.success) {
      addAssistantMessage(currentSessionId, result.response, {
        taskAnalysis: result.taskAnalysis,
        actions: result.actions,
        conflicts: result.conflicts
      });
    }

    return NextResponse.json({
      success: result.success,
      data: result.success ? {
        response: result.response,
        actions: result.actions,
        conflicts: result.conflicts,
        taskAnalysis: result.taskAnalysis, // 任务分析信息（如果有）
        sessionId: currentSessionId, // 返回会话ID供前端使用
        timestamp: new Date().toISOString()
      } : undefined,
      error: result.success ? undefined : result.response
    });

  } catch (error) {
    console.error("聊天API错误:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "处理消息时发生错误，请稍后重试" 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // 清空聊天历史（目前只返回成功）
    return NextResponse.json({ 
      success: true, 
      message: "会话已重置" 
    });

  } catch (error) {
    console.error("重置会话错误:", error);
    return NextResponse.json(
      { success: false, error: "重置会话失败" },
      { status: 500 }
    );
  }
}