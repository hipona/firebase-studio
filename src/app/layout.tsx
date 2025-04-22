'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Calendar, HomeIcon, Moon, Sun} from 'lucide-react';
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
        {/* Encabezado con menú estilizado */}
        <header className="fixed top-0 left-0 w-full bg-secondary text-secondary-foreground p-2 flex items-center justify-center z-10 shadow-md">
          {/* Menú principal */}
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-lg font-medium px-4 py-2 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/dispositivos"
              className="text-lg font-medium px-4 py-2 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Eventos
            </Link>
          </nav>

          {/* Botón de modo oscuro/claro */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-2 right-2 bg-secondary text-secondary-foreground p-2 rounded-full hover:bg-secondary/80 transition-colors"
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </header>

        {/* Contenido principal */}
        <div style={{ marginTop: '60px' }}>
          {children}
        </div>

        {/* Pie de página */}
        <footer className="bg-secondary text-secondary-foreground p-4 text-center">
          Realizado por Mideas Sistemas
        </footer>
      </body>
    </html>
  );
}
