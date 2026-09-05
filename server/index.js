const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

loadEnvironment(path.join(__dirname, '..', '.env'));

const port = Number(process.env.PORT || 3000);
const webRoot = path.join(__dirname, '..', 'www');
const nvidiaApiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';

function loadEnvironment(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) request.destroy();
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON request.')); }
    });
    request.on('error', reject);
  });
}

function normalizeRequest(body) {
  const requiredStrings = ['destination', 'startDate', 'language'];
  for (const key of requiredStrings) if (typeof body[key] !== 'string' || !body[key].trim()) throw new Error(`${key} is required.`);
  const dayCount = Number(body.dayCount);
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 14) throw new Error('dayCount must be between 1 and 14.');
  return {
    destination: body.destination.trim().slice(0, 100), startDate: body.startDate, dayCount,
    budget: Number.isFinite(Number(body.budget)) ? Number(body.budget) : null,
    interests: String(body.interests || '').slice(0, 400), tripType: String(body.tripType || '').slice(0, 100),
    food: String(body.food || '').slice(0, 200), pace: ['slow', 'medium', 'fast', 'düşük', 'orta', 'yüksek'].includes(body.pace) ? body.pace : 'medium',
    walkingLimit: String(body.walkingLimit || '').slice(0, 50), startLocation: String(body.startLocation || '').slice(0, 150),
    language: body.language === 'tr' ? 'tr' : 'en'
  };
}

async function fetchJson(url, options = {}, timeout = 12_000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Place data provider returned ${response.status}.`);
  return response.json();
}

async function fetchPlaces(query) {
  const options = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Itinerarium-MVP/1.0 (travel-planner)' }, body: `data=${encodeURIComponent(query)}` };
  let lastError;
  for (const endpoint of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try { return await fetchJson(endpoint, options, 30_000); }
    catch (error) { lastError = error; }
  }
  throw lastError;
}

async function getPlaceContext(destination, startLocation) {
  const query = encodeURIComponent(`${destination}`);
  const locations = await fetchJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`, { headers: { 'User-Agent': 'Itinerarium-MVP/1.0 (travel-planner)' } });
  const city = locations[0];
  if (!city) throw new Error('Destination could not be found.');
  const latitude = Number(city.lat);
  const longitude = Number(city.lon);
  const overpassQuery = `[out:json][timeout:10];(nwr["tourism"~"attraction|museum|gallery|viewpoint"](around:12000,${latitude},${longitude});nwr["historic"](around:12000,${latitude},${longitude});nwr["amenity"~"restaurant|cafe"](around:12000,${latitude},${longitude}););out center tags 50;`;
  const elements = (await fetchPlaces(overpassQuery)).elements || [];
  const candidates = elements.map((element) => {
    const tags = element.tags || {};
    const point = element.center || element;
    return { id: `${element.type}-${element.id}`, name: tags.name, category: tags.tourism || tags.historic || tags.amenity || 'sightseeing', latitude: point.lat, longitude: point.lon, address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || null };
  }).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  const uniqueCandidates = [...new Map(candidates.map((place) => [place.id, place])).values()].slice(0, 20);
  if (uniqueCandidates.length < 4) throw new Error('Not enough verified places were found for this destination.');
  let origin = null;
  if (startLocation) {
    const origins = await fetchJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${startLocation}, ${destination}`)}`, { headers: { 'User-Agent': 'Itinerarium-MVP/1.0 (travel-planner)' } });
    if (origins[0]) origin = { name: origins[0].display_name, latitude: Number(origins[0].lat), longitude: Number(origins[0].lon) };
  }
  return { destination: { name: city.display_name, latitude, longitude }, origin, candidates: uniqueCandidates };
}

function itineraryPrompt(preferences, context) {
  const language = preferences.language === 'tr' ? 'Turkish' : 'English';
  return `Create a ${preferences.dayCount}-day travel itinerary in ${language}. You are a planner, not a place-data source. Use ONLY the verified candidate IDs provided below; never invent a place, address, opening hour, price, distance, or route. Group nearby candidate coordinates into efficient daily sequences and honor the origin when present. Return ONLY JSON: {"days":[{"activities":[{"time":"HH:MM","placeId":"candidate id","title":"short title","note":"short practical note","category":"muze|yemek|gezi|manzara|ulasim"}]}]}. Each day must have 3 or 4 activities with ascending times.\nPreferences: ${JSON.stringify(preferences)}\nVerified map-tool context: ${JSON.stringify(context)}`;
}

function parsePlan(text, context, dayCount) {
  const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
  if (!Array.isArray(parsed.days) || parsed.days.length !== dayCount) throw new Error('The model returned an invalid day count.');
  const places = new Map(context.candidates.map((place) => [place.id, place]));
  return {
    destination: context.destination,
    days: parsed.days.map((day, dayIndex) => {
      if (!Array.isArray(day.activities) || day.activities.length < 2 || day.activities.length > 5) throw new Error(`The model returned an invalid activity count for day ${dayIndex + 1}.`);
      let previousTime = '';
      const seen = new Set();
      const activities = day.activities.map((activity) => {
        if (!/^\d{2}:\d{2}$/.test(activity.time || '') || activity.time <= previousTime) throw new Error('The model returned invalid activity times.');
        previousTime = activity.time;
        const category = ['muze', 'yemek', 'gezi', 'manzara', 'ulasim'].includes(activity.category) ? activity.category : 'gezi';
        let place = places.get(activity.placeId);
        const needsReplacement = !place || seen.has(place.id);
        if (needsReplacement) {
          place = [...places.values()].find((candidate) => !seen.has(candidate.id) && (category !== 'yemek' || /restaurant|cafe/.test(candidate.category))) || [...places.values()].find((candidate) => !seen.has(candidate.id));
          if (!place) throw new Error('Not enough verified places were found for a unique daily plan.');
        }
        seen.add(place.id);
        return { time: activity.time, title: String(needsReplacement ? place.name : activity.title || place.name).slice(0, 80), note: String(activity.note || '').slice(0, 160), category, place };
      });
      return { activities };
    })
  };
}

async function createItinerary(preferences) {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured on the server.');
  const context = await getPlaceContext(preferences.destination, preferences.startLocation);
  const models = (process.env.NVIDIA_MODEL || 'openai/gpt-oss-20b,deepseek-ai/deepseek-v4-flash-0731').split(',').map((model) => model.trim()).filter(Boolean);
  let unavailableModelError;
  for (const model of models) {
    const nvidiaResponse = await fetch(nvidiaApiUrl, {
      method: 'POST', signal: AbortSignal.timeout(90_000), headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: 800, ...(model === 'openai/gpt-oss-20b' ? { reasoning_effort: 'low' } : {}), messages: [{ role: 'system', content: 'Follow the requested JSON schema exactly.' }, { role: 'user', content: itineraryPrompt(preferences, context) }] })
    });
    const payload = await nvidiaResponse.json();
    if (nvidiaResponse.ok) return parsePlan(payload.choices?.[0]?.message?.content, context, preferences.dayCount);
    if ([404, 410].includes(nvidiaResponse.status)) { unavailableModelError = payload.error?.message || `NVIDIA NIM returned ${nvidiaResponse.status} for ${model}.`; continue; }
    throw new Error(payload.error?.message || `NVIDIA NIM returned ${nvidiaResponse.status}.`);
  }
  throw new Error(unavailableModelError || 'No configured NVIDIA model is available.');
}

function serveStatic(request, response) {
  const urlPath = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
  const file = path.resolve(webRoot, `.${urlPath}`);
  if (!file.startsWith(webRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end('Not found'); return; }
  const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(file).pipe(response);
}

http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method === 'POST' && request.url === '/api/ai-itinerary') {
    try { return sendJson(response, 200, await createItinerary(normalizeRequest(await readJson(request)))); }
    catch (error) { return sendJson(response, 400, { error: error.message || 'Unable to generate itinerary.' }); }
  }
  if (request.method === 'GET') return serveStatic(request, response);
  sendJson(response, 405, { error: 'Method not allowed.' });
}).listen(port, () => console.log(`Itinerarium is running at http://localhost:${port}`));
