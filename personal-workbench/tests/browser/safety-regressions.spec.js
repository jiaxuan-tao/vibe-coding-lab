import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('./');await expect(page.locator('#view h1')).toBeVisible();});
async function seed(page,value,route){
  await page.evaluate(async value=>(await import('./js/store.js')).store.importBackup(JSON.stringify(value)),value);
  await page.goto('./#/'+route);
}
test('unsaved note draft survives searching and switching notes',async({page})=>{
  await seed(page,{notes:[{id:'a',title:'First note',body:'Original',tags:[],updatedAt:1},{id:'b',title:'Second note',body:'Other',tags:[],updatedAt:2}]},'notes');
  await page.locator('.note-item').filter({hasText:'First note'}).click();
  await page.getByPlaceholder('标题',{exact:true}).fill('Unsaved draft');
  await page.getByRole('textbox',{name:/^正文/}).fill('Draft body');
  await page.getByPlaceholder('搜索标题 / 内容 / 标签…').fill('First');
  await expect(page.getByPlaceholder('标题',{exact:true})).toHaveValue('Unsaved draft');
  await page.getByPlaceholder('搜索标题 / 内容 / 标签…').fill('');
  await page.locator('.note-item').filter({hasText:'Second note'}).click();
  await page.locator('.note-item').filter({hasText:'First note'}).click();
  await expect(page.getByPlaceholder('标题',{exact:true})).toHaveValue('Unsaved draft');
  await expect(page.getByRole('textbox',{name:/^正文/})).toContainText('Draft body');
});
test('failed persistent modal submission keeps form input and permits retry',async({page})=>{
  await page.goto('./#/todos');
  await page.getByRole('button',{name:'+ 新建待办',exact:true}).click();
  await page.getByLabel('事项',{exact:true}).fill('Draft survives quota failure');
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='vcl.personal-workbench.data.v1')throw new DOMException('Quota exceeded','QuotaExceededError');return window.originalSetItem.call(this,key,value);};});
  await page.getByRole('dialog').getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('事项',{exact:true})).toHaveValue('Draft survives quota failure');
  await expect(page.locator('#toast-root')).toContainText('保存');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await page.getByRole('dialog').getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.todo-item')).toContainText('Draft survives quota failure');
});
test('unknown route recovers without an uncaught error',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>location.hash='#/not-a-view');
  await expect(page.locator('.hero h1')).toBeVisible();
  await expect(page).toHaveURL(/#\/dashboard$/);
  expect(errors).toEqual([]);
});
test('dashboard never presents a partial quote as total P&L',async({page})=>{
  await seed(page,{stocks:{trades:[
    {id:'a',code:'sh600000',side:'buy',price:10,qty:100,date:'2026-10-15'},
    {id:'b',code:'sh600001',side:'buy',price:20,qty:100,date:'2026-10-15'}
  ],watchlist:[],notes:[]}},'dashboard');
  await page.evaluate(()=>localStorage.setItem('vcl.personal-workbench.quotes',JSON.stringify({sh600000:{name:'Fictional A',price:12,pct:0,ts:1,market:'a'}})));
  await page.reload();
  await expect(page.locator('.quote-body .big')).toHaveText('—');
});

test('format-only note draft survives a search redraw', async ({page})=>{
  await seed(page,{notes:[{id:'a',title:'Formatting note',body:'<p>Original paragraph</p>',tags:[],updatedAt:1}]},'notes');
  await page.locator('.rich-ed').evaluate(editor=>{
    editor.focus();
    const range=document.createRange();
    range.setStart(editor.querySelector('p').firstChild,1);range.collapse(true);
    getSelection().removeAllRanges();getSelection().addRange(range);
  });
  await page.locator('.rich-sw-bd').nth(1).click();
  await expect(page.locator('.rich-ed p')).toHaveAttribute('style',/background-color/);
  await page.getByPlaceholder('搜索标题 / 内容 / 标签…').fill('Formatting');
  await expect(page.locator('.rich-ed p')).toHaveAttribute('style',/background-color/);
});

test('keyboard idea submission updates the list immediately',async({page})=>{
  await page.goto('./#/ideas');
  const editor=page.getByRole('textbox',{name:/^一句话灵感/});
  await editor.fill('Fictitious keyboard idea');await editor.press('Enter');
  await expect(page.locator('.idea-card')).toContainText('Fictitious keyboard idea');
  await expect(page.getByRole('textbox',{name:/^一句话灵感/})).toBeEmpty();
});

test('learning never announces completion before storage commits',async({page})=>{
  await seed(page,{learning:{plans:[{id:'p',name:'Fictitious learning',goal:'',progress:90}],checkins:[]}},'learning');
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='vcl.personal-workbench.data.v1')throw new DOMException('Quota','QuotaExceededError');return original.call(this,key,value);};
    window.toastHistory=[];
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>window.toastHistory.push(node.textContent||''))))
      .observe(document.getElementById('toast-root'),{childList:true,subtree:true});
  });
  await page.getByRole('button',{name:'+10% 进度',exact:true}).click();
  await expect(page.locator('#toast-root')).toContainText('保存');
  expect((await page.evaluate(()=>window.toastHistory)).join(' ')).not.toContain('计划完成');
  expect(await page.evaluate(async()=>(await import('./js/store.js')).store.data.learning.plans[0].progress)).toBe(90);
});

test('dashboard flags incomplete buy-sell history instead of a complete realized total',async({page})=>{
  await seed(page,{stocks:{trades:[
    {id:'a',code:'sh600000',side:'buy',price:10,qty:100,date:'2026-10-15'},
    {id:'b',code:'sh600000',side:'sell',price:12,qty:200,date:'2026-10-16'},
  ],watchlist:[{code:'sh600000'}],notes:[]}},'dashboard');
  await expect(page.locator('.quote-body')).toContainText('记录不完整');
});
