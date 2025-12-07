import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { service_name, booking_date, booking_time, staff_id, language } = await request.json();

  const systemPrompt = `You are a JSON parser. Return ONLY valid JSON, no explanations.`;

    const prompt = `Parse this booking to JSON format:
    - service_name: "${service_name}"
    - booking_date: "${booking_date}"
    - booking_time: "${booking_time}"
    - staff_id: "${staff_id}"
    - today: ${new Date().toISOString().split('T')[0]}

    Examples:
    Input: {date: "mañana", time: "11 de la mañana", today: "2025-12-07"}
    Output: {"normalized_date": "2025-12-08", "normalized_time": "11:00", "staff_name_or_id": null}

    Input: {date: "lunes", time: "3 de la tarde", today: "2025-12-07"}
    Output: {"normalized_date": "2025-12-09", "normalized_time": "15:00", "staff_name_or_id": null}

    Return only JSON with: normalized_date, normalized_time, staff_name_or_id`;

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