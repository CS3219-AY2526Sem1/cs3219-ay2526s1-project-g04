import { Question } from '../question-service';

export const TEST_QUESTION_VIEW: Question = {
  id: 'rotate-image-in-place',
  title: 'Rotate Image In-Place',
  body_md: 'Rotate an N x N matrix by 90 degrees clockwise, in-place.',
  body_html: `
    <h2>Problem Description</h2>
    <p>Given an N x N 2D matrix representing an image, rotate the image by 90 degrees clockwise in-place. You must rotate the matrix without using extra space for another matrix.</p>
    
    <h2>Input</h2>
    <p>A 2D array <code>matrix</code> of integers with dimensions N x N, where 1 ≤ N ≤ 1000. Each element represents a pixel value.</p>
    
    <h2>Output</h2>
    <p>The matrix should be rotated in-place by 90 degrees clockwise.</p>
    
    <h3>Example 1</h3>
    <pre>
Input:
[
  [1,2,3],
  [4,5,6],
  [7,8,9]
]

Output:
[
  [7,4,1],
  [8,5,2],
  [9,6,3]
]
    </pre>

    <h3>Example 2</h3>
    <pre>
Input:
[
  [1,2],
  [3,4]
]

Output:
[
  [3,1],
  [4,2]
]
    </pre>

    <h2>Constraints</h2>
    <ol>
      <li>1 ≤ N ≤ 1000</li>
      <li>Elements of the matrix are integers</li>
      <li>You must rotate the matrix in-place</li>
    </ol>

    <h2>Notes</h2>
    <p>Try to solve this without using any extra matrix. Think about transposing and then reversing rows, or rotating layer by layer.</p>
  `,
  difficulty: 'Medium',
  topics: [
    { slug: 'arrays', display: 'Arrays', color_hex: '#3b82f6' },
    { slug: 'matrices', display: 'Matrices', color_hex: '#f97316' },
  ],
  attachments: [
    {
      filename: 'diagram.png',
      object_key: 'questions/rotate-image-in-place/diagram.png',
      mime: 'image/png',
      alt: 'Matrix rotation diagram',
      byte_size: 24500,
      width: 512,
      height: 512,
    },
    {
      filename: 'diagram222.png',
      object_key: 'questions/rotate-image-in-place/diagram222.png',
      mime: 'image/png',
      alt: 'Matrix rotation diagram',
      byte_size: 24500,
      width: 512,
      height: 512,
    },
    {
      filename: 'test-attachment.png',
      object_key: 'questions/rotate-image-in-place/attachment.png',
      mime: 'image/png',
    },
    {
      filename: 'another-test-attachment.png',
      object_key: 'questions/rotate-image-in-place/another-test-attachment.png',
      mime: 'image/png',
    },
    {
      filename: 'another-test-attachment1.png',
      object_key:
        'questions/rotate-image-in-place/another-test-attachment1.png',
      mime: 'image/png',
    },
  ],
  status: 'draft',
  version: 1,
  created_at: '2025-11-05T10:04:22.159Z',
  updated_at: '2025-11-05T10:04:22.159Z',
  starter_code: 'function rotate(matrix) {\n  // your code here\n}',
  test_cases: [
    {
      name: 'case-0',
      visibility: 'sample',
      input_data: '[[1,2],[3,4]]',
      expected_output: '[[3,1],[4,2]]',
      ordinal: 0,
    },
    {
      name: 'case-1',
      visibility: 'hidden',
      input_data: '[[5,6,7],[8,9,10],[11,12,13]]',
      expected_output: '[[11,8,5],[12,9,6],[13,10,7]]',
      ordinal: 1,
    },
  ],
};
