import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import * as browseController from '../controllers/browse.controller';

const router = Router();

router.get('/stats', statsController.stats);
router.get('/data/:collection', browseController.browse);

export default router;
