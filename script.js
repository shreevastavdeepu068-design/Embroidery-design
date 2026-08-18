/* =========================================================
   AI EMBROIDERY ENGINE
   Application Controller
   ========================================================= */


/* =========================================================
   01. DOM REFERENCES
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");

const navItems = document.querySelectorAll(".nav-item");
const pageSections = document.querySelectorAll(".page-section");

const generateButton = document.getElementById("generateButton");

const designWidth = document.getElementById("designWidth");
const designHeight = document.getElementById("designHeight");

const sizeUnit = document.getElementById("sizeUnit");
const hoopSize = document.getElementById("hoopSize");

const fabricType = document.getElementById("fabricType");
const garmentType = document.getElementById("garmentType");

const threadColors = document.getElementById("threadColors");
const stitchPreference = document.getElementById("stitchPreference");

const designDescription =
  document.getElementById("designDescription");

const referenceImage =
  document.getElementById("referenceImage");

const previewSize =
  document.getElementById("previewSize");

const previewHoop =
  document.getElementById("previewHoop");

const previewStatus =
  document.getElementById("previewStatus");

const previewPlaceholder =
  document.getElementById("previewPlaceholder");

const stitchCanvas =
  document.getElementById("stitchCanvas");

const stitchCount =
  document.getElementById("stitchCount");

const colorCount =
  document.getElementById("colorCount");

const estimatedTime =
  document.getElementById("estimatedTime");

const jumpCount =
  document.getElementById("jumpCount");

const qualityBadge =
  document.getElementById("qualityBadge");

const fitPreviewButton =
  document.getElementById("fitPreviewButton");

const resetPreviewButton =
  document.getElementById("resetPreviewButton");

const themeSetting =
  document.getElementById("themeSetting");

const defaultUnit =
  document.getElementById("defaultUnit");

const autoValidation =
  document.getElementById("autoValidation");

const goStudioButton =
  document.querySelector("[data-go-studio]");

const exportButtons =
  document.querySelectorAll(".export-button");


/* =========================================================
   02. APPLICATION STATE
   ========================================================= */

const appState = {

  currentSection: "studio",

  design: {

    width: 4,
    height: 4,

    unit: "inch",

    hoop: "5x7",

    fabric: "cotton",

    garment: "kurti",

    colors: "auto",

    stitchPreference: "auto",

    description: "",

    referenceImage: null

  },

  validation: {

    valid: false,

    messages: []

  },

  settings: {

    theme: "dark",

    defaultUnit: "inch",

    autoValidation: true

  }

};


/* =========================================================
   03. INITIALIZATION
   ========================================================= */

function initializeApp() {

  loadSettings();

  bindNavigation();

  bindMenu();

  bindDesignInputs();

  bindReferenceUpload();

  bindSettings();

  bindPreviewControls();

  bindGenerateButton();

  updateDesignState();

  updatePreviewInformation();

  updateCanvasSize();

}


/* =========================================================
   04. MOBILE MENU
   ========================================================= */

function bindMenu() {

  if (!menuButton || !sidebar) {
    return;
  }

  menuButton.addEventListener("click", () => {

    const isOpen =
      sidebar.classList.toggle("open");

    menuButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

  });


  document.addEventListener("click", (event) => {

    if (!sidebar.classList.contains("open")) {
      return;
    }

    const clickedInsideSidebar =
      sidebar.contains(event.target);

    const clickedMenu =
      menuButton.contains(event.target);

    if (!clickedInsideSidebar && !clickedMenu) {

      sidebar.classList.remove("open");

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );

    }

  });

}


/* =========================================================
   05. NAVIGATION
   ========================================================= */

function bindNavigation() {

  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      const section =
        item.dataset.section;

      showSection(section);

    });

  });


  if (goStudioButton) {

    goStudioButton.addEventListener(
      "click",
      () => showSection("studio")
    );

  }

}


function showSection(sectionName) {

  appState.currentSection =
    sectionName;


  navItems.forEach((item) => {

    const isActive =
      item.dataset.section === sectionName;

    item.classList.toggle(
      "active",
      isActive
    );

  });


  pageSections.forEach((section) => {

    const expectedId =
      `${sectionName}Section`;

    section.classList.toggle(
      "active",
      section.id === expectedId
    );

  });


  closeMobileMenu();

}


function closeMobileMenu() {

  if (!sidebar) {
    return;
  }

  sidebar.classList.remove("open");

  if (menuButton) {

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* =========================================================
   06. DESIGN INPUTS
   ========================================================= */

function bindDesignInputs() {

  const inputs = [

    designWidth,
    designHeight,
    sizeUnit,
    hoopSize,
    fabricType,
    garmentType,
    threadColors,
    stitchPreference,
    designDescription

  ];


  inputs.forEach((input) => {

    if (!input) {
      return;
    }

    input.addEventListener(
      "input",
      handleDesignInput
    );

    input.addEventListener(
      "change",
      handleDesignInput
    );

  });

}


function handleDesignInput() {

  updateDesignState();

  updatePreviewInformation();

  updateCanvasSize();

  if (appState.settings.autoValidation) {

    runPreflightValidation();

  }

}


/* =========================================================
   07. STATE UPDATE
   ========================================================= */

function updateDesignState() {

  appState.design.width =
    Number(designWidth.value);

  appState.design.height =
    Number(designHeight.value);

  appState.design.unit =
    sizeUnit.value;

  appState.design.hoop =
    hoopSize.value;

  appState.design.fabric =
    fabricType.value;

  appState.design.garment =
    garmentType.value;

  appState.design.colors =
    threadColors.value;

  appState.design.stitchPreference =
    stitchPreference.value;

  appState.design.description =
    designDescription.value.trim();

}


/* =========================================================
   08. PREVIEW INFORMATION
   ========================================================= */

function updatePreviewInformation() {

  const width =
    formatNumber(appState.design.width);

  const height =
    formatNumber(appState.design.height);

  const unit =
    appState.design.unit === "inch"
      ? "in"
      : "mm";

  if (previewSize) {

    previewSize.textContent =
      `${width} × ${height} ${unit}`;

  }


  if (previewHoop) {

    previewHoop.textContent =
      formatHoopName(
        appState.design.hoop
      );

  }

}


/* =========================================================
   09. HOOP INFORMATION
   ========================================================= */

const HOOP_LIMITS = {

  "4x4": {
    width: 4,
    height: 4
  },

  "5x7": {
    width: 5,
    height: 7
  },

  "6x10": {
    width: 6,
    height: 10
  },

  "8x12": {
    width: 8,
    height: 12
  }

};


function formatHoopName(hoop) {

  const names = {

    "4x4": "4 × 4 in",

    "5x7": "5 × 7 in",

    "6x10": "6 × 10 in",

    "8x12": "8 × 12 in",

    "custom": "Custom"

  };

  return names[hoop] || hoop;

}


/* =========================================================
   10. PREFLIGHT VALIDATION
   ========================================================= */

function runPreflightValidation() {

  const messages = [];

  let valid = true;


  const width =
    appState.design.width;

  const height =
    appState.design.height;


  if (!Number.isFinite(width) || width <= 0) {

    valid = false;

    messages.push(
      "Design width must be greater than zero."
    );

  }


  if (!Number.isFinite(height) || height <= 0) {

    valid = false;

    messages.push(
      "Design height must be greater than zero."
    );

  }


  if (appState.design.unit === "inch") {

    if (width > 30 || height > 30) {

      valid = false;

      messages.push(
        "Design dimensions are unusually large."
      );

    }

  }


  if (appState.design.hoop !== "custom") {

    const hoop =
      HOOP_LIMITS[
        appState.design.hoop
      ];

    if (hoop) {

      const fitsDirectly =
        width <= hoop.width &&
        height <= hoop.height;

      const fitsRotated =
        width <= hoop.height &&
        height <= hoop.width;

      if (!fitsDirectly && !fitsRotated) {

        valid = false;

        messages.push(
          "Design size exceeds the selected hoop."
        );

      }

    }

  }


  appState.validation = {

    valid,

    messages

  };


  updateValidationUI();

  return valid;

}


/* =========================================================
   11. VALIDATION UI
   ========================================================= */

function updateValidationUI() {

  if (!qualityBadge) {
    return;
  }


  if (appState.validation.valid) {

    qualityBadge.textContent =
      "Ready for engine";

    qualityBadge.style.color =
      "var(--success)";

    qualityBadge.style.background =
      "rgba(101, 230, 154, 0.08)";

  } else {

    qualityBadge.textContent =
      "Check requirements";

    qualityBadge.style.color =
      "var(--warning)";

    qualityBadge.style.background =
      "rgba(255, 200, 87, 0.08)";

  }

}


/* =========================================================
   12. GENERATE BUTTON
   ========================================================= */

function bindGenerateButton() {

  if (!generateButton) {
    return;
  }


  generateButton.addEventListener(
    "click",
    handleGenerateRequest
  );

}


function handleGenerateRequest() {

  updateDesignState();


  const valid =
    runPreflightValidation();


  if (!valid) {

    setPreviewStatus(
      "Requirements need attention"
    );

    showValidationMessage();

    return;

  }


  /*
   IMPORTANT:

   At this stage we DO NOT pretend to generate
   a real embroidery file.

   The actual stitch-generation engine will be
   connected in a later module.
  */


  setPreviewStatus(
    "Requirements validated"
  );


  if (previewPlaceholder) {

    previewPlaceholder.innerHTML = `

      <div class="placeholder-icon">
        🧵
      </div>

      <strong>
        Production parameters validated
      </strong>

      <span>
        Stitch engine is ready to receive
        these design requirements.
      </span>

    `;

  }


  updateStatisticsPlaceholder();


  console.info(
    "Validated embroidery requirements:",
    appState.design
  );

}


/* =========================================================
   13. PREVIEW STATUS
   ========================================================= */

function setPreviewStatus(message) {

  if (!previewStatus) {
    return;
  }

  previewStatus.textContent =
    message;


  if (
    message ===
    "Requirements validated"
  ) {

    previewStatus.style.color =
      "var(--success)";

  } else {

    previewStatus.style.color =
      "var(--warning)";

  }

}


/* =========================================================
   14. VALIDATION MESSAGE
   ========================================================= */

function showValidationMessage() {

  if (
    !appState.validation.messages.length
  ) {
    return;
  }


  const message =
    appState.validation.messages
      .join(" ");

  console.warn(
    "Embroidery validation:",
    message
  );


  setPreviewStatus(
    appState.validation.messages[0]
  );

}


/* =========================================================
   15. STATISTICS PLACEHOLDER
   ========================================================= */

function updateStatisticsPlaceholder() {

  /*
   These values remain intentionally empty.

   We will NOT invent stitch counts.

   Once stitch-engine.js exists,
   it will calculate:

   - stitch count
   - colors
   - estimated machine time
   - jumps / trims
  */


  if (stitchCount) {
    stitchCount.textContent = "—";
  }

  if (colorCount) {
    colorCount.textContent = "—";
  }

  if (estimatedTime) {
    estimatedTime.textContent = "—";
  }

  if (jumpCount) {
    jumpCount.textContent = "—";
  }

}


/* =========================================================
   16. REFERENCE IMAGE
   ========================================================= */

function bindReferenceUpload() {

  if (!referenceImage) {
    return;
  }


  referenceImage.addEventListener(
    "change",
    () => {

      const file =
        referenceImage.files[0];


      if (!file) {

        appState.design.referenceImage =
          null;

        return;

      }


      appState.design.referenceImage = {

        name: file.name,

        type: file.type,

        size: file.size

      };


      updateUploadBox(file);

    }
  );

}


function updateUploadBox(file) {

  const uploadBox =
    document.querySelector(
      ".upload-box"
    );


  if (!uploadBox) {
    return;
  }


  const strong =
    uploadBox.querySelector("strong");

  const small =
    uploadBox.querySelector("small");


  if (strong) {

    strong.textContent =
      file.name;

  }


  if (small) {

    small.textContent =
      formatFileSize(file.size);

  }

}


function formatFileSize(bytes) {

  if (bytes < 1024) {

    return `${bytes} B`;

  }


  if (bytes < 1024 * 1024) {

    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;

  }


  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;

}


/* =========================================================
   17. CANVAS PREPARATION
   ========================================================= */

function updateCanvasSize() {

  if (!stitchCanvas) {
    return;
  }


  const container =
    stitchCanvas.parentElement;


  if (!container) {
    return;
  }


  const width =
    container.clientWidth;

  const height =
    container.clientHeight;


  if (!width || !height) {
    return;
  }


  const devicePixelRatio =
    window.devicePixelRatio || 1;


  stitchCanvas.width =
    Math.floor(
      width * devicePixelRatio
    );

  stitchCanvas.height =
    Math.floor(
      height * devicePixelRatio
    );


  stitchCanvas.style.width =
    `${width}px`;

  stitchCanvas.style.height =
    `${height}px`;


  const context =
    stitchCanvas.getContext("2d");


  if (context) {

    context.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );

  }

}


/* =========================================================
   18. PREVIEW CONTROLS
   ========================================================= */

function bindPreviewControls() {

  if (fitPreviewButton) {

    fitPreviewButton.addEventListener(
      "click",
      () => {

        updateCanvasSize();

      }
    );

  }


  if (resetPreviewButton) {

    resetPreviewButton.addEventListener(
      "click",
      resetPreview
    );

  }


  window.addEventListener(
    "resize",
    updateCanvasSize
  );

}


function resetPreview() {

  updateDesignState();

  updatePreviewInformation();

  updateCanvasSize();


  if (previewPlaceholder) {

    previewPlaceholder.innerHTML = `

      <div class="placeholder-icon">
        🧵
      </div>

      <strong>
        Your embroidery will appear here
      </strong>

      <span>
        Configure the requirements and
        generate a design.
      </span>

    `;

  }


  setPreviewStatus(
    "Not generated"
  );


  updateStatisticsPlaceholder();


  if (qualityBadge) {

    qualityBadge.textContent =
      "Waiting";

    qualityBadge.style.color =
      "var(--warning)";

    qualityBadge.style.background =
      "rgba(255, 200, 87, 0.08)";

  }


  clearCanvas();

}


/* =========================================================
   19. CANVAS CLEAR
   ========================================================= */

function clearCanvas() {

  if (!stitchCanvas) {
    return;
  }


  const context =
    stitchCanvas.getContext("2d");


  if (!context) {
    return;
  }


  context.clearRect(
    0,
    0,
    stitchCanvas.width,
    stitchCanvas.height
  );

}


/* =========================================================
   20. SETTINGS
   ========================================================= */

function bindSettings() {

  if (themeSetting) {

    themeSetting.addEventListener(
      "change",
      () => {

        appState.settings.theme =
          themeSetting.value;

        applyTheme();

        saveSettings();

      }
    );

  }


  if (defaultUnit) {

    defaultUnit.addEventListener(
      "change",
      () => {

        appState.settings.defaultUnit =
          defaultUnit.value;

        if (
          sizeUnit &&
          !designHasMeaningfulUnit()
        ) {

          sizeUnit.value =
            defaultUnit.value;

          updateDesignState();

          updatePreviewInformation();

        }

        saveSettings();

      }
    );

  }


  if (autoValidation) {

    autoValidation.addEventListener(
      "change",
      () => {

        appState.settings.autoValidation =
          autoValidation.checked;

        saveSettings();

      }
    );

  }

}


/* =========================================================
   21. THEME
   ========================================================= */

function applyTheme() {

  if (
    appState.settings.theme ===
    "light"
  ) {

    document.body.classList.add(
      "light-theme"
    );

  } else {

    document.body.classList.remove(
      "light-theme"
    );

  }


  if (themeSetting) {

    themeSetting.value =
      appState.settings.theme;

  }

}


function designHasMeaningfulUnit() {

  return (
    designWidth &&
    designHeight &&
    (
      Number(designWidth.value) !== 4 ||
      Number(designHeight.value) !== 4
    )
  );

}


/* =========================================================
   22. LOCAL STORAGE
   ========================================================= */

const SETTINGS_KEY =
  "embroidery_ai_settings";


function saveSettings() {

  try {

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(
        appState.settings
      )
    );

  } catch (error) {

    console.warn(
      "Could not save settings.",
      error
    );

  }

}


function loadSettings() {

  try {

    const saved =
      localStorage.getItem(
        SETTINGS_KEY
      );


    if (!saved) {

      applyTheme();

      return;

    }


    const parsed =
      JSON.parse(saved);


    appState.settings = {

      ...appState.settings,

      ...parsed

    };


    if (themeSetting) {

      themeSetting.value =
        appState.settings.theme;

    }


    if (defaultUnit) {

      defaultUnit.value =
        appState.settings.defaultUnit;

    }


    if (autoValidation) {

      autoValidation.checked =
        appState.settings.autoValidation;

    }


    applyTheme();

  } catch (error) {

    console.warn(
      "Could not load settings.",
      error
    );

    applyTheme();

  }

}


/* =========================================================
   23. NUMBER FORMAT
   ========================================================= */

function formatNumber(value) {

  if (!Number.isFinite(value)) {
    return "—";
  }


  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2);

}


/* =========================================================
   24. EXPORT PROTECTION
   ========================================================= */

exportButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      /*
       Export remains locked until the
       real embroidery encoder exists.
      */

      if (button.disabled) {

        console.info(
          `${button.dataset.format} export is not available yet.`
        );

      }

    }
  );

});


/* =========================================================
   25. GLOBAL APP START
   ========================================================= */

initializeApp();


/* =========================================================
   END OF APPLICATION CONTROLLER
   ========================================================= */
