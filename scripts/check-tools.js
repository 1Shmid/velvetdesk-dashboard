const ASSISTANT_ID = '6a693160-26cf-4f29-a143-b2385b89c47a';
const API_KEY = '6fc2d5b8-088d-4232-8a11-59559105ca27';

async function checkTools() {
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  const data = await response.json();
  console.log('Model:', data.model);
  console.log('\nTools configured:', data.model.toolIds?.length || 0);
  
  if (data.model.toolIds) {
    console.log('Tool IDs:', data.model.toolIds);
  }
}

checkTools();