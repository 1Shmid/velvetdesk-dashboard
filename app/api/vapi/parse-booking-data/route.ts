import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { service_name, booking_date, booking_time, staff_id, language, business_id } = await request.json();

  // Get working hours for this business
let workingHours = { open: '09:00', close: '20:00' }; // default
if (business_id) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Get typical working hours (use Monday as reference)
  const { data: hours } = await supabase
    .from('working_hours')
    .select('open_time, close_time')
    .eq('business_id', business_id)
    .eq('day', 'monday')
    .eq('is_closed', false)
    .single();
  
  if (hours) {
    workingHours = {
      open: hours.open_time.slice(0, 5),
      close: hours.close_time.slice(0, 5)
    };
  }
}

const systemPrompt = `You are a JSON parser. Return ONLY valid JSON, no explanations.`;

const prompt = `Parse this booking to JSON format:
- service_name: "${service_name}"
- booking_date: "${booking_date}"
- booking_time: "${booking_time}"
- staff_id: "${staff_id}"
- today: ${new Date().toISOString().split('T')[0]}
- working_hours: ${workingHours.open} to ${workingHours.close}

IMPORTANT LOGIC FOR AMBIGUOUS TIME:
If time is ambiguous (e.g., "11", "a la 1", "a las 3"):
1. Check if ONLY ONE option fits working hours
2. Examples:
   - "11" + hours 10:00-19:00 → ONLY 11:00 fits (23:00 is outside) → use 11:00, disambiguation_needed: false
   - "1" + hours 10:00-19:00 → ONLY 13:00 fits (01:00 is outside) → use 13:00, disambiguation_needed: false
   - "3" + hours 10:00-19:00 → BOTH 03:00 and 15:00 outside OR 15:00 fits → use 15:00, disambiguation_needed: false
   - "8" + hours 10:00-19:00 → ONLY 20:00 fits, but it's outside → keep ambiguous, disambiguation_needed: true

If time is EXPLICIT ("11 de la mañana", "3 de la tarde"):
- Parse directly, disambiguation_needed: false

Examples:
Input: {date: "mañana", time: "11", working_hours: "10:00-19:00", today: "2025-12-07"}
Output: {"normalized_date": "2025-12-08", "normalized_time": "11:00", "staff_name_or_id": null, "disambiguation_needed": false}

Input: {date: "mañana", time: "11 de la mañana", working_hours: "10:00-19:00", today: "2025-12-07"}
Output: {"normalized_date": "2025-12-08", "normalized_time": "11:00", "staff_name_or_id": null, "disambiguation_needed": false}

Input: {date: "lunes", time: "3", working_hours: "10:00-19:00", today: "2025-12-07"}
Output: {"normalized_date": "2025-12-09", "normalized_time": "15:00", "staff_name_or_id": null, "disambiguation_needed": false}

Return only JSON with: normalized_date, normalized_time, staff_name_or_id, disambiguation_needed`;

const message = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 200,
  system: systemPrompt,
  messages: [{ role: 'user', content: prompt }],
});

const textBlock = message.content[0];
const result = JSON.parse(textBlock.type === 'text' ? textBlock.text : '{}');
return Response.json(result);
}