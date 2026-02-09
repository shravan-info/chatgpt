const t = {
  en: {
    ready: 'Your solution will appear here',
    solved: 'Solved in simple steps',
    unable: 'I could not understand this fully. Try a clearer maths expression.',
    answer: 'Final Answer',
    copied: 'Solution copied to clipboard!'
  },
  hi: {
    ready: 'आपका समाधान यहाँ दिखेगा',
    solved: 'सरल चरणों में हल',
    unable: 'मैं इसे पूरी तरह समझ नहीं पाया। कृपया सवाल साफ लिखें।',
    answer: 'अंतिम उत्तर',
    copied: 'समाधान कॉपी हो गया!'
  },
  es: {
    ready: 'Tu solución aparecerá aquí',
    solved: 'Resuelto en pasos simples',
    unable: 'No pude entenderlo por completo. Escribe una expresión más clara.',
    answer: 'Respuesta final',
    copied: '¡Solución copiada!'
  },
  fr: {
    ready: 'Votre solution apparaîtra ici',
    solved: 'Résolu en étapes simples',
    unable: "Je n'ai pas bien compris. Essayez une expression plus claire.",
    answer: 'Réponse finale',
    copied: 'Solution copiée !'
  },
  ar: {
    ready: 'سيظهر الحل هنا',
    solved: 'تم الحل بخطوات بسيطة',
    unable: 'لم أفهم المسألة بالكامل. اكتبها بشكل أوضح.',
    answer: 'الإجابة النهائية',
    copied: 'تم نسخ الحل!'
  }
};

const ui = {
  input: document.getElementById('problemInput'),
  solve: document.getElementById('solveBtn'),
  voice: document.getElementById('voiceBtn'),
  title: document.getElementById('responseTitle'),
  steps: document.getElementById('stepsList'),
  answer: document.getElementById('finalAnswer'),
  detailed: document.getElementById('detailedMode'),
  language: document.getElementById('languageSelect'),
  theme: document.getElementById('themeToggle'),
  history: document.getElementById('historyList'),
  clearHistory: document.getElementById('clearHistoryBtn'),
  responseActions: document.getElementById('responseActions'),
  copy: document.getElementById('copyBtn'),
  download: document.getElementById('downloadBtn')
};

const historyKey = 'maths_solver_history_v1';

function langPack() {
  return t[ui.language.value] || t.en;
}

function safeEval(expr) {
  if (!/^[0-9+\-*/().^\s]+$/.test(expr)) return null;
  const normalized = expr.replace(/\^/g, '**');
  try {
    const value = Function(`"use strict"; return (${normalized})`)();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function solveLinear(problem, detailed) {
  const eq = problem.replace(/\s+/g, '');
  const m = eq.match(/^([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?=([+-]?\d+\.?\d*)$/i);
  if (!m) return null;
  const a = Number(m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : m[1]);
  const b = Number(m[2] || 0);
  const c = Number(m[3]);
  const x = (c - b) / a;
  const steps = [
    `Start with ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}`,
    `Move constant term: ${a}x = ${c - b}`,
    `Divide by ${a}: x = ${(c - b)} / ${a}`
  ];
  if (!detailed) steps.splice(1, 1);
  return { steps, answer: `x = ${x}` };
}

function solveQuadratic(problem, detailed) {
  const eq = problem.replace(/\s+/g, '').replace(/−/g, '-');
  const m = eq.match(/^([+-]?\d*)x\^2([+-]\d*)x([+-]\d+)=0$/i);
  if (!m) return null;
  const a = Number(m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = b * b - 4 * a * c;
  if (d < 0) return { steps: [`Discriminant = ${d} (< 0) so roots are complex.`], answer: 'No real roots' };
  const r1 = (-b + Math.sqrt(d)) / (2 * a);
  const r2 = (-b - Math.sqrt(d)) / (2 * a);
  const steps = [
    `Given ${a}x² + ${b}x + ${c} = 0`,
    `Discriminant D = b² - 4ac = ${d}`,
    `x = (-b ± √D) / 2a = (${(-b)} ± √${d}) / ${2 * a}`
  ];
  if (!detailed) steps.splice(0, 1);
  return { steps, answer: `x₁ = ${r1}, x₂ = ${r2}` };
}

function solvePercentage(problem) {
  const m = problem.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|का|de)?\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const p = Number(m[1]);
  const n = Number(m[2]);
  const value = (p / 100) * n;
  return {
    steps: [`Convert ${p}% to decimal: ${p / 100}`, `Multiply by ${n}: ${(p / 100)} × ${n} = ${value}`],
    answer: `${value}`
  };
}

function solve(problem, detailed = true) {
  return solveLinear(problem, detailed)
    || solveQuadratic(problem, detailed)
    || solvePercentage(problem)
    || (() => {
      const result = safeEval(problem.replace(/[×]/g, '*').replace(/[÷]/g, '/'));
      if (result === null) return null;
      return {
        steps: ['Evaluate the expression using order of operations (BODMAS/PEMDAS).'],
        answer: `${result}`
      };
    })();
}

function renderResult(result) {
  const text = langPack();
  ui.title.textContent = result ? text.solved : text.unable;
  ui.steps.innerHTML = '';
  ui.answer.textContent = '';
  ui.responseActions.classList.toggle('hidden', !result);

  if (!result) return;
  result.steps.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    ui.steps.appendChild(li);
  });
  ui.answer.textContent = `${text.answer}: ${result.answer}`;
}

function saveHistory(problem) {
  const list = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const next = [problem, ...list.filter((item) => item !== problem)].slice(0, 8);
  localStorage.setItem(historyKey, JSON.stringify(next));
  renderHistory();
}

function renderHistory() {
  const list = JSON.parse(localStorage.getItem(historyKey) || '[]');
  ui.history.innerHTML = '';
  list.forEach((item) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = item;
    btn.onclick = () => {
      ui.input.value = item;
      runSolve();
    };
    li.appendChild(btn);
    ui.history.appendChild(li);
  });
}

function runSolve() {
  const problem = ui.input.value.trim();
  if (!problem) return;
  const result = solve(problem, ui.detailed.checked);
  renderResult(result);
  if (result) saveHistory(problem);
}

function copySolution() {
  const stepsText = [...ui.steps.querySelectorAll('li')].map((li, i) => `${i + 1}. ${li.textContent}`).join('\n');
  const fullText = `${ui.input.value}\n\n${stepsText}\n\n${ui.answer.textContent}`;
  navigator.clipboard.writeText(fullText).then(() => alert(langPack().copied));
}

function downloadSolution() {
  const text = `${ui.input.value}\n${ui.answer.textContent}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'maths-solution.txt';
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupVoiceInput() {
  const API = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!API) {
    ui.voice.disabled = true;
    ui.voice.textContent = '🎤 N/A';
    return;
  }
  const recognition = new API();
  recognition.lang = ui.language.value;
  recognition.onresult = (event) => {
    ui.input.value = event.results[0][0].transcript;
    runSolve();
  };
  ui.voice.onclick = () => {
    recognition.lang = ui.language.value;
    recognition.start();
  };
}

ui.solve.addEventListener('click', runSolve);
ui.copy.addEventListener('click', copySolution);
ui.download.addEventListener('click', downloadSolution);
ui.theme.addEventListener('click', () => document.body.classList.toggle('light'));
ui.clearHistory.addEventListener('click', () => {
  localStorage.removeItem(historyKey);
  renderHistory();
});
ui.language.addEventListener('change', () => {
  ui.title.textContent = langPack().ready;
});
document.querySelectorAll('.suggestion').forEach((btn) => {
  btn.addEventListener('click', () => {
    ui.input.value = btn.dataset.problem;
    runSolve();
  });
});

ui.title.textContent = langPack().ready;
renderHistory();
setupVoiceInput();
              
