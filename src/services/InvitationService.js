const dayjs = require('dayjs');
const { response, query } = require('express');
const _ = require('lodash');
// const { host } = require('../config/dbConfig');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');
const _ = require('lodash');

const getAllInvitation = async (client, userId) => {
  const { rows } = await client.query(
    `
            SELECT * FROM "invitation"
            WHERE host_id = $1 
            AND is_deleted = FALSE
            AND is_confirmed = FALSE
            AND is_canceled = FALSE
        `,
    [userId],
  );

  const { rows: guestInvitationRows } = await client.query(
    `
      SELECT invitation.* FROM "invitation", "invitation_user_connection"
      WHERE invitation_user_connection.guest_id = $1
      AND invitation_user_connection.invitation_id = invitation.id
      AND invitation.is_deleted = FALSE
      AND invitation.is_confirmed = FALSE
      AND invitation.is_canceled = FALSE
    `,
    [userId],
  );

  // console.log(guestInvitationRows);

  for (let row of rows) {
    let id = row.id;

    const { rows: guestIdRows } = await client.query(
      `
      SELECT guest_id FROM "invitation_user_connection"
      WHERE invitation_id = $1
      `,
      [id],
    );

    let values = [];
    for (let r of guestIdRows) {
      let guestId = r.guest_id;
      const { rows: guest } = await client.query(
        `
          SELECT id, username FROM "user"
          WHERE id = $1
          AND is_deleted = FALSE
          `,
        [guestId],
      );

      const { rows: responseRows } = await client.query(
        `
            SELECT * FROM "invitation_response"
            WHERE invitation_id = $1
            AND guest_id = $2
            `,
        [id, guestId],
      );
      if (responseRows.length > 0) {
        guest[0].isResponse = true;
      } else {
        guest[0].isResponse = false;
      }
      values.push(guest[0]);
    }
    row.guests = values;
    row.isReceived = false;
    // 객체 동일을 위해 추가 의미x
    row.isResponse = false;
  }

  for (let row of guestInvitationRows) {
    const { rows: hostRows } = await client.query(
      `
            SELECT id, username FROM "user"
            WHERE id = $1
            AND is_deleted = FALSE
            `,
      [row.host_id],
    );
    row.host = hostRows[0];
    delete row.host_id;
    row.isReceived = true;

    const { rows: responseRows } = await client.query(
      `
      SELECT * FROM "invitation_response"
      WHERE guest_id = $1
      AND invitation_id = $2
      `,
      [userId, row.id],
    );
    console.log('-----------------' + responseRows);
    if (responseRows.length > 0) {
      row.isResponse = true;
    } else {
      row.isResponse = false;
    }
  }

  const newRows = _.union(rows, guestInvitationRows);

  const { rows: confirmedRows } = await client.query(
    `

          SELECT id, invitation_title, is_canceled, is_confirmed FROM "invitation"
          WHERE host_id = $1
          AND (invitation.is_confirmed = true
          OR invitation.is_canceled = true)
        AND invitation.is_deleted = false
      `,
    [userId],
  );

  const { rows: receivedConfirmedRows } = await client.query(
    `
    SELECT invitation.id, invitation.invitation_title, invitation.is_canceled, invitation.is_confirmed, invitation.created_at FROM invitation, invitation_user_connection
    WHERE invitation_user_connection.invitation_id = invitation.id
    AND invitation_user_connection.guest_id = $1
    AND (invitation.is_confirmed = true
    OR invitation.is_canceled = true)
    AND invitation.is_deleted = false
    `,
    [userId],
  );

  const newConfirmedRows = _.union(confirmedRows, receivedConfirmedRows);

  for (let row of newConfirmedRows) {
    let id = row.id;

    const { rows: guestIdRows } = await client.query(
      `
            SELECT guest_id FROM "invitation_user_connection"
            WHERE invitation_id = $1
        `,
      [id],
    );

    let values = [];
    for (let r of guestIdRows) {
      let guestId = r.guest_id;
      const { rows: guest } = await client.query(
        `
                SELECT id, username FROM "user"
                WHERE id = $1
                AND is_deleted = FALSE
            `,
        [guestId],
      );
      const { rows: impossible } = await client.query(
        `
        SELECT * FROM "user","invitation_response", "invitation_date", "invitation"
        WHERE invitation_response.guest_id = $1
        AND "user".id = invitation_response.guest_id
        AND invitation.id = $2
        AND invitation.is_canceled = FALSE
        AND invitation_date.invitation_id = invitation.id
        AND invitation_date.id = invitation_response.invitation_date_id
        AND invitation_response.impossible = TRUE 
        `,
        [guestId, id],
      );
      if (impossible.length > 0) {
        guest[0].impossible = true;
      } else {
        guest[0].impossible = false;
      }

      const { rows: ResponseRows } = await client.query(
        `
              SELECT * FROM "invitation_response", "invitation", "user"
              WHERE "invitation".id = $1
              AND invitation.id ="invitation_response".invitation_id
              AND guest_id = $2
              `,
        [id, guestId],
      );
      if (ResponseRows.length > 0) {
        guest[0].isResponse = true;
      } else {
        guest[0].isResponse = false;
      }
      if (guest[0].id != userId) {
        values.push(guest[0]);
      }
    }

    const { rows: planRows } = await client.query(
      `
      SELECT plan.id FROM "plan", "invitation_date"
      WHERE invitation_date.id = plan.invitation_date_id
      AND invitation_date.invitation_id=$1
      `,
      [id],
    );

    row.guests = values;

    if (planRows.length > 0) {
      row.planId = planRows[0].id;
    }
  }

  const data = { invitations: newRows, confirmedAndCanceld: newConfirmedRows };

  return convertSnakeToCamel.keysToCamel(data);
};

const createInvitation = async (client, userId, invitationTitle, invitationDesc, date, start, end) => {
  const { rows } = await client.query(
    `
      INSERT INTO "invitation" (host_id, invitation_title, invitation_desc, created_at)
      VALUES ($1, $2, $3, now())
      RETURNING *
      `,
    [userId, invitationTitle, invitationDesc],
  );

  const data = { ...rows[0] };

  return convertSnakeToCamel.keysToCamel(data);
};

const createInvitationDate = async (client, invitationId, date, start, end) => {
  const invitationDates = [];
  for (let i = 0; i < date.length; i++) {
    let curDate = date[i];
    let curStart = start[i];
    let curEnd = end[i];
    const { rows: dateRows } = await client.query(
      `
      INSERT INTO "invitation_date" (invitation_id, "date", "start", "end")
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [invitationId, curDate, curStart, curEnd],
    );
    dateRows[0].date = dayjs(dateRows[0].date).format('YYYY-MM-DD');
    invitationDates.push(dateRows);
  }

  return convertSnakeToCamel.keysToCamel(invitationDates);
};

const createInvitationUserConnection = async (client, invitationId, guests) => {
  const data = [];
  for (let guest of guests) {
    const { rows: userRows } = await client.query(
      `
      SELECT * FROM "user"
      WHERE id = $1
      AND is_deleted = FALSE
      `,
      [guest.id],
    );

    if (userRows.length < 1) {
      return [];
    }

    const { rows } = await client.query(
      `
      INSERT INTO "invitation_user_connection" (invitation_id, guest_id)
      VALUES ($1, $2)
      RETURNING id, invitation_id, guest_id
      `,
      [invitationId, guest.id],
    );

    data.push(rows[0]);
  }

  return convertSnakeToCamel.keysToCamel(data);
};

const getGuestByInvitationId = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT "user".id, "user".username FROM "invitation_user_connection", "user"
    WHERE invitation_user_connection.guest_id = "user".id
    AND invitation_user_connection.invitation_id = $1
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows);
};

const getHostByInvitationId = async (client, invitationId) => {
  const { rows } = await client.query(
    `
      SELECT "user".id, "user".username FROM "invitation", "user"
      WHERE invitation.host_id = "user".id
      AND invitation.id = $1
      AND invitation.is_deleted = FALSE
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getRejectGuestByInvitationId = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT "user".id, "user".username FROM "invitation", "user", "invitation_response"
    WHERE "invitation_response".invitation_id = $1
    AND "invitation_response".invitation_id = invitation.id
    AND "invitation_response".impossible = TRUE
    AND "user".id = "invitation_response".guest_id
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows);
};

const getInvitationSentById = async (client, host, guests, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "invitation"
    WHERE id=$1
    AND is_deleted=FALSE
    `,
    [invitationId],
  );
  console.log(host);
  const newRows = { ...rows[0], host };
  for (let guest of guests) {
    let guestId = guest.id;
    const { rows: responseRows } = await client.query(
      `
      SELECT guest_id FROM "invitation_response"
      WHERE invitation_id = $1
      AND guest_id = $2
      `,
      [invitationId, guestId],
    );
    if (responseRows.length > 0) {
      guest.isResponse = true;
    } else {
      guest.isResponse = false;
    }
  }

  newRows.guests = guests;
  const { rows: dateRows } = await client.query(
    `
    SELECT * FROM "invitation_date"
    WHERE invitation_id = $1
    `,
    [invitationId],
  );

  for (let row of dateRows) {
    let dateId = row.id;
    const { rows: responseRows } = await client.query(
      `
      SELECT "user".id, "user".username FROM "invitation_response", "user"
      WHERE "user".id = invitation_response.guest_id 
      AND invitation_response.invitation_id=$1 
      AND invitation_response.invitation_date_id = $2
      `,
      [invitationId, dateId],
    );
    row.date = dayjs(row.date).format('YYYY.MM.DD');
    console.log(row.date);
    row.respondent = responseRows;
  }
  const data = { invitation: newRows, invitationDates: dateRows };

  return convertSnakeToCamel.keysToCamel(data);
};

const getInvitationReceivedById = async (client, userId, host, invitationId, isResponse) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "invitation"
    WHERE id = $1
    AND is_deleted=FALSE
    `,
    [invitationId],
  );

  rows[0].host = host;
  const { rows: dateRows } = await client.query(
    `
    SELECT * FROM "invitation_date"
    WHERE invitation_id = $1
    `,
    [invitationId],
  );

  for (let row of dateRows) {
    row.date = dayjs(row.date).format('YYYY.MM.DD');
  }

  const newDateRows = convertSnakeToCamel.keysToCamel(dateRows);

  for (let row of newDateRows) {
    let dateId = row.id;
    const { rows: responseRows } = await client.query(
      `
        SELECT * FROM "invitation_response"
        WHERE invitation_date_id = $1
        AND guest_id = $2
        `,
      [dateId, userId],
    );
    row.date = dayjs(row.date).format('YYYY.MM.DD');
    if (responseRows.length > 0) {
      row.isSelected = true;
    } else {
      row.isSelected = false;
    }
  }
  return convertSnakeToCamel.keysToCamel({ invitation: rows[0], invitationDates: newDateRows });
};

const getResponseByUserId = async (client, userId, invitationId) => {
  const { rows: responseRows } = await client.query(
    `
    SELECT * FROM invitation_response
    WHERE guest_id = $1
    AND invitation_id = $2
    `,
    [userId, invitationId],
  );

  return convertSnakeToCamel.keysToCamel(responseRows);
};

const confirmInvitation = async (client, host, invitationId, guests, dateId) => {
  const { rows } = await client.query(
    `
    UPDATE "invitation" 
    SET is_confirmed = true
    WHERE id = $1
    AND is_deleted = false
    RETURNING *
    `,
    [invitationId],
  );

  const newRows = { ...rows[0], host };

  //1. plan에 추가
  const { rows: planRows } = await client.query(
    `
      INSERT INTO plan (invitation_date_id)
      VALUES ($1)
      RETURNING *
      `,
    [dateId],
  );

  const planId = planRows[0].id;
  //2. plan user connection에 해당 guest 추가
  const { rows: guestRows } = await client.query(
    `
    SELECT "user".id, "user".username FROM "user", "invitation_date", "invitation_response"
    WHERE invitation_date.id = $1
    AND invitation_date.id = invitation_response.invitation_date_id
    AND invitation_response.invitation_id = invitation_date.invitation_id
    AND invitation_response.guest_id = "user".id
    AND invitation_response.impossible = false
    `,
    [dateId],
  );

  for (let row of guestRows) {
    const { rows } = await client.query(
      `
      INSERT INTO "plan_user_connection" (user_id, plan_id)
      VALUES ($1, $2)
      `,
      [row.id, planId],
    );
  }

  //3. plan user connection에 해당 user 추가
  const { rows: userPlanRows } = await client.query(
    `
    INSERT INTO "plan_user_connection" (user_id, plan_id)
    VALUES ($1, $2)
    `,
    [host.id, planId],
  );
  //4. invitation에 해당하는 guest 중 해당 dateId에 응답안한 유저는 해당 dateId에 impossible을 추가
  for (let guest of guests) {
    const { rows: responseRows } = await client.query(
      `
      SELECT * FROM "invitation_response"
      WHERE guest_id = $1
      AND invitation_date_id = $2
      `,
      [guest.id, dateId],
    );
    if (responseRows.length == 0) {
      const { rows: impossibleUserRows } = await client.query(
        `
          INSERT INTO invitation_response (invitation_id, guest_id, invitation_date_id, impossible)
          VALUES ($1, $2, $3, true)
        `,
        [invitationId, guest.id, dateId],
      );
    }
  }

  const { rows: dateRows } = await client.query(
    `
    SELECT * FROM invitation_date
    WHERE id = $1
    `,
    [dateId],
  );

  for (let row of dateRows) {
    row.date = dayjs(row.date).format('YYYY.MM.DD');
  }

  const newDateRows = { ...dateRows[0], guest: guestRows };

  return convertSnakeToCamel.keysToCamel({ invitation: newRows, invitationDate: newDateRows, plan: planRows[0] });
};

const cancleInvitation = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    UPDATE "invitation" 
    SET is_canceled = true, canceled_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getInvitationById = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "invitation"
    WHERE id = $1
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getInvitationByDateId = async (client, dateId, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT invitation.* FROM "invitation_date","invitation"
    WHERE invitation_date.id = $1
    AND invitation_date.invitation_id = $2
    `,
    [dateId, invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getInvitationDateByInvitationId = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT id FROM invitation_date
    WHERE invitation_id = $1
    `,
    [invitationId],
  );

  const dateIds = rows.map(function (value) {
    return value['id'];
  });
  return convertSnakeToCamel.keysToCamel(dateIds);
};

const getCanceledInvitation = async (client, invitationId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM invitation
    WHERE invitation.id = $1
    `,
    [invitationId],
  );

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

module.exports = {
  getAllInvitation,
  createInvitation,
  createInvitationDate,
  createInvitationUserConnection,
  getHostByInvitationId,
  getGuestByInvitationId,
  getInvitationSentById,
  getInvitationReceivedById,
  getResponseByUserId,
  confirmInvitation,
  cancleInvitation,
  getInvitationById,
  getInvitationByDateId,
  getInvitationDateByInvitationId,
  getCanceledInvitation,
  getRejectGuestByInvitationId,
};
