const bcrypt = require('bcryptjs');

const password = 'test123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nTest comparison:', bcrypt.compareSync(password, hash));