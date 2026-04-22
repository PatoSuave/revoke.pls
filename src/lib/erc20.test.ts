import { describe, expect, it } from 'vitest';
import { formatAllowance } from './erc20';

describe('formatAllowance', () => {
  it('formats finite allowances correctly', () => {
    expect(formatAllowance(1000000n, 6)).toBe('1');
    expect(formatAllowance(1500000n, 6)).toBe('1.5');
  });

  it('handles zero allowance', () => {
    expect(formatAllowance(0n, 18)).toBe('0');
  });

  it('formats large finite allowances', () => {
    expect(formatAllowance(10n ** 24n, 18)).toBe('1,000,000');
  });
});
