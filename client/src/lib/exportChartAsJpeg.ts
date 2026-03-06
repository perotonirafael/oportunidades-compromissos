interface ExportChartOptions {
  elementId: string;
  fileName: string;
  quality?: number;
  backgroundColor?: string;
}

function buildSvgMarkupFromElement(element: HTMLElement): { markup: string; width: number; height: number } {
  const svgElement = element.querySelector('.recharts-wrapper .recharts-surface, .recharts-responsive-container svg, .recharts-surface') as SVGElement | null;

  if (svgElement) {
    const clone = svgElement.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const bounds = svgElement.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    clone.setAttribute('width', `${width}`);
    clone.setAttribute('height', `${height}`);
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

    return {
      markup: new XMLSerializer().serializeToString(clone),
      width,
      height,
    };
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-export-ignore="true"]').forEach((node) => node.remove());

  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const content = new XMLSerializer().serializeToString(clone);

  return {
    markup: `<?xml version="1.0" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <foreignObject width="100%" height="100%">\n    <div xmlns="http://www.w3.org/1999/xhtml">${content}</div>\n  </foreignObject>\n</svg>`,
    width,
    height,
  };
}

export async function exportChartAsJpeg({
  elementId,
  fileName,
  quality = 0.92,
  backgroundColor = '#ffffff',
}: ExportChartOptions): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const { markup, width, height } = buildSvgMarkupFromElement(element);

  const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Falha ao renderizar gráfico para exportação.'));
      image.src = svgUrl;
    });

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));

    const context = canvas.getContext('2d');
    if (!context) return false;

    context.scale(pixelRatio, pixelRatio);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!jpegBlob) return false;

    const jpegUrl = URL.createObjectURL(jpegBlob);
    const link = document.createElement('a');
    link.href = jpegUrl;
    link.download = `${fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(jpegUrl);

    return true;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
