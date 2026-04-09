import { fetchActiveDepartments } from "../firebase/patientPortal";

export function fetchDepartments(token) {
  return fetchActiveDepartments(token);
}
