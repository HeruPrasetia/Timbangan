const canvas = document.getElementById('canvas-container');
const propForm = document.getElementById('prop-form');
const noSelectionMsg = document.getElementById('no-selection-msg');
const saveBtn = document.getElementById('save-layout-btn');
const closeBtn = document.getElementById('close-btn');
const paperSelect = document.getElementById('paper-size-select');
const templateNameInput = document.getElementById('template-name');
const templateTypeSelect = document.getElementById('template-type');

// Get Template ID from URL
const urlParams = new URLSearchParams(window.location.search);
const currentTemplateId = urlParams.get('id');

// Paper Dimensions (Pixel at 96 DPI)
// A4: 210mm x 297mm -> 794px x 1123px
const PAPER_SIZES = {
    'A4': { width: 794, height: 1123 },
    'A4_LANDSCAPE': { width: 1123, height: 794 },
    'A5': { width: 559, height: 794 },
    'A5_LANDSCAPE': { width: 794, height: 559 },
    'LETTER': { width: 816, height: 1056 },
    'HALF_LETTER': { width: 816, height: 528 } // Approx Continuous Form
};

// Handle Paper Change
paperSelect.addEventListener('change', () => {
    const size = PAPER_SIZES[paperSelect.value];
    if (size) {
        setCanvasSize(size.width, size.height);
    }
});

function setCanvasSize(w, h) {
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

// Property Inputs
const propText = document.getElementById('prop-text');
const propX = document.getElementById('prop-x');
const propY = document.getElementById('prop-y');
const propWidth = document.getElementById('prop-width');
const propHeight = document.getElementById('prop-height');
const propFontSize = document.getElementById('prop-fontSize');
const propFontWeight = document.getElementById('prop-fontWeight');
const propTextAlign = document.getElementById('prop-textAlign');
const deleteElemBtn = document.getElementById('delete-elem-btn');

let elements = [];
let selectedElementId = null;
let draggedToolType = null;
let draggedToolData = null;

// Generate UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Drag & Drop from Sidebar
document.querySelectorAll('.tool-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedToolType = item.getAttribute('data-type');
        if (draggedToolType === 'field') {
            draggedToolData = { field: item.getAttribute('data-field'), text: item.innerText };
        } else if (draggedToolType === 'label') {
            draggedToolData = { text: item.getAttribute('data-text') };
        } else {
            draggedToolData = {};
        }
        e.dataTransfer.effectAllowed = "copy";
    });
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedToolType) {
        createElement(draggedToolType, x, y, draggedToolData);
        draggedToolType = null;
        draggedToolData = null;
    }
});

function createElement(type, x, y, data = {}) {
    const id = uuidv4();
    const elModel = {
        id: id,
        type: type,
        x: Math.round(x),
        y: Math.round(y),
        width: type === 'line' ? 200 : (type === 'rect' ? 100 : 'auto'),
        height: type === 'rect' ? 100 : 'auto',
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        text: data.text || (type === 'label' ? 'Label' : `[${data.field}]`),
        field: data.field || null
    };

    elements.push(elModel);
    renderElement(elModel);
    selectElement(id);
}

function renderElement(model) {
    let el = document.getElementById(model.id);
    if (!el) {
        el = document.createElement('div');
        el.id = model.id;
        el.className = 'design-element';

        // Resize handle for rect/line
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        el.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e, model.id);
        });

        el.addEventListener('mousedown', (e) => onElementMouseDown(e, model.id));
        canvas.appendChild(el);
    }

    // Apply Styles
    el.style.left = model.x + 'px';
    el.style.top = model.y + 'px';
    el.style.fontSize = model.fontSize + 'px';
    el.style.fontWeight = model.fontWeight;
    el.style.textAlign = model.textAlign;

    if (model.type === 'line') {
        el.style.width = model.width + 'px';
        el.style.height = '2px';
        el.style.background = 'black';
        el.textContent = '';
    } else if (model.type === 'rect') {
        el.style.width = model.width + 'px';
        el.style.height = model.height + 'px';
        el.style.border = '1px solid black';
        el.textContent = '';
    } else {
        // Text based
        el.textContent = model.text;
    }

    // Re-check handle (especially if textContent overwrote it)
    let handle = el.querySelector('.resize-handle');
    if (!handle) {
        handle = document.createElement('div');
        handle.className = 'resize-handle';
        el.appendChild(handle);
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e, model.id);
        });
    }

    if (selectedElementId === model.id) {
        el.classList.add('selected');
    } else {
        el.classList.remove('selected');
    }
}

// Selection & Dragging on Canvas
let isDragging = false;
let isResizing = false;
let dragTargetId = null;
let resizeTargetId = null;
let startX, startY;
let origX, origY, origW, origH;

function onElementMouseDown(e, id) {
    if (e.target.classList.contains('resize-handle')) return;

    e.stopPropagation();
    selectElement(id);
    isDragging = true;
    dragTargetId = id;
    startX = e.clientX;
    startY = e.clientY;

    const model = elements.find(e => e.id === id);
    origX = model.x;
    origY = model.y;
}

function startResize(e, id) {
    console.log('Start Resize', id);
    selectElement(id);
    isResizing = true;
    resizeTargetId = id;
    startX = e.clientX;
    startY = e.clientY;

    const model = elements.find(e => e.id === id);
    origW = parseInt(model.width) || 0;
    origH = parseInt(model.height) || 0;

    // Line special case (height is fixed 2px, only width changes)
}

window.addEventListener('mousemove', (e) => {
    if (isDragging && dragTargetId) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const model = elements.find(e => e.id === dragTargetId);
        model.x = origX + dx;
        model.y = origY + dy;

        // Snap to grid (10px)
        model.x = Math.round(model.x / 10) * 10;
        model.y = Math.round(model.y / 10) * 10;

        renderElement(model);
        updateProps(model);
    }

    if (isResizing && resizeTargetId) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const model = elements.find(e => e.id === resizeTargetId);
        model.width = Math.max(10, origW + dx);
        if (model.type === 'rect') {
            model.height = Math.max(10, origH + dy);
        }

        renderElement(model);
        updateProps(model);
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    dragTargetId = null;
    resizeTargetId = null;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas) {
        selectElement(null);
    }
});

function selectElement(id) {
    selectedElementId = id;

    // Update visual selection
    document.querySelectorAll('.design-element').forEach(el => el.classList.remove('selected'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('selected');

        const model = elements.find(e => e.id === id);
        showProps(model);
    } else {
        hideProps();
    }
}

// Property Logic
function showProps(model) {
    noSelectionMsg.style.display = 'none';
    propForm.style.display = 'block';

    propText.value = model.text || '';
    propX.value = model.x;
    propY.value = model.y;
    propWidth.value = model.width === 'auto' ? '' : model.width;
    propHeight.value = model.height === 'auto' ? '' : model.height;
    propFontSize.value = model.fontSize || 14;
    propFontWeight.value = model.fontWeight || 'normal';
    propTextAlign.value = model.textAlign || 'left';
}

function updateProps(model) {
    if (selectedElementId === model.id) {
        propX.value = model.x;
        propY.value = model.y;
        propWidth.value = model.width === 'auto' ? '' : model.width;
        propHeight.value = model.height === 'auto' ? '' : model.height;
    }
}

function hideProps() {
    noSelectionMsg.style.display = 'block';
    propForm.style.display = 'none';
}

function updateModelFromProps() {
    if (!selectedElementId) return;
    const model = elements.find(e => e.id === selectedElementId);

    model.text = propText.value;
    model.x = parseInt(propX.value) || 0;
    model.y = parseInt(propY.value) || 0;
    model.width = propWidth.value === '' ? 'auto' : parseInt(propWidth.value);
    model.height = propHeight.value === '' ? 'auto' : parseInt(propHeight.value);
    model.fontSize = parseInt(propFontSize.value) || 14;
    model.fontWeight = propFontWeight.value;
    model.textAlign = propTextAlign.value;

    renderElement(model);
}

// Add event listeners to all inputs
[propText, propX, propY, propWidth, propHeight, propFontSize, propFontWeight, propTextAlign].forEach(input => {
    input.addEventListener('input', updateModelFromProps);
});

deleteElemBtn.addEventListener('click', () => {
    if (selectedElementId) {
        const idx = elements.findIndex(e => e.id === selectedElementId);
        if (idx !== -1) {
            elements.splice(idx, 1);
            const el = document.getElementById(selectedElementId);
            if (el) el.remove();
            selectElement(null);
        }
    }
});

// Load / Save Logic
// Using window.opener.electronAPI if opened as a child, or window.electronAPI if checking context
// ideally main.js injects preload so window.electronAPI exists.

async function init() {
    try {
        let result;

        if (currentTemplateId) {
            // Edit Existing
            result = await window.electronAPI.getTemplateById(currentTemplateId);
            if (result.success && result.template) {
                const tpl = result.template;
                templateNameInput.value = tpl.name;
                if (tpl.trx_type) templateTypeSelect.value = tpl.trx_type;

                // Parse Content
                const data = JSON.parse(tpl.content);
                // Restore Dimensions
                if (data.width && data.height) {
                    setCanvasSize(data.width, data.height);
                    // Match Paper Select
                    for (const [key, val] of Object.entries(PAPER_SIZES)) {
                        if (val.width === data.width && val.height === data.height) {
                            paperSelect.value = key;
                            break;
                        }
                    }
                }

                if (data.elements) {
                    elements = data.elements;
                    elements.forEach(renderElement);
                }
            }
        } else {
            // Create New: Default to A5 Landscape
            setCanvasSize(PAPER_SIZES.A5_LANDSCAPE.width, PAPER_SIZES.A5_LANDSCAPE.height);
        }
    } catch (e) {
        console.error("Error loading template", e);
    }
}

saveBtn.addEventListener('click', async () => {
    const name = templateNameInput.value.trim();
    if (!name) {
        alert('Mohon isi Nama Template terlebih dahulu.');
        return;
    }

    const trxType = templateTypeSelect.value;

    // Current Canvas Size
    const w = parseInt(canvas.style.width);
    const h = parseInt(canvas.style.height);

    const layout = {
        width: w,
        height: h,
        elements: elements
    };

    const jsonString = JSON.stringify(layout);

    try {
        // Save to DB
        const result = await window.electronAPI.saveTemplate({
            id: currentTemplateId,
            name: name,
            content: jsonString,
            trx_type: trxType
        });

        if (result.success) {
            alert('Template berhasil disimpan!');
            // If it was a new template, we might want to reload to get the ID, but for now user can close
            if (!currentTemplateId) {
                // Optional: refresh or close
                if (confirm('Simpan berhasil. Tutup desainer?')) {
                    window.close();
                }
            }
        } else {
            alert('Gagal menyimpan: ' + result.error);
        }
    } catch (e) {
        alert('RPC Error: ' + e);
    }
});

closeBtn.addEventListener('click', () => {
    window.close();
});

// Init
init();
