import { useData } from '../context/DataContext'

// Shown above the page content when DataContext can't reach the backend.
// Stays out of the way otherwise — null means no banner at all.
function ServerErrorBanner() {
  const { error, reload } = useData()
  if (!error) return null

  return (
    <div role="alert" style={{
      margin: '0 auto',
      maxWidth: '880px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: '#FDECEA',
      border: '1px solid #F5C6CB',
      color: '#842029',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '12px',
      flexWrap: 'wrap',
    }}>
      <span>⚠️ {error}</span>
      <button
        onClick={() => reload()}
        style={{
          padding: '6px 14px',
          borderRadius: '10px',
          border: '1px solid #842029',
          background: 'transparent',
          color: '#842029',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Спробувати знову
      </button>
    </div>
  )
}

export default ServerErrorBanner
