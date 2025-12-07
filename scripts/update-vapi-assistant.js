const fs = require('fs');

const ASSISTANT_ID = '6a693160-26cf-4f29-a143-b2385b89c47a';
const API_KEY = '6fc2d5b8-088d-4232-8a11-59559105ca27';
const PROMPT_FILE = 'config/vapi-beauty-salon-prompt.txt';


async function updateAssistant() {
  const systemPrompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        toolIds: [
          "908b8036-0145-4983-84eb-8b3ab3be2e79",
          "ef0aba84-feff-45ab-9386-b071dc9aa3ef",
          "03f50f75-61fb-4d0b-ba46-2a6781ded77c",
          "74dae80a-4e85-4e0d-b347-7e5104221437",
          "705d68cb-dedd-4b4d-981b-d021f244cf14",
          "10b6756c-c1cd-48bb-8df6-e0089c4666a6"
        ],
        messages: [{ role: 'system', content: systemPrompt }]
      }
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Assistant updated');
    console.log('Model:', data.model.provider, data.model.model);
    console.log('Updated at:', data.updatedAt);
  } else {
    console.error('❌ Error:', data);
  }
}

updateAssistant().catch(console.error);