const admin = require('firebase-admin');
const util = require('./util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');

const sendPushAlarm = async (title, body, receiverToken, planId) => {
  //   let mutableContent = 1;

  // FCM Token이 empty인 경우 제외
  //   receiverToken = receiverToken.filter(t => t);
  //   if (!receiverToken.length) {
  //     return true;
  //   }

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
        // return res.status(200).json({ success: true });
      })
      .catch(function (err) {
        console.log('Error Sending message!!! : ', err);
        // return res.status(400).json({ success: false });
      });
  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
  }
};

module.exports = {
  sendPushAlarm,
};
