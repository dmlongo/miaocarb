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
    // Aggressive pre-processing to handle line breaks and formatting
    let cleanText = text.toLowerCase();

    // Remove all hyphens followed by whitespace/newlines (line breaks)
    cleanText = cleanText.replace(/-[\s\n\r]+/g, '');

    // Remove standalone hyphens
    cleanText = cleanText.replace(/\s+-\s+/g, ' ');

    // Normalize all whitespace to single spaces
    cleanText = cleanText.replace(/[\n\r\t]+/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ');

    console.log('=== OCR PARSING ===');
    console.log('Original text:', text);
    console.log('Cleaned text:', cleanText);

    // Improved patterns with multiple variations including formal Italian terms
    const patterns = {
        protein: [
            /protein[ae]?\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /prot[.,\s]*(\d+[.,]?\d*)\s*%/i
        ],
        fat: [
            /grass[io]\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /fat\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /lipid[ie]?\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /materia\s+grassa\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /tenore.*?grassa\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            // More flexible: any "grassa" followed by number
            /grassa\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i
        ],
        fiber: [
            /fibr[ae]\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /fiber\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /grezze\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i
        ],
        moisture: [
            /umidit[aà]\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /moisture\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /acqua\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i
        ],
        ash: [
            /cener[ie]\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /ash\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /inorganica\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /materia\s+inorganica\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            // More flexible: "inorg" with OCR errors (0 instead of o, 1 instead of i)
            /in[o0]rg[a@]nic[a@]\s*[:\-]?\s*(\d+[.,]?\d*)\s*%?/i,
            /mat.*?in[o0]rg.*?\s*(\d+[.,]?\d*)\s*%?/i,
            // Ultra flexible: just look for numbers near "inorg"
            /in.{0,3}rg.{0,10}\s*(\d+[.,]?\d*)\s*%?/i
        ],
        kcal: [
            /(\d+)\s*kcal/i,
            /energia.*?(\d+)\s*kcal/i
        ]
    };

    let foundValues = {};
    let foundCount = 0;

    // Try each pattern for each nutrient
    for (const [key, patternList] of Object.entries(patterns)) {
        for (const pattern of patternList) {
            const match = cleanText.match(pattern);
            if (match) {
                // Get the last captured group (the number)
                let value = match[match.length - 1];

                console.log(`Pattern matched for ${key}: "${match[0]}" -> value: "${value}"`);

                // Handle OCR errors: O→0, l→1, S→5, I→1
                value = value.replace(/o/gi, '0').replace(/[li]/gi, '1').replace(/s/gi, '5');

                // Convert comma to dot (Italian decimal separator)
                value = value.replace(',', '.');

                // Remove any remaining non-numeric characters except dot
                value = value.replace(/[^\d.]/g, '');

                const numValue = parseFloat(value);

                console.log(`Parsed number for ${key}: ${numValue}`);

                if (key === 'kcal') {
                    if (numValue > 50 && numValue < 600 && !foundValues[key]) {
                        foundValues[key] = numValue;
                        foundCount++;
                        console.log(`✓ Found ${key}: ${numValue}`);
                        break;
                    }
                } else {
                    if (numValue > 0 && numValue < 100 && !foundValues[key]) {
                        foundValues[key] = numValue;
                        foundCount++;
                        console.log(`✓ Found ${key}: ${numValue}`);
                        break;
                    }
                }
            }
        }
        if (!foundValues[key]) {
            console.log(`✗ NOT found: ${key}`);
        }
    }

    console.log('=== FINAL RESULTS ===');
    console.log('Found values:', foundValues);
    console.log('Total found:', foundCount);

    // Apply found values to form
    if (foundValues.protein) document.getElementById('protein').value = foundValues.protein;
    if (foundValues.fat) document.getElementById('fat').value = foundValues.fat;
    if (foundValues.fiber) document.getElementById('fiber').value = foundValues.fiber;
    if (foundValues.moisture) document.getElementById('moisture').value = foundValues.moisture;
    if (foundValues.ash) document.getElementById('ash').value = foundValues.ash;
    if (foundValues.kcal) document.getElementById('kcalPer100g').value = foundValues.kcal;

    if (foundCount > 0) {
        // Highlight filled fields
        if (foundValues.protein) highlightField('protein');
        if (foundValues.fat) highlightField('fat');
        if (foundValues.fiber) highlightField('fiber');
        if (foundValues.moisture) highlightField('moisture');
        if (foundValues.ash) highlightField('ash');
        if (foundValues.kcal) highlightField('kcalPer100g');

        // Show success message
        const missingFields = [];
        if (!foundValues.protein) missingFields.push('Proteine');
        if (!foundValues.fat) missingFields.push('Grassi');
        if (!foundValues.fiber) missingFields.push('Fibre');
        if (!foundValues.moisture) missingFields.push('Umidità');

        let message = `✅ Trovati ${foundCount} valori!\n\nVerifica che siano corretti.`;

        if (missingFields.length > 0) {
            message += `\n\n⚠️ Mancano:\n${missingFields.join(', ')}`;
            message += `\n\nInseriscili manualmente.`;
        }

        alert(message);
    } else {
        alert('⚠️ Nessun valore rilevato.\n\nProva a:\n• Ritagliare meglio la tabella\n• Scattare con più luce\n• Aprire la Console (F12) per vedere i dettagli\n• Inserire i valori manualmente');
    }
}
