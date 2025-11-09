'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  CheckIcon,
  ClipboardIcon,
  MinusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { Attachment } from '@/lib/question-service';
import { postAdminAttachmentsSignView } from '@/services/questionServiceApi';
import { postAttachmentSignViewRequest } from '@/lib/question-service';

interface props {
  attachment: Attachment;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export default function AttachmentsCard({ attachment, setAttachments }: props) {
  const [copied, setCopied] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const markdownText = `![](pp://${attachment.object_key})`;

  // copy to clipboard
  const handleClick = () => {
    navigator.clipboard
      .writeText(markdownText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => console.error('Failed to copy:', err));
  };

  // view attachment
  const handleView = async () => {
    if (loadingView) return;

    setLoadingView(true);
    const payload: postAttachmentSignViewRequest = {
      object_key: attachment.object_key,
      as_attachment: false,
      filename: attachment.filename,
      content_type_hint: attachment.mime,
    };

    try {
      const res = await postAdminAttachmentsSignView(payload);

      if (!res.success) {
        alert(`Failed to view attachment: ${res.message}`);
        return;
      }
      const { view_url } = res.data;
      window.open(view_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing attachment:', error);
      alert('Unexpected error occurred while viewing attachment.');
    } finally {
      setLoadingView(false);
    }
  };

  // delete attachment
  const handleDelete = () => {
    setAttachments((prev) =>
      prev.filter((a) => a.object_key !== attachment.object_key),
    );
  };

  return (
    <div className="flex items-center h-10 w-full py-2 rounded-md border border-gray-300">
      <div className="flex flex-row flex-1 border-r border-gray-300 px-3 gap-x-2">
        <p className="font-semibold">Name:</p>
        <p className="truncate">{attachment.filename}</p>
      </div>

      <div className="flex-2 flex items-center px-3 gap-2">
        <p className="flex-1 font-mono truncate">{markdownText}</p>

        <div className="flex gap-x-1">
          <Tooltip title="Copy to clipboard">
            <button
              type="button"
              onClick={handleClick}
              className="hover:bg-blue-100 rounded p-1"
            >
              {copied ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ClipboardIcon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </Tooltip>

          <Tooltip title="View attachment">
            <button
              type="button"
              onClick={handleView}
              disabled={loadingView}
              className={`rounded p-1 ${
                loadingView
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-100'
              }`}
            >
              <EyeIcon className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>

          <Tooltip title="Delete attachment">
            <button
              type="button"
              onClick={handleDelete}
              className="hover:bg-red-100 rounded p-1"
            >
              <MinusIcon className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
