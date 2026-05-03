<h1 align="center">Planning Poker</h1>

<p align="center">
  Real-time Planning Poker for agile teams — React 19, .NET 9, SignalR, Docker
</p>

<p align="center">
  <img src="https://github.com/AdrianoReusSavi/planningpoker/actions/workflows/ci.yml/badge.svg" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt=".NET" src="https://img.shields.io/badge/.NET-9.0-purple" />
  <img alt="React" src="https://img.shields.io/badge/React-19-blue" />
</p>

---

## Overview

<!-- TODO: Replace with actual screenshots -->

| Home | Room | Dark Mode | Mini View |
|------|------|-----------|-----------|
| ![Home](docs/home.png) | ![Room](docs/room.png) | ![Dark](docs/dark.png) | ![Mini](docs/mini.png) |

## About

Planning Poker is a real-time estimation tool for agile teams. Create a room, invite your team via link, vote on story points, and reveal the results together. Built with SignalR WebSockets for instant synchronization.

## Built with

- [React 19](https://react.dev/) with TypeScript and Vite
- [.NET 9](https://dotnet.microsoft.com/) with SignalR
- [react-colorful](https://github.com/omgovich/react-colorful) for the color picker
- [xUnit](https://xunit.net/) for unit testing
- [Docker](https://www.docker.com/) for containerization

## Features

- Real-time voting with SignalR WebSocket
- 6 estimation decks (Fibonacci, T-Shirt, Sequential, Linear, Powers of Two, Half-Point)
- Circular "table" layout (up to 10 players) with auto-rebalancing as players join/leave; cards and ellipse scale with viewport so no scroll on zoom in
- Vote summary as a centered medallion on the table when revealed (approximate + exact mean)
- Round history with per-round statistics
- Throwables: tap another player's card to throw a turtle 🐢, tomato 🍅, heart ❤️, "didn't get it" 🤔 or rocket 🚀 — parabolic flight, themed impact ring and emoji-particle burst (heart particles trace a heart curve)
- Anonymous emoji reactions that float upward from the sender's own card
- Anonymous coffee break counter with clear-all for the room owner
- Kick player and transfer ownership
- Customizable card style per player (color, gradient, pattern) persisted in localStorage
- Celebration animation when all votes match
- Mini-view popup with deck, controls, reactions and break button — synced via BroadcastChannel
- Dark/Light mode
- i18n: Portuguese, English, Spanish
- Automatic reconnection with 20s grace period
- Thread-safe room state with ReaderWriterLockSlim
- Per-action cooldown (200ms) on the hub against rapid-fire spam

## Architecture

```
┌──────────────┐       WebSocket (SignalR)        ┌──────────────────┐
│              │  <────────────────────────────>  │                  │
│   Frontend   │         STATE_SYNC               │     Backend      │
│  React 19    │         KICKED                   │    .NET 9        │
│  TypeScript  │                                  │    SignalR Hub   │
│  Vite        │                                  │    Clean Arch    │
│              │                                  │                  │
└──────────────┘                                  └──────────────────┘
```

**Backend (Clean Architecture):**

```
PlanningPoker.Api            -> SignalR Hub, Program.cs
PlanningPoker.Application    -> Services, Interfaces, Results
PlanningPoker.Domain         -> Entities, Enums, Snapshots, ValueObjects
PlanningPoker.Infrastructure -> InMemoryRoomRepository
PlanningPoker.Tests          -> xUnit (79 tests)
```

**Frontend:**

```
src/
├── components/   -> UI (Room, PlayerGrid, VotingDeck, ThrowOverlay, ReactionOverlay, etc.)
├── contexts/     -> Connection, Room, Theme, I18n, Toast
├── hooks/        -> useRoomActions, useLocalStorage, useBroadcastChannel
├── pages/        -> Home, MiniView
├── constants/    -> estimationOptions, reactions, throwables
├── i18n/         -> Locales (pt-BR, en, es)
└── services/     -> SignalR connection
```

**State Machine:**

```
WAITING ──> VOTING ──> REVEALED
               ^           |
               └───────────┘
              (reset)
```

## Installing and Running

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 22+](https://nodejs.org/)

### Local

1. Clone this repository `git clone https://github.com/AdrianoReusSavi/planningpoker.git`
2. Enter the project folder: `cd planningpoker`

**Backend:**

```bash
cd backend
dotnet run --project PlanningPoker.Api
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

3. Open http://localhost:5173

### Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Tests

```bash
cd backend
dotnet test
```

## Contribute

1. Fork this repository
2. Create a branch with your feature: `git checkout -b my-feature`
3. Commit your changes: `git commit -m 'feat: My new feature'`
4. Push your branch: `git push origin my-feature`

## License

This project is under the MIT license. Take a look at the [LICENSE](LICENSE) file for more details.