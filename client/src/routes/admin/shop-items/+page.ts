// Admin shop items page - preload authentication check
export async function load({ fetch, url }) {
  // This page requires authentication and admin privileges
  // The actual auth check is done in the component
  return {
    url: url.pathname
  };
}

