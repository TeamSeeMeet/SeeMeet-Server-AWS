const e = require('express');
const jwt = require('jsonwebtoken');
const { TOKEN_INVALID, TOKEN_EXPIRED } = require('../modules/jwt');
const axios = require('axios');
const qs = require('qs');
// JWT를 발급/인증할 떄 필요한 secretKey를 설정합니다. 값은 .env로부터 불러옵니다.
const secretKey = process.env.JWT_SECRET;
const options = {
  algorithm: 'HS256',
  expiresIn: '3d', //3일동안 토큰 유효
  issuer: 'wesopt',
};

const refreshOption = {
  algorithm: 'HS256',
  expiresIn: '90d', //90일동안 토큰 유효
  issuer: 'wesopt',
};

// id, email, name, idFirebase가 담긴 JWT를 발급합니다.
const sign = user => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name || null,
  };

  const result = {
    accesstoken: jwt.sign(payload, secretKey, options),
    refreshtoken: jwt.sign(payload, secretKey, refreshOption),
  };
  return result;
};

const socialSign = user => {
  const payload = {
    id: user.id,
    name: user.name,
    socialId: user.socialId,
  };

  const result = {
    accesstoken: jwt.sign(payload, secretKey, options),
    refreshtoken: jwt.sign(payload, secretKey, refreshOption),
  };
  return result;
};

// JWT를 해독하고, 해독한 JWT가 우리가 만든 JWT가 맞는지 확인합니다 (인증).
const verify = token => {
  let decoded;
  try {
    decoded = jwt.verify(token, secretKey);
  } catch (err) {
    if (err.message === 'jwt expired') {
      console.log('expired token');
      return TOKEN_EXPIRED;
    } else if (err.message === 'invalid token') {
      console.log('invalid token');
      return TOKEN_INVALID;
    } else {
      console.log(err.message);
      console.log('what?');
      return 9999;
    }
  }
  // 해독 / 인증이 완료되면, 해독된 상태의 JWT를 반환합니다.
  return decoded;
};

const makeJWT = () => {
  let privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  let token = jwt.sign(
    {
      iss: process.env.APPLE_TEAMID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120,
      aud: 'https://appleid.apple.com',
      sub: process.env.APPLE_CLIENTID,
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_KEYID,
      },
    },
  );
  console.log(token);
  return token;
};

const getRefreshToken = async code => {
  // const { code } = req.query.code;
  const client_secret = makeJWT();
  try {
    let refresh_token;
    let data = {
      code: code,
      client_id: process.env.APPLE_CLIENTID,
      client_secret: client_secret,
      grant_type: 'authorization_code',
    };
    await axios
      .post(`https://appleid.apple.com/auth/token`, qs.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .then(async res => {
        refresh_token = String(res.data.refresh_token);
      });

    return refresh_token;
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  sign,
  socialSign,
  verify,
  makeJWT,
  getRefreshToken,
};
