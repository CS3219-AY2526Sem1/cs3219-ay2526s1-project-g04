import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ----- Create controllable mock functions -----
const getReservation =
  jest.fn<(matchingId: string) => Promise<string | null>>();
const upsertReservation =
  jest.fn<
    (matchingId: string, questionId: string, ttl: number) => Promise<void>
  >();
const pickRandomEligible =
  jest.fn<(filters?: any) => Promise<{ id: string } | null>>();

await jest.unstable_mockModule(
  '../../src/repositories/ReservationRepository.js',
  () => ({ getReservation, upsertReservation }),
);

await jest.unstable_mockModule(
  '../../src/repositories/QuestionRepository.js',
  () => ({ pickRandomEligible }),
);

const SelectionService = await import('../../src/services/SelectionService.js');

describe('SelectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectOne', () => {
    describe('existing reservations', () => {
      it('should return existing reservation if already allocated', async () => {
        const matchingId = 'sess-123';
        const existingQuestionId = 'two-sum';
        getReservation.mockResolvedValue(existingQuestionId);

        const result = await SelectionService.selectOne({
          matching_id: matchingId,
        });

        expect(result).toEqual({ question_id: existingQuestionId });
        expect(getReservation).toHaveBeenCalledWith(matchingId);
        expect(pickRandomEligible).not.toHaveBeenCalled();
        expect(upsertReservation).not.toHaveBeenCalled();
      });

      it('should return existing reservation even when filters are provided', async () => {
        const matchingId = 'sess-456';
        const existingQuestionId = 'three-sum';
        getReservation.mockResolvedValue(existingQuestionId);

        const result = await SelectionService.selectOne({
          matching_id: matchingId,
          difficulty: 'hard',
          topics: ['arrays', 'hash-table'],
          recent_ids: ['two-sum'],
        });

        expect(result).toEqual({ question_id: existingQuestionId });
        expect(getReservation).toHaveBeenCalledWith(matchingId);
        expect(pickRandomEligible).not.toHaveBeenCalled();
      });
    });

    describe('new question selection', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
      });

      it('should select and reserve a new question when no reservation exists', async () => {
        const matchingId = 'sess-789';
        const selectedQuestion = { id: 'valid-parentheses' };
        pickRandomEligible.mockResolvedValue(selectedQuestion);
        upsertReservation.mockResolvedValue(undefined);

        const result = await SelectionService.selectOne({
          matching_id: matchingId,
        });

        expect(result).toEqual({ question_id: 'valid-parentheses' });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
        expect(upsertReservation).toHaveBeenCalledWith(
          matchingId,
          'valid-parentheses',
          600,
        );
      });

      it('should return null when no eligible questions found', async () => {
        const matchingId = 'sess-999';
        pickRandomEligible.mockResolvedValue(null);

        const result = await SelectionService.selectOne({
          matching_id: matchingId,
          difficulty: 'hard',
          topics: ['non-existent-topic'],
        });

        expect(result).toEqual({ question_id: null });
        expect(upsertReservation).not.toHaveBeenCalled();
      });
    });

    describe('difficulty filtering', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockResolvedValue({ id: 'test-question' });
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should normalize difficulty "easy" to "Easy"', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-1',
          difficulty: 'easy',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({ difficulty: 'Easy' });
      });

      it('should normalize difficulty "medium" to "Medium"', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-2',
          difficulty: 'medium',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          difficulty: 'Medium',
        });
      });

      it('should normalize difficulty "hard" to "Hard"', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-3',
          difficulty: 'hard',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({ difficulty: 'Hard' });
      });

      it('should handle case-insensitive difficulty values', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-4',
          difficulty: 'MEDIUM',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          difficulty: 'Medium',
        });
      });

      it('should handle difficulty with extra whitespace', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-5',
          difficulty: '  easy  ',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({ difficulty: 'Easy' });
      });

      it('should ignore invalid difficulty values', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-6',
          difficulty: 'invalid',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });

      it('should not pass difficulty when undefined', async () => {
        await SelectionService.selectOne({ matching_id: 'sess-7' });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });

      it('should not pass difficulty when empty string', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-8',
          difficulty: '',
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });
    });

    describe('topics filtering', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockResolvedValue({ id: 'test-question' });
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should pass topics array to repository', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-10',
          topics: ['arrays', 'hash-table'],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          topics: ['arrays', 'hash-table'],
        });
      });

      it('should pass single topic', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-11',
          topics: ['dynamic-programming'],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          topics: ['dynamic-programming'],
        });
      });

      it('should not pass topics when array is empty', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-12',
          topics: [],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });

      it('should not pass topics when undefined', async () => {
        await SelectionService.selectOne({ matching_id: 'sess-13' });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });
    });

    describe('recent_ids filtering', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockResolvedValue({ id: 'test-question' });
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should pass recent_ids as recentIds to repository', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-20',
          recent_ids: ['two-sum', 'three-sum'],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          recentIds: ['two-sum', 'three-sum'],
        });
      });

      it('should pass single recent_id', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-21',
          recent_ids: ['two-sum'],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          recentIds: ['two-sum'],
        });
      });

      it('should not pass recent_ids when array is empty', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-22',
          recent_ids: [],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });

      it('should not pass recent_ids when undefined', async () => {
        await SelectionService.selectOne({ matching_id: 'sess-23' });
        expect(pickRandomEligible).toHaveBeenCalledWith({});
      });
    });

    describe('combined filters', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockResolvedValue({ id: 'test-question' });
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should pass all filters together', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-30',
          difficulty: 'medium',
          topics: ['arrays', 'strings'],
          recent_ids: ['two-sum', 'valid-parentheses'],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({
          difficulty: 'Medium',
          topics: ['arrays', 'strings'],
          recentIds: ['two-sum', 'valid-parentheses'],
        });
      });

      it('should only pass valid filters', async () => {
        await SelectionService.selectOne({
          matching_id: 'sess-31',
          difficulty: 'invalid',
          topics: ['arrays'],
          recent_ids: [],
        });
        expect(pickRandomEligible).toHaveBeenCalledWith({ topics: ['arrays'] });
      });
    });

    describe('reservation TTL', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should reserve question with 600 seconds TTL', async () => {
        const matchingId = 'sess-40';
        const questionId = 'longest-substring';
        pickRandomEligible.mockResolvedValue({ id: questionId });

        await SelectionService.selectOne({ matching_id: matchingId });

        expect(upsertReservation).toHaveBeenCalledWith(
          matchingId,
          questionId,
          600,
        );
      });
    });

    describe('error handling', () => {
      it('should propagate repository errors', async () => {
        getReservation.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          SelectionService.selectOne({ matching_id: 'sess-error' }),
        ).rejects.toThrow('Database connection failed');
      });

      it('should propagate pickRandomEligible errors', async () => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockRejectedValue(new Error('Query failed'));

        await expect(
          SelectionService.selectOne({ matching_id: 'sess-error-2' }),
        ).rejects.toThrow('Query failed');
      });

      it('should propagate upsertReservation errors', async () => {
        getReservation.mockResolvedValue(null);
        pickRandomEligible.mockResolvedValue({ id: 'test-q' });
        upsertReservation.mockRejectedValue(
          new Error('Reservation update failed'),
        );

        await expect(
          SelectionService.selectOne({ matching_id: 'sess-error-3' }),
        ).rejects.toThrow('Reservation update failed');
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        getReservation.mockResolvedValue(null);
        upsertReservation.mockResolvedValue(undefined);
      });

      it('should handle question with special characters in id', async () => {
        const questionId = 'question-with-special-chars_123';
        pickRandomEligible.mockResolvedValue({ id: questionId });

        const result = await SelectionService.selectOne({
          matching_id: 'sess-50',
        });
        expect(result).toEqual({ question_id: questionId });
      });

      it('should handle matching_id with special characters', async () => {
        const matchingId = 'sess-abc-123_xyz';
        pickRandomEligible.mockResolvedValue({ id: 'test-q' });

        await SelectionService.selectOne({ matching_id: matchingId });

        expect(upsertReservation).toHaveBeenCalledWith(
          matchingId,
          'test-q',
          600,
        );
      });

      it('should handle very long topics array', async () => {
        const manyTopics = Array.from({ length: 50 }, (_, i) => `topic-${i}`);
        pickRandomEligible.mockResolvedValue({ id: 'test-q' });

        await SelectionService.selectOne({
          matching_id: 'sess-51',
          topics: manyTopics,
        });

        expect(pickRandomEligible).toHaveBeenCalledWith({ topics: manyTopics });
      });

      it('should handle very long recent_ids array', async () => {
        const manyRecent = Array.from({ length: 100 }, (_, i) => `q-${i}`);
        pickRandomEligible.mockResolvedValue({ id: 'test-q' });

        await SelectionService.selectOne({
          matching_id: 'sess-52',
          recent_ids: manyRecent,
        });

        expect(pickRandomEligible).toHaveBeenCalledWith({
          recentIds: manyRecent,
        });
      });
    });
  });
});
