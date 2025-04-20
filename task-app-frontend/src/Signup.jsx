import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Box, Typography } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Signup = ({ onSignupSuccess }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/signup', formData);
      toast.success('User created successfully');
      if (onSignupSuccess) onSignupSuccess();
    } catch (error) {
      toast.error('Error signing up');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: '#f4f4f4',
      }}
    >
      <ToastContainer />
      <Box
        sx={{
          width: 400,
          p: 4,
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          Sign Up for TaskApp
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            sx={{ mb: 3 }}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ py: 1.5, fontSize: '1rem', bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
          >
            Sign Up
          </Button>
          <Button
            variant="text"
            sx={{ mt: 2, color: '#1976d2' }}
            onClick={onSignupSuccess}
          >
            Already have an account? Log In
          </Button>
        </form>
      </Box>
    </Box>
  );
};

export default Signup;