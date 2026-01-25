const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3,
	0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);

const HOLECOLOR = new Color(0.97, 0.6, 0.22);
const HOLESIZE = 1;
const BOARDSIZE = 1.5;

const MOVEGUIDES = true;

const PLAYERS = [
	{
		id: "p4",
		turnOrder: 4,
		color: new Color().setHex("#ff0080"),
	},
	{ id: "p5", turnOrder: 6, color: new Color().setHex("#00ff88") },
	{ id: "p6", turnOrder: 2, color: new Color().setHex("#8000ff") },
	{ id: "p1", turnOrder: 1, color: new Color().setHex("#0080ff") },
	{ id: "p2", turnOrder: 3, color: new Color().setHex("#ffff00") },
	{ id: "p3", turnOrder: 5, color: new Color().setHex("#ff00ff") },
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

cpuPlay = () => {
	board = cpuMove(board, currPlayer).newBoard;
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

	return board
		.filter((hole) => {
			const { q, r, s } = hole.coords;
			return (
				(q + r <= 4 && q + s <= 4 && r + s <= 4) ||
				(q + r >= -4 && q + s >= -4 && r + s >= -4)
			);
		})
		.map((hole) => {
			const { q, r, s } = hole.coords;
			if (r > 4) return { ...hole, marble: marble("p1") };
			if (q > 4) return { ...hole, marble: marble("p2") };
			if (s > 4) return { ...hole, marble: marble("p3") };
			if (r < -4) return { ...hole, marble: marble("p4") };
			if (q < -4) return { ...hole, marble: marble("p5") };
			if (s < -4) return { ...hole, marble: marble("p6") };
			return hole;
		});
}

function gameInit() {
	setCanvasFixedSize(vec2(720, 720));

	board = boardInit(8);
	currPlayer = PLAYERS[0];
	currHeld = held();
}

function gameUpdate() {
	if (mouseWasPressed(0)) {
		let mouseHole = nearestHole(board, mousePos);
		if (mouseHole.marble.player === currPlayer.id)
			currHeld = held(mouseHole, mouseHole.marble);
	}
	if (mouseWasReleased(0)) {
		if (!currHeld.hole) return;
		let mouseHole = nearestHole(board, mousePos);

		if (!currHeld.moves(board).find((h) => h === mouseHole)) {
			alert("Move not valid");
		} else if (
			mouseHole !== held.hole &&
			mouseHole.marble.color === empty().color
		) {
			board = placeMarble(
				placeMarble(board, mouseHole, currHeld.marble),
				currHeld.hole,
				empty(),
			);
			currPlayer = nextPlayer(currPlayer);
		}

		currHeld = held();
	}
}

function gameRender() {
	drawRect(vec2(), vec2(32), SANDLIGHTBROWN);
	drawCircle(vec2(), BOARDSIZE * 15.5, currPlayer.color);
	drawCircle(vec2(), BOARDSIZE * 15, SANDRED);

	drawCircle(nearestHole(board, mousePos).pos, HOLESIZE + 0.25, BLACK);

	// drawText("Current Player: ", vec2(-6, 8), 1, BLACK, 0, BLACK);

	if (MOVEGUIDES) {
		for (const hole of currHeld.moves(board)) {
			drawCircle(hole.pos, HOLESIZE + 0.25, currPlayer.color);
		}
	}

	for (const hole of board) {
		drawCircle(hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(hole.pos, HOLESIZE - 0.25, hole.marble?.color);
	}

	if (currHeld.hole) {
		drawCircle(currHeld.hole.pos, HOLESIZE + 0.25, BLACK);
		drawCircle(currHeld.hole.pos, HOLESIZE, HOLECOLOR);
	}
	if (currHeld.marble.color !== empty().color)
		drawCircle(mousePos, HOLESIZE + 0.25, currHeld.marble.color);
}
function postGameRender() {}
