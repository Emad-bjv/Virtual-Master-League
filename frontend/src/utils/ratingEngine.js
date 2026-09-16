/**
 * ratingEngine.js
 * Client-side calculation engine mirroring backend/matches/rating_engine.py.
 * Calculates player match performance ratings (3.0 - 10.0) based on eFootball PES 2021 stats.
 */

export function calculatePlayerRating(position, stats = {}, matchContext = {}) {
  if (!stats || typeof stats !== 'object') {
    return {
      rating: 6.0,
      breakdown: [{ label: 'نمره پایه ورود به زمین', impact: '+6.0' }]
    };
  }

  const pos = String(position || 'CMF').toUpperCase().trim();
  const breakdown = [];
  let rating = 6.0;
  breakdown.push({ label: 'نمره پایه ورود به زمین', impact: '+6.0' });

  // Numerical stat extractions
  const goals = Number(stats.goals) || 0;
  const penaltyGoals = Number(stats.penalty_goals) || 0;
  const freekickGoals = Number(stats.freekick_goals) || 0;
  const assists = Number(stats.assists) || 0;

  const shotsTotal = Number(stats.shots_total) || 0;
  const shotsOnTarget = Number(stats.shots_on_target) || 0;
  const offTargetShots = Math.max(0, shotsTotal - shotsOnTarget);

  const passesTotal = Number(stats.passes_total) || 0;
  const passesCompleted = Number(stats.passes_completed) || 0;
  const crosses = Number(stats.crosses) || 0;

  const fouls = Number(stats.fouls) || 0;
  const offsides = Number(stats.offsides) || 0;
  const freekicksWon = Number(stats.freekicks_won) || 0;
  const blocks = Number(stats.blocks) || 0;
  const minutesPlayed = Number(stats.minutes_played) || 90;
  const dribbleDistance = Number(stats.dribble_distance) || 0;

  const duelsTotal = Number(stats.duels_total) || 0;
  const duelsWon = Number(stats.duels_won) || 0;
  const clearances = Number(stats.clearances) || 0;

  // Goalkeeper metrics
  const gkShotsOnTarget = Number(stats.gk_shots_on_target) || 0;
  const gkSaves = Number(stats.gk_saves) || 0;
  const penaltySaves = Number(stats.penalty_saves) || 0;

  // Match context
  const cleanSheet = Boolean(matchContext.clean_sheet);
  const goalsConceded = Number(matchContext.goals_conceded ?? stats.goals_conceded ?? 0);
  const yellowCards = Number(matchContext.yellow_cards ?? stats.yellow_cards ?? 0);
  const redCards = Number(matchContext.red_cards ?? stats.red_cards ?? 0);
  const teamWon = Boolean(matchContext.team_won);

  const isGoalkeeper = pos === 'GK';
  const isForward = ['CF', 'SS', 'LWF', 'RWF'].includes(pos);
  const isMidfielder = ['AMF', 'CMF', 'DMF', 'LMF', 'RMF'].includes(pos);
  const isDefender = ['CB', 'LB', 'RB'].includes(pos);

  // --- GOALKEEPER ---
  if (isGoalkeeper) {
    if (gkSaves > 0) {
      const bonus = Number((gkSaves * 0.5).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `مهار شوت‌های درون چارچوب (${gkSaves} مهار)`, impact: `+${bonus}` });
    }

    if (penaltySaves > 0) {
      const bonus = Number((penaltySaves * 1.5).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `مهار پنالتی حریف (${penaltySaves} مهار)`, impact: `+${bonus}` });
    }

    if (gkShotsOnTarget > 0) {
      const saveRate = gkSaves / gkShotsOnTarget;
      if (saveRate >= 0.8) {
        rating += 0.6;
        breakdown.push({ label: `درصد مهار عالی بالای ۸۰٪ (${Math.round(saveRate * 100)}%)`, impact: '+0.6' });
      } else if (saveRate <= 0.4 && goalsConceded > 1) {
        rating -= 0.5;
        breakdown.push({ label: 'درصد مهار پایین شوت‌ها', impact: '-0.5' });
      }
    }

    if (cleanSheet || goalsConceded === 0) {
      rating += 0.8;
      breakdown.push({ label: 'کلین‌شیت دروازه‌بان', impact: '+0.8' });
    } else if (goalsConceded > 0) {
      const pen = Number((goalsConceded * 0.35).toFixed(2));
      rating -= pen;
      breakdown.push({ label: `گل خورده تیم (${goalsConceded} گل)`, impact: `-${pen}` });
    }
  }

  // --- FORWARD ---
  else if (isForward) {
    if (goals > 0) {
      const bonus = Number((goals * 1.0).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `گل‌های زده در جریان بازی (${goals} گل)`, impact: `+${bonus}` });
    }

    if (freekickGoals > 0) {
      const bonus = Number((freekickGoals * 1.2).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `گل دیدنی ضربه آزاد (${freekickGoals} گل)`, impact: `+${bonus}` });
    }

    if (penaltyGoals > 0) {
      const bonus = Number((penaltyGoals * 0.7).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `گل پنالتی (${penaltyGoals} گل)`, impact: `+${bonus}` });
    }

    if (assists > 0) {
      const bonus = Number((assists * 0.7).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `پاس گل تعیین‌کننده (${assists} پاس گل)`, impact: `+${bonus}` });
    }

    if (shotsOnTarget > 0) {
      const bonus = Number((shotsOnTarget * 0.2).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `شوت در چارچوب حریف (${shotsOnTarget} شوت)`, impact: `+${bonus}` });
    }

    if (offTargetShots >= 3) {
      rating -= 0.3;
      breakdown.push({ label: `شوت‌های ناموفق خارج چارچوب (${offTargetShots} شوت)`, impact: '-0.3' });
    }

    if (dribbleDistance >= 20.0) {
      const bonus = Number(Math.min(0.6, (dribbleDistance / 30.0) * 0.3).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `مسافت موثر دریبل (${dribbleDistance.toFixed(1)} متر)`, impact: `+${bonus}` });
    }

    if (duelsWon > 0) {
      const bonus = Number(Math.min(0.5, duelsWon * 0.15).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `نبردهای پیروز مهاجم (${duelsWon} نبرد)`, impact: `+${bonus}` });
    }

    if (offsides >= 2) {
      const pen = Number(Math.min(0.4, offsides * 0.15).toFixed(2));
      rating -= pen;
      breakdown.push({ label: `تله آفساید حریف (${offsides} بار)`, impact: `-${pen}` });
    }
  }

  // --- MIDFIELDER ---
  else if (isMidfielder) {
    if (passesTotal >= 5) {
      const passAcc = passesCompleted / passesTotal;
      if (passAcc >= 0.88) {
        rating += 0.7;
        breakdown.push({ label: `دقت پاس عالی هافبک (${Math.round(passAcc * 100)}%)`, impact: '+0.7' });
      } else if (passAcc >= 0.78) {
        rating += 0.35;
        breakdown.push({ label: `دقت پاس استاندارد (${Math.round(passAcc * 100)}%)`, impact: '+0.35' });
      } else if (passAcc <= 0.60) {
        rating -= 0.4;
        breakdown.push({ label: `دقت پاس ضعیف (${Math.round(passAcc * 100)}%)`, impact: '-0.4' });
      }
    }

    if (assists > 0) {
      const bonus = Number((assists * 0.85).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `پاس گل و گلسازی (${assists} پاس گل)`, impact: `+${bonus}` });
    }

    if (goals > 0) {
      const bonus = Number((goals * 0.95).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `گلزنی هافبک (${goals} گل)`, impact: `+${bonus}` });
    }

    if (blocks > 0) {
      const bonus = Number(Math.min(0.6, blocks * 0.3).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `سد توپ و قطع مسیر پاس (${blocks} بار)`, impact: `+${bonus}` });
    }

    if (clearances > 0) {
      const bonus = Number(Math.min(0.5, clearances * 0.25).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `دفع و بازپس‌گیری توپ (${clearances} بار)`, impact: `+${bonus}` });
    }

    if (duelsWon > 0) {
      const bonus = Number(Math.min(0.6, duelsWon * 0.2).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `پیروزی در نبردهای میانه میدان (${duelsWon} نبرد)`, impact: `+${bonus}` });
    }

    if (crosses >= 3) {
      rating += 0.2;
      breakdown.push({ label: `ارسال‌های موفق سانتر (${crosses} سانتر)`, impact: '+0.2' });
    }
  }

  // --- DEFENDER ---
  else if (isDefender) {
    if (clearances > 0) {
      const bonus = Number(Math.min(0.9, clearances * 0.35).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `دفع و پوشش مدافع (${clearances} دفع توپ)`, impact: `+${bonus}` });
    }

    if (blocks > 0) {
      const bonus = Number(Math.min(0.8, blocks * 0.4).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `سد توپ و بلاک شوت (${blocks} بار)`, impact: `+${bonus}` });
    }

    if (duelsWon > 0) {
      const bonus = Number(Math.min(0.6, duelsWon * 0.2).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `پیروزی در نبردهای تن‌به‌تن (${duelsWon} نبرد)`, impact: `+${bonus}` });
    }

    if (duelsTotal > duelsWon && (duelsTotal - duelsWon) >= 3) {
      rating -= 0.3;
      breakdown.push({ label: 'شکست در نبردهای دفاعی', impact: '-0.3' });
    }

    if (cleanSheet || goalsConceded === 0) {
      rating += 0.7;
      breakdown.push({ label: 'کلین‌شیت خط دفاع', impact: '+0.7' });
    } else if (goalsConceded > 1) {
      const pen = Number(Math.min(0.8, (goalsConceded - 1) * 0.25).toFixed(2));
      rating -= pen;
      breakdown.push({ label: `آسیب‌پذیری خط دفاع (${goalsConceded} گل خورده)`, impact: `-${pen}` });
    }

    if (goals > 0) {
      const bonus = Number((goals * 1.1).toFixed(2));
      rating += bonus;
      breakdown.push({ label: `گلزنی درخشان مدافع (${goals} گل)`, impact: `+${bonus}` });
    }
  }

  // --- DISCIPLINARY & MATCH OUTCOME ---
  if (fouls >= 3) {
    const pen = Number(Math.min(0.5, fouls * 0.1).toFixed(2));
    rating -= pen;
    breakdown.push({ label: `خطاهای مکرر (${fouls} خطا)`, impact: `-${pen}` });
  }

  if (freekicksWon >= 2) {
    rating += 0.2;
    breakdown.push({ label: `گرفتن ضربه آزاد خطرناک (${freekicksWon} ضربه)`, impact: '+0.2' });
  }

  if (yellowCards > 0) {
    const pen = Number((yellowCards * 0.5).toFixed(2));
    rating -= pen;
    breakdown.push({ label: `کارت زرد انضباطی (${yellowCards} کارت)`, impact: `-${pen}` });
  }

  if (redCards > 0) {
    rating -= 2.0;
    breakdown.push({ label: 'اخراج با کارت قرمز مستقیم', impact: '-2.0' });
  }

  if (teamWon) {
    rating += 0.2;
    breakdown.push({ label: 'پیروزی نهایی تیم', impact: '+0.2' });
  }

  // Minute scaling
  if (minutesPlayed < 25) {
    const deviation = rating - 6.0;
    rating = 6.0 + (deviation * (minutesPlayed / 30.0));
  }

  const finalRating = Math.max(3.0, Math.min(10.0, Math.round(rating * 10) / 10));

  return {
    rating: Number(finalRating.toFixed(1)),
    breakdown
  };
}
