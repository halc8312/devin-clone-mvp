"use client"

import { useState } from "react"
import { ProjectFileTree } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit,
  FileCode,
  FileText,
  FileJson,
  FileImage,
} from "lucide-react"

interface FileExplorerProps {
  files: ProjectFileTree[]
  onFileSelect: (fileId: string) => void
  onFileCreate: (path: string, type: 'file' | 'directory') => void
  onFileDelete: (fileId: string) => void
  selectedFileId: string | null
}

export function FileExplorer({
  files,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  selectedFileId,
}: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createType, setCreateType] = useState<'file' | 'directory'>('file')
  const [createPath, setCreatePath] = useState("")
  const [parentPath, setParentPath] = useState("")

  function toggleDir(dirId: string) {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId)
    } else {
      newExpanded.add(dirId)
    }
    setExpandedDirs(newExpanded)
  }

  function getFileIcon(file: ProjectFileTree) {
    if (file.type === 'directory') {
      return expandedDirs.has(file.id) ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      )
    }

    // File icons based on language/extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-yellow-500" />
      case 'json':
        return <FileJson className="h-4 w-4 text-green-500" />
      case 'md':
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4 text-purple-500" />
      default:
        return <File className="h-4 w-4 text-gray-400" />
    }
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fullPath = parentPath ? `${parentPath}/${createPath}` : createPath
    onFileCreate(fullPath, createType)
    setIsCreateDialogOpen(false)
    setCreatePath("")
    setParentPath("")
  }

  function renderFileTree(nodes: ProjectFileTree[], level: number = 0) {
    return nodes.map((node) => (
      <div key={node.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center gap-2 px-2 py-1 hover:bg-accent cursor-pointer rounded-sm ${
                selectedFileId === node.id ? 'bg-accent' : ''
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => {
                if (node.type === 'directory') {
                  toggleDir(node.id)
                } else {
                  onFileSelect(node.id)
                }
              }}
            >
              {node.type === 'directory' && (
                <button
                  className="p-0.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDir(node.id)
                  }}
                >
                  {expandedDirs.has(node.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              {getFileIcon(node)}
              <span className="text-sm truncate">{node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {node.type === 'directory' && (
              <>
                <ContextMenuItem
                  onClick={() => {
                    setParentPath(node.path)
                    setCreateType('file')
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新規ファイル
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    setParentPath(node.path)
                    setCreateType('directory')
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新規フォルダ
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem
              onClick={() => onFileDelete(node.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {node.type === 'directory' && expandedDirs.has(node.id) && node.children && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <>
      <ScrollArea className="h-[540px] px-2 py-2">
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setParentPath("")
              setCreateType('file')
              setIsCreateDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規ファイル
          </Button>
        </div>
        
        {files.length > 0 ? (
          renderFileTree(files)
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            ファイルがありません
          </div>
        )}
      </ScrollArea>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>
                {createType === 'file' ? '新規ファイル' : '新規フォルダ'}
              </DialogTitle>
              <DialogDescription>
                {parentPath && `親フォルダ: ${parentPath}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {createType === 'file' ? 'ファイル名' : 'フォルダ名'}
                </Label>
                <Input
                  id="name"
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                  placeholder={createType === 'file' ? 'example.py' : 'src'}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">作成</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}