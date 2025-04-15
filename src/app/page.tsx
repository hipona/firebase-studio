'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Separator} from '@/components/ui/separator';
import {toast} from '@/hooks/use-toast';
import {useToast} from '@/hooks/use-toast';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog"

type Schedule = {
  id: string;
  time: string;
  days: string[];
  status: boolean;
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newTime, setNewTime] = useState('');
  const [newDays, setNewDays] = useState<string[]>([]);

  const {toast} = useToast();

  const handleDayToggle = (day: string) => {
    setNewDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const handleAddSchedule = () => {
    if (!newTime) {
      toast({
        title: 'Error',
        description: 'Please enter a valid time.',
        variant: 'destructive',
      });
      return;
    }

    const newSchedule: Schedule = {
      id: Date.now().toString(),
      time: newTime,
      days: newDays,
      status: true,
    };

    setSchedules([...schedules, newSchedule]);
    setNewTime('');
    setNewDays([]);

    toast({
      title: 'Success',
      description: 'Schedule added successfully.',
    });
  };

  const handleStatusToggle = (id: string) => {
    setSchedules((prevSchedules) =>
      prevSchedules.map((schedule) =>
        schedule.id === id ? {...schedule, status: !schedule.status} : schedule
      )
    );
  };

    const handleDeleteSchedule = (id: string) => {
        setSchedules((prevSchedules) =>
            prevSchedules.filter((schedule) => schedule.id !== id)
        );
        toast({
            title: "Success",
            description: "Schedule deleted successfully.",
        });
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">AquaSchedule</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add New Schedule</CardTitle>
          <CardDescription>Set the time and days for your watering schedule.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="time">Time (e.g., 19:00)</Label>
            <Input
              id="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <Button
                  key={day}
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleAddSchedule}>Add Schedule</Button>
        </CardContent>
      </Card>
      <Separator className="my-4" />
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">My Schedules</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground">No schedules added yet.</p>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>{schedule.time}</CardTitle>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this schedule.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)}>
                                    Continue
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Days: {schedule.days.join(', ') || 'Not specified'}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Label htmlFor={`status-${schedule.id}`}>Status</Label>
                    <Switch
                      id={`status-${schedule.id}`}
                      checked={schedule.status}
                      onCheckedChange={() => handleStatusToggle(schedule.id)}
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
