const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const userService = require('../services/UserService');
const friendService = require('../services/FriendService');
const { response } = require('express');
const { password } = require('../config');

const deleteUser = async (req, res) => {
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));

    const friendDelete = await friendService.changeIsdeleted(client, userId);
    const deleteUser = await userService.deleteUser(client, userId);
    if (!deleteUser) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.DELETE_USER_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.DELETE_USER, deleteUser));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const resetPassword = async (req, res) => {
  const { accesstoken } = req.headers;
  const { password, passwordConfirm } = req.body;
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));

    if (password != passwordConfirm) {
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '??????????????? ???????????? ????????????.'));
    }

    const data = await userService.resetPassword(client, userId, password);
    res.status(statusCode.OK).send(util.success(statusCode.OK, '???????????? ?????? ??????', data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const changePush = async (req, res) => {
  const { accesstoken } = req.headers;
  const { push, fcm } = req.body;
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));

    const user = await userService.changePush(client, userId, push, fcm);

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.UPDATD_USER, user));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  deleteUser,
  resetPassword,
  changePush,
};
