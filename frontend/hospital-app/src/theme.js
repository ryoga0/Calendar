import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Yu Gothic UI', 'Hiragino Sans', 'Meiryo', sans-serif",
    body: "'Yu Gothic UI', 'Hiragino Sans', 'Meiryo', sans-serif",
  },
  colors: {
    brand: {
      50: "#eef8f7",
      100: "#d4ecea",
      300: "#7fc0bb",
      500: "#1e7a71",
      700: "#114c53",
      900: "#0d2830",
    },
    surface: {
      50: "#f6fafb",
      100: "#edf4f5",
      200: "#d8e4e7",
      700: "#27434b",
      900: "#162c33",
    },
    accent: {
      500: "#c9732f",
    },
  },
  styles: {
    global: {
      body: {
        bg: "surface.100",
        color: "surface.900",
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        size: "lg",
      },
      baseStyle: {
        borderRadius: "16px",
        fontWeight: "700",
      },
    },
    Input: {
      defaultProps: {
        size: "lg",
      },
    },
    Textarea: {
      defaultProps: {
        size: "lg",
      },
    },
    FormLabel: {
      baseStyle: {
        fontSize: "md",
        fontWeight: "700",
        mb: 2,
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "24px",
        },
      },
    },
  },
});

export default theme;
