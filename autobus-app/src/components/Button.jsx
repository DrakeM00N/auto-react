// Тонкая обёртка над <button>, которая делает три вещи:
// 1. По loading=true принудительно disabled — защита от двойных сабмитов.
// 2. Показывает текст "Завантаження…" (или loadingText) вместо children.
// 3. Сохраняет любые inline-стили вызывающего кода — opacity/cursor только
//    подкручиваются, всё остальное проходит насквозь.
//
// Использование совпадает с обычным <button>:
//   <Button type="submit" loading={busy} style={…}>Зберегти</Button>
function Button({
  loading = false,
  disabled = false,
  loadingText = 'Завантаження…',
  children,
  style,
  ...rest
}) {
  const isInactive = loading || disabled
  return (
    <button
      {...rest}
      disabled={isInactive}
      style={{
        ...style,
        cursor: isInactive ? 'not-allowed' : (style?.cursor || 'pointer'),
        opacity: isInactive ? 0.65 : (style?.opacity ?? 1),
      }}
    >
      {loading ? loadingText : children}
    </button>
  )
}

export default Button
