'use client';

import {useEffect, useState} from 'react';
import {initializeApp} from 'firebase/app';
import {getDatabase, ref, onValue} from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {CheckCircle} from 'lucide-react'; // Import CheckCircle icon

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
              <ul className="relative list-none pl-5 mt-2 before:content-[''] before:w-0.5 before:h-full before:absolute before:top-0 before:left-2 before:bg-border">
                {Object.entries(eventosData).map(([eventoId, eventoData]: [string, any]) => (
                  <li key={eventoId} className="mb-3.5 pl-4 last:mb-0 before:content-[''] before:w-2 before:h-2 before:bg-green-300 before:border-2 before:border-green-500 before:absolute before:left-0 before:top-1.5 before:rounded-full">
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
                  </li>
                ))}
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
