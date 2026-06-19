import type { Express } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { fireWebhook, makeProfileUrl } from "./webhookService";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const pendingUploads = new Map<string, { storagePath: string; contentType: string; ext: string }>();

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string || (req.secure ? "https" : "http")).split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] as string || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

export function getStorageMode(): "local" { return "local"; }

export async function initStorage(): Promise<void> {
  console.log("[upload] Using local file storage.");
}

export function registerUploadRoutes(app: Express): void {
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      const { name, contentType } = req.body;
      const uuid = randomUUID();
      const rawExt = (name || "file").split(".").pop() || "bin";
      const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "bin";
      const storagePath = `public/${uuid}.${safeExt}`;

      pendingUploads.set(uuid, { storagePath, contentType: contentType || "application/octet-stream", ext: safeExt });

      const base = getBaseUrl(req);
      const uploadURL = `${base}/api/uploads/file/${uuid}`;
      const publicUrl = `/objects/uploads/${uuid}.${safeExt}`;
      const objectPath = `/objects/uploads/${uuid}.${safeExt}`;

      const user = req.user as any;
      pool.query(
        `INSERT INTO uploads (user_id, username, file_name, content_type, object_path, public_url) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user?.id || null, user?.username || null, name || "file", contentType || "application/octet-stream", objectPath, publicUrl]
      ).catch((err) => {
        console.error("[upload] Failed to insert upload record:", err?.message || err);
      });

      res.json({ uploadURL, objectPath, publicUrl, metadata: { name, contentType: contentType || "application/octet-stream" } });
    } catch (err) {
      console.error("[upload] Error generating upload URL:", err);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/uploads/file/:uuid", (req, res) => {
    const { uuid } = req.params;
    const pending = pendingUploads.get(uuid);
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = pending?.contentType || (req.headers["content-type"] as string) || "application/octet-stream";
        const ext = pending?.ext || "bin";
        const localFileName = `${uuid}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, localFileName);

        fs.writeFileSync(filePath, buffer);
        fs.writeFileSync(path.join(UPLOADS_DIR, `${localFileName}.meta.json`), JSON.stringify({ contentType }));

        console.log(`[upload] Saved ${filePath} (${buffer.length} bytes)`);
        pendingUploads.delete(uuid);

        if ((req as any).user) {
          const u = (req as any).user as any;
          fireWebhook("uploads", {
            title: "📁 File Uploaded",
            description: `**[${u.username}](${makeProfileUrl(u.username)})** uploaded a file.`,
            fields: [
              { name: "File", value: localFileName, inline: true },
              { name: "Type", value: contentType, inline: true },
            ],
          }).catch(() => {});
        }
        res.status(200).send("OK");
      } catch (err: any) {
        console.error("[upload] Upload exception:", err?.message || err);
        res.status(500).json({ error: "Upload failed" });
      }
    });
    req.on("error", (err) => {
      console.error("[upload] Upload stream error:", err?.message);
      res.status(500).json({ error: "Upload stream error" });
    });
  });

  app.get("/objects/uploads/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const metaPath = path.join(UPLOADS_DIR, `${filename}.meta.json`);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        if (meta?.contentType) res.setHeader("Content-Type", meta.contentType);
      } catch (_) {}
      res.setHeader("Cache-Control", "public, max-age=31536000");
      return res.sendFile(filePath);
    }
    res.status(404).json({ error: "File not found" });
  });
}
