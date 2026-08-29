import { Router } from 'express';
import * as controller from '../controllers/policy.controller';

const router = Router();

// Task 1.2 -- search policy info by username
router.get('/policies/search', controller.search);

// Task 1.3 -- aggregated policy by each user
router.get('/policies/aggregate', controller.aggregateByUser);

export default router;
