import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { PatientPanel } from "../components/PatientPanels";
import PageShell from "../components/PageShell";
import { updateCurrentUser } from "../api/userApi";
import { useAuth } from "../auth/AuthContext";

export default function Profile() {
  const { token, user, refreshUser } = useAuth();
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    setUserName(user.user_name || "");
    setPhone(user.phone || "");
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await updateCurrentUser({ token, userName, phone });
      refreshUser(updated);
      setMessage("プロフィールを更新しました。");
    } catch (e) {
      setError(e.message || "プロフィールの更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="プロフィール"
      subtitle="受付で確認しやすいように、お名前と電話番号を最新に保ってください。"
    >
      {message && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{message}</Text>
        </Alert>
      )}

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      <PatientPanel
        title="登録情報"
        description="受付で確認しやすいように、お名前と電話番号を最新に保ってください。"
      >
        <Stack spacing={5}>
          <FormControl>
            <FormLabel>お名前</FormLabel>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
          </FormControl>

          <FormControl>
            <FormLabel>メールアドレス</FormLabel>
            <Input value={user?.email || ""} isReadOnly />
          </FormControl>

          <FormControl>
            <FormLabel>電話番号</FormLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormControl>

          <Button colorScheme="teal" alignSelf="flex-start" onClick={handleSave} isLoading={saving}>
            保存する
          </Button>
        </Stack>
      </PatientPanel>
    </PageShell>
  );
}
