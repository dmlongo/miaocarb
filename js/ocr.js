// ============= PHOTO HANDLING =============
function handleFrontPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
        frontImage = await compressImage(event.target.result, 800, 0.80);
        const preview = document.getElementById('frontPreview');
        preview.src = frontImage;
        preview.style.display = 'block';
        preview.onclick = () => toggleZoom(preview);
        document.getElementById('photoBox').classList.add('has-image');
        document.getElementById('frontCropControls').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function confirmFrontPhoto() {
    document.getElementById('frontCropControls').style.display = 'none';
}

function retakeFrontPhoto() {
    frontImage = null;
    const preview = document.getElementById('frontPreview');
    preview.style.display = 'none';
    preview.onclick = null;
    document.getElementById('frontCropControls').style.display = 'none';
    document.getElementById('photoBox').classList.remove('has-image');
    document.getElementById('frontCameraInput').value = '';
    document.getElementById('frontGalleryInput').value = '';
}

async function handleLabelPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
        originalLabelImage = await compressImage(event.target.result, 1500, 0.90);
        labelImage = originalLabelImage;

        // Show preview
        const preview = document.getElementById('labelPreview');
        preview.src = labelImage;
        preview.style.display = 'block';
        preview.onclick = () => toggleZoom(preview);

        // Show crop controls
        document.getElementById('labelCropControls').style.display = 'block';

        // Setup canvas for cropping
        setupCropCanvas();
    };
    reader.readAsDataURL(file);
}

function setupCropCanvas() {
    cropStage = document.getElementById('cropStage');
    cropBaseCanvas = document.getElementById('cropBaseCanvas');
    cropOverlayCanvas = document.getElementById('cropOverlayCanvas');

    if (!cropStage || !cropBaseCanvas || !cropOverlayCanvas) {
        console.error('Crop stage elements not found. Did you update index.html?');
        return;
    }

    cropBaseCtx = cropBaseCanvas.getContext('2d');
    cropOverlayCtx = cropOverlayCanvas.getContext('2d');

    const img = new Image();

    img.onload = function () {
        // cache image for cropping (used later by applyCrop)
        cropImage = img;

        // Set both canvases to the *real* image size
        cropBaseCanvas.width = img.width;
        cropBaseCanvas.height = img.height;
        cropOverlayCanvas.width = img.width;
        cropOverlayCanvas.height = img.height;

        // Draw image ONCE on base canvas
        cropBaseCtx.clearRect(0, 0, cropBaseCanvas.width, cropBaseCanvas.height);
        cropBaseCtx.drawImage(img, 0, 0);

        // Clear overlay
        cropOverlayCtx.clearRect(0, 0, cropOverlayCanvas.width, cropOverlayCanvas.height);

        // Show stage and scale to fit screen
        const maxWidth = Math.min(500, window.innerWidth - 60);
        cropStage.style.maxWidth = maxWidth + 'px';
        cropStage.style.display = 'block';

        // Attach listeners once (important: avoids duplicates if you retake photos)
        if (!cropListenersAdded) {
            cropOverlayCanvas.addEventListener('pointerdown', startCrop, { passive: false });
            cropOverlayCanvas.addEventListener('pointermove', drawCrop, { passive: false });
            cropOverlayCanvas.addEventListener('pointerup', endCrop);
            cropOverlayCanvas.addEventListener('pointercancel', endCrop);
            cropListenersAdded = true;
        }
    };

    img.src = originalLabelImage;
}

function startCrop(e) {
    e.preventDefault && e.preventDefault();

    const canvas = cropOverlayCanvas || document.getElementById('cropOverlayCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    cropStartX = (e.clientX - rect.left) * scaleX;
    cropStartY = (e.clientY - rect.top) * scaleY;

    cropEndX = cropStartX;
    cropEndY = cropStartY;

    isCropping = true;

    try {
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        activePointerId = e.pointerId;
    } catch {
        activePointerId = null;
    }
}

function drawCrop(e) {
    if (!isCropping || !cropImage) return;

    const canvas = cropOverlayCanvas || document.getElementById('cropOverlayCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    cropEndX = (e.clientX - rect.left) * scaleX;
    cropEndY = (e.clientY - rect.top) * scaleY;

    if (cropRafPending) return;
    cropRafPending = true;
    requestAnimationFrame(renderCropOverlay);
}

function renderCropOverlay() {
    cropRafPending = false;

    const canvas = cropOverlayCanvas || document.getElementById('cropOverlayCanvas');
    const ctx = cropOverlayCtx || (canvas && canvas.getContext('2d'));
    if (!canvas || !ctx) return;

    // Clear ONLY the overlay (base image remains untouched)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rectangle coords
    const minX = Math.min(cropStartX, cropEndX);
    const minY = Math.min(cropStartY, cropEndY);
    const maxX = Math.max(cropStartX, cropEndX);
    const maxY = Math.max(cropStartY, cropEndY);

    // Outline
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);

    // Shade outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, minY);                          // top
    ctx.fillRect(0, minY, minX, maxY - minY);                        // left
    ctx.fillRect(maxX, minY, canvas.width - maxX, maxY - minY);      // right
    ctx.fillRect(0, maxY, canvas.width, canvas.height - maxY);       // bottom
}

function endCrop(e) {
    // Update final coordinates if provided
    if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
        try {
            const canvas = cropOverlayCanvas || document.getElementById('cropOverlayCanvas');
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            cropEndX = (e.clientX - rect.left) * scaleX;
            cropEndY = (e.clientY - rect.top) * scaleY;
        } catch {
            // ignore
        }
    }

    isCropping = false;

    // Release pointer capture if set
    try {
        const canvas = cropOverlayCanvas || document.getElementById('cropOverlayCanvas');
        if (activePointerId != null) {
            canvas.releasePointerCapture && canvas.releasePointerCapture(activePointerId);
            activePointerId = null;
        }
    } catch {
        activePointerId = null;
    }
}

function hideCropStageAndClear() {
    if (cropOverlayCtx && cropOverlayCanvas) {
        cropOverlayCtx.clearRect(0, 0, cropOverlayCanvas.width, cropOverlayCanvas.height);
    }
    if (cropStage) cropStage.style.display = 'none';
    // optional: release big image memory once we move to OCR
    cropImage = null;
}

function applyCrop() {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Safety
    if (!cropImage) {
        console.log("No cropImage available, using original image");
        labelImage = originalLabelImage;
        document.getElementById("labelCropControls").style.display = "none";
        hideCropStageAndClear();
        extractTextFromImage(labelImage);
        return;
    }

    const imgW = cropImage.width;
    const imgH = cropImage.height;

    // Order coords (handles drag in any direction)
    let x1 = Math.min(cropStartX, cropEndX);
    let y1 = Math.min(cropStartY, cropEndY);
    let x2 = Math.max(cropStartX, cropEndX);
    let y2 = Math.max(cropStartY, cropEndY);

    // Clamp to image bounds (prevents negative / out-of-range cropping)
    x1 = Math.max(0, Math.min(imgW, x1));
    y1 = Math.max(0, Math.min(imgH, y1));
    x2 = Math.max(0, Math.min(imgW, x2));
    y2 = Math.max(0, Math.min(imgH, y2));

    // Convert to integer pixels
    const cropX = Math.round(x1);
    const cropY = Math.round(y1);
    const cropWidth = Math.round(x2 - x1);
    const cropHeight = Math.round(y2 - y1);

    console.log("Applying crop:", cropX, cropY, cropWidth, cropHeight);

    if (cropWidth > 10 && cropHeight > 10) {
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;

        tempCtx.drawImage(
            cropImage,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );

        // PNG is usually better for OCR (less blur than JPEG)
        labelImage = tempCanvas.toDataURL("image/png");

        // Update preview
        document.getElementById("labelPreview").src = labelImage;

        console.log("Crop applied successfully");
    } else {
        console.log("Crop area too small, using original image");
        // IMPORTANT: explicit fallback so OCR doesn't use stale/undefined labelImage
        labelImage = originalLabelImage;
        document.getElementById("labelPreview").src = labelImage;
    }

    // Start OCR
    document.getElementById("labelCropControls").style.display = "none";
    hideCropStageAndClear();
    extractTextFromImage(labelImage);
}

function skipCrop() {
    labelImage = originalLabelImage;
    document.getElementById('labelCropControls').style.display = 'none';
    hideCropStageAndClear();
    extractTextFromImage(labelImage);
}

function retakeLabelPhoto() {
    labelImage = null;
    originalLabelImage = null;
    const preview = document.getElementById('labelPreview');
    preview.style.display = 'none';
    preview.onclick = null;
    hideCropStageAndClear();
    document.getElementById('labelCropControls').style.display = 'none';
    document.getElementById('labelCameraInput').value = '';
    document.getElementById('labelGalleryInput').value = '';
}

function showOCR() {
    document.getElementById('ocrSection').style.display = 'block';
    document.getElementById('ocrTipBanner').style.display = 'none';
}

// ============= OCR =============
function ensureTesseract() {
    if (tesseractLoaded || typeof Tesseract !== 'undefined') {
        tesseractLoaded = true;
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = () => { tesseractLoaded = true; resolve(); };
        s.onerror = () => reject(new Error('Impossibile caricare il motore OCR'));
        document.head.appendChild(s);
    });
}

async function extractTextFromImage(imageData) {
    const loading = document.getElementById('loadingOCR');
    loading.classList.add('show');

    try {
        // Preprocess image for better OCR
        const preprocessedImage = await preprocessImage(imageData);

        // Load Tesseract.js on demand (not loaded at page start)
        await ensureTesseract();

        // Run OCR with multiple languages
        const result = await Tesseract.recognize(preprocessedImage, 'eng+ita', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const percent = Math.round(m.progress * 100);
                    document.querySelector('.loading-text').textContent = `Lettura in corso... ${percent}%`;
                }
            }
        });

        const text = result.data.text;
        console.log('OCR Text:', text);
        parseNutritionValues(text);

    } catch (error) {
        console.error('Errore OCR:', error);
        alert('⚠️ Non riesco a leggere l\'etichetta.\n\nProva a:\n• Ritagliare solo la tabella nutrizionale\n• Scattare con più luce\n• Tenere il telefono dritto\n\nOppure inserisci i valori manualmente.');
    } finally {
        loading.classList.remove('show');
    }
}

async function preprocessImage(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convert to grayscale and increase contrast
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

                // Increase contrast
                const contrast = 1.5;
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                const newGray = factor * (gray - 128) + 128;

                // Clamp values
                const finalGray = Math.max(0, Math.min(255, newGray));

                data[i] = data[i + 1] = data[i + 2] = finalGray;
            }

            // Put processed image back
            ctx.putImageData(imageData, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = imageData;
    });
}

function parseNutritionValues(text) {
    // ---------- PRE-PROCESSING ----------
    let cleanText = (text || "").toLowerCase();

    // Normalize apostrophes (tenore d’acqua -> d'acqua)
    cleanText = cleanText.replace(/[’‘`]/g, "'");

    // Remove all hyphens followed by whitespace/newlines (line breaks)
    cleanText = cleanText.replace(/-[\s\n\r]+/g, "");
    // Remove standalone hyphens
    cleanText = cleanText.replace(/\s+-\s+/g, " ");

    // Normalize all whitespace to single spaces
    cleanText = cleanText.replace(/[\n\r\t]+/g, " ");
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    console.log("=== OCR PARSING ===");
    console.log("Original text:", text);
    console.log("Cleaned text:", cleanText);

    // ---------- HELPERS ----------
    const fixOcrNumber = (valueStr) => {
        // Handle OCR errors: O→0, l→1, S→5, I→1
        let v = valueStr
            .replace(/o/gi, "0")
            .replace(/[li]/gi, "1")
            .replace(/s/gi, "5");

        // Convert comma to dot
        v = v.replace(",", ".");

        // Keep only digits + dot
        v = v.replace(/[^\d.]/g, "");

        return v;
    };

    const parseNumber = (valueStr) => {
        const fixed = fixOcrNumber(valueStr);
        const n = parseFloat(fixed);
        return Number.isFinite(n) ? n : null;
    };

    // Try to isolate an "analysis" section to reduce false positives (optional)
    const getLikelyAnalysisSection = (t) => {
        const anchors = [
            "componenti analitici",
            "costituenti analitici",
            "analytical constituents",
            "guaranteed analysis",
            "typical analysis",
            "analysis:"
        ];
        const stopWords = [
            "additivi",
            "additives",
            "composizione",
            "composition",
            "ingredienti",
            "ingredients",
            "istruzioni",
            "feeding",
            "ration"
        ];

        let start = -1;
        for (const a of anchors) {
            const i = t.indexOf(a);
            if (i !== -1 && (start === -1 || i < start)) start = i;
        }
        if (start === -1) return t;

        let end = t.length;
        for (const s of stopWords) {
            const j = t.indexOf(s, start + 1);
            if (j !== -1 && j < end) end = j;
        }
        return t.slice(start, end);
    };

    const analysisText = getLikelyAnalysisSection(cleanText);

    // Common number pattern (percent-ish nutrients)
    // (capture group MUST be last for your existing logic)
    const num = "(\\d+(?:[.,]\\d+)?)";
    // Allow optional (min/max) markers between label and value
    const minmax = "(?:\\s*\\(?\\s*(?:min(?:imum)?|max(?:imum)?)\\s*\\)?\\s*)?";
    // Allow optional "crude"/"grezzo" descriptor
    const crudeIt = "(?:\\s*(?:grezz[aeio]|grezzo|grezza|grezze|grezzi))?";
    const crudeEn = "(?:\\s*(?:crude))?";

    // ---------- PATTERNS ----------
    const patterns = {
        protein: [
            // IT + EN + CP
            new RegExp(
                `(?:\\bcp\\b|crude\\s*protein|protein(?:e)?|proteine?|proteina)${crudeIt}${crudeEn}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // Short "prot. 30%" variants
            new RegExp(`\\bprot\\.?\\s*[:\\-]?\\s*${num}\\s*%?`, "i")
        ],

        fat: [
            // IT: grassi/grasso (+ grezzo) + numero
            new RegExp(
                `(?:grassi?|grasso)${crudeIt}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // IT: oli e grassi
            new RegExp(
                `(?:oli\\s*(?:e|&)\\s*grassi?)${crudeIt}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // EN: oils and fats / crude oils and fats
            new RegExp(
                `(?:crude\\s*)?oils?\\s*(?:and|&)\\s*fats?${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // EN: crude fat / fat
            new RegExp(
                `(?:crude\\s*fat|\\bfat\\b)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // Lipidi/lipids
            new RegExp(
                `(?:lipid[ie]?|lipids?)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // Your existing “materia grassa / tenore … grassa”
            new RegExp(`materia\\s+grassa${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i"),
            new RegExp(`tenore.*?grassa${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i")
        ],

        fiber: [
            // IT: fibra/fibre + grezza/e
            new RegExp(
                `(?:fibra|fibre)${crudeIt}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // EN: crude fiber/fibre(s)
            new RegExp(
                `(?:crude\\s*fib(?:er|re)s?|fib(?:er|re)s?)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // Abbrev CF (avoid false positives by requiring %)
            new RegExp(`\\bcf\\b${minmax}\\s*[:\\-]?\\s*${num}\\s*%`, "i"),
            // Your old "grezze: x" fallback for tables
            new RegExp(`\\bgrezz[aei]\\s*[:\\-]?\\s*${num}\\s*%?`, "i")
        ],

        ash: [
            // IT: ceneri/cenere + grezze/a
            new RegExp(
                `(?:ceneri|cenere)${crudeIt}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // EN: crude ash / ash
            new RegExp(
                `(?:crude\\s*ash|\\bash\\b)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // IT/EN inorganic matter variants (keeping your robust ones)
            new RegExp(`(?:materia\\s+inorganica|inorganic\\s*matter)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i"),
            new RegExp(`in[o0]rg[a@]nic[a@]${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i"),
            new RegExp(`mat.*?in[o0]rg.*?${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i"),
            new RegExp(`in.{0,3}rg.{0,10}${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`, "i")
        ],

        moisture: [
            // IT: umidità/umidita
            new RegExp(
                `(?:umidit[aà]|umidita)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // IT: acqua / tenore d'acqua
            new RegExp(
                `(?:tenore\\s*(?:d'|di)?\\s*acqua|acqua)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            ),
            // EN: moisture / water
            new RegExp(
                `(?:moisture|\\bwater\\b)${minmax}\\s*[:\\-]?\\s*${num}\\s*%?`,
                "i"
            )
        ]
    };

    // Energy is special: can be kcal/kg, kcal/100g, kJ, ME...
    const parseEnergyToKcalPer100g = (t) => {
        // match: number + unit + optional /basis (kg|100g) + optional ME markers around
        // capture groups order: value, unit, basis (optional)
        const re = /(?:energia|energy|valore\s+energetico|caloric\s+content|metabolizzabile|metabolizable\s+energy|me)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(kcal|kj)\s*(?:\/\s*(kg|100\s*g|100g)|\s+per\s+(kg|100\s*g|100g))?/i;

        // Also accept "xxxx kcal/kg me"
        const re2 = /(\d+(?:[.,]\d+)?)\s*(kcal|kj)\s*\/\s*(kg|100\s*g|100g)/i;

        const candidates = [];
        for (const r of [re, re2]) {
            let m;
            // global scan with exec-like loop
            const rg = new RegExp(r.source, r.flags.includes("g") ? r.flags : r.flags + "g");
            while ((m = rg.exec(t)) !== null) {
                const rawVal = parseNumber(m[1]);
                if (rawVal == null) continue;

                const unit = (m[2] || "").toLowerCase(); // kcal | kj
                const basis = (m[3] || m[4] || "").toLowerCase().replace(/\s+/g, ""); // kg|100g
                candidates.push({ rawVal, unit, basis, match: m[0] });
            }
        }

        if (!candidates.length) return null;

        // Score candidates: prefer explicit /100g, then /kg, then plausible ranges
        const score = (c) => {
            let s = 0;
            if (c.basis === "100g") s += 50;
            if (c.basis === "kg") s += 40;
            if (c.unit === "kcal") s += 10;
            // Typical ranges:
            // - per 100g (dry): ~250-500 kcal/100g
            // - per kg: ~2500-5000 kcal/kg
            if (!c.basis) {
                if (c.rawVal >= 50 && c.rawVal <= 700) s += 15;      // likely per 100g
                if (c.rawVal >= 1500 && c.rawVal <= 6000) s += 12;   // likely per kg
            }
            return s;
        };

        candidates.sort((a, b) => score(b) - score(a));
        const best = candidates[0];

        console.log(`Energy candidate: "${best.match}" -> raw=${best.rawVal} ${best.unit}/${best.basis || "?"}`);

        // Convert to kcal
        let kcal = best.rawVal;
        if (best.unit === "kj") {
            // 1 kcal = 4.184 kJ
            kcal = kcal / 4.184;
        }

        // Convert basis to per 100g
        if (best.basis === "kg") {
            kcal = kcal / 10; // kcal/kg -> kcal/100g
        } else if (best.basis === "100g") {
            // ok
        } else {
            // Heuristic if no basis:
            // if big number, assume per kg; else assume per 100g
            if (kcal > 700) kcal = kcal / 10;
        }

        // sanity check
        if (kcal < 10 || kcal > 800) return null;

        // Round to 1 decimal for nicer UI
        return Math.round(kcal * 10) / 10;
    };

    // ---------- PARSE ----------
    let foundValues = {};
    let foundCount = 0;

    const tryParseKey = (key, textToUse, patternList, validatorFn) => {
        for (const pattern of patternList) {
            const match = textToUse.match(pattern);
            if (match) {
                const valueStr = match[match.length - 1];
                console.log(`Pattern matched for ${key}: "${match[0]}" -> value: "${valueStr}"`);

                const numValue = parseNumber(valueStr);
                console.log(`Parsed number for ${key}:`, numValue);

                if (numValue != null && validatorFn(numValue) && !foundValues[key]) {
                    foundValues[key] = numValue;
                    foundCount++;
                    console.log(`✓ Found ${key}: ${numValue}`);
                    return true;
                }
            }
        }
        console.log(`✗ NOT found: ${key}`);
        return false;
    };

    // Parse standard nutrients mainly from analysis section (more reliable)
    tryParseKey("protein", analysisText, patterns.protein, (v) => v > 0 && v < 100);
    tryParseKey("fat", analysisText, patterns.fat, (v) => v > 0 && v < 100);
    tryParseKey("fiber", analysisText, patterns.fiber, (v) => v >= 0 && v < 100);
    tryParseKey("ash", analysisText, patterns.ash, (v) => v >= 0 && v < 100);
    tryParseKey("moisture", analysisText, patterns.moisture, (v) => v >= 0 && v < 100);

    // Energy: scan full text (can appear outside the analysis table)
    const kcalPer100g = parseEnergyToKcalPer100g(cleanText);
    if (kcalPer100g != null) {
        foundValues.kcal = kcalPer100g;
        foundCount++;
        console.log(`✓ Found kcal (per 100g): ${kcalPer100g}`);
    } else {
        console.log("✗ NOT found: kcal");
    }

    console.log("=== FINAL RESULTS ===");
    console.log("Found values:", foundValues);
    console.log("Total found:", foundCount);

    // ---------- APPLY TO FORM ----------
    if (foundValues.protein != null) document.getElementById("protein").value = foundValues.protein;
    if (foundValues.fat != null) document.getElementById("fat").value = foundValues.fat;
    if (foundValues.fiber != null) document.getElementById("fiber").value = foundValues.fiber;
    if (foundValues.moisture != null) document.getElementById("moisture").value = foundValues.moisture;
    if (foundValues.ash != null) document.getElementById("ash").value = foundValues.ash;
    if (foundValues.kcal != null) document.getElementById("kcalPer100g").value = foundValues.kcal;

    // ---------- UI FEEDBACK ----------
    if (foundCount > 0) {
        if (foundValues.protein != null) highlightField("protein");
        if (foundValues.fat != null) highlightField("fat");
        if (foundValues.fiber != null) highlightField("fiber");
        if (foundValues.moisture != null) highlightField("moisture");
        if (foundValues.ash != null) highlightField("ash");
        if (foundValues.kcal != null) highlightField("kcalPer100g");

        const missingFields = [];
        if (foundValues.protein == null) missingFields.push("Proteine");
        if (foundValues.fat == null) missingFields.push("Grassi");
        if (foundValues.fiber == null) missingFields.push("Fibre");
        if (foundValues.ash == null) missingFields.push("Ceneri");
        if (foundValues.moisture == null) missingFields.push("Umidità");
        if (foundValues.kcal == null) missingFields.push("Energia (kcal/100g)");

        let message = `✅ Trovati ${foundCount} valori!\n\nVerifica che siano corretti.`;

        if (missingFields.length > 0) {
            message += `\n\n⚠️ Mancano:\n${missingFields.join(", ")}`;
            message += `\n\nInseriscili manualmente.`;
        }

        alert(message);
    } else {
        alert(
            "⚠️ Nessun valore rilevato.\n\nProva a:\n• Ritagliare meglio la tabella\n• Scattare con più luce\n• Aprire la Console (F12) per vedere i dettagli\n• Inserire i valori manualmente"
        );
    }
}
