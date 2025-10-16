'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  CheckIcon,
  ClipboardIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { Attachment } from '@/lib/question-service';

interface props {
  attachment: Attachment;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export default function AttachmentsCard({ attachment, setAttachments }: props) {
  const [copied, setCopied] = useState(false);
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

  // delete attachment
  const handleDelete = () => {
    setAttachments((prev) =>
      prev.filter((a) => a.object_key !== attachment.object_key),
    );
  };

  return (
    <div className="flex items-center h-10 w-full py-2 rounded-md border border-gray-300">
      <div className="flex-1 border-r border-gray-300 px-3">
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
