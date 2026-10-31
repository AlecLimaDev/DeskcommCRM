import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoseLeadDialog } from "./LoseLeadDialog";

const { salvar } = vi.hoisted(() => ({ salvar: vi.fn() }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useLoseLead: () => ({ mutateAsync: salvar, isPending: false }),
}));

beforeEach(() => { salvar.mockReset().mockResolvedValue({}); });

describe("Outro motivo", () => {
  it("envia o código aceito pelo banco e preserva o texto em campo separado", async () => {
    const fechar = vi.fn();
    render(<LoseLeadDialog open onOpenChange={fechar} leadId="lead" pipelineId="funil" />);
    fireEvent.click(screen.getByLabelText("Outro motivo"));
    fireEvent.change(screen.getByLabelText("Detalhe (opcional)"), {
      target: { value: "  Projeto adiado para o próximo ano  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith({
      leadId: "lead", lostReason: "other", lostReasonDetail: "Projeto adiado para o próximo ano",
    }));
    await waitFor(() => expect(fechar).toHaveBeenCalledWith(false));
  });

  it("aceita Outro motivo sem detalhe e descarta o detalhe ao escolher outra opção", async () => {
    render(<LoseLeadDialog open onOpenChange={vi.fn()} leadId="lead" pipelineId="funil" />);
    fireEvent.click(screen.getByLabelText("Outro motivo"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith({ leadId: "lead", lostReason: "other" }));
    fireEvent.click(screen.getByLabelText("Outro motivo"));
    fireEvent.change(screen.getByLabelText("Detalhe (opcional)"), { target: { value: "Texto anterior" } });
    fireEvent.click(screen.getByLabelText("Preço"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(salvar).toHaveBeenLastCalledWith({ leadId: "lead", lostReason: "price" }));
  });
});
