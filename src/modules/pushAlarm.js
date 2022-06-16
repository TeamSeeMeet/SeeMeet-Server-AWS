const admin = require('firebase-admin');

const sendPushAlarm = async (title, body, receiverToken, planId) => {
  if (!receiverToken.length) {
    return 0;
  }

  try {
    const message = {
      android: {
        data: {
          title,
          body,
          planId,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            planId,
          },
        },
      },

      tokens: receiverToken,
    };

    admin
      .messaging()
      .sendMulticast(message)
      .then(function (response) {
        console.log('Successfully sent message: : ', response);
        return 1;
      })
      .catch(function (err) {
        console.log('Error Sending message!!! : ', err);
        return 0;
      });
  } catch (error) {
    console.log('Error Sending message!!! : ', error);
    return 0;
  } finally {
  }
};

module.exports = {
  sendPushAlarm,
};
