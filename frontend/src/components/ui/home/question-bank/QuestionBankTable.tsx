'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Link } from '@mui/material';
import { Question, Topic } from '@/lib/question-service';
import { DIFFICULTY_LEVELS } from '@/lib/constants/difficultyLevels';
import { getAdminQuestions, getQuestions, deleteQuestion, publishQuestion } from '@/services/questionServiceApi';

interface QuestionBankTableProps {
  topicFilter: string;
  userRole: 'admin' | 'non-admin'; // logic to be implemented later on
}

export default function QuestionBankTable({
  topicFilter,
  userRole
}: QuestionBankTableProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]); // store questions
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 15,
    page: 0
  })

  const handleRowDoubleClick = (params: GridRowParams) => {
    const questionId = params.row.id;
    router.push(`/home/question-view/${questionId}?userRole=${userRole}`);
  }

  const handleDeleteClick = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this question?');
    if (!confirmed) return;

    try {
      const success = await deleteQuestion(id);
      if (success) {
        alert('Question deleted successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting question.');
    }
  }

  const handlePublishClick = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to publish this question?');
    if (!confirmed) return;

    try {
      const success = await publishQuestion(id);
      if (success) {
        alert('Question published successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while publishing question.');
    }
  }

  useEffect(() => {
    setLoading(true);
    if (userRole === 'non-admin') {
      getQuestions(paginationModel.page, paginationModel.pageSize, topicFilter)
        .then((data) => {
          const items = data.items;

          setQuestions(items);
          setRowCount(data.total || items.length);
        })
        .finally(() => setLoading(false));
    };

    if (userRole === 'admin') {
      getAdminQuestions(paginationModel.page, paginationModel.pageSize, topicFilter)
        .then((data) => {
          const items = data.items;

          setQuestions(items);
          setRowCount(data.total || items.length);
        })
        .finally(() => setLoading(false));
    }
  }, [paginationModel.page, paginationModel.pageSize, topicFilter, userRole]);

  // define table columns
  const columns: GridColDef[] =
    userRole === 'admin'
      ? [
        { field: 'title', headerName: 'Title', flex: 2 },
        { field: 'version', headerName: 'Version', flex: 0.5 },
        {
          field: 'difficulty',
          headerName: 'Difficulty',
          flex: 1,
          renderCell: (params) => {
            const val = params.value?.toString().toLowerCase();
            const level = DIFFICULTY_LEVELS.find(
              (lvl) => lvl.name.toLowerCase() === val
            );

            const displayName = val.charAt(0).toUpperCase() + val.slice(1); // convert first letter to capital
            const color = level ? level.color_hex : '#9CA3AF'; // get colour of chip to generate

            return (
              <span
                className="py-1 px-3 rounded-full"
                style={{
                  border: `1px solid ${color}`,
                  color: color
                }}
              >
                {displayName}
              </span>
            );
          },
          sortComparator: (v1, v2) => {
            const order = ['easy', 'medium', 'hard'];
            return order.indexOf(v1.toLowerCase()) - order.indexOf(v2.toLowerCase());
          }
        },
        {
          field: 'topics',
          headerName: 'Topic',
          flex: 1.5,
          renderCell: (params) => {
            const topics = params.value as Topic[];

            if (!topics || topics.length === 0) return null;

            return (
              <div>
                {topics.map((t, idx) => (
                  <span
                    key={`${t.slug}-${idx}`}
                    className='py-1 px-3 rounded-full'
                    style={{
                      border: `1px solid ${t.color_hex}`,
                      color: t.color_hex
                    }}
                  >
                    {t.slug}
                  </span>
                ))}
              </div>
            )
          }
        },
        { field: 'status', headerName: 'Status', flex: 0.75, sortable: false },
        {
          field: 'actions',
          headerName: 'Actions',
          flex: 1,
          sortable: false,
          filterable: false,
          renderCell: (params) => {
            return (
              <div className='flex gap-2'>
                <Link
                  component='button'
                  onClick={() => {
                    router.push(`/home/question-edit/${params.row.id}`);
                  }}
                >
                  Edit
                </Link>
                {(params.row.status === 'draft' || params.row.status === 'archived') &&
                  <Link
                    component='button'
                    onClick={() => { handlePublishClick(params.row.id) }}
                  >
                    Publish
                  </Link>
                }
                {params.row.status !== 'archived' && 
                  <Link
                    component='button'
                    onClick={() => { handleDeleteClick(params.row.id) }}
                  >
                    Delete
                  </Link>
                }
              </div>
            )
          }
        }
      ] : [
        { field: 'title', headerName: 'Title', flex: 2 },
        {
          field: 'difficulty',
          headerName: 'Difficulty',
          flex: 1,
          renderCell: (params) => {
            const val = params.value?.toString().toLowerCase();
            const level = DIFFICULTY_LEVELS.find(
              (lvl) => lvl.name.toLowerCase() === val
            );

            const displayName = val.charAt(0).toUpperCase() + val.slice(1); // convert first letter to capital
            const color = level ? level.color_hex : '#9CA3AF'; // get colour of chip to generate

            return (
              <span
                className="py-1 px-3 rounded-full"
                style={{
                  border: `1px solid ${color}`,
                  color: color
                }}
              >
                {displayName}
              </span>
            );
          },
          sortComparator: (v1, v2) => {
            const order = ['easy', 'medium', 'hard'];
            return order.indexOf(v1.toLowerCase()) - order.indexOf(v2.toLowerCase());
          }
        },
        {
          field: 'topics',
          headerName: 'Topic',
          flex: 1.5,
          renderCell: (params) => {
            const topics = params.value as Topic[];

            if (!topics || topics.length === 0) return null;

            return (
              <div>
                {topics.map((t, idx) => (
                  <span
                    key={`${t.slug}-${idx}`}
                    className='py-1 px-3 rounded-full'
                    style={{
                      border: `1px solid ${t.color_hex}`,
                      color: t.color_hex
                    }}
                  >
                    {t.slug}
                  </span>
                ))}
              </div>
            )
          }
        }
      ];

  return (
    <div
      className='w-full bg-[var(--background)] rounded-xl shadow-xl'
    >
      <DataGrid
        rows={questions}
        columns={columns}
        rowCount={rowCount}
        loading={loading}
        pagination
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 15, 20, 50, 100]}
        onRowDoubleClick={handleRowDoubleClick}
        disableRowSelectionOnClick
        sx={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '2rem',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
          '& .MuiDataGrid-columnHeaders': {
            fontWeight: 700
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          }
        }}
      />
    </div>
  );
}