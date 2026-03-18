const svg = document.getElementById('tree-svg');
const linksGroup = document.getElementById('links-group');
const nodesGroup = document.getElementById('nodes-group');
const input = document.getElementById('node-value');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const traversalResult = document.getElementById('traversal-result');
const statusBubble = document.getElementById('status-bubble');
const nextStepBtn = document.getElementById('next-step-btn');
const indicatorsContainer = document.getElementById('indicators-container');

let treeData = null;
const NODE_RADIUS = 25;
const VERTICAL_SPACING = 80;

async function fetchTree() {
    const response = await fetch('/tree');
    treeData = await response.json();
    renderTree();
}

async function addNode() {
    const value = parseInt(input.value);
    if (isNaN(value)) return;

    input.value = '';
    const response = await fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
    });

    const result = await response.json();
    if (result.status === 'error') {
        showStatus(result.message, true);
    } else {
        treeData = result.tree;
        renderTree();
        showStatus(`Nodo ${value} añadido`);
    }
}

async function resetTree() {
    await fetch('/reset', { method: 'POST' });
    treeData = null;
    renderTree();
    traversalResult.innerHTML = '';
    showStatus('Árbol reiniciado');
    stopAnimation();

}
async function balanceTree(){
    const response = await fetch('/balance', {method:'POST'});
    treeData = await response.json();
    renderTree();
    showStatus("Árbol equilibrado");
}

async function randomTree(){
    const response = await fetch('/random', {method:'POST'});
    treeData = await response.json();
    renderTree();
    showStatus("Árbol aleatorio generado");
}

async function deleteNode(){
    const value = parseInt(input.value);
    if(isNaN(value)) return;

    const response = await fetch('/delete',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({value})
    });

    treeData = await response.json();
    renderTree();
    showStatus("Nodo eliminado");
}

async function deleteSubtree(){
    const value = parseInt(input.value);
    if(isNaN(value)) return;

    const response = await fetch('/subtree',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({value})
    });

    treeData = await response.json();
    renderTree();
    showStatus("Subárbol eliminado");
}

async function createExpressionTree() {
    const expr = document.getElementById("expression-input").value;
    if (!expr) return;

    const response = await fetch('/expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expr })
    });

    const result = await response.json();
    treeData = result.tree;
    renderTree();
    showStatus("Árbol de expresión creado");

    setupVariables(result.variables);
}

function setupVariables(variables) {
    const container = document.getElementById("variables-container");
    const inputsDiv = document.getElementById("variables-inputs");
    inputsDiv.innerHTML = '';

    if (variables && variables.length > 0) {
        container.classList.remove("hidden");
        variables.forEach(v => {
            const group = document.createElement("div");
            group.className = "var-input-group";
            group.innerHTML = `
                <label>${v}</label>
                <input type="number" data-var="${v}" value="0">
            `;
            inputsDiv.appendChild(group);
        });
    } else {
        container.classList.add("hidden");
    }
}

async function evaluateExpression() {
    const inputs = document.querySelectorAll("#variables-inputs input");
    const values = {};
    inputs.forEach(input => {
        values[input.dataset.var] = parseFloat(input.value) || 0;
    });

    const response = await fetch('/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
    });

    const result = await response.json();
    document.getElementById("evaluation-result").textContent = `Resultado: ${result.result}`;
}

async function loadJSON(){
    const file = document.getElementById("json-file").files[0];
    const text = await file.text();

    const response = await fetch('/load_json',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:text
    });

    treeData = await response.json();
    renderTree();
    showStatus("JSON cargado");
}
const HORIZONTAL_SPACING_BASE = 50;

function renderTree() {
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';
    if (!treeData) return;

    // Calculate depth to adjust height
    const getDepth = (node) => {
        if (!node) return 0;
        return 1 + Math.max(getDepth(node.izquierda), getDepth(node.derecha));
    };
    const depth = getDepth(treeData);
    
    // Total displacement from root to leaf
    let initialSpacing = Math.pow(2, depth - 2) * HORIZONTAL_SPACING_BASE;
    if (depth <= 1) initialSpacing = 0;
    
    let totalDisplacement = 0;
    let tempSpacing = initialSpacing;
    for (let i = 0; i < depth - 1; i++) {
        totalDisplacement += tempSpacing;
        tempSpacing /= 2;
    }

    const margin = 100;
    const requiredWidth = totalDisplacement * 2 + margin * 2;
    const svgWidth = Math.max(window.innerWidth - 320, requiredWidth);
    const svgHeight = Math.max(500, (depth + 1) * VERTICAL_SPACING + 100);

    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // Initial X: Center the tree in the calculated width
    calculatePositions(treeData, svgWidth / 2, 60, initialSpacing);
    drawTree(treeData);
}

function calculatePositions(node, x, y, spacing, id = "root") {
    if (!node) return;
    node.id = id;
    node.x = x;
    node.y = y;

    if (node.izquierda) {
        calculatePositions(node.izquierda, x - spacing, y + VERTICAL_SPACING, spacing / 2, id + "L");
    }
    if (node.derecha) {
        calculatePositions(node.derecha, x + spacing, y + VERTICAL_SPACING, spacing / 2, id + "R");
    }
}

function drawTree(node) {
    if (!node) return;

    if (node.izquierda) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", node.x);
        line.setAttribute("y1", node.y);
        line.setAttribute("x2", node.izquierda.x);
        line.setAttribute("y2", node.izquierda.y);
        line.setAttribute("id", `link-${node.id}-${node.izquierda.id}`);
        line.classList.add("node-link");
        linksGroup.appendChild(line);
        drawTree(node.izquierda);
    }
    if (node.derecha) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", node.x);
        line.setAttribute("y1", node.y);
        line.setAttribute("x2", node.derecha.x);
        line.setAttribute("y2", node.derecha.y);
        line.setAttribute("id", `link-${node.id}-${node.derecha.id}`);
        line.classList.add("node-link");
        linksGroup.appendChild(line);
        drawTree(node.derecha);
    }

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("node-element");
    group.setAttribute("id", `node-${node.id}`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", NODE_RADIUS);
    circle.classList.add("node-circle");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y);
    text.textContent = node.valor;
    text.classList.add("node-text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");

    group.appendChild(circle);
    group.appendChild(text);
    nodesGroup.appendChild(group);
}

// Animation State
let isAnimating = false;
let animationSteps = [];
let currentStepIndex = 0;
let visitCount = 1;
let currentIndicators = {};

function createIndicators(orderType) {
    indicatorsContainer.innerHTML = '';
    currentIndicators = {};

    // Nombres lógicos según tu código
    const config = {
        pre: [{ key: 'root', label: 'R' }, { key: 'left', label: 'I' }, { key: 'right', label: 'D' }],
        in: [{ key: 'left', label: 'I' }, { key: 'root', label: 'R' }, { key: 'right', label: 'D' }],
        post: [{ key: 'left', label: 'I' }, { key: 'right', label: 'D' }, { key: 'root', label: 'R' }]
    };

    config[orderType].forEach(item => {
        const btn = document.createElement('div');
        btn.className = 'indicator';
        btn.textContent = item.label;
        indicatorsContainer.appendChild(btn);
        currentIndicators[item.key] = btn;
    });
}

function stopAnimation() {
    isAnimating = false;
    animationSteps = [];
    currentStepIndex = 0;
    visitCount = 1;
    nextStepBtn.classList.add('hidden');
    document.querySelectorAll('.node-element').forEach(el => {
        el.classList.remove('node-highlighted', 'node-visiting', 'node-scanning');
    });
    document.querySelectorAll('.node-link').forEach(el => el.classList.remove('highlighted'));
    indicatorsContainer.innerHTML = '';
}

async function startTraversal(type) {
    stopAnimation();
    isAnimating = true;

    traversalResult.innerHTML = '';
    createIndicators(type);

    if (type === 'pre') getPreOrderSteps(treeData, null, animationSteps);
    else if (type === 'in') getInOrderSteps(treeData, null, animationSteps);
    else if (type === 'post') getPostOrderSteps(treeData, null, animationSteps);

    nextStepBtn.classList.remove('hidden');
    showStatus('Recorrido iniciado. Pulsa Siguiente Paso.');
}

async function handleNextStep() {
    if (currentStepIndex >= animationSteps.length) {
        showStatus('Recorrido finalizado');
        nextStepBtn.classList.add('hidden');
        isAnimating = false;
        return;
    }

    const step = animationSteps[currentStepIndex++];

    // Highlight indicator
    Object.values(currentIndicators).forEach(el => el.classList.remove('active', 'raíz', 'izquierda', 'derecha'));
    const indicator = currentIndicators[step.type];
    indicator.classList.add('active', step.type === 'root' ? 'raíz' : step.type === 'left' ? 'izquierda' : 'derecha');

    // Clean up scanning for all nodes
    document.querySelectorAll('.node-scanning').forEach(el => el.classList.remove('node-scanning'));

    const nodeEl = document.getElementById(`node-${step.node.id}`);

    if (step.action === 'move') {
        nodeEl.classList.add('node-scanning');
    } else if (step.action === 'visit') {
        // Remove visiting from previous
        document.querySelectorAll('.node-visiting').forEach(el => {
            el.classList.remove('node-visiting');
            el.classList.add('node-highlighted');
        });

        nodeEl.classList.add('node-visiting');

        if (step.parent) {
            const link = document.getElementById(`link-${step.parent.id}-${step.node.id}`);
            if (link) link.classList.add('highlighted');
        }

        const badge = document.createElement('span');
        badge.classList.add('visit-badge');
        badge.textContent = step.node.valor;
        badge.setAttribute('data-order', visitCount++);
        traversalResult.appendChild(badge);
    }
}

function getPreOrderSteps(node, parent, steps) {
    if (!node) return;
    steps.push({ type: 'root', action: 'visit', node, parent });
    if (node.izquierda) {
        steps.push({ type: 'left', action: 'move', node: node.izquierda, parent: node });
        getPreOrderSteps(node.izquierda, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
    if (node.derecha) {
        steps.push({ type: 'right', action: 'move', node: node.derecha, parent: node });
        getPreOrderSteps(node.derecha, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
}

function getInOrderSteps(node, parent, steps) {
    if (!node) return;
    if (node.izquierda) {
        steps.push({ type: 'left', action: 'move', node: node.izquierda, parent: node });
        getInOrderSteps(node.izquierda, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
    steps.push({ type: 'root', action: 'visit', node, parent });
    if (node.derecha) {
        steps.push({ type: 'right', action: 'move', node: node.derecha, parent: node });
        getInOrderSteps(node.derecha, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
}

function getPostOrderSteps(node, parent, steps) {
    if (!node) return;
    if (node.izquierda) {
        steps.push({ type: 'left', action: 'move', node: node.izquierda, parent: node });
        getPostOrderSteps(node.izquierda, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
    if (node.derecha) {
        steps.push({ type: 'right', action: 'move', node: node.derecha, parent: node });
        getPostOrderSteps(node.derecha, node, steps);
        steps.push({ type: 'root', action: 'move', node, parent }); // Move back to root
    }
    steps.push({ type: 'root', action: 'visit', node, parent });
}

function showStatus(text, isError = false) {
    statusBubble.textContent = text;
    statusBubble.classList.remove('hidden', 'error');
    if (isError) statusBubble.classList.add('error');
    setTimeout(() => statusBubble.classList.add('hidden'), 4000);
}

// Event Listeners
addBtn.addEventListener('click', addNode);
input.addEventListener('keypress', (e) => e.key === 'Enter' && addNode());
resetBtn.addEventListener('click', resetTree);
nextStepBtn.addEventListener('click', handleNextStep);

document.querySelectorAll('.traversal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        startTraversal(btn.dataset.type);
    });
});

window.addEventListener('resize', renderTree);
document.getElementById("balance-btn").addEventListener("click", balanceTree);
document.getElementById("random-btn").addEventListener("click", randomTree);
document.getElementById("delete-btn").addEventListener("click", deleteNode);
document.getElementById("subtree-btn").addEventListener("click", deleteSubtree);
document.getElementById("expression-btn").addEventListener("click", createExpressionTree);
document.getElementById("evaluate-btn").addEventListener("click", evaluateExpression);
document.getElementById("load-json-btn").addEventListener("click", loadJSON);

// File input label sync
document.getElementById("json-file").addEventListener("change", (e) => {
    const label = document.querySelector(".file-label");
    label.textContent = e.target.files[0]?.name || "Seleccionar JSON";
});

fetchTree();
