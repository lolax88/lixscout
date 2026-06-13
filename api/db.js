/**
 * Lixscout Database Layer — Triple Fallback
 * 
 * Priority:
 * 1. Vercel KV (primary) — fast, integrated
 * 2. Supabase (backup) — reliable, free 500MB
 * 3. localStorage (last resort) — always works, client-side only
 * 
 * Usage:
 *   import { saveClaim, saveReview, getReviews } from './db.js';
 *   await saveClaim('user@email.com');
 */

// ====== CONFIGURATION ======
const CONFIG = {
  // Vercel KV — auto-injected by Vercel after connecting KV store
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
  
  // Supabase — isi setelah buat project
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  
  // localStorage keys
  LS_DISCOUNT: 'lixscout_discount',
  LS_REVIEWS: 'lixscout_reviews',
};

// ====== HELPERS ======
function getDiscountData() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.LS_DISCOUNT)) || { claimed: false, email: '', reviewed: false };
  } catch { return { claimed: false, email: '', reviewed: false }; }
}

function saveDiscountData(data) {
  localStorage.setItem(CONFIG.LS_DISCOUNT, JSON.stringify(data));
}

function getLocalReviews() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.LS_REVIEWS)) || [];
  } catch { return []; }
}

function saveLocalReview(review) {
  const reviews = getLocalReviews();
  reviews.push(review);
  localStorage.setItem(CONFIG.LS_REVIEWS, JSON.stringify(reviews));
}

// ====== VERCEL KV ======
async function kvSaveClaim(email) {
  if (!CONFIG.KV_REST_API_URL) throw new Error('KV not configured');
  
  const res = await fetch(`${CONFIG.KV_REST_API_URL}/set/claim:${email}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      discount: 5,
      has_reviewed: false,
      claimed_at: new Date().toISOString()
    })
  });
  
  if (!res.ok) throw new Error('KV save failed');
  return await res.json();
}

async function kvSaveReview(email, rating, text, name) {
  if (!CONFIG.KV_REST_API_URL) throw new Error('KV not configured');
  
  // Save review
  const reviewKey = `review:${email}:${Date.now()}`;
  const res = await fetch(`${CONFIG.KV_REST_API_URL}/set/${reviewKey}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email, rating, text, name,
      created_at: new Date().toISOString()
    })
  });
  
  if (!res.ok) throw new Error('KV review save failed');
  
  // Update claim has_reviewed
  await fetch(`${CONFIG.KV_REST_API_URL}/set/claim:${email}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email, discount: 5, has_reviewed: true,
      claimed_at: new Date().toISOString()
    })
  });
  
  return { success: true };
}

async function kvGetReviews() {
  if (!CONFIG.KV_REST_API_URL) throw new Error('KV not configured');
  
  const res = await fetch(`${CONFIG.KV_REST_API_URL}/keys/review:*`, {
    headers: { 'Authorization': `Bearer ${CONFIG.KV_REST_API_TOKEN}` }
  });
  
  if (!res.ok) throw new Error('KV fetch failed');
  return await res.json();
}

// ====== SUPABASE ======
async function supabaseSaveClaim(email) {
  if (!CONFIG.SUPABASE_URL) throw new Error('Supabase not configured');
  
  // Check if exists
  const check = await fetch(
    `${CONFIG.SUPABASE_URL}/rest/v1/claims?email=eq.${encodeURIComponent(email)}&select=id,discount_percent,has_reviewed`,
    {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      }
    }
  );
  
  const existing = await check.json();
  
  if (existing.length > 0) {
    return {
      success: true,
      already_claimed: true,
      discount: existing[0].discount_percent,
      has_reviewed: existing[0].has_reviewed
    };
  }
  
  // Insert new claim
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/claims`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      email,
      discount_percent: 5,
      has_reviewed: false,
      ip_address: 'web',
      user_agent: navigator.userAgent
    })
  });
  
  if (!res.ok) throw new Error('Supabase save failed');
  const data = await res.json();
  return { success: true, claim_id: data[0]?.id };
}

async function supabaseSaveReview(email, rating, text, name) {
  if (!CONFIG.SUPABASE_URL) throw new Error('Supabase not configured');
  
  // Get claim_id
  const check = await fetch(
    `${CONFIG.SUPABASE_URL}/rest/v1/claims?email=eq.${encodeURIComponent(email)}&select=id`,
    {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      }
    }
  );
  const claims = await check.json();
  const claimId = claims[0]?.id || null;
  
  // Insert review
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/reviews`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      claim_id: claimId,
      email,
      rating,
      review_text: text,
      reviewer_name: name,
      is_approved: true
    })
  });
  
  if (!res.ok) throw new Error('Supabase review save failed');
  
  // Update has_reviewed
  if (claimId) {
    await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/claims?id=eq.${claimId}`, {
      method: 'PATCH',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ has_reviewed: true })
    });
  }
  
  return { success: true };
}

async function supabaseGetReviews() {
  if (!CONFIG.SUPABASE_URL) throw new Error('Supabase not configured');
  
  const res = await fetch(
    `${CONFIG.SUPABASE_URL}/rest/v1/reviews?is_approved=eq.true&order=created_at.desc&limit=20&select=reviewer_name,rating,review_text,created_at`,
    {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      }
    }
  );
  
  if (!res.ok) throw new Error('Supabase fetch failed');
  return await res.json();
}

// ====== MAIN API — WITH FALLBACK ======

/**
 * Save a discount claim
 * Tries: Vercel KV → Supabase → localStorage
 */
export async function saveClaim(email) {
  const errors = [];
  
  // Try Vercel KV
  try {
    const result = await kvSaveClaim(email);
    console.log('✅ Claim saved to Vercel KV');
    saveDiscountData({ claimed: true, email, reviewed: false, source: 'kv', claimedAt: new Date().toISOString() });
    return { ...result, source: 'kv' };
  } catch (e) {
    errors.push(`KV: ${e.message}`);
  }
  
  // Try Supabase
  try {
    const result = await supabaseSaveClaim(email);
    console.log('✅ Claim saved to Supabase');
    saveDiscountData({ claimed: true, email, reviewed: result.has_reviewed || false, source: 'supabase', claimedAt: new Date().toISOString() });
    return { ...result, source: 'supabase' };
  } catch (e) {
    errors.push(`Supabase: ${e.message}`);
  }
  
  // Fallback: localStorage
  console.log('⚠️ Using localStorage fallback for claim');
  saveDiscountData({ claimed: true, email, reviewed: false, source: 'local', claimedAt: new Date().toISOString() });
  return { success: true, source: 'local', discount: 5 };
}

/**
 * Save a review
 * Tries: Vercel KV → Supabase → localStorage
 */
export async function saveReview(email, rating, text, name) {
  const errors = [];
  
  // Try Vercel KV
  try {
    await kvSaveReview(email, rating, text, name);
    console.log('✅ Review saved to Vercel KV');
    saveLocalReview({ rating, text, name, email, date: new Date().toISOString(), source: 'kv' });
    return { success: true, source: 'kv' };
  } catch (e) {
    errors.push(`KV: ${e.message}`);
  }
  
  // Try Supabase
  try {
    await supabaseSaveReview(email, rating, text, name);
    console.log('✅ Review saved to Supabase');
    saveLocalReview({ rating, text, name, email, date: new Date().toISOString(), source: 'supabase' });
    return { success: true, source: 'supabase' };
  } catch (e) {
    errors.push(`Supabase: ${e.message}`);
  }
  
  // Fallback: localStorage
  console.log('⚠️ Using localStorage fallback for review');
  saveLocalReview({ rating, text, name, email, date: new Date().toISOString(), source: 'local' });
  return { success: true, source: 'local' };
}

/**
 * Get all approved reviews
 * Tries: Supabase → localStorage (KV needs list API)
 */
export async function getAllReviews() {
  // Try Supabase first (best for listing)
  try {
    const reviews = await supabaseGetReviews();
    if (reviews.length > 0) {
      console.log('✅ Loaded reviews from Supabase:', reviews.length);
      return reviews.map(r => ({
        name: r.reviewer_name,
        rating: r.rating,
        text: r.review_text,
        date: r.created_at
      }));
    }
  } catch (e) {
    console.warn('Supabase reviews fetch failed:', e);
  }
  
  // Fallback: localStorage
  console.log('⚠️ Using localStorage for reviews');
  return getLocalReviews();
}

/**
 * Get user's claim status
 */
export function getUserClaimStatus() {
  return getDiscountData();
}

/**
 * Check if user has reviewed
 */
export function hasUserReviewed() {
  const data = getDiscountData();
  return data.claimed && data.reviewed;
}
