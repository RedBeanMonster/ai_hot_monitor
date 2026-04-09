# 鱼皮 AI 热点监控与发现工具 (wkr-hot-monitor)

## 1. 需求背景与目标

作为 AI 编程博主，需要第一时间获取行业热点（如 AI 大模型更新、技术突破等）。为了避免纯人工检索的低效与滞后，也避免信息茧房效应，本项目旨在构建一个**轻量、敏捷的自动化热点监控与发现工具**，并将核心能力封装为 Agent Skill 供其他 AI 调用。

### 核心目标：
1. **关键词监控与自动搜索**：用户输入指定关键词（如“AI编程”、“Claude 3.5”），系统自动从全网和特定高优信源抓取最新信息。
2. **AI 智能去重与真伪识别**：利用大模型过滤假新闻、营销号“震惊体”，并提取一句话核心摘要。
3. **实时通知推送**：当高优真实热点出现时，第一时间进行推送。
4. **极客风可视化界面**：提供响应式 Web 面板，采用独特的 赛博朋克 / 玻璃拟物化 极客风格 UI。
5. **Agent Skill 赋能**：沉淀核心 API 封装为标准 Agent Skill。

---

## 2. 技术栈架构与选型

项目主张“敏捷开发、不过度工程化”，采用全栈同构方案：

- **核心框架**：Next.js (App Router, v14/v15) + TypeScript
- **UI 与动效**：Tailwind CSS + Framer Motion + Lucide Icons (偏向数据大屏/极客风设计)
- **大模型接入**：OpenAI Node SDK (`openai`) ➡ 对接 **OpenRouter API**（灵活切换 Claude 3.5 Sonnet / GPT-4o 等模型）
- **数据库持久化**：SQLite + Prisma ORM (零配置、便携，适合轻量级工具项目)
- **采集服务 (后端)**：
  - **Twitter/X API**: 接入 `twitterapi.io` 获取核心技术圈的高信噪比动态。
  - **免 API 网页爬虫**: 使用原生 `fetch` / `cheerio` 抓取 Hacker News, Github Trending, 聚合 AI 导航站等。
- **定时调度**：基于 Vercel Cron 或 Node-cron。

---

## 3. 核心功能模块设计

### 3.1 多源数据采集策略 (Multi-Source Fetcher)
为避免单一数据源造成的视野狭隘，分为两个常驻抓取通道：
1. **主动搜索 (Pull)**：
   - 每隔 1 小时轮询特定站点（例如 `news.ycombinator.com` 或无需鉴权的搜索接口）。
   - 解析 DOM 获取当前热门标题、摘要和来源链接。
   - 频率控制：采用限流（Rate Limit）与模拟浏览器 Headers，避免被反爬虫机制拦截。
2. **精准监控 (Twitter API)**：
   - 监听特定关键词（如 `#AI`, `#LLM`, `@OpenAI` 等）。
   - 关注推文的转评赞热度，过滤掉低质量的水贴。

### 3.2 AI 热点甄别引擎 (基于 OpenRouter)
将多源搜集到的 Raw Data 发送给 AI，AI 的系统提示词 (System Prompt) 逻辑如下：
- **过滤**：剔除陈旧信息、个人情绪发泄、假冒/造谣信息（比如“GPT-5 刚刚突然发布，震惊全球”等明显缺乏官方背书的假消息）。
- **聚合**：如果 Twitter 和 Hacker News 同时在讨论一件事，AI 将其合并为一个热点事件。
- **摘要**：提炼不超过 30 个字的“一句话核心”和不超过 100 个字的“详细背景”。
- **返回格式**：要求大模型输出标准 JSON，便于存入数据库 (`{ "title": "...", "summary": "...", "confidence": 0-1, "source_urls": [...] }`)。

### 3.3 通知与推送机制 (Notification)
- 数据落库后，向设定好的 Webhook 发送提醒 (例如 Server 酱、Bark 或企业微信)。
- Web 端支持 Browser Native Notifications。

### 3.4 Agent Skill 封装
对外暴露标准 RESTful API：`GET /api/skills/hot-topics?keyword=xxx`。
提供 `.json` 或 `.yaml` 的 Plugin Manifest，让其他 AI 能够理解并调用此服务以回答“今天 AI 圈子有什么大新闻？”。

---

## 4. 实施路线图 (Action Plan)

- [ ] **阶段一 (Phase 1)**：初始化 Next.js 全栈项目，配置 Prisma+SQLite，完成极客风的纯前端交互面板（热点时间轴、关键词配置）。
- [ ] **阶段二 (Phase 2)**：开发核心信息爬虫（轻量级 DOM 解析 + TwitterAPI.io 对接封装）。
- [ ] **阶段三 (Phase 3)**：接入 OpenRouter API (利用新版 openai sdk) 构建 AI 甄别处理流，并完成定时轮询与提醒机制。
- [ ] **阶段四 (Phase 4)**：封装并定义 Agent Skills，进行全功能验收。
