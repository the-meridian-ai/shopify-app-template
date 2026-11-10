// Health check for the host (Meridian hosting, or any load balancer): answers
// 200 with no redirect and no authentication. Point the environment's health
// check path at /health.
export const loader = () => new Response("ok");
