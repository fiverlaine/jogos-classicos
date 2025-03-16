"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Gamepad2, RefreshCcw, PlusCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { NicknameModal } from "@/components/online-game/nickname-modal"
import { motion } from "framer-motion"
import { useRouter } from 'next/navigation'
import { usePlayer } from '@/lib/hooks/use-player'
import { createMemoryGame, getAvailableMemoryGames, MemoryGameSession } from '@/lib/supabase'

export default function OnlineLobbyPage() {
  const router = useRouter()
  const { player, isLoading: isPlayerLoading } = usePlayer()
  
  const [availableGames, setAvailableGames] = useState<MemoryGameSession[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [selectedGridConfig, setSelectedGridConfig] = useState({ rows: 4, cols: 4 })
  
  // Opções de configuração de grade
  const gridOptions = [
    { label: '3x4 (Fácil)', config: { rows: 3, cols: 4 } },
    { label: '4x4 (Médio)', config: { rows: 4, cols: 4 } },
    { label: '4x6 (Difícil)', config: { rows: 4, cols: 6 } },
    { label: '6x6 (Expert)', config: { rows: 6, cols: 6 } },
  ]

  // Verifica se o jogador tem nickname ao carregar a página
  useEffect(() => {
    if (!isPlayerLoading && !player?.nickname) {
      setShowNicknameModal(true)
    } else if (player?.nickname) {
      fetchGames()
    }
  }, [isPlayerLoading, player])

  // Função para buscar jogos disponíveis
  const fetchGames = async () => {
    setIsLoadingGames(true)
    try {
      const games = await getAvailableMemoryGames()
      setAvailableGames(games)
    } catch (error) {
      console.error('Erro ao buscar jogos:', error)
    } finally {
      setIsLoadingGames(false)
    }
  }

  // Função para criar um novo jogo
  const handleCreateGame = async () => {
    if (!player) return
    
    setIsCreatingGame(true)
    try {
      const newGame = await createMemoryGame(player.id, player.nickname, selectedGridConfig)
      
      if (newGame) {
        router.push(`/jogo-da-memoria/online/${newGame.id}`)
      }
    } catch (error) {
      console.error('Erro ao criar jogo:', error)
      setIsCreatingGame(false)
    }
  }

  // Função para entrar em um jogo
  const handleJoinGame = (gameId: string) => {
    router.push(`/jogo-da-memoria/online/${gameId}`)
  }

  // Renderiza o conteúdo principal do lobby
  const renderLobbyContent = () => {
    if (isPlayerLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Carregando...</span>
        </div>
      )
    }

    if (!player?.nickname) {
      return (
        <div className="text-center p-8">
          <p className="text-lg">Você precisa definir um apelido para jogar online.</p>
          <button 
            onClick={() => setShowNicknameModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Definir Apelido
          </button>
        </div>
      )
    }

    return (
      <div className="w-full">
        <h2 className="text-xl font-bold mb-4">Jogos Disponíveis</h2>
        
        <div className="space-y-4">
          {isLoadingGames ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2">Carregando jogos...</span>
            </div>
          ) : availableGames.length === 0 ? (
            <div className="text-center p-6 bg-gray-800 rounded-lg">
              <p className="text-gray-400">Nenhum jogo disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableGames.map(game => (
                <div key={game.id} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-medium">{game.player_1_nickname}</h3>
                      <p className="text-sm text-gray-400">
                        Criado em: {new Date(game.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-sm text-gray-300">
                      Grade: {game.grid_config.rows}x{game.grid_config.cols}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game.id)}
                    className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                  >
                    Entrar no Jogo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Criar Novo Jogo</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Configuração da Grade</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {gridOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGridConfig(option.config)}
                  className={`p-2 rounded-lg border text-sm ${
                    selectedGridConfig.rows === option.config.rows && 
                    selectedGridConfig.cols === option.config.cols
                      ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleCreateGame}
              disabled={isCreatingGame}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg ${
                isCreatingGame 
                  ? 'bg-gray-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
              }`}
            >
              {isCreatingGame ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Criando jogo...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5" />
                  <span>Criar Novo Jogo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Jogo da Memória Online</h1>
        <p className="text-gray-400">Encontre pares de cartas e desafie seus amigos!</p>
        <div className="flex space-x-2 mt-4">
          <Link 
            href="/jogo-da-memoria" 
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Modo Offline
          </Link>
          <button
            onClick={fetchGames}
            disabled={isLoadingGames}
            className="flex items-center space-x-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoadingGames ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {renderLobbyContent()}
      </main>

      {showNicknameModal && (
        <NicknameModal
          isOpen={showNicknameModal}
          onClose={() => {
            if (player?.nickname) {
              setShowNicknameModal(false)
              fetchGames()
            }
          }}
          onSubmit={() => {
            setShowNicknameModal(false)
            fetchGames()
          }}
        />
      )}
    </div>
  )
} 