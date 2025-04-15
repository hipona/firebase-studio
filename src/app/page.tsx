'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Separator} from '@/components/ui/separator';
import {toast} from '@/hooks/use-toast';
import {useToast} from '@/hooks/use-toast';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, remove, push, increment } from 'firebase/database';
import {format} from "date-fns";

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

  useEffect(() => {
    const schedulesRef = ref(db, 'schedules');
    onValue(schedulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const schedulesList: Schedule[] = Object.entries(data).map(([key, value]) => ({
          id: key,
          time: value.time,
          days: value.days,
          status: value.status,
        }));
        setSchedules(schedulesList);
      } else {
        setSchedules([]);
      }
    });
  }, []);

  const handleDayToggle = (day: string) => {
    setNewDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const handleAddSchedule = async () => {
    if (!newTime) {
      toast({
        title: 'Error',
        description: 'Por favor, introduce una hora válida.',
        variant: 'destructive',
      });
      return;
    }

    const newSchedule: Schedule = {
      id: '', // El ID será generado por Firebase
      time: newTime,
      days: newDays,
      status: true,
    };

    const counterRef = ref(db, 'scheduleCounter/count');
    try {
      // 1. Obtener el valor actual del contador
      const snapshot = await new Promise((resolve) => {
        onValue(counterRef, (snapshot) => {
          resolve(snapshot);
        }, {
          onlyOnce: true // Para que onValue se ejecute solo una vez
        });
      });

      let currentCount = snapshot.val();

      // Si el contador no existe, inicializarlo en 0
      if (currentCount === null) {
        currentCount = 0;
      }

      // 2. Crear el nuevo horario con el ID incrementado
      const newScheduleRef = ref(db, `schedules/horario_${currentCount + 1}`);

      await update(newScheduleRef, {
        time: newSchedule.time,
        days: newSchedule.days,
        status: newSchedule.status
      });

      // 3. Incrementar el contador
      await update(counterRef, increment(1));

      toast({
        title: 'Éxito',
        description: 'Horario añadido exitosamente.',
      });
      setNewTime('');
      setNewDays([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Fallo al añadir el horario: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    const scheduleRef = ref(db, `schedules/${id}`);

    update(scheduleRef, { status: !currentStatus })
      .then(() => {
        setSchedules((prevSchedules) =>
          prevSchedules.map((schedule) =>
            schedule.id === id ? {...schedule, status: !schedule.status} : schedule
          )
        );
        toast({
          title: "Éxito",
          description: "Estado del horario actualizado correctamente.",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Fallo al actualizar el estado del horario: " + error.message,
          variant: "destructive",
        });
      });
  };

  const handleDeleteSchedule = (id: string) => {
    const scheduleRef = ref(db, `schedules/${id}`);
    remove(scheduleRef)
      .then(() => {
        toast({
          title: "Éxito",
          description: "Horario eliminado exitosamente.",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Fallo al eliminar el horario: " + error.message,
          variant: "destructive",
        });
      });
  };

  const handleUpdateSchedule = (id: string, updatedTime: string, updatedDays: string[]) => {
    const scheduleRef = ref(db, `schedules/${id}`);
    update(scheduleRef, { time: updatedTime, days: updatedDays })
      .then(() => {
        setSchedules((prevSchedules) =>
          prevSchedules.map((schedule) =>
            schedule.id === id ? {...schedule, time: updatedTime, days: updatedDays} : schedule
          )
        );
        toast({
          title: "Éxito",
          description: "Horario actualizado exitosamente.",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Fallo al actualizar el horario: " + error.message,
          variant: "destructive",
        });
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">AquaSchedule</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Añadir Nuevo Horario</CardTitle>
          <CardDescription>Define la hora y los días para tu horario de riego.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="time">Hora (e.g., 19:00)</Label>
            <Input
              id="time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Días</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
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
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Mis Horarios</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground">No hay horarios añadidos aún.</p>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle style={{ color: schedule.status ? 'green' : 'red' }}>
                    {schedule.time}
                  </CardTitle>
                  <Select onValueChange={(value) => {
                    if (value === "delete") {
                      handleDeleteSchedule(schedule.id);
                    }
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Acciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edit">Modificar</SelectItem>
                      <SelectItem value="delete">Eliminar</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {schedule.days && schedule.days.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {schedule.days.map(day => (
                        <Badge key={day} variant="secondary">{day}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Días: No especificado</p>
                  )}
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
