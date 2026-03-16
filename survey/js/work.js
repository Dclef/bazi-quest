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

function sanitizeRecord(row) {
  return {
    id: row.submit_id,
    submitId: row.submit_id,
    baziKey: row.bazi_key,
    questionIds: JSON.parse(row.question_ids_json || "[]"),
    bazi: JSON.parse(row.bazi_json || "{}"),
    answers: JSON.parse(row.answers_json || "{}"),
    dimScores: JSON.parse(row.dim_scores_json || "{}"),
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
