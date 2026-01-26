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

const PLAYERS = [
	{
		id: "p1",
		turnOrder: 4,
		color: new Color().setHex("#0080ff"),
		cpu: true,
		goalHoles: [],
	},
	{
		id: "p2",
		turnOrder: 6,
		color: new Color().setHex("#ffff00"),
		cpu: true,
		goalHoles: [],
	},
	{
		id: "p3",
		turnOrder: 2,
		color: new Color().setHex("#ff00ff"),
		cpu: true,
		goalHoles: [],
	},
	{
		id: "bottom",
		turnOrder: 1,
		color: new Color().setHex("#ff0080"),
		cpu: false,
		goalHoles: [],
	},
	{
		id: "p5",
		turnOrder: 3,
		color: new Color().setHex("#00ff88"),
		cpu: true,
		goalHoles: [],
	},
	{
		id: "p6",
		turnOrder: 5,
		color: new Color().setHex("#8000ff"),
		cpu: true,
		goalHoles: [],
	},
];

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
	color: PLAYERS.find((p) => p.id === player)?.color || HOLECOLOR,
});
empty = () => ({ color: HOLECOLOR });
held = (hole = null, marble = empty()) => ({
	hole,
	marble,
	moves: (board) => validMoves(board, hole, marble),
});

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

validMoves = (board, hole, marble) =>
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
	const playerMarbles = board.filter((h) => h.marble.player === player.id);
	const validMovesList = [];

	for (const marbleHole of playerMarbles) {
		const moves = validMoves(board, marbleHole, marbleHole.marble);
		for (const targetHole of moves) {
			validMovesList.push({ from: marbleHole, to: targetHole });
		}
	}

	if (validMovesList.length === 0) return null;

	const randomMove =
		validMovesList[Math.floor(Math.random() * validMovesList.length)];
	return {
		newBoard: placeMarble(
			placeMarble(board, randomMove.to, randomMove.from.marble),
			randomMove.from,
			empty(),
		),
		from: randomMove.from,
		to: randomMove.to,
	};
};

let cpuMoveTimer = 0;
let cpuMoveAnimation = null;

cpuPlay = (board, player) => {
	const moveResult = cpuMove(board, player);
	if (!moveResult) return;
	cpuMoveAnimation = {
		color: player.color,
		from: moveResult.from,
		to: moveResult.to,
		progress: 0,
	};
	BUTTONCLICKSOUND.play();
	return moveResult.newBoard;
};

/////////////////////////////////////////////////////////////////////////////////

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

	// Clear existing goal holes
	PLAYERS.forEach((player) => {
		player.goalHoles = [];
	});

	const boardWithMarbles = filteredBoard.map((hole) => {
		const { q, r, s } = hole.coords;
		if (r > 4) return { ...hole, marble: marble("p1") };
		if (q > 4) return { ...hole, marble: marble("p2") };
		if (s > 4) return { ...hole, marble: marble("p3") };
		if (r < -4) return { ...hole, marble: marble("bottom") };
		if (q < -4) return { ...hole, marble: marble("p5") };
		if (s < -4) return { ...hole, marble: marble("p6") };
		return hole;
	});

	// Assign goal holes (opposite side from starting position)
	boardWithMarbles.forEach((hole) => {
		const { q, r, s } = hole.coords;

		// p1 starts at r > 4, goal is r < -4 (bottom player's start)
		if (r < -4) {
			PLAYERS.find((p) => p.id === "p1")?.goalHoles.push(hole);
		}
		// p2 starts at q > 4, goal is q < -4 (p5's start)
		if (q < -4) {
			PLAYERS.find((p) => p.id === "p2")?.goalHoles.push(hole);
		}
		// p3 starts at s > 4, goal is s < -4 (p6's start)
		if (s < -4) {
			PLAYERS.find((p) => p.id === "p3")?.goalHoles.push(hole);
		}
		// bottom starts at r < -4, goal is r > 4 (p1's start)
		if (r > 4) {
			PLAYERS.find((p) => p.id === "bottom")?.goalHoles.push(hole);
		}
		// p5 starts at q < -4, goal is q > 4 (p2's start)
		if (q > 4) {
			PLAYERS.find((p) => p.id === "p5")?.goalHoles.push(hole);
		}
		// p6 starts at s < -4, goal is s > 4 (p3's start)
		if (s > 4) {
			PLAYERS.find((p) => p.id === "p6")?.goalHoles.push(hole);
		}
	});

	return boardWithMarbles;
}

function gameInit() {
	setCanvasFixedSize(vec2(720, 720));

	board = boardInit(8);
	currPlayer = PLAYERS.find((p) => p.turnOrder === 1);
	currHeld = held();
	cpuMoveTimer = 0;
	cpuMoveAnimation = null;
}

function gameUpdate() {
	if (cpuMoveAnimation) {
		cpuMoveAnimation.progress += 0.1;
		if (cpuMoveAnimation.progress >= 1) {
			cpuMoveAnimation = null;
		}
		return;
	}

	const isCurrentPlayerCPU = currPlayer.cpu;

	if (isCurrentPlayerCPU) {
		if (cpuMoveTimer === 0) {
			cpuMoveTimer = time + CPU_MOVE_DELAY;
		} else if (time >= cpuMoveTimer) {
			board = cpuPlay(board, currPlayer);
			currPlayer = nextPlayer(currPlayer);
			cpuMoveTimer = 0;
		}
		return;
	}

	cpuMoveTimer = 0;

	if (mouseWasPressed(0)) {
		let mouseHole = nearestHole(board, mousePos);
		if (mouseHole.marble.player === currPlayer.id)
			currHeld = held(mouseHole, mouseHole.marble);
	}
	if (mouseWasReleased(0)) {
		if (!currHeld.hole) return;
		let mouseHole = nearestHole(board, mousePos);

		if (!currHeld.moves(board).find((h) => h === mouseHole)) {
			// alert("Move not valid");
			console.log("Move not valid");
		} else if (
			mouseHole !== held.hole &&
			mouseHole.marble.color === empty().color
		) {
			board = placeMarble(
				placeMarble(board, mouseHole, currHeld.marble),
				currHeld.hole,
				empty(),
			);
			BUTTONCLICKSOUND.play();
			currPlayer = nextPlayer(currPlayer);
		}

		currHeld = held();
	}
}

function gameRender() {
	drawRect(vec2(), vec2(32), SANDLIGHTBROWN);
	drawCircle(vec2(), BOARDSIZE * 15.5, currPlayer.color);
	drawCircle(vec2(), BOARDSIZE * 15, SANDRED);

	// drawText(
	// 	`Current Player: ${currPlayer.id} ${currPlayer.cpu ? "(CPU)" : "(Human)"}`,
	// 	vec2(-6, 8),
	// 	0.8,
	// 	BLACK,
	// 	0,
	// 	BLACK,
	// );

	const isHumanPlayer = !currPlayer.cpu;
	if (isHumanPlayer) {
		drawCircle(nearestHole(board, mousePos).pos, HOLESIZE + 0.25, BLACK);
	}

	if (MOVEGUIDES && isHumanPlayer) {
		for (const hole of currHeld.moves(board)) {
			drawCircle(hole.pos, HOLESIZE + 0.25, currPlayer.color);
		}
	}

	for (const hole of board) {
		drawCircle(hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(hole.pos, MARBLESIZE, hole.marble?.color);
	}

	if (currHeld.hole && isHumanPlayer) {
		drawCircle(currHeld.hole.pos, HOLESIZE + 0.25, BLACK);
		drawCircle(currHeld.hole.pos, HOLESIZE, HOLECOLOR);
	}

	if (cpuMoveAnimation) {
		const animPos = cpuMoveAnimation.from.pos.lerp(
			cpuMoveAnimation.to.pos,
			Math.min(cpuMoveAnimation.progress, 1),
		);
		drawCircle(animPos, HOLESIZE + 0.25, cpuMoveAnimation.color);
	}

	if (currHeld.marble.color !== empty().color && isHumanPlayer)
		drawCircle(mousePos, HOLESIZE + 0.25, currHeld.marble.color);
}
function postGameRender() {}
