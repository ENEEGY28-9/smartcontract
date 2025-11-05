// GameV1 API Routing Edge Function
// Routes API requests to optimal region with health checks

const REGION_MAPPING = {
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
};

const HEALTH_CHECK_ENDPOINTS = {
  'us-east-1': 'https://api-us.gamev1.com/healthz',
  'eu-west-1': 'https://api-eu.gamev1.com/healthz',
  'ap-southeast-1': 'https://api-ap.gamev1.com/healthz'
};

const REGION_CACHE = new Map();

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle API requests
  if (path.startsWith('/api/')) {
    return await routeApiRequest(request);
  }

  // Handle static content
  if (path.startsWith('/static/') || path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    return await optimizeStaticContent(request);
  }

  // Default: proxy to primary region
  return await proxyToRegion(request, 'us-east-1');
}

async function routeApiRequest(request) {
  const url = new URL(request.url);
  const userCountry = request.headers.get('CF-IPCountry') || 'US';

  // Get optimal region for user
  const optimalRegion = getOptimalRegion(userCountry);

  // Check region health
  const isHealthy = await checkRegionHealth(optimalRegion);

  if (isHealthy) {
    // Route to optimal region
    const regionalUrl = `https://api-${optimalRegion}.gamev1.com${url.pathname}${url.search}`;
    return Response.redirect(regionalUrl, 302);
  } else {
    // Fallback to next best region
    const fallbackRegion = getFallbackRegion(optimalRegion);
    const fallbackUrl = `https://api-${fallbackRegion}.gamev1.com${url.pathname}${url.search}`;
    return Response.redirect(fallbackUrl, 302);
  }
}

async function optimizeStaticContent(request) {
  const url = new URL(request.url);
  const response = await fetch(request);

  // Optimize images
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    return await optimizeImage(request, response);
  }

  // Cache static assets
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Cache-Control', 'public, max-age=31536000');
  newResponse.headers.set('CDN-Cache-Control', 'public, max-age=31536000');

  return newResponse;
}

async function optimizeImage(request, originalResponse) {
  // Image optimization logic
  const acceptHeader = request.headers.get('Accept');
  const supportsWebP = acceptHeader && acceptHeader.includes('image/webp');

  if (supportsWebP) {
    // Convert to WebP if supported
    const imageBuffer = await originalResponse.arrayBuffer();
    // WebP conversion logic would go here
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }

  return originalResponse;
}

function getOptimalRegion(country) {
  return REGION_MAPPING[country] || 'us-east-1';
}

function getFallbackRegion(primaryRegion) {
  const regionPriority = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  const currentIndex = regionPriority.indexOf(primaryRegion);

  if (currentIndex === -1 || currentIndex === regionPriority.length - 1) {
    return regionPriority[0]; // Fallback to first region
  }

  return regionPriority[currentIndex + 1];
}

async function checkRegionHealth(region) {
  const endpoint = HEALTH_CHECK_ENDPOINTS[region];
  if (!endpoint) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GameV1-Edge-HealthCheck/1.0'
      }
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Health check failed for ${region}:`, error);
    return false;
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
