import { Router } from 'express';
import * as controller from '../controllers/cpu.controller';
import { validate } from '../lib/validate';
import { stressBody } from '../validators/cpu.schema';

const router = Router();

router.get('/cpu', controller.cpu);
router.post('/cpu/stress', validate({ body: stressBody }), controller.stress);

export default router;
