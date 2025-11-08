import { TestCase } from '../question-service';

export const TEST_TEST_CASES: TestCase[] = [
  {
    name: 'Simple addition',
    visibility: 'sample',
    input_data: '2 3',
    expected_output: '5',
    ordinal: 1,
  },
  {
    name: 'Includes zero',
    visibility: 'sample',
    input_data: '0 7',
    expected_output: '7',
    ordinal: 2,
  },
  {
    name: 'Negative numbers',
    visibility: 'hidden',
    input_data: '-4 -6',
    expected_output: '-10',
    ordinal: 3,
  },
  {
    name: 'Mixed signs',
    visibility: 'hidden',
    input_data: '-10 4',
    expected_output: '-6',
    ordinal: 4,
  },
  {
    name: 'Large values',
    visibility: 'hidden',
    input_data: '999999 1',
    expected_output: '1000000',
    ordinal: 5,
  },
];
