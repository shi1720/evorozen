/** Document extraction stays client-side. Users review text before it becomes evidence. */
export async function extractText(file: File, progress: (text: string) => void): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['txt', 'csv', 'md'].includes(ext || '')) {
    const text = await file.text();
    if (text.includes('\0')) throw new Error('This does not look like a text file.');
    return text;
  }
  if (file.type === 'application/pdf' || ext === 'pdf') {
    progress('Reading PDF text…');
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 20)
        throw new Error('Please split this PDF into files of 20 pages or fewer.');
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(
          `[Page ${i}]\n` +
            content.items
              .map((item) =>
                'str' in item ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '',
              )
              .join(''),
        );
        progress(`Reading PDF page ${i} of ${pdf.numPages}…`);
      }
      const text = pages.join('\n\n');
      if (text.replace(/\[Page \d+\]/g, '').trim().length < 20)
        throw new Error(
          'This PDF appears to be a scan. Upload a page as PNG/JPEG for OCR, or paste a transcription.',
        );
      return text;
    } finally {
      await task.destroy();
    }
  }
  if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    progress('Starting image text recognition…');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text')
          progress(`Reading image… ${Math.round(m.progress * 100)}%`);
      },
    });
    try {
      const result = await worker.recognize(file);
      if (result.data.text.trim().length < 10)
        throw new Error(
          'We could not read enough text. Try a sharper image or paste the text instead.',
        );
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  }
  throw new Error('Supported files: PDF, TXT, CSV, PNG, JPEG, and WebP.');
}
