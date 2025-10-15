'use client';

import * as React from 'react';
import { Attachment } from "@/lib/question-service";
import FileUploadButton from "./FileUploadButton";
import AttachmentsCard from './AttachmentsCard';

interface props {
  id?: string;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export default function AttachmentsSection({ id, attachments, setAttachments }: props) {
  return (
    <div className='flex flex-col'>
      <label className="text-xl font-semibold text-[var(--foreground)] mb-1">
        Image Attachments
      </label>
      <p className='text-sm text-gray-500 mb-3'>
        Upload any attachments here, and copy the generated Markdown formatted text and paste it anywhere needed in the question body.
      </p>

      {/* container to display button to add attachments and attachments added */}
      <div className='h-64 border border-gray-400 rounded-md p-1 flex flex-col'>
        <div className='flex-1 overflow-y-auto space-y-1 p-2'>
          {attachments.map((a) => (
            <AttachmentsCard 
              key={a.object_key}
              attachment={a} 
              setAttachments={setAttachments}
            />
          ))}
        </div>
        <div className='mt-auto'>
          <FileUploadButton id={id} setAttachments={setAttachments}/>
        </div>
      </div>
    </div>
  )
}
