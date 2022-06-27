const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const routes = require('./routes');
const schedule = require('node-schedule');
const { pushPlan } = require('./controllers/push');
const admin = require('firebase-admin');
let serviceAccount = require('./seemeet-700c2-firebase-adminsdk-wxykw-33b03af3c8.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(routes); //라우터

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});

//push
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 10;
rule.minute = 30;
rule.tz = 'Asia/Seoul';
const job = schedule.scheduleJob(rule, pushPlan);
