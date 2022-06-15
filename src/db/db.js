// const functions = require('firebase-functions');
//test
const { Pool, Query } = require('pg'); //postgres
const dayjs = require('dayjs');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = require('../config/index');
const { send } = require('../modules/slack');

const pool = new Pool({
  ...dbConfig,
  connectionTimeoutMillis: 60 * 1000,
  idleTimeoutMillis: 60 * 1000,
});

const connect = async req => {
  const now = dayjs();
  const string =
    !!req && !!req.method
      ? `[${req.method}] ${!!req.user ? `${req.user.id}` : ``} ${req.originalUrl}\n ${!!req.query && `query: ${JSON.stringify(req.query)}`} ${!!req.body && `body: ${JSON.stringify(req.body)}`} ${
          !!req.params && `params ${JSON.stringify(req.params)}`
        }`
      : `request 없음`;
  await send(string);
  const callStack = new Error().stack;
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  //const releaseChecker = setTimeout(() => {
  //  devMode
  //     ? console.error('[ERROR] client connection이 15초 동안 릴리즈되지 않았습니다.', { callStack })
   //    : functions.logger.error('[ERROR] client connection이 15초 동안 릴리즈되지 않았습니다.', { callStack });
   //  devMode ? console.error(`마지막으로 실행된 쿼리문입니다. ${client.lastQuery}`) : functions.logger.error(`마지막으로 실행된 쿼리문입니다. ${client.lastQuery}`);
  // }, 15 * 1000);

   client.query = (...args) => {
     client.lastQuery = args;
     return query.apply(client, args);
   };
   client.release = () => {
  //   clearTimeout(releaseChecker);
     const time = dayjs().diff(now, 'millisecond');
     if (time > 4000) {
       const message = `[RELEASE] in ${time} | ${string}`;
       devMode && console.log(message);
     }
     client.query = query;
     client.release = release;
     return release.apply(client);
   };
  return client;
};

module.exports = {
  connect,
};
