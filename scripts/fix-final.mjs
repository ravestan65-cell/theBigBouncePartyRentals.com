import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://quliykryvfhhwclkbhnf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bGl5a3J5dmZoaHdjbGtiaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTUyNzYsImV4cCI6MjA4OTYzMTI3Nn0.1AymurP-ppueyQOlQl6tlqhAZLCmtat7N6GoHjAYL-M'
);

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchCollectionJSON(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products || [];
}

async function main() {
  console.log('🔧 Final image fix using Shopify Collection JSON APIs\n');

  // Get all inactive products
  const { data: inactive } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', false);

  console.log(`${inactive.length} products need fixing\n`);

  // Fetch ALL products from JumpOrange via collection JSON APIs
  const joCollections = [
    'sports-inflatables', 'bounce-houses', 'commercial-water-slides',
    'bounce-house-combos', 'inflatable-obstacle-course',
    '14-15ft-slides', '18-19ft-slides', '20ft-and-up', 'dual-lane-slides',
    'slip-and-slides', 'dry-combos', 'dual-lane-combo', 'wet-dry-obstacles',
    'in-stock', '2026-collection', 'all',
  ];

  // Map: title slug -> shopify product data
  const shopifyMap = {};

  for (const coll of joCollections) {
    for (let page = 1; page <= 5; page++) {
      const products = await fetchCollectionJSON(
        `https://www.jumporange.com/collections/${coll}/products.json?limit=250&page=${page}`
      );
      if (products.length === 0) break;
      for (const p of products) {
        const key = slug(p.title);
        if (!shopifyMap[key]) shopifyMap[key] = p;
      }
    }
  }

  // Also GorillaBounce
  const gbCollections = ['bounce-houses', 'water-slides', 'combos', 'packages', 'all'];
  for (const coll of gbCollections) {
    const products = await fetchCollectionJSON(
      `https://gorillabounce.com/collections/${coll}/products.json?limit=250`
    );
    for (const p of products) {
      const key = slug(p.title);
      if (!shopifyMap[key]) shopifyMap[key] = p;
    }
  }

  console.log(`\nTotal unique Shopify products mapped: ${Object.keys(shopifyMap).length}\n`);

  // Match and update
  let fixed = 0, notFound = 0;

  for (const product of inactive) {
    const pSlug = slug(product.name);

    // Try exact match first, then partial
    let match = shopifyMap[pSlug];
    if (!match) {
      // Try partial matching
      const matchKey = Object.keys(shopifyMap).find(k =>
        k === pSlug || k.includes(pSlug) || pSlug.includes(k)
      );
      if (matchKey) match = shopifyMap[matchKey];
    }

    if (!match) {
      console.log(`  ⚠ No match: ${product.name}`);
      notFound++;
      continue;
    }

    // Get FULL SIZE images from Shopify data
    const images = (match.images || []).map((img, i) => ({
      url: img.src.startsWith('//') ? 'https:' + img.src : img.src,
      alt: `${product.name} - View ${i + 1}`,
      is_primary: i === 0
    })).slice(0, 10);

    if (images.length === 0) {
      console.log(`  ⚠ No images: ${product.name}`);
      notFound++;
      continue;
    }

    // Extract rich data
    const bodyHtml = match.body_html || '';
    const bodyText = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const variant = match.variants?.[0] || {};

    // Parse specs
    const dimMatch = bodyText.match(/(\d+(?:\.\d+)?)\s*L?\s*x\s*(\d+(?:\.\d+)?)\s*W?\s*x\s*(\d+(?:\.\d+)?)\s*H?/i);
    const weightMatch = bodyText.match(/(\d+)\s*lbs/i);
    const ageMatch = bodyText.match(/RECOMMENDED AGE:\s*(.+?)(?:\s*BLOWER|\s*$)/i);
    const skuMatch = bodyText.match(/SKU:\s*(\S+)/i);
    const includesMatch = bodyText.match(/INCLUDES:\s*(.+?)(?:\s*SIZE|\s*$)/i);

    const updateData = {
      images,
      is_active: true,
      sku: skuMatch?.[1] || variant.sku || '',
      buy_price: parseFloat(variant.price || 0),
    };

    if (dimMatch) {
      updateData.dimensions = `L${dimMatch[1]} x W${dimMatch[2]} x H${dimMatch[3]} ft`;
      updateData.length = `${dimMatch[1]} ft`;
      updateData.width = `${dimMatch[2]} ft`;
      updateData.height = `${dimMatch[3]} ft`;
    }
    if (weightMatch) updateData.weight = `${weightMatch[1]} lbs`;
    if (ageMatch) updateData.age_range = ageMatch[1].trim();
    if (bodyText.length > 30) {
      updateData.description = bodyText.substring(0, 2000);
      updateData.short_description = bodyText.substring(0, 150) + '...';
    }
    if (includesMatch) {
      updateData.included_items = includesMatch[1].split(',').map(s => s.trim()).filter(s => s);
    }

    // Set rental price based on buy price
    const buyP = updateData.buy_price;
    updateData.daily_price = buyP > 5000 ? 399 : buyP > 3000 ? 299 : buyP > 2000 ? 249 : buyP > 1000 ? 175 : 99;

    const { error } = await supabase.from('products').update(updateData).eq('id', product.id);
    if (error) {
      console.log(`  ✗ Error: ${product.name} — ${error.message}`);
      notFound++;
    } else {
      console.log(`  ✓ ${product.name} — ${images.length} imgs, $${buyP}`);
      fixed++;
    }
  }

  console.log(`\n═══ FINAL RESULTS ═══`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Not found: ${notFound}`);

  const { data: finalCount } = await supabase
    .from('products').select('id, is_active, images');
  const active = finalCount.filter(p => p.is_active);
  const withImgs = active.filter(p => p.images?.length > 0);
  console.log(`\n  Total in DB: ${finalCount.length}`);
  console.log(`  Active: ${active.length}`);
  console.log(`  With images: ${withImgs.length}`);
  console.log(`  Inactive: ${finalCount.length - active.length}`);
}

main().catch(console.error);
