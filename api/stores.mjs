/* ================================================================
   Digital Store Factory v3 — api/stores.js
   Vercel Serverless Function
   CRUD كامل للمتاجر — يتصل بـ Supabase مباشرة
   ================================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPER_ADMIN_KEY = process.env.SUPER_ADMIN_KEY;

// ── Supabase helper ───────────────────────────────────────────────
async function supabase(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message || data.error || 'Supabase error' };
  return data;
}

// ── Auth helpers ──────────────────────────────────────────────────
function isSuperAdmin(req) {
  return req.headers['x-admin-key'] === SUPER_ADMIN_KEY;
}

function json(res, status, data) {
  res.status(status).json(data);
}

// ── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  const method   = req.method;

  try {

    // ── GET /api/stores?slug=ahmed ── بيانات متجر واحد (عامة)
    // ── GET /api/stores            ── كل المتاجر (super-admin فقط)
    if (method === 'GET') {

      if (slug) {
        // عام — لا يحتاج مصادقة — يُرجع بيانات المتجر بدون كلمة السر
        const rows = await supabase(
          `stores?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=slug,name_ar,name_fr,lang,whatsapp,currency,primary_color,accent_color,logo_url,desc_ar,desc_fr`
        );
        if (!rows.length) return json(res, 404, { error: 'المتجر غير موجود أو غير نشط' });
        return json(res, 200, rows[0]);
      }

      // قائمة كل المتاجر — super-admin فقط
      if (!isSuperAdmin(req)) return json(res, 401, { error: 'غير مصرح' });

      const stores = await supabase(
        `stores?select=slug,name_ar,name_fr,lang,whatsapp,currency,primary_color,accent_color,active,created_at&order=created_at.desc`
      );

      // نضيف عدد المنتجات لكل متجر
      const withCounts = await Promise.all(stores.map(async store => {
        try {
          const products = await supabase(`products?store_slug=eq.${store.slug}&select=id`);
          return { ...store, product_count: products.length };
        } catch {
          return { ...store, product_count: 0 };
        }
      }));

      return json(res, 200, withCounts);
    }

    // ── POST /api/stores ── إنشاء متجر جديد (super-admin فقط)
    if (method === 'POST') {
      if (!isSuperAdmin(req)) return json(res, 401, { error: 'غير مصرح' });

      const {
        slug, name_ar, name_fr, lang,
        password, whatsapp, currency,
        primary_color, accent_color,
        logo_url, desc_ar, desc_fr
      } = req.body;

      // التحقق من الحقول الإلزامية
      if (!slug || !name_ar || !password) {
        return json(res, 400, { error: 'slug واسم المتجر وكلمة السر مطلوبة' });
      }

      // التحقق من أن الـ slug لا يحتوي على أحرف غير مسموح بها
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return json(res, 400, { error: 'الـ slug يجب أن يحتوي على أحرف صغيرة وأرقام وشرطة فقط' });
      }

      const newStore = await supabase('stores', 'POST', {
        slug,
        name_ar,
        name_fr:       name_fr || null,
        lang:          lang || 'ar',
        password,
        whatsapp:      whatsapp || '',
        currency:      currency || 'درهم',
        primary_color: primary_color || '#6366f1',
        accent_color:  accent_color  || '#22d3ee',
        logo_url:      logo_url || null,
        desc_ar:       desc_ar || null,
        desc_fr:       desc_fr || null,
        active:        true
      });

      return json(res, 201, newStore[0]);
    }

    // ── PUT /api/stores?slug=ahmed ── تعديل متجر (super-admin فقط)
    if (method === 'PUT') {
      if (!isSuperAdmin(req)) return json(res, 401, { error: 'غير مصرح' });
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });

      const allowed = [
        'name_ar','name_fr','lang','password',
        'whatsapp','currency','primary_color','accent_color',
        'logo_url','desc_ar','desc_fr','active'
      ];

      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (!Object.keys(updates).length) {
        return json(res, 400, { error: 'لا توجد بيانات للتحديث' });
      }

      const updated = await supabase(
        `stores?slug=eq.${encodeURIComponent(slug)}`,
        'PATCH',
        updates
      );

      return json(res, 200, updated[0] || { success: true });
    }

    // ── DELETE /api/stores?slug=ahmed ── حذف متجر (super-admin فقط)
    if (method === 'DELETE') {
      if (!isSuperAdmin(req)) return json(res, 401, { error: 'غير مصرح' });
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });

      await supabase(`stores?slug=eq.${encodeURIComponent(slug)}`, 'DELETE');
      return json(res, 200, { success: true, message: `تم حذف المتجر ${slug}` });
    }

    // ── POST /api/stores/auth ── التحقق من كلمة سر العميل
    if (method === 'POST' && req.url?.includes('/auth')) {
      const { slug: authSlug, password } = req.body;
      if (!authSlug || !password) return json(res, 400, { error: 'بيانات ناقصة' });

      const rows = await supabase(
        `stores?slug=eq.${encodeURIComponent(authSlug)}&select=password,active`
      );

      if (!rows.length)        return json(res, 404, { error: 'المتجر غير موجود' });
      if (!rows[0].active)     return json(res, 403, { error: 'المتجر موقف مؤقتاً' });
      if (rows[0].password !== password) return json(res, 401, { error: 'كلمة السر غير صحيحة' });

      return json(res, 200, { success: true });
    }

    return json(res, 405, { error: 'الطريقة غير مدعومة' });

  } catch (err) {
    console.error('[stores.js error]', err);
    return json(res, err.status || 500, { error: err.message || 'خطأ في الخادم' });
  }
}
