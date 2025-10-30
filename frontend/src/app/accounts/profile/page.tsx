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
  Alert, Container,
} from '@mui/material';

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
      const response = await fetch('http://localhost:3001/user/me/profile', {
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
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    const token = localStorage.getItem('accessToken');

    const payload: Partial<typeof editData> = {};
    if (editData.username !== profile?.username) {
      payload.username = editData.username;
    }
    if (editData.bio !== (profile?.bio ?? '')) {
      payload.bio = editData.bio || undefined;
    }
    if (editData.profilePictureUrl !== (profile?.profilePictureUrl ?? '')) {
      payload.profilePictureUrl = editData.profilePictureUrl || undefined;
    }


    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/user/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to save changes.');
      } else {
        setSuccessMessage('Profile updated successfully!');
        setIsEditing(false);
        await fetchProfile();
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error && !profile) {
    return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  }

  if (!profile) {
    return <Typography sx={{ m: 4 }}>Could not load profile.</Typography>;
  }

  return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
          <Stack spacing={3} alignItems="center">
            <Typography variant="h4" component="h1" gutterBottom>
              Your Profile
            </Typography>

            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ width: '100%' }}>{successMessage}</Alert>}

            <Avatar
                src={isEditing ? editData.profilePictureUrl : profile.profilePictureUrl ?? undefined}
                alt={profile.username}
                sx={{ width: 100, height: 100, mb: 2 }}
            />

            {isEditing ? (
              <>
                <Button component="label" variant="outlined" size="small">
                  Upload New Picture
                  <input
                    type="file"
                    hidden
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        // Optionally, show a preview
                        setEditData(prev => ({ ...prev, profilePictureUrl: URL.createObjectURL(e.target.files![0]) }));
                      }
                    }}
                  />
                </Button>
                  {selectedFile && <Typography variant="caption">{selectedFile.name}</Typography>}
                  <Button size="small" onClick={() => { setSelectedFile(null); setEditData(prev => ({...prev, profilePictureUrl: ''}))}}>
                    Remove Picture
                  </Button>
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
                  <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
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
                <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
                  {profile.bio || <i>No bio yet.</i>}
                </Typography>
                <Button variant="outlined" onClick={() => setIsEditing(true)} sx={{ mt: 3 }}>
                  Edit Profile
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
  );
}