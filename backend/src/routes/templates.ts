import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const templatesRouter = Router();

templatesRouter.get("/", async (_req, res) => {
  const templates = await prisma.waTemplate.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(templates);
});

templatesRouter.post("/", async (req, res) => {
  const body = req.body as { title?: string; content?: string };
  if (!body.title?.trim() || !body.content?.trim()) {
    return res.status(400).json({ error: "Title dan content wajib diisi." });
  }

  const title = body.title.trim();
  const content = body.content.trim();

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const template = await tx.waTemplate.create({ data: { title, content } });
    await tx.waTemplateHistory.create({
      data: {
        templateId: template.id,
        action: "created",
        title: template.title,
        content: template.content
      }
    });
    return template;
  });

  return res.status(201).json(created);
});

templatesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID tidak valid." });
  }

  const body = req.body as { title?: string; content?: string };
  if (!body.title?.trim() || !body.content?.trim()) {
    return res.status(400).json({ error: "Title dan content wajib diisi." });
  }

  const title = body.title.trim();
  const content = body.content.trim();

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const template = await tx.waTemplate.update({
        where: { id },
        data: { title, content }
      });
      await tx.waTemplateHistory.create({
        data: {
          templateId: template.id,
          action: "updated",
          title: template.title,
          content: template.content
        }
      });
      return template;
    });
    return res.json(updated);
  } catch {
    return res.status(404).json({ error: "Template tidak ditemukan." });
  }
});

templatesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID tidak valid." });
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.waTemplate.findUnique({ where: { id } });
      if (!existing) throw new Error("NOT_FOUND");

      await tx.waTemplateHistory.create({
        data: {
          templateId: existing.id,
          action: "deleted",
          title: existing.title,
          content: existing.content
        }
      });

      await tx.waTemplate.delete({ where: { id } });
    });
    return res.json({ success: true });
  } catch {
    return res.status(404).json({ error: "Template tidak ditemukan." });
  }
});

templatesRouter.get("/history", async (_req, res) => {
  const history = await prisma.waTemplateHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json(history);
});
