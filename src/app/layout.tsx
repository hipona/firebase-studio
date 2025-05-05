'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Calendar, ClockIcon, HomeIcon, Moon, Sun, Plus} from 'lucide-react'; // Import Plus icon
import { Clock } from "lucide-react";
import {useEffect, useState} from 'react';
import Link from 'next/link'; // Import Link
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
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
  const [showAlert, setShowAlert] = useState(false); // Although defined, not used in layout. Kept for potential future use.

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        {/* Header just for Dark Mode Toggle */}
        <header className="fixed top-0 left-0 w-full bg-secondary text-secondary-foreground px-3 py-2 flex items-center justify-end z-10 shadow-md">
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
        <main className="flex-grow" style={{ paddingTop: '55px', paddingBottom: '70px' }}> {/* Adjusted padding */}
          {children}
        </main>

        {/* Bottom Navigation Footer */}
        <footer className="fixed bottom-0 left-0 w-full bg-secondary text-secondary-foreground shadow-md z-10 border-t border-border">
          <nav className="flex items-center justify-around h-16">
            <Link
              href="/"
              className="flex flex-col items-center justify-center text-xs p-2 rounded-md hover:bg-primary/10 transition-colors flex-1 text-center"
              title="Inicio"
              prefetch
            >
              <HomeIcon className="h-5 w-5 mb-1" />
              <span>Inicio</span>
            </Link>
            <Link
              href="/nuevos-horarios"
              className="flex flex-col items-center justify-center text-xs p-2 rounded-md hover:bg-primary/10 transition-colors flex-1 text-center"
              title="Nuevo Horario"
              prefetch
            >
              <ClockIcon className="h-5 w-5 mb-1" />
              <span>Horario</span>
            </Link>
            <Link
              href="/dispositivos"
              className="flex flex-col items-center justify-center text-xs p-2 rounded-md hover:bg-primary/10 transition-colors flex-1 text-center"
              title="Eventos"
              prefetch
            >
              <Calendar className="h-5 w-5 mb-1" />
              <span>Eventos</span>
            </Link>
          </nav>
        </footer>

      </body>
    </html>
  );
}
