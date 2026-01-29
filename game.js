const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3,
	0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);

const HOLECOLOR = new Color(0.97, 0.6, 0.22);
const HOLESIZE = 1.35;
const BOARDSIZE = 1.45;
const MARBLESIZE = HOLESIZE - 0.5;

const CPU_MOVE_DELAY = 1;
const MOVEGUIDES = true;
const GOALGUIDE = true;

// animation speed controls (constant duration regardless of path length)
const ANIMATION_SPEED = {
	CPU_DURATION: 25, // constant frames for cpu animation
	HUMAN_DURATION: 18, // constant frames for human animation
};

const PLAYERS = [
	{
		position: "top",
		turnOrder: 4,
		color: new Color().setHex("#0080ff"),
		cpu: true,
		goalHoles: [],
	},
	{
		position: "topRight",
		turnOrder: 6,
		color: new Color().setHex("#ffff00"),
		cpu: true,
		goalHoles: [],
	},
	{
		position: "bottomLeft",
		turnOrder: 2,
		color: new Color().setHex("#ff00ff"),
		cpu: true,
		goalHoles: [],
	},
	{
		position: "bottom",
		turnOrder: 1,
		color: new Color().setHex("#ff0080"),
		cpu: false,
		goalHoles: [],
	},
	{
		position: "topLeft",
		turnOrder: 3,
		color: new Color().setHex("#00ff88"),
		cpu: true,
		goalHoles: [],
	},
	{
		position: "bottomRight",
		turnOrder: 5,
		color: new Color().setHex("#8000ff"),
		cpu: true,
		goalHoles: [],
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

nextPlayer = (player) => {
	const nextTurnOrder =
		player.turnOrder === PLAYERS.length ? 1 : player.turnOrder + 1;
	return PLAYERS.find((p) => p.turnOrder === nextTurnOrder);
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

// get current position during animation using simple linear interpolation
getAnimationPosition = (animation) => {
	const totalSegments = animation.path.length - 1;
	const totalProgress = Math.min(animation.progress, 1);

	// calculate which segment we're in and progress within that segment
	const segmentWithPause = totalProgress * totalSegments;
	const currentSegment = Math.floor(segmentWithPause);
	const segmentProgress = segmentWithPause - currentSegment;

	// if we're at or beyond the last segment, return final position
	if (currentSegment >= totalSegments) {
		return animation.path[animation.path.length - 1].pos;
	}

	// simple linear interpolation between current and next hole
	const from = animation.path[currentSegment].pos;
	const to = animation.path[currentSegment + 1].pos;
	return from.lerp(to, segmentProgress);
};

cpuPlay = (board, player) => {
	const moveResult = cpuMove(board, player);
	if (!moveResult) return;

	const path = calculateMovePath(board, moveResult.from, moveResult.to);
	const duration = ANIMATION_SPEED.CPU_DURATION;
	cpuMoveAnimation = createMoveAnimation(player.color, path, duration);

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
		if (r > 4) return { ...hole, marble: marble("top") };
		if (q > 4) return { ...hole, marble: marble("topRight") };
		if (s > 4) return { ...hole, marble: marble("bottomLeft") };
		if (r < -4) return { ...hole, marble: marble("bottom") };
		if (q < -4) return { ...hole, marble: marble("topLeft") };
		if (s < -4) return { ...hole, marble: marble("bottomRight") };
		return hole;
	});

	// assign goal holes (opposite side from starting position)
	boardWithMarbles.forEach((hole) => {
		const { q, r, s } = hole.coords;
		if (r < -4) PLAYERS.find((p) => p.position === "top")?.goalHoles.push(hole);
		if (q < -4)
			PLAYERS.find((p) => p.position === "topRight")?.goalHoles.push(hole);
		if (s < -4)
			PLAYERS.find((p) => p.position === "bottomLeft")?.goalHoles.push(hole);
		if (r > 4)
			PLAYERS.find((p) => p.position === "bottom")?.goalHoles.push(hole);
		if (q > 4)
			PLAYERS.find((p) => p.position === "topLeft")?.goalHoles.push(hole);
		if (s > 4)
			PLAYERS.find((p) => p.position === "bottomRight")?.goalHoles.push(hole);
	});

	return boardWithMarbles;
}

// initialize game state
function gameInit() {
	setCanvasFixedSize(vec2(720, 720));

	board = boardInit(8);
	currPlayer = PLAYERS.find((p) => p.turnOrder === 1);
	currHeld = held();
	cpuMoveTimer = 0;
	cpuMoveAnimation = null;
	humanMoveAnimation = null;
	pendingMove = null;
}

// update game logic each frame
function gameUpdate() {
	const animationComplete = (animation) => {
		if (animation && updateAnimation(animation)) {
			if (pendingMove) {
				board = pendingMove.newBoard;
				currPlayer = nextPlayer(currPlayer);
				pendingMove = null;
			}
			return true;
		}
		return false;
	};

	if (cpuMoveAnimation && animationComplete(cpuMoveAnimation)) {
		cpuMoveAnimation = null;
		return;
	}

	if (humanMoveAnimation && animationComplete(humanMoveAnimation)) {
		humanMoveAnimation = null;
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

		const isValidMove =
			currHeld.moves(board).find((h) => h === mouseHole) &&
			mouseHole !== currHeld.hole &&
			mouseHole.marble.color === empty().color;

		if (isValidMove) {
			const path = calculateMovePath(board, currHeld.hole, mouseHole);
			const duration = ANIMATION_SPEED.HUMAN_DURATION;
			humanMoveAnimation = createMoveAnimation(
				currHeld.marble.color,
				path,
				duration,
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
	drawRect(vec2(), vec2(32), SANDLIGHTBROWN);
	drawCircle(vec2(), BOARDSIZE * 15.5, currPlayer.color);
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
}
// post-render hook
function postGameRender() {}
