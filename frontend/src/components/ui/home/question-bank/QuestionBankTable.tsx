'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataGrid,
  GridColDef,
  GridRowParams,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import { Tooltip } from '@mui/material';
import {
  PencilIcon,
  ArrowUpTrayIcon,
  ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/outline';
import {
  Question,
  Topic,
  getQuestionsRequestParams,
} from '@/lib/question-service';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';
import {
  getAdminQuestions,
  getQuestions,
  deleteAdminQuestions,
  postAdminQuestionsPublish,
} from '@/services/questionServiceApi';
// import { TEST_QUESTION_LIST } from '@/lib/test-data/TestQuestionList';

interface QuestionBankTableProps {
  topicFilter: string;
  userRole: string | null;
}

export default function QuestionBankTable({
  topicFilter,
  userRole,
}: QuestionBankTableProps) {
  const router = useRouter();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]); // store questions
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 15,
    page: 0,
  });

  const handleRowDoubleClick = (params: GridRowParams) => {
    const questionId = params.row.id;
    router.push(`/home/question-view/${questionId}`);
  };

  const handleDeleteClick = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this question?',
    );
    if (!confirmed) return;

    try {
      const success = await deleteAdminQuestions(id);
      if (success) {
        alert('Question deleted successfully!');
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting question.');
    }
  };

  const handlePublishClick = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to publish this question?',
    );
    if (!confirmed) return;

    try {
      const success = await postAdminQuestionsPublish(id);
      if (success) {
        alert('Question published successfully!');
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while publishing question.');
    }
  };

  useEffect(() => {
    setLoading(true);
    if (userRole === 'USER') {
      const params: getQuestionsRequestParams = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        topics: topicFilter,
      };
      getQuestions(params)
        .then((res) => {
          if (!res.success) {
            alert(res.message);
            return;
          }
          const data = res.data;
          const items = data.items;

          setQuestions(items);
          setRowCount(data.total || items.length);
        })
        .finally(() => setLoading(false));
    }

    if (userRole === 'ADMIN') {
      const params: getQuestionsRequestParams = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        topics: topicFilter,
      };
      getAdminQuestions(params)
        .then((res) => {
          if (!res.success) {
            alert(res.message);
            return;
          }
          const data = res.data;
          const items = data.items;

          // console.log(
          //   `[Question Bank Table] retrieved items: ${JSON.stringify(items)}`,
          // );

          setQuestions(items);
          setRowCount(data.total || items.length);
        })
        .finally(() => setLoading(false));
    }
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    topicFilter,
    userRole,
    refreshTrigger,
  ]);

  const adminColumns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 2 },
    { field: 'version', headerName: 'Version', flex: 0.5 },
    {
      field: 'difficulty',
      headerName: 'Difficulty',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const val = params.value?.toString().toLowerCase();
        const level = DIFFICULTY_LEVELS.find(
          (lvl) => lvl.name.toLowerCase() === val,
        );

        const displayName = val.charAt(0).toUpperCase() + val.slice(1); // convert first letter to capital
        const color = level ? level.color_hex : '#9CA3AF'; // get colour of chip to generate

        return (
          <span
            className="py-1 px-3 rounded-full"
            style={{
              border: `1px solid ${color}`,
              color: color,
            }}
          >
            {displayName}
          </span>
        );
      },
      sortComparator: (v1, v2) => {
        const order = ['easy', 'medium', 'hard'];
        return (
          order.indexOf(v1.toLowerCase()) - order.indexOf(v2.toLowerCase())
        );
      },
    },
    {
      field: 'topics',
      headerName: 'Topic',
      flex: 1.5,
      renderCell: (params: GridRenderCellParams) => {
        const topics = params.value as Topic[];

        if (!topics || topics.length === 0) return null;

        return (
          <div>
            {topics.map((t, idx) => (
              <span
                key={`${t.slug}-${idx}`}
                className="py-1 px-3 rounded-full"
                style={{
                  border: `1px solid ${t.color_hex}`,
                  color: t.color_hex,
                }}
              >
                {t.display}
              </span>
            ))}
          </div>
        );
      },
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
          <div className="flex items-center gap-2 h-full">
            <Tooltip title="Edit question">
              <button
                onClick={() => {
                  router.push(`/home/question-edit/${params.row.id}`);
                }}
                className="group p-2 rounded-full transition-all"
              >
                <PencilIcon className="w-5 h-5 group-hover:text-blue-500" />
              </button>
            </Tooltip>

            {params.row.status !== 'published' && (
              <Tooltip title="Publish question">
                <button
                  onClick={() => {
                    handlePublishClick(params.row.id);
                  }}
                  className="group p-2 rounded-full transition-all"
                >
                  <ArrowUpTrayIcon className="w-5 h-5 group-hover:text-blue-500" />
                </button>
              </Tooltip>
            )}
            {params.row.status !== 'archived' && (
              <Tooltip title="Archive question">
                <button
                  onClick={() => {
                    handleDeleteClick(params.row.id);
                  }}
                  className="group p-2 rounded-full transition-all"
                >
                  <ArchiveBoxXMarkIcon className="w-5 h-5 group-hover:text-blue-500" />
                </button>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const userColumns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 2 },
    {
      field: 'difficulty',
      headerName: 'Difficulty',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const val = params.value?.toString().toLowerCase();
        const level = DIFFICULTY_LEVELS.find(
          (lvl) => lvl.name.toLowerCase() === val,
        );

        const displayName = val.charAt(0).toUpperCase() + val.slice(1); // convert first letter to capital
        const color = level ? level.color_hex : '#9CA3AF'; // get colour of chip to generate

        return (
          <span
            className="py-1 px-3 rounded-full"
            style={{
              border: `1px solid ${color}`,
              color: color,
            }}
          >
            {displayName}
          </span>
        );
      },
      sortComparator: (v1, v2) => {
        const order = ['easy', 'medium', 'hard'];
        return (
          order.indexOf(v1.toLowerCase()) - order.indexOf(v2.toLowerCase())
        );
      },
    },
    {
      field: 'topics',
      headerName: 'Topic',
      flex: 1.5,
      renderCell: (params: GridRenderCellParams) => {
        const topics = params.value as Topic[];

        if (!topics || topics.length === 0) return null;

        return (
          <div>
            {topics.map((t, idx) => (
              <span
                key={`${t.slug}-${idx}`}
                className="py-1 px-3 rounded-full"
                style={{
                  border: `1px solid ${t.color_hex}`,
                  color: t.color_hex,
                }}
              >
                {t.display}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  // define table columns
  const columns = userRole === 'ADMIN' ? adminColumns : userColumns;

  return (
    <div className="w-full bg-[var(--background)] rounded-xl shadow-xl">
      <DataGrid
        rows={questions}
        // rows={TEST_QUESTION_LIST} // for test
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
            fontWeight: 700,
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        }}
      />
    </div>
  );
}
