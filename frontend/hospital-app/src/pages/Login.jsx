import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import PageShell from "../components/PageShell";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/auth/login", "POST", { email, password });
      login(data);
      navigate(location.state?.from || "/", { replace: true });
    } catch (e) {
      setError(e.message || "ログインに失敗しました。メールアドレスとパスワードをご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="ログイン"
      subtitle="すでに登録済みの方はこちらからお進みください。"
      backTo="/"
    >
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
          <Stack spacing={4}>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text>{error}</Text>
              </Alert>
            )}

            <FormControl>
              <FormLabel>メールアドレス</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>パスワード</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>

            <Button colorScheme="teal" onClick={handleLogin} isLoading={loading}>
              ログインする
            </Button>
          </Stack>
        </Box>

        <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
          <Stack spacing={4}>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
              はじめてご利用の方
            </Text>
            <Text fontSize="lg" color="surface.700">
              新規登録画面で、お名前・メールアドレス・電話番号を登録してから予約を始められます。
            </Text>
            <Button variant="outline" onClick={() => navigate("/register")}>
              新規登録へ進む
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>
    </PageShell>
  );
}
