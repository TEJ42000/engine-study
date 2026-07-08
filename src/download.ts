// Trigger a client-side file download (used by F8 export + the blocked-load
// export-your-data escape hatch). No network — a Blob object URL.
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Simple, collision-resistant id for a single-user local app.
export function newId(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  )
}
