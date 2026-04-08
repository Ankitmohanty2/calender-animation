# Task Widget

A high-fidelity, interactive task management widget designed for professional workflows. This project focuses on high-performance animations and advanced visual feedback mechanisms.

## Core Features

- Dynamic Task Management: Interactive task list with smooth state transitions and accessible checkboxes.
- High-Fidelity Feedback: Custom interaction effects, including particle bursts and WebGL-powered glow ripples.
- Expanded Calendar View: Comprehensive date navigation with week-based views and fluid transitions between months.
- Guest Collaboration Interface: Detailed guests list expansion with role management and sharing capabilities.
- Motion Excellence: Leverages physics-based spring animations for a responsive, tactile user experience.
- Accessibility: Full support for motion reduction preferences and keyboard navigation.

## Technology Stack

- React 18: Component-based architecture with modern hooks.
- TypeScript: Strong typing for reliable development and maintenance.
- Vite: Lightning-fast build tool and development server.
- Framer Motion: Powering complex layout animations and spring physics.
- WebGL: Custom shaders implemented for high-performance visual effects.
- Tailwind CSS: Utility-first styling for a consistent design system.

## Setup and Development

### Prerequisites

- Node.js (Version 18 or later)
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Development

To start the local development server:
```bash
npm run dev
```

### Production

To generate a production-ready build:
```bash
npm run build
```

## Internal Architecture

- src/TaskWidget.tsx: The central controller managing the widget state and primary layouts.
- src/CalendarExpanded.tsx: Modular component for the detailed calendar interaction layer.
- src/GuestsExpanded.tsx: Dedicated interface for managing collaboration and participant data.
- src/CardRipple.tsx: A performance-optimized WebGL implementation for tactile click feedback.
- src/index.css: Global design tokens and foundational styling.

## Design Principles

This application follows modern UI/UX principles, emphasizing:
- Smooth Micro-interactions: Enhancing user engagement through subtle visual cues.
- Layered Depth: Using shadows and gradients to create a distinct information hierarchy.
- Performance: Ensuring 60fps animations even during complex view transitions.
