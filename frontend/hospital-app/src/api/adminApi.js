import {
  deleteAppointmentByAdmin,
  deleteDepartmentClosureByAdmin,
  fetchAdminDepartments,
  fetchDepartmentAppointmentsByAdmin,
  fetchDepartmentClosuresByAdmin,
  saveDepartmentClosureByAdmin,
  updateDepartmentByAdmin,
} from "../firebase/patientPortal";

export function fetchManagedDepartments(token) {
  return fetchAdminDepartments(token);
}

export function updateDepartmentStatus({ departmentId, isActive, token }) {
  return updateDepartmentByAdmin({ departmentId, isActive, token });
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
