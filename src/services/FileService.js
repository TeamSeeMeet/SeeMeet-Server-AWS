const { fileURLToPath } = require('url');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');
const createFile = async (client, link, fileName) => {
  const { rows } = await client.query(
    `
          INSERT INTO "user"
          (img_link,img_name)
          VALUES
          ($1, $2)
          RETURNING *
          `,
    [link, fileName],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

module.exports = { createFile };
