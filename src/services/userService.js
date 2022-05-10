const convertSnakeToCamel = require('../modules/convertSnakeToCamel');

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

module.exports = {
  addUser,
};
