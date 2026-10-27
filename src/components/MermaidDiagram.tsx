import { useEffect, useId, useState } from 'react'

type MermaidDiagramProps = { definition: string }

export function MermaidDiagram({ definition }: MermaidDiagramProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    void import('mermaid').then(({ default: mermaid }) => {
      // Diagram definitions come from Markdown, so keep Mermaid in its strict, non-HTML mode.
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default', flowchart: { htmlLabels: false } })
      mermaid.setParseErrorHandler(() => undefined)
      return mermaid.parse(definition, { suppressErrors: true }).then((isValid) => {
        if (!isValid) throw new Error('Invalid Mermaid definition')
        return mermaid.render(`dev-radar-${id}`, definition)
      })
    }).then(({ svg: renderedSvg }) => {
      if (!cancelled) {
        setError(false)
        setSvg(renderedSvg)
      }
    }).catch(() => {
      if (!cancelled) setError(true)
    })
    return () => { cancelled = true }
  }, [dark, definition, id])

  if (error) return <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">此技術圖表暫時無法顯示，仍可閱讀上方文字說明。</p>

  return <figure className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
    <figcaption className="mb-3 text-xs font-medium tracking-wide text-stone-500">概念示意圖</figcaption>
    {svg ? <div className="min-w-max [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} /> : <p role="status" className="py-4 text-sm text-stone-500">載入技術圖表中…</p>}
  </figure>
}
