'use client';
import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Separator} from '@/components/ui/separator';
import {useToast} from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X} from 'lucide-react';
import {Badge} from '@/components/ui/badge'; // Import Badge
import {initializeApp} from 'firebase/app';
import {getDatabase, ref, onValue, set, remove, get, update} from 'firebase/database';
import {format, parse} from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
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
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import '../../styles.css'; // Importa el archivo CSS
import {CheckCircle} from 'lucide-react';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger} from '@/components/ui/sheet';
import {RadioButton} from '@/components/ui/radio-button';

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
  const {toast} = useToast();
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
        const schedulesList: Schedule[] = Object.entries(data).map(
          ([key, value]) => ({
            id: key,
            time: value.time,
            days: value.days || [],
            status: value.status,
          })
        );
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
      const timeDifference = Math.abs(
        newScheduleTime.getTime() - existingScheduleTime.getTime()
      );
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
      const newScheduleKey = await getNextScheduleId();
      const newScheduleRef = ref(db, `horarios/${newScheduleKey}`);
      await set(newScheduleRef, {
        time: newTime,
        days: newDays,
        status: true,
      });
      toast({
        title: 'Éxito',
        description: `Horario añadido exitosamente como ${newScheduleKey}.`,
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
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) {
      console.error(`Schedule with id ${id} not found`);
      return;
    }
    set(scheduleRef, {
      time: schedule.time,
      days: schedule.days,
      status: !currentStatus,
    })
      .then(() => {
        setSchedules(prevSchedules =>
          prevSchedules.map(schedule =>
            schedule.id === id ? {...schedule, status: !schedule.status} : schedule
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
          schedule.id === id ? {...schedule, time: updatedTime, days: updatedDays} : schedule
        )
      );
      toast({
        title: 'Éxito',
        description: 'Horario actualizado exitosamente.',
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
      <AlertDialog open={showAlert} onOpenChange={(open) => setShowAlert(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, selecciona al menos un día y una hora para crear el horario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Card for Service Status */}
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

      {/* Listado de Horarios */}
      <h2 className="text-2xl font-bold mt-6 mb-4">Mis Horarios</h2>
      {schedules.length === 0 ? (
        <p>No hay horarios añadidos aún.</p>
      ) : (
        <div className="grid gap-4">
          {schedules.map(schedule => (
            <Card key={schedule.id}>
              <CardHeader>
                <CardTitle>
                  <span
                    className={schedule.status ? 'text-green-500' : 'text-red-500'}
                  >
                    {schedule.time}
                  </span>{' '}
                  ({schedule.id})
                </CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      ¿Estás seguro?
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      Esta acción eliminará el horario permanentemente. ¿Estás seguro de que
                        quieres proceder?
                    </AlertDialogDescription>
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
                      <Badge key={day} variant="secondary" className="rounded-full text-0.9rem">
                        {day}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No especificado</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Label htmlFor={`status-${schedule.id}`}>{schedule.status ? 'Prende' : 'Apaga'}</Label>
                  <Switch
                    id={`status-${schedule.id}`}
                    checked={schedule.status}
                    onCheckedChange={checked => handleStatusToggle(schedule.id, checked)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Parte Añadir Nuevo Horario */}
      <Sheet open={sheetOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="outline">Añadir Nuevo Horario</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Añadir Nuevo Horario</SheetTitle>
            <SheetDescription>Define la hora y los días a planificar.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Horario:
              </Label>
              <Input
                type="time"
                id="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div>
              <Label>Días:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {daysOfWeek.map(day => (
                  <Button
                    key={day}
                    variant={newDays.includes(day) ? 'secondary' : 'outline'}
                    onClick={() => handleDayToggle(day)}
                    size="sm"
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleAddSchedule}>Añadir Horario</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
