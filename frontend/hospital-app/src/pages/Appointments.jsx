import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { deleteAppointment, fetchAppointments } from "../api/appointmentApi";
import { LoadingCard } from "../components/LoadingState";
import { PatientInfoGrid, PatientInfoItem, PatientPanel } from "../components/PatientPanels";
import PageShell from "../components/PageShell";
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

    fetchAppointments(token)
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
      await deleteAppointment({ appointmentId, token });
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
        <PatientPanel
          title="現在、予約はありません"
          description="診療科を選んで、新しい予約をお取りください。"
        >
          <Stack spacing={4}>
            <Button colorScheme="teal" alignSelf="flex-start" onClick={() => navigate("/")}>
              診療科を選ぶ
            </Button>
          </Stack>
        </PatientPanel>
      ) : (
        <Stack spacing={4}>
          {appointments.map((appointment) => (
            <PatientPanel
              key={appointment.id}
              title={appointment.department_name}
              description="予約内容の確認、日時変更、キャンセルを行えます。"
              badge={{ label: "予約確定", colorScheme: "green" }}
            >
              <Stack spacing={4}>
                <PatientInfoGrid columns={{ base: 1, md: 2 }}>
                  <PatientInfoItem
                    label="予約日時"
                    value={formatDateTime(appointment.start_at)}
                    helper="詳細ページから変更やキャンセルができます。"
                  />
                  <PatientInfoItem
                    label="現在の状態"
                    value="予約確定"
                    helper="来院前に日時をご確認ください。"
                  />
                </PatientInfoGrid>
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
            </PatientPanel>
          ))}
        </Stack>
      )}
    </PageShell>
  );
}
