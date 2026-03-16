function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function normalizePath(pathname) {
  if (pathname.startsWith("/api/")) return pathname.slice(4);
  if (pathname === "/api") return "/";
  return pathname;
}

function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parsePositiveInt(value, fallback, options = {}) {
  const { min = 1, max = 100 } = options;
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

function parseJsonObject(text) {
  try {
    const parsed = JSON.parse(text || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(text) {
  try {
    const parsed = JSON.parse(text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createEmptyDistribution() {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
}

function ensureQuestionDistribution(questionStats, questionId) {
  if (!questionStats[questionId]) {
    questionStats[questionId] = createEmptyDistribution();
  }
  return questionStats[questionId];
}

function addAnswersToQuestionStats(questionStats, answers) {
  Object.entries(answers || {}).forEach(([questionId, rawValue]) => {
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return;
    }
    const distribution = ensureQuestionDistribution(questionStats, questionId);
    distribution[value] += 1;
    distribution.total += 1;
  });
}

function addDimScores(dimTotals, dimCounts, dimScores) {
  Object.entries(dimScores || {}).forEach(([dimKey, rawValue]) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return;
    }
    dimTotals[dimKey] = (dimTotals[dimKey] || 0) + value;
    dimCounts[dimKey] = (dimCounts[dimKey] || 0) + 1;
  });
}

function createMetricsAccumulator() {
  return {
    questionStats: {},
    dimTotals: {},
    dimCounts: {}
  };
}

function appendMetricsRow(accumulator, row) {
  addAnswersToQuestionStats(
    accumulator.questionStats,
    parseJsonObject(row.answers_json)
  );
  addDimScores(
    accumulator.dimTotals,
    accumulator.dimCounts,
    parseJsonObject(row.dim_scores_json)
  );
}

function calcOverallHit(questionStats) {
  let totalRate = 0;
  let counted = 0;

  Object.values(questionStats || {}).forEach(dist => {
    const total = Number(dist.total) || 0;
    if (total <= 0) {
      return;
    }
    const hitCount = (Number(dist[4]) || 0) + (Number(dist[5]) || 0);
    totalRate += Math.round((hitCount / total) * 100);
    counted += 1;
  });

  return counted > 0 ? Math.round(totalRate / counted) : 0;
}

function finalizeMetrics(accumulator) {
  const dimAverages = {};
  Object.keys(accumulator.dimTotals).forEach(dimKey => {
    const count = accumulator.dimCounts[dimKey] || 0;
    dimAverages[dimKey] = count > 0
      ? Math.round(accumulator.dimTotals[dimKey] / count)
      : 0;
  });

  return {
    questionStats: accumulator.questionStats,
    dimAverages,
    overallHit: calcOverallHit(accumulator.questionStats)
  };
}

function buildMetricsFromRows(rows) {
  const accumulator = createMetricsAccumulator();
  (rows || []).forEach(row => {
    appendMetricsRow(accumulator, row);
  });
  return finalizeMetrics(accumulator);
}

function buildMetricsByBaziKey(rows) {
  const groups = {};

  (rows || []).forEach(row => {
    const baziKey = String(row.bazi_key || "").trim();
    if (!baziKey) {
      return;
    }
    if (!groups[baziKey]) {
      groups[baziKey] = createMetricsAccumulator();
    }
    appendMetricsRow(groups[baziKey], row);
  });

  return Object.fromEntries(
    Object.entries(groups).map(([baziKey, accumulator]) => {
      return [baziKey, finalizeMetrics(accumulator)];
    })
  );
}

function createInClause(length) {
  return new Array(length).fill("?").join(", ");
}

function getFirstRow(result) {
  return (result.results || [])[0] || {};
}

function sanitizeRecord(row) {
  return {
    id: row.submit_id,
    submitId: row.submit_id,
    baziKey: row.bazi_key,
    questionIds: parseJsonArray(row.question_ids_json),
    bazi: parseJsonObject(row.bazi_json),
    answers: parseJsonObject(row.answers_json),
    dimScores: parseJsonObject(row.dim_scores_json),
    timestamp: row.sort_timestamp || 0
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (request.method === "OPTIONS") {
      return json({ success: true }, { status: 204 });
    }

    try {
      if (request.method === "GET" && pathname === "/health") {
        return json({
          success: true,
          data: {
            ok: true,
            now: Date.now()
          }
        });
      }

      if (request.method === "GET" && pathname === "/stats/summary") {
        const [countResult, rowsResult] = await Promise.all([
          env.DB.prepare(`
            SELECT
              COUNT(*) AS total_count,
              COUNT(DISTINCT bazi_key) AS bazi_group_count
            FROM submissions
          `).all(),
          env.DB.prepare(`
            SELECT answers_json, dim_scores_json
            FROM submissions
          `).all()
        ]);

        const countRow = getFirstRow(countResult);
        const metrics = buildMetricsFromRows(rowsResult.results || []);

        return json({
          success: true,
          data: {
            totalCount: Number(countRow.total_count) || 0,
            baziGroupCount: Number(countRow.bazi_group_count) || 0,
            questionStats: metrics.questionStats,
            dimAverages: metrics.dimAverages,
            overallHit: metrics.overallHit,
            updatedAt: Date.now()
          }
        });
      }

      if (request.method === "GET" && pathname === "/stats/groups") {
        const requestedPage = parsePositiveInt(url.searchParams.get("page"), 1, { max: 1000000 });
        const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 12, { max: 50 });
        const totalResult = await env.DB.prepare(`
          SELECT COUNT(DISTINCT bazi_key) AS total_count
          FROM submissions
        `).all();

        const totalCount = Number(getFirstRow(totalResult).total_count) || 0;
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
        const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
        const offset = (page - 1) * pageSize;

        const groupsResult = await env.DB.prepare(`
          SELECT
            bazi_key,
            COUNT(*) AS record_count,
            MAX(sort_timestamp) AS latest_sort_timestamp
          FROM submissions
          GROUP BY bazi_key
          ORDER BY record_count DESC, latest_sort_timestamp DESC
          LIMIT ? OFFSET ?
        `).bind(pageSize, offset).all();

        const groupRows = groupsResult.results || [];

        if (groupRows.length === 0) {
          return json({
            success: true,
            data: {
              page,
              pageSize,
              totalCount,
              totalPages,
              groups: [],
              updatedAt: Date.now()
            }
          });
        }

        const baziKeys = groupRows.map(row => row.bazi_key);
        const detailResult = await env.DB.prepare(`
          SELECT bazi_key, answers_json, dim_scores_json
          FROM submissions
          WHERE bazi_key IN (${createInClause(baziKeys.length)})
        `).bind(...baziKeys).all();

        const metricsByBaziKey = buildMetricsByBaziKey(detailResult.results || []);
        const groups = groupRows.map(row => {
          const baziKey = row.bazi_key;
          const metrics = metricsByBaziKey[baziKey] || {
            overallHit: 0
          };

          return {
            baziKey,
            count: Number(row.record_count) || 0,
            avgMatchRate: metrics.overallHit
          };
        });

        return json({
          success: true,
          data: {
            page,
            pageSize,
            totalCount,
            totalPages,
            groups,
            updatedAt: Date.now()
          }
        });
      }

      if (request.method === "GET" && pathname === "/stats/group-detail") {
        const key = (url.searchParams.get("key") || "").trim();
        if (!key) {
          return json({ success: false, message: "缺少 key" }, { status: 400 });
        }

        const result = await env.DB.prepare(`
          SELECT answers_json, dim_scores_json
          FROM submissions
          WHERE bazi_key = ?
          ORDER BY sort_timestamp DESC
        `).bind(key).all();

        const rows = result.results || [];
        const metrics = buildMetricsFromRows(rows);

        return json({
          success: true,
          data: {
            baziKey: key,
            totalCount: rows.length,
            avgMatchRate: metrics.overallHit,
            questionStats: metrics.questionStats,
            dimAverages: metrics.dimAverages,
            updatedAt: Date.now()
          }
        });
      }

      if (request.method === "GET" && pathname === "/stats") {
        const result = await env.DB.prepare(`
          SELECT submit_id, bazi_key, question_ids_json, bazi_json, answers_json, dim_scores_json, sort_timestamp
          FROM submissions
          ORDER BY sort_timestamp DESC
        `).all();

        const records = (result.results || []).map(sanitizeRecord);

        return json({
          success: true,
          data: {
            totalCount: records.length,
            records,
            updatedAt: Date.now()
          }
        });
      }

      if (request.method === "GET" && pathname === "/bazi") {
        const key = (url.searchParams.get("key") || "").trim();
        if (!key) {
          return json({ success: false, message: "缺少 key" }, { status: 400 });
        }

        const pageParam = url.searchParams.get("page");
        const pageSizeParam = url.searchParams.get("pageSize");
        const shouldPaginate = pageParam !== null || pageSizeParam !== null;

        if (!shouldPaginate) {
          const result = await env.DB.prepare(`
            SELECT submit_id, bazi_key, question_ids_json, bazi_json, answers_json, dim_scores_json, sort_timestamp
            FROM submissions
            WHERE bazi_key = ?
            ORDER BY sort_timestamp DESC
          `).bind(key).all();

          const records = (result.results || []).map(sanitizeRecord);

          return json({
            success: true,
            data: {
              baziKey: key,
              totalCount: records.length,
              records
            }
          });
        }

        const requestedPage = parsePositiveInt(pageParam, 1, { max: 1000000 });
        const pageSize = parsePositiveInt(pageSizeParam, 50, { max: 100 });
        const countResult = await env.DB.prepare(`
          SELECT COUNT(*) AS total_count
          FROM submissions
          WHERE bazi_key = ?
        `).bind(key).all();

        const totalCount = Number(getFirstRow(countResult).total_count) || 0;
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
        const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
        const offset = (page - 1) * pageSize;

        const result = await env.DB.prepare(`
          SELECT submit_id, bazi_key, question_ids_json, bazi_json, answers_json, dim_scores_json, sort_timestamp
          FROM submissions
          WHERE bazi_key = ?
          ORDER BY sort_timestamp DESC
          LIMIT ? OFFSET ?
        `).bind(key, pageSize, offset).all();

        const records = (result.results || []).map(sanitizeRecord);

        return json({
          success: true,
          data: {
            baziKey: key,
            totalCount,
            page,
            pageSize,
            totalPages,
            records
          }
        });
      }

      if (request.method === "POST" && pathname === "/submit") {
        const body = await request.json();
        const now = Date.now();
        const submitId = String(
          body.submitId || `sub_${now}_${Math.random().toString(36).slice(2, 10)}`
        ).trim();
        const baziKey = String(body.baziKey || "").trim();
        const questionIds = Array.isArray(body.questionIds) ? body.questionIds : Object.keys(body.answers || {});
        const bazi = body.bazi && typeof body.bazi === "object" ? body.bazi : {};
        const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
        const dimScores = body.dimScores && typeof body.dimScores === "object" ? body.dimScores : {};
        const timestamp = parseTimestamp(body.timestamp) || now;

        if (!baziKey) {
          return json({ success: false, message: "缺少 baziKey" }, { status: 400 });
        }

        if (questionIds.length === 0) {
          return json({ success: false, message: "缺少 questionIds" }, { status: 400 });
        }

        if (Object.keys(answers).length === 0) {
          return json({ success: false, message: "缺少 answers" }, { status: 400 });
        }

        await env.DB.prepare(`
          INSERT INTO submissions (
            id, submit_id, bazi_key, question_ids_json, bazi_json, answers_json, dim_scores_json,
            sort_timestamp, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(submit_id) DO UPDATE SET
            bazi_key = excluded.bazi_key,
            question_ids_json = excluded.question_ids_json,
            bazi_json = excluded.bazi_json,
            answers_json = excluded.answers_json,
            dim_scores_json = excluded.dim_scores_json,
            sort_timestamp = excluded.sort_timestamp,
            updated_at = excluded.updated_at
        `).bind(
          submitId,
          submitId,
          baziKey,
          JSON.stringify(questionIds),
          JSON.stringify(bazi),
          JSON.stringify(answers),
          JSON.stringify(dimScores),
          timestamp,
          now,
          now
        ).run();

        return json({
          success: true,
          data: {
            submitId,
            baziKey,
            storedAt: now
          }
        });
      }

      return json({ success: false, message: "接口不存在" }, { status: 404 });
    } catch (error) {
      return json(
        {
          success: false,
          message: error instanceof Error ? error.message : "服务器内部错误"
        },
        { status: 500 }
      );
    }
  }
};
