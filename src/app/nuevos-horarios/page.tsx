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

      {/* Parte Añadir Nuevo Horario */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nuevo Horario</CardTitle>
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
    </div>
  );
}
