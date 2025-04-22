'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Calendar, Moon, Sun} from 'lucide-react';
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
        <header className="fixed top-0 left-0 w-full bg-secondary text-secondary-foreground p-4 flex items-center justify-center z-10">
          <Link href="/" className="mr-4">
            <Calendar className="mr-2" />
            Planer
          </Link>
          <Link href="/dispositivos" className="mr-4">
            Dispositivos
          </Link>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-2 right-2 bg-secondary text-secondary-foreground p-2 rounded-full"
          >
            {isDarkMode ? <Sun /> : <Moon />}
          </button>
        </header>
        <div style={{marginTop: '60px'}}>
          {children}
        </div>
        <footer className="bg-secondary text-secondary-foreground p-4 text-center">
          Realizado por Mideas Sistemas
        </footer>
      </body>
    </html>
  );
}
