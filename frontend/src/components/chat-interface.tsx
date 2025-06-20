"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { chatApi, type ChatMessage, type ChatSession } from "@/lib/api"
import {
  Send,
  Bot,
  User,
  Plus,
  Loader2,
  Code2,
  Copy,
  Check,
} from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ChatInterfaceProps {
  projectId: string
  onCodeInsert?: (code: string, language: string) => void
}

interface CodeBlock {
  language: string
  code: string
}

export function ChatInterface({ projectId, onCodeInsert }: ChatInterfaceProps) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadSessions()
  }, [projectId])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadSessions() {
    try {
      const data = await chatApi.listSessions(projectId)
      setSessions(data.sessions)
      
      if (data.sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(data.sessions[0].id)
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "チャットセッションの読み込みに失敗しました",
        variant: "destructive",
      })
    }
  }

  async function loadMessages(sessionId: string) {
    setIsLoading(true)
    try {
      const session = await chatApi.getSession(projectId, sessionId)
      setMessages(session.messages)
    } catch (error) {
      toast({
        title: "エラー",
        description: "メッセージの読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function createNewSession() {
    try {
      const session = await chatApi.createSession(projectId, {
        title: `Chat ${new Date().toLocaleString('ja-JP')}`
      })
      setSessions([session, ...sessions])
      setCurrentSessionId(session.id)
      setMessages([])
    } catch (error) {
      toast({
        title: "エラー",
        description: "新規チャットの作成に失敗しました",
        variant: "destructive",
      })
    }
  }

  async function sendMessage() {
    if (!input.trim() || !currentSessionId || isSending) return

    const messageContent = input.trim()
    setInput("")
    setIsSending(true)

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: 'temp-user',
      session_id: currentSessionId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // Stream response
      const response = await chatApi.streamMessage(projectId, {
        message: messageContent,
        session_id: currentSessionId,
        stream: true
      })

      let assistantMessage: ChatMessage = {
        id: 'temp-assistant',
        session_id: currentSessionId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), tempUserMessage, assistantMessage])

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.content) {
                assistantMessage.content += data.content
                setMessages(prev => 
                  prev.map(m => m.id === 'temp-assistant' 
                    ? { ...assistantMessage } 
                    : m
                  )
                )
              }
              
              if (data.done) {
                // Extract code blocks
                assistantMessage.code_blocks = extractCodeBlocks(assistantMessage.content)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Reload messages to get proper IDs
      await loadMessages(currentSessionId)
      
    } catch (error) {
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました",
        variant: "destructive",
      })
      // Remove temporary messages on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
    } finally {
      setIsSending(false)
    }
  }

  function extractCodeBlocks(content: string): CodeBlock[] {
    const pattern = /```(\w+)?\n(.*?)```/gs
    const blocks: CodeBlock[] = []
    let match

    while ((match = pattern.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      })
    }

    return blocks
  }

  function renderMessageContent(message: ChatMessage) {
    const parts: JSX.Element[] = []
    let lastIndex = 0
    let blockIndex = 0

    // Split content by code blocks
    const codeBlockPattern = /```(\w+)?\n(.*?)```/gs
    let match

    while ((match = codeBlockPattern.exec(message.content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const text = message.content.slice(lastIndex, match.index)
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {text}
          </p>
        )
      }

      const language = match[1] || 'plaintext'
      const code = match[2].trim()
      const currentBlockIndex = blockIndex++

      // Add code block
      parts.push(
        <div key={`code-${currentBlockIndex}`} className="my-2">
          <div className="flex items-center justify-between bg-zinc-800 px-3 py-1 rounded-t-md">
            <span className="text-xs text-zinc-400">{language}</span>
            <div className="flex gap-2">
              {onCodeInsert && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => onCodeInsert(code, language)}
                >
                  <Code2 className="h-3 w-3 mr-1" />
                  挿入
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  setCopiedBlocks(new Set([...copiedBlocks, currentBlockIndex]))
                  setTimeout(() => {
                    setCopiedBlocks(prev => {
                      const next = new Set(prev)
                      next.delete(currentBlockIndex)
                      return next
                    })
                  }, 2000)
                }}
              >
                {copiedBlocks.has(currentBlockIndex) ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      const text = message.content.slice(lastIndex)
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {text}
        </p>
      )
    }

    return <div className="space-y-2">{parts}</div>
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">AIアシスタント</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={createNewSession}
          >
            <Plus className="h-4 w-4 mr-1" />
            新規チャット
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mb-4" />
              <p className="text-sm">AIアシスタントに質問してください</p>
              <p className="text-xs mt-2">コードの生成、エラー修正、改善提案など</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'assistant' && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {renderMessageContent(message)}
                  </div>
                </div>
              ))}
              
              {isSending && (
                <div className="flex gap-3 flex-row-reverse">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="質問を入力..."
              disabled={isSending || !currentSessionId}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending || !currentSessionId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}