import { fetchCurrentUserProfile, updateCurrentUserProfile } from "../firebase/patientPortal";

export function fetchCurrentUser(token) {
  return fetchCurrentUserProfile(token);
}

export function updateCurrentUser({ token, userName, phone }) {
  return updateCurrentUserProfile({
    userName,
    phone,
    token,
  });
}
