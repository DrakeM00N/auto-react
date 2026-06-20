import { QRCodeSVG } from 'qrcode.react'
import { formatDate } from '../lib/format'

// Renders one electronic ticket from the payload returned by
// /api/tickets/:code or /api/payments/status/:orderId.
function TicketCard({ ticket }) {
  // VITE_PUBLIC_URL lets the QR point at a LAN IP so a phone can scan it.
  const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin
  const ticketUrl = `${base}/ticket/${ticket.ticketCode}`
  const routeLine = [ticket.fromCity, ...(ticket.stops?.map(s => s.city) || []), ticket.toCity].join(' → ')

  const labelStyle = { fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }

  return (
    <div id="ticket-print" style={{
      background: 'var(--bg2)',
      border: '2px solid var(--accent)',
      borderRadius: '24px',
      overflow: 'hidden',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div style={{ background: 'var(--accent)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1814', opacity: 0.7, marginBottom: '2px' }}>ЕЛЕКТРОННИЙ КВИТОК</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A1814', fontFamily: 'Unbounded, sans-serif' }}>BusTour</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#1A1814', opacity: 0.7 }}>№ квитка</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1A1814', letterSpacing: '1px' }}>{ticket.ticketCode}</div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={labelStyle}>ПОСАДКА</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ticket.boardingPoint}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>🚌</div>
            <div style={{ height: '2px', width: '100%', background: 'var(--border)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{ticket.duration}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={labelStyle}>ВИСАДКА</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ticket.alightingPoint}</div>
          </div>
        </div>
        <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--text2)', fontSize: '0.85rem' }}>
          Маршрут: {routeLine}
        </div>
      </div>

      <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px dashed var(--border)' }}>
        <div><div style={labelStyle}>ДАТА</div><div style={{ fontWeight: 700 }}>{formatDate(ticket.tripDate)}</div></div>
        <div><div style={labelStyle}>ЧАС</div><div style={{ fontWeight: 700 }}>{ticket.tripTime}</div></div>
        <div><div style={labelStyle}>ПАСАЖИР</div><div style={{ fontWeight: 700 }}>{ticket.passengerName}</div></div>
        <div><div style={labelStyle}>ТЕЛЕФОН</div><div style={{ fontWeight: 700 }}>{ticket.passengerPhone}</div></div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', lineHeight: 0 }}>
          <QRCodeSVG value={ticketUrl} size={104} />
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Покажіть цей QR-код водієві під час посадки. Скануванням він відкриває
          сторінку перевірки квитка <strong style={{ color: 'var(--text)' }}>{ticket.ticketCode}</strong>.
        </div>
      </div>

      <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={labelStyle}>ВАРТІСТЬ КВИТКА</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{ticket.tripPrice} грн</div>
        </div>
        <div style={{ background: 'var(--accent)', color: '#1A1814', padding: '8px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
          ✓ ОПЛАЧЕНО
        </div>
      </div>
    </div>
  )
}

export default TicketCard
