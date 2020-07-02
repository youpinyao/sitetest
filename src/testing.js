const fs = require('fs');
const path = require('path');
const testPath = path.resolve(__dirname, '../testing.json');
const historyPath = path.resolve(__dirname, '../test-history.json');

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

const read = () => {
  if (fs.existsSync(historyPath)) {
    return fs.readFileSync(historyPath).toString();
  }
  return 'empty';
}

no();
module.exports = {
  is,
  no,
  yes,
  write,
  read,
}