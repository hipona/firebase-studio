'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app'; // Importa initializeApp
import { format, parse } from 'date-fns';
import { getDatabase, ref, onValue, remove, set } from 'firebase/database'; // Importa set
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
import { updateVersion } from '@/lib/firebaseUtils'; // Import updateVersion from the new utility file

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

        Object.entries(data).forEach(([id, dispositivo]: [string, any]) => {
          const UltimoVistoString = dispositivo.ultimo_visto; // Corrected field name
          const dateFormat = 'dd-MM-yyyy HH:mm'; // Asegúrate que esto matchea EXACTAMENTE
          let parsedDate = new Date(); // Default to now if parsing fails
          if (typeof UltimoVistoString === 'string') {
             try {
                // Attempt to parse assuming it's a string first
                parsedDate = parse(UltimoVistoString, dateFormat, new Date());
            } catch (e) {
                 console.warn(`Could not parse date string: ${UltimoVistoString}. Using current time.`);
            }
          } else if (typeof UltimoVistoString === 'number') {
             // Handle Unix timestamp (assuming seconds, convert to ms)
             parsedDate = new Date(UltimoVistoString * 1000);
          } else {
             console.warn(`Unexpected date format for device ${id}: ${UltimoVistoString}. Using current time.`);
          }

          const UltimoVistoTimestamp = parsedDate.getTime(); // En milisegundos
          const isOffline = now - UltimoVistoTimestamp > 60 * 1000 * 5; // 5 minutos en ms
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
              console.error('Error updating device status:', error);
            });
          });
        } else {
           // If no updates needed based on Estado_Conexion, still update state with potentially parsed dates or original data
           setDispositivos(prev => ({ ...prev, ...data })); // Merge existing state with new data
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
    return () => {
      unsubscribeDispositivos();
    };
  }, []);

  // Función para eliminar un evento
  const deleteEvent = useCallback((dispositivoId: string, eventoId: string) => {
    const eventoRef = ref(db, `eventos/${dispositivoId}/${eventoId}`);
    remove(eventoRef)
      .then(() => {
        toast({
          title: 'Éxito',
          description: 'Evento eliminado exitosamente.',
        });
        // Let onValue handle the state update
        updateVersion(db); // Update version after successful deletion
      })
      .catch(error => {
        toast({
          title: 'Error',
          description: 'Fallo al eliminar el evento: ' + error.message,
          variant: 'destructive',
        });
      });
  }, [toast]); // Include toast in dependencies

  // Componente para renderizar cada elemento de evento con swipe
  interface EventItemProps {
    dispositivoId: string;
    eventoId: string;
    eventoData: Evento;
  }

  const EventItem: React.FC<EventItemProps> = ({ dispositivoId, eventoId, eventoData }) => {
      const [isDeleting, setIsDeleting] = useState(false);
      const handlers = useSwipeable({
          onSwipedLeft: () => {
              setIsDeleting(true);
              setTimeout(() => {
                  deleteEvent(dispositivoId, eventoId);
                  // No need to manually set state, onValue will handle it.
              }, 300); // Delay matches animation duration
          },
          preventScrollOnSwipe: true,
          trackMouse: true, // Optional: enable mouse swiping
      });

      return (
          <li
              {...handlers}
              className={`relative mb-3.5 pl-4 last:mb-0 before:content-[''] before:w-2 before:h-2 before:bg-green-300 before:border-2 before:border-green-500 before:absolute before:left-0 before:top-1.5 before:rounded-full overflow-hidden transition-transform duration-300 ${
                  isDeleting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
              }`}
          >
              <div className="relative z-10 bg-background p-2 rounded-md shadow-sm"> {/* Added rounded corners and shadow */}
                  <div className="text-sm text-foreground"> {/* Changed text color */}
                      <CheckCircle className="inline-block h-4 w-4 mr-1 text-green-500 align-middle" />
                      {eventoData.descripcion}
                  </div>
                  <div className="text-xs text-muted-foreground ml-5"> {/* Used muted-foreground */}
                      {eventoData.fecha_hora}
                  </div>
                  <div className="text-xs text-muted-foreground ml-5"> {/* Used muted-foreground */}
                      Tipo: {eventoData.tipo}
                  </div>
              </div>
              {/* Optional: Visual indicator for swipe action */}
              <div className="absolute top-0 right-0 bottom-0 w-16 bg-red-500 flex items-center justify-center text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                 <Trash className="h-5 w-5" />
              </div>
          </li>
      );
  };


  return (
    <div className="m-5">
      {/* Sección de Dispositivos */}
      <h1 className="text-2xl font-bold mb-4">Dispositivos</h1>
      {dispositivos ? (
        Object.entries(dispositivos).map(([id, data]: [string, any]) => (
          <Card key={id} className="mb-4 shadow-md rounded-lg"> {/* Added shadow and rounded corners */}
            <CardHeader>
              <CardTitle>{id}</CardTitle>
              <CardDescription>Detalles del dispositivo</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {Object.entries(data).map(([key, value]: [string, any]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {typeof value === 'number' && (key === 'ultimo_visto' || key === 'ultimo_inicio') ? format(new Date(value * 1000), 'Pp') : value}
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
          <Card key={dispositivoId} className="mb-4 shadow-md rounded-lg"> {/* Added shadow and rounded corners */}
            <CardHeader>
              <CardTitle>Eventos de {dispositivoId}</CardTitle>
              <CardDescription>Historial de eventos</CardDescription>
            </CardHeader>
            <CardContent>
               {Object.keys(eventosData).length > 0 ? (
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
               ) : (
                  <p className="text-muted-foreground">No hay eventos para este dispositivo.</p>
               )}
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No hay eventos por el momento...</p>
      )}
    </div>
  );
}
