const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const userService = require('../services/UserService');
const { send } = require('../modules/slack');
const jwt = require('jsonwebtoken');

const authSocialLogin = async (req, res) => {
  const { socialtoken, provider, name } = req.body;
  let client;
  try {
    client = await db.connect(req);
    if (provider == 'kakao') {
      const userData = await userService.getKakaoUserBySocialtoken(client, socialtoken);
      const exuser = await userService.getUserBySocialId(client, userData.id);
      console.log(exuser.isDeleted);
      if (exuser) {
        if (exuser.isDeleted === true) {
          return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.DELETED_USER));
        }
        const user = exuser;
        const accesstoken = jwtHandlers.socialSign(exuser);
        return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.LOGIN_SUCCESS, { user, accesstoken }));
      } else {
        const user = await userService.addSocialUser(client, userData.properties.nickname, provider, userData.id);
        const accesstoken = jwtHandlers.socialSign(user);
        return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, { user, accesstoken }));
      }
    }
    if (provider == 'apple') {
      const getAppleUserBySocialtoken = async appleAccessToken => {
        //애플 토큰 해독해서 유저정보 확인
        try {
          const appleUser = jwt.decode(appleAccessToken);
          if (appleUser.email_verified == 'false') return null;
          return appleUser;
        } catch (err) {
          return null;
        }
      };
      const userData = await getAppleUserBySocialtoken(socialtoken);
      const exuser = await userService.getUserBySocialId(client, userData.sub);
      if (exuser) {
        if (exuser.isDeleted === true) {
          return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.DELETED_USER));
        }
        const user = exuser;
        const accesstoken = jwtHandlers.socialSign(exuser);
        return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.LOGIN_SUCCESS, { user, accesstoken }));
      } else {
        const user = await userService.addSocialUser(client, name, provider, userData.sub);
        const accesstoken = jwtHandlers.socialSign(user);
        return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, { user, accesstoken }));
      }
    }
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
/**
 *  이름과 아이디(닉네임) 입력
 */

const authSignup = async (req, res) => {
  const { accesstoken } = req.headers;
  const { name, nickname } = req.body;
  if (!accesstoken || !name || !nickname) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  let client;
  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  if (typeof userId == 'undefined') {
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.TOKEN));
  }
  try {
    client = await db.connect(req);

    //닉네임 중복 검사
    const checkUser = await userService.checkUserInfo(client, nickname);
    if (checkUser) {
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_NICKNAME));
    }
    const user = await userService.addUserInfo(client, userId, name, nickname);
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.UPDATD_USER, user));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const signUp = async (req, res) => {
  const { email, password, passwordConfirm } = req.body;
  if (!email || !password || !passwordConfirm) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.BAD_REQUEST));
  if (password != passwordConfirm) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.PASSWORD_IS_NOT_CORRECT));
  let client;

  try {
    client = await db.connect(req);
    const newUser = await userService.addUser(client, email, password);
    const accesstoken = jwtHandlers.sign(newUser);
    const data = {
      newUser,
      accesstoken,
    };
    return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const authLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  let client;
  try {
    client = await db.connect(req);
    const user = await userService.returnUser(client, email, password);
    if (!user) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.LOGIN_FAIL));
    const accesstoken = jwtHandlers.sign(user);
    const data = {
      user,
      accesstoken,
    };
    return res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.LOGIN_SUCCESS, data));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

//회원탈퇴
const authWithdrawal = async (req, res) => {
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  let client;
  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;
  if (typeof userId == 'undefined') {
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.TOKEN));
  }
  try {
    client = await db.connect(req);
    const user = await userService.userWithdrawal(client, userId);

    if (!user) {
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
    }
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.DELETE_USER, user));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  authSocialLogin,
  authSignup,
  signUp,
  authLogin,
  authWithdrawal,
};
