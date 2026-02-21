# Contributing to Electron Cloud Visualizer

Thank you for your interest in contributing to the Electron Cloud Visualizer project!

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Please create an issue describing:
- The feature you'd like to see
- Why it would be useful
- How it might work

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly** in multiple browsers
5. **Commit with clear messages**: `git commit -m "Add feature: description"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request**

### Code Style

- Use clear, descriptive variable and function names
- Add comments for complex logic
- Follow existing code formatting
- Keep functions focused and modular
- Document public APIs with JSDoc comments

### Testing

Before submitting a PR:
- Test in Chrome, Firefox, and Safari
- Verify all features work correctly
- Check console for errors
- Test with different atomic numbers
- Verify performance with high particle counts

## Development Setup

1. Clone the repository
2. Open `index.html` in a web browser
3. No build process required - it's vanilla JavaScript!

## Project Structure

- `js/constants.js` - Physical constants and configuration
- `js/math-utils.js` - Mathematical utilities
- `js/quantum-mechanics.js` - Wave function calculations
- `js/particle-sampler.js` - Particle generation
- `js/electron-configuration.js` - Electron configuration logic
- `js/visualization-renderer.js` - Three.js rendering
- `js/gui-controller.js` - User interface
- `js/app-controller.js` - Application coordination
- `js/main.js` - Entry point

## Questions?

Feel free to open an issue for any questions about contributing!
