import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, onLocaleChange, setLocale, t } from '../src/i18n';

afterEach(() => setLocale('en'));

describe('interface locale', () => {
  it('switches labels without translating interpolation values', () => {
    setLocale('zh-CN');
    expect(getLocale()).toBe('zh-CN');
    expect(t('Options')).toBe('对比设置');
    expect(t('{name} could not be opened.', { name: 'Original 需求.md' })).toBe('无法打开 Original 需求.md。');
    setLocale('en');
    expect(t('Options')).toBe('Options');
  });
  it('notifies once for a real change and supports unsubscribe', () => {
    setLocale('en');
    let count = 0;
    const unsubscribe = onLocaleChange(() => count++);
    setLocale('zh-CN');
    setLocale('zh-CN');
    expect(count).toBe(1);
    unsubscribe();
    setLocale('en');
    expect(count).toBe(1);
  });
  it('does not recursively substitute user data', () => {
    setLocale('en');
    expect(t('{name} {value}', { name: '{value}', value: 'secret' })).toBe('{value} secret');
  });
});
