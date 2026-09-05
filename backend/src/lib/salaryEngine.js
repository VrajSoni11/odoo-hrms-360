const { evaluate, parse } = require('mathjs');

const ALLOWED_CATEGORIES = new Set(['basic', 'allowance', 'gross', 'deduction', 'net']);
const ALLOWED_METHODS = new Set(['fixed', 'percentage', 'formula']);

function validateFormula(formula, totals) {
  const node = parse(formula);
  node.traverse((child) => {
    if (child.isSymbolNode && !Object.prototype.hasOwnProperty.call(totals, child.name)) {
      throw new Error(`Formula references '${child.name}', but that rule has not been computed yet`);
    }
    if (child.isFunctionNode || child.isAccessorNode || child.isAssignmentNode) {
      throw new Error('Only arithmetic expressions using previously computed rule codes are allowed');
    }
    if (child.isOperatorNode && !['+', '-', '*', '/', '^', '%'].includes(child.op)) {
      throw new Error(`Operator '${child.op}' is not allowed`);
    }
  });
  return node;
}

function computeSalary(rules, baseWage) {
  const totals = { BASE_WAGE: Number(baseWage) };
  const lines = [];
  const orderedRules = [...rules].filter((rule) => rule.isActive !== false).sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  for (const rule of orderedRules) {
    const line = { code: rule.code, name: rule.name, category: rule.category, sequence: rule.sequence, amount: null, error: null };
    try {
      if (!rule.code) throw new Error('Rule code is required');
      if (!ALLOWED_CATEGORIES.has(rule.category)) throw new Error(`Unknown category '${rule.category}'`);
      if (!ALLOWED_METHODS.has(rule.computationMethod)) throw new Error(`Unknown computation method '${rule.computationMethod}'`);

      if (rule.computationMethod === 'fixed') {
        if (rule.amount === null || rule.amount === undefined) throw new Error('Fixed rules require an amount');
        line.amount = Number(rule.amount);
      } else if (rule.computationMethod === 'percentage') {
        if (!rule.percentageOf) throw new Error('Percentage rules require percentageOf');
        if (rule.percentageRate === null || rule.percentageRate === undefined) throw new Error('Percentage rules require percentageRate');
        if (!Object.prototype.hasOwnProperty.call(totals, rule.percentageOf)) throw new Error(`Percentage references '${rule.percentageOf}', but that rule has not been computed yet`);
        line.amount = totals[rule.percentageOf] * Number(rule.percentageRate) / 100;
      } else {
        if (!rule.formula) throw new Error('Formula rules require a formula');
        validateFormula(rule.formula, totals);
        line.amount = Number(evaluate(rule.formula, totals));
      }

      if (!Number.isFinite(line.amount)) throw new Error('Computation did not produce a finite number');
      totals[rule.code] = line.amount;
    } catch (error) {
      line.error = error.message;
    }
    lines.push(line);
  }

  return { lines, totals };
}

module.exports = { computeSalary, ALLOWED_CATEGORIES, ALLOWED_METHODS };