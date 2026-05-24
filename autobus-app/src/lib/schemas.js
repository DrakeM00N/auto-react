import { z } from 'zod'

// All UI text is Ukrainian — error messages live next to schema definitions
// so future maintainers don't have to chase them across the codebase.

// ---------- primitives ----------

const emailField = z
  .string()
  .trim()
  .min(1, 'Введіть email')
  .toLowerCase()
  .pipe(z.email('Невірний формат email'))

const passwordField = z
  .string()
  .min(8, 'Пароль має містити щонайменше 8 символів')
  .max(72, 'Пароль занадто довгий')

// Ukrainian phone: accepts +380XXXXXXXXX, 380XXXXXXXXX, 0XXXXXXXXX.
// Spaces, dashes, brackets are stripped before validation.
const phoneField = z
  .string()
  .trim()
  .min(1, 'Введіть номер телефону')
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^(\+?38)?0\d{9}$/.test(v), 'Невірний формат телефону. Приклад: +380501234567')

const nonEmpty = (msg) => z.string().trim().min(1, msg)

// ---------- auth ----------

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Введіть пароль'),
})

export const registerSchema = z
  .object({
    name: nonEmpty('Введіть імʼя'),
    email: emailField,
    password: passwordField,
    confirm: z.string().min(1, 'Підтвердіть пароль'),
  })
  .refine(d => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Паролі не співпадають',
  })

// ---------- booking ----------

export const bookingSchema = z.object({
  passengerFirstName: nonEmpty('Введіть імʼя'),
  passengerLastName: nonEmpty('Введіть прізвище'),
  passengerPhone: phoneField,
  boardingPoint: nonEmpty('Оберіть зупинку посадки'),
  alightingPoint: nonEmpty('Оберіть зупинку висадки'),
})

// ---------- admin: route ----------

export const routeSchema = z.object({
  from: nonEmpty('Вкажіть місто відправлення'),
  to: nonEmpty('Вкажіть місто прибуття'),
  distance: nonEmpty('Вкажіть відстань'),
  duration: nonEmpty('Вкажіть тривалість'),
  stops: z.string().optional().default(''),
})

// ---------- admin: trip ----------

// price/seats arrive as strings from <input type="number"> but we want
// numeric validation. coerce.number handles both string and number input.
const positiveInt = (msg) =>
  z.coerce
    .number({ message: msg })
    .int(msg)
    .positive(msg)

const positiveNumber = (msg) =>
  z.coerce.number({ message: msg }).positive(msg)

export const tripSchema = z.object({
  routeId: nonEmpty('Оберіть маршрут'),
  date: nonEmpty('Вкажіть дату'),
  time: nonEmpty('Вкажіть час'),
  price: positiveNumber('Ціна має бути більшою за 0'),
  seats: positiveInt('Кількість місць має бути цілим числом більшим за 0'),
  // Extended fields aren't required by the backend — keep them optional
  // here so admin doesn't have to fill everything just to schedule a run.
  departurePoint: z.string().optional().default(''),
  arrivalPoint: z.string().optional().default(''),
  busModel: z.string().optional().default(''),
  busPlate: z.string().optional().default(''),
  carrier: z.string().optional().default(''),
  amenities: z.array(z.string()).optional().default([]),
  intermediateStops: z
    .array(
      z.object({
        name: z.string().optional().default(''),
        address: z.string().optional().default(''),
        time: z.string().optional().default(''),
      }),
    )
    .optional()
    .default([]),
})
