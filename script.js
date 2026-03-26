const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STORAGE_KEY = "household-budget-planner-model-v1";
const AUTOSAVE_INTERVAL_MS = 30000;
const CHART_COLORS = ["#0f766e", "#d97706", "#2563eb", "#be185d", "#6d28d9", "#15803d", "#b45309", "#0f172a"];

const state = {
  planningYear: 2026,
  startingBalance: 5000,
  incomes: [
    {
      id: crypto.randomUUID(),
      name: "Primary paycheck",
      amount: 2800,
      allocationPercent: 100,
      postTaxMaxAmount: 3025,
      postTaxMaxStartDate: "2026-09-01",
      bonusAmount: 4000,
      bonusFrequency: "quarterly",
      bonusTiming: "start",
      frequency: "biweekly",
      startDate: "2026-01-09",
    },
    {
      id: crypto.randomUUID(),
      name: "Partner paycheck",
      amount: 2200,
      allocationPercent: 100,
      postTaxMaxAmount: 0,
      postTaxMaxStartDate: "",
      bonusAmount: 0,
      bonusFrequency: "none",
      bonusTiming: "end",
      frequency: "semimonthly",
      startDate: "2026-01-15",
    },
  ],
  fixedCosts: [
    { id: crypto.randomUUID(), name: "Rent / mortgage", amount: 2100, category: "Housing", frequency: "monthly", startDate: "2026-01-01" },
    { id: crypto.randomUUID(), name: "Insurance", amount: 340, category: "Insurance", frequency: "monthly", startDate: "2026-01-01" },
    { id: crypto.randomUUID(), name: "Groceries", amount: 180, category: "Food", frequency: "weekly", startDate: "2026-01-01" },
    { id: crypto.randomUUID(), name: "Utilities", amount: 240, category: "Utilities", frequency: "monthly", startDate: "2026-01-01" },
    { id: crypto.randomUUID(), name: "Streaming + apps", amount: 55, category: "Subscriptions", frequency: "monthly", startDate: "2026-01-01" },
  ],
  discretionarySpending: [
    { id: crypto.randomUUID(), name: "Dining out", amount: 350, category: "Dining", frequency: "monthly", startDate: "2026-01-01" },
    { id: crypto.randomUUID(), name: "Shopping", amount: 175, category: "Shopping", frequency: "monthly", startDate: "2026-01-01" },
  ],
  oneOffDiscretionary: [
    { id: crypto.randomUUID(), name: "Spring trip", amount: 1800, category: "Travel", date: "2026-04-18" },
  ],
};

const els = {
  planningYear: document.querySelector("#planningYear"),
  startingBalance: document.querySelector("#startingBalance"),
  incomeList: document.querySelector("#incomeList"),
  fixedList: document.querySelector("#fixedList"),
  discretionaryList: document.querySelector("#discretionaryList"),
  oneOffList: document.querySelector("#oneOffList"),
  addIncome: document.querySelector("#addIncome"),
  addFixed: document.querySelector("#addFixed"),
  sortFixed: document.querySelector("#sortFixed"),
  addDiscretionary: document.querySelector("#addDiscretionary"),
  sortDiscretionary: document.querySelector("#sortDiscretionary"),
  addOneOff: document.querySelector("#addOneOff"),
  sortOneOff: document.querySelector("#sortOneOff"),
  saveModel: document.querySelector("#saveModel"),
  exportModel: document.querySelector("#exportModel"),
  importModel: document.querySelector("#importModel"),
  importModelInput: document.querySelector("#importModelInput"),
  loadModel: document.querySelector("#loadModel"),
  resetModel: document.querySelector("#resetModel"),
  saveStatus: document.querySelector("#saveStatus"),
  summaryCards: document.querySelector("#summaryCards"),
  spendingChart: document.querySelector("#spendingChart"),
  spendingLegend: document.querySelector("#spendingLegend"),
  cashflowTrendChart: document.querySelector("#cashflowTrendChart"),
  trendChartTooltip: document.querySelector("#trendChartTooltip"),
  forecastBody: document.querySelector("#forecastBody"),
  incomeTemplate: document.querySelector("#incomeTemplate"),
  expenseTemplate: document.querySelector("#expenseTemplate"),
  oneOffTemplate: document.querySelector("#oneOffTemplate"),
};

let autosaveTimerId = null;

init();

function init() {
  loadSavedModel({ silent: true });
  hydrateTopLevelInputs();
  wireTopLevelInputs();
  wireAddButtons();
  wirePersistenceButtons();
  wireTrendChartTooltip();
  startAutosave();
  renderAll();
}

function hydrateTopLevelInputs() {
  els.planningYear.value = state.planningYear;
  els.startingBalance.value = state.startingBalance;
}

function wireTopLevelInputs() {
  els.planningYear.addEventListener("input", (event) => {
    state.planningYear = clampYear(Number(event.target.value) || new Date().getFullYear());
    normalizeIncomeDates();
    queueAutosave();
    renderAll();
  });

  els.startingBalance.addEventListener("input", (event) => {
    state.startingBalance = Number(event.target.value) || 0;
    queueAutosave();
    renderAll();
  });
}

function wireAddButtons() {
  els.addIncome.addEventListener("click", () => {
    state.incomes.push({
      id: crypto.randomUUID(),
      name: "New income",
      amount: 0,
      allocationPercent: 100,
      postTaxMaxAmount: 0,
      postTaxMaxStartDate: "",
      bonusAmount: 0,
      bonusFrequency: "none",
      bonusTiming: "end",
      frequency: "monthly",
      startDate: formatDateForInput(new Date(state.planningYear, 0, 1)),
    });
    queueAutosave();
    renderAll();
  });

  els.addFixed.addEventListener("click", () => {
    state.fixedCosts.push(makeExpense("New fixed cost"));
    queueAutosave();
    renderAll();
  });

  els.addDiscretionary.addEventListener("click", () => {
    state.discretionarySpending.push(makeExpense("New discretionary item"));
    queueAutosave();
    renderAll();
  });

  els.addOneOff.addEventListener("click", () => {
    state.oneOffDiscretionary.push({
      id: crypto.randomUUID(),
      name: "New one-off expense",
      amount: 0,
      category: "",
      date: formatDateForInput(new Date(state.planningYear, 0, 1)),
    });
    queueAutosave();
    renderAll();
  });

  els.sortFixed.addEventListener("click", () => {
    sortItemsByDate(state.fixedCosts, "startDate");
    queueAutosave();
    renderAll();
  });

  els.sortDiscretionary.addEventListener("click", () => {
    sortItemsByDate(state.discretionarySpending, "startDate");
    queueAutosave();
    renderAll();
  });

  els.sortOneOff.addEventListener("click", () => {
    sortItemsByDate(state.oneOffDiscretionary, "date");
    queueAutosave();
    renderAll();
  });
}

function wirePersistenceButtons() {
  els.saveModel.addEventListener("click", saveModelToStorage);
  els.exportModel.addEventListener("click", exportModelToFile);
  els.importModel.addEventListener("click", () => {
    els.importModelInput.click();
  });
  els.importModelInput.addEventListener("change", importModelFromFile);
  els.loadModel.addEventListener("click", () => {
    const loaded = loadSavedModel();
    if (loaded) {
      renderAll();
    }
  });
  els.resetModel.addEventListener("click", resetSavedModel);
}

function makeExpense(name) {
  return {
    id: crypto.randomUUID(),
    name,
    amount: 0,
    category: "",
    frequency: "monthly",
    startDate: formatDateForInput(new Date(state.planningYear, 0, 1)),
  };
}

function renderAll() {
  renderIncomeList();
  renderExpenseList(els.fixedList, state.fixedCosts, "fixedCosts");
  renderExpenseList(els.discretionaryList, state.discretionarySpending, "discretionarySpending");
  renderOneOffList();
  renderForecast();
}

function renderIncomeList() {
  els.incomeList.replaceChildren(...state.incomes.map((income) => createIncomeNode(income)));
}

function renderExpenseList(container, items, key) {
  container.replaceChildren(...items.map((item) => createExpenseNode(item, key)));
}

function renderOneOffList() {
  els.oneOffList.replaceChildren(...state.oneOffDiscretionary.map((item) => createOneOffNode(item)));
}

function createIncomeNode(income) {
  const fragment = els.incomeTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".item-card");
  const fields = fragment.querySelectorAll("[data-field]");
  const bonusOnlyFields = fragment.querySelectorAll(".bonus-only");
  fields.forEach((field) => {
    const name = field.dataset.field;
    field.value = income[name];
    field.addEventListener("input", (event) => {
      const value =
        name === "amount" ||
        name === "allocationPercent" ||
        name === "postTaxMaxAmount" ||
        name === "bonusAmount"
          ? Number(event.target.value) || 0
          : event.target.value;
      income[name] = name === "allocationPercent" ? clampPercentage(value) : value;
      if (name === "bonusFrequency") {
        toggleBonusFields(bonusOnlyFields, income.bonusFrequency);
      }
      queueAutosave();
      renderForecast();
    });
  });
  toggleBonusFields(bonusOnlyFields, income.bonusFrequency);

  fragment.querySelector(".delete-row").addEventListener("click", () => {
    state.incomes = state.incomes.filter((item) => item.id !== income.id);
    queueAutosave();
    renderAll();
  });

  card.dataset.id = income.id;
  return fragment;
}

function toggleBonusFields(nodes, bonusFrequency) {
  const hide = bonusFrequency === "none";
  nodes.forEach((node) => {
    node.classList.toggle("is-hidden", hide);
  });
}

function createExpenseNode(item, key) {
  const fragment = els.expenseTemplate.content.cloneNode(true);
  const fields = fragment.querySelectorAll("[data-field]");
  fields.forEach((field) => {
    const name = field.dataset.field;
    field.value = item[name];
    field.addEventListener("input", (event) => {
      const raw = event.target.value;
      const value = name === "amount" ? Number(raw) || 0 : raw;
      item[name] = value;
      queueAutosave();
      renderForecast();
    });
  });

  fragment.querySelector(".delete-row").addEventListener("click", () => {
    state[key] = state[key].filter((entry) => entry.id !== item.id);
    queueAutosave();
    renderAll();
  });

  return fragment;
}

function createOneOffNode(item) {
  const fragment = els.oneOffTemplate.content.cloneNode(true);
  const fields = fragment.querySelectorAll("[data-field]");
  fields.forEach((field) => {
    const name = field.dataset.field;
    field.value = item[name];
    field.addEventListener("input", (event) => {
      item[name] = name === "amount" ? Number(event.target.value) || 0 : event.target.value;
      queueAutosave();
      renderForecast();
    });
  });

  fragment.querySelector(".delete-row").addEventListener("click", () => {
    state.oneOffDiscretionary = state.oneOffDiscretionary.filter((entry) => entry.id !== item.id);
    queueAutosave();
    renderAll();
  });

  return fragment;
}

function renderForecast() {
  const months = buildMonthlyForecast();
  const spendingByCategory = buildAnnualSpendingByCategory();
  const annual = months.reduce(
    (acc, month) => {
      acc.income += month.income;
      acc.fixed += month.fixed;
      acc.discretionary += month.discretionary;
      acc.oneOff += month.oneOff;
      return acc;
    },
    { income: 0, fixed: 0, discretionary: 0, oneOff: 0 },
  );

  const totalExpenses = annual.fixed + annual.discretionary + annual.oneOff;
  const yearNet = annual.income - totalExpenses;
  const averageMonthlyFlexFund = (annual.income - annual.fixed) / 12;
  const finalBalance = state.startingBalance + yearNet;
  const tightest = months.reduce((lowest, month) => (month.lowestBalance < lowest.lowestBalance ? month : lowest), months[0]);

  renderSummaryCards([
    {
      label: "Planning year",
      value: String(state.planningYear),
      note: "Current budget window",
      tone: "",
    },
    {
      label: "Tightest month",
      value: tightest.month,
      note: formatCurrency(tightest.lowestBalance),
      tone: tightest.lowestBalance >= 0 ? "" : "negative",
    },
    {
      label: "Average monthly flex fund",
      value: formatCurrency(averageMonthlyFlexFund),
      note: "Income minus fixed costs, divided by 12",
      tone: averageMonthlyFlexFund >= 0 ? "positive" : "negative",
    },
    {
      label: "Average monthly surplus",
      value: formatCurrency(yearNet / 12),
      note: "Helpful for buffer planning",
      tone: yearNet >= 0 ? "positive" : "negative",
    },
    {
      label: "Annual income",
      value: formatCurrency(annual.income),
      note: `${months.reduce((sum, month) => sum + month.paychecks, 0)} paychecks modeled`,
      tone: "positive",
    },
    {
      label: "Annual spending",
      value: formatCurrency(totalExpenses),
      note: "Fixed + discretionary + one-off",
      tone: totalExpenses > annual.income ? "negative" : "",
    },
    {
      label: "Net cashflow",
      value: formatCurrency(yearNet),
      note: "Before starting balance",
      tone: yearNet >= 0 ? "positive" : "negative",
    },
    {
      label: "Projected year-end balance",
      value: formatCurrency(finalBalance),
      note: "Starting cash plus annual net",
      tone: finalBalance >= 0 ? "positive" : "negative",
    },
  ]);
  renderSpendingChart(spendingByCategory);
  renderCashflowTrendChart(months);

  const rows = months.map((month) => {
    const tr = document.createElement("tr");
    if (month.monthIndex === tightest.monthIndex) {
      tr.classList.add("tight-month");
    }
    tr.innerHTML = `
      <td>${month.month}</td>
      <td>${month.paychecks}</td>
      <td>${formatCurrency(month.income)}</td>
      <td>${formatCurrency(month.fixed)}</td>
      <td>${formatCurrency(month.discretionary + month.oneOff)}</td>
      <td class="${month.net >= 0 ? "positive" : "negative"}">${formatCurrency(month.net)}</td>
      <td class="${month.endingBalance >= 0 ? "positive" : "negative"}">${formatCurrency(month.endingBalance)}</td>
    `;
    return tr;
  });

  els.forecastBody.replaceChildren(...rows);
}

function renderSummaryCards(cards) {
  const nodes = cards.map((card) => {
    const article = document.createElement("article");
    article.className = `summary-card ${card.tone}`.trim();
    article.innerHTML = `
      <span class="label">${card.label}</span>
      <strong>${card.value}</strong>
      <small>${card.note}</small>
    `;
    return article;
  });
  els.summaryCards.replaceChildren(...nodes);
}

function buildMonthlyForecast() {
  const months = monthNames.map((month, monthIndex) => ({
    month,
    monthIndex,
    paychecks: 0,
    income: 0,
    fixed: 0,
    discretionary: 0,
    oneOff: 0,
    net: 0,
    endingBalance: 0,
    lowestBalance: Infinity,
    hasEvents: false,
  }));

  const events = [
    ...buildIncomeEvents(),
    ...buildExpenseEvents(state.fixedCosts, "fixed"),
    ...buildExpenseEvents(state.discretionarySpending, "discretionary"),
    ...buildOneOffEvents(),
  ].sort(compareEvents);

  let runningBalance = state.startingBalance;

  events.forEach((event) => {
    const month = months[event.date.getMonth()];
      if (!month.hasEvents) {
        month.lowestBalance = runningBalance;
      }
    if (event.type === "income") {
      month.paychecks += event.meta.paycheck ? 1 : 0;
      month.income += event.amount;
      month.net += event.amount;
      runningBalance += event.amount;
    } else {
      month[event.type] += event.amount;
      month.net -= event.amount;
      runningBalance -= event.amount;
    }
    month.hasEvents = true;
    month.lowestBalance = Math.min(month.lowestBalance, runningBalance);
    month.endingBalance = runningBalance;
  });

  let carryBalance = state.startingBalance;
  months.forEach((month) => {
    if (!month.hasEvents) {
      month.endingBalance = carryBalance;
      month.lowestBalance = carryBalance;
    } else {
      carryBalance = month.endingBalance;
    }
  });

  return months;
}

function buildIncomeEvents() {
  const events = [];
  state.incomes.forEach((income) => {
    if (!income.startDate) {
      return;
    }

    const paychecksByMonth = buildIncomePaychecks(income);
    paychecksByMonth.forEach((paychecks, monthIndex) => {
      paychecks.forEach((paycheckDate, paycheckArrayIndex) => {
        let amount = getPaycheckAmount(income, paycheckDate);
        if (shouldApplyBonus(income, monthIndex, paycheckArrayIndex, paychecks.length)) {
          amount += income.bonusAmount || 0;
        }
        amount *= getAllocationMultiplier(income);
        events.push({
          date: paycheckDate,
          amount,
          type: "income",
          meta: { paycheck: true },
        });
      });
    });
  });
  return events;
}

function buildExpenseEvents(items, type) {
  return items.flatMap((item) => buildRecurringEvents(item, type));
}

function buildRecurringEvents(item, type) {
  if (!item.startDate) {
    return [];
  }

  const startDate = normalizeDateToPlanningYear(parseInputDate(item.startDate));
  if (!startDate) {
    return [];
  }

  if (item.frequency === "monthly") {
    return buildMonthlyCadenceEvents(item, type, startDate, 1);
  }
  if (item.frequency === "quarterly") {
    return buildMonthlyCadenceEvents(item, type, startDate, 3);
  }
  if (item.frequency === "annually") {
    return [makeExpenseEvent(createDateWithClampedDay(state.planningYear, startDate.getMonth(), startDate.getDate()), item.amount, type, item.category)];
  }
  if (item.frequency === "weekly") {
    return buildDayCadenceEvents(item, type, startDate, 7);
  }
  if (item.frequency === "biweekly") {
    return buildDayCadenceEvents(item, type, startDate, 14);
  }
  if (item.frequency === "twiceMonthly") {
    return buildTwiceMonthlyExpenseEvents(item, type, startDate);
  }
  return [];
}

function buildMonthlyCadenceEvents(item, type, startDate, monthStep) {
  const events = [];
  let cursor = createDateWithClampedDay(state.planningYear, startDate.getMonth(), startDate.getDate());
  while (cursor.getFullYear() === state.planningYear) {
    events.push(makeExpenseEvent(cursor, item.amount, type, item.category));
    cursor = addMonthsClamped(cursor, monthStep);
  }
  return events;
}

function buildDayCadenceEvents(item, type, startDate, dayStep) {
  const events = [];
  let cursor = new Date(startDate);
  while (cursor.getFullYear() === state.planningYear) {
    events.push(makeExpenseEvent(cursor, item.amount, type, item.category));
    cursor = addDays(cursor, dayStep);
  }
  return events;
}

function buildTwiceMonthlyExpenseEvents(item, type, startDate) {
  const events = [];
  const firstDay = Math.min(startDate.getDate(), 28);
  const secondDay = firstDay >= 15 ? 28 : Math.min(firstDay + 14, 28);

  for (let monthIndex = startDate.getMonth(); monthIndex < 12; monthIndex += 1) {
    const firstDate = createDateWithClampedDay(state.planningYear, monthIndex, firstDay);
    const secondDate = createDateWithClampedDay(state.planningYear, monthIndex, secondDay);
    if (firstDate >= startDate) {
      events.push(makeExpenseEvent(firstDate, item.amount, type, item.category));
    }
    if (secondDate >= startDate && secondDay !== firstDay) {
      events.push(makeExpenseEvent(secondDate, item.amount, type, item.category));
    }
  }

  return events;
}

function buildOneOffEvents() {
  return state.oneOffDiscretionary.flatMap((item) => {
    if (!item.date) {
      return [];
    }
    const date = normalizeDateToPlanningYear(parseInputDate(item.date));
    if (!date) {
      return [];
    }
    return [makeExpenseEvent(date, item.amount, "oneOff", item.category)];
  });
}

function makeExpenseEvent(date, amount, type, category = "") {
  return {
    date: new Date(date),
    amount,
    type,
    meta: { paycheck: false, category: getCategoryLabel(category) },
  };
}

function buildIncomePaychecks(income) {
  if (income.frequency === "semimonthly") {
    return buildSemiMonthlyPaychecks(income);
  }

  const byMonth = Array.from({ length: 12 }, () => []);
  let cursor = normalizeDateToPlanningYear(parseInputDate(income.startDate));
  if (!cursor) {
    return byMonth;
  }

  while (cursor.getFullYear() === state.planningYear) {
    byMonth[cursor.getMonth()].push(new Date(cursor));
    cursor = advanceIncomeDate(cursor, income.frequency);
  }

  return byMonth;
}

function buildSemiMonthlyPaychecks(income) {
  const byMonth = Array.from({ length: 12 }, () => []);
  const seed = normalizeDateToPlanningYear(parseInputDate(income.startDate));
  if (!seed) {
    return byMonth;
  }
  const firstDay = Math.min(seed.getDate(), 28);
  const secondDay = firstDay >= 15 ? 28 : Math.min(firstDay + 14, 28);
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const firstPayDate = createDateWithClampedDay(state.planningYear, monthIndex, firstDay);
    const secondPayDate = createDateWithClampedDay(state.planningYear, monthIndex, secondDay);

    if (firstPayDate >= seed) {
      byMonth[monthIndex].push(firstPayDate);
    }
    if (secondPayDate >= seed && secondDay !== firstDay) {
      byMonth[monthIndex].push(secondPayDate);
    }
  }
  return byMonth;
}

function getPaycheckAmount(income, paycheckDate) {
  const postTaxMaxStartDate = normalizeDateToPlanningYear(parseInputDate(income.postTaxMaxStartDate));
  if (income.postTaxMaxAmount > 0 && postTaxMaxStartDate && paycheckDate >= postTaxMaxStartDate) {
    return income.postTaxMaxAmount;
  }
  return income.amount;
}

function shouldApplyBonus(income, monthIndex, paycheckArrayIndex, paycheckCount) {
  if (!income.bonusAmount || income.bonusAmount <= 0 || income.bonusFrequency === "none") {
    return false;
  }
  if (paycheckArrayIndex !== paycheckCount - 1) {
    return false;
  }

  if (income.bonusFrequency === "quarterly") {
    return getBonusMonths(income.bonusTiming, [0, 3, 6, 9], [2, 5, 8, 11]).includes(monthIndex);
  }
  if (income.bonusFrequency === "semiannual") {
    return getBonusMonths(income.bonusTiming, [0, 6], [5, 11]).includes(monthIndex);
  }
  if (income.bonusFrequency === "annual") {
    return getBonusMonths(income.bonusTiming, [0], [11]).includes(monthIndex);
  }
  return false;
}

function getBonusMonths(bonusTiming, startMonths, endMonths) {
  return bonusTiming === "start" ? startMonths : endMonths;
}

function advanceIncomeDate(date, frequency) {
  if (frequency === "weekly") {
    return addDays(date, 7);
  }
  if (frequency === "biweekly") {
    return addDays(date, 14);
  }
  if (frequency === "monthly") {
    return addMonthsClamped(date, 1);
  }
  return addMonthsClamped(date, 1);
}

function normalizeIncomeDates() {
  state.incomes.forEach((income) => {
    if (!income.startDate) {
      income.startDate = formatDateForInput(new Date(state.planningYear, 0, 1));
    } else {
      income.startDate = formatDateForInput(normalizeDateToPlanningYear(parseInputDate(income.startDate)));
    }
    if (income.postTaxMaxStartDate) {
      income.postTaxMaxStartDate = formatDateForInput(
        normalizeDateToPlanningYear(parseInputDate(income.postTaxMaxStartDate)),
      );
    }
  });

  [state.fixedCosts, state.discretionarySpending].forEach((group) => {
    group.forEach((item) => {
      if (!item.startDate) {
        item.startDate = formatDateForInput(new Date(state.planningYear, 0, 1));
        return;
      }
      item.startDate = formatDateForInput(normalizeDateToPlanningYear(parseInputDate(item.startDate)));
    });
  });

  state.oneOffDiscretionary.forEach((item) => {
    if (!item.date) {
      item.date = formatDateForInput(new Date(state.planningYear, 0, 1));
      return;
    }
    item.date = formatDateForInput(normalizeDateToPlanningYear(parseInputDate(item.date)));
  });
}

function clampYear(year) {
  return Math.min(2100, Math.max(2020, year));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateForInput(date) {
  if (!date) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function normalizeDateToPlanningYear(date) {
  if (!date) {
    return null;
  }
  return createDateWithClampedDay(state.planningYear, date.getMonth(), date.getDate());
}

function createDateWithClampedDay(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date, monthsToAdd) {
  const targetMonthIndex = date.getMonth() + monthsToAdd;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  return createDateWithClampedDay(targetYear, normalizedMonth, date.getDate());
}

function compareEvents(a, b) {
  const dateDifference = a.date.getTime() - b.date.getTime();
  if (dateDifference !== 0) {
    return dateDifference;
  }
  if (a.type === "income" && b.type !== "income") {
    return -1;
  }
  if (a.type !== "income" && b.type === "income") {
    return 1;
  }
  return 0;
}

function sortItemsByDate(items, field) {
  items.sort(
    (a, b) =>
      compareDateValues(a[field], b[field]) ||
      (Number(b.amount) || 0) - (Number(a.amount) || 0) ||
      a.name.localeCompare(b.name),
  );
}

function compareDateValues(a, b) {
  const dateA = parseInputDate(a);
  const dateB = parseInputDate(b);
  if (!dateA && !dateB) {
    return 0;
  }
  if (!dateA) {
    return 1;
  }
  if (!dateB) {
    return -1;
  }
  return dateA.getTime() - dateB.getTime();
}

function buildAnnualSpendingByCategory() {
  const totals = new Map();
  const spendingEvents = [
    ...buildExpenseEvents(state.fixedCosts, "fixed"),
    ...buildExpenseEvents(state.discretionarySpending, "discretionary"),
    ...buildOneOffEvents(),
  ];

  spendingEvents.forEach((event) => {
    const category = event.meta.category;
    totals.set(category, (totals.get(category) || 0) + event.amount);
  });

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function renderSpendingChart(entries) {
  if (!entries.length) {
    els.spendingChart.style.background =
      "radial-gradient(circle at center, rgba(255, 253, 249, 0.94) 0 34%, transparent 35%), conic-gradient(#d7dce5 0deg 360deg)";
    els.spendingLegend.replaceChildren(createLegendEmptyState());
    return;
  }

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  let currentAngle = 0;
  const gradientParts = entries.map((entry, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const slice = (entry.amount / total) * 360;
    const start = currentAngle;
    const end = currentAngle + slice;
    currentAngle = end;
    return `${color} ${start}deg ${end}deg`;
  });

  els.spendingChart.style.background =
    `radial-gradient(circle at center, rgba(255, 253, 249, 0.94) 0 34%, transparent 35%), conic-gradient(${gradientParts.join(", ")})`;

  const legendNodes = entries.map((entry, index) => {
    const row = document.createElement("div");
    const color = CHART_COLORS[index % CHART_COLORS.length];
    row.className = "legend-row";
    row.innerHTML = `
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-label">${entry.category}</span>
      <span class="legend-value">${formatCurrency(entry.amount)} · ${Math.round((entry.amount / total) * 100)}%</span>
    `;
    return row;
  });

  els.spendingLegend.replaceChildren(...legendNodes);
}

function renderCashflowTrendChart(months) {
  const svg = els.cashflowTrendChart;
  hideTrendChartTooltip();
  const width = 980;
  const height = 360;
  const margin = { top: 20, right: 28, bottom: 56, left: 66 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const netValues = months.map((month) => month.net);
  const endingValues = months.map((month) => month.endingBalance);
  const combinedValues = [...netValues, ...endingValues, 0];
  const minValue = Math.min(...combinedValues);
  const maxValue = Math.max(...combinedValues);
  const tickCount = 5;
  const niceScale = buildNiceAxis(minValue, maxValue, tickCount);
  const paddedMin = niceScale.min;
  const paddedMax = niceScale.max;
  const yScale = (value) =>
    margin.top + ((paddedMax - value) / (paddedMax - paddedMin || 1)) * chartHeight;
  const zeroY = yScale(0);
  const slotWidth = chartWidth / months.length;
  const barWidth = Math.min(42, slotWidth * 0.54);

  const gridValues = niceScale.ticks;
  const gridLines = gridValues
    .map((value) => {
      const y = yScale(value);
      return `
        <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="rgba(31,36,48,0.10)" />
        <text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" fill="#596173" font-size="12">${escapeHtml(formatCurrency(value))}</text>
      `;
    })
    .join("");

  const bars = months
    .map((month, index) => {
      const x = margin.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const y = month.net >= 0 ? yScale(month.net) : zeroY;
      const heightValue = Math.max(2, Math.abs(yScale(month.net) - zeroY));
      const color = month.net >= 0 ? "#0f766e" : "#b04a42";
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${heightValue}" fill="${color}" opacity="0.82"></rect>`;
    })
    .join("");

  const linePoints = months
    .map((month, index) => {
      const x = margin.left + slotWidth * index + slotWidth / 2;
      const y = yScale(month.endingBalance);
      return `${x},${y}`;
    })
    .join(" ");

  const pointDots = months
    .map((month, index) => {
      const x = margin.left + slotWidth * index + slotWidth / 2;
      const y = yScale(month.endingBalance);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#2563eb" stroke="white" stroke-width="2"></circle>`;
    })
    .join("");

  const labels = months
    .map((month, index) => {
      const x = margin.left + slotWidth * index + slotWidth / 2;
      return `<text x="${x}" y="${height - 20}" text-anchor="middle" fill="#596173" font-size="12">${escapeHtml(month.month.slice(0, 3))}</text>`;
    })
    .join("");

  const hitAreas = months
    .map((month, index) => {
      const x = margin.left + slotWidth * index;
      const payload = escapeHtml(
        JSON.stringify({
          month: month.month,
          net: month.net,
          endingBalance: month.endingBalance,
        }),
      );
      return `
        <rect
          class="trend-chart-hit"
          x="${x}"
          y="${margin.top}"
          width="${slotWidth}"
          height="${chartHeight}"
          fill="transparent"
          tabindex="0"
          role="button"
          aria-label="${escapeHtml(`${month.month}: net cashflow ${formatCurrency(month.net)}, ending balance ${formatCurrency(month.endingBalance)}`)}"
          data-tooltip="${payload}"
        ></rect>
      `;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="transparent"></rect>
    ${gridLines}
    <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="rgba(31,36,48,0.18)" />
    ${bars}
    <polyline fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${linePoints}"></polyline>
    ${pointDots}
    ${labels}
    ${hitAreas}
    <g transform="translate(${margin.left + 12}, 18)">
      <rect x="0" y="0" width="190" height="52" rx="14" fill="rgba(255,255,255,0.92)" stroke="rgba(31,36,48,0.10)"></rect>
      <rect x="14" y="14" width="14" height="14" fill="#0f766e" opacity="0.82"></rect>
      <text x="38" y="26" fill="#1f2430" font-size="13">Net cashflow</text>
      <line x1="14" y1="38" x2="28" y2="38" stroke="#2563eb" stroke-width="3.5" />
      <circle cx="21" cy="38" r="4" fill="#2563eb" stroke="white" stroke-width="1.5"></circle>
      <text x="38" y="42" fill="#1f2430" font-size="13">Ending balance</text>
    </g>
  `;
}

function wireTrendChartTooltip() {
  const svg = els.cashflowTrendChart;

  svg.addEventListener("pointermove", (event) => {
    const target = event.target.closest("[data-tooltip]");
    if (!target) {
      hideTrendChartTooltip();
      return;
    }
    showTrendChartTooltip(target, event.clientX, event.clientY);
  });

  svg.addEventListener("pointerleave", () => {
    hideTrendChartTooltip();
  });

  svg.addEventListener("focusin", (event) => {
    const target = event.target.closest("[data-tooltip]");
    if (!target) {
      return;
    }
    const rect = target.getBoundingClientRect();
    showTrendChartTooltip(target, rect.left + rect.width / 2, rect.top);
  });

  svg.addEventListener("focusout", (event) => {
    if (svg.contains(event.relatedTarget)) {
      return;
    }
    hideTrendChartTooltip();
  });
}

function showTrendChartTooltip(target, clientX, clientY) {
  const tooltip = els.trendChartTooltip;
  const panel = tooltip.parentElement;
  const payload = target.dataset.tooltip;
  if (!payload || !panel) {
    return;
  }

  const data = JSON.parse(payload);
  tooltip.innerHTML = `
    <strong>${escapeHtml(data.month)}</strong>
    <span>Net cashflow: ${escapeHtml(formatCurrency(data.net))}</span>
    <span>Ending balance: ${escapeHtml(formatCurrency(data.endingBalance))}</span>
  `;
  tooltip.classList.remove("is-hidden");
  tooltip.setAttribute("aria-hidden", "false");

  const panelRect = panel.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth || 184;
  const xPadding = tooltipWidth / 2 + 12;
  const x = Math.min(Math.max(clientX - panelRect.left, xPadding), panelRect.width - xPadding);
  const y = Math.max(clientY - panelRect.top, 28);

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTrendChartTooltip() {
  els.trendChartTooltip.classList.add("is-hidden");
  els.trendChartTooltip.setAttribute("aria-hidden", "true");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNiceAxis(minValue, maxValue, tickCount) {
  const safeMin = Number.isFinite(minValue) ? minValue : 0;
  const safeMax = Number.isFinite(maxValue) ? maxValue : 0;

  if (safeMin === safeMax) {
    const padding = safeMin === 0 ? 1 : Math.abs(safeMin) * 0.2;
    return buildNiceAxis(safeMin - padding, safeMax + padding, tickCount);
  }

  const rawRange = niceNumber(safeMax - safeMin, false);
  const step = niceNumber(rawRange / (tickCount - 1), true);
  const niceMin = Math.floor(safeMin / step) * step;
  const niceMax = Math.ceil(safeMax / step) * step;
  const ticks = [];

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(Math.round(value));
  }

  return {
    min: niceMin,
    max: niceMax,
    ticks,
  };
}

function niceNumber(value, round) {
  const exponent = Math.floor(Math.log10(Math.abs(value) || 1));
  const fraction = value / 10 ** exponent;
  let niceFraction;

  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

function createLegendEmptyState() {
  const row = document.createElement("div");
  row.className = "legend-row";
  row.innerHTML = `
    <span class="legend-swatch" style="background:#d7dce5"></span>
    <span class="legend-label">No spending yet</span>
    <span class="legend-value">Add categories to see the mix</span>
  `;
  return row;
}

function getCategoryLabel(category) {
  const trimmed = String(category || "").trim();
  return trimmed || "Uncategorized";
}

function getAllocationMultiplier(income) {
  return clampPercentage(Number(income.allocationPercent) || 0) / 100;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

function saveModelToStorage() {
  saveModelToStorageInternal(false);
}

function saveModelToStorageInternal(isAutosave) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getSerializableState()));
    setSaveStatus(`${isAutosave ? "Auto-saved" : "Saved"} ${new Date().toLocaleString()}`);
  } catch {
    setSaveStatus(`Could not ${isAutosave ? "auto-save" : "save"} this model in the browser.`);
  }
}

function loadSavedModel(options = {}) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!options.silent) {
        setSaveStatus("No saved model found.");
      }
      return false;
    }

    const parsed = JSON.parse(raw);
    applySavedState(parsed);
    hydrateTopLevelInputs();
    if (!options.silent) {
      setSaveStatus("Loaded saved model.");
    }
    return true;
  } catch {
    if (!options.silent) {
      setSaveStatus("Could not load the saved model.");
    }
    return false;
  }
}

function resetSavedModel() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    setSaveStatus("Saved model cleared.");
  } catch {
    setSaveStatus("Could not clear the saved model.");
  }
}

function applySavedState(saved) {
  state.planningYear = clampYear(Number(saved.planningYear) || state.planningYear);
  state.startingBalance = Number(saved.startingBalance) || 0;
  state.incomes = normalizeSavedIncomes(saved.incomes);
  state.fixedCosts = [
    ...normalizeSavedExpenses(saved.fixedCosts),
    ...normalizeSavedExpenses(saved.recurringSpending),
  ];
  state.discretionarySpending = normalizeSavedExpenses(saved.discretionarySpending);
  state.oneOffDiscretionary = normalizeSavedOneOff(saved.oneOffDiscretionary);
}

function normalizeSavedIncomes(items = []) {
  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || "Income",
    amount: Number(item.amount) || 0,
    allocationPercent: clampPercentage(
      item.allocationPercent === undefined ? 100 : Number(item.allocationPercent) || 0,
    ),
    postTaxMaxAmount: Number(item.postTaxMaxAmount) || 0,
    postTaxMaxStartDate: item.postTaxMaxStartDate || "",
    bonusAmount: Number(item.bonusAmount) || 0,
    bonusFrequency: item.bonusFrequency || "none",
    bonusTiming: item.bonusTiming || "end",
    frequency: item.frequency || "monthly",
    startDate: item.startDate || formatDateForInput(new Date(state.planningYear, 0, 1)),
  }));
}

function normalizeSavedExpenses(items = []) {
  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || "Expense",
    amount: Number(item.amount) || 0,
    category: item.category || "",
    frequency: item.frequency || "monthly",
    startDate: item.startDate || formatDateForInput(new Date(state.planningYear, 0, 1)),
  }));
}

function normalizeSavedOneOff(items = []) {
  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || "One-off expense",
    amount: Number(item.amount) || 0,
    category: item.category || "",
    date: item.date || formatDateForInput(new Date(state.planningYear, 0, 1)),
  }));
}

function setSaveStatus(message) {
  els.saveStatus.textContent = message;
}

function getSerializableState() {
  return {
    planningYear: state.planningYear,
    startingBalance: state.startingBalance,
    incomes: state.incomes,
    fixedCosts: state.fixedCosts,
    discretionarySpending: state.discretionarySpending,
    oneOffDiscretionary: state.oneOffDiscretionary,
  };
}

function exportModelToFile() {
  try {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      model: getSerializableState(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `household-budget-${state.planningYear}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveStatus("Model exported to JSON file.");
  } catch {
    setSaveStatus("Could not export the model.");
  }
}

function importModelFromFile(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const model = parsed.model || parsed;
      applySavedState(model);
      hydrateTopLevelInputs();
      renderAll();
      queueAutosave();
      setSaveStatus(`Imported ${file.name}`);
    } catch {
      setSaveStatus("Could not import that file.");
    } finally {
      els.importModelInput.value = "";
    }
  };
  reader.onerror = () => {
    setSaveStatus("Could not read that file.");
    els.importModelInput.value = "";
  };
  reader.readAsText(file);
}

function startAutosave() {
  window.setInterval(() => {
    saveModelToStorageInternal(true);
  }, AUTOSAVE_INTERVAL_MS);
}

function queueAutosave() {
  window.clearTimeout(autosaveTimerId);
  autosaveTimerId = window.setTimeout(() => {
    saveModelToStorageInternal(true);
  }, 1200);
}
