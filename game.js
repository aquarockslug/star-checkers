const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3,
	0.04, 0.05, 350,
]);

const WINJINGLE = new Sound([
	0.6, 0.05, 420, 0.02, 0.9, 0, 1, 1.8, 0, 0, 0, 0, 0, 0.4, 0, 0.02, 0, 0.6,
	0.08, 0.01, 600,
]);

const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);
const GOLD = new Color().setHex("#ffd76a");
const GOLDDEEP = new Color().setHex("#c98a1b");

// space theme palette
const SKYTOP = new Color().setHex("#131a33");
const SKYBOTTOM = new Color().setHex("#05070f");
const PLATECOLOR = new Color().setHex("#232b47");
const PLATEEDGE = new Color().setHex("#414e7d");
const HOLECOLOR = new Color().setHex("#0d1122");

const HOLESIZE = 1.35;
const BOARDSIZE = 1.49;
const MARBLESIZE = HOLESIZE - 0.25;

// star plate outline (six-pointed star around the holes)
const STAR_TIP_R = Math.sqrt(48) * BOARDSIZE + 0.55;
const STAR_VALLEY_R = Math.sqrt(21) * BOARDSIZE + 0.5;
let STARPTS = [];
let STARSKY = [];

mix = (a, b, t) =>
	new Color(
		a.r + (b.r - a.r) * t,
		a.g + (b.g - a.g) * t,
		a.b + (b.b - a.b) * t,
	);
shade = (c, t) => mix(c, BLACK, t);
tint = (c, t) => mix(c, WHITE, t);
withAlpha = (c, a) => new Color(c.r, c.g, c.b, a);

initStarPlate = () => {
	STARPTS = [];
	for (let k = 0; k < 12; k++) {
		const ang = Math.PI / 6 + (k * Math.PI) / 6;
		const rad = k % 2 === 0 ? STAR_TIP_R : STAR_VALLEY_R;
		STARPTS.push(vec2(Math.cos(ang) * rad, Math.sin(ang) * rad));
	}
};

initStarfield = () => {
	const rng = new RandomGenerator(1337);
	STARSKY = [];
	for (let i = 0; i < 130; i++) {
		STARSKY.push({
			pos: vec2(rng.float(-13, 13), rng.float(-12.5, 12.5)),
			size: rng.float(0.02, 0.09),
			alpha: rng.float(0.15, 0.7),
			phase: rng.float(0, Math.PI * 2),
			speed: rng.float(0.5, 2),
		});
	}
};

renderBackground = () => {
	drawRectGradient(vec2(), vec2(40), SKYTOP, SKYBOTTOM);
	for (const s of STARSKY) {
		const tw = 0.6 + 0.4 * Math.sin(time * s.speed + s.phase);
		drawCircle(s.pos, s.size, withAlpha(WHITE, s.alpha * tw));
	}
};

drawStarPlate = () => {
	// soft glow ring tinted by current player
	setAdditiveBlendMode(true);
	drawCircle(vec2(), STAR_TIP_R + 0.7, withAlpha(currPlayer.color, 0.08));
	drawCircle(vec2(), STAR_TIP_R + 0.3, withAlpha(currPlayer.color, 0.06));
	setAdditiveBlendMode(false);

	// drop shadow
	const shadowPts = STARPTS.map((p) => vec2(p.x + 0.3, p.y - 0.45));
	drawPoly(shadowPts, new Color(0, 0, 0, 0.4));

	drawPoly(STARPTS, PLATECOLOR, 0.22, PLATEEDGE);
};

drawMarble = (pos, size, color) => {
	drawCircle(pos, size, color, 0.1, shade(color, 0.5));
};

drawHole = (pos) => {
	drawCircle(pos, HOLESIZE + 0.07, shade(PLATECOLOR, 0.5));
	drawCircle(pos, HOLESIZE, HOLECOLOR, 0.08, PLATEEDGE);
};

drawCapsule = (pos, size, color, borderColor) => {
	if (borderColor)
		drawCapsule(pos, vec2(size.x + 0.24, size.y + 0.24), borderColor);
	drawRect(pos, size, color);
	const r = size.y / 2;
	drawCircle(vec2(pos.x - size.x / 2, pos.y), r, color);
	drawCircle(vec2(pos.x + size.x / 2, pos.y), r, color);
};

let CPU_MOVE_DELAY = 1;
let MOVEGUIDES = false;
let GOALGUIDE = false;

const ANIMATION_SPEED = {
	CPU_DURATION: 7,
	HUMAN_DURATION: 14,
};

let particles = [];
let gamePhase = "menu";
let selectedPlayer = null;
let cpuCount = 1;
let winnerPlayer = null;
let confettiTimer = 0;
const PLAYERS = [
	{
		position: "top",
		turnOrder: 4,
		color: new Color().setHex("#0080ff"),
		cpu: true,
		goalHoles: [],
		displayName: "Blue",
	},
	{
		position: "bottomRight",
		turnOrder: 6,
		color: new Color().setHex("#ffff00"),
		cpu: true,
		goalHoles: [],
		displayName: "Yellow",
	},
	{
		position: "bottomLeft",
		turnOrder: 2,
		color: new Color().setHex("#ff00ff"),
		cpu: true,
		goalHoles: [],
		displayName: "Magenta",
	},
	{
		position: "bottom",
		turnOrder: 1,
		color: new Color().setHex("#ff0080"),
		cpu: false,
		goalHoles: [],
		displayName: "Pink",
	},
	{
		position: "topLeft",
		turnOrder: 3,
		color: new Color().setHex("#00ff88"),
		cpu: true,
		goalHoles: [],
		displayName: "Green",
	},
	{
		position: "topRight",
		turnOrder: 5,
		color: new Color().setHex("#ff0008"),
		cpu: true,
		goalHoles: [],
		displayName: "Red",
	},
];

easeOutCubic = (t) => 1 - (1 - t) ** 3;

spawnParticles = (pos, color, count = 3, vel = vec2()) => {
	for (let i = 0; i < count; i++) {
		const life = rand(0.4, 0.8);
		particles.push({
			pos: vec2(pos.x + rand(-0.2, 0.2), pos.y + rand(-0.2, 0.2)),
			color: new Color(color.r, color.g, color.b),
			life,
			maxLife: life,
			size: rand(0.3, 0.6) * MARBLESIZE,
			vel: vec2(vel.x + rand(-0.3, 0.3), vel.y + rand(-0.3, 0.3)),
		});
	}
};

updateParticles = () => {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= 1 / 60;
		p.pos.x += p.vel.x / 60;
		p.pos.y += p.vel.y / 60;
		p.vel.x *= 0.99;
		p.vel.y *= 0.99;
		if (p.life <= 0) particles.splice(i, 1);
	}
};

// creates a hexagonal hole with coordinates and marble
hole = (q, r, marble) => {
	const x = (q + r * 0.5) * BOARDSIZE;
	const y = ((r * Math.sqrt(3)) / 2) * BOARDSIZE;
	return {
		coords: { q, r, s: -q - r },
		pos: vec2(x, y),
		marble,
	};
};
marble = (player) => ({
	player,
	color: PLAYERS.find((p) => p.position === player)?.color || HOLECOLOR,
});
// creates an empty marble
empty = () => ({ color: HOLECOLOR });
// creates a held marble state
held = (hole = null, marble = empty()) => ({
	hole,
	marble,
	moves: (board) => validMoves(board, hole, marble),
});

// calculates all possible hopping moves from current position
hoppingMoves = (board, currentHole, visited = new Set()) => {
	const key = `${currentHole.coords.q},${currentHole.coords.r}`;
	if (visited.has(key)) return [];

	const newVisited = new Set(visited).add(key);

	findTarget = (board, currentHole, adjacent) => {
		const dir = {
			q: adjacent.coords.q - currentHole.coords.q,
			r: adjacent.coords.r - currentHole.coords.r,
		};
		return board.find(
			(h) =>
				h.coords.q === currentHole.coords.q + dir.q * 2 &&
				h.coords.r === currentHole.coords.r + dir.r * 2 &&
				h.marble.color === HOLECOLOR,
		);
	};

	return neighbors(board, currentHole)
		.filter((adj) => adj.marble.color !== HOLECOLOR)
		.map((adj) => findTarget(board, currentHole, adj))
		.filter(Boolean)
		.flatMap((target) => [target, ...hoppingMoves(board, target, newVisited)]);
};

// get hopping targets from a position
getHoppingTargets = (board, current) =>
	neighbors(board, current)
		.filter((adj) => adj.marble.color !== HOLECOLOR)
		.map((adj) => {
			const dir = {
				q: adj.coords.q - current.coords.q,
				r: adj.coords.r - current.coords.r,
			};
			return board.find(
				(h) =>
					h.coords.q === current.coords.q + dir.q * 2 &&
					h.coords.r === current.coords.r + dir.r * 2 &&
					h.marble.color === HOLECOLOR,
			);
		})
		.filter(Boolean);

// find path recursively using functional approach
findHoppingPath = (board, current, target, visited = new Set()) => {
	const key = `${current.coords.q},${current.coords.r}`;
	if (visited.has(key) || current === target)
		return current === target ? [current] : null;

	const newVisited = new Set(visited).add(key);
	const targets = getHoppingTargets(board, current);

	const pathResult = targets
		.map((hop) => findHoppingPath(board, hop, target, newVisited))
		.find((result) => result !== null);

	return pathResult ? [current, ...pathResult] : null;
};

// calculate the complete path including intermediate hop positions
calculateMovePath = (board, from, to) => {
	if (!from || !to || from === to) return [from];

	// simple adjacent move
	if (neighbors(board, from).includes(to)) {
		return [from, to];
	}

	// find hopping path
	const hoppingPath = findHoppingPath(board, from, to);
	return hoppingPath || [from, to];
};

validMoves = (board, hole) =>
	hole
		? [
				...neighbors(board, hole).filter((h) => h.marble.color === HOLECOLOR),
				...hoppingMoves(board, hole),
			]
		: [];

neighbors = (board, hole, distance = 1) => {
	const { q, r } = hole.coords;
	const neighborCoords = [
		{ q: q + distance, r: r }, // right
		{ q: q, r: r + distance }, // up right
		{ q: q - distance, r: r + distance }, // up left
		{ q: q - distance, r: r }, // left
		{ q: q, r: r - distance }, // down left
		{ q: q + distance, r: r - distance }, // down right
	];

	return board.filter((h) =>
		neighborCoords.some(
			(coord) => h.coords.q === coord.q && h.coords.r === coord.r,
		),
	);
};

holeDistance = (hole1, hole2) => {
	const { q: q1, r: r1, s: s1 } = hole1.coords;
	const { q: q2, r: r2, s: s2 } = hole2.coords;
	return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
};

nearestHole = (board, pos) =>
	board.reduce((nearest, hole) =>
		hole.pos.distance(pos) < nearest.pos.distance(pos) ? hole : nearest,
	);

placeMarble = (board, hole, marble) =>
	board.map((h) =>
		h.coords.q === hole.coords.q && h.coords.r === hole.coords.r
			? { ...h, marble }
			: h,
	);

checkWinner = (board) => {
	for (const player of PLAYERS) {
		if (player.goalHoles.length === 0) continue;

		const goalHolesFilled = player.goalHoles.every((goalHole) => {
			// find the corresponding hole
			const currentHole = board.find(
				(h) =>
					h.coords.q === goalHole.coords.q && h.coords.r === goalHole.coords.r,
			);
			return currentHole && currentHole.marble.player === player.position;
		});

		if (goalHolesFilled) {
			return player;
		}
	}
	return null;
};

nextPlayer = (player, board) => {
	const winner = checkWinner(board);
	if (winner) {
		winnerPlayer = winner;
		gamePhase = "gameover";
		WINJINGLE.play();
		for (let i = 0; i < 60; i++)
			spawnParticles(
				winner.labelPos || vec2(),
				winner.color,
				1,
				randVec2(rand(1, 7)),
			);
		return winner;
	}
	const activePlayers = PLAYERS.filter((p) => p.active).sort(
		(a, b) => a.turnOrder - b.turnOrder,
	);
	const currentIndex = activePlayers.indexOf(player);
	return activePlayers[(currentIndex + 1) % activePlayers.length];
};

cpuMove = (board, player) => {
	const playerMarbles = board.filter(
		(h) => h.marble.player === player.position,
	);
	const validMovesList = [];

	for (const marbleHole of playerMarbles) {
		const moves = validMoves(board, marbleHole, marbleHole.marble);
		for (const targetHole of moves) {
			// calculate distance to nearest goal hole before and after move
			const currentMinDistance = Math.min(
				...player.goalHoles.map((goal) => holeDistance(marbleHole, goal)),
			);
			const newMinDistance = Math.min(
				...player.goalHoles.map((goal) => holeDistance(targetHole, goal)),
			);

			// score: negative is better (closer to goals)
			const score = newMinDistance - currentMinDistance;

			validMovesList.push({
				from: marbleHole,
				to: targetHole,
				score,
			});
		}
	}

	if (validMovesList.length === 0) return null;

	// sort by score (lower is better) and add some randomness for tie-breaking
	validMovesList.sort((a, b) => {
		const scoreDiff = a.score - b.score;
		if (Math.abs(scoreDiff) < 0.01) {
			// if scores are very similar, add randomness
			return Math.random() - 0.5;
		}
		return scoreDiff;
	});

	const bestMove = validMovesList[0];
	return {
		newBoard: placeMarble(
			placeMarble(board, bestMove.to, bestMove.from.marble),
			bestMove.from,
			empty(),
		),
		from: bestMove.from,
		to: bestMove.to,
	};
};

let cpuMoveTimer = 0;
let cpuMoveAnimation = null;
let humanMoveAnimation = null;
let pendingMove = null; // stores move data to execute after animation

// create animation object with functional approach
createMoveAnimation = (color, path, duration = 30) => ({
	color,
	path,
	duration,
	progress: 0,
});

// update animation progress - returns true if complete
updateAnimation = (animation) => {
	animation.progress += 1 / animation.duration;
	return animation.progress >= 1;
};

// get current position during animation with ease-out easing
getAnimationPosition = (animation) => {
	const totalSegments = animation.path.length - 1;
	const totalProgress = Math.min(animation.progress, 1);

	// calculate which segment we're in and progress within that segment
	const segmentWithPause = totalProgress * totalSegments;
	const currentSegment = Math.floor(segmentWithPause);
	const segmentProgress = easeOutCubic(segmentWithPause - currentSegment);

	// if we're at or beyond the last segment, return final position
	if (currentSegment >= totalSegments) {
		return animation.path[animation.path.length - 1].pos;
	}

	// eased interpolation between current and next hole
	const from = animation.path[currentSegment].pos;
	const to = animation.path[currentSegment + 1].pos;
	return from.lerp(to, segmentProgress);
};

cpuPlay = (board, player) => {
	const moveResult = cpuMove(board, player);
	if (!moveResult) return;

	const path = calculateMovePath(board, moveResult.from, moveResult.to);
	cpuMoveAnimation = createMoveAnimation(
		player.color,
		path,
		ANIMATION_SPEED.CPU_DURATION * path.length,
	);

	// store move data to execute after animation
	pendingMove = {
		from: moveResult.from,
		to: moveResult.to,
		marble: moveResult.from.marble,
		newBoard: moveResult.newBoard,
	};

	BUTTONCLICKSOUND.play();
	return board; // return original board until animation completes
};

function updateMenu() {
	if (mouseWasPressed(0)) {
		const items = getMenuPlayerPositions();
		for (const item of items) {
			if (mousePos.distance(item.pos) < 2.9) {
				selectedPlayer = item.player;
				BUTTONCLICKSOUND.play();
				return;
			}
		}
		if (mousePos.distance(vec2(-5, -3)) < 1.6) {
			cpuCount = Math.max(1, cpuCount - 1);
			BUTTONCLICKSOUND.play();
			return;
		}
		if (mousePos.distance(vec2(5, -3)) < 1.6) {
			cpuCount = Math.min(5, cpuCount + 1);
			BUTTONCLICKSOUND.play();
			return;
		}
		if (mousePos.distance(vec2(0, -7.8)) < 4) {
			BUTTONCLICKSOUND.play();
			startGame();
		}
	}
}

function getMenuPlayerPositions() {
	const positions = [];
	const rows = [
		{ y: 7, players: [PLAYERS[4], PLAYERS[0], PLAYERS[5]] },
		{ y: 2, players: [PLAYERS[2], PLAYERS[3], PLAYERS[1]] },
	];
	for (const row of rows) {
		for (let i = 0; i < row.players.length; i++) {
			positions.push({
				pos: vec2((i - 1) * 5.5, row.y),
				player: row.players[i],
			});
		}
	}
	return positions;
}

function renderMenu() {
	renderBackground();

	// title with soft glow + drop shadow
	setAdditiveBlendMode(true);
	drawCircle(vec2(0, 13.2), 7.5, withAlpha(GOLD, 0.06));
	setAdditiveBlendMode(false);
	drawText("STAR CHECKERS", vec2(0.14, 13.26), 2.6, new Color(0, 0, 0, 0.65));
	drawText("STAR CHECKERS", vec2(0, 13.4), 2.6, GOLD);
	drawText(
		"a race of shining marbles",
		vec2(0, 11.3),
		0.85,
		withAlpha(SANDLIGHTBROWN, 0.9),
	);

	// color picker
	const items = getMenuPlayerPositions();
	for (const item of items) {
		const isSelected = selectedPlayer === item.player;
		const isHover = mousePos.distance(item.pos) < 2;
		const bob = isSelected ? Math.sin(time * 5) * 0.15 : 0;
		const pos = vec2(item.pos.x, item.pos.y + bob);
		const size = (isHover || isSelected ? 1.7 : 1.55) * MARBLESIZE * 1.35;

		if (isSelected) {
			setAdditiveBlendMode(true);
			drawCircle(
				pos,
				size + 0.9 + Math.sin(time * 6) * 0.25,
				withAlpha(item.player.color, 0.35),
			);
			drawCircle(pos, size + 0.45, withAlpha(WHITE, 0.25));
			setAdditiveBlendMode(false);
		} else if (isHover) {
			drawCircle(pos, size + 0.35, withAlpha(WHITE, 0.18));
		}
		drawMarble(pos, size, item.player.color);
		drawText(
			item.player.displayName,
			vec2(pos.x, item.pos.y - 2.3),
			isSelected ? 0.62 : 0.52,
			isSelected
				? tint(item.player.color, 0.4)
				: withAlpha(SANDLIGHTBROWN, 0.75),
			0.05,
			new Color(0, 0, 0, 0.5),
		);
	}

	// CPU count control
	const cpuLabelY = -3;
	drawText(
		"CPU OPPONENTS",
		vec2(0, cpuLabelY + 1.9),
		0.72,
		withAlpha(SANDLIGHTBROWN, 0.85),
	);
	for (const [bx, label] of [
		[-5, "\u2014"],
		[5, "+"],
	]) {
		const hover = mousePos.distance(vec2(bx, cpuLabelY)) < 1.6;
		drawCapsule(
			vec2(bx, cpuLabelY),
			vec2(2.2, 1.9),
			hover ? PLATEEDGE : PLATECOLOR,
			PLATEEDGE,
		);
		drawText(label, vec2(bx, cpuLabelY), 1.2, hover ? GOLD : SANDLIGHTBROWN);
	}
	drawText(
		`${cpuCount}`,
		vec2(0, cpuLabelY),
		1.7,
		GOLD,
		0.06,
		new Color(0, 0, 0, 0.6),
	);

	// Start button
	const btnPos = vec2(0, -7.8);
	const btnHover = mousePos.distance(btnPos) < 4;
	const w = btnHover ? 9.6 : 9.2;
	drawCapsule(btnPos, vec2(w + 0.24, 2.74), shade(GOLDDEEP, 0.25));
	drawRectGradient(
		btnPos,
		vec2(w, 2.5),
		tint(GOLD, btnHover ? 0.5 : 0.3),
		GOLD,
	);
	drawText("START GAME", btnPos, 0.95, shade(GOLDDEEP, 0.45));

	drawText(
		"first to fill the far side wins",
		vec2(0, -10.6),
		0.55,
		withAlpha(SANDLIGHTBROWN, 0.5),
	);
}

/////////////////////////////////////////////////////////////////////////////////

// initialize game board with hexagonal layout
function boardInit(radius) {
	const board = [];
	for (let q = -radius; q <= radius; q++) {
		const r1 = Math.max(-radius, -q - radius);
		const r2 = Math.min(radius, -q + radius);
		for (let r = r1; r <= r2; r++) {
			board.push(hole(q, r, empty()));
		}
	}

	const filteredBoard = board.filter((hole) => {
		const { q, r, s } = hole.coords;
		return (
			(q + r <= 4 && q + s <= 4 && r + s <= 4) ||
			(q + r >= -4 && q + s >= -4 && r + s >= -4)
		);
	});

	// clear existing goal holes
	PLAYERS.forEach((player) => {
		player.goalHoles = [];
	});

	const boardWithMarbles = filteredBoard.map((hole) => {
		const { q, r, s } = hole.coords;
		const position =
			r > 4
				? "top"
				: q > 4
					? "bottomRight"
					: s > 4
						? "bottomLeft"
						: r < -4
							? "bottom"
							: q < -4
								? "topLeft"
								: s < -4
									? "topRight"
									: null;
		if (position) {
			const player = PLAYERS.find((p) => p.position === position);
			if (player?.active) return { ...hole, marble: marble(position) };
		}
		return hole;
	});

	// assign goal holes (opposite side from starting position)
	boardWithMarbles.forEach((hole) => {
		const { q, r, s } = hole.coords;
		const goalPosition =
			r < -4
				? "top"
				: q < -4
					? "bottomRight"
					: s < -4
						? "bottomLeft"
						: r > 4
							? "bottom"
							: q > 4
								? "topLeft"
								: s > 4
									? "topRight"
									: null;
		if (goalPosition) {
			const player = PLAYERS.find((p) => p.position === goalPosition);
			if (player?.active) player.goalHoles.push(hole);
		}
	});

	// compute label positions for each player
	for (const player of PLAYERS) {
		if (!player.active) {
			player.labelPos = undefined;
			continue;
		}
		const holes = boardWithMarbles.filter(
			(h) => h.marble.player === player.position,
		);
		if (holes.length > 0) {
			let sx = 0,
				sy = 0;
			for (const h of holes) {
				sx += h.pos.x;
				sy += h.pos.y;
			}
			player.labelPos = vec2(sx / holes.length, sy / holes.length).scale(1.35);
		}
	}

	return boardWithMarbles;
}

// reset game state
function resetGame() {
	board = boardInit(8);
	const activePlayers = PLAYERS.filter((p) => p.active).sort(
		(a, b) => a.turnOrder - b.turnOrder,
	);
	currPlayer = activePlayers[0];
	currHeld = held();
	particles = [];
	cpuMoveTimer = 0;
	cpuMoveAnimation = null;
	humanMoveAnimation = null;
	pendingMove = null;
	winnerPlayer = null;
	confettiTimer = 0;
}

// initialize game state
function gameInit() {
	setCanvasFixedSize(vec2(720, 720));
	fontDefault = "Iceberg, sans-serif";
	canvasClearColor = SKYBOTTOM;
	initStarPlate();
	initStarfield();
	setupUI();
	selectedPlayer = PLAYERS[3];
	gamePhase = "menu";
	board = boardInit(8);
	currPlayer = PLAYERS.find((p) => p.turnOrder === 1);
	currHeld = held();
}

function startGame() {
	for (const p of PLAYERS) {
		p.active = false;
		p.cpu = true;
	}

	const bottomPlayer = PLAYERS.find((p) => p.position === "bottom");
	bottomPlayer.active = true;
	bottomPlayer.cpu = false;

	if (selectedPlayer !== bottomPlayer) {
		const tempColor = bottomPlayer.color;
		bottomPlayer.color = selectedPlayer.color;
		selectedPlayer.color = tempColor;
		const tempName = bottomPlayer.displayName;
		bottomPlayer.displayName = selectedPlayer.displayName;
		selectedPlayer.displayName = tempName;
	}

	const topPlayer = PLAYERS.find((p) => p.position === "top");
	topPlayer.active = true;
	topPlayer.cpu = true;

	const remaining = ["bottomRight", "bottomLeft", "topLeft", "topRight"];
	for (let i = remaining.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[remaining[i], remaining[j]] = [remaining[j], remaining[i]];
	}
	const extraCount = Math.min(cpuCount - 1, remaining.length);
	for (let i = 0; i < extraCount; i++) {
		const p = PLAYERS.find((p) => p.position === remaining[i]);
		p.active = true;
		p.cpu = true;
	}

	resetGame();
	gamePhase = "playing";
}

// update game logic each frame
function gameUpdate() {
	if (gamePhase === "menu") {
		updateMenu();
		return;
	}

	if (gamePhase === "gameover") {
		updateGameOver();
		return;
	}

	updateParticles();

	const animationComplete = (animation) => {
		if (animation && updateAnimation(animation)) {
			if (pendingMove) {
				board = pendingMove.newBoard;
				currPlayer = nextPlayer(currPlayer, board);
				pendingMove = null;
			}
			return true;
		}
		return false;
	};

	if (cpuMoveAnimation) {
		if (animationComplete(cpuMoveAnimation)) {
			cpuMoveAnimation = null;
		} else {
			spawnParticles(
				getAnimationPosition(cpuMoveAnimation),
				cpuMoveAnimation.color,
				1,
			);
		}
		return;
	}

	if (humanMoveAnimation) {
		if (animationComplete(humanMoveAnimation)) {
			humanMoveAnimation = null;
		} else {
			spawnParticles(
				getAnimationPosition(humanMoveAnimation),
				humanMoveAnimation.color,
				1,
			);
		}
		return;
	}

	const isCurrentPlayerCPU = currPlayer.cpu;

	if (isCurrentPlayerCPU) {
		if (cpuMoveTimer === 0) {
			cpuMoveTimer = time + CPU_MOVE_DELAY;
		} else if (time >= cpuMoveTimer) {
			board = cpuPlay(board, currPlayer);
			cpuMoveTimer = 0;
		}
		return;
	}

	cpuMoveTimer = 0;

	let mouseHole = null;
	if (mouseWasPressed(0)) {
		mouseHole = nearestHole(board, mousePos);
		if (mouseHole.marble.player === currPlayer.position)
			currHeld = held(mouseHole, mouseHole.marble);
	}
	if (mouseWasReleased(0)) {
		if (!currHeld.hole) return;
		mouseHole = nearestHole(board, mousePos);

		if (
			currHeld.moves(board).find((h) => h === mouseHole) &&
			mouseHole !== currHeld.hole &&
			mouseHole.marble.color === empty().color
		) {
			const path = calculateMovePath(board, currHeld.hole, mouseHole);
			humanMoveAnimation = createMoveAnimation(
				currHeld.marble.color,
				path,
				ANIMATION_SPEED.HUMAN_DURATION * path.length,
			);

			const newBoard = placeMarble(
				placeMarble(board, mouseHole, currHeld.marble),
				currHeld.hole,
				empty(),
			);

			pendingMove = {
				from: currHeld.hole,
				to: mouseHole,
				marble: currHeld.marble,
				newBoard: newBoard,
			};

			BUTTONCLICKSOUND.play();
		} else {
			console.log("Move not valid");
		}

		currHeld = held();
	}
}

function updateGameOver() {
	updateParticles();

	confettiTimer -= 1 / 60;
	if (confettiTimer <= 0) {
		confettiTimer = 0.15;
		const colors = [
			winnerPlayer.color,
			tint(winnerPlayer.color, 0.4),
			GOLD,
			SANDLIGHTBROWN,
		];
		for (let i = 0; i < 3; i++) {
			spawnParticles(
				vec2(rand(-11, 11), rand(9, 13)),
				colors[Math.floor(rand(0, colors.length))],
				1,
				vec2(rand(-1, 1), rand(-4, -7)),
			);
		}
	}

	if (mouseWasPressed(0)) {
		const inRect = (pos, size) =>
			abs(mousePos.x - pos.x) < size.x / 2 &&
			abs(mousePos.y - pos.y) < size.y / 2;
		if (inRect(vec2(0, -3.4), vec2(8.6, 2.3))) {
			BUTTONCLICKSOUND.play();
			resetGame();
			gamePhase = "playing";
		} else if (inRect(vec2(0, -6.8), vec2(6.8, 2))) {
			BUTTONCLICKSOUND.play();
			gamePhase = "menu";
		}
	}
}

// render game visuals
function gameRender() {
	if (gamePhase === "menu") {
		renderMenu();
		return;
	}

	renderBackground();
	drawStarPlate();

	// Board rendering
	for (const h of board) {
		drawHole(h.pos);
		if (GOALGUIDE && currPlayer.goalHoles.includes(h)) {
			drawCircle(
				h.pos,
				HOLESIZE + 0.2,
				withAlpha(currPlayer.color, 0.12),
				0.14,
				withAlpha(currPlayer.color, 0.8),
			);
		}
		const m = h.marble;
		if (m && m.color !== HOLECOLOR) drawMarble(h.pos, MARBLESIZE, m.color);
	}

	const isHumanTurn = !currPlayer.cpu;

	// hover + selection highlights for human player
	if (isHumanTurn) {
		const hoverHole = nearestHole(board, mousePos);
		if (!currHeld.hole || hoverHole !== currHeld.hole) {
			drawCircle(
				hoverHole.pos,
				HOLESIZE + 0.16,
				withAlpha(WHITE, 0.08),
				0.1,
				withAlpha(WHITE, 0.35),
			);
		}
		if (MOVEGUIDES && currHeld.hole) {
			for (const target of currHeld.moves(board)) {
				const pulse = HOLESIZE + 0.15 + 0.07 * Math.sin(time * 6);
				drawCircle(
					target.pos,
					pulse,
					withAlpha(currPlayer.color, 0.15),
					0.12,
					currPlayer.color,
				);
			}
		}
		if (currHeld.hole) {
			setAdditiveBlendMode(true);
			drawCircle(
				currHeld.hole.pos,
				HOLESIZE + 0.4 + Math.sin(time * 5) * 0.12,
				withAlpha(currPlayer.color, 0.3),
			);
			setAdditiveBlendMode(false);
		}
	}

	// player position labels
	for (const player of PLAYERS) {
		if (!player.labelPos) continue;
		const isActive = player === currPlayer && gamePhase === "playing";
		const size = isActive ? 0.85 + 0.05 * Math.sin(time * 4) : 0.55;
		const color = isActive
			? tint(player.color, 0.3)
			: withAlpha(tint(player.color, 0.15), 0.8);
		drawText(
			player.displayName,
			player.labelPos.add(vec2(0.05, -0.05)),
			size,
			new Color(0, 0, 0, 0.6),
		);
		drawText(player.displayName, player.labelPos, size, color);
	}

	// marble being carried by the mouse
	if (currHeld.marble.color !== HOLECOLOR) {
		drawCircle(
			vec2(mousePos.x + 0.22, mousePos.y - 0.28),
			MARBLESIZE * 0.95,
			new Color(0, 0, 0, 0.35),
		);
		drawMarble(mousePos, MARBLESIZE * 1.05, currHeld.marble.color);
	}

	// Pending move and animations
	if (pendingMove) drawHole(pendingMove.from.pos);
	for (const anim of [cpuMoveAnimation, humanMoveAnimation]) {
		if (!anim) continue;
		const animPos = getAnimationPosition(anim);
		setAdditiveBlendMode(true);
		drawCircle(animPos, MARBLESIZE * 1.5, withAlpha(anim.color, 0.2));
		setAdditiveBlendMode(false);
		drawMarble(animPos, MARBLESIZE * 1.05, anim.color);
	}

	// particles
	for (const p of particles) {
		const alpha = Math.max(0, p.life / p.maxLife);
		drawCircle(
			p.pos,
			p.size * (0.4 + 0.6 * alpha),
			withAlpha(p.color, alpha * 0.6),
		);
	}

	// turn indicator pill
	if (gamePhase === "playing") {
		const pillY = -10;
		const msg = currPlayer.cpu
			? `${currPlayer.displayName} is thinking${".".repeat(
					1 + (Math.floor(time * 2) % 3),
				)}`
			: "Your turn";
		const textW = 0.42 * msg.length * 0.72 + 4.2;
		drawCapsule(
			vec2(0, pillY),
			vec2(textW, 1.5),
			new Color(0, 0, 0, 0.55),
			withAlpha(PLATEEDGE, 0.9),
		);
		drawMarble(vec2(-textW / 2 + 1.1, pillY), 0.52, currPlayer.color);
		drawText(msg, vec2(0.45, pillY), 0.72, tint(currPlayer.color, 0.35));
	}

	if (gamePhase === "gameover") renderGameOver();
}

function renderGameOver() {
	drawRect(vec2(), vec2(40), new Color(0.02, 0.03, 0.08, 0.65));

	drawText("WINNER", vec2(0.14, 6.66), 2.8, new Color(0, 0, 0, 0.7));
	drawText("WINNER", vec2(0, 6.8), 2.8, GOLD);
	drawText(
		`${winnerPlayer.displayName} fills the far star`,
		vec2(0, 4.7),
		0.9,
		tint(winnerPlayer.color, 0.3),
	);

	// big glossy champion marble
	setAdditiveBlendMode(true);
	drawCircle(vec2(0, 2.3), 3.4, withAlpha(winnerPlayer.color, 0.25));
	setAdditiveBlendMode(false);
	drawMarble(vec2(0, 2.3), 2, winnerPlayer.color);

	const playHover = abs(mousePos.x) < 4.3 && abs(mousePos.y + 3.4) < 1.15;
	const menuHover = abs(mousePos.x) < 3.4 && abs(mousePos.y + 6.8) < 1;

	drawCapsule(vec2(0, -3.4), vec2(8.84, 2.54), shade(GOLDDEEP, 0.25));
	drawRectGradient(
		vec2(0, -3.4),
		vec2(8.6, 2.3),
		tint(GOLD, playHover ? 0.5 : 0.3),
		GOLD,
	);
	drawText("PLAY AGAIN", vec2(0, -3.4), 0.85, shade(GOLDDEEP, 0.45));

	drawCapsule(
		vec2(0, -6.8),
		vec2(7.04, 2.24),
		playHover || menuHover ? PLATEEDGE : PLATECOLOR,
		PLATEEDGE,
	);
	drawText("MENU", vec2(0, -6.8), 0.8, SANDLIGHTBROWN);
}
// post-render hook
function postGameRender() {}
