import type { ItemMedia } from '@/db/types';

export interface CatalogueItem {
    id: number;
    item_name: string;
    category: string;
    product_name?: string;
    brand_name?: string;
    vertical_name?: string;
    variant1?: string;
    variant2?: string;
    description?: string;
    retail_price?: number;
    wholesale_price?: number;
    media: ItemMedia[];
}

export interface BusinessProfile {
    business_name: string;
    address?: string;
    contact?: string;
    email?: string;
    website?: string;
    gstin?: string;
}

export interface CatalogueConfig {
    title?: string;
    showPrices?: boolean;
    priceType?: 'retail' | 'wholesale' | 'both';
}

export const generateFlipbookHtml = async (
    items: CatalogueItem[], 
    profile: BusinessProfile,
    config: CatalogueConfig = {}
): Promise<string> => {
    const { 
        title = `${profile.business_name} Catalogue`,
        showPrices = true,
        priceType = 'retail'
    } = config;
    const processedItems = items.map(item => ({
        ...item,
        media: item.media.map(m => ({
            ...m,
            base64: m.data_base64
        }))
    }));

    const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.business_name} Catalogue</title>
    <style>
        :root {
            --primary: #1a1a1a;
            --secondary: #404040;
            --accent: #d4a017;
            --bg: #f5f5f5;
            --card-bg: #ffffff;
            --text: #333333;
            --text-light: #666666;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .cover {
            text-align: center;
            padding: 60px 20px;
            background: linear-gradient(135deg, #2c3e50, #000000);
            color: white;
            border-radius: 12px;
            margin-bottom: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
        }
        
        .cover::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%);
        }

        .cover-content { position: relative; z-index: 1; }
        .business-name { font-size: 3.5rem; font-weight: 300; letter-spacing: 2px; margin-bottom: 10px; }
        .catalogue-title { font-size: 1.2rem; text-transform: uppercase; letter-spacing: 4px; color: var(--accent); margin-bottom: 30px; }
        .contact-info { font-size: 0.9rem; opacity: 0.8; }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }

        .card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .media-container {
            position: relative;
            width: 100%;
            padding-top: 100%;
            background: #f0f0f0;
            overflow: hidden;
            cursor: pointer;
        }

        .media-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            transition: transform 0.5s ease;
        }

        .stack-indicator {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
        }

        .card-content {
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .brand-tag {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--accent);
            font-weight: 600;
            margin-bottom: 5px;
        }

        .item-name {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 5px;
            line-height: 1.3;
        }

        .category-name {
            font-size: 0.85rem;
            color: var(--text-light);
            margin-bottom: 15px;
        }

        .details-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: auto;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }

        .variants {
            font-size: 0.8rem;
            color: var(--text-light);
            background: #f8f8f8;
            padding: 4px 8px;
            border-radius: 4px;
        }

        .price {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--primary);
        }
        
        .price-label { font-size: 0.7rem; font-weight: 400; color: var(--text-light); margin-right: 2px; }

        .lightbox {
            display: none;
            position: fixed;
            z-index: 1000;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }

        .lightbox.active { display: flex; animation: fadeIn 0.3s; }

        .lightbox-content {
            position: relative;
            max-width: 90%;
            max-height: 80%;
            display: flex;
            justify-content: center;
        }

        .lightbox-img {
            max-width: 100%;
            max-height: 80vh;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        .lightbox-thumbnails {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            overflow-x: auto;
            padding: 10px;
            max-width: 90%;
        }

        .thumb {
            width: 60px;
            height: 60px;
            border-radius: 4px;
            object-fit: cover;
            cursor: pointer;
            border: 2px solid transparent;
            opacity: 0.6;
            transition: all 0.2s;
        }

        .thumb.active { border-color: var(--accent); opacity: 1; }
        .thumb:hover { opacity: 1; }

        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 30px;
            cursor: pointer;
            background: none;
            border: none;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .footer {
            text-align: center;
            margin-top: 60px;
            padding: 20px;
            color: var(--text-light);
            font-size: 0.9rem;
            border-top: 1px solid #eee;
        }

        @media (max-width: 600px) {
            .business-name { font-size: 2.5rem; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

    <div class="cover">
        <div class="cover-content">
            <h1 class="business-name">${profile.business_name}</h1>
            <div class="catalogue-title">${title} • ${date}</div>
            <div class="contact-info">
                ${profile.address ? `<p>${profile.address}</p>` : ''}
                ${profile.contact ? `<p>Tel: ${profile.contact}</p>` : ''}
                ${profile.email ? `<p>${profile.email}</p>` : ''}
            </div>
        </div>
    </div>

    <div class="grid">
        ${processedItems.map((item, index) => {
        // Use primary image for catalogue, or first image as fallback
        const primaryMedia = item.media.find(m => m.media_role === 'primary');
        const mainImage = primaryMedia ? primaryMedia.base64 : (item.media.length > 0 ? item.media[0].base64 : null);
        const hasStack = item.media.length > 1;

        return `
            <div class="card">
                <div class="media-container" onclick="openLightbox(${index})">
                    ${mainImage
                ? `<img src="${mainImage}" class="media-img" alt="${item.item_name}">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#eee;color:#ccc;font-size:3rem;">❖</div>`
            }
                    ${hasStack ? `<div class="stack-indicator">+${item.media.length - 1}</div>` : ''}
                </div>
                <div class="card-content">
                    ${item.brand_name ? `<div class="brand-tag">${item.brand_name}</div>` : ''}
                    ${item.product_name ? `<div class="product-tag" style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 3px;">${item.product_name}</div>` : ''}
                    <h3 class="item-name">${item.item_name}</h3>
                    <div class="category-name">${item.vertical_name ? item.vertical_name + ' • ' : ''}${item.category}</div>
                    
                    ${showPrices ? `
                    <div class="details-row">
                        <div class="variants">
                            ${item.variant1 ? item.variant1 : ''} ${item.variant2 ? '• ' + item.variant2 : ''}
                        </div>
                        ${priceType === 'retail' && item.retail_price
                            ? `<div class="price"><span class="price-label">MRP</span>₹${item.retail_price}</div>`
                            : priceType === 'wholesale' && item.wholesale_price
                                ? `<div class="price wholesale"><span class="price-label">WS</span>₹${item.wholesale_price}</div>`
                                : priceType === 'both' && (item.retail_price || item.wholesale_price)
                                    ? `<div class="prices">
                                        ${item.retail_price ? `<div class="price"><span class="price-label">MRP</span>₹${item.retail_price}</div>` : ''}
                                        ${item.wholesale_price ? `<div class="price wholesale" style="margin-top: 4px;"><span class="price-label">WS</span>₹${item.wholesale_price}</div>` : ''}
                                       </div>`
                                    : ''
                        }
                    </div>
                    ` : ''}
                </div>
            </div>
            `;
    }).join('')}
    </div>

    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${profile.business_name}. All rights reserved.</p>
        <p style="font-size: 0.8rem; margin-top: 5px;">Generated by VisualOS</p>
    </div>

    <div id="lightbox" class="lightbox">
        <button class="close-btn" onclick="closeLightbox()">&times;</button>
        <div class="lightbox-content">
            <img id="lb-image" class="lightbox-img" src="" alt="Zoomed">
        </div>
        <div id="lb-thumbnails" class="lightbox-thumbnails"></div>
    </div>

    <script>
        const items = ${JSON.stringify(processedItems.map(i => ({
        name: i.item_name,
        media: i.media.map(m => m.base64)
    })))};

        const lightbox = document.getElementById('lightbox');
        const lbImage = document.getElementById('lb-image');
        const lbThumbs = document.getElementById('lb-thumbnails');

        function openLightbox(index) {
            const item = items[index];
            if (!item.media || item.media.length === 0) return;

            lightbox.classList.add('active');
            showImage(item, 0);
            
            lbThumbs.innerHTML = item.media.map((src, i) => \`
                <img src="\${src}" class="thumb \${i === 0 ? 'active' : ''}" onclick="showImage(items[\${index}], \${i})">
            \`).join('');
        }

        function showImage(item, imgIndex) {
            lbImage.src = item.media[imgIndex];
            const thumbs = document.querySelectorAll('.thumb');
            thumbs.forEach((t, i) => {
                if (i === imgIndex) t.classList.add('active');
                else t.classList.remove('active');
            });
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    </script>
</body>
</html>
    `;
};
