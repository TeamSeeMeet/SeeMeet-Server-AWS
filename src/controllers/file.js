const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const message = require('../modules/responseMessage');
const FileService = require('../services/FileService');
const express = require('express');
const { send } = require('../modules/slack');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
//testetse
const uploadFileToS3 = async (req, res) => {
  if (!req.file) {
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, message.NULL_VALUE));
  }
  const { accesstoken } = req.headers;
  const image = req.file;
  const { originalname, location } = image;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, message.TOKEN));
  const decodedToken = jwtHandlers.verify(accesstoken);
  if (decodedToken == TOKEN_INVALID) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
  }
  if (decodedToken == TOKEN_EXPIRED) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
  }
  const userId = decodedToken.id;

  let client;
  try {
    client = await db.connect(req);
    const data = await FileService.createFile(client, location, originalname, userId);
    res.status(statusCode.OK).send(util.success(statusCode.OK, message.SUCCESS, data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = { uploadFileToS3 };
