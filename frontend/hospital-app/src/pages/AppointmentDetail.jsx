import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { deleteAppointment, fetchAppointment } from "../api/appointmentApi";
import { LoadingCard } from "../components/LoadingState";
import { PatientInfoGrid, PatientInfoItem, PatientPanel } from "../components/PatientPanels";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime } from "../utils/dateTime";

export default function AppointmentDetail() {
  const { appointmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetchAppointment({ appointmentId, token })
      .then((res) => setAppointment(res))
      .catch((e) => setError(e.message || "予約詳細の取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, [appointmentId, token]);

  const handleCancel = async () => {
    if (!confirm("この予約をキャンセルしますか？")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteAppointment({ appointmentId, token });
      navigate("/appointments", {
        state: { message: "予約をキャンセルしました。" },
        replace: true,
      });
    } catch (e) {
      setError(e.message || "予約のキャンセルに失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell
      title="予約詳細"
      subtitle="内容を確認して、日時変更またはキャンセルを行えます。"
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
        <LoadingCard minH="320px" titleWidth="30%" lines={6} />
      ) : appointment ? (
        <PatientPanel
          title={appointment.department_name}
          description="予約内容を確認して、日時変更またはキャンセルを行えます。"
          badge={{ label: "予約確定", colorScheme: "green" }}
        >
          <Stack spacing={5}>
            <PatientInfoGrid columns={{ base: 1, md: 2 }}>
              <PatientInfoItem
                label="予約日時"
                value={formatDateTime(appointment.start_at)}
                helper="当日は予約時間の10分前を目安に受付へお越しください。"
              />
              <PatientInfoItem
                label="現在の状態"
                value="予約確定"
                badge={{ label: "受診予定", colorScheme: "green" }}
              />
            </PatientInfoGrid>

            <Stack direction={{ base: "column", md: "row" }} spacing={3}>
              <Button
                colorScheme="teal"
                onClick={() => navigate(`/appointments/${appointmentId}/edit`)}
              >
                日時を変更する
              </Button>
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleCancel}
                isLoading={deleting}
              >
                キャンセルする
              </Button>
              <Button variant="ghost" onClick={() => navigate("/appointments")}>
                一覧へ戻る
              </Button>
            </Stack>
          </Stack>
        </PatientPanel>
      ) : null}
    </PageShell>
  );
}
