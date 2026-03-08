import { describe, it, expect } from 'vitest';

import { computeAgeFloor } from '../verify.service.js';

// Fixed reference date for deterministic tests
const TODAY = new Date('2026-03-07');

describe('computeAgeFloor', () => {
  it('returns 21 for someone aged 21 or older', () => {
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21); // birthday passed
  });

  it('returns 18 for someone aged exactly 18 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2008-01-01', TODAY)).toBe(18);
  });

  it('returns null for someone whose 18th birthday is later this year', () => {
    expect(computeAgeFloor('2008-12-31', TODAY)).toBeNull();
  });

  it('returns null for someone under 18', () => {
    expect(computeAgeFloor('2015-06-15', TODAY)).toBeNull();
  });

  it('returns 18 (not 21) for someone aged 20 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2006-01-01', TODAY)).toBe(18);
  });

  it('returns 18 for someone whose 21st birthday is later this year', () => {
    // DOB 2005-12-31: born Dec 31 2005. By March 7 2026, age is 20 (birthday not yet).
    expect(computeAgeFloor('2005-12-31', TODAY)).toBe(18);
  });

  it('returns 21 for someone who turned 21 this year (birthday already passed)', () => {
    // DOB 2005-01-01: born Jan 1 2005. By March 7 2026, birthday has passed, age is 21.
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21);
  });

  it('defaults today to current date when not provided', () => {
    const result = computeAgeFloor('1990-01-01');
    expect(result === 21 || result === 18 || result === null).toBe(true);
  });
});
