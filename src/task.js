
const fs = require('fs');
const superagent = require('superagent');
const path = require('path');
const allNetWork = require('./network');
const render = require('./render');
const testing = require('./testing');
const test = require('./index');
const networks = {
  '3g': allNetWork.Good3G,
  '4g': allNetWork.Regular4G,
  'wifi': allNetWork.WiFi
}
const cacheFilePath = path.resolve(__dirname, '../task.json');

const add = ({
  id,
  url,
  callback_url,
  network,
  platform,
}) => {
  const list = getList();

  const has = !!list.filter(item => id ? item.id === id : item.callback_url === callback_url)[0];

  if (has) {
    throw new Error('任务已存在');
  }

  list.push({
    id,
    url,
    callback_url,
    network,
    platform,
    retry: 2,
  });

  setList(list);
  start();
}

const start = () => {
  if (testing.is()) {
    return;
  }

  let list = getList();

  if (!list.length) {
    return;
  }

  testing.yes();

  const {
    id,
    url,
    callback_url,
    network,
    platform,
    retry = 0,
  } = list[0];

  const testEnd = (data) => {
    testing.no();
    list = getList();
    list.splice(0, 1);
    setList(list);
    doCallback({
      id,
      callback_url,
      url,
      platform,
      network,
      data,
    });
    start();
  }

  console.log('----------------------------');
  console.log('url', url);
  console.log('callback_url', callback_url);
  console.log('network', networks[network] ? network : 'wifi');
  console.log('platform', platform);
  console.log('----------------------------');

  test({
    url,
    network: networks[network] || networks.wifi,
    platform,
  }).then((data) => {
    testEnd(data);
  }, (e) => {
    // 特定情况重试一次
    if (retry > 0) {
      list = getList();
      if (list.length) {
        list[0].retry = parseInt(list[0].retry || 0) - 1;
      }
      setList(list);
      testing.no();
      start();
    } else {
      testEnd(e.stack);
    }
  });
}


function doCallback({
  id,
  callback_url,
  url,
  network,
  platform,
  data,
}) {
  if (callback_url) {
    console.log('callback_url start');

    const res = {
      id,
      url,
      network,
      platform,
      callback_url,
      ...render.response(data),
    };

    testing.write(JSON.stringify(res));
    
    superagent
      .post(callback_url)
      .timeout(10000)
      .send(res) // sends a JSON post body
      .end((err, res) => {
        console.log('callback_url end');
        
        if (err && err !== 'null') {
          testing.write(JSON.stringify(err));
        }
        console.log('------------------------');
      });
  }
}

function setList(list) {
  fs.writeFileSync(cacheFilePath, JSON.stringify(list));
}

function getList() {
  if (!fs.existsSync(cacheFilePath)) {
    fs.writeFileSync(cacheFilePath, '[]')
  }
  let list = [];

  try {
    list = JSON.parse(fs.readFileSync(cacheFilePath).toString());
  } catch (error) {
    console.error(error);
  }

  return list;
}

setList([]);

module.exports = {
  add,
  start,
}