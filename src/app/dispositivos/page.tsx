'use client';

import { useEffect, useState, useRef} from 'react';
import { initializeApp } from 'firebase/app'; // Importa initializeApp
import { format, parse } from 'date-fns';
import { getDatabase, ref, onValue, remove } from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Trash } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useToast } from '@/hooks/use-toast';
import { set } from 'firebase/database'; // Importa la función set
// Define interfaces for type safety
interface Evento {
  descripcion: string;
  fecha_hora: string;
  tipo: string;
}

interface Eventos {
  [dispositivoId: string]: {
    [eventoId: string]: Evento;
  };
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] = useState<any>(null);
  const [eventos, setEventos] = useState<Eventos | null>(null);
  const { toast } = useToast();
  const swipeItemsRef = useRef(new Map());
  
  useEffect(() => {
    // Referencia al nodo 'dispositivos' en la base de datos
    const dispositivosRef = ref(db, 'dispositivos');
    // Suscripción a cambios en 'dispositivos'
    const unsubscribeDispositivos = onValue(dispositivosRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const now = Date.now(); // Milisegundos
        const updatedData: { [key: string]: any } = {};
        let hasUpdates = false;
    
        Object.entries(data).forEach(([id, dispositivo]) => {
          const UltimoVistoString = dispositivo.Ultimo_Visto;
          const dateFormat = 'dd-MM-yyyy HH:mm'; // Asegúrate que esto matchea EXACTAMENTE
          const parsedDate = parse(UltimoVistoString, dateFormat, new Date());
          const UltimoVistoTimestamp = parsedDate.getTime(); // En milisegundos
          const isOffline = now - UltimoVistoTimestamp > 60 * 1000; // 10 segundos en ms
          const estadoConexion = isOffline ? 'OffLine' : 'OnLine';
    
          if (dispositivo.Estado_Conexion !== estadoConexion) {
            hasUpdates = true;
            updatedData[id] = {
              ...dispositivo,
              Estado_Conexion: estadoConexion,
            };
          } else {
            updatedData[id] = dispositivo;
          }
        });
    
        if (hasUpdates) {
          setDispositivos(updatedData);
          Object.entries(updatedData).forEach(([id, dispositivo]) => {
            const dispositivoRef = ref(db, `dispositivos/${id}`);
            set(dispositivoRef, dispositivo).catch(error => {
              console.error("Error updating device status:", error);
            });
          });
        } else {
          setDispositivos(data);
        }
      } else {
        setDispositivos({});
      }
    });

    const eventosRef = ref(db, 'eventos');
    onValue(eventosRef, snapshot => {
      const data = snapshot.val();
      setEventos(data);

    });
    // Limpieza de la suscripción al desmontar el componente
    return () => { unsubscribeDispositivos() };
  }, []);
  // Función para eliminar un evento
  const deleteEvent = (dispositivoId: string, eventoId: string) => {
    const eventoRef = ref(db, `eventos/${dispositivoId}/${eventoId}`);
    remove(eventoRef)
      .then(() => {
        toast({
          title: 'Éxito',
          description: 'Evento eliminado exitosamente.',
        });
        setEventos((prevEventos: Eventos | null) => {
          if (!prevEventos || !prevEventos[dispositivoId]) {
            return prevEventos;
          }
          const updatedEventos: Eventos = { ...prevEventos };
          delete updatedEventos[dispositivoId][eventoId];
          if (Object.keys(updatedEventos[dispositivoId]).length === 0) {
            delete updatedEventos[dispositivoId];
          }
          return updatedEventos;
        });
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al eliminar el evento: ' + error.message,
          variant: 'destructive',
        });
      });
  };

  interface EventItemProps {// Define las propiedades del componente EventItem
    dispositivoId: string;
    eventoId: string;
    eventoData: Evento;
  }

  const EventItem: React.FC<EventItemProps> = ({ dispositivoId, eventoId, eventoData }) => {
    const itemKey = `${dispositivoId}-${eventoId}`;
    const [isDeleting, setIsDeleting] = useState(false); // Estado para controlar la eliminación
    const [isItemSwiping, setIsItemSwiping] = useState(false);

    const handlers = useSwipeable({
      onSwipedLeft: () => handleDelete(),
      onSwiping: () => setIsItemSwiping(true),
      onSwiped: () => setIsItemSwiping(false),
      preventScrollOnSwipe: true,
      trackMouse: true,
    });

    const handleDelete = () => {
      setIsDeleting(true); // Activar el estado de eliminación
      setTimeout(() => {
        deleteEvent(dispositivoId, eventoId); // Eliminar el evento después de la animación
      }, 300); // Duración de la animación
    };

    useEffect(() => {
      swipeItemsRef.current.set(itemKey, handlers);
      return () => {
        swipeItemsRef.current.delete(itemKey);
      };
    }, [itemKey]);

    return (
      <li
        {...handlers}
        className={`relative mb-3.5 pl-4 last:mb-0 before:content-[''] before:w-2 before:top-1.5 before:rounded-full overflow-hidden transition-all transform origin-right ${
          isDeleting ? 'bg-red-500' : '' // Cambiar el fondo a rojo al eliminar
        }`}
        style={{
          transform: isItemSwiping ? `translateX(-20px)` : 'translateX(0)',
        }}
      >
        <div className="relative z-10 bg-background p-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="inline-block h-4 w-4 mr-1 text-green-500 align-middle" />
            {eventoData.descripcion}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 ml-5">
            {eventoData.fecha_hora}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 ml-5">
            Tipo: {eventoData.tipo}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className={`absolute top-0 bottom-0 right-0 w-10 flex items-center justify-center transition-colors ${
            isDeleting ? 'bg-red-700' : 'bg-red-500' // Cambiar el color del botón al eliminar
          }`}
        >
          <Trash
            className={`h-5 w-5 transition-transform ${
              isDeleting ? 'scale-125' : '' // Escalar el ícono al eliminar
            }`}
          />
        </button>
      </li>
    );
  };

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
                {Object.entries(eventosData).map(([eventoId, eventoData]: [string, any]) => (
                  <EventItem
                    key={eventoId}
                    dispositivoId={dispositivoId}
                    eventoId={eventoId}
                    eventoData={eventoData}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No Hay Evetos por el Momento...</p>
      )}
    </div>
  );
}