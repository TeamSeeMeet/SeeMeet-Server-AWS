const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const userService = require('../services/UserService');
const { send } = require('../modules/slack');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

const authSocialLogin = async (req, res) => {
  const { socialtoken, provider, name } = req.body;
  // if (!provider || !name) {
  //   await send(`provider : ${provider}\nname : ${name}`);
  //   return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  // }
  let client;

  try {
    client = await db.connect(req);

    if (provider == 'kakao') {
      const userData = await userService.getKakaoUserBySocialtoken(client, socialtoken);
      const exuser = await userService.getUserBySocialId(client, userData.id);
      if (exuser) {
        const user = exuser;
        const accesstoken = jwtHandlers.socialSign(exuser);
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.LOGIN_SUCCESS, { user, accesstoken }));
      } else {
        const user = await userService.addSocialUser(client, userData.properties.nickname, provider, userData.id);
        const accesstoken = jwtHandlers.socialSign(user);
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, { user, accesstoken }));
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
        const user = exuser;
        const accesstoken = jwtHandlers.socialSign(exuser);
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.LOGIN_SUCCESS, { user, accesstoken }));
      } else {
        const user = await userService.addSocialUser(client, name, provider, userData.sub);
        const accesstoken = jwtHandlers.socialSign(user);
        res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, { user, accesstoken }));
      }
    }
  } catch (error) {
    console.log(error);
    await send(error);
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

const signup = async (req, res) => {
  const { email, password, passwordConfirm } = req.body;
  if (!email || !password || !passwordConfirm) {
    await send(`email : ${email}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  if (password.length < 8) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.PASSWORD_LENGTH_SHORT));
  if (password != passwordConfirm) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.PASSWORD_IS_NOT_CORRECT));

  let client;
  try {
    client = await db.connect(req);
    const userFirebase = await admin
      .auth()
      .createUser({ email, password })
      .then(user => user)
      .catch(e => {
        console.log(e);
        return { err: true, error: e };
      });

    if (userFirebase.err) {
      if (userFirebase.error.code === 'auth/email-already-exists') {
        const checkuser = await userService.returnUser(client, email);
        if (!checkuser) {
          return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, '해당 이메일을 가진 유저가 이미 있습니다.'));
        } else {
          return res.status(statusCode.OK).json(util.success(statusCode.OK, '재가입하였습니다.'));
        }
      } else if (userFirebase.error.code === 'auth/invalid-password') {
        return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, ' 비밀번호 형식이 잘못되었습니다. 패스워드는 최소 6자리의 문자열이어야합니다.'));
      } else if (userFirebase.error.code === 'auth/invalid-email') {
        return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, '이메일 형식이 올바르지 않습니다.'));
      } else {
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
      }
    }
    const id_Firebase = userFirebase.uid;
    const user = await userService.addUser(client, email, id_Firebase);
    if (!user) {
      await send(`email : ${email}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    const { accesstoken } = jwtHandlers.sign(user);
    if (!accesstoken) {
      await send(`accesstoken : ${accesstoken}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, { user, accesstoken }));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  authSocialLogin,
  authSignup,
  signup,
};
