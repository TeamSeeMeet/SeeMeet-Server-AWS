const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const planService = require('../services/PlanService');
const { send } = require('../modules/slack');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { TOKEN_INVALID, TOKEN_EXPIRED } = require('../modules/jwt');

const getPlanCome = async (req, res) => {
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  const { year, month } = req.params;
  if (!year || !month || !accesstoken) {
    await send(`year: ${year}\nmonth: ${month}\naccesstoken: ${accesstoken}\n`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;
    client = await db.connect(req);
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    const plan = await planService.get2MonthPlan(client, userId, parseInt(year), parseInt(month));

    var alpha = year;
    var beta = parseInt(month) + 1;

    if (beta == 13) {
      alpha = parseInt(year) + 1;
      beta = 1;
    }

    const plan2 = await planService.get2MonthPlan(client, userId, parseInt(alpha), parseInt(beta));
    const data = [...plan, ...plan2];
    if (!plan) {
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getPlanByDate = async (req, res) => {
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  const { dateId } = req.params;
  if (!dateId || !accesstoken) {
    await send(`dateId: ${dateId} \naccesstoken: ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    const plan = await planService.getDatePlan(client, userId, parseInt(dateId));

    if (!plan) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const deletePlan = async (req, res) => {
  const { planId } = req.params;
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  if (!planId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;

    const plan = await planService.deletePlan(client, userId, planId);

    console.log(plan);
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getPlanById = async (req, res) => {
  const { accesstoken } = req.headers;
  const { planId } = req.params;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  if (!planId || !accesstoken) {
    await send(`planId: ${planId} \naccesstoken: ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;

    const plan = await planService.getDetailPlan(client, planId, userId);

    if (!plan) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));
    console.log(plan);
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getPlanByMonth = async (req, res) => {
  const { accesstoken } = req.headers;
  const { year, month } = req.params;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  if (!year || !month || !accesstoken) {
    await send(`year: ${year}\nmonth: ${month}\naccesstoken: ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    const plan = await planService.getMonthPlan(client, userId, parseInt(year), parseInt(month));

    if (!plan) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getPlanLast = async (req, res) => {
  const { accesstoken } = req.headers;
  const { year, month, day } = req.params;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  if (!year || !month || !day || !accesstoken) {
    await send(`year: ${year}\nmonth: ${month}\nday: ${day}\naccesstoken: ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  const date = year + '-' + month + '-' + day;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    const plan = await planService.getLastPlan(client, userId, date);

    if (!plan) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, plan));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getPlan3Month = async (req, res) => {
  const { accesstoken } = req.headers;
  const { year, month } = req.params;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  if (!year || !month) {
    await send(`year: ${year}\nmonth: ${month}\n`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;

  try {
    client = await db.connect(req);

    const decodedToken = jwtHandlers.verify(accesstoken);
    if (decodedToken == TOKEN_INVALID) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
    }
    if (decodedToken == TOKEN_EXPIRED) {
      return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
    }
    const userId = decodedToken.id;
    if (!userId || !accesstoken) {
      await send(`userId ${userId}\naccesstoken: ${accesstoken}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    var alpha = year;
    var beta = parseInt(month) - 1;

    if (beta == 0) {
      alpha = parseInt(year) - 1;
      beta = 12;
    }
    const plan1 = await planService.get3MonthPlan(client, userId, parseInt(alpha), parseInt(beta));
    const plan = await planService.get3MonthPlan(client, userId, parseInt(year), parseInt(month));

    alpha = year;
    beta = parseInt(month) + 1;

    if (beta == 13) {
      alpha = parseInt(year) + 1;
      beta = 1;
    }

    const plan2 = await planService.get3MonthPlan(client, userId, parseInt(alpha), parseInt(beta));

    const data = [...plan1, ...plan, ...plan2];

    if (!data) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  getPlanCome,
  getPlanByDate,
  deletePlan,
  getPlanById,
  getPlanByMonth,
  getPlanLast,
  getPlan3Month,
};
