#!/usr/bin/env node
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const task = require('./src/task');
const upload = multer();
const app = express();
const port = process.env.PORT || 4400;


app.use(bodyParser());
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));


app.get('/ping', (req, res) => {
  res.status(200).send();
})

app.post('/api/sitetest', upload.none(), (req, res) => {
  const {
    id,
    url,
    callback_url,
    network,
    platform,
  } = req.body;

  if (!url) {
    res.status(500).send('请配置url');
    return;
  }
  if (!callback_url) {
    res.status(500).send('请配置callback_url');
    return;
  }
  if (!network) {
    res.status(500).send('请配置network');
    return;
  }
  if (!platform) {
    res.status(500).send('请配置platforml');
    return;
  }
  try {
    task.add({
      id,
      url,
      callback_url,
      network,
      platform,
    });
    res.status(200).send();
  } catch (error) {
    res.status(500).send(error.stack || error);
  }
});

app.post('/api/callback', upload.none(), (req, res) => {
  console.log('/api/callback', req.body, req.body.status);
  res.status(200).send();
});

app.listen(port, () => console.log('express app listening on port ' + port));
