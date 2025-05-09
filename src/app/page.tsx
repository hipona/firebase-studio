'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X, CheckCircle, Clock, HomeIcon, Plus} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
}
const db = getDatabase(app);


type Schedule = {
  id: string;
  time: string;
  days: string[];
  status: boolean;
};

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const getDaysKey = (days: string[] | undefined): string => {
  if (!days || days.length === 0) return 'no-days';
  return [...days].sort().join(',');
};


export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();
  const [showAlert, setShowAlert] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);


  useEffect(() => {
    const serviceStatusRef = ref(db, 'status_arduino');
    const unsubscribeStatus = onValue(serviceStatusRef, snapshot => {
      const status = snapshot.val();
      setServiceStatus(status);
    });

    const schedulesRef = ref(db, 'horarios');
    const unsubscribeSchedules = onValue(schedulesRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const schedulesList: Schedule[] = Object.entries(data).map(([key, value]: [string, any]) => ({ 
          id: key,
          time: value.time,
          days: value.days || [], 
          status: value.status,
        }));
        
        schedulesList.sort((a, b) => {
          try {
            if (a.time && typeof a.time === 'string' && a.time.match(/^\d{2}:\d{2}$/) &&
                b.time && typeof b.time === 'string' && b.time.match(/^\d{2}:\d{2}$/)) {
              const timeA = parse(a.time, 'HH:mm', new Date());
              const timeB = parse(b.time, 'HH:mm', new Date());
              return timeA.getTime() - timeB.getTime();
            }
            return 0; 
          } catch (e) {
            console.error("Error parsing time for sorting:", e);
            return 0; 
          }
        });
        setSchedules(schedulesList);
      } else {
        setSchedules([]);
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeSchedules();
    } ;
  }, []); 

  const groupedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) return {};
    return schedules.reduce((acc, schedule) => {
      const key = getDaysKey(schedule.days);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(schedule);
      return acc;
    }, {} as Record<string, Schedule[]>);
  }, [schedules]);


  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    const scheduleRef = ref(db, `horarios/${id}`);
    const schedule = schedules.find(s => s.id === id);

    if (schedule) {
        const newStatus = !currentStatus;
        set(scheduleRef, {
            time: schedule.time,
            days: schedule.days,
            status: newStatus,
        }).then(() => {
            toast({
                title: 'Éxito',
                description: 'Estado del horario actualizado correctamente.',
            });
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

  const toggleServiceStatus = () => {
    if (serviceStatus === null || !db) return; 

    const newStatus = !serviceStatus;
    const serviceStatusRef = ref(db, 'status_arduino');
    set(serviceStatusRef, newStatus)
      .then(() => {
        toast({
          title: 'Éxito',
          description: `Servicio ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
        });
        updateVersion(db); 
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al actualizar el estado del servicio: ' + error.message,
          variant: 'destructive',
        });
      });
  };


   const onOpenChange = (open: boolean) => { 
    setSheetOpen(open);
  };


  return (
    <div className="m-1 flex flex-col items-center justify-center min-h-[calc(100vh-160px)] py-2">

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


      {/* Parte De Mis Horario */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Mis Horarios</h2>
        {Object.keys(groupedSchedules).length === 0 ? (
           <p className="text-muted-foreground text-center">No hay horarios añadidos aún.</p>
        ) : (
          Object.entries(groupedSchedules).map(([daysKey, schedulesInGroup]) => (
            <Card key={daysKey} className="rounded-lg overflow-hidden bg-card dark:bg-gray-800 border-border dark:border-gray-700 mb-4 shadow-md">
              <CardHeader className="pb-2 pt-3 px-4 bg-muted/50 dark:bg-gray-700/50">
                <div className="flex flex-wrap gap-1.5 items-center justify-center">
                  {schedulesInGroup[0]?.days && schedulesInGroup[0].days.length > 0 ? (
                    schedulesInGroup[0].days.map(day => (
                      <Badge key={day} variant="secondary" className="text-[0.9rem] rounded-full h-7 w-7 flex items-center justify-center p-0 bg-amarillo-100 text-black dark:bg-yellow-600 dark:text-black">
                        {day.substring(0, 2)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Días no especificados</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-1 px-4">
                {schedulesInGroup.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between py-3 border-t border-border dark:border-gray-700 first:border-t-0">
                    <div className="flex items-center">
                      <CardTitle className={`text-xl font-bold mr-4 ${schedule.status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {schedule.time}
                      </CardTitle>
                      <Badge variant={schedule.status ? 'default' : 'destructive'} className={`${schedule.status ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white text-xs px-2.5 py-1`}>
                        {schedule.status ? 'Prende' : 'Apaga'}
                      </Badge>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el horario permanentemente. ¿Estás seguro de que quieres proceder?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
        {/* Botón flotante */}
        <Link href="/nuevos-horarios" passHref>
          <Button
            className="fixed bottom-20 right-6 rounded-full shadow-lg z-20 h-14 w-14 p-0 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground group"
            size="icon"
            title="Nuevo Horario"
          >
            <Clock className="h-7 w-7 transition-transform duration-300 group-hover:rotate-12" />
          </Button>
        </Link>
    </div>
  );
}
