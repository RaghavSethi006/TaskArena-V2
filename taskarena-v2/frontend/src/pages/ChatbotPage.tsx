import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import MessageBubble from "@/components/shared/MessageBubble"
import ProviderBadge from "@/components/shared/ProviderBadge"
import EmptyState from "@/components/shared/EmptyState"
import { api, getBaseApiUrl } from "@/api/client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useChatGroups,
  useConversations,
  useCreateChatGroup,
  useCreateConversation,
  useDeleteChatGroup,
  useDeleteConversation,
  useMessages,
  useUpdateChatGroup,
  useUpdateContext,
  useUpdateConversation,
} from "@/hooks/useChat"
import type { ChatGroup, Conversation, Course, File, Folder, Message } from "@/types"
import { toast } from "sonner"

interface LocalMessage extends Omit<Message, "id"> {
  id: number
}

type Provider = "groq" | "local" | "ollama"
type ContextMode = "none" | "course" | "folder" | "file"
type GroupDialogMode = "create" | "rename" | null
type GroupSelection = number | "ungrouped" | null

const DEFAULT_CONVERSATION_TITLE = "New Conversation"
const SIDEBAR_PREVIEW_LIMIT = 5

function getConversationLabel(conversation: Pick<Conversation, "title" | "id"> | null | undefined) {
  const title = conversation?.title?.trim()
  if (!title || title.toLowerCase() === DEFAULT_CONVERSATION_TITLE.toLowerCase()) {
    return conversation ? "New conversation" : "AI Tutor"
  }
  return title
}

export default function ChatbotPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const urlConversationId = params.id ? Number(params.id) : null

  const [activeConvId, setActiveConvId] = useState<number | null>(urlConversationId)
  const [selectedGroupKey, setSelectedGroupKey] = useState<GroupSelection>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [ungroupedExpanded, setUngroupedExpanded] = useState(true)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [provider, setProvider] = useState<Provider>("groq")
  const [model, setModel] = useState("llama-3.3-70b-versatile")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(false)
  const [contextMode, setContextMode] = useState<ContextMode>("none")
  const [courseId, setCourseId] = useState("")
  const [folderId, setFolderId] = useState("")
  const [fileId, setFileId] = useState("")
  const [renameConversationOpen, setRenameConversationOpen] = useState(false)
  const [renameConversationId, setRenameConversationId] = useState<number | null>(null)
  const [renameConversationValue, setRenameConversationValue] = useState("")
  const [groupDialogMode, setGroupDialogMode] = useState<GroupDialogMode>(null)
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [groupNameDraft, setGroupNameDraft] = useState("")
  const streamingContentRef = useRef("")

  const conversationsQuery = useConversations()
  const groupsQuery = useChatGroups()
  const messagesQuery = useMessages(activeConvId)
  const createConversation = useCreateConversation()
  const updateConversation = useUpdateConversation()
  const deleteConversation = useDeleteConversation()
  const updateContext = useUpdateContext()
  const createChatGroup = useCreateChatGroup()
  const updateChatGroup = useUpdateChatGroup()
  const deleteChatGroup = useDeleteChatGroup()

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<Course[]>("/notes/courses"),
  })
  const foldersQuery = useQuery({
    queryKey: ["folders", courseId],
    queryFn: () => api.get<Folder[]>(`/notes/courses/${courseId}/folders`),
    enabled: !!courseId,
  })
  const filesQuery = useQuery({
    queryKey: ["files", folderId],
    queryFn: () => api.get<File[]>(`/notes/folders/${folderId}/files`),
    enabled: !!folderId,
  })

  const conversations = conversationsQuery.data ?? []
  const groups = groupsQuery.data ?? []

  useEffect(() => {
    if (urlConversationId) {
      setActiveConvId(urlConversationId)
    }
  }, [urlConversationId])

  useEffect(() => {
    if (!messagesQuery.data) return
    setMessages(messagesQuery.data.map((item) => ({ ...item, id: Number(item.id) })))
  }, [messagesQuery.data])

  useEffect(() => {
    streamingContentRef.current = streamingContent
  }, [streamingContent])

  useEffect(() => {
    if (groups.length === 0) return
    setExpandedGroups((current) => {
      const next = { ...current }
      for (const group of groups) {
        if (!(group.id in next)) {
          next[group.id] = true
        }
      }
      return next
    })
  }, [groups])

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConvId) ?? null,
    [activeConvId, conversations]
  )

  useEffect(() => {
    if (!activeConversation) return
    setSelectedGroupKey(activeConversation.group_id ?? "ungrouped")
  }, [activeConversation])

  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  const groupedConversations = useMemo(() => {
    const grouped = new Map<number, Conversation[]>()
    const ungrouped: Conversation[] = []

    for (const conversation of conversations) {
      if (conversation.group_id == null) {
        ungrouped.push(conversation)
        continue
      }

      const items = grouped.get(conversation.group_id) ?? []
      items.push(conversation)
      grouped.set(conversation.group_id, items)
    }

    return { grouped, ungrouped }
  }, [conversations])

  const activeGroup = activeConversation?.group_id ? groupsById.get(activeConversation.group_id) ?? null : null
  const selectedGroup = typeof selectedGroupKey === "number" ? groupsById.get(selectedGroupKey) ?? null : null

  const folderViewConversations = useMemo(() => {
    if (selectedGroupKey === "ungrouped") {
      return groupedConversations.ungrouped
    }
    if (typeof selectedGroupKey === "number") {
      return groupedConversations.grouped.get(selectedGroupKey) ?? []
    }
    return []
  }, [groupedConversations, selectedGroupKey])

  const folderViewTitle =
    selectedGroupKey === "ungrouped" ? "Ungrouped chats" : selectedGroup?.name ?? "Folder"

  useEffect(() => {
    if (selectedGroupKey == null || selectedGroupKey === "ungrouped") return
    if (groupsById.has(selectedGroupKey)) return
    setSelectedGroupKey(groupedConversations.ungrouped.length > 0 ? "ungrouped" : null)
  }, [groupedConversations.ungrouped.length, groupsById, selectedGroupKey])

  useEffect(() => {
    if (!contextOpen || !activeConversation) return

    if (activeConversation.context_file_id) {
      setContextMode("file")
      setFileId(String(activeConversation.context_file_id))
      setCourseId(activeConversation.context_course_id ? String(activeConversation.context_course_id) : "")
      setFolderId(activeConversation.context_folder_id ? String(activeConversation.context_folder_id) : "")
    } else if (activeConversation.context_folder_id) {
      setContextMode("folder")
      setFolderId(String(activeConversation.context_folder_id))
      setCourseId(activeConversation.context_course_id ? String(activeConversation.context_course_id) : "")
      setFileId("")
    } else if (activeConversation.context_course_id) {
      setContextMode("course")
      setCourseId(String(activeConversation.context_course_id))
      setFolderId("")
      setFileId("")
    } else {
      setContextMode("none")
      setCourseId("")
      setFolderId("")
      setFileId("")
    }
  }, [contextOpen, activeConversation])

  const selectConversation = (conversation: Conversation) => {
    setActiveConvId(conversation.id)
    setSelectedGroupKey(conversation.group_id ?? "ungrouped")
    navigate(`/chat/${conversation.id}`)
  }

  const openFolderView = (groupKey: GroupSelection) => {
    setSelectedGroupKey(groupKey)
    setActiveConvId(null)
    setMessages([])
    navigate("/chat")
  }

  const toggleGroupExpanded = (groupId: number) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }))
  }

  const defaultNewChatGroupId = selectedGroupKey !== null && selectedGroupKey !== "ungrouped" ? selectedGroupKey : null

  const createNewConversation = async (groupId: number | null = defaultNewChatGroupId) => {
    try {
      const conv = await createConversation.mutateAsync({ group_id: groupId })
      setSelectedGroupKey(groupId ?? "ungrouped")
      setActiveConvId(conv.id)
      navigate(`/chat/${conv.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create conversation"
      toast.error(message)
    }
  }

  const handleDeleteConversation = async (id: number) => {
    try {
      await deleteConversation.mutateAsync(id)
      if (activeConvId === id) {
        setActiveConvId(null)
        setMessages([])
        navigate("/chat")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete conversation"
      toast.error(message)
    }
  }

  const openConversationRename = (conversation: Conversation) => {
    setRenameConversationId(conversation.id)
    setRenameConversationValue(getConversationLabel(conversation))
    setRenameConversationOpen(true)
  }

  const handleRenameConversation = async () => {
    if (renameConversationId == null) return

    const conversation = conversations.find((item) => item.id === renameConversationId)
    const nextTitle = renameConversationValue.trim()

    if (!conversation) {
      toast.error("Conversation not found")
      return
    }
    if (!nextTitle) {
      toast.error("Chat name cannot be empty")
      return
    }

    try {
      await updateConversation.mutateAsync({
        id: conversation.id,
        title: nextTitle,
        group_id: conversation.group_id,
      })
      setRenameConversationOpen(false)
      toast.success("Chat renamed")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename conversation"
      toast.error(message)
    }
  }

  const moveConversationToGroup = async (conversation: Conversation, groupId: number | null) => {
    try {
      await updateConversation.mutateAsync({
        id: conversation.id,
        title: conversation.title,
        group_id: groupId,
      })
      if (activeConvId === conversation.id) {
        setSelectedGroupKey(groupId ?? "ungrouped")
      }
      toast.success(groupId == null ? "Chat moved to ungrouped" : "Chat moved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move conversation"
      toast.error(message)
    }
  }

  const openCreateGroup = () => {
    setGroupDialogMode("create")
    setEditingGroupId(null)
    setGroupNameDraft("")
  }

  const openRenameGroup = (group: ChatGroup) => {
    setGroupDialogMode("rename")
    setEditingGroupId(group.id)
    setGroupNameDraft(group.name)
  }

  const handleSaveGroup = async () => {
    const nextName = groupNameDraft.trim()
    if (!nextName) {
      toast.error("Group name cannot be empty")
      return
    }

    try {
      if (groupDialogMode === "create") {
        const created = await createChatGroup.mutateAsync({ name: nextName })
        setExpandedGroups((current) => ({ ...current, [created.id]: true }))
        setSelectedGroupKey(created.id)
        toast.success("Group created")
      } else if (groupDialogMode === "rename" && editingGroupId != null) {
        await updateChatGroup.mutateAsync({ id: editingGroupId, name: nextName })
        toast.success("Group renamed")
      }
      setGroupDialogMode(null)
      setEditingGroupId(null)
      setGroupNameDraft("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save group"
      toast.error(message)
    }
  }

  const handleDeleteGroup = async (group: ChatGroup) => {
    const shouldDelete = window.confirm(
      `Delete "${group.name}"? Chats inside it will stay in your history and move to Ungrouped.`
    )
    if (!shouldDelete) return

    try {
      await deleteChatGroup.mutateAsync(group.id)
      if (selectedGroupKey === group.id) {
        setSelectedGroupKey(groupedConversations.ungrouped.length > 0 ? "ungrouped" : null)
      }
      toast.success("Group deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete group"
      toast.error(message)
    }
  }

  const applyContext = async () => {
    if (!activeConvId) return

    if (contextMode !== "none" && !courseId) {
      toast.error("Please select a course")
      return
    }
    if ((contextMode === "folder" || contextMode === "file") && !folderId) {
      toast.error("Please select a folder")
      return
    }
    if (contextMode === "file" && !fileId) {
      toast.error("Please select a file")
      return
    }

    try {
      await updateContext.mutateAsync({
        id: activeConvId,
        context_course_id: contextMode !== "none" ? Number(courseId) : null,
        context_folder_id: contextMode === "folder" || contextMode === "file" ? Number(folderId) : null,
        context_file_id: contextMode === "file" ? Number(fileId) : null,
      })
      setContextOpen(false)
      toast.success("Context updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update context"
      toast.error(message)
    }
  }

  const sendMessage = async (content: string) => {
    if (!activeConvId || !content.trim() || isStreaming) return

    const userMessage: LocalMessage = {
      id: Date.now(),
      conversation_id: activeConvId,
      role: "user",
      content,
      sources: [],
      model_used: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingContent("")

    try {
      const baseApiUrl = await getBaseApiUrl()
      const response = await fetch(`${baseApiUrl}/chat/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, provider, model }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = JSON.parse(line.slice(6)) as {
            token?: string
            done?: boolean
            message_id?: number
            sources?: string[]
            error?: string
          }

          if (payload.token) {
            setStreamingContent((prev) => prev + payload.token)
          }
          if (payload.done) {
            const assistantMessage: LocalMessage = {
              id: payload.message_id ?? Date.now() + 1,
              conversation_id: activeConvId,
              role: "assistant",
              content: streamingContentRef.current,
              sources: payload.sources ?? [],
              model_used: model,
              created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            setStreamingContent("")
            setIsStreaming(false)
            void messagesQuery.refetch()
            void conversationsQuery.refetch()
          }
          if (payload.error) {
            setIsStreaming(false)
            void conversationsQuery.refetch()
            toast.error(`AI error: ${payload.error}`)
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message"
      toast.error(message)
      setIsStreaming(false)
      void conversationsQuery.refetch()
    }
  }

  const renderConversationActions = (conversation: Conversation) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="h-7 w-7 rounded-[6px] text-tx3 hover:bg-s3 hover:text-tx2" title="Chat actions">
          <MoreHorizontal className="mx-auto h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => openConversationRename(conversation)}>
          <Pencil className="h-3.5 w-3.5" />
          Rename chat
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to group</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem disabled={conversation.group_id == null} onSelect={() => void moveConversationToGroup(conversation, null)}>
              Ungrouped
            </DropdownMenuItem>
            {groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                disabled={conversation.group_id === group.id}
                onSelect={() => void moveConversationToGroup(conversation, group.id)}
              >
                {group.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleDeleteConversation(conversation.id)} className="text-rose-400 focus:text-rose-200">
          <Trash2 className="h-3.5 w-3.5" />
          Delete chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderSidebarConversationPreview = (conversation: Conversation) => {
    const isActive = activeConvId === conversation.id
    return (
      <div
        key={conversation.id}
        className={`group flex items-center gap-1 rounded-[8px] border transition-colors duration-[120ms] ${
          isActive
            ? "border-blue-500/30 bg-[var(--bd)] text-blue-200"
            : "border-transparent bg-transparent text-tx2 hover:bg-s2 hover:border-b1"
        }`}
      >
        <button
          type="button"
          onClick={() => selectConversation(conversation)}
          className="min-w-0 flex-1 px-2 py-2 text-left"
        >
          <div className="truncate text-[12px]">{getConversationLabel(conversation)}</div>
          <div className="truncate text-[10px] text-tx3">
            {conversation.message_count === 0 ? "No messages yet" : `${conversation.message_count} messages`}
          </div>
        </button>
        <div className="mr-1">{renderConversationActions(conversation)}</div>
      </div>
    )
  }

  const renderFolderChatRow = (conversation: Conversation) => {
    const isActive = activeConvId === conversation.id
    return (
      <div
        key={conversation.id}
        className={`group flex items-center gap-3 rounded-[10px] border px-3 py-3 transition-colors ${
          isActive
            ? "border-blue-500/30 bg-[var(--bd)]"
            : "border-b1 bg-s1 hover:bg-s2/60"
        }`}
      >
        <button type="button" onClick={() => selectConversation(conversation)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-medium text-tx">{getConversationLabel(conversation)}</div>
          <div className="mt-1 text-[11px] text-tx3">
            {conversation.message_count === 0 ? "No messages yet" : `${conversation.message_count} messages in this chat`}
          </div>
        </button>
        {renderConversationActions(conversation)}
      </div>
    )
  }

  const renderGroupSection = (group: ChatGroup | null, groupKey: GroupSelection, items: Conversation[]) => {
    const isUngrouped = groupKey === "ungrouped"
    const isExpanded = isUngrouped ? ungroupedExpanded : expandedGroups[group?.id ?? -1]
    const previewItems = items.slice(0, SIDEBAR_PREVIEW_LIMIT)
    const remainingCount = Math.max(0, items.length - previewItems.length)
    const isSelectedFolder = activeConvId === null && selectedGroupKey === groupKey
    const name = isUngrouped ? "Ungrouped" : group?.name ?? "Folder"

    return (
      <section key={isUngrouped ? "ungrouped" : group?.id} className="space-y-1.5">
        <div
          className={`flex items-center justify-between gap-2 rounded-[8px] border px-1.5 py-1 transition-colors ${
            isSelectedFolder ? "border-blue-500/30 bg-[var(--bd)]" : "border-transparent"
          }`}
        >
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (isUngrouped) {
                  setUngroupedExpanded((value) => !value)
                } else if (group) {
                  toggleGroupExpanded(group.id)
                }
              }}
              className="h-7 w-7 rounded-[6px] text-tx3 hover:bg-s3 hover:text-tx2"
              title={isExpanded ? "Collapse folder" : "Expand folder"}
            >
              {isExpanded ? <ChevronDown className="mx-auto h-3.5 w-3.5" /> : <ChevronRight className="mx-auto h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => openFolderView(groupKey)} className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-tx3" />
                <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-tx3">{name}</span>
              </div>
              <div className="text-[10px] text-tx3">{items.length === 0 ? "Empty folder" : `${items.length} chats`}</div>
            </button>
          </div>

          {!isUngrouped && group ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="h-7 w-7 rounded-[6px] text-tx3 hover:bg-s3 hover:text-tx2" title="Folder actions">
                  <MoreHorizontal className="mx-auto h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => void createNewConversation(group.id)}>
                  <Plus className="h-3.5 w-3.5" />
                  New chat here
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openRenameGroup(group)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Rename folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleDeleteGroup(group)} className="text-rose-400 focus:text-rose-200">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {isExpanded ? (
          <div className="space-y-1 pl-2">
            {previewItems.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-b1 px-3 py-2 text-[11px] text-tx3">
                {isUngrouped ? "New chats without a folder will appear here." : "Start a chat in this folder to see it here."}
              </div>
            ) : (
              previewItems.map(renderSidebarConversationPreview)
            )}
            {remainingCount > 0 ? (
              <button
                type="button"
                onClick={() => openFolderView(groupKey)}
                className="w-full rounded-[8px] border border-dashed border-b1 px-3 py-2 text-left text-[11px] text-tx3 hover:bg-s2"
              >
                Open folder to view {remainingCount} older {remainingCount === 1 ? "chat" : "chats"}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    )
  }

  const renderFolderView = () => {
    if (selectedGroupKey == null) {
      return (
        <EmptyState
          title="No folder selected"
          description="Open a folder in the sidebar or start a new chat."
          actionLabel="Start new chat"
          onAction={() => void createNewConversation(null)}
        />
      )
    }

    const createInGroup = selectedGroupKey === "ungrouped" ? null : selectedGroupKey

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-[12px] border border-b1 bg-s1 p-4">
          <div>
            <div className="flex items-center gap-2 text-tx">
              <FolderOpen className="h-4 w-4 text-tx3" />
              <h3 className="text-[15px] font-semibold">{folderViewTitle}</h3>
            </div>
            <p className="mt-1 text-[12px] text-tx3">
              {folderViewConversations.length === 0
                ? "No chats in this folder yet."
                : `${folderViewConversations.length} chats in this folder.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedGroup ? (
              <button
                type="button"
                onClick={() => openRenameGroup(selectedGroup)}
                className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
              >
                Rename folder
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void createNewConversation(createInGroup)}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </button>
          </div>
        </div>

        {folderViewConversations.length === 0 ? (
          <EmptyState
            title="No chats here yet"
            description="Start a new chat in this folder and it will appear here."
            actionLabel="Create chat"
            onAction={() => void createNewConversation(createInGroup)}
          />
        ) : (
          <div className="space-y-2">{folderViewConversations.map(renderFolderChatRow)}</div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fadeUp h-full">
      <div
        className="h-full rounded-[10px] border border-b1 bg-s1 overflow-hidden grid transition-all duration-200"
        style={{ gridTemplateColumns: sidebarOpen ? "300px 1fr" : "0px 1fr" }}
      >
        <aside
          className={`border-r border-b1 bg-s2/40 flex flex-col overflow-hidden transition-all duration-200 ${
            sidebarOpen ? "p-3" : "p-0 border-r-0"
          }`}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void createNewConversation()}
              className="h-8 flex-1 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors duration-[120ms] inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
            <button
              type="button"
              onClick={openCreateGroup}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3 transition-colors duration-[120ms] inline-flex items-center justify-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Folder
            </button>
          </div>

          <div className="mt-3 space-y-3 overflow-y-auto flex-1 pr-1">
            {groups.map((group) => renderGroupSection(group, group.id, groupedConversations.grouped.get(group.id) ?? []))}
            {renderGroupSection(null, "ungrouped", groupedConversations.ungrouped)}
          </div>
        </aside>

        <section className="flex flex-col min-h-0">
          <div className="h-[50px] border-b border-b1 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                className="w-7 h-7 rounded-[6px] border border-b1 bg-s2 text-tx3 hover:bg-s3 flex items-center justify-center flex-shrink-0 transition-colors"
                title={sidebarOpen ? "Hide conversations" : "Show conversations"}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <div className="min-w-0">
                {activeConversation ? (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-[13px] font-semibold truncate">{getConversationLabel(activeConversation)}</h2>
                      <button
                        type="button"
                        onClick={() => openConversationRename(activeConversation)}
                        className="h-6 w-6 rounded-[5px] border border-b1 bg-s2 text-tx3 hover:bg-s3 hover:text-tx2 flex items-center justify-center"
                        title="Rename chat"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    {activeGroup ? <div className="truncate text-[10px] text-tx3">{activeGroup.name}</div> : null}
                  </>
                ) : selectedGroupKey != null ? (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="h-3.5 w-3.5 text-tx3" />
                      <h2 className="text-[13px] font-semibold truncate">{folderViewTitle}</h2>
                    </div>
                    <div className="truncate text-[10px] text-tx3">
                      {folderViewConversations.length === 0
                        ? "No chats in this folder"
                        : `${folderViewConversations.length} chats available`}
                    </div>
                  </>
                ) : (
                  <h2 className="text-[13px] font-semibold truncate">AI Tutor</h2>
                )}
              </div>
              {activeConversation ? (
                <button
                  type="button"
                  onClick={() => setContextOpen(true)}
                  className={`h-6 px-2 rounded-[5px] border text-[10px] font-mono flex items-center gap-1 flex-shrink-0 transition-colors ${
                    activeConversation.context_course_id
                      ? "border-blue-500/30 bg-[var(--bd)] text-blue-300"
                      : "border-b1 bg-s2 text-tx3 hover:bg-s3"
                  }`}
                >
                  {activeConversation.context_file_id
                    ? "File context"
                    : activeConversation.context_folder_id
                      ? "Folder context"
                      : activeConversation.context_course_id
                        ? "Course context"
                        : "No context"}
                </button>
              ) : null}
            </div>
            {activeConversation ? (
              <div className="flex items-center gap-2">
                <select
                  value={provider}
                  onChange={(e) => {
                    const next = e.target.value as Provider
                    setProvider(next)
                    setModel(next === "groq" ? "llama-3.3-70b-versatile" : next === "local" ? "qwen2.5-7b" : "qwen2.5:7b")
                  }}
                  className="h-7 rounded-[7px] border border-b1 bg-s2 px-2 text-[11px] text-tx"
                >
                  <option value="groq">Groq</option>
                  <option value="local">Local</option>
                  <option value="ollama">Ollama</option>
                </select>
                <ProviderBadge provider={provider} model={model} />
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-bg">
            {!activeConvId ? (
              renderFolderView()
            ) : messages.length === 0 && !isStreaming ? (
              <EmptyState title="Start the conversation" description="Ask your first question. The chat name will update automatically from it." />
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <MessageBubble key={message.id} role={message.role} content={message.content} sources={message.sources} />
                ))}
                {isStreaming && streamingContent === "" ? (
                  <div className="flex items-center gap-1.5 px-4 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot2" />
                    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot3" />
                  </div>
                ) : null}
                {isStreaming && streamingContent !== "" ? <MessageBubble role="assistant" content={streamingContent} isStreaming /> : null}
              </div>
            )}
          </div>

          {activeConversation && (activeConversation.context_course_id || activeConversation.context_folder_id || activeConversation.context_file_id) ? (
            <div className="px-3 py-1.5 border-b border-b1 bg-s2/30 text-[10px] text-blue-300 font-mono">
              RAG active - searching your notes for context
            </div>
          ) : null}

          {activeConversation ? (
            <div className="border-t border-b1 p-3 flex items-end gap-2 bg-s1">
              <button
                type="button"
                onClick={() => toast("File upload coming in v2.1")}
                className="w-8 h-8 rounded-[7px] border border-b1 bg-s2 text-tx3 hover:bg-s3"
              >
                <Paperclip className="w-4 h-4 mx-auto" />
              </button>
              <Textarea
                value={draft}
                disabled={isStreaming}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    const text = draft.trim()
                    if (!text) return
                    setDraft("")
                    void sendMessage(text)
                  }
                }}
                placeholder="Ask anything..."
                className="min-h-[40px] max-h-[120px] resize-none bg-s2 border-b1 text-[12.5px]"
              />
              <button
                type="button"
                onClick={() => {
                  const text = draft.trim()
                  if (!text) return
                  setDraft("")
                  void sendMessage(text)
                }}
                disabled={isStreaming || !draft.trim()}
                className="w-8 h-8 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
              >
                <Send className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <Dialog open={renameConversationOpen} onOpenChange={setRenameConversationOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={renameConversationValue}
            onChange={(e) => setRenameConversationValue(e.target.value)}
            placeholder="Enter a chat name"
            className="bg-s2 border-b1 text-[12px] text-tx"
          />
          <DialogFooter>
            <button type="button" onClick={() => setRenameConversationOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">
              Cancel
            </button>
            <button type="button" onClick={() => void handleRenameConversation()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialogMode !== null} onOpenChange={(open) => !open && setGroupDialogMode(null)}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>{groupDialogMode === "create" ? "Create folder" : "Rename folder"}</DialogTitle>
          </DialogHeader>
          <Input value={groupNameDraft} onChange={(e) => setGroupNameDraft(e.target.value)} placeholder="Enter a folder name" className="bg-s2 border-b1 text-[12px] text-tx" />
          <DialogFooter>
            <button type="button" onClick={() => setGroupDialogMode(null)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">
              Cancel
            </button>
            <button type="button" onClick={() => void handleSaveGroup()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600">
              {groupDialogMode === "create" ? "Create" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contextOpen} onOpenChange={setContextOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Conversation Context</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-[12px] text-tx2">
            <label className="flex items-center gap-2"><input type="radio" checked={contextMode === "none"} onChange={() => setContextMode("none")} />No context</label>
            <label className="flex items-center gap-2"><input type="radio" checked={contextMode === "course"} onChange={() => setContextMode("course")} />Whole course</label>
            <label className="flex items-center gap-2"><input type="radio" checked={contextMode === "folder"} onChange={() => setContextMode("folder")} />Specific folder</label>
            <label className="flex items-center gap-2"><input type="radio" checked={contextMode === "file"} onChange={() => setContextMode("file")} />Specific file</label>
          </div>

          {contextMode !== "none" ? (
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
              <option value="">Select course</option>
              {(coursesQuery.data ?? []).map((course) => (
                <option key={course.id} value={String(course.id)}>{course.name}</option>
              ))}
            </select>
          ) : null}
          {contextMode === "folder" || contextMode === "file" ? (
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
              <option value="">Select folder</option>
              {(foldersQuery.data ?? []).map((folder) => (
                <option key={folder.id} value={String(folder.id)}>{folder.name}</option>
              ))}
            </select>
          ) : null}
          {contextMode === "file" ? (
            <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
              <option value="">Select file</option>
              {(filesQuery.data ?? []).map((file) => (
                <option key={file.id} value={String(file.id)}>{file.name}</option>
              ))}
            </select>
          ) : null}

          <DialogFooter>
            <button type="button" onClick={() => setContextOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">
              Cancel
            </button>
            <button type="button" onClick={() => void applyContext()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600">
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
