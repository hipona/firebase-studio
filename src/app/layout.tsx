'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import {
  Calendar,
  ClockIcon,
  HomeIcon,
  Moon,
  Sun,
  Plus,
  Power,
} from 'lucide-react'; // Import Plus icon
import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { updateVersion } from '@/lib/firebaseUtils'; // Import the utility function

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error('Firebase initialization error:', e);
  // Handle the error appropriately, maybe show a message to the user
}
const db = getDatabase(app);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize state to null to avoid immediate rendering based on default
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const [showAlert, setShowAlert] = useState(false); // Keep for potential future use
  const { toast } = useToast();

  // Effect for setting dark mode based on localStorage and applying class
  useEffect(() => {
    const storedDarkMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDarkMode = storedDarkMode !== null ? storedDarkMode === 'true' : prefersDark;

    setIsDarkMode(initialDarkMode); // Set state after checking localStorage/system preference

    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Empty dependency array, runs once on mount client-side


  // Effect for updating class and localStorage when isDarkMode changes
   useEffect(() => {
    // Only run if isDarkMode is not null (i.e., after initial client-side setup)
    if (isDarkMode !== null) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }, [isDarkMode]); // Runs when isDarkMode changes

  useEffect(() => {
    const serviceStatusRef = ref(db, 'status_arduino');
    const unsubscribeStatus = onValue(serviceStatusRef, snapshot => {
      const status = snapshot.val();
      setServiceStatus(status);
    });

    return () => {
      unsubscribeStatus();
    };
  }, []); // Empty dependency array, runs once on mount

  const toggleServiceStatus = () => {
    if (serviceStatus === null || !db) return; // Do nothing if status is still loading or db not initialized

    const newStatus = !serviceStatus;
    const serviceStatusRef = ref(db, 'status_arduino');
    set(serviceStatusRef, newStatus)
      .then(() => {
        toast({
          title: 'Éxito',
          description: `Servicio ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
        });
        updateVersion(db); // Update version on successful status change
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al actualizar el estado del servicio: ' + error.message,
          variant: 'destructive',
        });
      });
  };

   const handleThemeToggle = () => {
    // Only allow toggling if isDarkMode has been initialized
    if (isDarkMode !== null) {
      setIsDarkMode(!isDarkMode);
    }
  };


  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        {/* Header with Device Status */}
        <header className="fixed top-0 left-0 w-full bg-primary dark:bg-gray-900 text-primary-foreground dark:text-white px-4 py-3 z-50 shadow-md border-b border-border dark:border-gray-800 transition-colors duration-300 flex items-center justify-between">
          {/* Device Status Indicator */}
          <div className="flex items-center space-x-2">
            <span
              className={`h-3 w-3 rounded-full border-2 border-primary-foreground ${
                serviceStatus === true
                  ? 'bg-green-400'
                  : serviceStatus === false
                    ? 'bg-red-500'
                    : 'bg-gray-400 animate-pulse'
              }`}
              aria-hidden="true" // Hide decorative element from screen readers
            ></span>
            <span className="text-sm font-medium">
              {serviceStatus === true
                ? 'ENCENDIDO'
                : serviceStatus === false
                  ? 'APAGADO'
                  : 'Cargando...'}
            </span>
          </div>

          <h1 className="text-xl font-bold text-center absolute left-1/2 transform -translate-x-1/2">
            Planer
          </h1>

          {/* Spacer to push other items to the right */}
          <div className="flex items-center space-x-4">
            {/* Toggle Switch for Service */}
            <Switch
              id="service-status-switch-header" // Unique ID
              checked={serviceStatus ?? false}
              onCheckedChange={toggleServiceStatus}
              disabled={serviceStatus === null}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-600" // Custom colors
              aria-label="Activar o desactivar servicio"
            />
            {/* Dark Mode Toggle Button */}
            <button
              onClick={handleThemeToggle}
              className="bg-secondary text-secondary-foreground p-2 rounded-full"
              disabled={isDarkMode === null} // Disable until initialized
              aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-grow pt-20 pb-20"> {/* Adjusted padding top & bottom */}
          <div className="m-5"> {/* Added margin to main content area */}
            {children}
          </div>
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

            {/* Removed Dark mode toggle from bottom nav */}
          </nav>
          <div className="bg-secondary text-secondary-foreground p-2 text-center text-xs border-t border-border">
            Realizado por Mideas Sistemas
          </div>
        </footer>
        {/* Alert Dialog */}
        <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>
                Contenido del error aquí.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowAlert(false)}>
                Cerrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </body>
    </html>
  );
}
