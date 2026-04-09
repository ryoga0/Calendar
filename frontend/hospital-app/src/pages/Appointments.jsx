import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LoadingCard } from "../components/LoadingState";
import PageShell from "../components/PageShell";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime } from "../utils/dateTime";

export default function Appointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  const loadAppointments = () => {
    setLoading(true);
    setError("");

    apiFetch("/appointments", "GET", null, token)
      .then((res) => setAppointments(res.items))
      .catch((e) => setError(e.message || "予約一覧の取得に失敗しました。"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, [token]);

  const handleCancel = async (appointmentId) => {
    if (!confirm("この予約をキャンセルしますか？")) {
      return;
    }

    setLoadingId(appointmentId);
    setError("");

    try {
      await apiFetch(`/appointments/${appointmentId}`, "DELETE", null, token);
      loadAppointments();
    } catch (e) {
      setError(e.message || "予約のキャンセルに失敗しました。");
    } finally {
      setLoadingId("");
    }
  };

  return (
    <PageShell
      title="予約一覧"
      subtitle="現在の予約を確認し、詳細表示・日時変更・キャンセルができます。"
    >
      {location.state?.message && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{location.state.message}</Text>
        </Alert>
      )}

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {loading ? (
        <Stack spacing={4}>
          <LoadingCard minH="180px" titleWidth="32%" lines={4} />
          <LoadingCard minH="180px" titleWidth="32%" lines={4} />
        </Stack>
      ) : appointments.length === 0 ? (
        <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
          <Stack spacing={4}>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
              現在、予約はありません
            </Text>
            <Text fontSize="lg" color="surface.700">
              診療科を選んで、新しい予約をお取りください。
            </Text>
            <Button colorScheme="teal" alignSelf="flex-start" onClick={() => navigate("/")}>
              診療科を選ぶ
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={4}>
          {appointments.map((appointment) => (
            <Box key={appointment.id} bg="white" borderRadius="24px" p={{ base: 5, md: 6 }} boxShadow="sm">
              <Stack spacing={4}>
                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
                  {appointment.department_name}
                </Text>
                <Text fontSize="lg">{formatDateTime(appointment.start_at)}</Text>
                <HStack spacing={3} flexWrap="wrap">
                  <Button
                    colorScheme="teal"
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    詳細を見る
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/appointments/${appointment.id}/edit`)}
                  >
                    日時を変更する
                  </Button>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleCancel(appointment.id)}
                    isLoading={loadingId === appointment.id}
                  >
                    キャンセルする
                  </Button>
                </HStack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </PageShell>
  );
}
