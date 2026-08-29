import { PipelineStage } from 'mongoose';
import { User, Policy } from '../models';
import { NotFoundError } from '../lib/http-error';
import type { SearchQuery, AggregateQuery } from '../validators/policy.schema';

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Task 1.2 -- policies for every user whose firstname matches the given name.
export async function searchPoliciesByUsername(q: SearchQuery) {
  const re = escapeRe(q.username);
  const nameFilter = { firstname: new RegExp(q.exact ? `^${re}$` : re, 'i') };

  const users = await User.find(nameFilter, { firstname: 1, email: 1 }).lean();
  if (!users.length) throw new NotFoundError(`No user matches username "${q.username}"`);

  const filter = { user_id: { $in: users.map((u) => u._id) } };
  const [policies, total] = await Promise.all([
    Policy.find(filter)
      .sort({ policy_start_date: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('user_id', 'firstname email dob phone state')
      .populate('company_id', 'company_name')
      .populate('category_id', 'category_name')
      .populate('agent_id', 'name')
      .populate('account_id', 'account_name')
      .lean(),
    Policy.countDocuments(filter),
  ]);

  return {
    matchedUsers: users.map((u) => ({ id: u._id, firstname: u.firstname, email: u.email })),
    policies,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

// Task 1.3 -- per-user policy count + premium totals.
export async function aggregatePoliciesByUser(q: AggregateQuery) {
  const pipeline: PipelineStage[] = [
    {
      $group: {
        _id: '$user_id',
        policyCount: { $sum: 1 },
        totalPremium: { $sum: '$premium_amount' },
        totalPremiumWritten: { $sum: '$premium_amount_written' },
        policyNumbers: { $push: '$policy_number' },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ];

  if (q.username) {
    pipeline.push({ $match: { 'user.firstname': new RegExp(escapeRe(q.username), 'i') } });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.firstname',
        email: '$user.email',
        state: '$user.state',
        policyCount: 1,
        totalPremium: { $round: ['$totalPremium', 2] },
        totalPremiumWritten: { $round: ['$totalPremiumWritten', 2] },
        policyNumbers: 1,
      },
    },
    { $sort: { policyCount: -1, username: 1 } },
    {
      $facet: {
        rows: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }],
        meta: [{ $count: 'totalUsers' }],
      },
    }
  );

  const [result] = await Policy.aggregate(pipeline);
  const totalUsers: number = result?.meta?.[0]?.totalUsers ?? 0;

  return {
    users: result?.rows ?? [],
    meta: { page: q.page, limit: q.limit, totalUsers, totalPages: Math.ceil(totalUsers / q.limit) },
  };
}
