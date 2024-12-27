import { createShapesForAssets, Tldraw, Vec } from 'tldraw'
import 'tldraw/tldraw.css'

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
        console.log('file', file)
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
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount}/>
    </div>
  )
}
