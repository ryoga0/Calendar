import { fetchDailyAvailability } from "../firebase/patientPortal";

export function fetchAvailability({ departmentId, date, token, excludeAppointmentId }) {
  return fetchDailyAvailability({ departmentId, date, token, excludeAppointmentId });
}
