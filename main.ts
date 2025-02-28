import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";
import { createCanvas, loadImage, Image } from "canvas";
import * as readline from "readline";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = promisify(
  (
    question: string,
    callback: (error: Error | undefined, result: string) => void
  ) => rl.question(question, (answer) => callback(undefined, answer))
);

// Promisify exec for cleaner async usage
const exec = promisify(child_process.exec);

interface ConverterOptions {
  videoUrl: string;
  outputPath?: string;
  framesPerSecond?: number;
  outputWidth?: number;
  outputHeight?: number;
  charSet?: string;
  preserveAspectRatio?: boolean;
  fontColor?: string;
  backgroundColor?: string;
  tempDir?: string;
}

class YouTubeToAsciiConverter {
  private options: Required<ConverterOptions>;
  private tempFramesDir: string;
  private asciiFramesDir: string;

  constructor(options: ConverterOptions) {
    this.options = {
      outputPath: "./output.mp4",
      framesPerSecond: 24,
      outputWidth: 120,
      outputHeight: 60,
      charSet: "@%#*+=-:. ",
      preserveAspectRatio: true,
      fontColor: "white",
      backgroundColor: "black",
      tempDir: "./temp",
      ...options,
    };

    this.tempFramesDir = path.join(this.options.tempDir, "frames");
    this.asciiFramesDir = path.join(this.options.tempDir, "ascii");
  }

  async convert(): Promise<string> {
    try {
      await this.setupDirectories();
      await this.downloadVideo();
      await this.extractFrames();
      await this.convertFramesToAscii();
      await this.createVideo();

      // Automatically add audio from the source video
      console.log("Adding audio from source video...");
      const audioPath = path.join(this.options.tempDir, "audio.m4a");
      const finalVideoPath = this.options.outputPath.replace(
        ".mp4",
        "_with_audio.mp4"
      );

      // Extract audio from source video
      const url = new URL(this.options.videoUrl);
      const startTimeSeconds = url.searchParams.get("t");
      let timeOffset = "";
      if (startTimeSeconds) {
        const hours = Math.floor(Number(startTimeSeconds) / 3600);
        const minutes = Math.floor((Number(startTimeSeconds) % 3600) / 60);
        const seconds = Number(startTimeSeconds) % 60;
        timeOffset = `-ss ${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }

      // Download audio starting from timestamp if specified
      await exec(
        `yt-dlp -f "bestaudio[ext=m4a]" -o "${audioPath}" "${this.options.videoUrl}" && ` +
          `ffmpeg -i "${audioPath}" ${timeOffset} -acodec copy "${audioPath}.tmp" && ` +
          `mv "${audioPath}.tmp" "${audioPath}"`
      );

      // Combine ASCII video with audio
      await exec(
        `ffmpeg -i "${this.options.outputPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`
      );

      console.log(`ASCII video with audio saved as: ${finalVideoPath}`);
      console.log(
        `Original ASCII video without audio preserved at: ${this.options.outputPath}`
      );

      if (!this.options.tempDir.includes("keep-temp")) {
        await this.cleanup();
      }

      return finalVideoPath;
    } catch (error) {
      console.error("Error during conversion:", error);
      throw error;
    }
  }

  private async setupDirectories(): Promise<void> {
    for (const dir of [
      this.options.tempDir,
      this.tempFramesDir,
      this.asciiFramesDir,
    ]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async downloadVideo(): Promise<void> {
    const videoPath = path.join(this.options.tempDir, "video.mp4");
    console.log(`Downloading video from ${this.options.videoUrl}...`);

    try {
      // Ensure the video path is properly quoted and escaped
      const escapedVideoPath = videoPath.replace(/"/g, '\\"');

      // Download the full video first
      await exec(
        `yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4' -o "${escapedVideoPath}" "${this.options.videoUrl}"`
      );

      // Verify the video file exists and has size > 0
      if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
        throw new Error("Video download failed or file is empty");
      }

      console.log("Video downloaded successfully");
    } catch (error) {
      console.error("Error downloading video:", error);
      throw error;
    }
  }

  private async extractFrames(): Promise<void> {
    const videoPath = path.join(this.options.tempDir, "video.mp4");
    const framesPattern = path.join(this.tempFramesDir, "frame-%04d.png");

    console.log("Extracting frames...");

    try {
      // Ensure video file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error("Video file not found for frame extraction");
      }

      // Ensure frames directory exists
      if (!fs.existsSync(this.tempFramesDir)) {
        fs.mkdirSync(this.tempFramesDir, { recursive: true });
      }

      // Extract start time from URL if present
      const url = new URL(this.options.videoUrl);
      const startTimeSeconds = url.searchParams.get("t");

      // Convert seconds to HH:MM:SS format for FFmpeg
      let timeOffset = "";
      if (startTimeSeconds) {
        const hours = Math.floor(Number(startTimeSeconds) / 3600);
        const minutes = Math.floor((Number(startTimeSeconds) % 3600) / 60);
        const seconds = Number(startTimeSeconds) % 60;
        timeOffset = `-ss ${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }

      // Escape paths for shell command
      const escapedVideoPath = videoPath.replace(/"/g, '\\"');
      const escapedFramesPattern = framesPattern.replace(/"/g, '\\"');

      // Extract frames using ffmpeg with timestamp if specified
      await exec(
        `ffmpeg ${timeOffset} -i "${escapedVideoPath}" -vf "fps=${this.options.framesPerSecond}" "${escapedFramesPattern}"`
      );

      // Verify at least one frame was extracted
      const frames = fs.readdirSync(this.tempFramesDir);
      if (frames.length === 0) {
        throw new Error("No frames were extracted from the video");
      }

      console.log(`Frames extracted successfully (${frames.length} frames)`);
    } catch (error) {
      console.error("Error extracting frames:", error);
      throw error;
    }
  }

  private async convertFramesToAscii(): Promise<void> {
    console.log("Converting frames to ASCII...");
    const frames = fs.readdirSync(this.tempFramesDir).sort();

    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(this.tempFramesDir, frames[i]);
      const outputPath = path.join(
        this.asciiFramesDir,
        `ascii-${i.toString().padStart(4, "0")}.png`
      );

      await this.convertImageToAscii(framePath, outputPath);

      // Log progress
      if (i % Math.max(1, Math.floor(frames.length / 20)) === 0) {
        console.log(
          `Converted ${i}/${frames.length} frames (${Math.floor(
            (i / frames.length) * 100
          )}%)`
        );
      }
    }

    console.log("All frames converted to ASCII");
  }

  private imageToAsciiWithColor(
    image: Image,
    width: number,
    height: number
  ): { ascii: string[][]; colors: { r: number; g: number; b: number }[][] } {
    // Create a temporary canvas to process the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    // Calculate step sizes
    const stepX = Math.floor(image.width / width);
    const stepY = Math.floor(image.height / height);

    // Create ASCII and color arrays
    const ascii: string[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(""));
    const colors: { r: number; g: number; b: number }[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill({ r: 0, g: 0, b: 0 }));

    // Convert pixels to ASCII chars using brightness and color
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelX = Math.floor(x * stepX);
        const pixelY = Math.floor(y * stepY);

        let brightness = 0;
        let pixelCount = 0;
        let isExtreme = true;
        let totalR = 0,
          totalG = 0,
          totalB = 0;

        // Sample multiple pixels for better accuracy
        for (let sy = 0; sy < stepY && pixelY + sy < image.height; sy++) {
          for (let sx = 0; sx < stepX && pixelX + sx < image.width; sx++) {
            const i = ((pixelY + sy) * image.width + (pixelX + sx)) * 4;

            // Get color and brightness
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            totalR += r;
            totalG += g;
            totalB += b;
            brightness += 0.299 * r + 0.587 * g + 0.114 * b;

            // Check if pixel is not pure black or white
            if (
              !(
                (r === 0 && g === 0 && b === 0) ||
                (r === 255 && g === 255 && b === 255)
              )
            ) {
              isExtreme = false;
            }

            pixelCount++;
          }
        }

        brightness = pixelCount > 0 ? brightness / pixelCount : 0;

        // Calculate average color
        colors[y][x] = {
          r: Math.round(totalR / pixelCount),
          g: Math.round(totalG / pixelCount),
          b: Math.round(totalB / pixelCount),
        };

        // Handle pure black/white areas
        if (isExtreme || brightness < 5 || brightness > 250) {
          ascii[y][x] = " ";
          continue;
        }

        // Map brightness to character
        const charIndex =
          Math.floor((brightness / 255) * (this.options.charSet.length - 2)) +
          1;
        ascii[y][x] = this.options.charSet[charIndex];
      }
    }

    return { ascii, colors };
  }

  private async convertImageToAscii(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    const image = await loadImage(inputPath);

    // Calculate dimensions
    let width = this.options.outputWidth;
    let height = this.options.outputHeight;

    if (this.options.preserveAspectRatio) {
      const aspectRatio = image.width / image.height;
      height = Math.floor(width / aspectRatio / 2);

      if (height > this.options.outputHeight) {
        height = this.options.outputHeight;
        width = Math.floor(height * aspectRatio * 2);
      }
    }

    // Create canvas for the ASCII art
    const canvas = createCanvas(width * 10, height * 20);
    const ctx = canvas.getContext("2d");

    // Set background
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set font properties for better visibility
    ctx.font = "bold 20px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Get ASCII and color data
    const { ascii, colors } = this.imageToAsciiWithColor(image, width, height);

    // Draw ASCII chars to canvas with colors
    for (let y = 0; y < ascii.length; y++) {
      for (let x = 0; x < ascii[y].length; x++) {
        const char = ascii[y][x];
        const color = colors[y][x];

        // Skip drawing if it's a space (transparent)
        if (char !== " ") {
          // Add slight shadow for better contrast
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillText(char, x * 10 + 1, (y + 1) * 20 + 1);

          // Draw colored character
          ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.fillText(char, x * 10, (y + 1) * 20);
        }
      }
    }

    // Save the image
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);
  }

  private async createVideo(): Promise<void> {
    console.log("Creating ASCII video...");

    await exec(
      `ffmpeg -framerate ${this.options.framesPerSecond} -i "${this.asciiFramesDir}/ascii-%04d.png" -c:v libx264 -pix_fmt yuv420p "${this.options.outputPath}"`
    );

    console.log(`ASCII video created at ${this.options.outputPath}`);
  }

  private async cleanup(): Promise<void> {
    console.log("Cleaning up temporary files...");
    fs.rmSync(this.options.tempDir, { recursive: true, force: true });
    console.log("Cleanup completed");
  }
}

const url = await question("Enter video URL: ");

const converter = new YouTubeToAsciiConverter({
  videoUrl: url,
  outputPath: "./ascii_video.mp4",
  framesPerSecond: 15,
  outputWidth: 160,
  outputHeight: 90,
  charSet: "@%#*+=-:. ",
  tempDir: "./temp",
});

try {
  const outputPath = await converter.convert();
  console.log(`Conversion completed! Output saved to: ${outputPath}`);
} catch (error) {
  console.error("Conversion failed:", error);
}
