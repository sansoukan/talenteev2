"use client"

import { useMemo } from "react"

interface MarkdownContentProps {
  content: string
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  const htmlContent = useMemo(() => {
    if (!content) return ""

    const lines = content.split("\n")
    const htmlLines: string[] = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip empty lines
      if (!line.trim()) {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        continue
      }

      // Horizontal rule
      if (line.trim() === "---") {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push('<hr class="border-t border-white/10 my-8" />')
        continue
      }

      // Headers
      if (line.startsWith("#### ")) {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push(`<h4 class="text-xl font-semibold mt-8 mb-3 text-white tracking-tight">${line.slice(5)}</h4>`)
      } else if (line.startsWith("### ")) {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push(`<h3 class="text-2xl font-semibold mt-10 mb-4 text-white tracking-tight">${line.slice(4)}</h3>`)
      } else if (line.startsWith("## ")) {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push(`<h2 class="text-3xl font-semibold mt-12 mb-6 text-white tracking-tight">${line.slice(3)}</h2>`)
      } else if (line.startsWith("# ")) {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push(`<h1 class="text-4xl font-bold mt-12 mb-8 text-white tracking-tight">${line.slice(2)}</h1>`)
      }
      // Lists
      else if (line.match(/^[*-]\s+/)) {
        if (!inList) {
          htmlLines.push('<ul class="list-disc ml-6 mb-6 space-y-2">')
          inList = true
        }
        const content = line.replace(/^[*-]\s+/, "")
        htmlLines.push(`<li class="text-gray-200 leading-relaxed">${formatInline(content)}</li>`)
      }
      // Regular paragraph
      else {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
        htmlLines.push(`<p class="mb-6 text-gray-200 leading-relaxed">${formatInline(line)}</p>`)
      }
    }

    // Close any open list
    if (inList) {
      htmlLines.push("</ul>")
    }

    return htmlLines.join("\n")
  }, [content])

  return (
    <article
      className="prose prose-invert prose-lg max-w-none"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: 1.8,
        fontSize: "1.05rem",
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

function formatInline(text: string): string {
  return (
    text
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-semibold text-white"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline">$1</a>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-2 py-1 rounded text-sm text-blue-300">$1</code>')
  )
}
