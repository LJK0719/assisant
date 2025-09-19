import { NextRequest, NextResponse } from 'next/server';
import { thinkingProgressStore } from '@/lib/thinking-progress-store';

export async function GET() {
  try {
    const progressData = thinkingProgressStore.get();
    return NextResponse.json({ 
      success: true, 
      progress: progressData 
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
      thinkingProgressStore.add(message);
    } else if (action === 'clear') {
      thinkingProgressStore.clear();
    } else if (action === 'set') {
      const messages = Array.isArray(message) ? message : [message];
      thinkingProgressStore.set(messages);
    }
    
    const currentProgress = thinkingProgressStore.get();
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
