import { useParams } from "react-router-dom";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  SimpleGrid,
  Container,
} from "@chakra-ui/react";

export default function Book() {
  const { id } = useParams();
  const { token } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingTime, setLoadingTime] = useState(null);

  const defaultTimes = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
  ];

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
    } catch (e) {
      alert(e.message || "予約失敗");
    } finally {
      setLoadingTime(null);
    }
  };

  return (
    <Container py={6}>
      <Heading mb={4}>予約</Heading>

      <Text mb={4}>診療科: {id}</Text>

      <Box mb={6}>
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      </Box>

      {selectedDate && (
        <Box>
          <Heading size="md" mb={4}>
            {selectedDate.toLocaleDateString()} の予約
          </Heading>

          <SimpleGrid columns={2} spacing={4}>
            {defaultTimes.map((time) => (
              <Button
                key={time}
                size="lg"
                colorScheme="teal"
                onClick={() => handleReserve(time)}
                isLoading={loadingTime === time}
              >
                {time}
              </Button>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Container>
  );
}