/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const arduinoStatusNotification = functions.database.ref("/status_arduino")
  .onUpdate((change: functions.Change<functions.database.DataSnapshot>, context: functions.EventContext) => {
    const status: boolean = change.after.val();
    const message: string = status ? "Equipo prendido" : "Equipo apagado";

    const payload = {
      notification: {
        title: "Cambio de estado del equipo",
        body: message,
      },
    };

    // Replace with the actual topic or device token
    const topic = "arduino_status";

    return admin.messaging().sendToTopic(topic, payload)
      .then((response) => {
        functions.logger.log("Successfully sent message:", response);
        return null;
      })
      .catch((error) => {
        functions.logger.error("Error sending message:", error);
        return null;
      });
  });

// Removed the previous helloWorld function as per the new requirement.
// If you need to keep it, you can uncomment the following lines:
/*
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
*/
