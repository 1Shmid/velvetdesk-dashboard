const fs = require('fs');
const prompt = fs.readFileSync('config/vapi-beauty-salon-prompt.txt', 'utf8');
console.log('Prompt length:', prompt.length, 'chars');
console.log('Tokens (approx):', Math.ceil(prompt.length / 4));