import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { createAppointment } from "../api/appointmentApi";
import { fetchAvailability } from "../api/availabilityApi";
import { LoadingButtonGrid } from "../components/LoadingState";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthContext";
import { dayPickerFormatters, dayPickerLocale } from "../utils/dayPickerLocale";
import { buildLocalDateTime, toDateInputValue } from "../utils/dateTime";

export default function Book() {
  const { departmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [closedReason, setClosedReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingTime, setSubmittingTime] = useState("");
  const [error, setError] = useState("");

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

  const handleReserve = async (time) => {
    setSubmittingTime(time);
    setError("");

    try {
      await createAppointment({
        departmentId,
        startAt: buildLocalDateTime(selectedDate, time),
        token,
      });
      navigate("/appointments", {
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
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

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
                onSelect={(value) => value && setSelectedDate(value)}
                disabled={{ before: new Date() }}
                locale={dayPickerLocale}
                formatters={dayPickerFormatters}
                lang="ja"
              />
            </Box>
          </Box>
        </GridItem>

        <GridItem>
          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm" minH="420px">
            <Stack spacing={5}>
              <Heading size="md">
                {selectedDate.toLocaleDateString()} の予約可能時間
              </Heading>

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
                        isDisabled={!item.available}
                        isLoading={submittingTime === item.time}
                        onClick={() => handleReserve(item.time)}
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
          </Box>
        </GridItem>
      </Grid>
    </PageShell>
  );
}
