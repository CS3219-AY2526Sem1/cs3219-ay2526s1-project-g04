BEGIN;
-- ==============================================================
-- Questions (core catalog)
-- ==============================================================

WITH seed(id, title, difficulty, topics, full_markdown) AS (
  VALUES

  -- EASY
  (
    'reverse-a-string',
    'Reverse a String',
    'Easy',
    '["strings","algorithms"]',
    'Write a function that reverses an array of characters in-place using O(1) extra memory.

You are given a character array s. Modify s so that it becomes reversed. Do not allocate extra arrays for another copy; you must do it in-place.

Example 1:
Input:  s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

Example 2:
Input:  s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]

Constraints:
- 1 <= s.length <= 100000
- s[i] is a printable ASCII character.

Follow-up:
- Can you do it with two pointers without recursion?'
  ),

  (
    'linked-list-cycle-detection',
    'Linked List Cycle Detection',
    'Easy',
    '["data-structures","algorithms"]',
    'Given head of a singly linked list, return true if there is a cycle in the list.

A cycle exists if some node in the list can be reached again by continuously following next. Internally, the tail''s next pointer might point to some previous node.

Your algorithm must use O(1) extra space.

Example:
Input: head = [3,2,0,-4], pos = 1
Output: true
Explanation: There is a cycle linking the tail back to the node with value 2.

Hint:
Use two pointers moving at different speeds (Floyd''s Tortoise and Hare).'
  ),

  (
    'roman-to-integer',
    'Roman to Integer',
    'Easy',
    '["algorithms"]',
    'Convert a Roman numeral string into its integer value.

Roman numerals are represented by seven symbols:
I=1, V=5, X=10, L=50, C=100, D=500, M=1000.

Rules:
- If a smaller value appears before a larger one, subtract the smaller.
- Otherwise, add it.

Example:
Input: s = "MCMXCIV"
Output: 1994
Explanation:
M (1000) + CM (900) + XC (90) + IV (4)

Constraints:
- 1 <= s.length <= 15
- s contains only the characters I,V,X,L,C,D,M.
- s is guaranteed to be valid.'
  ),

  (
    'add-binary',
    'Add Binary',
    'Easy',
    '["bit-manipulation","algorithms"]',
    'Given two binary strings a and b, return their sum as a binary string.

Example:
Input: a = "11", b = "1"
Output: "100"

Constraints:
- 1 <= a.length, b.length <= 10^4
- a and b consist only of ''0'' or ''1''.
- You must handle carry.'
  ),

  (
    'fibonacci-number',
    'Fibonacci Number',
    'Easy',
    '["recursion","algorithms"]',
    'The Fibonacci sequence is defined as:
F(0)=0, F(1)=1
F(n)=F(n-1)+F(n-2) for n > 1.

Given n, return F(n).

Constraints:
- 0 <= n <= 30

Follow-up:
- Implement both recursion with memoization and iterative DP.'
  ),

  (
    'implement-stack-using-queues',
    'Implement Stack using Queues',
    'Easy',
    '["data-structures"]',
    'Implement a LIFO stack using only standard queue operations:
- push(x)
- pop()
- top()
- empty()

You may only use:
- enqueue to back,
- dequeue from front,
- size,
- isEmpty.

You must simulate stack behavior (last pushed = first popped).

Follow-up:
- Optimize so that either push or pop is O(1).'
  ),

  (
    'combine-two-tables',
    'Combine Two Tables',
    'Easy',
    '["databases"]',
    'SQL question.

You are given two tables:
Person(id, firstName, lastName)
Address(personId, city, state)

Write a query to report firstName, lastName, city, and state for each person.
If a person''s address is missing, report null for city/state.

Return the result table in any order.'
  ),

  -- MEDIUM
  (
    'repeated-dna-sequences',
    'Repeated DNA Sequences',
    'Medium',
    '["algorithms","bit-manipulation"]',
    'A DNA string s consists of characters A,C,G,T.

Return all 10-letter-long sequences (substrings) that occur more than once in s.

Example:
Input:  s = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"
Output: ["AAAAACCCCC","CCCCCAAAAA"]

Constraints:
- 1 <= s.length <= 10^5
- s consists of A,C,G,T only.

Hint:
You can encode 10 chars into 20 bits and use a rolling hash / bitmask.'
  ),

  (
    'course-schedule',
    'Course Schedule',
    'Medium',
    '["data-structures","algorithms"]',
    'You are given numCourses and a list of prerequisite pairs [a, b] meaning:
to take course a you must first take course b.

Return true if you can finish all courses, false if there''s a cycle.

This is basically: "Is the directed graph acyclic?"

Example:
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true

Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false

Typical solution:
Topological sort (Kahn''s algorithm or DFS with visited states).'
  ),

  (
    'lru-cache',
    'LRU Cache Design',
    'Medium',
    '["data-structures"]',
    'Design a data structure with:
- get(key) -> returns value or -1
- put(key, value)

Both must be O(1) average time.

Evict the least recently used key when capacity is exceeded.

Hint:
Use a hashmap + doubly linked list to track recency.'
  ),

  (
    'longest-common-subsequence',
    'Longest Common Subsequence',
    'Medium',
    '["strings","algorithms"]',
    'Given two strings text1 and text2, return the length of their longest common subsequence.

A subsequence is a sequence that appears in the same relative order but not necessarily contiguously.

Example:
text1 = "abcde", text2 = "ace"
LCS = "ace" -> length 3

Constraints:
- 1 <= text1.length, text2.length <= 1000

Classic DP:
dp[i][j] = LCS length of text1[i:] and text2[j:].'
  ),

  (
    'rotate-image',
    'Rotate Image',
    'Medium',
    '["arrays","algorithms"]',
    'You are given an n x n matrix. Rotate it 90 degrees clockwise in-place.

Example:
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

You must do this in-place:
- transpose
- then reverse each row.'
  ),

  (
    'airplane-seat-assignment-probability',
    'Airplane Seat Assignment Probability',
    'Medium',
    '["brainteaser"]',
    'There are n passengers and n seats on a plane. Passenger 1 loses their ticket and sits in a random seat. Everyone else:

- If their own seat is free, they sit in it.
- Otherwise they sit in a random free seat.

What is the probability that the nth passenger gets their own seat?

Known result:
The answer is 1/2 for n > 1. (For n = 1 it''s 1).'
  ),

  (
    'validate-binary-search-tree',
    'Validate Binary Search Tree',
    'Medium',
    '["data-structures","algorithms"]',
    'Given the root of a binary tree, determine if it is a valid BST.

A valid BST is defined as:
- For any node, all values in the left subtree are strictly less than node.val
- All values in the right subtree are strictly greater than node.val
- Both subtrees are also BSTs.

Hint:
Carry down (min,max) bounds in DFS, or do an inorder traversal and check that it''s strictly increasing.'
  ),

  -- HARD
  (
    'sliding-window-maximum',
    'Sliding Window Maximum',
    'Hard',
    '["arrays","algorithms"]',
    'You are given an integer array nums and an integer k.
Return an array max_window where max_window[i] is the max of nums[i..i+k-1].

Example:
Input:  nums = [1,3,-1,-3,5,3,6,7], k = 3
Output: [3,3,5,5,6,7]

Constraints:
- 1 <= nums.length <= 10^5
- 1 <= k <= nums.length

Hint:
Use a deque that stores indices of "candidate max" elements in decreasing order.'
  ),

  (
    'n-queens',
    'N-Queen Problem',
    'Hard',
    '["algorithms"]',
    'Place n queens on an n x n chessboard so that no two queens attack each other.

Return all distinct solutions. Each solution is a board representation with "Q" for a queen and "." for empty.

Constraints:
- 1 <= n <= 9

This is classic backtracking:
- place a queen row by row
- track used columns and diagonals.'
  ),

  (
    'serialize-and-deserialize-binary-tree',
    'Serialize and Deserialize a Binary Tree',
    'Hard',
    '["data-structures","algorithms"]',
    'Design an algorithm to:
1. Serialize a binary tree to a string.
2. Deserialize that string back to the original tree structure.

Goal:
- Result must be lossless
- Handle null children

Typical approach:
Level-order (BFS) with "null" markers.

Example:
Input tree:    1
              / \
             2   3
                / \
               4   5

One valid serialization: "1,2,3,null,null,4,5".'
  ),

  (
    'wildcard-matching',
    'Wildcard Matching',
    'Hard',
    '["strings","algorithms"]',
    'Implement wildcard pattern matching with support for ''?'' and ''*''.

''?'' matches exactly one character.
''*'' matches any sequence of characters (including empty).

Given input string s and pattern p, return true if p matches the entire string s.

Constraints:
- 0 <= s.length, p.length <= 2000

Hint:
Greedy two-pointer solution or DP. Be careful with consecutive ''*''. '
  ),

  (
    'chalkboard-xor-game',
    'Chalkboard XOR Game',
    'Hard',
    '["brainteaser"]',
    'There is an array of integers. Players alternate turns removing exactly one element. If the XOR of all remaining numbers becomes 0 after your move, you win.

Return true if the first player can win with optimal play.

Known fact:
- If the XOR of all numbers at the start is 0, first player already wins.
- Else, if the array length is even, first player can force a win.
- Else, first player loses.'
  ),

  (
    'trips-and-users',
    'Trips and Users',
    'Hard',
    '["databases"]',
    'SQL analytics question.

You are given Trips and Users tables. Some users are banned.

For each day, compute the cancellation rate:
(#cancelled trips by non-banned drivers and non-banned riders)
/ (#total trips requested by non-banned drivers and non-banned riders)

Return date and cancellation rate.

Edge cases:
- Exclude records where driver or rider is banned.
- Group by request date, not completion date.'
  )

),

upsert_questions AS (
  INSERT INTO questions (
    id,
    title,
    body_md,
    difficulty,
    topics,
    attachments,
    status,
    version,
    rand_key,
    created_at,
    updated_at
  )
  SELECT
    s.id,
    s.title,
    s.full_markdown,
    s.difficulty,
    s.topics::jsonb,
    '[]'::jsonb,
    'published',
    1,
    random(),
    now(),
    now()
  FROM seed s
  ON CONFLICT (id) DO UPDATE
    SET title       = EXCLUDED.title,
        body_md     = EXCLUDED.body_md,
        difficulty  = EXCLUDED.difficulty,
        topics      = EXCLUDED.topics,
        attachments = EXCLUDED.attachments,
        status      = 'published',
        updated_at  = now()
  RETURNING id, topics
)

-- ==============================================================
-- question_topics (relational mirror)
-- ==============================================================

INSERT INTO question_topics (question_id, topic_slug)
SELECT q.id, topic_slug
FROM upsert_questions q,
LATERAL jsonb_array_elements_text(q.topics) AS topic_slug
WHERE topic_slug IN (SELECT slug FROM topics)
ON CONFLICT DO NOTHING;

-- ==============================================================
-- Python starter code for each question
-- ==============================================================

INSERT INTO question_python_starter (question_id, starter_code) VALUES
  (
    'reverse-a-string',
    'class Solution:
    def reverseString(self, s: list[str]) -> None:
        """
        Do not return anything, modify s in-place instead.
        """
        pass
'
  ),
  (
    'linked-list-cycle-detection',
    'class Solution:
    def hasCycle(self, head: "ListNode | None") -> bool:
        pass
'
  ),
  (
    'rotate-image',
    'class Solution:
    def rotate(self, matrix: list[list[int]]) -> None:
        """
        Do not return anything, modify matrix in-place instead.
        """
        pass
'
  ),
  (
    'validate-binary-search-tree',
    'class Solution:
    def isValidBST(self, root: "TreeNode | None") -> bool:
        pass
'
  ),
  (
    'lru-cache',
    'class LRUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        return -1

    def put(self, key: int, value: int) -> None:
        pass
'
  ),
  (
    'longest-common-subsequence',
    'class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        pass
'
  ),
  (
    'sliding-window-maximum',
    'class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        pass
'
  ),
  (
    'serialize-and-deserialize-binary-tree',
    'class Codec:
    def serialize(self, root: "TreeNode | None") -> str:
        pass

    def deserialize(self, data: str) -> "TreeNode | None":
        pass
'
  ),
  (
    'n-queens',
    'class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        pass
'
  )
ON CONFLICT (question_id) DO UPDATE
  SET starter_code = EXCLUDED.starter_code;

-- ==============================================================
-- Test cases (ordinals now 1..n)
-- ==============================================================

-- reverse-a-string
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'reverse-a-string',
    'sample',
    '["h","e","l","l","o"]',
    '["o","l","l","e","h"]',
    1
  ),
  (
    'reverse-a-string',
    'hidden',
    '["H","a","n","n","a","h"]',
    '["h","a","n","n","a","H"]',
    2
  )
ON CONFLICT DO NOTHING;

-- linked-list-cycle-detection
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'linked-list-cycle-detection',
    'sample',
    '{"list":[3,2,0,-4],"pos":1}',
    'true',
    1
  ),
  (
    'linked-list-cycle-detection',
    'hidden',
    '{"list":[1,2],"pos":0}',
    'true',
    2
  ),
  (
    'linked-list-cycle-detection',
    'hidden',
    '{"list":[1],"pos":-1}',
    'false',
    3
  )
ON CONFLICT DO NOTHING;

-- rotate-image
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'rotate-image',
    'sample',
    '[[1,2,3],[4,5,6],[7,8,9]]',
    '[[7,4,1],[8,5,2],[9,6,3]]',
    1
  ),
  (
    'rotate-image',
    'hidden',
    '[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]',
    '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]',
    2
  )
ON CONFLICT DO NOTHING;

-- longest-common-subsequence
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'longest-common-subsequence',
    'sample',
    '{"text1":"abcde","text2":"ace"}',
    '3',
    1
  ),
  (
    'longest-common-subsequence',
    'hidden',
    '{"text1":"abc","text2":"abc"}',
    '3',
    2
  ),
  (
    'longest-common-subsequence',
    'hidden',
    '{"text1":"abc","text2":"def"}',
    '0',
    3
  )
ON CONFLICT DO NOTHING;

-- sliding-window-maximum
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'sliding-window-maximum',
    'sample',
    '{"nums":[1,3,-1,-3,5,3,6,7],"k":3}',
    '[3,3,5,5,6,7]',
    1
  ),
  (
    'sliding-window-maximum',
    'hidden',
    '{"nums":[9,8,7,6,5,4,3],"k":2}',
    '[9,8,7,6,5,4]',
    2
  )
ON CONFLICT DO NOTHING;

-- validate-binary-search-tree
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'validate-binary-search-tree',
    'sample',
    '{"tree":[2,1,3]}',
    'true',
    1
  ),
  (
    'validate-binary-search-tree',
    'hidden',
    '{"tree":[5,1,4,null,null,3,6]}',
    'false',
    2
  )
ON CONFLICT DO NOTHING;

-- lru-cache
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'lru-cache',
    'sample',
    '{"ops":["LRUCache","put","put","get","put","get","put","get","get","get"],"args":[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]}',
    '[null,null,null,1,null,-1,null,-1,3,4]',
    1
  )
ON CONFLICT DO NOTHING;

-- serialize-and-deserialize-binary-tree
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'serialize-and-deserialize-binary-tree',
    'sample',
    '{"tree":[1,2,3,null,null,4,5]}',
    '"1,2,3,null,null,4,5"',
    1
  )
ON CONFLICT DO NOTHING;

-- n-queens
INSERT INTO question_test_cases
  (question_id, visibility, input_data, expected_output, ordinal)
VALUES
  (
    'n-queens',
    'sample',
    '{"n":4}',
    '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
    1
  )
ON CONFLICT DO NOTHING;

-- ==============================================================
-- question_versions (snapshot for v1)
-- ==============================================================

INSERT INTO question_versions (
  id,
  version,
  title,
  body_md,
  difficulty,
  topics,
  attachments,
  status,
  published_at
)
SELECT
  q.id,
  1,
  q.title,
  q.body_md,
  q.difficulty,
  q.topics,
  q.attachments,
  'published',
  now()
FROM questions q
ON CONFLICT (id, version) DO NOTHING;

-- ==============================================================
-- Optional: demo reservation for /select testing
-- ==============================================================

INSERT INTO reservations (matching_id, question_id, expires_at)
VALUES ('demo-session-1', 'reverse-a-string', now() + interval '10 minutes')
ON CONFLICT (matching_id) DO NOTHING;

COMMIT;