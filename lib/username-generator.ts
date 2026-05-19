export function generateUsername() {
  const adjectives = [
    'keen', 'nimble', 'quiet', 'sharp', 'swift',
    'steady', 'curious', 'watchful', 'alert', 'focused'
  ]

  const roles = [
    'scout', 'tracker', 'observer', 'shopper',
    'finder', 'watcher', 'explorer', 'spotter'
  ]

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const role = roles[Math.floor(Math.random() * roles.length)]
  const number = Math.floor(Math.random() * 9000) + 1000

  return `${adj} ${role} ${number}`
}