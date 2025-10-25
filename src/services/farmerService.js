import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export async function addFarmer(name, phone) {
  return addDoc(collection(db, "farmers"), {
    ownerUid: auth.currentUser.uid,
    name,
    phone,
    createdAt: serverTimestamp(),
  });
}

export async function listFarmersOnce() {
  const q = query(
    collection(db, "farmers"),
    where("ownerUid", "==", auth.currentUser.uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function removeFarmer(id) {
  await deleteDoc(doc(db, "farmers", id));
}

export async function getFarmerById(id) {
  const d = await getDoc(doc(db, "farmers", id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
}

export async function updateFarmer(id, { name, phone }) {
  const payload = {};
  if (typeof name === "string") payload.name = name;
  if (typeof phone === "string") payload.phone = phone;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(db, "farmers", id), payload);
}
