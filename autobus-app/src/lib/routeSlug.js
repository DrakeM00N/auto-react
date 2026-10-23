const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e',
}

export function transliterate(value) {
  return String(value || '')
    .toLowerCase()
    .split('')
    .map(char => TRANSLIT[char] || char)
    .join('')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function routeSlug(route) {
  return `${transliterate(route?.from)}-${transliterate(route?.to)}`
}

export function routePath(route) {
  return `/routes/${routeSlug(route)}`
}
