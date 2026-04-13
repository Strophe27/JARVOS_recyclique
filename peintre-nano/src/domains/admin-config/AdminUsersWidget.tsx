import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  AlertCircle,
  History,
  KeyRound,
  LogIn,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  User,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getAdminGroupMembershipsForUser,
  getAdminGroupsList,
  type AdminGroupMembershipRowDto,
} from '../../api/admin-groups-client';
import { fetchUsersMeForAdminDashboard } from '../../api/admin-legacy-dashboard-client';
import {
  canonicalUserIdForPresence,
  createUserV1,
  getAdminUserDetailById,
  getAdminUserHistory,
  getAdminUsersList,
  getAdminUsersStatuses,
  postAdminUserForcePassword,
  postAdminUserResetPassword,
  postAdminUserResetPin,
  putAdminUserActivation,
  putAdminUserGroups,
  putAdminUserRole,
  updateUserV1,
  type AdminUserActivityEventDto,
  type AdminUserDetailV1Dto,
  type AdminUserHistoryPageDto,
  type AdminUserListRowDto,
  type AdminUserStatusOnlineRowDto,
  type AdminUserStatusesBundleDto,
} from '../../api/admin-users-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

const PAGE_LIMIT = 20;
const HISTORY_LIMIT = 20;

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les rôles' },
  { value: 'user', label: 'Bénévole' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'super-admin', label: 'Super administrateur' },
];

const WORKFLOW_STATUS_EDIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'active', label: 'Actif' },
  { value: 'pending', label: 'En attente' },
];

const ROLE_LABEL: Record<string, string> = {
  user: 'Bénévole',
  admin: 'Administrateur',
  'super-admin': 'Super administrateur',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  active: 'Actif',
};

const EVENT_KIND_LABEL: Record<string, string> = {
  ADMINISTRATION: 'Administration',
  LOGIN: 'Connexion',
  'SESSION CAISSE': 'Session caisse',
  VENTE: 'Vente',
  DEPOT: 'Dépôt',
};

const HISTORY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ADMINISTRATION', label: 'Administration' },
  { value: 'LOGIN', label: 'Connexion' },
  { value: 'SESSION CAISSE', label: 'Session caisse' },
  { value: 'VENTE', label: 'Vente' },
  { value: 'DEPOT', label: 'Dépôt' },
];

const USER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'approved', label: STATUS_LABEL.approved },
  { value: 'rejected', label: STATUS_LABEL.rejected },
  { value: 'active', label: STATUS_LABEL.active },
];

const GROUPS_CATALOG_PAGE = 500;
const GROUPS_CATALOG_SAFETY_MAX = 8000;

function dayStartIso(d: string): string | undefined {
  const t = d.trim();
  if (!t) return undefined;
  return `${t}T00:00:00.000Z`;
}

function dayEndIso(d: string): string | undefined {
  const t = d.trim();
  if (!t) return undefined;
  return `${t}T23:59:59.999Z`;
}

function eventHistoryColor(eventType: string): string {
  switch (eventType) {
    case 'ADMINISTRATION':
      return 'blue';
    case 'VENTE':
      return 'green';
    case 'DEPOT':
      return 'orange';
    case 'LOGIN':
      return 'grape';
    case 'SESSION CAISSE':
      return 'cyan';
    default:
      return 'gray';
  }
}

function eventHistoryBullet(eventType: string): ReactNode {
  const c = eventHistoryColor(eventType);
  let icon: ReactNode = <Settings size={14} />;
  switch (eventType) {
    case 'ADMINISTRATION':
      icon = <Shield size={14} />;
      break;
    case 'VENTE':
      icon = <ShoppingCart size={14} />;
      break;
    case 'DEPOT':
      icon = <Truck size={14} />;
      break;
    case 'LOGIN':
      icon = <LogIn size={14} />;
      break;
    case 'SESSION CAISSE':
      icon = <Settings size={14} />;
      break;
    default:
      break;
  }
  return (
    <Box c={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Box>
  );
}

function displayName(u: Pick<AdminUserListRowDto, 'full_name' | 'first_name' | 'last_name' | 'username' | 'id'>): string {
  if (u.full_name?.trim()) return u.full_name.trim();
  const parts = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return u.username?.trim() || u.id;
}

function displayNameDetail(d: AdminUserDetailV1Dto): string {
  const parts = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return d.username?.trim() || d.id;
}

function atUsername(u: Pick<AdminUserListRowDto, 'username'> | Pick<AdminUserDetailV1Dto, 'username'>): string | null {
  const raw = u.username?.trim();
  if (!raw) return null;
  return raw.replace(/^@+/, '');
}

function matchesSearch(u: AdminUserListRowDto, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const hay = [u.username, u.first_name, u.last_name, u.full_name, u.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(n);
}

function presenceTooltip(row?: AdminUserStatusOnlineRowDto): string {
  if (!row) return 'Aucune information de présence pour ce compte.';
  if (row.is_online) return 'Vu récemment sur le service.';
  if (row.last_login) {
    const m = row.minutes_since_login;
    if (m != null && m < 60) return `Dernière activité il y a environ ${m} min.`;
    if (m != null) {
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r > 0
        ? `Dernière activité il y a environ ${h} h ${r} min.`
        : `Dernière activité il y a environ ${h} h.`;
    }
    return 'Dernière activité enregistrée.';
  }
  return "Pas encore d'activité enregistrée.";
}

function presenceLabel(row?: AdminUserStatusOnlineRowDto): string {
  if (!row) return '—';
  return row.is_online ? 'En ligne' : 'Hors ligne';
}

function eventKindLabel(t: string): string {
  return EVENT_KIND_LABEL[t] ?? t;
}

function formatField(v: string | null | undefined): string {
  if (v == null || !String(v).trim()) return '—';
  return String(v).trim();
}

const SITE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Affichage sobre : pas d'UUID complet en brut dans la fiche. */
function formatSiteRefForProfile(siteId: string | null | undefined): string {
  const t = siteId?.trim();
  if (!t) return '—';
  if (SITE_UUID_RE.test(t)) {
    return `Réf. interne ${t.slice(0, 4)}…${t.slice(-4)}`;
  }
  return t;
}

/**
 * Même grille que le forçage super-admin côté UI (alignée sur la validation serveur Recyclique).
 * Ne garantit pas l'acceptation : le serveur reste autorité (ex. mot de passe trop commun).
 */
function passwordPolicyLocalIssues(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) errors.push('une majuscule');
  if (!/[a-z]/.test(pwd)) errors.push('une minuscule');
  if (!/\d/.test(pwd)) errors.push('un chiffre');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push('un caractère spécial (! @ # …)');
  return errors;
}

function historyEventsMatchQuery(ev: AdminUserActivityEventDto, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const hay = `${ev.event_type} ${ev.description}`.toLowerCase();
  return hay.includes(n);
}

export function AdminUsersWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  useContextEnvelope();

  const [skip, setSkip] = useState(0);
  const [rows, setRows] = useState<readonly AdminUserListRowDto[]>([]);
  /** true au montage : évite le libellé « aucun compte » avant le premier chargement. */
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selected, setSelected] = useState<AdminUserListRowDto | null>(null);

  const [statuses, setStatuses] = useState<AdminUserStatusesBundleDto | null>(null);
  const [statusesBusy, setStatusesBusy] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminUserDetailV1Dto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [detailTab, setDetailTab] = useState<string | null>('profile');
  const [histSkip, setHistSkip] = useState(0);
  const [historyPage, setHistoryPage] = useState<AdminUserHistoryPageDto | null>(null);
  const [histBusy, setHistBusy] = useState(false);
  const [histError, setHistError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [histDraftFrom, setHistDraftFrom] = useState('');
  const [histDraftTo, setHistDraftTo] = useState('');
  const [histDraftType, setHistDraftType] = useState<string | null>(null);
  const [histApplied, setHistApplied] = useState<{
    readonly date_from?: string;
    readonly date_to?: string;
    readonly event_type?: string;
  }>({});
  const [histTextFilter, setHistTextFilter] = useState('');

  const [viewerSuperAdmin, setViewerSuperAdmin] = useState(false);
  const [resetPwdBusy, setResetPwdBusy] = useState(false);
  const [resetPinBusy, setResetPinBusy] = useState(false);
  const [resetPinConfirmOpen, setResetPinConfirmOpen] = useState(false);
  const [forcePwdOpen, setForcePwdOpen] = useState(false);
  const [forcePwdBusy, setForcePwdBusy] = useState(false);
  const [fPwd, setFPwd] = useState('');
  const [fPwd2, setFPwd2] = useState('');
  const [fReason, setFReason] = useState('');
  const [fPwdErr, setFPwdErr] = useState<string | null>(null);

  const [userGroupMemberships, setUserGroupMemberships] = useState<readonly AdminGroupMembershipRowDto[]>([]);
  const [userGroupsBusy, setUserGroupsBusy] = useState(false);
  const [userGroupsErr, setUserGroupsErr] = useState<string | null>(null);
  const [userGroupsPartial, setUserGroupsPartial] = useState(false);

  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [groupsSelectOptions, setGroupsSelectOptions] = useState<{ value: string; label: string }[]>([]);
  const [groupsCatalogBusy, setGroupsCatalogBusy] = useState(false);
  const [groupsSaveBusy, setGroupsSaveBusy] = useState(false);
  const [groupsDraftIds, setGroupsDraftIds] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cFirst, setCFirst] = useState('');
  const [cLast, setCLast] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cSkills, setCSkills] = useState('');
  const [cAvail, setCAvail] = useState('');
  const [cSiteId, setCSiteId] = useState('');
  const [cActive, setCActive] = useState(true);
  const [cRole, setCRole] = useState('user');
  const [cStatus, setCStatus] = useState('active');

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [eUsername, setEUsername] = useState('');
  const [eFirst, setEFirst] = useState('');
  const [eLast, setELast] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eNotes, setENotes] = useState('');
  const [eSkills, setESkills] = useState('');
  const [eAvail, setEAvail] = useState('');

  const [editRole, setEditRole] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editWorkflow, setEditWorkflow] = useState('');

  const presencePollRef = useRef<number | null>(null);

  const statusByUserId = useMemo(() => {
    const m = new Map<string, AdminUserStatusOnlineRowDto>();
    if (!statuses) return m;
    for (const s of statuses.user_statuses) {
      m.set(canonicalUserIdForPresence(s.user_id), s);
    }
    return m;
  }, [statuses]);

  const loadStatuses = useCallback(async () => {
    setStatusesBusy(true);
    setStatusesError(null);
    const res = await getAdminUsersStatuses(auth);
    setStatusesBusy(false);
    if (!res.ok) {
      setStatuses(null);
      setStatusesError(res.detail);
      return;
    }
    setStatuses(res.data);
  }, [auth]);

  const loadList = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await getAdminUsersList(auth, {
      skip,
      limit: PAGE_LIMIT,
      role: roleFilter || undefined,
      user_status: userStatusFilter || undefined,
    });
    if (!res.ok) {
      setRows([]);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setRows(res.data);
    setBusy(false);
  }, [auth, skip, roleFilter, userStatusFilter]);

  const loadGroupsCatalog = useCallback(async () => {
    setGroupsCatalogBusy(true);
    const next: { value: string; label: string }[] = [];
    let skipCat = 0;
    while (skipCat < GROUPS_CATALOG_SAFETY_MAX) {
      const res = await getAdminGroupsList(auth, { skip: skipCat, limit: GROUPS_CATALOG_PAGE });
      if (!res.ok) {
        setFeedback({ kind: 'error', text: res.detail });
        setGroupsCatalogBusy(false);
        return;
      }
      for (const g of res.data) {
        const base =
          g.display_name?.trim() || g.name?.trim() || g.key?.trim() || g.id;
        const k = g.key?.trim();
        const label = k && k !== base ? `${base} (${k})` : base;
        next.push({ value: g.id, label });
      }
      if (res.data.length < GROUPS_CATALOG_PAGE) break;
      skipCat += GROUPS_CATALOG_PAGE;
    }
    next.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    setGroupsSelectOptions(next);
    setGroupsCatalogBusy(false);
  }, [auth]);

  const openGroupsModal = useCallback(() => {
    setGroupsDraftIds(userGroupMemberships.map((m) => m.id));
    setGroupsModalOpen(true);
    void loadGroupsCatalog();
  }, [loadGroupsCatalog, userGroupMemberships]);

  const handleSaveGroups = useCallback(async () => {
    if (!selected) return;
    setFeedback(null);
    setGroupsSaveBusy(true);
    const res = await putAdminUserGroups(auth, selected.id, { group_ids: groupsDraftIds });
    setGroupsSaveBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
    setGroupsModalOpen(false);
    setUserGroupsBusy(true);
    const m = await getAdminGroupMembershipsForUser(auth, selected.id);
    setUserGroupsBusy(false);
    if (m.ok) {
      setUserGroupMemberships(m.memberships);
      setUserGroupsPartial(m.partial);
      setUserGroupsErr(null);
    } else {
      setUserGroupsErr(m.detail);
    }
  }, [auth, groupsDraftIds, selected]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadList(), loadStatuses()]);
  }, [loadList, loadStatuses]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const me = await fetchUsersMeForAdminDashboard(auth);
      if (cancelled) return;
      const r = me?.role?.trim().toLowerCase().replace(/_/g, '-');
      setViewerSuperAdmin(r === 'super-admin');
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  useEffect(() => {
    presencePollRef.current = window.setInterval(() => void loadStatuses(), 30_000);
    return () => {
      if (presencePollRef.current != null) window.clearInterval(presencePollRef.current);
    };
  }, [loadStatuses]);

  useEffect(() => {
    setSelected(null);
  }, [skip, roleFilter, userStatusFilter]);

  useEffect(() => {
    setHistSkip(0);
    setHistoryPage(null);
    setHistError(null);
    setDetailTab('profile');
    setHistDraftFrom('');
    setHistDraftTo('');
    setHistDraftType(null);
    setHistApplied({});
    setHistTextFilter('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) {
      setUserGroupMemberships([]);
      setUserGroupsErr(null);
      setUserGroupsPartial(false);
      setUserGroupsBusy(false);
      return;
    }
    let cancelled = false;
    setUserGroupsBusy(true);
    setUserGroupsErr(null);
    void (async () => {
      const res = await getAdminGroupMembershipsForUser(auth, selected.id);
      if (cancelled) return;
      setUserGroupsBusy(false);
      if (res.ok) {
        setUserGroupMemberships(res.memberships);
        setUserGroupsPartial(res.partial);
      } else {
        setUserGroupMemberships([]);
        setUserGroupsErr(res.detail);
        setUserGroupsPartial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, selected?.id]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void (async () => {
      const res = await getAdminUserDetailById(auth, selected.id);
      if (cancelled) return;
      setDetailLoading(false);
      if (res.ok) {
        setDetail(res.data);
        setDetailError(null);
      } else {
        setDetail(null);
        setDetailError(res.detail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, selected?.id]);

  useEffect(() => {
    if (detailTab !== 'history' || !selected) return;
    let cancelled = false;
    setHistBusy(true);
    setHistError(null);
    void (async () => {
      const res = await getAdminUserHistory(auth, selected.id, {
        skip: histSkip,
        limit: HISTORY_LIMIT,
        date_from: histApplied.date_from,
        date_to: histApplied.date_to,
        event_type: histApplied.event_type,
      });
      if (cancelled) return;
      setHistBusy(false);
      if (res.ok) {
        setHistoryPage(res.data);
        setHistError(null);
      } else {
        setHistoryPage(null);
        setHistError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, detailTab, histApplied, histSkip, selected?.id]);

  useEffect(() => {
    if (!detail) {
      setEditRole('');
      setEditActive(true);
      setEditWorkflow('');
      return;
    }
    setEditRole(detail.role);
    setEditActive(detail.is_active);
    setEditWorkflow(detail.status);
  }, [detail]);

  const openEditModal = useCallback(() => {
    if (!detail) return;
    setEUsername(detail.username ?? '');
    setEFirst(detail.first_name ?? '');
    setELast(detail.last_name ?? '');
    setEEmail(detail.email ?? '');
    setEPhone(detail.phone_number ?? '');
    setEAddress(detail.address ?? '');
    setENotes(detail.notes ?? '');
    setESkills(detail.skills ?? '');
    setEAvail(detail.availability ?? '');
    setEditOpen(true);
  }, [detail]);

  const createPasswordIssues = useMemo(() => passwordPolicyLocalIssues(cPassword), [cPassword]);

  const handleCreateUser = useCallback(async () => {
    setFeedback(null);
    const pwdIssues = passwordPolicyLocalIssues(cPassword);
    if (pwdIssues.length) {
      setFeedback({ kind: 'error', text: `Mot de passe insuffisant : ${pwdIssues.join(', ')}.` });
      return;
    }
    if (!cUsername.trim()) return;
    setCreateBusy(true);
    const res = await createUserV1(auth, {
      username: cUsername.trim(),
      password: cPassword,
      first_name: cFirst.trim() || null,
      last_name: cLast.trim() || null,
      email: cEmail.trim() || null,
      phone_number: cPhone.trim() || null,
      address: cAddress.trim() || null,
      notes: cNotes.trim() || null,
      skills: cSkills.trim() || null,
      availability: cAvail.trim() || null,
      role: cRole,
      status: cStatus,
      is_active: cActive,
      ...(SITE_UUID_RE.test(cSiteId.trim()) ? { site_id: cSiteId.trim() } : {}),
    });
    setCreateBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: 'Compte créé.' });
    setCreateOpen(false);
    setCUsername('');
    setCPassword('');
    setCFirst('');
    setCLast('');
    setCEmail('');
    setCPhone('');
    setCAddress('');
    setCNotes('');
    setCSkills('');
    setCAvail('');
    setCSiteId('');
    setCActive(true);
    setCRole('user');
    setCStatus('active');
    await refreshAll();
  }, [
    auth,
    cActive,
    cAddress,
    cAvail,
    cEmail,
    cFirst,
    cLast,
    cNotes,
    cPassword,
    cPhone,
    cRole,
    cSiteId,
    cSkills,
    cStatus,
    cUsername,
    refreshAll,
  ]);

  const createSubmitDisabled =
    !cUsername.trim() || createPasswordIssues.length > 0 || createBusy;

  const handleSaveProfile = useCallback(async () => {
    if (!selected || !detail) return;
    setFeedback(null);
    setEditBusy(true);
    const usernameNext = eUsername.trim();
    const usernamePrev = (detail.username ?? '').trim();
    const res = await updateUserV1(auth, selected.id, {
      ...(usernameNext !== usernamePrev ? { username: usernameNext || null } : {}),
      first_name: eFirst.trim() || null,
      last_name: eLast.trim() || null,
      email: eEmail.trim() || null,
      phone_number: ePhone.trim() || null,
      address: eAddress.trim() || null,
      notes: eNotes.trim() || null,
      skills: eSkills.trim() || null,
      availability: eAvail.trim() || null,
    });
    setEditBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setDetail(res.data);
    setFeedback({ kind: 'ok', text: 'Fiche mise à jour.' });
    setEditOpen(false);
    await loadList();
  }, [auth, detail, eAddress, eAvail, eEmail, eFirst, eLast, eNotes, ePhone, eSkills, eUsername, loadList, selected]);

  const handleApplyRole = useCallback(async () => {
    if (!selected) return;
    setFeedback(null);
    setMutationBusy(true);
    const res = await putAdminUserRole(auth, selected.id, editRole);
    setMutationBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
    await loadList();
    const d = await getAdminUserDetailById(auth, selected.id);
    if (d.ok) setDetail(d.data);
  }, [auth, editRole, loadList, selected]);

  const handleApplyActivation = useCallback(async () => {
    if (!selected || !detail) return;
    setFeedback(null);
    setMutationBusy(true);
    const res = await putAdminUserActivation(auth, selected.id, {
      status: editWorkflow,
      is_active: editActive,
      reason: null,
    });
    setMutationBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
    await loadList();
    const d = await getAdminUserDetailById(auth, selected.id);
    if (d.ok) setDetail(d.data);
  }, [auth, editActive, editWorkflow, loadList, selected]);

  const handleApplyWorkflow = useCallback(async () => {
    if (!selected) return;
    setFeedback(null);
    setMutationBusy(true);
    const res = await updateUserV1(auth, selected.id, { status: editWorkflow });
    setMutationBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: 'Dossier mis à jour.' });
    await loadList();
    const d = await getAdminUserDetailById(auth, selected.id);
    if (d.ok) setDetail(d.data);
  }, [auth, editWorkflow, loadList, selected]);

  const handleResetPasswordEmail = useCallback(async () => {
    if (!selected) return;
    setFeedback(null);
    setResetPwdBusy(true);
    const res = await postAdminUserResetPassword(auth, selected.id);
    setResetPwdBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
  }, [auth, selected]);

  const handleConfirmResetPin = useCallback(async () => {
    if (!selected) return;
    setFeedback(null);
    setResetPinBusy(true);
    const res = await postAdminUserResetPin(auth, selected.id);
    setResetPinBusy(false);
    setResetPinConfirmOpen(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
  }, [auth, selected]);

  const handleSubmitForcePassword = useCallback(async () => {
    if (!selected) return;
    setFPwdErr(null);
    const errs = passwordPolicyLocalIssues(fPwd);
    if (errs.length) {
      setFPwdErr(`Exigences : ${errs.join(', ')}.`);
      return;
    }
    if (fPwd !== fPwd2) {
      setFPwdErr('Les deux saisies du mot de passe ne correspondent pas.');
      return;
    }
    setFeedback(null);
    setForcePwdBusy(true);
    const res = await postAdminUserForcePassword(auth, selected.id, {
      new_password: fPwd,
      reason: fReason.trim() || null,
    });
    setForcePwdBusy(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.detail });
      return;
    }
    setFeedback({ kind: 'ok', text: res.message });
    setForcePwdOpen(false);
    setFPwd('');
    setFPwd2('');
    setFReason('');
  }, [auth, fPwd, fPwd2, fReason, selected]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
  }, [searchDraft]);

  const applyHistFilters = useCallback(() => {
    setHistApplied({
      date_from: dayStartIso(histDraftFrom),
      date_to: dayEndIso(histDraftTo),
      event_type: histDraftType ?? undefined,
    });
    setHistSkip(0);
  }, [histDraftFrom, histDraftTo, histDraftType]);

  const clearHistFilters = useCallback(() => {
    setHistDraftFrom('');
    setHistDraftTo('');
    setHistDraftType(null);
    setHistApplied({});
    setHistSkip(0);
  }, []);

  const hasHistFilters = useMemo(
    () => !!(histApplied.date_from || histApplied.date_to || histApplied.event_type),
    [histApplied.date_from, histApplied.date_to, histApplied.event_type],
  );

  const displayedHistoryEvents = useMemo(() => {
    if (!historyPage) return [];
    return historyPage.events.filter((ev) => historyEventsMatchQuery(ev, histTextFilter));
  }, [historyPage, histTextFilter]);

  const filteredRows = useMemo(
    () => rows.filter((u) => matchesSearch(u, appliedSearch)),
    [rows, appliedSearch],
  );

  const rangeLabel =
    busy && rows.length === 0
      ? 'Chargement...'
      : rows.length === 0
        ? 'Aucun compte à afficher pour cette page'
        : appliedSearch.trim()
          ? `${filteredRows.length} affiché(s) sur ${rows.length} chargé(s) (tranche ${skip + 1}–${skip + rows.length})`
          : `Lignes ${skip + 1} à ${skip + rows.length}`;

  const canNext = rows.length === PAGE_LIMIT;
  const canPrev = skip >= PAGE_LIMIT;

  const headerTitle = selected ? (detail ? displayNameDetail(detail) : displayName(selected)) : null;
  const headerAt = selected ? atUsername(detail ?? selected) : null;
  const avatarLetter = (headerTitle ?? 'U').trim().charAt(0).toUpperCase() || 'U';

  const mergedRole = detail?.role ?? selected?.role;
  const mergedStatus = detail?.status ?? selected?.status;
  const mergedActive = detail?.is_active ?? selected?.is_active;
  const mergedUsername = detail?.username ?? selected?.username;
  const mergedEmail = detail?.email ?? selected?.email;
  const mergedPhone = detail?.phone_number ?? selected?.phone_number;
  const mergedAddress = detail?.address ?? selected?.address;
  const mergedNotes = detail?.notes ?? selected?.notes;
  const mergedSkills = detail?.skills ?? selected?.skills;
  const mergedAvail = detail?.availability ?? selected?.availability;
  const mergedSite = detail?.site_id ?? selected?.site_id;
  const mergedCreated = detail?.created_at ?? selected?.created_at;
  const mergedUpdated = detail?.updated_at ?? selected?.updated_at;
  const mergedFirst = detail?.first_name ?? selected?.first_name;
  const mergedLast = detail?.last_name ?? selected?.last_name;
  const headerPresence = selected
    ? statusByUserId.get(canonicalUserIdForPresence(selected.id))
    : undefined;

  return (
    <Stack gap="md" data-testid="widget-admin-users-demo">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={1}>Gestion des Utilisateurs</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Gérez les utilisateurs et leurs rôles dans le système.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="filled"
            leftSection={<UserPlus size={16} />}
            onClick={() => {
              setFeedback(null);
              setCreateOpen(true);
            }}
            data-testid="admin-users-create-open"
          >
            Créer un utilisateur
          </Button>
          <Button
            variant="light"
            leftSection={<RefreshCw size={16} />}
            onClick={() => void refreshAll()}
            loading={busy || statusesBusy}
            data-testid="admin-users-refresh"
          >
            Actualiser
          </Button>
        </Group>
      </Group>

      {error ? <CashflowClientErrorAlert error={error} /> : null}
      {feedback ? (
        <Text size="sm" c={feedback.kind === 'ok' ? 'green' : 'red'} data-testid="admin-users-feedback">
          {feedback.text}
        </Text>
      ) : null}

      {statusesError ? (
        <Alert
          color="orange"
          title="Erreur de statuts"
          icon={<AlertCircle size={18} />}
          data-testid="admin-users-presence-error"
        >
          {statusesError}
        </Alert>
      ) : null}

      {statuses && statuses.user_statuses.length > 0 ? (
        <Paper p="md" withBorder data-testid="admin-users-presence-summary">
          <Group justify="space-between" align="center" wrap="wrap">
            <div>
              <Text size="lg" fw={600}>
                Statuts en ligne
              </Text>
              <Text size="sm" c="dimmed">
                {statuses.online_count} en ligne • {statuses.offline_count} hors ligne
              </Text>
            </div>
            <Button
              variant="light"
              size="xs"
              onClick={() => void loadStatuses()}
              loading={statusesBusy}
              data-testid="admin-users-refresh-statuses"
            >
              Actualiser les statuts
            </Button>
          </Group>
        </Paper>
      ) : null}

      <Group gap="md" align="flex-end" wrap="wrap">
        <TextInput
          placeholder="Rechercher un utilisateur..."
          leftSection={<Search size={16} />}
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applySearch();
            }
          }}
          style={{ flex: 1 }}
          data-testid="admin-users-search"
        />
        <Button
          leftSection={<Search size={16} />}
          onClick={() => applySearch()}
          data-testid="admin-users-search-apply"
        >
          Rechercher
        </Button>
      </Group>

      <Group gap="md" align="flex-end" wrap="wrap">
        <Select
          label="Filtrer par rôle"
          placeholder="Tous les rôles"
          data={ROLE_OPTIONS.filter((o) => o.value !== '')}
          value={roleFilter || null}
          onChange={(v) => {
            setRoleFilter(v ?? '');
            setSkip(0);
          }}
          clearable
          data-testid="admin-users-filter-role"
        />
        <Select
          label="Filtrer par dossier"
          placeholder="Tous les dossiers"
          data={USER_STATUS_FILTER_OPTIONS.filter((o) => o.value !== '')}
          value={userStatusFilter || null}
          onChange={(v) => {
            setUserStatusFilter(v ?? '');
            setSkip(0);
          }}
          clearable
          data-testid="admin-users-filter-user-status"
        />
      </Group>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text size="lg" fw={600}>
                Liste des utilisateurs
              </Text>
              <Text size="sm" c="dimmed" data-testid="admin-users-range">
                {rangeLabel}
              </Text>
              <Table striped highlightOnHover withTableBorder data-testid="admin-users-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Rôle</Table.Th>
                    <Table.Th>Statut d'activité</Table.Th>
                    <Table.Th>Statut en ligne</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {busy && filteredRows.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed">
                          Chargement...
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                  {!busy && filteredRows.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed">
                          Aucun utilisateur trouvé
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                  {filteredRows.map((u) => {
                    const st = statusByUserId.get(canonicalUserIdForPresence(u.id));
                    return (
                      <Table.Tr
                        key={u.id}
                        onClick={() => setSelected(u)}
                        style={{ cursor: 'pointer' }}
                        bg={selected?.id === u.id ? 'var(--mantine-color-blue-light)' : undefined}
                        data-testid={`admin-users-row-${u.id}`}
                      >
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm" fw={500}>
                              {displayName(u)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {atUsername(u) ? `@${atUsername(u)}` : "Pas d'identifiant affiché"}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" size="sm">
                            {ROLE_LABEL[u.role] ?? u.role}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={u.is_active ? 'green' : 'red'} variant="light" size="sm">
                            {u.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={presenceTooltip(st)} withArrow>
                            <Badge variant="light" size="sm" color={st?.is_online ? 'green' : st ? 'gray' : 'gray'}>
                              {presenceLabel(st)}
                            </Badge>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              <Group justify="space-between" mt="sm">
                <Button
                  variant="default"
                  size="xs"
                  disabled={!canPrev || busy}
                  onClick={() => setSkip((s) => Math.max(0, s - PAGE_LIMIT))}
                  data-testid="admin-users-page-prev"
                >
                  Précédent
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  disabled={!canNext || busy}
                  onClick={() => setSkip((s) => s + PAGE_LIMIT)}
                  data-testid="admin-users-page-next"
                >
                  Suivant
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="md" withBorder h="100%">
            {!selected ? (
              <Alert color="blue" icon={<AlertCircle size={18} />} title="Aucun utilisateur sélectionné">
                Sélectionnez un utilisateur dans la liste pour voir ses détails.
              </Alert>
            ) : (
              <Stack gap="md">
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <Avatar size="lg" radius="md" color="blue">
                    {avatarLetter}
                  </Avatar>
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="lg" fw={600} data-testid="admin-users-detail-name">
                      {headerTitle}
                    </Text>
                    {detailLoading ? (
                      <Text size="xs" c="dimmed" data-testid="admin-users-detail-loading">
                        Mise à jour du détail...
                      </Text>
                    ) : null}
                    <Text size="sm" c="dimmed">
                      {headerAt ? `@${headerAt}` : "Pas d'identifiant affiché"}
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      {mergedRole ? (
                        <Badge variant="light" size="sm">
                          {ROLE_LABEL[mergedRole] ?? mergedRole}
                        </Badge>
                      ) : null}
                      {mergedStatus ? (
                        <Badge variant="outline" size="sm">
                          {STATUS_LABEL[mergedStatus] ?? mergedStatus}
                        </Badge>
                      ) : null}
                      <Tooltip label={presenceTooltip(headerPresence)} withArrow>
                        <Badge variant="light" size="sm" color={headerPresence?.is_online ? 'green' : 'gray'}>
                          {presenceLabel(headerPresence)}
                        </Badge>
                      </Tooltip>
                    </Group>
                  </Stack>
                </Group>

                {detailError ? (
                  <Text size="sm" c="dimmed" data-testid="admin-users-detail-fetch-error">
                    Le détail n'a pas pu être chargé : {detailError}. Les champs ci-dessous reprennent la ligne liste
                    lorsque c'est possible.
                  </Text>
                ) : null}

                <Tabs value={detailTab} onChange={setDetailTab}>
                  <Tabs.List>
                    <Tabs.Tab value="profile" leftSection={<User size={14} />}>
                      Profil
                    </Tabs.Tab>
                    <Tabs.Tab value="history" leftSection={<History size={14} />}>
                      Historique
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="profile" pt="md">
                    <ProfileFields
                      firstName={mergedFirst}
                      lastName={mergedLast}
                      username={mergedUsername}
                      email={mergedEmail}
                      phone={mergedPhone}
                      address={mergedAddress}
                      notes={mergedNotes}
                      skills={mergedSkills}
                      availability={mergedAvail}
                      siteDisplay={formatSiteRefForProfile(mergedSite)}
                      isActive={mergedActive}
                      createdAt={mergedCreated}
                      updatedAt={mergedUpdated}
                    />
                    {detail && !detailLoading ? (
                      <Paper withBorder p="sm" mt="md" data-testid="admin-users-security-actions">
                        <Stack gap="sm">
                          <Group gap="xs">
                            <KeyRound size={16} />
                            <Text size="sm" fw={600}>
                              Sécurité du compte
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            E-mail de réinitialisation, effacement du PIN, forçage du mot de passe (super-admin,
                            vérifié côté serveur).
                          </Text>
                          <Group gap="xs" wrap="wrap">
                            <Tooltip
                              label="Un courriel valide est nécessaire pour envoyer le lien de réinitialisation."
                              disabled={!!mergedEmail?.trim()}
                              withArrow
                            >
                              <span>
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={resetPwdBusy}
                                  onClick={() => void handleResetPasswordEmail()}
                                  disabled={!mergedEmail?.trim()}
                                  data-testid="admin-users-reset-password"
                                >
                                  E-mail réinit. mot de passe
                                </Button>
                              </span>
                            </Tooltip>
                            <Button
                              size="xs"
                              variant="light"
                              color="orange"
                              onClick={() => setResetPinConfirmOpen(true)}
                              disabled={resetPinBusy}
                              data-testid="admin-users-reset-pin-open"
                            >
                              Réinitialiser le PIN
                            </Button>
                            {viewerSuperAdmin ? (
                              <Button
                                size="xs"
                                variant="light"
                                color="red"
                                onClick={() => {
                                  setFPwd('');
                                  setFPwd2('');
                                  setFReason('');
                                  setFPwdErr(null);
                                  setForcePwdOpen(true);
                                }}
                                data-testid="admin-users-force-password-open"
                              >
                                Forcer un mot de passe
                              </Button>
                            ) : null}
                          </Group>
                        </Stack>
                      </Paper>
                    ) : null}
                    <Stack gap="xs" mt="md" data-testid="admin-users-detail-groups">
                      <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                        Groupes
                      </Text>
                      {userGroupsBusy ? <Skeleton height={28} /> : null}
                      {userGroupsErr ? (
                        <Text size="sm" c="dimmed">
                          Les groupes n'ont pas pu être affichés.
                        </Text>
                      ) : null}
                      {!userGroupsBusy && !userGroupsErr && userGroupMemberships.length === 0 ? (
                        <Text size="sm" c="dimmed">
                          Aucun groupe pour le moment.
                        </Text>
                      ) : null}
                      {!userGroupsBusy && !userGroupsErr && userGroupMemberships.length > 0 ? (
                        <Group gap="xs">
                          {userGroupMemberships.map((m) => (
                            <Badge key={m.id} variant="light" size="sm">
                              {m.label}
                            </Badge>
                          ))}
                        </Group>
                      ) : null}
                      {userGroupsPartial ? (
                        <Text size="xs" c="dimmed">
                          La liste des groupes peut être incomplète.
                        </Text>
                      ) : null}
                      {selected ? (
                        <Button
                          size="xs"
                          variant="light"
                          disabled={userGroupsBusy}
                          onClick={() => void openGroupsModal()}
                          data-testid="admin-users-groups-edit-open"
                        >
                          Gérer les groupes…
                        </Button>
                      ) : null}
                    </Stack>
                    {detail && !detailLoading ? (
                      <Stack gap="md" mt="md">
                        <Button variant="light" size="sm" onClick={openEditModal} data-testid="admin-users-edit-open">
                          Modifier les coordonnées
                        </Button>
                        <Paper withBorder p="sm">
                          <Stack gap="sm">
                            <Text size="sm" fw={600}>
                              Rôle et accès
                            </Text>
                            <Text size="xs" c="dimmed">
                              Rôle sur le service
                            </Text>
                            <Group align="flex-end" wrap="wrap" gap="sm">
                              <Select
                                data={ROLE_OPTIONS.filter((o) => o.value !== '')}
                                value={editRole}
                                onChange={(v) => setEditRole(v ?? 'user')}
                                style={{ flex: '1 1 200px' }}
                                data-testid="admin-users-detail-role"
                              />
                              <Button
                                size="xs"
                                loading={mutationBusy}
                                onClick={() => void handleApplyRole()}
                                data-testid="admin-users-apply-role"
                              >
                                Appliquer
                              </Button>
                            </Group>
                            <Text size="xs" c="dimmed">
                              Dossier d'inscription
                            </Text>
                            <Group align="flex-end" wrap="wrap" gap="sm">
                              <Select
                                data={WORKFLOW_STATUS_EDIT_OPTIONS}
                                value={editWorkflow}
                                onChange={(v) => setEditWorkflow(v ?? 'active')}
                                data-testid="admin-users-detail-workflow"
                              />
                              <Button
                                size="xs"
                                loading={mutationBusy}
                                onClick={() => void handleApplyWorkflow()}
                                data-testid="admin-users-apply-workflow"
                              >
                                Enregistrer
                              </Button>
                            </Group>
                            <Divider my="xs" />
                            <Group justify="space-between" wrap="nowrap" gap="md">
                              <Text size="sm">Compte autorisé à se connecter</Text>
                              <Switch
                                checked={editActive}
                                onChange={(e) => setEditActive(e.currentTarget.checked)}
                                data-testid="admin-users-detail-active-switch"
                              />
                            </Group>
                            <Button
                              size="xs"
                              variant="default"
                              loading={mutationBusy}
                              onClick={() => void handleApplyActivation()}
                              data-testid="admin-users-apply-active"
                            >
                              Enregistrer l'accès
                            </Button>
                          </Stack>
                        </Paper>
                      </Stack>
                    ) : null}
                  </Tabs.Panel>

                  <Tabs.Panel value="history" pt="md">
                    <Paper p="md" withBorder mb="md">
                      <Stack gap="sm">
                        <Text size="sm" fw={500} c="dimmed">
                          Filtres
                        </Text>
                        <Group grow align="flex-end" wrap="wrap">
                          <TextInput
                            label="À partir du"
                            type="date"
                            value={histDraftFrom}
                            onChange={(e) => setHistDraftFrom(e.currentTarget.value)}
                            data-testid="admin-users-history-from"
                          />
                          <TextInput
                            label="Jusqu'au"
                            type="date"
                            value={histDraftTo}
                            onChange={(e) => setHistDraftTo(e.currentTarget.value)}
                            data-testid="admin-users-history-to"
                          />
                        </Group>
                        <Select
                          label="Type d'activité"
                          placeholder="Tous les types"
                          clearable
                          data={HISTORY_TYPE_OPTIONS}
                          value={histDraftType}
                          onChange={setHistDraftType}
                          data-testid="admin-users-history-type"
                        />
                        <Group justify="flex-end" gap="xs">
                          <Button variant="default" size="sm" onClick={() => clearHistFilters()}>
                            Effacer
                          </Button>
                          <Button size="sm" onClick={() => applyHistFilters()} data-testid="admin-users-history-apply">
                            Appliquer
                          </Button>
                        </Group>
                        <TextInput
                          label="Filtrer sur la page affichée"
                          description="Recherche locale dans les événements déjà chargés (aucun appel API supplémentaire)."
                          value={histTextFilter}
                          onChange={(e) => setHistTextFilter(e.currentTarget.value)}
                          leftSection={<Search size={14} />}
                          data-testid="admin-users-history-text-filter"
                        />
                      </Stack>
                    </Paper>

                    {histError ? <CashflowClientErrorAlert error={histError} /> : null}
                    {histBusy && !historyPage ? (
                      <Stack gap="xs">
                        <Skeleton height={14} />
                        <Skeleton height={14} />
                        <Skeleton height={14} />
                      </Stack>
                    ) : null}
                    {!histBusy && historyPage && historyPage.events.length === 0 ? (
                      <Alert
                        color="blue"
                        icon={<AlertCircle size={18} />}
                        title={
                          hasHistFilters ? 'Aucun événement trouvé' : 'Aucune activité enregistrée pour cet utilisateur'
                        }
                        data-testid="admin-users-history-empty"
                      >
                        {hasHistFilters
                          ? 'Aucun événement ne correspond aux critères choisis.'
                          : 'Aucune activité enregistrée pour cet utilisateur.'}
                      </Alert>
                    ) : null}
                    {!histBusy &&
                    historyPage &&
                    historyPage.events.length > 0 &&
                    displayedHistoryEvents.length === 0 ? (
                      <Alert color="gray" icon={<AlertCircle size={18} />} title="Aucun résultat sur cette page">
                        Aucun événement chargé ne correspond au texte saisi. Modifiez le filtre ou changez de page.
                      </Alert>
                    ) : null}
                    {historyPage && displayedHistoryEvents.length > 0 ? (
                      <Timeline
                        active={-1}
                        bulletSize={24}
                        lineWidth={2}
                        data-testid="admin-users-history-list"
                      >
                        {displayedHistoryEvents.map((ev) => (
                          <Timeline.Item
                            key={`${ev.id}-${ev.date}`}
                            bullet={eventHistoryBullet(ev.event_type)}
                            title={
                              <Group gap="xs" wrap="wrap">
                                <Text size="sm" fw={500}>
                                  {new Date(ev.date).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                                <Badge
                                  color={eventHistoryColor(ev.event_type)}
                                  variant="light"
                                  size="sm"
                                >
                                  {eventKindLabel(ev.event_type)}
                                </Badge>
                              </Group>
                            }
                          >
                            <Text size="sm" c="dimmed">
                              {ev.description}
                            </Text>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    ) : null}
                    {historyPage && historyPage.events.length > 0 ? (
                      <Group justify="space-between" mt="md">
                        <Button
                          size="xs"
                          variant="default"
                          disabled={!historyPage.has_prev || histBusy}
                          onClick={() => setHistSkip((s) => Math.max(0, s - HISTORY_LIMIT))}
                          data-testid="admin-users-history-prev"
                        >
                          Page précédente
                        </Button>
                        <Text size="xs" c="dimmed">
                          {historyPage.total_count === 0
                            ? '—'
                            : `${histSkip + 1}–${Math.min(histSkip + historyPage.events.length, historyPage.total_count)} sur ${historyPage.total_count}`}
                          {histTextFilter.trim() ? ` · ${displayedHistoryEvents.length} affiché(s)` : null}
                        </Text>
                        <Button
                          size="xs"
                          variant="default"
                          disabled={!historyPage.has_next || histBusy}
                          onClick={() => setHistSkip((s) => s + HISTORY_LIMIT)}
                          data-testid="admin-users-history-next"
                        >
                          Page suivante
                        </Button>
                      </Group>
                    ) : null}
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Créer un utilisateur" size="md">
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Mot de passe attendu (même grille que la validation serveur et le forçage super-admin) : au moins 8
            caractères, une majuscule, une minuscule, un chiffre et un caractère spécial parmi ceux listés côté API
            (ex. ! ? # @).
          </Text>
          <Text size="xs" c="dimmed">
            Le serveur peut encore refuser un mot de passe jugé inacceptable (ex. trop simple), même si la grille
            locale est respectée.
          </Text>
          <TextInput
            label="Identifiant"
            required
            value={cUsername}
            onChange={(e) => setCUsername(e.currentTarget.value)}
            data-testid="admin-users-create-username"
          />
          <TextInput
            label="Mot de passe initial"
            type="password"
            required
            value={cPassword}
            onChange={(e) => setCPassword(e.currentTarget.value)}
            data-testid="admin-users-create-password"
          />
          {cPassword.length > 0 && createPasswordIssues.length > 0 ? (
            <Text size="xs" c="orange" data-testid="admin-users-create-password-policy">
              Il manque encore : {createPasswordIssues.join(', ')}.
            </Text>
          ) : null}
          <TextInput label="Prénom" value={cFirst} onChange={(e) => setCFirst(e.currentTarget.value)} />
          <TextInput label="Nom" value={cLast} onChange={(e) => setCLast(e.currentTarget.value)} />
          <TextInput label="Courriel" value={cEmail} onChange={(e) => setCEmail(e.currentTarget.value)} />
          <TextInput label="Téléphone" value={cPhone} onChange={(e) => setCPhone(e.currentTarget.value)} />
          <Textarea label="Adresse" value={cAddress} onChange={(e) => setCAddress(e.currentTarget.value)} minRows={2} />
          <Textarea label="Compétences" value={cSkills} onChange={(e) => setCSkills(e.currentTarget.value)} minRows={2} />
          <Textarea
            label="Disponibilités"
            value={cAvail}
            onChange={(e) => setCAvail(e.currentTarget.value)}
            minRows={2}
          />
          <Textarea label="Notes" value={cNotes} onChange={(e) => setCNotes(e.currentTarget.value)} minRows={2} />
          <TextInput
            label="Rattachement site (UUID, optionnel)"
            description="Laisser vide si inconnu ; doit être un UUID valide pour être envoyé."
            value={cSiteId}
            onChange={(e) => setCSiteId(e.currentTarget.value)}
            data-testid="admin-users-create-site-id"
          />
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Text size="sm">Compte autorisé à se connecter dès la création</Text>
            <Switch checked={cActive} onChange={(e) => setCActive(e.currentTarget.checked)} />
          </Group>
          <Select
            label="Rôle"
            data={ROLE_OPTIONS.filter((o) => o.value !== '')}
            value={cRole}
            onChange={(v) => setCRole(v ?? 'user')}
          />
          <Select
            label="Dossier"
            data={WORKFLOW_STATUS_EDIT_OPTIONS.filter((o) => o.value !== 'pending')}
            value={cStatus}
            onChange={(v) => setCStatus(v ?? 'active')}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              loading={createBusy}
              onClick={() => void handleCreateUser()}
              disabled={createSubmitDisabled}
              data-testid="admin-users-create-submit"
            >
              Créer le compte
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Coordonnées et informations" size="md">
        <Stack gap="sm">
          <TextInput
            label="Identifiant"
            description="Changer l'identifiant peut être refusé si déjà pris (409 côté API)."
            value={eUsername}
            onChange={(e) => setEUsername(e.currentTarget.value)}
            data-testid="admin-users-edit-username"
          />
          <TextInput label="Prénom" value={eFirst} onChange={(e) => setEFirst(e.currentTarget.value)} />
          <TextInput label="Nom" value={eLast} onChange={(e) => setELast(e.currentTarget.value)} />
          <TextInput label="Courriel" value={eEmail} onChange={(e) => setEEmail(e.currentTarget.value)} />
          <TextInput label="Téléphone" value={ePhone} onChange={(e) => setEPhone(e.currentTarget.value)} />
          <Textarea label="Adresse" value={eAddress} onChange={(e) => setEAddress(e.currentTarget.value)} minRows={2} />
          <Textarea label="Compétences" value={eSkills} onChange={(e) => setESkills(e.currentTarget.value)} minRows={2} />
          <Textarea
            label="Disponibilités"
            value={eAvail}
            onChange={(e) => setEAvail(e.currentTarget.value)}
            minRows={2}
          />
          <Textarea label="Notes" value={eNotes} onChange={(e) => setENotes(e.currentTarget.value)} minRows={2} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button loading={editBusy} onClick={() => void handleSaveProfile()} data-testid="admin-users-edit-save">
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={resetPinConfirmOpen}
        onClose={() => {
          if (!resetPinBusy) setResetPinConfirmOpen(false);
        }}
        title="Réinitialiser le PIN"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Le PIN sera effacé ; la personne devra en définir un nouveau à la prochaine utilisation des fonctions qui en
            exigent un.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={resetPinBusy} onClick={() => setResetPinConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              color="orange"
              loading={resetPinBusy}
              onClick={() => void handleConfirmResetPin()}
              data-testid="admin-users-reset-pin-confirm"
            >
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={groupsModalOpen}
        onClose={() => {
          if (!groupsSaveBusy) setGroupsModalOpen(false);
        }}
        title="Groupes de l'utilisateur"
        size="md"
      >
        <Stack gap="sm">
          <MultiSelect
            label="Groupes"
            placeholder="Choisir un ou plusieurs groupes"
            description={
              groupsCatalogBusy
                ? 'Chargement de la liste des groupes disponibles…'
                : "L'enregistrement remplace l'ensemble des affectations aux groupes pour ce compte."
            }
            data={groupsSelectOptions}
            value={groupsDraftIds}
            onChange={setGroupsDraftIds}
            searchable
            nothingFoundMessage="Aucun groupe"
            disabled={groupsSaveBusy}
            rightSection={groupsCatalogBusy ? <Loader size="xs" /> : null}
            data-testid="admin-users-groups-multiselect"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" disabled={groupsSaveBusy} onClick={() => setGroupsModalOpen(false)}>
              Annuler
            </Button>
            <Button
              loading={groupsSaveBusy}
              onClick={() => void handleSaveGroups()}
              data-testid="admin-users-groups-save"
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={forcePwdOpen} onClose={() => setForcePwdOpen(false)} title="Forcer un mot de passe" size="md">
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Opération réservée au super-admin côté API. Règles habituelles : 8 caractères minimum, majuscule,
            minuscule, chiffre, caractère spécial.
          </Text>
          {fPwdErr ? (
            <Text size="sm" c="red">
              {fPwdErr}
            </Text>
          ) : null}
          <TextInput
            label="Nouveau mot de passe"
            type="password"
            value={fPwd}
            onChange={(e) => setFPwd(e.currentTarget.value)}
            data-testid="admin-users-force-password-field"
          />
          <TextInput
            label="Confirmer"
            type="password"
            value={fPwd2}
            onChange={(e) => setFPwd2(e.currentTarget.value)}
            data-testid="admin-users-force-password-confirm"
          />
          <TextInput label="Motif (optionnel)" value={fReason} onChange={(e) => setFReason(e.currentTarget.value)} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setForcePwdOpen(false)} disabled={forcePwdBusy}>
              Annuler
            </Button>
            <Button
              color="red"
              loading={forcePwdBusy}
              onClick={() => void handleSubmitForcePassword()}
              data-testid="admin-users-force-password-submit"
            >
              Appliquer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function ProfileFields(props: {
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly username?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly notes?: string | null;
  readonly skills?: string | null;
  readonly availability?: string | null;
  readonly siteDisplay: string;
  readonly isActive?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}): ReactNode {
  const rows: { label: string; value: string }[] = [
    { label: 'Prénom', value: formatField(props.firstName) },
    { label: 'Nom', value: formatField(props.lastName) },
    { label: 'Identifiant', value: formatField(props.username) },
    { label: 'Courriel', value: formatField(props.email) },
    { label: 'Téléphone', value: formatField(props.phone) },
    { label: 'Adresse', value: formatField(props.address) },
    { label: 'Compétences', value: formatField(props.skills) },
    { label: 'Disponibilités', value: formatField(props.availability) },
    { label: 'Notes', value: formatField(props.notes) },
    { label: 'Rattachement site', value: formatField(props.siteDisplay) },
    {
      label: 'Compte activé',
      value: props.isActive === undefined ? '—' : props.isActive ? 'Oui' : 'Non',
    },
  ];
  return (
    <Stack gap="xs">
      {rows.map((r) => (
        <div key={r.label}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {r.label}
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {r.value}
          </Text>
        </div>
      ))}
      {props.createdAt && props.updatedAt ? (
        <>
          <Divider my="xs" />
          <Text size="xs" c="dimmed">
            Créé le {new Date(props.createdAt).toLocaleString('fr-FR')} — modifié le{' '}
            {new Date(props.updatedAt).toLocaleString('fr-FR')}
          </Text>
        </>
      ) : null}
    </Stack>
  );
}

