const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const friendService = require('../services/FriendService');
const { send } = require('../modules/slack');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const addFriend = async (req, res) => {
  const { accesstoken } = req.headers;
  const { nickname } = req.body;

  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  if (!nickname) {
    await send(`nickname : ${nickname}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const receiverId = await friendService.findreceiver(client, nickname);

    if (!receiverId) {
      await send(`receiverId : ${receiverId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }

    const rId = receiverId[Object.keys(receiverId)[0]];
    if (userId == rId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.FAIL_ADD_MYSELF));

    const checkFriends = await friendService.getALLFriendById(client, userId);
    if (!checkFriends) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const checks = [...new Set(checkFriends.filter(Boolean).map(o => o.receiver))];

    for (let i = 0; i < checks.length; i++) {
      if (checks[i] == rId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.EXISTS_FRIEND));
    }
    const addFriend = await friendService.requestAddFriend(client, userId, rId);
    if (!addFriend) {
      await send(`userId : ${userId}, receiverId : ${rId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.FAIL_ADD_FRIEND));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.SUCCESS_ADD_FRIEND, addFriend));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const blockFriend = async (req, res) => {
  const { accesstoken } = req.headers;
  const { nickname } = req.body;

  // 필요한 값이 없을 때 보내주는 response
  if (!nickname) {
    await send(`nickname : ${nickname}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  if (!accesstoken) {
    await send(`accesstoken : ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const receiverId = await friendService.findreceiver(client, nickname);
    if (!receiverId) {
      await send(`nickname : ${nickname}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    const rId = receiverId[Object.keys(receiverId)[0]];
    if (rId === null || !rId) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_USER));
    const block = await friendService.blockFriend(client, userId, rId);
    if (!block) {
      await send(`userId : ${userId}, receiverId : ${receiverId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, block));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const cancleBlockFriend = async (req, res) => {
  const { accesstoken } = req.headers;
  const { nickname } = req.body;
  if (!nickname) {
    await send(`nickname : ${nickname}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  if (!accesstoken) {
    await send(`accesstoken : ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const receiverId = await friendService.findreceiver(client, nickname);
    if (!receiverId) {
      await send(`nickname : ${nickname}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const rId = receiverId[Object.keys(receiverId)[0]];
    if (rId === null || !rId) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_USER));

    const block = await friendService.cancelBlockFriend(client, userId, rId);
    if (!block) {
      await send(`userId : ${userId}\receiverId : ${rId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_USERS_SUCCESS, block));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getFriend = async (req, res) => {
  const { accesstoken } = req.headers;
  if (!accesstoken) {
    await send(`accesstoken : ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;
  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const friendList = await friendService.getALLFriendById(client, userId);
    if (!friendList) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const checknull = friendList == '';
    if (checknull == true) return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_USER_SUCCESS, []));
    const rId = [...new Set(friendList.filter(Boolean).map(o => o.receiver))];
    const friendinfo = await userDB.getUserinfoByuserIds(client, rId);
    if (!friendinfo) {
      await send(`receiverId : ${rId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_USER_SUCCESS, friendinfo));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const searchFriend = async (req, res) => {
  const { accesstoken } = req.headers;
  const { nickname } = req.body;

  // 필요한 값이 없을 때 보내주는 response
  if (!nickname) {
    await send(`email : ${nickname}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  if (!accesstoken) {
    await send(`accesstoken : ${accesstoken}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const searchUser = await friendService.searchUser(client, nickname);
    if (!searchUser) {
      await send(`nickname : ${nickname}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    const id = searchUser[Object.keys(searchUser)[0]];

    if (userId == id) return res.status(statusCode.BAD_REQUEST).send(util.success(statusCode.BAD_REQUEST, '나 자신은 조회 불가', {}));
    const checkFriend = await friendService.existFriend(client, id, userId);
    if (checkFriend) {
      await send(`userId : ${userId}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.EXISTS_FRIEND));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_USER_SUCCESS, searchUser));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  addFriend,
  blockFriend,
  cancleBlockFriend,
  getFriend,
  searchFriend,
};
