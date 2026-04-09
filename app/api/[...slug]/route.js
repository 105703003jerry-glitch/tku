import * as learnProgress from '../learn/progress/handler';
import * as chat from '../chat/handler';
import * as courseTags from '../admin/course-tags/handler';
import * as coursesReorder from '../admin/courses/reorder/handler';

// Vercel max duration limit for the consolidated function
export const maxDuration = 30;

const routeMap = {
  'learn/progress': learnProgress,
  'chat': chat,
  'admin/course-tags': courseTags,
  'admin/courses/reorder': coursesReorder,
};

async function handle(req, { params }) {
  const resolvedParams = await params;
  const slugPath = (resolvedParams.slug || []).join('/');
  const handler = routeMap[slugPath];

  if (!handler || !handler[req.method]) {
    return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return handler[req.method](req, { params: resolvedParams });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const PUT = handle;
export const PATCH = handle;
