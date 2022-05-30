const dotenv = require('dotenv');
dotenv.config();
//test
module.exports = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DB,
  password: process.env.DB_PASSWORD,

  s3AccessKey: process.env.S3_ACCESS_KEY,
  s3SecretKey: process.env.S3_SECRET_KEY,
  bucketName: process.env.BUCKET_NAME,
};
