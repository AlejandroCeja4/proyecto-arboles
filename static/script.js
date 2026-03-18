const svg = document.getElementById('tree-svg');
const linksGroup = document.getElementById('links-group');
const nodesGroup = document.getElementById('nodes-group');
const input = document.getElementById('node-value');
const xInput = document.getElementById('x-value');
const addBtn = document.getElementById('add-btn');
const evalBtn = document.getElementById('evaluate-btn');
const resetBtn = document.getElementById('reset-btn');
const traversalResult = document.getElementById('traversal-result');
const evalBox = document.getElementById('evaluation-result');
const errorBox = document.getElementById('error-box');
const statusBubble = document.getElementById('status-bubble');
const nextStepBtn = document.getElementById('next-step-btn');
const indicatorsContainer = document.getElementById('indicators-container');

let treeData = null;
const NODE_RADIUS = 25;
const VERTICAL_SPACING = 80;

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
}

async function fetchTree() {
    try {
        const response = await fetch('/tree');
        treeData = await response.json();
        renderTree();
    } catch {
        showError("Error al cargar el árbol");
    }
}

async function addNode() {
    clearError();

    const value = input.value.trim();
    if (!value) {
        showError("Ingrese una expresión válida");
        return;
    }

    input.value = '';

    try {
        const response = await fetch('/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.detail || "Error al agregar");
            return;
        }

        if (result.status === 'error') {
            showError(result.message);
            return;
        }

        treeData = result.tree;
        renderTree();
        showStatus(`Expresión ${value} añadida`);
    } catch {
        showError("Error de conexión");
    }
}

async function evaluateTree() {
    clearError();

    const x = xInput.value;

    if (x === '') {
        showError("Ingrese un valor de x");
        return;
    }

    try {
        const response = await fetch('/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x })
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.detail || "Error al evaluar");
            return;
        }

        renderEvaluation(result.resultados);
        showStatus(`Evaluado con x = ${x}`);
    } catch {
        showError("Error de conexión");
    }
}

function renderEvaluation(resultados) {
    evalBox.innerHTML = '';

    resultados.forEach(item => {
        const div = document.createElement('div');

        if (item.error) {
            div.textContent = `${item.expresion} → ${item.error}`;
            div.style.color = "red";
        } else {
            div.textContent = `${item.expresion} = ${item.resultado}`;
        }

        evalBox.appendChild(div);
    });
}

async function resetTree() {
    clearError();

    try {
        await fetch('/reset', { method: 'POST' });
        treeData = null;
        renderTree();
        traversalResult.innerHTML = '';
        evalBox.innerHTML = '';
        showStatus('Árbol reiniciado');
        stopAnimation();
    } catch {
        showError("Error al reiniciar");
    }
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

    group.appendChild(circle);
    group.appendChild(text);
    nodesGroup.appendChild(group);
}

let isAnimating = false;
let animationSteps = [];
let currentStepIndex = 0;
let visitCount = 1;
let currentIndicators = {};

function createIndicators(orderType) {
    indicatorsContainer.innerHTML = '';
    currentIndicators = {};

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

function showStatus(text, isError = false) {
    statusBubble.textContent = text;
    statusBubble.classList.remove('hidden', 'error');
    if (isError) statusBubble.classList.add('error');
    setTimeout(() => statusBubble.classList.add('hidden'), 4000);
}

addBtn.addEventListener('click', addNode);
evalBtn.addEventListener('click', evaluateTree);
input.addEventListener('keypress', e => e.key === 'Enter' && addNode());
resetBtn.addEventListener('click', resetTree);
nextStepBtn.addEventListener('click', () => handleNextStep());

document.querySelectorAll('.traversal-btn').forEach(btn => {
    btn.addEventListener('click', () => startTraversal(btn.dataset.type));
});

window.addEventListener('resize', renderTree);
fetchTree();
