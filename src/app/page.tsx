'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Trash,
  Calendar,
  Moon,
  Sun,
  Loader2,
  X,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import '../../styles.css'; // Importa el archivo CSS

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { updateVersion } from '@/lib/firebaseUtils'; // Import the utility function
import { usePathname } from 'next/navigation';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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

type GroupedScheduleData = {
  days: string[];
  status: boolean;
  times: Array<{ id: string; time: string }>;
};

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groupedSchedules, setGroupedSchedules] = useState<Map<string, GroupedScheduleData>>(new Map());
  const { toast } = useToast();
  const [showAlert, setShowAlert] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const pathname = usePathname();


  useEffect(() => {
    const serviceStatusRef = ref(db, 'status_arduino');
    const unsubscribeStatus = onValue(serviceStatusRef, snapshot => {
      const status = snapshot.val();
      setServiceStatus(status);
    });

    const schedulesRef = ref(db, 'horarios');
    const unsubscribeSchedules = onValue(schedulesRef, snapshot => {
      const data = snapshot.val();
      let schedulesList: Schedule[] = [];
      if (data) {
        schedulesList = Object.entries(data).map(
          ([key, value]: [string, any]) => ({
            id: key,
            time: value.time,
            days: Array.isArray(value.days) ? value.days.sort() : [],
            status: value.status,
          })
        );
        schedulesList.sort((a, b) => {
          try {
            if (
              a.time &&
              typeof a.time === 'string' &&
              a.time.match(/^\d{2}:\d{2}$/) &&
              b.time &&
              typeof b.time === 'string' &&
              b.time.match(/^\d{2}:\d{2}$/)
            ) {
              const timeA = parse(a.time, 'HH:mm', new Date());
              const timeB = parse(b.time, 'HH:mm', new Date());
              return timeA.getTime() - timeB.getTime();
            }
            return 0;
          } catch (e) {
            console.error('Error parsing time for sorting:', e);
            return 0;
          }
        });
      }

      const newGroupedSchedules = new Map<string, GroupedScheduleData>();
      schedulesList.forEach(schedule => {
        const groupKey = `${schedule.days.join(',')}-${schedule.status}`;
        if (!newGroupedSchedules.has(groupKey)) {
          newGroupedSchedules.set(groupKey, {
            days: schedule.days,
            status: schedule.status,
            times: [],
          });
        }
        newGroupedSchedules
          .get(groupKey)!
          .times.push({ id: schedule.id, time: schedule.time });
      });

      newGroupedSchedules.forEach(group => {
        group.times.sort((a, b) => {
          try {
            if (
              a.time &&
              typeof a.time === 'string' &&
              a.time.match(/^\d{2}:\d{2}$/) &&
              b.time &&
              typeof b.time === 'string' &&
              b.time.match(/^\d{2}:\d{2}$/)
            ) {
              const timeA = parse(a.time, 'HH:mm', new Date());
              const timeB = parse(b.time, 'HH:mm', new Date());
              return timeA.getTime() - timeB.getTime();
            }
            return 0;
          } catch (e) {
            console.error('Error parsing time for sorting within group:', e);
            return 0;
          }
        });
      });
      
      setSchedules(schedulesList);
      setGroupedSchedules(newGroupedSchedules);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeSchedules();
    };
  }, []);

  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    const scheduleRef = ref(db, `horarios/${id}`);
    const schedule = schedules.find(s => s.id === id);

    if (schedule) {
      const newStatus = !currentStatus;
      set(scheduleRef, {
        time: schedule.time,
        days: schedule.days,
        status: newStatus,
      })
        .then(() => {
          toast({
            title: 'Éxito',
            description: 'Estado del horario actualizado correctamente.',
          });
          updateVersion(db);
        })
        .catch(error => {
          toast({
            title: 'Error',
            description:
              'Fallo al actualizar el estado del horario: ' + error.message,
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

  return (
    <div className="m-1 flex flex-col items-center justify-center min-h-[calc(100vh-125px)] py-2">
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, selecciona al menos un día y una hora para crear el
              horario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Card de Estado del Servicio */}
      <Card className="w-full max-w-md mb-6 shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-center">
            Estado del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center space-x-3">
          <span
            className={`h-4 w-4 rounded-full border-2 ${
              serviceStatus === true
                ? 'bg-green-500 border-green-700'
                : serviceStatus === false
                ? 'bg-gray-400 border-gray-600'
                : 'bg-yellow-400 border-yellow-600 animate-pulse'
            }`}
          ></span>
          <span className="text-sm font-medium">
            {serviceStatus === true
              ? 'Activo'
              : serviceStatus === false
              ? 'Inactivo'
              : 'Cargando...'}
          </span>
        </CardContent>
      </Card>

      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Mis Horarios</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground text-center">
            No hay horarios añadidos aún.
          </p>
        ) : (
          <div className="grid gap-4">
            {Array.from(groupedSchedules.entries()).map(
              ([groupKey, groupData]) => (
                <Card
                  key={groupKey}
                  className="rounded-lg overflow-hidden bg-card shadow-md"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4 bg-muted/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      {groupData.days.map(day => (
                        <Badge
                          key={day}
                          variant="secondary"
                          className="text-[0.9rem] rounded-full h-7 w-7 flex items-center justify-center p-0 bg-amarillo-100"
                        >
                          {day.substring(0, 3)}
                        </Badge>
                      ))}
                    </div>
                    <Badge
                      variant={groupData.status ? 'default' : 'destructive'}
                      className={
                        groupData.status
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-red-500 hover:bg-red-600'
                      }
                    >
                      {groupData.status ? 'Prende' : 'Apaga'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4">
                    {groupData.times.map(scheduleTime => (
                      <div
                        key={scheduleTime.id}
                        className="flex items-center justify-between py-2 border-b last:border-b-0"
                      >
                        <span
                          className={`text-lg font-semibold ${
                            groupData.status
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {scheduleTime.time}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Estás seguro?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará el horario
                                permanentemente. ¿Estás seguro de que quieres
                                proceder?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteSchedule(scheduleTime.id)
                                }
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
      {pathname === '/' && (
         <Link href="/nuevos-horarios" passHref>
           <Button
            className="fixed bottom-20 right-6 rounded-full shadow-lg z-20 h-14 w-14 p-0 transition-all duration-300 bg-primary hover:bg-primary/90 group"
            size="icon"
            title="Nuevo Horario"
          >
            <Plus className="h-7 w-7 text-primary-foreground transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </Link>
      )}
    </div>
  );
}
