import * as cheerio from 'cheerio';

export interface RawHotTopic {
  title: string;
  sourceUrl: string;
  content: string; // The tweet text or brief summary from crawler
  sourceType: 'twitter' | 'web-crawler';
  postedAt: Date;
}

// ==============================
// 1. Twitter API Fetcher
// ==============================
export async function fetchFromTwitter(keyword: string): Promise<RawHotTopic[]> {
  const TWITTER_API_TOKEN = process.env.TWITTERAPI_IO_TOKEN;
  
  if (!TWITTER_API_TOKEN) {
    console.warn("⚠️ TWITTERAPI_IO_TOKEN not configured. Skipping Twitter fetch.");
    return [];
  }

  try {
    // Note: TwitterAPI.io endpoint. 
    // This expects to fetch recent tweets based on the query
    const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(keyword)}&queryType=Latest`;
    const res = await fetch(url, {
      headers: {
        'X-API-Key': TWITTER_API_TOKEN,
      },
      next: { revalidate: 300 } // Cache for 5 mins
    });
    
    if (!res.ok) {
        throw new Error(`Twitter API Error: ${res.status}`);
    }

    const data = await res.json();
    
    // Parse response according to their API format (assuming standard tweets array)
    const tweets = data.tweets || [];
    
    return tweets.map((tweet: any) => ({
      title: `Twitter discussed: ${keyword}`,
      sourceUrl: tweet.url || `https://twitter.com/x/status/${tweet.id}`,
      content: tweet.text || "",
      sourceType: 'twitter',
      postedAt: new Date(tweet.createdAt || Date.now()),
    }));
  } catch (error) {
    console.error(`Failed to fetch from Twitter for ${keyword}:`, error);
// ==============================
// 2. Headless Web Crawler (Hacker News example)
// ==============================
export async function fetchFromHackerNews(keyword: string): Promise<RawHotTopic[]> {
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(keyword)}&tags=story`, {
        next: { revalidate: 600 }
    });
    
    if (!res.ok) throw new Error("HN Fetch Failed");
    const data = await res.json();
    
    return data.hits.map((hit: any) => ({
      title: hit.title || hit.story_title,
      sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      content: hit.title || "",
      sourceType: 'web-crawler',
      postedAt: new Date(hit.created_at || Date.now()),
    }));
  } catch (error) {
    console.error(`Failed to fetch HN for ${keyword}:`, error);
    return [];
  }
}

// Master Fetch Trigger
export async function aggregateSources(keyword: string): Promise<RawHotTopic[]> {
  const [twitterResults, hnResults] = await Promise.all([
    fetchFromTwitter(keyword),
    fetchFromHackerNews(keyword)
  ]);

  return [...twitterResults, ...hnResults];
}
