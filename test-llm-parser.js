async function test() {
  const response = await fetch('http://localhost:3000/api/vapi/parse-booking-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_name: 'corte de pelo',
      booking_date: 'mañana',
      booking_time: '11 de la mañana',
      staff_id: null,
      language: 'es'
    })
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);