import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import {
  Box,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Container,
  Flex,
} from "@chakra-ui/react";

export default function Book() {
  const { id } = useParams();
  const { token } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingTime, setLoadingTime] = useState(null);
  const [reservedTimes, setReservedTimes] = useState([]); // ←追加

  const defaultTimes = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
  ];

  // 予約済み時間を取得
  useEffect(() => {
    if (!selectedDate) return;

    const fetchReservations = async () => {
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];

        const res = await apiFetch(
          `/appointments?date=${dateStr}&department_id=${id}`,
          "GET",
          null,
          token
        );

        const times = (res.items || res).map((a) => {
          const d = new Date(a.start_at);
          return `${String(d.getHours()).padStart(2, "0")}:${String(
            d.getMinutes()
          ).padStart(2, "0")}`;
        });

        setReservedTimes(times);
      } catch (e) {
        console.error(e);
      }
    };

    fetchReservations();
  }, [selectedDate, id]);

  const handleReserve = async (time) => {
    if (!selectedDate) return;

    setLoadingTime(time);

    const datetime = new Date(selectedDate);
    const [hour, minute] = time.split(":").map(Number);

    datetime.setHours(hour, minute, 0, 0);

    const localDateTime = `${datetime.getFullYear()}-${String(
      datetime.getMonth() + 1
    ).padStart(2, "0")}-${String(datetime.getDate()).padStart(
      2,
      "0"
    )}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}:00`;

    try {
      await apiFetch(
        "/appointments",
        "POST",
        {
          department_id: id,
          start_at: localDateTime,
        },
        token
      );

      alert(`予約しました: ${localDateTime}`);

      // 再取得（画面更新）
      setSelectedDate(new Date(selectedDate));
    } catch (e) {
      alert(e.message || "予約失敗");
    } finally {
      setLoadingTime(null);
    }
  };

  return (
    <Container maxW="container.lg" py={6}>
      <Heading mb={4}>予約</Heading>
      <Text mb={6}>診療科: {id}</Text>

      {/* レイアウト */}
      <Flex
        justify={selectedDate ? "flex-start" : "center"}
        align="flex-start"
        gap={10}
        minH="400px"
        transition="all 0.4s ease"
      >
        {/* カレンダー */}
        <Box
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          boxShadow="md"
          minW="300px"
          transition="all 0.4s ease"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            styles={{
              caption: { fontSize: "1.5rem" },
              head_cell: { fontSize: "1.1rem" },
              cell: { padding: "10px" },
              day: {
                width: "48px",
                height: "48px",
                fontSize: "1.1rem",
              },
            }}
          />
        </Box>

        {/* 時間（右に出る） */}
        {selectedDate && (
          <Box
            flex="1"
            minW="320px"
            transition="all 0.4s ease"
          >
            <Heading size="md" mb={4}>
              {selectedDate.toLocaleDateString()} の予約
            </Heading>

            <SimpleGrid columns={3} spacing={4}>
              {defaultTimes.map((time) => {
                const isReserved = reservedTimes.includes(time);

                return (
                  <Button
                    key={time}
                    size="lg"
                    colorScheme={isReserved ? "gray" : "teal"}
                    onClick={() => handleReserve(time)}
                    isLoading={loadingTime === time}
                    isDisabled={isReserved} // ←押せない
                  >
                    {isReserved ? `${time} 満` : time}
                  </Button>
                );
              })}
            </SimpleGrid>
          </Box>
        )}
      </Flex>
    </Container>
  );
}