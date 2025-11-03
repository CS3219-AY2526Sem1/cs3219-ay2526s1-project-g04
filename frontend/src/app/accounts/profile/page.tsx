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
} from '@mui/icons-material';
import { fetchWithAuth } from '@/lib/utils/apiClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
