/**
 * Reduz a foto antes de enviar (lado maior até `max` px, JPEG): fica leve para
 * a internet do celular e cabe no limite da API, mantendo o texto legível.
 */
export async function photoToBase64(file: File, max = 2000): Promise<{ data: string; mimeType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Não consegui abrir essa imagem. Use uma foto JPG ou PNG.");
  });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // PNG com fundo transparente vira branco, não preto
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao preparar a imagem."))), "image/jpeg", 0.85),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { data: btoa(binary), mimeType: "image/jpeg" };
}
