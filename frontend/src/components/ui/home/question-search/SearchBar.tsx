'use client';

import * as React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import {
  getAdminQuestionsRequestParams,
  getQuestionsRequestParams,
  Question,
} from '@/lib/question-service';
import { getAdminQuestions, getQuestions } from '@/services/questionServiceApi';

interface SearchBarProps {
  userRole: string | null;
  setQuestionsList: React.Dispatch<React.SetStateAction<Question[]>>;
}

export default function SearchBar({
  userRole,
  setQuestionsList,
}: SearchBarProps) {
  const [searchInput, setSearchInput] = React.useState<string>('');
  const [searching, setSearching] = React.useState<boolean>(false);

  const handleSearch = async () => {
    if (searching) return;

    const query = searchInput.trim();
    if (!query) {
      setQuestionsList([]);
      return;
    }

    setSearching(true);
    try {
      if (userRole === 'USER') {
        const payload: getQuestionsRequestParams = {
          q: query,
          highlight: true,
        };

        const res = await getQuestions(payload);

        if (!res.success) {
          alert(`Error searching for question: ${res.message}`);
          setQuestionsList([]);
          return;
        }

        const { items } = res.data;
        setQuestionsList(items);
      } else if (userRole === 'ADMIN') {
        const payload: getAdminQuestionsRequestParams = {
          q: query,
          highlight: true,
        };

        const res = await getAdminQuestions(payload);

        if (!res.success) {
          alert(`Error searching for question: ${res.message}`);
          setQuestionsList([]);
          return;
        }

        const { items } = res.data;
        // console.log(`${JSON.stringify(items)}`);
        setQuestionsList(items);
      }
    } catch (error) {
      console.error(`Error searching for questions: ${error}`);
      return;
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-row gap-x-5 w-full">
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearch();
          }
        }}
        placeholder="Enter search"
        disabled={searching}
        className="flex-1 w-full h-12 bg-gray-200 rounded-full px-5 hover:bg-gray-400"
      />

      <Tooltip title="Search">
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="group"
        >
          <MagnifyingGlassIcon
            className="w-6 h-6 text-gray-500 group-hover:text-blue-500"
            strokeWidth={2}
          />
        </button>
      </Tooltip>
    </div>
  );
}
