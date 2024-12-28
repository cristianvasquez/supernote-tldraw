import { SupernoteX } from 'supernote-typescript'

class SupernoteWorker {
  constructor () {
    this.worker = new Worker(new URL('./worker.js', import.meta.url),
      { type: 'module' })
  }

  process (note, pageIndex) {
    this.worker.postMessage({ note, pageIndex })
  }

  onMessage (callback) {
    this.worker.onmessage = (e) => callback(e.data)
  }

  terminate () {
    this.worker.terminate()
  }
}

async function handleSupernote (file, editor, position) {
  // addToast({ title: 'Transforming note pages...', severity: 'success' })
  const arrayBuffer = await file.arrayBuffer()
  const note = new SupernoteX(new Uint8Array(arrayBuffer))
  const totalPages = note.pages.length

  let completedPages = 0
  const ITEMS_PER_ROW = 4
  const HORIZONTAL_SPACING = 220
  const VERTICAL_SPACING = 320

  // Create workers pool
  const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 3, 8)
  const workers = Array(MAX_WORKERS).
    fill(null).
    map(() => new SupernoteWorker())
  const processQueue = Array.from({ length: totalPages },
    (_, i) => i + 1)

  // Set up workers
  workers.forEach(worker => {
    worker.onMessage(
      async ({ pageIndex, imageData, status, error }) => {
        if (status === 'success') {
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(imageData)))
          const dataUrl = `data:image/png;base64,${base64}`

          const row = Math.floor((pageIndex - 1) / ITEMS_PER_ROW)
          const col = (pageIndex - 1) % ITEMS_PER_ROW

          const assetId = `asset:${Date.now()}-${pageIndex}`
          await editor.createAssets([
            {
              id: assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: `page_${pageIndex}.png`,
                src: dataUrl,
                w: 200,
                h: 300,
                mimeType: 'image/png',
                isAnimated: false,
              },
              meta: {},
            },
          ])

          const shape = editor.createShape({
            type: 'image',
            x: position.x + col * HORIZONTAL_SPACING,
            y: position.y + row * VERTICAL_SPACING,
            props: {
              w: 200,
              h: 300,
              assetId: assetId,
            },
          })

          completedPages++
          if (completedPages === totalPages) {
            workers.forEach(w => w.terminate())
          }
        }

        // Process next page if available
        const nextPage = processQueue.shift()
        if (nextPage) {
          worker.process(note, nextPage)
        }
      })
  })

  // Start initial batch of processing
  workers.forEach(worker => {
    const pageIndex = processQueue.shift()
    if (pageIndex) worker.process(note, pageIndex)
  })
}

export { handleSupernote }
