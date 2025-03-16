'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface RematchModalProps {
  isOpen: boolean;
  isRequesting: boolean;
  isReceiving: boolean;
  opponentNickname: string | null;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRequest: () => void;
}

export function RematchModal({
  isOpen,
  isRequesting,
  isReceiving,
  opponentNickname,
  onClose,
  onAccept,
  onDecline,
  onRequest,
}: RematchModalProps) {
  const [countdown, setCountdown] = useState(30);
  const [isMounted, setIsMounted] = useState(false);
  
  // Controlar o estado de montagem para evitar problemas de renderização
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Iniciar contagem regressiva quando o modal estiver aberto
  useEffect(() => {
    if (isOpen && isReceiving) {
      console.log("Iniciando contagem regressiva para responder à revanche");
      setCountdown(30);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            console.log("Tempo esgotado para responder à revanche");
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [isOpen, isReceiving, onDecline]);

  // Registrar mudanças no estado do modal para depuração
  useEffect(() => {
    console.log("Estado do modal de revanche alterado:", { isOpen, isRequesting, isReceiving });
  }, [isOpen, isRequesting, isReceiving]);

  if (!isMounted) return null;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log("Modal de revanche alterado para:", open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-sm w-[95%] max-w-[95%] sm:w-auto sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isRequesting 
              ? "Aguardando resposta..." 
              : isReceiving 
                ? "Convite para revanche" 
                : "Jogar novamente?"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            {isRequesting 
              ? `Aguardando ${opponentNickname} aceitar sua solicitação de revanche...` 
              : isReceiving 
                ? `${opponentNickname} está convidando você para uma revanche!` 
                : "Deseja jogar novamente contra o mesmo oponente?"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2 sm:py-4">
          {isRequesting ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent"
            />
          ) : isReceiving ? (
            <div className="text-center">
              <div className="mb-2 sm:mb-4 text-2xl sm:text-3xl font-bold text-blue-400">{countdown}</div>
              <p className="text-xs sm:text-sm text-slate-400">Segundos para responder</p>
            </div>
          ) : (
            <div className="w-full text-center">
              <p className="mb-2 sm:mb-4 text-sm sm:text-base text-slate-300">
                Iniciar uma nova partida com o mesmo oponente?
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-2 mt-2 sm:mt-0">
          {isRequesting ? (
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          ) : isReceiving ? (
            <>
              <Button 
                variant="outline" 
                onClick={onDecline}
                className="w-full sm:w-auto"
              >
                Recusar
              </Button>
              <Button 
                onClick={onAccept}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                Aceitar Revanche
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Voltar ao Lobby
              </Button>
              <Button 
                onClick={onRequest}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                Solicitar Revanche
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 