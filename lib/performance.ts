export async function captureCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else throw new Error('Canvas blob failed');
    }, 'image/png');
  });
}
