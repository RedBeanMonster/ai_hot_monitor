import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ keywords });
  } catch (e) {
    console.error('Failed to fetch keywords:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Keyword text is required' }, { status: 400 });
    }

    const keyword = await prisma.keyword.upsert({
      where: { text: text.trim() },
      update: { isActive: true },
      create: { text: text.trim() },
    });

    return NextResponse.json({ keyword });
  } catch (e) {
    console.error('Failed to create keyword:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    if (!text) {
      return NextResponse.json({ error: 'Keyword text is required' }, { status: 400 });
    }

    await prisma.keyword.updateMany({
      where: { text },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to delete keyword:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
