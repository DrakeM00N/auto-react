import { useDocumentMeta } from '../lib/useDocumentMeta'

const sectionStyle = {
  padding: '24px',
  borderRadius: '18px',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
}

const sectionTitleStyle = {
  fontSize: '1.4rem',
  marginBottom: '12px',
  fontFamily: 'Unbounded',
}

const paragraphStyle = { color: 'var(--text2)', lineHeight: 1.7, margin: '0 0 12px' }

function Oferta() {
  useDocumentMeta({
    title: 'Публічна оферта',
    description: 'Публічна оферта BusTour — умови надання послуг бронювання та повернення коштів.',
  })

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '24px' }}>
        Публічна оферта
      </h1>

      <div style={{ display: 'grid', gap: '20px' }}>
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>1. Загальні положення</h2>
          <p style={paragraphStyle}>
            Цей документ є офіційною публічною пропозицією (офертою) сервісу
            BusTour (далі — «Виконавець») будь-якій фізичній особі (далі —
            «Клієнт»), яка прийме цю оферту, укласти договір про надання
            послуг з онлайн-бронювання автобусних квитків на умовах,
            викладених нижче.
          </p>
          <p style={paragraphStyle}>
            Акцептом цієї оферти вважається оплата замовлення на сайті
            bustour.com.ua. З моменту акцепту договір вважається укладеним.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>2. Предмет договору</h2>
          <p style={paragraphStyle}>
            Виконавець надає Клієнту послугу з онлайн-бронювання та оформлення
            електронних квитків на регулярні автобусні рейси перевізників,
            представлених на сайті. Перевезення виконує безпосередньо
            перевізник згідно з умовами свого рейсу.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>3. Вартість та порядок оплати</h2>
          <p style={paragraphStyle}>
            Вартість квитка вказана на сторінці конкретного рейсу. Оплата
            проводиться онлайн через платіжну систему WayForPay банківською
            карткою у гривнях. Після успішної оплати на email та на сторінці
            підтвердження надсилається електронний квиток з унікальним кодом.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>4. Умови повернення коштів</h2>
          <p style={paragraphStyle}>
            Клієнт має право скасувати придбаний квиток та отримати повернення
            коштів за умови, що звернення про скасування подане не пізніше
            ніж за <strong>24 години</strong> до відправлення рейсу.
          </p>
          <p style={paragraphStyle}>
            Кошти повертаються на ту саму банківську картку, з якої була
            здійснена оплата, протягом <strong>3–5 робочих днів</strong> з
            моменту підтвердження скасування. Точний термін зарахування
            залежить від банку-емітента картки.
          </p>
          <p style={paragraphStyle}>
            Скасування квитка пізніше ніж за 24 години до відправлення, а
            також неявка пасажира на рейс, не є підставою для повернення
            коштів.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>5. Відповідальність сторін</h2>
          <p style={paragraphStyle}>
            Виконавець не несе відповідальності за дії перевізника, включно
            зі змінами розкладу, затримками та скасуванням рейсів з боку
            перевізника. У разі скасування рейсу перевізником Клієнту
            повертається повна вартість квитка.
          </p>
          <p style={paragraphStyle}>
            Клієнт зобовʼязується надати правдиві дані при оформленні
            бронювання та зʼявитися на посадку згідно з часом, вказаним
            у квитку.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>6. Контакти Виконавця</h2>
          <div style={{ display: 'grid', gap: '8px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <div>
              Сайт:{' '}
              <a href="https://bustour.com.ua" style={{ color: 'var(--accent)' }}>
                bustour.com.ua
              </a>
            </div>
            <div>
              Email:{' '}
              <a href="mailto:bustour.ukraine@gmail.com" style={{ color: 'var(--accent)' }}>
                bustour.ukraine@gmail.com
              </a>
            </div>
            <div>ФЛП: Єльнікова Лілія Олександрівна</div>
            <div>ЄДРПОУ: 3548506027</div>
            <div>Адреса: Україна, Заводське, Полтавська область</div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Oferta
