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

<table>
  <tr>
    <td>
      <strong>Original Video</strong><br>
      <a href="https://youtube.com/shorts/NcdUX-2Zguc?si=ta-q6SebWeXxxD8E" target="_blank">Watch on YouTube</a><br>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/NcdUX-2Zguc" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </td>
    <td>
      <strong>ASCII Art Result</strong><br>
      <a href="https://youtube.com/shorts/y35av6KwqYw" target="_blank">Watch on YouTube</a><br>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/y35av6KwqYw" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </td>
  </tr>
</table>

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
