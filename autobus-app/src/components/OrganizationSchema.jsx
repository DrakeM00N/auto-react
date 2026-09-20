import { SITE } from '../config/site'

function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.domain,
    logo: `${SITE.domain}/favicon-512.png`,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'UA',
      streetAddress: SITE.address,
    },
  }

  return <script type="application/ld+json">{JSON.stringify(schema)}</script>
}

export default OrganizationSchema
