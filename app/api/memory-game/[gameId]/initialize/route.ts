import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  // Ensure params is awaited before using its properties
  const { gameId } = await params;
  
  try {
    // Obter os dados da requisição
    const { cards, grid_config } = await request.json();
    
    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json(
        { error: 'Cards inválidos' },
        { status: 400 }
      );
    }
    
    // Atualizar as cartas do jogo no banco de dados
    const { data, error } = await supabase
      .from('memory_game_sessions')
      .update({ cards })
      .eq('id', gameId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Erro ao inicializar cartas:', error);
      return NextResponse.json(
        { error: 'Erro ao inicializar cartas' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}