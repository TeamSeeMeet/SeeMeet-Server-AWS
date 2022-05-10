const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const routes = require('./routes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(routes); //라우터

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
