/* ================================================================
   Digital Store Factory v3 — api/store-auth.js
   Vercel Serverless Function
   مصادقة مدير المتجر عبر slug + password
   ================================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, message: data.message || data.error || 'Supabase error' };
  }
  return data;
}

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'الطريقة غير مدعومة' });

  try {
    const { slug, password } = req.body || {};
    if (!slug || !password) return json(res, 400, { error: 'بيانات ناقصة' });

    const rows = await supabase(
      `stores?slug=eq.${encodeURIComponent(slug)}&select=password,active`
    );

    if (!rows.length) return json(res, 404, { error: 'المتجر غير موجود' });
    if (!rows[0].active) return json(res, 403, { error: 'المتجر موقف مؤقتاً' });
    if (rows[0].password !== password) return json(res, 401, { error: 'كلمة السر غير صحيحة' });

    return json(res, 200, { success: true });
  } catch (err) {
    console.error('[store-auth.js error]', err);
    return json(res, err.status || 500, { error: err.message || 'خطأ في الخادم' });
  }
}
