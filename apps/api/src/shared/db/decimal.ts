import type { Prisma } from "@prisma/client";

/** Prisma の Decimal / number / null をドメインの number | null に正規化する。 */
export function toNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

/** null を許さない Decimal → number。 */
export function toNumberStrict(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : value.toNumber();
}
