import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore/lite";
import { ensureFirebaseSessionPersistence, getFirebaseAuth, getFirestoreDb } from "./client";
import {
  conflictError,
  firebaseErrorMessage,
  notFoundError,
  unauthorizedError,
  validationError,
  wrapUnknownError,
} from "./errors";
import {
  addOneHour,
  buildSlotKey,
  buildStartAt,
  isFutureSlot,
  normalizeDateValue,
  normalizeStartAt,
  scheduleTimesForDate,
  slotKeyFromStartAt,
  timeFromStartAt,
} from "./hospitalSchedule";

function nowIsoString() {
  return new Date().toISOString();
}

function departmentRef(db, departmentId) {
  return doc(db, "departments", departmentId);
}

function adminRef(db, userId) {
  return doc(db, "admins", userId);
}

function userRef(db, userId) {
  return doc(db, "users", userId);
}

function appointmentsCollection(db, userId) {
  return collection(db, "users", userId, "appointments");
}

function appointmentRef(db, userId, appointmentId) {
  return doc(db, "users", userId, "appointments", appointmentId);
}

function userDepartmentLockRef(db, userId, departmentId) {
  return doc(db, "user_department_locks", `${userId}_${departmentId}`);
}

function userSlotLockRef(db, userId, slotKey) {
  return doc(db, "user_slot_locks", `${userId}_${slotKey}`);
}

function departmentSlotLockRef(db, departmentId, slotKey) {
  return doc(db, "department_slot_locks", `${departmentId}_${slotKey}`);
}

function departmentClosureRef(db, departmentId, dateValue) {
  return doc(db, "department_closures", `${departmentId}_${normalizeDateValue(dateValue)}`);
}

function toUserOut(userId, payload, authUser, isAdmin = false) {
  return {
    id: userId,
    email: payload.email || authUser?.email || "",
    user_name: payload.user_name || authUser?.displayName || (authUser?.email || "").split("@")[0],
    phone: payload.phone || null,
    is_admin: isAdmin,
  };
}

function toDepartmentOut(snapshotOrId, maybePayload) {
  const id = typeof snapshotOrId === "string" ? snapshotOrId : snapshotOrId.id;
  const payload = maybePayload || snapshotOrId.data() || {};
  return {
    id,
    name: payload.name || "",
    sort_order: Number(payload.sort_order || 0),
    is_active: Boolean(payload.is_active),
  };
}

function toAppointmentOut(snapshotOrId, maybePayload) {
  const id = typeof snapshotOrId === "string" ? snapshotOrId : snapshotOrId.id;
  const payload = maybePayload || snapshotOrId.data() || {};
  return {
    id,
    user_id: payload.user_id,
    department_id: payload.department_id,
    department_name: payload.department_name || null,
    status: payload.status || "confirmed",
    start_at: payload.start_at,
    end_at: addOneHour(payload.start_at),
    created_at: payload.created_at || null,
    updated_at: payload.updated_at || null,
  };
}

function toClosureOut(snapshotOrId, maybePayload) {
  const id = typeof snapshotOrId === "string" ? snapshotOrId : snapshotOrId.id;
  const payload = maybePayload || snapshotOrId.data() || {};
  return {
    id,
    department_id: payload.department_id || "",
    department_name: payload.department_name || "",
    date: payload.date || "",
    reason: payload.reason || null,
    created_by: payload.created_by || null,
    created_at: payload.created_at || null,
    updated_at: payload.updated_at || null,
  };
}

function closureReasonLabel(reason) {
  return reason?.trim() ? `休診日: ${reason.trim()}` : "休診日";
}

function nextDateValue(dateValue) {
  const [year, month, day] = normalizeDateValue(dateValue).split("-").map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

async function requireSignedInUser() {
  await ensureFirebaseSessionPersistence();
  const authUser = getFirebaseAuth().currentUser;
  if (!authUser) {
    throw unauthorizedError("ログインが必要です。再度ログインしてください。");
  }
  return authUser;
}

async function isAdminUid(userId) {
  const db = getFirestoreDb();
  const snapshot = await getDoc(adminRef(db, userId));
  return snapshot.exists();
}

async function requireAdminUser() {
  const authUser = await requireSignedInUser();
  const adminUser = await isAdminUid(authUser.uid);

  if (!adminUser) {
    throw unauthorizedError("管理者権限が必要です。");
  }

  return authUser;
}

async function ensureUserDocument(authUser, overrides = {}) {
  const db = getFirestoreDb();
  const ref = userRef(db, authUser.uid);
  const [snapshot, adminSnapshot] = await Promise.all([
    getDoc(ref),
    getDoc(adminRef(db, authUser.uid)),
  ]);
  const now = nowIsoString();
  const basePayload = snapshot.exists() ? snapshot.data() || {} : {};
  const userName =
    overrides.user_name?.trim() ||
    basePayload.user_name ||
    authUser.displayName ||
    (authUser.email || "").split("@")[0];
  const phone =
    overrides.phone !== undefined
      ? overrides.phone?.trim() || null
      : basePayload.phone || null;

  const payload = {
    email: authUser.email || basePayload.email || "",
    user_name: userName,
    phone,
    created_at: basePayload.created_at || now,
    updated_at: now,
  };

  await setDoc(ref, payload, { merge: true });
  return toUserOut(authUser.uid, payload, authUser, adminSnapshot.exists());
}

async function getDepartment(departmentId, options = {}) {
  const { requireActive = true } = options;
  const db = getFirestoreDb();
  const snapshot = await getDoc(departmentRef(db, departmentId));
  if (!snapshot.exists()) {
    throw notFoundError("診療科が見つかりません。");
  }

  const department = toDepartmentOut(snapshot);
  if (requireActive && !department.is_active) {
    throw notFoundError("診療科が見つかりません。");
  }

  return department;
}

function validateRequestedSlot(startAt, departmentId) {
  const normalizedStartAt = normalizeStartAt(startAt);
  const dateValue = normalizeDateValue(normalizedStartAt);
  const timeValue = timeFromStartAt(normalizedStartAt);
  const allowedTimes = scheduleTimesForDate(dateValue);

  if (!allowedTimes.includes(timeValue)) {
    throw validationError("診療時間外のため、この日時は予約できません。", "INVALID_TIME");
  }

  if (!isFutureSlot(dateValue, timeValue)) {
    throw validationError("この日時は予約できません。別の日時をお選びください。", "UNAVAILABLE");
  }

  return {
    departmentId,
    dateValue,
    timeValue,
    slotKey: buildSlotKey(dateValue, timeValue),
    startAt: buildStartAt(dateValue, timeValue),
  };
}

export async function buildSessionPayload(authUser) {
  const [accessToken, profile] = await Promise.all([
    authUser.getIdToken(),
    ensureUserDocument(authUser),
  ]);

  return {
    access_token: accessToken,
    refresh_token: null,
    expires_in: 3600,
    user: profile,
  };
}

export function subscribeAuthState(callbacks) {
  return onIdTokenChanged(getFirebaseAuth(), async (authUser) => {
    if (!authUser) {
      callbacks.onSignedOut?.();
      return;
    }

    try {
      const session = await buildSessionPayload(authUser);
      callbacks.onSignedIn?.(session);
    } catch (error) {
      callbacks.onError?.(wrapUnknownError(error, "ログイン情報の確認に失敗しました。"));
    }
  });
}

export async function loginWithFirebase({ email, password }) {
  try {
    await ensureFirebaseSessionPersistence();
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return await buildSessionPayload(credential.user);
  } catch (error) {
    throw firebaseErrorMessage(error, "ログインに失敗しました。");
  }
}

export async function registerWithFirebase({ email, password, userName, phone }) {
  const trimmedUserName = userName.trim();
  if (!trimmedUserName) {
    throw validationError("お名前を入力してください。");
  }

  try {
    await ensureFirebaseSessionPersistence();
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(credential.user, { displayName: trimmedUserName });
    await ensureUserDocument(credential.user, {
      user_name: trimmedUserName,
      phone,
    });
    return await buildSessionPayload(credential.user);
  } catch (error) {
    throw firebaseErrorMessage(error, "新規登録に失敗しました。");
  }
}

export async function refreshFirebaseSession() {
  const authUser = await requireSignedInUser();

  try {
    await authUser.getIdToken(true);
    return await buildSessionPayload(authUser);
  } catch (error) {
    throw firebaseErrorMessage(error, "ログイン情報の更新に失敗しました。");
  }
}

export async function logoutFromFirebase() {
  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    throw firebaseErrorMessage(error, "ログアウトに失敗しました。");
  }
}

export async function fetchCurrentUserProfile() {
  try {
    const authUser = await requireSignedInUser();
    return await ensureUserDocument(authUser);
  } catch (error) {
    throw wrapUnknownError(error, "プロフィールの取得に失敗しました。");
  }
}

export async function updateCurrentUserProfile({ userName, phone }) {
  const trimmedUserName = userName.trim();
  if (!trimmedUserName) {
    throw validationError("お名前を入力してください。");
  }

  try {
    const authUser = await requireSignedInUser();
    if ((authUser.displayName || "") !== trimmedUserName) {
      await updateProfile(authUser, { displayName: trimmedUserName });
    }
    return await ensureUserDocument(authUser, {
      user_name: trimmedUserName,
      phone,
    });
  } catch (error) {
    throw wrapUnknownError(error, "プロフィールの更新に失敗しました。");
  }
}

export async function fetchActiveDepartments() {
  try {
    const db = getFirestoreDb();
    const snapshots = await getDocs(query(collection(db, "departments"), orderBy("sort_order", "asc")));
    const items = snapshots.docs
      .map((snapshot) => toDepartmentOut(snapshot))
      .filter((department) => department.is_active);
    return { items };
  } catch (error) {
    throw wrapUnknownError(error, "診療科一覧の取得に失敗しました。");
  }
}

export async function fetchDailyAvailability({ departmentId, date, excludeAppointmentId }) {
  try {
    await getDepartment(departmentId);
    const db = getFirestoreDb();
    const dateValue = normalizeDateValue(date);
    const candidateTimes = scheduleTimesForDate(dateValue);
    const closureSnapshot = await getDoc(departmentClosureRef(db, departmentId, dateValue));
    const closurePayload = closureSnapshot.data() || {};
    const closedReason = closureSnapshot.exists() ? closureReasonLabel(closurePayload.reason) : null;
    const lockSnapshots = await Promise.all(
      candidateTimes.map((timeValue) =>
        getDoc(departmentSlotLockRef(db, departmentId, buildSlotKey(dateValue, timeValue)))
      )
    );

    const items = candidateTimes.map((timeValue, index) => {
      const slotKey = buildSlotKey(dateValue, timeValue);
      const startAt = buildStartAt(dateValue, timeValue);
      const lockSnapshot = lockSnapshots[index];
      const lockPayload = lockSnapshot.data() || {};
      const reservedByOther = lockSnapshot.exists() && lockPayload.appointment_id !== excludeAppointmentId;

      if (closureSnapshot.exists()) {
        return {
          time: timeValue,
          start_at: startAt,
          available: false,
          reason: closedReason,
        };
      }

      if (!isFutureSlot(dateValue, timeValue)) {
        return {
          time: timeValue,
          start_at: startAt,
          available: false,
          reason: "受付終了",
        };
      }

      if (reservedByOther) {
        return {
          time: timeValue,
          start_at: startAt,
          available: false,
          reason: "満員",
        };
      }

      return {
        time: timeValue,
        start_at: startAt,
        available: true,
        reason: null,
      };
    });

    return {
      department_id: departmentId,
      date: dateValue,
      closed: closureSnapshot.exists(),
      closed_reason: closedReason,
      items,
    };
  } catch (error) {
    throw wrapUnknownError(error, "予約可能時間の取得に失敗しました。");
  }
}

export async function fetchUserAppointments() {
  try {
    const authUser = await requireSignedInUser();
    const db = getFirestoreDb();
    const snapshots = await getDocs(query(appointmentsCollection(db, authUser.uid), orderBy("start_at", "asc")));
    const items = snapshots.docs
      .map((snapshot) => toAppointmentOut(snapshot))
      .filter((appointment) => appointment.status === "confirmed");
    return { items };
  } catch (error) {
    throw wrapUnknownError(error, "予約一覧の取得に失敗しました。");
  }
}

export async function fetchUserAppointment(appointmentId) {
  try {
    const authUser = await requireSignedInUser();
    const db = getFirestoreDb();
    const snapshot = await getDoc(appointmentRef(db, authUser.uid, appointmentId));

    if (!snapshot.exists() || snapshot.data()?.status !== "confirmed") {
      throw notFoundError("予約が見つかりません。");
    }

    return toAppointmentOut(snapshot);
  } catch (error) {
    throw wrapUnknownError(error, "予約詳細の取得に失敗しました。");
  }
}

export async function createUserAppointment({ departmentId, startAt }) {
  try {
    const authUser = await requireSignedInUser();
    const department = await getDepartment(departmentId);
    const { slotKey, startAt: normalizedStartAt } = validateRequestedSlot(startAt, departmentId);
    const db = getFirestoreDb();
    const now = nowIsoString();

    return await runTransaction(db, async (transaction) => {
      const nextAppointmentRef = doc(appointmentsCollection(db, authUser.uid));
      const userDepartmentRef = userDepartmentLockRef(db, authUser.uid, department.id);
      const userSlotRef = userSlotLockRef(db, authUser.uid, slotKey);
      const departmentSlotRef = departmentSlotLockRef(db, department.id, slotKey);
      const closureRef = departmentClosureRef(db, department.id, normalizedStartAt.split("T")[0]);

      const closureSnapshot = await transaction.get(closureRef);
      if (closureSnapshot.exists()) {
        throw validationError(
          `休診日のため予約できません。${closureSnapshot.data()?.reason ? ` 理由: ${closureSnapshot.data().reason}` : ""}`,
          "CLOSED"
        );
      }

      const userDepartmentSnapshot = await transaction.get(userDepartmentRef);
      if (userDepartmentSnapshot.exists()) {
        throw validationError(
          "この診療科はすでに予約済みです。変更する場合は予約一覧からお進みください。",
          "ALREADY_EXISTS"
        );
      }

      const userSlotSnapshot = await transaction.get(userSlotRef);
      if (userSlotSnapshot.exists()) {
        throw conflictError("同じ時間に別の予約があります。別の時間をお選びください。", "TIME_CONFLICT");
      }

      const departmentSlotSnapshot = await transaction.get(departmentSlotRef);
      if (departmentSlotSnapshot.exists()) {
        throw conflictError("この日時は満員です。別の日時をお選びください。", "FULL");
      }

      const appointmentPayload = {
        user_id: authUser.uid,
        department_id: department.id,
        department_name: department.name,
        status: "confirmed",
        slot_key: slotKey,
        start_at: normalizedStartAt,
        created_at: now,
        updated_at: now,
      };

      transaction.set(nextAppointmentRef, appointmentPayload);
      transaction.set(userDepartmentRef, {
        user_id: authUser.uid,
        department_id: department.id,
        appointment_id: nextAppointmentRef.id,
        updated_at: now,
      });
      transaction.set(userSlotRef, {
        user_id: authUser.uid,
        slot_key: slotKey,
        start_at: normalizedStartAt,
        appointment_id: nextAppointmentRef.id,
        updated_at: now,
      });
      transaction.set(departmentSlotRef, {
        user_id: authUser.uid,
        department_id: department.id,
        slot_key: slotKey,
        start_at: normalizedStartAt,
        appointment_id: nextAppointmentRef.id,
        updated_at: now,
      });

      return toAppointmentOut(nextAppointmentRef.id, appointmentPayload);
    });
  } catch (error) {
    throw wrapUnknownError(error, "予約に失敗しました。");
  }
}

export async function updateUserAppointment({ appointmentId, startAt }) {
  try {
    const authUser = await requireSignedInUser();
    const db = getFirestoreDb();
    const targetRef = appointmentRef(db, authUser.uid, appointmentId);

    return await runTransaction(db, async (transaction) => {
      const appointmentSnapshot = await transaction.get(targetRef);
      if (!appointmentSnapshot.exists() || appointmentSnapshot.data()?.status !== "confirmed") {
        throw notFoundError("予約が見つかりません。");
      }

      const current = appointmentSnapshot.data();
      const departmentSnapshot = await transaction.get(departmentRef(db, current.department_id));
      if (!departmentSnapshot.exists() || !departmentSnapshot.data()?.is_active) {
        throw notFoundError("診療科が見つかりません。");
      }

      const { slotKey, startAt: normalizedStartAt } = validateRequestedSlot(startAt, current.department_id);
      if (current.slot_key === slotKey) {
        throw validationError("同じ日時は選択できません。別の日時をお選びください。", "NO_CHANGE");
      }

      const closureSnapshot = await transaction.get(
        departmentClosureRef(db, current.department_id, normalizedStartAt.split("T")[0])
      );
      if (closureSnapshot.exists()) {
        throw validationError(
          `休診日のため予約変更できません。${closureSnapshot.data()?.reason ? ` 理由: ${closureSnapshot.data().reason}` : ""}`,
          "CLOSED"
        );
      }

      const nextUserSlotRef = userSlotLockRef(db, authUser.uid, slotKey);
      const nextDepartmentSlotRef = departmentSlotLockRef(db, current.department_id, slotKey);
      const nextUserSlotSnapshot = await transaction.get(nextUserSlotRef);
      if (nextUserSlotSnapshot.exists() && nextUserSlotSnapshot.data()?.appointment_id !== appointmentId) {
        throw conflictError("同じ時間に別の予約があります。別の日時をお選びください。", "TIME_CONFLICT");
      }

      const nextDepartmentSlotSnapshot = await transaction.get(nextDepartmentSlotRef);
      if (
        nextDepartmentSlotSnapshot.exists() &&
        nextDepartmentSlotSnapshot.data()?.appointment_id !== appointmentId
      ) {
        throw conflictError("この日時は満員です。別の日時をお選びください。", "FULL");
      }

      const nextPayload = {
        ...current,
        department_name: departmentSnapshot.data()?.name || current.department_name || null,
        slot_key: slotKey,
        start_at: normalizedStartAt,
        updated_at: nowIsoString(),
      };

      transaction.set(targetRef, nextPayload);
      transaction.delete(userSlotLockRef(db, authUser.uid, current.slot_key));
      transaction.delete(departmentSlotLockRef(db, current.department_id, current.slot_key));
      transaction.set(userSlotLockRef(db, authUser.uid, slotKey), {
        user_id: authUser.uid,
        slot_key: slotKey,
        start_at: normalizedStartAt,
        appointment_id: appointmentId,
        updated_at: nextPayload.updated_at,
      });
      transaction.set(departmentSlotLockRef(db, current.department_id, slotKey), {
        user_id: authUser.uid,
        department_id: current.department_id,
        slot_key: slotKey,
        start_at: normalizedStartAt,
        appointment_id: appointmentId,
        updated_at: nextPayload.updated_at,
      });
      transaction.set(
        userDepartmentLockRef(db, authUser.uid, current.department_id),
        {
          user_id: authUser.uid,
          department_id: current.department_id,
          appointment_id: appointmentId,
          updated_at: nextPayload.updated_at,
        },
        { merge: true }
      );

      return toAppointmentOut(appointmentId, nextPayload);
    });
  } catch (error) {
    throw wrapUnknownError(error, "予約変更に失敗しました。");
  }
}

export async function deleteUserAppointment(appointmentId) {
  try {
    const authUser = await requireSignedInUser();
    const db = getFirestoreDb();
    const targetRef = appointmentRef(db, authUser.uid, appointmentId);

    await runTransaction(db, async (transaction) => {
      const appointmentSnapshot = await transaction.get(targetRef);
      if (!appointmentSnapshot.exists() || appointmentSnapshot.data()?.status !== "confirmed") {
        throw notFoundError("予約が見つかりません。");
      }

      const current = appointmentSnapshot.data();
      transaction.delete(targetRef);
      transaction.delete(userDepartmentLockRef(db, authUser.uid, current.department_id));
      transaction.delete(userSlotLockRef(db, authUser.uid, current.slot_key));
      transaction.delete(departmentSlotLockRef(db, current.department_id, current.slot_key));
    });

    return { status: "ok" };
  } catch (error) {
    throw wrapUnknownError(error, "予約のキャンセルに失敗しました。");
  }
}

export async function fetchAdminDepartments() {
  try {
    await requireAdminUser();
    const db = getFirestoreDb();
    const snapshots = await getDocs(query(collection(db, "departments"), orderBy("sort_order", "asc")));
    return { items: snapshots.docs.map((snapshot) => toDepartmentOut(snapshot)) };
  } catch (error) {
    throw wrapUnknownError(error, "診療科管理情報の取得に失敗しました。");
  }
}

export async function updateDepartmentByAdmin({ departmentId, isActive }) {
  try {
    await requireAdminUser();
    const department = await getDepartment(departmentId, { requireActive: false });
    const payload = {
      name: department.name,
      sort_order: department.sort_order,
      is_active: Boolean(isActive),
      updated_at: nowIsoString(),
    };
    await setDoc(departmentRef(getFirestoreDb(), departmentId), payload, { merge: true });
    return toDepartmentOut(departmentId, payload);
  } catch (error) {
    throw wrapUnknownError(error, "診療科の更新に失敗しました。");
  }
}

export async function fetchDepartmentClosuresByAdmin() {
  try {
    await requireAdminUser();
    const db = getFirestoreDb();
    const snapshots = await getDocs(query(collection(db, "department_closures"), orderBy("date", "asc")));
    return { items: snapshots.docs.map((snapshot) => toClosureOut(snapshot)) };
  } catch (error) {
    throw wrapUnknownError(error, "休診日の取得に失敗しました。");
  }
}

export async function saveDepartmentClosureByAdmin({ departmentId, date, reason }) {
  try {
    const authUser = await requireAdminUser();
    const department = await getDepartment(departmentId, { requireActive: false });
    const db = getFirestoreDb();
    const dateValue = normalizeDateValue(date);
    const ref = departmentClosureRef(db, departmentId, dateValue);
    const snapshot = await getDoc(ref);
    const now = nowIsoString();
    const payload = {
      department_id: department.id,
      department_name: department.name,
      date: dateValue,
      reason: reason?.trim() || null,
      created_by: snapshot.data()?.created_by || authUser.uid,
      created_at: snapshot.data()?.created_at || now,
      updated_at: now,
    };

    await setDoc(ref, payload, { merge: true });
    return toClosureOut(ref.id, payload);
  } catch (error) {
    throw wrapUnknownError(error, "休診日の登録に失敗しました。");
  }
}

export async function deleteDepartmentClosureByAdmin({ departmentId, date }) {
  try {
    await requireAdminUser();
    const db = getFirestoreDb();
    await deleteDoc(departmentClosureRef(db, departmentId, date));
    return { status: "ok" };
  } catch (error) {
    throw wrapUnknownError(error, "休診日の解除に失敗しました。");
  }
}

export async function fetchDepartmentAppointmentsByAdmin({ departmentId, date }) {
  try {
    await requireAdminUser();
    const db = getFirestoreDb();
    const dateValue = normalizeDateValue(date);
    const snapshots = await getDocs(
      query(
        collectionGroup(db, "appointments"),
        where("start_at", ">=", `${dateValue}T00:00:00`),
        where("start_at", "<", `${nextDateValue(dateValue)}T00:00:00`),
        orderBy("start_at", "asc")
      )
    );

    const items = snapshots.docs
      .map((snapshot) => toAppointmentOut(snapshot))
      .filter(
        (appointment) => appointment.department_id === departmentId && appointment.status === "confirmed"
      );

    const userIds = [...new Set(items.map((appointment) => appointment.user_id))];
    const userSnapshots = await Promise.all(userIds.map((userId) => getDoc(userRef(db, userId))));
    const userMap = new Map(
      userSnapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) => [snapshot.id, snapshot.data() || {}])
    );

    return {
      items: items.map((appointment) => ({
        ...appointment,
        patient_user_name: userMap.get(appointment.user_id)?.user_name || "患者",
        patient_email: userMap.get(appointment.user_id)?.email || "",
        patient_phone: userMap.get(appointment.user_id)?.phone || null,
      })),
    };
  } catch (error) {
    throw wrapUnknownError(error, "予約一覧の取得に失敗しました。");
  }
}

export async function deleteAppointmentByAdmin({ appointmentId, userId }) {
  try {
    await requireAdminUser();
    const db = getFirestoreDb();
    const targetRef = appointmentRef(db, userId, appointmentId);

    await runTransaction(db, async (transaction) => {
      const appointmentSnapshot = await transaction.get(targetRef);
      if (!appointmentSnapshot.exists() || appointmentSnapshot.data()?.status !== "confirmed") {
        throw notFoundError("予約が見つかりません。");
      }

      const current = appointmentSnapshot.data();
      transaction.delete(targetRef);
      transaction.delete(userDepartmentLockRef(db, userId, current.department_id));
      transaction.delete(userSlotLockRef(db, userId, current.slot_key));
      transaction.delete(departmentSlotLockRef(db, current.department_id, current.slot_key));
    });

    return { status: "ok" };
  } catch (error) {
    throw wrapUnknownError(error, "予約のキャンセルに失敗しました。");
  }
}
