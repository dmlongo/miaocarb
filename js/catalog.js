// ============= CATALOG =============
async function loadCatalog() {
    let catalog = appStorage.getJSON('foodCatalog', []);
    const foodList = document.getElementById('foodList');
    const tipBanner = document.getElementById('tipBanner');

    // Show tips
    if (catalog.length > 0) {
        const tips = [
            { icon: '💡', title: 'Lo sapevi?', text: 'I gatti diabetici hanno bisogno di proteine alte e carboidrati bassi', link: 'Scopri perché', action: 'carbsME' },
            { icon: '⚖️', title: 'Consiglio', text: 'Usa sempre una bilancia da cucina per pesare le porzioni con precisione', link: null, action: null },
            { icon: '💊', title: 'Importante', text: 'Cambi nella dieta possono influenzare il fabbisogno di insulina', link: null, action: null }
        ];

        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        tipBanner.innerHTML = `
                    <div class="tip-banner">
                        <div class="tip-icon">${randomTip.icon}</div>
                        <div class="tip-content">
                            <div class="tip-title">${randomTip.title}</div>
                            <div class="tip-text">
                                ${randomTip.text}
                                ${randomTip.link ? `<a href="#" class="tip-link" onclick="event.preventDefault(); showInfo('${randomTip.action}')">${randomTip.link} →</a>` : ''}
                            </div>
                        </div>
                    </div>
                `;
    } else {
        tipBanner.innerHTML = '';
    }

    if (catalog.length === 0) {
        const hasProfile = catProfile && catProfile.targetKcal;
        foodList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-illustration">📋</div>
                        <div class="empty-title">Catalogo vuoto</div>
                        ${!hasProfile ? `
                            <div class="alert alert-info" style="margin: 25px 0; text-align: left;">
                                <div class="alert-title">👋 Prima volta?</div>
                                1️⃣ Vai su <strong>Profilo</strong> e inserisci i dati<br>
                                2️⃣ Poi vai su <strong>Cibo</strong> per analizzare<br>
                                3️⃣ I cibi salvati appariranno qui!
                            </div>
                        ` : `
                            <div class="empty-text">
                                Analizza un cibo nella tab "Cibo"<br>per iniziare il tuo catalogo
                            </div>
                            <div class="empty-action">
                                <button class="btn btn-primary" onclick="switchTab('food')">
                                    ➕ Aggiungi Primo Cibo
                                </button>
                            </div>
                        `}
                    </div>
                `;
        return;
    }

    const scoreLabels = {
        verde: '✅ OTTIMO',
        giallo: '⚠️ ACCETTABILE',
        rosso: '❌ NON IDEALE',
        grigio: '⚪ DATI INSUFF.'
    };

    foodList.innerHTML = catalog.map((food, index) => {
        const portion = catProfile && catProfile.targetKcal ?
            ((catProfile.targetKcal / food.kcalPer100g) * 100).toFixed(0) : null;

        return `
                    <div class="food-card">
                        <div class="food-card-header">
                            ${food.frontImageId ?
                `<img data-imgid="${food.frontImageId}" class="food-image" alt="${food.name}">` :
                `<div class="food-image">🐱</div>`
            }
                            <div class="food-info">
                                <div class="food-name">${food.name}</div>
                                <div class="food-type">
                                    ${food.type === 'dry' ? '🟤 Secco' : '🟦 Umido'} •
                                    ${food.kcalPer100g.toFixed(0)} kcal/100g
                                </div>
                                <div class="food-score ${food.overallScore}">
                                    ${scoreLabels[food.overallScore]}
                                </div>
                            </div>
                        </div>

                        ${portion ? `
                            <div class="food-portion">
                                <div>
                                    <div style="font-size: 14px; color: var(--gray-600);">Porzione giornaliera</div>
                                    <div class="portion-amount">${portion}g</div>
                                </div>
                                <button class="use-today-btn" onclick="useToday('${food.name}', ${portion})">
                                    Usa oggi
                                </button>
                            </div>
                        ` : ''}

                        <details>
                            <summary>📊 Dettagli</summary>
                            <div class="details-content">
                                <div class="metric-row">
                                    <span>Carboidrati</span>
                                    <strong>${food.carbsME.toFixed(1)}% ME • ${food.carbsPer100kcal.toFixed(1)}g/100kcal</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Proteine</span>
                                    <strong>${food.proteinME.toFixed(1)}% ME • ${food.proteinPer100kcal.toFixed(1)}g/100kcal</strong>
                                </div>
                            </div>
                        </details>

                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button class="delete-btn" onclick="deleteFood(${index})" style="flex: 1;">
                                🗑️ Elimina
                            </button>
                            <button class="delete-btn" onclick="openShare(${index})" style="flex: 1; background: var(--primary);">
                                📤 Condividi
                            </button>
                        </div>
                    </div>
                `;
    }).join('');

    // Hydrate images from IndexedDB
    hydrateCatalogImages();
}

async function hydrateCatalogImages() {
    try { await imagesDB.init(); } catch (e) { return; }
    const imgs = document.querySelectorAll('[data-imgid]');
    for (const img of imgs) {
        const id = img.dataset.imgid;
        const url = await imagesDB.getObjectUrl(id);
        if (url) img.src = url;
    }
}

function useToday(name, grams) {
    alert(`📋 ${name}\n\n🍽️ Dai ${grams}g oggi\n\nDividi in 2-3 pasti durante la giornata.`);
}

async function deleteFood(index) {
    if (!confirm('Eliminare questo cibo dal catalogo?')) return;

    let catalog = appStorage.getJSON('foodCatalog', []);
    const removed = catalog[index];

    catalog.splice(index, 1);
    if (!appStorage.setJSON('foodCatalog', catalog)) return;

    // Remove associated images from IndexedDB (best-effort)
    try {
        await imagesDB.init();
        if (removed && removed.frontImageId) await imagesDB.delete(removed.frontImageId);
        if (removed && removed.labelImageId) await imagesDB.delete(removed.labelImageId);
    } catch (e) {
        console.warn('Failed to delete images from IndexedDB:', e);
    }

    loadCatalog();
}

async function cleanupOrphanImages() {
    try {
        await imagesDB.init();
        const catalog = appStorage.getJSON('foodCatalog', []);
        const used = new Set();
        for (const item of catalog) {
            if (item && item.frontImageId) used.add(item.frontImageId);
            if (item && item.labelImageId) used.add(item.labelImageId);
        }
        const all = await imagesDB.listIds();
        const orphans = all.filter(id => !used.has(id));
        if (orphans.length === 0) {
            alert('✅ Nessuna immagine inutile trovata.');
            return;
        }
        const ok = confirm(`Trovate ${orphans.length} immagini non più usate. Vuoi eliminarle per liberare spazio?`);
        if (!ok) return;
        await imagesDB.deleteMany(orphans);
        alert(`🧹 Pulizia completata: eliminate ${orphans.length} immagini.`);
    } catch (e) {
        console.warn('cleanupOrphanImages failed:', e);
        alert('❌ Impossibile completare la pulizia (errore IndexedDB).');
    }
}

async function migrateCompressImages() {
    if (appStorage.get('imagesCompressed')) return;
    try {
        await imagesDB.init();
        const catalog = appStorage.getJSON('foodCatalog', []);
        for (const item of catalog) {
            if (item && item.frontImageId) await imagesDB.compressBlob(item.frontImageId, 800, 0.80);
            if (item && item.labelImageId) await imagesDB.compressBlob(item.labelImageId, 1500, 0.90);
        }
    } catch (e) {
        console.warn('migrateCompressImages failed:', e);
    }
    appStorage.set('imagesCompressed', '1');
}

// ============= SHARE =============
async function openShare(index) {
    let catalog = appStorage.getJSON('foodCatalog', []);
    // Migrate legacy base64 images from localStorage to IndexedDB (one-time)
    try {
        await imagesDB.init();
        const mig = await imagesDB.migrateCatalogImages(catalog);
        if (mig && mig.changed) {
            catalog = mig.catalog;
            appStorage.setJSON('foodCatalog', catalog);
        }
    } catch (e) {
        console.warn('IndexedDB migration failed:', e);
    }
    const food = catalog[index];

    const scoreText = {
        verde: '✅ OTTIMO per diabetici',
        giallo: '⚠️ ACCETTABILE',
        rosso: '❌ NON IDEALE per diabetici',
        grigio: '⚪ DATI INSUFFICIENTI'
    };

    const portion = catProfile && catProfile.targetKcal ?
        `\nPorzione: ${((catProfile.targetKcal / food.kcalPer100g) * 100).toFixed(0)}g/giorno` : '';

    shareData = `${food.name}\n${scoreText[food.overallScore]}${portion}\n\nCarboidrati: ${food.carbsPer100kcal.toFixed(1)}g/100kcal\nProteine: ${food.proteinPer100kcal.toFixed(1)}g/100kcal`;

    document.getElementById('shareSheet').classList.add('show');
}

function closeShare() {
    document.getElementById('shareSheet').classList.remove('show');
}

function shareVia(method) {
    if (!shareData) return;

    if (method === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareData)}`);
    } else if (method === 'email') {
        window.location.href = `mailto:?subject=Analisi Cibo Gatto&body=${encodeURIComponent(shareData)}`;
    } else if (method === 'copy') {
        navigator.clipboard.writeText(shareData).then(() => {
            alert('✅ Copiato negli appunti!');
        });
    }

    closeShare();
}
