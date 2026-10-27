import { useEffect, useMemo, useRef, useState } from 'react'
import { ArticleCard } from './ArticleCard'
import { ArticleDetailPage } from './ArticleDetailPage'
import { ThemeSelect } from './ThemeSelect'
import type { NewsIssue } from '../types/news'

// Hash routes keep direct article links compatible with static hosting.
function parseArticleIdFromHash(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  const match = hash.match(/^#\/article\/([^/?#]+)/)
  return match ? match[1] : null
}

const text = {
  hero: '今天，值得看的三則技術新聞',
  archiveTitle: '新聞回顧',
  search: '搜尋新聞、主題或來源…',
  emptyArchive: '目前還沒有歷史新聞。',
  noResults: (query: string) => `找不到符合「${query}」的新聞，試試其他關鍵字。`,
  footer: 'Dev Radar · 每日三則，為開發者而寫',
  searchLabel: '搜尋新聞',
  navLabel: '主要導覽',
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function useTypewriter(fullText: string, baseSpeed = 75, startDelay = 180) {
  const [count, setCount] = useState(() => {
    // Render the complete headline immediately when the OS requests less motion.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return fullText.length;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const getDelay = (char: string, index: number) => {
      const base = baseSpeed;
      const jitter = Math.random() * 30 - 15
      const punctuationPause = /[，。,、！？]/.test(char) ? 200 : 0
      const startSlow = index < 3 ? 100 : 0
      return Math.max(30, base + jitter + punctuationPause + startSlow);
    };

    const typeNext = (i: number) => {
      if (cancelled) return;
      if (i > fullText.length) return;
      setCount(i);
      if (i === fullText.length) return;
      const delay = getDelay(fullText.charAt(i), i);
      const id = window.setTimeout(() => typeNext(i + 1), delay);
      timers.push(id);
    };

    const startId = window.setTimeout(() => typeNext(1), startDelay);
    timers.push(startId);

    return () => {
      cancelled = true;
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [fullText, baseSpeed, startDelay]);

  return {
    typedText: fullText.slice(0, count),
    isDone: count >= fullText.length,
  };
}

export function RadarPage() {
  const [issues, setIssues] = useState<NewsIssue[]>([])
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(() => parseArticleIdFromHash())
  const { typedText, isDone } = useTypewriter(text.hero, 75, 180)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchResultsRef = useRef<HTMLElement>(null)
  const latestIssue = issues[0]
  const articleMap = useMemo(() => new Map(issues.flatMap((issue) => issue.articles.map((article) => [article.id, article] as const))), [issues])
  const normalizedQuery = query.trim().toLocaleLowerCase()

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/issues', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`News API returned ${response.status}`)
        return response.json() as Promise<NewsIssue[]>
      })
      .then(setIssues)
      .catch((error: unknown) => { if (!controller.signal.aborted) { console.error('News load failed', error); setLoadError(true) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    function onHashChange() {
      setCurrentArticleId(parseArticleIdFromHash())
    }

    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [])

  const searchResults = useMemo(
    () =>
      issues
        .map((issue) => ({
          ...issue,
          articles: issue.articles.filter((article) =>
            Object.values(article)
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          ),
        }))
        .filter((issue) => issue.articles.length > 0),
    [issues, normalizedQuery],
  )

  const archiveIssues = normalizedQuery ? searchResults : issues.slice(1)
  const matchedArticles = searchResults.flatMap((issue) => issue.articles.map((article) => ({ article, issueDate: issue.date })))

  function closeSearch() {
    setSearchOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSearch()
      }
    }

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (!target) return

      const isInsideSearch = searchContainerRef.current?.contains(target)
      const isInsideResults = searchResultsRef.current?.contains(target)

      if (!isInsideSearch && !isInsideResults) {
        closeSearch()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [searchOpen])

  function showArticle(articleId: string) {
    setSearchOpen(false)
    setQuery('')
    window.location.assign(`#/article/${articleId}`)
  }

  function handleBackToList() {
    window.location.assign('#latest')
  }

  const activeArticle = currentArticleId ? articleMap.get(currentArticleId) : null

  if (loading || loadError || !latestIssue) {
    return <main className="specimen-page content-container py-16 text-center" role="status">
      <h1 className="text-2xl font-bold">Dev Radar</h1>
      <p className="empty-copy mt-2">{loading ? '載入新聞中…' : loadError ? '新聞暫時無法載入，請稍後重試。' : '目前還沒有新聞。'}</p>
    </main>
  }

  if (activeArticle) {
    return <ArticleDetailPage article={activeArticle} onBack={handleBackToList} />
  }

  if (currentArticleId && !activeArticle) {
    return (
      <div className="specimen-page">
        <header className="site-header">
          <div className="header-inner">
            <button
              type="button"
              onClick={handleBackToList}
              className="icon-button shrink-0"
              aria-label="返回 (Esc)"
              title="返回 (Esc)"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center font-semibold tracking-tight text-stone-500">
              Dev Radar
            </div>
            <nav aria-label="主要導覽" className="theme-nav justify-self-end">
              <ThemeSelect />
            </nav>
          </div>
        </header>
        <main className="content-container py-16 text-center">
          <h2 className="text-2xl font-bold">找不到該篇技術新聞</h2>
          <p className="empty-copy mt-2">該文章可能已更換網址或不存在。</p>
          <div className="mt-6">
            <button type="button" onClick={handleBackToList} className="detail-bottom-back">
              ← 返回
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="specimen-page">
      <header className="site-header">
        <div className={`header-inner ${searchOpen ? 'header-inner--search-open' : ''}`}>
          <div aria-hidden="true" />
          <div id="site-search" ref={searchContainerRef} className="min-w-0">
            {searchOpen ? (
              <div className="search-form">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{text.searchLabel}</span>
                  <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') closeSearch() }} type="search" placeholder={text.search} className="search-input" />
                </label>
              </div>
            ) : (
              <div className="brand-group">
                <a href="#latest" className="brand-link">Dev Radar</a>
                <button type="button" onClick={() => setSearchOpen(true)} aria-label={text.searchLabel} aria-expanded="false" aria-controls="site-search" title={text.searchLabel} className="icon-button">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4 4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <nav aria-label={text.navLabel} className="theme-nav justify-self-end"><ThemeSelect /></nav>
        </div>
        {searchOpen && normalizedQuery && (
          <section ref={searchResultsRef} aria-label={`${text.searchLabel}結果`} className="search-results">
            <div className="search-results-inner">
              <div>
                {matchedArticles.length ? (
                  <ul className="search-list">
                    {matchedArticles.map(({ article }) => (
                      <li key={article.id}>
                        <button type="button" onClick={() => showArticle(article.id)} className="search-result-button">
                          <span className="search-result-meta"><span>{article.category}</span>{' / '}<time>{article.publishedAt}</time></span>
                          <span className="search-result-title">{article.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="empty-copy">{text.noResults(query)}</p>}
              </div>
            </div>
          </section>
        )}
      </header>

      <main>
        <section className="hero content-container">
          <h1 className="hero-title" aria-label={text.hero}>
            <span>{typedText}</span>
            <span
              className={`typewriter-cursor ${isDone ? 'typewriter-cursor--done' : ''}`}
              aria-hidden="true"
            />
          </h1>
        </section>

        <section id="latest" className="issue-section scroll-mt-6">
          <div className="issue-inner content-container">
            <h2 className="issue-date">{formatDate(latestIssue.date)}</h2>
            <div className="article-list">
              {latestIssue.articles.map((article, index) => (
                <ArticleCard key={article.id} anchorId={`latest-${article.id}`} article={article} number={index + 1} />
              ))}
            </div>
          </div>
        </section>

        <section id="archive" className="archive content-container scroll-mt-6">
          <h2 className="archive-title">{text.archiveTitle}</h2>
          <div className="archive-list">
            {archiveIssues.length ? archiveIssues.map((issue) => (
              <section key={issue.date} aria-labelledby={`issue-${issue.date}`}>
                <div>
                  <h3 id={`issue-${issue.date}`} className="archive-issue-heading">{formatDate(issue.date)}</h3>
                </div>
                <div className="article-list">
                  {issue.articles.map((article, index) => (
                    <ArticleCard compact key={article.id} anchorId={`archive-${article.id}`} article={article} number={index + 1} />
                  ))}
                </div>
              </section>
            )) : (
              <p className="empty-copy">{normalizedQuery ? text.noResults(query) : text.emptyArchive}</p>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner content-container">
          <p className="footer-copy">{text.footer}</p>
        </div>
      </footer>
    </div>
  )
}
