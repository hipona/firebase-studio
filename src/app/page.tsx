'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X, CheckCircle, Clock} from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';
import { format, parse } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import '../../styles.css'; // Importa el archivo CSS

import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter} from '@/components/ui/sheet';
import { updateVersion } from '@/lib/firebaseUtils'; // Import the utility function


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


type Schedule = {
  id: string;
  time: string;
  days: string[];
  status: boolean;
};

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();
  const [showAlert, setShowAlert] = useState(false);
  // Removed serviceStatus state as it will be managed in layout
  const [sheetOpen, setSheetOpen] = useState(false); // Estado para controlar la Sheet
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null
  );




  useEffect(() => {
    // Removed serviceStatus listener as it's now in layout

    const schedulesRef = ref(db, 'horarios');
    const unsubscribeSchedules = onValue(schedulesRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const schedulesList: Schedule[] = Object.entries(data).map(([key, value]: [string, any]) => ({ // Explicitly type value
          id: key,
          time: value.time,
          days: value.days || [], // Ensure days is always an array
          status: value.status,
        }));
        // Sort schedules by time
        schedulesList.sort((a, b) => {
          try {
            // Ensure times are valid before parsing
            if (a.time && typeof a.time === 'string' && a.time.match(/^\d{2}:\d{2}$/) &&
                b.time && typeof b.time === 'string' && b.time.match(/^\d{2}:\d{2}$/)) {
              const timeA = parse(a.time, 'HH:mm', new Date());
              const timeB = parse(b.time, 'HH:mm', new Date());
              return timeA.getTime() - timeB.getTime();
            }
            return 0; // Keep original order if parsing fails or times are invalid
          } catch (e) {
            console.error("Error parsing time for sorting:", e);
            return 0; // Keep original order if parsing fails
          }
        });
        setSchedules(schedulesList);
      } else {
        setSchedules([]);
      }
    });

    return () => {
      // Removed unsubscribeStatus
      unsubscribeSchedules();
    } ;
  }, []); // Removed db from dependency array as it's initialized outside

  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    const scheduleRef = ref(db, `horarios/${id}`);
    const schedule = schedules.find(s => s.id === id);

    if (schedule) {
        const newStatus = !currentStatus;
        // Use set with the entire object structure
        set(scheduleRef, {
            time: schedule.time,
            days: schedule.days,
            status: newStatus,
        }).then(() => {
            toast({
                title: 'Éxito',
                description: 'Estado del horario actualizado correctamente.',
            });
            // Actualizar la versión en Firebase
            updateVersion(db);
        }).catch(error => {
            toast({
                title: 'Error',
                description: 'Fallo al actualizar el estado del horario: ' + error.message,
                variant: 'destructive',
            });
        });
    } else {
        toast({
            title: 'Error',
            description: 'No se encontró el horario para actualizar.',
            variant: 'destructive',
        });
    }
};


  const handleDeleteSchedule = (id: string) => {
    const scheduleRef = ref(db, `horarios/${id}`);
    remove(scheduleRef)
      .then(() => {
        toast({
          title: 'Éxito',
          description: 'Horario eliminado exitosamente.',
        });
        updateVersion(db);
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al eliminar el horario: ' + error.message,
          variant: 'destructive',
        });
      });
  };

  // Removed toggleServiceStatus function as it's now in layout

   const onOpenChange = (open: boolean) => { // Explicitly type 'open' as boolean
    setSheetOpen(open);
  };


  return (
    <div className="m-1 flex flex-col items-center justify-center min-h-[calc(100vh-125px)] py-2"> {/* Adjusted min-height and margin */}

      {/* Alert Dialog for missing time and days */}
       <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>Error</AlertDialogTitle>
               <AlertDialogDescription>
                 Por favor, selecciona al menos un día y una hora para crear el horario.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowAlert(false)}>Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      {/* Removed Indicador de estado del servicio card */}


      {/* Parte De Mis Horario */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Mis Horarios</h2>
        {schedules.length === 0 ? (
           <p className="text-muted-foreground text-center">No hay horarios añadidos aún.</p>
        ) : (
           <div className="grid gap-4">
            {schedules.map(schedule => (
              <Card key={schedule.id} className="shadow-md rounded-lg overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 bg-card">
                  <CardTitle className={`text-lg font-semibold ${schedule.status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {schedule.time}
                  </CardTitle>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${schedule.status ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                      {schedule.status ? 'Prende' : 'Apaga'}
                    </span>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                         <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                         <AlertDialogDescription>
                           Esta acción eliminará el horario permanentemente. ¿Estás seguro de que quieres
                           proceder?
                         </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {schedule.days && schedule.days.length > 0 ? (
                        schedule.days.map(day => (
                          <Badge key={day} variant="secondary" className="text-[0.9rem] rounded-full h-6 w-6 flex items-center justify-center p-0"> {/* Adjusted badge styling */}
                            {day.substring(0, 1)} {/* Display only the first letter */}
                          </Badge>
                        ))
                      ) : (
                         <p className="text-sm text-muted-foreground">Días: No especificado</p>
                      )}
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Botón flotante (Only shown on home page implicitly) */}
      <Link href="/nuevos-horarios" passHref prefetch>
          <Button
            className="fixed bottom-20 right-6 rounded-full shadow-lg z-20 h-14 w-14 p-0 transition-all duration-300 hover:bg-accent group" // Added group class
            size="icon"
            title="Nuevo Horario"
          >
            <Clock className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" /> {/* Adjusted icon size */}
          </Button>
      </Link>
      {/* Removed Sheet for adding new schedule, keeping button logic */}
    </div>
  );
}
