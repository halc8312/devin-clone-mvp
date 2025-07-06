"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown, Plus, Settings, Zap, Brain, Cpu, Eye, Wrench, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

interface ClaudeModel {
  id: number
  model_id: string
  display_name: string
  description?: string
  input_price: number
  output_price: number
  context_window: number
  supports_vision: boolean
  supports_tool_use: boolean
  supports_computer_use: boolean
  supports_extended_thinking: boolean
  is_active: boolean
  is_default: boolean
  is_deprecated: boolean
  release_date?: string
  model_family?: string
  model_tier?: string
  created_at: string
  updated_at?: string
}

interface ClaudeModelList {
  models: ClaudeModel[]
  total: number
  active_count: number
  default_model?: ClaudeModel
}

interface NewModelForm {
  model_id: string
  display_name: string
  description: string
  input_price: number
  output_price: number
  context_window: number
  supports_vision: boolean
  supports_tool_use: boolean
  supports_computer_use: boolean
  supports_extended_thinking: boolean
  model_family: string
  model_tier: string
  release_date: string
}

const defaultNewModel: NewModelForm = {
  model_id: "",
  display_name: "",
  description: "",
  input_price: 3.0,
  output_price: 15.0,
  context_window: 200000,
  supports_vision: false,
  supports_tool_use: true,
  supports_computer_use: false,
  supports_extended_thinking: false,
  model_family: "",
  model_tier: "",
  release_date: new Date().toISOString().split('T')[0].replace(/-/g, '')
}

interface ClaudeModelSelectorProps {
  onModelChange?: (modelId: string) => void
}

export function ClaudeModelSelector({ onModelChange }: ClaudeModelSelectorProps = {}) {
  const [open, setOpen] = useState(false)
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<ClaudeModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [newModel, setNewModel] = useState<NewModelForm>(defaultNewModel)
  const { toast } = useToast()

  // Fetch models from API
  const fetchModels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/claude-models/')
      if (!response.ok) throw new Error('Failed to fetch models')
      
      const data: ClaudeModelList = await response.json()
      setModels(data.models)
      const defaultModel = data.default_model || data.models[0] || null
      setSelectedModel(defaultModel)
      if (defaultModel) {
        onModelChange?.(defaultModel.model_id)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast({
        title: "Error",
        description: "Failed to load Claude models",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Initialize default models
  const initializeModels = async () => {
    try {
      const response = await fetch('/api/v1/claude-models/initialize-defaults', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to initialize models')
      
      const result = await response.json()
      toast({
        title: "Success",
        description: result.message,
      })
      fetchModels()
    } catch (error) {
      console.error('Error initializing models:', error)
      toast({
        title: "Error",
        description: "Failed to initialize default models",
        variant: "destructive",
      })
    }
  }

  // Set default model
  const setDefaultModel = async (modelId: string) => {
    try {
      const response = await fetch('/api/v1/claude-models/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: modelId }),
      })
      
      if (!response.ok) throw new Error('Failed to set default model')
      
      const result = await response.json()
      setSelectedModel(result.selected_model)
      onModelChange?.(result.selected_model.model_id)
      toast({
        title: "Success",
        description: result.message,
      })
      fetchModels()
    } catch (error) {
      console.error('Error setting default model:', error)
      toast({
        title: "Error",
        description: "Failed to set default model",
        variant: "destructive",
      })
    }
  }

  // Add new model
  const addNewModel = async () => {
    try {
      const response = await fetch('/api/v1/claude-models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newModel,
          is_active: true,
          is_default: false,
          is_deprecated: false,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add model')
      }
      
      const createdModel = await response.json()
      toast({
        title: "Success",
        description: `Added ${createdModel.display_name} successfully`,
      })
      
      setNewModel(defaultNewModel)
      setAddModelOpen(false)
      fetchModels()
    } catch (error) {
      console.error('Error adding model:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add model",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const getModelIcon = (model: ClaudeModel) => {
    if (model.model_tier?.toLowerCase().includes('opus')) return <Brain className="h-4 w-4" />
    if (model.model_tier?.toLowerCase().includes('sonnet')) return <Zap className="h-4 w-4" />
    if (model.model_tier?.toLowerCase().includes('haiku')) return <Cpu className="h-4 w-4" />
    return <Sparkles className="h-4 w-4" />
  }

  const getModelBadgeColor = (model: ClaudeModel) => {
    if (model.is_deprecated) return "secondary"
    if (model.model_family?.includes('4')) return "default"
    if (model.model_family?.includes('3.7')) return "outline"
    return "secondary"
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}/MTok`
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span className="text-sm text-gray-500">Loading models...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
          >
            {selectedModel ? (
              <div className="flex items-center space-x-2">
                {getModelIcon(selectedModel)}
                <span className="truncate">{selectedModel.display_name}</span>
                <Badge variant={getModelBadgeColor(selectedModel)} className="text-xs">
                  {selectedModel.model_family}
                </Badge>
              </div>
            ) : (
              "Select model..."
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">No models found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initializeModels}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Initialize Default Models
                  </Button>
                </div>
              </CommandEmpty>
              
              {/* Group by model family */}
              {Object.entries(
                models.reduce((acc, model) => {
                  const family = model.model_family || 'Other'
                  if (!acc[family]) acc[family] = []
                  acc[family].push(model)
                  return acc
                }, {} as Record<string, ClaudeModel[]>)
              ).map(([family, familyModels]) => (
                <CommandGroup key={family}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{family}</div>
                  {familyModels.map((model) => (
                    <CommandItem
                      key={model.model_id}
                      onClick={() => {
                        setDefaultModel(model.model_id)
                        setOpen(false)
                      }}
                      className="flex items-center justify-between p-3 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        {getModelIcon(model)}
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{model.display_name}</span>
                            {model.is_default && (
                              <Badge variant="default" className="text-xs">Default</Badge>
                            )}
                            {model.is_deprecated && (
                              <Badge variant="secondary" className="text-xs">Legacy</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatPrice(model.input_price)} in</span>
                            <span>•</span>
                            <span>{formatPrice(model.output_price)} out</span>
                            {model.supports_vision && <Eye className="h-3 w-3" />}
                            {model.supports_tool_use && <Wrench className="h-3 w-3" />}
                            {model.supports_extended_thinking && <Brain className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={`h-4 w-4 ${
                          selectedModel?.model_id === model.model_id
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              
              <CommandSeparator />
              <CommandGroup>
                <Dialog open={addModelOpen} onOpenChange={setAddModelOpen}>
                  <DialogTrigger asChild>
                    <CommandItem
                      onSelect={() => setAddModelOpen(true)}
                      className="flex items-center space-x-2 p-3"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Custom Model</span>
                    </CommandItem>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Custom Claude Model</DialogTitle>
                      <DialogDescription>
                        Add a new Claude model configuration. This is useful when Anthropic releases new models.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="model_id">Model ID *</Label>
                          <Input
                            id="model_id"
                            placeholder="claude-4-opus-20250601"
                            value={newModel.model_id}
                            onChange={(e) => setNewModel({...newModel, model_id: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="display_name">Display Name *</Label>
                          <Input
                            id="display_name"
                            placeholder="Claude 4 Opus"
                            value={newModel.display_name}
                            onChange={(e) => setNewModel({...newModel, display_name: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Latest and most powerful Claude model..."
                          value={newModel.description}
                          onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="input_price">Input Price ($/MTok) *</Label>
                          <Input
                            id="input_price"
                            type="number"
                            step="0.01"
                            value={newModel.input_price}
                            onChange={(e) => setNewModel({...newModel, input_price: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output_price">Output Price ($/MTok) *</Label>
                          <Input
                            id="output_price"
                            type="number"
                            step="0.01"
                            value={newModel.output_price}
                            onChange={(e) => setNewModel({...newModel, output_price: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="context_window">Context Window</Label>
                          <Input
                            id="context_window"
                            type="number"
                            value={newModel.context_window}
                            onChange={(e) => setNewModel({...newModel, context_window: parseInt(e.target.value) || 200000})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="model_family">Model Family</Label>
                          <Input
                            id="model_family"
                            placeholder="Claude 4"
                            value={newModel.model_family}
                            onChange={(e) => setNewModel({...newModel, model_family: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model_tier">Model Tier</Label>
                          <Input
                            id="model_tier"
                            placeholder="Opus"
                            value={newModel.model_tier}
                            onChange={(e) => setNewModel({...newModel, model_tier: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="release_date">Release Date</Label>
                          <Input
                            id="release_date"
                            placeholder="20250601"
                            value={newModel.release_date}
                            onChange={(e) => setNewModel({...newModel, release_date: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Capabilities</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="supports_vision"
                              checked={newModel.supports_vision}
                              onCheckedChange={(checked) => setNewModel({...newModel, supports_vision: checked})}
                            />
                            <Label htmlFor="supports_vision">Vision Support</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="supports_tool_use"
                              checked={newModel.supports_tool_use}
                              onCheckedChange={(checked) => setNewModel({...newModel, supports_tool_use: checked})}
                            />
                            <Label htmlFor="supports_tool_use">Tool Use</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="supports_computer_use"
                              checked={newModel.supports_computer_use}
                              onCheckedChange={(checked) => setNewModel({...newModel, supports_computer_use: checked})}
                            />
                            <Label htmlFor="supports_computer_use">Computer Use</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="supports_extended_thinking"
                              checked={newModel.supports_extended_thinking}
                              onCheckedChange={(checked) => setNewModel({...newModel, supports_extended_thinking: checked})}
                            />
                            <Label htmlFor="supports_extended_thinking">Extended Thinking</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddModelOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={addNewModel}
                        disabled={!newModel.model_id || !newModel.display_name}
                      >
                        Add Model
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedModel && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <span>{formatPrice(selectedModel.input_price)}</span>
          <span>•</span>
          <span>{(selectedModel.context_window / 1000).toFixed(0)}K ctx</span>
        </div>
      )}
    </div>
  )
}