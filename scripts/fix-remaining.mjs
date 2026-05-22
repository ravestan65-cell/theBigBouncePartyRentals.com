import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://quliykryvfhhwclkbhnf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bGl5a3J5dmZoaHdjbGtiaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTUyNzYsImV4cCI6MjA4OTYzMTI3Nn0.1AymurP-ppueyQOlQl6tlqhAZLCmtat7N6GoHjAYL-M'
);

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Shopify stores expose a JSON API at /products.json
async function fetchShopifyProducts(domain, page = 1) {
  const url = `https://${domain}/products.json?limit=250&page=${page}`;
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products || [];
}

async function main() {
  console.log('🔧 Fixing remaining products using Shopify JSON API\n');

  // Get all inactive products (missing images)
  const { data: inactive } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', false);

  console.log(`${inactive.length} products need fixing\n`);

  // Build lookup map: slug -> product id
  const slugToId = {};
  for (const p of inactive) {
    slugToId[slug(p.name)] = p.id;
    slugToId[p.slug] = p.id;
  }

  // Fetch ALL JumpOrange products via JSON API
  console.log('═══ Fetching JumpOrange products via API ═══');
  let allJOProducts = [];
  for (let page = 1; page <= 10; page++) {
    const products = await fetchShopifyProducts('www.jumporange.com', page);
    if (products.length === 0) break;
    allJOProducts = allJOProducts.concat(products);
    console.log(`  Page ${page}: ${products.length} products (total: ${allJOProducts.length})`);
  }

  // Fetch ALL GorillaBounce products via JSON API
  console.log('\n═══ Fetching GorillaBounce products via API ═══');
  let allGBProducts = [];
  for (let page = 1; page <= 5; page++) {
    const products = await fetchShopifyProducts('gorillabounce.com', page);
    if (products.length === 0) break;
    allGBProducts = allGBProducts.concat(products);
    console.log(`  Page ${page}: ${products.length} products (total: ${allGBProducts.length})`);
  }

  const allShopify = [...allJOProducts, ...allGBProducts];
  console.log(`\nTotal Shopify products fetched: ${allShopify.length}`);

  // Match and update
  let fixed = 0, notFound = 0;

  for (const p of inactive) {
    const pSlug = slug(p.name);

    // Find matching Shopify product
    const match = allShopify.find(sp => {
      const spSlug = slug(sp.title);
      return spSlug === pSlug ||
             sp.title.toLowerCase() === p.name.toLowerCase() ||
             spSlug.includes(pSlug) || pSlug.includes(spSlug);
    });

    if (!match) {
      console.log(`  ⚠ No match: ${p.name}`);
      notFound++;
      continue;
    }

    // Extract full-size images from Shopify product data
    const images = (match.images || []).map((img, i) => {
      let src = img.src;
      if (src.startsWith('//')) src = 'https:' + src;
      // Remove size suffixes for full resolution
      src = src.replace(/[?&]width=\d+/g, '').replace(/\?$/, '');
      return {
        url: src,
        alt: `${p.name} - View ${i + 1}`,
        is_primary: i === 0
      };
    }).slice(0, 10);

    if (images.length === 0) {
      console.log(`  ⚠ No images in API: ${p.name}`);
      notFound++;
      continue;
    }

    // Extract additional data from Shopify
    const variant = match.variants?.[0] || {};
    const bodyHtml = match.body_html || '';

    // Parse dimensions from body
    let dimensions = '', length = '', width = '', height = '', weight = '';
    const dimMatch = bodyHtml.match(/(\d+)\s*(?:ft|Feet?)?\s*L\s*x\s*(\d+)\s*(?:ft|Feet?)?\s*W\s*x\s*(\d+)\s*(?:ft|Feet?)?\s*H/i)
      || bodyHtml.match(/(\d+)\s*L\s*x\s*(\d+)\s*W\s*x\s*(\d+)\s*H/i)
      || bodyHtml.match(/Inflated\s*Dimension[s]?\s*(?:of\s*)?(\d+)\s*L?\s*x\s*(\d+)\s*W?\s*x\s*(\d+)\s*H?/i);
    if (dimMatch) {
      length = `${dimMatch[1]} ft`;
      width = `${dimMatch[2]} ft`;
      height = `${dimMatch[3]} ft`;
      dimensions = `L${dimMatch[1]} x W${dimMatch[2]} x H${dimMatch[3]} ft`;
    }

    // Weight
    const weightMatch = bodyHtml.match(/(\d+)\s*lbs/i);
    if (weightMatch) weight = `${weightMatch[1]} lbs`;

    // SKU
    const sku = variant.sku || '';

    // Build description from body_html (strip tags)
    const description = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000);

    const updateData = {
      images,
      is_active: true,
    };

    // Only update fields that are currently empty
    if (dimensions) {
      updateData.dimensions = dimensions;
      updateData.length = length;
      updateData.width = width;
      updateData.height = height;
    }
    if (weight) updateData.weight = weight;
    if (sku) updateData.sku = sku;
    if (description && description.length > 20) {
      updateData.description = description;
      updateData.short_description = description.substring(0, 150) + '...';
    }

    const { error } = await supabase.from('products').update(updateData).eq('id', p.id);

    if (error) {
      console.log(`  ✗ Update error: ${p.name} — ${error.message}`);
      notFound++;
    } else {
      console.log(`  ✓ ${p.name} — ${images.length} images, SKU: ${sku || 'n/a'}`);
      fixed++;
    }
  }

  console.log(`\n═══ RESULTS ═══`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Not found: ${notFound}`);

  // Final counts
  const { data: final } = await supabase
    .from('products')
    .select('id, is_active, images')
    .order('sort_order');

  const active = final.filter(p => p.is_active);
  const withImgs = active.filter(p => p.images && p.images.length > 0);
  console.log(`\n  Active products: ${active.length}`);
  console.log(`  With images: ${withImgs.length}`);
  console.log(`  Still inactive: ${final.length - active.length}`);
}

main().catch(console.error);
