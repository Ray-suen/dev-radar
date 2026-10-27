import ReactMarkdown from 'react-markdown'
import { MermaidDiagram } from './MermaidDiagram'

type MarkdownDetailsProps = { content: string }

export function MarkdownDetails({ content }: MarkdownDetailsProps) {
  return <div className="markdown-details"><ReactMarkdown components={{
    h2: ({ children }) => <h4>{children}</h4>,
    p: ({ children }) => <p>{children}</p>,
    ul: ({ children }) => <ul>{children}</ul>,
    ol: ({ children }) => <ol>{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    pre: ({ children }) => <>{children}</>,
    code: ({ children, className }) => {
      const value = String(children).replace(/\n$/, '')
      if (className?.includes('language-mermaid')) return <MermaidDiagram definition={value} />
      if (className) return <pre><code>{children}</code></pre>
      return <code>{children}</code>
    },
  }}>{content}</ReactMarkdown></div>
}
