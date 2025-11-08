// src/controllers/AdminController.ts
import * as Repo from '../repositories/QuestionRepository.js';
import type { Request, Response } from 'express';
import { slugify } from '../utils/slug.js';
import { finalizeStagedAttachments } from '../services/AttachmentService.js';
import type { AttachmentInput } from '../types/attachments.js';
import { log } from '../utils/logger.js';
import { prisma } from '../repositories/prisma.js'; // for topic existence checks

// types
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Status = 'draft' | 'published' | 'archived';

type IncomingTestCase = {
  visibility: 'sample' | 'hidden';
  input_data: string;
  expected_output: string;
  ordinal?: number;
};

// helpers
function normalizeDifficulty(d: unknown): Difficulty | null {
  if (typeof d !== 'string') return null;
  const v = d.toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'medium') return 'Medium';
  if (v === 'hard') return 'Hard';
  return null;
}

function normalizeStatus(s: unknown): Status | null {
  if (typeof s !== 'string') return null;
  const v = s.toLowerCase();
  if (v === 'draft' || v === 'published' || v === 'archived') return v;

  return null;
}

function isAttachment(obj: unknown): obj is AttachmentInput {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Partial<AttachmentInput> & Record<string, unknown>;
  const hasName = typeof o.filename === 'string';
  const hasKey = typeof o.object_key === 'string';
  const hasMime = typeof o.mime === 'string';
  const hasValidAlt = o.alt === undefined || typeof o.alt === 'string';
  return hasName && hasKey && hasMime && hasValidAlt;
}

function isAttachmentArray(x: unknown): x is AttachmentInput[] {
  return Array.isArray(x) && x.every(isAttachment);
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string');
}

function isTestCaseArray(x: unknown): x is IncomingTestCase[] {
  if (!Array.isArray(x)) return false;
  return x.every((tc) => {
    if (tc === null || typeof tc !== 'object') return false;
    const v = tc as Record<string, unknown>;

    if (v['visibility'] !== 'sample' && v['visibility'] !== 'hidden')
      return false;
    if (typeof v['input_data'] !== 'string') return false;
    if (typeof v['expected_output'] !== 'string') return false;

    if (
      v['ordinal'] !== undefined &&
      (typeof v['ordinal'] !== 'number' || !Number.isFinite(v['ordinal']))
    ) {
      return false;
    }
    return true;
  });
}

function parseTopics(x: unknown): string[] | undefined {
  if (typeof x === 'string')
    return x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(x)) return x.map(String);
  return undefined;
}

function parseDifficulty(x: unknown): Difficulty | undefined {
  const d = normalizeDifficulty(x);
  return d ?? undefined;
}

function parseStr(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function parseNum(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Given original markdown and two attachment lists (pre-finalize and post-finalize),
 * rewrite any pp://staging/... refs to pp://questions/<id>/...
 */
function rewriteMarkdownAttachmentPointers(
  md: string,
  before: AttachmentInput[],
  after: AttachmentInput[],
): string {
  let out = md;

  for (let i = 0; i < before.length; i += 1) {
    const oldKey = before[i]?.object_key;
    const newKey = after[i]?.object_key;

    if (!oldKey || !newKey || oldKey === newKey) continue;

    const from = `pp://${oldKey}`;
    const to = `pp://${newKey}`;

    out = out.split(from).join(to);
  }

  return out;
}

/** Load existing topic slugs for a provided list */
async function fetchExistingTopicSlugs(slugs: string[]): Promise<Set<string>> {
  if (!slugs.length) return new Set();
  const rows = await prisma.topics.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug));
}

/** Compute which of the requested topic slugs are missing */
async function findMissingTopics(slugs: string[]): Promise<string[]> {
  const have = await fetchExistingTopicSlugs(slugs);
  return slugs.filter((s) => !have.has(s));
}

/**
 * POST /admin/questions
 *
 * Body can include:
 * - title (string, required)
 * - body_md (string, required)
 * - difficulty (easy|medium|hard, required)
 * - topics (string[] optional)
 * - attachments (AttachmentInput[] optional, may still be staging/*)
 * - starter_code (string optional)
 * - test_cases (IncomingTestCase[] optional)
 *
 * Flow:
 *   1) create a draft row with empty attachments just to lock in an ID/slug
 *   2) finalize attachments to questions/<id>/...
 *   3) rewrite body_md image refs
 *   4) update the draft with finalized attachments + rewritten body_md
 *      AND starter_code + test_cases via Repo.updateDraftWithResources
 */
export async function create(req: Request, res: Response) {
  try {
    const {
      title,
      body_md,
      difficulty,
      topics,
      attachments,
      starter_code,
      test_cases,
    } = req.body ?? {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (typeof body_md !== 'string' || !body_md.trim()) {
      return res.status(400).json({ error: 'body_md is required' });
    }

    const diff = normalizeDifficulty(difficulty);
    if (!diff) {
      return res
        .status(400)
        .json({ error: 'difficulty must be: Easy, Medium, Hard' });
    }

    // topics validation + existence pre-check
    const topicList = isStringArray(topics) ? topics : [];
    if (topicList.length) {
      const missing = await findMissingTopics(topicList);
      if (missing.length) {
        return res.status(400).json({
          error: 'topics_not_found',
          missing,
          message:
            'Create missing topics first via POST /admin/topics { display, color_hex }',
        });
      }
    }

    // attachments validation (may include staging)
    const incomingAtts: AttachmentInput[] = isAttachmentArray(attachments)
      ? attachments
      : [];

    // execution resources validation
    const starterCodeStr =
      typeof starter_code === 'string' ? starter_code : undefined;

    const testCasesList: IncomingTestCase[] | undefined = isTestCaseArray(
      test_cases,
    )
      ? test_cases
      : undefined;

    // allocate canonical slug/id by creating an empty draft first
    const slugId = slugify(title);
    if (!slugId) {
      return res
        .status(400)
        .json({ error: 'invalid title (cannot derive a slug)' });
    }

    const draft = await Repo.createDraft({
      id: slugId,
      title,
      body_md,
      difficulty: diff,
      topics: topicList,
      attachments: [],
    });

    // finalize staged attachments now that we know draft.id
    const finalizedAtts = incomingAtts.length
      ? await finalizeStagedAttachments(draft.id, incomingAtts)
      : [];

    // rewrite body_md if images referenced staging/... keys
    const rewrittenMd = rewriteMarkdownAttachmentPointers(
      draft.body_md,
      incomingAtts,
      finalizedAtts,
    );

    // patch the draft with finalized data + execution resources
    const patchForCreate: {
      title?: string;
      body_md?: string;
      difficulty?: Difficulty;
      topics?: string[];
      attachments?: AttachmentInput[];
      starter_code?: string;
      test_cases?: IncomingTestCase[];
    } = {
      title,
      body_md: rewrittenMd,
      difficulty: diff,
      topics: topicList,
      attachments: finalizedAtts,
    };

    if (starterCodeStr !== undefined) {
      patchForCreate.starter_code = starterCodeStr;
    }
    if (testCasesList !== undefined) {
      patchForCreate.test_cases = testCasesList;
    }

    const saved = await Repo.updateWithResources(draft.id, patchForCreate);
    if (!saved) {
      log.error(
        'updateDraftWithResources unexpectedly returned undefined for',
        draft.id,
      );
      return res.status(500).json({ error: 'internal_error' });
    }

    const bundle = await Repo.getInternalResourcesBundle(saved.id);
    const starter_code_out = bundle?.starter_code?.python ?? '';
    const test_cases_out = bundle?.test_cases ?? [];

    // respond
    return res
      .status(201)
      .location(`/admin/questions/${saved.id}`)
      .json({
        ...saved,
        starter_code: starter_code_out,
        test_cases: test_cases_out,
      });
  } catch (err) {
    log.error('AdminController.create failed:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * PATCH /admin/questions/:id
 *
 * Body may include any subset of:
 * - title
 * - body_md
 * - difficulty
 * - topics
 * - attachments              (full array; can include staging/* keys)
 * - starter_code
 * - test_cases               (full replace [] or omit to keep same)
 */
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param required' });

    // collect patch fields
    let newBodyMd: string | undefined;

    if (typeof req.body?.body_md === 'string') {
      newBodyMd = req.body.body_md;
    }

    let newDifficulty: Difficulty | undefined;
    if (req.body?.difficulty !== undefined) {
      const diff = normalizeDifficulty(req.body.difficulty);
      if (!diff) {
        return res.status(400).json({
          error: 'difficulty must be one of: Easy, Medium, Hard',
        });
      }
      newDifficulty = diff;
    }

    let newStatus: Status | undefined;
    if (req.body?.status !== undefined) {
      const stat = normalizeStatus(req.body.status);
      if (!stat) {
        return res.status(400).json({
          error: 'difficulty must be one of: draft, published, archived',
        });
      }
      newStatus = stat;
    }

    let newTopics: string[] | undefined;
    if (req.body?.topics !== undefined) {
      if (!isStringArray(req.body.topics)) {
        return res.status(400).json({ error: 'topics must be string[]' });
      }
      // pre-validate topics exist
      const missing = await findMissingTopics(req.body.topics);
      if (missing.length) {
        return res.status(400).json({
          error: 'topics_not_found',
          missing,
          hint: 'Create missing topics first via POST /admin/topics { display, color_hex }',
        });
      }
      newTopics = req.body.topics;
    }

    // attachments can contain staging URLs – finalize if provided
    let finalizedAtts: AttachmentInput[] | undefined;
    if (req.body?.attachments !== undefined) {
      if (!isAttachmentArray(req.body.attachments)) {
        return res.status(400).json({
          error:
            'attachments must be [{ object_key: string, mime: string, alt?: string }]',
        });
      }

      const incomingAtts = req.body.attachments;
      finalizedAtts = incomingAtts.length
        ? await finalizeStagedAttachments(id, incomingAtts)
        : [];

      // if caller ALSO sent body_md, rewrite it now -> final keys
      if (typeof req.body?.body_md === 'string') {
        newBodyMd = rewriteMarkdownAttachmentPointers(
          req.body.body_md,
          incomingAtts,
          finalizedAtts,
        );
      }
    }

    // execution resources
    const starterCodeStr =
      typeof req.body?.starter_code === 'string'
        ? req.body.starter_code
        : undefined;

    let newTestCases: IncomingTestCase[] | undefined;
    if ('test_cases' in req.body) {
      // If client explicitly sent test_cases (even []), we respect it.
      if (!isTestCaseArray(req.body.test_cases)) {
        return res.status(400).json({
          error:
            'test_cases must be [{ visibility: "sample"|"hidden", input_data: string, expected_output: string, ordinal?: number }]',
        });
      }
      newTestCases = req.body.test_cases;
    }

    // now apply patch in repo
    const patchForUpdate: {
      title?: string;
      body_md?: string;
      difficulty?: Difficulty;
      status?: Status;
      topics?: string[];
      attachments?: AttachmentInput[];
      starter_code?: string;
      test_cases?: IncomingTestCase[];
    } = {};

    if (typeof req.body?.title === 'string')
      patchForUpdate.title = req.body.title;
    if (newBodyMd !== undefined) patchForUpdate.body_md = newBodyMd;
    if (newDifficulty !== undefined) patchForUpdate.difficulty = newDifficulty;
    if (newStatus !== undefined) patchForUpdate.status = newStatus;
    if (newTopics !== undefined) patchForUpdate.topics = newTopics;
    if (finalizedAtts !== undefined) patchForUpdate.attachments = finalizedAtts;
    if (starterCodeStr !== undefined)
      patchForUpdate.starter_code = starterCodeStr;
    if (newTestCases !== undefined) patchForUpdate.test_cases = newTestCases;

    const updated = await Repo.updateWithResources(id, patchForUpdate);

    if (!updated) return res.status(404).json({ error: 'not_found' });

    const bundle = await Repo.getInternalResourcesBundle(id);
    const starter_code_out = bundle?.starter_code?.python ?? '';
    const test_cases_out = bundle?.test_cases ?? [];

    return res.json({
      ...updated,
      starter_code: starter_code_out,
      test_cases: test_cases_out,
    });
  } catch (err) {
    log.error('AdminController.update failed:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * POST /admin/questions/:id/publish
 * Publishes current draft → creates a version snapshot.
 */
export async function publish(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param required' });

    const published = await Repo.publish(id);
    if (!published) return res.status(404).json({ error: 'not_found' });

    // Include execution resources in publish response
    const bundle = await Repo.getInternalResourcesBundle(id);
    const starter_code = bundle?.starter_code?.python ?? '';
    const test_cases = bundle?.test_cases ?? [];

    return res.json({ ...published, starter_code, test_cases });
  } catch (err) {
    log.error('AdminController.publish failed:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /admin/questions
 */
export async function list(req: Request, res: Response) {
  const args: {
    difficulty?: Difficulty;
    topics?: string[];
    q?: string;
    page?: number;
    page_size?: number;
  } = {};

  const d = parseDifficulty(req.query['difficulty']);
  const t = parseTopics(req.query['topics']);
  const q = parseStr(req.query['q']);
  const p = parseNum(req.query['page']);
  const s = parseNum(req.query['page_size']);

  if (d !== undefined) args.difficulty = d;
  if (t !== undefined) args.topics = t;
  if (q !== undefined) args.q = q;
  if (p !== undefined) args.page = p;
  if (s !== undefined) args.page_size = s;

  const { rows, total } = await Repo.listAll(args);
  return res.json({
    items: rows,
    total,
    page: args.page ?? 1,
    page_size: args.page_size ?? 20,
  });
}

/**
 * DELETE /admin/questions/:id
 */
export async function archive(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '');
  if (!id) return res.status(400).json({ error: 'id param required' });

  const q = await Repo.archive(id);
  if (!q) return res.status(404).json({ error: 'not_found_or_not_published' });

  return res.json(q);
}

/**
 * GET /admin/questions/:id
 *
 * Admin should see:
 * - core question fields (even if draft)
 * - starter_code
 * - ALL test cases (sample + hidden)
 */
export async function getById(req: Request, res: Response) {
  try {
    const id = String(req.params['id'] ?? '');
    if (!id) return res.status(400).json({ error: 'id param required' });

    const core = await Repo.getQuestionById(id);
    if (!core) return res.status(404).json({ error: 'not found' });

    const bundle = await Repo.getInternalResourcesBundle(id);
    // bundle can technically be null if somehow question vanished between calls,
    // but since core exists, treat null bundle as empty resources.
    const starter_code = bundle?.starter_code?.python ?? '';
    const test_cases = bundle?.test_cases ?? [];

    return res.json({
      ...core,
      starter_code,
      test_cases,
    });
  } catch (err) {
    log.error('AdminController.getById failed:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
