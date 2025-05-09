'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash, Calendar, Moon, Sun, Loader2, X } from 'lucide-react';
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
import '../../../styles.css';
import { CheckCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

export default function NuevosHorariosPage() {
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
  const [newStatus, setNewStatus] = useState<boolean>(true); // Estado para el status del nuevo horario

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


  const handleDayToggle = (day: string) => {
    setNewDays(prevDays =>
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  const handleAddSchedule = async () => {
    if (newDays.length === 0 || !newTime) {
      setShowAlert(true);
      return;
    }

    const schedulesRef = ref(db, 'horarios');
    try {
      const snapshot = await get(schedulesRef);
      const existingSchedulesData = snapshot.val() || {};
      const existingSchedules: Schedule[] = Object.entries(existingSchedulesData).map(([key, value]: [string, any]) => ({
        id: key,
        ...value,
      }));

      const newScheduleTime = parse(newTime, 'HH:mm', new Date());
      for (const schedule of existingSchedules) {
        // Ensure schedule.time is valid before parsing
        if (schedule.time && typeof schedule.time === 'string' && schedule.time.match(/^\d{2}:\d{2}$/)) {
          const existingScheduleTime = parse(schedule.time, 'HH:mm', new Date());
          const timeDifference = Math.abs(newScheduleTime.getTime() - existingScheduleTime.getTime());

          // Check if times are too close (within 60 seconds)
          if (timeDifference < 60000) {
            toast({
              title: 'Conflicto de Horario',
              description: `El horario ${newTime} está demasiado cerca de ${schedule.time}. Debe haber al menos 1 minuto de diferencia.`,
              variant: 'destructive',
            });
            return; // Stop the process
          }
        } else {
          console.warn(`Invalid time format for schedule ${schedule.id}: ${schedule.time}`);
          // Optionally handle invalid time formats if necessary
        }
      }


      const nextId = await getNextScheduleId();
      const newScheduleRef = ref(db, `horarios/${nextId}`);
      await set(newScheduleRef, {
        time: newTime,
        days: newDays,
        status: newStatus, // Usar el estado del radio button
      });
      toast({
        title: 'Éxito',
        description: `Horario añadido exitosamente como ${nextId}.`,
      });
      setNewTime('');
      setNewDays([]);
      setNewStatus(true); // Resetear el estado del radio button

      // Actualizar la versión en Firebase
      await updateVersion();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Fallo al añadir el horario: ' + error.message,
        variant: 'destructive',
      });
      console.error("Error adding schedule:", error); // Log detailed error
    }
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

  return (
    <div className="m-5 flex flex-col items-center justify-center min-h-[calc(100vh-110px)] py-2">
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

      {/* Parte Añadir Nuevo Horario */}
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Selecciona Fecha y Hora</CardTitle>
          <CardDescription>Configura tu nuevo horario.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-2">
          {/* Day Selection */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-center mb-2">Días de la Semana</Label>
            <div className="flex flex-wrap justify-center gap-2">
              {daysOfWeek.map(day => (
                <Button
                  key={day}
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  onClick={() => handleDayToggle(day)}
                  className={`rounded-md px-2 py-2 text-sm ${newDays.includes(day) ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                  size="sm"
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Input */}
          <div className="grid gap-2">
            <Label htmlFor="time" className="text-sm font-medium text-center">Hora (HH:MM)</Label>
            <Input
              id="time"
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="text-center text-lg py-2 border rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Status Selection */}
           <div className="grid gap-2">
              <Label className="text-sm font-medium text-center">Acción</Label>
              <RadioGroup
                defaultValue={newStatus.toString()}
                className="flex justify-center gap-4"
                onValueChange={(value) => setNewStatus(value === 'true')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="on" />
                  <Label htmlFor="on" className="text-sm">Prender</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="off" />
                  <Label htmlFor="off" className="text-sm">Apagar</Label>
                </div>
              </RadioGroup>
            </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
             <Button onClick={() => { /* Add cancel logic if needed, e.g., navigate back */ }} variant="outline" className="w-full py-3 rounded-full">
                Cancelar
             </Button>
             <Button onClick={handleAddSchedule} className="w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Confirmar
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
