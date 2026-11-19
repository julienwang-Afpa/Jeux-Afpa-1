    } else if (path === 'score' || path === 'pick') {
      if (!player || !active || body.round !== round.id || !round.ids.includes(pid) || now < round.startAt) {
        return fail(409, 'Cette action ne correspond plus à la manche.');
      }
      const previous = await read(store, playerKey(pid));
      const own = previous?.data || { pid };
      if (path === 'score') {
        if (round.stage || now > round.endAt + GRACE) return fail(409, 'Les scores sont clos.');
        const { seq, raw, score, tb } = body;
        if (!Number.isSafeInteger(seq) || seq < 1 || !isInt(raw, 0, 100000) || !isInt(score, -1000, 100000) ||
          (tb !== undefined && tb !== null && !isInt(tb, 0, 600000))) return fail(400, 'Score invalide.');
        if (own.score?.round === round.id && own.score.seq >= seq) return json(200, { accepted: own.score.seq });
        own.score = { round: round.id, seq, raw, score, tb: tb ?? undefined };
      } else {
        const s = round.stage;
        if (!s || s.phase !== 'choose' || body.step !== s.step || now > s.until + 400) return fail(409, 'Ce choix est clos.');
        if (round.game === 'arena' && !s.survivors.includes(pid)) return fail(409, 'Tu es éliminé pour cette manche.');
        if (round.game === 'lucky' && s.rule === 'final' && !(s.lives[pid] > 0)) return fail(409, 'Tu n’as plus de vie.');
        const v = body.value;
        let value;
        if (round.game === 'truefalse') {
          if (typeof v !== 'boolean') return fail(400, 'Réponse invalide.');
          value = v;
        } else if (round.game === 'lucky') {
          if (!isInt(v, 0, s.rule === 'final' ? 8 : s.rule === 'gamble' ? 5 : 4)) return fail(400, 'Tonneau invalide.');
          value = v;
        } else {
          const keep = own.pick?.round === round.id && own.pick.step === s.step ? own.pick.value : {};
          value = { ...keep };
          if (v?.pos !== undefined) {
            if (!Array.isArray(v.pos) || v.pos.length !== 2 || !v.pos.every(n => Number.isFinite(n) && Math.abs(n) <= 1.01)) return fail(400, 'Position invalide.');
            value.pos = v.pos;
          }
          if (v?.angle !== undefined) {
            if (!Number.isFinite(v.angle) || Math.abs(v.angle) > 7) return fail(400, 'Visée invalide.');
            value.angle = v.angle;
          }
        }
        own.pick = { round: round.id, step: s.step, value };
      }
      if ((await save(store, playerKey(pid), previous, own)).modified) return json(200, { accepted: own.score?.seq ?? true });
      continue;
    } else if (isHost) {
      const series = st.series;
      const action = body.action || 'poll';
      if (action !== 'poll' && body.revision !== (st.revision || 0)) return fail(409, 'L’état de la partie a changé, réessaie.');
      if (action === 'poll') {
        const game = active && staged[round.game];
        if (game && now >= round.startAt && now >= round.stage.until) {
          let picks = new Map();
          if (game.needsPicks(round.stage)) {
            const docs = await readPlayers(store, room, round.ids);
            picks = new Map(docs.filter(d => d?.pick?.round === round.id && d.pick.step === round.stage.step).map(d => [d.pid, d.pick.value]));
            for (const id of round.ids) if (st.roster[id]?.botSkill) { const value=botPick(round,st.roster[id]); if(value!==null) picks.set(id,value); }
          }
          if (!game.advance(round, picks, now)) complete(st, []);
        } else if (active && !game && now >= round.endAt + GRACE) {
          complete(st, addBotsToDocs(st,round,await readPlayers(store, room, round.ids),now));
        } else {
          const result = view(st, now, null, true);
          if (active && !game && now >= round.startAt) {
            // Progression en direct pour le projecteur (lecture seule, aucune écriture).
            const docs = addBotsToDocs(st,round,await readPlayers(store, room, round.ids),now);
            result.live = Object.fromEntries(docs.filter(d => d?.score?.round === round.id).map(d => [d.pid, d.score.score]));
          }
          return json(200, result);
        }
      } else if (action === 'add-bots') {
        if (active) return fail(409, 'Attends la fin de la manche pour ajouter les robots.');
        const existing = Object.values(st.roster).filter(p => p.botSkill).length;
        if (existing >= 3) return fail(409, 'Les trois robots sont déjà dans la partie.');
        if (Object.keys(st.roster).length + (3-existing) > MAX_PLAYERS) return fail(409, 'Pas assez de places disponibles.');
        const labels=['Robot Raisin','Robot Gamay','Robot Tonneau'];
        for(let i=existing;i<3;i++){let pid=randomBytes(16).toString('hex');st.roster[pid]={pid,name:'🤖 '+labels[i],color:colors[(i*3+2)%colors.length],token:randomBytes(16).toString('hex'),botSkill:[1,.85,.7][i]};}
      } else if (action === 'series') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!Object.hasOwn(games, body.game) || !isInt(body.total, 1, 5)) return fail(400, 'Série invalide.');
        st.series = { game: body.game, total: body.total, played: 0 };
        st.pending = { rule: 'classic', practice: false };
      } else if (action === 'change-game') {
        if (active) return fail(409, 'Attends la fin de la manche pour changer de jeu.');
        st.series = null; st.pending = null;
      } else if (action === 'rule') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        if (body.rule !== 'classic' && !games[series.game].variants.includes(body.rule)) return fail(400, 'Variante inconnue.');
        st.pending.rule = body.rule;
      } else if (action === 'practice') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        st.pending.practice = Boolean(body.on);
      } else if (action === 'start') {
        const ids = Object.keys(st.roster);
        if (active || !st.pending || !ids.length) return fail(409, 'Il faut une manche préparée et au moins un joueur.');
        const { game } = series;
        if (ids.length < (games[game].minPlayers || 1)) return fail(409, `${games[game].name} demande au moins ${games[game].minPlayers} joueurs.`);
        const startAt = now + COUNTDOWN;
        st.round = {
          id: randomBytes(8).toString('hex'), game, rule: st.pending.rule, practice: st.pending.practice,
          index: series.played + 1, total: series.total, ids, startAt,
          endAt: staged[game] ? null : startAt + duration(game, st.pending.rule) * 1000,
          tally: {}, played: {},
        };
        if (staged[game]) staged[game].begin(st.round, st, now);
        st.pending = null;
      } else if (action === 'end') {
        if (!active || now < round.startAt) return fail(409, 'Cette manche ne peut pas être arrêtée.');
        if (staged[round.game]) complete(st, []);
        else if (now < round.endAt) round.endAt = now;
        else return fail(409, 'La manche se termine déjà.');
      } else if (action === 'reset') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        st.totals = {}; st.history = []; st.series = null; st.pending = null; st.round = null;
      } else if (action === 'remove') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!st.roster[body.player]) return fail(404, 'Joueur introuvable.');
        delete st.roster[body.player];
      } else return fail(404, 'Commande inconnue.');
      st.revision = (st.revision || 0) + 1;
    } else return fail(404, 'Commande inconnue.');

    if ((await save(store, key, entry, st)).modified) return json(200, view(st, now, pid, isHost));
  }
  return fail(503, 'Plusieurs actions simultanées. Réessaie.');
}
