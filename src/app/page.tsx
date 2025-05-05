'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X, CheckCircle} from 'lucide-react';
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


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
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
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false); // Estado para controlar la Sheet
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null
  );

  // Función para actualizar la versión en Firebase
  const updateVersion = async () => {
    const versionRef = ref(db, 'version');
    try {
        const snapshot = await get(versionRef);
        const currentVersion = snapshot.val();

        let newVersion;
        do {
        newVersion = Math.floor(Math.random() * 9) + 1; // Genera un número entero entre 1 y 9
        } while (newVersion === currentVersion); // Asegura que el nuevo número sea diferente del actual

        await set(versionRef, newVersion); // Actualiza la versión en Firebase
    } catch (error) {
        console.error("Error updating version:", error);
        // Optionally, inform the user about the error
        toast({
        title: 'Error',
        description: 'No se pudo actualizar la versión del sistema.',
        variant: 'destructive',
        });
    }
  };


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
        const schedulesList: Schedule[] = Object.entries(data).map(([key, value]: [string, any]) => ({ // Explicitly type value
          id: key,
          time: value.time,
          days: value.days || [], // Ensure days is always an array
          status: value.status,
        }));
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
            setSchedules((prevSchedules) =>
                prevSchedules.map((s) =>
                    s.id === id ? { ...s, status: newStatus } : s
                )
            );
            toast({
                title: 'Éxito',
                description: 'Estado del horario actualizado correctamente.',
            });
            // Actualizar la versión en Firebase
            updateVersion();
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
        setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== id));
        // Actualizar la versión en Firebase
        updateVersion();
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
     if (serviceStatus === null) return; // Do nothing if status is still loading

    const newStatus = !serviceStatus;
    const serviceStatusRef = ref(db, 'status_arduino');
    set(serviceStatusRef, newStatus)
      .then(() => {
        setServiceStatus(newStatus); // Update local state immediately
        toast({
          title: 'Éxito',
          description: `Servicio ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
        });
        // Actualizar la versión en Firebase
        updateVersion();
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al actualizar el estado del servicio: ' + error.message,
          variant: 'destructive',
        });
      });
  };
  const onOpenChange = (open: boolean) => { // Explicitly type 'open' as boolean
    setSheetOpen(open);
  };


  return (
    <div className="m-5 flex flex-col items-center justify-center min-h-[calc(100vh-110px)] py-2">


      {/* Indicador de estado del servicio */}
      <Card className="mb-4 w-full max-w-md">
        <CardHeader>
          <CardTitle>Estado del dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center">
            {serviceStatus === true && (
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            )}
            {serviceStatus === false && (
              <X className="h-6 w-6 text-red-500 mr-2" />
            )}
            {serviceStatus === null && (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            )}
            {serviceStatus !== null && (
              <span>{serviceStatus ? 'Activo' : 'Inactivo'}</span>
            )}
          </div>
          <Switch checked={!!serviceStatus} onCheckedChange={toggleServiceStatus} />
        </CardContent>
      </Card>

      <Separator className="my-4" />

      {/* Parte De Mis Horario */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Mis Horarios</h2>
        {schedules.length === 0 ? (
           <p className="text-muted-foreground">No hay horarios añadidos aún.</p>
        ) : (
           <div className="grid gap-2">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle style={{ color: schedule.status ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                    {schedule.time}{' '}
                    <Label htmlFor={`status-${schedule.id}`}>
                      {schedule.status ? 'Prende' : 'Apaga'}
                    </Label>
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash className="h-4 w-4" />
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
                <CardContent>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {schedule.days && schedule.days.length > 0 ? (
                        schedule.days.map(day => (
                          <Badge key={day} className={schedule.status ? 'bg-green-200 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-green-900 dark:text-green-600' : 'bg-red-200 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-red-900 dark:text-red-600'}>
                            {day}
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


    </div>
  );
}
