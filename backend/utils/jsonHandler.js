const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

function readUsers() {
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]');
  }
  const data = fs.readFileSync(usersPath);
  return JSON.parse(data);
}

function writeUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

module.exports = { readUsers, writeUsers };
