const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the frontend web interface

async function scrape1688Product(url) {
    // Launch a headless browser
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ] 
    });
    
    const page = await browser.newPage();
    
    // Set a realistic User-Agent to avoid getting blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });

    try {
        // Go to the product page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Add a small delay to allow scripts to fully execute and populate window.context
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract data directly from the page's JavaScript context and DOM
        const productData = await page.evaluate(() => {
            // 1. Get Title from the DOM
            const title = document.querySelector('title') ? document.querySelector('title').innerText.replace(' - Alibaba', '').trim() : 'N/A';
            
            // 2. Extract images from the gallery
            const imageElements = document.querySelectorAll('.od-gallery-list .preview-img');
            const images = Array.from(imageElements).map(img => img.src);

            let price = 'N/A';
            let salesCount = 'N/A';
            let skus = [];

            const skuImageMap = {};
            const debugInfo = {
                skuPropsItem: window.context?.result?.data?.skuSelection,
                skuPreview: window.context?.result?.data?.skuPreview,
                rawSkuProps: window.context?.result?.data?.skuProps,
                skuMapOriginal: window.context?.result?.data?.mainPrice?.fields?.finalPriceModel?.tradeWithoutPromotion?.skuMapOriginal,
                skuImageMap: skuImageMap
            };
            if (window.context && window.context.result && window.context.result.data) {
                const data = window.context.result.data;
                if (data.skuProps) {
                    data.skuProps.forEach(prop => {
                        if (prop.value && Array.isArray(prop.value)) {
                            prop.value.forEach(val => {
                                if (val.name && val.imageUrl) {
                                    skuImageMap[val.name] = val.imageUrl;
                                }
                            });
                        }
                    });
                } else if (data.skuPreview && data.skuPreview.fields && data.skuPreview.fields.skuProps) {
                    data.skuPreview.fields.skuProps.forEach(prop => {
                        if (prop.value && Array.isArray(prop.value)) {
                            prop.value.forEach(val => {
                                if (val.name && val.imageUrl) {
                                    skuImageMap[val.name] = val.imageUrl;
                                }
                            });
                        }
                    });
                }

                // Handle PC 2024/2025 Data Structure
                
                // Fallback: extract variation images directly from DOM elements based on 1688's new structure
                const variationItems = document.querySelectorAll('.expand-view-item');
                variationItems.forEach(item => {
                    const imgEl = item.querySelector('img.ant-image-img');
                    const labelEl = item.querySelector('.item-label');
                    
                    if (imgEl && labelEl) {
                        // The title attribute or the inner text contains the exact variation name
                        const rawName = labelEl.getAttribute('title') || labelEl.innerText;
                        const cleanedName = rawName ? rawName.trim() : '';
                        const src = imgEl.src;
                        
                        if (cleanedName && src) {
                            skuImageMap[cleanedName] = src;
                        }
                    }
                });

                // Fallback 2: extract variation images from .sku-filter-button structure
                const buttonVariations = document.querySelectorAll('.sku-filter-button');
                buttonVariations.forEach(btn => {
                    const imgEl = btn.querySelector('img.ant-image-img') || btn.querySelector('img');
                    const labelEl = btn.querySelector('.label-name');
                    
                    if (imgEl && labelEl) {
                        const rawName = labelEl.getAttribute('title') || labelEl.innerText || labelEl.textContent;
                        const cleanedName = rawName ? rawName.replace(/\n/g, ' ').trim() : '';
                        const src = imgEl.src || imgEl.getAttribute('src') || imgEl.getAttribute('data-src');
                        
                        if (cleanedName && src && !skuImageMap[cleanedName]) {
                            skuImageMap[cleanedName] = src;
                        }
                    }
                });

                // Also try a broader fallback in case the layout is slightly different (like 'transverse-filter')
                const variationImages = document.querySelectorAll('img.ant-image-img, .transverse-filter img');
                variationImages.forEach(img => {
                    if (!img.closest('.expand-view-item') && !img.closest('.sku-filter-button')) { // skip if already processed
                        let name = img.alt || img.title || '';
                        if (!name) {
                            const wrapper = img.closest('[class*="item"], .transverse-filter, li, .prop-item, div.sku-item, div.prop-item') || img.parentElement;
                            if (wrapper) {
                                const labelEl = wrapper.querySelector('.item-label, .name, .label-name, [title]');
                                if (labelEl && labelEl.getAttribute('title')) {
                                    name = labelEl.getAttribute('title');
                                } else if (labelEl && labelEl.innerText) {
                                    name = labelEl.innerText;
                                } else {
                                    name = wrapper.innerText;
                                }
                            }
                        }
                        const cleanedName = name ? name.replace(/\n.+/g, '').trim() : '';
                        if (cleanedName && img.src && !skuImageMap[cleanedName]) {
                            skuImageMap[cleanedName] = img.src;
                        }
                    }
                });

                if (data.mainPrice && data.mainPrice.fields) {
                    // Try to get price
                    const finalPrice = data.mainPrice.fields.finalPriceModel;
                    if (finalPrice && finalPrice.tradeWithoutPromotion) {
                        price = finalPrice.tradeWithoutPromotion.offerPriceDisplay || price;
                    }
                    
                    // Sales count often moved to title or another module? Let's check productTitle module
                    salesCount = data.productTitle?.fields?.saleCount || data.mainServices?.fields?.saleCount || 'N/A';

                    // SKU variations are possibly in mainPrice.fields.finalPriceModel.tradeWithoutPromotion.skuMapOriginal
                    if (finalPrice && finalPrice.tradeWithoutPromotion && finalPrice.tradeWithoutPromotion.skuMapOriginal) {
                        skus = finalPrice.tradeWithoutPromotion.skuMapOriginal.map(sku => {
                            const rawAttributes = sku.specAttrs || sku.name || sku.skuName || '';
                            const attributes = rawAttributes.replace(/&gt;/g, '>').trim();
                            
                            // Try to match the attribute string to find its specific image
                            let thumbImage = null;
                            for (const [attrName, imgUrl] of Object.entries(skuImageMap)) {
                                if (attributes && attributes.includes(attrName.replace(/&gt;/g, '>'))) {
                                    thumbImage = imgUrl;
                                    break;
                                }
                            }

                            return {
                                id: sku.skuId || sku.id,
                                attributes: attributes,
                                price: sku.price || sku.discountPrice,
                                stock: sku.canBookCount || sku.stock,
                                image: thumbImage
                            };
                        });
                    } else if (data.skuPreview && data.skuPreview.fields && data.skuPreview.fields.skuMap) {
                        skus = Object.values(data.skuPreview.fields.skuMap).map(sku => {
                            const rawAttributes = sku.specAttrs || '';
                            const attributes = rawAttributes.replace(/&gt;/g, '>').trim();
                            
                            let thumbImage = null;
                            for (const [attrName, imgUrl] of Object.entries(skuImageMap)) {
                                if (attributes && attributes.includes(attrName.replace(/&gt;/g, '>'))) {
                                    thumbImage = imgUrl;
                                    break;
                                }
                            }

                            return {
                                id: sku.skuId,
                                attributes: attributes,
                                price: sku.price,
                                discountPrice: sku.discountPrice,
                                stock: sku.canBookCount,
                                image: thumbImage
                            };
                        });
                    }
                }
            }

            return {
                title,
                price: price !== 'N/A' ? `¥${price}` : price,
                salesCount,
                images,
                variations: skus,
                url: window.location.href,
                debugInfo
            };
        });

        await browser.close();
        return productData;

    } catch (error) {
        await browser.close();
        throw new Error("Failed to scrape the product: " + error.message);
    }
}

// --- API ENDPOINT ---
app.post('/api/product', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('1688.com')) {
        return res.status(400).json({ error: "Please provide a valid 1688.com product URL" });
    }

    try {
        console.log(`\n================================`);
        console.log(`Fetching data for: ${url}`);
        const data = await scrape1688Product(url);
        
        console.log(`\n--- SCRAPED VARIATIONS DATA ---`);
        console.log("skuImageMap KEYS:", Object.keys(data.debugInfo?.skuImageMap || {}));
        console.log(JSON.stringify(data.variations.slice(0, 3), null, 2));
        console.log(`================================\n`);
        
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Product Scraper API is running on http://localhost:${PORT}`);
});