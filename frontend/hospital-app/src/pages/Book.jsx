import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { createAppointment, fetchAppointments } from "../api/appointmentApi";
import { fetchAvailability } from "../api/availabilityApi";
import { LoadingButtonGrid } from "../components/LoadingState";
import { PatientInfoItem, PatientPanel } from "../components/PatientPanels";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthContext";
import { dayPickerFormatters, dayPickerLocale } from "../utils/dayPickerLocale";
import {
  buildLocalDateTime,
  formatDateTime,
  getAppointmentCalendarDisabledDays,
  getNextSelectableAppointmentDate,
  toDateInputValue,
} from "../utils/dateTime";

export default function Book() {
  const { departmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => getNextSelectableAppointmentDate());
  const [availability, setAvailability] = useState([]);
  const [currentAppointments, setCurrentAppointments] = useState([]);
  const [closedReason, setClosedReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [submittingTime, setSubmittingTime] = useState("");
  const [confirmingSlot, setConfirmingSlot] = useState(null);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [error, setError] = useState("");
  const cancelConfirmRef = useRef(null);

  useEffect(() => {
    setAppointmentsLoading(true);
    setAppointmentsError("");

    fetchAppointments(token)
      .then((res) => setCurrentAppointments(res.items || []))
      .catch((e) => {
        setCurrentAppointments([]);
        setAppointmentsError(e.message || "現在の予約情報の取得に失敗しました。");
      })
      .finally(() => setAppointmentsLoading(false));
  }, [token]);

  useEffect(() => {
    const dateParam = toDateInputValue(selectedDate);
    setLoading(true);
    setError("");
    setClosedReason("");

    fetchAvailability({ departmentId, date: dateParam, token })
      .then((res) => {
        setAvailability(res.items);
        setClosedReason(res.closed_reason || "");
      })
      .catch((e) => {
        setAvailability([]);
        setClosedReason("");
        setError(e.message || "予約可能時間の取得に失敗しました。");
      })
      .finally(() => setLoading(false));
  }, [departmentId, selectedDate, token]);

  const allUnavailable = useMemo(
    () => availability.length > 0 && availability.every((item) => !item.available),
    [availability]
  );
  const selectedDepartmentName = location.state?.departmentName || "診療科";
  const confirmationStartAt = confirmingSlot
    ? buildLocalDateTime(selectedDate, confirmingSlot.time)
    : "";
  const displayedError = error || appointmentsError;

  const handleOpenConfirmation = (item) => {
    const nextStartAt = buildLocalDateTime(selectedDate, item.time);
    const sameDepartmentAppointment = currentAppointments.find(
      (appointment) => appointment.department_id === departmentId
    );
    const sameTimeAppointment = currentAppointments.find(
      (appointment) => appointment.start_at === nextStartAt
    );

    setError("");

    if (sameDepartmentAppointment) {
      setConfirmingSlot(null);
      setError("この診療科はすでに予約済みです。変更する場合は予約一覧からお進みください。");
      return;
    }

    if (sameTimeAppointment) {
      setConfirmingSlot(null);
      setError("同じ時間に別の予約があります。別の時間をお選びください。");
      return;
    }

    setConfirmingSlot(item);
  };

  const handleReserve = async () => {
    if (!confirmingSlot) {
      return;
    }

    setSubmittingTime(confirmingSlot.time);
    setError("");

    try {
      await createAppointment({
        departmentId,
        startAt: confirmationStartAt,
        token,
      });
      setConfirmingSlot(null);
      navigate("/appointments", {
        replace: true,
        state: { message: "予約が完了しました。" },
      });
    } catch (e) {
      setError(e.message || "予約に失敗しました。");
    } finally {
      setSubmittingTime("");
    }
  };

  return (
    <PageShell
      title="新しい予約"
      subtitle={`${location.state?.departmentName || "診療科"}の予約可能時間を確認して選択してください。`}
    >
      {displayedError && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{displayedError}</Text>
        </Alert>
      )}

      <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} gap={6}>
        <GridItem>
          <PatientPanel title="日付を選択" description="受診したい日をカレンダーから選びます。">
            <Box className="calendar-picker">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(value) => value && setSelectedDate(value)}
                disabled={getAppointmentCalendarDisabledDays()}
                locale={dayPickerLocale}
                formatters={dayPickerFormatters}
                lang="ja"
              />
            </Box>
          </PatientPanel>
        </GridItem>

        <GridItem>
          <PatientPanel
            title={selectedDepartmentName}
            description="空いている時間から受診枠を選択できます。"
            minH="420px"
          >
            <Stack spacing={5}>
              <PatientInfoItem
                label="選択中の日付"
                value={selectedDate.toLocaleDateString()}
                helper="空いている時間だけ予約できます。"
              />

              <Heading size="md">{selectedDate.toLocaleDateString()} の予約可能時間</Heading>

              {loading ? (
                <LoadingButtonGrid />
              ) : closedReason ? (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text>{`この日は予約を受け付けていません。${closedReason}`}</Text>
                </Alert>
              ) : availability.length === 0 ? (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text>この日は予約枠がありません。別の日を選択してください。</Text>
                </Alert>
              ) : (
                <>
                  {allUnavailable && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Text>
                        {closedReason
                          ? `この日は予約を受け付けていません。${closedReason}`
                          : "この日はすべて埋まっています。別の日を選ぶと、他の日の空き状況を確認できます。"}
                      </Text>
                    </Alert>
                  )}

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {availability.map((item) => (
                      <Button
                        key={item.time}
                        h="72px"
                        justifyContent="space-between"
                        colorScheme={item.available ? "teal" : "gray"}
                        variant={item.available ? "solid" : "outline"}
                        isDisabled={!item.available || appointmentsLoading || Boolean(appointmentsError)}
                        isLoading={submittingTime === item.time}
                        onClick={() => handleOpenConfirmation(item)}
                      >
                        <Text fontSize="lg" fontWeight="800">
                          {item.time}
                        </Text>
                        <Text fontSize="sm">{item.available ? "予約する" : item.reason}</Text>
                      </Button>
                    ))}
                  </SimpleGrid>
                </>
              )}
            </Stack>
          </PatientPanel>
        </GridItem>
      </Grid>

      <AlertDialog
        isOpen={Boolean(confirmingSlot)}
        leastDestructiveRef={cancelConfirmRef}
        onClose={() => !submittingTime && setConfirmingSlot(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              予約内容の確認
            </AlertDialogHeader>

            <AlertDialogBody>
              <Stack spacing={3}>
                <Text>この内容で予約を確定してもよろしいですか。</Text>
                <PatientInfoItem label="診療科" value={selectedDepartmentName} />
                <PatientInfoItem
                  label="予約日時"
                  value={confirmationStartAt ? formatDateTime(confirmationStartAt) : "未選択"}
                />
              </Stack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelConfirmRef}
                onClick={() => setConfirmingSlot(null)}
                isDisabled={Boolean(submittingTime)}
              >
                戻る
              </Button>
              <Button
                colorScheme="teal"
                ml={3}
                onClick={handleReserve}
                isLoading={Boolean(submittingTime)}
              >
                この内容で予約する
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </PageShell>
  );
}
