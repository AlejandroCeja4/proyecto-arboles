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

async function createExpressionTree(){
    const expr = document.getElementById("expression-input").value;

    const response = await fetch('/expression',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expr})
    });

    treeData = await response.json();
    renderTree();
    showStatus("Árbol de expresión creado");
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
function renderTree() {
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';
    if (!treeData) return;

    const width = svg.clientWidth || window.innerWidth - 320;
    calculatePositions(treeData, width / 2, 60, width / 4);
    drawTree(treeData);
}

function calculatePositions(node, x, y, spacing) {
    if (!node) return;
    node.x = x;
    node.y = y;

    if (node.izquierda) {
        calculatePositions(node.izquierda, x - spacing, y + VERTICAL_SPACING, spacing / 2);
    }
    if (node.derecha) {
        calculatePositions(node.derecha, x + spacing, y + VERTICAL_SPACING, spacing / 2);
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
        line.setAttribute("id", `link-${node.valor}-${node.izquierda.valor}`);
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
        line.setAttribute("id", `link-${node.valor}-${node.derecha.valor}`);
        line.classList.add("node-link");
        linksGroup.appendChild(line);
        drawTree(node.derecha);
    }

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("node-element");
    group.setAttribute("id", `node-${node.valor}`);

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

    const nodeEl = document.getElementById(`node-${step.node.valor}`);

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
            const link = document.getElementById(`link-${step.parent.valor}-${step.node.valor}`);
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
document.getElementById("balance-btn").addEventListener("click",balanceTree);
document.getElementById("random-btn").addEventListener("click",randomTree);
document.getElementById("delete-btn").addEventListener("click",deleteNode);
document.getElementById("subtree-btn").addEventListener("click",deleteSubtree);
document.getElementById("expression-btn").addEventListener("click",createExpressionTree);
document.getElementById("load-json-btn").addEventListener("click",loadJSON);
fetchTree();
