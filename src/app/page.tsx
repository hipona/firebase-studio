'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {Trash, Calendar, Moon, Sun, Loader2, X, CheckCircle, Clock, HomeIcon, Plus, Edit} from 'lucide-react';
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
import { cn } from "@/lib/utils";


// TEMPORARY: Define device ID. This should be dynamic in a real app.
const MY_DEVICE_ID = 'ESP8266_001';


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
  const [alertMessage, setAlertMessage] = useState('');
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // State for new/edit schedule form
  const [isEditing, setIsEditing] = useState(false);
  const [editableSchedule, setEditableSchedule] = useState<Schedule | null>(null);
  const [newTime, setNewTime] = useState('');
  const [newDays, setNewDays] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState(true); // true for 'Prende', false for 'Apaga'
  const [currentDayString, setCurrentDayString] = useState<string>('');

  useEffect(() => {
    const date = new Date();
    const dayIndex = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
    // daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    // Mapping JS getDay() to daysOfWeek array indices:
    // Sun (0) -> Dom (idx 6)
    // Mon (1) -> Lun (idx 0)
    // Tue (2) -> Mar (idx 1)
    // Wed (3) -> Mié (idx 2)
    // Thu (4) -> Jue (idx 3)
    // Fri (5) -> Vie (idx 4)
    // Sat (6) -> Sáb (idx 5)
    const jsDayIndexToMyDaysOfWeekIndex = [6, 0, 1, 2, 3, 4, 5];
    const currentDay = daysOfWeek[jsDayIndexToMyDaysOfWeekIndex[dayIndex]];
    setCurrentDayString(currentDay);
  }, []);


  useEffect(() => {
    const serviceStatusRef = ref(db, `${MY_DEVICE_ID}/current_status`);
    const unsubscribeStatus = onValue(serviceStatusRef, snapshot => {
      const status = snapshot.val();
      setServiceStatus(status);
    });

    const schedulesRef = ref(db, `${MY_DEVICE_ID}/horarios_config`);
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
    const scheduleToUpdate = schedules.find(s => s.id === id);
    if (!scheduleToUpdate) {
        toast({
            title: 'Error',
            description: 'No se encontró el horario para actualizar.',
            variant: 'destructive',
        });
        return;
    }

    const scheduleRef = ref(db, `${MY_DEVICE_ID}/horarios_config/${id}`);
    const newScheduleStatus = !currentStatus;

    set(scheduleRef, {
        ...scheduleToUpdate, // spread existing properties
        status: newScheduleStatus, // update only the status
    }).then(() => {
        toast({
            title: 'Éxito',
            description: 'Estado del horario actualizado correctamente.',
        });
        updateVersion(db, MY_DEVICE_ID);
    }).catch(error => {
        toast({
            title: 'Error',
            description: 'Fallo al actualizar el estado del horario: ' + error.message,
            variant: 'destructive',
        });
    });
};


  const handleDeleteSchedule = (id: string) => {
    const scheduleRef = ref(db, `${MY_DEVICE_ID}/horarios_config/${id}`);
    remove(scheduleRef)
      .then(() => {
        toast({
          title: 'Éxito',
          description: 'Horario eliminado exitosamente.',
        });
        updateVersion(db, MY_DEVICE_ID);
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al eliminar el horario: ' + error.message,
          variant: 'destructive',
        });
      });
  };

  const handleDayToggle = (day: string) => {
    setNewDays(prevDays =>
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  const handleOpenAddSheet = () => {
    setIsEditing(false);
    setEditableSchedule(null);
    setNewTime('');
    setNewDays([]);
    setNewStatus(true);
    setSheetOpen(true);
  };

  const handleOpenEditSheet = (schedule: Schedule) => {
    setIsEditing(true);
    setEditableSchedule(schedule);
    setNewTime(schedule.time);
    setNewDays(schedule.days || []);
    setNewStatus(schedule.status);
    setSheetOpen(true);
  };


  const handleSaveSchedule = async () => {
    if (newDays.length === 0 || !newTime) {
      setAlertMessage('Por favor, selecciona al menos un día y una hora para crear el horario.');
      setShowAlert(true);
      return;
    }

    const schedulesRefPath = `${MY_DEVICE_ID}/horarios_config`;
    const schedulesRef = ref(db, schedulesRefPath);

    try {
      const snapshot = await get(schedulesRef);
      const existingSchedulesData = snapshot.val() || {};
      const existingSchedulesArray: Schedule[] = Object.entries(existingSchedulesData).map(([key, value]: [string, any]) => ({
        id: key,
        ...value,
      }));

      const newScheduleParsedTime = parse(newTime, 'HH:mm', new Date());

      for (const existingSchedule of existingSchedulesArray) {
        // Skip comparison if it's the same schedule being edited
        if (isEditing && editableSchedule && existingSchedule.id === editableSchedule.id) {
          continue;
        }

        if (existingSchedule.time && typeof existingSchedule.time === 'string' && existingSchedule.time.match(/^\d{2}:\d{2}$/)) {
          const existingScheduleParsedTime = parse(existingSchedule.time, 'HH:mm', new Date());
          const timeDifference = Math.abs(newScheduleParsedTime.getTime() - existingScheduleParsedTime.getTime());

          if (timeDifference < 60000) { // Less than 1 minute
            setAlertMessage(`Conflicto de Horario: El horario ${newTime} está demasiado cerca de ${existingSchedule.time}. Debe haber al menos 1 minuto de diferencia.`);
            setShowAlert(true);
            return;
          }
        }
      }

      let scheduleIdToSave = '';
      if (isEditing && editableSchedule) {
        scheduleIdToSave = editableSchedule.id;
      } else {
        const scheduleIds = Object.keys(existingSchedulesData)
          .filter(id => id.startsWith('horario_'))
          .map(id => parseInt(id.split('_')[1], 10))
          .filter(num => !isNaN(num));
        const maxId = scheduleIds.length > 0 ? Math.max(...scheduleIds) : 0;
        scheduleIdToSave = `horario_${maxId + 1}`;
      }

      const scheduleDataToSave = {
        time: newTime,
        days: newDays,
        status: newStatus,
      };

      await set(ref(db, `${schedulesRefPath}/${scheduleIdToSave}`), scheduleDataToSave);

      toast({
        title: 'Éxito',
        description: `Horario ${isEditing ? 'actualizado' : 'añadido'} exitosamente como ${scheduleIdToSave}.`,
      });

      setSheetOpen(false); // Close sheet on success
      updateVersion(db, MY_DEVICE_ID);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Fallo al ${isEditing ? 'actualizar' : 'añadir'} el horario: ${error.message}`,
        variant: 'destructive',
      });
      console.error("Error saving schedule:", error);
    }
  };


   const onOpenChangeSheet = (open: boolean) => {
    setSheetOpen(open);
    if (!open) { // Reset form if sheet is closed without saving
      setIsEditing(false);
      setEditableSchedule(null);
    }
  };


  return (
    <div className="m-1 flex flex-col items-center justify-center min-h-[calc(100vh-160px)] py-2">

      {/* Alert Dialog for generic alerts */}
       <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>Alerta</AlertDialogTitle>
               <AlertDialogDescription>
                 {alertMessage}
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowAlert(false)}>Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      {/* Botón flotante para añadir nuevo horario */}
        <Button
            onClick={handleOpenAddSheet}
            className="fixed bottom-20 right-6 rounded-full shadow-lg z-20 h-14 w-14 p-0 transition-all duration-300 group hover:bg-primary/90"
            size="icon"
            title="Nuevo Horario"
        >
            <Plus className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90" />
        </Button>


      {/* Parte De Mis Horario */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Mis Horarios</h2>
        {Object.keys(groupedSchedules).length === 0 ? (
           <p className="text-muted-foreground text-center">No hay horarios añadidos aún.</p>
        ) : (
          Object.entries(groupedSchedules).map(([daysKey, schedulesInGroup]) => (
            <Card key={daysKey} className="mb-2 rounded-lg overflow-hidden bg-card shadow-md">
              <CardHeader className="pb-2 pt-3 px-4 bg-muted/50 dark:bg-black/10">
                <div className="flex flex-wrap gap-1.5 items-center justify-center">
                  {schedulesInGroup[0]?.days && schedulesInGroup[0].days.length > 0 ? (
                    schedulesInGroup[0].days.map(day => (
                      <Badge
                        key={day}
                        className={cn(
                          "text-[0.9rem] rounded-full h-9 w-9 flex items-center justify-center p-0",
                           day === currentDayString ? "bg-primary text-primary-foreground" : "bg-amarillo-100 text-black"
                        )}
                      >
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
                  <div key={schedule.id} className="flex items-center justify-between py-3 border-t border-border">
                    <div className="flex items-center">
                      <CardTitle className={`text-xl font-bold mr-4 ${schedule.status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {schedule.time}
                      </CardTitle>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${schedule.status ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                        {schedule.status ? 'Prende' : 'Apaga'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditSheet(schedule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash className="h-4 w-4" />
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
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>


       {/* Sheet para Añadir/Editar Horario */}
      <Sheet open={sheetOpen} onOpenChange={onOpenChangeSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl p-5 h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-xl font-semibold">
              {isEditing ? 'Editar Horario' : 'Añadir Nuevo Horario'}
            </SheetTitle>
            <SheetDescription className="text-center text-sm text-muted-foreground">
              {isEditing ? 'Modifica los detalles de tu horario.' : 'Configura los detalles para tu nuevo horario.'}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-center mb-1">Días de la Semana</Label>
              <div className="flex flex-wrap justify-center gap-2">
                {daysOfWeek.map(day => (
                  <Button
                    key={day}
                    variant={newDays.includes(day) ? 'default' : 'outline'}
                    onClick={() => handleDayToggle(day)}
                    className={`rounded-md px-3 py-2 text-sm ${newDays.includes(day) ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                    size="sm"
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sheet-time" className="text-sm font-medium text-center">Hora (HH:MM)</Label>
              <Input
                id="sheet-time"
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="text-center text-lg py-2 border rounded-md focus:ring-primary focus:border-primary bg-background"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium text-center">Acción</Label>
              <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setNewStatus(true)}
                    variant={newStatus ? 'default' : 'outline'}
                    className="flex-1 rounded-md"
                  >
                    Prender
                  </Button>
                  <Button
                    onClick={() => setNewStatus(false)}
                    variant={!newStatus ? 'default' : 'outline'}
                    className="flex-1 rounded-md"
                  >
                    Apagar
                  </Button>
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setSheetOpen(false)} variant="outline" className="w-full py-3 rounded-full">
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} className="w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {isEditing ? 'Guardar Cambios' : 'Confirmar Horario'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
