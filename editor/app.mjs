const map = {}

window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')

  canvas.addEventListener('click', function (e) {
    const x = e.offsetX
    const y = e.offsetY
    ctx.fillStyle = 'white'
    ctx.fillRect(x - 1, y - 1, 3, 3)
  })
})
