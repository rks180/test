import { Router } from 'express';
import * as controller from '../controllers/cpu.controller';

const router = Router();

router.get('/cpu', controller.cpu);
router.post('/cpu/stress', controller.stress);

export default router;
