import { Router } from 'express';
import * as controller from '../controllers/policy.controller';
import { validate } from '../lib/validate';
import { asyncHandler } from '../lib/async-handler';
import { searchQuery, aggregateQuery } from '../validators/policy.schema';

const router = Router();

// Task 1.2 -- search policy info by username
router.get('/policies/search', validate({ query: searchQuery }), asyncHandler(controller.search));

// Task 1.3 -- aggregated policy by each user
router.get('/policies/aggregate', validate({ query: aggregateQuery }), asyncHandler(controller.aggregateByUser));

export default router;
