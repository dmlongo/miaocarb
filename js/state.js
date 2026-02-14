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
// 2-canvas crop UI (base + overlay)
let cropStage = null;
let cropBaseCanvas = null;
let cropOverlayCanvas = null;
let cropBaseCtx = null;
let cropOverlayCtx = null;
let cropListenersAdded = false;
let cropRafPending = false;
let tesseractLoaded = false;

// Swipe navigation state
const TAB_ORDER = ['catalog', 'food', 'profile'];
let currentTabIndex = 0;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeTracking = false;
