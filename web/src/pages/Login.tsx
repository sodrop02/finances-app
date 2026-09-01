import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useLogin } from '../lib/queries';

export function Login() {
  const [password, setPassword] = useState('');
  const login = useLogin();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 360, maxWidth: '100%' }} elevation={2}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          💸 Finances
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Enter your app password.
        </Typography>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate(password);
          }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            fullWidth
          />
          {login.isError && <Alert severity="error">Wrong password</Alert>}
          <Button type="submit" variant="contained" disabled={login.isPending}>
            {login.isPending ? 'Checking…' : 'Log in'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
