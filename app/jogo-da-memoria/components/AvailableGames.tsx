import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, Button, Alert, CircularProgress } from '@mui/material';
import { useAvailableMemoryGames } from '@/lib/memory-game/useMemoryGame';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export const AvailableGames = () => {
  const { games, loading, error, refreshGames } = useAvailableMemoryGames();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Atualizar a lista a cada 10 segundos
    const intervalId = setInterval(() => {
      refreshGames();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [refreshGames]);

  const handleJoinGame = (gameId: string) => {
    router.push(`/jogo-da-memoria/online/${gameId}`);
  };

  if (loading && games.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className="mb-4">
        Erro ao carregar jogos: {error}
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Partidas Disponíveis</h2>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={refreshGames}
          startIcon={<RefreshIcon />}
        >
          Atualizar
        </Button>
      </div>

      {games.length === 0 ? (
        <Alert severity="info">
          Não há jogos disponíveis no momento. Crie um novo jogo!
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card key={game.id} className="game-card">
              <CardHeader
                title={`Jogo de ${game.creatorNickname}`}
                subheader={`Criado em: ${new Date(game.createdAt).toLocaleString()}`}
              />
              <CardContent>
                <p>Tabuleiro: {game.rows}x{game.cols}</p>
                <p>Jogadores: {game.players.length}/2</p>
                <Button 
                  variant="contained" 
                  color="primary"
                  fullWidth
                  className="mt-4"
                  onClick={() => handleJoinGame(game.id)}
                  disabled={!user}
                >
                  Entrar no Jogo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 