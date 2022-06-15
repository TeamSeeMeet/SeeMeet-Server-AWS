const admin = require('firebase-admin');
const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const pushAlarm = require('../modules/pushAlarm');
const pushService = require('../services/PushService');
const { send } = require('../modules/slack');

const sendPushAlarm = async function (req, res) {
  //디바이스의 토큰 값
  let deviceToken = `fckRpEj2_UiGvAUmsBRYgM:APA91bGorrhzQ8zrGwfsBKOwZRjOOSmmrL3shO6URY4IyWDjbOEIOtlNqKdvysILKRjr5kHeMp2WShNdJizYWscjrHpdNdKX4chVZ-_hbk-PKBNgEprxZPBuVaruW55Abvh2yw2pZjJU`;

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

const pushPlan = async (req, res) => {
  let client;
  try {
    client = await db.connect(req);

    let now = new Date();
    // 년도 getFullYear()
    let year = now.getFullYear();
    // 월 getMonth() (0~11로 1월이 0으로 표현되기 때문에 + 1을 해주어야 원하는 월을 구할 수 있다.)
    let month = now.getMonth() + 1;
    // 일 getDate()
    let date = now.getDate(); // 일
    const today = year + '-' + month + '-' + date;

    const plan = await pushService.pushPlan(client, today);
    let result = plan.map(a => a.fcm);
    console.log(result);
    pushAlarm.sendPushAlarm(req, res, 'test', 'push', result);
    // return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    // res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = { sendPushAlarm, pushPlan };
