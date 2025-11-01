'use client';

import { useRef, useState } from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { uploadAttachments } from '@/services/questionServiceApi';
import {
  Attachment,
  AttachmentUploadPayload,
  isValidS3SignResponse,
} from '@/lib/question-service';

interface props {
  id?: string;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export default function FileUploadButton({ id, setAttachments }: props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');

  const handleClick = () => {
    if (uploading) {
      alert(
        'Please wait for the current upload to finish before uploading the next file.',
      );
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelection = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files (png, jpg, jpeg, gif, webp) are allowed.');
      return;
    }

    setUploading(true);
    setUploadingFileName(file.name);
    try {
      // get signed URL from the question service
      const payload: AttachmentUploadPayload = {
        content_type: file.type,
        filename: file.name,
      };
      if (id) {
        payload.suggested_prefix = `/questions/${id}`;
      }
      const signRes = await uploadAttachments(payload);

      if (!signRes || !isValidS3SignResponse(signRes)) {
        throw new Error('Invalid sign-upload response.');
      }

      // upload to s3
      const s3Res = await fetch(signRes.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error(
          `Failed to upload file to S3: ${s3Res.status} ${s3Res.statusText}`,
        );
      }

      // Add uploaded file as new attachment
      const newAttachment: Attachment = {
        object_key: signRes?.object_key,
        mime: file.type,
        filename: file.name,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
      setUploadingFileName('');
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between w-full px-3 py-1 border border-gray-300 rounded-md shadow-md">
      <div className="text-sm text-gray-600 truncate">
        {uploading ? `Uploading ${uploadingFileName}...` : 'No file uploading'}
      </div>

      <Tooltip title="Upload new attachment">
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className={`border border-gray-300 rounded-md p-1 ${uploading ? 'bg-gray-300' : 'hover:bg-blue-100'}`}
        >
          <DocumentPlusIcon className="w-6 h-6 text-gray-700" />
        </button>
      </Tooltip>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelection}
      />
    </div>
  );
}
