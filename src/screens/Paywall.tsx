import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp } from '../state';
import {
  getOffering,
  purchasePackage,
  restorePurchases,
  isBillingAvailable,
} from '../purchases';
import { leadPackage, trialEligibility, trialLabel } from '../paywallPlans';

// Copy lever 1: the word "free" sits next to a feature.
const FEATURES: { icon: string; title: string; sub: string; free?: boolean }[] = [
  { icon: '✅', title: 'Today’s chores, done in minutes', sub: 'Only what’s due, room by room. Tick it off and it reschedules itself.', free: true },
  { icon: '🏠', title: 'The whole house, pets, yard and car', sub: 'Kitchen to garage, dog walks to oil changes. Pick from the usual chores for each.' },
  { icon: '👨‍👩‍👧', title: 'The whole household', sub: 'Assign chores, take turns automatically, and watch the points add up.' },
  { icon: '🖨️', title: 'Printable chore chart', sub: 'A weekly chart for the fridge with a box for every day a chore is due.' },
];

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function perUnit(pkg: PurchasesPackage | undefined, unit: 'week' | 'year'): string {
  return pkg ? `${pkg.product.priceString}/${unit}` : '';
}

export default function PaywallModal({ privacyUrl }: { privacyUrl: string }) {
  const theme = useTheme();
  const { paywallVisible, hidePaywall, setIsPro } = useApp();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Product ids whose free trial StoreKit says this Apple ID can still get.
  const [trialEligible, setTrialEligible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!paywallVisible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      // Trial wording only for products this Apple ID can still get a trial on.
      setTrialEligible(await trialEligibility(off));
      setOffering(off);
      // Yearly is the primary plan (Nov 2026: weekly trials were not converting; same change as Attend 1.0.6).
      // No annual package in the offering: Weekly leads as before.
      // During a launch offer the Lifetime price is set to 0 in App Store Connect; then it leads.
      setSelected(leadPackage(off));
      setLoading(false);
    })();
  }, [paywallVisible]);

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      // Apple already shows its own confirmation; no second pop-up.
      setIsPro(true);
      hidePaywall();
    } else if (!res.userCancelled && res.error) {
      Alert.alert('Purchase failed', res.error);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Restored', 'Your Pro purchase is active again.');
    } else if (res.ok) {
      Alert.alert('No purchases found', 'We couldn’t find a previous Pro purchase on this Apple ID.');
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const lifetimeFree = (offering?.lifetime?.product.price ?? 1) === 0;
  const hasAnnual = (offering?.availablePackages ?? []).some((p) => p.packageType === 'ANNUAL');
  // Yearly leads unless Lifetime is free (launch offer) or there is no annual package.
  // In those two cases everything below behaves exactly as it did in 1.0.2.
  const yearlyLeads = !lifetimeFree && hasAnnual;
  // Order: Yearly (primary), Weekly, Lifetime (anchor).
  // Old order, still used when Yearly does not lead: Weekly, Yearly, Lifetime; Lifetime first while it is free.
  const rank = (p: PurchasesPackage) =>
    yearlyLeads
      ? p.packageType === 'ANNUAL' ? 0 : p.packageType === 'WEEKLY' ? 1 : p.packageType === 'LIFETIME' ? 2 : 3
      : p.packageType === 'LIFETIME' && lifetimeFree
        ? -1
        : p.packageType === 'WEEKLY' ? 0 : p.packageType === 'ANNUAL' ? 1 : p.packageType === 'LIFETIME' ? 2 : 3;
  const packages = [...(offering?.availablePackages ?? [])].sort((a, b) => rank(a) - rank(b));

  const weeklyPkg = packages.find((p) => p.packageType === 'WEEKLY');
  const annualPkg = packages.find((p) => p.packageType === 'ANNUAL');
  const lifetimePkg = packages.find((p) => p.packageType === 'LIFETIME');
  // When Yearly leads, trial wording needs a real eligible free trial; the old layout keeps its old wording.
  const trialFor = (pkg: PurchasesPackage | undefined) =>
    yearlyLeads && pkg && !trialEligible[pkg.product.identifier] ? null : trialLabel(pkg);
  const weeklyTrial = trialFor(weeklyPkg);
  const annualTrial = trialFor(annualPkg);
  const selectedTrial =
    selected?.packageType === 'WEEKLY' ? weeklyTrial : selected?.packageType === 'ANNUAL' ? annualTrial : null;
  const selectedIsLifetime = selected?.packageType === 'LIFETIME';

  const fmt = (n: number, cur?: string) =>
    n.toLocaleString(undefined, { style: 'currency', currency: cur ?? 'USD' });
  // Copy lever 4: the yearly-equivalent / per-month (or per-week, when Yearly leads) price next to the plan.
  const annualPerMonth = annualPkg?.product.price
    ? `${fmt(annualPkg.product.price / 12, annualPkg.product.currencyCode)}/mo`
    : null;
  const annualPerWeek = annualPkg?.product.price
    ? `About ${fmt(annualPkg.product.price / 52, annualPkg.product.currencyCode)} a week`
    : null;
  const weeklyPerYear = weeklyPkg?.product.price
    ? `${fmt(weeklyPkg.product.price * 52, weeklyPkg.product.currencyCode)}/yr`
    : null;

  // Always-visible 3.1.2(c) disclosure, built from whatever StoreKit returned.
  const weeklyTerms = weeklyPkg
    ? `Weekly ${perUnit(weeklyPkg, 'week')} is an auto-renewing subscription billed once per week until cancelled${
        weeklyTrial ? `; it starts with ${weeklyTrial} and you are not charged until the trial ends` : ''
      }.`
    : null;
  const annualTerms = annualPkg
    ? `Yearly ${perUnit(annualPkg, 'year')} is an auto-renewing subscription billed once per year until cancelled${
        annualTrial ? `; it starts with ${annualTrial} and you are not charged until the trial ends` : ''
      }.`
    : null;
  const disclosureParts: string[] = [];
  if (weeklyTerms) disclosureParts.push(weeklyTerms);
  if (annualTerms) disclosureParts.push(annualTerms);
  if (lifetimePkg)
    disclosureParts.push(
      lifetimeFree
        ? 'Lifetime is a one-time purchase, free right now as a launch offer.'
        : `Lifetime ${lifetimePkg.product.priceString} is a one-time purchase.`
    );
  const genericDisclosure =
    'Pro is offered as a Weekly or Yearly auto-renewing subscription, or a one-time Lifetime purchase.';
  const cancelLine = ' Cancel anytime in your Apple ID settings.';
  // When Yearly leads, the small print describes the selected plan only; Lifetime gets no cancel line.
  const disclosure = yearlyLeads
    ? selectedIsLifetime && lifetimePkg
      ? `Lifetime ${lifetimePkg.product.priceString} is a one-time purchase, not a subscription.`
      : (selected?.packageType === 'WEEKLY' && weeklyTerms
          ? weeklyTerms
          : selected?.packageType === 'ANNUAL' && annualTerms
            ? annualTerms
            : disclosureParts.length > 0
              ? disclosureParts.join(' ')
              : genericDisclosure) + cancelLine
    : (disclosureParts.length > 0 ? disclosureParts.join(' ') : genericDisclosure) + cancelLine;

  const pitch = 'Every room, everyone in the house, and a chore chart that keeps itself up to date.';
  // While the first offering loads, show the plain pitch so no trial is promised before eligibility is known.
  const subtitle =
    loading && !offering
      ? pitch
      : lifetimeFree
        ? 'Launch offer: Chores Pro is free right now. Get it once and keep it forever.'
        : !yearlyLeads
          ? `Start with ${weeklyTrial ?? '3 days free'}. ${pitch}`
          : selectedIsLifetime
            ? `Pay once and keep it forever. ${pitch}`
            : selectedTrial
              ? `Start with ${selectedTrial}. ${pitch}`
              : pitch;

  // Copy lever 2: the button says Continue, never Subscribe.
  const buttonLabel = purchasing
    ? 'One moment…'
    : lifetimeFree && selectedIsLifetime
      ? 'Get Pro free'
      : yearlyLeads && selectedIsLifetime && selected
        ? `Get Lifetime for ${selected.product.priceString}`
        : yearlyLeads && selectedTrial
          ? 'Start free trial'
          : 'Continue';

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={hidePaywall}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={hidePaywall} hitSlop={12} style={styles.close}>
            <Text style={[styles.closeText, { color: theme.textFaint }]}>✕</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text }]}>
            A clean home without{'\n'}the mental load.
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.featureTitleRow}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                    {f.free && (
                      <View style={[styles.freeTag, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.freeTagText, { color: theme.accent }]}>FREE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.featureSub, { color: theme.textSecondary }]}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={theme.accent} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[styles.unavailable, { color: theme.textSecondary }]}>
              Purchases aren’t available right now. Please try again later.
            </Text>
          ) : (
            <View style={styles.packages}>
              {packages.map((p) => {
                const active = selected?.identifier === p.identifier;
                const isAnnual = p.packageType === 'ANNUAL';
                const isLifetime = p.packageType === 'LIFETIME';
                const isWeekly = p.packageType === 'WEEKLY';
                const title = isWeekly ? 'Weekly' : isAnnual ? 'Yearly' : isLifetime ? 'Lifetime' : p.product.title;
                // 3.1.2(c) on the row itself: trial length, then the price after it.
                const line = isWeekly
                  ? weeklyTrial
                    ? `${weeklyTrial}, then ${p.product.priceString}/week`
                    : `${p.product.priceString}/week`
                  : isAnnual
                    ? `${annualTrial ? `${annualTrial}, then ` : ''}${p.product.priceString}/year${!yearlyLeads && annualPerMonth ? ` · ${annualPerMonth}` : ''}`
                    : isLifetime
                      ? lifetimeFree
                        ? 'Free right now, keep forever'
                        : 'Pay once, keep forever'
                      : '';
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    style={[
                      styles.pkg,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accentSoft : theme.card,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.pkgTitleRow}>
                        <Text style={[styles.pkgTitle, { color: theme.text }]}>{title}</Text>
                        {(lifetimeFree ? isLifetime : yearlyLeads ? isAnnual : isWeekly) && (
                          <View style={[styles.popular, { backgroundColor: theme.highlight }]}>
                            <Text style={styles.popularText}>
                              {lifetimeFree ? 'LAUNCH OFFER' : yearlyLeads ? 'BEST VALUE' : 'MOST POPULAR'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.pkgLine, { color: isWeekly || isAnnual || (isLifetime && lifetimeFree) ? theme.accent : theme.textSecondary }]}>
                        {line}
                      </Text>
                      {yearlyLeads && isAnnual && annualPerWeek && (
                        <Text style={[styles.pkgEquiv, { color: theme.textFaint }]}>{annualPerWeek}</Text>
                      )}
                      {isWeekly && weeklyPerYear && (
                        <Text style={[styles.pkgEquiv, { color: theme.textFaint }]}>{weeklyPerYear} if kept all year</Text>
                      )}
                    </View>
                    <Text style={[styles.pkgPrice, { color: theme.text }]}>
                      {isLifetime && lifetimeFree ? 'Free' : p.product.priceString}
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        {isAnnual ? '/yr' : isWeekly ? '/wk' : ''}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
              <PillButton
                theme={theme}
                label={buttonLabel}
                onPress={buy}
                disabled={purchasing || !selected}
              />
              {/* Copy lever 3: "No payment now" on trial tiers. */}
              {selected?.packageType === 'LIFETIME' ? (
                <Text style={[styles.noPayment, { color: theme.success }]}>
                  {lifetimeFree ? '✓ Free, no subscription, yours for good' : '✓ One-time purchase, no subscription'}
                </Text>
              ) : (yearlyLeads ? !!selectedTrial : selected?.product.introPrice?.price === 0) ? (
                <Text style={[styles.noPayment, { color: theme.success }]}>✓ No payment now</Text>
              ) : null}
            </View>
          )}
        </ScrollView>

        {/*
          App Review guideline 3.1.2(c): title, length, price and functional
          Terms of Use (EULA) + Privacy Policy links live in the app itself.
          Outside the ScrollView and outside the "offering loaded" branch on
          purpose: visible without scrolling, rendered even with no products.
        */}
        <View style={[styles.legal, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={[styles.legalText, { color: theme.textSecondary }]}>
            Chores Pro. {disclosure}
          </Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={onRestore}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(privacyUrl)}>
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  close: { alignSelf: 'flex-end', padding: 4 },
  closeText: { fontSize: 22 },
  title: { fontSize: 28, fontWeight: fonts.weight.bold, letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 22 },
  features: { gap: 14, marginBottom: 24 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { fontSize: 22 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  featureSub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  freeTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  freeTagText: { fontSize: 10, fontWeight: fonts.weight.bold, letterSpacing: 0.5 },
  packages: { gap: 12 },
  pkg: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 16 },
  pkgTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  popular: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularText: { fontSize: 9, fontWeight: fonts.weight.bold, color: '#16231B', letterSpacing: 0.5 },
  pkgLine: { fontSize: 12, fontWeight: fonts.weight.semibold, marginTop: 3 },
  pkgEquiv: { fontSize: 11, marginTop: 2 },
  pkgPrice: { fontSize: 17, fontWeight: fonts.weight.bold, marginLeft: 10 },
  unavailable: { textAlign: 'center', marginVertical: 24, fontSize: 15 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
  legal: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, gap: 6 },
  legalText: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  legalLink: { fontSize: 12, fontWeight: fonts.weight.semibold, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12 },
});
