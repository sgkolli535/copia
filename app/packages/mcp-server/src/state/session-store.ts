import type { UserProfile, PlanResult, MobilityAnalysisResult } from '@copia/types';

export interface UnknownEntity {
  type: 'jurisdiction' | 'asset_class' | 'treaty' | 'rule';
  value: string;
  context: string;
  flaggedAt: string;
}

interface SessionState {
  profile: UserProfile | null;
  plan: PlanResult | null;
  mobilityResult: MobilityAnalysisResult | null;
  unknownEntities: UnknownEntity[];
}

const DEFAULT_SESSION_ID = 'default';

const sessions = new Map<string, SessionState>();

function ensureSession(sessionId: string): SessionState {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { profile: null, plan: null, mobilityResult: null, unknownEntities: [] };
    sessions.set(sessionId, session);
  }
  return session;
}

export function getSession(sessionId: string = DEFAULT_SESSION_ID): SessionState {
  return ensureSession(sessionId);
}

export function setProfile(profile: UserProfile, sessionId: string = DEFAULT_SESSION_ID): void {
  const session = ensureSession(sessionId);
  session.profile = profile;
}

export function getProfile(sessionId: string = DEFAULT_SESSION_ID): UserProfile | null {
  return ensureSession(sessionId).profile;
}

export function setPlan(plan: PlanResult, sessionId: string = DEFAULT_SESSION_ID): void {
  const session = ensureSession(sessionId);
  session.plan = plan;
}

export function getPlan(sessionId: string = DEFAULT_SESSION_ID): PlanResult | null {
  return ensureSession(sessionId).plan;
}

export function flagUnknownEntity(
  entity: Omit<UnknownEntity, 'flaggedAt'>,
  sessionId: string = DEFAULT_SESSION_ID,
): void {
  const session = ensureSession(sessionId);
  session.unknownEntities.push({
    ...entity,
    flaggedAt: new Date().toISOString(),
  });
}

export function getUnknownEntities(sessionId: string = DEFAULT_SESSION_ID): UnknownEntity[] {
  return ensureSession(sessionId).unknownEntities;
}

export function setMobilityResult(
  result: MobilityAnalysisResult,
  sessionId: string = DEFAULT_SESSION_ID,
): void {
  const session = ensureSession(sessionId);
  session.mobilityResult = result;
}

export function getMobilityResult(
  sessionId: string = DEFAULT_SESSION_ID,
): MobilityAnalysisResult | null {
  return ensureSession(sessionId).mobilityResult;
}

export function clearSession(sessionId: string = DEFAULT_SESSION_ID): void {
  sessions.delete(sessionId);
}
