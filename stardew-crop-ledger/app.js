import { calculate, normalizeOptions, CROP_NAMES, SEASON_NAMES } from './engine.js';
import { createState, computationOptions, loadState, saveState } from './settings.js';
import { icon } from './icons.js';
import { CalculationClient } from './calculation-client.js';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let state = loadState(storage);
let rows = [];
let inputWarning = '';
const calculationClient = new CalculationClient();
let calculationRevision = 0;
const money = n => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(n);
const compact = n => Math.abs(n) >= (matchMedia('(max-width: 1050px)').matches ? 10000 : 1000000)
  ? new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 }).format(n) : money(n);
const amount = n => `${money(n)} g`;
const cropName = crop => CROP_NAMES[crop.key] ?? crop.name;
const cropImage = crop => `assets/crops/${crop.key}.png`;
const metricLabel = ['总利润', '日均利润', '回报率', '日均回报率'];
const metricValue = crop => `${compact(crop.drawProfit)}${state.options.average >= 2 ? '%' : ' g'}`;
const processingNames = ['直接出售', '罐头瓶', '酿酒桶', '种子生产器', '脱水机', '磨坊'];
const numberControls = { 'planted': 'planted', 'budget': 'maxSeedMoney', 'produce': 'produce', 'fertilizer': 'fertilizer', 'level': 'level', 'equipment': 'equipment', 'aging': 'aging', 'fertilizer-source': 'fertilizerSource', 'foraging-level': 'foragingLevel' };
const booleanControls = { 'buy-seed': 'buySeed', 'buy-fert': 'buyFert', 'replant': 'replant', 'nextyear': 'nextyear', 'cross-season': 'crossSeason', 'sell-raw': 'sellRaw', 'sell-excess': 'sellExcess', 'by-harvest': 'byHarvest', 'prediction': 'predictionModel', 'extra': 'extra', 'disable-links': 'disableLinks' };

for (const id of ['level', 'foraging-level']) {
  $(id).innerHTML = Array.from({ length: 14 }, (_, n) => `<option value="${n}">${n} 级</option>`).join('');
}
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

function syncControls() {
  const o = state.options;
  for (const [id, key] of Object.entries(numberControls)) $(id).value = id === 'budget' && o[key] === 0 ? '' : o[key];
  for (const [id, key] of Object.entries(booleanControls)) $(id).checked = o[key];
  $('current-day').value = state.currentDay;
  $('duration').value = state.duration;
  for (const name of ['pierre', 'joja', 'special']) $(`seed-${name}`).checked = o.seeds[name];
  for (const [id, key] of Object.entries({ tiller: 'till', gatherer: 'gatherer', botanist: 'botanist' })) $(id).checked = o.skills[key];
  $('profession').value = o.skills.agri ? '1' : o.skills.arti ? '2' : '0';
  $('food').value = o.foodLevel;
  $('tiller').disabled = o.level < 5;
  $('profession').disabled = o.level < 10 || !o.skills.till;
  $('gatherer').disabled = o.foragingLevel < 5;
  $('botanist').disabled = o.foragingLevel < 10 || !o.skills.gatherer;
  $('nextyear').disabled = !o.replant || o.season === 4;
  $('processing-settings').hidden = [0, 3].includes(o.produce);
  $('equipment-field').hidden = o.produce === 5;
  $('equipment-note').hidden = o.produce === 5;
  $('excess-field').hidden = o.produce === 5;
  $('aging-field').hidden = o.produce !== 2;
  $('by-harvest-field').hidden = o.produce !== 4;
  $('recalculate').disabled = !o.predictionModel;
  $('fertilizer-source-field').hidden = o.fertilizer !== 4 || !o.buyFert;
  $('day-field').hidden = o.season === 4;
  $('duration-field').hidden = o.season !== 4;
  $('cross-field').hidden = o.season === 4;
  document.querySelectorAll('[data-season]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.season) === o.season)));
  document.querySelectorAll('[data-metric]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.metric) === o.average)));
  document.querySelectorAll('[data-view]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.view === state.view)));
  document.querySelector('[data-step="current-day:-1"]').disabled = state.currentDay <= 1;
  document.querySelector('[data-step="current-day:1"]').disabled = state.currentDay >= 28;
}

function detailMarkup(crop) {
  const o = state.options;
  const seedCost = o.buySeed ? -crop.seedLoss : 0;
  const fertCost = o.buyFert ? -crop.fertLoss : 0;
  const revenue = crop.profit - crop.netExpenses;
  const quantities = ['regular', 'silver', 'gold', 'iridium'].map((key, i) => `${['普通', '银星', '金星', '铱星'][i]} ${money(crop.produce[key] || 0)}`).join(' · ');
  const saleUnits = crop.profitData.quantitySold ?? 0;
  const unit = { raw: '份原料', batch: o.produce === 4 ? '包' : '份成品', cup: '杯', seed: '粒种子', Rice: '份大米', Sugar: '份糖', 'Wheat Flour': '份面粉' }[crop.profitData.quantityUnit] ?? '份';
  const material = crop.profitData.material;
  const note = crop.harvests === 0 ? '当前日期下无法成熟；已购种子与肥料仍计入成本。' : '';
  return `<div class="detail-title"><img src="${cropImage(crop)}" alt=""><div><h3>${cropName(crop)} · 收益明细</h3><p>${crop.planted} 块耕地 · ${crop.growth.initial} 天成熟${crop.growth.regrow > 0 ? ` · 每 ${crop.growth.regrow} 天复收` : ''}</p></div></div>
    <dl class="detail-metrics"><div><dt>种子成本</dt><dd style="--chars:${amount(seedCost).length}">${amount(seedCost)}</dd></div><div><dt>收获次数</dt><dd style="--chars:${String(crop.harvests).length + 2}">${crop.harvests} 次</dd></div><div><dt>销售收入</dt><dd style="--chars:${amount(revenue).length}">${amount(revenue)}</dd></div><div><dt>净利润</dt><dd style="--chars:${amount(crop.profit).length}" class="net ${crop.profit < 0 ? 'negative' : ''}">${amount(crop.profit)}</dd></div></dl>
    <div class="detail-more"><p>肥料成本 ${amount(fertCost)} · ${metricLabel[o.average]} ${metricValue(crop)}</p>
    ${!o.buySeed ? '<p>未计入种子成本；种子预算不会限制种植数量。</p>' : ''}
    ${crop.seeds.specialLoc && crop.seedLoss === 0 && o.buySeed ? '<p>特殊种子来源；价格为 0 不代表能在商店免费购买。</p>' : ''}
    ${note ? `<p>${note}</p>` : ''}
    ${o.extra ? `<p>出售数量 ${money(saleUnits)} ${unit}${crop.profitData.excessProduce ? ` · 剩余原料 ${money(crop.profitData.excessProduce)} 份` : ''}</p><p>留种 ${money(material.seedReserved)} 份原料 · 加工消耗 ${money(material.processedInput)} 份原料 · 未出售 ${money(material.unsold)} 份原料</p><p>直接出售的原料品质：${quantities}</p>` : ''}
    ${o.replant ? '<p>留种按平均产出 2 粒种子折算，可能出现小数数量。</p>' : ''}
    ${o.average >= 2 && crop.netExpenses === 0 ? '<p>成本为 0 时回报率不可比较，此处沿用模型显示 0%。</p>' : ''}
    ${!o.disableLinks ? `<a href="https://stardewvalleywiki.com/${encodeURIComponent(crop.name.replaceAll(' ', '_'))}" target="_blank" rel="noopener noreferrer">查看作物百科</a>` : ''}</div>`;
}

function renderResults() {
  const selected = rows.find(c => c.key === state.selectedKey) ?? rows[0];
  state.selectedKey = selected?.key ?? null;
  const visible = state.showAll ? rows : rows.slice(0, 5);
  const max = Math.max(1, ...visible.map(c => Math.abs(c.drawProfit)));
  if (!rows.length) {
    $('crop-results').innerHTML = '<div class="empty-state"><strong>还没有可比较的作物</strong>请在高级设置中至少启用一个种子来源。</div>';
  } else if (state.view === 'chart') {
    $('crop-results').innerHTML = visible.map((crop, i) => `<button type="button" class="crop-row ${crop.drawProfit < 0 ? 'is-negative' : ''}" data-crop="${crop.key}" aria-pressed="${crop.key === state.selectedKey}" aria-label="查看${cropName(crop)}收益明细"><span class="rank">${i + 1}</span><img src="${cropImage(crop)}" alt=""><span class="crop-name">${cropName(crop)}</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="display:block;width:${Math.abs(crop.drawProfit) / max * 100}%"></span></span><span class="crop-value">${metricValue(crop)}</span></button>`).join('');
  } else {
    $('crop-results').innerHTML = `<table class="result-table"><thead><tr><th scope="col">作物</th><th scope="col">收获</th><th scope="col">耕地</th><th scope="col">${metricLabel[state.options.average]}</th></tr></thead><tbody>${visible.map(crop => `<tr class="${crop.key === state.selectedKey ? 'is-selected' : ''}"><td><button data-crop="${crop.key}" aria-label="查看${cropName(crop)}收益明细"><img src="${cropImage(crop)}" alt="">${cropName(crop)}</button></td><td>${crop.harvests}次</td><td>${crop.planted}</td><td>${metricValue(crop)}</td></tr>`).join('')}</tbody></table>`;
  }
  const o = computationOptions(state);
  $('result-context').textContent = `${SEASON_NAMES[o.season]}${o.season === 4 ? ` · ${state.duration} 天` : ` · 第 ${state.currentDay} 天种植${o.crossSeason ? ' · 跨季' : ''}`} · ${o.planted} 块 · ${processingNames[o.produce]}${o.predictionModel ? ' · 随机预测' : ''}`;
  $('result-count').textContent = `共 ${rows.length} 种`;
  $('show-all').hidden = rows.length <= 5;
  $('show-all').textContent = state.showAll ? '收起 · 只看前五名' : `查看全部 ${rows.length} 种作物`;
  $('crop-detail').hidden = !selected;
  if (selected) {
    const markup = detailMarkup(selected);
    $('crop-detail').innerHTML = `<div class="detail-desktop">${markup}</div><button class="detail-mobile" data-detail-open><img src="${cropImage(selected)}" alt=""><span>${cropName(selected)} · 收益明细</span>${icon('chevron', 18)}</button>`;
    $('detail-sheet-content').innerHTML = markup;
  }
}

async function update(sync = true) {
  const revision = ++calculationRevision;
  calculationClient.cancel();
  if (sync) syncControls();
  const options = computationOptions(state);
  try {
    if (options.predictionModel && options.planted * options.days > 50000) {
      $('crop-results').setAttribute('aria-busy', 'true');
      $('crop-results').innerHTML = '<div class="empty-state"><strong>正在计算…</strong></div>';
      $('crop-detail').hidden = true;
      rows = [];
      const result = await calculationClient.calculate(options);
      if (revision !== calculationRevision || result === null) return;
      rows = result;
    } else {
      rows = calculate(options);
    }
  } catch {
    if (revision !== calculationRevision) return;
    $('crop-results').removeAttribute('aria-busy');
    $('crop-results').innerHTML = '<div class="empty-state"><strong>本次计算未完成</strong>请关闭随机预测或减小地块与天数，再重试。</div>';
    $('crop-detail').hidden = true;
    return;
  }
  $('crop-results').removeAttribute('aria-busy');
  renderResults();
  const saved = saveState(state, storage);
  $('input-message').textContent = [inputWarning, !saved ? '浏览器未允许保存设置，仍可正常计算。' : ''].filter(Boolean).join(' ');
}

function readForm(clampInputs) {
  const numbers = ['current-day', 'duration', 'planted', 'budget', 'equipment'];
  inputWarning = '';
  for (const id of numbers) {
    const el = $(id);
    if (id === 'budget' && el.value === '') continue;
    if (!el.validity.valid || el.value === '') {
      if (!clampInputs) return false;
      const fallback = id === 'budget' || id === 'equipment' ? 0 : id === 'duration' ? 112 : id === 'planted' ? 60 : 1;
      const value = Number(el.value);
      el.value = String(el.value !== '' && Number.isFinite(value) ? Math.max(Number(el.min), Math.min(Number(el.max), Math.trunc(value))) : fallback);
      inputWarning = '输入已调整到可用范围。';
    }
  }
  const options = { ...state.options };
  for (const [id, key] of Object.entries(numberControls)) options[key] = Number($(id).value);
  for (const [id, key] of Object.entries(booleanControls)) options[key] = $(id).checked;
  options.seeds = Object.fromEntries(['pierre', 'joja', 'special'].map(name => [name, $(`seed-${name}`).checked]));
  options.skills = {
    till: $('tiller').checked, agri: $('profession').value === '1', arti: $('profession').value === '2',
    gatherer: $('gatherer').checked, botanist: $('botanist').checked,
  };
  options.foodLevel = Number($('food').value);
  options.foodIndex = [0, 1, 3, 6][options.foodLevel];
  state.options = normalizeOptions(options);
  state.currentDay = Number($('current-day').value);
  state.duration = Number($('duration').value);
  return true;
}

$('settings-form').addEventListener('submit', event => event.preventDefault());
$('settings-form').addEventListener('input', event => {
  if (event.target.type !== 'number') return;
  if (readForm(false)) update(false);
});
$('settings-form').addEventListener('change', () => { if (readForm(true)) update(); });
document.addEventListener('click', event => {
  const season = event.target.closest('[data-season]');
  const metric = event.target.closest('[data-metric]');
  const view = event.target.closest('[data-view]');
  const step = event.target.closest('[data-step]');
  const crop = event.target.closest('[data-crop]');
  const close = event.target.closest('[data-close]');
  if (season) {
    state.options.season = Number(season.dataset.season);
    state.options = normalizeOptions(state.options);
    state.selectedKey = null;
    state.showAll = false;
    update();
  } else if (metric) {
    state.options.average = Number(metric.dataset.metric);
    update();
  } else if (view) {
    state.view = view.dataset.view;
    update();
  } else if (step) {
    const [id, delta] = step.dataset.step.split(':');
    $(id).value = Math.min(28, Math.max(1, Number($(id).value) + Number(delta)));
    if (readForm(true)) update();
  } else if (crop) {
    state.selectedKey = crop.dataset.crop;
    renderResults();
    saveState(state, storage);
    if (matchMedia('(max-width: 760px)').matches) $('detail-dialog').showModal();
  } else if (event.target.closest('[data-detail-open]')) {
    $('detail-dialog').showModal();
  } else if (close) {
    $(close.dataset.close).close();
  }
});
let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { if (!$('crop-results').hasAttribute('aria-busy')) renderResults(); });
});
$('show-all').addEventListener('click', () => { state.showAll = !state.showAll; update(); });
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('reset').addEventListener('click', () => {
  state = createState(); inputWarning = ''; $('advanced').open = false; update();
});
$('recalculate').addEventListener('click', () => {
  state.options.predictionSeed = (state.options.predictionSeed + 1) >>> 0;
  update();
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
}
update();
