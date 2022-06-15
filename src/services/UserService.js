const convertSnakeToCamel = require('../modules/convertSnakeToCamel');
const _ = require('lodash');
const axios = require('axios');
const bcrypt = require('bcrypt');

const deleteUser = async (client, userId) => {
  const { rows } = await client.query(
    `UPDATE "user" as u
        SET is_deleted = TRUE, updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
    [userId],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const returnUser = async (client, email, password) => {
  const { rows } = await client.query(
    `SELECT * FROM "user"
    WHERE email = $1
    AND is_deleted = false
    `,
    [email],
  );

  const user = rows[0];
  if (user) {
    if (await bcrypt.compare(password, user.password)) {
      return user;
    } else return null;
  } else return null;
};

const addUser = async (client, email, password) => {
  const salt = await bcrypt.genSalt(10);
  const newPassword = await bcrypt.hash(password, salt);
  const { rows } = await client.query(
    `
        INSERT INTO "user"
        (email, password, provider)
        VALUES
        ($1, $2, 'local')
        RETURNING *
        `,
    [email, newPassword],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getUserByEmail = async (client, email) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE email = $1
    `,
    [email],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getUserByIdFirebase = async (client, idFirebase) => {
  const { rows } = await client.query(
    `
        SELECT * FROM "user" as u
        WHERE id_firebase = $1
        AND is_deleted = FALSE
        `,
    [idFirebase],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getUserinfoByuserIds = async (client, userIds) => {
  const { rows } = await client.query(
    `
        SELECT u.id,u.username,u.email, u.nickname
        FROM "user" u
        WHERE id IN(${userIds.join()})
        AND is_deleted = FALSE
        ORDER BY username
        `,
  );
  return convertSnakeToCamel.keysToCamel(rows);
};

const getKakaoUserBySocialtoken = async (client, socialtoken) => {
  const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${socialtoken}`,
    },
  });

  console.log(response.data);
  return response.data;
};

const getUserBySocialId = async (client, socialId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE social_id = $1
    `,
    [socialId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const addSocialUser = async (client, name, provider, socialId, fcm) => {
  const { rows } = await client.query(
    `
    INSERT INTO "user"
    (username, provider, social_id, fcm)
    VALUES
    ($1, $2, $3, $4)
    RETURNING *
    `,
    [name, provider, socialId, fcm],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const addUserInfo = async (client, userId, name, nickname) => {
  const { rows } = await client.query(
    `
    UPDATE "user"
    SET nickname = $3, username = $2
    WHERE id = $1
    RETURNING *
    `,
    [userId, name, nickname],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const checkUserInfo = async (client, nickname) => {
  const { rows } = await client.query(
    `
    SELECT nickname, id
    FROM "user"
    WHERE nickname = $1
    `,
    [nickname],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
  // if (typeof rows[0] == 'undefined') {
  //   return 0;
  // }
  // console.log(rows[0]);
  // return 1;
};

const userWithdrawal = async (client, userId) => {
  const { rows } = await client.query(
    `
    UPDATE "user"
    SET is_deleted = true
    WHERE id = $1
    RETURNING *
    `,
    [userId],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const updateUserDevice = async (client, userId, fcm) => {
  const { rows } = await client.query(
    `
    UPDATE "user"
    SET fcm = $2
    WHERE id = $1
    RETURNING *
    `,
    [userId, fcm],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

module.exports = {
  deleteUser,
  addUser,
  getUserByIdFirebase,
  getUserinfoByuserIds,
  returnUser,
  getKakaoUserBySocialtoken,
  getUserBySocialId,
  addSocialUser,
  addUserInfo,
  checkUserInfo,
  getUserByEmail,
  userWithdrawal,
  updateUserDevice,
};
