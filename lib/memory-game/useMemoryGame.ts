import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from 'use-local-storage';
import { io, Socket } from 'socket.io-client';
import { 
  MemoryGame, 
  getMemoryGame, 
  listAvailableMemoryGames, 
  joinMemoryGame 
} from './memoryGameService';

// Socket global
let memorySocket: Socket | null = null;

// Inicializar socket
const getMemorySocket = () => {
  if (!memorySocket) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    memorySocket = io(`${API_URL}/memory`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
    
    memorySocket.on('connect', () => {
      console.log('Conectado ao servidor de jogos da memória');
    });
    
    memorySocket.on('connect_error', (err) => {
      console.error('Erro de conexão com servidor de jogos:', err.message);
    });
  }
  
  return memorySocket;
};

// Hook para listar jogos disponíveis
export const useAvailableMemoryGames = () => {
  const [games, setGames] = useLocalStorage<MemoryGame[]>('memory_available_games', []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refreshGames = useCallback(async () => {
    try {
      setLoading(true);
      const availableGames = await listAvailableMemoryGames();
      setGames(availableGames);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar jogos disponíveis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setGames]);
  
  useEffect(() => {
    refreshGames();
    
    // Configurar socket para atualização em tempo real
    const socket = getMemorySocket();
    
    socket.on('game_created', (newGame: MemoryGame) => {
      setGames(prev => {
        // Evitar duplicação
        if (prev.some(g => g.id === newGame.id)) return prev;
        return [newGame, ...prev];
      });
    });
    
    socket.on('game_updated', (game: MemoryGame) => {
      setGames(prev => {
        // Remover jogos que não estão mais disponíveis
        if (game.status !== 'waiting') {
          return prev.filter(g => g.id !== game.id);
        }
        
        // Atualizar jogo existente
        return prev.map(g => g.id === game.id ? game : g);
      });
    });
    
    // Refrescar a cada 30 segundos como fallback
    const interval = setInterval(refreshGames, 30000);
    
    return () => {
      socket.off('game_created');
      socket.off('game_updated');
      clearInterval(interval);
    };
  }, [refreshGames, setGames]);
  
  return { games, loading, error, refreshGames };
};

// Hook para um jogo específico
export const useMemoryGame = (gameId: string) => {
  const [game, setGame] = useState<MemoryGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      const gameData = await getMemoryGame(gameId);
      setGame(gameData);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar jogo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);
  
  const joinGame = useCallback(async (playerId: string, playerNickname: string) => {
    if (!gameId) return null;
    
    try {
      const updatedGame = await joinMemoryGame(gameId, playerId, playerNickname);
      setGame(updatedGame);
      return updatedGame;
    } catch (err) {
      setError('Falha ao entrar no jogo');
      console.error(err);
      return null;
    }
  }, [gameId]);
  
  useEffect(() => {
    loadGame();
    
    // Configurar socket para atualizações do jogo
    const socket = getMemorySocket();
    
    // Entrar na sala específica do jogo
    socket.emit('join_game_room', gameId);
    
    // Ouvir atualizações deste jogo específico
    const handleGameUpdate = (updatedGame: MemoryGame) => {
      if (updatedGame.id === gameId) {
        setGame(updatedGame);
      }
    };
    
    socket.on('game_updated', handleGameUpdate);
    socket.on('player_joined', handleGameUpdate);
    socket.on('card_flipped', handleGameUpdate);
    socket.on('turn_changed', handleGameUpdate);
    socket.on('game_finished', handleGameUpdate);
    
    return () => {
      socket.emit('leave_game_room', gameId);
      socket.off('game_updated');
      socket.off('player_joined');
      socket.off('card_flipped');
      socket.off('turn_changed');
      socket.off('game_finished');
    };
  }, [gameId, loadGame]);
  
  return { game, loading, error, loadGame, joinGame };
};

// Hook para controle de revanche
export const useMemoryRematch = (gameId: string | null) => {
  const [rematchState, setRematchState] = useState({
    isOpen: false,
    isRequesting: false,
    isReceiving: false,
    requestedBy: '',
    newGameId: null as string | null
  });
  
  useEffect(() => {
    if (!gameId) return;
    
    const socket = getMemorySocket();
    
    socket.on('rematch_requested', (data: any) => {
      if (data.gameId === gameId) {
        setRematchState(prev => ({
          ...prev,
          isOpen: true,
          isReceiving: true,
          requestedBy: data.playerId
        }));
      }
    });
    
    socket.on('rematch_accepted', (data: any) => {
      if (data.oldGameId === gameId) {
        setRematchState(prev => ({
          ...prev,
          isOpen: true,
          newGameId: data.newGameId
        }));
      }
    });
    
    return () => {
      socket.off('rematch_requested');
      socket.off('rematch_accepted');
    };
  }, [gameId]);
  
  return { rematchState, setRematchState };
}; 