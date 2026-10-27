import type { Article } from '../types/news'
import { formatHeatValue, groupHeatMetrics } from '../lib/article-heat'

type ArticleCardProps = { article: Article; number: number; compact?: boolean; anchorId?: string }

export function ArticleCard({ article, number, compact = false, anchorId }: ArticleCardProps) {
  const heatGroups = article.heat ? groupHeatMetrics(article.heat) : []

  return (
    <article id={anchorId} className={`article-card scroll-mt-6 ${compact ? 'article-card--compact' : ''}`}>
      <p className="article-number">{String(number).padStart(2, '0')}</p>
      <div>
        <div className="article-meta">
          <span className="article-number article-number--mobile">{String(number).padStart(2, '0')}</span>
          <span className="article-category">{article.category}</span>
          <span title={article.source} className="article-source">{article.source}</span>
          <time className="article-date">{article.publishedAt}</time>
        </div>
        <h3 className="article-title">
          <a href={`#/article/${article.id}`} className="article-title-link">
            {article.title}
          </a>
        </h3>
        <p className="article-original">{article.originalTitle}</p>
        {heatGroups.length > 0 && (
          <div className="article-heat">
            <span className="heat-label">熱度</span>
            <ul aria-label="社群熱度證據" className="heat-list">
              {heatGroups.map((group) => (
                <li key={`${group.platform}-${group.sourceUrl}-${group.checkedAt}`}>
                  <a href={group.sourceUrl} target="_blank" rel="noreferrer">
                    {group.platform}: {group.metrics.map((item) => `${item.metric} ${formatHeatValue(item.value)}`).join(', ')}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  )
}
