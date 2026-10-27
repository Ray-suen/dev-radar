export type HeatMetric = {
  platform: string
  metric: string
  value: number
  sourceUrl: string
  checkedAt: string
}

export type Article = {
  id: string
  title: string
  originalTitle: string
  category: string
  source: string
  publishedAt: string
  url: string
  projectUrl?: string
  discussionUrl?: string
  heat?: HeatMetric[]
  summary: string
  details: string
}

export type NewsIssue = { date: string; displayDate: string; articles: Article[] }
