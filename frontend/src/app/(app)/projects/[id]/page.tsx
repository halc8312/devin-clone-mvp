"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { projectsApi, filesApi, type Project, type ProjectStats, type ProjectFileTree } from "@/lib/api"
import { FileExplorer } from "@/components/file-explorer"
import { CodeEditor } from "@/components/code-editor"
import { ChatInterface } from "@/components/chat-interface"
import {
  Loader2,
  Settings,
  ChevronLeft,
  FolderTree,
  Code,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id as string
  const isDesktop = useMediaQuery("(min-width: 1280px)")
  const isTablet = useMediaQuery("(min-width: 768px)")

  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [fileTree, setFileTree] = useState<ProjectFileTree[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [selectedFileContent, setSelectedFileContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("files")

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  useEffect(() => {
    // Switch to editor tab when file is selected on mobile
    if (selectedFileId && !isTablet) {
      setActiveTab("editor")
    }
  }, [selectedFileId, isTablet])

  async function loadProjectData() {
    try {
      const [projectData, projectStats, files] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.getStats(projectId),
        filesApi.getTree(projectId),
      ])
      
      setProject(projectData)
      setStats(projectStats)
      setFileTree(files)
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロジェクトの読み込みに失敗しました",
        variant: "destructive",
      })
      router.push("/projects")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileSelect(fileId: string) {
    try {
      const file = await filesApi.get(projectId, fileId)
      if (file.type === 'file' && !file.is_binary) {
        setSelectedFileId(fileId)
        setSelectedFileContent(file.content || "")
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ファイルの読み込みに失敗しました",
        variant: "destructive",
      })
    }
  }

  async function handleFileSave(content: string) {
    if (!selectedFileId) return

    try {
      await filesApi.update(projectId, selectedFileId, { content })
      toast({
        title: "成功",
        description: "ファイルが保存されました",
      })
      const newStats = await projectsApi.getStats(projectId)
      setStats(newStats)
    } catch (error) {
      toast({
        title: "エラー",
        description: "ファイルの保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  async function handleProjectUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!project) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    const updateData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      language: formData.get("language") as string,
    }

    try {
      const updated = await projectsApi.update(projectId, updateData)
      setProject(updated)
      setIsEditDialogOpen(false)
      toast({
        title: "成功",
        description: "プロジェクトが更新されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロジェクトの更新に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleFileCreate(path: string, type: 'file' | 'directory') {
    try {
      await filesApi.create(projectId, {
        name: path.split('/').pop() || path,
        path,
        type,
        content: type === 'file' ? '' : undefined,
      })
      
      const files = await filesApi.getTree(projectId)
      setFileTree(files)
      
      toast({
        title: "成功",
        description: `${type === 'file' ? 'ファイル' : 'フォルダ'}が作成されました`,
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: `${type === 'file' ? 'ファイル' : 'フォルダ'}の作成に失敗しました`,
        variant: "destructive",
      })
    }
  }

  async function handleFileDelete(fileId: string) {
    try {
      await filesApi.delete(projectId, fileId)
      
      if (selectedFileId === fileId) {
        setSelectedFileId(null)
        setSelectedFileContent("")
      }
      
      const [files, newStats] = await Promise.all([
        filesApi.getTree(projectId),
        projectsApi.getStats(projectId),
      ])
      setFileTree(files)
      setStats(newStats)
      
      toast({
        title: "成功",
        description: "ファイルが削除されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "ファイルの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  if (isLoading || !project) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sizePercentage = stats ? (stats.total_size_kb / project.max_size_kb) * 100 : 0
  const fileCountPercentage = stats ? (stats.total_files / project.max_files) * 100 : 0

  // Desktop layout (3 columns)
  if (isDesktop) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/projects")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-2">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline">{project.language}</Badge>
                <Badge variant="outline">{project.template}</Badge>
                <span className="text-sm text-muted-foreground">
                  作成日: {new Date(project.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ファイル数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_files || 0} / {project.max_files}
              </div>
              <Progress value={fileCountPercentage} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">使用容量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_size_kb || 0} KB / {project.max_size_kb} KB
              </div>
              <Progress value={sizePercentage} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">言語別ファイル数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats && Object.entries(stats.language_breakdown).length > 0 ? (
                  Object.entries(stats.language_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([lang, count]) => (
                      <div key={lang} className="flex justify-between text-sm">
                        <span className="capitalize">{lang}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))
                ) : (
                  <span className="text-sm text-muted-foreground">データなし</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3-column layout */}
        <div className="grid gap-4 grid-cols-[300px_1fr_400px]">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="text-sm">ファイルエクスプローラー</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FileExplorer
                files={fileTree}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                selectedFileId={selectedFileId}
              />
            </CardContent>
          </Card>
          
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="text-sm">コードエディター</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              {selectedFileId ? (
                <CodeEditor
                  content={selectedFileContent}
                  language={fileTree.find(f => f.id === selectedFileId)?.language || "plaintext"}
                  onSave={handleFileSave}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  ファイルを選択してください
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="h-[600px]">
            <ChatInterface
              projectId={projectId}
              onCodeInsert={(code, language) => {
                if (selectedFileId) {
                  setSelectedFileContent(prev => prev + '\n\n' + code)
                } else {
                  toast({
                    title: "ヒント",
                    description: "ファイルを選択するか、新規作成してからコードを挿入してください",
                  })
                }
              }}
            />
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleProjectUpdate}>
              <DialogHeader>
                <DialogTitle>プロジェクト設定</DialogTitle>
                <DialogDescription>
                  プロジェクトの設定を変更します
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">プロジェクト名</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={project.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">説明</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={project.description}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-language">プログラミング言語</Label>
                  <Input
                    id="edit-language"
                    name="language"
                    defaultValue={project.language}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    "更新"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Mobile/Tablet layout (tabs)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{project.language}</Badge>
              <Badge variant="outline" className="text-xs">{project.template}</Badge>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => setIsEditDialogOpen(true)}
          size="sm"
          className="self-start"
        >
          <Settings className="mr-2 h-4 w-4" />
          設定
        </Button>
      </div>

      {/* Stats Summary (mobile) */}
      <Card className="sm:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">ファイル数</p>
              <p className="font-medium">
                {stats?.total_files || 0} / {project.max_files}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">使用容量</p>
              <p className="font-medium">
                {stats?.total_size_kb || 0} KB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for mobile/tablet */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">統計</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs sm:text-sm">
            <FolderTree className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">ファイル</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="text-xs sm:text-sm">
            <Code className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">エディター</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ファイル数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_files || 0} / {project.max_files}
                </div>
                <Progress value={fileCountPercentage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">使用容量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_size_kb || 0} KB / {project.max_size_kb} KB
                </div>
                <Progress value={sizePercentage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card className="sm:col-span-1 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">言語別ファイル数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {stats && Object.entries(stats.language_breakdown).length > 0 ? (
                    Object.entries(stats.language_breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([lang, count]) => (
                        <div key={lang} className="flex justify-between text-sm">
                          <span className="capitalize">{lang}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))
                  ) : (
                    <span className="text-sm text-muted-foreground">データなし</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card className="h-[calc(100vh-300px)] sm:h-[600px]">
            <CardHeader>
              <CardTitle className="text-sm">ファイルエクスプローラー</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FileExplorer
                files={fileTree}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                selectedFileId={selectedFileId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="mt-4">
          <Card className="h-[calc(100vh-300px)] sm:h-[600px]">
            <CardHeader>
              <CardTitle className="text-sm">コードエディター</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              {selectedFileId ? (
                <CodeEditor
                  content={selectedFileContent}
                  language={fileTree.find(f => f.id === selectedFileId)?.language || "plaintext"}
                  onSave={handleFileSave}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                  <Code className="h-12 w-12 mb-4 opacity-50" />
                  <p>ファイルが選択されていません</p>
                  <p className="text-sm mt-2">ファイルタブからファイルを選択してください</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <div className="h-[calc(100vh-300px)] sm:h-[600px]">
            <ChatInterface
              projectId={projectId}
              onCodeInsert={(code, language) => {
                if (selectedFileId) {
                  setSelectedFileContent(prev => prev + '\n\n' + code)
                  setActiveTab("editor")
                } else {
                  toast({
                    title: "ヒント",
                    description: "ファイルを選択するか、新規作成してからコードを挿入してください",
                  })
                }
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <form onSubmit={handleProjectUpdate}>
            <DialogHeader>
              <DialogTitle>プロジェクト設定</DialogTitle>
              <DialogDescription>
                プロジェクトの設定を変更します
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">プロジェクト名</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={project.name}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">説明</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={project.description}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-language">プログラミング言語</Label>
                <Input
                  id="edit-language"
                  name="language"
                  defaultValue={project.language}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "更新"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}