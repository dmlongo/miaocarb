// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
    loadCatalog();
    checkOnboarding();
    loadSettings();
    initializeEventListeners();
    migrateCompressImages();
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

    // Swipe between tabs
    initSwipeNavigation();
}

// ============= TAB SWITCHING =============
function switchTab(tabName, tabEl) {
    currentTabIndex = TAB_ORDER.indexOf(tabName);
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

// ============= SWIPE NAVIGATION =============
function initSwipeNavigation() {
    const SWIPE_THRESHOLD = 50;

    function onStart(x, y, target) {
        if (target.closest('.crop-stage')) return;
        swipeStartX = x;
        swipeStartY = y;
        swipeTracking = true;
    }

    function onEnd(x, y) {
        if (!swipeTracking) return;
        swipeTracking = false;

        const dx = x - swipeStartX;
        const dy = y - swipeStartY;

        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) return;

        navigateTab(dx < 0 ? 1 : -1);
    }

    // Touch events (mobile)
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        onStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });

    // Mouse events (desktop fallback)
    let mouseDown = false;
    document.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        mouseDown = true;
        onStart(e.clientX, e.clientY, e.target);
    });

    document.addEventListener('mouseup', function (e) {
        if (!mouseDown) return;
        mouseDown = false;
        onEnd(e.clientX, e.clientY);
    });
}

function navigateTab(direction) {
    const newIndex = currentTabIndex + direction;
    if (newIndex < 0 || newIndex >= TAB_ORDER.length) return;
    currentTabIndex = newIndex;
    switchTab(TAB_ORDER[currentTabIndex]);
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
