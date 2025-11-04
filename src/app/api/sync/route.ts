import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aggregateSources } from '@/lib/fetchers';
import { analyzeHotTopics } from '@/lib/ai-analyzer';

// Set high max duration since scraping + LLM takes time
export const maxDuration = 300; 

export async function GET() {
    try {
        console.log("🚀 [SYNC] Starting hot-topics manual/cron sync...");
        
        // 1. Get all active keywords
        const keywords = await prisma.keyword.findMany({ where: { isActive: true } });
        if (keywords.length === 0) {
            console.log("No active keywords found.");
            return NextResponse.json({ message: "No keywords." });
        }

        let newTopicsCount = 0;

        for (const kw of keywords) {
            console.log(`[SYNC] Fetching raw data for keyword: ${kw.text}...`);
            const rawData = await aggregateSources(kw.text);

            if (rawData.length === 0) {
                console.log(`[SYNC] No raw data found for ${kw.text}. Skipping.`);
                continue;
            }

            console.log(`[SYNC] AI Analyze ${rawData.length} items for ${kw.text}...`);
            const analysis = await analyzeHotTopics(kw.text, rawData);

            if (analysis && analysis.isTrueHotTopic && analysis.confidenceScore > 0.6) {
                console.log(`[SYNC] 🔥 High confidence topic found: ${analysis.title}`);
                
                // Add check to prevent duplicate insertion
                const existing = await prisma.hotTopic.findFirst({
                    where: { title: analysis.title, keywordId: kw.id }
                });

                if (!existing) {
                    await prisma.hotTopic.create({
                        data: {
                            title: analysis.title,
                            summary: analysis.summary,
                            url: analysis.sources?.[0] || null,
                            source: 'mixed-ai-summary',
                            confidence: analysis.confidenceScore,
                            keywordId: kw.id
                        }
                    });
                    newTopicsCount++;
                } else {
                    console.log(`[SYNC] 🟡 Topic already exists in DB. Skipping.`);
                }
            } else {
                console.log(`[SYNC] 💤 AI considered info for '${kw.text}' as low importance or rumor. (Confidence: ${analysis?.confidenceScore})`);
            }
        }

        console.log(`✅ [SYNC] Job finished. New topics inserted: ${newTopicsCount}`);
        return NextResponse.json({ success: true, newTopicsCount });
    } catch (e) {
        console.error("❌ [SYNC] Job Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
