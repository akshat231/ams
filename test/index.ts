import express, { Request, Response } from 'express';
import { setTracking, startTracking, loadDashboard } from '../src/index';

const app = express();

app.use(express.json());

startTracking().then(() =>{
    loadDashboard()
})

/**
 * 1. Route with param + query + body
 * POST /test/123?type=demo
 * body: { "name": "John" }
 */
app.post('/test/:id', setTracking, (req: Request, res: Response) => {
    const id = req.params.id;
    const type = req.query.type;
    const name = req.body.name;

    res.json({
        message: 'Combined route',
        id,
        type,
        name,
    });
});

/**
 * 2. Simple route with nothing
 * GET /ping
 */
app.get('/ping', setTracking, (req: Request, res: Response) => {
    res.json({
        message: 'pong',
    });
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});