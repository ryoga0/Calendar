import {
  deleteAppointmentByAdmin,
  deleteDepartmentByAdmin,
  deleteDepartmentClosureByAdmin,
  fetchAdminDepartments,
  fetchAuditLogsByAdmin,
  fetchDepartmentAppointmentsByAdmin,
  fetchDepartmentClosuresByAdmin,
  reorderDepartmentsByAdmin,
  saveDepartmentByAdmin,
  saveDepartmentClosureByAdmin,
  updateDepartmentByAdmin,
} from "../firebase/patientPortal";

export function fetchManagedDepartments(token) {
  return fetchAdminDepartments(token);
}

export function updateDepartmentStatus({ departmentId, isActive, token }) {
  return updateDepartmentByAdmin({ departmentId, isActive, token });
}

export function saveManagedDepartment({ departmentId, name, sortOrder, isActive, token }) {
  return saveDepartmentByAdmin({ departmentId, name, sortOrder, isActive, token });
}

export function deleteManagedDepartment({ departmentId, token }) {
  return deleteDepartmentByAdmin({ departmentId, token });
}

export function reorderManagedDepartments({ orderedDepartmentIds, token }) {
  return reorderDepartmentsByAdmin({ orderedDepartmentIds, token });
}

export function fetchDepartmentClosures(token) {
  return fetchDepartmentClosuresByAdmin(token);
}

export function saveDepartmentClosure({ departmentId, date, reason, token }) {
  return saveDepartmentClosureByAdmin({ departmentId, date, reason, token });
}

export function deleteDepartmentClosure({ departmentId, date, token }) {
  return deleteDepartmentClosureByAdmin({ departmentId, date, token });
}

export function fetchDepartmentAppointments({ departmentId, date, token }) {
  return fetchDepartmentAppointmentsByAdmin({ departmentId, date, token });
}

export function cancelAppointmentByAdmin({ appointmentId, userId, token }) {
  return deleteAppointmentByAdmin({ appointmentId, userId, token });
}

export function fetchAuditLogs(token) {
  return fetchAuditLogsByAdmin(token);
}
