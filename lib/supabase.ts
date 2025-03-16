import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente para configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas. Verifique seu arquivo .env.local');
}

// Criar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos
export interface Player {
  id: string;
  nickname: string;
}

export interface GameSession {
  id: string;
  created_at: string;
  last_move_at: string;
  current_player_id: string;
  player_x_id: string;
  player_x_nickname: string;
  player_o_id: string | null;
  player_o_nickname: string | null;
  winner_id: string | null;
  board: string[];
  status: 'waiting' | 'playing' | 'finished';
  rematch_requested_by: string | null;
  rematch_game_id: string | null;
}

export interface PlayerProfile {
  id: string;
  nickname: string;
  isReady?: boolean;
}

export interface MemoryCard {
  id: number;
  iconName: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryMatch {
  cardIds: number[];
  playerId: string;
}

export interface MemoryGameSession {
  id: string;
  created_at: string;
  last_move_at: string;
  current_player_id: string;
  player_1_id: string;
  player_1_nickname: string;
  player_2_id: string | null;
  player_2_nickname: string | null;
  cards: MemoryCard[];
  matches: MemoryMatch[];
  player_1_matches: number;
  player_2_matches: number;
  winner_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  grid_config: { rows: number; cols: number };
  rematch_requested_by: string | null;
  rematch_game_id: string | null;
}

// Função para criar uma nova sessão de jogo
export async function createGameSession(player: Player): Promise<GameSession | null> {
  try {
    console.log(`Criando nova sessão de jogo para o jogador: ${player.nickname} (${player.id})`);
    
    // Criar um tabuleiro vazio (9 células vazias)
    const emptyBoard = Array(9).fill('');
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        current_player_id: player.id,
        player_x_id: player.id,
        player_x_nickname: player.nickname,
        board: emptyBoard,
        status: 'waiting'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar sessão de jogo:', error.message);
      return null;
    }
    
    if (!data) {
      console.error('Nenhum dado retornado ao criar sessão de jogo');
      return null;
    }
    
    console.log('Sessão de jogo criada com sucesso:', data.id);
    return data as GameSession;
  } catch (error) {
    console.error('Erro inesperado ao criar sessão de jogo:', error);
    return null;
  }
}

// Função para obter uma sessão de jogo pelo ID
export async function getGameById(gameId: string): Promise<GameSession | null> {
  try {
    console.log(`Buscando jogo com ID: ${gameId}`);
    
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar jogo ${gameId}:`, error.message);
      return null;
    }
    
    if (!data) {
      console.log(`Jogo com ID ${gameId} não encontrado`);
      return null;
    }
    
    console.log(`Jogo ${gameId} encontrado`);
    return data as GameSession;
  } catch (error) {
    console.error(`Erro inesperado ao buscar jogo ${gameId}:`, error);
    return null;
  }
}

// Função para obter jogos disponíveis
export async function getAvailableGames(): Promise<GameSession[]> {
  try {
    console.log('Buscando jogos disponíveis...');
    
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar jogos disponíveis:', error.message);
      return [];
    }
    
    console.log(`Encontrados ${data?.length || 0} jogos disponíveis`);
    return data as GameSession[] || [];
  } catch (error) {
    console.error('Erro inesperado ao buscar jogos disponíveis:', error);
    return [];
  }
}

// Função para entrar em uma sessão de jogo
export async function joinGameSession(gameId: string, player: Player): Promise<boolean> {
  try {
    console.log(`Jogador ${player.nickname} (${player.id}) tentando entrar no jogo ${gameId}`);
    
    // Primeiro, verificar se o jogo existe e está disponível
    const game = await getGameById(gameId);
    
    if (!game) {
      console.error(`Jogo ${gameId} não encontrado`);
      return false;
    }
    
    if (game.status !== 'waiting') {
      console.error(`Jogo ${gameId} não está disponível (status: ${game.status})`);
      return false;
    }
    
    // Verificar se o jogador já é o jogador X
    if (game.player_x_id === player.id) {
      console.error(`Jogador ${player.id} já é o jogador X neste jogo`);
      return false;
    }
    
    const { error } = await supabase
      .from('game_sessions')
      .update({
        player_o_id: player.id,
        player_o_nickname: player.nickname,
        status: 'playing'
      })
      .eq('id', gameId)
      .eq('status', 'waiting'); // Garantir que o jogo ainda está disponível
    
    if (error) {
      console.error(`Erro ao entrar no jogo ${gameId}:`, error.message);
      return false;
    }
    
    console.log(`Jogador ${player.nickname} entrou com sucesso no jogo ${gameId}`);
    return true;
  } catch (error) {
    console.error(`Erro inesperado ao entrar no jogo ${gameId}:`, error);
    return false;
  }
}

// Função para fazer uma jogada
export async function makeMove(
  gameId: string, 
  playerId: string, 
  position: number
): Promise<boolean> {
  try {
    console.log(`Jogador ${playerId} tentando fazer jogada na posição ${position} do jogo ${gameId}`);
    
    // Obter o estado atual do jogo
    const game = await getGameById(gameId);
    
    if (!game) {
      console.error(`Jogo ${gameId} não encontrado`);
      return false;
    }
    
    // Verificar se é a vez do jogador
    if (game.current_player_id !== playerId) {
      console.error(`Não é a vez do jogador ${playerId}`);
      return false;
    }
    
    // Verificar se a posição é válida
    if (position < 0 || position > 8) {
      console.error(`Posição ${position} inválida`);
      return false;
    }
    
    // Verificar se a posição já está ocupada
    if (game.board[position] !== '') {
      console.error(`Posição ${position} já está ocupada`);
      return false;
    }
    
    // Determinar o símbolo do jogador (X ou O)
    const symbol = playerId === game.player_x_id ? 'X' : 'O';
    
    // Criar uma cópia do tabuleiro e atualizar a posição
    const newBoard = [...game.board];
    newBoard[position] = symbol;
    
    // Verificar se o jogador venceu
    const hasWon = checkWinner(newBoard, symbol);
    
    // Verificar se o jogo terminou em empate
    const isDraw = !hasWon && newBoard.every(cell => cell !== '');
    
    // Determinar o próximo jogador
    const nextPlayerId = playerId === game.player_x_id 
      ? game.player_o_id 
      : game.player_x_id;
    
    // Determinar o novo status do jogo
    let newStatus = 'playing';
    let winnerId = null;
    
    if (hasWon) {
      newStatus = 'finished';
      winnerId = playerId;
      console.log(`Jogador ${playerId} venceu o jogo ${gameId}`);
    } else if (isDraw) {
      newStatus = 'finished';
      console.log(`Jogo ${gameId} terminou em empate`);
    }
    
    // Atualizar o jogo no banco de dados
    const { error } = await supabase
      .from('game_sessions')
      .update({
        board: newBoard,
        current_player_id: nextPlayerId,
        status: newStatus,
        winner_id: winnerId,
        last_move_at: new Date().toISOString()
      })
      .eq('id', gameId);
    
    if (error) {
      console.error(`Erro ao atualizar jogo ${gameId}:`, error.message);
      return false;
    }
    
    console.log(`Jogada realizada com sucesso no jogo ${gameId}`);
    return true;
  } catch (error) {
    console.error(`Erro inesperado ao fazer jogada no jogo ${gameId}:`, error);
    return false;
  }
}

// Função para verificar se um jogador venceu
function checkWinner(board: string[], symbol: string): boolean {
  // Combinações vencedoras (linhas, colunas e diagonais)
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
  ];
  
  // Verificar se alguma combinação vencedora está completa
  return winningCombinations.some(combination => {
    return combination.every(index => board[index] === symbol);
  });
}

// Função para assinar atualizações em tempo real de um jogo
export function subscribeToGame(gameId: string, callback: (game: GameSession) => void) {
  console.log(`Assinando atualizações para o jogo ${gameId}`);
  
  const channel = supabase
    .channel(`game_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameId}`
      },
      (payload) => {
        console.log(`Recebida atualização para o jogo ${gameId}:`, payload);
        
        // Verificar se a atualização inclui campos relacionados à revanche
        const newData = payload.new as GameSession;
        if (newData.rematch_requested_by !== undefined || newData.rematch_game_id !== undefined) {
          console.log("Atualização inclui dados de revanche:", {
            rematch_requested_by: newData.rematch_requested_by,
            rematch_game_id: newData.rematch_game_id
          });
        }
        
        callback(newData);
      }
    )
    .subscribe((status) => {
      console.log(`Status da inscrição para o jogo ${gameId}:`, status);
    });
  
  // Retornar a função para cancelar a assinatura
  return () => {
    console.log(`Cancelando assinatura para o jogo ${gameId}`);
    supabase.removeChannel(channel);
  };
}

// Função para solicitar uma revanche
export async function requestRematch(gameId: string, playerId: string): Promise<boolean> {
  try {
    console.log(`Jogador ${playerId} solicitando revanche para o jogo ${gameId}`);
    
    // Verificar se o jogo existe e está finalizado
    const game = await getGameById(gameId);
    
    if (!game) {
      console.error(`Jogo ${gameId} não encontrado`);
      return false;
    }
    
    if (game.status !== 'finished') {
      console.error(`Jogo ${gameId} ainda não terminou (status: ${game.status})`);
      return false;
    }
    
    // Verificar se o jogador é um dos participantes do jogo
    if (playerId !== game.player_x_id && playerId !== game.player_o_id) {
      console.error(`Jogador ${playerId} não é participante do jogo ${gameId}`);
      return false;
    }
    
    // Atualizar o jogo para indicar que uma revanche foi solicitada
    const { error } = await supabase
      .from('game_sessions')
      .update({
        rematch_requested_by: playerId
      })
      .eq('id', gameId);
    
    if (error) {
      console.error(`Erro ao solicitar revanche para o jogo ${gameId}:`, error.message);
      return false;
    }
    
    console.log(`Revanche solicitada com sucesso para o jogo ${gameId}`);
    return true;
  } catch (error) {
    console.error(`Erro inesperado ao solicitar revanche para o jogo ${gameId}:`, error);
    return false;
  }
}

// Função para aceitar uma revanche
export async function acceptRematch(gameId: string, playerId: string): Promise<string | null> {
  try {
    console.log(`Jogador ${playerId} aceitando revanche para o jogo ${gameId}`);
    
    // Verificar se o jogo existe e tem uma solicitação de revanche
    const game = await getGameById(gameId);
    
    if (!game) {
      console.error(`Jogo ${gameId} não encontrado`);
      return null;
    }
    
    if (!game.rematch_requested_by) {
      console.error(`Jogo ${gameId} não tem solicitação de revanche`);
      return null;
    }
    
    // Verificar se o jogador é um dos participantes do jogo
    if (playerId !== game.player_x_id && playerId !== game.player_o_id) {
      console.error(`Jogador ${playerId} não é participante do jogo ${gameId}`);
      return null;
    }
    
    // Verificar se o jogador não é quem solicitou a revanche
    if (playerId === game.rematch_requested_by) {
      console.error(`Jogador ${playerId} não pode aceitar sua própria solicitação de revanche`);
      return null;
    }
    
    // Criar um novo jogo com os jogadores invertidos
    const requestingPlayer = game.rematch_requested_by === game.player_x_id
      ? { id: game.player_x_id, nickname: game.player_x_nickname }
      : { id: game.player_o_id!, nickname: game.player_o_nickname! };
    
    const acceptingPlayer = playerId === game.player_x_id
      ? { id: game.player_x_id, nickname: game.player_x_nickname }
      : { id: game.player_o_id!, nickname: game.player_o_nickname! };
    
    // Criar um tabuleiro vazio
    const emptyBoard = Array(9).fill('');
    
    // Inserir o novo jogo
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        // Inverter os jogadores X e O
        player_x_id: game.rematch_requested_by === game.player_x_id ? game.player_o_id : game.player_x_id,
        player_x_nickname: game.rematch_requested_by === game.player_x_id ? game.player_o_nickname : game.player_x_nickname,
        player_o_id: game.rematch_requested_by,
        player_o_nickname: game.rematch_requested_by === game.player_x_id ? game.player_x_nickname : game.player_o_nickname,
        current_player_id: game.rematch_requested_by === game.player_x_id ? game.player_o_id : game.player_x_id,
        board: emptyBoard,
        status: 'playing'
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao criar jogo de revanche:`, error.message);
      return null;
    }
    
    if (!data) {
      console.error('Nenhum dado retornado ao criar jogo de revanche');
      return null;
    }
    
    // Atualizar o jogo original com o ID do jogo de revanche
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        rematch_game_id: data.id
      })
      .eq('id', gameId);
    
    if (updateError) {
      console.error(`Erro ao atualizar jogo original ${gameId}:`, updateError.message);
      // Não retornar null aqui, pois o jogo de revanche já foi criado
    }
    
    console.log(`Revanche aceita com sucesso. Novo jogo criado: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`Erro inesperado ao aceitar revanche para o jogo ${gameId}:`, error);
    return null;
  }
}

// Função para recusar uma revanche
export async function declineRematch(gameId: string): Promise<boolean> {
  try {
    console.log(`Recusando revanche para o jogo ${gameId}`);
    
    // Atualizar o jogo para limpar a solicitação de revanche
    const { error } = await supabase
      .from('game_sessions')
      .update({
        rematch_requested_by: null
      })
      .eq('id', gameId);
    
    if (error) {
      console.error(`Erro ao recusar revanche para o jogo ${gameId}:`, error.message);
      return false;
    }
    
    console.log(`Revanche recusada com sucesso para o jogo ${gameId}`);
    return true;
  } catch (error) {
    console.error(`Erro inesperado ao recusar revanche para o jogo ${gameId}:`, error);
    return false;
  }
}

// Função para criar uma nova sessão de jogo da memória
export const createMemoryGame = async (
  playerId: string,
  playerNickname: string,
  gridConfig: { rows: number; cols: number } = { rows: 4, cols: 4 }
): Promise<MemoryGameSession | null> => {
  // Cria um array de cartas baseado no tamanho do grid
  const totalPairs = (gridConfig.rows * gridConfig.cols) / 2;
  
  // Modelo de carta inicial (sem estado)
  const initialCards: MemoryCard[] = Array.from({ length: gridConfig.rows * gridConfig.cols }, (_, index) => ({
    id: index,
    iconName: '', // Será preenchido pelo jogo após iniciar
    color: '',    // Será preenchido pelo jogo após iniciar
    isFlipped: false,
    isMatched: false
  }));

  const { data, error } = await supabase
    .from('memory_game_sessions')
    .insert([
      {
        player_1_id: playerId,
        player_1_nickname: playerNickname,
        current_player_id: playerId,
        cards: initialCards,
        matches: [],
        player_1_matches: 0,
        player_2_matches: 0,
        status: 'waiting',
        grid_config: gridConfig
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao criar jogo da memória:', error);
    return null;
  }

  return data as MemoryGameSession;
};

// Função para obter uma sessão de jogo da memória específica
export const getMemoryGame = async (gameId: string): Promise<MemoryGameSession | null> => {
  const { data, error } = await supabase
    .from('memory_game_sessions')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('Erro ao buscar jogo da memória:', error);
    return null;
  }

  return data as MemoryGameSession;
};

// Função para obter jogos da memória disponíveis para entrar
export const getAvailableMemoryGames = async (): Promise<MemoryGameSession[]> => {
  const { data, error } = await supabase
    .from('memory_game_sessions')
    .select('*')
    .eq('status', 'waiting')
    .is('player_2_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar jogos da memória disponíveis:', error);
    return [];
  }

  return data as MemoryGameSession[];
};

// Função para entrar em uma sessão de jogo da memória existente
export const joinMemoryGame = async (
  gameId: string,
  playerId: string,
  playerNickname: string
): Promise<MemoryGameSession | null> => {
  // Primeiro verifica se o jogo existe e está em espera
  const { data: existingGame, error: checkError } = await supabase
    .from('memory_game_sessions')
    .select('*')
    .eq('id', gameId)
    .eq('status', 'waiting')
    .is('player_2_id', null)
    .single();

  if (checkError || !existingGame) {
    console.error('Erro ao verificar jogo da memória ou jogo indisponível:', checkError);
    return null;
  }

  // Verifica se o jogador é diferente do jogador 1
  if (existingGame.player_1_id === playerId) {
    console.error('Você já está neste jogo como Jogador 1');
    return existingGame as MemoryGameSession;
  }

  // Atualiza o jogo adicionando o jogador 2 e mudando o status para 'playing'
  const { data: updatedGame, error: updateError } = await supabase
    .from('memory_game_sessions')
    .update({
      player_2_id: playerId,
      player_2_nickname: playerNickname,
      status: 'playing',
    })
    .eq('id', gameId)
    .select('*')
    .single();

  if (updateError) {
    console.error('Erro ao entrar no jogo da memória:', updateError);
    return null;
  }

  return updatedGame as MemoryGameSession;
};

// Função para fazer uma jogada no jogo da memória
export const flipMemoryCard = async (
  gameId: string,
  playerId: string,
  cardId: number
): Promise<MemoryGameSession | null> => {
  // Primeiro busca o estado atual do jogo
  const { data: game, error: getError } = await supabase
    .from('memory_game_sessions')
    .select('*')
    .eq('id', gameId)
    .single();

  if (getError || !game) {
    console.error('Erro ao buscar jogo da memória:', getError);
    return null;
  }

  // Verifica se é a vez do jogador atual
  if (game.current_player_id !== playerId) {
    console.error('Não é sua vez de jogar');
    return game as MemoryGameSession;
  }

  // Verifica se o jogo ainda está em andamento
  if (game.status !== 'playing') {
    console.error('Jogo não está em andamento');
    return game as MemoryGameSession;
  }

  // Verifica se a carta é válida e não está já virada ou combinada
  const card = game.cards[cardId];
  if (!card || card.isFlipped || card.isMatched) {
    console.error('Movimento inválido');
    return game as MemoryGameSession;
  }

  // Atualiza o estado da carta para virada
  const updatedCards = [...game.cards];
  updatedCards[cardId] = {
    ...card,
    isFlipped: true
  };

  // Conta quantas cartas estão viradas atualmente (excluindo as já combinadas)
  const flippedCards = updatedCards.filter(c => c.isFlipped && !c.isMatched);
  
  // Define atualizações padrão
  const update: Partial<MemoryGameSession> = {
    cards: updatedCards
  };

  // Se já temos 2 cartas viradas, verificamos se são um par
  if (flippedCards.length === 2) {
    const [firstCard, secondCard] = flippedCards;
    
    // Se as cartas combinam (mesmo ícone)
    if (firstCard.iconName === secondCard.iconName) {
      // Marcar as duas cartas como combinadas
      updatedCards[firstCard.id].isMatched = true;
      updatedCards[secondCard.id].isMatched = true;
      
      // Adicionar a combinação na lista de matches
      const updatedMatches = [...game.matches, {
        cardIds: [firstCard.id, secondCard.id],
        playerId
      }];
      
      update.matches = updatedMatches;
      
      // Atualizar a pontuação do jogador atual
      if (playerId === game.player_1_id) {
        update.player_1_matches = game.player_1_matches + 1;
      } else if (playerId === game.player_2_id) {
        update.player_2_matches = game.player_2_matches + 1;
      }
      
      // O jogador atual continua jogando quando acerta um par
      update.current_player_id = playerId;

      // Verificar se o jogo terminou (todas as cartas combinadas)
      const allMatched = updatedCards.every(c => c.isMatched);
      if (allMatched) {
        update.status = 'finished';
        
        // Determinar o vencedor (quem tem mais pares)
        const player1Score = (update.player_1_matches !== undefined) ? update.player_1_matches : game.player_1_matches;
        const player2Score = (update.player_2_matches !== undefined) ? update.player_2_matches : game.player_2_matches;
        
        if (player1Score > player2Score) {
          update.winner_id = game.player_1_id;
        } else if (player2Score > player1Score) {
          update.winner_id = game.player_2_id;
        } else {
          update.winner_id = null; // Empate
        }
      }
    } else {
      // As cartas não combinam, desvirar depois de um tempo
      // Isso será tratado no cliente, aqui apenas trocamos o jogador atual
      const nextPlayerId = (playerId === game.player_1_id && game.player_2_id) 
        ? game.player_2_id 
        : game.player_1_id;
        
      update.current_player_id = nextPlayerId as string;
    }
  }

  // Atualiza o jogo no banco de dados
  const { data: updatedGame, error: updateError } = await supabase
    .from('memory_game_sessions')
    .update(update)
    .eq('id', gameId)
    .select('*')
    .single();

  if (updateError) {
    console.error('Erro ao atualizar jogo da memória:', updateError);
    return null;
  }

  return updatedGame as MemoryGameSession;
};

// Solicita uma revanche no jogo da memória
export const requestMemoryRematch = async (
  gameId: string,
  playerId: string
): Promise<MemoryGameSession | null> => {
  const { data: game, error: getError } = await supabase
    .from('memory_game_sessions')
    .select('*')
    .eq('id', gameId)
    .single();

  if (getError || !game) {
    console.error('Erro ao buscar jogo da memória:', getError);
    return null;
  }

  // Verifica se o jogo terminou
  if (game.status !== 'finished') {
    console.error('O jogo ainda não terminou para solicitar revanche');
    return game as MemoryGameSession;
  }

  // Verifica se o jogador faz parte do jogo
  if (playerId !== game.player_1_id && playerId !== game.player_2_id) {
    console.error('Jogador não pertence a este jogo');
    return game as MemoryGameSession;
  }

  // Se já há uma solicitação de revanche do outro jogador, cria um novo jogo
  if (game.rematch_requested_by && game.rematch_requested_by !== playerId) {
    // Cria um novo jogo com os jogadores trocados (1 vira 2 e vice-versa)
    const initialCards: MemoryCard[] = Array.from(
      { length: game.grid_config.rows * game.grid_config.cols }, 
      (_, index) => ({
        id: index,
        iconName: '', // Será preenchido pelo jogo após iniciar
        color: '',    // Será preenchido pelo jogo após iniciar
        isFlipped: false,
        isMatched: false
      })
    );

    const newGameData: Partial<MemoryGameSession> = {
      player_1_id: game.player_2_id as string,
      player_1_nickname: game.player_2_nickname as string,
      player_2_id: game.player_1_id,
      player_2_nickname: game.player_1_nickname,
      current_player_id: game.player_2_id as string,
      cards: initialCards,
      matches: [],
      player_1_matches: 0,
      player_2_matches: 0,
      status: 'playing',
      grid_config: game.grid_config,
      winner_id: null
    };

    const { data: newGame, error: createError } = await supabase
      .from('memory_game_sessions')
      .insert([newGameData])
      .select('*')
      .single();

    if (createError) {
      console.error('Erro ao criar revanche do jogo da memória:', createError);
      return null;
    }

    // Atualiza o jogo original com o ID da revanche
    const { data: updatedGame, error: updateError } = await supabase
      .from('memory_game_sessions')
      .update({
        rematch_game_id: newGame.id
      })
      .eq('id', gameId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar jogo da memória com ID de revanche:', updateError);
      return newGame as MemoryGameSession;
    }

    return newGame as MemoryGameSession;
  } else {
    // Registra a solicitação de revanche
    const { data: updatedGame, error: updateError } = await supabase
      .from('memory_game_sessions')
      .update({
        rematch_requested_by: playerId
      })
      .eq('id', gameId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao solicitar revanche do jogo da memória:', updateError);
      return null;
    }

    return updatedGame as MemoryGameSession;
  }
};

// Inscreve-se para atualizações em tempo real de um jogo da memória
export const subscribeToMemoryGame = (
  gameId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`memory_game_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'memory_game_sessions',
        filter: `id=eq.${gameId}`,
      },
      callback
    )
    .subscribe();
};

// Limpa a inscrição a um canal do Supabase
export const unsubscribeFromChannel = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
}; 