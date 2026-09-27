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

/** Free tier: this many rooms, just you. Pro: every room, the whole household, the printable chart. */
export const FREE_ROOM_LIMIT = 3;

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
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
  const [isPro, setIsPro] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // corrupted settings -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, []);

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
      paywallVisible,
      showPaywall,
      hidePaywall,
      ready,
      dataVersion,
      bumpData,
    }),
    [settings, updateSettings, isPro, refreshPro, paywallVisible, showPaywall, hidePaywall, ready, dataVersion, bumpData]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
