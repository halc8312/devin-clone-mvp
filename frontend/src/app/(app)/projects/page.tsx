"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { projectsApi, type Project, type ProjectList } from "@/lib/api"
import {
  Loader2,
  Plus,
  Code2,
  GitBranch,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ProjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [totalProjects, setTotalProjects] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    loadProjects()
  }, [currentPage])

  async function loadProjects() {
    try {
      const data: ProjectList = await projectsApi.getAll(currentPage, pageSize)
      setProjects(data.projects)
      setTotalProjects(data.total)
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロジェクトの読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsCreating(true)

    const formData = new FormData(e.currentTarget)
    const projectData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      language: formData.get("language") as string,
      template: formData.get("template") as string || "blank",
    }

    try {
      const newProject = await projectsApi.create(projectData)
      setProjects([newProject, ...projects])
      setIsCreateDialogOpen(false)
      toast({
        title: "成功",
        description: "プロジェクトが作成されました",
      })
      router.push(`/projects/${newProject.id}`)
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロジェクトの作成に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!confirm(`「${project.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      await projectsApi.delete(project.id)
      setProjects(projects.filter((p) => p.id !== project.id))
      toast({
        title: "成功",
        description: "プロジェクトが削除されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロジェクトの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">プロジェクト</h1>
          <p className="text-muted-foreground mt-2">
            すべてのプロジェクトを管理
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規プロジェクト
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Code2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">プロジェクトがありません</h3>
            <p className="text-sm text-muted-foreground mb-4">
              新しいプロジェクトを作成して開始しましょう
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              最初のプロジェクトを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="mt-2">
                      {project.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        開く
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteProject(project)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    <span className="capitalize">{project.language}</span>
                    {project.template !== "blank" && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{project.template}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {project.total_size_kb} KB / {project.max_size_kb} KB
                    </span>
                    <span>•</span>
                    <span className="text-xs">
                      最大 {project.max_files} ファイル
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(project.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalProjects > pageSize && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {Math.ceil(totalProjects / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalProjects / pageSize), p + 1))}
            disabled={currentPage >= Math.ceil(totalProjects / pageSize)}
          >
            次へ
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>新規プロジェクト作成</DialogTitle>
              <DialogDescription>
                新しいプロジェクトの詳細を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">プロジェクト名</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">説明（オプション）</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="プロジェクトの説明を入力"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="language">プログラミング言語</Label>
                <Select name="language" defaultValue="python">
                  <SelectTrigger>
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template">テンプレート</Label>
                <Select name="template" defaultValue="blank">
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">空のプロジェクト</SelectItem>
                    <SelectItem value="webapp">Webアプリケーション</SelectItem>
                    <SelectItem value="api">REST API</SelectItem>
                    <SelectItem value="cli">CLIツール</SelectItem>
                    <SelectItem value="library">ライブラリ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "作成"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}