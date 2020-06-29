const fs = require('fs');
const path = require('path');
const testPath = path.resolve(__dirname, '../testing.json');

const is = () => {
  return fs.existsSync(testPath) && fs.readFileSync(testPath).toString() === 'true';
};
const yes = () => {
  fs.writeFileSync(testPath, 'true');
};
const no = () => {
  fs.writeFileSync(testPath, 'false');
};

no();
module.exports = {
  is,
  no,
  yes,
}