/* ============================================================================
   fetch-scores.js  —  Recupere les matchs EN DIRECT depuis API-Football
   (RapidAPI) et ecrit un fichier scores.json compact.
   Execute par GitHub Actions (Node 20+, fetch natif). Ne PAS mettre la cle ici :
   elle vient de la variable d'environnement RAPIDAPI_KEY (secret GitHub).
============================================================================ */
const fs = require('fs');

const KEY  = process.env.RAPIDAPI_KEY;
const HOST = 'api-football-v1.p.rapidapi.com';

// Competitions suivies (IDs API-Football) :
//   61  Ligue 1
//   66  Coupe de France
//   3   Ligue Europa (UEFA Europa League)
//   848 Ligue Conference (UEFA Europa Conference League)
//   526 Trophee des Champions
//   2   Ligue des Champions (UEFA Champions League)
//   1   Coupe du Monde (World Cup)
//   4   Euro (UEFA European Championship)
//   6   CAN (Coupe d'Afrique des Nations)
//   9   Copa America
//   32/29/30/31/33/34  Eliminatoires Coupe du Monde (Europe/Afrique/Asie/CONCACAF/Oceanie/Amerique du Sud)
//   960 Eliminatoires Euro
const LEAGUES = [61, 66, 3, 848, 526, 2, 1, 4, 6, 9, 32, 34, 29, 30, 31, 33, 960];

if (!KEY) { console.error('ERREUR : secret RAPIDAPI_KEY manquant.'); process.exit(1); }

(async () => {
	// live=<id-id-...> : matchs en cours UNIQUEMENT dans les competitions suivies (leger + moins de quota)
	const res = await fetch(`https://${HOST}/v3/fixtures?live=${LEAGUES.join('-')}`, {
		headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST },
	});

	if (!res.ok) {
		console.error('ERREUR API', res.status, (await res.text()).slice(0, 300));
		process.exit(1);
	}

	const data = await res.json();
	// Filet de securite : on ne garde que les competitions suivies, meme si l'API elargit.
	const list = (Array.isArray(data.response) ? data.response : [])
		.filter(f => LEAGUES.indexOf(f.league && f.league.id) !== -1);

	const matches = list.map(f => ({
		id:      f.fixture?.id,
		date:    f.fixture?.date,                 // ISO
		status:  f.fixture?.status?.short,        // 1H, HT, 2H, ET, FT, ...
		elapsed: f.fixture?.status?.elapsed,      // minute de jeu
		league:  f.league?.id,
		home:    f.teams?.home?.name,
		away:    f.teams?.away?.name,
		gh:      f.goals?.home,
		ga:      f.goals?.away,
	}));

	const out = {
		updated: new Date().toISOString(),
		count:   matches.length,
		matches: matches,
	};

	fs.writeFileSync('scores.json', JSON.stringify(out));
	console.log('scores.json ecrit :', matches.length, 'match(s) en direct.');
})().catch(e => { console.error('ECHEC :', e); process.exit(1); });
