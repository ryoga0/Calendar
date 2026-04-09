import {
  createUserAppointment,
  deleteUserAppointment,
  fetchUserAppointment,
  fetchUserAppointments,
  updateUserAppointment,
} from "../firebase/patientPortal";

export function fetchAppointments(token) {
  return fetchUserAppointments(token);
}

export function fetchAppointment({ appointmentId, token }) {
  return fetchUserAppointment(appointmentId, token);
}

export function createAppointment({ departmentId, startAt, token }) {
  return createUserAppointment({ departmentId, startAt, token });
}

export function updateAppointment({ appointmentId, startAt, token }) {
  return updateUserAppointment({ appointmentId, startAt, token });
}

export function deleteAppointment({ appointmentId, token }) {
  return deleteUserAppointment(appointmentId, token);
}
