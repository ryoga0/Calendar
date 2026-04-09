import React from "react";
import { Box, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export function LoadingCard({
  minH = "240px",
  titleWidth = "42%",
  lines = 4,
  children = null,
}) {
  return (
    <Box
      bg="white"
      borderRadius="24px"
      p={{ base: 5, md: 7 }}
      boxShadow="sm"
      minH={minH}
    >
      <Stack spacing={4}>
        <Skeleton height="28px" width={titleWidth} borderRadius="md" />
        {children || <SkeletonText noOfLines={lines} spacing="4" skeletonHeight="4" />}
      </Stack>
    </Box>
  );
}

export function LoadingButtonGrid({
  count = 6,
  columns = { base: 1, md: 2 },
  height = "72px",
}) {
  return (
    <SimpleGrid columns={columns} spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} height={height} borderRadius="16px" />
      ))}
    </SimpleGrid>
  );
}

export function CalendarLoadingCard() {
  return (
    <Box bg="white" borderRadius="24px" p={5} boxShadow="sm" minH="420px">
      <Stack spacing={4}>
        <Skeleton height="28px" width="36%" borderRadius="md" />
        <Skeleton height="36px" width="54%" alignSelf="center" borderRadius="md" />
        <SimpleGrid columns={7} spacing={2}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={`weekday-${index}`} height="16px" borderRadius="sm" />
          ))}
        </SimpleGrid>
        <SimpleGrid columns={7} spacing={2}>
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} height="44px" borderRadius="16px" />
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
