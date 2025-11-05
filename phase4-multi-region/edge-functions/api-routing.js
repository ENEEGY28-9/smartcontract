// GameV1 API Routing Edge Function
// Routes API requests to optimal region

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // Route API requests based on path and user location
  if (path.startsWith('/api/')) {
    // Get user location from Cloudflare headers
    const country = request.headers.get('CF-IPCountry') || 'US'
    const region = getOptimalRegion(country)

    // Redirect to regional API endpoint
    const regionalUrl = `https://api-${region}.gamev1.com${path}${url.search}`
    return Response.redirect(regionalUrl, 302)
  }

  // Serve static content from CDN
  if (path.startsWith('/static/') || path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Cache static assets at edge
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)

    // Set cache headers for static assets
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000')
    newResponse.headers.set('CDN-Cache-Control', 'public, max-age=31536000')

    return newResponse
  }

  // Default: proxy to primary region
  return fetch(`https://api-us.gamev1.com${path}${url.search}`)
}

function getOptimalRegion(country) {
  // Map countries to optimal regions
  const regionMapping = {
    'US': 'us-east-1',
    'CA': 'us-east-1',
    'GB': 'eu-west-1',
    'DE': 'eu-west-1',
    'FR': 'eu-west-1',
    'JP': 'ap-southeast-1',
    'AU': 'ap-southeast-1',
    'SG': 'ap-southeast-1',
    'IN': 'ap-southeast-1',
    'BR': 'us-east-1',
    'MX': 'us-east-1'
  }

  return regionMapping[country] || 'us-east-1'
}
