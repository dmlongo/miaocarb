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
