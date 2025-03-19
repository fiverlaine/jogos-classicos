import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { gameId } = req.query;
    const { cards } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: 'ID do jogo não fornecido' });
    }

    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Lista de cartas não fornecida ou inválida' });
    }

    console.log(`Atualizando cartas do jogo ${gameId}`);

    // Tentar atualizar as cartas no Supabase
    const { data, error } = await supabase
      .from('memory_game_sessions')
      .update({ cards })
      .eq('id', gameId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cartas no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao atualizar cartas no banco de dados' });
    }

    console.log('Cartas atualizadas com sucesso no Supabase');
    
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Erro ao processar solicitação de atualização de cartas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 