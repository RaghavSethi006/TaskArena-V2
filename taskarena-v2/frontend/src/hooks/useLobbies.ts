import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { useEffect, useState } from "react"
import {
  lobbiesCol,
  lobbyDoc,
  lobbyMemberDoc,
  lobbyMembersCol,
  userDoc,
} from "@/lib/firebase"

export interface LobbyMember {
  uid: string
  name: string
  role: "owner" | "member"
  joined_at: string
  updated_at?: string
  xp: number
  level: number
  tasks_completed: number
  streak: number
  weekly_xp: number
}

export interface Lobby {
  id: string
  name: string
  code: string
  owner_uid: string
  lobby_type: "private" | "community"
  invite_only: boolean
  created_at: string
  member_count: number
}

export interface LobbyDetail extends Lobby {
  members: LobbyMember[]
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

async function _uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = _randomCode()
    const q = query(lobbiesCol, where("code", "==", code))
    const snap = await getDocs(q)
    if (snap.empty) return code
  }
  throw new Error("Could not generate a unique lobby code")
}

// ── useMyLobbies — real-time list of lobbies the current user belongs to ─────

export function useMyLobbies(uid: string | null) {
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLobbies([]); setLoading(false); return }

    // Listen to ALL lobbies where this user is a member
    // Strategy: query members subcollection isn't possible across groups with
    // basic SDK — instead we store member UIDs array on the lobby doc for querying
    const q = query(lobbiesCol, where("member_uids", "array-contains", uid))
    const unsub = onSnapshot(q, (snap) => {
      setLobbies(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Lobby, "id">),
        }))
      )
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { lobbies, loading }
}

// Community lobbies (public) list
export function useCommunityLobbies() {
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(lobbiesCol, where("lobby_type", "==", "community"))
    const unsub = onSnapshot(q, (snap) => {
      setLobbies(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Lobby, "id">),
        }))
      )
      setLoading(false)
    })
    return unsub
  }, [])

  return { lobbies, loading }
}
// ── useLobbyDetail — real-time detail (members + stats) ──────────────────────

export function useLobbyDetail(lobbyId: string | null, uid: string | null) {
  const [detail, setDetail] = useState<LobbyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lobbyId || !uid) {
      setDetail(null)
      setLoading(false)
      return
    }

    // Helper: given a members snapshot, fetch user docs and build LobbyMember[]
    const buildMembers = async (
      membersSnap: import("firebase/firestore").QuerySnapshot
    ): Promise<LobbyMember[]> => {
      const members = await Promise.all(
        membersSnap.docs.map(async (m) => {
          const memberData = m.data()
          const userSnap = await getDoc(userDoc(m.id))
          const userData = userSnap.exists() ? userSnap.data() : {}
          return {
            uid: m.id,
            name: (userData.name as string) ?? "Unknown",
            role: memberData.role as "owner" | "member",
            joined_at:
              (memberData.joined_at as import("firebase/firestore").Timestamp)
                ?.toDate?.()
                ?.toISOString() ?? "",
            updated_at: (userData.updated_at as import("firebase/firestore").Timestamp)
              ?.toDate?.()
              ?.toISOString() ?? undefined,
            xp: (userData.xp as number) ?? 0,
            level: (userData.level as number) ?? 1,
            tasks_completed: (userData.tasks_completed as number) ?? 0,
            streak: (userData.streak as number) ?? 0,
            weekly_xp: (userData.weekly_xp as number) ?? 0,
          } satisfies LobbyMember
        })
      )
      members.sort((a, b) => b.xp - a.xp)
      return members
    }

    let lobbyData: Omit<LobbyDetail, "id" | "members" | "member_count"> | null = null
    let latestMembers: LobbyMember[] = []

    const pushUpdate = () => {
      if (!lobbyData) return
      setDetail({
        id: lobbyId,
        ...lobbyData,
        member_count: latestMembers.length,
        members: latestMembers,
      })
      setLoading(false)
    }

    // Listener 1: lobby doc (name, code, invite_only, etc.)
    const unsubLobby = onSnapshot(lobbyDoc(lobbyId), (snap) => {
      if (!snap.exists()) {
        setDetail(null)
        setLoading(false)
        return
      }
      lobbyData = snap.data() as Omit<LobbyDetail, "id" | "members" | "member_count">
      pushUpdate()
    })

    // Listener 2: members subcollection — triggers full member rebuild on any change
    const unsubMembers = onSnapshot(lobbyMembersCol(lobbyId), async (snap) => {
      latestMembers = await buildMembers(snap)
      pushUpdate()
    })

    return () => {
      unsubLobby()
      unsubMembers()
    }
  }, [lobbyId, uid])

  return { detail, loading }
}

// ── lobby mutations ───────────────────────────────────────────────────────────

export async function createLobby(
  uid: string,
  _displayName: string,
  data: { name: string; lobby_type: "private" | "community"; invite_only: boolean }
): Promise<Lobby> {
  const code = await _uniqueCode()
  const lobbyRef = await addDoc(lobbiesCol, {
    name: data.name.trim(),
    code,
    owner_uid: uid,
    lobby_type: data.lobby_type,
    invite_only: data.invite_only,
    member_uids: [uid],
    created_at: serverTimestamp(),
  })
  // Add owner as member
  await setDoc(lobbyMemberDoc(lobbyRef.id, uid), {
    uid,
    role: "owner",
    joined_at: serverTimestamp(),
  })
  const snap = await getDoc(lobbyRef)
  return { id: lobbyRef.id, ...(snap.data() as Omit<Lobby, "id">) }
}

export async function joinLobbyByCode(uid: string, code: string): Promise<Lobby> {
  const q = query(lobbiesCol, where("code", "==", code.trim().toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error(`No lobby found with code "${code}"`)
  const lobbyRef = snap.docs[0].ref
  const lobbyId = snap.docs[0].id
  const lobbyData = snap.docs[0].data()

  // Check if already a member
  const existingMember = await getDoc(lobbyMemberDoc(lobbyId, uid))
  if (existingMember.exists()) throw new Error("You are already in this lobby")

  // Check if blocked
  const blockedUids: string[] = lobbyData.blocked_uids ?? []
  if (blockedUids.includes(uid)) {
    throw new Error("You have been removed from this lobby by the owner.")
  }

  // Add uid to member_uids array for queryability
  await updateDoc(lobbyRef, {
    member_uids: [...(lobbyData.member_uids ?? []), uid],
  })
  await setDoc(lobbyMemberDoc(lobbyId, uid), {
    uid,
    role: "member",
    joined_at: serverTimestamp(),
  })
  return { id: lobbyId, ...(lobbyData as Omit<Lobby, "id">) }
}

export async function leaveLobby(lobbyId: string, uid: string, isOwner: boolean): Promise<void> {
  if (isOwner) {
    // Owner leaving deletes the whole lobby (cascades via security rules on subcollections)
    const membersSnap = await getDocs(lobbyMembersCol(lobbyId))
    await Promise.all(membersSnap.docs.map((d) => deleteDoc(d.ref)))
    await deleteDoc(lobbyDoc(lobbyId))
    return
  }
  await deleteDoc(lobbyMemberDoc(lobbyId, uid))
  const lobbySnap = await getDoc(lobbyDoc(lobbyId))
  if (lobbySnap.exists()) {
    const current: string[] = lobbySnap.data().member_uids ?? []
    await updateDoc(lobbyDoc(lobbyId), {
      member_uids: current.filter((id) => id !== uid),
    })
  }
}

export async function kickMember(
  lobbyId: string,
  targetUid: string,
  _ownerUid: string
): Promise<void> {
  await deleteDoc(lobbyMemberDoc(lobbyId, targetUid))
  const lobbySnap = await getDoc(lobbyDoc(lobbyId))
  if (lobbySnap.exists()) {
    const data = lobbySnap.data()
    const currentMemberUids: string[] = data.member_uids ?? []
    const currentBlockedUids: string[] = data.blocked_uids ?? []
    await updateDoc(lobbyDoc(lobbyId), {
      member_uids: currentMemberUids.filter((id) => id !== targetUid),
      // Add to blocklist so they can't immediately rejoin
      blocked_uids: currentBlockedUids.includes(targetUid)
        ? currentBlockedUids
        : [...currentBlockedUids, targetUid],
    })
  }
}

export async function updateLobbySettings(
  lobbyId: string,
  data: { name?: string; invite_only?: boolean }
): Promise<void> {
  await updateDoc(lobbyDoc(lobbyId), data)
}

// ── syncStatsToFirebase — call this after completing tasks/quizzes ────────────

export async function syncStatsToFirebase(
  uid: string,
  stats: { xp: number; level: number; streak: number; tasks_completed: number; weekly_xp: number; name: string }
): Promise<void> {
  await setDoc(userDoc(uid), { ...stats, updated_at: serverTimestamp() }, { merge: true })
}
