const dayjs = require('dayjs');
const _ = require('lodash');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');

const responseInvitation = async (client, userId, invitationId, invitationDateIds) => {
  const responseRows = [];

  for (let invitationDateId of invitationDateIds) {
    const { rows } = await client.query(
      `
        INSERT INTO "invitation_response" (invitation_id, guest_id, invitation_date_id)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [invitationId, userId, invitationDateId],
    );

    rows[0].responseId = rows[0].id;
    delete rows[0].id;
    const { rows: dateRows } = await client.query(
      `
       SELECT * FROM "invitation_date"
       WHERE id = $1
      `,
      [invitationDateId],
    );

    dateRows[0].date = dayjs(dateRows[0].date).format('YYYY-MM-DD');
    rows[0].invitationDate = dateRows[0];
    responseRows.push(rows[0]);
  }

  return convertSnakeToCamel.keysToCamel(responseRows);
};

const rejectInvitation = async (client, userId, invitationId) => {
  const { rows } = await client.query(
    `
    INSERT INTO "invitation_response" (invitation_id, guest_id, invitation_date_id, impossible)
    VALUES ($1, $2, NULL, $3)
    RETURNING id, invitation_id, impossible
    `,
    [invitationId, userId, true],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getdateByDateIds = async (client, invitationDateIds) => {
  const { rows } = await client.query(
    `
        SELECT *
        FROM "invitation_date" i
        WHERE id IN(${invitationDateIds.join()})
        `,
  );
  return convertSnakeToCamel.keysToCamel(rows);
}

module.exports = { responseInvitation, rejectInvitation, getdateByDateIds };
