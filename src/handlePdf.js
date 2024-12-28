import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';

async function handlePdf(file, editor, position) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  const ITEMS_PER_ROW = 3; // Fixed number of items per row
  const HORIZONTAL_MARGIN = 20; // Space between columns
  const VERTICAL_MARGIN = 20; // Space between rows

  let currentX = position.x;
  let currentY = position.y;
  let rowHeight = 0; // Keep track of the tallest page in the current row

  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/png');

    // Create the asset in the editor
    const assetId = `asset:${Date.now()}-${pageIndex}`;
    await editor.createAssets([
      {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: `page_${pageIndex}.png`,
          src: dataUrl,
          w: canvas.width,
          h: canvas.height,
          mimeType: 'image/png',
          isAnimated: false,
        },
        meta: {},
      },
    ]);

    // Place the shape in the editor
    editor.createShape({
      type: 'image',
      x: currentX,
      y: currentY,
      props: {
        w: canvas.width,
        h: canvas.height,
        assetId: assetId,
      },
    });

    // Update the current row's height if this page is taller
    rowHeight = Math.max(rowHeight, canvas.height);

    // Move to the next column
    currentX += canvas.width + HORIZONTAL_MARGIN;

    // If the row is full (3 items), move to the next row
    if (pageIndex % ITEMS_PER_ROW === 0) {
      currentX = position.x; // Reset to the start of the row
      currentY += rowHeight + VERTICAL_MARGIN; // Move down by the row height
      rowHeight = 0; // Reset row height for the new row
    }
  }
}

export { handlePdf };
