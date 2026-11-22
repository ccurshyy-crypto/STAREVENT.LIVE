/**
 * Security Rules Verification Matrix for Star Event Live
 * Verifies Eight Pillars invariants across Super Admin, Operator User, and Unauthenticated roles.
 */
export const SECURITY_RULE_TEST_MATRIX = [
  {
    name: 'Unauthenticated user cannot read /userAccounts or /scoreboards',
    path: '/userAccounts/uid_1',
    operation: 'get',
    auth: null,
    expected: 'DENY',
  },
  {
    name: 'Unauthenticated user cannot list /loginLookup',
    path: '/loginLookup',
    operation: 'list',
    auth: null,
    expected: 'DENY',
  },
  {
    name: 'Unauthenticated user can get exact /loginLookup/BHARATNIRGUDA (non-PII synthetic alias)',
    path: '/loginLookup/BHARATNIRGUDA',
    operation: 'get',
    auth: null,
    expected: 'ALLOW',
  },
  {
    name: 'Unverified ccurshyy@gmail.com cannot impersonate Super Admin',
    path: '/userAccounts/uid_2',
    operation: 'create',
    auth: { uid: 'spoof', email: 'ccurshyy@gmail.com', email_verified: false },
    expected: 'DENY',
  },
  {
    name: 'Verified Super Admin (ccurshyy@gmail.com) can create userAccounts without plaintext password',
    path: '/userAccounts/uid_2',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'ccurshyy@gmail.com', email_verified: true },
    expected: 'ALLOW',
  },
  {
    name: 'Super Admin create blocked if password field is accidentally included (hasOnly)',
    path: '/userAccounts/uid_2',
    operation: 'create',
    payloadIncludes: ['password'],
    auth: { uid: 'admin_1', email: 'ccurshyy@gmail.com', email_verified: true },
    expected: 'DENY',
  },
  {
    name: 'Operator A cannot create new users or escalate role',
    path: '/userAccounts/uid_3',
    operation: 'create',
    auth: { uid: 'user_a', email: 'bharatnirguda@users.starevent.live', email_verified: false },
    expected: 'DENY',
  },
  {
    name: 'Operator A can read own /userAccounts/user_a but cannot read /userAccounts/user_b',
    path: '/userAccounts/user_b',
    operation: 'get',
    auth: { uid: 'user_a', email: 'bharatnirguda@users.starevent.live', email_verified: false },
    expected: 'DENY',
  },
  {
    name: 'Operator A can update own /scoreboards/kbd-bharatnirguda within valid score bounds',
    path: '/scoreboards/kbd-bharatnirguda',
    operation: 'update',
    auth: { uid: 'user_a', email: 'bharatnirguda@users.starevent.live', email_verified: false },
    expected: 'ALLOW',
  },
  {
    name: 'Operator A cannot update Operator B scoreboard',
    path: '/scoreboards/kbd-papyakhadke',
    operation: 'update',
    auth: { uid: 'user_a', email: 'bharatnirguda@users.starevent.live', email_verified: false },
    expected: 'DENY',
  },
];
