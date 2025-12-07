const fs = require('fs');

const ASSISTANT_ID = '6a693160-26cf-4f29-a143-b2385b89c47a';
const API_KEY = '6fc2d5b8-088d-4232-8a11-59559105ca27';

async function exportConfig() {
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });

  const data = await response.json();
  const systemPrompt = data.model.messages[0].content;
  
  fs.writeFileSync('config/vapi-beauty-salon-prompt.txt', systemPrompt);
  
  console.log('✅ Prompt exported to config/vapi-beauty-salon-prompt.txt');
  console.log('Length:', systemPrompt.length, 'chars');
}

exportConfig().catch(console.error);