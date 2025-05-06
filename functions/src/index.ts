/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

export const onStatusChangeSendPushNotification = functions.database.onValueWritten(
  "/status_arduino",
  async (change) => {
    if (!change.after.exists()) {
      functions.logger.warn("No data found in change.after");
      return;
    }
    const status: boolean = change.after.val();
    const message: string = status ? "Equipo prendido" : "Equipo apagado";
    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: "Cambio de estado del equipo",
        body: message,
        badge: "1",
      },
      data: {
        id: Date.now().toString(),
      },
    };
    // Replace with the actual topic or device token
    const topic = "arduino_status";
    await admin.messaging().sendToTopic(topic, payload);
  }
);

