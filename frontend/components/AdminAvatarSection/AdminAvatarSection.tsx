'use client';

import { useEffect, useState } from 'react';
import { authApi, getToken } from '@/lib/api';
import AvatarEditor from '@/components/AvatarEditor/AvatarEditor';
import AvatarViewer from '@/components/AvatarViewer/AvatarViewer';
import { AvatarConfigType, defaultMaleConfig } from '@/components/AvatarEditor/avatarConfig';

interface AdminAvatarSectionProps {
  onAvatarUpdated?: (config: AvatarConfigType) => void;
}

export default function AdminAvatarSection({ onAvatarUpdated }: AdminAvatarSectionProps) {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfigType>(defaultMaleConfig);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const account = await authApi.getAdminAccount(token);
        if (account.profile_url) {
          try {
            const parsed = JSON.parse(account.profile_url);
            setAvatarConfig(parsed);
          } catch (error) {
            console.error('Failed to parse avatar config', error);
          }
        }
      } catch (error) {
        console.error('Failed to load avatar config', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAvatar();
  }, []);

  const handleAvatarSave = async (config: AvatarConfigType) => {
    setAvatarSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');

      await authApi.updateAdminAccountProfile(token, {
        profile_url: JSON.stringify(config),
      });

      setAvatarConfig(config);
      onAvatarUpdated?.(config);
    } catch (error: any) {
      console.error('Failed to update avatar', error);
      throw error;
    } finally {
      setAvatarSaving(false);
    }
  };

  if (loading) {
    return <div className="account-loading">Loading avatar...</div>;
  }

  return (
    <section className="dashboard-content admin-avatar-section">
      <div className="admin-avatar-header">
        <div>
          <p className="eyebrow">Profile styling</p>
          <h2>Avatar</h2>
        </div>
      </div>

      <div className="admin-avatar-layout single-preview-layout">
        <div className="admin-avatar-preview-card">
          <div className="admin-avatar-preview-stage">
            <AvatarViewer config={avatarConfig} size={320} />
          </div>
          <div className="admin-avatar-preview-meta">
            <span className="admin-avatar-label">Current preview</span>
            <h3>Your profile avatar</h3>
          </div>
        </div>

        <div className="admin-avatar-editor-card">
          <AvatarEditor
            initialConfig={avatarConfig}
            onSave={handleAvatarSave}
            saving={avatarSaving}
            previewSize={120}
          />
        </div>
      </div>
    </section>
  );
}
