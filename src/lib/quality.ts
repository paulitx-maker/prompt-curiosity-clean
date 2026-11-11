export type QualityResult =
  | { status: "pass" }
  | { status: "block"; message: string }
  | { status: "warn"; message: string };

export async function checkImageQuality(file: File): Promise<QualityResult> {
  // BLOQUEIO HEIC - iPhone
  const isHeic = file.type === 'image/heic' ||
                 file.type === 'image/heif' ||
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');

  if (isHeic) {
    console.log('[HEIC_BLOCKED]', file.name);
    return {
      status: "block",
      message: "Seu iPhone mandou em HEIC e nosso modelo ainda não lê. Vai em Fotos > Exportar como JPEG e tenta de novo? Isso nos ajuda a saber quanta gente usa iPhone aqui.",
    };
  }

  if (file.size < 40 * 1024) {
    return {
      status: "block",
      message:
        "Essa imagem parece muito comprimida ou de baixa qualidade. Manda outra foto em resolução maior.",
    };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { status: "block", message: "Imagem acima de 8MB. Comprima ou escolha outra foto." };
  }

  const dims = await readImageDimensions(file);
  if (!dims) {
    return { status: "block", message: "Não consegui ler essa imagem. Tente outro arquivo." };
  }

  if (dims.width < 500 || dims.height < 500) {
    return {
      status: "block",
      message: `Resolução muito baixa (${dims.width}x${dims.height}px). Mínimo recomendado: 500x500px.`,
    };
  }

  return { status: "pass" };
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function checkAudioQuality(
  file: File,
): Promise<QualityResult & { durationSeconds?: number }> {
  const duration = await readAudioDuration(file);

  if (!duration ||!Number.isFinite(duration) || duration < 2) {
    return { status: "block", message: "Áudio vazio, corrompido ou tempo real não detectado." };
  }

  if (duration > 60 * 60) {
    return {
      status: "block",
      message: "Áudio acima de 1h não é suportado nessa versão. Envie um trecho menor.",
    };
  }

  const bitrateKbps = (file.size * 8) / duration / 1000;
  if (bitrateKbps < 32) {
    return {
      status: "block",
      message:
        "Qualidade de áudio muito baixa pra essa duração. Grave/exporte de novo com qualidade maior.",
    };
  }

  if (file.size > 25 * 1024 * 1024) {
    return { status: "block", message: "Arquivo acima de 25MB. Comprima ou envie um trecho menor." };
  }

  if (duration > 20 * 60) {
    return {
      status: "warn",
      message: "Áudio longo (+20min) — vai demorar mais e custar mais caro. Confirma?",
      durationSeconds: duration,
    };
  }

  return { status: "pass", durationSeconds: duration };
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",")? result.split(",")[1]! : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}