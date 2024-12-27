import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
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

export default function App () {
  const handleMount = (editor) => {
    editor.registerExternalContentHandler('files', async ({ point, files }) => {
      if (files.length > editor.options.maxFilesAtOnce) {
        throw new Error('Too many files')
      }

      const position =
        point ??
        (editor.inputs.shiftKey
          ? editor.inputs.currentPagePoint
          : editor.getViewportPageBounds().center)

      for (const file of files) {
        if (file.name.endsWith('.note')) {
          const arrayBuffer = await file.arrayBuffer()
          const note = new SupernoteX(new Uint8Array(arrayBuffer))
          const totalPages = note.pages.length

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

                  editor.createShape({
                    type: 'image',
                    x: position.x + (pageIndex - 1) * 220,
                    y: position.y,
                    props: {
                      w: 200,
                      h: 300,
                      assetId: assetId,
                    },
                  })
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

        } else {
          editor.createShape({
            type: 'geo',
            x: position.x,
            y: position.y,
            props: {
              w: 200,
              h: 100,
              text: file.name,
              fill: 'solid',
              geo: 'rectangle',
            },
          })
        }
      }
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount}/>
    </div>
  )
}
