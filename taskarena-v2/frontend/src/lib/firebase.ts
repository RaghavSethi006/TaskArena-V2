import { initializeApp } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import {
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"

// ─── PASTE YOUR FIREBASE CONFIG HERE ───────────────────────────────────────
// Go to https://console.firebase.google.com
// Create a project → Add app (Web) → copy the config object below
const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE",
}
// ────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Collection refs — centralised so they never get typo'd
export const usersCol = collection(db, "users")
export const lobbiesCol = collection(db, "lobbies")

export function userDoc(uid: string) {
  return doc(db, "users", uid)
}
export function lobbyDoc(lobbyId: string) {
  return doc(db, "lobbies", lobbyId)
}
export function lobbyMembersCol(lobbyId: string) {
  return collection(db, "lobbies", lobbyId, "members")
}
export function lobbyMemberDoc(lobbyId: string, uid: string) {
  return doc(db, "lobbies", lobbyId, "members", uid)
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  serverTimestamp,
  setDoc,
}
