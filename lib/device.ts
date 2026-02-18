export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}