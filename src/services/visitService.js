import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

export async function addVisit(farmerId, fieldId, { dateISO, note = "", recommendationIds = [] }) {
  return addDoc(collection(db, "farmers", farmerId, "fields", fieldId, "visits"), {
    ownerUid: auth.currentUser.uid,
    farmerId,
    fieldId,
    date: Timestamp.fromDate(new Date(dateISO)),
    note,
    recommendationIds,
    createdAt: serverTimestamp(),
  });
}

export async function listVisitsByField(farmerId, fieldId) {
  const q = query(
    collection(db, "farmers", farmerId, "fields", fieldId, "visits"),
    where("ownerUid", "==", auth.currentUser.uid),
    orderBy("date", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listRecentVisits(limitCount = 10) {
  if (!auth.currentUser) {
    throw new Error("Oturum bulunamadi");
  }

  const constraints = [
    where("ownerUid", "==", auth.currentUser.uid),
    orderBy("date", "desc"),
    limit(limitCount),
  ];

  const q = query(collectionGroup(db, "visits"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const fromPath = parsePathForIds(d.ref.path);
    return {
      id: d.id,
      ...data,
      farmerId: data.farmerId || fromPath.farmerId,
      fieldId: data.fieldId || fromPath.fieldId,
    };
  });
}

function parsePathForIds(path) {
  const parts = path.split("/");
  if (parts.length < 6) return { farmerId: undefined, fieldId: undefined };
  return { farmerId: parts[1], fieldId: parts[3] };
}

export async function listVisitsPaged({ pageSize = 10, cursor = null } = {}) {
  if (!auth.currentUser) {
    throw new Error("Oturum bulunamadi");
  }

  const constraints = [
    where("ownerUid", "==", auth.currentUser.uid),
    orderBy("date", "desc"),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collectionGroup(db, "visits"), ...constraints);
  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const visibleDocs = hasMore ? docs.slice(0, pageSize) : docs;
  const items = visibleDocs.map((d) => {
    const data = d.data();
    const fromPath = parsePathForIds(d.ref.path);
    return {
      id: d.id,
      ...data,
      farmerId: data.farmerId || fromPath.farmerId,
      fieldId: data.fieldId || fromPath.fieldId,
      _path: d.ref.path,
    };
  });
  const nextCursor = hasMore ? visibleDocs[visibleDocs.length - 1] : null;

  return {
    items,
    cursor: nextCursor,
    hasMore,
  };
}

export async function removeVisit(farmerId, fieldId, visitId) {
  await deleteDoc(doc(db, "farmers", farmerId, "fields", fieldId, "visits", visitId));
}

export async function updateVisit(farmerId, fieldId, visitId, { dateISO, note, recommendationIds }) {
  const payload = {};

  if (dateISO) {
    payload.date = Timestamp.fromDate(new Date(dateISO));
  }

  if (note !== undefined) {
    payload.note = note;
  }

  if (recommendationIds !== undefined) {
    payload.recommendationIds = recommendationIds;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  payload.updatedAt = serverTimestamp();

  await updateDoc(doc(db, "farmers", farmerId, "fields", fieldId, "visits", visitId), payload);
}
