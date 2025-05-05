import { ref, get, set } from 'firebase/database';
import type { Database } from 'firebase/database';
import { toast } from '@/hooks/use-toast';

// Function to update the version node in Firebase
export const updateVersion = async (db: Database) => {
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
