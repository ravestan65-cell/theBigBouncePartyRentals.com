import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = 'https://quliykryvfhhwclkbhnf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bGl5a3J5dmZoaHdjbGtiaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTUyNzYsImV4cCI6MjA4OTYzMTI3Nn0.1AymurP-ppueyQOlQl6tlqhAZLCmtat7N6GoHjAYL-M';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──
async function fetchHTML(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  return await res.text();
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── 1. SCRAPE JUMPJOYRENT.COM ──
async function scrapeJumpJoyRent() {
  console.log('\n═══ Scraping jumpjoyrent.com ═══');

  const listHTML = await fetchHTML('https://www.jumpjoyrent.com/en/products');
  const $list = cheerio.load(listHTML);

  // Get all product links
  const productLinks = [];
  $list('a[href*="/products/"]').each((_, el) => {
    const href = $list(el).attr('href');
    if (href && href.match(/\/(water-slides|bounce-houses|party-accessories)\//)) {
      const fullUrl = href.startsWith('http') ? href : `https://www.jumpjoyrent.com${href}`;
      if (!productLinks.includes(fullUrl)) productLinks.push(fullUrl);
    }
  });

  console.log(`  Found ${productLinks.length} product links`);

  const products = [];

  for (const url of productLinks) {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Extract product name
    const name = $('h1').first().text().trim() || $('h2').first().text().trim();

    // Determine category from URL
    let category = 'party-accessories';
    if (url.includes('/bounce-houses/')) category = 'bounce-houses';
    else if (url.includes('/water-slides/')) category = 'water-slides';

    // Get ALL images - full size, no thumbnails
    const images = [];
    const seenUrls = new Set();
    $('img').each((_, el) => {
      let src = $(el).attr('src') || '';
      const dataSrc = $(el).attr('data-src') || '';
      const srcset = $(el).attr('srcset') || '';

      // Prefer data-src or srcset for full-size
      if (dataSrc) src = dataSrc;
      if (srcset) {
        // Get the largest image from srcset
        const parts = srcset.split(',').map(s => s.trim());
        const largest = parts[parts.length - 1]?.split(' ')[0];
        if (largest) src = largest;
      }

      if (!src) return;
      if (src.startsWith('//')) src = 'https:' + src;
      if (src.startsWith('/')) src = 'https://www.jumpjoyrent.com' + src;

      // Skip logos, icons, tiny images
      const alt = $(el).attr('alt') || '';
      if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) return;
      if (src.includes('.svg')) return;

      // Only keep product images (S3 or large images)
      if (src.includes('s3.amazonaws.com') || src.includes('jump-joy')) {
        if (!seenUrls.has(src)) {
          seenUrls.add(src);
          images.push({ url: src, alt: alt || name, is_primary: images.length === 0 });
        }
      }
    });

    // Also check for background images and other image sources
    $('[style*="background-image"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const match = style.match(/url\(["']?(.*?)["']?\)/);
      if (match && match[1] && match[1].includes('s3.amazonaws.com')) {
        const src = match[1];
        if (!seenUrls.has(src)) {
          seenUrls.add(src);
          images.push({ url: src, alt: name, is_primary: images.length === 0 });
        }
      }
    });

    // Get description
    const descEl = $('p').filter((_, el) => $(el).text().length > 50);
    const description = descEl.first().text().trim();

    // Get price
    let dailyPrice = 0;
    const priceText = $('body').text();
    const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)\s*\/?\s*day/i);
    if (priceMatch) dailyPrice = parseFloat(priceMatch[1]);

    // Get dimensions
    const dimMatch = priceText.match(/L(\d+)\s*x\s*W(\d+)\s*x\s*H(\d+)/i);
    let dimensions = '', length = '', width = '', height = '';
    if (dimMatch) {
      length = dimMatch[1]; width = dimMatch[2]; height = dimMatch[3];
      dimensions = `L${length} x W${width} x H${height} ft`;
    }

    // Get age range
    const ageMatch = priceText.match(/(\d+[-–]\d+)\s*years/i) || priceText.match(/(All)\s*years/i);
    const ageRange = ageMatch ? ageMatch[1] + ' years' : '';

    // Get capacity
    const capMatch = priceText.match(/(\d+)\s*(kids|people)/i);
    const capacity = capMatch ? `${capMatch[1]} ${capMatch[2]}` : '';

    // Get features list
    const features = [];
    $('li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 200 && !text.includes('Home') && !text.includes('Products')) {
        features.push(text);
      }
    });

    const product = {
      source: 'jumpjoyrent',
      name,
      category,
      slug: slug(name),
      daily_price: dailyPrice,
      description,
      dimensions, length, width, height,
      age_range: ageRange,
      capacity,
      features: features.slice(0, 10),
      images,
      url
    };

    console.log(`  ✓ ${name} — ${images.length} images`);
    products.push(product);
  }

  return products;
}

// ── 2. SCRAPE GORILLABOUNCE.COM ──
async function scrapeGorillaBounce() {
  console.log('\n═══ Scraping gorillabounce.com ═══');

  // First get the collections/packages page for more products
  const collectionsToScrape = [
    'https://gorillabounce.com/collections/packages/products/bounce-house-startup-package-square-blue-orange-water-slide-combo-21-commercial-grade',
    'https://gorillabounce.com/collections/bounce-houses',
    'https://gorillabounce.com/collections/water-slides',
    'https://gorillabounce.com/collections/combos',
  ];

  const products = [];
  const processedHandles = new Set();

  // First get product links from collection pages
  const productUrls = new Set();
  productUrls.add(collectionsToScrape[0]); // The startup package

  for (const collUrl of collectionsToScrape.slice(1)) {
    try {
      const html = await fetchHTML(collUrl);
      const $ = cheerio.load(html);
      $('a[href*="/products/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('?') && !href.includes('#')) {
          const fullUrl = href.startsWith('http') ? href : `https://gorillabounce.com${href}`;
          productUrls.add(fullUrl);
        }
      });
    } catch (e) {
      console.log(`  Warning: Could not fetch ${collUrl}: ${e.message}`);
    }
  }

  console.log(`  Found ${productUrls.size} product URLs`);

  for (const url of productUrls) {
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      // Shopify stores embed product JSON in the page
      let shopifyProduct = null;
      const scriptTags = $('script').filter((_, el) => {
        const text = $(el).html() || '';
        return text.includes('"product"') || text.includes('"handle"');
      });

      // Try to find the product JSON
      const bodyText = $.html();
      const jsonMatch = bodyText.match(/\{"id":\d+,"title":"[^"]+","handle":"[^"]+".*?"images":\[.*?\].*?\}/);
      if (jsonMatch) {
        try {
          shopifyProduct = JSON.parse(jsonMatch[0]);
        } catch {}
      }

      if (!shopifyProduct) {
        // Try another pattern
        const altMatch = bodyText.match(/var\s+meta\s*=\s*(\{.*?\});/s);
        // Fallback: parse from HTML
        const title = $('h1').first().text().trim();
        if (!title || processedHandles.has(slug(title))) continue;
        processedHandles.add(slug(title));

        const images = [];
        $('img[src*="cdn.shopify"]').each((_, el) => {
          let src = $(el).attr('src') || '';
          if (src.startsWith('//')) src = 'https:' + src;
          // Get full size by removing size params
          src = src.replace(/(_\d+x\d+|_small|_medium|_large|_grande|_compact)/, '');
          const alt = $(el).attr('alt') || title;
          if (!images.find(i => i.url === src)) {
            images.push({ url: src, alt, is_primary: images.length === 0 });
          }
        });

        const price = $('[class*="price"]').first().text().match(/\$([\d,]+(?:\.\d{2})?)/);

        products.push({
          source: 'gorillabounce',
          name: title,
          category: title.toLowerCase().includes('slide') ? 'water-slides' : 'bounce-houses',
          slug: slug(title),
          buy_price: price ? parseFloat(price[1].replace(',', '')) : 0,
          description: $('.rte, [class*="description"]').first().text().trim().substring(0, 1000),
          images: images.slice(0, 8),
          url
        });
        console.log(`  ✓ ${title} — ${images.length} images (HTML parse)`);
        continue;
      }

      // We have Shopify JSON!
      if (processedHandles.has(shopifyProduct.handle)) continue;
      processedHandles.add(shopifyProduct.handle);

      const title = shopifyProduct.title;
      const handle = shopifyProduct.handle;

      // Get full-size images from Shopify JSON
      const images = (shopifyProduct.images || []).map((imgUrl, i) => {
        let src = imgUrl;
        if (src.startsWith('//')) src = 'https:' + src;
        // Remove size suffixes to get full resolution
        src = src.replace(/(_\d+x\d+|_small|_medium|_large|_grande|_compact)\./, '.');
        return { url: src, alt: `${title} - Image ${i + 1}`, is_primary: i === 0 };
      });

      // Parse description text
      const descHtml = shopifyProduct.description || '';
      const desc$ = cheerio.load(descHtml);
      const descText = desc$('body').text().trim();

      // Extract dimensions from description
      const dimMatch = descText.match(/(\d+)\s*Feet?\s*Long\s*x\s*(\d+)\s*Feet?\s*Wide\s*x\s*(\d+)\s*Feet?\s*High/i);

      // Extract features from list items
      const features = [];
      desc$('li').each((_, el) => {
        const text = desc$(el).text().trim();
        if (text.length > 5) features.push(text);
      });

      // Price
      const price = shopifyProduct.price ? shopifyProduct.price / 100 : 0;

      // Determine category
      let category = 'bounce-houses';
      const tags = (shopifyProduct.tags || []).join(' ').toLowerCase();
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('slide') || lowerTitle.includes('water')) category = 'water-slides';
      if (lowerTitle.includes('combo') || tags.includes('combo')) category = 'water-slides';
      if (lowerTitle.includes('package') || lowerTitle.includes('startup')) category = 'combo-packages';
      if (lowerTitle.includes('obstacle')) category = 'bounce-houses';

      // SKU
      const sku = shopifyProduct.variants?.[0]?.sku || '';

      // Weight
      const weight = shopifyProduct.variants?.[0]?.weight
        ? `${Math.round(shopifyProduct.variants[0].weight / 453.592)} lbs`
        : '';

      const product = {
        source: 'gorillabounce',
        name: title,
        category,
        slug: slug(handle),
        buy_price: price,
        daily_price: price > 3000 ? 299 : price > 1500 ? 199 : price > 500 ? 149 : 99,
        description: descText.substring(0, 2000),
        short_description: descText.substring(0, 150).trim() + '...',
        dimensions: dimMatch ? `L${dimMatch[1]} x W${dimMatch[2]} x H${dimMatch[3]} ft` : '',
        length: dimMatch ? `${dimMatch[1]} ft` : '',
        width: dimMatch ? `${dimMatch[2]} ft` : '',
        height: dimMatch ? `${dimMatch[3]} ft` : '',
        weight,
        age_range: '3-12 years',
        capacity: '8-10 kids',
        sku,
        features: features.slice(0, 10),
        included_items: [],
        images: images.slice(0, 8),
        variations: (shopifyProduct.variants || []).filter(v => v.title !== 'Default Title').map(v => ({
          name: v.title,
          sku: v.sku,
          price: v.price / 100
        })),
        url
      };

      // Parse included items from description
      desc$('h4').each((_, el) => {
        const itemText = desc$(el).text().trim();
        if (itemText.startsWith('(') && itemText.length < 200) {
          product.included_items.push(itemText);
        }
      });

      console.log(`  ✓ ${title} — ${images.length} imgs, $${price}, SKU: ${sku}`);
      products.push(product);

    } catch (e) {
      console.log(`  ✗ Error scraping ${url}: ${e.message}`);
    }
  }

  return products;
}

// ── 3. SCRAPE JUMPORANGE.COM ──
async function scrapeJumpOrange() {
  console.log('\n═══ Scraping jumporange.com ═══');

  // Collections to scrape for product links
  const collectionsToScrape = [
    'https://www.jumporange.com/collections/sports-inflatables',
    'https://www.jumporange.com/collections/bounce-houses',
    'https://www.jumporange.com/collections/commercial-water-slides',
    'https://www.jumporange.com/collections/bounce-house-combos',
    'https://www.jumporange.com/collections/inflatable-obstacle-course',
  ];

  const productUrls = new Set();
  // Add the specific product from the user
  productUrls.add('https://www.jumporange.com/products/available-now-soccer-challenge');

  for (const collUrl of collectionsToScrape) {
    try {
      const html = await fetchHTML(collUrl);
      const $ = cheerio.load(html);
      $('a[href*="/products/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('jem-membership') && !href.includes('?')) {
          const clean = href.split('?')[0];
          const fullUrl = clean.startsWith('http') ? clean : `https://www.jumporange.com${clean}`;
          productUrls.add(fullUrl);
        }
      });
    } catch (e) {
      console.log(`  Warning: Could not fetch ${collUrl}: ${e.message}`);
    }
  }

  console.log(`  Found ${productUrls.size} product URLs`);

  const products = [];
  const processedSlugs = new Set();

  for (const url of productUrls) {
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      // Find Shopify product JSON
      let shopifyProduct = null;
      const bodyText = $.html();

      // Try to find product JSON in script tags
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html());
          if (data['@type'] === 'Product') {
            shopifyProduct = data;
          }
        } catch {}
      });

      const title = $('h1').first().text().trim() || shopifyProduct?.name || '';
      if (!title || processedSlugs.has(slug(title))) continue;
      processedSlugs.add(slug(title));

      // Get images - full size from CDN
      const images = [];
      const seenImgUrls = new Set();

      // Get images from the product gallery area
      $('img[src*="cdn.shopify"]').each((_, el) => {
        let src = $(el).attr('src') || '';
        if (src.startsWith('//')) src = 'https:' + src;

        // Get full-size: remove Shopify size params
        src = src.replace(/&width=\d+/, '').replace(/\?width=\d+/, '');

        const alt = $(el).attr('alt') || '';
        // Skip if it's a collection/nav image (usually small)
        if (alt && alt === title && !seenImgUrls.has(src)) {
          seenImgUrls.add(src);
          images.push({ url: src, alt: `${title} - View ${images.length + 1}`, is_primary: images.length === 0 });
        }
      });

      // If we didn't get images from alt matching, get all product images
      if (images.length === 0) {
        $('img[src*="cdn.shopify"]').each((_, el) => {
          let src = $(el).attr('src') || '';
          if (src.startsWith('//')) src = 'https:' + src;
          src = src.replace(/&width=\d+/, '').replace(/\?width=\d+/, '');
          if (!seenImgUrls.has(src) && !src.includes('logo') && !src.includes('icon')) {
            seenImgUrls.add(src);
            images.push({ url: src, alt: `${title} - View ${images.length + 1}`, is_primary: images.length === 0 });
          }
        });
      }

      // Also check srcset for higher resolution
      $('img[srcset*="cdn.shopify"]').each((_, el) => {
        const srcset = $(el).attr('srcset') || '';
        const parts = srcset.split(',').map(s => s.trim());
        for (const part of parts) {
          const [src] = part.split(' ');
          if (src && src.includes('cdn.shopify') && !seenImgUrls.has(src)) {
            let fullSrc = src.startsWith('//') ? 'https:' + src : src;
            fullSrc = fullSrc.replace(/&width=\d+/, '').replace(/\?width=\d+/, '');
            if (!seenImgUrls.has(fullSrc)) {
              seenImgUrls.add(fullSrc);
              images.push({ url: fullSrc, alt: `${title}`, is_primary: images.length === 0 });
            }
          }
        }
      });

      // Get price
      let price = 0;
      if (shopifyProduct?.offers) {
        const offers = Array.isArray(shopifyProduct.offers) ? shopifyProduct.offers : [shopifyProduct.offers];
        price = parseFloat(offers[0]?.price || 0);
      }
      if (!price) {
        const priceMatch = $('[class*="price"]').first().text().match(/\$([\d,]+(?:\.\d{2})?)/);
        if (priceMatch) price = parseFloat(priceMatch[1].replace(',', ''));
      }

      // Get description
      let description = '';
      $('[class*="product__description"], .rte, [class*="ProductDescription"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > description.length) description = text;
      });
      if (!description) {
        description = shopifyProduct?.description || $('meta[name="description"]').attr('content') || '';
      }

      // Get specs from list items on the page
      const specs = {};
      const features = [];
      const included = [];

      $('li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith('SKU:')) specs.sku = text.replace('SKU:', '').trim();
        else if (text.startsWith('SIZE:') || text.startsWith('DIMENSIONS:')) {
          const dimMatch = text.match(/(\d+)\s*L?\s*x\s*(\d+)\s*W?\s*x\s*(\d+)\s*H?/i);
          if (dimMatch) {
            specs.length = dimMatch[1]; specs.width = dimMatch[2]; specs.height = dimMatch[3];
            specs.dimensions = `L${dimMatch[1]} x W${dimMatch[2]} x H${dimMatch[3]} ft`;
          }
        }
        else if (text.startsWith('APPROX') && text.includes('WEIGHT')) {
          const wMatch = text.match(/(\d+)\s*lbs/i);
          if (wMatch) specs.weight = `${wMatch[1]} lbs`;
        }
        else if (text.startsWith('RECOMMENDED AGE')) {
          specs.age_range = text.replace('RECOMMENDED AGE:', '').trim();
        }
        else if (text.startsWith('BLOWER:')) {
          specs.blower = text;
        }
        else if (text.startsWith('INCLUDES:')) {
          text.replace('INCLUDES:', '').split(',').forEach(item => {
            const t = item.trim();
            if (t) included.push(t);
          });
        }
        else if (text.length > 10 && text.length < 200) {
          features.push(text);
        }
      });

      // Determine category
      let category = 'interactive-games';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('slide') || lowerTitle.includes('water')) category = 'water-slides';
      else if (lowerTitle.includes('bounce') || lowerTitle.includes('castle') || lowerTitle.includes('bouncer')) category = 'bounce-houses';
      else if (lowerTitle.includes('combo')) category = 'water-slides';
      else if (lowerTitle.includes('obstacle')) category = 'bounce-houses';
      else if (lowerTitle.includes('challenge') || lowerTitle.includes('game') || lowerTitle.includes('sport')) category = 'interactive-games';

      const product = {
        source: 'jumporange',
        name: title,
        category,
        slug: slug(title),
        buy_price: price,
        daily_price: price > 3000 ? 349 : price > 2000 ? 249 : price > 1000 ? 175 : 99,
        description: description.substring(0, 2000),
        short_description: description.substring(0, 150).trim() + (description.length > 150 ? '...' : ''),
        dimensions: specs.dimensions || '',
        length: specs.length ? `${specs.length} ft` : '',
        width: specs.width ? `${specs.width} ft` : '',
        height: specs.height ? `${specs.height} ft` : '',
        weight: specs.weight || '',
        age_range: specs.age_range || '3+ years',
        capacity: '1-4 players',
        sku: specs.sku || `JO-${slug(title).substring(0, 8).toUpperCase()}`,
        features: features.slice(0, 10),
        included_items: included,
        images: images.slice(0, 8),
        variations: [],
        url
      };

      console.log(`  ✓ ${title} — ${images.length} imgs, $${price}`);
      products.push(product);

    } catch (e) {
      console.log(`  ✗ Error scraping ${url}: ${e.message}`);
    }
  }

  return products;
}

// ── PUSH TO SUPABASE ──
async function pushToSupabase(allProducts) {
  console.log('\n═══ Pushing to Supabase ═══');

  // Ensure categories exist
  const categoryMap = {
    'bounce-houses': { name: 'Bounce Houses', description: 'Classic bounce houses and inflatable castles', icon: 'castle', sort_order: 1 },
    'water-slides': { name: 'Water Slides', description: 'Thrilling water slides for summer parties', icon: 'waves', sort_order: 2 },
    'party-accessories': { name: 'Party Accessories', description: 'Tables, chairs, machines, and fun extras', icon: 'party', sort_order: 3 },
    'interactive-games': { name: 'Interactive Games', description: 'Inflatable sports challenges and party games', icon: 'gamepad', sort_order: 4 },
    'combo-packages': { name: 'Combo Packages', description: 'Complete startup packages with multiple inflatables', icon: 'package', sort_order: 5 },
  };

  // Get or create categories
  const catIds = {};
  for (const [catSlug, catData] of Object.entries(categoryMap)) {
    const { data: existing } = await supabase.from('categories').select('id').eq('slug', catSlug).single();
    if (existing) {
      catIds[catSlug] = existing.id;
    } else {
      const { data: created, error } = await supabase.from('categories')
        .insert({ slug: catSlug, ...catData })
        .select('id')
        .single();
      if (created) catIds[catSlug] = created.id;
      if (error) console.log(`  Category error: ${error.message}`);
    }
  }

  console.log(`  Categories ready: ${Object.keys(catIds).length}`);

  // Upsert products
  let inserted = 0, updated = 0, errors = 0;

  for (const p of allProducts) {
    const categoryId = catIds[p.category];
    if (!categoryId) {
      console.log(`  ⚠ No category for ${p.name} (${p.category})`);
      errors++;
      continue;
    }

    // Check if product already exists
    const { data: existing } = await supabase.from('products').select('id').eq('slug', p.slug).single();

    const productData = {
      slug: p.slug,
      name: p.name,
      category_id: categoryId,
      daily_price: p.daily_price || 0,
      buy_price: p.buy_price || 0,
      description: p.description || '',
      short_description: p.short_description || p.description?.substring(0, 150) || '',
      dimensions: p.dimensions || '',
      length: p.length || '',
      width: p.width || '',
      height: p.height || '',
      weight: p.weight || null,
      age_range: p.age_range || '',
      capacity: p.capacity || '',
      sku: p.sku || '',
      features: p.features || [],
      included_items: p.included_items || [],
      images: p.images || [],
      variations: p.variations || [],
      is_active: true,
    };

    if (existing) {
      // Update: only update if we have MORE images or data
      const { data: existingProduct } = await supabase.from('products').select('images').eq('id', existing.id).single();
      const existingImages = existingProduct?.images || [];

      // Merge images - keep existing + add new ones
      if (p.images.length > 0) {
        const allImgUrls = new Set(existingImages.map(i => i.url));
        for (const img of p.images) {
          if (!allImgUrls.has(img.url)) {
            existingImages.push({ ...img, is_primary: false });
          }
        }
        productData.images = existingImages;
      } else {
        delete productData.images; // Don't overwrite with empty
      }

      const { error } = await supabase.from('products').update(productData).eq('id', existing.id);
      if (error) {
        console.log(`  ✗ Update error for ${p.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`  ↻ Updated: ${p.name}`);
        updated++;
      }
    } else {
      productData.sort_order = inserted + updated + 1;
      const { error } = await supabase.from('products').insert(productData);
      if (error) {
        console.log(`  ✗ Insert error for ${p.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✚ Inserted: ${p.name}`);
        inserted++;
      }
    }
  }

  console.log(`\n═══ DONE ═══`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total products: ${inserted + updated}`);
}

// ── MAIN ──
async function main() {
  console.log('🔍 Product Scraper — Starting...\n');

  const jjrProducts = await scrapeJumpJoyRent();
  const gbProducts = await scrapeGorillaBounce();
  const joProducts = await scrapeJumpOrange();

  const allProducts = [...jjrProducts, ...gbProducts, ...joProducts];

  console.log(`\n📦 Total scraped: ${allProducts.length} products`);
  console.log(`  JumpJoyRent: ${jjrProducts.length}`);
  console.log(`  GorillaBounce: ${gbProducts.length}`);
  console.log(`  JumpOrange: ${joProducts.length}`);

  await pushToSupabase(allProducts);

  // Print summary
  const { data: finalProducts } = await supabase
    .from('products')
    .select('name, slug, daily_price, buy_price, images, category:categories(name)')
    .eq('is_active', true)
    .order('sort_order');

  console.log(`\n📋 Final Product Catalog (${finalProducts?.length || 0} products):`);
  console.log('─'.repeat(90));
  for (const p of (finalProducts || [])) {
    const imgs = p.images?.length || 0;
    const cat = p.category?.name || '?';
    console.log(`  ${p.name.padEnd(45)} | ${cat.padEnd(18)} | $${p.daily_price}/day | Buy $${p.buy_price} | ${imgs} imgs`);
  }
}

main().catch(console.error);
