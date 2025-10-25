import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export async function addRecommendation(name, kind, subKind = null) {
  const payload = {
    ownerUid: auth.currentUser.uid,
    name,
    kind,
    subKind: subKind || null,
    createdAt: serverTimestamp(),
  };

  return addDoc(collection(db, "recommendations"), payload);
}

export async function listRecommendations() {
  const q = query(
    collection(db, "recommendations"),
    where("ownerUid", "==", auth.currentUser.uid),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      subKind: data.subKind ?? null,
    };
  });
}

export async function updateRecommendation(id, { name, kind, subKind }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (kind !== undefined) payload.kind = kind;
  if (subKind !== undefined) payload.subKind = subKind ?? null;
  payload.updatedAt = serverTimestamp();

  await updateDoc(doc(db, "recommendations", id), payload);
}

export async function removeRecommendation(id) {
  await deleteDoc(doc(db, "recommendations", id));
}
