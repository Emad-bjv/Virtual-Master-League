import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { teamApi } from '../services/api';

const TeamContext = createContext(null);

export const FORMATION_PRESETS = {
  '4-3-3 (4-3-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'CMF', x: 30, y: 52 },
    { pos: 'CMF', x: 50, y: 56 },
    { pos: 'CMF', x: 70, y: 52 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-3-3 (4-1-2-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'AMF', x: 35, y: 42 },
    { pos: 'AMF', x: 65, y: 42 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-3-3 (4-2-1-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 56 },
    { pos: 'CMF', x: 65, y: 56 },
    { pos: 'AMF', x: 50, y: 38 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-5-1 (4-2-3-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 56 },
    { pos: 'DMF', x: 65, y: 56 },
    { pos: 'LWF', x: 20, y: 36 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'RWF', x: 80, y: 36 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-5-1 (4-1-4-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'LMF', x: 18, y: 40 },
    { pos: 'CMF', x: 38, y: 42 },
    { pos: 'CMF', x: 62, y: 42 },
    { pos: 'RMF', x: 82, y: 40 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-5-1 (4-3-2-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'CMF', x: 28, y: 55 },
    { pos: 'CMF', x: 50, y: 58 },
    { pos: 'CMF', x: 72, y: 55 },
    { pos: 'AMF', x: 36, y: 35 },
    { pos: 'AMF', x: 64, y: 35 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-4-2 (4-4-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'LMF', x: 15, y: 45 },
    { pos: 'CMF', x: 38, y: 48 },
    { pos: 'CMF', x: 62, y: 48 },
    { pos: 'RMF', x: 85, y: 45 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '4-4-2 (4-2-2-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 55 },
    { pos: 'DMF', x: 65, y: 55 },
    { pos: 'AMF', x: 22, y: 36 },
    { pos: 'AMF', x: 78, y: 36 },
    { pos: 'SS', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '4-4-2 (4-3-1-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 62 },
    { pos: 'CMF', x: 30, y: 48 },
    { pos: 'CMF', x: 70, y: 48 },
    { pos: 'AMF', x: 50, y: 34 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-6-1 (3-2-4-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 38, y: 58 },
    { pos: 'DMF', x: 62, y: 58 },
    { pos: 'LMF', x: 15, y: 38 },
    { pos: 'AMF', x: 38, y: 35 },
    { pos: 'AMF', x: 62, y: 35 },
    { pos: 'RMF', x: 85, y: 38 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '3-5-2 (3-5-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'LMF', x: 15, y: 45 },
    { pos: 'CMF', x: 33, y: 52 },
    { pos: 'CMF', x: 50, y: 55 },
    { pos: 'CMF', x: 67, y: 52 },
    { pos: 'RMF', x: 85, y: 45 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-5-2 (3-2-3-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 38, y: 58 },
    { pos: 'DMF', x: 62, y: 58 },
    { pos: 'LMF', x: 15, y: 40 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'RMF', x: 85, y: 40 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-5-2 (3-3-2-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'CMF', x: 28, y: 52 },
    { pos: 'CMF', x: 72, y: 52 },
    { pos: 'AMF', x: 38, y: 35 },
    { pos: 'AMF', x: 62, y: 35 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-4-3 (3-2-2-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'CMF', x: 38, y: 56 },
    { pos: 'CMF', x: 62, y: 56 },
    { pos: 'AMF', x: 22, y: 36 },
    { pos: 'AMF', x: 78, y: 36 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '5-4-1 (5-2-2-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 38, y: 50 },
    { pos: 'CMF', x: 62, y: 50 },
    { pos: 'AMF', x: 32, y: 32 },
    { pos: 'AMF', x: 68, y: 32 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '5-3-2 (5-2-1-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 38, y: 52 },
    { pos: 'CMF', x: 62, y: 52 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '5-3-2 (5-3-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 28, y: 48 },
    { pos: 'DMF', x: 50, y: 52 },
    { pos: 'CMF', x: 72, y: 48 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
};

export const resolveFormationKey = (form) => {
  if (!form) return '4-3-3 (4-3-3)';
  if (FORMATION_PRESETS[form]) return form;
  const match = Object.keys(FORMATION_PRESETS).find(
    (f) => f.startsWith(form) || f.includes(form)
  );
  return match || '4-3-3 (4-3-3)';
};

export function matchPlayersToFormationSlots(playersList, preset) {
  if (!preset || !playersList || playersList.length === 0) return playersList;
  const unassigned = [...playersList];
  const slots = [...preset];
  const result = new Array(playersList.length).fill(null);

  // Pass 1: Exact natural position match
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) continue;
    const targetPos = slots[i].pos;
    const matchIdx = unassigned.findIndex(
      (p) => p && (p.naturalPosition || p.position) === targetPos
    );
    if (matchIdx !== -1) {
      result[i] = {
        ...unassigned[matchIdx],
        naturalPosition: unassigned[matchIdx].naturalPosition || unassigned[matchIdx].position,
        position: targetPos,
        x_coord: slots[i].x,
        y_coord: slots[i].y,
        is_starting: true,
      };
      unassigned[matchIdx] = null;
      slots[i] = null;
    }
  }

  // Pass 2: Position group fallback
  const groupFallback = {
    GK: ['GK'],
    CB: ['CB', 'LB', 'RB', 'DMF'],
    LB: ['LB', 'LMF', 'CB', 'RB'],
    RB: ['RB', 'RMF', 'CB', 'LB'],
    DMF: ['DMF', 'CMF', 'CB'],
    CMF: ['CMF', 'AMF', 'DMF', 'LMF', 'RMF'],
    AMF: ['AMF', 'CMF', 'SS', 'LWF', 'RWF'],
    LMF: ['LMF', 'LWF', 'CMF', 'LB'],
    RMF: ['RMF', 'RWF', 'CMF', 'RB'],
    LWF: ['LWF', 'LMF', 'SS', 'CF', 'AMF'],
    RWF: ['RWF', 'RMF', 'SS', 'CF', 'AMF'],
    SS: ['SS', 'CF', 'AMF', 'LWF', 'RWF'],
    CF: ['CF', 'SS', 'LWF', 'RWF', 'AMF'],
  };

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null) {
      const targetPos = slots[i].pos;
      const allowed = groupFallback[targetPos] || [];
      const matchIdx = unassigned.findIndex(
        (p) => p && allowed.includes(p.naturalPosition || p.position)
      );
      if (matchIdx !== -1) {
        result[i] = {
          ...unassigned[matchIdx],
          naturalPosition: unassigned[matchIdx].naturalPosition || unassigned[matchIdx].position,
          position: targetPos,
          x_coord: slots[i].x,
          y_coord: slots[i].y,
          is_starting: true,
        };
        unassigned[matchIdx] = null;
        slots[i] = null;
      }
    }
  }

  // Pass 3: Fill any remaining slots with remaining players
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null) {
      const matchIdx = unassigned.findIndex((p) => p !== null);
      if (matchIdx !== -1) {
        result[i] = {
          ...unassigned[matchIdx],
          naturalPosition: unassigned[matchIdx].naturalPosition || unassigned[matchIdx].position,
          position: slots[i].pos,
          x_coord: slots[i].x,
          y_coord: slots[i].y,
          is_starting: true,
        };
        unassigned[matchIdx] = null;
        slots[i] = null;
      }
    }
  }

  // Fallback for any leftovers
  return result.map((p, idx) =>
    p || {
      ...playersList[idx],
      naturalPosition: playersList[idx]?.naturalPosition || playersList[idx]?.position,
      is_starting: true,
    }
  );
}

export function TeamProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [formation, setFormationState] = useState('4-3-3 (4-2-1-3)');
  const [tactics, setTactics] = useState({
    attacking_style: 'بازی مالکانه',
    build_up: 'پاس کوتاه',
    attacking_area: 'مرکز',
    positioning: 'حفظ ترکیب',
    support_range: 7,
    defensive_style: 'فشار خط مقدم',
    containment_area: 'میانه',
    pressing: 'تهاجمی',
    defensive_line: 6,
    compactness: 5,
    adv_offense_1: 'تیکی تاکا',
    adv_offense_2: 'هیچکدام',
    adv_defense_1: 'خط دفاعی عمیق',
    adv_defense_2: 'هیچکدام',
  });
  const [isLineupSubmitted, setIsLineupSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const hydrateTeamData = useCallback((rawTeamData) => {
    if (!rawTeamData) {
      setTeam(null);
      setPlayers([]);
      return;
    }

    setTeam(rawTeamData);

    const resolvedForm = resolveFormationKey(
      rawTeamData.gameplan?.formation || rawTeamData.default_formation || '4-3-3 (4-2-1-3)'
    );
    setFormationState(resolvedForm);

    if (rawTeamData.gameplan) {
      setTactics((prev) => ({
        ...prev,
        ...rawTeamData.gameplan,
        formation: resolvedForm,
      }));
      setIsLineupSubmitted(!!rawTeamData.gameplan.is_submitted);
    }

    const rawPlayers = rawTeamData.players || [];
    if (rawPlayers.length > 0) {
      // Ensure all metadata properties are hydrated cleanly
      const hydrated = rawPlayers.map((p, idx) => ({
        ...p,
        id: p.id.toString(),
        naturalPosition: p.naturalPosition || p.position,
        position: p.position,
        overall: Number(p.overall) || 75,
        potential_ovr: Number(p.potential_ovr) || 99,
        stamina: Number(p.virtual_stamina) || 100,
        virtual_stamina: Number(p.virtual_stamina) || 100,
        base_stamina: Number(p.base_stamina) || 80,
        is_injured: Boolean(p.is_injured),
        is_starting: Boolean(p.is_starting),
        shirt_number: p.shirt_number || (idx + 1),
        x_coord: p.x_coord != null ? Number(p.x_coord) : null,
        y_coord: p.y_coord != null ? Number(p.y_coord) : null,
        wage: p.wage || '1000',
        market_value: p.market_value != null ? Number(p.market_value) : 1000000,
        rarity: p.rarity || 'REGULAR',
        status: p.is_injured ? 'مصدوم' : (Number(p.virtual_stamina) || 100) < 50 ? 'خسته' : 'سالم',
        trend: '▲',
      }));

      // Check if starting players need pitch coordinate auto-alignment
      const starters = hydrated.filter((p) => p.is_starting);
      const preset = FORMATION_PRESETS[resolvedForm];

      if (starters.length === 11 && starters.every((p) => p.x_coord != null && p.y_coord != null && (p.x_coord !== 0 || p.y_coord !== 0))) {
        setPlayers(hydrated);
      } else {
        // Auto-assign top 11 players to the starting formation slots
        const sorted = [...hydrated].sort((a, b) => b.overall - a.overall);
        const autoStarters = sorted.slice(0, 11);
        const mappedStarters = matchPlayersToFormationSlots(autoStarters, preset);
        const benchAndReserves = sorted.slice(11).map((p) => ({ ...p, is_starting: false }));
        setPlayers([...mappedStarters, ...benchAndReserves]);
      }
    } else {
      setPlayers([]);
    }
  }, []);

  const fetchTeam = useCallback(async (targetTeamId) => {
    let id = targetTeamId || team?.id;
    if (!id) {
      try {
        const storedUser = localStorage.getItem('vml_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          id = parsed?.team_id || parsed?.team?.id;
        }
      } catch (_e) {}
    }
    if (!id) return;
    setLoading(true);
    try {
      const res = await teamApi.getTeam(id);
      hydrateTeamData(res.data);
    } catch (err) {
      console.error('Failed to fetch team roster:', err);
    } finally {
      setLoading(false);
    }
  }, [hydrateTeamData, team?.id]);

  // Derived squad partitions: Starting XI, Substitutes (11), Reserves
  const startingXi = useMemo(() => {
    const starters = players.filter((p) => p.is_starting);
    if (starters.length === 11) return starters;
    return starters;
  }, [players]);

  const nonStarting = useMemo(() => {
    return players.filter((p) => !p.is_starting);
  }, [players]);

  const substitutes = useMemo(() => {
    return nonStarting.slice(0, 11);
  }, [nonStarting]);

  const reserves = useMemo(() => {
    return nonStarting.slice(11);
  }, [nonStarting]);

  // Change Formation and re-align Starting XI coordinates
  const setFormation = useCallback((newFormationName) => {
    const resolved = resolveFormationKey(newFormationName);
    const preset = FORMATION_PRESETS[resolved];
    setFormationState(resolved);

    if (preset) {
      setPlayers((prev) => {
        const starters = prev.filter((p) => p.is_starting);
        const bench = prev.filter((p) => !p.is_starting);
        const remapped = matchPlayersToFormationSlots(starters, preset);
        return [...remapped, ...bench];
      });
    }
  }, []);

  // Swap coordinates between two pitch starters
  const swapPitchPlayers = useCallback((id1, id2) => {
    setPlayers((prev) => {
      const p1 = prev.find((p) => p.id === id1);
      const p2 = prev.find((p) => p.id === id2);
      if (!p1 || !p2) return prev;

      const p1X = p1.x_coord;
      const p1Y = p1.y_coord;
      const p1Pos = p1.position;

      const p2X = p2.x_coord;
      const p2Y = p2.y_coord;
      const p2Pos = p2.position;

      return prev.map((p) => {
        if (p.id === id1) {
          return { ...p, x_coord: p2X, y_coord: p2Y, position: p2Pos, naturalPosition: p1.naturalPosition || p1.position };
        }
        if (p.id === id2) {
          return { ...p, x_coord: p1X, y_coord: p1Y, position: p1Pos, naturalPosition: p2.naturalPosition || p2.position };
        }
        return p;
      });
    });
  }, []);

  // Swap a starting pitch player with a bench/reserve player
  const swapPitchWithBench = useCallback((pitchId, benchId) => {
    setPlayers((prev) => {
      const pitchPlayer = prev.find((p) => p.id === pitchId);
      const benchPlayer = prev.find((p) => p.id === benchId);
      if (!pitchPlayer || !benchPlayer) return prev;

      const pitchSlotPos = pitchPlayer.position;
      const pitchSlotX = pitchPlayer.x_coord;
      const pitchSlotY = pitchPlayer.y_coord;
      const benchNaturalPos = benchPlayer.naturalPosition || benchPlayer.position;
      const pitchNaturalPos = pitchPlayer.naturalPosition || pitchPlayer.position;

      return prev.map((p) => {
        if (p.id === benchId) {
          return {
            ...p,
            is_starting: true,
            position: pitchSlotPos,
            naturalPosition: benchNaturalPos,
            x_coord: pitchSlotX,
            y_coord: pitchSlotY,
          };
        }
        if (p.id === pitchId) {
          return {
            ...p,
            is_starting: false,
            position: pitchNaturalPos,
            naturalPosition: pitchNaturalPos,
            x_coord: null,
            y_coord: null,
          };
        }
        return p;
      });
    });
  }, []);

  // Swap positions between two bench players
  const swapBenchPlayers = useCallback((benchId1, benchId2) => {
    setPlayers((prev) => {
      const idx1 = prev.findIndex((p) => p.id === benchId1);
      const idx2 = prev.findIndex((p) => p.id === benchId2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const next = [...prev];
      const temp = next[idx1];
      next[idx1] = next[idx2];
      next[idx2] = temp;
      return next;
    });
  }, []);

  // Save tactical lineup to backend API
  const saveGameplan = useCallback(async () => {
    if (!team?.id) return { success: false, error: 'No team found' };
    setLoading(true);
    try {
      const payload = {
        tactics: {
          formation,
          ...tactics,
        },
        players: players.map((p) => ({
          player_id: parseInt(p.id, 10),
          x_coord: p.x_coord || 50.0,
          y_coord: p.y_coord || 50.0,
          position: p.position,
          is_starting: p.is_starting,
        })),
      };
      await teamApi.submitGameplan(team.id, payload);
      setIsLineupSubmitted(true);
      return { success: true };
    } catch (err) {
      console.error('Failed to submit gameplan:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [team, formation, tactics, players]);

  const updateTeamGems = useCallback((newGems) => {
    setTeam((prev) => (prev ? { ...prev, gems: Number(newGems) } : prev));
  }, []);

  const updateTeamBudget = useCallback((newBudget) => {
    setTeam((prev) => (prev ? { ...prev, budget: newBudget } : prev));
  }, []);

  const updatePlayerState = useCallback((updatedPlayer) => {
    if (!updatedPlayer || !updatedPlayer.id) return;
    const targetId = updatedPlayer.id.toString();
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id.toString() === targetId) {
          const virtualStamina = Number(updatedPlayer.virtual_stamina ?? updatedPlayer.stamina ?? p.virtual_stamina);
          return {
            ...p,
            ...updatedPlayer,
            id: targetId,
            virtual_stamina: virtualStamina,
            stamina: virtualStamina,
            is_injured: Boolean(updatedPlayer.is_injured),
            is_locked: Boolean(updatedPlayer.is_locked),
            status: updatedPlayer.is_injured ? 'مصدوم' : virtualStamina < 50 ? 'خسته' : 'سالم',
          };
        }
        return p;
      })
    );
  }, []);

  const value = {
    team,
    setTeam,
    players,
    formation,
    tactics,
    loading,
    isLineupSubmitted,
    startingXi,
    substitutes,
    reserves,
    setPlayers,
    setFormation,
    setTactics,
    fetchTeam,
    hydrateTeamData,
    updateTeamGems,
    updateTeamBudget,
    updatePlayerState,
    swapPitchPlayers,
    swapPitchWithBench,
    swapBenchPlayers,
    saveGameplan,
    setIsLineupSubmitted,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

export default TeamContext;
