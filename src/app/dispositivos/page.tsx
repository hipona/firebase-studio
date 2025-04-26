'use client';

import {useEffect, useState} from 'react';
import {initializeApp} from 'firebase/app';
import {getDatabase, ref, onValue, remove} from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {CheckCircle, Trash} from 'lucide-react'; // Import CheckCircle icon
import {useSwipeable} from 'react-swipeable';
import {useToast} from '@/hooks/use-toast';
import {updateVersion} from '@/app/page'; // Import updateVersion

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

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] = useState<any>(null);
  const [eventos, setEventos] = useState<any>(null);
  const {toast} = useToast();

  useEffect(() => {
    const dispositivosRef = ref(db, 'dispositivos');
    onValue(dispositivosRef, snapshot => {
      const data = snapshot.val();
      setDispositivos(data);
    });

    const eventosRef = ref(db, 'eventos');
    onValue(eventosRef, snapshot => {
      const data = snapshot.val();
      setEventos(data);
    });
  }, []);

  const deleteEvent = (dispositivoId: string, eventoId: string) => {
    const eventoRef = ref(db, `eventos/${dispositivoId}/${eventoId}`);
    remove(eventoRef)
      .then(() => {
        toast({
          title: 'Éxito',
          description: 'Evento eliminado exitosamente.',
        });
        setEventos(prevEventos => {
          const updatedEventos = {...prevEventos};
          delete updatedEventos[dispositivoId][eventoId];
          if (Object.keys(updatedEventos[dispositivoId]).length === 0) {
            delete updatedEventos[dispositivoId];
          }
          return updatedEventos;
        });
        updateVersion();
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al eliminar el evento: ' + error.message,
          variant: 'destructive',
        });
      });
  };

  const swipeHandlers = (dispositivoId: string, eventoId: string) =>
    useSwipeable({
      onSwipedLeft: () => deleteEvent(dispositivoId, eventoId),
      preventDefaultTouchmoveEvent: true,
      trackMouse: false,
    });

  return (
    <div className="m-5">
      {/* Sección de Dispositivos */}
      <h1 className="text-2xl font-bold mb-4">Dispositivos</h1>
      {dispositivos ? (
        Object.entries(dispositivos).map(([id, data]: [string, any]) => (
          <Card key={id} className="mb-4">
            <CardHeader>
              <CardTitle>{id}</CardTitle>
              <CardDescription>Detalles del dispositivo</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {Object.entries(data).map(([key, value]: [string, any]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>Cargando dispositivos...</p>
      )}

      <Separator className="my-6" />

      {/* Sección de Eventos */}
      <h1 className="text-2xl font-bold mb-4">Eventos</h1>
      {eventos ? (
        Object.entries(eventos).map(([dispositivoId, eventosData]: [string, any]) => (
          <Card key={dispositivoId} className="mb-4">
            <CardHeader>
              <CardTitle>Eventos de {dispositivoId}</CardTitle>
              <CardDescription>Historial de eventos</CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {Object.entries(eventosData).map(([eventoId, eventoData]: [string, any]) => {
                  const handlers = swipeHandlers(dispositivoId, eventoId);
                  return (
                    <li
                      key={eventoId}
                      {...handlers}
                      className="relative mb-3.5 pl-4 last:mb-0 before:content-[''] before:w-2 before:h-2 before:bg-green-300 before:border-2 before:border-green-500 before:absolute before:left-0 before:top-1.5 before:rounded-full overflow-hidden transition-all transform origin-right"
                      style={{
                        transform: handlers.isSwiping ? `translateX(-20px)` : 'translateX(0)',
                      }}
                    >
                      <div className="relative z-10 bg-background p-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="inline-block h-4 w-4 mr-1 text-green-500 align-middle" />
                          {eventoData.descripcion}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 ml-5">
                          {eventoData.hora} {eventoData.fecha}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 ml-5">
                          Tipo: {eventoData.tipo}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEvent(dispositivoId, eventoId)}
                        className="absolute top-0 bottom-0 right-0 w-10 bg-red-500 text-white flex items-center justify-center"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>Cargando eventos...</p>
      )}
    </div>
  );
}
