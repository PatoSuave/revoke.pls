import { describe, expect, it } from 'vitest';
import { classifyApprovalRisk, classifyNftRisk } from './risk';

describe('classifyApprovalRisk', () => {
  it('identifies low risk for trusted finite allowances', () => {
    const risk = classifyApprovalRisk({ trusted: true, unlimited: false });
    expect(risk.level).toBe('low');
  });

  it('identifies medium risk for trusted unlimited allowances', () => {
    const risk = classifyApprovalRisk({ trusted: true, unlimited: true });
    expect(risk.level).toBe('medium');
  });

  it('identifies high risk for unknown unlimited allowances', () => {
    const risk = classifyApprovalRisk({ trusted: false, unlimited: true });
    expect(risk.level).toBe('high');
  });
});

describe('classifyNftRisk', () => {
  it('identifies high risk for unknown approvalForAll', () => {
    const risk = classifyNftRisk({ kind: 'approvalForAll', trusted: false });
    expect(risk.level).toBe('high');
  });

  it('identifies low risk for trusted tokenApproval', () => {
    const risk = classifyNftRisk({ kind: 'tokenApproval', trusted: true });
    expect(risk.level).toBe('low');
  });
});
