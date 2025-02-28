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

      if (!this.options.tempDir.includes("keep-temp")) {
        await this.cleanup();
      }

      return this.options.outputPath;
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

    await exec(
      `yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4' -o "${videoPath}" ${this.options.videoUrl}`
    );

    console.log("Video downloaded successfully");
  }

  private async extractFrames(): Promise<void> {
    const videoPath = path.join(this.options.tempDir, "video.mp4");
    console.log("Extracting frames...");

    // Using ffmpeg to extract frames
    // You need to have ffmpeg installed: https://ffmpeg.org/
    await exec(
      `ffmpeg -i "${videoPath}" -vf "fps=${this.options.framesPerSecond}" "${this.tempFramesDir}/frame-%04d.png"`
    );

    console.log("Frames extracted successfully");
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
      height = Math.floor(width / aspectRatio / 2); // Divide by 2 because chars are taller than wide

      // Ensure height doesn't exceed max
      if (height > this.options.outputHeight) {
        height = this.options.outputHeight;
        width = Math.floor(height * aspectRatio * 2);
      }
    }

    // Create canvas for the ASCII art
    const canvas = createCanvas(width * 10, height * 20); // Scale up for better resolution
    const ctx = canvas.getContext("2d");

    // Set background
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.fillStyle = this.options.fontColor;
    ctx.font = "20px monospace";

    // Convert to grayscale and find ASCII chars
    const asciiImage = this.imageToAscii(image, width, height);

    // Draw ASCII chars to canvas
    for (let y = 0; y < asciiImage.length; y++) {
      for (let x = 0; x < asciiImage[y].length; x++) {
        ctx.fillText(asciiImage[y][x], x * 10, (y + 1) * 20);
      }
    }

    // Save the image
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);
  }

  private imageToAscii(
    image: Image,
    width: number,
    height: number
  ): string[][] {
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

    // Create grayscale array
    const grayscale = new Array(image.height)
      .fill(0)
      .map(() => new Array(image.width).fill(0));

    // Convert to grayscale
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        grayscale[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    // Apply Gaussian blur to reduce noise
    const blurred = this.gaussianBlur(grayscale);

    // Apply Canny edge detection
    const edges = this.cannyEdgeDetection(blurred);

    // Create ASCII array
    const ascii: string[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(""));

    // Convert pixels to ASCII chars using both edge and brightness information
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelX = Math.floor(x * stepX);
        const pixelY = Math.floor(y * stepY);

        let edgeStrength = 0;
        let brightness = 0;
        let pixelCount = 0;
        let isExtreme = true; // Track if area is pure black/white

        // Sample multiple pixels for better accuracy
        for (let sy = 0; sy < stepY && pixelY + sy < image.height; sy++) {
          for (let sx = 0; sx < stepX && pixelX + sx < image.width; sx++) {
            const i = ((pixelY + sy) * image.width + (pixelX + sx)) * 4;
            // Get edge strength
            edgeStrength += edges[pixelY + sy][pixelX + sx];
            // Get brightness
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
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

        edgeStrength = pixelCount > 0 ? edgeStrength / pixelCount : 0;
        brightness = pixelCount > 0 ? brightness / pixelCount : 0;

        // Handle pure black/white areas
        if (isExtreme || brightness < 5 || brightness > 250) {
          ascii[y][x] = " ";
          continue;
        }

        // Combine edge and brightness information
        const combined = (edgeStrength * 0.7 + brightness * 0.3) / 255;

        // Adjust the mapping to avoid using characters for near-black or near-white
        const adjustedRange = this.options.charSet.length - 3; // Reserve space for empty chars
        const charIndex = Math.floor(combined * adjustedRange) + 1;
        ascii[y][x] = this.options.charSet[charIndex];
      }
    }

    return ascii;
  }

  private gaussianBlur(data: number[][]): number[][] {
    const kernel = [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
    ];
    const kernelSum = 256;
    const height = data.length;
    const width = data[0].length;
    const result = new Array(height)
      .fill(0)
      .map(() => new Array(width).fill(0));

    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        let sum = 0;
        for (let ky = 0; ky < 5; ky++) {
          for (let kx = 0; kx < 5; kx++) {
            sum += data[y + ky - 2][x + kx - 2] * kernel[ky][kx];
          }
        }
        result[y][x] = sum / kernelSum;
      }
    }
    return result;
  }

  private cannyEdgeDetection(data: number[][]): number[][] {
    const height = data.length;
    const width = data[0].length;
    const result = new Array(height)
      .fill(0)
      .map(() => new Array(width).fill(0));

    // Sobel operators
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    // Calculate gradients
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const val = data[y + ky - 1][x + kx - 1];
            gx += val * sobelX[ky][kx];
            gy += val * sobelY[ky][kx];
          }
        }

        // Calculate gradient magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        result[y][x] = magnitude;
      }
    }

    // Normalize result
    const maxMagnitude = Math.max(...result.map((row) => Math.max(...row)));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result[y][x] = (result[y][x] / maxMagnitude) * 255;
      }
    }

    return result;
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
  charSet: "█▓▒░│║─═╔╗╚╝┌┐└┘├┤┬┴┼ ",
  tempDir: "./temp",
});

try {
  const outputPath = await converter.convert();
  console.log(`Conversion completed! Output saved to: ${outputPath}`);
} catch (error) {
  console.error("Conversion failed:", error);
}
