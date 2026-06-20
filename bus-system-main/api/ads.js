// Vercel Serverless: GET /api/ads  — list all ads
//                   POST /api/ads  — create a new ad
// Uses /tmp JSON storage to avoid native sqlite runtime issues on Vercel.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const DB_FILE = '/tmp/ads-db.json';

function ensureDbFile() {
  try { mkdirSync('/tmp', { recursive: true }); } catch { /* already exists */ }
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify({ lastId: 0, ads: [] }), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  const raw = readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw || '{"lastId":0,"ads":[]}');
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

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const db = readDb();

    // ── GET: list all ads (strip file_data to keep payload small) ────────────
    if (req.method === 'GET') {
      const adsWithPath = [...db.ads]
        .sort((a, b) => b.id - a.id)
        .map((r) => ({
        ...r,
        file_data: undefined,
        file_path: `/api/media?id=${r.id}`,
        media_url: buildInlineMediaUrl(r.file_data, r.file_type),
        image_url: buildInlineMediaUrl(r.file_data, r.file_type),
      }));
      res.status(200).json(adsWithPath);
      return;
    }

    // ── POST: create ad ───────────────────────────────────────────────────────
    if (req.method === 'POST') {
      let body;
      try { body = await readJsonBody(req); }
      catch { res.status(400).json({ error: 'Invalid request body — expected JSON' }); return; }

      const { title, shop_name, city = 'colombo', time_category = 'morning',
              file_data, file_type, file_name } = body;

      if (!title || !shop_name) {
        res.status(400).json({ error: 'title and shop_name are required' });
        return;
      }

      const media_type = (file_type || '').startsWith('video') ? 'video' : 'image';
      const id = (db.lastId || 0) + 1;
      db.lastId = id;
      db.ads.push({
        id,
        title,
        shop_name,
        city,
        time_category,
        file_data: file_data || null,
        file_type: file_type || null,
        file_name: file_name || null,
        media_type,
        created_at: new Date().toISOString(),
      });
      writeDb(db);

      res.status(201).json({
        id,
        title, shop_name, city, time_category, media_type,
        file_path: `/api/media?id=${id}`,
        media_url: buildInlineMediaUrl(file_data || null, file_type || null),
        image_url: buildInlineMediaUrl(file_data || null, file_type || null),
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('ads handler error', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
