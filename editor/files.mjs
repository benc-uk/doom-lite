//
//
//
window.exportMap = function () {
  const mapString = JSON.stringify(map, null, 2)
  const blob = new Blob([mapString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'map.json'
  a.click()
}

//
//
//
window.importMap = function () {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = function (e) {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = function (e) {
      const text = e.target.result
      map = JSON.parse(text)
      document.location.reload()
    }
    reader.readAsText(file)
  }
  input.click()
}
