const bcrypt = require('bcryptjs');

const localHash = "$2a$10$fVeFDqjFWpY5pyyy7.7IBuYd3BOBod0IQGS9MeHFkrFrOrQfy6aFG";

const passwords = ['password123', '123456', 'password', 'admin', 'admin123', 'owner123'];

for (const p of passwords) {
  const match = bcrypt.compareSync(p, localHash);
  console.log(`Comparing '${p}':`, match);
}
