import { ignition } from '@/ignition'
import { serve } from '@hono/node-server'

const app = ignition();

serve(app, (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
})