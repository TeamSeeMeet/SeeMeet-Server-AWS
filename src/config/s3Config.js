const AWS = require('aws-sdk');
const config = require('.');

const s3 = new AWS.S3({
  accessKeyId: config.s3AccessKey,
  secretAccessKey: config.s3SecretKey,
  region: 'ap-northeast-2',
});

module.exports = s3;
