import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  getSecondaryAuth,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  createDefaultOverlayState,
  createInitialUserScoreboardDoc,
  createInitialUserSettingsDoc,
  LiveOverlayState,
  UserLiveScoreboardDoc,
  UserScoreboardSettingsDoc,
  UserUndoHistoryDoc,
} from '../types/overlay';

export const SUPER_ADMIN_EMAIL = 'ccurshyy@gmail.com';
const AUTH_EMAIL_DOMAIN = 'users.starevent.live';

export interface OperatorUserAccount {
  uid: string;
  fullName: string;
  loginId: string;
  authEmail: string;
  recoveryEmail?: string;
  role: 'user';
  matchRoomId: string;
  scoreboardUrl: string;
  vmixOverlayUrl: string;
  status: 'active' | 'disabled';
  passwordVersion: number;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionedCredentials {
  uid: string;
  fullName: string;
  loginId: string;
  password: string;
  matchRoomId: string;
  scoreboardUrl: string;
  vmixOverlayUrl: string;
  isPasswordReset?: boolean;
}

export function generateLoginIdBase(fullName: string): string {
  const cleaned = fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 28);
  }
  return `USER${Math.floor(100 + Math.random() * 900)}`;
}

export function generateSecurePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const all = upper + lower + digits + symbols;

  const getRand = (max: number) => {
    const arr = new Uint32Array(1);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const chars: string[] = [
    upper[getRand(upper.length)],
    upper[getRand(upper.length)],
    lower[getRand(lower.length)],
    lower[getRand(lower.length)],
    digits[getRand(digits.length)],
    digits[getRand(digits.length)],
    symbols[getRand(symbols.length)],
  ];

  while (chars.length < Math.max(10, length)) {
    chars.push(all[getRand(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = getRand(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

export function buildUserUrls(uid: string) {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://starevent.live';
  const safeUid = encodeURIComponent(uid);
  const scoreboardUrl = `${origin}/control/${safeUid}`;
  const vmixOverlayUrl = `${origin}/scoreboard/${safeUid}`;
  return { scoreboardUrl, vmixOverlayUrl };
}

function buildAuthEmail(loginId: string, passwordVersion: number): string {
  const base = loginId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return passwordVersion <= 1
    ? `${base}@${AUTH_EMAIL_DOMAIN}`
    : `${base}.v${passwordVersion}@${AUTH_EMAIL_DOMAIN}`;
}

export function formatCredentialsCopyText(creds: ProvisionedCredentials): string {
  return [
    '=== STAR EVENT LIVE · ACCOUNT CREDENTIALS ===',
    `Full Name: ${creds.fullName}`,
    `Login ID: ${creds.loginId}`,
    `Password: ${creds.password}`,
    `User UID: ${creds.uid}`,
    `Admin Control Panel URL: ${creds.scoreboardUrl}`,
    `vMix / OBS Overlay URL (Transparent): ${creds.vmixOverlayUrl}`,
    '=============================================',
  ].join('\n');
}

interface AuthContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  isSuperAdmin: boolean;
  userAccount: OperatorUserAccount | null;
  managedUsers: OperatorUserAccount[];
  usersLoading: boolean;
  signInSuperAdminWithGoogle: () => Promise<void>;
  signInOperatorWithLoginId: (loginId: string, password: string) => Promise<OperatorUserAccount>;
  signUpOperatorUser: (input: {
    fullName: string;
    password?: string;
  }) => Promise<ProvisionedCredentials>;
  signOutUser: () => Promise<void>;
  resolveUniqueLoginId: (fullName: string) => Promise<string>;
  createOperatorUser: (input: {
    fullName: string;
    manualPassword?: string;
    recoveryEmail?: string;
  }) => Promise<ProvisionedCredentials>;
  resetOperatorPassword: (
    account: OperatorUserAccount,
    manualPassword?: string
  ) => Promise<ProvisionedCredentials>;
  toggleOperatorStatus: (account: OperatorUserAccount) => Promise<void>;
  deleteOperatorAccount: (account: OperatorUserAccount) => Promise<void>;
  saveUserScoreboardSnapshot: (
    roomId: string,
    ownerUid: string,
    ownerLoginId: string,
    state: LiveOverlayState
  ) => Promise<void>;
  loadUserScoreboardSnapshot: (roomId: string) => Promise<LiveOverlayState | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userAccount, setUserAccount] = useState<OperatorUserAccount | null>(null);
  const [managedUsers, setManagedUsers] = useState<OperatorUserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Track Firebase Auth session & role resolution
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setIsSuperAdmin(false);
        setUserAccount(null);
        setManagedUsers([]);
        setAuthReady(true);
        return;
      }

      const isBootstrapAdmin =
        user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && Boolean(user.emailVerified);

      let adminDocExists = false;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        adminDocExists = adminSnap.exists() && adminSnap.data()?.role === 'super_admin';
      } catch {
        adminDocExists = false;
      }

      const resolvedAdmin = isBootstrapAdmin || adminDocExists;
      setIsSuperAdmin(resolvedAdmin);

      // Ensure bootstrap Super Admin record exists in /admins/{uid}
      if (isBootstrapAdmin && !adminDocExists) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            email: user.email || SUPER_ADMIN_EMAIL,
            displayName: user.displayName || 'Super Admin',
            role: 'super_admin',
            createdAt: new Date().toISOString(),
          });
        } catch {
          // Non-fatal if already bootstrapped
        }
      }

      if (!resolvedAdmin) {
        try {
          const accSnap = await getDoc(doc(db, 'userAccounts', user.uid));
          if (accSnap.exists()) {
            const data = accSnap.data() as OperatorUserAccount;
            if (data.status === 'disabled') {
              await signOut(auth);
              setUserAccount(null);
            } else {
              setUserAccount(data);
            }
          } else {
            setUserAccount(null);
          }
        } catch {
          setUserAccount(null);
        }
      } else {
        setUserAccount(null);
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to all managed Operator User Accounts when Super Admin is logged in
  useEffect(() => {
    if (!authReady || !isSuperAdmin || !firebaseUser) {
      setManagedUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    const q = query(collection(db, 'userAccounts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: OperatorUserAccount[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OperatorUserAccount);
        });
        setManagedUsers(list);
        setUsersLoading(false);
      },
      (err) => {
        setUsersLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'userAccounts');
      }
    );

    return () => unsub();
  }, [authReady, isSuperAdmin, firebaseUser]);

  const signInSuperAdminWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email?.toLowerCase() ?? '';
    const verified = Boolean(result.user.emailVerified);

    let isAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase() && verified;
    if (!isAdmin) {
      try {
        const snap = await getDoc(doc(db, 'admins', result.user.uid));
        isAdmin = snap.exists() && snap.data()?.role === 'super_admin';
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      await signOut(auth);
      throw new Error(
        `Access denied: Only Super Admin (${SUPER_ADMIN_EMAIL}) can access the Super Admin Console.`
      );
    }
  }, []);

  const signInOperatorWithLoginId = useCallback(
    async (rawLoginId: string, password: string): Promise<OperatorUserAccount> => {
      const cleanLoginId = rawLoginId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanLoginId.length < 2) {
        throw new Error('Please enter a valid Login ID (e.g. BHARATNIRGUDA or CRUSHYY01).');
      }
      if (!password || password.length < 6) {
        throw new Error('Please enter your password.');
      }

      // Resolve exact synthetic authEmail (supports rotated passwordVersion after Super Admin password reset)
      let authEmail = buildAuthEmail(cleanLoginId, 1);
      try {
        const lookupSnap = await getDoc(doc(db, 'loginLookup', cleanLoginId));
        if (lookupSnap.exists()) {
          const lookupData = lookupSnap.data() as {
            authEmail: string;
            status: 'active' | 'disabled';
          };
          if (lookupData.status === 'disabled') {
            throw new Error('This account has been disabled by Super Admin.');
          }
          if (lookupData.authEmail) {
            authEmail = lookupData.authEmail;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('disabled')) {
          throw err;
        }
        // Fall back to v1 deterministic email
      }

      const cred = await signInWithEmailAndPassword(auth, authEmail, password);
      const accountSnap = await getDoc(doc(db, 'userAccounts', cred.user.uid));
      if (!accountSnap.exists()) {
        await signOut(auth);
        throw new Error('User profile not found. Please contact Super Admin.');
      }
      const account = accountSnap.data() as OperatorUserAccount;
      if (account.status === 'disabled') {
        await signOut(auth);
        throw new Error('This account has been disabled by Super Admin.');
      }
      setUserAccount(account);
      return account;
    },
    []
  );

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUserAccount(null);
    setIsSuperAdmin(false);
    setManagedUsers([]);
  }, []);

  const resolveUniqueLoginId = useCallback(async (fullName: string): Promise<string> => {
    const base = generateLoginIdBase(fullName);
    const baseSnap = await getDoc(doc(db, 'loginLookup', base));
    if (!baseSnap.exists()) {
      return base;
    }

    for (let i = 1; i <= 99; i += 1) {
      const suffix = String(i).padStart(2, '0');
      const candidate = `${base.slice(0, 36)}${suffix}`;
      const snap = await getDoc(doc(db, 'loginLookup', candidate));
      if (!snap.exists()) {
        return candidate;
      }
    }

    return `${base.slice(0, 32)}${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  const createOperatorUser = useCallback(
    async ({
      fullName,
      manualPassword,
      recoveryEmail,
    }: {
      fullName: string;
      manualPassword?: string;
      recoveryEmail?: string;
    }): Promise<ProvisionedCredentials> => {
      if (!isSuperAdmin || !firebaseUser) {
        throw new Error('Only Super Admin can create new user accounts.');
      }

      const trimmedName = fullName.trim();
      if (trimmedName.length < 2) {
        throw new Error('Please enter the user Full Name first.');
      }

      const chosenPassword =
        manualPassword && manualPassword.trim().length > 0
          ? manualPassword.trim()
          : generateSecurePassword(12);

      if (chosenPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const uniqueLoginId = await resolveUniqueLoginId(trimmedName);
      const authEmail = buildAuthEmail(uniqueLoginId, 1);
      const matchRoomId = `kbd-${uniqueLoginId.toLowerCase()}`;

      // Provision Firebase Auth account on secondary app instance (keeps Super Admin signed in!)
      const secondaryAuth = getSecondaryAuth();
      const createdCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        authEmail,
        chosenPassword
      );
      const newUid = createdCred.user.uid;
      await signOut(secondaryAuth);

      const { scoreboardUrl, vmixOverlayUrl } = buildUserUrls(newUid);
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const accountPayload: OperatorUserAccount = {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        authEmail,
        ...(recoveryEmail?.trim() ? { recoveryEmail: recoveryEmail.trim() } : {}),
        role: 'user',
        matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
        status: 'active',
        passwordVersion: 1,
        createdByUid: firebaseUser.uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const initialScoreDoc = createInitialUserScoreboardDoc(newUid);
      const initialSettingsDoc = createInitialUserSettingsDoc(
        newUid,
        `${trimmedName.toUpperCase()} · LIVE KABADDI`
      );
      const initialScoreboardState: LiveOverlayState = {
        ...createDefaultOverlayState(matchRoomId),
        kabaddiTitle: initialSettingsDoc.kabaddiTitle,
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayersOnMat: 7,
        teamBPlayersOnMat: 7,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'userAccounts', newUid), accountPayload);
      batch.set(doc(db, 'loginLookup', uniqueLoginId), {
        loginId: uniqueLoginId,
        authEmail,
        uid: newUid,
        matchRoomId,
        passwordVersion: 1,
        status: 'active',
        updatedAt: nowIso,
      });
      batch.set(doc(db, 'scoreboards', matchRoomId), {
        roomId: matchRoomId,
        ownerUid: newUid,
        ownerLoginId: uniqueLoginId,
        teamAName: initialScoreboardState.teamAName,
        teamBName: initialScoreboardState.teamBName,
        teamAScore: 0,
        teamBScore: 0,
        stateJson: JSON.stringify(initialScoreboardState),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      // Isolated per-user Firestore hierarchy: /users/{uid}/...
      batch.set(doc(db, 'users', newUid, 'profile', 'main'), {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        authEmail,
        role: 'user',
        status: 'active',
        controlUrl: scoreboardUrl,
        scoreboardUrl: vmixOverlayUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      batch.set(doc(db, 'users', newUid, 'scoreboard', 'current'), initialScoreDoc);
      batch.set(doc(db, 'users', newUid, 'settings', 'main'), initialSettingsDoc);
      batch.set(doc(db, 'users', newUid, 'undoHistory', 'stack'), {
        ownerUid: newUid,
        entries: [],
        updatedAt: nowMs,
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${newUid}`);
      }

      return {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        password: chosenPassword,
        matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
      };
    },
    [isSuperAdmin, firebaseUser, resolveUniqueLoginId]
  );

  const signUpOperatorUser = useCallback(
    async ({
      fullName,
      password,
    }: {
      fullName: string;
      password?: string;
    }): Promise<ProvisionedCredentials> => {
      const trimmedName = fullName.trim();
      if (trimmedName.length < 2) {
        throw new Error('Please enter your Full Name (at least 2 characters).');
      }

      const chosenPassword =
        password && password.trim().length > 0
          ? password.trim()
          : generateSecurePassword(12);

      if (chosenPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const uniqueLoginId = await resolveUniqueLoginId(trimmedName);
      const authEmail = buildAuthEmail(uniqueLoginId, 1);
      const matchRoomId = `kbd-${uniqueLoginId.toLowerCase()}`;

      // Provision Firebase Auth account on primary auth so Firestore owner-create rules authenticate cleanly
      const createdCred = await createUserWithEmailAndPassword(auth, authEmail, chosenPassword);
      const newUid = createdCred.user.uid;
      const { scoreboardUrl, vmixOverlayUrl } = buildUserUrls(newUid);

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const accountPayload: OperatorUserAccount = {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        authEmail,
        role: 'user',
        matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
        status: 'active',
        passwordVersion: 1,
        createdByUid: newUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const initialScoreDoc = createInitialUserScoreboardDoc(newUid);
      const initialSettingsDoc = createInitialUserSettingsDoc(
        newUid,
        `${trimmedName.toUpperCase()} · LIVE KABADDI`
      );
      const initialScoreboardState: LiveOverlayState = {
        ...createDefaultOverlayState(matchRoomId),
        kabaddiTitle: initialSettingsDoc.kabaddiTitle,
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayersOnMat: 7,
        teamBPlayersOnMat: 7,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'userAccounts', newUid), accountPayload);
      batch.set(doc(db, 'loginLookup', uniqueLoginId), {
        loginId: uniqueLoginId,
        authEmail,
        uid: newUid,
        matchRoomId,
        passwordVersion: 1,
        status: 'active',
        updatedAt: nowIso,
      });
      batch.set(doc(db, 'scoreboards', matchRoomId), {
        roomId: matchRoomId,
        ownerUid: newUid,
        ownerLoginId: uniqueLoginId,
        teamAName: initialScoreboardState.teamAName,
        teamBName: initialScoreboardState.teamBName,
        teamAScore: 0,
        teamBScore: 0,
        stateJson: JSON.stringify(initialScoreboardState),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      // Isolated per-user Firestore hierarchy: /users/{uid}/...
      batch.set(doc(db, 'users', newUid, 'profile', 'main'), {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        authEmail,
        role: 'user',
        status: 'active',
        controlUrl: scoreboardUrl,
        scoreboardUrl: vmixOverlayUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      batch.set(doc(db, 'users', newUid, 'scoreboard', 'current'), initialScoreDoc);
      batch.set(doc(db, 'users', newUid, 'settings', 'main'), initialSettingsDoc);
      batch.set(doc(db, 'users', newUid, 'undoHistory', 'stack'), {
        ownerUid: newUid,
        entries: [],
        updatedAt: nowMs,
      });

      try {
        await batch.commit();
      } catch (err) {
        await signOut(auth).catch(() => {});
        handleFirestoreError(err, OperationType.WRITE, `users/${newUid}`);
      }

      // Sign out immediately after registration so user can save credentials & log in cleanly
      await signOut(auth);
      setUserAccount(null);

      return {
        uid: newUid,
        fullName: trimmedName,
        loginId: uniqueLoginId,
        password: chosenPassword,
        matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
      };
    },
    [resolveUniqueLoginId]
  );

  const resetOperatorPassword = useCallback(
    async (
      account: OperatorUserAccount,
      manualPassword?: string
    ): Promise<ProvisionedCredentials> => {
      if (!isSuperAdmin || !firebaseUser) {
        throw new Error('Only Super Admin can reset user passwords.');
      }

      const nextPassword =
        manualPassword && manualPassword.trim().length > 0
          ? manualPassword.trim()
          : generateSecurePassword(12);

      if (nextPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }

      const nextVersion = (account.passwordVersion || 1) + 1;
      const nextAuthEmail = buildAuthEmail(account.loginId, nextVersion);

      // Create rotated Firebase Auth credential via secondary app (keeps Super Admin signed in & stores ZERO plaintext password!)
      const secondaryAuth = getSecondaryAuth();
      const createdCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        nextAuthEmail,
        nextPassword
      );
      const newUid = createdCred.user.uid;
      await signOut(secondaryAuth);

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const { scoreboardUrl, vmixOverlayUrl } = buildUserUrls(newUid);

      const rotatedAccount: OperatorUserAccount = {
        uid: newUid,
        fullName: account.fullName,
        loginId: account.loginId,
        authEmail: nextAuthEmail,
        ...(account.recoveryEmail ? { recoveryEmail: account.recoveryEmail } : {}),
        role: 'user',
        matchRoomId: account.matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
        status: 'active',
        passwordVersion: nextVersion,
        createdByUid: account.createdByUid,
        createdAt: account.createdAt,
        updatedAt: nowIso,
      };

      // Preserve all existing isolated per-user scoreboard/settings/undo docs under the new rotated UID
      const [oldScoreSnap, oldSettingsSnap, oldUndoSnap, sbSnap] = await Promise.all([
        getDoc(doc(db, 'users', account.uid, 'scoreboard', 'current')).catch(() => null),
        getDoc(doc(db, 'users', account.uid, 'settings', 'main')).catch(() => null),
        getDoc(doc(db, 'users', account.uid, 'undoHistory', 'stack')).catch(() => null),
        getDoc(doc(db, 'scoreboards', account.matchRoomId)).catch(() => null),
      ]);

      const migratedScoreDoc: UserLiveScoreboardDoc =
        oldScoreSnap && oldScoreSnap.exists()
          ? { ...(oldScoreSnap.data() as UserLiveScoreboardDoc), ownerUid: newUid, updatedAt: nowMs }
          : createInitialUserScoreboardDoc(newUid);

      const migratedSettingsDoc: UserScoreboardSettingsDoc =
        oldSettingsSnap && oldSettingsSnap.exists()
          ? {
              ...(oldSettingsSnap.data() as UserScoreboardSettingsDoc),
              ownerUid: newUid,
              updatedAt: nowMs,
            }
          : createInitialUserSettingsDoc(newUid, `${account.fullName.toUpperCase()} · LIVE KABADDI`);

      const migratedUndoDoc: UserUndoHistoryDoc =
        oldUndoSnap && oldUndoSnap.exists()
          ? { ...(oldUndoSnap.data() as UserUndoHistoryDoc), ownerUid: newUid, updatedAt: nowMs }
          : { ownerUid: newUid, entries: [], updatedAt: nowMs };

      const batch = writeBatch(db);
      batch.set(doc(db, 'userAccounts', newUid), rotatedAccount);
      batch.delete(doc(db, 'userAccounts', account.uid));
      batch.set(doc(db, 'loginLookup', account.loginId), {
        loginId: account.loginId,
        authEmail: nextAuthEmail,
        uid: newUid,
        matchRoomId: account.matchRoomId,
        passwordVersion: nextVersion,
        status: 'active',
        updatedAt: nowIso,
      });

      batch.set(doc(db, 'users', newUid, 'profile', 'main'), {
        uid: newUid,
        fullName: account.fullName,
        loginId: account.loginId,
        authEmail: nextAuthEmail,
        role: 'user',
        status: 'active',
        controlUrl: scoreboardUrl,
        scoreboardUrl: vmixOverlayUrl,
        createdAt: account.createdAt,
        updatedAt: nowIso,
      });
      batch.set(doc(db, 'users', newUid, 'scoreboard', 'current'), migratedScoreDoc);
      batch.set(doc(db, 'users', newUid, 'settings', 'main'), migratedSettingsDoc);
      batch.set(doc(db, 'users', newUid, 'undoHistory', 'stack'), migratedUndoDoc);

      if (sbSnap && sbSnap.exists()) {
        const sbData = sbSnap.data();
        batch.set(doc(db, 'scoreboards', account.matchRoomId), {
          ...sbData,
          ownerUid: newUid,
          updatedAt: nowIso,
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${newUid}`);
      }

      return {
        uid: newUid,
        fullName: account.fullName,
        loginId: account.loginId,
        password: nextPassword,
        matchRoomId: account.matchRoomId,
        scoreboardUrl,
        vmixOverlayUrl,
        isPasswordReset: true,
      };
    },
    [isSuperAdmin, firebaseUser]
  );

  const toggleOperatorStatus = useCallback(
    async (account: OperatorUserAccount) => {
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can update account status.');
      }
      const nextStatus = account.status === 'active' ? 'disabled' : 'active';
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      batch.update(doc(db, 'userAccounts', account.uid), {
        status: nextStatus,
        updatedAt: nowIso,
      });
      batch.update(doc(db, 'loginLookup', account.loginId), {
        status: nextStatus,
        updatedAt: nowIso,
      });
      const profileRef = doc(db, 'users', account.uid, 'profile', 'main');
      const profileSnap = await getDoc(profileRef).catch(() => null);
      if (profileSnap && profileSnap.exists()) {
        batch.update(profileRef, {
          status: nextStatus,
          updatedAt: nowIso,
        });
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `userAccounts/${account.uid}`);
      }
    },
    [isSuperAdmin]
  );

  const deleteOperatorAccount = useCallback(
    async (account: OperatorUserAccount) => {
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can remove user accounts.');
      }
      const batch = writeBatch(db);
      batch.delete(doc(db, 'userAccounts', account.uid));
      batch.delete(doc(db, 'loginLookup', account.loginId));
      batch.delete(doc(db, 'scoreboards', account.matchRoomId));
      batch.delete(doc(db, 'users', account.uid, 'profile', 'main'));
      batch.delete(doc(db, 'users', account.uid, 'scoreboard', 'current'));
      batch.delete(doc(db, 'users', account.uid, 'settings', 'main'));
      batch.delete(doc(db, 'users', account.uid, 'undoHistory', 'stack'));
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `userAccounts/${account.uid}`);
      }
    },
    [isSuperAdmin]
  );

  const saveUserScoreboardSnapshot = useCallback(
    async (
      roomId: string,
      ownerUid: string,
      ownerLoginId: string,
      state: LiveOverlayState
    ) => {
      const ref = doc(db, 'scoreboards', roomId);
      const nowIso = new Date().toISOString();
      const serialized = JSON.stringify(state).slice(0, 15500);
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, {
            teamAName: (state.teamAName || 'TEAM A').slice(0, 60),
            teamBName: (state.teamBName || 'TEAM B').slice(0, 60),
            teamAScore: Math.max(0, Math.min(999, Math.round(state.teamAScore || 0))),
            teamBScore: Math.max(0, Math.min(999, Math.round(state.teamBScore || 0))),
            stateJson: serialized,
            updatedAt: nowIso,
          });
        } else {
          await setDoc(ref, {
            roomId,
            ownerUid,
            ownerLoginId,
            teamAName: (state.teamAName || 'TEAM A').slice(0, 60),
            teamBName: (state.teamBName || 'TEAM B').slice(0, 60),
            teamAScore: Math.max(0, Math.min(999, Math.round(state.teamAScore || 0))),
            teamBScore: Math.max(0, Math.min(999, Math.round(state.teamBScore || 0))),
            stateJson: serialized,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } catch {
        // Non-blocking persistence fallback so live WebSocket sync never stalls
      }
    },
    []
  );

  const loadUserScoreboardSnapshot = useCallback(
    async (roomId: string): Promise<LiveOverlayState | null> => {
      try {
        const snap = await getDoc(doc(db, 'scoreboards', roomId));
        if (!snap.exists()) return null;
        const data = snap.data() as { stateJson?: string };
        if (!data?.stateJson) return null;
        const parsed = JSON.parse(data.stateJson) as Partial<LiveOverlayState>;
        return { ...createDefaultOverlayState(roomId), ...parsed };
      } catch {
        return null;
      }
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      authReady,
      isSuperAdmin,
      userAccount,
      managedUsers,
      usersLoading,
      signInSuperAdminWithGoogle,
      signInOperatorWithLoginId,
      signUpOperatorUser,
      signOutUser,
      resolveUniqueLoginId,
      createOperatorUser,
      resetOperatorPassword,
      toggleOperatorStatus,
      deleteOperatorAccount,
      saveUserScoreboardSnapshot,
      loadUserScoreboardSnapshot,
    }),
    [
      firebaseUser,
      authReady,
      isSuperAdmin,
      userAccount,
      managedUsers,
      usersLoading,
      signInSuperAdminWithGoogle,
      signInOperatorWithLoginId,
      signUpOperatorUser,
      signOutUser,
      resolveUniqueLoginId,
      createOperatorUser,
      resetOperatorPassword,
      toggleOperatorStatus,
      deleteOperatorAccount,
      saveUserScoreboardSnapshot,
      loadUserScoreboardSnapshot,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
