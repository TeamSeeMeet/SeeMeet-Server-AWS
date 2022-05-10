const convertSnakeToCamel = require('../modules/convertSnakeToCamel');
const _ = require('lodash');
const axios = require('axios');

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

const returnUser = async (client, email) => {
  const { rows } = await client.query(
    `UPDATE "user" as u
      SET is_deleted =false, updated_at = now()
      WHERE email = $1 AND is_deleted = true
      RETURNING *
    `,
    [email],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const addUser = async (client, email, id_Firebase) => {
  const { rows } = await client.query(
    `
        INSERT INTO "user"
        (email, id_Firebase)
        VALUES
        ($1, $2)
        RETURNING *
        `,
    [email, id_Firebase],
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
    AND is_deleted = FALSE
    `,
    [socialId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const addSocialUser = async (client, name, provider, socialId) => {
  const { rows } = await client.query(
    `
    INSERT INTO "user"
    (username, provider, social_id)
    VALUES
    ($1, $2, $3)
    RETURNING *
    `,
    [name, provider, socialId],
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
    SELECT nickname
    FROM "user"
    WHERE nickname = $1
    `,
    [nickname],
  );
  if (typeof rows[0] == 'undefined') {
    return 0;
  }
  console.log(rows[0]);
  return 1;
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
};
