'use strict';

// Splits one flat CSV/XLSX row into the 6 entities. Pure functions only -- no DB calls.

function str(v) {
  if (v === null || v === undefined) return '';
  // exceljs sometimes returns a { text, hyperlink } or { result } object.
  if (typeof v === 'object') {
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  }
  return String(v).trim();
}

function toDate(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toNum(v) {
  const s = str(v).replace(/[^0-9.\-]/g, '');
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** User dedupe key -- email is not unique, so firstname + dob. */
function userKey(firstname, dob) {
  return `${firstname.toLowerCase()}|${dob ? dob.toISOString().slice(0, 10) : ''}`;
}

/** Account dedupe key -- account_name alone is not unique. */
function accountKey(accountName, userKeyStr) {
  return `${accountName.toLowerCase()}|${userKeyStr}`;
}

/**
 * @returns {{agent,carrier,lob,user,account,policy}|null} null if the row is unusable
 */
function mapRow(raw) {
  const firstname = str(raw.firstname);
  const policyNumber = str(raw.policy_number);

  // Without these two the row is meaningless -- it cannot be attached to a user.
  if (!firstname || !policyNumber) return null;

  const dob = toDate(raw.dob);
  const uKey = userKey(firstname, dob);
  const accountName = str(raw.account_name);

  return {
    agent: str(raw.agent) || null,
    carrier: str(raw.company_name) || null,
    lob: str(raw.category_name) || null,

    user: {
      key: uKey,
      firstname,
      dob,
      address: str(raw.address),
      city: str(raw.city),
      phone: str(raw.phone),
      state: str(raw.state),
      zip: str(raw.zip),
      email: str(raw.email).toLowerCase(),
      gender: str(raw.gender),
      userType: str(raw.userType),
    },

    account: accountName
      ? {
          key: accountKey(accountName, uKey),
          account_name: accountName,
          account_type: str(raw.account_type),
          userKey: uKey,
        }
      : null,

    policy: {
      policy_number: policyNumber,
      policy_start_date: toDate(raw.policy_start_date),
      policy_end_date: toDate(raw.policy_end_date),
      policy_mode: str(raw.policy_mode),
      policy_type: str(raw.policy_type),
      premium_amount: toNum(raw.premium_amount),
      premium_amount_written: toNum(raw.premium_amount_written),
      producer: str(raw.producer),
      csr: str(raw.csr),
      userKey: uKey,
      accountKey: accountName ? accountKey(accountName, uKey) : null,
    },
  };
}

module.exports = { mapRow, userKey, accountKey, str, toDate, toNum };
