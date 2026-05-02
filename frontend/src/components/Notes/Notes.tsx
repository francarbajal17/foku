import { useState } from 'react'

export default function Notes() {
  const [content, setContent] = useState('')

  return (
    <div data-testid="notes-module">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribí tus objetivos acá..."
        style={{ width: '100%', minHeight: '200px', resize: 'vertical' }}
      />
    </div>
  )
}
