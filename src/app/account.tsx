import { useState } from 'react';

import { Button, Card, Input, Screen, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { confirm } from '@/lib/confirm';
import { ago } from '@/lib/time';
import { deleteCloudData, sendCode, signOut, syncConfigured, syncNow, verifyCode } from '@/store/cloud';
import { useSync } from '@/store/useSync';

export default function AccountScreen() {
  const t = useTheme();
  const { email, status, error, lastSync, dirty } = useSync();
  const now = useNow(15000);
  const [draft, setDraft] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      await sendCode(draft);
      setSentTo(draft.trim());
    });

  if (!syncConfigured) {
    return (
      <Screen>
        <Card>
          <T variant="heading">Sync isn’t set up</T>
          <T variant="muted">
            This copy of the app has no sync server configured, so your data stays on this device. Use Settings → Backup
            to move it between devices.
          </T>
        </Card>
      </Screen>
    );
  }

  if (email) {
    const pending = Object.keys(dirty).length;
    return (
      <Screen>
        <Card>
          <T variant="heading">Signed in</T>
          <T>{email}</T>
          <T variant="muted">
            {status === 'syncing'
              ? 'Syncing…'
              : status === 'error'
                ? `Sync failed: ${error}`
                : lastSync
                  ? `Synced ${ago(lastSync, now)}`
                  : 'Not synced yet'}
            {pending > 0 && status !== 'syncing' ? ` · ${pending} change${pending === 1 ? '' : 's'} to upload` : ''}
          </T>
          <Button icon="sync" title="Sync now" loading={status === 'syncing'} onPress={() => void syncNow()} />
          <T variant="small">
            Words, reviews, texts, chats, settings, progress and imported dictionaries sync automatically. Your AI key
            stays on each device.
          </T>
        </Card>
        <Card>
          <Button variant="secondary" icon="log-out-outline" title="Sign out" loading={busy} onPress={() => run(signOut)} />
          <T variant="small">Signing out keeps your data on this device.</T>
          <Button
            variant="ghost"
            title="Delete my cloud data"
            onPress={() =>
              confirm('Delete everything synced to your account? Data on this device is kept.', () => void run(deleteCloudData))
            }
          />
        </Card>
        {message && <T style={{ color: t.danger }}>{message}</T>}
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <T variant="heading">Sync across devices</T>
        <T variant="muted">
          Sign in with your email to keep your words and progress in sync on your phone, tablet and the web. No password:
          we email you a sign-in code.
        </T>
        {sentTo ? (
          <>
            <T>Enter the code sent to {sentTo}.</T>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              accessibilityLabel="Sign-in code"
              onSubmitEditing={() => run(() => verifyCode(sentTo, code))}
            />
            <Button title="Sign in" loading={busy} disabled={code.trim().length < 6} onPress={() => run(() => verifyCode(sentTo, code))} />
            <Button
              variant="ghost"
              title="Use a different email"
              onPress={() => {
                setSentTo(null);
                setCode('');
              }}
            />
          </>
        ) : (
          <>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email"
              onSubmitEditing={send}
            />
            <Button
              title="Email me a code"
              icon="mail-outline"
              loading={busy}
              disabled={!/^\S+@\S+\.\S+$/.test(draft.trim())}
              onPress={send}
            />
          </>
        )}
        {message && <T style={{ color: t.danger }}>{message}</T>}
        <T variant="small">Words already on this device are merged into your account when you sign in.</T>
      </Card>
    </Screen>
  );
}
