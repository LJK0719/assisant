import { NextRequest, NextResponse } from 'next/server';
import { db, messagesTable, Message, InsertMessage } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

// GET - 获取所有留言
export async function GET(request: NextRequest) {
  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .orderBy(desc(messagesTable.createdAt));

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length
    });

  } catch (error) {
    console.error('获取留言失败:', error);
    return NextResponse.json(
      { success: false, error: '获取留言失败', messages: [] },
      { status: 500 }
    );
  }
}

// POST - 创建新留言
export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json();

    if (!messageData.authorName || !messageData.content) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段：authorName 和 content' },
        { status: 400 }
      );
    }

    // 简单的内容验证和清理
    const cleanData: InsertMessage = {
      authorName: messageData.authorName.trim().substring(0, 50), // 限制姓名长度
      content: messageData.content.trim().substring(0, 1000), // 限制内容长度
    };

    const newMessage = await db
      .insert(messagesTable)
      .values(cleanData)
      .returning();

    return NextResponse.json({
      success: true,
      message: newMessage[0],
      messageText: '留言发布成功'
    });

  } catch (error) {
    console.error('创建留言失败:', error);
    return NextResponse.json(
      { success: false, error: '发布留言失败' },
      { status: 500 }
    );
  }
}

// PUT - 标记留言为已读
export async function PUT(request: NextRequest) {
  try {
    const { id, isRead } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '留言ID是必需的' },
        { status: 400 }
      );
    }

    const updatedMessage = await db
      .update(messagesTable)
      .set({ isRead: isRead ?? true })
      .where(eq(messagesTable.id, id))
      .returning();

    if (updatedMessage.length === 0) {
      return NextResponse.json(
        { success: false, error: '留言未找到' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage[0],
      messageText: '留言状态更新成功'
    });

  } catch (error) {
    console.error('更新留言失败:', error);
    return NextResponse.json(
      { success: false, error: '更新留言失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除留言
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少留言ID' },
        { status: 400 }
      );
    }

    const deletedMessage = await db
      .delete(messagesTable)
      .where(eq(messagesTable.id, id))
      .returning();

    if (deletedMessage.length === 0) {
      return NextResponse.json(
        { success: false, error: '留言不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      messageText: '留言已删除'
    });

  } catch (error) {
    console.error('删除留言失败:', error);
    return NextResponse.json(
      { success: false, error: '删除留言失败' },
      { status: 500 }
    );
  }
}

