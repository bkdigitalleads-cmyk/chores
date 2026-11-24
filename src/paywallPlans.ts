/**
 * Plan helpers shared by the paywall and the Settings upsell row, so both
 * agree on which plan leads and on when trial wording may be shown.
 * Read-only: purchases themselves stay in purchases.ts.
 */
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { isBillingAvailable } from './purchases';

/** "3 days free" / "1 week free" for a free intro offer, otherwise null. */
export function trialLabel(pkg: PurchasesPackage | undefined): string | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits;
  const unit = intro.periodUnit.toLowerCase();
  return `${n} ${unit}${n === 1 ? '' : 's'} free`;
}

/**
 * The plan the paywall preselects: free Lifetime during a launch offer,
 * else Yearly, else Weekly (offering without an annual package), else Lifetime.
 */
export function leadPackage(off: PurchasesOffering | null | undefined): PurchasesPackage | null {
  const freeLifetime = off?.lifetime && off.lifetime.product.price === 0 ? off.lifetime : null;
  return freeLifetime ?? off?.annual ?? off?.weekly ?? off?.lifetime ?? off?.availablePackages?.[0] ?? null;
}

/**
 * Product ids with a free trial this Apple ID can still get, per StoreKit.
 * Unknown status or an error counts as not eligible: never promise a trial we are not sure of.
 */
export async function trialEligibility(
  off: PurchasesOffering | null | undefined
): Promise<Record<string, boolean>> {
  const eligible: Record<string, boolean> = {};
  const ids = (off?.availablePackages ?? [])
    .filter((p) => p.product.introPrice?.price === 0)
    .map((p) => p.product.identifier);
  if (ids.length === 0 || !isBillingAvailable()) return eligible;
  try {
    const res = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
    for (const id of ids)
      eligible[id] = res[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  } catch {
    // Leave everything ineligible.
  }
  return eligible;
}
