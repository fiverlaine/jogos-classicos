'use client';

import { useEffect, useState } from 'react';
import { Heart, Medal, RotateCcw, Trophy, AlertCircle } from 'lucide-react';
import {
  MemoryGameSession,
  MemoryCard,
  flipMemoryCard,
  requestMemoryRematch,
  subscribeToMemoryGame,
  unsubscribeFromChannel
} from '@/lib/supabase';
import { usePlayer } from '@/lib/hooks/use-player';
import { RematchModal } from './rematch-modal';
import { useRouter } from 'next/navigation';

interface OnlineMemoryGameProps {
  initialGame: MemoryGameSession;
  onGameUpdate?: (game: MemoryGameSession) => void;
}

export function OnlineMemoryGame({ initialGame, onGameUpdate }: OnlineMemoryGameProps) {
  const router = useRouter();
  const { player } = usePlayer();
  const [game, setGame] = useState<MemoryGameSession>(initialGame);
  const [isRematchModalOpen, setIsRematchModalOpen] = useState(false);
  const [rematchGameId, setRematchGameId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [waitingForReset, setWaitingForReset] = useState(false);
  const [isRequestingRematch, setIsRequestingRematch] = useState(false);
  const [isReceivingRematch, setIsReceivingRematch] = useState(false);
  
  // Identificar se o jogador é o jogador 1 ou 2
  const isPlayer1 = player?.id === game.player_1_id;
  const isPlayer2 = player?.id === game.player_2_id;
  const isCurrentPlayer = player?.id === game.current_player_id;
  
  // Obter os nomes dos jogadores
  const player1Name = game.player_1_nickname;
  const player2Name = game.player_2_nickname || 'Aguardando jogador...';
  
  // Obter a pontuação dos jogadores
  const player1Score = game.player_1_matches;
  const player2Score = game.player_2_matches;
  
  // Determinar o status do jogo
  const isGameFinished = game.status === 'finished';
  const isGameWaiting = game.status === 'waiting';
  const isGamePlaying = game.status === 'playing';
  
  // Verificar se há um vencedor
  const isWinner = isGameFinished && game.winner_id === player?.id;
  const isDraw = isGameFinished && game.winner_id === null;
  
  // Verificar se alguém solicitou revanche
  const hasRematchRequest = !!game.rematch_requested_by;
  const playerRequestedRematch = game.rematch_requested_by === player?.id;
  const opponentRequestedRematch = game.rematch_requested_by && game.rematch_requested_by !== player?.id;
  
  // Nome do oponente
  const opponentNickname = isPlayer1 ? player2Name : player1Name;
  
  // Efeito para assinar as atualizações do jogo em tempo real
  useEffect(() => {
    // Inscreve-se para atualizações em tempo real
    const subscription = subscribeToMemoryGame(game.id, (payload: any) => {
      const updatedGame = payload.new as MemoryGameSession;
      setGame(updatedGame);
      
      // Se houver um ID de revanche, atualiza o estado
      if (updatedGame.rematch_game_id && !rematchGameId) {
        setRematchGameId(updatedGame.rematch_game_id);
        setIsRematchModalOpen(true);
        setIsReceivingRematch(true);
      }
      
      // Verifica se há uma solicitação de revanche
      if (updatedGame.rematch_requested_by && updatedGame.rematch_requested_by !== player?.id) {
        setIsRematchModalOpen(true);
        setIsReceivingRematch(true);
      }
      
      // Notifica o componente pai sobre a atualização
      if (onGameUpdate) {
        onGameUpdate(updatedGame);
      }
    });
    
    // Inicializa as cartas após os jogadores entrarem
    if (game.status === 'playing' && game.cards && game.cards.every(c => !c.iconName)) {
      initializeCards();
    }
    
    // Limpa a inscrição quando o componente é desmontado
    return () => {
      unsubscribeFromChannel(subscription);
    };
  }, [game.id, rematchGameId, player?.id]);
  
  // Função para inicializar as cartas
  const initializeCards = async () => {
    // Lista de ícones disponíveis
    const iconNames = [
      'Heart', 'Star', 'Moon', 'Sun', 'Cloud', 
      'Umbrella', 'Pencil', 'Camera', 'Gift', 'Music', 
      'Bell', 'Anchor', 'Airplane', 'Tree', 'Car', 
      'Key', 'Lock', 'Crown', 'Diamond', 'Clock'
    ];

    // Lista de cores
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#33FFF5',
      '#F533FF', '#FF8C33', '#33FF8C', '#8C33FF', '#FFFF33'
    ];
    
    const { rows, cols } = game.grid_config;
    const totalPairs = (rows * cols) / 2;
    
    // Embaralhar os ícones e selecionar os pares necessários
    const shuffledIcons = [...iconNames].sort(() => Math.random() - 0.5).slice(0, totalPairs);
    
    // Cria pares de cartas
    let pairs: { iconName: string, color: string }[] = [];
    shuffledIcons.forEach(iconName => {
      // Escolhe uma cor aleatória para o par
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Adiciona duas cartas com o mesmo ícone e cor
      pairs.push({ iconName, color: randomColor });
      pairs.push({ iconName, color: randomColor });
    });
    
    // Embaralha todos os pares
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
    
    // Cria o array de cartas com as informações atualizadas
    const updatedCards: MemoryCard[] = shuffledPairs.map((pair, index) => ({
      id: index,
      iconName: pair.iconName,
      color: pair.color,
      isFlipped: false,
      isMatched: false
    }));
    
    // Atualiza o estado do jogo localmente
    setGame(prevGame => ({
      ...prevGame,
      cards: updatedCards
    }));
    
    // Enviar as cartas atualizadas para o servidor
    try {
      const { data, error } = await fetch(`/api/memory-game/${game.id}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cards: updatedCards,
          grid_config: game.grid_config
        })
      }).then(res => res.json());
      
      if (error) {
        console.error('Erro ao inicializar cartas:', error);
      }
    } catch (error) {
      console.error('Erro ao inicializar cartas:', error);
    }
  };
  
  // Função para lidar com o clique em uma carta
  const handleCardClick = async (cardId: number) => {
    // Verifica se não é a vez do jogador
    if (!isCurrentPlayer) return;
    
    // Verifica se o jogo acabou
    if (isGameFinished) return;
    
    // Verifica se estamos aguardando reset de cartas não correspondentes
    if (waitingForReset) return;
    
    // Verifica se a carta já está virada
    const card = game.cards[cardId];
    if (card.isFlipped || card.isMatched) return;
    
    try {
      // Atualiza o estado local imediatamente para feedback visual
      const updatedCards = [...game.cards];
      updatedCards[cardId] = { ...card, isFlipped: true };
      
      setGame(prevGame => ({
        ...prevGame,
        cards: updatedCards
      }));
      
      // Registra a carta virada localmente
      const newFlippedCards = [...flippedCards, cardId];
      setFlippedCards(newFlippedCards);
      
      // Se já viramos 2 cartas, verifica se são um par
      if (newFlippedCards.length === 2) {
        const [firstCardId, secondCardId] = newFlippedCards;
        const firstCard = updatedCards[firstCardId];
        const secondCard = updatedCards[secondCardId];
        
        // Se as cartas não formam um par, aguarda um tempo e depois desvira
        if (firstCard.iconName !== secondCard.iconName) {
          setWaitingForReset(true);
          setTimeout(() => {
            // Desvira as cartas localmente
            const resetCards = [...updatedCards];
            resetCards[firstCardId] = { ...firstCard, isFlipped: false };
            resetCards[secondCardId] = { ...secondCard, isFlipped: false };
            
            setGame(prevGame => ({
              ...prevGame,
              cards: resetCards
            }));
            
            setFlippedCards([]);
            setWaitingForReset(false);
          }, 1000);
        } else {
          // Limpa as cartas viradas quando formam um par
          setFlippedCards([]);
        }
      }
      
      // Envia a jogada para o servidor
      await flipMemoryCard(game.id, player!.id, cardId);
    } catch (error) {
      console.error('Erro ao virar carta:', error);
    }
  };
  
  // Função para solicitar revanche
  const handleRequestRematch = async () => {
    if (!player) return;
    
    try {
      setIsRequestingRematch(true);
      setIsRematchModalOpen(true);
      
      const result = await requestMemoryRematch(game.id, player.id);
      
      if (result && result.rematch_game_id) {
        setRematchGameId(result.rematch_game_id);
      }
    } catch (error) {
      console.error('Erro ao solicitar revanche:', error);
      setIsRequestingRematch(false);
    }
  };
  
  // Função para aceitar revanche
  const handleAcceptRematch = () => {
    if (rematchGameId) {
      router.push(`/jogo-da-memoria/online/${rematchGameId}`);
    }
  };
  
  // Função para recusar revanche
  const handleDeclineRematch = () => {
    setIsRematchModalOpen(false);
    setIsReceivingRematch(false);
  };
  
  // Função para fechar o modal de revanche
  const handleCloseRematchModal = () => {
    setIsRematchModalOpen(false);
    setIsRequestingRematch(false);
    setIsReceivingRematch(false);
  };
  
  // Renderiza as cartas do jogo
  const renderCards = () => {
    const { rows, cols } = game.grid_config;
    
    return (
      <div 
        className="grid gap-2 w-full max-w-3xl mx-auto perspective-500"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {game.cards.map((card, index) => (
          <div 
            key={index} 
            className={`memory-card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="memory-card-inner">
              <div className="memory-card-front">
                <div className="memory-card-content">?</div>
              </div>
              <div className="memory-card-back">
                <div 
                  className="memory-card-content" 
                  style={{ color: card.color }}
                >
                  {card.iconName}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Informações do Jogo */}
      <div className="flex justify-between items-center mb-4 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center">
          <div className={`mr-2 ${isCurrentPlayer && isPlayer1 ? 'text-yellow-400' : ''}`}>
            {player1Name}: {player1Score}
          </div>
          {isPlayer1 && <Heart className="h-4 w-4 text-red-500" />}
        </div>
        
        <div className="text-center">
          {isGameWaiting && (
            <span className="text-yellow-400">Aguardando oponente...</span>
          )}
          {isGamePlaying && !isGameFinished && (
            <span>
              {isCurrentPlayer 
                ? <span className="text-green-400">Sua vez</span>
                : <span className="text-yellow-400">Vez do oponente</span>
              }
            </span>
          )}
          {isGameFinished && (
            <span>
              {isWinner && <span className="text-green-400">Você venceu! 🎉</span>}
              {!isWinner && !isDraw && <span className="text-red-400">Você perdeu!</span>}
              {isDraw && <span className="text-yellow-400">Empate!</span>}
            </span>
          )}
        </div>
        
        <div className="flex items-center">
          <div className={`mr-2 ${isCurrentPlayer && isPlayer2 ? 'text-yellow-400' : ''}`}>
            {player2Name}: {player2Score}
          </div>
          {isPlayer2 && <Heart className="h-4 w-4 text-red-500" />}
        </div>
      </div>
      
      {/* Tabuleiro */}
      <div className="p-4 bg-gray-800 rounded-lg">
        {renderCards()}
      </div>
      
      {/* Barra de Status e Controles */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg flex justify-between items-center">
        <div>
          {opponentRequestedRematch && (
            <div className="flex items-center text-yellow-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              Oponente solicitou revanche
            </div>
          )}
          {playerRequestedRematch && (
            <div className="flex items-center text-blue-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              Revanche solicitada
            </div>
          )}
        </div>
        
        <div>
          {isGameFinished && !rematchGameId && !playerRequestedRematch && (
            <button
              onClick={handleRequestRematch}
              className="flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Solicitar Revanche
            </button>
          )}
        </div>
      </div>
      
      {/* Modal de Revanche */}
      <RematchModal
        isOpen={isRematchModalOpen}
        isRequesting={isRequestingRematch}
        isReceiving={isReceivingRematch}
        opponentNickname={opponentNickname}
        onClose={handleCloseRematchModal}
        onAccept={handleAcceptRematch}
        onDecline={handleDeclineRematch}
        onRequest={handleRequestRematch}
      />
    </div>
  );
} 