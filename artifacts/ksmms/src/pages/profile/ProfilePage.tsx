import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { ROLE_LABELS } from '../../lib/utils';

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

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal details and password</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-teal-700" />
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
    </div>
  );
}
