const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3,
	0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);

const HOLECOLOR = new Color(0.97, 0.6, 0.22);
const HOLESIZE = 1.35;
const BOARDSIZE = 1.49;
const BOARDBORDERSIZE = 0.25;
const MARBLESIZE = HOLESIZE - 0.25;

let CPU_MOVE_DELAY = 1;
let MOVEGUIDES = false;
let GOALGUIDE = false;

// animation speed controls (constant duration regardless of path length)
const ANIMATION_SPEED = {
	CPU_DURATION: 7,
	HUMAN_DURATION: 14,
};

let particles = [];
let gamePhase = "menu";
let selectedPlayer = null;
let cpuCount = 3;

easeOutCubic = (t) => 1 - (1 - t) ** 3;

spawnParticles = (pos, color, count = 3) => {
	for (let i = 0; i < count; i++) {
		const life = rand(0.4, 0.8);
		particles.push({
			pos: vec2(pos.x + rand(-0.2, 0.2), pos.y + rand(-0.2, 0.2)),
			color: new Color(color.r, color.g, color.b),
			life,
			maxLife: life,
			size: rand(0.3, 0.6) * MARBLESIZE,
		});
	}
};

updateParticles = () => {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= 1 / 60;
		p.pos.x += rand(-0.02, 0.02);
		p.pos.y += rand(-0.02, 0.02);
		if (p.life <= 0) particles.splice(i, 1);
	}
};

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
		displayName: "You",
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
		paused = true;
		alert("WINNER: " + winner.position);
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
			if (mousePos.distance(item.pos) < 3) {
				selectedPlayer = item.player;
				BUTTONCLICKSOUND.play();
				return;
			}
		}
		if (mousePos.distance(vec2(-5, -3)) < 2) {
			cpuCount = Math.max(1, cpuCount - 1);
			BUTTONCLICKSOUND.play();
			return;
		}
		if (mousePos.distance(vec2(5, -3)) < 2) {
			cpuCount = Math.min(5, cpuCount + 1);
			BUTTONCLICKSOUND.play();
			return;
		}
		if (mousePos.distance(vec2(0, -8)) < 5) {
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
	drawRect(vec2(), vec2(32), new Color(0, 0, 0, 0.85));
	drawText(
		"STAR CHECKERS",
		vec2(0, 15),
		3.5,
		new Color(1, 0.9, 0.3),
		0.1,
		BLACK,
	);
	drawText("Pick your color", vec2(0, 12), 1.1, SANDLIGHTBROWN, 0.04, BLACK);

	const items = getMenuPlayerPositions();
	for (const item of items) {
		const isSelected = selectedPlayer === item.player;
		if (isSelected) {
			drawCircle(item.pos, 3.5, new Color(1, 1, 1, 0.4));
		}
		drawCircle(item.pos, 2.8, item.player.color);
	}

	// CPU count control
	const cpuLabelY = -3;
	drawText(
		"CPU Opponents: ",
		vec2(0, cpuLabelY + 2),
		0.9,
		SANDLIGHTBROWN,
		0,
		undefined,
	);
	drawText("\u2014", vec2(-5, cpuLabelY), 1.5, SANDLIGHTBROWN, 0.04, BLACK);
	drawText(
		`${cpuCount}`,
		vec2(0, cpuLabelY),
		1.5,
		new Color(1, 0.9, 0.3),
		0.06,
		BLACK,
	);
	drawText("+", vec2(5, cpuLabelY), 1.5, SANDLIGHTBROWN, 0.04, BLACK);

	// Start button
	const btnPos = vec2(0, -8);
	drawRect(btnPos, vec2(18, 5), SANDRED);
	drawText("Start Game", btnPos, 1, SANDLIGHTBROWN, 0.04, BLACK);
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
}

// initialize game state
function gameInit() {
	setCanvasFixedSize(vec2(720, 720));
	fontDefault = "Iceberg, sans-serif";
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

// render game visuals
function gameRender() {
	if (gamePhase === "menu") {
		renderMenu();
		return;
	}

	drawRect(vec2(), vec2(32), SANDLIGHTBROWN);
	drawCircle(vec2(), BOARDSIZE * 15 + BOARDBORDERSIZE, currPlayer.color);
	drawCircle(vec2(), BOARDSIZE * 15, SANDRED);

	const isHumanPlayer = !currPlayer.cpu;

	// use hole highlighting for players
	if (!currPlayer.cpu) {
		drawCircle(nearestHole(board, mousePos).pos, HOLESIZE + 0.25, BLACK);
		if (MOVEGUIDES) {
			for (const hole of currHeld.moves(board)) {
				drawCircle(hole.pos, HOLESIZE + 0.25, currPlayer.color);
			}
		}
		if (currHeld.hole) {
			drawCircle(currHeld.hole.pos, HOLESIZE + 0.25, BLACK);
			drawCircle(currHeld.hole.pos, HOLESIZE, HOLECOLOR);
		}
	}

	// Board rendering
	for (const hole of board) {
		if (GOALGUIDE && currPlayer.goalHoles.includes(hole)) {
			drawCircle(hole.pos, HOLESIZE + 0.15, currPlayer.color);
		}
		drawCircle(hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(hole.pos, MARBLESIZE, hole.marble?.color);
	}

	// player position labels
	for (const player of PLAYERS) {
		if (player.labelPos) {
			const isActive = player === currPlayer;
			drawText(
				player.displayName,
				player.labelPos,
				isActive ? 0.8 : 0.5,
				player.color,
				isActive ? 0.08 : 0,
				isActive ? BLACK : undefined,
			);
		}
	}

	if (currHeld.marble.color !== empty().color) {
		drawCircle(currHeld.hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(mousePos, HOLESIZE + 0.25, currHeld.marble.color);
	}

	// Pending move and animations
	if (pendingMove) drawCircle(pendingMove.from.pos, HOLESIZE, HOLECOLOR);
	if (cpuMoveAnimation) {
		const animPos = getAnimationPosition(cpuMoveAnimation);
		drawCircle(animPos, HOLESIZE + 0.25, cpuMoveAnimation.color);
	}
	if (humanMoveAnimation) {
		const animPos = getAnimationPosition(humanMoveAnimation);
		drawCircle(animPos, HOLESIZE + 0.25, humanMoveAnimation.color);
	}

	// particles
	for (const p of particles) {
		const alpha = Math.max(0, p.life / p.maxLife);
		drawCircle(
			p.pos,
			p.size * (0.4 + 0.6 * alpha),
			rgb(p.color.r, p.color.g, p.color.b, alpha * 0.5),
		);
	}

	// turn indicator
	const turnPrefix = currPlayer.cpu
		? `${currPlayer.displayName} thinking`
		: `Your turn`;
	drawTextScreen(turnPrefix, vec2(0, 305), 1.6, currPlayer.color, 0.3, BLACK);
}
// post-render hook
function postGameRender() {}
