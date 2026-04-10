import React from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function PageShell({
  title,
  subtitle,
  children,
  showBack = true,
  backTo,
  actions = null,
  heroSubtitle = "見やすく、迷いにくい予約導線を優先した患者向け画面です。",
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

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
            {heroSubtitle}
          </Text>
        </Container>
      </Box>

      <Container maxW="container.lg" py={{ base: 5, md: 8 }}>
        <Flex
          mb={6}
          direction={{ base: "column", md: "row" }}
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={4}
        >
          <HStack spacing={3} align="flex-start">
            {showBack && (
              <Button variant="outline" bg="white" onClick={handleBack}>
                戻る
              </Button>
            )}
            <Box>
              <Heading size={{ base: "md", md: "lg" }}>{title}</Heading>
              {subtitle && (
                <Text mt={2} color="surface.700" fontSize={{ base: "md", md: "lg" }}>
                  {subtitle}
                </Text>
              )}
            </Box>
          </HStack>
          {actions}
        </Flex>

        {children}
      </Container>
    </Box>
  );
}
