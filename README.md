# 🌈 ASCII-Maker

```
    _    ____   ____ ___ ___   __  __       _
   / \  / ___| / ___|_ _|_ _| |  \/  | __ _| | _____ _ __
  / _ \ \___ \| |    | | | |  | |\/| |/ _` | |/ / _ \ '__|
 / ___ \ ___) | |___ | | | |  | |  | | (_| |   <  __/ |
/_/   \_\____/ \____|___|___| |_|  |_|\__,_|_|\_\___|_|
```

Convert any YouTube video into a colorful ASCII art animation! Color + edge detection all in one. This tool transforms videos into beautiful ASCII character art while preserving colors and maintaining smooth motion.

## 🎥 Example

[Original Video](https://youtube.com/shorts/NcdUX-2Zguc?si=ta-q6SebWeXxxD8E)

### Results Video

Thumbnail below. Or click it to watch the full short on YT.
[![ASCII Art Result](/results_thumbnail.png)](https://www.youtube.com/watch?v=y35av6KwqYw)

## ✨ Features

- 🎨 Full color preservation from source video
- 🎬 Smooth frame interpolation
- ⚡ Efficient video processing
- 🖼️ Maintains aspect ratio
- 🎯 Customizable output settings
- 🌈 Beautiful text rendering with shadows
- ⚫ Smart handling of black/white areas

## 🚀 Installation

1. Make sure you have Node.js installed (v14+ recommended)
2. Install required system dependencies:

   ```bash
   # For macOS using Homebrew
   brew install ffmpeg yt-dlp

   # For Ubuntu/Debian
   sudo apt-get install ffmpeg
   sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   sudo chmod a+rx /usr/local/bin/yt-dlp
   ```

3. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/ascii-maker.git
   cd ascii-maker
   ```

4. Install Node.js dependencies:
   ```bash
   npm install
   # or if you use bun
   bun install
   ```

## 💻 Usage

1. Run the converter:

   ```bash
   bun main.ts
   # or with node
   node main.ts
   ```

2. Enter a YouTube URL when prompted

3. Wait for the magic to happen! The converter will:
   - Download the video
   - Extract frames
   - Convert each frame to ASCII art
   - Reassemble into a video

The final video will be saved as `ascii_video.mp4` in your current directory.

## ⚙️ Configuration

You can customize the conversion by modifying these parameters in `main.ts`:

```typescript
const converter = new YouTubeToAsciiConverter({
  outputPath: "./ascii_video.mp4",
  framesPerSecond: 15, // Adjust for smoother/choppier animation
  outputWidth: 160, // Width in characters
  outputHeight: 90, // Height in characters
  charSet: "@%#*+=-:. ", // Characters used for ASCII art
  tempDir: "./temp", // Temporary working directory
});
```

## 🎨 Character Sets

Try these alternative character sets for different effects:

```typescript
// Dense characters (good for detailed videos)
"█▓▒░│║─═╔╗╚╝┌┐└┘├┤┬┴┼ ";

// Classic ASCII (more traditional look)
"@%#*+=-:. ";

// Minimal (clean, modern look)
"█▓▒░ ";
```

## 🔬 Technical Details

### ASCII Conversion Logic

The converter uses a sophisticated approach to transform video frames into colored ASCII art:

#### 1. Brightness Calculation

```typescript
// Standard luminance formula for perceived brightness
brightness = 0.299 * R + 0.587 * G + 0.114 * B;
```

This formula accounts for human perception of color, where green appears brighter than red, and blue appears darkest.

#### 2. Character Selection

- Each pixel region is mapped to an ASCII character based on its brightness
- Brighter areas get lighter characters (e.g., ".", ":", "-")
- Darker areas get denser characters (e.g., "@", "#", "%")
- The mapping is normalized to use the full range of available characters

#### 3. Smart Background Handling

```typescript
// Detect pure black/white areas
if (isExtreme || brightness < 5 || brightness > 250) {
  // Use space character for clean backgrounds
  ascii[y][x] = " ";
}
```

This creates clean, noise-free backgrounds by:

- Detecting pure black/white regions
- Converting them to spaces instead of ASCII characters
- Preserving the original background color

#### 4. Color Preservation

```typescript
// Calculate average color for each ASCII character
colors[y][x] = {
  r: Math.round(totalR / pixelCount),
  g: Math.round(totalG / pixelCount),
  b: Math.round(totalB / pixelCount),
};
```

The converter maintains the original video's colors by:

- Averaging the color values in each character's region
- Applying the averaged color to the ASCII character
- Adding a subtle shadow for better readability

#### 5. Text Rendering

```typescript
// Add shadow for better contrast
ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
ctx.fillText(char, x * 10 + 1, y * 20 + 1);

// Draw colored character
ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
ctx.fillText(char, x * 10, y * 20);
```

Characters are rendered with:

- Bold monospace font for clarity
- Subtle shadow for contrast
- Centered alignment for better proportions
- Original color from the video

This combination of techniques produces ASCII art that:

- Preserves the video's original colors and motion
- Creates clean, readable output
- Handles flat backgrounds elegantly
- Maintains good contrast and readability

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Open issues for bugs or suggestions
- Submit pull requests
- Share your awesome ASCII art videos!

## 🙏 Credits

- Bun for wicked fast compiling
- [node-canvas](https://github.com/Automattic/node-canvas) for image processing
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video downloading
- [FFmpeg](https://ffmpeg.org/) for video processing
