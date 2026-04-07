// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Book from "./pages/Book";
import Appointments from "./pages/Appointments";
import { AuthProvider } from "./auth/AuthContext";
import SelectDate from "./pages/SelectDate";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/book/:id" element={<SelectDate />} />
          <Route path="/book/:id/time" element={<Book />} />
          <Route path="/appointments" element={<Appointments />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;