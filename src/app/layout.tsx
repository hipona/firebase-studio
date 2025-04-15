'use client';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Calendar, Moon, Sun} from 'lucide-react';
import {useEffect, useState} from 'react';

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
        <header className="bg-secondary text-secondary-foreground p-4 flex items-center justify-center">
          <Calendar className="mr-2" />
          <h1 className="text-xl font-bold">Planer</h1>
        </header>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="fixed top-4 right-4 bg-secondary text-secondary-foreground p-2 rounded-full"
        >
          {isDarkMode ? <Sun /> : <Moon />}
        </button>
        {children}
        <footer className="bg-secondary text-secondary-foreground p-4 text-center">
          Realizado por Mideas Sistemas
        </footer>
      </body>
    </html>
  );
}
