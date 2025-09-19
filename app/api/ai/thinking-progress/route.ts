import { NextRequest, NextResponse } from 'next/server';

// 存储当前思考进度的全局变量
let currentProgress: string[] = [];

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      progress: currentProgress 
    });
  } catch (error) {
    console.error('获取思考进度失败:', error);
    return NextResponse.json(
      { success: false, error: '获取思考进度失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, message } = await request.json();
    
    if (action === 'add') {
      currentProgress.push(message);
    } else if (action === 'clear') {
      currentProgress = [];
    } else if (action === 'set') {
      currentProgress = Array.isArray(message) ? message : [message];
    }
    
    return NextResponse.json({ 
      success: true, 
      progress: currentProgress 
    });
  } catch (error) {
    console.error('更新思考进度失败:', error);
    return NextResponse.json(
      { success: false, error: '更新思考进度失败' },
      { status: 500 }
    );
  }
}

// 导出进度管理函数供Agent使用
export const progressManager = {
  add: (message: string) => {
    currentProgress.push(`${new Date().toLocaleTimeString()}: ${message}`);
  },
  clear: () => {
    currentProgress = [];
  },
  set: (messages: string[]) => {
    currentProgress = messages.map(msg => `${new Date().toLocaleTimeString()}: ${msg}`);
  },
  get: () => [...currentProgress]
};
