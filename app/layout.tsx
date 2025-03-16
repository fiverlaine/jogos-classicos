import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/auth-context';
import { Suspense } from 'react';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jogos Clássicos - Design Futurista",
  description: "Jogue Jogo da Velha e Jogo da Memória com visual futurista",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <Suspense fallback={<div>Carregando...</div>}>
              {children}
            </Suspense>
            <Toaster position="top-center" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'