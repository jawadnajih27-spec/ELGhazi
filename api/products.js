/* ================================================================
   Digital Store Factory v3 — api/products.js
   Vercel Serverless Function
   CRUD كامل للمنتجات — مع التحقق من كلمة سر المتجر
   ================================================================ */

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_KEY;
const SUPER_ADMIN_KEY  = process.env.SUPER_ADMIN_KEY;

// ── Supabase helper ───────────────────────────────────────────────
async function supabase(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message || data.error || 'Supabase error' };
  return data;
}

// ── Auth helpers ──────────────────────────────────────────────────
function isSuperAdmin(req) {
  return req.headers['x-admin-key'] === SUPER_ADMIN_KEY;
}

// التحقق من كلمة سر المتجر
async function verifyStorePassword(slug, password) {
  if (!slug || !password) return false;
  const rows = await supabase(
    `stores?slug=eq.${encodeURIComponent(slug)}&select=password,active`
  );
  if (!rows.length || !rows[0].active) return false;
  return rows[0].password === password;
}

function json(res, status, data) {
  res.status(status).json(data);
}

// ── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {

  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug, id } = req.query;
  const method = req.method;
  const storePassword = req.headers['x-store-password'];
  const adminKey      = req.headers['x-admin-key'];

  try {

    // ── GET /api/products?slug=ahmed ── كل منتجات متجر (عامة)
    if (method === 'GET') {
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });

      const products = await supabase(
        `products?store_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&select=id,store_slug,title_ar,title_fr,desc_ar,desc_fr,price,stock,images,created_at`
      );

      return json(res, 200, products);
    }

    // ── POST /api/products?slug=ahmed ── إضافة منتج
    if (method === 'POST') {
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });

      // التحقق من الهوية — إما super-admin أو كلمة سر المتجر
      const authorized = isSuperAdmin(req) ||
        await verifyStorePassword(slug, storePassword);

      if (!authorized) return json(res, 401, { error: 'غير مصرح — كلمة السر غير صحيحة' });

      const {
        title_ar, title_fr,
        desc_ar,  desc_fr,
        price, stock, images
      } = req.body;

      // التحقق من الحقول الإلزامية
      if (!title_ar) return json(res, 400, { error: 'اسم المنتج بالعربية مطلوب' });
      if (price === undefined || price === null || isNaN(Number(price))) {
        return json(res, 400, { error: 'السعر مطلوب ويجب أن يكون رقماً' });
      }

      // التحقق من الصور — مصفوفة بحد أقصى 5
      let imagesArr = [];
      if (Array.isArray(images)) {
        imagesArr = images.filter(url => typeof url === 'string' && url.trim()).slice(0, 5);
      } else if (typeof images === 'string' && images.trim()) {
        imagesArr = [images.trim()];
      }

      if (!imagesArr.length) return json(res, 400, { error: 'صورة واحدة على الأقل مطلوبة' });

      const newProduct = await supabase('products', 'POST', {
        store_slug: slug,
        title_ar:   title_ar.trim(),
        title_fr:   title_fr?.trim() || null,
        desc_ar:    desc_ar?.trim()  || null,
        desc_fr:    desc_fr?.trim()  || null,
        price:      Number(price),
        stock:      Number(stock) || 99,
        images:     imagesArr
      });

      return json(res, 201, newProduct[0]);
    }

    // ── PUT /api/products?slug=ahmed&id=uuid ── تعديل منتج
    if (method === 'PUT') {
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });
      if (!id)   return json(res, 400, { error: 'id المنتج مطلوب' });

      const authorized = isSuperAdmin(req) ||
        await verifyStorePassword(slug, storePassword);

      if (!authorized) return json(res, 401, { error: 'غير مصرح' });

      const allowed = ['title_ar','title_fr','desc_ar','desc_fr','price','stock','images'];
      const updates = {};

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (key === 'images') {
            let arr = Array.isArray(req.body[key])
              ? req.body[key]
              : [req.body[key]];
            updates[key] = arr.filter(u => u && typeof u === 'string').slice(0, 5);
          } else if (key === 'price') {
            updates[key] = Number(req.body[key]);
          } else if (key === 'stock') {
            updates[key] = Number(req.body[key]) || 99;
          } else {
            updates[key] = req.body[key];
          }
        }
      }

      if (!Object.keys(updates).length) {
        return json(res, 400, { error: 'لا توجد بيانات للتحديث' });
      }

      // التحقق من أن المنتج ينتمي لهذا المتجر
      const existing = await supabase(
        `products?id=eq.${id}&store_slug=eq.${encodeURIComponent(slug)}&select=id`
      );
      if (!existing.length) return json(res, 404, { error: 'المنتج غير موجود' });

      const updated = await supabase(
        `products?id=eq.${id}&store_slug=eq.${encodeURIComponent(slug)}`,
        'PATCH',
        updates
      );

      return json(res, 200, updated[0] || { success: true });
    }

    // ── DELETE /api/products?slug=ahmed&id=uuid ── حذف منتج
    if (method === 'DELETE') {
      if (!slug) return json(res, 400, { error: 'slug مطلوب' });
      if (!id)   return json(res, 400, { error: 'id المنتج مطلوب' });

      const authorized = isSuperAdmin(req) ||
        await verifyStorePassword(slug, storePassword);

      if (!authorized) return json(res, 401, { error: 'غير مصرح' });

      // التحقق من أن المنتج ينتمي لهذا المتجر قبل الحذف
      const existing = await supabase(
        `products?id=eq.${id}&store_slug=eq.${encodeURIComponent(slug)}&select=id`
      );
      if (!existing.length) return json(res, 404, { error: 'المنتج غير موجود' });

      await supabase(
        `products?id=eq.${id}&store_slug=eq.${encodeURIComponent(slug)}`,
        'DELETE'
      );

      return json(res, 200, { success: true, message: 'تم حذف المنتج' });
    }

    return json(res, 405, { error: 'الطريقة غير مدعومة' });

  } catch (err) {
    console.error('[products.js error]', err);
    return json(res, err.status || 500, { error: err.message || 'خطأ في الخادم' });
  }
}

