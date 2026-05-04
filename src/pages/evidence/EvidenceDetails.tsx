import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ClipboardList,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BASE_URL1 } from "@/Service/api";
import { buildCandidateEvidenceBase,
  CompactInfoCard,
  demoVideoPoster,
  EmptyState,
  fetchCandidateEvidence,
  fetchJson,
  fetchRandomEvidenceMedia,
  formatCaptureDate,
  formatCaptureTime,
  formatDateTime,
  formatStatus,
  getCandidateId,
  getTimestampValue,
  isRenderableImage,
  MetricCard,
  SectionHeader,
  toneIconClass,
  type EvidenceRouteState,
  type EvidenceViewData,
  unwrapApiData,
} from "./EvidenceShared";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  userId: number;
}

const normalizeTeamMember = (value: Record<string, unknown>): TeamMember => ({
  id: Number(value.id) || 0,
  name: String(value.name || "Team member"),
  email: String(value.email || ""),
  role: String(value.role || "member"),
  userId: Number(value.userId || value.user_id) || 0,
});

const fetchCandidateTeamMembers = async (userId: number) => {
  const result = await fetchJson(`${BASE_URL1}/register/get/team/public/${userId}`);
  const data = unwrapApiData(result);

  return Array.isArray(data)
    ? data.map((item) => normalizeTeamMember(item as Record<string, unknown>))
    : [];
};

const formatTeamRole = (role: string) => {
  const roleMap: Record<string, string> = {
    OT: "OT",
    member: "Member",
    admin: "Admin",
  };

  return roleMap[role.toLowerCase()] || role;
};

type IdentityEvidenceItem = EvidenceViewData["identity"]["documents"][number];

interface IdentityMemberCard {
  key: string;
  name: string;
  email: string;
  role?: string;
  selfie?: IdentityEvidenceItem;
  document?: IdentityEvidenceItem;
}

type LightboxKind = "image" | "video" | "document";

interface LightboxItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  kind: LightboxKind;
}

interface LightboxState {
  items: LightboxItem[];
  index: number;
}

const normalizeIdentityName = (value: string) => value.trim().toLowerCase();

const findMemberMatch = (item: IdentityEvidenceItem, teamMembers: TeamMember[]) => {
  const normalizedItemName = normalizeIdentityName(item.name || "");

  return teamMembers.find((member) => {
    if (item.memberId && member.id === item.memberId) return true;
    return normalizedItemName && normalizeIdentityName(member.name) === normalizedItemName;
  });
};

const buildIdentityMemberCards = (
  teamMembers: TeamMember[],
  selfies: IdentityEvidenceItem[],
  documents: IdentityEvidenceItem[],
  fallbackName: string
) => {
  const cards = new Map<string, IdentityMemberCard>();

  teamMembers.forEach((member) => {
    cards.set(`team-${member.id}`, {
      key: `team-${member.id}`,
      name: member.name || fallbackName || "Candidate",
      email: member.email || "",
      role: member.role,
    });
  });

  const upsertEvidence = (item: IdentityEvidenceItem, field: "selfie" | "document") => {
    const matchedMember = findMemberMatch(item, teamMembers);
    const key = matchedMember
      ? `team-${matchedMember.id}`
      : item.memberId
        ? `member-${item.memberId}`
        : `name-${normalizeIdentityName(item.name || fallbackName || "candidate")}`;
    const existingCard = cards.get(key);

    cards.set(key, {
      key,
      name: existingCard?.name || matchedMember?.name || item.name || fallbackName || "Candidate",
      email: existingCard?.email || matchedMember?.email || item.email || "",
      role: existingCard?.role || matchedMember?.role,
      selfie: field === "selfie" ? item : existingCard?.selfie,
      document: field === "document" ? item : existingCard?.document,
    });
  };

  selfies.forEach((selfie) => upsertEvidence(selfie, "selfie"));
  documents.forEach((document) => upsertEvidence(document, "document"));

  return Array.from(cards.values()).filter((card) => card.selfie || card.document || card.email || card.name);
};

const createIdentityLightboxItems = (card: IdentityMemberCard) => {
  const items: LightboxItem[] = [];

  if (card.selfie?.url) {
    items.push({
      id: `${card.key}-selfie`,
      title: `${card.name} - Doc 1 Selfie`,
      subtitle: `${card.email || "Selfie evidence"} - Captured ${formatDateTime(card.selfie.timestamp || null)}`,
      url: card.selfie.url,
      kind: "image",
    });
  }

  if (card.document?.url) {
    items.push({
      id: `${card.key}-document`,
      title: `${card.name} - Doc 2 Document`,
      subtitle: `${card.email || "Document evidence"} - Captured ${formatDateTime(card.document.timestamp || null)}`,
      url: card.document.url,
      kind: isRenderableImage(card.document.url) ? "image" : "document",
    });
  }

  return items;
};

const createMediaLightboxItems = (items: EvidenceViewData["media"]) =>
  items
    .filter((item) => item.url)
    .map((item) => ({
      id: item.id,
      title: item.memberName || "Team member",
      subtitle: `${item.type === "video" ? "Random video" : "Random photo"} - Captured ${formatDateTime(item.timestamp)}`,
      url: item.url || "",
      kind: item.type === "video" ? "video" : "image",
    }) satisfies LightboxItem);

const resolveMediaMemberName = (item: EvidenceViewData["media"][number], teamMembers: TeamMember[]) =>
  teamMembers.find((member) => item.memberId && member.id === item.memberId)?.name || "Team member";

const attachTeamMemberNames = (items: EvidenceViewData["media"], teamMembers: TeamMember[]) =>
  items.map((item) => ({
    ...item,
    memberName: resolveMediaMemberName(item, teamMembers),
  }));

const getMediaKey = (item: EvidenceViewData["media"][number]) =>
  String(item.id || `${item.type}-${item.memberId || "member"}-${item.filename}-${item.url || ""}`);

const captureToneClass = {
  sky: {
    wrapper: "border-sky-100 bg-sky-50/70",
    label: "text-sky-700",
    icon: "text-sky-600",
  },
  cyan: {
    wrapper: "border-cyan-100 bg-cyan-50/70",
    label: "text-cyan-700",
    icon: "text-cyan-600",
  },
  rose: {
    wrapper: "border-rose-100 bg-rose-50/70",
    label: "text-rose-700",
    icon: "text-rose-600",
  },
} as const;

const CaptureTimestamp = ({
  label,
  timestamp,
  tone = "sky",
}: {
  label: string;
  timestamp?: string | null;
  tone?: keyof typeof captureToneClass;
}) => {
  const classes = captureToneClass[tone];

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 ${classes.wrapper}`}>
      <div className="flex items-start gap-2">
        <Clock className={`mt-0.5 h-4 w-4 shrink-0 ${classes.icon}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${classes.label}`}>
            {label}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-white/80 px-2.5 py-2 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Date</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-900">{formatCaptureDate(timestamp || null)}</p>
            </div>
            <div className="rounded-md bg-white/80 px-2.5 py-2 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Time</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-900">{formatCaptureTime(timestamp || null)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const mergeMediaItems = (
  evidence: EvidenceViewData,
  randomMedia: EvidenceViewData["media"]
): EvidenceViewData => {
  if (!randomMedia.length) return evidence;

  const mediaByKey = new Map<string, EvidenceViewData["media"][number]>();

  [...evidence.media, ...randomMedia].forEach((item) => {
    mediaByKey.set(getMediaKey(item), item);
  });

  const media = Array.from(mediaByKey.values()).sort((first, second) => {
    const firstTime = getTimestampValue(first.timestamp);
    const secondTime = getTimestampValue(second.timestamp);
    return firstTime - secondTime;
  });

  return {
    ...evidence,
    media,
  };
};

const buildRandomMediaMemberIds = (
  routeState: EvidenceRouteState,
  teamMembers: TeamMember[]
) =>
  Array.from(
    new Set(
      [
        getCandidateId(routeState.candidate),
        ...teamMembers.map((member) => member.id),
      ].filter((id): id is number => Boolean(id))
    )
  );

const EvidenceLightbox = ({
  state,
  onClose,
  onMove,
}: {
  state: LightboxState;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const item = state.items[state.index];
  const canSlide = state.items.length > 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onMove]);

  if (!item) return null;

  const openVideoFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 text-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-300">{item.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200">
              {state.index + 1} / {state.items.length}
            </span>
            {item.kind === "video" && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={openVideoFullscreen}
                className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-14">
          {canSlide && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onMove(-1)}
              className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div className="flex h-full w-full items-center justify-center">
            {item.kind === "video" ? (
              <video
                key={item.url}
                ref={videoRef}
                src={item.url}
                controls
                className="max-h-full w-full max-w-6xl rounded-xl bg-black object-contain shadow-2xl"
              />
            ) : item.kind === "image" ? (
              <img
                src={item.url}
                alt={item.title}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <iframe
                title={item.title}
                src={item.url}
                className="h-full min-h-[70vh] w-full max-w-6xl rounded-xl border border-white/10 bg-white shadow-2xl"
              />
            )}
          </div>

          {canSlide && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onMove(1)}
              className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white sm:right-4"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const EvidenceOnlyView = ({
  evidence,
  selfieItems,
  identityCards,
  photoItems,
  videoItems,
  photoCount,
  videoCount,
  documentCount,
  teamMembers,
  loadingTeam,
  teamError,
  onOpenLightbox,
}: {
  evidence: EvidenceViewData;
  selfieItems: EvidenceViewData["identity"]["documents"];
  identityCards: IdentityMemberCard[];
  photoItems: EvidenceViewData["media"];
  videoItems: EvidenceViewData["media"];
  photoCount: number;
  videoCount: number;
  documentCount: number;
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  teamError: string;
  onOpenLightbox: (items: LightboxItem[], index: number) => void;
}) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard icon={User} label="Selfies" value={selfieItems.length} detail="Member identity selfies." tone={selfieItems.length ? "emerald" : "amber"} />
      <MetricCard icon={Users} label="Team" value={loadingTeam ? "Loading" : teamMembers.length} detail="Linked team members." tone="sky" />
      <MetricCard icon={FileText} label="Documents" value={documentCount} detail="Identity and registration proof." tone="sky" />
      <MetricCard icon={Camera} label="Photos" value={photoCount} detail="Random exam captures." tone="cyan" />
      <MetricCard icon={Video} label="Videos" value={videoCount} detail="Recorded proctoring clips." tone="rose" />
    </div>

    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <SectionHeader
        icon={FileText}
        title="Candidate Identity Documents"
        description="Doc 1 selfie and Doc 2 document are grouped into one card for each member."
      />

      {teamError && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-4 w-4" />
          {teamError}
        </div>
      )}

      {loadingTeam ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/60">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
            <p className="mt-2 text-xs font-medium text-slate-600">Loading member details...</p>
          </div>
        </div>
      ) : identityCards.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {identityCards.map((card) => (
            <div key={card.key} className="overflow-hidden rounded-xl border border-sky-100 bg-sky-50/40">
              <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-white px-3 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950" title={card.name}>
                      {card.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500" title={card.email}>
                      {card.email || "--"}
                    </p>
                  </div>
                </div>
                {card.role && (
                  <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-sky-700">
                    {formatTeamRole(card.role)}
                  </span>
                )}
              </div>

              <div className="grid gap-3 p-3 md:grid-cols-2">
                <div className="rounded-lg border border-sky-100 bg-white p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                        <User className="h-4 w-4" />
                      </span>
                      <p className="truncate text-sm font-semibold text-slate-900">Doc 1 Selfie</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">Doc 1</span>
                  </div>

                  {card.selfie?.url ? (
                    <img
                      src={card.selfie.url}
                      alt={`${card.name} selfie`}
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-sky-200 bg-sky-50 text-center text-xs text-slate-500">
                      Selfie not available
                    </div>
                  )}

                  {card.selfie && (
                    <CaptureTimestamp label="Selfie captured" timestamp={card.selfie.timestamp} tone="sky" />
                  )}

                  {card.selfie?.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = createIdentityLightboxItems(card);
                        const index = Math.max(0, items.findIndex((preview) => preview.id.endsWith("-selfie")));
                        onOpenLightbox(items, index);
                      }}
                      className="mt-3 h-8 w-full border-sky-200 text-sky-700 hover:bg-sky-50"
                    >
                      <Eye className="h-4 w-4" />
                      Open selfie
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-sky-100 bg-white p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                        <FileText className="h-4 w-4" />
                      </span>
                      <p className="truncate text-sm font-semibold text-slate-900">Doc 2 Document</p>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">Doc 2</span>
                  </div>

                  {card.document?.url && isRenderableImage(card.document.url) ? (
                    <img
                      src={card.document.url}
                      alt={`${card.name} document`}
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-sky-200 bg-sky-50 text-center text-xs text-slate-500">
                      Document preview not available
                    </div>
                  )}

                  {card.document && (
                    <CaptureTimestamp label="Document captured" timestamp={card.document.timestamp} tone="cyan" />
                  )}

                  {card.document?.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = createIdentityLightboxItems(card);
                        const index = Math.max(0, items.findIndex((preview) => preview.id.endsWith("-document")));
                        onOpenLightbox(items, index);
                      }}
                      className="mt-3 h-8 w-full border-sky-200 text-sky-700 hover:bg-sky-50"
                    >
                      <Eye className="h-4 w-4" />
                      Open document
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No identity evidence"
          description="No doc 1 selfies or doc 2 documents were returned for this candidate."
        />
      )}
    </section>

    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          icon={ImageIcon}
          title="Random Photos"
          description="Only random photo captures collected during the exam."
        />
        <p className="text-xs text-slate-500">
          {photoCount} photos
        </p>
      </div>

      {photoItems.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {photoItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-sky-100 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.type === "photo" ? toneIconClass.sky : toneIconClass.rose}`}>
                    {item.type === "photo" ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900" title={item.memberName || "Team member"}>
                      {item.memberName || "Team member"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500" title={formatDateTime(item.timestamp)}>
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3">
                {item.type === "photo" && item.url ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                ) : item.type === "video" && item.url ? (
                  <video src={item.url} controls className="aspect-[4/3] w-full rounded-lg bg-black object-cover" />
                ) : (
                  <div
                    className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-sky-200 bg-white"
                    style={{
                      backgroundImage: `url(${demoVideoPoster})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  >
                    <div className="rounded-full bg-slate-950/75 p-3 text-white">
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                )}

                <CaptureTimestamp label="Photo captured" timestamp={item.timestamp} tone="sky" />
                {item.minute !== null && (
                  <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                    Capture slot: minute {item.minute + 1}
                  </p>
                )}

                {item.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const items = createMediaLightboxItems(photoItems);
                      const index = Math.max(0, items.findIndex((preview) => preview.id === item.id));
                      onOpenLightbox(items, index);
                    }}
                    className="mt-3 h-8 w-full border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    <Eye className="h-4 w-4" />
                    Open evidence
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Camera}
          title="No random photos"
          description="No random photo captures are stored for this exam attempt."
        />
      )}
    </section>

    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          icon={Video}
          title="Random Videos"
          description="Only random video captures collected during the exam."
        />
        <p className="text-xs text-slate-500">
          {videoCount} videos
        </p>
      </div>

      {videoItems.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {videoItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-sky-100 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneIconClass.rose}`}>
                    <Video className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900" title={item.memberName || "Team member"}>
                      {item.memberName || "Team member"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500" title={formatDateTime(item.timestamp)}>
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3">
                {item.url ? (
                  <video src={item.url} controls className="aspect-[4/3] w-full rounded-lg bg-black object-cover" />
                ) : (
                  <div
                    className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-sky-200 bg-white"
                    style={{
                      backgroundImage: `url(${demoVideoPoster})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  >
                    <div className="rounded-full bg-slate-950/75 p-3 text-white">
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                )}

                <CaptureTimestamp label="Video captured" timestamp={item.timestamp} tone="rose" />
                {item.minute !== null && (
                  <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                    Capture slot: minute {item.minute + 1}
                  </p>
                )}

                {item.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const items = createMediaLightboxItems(videoItems);
                      const index = Math.max(0, items.findIndex((preview) => preview.id === item.id));
                      onOpenLightbox(items, index);
                    }}
                    className="mt-3 h-8 w-full border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    <Eye className="h-4 w-4" />
                    Open video
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Video}
          title="No random videos"
          description="No random video captures are stored for this exam attempt."
        />
      )}
    </section>
  </div>
);

const EvidenceDetailsPage = ({ userId }: { userId: number }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as EvidenceRouteState;
  const [evidence, setEvidence] = useState<EvidenceViewData>(() =>
    buildCandidateEvidenceBase(userId, routeState.candidate, routeState.batch, "Evidence API")
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [error, setError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const openLightbox = (items: LightboxItem[], index: number) => {
    if (!items.length) return;
    setLightbox({
      items,
      index: Math.min(Math.max(index, 0), items.length - 1),
    });
  };

  const moveLightbox = (direction: -1 | 1) => {
    setLightbox((currentLightbox) => {
      if (!currentLightbox) return currentLightbox;

      return {
        ...currentLightbox,
        index: (currentLightbox.index + direction + currentLightbox.items.length) % currentLightbox.items.length,
      };
    });
  };

  const loadEvidence = async () => {
    setLoading(true);
    setLoadingTeam(true);
    setError("");
    setTeamError("");

    const [evidenceResult, teamResult] = await Promise.allSettled([
      fetchCandidateEvidence(userId, routeState.candidate, routeState.batch, location.state),
      fetchCandidateTeamMembers(userId),
    ]);
    const resolvedTeamMembers = teamResult.status === "fulfilled" ? teamResult.value : [];
    const randomMediaMemberIds = buildRandomMediaMemberIds(routeState, resolvedTeamMembers);
    const randomMediaResults = randomMediaMemberIds.length
      ? await Promise.allSettled(randomMediaMemberIds.map((memberId) => fetchRandomEvidenceMedia(memberId)))
      : [];
    const randomMedia = randomMediaResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    if (evidenceResult.status === "fulfilled") {
      setEvidence(mergeMediaItems(evidenceResult.value, randomMedia));
    } else {
      setError(evidenceResult.reason instanceof Error ? evidenceResult.reason.message : "Failed to load evidence details");
    }

    if (teamResult.status === "fulfilled") {
      setTeamMembers(resolvedTeamMembers);
    } else {
      setTeamMembers([]);
      setTeamError(teamResult.reason instanceof Error ? teamResult.reason.message : "Failed to load team members");
    }

    const randomMediaFailed = randomMediaResults.some((result) => result.status === "rejected");
    if (randomMediaFailed) {
      setTeamError((currentError) =>
        currentError || "Random photo/video media could not be loaded for one or more team members."
      );
    }

    setLoading(false);
    setLoadingTeam(false);
  };

  useEffect(() => {
    loadEvidence();
  }, [userId]);

  const selfieItems =
    evidence.identity.selfies.length > 0
      ? evidence.identity.selfies
      : evidence.identity.selfieUrl
        ? [
            {
              id: "selfie-main",
              name: evidence.candidate.name,
              url: evidence.identity.selfieUrl,
              docId: "1",
            },
          ]
        : [];
  const identityCards = buildIdentityMemberCards(
    teamMembers,
    selfieItems,
    evidence.identity.documents,
    evidence.candidate.name
  );
  const photoItems = attachTeamMemberNames(
    evidence.media.filter((item) => item.type === "photo"),
    teamMembers
  );
  const videoItems = attachTeamMemberNames(
    evidence.media.filter((item) => item.type === "video"),
    teamMembers
  );
  const photoCount = photoItems.length;
  const videoCount = videoItems.length;
  const documentCount = evidence.identity.documents.length;
  const batchId = evidence.candidate.batchId || routeState.candidate?.batchId || routeState.candidate?.batch_id || routeState.batch?.batch_id || routeState.batch?.id || null;
  const level = evidence.candidate.level || routeState.batch?.level || "--";
  const totalEvidenceItems = selfieItems.length + documentCount + photoCount + videoCount;

  return (
    <div className="min-h-screen bg-[#f3fbff] text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:py-6">
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-200">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Evidence Details</h1>
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      User ID {userId}
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    Identity documents, selfie, team members, and proctoring captures for the selected candidate.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/Evidence")} className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={loadEvidence} className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 bg-sky-50/40 px-4 py-4 sm:px-6 md:grid-cols-2 xl:grid-cols-7">
            <CompactInfoCard icon={User} label="Candidate" value={evidence.candidate.name} tone="sky" />
            <CompactInfoCard icon={ShieldCheck} label="User ID" value={userId} tone="cyan" />
            <CompactInfoCard icon={Layers} label="Batch ID" value={batchId} tone="cyan" />
            <CompactInfoCard icon={Layers} label="Batch" value={evidence.candidate.batchCode} tone="sky" />
            <CompactInfoCard icon={ClipboardList} label="Level" value={level} tone="slate" />
            <CompactInfoCard icon={CheckCircle2} label="Status" value={formatStatus(evidence.overview.status)} tone="emerald" />
            <CompactInfoCard icon={FileText} label="Evidence Items" value={totalEvidenceItems} tone="cyan" />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-2xl border border-sky-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
              <p className="mt-3 text-sm font-medium text-slate-600">Loading candidate evidence...</p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EvidenceOnlyView
              evidence={evidence}
              selfieItems={selfieItems}
              identityCards={identityCards}
              photoItems={photoItems}
              videoItems={videoItems}
              photoCount={photoCount}
              videoCount={videoCount}
              documentCount={documentCount}
              teamMembers={teamMembers}
              loadingTeam={loadingTeam}
              teamError={teamError}
              onOpenLightbox={openLightbox}
            />
          </div>
        )}
      </div>
      {lightbox && (
        <EvidenceLightbox
          state={lightbox}
          onClose={() => setLightbox(null)}
          onMove={moveLightbox}
        />
      )}
    </div>
  );
};


export default EvidenceDetailsPage;
