import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Alert,
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
import { CalendarLoadingCard, LoadingButtonGrid, LoadingCard } from "../components/LoadingState";
import PageShell from "../components/PageShell";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { dayPickerFormatters, dayPickerLocale } from "../utils/dayPickerLocale";
import { buildLocalDateTime, formatDateTime, toDateInputValue } from "../utils/dateTime";

export default function AppointmentEdit() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submittingTime, setSubmittingTime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPageLoading(true);
    setError("");

    apiFetch(`/appointments/${appointmentId}`, "GET", null, token)
      .then((res) => {
        setAppointment(res);
        setSelectedDate(new Date(res.start_at));
      })
      .catch((e) => setError(e.message || "予約情報の取得に失敗しました。"))
      .finally(() => setPageLoading(false));
  }, [appointmentId, token]);

  useEffect(() => {
    if (!appointment || !selectedDate) {
      return;
    }

    setAvailabilityLoading(true);
    setError("");

    const dateParam = toDateInputValue(selectedDate);
    apiFetch(
      `/availability?department_id=${appointment.department_id}&date=${dateParam}&exclude_appointment_id=${appointment.id}`,
      "GET",
      null,
      token
    )
      .then((res) => setAvailability(res.items))
      .catch((e) => setError(e.message || "予約可能時間の取得に失敗しました。"))
      .finally(() => setAvailabilityLoading(false));
  }, [appointment, selectedDate, token]);

  const unavailableCount = useMemo(
    () => availability.filter((item) => !item.available).length,
    [availability]
  );

  const handleUpdate = async (time) => {
    if (!selectedDate) {
      return;
    }

    setSubmittingTime(time);
    setError("");

    try {
      await apiFetch(
        `/appointments/${appointmentId}`,
        "PATCH",
        { start_at: buildLocalDateTime(selectedDate, time) },
        token
      );
      navigate(`/appointments/${appointmentId}`, {
        state: { message: "予約日時を変更しました。" },
        replace: true,
      });
    } catch (e) {
      setError(e.message || "予約変更に失敗しました。");
    } finally {
      setSubmittingTime("");
    }
  };

  return (
    <PageShell
      title="予約変更"
      subtitle="同じ診療科の中で、都合のよい日時へ変更できます。"
    >
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {pageLoading ? (
        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} gap={6}>
          <CalendarLoadingCard />
          <LoadingCard minH="460px" titleWidth="34%" lines={6}>
            <LoadingButtonGrid />
          </LoadingCard>
        </Grid>
      ) : appointment ? (
        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} gap={6}>
        <GridItem>
          <Box bg="white" borderRadius="24px" p={5} boxShadow="sm">
            <Heading size="md" mb={4}>
              日付を選択
            </Heading>
            <Box className="calendar-picker">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={{ before: new Date() }}
                locale={dayPickerLocale}
                formatters={dayPickerFormatters}
                lang="ja"
              />
            </Box>
          </Box>
        </GridItem>

          <GridItem>
            <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm" minH="460px">
              <Stack spacing={5}>
                <Box>
                  <Text color="surface.700">診療科</Text>
                  <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" mt={1}>
                    {appointment.department_name}
                  </Text>
                </Box>

                <Box>
                  <Text color="surface.700">現在の予約</Text>
                  <Text fontSize="lg" fontWeight="700" mt={1}>
                    {formatDateTime(appointment.start_at)}
                  </Text>
                </Box>

                {availabilityLoading ? (
                  <LoadingButtonGrid />
                ) : (
                  <>
                    <Heading size="md">
                      {selectedDate?.toLocaleDateString()} の予約可能時間
                    </Heading>

                    {availability.length === 0 ? (
                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <Text>この日は予約枠がありません。別の日をお選びください。</Text>
                      </Alert>
                    ) : (
                      <>
                        {unavailableCount === availability.length && (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            <Text>
                              この日は空きがありません。別の日を選ぶと予約可能な時間を確認できます。
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
                              isDisabled={!item.available}
                              isLoading={submittingTime === item.time}
                              onClick={() => handleUpdate(item.time)}
                            >
                              <Text fontSize="lg" fontWeight="800">
                                {item.time}
                              </Text>
                              <Text fontSize="sm">
                                {item.available ? "変更する" : item.reason}
                              </Text>
                            </Button>
                          ))}
                        </SimpleGrid>
                      </>
                    )}
                  </>
                )}
              </Stack>
            </Box>
          </GridItem>
        </Grid>
      ) : null}
    </PageShell>
  );
}
