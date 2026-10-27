import type { Article, NewsIssue } from '../src/types/news'
import { issueSchema } from '../src/lib/news-schema'

type ArticleRow = {
  id: string; issue_date: string; title: string; original_title: string; category: string
  source: string; published_at: string; url: string; project_url: string | null
  discussion_url: string | null; summary: string; details: string
}
type HeatRow = {
  article_id: string; platform: string; metric: string; value: number
  source_url: string; checked_at: string
}

export async function readIssues(db: D1Database): Promise<NewsIssue[]> {
  const [articleResult, heatResult, issueResult] = await db.batch([
    db.prepare('SELECT * FROM articles ORDER BY issue_date DESC, position ASC'),
    db.prepare('SELECT article_id, platform, metric, value, source_url, checked_at FROM heat_metrics ORDER BY id'),
    db.prepare('SELECT date FROM issues ORDER BY date DESC'),
  ])
  const articleRows = articleResult.results as ArticleRow[]
  const heatRows = heatResult.results as HeatRow[]
  const issueRows = issueResult.results as { date: string }[]
  const heatByArticle = new Map<string, NonNullable<Article['heat']>>()
  for (const row of heatRows) {
    const heat = heatByArticle.get(row.article_id) ?? []
    heat.push({ platform: row.platform, metric: row.metric, value: row.value, sourceUrl: row.source_url, checkedAt: row.checked_at })
    heatByArticle.set(row.article_id, heat)
  }
  const issues: NewsIssue[] = issueRows.map(({ date }) => ({
    date,
    displayDate: new Intl.DateTimeFormat('zh-TW', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)),
    articles: [],
  }))
  const byDate = new Map(issues.map((issue) => [issue.date, issue]))
  for (const row of articleRows) {
    byDate.get(row.issue_date)?.articles.push({
      id: row.id, title: row.title, originalTitle: row.original_title, category: row.category,
      source: row.source, publishedAt: row.published_at, url: row.url,
      ...(row.project_url && { projectUrl: row.project_url }),
      ...(row.discussion_url && { discussionUrl: row.discussion_url }),
      ...(heatByArticle.has(row.id) && { heat: heatByArticle.get(row.id) }),
      summary: row.summary, details: row.details,
    })
  }
  return issues
}

export async function publishIssue(db: D1Database, body: ReturnType<typeof issueSchema.parse>): Promise<void> {
  const statements = [
    db.prepare('INSERT OR IGNORE INTO issues (date) VALUES (?)').bind(body.date),
    db.prepare('DELETE FROM heat_metrics WHERE article_id IN (SELECT id FROM articles WHERE issue_date = ?)').bind(body.date),
    db.prepare('DELETE FROM articles WHERE issue_date = ?').bind(body.date),
    ...body.articles.flatMap((article, index) => [
      db.prepare('INSERT INTO articles (id, issue_date, position, title, original_title, category, source, published_at, url, project_url, discussion_url, summary, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(article.id, body.date, index + 1, article.title, article.originalTitle, article.category, article.source, article.publishedAt, article.url, article.projectUrl ?? null, article.discussionUrl ?? null, article.summary, article.details),
      ...(article.heat ?? []).map((heat) => db.prepare('INSERT INTO heat_metrics (article_id, platform, metric, value, source_url, checked_at) VALUES (?, ?, ?, ?, ?, ?)').bind(article.id, heat.platform, heat.metric, heat.value, heat.sourceUrl, heat.checkedAt)),
    ]),
  ]
  await db.batch(statements)
}

