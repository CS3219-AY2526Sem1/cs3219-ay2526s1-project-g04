'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Avatar,
  Paper,
  Stack,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Fade,
  Container,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { ZodError } from 'zod';
import { fetchWithAuth } from '@/lib/utils/apiClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';

interface UserProfile {
  username: string;
  email: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({
    username: '',
    bio: '',
    profilePictureUrl: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Email change state
  const [emailChangeData, setEmailChangeData] = useState({
    newEmail: '',
    password: '',
    otp: '',
    otpSent: false,
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState('');

  // Password change state
  const [passwordChangeData, setPasswordChangeData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: '',
    otpSent: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const response = await fetchWithAuth(
        'http://localhost:3001/user/me/profile',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Session expired or invalid. Please log in again.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/accounts/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data: UserProfile = await response.json();
      setProfile(data);
      setEditData({
        username: data.username,
        bio: data.bio ?? '',
        profilePictureUrl: data.profilePictureUrl ?? '',
      });
    } catch (err) {
      console.log(err);
      setError('Could not load profile data.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      // Create a temporary local URL to show a preview
      setEditData((prev) => ({
        ...prev,
        profilePictureUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setError('Authentication error. Please log in again.');
      setIsSaving(false);
      return;
    }

    let textUpdated = false;
    let imageUpdated = false;

    const textPayload: { username?: string; bio?: string | null } = {};
    if (editData.username !== profile?.username) {
      textPayload.username = editData.username;
    }
    if (editData.bio !== (profile?.bio ?? '')) {
      textPayload.bio = editData.bio || null;
    }

    if (Object.keys(textPayload).length > 0) {
      try {
        const res = await fetchWithAuth(
          'http://localhost:3001/user/me/profile',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(textPayload),
          },
        );
        if (!res.ok) throw new Error(await res.json().then((d) => d.message));
        textUpdated = true;
      } catch (err) {
        console.log(err);
        setError(`Text update failed: ${err}`);
        setIsSaving(false);
        return; // Stop if text update fails
      }
    }

    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append('profilePicture', selectedFile);

        // Use regular fetch for FormData to avoid Content-Type conflicts
        const res = await fetch(
          'http://localhost:3001/user/me/profile-picture',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              // Don't set Content-Type - let browser set it with boundary
            },
            body: formData,
          },
        );
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: 'Upload failed' }));
          throw new Error(errorData.message);
        }
        imageUpdated = true;
      } catch (err) {
        console.error('Image upload error:', err);
        setError(
          `Image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    setIsEditing(false);
    setSelectedFile(null);
    if (textUpdated || imageUpdated) {
      setSuccessMessage('Profile updated successfully!');
      await fetchProfile(); // Refresh all profile data
    }
  };

  // Email change handlers
  const handleEmailInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setEmailChangeData((prev) => ({ ...prev, [name]: value }));
    setEmailChangeError('');
  };

  const handleRequestEmailOtp = async () => {
    if (!emailChangeData.newEmail || !emailChangeData.password) {
      setEmailChangeError('Please fill in all fields');
      return;
    }

    setIsChangingEmail(true);
    setEmailChangeError('');
    setEmailChangeSuccess('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const res = await fetchWithAuth(
        'http://localhost:3001/user/me/email/request-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newEmail: emailChangeData.newEmail,
            password: emailChangeData.password,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      setEmailChangeData((prev) => ({ ...prev, otpSent: true }));
      setEmailChangeSuccess(
        'OTP sent to your new email address. Please check your inbox.',
      );
    } catch (err) {
      console.error('Email OTP request error:', err);
      setEmailChangeError(
        err instanceof Error ? err.message : 'Failed to send OTP',
      );
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailChangeData.otp) {
      setEmailChangeError('Please enter the OTP');
      return;
    }

    setIsChangingEmail(true);
    setEmailChangeError('');
    setEmailChangeSuccess('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const res = await fetchWithAuth(
        'http://localhost:3001/user/me/email/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newEmail: emailChangeData.newEmail,
            password: emailChangeData.password,
            otp: emailChangeData.otp,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to verify OTP');
      }

      setEmailChangeSuccess(
        'Email updated successfully! Please use it for your next login.',
      );
      setEmailChangeData({
        newEmail: '',
        password: '',
        otp: '',
        otpSent: false,
      });
      await fetchProfile(); // Refresh profile data
    } catch (err) {
      console.error('Email OTP verification error:', err);
      setEmailChangeError(
        err instanceof Error ? err.message : 'Failed to verify OTP',
      );
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Password change handlers
  const handlePasswordInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setPasswordChangeData((prev) => ({ ...prev, [name]: value }));
    setPasswordChangeError('');
  };

  const handleRequestPasswordOtp = async () => {
    if (!passwordChangeData.oldPassword) {
      setPasswordChangeError('Please enter your current password');
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const res = await fetchWithAuth(
        'http://localhost:3001/user/me/password/request-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            oldPassword: passwordChangeData.oldPassword,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      setPasswordChangeData((prev) => ({ ...prev, otpSent: true }));
      setPasswordChangeSuccess(
        'OTP sent to your email address. Please check your inbox.',
      );
    } catch (err) {
      console.error('Password OTP request error:', err);
      setPasswordChangeError(
        err instanceof Error ? err.message : 'Failed to send OTP',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleVerifyPasswordOtp = async () => {
    if (
      !passwordChangeData.newPassword ||
      !passwordChangeData.confirmPassword ||
      !passwordChangeData.otp
    ) {
      setPasswordChangeError('Please fill in all fields');
      return;
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(passwordChangeData.newPassword)) {
      setPasswordChangeError(
        'New password must contain at least one uppercase letter',
      );
      return;
    }

    if (!/[a-z]/.test(passwordChangeData.newPassword)) {
      setPasswordChangeError(
        'New password must contain at least one lowercase letter',
      );
      return;
    }

    if (!/[0-9]/.test(passwordChangeData.newPassword)) {
      setPasswordChangeError('New password must contain at least one number');
      return;
    }

    if (!/[@$!%*?&]/.test(passwordChangeData.newPassword)) {
      setPasswordChangeError(
        'New password must contain at least one special character (@$!%*?&)',
      );
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const res = await fetchWithAuth(
        'http://localhost:3001/user/me/password/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            oldPassword: passwordChangeData.oldPassword,
            newPassword: passwordChangeData.newPassword,
            otp: passwordChangeData.otp,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to verify OTP');
      }

      setPasswordChangeSuccess('Password updated successfully!');
      setPasswordChangeData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        otp: '',
        otpSent: false,
      });
    } catch (err) {
      console.error('Password OTP verification error:', err);
      setPasswordChangeError(
        err instanceof Error ? err.message : 'Failed to verify OTP',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {error}
      </Alert>
    );
  }

  if (!profile) {
    return <Typography sx={{ m: 4 }}>Could not load profile.</Typography>;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/home/dashboard')}
              sx={{
                mb: 2,
                alignSelf: 'flex-start',
                // Removed 'color: white'
              }}
            >
              Back to Dashboard
            </Button>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                {successMessage}
              </Alert>
            )}

            {/* Main Profile Card */}
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              {/* Profile Header with Avatar */}
              <Box
                sx={{
                  background:
                    'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                  p: 4,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={
                      isEditing
                        ? editData.profilePictureUrl
                        : (profile.profilePictureUrl ?? undefined)
                    }
                    alt={profile.username}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid white',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      mb: 2,
                    }}
                  />
                  {isEditing && (
                    <IconButton
                      component="label"
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: -8,
                        backgroundColor: 'white',
                        color: '#8B5CF6',
                        '&:hover': { backgroundColor: '#f3f4f6' },
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      <PhotoCameraIcon />
                      <input
                        type="file"
                        hidden
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                      />
                    </IconButton>
                  )}
                </Box>

                {selectedFile && isEditing && (
                  <Chip
                    label={`New: ${selectedFile.name}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      mt: 1,
                    }}
                  />
                )}

                {!isEditing && (
                  <>
                    <Typography
                      variant="h4"
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        mb: 1,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {profile.username}
                    </Typography>
                    <Chip
                      icon={<CalendarIcon sx={{ color: 'white !important' }} />}
                      label={`Member since ${new Date(profile.createdAt).toLocaleDateString()}`}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 500,
                      }}
                    />
                  </>
                )}
              </Box>

              <CardContent sx={{ p: 4 }}>
                {isEditing ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: '#374151', fontWeight: 600 }}
                      >
                        Edit Profile Information
                      </Typography>
                      <Divider sx={{ mb: 3 }} />
                    </Box>

                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={editData.username}
                      onChange={handleInputChange}
                      required
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <PersonIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                        ),
                      }}
                      inputProps={{ maxLength: 30 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#8B5CF6',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#8B5CF6',
                          },
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Bio"
                      name="bio"
                      value={editData.bio}
                      onChange={handleInputChange}
                      multiline
                      rows={4}
                      variant="outlined"
                      placeholder="Tell us about yourself (max 150 chars)"
                      inputProps={{ maxLength: 150 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#8B5CF6',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#8B5CF6',
                          },
                        },
                      }}
                    />

                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: 'flex-end', pt: 2 }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          borderColor: '#6B7280',
                          color: '#6B7280',
                          '&:hover': {
                            borderColor: '#374151',
                            backgroundColor: 'rgba(107, 114, 128, 0.04)',
                          },
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={
                          isSaving ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <SaveIcon />
                          )
                        }
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          background:
                            'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
                          '&:hover': {
                            background:
                              'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                          },
                        }}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    {/* Profile Information Section */}
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ color: '#374151', fontWeight: 600 }}
                        >
                          Profile Information
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={() => setIsEditing(true)}
                          sx={{
                            borderRadius: 2,
                            background:
                              'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
                            '&:hover': {
                              background:
                                'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                            },
                          }}
                        >
                          Edit Profile
                        </Button>
                      </Stack>
                      <Divider sx={{ mb: 3 }} />
                    </Box>

                    {/* User Details Cards */}
                    <Stack spacing={2}>
                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <PersonIcon sx={{ color: '#8B5CF6' }} />
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ color: '#6B7280', fontWeight: 500 }}
                            >
                              Username
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ color: '#374151', fontWeight: 600 }}
                            >
                              {profile.username}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <EmailIcon sx={{ color: '#8B5CF6' }} />
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ color: '#6B7280', fontWeight: 500 }}
                            >
                              Email Address
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ color: '#374151', fontWeight: 600 }}
                            >
                              {profile.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}
                        >
                          About Me
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            color: '#374151',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            fontStyle: profile.bio ? 'normal' : 'italic',
                          }}
                        >
                          {profile.bio ||
                            'No bio added yet. Click "Edit Profile" to add one!'}
                        </Typography>
                      </Paper>
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Email Change Section */}
            <Card
              sx={{
                mt: 3,
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#374151',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <EmailIcon sx={{ color: '#8B5CF6' }} />
                    Change Email Address
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
                    Update your email address. You'll need to enter your current
                    password for security.
                  </Typography>
                  <Divider sx={{ mt: 2 }} />
                </Box>

                {emailChangeError && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {emailChangeError}
                  </Alert>
                )}

                {emailChangeSuccess && (
                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                    {emailChangeSuccess}
                  </Alert>
                )}

                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Current Email"
                    value={profile?.email || ''}
                    disabled
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <EmailIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#F9FAFB',
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="New Email Address"
                    name="newEmail"
                    type="email"
                    value={emailChangeData.newEmail}
                    onChange={handleEmailInputChange}
                    disabled={emailChangeData.otpSent}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <EmailIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#8B5CF6',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#8B5CF6',
                        },
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Current Password"
                    name="password"
                    type="password"
                    value={emailChangeData.password}
                    onChange={handleEmailInputChange}
                    disabled={emailChangeData.otpSent}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <LockIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#8B5CF6',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#8B5CF6',
                        },
                      },
                    }}
                  />

                  {emailChangeData.otpSent && (
                    <TextField
                      fullWidth
                      label="Enter OTP"
                      name="otp"
                      value={emailChangeData.otp}
                      onChange={handleEmailInputChange}
                      variant="outlined"
                      helperText="Please enter the 6-digit code sent to your new email address"
                      InputProps={{
                        startAdornment: (
                          <SecurityIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#8B5CF6',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#8B5CF6',
                          },
                        },
                      }}
                    />
                  )}

                  <Box
                    sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}
                  >
                    {emailChangeData.otpSent && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setEmailChangeData((prev) => ({
                            ...prev,
                            otpSent: false,
                            otp: '',
                          }))
                        }
                        disabled={isChangingEmail}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1.5,
                          borderColor: '#8B5CF6',
                          color: '#8B5CF6',
                          '&:hover': {
                            borderColor: '#7C3AED',
                            backgroundColor: 'rgba(139, 92, 246, 0.04)',
                          },
                        }}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      startIcon={
                        isChangingEmail ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : emailChangeData.otpSent ? (
                          <SecurityIcon />
                        ) : (
                          <EmailIcon />
                        )
                      }
                      onClick={
                        emailChangeData.otpSent
                          ? handleVerifyEmailOtp
                          : handleRequestEmailOtp
                      }
                      disabled={
                        isChangingEmail ||
                        (!emailChangeData.otpSent &&
                          (!emailChangeData.newEmail ||
                            !emailChangeData.password)) ||
                        (emailChangeData.otpSent && !emailChangeData.otp)
                      }
                      sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        backgroundColor: '#8B5CF6',
                        '&:hover': {
                          backgroundColor: '#7C3AED',
                        },
                      }}
                    >
                      {isChangingEmail
                        ? emailChangeData.otpSent
                          ? 'Verifying...'
                          : 'Sending OTP...'
                        : emailChangeData.otpSent
                          ? 'Verify & Update Email'
                          : 'Send OTP'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Password Change Section */}
            <Card
              sx={{
                mt: 3,
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#374151',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <SecurityIcon sx={{ color: '#8B5CF6' }} />
                    Change Password
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
                    Update your password. Make sure it's strong and secure.
                  </Typography>
                  <Divider sx={{ mt: 2 }} />
                </Box>

                {passwordChangeError && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {passwordChangeError}
                  </Alert>
                )}

                {passwordChangeSuccess && (
                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                    {passwordChangeSuccess}
                  </Alert>
                )}

                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="oldPassword"
                    type={showPasswords.old ? 'text' : 'password'}
                    value={passwordChangeData.oldPassword}
                    onChange={handlePasswordInputChange}
                    variant="outlined"
                    disabled={passwordChangeData.otpSent}
                    InputProps={{
                      startAdornment: (
                        <LockIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                      ),
                      endAdornment: (
                        <IconButton
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              old: !prev.old,
                            }))
                          }
                          edge="end"
                        >
                          {showPasswords.old ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#8B5CF6',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#8B5CF6',
                        },
                      },
                    }}
                  />

                  {passwordChangeData.otpSent && (
                    <>
                      <TextField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordChangeData.newPassword}
                        onChange={handlePasswordInputChange}
                        variant="outlined"
                        helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                        InputProps={{
                          startAdornment: (
                            <LockIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                          ),
                          endAdornment: (
                            <IconButton
                              onClick={() =>
                                setShowPasswords((prev) => ({
                                  ...prev,
                                  new: !prev.new,
                                }))
                              }
                              edge="end"
                            >
                              {showPasswords.new ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#8B5CF6',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#8B5CF6',
                            },
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        name="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordChangeData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <LockIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                          ),
                          endAdornment: (
                            <IconButton
                              onClick={() =>
                                setShowPasswords((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm,
                                }))
                              }
                              edge="end"
                            >
                              {showPasswords.confirm ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#8B5CF6',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#8B5CF6',
                            },
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Enter OTP"
                        name="otp"
                        value={passwordChangeData.otp}
                        onChange={handlePasswordInputChange}
                        variant="outlined"
                        helperText="Please enter the 6-digit code sent to your email address"
                        InputProps={{
                          startAdornment: (
                            <SecurityIcon sx={{ color: '#8B5CF6', mr: 1 }} />
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#8B5CF6',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#8B5CF6',
                            },
                          },
                        }}
                      />
                    </>
                  )}

                  <Box
                    sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}
                  >
                    {passwordChangeData.otpSent && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setPasswordChangeData((prev) => ({
                            ...prev,
                            otpSent: false,
                            otp: '',
                            newPassword: '',
                            confirmPassword: '',
                          }))
                        }
                        disabled={isChangingPassword}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1.5,
                          borderColor: '#8B5CF6',
                          color: '#8B5CF6',
                          '&:hover': {
                            borderColor: '#7C3AED',
                            backgroundColor: 'rgba(139, 92, 246, 0.04)',
                          },
                        }}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      startIcon={
                        isChangingPassword ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : passwordChangeData.otpSent ? (
                          <SecurityIcon />
                        ) : (
                          <LockIcon />
                        )
                      }
                      onClick={
                        passwordChangeData.otpSent
                          ? handleVerifyPasswordOtp
                          : handleRequestPasswordOtp
                      }
                      disabled={
                        isChangingPassword ||
                        (!passwordChangeData.otpSent &&
                          !passwordChangeData.oldPassword) ||
                        (passwordChangeData.otpSent &&
                          (!passwordChangeData.newPassword ||
                            !passwordChangeData.confirmPassword ||
                            !passwordChangeData.otp))
                      }
                      sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        backgroundColor: '#8B5CF6',
                        '&:hover': {
                          backgroundColor: '#7C3AED',
                        },
                      }}
                    >
                      {isChangingPassword
                        ? passwordChangeData.otpSent
                          ? 'Verifying...'
                          : 'Sending OTP...'
                        : passwordChangeData.otpSent
                          ? 'Verify & Update Password'
                          : 'Send OTP'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
