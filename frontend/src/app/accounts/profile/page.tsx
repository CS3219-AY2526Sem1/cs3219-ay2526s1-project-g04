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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchWithAuth } from '@/lib/utils/apiClient';

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

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/accounts/login');
      return;
    }

    try {
      const response = await fetchWithAuth('http://localhost:3001/user/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        const res = await fetchWithAuth('http://localhost:3001/user/me/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(textPayload),
        });
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
        formData.append('profilePicture', selectedFile); // This is the logic from your test

        const res = await fetchWithAuth(
          'http://localhost:3001/user/me/profile-picture',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );
        if (!res.ok) throw new Error(await res.json().then((d) => d.message));
        imageUpdated = true;
      } catch (err) {
        console.log(err);
        setError(`Image upload failed: ${err}`);
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
    <Box sx={{ pt: 12, pb: 4, px: 20 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/home/dashboard')} // Navigate to dashboard
        sx={{ mb: 2, alignSelf: 'flex-start' }} // Add margin below
      >
        Back to Dashboard
      </Button>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Your Profile
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%' }}>
              {successMessage}
            </Alert>
          )}

          <Avatar
            src={
              isEditing
                ? editData.profilePictureUrl
                : (profile.profilePictureUrl ?? undefined)
            }
            alt={profile.username}
            sx={{ width: 100, height: 100, mb: 2 }}
          />

          {isEditing ? (
            <>
              <Button component="label" variant="outlined" size="small">
                Upload New Picture (JPG/PNG)
                <input
                  type="file"
                  hidden
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                />
              </Button>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary">
                  New file: {selectedFile.name}
                </Typography>
              )}
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={editData.username}
                onChange={handleInputChange}
                required
                variant="outlined"
                size="small"
                inputProps={{ maxLength: 30 }}
              />
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                multiline
                rows={3}
                variant="outlined"
                size="small"
                placeholder="Tell us about yourself (max 150 chars)"
                inputProps={{ maxLength: 150 }}
              />
              <Stack
                direction="row"
                spacing={2}
                sx={{ width: '100%', justifyContent: 'flex-end' }}
              >
                <Button onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="h6">{profile.username}</Typography>
              <Typography variant="body2" color="text.secondary">
                Member since: {new Date(profile.createdAt).toLocaleDateString()}
              </Typography>
              <Typography
                variant="body1"
                sx={{ mt: 2, textAlign: 'center', whiteSpace: 'pre-wrap' }}
              >
                {profile.bio || <i>No bio yet.</i>}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setIsEditing(true)}
                sx={{ mt: 3 }}
              >
                Edit Profile
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
