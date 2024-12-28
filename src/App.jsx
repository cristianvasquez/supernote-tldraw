import { Tldraw, useToasts } from 'tldraw'
import 'tldraw/tldraw.css'
import { handleSupernote } from './handleSupernote.js'

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

        // Create title first
        const titleShape = editor.createShape({
          type: 'text',
          x: position.x,
          y: position.y - 40, // Place title above the grid
          props: {
            text: file.name,
          },
        })

        if (file.name.endsWith('.note')) {
          await handleSupernote(file, editor, position)

        } else {
          editor.createShape({
            type: 'geo',
            x: position.x,
            y: position.y,
            props: {
              w: 200,
              h: 100,
              text: `I don't know how to handle ${file.name}`,
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
