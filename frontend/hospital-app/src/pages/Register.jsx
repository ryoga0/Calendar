import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import {
  Box,
  Heading,
  Input,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Container,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // state
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const message = location.state?.message;

  const handleRegister = async () => {
    setLoading(true);

    try {
      const data = await apiFetch("/auth/register", "POST", {
        email,
        password,
        name,
        phone,
      });

      login(data);
      navigate("/");
    } catch (e) {
      alert(e.message || "登録失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container centerContent>
      <Box
        w="100%"
        maxW="400px"
        p={6}
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="md"
      >
        <Heading mb={6} textAlign="center">
          新規登録
        </Heading>

        {/* メッセージ表示 */}
        {message && (
          <Alert status="warning" mb={4}>
            <AlertIcon />
            {message}
          </Alert>
        )}

        <VStack spacing={4}>
          <FormControl>
            <FormLabel>名前</FormLabel>
            <Input
              size="lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>電話番号</FormLabel>
            <Input
              size="lg"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>メールアドレス</FormLabel>
            <Input
              type="email"
              size="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>パスワード</FormLabel>
            <Input
              type="password"
              size="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>

          <Button
            colorScheme="teal"
            size="lg"
            w="100%"
            onClick={handleRegister}
            isLoading={loading}
          >
            登録する
          </Button>

          <Button
            variant="link"
            onClick={() => navigate("/login")}
          >
            ログインに戻る
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}