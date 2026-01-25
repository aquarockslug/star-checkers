const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3,
	0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);

const HOLECOLOR = new Color(0.97, 0.6, 0.22);
const HOLESIZE = 1;
const BOARDSIZE = 1.5;

const PLAYERS = [
	{ id: "p1", turnOrder: 1, color: BLUE },
	{ id: "p2", turnOrder: 3, color: RED },
	{ id: "p3", turnOrder: 5, color: GREEN },
	{ id: "p4", turnOrder: 4, color: MAGENTA },
	{ id: "p5", turnOrder: 6, color: YELLOW },
	{ id: "p6", turnOrder: 2, color: CYAN },
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

// search through board for holes that are neighbors with the given hole
neighbors = (board, hole) => {
	const { q, r } = hole.coords;
	const neighborCoords = [
		{ q: q + 1, r: r }, // right
		{ q: q, r: r + 1 }, // up right
		{ q: q - 1, r: r + 1 }, // up left
		{ q: q - 1, r: r }, // left
		{ q: q, r: r - 1 }, // down left
		{ q: q + 1, r: r - 1 }, // down right
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
	setCanvasFixedSize(vec2(1280, 720));

	board = boardInit(8);
	currentPlayer = PLAYERS[0];
	held = { hole: null, marble: empty() };
}

function gameUpdate() {
	if (mouseWasPressed(0)) {
		let mouseHole = nearestHole(board, mousePos);
		if (mouseHole.marble.player === currentPlayer.id)
			held = { hole: mouseHole, marble: mouseHole.marble };
	}
	if (mouseWasReleased(0)) {
		if (!held.hole) return;
		let mouseHole = nearestHole(board, mousePos);
		if (mouseHole !== held.hole && mouseHole.marble.color === empty().color) {
			board = placeMarble(
				placeMarble(board, mouseHole, held.marble),
				held.hole,
				empty(),
			);
		}
		held = { hole: null, marble: empty() };
		currentPlayer = nextPlayer(currentPlayer);
	}
}

function gameRender() {
	drawRect(vec2(), vec2(32), SANDLIGHTBROWN);
	drawCircle(vec2(), BOARDSIZE * 15, SANDRED);

	drawCircle(nearestHole(board, mousePos).pos, HOLESIZE + 0.25, BLACK);

	drawCircle(vec2(-12, 10), HOLESIZE * 2, currentPlayer.color);
	drawText("Current Player: ", vec2(-12, 10), 1, BLACK, 0, BLACK);

	for (const hole of board) {
		drawCircle(hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(hole.pos, HOLESIZE - 0.25, hole.marble?.color);
	}

	if (held.hole) {
		drawCircle(held.hole.pos, HOLESIZE + 0.25, BLACK);
		drawCircle(held.hole.pos, HOLESIZE, HOLECOLOR);
	}
	if (held.marble.color !== empty().color)
		drawCircle(mousePos, HOLESIZE + 0.25, held.marble.color);
}
function postGameRender() {}
