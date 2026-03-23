import BigNumber from "bignumber.js";

type Numeric = number | string | BigNumber;

function toNumber(value: Numeric): BigNumber {
  return value instanceof BigNumber ? value : new BigNumber(value);
}

function normalizePrecision(
  value: BigNumber,
  fixLength?: number | null
): number {
  if (typeof fixLength === "number" && Number.isFinite(fixLength)) {
    return Number(value.toFixed(fixLength, BigNumber.ROUND_HALF_UP));
  }
  return value.toNumber();
}

export function plus(n1: Numeric, n2: Numeric, fixLength?: number): number {
  const result = toNumber(n1).plus(n2);
  return normalizePrecision(result, fixLength);
}

export function minus(n1: Numeric, n2: Numeric, fixLength?: number): number {
  const result = toNumber(n1).minus(n2);
  return normalizePrecision(result, fixLength);
}

export function multiple(n1: Numeric, n2: Numeric, fixLength?: number): number {
  const result = toNumber(n1).multipliedBy(n2);
  return normalizePrecision(result, fixLength);
}

export function divide(n1: Numeric, n2: Numeric, fixLength?: number): number {
  const rhs = toNumber(n2);
  if (rhs.isZero()) {
    throw new Error("divide: divisor cannot be zero");
  }
  const result = toNumber(n1).dividedBy(rhs);
  return normalizePrecision(result, fixLength);
}
