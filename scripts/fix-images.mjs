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

// Extract full-size Shopify product images from HTML
function extractShopifyImages(html, productName) {
  const $ = cheerio.load(html);
  const images = [];
  const seenUrls = new Set();

  // Method 1: Find Shopify product JSON embedded in page
  const htmlStr = $.html();

  // Look for product image URLs in the Shopify JSON
  const imgPattern = /\/\/[^"'\s]+cdn\.shopify\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi;
  const matches = htmlStr.match(imgPattern) || [];

  for (let src of matches) {
    if (src.startsWith('//')) src = 'https:' + src;

    // Skip tiny thumbnails - remove size params to get full resolution
    const cleanSrc = src
      .replace(/[?&]width=\d+/g, '')
      .replace(/[?&]height=\d+/g, '')
      .replace(/_(\d+x\d*|\d*x\d+)\./g, '.')
      .replace(/_small\./g, '.')
      .replace(/_medium\./g, '.')
      .replace(/_large\./g, '.')
      .replace(/_grande\./g, '.')
      .replace(/_compact\./g, '.')
      .replace(/_pico\./g, '.')
      .replace(/_icon\./g, '.')
      .replace(/_thumb\./g, '.')
      .replace(/_master\./g, '.');

    // Skip logos, icons, payment icons, social media
    if (cleanSrc.includes('logo') || cleanSrc.includes('icon') || cleanSrc.includes('payment')
      || cleanSrc.includes('badge') || cleanSrc.includes('DMCA') || cleanSrc.includes('footer')
      || cleanSrc.includes('banner') || cleanSrc.includes('collection')) continue;

    // Normalize to avoid duplicates
    const normalizedSrc = cleanSrc.split('?')[0]; // Remove all query params

    if (!seenUrls.has(normalizedSrc)) {
      seenUrls.add(normalizedSrc);
      images.push({
        url: cleanSrc,
        alt: `${productName} - View ${images.length + 1}`,
        is_primary: images.length === 0
      });
    }
  }

  // Method 2: Also check for product media JSON
  const mediaMatch = htmlStr.match(/"media":\s*\[(.*?)\]/s);
  if (mediaMatch) {
    const mediaSrcs = mediaMatch[1].match(/"src":"([^"]+)"/g) || [];
    for (const m of mediaSrcs) {
      let src = m.replace('"src":"', '').replace('"', '');
      if (src.startsWith('//')) src = 'https:' + src;
      src = src.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      const normalizedSrc = src.split('?')[0];
      if (!seenUrls.has(normalizedSrc) && src.includes('cdn.shopify')) {
        seenUrls.add(normalizedSrc);
        images.push({
          url: src,
          alt: `${productName} - View ${images.length + 1}`,
          is_primary: images.length === 0
        });
      }
    }
  }

  // Method 3: Check for S3 images (jumpjoyrent)
  const s3Pattern = /https?:\/\/[^"'\s]+s3\.amazonaws\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi;
  const s3Matches = htmlStr.match(s3Pattern) || [];
  for (const src of s3Matches) {
    if (!seenUrls.has(src) && !src.includes('logo') && !src.includes('icon')) {
      seenUrls.add(src);
      images.push({
        url: src,
        alt: `${productName} - View ${images.length + 1}`,
        is_primary: images.length === 0
      });
    }
  }

  return images.slice(0, 10); // Max 10 images per product
}

// Build product URL from slug and source info
function guessProductUrl(product) {
  const name = product.name.toLowerCase();
  const slug = product.slug;

  // Check if it looks like a JumpOrange product
  if (name === name.toUpperCase() || name.includes('CHALLENGE') || name.includes('COMBO') ||
      name.includes('BOUNCE HOUSE') || name.includes('SLIDE') || name.includes('OBSTACLE')) {
    // JumpOrange style - construct URL
    const joSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `https://www.jumporange.com/products/available-now-${joSlug}`;
  }

  return null;
}

async function main() {
  console.log('🖼️  Image Fixer — Finding products with missing images...\n');

  // Get products with no images
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, images')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  const noImages = products.filter(p => !p.images || p.images.length === 0);
  console.log(`Found ${noImages.length} products with no images out of ${products.length} total\n`);

  let fixed = 0, failed = 0;

  for (const product of noImages) {
    // Try different URL patterns for JumpOrange
    const slugVariants = [
      product.slug,
      product.slug.replace(/^/, 'available-now-'),
      product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ];

    let images = [];

    // Try JumpOrange URLs
    for (const sv of slugVariants) {
      if (images.length > 0) break;
      const url = `https://www.jumporange.com/products/${sv}`;
      try {
        const html = await fetchHTML(url);
        if (html.includes('404') && html.length < 5000) continue;
        images = extractShopifyImages(html, product.name);
        if (images.length > 0) {
          console.log(`  ✓ ${product.name} — ${images.length} images from JumpOrange (${sv})`);
        }
      } catch {}
    }

    // Try Gorillabounce URLs
    if (images.length === 0) {
      for (const sv of slugVariants) {
        if (images.length > 0) break;
        const url = `https://gorillabounce.com/products/${sv}`;
        try {
          const html = await fetchHTML(url);
          if (html.includes('404') && html.length < 5000) continue;
          images = extractShopifyImages(html, product.name);
          if (images.length > 0) {
            console.log(`  ✓ ${product.name} — ${images.length} images from GorillaBounce`);
          }
        } catch {}
      }
    }

    if (images.length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ images })
        .eq('id', product.id);

      if (updateError) {
        console.log(`  ✗ Update error for ${product.name}: ${updateError.message}`);
        failed++;
      } else {
        fixed++;
      }
    } else {
      console.log(`  ⚠ No images found for: ${product.name}`);
      failed++;
    }
  }

  console.log(`\n═══ Image Fix Results ═══`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Still missing: ${failed}`);

  // Final summary
  const { data: summary } = await supabase
    .from('products')
    .select('name, images')
    .eq('is_active', true);

  const withImgs = summary.filter(p => p.images && p.images.length > 0).length;
  const withoutImgs = summary.filter(p => !p.images || p.images.length === 0).length;
  console.log(`\n  Total: ${summary.length} products`);
  console.log(`  With images: ${withImgs}`);
  console.log(`  Without images: ${withoutImgs}`);
}

main().catch(console.error);
