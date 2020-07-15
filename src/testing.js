const fs = require('fs');
const path = require('path');
const testPath = path.resolve(__dirname, '../testing.json');
const historyPath = path.resolve(__dirname, '../test-history.json');
const logPath = path.resolve(__dirname, '../test-log.json');

const is = () => {
  return fs.existsSync(testPath) && fs.readFileSync(testPath).toString() === 'true';
};
const yes = () => {
  fs.writeFileSync(testPath, 'true');
};
const no = () => {
  fs.writeFileSync(testPath, 'false');
};

const write = (str) => {
  fs.writeFileSync(historyPath, str);
}

const log = (str) => {
  fs.writeFileSync(logPath, str);
}

const read = () => {
  let str = '';
  if (fs.existsSync(historyPath)) {
    str += fs.readFileSync(historyPath).toString();
  }
  str += '<br /><br />'
  if (fs.existsSync(logPath)) {
    str += fs.readFileSync(logPath).toString();
  }
  return str || 'empty';
}

no();
module.exports = {
  is,
  no,
  yes,
  write,
  read,
  log,
}