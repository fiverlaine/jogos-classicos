'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Player = {
  id: string;
  nickname: string;
};

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Efeito para recuperar o jogador do localStorage no carregamento inicial
  useEffect(() => {
    const loadPlayer = () => {
      try {
        // Recuperar do localStorage
        const storedId = localStorage.getItem('jogoVelhaUserId');
        const storedNickname = localStorage.getItem('jogoVelhaNickname');
        
        if (storedId && storedNickname) {
          setPlayer({
            id: storedId,
            nickname: storedNickname
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do jogador:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Verificar se estamos no navegador (client-side)
    if (typeof window !== 'undefined') {
      loadPlayer();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Função para definir as informações do jogador
  const setPlayerInfo = (nickname: string, id?: string) => {
    try {
      const playerId = id || uuidv4();
      
      // Salvar no localStorage
      localStorage.setItem('jogoVelhaUserId', playerId);
      localStorage.setItem('jogoVelhaNickname', nickname);
      
      // Atualizar o estado
      const playerData = {
        id: playerId,
        nickname: nickname
      };
      
      setPlayer(playerData);
      
      return playerId;
    } catch (error) {
      console.error('Erro ao salvar dados do jogador:', error);
      return null;
    }
  };
  
  // Função para limpar as informações do jogador
  const clearPlayerInfo = () => {
    try {
      localStorage.removeItem('jogoVelhaUserId');
      localStorage.removeItem('jogoVelhaNickname');
      setPlayer(null);
    } catch (error) {
      console.error('Erro ao limpar dados do jogador:', error);
    }
  };
  
  return { 
    player, 
    isLoading, 
    setPlayerInfo,
    clearPlayerInfo,
    isAuthenticated: !!player
  };
} 