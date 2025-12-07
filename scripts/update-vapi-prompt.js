const fs = require('fs');

const ASSISTANT_ID = '6a693160-26cf-4f29-a143-b2385b89c47a';
const API_KEY = '6fc2d5b8-088d-4232-8a11-59559105ca27';
const PROMPT_FILE = 'config/vapi-beauty-salon-prompt.txt';


async function updatePrompt() {
  const newPrompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: newPrompt }
        ]
      }
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Prompt updated successfully');
    console.log('Updated at:', data.updatedAt);
  } else {
    console.error('❌ Error:', data);
  }
}

updatePrompt().catch(console.error);