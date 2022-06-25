const _ = require('lodash');
const dayjs = require('dayjs');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');

const getMonthPlan = async (client, userId, year, month) => {
  const { rows } = await client.query(
    `
    SELECT plan.id AS plan_id, i.invitation_title, date, start, invitation_date.end
    FROM plan_user_connection pu, "user" u, plan, invitation_date, invitation i
    WHERE pu.user_id=u.id AND pu.plan_id=plan.id AND invitation_date.id=plan.invitation_date_id 
    AND i.id=invitation_date.invitation_id AND
    pu.user_id=$1 AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3 AND pu.is_deleted=false
    ORDER BY date 
    `,
    [userId, year, month],
  );

  for (let r of rows) {
    //   console.log(r);
    let id = r.plan_id;
    const { rows: user } = await client.query(
      `
          SELECT pu.user_id, u.username
          FROM plan_user_connection pu, plan, "user" u
          WHERE plan.id=pu.plan_id AND plan_id=$1
          AND pu.user_id=u.id
          EXCEPT
          SELECT pu.user_id, u.username
          FROM plan_user_connection pu, plan, "user" u
          WHERE plan.id=pu.plan_id AND plan_id=$1
          AND pu.user_id=u.id AND u.id=$2

            `,
      [id, userId],
    );
    r.users = user;
    r.date = dayjs(r.date).format('YYYY-MM-DD');
  }
  return convertSnakeToCamel.keysToCamel(rows);
};

const get2MonthPlan = async (client, userId, year, month) => {
  const { rows } = await client.query(
    `
      SELECT plan.id AS plan_id, i.invitation_title, date
      FROM plan_user_connection pu, "user" u, plan, invitation_date, invitation i
      WHERE pu.user_id=u.id AND pu.plan_id=plan.id AND invitation_date.id=plan.invitation_date_id 
      AND i.id=invitation_date.invitation_id AND pu.user_id=$1 AND pu.is_deleted = false
      AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3  
      AND pu.is_deleted=false
      ORDER BY date 
      
      `,
    [userId, year, month],
  );
  for (let r of rows) {
    //   console.log(r);
    let id = r.plan_id;
    const { rows: user } = await client.query(
      `
        SELECT count(pu.user_id)
        FROM plan_user_connection pu, plan, "user" u
        WHERE plan.id=pu.plan_id AND plan_id=$1
        AND pu.user_id=u.id
      `,
      [id],
    );
    r.count = Object.values(user[0])[0];

    r.date = dayjs(r.date).format('YYYY-MM-DD');
  }
  return convertSnakeToCamel.keysToCamel(rows);
};

const get3MonthPlan = async (client, userId, year, month) => {
  const { rows } = await client.query(
    `
      SELECT plan.id, i.invitation_title, date, start, invitation_date.end
      FROM plan_user_connection pu, "user" u, plan, invitation_date, invitation i
      WHERE pu.user_id=u.id AND pu.plan_id=plan.id AND invitation_date.id=plan.invitation_date_id 
      AND i.id=invitation_date.invitation_id AND pu.user_id=$1 AND pu.is_deleted = false
      AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3  
      AND pu.is_deleted=false
      ORDER BY date 
      `,
    [userId, year, month],
  );
  for (let r of rows) {
    r.date = dayjs(r.date).format('YYYY-MM-DD');
  }
  return convertSnakeToCamel.keysToCamel(rows);
};

const getDetailPlan = async (client, planId, userId) => {
  const { rows } = await client.query(
    `
    SELECT plan.id AS planId, i.id As invitationId, i.invitation_title, i.invitation_desc, date, start, invitation_date.end, u.username AS hostname
    FROM plan, invitation_date, invitation i, "user" u
    WHERE plan.invitation_date_id=invitation_date.id AND i.id=invitation_date.invitation_id AND i.host_id=u.id
    AND plan.id=$1
    `,
    [planId],
  );

  if (rows.length == 0) {
    return null;
  }
  const id = Object.values(rows[0])[1];

  //let id = r.invitationid;
  const { rows: user } = await client.query(
    `
      SELECT ir.guest_id AS user_id, u.username
      FROM invitation_response ir, invitation i, "user" u
      WHERE i.id=ir.invitation_id AND ir.guest_id=u.id
      AND ir.invitation_id=$1 AND ir.impossible=true
      EXCEPT
      SELECT ir.guest_id AS user_id, u.username
      FROM invitation_response ir, invitation i, "user" u
      WHERE i.id=ir.invitation_id AND ir.guest_id=u.id
      AND ir.invitation_id=$1 AND ir.impossible=true AND ir.guest_id=$2
    `,
    [id, userId],
  );
  rows[0].impossible = user;
  //}

  //   console.log(r);

  const { rows: user2 } = await client.query(
    `
      SELECT pu.user_id, u.username
      FROM plan_user_connection pu, plan, "user" u
      WHERE plan.id=pu.plan_id AND plan_id=$1
      AND pu.user_id=u.id 
      EXCEPT
      SELECT pu.user_id, u.username
      FROM plan_user_connection pu, plan, "user" u
      WHERE plan.id=pu.plan_id AND plan_id=$1
      AND pu.user_id=u.id AND u.id=$2
    `,
    [planId, userId],
  );
  for (let r of rows) {
    r.date = dayjs(r.date).format('YYYY-MM-DD');
  }
  rows[0].possible = user2;

  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getDatePlan = async (client, userId, dateId) => {
  // 참여자 userid도 제외했는가?
  const { rows: dateRow } = await client.query(
    `
    SELECT date
    FROM invitation_date
    WHERE id=$1
    `,
    [dateId],
  );
  if (dateRow.length == 0) {
    return null;
  }
  const date = Object.values(dateRow[0])[0];
  const { rows } = await client.query(
    `
    SELECT i.invitation_title, invitation_date.date, start, invitation_date.end, plan.id AS planId
    FROM invitation_date, invitation i, plan, plan_user_connection pu
    WHERE invitation_date.date=$1 AND i.id=invitation_date.invitation_id AND invitation_date.id=plan.invitation_date_id
    AND pu.plan_id=plan.id AND pu.user_id=$2 AND pu.is_deleted = false
    `,
    [date, userId],
  );

  for (let r of rows) {
    //   console.log(r);
    let id = r.planid;
    const { rows: user } = await client.query(
      `
      SELECT pu.user_id, u.username
      FROM plan_user_connection pu, plan, "user" u
      WHERE plan.id=pu.plan_id AND plan_id=$1
      AND pu.user_id=u.id 
      EXCEPT
      SELECT pu.user_id, u.username
      FROM plan_user_connection pu, plan, "user" u
      WHERE plan.id=pu.plan_id AND plan_id=$1
      AND pu.user_id=u.id AND u.id=$2
      `,
      [id, userId],
    );
    r.users = user;
    r.date = dayjs(r.date).format('YYYY.MM.DD');
  }
  return convertSnakeToCamel.keysToCamel(rows);
};

const getLastPlan = async (client, userId, date) => {
  const { rows } = await client.query(
    `
    SELECT date
    FROM plan_user_connection pu, plan, invitation_date
    WHERE pu.user_id=$1
    AND invitation_date.id=plan.invitation_date_id AND plan.id=pu.plan_id AND date<=$2 AND pu.is_deleted=false
    ORDER BY date 
    `,
    [userId, date],
  );

  if (rows.length == 0) {
    return {};
  }

  for (let r of rows) {
    r.date = dayjs(r.date).format('YYYY-MM-DD');
  }
  return convertSnakeToCamel.keysToCamel(rows[rows.length - 1]);
};

const deletePlan = async (client, userId, planId) => {
  const { rows } = await client.query(
    `
    UPDATE plan_user_connection
    SET is_deleted=true
    WHERE user_id=$1 AND plan_id=$2
    RETURNING *
    `,
    [userId, planId],
  );

  const { rows: host } = await client.query(
    `
    SELECT *
    FROM plan, invitation_date, invitation
    WHERE plan.id = $1 AND plan.invitation_date_id = invitation_date.id AND invitation_date.invitation_id = invitation.id
    `,
    [planId],
  );
  const hostId = host[0].host_id;
  const invitationId = host[0].id;
  console.log(invitationId);
  if (hostId === userId) {
    const { rows } = await client.query(
      `
      UPDATE invitation
      SET is_visible=false
      WHERE invitation.id= $1
      RETURNING *
      `,
      [invitationId],
    );
  } else {
    const { rows } = await client.query(
      `
      UPDATE invitation_user_connection
      SET is_visible=false
      WHERE invitation_id= $1 AND guest_id = $2
      RETURNING *
      `,
      [invitationId, userId],
    );
  }
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

module.exports = {
  getMonthPlan,
  getDetailPlan,
  getDatePlan,
  getLastPlan,
  get2MonthPlan,
  get3MonthPlan,
  deletePlan,
};
