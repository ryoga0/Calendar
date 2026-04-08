import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
  HStack,
  Spinner,
} from "@chakra-ui/react";

export default function Appointments() {
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);

    apiFetch("/appointments", "GET", null, token)
      .then((res) => setList(res.items || res))
      .catch(() => alert("取得失敗"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    if (!confirm("キャンセルしますか？")) return;

    setLoadingId(id);

    try {
      await apiFetch(`/appointments/${id}`, "DELETE", null, token);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Container py={6}>
      <Heading mb={6}>予約一覧</Heading>

      {loading ? (
        <Spinner />
      ) : (
        <VStack spacing={4} align="stretch">
          {list.map((a) => {
            const date = new Date(a.start_at);

            return (
              <Box
                key={a.id}
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="sm"
              >
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="bold">
                      {a.department_name || a.department_id}
                    </Text>

                    <Text>
                      {date.toLocaleDateString()}{" "}
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Box>

                  <Button
                    colorScheme="red"
                    size="md"
                    onClick={() => cancel(a.id)}
                    isLoading={loadingId === a.id}
                  >
                    キャンセル
                  </Button>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </Container>
  );
}