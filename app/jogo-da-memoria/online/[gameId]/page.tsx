"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { OnlineMemoryGame } from '@/components/online-game/online-memory-game';
import { NicknameModal } from '@/components/online-game/nickname-modal';
import { usePlayer } from '@/lib/hooks/use-player';
import { 
  MemoryGameSession, 
  checkMemoryGameExists, 
  getMemoryGame, 
  joinMemoryGame 
} from '@/lib/supabase';

interface GamePageProps {
  params: {
    gameId: string;
  };
}

export default function GamePage({ params }: GamePageProps) {
  const { gameId } = params;
  const router = useRouter();
  const { player, isLoading: isPlayerLoading } = usePlayer();
  
  const [game, setGame] = useState<MemoryGameSession | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verificar se o jogador está pronto para jogar
  const isPlayerReady = !!player?.nickname;
  
  // Verificar se o jogo existe e carregar seus dados
  useEffect(() => {
    const loadGame = async () => {
      setIsLoadingGame(true);
      try {
        // Verificar se o jogo existe
        const exists = await checkMemoryGameExists(gameId);
        if (!exists) {
          setError('Jogo não encontrado');
          setIsLoadingGame(false);
          return;
        }
        
        // Carregar os dados do jogo
        const gameData = await getMemoryGame(gameId);
        setGame(gameData);
      } catch (error) {
        console.error('Erro ao carregar jogo:', error);
        setError('Erro ao carregar o jogo');
      } finally {
        setIsLoadingGame(false);
      }
    };
    
    // Carregar o jogo quando tivermos o ID do jogo
    if (gameId) {
      loadGame();
    }
  }, [gameId]);
  
  // Verificar se o jogador tem um apelido
  useEffect(() => {
    if (!isPlayerLoading && !player?.nickname) {
      setShowNicknameModal(true);
    }
  }, [isPlayerLoading, player]);
  
  // Juntar-se ao jogo quando o jogador estiver pronto
  useEffect(() => {
    const joinGameIfReady = async () => {
      // Verificar se temos todas as informações necessárias
      if (!isPlayerReady || !game || !player || isJoiningGame) return;
      
      // Verificar se o jogador já está no jogo
      const isPlayerInGame = 
        player.id === game.player_1_id || 
        player.id === game.player_2_id;
        
      // Se o jogador já está no jogo, não precisamos entrar novamente
      if (isPlayerInGame) return;
      
      // Verificar se o jogo está em espera
      if (game.status !== 'waiting') {
        setError('Este jogo não está aceitando novos jogadores');
        return;
      }
      
      // Juntar-se ao jogo
      setIsJoiningGame(true);
      try {
        const updatedGame = await joinMemoryGame(
          gameId,
          player.id,
          player.nickname
        );
        
        if (updatedGame) {
          setGame(updatedGame);
        } else {
          setError('Não foi possível entrar no jogo');
        }
      } catch (error) {
        console.error('Erro ao entrar no jogo:', error);
        setError('Erro ao entrar no jogo');
      } finally {
        setIsJoiningGame(false);
      }
    };
    
    joinGameIfReady();
  }, [gameId, game, player, isPlayerReady, isJoiningGame]);
  
  // Função para atualizar o estado do jogo
  const handleGameUpdate = (updatedGame: MemoryGameSession) => {
    setGame(updatedGame);
  };
  
  // Renderizar conteúdo da página
  const renderContent = () => {
    // Exibir mensagem de erro
    if (error) {
      return (
        <div className="bg-red-900/20 border border-red-900 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Erro</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Link
            href="/jogo-da-memoria/online"
            className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Voltar ao Lobby
          </Link>
        </div>
      );
    }
    
    // Exibir indicador de carregamento
    if (isLoadingGame || isJoiningGame) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p className="text-lg">
            {isLoadingGame ? 'Carregando jogo...' : 'Entrando no jogo...'}
          </p>
        </div>
      );
    }
    
    // Exibir o jogo
    if (game) {
      return <OnlineMemoryGame initialGame={game} onGameUpdate={handleGameUpdate} />;
    }
    
    // Fallback (não deveria acontecer)
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-400 mb-4">Algo deu errado.</p>
        <Link
          href="/jogo-da-memoria/online"
          className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          Voltar ao Lobby
        </Link>
      </div>
    );
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 mb-6">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link 
            href="/jogo-da-memoria/online" 
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            Voltar ao Lobby
          </Link>
          
          {player && (
            <div className="text-sm">
              Jogando como: <span className="text-blue-400 font-medium">{player.nickname}</span>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-grow px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {showNicknameModal && (
        <NicknameModal
          isOpen={showNicknameModal}
          onClose={() => {
            if (player?.nickname) {
              setShowNicknameModal(false);
            }
          }}
          onSubmit={() => {
            setShowNicknameModal(false);
          }}
        />
      )}
    </div>
  );
} 