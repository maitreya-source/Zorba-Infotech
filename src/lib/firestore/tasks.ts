import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { publishSyncSignal } from "../realtimeSync";
import type {
  StaffTask,
  StaffTaskHistoryEntry,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from "../types";

function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v !== undefined) {
      cleaned[k] = cleanFirestoreData(v);
    }
  }
  return cleaned as T;
}

export function generateTaskAccessToken(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function getStaffTasks(): Promise<StaffTask[]> {
  try {
    const snap = await getDocs(collection(db, "staff_tasks"));
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        priority: (data.priority as TaskPriority) || "p2",
        status: (data.status as TaskStatus) || "pending",
      } as StaffTask;
    });
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.warn("getStaffTasks warning:", err);
    return [];
  }
}

export async function getStaffTaskById(id: string): Promise<StaffTask | null> {
  try {
    const docSnap = await getDoc(doc(db, "staff_tasks", id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      priority: (data.priority as TaskPriority) || "p2",
      status: (data.status as TaskStatus) || "pending",
    } as StaffTask;
  } catch (err: any) {
    console.error("getStaffTaskById error:", err);
    throw new Error(err?.message || "Failed to load task");
  }
}

export async function getStaffTasksByEmployee(employeeId: string): Promise<StaffTask[]> {
  try {
    const q = query(collection(db, "staff_tasks"), where("assignedToId", "==", employeeId));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        priority: (data.priority as TaskPriority) || "p2",
        status: (data.status as TaskStatus) || "pending",
      } as StaffTask;
    });
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error("getStaffTasksByEmployee error:", err);
    return [];
  }
}

export async function createStaffTask(
  input: Omit<StaffTask, "id" | "accessToken" | "createdAt" | "updatedAt" | "history">
): Promise<StaffTask> {
  const docRef = doc(collection(db, "staff_tasks"));
  const now = Date.now();
  const priority: TaskPriority = input.priority || "p2";
  const status: TaskStatus = input.status || "pending";
  const initialHistory: StaffTaskHistoryEntry = {
    id: `hist_${now}`,
    status,
    remarks: input.description ? `Task created: ${input.title}` : "Task created",
    updatedBy: input.createdByStaffName || "Admin",
    updatedAt: now,
  };

  const newTask: StaffTask = {
    ...input,
    id: docRef.id,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    priority,
    status,
    assignedEmployeeActive: input.assignedEmployeeActive !== false,
    accessToken: generateTaskAccessToken(),
    history: [initialHistory],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(newTask));
  publishSyncSignal("staff_tasks", { action: "create", resourceId: newTask.id });
  return newTask;
}

export async function updateStaffTask(
  id: string,
  data: Partial<StaffTask>,
  updatedByLabel = "Admin"
): Promise<void> {
  const existing = await getStaffTaskById(id);
  const now = Date.now();
  const payload: Record<string, any> = {
    ...data,
    ...(data.priority ? { priority: data.priority } : {}),
    updatedAt: now,
  };

  if (existing && (data.status || data.staffRemarks !== undefined)) {
    const nextStatus = data.status || existing.status;
    const nextRemarks = data.staffRemarks !== undefined ? data.staffRemarks : existing.staffRemarks;
    if (nextStatus !== existing.status || (data.staffRemarks && data.staffRemarks !== existing.staffRemarks)) {
      const historyEntry: StaffTaskHistoryEntry = {
        id: `hist_${now}_${Math.random().toString(36).slice(2, 6)}`,
        status: nextStatus,
        remarks: nextRemarks || `Status changed to ${nextStatus}`,
        updatedBy: updatedByLabel,
        updatedAt: now,
      };
      payload.history = [...(existing.history || []), historyEntry];
    }
  }

  await setDoc(doc(db, "staff_tasks", id), cleanFirestoreData(payload), { merge: true });
  publishSyncSignal("staff_tasks", { action: "update", resourceId: id });
}

export async function rotateStaffTaskToken(id: string): Promise<string> {
  const newToken = generateTaskAccessToken();
  await setDoc(
    doc(db, "staff_tasks", id),
    { accessToken: newToken, updatedAt: Date.now() },
    { merge: true }
  );
  publishSyncSignal("staff_tasks", { action: "update", resourceId: id });
  return newToken;
}

export async function deleteStaffTask(id: string): Promise<void> {
  await deleteDoc(doc(db, "staff_tasks", id));
  publishSyncSignal("staff_tasks", { action: "delete", resourceId: id });
}

export async function setupStaffPinFromTaskPortal(
  employeeId: string,
  newPin: string
): Promise<TeamMember> {
  const trimmedPin = newPin.trim();
  if (!/^\d{4,6}$/.test(trimmedPin)) {
    throw new Error("PIN must be 4 to 6 digits.");
  }
  const memberSnap = await getDoc(doc(db, "team_members", employeeId));
  if (!memberSnap.exists()) {
    throw new Error("Employee profile not found.");
  }
  const memberData = memberSnap.data();
  const member = { ...memberData, id: memberSnap.id, active: memberData.active !== false } as TeamMember;
  if (member.active === false) {
    throw new Error("Your employee account is currently inactive. Task link access is disabled.");
  }
  await setDoc(
    doc(db, "team_members", employeeId),
    { pin: trimmedPin },
    { merge: true }
  );
  publishSyncSignal("team", { action: "update", resourceId: employeeId });
  return { ...member, pin: trimmedPin };
}

export async function updateTaskStatusFromStaffPortal(params: {
  taskId: string;
  accessToken?: string;
  employeeId: string;
  pin: string;
  status: TaskStatus;
  remarks?: string;
}): Promise<StaffTask> {
  const task = await getStaffTaskById(params.taskId);
  if (!task) {
    throw new Error("Task not found or has been removed.");
  }
  if (task.assignedToId !== params.employeeId) {
    throw new Error("This task is no longer assigned to your profile.");
  }
  if (task.assignedEmployeeActive === false || String(task.accessToken || "").startsWith("revoked_")) {
    throw new Error("This task link has been invalidated because the employee profile is inactive.");
  }
  if (params.accessToken && task.accessToken && params.accessToken !== task.accessToken) {
    throw new Error("This task link has expired or been rotated. Please ask Admin for the latest link.");
  }

  const memberSnap = await getDoc(doc(db, "team_members", params.employeeId));
  if (!memberSnap.exists()) {
    throw new Error("Employee profile not found.");
  }
  const memberData = memberSnap.data();
  const member = { ...memberData, id: memberSnap.id, active: memberData.active !== false } as TeamMember;
  if (member.active === false) {
    throw new Error("Your employee profile is inactive. Task portal access has been revoked.");
  }
  if (!member.pin || member.pin.trim() !== params.pin.trim()) {
    throw new Error("Invalid Staff PIN. Please enter your correct personal PIN.");
  }

  const now = Date.now();
  const cleanRemarks = params.remarks?.trim() || "";
  const historyEntry: StaffTaskHistoryEntry = {
    id: `hist_${now}_${Math.random().toString(36).slice(2, 6)}`,
    status: params.status,
    remarks: cleanRemarks || `Marked as ${params.status.replace("_", " ")} via Staff Task Portal`,
    updatedBy: `${member.name} (Staff Portal)`,
    updatedAt: now,
  };

  const updatedTask: StaffTask = {
    ...task,
    status: params.status,
    staffRemarks: cleanRemarks || task.staffRemarks,
    history: [...(task.history || []), historyEntry],
    updatedAt: now,
  };

  await setDoc(
    doc(db, "staff_tasks", task.id),
    cleanFirestoreData({
      status: updatedTask.status,
      staffRemarks: updatedTask.staffRemarks,
      history: updatedTask.history,
      updatedAt: updatedTask.updatedAt,
    }),
    { merge: true }
  );
  publishSyncSignal("staff_tasks", { action: "update", resourceId: task.id });
  return updatedTask;
}
