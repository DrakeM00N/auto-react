export const SITE = {
  name: 'BusToRIA',
  domain: 'https://bustour.com.ua',
  description: 'Автобусні квитки онлайн по Україні: актуальний розклад, зручне бронювання та електронний квиток.',
  image: '/og-image.svg',
  phone: '+38 (050) 057-06-56',
  email: 'bustour.ukraine@gmail.com',
  legalName: 'ФОП Єльнікова Лілія Олександрівна',
  edrpou: '3548506027',
  address: 'Україна, Заводське, Полтавська область',
}

export const PUBLIC_PAGES = [
  { path: '/', title: 'Автобусні квитки онлайн по Україні', description: 'Купуйте автобусні квитки онлайн по Україні: актуальний розклад рейсів, популярні маршрути та безпечне бронювання.' },
  { path: '/routes', title: 'Автобусні маршрути по Україні', description: 'Перегляньте автобусні маршрути BusToRIA, відстань, тривалість поїздки та доступні рейси.' },
  { path: '/schedule', title: 'Розклад автобусних рейсів', description: 'Знайдіть актуальний розклад автобусних рейсів, оберіть дату та забронюйте місце онлайн.' },
  { path: '/about', title: 'Про BusToRIA', description: 'Дізнайтесь більше про BusToRIA — сервіс онлайн-бронювання автобусних квитків по Україні.' },
  { path: '/oferta', title: 'Публічна оферта BusToRIA', description: 'Умови онлайн-бронювання автобусних квитків, оплати, скасування та повернення коштів BusToRIA.' },
  { path: '/privacy', title: 'Політика конфіденційності BusToRIA', description: 'Політика конфіденційності та правила обробки персональних даних користувачів BusToRIA.' },
]

export function absoluteUrl(path = '/') {
  return new URL(path, SITE.domain).toString()
}
