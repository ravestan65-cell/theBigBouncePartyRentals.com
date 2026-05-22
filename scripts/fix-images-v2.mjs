import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  'https://quliykryvfhhwclkbhnf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bGl5a3J5dmZoaHdjbGtiaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTUyNzYsImV4cCI6MjA4OTYzMTI3Nn0.1AymurP-ppueyQOlQl6tlqhAZLCmtat7N6GoHjAYL-M'
);

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  return await res.text();
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Extract ALL product image URLs from a Shopify product page
function extractProductImages(html, productName) {
  const images = [];
  const seen = new Set();

  // Strategy: Find ALL Shopify CDN image URLs (both cdn.shopify.com and domain/cdn/shop/)
  const pattern = /(?:https?:)?\/\/[^"'\s]*(?:cdn\.shopify\.com|\/cdn\/shop\/)[^"'\s]*?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/gi;
  const allMatches = html.match(pattern) || [];

  for (let src of allMatches) {
    if (src.startsWith('//')) src = 'https:' + src;

    // Get full size - strip Shopify size params
    let fullSrc = src.replace(/[?&]width=\d+/g, '').replace(/[?&]height=\d+/g, '');
    // Clean up leading ? if width was only param
    fullSrc = fullSrc.replace(/\?$/, '').replace(/\?&/, '?');

    // Skip non-product images
    if (fullSrc.includes('logo') || fullSrc.includes('payment') || fullSrc.includes('badge')
      || fullSrc.includes('DMCA') || fullSrc.includes('icon') || fullSrc.includes('newsletter')
      || fullSrc.includes('_icon') || fullSrc.includes('social')) continue;

    // Normalize for dedup
    const key = fullSrc.split('?')[0];
    if (!seen.has(key)) {
      seen.add(key);
      images.push({
        url: fullSrc,
        alt: `${productName} - View ${images.length + 1}`,
        is_primary: images.length === 0
      });
    }
  }

  return images.slice(0, 10);
}

async function main() {
  console.log('🖼️  Image Fixer V2 — Fetching product pages directly...\n');

  // Get all products without images
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, images')
    .eq('is_active', true);

  const noImages = products.filter(p => !p.images || p.images.length === 0);
  console.log(`${noImages.length} products need images\n`);

  // Build a map from collection pages - get actual product URLs
  const collections = [
    // JumpOrange collections
    'https://www.jumporange.com/collections/sports-inflatables',
    'https://www.jumporange.com/collections/bounce-houses',
    'https://www.jumporange.com/collections/commercial-water-slides',
    'https://www.jumporange.com/collections/bounce-house-combos',
    'https://www.jumporange.com/collections/inflatable-obstacle-course',
    'https://www.jumporange.com/collections/14-15ft-slides',
    'https://www.jumporange.com/collections/18-19ft-slides',
    'https://www.jumporange.com/collections/20ft-and-up',
    'https://www.jumporange.com/collections/dual-lane-slides',
    'https://www.jumporange.com/collections/slip-and-slides',
    'https://www.jumporange.com/collections/dry-combos',
    'https://www.jumporange.com/collections/dual-lane-combo',
    'https://www.jumporange.com/collections/wet-dry-obstacles',
    'https://www.jumporange.com/collections/in-stock',
    // GorillaBounce collections
    'https://gorillabounce.com/collections/bounce-houses',
    'https://gorillabounce.com/collections/water-slides',
    'https://gorillabounce.com/collections/combos',
  ];

  // Map: product name slug -> product URL
  const urlMap = {};

  for (const collUrl of collections) {
    try {
      console.log(`Scanning: ${collUrl}`);
      const html = await fetchHTML(collUrl);
      const $ = cheerio.load(html);

      // Find all product links with their titles
      $('a[href*="/products/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('jem-membership') || href.includes('?')) return;

        // Get product title from nearby text or the link text
        let title = $(el).find('h2, h3, [class*="title"], [class*="Title"]').first().text().trim();
        if (!title) title = $(el).text().trim().split('\n')[0].trim();

        if (title && title.length > 3 && title.length < 200) {
          const cleanHref = href.split('?')[0];
          const domain = collUrl.includes('gorillabounce') ? 'https://gorillabounce.com' : 'https://www.jumporange.com';
          const fullUrl = cleanHref.startsWith('http') ? cleanHref : domain + cleanHref;
          const titleSlug = slug(title);
          urlMap[titleSlug] = fullUrl;
        }
      });
    } catch (e) {
      console.log(`  Warning: ${e.message}`);
    }
  }

  console.log(`\nMapped ${Object.keys(urlMap).length} product URLs\n`);

  // Now fetch each product page for missing images
  let fixed = 0, failed = 0;
  const batchSize = 5;

  for (let i = 0; i < noImages.length; i += batchSize) {
    const batch = noImages.slice(i, i + batchSize);

    await Promise.all(batch.map(async (product) => {
      const productSlug = slug(product.name);
      const url = urlMap[productSlug];

      if (!url) {
        // Try partial matching
        const matchKey = Object.keys(urlMap).find(k => k.includes(productSlug) || productSlug.includes(k));
        if (!matchKey) {
          failed++;
          return;
        }
        const matchUrl = urlMap[matchKey];
        try {
          const html = await fetchHTML(matchUrl);
          const images = extractProductImages(html, product.name);
          if (images.length > 0) {
            await supabase.from('products').update({ images }).eq('id', product.id);
            console.log(`  ✓ ${product.name} — ${images.length} images (partial match)`);
            fixed++;
          } else {
            failed++;
          }
        } catch { failed++; }
        return;
      }

      try {
        const html = await fetchHTML(url);
        const images = extractProductImages(html, product.name);

        if (images.length > 0) {
          await supabase.from('products').update({ images }).eq('id', product.id);
          console.log(`  ✓ ${product.name} — ${images.length} images`);
          fixed++;
        } else {
          console.log(`  ⚠ ${product.name} — 0 images from ${url}`);
          failed++;
        }
      } catch (e) {
        console.log(`  ✗ ${product.name}: ${e.message}`);
        failed++;
      }
    }));
  }

  console.log(`\n═══ Results ═══`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Still missing: ${failed}`);

  // Final count
  const { data: final } = await supabase.from('products').select('id, images').eq('is_active', true);
  const withImgs = final.filter(p => p.images && p.images.length > 0).length;
  console.log(`  Total products: ${final.length}`);
  console.log(`  With images: ${withImgs}`);
  console.log(`  Without images: ${final.length - withImgs}`);
}

main().catch(console.error);
