import React from "react";
import {
  Badge,
  Box,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

export function PatientPanel({
  title,
  description,
  badge,
  minH,
  children,
  ...props
}) {
  return (
    <Box
      bg="white"
      borderRadius="24px"
      p={{ base: 5, md: 7 }}
      boxShadow="sm"
      minH={minH}
      {...props}
    >
      <Stack spacing={5}>
        {(title || description || badge) && (
          <Stack spacing={3}>
            {badge ? (
              <Badge
                alignSelf="flex-start"
                colorScheme={badge.colorScheme || "teal"}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                {badge.label}
              </Badge>
            ) : null}
            {title ? (
              <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text fontSize="lg" color="surface.700">
                {description}
              </Text>
            ) : null}
          </Stack>
        )}
        {children}
      </Stack>
    </Box>
  );
}

export function PatientInfoGrid({ columns = { base: 1, md: 2 }, children, ...props }) {
  return (
    <SimpleGrid columns={columns} spacing={3} {...props}>
      {children}
    </SimpleGrid>
  );
}

export function PatientInfoItem({ label, value, helper, badge }) {
  return (
    <Box bg="surface.100" borderRadius="20px" p={4}>
      <Stack spacing={2}>
        <Text fontSize="sm" color="surface.700">
          {label}
        </Text>
        <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="800">
          {value}
        </Text>
        {helper ? (
          <Text fontSize="sm" color="surface.700">
            {helper}
          </Text>
        ) : null}
        {badge ? (
          <Badge
            alignSelf="flex-start"
            colorScheme={badge.colorScheme || "teal"}
            px={3}
            py={1}
            borderRadius="full"
          >
            {badge.label}
          </Badge>
        ) : null}
      </Stack>
    </Box>
  );
}
