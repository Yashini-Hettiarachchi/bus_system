// Vercel Serverless: GET /api/media?id=X
// Reads the base64 file_data stored in SQLite and serves it as the correct
// MIME type so <img> and <video> elements can display ad media directly.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const id = Number(req.query?.id || new URL(req.url, 'http://x').searchParams.get('id'));
  if (!id || isNaN(id)) {
    res.status(400).send('id required');
    return;
  }

  try {
    const db = readDb();
    const row = db.ads.find((ad) => ad.id === id) || null;

    if (!row || !row.file_data) {
      // Return a transparent 1×1 pixel placeholder when no file stored
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk' +
        'YAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(200).send(placeholder);
      return;
    }

    const mime = row.file_type || 'image/jpeg';
    const buf  = Buffer.from(row.file_data, 'base64');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (row.file_name) {
      res.setHeader('Content-Disposition', `inline; filename="${row.file_name}"`);
    }
    res.status(200).send(buf);
  } catch (err) {
    console.error('media handler error', err);
    res.status(500).send('Server error');
  }
}
