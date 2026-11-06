import {
  ActionRequest,
  CardDefinition,
  GameRulesConfig,
  LobbySummary,
  PlayerGameView,
} from '../types/game';

declare global {
  interface Window {
    __CB_CONFIG__?: {
      BACKEND_URL?: string;
    };
  }
}

export function resolveApiBaseUrl(): string {
  const runtimeUrl =
    typeof window !== 'undefined' ? window.__CB_CONFIG__?.BACKEND_URL : '';
  const env = (import.meta as any).env || {};
  const raw = (
    runtimeUrl ||
    env.VITE_API_BASE_URL ||
    env.VITE_BACKEND_URL ||
    env.BACKEND_URL ||
    env.API_BASE_URL ||
    ''
  ).trim();

  if (!raw) {
    return '/api';
  }

  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

const API_BASE = resolveApiBaseUrl();

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data as T;
}

export async function fetchLobbies(): Promise<LobbySummary[]> {
  const data = await requestJSON<{ lobbies: LobbySummary[] }>(`${API_BASE}/lobbies`);
  return data.lobbies || [];
}

export async function createLobby(params: {
  gameName: string;
  playerId: string;
  playerName: string;
  deck: CardDefinition[];
  rules: GameRulesConfig;
}): Promise<{ lobby: LobbySummary; view: PlayerGameView }> {
  return requestJSON<{ lobby: LobbySummary; view: PlayerGameView }>(`${API_BASE}/lobbies`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function joinLobby(params: {
  lobbyId: string;
  playerId: string;
  playerName: string;
  deck: CardDefinition[];
}): Promise<PlayerGameView> {
  const data = await requestJSON<{ view: PlayerGameView }>(
    `${API_BASE}/lobbies/${encodeURIComponent(params.lobbyId)}/join`,
    {
      method: 'POST',
      body: JSON.stringify({
        playerId: params.playerId,
        playerName: params.playerName,
        deck: params.deck,
      }),
    }
  );
  return data.view;
}

export async function pollGameState(
  lobbyId: string,
  playerId: string
): Promise<PlayerGameView> {
  const data = await requestJSON<{ view: PlayerGameView }>(
    `${API_BASE}/lobbies/${encodeURIComponent(lobbyId)}/state?playerId=${encodeURIComponent(
      playerId
    )}`
  );
  return data.view;
}

export async function submitGameAction(
  lobbyId: string,
  action: ActionRequest
): Promise<PlayerGameView> {
  const data = await requestJSON<{ view: PlayerGameView }>(
    `${API_BASE}/lobbies/${encodeURIComponent(lobbyId)}/action`,
    {
      method: 'POST',
      body: JSON.stringify(action),
    }
  );
  return data.view;
}
