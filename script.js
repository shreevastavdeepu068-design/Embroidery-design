/* =========================================================
   EMBROIDERY AI
   APPLICATION CONTROLLER
   Version 0.2.0

   Flow:

   User Requirements
        ↓
   Application State
        ↓
   Preflight Validation
        ↓
   Stitch Engine
        ↓
   Stitch Data
        ↓
   Preview + Statistics

   IMPORTANT:
   This frontend does NOT claim to create
   production-ready DST files yet.

   Real DST/PES encoder + AI geometry + backend
   will be connected in later stages.
   ========================================================= */


/* =========================================================
   01. DOM REFERENCES
   ========================================================= */

const sidebar =
  document.getElementById("sidebar");

const menuButton =
  document.getElementById("menuButton");

const navItems =
  document.querySelectorAll(".nav-item");

const pageSections =
  document.querySelectorAll(".page-section");

const generateButton =
  document.getElementById("generateButton");

const designWidth =
  document.getElementById("designWidth");

const designHeight =
  document.getElementById("designHeight");

const sizeUnit =
  document.getElementById("sizeUnit");

const hoopSize =
  document.getElementById("hoopSize");

const fabricType =
  document.getElementById("fabricType");

const garmentType =
  document.getElementById("garmentType");

const threadColors =
  document.getElementById("threadColors");

const stitchPreference =
  document.getElementById("stitchPreference");

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

  /*
   Generated design returned by
   EmbroideryStitchEngine.
  */

  generatedDesign: null,

  /*
   Raw stitch data.
  */

  stitches: [],

  /*
   Engine statistics.
  */

  statistics: null,

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
   03. ENGINE CHECK
   ========================================================= */

function isStitchEngineAvailable() {

  return (
    typeof EmbroideryStitchEngine !==
    "undefined"
  );

}


/* =========================================================
   04. INITIALIZATION
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

  runPreflightValidation();

  console.info(
    "Embroidery AI application initialized."
  );


  if (
    isStitchEngineAvailable()
  ) {

    console.info(
      "Embroidery Stitch Engine detected:",
      EmbroideryStitchEngine.version
    );

  } else {

    console.warn(
      "Embroidery Stitch Engine not detected."
    );

  }

}


/* =========================================================
   05. MOBILE MENU
   ========================================================= */

function bindMenu() {

  if (
    !menuButton ||
    !sidebar
  ) {

    return;

  }


  menuButton.addEventListener(
    "click",
    () => {

      const isOpen =
        sidebar.classList.toggle(
          "open"
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    }
  );


  document.addEventListener(
    "click",
    (event) => {

      if (
        !sidebar.classList.contains(
          "open"
        )
      ) {

        return;

      }


      const clickedInsideSidebar =
        sidebar.contains(
          event.target
        );

      const clickedMenu =
        menuButton.contains(
          event.target
        );


      if (
        !clickedInsideSidebar &&
        !clickedMenu
      ) {

        closeMobileMenu();

      }

    }
  );

}


/* =========================================================
   06. NAVIGATION
   ========================================================= */

function bindNavigation() {

  navItems.forEach(
    (item) => {

      item.addEventListener(
        "click",
        () => {

          const section =
            item.dataset.section;

          showSection(
            section
          );

        }
      );

    }
  );


  if (goStudioButton) {

    goStudioButton.addEventListener(
      "click",
      () => {

        showSection(
          "studio"
        );

      }
    );

  }

}


function showSection(
  sectionName
) {

  appState.currentSection =
    sectionName;


  navItems.forEach(
    (item) => {

      const isActive =
        item.dataset.section ===
        sectionName;

      item.classList.toggle(
        "active",
        isActive
      );

    }
  );


  pageSections.forEach(
    (section) => {

      const expectedId =
        `${sectionName}Section`;

      section.classList.toggle(
        "active",
        section.id ===
        expectedId
      );

    }
  );


  closeMobileMenu();

}


function closeMobileMenu() {

  if (!sidebar) {
    return;
  }


  sidebar.classList.remove(
    "open"
  );


  if (menuButton) {

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* =========================================================
   07. DESIGN INPUTS
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


  inputs.forEach(
    (input) => {

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

    }
  );

}


function handleDesignInput() {

  updateDesignState();

  updatePreviewInformation();

  updateCanvasSize();


  if (
    appState.settings.autoValidation
  ) {

    runPreflightValidation();

  }

}


/* =========================================================
   08. STATE UPDATE
   ========================================================= */

function updateDesignState() {

  if (designWidth) {

    appState.design.width =
      Number(
        designWidth.value
      );

  }


  if (designHeight) {

    appState.design.height =
      Number(
        designHeight.value
      );

  }


  if (sizeUnit) {

    appState.design.unit =
      sizeUnit.value;

  }


  if (hoopSize) {

    appState.design.hoop =
      hoopSize.value;

  }


  if (fabricType) {

    appState.design.fabric =
      fabricType.value;

  }


  if (garmentType) {

    appState.design.garment =
      garmentType.value;

  }


  if (threadColors) {

    appState.design.colors =
      threadColors.value;

  }


  if (stitchPreference) {

    appState.design.stitchPreference =
      stitchPreference.value;

  }


  if (designDescription) {

    appState.design.description =
      designDescription.value.trim();

  }

}


/* =========================================================
   09. PREVIEW INFORMATION
   ========================================================= */

function updatePreviewInformation() {

  const width =
    formatNumber(
      appState.design.width
    );

  const height =
    formatNumber(
      appState.design.height
    );


  const unit =
    appState.design.unit ===
    "inch"
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
   10. HOOP DEFINITIONS
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


function formatHoopName(
  hoop
) {

  const names = {

    "4x4":
      "4 × 4 in",

    "5x7":
      "5 × 7 in",

    "6x10":
      "6 × 10 in",

    "8x12":
      "8 × 12 in",

    "custom":
      "Custom"

  };


  return (
    names[hoop] ||
    hoop
  );

}


/* =========================================================
   11. PREFLIGHT VALIDATION
   ========================================================= */

function runPreflightValidation() {

  const messages = [];

  let valid = true;


  const width =
    appState.design.width;

  const height =
    appState.design.height;


  if (
    !Number.isFinite(width) ||
    width <= 0
  ) {

    valid = false;

    messages.push(
      "Design width must be greater than zero."
    );

  }


  if (
    !Number.isFinite(height) ||
    height <= 0
  ) {

    valid = false;

    messages.push(
      "Design height must be greater than zero."
    );

  }


  /*
   * Browser-side dimension sanity check.
   */

  if (
    appState.design.unit ===
    "inch"
  ) {

    if (
      width > 30 ||
      height > 30
    ) {

      valid = false;

      messages.push(
        "Design dimensions are unusually large."
      );

    }

  }


  /*
   * Hoop validation.
   */

  if (
    appState.design.hoop !==
    "custom"
  ) {

    const hoop =
      HOOP_LIMITS[
        appState.design.hoop
      ];


    if (hoop) {

      const safetyMargin =
        0.25;


      const availableWidth =
        hoop.width -
        safetyMargin;


      const availableHeight =
        hoop.height -
        safetyMargin;


      const fitsDirectly =
        width <=
          availableWidth &&
        height <=
          availableHeight;


      const fitsRotated =
        width <=
          availableHeight &&
        height <=
          availableWidth;


      if (
        !fitsDirectly &&
        !fitsRotated
      ) {

        valid = false;

        messages.push(
          "Design size exceeds the selected hoop safe area."
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
   12. VALIDATION UI
   ========================================================= */

function updateValidationUI() {

  if (!qualityBadge) {
    return;
  }


  if (
    appState.validation.valid
  ) {

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
   13. GENERATE BUTTON
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


/* =========================================================
   14. GENERATE DESIGN
   ========================================================= */

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
   * Check whether the real stitch engine
   * has been loaded before script.js.
   */

  if (
    !isStitchEngineAvailable()
  ) {

    setPreviewStatus(
      "Stitch engine not loaded"
    );


    console.error(
      "EmbroideryStitchEngine is unavailable. Check script order."
    );


    return;

  }


  setPreviewStatus(
    "Generating stitch data..."
  );


  if (generateButton) {

    generateButton.disabled =
      true;

  }


  /*
   * Send current production parameters
   * to the stitch engine.
   */

  let result;


  try {

    result =
      EmbroideryStitchEngine.build({

        width:
          appState.design.width,

        height:
          appState.design.height,

        unit:
          appState.design.unit,

        hoop:
          appState.design.hoop,

        fabric:
          appState.design.fabric,

        garment:
          appState.design.garment,

        colors:
          appState.design.colors,

        description:
          appState.design.description

      });

  } catch (error) {

    console.error(
      "Stitch engine error:",
      error
    );


    setPreviewStatus(
      "Engine error"
    );


    if (generateButton) {

      generateButton.disabled =
        false;

    }


    return;

  }


  /*
   * Engine validation failed.
   */

  if (
    !result ||
    !result.success
  ) {

    console.warn(
      "Engine validation result:",
      result
    );


    if (
      result &&
      result.validation
    ) {

      displayEngineValidation(
        result.validation
      );

    }


    setPreviewStatus(
      "Engine validation failed"
    );


    if (generateButton) {

      generateButton.disabled =
        false;

    }


    return;

  }


  /*
   * Store engine result.
   */

  appState.generatedDesign =
    result.design;


  appState.stitches =
    result.stitches || [];


  appState.statistics =
    result.statistics || null;


  /*
   * Update statistics.
   */

  updateEngineStatistics(
    result.statistics
  );


  /*
   * Draw actual generated stitch
   * geometry on canvas.
   */

  drawStitchPreview(
    result.stitches
  );


  /*
   * Update placeholder.
   */

  if (previewPlaceholder) {

    previewPlaceholder.innerHTML = `

      <div class="placeholder-icon">
        🧵
      </div>

      <strong>
        Stitch data generated
      </strong>

      <span>
        Current geometry passed the
        available engine validation.
      </span>

    `;

  }


  /*
   * Update quality badge.
   */

  if (qualityBadge) {

    qualityBadge.textContent =
      "Engine ready";


    qualityBadge.style.color =
      "var(--success)";


    qualityBadge.style.background =
      "rgba(101, 230, 154, 0.08)";

  }


  setPreviewStatus(
    "Stitch data generated"
  );


  console.info(
    "Embroidery design result:",
    result
  );


  if (generateButton) {

    setTimeout(
      () => {

        generateButton.disabled =
          false;

      },
      300
    );

  }

}


/* =========================================================
   15. ENGINE STATISTICS
   ========================================================= */

function updateEngineStatistics(
  stats
) {

  if (!stats) {
    return;
  }


  if (stitchCount) {

    stitchCount.textContent =
      Number(
        stats.totalStitches || 0
      ).toLocaleString();

  }


  if (colorCount) {

    colorCount.textContent =
      String(
        stats.colors || 0
      );

  }


  if (estimatedTime) {

    const minutes =
      Number(
        stats.estimatedTimeMinutes ||
        0
      );


    if (minutes < 1) {

      estimatedTime.textContent =
        "< 1 min";

    } else {

      estimatedTime.textContent =
        `${minutes.toFixed(1)} min`;

    }

  }


  if (jumpCount) {

    jumpCount.textContent =
      Number(
        stats.jumps || 0
      ).toLocaleString();

  }

}


/* =========================================================
   16. STITCH PREVIEW
   ========================================================= */

function drawStitchPreview(
  stitches
) {

  if (
    !stitchCanvas ||
    !Array.isArray(stitches) ||
    stitches.length === 0
  ) {

    return;

  }


  const context =
    stitchCanvas.getContext(
      "2d"
    );


  if (!context) {
    return;
  }


  /*
   * Canvas dimensions are already prepared
   * by updateCanvasSize().
   */

  const canvasWidth =
    stitchCanvas.clientWidth;


  const canvasHeight =
    stitchCanvas.clientHeight;


  if (
    !canvasWidth ||
    !canvasHeight
  ) {

    return;

  }


  context.clearRect(
    0,
    0,
    canvasWidth,
    canvasHeight
  );


  /*
   * Ignore machine commands while drawing
   * the visual stitch path.
   */

  const visibleStitches =
    stitches.filter(
      (stitch) =>

        stitch.type !==
          "jump" &&

        stitch.type !==
          "trim" &&

        stitch.type !==
          "color_change"

    );


  if (
    visibleStitches.length === 0
  ) {

    return;

  }


  const xs =
    visibleStitches.map(
      (stitch) => stitch.x
    );


  const ys =
    visibleStitches.map(
      (stitch) => stitch.y
    );


  const minX =
    Math.min(...xs);


  const maxX =
    Math.max(...xs);


  const minY =
    Math.min(...ys);


  const maxY =
    Math.max(...ys);


  const designWidth =
    Math.max(
      maxX - minX,
      0.001
    );


  const designHeight =
    Math.max(
      maxY - minY,
      0.001
    );


  const padding = 30;


  const scaleX =
    (
      canvasWidth -
      padding * 2
    ) /
    designWidth;


  const scaleY =
    (
      canvasHeight -
      padding * 2
    ) /
    designHeight;


  const scale =
    Math.min(
      scaleX,
      scaleY
    );


  function mapX(x) {

    return (

      (x - minX) *
        scale +

      padding +

      (
        canvasWidth -
        padding * 2 -
        designWidth * scale
      ) / 2

    );

  }


  function mapY(y) {

    return (

      (y - minY) *
        scale +

      padding +

      (
        canvasHeight -
        padding * 2 -
        designHeight * scale
      ) / 2

    );

  }


  /*
   * Main stitch path.
   */

  context.beginPath();


  let started =
    false;


  visibleStitches.forEach(
    (stitch) => {

      const x =
        mapX(stitch.x);


      const y =
        mapY(stitch.y);


      if (!started) {

        context.moveTo(
          x,
          y
        );


        started = true;

      } else {

        context.lineTo(
          x,
          y
        );

      }

    }
  );


  context.lineWidth =
    1.5;


  context.lineCap =
    "round";


  context.lineJoin =
    "round";


  context.strokeStyle =
    "#C7FF2F";


  context.stroke();


  /*
   * Small stitch points.
   */

  const pointStep =
    Math.max(
      1,
      Math.floor(
        visibleStitches.length /
        250
      )
    );


  context.fillStyle =
    "#65E69A";


  for (
    let i = 0;
    i < visibleStitches.length;
    i += pointStep
  ) {

    const stitch =
      visibleStitches[i];


    const x =
      mapX(stitch.x);


    const y =
      mapY(stitch.y);


    context.beginPath();


    context.arc(
      x,
      y,
      1.2,
      0,
      Math.PI * 2
    );


    context.fill();

  }

}


/* =========================================================
   17. ENGINE VALIDATION DISPLAY
   ========================================================= */

function displayEngineValidation(
  validation
) {

  if (!validation) {
    return;
  }


  const messages = [];


  if (
    validation.size &&
    Array.isArray(
      validation.size.errors
    )
  ) {

    messages.push(
      ...validation.size.errors
    );

  }


  if (
    validation.stitches &&
    Array.isArray(
      validation.stitches.errors
    )
  ) {

    messages.push(
      ...validation.stitches.errors
    );

  }


  if (
    messages.length > 0
  ) {

    setPreviewStatus(
      messages[0]
    );


    console.warn(
      "Engine validation:",
      messages
    );

  }

}


/* =========================================================
   18. PREVIEW STATUS
   ========================================================= */

function setPreviewStatus(
  message
) {

  if (!previewStatus) {
    return;
  }


  previewStatus.textContent =
    message;


  if (
    message ===
      "Stitch data generated" ||
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
   19. VALIDATION MESSAGE
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
   20. STATISTICS PLACEHOLDER
   ========================================================= */

function updateStatisticsPlaceholder() {

  if (stitchCount) {

    stitchCount.textContent =
      "—";

  }


  if (colorCount) {

    colorCount.textContent =
      "—";

  }


  if (estimatedTime) {

    estimatedTime.textContent =
      "—";

  }


  if (jumpCount) {

    jumpCount.textContent =
      "—";

  }

}


/* =========================================================
   21. REFERENCE IMAGE
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


      /*
       * Only metadata is stored for now.
       *
       * Later this image will be sent to
       * the AI vision/geometry backend.
       */

      appState.design.referenceImage = {

        name:
          file.name,

        type:
          file.type,

        size:
          file.size

      };


      updateUploadBox(
        file
      );

    }
  );

}


function updateUploadBox(
  file
) {

  const uploadBox =
    document.querySelector(
      ".upload-box"
    );


  if (!uploadBox) {
    return;
  }


  const strong =
    uploadBox.querySelector(
      "strong"
    );


  const small =
    uploadBox.querySelector(
      "small"
    );


  if (strong) {

    strong.textContent =
      file.name;

  }


  if (small) {

    small.textContent =
      formatFileSize(
        file.size
      );

  }

}


function formatFileSize(
  bytes
) {

  if (
    bytes < 1024
  ) {

    return `${bytes} B`;

  }


  if (
    bytes <
    1024 * 1024
  ) {

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
   22. CANVAS PREPARATION
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


  if (
    !width ||
    !height
  ) {

    return;

  }


  const devicePixelRatio =
    window.devicePixelRatio ||
    1;


  stitchCanvas.width =
    Math.floor(
      width *
      devicePixelRatio
    );


  stitchCanvas.height =
    Math.floor(
      height *
      devicePixelRatio
    );


  stitchCanvas.style.width =
    `${width}px`;


  stitchCanvas.style.height =
    `${height}px`;


  const context =
    stitchCanvas.getContext(
      "2d"
    );


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
   23. PREVIEW CONTROLS
   ========================================================= */

function bindPreviewControls() {

  if (fitPreviewButton) {

    fitPreviewButton.addEventListener(
      "click",
      () => {

        updateCanvasSize();


        if (
          appState.stitches.length
        ) {

          drawStitchPreview(
            appState.stitches
          );

        }

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
    () => {

      updateCanvasSize();


      if (
        appState.stitches.length
      ) {

        drawStitchPreview(
          appState.stitches
        );

      }

    }
  );

}


function resetPreview() {

  updateDesignState();

  updatePreviewInformation();

  updateCanvasSize();


  appState.generatedDesign =
    null;


  appState.stitches =
    [];


  appState.statistics =
    null;


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
   24. CANVAS CLEAR
   ========================================================= */

function clearCanvas() {

  if (!stitchCanvas) {
    return;
  }


  const context =
    stitchCanvas.getContext(
      "2d"
    );


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
   25. SETTINGS
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
   26. THEME
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

      Number(
        designWidth.value
      ) !== 4 ||

      Number(
        designHeight.value
      ) !== 4

    )

  );

}


/* =========================================================
   27. LOCAL STORAGE
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
      JSON.parse(
        saved
      );


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
   28. NUMBER FORMAT
   ========================================================= */

function formatNumber(
  value
) {

  if (
    !Number.isFinite(value)
  ) {

    return "—";

  }


  return Number.isInteger(value)

    ? String(value)

    : value.toFixed(2);

}


/* =========================================================
   29. EXPORT PROTECTION
   ========================================================= */

exportButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        /*
         * Real export is intentionally
         * locked until the production
         * embroidery encoder is implemented.
         */

        if (button.disabled) {

          console.info(
            `${button.dataset.format} export is not available yet.`
          );


          setPreviewStatus(
            "Export engine is not available yet"
          );


          return;

        }


        /*
         * Future:
         *
         * DST encoder
         * PES encoder
         * EXP encoder
         * etc.
         */

      }
    );

  }
);


/* =========================================================
   30. GLOBAL APP START
   ========================================================= */

initializeApp();


/* =========================================================
   END OF APPLICATION CONTROLLER
   ========================================================= */
