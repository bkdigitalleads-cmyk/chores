import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases, getIsPro } from './purchases';
import { PromoGrant, checkPromo, getStoredGrant } from './promo';

export interface Settings {
  /** Printed on the chore chart: "The Rivera House", "Apt 4B". */
  householdName: string;
  /** Week starts Monday (true) or Sunday (false) on the chart. */
  mondayFirst: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  householdName: '',
  mondayFirst: false,
};

export const SETTINGS_KEY = 'chores.settings.v1';
export const ONBOARDED_KEY = 'chores.onboarded.v1';

/** Free tier: this many rooms, just you. Pro: every room, the whole household, the printable chart. */
export const FREE_ROOM_LIMIT = 3;

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Pro from a purchase, or from a launch offer (see promo.ts). */
  isPro: boolean;
  /** Sets the purchased state (RevenueCat). A launch-offer grant is separate and never cleared. */
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
  /** Set when Pro came from a launch offer rather than a purchase. */
  promoGrant: PromoGrant | null;
  /** True once, right after a launch offer unlocks Pro on this launch; App shows the note and clears it. */
  promoJustGranted: boolean;
  clearPromoJustGranted: () => void;
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  ready: boolean;
  dataVersion: number;
  bumpData: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [purchasedPro, setIsPro] = useState(false);
  const [promoGrant, setPromoGrant] = useState<PromoGrant | null>(null);
  const [promoJustGranted, setPromoJustGranted] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const isPro = purchasedPro || promoGrant !== null;

  useEffect(() => {
    let onboarded = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // corrupted settings -> defaults
      }
      try {
        onboarded = (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
      } catch {
        onboarded = true;
      }
      const stored = await getStoredGrant();
      if (stored) setPromoGrant(stored);
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      const onGrant = (g: PromoGrant | null) => {
        if (!g) return;
        setPromoGrant(g);
        setPromoJustGranted(true);
      };
      if (!stored) {
        if (!onboarded) {
          // First launch: wait briefly so an open offer can skip the paywall. Offline just times out.
          onGrant(await checkPromo(3000));
        } else {
          // Later launches: never hold the app on the network.
          checkPromo(8000).then(onGrant).catch(() => {});
        }
      }
      setReady(true);
    })();
  }, []);

  const clearPromoJustGranted = useCallback(() => setPromoJustGranted(false), []);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // non-fatal
      }
    },
    [settings]
  );

  const refreshPro = useCallback(async () => {
    setIsPro(await getIsPro());
  }, []);

  const showPaywall = useCallback(() => setPaywallVisible(true), []);
  const hidePaywall = useCallback(() => setPaywallVisible(false), []);
  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      isPro,
      setIsPro,
      refreshPro,
      promoGrant,
      promoJustGranted,
      clearPromoJustGranted,
      paywallVisible,
      showPaywall,
      hidePaywall,
      ready,
      dataVersion,
      bumpData,
    }),
    [settings, updateSettings, isPro, refreshPro, promoGrant, promoJustGranted, clearPromoJustGranted, paywallVisible, showPaywall, hidePaywall, ready, dataVersion, bumpData]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
