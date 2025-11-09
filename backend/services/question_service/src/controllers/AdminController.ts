// src/controllers/AdminController.ts
import type { Request, Response } from 'express';
import * as Repo from '../repositories/QuestionRepository.js';
import { slugify } from '../utils/slug.js';
import { finalizeStagedAttachments } from '../services/AttachmentService.js';
import type { AttachmentInput } from '../types/attachments.js';
import { log } from '../utils/logger.js';
import { prisma } from '../repositories/prisma.js'; 
import * as Service from '../services/QuestionService.js';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Status = 'draft' | 'published' | 'archived';

type IncomingTestCase = {
  visibility: 'sample' | 'hidden';
  input_data: string;
  expected_output: string;
  ordinal?: number;
};

// Payloads
type UpdatePatch = {
  title?: string;
  body_md?: string;
  difficulty?: Difficulty;
  status?: Status;
  topics?: string[];
  attachments?: AttachmentInput[];
  starter_code?: string;
  test_cases?: IncomingTestCase[];
};

type ListArgs = {
  difficulty?: Difficulty;
  topics?: string[];
  q?: string;
  page?: number;
  page_size?: number;
};

// ───────────────────────────────────────────────────────────────────────────────
// helpers
function normalizeDifficulty(d: unknown): Difficulty | null {
  if (typeof d !== 'string') return null;
  const v = d.trim().toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'medium') return 'Medium';
  if (v === 'hard') return 'Hard';
  return null;
}

function normalizeStatus(s: unknown): Status | null {
  if (typeof s !== 'string') return null;
  const v = s.trim().toLowerCase();
  if (v === 'draft' || v === 'published' || v === 'archived')
    return v as Status;
  return null;
}

function parseTopics(x: unknown): string[] | undefined {
  // Accept string: "a,b" or "" → undefined (tests expect empty string to be ignored)
  if (typeof x === 'string') {
    const arr = x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  // Accept array: filter empty tokens, if result empty -> undefined
  if (Array.isArray(x)) {
    const arr = (x as unknown[])
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type UnknownAttachment = {
  object_key?: unknown;
  filename?: unknown;
  mime?: unknown;
  alt?: unknown;
};

function isAttachmentInput(u: unknown): u is AttachmentInput {
  if (!isRecord(u)) return false;
  const a = u as UnknownAttachment;
  return (
    typeof a.object_key === 'string' &&
    typeof a.filename === 'string' &&
    typeof a.mime === 'string' &&
    (a.alt === undefined || typeof a.alt === 'string')
  );
}

function isValidAttachmentArray(x: unknown): x is AttachmentInput[] {
  return Array.isArray(x) && x.every(isAttachmentInput);
}

type UnknownTestCase = {
  visibility?: unknown;
  input_data?: unknown;
  expected_output?: unknown;
  ordinal?: unknown;
};

function isIncomingTestCase(u: unknown): u is IncomingTestCase {
  if (!isRecord(u)) return false;
  const t = u as UnknownTestCase;
  const visOk = t.visibility === 'sample' || t.visibility === 'hidden';
  const inputOk = typeof t.input_data === 'string';
  const outOk = typeof t.expected_output === 'string';
  const ordOk = t.ordinal === undefined || typeof t.ordinal === 'number';
  return visOk && inputOk && outOk && ordOk;
}

function isValidTestCaseArray(x: unknown): x is IncomingTestCase[] {
  return Array.isArray(x) && x.every(isIncomingTestCase);
}

function rewriteMarkdownStagingLinks(md: string, questionId: string) {
  // Replace pp://staging/<whatever> with pp://questions/<id>/<filename>
  return md.replace(
    /pp:\/\/staging\/([A-Za-z0-9_\-./]+)/g,
    (_m, key) => `pp://questions/${questionId}/${key.split('/').pop()}`,
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// controller
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

    // title
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    // body_md
    if (typeof body_md !== 'string' || body_md.trim() === '') {
      return res.status(400).json({ error: 'body_md is required' });
    }

    // difficulty
    const d = normalizeDifficulty(difficulty);
    if (!d) {
      return res
        .status(400)
        .json({ error: 'difficulty must be: Easy, Medium, Hard' });
    }

    // topics validation against DB
    const topicSlugs: string[] | undefined = Array.isArray(topics)
      ? (topics as string[])
      : typeof topics === 'string'
        ? topics
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (topicSlugs?.length) {
      const existing = await prisma.topics.findMany({
        select: { slug: true },
        where: { slug: { in: topicSlugs } },
      });
      const existingSet = new Set(existing.map((t) => t.slug));
      const missing = topicSlugs.filter((t) => !existingSet.has(t));
      if (missing.length) {
        return res.status(400).json({
          error: 'topics_not_found',
          missing,
          message: `Some topics do not exist: ${missing.join(', ')}`,
        });
      }
    }

    // attachments validation (block createDraft if invalid)
    if (attachments !== undefined && !isValidAttachmentArray(attachments)) {
      return res.status(400).json({
        error:
          'attachments must be an array of { object_key, filename, mime, [alt] }',
      });
    }

    // test_cases validation (block createDraft if invalid)
    if (test_cases !== undefined && !isValidTestCaseArray(test_cases)) {
      return res.status(400).json({
        error:
          'test_cases must be an array of { visibility, input_data, expected_output, [ordinal] }',
      });
    }

    // slug
    const id = slugify(title);
    if (!id) {
      return res
        .status(400)
        .json({ error: 'invalid title (cannot derive a slug)' });
    }

    // 1) create draft (basic fields first)
    await Repo.createDraft({
      id,
      title: title.trim(),
      body_md,
      difficulty: d,
      topics: topicSlugs ?? [],
      attachments: [],
    });

    let nextBodyMd = body_md;
    let nextAttachments: AttachmentInput[] | undefined = attachments;

    // 2) finalize attachments if provided
    if (Array.isArray(nextAttachments) && nextAttachments.length) {
      const finalized = await finalizeStagedAttachments(id, nextAttachments);
      nextAttachments = finalized;
      nextBodyMd = rewriteMarkdownStagingLinks(nextBodyMd, id);
    }

    // 3) update with resources & finalized attachments (respect exactOptionalPropertyTypes)
    const updatePayload: UpdatePatch = {
      body_md: nextBodyMd,
      ...(Array.isArray(nextAttachments)
        ? { attachments: nextAttachments }
        : {}),
      ...(typeof starter_code === 'string' ? { starter_code } : {}),
      ...(Array.isArray(test_cases) ? { test_cases } : {}),
    };

    const updated = await Repo.updateWithResources(id, updatePayload);

    if (!updated) {
      log.error('updateWithResources returned null for id=%s', id);
      return res.status(500).json({ error: 'internal_error' });
    }

    const bundle = await Repo.getInternalResourcesBundle(id);
    return res
      .status(201)
      .location(`/admin/questions/${id}`)
      .json({
        ...updated,
        starter_code: bundle?.starter_code ?? {},
        test_cases: bundle?.test_cases ?? [],
      });
  } catch (err: unknown) {
    log.error('AdminController.create error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params ?? {};
    if (!id || id.trim() === '') {
      return res.status(400).json({ error: 'id param required' });
    }

    const {
      title,
      body_md,
      difficulty,
      status,
      topics,
      attachments,
      starter_code,
      test_cases,
    } = req.body ?? {};

    const patch: UpdatePatch = {};

    if (typeof title === 'string') patch.title = title;

    if (difficulty !== undefined) {
      const d = normalizeDifficulty(difficulty);
      if (!d) {
        return res.status(400).json({
          error: 'difficulty must be one of: Easy, Medium, Hard',
        });
      }
      patch.difficulty = d;
    }

    if (status !== undefined) {
      const s = normalizeStatus(status);
      if (!s) {
        return res.status(400).json({
          error: 'difficulty must be one of: draft, published, archived',
        });
      }
      patch.status = s;
    }

    if (topics !== undefined) {
      // must be an array of strings
      if (
        !Array.isArray(topics) ||
        !topics.every((t) => typeof t === 'string' && t.trim() !== '')
      ) {
        return res.status(400).json({ error: 'topics must be string[]' });
      }

      // normalize & dedupe
      const arr = Array.from(
        new Set(topics.map((s) => s.trim()).filter(Boolean)),
      );

      if (arr.length) {
        const existing = await prisma.topics.findMany({
          select: { slug: true },
          where: { slug: { in: arr } },
        });
        const existingSet = new Set(existing.map((t) => t.slug));
        const missing = arr.filter((t) => !existingSet.has(t));
        if (missing.length) {
          return res.status(400).json({
            error: 'topics_not_found',
            missing,
            hint: `Create missing topics first: ${missing.join(', ')}`,
          });
        }
        patch.topics = arr;
      } else {
        // empty array provided -> treat as clearing topics
        patch.topics = [];
      }
    }

    if (attachments !== undefined) {
      if (!isValidAttachmentArray(attachments)) {
        return res.status(400).json({
          error:
            'attachments must be an array of { object_key, filename, mime, [alt] }',
        });
      }
    }

    if (test_cases !== undefined) {
      if (!isValidTestCaseArray(test_cases)) {
        return res.status(400).json({
          error:
            'test_cases must be an array of { visibility, input_data, expected_output, [ordinal] }',
        });
      }
      patch.test_cases = test_cases;
    }

    // body_md + attachments finalization/rewriting (if provided)
    let nextBodyMd = typeof body_md === 'string' ? body_md : undefined;
    let nextAttachments: AttachmentInput[] | undefined = attachments;

    if (Array.isArray(nextAttachments) && nextAttachments.length) {
      const finalized = await finalizeStagedAttachments(id, nextAttachments);
      nextAttachments = finalized;
      if (typeof nextBodyMd === 'string') {
        nextBodyMd = rewriteMarkdownStagingLinks(nextBodyMd, id);
      }
    }

    if (nextBodyMd !== undefined) patch.body_md = nextBodyMd;
    if (nextAttachments !== undefined) patch.attachments = nextAttachments;
    if (starter_code !== undefined) patch.starter_code = starter_code;

    const updated = await Repo.updateWithResources(id, patch);
    if (!updated) {
      return res.status(404).json({ error: 'not_found' });
    }

    const bundle = await Repo.getInternalResourcesBundle(id);
    return res.json({
      ...updated,
      starter_code: bundle?.starter_code ?? {},
      test_cases: bundle?.test_cases ?? [],
    });
  } catch (err: unknown) {
    log.error('AdminController.update error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function publish(req: Request, res: Response) {
  try {
    const { id } = req.params ?? {};
    if (!id || id.trim() === '') {
      return res.status(400).json({ error: 'id param required' });
    }

    const q = await Repo.publish(id);
    if (!q) return res.status(404).json({ error: 'not_found' });

    const bundle = await Repo.getInternalResourcesBundle(id);
    return res.json({
      ...q,
      starter_code: bundle?.starter_code ?? {},
      test_cases: bundle?.test_cases ?? [],
    });
  } catch (err: unknown) {
    log.error('AdminController.publish error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function archive(req: Request, res: Response) {
  try {
    const { id } = req.params ?? {};
    if (!id || id.trim() === '') {
      return res.status(400).json({ error: 'id param required' });
    }
    const out = await Repo.archive(id);
    if (!out) {
      return res.status(404).json({ error: 'not_found_or_not_published' });
    }
    return res.json(out);
  } catch (err: unknown) {
    log.error('AdminController.archive error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function getById(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '');

  if (!id) {
    log.warn('[GET /questions/:id] missing id param', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.sub ?? req.user?.userId,
    });
    return res.status(400).json({ error: 'id param required' });
  }

  try {
    log.info('[GET /questions/:id] request', {
      id,
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.sub ?? req.user?.userId,
    });

    const view = await Service.getPublishedWithHtml(id);
    if (!view) {
      log.warn('[GET /questions/:id] not found', {
        id,
        ip: req.ip,
        userRole: req.user?.role,
        userId: req.user?.sub ?? req.user?.userId,
      });
      return res.status(404).json({ error: 'not found' });
    }
  try {
    const { id } = req.params ?? {};
    if (!id || id.trim() === '') {
      return res.status(400).json({ error: 'id param required' });
    }
    const q = await Repo.getQuestionById(id);
    if (!q) return res.status(404).json({ error: 'not found' });

    const bundle = await Repo.getInternalResourcesBundle(id);
    const starter_code = bundle?.starter_code ?? {};
    const test_cases = bundle?.test_cases ?? [];

    log.info('[GET /questions/:id] success', {
      id: view.id,
      difficulty: view.difficulty,
      topics_count: Array.isArray(view.topics) ? view.topics.length : 0,
      attachments_count: Array.isArray(view.attachments)
        ? view.attachments.length
        : 0,
      sample_testcases: test_cases.length,
      starter_code_langs: Object.keys(starter_code),
    });

    // Merge base question view with runtime resources
    return res.json({
      ...q,
      starter_code: bundle?.starter_code ?? '',
      test_cases: bundle?.test_cases ?? [],
    });
  } catch (err: unknown) {
    log.error('AdminController.getById error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const { difficulty, topics, q, page, page_size } = req.query ?? {};

    const args: ListArgs = {};

    const d = normalizeDifficulty(difficulty);
    if (d) args.difficulty = d;

    const t = parseTopics(topics);
    if (t !== undefined) args.topics = t;

    if (typeof q === 'string' && q.trim() !== '') args.q = q;

    const pNum = typeof page === 'string' ? parseInt(page, 10) : NaN;
    if (!Number.isNaN(pNum) && pNum > 0) args.page = pNum;

    const sNum = typeof page_size === 'string' ? parseInt(page_size, 10) : NaN;
    if (!Number.isNaN(sNum) && sNum > 0) args.page_size = sNum;

    const out = await Repo.listAll(args);
    return res.json({
      ...view,
      starter_code,
      test_cases,
      items: out.rows,
      total: out.total,
      page: args.page ?? 1,
      page_size: args.page_size ?? 20,
    });
  } catch (err: unknown) {
    log.error('AdminController.list error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
