"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Editor from "@monaco-editor/react"
import { Save, Loader2 } from "lucide-react"

interface CodeEditorProps {
  content: string
  language?: string
  onSave: (content: string) => Promise<void>
}

export function CodeEditor({ content, language = "plaintext", onSave }: CodeEditorProps) {
  const [editorContent, setEditorContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setEditorContent(content)
    setHasChanges(false)
  }, [content])

  function handleEditorChange(value: string | undefined) {
    setEditorContent(value || "")
    setHasChanges((value || "") !== content)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave(editorContent)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Map language to Monaco editor language
  function getMonacoLanguage(lang?: string): string {
    const languageMap: Record<string, string> = {
      python: "python",
      javascript: "javascript",
      typescript: "typescript",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rust: "rust",
      ruby: "ruby",
      php: "php",
      swift: "swift",
      kotlin: "kotlin",
      scala: "scala",
      r: "r",
      bash: "shell",
      powershell: "powershell",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      xml: "xml",
      json: "json",
      yaml: "yaml",
      markdown: "markdown",
      sql: "sql",
    }
    return languageMap[lang || ""] || "plaintext"
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">
          言語: <span className="capitalize">{language || "plaintext"}</span>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          theme="vs-dark"
          value={editorContent}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  )
}