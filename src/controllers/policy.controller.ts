import type { Request, Response } from 'express';
import * as policyService from '../services/policy.service';
import type { SearchQuery, AggregateQuery } from '../validators/policy.schema';

// Task 1.2 -- GET /api/policies/search
export async function search(req: Request, res: Response): Promise<void> {
  const result = await policyService.searchPoliciesByUsername(req.valid!.query as SearchQuery);
  res.json(result);
}

// Task 1.3 -- GET /api/policies/aggregate
export async function aggregateByUser(req: Request, res: Response): Promise<void> {
  const result = await policyService.aggregatePoliciesByUser(req.valid!.query as AggregateQuery);
  res.json(result);
}
