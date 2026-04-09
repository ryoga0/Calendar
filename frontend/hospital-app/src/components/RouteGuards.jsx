import React from "react";
import { Box, Container, Heading, Text } from "@chakra-ui/react";
import { LoadingCard } from "./LoadingState";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LoadingScreen() {
  return (
    <Box minH="100vh" bg="surface.100">
      <Box
        bg="linear-gradient(135deg, #114c53 0%, #1e7a71 100%)"
        color="white"
        py={{ base: 6, md: 8 }}
        px={4}
        boxShadow="sm"
      >
        <Container maxW="container.lg">
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" letterSpacing="0.08em">
            HOSPITAL RESERVATION
          </Text>
          <Heading mt={2} size={{ base: "lg", md: "xl" }}>
            総合病院 予約カレンダー
          </Heading>
          <Text mt={2} fontSize={{ base: "md", md: "lg" }} opacity={0.92}>
            ログイン情報を確認しています。
          </Text>
        </Container>
      </Box>

      <Container maxW="container.lg" py={{ base: 5, md: 8 }}>
        <LoadingCard minH="260px" titleWidth="30%" lines={5} />
      </Container>
    </Box>
  );
}

export function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}
