'use strict';

const { User, Policy } = require('../models');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Task 1.2 -- GET /api/policies/search?username=<name>&page=&limit=&exact=true
 * "username" maps to User.firstname (full name in the sheet). Case-insensitive; substring unless exact=true.
 */
async function search(req, res) {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Query param "username" is required' });

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const re = escapeRe(username);
  const nameFilter = { firstname: new RegExp(String(req.query.exact) === 'true' ? `^${re}$` : re, 'i') };

  const users = await User.find(nameFilter, { firstname: 1, email: 1, dob: 1 }).lean();
  if (!users.length) return res.status(404).json({ error: `No user matches username "${username}"`, policies: [] });

  const filter = { user_id: { $in: users.map((u) => u._id) } };
  const [policies, total] = await Promise.all([
    Policy.find(filter)
      .sort({ policy_start_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user_id', 'firstname email dob phone state')
      .populate('company_id', 'company_name')
      .populate('category_id', 'category_name')
      .populate('agent_id', 'name')
      .populate('account_id', 'account_name')
      .lean(),
    Policy.countDocuments(filter),
  ]);

  res.json({
    username,
    matchedUsers: users.map((u) => ({ id: u._id, firstname: u.firstname, email: u.email })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    policies,
  });
}

/**
 * Task 1.3 -- GET /api/policies/aggregate?page=&limit=&username=<optional>
 * Groups Policy by user_id: per-user policy count + premium totals.
 */
async function aggregateByUser(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const username = String(req.query.username || '').trim();

  const pipeline = [
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

  if (username) pipeline.push({ $match: { 'user.firstname': new RegExp(escapeRe(username), 'i') } });

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
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        meta: [{ $count: 'totalUsers' }],
      },
    }
  );

  const [result] = await Policy.aggregate(pipeline);
  const totalUsers = result?.meta?.[0]?.totalUsers || 0;

  res.json({
    page,
    limit,
    totalUsers,
    totalPages: Math.ceil(totalUsers / limit),
    users: result?.rows || [],
  });
}

module.exports = { search, aggregateByUser };
