import { atom } from 'jotai';
import type { UserProfile, PlanResult, ScenarioDelta, AnalyticsEvent, MoneyEvent, MobilityAnalysisResult } from '@copia/types';

export const profileAtom = atom<UserProfile | null>(null);
export const planAtom = atom<PlanResult | null>(null);
export const scenariosAtom = atom<ScenarioDelta[]>([]);
export const analyticsAtom = atom<AnalyticsEvent[]>([]);
export const loadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);
export const moneyEventAtom = atom<MoneyEvent | null>(null);
export const mobilityResultAtom = atom<MobilityAnalysisResult | null>(null);
export const narrationAtom = atom<string | null>(null);
export const narrationLoadingAtom = atom<boolean>(false);
export const chatMessagesAtom = atom<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
export const chatLoadingAtom = atom<boolean>(false);
