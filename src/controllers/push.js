const admin = require('firebase-admin');

exports.pushAlarm = async function (req, res) {
  //디바이스의 토큰 값
  let deviceToken = `fL-jcRy3SrapPqOJYdFJ14:APA91bEZfvRtkj4DI69hi0H8XIXwAsToY8vo3iS6okf408nvETsYs8Oll5e77nV7EXzA98Vyail11UQIXakUMA-UJI8l18Do-J64xAr6d_dxMFrzP1pLIuXLyIfdXnvHX3aA7icX4c6z`;

  let message = {
    data: {
      title: '테스트 발송💛',
      body: '씨밋씨밋씨밋',
    },
    token: deviceToken,
  };

  admin
    .messaging()
    .send(message)
    .then(function (response) {
      console.log('Successfully sent message: : ', response);
      return res.status(200).json({ success: true });
    })
    .catch(function (err) {
      console.log('Error Sending message!!! : ', err);
      return res.status(400).json({ success: false });
    });
};
