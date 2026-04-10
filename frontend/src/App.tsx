import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type RouteMode = "web" | "desktop";
type TabMode = "send" | "templates" | "history";

type WaTemplate = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type SessionHistory = {
  id: string;
  templateTitle: string;
  phone: string;
  message: string;
  link: string;
  createdAt: string;
};

const API_BASE =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:4010/api`;
const SESSION_HISTORY_KEY = "wa_send_history";

function parseVariables(text: string): string[] {
  const matches = text.match(/\{([^{}]+)\}/g) ?? [];
  const deduped = new Set(
    matches.map((segment) => segment.replace(/[{}]/g, "").trim()).filter(Boolean)
  );
  return Array.from(deduped);
}

function formatRupiah(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("rp")) return trimmed;

  const numeric = trimmed.replace(/[^\d]/g, "");
  if (!numeric) return trimmed;
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(numeric))}`;
}

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function hydrateTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (_, key: string) => {
    const normalized = key.trim();
    const value = values[normalized] ?? "";
    if (normalized.toLowerCase().includes("nominal")) return formatRupiah(value);
    return value;
  });
}

function generateLink(options: {
  mode: RouteMode;
  phone: string;
  template: string;
  values: Record<string, string>;
}) {
  const base =
    options.mode === "desktop" ? "whatsapp://send" : "https://web.whatsapp.com/send";
  const phone = normalizePhoneNumber(options.phone);
  const text = hydrateTemplate(options.template, options.values);
  return `${base}?phone=${phone}&text=${encodeURIComponent(text)}`;
}

export default function App() {
  const [tab, setTab] = useState<TabMode>("send");
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [routeMode, setRouteMode] = useState<RouteMode>("web");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sendHistory, setSendHistory] = useState<SessionHistory[]>([]);

  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((item) => String(item.id) === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const variableKeys = useMemo(
    () => parseVariables(selectedTemplate?.content ?? ""),
    [selectedTemplate]
  );

  const hydrated = useMemo(
    () => hydrateTemplate(selectedTemplate?.content ?? "", variables),
    [selectedTemplate, variables]
  );

  const generatedLink = useMemo(() => {
    if (!selectedTemplate || !phone.trim()) return "";
    return generateLink({
      mode: routeMode,
      phone,
      template: selectedTemplate.content,
      values: variables
    });
  }, [selectedTemplate, routeMode, phone, variables]);

  async function loadTemplates() {
    const response = await fetch(`${API_BASE}/templates`);
    const data = (await response.json()) as WaTemplate[];
    setTemplates(data);

    if (data.length === 0) {
      setSelectedTemplateId(undefined);
      return;
    }

    setSelectedTemplateId((prev) => {
      if (!prev || !data.some((item) => String(item.id) === prev)) {
        return String(data[0].id);
      }
      return prev;
    });
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    setVariables((prev) => {
      const next: Record<string, string> = {};
      for (const key of variableKeys) {
        next[key] = prev[key] ?? "";
      }
      return next;
    });
  }, [variableKeys]);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SessionHistory[];
      if (Array.isArray(parsed)) setSendHistory(parsed);
    } catch {
      setSendHistory([]);
    }
  }, []);

  function saveSessionHistory(next: SessionHistory[]) {
    setSendHistory(next);
    sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(next));
  }

  async function saveTemplate() {
    if (!titleInput.trim() || !contentInput.trim()) return;

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API_BASE}/templates/${editingId}`
      : `${API_BASE}/templates`;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.trim(), content: contentInput.trim() })
    });

    closeTemplateModal();
    await loadTemplates();
  }

  async function deleteTemplate(id: number) {
    await fetch(`${API_BASE}/templates/${id}`, { method: "DELETE" });
    await loadTemplates();
  }

  function editTemplate(template: WaTemplate) {
    setEditingId(template.id);
    setTitleInput(template.title);
    setContentInput(template.content);
    setIsTemplateModalOpen(true);
  }

  function openCreateTemplateModal() {
    setEditingId(null);
    setTitleInput("");
    setContentInput("");
    setIsTemplateModalOpen(true);
  }

  function closeTemplateModal() {
    setEditingId(null);
    setTitleInput("");
    setContentInput("");
    setIsTemplateModalOpen(false);
  }

  function openWhatsApp() {
    if (!generatedLink || !selectedTemplate) return;

    const historyItem: SessionHistory = {
      id: String(Date.now()),
      templateTitle: selectedTemplate.title,
      phone: normalizePhoneNumber(phone),
      message: hydrated,
      link: generatedLink,
      createdAt: new Date().toISOString()
    };

    saveSessionHistory([historyItem, ...sendHistory].slice(0, 100));
    window.open(generatedLink, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
          WhatsApp Template Manager
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Kirim pesan WhatsApp berbasis template dinamis
        </h1>
        <p className="text-sm text-zinc-400">
          Detect variabel seperti {"{nama}"} dan generate link WA Web/Desktop secara otomatis.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabMode)}>
        <TabsList className="w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="send">Kirim Pesan</TabsTrigger>
          <TabsTrigger value="templates">Pengaturan Template</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-zinc-700/70 bg-zinc-900/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Konfigurasi Pesan</CardTitle>
                <CardDescription>
                  Pilih template, isi nomor dan variabel untuk generate link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Pilih Template</label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                    open={templates.length === 0 ? false : isTemplateSelectOpen}
                    onOpenChange={(open) => {
                      if (templates.length > 0) setIsTemplateSelectOpen(open);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200">Nomor WhatsApp</label>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Contoh: 6281234567890"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-200">Dual Route Selector</p>
                    <p className="text-xs text-zinc-400">
                      {routeMode === "web"
                        ? "WA Web: https://web.whatsapp.com/send"
                        : "Desktop: whatsapp://send"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Web</span>
                    <Switch
                      checked={routeMode === "desktop"}
                      onCheckedChange={(checked) => setRouteMode(checked ? "desktop" : "web")}
                    />
                    <span className="text-xs text-zinc-400">Desktop</span>
                  </div>
                </div>

                {variableKeys.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-200">Variable Input</label>
                      <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                        {variableKeys.length} variabel
                      </div>
                    </div>
                    <div className="space-y-3">
                      {variableKeys.map((key) => (
                        <div key={key} className="space-y-1">
                          <label className="text-sm font-medium text-zinc-200">{`{${key}}`}</label>
                          <Input
                            value={variables[key] ?? ""}
                            onChange={(event) =>
                              setVariables((prev) => ({ ...prev, [key]: event.target.value }))
                            }
                            placeholder={`Masukkan nilai ${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  disabled={!generatedLink}
                  onClick={openWhatsApp}
                  className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  Buka Link WhatsApp
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-emerald-500/20 bg-white/5 backdrop-blur-xl">
              <CardHeader className="border-b border-white/10">
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  Tampilan chat otomatis update saat variabel berubah.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-3 bg-gradient-to-br from-emerald-900/10 via-zinc-900/70 to-zinc-950/80 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.25),transparent_40%)]" />
                <div className="relative ml-auto max-w-[90%] rounded-2xl rounded-br-sm border border-emerald-400/20 bg-zinc-900/70 px-4 py-3 shadow-lg shadow-emerald-900/20">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                    {hydrated || "Pilih template untuk melihat preview pesan."}
                  </p>
                  <p className="mt-2 text-right text-[11px] text-zinc-400">now</p>
                </div>
                <div className="relative rounded-lg border border-zinc-700/60 bg-black/30 p-3">
                  <p className="text-xs text-zinc-400">Generated Link</p>
                  <p className="mt-1 break-all text-xs text-emerald-300">{generatedLink || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="border-zinc-700/70 bg-zinc-900/60">
            <div className="flex flex-row items-center justify-between space-y-0 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-none tracking-tight">Pengaturan Template</h3>
                <p className="text-sm text-zinc-400">Kelola template lalu edit detailnya lewat modal.</p>
              </div>
              <Button onClick={openCreateTemplateModal}>Tambah Template</Button>
            </div>
            <CardContent>
              <div className="grid gap-3">
                {templates.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-semibold">{item.title}</p>
                        <p className="whitespace-pre-wrap text-sm text-zinc-300">{item.content}</p>
                        <div className="flex flex-wrap gap-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => editTemplate(item)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-400"
                          onClick={() => void deleteTemplate(item.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-sm text-zinc-400">Belum ada template.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-zinc-700/70 bg-zinc-900/60">
            <div className="flex flex-row items-start justify-between space-y-1.5 p-6">
              <div className="space-y-2">
                <h3 className="font-semibold leading-none tracking-tight">Riwayat Kirim (Session)</h3>
                <p className="text-sm text-zinc-400">
                  Disimpan di browser session, hilang saat session berakhir.
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={sendHistory.length === 0}
                onClick={() => saveSessionHistory([])}
              >
                Hapus History
              </Button>
            </div>
            <CardContent>
              {sendHistory.length === 0 && (
                <p className="text-sm text-zinc-400">
                  Belum ada riwayat pengiriman di session ini.
                </p>
              )}
              <div className="grid gap-3">
                {sendHistory.map((item) => (
                  <div key={item.id} className="rounded-md border border-zinc-700 bg-zinc-950 p-3">
                    <p className="text-sm font-semibold">{item.templateTitle}</p>
                    <p className="text-xs text-zinc-400">{item.phone}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{item.message}</p>
                    <p className="mt-1 break-all text-xs text-emerald-300">{item.link}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Tambah Template Baru"}</DialogTitle>
            <DialogDescription>
              Gunakan placeholder dalam kurung kurawal seperti {"{nama}"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Judul</label>
              <Input
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                placeholder="Contoh: Tagihan Bulanan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Isi Template</label>
              <Textarea
                value={contentInput}
                onChange={(event) => setContentInput(event.target.value)}
                rows={6}
                className="min-h-[100px]"
                placeholder="Halo {nama}, pembayaran kavling {kavling} sebesar {nominal} jatuh tempo {tanggal}."
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeTemplateModal}>
              Batal
            </Button>
            <Button onClick={() => void saveTemplate()}>
              {editingId ? "Update" : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
