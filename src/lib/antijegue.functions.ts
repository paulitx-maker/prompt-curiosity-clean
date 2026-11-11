import { createServerFn } from "@tanstack/react-start";

export interface PostImagemInput {
  imageBase64: string;
  fileBase64?: string;
  mimeType: string;
  deviceId?: string;
  fileName?: string;
  answers: {
    plataforma: "instagram" | "linkedin" | "whatsapp";
    tom: "vendas" | "informativo" | "engracado";
    manterTexto: "manter" | "reescrever";
  };
}

export interface AudioResumoInput {
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  deviceId?: string;
  fileName?: string;
  answers: {
    numeroPessoas: "1" | "2" | "3_ou_mais";
    ruido: "limpo" | "moderado" | "muito_ruido";
    resultado: "transcricao_literal" | "resumo_curto" | "resumo_detalhado";
  };
}

export interface FeedbackInput {
  executionId: string;
  deviceId: string;
  nota: number;
  oQueFaltou?: string | undefined;
  podeUsarPublico?: boolean;
}

export const postImagem = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as PostImagemInput)
  .handler(async ({ data }) => {
    const { runPostImagem } = await import("./antijegue.server");
    return runPostImagem(data);
  });

export const audioResumo = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as AudioResumoInput)
  .handler(async ({ data }) => {
    const { runAudioResumo } = await import("./antijegue.server");
    return runAudioResumo(data);
  });

export const enviarFeedback = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as FeedbackInput)
  .handler(async ({ data }) => {
    const { runEnviarFeedback } = await import("./antijegue.server");
    return runEnviarFeedback(data);
  });