import { auth } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  return signOut(auth);
}
