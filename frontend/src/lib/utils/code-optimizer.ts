import { memo } from 'react'
import type { Language } from 'prism-react-renderer'

// Memoized code highlighting for performance
export const optimizeCodeHighlighting = {
  // Detect language from file extension
  detectLanguage(filename: string): Language | undefined {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, Language> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      m: 'objectivec',
      pl: 'perl',
      lua: 'lua',
      dart: 'dart',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      fish: 'bash',
      ps1: 'powershell',
      psm1: 'powershell',
      json: 'json',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      ini: 'ini',
      cfg: 'ini',
      conf: 'ini',
      md: 'markdown',
      mdx: 'markdown',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      html: 'html',
      vue: 'vue',
      svelte: 'svelte',
    }
    return (languageMap[ext || ''] as Language) || undefined
  },

  // Check if file is likely binary based on extension
  isBinaryFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase()
    const binaryExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'ico', 'webp',
      'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
      'exe', 'dll', 'so', 'dylib', 'app',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'ttf', 'otf', 'woff', 'woff2', 'eot',
      'db', 'sqlite', 'sqlite3',
    ]
    return binaryExtensions.includes(ext || '')
  },

  // Optimize large files by truncating
  truncateLargeFile(content: string, maxLines: number = 1000): {
    content: string
    truncated: boolean
    totalLines: number
  } {
    const lines = content.split('\n')
    const totalLines = lines.length
    
    if (totalLines <= maxLines) {
      return { content, truncated: false, totalLines }
    }
    
    const truncatedContent = lines.slice(0, maxLines).join('\n')
    return {
      content: truncatedContent,
      truncated: true,
      totalLines,
    }
  },

  // Virtualize large code blocks for performance
  shouldVirtualize(content: string): boolean {
    const lines = content.split('\n').length
    return lines > 500
  },

  // Extract code metrics
  getCodeMetrics(content: string, language?: string): {
    lines: number
    characters: number
    words: number
    complexity?: number
  } {
    const lines = content.split('\n').length
    const characters = content.length
    const words = content.split(/\s+/).filter(w => w.length > 0).length
    
    // Simple cyclomatic complexity for some languages
    let complexity: number | undefined
    if (language && ['javascript', 'typescript', 'python', 'java', 'c', 'cpp'].includes(language)) {
      const complexityKeywords = [
        'if', 'else', 'for', 'while', 'do', 'switch', 'case',
        'catch', 'finally', '&&', '||', '?'
      ]
      complexity = 1 // Base complexity
      complexityKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = content.match(regex)
        complexity! += matches ? matches.length : 0
      })
    }
    
    return { lines, characters, words, complexity }
  },
}

// Memoized component wrapper for code blocks
export const MemoizedCodeBlock = memo(
  ({ children, ...props }: any) => children(props),
  (prevProps, nextProps) => {
    // Only re-render if content or language changes
    return (
      prevProps.content === nextProps.content &&
      prevProps.language === nextProps.language &&
      prevProps.theme === nextProps.theme
    )
  }
)