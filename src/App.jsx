import { createShapesForAssets, Tldraw, Vec } from 'tldraw'
import 'tldraw/tldraw.css'
import { SupernoteX, toImage } from 'supernote-typescript'

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

          for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
            try {
              const [image] = await toImage(note, [pageIndex])
              const imageBuffer = await image.toBuffer('image/png')
              
              // Convert buffer to base64 using browser APIs
              const base64 = btoa(
                new Uint8Array(imageBuffer)
                  .reduce((data, byte) => data + String.fromCharCode(byte), '')
              )
              const dataUrl = `data:image/png;base64,${base64}`

              // Create asset with unique ID
              const assetId = `asset:${Date.now()}-${pageIndex}`
              const assets = await editor.createAssets([
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
                }
              ])

              editor.createShape({
                type: 'image',
                x: position.x + (pageIndex - 1) * 220,
                y: position.y,
                props: {
                  w: 200,
                  h: 300,
                  assetId: assetId,
                }
              })

              // No need for URL.revokeObjectURL anymore
            } catch (error) {
              console.error(`Error processing page ${pageIndex}:`, error)
            }
          }
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
