const STORAGE_KEY = "dr-geradores-gestao-v1";

const seed = {
  settings: {
    companyName: "DR Geradores",
    baseAddress: "Rua Gabriel Carone, 107 - Pitangueiras/SP",
    whatsapp: "5516991919231",
    fuelPrice: 6.2,
    truckKmPerLiter: 4,
    defaultKmPrice: 5.5,
  },
  clients: [
    { id: "c1", name: "Fabiana Gimenez", document: "Cliente pessoa física", phone: "5516999990001", city: "Sertãozinho/SP", address: "Espaço de eventos - Sertãozinho/SP" },
    { id: "c2", name: "Arena Cocred", document: "71.328.769/0001-81", phone: "5516999990002", city: "Sertãozinho/SP", address: "Av. João Bombonato, 168 - Sertãozinho/SP" },
  ],
  generators: [
    { id: "g125", name: "Gerador 125 kVA", kva: 125, voltages: ["220 V", "380 V"], phases: ["Bifásico", "Trifásico"], litersHour: 14, extraHour: 200, status: "Disponível" },
    { id: "g180", name: "Gerador 180 kVA", kva: 180, voltages: ["220 V", "380 V", "440 V"], phases: ["Trifásico"], litersHour: 18, extraHour: 300, status: "Disponível" },
    { id: "g260", name: "Gerador 260 kVA", kva: 260, voltages: ["220 V", "380 V", "440 V"], phases: ["Trifásico"], litersHour: 24, extraHour: 500, status: "Disponível" },
  ],
  quotes: [
    {
      id: "q1", number: "ORC-2026-023", clientId: "c1", eventName: "Evento Mont Blanc", eventDate: "2026-11-14", eventEndDate: "2026-11-14", eventAddress: "Espaço Mont Blanc", city: "Sertãozinho/SP", generatorId: "g125", voltage: "220 V", phase: "Trifásico", hours: 8, mode: "Stand-by", accessories: ["20 m de cabo 35 mm", "Aterramento", "Extintor", "Operador técnico"], distanceKm: 96, trips: 2, truckKmPerLiter: 4, fuelPrice: 6.2, tolls: 42, freightCharge: 550, freightWaived: false, emergency: false, emergencyFee: 0, rentalValue: 1800, discount: 0, deposit: 540, fuelLitersGenerator: 35, fuelPriceGenerator: 6.2, otherCostDescription: "Alimentação da equipe", otherCostValue: 90, status: "Confirmado", paymentStatus: "Parcial", paid: 540, dueDate: "2026-11-14", notes: "Montagem às 15h.", checklistDone: ["Gerador testado", "Cabos separados"]
    },
    {
      id: "q2", number: "ORC-2026-024", clientId: "c2", eventName: "Confraternização empresarial", eventDate: "2026-11-22", eventEndDate: "2026-11-22", eventAddress: "Arena Cocred", city: "Sertãozinho/SP", generatorId: "g180", voltage: "220 V", phase: "Trifásico", hours: 12, mode: "Funcionamento", accessories: ["25 m de cabos", "Caixa de passagem", "Aterramento", "Operador técnico"], distanceKm: 110, trips: 2, truckKmPerLiter: 4, fuelPrice: 6.2, tolls: 50, freightCharge: 700, freightWaived: false, emergency: true, emergencyFee: 450, rentalValue: 3200, discount: 150, deposit: 0, fuelLitersGenerator: 180, fuelPriceGenerator: 6.2, otherCostDescription: "Ajudante", otherCostValue: 180, status: "Pendente", paymentStatus: "Pendente", paid: 0, dueDate: "2026-11-20", notes: "Aguardando confirmação do horário.", checklistDone: []
    }
  ],
  extraCosts: [
    { id: "x1", quoteId: "q1", category: "Pedágio", description: "Pedágios do evento", estimated: 42, actual: 42 },
  ]
};

let db = loadDb();
let route = "home";
let calendarCursor = new Date(2026, 10, 1);
let selectedCalendarDate = "2026-11-10";
let quoteFilter = "Todos";
let quoteSearch = "";
let wizard = null;
let toastTimer = null;

const main = document.querySelector("#mainContent");
const drawer = document.querySelector("#drawer");
const overlay = document.querySelector("#overlay");
const sideNav = document.querySelector("#sideNav");
const toast = document.querySelector("#toast");

function loadDb() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}

function saveDb(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  if (message) showToast(message);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function number(value) { return Number(value || 0); }

function dateFromIso(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateLabel(value, options = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  const date = dateFromIso(value);
  return date ? date.toLocaleDateString("pt-BR", options) : "—";
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function clientOf(quote) { return db.clients.find(item => item.id === quote.clientId) || { name: "Cliente não informado", phone: "" }; }
function generatorOf(quote) { return db.generators.find(item => item.id === quote.generatorId) || { name: "Gerador não informado", litersHour: 0 }; }

function quoteTotals(quote) {
  const freightRevenue = quote.freightWaived ? 0 : number(quote.freightCharge);
  const revenue = number(quote.rentalValue) + freightRevenue + number(quote.emergencyFee) - number(quote.discount);
  const freightFuelLiters = number(quote.distanceKm) * number(quote.trips || 1) / Math.max(number(quote.truckKmPerLiter || db.settings.truckKmPerLiter), 1);
  const freightFuelCost = freightFuelLiters * number(quote.fuelPrice || db.settings.fuelPrice);
  const generatorFuelCost = number(quote.fuelLitersGenerator) * number(quote.fuelPriceGenerator || db.settings.fuelPrice);
  const internalCost = freightFuelCost + generatorFuelCost + number(quote.tolls) + number(quote.otherCostValue);
  return { revenue, freightFuelLiters, freightFuelCost, generatorFuelCost, internalCost, result: revenue - internalCost, balance: revenue - number(quote.paid) };
}

function statusClass(status) {
  if (["Confirmado", "Pago", "Disponível"].includes(status)) return "success";
  if (["Vencido", "Cancelado", "Manutenção"].includes(status)) return "danger";
  if (["Pendente", "Parcial"].includes(status)) return "pending";
  return "neutral";
}

function go(nextRoute) {
  route = nextRoute;
  document.querySelectorAll("[data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === route));
  sideNav.classList.remove("open");
  if (!overlay.dataset.drawer) overlay.classList.add("hidden");
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  const pages = { home: renderHome, calendar: renderCalendar, quotes: renderQuotes, finance: renderFinance, clients: renderClients, generators: renderGenerators, settings: renderSettings };
  main.innerHTML = (pages[route] || renderHome)();
}

function renderHome() {
  const quotes = [...db.quotes].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const month = "2026-11";
  const monthQuotes = quotes.filter(q => q.eventDate.startsWith(month));
  const revenue = monthQuotes.reduce((sum, q) => sum + quoteTotals(q).revenue, 0);
  const received = monthQuotes.reduce((sum, q) => sum + number(q.paid), 0);
  const pending = monthQuotes.reduce((sum, q) => sum + Math.max(quoteTotals(q).balance, 0), 0);
  const upcoming = quotes.filter(q => q.eventDate >= "2026-11-10").slice(0, 4);
  return `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">Painel da operação</span>
        <h1>Bom trabalho, equipe DR!</h1>
        <p>Acompanhe eventos, pagamentos e equipamentos em um só lugar.</p>
      </div>
    </section>
    <section class="quick-grid" aria-label="Ações rápidas">
      <button class="quick-card primary" data-action="new-quote"><span class="quick-icon">＋</span><strong>Novo orçamento</strong><small>Criar em etapas</small></button>
      <button class="quick-card" data-route="calendar"><span class="quick-icon">▦</span><strong>Ver agenda</strong><small>${upcoming.length} próximos eventos</small></button>
      <button class="quick-card" data-route="clients"><span class="quick-icon">♙</span><strong>Novo cliente</strong><small>Cadastro rápido</small></button>
      <button class="quick-card" data-route="finance"><span class="quick-icon">R$</span><strong>Recebimentos</strong><small>${money(pending)} pendentes</small></button>
    </section>
    <div class="section-title"><h2>Resumo de novembro</h2><button class="text-button" data-route="finance">Detalhes</button></div>
    <section class="metric-grid">
      <article class="metric-card"><span class="metric-label">Faturamento previsto</span><strong class="metric-value">${money(revenue)}</strong><span class="metric-trend">${monthQuotes.length} eventos</span></article>
      <article class="metric-card"><span class="metric-label">Já recebido</span><strong class="metric-value">${money(received)}</strong><span class="metric-trend">Entradas confirmadas</span></article>
      <article class="metric-card alert"><span class="metric-label">A receber</span><strong class="metric-value">${money(pending)}</strong><span class="metric-trend">Acompanhar vencimentos</span></article>
      <article class="metric-card"><span class="metric-label">Geradores livres</span><strong class="metric-value">${db.generators.filter(g => g.status === "Disponível").length}</strong><span class="metric-trend">de ${db.generators.length} cadastrados</span></article>
    </section>
    <div class="section-title"><h2>Próximos eventos</h2><button class="text-button" data-route="calendar">Ver agenda</button></div>
    <section class="panel">
      <div class="event-list">${upcoming.length ? upcoming.map(eventRow).join("") : "<p>Nenhum evento futuro cadastrado.</p>"}</div>
    </section>`;
}

function eventRow(quote) {
  const date = dateFromIso(quote.eventDate);
  return `<article class="event-row" data-action="open-quote" data-id="${quote.id}">
    <div class="event-date"><strong>${String(date.getDate()).padStart(2, "0")}</strong><span>${date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>
    <div class="event-info"><strong>${escapeHtml(quote.eventName)}</strong><small>${escapeHtml(clientOf(quote).name)} · ${escapeHtml(quote.city)}</small></div>
    <span class="badge ${statusClass(quote.status)}">${quote.status}</span>
  </article>`;
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const gridStart = new Date(year, month, 1 - startDay);
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const selectedEvents = db.quotes.filter(q => q.eventDate === selectedCalendarDate);
  return `<div class="page-head"><div><h1>Agenda</h1><p>Eventos, reservas e compromissos</p></div><button class="primary-button desktop-only" data-action="new-quote">Novo evento</button></div>
    <section class="panel calendar-shell">
      <div class="calendar-head"><button data-action="calendar-prev" aria-label="Mês anterior">‹</button><strong>${calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button data-action="calendar-next" aria-label="Próximo mês">›</button></div>
      <div class="calendar-grid">
        ${["DOM","SEG","TER","QUA","QUI","SEX","SÁB"].map(day => `<span class="calendar-weekday">${day}</span>`).join("")}
        ${days.map(day => {
          const iso = isoDate(day);
          const hasEvent = db.quotes.some(q => q.eventDate === iso);
          return `<button class="calendar-day ${day.getMonth() !== month ? "outside" : ""} ${iso === "2026-11-10" ? "today" : ""} ${hasEvent ? "has-event" : ""} ${iso === selectedCalendarDate ? "selected" : ""}" data-action="calendar-select" data-date="${iso}">${day.getDate()}</button>`;
        }).join("")}
      </div>
    </section>
    <div class="section-title"><h2>${dateLabel(selectedCalendarDate, { weekday: "long", day: "2-digit", month: "long" })}</h2><span class="badge neutral">${selectedEvents.length} evento(s)</span></div>
    <section class="panel"><div class="event-list">${selectedEvents.length ? selectedEvents.map(eventRow).join("") : "<p style='color:var(--muted)'>Nenhum evento nesta data. Toque em <strong>Novo</strong> para cadastrar.</p>"}</div></section>`;
}

function renderQuotes() {
  const filtered = db.quotes.filter(q => {
    const text = `${q.number} ${q.eventName} ${clientOf(q).name}`.toLowerCase();
    return (quoteFilter === "Todos" || q.status === quoteFilter) && text.includes(quoteSearch.toLowerCase());
  });
  return `<div class="page-head"><div><h1>Orçamentos</h1><p>Da proposta ao encerramento</p></div><button class="primary-button desktop-only" data-action="new-quote">Novo orçamento</button></div>
    <div class="search-box"><input id="quoteSearch" type="search" value="${escapeHtml(quoteSearch)}" placeholder="Buscar cliente, evento ou número" aria-label="Buscar orçamentos" /></div>
    <div class="toolbar">${["Todos", "Pendente", "Confirmado", "Cancelado"].map(item => `<button class="filter-button ${quoteFilter === item ? "active" : ""}" data-action="quote-filter" data-filter="${item}">${item}</button>`).join("")}</div>
    <section class="record-list">${filtered.length ? filtered.map(quoteCard).join("") : `<div class="panel"><strong>Nenhum orçamento encontrado.</strong></div>`}</section>`;
}

function quoteCard(quote) {
  const totals = quoteTotals(quote);
  return `<article class="list-card">
    <div class="list-card-head"><div><h3>${escapeHtml(quote.eventName)}</h3><p>${escapeHtml(clientOf(quote).name)} · ${escapeHtml(quote.number)}</p></div><span class="badge ${statusClass(quote.status)}">${quote.status}</span></div>
    <div class="list-meta"><span>▦ ${dateLabel(quote.eventDate)}</span><span>⚡ ${escapeHtml(generatorOf(quote).name)}</span><span>⌖ ${escapeHtml(quote.city)}</span></div>
    <div class="list-value"><div><small>Valor do orçamento</small><strong style="display:block">${money(totals.revenue)}</strong></div><span class="badge ${statusClass(quote.paymentStatus)}">${quote.paymentStatus}</span></div>
    <div class="action-row">
      <button class="action-button primary" data-action="document" data-type="quote" data-id="${quote.id}">Orçamento</button>
      <button class="action-button" data-action="document" data-type="contract" data-id="${quote.id}">Contrato</button>
      <button class="action-button" data-action="checklist" data-id="${quote.id}">Checklist</button>
      <button class="action-button whatsapp" data-action="whatsapp" data-id="${quote.id}">WhatsApp</button>
      <button class="action-button" data-action="payment" data-id="${quote.id}">Recebimento</button>
      <button class="action-button" data-action="edit-quote" data-id="${quote.id}">Atualizar</button>
      <button class="action-button danger" data-action="delete-quote" data-id="${quote.id}">Excluir</button>
    </div>
  </article>`;
}

function renderFinance() {
  const revenue = db.quotes.reduce((sum, q) => sum + quoteTotals(q).revenue, 0);
  const received = db.quotes.reduce((sum, q) => sum + number(q.paid), 0);
  const costs = db.quotes.reduce((sum, q) => sum + quoteTotals(q).internalCost, 0) + db.extraCosts.reduce((sum, cost) => sum + number(cost.actual || cost.estimated), 0);
  const pending = Math.max(revenue - received, 0);
  const percent = revenue ? Math.min(100, Math.round(received / revenue * 100)) : 0;
  return `<div class="page-head"><div><h1>Financeiro</h1><p>Recebimentos, custos e resultado</p></div><button class="primary-button desktop-only" data-action="add-cost">Novo custo</button></div>
    <section class="finance-summary"><small>Resultado previsto</small><strong>${money(revenue - costs)}</strong><div class="finance-line"><span>Faturamento ${money(revenue)}</span><span>Custos ${money(costs)}</span></div></section>
    <div class="section-title"><h2>Recebimentos</h2><button class="text-button" data-action="add-cost">+ Custo interno</button></div>
    <section class="panel">
      <div class="cost-line"><span>Total faturado</span><strong>${money(revenue)}</strong></div>
      <div class="cost-line"><span>Já recebido</span><strong style="color:var(--success)">${money(received)}</strong></div>
      <div class="cost-line total"><span>A receber</span><strong style="color:var(--danger)">${money(pending)}</strong></div>
      <div class="progress" aria-label="${percent}% recebido"><span style="width:${percent}%"></span></div>
      <p style="color:var(--muted);font-size:.8rem;margin-bottom:0">${percent}% dos valores já foram recebidos.</p>
    </section>
    <div class="section-title"><h2>Por evento</h2></div>
    <section class="record-list">${db.quotes.map(q => {
      const totals = quoteTotals(q);
      return `<article class="list-card"><div class="list-card-head"><div><h3>${escapeHtml(q.eventName)}</h3><p>Vencimento ${dateLabel(q.dueDate)}</p></div><span class="badge ${statusClass(q.paymentStatus)}">${q.paymentStatus}</span></div><div class="cost-line"><span>Valor</span><strong>${money(totals.revenue)}</strong></div><div class="cost-line"><span>Recebido</span><strong>${money(q.paid)}</strong></div><div class="cost-line total"><span>Saldo</span><strong>${money(Math.max(totals.balance,0))}</strong></div><button class="primary-button" style="width:100%;margin-top:12px" data-action="payment" data-id="${q.id}">Registrar recebimento</button></article>`;
    }).join("")}</section>`;
}

function renderClients() {
  return `<div class="page-head"><div><h1>Clientes</h1><p>Dados e histórico de atendimento</p></div><button class="primary-button" data-action="add-client">+ Cliente</button></div>
    <div class="search-box"><input type="search" placeholder="Buscar cliente" aria-label="Buscar clientes" /></div>
    <section class="record-list">${db.clients.map(client => `<article class="list-card"><div class="list-card-head"><div><h3>${escapeHtml(client.name)}</h3><p>${escapeHtml(client.document)}</p></div><span class="badge neutral">${db.quotes.filter(q => q.clientId === client.id).length} evento(s)</span></div><div class="list-meta"><span>☎ ${escapeHtml(client.phone)}</span><span>⌖ ${escapeHtml(client.city)}</span></div><button class="secondary-button" style="width:100%;margin-top:14px" data-action="client-details" data-id="${client.id}">Ver cadastro</button></article>`).join("")}</section>`;
}

function renderGenerators() {
  return `<div class="page-head"><div><h1>Geradores</h1><p>Frota, configurações e consumo</p></div><button class="primary-button" data-action="add-generator">+ Gerador</button></div>
    <section class="generator-grid">${db.generators.map(generator => `<article class="generator-card"><div class="generator-image"></div><div class="generator-body"><div class="list-card-head"><h3>${escapeHtml(generator.name)}</h3><span class="badge ${statusClass(generator.status)}">${generator.status}</span></div><div class="spec-row"><span class="spec-chip">${generator.kva} kVA</span>${generator.voltages.map(v => `<span class="spec-chip">${v}</span>`).join("")}${generator.phases.map(p => `<span class="spec-chip">${p}</span>`).join("")}</div><div class="cost-line"><span>Consumo estimado</span><strong>${generator.litersHour} L/h</strong></div><div class="cost-line"><span>Hora excedente</span><strong>${money(generator.extraHour)}</strong></div><button class="secondary-button" style="width:100%;margin-top:10px" data-action="generator-details" data-id="${generator.id}">Editar cadastro</button></div></article>`).join("")}</section>`;
}

function renderSettings() {
  const cards = [
    ["⚡", "Geradores", "Potência, tensão, fases e consumo", "generators"],
    ["▱", "Cabos e acessórios", "Itens automáticos do checklist", "accessories"],
    ["⌖", "Frete e combustível", "Origem, consumo, preço e pedágios", "freight-settings"],
    ["!", "Taxa emergencial", "Regras para urgência e atendimento imediato", "emergency-settings"],
    ["R$", "Outros custos", "Categorias internas que o cliente não vê", "cost-settings"],
    ["▤", "Modelos de documentos", "Proposta, contrato e checklist", "document-settings"],
  ];
  return `<div class="page-head"><div><h1>Cadastros</h1><p>Configurações usadas nos orçamentos</p></div></div><section class="record-list">${cards.map(([icon,title,text,action]) => `<button class="quick-card" style="width:100%" data-action="${action}"><span class="quick-icon">${icon}</span><strong>${title}</strong><small>${text}</small></button>`).join("")}</section>`;
}

function openDrawer(title, body, wide = false) {
  drawer.innerHTML = `<div class="drawer-handle"></div><div class="drawer-head"><h2>${title}</h2><button class="close-button" data-action="close-drawer" aria-label="Fechar">×</button></div><div class="drawer-body">${body}</div>`;
  drawer.classList.remove("hidden");
  overlay.classList.remove("hidden");
  overlay.dataset.drawer = "true";
  drawer.scrollTop = 0;
}

function closeDrawer() {
  drawer.classList.add("hidden");
  overlay.classList.add("hidden");
  delete overlay.dataset.drawer;
  drawer.innerHTML = "";
  wizard = null;
}

function startWizard(existing = null) {
  const defaultClient = db.clients[0] || {};
  const defaultGenerator = db.generators[0] || {};
  wizard = {
    step: 0,
    editingId: existing?.id || null,
    data: existing ? structuredClone(existing) : {
      clientId: defaultClient.id || "", eventName: "", eventDate: "2026-11-15", eventEndDate: "2026-11-15", eventAddress: defaultClient.address || "", city: defaultClient.city || "", generatorId: defaultGenerator.id || "", voltage: "220 V", phase: "Trifásico", hours: 8, mode: "Stand-by", accessories: ["Cabos de força", "Aterramento", "Extintor"], origin: db.settings.baseAddress, distanceKm: 0, trips: 2, truckKmPerLiter: db.settings.truckKmPerLiter, fuelPrice: db.settings.fuelPrice, tolls: 0, freightCharge: 0, freightWaived: false, emergency: false, emergencyFee: 0, rentalValue: 0, discount: 0, deposit: 0, dueDate: "2026-11-15", fuelLitersGenerator: 0, fuelPriceGenerator: db.settings.fuelPrice, otherCostDescription: "", otherCostValue: 0, notes: "", paid: 0, paymentStatus: "Pendente", status: "Pendente", checklistDone: []
    }
  };
  renderWizard();
}

function stepDots() {
  return `<div class="stepper">${Array.from({ length: 6 }, (_, i) => `<span class="step-dot ${i < wizard.step ? "done" : i === wizard.step ? "active" : ""}"></span>`).join("")}</div>`;
}

function renderWizard() {
  const titles = ["Cliente e evento", "Gerador e energia", "Checklist de carga", "Frete e urgência", "Valores e custos", "Revisão final"];
  const steps = [wizardStepClient, wizardStepGenerator, wizardStepChecklist, wizardStepFreight, wizardStepValues, wizardStepReview];
  openDrawer(wizard.editingId ? "Atualizar orçamento" : "Novo orçamento", `${stepDots()}<div class="step-label"><small>Etapa ${wizard.step + 1} de 6</small><h3>${titles[wizard.step]}</h3></div><form id="wizardForm">${steps[wizard.step]()}</form><div class="wizard-actions"><button class="secondary-button" data-action="wizard-back">${wizard.step === 0 ? "Cancelar" : "Voltar"}</button><button class="primary-button" data-action="wizard-next">${wizard.step === 5 ? "Salvar orçamento" : "Continuar"}</button></div>`);
}

function wizardStepClient() {
  const d = wizard.data;
  return `<div class="form-grid"><div class="field"><label for="clientId">Cliente</label><select id="clientId" name="clientId">${db.clients.map(c => `<option value="${c.id}" ${c.id === d.clientId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}</select></div><button type="button" class="secondary-button" data-action="add-client">+ Cadastrar cliente sem sair</button><div class="field"><label for="eventName">Nome do evento</label><input id="eventName" name="eventName" value="${escapeHtml(d.eventName)}" placeholder="Ex.: Casamento Espaço Mont Blanc" required /></div><div class="field-row"><div class="field"><label for="eventDate">Data inicial</label><input type="date" id="eventDate" name="eventDate" value="${d.eventDate}" required /></div><div class="field"><label for="eventEndDate">Data final</label><input type="date" id="eventEndDate" name="eventEndDate" value="${d.eventEndDate}" /></div></div><div class="field"><label for="eventAddress">Endereço do evento</label><input id="eventAddress" name="eventAddress" value="${escapeHtml(d.eventAddress)}" placeholder="Rua, número e local" /></div><div class="field"><label for="city">Cidade</label><input id="city" name="city" value="${escapeHtml(d.city)}" placeholder="Cidade/UF" /></div></div>`;
}

function wizardStepGenerator() {
  const d = wizard.data;
  return `<div class="form-grid"><div class="field"><label for="generatorId">Gerador</label><select id="generatorId" name="generatorId">${db.generators.map(g => `<option value="${g.id}" ${g.id === d.generatorId ? "selected" : ""}>${escapeHtml(g.name)} · ${g.status}</option>`).join("")}</select></div><div class="field"><span>Tensão necessária</span><div class="choice-grid">${["220 V","380 V","440 V"].map(v => `<div class="choice-card"><input type="radio" id="voltage-${v}" name="voltage" value="${v}" ${d.voltage === v ? "checked" : ""}><label for="voltage-${v}"><strong>${v}</strong><small>Saída configurada</small></label></div>`).join("")}</div></div><div class="field"><span>Ligação</span><div class="choice-grid">${["Bifásico","Trifásico"].map(v => `<div class="choice-card"><input type="radio" id="phase-${v}" name="phase" value="${v}" ${d.phase === v ? "checked" : ""}><label for="phase-${v}"><strong>${v}</strong><small>Configuração elétrica</small></label></div>`).join("")}</div></div><div class="field-row"><div class="field"><label for="hours">Horas previstas</label><input type="number" id="hours" name="hours" min="1" value="${d.hours}" /></div><div class="field"><label for="mode">Operação</label><select id="mode" name="mode"><option ${d.mode === "Stand-by" ? "selected" : ""}>Stand-by</option><option ${d.mode === "Funcionamento" ? "selected" : ""}>Funcionamento</option></select></div></div></div>`;
}

function wizardStepChecklist() {
  const d = wizard.data;
  const items = ["Cabos de força", "Cabos reserva", "Caixa de passagem", "Quadro de distribuição", "Aterramento", "Extintor", "Ferramentas", "EPIs", "Operador técnico", "ART", "Munck / guindaste"];
  return `<p style="color:var(--muted);margin-top:0">Marque tudo que deverá ser separado para este evento. Esta lista é interna.</p><div class="check-list">${items.map((item, i) => `<div class="check-item"><input type="checkbox" id="acc-${i}" name="accessories" value="${item}" ${d.accessories?.includes(item) ? "checked" : ""}><label for="acc-${i}">${item}<small>Incluir no checklist operacional</small></label></div>`).join("")}</div>`;
}

function wizardStepFreight() {
  const d = wizard.data;
  return `<div class="form-grid"><div class="field"><label for="origin">Origem</label><input id="origin" name="origin" value="${escapeHtml(d.origin || db.settings.baseAddress)}" /></div><div class="field-row"><div class="field"><label for="distanceKm">Distância de ida (km)</label><input type="number" id="distanceKm" name="distanceKm" min="0" step="1" value="${d.distanceKm}" /></div><div class="field"><label for="trips">Trechos / viagens</label><input type="number" id="trips" name="trips" min="1" value="${d.trips}" /></div></div><div class="field-row"><div class="field"><label for="truckKmPerLiter">Média do caminhão (km/L)</label><input type="number" id="truckKmPerLiter" name="truckKmPerLiter" min="1" step=".1" value="${d.truckKmPerLiter}" /></div><div class="field"><label for="fuelPrice">Diesel por litro</label><input type="number" id="fuelPrice" name="fuelPrice" min="0" step=".01" value="${d.fuelPrice}" /></div></div><div class="field-row"><div class="field"><label for="tolls">Pedágios</label><input type="number" id="tolls" name="tolls" min="0" step=".01" value="${d.tolls}" /></div><div class="field"><label for="freightCharge">Frete cobrado</label><input type="number" id="freightCharge" name="freightCharge" min="0" step=".01" value="${d.freightCharge}" /></div></div><div class="switch-row"><div class="switch-copy"><strong>Frete cortesia</strong><small>O custo continua no controle interno</small></div><label class="switch"><input type="checkbox" name="freightWaived" ${d.freightWaived ? "checked" : ""}><span></span></label></div><div class="switch-row"><div class="switch-copy"><strong>Atendimento emergencial</strong><small>Solicitação em cima da hora</small></div><label class="switch"><input type="checkbox" name="emergency" ${d.emergency ? "checked" : ""}><span></span></label></div><div class="field"><label for="emergencyFee">Taxa de mobilização emergencial</label><input type="number" id="emergencyFee" name="emergencyFee" min="0" step=".01" value="${d.emergencyFee}" /></div></div>`;
}

function wizardStepValues() {
  const d = wizard.data;
  return `<div class="form-grid"><div class="field-row"><div class="field"><label for="rentalValue">Valor da locação</label><input type="number" id="rentalValue" name="rentalValue" min="0" step=".01" value="${d.rentalValue}" /></div><div class="field"><label for="discount">Desconto</label><input type="number" id="discount" name="discount" min="0" step=".01" value="${d.discount}" /></div></div><div class="field-row"><div class="field"><label for="deposit">Sinal combinado</label><input type="number" id="deposit" name="deposit" min="0" step=".01" value="${d.deposit}" /></div><div class="field"><label for="dueDate">Vencimento</label><input type="date" id="dueDate" name="dueDate" value="${d.dueDate}" /></div></div><span class="internal-label">Somente controle interno</span><div class="field-row"><div class="field"><label for="fuelLitersGenerator">Litros previstos no gerador</label><input type="number" id="fuelLitersGenerator" name="fuelLitersGenerator" min="0" step=".1" value="${d.fuelLitersGenerator}" /></div><div class="field"><label for="fuelPriceGenerator">Combustível por litro</label><input type="number" id="fuelPriceGenerator" name="fuelPriceGenerator" min="0" step=".01" value="${d.fuelPriceGenerator}" /></div></div><div class="field"><label for="otherCostDescription">Outro custo interno</label><input id="otherCostDescription" name="otherCostDescription" value="${escapeHtml(d.otherCostDescription)}" placeholder="Ex.: alimentação, ajudante, hospedagem" /></div><div class="field"><label for="otherCostValue">Valor do outro custo</label><input type="number" id="otherCostValue" name="otherCostValue" min="0" step=".01" value="${d.otherCostValue}" /></div><div class="field"><label for="notes">Observações</label><textarea id="notes" name="notes" placeholder="Informações importantes do evento">${escapeHtml(d.notes)}</textarea></div></div>`;
}

function wizardStepReview() {
  const d = wizard.data;
  const totals = quoteTotals(d);
  return `<div class="panel" style="box-shadow:none"><div class="list-card-head"><div><h3>${escapeHtml(d.eventName || "Evento sem nome")}</h3><p>${escapeHtml((db.clients.find(c => c.id === d.clientId) || {}).name || "Cliente")}</p></div><span class="badge pending">Rascunho</span></div><div class="list-meta"><span>▦ ${dateLabel(d.eventDate)}</span><span>⚡ ${escapeHtml(generatorOf(d).name)}</span><span>⌖ ${escapeHtml(d.city)}</span></div></div><div class="section-title"><h2>Resumo comercial</h2></div><div class="cost-box"><div class="cost-line"><span>Locação</span><strong>${money(d.rentalValue)}</strong></div><div class="cost-line"><span>Frete ${d.freightWaived ? "(cortesia)" : ""}</span><strong>${money(d.freightWaived ? 0 : d.freightCharge)}</strong></div><div class="cost-line"><span>Emergencial</span><strong>${money(d.emergencyFee)}</strong></div><div class="cost-line"><span>Desconto</span><strong>− ${money(d.discount)}</strong></div><div class="cost-line total"><span>Total do orçamento</span><strong>${money(totals.revenue)}</strong></div></div><div class="section-title"><h2>Resultado interno</h2><span class="internal-label">Cliente não vê</span></div><div class="cost-box"><div class="cost-line"><span>Combustível do gerador</span><strong>${money(totals.generatorFuelCost)}</strong></div><div class="cost-line"><span>Combustível do frete</span><strong>${money(totals.freightFuelCost)}</strong></div><div class="cost-line"><span>Pedágios e outros</span><strong>${money(number(d.tolls) + number(d.otherCostValue))}</strong></div><div class="cost-line total"><span>Resultado previsto</span><strong style="color:${totals.result >= 0 ? "var(--success)" : "var(--danger)"}">${money(totals.result)}</strong></div></div>`;
}

function captureWizard() {
  const form = document.querySelector("#wizardForm");
  if (!form) return;
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) {
    if (key !== "accessories") wizard.data[key] = value;
  }
  const numberFields = ["hours","distanceKm","trips","truckKmPerLiter","fuelPrice","tolls","freightCharge","emergencyFee","rentalValue","discount","deposit","fuelLitersGenerator","fuelPriceGenerator","otherCostValue"];
  numberFields.forEach(key => { if (form.elements[key]) wizard.data[key] = number(form.elements[key].value); });
  if (form.elements.accessories) wizard.data.accessories = fd.getAll("accessories");
  if (form.elements.freightWaived) wizard.data.freightWaived = form.elements.freightWaived.checked;
  if (form.elements.emergency) wizard.data.emergency = form.elements.emergency.checked;
}

function finishWizard() {
  const data = structuredClone(wizard.data);
  if (wizard.editingId) {
    const index = db.quotes.findIndex(q => q.id === wizard.editingId);
    db.quotes[index] = { ...db.quotes[index], ...data };
    saveDb("Orçamento atualizado com sucesso");
  } else {
    const serial = String(db.quotes.length + 25).padStart(3, "0");
    data.id = `q${Date.now()}`;
    data.number = `ORC-2026-${serial}`;
    data.status = "Pendente";
    data.paymentStatus = "Pendente";
    data.paid = 0;
    data.checklistDone = [];
    db.quotes.unshift(data);
    saveDb("Orçamento salvo. Os botões já estão disponíveis.");
  }
  closeDrawer();
  go("quotes");
}

function openDocument(id, type) {
  const q = db.quotes.find(item => item.id === id);
  if (!q) return;
  const client = clientOf(q);
  const generator = generatorOf(q);
  const totals = quoteTotals(q);
  const quoteBody = `<div class="document"><div class="document-header"><img src="assets/logo-horizontal.png" alt="DR Geradores"><div style="text-align:right"><strong>PROPOSTA COMERCIAL</strong><br><small>${q.number}</small></div></div><h3>Cliente e evento</h3><p><strong>${escapeHtml(client.name)}</strong><br>${escapeHtml(client.document || "")}<br>${escapeHtml(q.eventName)} · ${dateLabel(q.eventDate)}<br>${escapeHtml(q.eventAddress)}, ${escapeHtml(q.city)}</p><h3>Equipamentos e serviços</h3><table class="document-table"><thead><tr><th>Descrição</th><th>Especificação</th></tr></thead><tbody><tr><td>${escapeHtml(generator.name)}</td><td>${escapeHtml(q.voltage)} · ${escapeHtml(q.phase)} · ${q.hours}h</td></tr>${(q.accessories || []).map(item => `<tr><td>${escapeHtml(item)}</td><td>Incluso conforme checklist</td></tr>`).join("")}<tr><td>Transporte e instalação</td><td>${q.freightWaived ? "Frete cortesia" : "Incluso na proposta"}</td></tr>${q.emergency ? `<tr><td>Mobilização emergencial</td><td>Preparação e saída prioritária</td></tr>` : ""}</tbody></table><h3>Condições comerciais</h3><p>Proposta sujeita à disponibilidade do equipamento. Horas excedentes e alterações de escopo serão cobradas separadamente. Validade desta proposta: 15 dias.</p><div class="document-total"><span>Valor total</span><strong>${money(totals.revenue)}</strong></div></div>`;
  const contractBody = `<div class="document"><div class="document-header"><img src="assets/logo-horizontal.png" alt="DR Geradores"><div style="text-align:right"><strong>CONTRATO DE LOCAÇÃO</strong><br><small>${q.number}</small></div></div><h3>Das partes</h3><p><strong>LOCADOR:</strong> DR Geradores.</p><p><strong>LOCATÁRIO:</strong> ${escapeHtml(client.name)}, documento ${escapeHtml(client.document || "não informado")}.</p><h3>Do objeto</h3><p>Locação de ${escapeHtml(generator.name)}, configurado em ${escapeHtml(q.voltage)} e ${escapeHtml(q.phase)}, para o evento ${escapeHtml(q.eventName)}, no endereço ${escapeHtml(q.eventAddress)}, ${escapeHtml(q.city)}.</p><h3>Do período e valor</h3><p>O serviço ocorrerá em ${dateLabel(q.eventDate)}, com previsão de ${q.hours} horas. O valor total contratado é de <strong>${money(totals.revenue)}</strong>.</p><h3>Condições</h3><p>Montagem, desmontagem, combustível, segurança do equipamento, horas excedentes, cancelamento e responsabilidades seguirão as condições comerciais aprovadas. Este texto é uma prévia e deverá receber a revisão jurídica final da DR Geradores.</p><div style="margin-top:55px;display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center"><div style="border-top:1px solid #333;padding-top:8px">DR Geradores</div><div style="border-top:1px solid #333;padding-top:8px">${escapeHtml(client.name)}</div></div></div>`;
  openDrawer(type === "contract" ? "Contrato" : "Orçamento", `${type === "contract" ? contractBody : quoteBody}<div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Fechar</button><button class="primary-button" data-action="print-document">Imprimir / PDF</button></div>`);
}

function openChecklist(id) {
  const q = db.quotes.find(item => item.id === id);
  if (!q) return;
  const baseItems = ["Gerador testado", "Tensão configurada", ...(q.accessories || []), "Combustível conferido", "Ferramentas e EPIs", "Documentação", "Fotos antes da saída"];
  const unique = [...new Set(baseItems)];
  openDrawer("Checklist do evento", `<div class="panel" style="box-shadow:none"><h3 style="margin-top:0">${escapeHtml(q.eventName)}</h3><p>${escapeHtml(generatorOf(q).name)} · ${dateLabel(q.eventDate)}</p></div><p style="color:var(--muted)">Marque os itens conforme forem separados e conferidos.</p><div class="check-list">${unique.map((item, i) => `<div class="check-item"><input type="checkbox" id="check-${i}" data-action="toggle-check" data-id="${q.id}" value="${escapeHtml(item)}" ${q.checklistDone?.includes(item) ? "checked" : ""}><label for="check-${i}">${escapeHtml(item)}<small>${q.checklistDone?.includes(item) ? "Conferido" : "Pendente"}</small></label></div>`).join("")}</div><div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Fechar</button><button class="primary-button" data-action="save-checklist" data-id="${q.id}">Salvar checklist</button></div>`);
}

function openPayment(id) {
  const q = db.quotes.find(item => item.id === id);
  if (!q) return;
  const totals = quoteTotals(q);
  openDrawer("Registrar recebimento", `<div class="cost-box"><div class="cost-line"><span>Total</span><strong>${money(totals.revenue)}</strong></div><div class="cost-line"><span>Já recebido</span><strong>${money(q.paid)}</strong></div><div class="cost-line total"><span>Saldo atual</span><strong>${money(Math.max(totals.balance,0))}</strong></div></div><form id="paymentForm" class="form-grid" style="margin-top:18px"><div class="field"><label for="paymentAmount">Valor recebido agora</label><input type="number" id="paymentAmount" name="amount" min="0" step=".01" value="${Math.max(totals.balance,0)}" /></div><div class="field"><label for="paymentDate">Data do recebimento</label><input type="date" id="paymentDate" name="date" value="2026-11-10" /></div><div class="field"><label for="paymentMethod">Forma de pagamento</label><select id="paymentMethod" name="method"><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Cartão</option><option>Boleto</option></select></div></form><div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Cancelar</button><button class="primary-button" data-action="save-payment" data-id="${q.id}">Confirmar</button></div>`);
}

function openClientForm(existing = null) {
  const c = existing || { name: "", document: "", phone: "", city: "", address: "" };
  openDrawer(existing ? "Editar cliente" : "Novo cliente", `<form id="clientForm" class="form-grid"><div class="field"><label for="clientName">Nome ou razão social</label><input id="clientName" name="name" value="${escapeHtml(c.name)}" required /></div><div class="field"><label for="clientDocument">CPF ou CNPJ</label><input id="clientDocument" name="document" value="${escapeHtml(c.document)}" /></div><div class="field"><label for="clientPhone">WhatsApp</label><input id="clientPhone" name="phone" inputmode="tel" value="${escapeHtml(c.phone)}" /></div><div class="field"><label for="clientCity">Cidade</label><input id="clientCity" name="city" value="${escapeHtml(c.city)}" /></div><div class="field"><label for="clientAddress">Endereço</label><textarea id="clientAddress" name="address">${escapeHtml(c.address)}</textarea></div></form><div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Cancelar</button><button class="primary-button" data-action="save-client" data-id="${c.id || ""}">Salvar cliente</button></div>`);
}

function openGeneratorForm(existing = null) {
  const g = existing || { name: "", kva: "", voltages: ["220 V"], phases: ["Trifásico"], litersHour: "", extraHour: "", status: "Disponível" };
  openDrawer(existing ? "Editar gerador" : "Novo gerador", `<form id="generatorForm" class="form-grid"><div class="field"><label for="generatorName">Identificação</label><input id="generatorName" name="name" value="${escapeHtml(g.name)}" placeholder="Ex.: Gerador 180 kVA - Unidade 02" /></div><div class="field-row"><div class="field"><label for="generatorKva">Potência kVA</label><input type="number" id="generatorKva" name="kva" value="${g.kva}" /></div><div class="field"><label for="generatorStatus">Situação</label><select id="generatorStatus" name="status"><option ${g.status === "Disponível" ? "selected" : ""}>Disponível</option><option ${g.status === "Reservado" ? "selected" : ""}>Reservado</option><option ${g.status === "Manutenção" ? "selected" : ""}>Manutenção</option></select></div></div><div class="field"><span>Tensões disponíveis</span><div class="choice-grid">${["220 V","380 V","440 V"].map((v,i) => `<div class="check-item"><input type="checkbox" id="gv-${i}" name="voltages" value="${v}" ${g.voltages.includes(v) ? "checked" : ""}><label for="gv-${i}">${v}</label></div>`).join("")}</div></div><div class="field"><span>Fases</span><div class="choice-grid">${["Bifásico","Trifásico"].map((v,i) => `<div class="check-item"><input type="checkbox" id="gp-${i}" name="phases" value="${v}" ${g.phases.includes(v) ? "checked" : ""}><label for="gp-${i}">${v}</label></div>`).join("")}</div></div><div class="field-row"><div class="field"><label for="litersHour">Consumo L/h</label><input type="number" id="litersHour" name="litersHour" step=".1" value="${g.litersHour}" /></div><div class="field"><label for="extraHour">Hora excedente</label><input type="number" id="extraHour" name="extraHour" step=".01" value="${g.extraHour}" /></div></div></form><div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Cancelar</button><button class="primary-button" data-action="save-generator" data-id="${g.id || ""}">Salvar gerador</button></div>`);
}

function openFreightSettings() {
  const s = db.settings;
  openDrawer("Frete e combustível", `<form id="settingsForm" class="form-grid"><div class="field"><label for="baseAddress">Endereço de saída</label><input id="baseAddress" name="baseAddress" value="${escapeHtml(s.baseAddress)}" /></div><div class="field-row"><div class="field"><label for="fuelPriceSetting">Diesel por litro</label><input type="number" id="fuelPriceSetting" name="fuelPrice" step=".01" value="${s.fuelPrice}" /></div><div class="field"><label for="truckAverage">Média do caminhão km/L</label><input type="number" id="truckAverage" name="truckKmPerLiter" step=".1" value="${s.truckKmPerLiter}" /></div></div><div class="field"><label for="kmPrice">Valor sugerido por km</label><input type="number" id="kmPrice" name="defaultKmPrice" step=".01" value="${s.defaultKmPrice}" /></div></form><div class="wizard-actions"><button class="secondary-button" data-action="close-drawer">Cancelar</button><button class="primary-button" data-action="save-settings">Salvar</button></div>`);
}

function genericInfo(title, text) {
  openDrawer(title, `<div class="panel" style="box-shadow:none"><h3 style="margin-top:0">Primeira versão preparada</h3><p style="color:var(--muted);line-height:1.55">${text}</p><p>Vamos completar e personalizar este cadastro nas próximas alterações.</p></div><button class="primary-button" style="width:100%" data-action="close-drawer">Entendi</button>`);
}

document.addEventListener("click", event => {
  const button = event.target.closest("button, [data-action]");
  if (!button) return;
  if (button.dataset.route) { go(button.dataset.route); return; }
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action) return;
  if (action === "new-quote") startWizard();
  if (action === "close-drawer") closeDrawer();
  if (action === "calendar-prev") { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); render(); }
  if (action === "calendar-next") { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1); render(); }
  if (action === "calendar-select") { selectedCalendarDate = button.dataset.date; render(); }
  if (action === "quote-filter") { quoteFilter = button.dataset.filter; render(); }
  if (action === "open-quote") { const q = db.quotes.find(item => item.id === id); if (q) startWizard(q); }
  if (action === "document") openDocument(id, button.dataset.type);
  if (action === "checklist") openChecklist(id);
  if (action === "payment") openPayment(id);
  if (action === "edit-quote") { const q = db.quotes.find(item => item.id === id); if (q) startWizard(q); }
  if (action === "delete-quote") {
    const q = db.quotes.find(item => item.id === id);
    if (q && confirm(`Arquivar o orçamento ${q.number}?`)) { q.status = "Cancelado"; saveDb("Orçamento arquivado"); render(); }
  }
  if (action === "whatsapp") {
    const q = db.quotes.find(item => item.id === id); if (!q) return;
    const c = clientOf(q); const totals = quoteTotals(q);
    const message = `Olá, ${c.name}! Segue a proposta ${q.number} da DR Geradores para ${q.eventName}, no valor de ${money(totals.revenue)}. Qualquer dúvida, estamos à disposição.`;
    window.open(`https://wa.me/${String(c.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }
  if (action === "wizard-back") {
    if (!wizard || wizard.step === 0) closeDrawer(); else { captureWizard(); wizard.step--; renderWizard(); }
  }
  if (action === "wizard-next") {
    captureWizard();
    if (wizard.step === 0 && !wizard.data.eventName) { showToast("Informe o nome do evento para continuar"); return; }
    if (wizard.step < 5) { wizard.step++; renderWizard(); } else finishWizard();
  }
  if (action === "print-document") window.print();
  if (action === "save-checklist") { const q = db.quotes.find(item => item.id === id); if (q) { q.checklistDone = [...drawer.querySelectorAll('[data-action="toggle-check"]:checked')].map(input => input.value); saveDb("Checklist atualizado"); closeDrawer(); render(); } }
  if (action === "save-payment") {
    const q = db.quotes.find(item => item.id === id); const form = document.querySelector("#paymentForm"); if (!q || !form) return;
    q.paid = number(q.paid) + number(new FormData(form).get("amount"));
    const balance = quoteTotals(q).balance;
    q.paymentStatus = balance <= .01 ? "Pago" : q.paid > 0 ? "Parcial" : "Pendente";
    saveDb("Recebimento registrado"); closeDrawer(); render();
  }
  if (action === "add-client") openClientForm();
  if (action === "client-details") openClientForm(db.clients.find(c => c.id === id));
  if (action === "save-client") {
    const form = document.querySelector("#clientForm"); if (!form) return; const data = Object.fromEntries(new FormData(form));
    if (!data.name) { showToast("Informe o nome do cliente"); return; }
    if (id) Object.assign(db.clients.find(c => c.id === id), data); else db.clients.push({ id: `c${Date.now()}`, ...data });
    saveDb("Cliente salvo"); closeDrawer(); render();
  }
  if (action === "add-generator") openGeneratorForm();
  if (action === "generator-details") openGeneratorForm(db.generators.find(g => g.id === id));
  if (action === "save-generator") {
    const form = document.querySelector("#generatorForm"); if (!form) return; const fd = new FormData(form); const data = Object.fromEntries(fd); data.voltages = fd.getAll("voltages"); data.phases = fd.getAll("phases"); data.kva = number(data.kva); data.litersHour = number(data.litersHour); data.extraHour = number(data.extraHour);
    if (id) Object.assign(db.generators.find(g => g.id === id), data); else db.generators.push({ id: `g${Date.now()}`, ...data });
    saveDb("Gerador salvo"); closeDrawer(); render();
  }
  if (action === "freight-settings") openFreightSettings();
  if (action === "save-settings") { const form = document.querySelector("#settingsForm"); const data = Object.fromEntries(new FormData(form)); db.settings = { ...db.settings, ...data, fuelPrice: number(data.fuelPrice), truckKmPerLiter: number(data.truckKmPerLiter), defaultKmPrice: number(data.defaultKmPrice) }; saveDb("Configurações atualizadas"); closeDrawer(); render(); }
  if (action === "add-cost") genericInfo("Novo custo interno", "Aqui serão lançados combustível, pedágio, equipe, alimentação, hospedagem, manutenção e outros custos reais. Esses valores nunca aparecem no contrato do cliente.");
  if (action === "accessories") genericInfo("Cabos e acessórios", "Este cadastro alimentará automaticamente o checklist conforme potência, tensão, fase e distância da instalação.");
  if (action === "emergency-settings") genericInfo("Taxa emergencial", "Será possível configurar taxa fixa, percentual e regras diferentes para menos de 24 horas, atendimento noturno, fim de semana ou feriado.");
  if (action === "cost-settings") genericInfo("Categorias de custos", "As categorias internas servirão para comparar custo previsto, custo real, faturamento e resultado de cada evento.");
  if (action === "document-settings") genericInfo("Modelos de documentos", "A proposta, o contrato e o checklist usarão a identidade da DR Geradores e os dados salvos no orçamento.");
});

document.addEventListener("input", event => {
  if (event.target.id === "quoteSearch") { quoteSearch = event.target.value; render(); const input = document.querySelector("#quoteSearch"); input?.focus(); input?.setSelectionRange(quoteSearch.length, quoteSearch.length); }
});

document.querySelector("#menuButton").addEventListener("click", () => { sideNav.classList.add("open"); overlay.classList.remove("hidden"); });
document.querySelector("#newQuoteFab").addEventListener("click", () => startWizard());
overlay.addEventListener("click", () => { if (overlay.dataset.drawer) closeDrawer(); else { sideNav.classList.remove("open"); overlay.classList.add("hidden"); } });

render();
