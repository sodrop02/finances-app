import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  colorSchemes: { dark: true },
  cssVariables: { colorSchemeSelector: 'media' },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});
