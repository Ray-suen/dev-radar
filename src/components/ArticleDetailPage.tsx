import { useEffect, useState } from 'react'
import type { Article } from '../types/news'
import { formatHeatValue, groupHeatMetrics } from '../lib/article-heat'
import { MarkdownDetails } from './MarkdownDetails'
import { ThemeSelect } from './ThemeSelect'
import { NewsAssistant } from './NewsAssistant'

type ArticleDetailPageProps = {
  article: Article
  onBack: () => void
}

function buildChatGptPrompt(article: Article) {
  return [
    '請以資深工程師的角度，深入解釋以下技術新聞。',
    '請說明核心概念、運作方式、適用情境與限制；區分已證實資訊與推論，不要虛構原文未證實的細節。',
    '',
    `中文標題：${article.title}`,
    `英文原始標題：${article.originalTitle}`,
    `分類：${article.category}`,
    `來源：${article.source}`,
    `發布日期：${article.publishedAt}`,
    '',
    `快速摘要：${article.summary}`,
    '',
    '詳細技術內容：',
    article.details,
    '',
    `原文連結：${article.url}`,
  ].join('\n')
}

export function ArticleDetailPage({ article, onBack }: ArticleDetailPageProps) {
  const [chatGptNotice, setChatGptNotice] = useState(false)
  const heatGroups = article.heat ? groupHeatMetrics(article.heat) : []
  const chatGptPrompt = buildChatGptPrompt(article)
  const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptPrompt)}`

  useEffect(() => {
    window.scrollTo(0, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.body.classList.contains('assistant-open')) onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  function openChatGpt() {
    void navigator.clipboard?.writeText(chatGptPrompt).catch(() => undefined)
    window.open(chatGptUrl, '_blank', 'noopener,noreferrer')
    setChatGptNotice(true)
  }

  return (
    <div className="specimen-page">
      <header className="site-header">
        <div className="header-inner">
          <button
            type="button"
            onClick={onBack}
            className="icon-button shrink-0"
            aria-label="返回 (Esc)"
            title="返回 (Esc)"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center font-semibold tracking-tight text-stone-500">
            Dev Radar 深入解說
          </div>
          <nav aria-label="主要導覽" className="theme-nav justify-self-end"><ThemeSelect /></nav>
        </div>
      </header>

      <main>
        <article className="content-container article-detail-container">
          <div className="article-meta">
            <span className="article-category">{article.category}</span>
            <span title={article.source} className="article-source">{article.source}</span>
            <time className="article-date">{article.publishedAt}</time>
          </div>

          <h1 className="detail-title">{article.title}</h1>
          <p className="article-original">{article.originalTitle}</p>

          {heatGroups.length > 0 && (
            <div className="article-heat mt-4">
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

          <div className="detail-summary-box">
            <h2 className="details-summary-title">摘要</h2>
            <p className="details-summary-copy">{article.summary}</p>
          </div>

          <MarkdownDetails content={article.details} />

          <div className="details-links">
            <a href={article.url} target="_blank" rel="noreferrer" className="article-action">閱讀原文 ↗</a>
            {article.projectUrl && (
              <a href={article.projectUrl} target="_blank" rel="noreferrer" className="article-action">GitHub ↗</a>
            )}
            {article.discussionUrl && (
              <a href={article.discussionUrl} target="_blank" rel="noreferrer" className="article-action">社群討論 ↗</a>
            )}
            <button type="button" onClick={openChatGpt} className="article-action">ChatGPT 討論 ↗</button>
          </div>

          {chatGptNotice && (
            <p role="status" className="status-note mt-4">已開啟 ChatGPT；若內容沒有自動帶入，請貼上已複製的提問。</p>
          )}

          <div className="detail-bottom-nav">
            <button type="button" onClick={onBack} className="detail-bottom-back">
              ← 返回
            </button>
          </div>
        </article>
      </main>

      <footer className="site-footer">
        <div className="footer-inner content-container">
          <p className="footer-copy">Dev Radar · 每日三則，為開發者而寫</p>
        </div>
      </footer>
      <NewsAssistant articleId={article.id} />
    </div>
  )
}
