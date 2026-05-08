import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Loader2,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import UserDashboardShell from "@/components/user/UserDashboardShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getStoredRoleId } from "@/lib/session";
import {
  fetchAllOrganizations,
  fetchOwnOrganization,
  fetchOwnTeamMembers,
  fetchTeamMembersByUserId,
  formatRegistrationStatus,
  formatTeamRole,
  getOrganizationUserId,
  getStoredProfileUser,
  hasOrganizationDetails,
  type OrganizationWithTeam,
  type ProfileOrganization,
  type ProfileTeamMember,
  type ProfileUser,
} from "@/lib/profile";
import type { DashboardUser } from "@/lib/userDashboard";

const toProfileUser = (user: DashboardUser): ProfileUser => ({
  fullName: user.fullName || "User",
  email: user.email || "",
  contact: user.contact || "",
  id: user.id,
  roleId: user.roleId,
});

const InfoItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value || "--"}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
    Loading profile...
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span>{message}</span>
  </div>
);

const AccountSummary = ({ user, roleLabel }: { user: ProfileUser; roleLabel: string }) => (
  <Card className="rounded-xl border-slate-200 shadow-sm">
    <CardContent className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <UserCircle className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-950">{user.fullName || "User"}</h2>
            <p className="text-sm text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <Badge className="w-fit rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          Active
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem label="Email" value={user.email} />
        <InfoItem label="Contact" value={user.contact} />
        <InfoItem label="User ID" value={user.id} />
      </div>
    </CardContent>
  </Card>
);

const TeamMembersTable = ({ members }: { members: ProfileTeamMember[] }) => {
  if (!members.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No team members found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee ID</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => (
            <TableRow key={`${member.id || member.email || member.name}-${index}`}>
              <TableCell className="font-medium text-slate-800">{member.name || "--"}</TableCell>
              <TableCell className="text-slate-600">{member.email || "--"}</TableCell>
              <TableCell className="text-slate-600">{member.hospitalEmployeeId || "--"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="rounded-full">
                  {formatTeamRole(member.role)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const OrganizationDetails = ({
  organization,
  teamMembers,
  teamError,
}: {
  organization: ProfileOrganization | null;
  teamMembers: ProfileTeamMember[];
  teamError?: string;
}) => {
  if (!hasOrganizationDetails(organization)) {
    return (
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">Organization profile not found</p>
          <p className="mt-1 text-sm text-slate-500">Registration details are not available for this account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <span className="truncate">{organization?.organizationName || "Organization"}</span>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">{organization?.hospitalRegisteredId || "Hospital registered ID not available"}</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            {formatRegistrationStatus(organization?.status ?? null)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Hospital Registered ID" value={organization?.hospitalRegisteredId} />
          <InfoItem label="SPOC Name" value={organization?.spocName} />
          <InfoItem label="Hospital Category" value={organization?.hospitalCategory} />
          <InfoItem label="Organization Email" value={organization?.orgEmail} />
          <InfoItem label="Phone" value={organization?.orgPhone} />
          <InfoItem label="State" value={organization?.state} />
          <InfoItem label="District" value={organization?.district} />
          <InfoItem label="Pincode" value={organization?.pincode} />
          <InfoItem label="Address" value={organization?.address} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <Users className="h-4 w-4 text-emerald-600" />
              Team Members
            </h3>
            <Badge variant="secondary" className="rounded-full">
              {teamMembers.length} member{teamMembers.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {teamError && <ErrorState message={teamError} />}
          {!teamError && <TeamMembersTable members={teamMembers} />}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminOrganizations = ({ organizations }: { organizations: OrganizationWithTeam[] }) => {
  const totalMembers = useMemo(
    () => organizations.reduce((sum, item) => sum + item.teamMembers.length, 0),
    [organizations],
  );

  if (!organizations.length) {
    return (
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">No organizations found</p>
          <p className="mt-1 text-sm text-slate-500">Registered organization data is not available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoItem label="Organizations" value={organizations.length} />
        <InfoItem label="Team Members" value={totalMembers} />
      </div>
      {organizations.map((item, index) => (
        <OrganizationDetails
          key={`${item.organization.id || item.organization.orgEmail || index}`}
          organization={item.organization}
          teamMembers={item.teamMembers}
          teamError={item.teamError}
        />
      ))}
    </div>
  );
};

const ProfileBody = ({
  mode,
  user,
  dashboardError,
}: {
  mode: "admin" | "user";
  user: ProfileUser;
  dashboardError?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState<ProfileOrganization | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProfileTeamMember[]>([]);
  const [adminOrganizations, setAdminOrganizations] = useState<OrganizationWithTeam[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        if (mode === "admin") {
          const organizations = await fetchAllOrganizations(controller.signal);
          const organizationsWithTeams = await Promise.all(
            organizations.map(async (item) => {
              const userId = getOrganizationUserId(item);
              if (!userId) {
                return {
                  organization: item,
                  teamMembers: [],
                  teamError: "User ID not found for this organization.",
                };
              }

              try {
                return {
                  organization: item,
                  teamMembers: await fetchTeamMembersByUserId(userId, controller.signal),
                };
              } catch (teamRequestError) {
                return {
                  organization: item,
                  teamMembers: [],
                  teamError:
                    teamRequestError instanceof Error ? teamRequestError.message : "Unable to load team members.",
                };
              }
            }),
          );

          if (!controller.signal.aborted) setAdminOrganizations(organizationsWithTeams);
          return;
        }

        const [organizationResult, teamResult] = await Promise.allSettled([
          fetchOwnOrganization(controller.signal),
          fetchOwnTeamMembers(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (organizationResult.status === "fulfilled") {
          setOrganization(organizationResult.value);
        } else {
          setOrganization(null);
          setError(organizationResult.reason instanceof Error ? organizationResult.reason.message : "Unable to load profile.");
        }

        if (teamResult.status === "fulfilled") {
          setTeamMembers(teamResult.value);
        } else if (organizationResult.status === "fulfilled") {
          setTeamMembers([]);
          setError(teamResult.reason instanceof Error ? teamResult.reason.message : "Unable to load team members.");
        }
      } catch (profileError) {
        if (!controller.signal.aborted) {
          setError(profileError instanceof Error ? profileError.message : "Unable to load profile.");
          setOrganization(null);
          setTeamMembers([]);
          setAdminOrganizations([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, [mode]);

  const roleLabel = mode === "admin" ? "Administrator" : "Organization User";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <AccountSummary user={user} roleLabel={roleLabel} />
      {dashboardError && <ErrorState message={dashboardError} />}
      {error && <ErrorState message={error} />}
      {loading ? (
        <LoadingState />
      ) : mode === "admin" ? (
        <AdminOrganizations organizations={adminOrganizations} />
      ) : (
        <OrganizationDetails organization={organization} teamMembers={teamMembers} />
      )}
    </div>
  );
};

const AdminProfilePage = () => (
  <AdminShell activeId="overview" title="Profile">
    <div className="p-3 sm:p-6">
      <ProfileBody mode="admin" user={getStoredProfileUser()} />
    </div>
  </AdminShell>
);

const UserProfilePage = () => {
  const { dashboardData, userData, loading, error } = useDashboardData();
  const profileUser = toProfileUser(userData);

  return (
    <UserDashboardShell title="Profile" activePath="/profile" dashboardData={dashboardData} userData={userData}>
      {loading ? <LoadingState /> : <ProfileBody mode="user" user={profileUser} dashboardError={error} />}
    </UserDashboardShell>
  );
};

const ProfilePage = () => {
  const roleId = getStoredRoleId();

  if (roleId === 1) return <AdminProfilePage />;
  return <UserProfilePage />;
};

export default ProfilePage;
