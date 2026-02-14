// ============= IMAGE COMPRESSION =============
function compressImage(dataUrl, maxDim, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            let w = img.width, h = img.height;
            if (w <= maxDim && h <= maxDim) { resolve(dataUrl); return; }
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
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

// ============= ZOOM =============
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

// ============= FIELD HIGHLIGHT =============
function highlightField(fieldId) {
    const field = document.getElementById(fieldId);
    field.style.background = '#d4edda';
    field.style.borderColor = '#28a745';
    setTimeout(() => {
        field.style.background = '';
        field.style.borderColor = '';
    }, 3000);
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
