// src/repositories/ResourcesRepository.ts

import { prisma } from './prisma.js';

/**
 * For public usage (user / collab session):
 * - only public questions
 * - only SAMPLE test cases
 */
export async function getPublicResources(questionId: string) {
  // cheack if question is published
  const q = await prisma.questions.findFirst({
    where: { id: questionId, status: 'published' },
    select: {
      id: true,
      updated_at: true,
    },
  });
  if (!q) return null;

  // get python starter
  const pyStarter = await prisma.question_python_starter.findUnique({
    where: { question_id: questionId },
    select: { starter_code: true },
  });

  // get sample test cases (ordered)
  const samples = await prisma.question_test_cases.findMany({
    where: {
      question_id: questionId,
      visibility: 'sample',
    },
    orderBy: { ordinal: 'asc' },
    select: {
      ordinal: true,
      visibility: true,
      input_data: true,
      expected_output: true,
    },
  });

  return {
    question_id: q.id,
    starter_code: pyStarter ? { python: pyStarter.starter_code } : {},

    test_cases: samples.map((tc) => ({
      name: `case-${tc.ordinal}`,
      visibility: tc.visibility,
      input: tc.input_data,
      expected: tc.expected_output,
    })),

    updated_at: q.updated_at.toISOString(),
  };
}

/**
 * For judge / admin / service role:
 * - ANY status (draft allowed for testing)
 * - BOTH sample + hidden cases
 */
export async function getInternalResources(questionId: string) {
  // 1. Load question regardless of status
  const q = await prisma.questions.findFirst({
    where: { id: questionId },
    select: {
      id: true,
      status: true,
      updated_at: true,
    },
  });
  if (!q) return null;

  // 2. Get python starter
  const pyStarter = await prisma.question_python_starter.findUnique({
    where: { question_id: questionId },
    select: { starter_code: true },
  });

  // 3. Get ALL test cases
  const allCases = await prisma.question_test_cases.findMany({
    where: { question_id: questionId },
    orderBy: { ordinal: 'asc' },
    select: {
      ordinal: true,
      visibility: true,
      input_data: true,
      expected_output: true,
    },
  });

  return {
    question_id: q.id,
    status: q.status,
    starter_code: pyStarter ? { python: pyStarter.starter_code } : {},

    test_cases: allCases.map((tc) => ({
      name: `case-${tc.ordinal}`,
      visibility: tc.visibility, // includes 'hidden'
      input: tc.input_data,
      expected: tc.expected_output,
    })),

    updated_at: q.updated_at.toISOString(),
  };
}
