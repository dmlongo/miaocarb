// ============= STATE =============
let frontImage = null;
let labelImage = null;
let currentAnalysis = null;
let catProfile = null;
let currentWizardStep = 1;
let shareData = null;
let cropImage = null;
let cropStartX = 0;
let cropStartY = 0;
let cropEndX = 0;
let cropEndY = 0;
let isCropping = false;
let originalLabelImage = null;
let activePointerId = null;

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
    loadCatalog();
    checkOnboarding();
    loadSettings();
    initializeEventListeners();
});

function initializeEventListeners() {
    // Photo handlers - both camera and gallery
    document.getElementById('frontCameraInput').addEventListener('change', handleFrontPhoto);
    document.getElementById('frontGalleryInput').addEventListener('change', handleFrontPhoto);
    document.getElementById('labelCameraInput').addEventListener('change', handleLabelPhoto);
    document.getElementById('labelGalleryInput').addEventListener('change', handleLabelPhoto);

    // Insulin warning
    document.getElementById('onInsulin').addEventListener('change', function () {
        document.getElementById('insulinWarning').classList.toggle('hidden', !this.checked);
    });

    // Click outside modal to close
    document.getElementById('infoModal').addEventListener('click', function (e) {
        if (e.target === this) closeInfo();
    });

    // Click outside share sheet to close
    document.getElementById('shareSheet').addEventListener('click', function (e) {
        if (e.target === this) closeShare();
    });
}

// ============= ONBOARDING =============
function checkOnboarding() {
    const hasSeenOnboarding = appStorage.get('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
        document.getElementById('onboarding').classList.add('show');
    }
}

function nextOnboarding(screen) {
    document.getElementById('onboarding').classList.remove('show');
    if (screen === 2) {
        document.getElementById('onboarding2').classList.add('show');
    } else if (screen === 3) {
        document.getElementById('onboarding2').classList.remove('show');
        document.getElementById('onboarding3').classList.add('show');
    }
}

function skipOnboarding() {
    document.getElementById('onboarding').classList.remove('show');
    document.getElementById('onboarding2').classList.remove('show');
    document.getElementById('onboarding3').classList.remove('show');
    appStorage.set('hasSeenOnboarding', 'true');
}

function completeOnboarding() {
    document.getElementById('onboarding3').classList.remove('show');
    appStorage.set('hasSeenOnboarding', 'true');
    // Navigate to profile
    switchTab('profile');
}

// ============= TAB SWITCHING =============
function switchTab(tabName, tabEl) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // If called from click, we get the element; otherwise find it by data or onclick
    if (tabEl && tabEl.classList) {
        tabEl.classList.add('active');
    } else {
        // Try find matching tab button
        const btn = document.querySelector(`.tab[onclick*="switchTab('${tabName}'"]`) ||
            document.querySelector(`.tab[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');
    }

    const panel = document.getElementById(tabName);
    if (panel) panel.classList.add('active');

    // Tab-specific refresh
    if (tabName === 'catalog') {
        loadCatalog();
    } else if (tabName === 'food') {
        resetWizard();
    } else if (tabName === 'profile') {
        loadProfile();
    }
}

// ============= WIZARD NAVIGATION =============
function goToStep(step) {
    // Validation
    if (step === 2 && currentWizardStep === 1) {
        const name = document.getElementById('foodName').value.trim();
        if (!name) {
            document.getElementById('foodName').classList.add('error');
            document.getElementById('nameError').classList.add('show');
            setTimeout(() => {
                document.getElementById('foodName').classList.remove('error');
                document.getElementById('nameError').classList.remove('show');
            }, 3000);
            return;
        }
    }

    // Hide all steps
    document.querySelectorAll('.wizard').forEach(w => w.classList.remove('active'));

    // Show target step
    document.getElementById('foodStep' + step).classList.add('active');
    currentWizardStep = step;

    // Show OCR tip on step 2
    if (step === 2) {
        document.getElementById('ocrTipBanner').style.display = 'flex';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetWizard() {
    currentWizardStep = 1;
    document.querySelectorAll('.wizard').forEach(w => w.classList.remove('active'));
    document.getElementById('foodStep1').classList.add('active');

    // Clear form
    document.getElementById('foodName').value = '';
    document.getElementById('foodType').value = 'wet';
    document.getElementById('protein').value = '';
    document.getElementById('fat').value = '';
    document.getElementById('fiber').value = '';
    document.getElementById('moisture').value = '';
    document.getElementById('ash').value = '';
    document.getElementById('kcalPer100g').value = '';

    frontImage = null;
    labelImage = null;
    document.getElementById('frontPreview').style.display = 'none';
    document.getElementById('labelPreview').style.display = 'none';
    document.getElementById('photoBox').classList.remove('has-image');
    document.getElementById('ocrSection').style.display = 'none';
    document.getElementById('ocrTipBanner').style.display = 'none';
}

function toggleAdvanced() {
    const content = document.getElementById('advancedContent');
    const arrow = document.getElementById('advancedArrow');
    content.classList.toggle('show');
    arrow.textContent = content.classList.contains('show') ? '▼' : '▶';
}

function toggleProfileAdvanced() {
    const content = document.getElementById('profileAdvancedContent');
    const arrow = document.getElementById('profileAdvancedArrow');
    content.classList.toggle('show');
    arrow.textContent = content.classList.contains('show') ? '▼' : '▶';
}

// ============= PHOTO HANDLING =============
function handleFrontPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        frontImage = event.target.result;
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
        originalLabelImage = event.target.result;
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

function toggleZoom(img) {
    const overlay = document.getElementById('zoomOverlay');
    img.classList.toggle('zoomed');
    overlay.classList.toggle('show');
}

function closeZoom() {
    document.querySelectorAll('.preview-image').forEach(img => {
        img.classList.remove('zoomed');
    });
    document.getElementById('zoomOverlay').classList.remove('show');
}

function setupCropCanvas() {
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function () {
        // cache image for cropping
        cropImage = img;

        // Set canvas to actual image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image at actual size
        ctx.drawImage(img, 0, 0);

        // Display canvas scaled to fit screen
        const maxWidth = Math.min(500, window.innerWidth - 60);
        canvas.style.maxWidth = maxWidth + 'px';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';

        console.log('Canvas actual size:', canvas.width, 'x', canvas.height);
        console.log('Canvas display size:', canvas.offsetWidth, 'x', canvas.offsetHeight);

        // Setup crop interaction using Pointer Events for mouse+touch+pen
        // Use pointer capture so move/up are delivered even if pointer leaves the canvas
        // Bind crop pointer events only once (avoid duplicate handlers)
        if (!canvas.dataset.cropBound) {
            canvas.addEventListener('pointerdown', startCrop, { passive: false });
            canvas.addEventListener('pointermove', drawCrop, { passive: false });
            canvas.addEventListener('pointerup', endCrop, { passive: false });
            canvas.addEventListener('pointercancel', endCrop, { passive: false });
            canvas.dataset.cropBound = "1";
        }


    };

    img.src = originalLabelImage;
}

function startCrop(e) {
    // Expect a PointerEvent
    if (e && e.preventDefault) e.preventDefault();

    // If another pointer is already cropping, ignore this one
    if (activePointerId !== null) return;

    const canvas = document.getElementById("cropCanvas");
    const rect = canvas.getBoundingClientRect();

    // Capture pointer first (best effort)
    activePointerId = e.pointerId;
    try {
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    } catch (err) {
        // Even if capture fails, keep activePointerId so we still filter other pointers
    }

    // Calculate scale ratio between display size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Convert to actual canvas coordinates
    cropStartX = (clientX - rect.left) * scaleX;
    cropStartY = (clientY - rect.top) * scaleY;

    // Initialize end coords so a click-without-move still has a defined box
    cropEndX = cropStartX;
    cropEndY = cropStartY;

    isCropping = true;

    console.log("Start crop - Display:", (clientX - rect.left), (clientY - rect.top));
    console.log("Start crop - Canvas:", cropStartX, cropStartY);
    console.log("Scale:", scaleX, scaleY);
}


function drawCrop(e) {
    if (!isCropping || !cropImage) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    if (e && e.preventDefault) e.preventDefault();

    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Calculate scale ratio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get coordinates relative to canvas display
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Convert to actual canvas coordinates
    cropEndX = (clientX - rect.left) * scaleX;
    cropEndY = (clientY - rect.top) * scaleY;

    // Redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cropImage, 0, 0, canvas.width, canvas.height);

    // Draw crop rectangle at actual canvas coordinates
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(
        cropStartX,
        cropStartY,
        cropEndX - cropStartX,
        cropEndY - cropStartY
    );
    ctx.setLineDash([]);

    // Draw semi-transparent overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    const minX = Math.min(cropStartX, cropEndX);
    const minY = Math.min(cropStartY, cropEndY);
    const maxX = Math.max(cropStartX, cropEndX);
    const maxY = Math.max(cropStartY, cropEndY);

    // Top
    ctx.fillRect(0, 0, canvas.width, minY);
    // Left
    ctx.fillRect(0, minY, minX, maxY - minY);
    // Right
    ctx.fillRect(maxX, minY, canvas.width - maxX, maxY - minY);
    // Bottom
    ctx.fillRect(0, maxY, canvas.width, canvas.height - maxY);
}

function endCrop(e) {
    if (!isCropping) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    if (e && e.preventDefault) e.preventDefault();

    // If an event is provided, update final coordinates
    if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
        try {
            const canvas = document.getElementById('cropCanvas');
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.clientX;
            const clientY = e.clientY;
            cropEndX = (clientX - rect.left) * scaleX;
            cropEndY = (clientY - rect.top) * scaleY;
        } catch (err) {
            // ignore
        }
    }

    isCropping = false;

    // Release pointer capture if set
    try {
        const canvas = document.getElementById('cropCanvas');
        if (activePointerId != null) {
            canvas.releasePointerCapture && canvas.releasePointerCapture(activePointerId);
            activePointerId = null;
        }
    } catch (err) {
        activePointerId = null;
    }

    console.log('End crop at:', cropEndX, cropEndY);
}

function applyCrop() {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Safety
    if (!cropImage) {
        console.log("No cropImage available, using original image");
        labelImage = originalLabelImage;
        document.getElementById("labelCropControls").style.display = "none";
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
    extractTextFromImage(labelImage);
}


function skipCrop() {
    labelImage = originalLabelImage;
    document.getElementById('labelCropControls').style.display = 'none';
    extractTextFromImage(labelImage);
}

function retakeLabelPhoto() {
    labelImage = null;
    originalLabelImage = null;
    const preview = document.getElementById('labelPreview');
    preview.style.display = 'none';
    preview.onclick = null;
    document.getElementById('labelCropControls').style.display = 'none';
    document.getElementById('cropCanvas').style.display = 'none';
    document.getElementById('labelCameraInput').value = '';
    document.getElementById('labelGalleryInput').value = '';
}

function showOCR() {
    document.getElementById('ocrSection').style.display = 'block';
    document.getElementById('ocrTipBanner').style.display = 'none';
}

// ============= OCR =============
async function extractTextFromImage(imageData) {
    const loading = document.getElementById('loadingOCR');
    loading.classList.add('show');

    try {
        // Preprocess image for better OCR
        const preprocessedImage = await preprocessImage(imageData);

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

function highlightField(fieldId) {
    const field = document.getElementById(fieldId);
    field.style.background = '#d4edda';
    field.style.borderColor = '#28a745';
    setTimeout(() => {
        field.style.background = '';
        field.style.borderColor = '';
    }, 3000);
}

// ============= FOOD ANALYSIS =============
function analyzeFood() {
    // Validation
    const protein = parseFloat(document.getElementById('protein').value);
    const fat = parseFloat(document.getElementById('fat').value);
    const fiber = parseFloat(document.getElementById('fiber').value);
    const moisture = parseFloat(document.getElementById('moisture').value);

    if (!protein || !fat || !fiber || !moisture) {
        alert('⚠️ Inserisci tutti i valori obbligatori (Proteine, Grassi, Fibre, Umidità)');
        return;
    }

    // Smart validation
    const total = protein + fat + fiber + moisture;
    if (total > 100) {
        alert(`⚠️ Attenzione: la somma dei valori è ${total.toFixed(1)}% (superiore a 100%). Verifica i dati.`);
        return;
    }

    // Get values
    const name = document.getElementById('foodName').value;
    const type = document.getElementById('foodType').value;

    // Auto ash estimation
    let ash = parseFloat(document.getElementById('ash').value);
    let ashEstimated = false;
    if (!ash || isNaN(ash)) {
        ash = type === 'dry' ? 5.0 : 2.0;
        ashEstimated = true;
    }

    // Calculate carbs
    const carbsAsFed = 100 - (protein + fat + fiber + moisture + ash);

    if (carbsAsFed < 0) {
        alert('⚠️ Errore: il totale supera il 100%. Verifica i valori.');
        return;
    }

    // Estimate or use provided kcal
    let kcalPer100g = parseFloat(document.getElementById('kcalPer100g').value);
    let kcalEstimated = false;
    if (!kcalPer100g || isNaN(kcalPer100g)) {
        kcalPer100g = (4 * protein) + (8.5 * fat) + (4 * carbsAsFed);
        kcalEstimated = true;
    }

    // Calculate metrics
    const dryMatter = 100 - moisture;
    const carbsDMB = (carbsAsFed / dryMatter) * 100;
    const proteinME = (4 * protein / kcalPer100g) * 100;
    const fatME = (8.5 * fat / kcalPer100g) * 100;
    const carbsME = (4 * carbsAsFed / kcalPer100g) * 100;
    const carbsPer100kcal = (carbsAsFed / kcalPer100g) * 100;
    const proteinPer100kcal = (protein / kcalPer100g) * 100;

    // Scoring
    let carbScore = 'grigio';
    let proteinScore = 'grigio';

    if (!kcalEstimated || !ashEstimated) {
        if (carbsME <= 12 || carbsPer100kcal <= 3) carbScore = 'verde';
        else if (carbsME <= 15 || carbsPer100kcal <= 5) carbScore = 'giallo';
        else carbScore = 'rosso';

        if (proteinME >= 40) proteinScore = 'verde';
        else if (proteinME >= 35) proteinScore = 'giallo';
        else proteinScore = 'rosso';
    }

    let overallScore = 'grigio';
    if (carbScore !== 'grigio' && proteinScore !== 'grigio') {
        if (carbScore === 'verde' && proteinScore === 'verde') overallScore = 'verde';
        else if (carbScore === 'rosso' || proteinScore === 'rosso') overallScore = 'rosso';
        else overallScore = 'giallo';
    }

    let confidence = 'alta';
    if (kcalEstimated && ashEstimated) confidence = 'bassa';
    else if (kcalEstimated || ashEstimated) confidence = 'media';

    // Store analysis
    currentAnalysis = {
        name, type, protein, fat, fiber, moisture, ash,
        carbsAsFed, carbsDMB, kcalPer100g,
        proteinME, fatME, carbsME,
        carbsPer100kcal, proteinPer100kcal,
        carbScore, proteinScore, overallScore, confidence,
        kcalEstimated, ashEstimated,
        frontImage, labelImage,
        date: new Date().toISOString()
    };

    displayResults(currentAnalysis);
    goToStep(3);
}

function displayResults(analysis) {
    const verdictConfig = {
        verde: {
            emoji: '✅',
            title: 'OTTIMO',
            text: 'Perfetto per gatti diabetici! 🎉',
            bg: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)'
        },
        giallo: {
            emoji: '⚠️',
            title: 'ACCETTABILE',
            text: 'Va bene, ma ci sono opzioni migliori',
            bg: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)'
        },
        rosso: {
            emoji: '❌',
            title: 'NON IDEALE',
            text: 'Non è l\'ideale per un gatto diabetico',
            bg: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)'
        },
        grigio: {
            emoji: '⚪',
            title: 'DATI INSUFFICIENTI',
            text: 'Servono più dati per valutare',
            bg: 'linear-gradient(135deg, #e2e3e5 0%, #d6d8db 100%)'
        }
    };

    const verdict = verdictConfig[analysis.overallScore];
    const confidenceLabels = { alta: 'Alta', media: 'Media', bassa: 'Bassa' };

    let html = `
                <div class="verdict-card" style="background: ${verdict.bg};">
                    <div class="verdict-emoji">${verdict.emoji}</div>
                    <div class="verdict-title">${verdict.title}</div>
                    <div class="verdict-text">${verdict.text}</div>
                    <span class="info-icon" onclick="showInfo('scoring')" style="background: rgba(0,0,0,0.6); margin-top: 15px; display: inline-flex;">?</span>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 15px; ${analysis.confidence === 'alta' ? 'background: #d4edda; color: #155724;' :
            analysis.confidence === 'media' ? 'background: #fff3cd; color: #856404;' :
                'background: #f8d7da; color: #721c24;'
        }">
                        Affidabilità: ${confidenceLabels[analysis.confidence]}
                    </span>
                    <span class="info-icon" onclick="showInfo('confidence')">?</span>
                </div>
            `;

    // Portion if profile exists
    if (catProfile && catProfile.targetKcal) {
        const gramsPerDay = (catProfile.targetKcal / analysis.kcalPer100g) * 100;
        html += `
                    <div class="portion-card">
                        <div class="portion-label">Porzione per ${catProfile.name}</div>
                        <div class="portion-value">${gramsPerDay.toFixed(0)}g</div>
                        <div class="portion-sub">al giorno (${catProfile.targetKcal} kcal)</div>
                    </div>
                `;
    }

    // Details with info icons and colored badges
    html += `
                <details style="margin-top: 20px;">
                    <summary>📊 Dettagli Nutrizionali</summary>
                    <div class="details-content">
                        <div class="metric-row">
                            <span>
                                Carboidrati %ME
                                <span class="info-icon" onclick="showInfo('carbsME')">?</span>
                            </span>
                            <strong>
                                ${analysis.carbsME.toFixed(1)}%
                                <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 13px; margin-left: 6px; background: ${analysis.carbScore === 'verde' ? 'var(--success)' :
            analysis.carbScore === 'giallo' ? 'var(--warning)' :
                analysis.carbScore === 'rosso' ? 'var(--danger)' : 'var(--gray-600)'
        }; color: ${analysis.carbScore === 'giallo' ? 'var(--gray-900)' : 'white'};">
                                    ${analysis.carbScore === 'verde' ? '✓' : analysis.carbScore === 'giallo' ? '~' : analysis.carbScore === 'rosso' ? '✗' : '?'}
                                </span>
                            </strong>
                        </div>
                        <div class="metric-row">
                            <span>
                                Carboidrati g/100kcal
                                <span class="info-icon" onclick="showInfo('carbsGrams')">?</span>
                            </span>
                            <strong>${analysis.carbsPer100kcal.toFixed(1)}g</strong>
                        </div>
                        <div class="metric-row">
                            <span>
                                Proteine %ME
                                <span class="info-icon" onclick="showInfo('proteinME')">?</span>
                            </span>
                            <strong>
                                ${analysis.proteinME.toFixed(1)}%
                                <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 13px; margin-left: 6px; background: ${analysis.proteinScore === 'verde' ? 'var(--success)' :
            analysis.proteinScore === 'giallo' ? 'var(--warning)' :
                analysis.proteinScore === 'rosso' ? 'var(--danger)' : 'var(--gray-600)'
        }; color: ${analysis.proteinScore === 'giallo' ? 'var(--gray-900)' : 'white'};">
                                    ${analysis.proteinScore === 'verde' ? '✓' : analysis.proteinScore === 'giallo' ? '~' : analysis.proteinScore === 'rosso' ? '✗' : '?'}
                                </span>
                            </strong>
                        </div>
                        <div class="metric-row">
                            <span>
                                Proteine g/100kcal
                                <span class="info-icon" onclick="showInfo('proteinGrams')">?</span>
                            </span>
                            <strong>${analysis.proteinPer100kcal.toFixed(1)}g</strong>
                        </div>
                        <div class="metric-row">
                            <span>Energia</span>
                            <strong>${analysis.kcalPer100g.toFixed(0)} kcal/100g</strong>
                        </div>
                    </div>
                </details>
            `;

    // Warnings
    if (analysis.type === 'dry' && analysis.overallScore === 'verde') {
        html += `
                    <div class="alert alert-warning" style="margin-top: 20px;">
                        <strong>⚠️ Cibo secco:</strong> Usa sempre una bilancia. Evita somministrazione ad libitum.
                    </div>
                `;
    }

    if (catProfile && catProfile.onInsulin) {
        html += `
                    <div class="alert alert-danger" style="margin-top: 15px;">
                        <strong>⚠️ Terapia insulinica:</strong> Consultare il veterinario prima di cambiare alimentazione.
                    </div>
                `;
    }

    document.getElementById('analysisResults').innerHTML = html;
}

// ============= SAVE FOOD =============
function saveFood() {
    if (!currentAnalysis) return;

    (async () => {
        // Save images to IndexedDB and keep only IDs in catalog
        try { await imagesDB.init(); } catch (e) { console.warn('IndexedDB init failed:', e); }

        const frontId = currentAnalysis.frontImage ? await imagesDB.putDataUrl(currentAnalysis.frontImage) : null;
        const labelId = currentAnalysis.labelImage ? await imagesDB.putDataUrl(currentAnalysis.labelImage) : null;

        const item = { ...currentAnalysis };
        // Remove base64 to avoid localStorage quota issues
        delete item.frontImage;
        delete item.labelImage;
        item.frontImageId = frontId;
        item.labelImageId = labelId;

        let catalog = appStorage.getJSON('foodCatalog', []);
        catalog.unshift(item);

        if (!appStorage.setJSON('foodCatalog', catalog)) {
            showError('Memoria piena: impossibile salvare il catalogo. Prova a rimuovere alcuni prodotti.');
            // Cleanup images we just stored (optional)
            if (frontId) await imagesDB.delete(frontId);
            if (labelId) await imagesDB.delete(labelId);
            return;
        }

        showSuccessAnimation();

        setTimeout(() => {
            resetWizard();
            switchTab('catalog');
        }, 1500);
    })();
}

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

// ============= PROFILE =============
function saveProfile() {
    const name = document.getElementById('catName').value || 'Gatto';
    const currentWeight = parseFloat(document.getElementById('currentWeight').value);

    if (!currentWeight || currentWeight <= 0) {
        alert('⚠️ Inserisci un peso valido');
        return;
    }

    const profile = {
        name,
        currentWeight,
        idealWeight: parseFloat(document.getElementById('idealWeight').value) || currentWeight,
        status: document.getElementById('catStatus').value,
        goal: document.getElementById('goal').value,
        onInsulin: document.getElementById('onInsulin').checked
    };

    const weight = profile.goal === 'weight-loss' ? profile.idealWeight : profile.currentWeight;
    const RER = 70 * Math.pow(weight, 0.75);

    let targetKcal;
    if (profile.goal === 'weight-loss') {
        targetKcal = 0.8 * RER;
    } else {
        targetKcal = profile.status === 'neutered' ? 1.2 * RER : 1.4 * RER;
    }

    profile.targetKcal = Math.round(targetKcal);
    profile.RER = Math.round(RER);

    catProfile = profile;
    appStorage.set('catProfile', JSON.stringify(profile));

    document.getElementById('profileSummary').style.display = 'block';
    document.getElementById('profileCalories').innerHTML = `
                <div style="font-size: 20px; margin: 10px 0;">
                    <strong>${profile.targetKcal}</strong> kcal/giorno
                </div>
                <div style="font-size: 16px; opacity: 0.9;">
                    RER: ${profile.RER} kcal • ${profile.goal === 'weight-loss' ? '🎯 Dimagrimento' : '✅ Mantenimento'}
                </div>
            `;

    showSuccessAnimation();
}

function loadProfile() {
    const saved = appStorage.get('catProfile');
    if (saved) {
        catProfile = appStorage.parseJSON(saved, null);
        document.getElementById('catName').value = catProfile.name || '';
        document.getElementById('currentWeight').value = catProfile.currentWeight;
        document.getElementById('idealWeight').value = catProfile.idealWeight;
        document.getElementById('catStatus').value = catProfile.status;
        document.getElementById('goal').value = catProfile.goal;
        document.getElementById('onInsulin').checked = catProfile.onInsulin;

        if (catProfile.onInsulin) {
            document.getElementById('insulinWarning').classList.remove('hidden');
        }

        if (catProfile.targetKcal) {
            document.getElementById('profileSummary').style.display = 'block';
            document.getElementById('profileCalories').innerHTML = `
                        <div style="font-size: 20px; margin: 10px 0;">
                            <strong>${catProfile.targetKcal}</strong> kcal/giorno
                        </div>
                        <div style="font-size: 16px; opacity: 0.9;">
                            RER: ${catProfile.RER} kcal
                        </div>
                    `;
        }
    }
}

function deleteProfile() {
    if (!confirm('Eliminare il profilo del gatto?\n\nI cibi nel catalogo non verranno eliminati.')) return;

    appStorage.remove('catProfile');
    catProfile = null;

    document.getElementById('catName').value = '';
    document.getElementById('currentWeight').value = '5.0';
    document.getElementById('idealWeight').value = '5.0';
    document.getElementById('catStatus').value = 'neutered';
    document.getElementById('goal').value = 'maintenance';
    document.getElementById('onInsulin').checked = false;
    document.getElementById('insulinWarning').classList.add('hidden');
    document.getElementById('profileSummary').style.display = 'none';

    alert('✅ Profilo eliminato!');
}

// ============= SETTINGS =============
function loadSettings() {
    const extraLarge = appStorage.get('extraLargeText') === 'true';
    document.getElementById('extraLargeText').checked = extraLarge;
    if (extraLarge) {
        document.body.classList.add('extra-large-text');
    }
}

function toggleTextSize() {
    const isChecked = document.getElementById('extraLargeText').checked;
    appStorage.set('extraLargeText', isChecked);
    document.body.classList.toggle('extra-large-text', isChecked);
}

// ============= INFO SYSTEM =============
const infoContent = {
    energy: {
        title: "Fabbisogno Energetico",
        text: `<p class="modal-text">Il fabbisogno energetico è la quantità di calorie (kcal) che il tuo gatto ha bisogno ogni giorno per mantenersi in salute.</p>
                <p class="modal-text"><strong>RER (Resting Energy Requirement)</strong> è l'energia di base che il gatto usa solo per vivere, respirare e mantenere la temperatura corporea - come se dormisse tutto il giorno.</p>
                <p class="modal-text"><strong>Fabbisogno totale</strong> è il RER moltiplicato per un fattore che dipende dallo stile di vita del gatto (attivo, sterilizzato, ecc.).</p>
                <div class="modal-example">
                    <strong>Esempio pratico:</strong><br>
                    Un gatto sterilizzato di 5 kg ha bisogno di circa 240 kcal al giorno.<br>
                    Se vuoi farlo dimagrire, usi meno calorie (circa 190 kcal/giorno).
                </div>`
    },
    carbsME: {
        title: "Carboidrati %ME",
        text: `<p class="modal-text"><strong>%ME</strong> significa "percentuale di energia metabolizzabile" - cioè quanta energia (calorie) viene dai carboidrati rispetto al totale.</p>
                <p class="modal-text">I gatti sono carnivori e hanno bisogno di pochi carboidrati. Per i gatti diabetici, è importante che <strong>meno del 12% delle calorie</strong> venga dai carboidrati.</p>
                <div class="modal-example">
                    <strong>Perché è importante:</strong><br>
                    I carboidrati aumentano lo zucchero nel sangue più delle proteine o dei grassi. Per un gatto diabetico, meno carboidrati = zucchero più stabile = meno insulina necessaria.
                </div>
                <p class="modal-text"><strong>Verde (≤12%):</strong> Ottimo per diabetici<br>
                <strong>Giallo (12-15%):</strong> Accettabile<br>
                <strong>Rosso (>15%):</strong> Troppi carboidrati</p>`
    },
    carbsGrams: {
        title: "Carboidrati g/100 kcal",
        text: `<p class="modal-text">Questo numero dice quanti <strong>grammi di carboidrati</strong> ci sono in 100 calorie di cibo.</p>
                <p class="modal-text">È un altro modo per misurare i carboidrati, più preciso per confrontare cibi umidi e secchi che hanno calorie molto diverse.</p>
                <div class="modal-example">
                    <strong>Obiettivo per gatti diabetici:</strong><br>
                    Massimo 3 grammi di carboidrati ogni 100 calorie.<br><br>
                    Se il cibo ha 5g/100kcal, vuol dire che è troppo ricco di carboidrati per un diabetico.
                </div>
                <p class="modal-text"><strong>Verde (≤3g):</strong> Ottimo<br>
                <strong>Giallo (3-5g):</strong> Accettabile<br>
                <strong>Rosso (>5g):</strong> Troppo</p>`
    },
    proteinME: {
        title: "Proteine %ME",
        text: `<p class="modal-text">Indica quanta energia (calorie) viene dalle proteine rispetto al totale del cibo.</p>
                <p class="modal-text">I gatti sono carnivori obbligati e hanno bisogno di <strong>molte proteine</strong>. Per i gatti diabetici è ancora più importante: le proteine aiutano a mantenere i muscoli e non alzano lo zucchero nel sangue.</p>
                <div class="modal-example">
                    <strong>Obiettivo per gatti diabetici:</strong><br>
                    Almeno il 40% delle calorie dovrebbe venire dalle proteine.<br><br>
                    Più proteine = più sazietà, muscoli forti, zucchero stabile.
                </div>
                <p class="modal-text"><strong>Verde (≥40%):</strong> Ottimo<br>
                <strong>Giallo (35-40%):</strong> Accettabile<br>
                <strong>Rosso (<35%):</strong> Troppo poche</p>`
    },
    proteinGrams: {
        title: "Proteine g/100 kcal",
        text: `<p class="modal-text">Quanti <strong>grammi di proteine</strong> ci sono in 100 calorie di cibo.</p>
                <p class="modal-text">Questo numero è importante soprattutto se il gatto deve dimagrire: serve abbastanza proteine per non perdere i muscoli mentre perde peso.</p>
                <div class="modal-example">
                    <strong>Obiettivo minimo:</strong> 8.9 grammi/100 kcal<br>
                    <strong>Ideale per dimagrimento:</strong> 10+ grammi/100 kcal<br><br>
                    Questo garantisce che il gatto perda grasso, non muscoli.
                </div>`
    },
    scoring: {
        title: "Come Funziona il Punteggio",
        text: `<p class="modal-text">L'app valuta il cibo su due criteri principali per gatti diabetici:</p>
                <p class="modal-text"><strong>1. Carboidrati</strong> (devono essere pochi)<br>
                <strong>2. Proteine</strong> (devono essere tante)</p>
                <div class="modal-example">
                    <strong>🟢 VERDE (Ottimo):</strong><br>
                    • Carboidrati ≤12% ME o ≤3g/100kcal<br>
                    • Proteine ≥40% ME<br>
                    ➜ Ideale per gatti diabetici<br><br>
                    
                    <strong>🟡 GIALLO (Accettabile):</strong><br>
                    • Carboidrati 12-15% ME<br>
                    • Proteine 35-40% ME<br>
                    ➜ Va bene ma non ottimale<br><br>
                    
                    <strong>🔴 ROSSO (Non ideale):</strong><br>
                    • Carboidrati >15% ME o >5g/100kcal<br>
                    • Proteine <35% ME<br>
                    ➜ Troppi carboidrati o poche proteine<br><br>
                    
                    <strong>⚪ GRIGIO (Dati insufficienti):</strong><br>
                    • Mancano troppi dati per valutare<br>
                    ➜ Cerca etichetta più completa
                </div>
                <p class="modal-text">Il punteggio finale è il peggiore tra carboidrati e proteine. Se uno è rosso, il totale è rosso.</p>`
    },
    confidence: {
        title: "Affidabilità del Calcolo",
        text: `<p class="modal-text">L'affidabilità indica quanto possiamo fidarci dei calcoli, in base ai dati disponibili sull'etichetta.</p>
                <div class="modal-example">
                    <strong>🟢 ALTA:</strong><br>
                    Tutte le informazioni sono dichiarate sulla confezione (energia + ceneri).<br>
                    I calcoli sono molto precisi.<br><br>
                    
                    <strong>🟡 MEDIA:</strong><br>
                    Manca l'energia OPPURE le ceneri, ma non entrambe.<br>
                    L'app stima il dato mancante con formule standard.<br>
                    I calcoli sono abbastanza precisi.<br><br>
                    
                    <strong>🔴 BASSA:</strong><br>
                    Mancano sia l'energia che le ceneri.<br>
                    L'app deve stimare entrambi i valori.<br>
                    I calcoli sono meno precisi ma utili per orientarsi.
                </div>
                <p class="modal-text"><strong>Consiglio:</strong> Con affidabilità bassa, prova a cercare l'etichetta completa sul sito del produttore.</p>`
    }
};

function showInfo(topic) {
    const content = infoContent[topic];
    if (!content) return;

    document.getElementById('modalBody').innerHTML = `
                <div class="modal-title">${content.title}</div>
                ${content.text}
            `;
    document.getElementById('infoModal').classList.add('show');
}

function closeInfo() {
    document.getElementById('infoModal').classList.remove('show');
}

// ============= ANIMATIONS =============
function showSuccessAnimation() {
    const animation = document.getElementById('successAnimation');
    animation.classList.add('show');

    // Haptic feedback if supported
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }

    setTimeout(() => {
        animation.classList.remove('show');
    }, 1500);
}

function showSuccess(message) {
    alert(message);
}

// ============= SERVICE WORKER REGISTRATION + UPDATE UI =============
(function () {
    if (!("serviceWorker" in navigator)) return;

    // Small unobtrusive update banner
    function ensureUpdateBanner() {
        let bar = document.getElementById("update-banner");
        if (bar) {
            return { bar, btn: bar.querySelector("button") };
        }

        bar = document.createElement("div");
        bar.id = "update-banner";
        bar.style.cssText = [
            "position:fixed",
            "left:12px",
            "right:12px",
            "bottom:12px",
            "z-index:9999",
            "padding:12px 14px",
            "border-radius:14px",
            "background:rgba(0,0,0,0.85)",
            "color:#fff",
            "display:none",
            "align-items:center",
            "justify-content:space-between",
            "gap:12px",
            "font-size:14px"
        ].join(";");

        const msg = document.createElement("div");
        msg.textContent = "✅ Nuova versione disponibile";

        const btn = document.createElement("button");
        btn.textContent = "Aggiorna";
        btn.style.cssText = [
            "border:0",
            "border-radius:12px",
            "padding:10px 12px",
            "font-weight:700",
            "cursor:pointer"
        ].join(";");

        bar.appendChild(msg);
        bar.appendChild(btn);
        document.body.appendChild(bar);

        return { bar, btn };
    }

    window.addEventListener("load", async () => {
        try {
            const reg = await navigator.serviceWorker.register("sw.js", { scope: "./" });

            function promptUpdate(waitingWorker) {
                const ui = ensureUpdateBanner();
                ui.bar.style.display = "flex";
                ui.btn.onclick = () => {
                    // Tell SW to activate and then reload
                    waitingWorker.postMessage({ type: "SKIP_WAITING" });
                };
            }

            // If there's already a waiting SW, show prompt
            if (reg.waiting) promptUpdate(reg.waiting);

            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        // New update ready (won't wipe localStorage/IndexedDB)
                        promptUpdate(newWorker);
                    }
                });
            });

            // When the new SW activates, reload to use new assets
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                window.location.reload();
            });
        } catch (e) {
            console.warn("SW register failed:", e);
        }
    });
})();
