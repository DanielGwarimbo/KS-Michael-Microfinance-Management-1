import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { User, Lock, CheckCircle, AlertCircle, Camera, Trash2, Activity } from 'lucide-react';
import { ROLE_LABELS } from '../../lib/utils';

interface ActivityEntry {
  id: string;
  action: string;
  module: string;
  entity_id: string | null;
  entity_type: string | null;
  details: string | null;
  created_at: string;
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatModule(module: string): string {
  return module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const path = avatarUrl.replace(/^\/objects\//, '');
  return `/api/storage/avatars/${path}`;
}

function InlineMessage({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {isSuccess ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, roleName, refreshProfile } = useAuth();
  const { addNotification } = useNotification();

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setActivityLoading(true);
    api.get('/audit?scope=self')
      .then(({ data }) => setActivity(Array.isArray(data) ? data : []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' });
    }
  }, [profile?.id]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarSrc = previewSrc ?? getAvatarSrc(profile?.avatar_url);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      setProfileMsg({ type: 'error', text: 'Full name is required' });
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { error } = await api.put('/users/me', {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      });
      if (error) throw new Error(error);
      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
      addNotification('success', 'Profile updated successfully');
    } catch (err: any) {
      const msg = err.message || 'Failed to update profile';
      setProfileMsg({ type: 'error', text: msg });
      addNotification('error', msg);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const { error } = await api.put('/users/me/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      if (error) throw new Error(error);
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      addNotification('success', 'Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      const msg = err.message || 'Failed to change password';
      setPwMsg({ type: 'error', text: msg });
      addNotification('error', msg);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);

    setAvatarUploading(true);
    setAvatarMsg(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/storage/avatars/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await refreshProfile();
      setAvatarMsg({ type: 'success', text: 'Profile photo updated' });
      addNotification('success', 'Profile photo updated');
    } catch (err: any) {
      const msg = err.message || 'Failed to upload photo';
      setAvatarMsg({ type: 'error', text: msg });
      addNotification('error', msg);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreviewSrc(null);
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    setAvatarMsg(null);
    try {
      const res = await fetch('/api/storage/avatars/me', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove photo');
      await refreshProfile();
      setAvatarMsg({ type: 'success', text: 'Profile photo removed' });
      addNotification('success', 'Profile photo removed');
    } catch (err: any) {
      const msg = err.message || 'Failed to remove photo';
      setAvatarMsg({ type: 'error', text: msg });
      addNotification('error', msg);
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal details and password</p>
      </div>

      {/* Avatar Card */}
      <Card>
        <div className="flex items-center gap-4">
          {/* Avatar preview */}
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-md">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile photo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold font-display">
                  {profile ? getInitials(profile.full_name) : '??'}
                </span>
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 mb-1">Profile Photo</p>
            <p className="text-xs text-gray-400 mb-3">JPEG, PNG, WebP or GIF · Max 5 MB</p>
            <div className="flex items-center gap-2">
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${avatarUploading ? 'bg-gray-100 text-gray-400 pointer-events-none' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
              >
                <Camera className="h-3.5 w-3.5" />
                {avatarSrc ? 'Change Photo' : 'Upload Photo'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </label>
              {(avatarSrc || profile?.avatar_url) && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            {avatarMsg && (
              <div className="mt-3">
                <InlineMessage type={avatarMsg.type} message={avatarMsg.text} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
            <p className="text-xs text-gray-500">
              {profile?.email} &middot; {roleName ? (ROLE_LABELS[roleName] || roleName) : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            value={profileForm.full_name}
            onChange={(e) => { setProfileForm({ ...profileForm, full_name: e.target.value }); setProfileMsg(null); }}
          />
          <Input
            label="Phone"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="+263..."
          />
          {profileMsg && <InlineMessage type={profileMsg.type} message={profileMsg.text} />}
          <div className="pt-2 flex justify-end">
            <Button type="submit" loading={profileSaving}>Save Changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Lock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-500">Choose a strong password with at least 6 characters</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4" noValidate>
          <Input
            label="Current Password"
            type="password"
            value={pwForm.current_password}
            onChange={(e) => { setPwForm({ ...pwForm, current_password: e.target.value }); setPwMsg(null); }}
          />
          <Input
            label="New Password"
            type="password"
            value={pwForm.new_password}
            onChange={(e) => { setPwForm({ ...pwForm, new_password: e.target.value }); setPwMsg(null); }}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm_password}
            onChange={(e) => { setPwForm({ ...pwForm, confirm_password: e.target.value }); setPwMsg(null); }}
          />
          {pwMsg && <InlineMessage type={pwMsg.type} message={pwMsg.text} />}
          <div className="pt-2 flex justify-end">
            <Button type="submit" loading={pwSaving}>Change Password</Button>
          </div>
        </form>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-500">Your last 10 actions in the system</p>
          </div>
        </div>

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activity recorded yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{formatAction(entry.action)}</p>
                  <p className="text-xs text-gray-500">
                    {formatModule(entry.module)}
                    {entry.entity_id ? ` · #${entry.entity_id}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
