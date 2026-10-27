import { z } from 'zod'

const date = z.iso.date()
const webUrl = z.url().refine((value) => /^https?:\/\//.test(value), 'Expected HTTP URL')
export const heatMetricSchema = z.object({
  platform: z.string().trim().min(1), metric: z.string().trim().min(1),
  value: z.number().finite().nonnegative(), sourceUrl: webUrl,
  checkedAt: z.iso.datetime({ offset: true }),
}).strict()
export const articleSchema = z.object({
  id: z.string().trim().min(1), title: z.string().trim().min(1),
  originalTitle: z.string().trim().min(1), category: z.string().trim().min(1),
  source: z.string().trim().min(1), publishedAt: date, url: webUrl,
  projectUrl: webUrl.optional(), discussionUrl: webUrl.optional(),
  heat: z.array(heatMetricSchema).optional(), summary: z.string().trim().min(1),
  details: z.string().trim().min(1),
}).strict()
export const issueSchema = z.object({
  date, articles: z.array(articleSchema).length(3),
}).strict().refine((issue) => new Set(issue.articles.map((article) => article.id)).size === 3, 'Duplicate article ID')
  .refine((issue) => new Set(issue.articles.map((article) => article.url)).size === 3, 'Duplicate article URL')
