'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Calendar, ClockIcon, HomeIcon, Moon, Sun} from 'lucide-react';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Header con iconos compacto */}
        <header className="fixed top-0 left-0 w-full bg-secondary text-secondary-foreground px-3 py-2 flex items-center justify-between z-10 shadow-md">
          {/* Menú principal con iconos */}
          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-xs flex flex-col items-center p-1 rounded-md hover:bg-primary/10 transition-colors"
              title="Inicio"
              prefetch
            >
              <HomeIcon className="h-5 w-5" />
              <span className="text-xs">Inicio</span>
            </Link>
            <Link
              href="/nuevos-horarios"
              className="text-xs flex flex-col items-center p-1 rounded-md hover:bg-primary/10 transition-colors"
              title="Nuevo Horario"
              prefetch
            >
              <ClockIcon className="h-5 w-5" />
              <span className="text-xs">Horario</span>
            </Link>
            <Link
              href="/dispositivos"
              className="text-xs flex flex-col items-center p-1 rounded-md hover:bg-primary/10 transition-colors"
              title="Eventos"
              prefetch
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Eventos</span>
            </Link>
          </nav>

          {/* Botón de modo oscuro/claro */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1 rounded-full hover:bg-secondary/80 transition-colors"
            title={isDarkMode ? "Modo claro" : "Modo oscuro"}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </header>

        {/* Contenido principal */}
        <div style={{ marginTop: '55px' }}>
          {children}
        </div>

        {/* Pie de página */}
        <footer className="bg-secondary text-secondary-foreground p-2 text-center text-xs">
          Realizado por Mideas Sistemas
        </footer>
      </body>
    </html>
  );
}
