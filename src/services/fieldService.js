import {
  collection, addDoc, getDocs, query, where, limit,
  serverTimestamp, deleteDoc, doc, getDoc, updateDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";

export async function addField(farmerId, { type, address, location = null, area = null }) {
  try {
    return await addDoc(collection(db, "farmers", farmerId, "fields"), {
      ownerUid: auth.currentUser.uid,
      farmerId,
      type,
      address,
      location,
      area,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("addField error:", e);
    throw e;
  }
}

export async function listFieldsByFarmer(farmerId) {
  try {
    const q = query(
      collection(db, "farmers", farmerId, "fields"),
      where("ownerUid", "==", auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("listFieldsByFarmer error:", e);
    throw e;
  }
}

export async function getFieldById(farmerId, fieldId) {
  try {
    const ref = doc(db, "farmers", farmerId, "fields", fieldId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error("getFieldById error:", e);
    throw e;
  }
}

export async function hasAnyField(farmerId) {
  const q = query(
    collection(db, "farmers", farmerId, "fields"),
    where("ownerUid", "==", auth.currentUser.uid),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function removeField(farmerId, fieldId) {
  await deleteDoc(doc(db, "farmers", farmerId, "fields", fieldId));
}


export async function updateField(farmerId, fieldId, payload) {
  const update = {};
  if (payload.type !== undefined) update.type = payload.type;
  if (payload.address !== undefined) update.address = payload.address;
  if (payload.location !== undefined) update.location = payload.location;
  if (payload.area !== undefined) update.area = payload.area;
  if (Object.keys(update).length === 0) return;
  await updateDoc(doc(db, "farmers", farmerId, "fields", fieldId), update);
}
