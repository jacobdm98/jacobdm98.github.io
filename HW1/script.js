const P = 17;
const A = 0;
const B = 7;

// Modulo arithmetic helper supporting negative numbers
function mod(n, m) {
    return ((n % m) + m) % m;
}

// Modular inverse using Extended Euclidean Algorithm
function modInverse(a, m) {
    a = mod(a, m);
    let t = 0, newT = 1;
    let r = m, newR = a;
    while (newR !== 0) {
        let quotient = Math.floor(r / newR);
        let tempT = t - quotient * newT;
        t = newT;
        newT = tempT;
        let tempR = r - quotient * newR;
        r = newR;
        newR = tempR;
    }
    if (r > 1) return null; // Not invertible
    if (t < 0) t = t + m;
    return t;
}

// Check if (x, y) is on y^2 = x^3 + 7 (mod 17)
function isOnCurve(x, y) {
    if (x === null && y === null) return true; // Point at infinity
    let lhs = mod(y * y, P);
    let rhs = mod(x * x * x + A * x + B, P);
    return lhs === rhs;
}

// Find all valid points on the curve (y^2 = x^3 + 7 mod 17)
function findAllPoints() {
    let points = [];
    points.push({ x: null, y: null, label: 'O (Infinity)' });
    for (let x = 0; x < P; x++) {
        let rhs = mod(x * x * x + A * x + B, P);
        for (let y = 0; y < P; y++) {
            if (mod(y * y, P) === rhs) {
                points.push({ x: x, y: y, label: `(${x}, ${y})` });
            }
        }
    }
    return points;
}

// Point addition: P1 + P2
function pointAdd(P1, P2) {
    if (P1.x === null && P1.y === null) return P2;
    if (P2.x === null && P2.y === null) return P1;

    let x1 = P1.x, y1 = P1.y;
    let x2 = P2.x, y2 = P2.y;

    if (x1 === x2 && mod(y1 + y2, P) === 0) {
        return { x: null, y: null }; // Point at infinity
    }

    let m;
    if (x1 === x2 && y1 === y2) {
        // Point doubling: m = (3*x1^2 + A) / (2*y1)
        let num = mod(3 * x1 * x1 + A, P);
        let denInv = modInverse(2 * y1, P);
        if (denInv === null) return { x: null, y: null };
        m = mod(num * denInv, P);
    } else {
        // Point addition: m = (y2 - y1) / (x2 - x1)
        let num = mod(y2 - y1, P);
        let denInv = modInverse(x2 - x1, P);
        if (denInv === null) return { x: null, y: null };
        m = mod(num * denInv, P);
    }

    let x3 = mod(m * m - x1 - x2, P);
    let y3 = mod(m * (x1 - x3) - y1, P);
    return { x: x3, y: y3 };
}

// Scalar multiplication: k * G
function scalarMultiply(k, G) {
    let current = { x: null, y: null };
    let addend = { x: G.x, y: G.y };
    let steps = [];

    let temp = { x: G.x, y: G.y };
    for (let i = 1; i <= k; i++) {
        steps.push({ i: i, point: { ...temp } });
        temp = pointAdd(temp, G);
    }
    return steps;
}

// UI Elements
const allPoints = findAllPoints();
const basePointSelect = document.getElementById('basePointSelect');
const privateKeyInput = document.getElementById('privateKeyInput');
const calcBtn = document.getElementById('calcBtn');
const resultOutput = document.getElementById('resultOutput');
const canvas = document.getElementById('curveCanvas');
const ctx = canvas.getContext('2d');

// Populate dropdown
allPoints.forEach((pt, idx) => {
    if (pt.x !== null) {
        let opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = pt.label;
        if (pt.x === 1 && pt.y === 5) opt.selected = true; // Default G = (1, 5)
        basePointSelect.appendChild(opt);
    }
});

function drawCanvas(highlightPoints = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let cellSize = canvas.width / P;

    // Draw grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let i = 0; i <= P; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }

    // Draw all curve points
    allPoints.forEach(pt => {
        if (pt.x === null) return;
        let px = pt.x * cellSize + cellSize / 2;
        let py = (P - 1 - pt.y) * cellSize + cellSize / 2; // Invert y for canvas coordinate system

        let isHighlighted = highlightPoints.some(hp => hp.x === pt.x && hp.y === pt.y);

        ctx.fillStyle = isHighlighted ? '#000' : '#888';
        ctx.beginPath();
        ctx.arc(px, py, isHighlighted ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function compute() {
    let k = parseInt(privateKeyInput.value);
    if (isNaN(k) || k < 1) {
        resultOutput.textContent = "Please enter a valid positive private key k.";
        return;
    }

    let selectedIdx = parseInt(basePointSelect.value);
    let G = allPoints[selectedIdx];

    let steps = scalarMultiply(k, G);
    let finalPoint = steps[steps.length - 1].point;

    let outputStr = `Base Point = (${G.x}, ${G.y})\n`;
    outputStr += `Private Key = ${k}\n`;
    outputStr += `------------------------------------\n`;

    steps.forEach(step => {
        let ptStr = step.point.x === null ? "O (Infinity)" : `(${step.point.x}, ${step.point.y})`;
        outputStr += `${step.i}G = ${ptStr}\n`;
    });

    outputStr += `------------------------------------\n`;
    let finalStr = finalPoint.x === null ? "O (Infinity)" : `(${finalPoint.x}, ${finalPoint.y})`;
    outputStr += `PUBLIC KEY = ${finalStr}`;

    resultOutput.textContent = outputStr;
    drawCanvas([G, finalPoint]);
}

calcBtn.addEventListener('click', compute);

// Canvas click to select point
canvas.addEventListener('click', (e) => {
    let rect = canvas.getBoundingClientRect();
    let cellSize = canvas.width / P;
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;

    let gridX = Math.floor(clickX / cellSize);
    let gridY = P - 1 - Math.floor(clickY / cellSize);

    let matchIdx = allPoints.findIndex(pt => pt.x === gridX && pt.y === gridY);
    if (matchIdx !== -1) {
        basePointSelect.value = matchIdx;
        compute();
    }
});


document.getElementById('runStatsBtn')?.addEventListener('click', () => {
    let selectedIdx = parseInt(basePointSelect.value);
    let G = allPoints[selectedIdx];
    
    // Test k from 1 to 18 (full cycle for generator G=(1,5))
    let xCounts = {};
    let yCounts = {};
    let bitCounts = { '0': 0, '1': 0 };

    let steps = scalarMultiply(18, G);
    steps.forEach(step => {
        if (step.point.x !== null) {
            xCounts[step.point.x] = (xCounts[step.point.x] || 0) + 1;
            yCounts[step.point.y] = (yCounts[step.point.y] || 0) + 1;

            // Bit distribution of x coordinate (5-bit representation for mod 17)
            let bin = step.point.x.toString(2).padStart(5, '0');
            for (let char of bin) {
                if (char === '0') bitCounts['0']++;
                if (char === '1') bitCounts['1']++;
            }
        }
    });

    let report = `=== STATISTICAL ANALYSIS REPORT (Base Point: ${G.label}) ===\n\n`;
    report += `1. Frequency of X Coordinates (over 18 steps):\n` + JSON.stringify(xCounts, null, 2) + `\n\n`;
    report += `2. Frequency of Y Coordinates:\n` + JSON.stringify(yCounts, null, 2) + `\n\n`;
    report += `3. Bit Distribution (X coordinate binary bits):\n   0s: ${bitCounts['0']}, 1s: ${bitCounts['1']}\n\n`;
    report += `4. Discussion Notes:\n`;
    report += `- Apparent Uniformity: Locally sequential, globally scattered across finite field.\n`;
    report += `- Avalanche/Correlation: Changing k by +1 yields Q + G (rigid algebraic shift, not random bit avalanche like SHA-256).\n`;
    report += `- Cryptographic Meaning: One-way function property relies on Discrete Logarithm hardness, whereas hash functions prioritize total destruction of algebraic structure and 50% avalanche effect.`;

    document.getElementById('statsOutput').textContent = report;
});


// Initial render
compute();