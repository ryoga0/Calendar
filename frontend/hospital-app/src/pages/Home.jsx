import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Heading,
  Button,
  VStack,
} from "@chakra-ui/react";

export default function Home() {
  const { token, logout } = useAuth();
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/departments", "GET", null, token)
      .then((res) => setDepartments(res.items))
      .catch(() => alert("取得失敗"));
  }, []);

  return (
    <Box p={6}>
      <Heading mb={4}>診療科</Heading>

      <VStack spacing={4} align="stretch">
        <Button
          colorScheme="blue"
          onClick={() => navigate("/appointments")}
        >
          予約一覧
        </Button>

        {!token && (
          <Button
            colorScheme="teal"
            onClick={() => navigate("/login")}
          >
            ログイン
          </Button>
        )}

        {token && (
          <Button
            colorScheme="red"
            onClick={logout}
          >
            ログアウト
          </Button>
        )}

        {departments.map((d) => (
          <Button
            key={d.id}
            size="lg"
            onClick={() => navigate(`/book/${d.name}`)}
          >
            {d.name}
          </Button>
        ))}
      </VStack>
    </Box>
  );
}