import { NextRequest, NextResponse } from 'next/server';
import { DatabaseTools } from '@/lib/agents/database-tools';

const dbTools = new DatabaseTools();

// GET - 获取所有任务
export async function GET() {
  try {
    const tasks = await dbTools.getAllTasks();

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('获取任务失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务失败', tasks: [] },
      { status: 500 }
    );
  }
}

// POST - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();

    if (!taskData.title) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段：title' },
        { status: 400 }
      );
    }

    // 确保类型正确
    if (!['course', 'trivial', 'work', 'learning'].includes(taskData.type)) {
      taskData.type = 'trivial'; // 默认类型
    }

    const newTask = await dbTools.addTask(taskData);

    return NextResponse.json({
      success: true,
      task: newTask,
      message: '任务创建成功'
    });

  } catch (error) {
    console.error('创建任务失败:', error);
    return NextResponse.json(
      { success: false, error: '创建任务失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新任务
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '任务ID是必需的' },
        { status: 400 }
      );
    }

    const updatedTask = await dbTools.updateTask(id, updates);

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: '任务未找到' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: '任务更新成功'
    });

  } catch (error) {
    console.error('更新任务失败:', error);
    return NextResponse.json(
      { success: false, error: '更新任务失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    const success = await dbTools.deleteTask(id);

    // 删除操作采用幂等性设计：无论任务是否存在，删除操作都视为成功
    // 这避免了Agent2自动清理与手动删除之间的竞态条件
    return NextResponse.json({
      success: true,
      message: success ? '任务已删除' : '任务已不存在（可能已被自动清理）',
      wasDeleted: success // 标记是否实际删除了任务
    });

  } catch (error) {
    console.error('删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    );
  }
}