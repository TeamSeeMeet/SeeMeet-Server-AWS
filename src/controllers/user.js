// const config = require('../config');
const userService = require('../services');
const sc = require('../modules/statusCode');
const rm = require('../modules/responseMessage');
const db = require('../db/db');
// const { userDB } = require('../db');

const getUser = async (req, res) => {
  let client;
  try {
    client = await db.connect(req);
    console.log('킹왕짱 남지윤');
    res.status(sc.OK).send(util.success(sc.OK, rm.DELETE_USER, deleteUser));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    res.status(sc.INTERNAL_SERVER_ERROR).send(util.fail(sc.INTERNAL_SERVER_ERROR, rm.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = { getUser };
