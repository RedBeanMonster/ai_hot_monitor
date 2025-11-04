import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const topics = await prisma.hotTopic.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20, // Return the top 20 latest topics
            include: {
                keyword: true
            }
        });
        
        return NextResponse.json({ topics, success: true });
    } catch (e) {
        console.error("Failed to fetch topics:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
