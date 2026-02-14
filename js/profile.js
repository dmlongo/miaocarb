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
