const Slack = require('slack-node');
const dotenv = require('dotenv');

dotenv.config();
const webhookUri = process.env.SLACK_TOKEN;

const slack = new Slack();
slack.setWebhook(webhookUri);

const send = async (message) => {
  if (process.env.NODE_ENV === 'development') {
    slack.webhook(
      {
        text: `${message}`,
      },
      function (err, response) {
        if (err) {
          console.log(response);
        }
      },
    );
  } else console.log(message);
};

module.exports = { send };
