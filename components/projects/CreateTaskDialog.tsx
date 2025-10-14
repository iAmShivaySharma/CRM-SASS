'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock, User, Tag, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/components/ui/tiptap-editor-improved'
import { TimeTracker } from './TimeTracker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetProjectsQuery,
  useGetColumnsQuery,
  useGetTagsQuery,
  type Task,
} from '@/lib/api/projectsApi'
import { useToggleTaskCompletionMutation } from '@/lib/api/tasksApi'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { TaskFileUploader } from '@/components/tasks/TaskFileUploader'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().min(1, 'Project is required'),
  status: z.string().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.union([z.number(), z.string()]).optional().transform(val => {
    if (val === undefined || val === '') return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? undefined : num
  }),
})

type CreateTaskFormData = z.infer<typeof createTaskSchema>

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  defaultStatus?: string
  task?: Task | null
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus,
  task,
}: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const [createTask] = useCreateTaskMutation()
  const [updateTask] = useUpdateTaskMutation()
  const [toggleTaskCompletion] = useToggleTaskCompletionMutation()

  // Get projects for dropdown when no specific project is provided
  const { data: projectsData } = useGetProjectsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
    },
    {
      skip: !currentWorkspace?.id || !!projectId,
    }
  )

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      projectId: projectId || task?.projectId || '',
      status: defaultStatus || task?.status || '',
      priority: task?.priority || 'medium',
      tags: task?.tags || [],
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task?.estimatedHours || undefined,
    },
  })

  // Reset form when task or dialog state changes
  React.useEffect(() => {
    if (open) {
      if (task) {
        // Editing existing task
        form.reset({
          title: task.title,
          description: task.description || '',
          projectId: task.projectId,
          status: task.status,
          priority: task.priority,
          tags: task.tags || [],
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: task.estimatedHours || undefined,
        })
        setDescription(task.description || '')
        setTags(task.tags || [])
        setAttachments(task.attachments || [])
        setIsCompleted(task.completed || false)
      } else {
        // Creating new task
        form.reset({
          title: '',
          description: '',
          projectId: projectId || '',
          status: defaultStatus || '',
          priority: 'medium',
          tags: [],
          dueDate: '',
          estimatedHours: undefined,
        })
        setDescription('')
        setTags([])
        setTagInput('')
        setAttachments([])
        setIsCompleted(false)
      }
    }
  }, [open, task, projectId, defaultStatus, form])

  // Get columns for the selected project to populate status options
  const selectedProjectId = projectId || form.watch('projectId')
  const { data: columnsData } = useGetColumnsQuery(
    { projectId: selectedProjectId },
    { skip: !selectedProjectId }
  )

  // Get tags for workspace
  const { data: tagsData } = useGetTagsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  // Set default status to first column when columns are loaded
  React.useEffect(() => {
    if (columnsData?.columns.length && !form.getValues('status')) {
      const firstColumn =
        columnsData.columns.find(col => col.isDefault) || columnsData.columns[0]
      form.setValue('status', firstColumn.slug)
    }
  }, [columnsData, form])

  const onSubmit = async (data: CreateTaskFormData) => {
    if (!currentWorkspace) return

    setIsLoading(true)
    try {
      const taskData = {
        ...data,
        description: description,
        projectId: data.projectId,
        workspaceId: currentWorkspace.id,
        tags,
        attachments,
        estimatedHours: data.estimatedHours,
      }

      if (task) {
        // Update existing task
        await updateTask({
          id: task.id,
          data: taskData,
        }).unwrap()

        // Handle completion status change if it's different
        if (task && task.completed !== isCompleted) {
          await toggleTaskCompletion({
            id: task.id,
            completed: isCompleted,
          }).unwrap()
        }

        toast.success('Task updated successfully')
      } else {
        // Create new task
        await createTask(taskData).unwrap()
        toast.success('Task created successfully')
      }

      onOpenChange(false)
      form.reset()
      setTags([])
      setTagInput('')
      setDescription('')
      setAttachments([])
      setIsCompleted(false)
    } catch (error) {
      console.error(task ? 'Failed to update task:' : 'Failed to create task:', error)
      toast.error(task ? 'Failed to update task' : 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Update task details and save your changes.'
              : 'Add a new task to your project. Fill in the details below.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!projectId && (
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsData?.projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div>
                <Label>Description (Optional)</Label>
                <TiptapEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Describe the task..."
                  className="min-h-[80px]"
                  minHeight="80px"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {columnsData?.columns.map(column => (
                            <SelectItem key={column.id} value={column.slug}>
                              {column.name}
                            </SelectItem>
                          ))}
                          {!columnsData?.columns.length && (
                            <SelectItem value="todo" disabled>
                              No columns available - create columns first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="e.g. 2.5"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* File Attachments */}
              <div>
                <Label className="mb-3 block">Attachments (Optional)</Label>
                <TaskFileUploader
                  onFilesChange={setAttachments}
                  existingFiles={attachments}
                  maxFiles={5}
                  disabled={isLoading}
                />
              </div>

              {/* Task Completion - Only show for existing tasks */}
              {task && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Task Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark this task as completed
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isCompleted}
                      onCheckedChange={setIsCompleted}
                      disabled={isLoading}
                      id="task-completion"
                    />
                    <Label
                      htmlFor="task-completion"
                      className={`flex items-center space-x-1 text-sm font-medium ${
                        isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>{isCompleted ? 'Completed' : 'Not completed'}</span>
                    </Label>
                  </div>
                </div>
              )}

              {/* Time Tracking - Only show for existing tasks */}
              {task && (
                <div className="rounded-lg border p-4">
                  <Label className="mb-3 block">Time Tracking</Label>
                  <TimeTracker task={task} variant="full" />
                </div>
              )}

              {/* Tags */}
              <div>
                <Label>Tags (Optional)</Label>

                {/* Selected Tags */}
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map((tag, index) => {
                    const workspaceTag = tagsData?.tags.find(t => t.name === tag)
                    return (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        style={workspaceTag ? {
                          backgroundColor: workspaceTag.color,
                          borderColor: workspaceTag.color,
                          color: 'white'
                        } : {}}
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    )
                  })}
                </div>

                {/* Available Workspace Tags */}
                {tagsData?.tags && tagsData.tags.length > 0 && (
                  <div className="mb-3">
                    <Label className="text-sm text-muted-foreground">Available Tags:</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {tagsData.tags
                        .filter(workspaceTag => !tags.includes(workspaceTag.name))
                        .map((workspaceTag) => (
                          <Badge
                            key={workspaceTag.id}
                            variant="outline"
                            className="cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: workspaceTag.color,
                              borderColor: workspaceTag.color,
                              color: 'white'
                            }}
                            onClick={() => {
                              if (!tags.includes(workspaceTag.name)) {
                                setTags([...tags, workspaceTag.name])
                              }
                            }}
                          >
                            + {workspaceTag.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Tag */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? (task ? 'Updating...' : 'Creating...')
                  : (task ? 'Update Task' : 'Create Task')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
