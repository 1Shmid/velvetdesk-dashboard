export const VAPI_BEAUTY_SALON_CONFIG = {
  assistantId: '6a693160-26cf-4f29-a143-b2385b89c47a',
  name: 'Real Phone Assistant Beauty Salon (TEST)',
  promptFile: 'config/vapi-beauty-salon-prompt.txt',
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  voice: {
    provider: 'minimax',
    model: 'speech-02-turbo',
    voiceId: 'Spanish_ConfidentWoman',
    languageBoost: 'Spanish',
  },
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2-general',
    language: 'es',
  },
  server: {
    url: 'https://velvetdesk-dashboard.vercel.app/api/webhooks/vapi',
    timeoutSeconds: 20,
  },
};