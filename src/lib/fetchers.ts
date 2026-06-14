export type SourceType =
  | "twitter"
  | "hackernews"
  | "github"
  | "bilibili";

export interface RawHotTopic {
  title: string;
  sourceUrl: string;
  content: string; // 原文/摘要/讨论文本
  sourceType: SourceType;
  postedAt: Date;
  /** 可选热度指标（star 数 / 点赞 / 评论数等），用于 AI 排序参考 */
  heat?: number;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

const isFresh = (date: Date, withinHours = 48) =>
  Date.now() - date.getTime() <= withinHours * 3600_000;

// ==============================
// 1. Twitter / X (twitterapi.io)
// ==============================
export async function fetchFromTwitter(keyword: string): Promise<RawHotTopic[]> {
  const token = process.env.TWITTERAPI_IO_TOKEN;
  if (!token) {
    console.warn("⚠️ TWITTERAPI_IO_TOKEN 未配置，跳过 Twitter 抓取。");
    return [];
  }

  try {
    const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(
      keyword,
    )}&queryType=Latest`;
    const res = await fetch(url, {
      headers: { "X-API-Key": token },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Twitter API ${res.status}`);

    const data = (await res.json()) as {
      tweets?: Array<{
        id?: string;
        url?: string;
        text?: string;
        createdAt?: string;
        likeCount?: number;
        retweetCount?: number;
      }>;
    };

    return (data.tweets || []).map((t) => ({
      title: (t.text || "").slice(0, 80) || `Twitter: ${keyword}`,
      sourceUrl: t.url || `https://twitter.com/x/status/${t.id}`,
      content: t.text || "",
      sourceType: "twitter" as const,
      postedAt: new Date(t.createdAt || Date.now()),
      heat: (t.likeCount || 0) + (t.retweetCount || 0),
    }));
  } catch (error) {
    console.error(`Twitter 抓取失败 (${keyword}):`, error);
    return [];
  }
}

// ==============================
// 2. Hacker News (Algolia)
// ==============================
export async function fetchFromHackerNews(
  keyword: string,
): Promise<RawHotTopic[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
        keyword,
      )}&tags=story&hitsPerPage=15`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) throw new Error(`HN ${res.status}`);

    const data = (await res.json()) as {
      hits?: Array<{
        title?: string;
        story_title?: string;
        url?: string;
        objectID?: string;
        created_at?: string;
        points?: number;
        num_comments?: number;
      }>;
    };

    return (data.hits || [])
      .filter((h) => h.title || h.story_title)
      .map((h) => ({
        title: (h.title || h.story_title) as string,
        sourceUrl: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        content: (h.title || h.story_title) as string,
        sourceType: "hackernews" as const,
        postedAt: new Date(h.created_at || Date.now()),
        heat: (h.points || 0) + (h.num_comments || 0),
      }));
  } catch (error) {
    console.error(`HackerNews 抓取失败 (${keyword}):`, error);
    return [];
  }
}

// ==============================
// 3. GitHub（近期高 star 仓库，捕获代码库突发变动）
// ==============================
export async function fetchFromGithub(keyword: string): Promise<RawHotTopic[]> {
  try {
    const since = new Date(Date.now() - 14 * 24 * 3600_000)
      .toISOString()
      .slice(0, 10);
    const q = `${keyword} AI pushed:>${since}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      q,
    )}&sort=stars&order=desc&per_page=8`;

    const headers: Record<string, string> = {
      ...BROWSER_HEADERS,
      Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(url, { headers, next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);

    const data = (await res.json()) as {
      items?: Array<{
        full_name?: string;
        html_url?: string;
        description?: string;
        stargazers_count?: number;
        pushed_at?: string;
      }>;
    };

    return (data.items || []).map((r) => ({
      title: r.full_name || "GitHub repo",
      sourceUrl: r.html_url || "https://github.com",
      content: `${r.full_name} — ${r.description || "(无描述)"} ⭐${
        r.stargazers_count ?? 0
      }`,
      sourceType: "github" as const,
      postedAt: new Date(r.pushed_at || Date.now()),
      heat: r.stargazers_count || 0,
    }));
  } catch (error) {
    console.error(`GitHub 抓取失败 (${keyword}):`, error);
    return [];
  }
}

// ==============================
// 4. Bilibili（热门 AI 视频，best-effort，失败优雅降级）
// ==============================
export async function fetchFromBilibili(
  keyword: string,
): Promise<RawHotTopic[]> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(
      keyword,
    )}&order=pubdate&page=1`;
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: "https://www.bilibili.com",
      },
      next: { revalidate: 900 },
    });

    // B 站常因 wbi 签名/风控返回 412 或 HTML，统一优雅降级（不抛栈）
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      console.warn(`Bilibili 降级跳过 (${keyword}): HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      code?: number;
      data?: {
        result?: Array<{
          title?: string;
          arcurl?: string;
          bvid?: string;
          description?: string;
          pubdate?: number;
          play?: number;
          author?: string;
        }>;
      };
    };

    // code !== 0 通常代表需要 wbi 签名/风控拦截，直接降级
    if (data.code !== 0 || !data.data?.result) {
      console.warn(`Bilibili 返回 code=${data.code}，降级跳过 (${keyword})。`);
      return [];
    }

    return data.data.result.slice(0, 10).map((v) => ({
      title: (v.title || "").replace(/<[^>]+>/g, "") || "B站视频",
      sourceUrl: v.arcurl || `https://www.bilibili.com/video/${v.bvid}`,
      content: `${v.author ? `UP@${v.author}：` : ""}${(v.description || "").slice(
        0,
        160,
      )}`,
      sourceType: "bilibili" as const,
      postedAt: new Date((v.pubdate || Date.now() / 1000) * 1000),
      heat: v.play || 0,
    }));
  } catch (error) {
    console.error(`Bilibili 抓取失败 (${keyword}):`, error);
    return [];
  }
}

// ==============================
// 聚合器
// ==============================

/** 针对单个关键词聚合多源（用于关键词监控） */
export async function aggregateSources(
  keyword: string,
): Promise<RawHotTopic[]> {
  const results = await Promise.all([
    fetchFromTwitter(keyword),
    fetchFromHackerNews(keyword),
    fetchFromGithub(keyword),
    fetchFromBilibili(keyword),
  ]);
  return results.flat();
}

/** 公共看板 / 领域深挖：跨多个查询词聚合全网近 24-48h AI 原始数据 */
export async function aggregateBroad(
  queries: string[],
  withinHours = 48,
): Promise<RawHotTopic[]> {
  const batches = await Promise.all(
    queries.map(async (q) => {
      const [hn, gh, bili] = await Promise.all([
        fetchFromHackerNews(q),
        fetchFromGithub(q),
        fetchFromBilibili(q),
      ]);
      return [...hn, ...gh, ...bili];
    }),
  );

  const all = batches.flat().filter((item) => isFresh(item.postedAt, withinHours));

  // 按 URL 去重
  const seen = new Set<string>();
  const deduped: RawHotTopic[] = [];
  for (const item of all) {
    if (seen.has(item.sourceUrl)) continue;
    seen.add(item.sourceUrl);
    deduped.push(item);
  }
  return deduped.sort((a, b) => (b.heat || 0) - (a.heat || 0));
}
