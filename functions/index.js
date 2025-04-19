const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.arduinoStatusNotification = functions.database.ref('/status_arduino')
    .onUpdate((change, context) => {
      const status = change.after.val();
      const message = status ? 'Equipo prendido' : 'Equipo apagado';

      const payload = {
        notification: {
          title: 'Cambio de estado del equipo',
          body: message,
        }
      };

      // Replace with the actual topic or device token
      const topic = 'arduino_status';

      return admin.messaging().sendToTopic(topic, payload)
        .then((response) => {
          console.log('Successfully sent message:', response);
          return null;
        })
        .catch((error) => {
          console.log('Error sending message:', error);
          return null;
        });
    });
