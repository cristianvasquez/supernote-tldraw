import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
  const handleMount = (editor) => {
    editor.createShape({
      type: 'text',
      x: 200,
      y: 200,
      props: {
        text: 'Hello world!',
      },
    })

    editor.selectAll()

    editor.zoomToSelection({
      animation: { duration: 5000 },
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount} />
    </div>
  )
}
