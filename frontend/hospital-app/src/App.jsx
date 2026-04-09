import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import AppointmentDetail from "./pages/AppointmentDetail";
import AppointmentEdit from "./pages/AppointmentEdit";
import Appointments from "./pages/Appointments";
import Book from "./pages/Book";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/book/:departmentId"
            element={
              <ProtectedRoute>
                <Book />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/:appointmentId"
            element={
              <ProtectedRoute>
                <AppointmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/:appointmentId/edit"
            element={
              <ProtectedRoute>
                <AppointmentEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
