import { type User as FBUser, onAuthStateChanged } from "firebase/auth"
import { useEffect, useState } from "react"
import {
  auth,
  createUserWithEmailAndPassword,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  userDoc,
} from "@/lib/firebase"
import { getDoc } from "firebase/firestore"

export function useFirebaseAuth() {
  const [user, setUser] = useState<FBUser | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return unsub
  }, [])

  const clearError = () => setError(null)

  const registerEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName })
      await _ensureUserDoc(cred.user, displayName)
    } catch (err: unknown) {
      setError(_friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const loginEmail = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await _ensureUserDoc(cred.user)
    } catch (err: unknown) {
      setError(_friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const logout = () => signOut(auth)

  return { user, error, loading, clearError, registerEmail, loginEmail, logout }
}

async function _ensureUserDoc(fbUser: FBUser, overrideName?: string) {
  const ref = userDoc(fbUser.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: overrideName ?? fbUser.displayName ?? fbUser.email ?? "Anonymous",
      email: fbUser.email ?? "",
      xp: 0,
      level: 1,
      streak: 0,
      tasks_completed: 0,
      weekly_xp: 0,
      updated_at: serverTimestamp(),
    })
  }
}

function _friendlyError(err: unknown): string {
  if (!(err instanceof Error)) return "An error occurred"
  const code = (err as { code?: string }).code ?? ""
  if (code === "auth/email-already-in-use") return "Email already registered"
  if (code === "auth/invalid-email") return "Invalid email address"
  if (code === "auth/weak-password") return "Password must be at least 6 characters"
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
    return "Incorrect email or password"
  if (code === "auth/too-many-requests") return "Too many attempts — try again later"
  return err.message
}
