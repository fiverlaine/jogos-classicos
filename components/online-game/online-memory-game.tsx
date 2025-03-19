'use client';

import React, { useEffect, useState, useRef } from 'react';
import '@/styles/card-fixed-no-circle.css'; // Importar estilos consolidados para corrigir os ícones sem círculos
import { Heart, Medal, RotateCcw, Trophy, AlertCircle, Clock, Users, 
  // Importar explicitamente os ícones que usaremos para as cartas
  Heart as HeartIcon, 
  Star, 
  Moon, 
  Sun, 
  Cloud, 
  Umbrella, 
  Pencil, 
  Camera, 
  Gift, 
  Music, 
  Bell, 
  Anchor, 
  Airplay,
  Trees,
  Car, 
  Key, 
  Lock, 
  Crown, 
  Diamond
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// Mapeamento de nomes de ícones para componentes Lucide
import * as LucideIcons from 'lucide-react';

interface OnlineMemoryGameProps {
  initialGame: MemoryGameSession;
  onGameUpdate?: (game: MemoryGameSession) => void;
}

// Pré-carregar explicitamente TODOS os componentes de ícone diretamente
const allIconComponents: Record<string, React.ComponentType<any>> = {
  Heart: HeartIcon,
  Star: Star,
  Moon: Moon,
  Sun: Sun,
  Cloud: Cloud,
  Umbrella: Umbrella,
  Pencil: Pencil,
  Camera: Camera,
  Gift: Gift,
  Music: Music,
  Bell: Bell,
  Anchor: Anchor,
  Airplay: Airplay,
  Trees: Trees,
  Car: Car,
  Key: Key,
  Lock: Lock,
  Crown: Crown,
  Diamond: Diamond
};

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
  const [gameTime, setGameTime] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | 'draw' | 'playing'>('playing');
  
  // Identificar se o jogador é o jogador 1 ou 2
  const isPlayer1 = player?.id === game.player_1_id;
  const isPlayer2 = player?.id === game.player_2_id;
  const isCurrentPlayer = player?.id === game.current_player_id;
  
  // Obter os nomes dos jogadores
  const player1Name = game.player_1_nickname;
  const player2Name = game.player_2_nickname || 'Aguardando jogador...';
  
  // Obter a pontuação dos jogadores
  const player1Score = game.player_1_matches;
  const player2Score = game.player_2_matches || 0;
  
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

  // Referências para os elementos de áudio pré-carregados
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  const matchAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Pré-carregar os sons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Criar elementos de áudio uma vez e reutilizá-los
      flipAudioRef.current = new Audio("/sounds/flip.mp3");
      matchAudioRef.current = new Audio("/sounds/match.mp3");
      winAudioRef.current = new Audio("/sounds/win.mp3");
      
      // Configurar volume
      if (flipAudioRef.current) flipAudioRef.current.volume = 0.3;
      if (matchAudioRef.current) matchAudioRef.current.volume = 0.3;
      if (winAudioRef.current) winAudioRef.current.volume = 0.4;
    }
    
    return () => {
      // Limpar os elementos de áudio na desmontagem
      if (flipAudioRef.current) flipAudioRef.current = null;
      if (matchAudioRef.current) matchAudioRef.current = null;
      if (winAudioRef.current) winAudioRef.current = null;
    };
  }, []);
  
  // Função para reproduzir som com tratamento de erro
  const playSound = (audioRef: React.RefObject<HTMLAudioElement>) => {
    try {
      if (audioRef.current) {
        // Reiniciar o áudio para poder reproduzir novamente
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
          // Silenciado para melhor experiência
        });
      }
    } catch (error) {
      // Silenciar erros de áudio para não atrapalhar a experiência
    }
  };

  // Mapeamento de nomes de ícones para emojis
  const emojiMap: {[key: string]: string} = {
    Heart: '❤️',
    Star: '⭐',
    Moon: '🌙',
    Sun: '☀️',
    Cloud: '☁️',
    Umbrella: '☂️',
    Pencil: '✏️',
    Camera: '📷',
    Gift: '🎁',
    Music: '🎵',
    Bell: '🔔',
    Anchor: '⚓',
    Airplay: '📱',
    Trees: '🌳',
    Car: '🚗',
    Key: '🔑',
    Lock: '🔒',
    Crown: '👑',
    Diamond: '💎'
  };
  
  // Timer para o jogo
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isGamePlaying && !isGameFinished) {
      interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGamePlaying, isGameFinished]);

  // Formatador de tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Efeito para assinar as atualizações do jogo em tempo real
  useEffect(() => {
    // Inscreve-se para atualizações em tempo real
    const subscription = subscribeToMemoryGame(game.id, (payload: any) => {
      const updatedGame = payload.new as MemoryGameSession;
      
      // Verificar se há cartas com ícones inválidos e corrigi-las
      if (updatedGame.cards && updatedGame.cards.some(card => 
          card.iconName && !allIconComponents[card.iconName])) {
        
        // Mapear nomes de ícones antigos para os novos
        const iconCorrections: {[key: string]: string} = {
          'Tree': 'Trees',
          'Airplane': 'Airplay'
        };
        
        // Criar cópia das cartas com os ícones corrigidos
        const correctedCards = updatedGame.cards.map(card => {
          if (card.iconName && iconCorrections[card.iconName]) {
            return {
              ...card,
              iconName: iconCorrections[card.iconName]
            };
          }
          return card;
        });
        
        // Verificar se houve correções
        const hasCorrections = correctedCards.some((card, index) => 
          card.iconName !== updatedGame.cards[index].iconName);
        
        // Atualizar o jogo com as cartas corrigidas
        updatedGame.cards = correctedCards;
        
        // Se houve correções, persistir no servidor
        if (hasCorrections && player && isCurrentPlayer) {
          // Enviar as cartas corrigidas para o servidor
          fetch(`/api/memory-game/${game.id}/update-cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cards: correctedCards
            })
          }).catch(error => {
            console.error('Erro ao salvar correções de ícones:', error);
          });
        }
      }
      
      // Debug - logar o estado das cartas
      if (updatedGame.cards) {
        const flippedCards = updatedGame.cards.filter(c => c.isFlipped && !c.isMatched);
        if (flippedCards.length > 0) {
          console.log('Cartas viradas:', flippedCards.length, 
                    'Cartas viradas com iconName:', flippedCards.filter(c => c.iconName).length);
        }
      }
      
      // Detectar mudanças de turno e mudanças nas cartas
      const isNewTurn = updatedGame.current_player_id !== game.current_player_id;
      
      // Verificar se alguma carta foi virada ou desvirada
      const cardsFlippedState = JSON.stringify(updatedGame.cards.map(c => ({id: c.id, flipped: c.isFlipped, matched: c.isMatched})));
      const previousCardsFlippedState = JSON.stringify(game.cards.map(c => ({id: c.id, flipped: c.isFlipped, matched: c.isMatched})));
      const resetChanged = game.last_reset !== payload.new.last_reset;
    const cardsStateChanged = cardsFlippedState !== previousCardsFlippedState || resetChanged;
      
      // Verificar se há novas cartas sendo viradas
      const newFlippedCards = updatedGame.cards.filter(c => c.isFlipped && !c.isMatched).length;
      const previousFlippedCards = game.cards.filter(c => c.isFlipped && !c.isMatched).length;
      const cardsBeingFlipped = newFlippedCards > previousFlippedCards;
      
      // Se cartas estão sendo viradas pelo oponente, reproduzir som
      if (cardsBeingFlipped && !isCurrentPlayer) {
        playSound(flipAudioRef);
      }
      
      // Verificar se houve novas cartas correspondentes
      const previousMatchedCount = game.cards.filter(c => c.isMatched).length;
      const currentMatchedCount = updatedGame.cards.filter(c => c.isMatched).length;
      
      if (currentMatchedCount > previousMatchedCount) {
        // Houve um novo par encontrado
        if (!isCurrentPlayer) {
          // Oponente encontrou um par, tocar som
          playSound(matchAudioRef);
        }
      }
      
      // Verificar se cartas foram desviradas (não formaram par)
      const cardsReset = newFlippedCards < previousFlippedCards && currentMatchedCount === previousMatchedCount;
      
      // Verificação para garantir que as cartas sejam desviradas corretamente quando não formam par
      if (cardsReset || (isNewTurn && newFlippedCards === 0 && previousFlippedCards > 0)) {
        // Reset local das cartas viradas
        setFlippedCards([]);
        setWaitingForReset(false);
      }
      
      // Atualizar o estado do jogo com as informações do servidor
      // Forçar reset das cartas viradas quando houver reset do servidor
const shouldResetFlipped = game.last_reset !== updatedGame.last_reset;

setGame(prevGame => ({
  ...updatedGame,
  cards: shouldResetFlipped 
    ? updatedGame.cards.map(c => ({...c, isFlipped: false}))
    : updatedGame.cards
}));
      
      // Atualizar estado de jogador atual
      const wasCurrentPlayer = player?.id === game.current_player_id;
      const isNowCurrentPlayer = player?.id === updatedGame.current_player_id;
      
      // Se o turno mudou, forçar o reset de estados locais
      if (isNewTurn) {
        console.log(`Turno mudou: ${wasCurrentPlayer ? 'Era minha vez' : 'Era vez do oponente'} -> ${isNowCurrentPlayer ? 'Agora é minha vez' : 'Agora é vez do oponente'}`);
        
        setWaitingForReset(false);
        setFlippedCards([]);
        
        // Notificar mudança de turno ao jogador
        if (isNowCurrentPlayer) {
          toast.info("É a sua vez de jogar!", {
            duration: 1500,
            className: "bg-green-800 text-green-100 border-green-700"
          });
        }
      }
      
      // Se o jogo acabou, mostramos uma animação de confetti para o vencedor
      if (updatedGame.status === 'finished' && updatedGame.winner_id === player?.id) {
        confetti({
          particleCount: 200,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        toast("🎉 Parabéns! Você venceu o jogo! 🏆", {
          className: "bg-purple-900 text-purple-100 border-purple-700"
        });
        
        // Som de vitória
        playSound(winAudioRef);
      }
      
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
    if (game.status === 'playing' && game.cards) {
      // Verificar se as cartas precisam de inicialização (sem iconName)
      const needsInitialization = game.cards.some(card => !card.iconName);
      if (needsInitialization) {
        console.log('Inicializando cartas do jogo...');
        initializeCards();
      } else {
        console.log('Cartas já estão inicializadas:', game.cards);
        
        // Verificar e corrigir ícones inválidos em cartas já inicializadas
        const hasInvalidIcons = game.cards.some(card => 
          card.iconName && !allIconComponents[card.iconName]);
        
        if (hasInvalidIcons) {
          console.log('Corrigindo ícones inválidos em cartas existentes');
          
          // Mapear nomes de ícones antigos para os novos
          const iconCorrections: {[key: string]: string} = {
            'Tree': 'Trees',
            'Airplane': 'Airplay'
          };
          
          // Corrigir as cartas localmente
          const correctedCards = game.cards.map(card => {
            if (card.iconName && iconCorrections[card.iconName]) {
              console.log(`Corrigindo ícone '${card.iconName}' para '${iconCorrections[card.iconName]}'`);
              return {
                ...card,
                iconName: iconCorrections[card.iconName]
              };
            }
            return card;
          });
          
          // Atualizar o estado local com as cartas corrigidas
          setGame(prevGame => ({
            ...prevGame,
            cards: correctedCards
          }));
        }
      }
    }
    
    // Limpa a inscrição quando o componente é desmontado
    return () => {
      unsubscribeFromChannel(subscription);
    };
  }, [game.id, rematchGameId, player?.id]);
  
  // Adicionar um efeito para forçar a renderização de todas as cartas no carregamento inicial
  useEffect(() => {
    // Garantir que o estado das cartas inclui as informações de ícone
    if (game.cards && game.cards.length > 0) {
      const anyCardMissingIconName = game.cards.some(card => !card.iconName);
      
      if (anyCardMissingIconName) {
        console.log('Detectado cartas sem iconName - corrigindo...');
        
        // Se o jogo já começou e há cartas sem iconName, tentar inicializar
        if (isGamePlaying) {
          console.log('Tentando inicializar cartas faltando iconName...');
          initializeCards();
        }
      }
    }
  }, [game.cards, isGamePlaying]);
  
  // Função para inicializar as cartas (modificada para garantir ícones corretos)
  const initializeCards = async () => {
    // Lista de ícones disponíveis - usar apenas os que temos certeza que estão definidos
    const availableIcons = [
      'Heart', 'Star', 'Moon', 'Sun', 'Cloud', 
      'Umbrella', 'Pencil', 'Camera', 'Gift', 'Music', 
      'Bell', 'Anchor', 'Airplay', 'Trees', 'Car',
      'Key', 'Lock', 'Crown', 'Diamond'
    ];
    
    // Validar que todos os ícones estão disponíveis

    // Lista de cores
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#33FFF5',
      '#F533FF', '#FF8C33', '#33FF8C', '#8C33FF', '#FFFF33'
    ];
    
    const { rows, cols } = game.grid_config;
    const totalPairs = (rows * cols) / 2;
    
    // Verificar se temos ícones suficientes
    if (availableIcons.length < totalPairs) {
      console.error(`Não há ícones suficientes! Temos ${availableIcons.length} ícones para ${totalPairs} pares.`);
      // Repetir ícones se necessário
      while (availableIcons.length < totalPairs) {
        availableIcons.push(...availableIcons);
      }
    }
    
    // Embaralhar os ícones e selecionar os pares necessários
    const shuffledIcons = [...availableIcons]
      .sort(() => Math.random() - 0.5)
      .slice(0, totalPairs);
    
    // Ícones selecionados para os pares
    
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
    
    // Atualiza o estado do jogo com reconciliação de reset
    setGame(prevGame => ({
      ...prevGame,
      cards: updatedCards,
      last_reset: new Date().toISOString()
    }));
    
    // Cartas inicializadas
    
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
  
  // Função para garantir que todos os dados necessários estão presentes
  const validateGameState = (game: MemoryGameSession | null) => {
    if (!game) {
      console.error('Estado do jogo é nulo');
      return false;
    }
    
    if (!game.cards || !Array.isArray(game.cards)) {
      console.error('Cartas não estão definidas ou não são um array');
      return false;
    }
    
    if (!game.player_1_id) {
      console.error('Jogador 1 não definido');
      return false;
    }
    
    return true;
  };
  
  // Função para lidar com o clique em uma carta
  const handleCardClick = async (cardIndex: number) => {
    // Verificações de segurança para evitar cliques indevidos
    
    // Prevent clicking if game is over
    if (gameEnded) return;
    
    // Verificação mais precisa do turno atual
    // Comparamos diretamente com a informação do jogo, não com estado local
    const canPlay = player?.id === game.current_player_id;
    console.log("Tentativa de jogada:", 
      "ID jogador:", player?.id?.substring(0, 6), 
      "ID turno atual:", game.current_player_id?.substring(0, 6),
      "Pode jogar?", canPlay);
      
    if (!canPlay) {
      toast.info("Espere sua vez para jogar!", {
        duration: 2000,
        className: "bg-blue-800 text-blue-100 border-blue-700"
      });
      return;
    }
    
    // Prevent clicking if we're waiting for cards to reset
    if (waitingForReset) return;
    
    // Prevent clicking if we already have 2 cards flipped
    // Verificar também as cartas viradas no estado do jogo
    const flippedInGame = game.cards?.filter(c => c.isFlipped && !c.isMatched)?.length || 0;
    const currentFlipped = game.cards?.filter(c => c.isFlipped && !c.isMatched)?.length || 0;
    if (currentFlipped >= 2) {
      console.log('Bloqueado: já existem 2 cartas viradas no estado do jogo');
      return;
    }
    
    if (!game || !game.id) {
      console.error('Jogo não definido');
      return;
    }
    
    const card = game.cards[cardIndex];
    if (!card) {
      console.error(`Carta não encontrada no índice ${cardIndex}`);
      return;
    }
    
    // Prevent clicking if card is already flipped or matched
    if (card.isFlipped || card.isMatched) return;
    
    try {
      // Reproduzir som de virar carta
      playSound(flipAudioRef);
      
      // Atualização otimista com temporizador de sincronização
      const updatedCards = [...game.cards].map((c, idx) =>
        idx === cardIndex ? { ...c, isFlipped: true, flippedAt: new Date().toISOString() } : c
      );
      
      // Delay baseado no servidor para sincronização
      const FLIP_DURATION = 1500;

      // Envia a jogada para o servidor primeiro
      const updatedGame = await flipMemoryCard(game.id, player!.id, cardIndex);

      // Atualização do estado apenas após confirmação do servidor
      const newCardsArray = [...updatedGame.cards];
      
      setGame(prevGame => ({
        ...prevGame,
        cards: newCardsArray
      }));
      
      // Registra a carta virada localmente baseado na resposta do servidor
      const serverFlippedCards = newCardsArray
        .map((c, idx) => c.isFlipped && !c.isMatched ? idx : -1)
        .filter(idx => idx !== -1);
      setFlippedCards(serverFlippedCards);
      
      // Reset baseado no estado real do servidor
      if (serverFlippedCards.length >= 2) {
        // Server will handle card reset through real-time updates
      }
      
      if (!updatedGame) {
        console.error('Resposta nula ao virar carta');
        return;
      }
      
      // Quando duas cartas são viradas, verificar se são um par
      if (currentFlipped.length === 2) {
        // Verificar as cartas viradas
        const [firstCardIndex, secondCardIndex] = currentFlipped;
        const firstCard = updatedCards[firstCardIndex];
        const secondCard = updatedCards[secondCardIndex];
        
        // Se não são um par, configurar timer para desvirar as cartas
        if (firstCard.iconName !== secondCard.iconName) {
          setWaitingForReset(true);
          
          // Server will handle card reset through real-time updates
          setTimeout(() => {
            setFlippedCards([]);
            setWaitingForReset(false);
          }, 1500);
        } else {
          // Se são um par, tocar som de match
          playSound(matchAudioRef);
          
          // Limpar as cartas viradas
          setFlippedCards([]);
        }
      }
      
      // Atualizar o estado local completo com o resultado do servidor
      if (onGameUpdate) {
        onGameUpdate(updatedGame);
      }

      // Forçar nova renderização das cartas
      setGame(prev => ({
        ...prev,
        cards: [...updatedGame.cards]
      }));
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
      setIsRematchModalOpen(false);
    }
  };
  
  // Função para aceitar revanche
  const handleAcceptRematch = () => {
    if (rematchGameId) {
      router.push(`/jogo-da-memoria/online/${rematchGameId}`);
    }
    
    setIsRematchModalOpen(false);
  };
  
  // Função para recusar revanche
  const handleDeclineRematch = () => {
    setIsRematchModalOpen(false);
    setIsReceivingRematch(false);
  };
  
  // Função para fechar o modal de revanche
  const handleCloseRematchModal = () => {
    if (!opponentRequestedRematch) {
      setIsRematchModalOpen(false);
    }
  };
  
  // Função para determinar o tamanho das cartas baseado no grid
  const getCardSize = () => {
    const { rows, cols } = game.grid_config;
    
    if (rows === 3 && cols === 4) return 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32';
    if (rows === 4 && cols === 4) return 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28';
    if (rows === 4 && cols === 6) return 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24';
    if (rows === 6 && cols === 6) return 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20';
    
    return 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28';
  };
  
  // Função para determinar o tamanho do ícone baseado no grid
  const getIconSize = () => {
    const { rows, cols } = game.grid_config;
    
    if (rows === 3 && cols === 4) return 'h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16';
    if (rows === 4 && cols === 4) return 'h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14';
    if (rows === 4 && cols === 6) return 'h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12';
    if (rows === 6 && cols === 6) return 'h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10';
    
    return 'h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14';
  };
  
  // Renderiza as cartas do jogo
  const renderCards = () => {
    const cardSize = getCardSize();
    const { rows, cols } = game.grid_config;
    
    const customGridClass = `grid gap-2 md:gap-3 grid-cols-${cols}`;
    
    return (
      <div className={customGridClass}>
        {game.cards.map((card, index) => {
          // Tamanho fixo do ícone
          const iconSize = 32;
          
          return (
            <div
              key={index}
              onClick={() => !waitingForReset && handleCardClick(index)}
              className={`${cardSize} cursor-pointer`}
              role="button"
              tabIndex={0}
              aria-label={`Carta ${index + 1}`}
            >
              <div 
                className="w-full h-full relative rounded-xl overflow-hidden transform-style-3d"
                style={{
                  transition: 'transform 0.6s',
                  transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  perspective: '1000px'
                }}
              >
                {/* Frente da carta (costas) */}
                <div 
                  className="absolute w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-800 to-purple-900 border-2 border-slate-600 rounded-xl backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                >
                  {/* Círculo decorativo sempre visível no verso da carta */}
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-80 shadow-lg card-circle"></div>
                </div>
                
                {/* Verso da carta (frente com ícone) */}
                <div 
                  className="absolute w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-700 to-slate-900 border-2 border-slate-600 backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {/* Ícone da carta - exibir APENAS quando a carta estiver virada ou combinada */}
                  <div className="flex items-center justify-center w-full h-full">
                    {(card.isFlipped || card.isMatched) && (
                      <>
                        {card.iconName ? (
                          renderCardIcon(card.iconName, iconSize, card.color || '#FFFFFF')
                        ) : (
                          <div className="text-white text-xs">Carta sem ícone</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Função simples para renderizar o emoji correto
  const renderCardIcon = (iconName: string | undefined, size: number, color: string) => {
    // Se não há nome de ícone, mostrar um texto de erro
    if (!iconName) {
      console.error('Icon not found: undefined');
      return <div className="text-red-400 text-xs font-bold p-1 card-icon">Ícone não encontrado</div>;
    }
    
    try {
      // Verificar se o nome do ícone precisa ser corrigido
      const iconCorrections: {[key: string]: string} = {
        'Tree': 'Trees',
        'Airplane': 'Airplay',
        'Airplay': 'Airplay',
        'Trees': 'Trees'
      };
      
      // Aplicar correção se necessário
      const correctedIconName = iconCorrections[iconName] || iconName;
      
      // Usar o mapa de componentes pré-carregados para garantir consistência
      const IconComponent = allIconComponents[correctedIconName];
      
      // Se encontrou o componente, renderizar
      if (IconComponent) {
        return (
          <div className="flex items-center justify-center w-full h-full card-icon">
            <IconComponent size={size} color={color} />
          </div>
        );
      }
      
      // Fallback para emojis se o componente não existir
      if (correctedIconName && emojiMap[correctedIconName]) {
        return (
          <div 
            className="flex items-center justify-center w-full h-full card-icon" 
            style={{ fontSize: `${size}px` }}
          >
            {emojiMap[correctedIconName]}
          </div>
        );
      }
      
      // Se não encontrou emoji nem ícone, mostrar o nome do ícone como texto
      console.warn(`Ícone não encontrado: ${correctedIconName}`);
      return (
        <div 
          className="text-white text-xs p-1 card-icon"
        >
          {correctedIconName}
        </div>
      );
    } catch (error) {
      console.error('Erro ao renderizar ícone:', iconName, error);
      return <div className="text-red-500 text-xs p-1 card-icon">Erro</div>;
    }
  }
  
  // Renderiza o placar do jogo
  const renderScoreboard = () => {
    return (
      <div className="flex justify-center mb-6">
        <div className="grid grid-cols-3 w-full max-w-xl bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* Jogador 1 */}
          <div className={`p-3 sm:p-4 flex flex-col items-center ${isPlayer1 && isCurrentPlayer ? 'bg-purple-900/30 border-b-2 border-b-purple-500' : ''}`}>
            <div className="font-bold text-center text-sm sm:text-base truncate max-w-full">
              {isPlayer1 ? 'Você' : player1Name}
            </div>
            <div className="text-2xl sm:text-3xl font-bold">{player1Score}</div>
          </div>
          
          {/* Status do Jogo */}
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center border-l border-r border-slate-700 text-center">
            {isGameWaiting ? (
              <div className="text-amber-400 flex items-center text-sm sm:text-base">
                <Users className="h-4 w-4 mr-1" />
                Aguardando...
              </div>
            ) : isGameFinished ? (
              <div className="text-purple-400 flex items-center text-sm sm:text-base">
                <Trophy className="h-4 w-4 mr-1" />
                Jogo Finalizado
              </div>
            ) : (
              <div className="text-blue-400 flex items-center text-xs sm:text-sm">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(gameTime)}
              </div>
            )}
            
            {isGamePlaying && !isGameFinished && (
              <div className="text-xs text-slate-400 mt-1">
                Vez de: {isCurrentPlayer ? 'Você' : opponentNickname}
              </div>
            )}
          </div>
          
          {/* Jogador 2 */}
          <div className={`p-3 sm:p-4 flex flex-col items-center ${isPlayer2 && isCurrentPlayer ? 'bg-purple-900/30 border-b-2 border-b-purple-500' : ''}`}>
            <div className="font-bold text-center text-sm sm:text-base truncate max-w-full">
              {isPlayer2 ? 'Você' : player2Name}
            </div>
            <div className="text-2xl sm:text-3xl font-bold">{player2Score}</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderiza a mensagem de estado do jogo
  const renderStatusMessage = () => {
    if (isGameWaiting) {
      return (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
          <p className="text-amber-300 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Aguardando oponente entrar no jogo...
          </p>
        </div>
      );
    }
    
    if (isGameFinished) {
      return (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center shadow-lg"
        >
          {isWinner ? (
            <div>
              <p className="text-2xl font-bold text-purple-300 mb-2">🎉 Parabéns! Você venceu! 🏆</p>
              <p className="text-slate-300">Você encontrou mais pares que seu oponente!</p>
            </div>
          ) : isDraw ? (
            <div>
              <p className="text-2xl font-bold text-blue-300 mb-2">🤝 Empate! 🤝</p>
              <p className="text-slate-300">Vocês encontraram o mesmo número de pares!</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-indigo-300 mb-2">Você perdeu 😔</p>
              <p className="text-slate-300">Não desanime, tente novamente!</p>
            </div>
          )}
          
          <Button
            onClick={handleRequestRematch}
            disabled={isRequestingRematch || playerRequestedRematch}
            className="mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {playerRequestedRematch ? (
              "Revanche solicitada..."
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Solicitar Revanche
              </>
            )}
          </Button>
        </motion.div>
      );
    }
    
    if (isCurrentPlayer) {
      return (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <p className="text-green-300">É a sua vez de jogar! Clique em uma carta para virá-la.</p>
        </div>
      );
    } else {
      return (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
          <p className="text-blue-300">Aguarde sua vez. {opponentNickname} está jogando...</p>
        </div>
      );
    }
  };
  
  // No useEffect para verificar estado do jogo, adicionar verificações
  useEffect(() => {
    if (!game) return;
    
    // Verificar se o jogo terminou
    if (game.status === 'finished') {
      setGameEnded(true);
      
      // Definir o vencedor
      if (game.winner_id) {
        if (game.winner_id === player?.id) {
          setGameResult('won');
        } else {
          setGameResult('lost');
        }
      } else {
        // Empate
        setGameResult('draw');
      }
    } else if (game.status === 'playing') {
      // Verificar se todas as cartas estão combinadas
      const allMatched = game.cards && game.cards.every(card => card.isMatched);
      
      if (allMatched) {
        // O jogo acabou, determinar o vencedor com base nas correspondências
        const player1Score = game.player_1_matches || 0;
        const player2Score = game.player_2_matches || 0;
        
        if (player1Score > player2Score) {
          // Jogador 1 venceu
          setGameResult(game.player_1_id === player?.id ? 'won' : 'lost');
        } else if (player2Score > player1Score) {
          // Jogador 2 venceu
          setGameResult(game.player_2_id === player?.id ? 'won' : 'lost');
        } else {
          // Empate
          setGameResult('draw');
        }
        
        setGameEnded(true);
      }
    }
  }, [game, player?.id]);
  
  return (
    <div className="w-full flex flex-col items-center">
      {renderScoreboard()}
      {renderStatusMessage()}
      
      <div className="mb-8 w-full flex justify-center">
        <div className="p-4 sm:p-6 bg-slate-800/50 rounded-xl border border-slate-700 shadow-md">
          {renderCards()}
        </div>
      </div>
      
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
      
      <style jsx global>{`
        .perspective-500 {
          perspective: 500px;
        }
        
        .preserve-3d {
          transform-style: preserve-3d;
        }
        
        .backface-hidden {
          backface-visibility: hidden;
        }
        
        .rotateY-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}