"use client";

import React, { useState } from 'react';
import { TextField, Button, Card, CardContent, Typography, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export const LoginForm = () => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('Por favor, digite um apelido');
      return;
    }
    
    if (nickname.length < 3) {
      setError('Seu apelido deve ter pelo menos 3 caracteres');
      return;
    }
    
    // Limpar erro e fazer login
    setError('');
    signIn(nickname);
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent>
        <Typography variant="h5" component="h2" className="mb-4 text-center">
          Entre no Jogo da Memória
        </Typography>
        
        <Typography className="mb-4 text-center">
          Para jogar online, você precisa criar um perfil temporário.
        </Typography>
        
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Seu apelido"
            variant="outlined"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mb-4"
          />
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            size="large"
          >
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 