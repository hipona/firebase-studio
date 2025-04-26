'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X} from 'lucide-react';
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
import {CheckCircle} from 'lucide-react';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger} from '@/components/ui/sheet';

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
  const [newTime, setNewTime] = useState('');
  const [newDays, setNewDays] = useState<string[]>([]);
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
    const snapshot = await get(versionRef);
    const currentVersion = snapshot.val();

    let newVersion;
    do {
      newVersion = Math.floor(Math.random() * 9) + 1; // Genera un número entero entre 1 y 9
    } while (newVersion === currentVersion); // Asegura que el nuevo número sea diferente del actual

    await set(versionRef, newVersion); // Actualiza la versión en Firebase
  };

  useEffect(() => {
    const serviceStatusRef = ref(db, 'status_arduino');
    const unsubscribe = onValue(serviceStatusRef, snapshot => {
      const status = snapshot.val();
      setServiceStatus(status);
    });

    const schedulesRef = ref(db, 'horarios');
    onValue(schedulesRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const schedulesList: Schedule[] = Object.entries(data).map(([key, value]) => ({
          id: key,
          time: value.time,
          days: value.days || [],
          status: value.status,
        }));
        setSchedules(schedulesList);
      } else {
        setSchedules([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDayToggle = (day: string) => {
    setNewDays(prevDays =>
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  const getNextScheduleId = async () => {
    const schedulesRef = ref(db, 'horarios');
    const snapshot = await get(schedulesRef);
    const data = snapshot.val();
    if (!data) {
      return 'horario_1';
    }
    const scheduleIds = Object.keys(data)
      .filter(id => id.startsWith('horario_'))
      .map(id => {
        const numPart = id.split('_')[1];
        return parseInt(numPart, 10);
      })
      .filter(num => !isNaN(num));
    const maxId = scheduleIds.length > 0 ? Math.max(...scheduleIds) : 0;
    return `horario_${maxId + 1}`;
  };

  const handleAddSchedule = async () => {
    if (newDays.length === 0 || !newTime) {
      setShowAlert(true);
      return;
    }

    const newScheduleTime = parse(newTime, 'HH:mm', new Date());
    for (const schedule of schedules) {
      const existingScheduleTime = parse(schedule.time, 'HH:mm', new Date());
      const timeDifference = Math.abs(newScheduleTime.getTime() - existingScheduleTime.getTime());
      if (timeDifference <= 60000) {
        toast({
          title: 'Error',
          description:
            'El nuevo horario está demasiado cerca de un horario existente. Por favor, elige una hora con al menos un minuto de diferencia.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const nextId = await getNextScheduleId();
      const newScheduleRef = ref(db, `horarios/${nextId}`);
      await set(newScheduleRef, {
        time: newTime,
        days: newDays,
        status: true,
      });
      toast({
        title: 'Éxito',
        description: `Horario añadido exitosamente como ${nextId}.`,
      });
      setNewTime('');
      setNewDays([]);

      // Actualizar la versión en Firebase
      await updateVersion();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Fallo al añadir el horario: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    const scheduleRef = ref(db, `horarios/${id}`);
    set(scheduleRef, {
      time: schedules.find(s => s.id === id)?.time || '',
      days: schedules.find(s => s.id === id)?.days || [],
      status: !currentStatus,
    })
      .then(() => {
        setSchedules(prevSchedules =>
          prevSchedules.map(schedule =>
            schedule.id === id ? { ...schedule, status: !schedule.status } : schedule
          )
        );
        toast({
          title: 'Éxito',
          description: 'Estado del horario actualizado correctamente.',
        });

        // Actualizar la versión en Firebase
        updateVersion();
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al actualizar el estado del horario: ' + error.message,
          variant: 'destructive',
        });
      });
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

  const handleUpdateSchedule = async (id: string, updatedTime: string, updatedDays: string[]) => {
    try {
      const scheduleRef = ref(db, `horarios/${id}`);
      await set(scheduleRef, {
        time: updatedTime,
        days: updatedDays,
        status: schedules.find(s => s.id === id)?.status || true,
      });
      setSchedules(prevSchedules =>
        prevSchedules.map(schedule =>
          schedule.id === id ? { ...schedule, time: updatedTime, days: updatedDays } : schedule
        )
      );
      toast({
        title: 'Éxito',
        description: 'Horario actualizado exitosamente.',

        // Actualizar la versión en Firebase
        //updateVersion();
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Fallo al actualizar el horario: ' + error.message,
        variant: 'destructive',
      });
    }
  };

   const toggleServiceStatus = () => {
    const newStatus = !serviceStatus;
    const serviceStatusRef = ref(db, 'status_arduino');
    set(serviceStatusRef, newStatus)
      .then(() => {
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
  const onOpenChange = () => {
    setSheetOpen(!sheetOpen);
  };

  return (
    <div className="m-1 flex flex-col items-center justify-center min-h-screen py-2">
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

      {/* Indicador de estado del servicio */}
      <Card className="mb-4 w-full max-w-md">
        <CardHeader>
          <CardTitle>Estado actual del dispositivo</CardTitle>
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
      
      {/* Parte Añadir Nuevo Horario */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Añadir Nuevo Horario</CardTitle>
          <CardDescription>Define la hora y los días a planificar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="time">Horario:</Label>
            <Input
              id="time"
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Días:</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <Button
                  key={day}
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  onClick={() => handleDayToggle(day)}
                  className={newDays.includes(day) ? 'bg-primary text-primary-foreground' : ''}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleAddSchedule}>Añadir Horario</Button>
        </CardContent>
      </Card>

      <Separator className="my-4" />
      
      {/* Parte De Mis Horario */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Mis Horarios</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground">No hay horarios añadidos aún.</p>
        ) : (
          <div className="grid gap-4">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle style={{ color: schedule.status ? 'green' : 'red' }}>
                    {schedule.time}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({schedule.id})
                    </span>
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
                  <div className="flex flex-wrap gap-1 mb-2">
                    {schedule.days && schedule.days.length > 0 ? (
                      schedule.days.map(day => (
                        <Badge key={day} className={schedule.status ? 'custom-badge-green' : 'custom-badge-red'}>
                          {day}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Días: No especificado</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Label htmlFor={`status-${schedule.id}`}>
                      {schedule.status ? 'Prende' : 'Apaga'}
                    </Label>
                    <Switch
                      id={`status-${schedule.id}`}
                      checked={schedule.status}
                      onCheckedChange={() => handleStatusToggle(schedule.id, schedule.status)}
                    />
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