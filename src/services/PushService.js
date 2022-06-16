const _ = require('lodash');
const dayjs = require('dayjs');
const convertSnakeToCamel = require('../modules/convertSnakeToCamel');

const pushPlan = async (client, today) => {
  const { rows } = await client.query(
    `
          SELECT u.fcm, plan.id
          FROM plan, invitation_date, plan_user_connection pu, "user" u
          WHERE plan.invitation_date_id = invitation_date.id AND invitation_date.date = $1
          AND pu.plan_id = plan.id AND pu.user_id = u.id 
         
          `,
    [today],
  );
  return convertSnakeToCamel.keysToCamel(rows);
};

module.exports = { pushPlan };
