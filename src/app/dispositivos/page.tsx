'use client';

import {useEffect, useState} from 'react';
import {initializeApp} from 'firebase/app';
import {getDatabase, ref, onValue} from 'firebase/database';

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
      <h1>Dispositivos</h1>
      {dispositivos ? (
        <ul>
          {Object.entries(dispositivos).map(([id, data]: [string, any]) => (
            <li key={id}>
              <strong>{id}:</strong>
              <ul>
                {Object.entries(data).map(([key, value]: [string, any]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p>Cargando dispositivos...</p>
      )}

      <h1>Eventos</h1>
      {eventos ? (
        <ul>
          {Object.entries(eventos).map(([dispositivoId, eventosData]: [string, any]) => (
            <li key={dispositivoId}>
              <strong>Eventos de {dispositivoId}:</strong>
              <ul>
                {Object.entries(eventosData).map(([eventoId, eventoData]: [string, any]) => (
                  <li key={eventoId}>
                    {Object.entries(eventoData).map(([key, value]: [string, any]) => (
                      <p key={key}>
                        {key}: {value}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p>Cargando eventos...</p>
      )}
    </div>
  );
}
