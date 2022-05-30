const { fileURLToPath } = require('url');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');
const createFile = async (client, link, fileName, userId) => {
  const { rows } = await client.query(
    `
      UPDATE "user"
      SET img_link=$1, img_name=$2
      WHERE id=$3
      RETURNING *
          `,
    [link, fileName, userId],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

module.exports = { createFile };
