import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { encerraDemanda } from "./encerramento";

const { atividade, auditoria } = vi.hoisted(() => ({
  atividade: vi.fn().mockResolvedValue({ ok: true }),
  auditoria: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/audit", () => ({ audit: auditoria }));
vi.mock("@/lib/leads/activity-emitter", () => ({ emitLeadActivity: atividade }));
vi.mock("@/lib/leads/activity-write-failure", () => ({ registraFalhaDeAtividade: vi.fn() }));

describe("encerramento com Outro motivo", () => {
  it("grava other na coluna validada e mantém a explicação na timeline e no evento", async () => {
    const lead = { id: "lead", organization_id: "org", pipeline_id: "funil", stage_id: "aberta", status: "open" };
    const atualizar = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          limit: () => query,
          update: (patch: Record<string, unknown>) => { atualizar(patch); return query; },
          maybeSingle: async () => ({ data: table === "crm_stages" ? { id: "perdida", name: "Não fechou" } : lead, error: null }),
          then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
        };
        return query;
      },
      rpc,
    } as unknown as SupabaseClient;

    await encerraDemanda(db, {
      organization_id: "org", actor: { type: "user", id: "user" }, requestId: "request",
    }, { leadId: "lead", desfecho: "lost", motivo: "other", motivoDetalhe: "  Projeto adiado  " });

    expect(atualizar).toHaveBeenCalledWith(expect.objectContaining({ lost_reason: "other", stage_id: "perdida" }));
    expect(atividade).toHaveBeenCalledWith(db, expect.objectContaining({
      reason: "Perdido — Outro motivo: Projeto adiado",
      payload: expect.objectContaining({ lost_reason_detail: "Projeto adiado" }),
    }));
    expect(rpc).toHaveBeenCalledWith("emit_event", expect.objectContaining({
      p_payload: expect.objectContaining({ lost_reason: "other", lost_reason_detail: "Projeto adiado" }),
    }));
  });
});
