import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, SectionTitle } from '../components';
import { useApp } from '../state';
import { deleteAllData } from '../db';
import { restorePurchases, isBillingAvailable } from '../purchases';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/chores/privacy.html';
const SUPPORT_URL = 'https://bkdigitalleads-cmyk.github.io/chores/support.html';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, showPaywall, bumpData } = useApp();
  const [busy, setBusy] = useState(false);

  const onRestore = async () => {
    if (!isBillingAvailable()) {
      Alert.alert('Unavailable', 'Purchases are not available right now.');
      return;
    }
    setBusy(true);
    const res = await restorePurchases();
    setBusy(false);
    if (res.ok) {
      setIsPro(res.isPro);
      Alert.alert(
        res.isPro ? 'Restored' : 'No purchases found',
        res.isPro ? 'Your Pro access is back.' : 'We couldn’t find a previous purchase on this Apple ID.'
      );
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const onDeleteAll = () => {
    Alert.alert('Delete everything?', 'Every room, chore, person, and check-off is permanently erased from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          bumpData();
        },
      },
    ]);
  };

  const row = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} disabled={busy} style={styles.row}>
      <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
      <Text style={{ color: theme.textFaint }}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      {!isPro ? (
        <Pressable onPress={showPaywall}>
          <Card theme={theme} style={{ ...styles.upsell, backgroundColor: theme.accentSoft }}>
            <Text style={[styles.upsellTitle, { color: theme.accent }]}>Chores Pro</Text>
            <Text style={[styles.upsellSub, { color: theme.text }]}>
              Every room, pet, yard and car · the whole household · taking turns · printable chore chart. Starts with 3 days free.
            </Text>
          </Card>
        </Pressable>
      ) : (
        <Card theme={theme} style={{ ...styles.upsell, backgroundColor: theme.accentSoft }}>
          <Text style={[styles.upsellTitle, { color: theme.accent }]}>Chores Pro is on</Text>
          <Text style={[styles.upsellSub, { color: theme.text }]}>Thanks for supporting a small, independent app.</Text>
        </Card>
      )}

      <SectionTitle theme={theme}>Your home</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Household name (on the printed chart)</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.householdName}
          onChangeText={(v) => updateSettings({ householdName: v })}
          placeholder="The Rivera House"
          placeholderTextColor={theme.textFaint}
        />
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={[styles.rowText, { color: theme.text }]}>Week starts on Monday</Text>
          <Switch
            value={settings.mondayFirst}
            onValueChange={(v) => updateSettings({ mondayFirst: v })}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </Card>

      <SectionTitle theme={theme}>Privacy & data</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          Your rooms, chores, and household stay on this iPhone. No account, no cloud, no tracking.
        </Text>
      </Card>

      <SectionTitle theme={theme}>Purchases & support</SectionTitle>
      <Card theme={theme}>
        {row(busy ? 'Restoring…' : 'Restore purchases', onRestore)}
        {row('Terms of Use (EULA)', () => Linking.openURL(TERMS_URL))}
        {row('Privacy Policy', () => Linking.openURL(PRIVACY_URL))}
        {row('Support', () => Linking.openURL(SUPPORT_URL))}
      </Card>

      <SectionTitle theme={theme}>Danger zone</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onDeleteAll} style={styles.row}>
          <Text style={[styles.rowText, { color: theme.danger }]}>Delete all data</Text>
        </Pressable>
      </Card>

      <Text style={[styles.version, { color: theme.textFaint }]}>
        Chores v{Constants.expoConfig?.version ?? ''} · Made in NYC
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 32, fontWeight: fonts.weight.bold, letterSpacing: -0.6, marginBottom: 8 },
  upsell: { marginTop: 8, borderWidth: 0 },
  upsellTitle: { fontSize: 17, fontWeight: fonts.weight.bold, marginBottom: 4 },
  upsellSub: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, minHeight: 40 },
  rowText: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  nameInput: { fontSize: 17, paddingVertical: 2 },
  privacyNote: { fontSize: 13, lineHeight: 19, paddingVertical: 4 },
  version: { textAlign: 'center', marginTop: 28, fontSize: 12 },
});
