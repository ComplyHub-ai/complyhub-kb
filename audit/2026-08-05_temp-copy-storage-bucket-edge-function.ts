// TEMPORARY, disposable tool for the storage consolidation project.
// Never entered git as a real function -- deployed directly via Supabase MCP,
// invoked via pg_net using the anon key for the platform JWT check, deleted
// once its bucket's copy is fully verified. Same precedent as every prior
// temp-copy-*-bucket function in this project (see document-repository-
// consolidation.md). Generic across buckets: caller supplies source/dest
// bucket + explicit path list (fetched via execute_sql against
// storage.objects, since that table isn't exposed through storage-js list()).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "copy") {
      const { sourceBucket, destBucket, paths } = body;
      const results = [];
      for (const path of paths as string[]) {
        try {
          const { data: file, error: dlErr } = await admin.storage.from(sourceBucket).download(path);
          if (dlErr || !file) {
            results.push({ path, ok: false, error: dlErr?.message ?? "download returned no data" });
            continue;
          }
          const arrayBuf = await file.arrayBuffer();
          const { error: upErr } = await admin.storage
            .from(destBucket)
            .upload(path, arrayBuf, { upsert: true, contentType: file.type || "application/octet-stream" });
          if (upErr) {
            results.push({ path, ok: false, error: upErr.message });
            continue;
          }
          results.push({ path, ok: true, size: arrayBuf.byteLength });
        } catch (e) {
          results.push({ path, ok: false, error: String(e) });
        }
      }
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "copy_rewrite") {
      const { sourceBucket, destBucket, mappings } = body;
      const results = [];
      for (const { src, dst } of mappings as { src: string; dst: string }[]) {
        try {
          const { data: file, error: dlErr } = await admin.storage.from(sourceBucket).download(src);
          if (dlErr || !file) {
            results.push({ src, dst, ok: false, error: dlErr?.message ?? "download returned no data" });
            continue;
          }
          const arrayBuf = await file.arrayBuffer();
          const { error: upErr } = await admin.storage
            .from(destBucket)
            .upload(dst, arrayBuf, { upsert: true, contentType: file.type || "application/octet-stream" });
          if (upErr) {
            results.push({ src, dst, ok: false, error: upErr.message });
            continue;
          }
          results.push({ src, dst, ok: true, size: arrayBuf.byteLength });
        } catch (e) {
          results.push({ src, dst, ok: false, error: String(e) });
        }
      }
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { bucket, paths } = body;
      const { error: delErr } = await admin.storage.from(bucket).remove(paths as string[]);
      if (delErr) {
        return new Response(JSON.stringify({ ok: false, error: delErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "hash") {
      const { bucket, path } = body;
      const { data: file, error } = await admin.storage.from(bucket).download(path);
      if (error || !file) {
        return new Response(JSON.stringify({ ok: false, error: error?.message ?? "not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const arrayBuf = await file.arrayBuffer();
      const hash = await sha256Hex(arrayBuf);
      return new Response(JSON.stringify({ ok: true, size: arrayBuf.byteLength, sha256: hash }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
