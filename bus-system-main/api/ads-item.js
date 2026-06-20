// Vercel Serverless: PUT /api/ads-item?id=X  — update an existing ad
//                   DELETE /api/ads-item?id=X  — delete an ad
// Uses /tmp JSON storage (same file as api/ads.js).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const DB_FILE = '/tmp/ads-db.json';

function ensureDbFile() {
  try { mkdirSync('/tmp', { recursive: true }); } catch { /* exists */ }
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify({ lastId: 0, ads: [] }), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  return JSON.parse(readFileSync(DB_FILE, 'utf8') || '{"lastId":0,"ads":[]}');
}

function writeDb(db) {
  writeFileSync(DB_FILE, JSON.stringify(db), 'utf8');
}

function buildInlineMediaUrl(fileData, fileType) {
  if (!fileData) return '';
  return `data:${fileType || 'image/jpeg'};base64,${fileData}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);

  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const id = Number(req.query?.id || new URL(req.url, 'http://x').searchParams.get('id'));
  if (!id || isNaN(id)) {
    res.status(400).json({ error: 'id query parameter is required' });
    return;
  }

  try {
    const db = readDb();

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      db.ads = db.ads.filter((ad) => ad.id !== id);
      writeDb(db);
      res.status(200).json({ deleted: id });
      return;
    }

    // ── PUT: update ───────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      let body;
      try { body = await readJsonBody(req); }
      catch { res.status(400).json({ error: 'Invalid JSON body' }); return; }

      const existing = db.ads.find((ad) => ad.id === id);
      if (!existing) { res.status(404).json({ error: 'Ad not found' }); return; }

      const title         = body.title         ?? existing.title;
      const shop_name     = body.shop_name     ?? existing.shop_name;
      const city          = body.city          ?? existing.city;
      const time_category = body.time_category ?? existing.time_category;

      // Only replace file if a new one was provided
      const file_data  = body.file_data  ?? existing.file_data;
      const file_type  = body.file_type  ?? existing.file_type;
      const file_name  = body.file_name  ?? existing.file_name;
      const media_type = file_type
        ? (file_type.startsWith('video') ? 'video' : 'image')
        : existing.media_type;

      Object.assign(existing, {
        title,
        shop_name,
        city,
        time_category,
        file_data,
        file_type,
        file_name,
        media_type,
      });
      writeDb(db);

      res.status(200).json({
        id, title, shop_name, city, time_category, media_type,
        file_path: `/api/media?id=${id}`,
        media_url: buildInlineMediaUrl(file_data, file_type),
        image_url: buildInlineMediaUrl(file_data, file_type),
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('ads-item handler error', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
