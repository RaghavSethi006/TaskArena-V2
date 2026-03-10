import { PanelLeft, Paperclip, Plus, Send, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import MessageBubble from "@/components/shared/MessageBubble"
import ProviderBadge from "@/components/shared/ProviderBadge"
import EmptyState from "@/components/shared/EmptyState"
import { api, getBaseApiUrl } from "@/api/client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useConversations, useCreateConversation, useDeleteConversation, useMessages, useUpdateContext } from "@/hooks/useChat"
import type { Message, Course, Folder, File } from "@/types"
import { toast } from "sonner"

interface LocalMessage extends Omit<Message, "id"> {
  id: number
}

type Provider = "groq" | "local" | "ollama"
type ContextMode = "none" | "course" | "folder" | "file"

export default function ChatbotPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const urlConversationId = params.id ? Number(params.id) : null

  const [activeConvId, setActiveConvId] = useState<number | null>(urlConversationId)
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
  const streamingContentRef = useRef("")

  const conversationsQuery = useConversations()
  const messagesQuery = useMessages(activeConvId)
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()
  const updateContext = useUpdateContext()

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

  useEffect(() => {
    if (urlConversationId) setActiveConvId(urlConversationId)
  }, [urlConversationId])

  useEffect(() => {
    if (!messagesQuery.data) return
    setMessages(messagesQuery.data.map((item) => ({ ...item, id: Number(item.id) })))
  }, [messagesQuery.data])

  useEffect(() => {
    streamingContentRef.current = streamingContent
  }, [streamingContent])

  const activeConversation = useMemo(
    () => (conversationsQuery.data ?? []).find((conv) => conv.id === activeConvId) ?? null,
    [activeConvId, conversationsQuery.data]
  )

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

  const createNewConversation = async () => {
    try {
      const conv = await createConversation.mutateAsync()
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
          const payload = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; message_id?: number; sources?: string[]; error?: string }

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
          }
          if (payload.error) {
            setIsStreaming(false)
            toast.error(`AI error: ${payload.error}`)
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message"
      toast.error(message)
      setIsStreaming(false)
    }
  }

  return (
    <div className="animate-fadeUp h-full">
      <div
        className="h-full rounded-[10px] border border-b1 bg-s1 overflow-hidden grid transition-all duration-200"
        style={{ gridTemplateColumns: sidebarOpen ? "230px 1fr" : "0px 1fr" }}
      >
        <aside
          className={`border-r border-b1 bg-s2/40 flex flex-col overflow-hidden transition-all duration-200 ${
            sidebarOpen ? "p-3" : "p-0 border-r-0"
          }`}
        >
          <button
            type="button"
            onClick={() => void createNewConversation()}
            className="h-8 w-full rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors duration-[120ms] inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          <div className="mt-3 space-y-1 overflow-y-auto flex-1">
            {(conversationsQuery.data ?? []).map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  setActiveConvId(conv.id)
                  navigate(`/chat/${conv.id}`)
                }}
                className={`w-full text-left rounded-[7px] border px-2 py-2 text-[12px] transition-colors duration-[120ms] ${
                  activeConvId === conv.id
                    ? "border-blue-500/30 bg-[var(--bd)] text-blue-200"
                    : "border-transparent bg-transparent text-tx2 hover:bg-s2 hover:border-b1"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{conv.title ?? `Conversation ${conv.id}`}</span>
                  <span
                    className="text-tx3 hover:text-rose-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDeleteConversation(conv.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
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
              <h2 className="text-[13px] font-semibold truncate">{activeConversation?.title ?? "AI Tutor"}</h2>
              <button
                type="button"
                onClick={() => setContextOpen(true)}
                className={`h-6 px-2 rounded-[5px] border text-[10px] font-mono flex items-center gap-1 flex-shrink-0 transition-colors ${
                  activeConversation?.context_course_id
                    ? "border-blue-500/30 bg-[var(--bd)] text-blue-300"
                    : "border-b1 bg-s2 text-tx3 hover:bg-s3"
                }`}
              >
                {activeConversation?.context_file_id
                  ? "📄 File context"
                  : activeConversation?.context_folder_id
                    ? "📁 Folder context"
                    : activeConversation?.context_course_id
                      ? "📚 Course context"
                      : "⚪ No context"}
              </button>
            </div>
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
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
            {!activeConvId ? (
              <EmptyState title="No conversation selected" description="Create a new conversation to start chatting." />
            ) : messages.length === 0 && !isStreaming ? (
              <EmptyState title="Start the conversation" description="Ask your first question." />
            ) : (
              <>
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
                {isStreaming && streamingContent !== "" ? (
                  <MessageBubble role="assistant" content={streamingContent} isStreaming />
                ) : null}
              </>
            )}
          </div>

          {(activeConversation?.context_course_id ||
            activeConversation?.context_folder_id ||
            activeConversation?.context_file_id) ? (
            <div className="px-3 py-1.5 border-b border-b1 bg-s2/30 text-[10px] text-blue-300 font-mono">
              RAG active - searching your notes for context
            </div>
          ) : null}

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
              disabled={!activeConvId || isStreaming}
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
              disabled={!activeConvId || isStreaming || !draft.trim()}
              className="w-8 h-8 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              <Send className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </section>
      </div>

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
