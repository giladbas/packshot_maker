'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Nav } from '@/components/nav';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

export default function SettingsPage() {
  const { session, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }), [session]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/settings', { headers: headers() })
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setHasApiKey(data.settings.has_api_key);
          setMaskedKey(data.settings.gemini_api_key || '');
        }
        setLoading(false);
      });
  }, [session, headers]);

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ gemini_api_key: apiKey.trim() }),
    });
    setSaving(false);
    setSaved(true);
    setHasApiKey(true);
    setMaskedKey(`${apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}`);
    setApiKey('');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-lg font-semibold text-fg-primary mb-6">Settings</h1>

          {/* Gemini API Key */}
          <section className="mb-8">
            <h2 className="text-sm font-medium text-fg-primary mb-3">Gemini API Key</h2>
            {hasApiKey && (
              <p className="text-xs text-fg-muted mb-2 font-mono">{maskedKey}</p>
            )}
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? 'Enter new key to update' : 'Enter your Gemini API key'}
                className="flex-1 px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm placeholder:text-fg-muted"
                autoComplete="off"
              />
              <button
                onClick={saveApiKey}
                disabled={saving || !apiKey.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </section>

          {/* Theme */}
          <section className="mb-8">
            <h2 className="text-sm font-medium text-fg-primary mb-3">Theme</h2>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-border rounded-xl w-full text-left transition-colors hover:border-accent/30"
            >
              <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <div>
                <p className="text-sm text-fg-primary font-medium capitalize">{theme} Mode</p>
                <p className="text-xs text-fg-muted">Tap to switch to {theme === 'dark' ? 'light' : 'dark'} mode</p>
              </div>
            </button>
          </section>

          {/* Account */}
          <section className="mb-8">
            <h2 className="text-sm font-medium text-fg-primary mb-3">Account</h2>
            <div className="bg-card-bg border border-border rounded-xl p-4">
              <p className="text-sm text-fg-primary">{user?.email}</p>
              <p className="text-xs text-fg-muted mt-0.5">Signed in</p>
            </div>
          </section>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="w-full py-2.5 border border-danger/30 text-danger hover:bg-danger/10 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
        <Nav />
      </div>
    </AuthGuard>
  );
}
