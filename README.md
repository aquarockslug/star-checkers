# mancalaJS

A tiny implementation of Mancala in JavaScript with a functional approach.

## Architecture
The game uses a functional pipeline where board state is reconstructed by applying a sequence of pure move functions:

```javascript
getBoardState() -> boardMoves.reduce(calcBoard, [])
```

The game uses the minimalistic LittleJS engine for rendering and input handling.

## Philosophy
The game is built with functional programming principles and minimalism:
- **Immutable game state**: Each move creates a new state
- **No Classes**: Simple objects and factory functions only
- **Undo System**: Trivial to implement when using a functional state
- **Zero Dependencies**: No build tools or frameworks required (except LittleJ)
- **Pure Functions**: Game logic is composed of pure, testable functions

This game demonstrates how complex game logic emerges from simple functional ideas.
