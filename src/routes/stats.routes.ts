import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import * as browseController from '../controllers/browse.controller';
import { validate } from '../lib/validate';
import { asyncHandler } from '../lib/async-handler';
import { collectionParam, browseQuery } from '../validators/collection.schema';

const router = Router();

router.get('/stats', asyncHandler(statsController.stats));
router.get(
  '/data/:collection',
  validate({ params: collectionParam, query: browseQuery }),
  asyncHandler(browseController.browse)
);

export default router;
