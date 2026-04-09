import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { registerUser } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await registerUser({
        email,
        password,
        userName,
        phone,
      });
      login(data);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message || "新規登録に失敗しました。入力内容をご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="新規登録"
      subtitle="はじめて利用する方はこちらから登録してください。"
      backTo="/login"
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
              <FormLabel>お名前</FormLabel>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>電話番号</FormLabel>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormControl>

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

            <Button colorScheme="teal" onClick={handleRegister} isLoading={loading}>
              登録して予約を始める
            </Button>
          </Stack>
        </Box>

        <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
          <Stack spacing={4}>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
              登録後にできること
            </Text>
            <Text fontSize="lg">・診療科ごとの空き時間確認</Text>
            <Text fontSize="lg">・予約の登録、変更、削除</Text>
            <Text fontSize="lg">・予約内容の確認</Text>
            <Button variant="outline" onClick={() => navigate("/login")}>
              すでに登録済みの方はこちら
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>
    </PageShell>
  );
}
