export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*', // đổi thành https://<username>.github.io khi lên prod
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(req.url);

    // Helper: lấy 1 API key
    const keys = (env.ELEVEN_KEYS || env.ELEVEN_API_KEY || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (!keys.length) return new Response(JSON.stringify({ detail: 'Server missing API key' }), { status: 500, headers: { 'Content-Type':'application/json', ...cors } });
    const pickKey = () => keys[Math.floor(Math.random()*keys.length)]; // random đơn giản

    // === GET /voices: trả danh sách voice ===
    if (url.pathname === '/voices' && req.method === 'GET') {
      const r = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': pickKey(), 'Accept': 'application/json' }
      });
      const txt = await r.text();
      return new Response(txt, { status: r.status, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    // === POST /tts: tạo audio ===
    if (url.pathname === '/tts' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { text, voice_id, model_id = 'eleven_flash_v2_5', voice_settings = {} } = body || {};
        if (!text || !voice_id) {
          return new Response(JSON.stringify({ detail: 'Missing text or voice_id' }), { status: 400, headers: { 'Content-Type':'application/json', ...cors } });
        }

        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
          method: 'POST',
          headers: {
            'xi-api-key': pickKey(),
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({ model_id, text, voice_settings })
        });

        if (!r.ok) {
          const errTxt = await r.text();
          return new Response(JSON.stringify({ detail: errTxt }), { status: r.status, headers: { 'Content-Type':'application/json', ...cors } });
        }

        const buf = await r.arrayBuffer();
        return new Response(buf, { status: 200, headers: { 'Content-Type':'audio/mpeg', ...cors } });
      } catch (e) {
        return new Response(JSON.stringify({ detail: e.message || String(e) }), { status: 500, headers: { 'Content-Type':'application/json', ...cors } });
      }
    }

    return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404, headers: { 'Content-Type':'application/json', ...cors } });
  }
}