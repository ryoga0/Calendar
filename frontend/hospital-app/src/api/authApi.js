import {
  loginWithFirebase,
  logoutFromFirebase,
  registerWithFirebase,
} from "../firebase/patientPortal";

export function loginUser({ email, password }) {
  return loginWithFirebase({ email, password });
}

export function registerUser({ email, password, userName, phone }) {
  return registerWithFirebase({
    email,
    password,
    userName,
    phone,
  });
}

export function logoutUser() {
  return logoutFromFirebase();
}
