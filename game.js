const BUTTONCLICKSOUND = new Sound([
	0.08, 0, 250, 0.01, 0.01, 0.02, 1, 0.8, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0.04, 0.05, 350,
]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);
const SANDORANGE = new Color(0.97, 0.6, 0.22);

const HOLESIZE = 1;
const BOARDSIZE = 2;

hole = (q, r, marble) => {
	const x = (q + r * 0.5) * BOARDSIZE;
	const y = ((r * Math.sqrt(3)) / 2) * BOARDSIZE;
	return {
		coords: { q, r, s: -q - r },
		pos: vec2(x, y),
		marble,
	};
};
marble = (color) => ({ color });
empty = () => ({ color: BLACK });

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

function initBoard(radius, marble = empty()) {
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
	board = initBoard(4);
}

function gameUpdate() {}

function gameRender() {
	drawRect(vec2(0, 0), vec2(32), SANDLIGHTBROWN);

	for (const hole of board) {
		const marble = hole.marble;

		drawCircle(hole.pos, HOLESIZE, BLACK);
		drawCircle(hole.pos, HOLESIZE - 0.25, marble?.color);
	}

	// for (let n of neighbors(board, board[50])) {
	// 	drawCircle(q.add(r), HOLESIZE + 0.25, marble?.color);
	// }
}
function postGameRender() {}
