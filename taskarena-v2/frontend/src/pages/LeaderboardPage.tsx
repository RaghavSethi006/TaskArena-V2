import {
  Copy,
  Crown,
  LogOut,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import PageHeader from "@/components/shared/PageHeader"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/api/client"
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"
import {
  type LobbyDetail,
  createLobby,
  joinLobbyByCode,
  kickMember,
  leaveLobby,
  updateLobbySettings,
  useCommunityLobbies,
  useMyLobbies,
  useLobbyDetail,
  syncStatsToFirebase,
} from "@/hooks/useLobbies"
import type { RankingEntry } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── types ────────────────────────────────────────────────────────────────────

interface MeStats {
  rank: number
  xp: number
  level: number
  tasks_completed: number
  streak: number
  weekly_xp: number
  quizzes_taken: number
  avg_quiz_score: number | null
  name: string
}

type MainTab = "alltime" | "weekly" | "lobbies"

// ── sub-components ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span>🥇</span>
  if (rank === 2) return <span>🥈</span>
  if (rank === 3) return <span>🥉</span>
  return <span className="text-tx3 font-mono">#{rank}</span>
}

// ── Auth Gate ─────────────────────────────────────────────────────────────────

function AuthGate() {
  const { error, loading, clearError, registerEmail, loginEmail } = useFirebaseAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  const handleSubmit = async () => {
    if (mode === "register") {
      await registerEmail(email, password, name)
    } else {
      await loginEmail(email, password)
    }
    // No need to call onDone — onAuthStateChanged will update the user state
  }

  return (
    <div className="rounded-[12px] border border-b1 bg-s1 p-6 max-w-sm mx-auto mt-4">
      <h2 className="text-[15px] font-semibold mb-1">
        {mode === "login" ? "Sign in to use Lobbies" : "Create an account"}
      </h2>
      <p className="text-[11px] text-tx3 mb-4">
        Lobbies use Firebase so your friends can find and join you.
      </p>

      <div className="space-y-2">
        {mode === "register" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit() }}
          className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
        />

        {error && <p className="text-[11px] text-rose-300">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubmit()}
          className="w-full h-9 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 disabled:opacity-40"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div className="rounded-[8px] border border-b1 bg-s2/40 px-3 py-2.5 text-center">
          <p className="text-[10px] text-tx3">
            Google sign-in is not available in the desktop app.
          </p>
          <p className="text-[10px] text-tx3 mt-0.5">
            Use email and password above.
          </p>
        </div>

        <button
          type="button"
          onClick={() => { clearError(); setMode(mode === "login" ? "register" : "login") }}
          className="w-full text-[11px] text-tx3 hover:text-tx2"
        >
          {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  )
}

// ── Lobby leaderboard table ───────────────────────────────────────────────────

function LobbyLeaderboard({
  detail,
  currentUid,
  onKick,
}: {
  detail: LobbyDetail
  currentUid: string
  onKick: (uid: string, name: string) => void
}) {
  const isOwner = detail.owner_uid === currentUid

  return (
    <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
      <div className="grid grid-cols-[36px_1fr_90px_70px_70px_80px_90px_36px] px-3 py-2 text-[10px] text-tx3 font-mono uppercase tracking-[0.8px] border-b border-b1">
        <span>#</span>
        <span>Name</span>
        <span>XP</span>
        <span>Tasks</span>
        <span>Streak</span>
        <span>Wk XP</span>
        <span>Synced</span>
        <span />
      </div>
      <div className="divide-y divide-b1">
        {detail.members.map((member, idx) => {
          const isMe = member.uid === currentUid
          return (
            <div
              key={member.uid}
              className={cn(
                "grid grid-cols-[36px_1fr_90px_70px_70px_80px_90px_36px] px-3 py-2 text-[12px] items-center",
                isMe ? "bg-[var(--bd)]" : "hover:bg-s2/40"
              )}
            >
              <span className="text-tx2 font-mono">
                <RankBadge rank={idx + 1} />
              </span>
              <span className="text-tx truncate flex items-center gap-1.5">
                {member.role === "owner" && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                {member.name}
                {isMe && <span className="text-[10px] text-blue-300 font-mono">you</span>}
              </span>
              <span className="text-blue-300 font-mono">{member.xp.toLocaleString()}</span>
              <span className="text-tx2 font-mono">{member.tasks_completed}</span>
              <span className="text-amber-300 font-mono">{member.streak}</span>
              <span className="text-violet-300 font-mono">{member.weekly_xp}</span>
              <span className="text-[10px] text-tx3 font-mono">
                {member.updated_at
                  ? new Date(member.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
              <span>
                {isOwner && !isMe && (
                  <button
                    type="button"
                    title={`Kick ${member.name}`}
                    onClick={() => onKick(member.uid, member.name)}
                    className="text-tx3 hover:text-rose-300 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Lobby settings panel ──────────────────────────────────────────────────────

function LobbySettingsPanel({
  lobby,
  currentUid,
  onLeave,
  onClose,
}: {
  lobby: LobbyDetail
  currentUid: string
  onLeave: () => void
  onClose: () => void
}) {
  const isOwner = lobby.owner_uid === currentUid
  const [name, setName] = useState(lobby.name)
  const [inviteOnly, setInviteOnly] = useState(lobby.invite_only)
  const [saving, setSaving] = useState(false)

  const copyCode = () => {
    void navigator.clipboard.writeText(lobby.code)
    toast.success("Code copied!")
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateLobbySettings(lobby.id, { name, invite_only: inviteOnly })
      toast.success("Settings saved")
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Join code */}
      <div>
        <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">Join Code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-[8px] border border-b1 bg-s2 px-3 py-2 font-mono text-[20px] font-bold text-tx tracking-[0.3em] text-center">
            {lobby.code}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="h-10 px-3 rounded-[8px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-tx3 mt-1">Share this code with friends to let them join.</p>
      </div>

      {isOwner && (
        <>
          <div>
            <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">Lobby Name</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-[8px] border border-b1 bg-s2/40 px-3 py-2.5">
            <div>
              <p className="text-[12px] text-tx">Invite Only</p>
              <p className="text-[10px] text-tx3">
                {inviteOnly
                  ? "Only members you share the code with can join."
                  : "Anyone with the code can join."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInviteOnly((v) => !v)}
              className={cn(
                "w-10 h-6 rounded-full transition-colors flex-shrink-0",
                inviteOnly ? "bg-blue-500" : "bg-s3 border border-b1"
              )}
            >
              <span
                className={cn(
                  "block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1",
                  inviteOnly ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="w-full h-8 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onLeave}
        className="w-full h-8 rounded-[7px] border border-rose-500/25 bg-[var(--rd)] text-rose-300 text-[12px] hover:bg-rose-500/20 inline-flex items-center justify-center gap-1.5"
      >
        {isOwner ? (
          <><Trash2 className="w-3.5 h-3.5" /> Disband Lobby</>
        ) : (
          <><LogOut className="w-3.5 h-3.5" /> Leave Lobby</>
        )}
      </button>
    </div>
  )
}

// ── Main lobbies view ─────────────────────────────────────────────────────────

function LobbiesView({ uid, displayName, meStats }: { uid: string; displayName: string; meStats: MeStats | undefined }) {
  const { lobbies, loading } = useMyLobbies(uid)
  const [lobbyView, setLobbyView] = useState<"mine" | "browse">("mine")
  const { lobbies: communityLobbies, loading: communityLoading } = useCommunityLobbies()
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null)
  const { detail, loading: detailLoading } = useLobbyDetail(activeLobbyId, uid)

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<"private" | "community">("private")
  const [newInviteOnly, setNewInviteOnly] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Sync local stats to Firebase so lobby mates see up-to-date numbers
  useEffect(() => {
    if (!uid || !meStats) return
    void syncStatsToFirebase(uid, {
      name: displayName,
      xp: meStats.xp,
      level: meStats.level,
      streak: meStats.streak,
      tasks_completed: meStats.tasks_completed,
      weekly_xp: meStats.weekly_xp,
    })
  }, [uid, displayName, meStats])

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Lobby name is required"); return }
    setActionLoading(true)
    try {
      const lobby = await createLobby(uid, displayName, {
        name: newName.trim(),
        lobby_type: newType,
        invite_only: newInviteOnly,
      })
      toast.success(`Lobby "${lobby.name}" created — code: ${lobby.code}`)
      setActiveLobbyId(lobby.id)
      setCreateOpen(false)
      setNewName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setActionLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) { toast.error("Enter a code"); return }
    setActionLoading(true)
    try {
      const lobby = await joinLobbyByCode(uid, joinCode.trim().toUpperCase())
      toast.success(`Joined "${lobby.name}"!`)
      setActiveLobbyId(lobby.id)
      setJoinOpen(false)
      setJoinCode("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!activeLobbyId || !detail) return
    const isOwner = detail.owner_uid === uid
    if (!window.confirm(isOwner
      ? "Disbanding will remove all members. Are you sure?"
      : "Leave this lobby?")) return
    setActionLoading(true)
    try {
      await leaveLobby(activeLobbyId, uid, isOwner)
      toast.success(isOwner ? "Lobby disbanded" : "You left the lobby")
      setActiveLobbyId(null)
      setSettingsOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setActionLoading(false)
    }
  }

  const handleKick = async (targetUid: string, name: string) => {
    if (!activeLobbyId) return
    if (!window.confirm(`Kick ${name} from the lobby?`)) return
    try {
      await kickMember(activeLobbyId, targetUid, uid)
      toast.success(`${name} was removed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    }
  }

  return (
    <div className="space-y-3">
      {/* Sub-navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(["mine", "browse"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setLobbyView(v)}
              className={cn(
                "h-8 px-3 rounded-[7px] border text-[12px] transition-colors",
                lobbyView === v
                  ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                  : "bg-s2 border-b1 text-tx2 hover:bg-s3"
              )}
            >
              {v === "mine" ? `My Lobbies (${lobbies.length})` : "🌐 Browse Community"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lobby
          </button>
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3 inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Join with Code
          </button>
        </div>
      </div>

      {lobbyView === "mine" ? (
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-3">
        {/* Lobby list */}
        <div className="rounded-[10px] border border-b1 bg-s1 p-2 space-y-1">
          <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide px-2 py-1">
            My Lobbies ({lobbies.length})
          </p>
          {loading ? (
            <p className="text-[11px] text-tx3 px-2">Loading…</p>
          ) : lobbies.length === 0 ? (
            <p className="text-[11px] text-tx3 px-2 py-2">No lobbies yet. Create one or join with a code.</p>
          ) : (
            lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className={cn(
                  "rounded-[7px] border transition-colors",
                  activeLobbyId === lobby.id
                    ? "border-blue-500/30 bg-[var(--bd)]"
                    : "border-transparent hover:bg-s2"
                )}
              >
                <div className="flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveLobbyId(lobby.id)}
                    className="flex-1 text-left px-2 py-2 text-[12px] min-w-0"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {lobby.owner_uid === uid && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {lobby.invite_only && <Shield className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                      <span className={cn("truncate font-medium", activeLobbyId === lobby.id ? "text-blue-200" : "text-tx2")}>
                        {lobby.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-tx3">
                      <span className="font-bold tracking-wider">{lobby.code}</span>
                      <span>�</span>
                      <span>{lobby.member_count} members</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Copy join code"
                    onClick={(e) => {
                      e.stopPropagation()
                      void navigator.clipboard.writeText(lobby.code)
                      toast.success(`Code ${lobby.code} copied!`)
                    }}
                    className="px-2 py-2 text-tx3 hover:text-tx2 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Active lobby detail */}
        <div>
          {!activeLobbyId ? (
            <div className="rounded-[10px] border border-b1 bg-s1 p-8 text-center text-tx3 text-[12px]">
              Select a lobby or create one to see rankings.
            </div>
          ) : detailLoading || !detail ? (
            <div className="rounded-[10px] border border-b1 bg-s1 p-4 text-[12px] text-tx3">Loading…</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-[14px] font-semibold flex items-center gap-1.5">
                    {detail.owner_uid === uid && <Crown className="w-4 h-4 text-amber-400" />}
                    {detail.name}
                  </h2>
                  <p className="text-[10px] text-tx3 font-mono mt-0.5">
                    {detail.member_count} members · code: {detail.code}
                    {detail.invite_only ? " · 🔒 invite only" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 px-2.5 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
                  title="Lobby settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              <LobbyLeaderboard
                detail={detail}
                currentUid={uid}
                onKick={handleKick}
              />
            </>
          )}
        </div>
      </div>
      ) : (
      <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
        <div className="px-3 py-2 border-b border-b1">
          <p className="text-[12px] font-semibold text-tx">Community Lobbies</p>
          <p className="text-[10px] text-tx3 mt-0.5">
            Public lobbies anyone can join â€” great for courses, universities, or friend groups.
          </p>
        </div>
        {communityLoading ? (
          <p className="text-[11px] text-tx3 p-4">Loadingâ€¦</p>
        ) : communityLobbies.length === 0 ? (
          <p className="text-[11px] text-tx3 p-4">
            No community lobbies yet. Create one and set it to "Community" type!
          </p>
        ) : (
          <div className="divide-y divide-b1">
            {communityLobbies.map((lobby) => {
              const isAlreadyMember = lobbies.some((l) => l.id === lobby.id)
              return (
                <div
                  key={lobby.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-s2/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-tx truncate">{lobby.name}</p>
                    <p className="text-[10px] font-mono text-tx3 mt-0.5">
                      {lobby.member_count} members
                      {lobby.invite_only ? " Â· ðŸ”’ invite only" : ""}
                    </p>
                  </div>
                  {isAlreadyMember ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLobbyId(lobby.id)
                        setLobbyView("mine")
                      }}
                      className="h-7 px-2.5 rounded-[7px] border border-blue-500/30 bg-[var(--bd)] text-blue-300 text-[11px] flex-shrink-0"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading || lobby.invite_only}
                      onClick={async () => {
                        setActionLoading(true)
                        try {
                          const joined = await joinLobbyByCode(uid, lobby.code)
                          toast.success(`Joined "${joined.name}"!`)
                          setActiveLobbyId(joined.id)
                          setLobbyView("mine")
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to join")
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      className="h-7 px-2.5 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 disabled:opacity-40 flex-shrink-0"
                      title={lobby.invite_only ? "This lobby is invite-only" : "Join lobby"}
                    >
                      {lobby.invite_only ? "ðŸ”’ Invite Only" : "Join"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader><DialogTitle>Create Lobby</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-tx3">Lobby Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. CS Friends, COMP2400"
                className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-tx3 block mb-1.5">Type</label>
              <div className="flex gap-2">
                {(["private", "community"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={cn(
                      "flex-1 h-8 rounded-[7px] border text-[11px] capitalize transition-colors",
                      newType === t ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                    )}
                  >
                    {t === "private" ? "🔐 Private" : "🌐 Community"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-tx3 mt-1">
                {newType === "private"
                  ? "Only people with your code can see and join this lobby."
                  : "Visible to everyone — good for course-wide or uni-wide boards."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-[8px] border border-b1 bg-s2/40 px-3 py-2.5">
              <div>
                <p className="text-[12px] text-tx">Invite Only</p>
                <p className="text-[10px] text-tx3">You control who joins via the code.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewInviteOnly((v) => !v)}
                className={cn("w-10 h-6 rounded-full transition-colors flex-shrink-0", newInviteOnly ? "bg-blue-500" : "bg-s3 border border-b1")}
              >
                <span className={cn("block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1", newInviteOnly ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setCreateOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">Cancel</button>
            <button type="button" disabled={actionLoading} onClick={() => void handleCreate()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">
              {actionLoading ? "Creating…" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader><DialogTitle>Join a Lobby</DialogTitle></DialogHeader>
          <div>
            <label className="text-[11px] text-tx3">Enter 6-digit code</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="mt-1 h-12 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[20px] font-bold font-mono tracking-[0.3em] text-tx text-center outline-none"
            />
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setJoinOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">Cancel</button>
            <button type="button" disabled={actionLoading || joinCode.length !== 6} onClick={() => void handleJoin()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">
              {actionLoading ? "Joining…" : "Join"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen && !!detail} onOpenChange={(v) => !v && setSettingsOpen(false)}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Lobby Settings
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <LobbySettingsPanel
              lobby={detail}
              currentUid={uid}
              onLeave={() => void handleLeave()}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"alltime" | "weekly">("alltime")
  const [mainTab, setMainTab] = useState<MainTab>("alltime")

  const rankingsQuery = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => api.get<RankingEntry[]>(`/leaderboard?period=${period}&limit=50`),
    enabled: mainTab !== "lobbies",
  })
  const meQuery = useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: () => api.get<MeStats>("/leaderboard/me"),
  })

  const { user, logout } = useFirebaseAuth()

  const handleTabChange = (tab: MainTab) => {
    setMainTab(tab)
    if (tab === "alltime" || tab === "weekly") setPeriod(tab)
  }

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Leaderboard"
        subtitle="See how you stack up — solo or with friends."
        actions={
          <div className="flex gap-2 items-center">
            {(["alltime", "weekly", "lobbies"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "h-8 px-3 rounded-[7px] border text-[12px] transition-colors",
                  mainTab === tab
                    ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                    : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                )}
              >
                {tab === "alltime" ? "All Time" : tab === "weekly" ? "This Week" : "🏠 Lobbies"}
              </button>
            ))}

            {/* Firebase sign-out button shown only on lobbies tab */}
            {mainTab === "lobbies" && user && (
              <button
                type="button"
                title={`Signed in as ${user.displayName ?? user.email}`}
                onClick={() => void logout()}
                className="h-8 px-2.5 rounded-[7px] border border-b1 bg-s2 text-tx3 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />

      {/* ── All Time / Weekly (unchanged layout) ─────────────────────────── */}
      {mainTab !== "lobbies" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3">
          <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
            <div className="grid grid-cols-[70px_1fr_100px_80px_80px_90px] px-3 py-2 text-[10px] text-tx3 font-mono uppercase tracking-[0.8px] border-b border-b1">
              <span>Rank</span><span>Name</span><span>XP</span><span>Tasks</span><span>Streak</span><span>Weekly</span>
            </div>
            <div className="divide-y divide-b1">
              {(rankingsQuery.data ?? []).map((entry) => {
                const isMe = meQuery.data?.rank === entry.rank
                return (
                  <div
                    key={`${entry.user_id}-${entry.rank}`}
                    className={cn(
                      "grid grid-cols-[70px_1fr_100px_80px_80px_90px] px-3 py-2 text-[12px]",
                      isMe ? "bg-[var(--bd)]" : "hover:bg-s2/40"
                    )}
                  >
                    <span className="text-tx2 font-mono">
                      <RankBadge rank={entry.rank} />
                    </span>
                    <span className="text-tx truncate">{entry.name}{isMe ? " ← YOU" : ""}</span>
                    <span className="text-blue-300 font-mono">{entry.xp.toLocaleString()}</span>
                    <span className="text-tx2 font-mono">{entry.tasks_completed}</span>
                    <span className="text-amber-300 font-mono">{entry.streak}</span>
                    <span className="text-violet-300 font-mono">{entry.weekly_xp}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="rounded-[10px] border border-b1 bg-s1 p-3">
            <h3 className="text-[13px] font-semibold mb-2">Your Stats</h3>
            {meQuery.data ? (
              <div className="space-y-2 text-[12px]">
                {[
                  { label: "Rank", value: `#${meQuery.data.rank}` },
                  { label: "XP", value: meQuery.data.xp.toLocaleString() },
                  { label: "Level", value: meQuery.data.level },
                  { label: "Tasks", value: meQuery.data.tasks_completed },
                  { label: "Streak", value: meQuery.data.streak },
                  { label: "Weekly XP", value: meQuery.data.weekly_xp },
                  { label: "Quiz attempts", value: meQuery.data.quizzes_taken },
                  { label: "Avg score", value: meQuery.data.avg_quiz_score ?? "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[7px] border border-b1 bg-s2/40 px-3 py-2 flex justify-between">
                    <span className="text-tx3">{label}</span>
                    <span className="text-tx font-mono">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}

      {/* ── Lobbies tab ───────────────────────────────────────────────────── */}
      {mainTab === "lobbies" && (
        user === undefined ? (
          <p className="text-[12px] text-tx3">Loading…</p>
        ) : user === null ? (
          <AuthGate />
        ) : (
          <LobbiesView
            uid={user.uid}
            displayName={user.displayName ?? user.email ?? "Player"}
            meStats={meQuery.data}
          />
        )
      )}
    </div>
  )
}
