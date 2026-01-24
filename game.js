const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);

const HOLECOLOR = new Color(0.97, 0.6, 0.22);
const HOLESIZE = 1;
const BOARDSIZE = 1.5;

hole = (q, r, marble) => {
	const x = (q + r * 0.5) * BOARDSIZE;
	const y = ((r * Math.sqrt(3)) / 2) * BOARDSIZE;
	return {
		coords: { q, r, s: -q - r },
		pos: vec2(x, y),
		marble,
	};
};
marble = (player) => ({ player, color: player === "p1" ? BLUE : RED });
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

	return board.filter((h) => neighborCoords.some((coord) => h.coords.q === coord.q && h.coords.r === coord.r));
};

nearestHole = (board, pos) =>
	board.reduce((nearest, hole) => {
		const nearestDist = nearest.pos.distance(pos);
		const holeDist = hole.pos.distance(pos);
		return holeDist < nearestDist ? hole : nearest;
	});

placeMarble = (board, hole, marble) =>
	board.map((h) => (h.coords.q === hole.coords.q && h.coords.r === hole.coords.r ? { ...h, marble } : h));

/////////////////////////////////////////////////////////////////////////////////
function boardInit(radius, marble = empty()) {
	const board = [];
	for (let q = -radius; q <= radius; q++) {
		const r1 = Math.max(-radius, -q - radius);
		const r2 = Math.min(radius, -q + radius);
		for (let r = r1; r <= r2; r++) {
			board.push(hole(q, r, marble));
		}
	}
	return board;
}

function gameInit() {
	setCanvasFixedSize(vec2(1280, 720));
	board = boardInit(4);

	board = placeMarble(board, board[randInt(0, board.length)], marble("p1"));
	board = placeMarble(board, board[randInt(0, board.length)], marble("p1"));
	board = placeMarble(board, board[randInt(0, board.length)], marble("p1"));
	board = placeMarble(board, board[randInt(0, board.length)], marble("p1"));

	currentPlayer = "p1";
	held = { hole: null, marble: empty() };
}

function gameUpdate() {
	if (mouseWasPressed(0)) {
		let mouseHole = nearestHole(board, mousePos);
		held = { hole: mouseHole, marble: mouseHole.marble };
	}
	if (mouseWasReleased(0)) {
		if (nearestHole(board, mousePos) != held.hole) {
			board = placeMarble(board, nearestHole(board, mousePos), held.marble);
			board = placeMarble(board, held.hole, empty());
		}
		held = { hole: null, marble: empty() };
	}
}

function gameRender() {
	drawRect(vec2(0, 0), vec2(32), SANDLIGHTBROWN);

	drawCircle(nearestHole(board, mousePos).pos, HOLESIZE + 0.25, BLACK);

	for (const hole of board) {
		const marble = hole.marble;

		drawCircle(hole.pos, HOLESIZE, HOLECOLOR);
		drawCircle(hole.pos, HOLESIZE - 0.25, marble?.color);
	}

	if (mouseIsDown(0)) {
		if (held.hole) drawCircle(held.hole.pos, HOLESIZE, HOLECOLOR);
		if (held.marble.color != empty().color) drawCircle(mousePos, HOLESIZE + 0.25, held.marble.color);
	}
}
function postGameRender() {}
